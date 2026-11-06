**Wibble Fit** is finished: every step in PLAN.md is built with nothing cut, and the HTML game and exit interview are in the folder. No person has played it, so the balance and the feel of the controls were tuned with bots only, and it has only run on software rendering here.

## Test results
| Check | Result |
|---|---|
| Node tests, including a full week played through the real menus | 13,744 of 13,744 passed, though thousands of those are single-character font checks |
| Browser tests (pad, keyboard and mouse prompts, phone profile, Family Hour, audio levels, layout at three sizes) | 70 of 70 passed |
| AI Hub harness at 1, 2 and 4 players, plus host-leave, plus a normal boot outside a session | 12 of 12 passed |
| The engine kit's own `check.mjs` | passed |

- **Test runs:** `node tools/test.mjs` runs all the suites, but its last full run stopped at the browser tests, which were timing out on the slow, shared machine. I made them wait for real frames, then reran the browser and hub suites separately. The game's code didn't change after the Node run.
- **Engine:** `pixel-engine.js` still matches its original hash.

## Where I departed from the plan
- **Hoop catch:** a flick now has to be held for 0.26 s, because as written, circling caught every hoop by accident.
- **Vitamin Tray:** a vitamin only counts as wrong if it stays in the wrong cup for 0.9 s, so a tilt can't lose several points at once.
- **File layout:** the session card and Family Hour's join screen live in `medley.js`, and there is no separate boot scene.

## Source Information
- **Date:** 2026-11-05 00:18:33
- **Source:** Wii Fit
- **Plan:** PLAN.md
- **Genre and Perspective:** fitness and balance minigame collection inside a light life-sim week; isometric on the island, fixed front-on for class activities, other fixed views per activity
- **Tech:** Pixel Engine 0.46.0 (riftlight kit) with three.js r186 and Rapier as bundled in it; esbuild 0.28.2 for packaging; no other libraries
- **Art Direction:** the engine's native pixel look: toon materials, 16-colour palette, low-poly models written as data
- **Animation:** engine ClipDefs with AnimationMixer, plus scrubbed reps and procedural layers (Squash, SpringChain, Dot lean)
- **Audio:** engine Song and SoundDef data plus a Web Audio formant voice in gibberish; no audio files; music at 10% by default
- **Online:** AI Hub Session Protocol v1, ghost mode, own card, 1–4 players; Family Hour is local on one screen
- **Testing:** allowed: headless scripts, a scripted playthrough, browser checks and screenshots. Used: Node scripts with bots, Playwright on file://, the hub harness at 1, 2 and 4 players, screenshots for composition. No human playtest.
- **Research:** read the kit guide, assets guide, API reference and hub README; no web research. The director's plan included engine and hub research and spikes.
- **Environment:** Claude Code CLI (headless); Linux
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** added on import

## Testing Feedback
- **How many issues did testing catch?** About 14 real issues: 6 found by scripts and 8 by looking at screenshots. A few more failures were bugs in the tests themselves and are not counted.
- **How many were critical or game breaking?** 3. The lean added to the body piled up frame after frame until everyone fell over; the hoop hip motion did the same and carried avatars off screen; and vitamins fell asleep in the physics world, so the tray could not be played.
- **Most helpful test?** The scripted playthrough through the real menus. It found that the press closing a dialogue also acted on the scene, which opened the wrong screen. The bot score table was a close second, for balance.
- **Least helpful test?** The per-character glyph check. It adds thousands of passes to the count and never failed. The clip checks also never failed, though the plan's poses were already verified.

## Engine Feedback
- **What did you like most?** Running the same game headless in Node. Whole playthroughs took minutes, replays matched exactly, and models as plain data were quick to write and check.
- **Did you get stuck or guess wrong?** Yes. Screen transitions never finish under `step()` in a browser, though they do headless. The mixer leaves unkeyed joints alone, so additive pose layers pile up. Dynamic bodies sleep through a gravity change. I first guessed `pixelSize` took a number, and that the audio had a master bus to listen on.
- **Most important thing you built yourself?** The Dot with its driver seam, so one lane code serves the player, bots, pads, ghosts, attract and tests. Next, the HUD kit: mixed-case text, menus, prompts and glyphs.
- **Hardest part of using the engine?** All UI through a retained pixel HUD with no widgets or layout, at art sizes that change with the window. Text legibility over a bright 3D world took several passes.
- **What did you change in the engine?** None.
- **One thing you would change?** A public beat clock and audio buses, since Step Class relies on undocumented fields (`song.start`, `buses.sfx`), and a small built-in menu and text layer for the HUD.

## Prompt Feedback
- **What did you like most?** The plan's verified recipes and numbers. The Dot table, the single-file build, the browser flags and the hub boot order all worked as written, which saved a lot of time.
- **What was confusing?** Whether GameTitle and SOURCE in the file name keep their spaces; I chose `WibbleFit-WiiFit`. The file name also has to contain a source name the game itself may not use on screen, apart from credits.
- **Hardest thing to do?** The breadth: 17 activities, a week, attract, dev tools, one-screen and online multiplayer, in one run with only software rendering and no way to feel the controls by hand. Balance rests on bots, not on a person.
- **What would you change?** Fix the hoop flick as described above, say the file name format exactly, and allow a line for what could not be judged without a human player.

## Files
Everything is in `work/`:
- `WibbleFit-WiiFit-claude-opus-5-5-medium-20261105-001833.html`
- `exit-interview.json`
- `WibbleFit-WiiFit-claude-opus-5-5-medium-20261105-001833/` (source, tests and `PROGRESS.md`)