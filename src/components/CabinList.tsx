import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Cabin } from '../types';
import { Link } from 'react-router-dom';
import { Users, Wifi, Coffee, Wind, Mountain, Check } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

const amenityIcons: Record<string, React.ReactNode> = {
  'Wifi': <Wifi size={14} />,
  'Café': <Coffee size={14} />,
  'Aire Acondicionado': <Wind size={14} />,
  'Vista a la Montaña': <Mountain size={14} />,
};

export default function CabinList() {
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'cabins'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cabinData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cabin[];
      setCabins(cabinData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12 text-center">
        <Badge variant="subtle" className="mb-4 tracking-[0.2em] uppercase mx-auto">Alojamiento</Badge>
        <h1 className="serif text-5xl md:text-6xl text-olive mb-4">Nuestras Cabañas</h1>
        <p className="text-ink/60 max-w-2xl mx-auto text-lg">
          Descubre el espacio perfecto para tu descanso. Cada cabaña está diseñada para ofrecerte una conexión única con el entorno.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {cabins.map((cabin) => (
          <Link key={cabin.id} to={`/cabin/${cabin.id}`} className="group">
            <Card className="overflow-hidden h-full flex flex-col transition-transform duration-300 hover:-translate-y-2">
              <div className="relative h-64 overflow-hidden">
                <img
                  src={cabin.imageUrl || `https://picsum.photos/seed/${cabin.id}/800/600`}
                  alt={cabin.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <Badge variant="light" className="absolute top-4 right-4 text-sm font-semibold">
                  ${cabin.price.toLocaleString()} / noche
                </Badge>
              </div>

              <div className="p-8 flex-grow flex flex-col">
                <h3 className="serif text-2xl mb-2 text-olive">{cabin.name}</h3>
                <p className="text-ink/60 text-sm line-clamp-2 mb-6 flex-grow">
                  {cabin.description}
                </p>

                <div className="flex flex-col gap-4 mt-auto">
                  <div className="flex items-center gap-1 text-ink/70 text-sm">
                    <Users size={16} />
                    <span>Hasta {cabin.capacity} personas</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cabin.amenities?.slice(0, 3).map((amenity, idx) => (
                      <Badge key={idx} variant="subtle" title={amenity}>
                        {amenityIcons[amenity] || <Check size={14} />}
                        <span>{amenity}</span>
                      </Badge>
                    ))}
                    {cabin.amenities && cabin.amenities.length > 3 && (
                      <Badge variant="subtle">
                        +{cabin.amenities.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {cabins.length === 0 && (
        <div className="text-center py-20">
          <p className="serif text-2xl text-ink/40">No hay cabañas disponibles en este momento.</p>
        </div>
      )}
    </div>
  );
}
