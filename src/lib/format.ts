import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export const formatCOP = (value: number) => cop.format(value);

/** 'yyyy-MM-dd' → Date local (sin desfase por zona horaria). */
export function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const toDateString = (date: Date) => format(date, 'yyyy-MM-dd');

export function formatDay(value: string | Date, pattern = "d 'de' MMMM yyyy") {
  const date = typeof value === 'string' ? (value.length === 10 ? parseLocalDate(value) : new Date(value)) : value;
  return date ? format(date, pattern, { locale: es }) : '';
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const shortCode = (id: string) => id.slice(0, 8).toUpperCase();

export const whatsappLink = (number: string, text?: string) =>
  `https://wa.me/${number.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

/** Imagen de respaldo cuando una cabaña o actividad aún no tiene foto. */
export const fallbackImage = (seed: string, w = 800, h = 600) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
