import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api, { apiError } from "../lib/api";
import { Button, Card, Input, PageHeader, Table, Td } from "../components/ui";

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
        <Card>
          <p className="mb-3 text-sm font-medium text-slate-700">Levers</p>
          {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
          <div className="space-y-3">
            <label className="block text-xs text-slate-500">
              Department ID
              <Input
                type="number"
                value={levers.department_id}
                onChange={(e) => setLevers({ ...levers, department_id: Number(e.target.value) })}
              />
            </label>
            <label className="block text-xs text-slate-500">
              Emissions reduction (%)
              <Input
                type="number"
                value={levers.carbon_reduction_pct}
                onChange={(e) => setLevers({ ...levers, carbon_reduction_pct: Number(e.target.value) })}
              />
            </label>
            <label className="block text-xs text-slate-500">
              Extra approved CSR
              <Input
                type="number"
                value={levers.add_csr}
                onChange={(e) => setLevers({ ...levers, add_csr: Number(e.target.value) })}
              />
            </label>
            <label className="block text-xs text-slate-500">
              Extra trainings completed
              <Input
                type="number"
                value={levers.add_training_completions}
                onChange={(e) =>
                  setLevers({ ...levers, add_training_completions: Number(e.target.value) })
                }
              />
            </label>
            <label className="block text-xs text-slate-500">
              Issues resolved
              <Input
                type="number"
                value={levers.resolve_issues}
                onChange={(e) => setLevers({ ...levers, resolve_issues: Number(e.target.value) })}
              />
            </label>
            <Button className="w-full" onClick={() => run.mutate()} disabled={run.isPending}>
              Run simulation
            </Button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <p className="mb-3 text-sm font-medium text-slate-700">Baseline vs projected</p>
          {run.data ? (
            <Table head={["Pillar", "Baseline", "Projected", "Change"]}>
              {rows.map(([label, key]) => {
                const base = run.data!.baseline[key];
                const proj = run.data!.projected[key];
                const delta = base !== null && proj !== null ? proj - base : null;
                return (
                  <tr key={key}>
                    <Td className="font-medium">{label}</Td>
                    <Td>{fmt(base)}</Td>
                    <Td>{fmt(proj)}</Td>
                    <Td className={delta && delta > 0 ? "text-brand-700" : "text-slate-500"}>
                      {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`}
                    </Td>
                  </tr>
                );
              })}
            </Table>
          ) : (
            <p className="text-sm text-slate-500">Set your levers and run the simulation.</p>
          )}
        </Card>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-slate-700">Recommended actions (ranked by impact)</p>
        <Table head={["Action", "Projected total", "Gain"]}>
          {recs.data?.map((r) => (
            <tr key={r.action}>
              <Td className="font-medium">{r.action}</Td>
              <Td>{r.projected_total.toFixed(1)}</Td>
              <Td className={r.gain > 0 ? "text-brand-700" : "text-slate-500"}>
                {r.gain > 0 ? "+" : ""}
                {r.gain.toFixed(1)}
              </Td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
