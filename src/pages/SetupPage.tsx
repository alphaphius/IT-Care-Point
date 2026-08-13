import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Palette, FloppyDisk, ArrowLeft } from "@phosphor-icons/react";
import { Button, Field, Input } from "@/components/ui";
import { applyConfig, isHexColor, loadConfig, saveConfig } from "@/lib/config";
import { useToast } from "@/components/ui";

const ACCENTS = [
  "#0f766e",
  "#2563eb",
  "#059669",
  "#b45309",
  "#e11d48",
  "#7c3aed",
  "#475569",
];

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function SetupPage() {
  const nav = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(() => {
    const c = loadConfig();
    return { ...c };
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previewVisible = useMemo(
    () => !form.logoUrl || form.logoUrl.startsWith("data:"),
    [form.logoUrl],
  );

  const onLogoFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 512 * 1024) {
      toast("error", "ไฟล์โลโก้ต้องไม่เกิน 512 KB");
      return;
    }
    const url = await readAsDataUrl(f);
    setForm((p) => ({ ...p, logoUrl: url }));
  };

  const save = async () => {
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(form.apiUrl.trim())) {
      setError("URL API ต้องอยู่ในรูปแบบ https://script.google.com/macros/s/.../exec");
      return;
    }
    if (form.appName.trim().length < 2) {
      setError("กรุณากรอกชื่อแอป");
      return;
    }
    if (!isHexColor(form.accent)) {
      setError("สีหลักต้องเป็นรหัส Hex เช่น #0f766e");
      return;
    }
    setSaving(true);
    try {
      const cfg = { ...form, apiUrl: form.apiUrl.trim() };
      saveConfig(cfg);
      applyConfig(cfg);
      toast("success", "บันทึกการตั้งค่าแล้ว");
      nav("/login");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 px-4 py-10 dark:bg-zinc-950">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center gap-2.5">
          {form.logoUrl && previewVisible ? (
            <img src={form.logoUrl} alt="" className="size-10 rounded-xl object-contain" />
          ) : (
            <img src={form.logoUrl} alt="" className="size-10 rounded-xl object-contain" />
          )}
          <div>
            <h1 className="text-xl font-semibold tracking-tight">ตั้งค่า {form.appName}</h1>
            <p className="text-sm text-zinc-500">ตั้งค่าเบื้องต้นก่อนใช้งานครั้งแรก</p>
          </div>
        </div>

        <div className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Field
            label="URL API (Apps Script แบบ Anonymous ต้องลงท้ายด้วย /exec)"
            required
            hint="ใช้เรียกข้อมูลทั้งหมด เปลี่ยนเมื่อ deploy ใหม่เท่านั้น"
          >
            <Input
              value={form.apiUrl}
              onChange={(e) => {
                setForm((p) => ({ ...p, apiUrl: e.target.value }));
                setError(null);
              }}
              placeholder="https://script.google.com/macros/s/.../exec"
              inputMode="url"
            />
          </Field>

          <Field label="ชื่อแอป" required>
            <Input
              value={form.appName}
              onChange={(e) => {
                setForm((p) => ({ ...p, appName: e.target.value }));
                setError(null);
              }}
            />
          </Field>

          <Field label="โลโก้แอป" hint="URL หรืออัปโหลดไฟล์ PNG สูงสุด 512 KB">
            <div className="flex items-center gap-3">
              <Input
                value={form.logoUrl.startsWith("data:") ? "(อัปโหลดแล้ว)" : form.logoUrl}
                onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
                placeholder="https://..."
              />
              <label className="shrink-0 cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-accent hover:text-accent dark:border-zinc-700 dark:text-zinc-200">
                อัปโหลด
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onLogoFile(e.target.files?.[0])}
                />
              </label>
            </div>
          </Field>

          <Field label="สีหลักของแอป">
            <div className="flex flex-wrap items-center gap-2">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((p) => ({ ...p, accent: c }))}
                  className={`flex size-9 items-center justify-center rounded-full border-2 transition-all ${
                    form.accent === c
                      ? "border-zinc-900 dark:border-white"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`เลือกสี ${c}`}
                >
                  {form.accent === c && <Check size={16} className="text-white" />}
                </button>
              ))}
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:border-accent dark:border-zinc-700 dark:text-zinc-300">
                <Palette size={15} />
                <span className="font-mono text-xs">{form.accent}</span>
                <input
                  type="color"
                  className="size-5 cursor-pointer rounded border-0 bg-transparent"
                  value={isHexColor(form.accent) ? form.accent : "#0f766e"}
                  onChange={(e) => setForm((p) => ({ ...p, accent: e.target.value }))}
                />
              </label>
            </div>
          </Field>

          <Field label="ธีม">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["light", "สว่าง"],
                  ["dark", "มืด"],
                  ["system", "ตามระบบ"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setForm((p) => ({ ...p, theme: v }))}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    form.theme === v
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => nav("/login")}>
              <ArrowLeft size={16} />
              ย้อนกลับ
            </Button>
            <Button onClick={() => void save()} loading={saving}>
              <FloppyDisk size={16} />
              บันทึกและเข้าสู่ระบบ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
