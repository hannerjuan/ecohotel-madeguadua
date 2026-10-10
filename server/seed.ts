import type { Repository } from './repo/types';
import { STOCK, stockUrl } from '../shared/images';

const img = (id: string) => stockUrl(id);

/** Datos de ejemplo para el modo en memoria (desarrollo local sin Firebase). */
export async function seedDemoData(repo: Repository): Promise<void> {
  if ((await repo.cabins.list()).length > 0) return;

  const guadua = await repo.cabins.create({
    name: 'Cabaña Guadua',
    description:
      'Cabaña construida en guadua con balcón hacia el bosque. Ideal para parejas que buscan silencio y naturaleza.',
    price: 280000,
    capacity: 2,
    amenities: ['Wifi', 'Café', 'Baño privado', 'Hamaca', 'Vista al río'],
    imageUrl: img(STOCK.cabins[0]),
    galleryUrls: [img(STOCK.cabins[1]), img(STOCK.cabins[3])],
  });
  await repo.cabins.create({
    name: 'Cabaña La Miel',
    description: 'Amplia cabaña familiar a pocos pasos del Río La Miel, con terraza y zona de fogata.',
    price: 450000,
    capacity: 5,
    amenities: ['Wifi', 'Cocina', 'Terraza', 'Fogata', 'Aire Acondicionado'],
    imageUrl: img(STOCK.cabins[2]),
    galleryUrls: [],
  });
  await repo.activities.create({
    name: 'Paseo en lancha por el río',
    description: 'Recorrido por las aguas cristalinas del Río La Miel.',
    details: 'Salida en lancha con guía local, parada en playas de río y tiempo para nadar.',
    cost: 60000,
    duration: '3 horas',
    difficulty: 'Fácil',
    imageUrl: img(STOCK.hero[1]),
    galleryUrls: [],
    includes: ['Guía local', 'Chaleco salvavidas', 'Hidratación'],
  });
  await repo.activities.create({
    name: 'Caminata a las cascadas',
    description: 'Sendero entre bosque tropical hasta las cascadas.',
    details: 'Caminata guiada de dificultad media con avistamiento de aves.',
    cost: 0,
    duration: '4 horas',
    difficulty: 'Moderada',
    imageUrl: img(STOCK.activities[0]),
    galleryUrls: [],
    includes: ['Guía', 'Refrigerio'],
  });
  await repo.reviews.create({
    cabinId: guadua.id,
    cabinName: guadua.name,
    guestName: 'Camila R.',
    rating: 5,
    comment: 'Despertar con el sonido de los pájaros y tener el río ahí mismo fue una experiencia de otro nivel.',
    status: 'published',
    createdAt: new Date().toISOString(),
  });
}
