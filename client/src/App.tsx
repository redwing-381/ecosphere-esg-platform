import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Environmental from "./pages/Environmental";
import Social from "./pages/Social";
import Governance from "./pages/Governance";
import Gamification from "./pages/Gamification";
import Rewards from "./pages/Rewards";
import Simulator from "./pages/Simulator";
import Reports from "./pages/Reports";

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
      <Route path="/environmental" element={<Protected><Environmental /></Protected>} />
      <Route path="/social" element={<Protected><Social /></Protected>} />
      <Route path="/governance" element={<Protected><Governance /></Protected>} />
      <Route path="/gamification" element={<Protected><Gamification /></Protected>} />
      <Route path="/rewards" element={<Protected><Rewards /></Protected>} />
      <Route path="/simulator" element={<Protected><Simulator /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
