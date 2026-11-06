import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { order, root } from "./load.mjs";

const project = JSON.parse(readFileSync(path.join(root, "project.json"), "utf8"));
const release = JSON.parse(readFileSync(path.join(root, "src/release.json"), "utf8"));
const client = readFileSync(path.join(root, "vendor/hub/lib/hub/session.js"), "utf8");
if (/<\/script/i.test(client)) throw new Error("Session client contains a closing script tag");
const escape = (s) => s.replace(/<\/script/gi, "<\\/script");
const engine = readFileSync(path.join(root, "vendor/engine/dist/handoff/my-3d2dge.js"), "utf8");
const source = order
  .map((name) => readFileSync(path.join(root, `src/${name}.js`), "utf8"))
  .join("\n");
const license = readFileSync(path.join(root, "vendor/engine/LICENSE"), "utf8");
const css = readFileSync(path.join(root, "src/theme.css"), "utf8");
const html = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<script>${client}</script>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>${project.title}</title>\n<meta name="description" content="${release.aiHub.description}">\n<meta name="theme-color" content="#21182f">\n<meta name="hub:session" content="1">\n<meta name="hub:session-players" content="1-2">\n<meta name="hub:session-mode" content="shared-world">\n<meta name="hub:session-goal" content="Clear six mazes together. Munch twelve moving snacks per maze; keep your five team lives.">\n<meta name="hub:session-howto" content="Move: stick/D-pad or WASD/arrows. Cross/Space: reveal shy walls. Options/Escape: local menu.">\n<meta name="hub:session-minutes" content="8">\n<meta name="hub:type" content="Game">\n<meta name="hub:players" content="1-2">\n<style>${css}</style>\n<!-- my-3D2dge license
${license}
-->
<script>${escape(engine)}</script>\n</head>\n<body>\n<canvas id="screen" aria-label="K.C. Munchkin Mix-Up maze"></canvas>\n<div id="load-error" hidden></div>\n<script>globalThis.Mix={RELEASE:${escape(JSON.stringify(release))}};\n${escape(source)}</script>\n</body>\n</html>\n`;
const output = path.join(root, "..", project.base + ".html");
writeFileSync(output, html);
writeFileSync(path.join(root, "build/index.html"), html);
writeFileSync(path.join(root, "../exit-interview.json"), JSON.stringify(release, null, 2) + "\n");
for (const name of ["harness.html", "bridge.js", "round.js"])
  copyFileSync(path.join(root, "vendor/hub/lib/hub", name), path.join(root, "tools/hub", name));
writeFileSync(
  path.join(root, "vendor/REVISIONS.json"),
  JSON.stringify(
    {
      engine: {
        version: "0.89.1",
        commit: "8ecc2f62353761187bdfe226f327b7ea5d2eb691",
        changes: "none",
      },
      hub: {
        protocol: 1,
        client: "1.4.0",
        commit: "35a1047f2067b2af3de3943f0fe452f39105d869",
        changes: "none",
      },
    },
    null,
    2,
  ) + "\n",
);
if (process.argv.includes("--verbose")) console.log(output);
