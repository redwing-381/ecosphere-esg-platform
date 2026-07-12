import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useDepartmentNames, useDepartments } from "../lib/hooks";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  SectionHeader,
  Select,
  Table,
  Td,
} from "../components/ui";
import { Donut } from "../components/charts";
import { Target } from "../components/icons";

type Factor = { id: number; name: string; unit: string; activity_type: string };
type Activity = { id: number; type: string; department_id: number; quantity: string; unit: string; activity_date: string };
type DeptCarbon = { department_id: number; total_co2e: string };
type Goal = { id: number; name: string; department_id: number | null; metric: string; target: string; unit: string; status: string };

const isManagerRole = (r?: string) => r === "admin" || r === "dept_head";

/** Environmental module: operational activities, carbon output and goals. */
export default function Environmental() {
  const { user } = useAuth();
  const isManager = isManagerRole(user?.role);
  const qc = useQueryClient();
  const deptNames = useDepartmentNames();
  const departments = useDepartments();
  const [error, setError] = useState("");
  const [goalOpen, setGoalOpen] = useState(false);
  const [form, setForm] = useState({
    department_id: 1,
    quantity: 0,
    emission_factor_id: "",
    activity_date: new Date().toISOString().slice(0, 10),
  });
  const [goal, setGoal] = useState({
    name: "",
    department_id: "",
    metric: "co2e",
    baseline: 0,
    target: 0,
    unit: "kg",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
  });

  const factors = useQuery({
    queryKey: ["factors"],
    queryFn: async () => (await api.get<Factor[]>("/environmental/emission-factors")).data,
  });
  const activities = useQuery({
    queryKey: ["activities"],
    queryFn: async () => (await api.get<Activity[]>("/environmental/operational-activities")).data,
  });
  const carbon = useQuery({
    queryKey: ["carbon-by-dept"],
    queryFn: async () => (await api.get<DeptCarbon[]>("/environmental/carbon-by-department")).data,
  });
  const goals = useQuery({
    queryKey: ["goals"],
    queryFn: async () => (await api.get<Goal[]>("/environmental/goals")).data,
  });

  const selectedFactor = factors.data?.find((f) => f.id === Number(form.emission_factor_id));

  const create = useMutation({
    mutationFn: async () => {
      if (!selectedFactor) throw new Error("Select an emission factor");
      return api.post("/environmental/operational-activities", {
        type: selectedFactor.activity_type,
        department_id: Number(form.department_id),
        quantity: Number(form.quantity),
        unit: selectedFactor.unit,
        emission_factor_id: selectedFactor.id,
        activity_date: form.activity_date,
      });
    },
    onSuccess: () => {
      setError("");
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["carbon-by-dept"] });
    },
    onError: (e) => setError(apiError(e)),
  });

  const createGoal = useMutation({
    mutationFn: async () =>
      api.post("/environmental/goals", {
        ...goal,
        department_id: goal.department_id ? Number(goal.department_id) : null,
        baseline: Number(goal.baseline),
        target: Number(goal.target),
      }),
    onSuccess: () => {
      setGoalOpen(false);
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e) => setError(apiError(e)),
  });

  const carbonSlices = (carbon.data ?? []).map((c) => ({
    label: deptNames[c.department_id] ?? `Dept ${c.department_id}`,
    value: Number(c.total_co2e),
  }));
  const totalCarbon = carbonSlices.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Environmental"
        subtitle="Track operational activities and their carbon footprint."
        actions={isManager && <Button onClick={() => setGoalOpen(true)}>+ Add goal</Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {isManager && (
          <Card title="Log an operational activity" className="lg:col-span-2">
            {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Department">
                <Select
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: Number(e.target.value) })}
                >
                  {(departments.data ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Emission factor">
                <Select
                  value={form.emission_factor_id}
                  onChange={(e) => setForm({ ...form, emission_factor_id: e.target.value })}
                >
                  <option value="">Select a factor…</option>
                  {factors.data?.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} · {f.activity_type} ({f.unit})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={`Quantity${selectedFactor ? ` (${selectedFactor.unit})` : ""}`}>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                />
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={form.activity_date}
                  onChange={(e) => setForm({ ...form, activity_date: e.target.value })}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending || !selectedFactor || Number(form.quantity) <= 0}
              >
                Add activity
              </Button>
            </div>
          </Card>
        )}

        <Card
          title="Carbon by department"
          subtitle={totalCarbon > 0 ? `${totalCarbon.toFixed(0)} kg CO₂e total` : undefined}
          className={isManager ? "" : "lg:col-span-3"}
        >
          <Donut data={carbonSlices} />
        </Card>
      </div>

      <div>
        <SectionHeader title="Reduction goals" />
        <Table head={["Goal", "Department", "Target", "Unit", "Status"]} scroll>
          {(goals.data ?? []).length === 0 ? (
            <tr>
              <td colSpan={5}>
                <EmptyState title="No reduction goals yet" hint="Add a goal to track progress." Icon={Target} />
              </td>
            </tr>
          ) : (
            goals.data?.map((g) => (
              <tr key={g.id} className="hover:bg-slate-50">
                <Td className="font-medium">{g.name}</Td>
                <Td>{g.department_id ? deptNames[g.department_id] ?? `Dept ${g.department_id}` : "Org-wide"}</Td>
                <Td>{Number(g.target).toFixed(0)}</Td>
                <Td>{g.unit}</Td>
                <Td>
                  <Badge tone={g.status === "achieved" ? "green" : g.status === "active" ? "sky" : "slate"}>
                    {g.status}
                  </Badge>
                </Td>
              </tr>
            ))
          )}
        </Table>
      </div>

      <div>
        <SectionHeader title="Recent activities" />
        <Table head={["Type", "Department", "Quantity", "Unit", "Date"]} scroll>
          {activities.data?.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50">
              <Td className="capitalize font-medium">{a.type}</Td>
              <Td>{deptNames[a.department_id] ?? `Dept ${a.department_id}`}</Td>
              <Td>{Number(a.quantity).toFixed(2)}</Td>
              <Td>{a.unit}</Td>
              <Td>{a.activity_date}</Td>
            </tr>
          ))}
        </Table>
      </div>

      <Modal open={goalOpen} title="Add reduction goal" onClose={() => setGoalOpen(false)}>
        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
        <div className="space-y-3">
          <Field label="Name">
            <Input value={goal.name} onChange={(e) => setGoal({ ...goal, name: e.target.value })} />
          </Field>
          <Field label="Department (blank = org-wide)">
            <Select value={goal.department_id} onChange={(e) => setGoal({ ...goal, department_id: e.target.value })}>
              <option value="">Org-wide</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target">
              <Input type="number" value={goal.target} onChange={(e) => setGoal({ ...goal, target: Number(e.target.value) })} />
            </Field>
            <Field label="Unit">
              <Input value={goal.unit} onChange={(e) => setGoal({ ...goal, unit: e.target.value })} />
            </Field>
            <Field label="Start date">
              <Input type="date" value={goal.start_date} onChange={(e) => setGoal({ ...goal, start_date: e.target.value })} />
            </Field>
            <Field label="End date">
              <Input type="date" value={goal.end_date} onChange={(e) => setGoal({ ...goal, end_date: e.target.value })} />
            </Field>
          </div>
          <Button className="w-full" onClick={() => createGoal.mutate()} disabled={createGoal.isPending}>
            Save goal
          </Button>
        </div>
      </Modal>
    </div>
  );
}
