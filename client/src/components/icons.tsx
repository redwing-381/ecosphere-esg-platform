import {
  Award,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Coins,
  FileText,
  Gift,
  Globe,
  GraduationCap,
  HeartHandshake,
  Inbox,
  LayoutDashboard,
  Leaf,
  LogOut,
  type LucideIcon,
  Medal,
  Scale,
  Settings,
  Sparkles,
  Target,
  TriangleAlert,
  Trophy,
  User,
  Users,
  Zap,
} from "lucide-react";
import { CHART } from "../lib/theme";

export type { LucideIcon };
export {
  Award,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Coins,
  FileText,
  Gift,
  Globe,
  GraduationCap,
  HeartHandshake,
  Inbox,
  LayoutDashboard,
  Leaf,
  LogOut,
  Medal,
  Scale,
  Settings,
  Sparkles,
  Target,
  TriangleAlert,
  Trophy,
  User,
  Users,
  Zap,
};

/** Icon + accent color for a route, used by the sidebar. */
export const NAV_ICONS: Record<string, LucideIcon> = {
  "/": LayoutDashboard,
  "/environmental": Leaf,
  "/social": HeartHandshake,
  "/governance": Scale,
  "/gamification": Trophy,
  "/rewards": Gift,
  "/simulator": Sparkles,
  "/approvals": ClipboardCheck,
  "/reports": FileText,
  "/admin": Settings,
  "/profile": User,
};

/** Map a badge metric to a distinct icon and color. */
export function badgeVisual(metric: string): { Icon: LucideIcon; color: string } {
  if (metric.includes("xp")) return { Icon: Zap, color: CHART.amber };
  if (metric.includes("challenge")) return { Icon: Trophy, color: CHART.gov };
  if (metric.includes("csr")) return { Icon: HeartHandshake, color: CHART.social };
  return { Icon: Award, color: CHART.env };
}

/** Map an activity/notification type to an icon and color. */
export function activityVisual(type: string): { Icon: LucideIcon; color: string } {
  if (type.includes("challenge")) return { Icon: Trophy, color: CHART.gov };
  if (type.includes("csr")) return { Icon: HeartHandshake, color: CHART.social };
  if (type.includes("issue") || type.includes("compliance"))
    return { Icon: TriangleAlert, color: CHART.rose };
  if (type.includes("training")) return { Icon: GraduationCap, color: CHART.esg };
  if (type.includes("reward")) return { Icon: Gift, color: CHART.amber };
  return { Icon: Bell, color: CHART.slate };
}

/** A circular, tinted medallion wrapping an icon (used for badges & feeds). */
export function Medallion({
  Icon,
  color,
  size = 40,
}: {
  Icon: LucideIcon;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex flex-shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: `${color}1a`, color }}
    >
      <Icon size={size * 0.5} strokeWidth={2} />
    </span>
  );
}
