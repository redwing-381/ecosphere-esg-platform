import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useProfile } from "../lib/hooks";
import NotificationBell from "./NotificationBell";
import { Coins, Leaf, LogOut, NAV_ICONS, Zap } from "./icons";

interface NavItem {
  to: string;
  label: string;
  roles?: Array<"admin" | "dept_head" | "employee">;
  requiresEmployee?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/environmental", label: "Environmental" },
  { to: "/social", label: "Social" },
  { to: "/governance", label: "Governance" },
  { to: "/gamification", label: "Gamification" },
  { to: "/rewards", label: "Rewards", requiresEmployee: true },
  { to: "/simulator", label: "What-If Simulator" },
  { to: "/approvals", label: "Approvals", roles: ["admin", "dept_head"] },
  { to: "/reports", label: "Reports" },
  { to: "/admin", label: "Admin", roles: ["admin"] },
  { to: "/profile", label: "My Profile", requiresEmployee: true },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  dept_head: "Department Head",
  employee: "Employee",
};

/** Authenticated app shell with role-aware navigation and a top bar. */
export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const participates = profile?.employee_id != null;
  const items = NAV.filter(
    (item) =>
      (!item.roles || (user && item.roles.includes(user.role))) &&
      (!item.requiresEmployee || participates)
  );

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2.5 px-6 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Leaf size={18} strokeWidth={2.2} />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">EcoSphere</span>
        </div>
        <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {items.map((item) => {
            const Icon = NAV_ICONS[item.to];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {Icon && <Icon size={18} strokeWidth={2} />}
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur">
          <span className="text-sm font-medium text-slate-500">ESG Management Platform</span>
          <div className="flex items-center gap-4 text-sm">
            {profile && (
              <div className="hidden items-center gap-3 sm:flex">
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-800">
                  {ROLE_LABEL[profile.role]}
                </span>
                {participates && (
                  <span className="flex items-center gap-3 text-slate-600">
                    <span className="flex items-center gap-1">
                      <Zap size={14} className="text-amber-500" /> {profile.xp_balance}
                    </span>
                    <span className="flex items-center gap-1">
                      <Coins size={14} className="text-brand-600" /> {profile.points_balance}
                    </span>
                  </span>
                )}
              </div>
            )}
            <NotificationBell />
            <div className="flex items-center gap-3">
              <span className="text-slate-600">{profile?.name ?? user?.email}</span>
              <button
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
