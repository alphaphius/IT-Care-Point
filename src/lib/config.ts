export interface AppConfig {
  scriptUrl: string;
  apiUrl: string;
  appName: string;
  logoUrl: string;
  accent: string;
  theme: "light" | "dark" | "system";
}

const KEY = "itcp:config";
const VERSION = 3;

export const DEFAULT_LOGO =
  "https://cdn-icons-png.flaticon.com/512/2706/2706950.png";

export function defaultConfig(): AppConfig {
  return {
    scriptUrl:
      "https://script.google.com/macros/s/AKfycbzixqTu8NwASw3hl6f_4iKW0EIDpz7KUvenyHE4nXjeItqXGaJkSDtbmjbEjLmC1DX1Pg/exec",
    apiUrl:
      "https://script.google.com/macros/s/AKfycbysjvfKAZ_y2wTzzZvAruN_4YMp95KIIF23KB9ESGKFRezug5mV5p-UAxm9IWza6UNJKw/exec",
    appName: "IT Care Point",
    logoUrl: DEFAULT_LOGO,
    accent: "#0f766e",
    theme: "light",
  };
}

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultConfig();
    const stored = JSON.parse(raw) as Partial<AppConfig> & { version?: number };
    if (stored.version !== VERSION) return defaultConfig();
    return { ...defaultConfig(), ...stored };
  } catch {
    return defaultConfig();
  }
}

export function saveConfig(c: AppConfig) {
  localStorage.setItem(KEY, JSON.stringify({ ...c, version: VERSION }));
}

export function applyConfig(c: AppConfig) {
  const root = document.documentElement;
  root.style.setProperty("--app-accent", c.accent || "#0f766e");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", c.accent || "#0f766e");
  applyTheme(c.theme);
}

export function applyTheme(theme: AppConfig["theme"]) {
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

export function isHexColor(v: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}
