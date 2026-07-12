import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useDepartments, useProfile } from "../lib/hooks";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  SectionHeader,
  Select,
  Table,
  Td,
} from "../components/ui";
import { Donut, RankBar } from "../components/charts";
import { CHART } from "../lib/theme";
import { CheckCircle2 } from "../components/icons";

type Policy = { id: number; name: string; pillar: string; version: number; requires_ack: boolean; acknowledged: boolean };
type Audit = { id: number; name: string; department_id: number | null; audit_date: string; passed: boolean | null };
type Issue = {
  id: number;
  severity: string;
  description: string;
  owner_id: number;
  owner_name: string | null;
  created_by: number | null;
  created_by_name: string | null;
  due_date: string;
  status: string;
  is_overdue: boolean;
};

const sevTone: Record<string, string> = { critical: "rose", high: "rose", medium: "amber", low: "slate" };
const isManagerRole = (r?: string) => r === "admin" || r === "dept_head";
const today = () => new Date().toISOString().slice(0, 10);

/** Governance module: policies, audits and compliance issues. */
export default function Governance() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const isManager = isManagerRole(user?.role);
  const participates = profile?.employee_id != null;
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const departments = useDepartments();
  const [audit, setAudit] = useState({ name: "", department_id: "", audit_date: today() });
  const [issue, setIssue] = useState({ description: "", severity: "medium", due_date: today() });

  const policies = useQuery({ queryKey: ["policies"], queryFn: async () => (await api.get<Policy[]>("/governance/policies")).data });
  const audits = useQuery({ queryKey: ["audits"], queryFn: async () => (await api.get<Audit[]>("/governance/audits")).data });
  const issues = useQuery({ queryKey: ["issues"], queryFn: async () => (await api.get<Issue[]>("/governance/compliance-issues")).data });

  const ack = useMutation({
    mutationFn: async (id: number) => api.post(`/governance/policies/${id}/acknowledge`),
    onSuccess: () => {
      setNote("Policy acknowledged.");
      qc.invalidateQueries({ queryKey: ["policies"] });
    },
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
  const setResult = useMutation({
    mutationFn: async ({ id, passed }: { id: number; passed: boolean | null }) =>
      api.patch(`/governance/audits/${id}`, { passed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audits"] }),
    onError: (e) => setNote(apiError(e)),
  });
  const createAudit = useMutation({
    mutationFn: async () =>
      api.post("/governance/audits", {
        name: audit.name,
        department_id: audit.department_id ? Number(audit.department_id) : null,
        audit_date: audit.audit_date,
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
        due_date: issue.due_date,
      }),
    onSuccess: () => {
      setIssueOpen(false);
      setIssue({ description: "", severity: "medium", due_date: today() });
      qc.invalidateQueries({ queryKey: ["issues"] });
    },
    onError: (e) => setNote(apiError(e)),
  });
  const updateIssue = useMutation({
    mutationFn: async () =>
      api.patch(`/governance/compliance-issues/${editingIssue!.id}`, {
        description: editingIssue!.description,
        severity: editingIssue!.severity,
        due_date: editingIssue!.due_date,
      }),
    onSuccess: () => {
      setEditingIssue(null);
      qc.invalidateQueries({ queryKey: ["issues"] });
    },
    onError: (e) => setNote(apiError(e)),
  });
  const deleteIssue = useMutation({
    mutationFn: async (id: number) => api.delete(`/governance/compliance-issues/${id}`),
    onSuccess: () => {
      setNote("Issue deleted.");
      qc.invalidateQueries({ queryKey: ["issues"] });
    },
    onError: (e) => setNote(apiError(e)),
  });

  const canResolve = (i: Issue) => isManager || profile?.employee_id === i.owner_id;
  const canModify = (i: Issue) => isManager || profile?.employee_id === i.created_by;

  const auditData = audits.data ?? [];
  const auditSlices = [
    { label: "Passed", value: auditData.filter((a) => a.passed === true).length, color: CHART.env },
    { label: "Failed", value: auditData.filter((a) => a.passed === false).length, color: CHART.rose },
    { label: "Pending", value: auditData.filter((a) => a.passed === null).length, color: CHART.slate },
  ];
  const openIssueData = (issues.data ?? []).filter((i) => i.status !== "resolved");
  const sevOrder = ["critical", "high", "medium", "low"];
  const sevColor: Record<string, string> = {
    critical: CHART.rose,
    high: "#f97316",
    medium: CHART.amber,
    low: CHART.slate,
  };
  const sevCounts = sevOrder.map((s) => openIssueData.filter((i) => i.severity === s).length);

  return (
    <div className="space-y-6">
      <PageHeader title="Governance" subtitle="Acknowledge policies and track audits and compliance issues." />
      {note && <p className="text-sm text-brand-700">{note}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Audit results" subtitle={`${auditData.length} audits`}>
          <Donut data={auditSlices} height={220} />
        </Card>
        <Card title="Open issues by severity" subtitle={`${openIssueData.length} open`}>
          <RankBar
            categories={sevOrder.map((s) => s[0].toUpperCase() + s.slice(1))}
            values={sevCounts}
            colors={sevOrder.map((s) => sevColor[s])}
            height={220}
            valueLabel="Open issues"
          />
        </Card>
      </div>

      <div>
        <SectionHeader title="Policies" />
        <Table head={["Policy", "Pillar", "Version", ""]} scroll>
          {policies.data?.map((p) => (
            <tr key={p.id}>
              <Td className="font-medium">{p.name}</Td>
              <Td className="capitalize">{p.pillar}</Td>
              <Td>v{p.version}</Td>
              <Td>
                {!p.requires_ack ? (
                  <span className="text-xs text-slate-400">No acknowledgement needed</span>
                ) : p.acknowledged ? (
                  <Badge tone="green">Acknowledged ✓</Badge>
                ) : participates ? (
                  <Button variant="ghost" onClick={() => ack.mutate(p.id)}>
                    Acknowledge
                  </Button>
                ) : (
                  <Badge tone="amber">Awaiting acknowledgement</Badge>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Audits</p>
          {isManager && <Button onClick={() => setAuditOpen(true)}>+ Add audit</Button>}
        </div>
        <Table head={["Audit", "Date", "Result"]} scroll>
          {audits.data?.map((a) => (
            <tr key={a.id}>
              <Td className="font-medium">{a.name}</Td>
              <Td>{a.audit_date}</Td>
              <Td>
                {isManager ? (
                  <Select
                    className="w-36"
                    value={a.passed === null ? "" : a.passed ? "true" : "false"}
                    onChange={(e) =>
                      setResult.mutate({ id: a.id, passed: e.target.value === "" ? null : e.target.value === "true" })
                    }
                  >
                    <option value="">Pending</option>
                    <option value="true">Passed</option>
                    <option value="false">Failed</option>
                  </Select>
                ) : a.passed === null ? (
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
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Compliance issues</p>
          {participates && <Button onClick={() => setIssueOpen(true)}>+ Raise issue</Button>}
        </div>
        <Table head={["Issue", "Severity", "Assigned to", "Raised by", "Due", ""]} scroll>
          {issues.data?.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <EmptyState title="No compliance issues" hint="You're fully compliant." Icon={CheckCircle2} />
              </td>
            </tr>
          ) : (
            issues.data?.map((i) => (
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
                <Td>{i.owner_name ?? "—"}</Td>
                <Td>{i.created_by_name ?? "—"}</Td>
                <Td>{i.due_date}</Td>
                <Td>
                  <div className="flex gap-2">
                    {i.status === "resolved" ? (
                      <Badge tone="green">Resolved</Badge>
                    ) : (
                      canResolve(i) && (
                        <Button variant="ghost" onClick={() => resolve.mutate(i.id)}>
                          Resolve
                        </Button>
                      )
                    )}
                    {canModify(i) && i.status !== "resolved" && (
                      <Button variant="ghost" onClick={() => setEditingIssue(i)}>
                        Edit
                      </Button>
                    )}
                    {canModify(i) && (
                      <Button
                        variant="danger"
                        onClick={() => {
                          if (confirm("Delete this compliance issue?")) deleteIssue.mutate(i.id);
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))
          )}
        </Table>
      </Card>

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
          <Field label="Date">
            <Input type="date" value={audit.audit_date} onChange={(e) => setAudit({ ...audit, audit_date: e.target.value })} />
          </Field>
          <p className="text-xs text-slate-400">Set the pass/fail result from the audits table once completed.</p>
          <Button className="w-full" onClick={() => createAudit.mutate()} disabled={createAudit.isPending}>
            Save audit
          </Button>
        </div>
      </Modal>

      <Modal open={issueOpen} title="Raise compliance issue" onClose={() => setIssueOpen(false)}>
        <div className="space-y-3">
          <p className="text-xs text-slate-500">The issue is raised under your name and assigned to you.</p>
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
          <Button
            className="w-full"
            onClick={() => createIssue.mutate()}
            disabled={createIssue.isPending || issue.description.trim().length < 3}
          >
            Save issue
          </Button>
        </div>
      </Modal>

      <Modal open={!!editingIssue} title="Edit compliance issue" onClose={() => setEditingIssue(null)}>
        {editingIssue && (
          <div className="space-y-3">
            <Field label="Description">
              <Input
                value={editingIssue.description}
                onChange={(e) => setEditingIssue({ ...editingIssue, description: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Severity">
                <Select
                  value={editingIssue.severity}
                  onChange={(e) => setEditingIssue({ ...editingIssue, severity: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </Field>
              <Field label="Due date">
                <Input
                  type="date"
                  value={editingIssue.due_date}
                  onChange={(e) => setEditingIssue({ ...editingIssue, due_date: e.target.value })}
                />
              </Field>
            </div>
            <Button className="w-full" onClick={() => updateIssue.mutate()} disabled={updateIssue.isPending}>
              Save changes
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
