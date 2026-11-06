import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { root } from "./load.mjs";

const args = process.argv.slice(2),
  all = args.length === 0 || args.includes("--all");
let passed = 0,
  failed = 0,
  skipped = 0;
const reports = [];
const run = (name, command, argv) => {
  const p = spawnSync(command, argv, { cwd: root, encoding: "utf8", maxBuffer: 12 * 1024 * 1024 });
  let result;
  try {
    result = JSON.parse(p.stdout.trim());
  } catch {
    result = { passed: 0, failed: 1, skipped: 0, failures: [`${name}: ${p.stdout}\n${p.stderr}`] };
  }
  passed += result.passed || 0;
  failed += result.failed || 0;
  skipped += result.skipped || 0;
  reports.push({ name, ...result });
  for (const f of result.failures || []) console.log("FAIL " + f);
  for (const s of result.limitations || []) console.log("SKIP " + s);
};
if (args.includes("--visual"))
  run("visual", "/home/micha/.local/share/pipx/venvs/playwright/bin/python", ["tests/visual.py"]);
if (all || args.includes("--unit")) run("simulation", "node", ["tests/simulation.mjs"]);
if (all || args.includes("--browser") || args.includes("--smoke"))
  run("browser", "/home/micha/.local/share/pipx/venvs/playwright/bin/python", [
    "tests/browser.py",
    ...(args.includes("--smoke") ? ["--smoke"] : []),
  ]);
if (all || args.includes("--touch"))
  run("touch", "/home/micha/.local/share/pipx/venvs/playwright/bin/python", ["tests/touch.py"]);
if (args.includes("--hub-live"))
  run("hub-live", "/home/micha/.local/share/pipx/venvs/playwright/bin/python", [
    "tests/hub.py",
    "--live-only",
  ]);
if (all || args.includes("--hub"))
  run("hub", "/home/micha/.local/share/pipx/venvs/playwright/bin/python", ["tests/hub.py"]);
mkdirSync(path.join(root, "build/reports"), { recursive: true });
writeFileSync(
  path.join(root, "build/reports/latest.json"),
  JSON.stringify({ passed, failed, skipped, reports }, null, 2) + "\n",
);
console.log(`${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exitCode = failed ? 1 : 0;
