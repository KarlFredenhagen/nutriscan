/**
 * Static-host cleanup after `vite build`.
 *
 * GitHub Pages has no rewrite rules, so a deep link (or a reload on a hashed
 * URL) would 404. Serving index.html as 404.html keeps the app bootable at any
 * path. `.nojekyll` stops Pages from running Jekyll over the build output.
 */
import { copyFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;

const exists = async (path) => {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
};

const required = ["index.html", "manifest.webmanifest", "sw.js"];
const missing = [];
for (const file of required) {
  if (!(await exists(join(dist, file)))) missing.push(file);
}
if (missing.length) {
  console.error(`postbuild: missing from dist: ${missing.join(", ")}`);
  process.exit(1);
}

await copyFile(join(dist, "index.html"), join(dist, "404.html"));
await writeFile(join(dist, ".nojekyll"), "");

const files = await readdir(dist);
const icons = files.includes("icons") ? await readdir(join(dist, "icons")) : [];
console.log(
  `postbuild: 404.html + .nojekyll written, ${icons.length} icons, manifest and service worker present`,
);
