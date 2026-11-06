/* One quiet verification command. Successful unchanged suites reuse their recorded evidence. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { runSimTests } from "../tests/sim.mjs";
import { runNetTests } from "../tests/net.mjs";
import { frontendTests } from "../tests/frontend.mjs";
import { runPackageTests } from "../tests/package.mjs";
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  root = path.resolve(base, "..");
const id = JSON.parse(fs.readFileSync(path.join(base, "identity.json"), "utf8"));
const artifact = path.join(root, id.stem + ".html"),
  python = "/home/micha/.local/share/pipx/venvs/playwright/bin/python";
const cachePath = path.join(base, "artifacts/verification-cache.json"),
  summaryPath = path.join(base, "artifacts/verification.json");
let cache = {};
try {
  cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
} catch {}
const all = [],
  executed = [],
  cached = [];
const engine = "vendor/engine-repo/dist/handoff/my-3d2dge.js";
const sim = ["src/config.js", "src/content.js", "src/sim.js", "src/bot.js", engine];
const runtime = [
  ...sim,
  "src/presentation.js",
  "src/audio.js",
  "src/input.js",
  "src/ui.js",
  "src/net.js",
  "src/main.js",
  "src/style.css",
  "tools/build.mjs",
  "vendor/hub-repo/lib/hub/session.js",
];
function digest(files) {
  const h = createHash("sha256");
  for (const file of files) {
    h.update(file);
    h.update(fs.readFileSync(path.join(base, file)));
  }
  return h.digest("hex");
}
function child(command, args, timeout = 360000) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { cwd: base, stdio: ["ignore", "pipe", "pipe"] });
    let out = "",
      err = "";
    process.stdout.on("data", (d) => (out += d));
    process.stderr.on("data", (d) => (err += d));
    const timer = setTimeout(() => {
      process.kill("SIGTERM");
      reject(Error("Verification child timed out: " + args.join(" ")));
    }, timeout);
    process.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    process.on("close", (code) => {
      clearTimeout(timer);
      resolve({ out, err, code });
    });
  });
}
async function suite(name, deps, runner) {
  const fingerprint = digest(deps);
  if (cache[name]?.fingerprint === fingerprint && cache[name].results?.every((r) => r.pass)) {
    all.push(...cache[name].results);
    cached.push(name);
    return;
  }
  let results;
  try {
    results = await runner();
    if (!Array.isArray(results) || !results.length) throw Error("Suite returned no checks");
  } catch (e) {
    results = [{ name, pass: false, detail: e.stack || String(e) }];
  }
  executed.push(name);
  all.push(...results);
  if (results.every((r) => r.pass))
    cache[name] = { fingerprint, results, verifiedAt: new Date().toISOString() };
  fs.writeFileSync(
    path.join(base, "artifacts", name + "-checks.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
}
async function browser(script, flags = []) {
  const result = await child(python, [path.join(base, script), artifact, "--json", ...flags]);
  const name = path.basename(script, ".py");
  fs.writeFileSync(path.join(base, "artifacts", name + "-stdout.log"), result.out);
  fs.writeFileSync(path.join(base, "artifacts", name + "-stderr.log"), result.err);
  try {
    return JSON.parse(result.out);
  } catch {
    throw Error("Browser checker did not return JSON: " + result.out + "\n" + result.err);
  }
}
try {
  const build = await child(process.execPath, [path.join(base, "tools/build.mjs")], 30000);
  if (build.code) throw Error(build.err || build.out);
  await suite("simulation", ["tests/sim.mjs", ...sim], runSimTests);
  await suite(
    "frontend-native",
    ["tests/frontend.mjs", "src/input.js", "src/ui.js", "src/config.js", engine],
    frontendTests,
  );
  await suite("network-native", ["tests/net.mjs", "src/net.js", ...sim], runNetTests);
  await suite(
    "presentation",
    ["tools/presentation-check.mjs", "src/presentation.js", "src/audio.js", ...sim],
    async () => {
      const r = await child(
        process.execPath,
        [path.join(base, "tools/presentation-check.mjs")],
        30000,
      );
      fs.writeFileSync(path.join(base, "artifacts/presentation-check.log"), r.out + r.err);
      const n = Number(r.out.match(/(\d+) presentation checks/)?.[1] || 0);
      if (r.code || !n) throw Error(r.out + r.err);
      return Array.from({ length: n }, (_, i) => ({
        name: "native presentation invariant " + (i + 1),
        pass: true,
      }));
    },
  );
  // Each browser child closes its own process and contexts before the next starts.
  await suite("frontend-browser", ["tests/frontend-browser.py", ...runtime], () =>
    browser("tests/frontend-browser.py"),
  );
  await suite("artifact-browser", ["tests/browser.py", ...runtime], () =>
    browser("tests/browser.py"),
  );
  await suite(
    "hub-browser",
    [
      "tools/hub-browser.py",
      ...runtime,
      "vendor/hub-repo/lib/hub/harness.html",
      "vendor/hub-repo/lib/hub/bridge.js",
      "vendor/hub-repo/lib/hub/round.js",
    ],
    () => browser("tools/hub-browser.py"),
  );
  all.push(...(await runPackageTests()));
} catch (e) {
  all.push({ name: "verification orchestration", pass: false, detail: e.stack || String(e) });
}
const failed = all.filter((r) => !r.pass);
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2) + "\n");
fs.writeFileSync(
  summaryPath,
  JSON.stringify(
    {
      build: id.title,
      artifact: path.basename(artifact),
      pass: !failed.length,
      total: all.length,
      failed: failed.length,
      executed,
      cached,
      results: all,
    },
    null,
    2,
  ) + "\n",
);
for (const r of failed) console.error("FAIL " + r.name + "\n" + (r.detail || "No detail"));
console.log(
  all.length -
    failed.length +
    "/" +
    all.length +
    " checks passed" +
    (cached.length ? " (" + cached.length + " unchanged suites cached)" : ""),
);
if (failed.length) process.exitCode = 1;
