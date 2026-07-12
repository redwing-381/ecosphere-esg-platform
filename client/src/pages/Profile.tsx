import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiError, fileUrl } from "../lib/api";
import { useProfile } from "../lib/hooks";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, Stat, Table, Td } from "../components/ui";
import { Donut } from "../components/charts";
import { CHART } from "../lib/theme";
import { Award, Coins, Zap } from "../components/icons";

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

  const allParts = [
    ...(csr.data ?? []).map((p) => p.approval_status),
    ...(challenges.data ?? []).map((p) => p.approval_status),
  ];
  const participationSlices = [
    { label: "Approved", value: allParts.filter((s) => s === "approved").length, color: CHART.env },
    { label: "Pending", value: allParts.filter((s) => s === "pending").length, color: CHART.amber },
    { label: "Rejected", value: allParts.filter((s) => s === "rejected").length, color: CHART.rose },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" subtitle={profile?.job_title ?? undefined} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Name</p>
          <p className="mt-2 text-lg font-semibold text-slate-800">{profile?.name}</p>
          <p className="text-sm text-slate-500">{profile?.department_name ?? "No department"}</p>
        </Card>
        <Stat label="XP" value={profile?.xp_balance ?? 0} tone="green" icon={<Zap size={20} />} />
        <Stat label="Points" value={profile?.points_balance ?? 0} tone="sky" icon={<Coins size={20} />} />
        <Stat label="Badges" value={badges.data?.length ?? 0} tone="violet" icon={<Award size={20} />} />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Participation status" subtitle="Across CSR & challenges">
          <Donut data={participationSlices} height={220} />
        </Card>
        <Card title="My badges" subtitle="Achievements earned" className="lg:col-span-2">
          {badges.data?.length ? (
            <div className="flex flex-wrap gap-2">
              {badges.data.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800"
                  title={b.description ?? ""}
                >
                  <Award size={15} /> {b.name}
                </span>
              ))}
            </div>
          ) : (
            <EmptyState title="No badges yet" hint="Join activities to earn them." Icon={Award} />
          )}
        </Card>
      </div>

      <div>
        <SectionHeader title="My CSR participations" />
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
        <SectionHeader title="My challenge participations" />
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
                  <a className="text-brand-700 hover:underline" href={fileUrl(r.proof)} target="_blank" rel="noreferrer">
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
