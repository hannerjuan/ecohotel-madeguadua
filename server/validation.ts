import { z } from 'zod';
import { parseDay } from './lib/dates';

const text = (max: number, label: string) =>
  z
    .string({ error: `${label} es obligatorio.` })
    .trim()
    .min(1, `${label} es obligatorio.`)
    .max(max, `${label} admite máximo ${max} caracteres.`);

const optionalText = (max: number) => z.string().trim().max(max).optional().default('');

/** URL http(s) o una ruta servida por este backend (/uploads/...). */
const imageUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === '' || /^https?:\/\//.test(v) || v.startsWith('/uploads/'), 'La URL de la imagen no es válida.');

const urlList = z.array(imageUrl).max(30).default([]).transform((l) => l.filter(Boolean));
const tagList = z.array(z.string().trim().max(80)).max(40).default([]).transform((l) => l.filter(Boolean));

const day = (label: string) =>
  z.string({ error: `${label} es obligatorio.` }).refine((v) => parseDay(v) !== null, `${label} debe tener el formato AAAA-MM-DD.`);

export const cabinInput = z.object({
  name: text(100, 'El nombre'),
  description: text(4000, 'La descripción'),
  price: z.coerce.number().positive('El precio debe ser mayor que cero.').max(100_000_000),
  capacity: z.coerce.number().int('La capacidad debe ser un número entero.').min(1).max(50),
  amenities: tagList,
  imageUrl: imageUrl.default(''),
  galleryUrls: urlList,
});

export const activityInput = z.object({
  name: text(100, 'El nombre'),
  description: text(500, 'La descripción corta'),
  details: optionalText(4000),
  cost: z.coerce.number().min(0).max(100_000_000).default(0),
  duration: optionalText(60),
  difficulty: z.enum(['Fácil', 'Moderada', 'Difícil']).default('Fácil'),
  imageUrl: imageUrl.default(''),
  galleryUrls: urlList,
  includes: tagList,
});

export const reservationInput = z
  .object({
    cabinId: text(128, 'La cabaña'),
    guestName: text(100, 'El nombre'),
    guests: z.coerce.number().int().min(1, 'Debe haber al menos 1 huésped.').max(50).default(1),
    email: z.union([z.email('El correo no es válido.'), z.literal('')]).optional(),
    notes: z.string().trim().max(1000).optional(),
    checkIn: day('La fecha de llegada'),
    checkOut: day('La fecha de salida'),
    whatsappNumber: z
      .string({ error: 'El WhatsApp es obligatorio.' })
      .trim()
      .refine((v) => {
        const digits = v.replace(/\D/g, '');
        return digits.length >= 7 && digits.length <= 15;
      }, 'El número de WhatsApp no es válido.'),
    // Campo trampa para bots: un humano nunca lo llena.
    website: z.string().max(0, 'Solicitud rechazada.').optional(),
  })
  .refine((r) => r.checkOut > r.checkIn, {
    message: 'La fecha de salida debe ser posterior a la de llegada.',
    path: ['checkOut'],
  });

export const reservationStatusInput = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']),
});

export const reviewInput = z.object({
  guestName: text(100, 'El nombre'),
  rating: z.coerce.number().int().min(1, 'La calificación va de 1 a 5.').max(5, 'La calificación va de 1 a 5.'),
  comment: text(2000, 'El comentario'),
  website: z.string().max(0, 'Solicitud rechazada.').optional(),
});

export const reviewModerationInput = z.object({
  status: z.enum(['published', 'hidden']),
});

export const quoteQuery = z
  .object({ checkIn: day('La fecha de llegada'), checkOut: day('La fecha de salida') })
  .refine((r) => r.checkOut > r.checkIn, {
    message: 'La fecha de salida debe ser posterior a la de llegada.',
    path: ['checkOut'],
  });

export const reservationFilters = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  cabinId: z.string().optional(),
  from: day('Desde').optional(),
  to: day('Hasta').optional(),
});

export const settingsInput = z.object({
  hotelName: text(100, 'El nombre del hotel'),
  whatsappNumber: z
    .string()
    .trim()
    .refine((v) => /^\d{7,15}$/.test(v.replace(/\D/g, '')), 'El WhatsApp debe tener entre 7 y 15 dígitos.')
    .transform((v) => v.replace(/\D/g, '')),
  email: z.union([z.email('El correo no es válido.'), z.literal('')]).default(''),
  address: optionalText(200),
  howToGetThere: optionalText(500),
  mapLat: z.coerce.number().min(-90).max(90),
  mapLng: z.coerce.number().min(-180).max(180),
  heroImages: urlList,
  checkInTime: optionalText(20),
  checkOutTime: optionalText(20),
  cancellationPolicy: optionalText(5000),
  houseRules: optionalText(5000),
});
