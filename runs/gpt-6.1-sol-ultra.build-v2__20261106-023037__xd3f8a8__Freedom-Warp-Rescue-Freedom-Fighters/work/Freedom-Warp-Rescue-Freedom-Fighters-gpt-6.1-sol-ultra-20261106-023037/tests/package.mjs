import assert from "node:assert/strict";
import fs from "node:fs";
const base = new URL("../", import.meta.url),
  root = new URL("../../", import.meta.url);
export async function runPackageTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (e) {
      results.push({ name, pass: false, detail: e.stack });
    }
  };
  const identity = JSON.parse(fs.readFileSync(new URL("identity.json", base), "utf8"));
  const html = fs.readFileSync(new URL(identity.stem + ".html", root), "utf8");
  const report = JSON.parse(fs.readFileSync(new URL("exit-interview.json", root), "utf8"));
  test("single exported HTML and development copy are identical", () => {
    assert.equal(html, fs.readFileSync(new URL("index.html", base), "utf8"));
    assert.ok(html.length > 500000);
    assert.ok(html.includes("<title>" + identity.title + "</title>"));
    assert.ok(!/<script[^>]+src=/.test(html));
    assert.ok(!/<audio|<video|speechSynthesis/.test(html));
  });
  test("unmodified Hub client is first script immediately after charset exactly once", () => {
    const hub = fs.readFileSync(new URL("vendor/hub-repo/lib/hub/session.js", base), "utf8");
    const match = html.match(/<meta charset="utf-8">\s*<script>([\s\S]*?)<\/script>/);
    assert.ok(match);
    assert.equal(match[1], hub);
    assert.equal(html.split(hub).length - 1, 1);
    for (const [tag, value] of [
      ["session", "1"],
      ["session-players", "1-2"],
      ["session-mode", "shared-world"],
      ["session-minutes", "15"],
    ])
      assert.ok(html.includes('name="hub:' + tag + '" content="' + value + '"'));
  });
  test("interview exact schema, canonical embedded report and catalogue values validate", () => {
    assert.deepEqual(
      Object.keys(report).sort(),
      ["sourceInformation", "testingFeedback", "engineFeedback", "promptFeedback", "aiHub"].sort(),
    );
    assert.deepEqual(
      Object.keys(report.sourceInformation).sort(),
      [
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
      ].sort(),
    );
    for (const v of Object.values(report.sourceInformation))
      assert.ok(typeof v === "string" && v.length);
    assert.equal(report.sourceInformation.usage, "added on import");
    assert.equal(report.sourceInformation.plan, "PLAN.md");
    assert.equal(report.testingFeedback.length, 4);
    assert.equal(report.engineFeedback.length, 6);
    assert.equal(report.promptFeedback.length, 4);
    for (const arr of [report.testingFeedback, report.engineFeedback, report.promptFeedback])
      assert.ok(arr.every((v) => typeof v === "string" && v.length));
    assert.equal(report.aiHub.name, identity.title);
    assert.equal(report.aiHub.type, "Game");
    assert.equal(report.aiHub.genre, "Shooter");
    assert.equal(report.aiHub.players, "1–2");
    assert.ok(
      report.aiHub.tags.length >= 3 &&
        report.aiHub.tags.length <= 6 &&
        report.aiHub.tags.every((t) => t === t.toLowerCase()),
    );
    assert.ok(html.includes(JSON.stringify(report).replace(/<\/script/gi, "<\\/script")));
  });
  return results;
}
