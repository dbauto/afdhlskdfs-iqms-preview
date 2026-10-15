import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig(({ mode }) => ({
  base: mode === "hash" ? "./" : "/",
  publicDir: mode === "hash" ? false : "public",
  build: { emptyOutDir: true },
  plugins: [react(), tailwindcss(), ...(mode === "hash" ? [viteSingleFile()] : [])],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}))
