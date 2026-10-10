import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { formatDay } from '../../lib/format';
import type { Review } from '../../types';
import { ErrorState, PageLoader, Stars } from '../ui';
import { ConfirmDelete } from './common';

export default function ReviewsTab({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync(() => api.admin.reviews(), []);
  const [toDelete, setToDelete] = useState<Review | null>(null);

  const toggle = async (r: Review) => {
    try {
      const updated = await api.admin.setReviewStatus(r.id, r.status === 'published' ? 'hidden' : 'published');
      setData((list) => (list ?? []).map((x) => (x.id === r.id ? updated : x)));
      toast(updated.status === 'hidden' ? 'Reseña ocultada.' : 'Reseña publicada.');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <p className="text-sm text-ink/60 mb-6">
        Las reseñas se publican al instante. Oculta las que no quieras mostrar o elimina el spam.
      </p>
      <div className="space-y-3">
        {data?.map((r) => (
          <article key={r.id} className={`card p-5 ${r.status === 'hidden' ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-start gap-4 mb-2">
              <div>
                <h3 className="font-bold text-olive">
                  {r.guestName} <span className="font-normal text-ink/50">· {r.cabinName ?? 'Cabaña'}</span>
                </h3>
                <p className="text-xs text-ink/40">{formatDay(r.createdAt, "d 'de' MMMM yyyy")}</p>
              </div>
              <div className="flex items-center gap-3">
                <Stars value={r.rating} size={14} />
                <button
                  onClick={() => toggle(r)}
                  className="p-2 rounded-lg text-ink/60 hover:bg-cream"
                  aria-label={r.status === 'published' ? 'Ocultar reseña' : 'Publicar reseña'}
                  title={r.status === 'published' ? 'Ocultar' : 'Publicar'}
                >
                  {r.status === 'published' ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button onClick={() => setToDelete(r)} className="p-2 rounded-lg text-red-600 hover:bg-red-50" aria-label="Eliminar reseña">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <p className="text-sm text-ink/70 whitespace-pre-line">{r.comment}</p>
            {r.status === 'hidden' && <p className="text-xs font-bold uppercase tracking-widest text-ink/50 mt-2">Oculta</p>}
          </article>
        ))}
        {data?.length === 0 && <p className="text-center text-ink/50 py-10">Aún no hay reseñas.</p>}
      </div>

      {toDelete && (
        <ConfirmDelete
          what="esta reseña"
          onCancel={() => setToDelete(null)}
          onConfirm={async () => {
            try {
              await api.admin.deleteReview(toDelete.id);
              setData((list) => (list ?? []).filter((x) => x.id !== toDelete.id));
              toast('Reseña eliminada.');
              onChanged();
            } catch (err) {
              toast((err as Error).message, 'error');
            }
            setToDelete(null);
          }}
        />
      )}
    </>
  );
}
