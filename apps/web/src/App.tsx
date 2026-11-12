import { Navigate, Route, Routes } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from './auth';
import { Shell } from './components/Sidebar';
import { Agents } from './pages/Agents';
import { Login, OAuthCallback } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Environments } from './pages/Environments';
import { Build } from './pages/Build';
import { Dashboard } from './pages/Dashboard';
import { Deploy } from './pages/Deploy';
import { Integrations } from './pages/Integrations';
import { Monitoring } from './pages/Monitoring';
import { ProjectDetail } from './pages/ProjectDetail';
import { Projects } from './pages/Projects';
import { Testing } from './pages/Testing';
import { Security } from './pages/Security';
import { Settings } from './pages/Settings';

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="empty">Loading…</p>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route element={<Protected><Shell /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="build" element={<Build />} />
        <Route path="qa" element={<Testing />} />
        <Route path="security" element={<Security />} />
        <Route path="deploy" element={<Deploy />} />
        <Route path="environments" element={<Environments />} />
        <Route path="monitoring" element={<Monitoring />} />
        <Route path="agents" element={<Agents />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
