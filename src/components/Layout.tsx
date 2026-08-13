import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ChartBar,
  ClipboardText,
  Gear,
  Plus,
  SignOut,
  Cube,
  CalendarCheck,
  Ticket,
} from "@phosphor-icons/react";
import { loadConfig } from "@/lib/config";
import { initials } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Role } from "@/lib/types";
import { Notifications } from "@/components/Notifications";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

function navFor(role: Role): NavItem[] {
  if (role === "admin") {
    return [
      { to: "/admin", label: "แดชบอร์ด", icon: <ChartBar size={18} />, end: true },
      { to: "/staff", label: "งานในระบบ", icon: <ClipboardText size={18} /> },
      { to: "/admin/assets", label: "ครุภัณฑ์", icon: <Cube size={18} /> },
      { to: "/admin/pm", label: "งาน PM", icon: <CalendarCheck size={18} /> },
      { to: "/admin/settings", label: "ตั้งค่า", icon: <Gear size={18} /> },
    ];
  }
  if (role === "staff") {
    return [
      { to: "/staff", label: "งานในระบบ", icon: <ClipboardText size={18} />, end: true },
    ];
  }
  return [
    { to: "/app", label: "งานของฉัน", icon: <Ticket size={18} />, end: true },
  ];
}

function Logo() {
  const cfg = loadConfig();
  return (
    <div className="flex items-center gap-2.5">
      {cfg.logoUrl && (
        <img
          src={cfg.logoUrl}
          alt=""
          className="size-8 rounded-lg object-contain"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      )}
      <span className="text-[15px] font-semibold tracking-tight">{cfg.appName}</span>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useSession();
  const nav = useNavigate();
  return (
    <div className="flex items-center gap-1.5">
      <Notifications />
      {user?.picture ? (
        <img
          src={user.picture}
          alt=""
          className="size-8 rounded-full border border-zinc-200 dark:border-zinc-700"
        />
      ) : (
        <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
          {initials(user?.name ?? "?")}
        </span>
      )}
      <button
        onClick={() => {
          logout();
          nav("/login");
        }}
        className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
        title="ออกจากระบบ"
        aria-label="ออกจากระบบ"
      >
        <SignOut size={18} />
      </button>
    </div>
  );
}

function Tabs({ items }: { items: NavItem[] }) {
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent-soft text-accent"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`
          }
        >
          {n.icon}
          {n.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Layout() {
  const { user } = useSession();
  const role = user?.role ?? "user";
  const items = navFor(role);
  const isAdmin = role === "admin";
  const isStaff = role === "staff";

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-neutral-50/85 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo />
          <Tabs items={items} />
          <div className="flex items-center gap-2">
            {!isAdmin && (
              <NavLink
                to={isStaff ? "/staff" : "/app/new"}
                className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent-hover active:scale-[0.97]"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">
                  {isStaff ? "งานในระบบ" : "แจ้งซ่อมใหม่"}
                </span>
              </NavLink>
            )}
            <UserMenu />
          </div>
        </div>
      </header>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around py-1.5">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium ${
                  isActive ? "text-accent" : "text-zinc-500"
                }`
              }
            >
              {n.icon}
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="flex-1 pb-20 md:pb-8">
        <Outlet />
      </main>
    </div>
  );
}
