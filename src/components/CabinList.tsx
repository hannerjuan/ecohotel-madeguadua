import { useMemo, useState } from 'react';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';
import { api } from '../lib/api';
import CabinCard from './CabinCard';
import { EmptyState, ErrorState, PageLoader } from './ui';

type Sort = 'name' | 'price-asc' | 'price-desc';

export default function CabinList() {
  usePageTitle('Cabañas');
  const { data: cabins, error, loading, reload } = useAsync(() => api.cabins(), []);
  const [guests, setGuests] = useState(0);
  const [sort, setSort] = useState<Sort>('name');

  const visible = useMemo(() => {
    const list = (cabins ?? []).filter((c) => c.capacity >= guests);
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    return list;
  }, [cabins, guests, sort]);

  const maxCapacity = Math.max(1, ...(cabins ?? []).map((c) => c.capacity));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-10 text-center">
        <h1 className="serif text-5xl md:text-6xl text-olive mb-4">Nuestras cabañas</h1>
        <p className="text-ink/60 max-w-2xl mx-auto text-lg">
          Descubre el espacio perfecto para tu descanso. Cada cabaña está diseñada para ofrecerte una conexión única con el entorno.
        </p>
      </header>

      {loading && <PageLoader />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {cabins && cabins.length > 0 && (
        <div className="flex flex-wrap gap-4 justify-center mb-10">
          <label className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm text-sm">
            <span className="text-ink/60">Huéspedes</span>
            <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="bg-transparent font-medium text-olive outline-none">
              <option value={0}>Cualquiera</option>
              {Array.from({ length: maxCapacity }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm text-sm">
            <span className="text-ink/60">Ordenar</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="bg-transparent font-medium text-olive outline-none">
              <option value="name">Nombre</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
            </select>
          </label>
        </div>
      )}

      {cabins && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {visible.map((cabin) => (
            <CabinCard key={cabin.id} cabin={cabin} />
          ))}
        </div>
      )}

      {cabins && visible.length === 0 && (
        <EmptyState>{cabins.length === 0 ? 'No hay cabañas disponibles en este momento.' : 'Ninguna cabaña coincide con ese número de huéspedes.'}</EmptyState>
      )}
    </div>
  );
}
