import type { Reservation } from '../../shared/types';
import { rangesOverlap } from '../lib/dates';

/** Primera reserva confirmada de la misma cabaña que se cruza con las fechas dadas. */
export function findConfirmedConflict(
  existing: Reservation[],
  candidate: Pick<Reservation, 'cabinId' | 'checkIn' | 'checkOut'> & { id?: string },
): Reservation | undefined {
  return existing.find(
    (r) =>
      r.id !== candidate.id &&
      r.cabinId === candidate.cabinId &&
      r.status === 'confirmed' &&
      rangesOverlap(candidate.checkIn, candidate.checkOut, r.checkIn, r.checkOut),
  );
}
