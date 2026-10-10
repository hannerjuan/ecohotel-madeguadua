import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, Compass, LogIn, LogOut, Menu, Shield, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { whatsappLink } from '../lib/format';

const NAV = [
  { to: '/', label: 'Inicio' },
  { to: '/cabins', label: 'Cabañas' },
  { to: '/activities', label: 'Actividades' },
];

function WhatsappIcon({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17.498 14.382c-.301-.15-1.767-.867-2.032-.967-.265-.101-.458-.15-.65.15-.192.301-.767.967-.94 1.168-.173.2-.346.225-.647.075-.301-.15-1.26-.465-2.403-1.485-.888-.795-1.484-1.776-1.657-2.077-.173-.301-.018-.465.132-.615.136-.136.301-.351.451-.526.15-.175.2-.301.301-.502.101-.202.05-.378-.025-.528-.075-.15-.65-1.579-.893-2.164-.236-.575-.475-.497-.65-.506-.17-.008-.363-.01-.555-.01-.192 0-.502.072-.767.373-.265.301-1.015.996-1.015 2.428 0 1.432 1.04 2.816 1.185 3.017.145.2 2.052 3.149 4.975 4.415.696.302 1.239.483 1.662.617.697.222 1.332.19 1.83.115.556-.084 1.713-.7 1.954-1.378.241-.678.241-1.26.17-1.378-.076-.119-.271-.194-.572-.344z" />
      <path d="M20.52 3.449A11.953 11.953 0 0012 .002C5.385.002.002 5.386.002 12A11.96 11.96 0 001.6 18.064L0 24l6.082-1.595A11.957 11.957 0 0012 24c6.615 0 12-5.384 12-12 0-3.208-1.253-6.223-3.48-8.451zM12 22.002c-1.895 0-3.753-.51-5.384-1.478l-.386-.228-4.004 1.05 1.066-3.902-.25-.398A9.957 9.957 0 012.002 12C2.002 6.486 6.485 2 12 2c2.673 0 5.187 1.041 7.078 2.932A9.96 9.96 0 0122 12c0 5.513-4.484 10.002-10.002 10.002z" />
    </svg>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, isAdmin, login, logout } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Cierra el menú móvil y vuelve arriba al cambiar de página.
  useEffect(() => {
    setMenuOpen(false);
    if (!location.hash) window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  const handleLogin = async () => {
    try {
      await login();
    } catch {
      toast('No se pudo iniciar sesión con Google. Inténtalo de nuevo.', 'error');
    }
  };

  const links = isAdmin ? [...NAV, { to: '/admin', label: 'Admin' }] : NAV;
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `transition-colors font-medium ${isActive ? 'text-olive' : 'text-ink/70 hover:text-olive'}`;

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] bg-white px-4 py-2 rounded-lg">
        Saltar al contenido
      </a>
      <header className="bg-white/85 backdrop-blur-md sticky top-0 z-50 border-b border-olive/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
          <Link to="/" className="flex items-center gap-2" aria-label={`${settings.hotelName}, inicio`}>
            <Compass className="text-olive" size={30} />
            <span className="serif text-xl sm:text-2xl font-bold text-olive tracking-tight">{settings.hotelName}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8" aria-label="Principal">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'} className={navClass}>
                {l.to === '/admin' ? (
                  <span className="flex items-center gap-1">
                    <Shield size={16} /> {l.label}
                  </span>
                ) : (
                  l.label
                )}
              </NavLink>
            ))}
            {user ? (
              <button onClick={logout} className="flex items-center gap-2 text-ink/70 hover:text-red-600 transition-colors font-medium">
                <LogOut size={18} /> Salir
              </button>
            ) : (
              <button onClick={handleLogin} className="olive-button flex items-center gap-2">
                <LogIn size={18} /> Ingresar
              </button>
            )}
          </nav>

          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden text-olive p-2"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden bg-white border-b border-olive/10 shadow-lg"
              aria-label="Menú móvil"
            >
              <div className="px-6 py-6 flex flex-col gap-5">
                {links.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.to === '/'}
                    className={({ isActive }) =>
                      `flex justify-between items-center text-lg font-medium border-b border-olive/5 pb-2 ${isActive ? 'text-olive' : 'text-ink/70'}`
                    }
                  >
                    {l.to === '/admin' ? 'Panel administrador' : l.label} <ChevronRight size={20} className="text-olive/40" />
                  </NavLink>
                ))}
                {user ? (
                  <button onClick={logout} className="flex justify-center items-center gap-2 text-red-600 font-medium py-3 bg-red-50 rounded-2xl">
                    <LogOut size={20} /> Cerrar sesión
                  </button>
                ) : (
                  <button onClick={handleLogin} className="olive-button flex items-center justify-center gap-2 py-3">
                    <LogIn size={20} /> Iniciar sesión
                  </button>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main id="main" className="flex-grow">
        {children}
      </main>

      <footer className="bg-olive text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="serif text-3xl mb-3">{settings.hotelName}</h2>
            <p className="opacity-75 max-w-md mx-auto font-light">
              Un refugio sostenible en medio de la naturaleza. Vive la experiencia de la guadua y la tranquilidad.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm opacity-80 mb-10 max-w-5xl mx-auto">
            <div>
              <h3 className="font-bold mb-3 text-cream">Explora</h3>
              <ul className="space-y-2">
                <li><Link to="/cabins" className="hover:text-cream underline decoration-white/30">Nuestras cabañas</Link></li>
                <li><Link to="/activities" className="hover:text-cream underline decoration-white/30">Experiencias y río</Link></li>
                <li><Link to="/politicas" className="hover:text-cream underline decoration-white/30">Reglas de convivencia y cancelación</Link></li>
                <li><Link to="/privacidad" className="hover:text-cream underline decoration-white/30">Política de privacidad de datos</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-3 text-cream">Contacto</h3>
              <ul className="space-y-2">
                <li>{settings.address}</li>
                <li>
                  <a href={whatsappLink(settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="hover:text-cream underline decoration-white/30">
                    WhatsApp +{settings.whatsappNumber}
                  </a>
                </li>
                {settings.email && (
                  <li>
                    <a href={`mailto:${settings.email}`} className="hover:text-cream underline decoration-white/30">{settings.email}</a>
                  </li>
                )}
              </ul>
            </div>
            <div className="space-y-3">
              <p>
                <span className="font-bold text-cream">Nuestro compromiso natural:</span> proyecto de conservación privada que fomenta el
                turismo responsable y la protección de la flora y fauna de Norcasia.
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-sm opacity-60 text-center">
            &copy; {new Date().getFullYear()} {settings.hotelName}. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      <a
        href={whatsappLink(settings.whatsappNumber, `¡Hola! Quiero información sobre las cabañas en ${settings.hotelName}`)}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform"
        aria-label="Escríbenos por WhatsApp"
      >
        <WhatsappIcon />
      </a>
    </div>
  );
}
