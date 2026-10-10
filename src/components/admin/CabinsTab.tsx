import { Edit2, ExternalLink, Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { api, type CabinInput } from '../../lib/api';
import { fallbackImage, formatCOP } from '../../lib/format';
import type { Cabin } from '../../types';
import { ErrorState, PageLoader } from '../ui';
import { ConfirmDelete, Field, ImagesField, inputClass, TagsInput } from './common';

const EMPTY: CabinInput = { name: '', description: '', price: 0, capacity: 2, amenities: [], imageUrl: '', galleryUrls: [] };

export default function CabinsTab({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const { data: cabins, error, loading, reload } = useAsync(() => api.cabins(), []);
  const [editing, setEditing] = useState<{ id: string | null; data: CabinInput } | null>(null);
  const [toDelete, setToDelete] = useState<Cabin | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) await api.admin.updateCabin(editing.id, editing.data);
      else await api.admin.createCabin(editing.data);
      toast(editing.id ? 'Cabaña actualizada.' : 'Cabaña creada.');
      setEditing(null);
      reload();
      onChanged();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !cabins) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const set = (patch: Partial<CabinInput>) => setEditing((e) => e && { ...e, data: { ...e.data, ...patch } });

  return (
    <>
      {!editing && (
        <div className="flex justify-end mb-6">
          <button onClick={() => setEditing({ id: null, data: EMPTY })} className="olive-button flex items-center gap-2">
            <Plus size={20} /> Nueva cabaña
          </button>
        </div>
      )}

      {editing && (
        <form key={editing.id ?? "new"} onSubmit={save} className="card p-6 md:p-8 mb-10 border-2 border-olive/20">
          <div className="flex justify-between items-center mb-6">
            <h2 className="serif text-2xl text-olive">{editing.id ? 'Editar cabaña' : 'Nueva cabaña'}</h2>
            <button type="button" onClick={() => setEditing(null)} className="text-ink/40 hover:text-ink" aria-label="Cerrar">
              <X size={24} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Field label="Nombre">
                <input required maxLength={100} className={inputClass} value={editing.data.name} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Precio por noche (COP)">
                  <input required type="number" min={1} step={1000} className={inputClass} value={editing.data.price || ''} onChange={(e) => set({ price: Number(e.target.value) })} />
                </Field>
                <Field label="Capacidad">
                  <input required type="number" min={1} max={50} className={inputClass} value={editing.data.capacity} onChange={(e) => set({ capacity: Number(e.target.value) })} />
                </Field>
              </div>
              <Field label="Descripción">
                <textarea required rows={6} maxLength={4000} className={`${inputClass} resize-y`} value={editing.data.description} onChange={(e) => set({ description: e.target.value })} />
              </Field>
              <Field label="Comodidades" hint="Separadas por comas. Ej: Wifi, Café, Vista a la Montaña">
                <TagsInput value={editing.data.amenities} onChange={(amenities) => set({ amenities })} placeholder="Wifi, Café, Hamaca" />
              </Field>
            </div>
            <ImagesField
              main={editing.data.imageUrl}
              gallery={editing.data.galleryUrls}
              onChange={({ main, gallery }) => set({ imageUrl: main, galleryUrls: gallery })}
            />
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <button type="button" onClick={() => setEditing(null)} className="px-6 py-3 rounded-full text-ink/60 hover:bg-cream">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="olive-button flex items-center gap-2 disabled:opacity-50">
              <Save size={18} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-3">
        {cabins?.map((cabin) => (
          <div key={cabin.id} className="card p-4 flex items-center gap-4">
            <img src={cabin.imageUrl || fallbackImage(cabin.id, 100, 100)} alt="" className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
            <div className="flex-grow min-w-0">
              <h3 className="serif text-lg text-olive truncate">{cabin.name}</h3>
              <p className="text-xs text-ink/50">
                {formatCOP(cabin.price)} · {cabin.capacity} pers. · {cabin.galleryUrls.length + (cabin.imageUrl ? 1 : 0)} fotos
              </p>
            </div>
            <div className="flex gap-1">
              <Link to={`/cabin/${cabin.id}`} target="_blank" className="p-2 text-ink/50 hover:bg-cream rounded-lg" aria-label="Ver en la web">
                <ExternalLink size={18} />
              </Link>
              <button
                onClick={() => {
                  const { id, ...data } = cabin;
                  setEditing({ id, data });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                aria-label={`Editar ${cabin.name}`}
              >
                <Edit2 size={18} />
              </button>
              <button onClick={() => setToDelete(cabin)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" aria-label={`Eliminar ${cabin.name}`}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {cabins?.length === 0 && <p className="text-center text-ink/50 py-10">Aún no hay cabañas. Crea la primera.</p>}
      </div>

      {toDelete && (
        <ConfirmDelete
          what={`la cabaña "${toDelete.name}"`}
          onCancel={() => setToDelete(null)}
          onConfirm={async () => {
            try {
              await api.admin.deleteCabin(toDelete.id);
              toast('Cabaña eliminada.');
              reload();
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
