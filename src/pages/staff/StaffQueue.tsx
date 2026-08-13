import { useCallback, useEffect, useState } from "react";
import { ClipboardText } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import type { Ticket, TicketStatus } from "@/lib/types";
import { slaRemaining } from "@/lib/format";
import { useSession } from "@/lib/session";
import { EmptyState, PageSkeleton } from "@/components/ui";
import { TicketCard } from "@/components/TicketCard";

type Scope = "queue" | "mine" | "all";
type StatusFilter = "all" | "open" | TicketStatus;

export function StaffQueue() {
  const { user } = useSession();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [scope, setScope] = useState<Scope>("queue");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.ticketsList("all");
      setTickets(res.tickets);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(load, 20000);
    return () => window.clearInterval(t);
  }, [load]);

  const filtered =
    tickets?.filter((t) => {
      if (scope === "mine" && t.assignee_email !== user?.email) return false;
      if (scope === "queue" && t.assignee_email && t.assignee_email !== user?.email) return false;
      if (status === "all") return true;
      if (status === "open") return !["Resolved", "Canceled"].includes(t.status);
      return t.status === status;
    }) ?? [];

  if (!tickets) return <PageSkeleton />;

  const queueCount = tickets.filter((t) => ["Received", "In Progress", "Pending Parts"].includes(t.status)).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">งานในระบบ</h1>
        <p className="mt-1 text-sm text-zinc-500">
          งานเปิดทั้งหมด {queueCount} รายการ · {tickets.filter((t) => t.escalated).length} รายการเกิน SLA
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {(
          [
            ["queue", "คิวงาน"],
            ["mine", "งานของฉัน"],
            ["all", "ทั้งหมด"],
          ] as [Scope, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setScope(v)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              scope === v
                ? "bg-accent-soft text-accent"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
        {(
          [
            ["open", "เปิด"],
            ["Received", "รับเรื่อง"],
            ["In Progress", "กำลังทำ"],
            ["Pending Parts", "รออะไหล่"],
            ["Resolved", "เสร็จ"],
          ] as [StatusFilter, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setStatus(v)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              status === v
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {!error && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <EmptyState
            icon={<ClipboardText size={26} />}
            title="ไม่มีงาน"
            body="งานทั้งหมดถูกจัดการแล้ว ลองเปลี่ยนตัวกรองดู"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((t) => (
          <TicketRow key={t.id} ticket={t} viewerEmail={user?.email ?? ""} />
        ))}
      </div>
    </div>
  );
}

function TicketRow({ ticket, viewerEmail }: { ticket: Ticket; viewerEmail: string }) {
  const sla = slaRemaining(ticket.sla_deadline);
  const open = !["Resolved", "Canceled"].includes(ticket.status);
  return (
    <div className="flex flex-col gap-2">
      <TicketCard ticket={ticket} detailPath="/staff/tickets" />
      {open && (
        <div className="flex items-center justify-between px-1">
          <span
            className={`font-mono text-[11px] font-medium ${
              sla.overdue ? "text-red-600 dark:text-red-400" : "text-zinc-400"
            }`}
          >
            {sla.overdue ? "เกินกำหนด SLA" : `SLA เหลือ ${sla.label}`}
          </span>
          {!ticket.assignee_email && (
            <span className="text-[11px] font-medium text-accent">ยังไม่มีช่างรับ</span>
          )}
          {ticket.assignee_email && ticket.assignee_email !== viewerEmail && (
            <span className="text-[11px] text-zinc-400">ช่าง {ticket.assignee_name}</span>
          )}
        </div>
      )}
    </div>
  );
}
