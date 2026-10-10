import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { IMAGE_PLACEHOLDER, stockImage } from '../shared/images';
import App from './App.tsx';
import './index.css';

// Si una foto externa no carga (enlace caducado o borrado), se reemplaza por una de Unsplash
// y, si esa también falla, por una imagen local. Así nunca se ve un ícono de imagen rota.
document.addEventListener(
  'error',
  (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    const step = img.dataset.fallback;
    if (!step) {
      img.dataset.fallback = 'stock';
      img.src = stockImage('hero', img.alt || img.src, 1200);
    } else if (step === 'stock') {
      img.dataset.fallback = 'local';
      img.src = IMAGE_PLACEHOLDER;
    }
  },
  true,
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
