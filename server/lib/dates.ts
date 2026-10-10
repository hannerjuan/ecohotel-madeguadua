const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Convierte 'yyyy-MM-dd' a milisegundos UTC; null si no es una fecha real. */
export function parseDay(value: string): number | null {
  if (!ISO_DATE.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return ms;
}

export function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = parseDay(checkIn);
  const b = parseDay(checkOut);
  if (a === null || b === null) return 0;
  return Math.round((b - a) / DAY_MS);
}

/** Dos estadías chocan si una empieza antes de que la otra termine (el día de salida queda libre). */
export function rangesOverlap(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
  return aIn < bOut && aOut > bIn;
}

/** Fecha de hoy en Colombia (UTC-5, sin horario de verano). */
export function todayInColombia(now: Date = new Date()): string {
  return formatDay(now.getTime() - 5 * 3_600_000);
}

export function addDays(day: string, days: number): string {
  const ms = parseDay(day);
  if (ms === null) throw new Error(`Fecha inválida: ${day}`);
  return formatDay(ms + days * DAY_MS);
}
