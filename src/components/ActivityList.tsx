import { BarChart, CheckCircle2, Clock, Image as ImageIcon, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';
import { api } from '../lib/api';
import { fallbackImage, formatCOP, whatsappLink } from '../lib/format';
import type { Activity } from '../types';
import { EmptyState, ErrorState, Lightbox, PageLoader } from './ui';

export default function ActivityList() {
  usePageTitle('Actividades');
  const { settings } = useSettings();
  const { data: activities, error, loading, reload } = useAsync(() => api.activities(), []);
  const [gallery, setGallery] = useState<{ activity: Activity; index: number } | null>(null);

  const imagesOf = (a: Activity) => [a.imageUrl || fallbackImage(a.id), ...a.galleryUrls];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-12 text-center">
        <h1 className="serif text-5xl md:text-6xl text-olive mb-4">Actividades y aventuras</h1>
        <p className="text-ink/60 max-w-2xl mx-auto text-lg">
          Explora la naturaleza y vive experiencias inolvidables en el Río La Miel y sus alrededores.
        </p>
      </header>

      {loading && <PageLoader />}
      {error && <ErrorState error={error} onRetry={reload} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {activities?.map((activity) => (
          <article key={activity.id} className="card overflow-hidden h-full flex flex-col">
            <button
              type="button"
              className="relative h-64 overflow-hidden group text-left"
              onClick={() => setGallery({ activity, index: 0 })}
              aria-label={`Ver fotos de ${activity.name}`}
            >
              <img
                src={activity.imageUrl || fallbackImage(activity.id)}
                alt={activity.name}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              {activity.galleryUrls.length > 0 && (
                <span className="absolute bottom-4 right-4 bg-black/50 backdrop-blur text-white px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
                  <ImageIcon size={16} /> +{activity.galleryUrls.length}
                </span>
              )}
              <span
                className={`absolute top-4 right-4 backdrop-blur px-3 py-1 rounded-full text-sm font-semibold ${
                  activity.cost > 0 ? 'bg-white/90 text-olive' : 'bg-olive/90 text-white'
                }`}
              >
                {activity.cost > 0 ? `+ ${formatCOP(activity.cost)}` : 'Incluido'}
              </span>
            </button>

            <div className="p-7 flex-grow flex flex-col">
              <h2 className="serif text-2xl mb-2 text-olive">{activity.name}</h2>
              <p className="text-ink/60 text-sm mb-6 flex-grow whitespace-pre-line">{activity.details || activity.description}</p>

              <div className="space-y-4 mt-auto">
                <div className="flex items-center justify-between text-sm text-ink/70 bg-cream p-3 rounded-xl">
                  {activity.duration && (
                    <span className="flex items-center gap-2">
                      <Clock size={16} className="text-olive" /> {activity.duration}
                    </span>
                  )}
                  <span className="flex items-center gap-2">
                    <BarChart size={16} className="text-olive" /> {activity.difficulty}
                  </span>
                </div>

                {activity.includes.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-olive mb-2">Incluye</h3>
                    <ul className="space-y-1">
                      {activity.includes.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-ink/60">
                          <CheckCircle2 size={14} className="text-olive mt-0.5 shrink-0" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <a
                  href={whatsappLink(settings.whatsappNumber, `¡Hola! Me interesa la actividad "${activity.name}". ¿Qué disponibilidad tienen?`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full border border-olive/30 text-olive rounded-full py-3 font-medium hover:bg-olive hover:text-white transition-colors"
                >
                  <MessageCircle size={18} /> Preguntar por WhatsApp
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      {activities?.length === 0 && <EmptyState>No hay actividades disponibles en este momento.</EmptyState>}

      {gallery && (
        <Lightbox
          images={imagesOf(gallery.activity)}
          index={gallery.index}
          alt={gallery.activity.name}
          onIndexChange={(index) => setGallery({ ...gallery, index })}
          onClose={() => setGallery(null)}
        />
      )}
    </div>
  );
}
