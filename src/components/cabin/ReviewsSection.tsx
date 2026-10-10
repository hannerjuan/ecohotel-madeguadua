import { Star } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { formatDay } from '../../lib/format';
import type { Review } from '../../types';
import { Stars } from '../ui';

interface Props {
  cabinId: string;
  reviews: Review[];
  average: number | null;
  onCreated: () => void;
}

export default function ReviewsSection({ cabinId, reviews, average, onCreated }: Props) {
  const toast = useToast();
  const [form, setForm] = useState({ guestName: '', comment: '', rating: 5, website: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createReview(cabinId, form);
      setForm({ guestName: '', comment: '', rating: 5, website: '' });
      toast('¡Gracias por tu reseña!');
      onCreated();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-20 pt-16 border-t border-olive/10 max-w-3xl" aria-labelledby="reviews-title">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h2 id="reviews-title" className="serif text-4xl text-olive">Reseñas de huéspedes</h2>
        {average !== null && (
          <div className="flex items-center gap-2">
            <Star className="fill-olive text-olive" size={28} />
            <span className="text-3xl font-bold text-olive leading-none">{average.toFixed(1)}</span>
            <span className="text-ink/60 font-medium">/ 5 · {reviews.length}</span>
          </div>
        )}
      </div>

      <div className="space-y-6 mb-12">
        {reviews.length === 0 ? (
          <p className="text-ink/60 italic text-center py-8">Aún no hay reseñas para esta cabaña. ¡Sé el primero en dejar una!</p>
        ) : (
          reviews.map((review) => (
            <article key={review.id} className="bg-white p-7 rounded-[28px] shadow-sm border border-olive/5">
              <div className="flex justify-between items-start mb-3 gap-4">
                <div>
                  <h3 className="font-bold text-lg text-olive">{review.guestName}</h3>
                  <p className="text-xs text-ink/40 uppercase tracking-widest">{formatDay(review.createdAt, 'MMMM yyyy')}</p>
                </div>
                <Stars value={review.rating} />
              </div>
              <p className="text-ink/70 leading-relaxed whitespace-pre-line">{review.comment}</p>
            </article>
          ))
        )}
      </div>

      <form onSubmit={submit} className="bg-white/60 p-8 rounded-[32px] border border-olive/10">
        <h3 className="serif text-2xl text-olive mb-6">Deja tu reseña</h3>
        <div className="space-y-5">
          <fieldset className="flex gap-4 items-center">
            <legend className="sr-only">Calificación</legend>
            <span className="text-sm font-medium text-ink/60 uppercase tracking-widest">Calificación</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, rating: n })}
                  className="p-1 transition-transform hover:scale-110"
                  aria-label={`${n} estrellas`}
                  aria-pressed={form.rating === n}
                >
                  <Star size={28} className={n <= form.rating ? 'fill-olive text-olive' : 'text-olive/20'} />
                </button>
              ))}
            </div>
          </fieldset>
          <input
            required
            maxLength={100}
            placeholder="Tu nombre"
            aria-label="Tu nombre"
            className="w-full md:w-1/2 bg-white border border-olive/10 rounded-2xl p-4 focus:ring-2 focus:ring-olive/20 outline-none"
            value={form.guestName}
            onChange={(e) => setForm({ ...form, guestName: e.target.value })}
          />
          <textarea
            required
            maxLength={2000}
            rows={4}
            placeholder="¿Cómo fue tu experiencia en la cabaña?"
            aria-label="Tu comentario"
            className="w-full bg-white border border-olive/10 rounded-2xl p-4 focus:ring-2 focus:ring-olive/20 outline-none resize-none"
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
          />
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
          <button type="submit" disabled={submitting} className="olive-button px-8 py-4 disabled:opacity-50">
            {submitting ? 'Enviando…' : 'Publicar reseña'}
          </button>
        </div>
      </form>
    </section>
  );
}
