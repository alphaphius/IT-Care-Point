import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle,
  Clock,
  Lightning,
  Stack,
  TrendUp,
  WarningCircle,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";
import { Card, PageSkeleton, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStats(await api.dashboard());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(load, 30000);
    return () => window.clearInterval(t);
  }, [load]);

  if (!stats) return <PageSkeleton />;

  const cards = [
    {
      label: "งานเปิดอยู่",
      value: stats.open,
      icon: <Stack size={18} />,
      tone: "text-accent bg-accent-soft",
    },
    {
      label: "เกิน SLA",
      value: stats.overdue,
      icon: <WarningCircle size={18} />,
      tone: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10",
    },
    {
      label: "เสร็จ 30 วัน",
      value: stats.resolved_30d,
      icon: <CheckCircle size={18} />,
      tone: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
    },
    {
      label: "MTTR เฉลี่ย",
      value:
        stats.avg_mttr_hours == null
          ? "-"
          : `${stats.avg_mttr_hours.toFixed(1)} ชม.`,
      icon: <Clock size={18} />,
      tone: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10",
    },
  ];

  const topIssueMax = Math.max(1, ...stats.top_issues.map((t) => t.count));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">แดชบอร์ด</h1>
        <p className="mt-1 text-sm text-zinc-500">
          สรุปสถานะงานซ่อมและประสิทธิภาพทีม IT
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-4 sm:p-5">
            <div className={`flex size-9 items-center justify-center rounded-xl ${c.tone}`}>
              {c.icon}
            </div>
            <div className="mt-3 font-mono text-2xl font-semibold tracking-tight">
              {c.value}
            </div>
            <div className="text-sm text-zinc-500">{c.label}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Lightning size={16} className="text-accent" />
            ปัญหาที่พบบ่อยที่สุด
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            {stats.top_issues.length === 0 && (
              <p className="text-sm text-zinc-400">ยังไม่มีข้อมูล</p>
            )}
            {stats.top_issues.map((t) => (
              <div key={t.category}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">
                    {t.category === "Hardware"
                      ? "ฮาร์ดแวร์"
                      : t.category === "Software"
                        ? "ซอฟต์แวร์"
                        : t.category === "Network"
                          ? "เครือข่าย"
                          : "อื่น ๆ"}
                  </span>
                  <span className="font-mono text-sm font-semibold">{t.count}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(t.count / topIssueMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <TrendUp size={16} className="text-accent" />
            ประสิทธิภาพทีม IT
          </h2>
          <div className="mt-4 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {stats.staff_perf.length === 0 && (
              <p className="pb-2 text-sm text-zinc-400">ยังไม่มีข้อมูล</p>
            )}
            {stats.staff_perf.map((s) => (
              <div key={s.name} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0 truncate text-sm font-medium">{s.name}</span>
                <span className="shrink-0 text-xs text-zinc-500">
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-100">{s.resolved}</span> งาน
                  {s.avg_hours != null && (
                    <span className="ml-2 font-mono">{s.avg_hours.toFixed(1)} ชม.</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">งานล่าสุด</h2>
          <div className="mt-3 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {stats.recent.map((t) => (
              <Link
                key={t.id}
                to={`/staff/tickets/${t.id}`}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-70"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{t.subject}</span>
                  <span className="text-[11px] text-zinc-400">{formatDateTime(t.opened_at)}</span>
                </span>
                <span className="shrink-0">
                  <StatusBadge status={t.status} />
                </span>
              </Link>
            ))}
            {stats.recent.length === 0 && (
              <p className="py-2 text-sm text-zinc-400">ยังไม่มีงาน</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
