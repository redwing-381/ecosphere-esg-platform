import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api, { apiError } from "../lib/api";
import { Badge, Button, Card, PageHeader, Table, Td } from "../components/ui";

type Challenge = {
  id: number;
  title: string;
  xp_reward: number;
  points_reward: number;
  status: string;
  difficulty: string | null;
};
type BadgeItem = { id: number; name: string; description: string | null; metric: string; threshold: number };
type LeaderRow = { employee_id: number; name: string; xp_balance: number };

const statusTone: Record<string, string> = { active: "green", draft: "slate", completed: "amber" };

/** Gamification module: leaderboard, challenges and badge catalog. */
export default function Gamification() {
  const [note, setNote] = useState("");

  const leaderboard = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => (await api.get<LeaderRow[]>("/gamification/leaderboard")).data,
  });
  const challenges = useQuery({
    queryKey: ["challenges"],
    queryFn: async () => (await api.get<Challenge[]>("/gamification/challenges")).data,
  });
  const badges = useQuery({
    queryKey: ["badges"],
    queryFn: async () => (await api.get<BadgeItem[]>("/gamification/badges")).data,
  });

  const join = useMutation({
    mutationFn: async (id: number) => api.post(`/gamification/challenges/${id}/join`),
    onSuccess: () => setNote("Joined challenge — submit proof to earn rewards."),
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
        <p className="mb-3 text-sm font-medium text-slate-700">Challenges</p>
        <Table head={["Challenge", "Difficulty", "XP", "Points", "Status", ""]}>
          {challenges.data?.map((c) => (
            <tr key={c.id}>
              <Td className="font-medium">{c.title}</Td>
              <Td className="capitalize">{c.difficulty ?? "—"}</Td>
              <Td>{c.xp_reward}</Td>
              <Td>{c.points_reward}</Td>
              <Td>
                <Badge tone={statusTone[c.status] ?? "slate"}>{c.status}</Badge>
              </Td>
              <Td>
                <Button
                  variant="ghost"
                  disabled={c.status !== "active"}
                  onClick={() => join.mutate(c.id)}
                >
                  Join
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
