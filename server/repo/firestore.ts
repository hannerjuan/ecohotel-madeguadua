import { Firestore, Timestamp, type DocumentData, type Query } from 'firebase-admin/firestore';
import type { Activity, Cabin, Reservation, Review, Settings } from '../../shared/types';
import { nightsBetween } from '../lib/dates';
import type { Collection, NewDoc, Repository, ReservationResult } from './types';
import { findConfirmedConflict } from './conflicts';

type Normalize<T> = (id: string, data: DocumentData) => T;

function toIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(0).toISOString();
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);

// Los normalizadores aceptan documentos creados por la versión anterior de la app,
// que escribía directo desde el navegador y no tenía todos los campos actuales.
const normalizeCabin: Normalize<Cabin> = (id, d) => ({
  id,
  name: d.name ?? '',
  description: d.description ?? '',
  price: Number(d.price) || 0,
  amenities: strings(d.amenities),
  imageUrl: d.imageUrl ?? '',
  galleryUrls: strings(d.galleryUrls),
  capacity: Number(d.capacity) || 1,
});

const normalizeActivity: Normalize<Activity> = (id, d) => ({
  id,
  name: d.name ?? '',
  description: d.description ?? '',
  details: d.details ?? '',
  cost: Number(d.cost) || 0,
  duration: d.duration ?? '',
  difficulty: d.difficulty ?? 'Fácil',
  imageUrl: d.imageUrl ?? '',
  galleryUrls: strings(d.galleryUrls),
  includes: strings(d.includes),
});

const normalizeReview: Normalize<Review> = (id, d) => ({
  id,
  cabinId: d.cabinId ?? '',
  cabinName: d.cabinName,
  guestName: d.guestName ?? '',
  rating: Number(d.rating) || 0,
  comment: d.comment ?? '',
  status: d.status ?? 'published',
  createdAt: toIso(d.createdAt),
});

const normalizeReservation: Normalize<Reservation> = (id, d) => ({
  id,
  cabinId: d.cabinId ?? '',
  cabinName: d.cabinName ?? '',
  guestName: d.guestName ?? '',
  guests: Number(d.guests) || 1,
  email: d.email || undefined,
  notes: d.notes || undefined,
  checkIn: d.checkIn ?? '',
  checkOut: d.checkOut ?? '',
  nights: Number(d.nights) || nightsBetween(d.checkIn ?? '', d.checkOut ?? ''),
  totalPrice: Number(d.totalPrice) || 0,
  whatsappNumber: d.whatsappNumber ?? '',
  status: d.status ?? 'pending',
  createdAt: toIso(d.createdAt),
  updatedAt: d.updatedAt ? toIso(d.updatedAt) : undefined,
});

/** Firestore no acepta `undefined`; se eliminan esos campos antes de escribir. */
function clean<T extends object>(data: T): DocumentData {
  return Object.fromEntries(Object.entries(data).filter(([k, v]) => v !== undefined && k !== 'id'));
}

/** Las marcas de tiempo se guardan como Timestamp para mantener compatibilidad con los datos existentes. */
function withTimestamps(data: DocumentData): DocumentData {
  const out = { ...data };
  for (const key of ['createdAt', 'updatedAt']) {
    if (typeof out[key] === 'string') out[key] = Timestamp.fromDate(new Date(out[key]));
  }
  return out;
}

class FirestoreCollection<T extends { id: string }> implements Collection<T> {
  constructor(
    private db: Firestore,
    private name: string,
    private normalize: Normalize<T>,
  ) {}

  private get ref() {
    return this.db.collection(this.name);
  }

  async list(where: Partial<T> = {}): Promise<T[]> {
    let q: Query = this.ref;
    for (const [k, v] of Object.entries(where)) q = q.where(k, '==', v);
    const snap = await q.get();
    return snap.docs.map((doc) => this.normalize(doc.id, doc.data()));
  }

  async get(id: string): Promise<T | null> {
    const doc = await this.ref.doc(id).get();
    return doc.exists ? this.normalize(doc.id, doc.data()!) : null;
  }

  async create(data: NewDoc<T>): Promise<T> {
    const ref = this.ref.doc();
    await ref.set(withTimestamps(clean(data)));
    return this.normalize(ref.id, data as DocumentData);
  }

  async update(id: string, patch: Partial<NewDoc<T>>): Promise<T | null> {
    const ref = this.ref.doc(id);
    try {
      await ref.update(withTimestamps(clean(patch)));
    } catch (err: any) {
      if (err?.code === 5) return null; // NOT_FOUND
      throw err;
    }
    return this.get(id);
  }

  async delete(id: string): Promise<boolean> {
    const ref = this.ref.doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  }
}

export class FirestoreRepository implements Repository {
  cabins: Collection<Cabin>;
  activities: Collection<Activity>;
  reviews: Collection<Review>;
  reservations: Collection<Reservation>;

  constructor(private db: Firestore) {
    this.cabins = new FirestoreCollection(db, 'cabins', normalizeCabin);
    this.activities = new FirestoreCollection(db, 'activities', normalizeActivity);
    this.reviews = new FirestoreCollection(db, 'reviews', normalizeReview);
    this.reservations = new FirestoreCollection(db, 'reservations', normalizeReservation);
  }

  async getSettings() {
    const doc = await this.db.collection('settings').doc('general').get();
    return doc.exists ? (doc.data() as Partial<Settings>) : null;
  }

  async saveSettings(settings: Settings) {
    await this.db.collection('settings').doc('general').set(settings);
    return settings;
  }

  async createReservation(data: NewDoc<Reservation>): Promise<ReservationResult> {
    const col = this.db.collection('reservations');
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(col.where('cabinId', '==', data.cabinId));
      const existing = snap.docs.map((d) => normalizeReservation(d.id, d.data()));
      const conflict = findConfirmedConflict(existing, data);
      if (conflict) return { ok: false, reason: 'conflict', conflict } as const;
      const ref = col.doc();
      tx.set(ref, withTimestamps(clean(data)));
      return { ok: true, reservation: { ...data, id: ref.id } } as const;
    });
  }

  async setReservationStatus(id: string, status: Reservation['status']): Promise<ReservationResult> {
    const col = this.db.collection('reservations');
    return this.db.runTransaction(async (tx) => {
      const doc = await tx.get(col.doc(id));
      if (!doc.exists) return { ok: false, reason: 'not_found' } as const;
      const current = normalizeReservation(doc.id, doc.data()!);
      if (status === 'confirmed') {
        const snap = await tx.get(col.where('cabinId', '==', current.cabinId));
        const conflict = findConfirmedConflict(
          snap.docs.map((d) => normalizeReservation(d.id, d.data())),
          current,
        );
        if (conflict) return { ok: false, reason: 'conflict', conflict } as const;
      }
      const updatedAt = new Date().toISOString();
      tx.update(doc.ref, { status, updatedAt: Timestamp.fromDate(new Date(updatedAt)) });
      return { ok: true, reservation: { ...current, status, updatedAt } } as const;
    });
  }

  async isAdminUid(uid: string) {
    const doc = await this.db.collection('users').doc(uid).get();
    return doc.exists && doc.data()?.role === 'admin';
  }
}
