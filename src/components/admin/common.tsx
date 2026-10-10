import { Loader2, Trash2, Upload, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import type { ReservationStatus } from '../../types';
import { Modal } from '../ui';

export const inputClass = 'w-full bg-cream rounded-xl p-3 outline-none focus:ring-2 focus:ring-olive/30';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-ink/60 uppercase tracking-wider">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink/40">{hint}</span>}
    </label>
  );
}

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
};

const STATUS_CLASS: Record<ReservationStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  return <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function ConfirmDelete({ what, onConfirm, onCancel }: { what: string; onConfirm: () => Promise<void>; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`¿Eliminar ${what}?`} onClose={onCancel}>
      <p className="text-ink/60 mb-6">Esta acción no se puede deshacer.</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl font-medium text-ink/60 bg-cream hover:bg-olive/10">
          Cancelar
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
          className="flex-1 px-4 py-3 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Trash2 size={18} /> Eliminar
        </button>
      </div>
    </Modal>
  );
}

/** Lista de textos editable separada por comas (comodidades, qué incluye…). */
export function TagsInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState(value.join(', '));
  return (
    <input
      className={inputClass}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean));
      }}
    />
  );
}

interface ImagesFieldProps {
  main: string;
  gallery: string[];
  onChange: (next: { main: string; gallery: string[] }) => void;
}

/** Imagen principal + galería, con subida al servidor o pegando una URL. */
export function ImagesField({ main, gallery, onChange }: ImagesFieldProps) {
  const toast = useToast();
  const [uploading, setUploading] = useState<'main' | 'gallery' | null>(null);
  const [urlDraft, setUrlDraft] = useState('');

  const upload = async (files: FileList | null, target: 'main' | 'gallery') => {
    if (!files?.length) return;
    setUploading(target);
    try {
      const { urls } = await api.admin.upload(files);
      if (target === 'main') onChange({ main: urls[0], gallery: [...gallery, ...urls.slice(1)] });
      else onChange({ main, gallery: [...gallery, ...urls] });
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setUploading(null);
    }
  };

  const remove = (i: number) => onChange({ main, gallery: gallery.filter((_, j) => j !== i) });
  const makeMain = (i: number) => onChange({ main: gallery[i], gallery: [main, ...gallery.filter((_, j) => j !== i)].filter(Boolean) });

  return (
    <div className="space-y-4">
      <Field label="Imagen principal">
        <div className="flex gap-2">
          <input className={inputClass} placeholder="https://… o sube una foto" value={main} onChange={(e) => onChange({ main: e.target.value, gallery })} />
          <label className="bg-olive/10 text-olive px-4 rounded-xl cursor-pointer hover:bg-olive/20 flex items-center" title="Subir imagen">
            {uploading === 'main' ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
            <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={(e) => upload(e.target.files, 'main')} />
          </label>
        </div>
      </Field>
      {main && <img src={main} alt="Vista previa" className="rounded-2xl aspect-video object-cover w-full max-w-sm border border-olive/10" referrerPolicy="no-referrer" />}

      <Field label={`Galería (${gallery.length})`} hint="Pasa el cursor sobre una foto para quitarla o volverla principal.">
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="Pega una URL y presiona Enter"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && urlDraft.trim()) {
                e.preventDefault();
                onChange({ main, gallery: [...gallery, urlDraft.trim()] });
                setUrlDraft('');
              }
            }}
          />
          <label className="bg-olive/10 text-olive px-4 rounded-xl cursor-pointer hover:bg-olive/20 flex items-center gap-2 whitespace-nowrap text-sm font-medium">
            {uploading === 'gallery' ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} Subir
            <input type="file" accept="image/*" multiple className="hidden" disabled={!!uploading} onChange={(e) => upload(e.target.files, 'gallery')} />
          </label>
        </div>
      </Field>
      {gallery.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {gallery.map((url, i) => (
            <div key={url + i} className="relative group rounded-xl overflow-hidden aspect-square border border-olive/10">
              <img src={url} alt={`Galería ${i + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button type="button" onClick={() => makeMain(i)} className="bg-white text-olive text-[10px] font-bold px-2 py-1 rounded-full">
                  Principal
                </button>
                <button type="button" onClick={() => remove(i)} className="bg-red-600 text-white p-1.5 rounded-full" aria-label="Quitar imagen">
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
