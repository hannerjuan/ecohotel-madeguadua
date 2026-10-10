import { BarChart, Clock, Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { api, type ActivityInput } from '../../lib/api';
import { formatCOP, stockImage } from '../../lib/format';
import type { Activity, Difficulty } from '../../types';
import { ErrorState, PageLoader } from '../ui';
import { ConfirmDelete, Field, ImagesField, inputClass, TagsInput } from './common';

const EMPTY: ActivityInput = {
  name: '',
  description: '',
  details: '',
  cost: 0,
  duration: '',
  difficulty: 'Fácil',
  imageUrl: '',
  galleryUrls: [],
  includes: [],
};

export default function ActivitiesTab({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const { data: activities, error, loading, reload } = useAsync(() => api.activities(), []);
  const [editing, setEditing] = useState<{ id: string | null; data: ActivityInput } | null>(null);
  const [toDelete, setToDelete] = useState<Activity | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) await api.admin.updateActivity(editing.id, editing.data);
      else await api.admin.createActivity(editing.data);
      toast(editing.id ? 'Actividad actualizada.' : 'Actividad creada.');
      setEditing(null);
      reload();
      onChanged();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !activities) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const set = (patch: Partial<ActivityInput>) => setEditing((e) => e && { ...e, data: { ...e.data, ...patch } });

  return (
    <>
      {!editing && (
        <div className="flex justify-end mb-6">
          <button onClick={() => setEditing({ id: null, data: EMPTY })} className="olive-button flex items-center gap-2">
            <Plus size={20} /> Nueva actividad
          </button>
        </div>
      )}

      {editing && (
        <form key={editing.id ?? "new"} onSubmit={save} className="card p-6 md:p-8 mb-10 border-2 border-olive/20">
          <div className="flex justify-between items-center mb-6">
            <h2 className="serif text-2xl text-olive">{editing.id ? 'Editar actividad' : 'Nueva actividad'}</h2>
            <button type="button" onClick={() => setEditing(null)} className="text-ink/40 hover:text-ink" aria-label="Cerrar">
              <X size={24} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Field label="Nombre">
                <input required maxLength={100} placeholder="Ej: Paseo en lancha" className={inputClass} value={editing.data.name} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <Field label="Descripción corta">
                <input required maxLength={500} className={inputClass} value={editing.data.description} onChange={(e) => set({ description: e.target.value })} />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Costo (COP)" hint="0 = incluido">
                  <input type="number" min={0} step={1000} className={inputClass} value={editing.data.cost} onChange={(e) => set({ cost: Number(e.target.value) })} />
                </Field>
                <Field label="Duración">
                  <input maxLength={60} placeholder="3 horas" className={inputClass} value={editing.data.duration} onChange={(e) => set({ duration: e.target.value })} />
                </Field>
                <Field label="Dificultad">
                  <select className={inputClass} value={editing.data.difficulty} onChange={(e) => set({ difficulty: e.target.value as Difficulty })}>
                    <option>Fácil</option>
                    <option>Moderada</option>
                    <option>Difícil</option>
                  </select>
                </Field>
              </div>
              <Field label="Detalles">
                <textarea rows={5} maxLength={4000} className={`${inputClass} resize-y`} value={editing.data.details} onChange={(e) => set({ details: e.target.value })} />
              </Field>
              <Field label="Incluye" hint="Separado por comas">
                <TagsInput value={editing.data.includes} onChange={(includes) => set({ includes })} placeholder="Guía, Chaleco salvavidas" />
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
        {activities?.map((activity) => (
          <div key={activity.id} className="card p-4 flex items-center gap-4">
            <img src={activity.imageUrl || stockImage('activities', activity.id, 200)} alt="" className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
            <div className="flex-grow min-w-0">
              <h3 className="serif text-lg text-olive truncate">{activity.name}</h3>
              <div className="flex flex-wrap gap-3 text-xs text-ink/50">
                {activity.duration && <span className="flex items-center gap-1"><Clock size={12} /> {activity.duration}</span>}
                <span className="flex items-center gap-1"><BarChart size={12} /> {activity.difficulty}</span>
                <span className="font-semibold text-olive">{activity.cost > 0 ? formatCOP(activity.cost) : 'Incluido'}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  const { id, ...data } = activity;
                  setEditing({ id, data });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                aria-label={`Editar ${activity.name}`}
              >
                <Edit2 size={18} />
              </button>
              <button onClick={() => setToDelete(activity)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" aria-label={`Eliminar ${activity.name}`}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {activities?.length === 0 && <p className="text-center text-ink/50 py-10">Aún no hay actividades.</p>}
      </div>

      {toDelete && (
        <ConfirmDelete
          what={`la actividad "${toDelete.name}"`}
          onCancel={() => setToDelete(null)}
          onConfirm={async () => {
            try {
              await api.admin.deleteActivity(toDelete.id);
              toast('Actividad eliminada.');
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
