import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Table, Td } from "../components/ui";

type Challenge = { id: number; title: string; xp_reward: number; points_reward: number; status: string; difficulty: string | null };
type BadgeItem = { id: number; name: string; description: string | null; metric: string; threshold: number };
type LeaderRow = { employee_id: number; name: string; xp_balance: number };

const statusTone: Record<string, string> = { active: "green", draft: "slate", completed: "amber", under_review: "amber", archived: "rose" };
const NEXT: Record<string, string[]> = {
  draft: ["active", "archived"],
  active: ["under_review", "archived"],
  under_review: ["completed", "archived"],
  completed: ["archived"],
  archived: [],
};
const isManagerRole = (r?: string) => r === "admin" || r === "dept_head";

/** Gamification module: leaderboard, challenges and badge catalog. */
export default function Gamification() {
  const { user } = useAuth();
  const isManager = isManagerRole(user?.role);
  const participates = user?.employee_id != null;
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    xp_reward: 60,
    points_reward: 30,
    difficulty: "medium",
    evidence_required: true,
  });

  const leaderboard = useQuery({ queryKey: ["leaderboard"], queryFn: async () => (await api.get<LeaderRow[]>("/gamification/leaderboard")).data });
  const challenges = useQuery({ queryKey: ["challenges"], queryFn: async () => (await api.get<Challenge[]>("/gamification/challenges")).data });
  const badges = useQuery({ queryKey: ["badges"], queryFn: async () => (await api.get<BadgeItem[]>("/gamification/badges")).data });

  const join = useMutation({
    mutationFn: async (id: number) => api.post(`/gamification/challenges/${id}/join`),
    onSuccess: () => setNote("Joined challenge — submit proof from My Profile to earn rewards."),
    onError: (e) => setNote(apiError(e)),
  });
  const transition = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      api.post(`/gamification/challenges/${id}/transition`, { status }),
    onSuccess: () => {
      setNote("");
      qc.invalidateQueries({ queryKey: ["challenges"] });
    },
    onError: (e) => setNote(apiError(e)),
  });
  const create = useMutation({
    mutationFn: async () =>
      api.post("/gamification/challenges", {
        ...form,
        xp_reward: Number(form.xp_reward),
        points_reward: Number(form.points_reward),
      }),
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["challenges"] });
    },
    onError: (e) => setNote(apiError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Gamification" subtitle="Compete on challenges, climb the leaderboard and unlock badges." />
      {note && <p className="text-sm text-brand-700">{note}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <p className="mb-3 text-sm font-medium text-slate-700">Leaderboard</p>
          <Table head={["#", "Employee", "XP"]}>
            {leaderboard.data?.map((row, i) => (
              <tr key={row.employee_id}>
                <Td className="font-semibold text-brand-700">{i + 1}</Td>
                <Td>{row.name}</Td>
                <Td className="font-medium">{row.xp_balance}</Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-medium text-slate-700">Badges</p>
          <div className="space-y-2">
            {badges.data?.map((b) => (
              <div key={b.id} className="rounded-lg border border-slate-100 p-3">
                <p className="text-sm font-medium text-slate-800">{b.name}</p>
                <p className="text-xs text-slate-500">
                  {b.description ?? `Reach ${b.threshold} ${b.metric.replaceAll("_", " ")}`}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Challenges</p>
          {isManager && <Button onClick={() => setOpen(true)}>+ Add challenge</Button>}
        </div>
        <Table head={["Challenge", "Difficulty", "XP", "Points", "Status", "Actions"]} scroll>
          {challenges.data?.map((c) => (
            <tr key={c.id}>
              <Td className="font-medium">{c.title}</Td>
              <Td className="capitalize">{c.difficulty ?? "—"}</Td>
              <Td>{c.xp_reward}</Td>
              <Td>{c.points_reward}</Td>
              <Td>
                <Badge tone={statusTone[c.status] ?? "slate"}>{c.status.replaceAll("_", " ")}</Badge>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  {participates && (
                    <Button variant="ghost" disabled={c.status !== "active"} onClick={() => join.mutate(c.id)}>
                      Join
                    </Button>
                  )}
                  {isManager && NEXT[c.status]?.length > 0 && (
                    <Select
                      className="w-40"
                      value=""
                      onChange={(e) => e.target.value && transition.mutate({ id: c.id, status: e.target.value })}
                    >
                      <option value="">Change status…</option>
                      {NEXT[c.status].map((target) => (
                        <option key={target} value={target}>
                          Move to {target.replaceAll("_", " ")}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </div>

      <Modal open={open} title="Add challenge" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Field label="Title">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="XP reward">
              <Input type="number" value={form.xp_reward} onChange={(e) => setForm({ ...form, xp_reward: Number(e.target.value) })} />
            </Field>
            <Field label="Points reward">
              <Input type="number" value={form.points_reward} onChange={(e) => setForm({ ...form, points_reward: Number(e.target.value) })} />
            </Field>
            <Field label="Difficulty">
              <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.evidence_required} onChange={(e) => setForm({ ...form, evidence_required: e.target.checked })} />
            Require evidence
          </label>
          <p className="text-xs text-slate-400">New challenges start as draft — activate them to open joining.</p>
          <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending}>
            Save challenge
          </Button>
        </div>
      </Modal>
    </div>
  );
}
