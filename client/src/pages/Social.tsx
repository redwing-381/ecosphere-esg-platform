import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Table, Td } from "../components/ui";

type CSR = { id: number; name: string; activity_date: string; xp_reward: number; points_reward: number; capacity: number | null };
type Training = { id: number; name: string; mandatory: boolean };
type Category = { id: number; name: string };

const isManagerRole = (r?: string) => r === "admin" || r === "dept_head";

/** Social module: CSR activities to join and trainings to complete. */
export default function Social() {
  const { user } = useAuth();
  const isManager = isManagerRole(user?.role);
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [csrOpen, setCsrOpen] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [csrForm, setCsrForm] = useState({
    name: "",
    category_id: "",
    activity_date: new Date().toISOString().slice(0, 10),
    xp_reward: 40,
    points_reward: 20,
    capacity: 25,
  });
  const [trainingForm, setTrainingForm] = useState({ name: "", mandatory: false });

  const csr = useQuery({ queryKey: ["csr"], queryFn: async () => (await api.get<CSR[]>("/social/csr-activities")).data });
  const trainings = useQuery({ queryKey: ["trainings"], queryFn: async () => (await api.get<Training[]>("/social/trainings")).data });
  const categories = useQuery({
    queryKey: ["categories", "csr"],
    queryFn: async () => (await api.get<Category[]>("/social/categories?type=csr")).data,
  });

  const join = useMutation({
    mutationFn: async (id: number) => api.post(`/social/csr-activities/${id}/join`),
    onSuccess: () => setNote("Joined activity — upload proof from My Profile to earn rewards."),
    onError: (e) => setNote(apiError(e)),
  });
  const complete = useMutation({
    mutationFn: async (id: number) => api.post(`/social/trainings/${id}/complete`),
    onSuccess: () => setNote("Training marked complete."),
    onError: (e) => setNote(apiError(e)),
  });
  const createCsr = useMutation({
    mutationFn: async () =>
      api.post("/social/csr-activities", {
        name: csrForm.name,
        category_id: csrForm.category_id ? Number(csrForm.category_id) : null,
        activity_date: csrForm.activity_date,
        xp_reward: Number(csrForm.xp_reward),
        points_reward: Number(csrForm.points_reward),
        capacity: Number(csrForm.capacity),
      }),
    onSuccess: () => {
      setCsrOpen(false);
      qc.invalidateQueries({ queryKey: ["csr"] });
    },
    onError: (e) => setNote(apiError(e)),
  });
  const createTraining = useMutation({
    mutationFn: async () => api.post("/social/trainings", trainingForm),
    onSuccess: () => {
      setTrainingOpen(false);
      qc.invalidateQueries({ queryKey: ["trainings"] });
    },
    onError: (e) => setNote(apiError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Social" subtitle="Join CSR activities and complete trainings to earn XP and points." />
      {note && <p className="text-sm text-brand-700">{note}</p>}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">CSR activities</p>
          {isManager && <Button onClick={() => setCsrOpen(true)}>+ Add CSR activity</Button>}
        </div>
        <Table head={["Activity", "Date", "XP", "Points", "Capacity", ""]}>
          {csr.data?.map((a) => (
            <tr key={a.id}>
              <Td className="font-medium">{a.name}</Td>
              <Td>{a.activity_date}</Td>
              <Td>{a.xp_reward}</Td>
              <Td>{a.points_reward}</Td>
              <Td>{a.capacity ?? "—"}</Td>
              <Td>
                <Button variant="ghost" onClick={() => join.mutate(a.id)}>
                  Join
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Trainings</p>
          {isManager && <Button onClick={() => setTrainingOpen(true)}>+ Add training</Button>}
        </div>
        <Table head={["Training", "Type", ""]}>
          {trainings.data?.map((t) => (
            <tr key={t.id}>
              <Td className="font-medium">{t.name}</Td>
              <Td>{t.mandatory ? <Badge tone="amber">Mandatory</Badge> : <Badge>Optional</Badge>}</Td>
              <Td>
                <Button variant="ghost" onClick={() => complete.mutate(t.id)}>
                  Mark complete
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal open={csrOpen} title="Add CSR activity" onClose={() => setCsrOpen(false)}>
        <div className="space-y-3">
          <Field label="Name">
            <Input value={csrForm.name} onChange={(e) => setCsrForm({ ...csrForm, name: e.target.value })} />
          </Field>
          <Field label="Category">
            <Select value={csrForm.category_id} onChange={(e) => setCsrForm({ ...csrForm, category_id: e.target.value })}>
              <option value="">None</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <Input type="date" value={csrForm.activity_date} onChange={(e) => setCsrForm({ ...csrForm, activity_date: e.target.value })} />
            </Field>
            <Field label="Capacity">
              <Input type="number" value={csrForm.capacity} onChange={(e) => setCsrForm({ ...csrForm, capacity: Number(e.target.value) })} />
            </Field>
            <Field label="XP reward">
              <Input type="number" value={csrForm.xp_reward} onChange={(e) => setCsrForm({ ...csrForm, xp_reward: Number(e.target.value) })} />
            </Field>
            <Field label="Points reward">
              <Input type="number" value={csrForm.points_reward} onChange={(e) => setCsrForm({ ...csrForm, points_reward: Number(e.target.value) })} />
            </Field>
          </div>
          <Button className="w-full" onClick={() => createCsr.mutate()} disabled={createCsr.isPending}>
            Save activity
          </Button>
        </div>
      </Modal>

      <Modal open={trainingOpen} title="Add training" onClose={() => setTrainingOpen(false)}>
        <div className="space-y-3">
          <Field label="Name">
            <Input value={trainingForm.name} onChange={(e) => setTrainingForm({ ...trainingForm, name: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={trainingForm.mandatory} onChange={(e) => setTrainingForm({ ...trainingForm, mandatory: e.target.checked })} />
            Mandatory
          </label>
          <Button className="w-full" onClick={() => createTraining.mutate()} disabled={createTraining.isPending}>
            Save training
          </Button>
        </div>
      </Modal>
    </div>
  );
}
