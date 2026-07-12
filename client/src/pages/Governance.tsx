import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "../lib/api";
import { Badge, Button, Card, PageHeader, Table, Td } from "../components/ui";

type Policy = { id: number; name: string; pillar: string; version: number; requires_ack: boolean };
type Audit = { id: number; name: string; department_id: number | null; audit_date: string; passed: boolean | null };
type Issue = {
  id: number;
  severity: string;
  description: string;
  owner_id: number;
  due_date: string;
  status: string;
  is_overdue: boolean;
};

const sevTone: Record<string, string> = { critical: "rose", high: "rose", medium: "amber", low: "slate" };

/** Governance module: policies, audits and compliance issues. */
export default function Governance() {
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const policies = useQuery({
    queryKey: ["policies"],
    queryFn: async () => (await api.get<Policy[]>("/governance/policies")).data,
  });
  const audits = useQuery({
    queryKey: ["audits"],
    queryFn: async () => (await api.get<Audit[]>("/governance/audits")).data,
  });
  const issues = useQuery({
    queryKey: ["issues"],
    queryFn: async () => (await api.get<Issue[]>("/governance/compliance-issues")).data,
  });

  const ack = useMutation({
    mutationFn: async (id: number) => api.post(`/governance/policies/${id}/acknowledge`),
    onSuccess: () => setNote("Policy acknowledged."),
    onError: (e) => setNote(apiError(e)),
  });
  const resolve = useMutation({
    mutationFn: async (id: number) => api.post(`/governance/compliance-issues/${id}/resolve`),
    onSuccess: () => {
      setNote("Issue resolved.");
      qc.invalidateQueries({ queryKey: ["issues"] });
    },
    onError: (e) => setNote(apiError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Governance" subtitle="Acknowledge policies and track audits and compliance issues." />
      {note && <p className="text-sm text-brand-700">{note}</p>}

      <div>
        <p className="mb-3 text-sm font-medium text-slate-700">Policies</p>
        <Table head={["Policy", "Pillar", "Version", ""]}>
          {policies.data?.map((p) => (
            <tr key={p.id}>
              <Td className="font-medium">{p.name}</Td>
              <Td className="capitalize">{p.pillar}</Td>
              <Td>v{p.version}</Td>
              <Td>
                {p.requires_ack && (
                  <Button variant="ghost" onClick={() => ack.mutate(p.id)}>
                    Acknowledge
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <p className="mb-3 text-sm font-medium text-slate-700">Audits</p>
          <Table head={["Audit", "Date", "Result"]}>
            {audits.data?.map((a) => (
              <tr key={a.id}>
                <Td className="font-medium">{a.name}</Td>
                <Td>{a.audit_date}</Td>
                <Td>
                  {a.passed === null ? (
                    <Badge>Pending</Badge>
                  ) : a.passed ? (
                    <Badge tone="green">Passed</Badge>
                  ) : (
                    <Badge tone="rose">Failed</Badge>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-medium text-slate-700">Compliance issues</p>
          <Table head={["Issue", "Severity", "Due", ""]}>
            {issues.data?.map((i) => (
              <tr key={i.id}>
                <Td className="font-medium">
                  {i.description}
                  {i.is_overdue && i.status !== "resolved" && (
                    <span className="ml-2">
                      <Badge tone="rose">Overdue</Badge>
                    </span>
                  )}
                </Td>
                <Td>
                  <Badge tone={sevTone[i.severity] ?? "slate"}>{i.severity}</Badge>
                </Td>
                <Td>{i.due_date}</Td>
                <Td>
                  {i.status === "resolved" ? (
                    <Badge tone="green">Resolved</Badge>
                  ) : (
                    <Button variant="ghost" onClick={() => resolve.mutate(i.id)}>
                      Resolve
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  );
}
