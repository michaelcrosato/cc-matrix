import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const name = path.basename(process.cwd());
let shell = fs.readFileSync("shell.html", "utf8");
const hub = fs.readFileSync("hub/session.js", "utf8").replace(/<\/script/gi, "<\\/script");
shell = shell.replace("<!-- HUB_SESSION -->", `<script>${hub}</script>`);
let code = ["audio.js", "network.js", "world.js", "credits.js"]
  .map((f) => fs.readFileSync(f, "utf8").replace(/^export /gm, ""))
  .join("\n");
code +=
  "\n" +
  fs
    .readFileSync("main.js", "utf8")
    .replace(/^import\s+\{[^}]+\}\s+from\s+["']\.\/[^"']+["'];?\n/gm, "");
if (/^import.*from ["']\.\//m.test(code)) throw new Error("Unbundled local module import");
const syntax = spawnSync(process.execPath, ["--check", "--input-type=module"], {
  input: code,
  encoding: "utf8",
});
if (syntax.status !== 0) throw new Error(syntax.stderr);
const local = shell.replace(
  '<script type="module" src="main.js"></script>',
  `<script type="module">${code.replace(/<\/script/gi, "<\\/script")}</script>`,
);
fs.writeFileSync("index.html", local);
const remote = local
  .replace(
    "./node_modules/three/build/three.module.js",
    "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js",
  )
  .replace(
    "./node_modules/three/build/three.webgpu.js",
    "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js",
  )
  .replace(
    "./node_modules/three/build/three.tsl.js",
    "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.tsl.js",
  )
  .replace(
    "./node_modules/@dimforge/rapier3d-compat/rapier.mjs",
    "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs",
  );
fs.writeFileSync("../" + name + ".html", remote);
console.log("Built " + name + ".html");
