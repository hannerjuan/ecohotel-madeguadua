import { Router, type RequestHandler } from 'express';
import type { Availability, Cabin, Quote, Reservation, Review } from '../../shared/types';
import { requireUser } from '../auth';
import { withDefaults } from '../defaults';
import { asyncHandler, HttpError, notFound } from '../errors';
import { addDays, nightsBetween, todayInColombia } from '../lib/dates';
import { findConfirmedConflict } from '../repo/conflicts';
import type { Repository } from '../repo/types';
import { quoteQuery, reservationInput, reviewInput } from '../validation';

const MAX_NIGHTS = 30;
const MAX_MONTHS_AHEAD = 18;

export interface PublicRouterDeps {
  repo: Repository;
  /** Limitador para endpoints que escriben datos sin iniciar sesión. */
  writeLimiter: RequestHandler;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'es');
const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);

export function buildWhatsappUrl(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

export function reservationMessage(r: Reservation): string {
  const lines = [
    `¡Hola! Acabo de solicitar una reserva en la cabaña *${r.cabinName}*.`,
    '',
    `*Código:* ${r.id.slice(0, 8).toUpperCase()}`,
    `*Nombre:* ${r.guestName}`,
    `*Huéspedes:* ${r.guests}`,
    `*Llegada:* ${r.checkIn}`,
    `*Salida:* ${r.checkOut} (${r.nights} ${r.nights === 1 ? 'noche' : 'noches'})`,
    `*Total estimado:* $${r.totalPrice.toLocaleString('es-CO')} COP`,
  ];
  if (r.notes) lines.push(`*Notas:* ${r.notes}`);
  lines.push('', '¿Me confirman la disponibilidad?');
  return lines.join('\n');
}

export function publicRouter({ repo, writeLimiter }: PublicRouterDeps): Router {
  const router = Router();

  async function getCabinOr404(id: string): Promise<Cabin> {
    const cabin = await repo.cabins.get(id);
    if (!cabin) throw notFound('Cabaña');
    return cabin;
  }

  router.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  router.get(
    '/settings',
    asyncHandler(async (_req, res) => {
      res.set('Cache-Control', 'public, max-age=60');
      res.json(withDefaults(await repo.getSettings()));
    }),
  );

  router.get('/me', requireUser, (req, res) => {
    const u = req.user!;
    res.json({ uid: u.uid, email: u.email, name: u.name, isAdmin: u.isAdmin });
  });

  // ---------- Cabañas ----------

  router.get(
    '/cabins',
    asyncHandler(async (_req, res) => {
      const cabins = await repo.cabins.list();
      res.json(cabins.sort(byName));
    }),
  );

  router.get(
    '/cabins/:id',
    asyncHandler(async (req, res) => {
      res.json(await getCabinOr404(req.params.id));
    }),
  );

  router.get(
    '/cabins/:id/availability',
    asyncHandler(async (req, res) => {
      await getCabinOr404(req.params.id);
      const today = todayInColombia();
      const reservations = await repo.reservations.list({ cabinId: req.params.id });
      const body: Availability = {
        cabinId: req.params.id,
        // Solo fechas: los datos del huésped nunca salen por este endpoint.
        booked: reservations
          .filter((r) => r.status === 'confirmed' && r.checkOut > today)
          .map((r) => ({ checkIn: r.checkIn, checkOut: r.checkOut }))
          .sort((a, b) => a.checkIn.localeCompare(b.checkIn)),
      };
      res.json(body);
    }),
  );

  router.get(
    '/cabins/:id/quote',
    asyncHandler(async (req, res) => {
      const cabin = await getCabinOr404(req.params.id);
      const { checkIn, checkOut } = quoteQuery.parse(req.query);
      const nights = nightsBetween(checkIn, checkOut);
      const existing = await repo.reservations.list({ cabinId: cabin.id });
      const body: Quote = {
        cabinId: cabin.id,
        checkIn,
        checkOut,
        nights,
        pricePerNight: cabin.price,
        totalPrice: nights * cabin.price,
        available: !findConfirmedConflict(existing, { cabinId: cabin.id, checkIn, checkOut }),
      };
      res.json(body);
    }),
  );

  // ---------- Reseñas ----------

  router.get(
    '/cabins/:id/reviews',
    asyncHandler(async (req, res) => {
      await getCabinOr404(req.params.id);
      const reviews = (await repo.reviews.list({ cabinId: req.params.id }))
        .filter((r) => r.status === 'published')
        .sort(newestFirst);
      const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
      res.json({ reviews, summary: { count: reviews.length, average } });
    }),
  );

  router.post(
    '/cabins/:id/reviews',
    writeLimiter,
    asyncHandler(async (req, res) => {
      const cabin = await getCabinOr404(req.params.id);
      const input = reviewInput.parse(req.body);
      const review = await repo.reviews.create({
        cabinId: cabin.id,
        cabinName: cabin.name,
        guestName: input.guestName,
        rating: input.rating,
        comment: input.comment,
        status: 'published',
        createdAt: new Date().toISOString(),
      });
      res.status(201).json(review);
    }),
  );

  router.get(
    '/reviews/featured',
    asyncHandler(async (req, res) => {
      const limit = Math.min(Number(req.query.limit) || 3, 12);
      const reviews: Review[] = (await repo.reviews.list())
        .filter((r) => r.status === 'published' && r.rating >= 4)
        .sort(newestFirst)
        .slice(0, limit);
      res.json(reviews);
    }),
  );

  // ---------- Actividades ----------

  router.get(
    '/activities',
    asyncHandler(async (_req, res) => {
      res.json((await repo.activities.list()).sort(byName));
    }),
  );

  router.get(
    '/activities/:id',
    asyncHandler(async (req, res) => {
      const activity = await repo.activities.get(req.params.id);
      if (!activity) throw notFound('Actividad');
      res.json(activity);
    }),
  );

  // ---------- Reservas ----------

  router.post(
    '/reservations',
    writeLimiter,
    asyncHandler(async (req, res) => {
      const input = reservationInput.parse(req.body);
      const cabin = await getCabinOr404(input.cabinId);
      const today = todayInColombia();

      if (input.checkIn < today) {
        throw new HttpError(400, 'past_date', 'La fecha de llegada no puede ser anterior a hoy.');
      }
      if (input.checkIn > addDays(today, MAX_MONTHS_AHEAD * 31)) {
        throw new HttpError(400, 'too_far', `Solo recibimos reservas hasta ${MAX_MONTHS_AHEAD} meses adelante.`);
      }
      const nights = nightsBetween(input.checkIn, input.checkOut);
      if (nights > MAX_NIGHTS) {
        throw new HttpError(400, 'too_long', `La estadía máxima en línea es de ${MAX_NIGHTS} noches. Escríbenos para estadías más largas.`);
      }
      if (input.guests > cabin.capacity) {
        throw new HttpError(400, 'over_capacity', `Esta cabaña admite máximo ${cabin.capacity} personas.`);
      }

      const result = await repo.createReservation({
        cabinId: cabin.id,
        cabinName: cabin.name,
        guestName: input.guestName,
        guests: input.guests,
        email: input.email || undefined,
        notes: input.notes || undefined,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        nights,
        totalPrice: nights * cabin.price,
        whatsappNumber: input.whatsappNumber,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      if (!result.ok) {
        throw new HttpError(
          409,
          'dates_unavailable',
          `La cabaña ya está reservada del ${result.conflict!.checkIn} al ${result.conflict!.checkOut}. Elige otras fechas.`,
        );
      }

      const settings = withDefaults(await repo.getSettings());
      const reservation = result.reservation;
      res.status(201).json({
        reservation: {
          id: reservation.id,
          cabinId: reservation.cabinId,
          cabinName: reservation.cabinName,
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
          nights: reservation.nights,
          guests: reservation.guests,
          totalPrice: reservation.totalPrice,
          status: reservation.status,
        },
        whatsappUrl: buildWhatsappUrl(settings.whatsappNumber, reservationMessage(reservation)),
      });
    }),
  );

  return router;
}
