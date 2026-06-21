import tailwind from "bun-plugin-tailwind";
import { rm, cp } from "node:fs/promises";
import path from "node:path";

const outdir = path.join(process.cwd(), "dist");
await rm(outdir, { recursive: true, force: true });

const entrypoints = [...new Bun.Glob("src/**/*.html").scanSync()];

const result = await Bun.build({
  entrypoints,
  outdir,
  plugins: [tailwind],
  minify: true,
  target: "browser",
  sourcemap: "linked",
  // Inline BUN_PUBLIC_* env vars (SUPABASE_URL/ANON_KEY/API_BASE_URL) into the
  // production bundle, matching the dev server's behaviour. Without this the
  // built site would read undefined config and fail to start.
  env: "BUN_PUBLIC_*",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

for (const output of result.outputs) {
  console.log(` ${path.relative(process.cwd(), output.path)}  ${(output.size / 1024).toFixed(1)} KB`);
}

// Copy the assets folder into dist so runtime-referenced images (data-driven
// product/service images under assets/images/...) are served by static hosts at
// the same /assets/... paths the dev server exposes. Mirrors the /assets/* route
// in src/index.ts.
await cp(path.join(process.cwd(), "assets"), path.join(outdir, "assets"), {
  recursive: true,
});

// SPA fallback for static hosts (Cloudflare Pages / Netlify): route every path
// to index.html so client-side routes like /services or /dashboard work on a
// direct hit or refresh. (Vercel uses vercel.json rewrites instead.)
await Bun.write(path.join(outdir, "_redirects"), "/*    /index.html   200\n");

