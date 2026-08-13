import type { TicketStatus, Urgency } from "./types";

const MONTHS_TH = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export function formatDateTime(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function timeAgo(iso?: string) {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "เมื่อสักครู่";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  const d = Math.floor(h / 24);
  return `${d} วันที่แล้ว`;
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  low: "ต่ำ",
  medium: "ปานกลาง",
  high: "สูง",
  critical: "ด่วนมาก",
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  Received: "รับเรื่อง",
  "In Progress": "กำลังดำเนินการ",
  "Pending Parts": "รออะไหล่",
  Resolved: "เสร็จสิ้น",
  Canceled: "ยกเลิก",
};

export function slaRemaining(deadline?: string): {
  label: string;
  overdue: boolean;
  fraction: number;
} {
  if (!deadline) return { label: "-", overdue: false, fraction: 0 };
  const now = Date.now();
  const end = new Date(deadline).getTime();
  if (Number.isNaN(end)) return { label: "-", overdue: false, fraction: 0 };
  const diff = end - now;
  const overdue = diff < 0;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const label = `${h} ชม. ${m} นาที`;
  return { label, overdue, fraction: 0.5 };
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
