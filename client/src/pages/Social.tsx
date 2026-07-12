import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useEmployees, useProfile } from "../lib/hooks";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Table, Td } from "../components/ui";

type CSR = {
  id: number;
  name: string;
  activity_date: string;
  xp_reward: number;
  points_reward: number;
  capacity: number | null;
  spots_left: number | null;
  my_status: "pending" | "approved" | "rejected" | null;
};
type Training = { id: number; name: string; description: string | null; mandatory: boolean };
type MyTraining = { id: number; name: string; description: string | null; mandatory: boolean; completed: boolean };
type Category = { id: number; name: string };

const isManagerRole = (r?: string) => r === "admin" || r === "dept_head";

/** Social module: CSR activities, and course assignment (managers) or completion (employees). */
export default function Social() {
  const { user } = useAuth();
  const isManager = isManagerRole(user?.role);
  const participates = user?.employee_id != null;
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [csrOpen, setCsrOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<Training | null>(null);
  const [csrForm, setCsrForm] = useState({
    name: "",
    category_id: "",
    activity_date: new Date().toISOString().slice(0, 10),
    xp_reward: 40,
    points_reward: 20,
    capacity: 25,
  });

  const csr = useQuery({ queryKey: ["csr"], queryFn: async () => (await api.get<CSR[]>("/social/csr-activities")).data });
  const categories = useQuery({
    queryKey: ["categories", "csr"],
    queryFn: async () => (await api.get<Category[]>("/social/categories?type=csr")).data,
  });
  const allTrainings = useQuery({
    queryKey: ["all-trainings"],
    enabled: isManager,
    queryFn: async () => (await api.get<Training[]>("/social/trainings")).data,
  });
  const myTrainings = useQuery({
    queryKey: ["my-trainings"],
    enabled: !isManager,
    queryFn: async () => (await api.get<MyTraining[]>("/social/my-trainings")).data,
  });

  const join = useMutation({
    mutationFn: async (id: number) => api.post(`/social/csr-activities/${id}/join`),
    onSuccess: () => {
      setNote("Joined activity — upload proof from My Profile to earn rewards.");
      qc.invalidateQueries({ queryKey: ["csr"] });
    },
    onError: (e) => setNote(apiError(e)),
  });
  const complete = useMutation({
    mutationFn: async (id: number) => api.post(`/social/trainings/${id}/complete`),
    onSuccess: () => {
      setNote("Course marked complete.");
      qc.invalidateQueries({ queryKey: ["my-trainings"] });
    },
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

  return (
    <div className="space-y-6">
      <PageHeader title="Social" subtitle="Join CSR activities and complete assigned courses to earn XP and points." />
      {note && <p className="text-sm text-brand-700">{note}</p>}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">CSR activities</p>
          {isManager && <Button onClick={() => setCsrOpen(true)}>+ Add CSR activity</Button>}
        </div>
        <Table head={["Activity", "Date", "XP", "Points", "Spots left", ""]} scroll>
          {csr.data?.map((a) => (
            <tr key={a.id}>
              <Td className="font-medium">{a.name}</Td>
              <Td>{a.activity_date}</Td>
              <Td>{a.xp_reward}</Td>
              <Td>{a.points_reward}</Td>
              <Td>{a.capacity === null ? "Unlimited" : `${a.spots_left ?? 0} / ${a.capacity}`}</Td>
              <Td>{participates && <CsrAction activity={a} onJoin={() => join.mutate(a.id)} pending={join.isPending} />}</Td>
            </tr>
          ))}
        </Table>
      </div>

      <Card>
        <p className="mb-3 text-sm font-medium text-slate-700">
          {isManager ? "Courses — enable for your team" : "My courses"}
        </p>
        {isManager ? (
          <Table head={["Course", "Type", ""]} scroll>
            {allTrainings.data?.map((t) => (
              <tr key={t.id}>
                <Td className="font-medium">{t.name}</Td>
                <Td>{t.mandatory ? <Badge tone="amber">Mandatory</Badge> : <Badge>Optional</Badge>}</Td>
                <Td>
                  <Button variant="ghost" onClick={() => setAssignFor(t)}>
                    Assign
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Table head={["Course", "Type", "Status", ""]} scroll>
            {myTrainings.data?.length === 0 ? (
              <tr>
                <Td className="text-slate-400">No courses enabled for you yet.</Td>
                <Td /> <Td /> <Td />
              </tr>
            ) : (
              myTrainings.data?.map((t) => (
                <tr key={t.id}>
                  <Td className="font-medium">{t.name}</Td>
                  <Td>{t.mandatory ? <Badge tone="amber">Mandatory</Badge> : <Badge>Optional</Badge>}</Td>
                  <Td>{t.completed ? <Badge tone="green">Completed</Badge> : <Badge>Pending</Badge>}</Td>
                  <Td>
                    {!t.completed && (
                      <Button variant="ghost" onClick={() => complete.mutate(t.id)}>
                        Mark complete
                      </Button>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </Table>
        )}
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

      {assignFor && (
        <AssignCourseModal
          training={assignFor}
          onClose={() => setAssignFor(null)}
          onDone={() => {
            setAssignFor(null);
            setNote("Course enabled for the selected employees.");
          }}
        />
      )}
    </div>
  );
}

/** Renders the CSR join control reflecting the employee's current state. */
function CsrAction({ activity, onJoin, pending }: { activity: CSR; onJoin: () => void; pending: boolean }) {
  if (activity.my_status === "approved") return <Badge tone="green">Approved ✓</Badge>;
  if (activity.my_status === "pending") return <Badge tone="amber">Joined · awaiting approval</Badge>;
  if (activity.my_status === "rejected") return <Badge tone="rose">Not approved</Badge>;
  if (activity.capacity !== null && (activity.spots_left ?? 0) <= 0)
    return <Badge tone="slate">Full</Badge>;
  return (
    <Button variant="ghost" onClick={onJoin} disabled={pending}>
      Join
    </Button>
  );
}

function AssignCourseModal({
  training,
  onClose,
  onDone,
}: {
  training: { id: number; name: string };
  onClose: () => void;
  onDone: () => void;
}) {
  const { data: profile } = useProfile();
  const employees = useEmployees();
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState("");

  const scoped = (employees.data ?? []).filter(
    (e) => profile?.role === "admin" || e.department_id === profile?.department_id
  );

  const already = useQuery({
    queryKey: ["assignments", training.id],
    queryFn: async () => (await api.get<number[]>(`/social/trainings/${training.id}/assignments`)).data,
  });

  const assign = useMutation({
    mutationFn: async () => api.post(`/social/trainings/${training.id}/assign`, { employee_ids: selected }),
    onSuccess: onDone,
    onError: (e) => setError(apiError(e)),
  });

  const enabled = new Set(already.data ?? []);

  return (
    <Modal open title={`Assign: ${training.name}`} onClose={onClose}>
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      <p className="mb-2 text-xs text-slate-500">Select employees to enable this course for.</p>
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {scoped.map((e) => {
          const isEnabled = enabled.has(e.id);
          return (
            <label key={e.id} className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${isEnabled ? "text-slate-400" : "text-slate-700"}`}>
              <input
                type="checkbox"
                disabled={isEnabled}
                checked={isEnabled || selected.includes(e.id)}
                onChange={(ev) =>
                  setSelected((s) => (ev.target.checked ? [...s, e.id] : s.filter((x) => x !== e.id)))
                }
              />
              {e.name} {isEnabled && <span className="text-xs">(already enabled)</span>}
            </label>
          );
        })}
      </div>
      <Button className="mt-4 w-full" onClick={() => assign.mutate()} disabled={assign.isPending || selected.length === 0}>
        Enable for {selected.length} employee{selected.length === 1 ? "" : "s"}
      </Button>
    </Modal>
  );
}
