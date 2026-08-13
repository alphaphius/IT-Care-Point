import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, setToken, getToken } from "./api";
import { applyConfig, loadConfig } from "./config";
import type { AppSettings, Role, UserProfile } from "./types";

type Status = "booting" | "no-config" | "anon" | "ready";

interface SessionState {
  status: Status;
  user: UserProfile | null;
  settings: AppSettings | null;
  login: (code: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SessionState>({
  status: "booting",
  user: null,
  settings: null,
  login: async () => {},
  logout: () => {},
  refresh: async () => {},
});

export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("booting");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const refresh = async () => {
    if (!loadConfig().scriptUrl) {
      setStatus("no-config");
      return;
    }
    if (!getToken()) {
      setStatus("anon");
      return;
    }
    try {
      const res = await api.session();
      setUser(res.user);
      setSettings(res.settings);
      setStatus("ready");
    } catch {
      setToken(null);
      setUser(null);
      setStatus("anon");
    }
  };

  useEffect(() => {
    const cfg = loadConfig();
    applyConfig(cfg);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (code: string) => {
    const res = await api.verify(code);
    setToken(res.token);
    setUser(res.user);
    const s = await api.session().catch(() => null);
    setSettings(s ? s.settings : null);
    setStatus("ready");
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setSettings(null);
    setStatus("anon");
  };

  return (
    <Ctx.Provider value={{ status, user, settings, login, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function RequireReady({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === "booting") return null;
  if (status === "no-config") return <Navigate to="/setup" replace />;
  if (status === "anon") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, status } = useSession();
  const loc = useLocation();
  if (status === "booting") return null;
  if (status !== "ready") return <Navigate to="/login" replace />;
  const rank = { user: 0, staff: 1, admin: 2 };
  if (!user || rank[user.role] < rank[role]) {
    const home = user?.role === "admin" ? "/admin" : user?.role === "staff" ? "/staff" : "/app";
    return <Navigate to={home} replace state={{ from: loc }} />;
  }
  return <>{children}</>;
}
