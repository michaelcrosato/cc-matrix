import fs from "node:fs";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { rules, campaign } from "../tests/sim.mjs";
import { artifact } from "../tests/artifact.mjs";
let passed = 0,
  failed = 0;
const evidence = [];
async function test(name, fn) {
  try {
    await fn();
    passed++;
    evidence.push({ name, pass: true });
  } catch (e) {
    failed++;
    console.error(`FAIL ${name}: ${e.stack || e}`);
    evidence.push({ name, pass: false, error: String(e.stack || e) });
  }
}
const groups = process.argv.slice(2);
const want = (g) => !groups.length || groups.includes(g);
if (want("rules")) await rules(test);
if (want("campaign")) await campaign(test);
if (want("artifact")) await artifact(test);
for (const group of ["browser", "network"])
  if (want(group)) {
    const p = spawnSync("/home/micha/.local/share/pipx/venvs/playwright/bin/python", [`tests/${group}.py`], {
      encoding: "utf8",
      timeout: 480000,
    });
    if (p.error || p.status)
      await test(group + " process", () => {
        throw p.error || Error(p.stdout + p.stderr);
      });
    else {
      const result = JSON.parse(fs.readFileSync(`tests/artifacts/${group}-results.json`, "utf8"));
      for (const r of result)
        await test(r.name, () => {
          if (!r.pass) throw Error(r.error);
        });
    }
  }
fs.writeFileSync(
  "tests/artifacts/test-summary.json",
  JSON.stringify(
    {
      groups: groups.length ? groups : ["rules", "campaign", "artifact", "browser", "network"],
      passed,
      failed,
      evidence,
    },
    null,
    2,
  ) + "\n",
);
console.log(`${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
