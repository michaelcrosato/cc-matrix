import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = JSON.parse(fs.readFileSync(path.join(root, "project.json"), "utf8"));
const interviewPath = path.join(root, "..", "exit-interview.json");
const report = fs.existsSync(interviewPath)
  ? JSON.parse(fs.readFileSync(interviewPath, "utf8"))
  : {
      sourceInformation: { source: project.source, plan: "PLAN.md", usage: "added on import" },
      testingFeedback: ["unknown", "unknown", "unknown", "unknown"],
      engineFeedback: Array(6).fill("unknown"),
      promptFeedback: Array(4).fill("unknown"),
    };
const names = [
  "content/sectors.js",
  "sim/world.js",
  "sim/pilot.js",
  "presentation/art.js",
  "presentation/audio.js",
  "input/controls.js",
  "online/session.js",
  "dev/tools.js",
  "main.js",
];
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
const client = fs.readFileSync(path.join(root, "vendor/hub/session.js"), "utf8");
if (/<\/script/i.test(client)) throw Error("Pristine session client needs an upstream-safe embed revision.");
const engine = fs.readFileSync(path.join(root, "vendor/engine/my-3d2dge.js"), "utf8");
const scripts = names.map((p) => fs.readFileSync(path.join(root, "src", p), "utf8")).join("\n");
const metadata = JSON.stringify({ project, report }).replaceAll("<", "\\u003c");
const html = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<script>\n${client}</script>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="theme-color" content="#06111c">\n<title>${project.title}</title>\n<meta name="description" content="Small wings. Colossal revenge. An original three-sector arcade siege for one or two scouts.">\n<meta name="hub:type" content="Game">\n<meta name="hub:players" content="1-2">\n<meta name="hub:genre" content="Shooter">\n<meta name="hub:session" content="1">\n<meta name="hub:session-players" content="1-2">\n<meta name="hub:session-mode" content="shared-world">\n<meta name="hub:session-minutes" content="10">\n<meta name="hub:session-goal" content="Free the Ilex swarm: breach three fortresses, charge remote siege guns, and intercept the final flying heart.">\n<meta name="hub:session-howto" content="Left stick / WASD move; right stick / mouse aim; R2 / left click fire; L2 / right click / Space siege, then move clear. Bite by contact. Touch: invisible twin sticks and contextual siege button.">\n<style>${fs.readFileSync(path.join(root, "src/styles.css"), "utf8")}</style>\n</head>\n<body>\n<canvas id="screen" aria-label="Yars on the Edge battlefield"></canvas>\n<script>\n${safe(engine)}\n</script>\n<script>\n(()=>{const m=${metadata};globalThis.Edge={PROJECT:m.project,REPORT:m.report};})();\n${safe(scripts)}\n</script>\n</body>\n</html>\n`;
const out = path.join(root, "..", project.slug + ".html");
fs.writeFileSync(out, html);
fs.writeFileSync(path.join(root, "index.html"), html);
fs.writeFileSync(
  path.join(root, "tests/artifacts/build.json"),
  JSON.stringify(
    {
      file: path.basename(out),
      bytes: Buffer.byteLength(html),
      sha256: crypto.createHash("sha256").update(html).digest("hex"),
      clientSha256: crypto.createHash("sha256").update(client).digest("hex"),
      scripts: names,
      engineVersion: "0.89.1",
    },
    null,
    2,
  ) + "\n",
);
console.log(`Built ${path.basename(out)} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KiB)`);
