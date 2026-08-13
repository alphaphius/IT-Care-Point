import { useCallback, useEffect, useRef, useState } from "react";
import { Cube, MagnifyingGlass, Plus, QrCode } from "@phosphor-icons/react";
import { Button, Card, EmptyState, Field, Input, Modal, PageSkeleton, Textarea, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { Asset } from "@/lib/types";
import { formatDate } from "@/lib/format";

export function AdminAssets() {
  const toast = useToast();
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.assetsList();
      setAssets(res.assets);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "โหลดไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = assets?.filter((a) =>
    `${a.tag} ${a.name} ${a.owner} ${a.category}`.toLowerCase().includes(query.toLowerCase()),
  );

  if (!assets) return <PageSkeleton />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ครุภัณฑ์</h1>
          <p className="mt-1 text-sm text-zinc-500">
            ทะเบียนอุปกรณ์และประวัติการซ่อม ผ่านรหัสครุภัณฑ์ / QR
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setScanOpen(true)}>
            <QrCode size={16} />
            สแกน QR
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} weight="bold" />
            เพิ่มครุภัณฑ์
          </Button>
        </div>
      </div>

      <div className="mb-5 relative max-w-sm">
        <MagnifyingGlass size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหารหัส, ชื่อ, ผู้ถือครอง..."
          className="pl-10"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {!error && filtered!.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <EmptyState
            icon={<Cube size={26} />}
            title="ไม่มีครุภัณฑ์"
            body="เพิ่มครุภัณฑ์ชิ้นแรก เพื่อเริ่มผูกประวัติการซ่อม"
            action={<Button onClick={() => setAddOpen(true)}>เพิ่มครุภัณฑ์</Button>}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered!.map((a) => (
          <Card key={a.tag} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Cube size={20} />
              </div>
              <span className="font-mono text-xs text-zinc-400">{a.tag}</span>
            </div>
            <h3 className="mt-3 text-[15px] font-semibold leading-snug">{a.name}</h3>
            <dl className="mt-2 flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-400">หมวด</dt>
                <dd>{a.category}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-400">ผู้ถือครอง</dt>
                <dd>{a.owner || "-"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-400">สถานที่</dt>
                <dd>{a.location || "-"}</dd>
              </div>
            </dl>
            {a.notes && (
              <p className="mt-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {a.notes}
              </p>
            )}
            <p className="mt-3 text-[11px] text-zinc-400">เพิ่มเมื่อ {formatDate(a.created_at)}</p>
          </Card>
        ))}
      </div>

      <AddAssetModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          void load();
        }}
      />
      <ScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onFound={(tag) => {
          setScanOpen(false);
          setQuery(tag);
          toast("success", `สแกนเจอรหัส ${tag}`);
        }}
      />
    </div>
  );
}

function AddAssetModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({ tag: "", name: "", category: "", owner: "", location: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.tag.trim() || !form.name.trim()) {
      setError("กรอกรหัสและชื่อครุภัณฑ์");
      return;
    }
    setBusy(true);
    try {
      await api.assetCreate(form);
      toast("success", "เพิ่มครุภัณฑ์แล้ว");
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="เพิ่มครุภัณฑ์">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="รหัสครุภัณฑ์" required>
            <Input
              value={form.tag}
              onChange={(e) => setForm((p) => ({ ...p, tag: e.target.value }))}
              placeholder="CPU-0012"
              className="font-mono"
            />
          </Field>
          <Field label="หมวด">
            <Input
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              placeholder="คอมพิวเตอร์"
            />
          </Field>
        </div>
        <Field label="ชื่อ / รายละเอียด" required>
          <Input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="เครื่องคอมพิวเตอร์ HP ProDesk"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ผู้ถือครอง">
            <Input
              value={form.owner}
              onChange={(e) => setForm((p) => ({ ...p, owner: e.target.value }))}
              placeholder="สมชาย ใจดี"
            />
          </Field>
          <Field label="สถานที่">
            <Input
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              placeholder="ห้องบัญชี ชั้น 2"
            />
          </Field>
        </div>
        <Field label="หมายเหตุ">
          <Textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            className="min-h-16"
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

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};

function ScanModal({
  open,
  onClose,
  onFound,
}: {
  open: boolean;
  onClose: () => void;
  onFound: (tag: string) => void;
}) {
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    type BarcodeCtor = new (opts?: { formats?: string[] }) => {
      detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
    };
    const BD = (window as unknown as { BarcodeDetector?: BarcodeCtor }).BarcodeDetector;
    setSupported(!!BD);
    if (!BD) return;

    detectorRef.current = new BD({ formats: ["qr_code"] });
    let cancelled = false;
    let raf = 0;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const tick = async () => {
          if (cancelled || !videoRef.current || !detectorRef.current) return;
          try {
            const codes = await detectorRef.current.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              onFound(codes[0].rawValue);
              return;
            }
          } catch {
            /* frame miss */
          }
          raf = window.requestAnimationFrame(tick);
        };
        raf = window.requestAnimationFrame(tick);
      } catch {
        setError("ไม่สามารถเปิดกล้องได้ ตรวจสอบสิทธิ์กล้อง หรือกรอกรหัสด้วยตนเอง");
      }
    };
    void start();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, onFound]);

  const submitManual = () => {
    if (!manual.trim()) {
      toast("info", "กรอกรหัสครุภัณฑ์");
      return;
    }
    onFound(manual.trim());
  };

  return (
    <Modal open={open} onClose={onClose} title="สแกนรหัสครุภัณฑ์">
      <div className="flex flex-col gap-4">
        {supported ? (
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 m-10 rounded-2xl border-2 border-dashed border-accent/70" />
            {error && (
              <p className="absolute inset-x-0 bottom-0 bg-white/90 px-3 py-2 text-center text-xs text-red-600 dark:bg-zinc-900/90">
                {error}
              </p>
            )}
          </div>
        ) : (
          <p className="rounded-xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-500 dark:bg-zinc-800">
            เบราว์เซอร์นี้ไม่รองรับการสแกนผ่านกล้อง กรอกรหัสครุภัณฑ์ด้วยตนเองด้านล่าง
          </p>
        )}
        <div className="flex items-center gap-2">
          <Input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="หรือกรอกรหัสครุภัณฑ์"
            className="font-mono"
          />
          <Button onClick={submitManual}>ค้นหา</Button>
        </div>
      </div>
    </Modal>
  );
}
