import { ChevronLeft, Grid, Star, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';
import { api, ApiError } from '../lib/api';
import { formatCOP, stockImage } from '../lib/format';
import BookingForm from './cabin/BookingForm';
import ReviewsSection from './cabin/ReviewsSection';
import { amenityIcon } from './CabinCard';
import { ErrorState, Lightbox, PageLoader } from './ui';

export default function CabinDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const cabin = useAsync(() => api.cabin(id), [id]);
  const reviews = useAsync(() => api.cabinReviews(id), [id]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  usePageTitle(cabin.data?.name);

  if (cabin.loading) return <PageLoader />;
  if (cabin.error) {
    if (cabin.error instanceof ApiError && cabin.error.status === 404) {
      return (
        <div className="text-center py-24 px-6">
          <h1 className="serif text-3xl text-olive mb-6">Cabaña no encontrada</h1>
          <Link to="/cabins" className="olive-button">Ver todas las cabañas</Link>
        </div>
      );
    }
    return <ErrorState error={cabin.error} onRetry={cabin.reload} />;
  }

  const c = cabin.data!;
  const images = [c.imageUrl || stockImage('cabins', c.id, 1600), ...c.galleryUrls];
  const average = reviews.data?.summary.average ?? null;

  const Tile = ({ i, className }: { i: number; className: string }) => (
    <button type="button" className={`relative group overflow-hidden ${className}`} onClick={() => setLightboxIndex(i)} aria-label={`Ver foto ${i + 1} de ${c.name}`}>
      <img src={images[i]} alt={c.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
      <span className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/cabins" className="inline-flex items-center gap-2 text-olive hover:underline mb-8 font-medium">
        <ChevronLeft size={20} /> Todas las cabañas
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        <div>
          {images.length >= 3 ? (
            <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[420px] md:h-[500px] mb-8 rounded-[32px] overflow-hidden shadow-2xl">
              <Tile i={0} className="col-span-2 row-span-2" />
              <Tile i={1} className="col-span-2 row-span-1" />
              <Tile i={2} className={images.length > 3 ? 'col-span-1 row-span-1' : 'col-span-2 row-span-1'} />
              {images.length > 3 && (
                <button type="button" className="relative col-span-1 row-span-1 group overflow-hidden" onClick={() => setLightboxIndex(3)}>
                  <img src={images[3]} alt={c.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <span className="absolute inset-0 bg-black/45 group-hover:bg-black/55 flex flex-col items-center justify-center text-white text-sm font-medium">
                    <Grid size={22} className="mb-1" /> Ver {images.length} fotos
                  </span>
                </button>
              )}
            </div>
          ) : (
            <button type="button" className="block w-full rounded-[32px] overflow-hidden shadow-2xl mb-8 group" onClick={() => setLightboxIndex(0)}>
              <img src={images[0]} alt={c.name} className="w-full h-[420px] md:h-[500px] object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
            </button>
          )}

          <div className="flex flex-wrap items-end gap-4 mb-6">
            <h1 className="serif text-5xl text-olive">{c.name}</h1>
            {average !== null && (
              <a href="#reviews-title" className="flex items-center gap-2 bg-olive/10 px-4 py-2 rounded-2xl mb-1">
                <Star className="fill-olive text-olive" size={20} />
                <span className="text-xl font-bold text-olive leading-none">{average.toFixed(1)}</span>
                <span className="text-sm text-ink/60">({reviews.data!.summary.count})</span>
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-8">
            <span className="bg-olive/10 text-olive px-4 py-2 rounded-full flex items-center gap-2 font-semibold">
              <Users size={20} /> Hasta {c.capacity} personas
            </span>
            <span className="text-2xl font-bold text-olive">
              {formatCOP(c.price)} <span className="text-sm font-normal text-ink/50">/ noche</span>
            </span>
          </div>

          <h2 className="serif text-2xl mb-3">Descripción</h2>
          <p className="text-ink/70 leading-relaxed whitespace-pre-line mb-10">{c.description}</p>

          {c.amenities.length > 0 && (
            <>
              <h2 className="serif text-2xl mb-4">Comodidades</h2>
              <ul className="flex flex-wrap gap-3">
                {c.amenities.map((a) => (
                  <li key={a} className="bg-white border border-olive/10 px-4 py-2 rounded-2xl text-sm text-ink/70 flex items-center gap-2 shadow-sm">
                    <span className="text-olive">{amenityIcon(a)}</span> {a}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <aside className="lg:sticky lg:top-28 h-fit">
          <div className="card p-7 md:p-10">
            <BookingForm cabin={c} />
          </div>
        </aside>
      </div>

      <ReviewsSection cabinId={c.id} reviews={reviews.data?.reviews ?? []} average={average} onCreated={reviews.reload} />

      {lightboxIndex !== null && (
        <Lightbox images={images} index={lightboxIndex} alt={c.name} onIndexChange={setLightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}
