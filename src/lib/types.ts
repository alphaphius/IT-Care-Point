export type Role = "user" | "staff" | "admin";

export type Category = "Hardware" | "Software" | "Network" | "Other";

export type Urgency = "low" | "medium" | "high" | "critical";

export type TicketStatus =
  | "Received"
  | "In Progress"
  | "Pending Parts"
  | "Resolved"
  | "Canceled";

export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  role: Role;
}

export interface Ticket {
  id: string;
  subject: string;
  category: Category;
  urgency: Urgency;
  description: string;
  reporter_email: string;
  reporter_name: string;
  status: TicketStatus;
  assignee_email?: string;
  assignee_name?: string;
  sla_hours: number;
  sla_deadline?: string;
  escalated: boolean;
  opened_at: string;
  assigned_at?: string;
  resolved_at?: string;
  closed_at?: string;
  rating?: number;
  feedback?: string;
  asset_tag?: string;
  attachment?: AttachmentMeta;
}

export interface AttachmentMeta {
  name: string;
  kind: "image" | "video";
  url: string;
}

export interface Message {
  id: string;
  ticket_id: string;
  author_email: string;
  author_name: string;
  author_role: Role;
  body: string;
  kind: "text" | "attachment";
  attachment?: AttachmentMeta;
  ts: string;
}

export interface Asset {
  tag: string;
  name: string;
  category: string;
  owner: string;
  location: string;
  notes: string;
  created_at: string;
}

export interface PMTask {
  id: string;
  title: string;
  scope: string;
  cadence_days: number;
  last_run: string;
  next_due: string;
}

export interface NotificationItem {
  id: string;
  email: string;
  ticket_id: string;
  body: string;
  ts: string;
  read: boolean;
}

export interface DashboardStats {
  open: number;
  received: number;
  in_progress: number;
  pending_parts: number;
  resolved_30d: number;
  avg_mttr_hours: number | null;
  top_issues: { category: string; count: number }[];
  staff_perf: { name: string; resolved: number; avg_hours: number | null }[];
  overdue: number;
  recent: Ticket[];
}

export interface AppSettings {
  staff_emails: string[];
  admin_emails: string[];
  sla_hours: Record<Urgency, number>;
}

export const CATEGORIES: Category[] = ["Hardware", "Software", "Network", "Other"];

export const URGENCIES: { value: Urgency; label: string; hint: string }[] = [
  { value: "low", label: "ต่ำ", hint: "ไม่ด่วน ทำเมื่อว่าง" },
  { value: "medium", label: "ปานกลาง", hint: "ภายใน 24 ชม." },
  { value: "high", label: "สูง", hint: "ภายใน 8 ชม." },
  { value: "critical", label: "ด่วนมาก", hint: "ภายใน 2 ชม." },
];

export const STATUS_FLOW: Record<TicketStatus, TicketStatus[]> = {
  Received: ["In Progress", "Pending Parts", "Canceled"],
  "In Progress": ["Pending Parts", "Resolved"],
  "Pending Parts": ["In Progress", "Resolved"],
  Resolved: [],
  Canceled: [],
};
