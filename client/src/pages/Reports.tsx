import { useState } from "react";
import api, { apiError } from "../lib/api";
import { useDepartments } from "../lib/hooks";
import { Button, Card, Field, PageHeader, Select, Input } from "../components/ui";

const REPORTS = [
  {
    module: "environmental",
    title: "Environmental Report",
    description: "Emissions, goals and per-department carbon breakdown.",
  },
  {
    module: "social",
    title: "Social Report",
    description: "Headcount, CSR participation and training completion.",
  },
  {
    module: "governance",
    title: "Governance Report",
    description: "Audits, pass rates and compliance risk summary.",
  },
  {
    module: "esg",
    title: "ESG Summary",
    description: "Executive overview: all scores and department comparison.",
  },
] as const;

/** Reports module: four ready-made reports plus a custom report builder. */
export default function Reports() {
  const departments = useDepartments();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [filters, setFilters] = useState({ module: "environmental", department_id: "", start: "", end: "" });

  async function download(module: string, format: string, tag: string) {
    setBusy(tag);
    setError("");
    try {
      const params: Record<string, string> = { module, format };
      if (filters.department_id && tag === "custom") params.department_id = filters.department_id;
      if (filters.start && tag === "custom") params.start = filters.start;
      if (filters.end && tag === "custom") params.end = filters.end;
      const res = await api.get("/reports/generate", { params, responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ecosphere-${module}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Generate ESG reports or build a custom export." />
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REPORTS.map((r) => (
          <Card key={r.module}>
            <p className="font-medium text-slate-800">{r.title}</p>
            <p className="mb-4 mt-1 text-sm text-slate-500">{r.description}</p>
            <Button disabled={busy !== ""} onClick={() => download(r.module, "pdf", r.module)}>
              {busy === r.module ? "Generating…" : "Generate PDF"}
            </Button>
          </Card>
        ))}
      </div>

      <Card>
        <p className="mb-4 text-sm font-medium text-slate-700">Custom report builder</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Module">
            <Select value={filters.module} onChange={(e) => setFilters({ ...filters, module: e.target.value })}>
              {REPORTS.map((r) => (
                <option key={r.module} value={r.module}>
                  {r.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Department">
            <Select
              value={filters.department_id}
              onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
            >
              <option value="">All departments</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="From">
            <Input type="date" value={filters.start} onChange={(e) => setFilters({ ...filters, start: e.target.value })} />
          </Field>
          <Field label="To">
            <Input type="date" value={filters.end} onChange={(e) => setFilters({ ...filters, end: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={busy !== ""} onClick={() => download(filters.module, "pdf", "custom")}>
            Export PDF
          </Button>
          <Button variant="ghost" disabled={busy !== ""} onClick={() => download(filters.module, "xlsx", "custom")}>
            Export Excel
          </Button>
          <Button variant="ghost" disabled={busy !== ""} onClick={() => download(filters.module, "csv", "custom")}>
            Export CSV
          </Button>
        </div>
      </Card>
    </div>
  );
}
