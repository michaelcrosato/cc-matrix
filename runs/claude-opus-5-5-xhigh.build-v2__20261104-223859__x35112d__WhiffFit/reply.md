**Whiff Fit is finished: both hand-ins are in this folder, and everything in `PLAN.md` that can be done on this computer is done.** My earlier "done" was wrong: rereading the plan line by line turned up eight real gaps that no test had caught, and all eight are now fixed.

## What the reread fixed
- **Schedule:** it's now a carousel of pavilions, then events, with stars.
- **Plank stars:** they now come at 25, 40 and 55 seconds.
- **Island mouse ring:** the highlight ring had never been drawn, even though a code comment said it was.
- **Commodore Gull:** he's now three entities with wings rotated in code, on the island and all four lagoon sets.
- **Sounds:** the small splash and the heartbeat now actually play.
- **Set dressing:** added bubbles, and background figures at the tower.
- **Tests:** added the missing checks for every song, ghost areas and each event's rules.
- **Keyboard prompt:** the carousel's prompt said W S on a menu that moves with A D.

I also moved code into the three files the plan's architecture names (`intent.rs`, `attract.rs`, `glyphs.rs`).

## Checks on the final page
- **Tests:** `tests/run.sh all` gave **135 passed, 0 failed** in one run, and the page hasn't changed since.
- **1080p from `file://`:** I looked at the title and all nine About pages, with no page errors.
- **Sets:** I looked at a 1080p capture of each of the nine sets.
- **Native window:** a scripted pad played one full event with no panics; this run didn't go through the menus.

## Where it differs from the plan
`notes/plan-audit.md` goes through the plan section by section and lists ten differences, each with its reason. The main one is the hub's ready line: the plan's version sometimes failed the harness under machine load, so the page also reports ready 12 seconds after connecting once the canvas exists. If the game's status arrives first, it behaves exactly like the plan's line.

## Not checked
- **Needs a person or real hardware:** nobody has held a pad or heard the sound, and it hasn't run on a real GPU, touch device or TV, or with a second person. TASK.md says these are never required, but how the game feels and sounds is still unknown.
- **Small credits gap:** the Credits page names only three of the library props. I left it so the page stays exactly as tested.

Nothing has been committed.

---

## Source Information
- **Date:** 2026-11-04 22:38:59
- **Source:** Wii Fit
- **Plan:** PLAN.md
- **Genre:** Sports mini-game anthology with a light life-sim frame (daily ritual, unlocks, wardrobe)
- **Perspective:** Third person, a camera per activity: 3/4 follow on the island, mirror-style front view for exercises, chase for the lap, paddle and tray, high 3/4 for the raft, side view for the dives
- **Tech:** Rust 1.98.1 compiled to WebAssembly with WebGPU; Pavilion engine (Shardfall repository, commit 49ef2ba, changed for this game): rapier3d 0.36 physics, wgpu renderer, egui 0.36 painter UI, cpal audio, gilrs gamepads; wasm-bindgen 0.2.129; one self-contained HTML file with no external dependencies; AI Hub session client 1.4.0.
- **Art Direction:** The engine's cel-shaded rounded primitives with thin ink outlines, taken high-key and pastel: 37 hand-written props, nine sets, a painted UI in Fredoka and Nunito
- **Animation:** The engine's procedural puppet with motion clips: 25 hand-keyed clips (FIT set) plus library clips from Mesh2Motion, CMU, 100STYLE and Quaternius; poses scrubbed by gameplay; whole-figure lean about the feet
- **Audio:** All in code with no audio files: six sequenced songs (bossa, pads, waltz, funk-pop, mallets, march), 43 synthesized sound effects and stingers, Animalese-style gibberish voices from formant-filtered blips with a timbre per speaker. Music at 10% by default
- **Online:** AI Hub session (ghost mode, 1 to 4 players): the Inter-Resort Medley with other players as seat-coloured ghosts in neighbouring lanes. Solo: Play Together passes one pad among 2 to 4 guests, and Yesterday You ghosts of your own best runs
- **Testing:** Headless only: Rust tests with a bot that plays New Stay to the credits, each event on five seeds, balance tables with a human-like player; Playwright in Chromium with a stub pad, keys, mouse, phone and tablet profiles and WebKit iPhone; the AI Hub harness at 2 to 4 players on a bad network and with the host leaving; captures for composition; the native window under xvfb, driven by a scripted pad through the menus and one full event. No physical controller, touch device, TV or second person; nobody listened to the sound
- **Research:** None beyond the plan's own short web search on Wii Fit; I read the engine's docs and source and the AI Hub protocol
- **Environment:** Claude Code CLI (headless); Linux
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** added on import

## Testing Feedback
- **How many issues did testing catch?** 34 issues, counted in notes/feedback.md as I went. The last eight came from rereading the plan line by line after I had called the game done: no test had caught them.
- **How many were critical?** 4: the page ran under 2 ticks a second from per-tile water zones; figures fell through decks and posts with no colliders; the player was left behind after the Morning Check so the island showed empty sky; the attract bot kept closing Settings on touch-only devices.
- **Most helpful test?** The bot playing New Stay to the credits on three seeds, with the balance table beside it: bot, human-ish, shaky and idle scores per event. It showed six events giving 1000 to anyone.
- **Least helpful test?** Native capture timings on a machine shared with other agents (load 39 on 32 cores): they said nothing about rendering cost.

## Engine Feedback
- **Liked most?** Everything runs headless and the same sim plays in tests, tools and the browser. A bot playing the whole game in seconds changed how I worked. Room files plus hand-written JSON props made nine sets cheap.
- **Stuck or guessed wrong?** Yes. A water zone per tile looked harmless but cost almost the whole frame, through merge_zones and a wave grid per rectangle. Room cameras override cues set in the same frame, so I dropped them. pav load dropped a scene's first cue. Props with no solid parts silently have no collider, which sank my figures. I also guessed the AiDef form and several prop schema rules.
- **Most important thing built?** The UI as data built in the sim (a node list at virtual 1080p drawn by egui), with menus as data, so pad, keys, mouse, tests and the bot share one path. Next, the Balance Core and the sequencer with its song clock.
- **Hardest part?** Multiple sets in one sim. The engine assumes one room or a streaming world, so the sets, the camera per state, culling the other sets and event-placed figures all needed care. pav_app's frame function is long, and game modes thread through it as flags.
- **Changed in the engine?** input.rs (lean, any, ui, song_pos, new buttons); frame.rs (status, fit UI, camera yaw, new events); games/mod.rs (frozen, page status, ui frame, camera yaw, extra objects); sim.rs (frozen ticks, show only the current room); puppet.rs (whole-figure tilt); parts.rs (Handle); pav_audio (buses, formants, LFO, sequencer, song clock); pav_view (BigSplash, Wake, Confetti); pav_app (fit input layout, lean shaping, weblink, hub ghosts); pav_tools (t_input lean, cue fix on load); world.rs (only_current); course.rs (no engine splash when a game places its figures).
- **One change?** A first-class set or stage concept: several rooms on one sim, only the current one simulated at full cost and drawn, each with its own camera and view, switched with one call. Most of my integration work was reinventing that.

## Prompt Feedback
- **Liked most?** The plan was specific where it mattered, with verified recipes for the hard seams: the hub block, the controller stub, the sound patch and the build times. It let me spend my effort on the game rather than on finding out how.
- **Confusing?** Little. The brief says the plan's section numbers map to its items, and the plan says the brief wins on names, so the two read together well. Whether arrow keys should both walk and step needed a decision.
- **Hardest?** Judging feel with no hands: tuning how a lean, a squat or a splash feels from bots, numbers and contact sheets. I wrote a human-like player to stand in, but nobody has held the pad or heard the sound.
- **Would change?** Allow a final pass by a person or an instruction to report feel as untested. I would also add that a shared machine may run far slower than the plan's measured ticks per second, so browser tests should have a fast mode from the start.

---

Files are in `work/`:
- `WhiffFit-WiiFit-claude-opus-5-5-xhigh-20261104-223859.html`
- `exit-interview.json`
- `WhiffFit-WiiFit-claude-opus-5-5-xhigh-20261104-223859/`
  - `notes/plan-audit.md`