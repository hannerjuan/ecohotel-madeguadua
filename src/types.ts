export interface Cabin {
  id: string;
  name: string;
  description: string;
  price: number;
  amenities: string[];
  imageUrl: string;
  galleryUrls?: string[];
  capacity: number;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  details: string;
  cost: number;
  duration: string;
  difficulty: 'Fácil' | 'Moderada' | 'Difícil';
  imageUrl: string;
  galleryUrls?: string[];
  includes: string[];
}

export interface Reservation {
  id: string;
  cabinId: string;
  cabinName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  whatsappNumber: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: any;
}

export interface Review {
  id: string;
  cabinId: string;
  guestName: string;
  rating: number;
  comment: string;
  createdAt: any;
}
