import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiError, fileUrl } from "../lib/api";
import { Badge, Button, EmptyState, PageHeader, Tabs, Td, Table } from "../components/ui";
import { CheckCircle2 } from "../components/icons";

interface CsrPart {
  id: number;
  employee_name: string;
  activity_name: string;
  proof_url: string | null;
}
interface ChallengePart {
  id: number;
  employee_name: string;
  challenge_title: string;
  proof_url: string | null;
}

/** Manager review queue for pending CSR and challenge submissions. */
export default function Approvals() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"csr" | "challenge">("csr");
  const [error, setError] = useState("");

  const csr = useQuery({
    queryKey: ["approvals-csr"],
    queryFn: async () => (await api.get<CsrPart[]>("/social/participations?status=pending")).data,
  });
  const challenges = useQuery({
    queryKey: ["approvals-challenge"],
    queryFn: async () =>
      (await api.get<ChallengePart[]>("/gamification/participations?status=pending")).data,
  });

  const act = useMutation({
    mutationFn: async ({ scope, id, decision }: { scope: string; id: number; decision: string }) =>
      api.post(`/${scope}/participations/${id}/${decision}`),
    onSuccess: () => {
      setError("");
      qc.invalidateQueries({ queryKey: ["approvals-csr"] });
      qc.invalidateQueries({ queryKey: ["approvals-challenge"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (e) => setError(apiError(e)),
  });

  const csrRows = csr.data ?? [];
  const challengeRows = challenges.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Approvals" subtitle="Review evidence and approve or reject submissions in your scope." />
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Tabs
        items={[
          { id: "csr", label: "CSR", count: csrRows.length },
          { id: "challenge", label: "Challenges", count: challengeRows.length },
        ]}
        value={tab}
        onChange={(id) => setTab(id as "csr" | "challenge")}
      />

      {tab === "csr" ? (
        <Table head={["Employee", "Activity", "Proof", "Decision"]}>
          {csrRows.length === 0 ? (
            <EmptyRow />
          ) : (
            csrRows.map((p) => (
              <tr key={p.id}>
                <Td className="font-medium">{p.employee_name}</Td>
                <Td>{p.activity_name}</Td>
                <Td>{proofLink(p.proof_url)}</Td>
                <Td>{decisionButtons("social", p.id)}</Td>
              </tr>
            ))
          )}
        </Table>
      ) : (
        <Table head={["Employee", "Challenge", "Proof", "Decision"]}>
          {challengeRows.length === 0 ? (
            <EmptyRow />
          ) : (
            challengeRows.map((p) => (
              <tr key={p.id}>
                <Td className="font-medium">{p.employee_name}</Td>
                <Td>{p.challenge_title}</Td>
                <Td>{proofLink(p.proof_url)}</Td>
                <Td>{decisionButtons("gamification", p.id)}</Td>
              </tr>
            ))
          )}
        </Table>
      )}
    </div>
  );

  function proofLink(url: string | null) {
    return url ? (
      <a className="text-brand-700 hover:underline" href={fileUrl(url)} target="_blank" rel="noreferrer">
        View
      </a>
    ) : (
      <Badge tone="amber">No proof</Badge>
    );
  }

  function decisionButtons(scope: string, id: number) {
    return (
      <div className="flex gap-2">
        <Button onClick={() => act.mutate({ scope, id, decision: "approve" })} disabled={act.isPending}>
          Approve
        </Button>
        <Button variant="danger" onClick={() => act.mutate({ scope, id, decision: "reject" })} disabled={act.isPending}>
          Reject
        </Button>
      </div>
    );
  }
}

function EmptyRow() {
  return (
    <tr>
      <td colSpan={4}>
        <EmptyState title="No pending submissions" hint="You're all caught up." Icon={CheckCircle2} />
      </td>
    </tr>
  );
}
