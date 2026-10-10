import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logout } from './lib/firebase';
import LandingPage from './components/LandingPage';
import CabinList from './components/CabinList';
import CabinDetail from './components/CabinDetail';
import AdminDashboard from './components/AdminDashboard';
import ActivityList from './components/ActivityList';
import { LogIn, LogOut, Shield, Home, Menu, X, Compass, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if user is admin
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else if (currentUser.email === 'ecohotelmadeguadua@gmail.com') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-olive/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <Link to="/" className="flex items-center gap-2">
                <Compass className="text-olive" size={32} />
                <span className="serif text-2xl font-bold text-olive tracking-tight">EcoHotel Madeguadua</span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-8">
                <Link to="/" className="text-ink/70 hover:text-olive transition-colors font-medium">Inicio</Link>
                <Link to="/cabins" className="text-ink/70 hover:text-olive transition-colors font-medium">Cabañas</Link>
                <Link to="/activities" className="text-ink/70 hover:text-olive transition-colors font-medium">Actividades</Link>
                {isAdmin && (
                  <Link to="/admin" className="text-ink/70 hover:text-olive transition-colors font-medium flex items-center gap-1">
                    <Shield size={18} /> Admin
                  </Link>
                )}
                {user ? (
                  <button onClick={logout} className="flex items-center gap-2 text-ink/70 hover:text-red-600 transition-colors font-medium">
                    <LogOut size={18} /> Salir
                  </button>
                ) : (
                  <button onClick={loginWithGoogle} className="olive-button flex items-center gap-2">
                    <LogIn size={18} /> Ingresar
                  </button>
                )}
              </nav>

              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center">
                <button onClick={toggleMenu} className="text-olive p-2">
                  {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Nav */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="md:hidden overflow-hidden bg-white border-b border-olive/10 shadow-lg"
              >
                <div className="px-6 py-8 flex flex-col gap-6">
                  <Link 
                    to="/" 
                    onClick={toggleMenu} 
                    className="flex justify-between items-center text-xl font-medium text-ink/70 hover:text-olive transition-colors border-b border-olive/5 pb-2"
                  >
                    Inicio <ChevronRight size={20} className="text-olive/40" />
                  </Link>
                  <Link 
                    to="/cabins" 
                    onClick={toggleMenu} 
                    className="flex justify-between items-center text-xl font-medium text-ink/70 hover:text-olive transition-colors border-b border-olive/5 pb-2"
                  >
                    Cabañas <ChevronRight size={20} className="text-olive/40" />
                  </Link>
                  <Link 
                    to="/activities" 
                    onClick={toggleMenu} 
                    className="flex justify-between items-center text-xl font-medium text-ink/70 hover:text-olive transition-colors border-b border-olive/5 pb-2"
                  >
                    Actividades <ChevronRight size={20} className="text-olive/40" />
                  </Link>
                  
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      onClick={toggleMenu} 
                      className="flex justify-between items-center text-xl font-medium text-olive transition-colors border-b border-olive/5 pb-2"
                    >
                      <div className="flex items-center gap-2"><Shield size={24} /> Panel Administrador</div>
                      <ChevronRight size={20} className="text-olive/40" />
                    </Link>
                  )}
                  
                  <div className="pt-4">
                    {user ? (
                      <button 
                        onClick={() => { logout(); toggleMenu(); }} 
                        className="w-full flex justify-center items-center gap-2 text-red-600 font-medium py-4 bg-red-50 rounded-2xl transition-colors hover:bg-red-100"
                      >
                        <LogOut size={22} /> Cerrar Sesión
                      </button>
                    ) : (
                      <button 
                        onClick={() => { loginWithGoogle(); toggleMenu(); }} 
                        className="w-full olive-button flex items-center justify-center gap-2 py-4 text-lg"
                      >
                        <LogIn size={22} /> Iniciar Sesión
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/cabins" element={<CabinList />} />
            <Route path="/activities" element={<ActivityList />} />
            <Route path="/cabin/:id" element={<CabinDetail />} />
            <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <div className="p-20 text-center serif text-2xl">Acceso Denegado</div>} />
          </Routes>
        </main>

        <footer className="bg-olive text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="serif text-3xl mb-4">EcoHotel Madeguadua</h2>
              <p className="opacity-70 max-w-md mx-auto font-light">
                Un refugio sostenible en medio de la naturaleza. Vive la experiencia del bambú y la tranquilidad.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs opacity-70 mb-8 max-w-4xl mx-auto text-left">
              <div>
                <h4 className="font-bold mb-3 text-sm text-cream cursor-default">Menú Rápido</h4>
                <ul className="space-y-2">
                  <li><Link to="/cabins" className="hover:text-cream transition-colors underline decoration-white/30">Nuestras Cabañas</Link></li>
                  <li><Link to="/activities" className="hover:text-cream transition-colors underline decoration-white/30">Experiencias y Río</Link></li>
                  <li><a href="#" className="hover:text-cream transition-colors underline decoration-white/30">Política de Privacidad de Datos</a></li>
                  <li><a href="#" className="hover:text-cream transition-colors underline decoration-white/30">Reglas de Convivencia y Cancelación</a></li>
                </ul>
              </div>
              <div className="space-y-3">
                <p>
                  <span className="font-bold text-cream cursor-default">🌿 Nuestro Compromiso Natural:</span><br/>
                  EcoHotel Madeguadua es un proyecto de conservación privada. Fomentamos el turismo responsable, el respeto por la quietud del bosque y la protección absoluta de la flora y fauna de Norcasia.
                </p>
                <p>
                  <span className="font-bold text-cream cursor-default">Respeto Mutuo:</span><br/>
                  Nos reservamos el derecho de admisión para garantizar un ambiente familiar, pacífico y en armonía con nuestras comunidades locales.
                </p>
              </div>
            </div>

            <div className="border-t border-white/10 pt-8 text-sm opacity-50 text-center">
              &copy; {new Date().getFullYear()} EcoHotel Madeguadua. Todos los derechos reservados.
            </div>
          </div>
        </footer>

        {/* Global Floating WhatsApp Button */}
        <a 
          href="https://wa.me/573000000000?text=¡Hola!%20Quiero%20información%20sobre%20las%20cabañas%20en%20EcoHotel%20Madeguadua" 
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 hover:shadow-[#25D366]/30 transition-all duration-300 group flex items-center justify-center"
          aria-label="Contactar por WhatsApp"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-white fill-white">
            <path d="M17.498 14.382c-.301-.15-1.767-.867-2.032-.967-.265-.101-.458-.15-.65.15-.192.301-.767.967-.94 1.168-.173.2-.346.225-.647.075-.301-.15-1.26-.465-2.403-1.485-.888-.795-1.484-1.776-1.657-2.077-.173-.301-.018-.465.132-.615.136-.136.301-.351.451-.526.15-.175.2-.301.301-.502.101-.202.05-.378-.025-.528-.075-.15-.65-1.579-.893-2.164-.236-.575-.475-.497-.65-.506-.17-.008-.363-.01-.555-.01-.192 0-.502.072-.767.373-.265.301-1.015.996-1.015 2.428 0 1.432 1.04 2.816 1.185 3.017.145.2 2.052 3.149 4.975 4.415.696.302 1.239.483 1.662.617.697.222 1.332.19 1.83.115.556-.084 1.713-.7 1.954-1.378.241-.678.241-1.26.17-1.378-.076-.119-.271-.194-.572-.344z" />
            <path d="M20.52 3.449A11.953 11.953 0 0012 .002C5.385.002.002 5.386.002 12A11.96 11.96 0 001.6 18.064L0 24l6.082-1.595A11.957 11.957 0 0012 24c6.615 0 12-5.384 12-12 0-3.208-1.253-6.223-3.48-8.451zM12 22.002c-1.895 0-3.753-.51-5.384-1.478l-.386-.228-4.004 1.05 1.066-3.902-.25-.398A9.957 9.957 0 012.002 12C2.002 6.486 6.485 2 12 2c2.673 0 5.187 1.041 7.078 2.932A9.96 9.96 0 0122 12c0 5.513-4.484 10.002-10.002 10.002z" />
          </svg>
        </a>
      </div>
    </Router>
  );
}
