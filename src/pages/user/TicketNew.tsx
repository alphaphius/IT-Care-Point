import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Image, FilmSlate, Cube, Trash, PaperPlaneTilt } from "@phosphor-icons/react";
import { Button, Card, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { CATEGORIES, URGENCIES, type Category, type Urgency } from "@/lib/types";

const MAX_FILE = 10 * 1024 * 1024;

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function TicketNew() {
  const nav = useNavigate();
  const toast = useToast();
  const [category, setCategory] = useState<Category>("Hardware");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [attach, setAttach] = useState<{ name: string; kind: "image" | "video" } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE) {
      toast("error", "ไฟล์ต้องไม่เกิน 10 MB");
      return;
    }
    setAttach({ name: f.name, kind: f.type.startsWith("video/") ? "video" : "image" });
    setPendingFile(f);
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (subject.trim().length < 4) e.subject = "กรุณากรอกหัวข้อปัญหา";
    if (description.trim().length < 10) e.description = "กรอกรายละเอียดอย่างน้อย 10 ตัวอักษร";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      let attachment;
      if (pendingFile) {
        attachment = {
          name: pendingFile.name,
          kind: pendingFile.type.startsWith("video/") ? "video" : "image",
          data: await readAsBase64(pendingFile),
        };
      }
      const res = await api.ticketCreate({
        subject: subject.trim(),
        category,
        urgency,
        description: description.trim(),
        asset_tag: assetTag.trim() || undefined,
        attachment,
      });
      toast("success", "แจ้งซ่อมสำเร็จ");
      nav(`/app/tickets/${res.ticket.id}`);
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "ส่งข้อมูลไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:py-10">
      <button
        onClick={() => nav(-1)}
        className="mb-5 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-accent"
      >
        <ArrowLeft size={16} />
        ย้อนกลับ
      </button>
      <h1 className="text-2xl font-semibold tracking-tight">แจ้งซ่อมใหม่</h1>
      <p className="mt-1 text-sm text-zinc-500">
        ระบุปัญหาที่พบให้ละเอียดที่สุด เพื่อให้ทีม IT จัดการได้เร็วขึ้น
      </p>

      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <Field label="ประเภทปัญหา" required>
            <Select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === "Hardware" ? "ฮาร์ดแวร์" : c === "Software" ? "ซอฟต์แวร์" : c === "Network" ? "เครือข่าย" : "อื่น ๆ"}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="ความเร่งด่วน" required>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {URGENCIES.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => setUrgency(u.value)}
                  className={`flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    urgency === u.value
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span className="text-sm font-semibold">{u.label}</span>
                  <span className="text-[11px] opacity-70">{u.hint}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="หัวข้อปัญหา" required error={errors.subject}>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="เช่น คอมพิวเตอร์เปิดไม่ติด"
            />
          </Field>

          <Field label="รายละเอียด" required error={errors.description}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="อธิบายอาการ, ข้อความ error, สิ่งที่ทำไปแล้ว..."
            />
          </Field>

          <Field label="รหัสครุภัณฑ์ (ไม่บังคับ)" hint="ถ้ามีติดอยู่ที่ตัวเครื่อง กรอกเพื่อผูกประวัติการซ่อม">
            <div className="relative">
              <Cube size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                placeholder="เช่น CPU-0012 หรือสแกน QR"
                className="pl-10"
              />
            </div>
          </Field>

          <Field label="แนบรูป/วิดีโอ (ไม่บังคับ)" hint="สูงสุด 10 MB ต่อไฟล์">
            {attach ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
                <span className="flex items-center gap-2">
                  {attach.kind === "image" ? <Image size={18} /> : <FilmSlate size={18} />}
                  {attach.name}
                </span>
                <button
                  onClick={() => {
                    setAttach(null);
                    setPendingFile(null);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                  className="rounded-full p-1.5 text-accent hover:bg-accent-soft-strong"
                  aria-label="ลบไฟล์"
                >
                  <Trash size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 transition-colors hover:border-accent hover:text-accent dark:border-zinc-700"
              >
                <Image size={18} />
                คลิกเพื่อเลือกไฟล์รูปภาพหรือวิดีโอ
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </Field>

          <Button size="lg" onClick={() => void submit()} loading={submitting}>
            <PaperPlaneTilt size={18} weight="bold" />
            ส่งแจ้งซ่อม
          </Button>
        </div>
      </Card>
    </div>
  );
}
