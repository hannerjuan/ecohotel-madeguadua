import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFoundPage() {
  usePageTitle('Página no encontrada');
  return (
    <div className="py-32 px-6 text-center">
      <p className="text-olive font-bold tracking-[0.2em] uppercase text-sm mb-4">Error 404</p>
      <h1 className="serif text-5xl text-olive mb-6">Este sendero no lleva a ninguna parte</h1>
      <p className="text-ink/60 mb-10">La página que buscas no existe o fue movida.</p>
      <Link to="/" className="olive-button">Volver al inicio</Link>
    </div>
  );
}
