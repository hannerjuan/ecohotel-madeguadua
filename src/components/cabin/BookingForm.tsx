import { addDays, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, CheckCircle2, Send, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Link } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { api, ApiError, type ReservationCreated } from '../../lib/api';
import { formatCOP, formatDay, parseLocalDate, plural, shortCode, toDateString } from '../../lib/format';
import type { Cabin } from '../../types';

registerLocale('es', es);

interface Range {
  start: Date;
  end: Date;
}

const inputClass = 'w-full bg-cream border-none rounded-2xl p-4 focus:ring-2 focus:ring-olive/30 outline-none';

function recommendRanges(booked: Range[]): { start: Date; end: Date | null }[] {
  const recs: { start: Date; end: Date | null }[] = [];
  let cursor = addDays(new Date(new Date().setHours(0, 0, 0, 0)), 1);
  for (const b of booked) {
    if (differenceInCalendarDays(b.start, cursor) >= 2) recs.push({ start: cursor, end: b.start });
    if (cursor < b.end) cursor = b.end;
  }
  if (recs.length < 3) recs.push({ start: cursor, end: null });
  return recs.slice(0, 3);
}

export default function BookingForm({ cabin }: { cabin: Cabin }) {
  const availability = useAsync(() => api.availability(cabin.id), [cabin.id]);
  const [form, setForm] = useState({
    guestName: '',
    guests: Math.min(2, cabin.capacity),
    checkIn: '',
    checkOut: '',
    whatsappNumber: '',
    email: '',
    notes: '',
    website: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<ReservationCreated | null>(null);

  const booked: Range[] = useMemo(
    () =>
      (availability.data?.booked ?? []).map((b) => ({ start: parseLocalDate(b.checkIn)!, end: parseLocalDate(b.checkOut)! })),
    [availability.data],
  );

  const checkIn = parseLocalDate(form.checkIn);
  const checkOut = parseLocalDate(form.checkOut);
  const nights = checkIn && checkOut ? differenceInCalendarDays(checkOut, checkIn) : 0;
  const conflict = checkIn && checkOut && nights > 0 ? booked.find((b) => checkIn < b.end && checkOut > b.start) : undefined;
  const nextBooking = checkIn ? booked.find((b) => b.start >= checkIn) : undefined;

  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nights <= 0) return setError('Elige las fechas de llegada y salida.');
    if (conflict) return setError('La cabaña no está disponible en esas fechas.');
    setSubmitting(true);
    try {
      setCreated(
        await api.createReservation({
          cabinId: cabin.id,
          ...form,
          email: form.email || undefined,
          notes: form.notes || undefined,
        }),
      );
    } catch (err) {
      setError((err as Error).message);
      if (err instanceof ApiError && err.status === 409) availability.reload();
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    const r = created.reservation;
    return (
      <div className="text-center py-6">
        <CheckCircle2 size={56} className="text-green-600 mx-auto mb-5" />
        <h2 className="serif text-3xl text-olive mb-3">¡Solicitud recibida!</h2>
        <p className="text-ink/60 mb-6">
          Tu código es <strong className="text-olive">{shortCode(r.id)}</strong>. Envíanos el mensaje por WhatsApp para confirmar la
          disponibilidad y los datos de pago.
        </p>
        <dl className="bg-cream rounded-2xl p-5 text-sm text-left space-y-2 mb-8">
          <div className="flex justify-between"><dt className="text-ink/60">Llegada</dt><dd>{formatDay(r.checkIn)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink/60">Salida</dt><dd>{formatDay(r.checkOut)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink/60">Huéspedes</dt><dd>{r.guests}</dd></div>
          <div className="flex justify-between font-semibold text-olive border-t border-olive/10 pt-2">
            <dt>Total estimado ({plural(r.nights, 'noche', 'noches')})</dt>
            <dd>{formatCOP(r.totalPrice)}</dd>
          </div>
        </dl>
        <a
          href={created.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-3 rounded-full py-4 text-lg font-medium text-white bg-[#25D366] hover:opacity-90"
        >
          <Send size={20} /> Enviar por WhatsApp
        </a>
      </div>
    );
  }

  return (
    <>
      <h2 className="serif text-3xl text-olive mb-2">Reserva tu estancia</h2>
      <p className="text-ink/60 mb-6">
        <strong className="text-olive text-2xl">{formatCOP(cabin.price)}</strong> / noche
      </p>

      {booked.length > 0 && (
        <div className="mb-6 space-y-4">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
              <CalendarIcon size={16} /> Fechas ocupadas
            </h3>
            <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
              {booked.slice(0, 5).map((b) => (
                <li key={b.start.toISOString()}>
                  Del {formatDay(b.start, "d 'de' MMMM")} al {formatDay(b.end, "d 'de' MMMM")}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 bg-olive/5 rounded-2xl border border-olive/10">
            <h3 className="text-sm font-bold text-olive mb-3 flex items-center gap-2">
              <Sparkles size={16} /> Fechas libres sugeridas
            </h3>
            <div className="flex flex-wrap gap-2">
              {recommendRanges(booked).map((rec) => (
                <button
                  key={rec.start.toISOString()}
                  type="button"
                  onClick={() => {
                    const span = rec.end ? Math.min(differenceInCalendarDays(rec.end, rec.start), 2) : 2;
                    set({ checkIn: toDateString(rec.start), checkOut: toDateString(addDays(rec.start, span)) });
                  }}
                  className="text-xs bg-white border border-olive/20 text-olive px-3 py-2 rounded-xl hover:bg-olive hover:text-white transition-colors font-medium"
                >
                  {rec.end
                    ? `Del ${formatDay(rec.start, 'd MMM')} al ${formatDay(rec.end, 'd MMM')}`
                    : `Desde el ${formatDay(rec.start, 'd MMM')}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5" noValidate={false}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="checkin" className="block text-sm font-medium text-ink/60 mb-2">Llegada</label>
            <DatePicker
              id="checkin"
              required
              locale="es"
              dateFormat="d MMM yyyy"
              minDate={new Date()}
              excludeDateIntervals={booked.map((b) => ({ start: b.start, end: addDays(b.end, -1) }))}
              selected={checkIn}
              onChange={(d: Date | null) => {
                const next = d ? toDateString(d) : '';
                set({ checkIn: next, checkOut: form.checkOut && next >= form.checkOut ? '' : form.checkOut });
              }}
              className={inputClass}
              placeholderText="Elige fecha"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="checkout" className="block text-sm font-medium text-ink/60 mb-2">Salida</label>
            <DatePicker
              id="checkout"
              required
              locale="es"
              dateFormat="d MMM yyyy"
              minDate={addDays(checkIn ?? new Date(), 1)}
              maxDate={nextBooking?.start}
              excludeDateIntervals={booked.map((b) => ({ start: addDays(b.start, 1), end: b.end }))}
              selected={checkOut}
              onChange={(d: Date | null) => set({ checkOut: d ? toDateString(d) : '' })}
              className={inputClass}
              placeholderText="Elige fecha"
              autoComplete="off"
            />
          </div>
        </div>

        {nights > 0 && !conflict && (
          <div className="p-4 bg-green-50 text-green-800 rounded-2xl text-sm flex justify-between items-center">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={18} /> Disponible · {plural(nights, 'noche', 'noches')}
            </span>
            <strong>{formatCOP(nights * cabin.price)}</strong>
          </div>
        )}
        {conflict && (
          <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-start gap-2 text-sm">
            <X size={18} className="mt-0.5 shrink-0" />
            <p>No disponible. Se libera el {formatDay(conflict.end, "d 'de' MMMM")}.</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label htmlFor="guestName" className="block text-sm font-medium text-ink/60 mb-2">Nombre completo</label>
            <input
              id="guestName"
              required
              maxLength={100}
              autoComplete="name"
              className={inputClass}
              value={form.guestName}
              onChange={(e) => set({ guestName: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="guests" className="block text-sm font-medium text-ink/60 mb-2">Personas</label>
            <select id="guests" className={inputClass} value={form.guests} onChange={(e) => set({ guests: Number(e.target.value) })}>
              {Array.from({ length: cabin.capacity }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="whatsapp" className="block text-sm font-medium text-ink/60 mb-2">WhatsApp</label>
          <input
            id="whatsapp"
            required
            type="tel"
            autoComplete="tel"
            className={inputClass}
            placeholder="+57 300 000 0000"
            value={form.whatsappNumber}
            onChange={(e) => set({ whatsappNumber: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink/60 mb-2">Correo <span className="text-ink/40">(opcional)</span></label>
          <input id="email" type="email" autoComplete="email" className={inputClass} value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-ink/60 mb-2">Notas <span className="text-ink/40">(opcional)</span></label>
          <textarea
            id="notes"
            rows={2}
            maxLength={1000}
            className={`${inputClass} resize-none`}
            placeholder="Hora de llegada, mascotas, celebraciones…"
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </div>

        {/* Campo trampa para bots, invisible para personas. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
          value={form.website}
          onChange={(e) => set({ website: e.target.value })}
        />

        <label className="flex items-start gap-3 bg-olive/5 p-4 rounded-xl border border-olive/10 text-xs text-ink/70 leading-relaxed cursor-pointer">
          <input required type="checkbox" className="mt-0.5 w-4 h-4 accent-olive" />
          <span>
            Acepto la <Link to="/privacidad" target="_blank" className="underline font-medium">política de privacidad</Link> y las{' '}
            <Link to="/politicas" target="_blank" className="underline font-medium">reglas de cancelación</Link>, y autorizo el tratamiento de mis datos según la Ley 1581 de 2012.
          </span>
        </label>

        {error && (
          <p role="alert" className="text-red-600 text-sm font-medium">
            {error}
          </p>
        )}

        <button
          disabled={submitting || Boolean(conflict)}
          type="submit"
          className="w-full olive-button py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {submitting ? 'Enviando…' : (
            <>
              <Send size={20} /> Solicitar reserva
            </>
          )}
        </button>
        <p className="text-[11px] text-center text-ink/50">
          No se cobra nada ahora. Confirmamos la reserva contigo por WhatsApp.
        </p>
      </form>
    </>
  );
}
