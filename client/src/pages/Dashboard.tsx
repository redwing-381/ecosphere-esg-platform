import { Card } from "../components/ui";

/** Landing dashboard; ESG score widgets are wired up in the analytics feature. */
export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ESG Overview</h1>
        <p className="text-sm text-slate-500">
          Live environmental, social and governance performance across the organization.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Overall ESG Score</p>
          <p className="mt-2 text-3xl font-bold text-brand-700">—</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Carbon this period</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">—</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Open compliance issues</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">—</p>
        </Card>
      </div>
    </div>
  );
}
