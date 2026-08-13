import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Handshake,
  Megaphone,
  UserPlus,
} from "@phosphor-icons/react";
import { api, ApiError } from "@/lib/api";
import type { Ticket, TicketStatus } from "@/lib/types";
import { STATUS_FLOW } from "@/lib/types";
import { formatDateTime, slaRemaining, STATUS_LABEL } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useToast, Button, Card, EscalatedBadge, Modal, Skeleton, StatusBadge, UrgencyBadge } from "@/components/ui";
import { Chat } from "@/components/Chat";
import { TicketTimeline } from "@/components/TicketTimeline";

export function StaffTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { user } = useSession();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmResolve, setConfirmResolve] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.ticketGet(id);
      setTicket(res.ticket);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<void>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast("success", okMsg);
      await load();
    } catch (e) {
      toast("error", e instanceof ApiError ? e.message : "ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const claim = () =>
    act(
      async () => {
        if (user) await api.ticketAssign(id!, user.email);
      },
      "รับงานนี้แล้ว",
    );

  const setStatus = (s: TicketStatus) =>
    act(async () => {
      await api.ticketUpdate(id!, { status: s });
    }, `เปลี่ยนสถานะเป็น ${STATUS_LABEL[s]}`);

  const toggleEscalate = () =>
    act(async () => {
      await api.ticketUpdate(id!, { escalated: !ticket?.escalated });
    }, ticket?.escalated ? "ยกเลิกการ Escalate" : "Escalate งานแล้ว แจ้งผู้ดูแล");

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-zinc-500">{error}</p>
        <Link to="/staff" className="mt-4 inline-block text-sm text-accent hover:underline">
          กลับไปงานในระบบ
        </Link>
      </div>
    );
  }

  if (!ticket || !user) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const sla = slaRemaining(ticket.sla_deadline);
  const nextStatuses = STATUS_FLOW[ticket.status];
  const open = !["Resolved", "Canceled"].includes(ticket.status);
  const isAssignee = ticket.assignee_email === user.email;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
      <Link
        to="/staff"
        className="mb-5 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-accent"
      >
        <ArrowLeft size={16} />
        งานในระบบ
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-zinc-400">#{ticket.id}</span>
        {ticket.escalated && <EscalatedBadge />}
        <UrgencyBadge urgency={ticket.urgency} />
        <StatusBadge status={ticket.status} />
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{ticket.subject}</h1>

      {open && sla.overdue && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <Megaphone size={18} />
          งานนี้เกินกำหนด SLA แล้ว สถานะจะแจ้งไปยังผู้ดูแล
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-zinc-500">รายละเอียด</h2>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">
              {ticket.description}
            </p>
            {ticket.attachment && (
              <a
                href={ticket.attachment.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block"
              >
                <img
                  src={ticket.attachment.url}
                  alt={ticket.attachment.name}
                  className="max-h-72 rounded-xl border border-zinc-100 dark:border-zinc-800"
                />
              </a>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-zinc-500">การสนทนา</h2>
            <Chat ticketId={ticket.id} viewerEmail={user.email} disabled={!open} />
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-zinc-500">จัดการงาน</h2>
            <div className="mt-3 flex flex-col gap-2">
              {!ticket.assignee_email && (
                <Button onClick={() => void claim()} loading={busy} full>
                  <UserPlus size={16} weight="bold" />
                  รับงานนี้
                </Button>
              )}
              {isAssignee && open && (
                <>
                  {nextStatuses.includes("In Progress") && (
                    <Button
                      variant="soft"
                      full
                      onClick={() => void setStatus("In Progress")}
                      loading={busy}
                    >
                      <ArrowRight size={16} />
                      เริ่มดำเนินการ
                    </Button>
                  )}
                  {nextStatuses.includes("Pending Parts") && (
                    <Button
                      variant="soft"
                      full
                      onClick={() => void setStatus("Pending Parts")}
                      loading={busy}
                    >
                      <ArrowRight size={16} />
                      รออะไหล่
                    </Button>
                  )}
                  {nextStatuses.includes("Resolved") && (
                    <Button
                      full
                      onClick={() => setConfirmResolve(true)}
                      loading={busy}
                    >
                      <CheckCircle size={16} weight="bold" />
                      ปิดงาน (เสร็จสิ้น)
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    full
                    onClick={() => void toggleEscalate()}
                    loading={busy}
                  >
                    <Megaphone size={16} />
                    {ticket.escalated ? "ยกเลิก Escalate" : "Escalate งาน"}
                  </Button>
                </>
              )}
              {!isAssignee && ticket.assignee_email && (
                <p className="rounded-xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  ช่างผู้รับ: {ticket.assignee_name}
                </p>
              )}
            </div>
            {open && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400">
                <Handshake size={14} />
                {sla.overdue ? `เกิน SLA ${sla.label}` : `SLA เหลือ ${sla.label}`}
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-zinc-500">สถานะ</h2>
            <div className="mt-3">
              <TicketTimeline status={ticket.status} />
            </div>
          </Card>

          <Card className="p-5 text-sm">
            <h2 className="text-sm font-semibold text-zinc-500">ข้อมูลงาน</h2>
            <dl className="mt-3 flex flex-col gap-2.5">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-400">ผู้แจ้ง</dt>
                <dd className="text-right">
                  {ticket.reporter_name}
                  <span className="block text-xs text-zinc-400">{ticket.reporter_email}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-400">หมวด</dt>
                <dd>{ticket.category}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-400">ครุภัณฑ์</dt>
                <dd>{ticket.asset_tag ?? "-"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-400">แจ้งเมื่อ</dt>
                <dd>{formatDateTime(ticket.opened_at)}</dd>
              </div>
              {ticket.assigned_at && (
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-400">รับงานเมื่อ</dt>
                  <dd>{formatDateTime(ticket.assigned_at)}</dd>
                </div>
              )}
              {ticket.resolved_at && (
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-400">เสร็จเมื่อ</dt>
                  <dd>{formatDateTime(ticket.resolved_at)}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>

      <Modal open={confirmResolve} onClose={() => setConfirmResolve(false)} title="ปิดงานนี้">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          ยืนยันว่าแก้ไขเสร็จสิ้น? ระบบจะแจ้งให้ผู้แจ้งทราบและเปิดให้ประเมินความพึงพอใจ
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmResolve(false)}>
            กลับ
          </Button>
          <Button onClick={() => void setStatus("Resolved")} loading={busy}>
            <CheckCircle size={16} weight="bold" />
            เสร็จสิ้น
          </Button>
        </div>
      </Modal>
    </div>
  );
}
