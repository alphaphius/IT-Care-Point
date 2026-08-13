import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";

export default defineConfig({
  base: "/IT-Care-Point/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["app-icon-192.png", "app-icon-512.png", "app-icon-maskable.png"],
      manifest: {
        name: "IT Care Point",
        short_name: "IT Care",
        description: "ระบบแจ้งซ่อมและจัดการปัญหางาน IT",
        lang: "th",
        theme_color: "#0f766e",
        background_color: "#fafafa",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "app-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "app-icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "app-icon-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        navigateFallback: "index.html",
      },
    }),
    {
      name: "gh-pages-spa-404",
      apply: "build",
      writeBundle() {
        const root = new URL("./dist/index.html", import.meta.url);
        writeFileSync(new URL("./dist/404.html", import.meta.url), readFileSync(root, "utf8"));
      },
    },
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
