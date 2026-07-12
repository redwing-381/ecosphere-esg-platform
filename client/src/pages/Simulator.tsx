import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api, { apiError } from "../lib/api";
import { useDepartments } from "../lib/hooks";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  SectionHeader,
  Select,
  Table,
  Td,
} from "../components/ui";
import { CompareBar } from "../components/charts";
import { CHART } from "../lib/theme";
import { Sparkles, Target } from "../components/icons";

type ScoreSet = {
  environmental: number | null;
  social: number | null;
  governance: number | null;
  total: number | null;
};
type SimResult = { baseline: ScoreSet; projected: ScoreSet };
type Rec = { action: string; projected_total: number; gain: number };

const fmt = (v: number | null) => (v === null ? "—" : v.toFixed(1));

/** What-If simulator: project score impact of hypothetical improvements. */
export default function Simulator() {
  const [error, setError] = useState("");
  const departments = useDepartments();
  const [levers, setLevers] = useState({
    department_id: 1,
    carbon_reduction_pct: 20,
    add_csr: 2,
    add_training_completions: 3,
    resolve_issues: 1,
  });

  const recs = useQuery({
    queryKey: ["recs", levers.department_id],
    queryFn: async () =>
      (await api.get<Rec[]>(`/simulator/recommendations/${levers.department_id}`)).data,
  });

  const run = useMutation({
    mutationFn: async () => (await api.post<SimResult>("/simulator/run", levers)).data,
    onError: (e) => setError(apiError(e)),
    onSuccess: () => setError(""),
  });

  const rows: [string, keyof ScoreSet][] = [
    ["Environmental", "environmental"],
    ["Social", "social"],
    ["Governance", "governance"],
    ["Total", "total"],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="What-If Simulator"
        subtitle="Model how changes would move a department's ESG score before you act."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Levers" subtitle="Adjust the assumptions">
          {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
          <div className="space-y-3">
            <Field label="Department">
              <Select
                value={levers.department_id}
                onChange={(e) => setLevers({ ...levers, department_id: Number(e.target.value) })}
              >
                {(departments.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Emissions reduction (%)">
              <Input
                type="number"
                value={levers.carbon_reduction_pct}
                onChange={(e) => setLevers({ ...levers, carbon_reduction_pct: Number(e.target.value) })}
              />
            </Field>
            <Field label="Extra approved CSR">
              <Input
                type="number"
                value={levers.add_csr}
                onChange={(e) => setLevers({ ...levers, add_csr: Number(e.target.value) })}
              />
            </Field>
            <Field label="Extra trainings completed">
              <Input
                type="number"
                value={levers.add_training_completions}
                onChange={(e) => setLevers({ ...levers, add_training_completions: Number(e.target.value) })}
              />
            </Field>
            <Field label="Issues resolved">
              <Input
                type="number"
                value={levers.resolve_issues}
                onChange={(e) => setLevers({ ...levers, resolve_issues: Number(e.target.value) })}
              />
            </Field>
            <Button className="w-full" onClick={() => run.mutate()} disabled={run.isPending}>
              Run simulation
            </Button>
          </div>
        </Card>

        <Card title="Baseline vs projected" subtitle="Impact on the department's scores" className="lg:col-span-2">
          {run.data ? (
            <div className="space-y-5">
              <CompareBar
                categories={rows.map(([label]) => label)}
                seriesA={{
                  label: "Baseline",
                  data: rows.map(([, key]) => run.data!.baseline[key] ?? 0),
                  color: CHART.slate,
                }}
                seriesB={{
                  label: "Projected",
                  data: rows.map(([, key]) => run.data!.projected[key] ?? 0),
                  color: CHART.env,
                }}
                max={100}
                height={240}
              />
              <Table head={["Pillar", "Baseline", "Projected", "Change"]}>
                {rows.map(([label, key]) => {
                  const base = run.data!.baseline[key];
                  const proj = run.data!.projected[key];
                  const delta = base !== null && proj !== null ? proj - base : null;
                  return (
                    <tr key={key} className="hover:bg-slate-50">
                      <Td className="font-medium">{label}</Td>
                      <Td>{fmt(base)}</Td>
                      <Td>{fmt(proj)}</Td>
                      <Td>
                        {delta === null ? (
                          "—"
                        ) : (
                          <Badge tone={delta > 0 ? "green" : delta < 0 ? "rose" : "slate"}>
                            {delta > 0 ? "+" : ""}
                            {delta.toFixed(1)}
                          </Badge>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </Table>
            </div>
          ) : (
            <EmptyState title="No simulation yet" hint="Set your levers and run the simulation." Icon={Sparkles} />
          )}
        </Card>
      </div>

      <div>
        <SectionHeader title="Recommended actions" />
        <Table head={["Action", "Projected total", "Gain"]}>
          {(recs.data ?? []).length === 0 ? (
            <tr>
              <td colSpan={3}>
                <EmptyState title="No recommendations" hint="Pick a department to see ranked actions." Icon={Target} />
              </td>
            </tr>
          ) : (
            recs.data?.map((r) => (
              <tr key={r.action} className="hover:bg-slate-50">
                <Td className="font-medium">{r.action}</Td>
                <Td>{r.projected_total.toFixed(1)}</Td>
                <Td>
                  <Badge tone={r.gain > 0 ? "green" : "slate"}>
                    {r.gain > 0 ? "+" : ""}
                    {r.gain.toFixed(1)}
                  </Badge>
                </Td>
              </tr>
            ))
          )}
        </Table>
      </div>
    </div>
  );
}
