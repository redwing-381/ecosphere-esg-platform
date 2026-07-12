import { forwardRef } from "react";
import { Inbox, type LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white shadow-xs hover:bg-brand-700 focus-visible:ring-brand-500/40",
  // `ghost` is our standard secondary (bordered white) action, kept for compatibility.
  ghost:
    "bg-white text-slate-700 border border-slate-300 shadow-xs hover:bg-slate-50 focus-visible:ring-slate-400/30",
  secondary:
    "bg-white text-slate-700 border border-slate-300 shadow-xs hover:bg-slate-50 focus-visible:ring-slate-400/30",
  danger: "bg-rose-600 text-white shadow-xs hover:bg-rose-700 focus-visible:ring-rose-500/40",
  subtle: "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400/30",
};

/** Primary action button with brand styling and consistent focus states. */
export function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const sizing = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm";
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold outline-none transition focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */

const CONTROL =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:bg-slate-50";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} className={`${CONTROL} ${className}`} {...props} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...props }, ref) {
    return <textarea ref={ref} className={`${CONTROL} min-h-[5rem] ${className}`} {...props} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...props }, ref) {
    return (
      <select ref={ref} className={`${CONTROL} appearance-none bg-[length:1.1rem] bg-[right_0.6rem_center] bg-no-repeat pr-9 ${className}`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {children}
      </select>
    );
  }
);

/** Labelled form field wrapper with optional hint text. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

/** Sliding on/off switch with an inline label. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 text-left"
    >
      <span
        className={`relative mt-0.5 inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition ${
          checked ? "bg-brand-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
      <span>
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        {description && <span className="block text-xs text-slate-400">{description}</span>}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

/** Bordered surface used to group content, with an optional header. */
export function Card({
  className = "",
  title,
  subtitle,
  actions,
  children,
}: {
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-shrink-0 gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

/** Small status pill with semantic colors and an optional leading dot. */
export function Badge({
  tone = "slate",
  dot = false,
  children,
}: {
  tone?: string;
  dot?: boolean;
  children: React.ReactNode;
}) {
  const tones: Record<string, { chip: string; dot: string }> = {
    slate: { chip: "bg-slate-100 text-slate-700", dot: "bg-slate-500" },
    green: { chip: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/20", dot: "bg-brand-600" },
    amber: { chip: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20", dot: "bg-amber-500" },
    rose: { chip: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20", dot: "bg-rose-500" },
    sky: { chip: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20", dot: "bg-sky-500" },
    violet: { chip: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20", dot: "bg-violet-500" },
    indigo: { chip: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20", dot: "bg-indigo-500" },
  };
  const t = tones[tone] ?? tones.slate;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${t.chip}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Headings & metrics                                                  */
/* ------------------------------------------------------------------ */

/** Page title with an optional description and right-aligned actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Inline section heading used above tables and lists. */
export function SectionHeader({
  title,
  actions,
}: {
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {actions}
    </div>
  );
}

/** Headline metric card with an optional icon and hint. */
export function Stat({
  label,
  value,
  tone = "slate",
  icon,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
}) {
  const color =
    tone === "green"
      ? "text-brand-700"
      : tone === "sky"
      ? "text-sky-600"
      : tone === "violet"
      ? "text-violet-600"
      : tone === "indigo"
      ? "text-indigo-600"
      : "text-slate-900";
  return (
    <Card>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon && <span className="text-slate-300">{icon}</span>}
      </div>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

/** Segmented pill tabs for switching between views. */
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              active ? "bg-brand-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
            {t.count != null && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

/** Table wrapper that renders a header row and body rows. */
export function Table({
  head,
  children,
  scroll = false,
}: {
  head: string[];
  children: React.ReactNode;
  scroll?: boolean;
}) {
  return (
    <div
      className={`scrollbar-thin overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm ${
        scroll ? "max-h-[28rem] overflow-y-auto" : ""
      }`}
    >
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {head.map((h, i) => (
              <th
                key={`${h}-${i}`}
                className={`px-4 py-3 font-semibold ${scroll ? "sticky top-0 z-10 bg-slate-50" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

/** Standard body cell. */
export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle text-slate-700 ${className}`}>{children}</td>;
}

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

/** Empty-state placeholder for tables, lists and panels. */
export function EmptyState({
  title,
  hint,
  Icon = Inbox,
}: {
  title: string;
  hint?: string;
  Icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon size={20} strokeWidth={2} />
      </span>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/** Small inline loading spinner. */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

/** Centered modal dialog with a backdrop. */
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="scrollbar-thin max-h-[90vh] w-full max-w-lg animate-scale-in overflow-y-auto rounded-2xl bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
