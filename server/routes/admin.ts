import { Router } from 'express';
import multer from 'multer';
import type { AdminStats, Reservation, ReservationStatus } from '../../shared/types';
import { requireAdmin } from '../auth';
import { withDefaults } from '../defaults';
import { asyncHandler, HttpError, notFound } from '../errors';
import { addDays, nightsBetween, rangesOverlap, todayInColombia } from '../lib/dates';
import type { Repository } from '../repo/types';
import type { FileStorage } from '../storage/types';
import {
  activityInput,
  cabinInput,
  reservationFilters,
  reservationStatusInput,
  reviewModerationInput,
  settingsInput,
} from '../validation';

export interface AdminRouterDeps {
  repo: Repository;
  storage: FileStorage;
  maxUploadBytes: number;
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

function csvCell(value: unknown): string {
  let s = String(value ?? '');
  // Evita que Excel interprete el contenido como fórmula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function filterReservations(list: Reservation[], f: ReturnType<typeof reservationFilters.parse>) {
  return list
    .filter((r) => !f.status || r.status === f.status)
    .filter((r) => !f.cabinId || r.cabinId === f.cabinId)
    .filter((r) => !f.from || r.checkOut > f.from)
    .filter((r) => !f.to || r.checkIn <= f.to)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function adminRouter({ repo, storage, maxUploadBytes }: AdminRouterDeps): Router {
  const router = Router();
  router.use(requireAdmin);

  // ---------- Cabañas ----------

  router.post(
    '/cabins',
    asyncHandler(async (req, res) => {
      res.status(201).json(await repo.cabins.create(cabinInput.parse(req.body)));
    }),
  );

  router.put(
    '/cabins/:id',
    asyncHandler(async (req, res) => {
      const updated = await repo.cabins.update(req.params.id, cabinInput.parse(req.body));
      if (!updated) throw notFound('Cabaña');
      res.json(updated);
    }),
  );

  router.delete(
    '/cabins/:id',
    asyncHandler(async (req, res) => {
      const today = todayInColombia();
      const upcoming = (await repo.reservations.list({ cabinId: req.params.id })).filter(
        (r) => r.status === 'confirmed' && r.checkOut > today,
      );
      if (upcoming.length > 0) {
        throw new HttpError(
          409,
          'has_reservations',
          `Esta cabaña tiene ${upcoming.length} reserva(s) confirmada(s) próximas. Cancélalas antes de eliminarla.`,
        );
      }
      if (!(await repo.cabins.delete(req.params.id))) throw notFound('Cabaña');
      res.status(204).end();
    }),
  );

  // ---------- Actividades ----------

  router.post(
    '/activities',
    asyncHandler(async (req, res) => {
      res.status(201).json(await repo.activities.create(activityInput.parse(req.body)));
    }),
  );

  router.put(
    '/activities/:id',
    asyncHandler(async (req, res) => {
      const updated = await repo.activities.update(req.params.id, activityInput.parse(req.body));
      if (!updated) throw notFound('Actividad');
      res.json(updated);
    }),
  );

  router.delete(
    '/activities/:id',
    asyncHandler(async (req, res) => {
      if (!(await repo.activities.delete(req.params.id))) throw notFound('Actividad');
      res.status(204).end();
    }),
  );

  // ---------- Reservas ----------

  router.get(
    '/reservations',
    asyncHandler(async (req, res) => {
      const filters = reservationFilters.parse(req.query);
      res.json(filterReservations(await repo.reservations.list(), filters));
    }),
  );

  router.get(
    '/reservations.csv',
    asyncHandler(async (req, res) => {
      const filters = reservationFilters.parse(req.query);
      const rows = filterReservations(await repo.reservations.list(), filters);
      const header = ['Código', 'Nombre', 'Cabaña', 'Huéspedes', 'Llegada', 'Salida', 'Noches', 'Total', 'WhatsApp', 'Correo', 'Estado', 'Notas', 'Creada'];
      const lines = rows.map((r) =>
        [r.id.slice(0, 8).toUpperCase(), r.guestName, r.cabinName, r.guests, r.checkIn, r.checkOut, r.nights, r.totalPrice, r.whatsappNumber, r.email, r.status, r.notes, r.createdAt]
          .map(csvCell)
          .join(','),
      );
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="reservas_${todayInColombia()}.csv"`);
      // BOM para que Excel lea bien las tildes.
      res.send('﻿' + [header.join(','), ...lines].join('\n'));
    }),
  );

  router.get(
    '/reservations/:id',
    asyncHandler(async (req, res) => {
      const reservation = await repo.reservations.get(req.params.id);
      if (!reservation) throw notFound('Reserva');
      res.json(reservation);
    }),
  );

  router.patch(
    '/reservations/:id/status',
    asyncHandler(async (req, res) => {
      const { status } = reservationStatusInput.parse(req.body);
      const result = await repo.setReservationStatus(req.params.id, status);
      if (!result.ok && result.reason === 'not_found') throw notFound('Reserva');
      if (!result.ok) {
        const c = result.conflict!;
        throw new HttpError(
          409,
          'dates_unavailable',
          `No se puede confirmar: ${c.guestName} ya tiene confirmada esta cabaña del ${c.checkIn} al ${c.checkOut}.`,
          { conflictId: c.id },
        );
      }
      res.json(result.reservation);
    }),
  );

  router.delete(
    '/reservations/:id',
    asyncHandler(async (req, res) => {
      if (!(await repo.reservations.delete(req.params.id))) throw notFound('Reserva');
      res.status(204).end();
    }),
  );

  // ---------- Reseñas ----------

  router.get(
    '/reviews',
    asyncHandler(async (_req, res) => {
      const reviews = await repo.reviews.list();
      res.json(reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }),
  );

  router.patch(
    '/reviews/:id',
    asyncHandler(async (req, res) => {
      const updated = await repo.reviews.update(req.params.id, reviewModerationInput.parse(req.body));
      if (!updated) throw notFound('Reseña');
      res.json(updated);
    }),
  );

  router.delete(
    '/reviews/:id',
    asyncHandler(async (req, res) => {
      if (!(await repo.reviews.delete(req.params.id))) throw notFound('Reseña');
      res.status(204).end();
    }),
  );

  // ---------- Ajustes ----------

  router.put(
    '/settings',
    asyncHandler(async (req, res) => {
      const current = withDefaults(await repo.getSettings());
      const next = settingsInput.parse({ ...current, ...req.body });
      res.json(await repo.saveSettings(next));
    }),
  );

  // ---------- Imágenes ----------

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxUploadBytes, files: 10 },
    fileFilter: (_req, file, cb) => {
      if (IMAGE_TYPES.has(file.mimetype)) cb(null, true);
      else cb(new HttpError(400, 'invalid_file', 'Solo se permiten imágenes JPG, PNG, WebP, GIF o AVIF.'));
    },
  });

  router.post(
    '/uploads',
    upload.array('files', 10),
    asyncHandler(async (req, res) => {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) throw new HttpError(400, 'no_files', 'No se recibió ninguna imagen.');
      const urls: string[] = [];
      for (const f of files) {
        urls.push(await storage.save({ buffer: f.buffer, originalName: f.originalname, contentType: f.mimetype }));
      }
      res.status(201).json({ urls });
    }),
  );

  // ---------- Resumen ----------

  router.get(
    '/stats',
    asyncHandler(async (_req, res) => {
      const [cabins, activities, reviews, reservations] = await Promise.all([
        repo.cabins.list(),
        repo.activities.list(),
        repo.reviews.list(),
        repo.reservations.list(),
      ]);
      const today = todayInColombia();
      const in30 = addDays(today, 30);
      const monthStart = today.slice(0, 8) + '01';
      const nextMonthStart = addDays(monthStart, 32).slice(0, 8) + '01';

      const counts: Record<ReservationStatus, number> = { pending: 0, confirmed: 0, cancelled: 0 };
      for (const r of reservations) counts[r.status]++;

      const confirmed = reservations.filter((r) => r.status === 'confirmed');
      let bookedNights = 0;
      for (const r of confirmed) {
        if (!rangesOverlap(r.checkIn, r.checkOut, today, in30)) continue;
        const start = r.checkIn > today ? r.checkIn : today;
        const end = r.checkOut < in30 ? r.checkOut : in30;
        bookedNights += nightsBetween(start, end);
      }

      const stats: AdminStats = {
        cabins: cabins.length,
        activities: activities.length,
        reviews: reviews.length,
        reservations: counts,
        upcomingCheckIns: confirmed
          .filter((r) => r.checkIn >= today && r.checkIn <= addDays(today, 7))
          .sort((a, b) => a.checkIn.localeCompare(b.checkIn)),
        occupancyNext30Days: cabins.length ? bookedNights / (cabins.length * 30) : 0,
        confirmedRevenueThisMonth: confirmed
          .filter((r) => r.checkIn >= monthStart && r.checkIn < nextMonthStart)
          .reduce((sum, r) => sum + r.totalPrice, 0),
      };
      res.json(stats);
    }),
  );

  return router;
}
