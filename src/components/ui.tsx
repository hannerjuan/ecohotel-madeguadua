import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Star, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

export function Spinner({ className = 'h-10 w-10' }: { className?: string }) {
  return <div className={`animate-spin rounded-full border-2 border-olive/20 border-t-olive ${className}`} role="status" aria-label="Cargando" />;
}

export function PageLoader() {
  return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <Spinner />
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-20 px-6">
      <AlertCircle className="text-red-500" size={40} />
      <p className="text-ink/70 max-w-md">{error.message || 'No pudimos cargar esta información.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="olive-button flex items-center gap-2">
          <RefreshCw size={16} /> Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="serif text-2xl text-ink/40 text-center py-20">{children}</p>;
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? 'fill-olive text-olive' : 'text-olive/20'} />
      ))}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, light }: { eyebrow: string; title: string; light?: boolean }) {
  return (
    <>
      <span className={`font-bold tracking-[0.2em] text-sm uppercase mb-4 block ${light ? 'text-cream' : 'text-olive'}`}>{eyebrow}</span>
      <h2 className={`serif text-4xl md:text-5xl leading-tight ${light ? 'text-white' : 'text-olive'}`}>{title}</h2>
    </>
  );
}

interface LightboxProps {
  images: string[];
  index: number;
  alt: string;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

/** Galería a pantalla completa. Se navega con flechas del teclado y se cierra con Escape. */
export function Lightbox({ images, index, alt, onIndexChange, onClose }: LightboxProps) {
  const count = images.length;
  const prev = () => onIndexChange((index - 1 + count) % count);
  const next = () => onIndexChange((index + 1) % count);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  });

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Galería de ${alt}`}
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-5 right-5 text-white/70 hover:text-white p-2" aria-label="Cerrar galería">
        <X size={32} />
      </button>
      {count > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className="absolute left-3 md:left-8 text-white/80 hover:text-white p-3 bg-white/10 hover:bg-white/20 rounded-full"
          aria-label="Imagen anterior"
        >
          <ChevronLeft size={28} />
        </button>
      )}
      <img
        src={images[index]}
        alt={`${alt} (${index + 1} de ${count})`}
        className="max-h-[85vh] max-w-[90vw] object-contain"
        referrerPolicy="no-referrer"
        onClick={(e) => e.stopPropagation()}
      />
      {count > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="absolute right-3 md:right-8 text-white/80 hover:text-white p-3 bg-white/10 hover:bg-white/20 rounded-full"
          aria-label="Imagen siguiente"
        >
          <ChevronRight size={28} />
        </button>
      )}
      {count > 1 && (
        <div className="absolute bottom-6 inset-x-0 text-center text-white/70 text-sm tracking-widest">
          {index + 1} / {count}
        </div>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[65] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6 gap-4">
          <h2 className="serif text-2xl text-olive">{title}</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink" aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
