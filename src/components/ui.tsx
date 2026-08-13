import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CircleNotch,
  Warning,
  CheckCircle,
  Info,
  X,
} from "@phosphor-icons/react";
import type { TicketStatus, Urgency } from "@/lib/types";
import { STATUS_LABEL, URGENCY_LABEL } from "@/lib/format";

/* ---------- Button ---------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "soft" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  full?: boolean;
};

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap";

const btnVariants = {
  primary:
    "bg-accent text-white hover:bg-accent-hover shadow-sm shadow-black/5",
  soft: "bg-accent-soft text-accent hover:bg-accent-soft-strong",
  outline:
    "border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-accent hover:text-accent bg-white dark:bg-zinc-900",
  ghost: "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800",
  danger: "bg-red-600 text-white hover:bg-red-500",
};

const btnSizes = {
  sm: "text-sm px-3.5 py-1.5",
  md: "text-sm px-5 py-2.5",
  lg: "text-base px-6 py-3",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading, full, className = "", children, disabled, ...rest },
    ref,
  ) => (
    <button
      ref={ref}
      className={`${btnBase} ${btnVariants[variant]} ${btnSizes[size]} ${full ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <CircleNotch size={16} className="animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

/* ---------- Inputs ---------- */

const inputBase =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-colors focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...rest }, ref) => (
    <input ref={ref} className={`${inputBase} ${className}`} {...rest} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...rest }, ref) => (
    <textarea ref={ref} className={`${inputBase} min-h-28 resize-y ${className}`} {...rest} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...rest }, ref) => (
    <select ref={ref} className={`${inputBase} appearance-none ${className}`} {...rest}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

/* ---------- Card ---------- */

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------- Badges ---------- */

const statusStyles: Record<TicketStatus, string> = {
  Received: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  "In Progress": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  "Pending Parts": "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  Resolved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Canceled: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

const urgencyStyles: Record<Urgency, string> = {
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  medium: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  high: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  critical: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
};

export function Badge({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge className={statusStyles[status]}>
      <span
        className={`size-1.5 rounded-full ${status === "In Progress" ? "animate-pulse bg-current" : "bg-current"}`}
      />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return <Badge className={urgencyStyles[urgency]}>{URGENCY_LABEL[urgency]}</Badge>;
}

export function EscalatedBadge() {
  return <Badge className="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300">Escalate</Badge>;
}

/* ---------- Skeleton ---------- */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-zinc-200/70 dark:bg-zinc-800 ${className}`}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-8 w-52" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

/* ---------- Empty state ---------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        {icon}
      </div>
      <div className="text-base font-semibold">{title}</div>
      <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ---------- Modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 32, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={`relative m-4 w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              {title && <h3 className="text-lg font-semibold leading-tight">{title}</h3>}
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                aria-label="ปิด"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Toast ---------- */

type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const ToastCtx = createContext<(type: ToastType, message: string) => void>(() => {});

export const useToast = () => useContext(ToastCtx);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = (type: ToastType, message: string) => {
    const id = ++toastId;
    setItems((p) => [...p, { id, type, message }]);
    window.setTimeout(() => {
      setItems((p) => p.filter((t) => t.id !== id));
    }, 4500);
  };

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-3.5 pr-2.5 shadow-lg dark:bg-zinc-900 ${
                t.type === "error"
                  ? "border-red-200 dark:border-red-500/30"
                  : t.type === "success"
                    ? "border-emerald-200 dark:border-emerald-500/30"
                    : "border-zinc-200 dark:border-zinc-700"
              }`}
            >
              <span
                className={`mt-0.5 shrink-0 ${
                  t.type === "error"
                    ? "text-red-500"
                    : t.type === "success"
                      ? "text-emerald-500"
                      : "text-accent"
                }`}
              >
                {t.type === "error" ? (
                  <Warning size={18} />
                ) : t.type === "success" ? (
                  <CheckCircle size={18} />
                ) : (
                  <Info size={18} />
                )}
              </span>
              <p className="flex-1 text-sm leading-snug">{t.message}</p>
              <button
                onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="ปิด"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
