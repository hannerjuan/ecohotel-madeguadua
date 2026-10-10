import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { Settings } from '../types';

// Valores mínimos mientras carga /api/settings o si el servidor no responde.
const FALLBACK: Settings = {
  hotelName: 'EcoHotel Madeguadua',
  whatsappNumber: '573044527620',
  email: '',
  address: 'Norcasia, Caldas',
  howToGetThere: '',
  mapLat: 5.5786,
  mapLng: -74.8943,
  heroImages: [],
  checkInTime: '',
  checkOutTime: '',
  cancellationPolicy: '',
  houseRules: '',
};

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  setSettings: (s: Settings) => void;
}

const SettingsContext = createContext<SettingsState>({ settings: FALLBACK, loaded: false, setSettings: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(FALLBACK);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .settings()
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return <SettingsContext.Provider value={{ settings, loaded, setSettings }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
