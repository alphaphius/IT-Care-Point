import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip, Image, FilmSlate } from "@phosphor-icons/react";
import { api, ApiError } from "@/lib/api";
import type { Message } from "@/lib/types";
import { formatDateTime, initials, timeAgo } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useToast } from "@/components/ui";

interface ChatProps {
  ticketId: string;
  viewerEmail: string;
  disabled?: boolean;
}

const MAX_FILE = 10 * 1024 * 1024;

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function Chat({ ticketId, viewerEmail, disabled }: ChatProps) {
  const { user } = useSession();
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [attach, setAttach] = useState<{ name: string; kind: "image" | "video" } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.ticketGet(ticketId);
      setMessages(res.messages);
    } catch {
      /* silent poll */
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
    const t = window.setInterval(load, 12000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    const kind = f.type.startsWith("video/") ? "video" : "image";
    if (f.size > MAX_FILE) {
      toast("error", "ไฟล์ต้องไม่เกิน 10 MB");
      return;
    }
    setAttach({ name: f.name, kind });
    setPendingFile(f);
  };

  const send = async () => {
    if (disabled) return;
    const body = text.trim();
    if (!body && !pendingFile) return;
    setSending(true);
    try {
      let attachment;
      if (pendingFile) {
        const data = await readAsBase64(pendingFile);
        attachment = {
          name: pendingFile.name,
          kind: pendingFile.type.startsWith("video/") ? "video" : "image",
          data,
        };
      }
      const res = await api.messageSend(ticketId, body, attachment);
      setMessages((p) => [...p, res.message]);
      setText("");
      setAttach(null);
      setPendingFile(null);
    } catch (e) {
      toast("error", e instanceof ApiError ? e.message : "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex max-h-[52vh] min-h-64 flex-col gap-3 overflow-y-auto px-1 py-3">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400">
            ยังไม่มีข้อความ เริ่มพูดคุยเพื่อสอบถามรายละเอียดเพิ่มเติม
          </p>
        )}
        {messages.map((m) => {
          const mine = m.author_email === viewerEmail;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div className="mb-0.5 flex items-center gap-1.5 px-1">
                <span className="flex size-5 items-center justify-center rounded-full bg-accent-soft text-[9px] font-semibold text-accent">
                  {initials(m.author_name)}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {m.author_name}
                  {m.author_role !== "user" && (
                    <span className="ml-1 text-accent">({m.author_role === "admin" ? "ผู้ดูแล" : "ช่าง"})</span>
                  )}
                </span>
                <span className="text-[10px] text-zinc-300" title={formatDateTime(m.ts)}>
                  {timeAgo(m.ts)}
                </span>
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  mine
                    ? "rounded-br-md bg-accent text-white"
                    : "rounded-bl-md border border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                }`}
              >
                {m.attachment && (
                  <div className="mb-2">
                    {m.attachment.kind === "image" ? (
                      <a href={m.attachment.url} target="_blank" rel="noreferrer">
                        <img
                          src={m.attachment.url}
                          alt={m.attachment.name}
                          className="max-h-48 rounded-xl border border-black/5"
                        />
                      </a>
                    ) : (
                      <a
                        href={m.attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2 text-xs font-medium"
                      >
                        <FilmSlate size={16} />
                        {m.attachment.name}
                      </a>
                    )}
                  </div>
                )}
                {m.body && <span className="whitespace-pre-wrap">{m.body}</span>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        {attach && (
          <div className="flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2 text-xs font-medium text-accent">
            {attach.kind === "image" ? <Image size={15} /> : <FilmSlate size={15} />}
            {attach.name}
          </div>
        )}
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          disabled={disabled}
          placeholder={disabled ? "ปิดใช้งานการสนทนา" : "พิมพ์ข้อความ..."}
          className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-800"
        />
        <label className="shrink-0 cursor-pointer rounded-full p-2.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-accent dark:hover:bg-zinc-800">
          <Paperclip size={18} />
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </label>
        <button
          onClick={() => void send()}
          disabled={sending || disabled || (!text.trim() && !pendingFile)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-all hover:bg-accent-hover active:scale-[0.95] disabled:opacity-40"
          aria-label="ส่ง"
        >
          <ArrowUp size={18} weight="bold" />
        </button>
      </div>
      <p className="mt-2 text-[11px] text-zinc-400">
        ผู้ใช้: {user?.name ?? viewerEmail}
      </p>
    </div>
  );
}
