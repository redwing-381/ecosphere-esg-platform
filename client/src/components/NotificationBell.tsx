import { useEffect } from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

interface Notification {
  id: number;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

/** Header bell showing unread count with a dropdown of recent notifications. */
export default function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get<Notification[]>("/notifications")).data,
    refetchInterval: 30000,
  });
  const unread = notifications.filter((n) => !n.is_read).length;

  const markAllRead = useMutation({
    mutationFn: async () => api.post("/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // Opening the tray clears the unread badge by marking everything read.
  useEffect(() => {
    if (open && unread > 0 && !markAllRead.isPending) {
      markAllRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="relative">
      <button
        className="relative rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700">
            Notifications
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">You're all caught up.</p>
            ) : (
              notifications.slice(0, 15).map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-slate-50 px-4 py-2.5 text-sm last:border-0 ${
                    n.is_read ? "text-slate-500" : "bg-brand-50/40 text-slate-700"
                  }`}
                >
                  {n.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
