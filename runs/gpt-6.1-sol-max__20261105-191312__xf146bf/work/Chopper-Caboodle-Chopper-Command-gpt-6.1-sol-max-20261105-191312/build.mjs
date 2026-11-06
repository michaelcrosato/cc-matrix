import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
const dir = path.dirname(new URL(import.meta.url).pathname);
process.chdir(dir);
const project = JSON.parse(await fs.readFile("project.json", "utf8"));
const bundle = await build({
  entryPoints: ["src/main.js"],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2022",
  minify: true,
  legalComments: "inline",
  logLevel: "silent",
});
const [template, style, hub] = await Promise.all(
  ["src/template.html", "src/style.css", "vendor/hub-session.js"].map((p) =>
    fs.readFile(p, "utf8"),
  ),
);
const script = bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = template
  .replace("<!--HUB_CLIENT-->", "<script>" + hub + "</script>")
  .replace("/*GAME_STYLE*/", style)
  .replace("/*GAME_SCRIPT*/", script);
const file = path.join(dir, "..", project.slug + ".html");
await fs.writeFile(file, html);
await fs.writeFile("index.html", html);
for (const name of ["harness.html", "bridge.js", "round.js"])
  await fs.copyFile("vendor/hub-" + name, name);
console.log(
  project.title +
    " built: " +
    (Buffer.byteLength(html) / 1024 / 1024).toFixed(2) +
    " MB, fully self-contained.",
);
