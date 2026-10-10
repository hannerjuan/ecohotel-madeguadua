// Tipos compartidos entre el frontend (src/) y el backend (server/).
// Las fechas de estadía son strings 'yyyy-MM-dd'; las marcas de tiempo son ISO 8601.

export type Difficulty = 'Fácil' | 'Moderada' | 'Difícil';
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled';
export type ReviewStatus = 'published' | 'hidden';

export interface Cabin {
  id: string;
  name: string;
  description: string;
  price: number;
  amenities: string[];
  imageUrl: string;
  galleryUrls: string[];
  capacity: number;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  details: string;
  cost: number;
  duration: string;
  difficulty: Difficulty;
  imageUrl: string;
  galleryUrls: string[];
  includes: string[];
}

export interface Reservation {
  id: string;
  cabinId: string;
  cabinName: string;
  guestName: string;
  guests: number;
  email?: string;
  notes?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  whatsappNumber: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface Review {
  id: string;
  cabinId: string;
  cabinName?: string;
  guestName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
}

export interface Settings {
  hotelName: string;
  whatsappNumber: string;
  email: string;
  address: string;
  howToGetThere: string;
  mapLat: number;
  mapLng: number;
  heroImages: string[];
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
  houseRules: string;
}

/** Rango de fechas ocupado de una cabaña. No incluye datos del huésped. */
export interface BookedRange {
  checkIn: string;
  checkOut: string;
}

export interface Availability {
  cabinId: string;
  booked: BookedRange[];
}

export interface Quote {
  cabinId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  pricePerNight: number;
  totalPrice: number;
  available: boolean;
}

export interface Me {
  uid: string;
  email: string | null;
  name: string | null;
  isAdmin: boolean;
}

export interface AdminStats {
  cabins: number;
  activities: number;
  reviews: number;
  reservations: Record<ReservationStatus, number>;
  upcomingCheckIns: Reservation[];
  /** Ocupación de los próximos 30 días (0..1) sobre todas las cabañas. */
  occupancyNext30Days: number;
  /** Suma de totalPrice de reservas confirmadas con check-in en el mes actual. */
  confirmedRevenueThisMonth: number;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  details?: unknown;
}
