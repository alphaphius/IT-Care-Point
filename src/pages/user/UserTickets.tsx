import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Ticket as TicketIcon } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import type { Ticket, TicketStatus } from "@/lib/types";
import { useSession } from "@/lib/session";
import { Button, EmptyState, PageSkeleton } from "@/components/ui";
import { TicketCard } from "@/components/TicketCard";

type Filter = "all" | "open" | TicketStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "open", label: "ระหว่างดำเนินการ" },
  { value: "Resolved", label: "เสร็จสิ้น" },
  { value: "Canceled", label: "ยกเลิก" },
];

export function UserTickets() {
  const { user } = useSession();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.ticketsList("mine");
      setTickets(res.tickets);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered =
    tickets?.filter((t) => {
      if (filter === "all") return true;
      if (filter === "open") return !["Resolved", "Canceled"].includes(t.status);
      return t.status === filter;
    }) ?? [];

  if (!tickets) return <PageSkeleton />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">งานของฉัน</h1>
          <p className="mt-1 text-sm text-zinc-500">
            สวัสดี {user?.name} · แจ้งซ่อมและติดตามสถานะได้ที่นี่
          </p>
        </div>
        <Link to="/app/new">
          <Button>
            <Plus size={16} weight="bold" />
            แจ้งซ่อมใหม่
          </Button>
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-accent-soft text-accent"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {f.label}
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
            icon={<TicketIcon size={26} />}
            title={tickets.length === 0 ? "ยังไม่มีงานแจ้งซ่อม" : "ไม่มีงานในหมวดนี้"}
            body={
              tickets.length === 0
                ? "พบปัญหาอุปกรณ์หรือระบบ ให้แจ้งซ่อมได้ทันที"
                : "ลองเปลี่ยนหมวดเพื่อดูงานอื่น"
            }
            action={
              tickets.length === 0 ? (
                <Link to="/app/new">
                  <Button>แจ้งซ่อมใหม่</Button>
                </Link>
              ) : undefined
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((t) => (
          <TicketCard key={t.id} ticket={t} detailPath="/app/tickets" />
        ))}
      </div>
    </div>
  );
}
