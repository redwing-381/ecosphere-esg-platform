import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "../lib/api";
import { Button, Card, Input, PageHeader, Select, Table, Td } from "../components/ui";

type Factor = { id: number; name: string; activity_type: string; unit: string; factor_value: string };
type Activity = { id: number; type: string; department_id: number; quantity: string; unit: string; activity_date: string };
type DeptCarbon = { department_id: number; total_co2e: string };

/** Environmental module: emission factors, operational activities and carbon output. */
export default function Environmental() {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    type: "purchase",
    department_id: 1,
    quantity: 0,
    unit: "kg",
    emission_factor_id: "",
    activity_date: new Date().toISOString().slice(0, 10),
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

  const create = useMutation({
    mutationFn: async () =>
      api.post("/environmental/operational-activities", {
        ...form,
        department_id: Number(form.department_id),
        quantity: Number(form.quantity),
        emission_factor_id: form.emission_factor_id ? Number(form.emission_factor_id) : null,
      }),
    onSuccess: () => {
      setError("");
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["carbon-by-dept"] });
    },
    onError: (e) => setError(apiError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Environmental" subtitle="Track operational activities and their carbon footprint." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="mb-3 text-sm font-medium text-slate-700">Log an operational activity</p>
          {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="purchase">Purchase</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="expense">Expense</option>
              <option value="fleet">Fleet</option>
            </Select>
            <Input
              type="number"
              placeholder="Department ID"
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: Number(e.target.value) })}
            />
            <Input
              type="number"
              placeholder="Quantity"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            />
            <Input placeholder="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <Select
              value={form.emission_factor_id}
              onChange={(e) => setForm({ ...form, emission_factor_id: e.target.value })}
            >
              <option value="">Auto-match factor</option>
              {factors.data?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.unit})
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={form.activity_date}
              onChange={(e) => setForm({ ...form, activity_date: e.target.value })}
            />
          </div>
          <div className="mt-3">
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              Add activity
            </Button>
          </div>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-medium text-slate-700">Carbon by department</p>
          <Table head={["Dept", "CO2e (kg)"]}>
            {carbon.data?.map((c) => (
              <tr key={c.department_id}>
                <Td>Dept {c.department_id}</Td>
                <Td className="font-medium">{Number(c.total_co2e).toFixed(1)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-slate-700">Recent activities</p>
        <Table head={["Type", "Dept", "Quantity", "Unit", "Date"]}>
          {activities.data?.map((a) => (
            <tr key={a.id}>
              <Td className="capitalize">{a.type}</Td>
              <Td>Dept {a.department_id}</Td>
              <Td>{Number(a.quantity).toFixed(2)}</Td>
              <Td>{a.unit}</Td>
              <Td>{a.activity_date}</Td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
