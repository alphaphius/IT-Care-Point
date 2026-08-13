import { Link } from "react-router-dom";
import { CaretRight } from "@phosphor-icons/react";
import type { Ticket } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { EscalatedBadge, StatusBadge, UrgencyBadge } from "@/components/ui";

export function TicketCard({ ticket, detailPath }: { ticket: Ticket; detailPath: string }) {
  return (
    <Link
      to={`${detailPath}/${ticket.id}`}
      className="group rounded-2xl border border-zinc-200 bg-white p-4 transition-all hover:border-accent/40 hover:shadow-md hover:shadow-black/[0.04] dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-zinc-400">#{ticket.id}</span>
            {ticket.escalated && <EscalatedBadge />}
          </div>
          <h3 className="mt-1 truncate text-[15px] font-semibold leading-snug">
            {ticket.subject}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
            {ticket.description}
          </p>
        </div>
        <CaretRight
          size={18}
          className="mt-1 shrink-0 text-zinc-300 transition-colors group-hover:text-accent"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <UrgencyBadge urgency={ticket.urgency} />
        <StatusBadge status={ticket.status} />
        {ticket.assignee_name && (
          <span className="ml-auto text-xs text-zinc-400">
            ช่าง: {ticket.assignee_name}
          </span>
        )}
      </div>
      <p className="mt-2 text-[11px] text-zinc-400">{formatDateTime(ticket.opened_at)}</p>
    </Link>
  );
}
