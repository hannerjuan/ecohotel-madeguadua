/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del backend si se aloja en otro dominio. Vacío = mismo origen (/api). */
  readonly VITE_API_URL?: string;
}
