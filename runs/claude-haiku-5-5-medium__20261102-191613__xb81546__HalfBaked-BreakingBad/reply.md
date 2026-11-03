The game is built and the goal's conditions hold. The bundled single file is `HalfBaked-BreakingBad-claude-haiku-5-5-medium-20261102-191613.html`, `exit-interview.json` sits beside it, and the dev files are in `HalfBaked-BreakingBad-claude-haiku-5-5-medium-20261102-191613/`. The RNG picked the title **Half Baked** from 50 candidates.

## What's built

- **Genre and view:** stealth, with a timing-based cook minigame and a boss fight. Three-quarter view by default, with V (or controller Select) cycling to top-down and isometric.
- **Three chapters:** cook a batch in the garage, sell to three buyers in the desert while staying out of an agent's sight (heat fills and busts the run), then fight Vance Tolliver in a car-wash yard.
- **Attract mode:** after 10 s idle the AI plays all three chapters, cheating freely. Any key, click or pad button returns to the title.
- **Controls:** keyboard, mouse and pad. PlayStation glyphs by default, with an Xbox option. Settings include invert-stick X and Y. Touch-only devices get "Controller or keyboard required" and no touch controls, and attract still runs.
- **Multiplayer:** the AI Hub client (`session.js`) with parallel mode, 1–4 players, 8-minute shifts, and cash as the score.
- **Audio:** all music and sound effects are synthesized in code. Dialogue uses animalese-style blips.
- **Credits:** the About & Credits screen includes all four report sections.

## Testing

- **Unit tests (Node):** 26 pass. They cover the rules, the level data, and the audio helpers.
- **Browser playthrough (Chromium, real key presses):** 17/17. It covers the title, cooking, three sales, the boss, and results.
- **System checks:** 14/14. They cover attract, heat and busts, pause, camera, settings, glyphs and touch-only.
- **Hub stand-in test:** 8/8. The game joins, starts with the hub's seed, and posts its cash score once at time-up.
- **Viewport matrix:** 23/23 clean across phone, tablet and desktop, in WebKit, Chromium and Firefox.
- **Screenshots:** I reviewed them and fixed the layout issues they showed.

## Source Information

- **Date:** 2026-11-02 19:16
- **Source:** Breaking Bad (2008-2013), as a spiritual successor with no characters, text or art reused
- **Genre and Perspective:** Stealth with a cook minigame and boss fight; three-quarter view, switchable to top-down and isometric
- **Tech:** my-3D2dge v0.85.1 (full engine, vendored and inlined), AI Hub session client (protocol v1), plain JavaScript
- **Art Direction:** Engine-native procedural pixel art, SNES-scale buffer, drawn 3D rigs
- **Animation:** Engine Humanoid rigs, E.Attack and E.Combo moves, tweens
- **Audio:** All chip synth in code: five songs, engine sound presets, animalese speech
- **Online:** AI Hub parallel session, 1–4 players, 8-minute shifts, score = cash
- **Testing:** Unit tests, headless browser playthrough, system checks, hub stand-in test, viewport matrix
- **Research:** Engine and hub documentation only
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-haiku-5-5, reasoning effort medium
- **Usage:** unknown

## Testing Feedback

- **How many issues did testing catch?** About 14, found by my own review, the unit tests and the browser runs.
- **How many were critical or game-breaking?** Two. The attract run stalled on its first dialogue, and leaving attract threw an error on a cleared state. Both broke a required feature.
- **Most helpful test:** the full playthrough with real key presses. It covers the whole path, and it caught that the boss-defeat line was never shown.
- **Least helpful test:** the viewport matrix. The game draws onto one canvas, so it reports no overflow almost by construction. It confirmed the layouts but found no game bugs.

## Engine Feedback

- **Liked most:** the scene system, the TileMap with Body and FlowField, the Humanoid rigs with E.Combo and E.Attack, and the built-in menu, settings and pause screens.
- **Got stuck or guessed wrong?** Yes. Dialog uses one voice per letter, so I wrapped `audio.sfx` for pitch jitter. `game.input.anyPressed()` ignores keys no action uses. The DEFAULT preset binds dash to Space, which is also confirm. E.Menu's arrow keys stop on disabled items.
- **Most important thing I built myself:** the cook minigame, the sight-and-heat rules, the attract AI, the hub wiring and the animalese hook.
- **Hardest part:** the pixel font lacks curly quotes, and blocking dialogue stalls any run without a player.
- **One thing to remove or overhaul:** the default input preset. Dash on Space clashes with confirm. Presets should bind each action explicitly, or warn on shared keys.
- **One change I'd make:** a per-letter dialogue callback, and menu arrows that skip disabled items.

## Prompt Feedback

- **Liked most:** the fixed report sections and the JSON shape.
- **Confusing:** how to fill Usage when no cost or token figures are available (I used "unknown"), and whether the credits must repeat the feedback sections (I did both).
- **Hardest:** making the game feel complete in one pass: stealth, cooking, a boss, attract mode and a hub round, each with tests.
- **A test I'd add:** a real pad. I could only fake pad state in the browser.

## Caveats

- **Not run on hardware:** no real controller, and no real iOS Safari. WebKit with iPhone profiles is the closest check.
- **Multiplayer:** tested against my own stand-in host, not the real AI Hub test harness or registration.
- **Animalese:** randomized-pitch blips, not a recorded or true Animalese-style voice.
- **Controller inversion and glyphs:** checked by code and screenshots, not on a real pad.
- **Dash binding:** I moved dash off Space to Shift/K, so Space only confirms.