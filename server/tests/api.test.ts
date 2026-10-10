import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import type { TokenVerifier } from '../auth';
import { addDays, todayInColombia } from '../lib/dates';
import { MemoryRepository } from '../repo/memory';
import type { FileStorage } from '../storage/types';

const verifier: TokenVerifier = {
  async verify(token) {
    if (token === 'admin') return { uid: 'u-admin', email: 'Owner@Hotel.com', emailVerified: true, name: 'Dueño' };
    if (token === 'role-admin') return { uid: 'u-role', email: 'staff@hotel.com', emailVerified: true, name: null };
    if (token === 'unverified') return { uid: 'u-x', email: 'owner@hotel.com', emailVerified: false, name: null };
    if (token === 'guest') return { uid: 'u-guest', email: 'guest@mail.com', emailVerified: true, name: 'Ana' };
    throw new Error('bad token');
  },
};

const storage: FileStorage = { save: async ({ originalName }) => `/uploads/${originalName}` };

const day = (n: number) => addDays(todayInColombia(), n);

let repo: MemoryRepository;
let app: ReturnType<typeof createApp>;
let cabinId: string;

const ADMIN = { Authorization: 'Bearer admin' };

function reservationBody(overrides: Record<string, unknown> = {}) {
  return {
    cabinId,
    guestName: 'Laura Gómez',
    guests: 2,
    checkIn: day(10),
    checkOut: day(13),
    whatsappNumber: '+57 300 123 4567',
    ...overrides,
  };
}

beforeEach(async () => {
  repo = new MemoryRepository();
  repo.adminUids.add('u-role');
  app = createApp({ repo, storage, verifier, adminEmails: ['owner@hotel.com'], publicWriteLimit: 1000 });
  const cabin = await repo.cabins.create({
    name: 'Cabaña Guadua',
    description: 'Vista al río',
    price: 200000,
    capacity: 3,
    amenities: [],
    imageUrl: '',
    galleryUrls: [],
  });
  cabinId = cabin.id;
});

describe('público', () => {
  it('responde health y ajustes por defecto', async () => {
    expect((await request(app).get('/api/health')).body).toEqual({ ok: true });
    const settings = await request(app).get('/api/settings');
    expect(settings.status).toBe(200);
    expect(settings.body.whatsappNumber).toMatch(/^\d+$/);
  });

  it('lista y busca cabañas', async () => {
    const list = await request(app).get('/api/cabins');
    expect(list.body).toHaveLength(1);
    expect((await request(app).get(`/api/cabins/${cabinId}`)).body.name).toBe('Cabaña Guadua');
    const missing = await request(app).get('/api/cabins/nope');
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('not_found');
  });

  it('cotiza la estadía', async () => {
    const res = await request(app).get(`/api/cabins/${cabinId}/quote`).query({ checkIn: day(5), checkOut: day(7) });
    expect(res.body).toMatchObject({ nights: 2, totalPrice: 400000, available: true });
  });

  it('responde 404 JSON para rutas inexistentes', async () => {
    const res = await request(app).get('/api/nada');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });
});

describe('reservas', () => {
  it('crea una reserva pendiente con total calculado en el servidor y link de WhatsApp', async () => {
    const res = await request(app).post('/api/reservations').send(reservationBody({ totalPrice: 1 }));
    expect(res.status).toBe(201);
    expect(res.body.reservation).toMatchObject({ status: 'pending', nights: 3, totalPrice: 600000 });
    expect(res.body.whatsappUrl).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(decodeURIComponent(res.body.whatsappUrl)).toContain('Laura Gómez');
    // La respuesta pública no devuelve el teléfono del huésped.
    expect(res.body.reservation.whatsappNumber).toBeUndefined();
  });

  it('valida fechas, capacidad y teléfono', async () => {
    const past = await request(app).post('/api/reservations').send(reservationBody({ checkIn: day(-2), checkOut: day(1) }));
    expect(past.status).toBe(400);
    expect(past.body.error).toBe('past_date');

    const reversed = await request(app).post('/api/reservations').send(reservationBody({ checkIn: day(5), checkOut: day(5) }));
    expect(reversed.status).toBe(400);
    expect(reversed.body.error).toBe('validation_error');

    const bogus = await request(app).post('/api/reservations').send(reservationBody({ checkIn: '2026-02-31' }));
    expect(bogus.status).toBe(400);

    const crowd = await request(app).post('/api/reservations').send(reservationBody({ guests: 4 }));
    expect(crowd.status).toBe(400);
    expect(crowd.body.error).toBe('over_capacity');

    const phone = await request(app).post('/api/reservations').send(reservationBody({ whatsappNumber: '123' }));
    expect(phone.status).toBe(400);

    const long = await request(app).post('/api/reservations').send(reservationBody({ checkOut: day(50) }));
    expect(long.body.error).toBe('too_long');
  });

  it('rechaza bots que llenan el campo trampa', async () => {
    const res = await request(app).post('/api/reservations').send(reservationBody({ website: 'http://spam' }));
    expect(res.status).toBe(400);
  });

  it('las pendientes no bloquean fechas, las confirmadas sí', async () => {
    const first = await request(app).post('/api/reservations').send(reservationBody());
    const second = await request(app).post('/api/reservations').send(reservationBody({ guestName: 'Otra persona' }));
    expect(second.status).toBe(201);

    const confirm = await request(app)
      .patch(`/api/admin/reservations/${first.body.reservation.id}/status`)
      .set(ADMIN)
      .send({ status: 'confirmed' });
    expect(confirm.status).toBe(200);
    expect(confirm.body.status).toBe('confirmed');

    // No se puede confirmar otra reserva en las mismas fechas.
    const clash = await request(app)
      .patch(`/api/admin/reservations/${second.body.reservation.id}/status`)
      .set(ADMIN)
      .send({ status: 'confirmed' });
    expect(clash.status).toBe(409);

    // Ni crear una nueva que se cruce.
    const overlap = await request(app).post('/api/reservations').send(reservationBody({ checkIn: day(12), checkOut: day(15) }));
    expect(overlap.status).toBe(409);
    expect(overlap.body.error).toBe('dates_unavailable');

    // El día de salida queda libre para la siguiente llegada.
    const backToBack = await request(app).post('/api/reservations').send(reservationBody({ checkIn: day(13), checkOut: day(15) }));
    expect(backToBack.status).toBe(201);
  });

  it('la disponibilidad solo expone fechas, nunca datos del huésped', async () => {
    const created = await request(app).post('/api/reservations').send(reservationBody());
    await repo.setReservationStatus(created.body.reservation.id, 'confirmed');
    const res = await request(app).get(`/api/cabins/${cabinId}/availability`);
    expect(res.body.booked).toEqual([{ checkIn: day(10), checkOut: day(13) }]);
    expect(JSON.stringify(res.body)).not.toContain('Laura');
    expect(JSON.stringify(res.body)).not.toContain('300');
  });
});

describe('autenticación y permisos', () => {
  it('protege las rutas de administración', async () => {
    expect((await request(app).get('/api/admin/reservations')).status).toBe(401);
    expect((await request(app).get('/api/admin/reservations').set('Authorization', 'Bearer guest')).status).toBe(403);
    expect((await request(app).get('/api/admin/reservations').set('Authorization', 'Bearer basura')).status).toBe(401);
    expect((await request(app).get('/api/admin/reservations').set(ADMIN)).status).toBe(200);
  });

  it('acepta admins por rol en users/{uid} y exige correo verificado', async () => {
    expect((await request(app).get('/api/admin/stats').set('Authorization', 'Bearer role-admin')).status).toBe(200);
    expect((await request(app).get('/api/admin/stats').set('Authorization', 'Bearer unverified')).status).toBe(403);
  });

  it('devuelve el usuario actual', async () => {
    expect((await request(app).get('/api/me')).status).toBe(401);
    const me = await request(app).get('/api/me').set(ADMIN);
    expect(me.body).toMatchObject({ uid: 'u-admin', isAdmin: true });
  });
});

describe('administración', () => {
  it('crea, edita y borra cabañas con validación', async () => {
    const bad = await request(app).post('/api/admin/cabins').set(ADMIN).send({ name: '', price: -1 });
    expect(bad.status).toBe(400);

    const created = await request(app)
      .post('/api/admin/cabins')
      .set(ADMIN)
      .send({ name: 'Nueva', description: 'Desc', price: '150000', capacity: 2, amenities: ['Wifi', ' '], imageUrl: 'javascript:alert(1)' });
    expect(created.status).toBe(400);

    const ok = await request(app)
      .post('/api/admin/cabins')
      .set(ADMIN)
      .send({ name: 'Nueva', description: 'Desc', price: '150000', capacity: 2, amenities: ['Wifi', ' '] });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ price: 150000, amenities: ['Wifi'], galleryUrls: [] });

    const updated = await request(app)
      .put(`/api/admin/cabins/${ok.body.id}`)
      .set(ADMIN)
      .send({ ...ok.body, name: 'Renombrada' });
    expect(updated.body.name).toBe('Renombrada');

    expect((await request(app).delete(`/api/admin/cabins/${ok.body.id}`).set(ADMIN)).status).toBe(204);
    expect((await request(app).delete(`/api/admin/cabins/${ok.body.id}`).set(ADMIN)).status).toBe(404);
  });

  it('no borra una cabaña con reservas confirmadas próximas', async () => {
    const created = await request(app).post('/api/reservations').send(reservationBody());
    await repo.setReservationStatus(created.body.reservation.id, 'confirmed');
    const res = await request(app).delete(`/api/admin/cabins/${cabinId}`).set(ADMIN);
    expect(res.status).toBe(409);
  });

  it('gestiona actividades', async () => {
    const res = await request(app)
      .post('/api/admin/activities')
      .set(ADMIN)
      .send({ name: 'Lancha', description: 'Paseo', cost: 50000, difficulty: 'Fácil', includes: ['Guía'] });
    expect(res.status).toBe(201);
    expect((await request(app).get('/api/activities')).body).toHaveLength(1);
    const wrong = await request(app).post('/api/admin/activities').set(ADMIN).send({ name: 'X', description: 'Y', difficulty: 'Extrema' });
    expect(wrong.status).toBe(400);
  });

  it('filtra reservas y exporta CSV seguro para Excel', async () => {
    await request(app).post('/api/reservations').send(reservationBody({ guestName: '=HYPERLINK("x")' }));
    await request(app).post('/api/reservations').send(reservationBody({ checkIn: day(40), checkOut: day(42) }));

    const filtered = await request(app).get('/api/admin/reservations').set(ADMIN).query({ from: day(35) });
    expect(filtered.body).toHaveLength(1);

    const csv = await request(app).get('/api/admin/reservations.csv').set(ADMIN);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it('modera reseñas', async () => {
    const review = await request(app).post(`/api/cabins/${cabinId}/reviews`).send({ guestName: 'Ana', rating: 5, comment: 'Hermoso' });
    expect(review.status).toBe(201);
    let pub = await request(app).get(`/api/cabins/${cabinId}/reviews`);
    expect(pub.body.summary).toEqual({ count: 1, average: 5 });

    await request(app).patch(`/api/admin/reviews/${review.body.id}`).set(ADMIN).send({ status: 'hidden' });
    pub = await request(app).get(`/api/cabins/${cabinId}/reviews`);
    expect(pub.body.reviews).toHaveLength(0);
    expect((await request(app).get('/api/reviews/featured')).body).toHaveLength(0);

    const bad = await request(app).post(`/api/cabins/${cabinId}/reviews`).send({ guestName: 'Ana', rating: 9, comment: 'x' });
    expect(bad.status).toBe(400);
  });

  it('guarda ajustes normalizando el WhatsApp', async () => {
    const res = await request(app).put('/api/admin/settings').set(ADMIN).send({ whatsappNumber: '+57 (311) 222-3344' });
    expect(res.status).toBe(200);
    expect(res.body.whatsappNumber).toBe('573112223344');
    expect((await request(app).get('/api/settings')).body.whatsappNumber).toBe('573112223344');

    const created = await request(app).post('/api/reservations').send(reservationBody());
    expect(created.body.whatsappUrl).toContain('wa.me/573112223344');
  });

  it('sube imágenes y rechaza otros archivos', async () => {
    const ok = await request(app)
      .post('/api/admin/uploads')
      .set(ADMIN)
      .attach('files', Buffer.from([0xff, 0xd8, 0xff]), { filename: 'foto.jpg', contentType: 'image/jpeg' });
    expect(ok.status).toBe(201);
    expect(ok.body.urls).toEqual(['/uploads/foto.jpg']);

    const bad = await request(app)
      .post('/api/admin/uploads')
      .set(ADMIN)
      .attach('files', Buffer.from('hola'), { filename: 'x.html', contentType: 'text/html' });
    expect(bad.status).toBe(400);
  });

  it('calcula estadísticas', async () => {
    const created = await request(app).post('/api/reservations').send(reservationBody());
    await repo.setReservationStatus(created.body.reservation.id, 'confirmed');
    await request(app).post('/api/reservations').send(reservationBody({ checkIn: day(20), checkOut: day(21) }));
    const stats = await request(app).get('/api/admin/stats').set(ADMIN);
    expect(stats.body.reservations).toEqual({ pending: 1, confirmed: 1, cancelled: 0 });
    expect(stats.body.occupancyNext30Days).toBeCloseTo(3 / 30);
  });
});
