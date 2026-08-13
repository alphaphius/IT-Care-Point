import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellRinging } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import type { NotificationItem } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useToast } from "@/components/ui";
export function Notifications() {
  const { status } = useSession();
  const toast = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());

  const poll = useCallback(async () => {
    try {
      const res = await api.notificationsList();
      setItems((prev) => {
        const merged = new Map<string, NotificationItem>();
        for (const n of res.items) merged.set(n.id, n);
        for (const n of prev) if (!merged.has(n.id)) merged.set(n.id, n);
        return [...merged.values()].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 30);
      });
      const fresh = res.items.filter((n) => !seenRef.current.has(n.id));
      fresh.forEach((n) => {
        seenRef.current.add(n.id);
        if (n.body) toast("info", n.body);
      });
    } catch {
      /* silent: polling failure is fine */
    }
  }, [toast]);

  useEffect(() => {
    if (status !== "ready") return;
    void poll();
    const t = window.setInterval(poll, 30000);
    return () => window.clearInterval(t);
  }, [status, poll]);

  const unread = items.filter((n) => !n.read).length;

  const markAll = async () => {
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    if (ids.length === 0) return;
    await api.notificationsMarkRead(ids);
    setItems((p) => p.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void markAll();
        }}
        className="relative rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        aria-label="การแจ้งเตือน"
      >
        {unread > 0 ? (
          <>
            <BellRinging size={20} />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unread}
            </span>
          </>
        ) : (
          <Bell size={20} />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
              การแจ้งเตือน
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-500">
                  ยังไม่มีการแจ้งเตือน
                </p>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    className={`border-b border-zinc-50 px-4 py-3 last:border-0 dark:border-zinc-800/60 ${n.read ? "opacity-60" : ""}`}
                  >
                    <p className="text-sm leading-snug">{n.body}</p>
                    <p className="mt-1 text-xs text-zinc-400">{timeAgo(n.ts)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
