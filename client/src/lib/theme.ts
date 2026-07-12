import { createTheme } from "@mui/material/styles";

/** Shared palette used by MUI X charts so visualizations match the UI. */
export const CHART = {
  env: "#059669",
  social: "#0ea5e9",
  gov: "#7c3aed",
  esg: "#4f46e5",
  amber: "#d97706",
  rose: "#e11d48",
  slate: "#64748b",
  grid: "#e2e8f0",
  axis: "#94a3b8",
};

/** Ordered categorical colors for multi-series charts. */
export const CHART_SERIES = [
  CHART.env,
  CHART.social,
  CHART.gov,
  CHART.esg,
  CHART.amber,
  CHART.rose,
];

/** Score band color: green (good) → amber (fair) → rose (poor). */
export const scoreColor = (v: number | null | undefined): string =>
  v == null ? CHART.slate : v >= 70 ? CHART.env : v >= 40 ? CHART.amber : CHART.rose;

/**
 * Minimal MUI theme applied only so MUI X charts inherit the app's font and
 * brand color. We deliberately skip CssBaseline to avoid clobbering Tailwind.
 */
export const muiTheme = createTheme({
  palette: {
    primary: { main: CHART.env },
    text: { primary: "#1e293b", secondary: "#64748b" },
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSize: 12,
  },
});
