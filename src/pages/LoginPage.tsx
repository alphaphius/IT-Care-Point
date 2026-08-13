import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GoogleLogo, SlidersHorizontal } from "@phosphor-icons/react";
import { Button } from "@/components/ui";
import { loginUrl } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { loadConfig } from "@/lib/config";
import { useSession } from "@/lib/session";
import { useToast } from "@/components/ui";

export function LoginPage() {
  const { login, status } = useSession();
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const cfg = loadConfig();

  useEffect(() => {
    const code = params.get("code");
    if (!code) return;
    setBusy(true);
    login(code)
      .then(() => nav("/"))
      .catch((e) => {
        toast("error", e instanceof ApiError ? e.message : "เข้าสู่ระบบไม่สำเร็จ");
        setBusy(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    try {
      setBusy(true);
      window.location.href = loginUrl(`${window.location.origin}${import.meta.env.BASE_URL}login`);
    } catch (e) {
      setBusy(false);
      toast("error", e instanceof ApiError ? e.message : "เกิดข้อผิดพลาด");
    }
  };

  if (status === "ready") {
    nav("/");
    return null;
  }

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

        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Button size="lg" onClick={start} loading={busy}>
            <GoogleLogo size={18} weight="bold" />
            เข้าสู่ระบบด้วย Google
          </Button>
          {!cfg.scriptUrl && (
            <Button variant="outline" onClick={() => nav("/setup")}>
              <SlidersHorizontal size={16} />
              ตั้งค่าครั้งแรก
            </Button>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-zinc-400">
          ใช้บัญชี Google ขององค์กรของคุณ
        </p>
      </div>
    </div>
  );
}
