import { Bell, BellOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { usePageTitle } from '../../hooks/usePageTitle';
import { api } from '../../lib/api';
import { formatCOP, formatDay } from '../../lib/format';
import { PageLoader } from '../ui';
import ActivitiesTab from './ActivitiesTab';
import CabinsTab from './CabinsTab';
import ReservationsTab from './ReservationsTab';
import ReviewsTab from './ReviewsTab';
import SettingsTab from './SettingsTab';

type Tab = 'reservations' | 'cabins' | 'activities' | 'reviews' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'reservations', label: 'Reservas' },
  { id: 'cabins', label: 'Cabañas' },
  { id: 'activities', label: 'Actividades' },
  { id: 'reviews', label: 'Reseñas' },
  { id: 'settings', label: 'Ajustes' },
];

const POLL_MS = 60_000;
const canNotify = typeof window !== 'undefined' && 'Notification' in window;

/** Revisa cada minuto si llegaron reservas nuevas y avisa en pantalla y con notificación del navegador. */
function useNewReservationAlerts(onNew: () => void) {
  const toast = useToast();
  const known = useRef<Set<string> | null>(null);

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (document.hidden && known.current) return;
      try {
        const pending = await api.admin.reservations({ status: 'pending' });
        const ids = new Set(pending.map((r) => r.id));
        if (known.current) {
          const fresh = pending.filter((r) => !known.current!.has(r.id));
          for (const r of fresh) {
            const text = `${r.guestName} pidió ${r.cabinName} del ${formatDay(r.checkIn, 'd MMM')} al ${formatDay(r.checkOut, 'd MMM')}.`;
            toast(`Nueva reserva: ${text}`);
            if (canNotify && Notification.permission === 'granted') new Notification('Nueva reserva', { body: text });
          }
          if (fresh.length) onNew();
        }
        if (!stopped) known.current = ids;
      } catch {
        // Silencioso: el siguiente intento lo vuelve a probar.
      }
    };
    check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [onNew, toast]);
}

export default function AdminDashboard() {
  usePageTitle('Administración');
  const { loaded: settingsLoaded } = useSettings();
  const [tab, setTab] = useState<Tab>('reservations');
  const [refreshKey, setRefreshKey] = useState(0);
  const stats = useAsync(() => api.admin.stats(), [refreshKey]);
  const cabins = useAsync(() => api.cabins(), [refreshKey]);
  const [permission, setPermission] = useState(canNotify ? Notification.permission : 'denied');

  const bump = useRef(() => setRefreshKey((k) => k + 1)).current;
  useNewReservationAlerts(bump);

  const s = stats.data;
  const cards = s
    ? [
        { label: 'Pendientes', value: String(s.reservations.pending), accent: s.reservations.pending > 0 },
        { label: 'Confirmadas', value: String(s.reservations.confirmed) },
        { label: 'Ocupación próximos 30 días', value: `${Math.round(s.occupancyNext30Days * 100)}%` },
        { label: 'Ingresos confirmados del mes', value: formatCOP(s.confirmedRevenueThisMonth) },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
        <h1 className="serif text-4xl text-olive">Panel de administración</h1>
        {canNotify && permission !== 'granted' && (
          <button
            onClick={async () => setPermission(await Notification.requestPermission())}
            className="self-start flex items-center gap-2 px-4 py-2 bg-olive/10 text-olive rounded-full text-sm font-medium hover:bg-olive/20"
            title="Recibe un aviso del navegador cuando llegue una reserva mientras el panel está abierto"
          >
            {permission === 'denied' ? <BellOff size={16} /> : <Bell size={16} />}
            {permission === 'denied' ? 'Alertas bloqueadas en el navegador' : 'Activar alertas de reservas'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className={`card p-5 ${c.accent ? 'ring-2 ring-amber-300' : ''}`}>
            <p className="text-xs uppercase tracking-widest text-ink/50 mb-1">{c.label}</p>
            <p className="serif text-3xl text-olive">{c.value}</p>
          </div>
        ))}
      </div>

      {s && s.upcomingCheckIns.length > 0 && (
        <div className="bg-white border border-olive/10 rounded-2xl p-4 mb-8 text-sm">
          <p className="font-bold text-olive mb-2">Llegadas en los próximos 7 días</p>
          <ul className="space-y-1 text-ink/70">
            {s.upcomingCheckIns.map((r) => (
              <li key={r.id}>
                {formatDay(r.checkIn, "EEEE d 'de' MMMM")}: <strong>{r.guestName}</strong> en {r.cabinName} ({r.guests} pers.)
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-olive/10 overflow-x-auto mb-8 w-fit max-w-full" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-olive text-white shadow' : 'text-ink/60 hover:text-olive'}`}
          >
            {t.label}
            {t.id === 'reservations' && s && s.reservations.pending > 0 && (
              <span className="ml-2 bg-amber-400 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{s.reservations.pending}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'reservations' && <ReservationsTab cabins={cabins.data ?? []} refreshKey={refreshKey} onChanged={stats.reload} />}
      {tab === 'cabins' && <CabinsTab onChanged={bump} />}
      {tab === 'activities' && <ActivitiesTab onChanged={stats.reload} />}
      {tab === 'reviews' && <ReviewsTab onChanged={stats.reload} />}
      {tab === 'settings' && (settingsLoaded ? <SettingsTab /> : <PageLoader />)}
    </div>
  );
}
