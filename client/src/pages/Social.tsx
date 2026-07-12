import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "../lib/api";
import { Badge, Button, Card, PageHeader, Table, Td } from "../components/ui";

type CSR = {
  id: number;
  name: string;
  activity_date: string;
  xp_reward: number;
  points_reward: number;
  capacity: number | null;
};
type Training = { id: number; name: string; mandatory: boolean };

/** Social module: CSR activities to join and trainings to complete. */
export default function Social() {
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const csr = useQuery({
    queryKey: ["csr"],
    queryFn: async () => (await api.get<CSR[]>("/social/csr-activities")).data,
  });
  const trainings = useQuery({
    queryKey: ["trainings"],
    queryFn: async () => (await api.get<Training[]>("/social/trainings")).data,
  });

  const join = useMutation({
    mutationFn: async (id: number) => api.post(`/social/csr-activities/${id}/join`),
    onSuccess: () => setNote("Joined activity — awaiting approval for rewards."),
    onError: (e) => setNote(apiError(e)),
  });
  const complete = useMutation({
    mutationFn: async (id: number) => api.post(`/social/trainings/${id}/complete`),
    onSuccess: () => {
      setNote("Training marked complete.");
      qc.invalidateQueries({ queryKey: ["trainings"] });
    },
    onError: (e) => setNote(apiError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Social" subtitle="Join CSR activities and complete trainings to earn XP and points." />
      {note && <p className="text-sm text-brand-700">{note}</p>}

      <div>
        <p className="mb-3 text-sm font-medium text-slate-700">CSR activities</p>
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
        <p className="mb-3 text-sm font-medium text-slate-700">Trainings</p>
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
    </div>
  );
}
