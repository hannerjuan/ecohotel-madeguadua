import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, List, MessageCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { api, type ReservationFilters } from '../../lib/api';
import { formatCOP, formatDay, parseLocalDate, plural, shortCode, toDateString, whatsappLink } from '../../lib/format';
import type { Cabin, Reservation, ReservationStatus } from '../../types';
import { ErrorState, Modal, PageLoader } from '../ui';
import { ConfirmDelete, STATUS_LABEL, StatusBadge } from './common';

const selectClass = 'bg-cream rounded-xl p-2.5 text-sm outline-none text-ink/80';

function guestMessage(r: Reservation, hotelName: string) {
  if (r.status === 'confirmed') {
    return `¡Hola ${r.guestName.split(' ')[0]}! Tu reserva ${shortCode(r.id)} en ${hotelName} (${r.cabinName}) del ${r.checkIn} al ${r.checkOut} está confirmada. ¡Te esperamos!`;
  }
  return `¡Hola ${r.guestName.split(' ')[0]}! Te escribimos de ${hotelName} sobre tu solicitud ${shortCode(r.id)} para la cabaña ${r.cabinName} del ${r.checkIn} al ${r.checkOut}.`;
}

function ReservationDetail({
  reservation,
  onClose,
  onChanged,
}: {
  reservation: Reservation;
  onClose: () => void;
  onChanged: (r: Reservation | null) => void;
}) {
  const toast = useToast();
  const { settings } = useSettings();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const r = reservation;

  const setStatus = async (status: ReservationStatus) => {
    setBusy(true);
    try {
      const updated = await api.admin.setReservationStatus(r.id, status);
      toast(`Reserva marcada como ${STATUS_LABEL[status].toLowerCase()}.`);
      onChanged(updated);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const row = (label: string, value: React.ReactNode) => (
    <div className="bg-cream/60 p-3 rounded-xl">
      <p className="text-[11px] text-ink/50 uppercase tracking-widest mb-0.5">{label}</p>
      <div className="font-medium">{value}</div>
    </div>
  );

  return (
    <Modal title={`Reserva ${shortCode(r.id)}`} onClose={onClose}>
      <div className="flex justify-between items-start mb-5">
        <div>
          <p className="text-xl font-medium">{r.guestName}</p>
          <p className="text-sm text-olive font-semibold">{r.cabinName}</p>
        </div>
        <StatusBadge status={r.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
        {row('Llegada', formatDay(r.checkIn))}
        {row('Salida', formatDay(r.checkOut))}
        {row('Huéspedes', r.guests)}
        {row('Noches', r.nights)}
        {row(
          'WhatsApp',
          <a href={whatsappLink(r.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="text-olive underline">
            {r.whatsappNumber}
          </a>,
        )}
        {row('Correo', r.email ? <a href={`mailto:${r.email}`} className="text-olive underline break-all">{r.email}</a> : '—')}
      </div>

      {r.notes && <p className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm mb-5 whitespace-pre-line">{r.notes}</p>}

      <div className="flex justify-between items-center bg-olive/5 border border-olive/10 rounded-xl p-4 mb-5">
        <span className="font-bold text-olive">Total ({plural(r.nights, 'noche', 'noches')})</span>
        <span className="font-bold text-xl text-olive">{formatCOP(r.totalPrice)}</span>
      </div>

      <p className="text-xs text-ink/50 mb-6">Solicitada el {formatDay(r.createdAt, "d 'de' MMMM yyyy, h:mm a")}</p>

      <div className="flex flex-wrap gap-2">
        {r.status !== 'confirmed' && (
          <button disabled={busy} onClick={() => setStatus('confirmed')} className="px-4 py-2 rounded-xl font-medium text-white bg-green-600 hover:bg-green-700 text-sm disabled:opacity-50">
            Confirmar
          </button>
        )}
        {r.status !== 'cancelled' && (
          <button disabled={busy} onClick={() => setStatus('cancelled')} className="px-4 py-2 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 text-sm disabled:opacity-50">
            Cancelar
          </button>
        )}
        {r.status !== 'pending' && (
          <button disabled={busy} onClick={() => setStatus('pending')} className="px-4 py-2 rounded-xl font-medium text-ink/70 bg-white border border-olive/15 text-sm disabled:opacity-50">
            Volver a pendiente
          </button>
        )}
        <a
          href={whatsappLink(r.whatsappNumber, guestMessage(r, settings.hotelName))}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl font-medium text-white bg-[#25D366] text-sm flex items-center gap-2"
        >
          <MessageCircle size={16} /> Escribir al huésped
        </a>
        <button onClick={() => setConfirmDelete(true)} className="ml-auto p-2 text-red-600 hover:bg-red-50 rounded-xl" aria-label="Eliminar reserva">
          <Trash2 size={18} />
        </button>
      </div>

      {confirmDelete && (
        <ConfirmDelete
          what="esta reserva"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            try {
              await api.admin.deleteReservation(r.id);
              toast('Reserva eliminada.');
              onChanged(null);
            } catch (err) {
              toast((err as Error).message, 'error');
            }
            setConfirmDelete(false);
          }}
        />
      )}
    </Modal>
  );
}

function CalendarView({ reservations, onSelect }: { reservations: Reservation[]; onSelect: (r: Reservation) => void }) {
  const [month, setMonth] = useState(new Date());
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
  const visible = reservations.filter((r) => r.status !== 'cancelled');

  return (
    <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-olive/10 overflow-x-auto">
      <div className="flex justify-between items-center mb-6 min-w-[640px]">
        <h3 className="serif text-2xl text-olive capitalize">{format(month, 'MMMM yyyy', { locale: es })}</h3>
        <div className="flex gap-2">
          <button onClick={() => setMonth(subMonths(month, 1))} className="p-2 rounded-xl bg-cream hover:bg-olive/10 text-olive" aria-label="Mes anterior">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setMonth(new Date())} className="px-3 rounded-xl bg-cream hover:bg-olive/10 text-olive text-sm">
            Hoy
          </button>
          <button onClick={() => setMonth(addMonths(month, 1))} className="p-2 rounded-xl bg-cream hover:bg-olive/10 text-olive" aria-label="Mes siguiente">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
            <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-ink/40 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = toDateString(day);
            // Una noche ocupa el día de llegada hasta el anterior a la salida.
            const dayRes = visible.filter((r) => r.checkIn <= key && key < r.checkOut);
            return (
              <div key={key} className={`min-h-[96px] p-1 border border-cream rounded-lg flex flex-col ${isSameMonth(day, month) ? 'bg-white' : 'bg-cream/30 opacity-50'}`}>
                <span className={`text-xs font-medium p-1 mb-1 self-start ${isSameDay(day, new Date()) ? 'bg-olive text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-ink/60'}`}>
                  {format(day, 'd')}
                </span>
                <div className="flex flex-col gap-1">
                  {dayRes.map((r) => {
                    const isStart = isSameDay(day, parseLocalDate(r.checkIn)!) || day.getDay() === 0;
                    return (
                      <button
                        key={r.id}
                        onClick={() => onSelect(r)}
                        className={`text-[10px] text-left px-1.5 py-1 leading-tight truncate hover:opacity-80 rounded ${
                          r.status === 'confirmed' ? 'bg-olive/20 text-olive' : 'bg-amber-100 text-amber-800'
                        }`}
                        title={`${r.guestName} · ${r.cabinName}`}
                      >
                        {isStart ? `${r.guestName.split(' ')[0]} · ${r.cabinName}` : ' '}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-ink/50 mt-4 flex gap-4">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-olive/20" /> Confirmada</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100" /> Pendiente</span>
      </p>
    </div>
  );
}

export default function ReservationsTab({ cabins, refreshKey, onChanged }: { cabins: Cabin[]; refreshKey: number; onChanged: () => void }) {
  const toast = useToast();
  const [filters, setFilters] = useState<ReservationFilters>({});
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selected, setSelected] = useState<Reservation | null>(null);
  const { data, error, loading, reload, setData } = useAsync(() => api.admin.reservations(filters), [JSON.stringify(filters), refreshKey]);

  const setFilter = (patch: ReservationFilters) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between gap-4 bg-white p-4 rounded-2xl border border-olive/10 shadow-sm">
        <div className="flex gap-2">
          <button onClick={() => setView('list')} className={`px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-medium ${view === 'list' ? 'bg-olive text-white' : 'bg-cream text-ink/60'}`}>
            <List size={18} /> Lista
          </button>
          <button onClick={() => setView('calendar')} className={`px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-medium ${view === 'calendar' ? 'bg-olive text-white' : 'bg-cream text-ink/60'}`}>
            <CalendarIcon size={18} /> Calendario
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select className={selectClass} value={filters.cabinId ?? ''} onChange={(e) => setFilter({ cabinId: e.target.value || undefined })} aria-label="Cabaña">
            <option value="">Todas las cabañas</option>
            {cabins.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select className={selectClass} value={filters.status ?? ''} onChange={(e) => setFilter({ status: (e.target.value || undefined) as ReservationStatus })} aria-label="Estado">
            <option value="">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="confirmed">Confirmadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
          <label className="flex items-center gap-2 bg-cream rounded-xl px-3 py-1.5 text-xs text-ink/60">
            Desde
            <input type="date" className="bg-transparent text-sm outline-none text-ink/80" value={filters.from ?? ''} onChange={(e) => setFilter({ from: e.target.value || undefined })} />
          </label>
          <label className="flex items-center gap-2 bg-cream rounded-xl px-3 py-1.5 text-xs text-ink/60">
            Hasta
            <input type="date" className="bg-transparent text-sm outline-none text-ink/80" value={filters.to ?? ''} onChange={(e) => setFilter({ to: e.target.value || undefined })} />
          </label>
          <button
            onClick={() => api.admin.downloadReservationsCsv(filters).catch((err) => toast(err.message, 'error'))}
            className="flex items-center gap-2 px-4 py-2 bg-olive/10 text-olive rounded-xl text-sm font-medium hover:bg-olive/20"
          >
            <Download size={18} /> Exportar CSV
          </button>
        </div>
      </div>

      {loading && !data && <PageLoader />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && view === 'list' && (
        <div className="space-y-3">
          {data.map((r) => (
            <button key={r.id} onClick={() => setSelected(r)} className="card p-5 w-full text-left hover:shadow-md transition-shadow border border-transparent hover:border-olive/20">
              <div className="flex justify-between items-start mb-3 gap-4">
                <div>
                  <h3 className="serif text-xl">{r.guestName}</h3>
                  <p className="text-xs text-olive font-bold uppercase tracking-widest">{r.cabinName} · {shortCode(r.id)}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div><p className="text-[10px] text-ink/40 uppercase">Llegada</p><p className="font-medium">{formatDay(r.checkIn, 'd MMM yyyy')}</p></div>
                <div><p className="text-[10px] text-ink/40 uppercase">Salida</p><p className="font-medium">{formatDay(r.checkOut, 'd MMM yyyy')}</p></div>
                <div><p className="text-[10px] text-ink/40 uppercase">Huéspedes</p><p className="font-medium">{r.guests}</p></div>
                <div><p className="text-[10px] text-ink/40 uppercase">Total</p><p className="font-medium">{formatCOP(r.totalPrice)}</p></div>
                <div><p className="text-[10px] text-ink/40 uppercase">Solicitada</p><p className="text-ink/50">{formatDay(r.createdAt, 'd MMM, h:mm a')}</p></div>
              </div>
            </button>
          ))}
          {data.length === 0 && <p className="text-center py-12 text-ink/40">No hay reservas que coincidan con los filtros.</p>}
        </div>
      )}

      {data && view === 'calendar' && <CalendarView reservations={data} onSelect={setSelected} />}

      {selected && (
        <ReservationDetail
          reservation={selected}
          onClose={() => setSelected(null)}
          onChanged={(updated) => {
            setData((list) => (list ?? []).flatMap((r) => (r.id !== selected.id ? [r] : updated ? [updated] : [])));
            setSelected(updated);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
