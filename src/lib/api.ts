import type {
  Activity,
  AdminStats,
  ApiErrorBody,
  Availability,
  Cabin,
  Me,
  Quote,
  Reservation,
  ReservationStatus,
  Review,
  ReviewStatus,
  Settings,
} from '../types';
import { auth } from './firebase';

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') + '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  return user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {};
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { ...(await authHeader()) };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(BASE + path, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, 'network_error', 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data as ApiErrorBody | null;
    throw new ApiError(res.status, err?.error ?? 'http_error', err?.message ?? `Error ${res.status}`, err?.details);
  }
  return data as T;
}

const qs = (params: Record<string, string | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v) as [string, string][];
  return entries.length ? `?${new URLSearchParams(entries)}` : '';
};

export type CabinInput = Omit<Cabin, 'id'>;
export type ActivityInput = Omit<Activity, 'id'>;
export interface ReservationInput {
  cabinId: string;
  guestName: string;
  guests: number;
  email?: string;
  notes?: string;
  checkIn: string;
  checkOut: string;
  whatsappNumber: string;
  website?: string;
}
export interface ReservationCreated {
  reservation: Pick<Reservation, 'id' | 'cabinId' | 'cabinName' | 'checkIn' | 'checkOut' | 'nights' | 'guests' | 'totalPrice' | 'status'>;
  whatsappUrl: string;
}
export interface ReservationFilters {
  status?: ReservationStatus;
  cabinId?: string;
  from?: string;
  to?: string;
}

export const api = {
  settings: () => request<Settings>('GET', '/settings'),
  me: () => request<Me>('GET', '/me'),

  cabins: () => request<Cabin[]>('GET', '/cabins'),
  cabin: (id: string) => request<Cabin>('GET', `/cabins/${encodeURIComponent(id)}`),
  availability: (id: string) => request<Availability>('GET', `/cabins/${encodeURIComponent(id)}/availability`),
  quote: (id: string, checkIn: string, checkOut: string) =>
    request<Quote>('GET', `/cabins/${encodeURIComponent(id)}/quote${qs({ checkIn, checkOut })}`),
  cabinReviews: (id: string) =>
    request<{ reviews: Review[]; summary: { count: number; average: number | null } }>(
      'GET',
      `/cabins/${encodeURIComponent(id)}/reviews`,
    ),
  createReview: (cabinId: string, body: { guestName: string; rating: number; comment: string; website?: string }) =>
    request<Review>('POST', `/cabins/${encodeURIComponent(cabinId)}/reviews`, body),
  featuredReviews: (limit = 3) => request<Review[]>('GET', `/reviews/featured?limit=${limit}`),

  activities: () => request<Activity[]>('GET', '/activities'),

  createReservation: (body: ReservationInput) => request<ReservationCreated>('POST', '/reservations', body),

  admin: {
    stats: () => request<AdminStats>('GET', '/admin/stats'),

    createCabin: (body: CabinInput) => request<Cabin>('POST', '/admin/cabins', body),
    updateCabin: (id: string, body: CabinInput) => request<Cabin>('PUT', `/admin/cabins/${id}`, body),
    deleteCabin: (id: string) => request<void>('DELETE', `/admin/cabins/${id}`),

    createActivity: (body: ActivityInput) => request<Activity>('POST', '/admin/activities', body),
    updateActivity: (id: string, body: ActivityInput) => request<Activity>('PUT', `/admin/activities/${id}`, body),
    deleteActivity: (id: string) => request<void>('DELETE', `/admin/activities/${id}`),

    reservations: (filters: ReservationFilters = {}) =>
      request<Reservation[]>('GET', `/admin/reservations${qs({ ...filters })}`),
    setReservationStatus: (id: string, status: ReservationStatus) =>
      request<Reservation>('PATCH', `/admin/reservations/${id}/status`, { status }),
    deleteReservation: (id: string) => request<void>('DELETE', `/admin/reservations/${id}`),
    /** Descarga el CSV con el token de sesión (un enlace normal no enviaría el header). */
    async downloadReservationsCsv(filters: ReservationFilters = {}) {
      const res = await fetch(`${BASE}/admin/reservations.csv${qs({ ...filters })}`, { headers: await authHeader() });
      if (!res.ok) throw new ApiError(res.status, 'http_error', 'No se pudo exportar el archivo.');
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'reservas.csv';
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      a.click();
      URL.revokeObjectURL(url);
    },

    reviews: () => request<Review[]>('GET', '/admin/reviews'),
    setReviewStatus: (id: string, status: ReviewStatus) => request<Review>('PATCH', `/admin/reviews/${id}`, { status }),
    deleteReview: (id: string) => request<void>('DELETE', `/admin/reviews/${id}`),

    saveSettings: (body: Partial<Settings>) => request<Settings>('PUT', '/admin/settings', body),

    upload: (files: FileList | File[]) => {
      const form = new FormData();
      for (const f of Array.from(files)) form.append('files', f);
      return request<{ urls: string[] }>('POST', '/admin/uploads', form);
    },
  },
};
