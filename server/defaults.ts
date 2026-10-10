import type { Settings } from '../shared/types';

// Valores iniciales. El administrador los cambia desde el panel (pestaña Ajustes);
// los textos de políticas son un borrador que el hotel debe revisar.
export const DEFAULT_SETTINGS: Settings = {
  hotelName: 'EcoHotel Madeguadua',
  whatsappNumber: '573044527620',
  email: 'ecohotelmadeguadua@gmail.com',
  address: 'Vereda La Miel, Norcasia, Caldas',
  howToGetThere: 'A unas 5 horas de Bogotá o Medellín por carretera.',
  mapLat: 5.5786,
  mapLng: -74.8943,
  heroImages: [
    'https://images.unsplash.com/photo-1541410965313-d53b3c16ef17?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1544253915-0810168cb729?auto=format&fit=crop&w=1920&q=80',
  ],
  checkInTime: '3:00 p. m.',
  checkOutTime: '12:00 m.',
  cancellationPolicy: [
    'Las reservas quedan confirmadas cuando el hotel lo indica por WhatsApp.',
    'Cancelaciones con más de 7 días de anticipación: sin penalidad.',
    'Cancelaciones con menos de 7 días de anticipación: se puede reprogramar la fecha según disponibilidad.',
    'Si no llegas y no avisas, la reserva se pierde.',
  ].join('\n'),
  houseRules: [
    'Respeta la quietud del bosque: silencio a partir de las 10:00 p. m.',
    'No se permite dejar basura en senderos ni en el río.',
    'Las mascotas deben anunciarse al hacer la reserva.',
    'Nos reservamos el derecho de admisión para mantener un ambiente familiar y tranquilo.',
  ].join('\n'),
};

export function withDefaults(stored: Partial<Settings> | null): Settings {
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}
