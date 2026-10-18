import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

// Preview proxies pass their hostname through this env var; nothing host-specific
// is committed to the repo.
const allowedHosts = (env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((h: string) => h.trim())
  .filter(Boolean);

/**
 * GitHub Pages serves project sites from /<repo>/, so the deploy workflow sets
 * VITE_BASE=/<repo>/. Local dev and a user/organisation page keep "/".
 */
const base = (() => {
  const raw = env.VITE_BASE?.trim() || "/";
  const withLead = raw.startsWith("/") ? raw : `/${raw}`;
  return withLead.endsWith("/") ? withLead : `${withLead}/`;
})();

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/favicon-64.png", "icons/apple-touch-icon.png"],
      manifest: {
        id: base,
        name: "NutriScan — AI food tracker",
        short_name: "NutriScan",
        description:
          "AI calorie tracking: photograph a meal, scan a barcode, and watch your macros. Your diary stays on your device.",
        lang: "en",
        dir: "ltr",
        start_url: base,
        scope: base,
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        background_color: "#0a0b0f",
        theme_color: "#0a0b0f",
        categories: ["health", "food", "lifestyle", "productivity"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell + the lazy barcode reader chunk (~15 kB gzip) are precached,
        // so scanning keeps working offline once it has been used.
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        globIgnores: ["**/*.wasm"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Scanned products: fresh data when online, still readable offline.
            urlPattern: ({ url }) => url.hostname === "world.openfoodfacts.org",
            handler: "NetworkFirst",
            options: {
              cacheName: "off-products",
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === "images.openfoodfacts.org",
            handler: "CacheFirst",
            options: {
              cacheName: "off-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // ZXing wasm reader, fetched from the CDN on first scan.
            urlPattern: ({ url }) => url.hostname === "cdn.jsdelivr.net",
            handler: "CacheFirst",
            options: {
              cacheName: "zxing-wasm",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts,
  },
});
