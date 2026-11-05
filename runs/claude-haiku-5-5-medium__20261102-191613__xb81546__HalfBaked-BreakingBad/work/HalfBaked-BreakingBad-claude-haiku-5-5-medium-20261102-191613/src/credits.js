/*
 * HALF BAKED: the About & Credits screen. Each entry: { t: text, h: heading?, c: colour?, gap: extra space }.
 * The four report sections are shown here as well as in the reply and exit-interview.json.
 */
(function (root) {
  'use strict';
  var HB = root.HB;

  var SOURCE = [
    ['Date', '2026-11-02 19:16'],
    ['Source', 'Breaking Bad (2008-2013). Spiritual successor: no characters, text or art reused.'],
    ['Genre and Perspective', 'Stealth, with a timing-based cook minigame and a boss fight. Three-quarter view, switchable to top-down and isometric.'],
    ['Tech', 'my-3D2dge v0.85.1 (full engine, vendored and inlined), AI Hub session client (protocol v1), plain JavaScript'],
    ['Art Direction', 'Engine-native procedural pixel art: SNES-scale buffer, drawn 3D rigs, dithered lighting'],
    ['Animation', 'Engine Humanoid rigs (procedural skeletal), E.Attack and E.Combo moves, tweens'],
    ['Audio', 'All chip synth written in code: five songs, engine sound presets, animalese speech for dialogue'],
    ['Online', 'AI Hub parallel session, 1 to 4 players, 8 minute shifts, score = cash earned'],
    ['Testing', 'Unit tests (Node), headless playthrough tests, browser checks with Playwright'],
    ['Research', 'Engine and hub documentation only'],
    ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'],
    ['Model', 'Anthropic, claude-haiku-5-5, reasoning effort medium'],
    ['Usage', 'unknown']
  ];

  var lines = [];
  lines.push({ t: 'HALF BAKED', h: true, gap: 6 });
  lines.push({ t: 'A spiritual successor to Breaking Bad.', gap: 10 });
  lines.push({ t: 'SOURCE INFORMATION', h: true, gap: 4 });
  SOURCE.forEach(function (row) { lines.push({ t: row[0] + ': ' + row[1], gap: 2 }); });
  lines.push({ t: '', gap: 8 });
  lines.push({"t": "TESTING FEEDBACK", "h": true, "gap": 4});
  lines.push({"t": "1. About 14 issues in total, found by my own review, the unit tests and the browser runs. Two were game-breaking: the attract run stalled on its first dialogue (it waited for a key press it never sent), and leaving attract drew one frame with the run state already cleared, throwing an error. The rest were visual or input problems: an apostrophe the font cannot draw, a map with ragged rows, the boss bar covering the HUD, a floor that read as bricks, the V camera key never bound, the attract exit ignoring keys no action uses, and the AI's dash not moving the hero.", "gap": 2});
  lines.push({"t": "2. Two were critical. The attract stall and the attract exit error both broke the attract run, which is a required feature.", "gap": 2});
  lines.push({"t": "3. The full playthrough with real key presses (title, cook, three sales, boss, results): it covers the whole path and found the boss-defeat dialogue was never shown.", "gap": 2});
  lines.push({"t": "4. The viewport matrix: the game draws onto one canvas, so it reports no overflow and no DOM errors almost by construction. It confirmed the layouts, but it could not find game bugs.", "gap": 2});
  lines.push({"t": "", "gap": 6});
  lines.push({"t": "ENGINE FEEDBACK", "h": true, "gap": 4});
  lines.push({"t": "1. The scene system, the TileMap with Body and FlowField, Humanoid rigs with E.Combo and E.Attack, and the built-in settings, menu and pause screens. A lot of the game came for free.", "gap": 2});
  lines.push({"t": "2. Yes. Dialog plays one voice per letter with no per-letter variation, so I wrapped audio.sfx to jitter pitch for animalese. game.input.anyPressed() ignores keys that no action uses, so I wrote my own any-input check. The DEFAULT preset puts dash on Space, the same key as confirm, so I wrote a custom binding table. E.Menu's arrow keys counted a disabled item as a stop.", "gap": 2});
  lines.push({"t": "3. The glue: the cook minigame, the sight-and-heat rules, the attract AI, the hub wiring and the animalese hook.", "gap": 2});
  lines.push({"t": "4. Working out the pixel-font limits (no curly quotes or arrows), and the dialogue and attract interplay: a blocking dialogue box stalls any run that has no player.", "gap": 2});
  lines.push({"t": "5. The default input preset. Dash on Space, the same key as confirm, is a problem for keyboard players. I would make presets bind each action explicitly, or warn when two actions share a key.", "gap": 2});
  lines.push({"t": "6. Give the Dialog a per-letter callback, so voices can vary by letter without a wrapper, and let the menu skip disabled items when moving with the arrow keys.", "gap": 2});
  lines.push({"t": "", "gap": 6});
  lines.push({"t": "PROMPT FEEDBACK", "h": true, "gap": 4});
  lines.push({"t": "1. The clear fixed sections: Source Information, Testing, Engine and Prompt Feedback, plus the JSON shape. Without them I would have guessed at the format.", "gap": 2});
  lines.push({"t": "2. How the Usage line should be filled when no cost or token figures are available: I used unknown. Also whether the in-game credits must repeat the feedback sections or only the source information. I did both.", "gap": 2});
  lines.push({"t": "3. Making the game feel complete in one pass: a stealth system, a cook minigame, a boss, attract mode and a hub round, each with its own tests, inside one session.", "gap": 2});
  lines.push({"t": "4. A test with a real pad, run in a browser with a virtual gamepad. I could only fake the pad's state, so the controller paths (stick inversion, PlayStation and Xbox glyphs on a real controller) are checked by reading code, not by playing.", "gap": 2});

  root.HB = HB;
  HB.CREDITS = lines;
})(typeof globalThis !== 'undefined' ? globalThis : this);
