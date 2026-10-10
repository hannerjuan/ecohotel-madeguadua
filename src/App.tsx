import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { PageLoader } from './components/ui';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';

// Cada página se descarga solo cuando se visita (el mapa y el panel admin pesan bastante).
const LandingPage = lazy(() => import('./components/LandingPage'));
const CabinList = lazy(() => import('./components/CabinList'));
const CabinDetail = lazy(() => import('./components/CabinDetail'));
const ActivityList = lazy(() => import('./components/ActivityList'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const PoliciesPage = lazy(() => import('./pages/PoliciesPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function AdminRoute() {
  const { user, isAdmin, loading, login } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) {
    return (
      <div className="py-24 px-6 text-center">
        <h1 className="serif text-3xl text-olive mb-4">Panel de administración</h1>
        <p className="text-ink/60 mb-8">Inicia sesión con la cuenta de Google del hotel para continuar.</p>
        <button onClick={login} className="olive-button">Iniciar sesión</button>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="py-24 px-6 text-center">
        <h1 className="serif text-3xl text-olive mb-4">Acceso denegado</h1>
        <p className="text-ink/60">La cuenta {user.email} no tiene permisos de administrador.</p>
      </div>
    );
  }
  return <AdminDashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SettingsProvider>
          <AuthProvider>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/cabins" element={<CabinList />} />
                  <Route path="/cabin/:id" element={<CabinDetail />} />
                  <Route path="/activities" element={<ActivityList />} />
                  <Route path="/admin" element={<AdminRoute />} />
                  <Route path="/politicas" element={<PoliciesPage />} />
                  <Route path="/privacidad" element={<PrivacyPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </Layout>
          </AuthProvider>
        </SettingsProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
