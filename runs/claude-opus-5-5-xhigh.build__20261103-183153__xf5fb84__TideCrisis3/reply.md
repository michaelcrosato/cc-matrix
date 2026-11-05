Unchanged: the remaining gaps need a human playtest on real devices and the exact cost from your API console. Neither is available in this session. Use `tests/REVIEW.md` as the checklist, or end the goal with `/goal clear`. The delivered files passed 809 checks, 0 failed.

## Source Information
- **Date:** 2026-11-03 18:31:53
- **Source:** Time Crisis 3 (Namco and Nextech; arcade 2003 on Namco System 246, PlayStation 2 2003)
- **Plan:** PLAN.md
- **Genre and Perspective:** On-rails arcade light-gun shooter with a cover system. First-person rail camera (duck behind cover, pop out to shoot); third-person cutscene cameras.
- **Tech:**
  - my-3D2dge handoff v0.85.2 full engine, patched: long guns, PlayStation glyphs, mouse-wheel codes, audio buses.
  - Rail3D, my own perspective software renderer, drawing into the engine's pixel buffer.
  - AI Hub session client 1.4.0 (protocol 1).
  - Plain JavaScript, no other libraries; Node 24 and Playwright 1.63.0 for testing.
- **Art Direction:** the engine's native PS1-era pixel style in perspective 3D: its banded light and material patterns as textures, Bayer dithering, fog, and its Humanoid rigs as billboards. New materials and models include containers, stalls, boats, a lighthouse, a tidal barrier and a crab walker.
- **Animation:** the engine's procedural Humanoid rigs (poses, moves, rolls, climbing, deaths), with new long guns and a cutlass. Machines are animated in code: turrets, rotors, a six-legged gait, swinging, sinking.
- **Audio:** all in code:
  - tracker songs on the engine's chip synth: title theme, three layered stage themes, boss, final boss, briefing, range, results and ending;
  - synthesised sound effects, panned by position;
  - per-stage ambience;
  - an Animalese-style gibberish voice synth with formant vowels for every speaker.
- **Online:** AI Hub Session Protocol v1, shared-world co-op for 1–4 players.
  - The host runs the world, and each client sends its player's input.
  - The host streams every step's commands, so every copy runs the same deterministic world from the same seed, with a score and lives check each second.
  - Threats on remote players resolve against the cover they reported.
  - Plus local split-screen co-op for 2.
- **Testing:**
  - Allowed: headless tools as much as I liked (`game.advance` and `game.debug`), screenshots only for what a script can't check, one command that prints only failures and a count, no subagents or workflows for review.
  - Used: `node tests/run.mjs`, 28 suites:
    - 24 headless suites: core, gameplay, content, the lighthouse climb and tower roof, UI, dev mode, attract, co-op, and a fake-hub network suite with latency, jitter and loss;
    - `--playthrough`: the expert bot clears every stage; the fair bot clears every stage on Normal without a continue; the showoff bot plays the whole ARCADE with its cutscenes; Training completes; the whole game is played through its screens from the title to the high-score table;
    - `--browser`: the bundle at four window sizes, then an end-to-end run with real key presses, mouse, touch and a simulated DualSense, covering the attract mode, every About page, prompts following the device, dev mode from the pause menu, detail per stage and a touch-only phone;
    - `--hub`: the four AI Hub harness scenarios in headless Chromium.
  - `tests/ISSUES.md` logs what they caught.
- **Research:** the engine handoff docs (API.md, AI_GUIDE.md, docs/ASSETS.md, API-INDEX.md) and the AI Hub README. Source facts come from the plan, which cites Wikipedia's Time Crisis 3 article (fetched 2026-11-03). No new web research.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** Measured from the session's own record of per-request usage, up to the final build at 22:38: 414 requests to claude-opus-5-5, 204.7 M tokens (846 uncached input, 867.4 K output, 1.46 M cache writes at the 1-hour TTL, 202.4 M cache reads), API cost about $69.50 at Claude Opus 5.5 list prices per million tokens ($4 input, $20 output, $8 cache writes at the 1-hour TTL, $0.20 cache reads); session time 4 h 6 min, from 18:31:53 to 22:38:34. The final test run and the closing reply come after this file is written: estimated from the same steps last time (4 requests, 1.7 M tokens, $0.52, 11 min), the whole session comes to about 418 requests, 206.5 M tokens, $70.02 and 4 h 17 min

## Testing Feedback
1. **How many issues did testing catch?** 68, itemised in `tests/ISSUES.md`:
   - 60 in the game: 23 from the bot playthroughs and boss runs, 10 cover points from the content validator, 2 from the lighthouse and tower-roof checks, 1 from the UI suite, 4 from the browser end-to-end suite, 20 from screenshots;
   - 8 in the bot used for testing.
2. **How many were critical?** 13 — an area, a boss or a mode that could not be finished:
   - 1-3: the Bulldog truck's fuel tank sat inside its collider.
   - 1-4: canal enemies were left behind the boat.
   - 1-B: Barracuda boarded outside the field of view.
   - 3-1: a shield trooper had no state for hiding, and another stayed stuck in his crouch.
   - 2-3: funicular terraces were misplaced and hidden by parapets.
   - 3-4: rappellers got stuck on the lift ropes.
   - 2-4: a lighthouse collider hid an enemy.
   - 2-B: Hammerhead's shield covered him down to the shins, and his rig became NaN.
   - 3-2: the Seawolf gunship hovered out of view.
   - Training could reach CONTINUE.
3. **Most helpful test:** the bot playthroughs — the auto-player running every stage headless through `game.advance`. The expert bot in god mode checked completion, the fair bot on Normal checked balance, and the showoff bot played the whole ARCADE with its cutscenes. They caught every critical issue and gave the clear times the area timers are set from.
4. **Least helpful test:** the 3D math and rasterizer unit tests. They guard projection, rays and depth but caught nothing; every renderer problem was caught by screenshots instead.

## Engine Feedback
1. **What did you like most?** The deterministic fixed-step loop with headless `game.advance`, and the Humanoid rigs. Rigs update identically in Node and the browser, so hit volumes from real joints, the bots and the AI Hub copies all agree. The same rigs draw from any angle as billboards.
2. **Did you get stuck or guess wrong?** Yes:
   - The handoff has no 3D engine, so a first-person game needed its own renderer.
   - `E.View` can't look up, so billboards fake the angle.
   - A rig update given an x velocity but no y velocity put NaN into the rig's walk cycle for good, which made a boss unhittable until a test found it.
   - The Humanoid constructor uses `Math.random`, so the game reseeds each rig's clock to stay deterministic.
   - I guessed wrong about the menus twice, and the browser end-to-end test found both:
     - The scenes checked a `game.menuOpen` property the engine doesn't have; an open menu pauses the game instead.
     - The engine toggles pause on Escape before the scene runs, so the dev panel opened the pause menu over itself.
3. **Most important thing you had to build:** Rail3D. It's a z-buffered, perspective-correct software rasterizer that textures surfaces from `E.materialTile` in the engine's five light bands with dithering and fog, draws `E.shapeMesh` objects, and composites engine rigs as depth-tested billboards drawn from the angle they're seen at.
4. **Hardest part:** fitting a first-person 3D shooter into a 2D engine built around ground views. Camera, culling, lighting, fog, rays and colliders had to be built alongside it, while menus, settings, rebinding, input, audio, the boot screen and score tables came free and worked first time.
5. **What did you change in the engine?** Four patches, logged in `engine/PATCHES.md`:
   - long guns (rifle, SMG, shotgun, launcher, sniper rifle, minigun, harpoon, flare pistol) and a cutlass on Humanoid, with the left hand on the fore-grip;
   - PlayStation glyphs by default, with an Xbox option;
   - bindable mouse-wheel codes;
   - access to the sound-effect and music buses for the voice synth.
6. **One change you'd make:** a small perspective camera module beside Mode 7. `E.shapeMesh` and `E.materialTile` already exist for a 3D renderer, so a reference rasterizer built on them would make light-gun, rail and FPS games first-class in the 2D package. `rig.update` could also reject NaN input.

## Prompt Feedback
1. **What did you like most?** It defines "done" completely: the 10-foot controller-first UI, device-aware prompts, attract mode, live dev sliders, couch and online play, the About screen and the exit interview.
2. **What was confusing?** The plan was written for another run, so its file names and timestamps differ from TASK.md's (TASK.md wins). Also, the handoff it names has no 3D engine, for a first-person 3D source.
3. **Hardest thing:** the volume — three stages, eight bosses and mini-bosses, a software renderer, split screen and AI Hub co-op, all art and sound in code — then balancing it with bots so every area can be finished in its time.
4. **What would you change?** Say whether the repository's 3D engine may be used, and give a time or token budget so scope can be planned against it. Ask for the feedback numbers to come from a log the tests keep.