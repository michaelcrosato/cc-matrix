# Honk If You Owe: finished and handed in

The game is built and everything `TASK.md` asks for is in the folder. The full test command, `node tests/run.mjs`, passes on the final build: **2282 checks, 0 failures**.

You step off the last bus and soon owe a goose 8,000 beans. You then catch, dig, grow, gossip and pay it off over a sixteen-day year, one bus ride from the Big City. It runs on an unmodified engine (`pixel-engine.js` ships byte for byte).

## Late changes
A last read of `PLAN.md` showed two things I had left out, so I built them:
- **Stargazing glide:** the camera now rises and tips up from the Lookout bench while the sky comes down over the town.
- **Naming constellations:** you can now name the constellations you've found in the Almanac. This needed a new save version, and older saves migrate automatically.

Checking those in a real browser also turned up bugs the Node tests had missed, all now fixed:
- **Name typing:** on a physical keyboard, every `e` also pressed the on-screen letter under the cursor, so `Big Regret` became `Big ReAgreAt`. This affected every name box, including the player's name at new game. A real-keyboard browser test now covers it.
- **Keyboard screen:** the **Rub out** and **Done** buttons sat behind the prompt bar, and the prompts named the wrong keys.
- **Prompt bar:** wide key caps overlapped their labels.
- **Almanac:** an entry's name overlapped its description on every tab.
- **Night sky:** a hard pale band crossed the sky, and its caption touched the prompts.

## What hasn't been proven
- **Pacing and length:** no person has played it, so pacing, balance and the 2.5–5 hour length are untested.
- **Stand-ins for real hardware:**
  - Controller: a simulated DualSense, not a physical pad.
  - Sound: signal levels only; nobody has listened to it.
  - Phones and tablets: Playwright profiles and WebKit, not a real iPhone or iPad.
  - TV: judged from screenshots.
- **Internet play:** Visit's WebRTC mode only ran on one machine, without STUN servers.
- **Playthrough shortcuts:** the scripted playthrough uses real input but also teleports, forces the clock and hands out items. The replay comparison is a shorter run driven only by input.
- **AI Hub:** all four scenarios pass, but with `limit=20`, not a full five-minute round.
- **Model checker:** 279 warnings remain, and the sheets still exit 0.
- **Git:** nothing is committed, since you didn't ask for a commit.

## Source Information
- **Date:** 2026-11-05 17:18:18
- **Source:** Animal Crossing: City Folk
- **Plan:** PLAN.md
- **Genre:** Life sim / social sim
- **Perspective:** Isometric 3/4 orthographic diorama with 90-degree camera turns; dollhouse cutaway indoors
- **Tech:** Riftlight Pixel Engine 0.46.0 (WebGPU, three.js r186 inside), plain JavaScript modules bundled by esbuild 0.28.2 into one HTML file; AI Hub session client 1.4.0; WebRTC and BroadcastChannel for Visit
- **Art Direction:** The engine's native 3D-as-pixel-art with the default look (Sweetie 16, toon bands, pixel outlines); new critter generator, buildings, trees, items and paintings as data; Kenney Furniture and Nature packs (CC0), recoloured
- **Animation:** The engine's clip format compiled with compileClips onto a seven-joint rig, played with THREE.AnimationMixer and crossFadeTo; code-driven blink, talk, squash, head turns; 48 clips
- **Audio:** All code. Music through the engine's Song sequencer (24 hourly arrangements with rain and snow variants built from 12 motifs, plus venues, festivals and records), default 10% volume. Sound effects as SoundDefs. Animalese-style gibberish voices from formant-shaped harmonics
- **Online:** AI Hub Session Protocol v1 (shared-world round, The Bean Bazaar, 1-4 players); on its own, Visit: BroadcastChannel on one computer and serverless WebRTC with invite codes, up to 3 guests
- **Testing:** One command, node tests/run.mjs: rule checks in Node, a scripted playthrough of the whole game with replay, an attract loop and input monkey on Engine.headless, Playwright browser checks on file:// with stub pad and touch profiles, the AI Hub harness in all four scenarios, two-page Visit tests, and model sheets
- **Research:** None beyond the supplied plan, the engine kit docs and the Hub README
- **Environment:** Claude Code CLI (headless); Linux
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** added on import

## Testing Feedback
- **How many issues did testing catch?** About 33 that needed a fix: seven crashes or bad data at build and load time, eleven gameplay bugs found by the scripted playthrough and the input monkey, three input bugs found only in the real browser, and twelve things I only saw in screenshots.
- **How many would be considered critical issues / game breaking?** Eight. Entering the store, the Aquarium and the Gallery each crashed; a menu-closing press also fired a world action; the Seed Toss froze the player; furniture could trap you at the door; Bartleby slept through his own Day One errand; and Mrs. Gander was missing from the opening scene.
- **What was the most helpful test you ran?** The scripted playthrough on Engine.headless: real input, about 0.4 ms a frame, every milestone from the night bus to Year Two in under a minute. It found most of the gameplay bugs and let me rerun everything after each change.
- **What was the least helpful test you ran?** The 279 warnings from the model checker. A few were useful, but most were about coplanar faces and small floating parts that look fine at game scale, so I mostly stopped reading them and judged from screenshots and the cast line-up.

## Engine Feedback
- **What did you like most about the engine?** Models and clips as plain data, plus Engine.headless. I could write a whole cast of 38 characters from one generator, and run the entire game in Node with the same code that runs on WebGPU.
- **Did you get stuck or guess wrong?** Several small guesses. buildModel throws if a palette names a slot the model lacks, which broke shared furniture palettes. Model params are hard range-checked. I guessed the renderSound signature wrong. The dissolve front is white unless a rim colour is set. And a press shorter than a frame shows in wasPressed but not isDown, which lost taps at low frame rates.
- **What was the most important thing you had to build yourself?** The whole UI layer: a mixed-case bitmap font, a screen stack with focus and hit areas, dialogue with voices, and prompts that follow the last device. Close behind were the generator-based scene runner and the tile world with its own collision.
- **What was the hardest part about using the engine?** Judging what a screen really looks like. Screenshots on the software GPU are slow, the first frames take seconds while pipelines compile, and Mirror and RenderView cannot be exercised headless, so visual bugs surfaced late compared with logic bugs.
- **What did you change in the engine, and why?** None. pixel-engine.js ships byte for byte, and a test asserts it.
- **If you could change one thing about the engine, what would it be?** Mixed-case text in the HUD with a retained widget layer for focus and hit areas. Every game with menus has to rebuild that, and it was the largest single piece of work outside the game itself.

## Prompt Feedback
- **What did you like most about this prompt?** The plan is concrete and honest about what was verified. The tested recipes, such as the browser flags and the importmap packaging, worked first time and saved hours. The writing samples also set a clear voice to match.
- **What was confusing?** Little. I had to decide how to write the source in the file name, since a colon cannot go in one, so I used AnimalCrossingCityFolk. The plan also asks for a stargazing camera glide, but this orthographic camera cannot look up at a sky, so the camera rises and tips up while the star field comes down over the town.
- **What was the hardest thing to do?** Breadth at a consistent quality. Every system ships together, including eight venues, four festivals, three contests, a Hub round and two Visit transports, and each needs its own small joke. Keeping all of it wired together was harder than any single feature.
- **What would you change in this prompt?** I would name the exact file-name form for sources with punctuation, and say which plan details are firm and which are only suggestions. Content floors could also be lower for the cosmetic lists, so more effort goes to feel.

The same feedback is on the in-game About/Credits screen and in `exit-interview.json`.

## Files
Everything is in `/home/micha/dev/cc-matrix/runs/claude-opus-5-5-xhigh.build-v2__20261105-171818__x10629c/work/`:
- `HonkIfYouOwe-AnimalCrossingCityFolk-claude-opus-5-5-xhigh-20261105-171818.html`: the game, 8.3 MB, opens directly from disk
- `exit-interview.json`
- `PROGRESS.md`
- `HonkIfYouOwe-AnimalCrossingCityFolk-claude-opus-5-5-xhigh-20261105-171818/`: dev source, tests and tools