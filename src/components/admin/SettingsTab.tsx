import { Save } from 'lucide-react';
import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import type { Settings } from '../../types';
import { Field, ImagesField, inputClass } from './common';

export default function SettingsTab() {
  const toast = useToast();
  const { settings, setSettings } = useSettings();
  const [draft, setDraft] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Settings>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await api.admin.saveSettings(draft);
      setSettings(saved);
      setDraft(saved);
      toast('Ajustes guardados.');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-8">
      <section className="card p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        <h2 className="serif text-2xl text-olive md:col-span-2">Contacto</h2>
        <Field label="Nombre del hotel">
          <input required className={inputClass} value={draft.hotelName} onChange={(e) => set({ hotelName: e.target.value })} />
        </Field>
        <Field label="WhatsApp de reservas" hint="Con indicativo de país, por ejemplo 573001234567. Aquí llegan las solicitudes.">
          <input required className={inputClass} value={draft.whatsappNumber} onChange={(e) => set({ whatsappNumber: e.target.value })} />
        </Field>
        <Field label="Correo">
          <input type="email" className={inputClass} value={draft.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="Dirección">
          <input className={inputClass} value={draft.address} onChange={(e) => set({ address: e.target.value })} />
        </Field>
        <Field label="Cómo llegar">
          <input className={inputClass} value={draft.howToGetThere} onChange={(e) => set({ howToGetThere: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitud del mapa">
            <input type="number" step="any" className={inputClass} value={draft.mapLat} onChange={(e) => set({ mapLat: Number(e.target.value) })} />
          </Field>
          <Field label="Longitud del mapa">
            <input type="number" step="any" className={inputClass} value={draft.mapLng} onChange={(e) => set({ mapLng: Number(e.target.value) })} />
          </Field>
        </div>
      </section>

      <section className="card p-6 md:p-8">
        <h2 className="serif text-2xl text-olive mb-2">Fotos de portada</h2>
        <p className="text-sm text-ink/60 mb-5">Rotan en la parte superior de la página de inicio. Sube fotos propias del hotel para que no dependan de otros sitios.</p>
        <ImagesField
          main={draft.heroImages[0] ?? ''}
          gallery={draft.heroImages.slice(1)}
          onChange={({ main, gallery }) => set({ heroImages: [main, ...gallery].filter(Boolean) })}
        />
      </section>

      <section className="card p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        <h2 className="serif text-2xl text-olive md:col-span-2">Políticas</h2>
        <Field label="Hora de check-in">
          <input className={inputClass} value={draft.checkInTime} onChange={(e) => set({ checkInTime: e.target.value })} />
        </Field>
        <Field label="Hora de check-out">
          <input className={inputClass} value={draft.checkOutTime} onChange={(e) => set({ checkOutTime: e.target.value })} />
        </Field>
        <Field label="Política de cancelación" hint="Una regla por línea.">
          <textarea rows={6} className={`${inputClass} resize-y`} value={draft.cancellationPolicy} onChange={(e) => set({ cancellationPolicy: e.target.value })} />
        </Field>
        <Field label="Reglas de convivencia" hint="Una regla por línea.">
          <textarea rows={6} className={`${inputClass} resize-y`} value={draft.houseRules} onChange={(e) => set({ houseRules: e.target.value })} />
        </Field>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="olive-button flex items-center gap-2 disabled:opacity-50">
          <Save size={18} /> {saving ? 'Guardando…' : 'Guardar ajustes'}
        </button>
      </div>
    </form>
  );
}
