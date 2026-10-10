import { Clock } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { usePageTitle } from '../hooks/usePageTitle';

function TextBlock({ text }: { text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <ul className="space-y-3 list-disc pl-5 text-ink/75 leading-relaxed">
      {lines.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </ul>
  );
}

export default function PoliciesPage() {
  usePageTitle('Reglas y cancelación');
  const { settings } = useSettings();

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="serif text-5xl text-olive mb-10">Reglas de convivencia y cancelación</h1>

      {(settings.checkInTime || settings.checkOutTime) && (
        <section className="card p-6 mb-10 flex flex-wrap gap-8">
          <div className="flex items-center gap-3">
            <Clock className="text-olive" />
            <div>
              <p className="text-xs uppercase tracking-widest text-ink/50">Check-in</p>
              <p className="font-semibold">{settings.checkInTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="text-olive" />
            <div>
              <p className="text-xs uppercase tracking-widest text-ink/50">Check-out</p>
              <p className="font-semibold">{settings.checkOutTime}</p>
            </div>
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className="serif text-3xl text-olive mb-4">Cancelaciones</h2>
        <TextBlock text={settings.cancellationPolicy} />
      </section>

      <section>
        <h2 className="serif text-3xl text-olive mb-4">Convivencia</h2>
        <TextBlock text={settings.houseRules} />
      </section>
    </article>
  );
}
