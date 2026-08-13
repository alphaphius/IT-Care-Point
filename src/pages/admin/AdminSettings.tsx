import { useEffect, useState } from "react";
import { Check, Palette, FloppyDisk } from "@phosphor-icons/react";
import { Button, Card, Field, Input, Textarea, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { applyConfig, isHexColor, loadConfig, saveConfig } from "@/lib/config";
import { useSession } from "@/lib/session";
import type { AppSettings, Urgency } from "@/lib/types";

const ACCENTS = [
  "#0f766e",
  "#2563eb",
  "#059669",
  "#b45309",
  "#e11d48",
  "#7c3aed",
  "#475569",
];

const URGENCY_TH: { v: Urgency; label: string }[] = [
  { v: "low", label: "ต่ำ" },
  { v: "medium", label: "ปานกลาง" },
  { v: "high", label: "สูง" },
  { v: "critical", label: "ด่วนมาก" },
];

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function AdminSettings() {
  const toast = useToast();
  const { settings, refresh } = useSession();
  const [cfg, setCfg] = useState(() => ({ ...loadConfig() }));
  const [staffList, setStaffList] = useState("");
  const [adminList, setAdminList] = useState("");
  const [sla, setSla] = useState<Record<Urgency, string>>({
    low: "48",
    medium: "24",
    high: "8",
    critical: "2",
  });
  const [busy, setBusy] = useState(false);
  const [cfgError, setCfgError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setStaffList(settings.staff_emails.join("\n"));
      setAdminList(settings.admin_emails.join("\n"));
      setSla({
        low: String(settings.sla_hours.low),
        medium: String(settings.sla_hours.medium),
        high: String(settings.sla_hours.high),
        critical: String(settings.sla_hours.critical),
      });
    }
  }, [settings]);

  const saveApp = async () => {
    if (cfg.appName.trim().length < 2) {
      setCfgError("กรุณากรอกชื่อแอป");
      return;
    }
    if (!isHexColor(cfg.accent)) {
      setCfgError("สีหลักต้องเป็นรหัส Hex");
      return;
    }
    setBusy(true);
    try {
      const next = { ...cfg };
      saveConfig(next);
      applyConfig(next);
      toast("success", "บันทึกการตั้งค่าแอปแล้ว");
    } finally {
      setBusy(false);
    }
  };

  const saveBackend = async () => {
    const parse = (s: string) =>
      s
        .split("\n")
        .map((x) => x.trim().toLowerCase())
        .filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
    const staff = parse(staffList);
    const admin = parse(adminList);
    if (staff.length === 0 && admin.length === 0) {
      toast("error", "กรุณาระบุอีเมลช่างหรือผู้ดูแลอย่างน้อยหนึ่งคน");
      return;
    }
    const next: AppSettings = {
      staff_emails: staff,
      admin_emails: admin,
      sla_hours: {
        low: Math.max(1, Number(sla.low) || 48),
        medium: Math.max(1, Number(sla.medium) || 24),
        high: Math.max(1, Number(sla.high) || 8),
        critical: Math.max(1, Number(sla.critical) || 2),
      },
    };
    setBusy(true);
    try {
      await api.settingsUpdate(next);
      await refresh();
      toast("success", "บันทึกการตั้งค่าระบบแล้ว");
    } catch (e) {
      toast("error", e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">ตั้งค่า</h1>
        <p className="mt-1 text-sm text-zinc-500">
          ตั้งค่าแอปและระบบจัดการงาน
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-semibold">ข้อมูลแอป</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          ชื่อ, โลโก้ และสีหลัก ใช้ได้ทั้งแอป
        </p>
        <div className="mt-4 flex flex-col gap-5">
          <Field label="ชื่อแอป">
            <Input
              value={cfg.appName}
              onChange={(e) => {
                setCfg((p) => ({ ...p, appName: e.target.value }));
                setCfgError(null);
              }}
            />
          </Field>

          <Field label="โลโก้แอป" hint="URL หรืออัปโหลด PNG สูงสุด 512 KB">
            <div className="flex items-center gap-3">
              <Input
                value={cfg.logoUrl.startsWith("data:") ? "(อัปโหลดแล้ว)" : cfg.logoUrl}
                onChange={(e) => setCfg((p) => ({ ...p, logoUrl: e.target.value }))}
              />
              <label className="shrink-0 cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-accent hover:text-accent dark:border-zinc-700 dark:text-zinc-200">
                อัปโหลด
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 512 * 1024) {
                      toast("error", "ไฟล์โลโก้ต้องไม่เกิน 512 KB");
                      return;
                    }
                    void readAsDataUrl(f).then((d) =>
                      setCfg((p) => ({ ...p, logoUrl: d })),
                    );
                  }}
                />
              </label>
            </div>
          </Field>

          <Field label="สีหลัก">
            <div className="flex flex-wrap items-center gap-2">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCfg((p) => ({ ...p, accent: c }))}
                  className={`flex size-9 items-center justify-center rounded-full border-2 transition-all ${
                    cfg.accent === c
                      ? "border-zinc-900 dark:border-white"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`เลือกสี ${c}`}
                >
                  {cfg.accent === c && <Check size={16} className="text-white" />}
                </button>
              ))}
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:border-accent dark:border-zinc-700 dark:text-zinc-300">
                <Palette size={15} />
                <span className="font-mono text-xs">{cfg.accent}</span>
                <input
                  type="color"
                  className="size-5 cursor-pointer rounded border-0 bg-transparent"
                  value={isHexColor(cfg.accent) ? cfg.accent : "#0f766e"}
                  onChange={(e) => setCfg((p) => ({ ...p, accent: e.target.value }))}
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
                  onClick={() => setCfg((p) => ({ ...p, theme: v }))}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    cfg.theme === v
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {cfgError && <p className="text-sm text-red-600">{cfgError}</p>}

          <div className="flex justify-end">
            <Button onClick={() => void saveApp()} loading={busy}>
              <FloppyDisk size={16} />
              บันทึกข้อมูลแอป
            </Button>
          </div>
        </div>
      </Card>

      <Card className="mt-6 p-5 sm:p-6">
          <h2 className="text-base font-semibold">สิทธิ์ผู้ใช้งานและ SLA</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            อีเมลที่ระบุจะเข้าสู่ระบบในฐานะช่าง / ผู้ดูแลได้ ใช้บรรทัดละหนึ่งอีเมล
          </p>
          <div className="mt-4 flex flex-col gap-5">
            <Field label="อีเมลช่าง (Staff)">
              <Textarea
                value={staffList}
                onChange={(e) => setStaffList(e.target.value)}
                placeholder="it.support@company.com"
                className="min-h-20 font-mono text-xs"
              />
            </Field>
            <Field label="อีเมลผู้ดูแล (Admin)">
              <Textarea
                value={adminList}
                onChange={(e) => setAdminList(e.target.value)}
                placeholder="admin@company.com"
                className="min-h-20 font-mono text-xs"
              />
            </Field>

            <Field label="SLA (ชั่วโมง) ตามความเร่งด่วน">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {URGENCY_TH.map((u) => (
                  <label key={u.v} className="flex flex-col gap-1.5">
                    <span className="text-xs text-zinc-500">{u.label}</span>
                    <Input
                      type="number"
                      min={1}
                      value={sla[u.v]}
                      onChange={(e) => setSla((p) => ({ ...p, [u.v]: e.target.value }))}
                      className="font-mono"
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs text-zinc-400">
                หากเกินระยะเวลา ระบบจะแจ้งสถานะ Escalate ไปยังผู้ดูแล
              </p>
            </Field>

            <div className="flex justify-end">
              <Button onClick={() => void saveBackend()} loading={busy}>
                <FloppyDisk size={16} />
                บันทึกสิทธิ์และ SLA
              </Button>
            </div>
          </div>
        </Card>
    </div>
  );
}