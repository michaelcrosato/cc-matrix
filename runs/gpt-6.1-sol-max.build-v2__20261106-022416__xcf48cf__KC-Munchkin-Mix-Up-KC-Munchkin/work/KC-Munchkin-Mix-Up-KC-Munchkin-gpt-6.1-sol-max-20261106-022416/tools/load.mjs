import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
export const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const order = [
  "sim/core",
  "sim/board",
  "content/stages",
  "content/validate",
  "sim/world",
  "sim/bot",
  "workshop/editor",
  "audio/sound",
  "view/theatre",
  "net/session",
  "ui/screens",
  "main",
];
export function loadCore(extra = []) {
  vm.runInThisContext(
    readFileSync(path.join(root, "vendor/engine/dist/handoff/my-3d2dge.js"), "utf8"),
    { filename: "my-3d2dge.js" },
  );
  for (const name of [
    "sim/core",
    "sim/board",
    "content/stages",
    "content/validate",
    "sim/world",
    "sim/bot",
    "workshop/editor",
    ...extra,
  ]) {
    try {
      vm.runInThisContext(readFileSync(path.join(root, `src/${name}.js`), "utf8"), {
        filename: name,
      });
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  return globalThis.Mix;
}
