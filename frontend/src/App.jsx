import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { PageSkeleton } from './components/ui/Feedback';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';

// Route-level code splitting for fast initial load.
const GisMap = lazy(() => import('./pages/gis/GisMap'));
const Connectivity = lazy(() => import('./pages/connectivity/Connectivity'));
const FirstMile = lazy(() => import('./pages/firstMile/FirstMile'));
const LastMile = lazy(() => import('./pages/lastMile/LastMile'));
const Forecasting = lazy(() => import('./pages/forecasting/Forecasting'));
const GapUrgency = lazy(() => import('./pages/gaps/GapUrgency'));
const Recommendations = lazy(() => import('./pages/recommendations/Recommendations'));
const Copilot = lazy(() => import('./pages/copilot/Copilot'));
const Simulation = lazy(() => import('./pages/simulation/Simulation'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const Notifications = lazy(() => import('./pages/notifications/Notifications'));
const Admin = lazy(() => import('./pages/admin/Admin'));

const PLANNER_ROLES = ['administrator', 'city_planner', 'transport_authority'];

function Guard({ roles, children }) {
  const { user, role, booting } = useAuth();
  if (booting) return <div className="p-10"><PageSkeleton /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { user, booting } = useAuth();

  if (booting) {
    return <div className="min-h-screen flex items-center justify-center"><PageSkeleton /></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/*" element={
        <Guard>
          <Layout>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/map" element={<GisMap />} />
                <Route path="/connectivity" element={<Connectivity />} />
                <Route path="/first-mile" element={<FirstMile />} />
                <Route path="/last-mile" element={<LastMile />} />
                <Route path="/forecasting" element={<Forecasting />} />
                <Route path="/gap-urgency" element={<GapUrgency />} />
                <Route path="/recommendations" element={<Recommendations />} />
                <Route path="/copilot" element={<Copilot />} />
                <Route path="/simulation" element={<Guard roles={PLANNER_ROLES}><Simulation /></Guard>} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/admin" element={<Guard roles={['administrator']}><Admin /></Guard>} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </Layout>
        </Guard>
      } />
    </Routes>
  );
}
