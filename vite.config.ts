import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "./",
  build: {
    outDir: "dist",
  },
  base: "/nyc-building-complaints/",
  publicDir: "public",
  experimental: {
    renderBuiltUrl(
      filename: string,
      { hostType }: { hostType: "js" | "css" | "html" }
    ) {
      if (hostType === "js") {
        return { runtime: `window.__toCdnUrl(${JSON.stringify(filename)})` };
      } else {
        return { relative: true };
      }
    },
  },
});
