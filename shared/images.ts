// Fotos libres de Unsplash (https://unsplash.com/license) para usar mientras el hotel
// no suba fotos propias. Se pueden reemplazar desde el panel de administración.

const unsplash = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const STOCK = {
  hero: [
    'photo-1441974231531-c6227db76b6e', // bosque iluminado
    'photo-1433086966358-54859d0ed716', // cascada en el bosque
    'photo-1470071459604-3b5ec3a7fe05', // montañas con niebla
    'photo-1447752875215-b2761acb3c5d', // sendero en el bosque
  ],
  cabins: [
    'photo-1449158743715-0a90ebb6d2d8', // cabaña en el bosque
    'photo-1510798831971-661eb04b3739', // cabaña de madera
    'photo-1542718610-a1d656d1884c', // cabaña entre árboles
    'photo-1518780664697-55e3ad937233', // casa de campo
  ],
  activities: [
    'photo-1432405972618-c60b0225b8f9', // cascada
    'photo-1504280390367-361c6d9f38f4', // campamento
    'photo-1500530855697-b586d89ba3ee', // paisaje de montaña
    'photo-1426604966848-d7adac402bff', // naturaleza
  ],
  food: ['photo-1414235077428-338989a2e8c0', 'photo-1497935586351-b67a49e012bf'],
} as const;

export type StockKind = keyof typeof STOCK;

export const stockUrl = (id: string, w = 1200) => unsplash(id, w);

export const heroImages = () => STOCK.hero.map((id) => unsplash(id, 1920));

/** Foto estable para un elemento sin imagen: la misma semilla siempre da la misma foto. */
export function stockImage(kind: StockKind, seed: string, w = 1200): string {
  const pool = STOCK[kind];
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return unsplash(pool[hash % pool.length], w);
}

/** Imagen local que se muestra si una foto externa no carga. */
export const IMAGE_PLACEHOLDER = '/placeholder.svg';
