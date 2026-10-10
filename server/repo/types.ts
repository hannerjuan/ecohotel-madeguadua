import type { Activity, Cabin, Reservation, ReservationStatus, Review, Settings } from '../../shared/types';

export type NewDoc<T extends { id: string }> = Omit<T, 'id'>;

export interface Collection<T extends { id: string }> {
  list(where?: Partial<Pick<T, keyof T>>): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(data: NewDoc<T>): Promise<T>;
  /** Devuelve null si el documento no existe. */
  update(id: string, patch: Partial<NewDoc<T>>): Promise<T | null>;
  /** Devuelve false si el documento no existía. */
  delete(id: string): Promise<boolean>;
}

export type ReservationResult =
  | { ok: true; reservation: Reservation }
  | { ok: false; reason: 'not_found' | 'conflict'; conflict?: Reservation };

export interface Repository {
  cabins: Collection<Cabin>;
  activities: Collection<Activity>;
  reviews: Collection<Review>;
  reservations: Collection<Reservation>;

  getSettings(): Promise<Partial<Settings> | null>;
  saveSettings(settings: Settings): Promise<Settings>;

  /**
   * Crea la reserva solo si no choca con una reserva confirmada de la misma cabaña.
   * Se ejecuta de forma atómica para que dos huéspedes no tomen las mismas fechas.
   */
  createReservation(data: NewDoc<Reservation>): Promise<ReservationResult>;

  /**
   * Cambia el estado. Al confirmar, verifica de forma atómica que no exista otra
   * reserva confirmada que se cruce con estas fechas.
   */
  setReservationStatus(id: string, status: ReservationStatus): Promise<ReservationResult>;

  /** Rol guardado en users/{uid}. */
  isAdminUid(uid: string): Promise<boolean>;
}
