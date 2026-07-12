import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Placeholder from "./pages/Placeholder";

/** Guard that redirects unauthenticated users to the login screen. */
function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/environmental" element={<Protected><Placeholder title="Environmental" /></Protected>} />
      <Route path="/social" element={<Protected><Placeholder title="Social" /></Protected>} />
      <Route path="/governance" element={<Protected><Placeholder title="Governance" /></Protected>} />
      <Route path="/gamification" element={<Protected><Placeholder title="Gamification" /></Protected>} />
      <Route path="/reports" element={<Protected><Placeholder title="Reports" /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
