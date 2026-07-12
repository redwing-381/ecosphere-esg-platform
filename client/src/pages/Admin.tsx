import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "../lib/api";
import { useDepartments, useEmployees } from "../lib/hooks";
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
  Tabs,
  Td,
  Textarea,
  Toggle,
} from "../components/ui";

type FieldType = "text" | "number" | "date" | "select" | "checkbox" | "textarea";
interface FieldSpec {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string | number; label: string }[];
  default?: string | number | boolean;
}
interface Column {
  head: string;
  render: (row: any) => React.ReactNode;
}

const TABS = [
  "Organization",
  "Departments",
  "Employees",
  "Courses",
  "Emission Factors",
  "Policies",
  "Rewards",
  "Badges",
  "Categories",
] as const;

/** Admin console: organization settings and master-data CRUD. */
export default function Admin() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Organization");
  return (
    <div className="space-y-6">
      <PageHeader title="Admin Console" subtitle="Manage organization settings and master data." />
      <Tabs
        items={TABS.map((t) => ({ id: t, label: t }))}
        value={tab}
        onChange={(id) => setTab(id as (typeof TABS)[number])}
      />
      {tab === "Organization" && <OrganizationPanel />}
      {tab === "Departments" && <DepartmentsPanel />}
      {tab === "Employees" && <EmployeesPanel />}
      {tab === "Courses" && <CoursesPanel />}
      {tab === "Emission Factors" && <FactorsPanel />}
      {tab === "Policies" && <PoliciesPanel />}
      {tab === "Rewards" && <RewardsPanel />}
      {tab === "Badges" && <BadgesPanel />}
      {tab === "Categories" && <CategoriesPanel />}
    </div>
  );
}

function FormModal({
  open,
  title,
  fields,
  initialValues,
  onClose,
  onSubmit,
  error,
  pending,
}: {
  open: boolean;
  title: string;
  fields: FieldSpec[];
  initialValues?: Record<string, any>;
  onClose: () => void;
  onSubmit: (values: Record<string, any>) => void;
  error: string;
  pending: boolean;
}) {
  const defaults = () =>
    Object.fromEntries(fields.map((f) => [f.name, f.default ?? (f.type === "checkbox" ? false : "")]));
  const [values, setValues] = useState<Record<string, any>>(defaults);

  useEffect(() => {
    if (open) {
      const base = defaults();
      setValues(initialValues ? { ...base, ...initialValues } : base);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submit() {
    const coerced: Record<string, any> = {};
    for (const f of fields) {
      const v = values[f.name];
      coerced[f.name] = f.type === "number" ? (v === "" ? null : Number(v)) : v === "" ? null : v;
    }
    onSubmit(coerced);
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      <div className="space-y-3">
        {fields.map((f) => (
          <Field key={f.name} label={f.label}>
            {f.type === "select" ? (
              <Select value={values[f.name]} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}>
                <option value="">Select…</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : f.type === "checkbox" ? (
              <Toggle
                checked={!!values[f.name]}
                onChange={(v) => setValues({ ...values, [f.name]: v })}
                label={values[f.name] ? "Enabled" : "Disabled"}
              />
            ) : f.type === "textarea" ? (
              <Textarea
                value={values[f.name]}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              />
            ) : (
              <Input
                type={f.type}
                value={values[f.name]}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              />
            )}
          </Field>
        ))}
        <Button className="w-full" onClick={submit} disabled={pending}>
          Save
        </Button>
      </div>
    </Modal>
  );
}

function CrudPanel({
  title,
  queryKey,
  listUrl,
  createUrl,
  columns,
  fields,
  editable = false,
  deletable = false,
}: {
  title: string;
  queryKey: string;
  listUrl: string;
  createUrl: string;
  columns: Column[];
  fields: FieldSpec[];
  editable?: boolean;
  deletable?: boolean;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [error, setError] = useState("");

  const list = useQuery({
    queryKey: [queryKey],
    queryFn: async () => (await api.get<any[]>(listUrl)).data,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: [queryKey] });
  const create = useMutation({
    mutationFn: async (values: Record<string, any>) => api.post(createUrl, values),
    onSuccess: () => {
      setOpen(false);
      setError("");
      invalidate();
    },
    onError: (e) => setError(apiError(e)),
  });
  const update = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: Record<string, any> }) =>
      api.patch(`${listUrl}/${id}`, values),
    onSuccess: () => {
      setEditing(null);
      setError("");
      invalidate();
    },
    onError: (e) => setError(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`${listUrl}/${id}`),
    onSuccess: invalidate,
    onError: (e) => setError(apiError(e)),
  });

  const head = columns.map((c) => c.head);
  if (editable || deletable) head.push("");

  const initialFor = (row: any) =>
    Object.fromEntries(fields.map((f) => [f.name, row[f.name] ?? (f.type === "checkbox" ? false : "")]));

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <Button onClick={() => setOpen(true)}>+ Add</Button>
      </div>
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      <Table head={head} scroll>
        {(list.data ?? []).map((row) => (
          <tr key={row.id}>
            {columns.map((c, i) => (
              <Td key={i}>{c.render(row)}</Td>
            ))}
            {(editable || deletable) && (
              <Td>
                <div className="flex gap-2">
                  {editable && (
                    <Button variant="ghost" onClick={() => setEditing(row)}>
                      Edit
                    </Button>
                  )}
                  {deletable && (
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (confirm(`Delete this ${title.replace(/s$/, "").toLowerCase()}?`)) remove.mutate(row.id);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </Td>
            )}
          </tr>
        ))}
      </Table>
      <FormModal
        open={open}
        title={`Add ${title}`}
        fields={fields}
        onClose={() => setOpen(false)}
        onSubmit={(v) => create.mutate(v)}
        error={error}
        pending={create.isPending}
      />
      <FormModal
        open={!!editing}
        title={`Edit ${title}`}
        fields={fields}
        initialValues={editing ? initialFor(editing) : undefined}
        onClose={() => setEditing(null)}
        onSubmit={(v) => update.mutate({ id: editing.id, values: v })}
        error={error}
        pending={update.isPending}
      />
    </Card>
  );
}

function OrganizationPanel() {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await api.get("/settings")).data,
  });
  const [form, setForm] = useState<any>(null);
  const current = form ?? settings.data;

  const save = useMutation({
    mutationFn: async () =>
      api.patch("/settings", {
        name: current.name,
        weight_env: Number(current.weight_env),
        weight_social: Number(current.weight_social),
        weight_gov: Number(current.weight_gov),
        auto_carbon: current.auto_carbon,
        evidence_required: current.evidence_required,
        badge_auto_award: current.badge_auto_award,
        email_alerts: current.email_alerts,
      }),
    onSuccess: () => {
      setMsg("Settings saved.");
      setError("");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => setError(apiError(e)),
  });

  if (!current) return <Card>Loading…</Card>;
  const set = (patch: any) => setForm({ ...current, ...patch });

  return (
    <Card>
      <p className="mb-3 text-sm font-medium text-slate-700">Organization settings</p>
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      {msg && <p className="mb-3 text-sm text-brand-700">{msg}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Organization name">
          <Input value={current.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <div />
        <Field label="Environmental weight">
          <Input type="number" value={current.weight_env} onChange={(e) => set({ weight_env: e.target.value })} />
        </Field>
        <Field label="Social weight">
          <Input type="number" value={current.weight_social} onChange={(e) => set({ weight_social: e.target.value })} />
        </Field>
        <Field label="Governance weight">
          <Input type="number" value={current.weight_gov} onChange={(e) => set({ weight_gov: e.target.value })} />
        </Field>
        <div />
      </div>
      <div className="mt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">ESG Configuration</p>
        <div className="space-y-3">
          <Toggle
            checked={current.auto_carbon}
            onChange={(v) => set({ auto_carbon: v })}
            label="Enable auto emission calculation"
          />
          <Toggle
            checked={current.evidence_required}
            onChange={(v) => set({ evidence_required: v })}
            label="Require evidence for all CSR activities"
          />
          <Toggle
            checked={current.badge_auto_award}
            onChange={(v) => set({ badge_auto_award: v })}
            label="Auto-award badges on challenge completion"
          />
          <Toggle
            checked={current.email_alerts}
            onChange={(v) => set({ email_alerts: v })}
            label="Email alerts for new compliance issues"
          />
        </div>
      </div>
      <div className="mt-4">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          Save settings
        </Button>
      </div>
    </Card>
  );
}

function CoursesPanel() {
  return (
    <CrudPanel
      title="Courses"
      queryKey="all-trainings"
      listUrl="/social/trainings"
      createUrl="/social/trainings"
      editable
      deletable
      columns={[
        { head: "Course", render: (r) => r.name },
        { head: "Type", render: (r) => (r.mandatory ? "Mandatory" : "Optional") },
        { head: "Description", render: (r) => r.description ?? "—" },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "mandatory", label: "Mandatory", type: "checkbox" },
      ]}
    />
  );
}

function DepartmentsPanel() {
  const employees = useEmployees();
  return (
    <CrudPanel
      title="Departments"
      queryKey="departments"
      listUrl="/departments"
      createUrl="/departments"
      editable
      deletable
      columns={[
        { head: "Name", render: (r) => r.name },
        { head: "Code", render: (r) => r.code },
        { head: "Status", render: (r) => r.status },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text" },
        { name: "code", label: "Code", type: "text" },
        {
          name: "head_employee_id",
          label: "Department head",
          type: "select",
          options: (employees.data ?? []).map((e) => ({ value: e.id, label: e.name })),
        },
      ]}
    />
  );
}

function EmployeesPanel() {
  const departments = useDepartments();
  const deptNames: Record<number, string> = {};
  (departments.data ?? []).forEach((d) => (deptNames[d.id] = d.name));
  return (
    <CrudPanel
      title="Employees"
      queryKey="employees"
      listUrl="/employees"
      createUrl="/employees"
      editable
      columns={[
        { head: "Name", render: (r) => r.name },
        { head: "Email", render: (r) => r.email },
        { head: "Department", render: (r) => (r.department_id ? deptNames[r.department_id] : "—") },
        { head: "XP", render: (r) => r.xp_balance },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text" },
        { name: "email", label: "Email", type: "text" },
        {
          name: "department_id",
          label: "Department",
          type: "select",
          options: (departments.data ?? []).map((d) => ({ value: d.id, label: d.name })),
        },
        { name: "job_title", label: "Job title", type: "text" },
        {
          name: "gender",
          label: "Gender",
          type: "select",
          options: [
            { value: "Female", label: "Female" },
            { value: "Male", label: "Male" },
            { value: "Other", label: "Other" },
          ],
        },
      ]}
    />
  );
}

function FactorsPanel() {
  return (
    <CrudPanel
      title="Emission Factors"
      queryKey="factors"
      listUrl="/environmental/emission-factors"
      createUrl="/environmental/emission-factors"
      columns={[
        { head: "Name", render: (r) => r.name },
        { head: "Type", render: (r) => r.activity_type },
        { head: "Unit", render: (r) => r.unit },
        { head: "Factor", render: (r) => r.factor_value },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text" },
        {
          name: "activity_type",
          label: "Activity type",
          type: "select",
          options: ["purchase", "manufacturing", "expense", "fleet"].map((v) => ({ value: v, label: v })),
        },
        { name: "unit", label: "Unit", type: "text" },
        { name: "factor_value", label: "Factor value (CO2e per unit)", type: "number" },
        { name: "ghg_scope", label: "GHG scope (1-3)", type: "number", default: 1 },
        { name: "effective_date", label: "Effective date", type: "date" },
      ]}
    />
  );
}

function PoliciesPanel() {
  return (
    <CrudPanel
      title="Policies"
      queryKey="policies"
      listUrl="/governance/policies"
      createUrl="/governance/policies"
      columns={[
        { head: "Name", render: (r) => r.name },
        { head: "Pillar", render: (r) => r.pillar },
        { head: "Version", render: (r) => `v${r.version}` },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text" },
        {
          name: "pillar",
          label: "Pillar",
          type: "select",
          options: ["environmental", "social", "governance"].map((v) => ({ value: v, label: v })),
        },
        { name: "effective_date", label: "Effective date", type: "date" },
        { name: "body", label: "Body", type: "textarea" },
        { name: "requires_ack", label: "Requires acknowledgement", type: "checkbox", default: true },
      ]}
    />
  );
}

function RewardsPanel() {
  return (
    <CrudPanel
      title="Rewards"
      queryKey="rewards"
      listUrl="/rewards"
      createUrl="/rewards"
      columns={[
        { head: "Name", render: (r) => r.name },
        { head: "Points", render: (r) => r.points_required },
        { head: "Stock", render: (r) => r.stock },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text" },
        { name: "description", label: "Description", type: "text" },
        { name: "points_required", label: "Points required", type: "number" },
        { name: "stock", label: "Stock", type: "number" },
      ]}
    />
  );
}

function BadgesPanel() {
  return (
    <CrudPanel
      title="Badges"
      queryKey="badges"
      listUrl="/gamification/badges"
      createUrl="/gamification/badges"
      columns={[
        { head: "Name", render: (r) => r.name },
        { head: "Metric", render: (r) => r.metric },
        { head: "Threshold", render: (r) => r.threshold },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text" },
        { name: "description", label: "Description", type: "text" },
        {
          name: "metric",
          label: "Metric",
          type: "select",
          options: [
            { value: "total_xp", label: "Total XP" },
            { value: "completed_challenges", label: "Completed challenges" },
            { value: "csr_activities", label: "CSR activities" },
          ],
        },
        { name: "threshold", label: "Threshold", type: "number" },
      ]}
    />
  );
}

function CategoriesPanel() {
  return (
    <CrudPanel
      title="Categories"
      queryKey="categories"
      listUrl="/social/categories"
      createUrl="/social/categories"
      columns={[
        { head: "Name", render: (r) => r.name },
        { head: "Type", render: (r) => r.type },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text" },
        {
          name: "type",
          label: "Type",
          type: "select",
          options: [
            { value: "csr", label: "CSR" },
            { value: "challenge", label: "Challenge" },
          ],
        },
      ]}
    />
  );
}
