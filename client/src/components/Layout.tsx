import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useProfile } from "../lib/hooks";
import NotificationBell from "./NotificationBell";

interface NavItem {
  to: string;
  label: string;
  roles?: Array<"admin" | "dept_head" | "employee">;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/environmental", label: "Environmental" },
  { to: "/social", label: "Social" },
  { to: "/governance", label: "Governance" },
  { to: "/gamification", label: "Gamification" },
  { to: "/rewards", label: "Rewards" },
  { to: "/simulator", label: "What-If Simulator" },
  { to: "/approvals", label: "Approvals", roles: ["admin", "dept_head"] },
  { to: "/reports", label: "Reports" },
  { to: "/admin", label: "Admin", roles: ["admin"] },
  { to: "/profile", label: "My Profile" },
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

  const items = NAV.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="px-6 py-5 text-lg font-bold text-brand-700">EcoSphere</div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <span className="text-sm text-slate-500">ESG Management Platform</span>
          <div className="flex items-center gap-4 text-sm">
            {profile && (
              <div className="hidden items-center gap-3 sm:flex">
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-800">
                  {ROLE_LABEL[profile.role]}
                </span>
                <span className="text-slate-600">
                  ⚡ {profile.xp_balance} XP · 🪙 {profile.points_balance}
                </span>
              </div>
            )}
            <NotificationBell />
            <div className="flex items-center gap-3">
              <span className="text-slate-600">{profile?.name ?? user?.email}</span>
              <button
                className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
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
