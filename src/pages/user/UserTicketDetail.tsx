import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Star, XCircle } from "@phosphor-icons/react";
import { api, ApiError } from "@/lib/api";
import type { Ticket } from "@/lib/types";
import { formatDateTime, slaRemaining } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useToast, Button, Card, EscalatedBadge, Modal, Skeleton, StatusBadge, Textarea, UrgencyBadge } from "@/components/ui";
import { Chat } from "@/components/Chat";
import { TicketTimeline } from "@/components/TicketTimeline";

export function UserTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { user } = useSession();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-zinc-500">{error}</p>
        <Link to="/app" className="mt-4 inline-block text-sm text-accent hover:underline">
          กลับไปงานของฉัน
        </Link>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const sla = slaRemaining(ticket.sla_deadline);
  const canChat = !["Resolved", "Canceled"].includes(ticket.status);
  const isReporter = user?.email === ticket.reporter_email;
  const canCancel = isReporter && ["Received", "In Progress"].includes(ticket.status);

  const cancelTicket = async () => {
    setSubmitting(true);
    try {
      const res = await api.ticketUpdate(ticket.id, { status: "Canceled" });
      setTicket(res.ticket);
      toast("success", "ยกเลิกงานแล้ว");
    } catch (e) {
      toast("error", e instanceof ApiError ? e.message : "ยกเลิกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
      setConfirmCancel(false);
    }
  };

  const submitRating = async () => {
    if (rating === 0) {
      toast("info", "กรุณาเลือกคะแนน");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.ticketUpdate(ticket.id, {
        rating,
        feedback: feedback.trim(),
      });
      setTicket(res.ticket);
      toast("success", "บันทึกความพึงพอใจแล้ว ขอบคุณครับ");
    } catch (e) {
      toast("error", e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
      <Link
        to="/app"
        className="mb-5 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-accent"
      >
        <ArrowLeft size={16} />
        งานของฉัน
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-zinc-400">#{ticket.id}</span>
        {ticket.escalated && <EscalatedBadge />}
        <UrgencyBadge urgency={ticket.urgency} />
        <StatusBadge status={ticket.status} />
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{ticket.subject}</h1>

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

          {ticket.status === "Resolved" && !ticket.rating && (
            <Card className="p-5">
              <h2 className="text-base font-semibold">ประเมินความพึงพอใจ</h2>
              <p className="mt-1 text-sm text-zinc-500">
                งานนี้เสร็จแล้ว ทีมงานเป็นอย่างไรบ้าง?
              </p>
              <div className="mt-3 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRating(s)}
                    className="p-0.5 text-2xl transition-transform active:scale-90"
                    aria-label={`คะแนน ${s}`}
                  >
                    <Star
                      size={28}
                      weight={s <= rating ? "fill" : "regular"}
                      className={s <= rating ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="ข้อเสนอแนะเพิ่มเติม (ไม่บังคับ)"
                className="mt-3"
              />
              <Button className="mt-3" onClick={() => void submitRating()} loading={submitting}>
                ส่งคะแนน
              </Button>
            </Card>
          )}

          {ticket.rating && (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
                ความพึงพอใจของคุณ
                <span className="flex items-center gap-0.5 text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={16} weight={s <= ticket.rating! ? "fill" : "regular"} className="text-amber-400" />
                  ))}
                </span>
              </h2>
              {ticket.feedback && (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{ticket.feedback}</p>
              )}
            </Card>
          )}

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-zinc-500">การสนทนา</h2>
            <Chat
              ticketId={ticket.id}
              viewerEmail={user?.email ?? ""}
              disabled={!canChat}
            />
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-zinc-500">สถานะ</h2>
            <div className="mt-3">
              <TicketTimeline status={ticket.status} />
            </div>
            {ticket.sla_deadline && !["Resolved", "Canceled"].includes(ticket.status) && (
              <div
                className={`mt-4 rounded-xl px-3 py-2 text-sm ${
                  sla.overdue
                    ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                    : "bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {sla.overdue ? "เกินกำหนด SLA แล้ว" : `SLA เหลือ ${sla.label}`}
              </div>
            )}
            {canCancel && (
              <Button
                variant="outline"
                full
                className="mt-4 text-red-600 hover:border-red-300 hover:text-red-600 dark:hover:border-red-500/40"
                onClick={() => setConfirmCancel(true)}
              >
                <XCircle size={16} />
                ยกเลิกงานนี้
              </Button>
            )}
          </Card>

          <Card className="p-5 text-sm">
            <h2 className="text-sm font-semibold text-zinc-500">ข้อมูลงาน</h2>
            <dl className="mt-3 flex flex-col gap-2.5">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-400">ผู้แจ้ง</dt>
                <dd className="text-right">{ticket.reporter_name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-400">หมวด</dt>
                <dd>{ticket.category}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-400">ความเร่งด่วน</dt>
                <dd>{ticket.urgency}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-400">ช่างผู้รับ</dt>
                <dd>{ticket.assignee_name ?? "ยังไม่ได้รับมอบ"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-400">แจ้งเมื่อ</dt>
                <dd>{formatDateTime(ticket.opened_at)}</dd>
              </div>
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

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="ยืนยันการยกเลิก">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          ต้องการยกเลิกงาน #{ticket.id} ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
            กลับ
          </Button>
          <Button variant="danger" onClick={() => void cancelTicket()} loading={submitting}>
            ยกเลิกงาน
          </Button>
        </div>
      </Modal>
    </div>
  );
}
