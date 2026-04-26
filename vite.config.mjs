import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import packageJson from "./package.json" with { type: "json" }

const rootDir = dirname(fileURLToPath(import.meta.url))

function createManifest(version) {
  return {
    manifest_version: 3,
    name: "OpenTab",
    description: "Collect, organize, and reopen frequently used routes.",
    version,
    permissions: ["storage", "activeTab", "tabs", "sidePanel", "scripting"],
    action: {
      default_title: "OpenTab",
      default_popup: "popup.html"
    },
    background: {
      service_worker: "background.js",
      type: "module"
    },
    options_page: "options.html",
    side_panel: {
      default_path: "sidepanel.html"
    },
    host_permissions: ["<all_urls>"]
  }
}

function emitManifest() {
  return {
    name: "emit-manifest",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify(createManifest(packageJson.version), null, 2)
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), emitManifest()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(rootDir, "popup.html"),
        manager: resolve(rootDir, "manager.html"),
        sidepanel: resolve(rootDir, "sidepanel.html"),
        options: resolve(rootDir, "options.html"),
        background: resolve(rootDir, "src/background/index.ts")
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === "background" ? "background.js" : "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
})
