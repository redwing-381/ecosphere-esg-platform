import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useDepartments, useEmployees } from "../lib/hooks";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Table, Td } from "../components/ui";

type Policy = { id: number; name: string; pillar: string; version: number; requires_ack: boolean };
type Audit = { id: number; name: string; department_id: number | null; audit_date: string; passed: boolean | null };
type Issue = { id: number; severity: string; description: string; owner_id: number; due_date: string; status: string; is_overdue: boolean };

const sevTone: Record<string, string> = { critical: "rose", high: "rose", medium: "amber", low: "slate" };
const isManagerRole = (r?: string) => r === "admin" || r === "dept_head";
const today = () => new Date().toISOString().slice(0, 10);

/** Governance module: policies, audits and compliance issues. */
export default function Governance() {
  const { user } = useAuth();
  const isManager = isManagerRole(user?.role);
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const departments = useDepartments();
  const employees = useEmployees();
  const [audit, setAudit] = useState({ name: "", department_id: "", audit_date: today(), passed: "" });
  const [issue, setIssue] = useState({ description: "", severity: "medium", owner_id: "", due_date: today() });

  const policies = useQuery({ queryKey: ["policies"], queryFn: async () => (await api.get<Policy[]>("/governance/policies")).data });
  const audits = useQuery({ queryKey: ["audits"], queryFn: async () => (await api.get<Audit[]>("/governance/audits")).data });
  const issues = useQuery({ queryKey: ["issues"], queryFn: async () => (await api.get<Issue[]>("/governance/compliance-issues")).data });

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
  const createAudit = useMutation({
    mutationFn: async () =>
      api.post("/governance/audits", {
        name: audit.name,
        department_id: audit.department_id ? Number(audit.department_id) : null,
        audit_date: audit.audit_date,
        passed: audit.passed === "" ? null : audit.passed === "true",
      }),
    onSuccess: () => {
      setAuditOpen(false);
      qc.invalidateQueries({ queryKey: ["audits"] });
    },
    onError: (e) => setNote(apiError(e)),
  });
  const createIssue = useMutation({
    mutationFn: async () =>
      api.post("/governance/compliance-issues", {
        description: issue.description,
        severity: issue.severity,
        owner_id: Number(issue.owner_id),
        due_date: issue.due_date,
      }),
    onSuccess: () => {
      setIssueOpen(false);
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
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Audits</p>
            {isManager && <Button onClick={() => setAuditOpen(true)}>+ Add</Button>}
          </div>
          <Table head={["Audit", "Date", "Result"]}>
            {audits.data?.map((a) => (
              <tr key={a.id}>
                <Td className="font-medium">{a.name}</Td>
                <Td>{a.audit_date}</Td>
                <Td>
                  {a.passed === null ? <Badge>Pending</Badge> : a.passed ? <Badge tone="green">Passed</Badge> : <Badge tone="rose">Failed</Badge>}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Compliance issues</p>
            {isManager && <Button onClick={() => setIssueOpen(true)}>+ Add</Button>}
          </div>
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
                    isManager && (
                      <Button variant="ghost" onClick={() => resolve.mutate(i.id)}>
                        Resolve
                      </Button>
                    )
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <Modal open={auditOpen} title="Add audit" onClose={() => setAuditOpen(false)}>
        <div className="space-y-3">
          <Field label="Name">
            <Input value={audit.name} onChange={(e) => setAudit({ ...audit, name: e.target.value })} />
          </Field>
          <Field label="Department">
            <Select value={audit.department_id} onChange={(e) => setAudit({ ...audit, department_id: e.target.value })}>
              <option value="">Org-wide</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <Input type="date" value={audit.audit_date} onChange={(e) => setAudit({ ...audit, audit_date: e.target.value })} />
            </Field>
            <Field label="Result">
              <Select value={audit.passed} onChange={(e) => setAudit({ ...audit, passed: e.target.value })}>
                <option value="">Pending</option>
                <option value="true">Passed</option>
                <option value="false">Failed</option>
              </Select>
            </Field>
          </div>
          <Button className="w-full" onClick={() => createAudit.mutate()} disabled={createAudit.isPending}>
            Save audit
          </Button>
        </div>
      </Modal>

      <Modal open={issueOpen} title="Add compliance issue" onClose={() => setIssueOpen(false)}>
        <div className="space-y-3">
          <Field label="Description">
            <Input value={issue.description} onChange={(e) => setIssue({ ...issue, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Severity">
              <Select value={issue.severity} onChange={(e) => setIssue({ ...issue, severity: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </Field>
            <Field label="Due date">
              <Input type="date" value={issue.due_date} onChange={(e) => setIssue({ ...issue, due_date: e.target.value })} />
            </Field>
          </div>
          <Field label="Owner">
            <Select value={issue.owner_id} onChange={(e) => setIssue({ ...issue, owner_id: e.target.value })}>
              <option value="">Select…</option>
              {(employees.data ?? []).map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button className="w-full" onClick={() => createIssue.mutate()} disabled={createIssue.isPending}>
            Save issue
          </Button>
        </div>
      </Modal>
    </div>
  );
}
