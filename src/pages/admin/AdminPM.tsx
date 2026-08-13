import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, CheckCircle, Plus } from "@phosphor-icons/react";
import { Button, Card, EmptyState, Field, Input, Modal, PageSkeleton, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { PMTask } from "@/lib/types";
import { formatDate } from "@/lib/format";

export function AdminPM() {
  const toast = useToast();
  const [items, setItems] = useState<PMTask[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.pmList();
      setItems(res.items);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "โหลดไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const complete = async (id: string) => {
    try {
      await api.pmComplete(id);
      await load();
      toast("success", "บันทึกการบำรุงรักษาแล้ว");
    } catch (e) {
      toast("error", e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ");
    }
  };

  if (!items) return <PageSkeleton />;

  const overdue = items.filter((i) => i.next_due && new Date(i.next_due) < new Date()).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">งานบำรุงรักษาเชิงป้องกัน</h1>
          <p className="mt-1 text-sm text-zinc-500">
            งาน PM ทั้งหมด {items.length} รายการ · ถึงกำหนดแล้ว {overdue} รายการ
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} weight="bold" />
          เพิ่มงาน PM
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {!error && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <EmptyState
            icon={<CalendarCheck size={26} />}
            title="ยังไม่มีงาน PM"
            body="เพิ่มกำหนดการ เช่น อัปเดตซอฟต์แวร์รอบปี หรือตรวจเช็กเซิร์ฟเวอร์ประจำเดือน"
            action={<Button onClick={() => setAddOpen(true)}>เพิ่มงาน PM</Button>}
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {items.map((i) => {
          const due = new Date(i.next_due);
          const isDue = due < new Date();
          return (
            <Card key={i.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-zinc-400">#{i.id}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      isDue
                        ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    }`}
                  >
                    {isDue ? "ถึงกำหนดแล้ว" : "ปกติ"}
                  </span>
                </div>
                <h3 className="mt-1 text-[15px] font-semibold">{i.title}</h3>
                <p className="text-sm text-zinc-500">{i.scope}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  ทุก {i.cadence_days} วัน · ล่าสุด {formatDate(i.last_run)} · ครบกำหนด{" "}
                  {formatDate(i.next_due)}
                </p>
              </div>
              {isDue && (
                <Button
                  variant="soft"
                  size="sm"
                  className="shrink-0"
                  onClick={() => void complete(i.id)}
                >
                  <CheckCircle size={15} weight="bold" />
                  ทำแล้ว
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <AddPMModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          void load();
        }}
      />
    </div>
  );
}

function AddPMModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({ title: "", scope: "", cadence_days: "30" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (form.title.trim().length < 3) {
      setError("กรอกชื่องาน PM");
      return;
    }
    setBusy(true);
    try {
      await api.pmCreate({
        title: form.title.trim(),
        scope: form.scope.trim(),
        cadence_days: Math.max(1, Number(form.cadence_days) || 30),
      });
      toast("success", "เพิ่มงาน PM แล้ว");
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="เพิ่มงาน PM">
      <div className="flex flex-col gap-4">
        <Field label="ชื่องาน" required>
          <Input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="อัปเดตซอฟต์แวร์รอบปี"
          />
        </Field>
        <Field label="ขอบเขตงาน">
          <Input
            value={form.scope}
            onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value }))}
            placeholder="คอมพิวเตอร์สำนักงานทั้งหมด"
          />
        </Field>
        <Field label="รอบการทำงาน (วัน)" required>
          <Input
            type="number"
            min={1}
            value={form.cadence_days}
            onChange={(e) => setForm((p) => ({ ...p, cadence_days: e.target.value }))}
            className="font-mono"
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            บันทึก
          </Button>
        </div>
      </div>
    </Modal>
  );
}
