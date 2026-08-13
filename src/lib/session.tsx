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
import { generateSalt, hashPassword } from "./auth";
import type { AppSettings, Role, UserProfile } from "./types";

type Status = "booting" | "no-config" | "anon" | "ready";

interface SessionState {
  status: Status;
  user: UserProfile | null;
  settings: AppSettings | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SessionState>({
  status: "booting",
  user: null,
  settings: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refresh: async () => {},
});

export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("booting");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const refresh = async () => {
    if (!loadConfig().apiUrl) {
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

  const login = async (email: string, password: string) => {
    const { salt, iterations } = await api.authSalt(email);
    const hash = await hashPassword(password, salt, iterations);
    const res = await api.authLogin(email, hash);
    setToken(res.token);
    setUser(res.user);
    setSettings(res.settings);
    setStatus("ready");
  };

  const register = async (name: string, email: string, password: string) => {
    const salt = await generateSalt();
    const hash = await hashPassword(password, salt);
    const res = await api.authRegister(email, name, salt, hash);
    setToken(res.token);
    setUser(res.user);
    setSettings(res.settings);
    setStatus("ready");
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setSettings(null);
    setStatus("anon");
  };

  return (
    <Ctx.Provider value={{ status, user, settings, login, register, logout, refresh }}>
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
