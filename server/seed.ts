import type { Repository } from './repo/types';

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

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
    imageUrl: img('photo-1587061949409-02df41d5e562'),
    galleryUrls: [img('photo-1510798831971-661eb04b3739'), img('photo-1449158743715-0a90ebb6d2d8')],
  });
  await repo.cabins.create({
    name: 'Cabaña La Miel',
    description: 'Amplia cabaña familiar a pocos pasos del Río La Miel, con terraza y zona de fogata.',
    price: 450000,
    capacity: 5,
    amenities: ['Wifi', 'Cocina', 'Terraza', 'Fogata', 'Aire Acondicionado'],
    imageUrl: img('photo-1542718610-a1d656d1884c'),
    galleryUrls: [],
  });
  await repo.activities.create({
    name: 'Paseo en lancha por el río',
    description: 'Recorrido por las aguas cristalinas del Río La Miel.',
    details: 'Salida en lancha con guía local, parada en playas de río y tiempo para nadar.',
    cost: 60000,
    duration: '3 horas',
    difficulty: 'Fácil',
    imageUrl: img('photo-1544551763-46a013bb70d5'),
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
    imageUrl: img('photo-1432405972618-c60b0225b8f9'),
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
