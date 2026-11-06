import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { stateTests } from "../tests/state.mjs";
import { packagingTests } from "../tests/packaging.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let results = [];
const requested = process.argv.slice(2);
const all = !requested.length;
if (all || requested.includes("state")) {
  const state = stateTests();
  results.push(...state.results);
  fs.writeFileSync(
    path.join(root, "artifacts/state-results.json"),
    JSON.stringify(state, null, 2),
  );
}
if (all || requested.includes("packaging")) {
  const report = packagingTests(root);
  results.push(...report.results);
  fs.writeFileSync(
    path.join(root, "artifacts/packaging-results.json"),
    JSON.stringify(report, null, 2),
  );
}
for (const target of ["browser", "network"])
  if (all || requested.includes(target)) {
    const run = spawnSync(
      "/home/micha/.local/share/pipx/venvs/playwright/bin/python",
      [path.join(root, "tests", target + ".py")],
      { cwd: root, encoding: "utf8", timeout: 240000 },
    );
    fs.writeFileSync(
      path.join(root, "artifacts", target + "-runner.log"),
      run.stdout + "\n" + run.stderr,
    );
    let report;
    try {
      report = JSON.parse(run.stdout.trim());
    } catch {
      report = {
        results: [
          {
            name: target + " runner",
            pass: false,
            error: run.stderr || run.stdout || "Runner did not return a report",
          },
        ],
      };
    }
    results.push(...report.results);
    fs.writeFileSync(
      path.join(root, "artifacts", target + "-results.json"),
      JSON.stringify(report, null, 2),
    );
  }
for (const r of results)
  if (!r.pass) console.log("FAIL " + r.name + "\n" + r.error);
const failed = results.filter((r) => !r.pass).length;
console.log(
  `${results.length - failed}/${results.length} checks passed; ${failed} failures.`,
);
fs.writeFileSync(
  path.join(root, "artifacts/last-test.json"),
  JSON.stringify(
    {
      checks: results.length,
      passed: results.length - failed,
      failed,
      groups: all ? ["state", "packaging", "browser", "network"] : requested,
    },
    null,
    2,
  ),
);
process.exitCode = failed ? 1 : 0;
