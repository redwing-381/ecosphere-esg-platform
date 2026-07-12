import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../lib/api";
import { useAuth } from "../lib/auth";
import { useDepartmentNames } from "../lib/hooks";
import { Badge, Card, PageHeader, Stat, Table, Td } from "../components/ui";

type Dashboard = {
  overall_score: number | null;
  env_score: number | null;
  social_score: number | null;
  gov_score: number | null;
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

type Issue = {
  id: number;
  description: string;
  severity: string;
  owner_name: string | null;
  due_date: string;
  status: string;
  is_overdue: boolean;
};

type MonthlyEmission = { month: string; co2e: number };
type Activity = { message: string; type: string; created_at: string };

const BAND = (v: number) => (v >= 70 ? "#16a34a" : v >= 40 ? "#d97706" : "#e11d48");
const sevTone: Record<string, string> = { critical: "rose", high: "rose", medium: "amber", low: "slate" };

/** A colored, clickable score tile linking through to its module. */
function ScoreTile({
  label,
  value,
  color,
  to,
}: {
  label: string;
  value: number | null;
  color: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="block rounded-xl border-2 bg-white p-4 shadow-sm transition hover:shadow-md"
      style={{ borderColor: color }}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold" style={{ color }}>
        {value ?? "—"} <span className="text-lg text-slate-400">/ 100</span>
      </p>
    </Link>
  );
}

function IssuesTable({ title, issues }: { title: string; issues: Issue[] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-slate-700">{title}</p>
      <Table head={["Issue", "Severity", "Assigned to", "Due"]} scroll>
        {issues.length === 0 ? (
          <tr>
            <Td className="text-slate-400">Nothing open — you're all clear.</Td>
            <Td /> <Td /> <Td />
          </tr>
        ) : (
          issues.map((i) => (
            <tr key={i.id}>
              <Td className="font-medium">
                {i.description}
                {i.is_overdue && (
                  <span className="ml-2">
                    <Badge tone="rose">Overdue</Badge>
                  </span>
                )}
              </Td>
              <Td>
                <Badge tone={sevTone[i.severity] ?? "slate"}>{i.severity}</Badge>
              </Td>
              <Td>{i.owner_name ?? "—"}</Td>
              <Td>{i.due_date}</Td>
            </tr>
          ))
        )}
      </Table>
    </div>
  );
}

/** Landing dashboard summarising live ESG performance. */
export default function Dashboard() {
  const { user } = useAuth();
  const deptNames = useDepartmentNames();
  const isDeptHead = user?.role === "dept_head";

  const { data: summary } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get<Dashboard>("/analytics/dashboard")).data,
  });
  const { data: scores } = useQuery({
    queryKey: ["scores"],
    queryFn: async () => (await api.get<Scores>("/analytics/scores")).data,
  });
  const { data: issues } = useQuery({
    queryKey: ["issues"],
    queryFn: async () => (await api.get<Issue[]>("/governance/compliance-issues")).data,
  });
  const { data: allIssues } = useQuery({
    queryKey: ["issues", "all"],
    enabled: isDeptHead,
    queryFn: async () => (await api.get<Issue[]>("/governance/compliance-issues?scope=all")).data,
  });
  const { data: trend } = useQuery({
    queryKey: ["emissions-trend"],
    queryFn: async () => (await api.get<MonthlyEmission[]>("/analytics/emissions-trend")).data,
  });
  const { data: activity } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => (await api.get<Activity[]>("/analytics/recent-activity")).data,
  });

  const openIssues = (issues ?? []).filter((i) => i.status !== "resolved");
  const openAllIssues = (allIssues ?? []).filter((i) => i.status !== "resolved");
  const myTitle =
    user?.role === "employee"
      ? "My open compliance issues"
      : "Open compliance issues in my department";

  const chart =
    scores?.departments
      .filter((d) => d.total !== null)
      .map((d) => ({ name: deptNames[d.department_id] ?? `Dept ${d.department_id}`, total: d.total as number })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ESG Overview"
        subtitle="Live environmental, social and governance performance across the organization."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreTile label="Environmental Score" value={summary?.env_score ?? null} color="#16a34a" to="/environmental" />
        <ScoreTile label="Social Score" value={summary?.social_score ?? null} color="#0ea5e9" to="/social" />
        <ScoreTile label="Governance Score" value={summary?.gov_score ?? null} color="#7c3aed" to="/governance" />
        <ScoreTile label="ESG Score" value={summary?.overall_score ?? null} color="#4f46e5" to="/reports" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="Total CO2e (kg)" value={summary ? summary.total_co2e.toFixed(1) : "—"} />
        <Stat label="Open compliance issues" value={summary?.open_issues ?? "—"} />
        <Stat label="Active employees" value={summary?.employee_count ?? "—"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <p className="mb-4 text-sm font-medium text-slate-700">Emissions trend (last 12 months)</p>
          {(trend ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No carbon data logged yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="co2e" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <p className="mb-4 text-sm font-medium text-slate-700">Department ESG ranking</p>
          {chart.length === 0 ? (
            <p className="text-sm text-slate-500">No scored departments yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <p className="mb-3 text-sm font-medium text-slate-700">Recent activity</p>
          {(activity ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No recent activity.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-600">
              {activity?.map((a, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                  <span>{a.message}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <p className="mb-3 text-sm font-medium text-slate-700">Quick actions</p>
          <div className="flex flex-col gap-2">
            <Link to="/environmental" className="rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-700">
              Log carbon data
            </Link>
            <Link to="/gamification" className="rounded-lg bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white hover:bg-amber-600">
              Start a challenge
            </Link>
            <Link to="/reports" className="rounded-lg bg-slate-700 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800">
              View reports
            </Link>
          </div>
        </Card>
      </div>

      {isDeptHead ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <IssuesTable title={myTitle} issues={openIssues} />
          <IssuesTable title="Open compliance issues (all departments)" issues={openAllIssues} />
        </div>
      ) : (
        <IssuesTable
          title={user?.role === "admin" ? "Open compliance issues (all departments)" : myTitle}
          issues={openIssues}
        />
      )}
    </div>
  );
}
