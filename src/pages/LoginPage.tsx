import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { SlidersHorizontal } from "@phosphor-icons/react";
import { Button, Field, Input, useToast } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { loadConfig } from "@/lib/config";
import { useSession } from "@/lib/session";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function LoginPage() {
  const { login, register, status } = useSession();
  const nav = useNavigate();
  const toast = useToast();
  const cfg = loadConfig();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  if (status === "ready") {
    nav("/");
    return null;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!EMAIL_RE.test(em)) {
      toast("error", "รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    if (password.length < 6) {
      toast("error", "รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (mode === "register") {
      if (name.trim().length < 2) {
        toast("error", "กรุณากรอกชื่อ");
        return;
      }
      if (password !== confirm) {
        toast("error", "ยืนยันรหัสผ่านไม่ตรงกัน");
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "register") await register(name.trim(), em, password);
      else await login(em, password);
      nav("/");
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {cfg.logoUrl && (
            <img
              src={cfg.logoUrl}
              alt=""
              className="mb-4 size-16 rounded-2xl object-contain"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{cfg.appName}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            ระบบแจ้งซ่อมและจัดการปัญหางาน IT
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            {(
              [
                ["login", "เข้าสู่ระบบ"],
                ["register", "สมัครสมาชิก"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setMode(v)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === v
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
            {mode === "register" && (
              <Field label="ชื่อ" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อ-นามสกุล"
                  autoComplete="name"
                />
              </Field>
            )}
            <Field label="อีเมล" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </Field>
            <Field label="รหัสผ่าน" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "อย่างน้อย 6 ตัวอักษร" : "รหัสผ่าน"}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </Field>
            {mode === "register" && (
              <Field label="ยืนยันรหัสผ่าน" required>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                  autoComplete="new-password"
                />
              </Field>
            )}
            <Button type="submit" size="lg" loading={busy} className="mt-1">
              {mode === "register" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
            </Button>
          </form>

          {!cfg.apiUrl && (
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => nav("/setup")}
            >
              <SlidersHorizontal size={16} />
              ตั้งค่าครั้งแรก
            </Button>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-zinc-400">
          ผู้ที่สมัครสมาชิกเป็นคนแรกของระบบจะได้สิทธิ์ผู้ดูแลระบบ
        </p>
      </div>
    </div>
  );
}
