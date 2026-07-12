import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "../lib/api";
import { Badge, Button, Card, PageHeader } from "../components/ui";

type Reward = { id: number; name: string; description: string | null; points_required: number; stock: number };

/** Rewards module: browse the catalog and redeem with points. */
export default function Rewards() {
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const rewards = useQuery({
    queryKey: ["rewards"],
    queryFn: async () => (await api.get<Reward[]>("/rewards")).data,
  });

  const redeem = useMutation({
    mutationFn: async (id: number) => api.post(`/rewards/${id}/redeem`),
    onSuccess: () => {
      setNote("Reward redeemed — points deducted.");
      qc.invalidateQueries({ queryKey: ["rewards"] });
    },
    onError: (e) => setNote(apiError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Rewards" subtitle="Spend your points on rewards from the catalog." />
      {note && <p className="text-sm text-brand-700">{note}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.data?.map((r) => (
          <Card key={r.id}>
            <div className="flex items-start justify-between">
              <p className="font-medium text-slate-800">{r.name}</p>
              <Badge tone={r.stock > 0 ? "green" : "rose"}>
                {r.stock > 0 ? `${r.stock} left` : "Out of stock"}
              </Badge>
            </div>
            <p className="mt-1 min-h-[2.5rem] text-sm text-slate-500">{r.description ?? ""}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-lg font-bold text-brand-700">{r.points_required} pts</span>
              <Button disabled={r.stock <= 0 || redeem.isPending} onClick={() => redeem.mutate(r.id)}>
                Redeem
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
