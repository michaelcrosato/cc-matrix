import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
export async function artifact(test) {
  const project = JSON.parse(fs.readFileSync("project.json", "utf8")),
    file = "../" + project.slug + ".html",
    html = fs.readFileSync(file, "utf8");
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  await test("release file name and local copy match the hand-in contract", () => {
    assert.equal(html, fs.readFileSync("index.html", "utf8"));
    assert.ok(file.includes("Yars-Revenge-gpt-6.1-sol-max-20261106-022838.html"));
  });
  await test("the pristine session client is the first script immediately after charset", () => {
    assert.match(html, /<meta charset="utf-8">\s*<script>/);
    assert.equal(blocks[0].trim(), fs.readFileSync("vendor/hub/session.js", "utf8").trim());
    assert.equal((html.match(/aihub-session 1\.4\.0/g) || []).length, 1);
  });
  await test("engine closing-script comments are safely embedded", () => {
    assert.equal(blocks.length, 3);
    for (const [i, s] of blocks.entries()) new vm.Script(s, { filename: "packaged-script-" + i });
    assert.ok(html.endsWith("</html>\n"));
  });
  await test("release HTML has no runtime local imports, asset loads or CDN dependency", () => {
    assert.doesNotMatch(html, /<script[^>]+src=/i);
    assert.doesNotMatch(html, /<link[^>]+href=/i);
    assert.doesNotMatch(html, /<img[^>]+src=/i);
    assert.doesNotMatch(blocks[2], /^\s*import\s/m);
  });
  await test("actual packaged scripts boot and enter play in the native VM", () => {
    const errors = [],
      c = { TextEncoder, console: { log() {}, warn() {}, error: (...m) => errors.push(m) } };
    vm.createContext(c);
    blocks.forEach((s, i) => vm.runInContext(s, c, { filename: "release-" + i }));
    const g = c.__game;
    g.advance(0.1);
    assert.equal(g.sceneName, "title");
    assert.equal(g._booting, false);
    g.debug.start();
    g.advance(0.3);
    assert.equal(g.sceneName, "play");
    assert.ok(c.__edge.world.tick > 10);
    assert.equal(g.errors.length, 0);
    assert.equal(errors.length, 0);
  });
  const report = JSON.parse(fs.readFileSync("../exit-interview.json", "utf8"));
  await test("exit interview has the exact required schema and complete feedback counts", () => {
    assert.deepEqual(Object.keys(report), [
      "sourceInformation",
      "testingFeedback",
      "engineFeedback",
      "promptFeedback",
      "aiHub",
    ]);
    assert.deepEqual(Object.keys(report.sourceInformation), [
      "date",
      "source",
      "plan",
      "genre",
      "perspective",
      "tech",
      "artDirection",
      "animation",
      "audio",
      "online",
      "testing",
      "research",
      "environment",
      "model",
      "usage",
    ]);
    for (const v of Object.values(report.sourceInformation)) assert.ok(typeof v === "string" && v.length);
    assert.equal(report.testingFeedback.length, 4);
    assert.equal(report.engineFeedback.length, 6);
    assert.equal(report.promptFeedback.length, 4);
    assert.equal(report.sourceInformation.usage, "added on import");
    assert.equal(report.sourceInformation.plan, "PLAN.md");
  });
  await test("catalogue title, source and controls agree with the built game", () => {
    assert.equal(report.aiHub.name, project.title);
    assert.equal(report.aiHub.type, "Game");
    assert.equal(report.aiHub.genre, "Shooter");
    assert.equal(report.aiHub.players, "1–2");
    assert.ok(report.aiHub.tags.length >= 3 && report.aiHub.tags.length <= 6);
    assert.ok(html.includes(JSON.stringify(report).replaceAll("<", "\\u003c")));
  });
  await test("all game source files are finished and contain no TODO or placeholder markers", () => {
    for (const file of ["src/main.js", "src/sim/world.js", "src/online/session.js", "src/dev/tools.js"])
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), /\b(TODO|FIXME|placeholder|stubbed)\b/i);
  });
}
