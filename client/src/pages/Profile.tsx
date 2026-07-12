import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "../lib/api";
import { useProfile } from "../lib/hooks";
import { Badge, Card, PageHeader, Stat, Table, Td } from "../components/ui";

interface BadgeItem {
  id: number;
  name: string;
  description: string | null;
}
interface CsrPart {
  id: number;
  activity_name: string;
  approval_status: string;
  proof_url: string | null;
  xp_earned: number;
  points_earned: number;
}
interface ChallengePart {
  id: number;
  challenge_title: string;
  approval_status: string;
  proof_url: string | null;
  xp_awarded: number;
  points_awarded: number;
}

const statusTone: Record<string, string> = { approved: "green", pending: "amber", rejected: "rose" };

/** The signed-in user's profile: stats, badges and participation history. */
export default function Profile() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const [error, setError] = useState("");

  const badges = useQuery({
    queryKey: ["my-badges", profile?.employee_id],
    enabled: !!profile?.employee_id,
    queryFn: async () =>
      (await api.get<BadgeItem[]>(`/gamification/employees/${profile!.employee_id}/badges`)).data,
  });
  const csr = useQuery({
    queryKey: ["my-csr"],
    queryFn: async () => (await api.get<CsrPart[]>("/social/participations?mine=true")).data,
  });
  const challenges = useQuery({
    queryKey: ["my-challenges"],
    queryFn: async () =>
      (await api.get<ChallengePart[]>("/gamification/participations?mine=true")).data,
  });

  const proof = useMutation({
    mutationFn: async ({ scope, id, file }: { scope: "social" | "gamification"; id: number; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      return api.post(`/${scope}/participations/${id}/proof`, form);
    },
    onSuccess: () => {
      setError("");
      qc.invalidateQueries({ queryKey: ["my-csr"] });
      qc.invalidateQueries({ queryKey: ["my-challenges"] });
    },
    onError: (e) => setError(apiError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" subtitle={profile?.job_title ?? undefined} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Name</p>
          <p className="mt-2 text-lg font-semibold text-slate-800">{profile?.name}</p>
          <p className="text-sm text-slate-500">{profile?.department_name ?? "No department"}</p>
        </Card>
        <Stat label="XP" value={profile?.xp_balance ?? 0} tone="green" />
        <Stat label="Points" value={profile?.points_balance ?? 0} />
        <Stat label="Badges" value={badges.data?.length ?? 0} />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Card>
        <p className="mb-3 text-sm font-medium text-slate-700">My badges</p>
        {badges.data?.length ? (
          <div className="flex flex-wrap gap-2">
            {badges.data.map((b) => (
              <span key={b.id} className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm text-brand-800" title={b.description ?? ""}>
                🏅 {b.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No badges yet — join activities to earn them.</p>
        )}
      </Card>

      <div>
        <p className="mb-3 text-sm font-medium text-slate-700">My CSR participations</p>
        <ParticipationTable
          rows={(csr.data ?? []).map((p) => ({
            id: p.id,
            title: p.activity_name,
            status: p.approval_status,
            proof: p.proof_url,
            reward: `${p.xp_earned} XP · ${p.points_earned} pts`,
          }))}
          scope="social"
          onUpload={(id, file) => proof.mutate({ scope: "social", id, file })}
        />
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-slate-700">My challenge participations</p>
        <ParticipationTable
          rows={(challenges.data ?? []).map((p) => ({
            id: p.id,
            title: p.challenge_title,
            status: p.approval_status,
            proof: p.proof_url,
            reward: `${p.xp_awarded} XP · ${p.points_awarded} pts`,
          }))}
          scope="gamification"
          onUpload={(id, file) => proof.mutate({ scope: "gamification", id, file })}
        />
      </div>
    </div>
  );

  function ParticipationTable({
    rows,
    onUpload,
  }: {
    rows: { id: number; title: string; status: string; proof: string | null; reward: string }[];
    scope: string;
    onUpload: (id: number, file: File) => void;
  }) {
    return (
      <Table head={["Activity", "Status", "Reward", "Proof"]}>
        {rows.length === 0 ? (
          <tr>
            <Td className="text-slate-400">Nothing yet.</Td>
            <Td /> <Td /> <Td />
          </tr>
        ) : (
          rows.map((r) => (
            <tr key={r.id}>
              <Td className="font-medium">{r.title}</Td>
              <Td>
                <Badge tone={statusTone[r.status] ?? "slate"}>{r.status}</Badge>
              </Td>
              <Td>{r.reward}</Td>
              <Td>
                {r.proof ? (
                  <a className="text-brand-700 hover:underline" href={`/${r.proof}`} target="_blank" rel="noreferrer">
                    View
                  </a>
                ) : r.status === "pending" ? (
                  <ProofUpload id={r.id} onUpload={onUpload} />
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </Td>
            </tr>
          ))
        )}
      </Table>
    );
  }
}

function ProofUpload({ id, onUpload }: { id: number; onUpload: (id: number, file: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button className="text-brand-700 hover:underline" onClick={() => ref.current?.click()}>
        Upload proof
      </button>
      <input
        ref={ref}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(id, file);
        }}
      />
    </>
  );
}
