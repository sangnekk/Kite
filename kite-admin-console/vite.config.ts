import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// The console is served by the Go server under /admin/ and talks to the API of
// the same origin (/v1/admin), so sessions are plain same-site cookies.
// https://vite.dev/config/
export default defineConfig({
  base: "/admin/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // `npm run dev` proxies the API (and the Discord login redirect) to the Go
    // server. Override with KITE_DEV_API if it does not run on :8080.
    proxy: {
      "/v1": {
        target: process.env.KITE_DEV_API ?? "http://localhost:8080",
        changeOrigin: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["recharts"],
        },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
