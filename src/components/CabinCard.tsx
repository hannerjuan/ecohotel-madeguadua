import { Check, Coffee, Mountain, Users, Wifi, Wind } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatCOP, stockImage } from '../lib/format';
import type { Cabin } from '../types';

export const amenityIcons: Record<string, ReactNode> = {
  Wifi: <Wifi size={14} />,
  Café: <Coffee size={14} />,
  'Aire Acondicionado': <Wind size={14} />,
  'Vista a la Montaña': <Mountain size={14} />,
};

export const amenityIcon = (name: string) => amenityIcons[name] ?? <Check size={14} />;

export default function CabinCard({ cabin }: { cabin: Cabin }) {
  return (
    <Link to={`/cabin/${cabin.id}`} className="group block h-full">
      <article className="card overflow-hidden h-full flex flex-col transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl">
        <div className="relative h-64 overflow-hidden">
          <img
            src={cabin.imageUrl || stockImage('cabins', cabin.id, 800)}
            alt={cabin.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-semibold text-olive">
            {formatCOP(cabin.price)} / noche
          </div>
        </div>
        <div className="p-7 flex-grow flex flex-col">
          <h3 className="serif text-2xl mb-2 text-olive">{cabin.name}</h3>
          <p className="text-ink/60 text-sm line-clamp-2 mb-6 flex-grow">{cabin.description}</p>
          <div className="flex items-center gap-1 text-ink/70 text-sm mb-3">
            <Users size={16} /> Hasta {cabin.capacity} personas
          </div>
          {cabin.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {cabin.amenities.slice(0, 3).map((a) => (
                <span key={a} className="flex items-center gap-1 text-xs text-olive/80 bg-olive/5 px-2 py-1 rounded-md">
                  {amenityIcon(a)} {a}
                </span>
              ))}
              {cabin.amenities.length > 3 && (
                <span className="text-xs text-olive/80 bg-olive/5 px-2 py-1 rounded-md">+{cabin.amenities.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
