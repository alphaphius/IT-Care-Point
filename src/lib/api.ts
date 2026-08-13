import { loadConfig } from "./config";
import type {
  AppSettings,
  Asset,
  DashboardStats,
  Message,
  NotificationItem,
  PMTask,
  Ticket,
  UserProfile,
} from "./types";

const TOKEN_KEY = "itcp:token";

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

function url(action: string) {
  const base = loadConfig().scriptUrl.replace(/\/+$/, "");
  if (!base) throw new ApiError("ยังไม่ได้ตั้งค่า URL ของ Apps Script", "no-config");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}action=${action}`;
}

async function call<T>(
  action: string,
  body: Record<string, unknown> = {},
  opts: { method?: "GET" | "POST" } = {},
): Promise<T> {
  const method = opts.method ?? "POST";
  const token = getToken();
  const payload: Record<string, unknown> = { ...body };
  if (token) payload.token = token;

  let res: Response;
  try {
    res = await fetch(url(action), {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(payload) : undefined,
    });
  } catch {
    throw new ApiError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ ตรวจสอบอินเทอร์เน็ต", "network");
  }

  const text = await res.text();
  let data: { ok: boolean; data?: T; error?: string; code?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new ApiError("เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง", "bad-response");
  }
  if (!data.ok) {
    throw new ApiError(data.error || "เกิดข้อผิดพลาด", data.code);
  }
  return data.data as T;
}

export function loginUrl(redirect: string) {
  const cfg = loadConfig();
  if (!cfg.scriptUrl) throw new ApiError("ยังไม่ได้ตั้งค่า URL ของ Apps Script", "no-config");
  const sep = cfg.scriptUrl.includes("?") ? "&" : "?";
  return `${cfg.scriptUrl.replace(/\/+$/, "")}${sep}action=login&redirect=${encodeURIComponent(redirect)}`;
}

export const api = {
  verify: (code: string) =>
    call<{ token: string; user: UserProfile }>("verify", { code }),

  session: () => call<{ user: UserProfile; settings: AppSettings }>("session"),

  settingsGet: () => call<{ settings: AppSettings }>("settings.get"),

  settingsUpdate: (settings: AppSettings) =>
    call<{ settings: AppSettings }>("settings.update", { settings }),

  ticketsList: (scope: "mine" | "open" | "all" = "mine") =>
    call<{ tickets: Ticket[] }>("tickets.list", { scope }),

  ticketGet: (id: string) =>
    call<{ ticket: Ticket; messages: Message[] }>("tickets.get", { id }),

  ticketCreate: (t: {
    subject: string;
    category: string;
    urgency: string;
    description: string;
    asset_tag?: string;
    attachment?: { name: string; kind: string; data: string };
  }) => call<{ ticket: Ticket }>("tickets.create", t),

  ticketUpdate: (id: string, patch: Record<string, unknown>) =>
    call<{ ticket: Ticket }>("tickets.update", { id, patch }),

  ticketAssign: (id: string, assignee_email: string) =>
    call<{ ticket: Ticket }>("tickets.assign", { id, assignee_email }),

  messageSend: (
    ticketId: string,
    body: string,
    attachment?: { name: string; kind: string; data: string },
  ) =>
    call<{ message: Message }>("messages.send", {
      ticket_id: ticketId,
      body,
      attachment,
    }),

  notificationsList: () =>
    call<{ items: NotificationItem[]; unread: number }>("notifications.list"),

  notificationsMarkRead: (ids: string[]) =>
    call<{ ok: true }>("notifications.read", { ids }),

  assetsList: () => call<{ assets: Asset[] }>("assets.list"),

  assetCreate: (a: Omit<Asset, "created_at">) =>
    call<{ asset: Asset }>("assets.create", a),

  dashboard: () => call<DashboardStats>("dashboard"),

  pmList: () => call<{ items: PMTask[] }>("pm.list"),

  pmCreate: (p: Omit<PMTask, "id" | "next_due" | "last_run">) =>
    call<{ item: PMTask }>("pm.create", p),

  pmComplete: (id: string) => call<{ item: PMTask }>("pm.complete", { id }),
};
