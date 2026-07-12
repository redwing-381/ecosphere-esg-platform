import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../lib/api";
import { Card, PageHeader, Stat } from "../components/ui";

type Dashboard = {
  overall_score: number | null;
  total_co2e: number;
  open_issues: number;
  employee_count: number;
};

type DeptScore = {
  department_id: number;
  environmental: number | null;
  social: number | null;
  governance: number | null;
  total: number | null;
};

type Scores = { overall: number | null; departments: DeptScore[] };

const BAND = (v: number) => (v >= 70 ? "#16a34a" : v >= 40 ? "#d97706" : "#e11d48");

/** Landing dashboard summarising live ESG performance. */
export default function Dashboard() {
  const { data: summary } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get<Dashboard>("/analytics/dashboard")).data,
  });
  const { data: scores } = useQuery({
    queryKey: ["scores"],
    queryFn: async () => (await api.get<Scores>("/analytics/scores")).data,
  });

  const chart =
    scores?.departments
      .filter((d) => d.total !== null)
      .map((d) => ({ name: `Dept ${d.department_id}`, total: d.total as number })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ESG Overview"
        subtitle="Live environmental, social and governance performance across the organization."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="Overall ESG Score" value={summary?.overall_score ?? "—"} tone="green" />
        <Stat label="Total CO2e (kg)" value={summary ? summary.total_co2e.toFixed(1) : "—"} />
        <Stat label="Open compliance issues" value={summary?.open_issues ?? "—"} />
        <Stat label="Active employees" value={summary?.employee_count ?? "—"} />
      </div>

      <Card>
        <p className="mb-4 text-sm font-medium text-slate-700">ESG score by department</p>
        {chart.length === 0 ? (
          <p className="text-sm text-slate-500">No scored departments yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {chart.map((row) => (
                  <Cell key={row.name} fill={BAND(row.total)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
