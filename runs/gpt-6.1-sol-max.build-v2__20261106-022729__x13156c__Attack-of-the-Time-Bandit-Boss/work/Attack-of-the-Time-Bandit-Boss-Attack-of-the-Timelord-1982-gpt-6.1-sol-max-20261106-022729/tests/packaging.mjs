import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
export function packagingTests(root) {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (e) {
      results.push({ name, pass: false, error: e.stack });
    }
  };
  const work = path.dirname(root),
    config = JSON.parse(
      fs.readFileSync(path.join(root, "build-config.json"), "utf8"),
    ),
    artifact = path.join(work, config.base + ".html"),
    html = fs.readFileSync(artifact, "utf8"),
    interview = JSON.parse(
      fs.readFileSync(path.join(work, "exit-interview.json"), "utf8"),
    );
  test("complete exit interview shape, ordered feedback and matching catalogue", () => {
    assert.deepEqual(Object.keys(interview), [
      "sourceInformation",
      "testingFeedback",
      "engineFeedback",
      "promptFeedback",
      "aiHub",
    ]);
    assert.equal(Object.keys(interview.sourceInformation).length, 15);
    assert(
      Object.values(interview.sourceInformation).every(
        (v) => typeof v === "string" && v.length > 0,
      ),
    );
    assert.equal(interview.sourceInformation.usage, "added on import");
    assert.equal(interview.testingFeedback.length, 4);
    assert.equal(interview.engineFeedback.length, 6);
    assert.equal(interview.promptFeedback.length, 4);
    assert.equal(interview.aiHub.name, config.title);
    assert.equal(interview.aiHub.players, "1–4");
    assert(
      interview.aiHub.tags.length >= 3 && interview.aiHub.tags.length <= 6,
    );
  });
  test("fifty-candidate real RNG title selection and required delivery name", () => {
    const selected = JSON.parse(
      fs.readFileSync(path.join(root, "docs/title-selection.json"), "utf8"),
    );
    assert.equal(selected.candidates.length, 50);
    assert.equal(new Set(selected.candidates).size, 50);
    assert.equal(selected.candidates[selected.selectedIndex], config.title);
    assert(
      config.base.endsWith(
        "Attack-of-the-Timelord-1982-gpt-6.1-sol-max-20261106-022729",
      ),
    );
    assert(html.includes("<title>" + config.title + "</title>"));
  });
  test("unmodified Hub client is first script immediately after charset", () => {
    const client = fs.readFileSync(
      path.join(root, "vendor/hub/session.js"),
      "utf8",
    );
    const first = html.match(
      /<meta charset="utf-8">\s*<script>([\s\S]*?)<\/script>/,
    );
    assert(first);
    assert.equal(first[1], client.replace(/<\/script/gi, "<\\/script"));
    for (const tag of [
      "hub:session",
      "hub:session-players",
      "hub:session-mode",
      "hub:session-goal",
      "hub:session-howto",
    ])
      assert(html.includes('name="' + tag + '"'));
  });
  test("single-file scripts parse, dependencies inline, no accidental local source paths", () => {
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 3);
    for (const [, script] of scripts) new Function(script);
    assert(!/<script[^>]+src=/.test(html));
    assert(!/type="module"/.test(html));
    assert(!/(src|href)="(?:\.\/)?(?:src|vendor)\//.test(html));
  });
  return {
    results,
    sha256: crypto.createHash("sha256").update(html).digest("hex"),
    bytes: Buffer.byteLength(html),
  };
}
