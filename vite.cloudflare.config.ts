import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

/**
 * Build sans plugin Manus, destiné à Cloudflare Pages. Les routes SPA sont
 * reprises par client/public/_redirects après le build.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist", "cloudflare"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/@supabase/")) return "supabase-vendor";
          if (id.includes("/@trpc/") || id.includes("/superjson/")) return "trpc-vendor";
          // React, Radix and their peer packages are intentionally left to
          // Rollup's dependency graph. Splitting them into separate manual
          // chunks can create a circular import where Radix evaluates before
          // React and `forwardRef` is undefined.
          if (id.includes("/lucide-react/") || id.includes("/sonner/") || id.includes("/next-themes/")) return "ui-vendor";
          if (id.includes("/tailwind-merge/") || id.includes("/clsx/") || id.includes("/copy-anything/") || id.includes("/is-what/")) return "utility-vendor";
        },
      },
    },
  },
});
