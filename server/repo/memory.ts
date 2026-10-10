import { randomUUID } from 'node:crypto';
import type { Activity, Cabin, Reservation, Review, Settings } from '../../shared/types';
import type { Collection, NewDoc, Repository, ReservationResult } from './types';
import { findConfirmedConflict } from './conflicts';

class MemoryCollection<T extends { id: string }> implements Collection<T> {
  readonly items = new Map<string, T>();

  async list(where: Partial<T> = {}): Promise<T[]> {
    const entries = Object.entries(where) as [keyof T, unknown][];
    return [...this.items.values()]
      .filter((item) => entries.every(([k, v]) => item[k] === v))
      .map((item) => structuredClone(item));
  }

  async get(id: string): Promise<T | null> {
    const item = this.items.get(id);
    return item ? structuredClone(item) : null;
  }

  async create(data: NewDoc<T>): Promise<T> {
    const item = { ...structuredClone(data), id: randomUUID() } as T;
    this.items.set(item.id, item);
    return structuredClone(item);
  }

  async update(id: string, patch: Partial<NewDoc<T>>): Promise<T | null> {
    const current = this.items.get(id);
    if (!current) return null;
    const next = { ...current, ...structuredClone(patch), id };
    this.items.set(id, next);
    return structuredClone(next);
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}

/**
 * Repositorio en memoria para desarrollo local sin credenciales de Firebase y para pruebas.
 * Los datos se pierden al reiniciar el servidor.
 */
export class MemoryRepository implements Repository {
  cabins = new MemoryCollection<Cabin>();
  activities = new MemoryCollection<Activity>();
  reviews = new MemoryCollection<Review>();
  reservations = new MemoryCollection<Reservation>();
  adminUids = new Set<string>();
  private settings: Settings | null = null;

  async getSettings() {
    return this.settings ? structuredClone(this.settings) : null;
  }

  async saveSettings(settings: Settings) {
    this.settings = structuredClone(settings);
    return structuredClone(settings);
  }

  async createReservation(data: NewDoc<Reservation>): Promise<ReservationResult> {
    const conflict = findConfirmedConflict(await this.reservations.list(), data);
    if (conflict) return { ok: false, reason: 'conflict', conflict };
    return { ok: true, reservation: await this.reservations.create(data) };
  }

  async setReservationStatus(id: string, status: Reservation['status']): Promise<ReservationResult> {
    const current = await this.reservations.get(id);
    if (!current) return { ok: false, reason: 'not_found' };
    if (status === 'confirmed') {
      const conflict = findConfirmedConflict(await this.reservations.list(), current);
      if (conflict) return { ok: false, reason: 'conflict', conflict };
    }
    const updated = await this.reservations.update(id, { status, updatedAt: new Date().toISOString() });
    return { ok: true, reservation: updated! };
  }

  async isAdminUid(uid: string) {
    return this.adminUids.has(uid);
  }
}
