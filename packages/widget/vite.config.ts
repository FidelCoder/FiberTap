import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      rollupTypes: true,
      outDir: "dist",
    }),
  ],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "FiberTap",
      formats: ["iife"],
      fileName: () => "widget.min.js",
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    rollupOptions: {
      external: [],
    },
  },
});
