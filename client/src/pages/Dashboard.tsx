import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../lib/auth";
import { useDepartmentNames } from "../lib/hooks";
import { CHART } from "../lib/theme";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, Stat, Table, Td } from "../components/ui";
import { Radar, ScoreGauge, TrendLine } from "../components/charts";
import { CheckCircle2, Clock, Globe, Medallion, TriangleAlert, Users, activityVisual } from "../components/icons";

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

const sevTone: Record<string, string> = { critical: "rose", high: "rose", medium: "amber", low: "slate" };

/** A colored, clickable score tile with a band-colored progress bar. */
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
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <Link
      to={to}
      className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color }}>
        {value ?? "—"}
        <span className="text-base font-medium text-slate-400"> / 100</span>
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </Link>
  );
}

function IssuesTable({ title, issues }: { title: string; issues: Issue[] }) {
  return (
    <div>
      <SectionHeader title={title} />
      <Table head={["Issue", "Severity", "Assigned to", "Due"]} scroll>
        {issues.length === 0 ? (
          <tr>
            <td colSpan={4}>
              <EmptyState title="Nothing open" hint="You're all clear." Icon={CheckCircle2} />
            </td>
          </tr>
        ) : (
          issues.map((i) => (
            <tr key={i.id} className="hover:bg-slate-50">
              <Td className="font-medium">
                {i.description}
                {i.is_overdue && (
                  <span className="ml-2">
                    <Badge tone="rose" dot>
                      Overdue
                    </Badge>
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
    user?.role === "employee" ? "My open compliance issues" : "Open compliance issues in my department";

  const radarSeries = (scores?.departments ?? [])
    .filter((d) => d.total !== null)
    .map((d) => ({
      label: deptNames[d.department_id] ?? `Dept ${d.department_id}`,
      data: [d.environmental ?? 0, d.social ?? 0, d.governance ?? 0],
    }));

  const pillars = [
    { label: "Environmental", value: summary?.env_score ?? null, color: CHART.env },
    { label: "Social", value: summary?.social_score ?? null, color: CHART.social },
    { label: "Governance", value: summary?.gov_score ?? null, color: CHART.gov },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ESG Overview"
        subtitle="Live environmental, social and governance performance across the organization."
        actions={
          <>
            <Link
              to="/environmental"
              className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-700"
            >
              Log carbon data
            </Link>
            <Link
              to="/reports"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              View reports
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreTile label="Environmental" value={summary?.env_score ?? null} color={CHART.env} to="/environmental" />
        <ScoreTile label="Social" value={summary?.social_score ?? null} color={CHART.social} to="/social" />
        <ScoreTile label="Governance" value={summary?.gov_score ?? null} color={CHART.gov} to="/governance" />
        <ScoreTile label="ESG Score" value={summary?.overall_score ?? null} color={CHART.esg} to="/reports" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat
          label="Total CO₂e (kg)"
          value={summary ? summary.total_co2e.toFixed(1) : "—"}
          icon={<Globe size={20} />}
        />
        <Stat
          label="Open compliance issues"
          value={summary?.open_issues ?? "—"}
          tone={summary && summary.open_issues > 0 ? "slate" : "green"}
          icon={<TriangleAlert size={20} />}
        />
        <Stat label="Active employees" value={summary?.employee_count ?? "—"} icon={<Users size={20} />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Emissions trend" subtitle="Monthly CO₂e over the last year" className="lg:col-span-2">
          <TrendLine
            labels={(trend ?? []).map((t) => t.month)}
            values={(trend ?? []).map((t) => t.co2e)}
            color={CHART.env}
            valueLabel="CO₂e (kg)"
          />
        </Card>

        <Card title="Score by pillar" subtitle="Organization-wide">
          <div className="grid grid-cols-3 gap-2">
            {pillars.map((p) => (
              <div key={p.label} className="flex flex-col items-center">
                <ScoreGauge value={p.value} color={p.color} height={120} />
                <p className="mt-1 text-center text-xs font-medium text-slate-500">{p.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          title="Department pillar comparison"
          subtitle="Environmental · Social · Governance by department"
          className="lg:col-span-2"
        >
          <Radar metrics={["Environmental", "Social", "Governance"]} series={radarSeries} max={100} />
        </Card>

        <Card title="Recent activity" subtitle="Latest in your scope">
          {(activity ?? []).length === 0 ? (
            <EmptyState title="No recent activity" Icon={Clock} />
          ) : (
            <ul className="scrollbar-thin max-h-[280px] space-y-3 overflow-y-auto pr-1 text-sm text-slate-600">
              {activity?.map((a, idx) => {
                const { Icon, color } = activityVisual(a.type);
                return (
                  <li key={idx} className="flex items-start gap-2.5">
                    <Medallion Icon={Icon} color={color} size={28} />
                    <span className="pt-1">{a.message}</span>
                  </li>
                );
              })}
            </ul>
          )}
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
