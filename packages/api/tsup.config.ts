import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/vercel.ts"],
  format: "esm",
  outDir: "dist",
  clean: true,
  dts: false,
  splitting: false,
});
