**Seinfeld-ish** is finished as one self-contained HTML file in the work folder root: `Seinfeldish-Seinfeld-claude-opus-5-5-medium-20261101-1843.html` (262 KB; three.js and Rapier load from a CDN). Dev files are in the subfolder of the same name. On the final build, every check passes in headless Chromium with no console errors. Nothing was tried on a real GPU or a real DualSense.

**Test results on the final build:**
- **Full episode:** the attract AI plays from the cold open through the apartment, diner, all three threads, the stand-up set and the tag scene to the results screen.
- **Keyboard, 12/12:** menus and the invert toggles, idle → attract → exit, Gouda-wheel physics, Norbert catching you, a soup-line ban, a banter misfire, Esc pause/resume.
- **Emulated gamepad, 14/14:**
  - the 10-second idle timer (measured at 10.1–11.1 s without forcing it), and Cross exits the demo;
  - D-pad menus, and the invert horizontal/vertical toggles actually flipping the stick;
  - stick movement, R3 camera switching, Options opens and closes pause;
  - Create+Options left to the hub, Create opens the notebook.
- **Emulated touch-only phone, 3/3:** "Controller or keyboard required" shows, the Settings button works, and the attract demo still runs.
- **AI Hub harness, 20/20 in each of three scenarios:** 1 player, 2 players, and a player leaving.
- **Bundle scan:** no TODOs, stubs or placeholders.

The extra testing after your last note found real bugs, which are now fixed:
- **Exiting the demo restarted the game.** The button press that left the demo was also read by the title menu, which started a new episode and stranded the player in a stand-up set with no menu.
- **Stale timers could fire after a reset.** Scene-card timers from a reset episode kept running; they're now tied to the episode that set them.
- **Skipping the answering machine stalled the opening.** The first objective never advanced if you went straight to Stanley and Elena.
- **Keys could be missed at very low frame rates.** Short taps were lost, and two quick taps of the same key counted as one.

**How it plays:** one day on one city block, 9 AM to a 6 PM stand-up set.
- **Three errands for friends:**
  - **The Lentil:** get soup for Stanley from the Broth Baron, who enforces strict ordering rules; break one and you're banned for an hour.
  - **The Wheel:** roll Krebs's 100-lb Gouda down the street with real physics.
  - **The Letter:** sneak Elena's letter out of Norbert's mail cart. Norbert, the postman, has a visible view cone; you can hide behind a newspaper or throw things to distract him.
- **Banter:** conversations offer four tones on the four face buttons, and each character likes and hates different ones.
- **Bits:** 13 odd things to notice around the block; each becomes a joke for the finale.
- **The set:** pick jokes from your hand and press on the pause before the punchline; a heckler interrupts mid-set.
- **Cameras:** third-person by default; you can switch to a fixed sitcom multi-cam or first-person.
- **Attract demo:** an AI plays the real game after 10 s idle on the title.
- **Online:** AI Hub side-by-side mode for 1–4 players, ranked by laughs.

## Source Information
- **Date:** 2026-11-01 18:43
- **Source:** Seinfeld (TV Show)
- **Genre and Perspective:** Third-person social-comedy adventure (errands, banter, social stealth, physics slapstick, stand-up timing finale). Main camera: third-person chase; switchable (R3 / V) to Sitcom Multi-Cam and First-Person.
- **Tech:** Three.js r180 (`three/webgpu` WebGPURenderer, automatic WebGL 2 fallback), Rapier 0.19.3 (rapier3d-compat), Web Audio API, Gamepad API, AI Hub session client 1.3.0, ES modules from jsDelivr, one HTML file.
- **Art Direction:** Plain three.js look: lit standard-material primitives, real-time shadows, point and spot lights, signs drawn on canvas textures, sets that cut away when you walk in.
- **Animation:** three.js AnimationMixer with keyframe clips on primitive rigs (idle, walk, run, sneak, push, carry, talk, sit, shrug, laugh, slide, shove, stagger, wave, bow, mic), cross-faded. Pigeons flap and peck.
- **Audio:** All synthesized in code: slap-bass funk music per location, original bass stingers between scenes, a laugh track and applause, sound effects, and Animalese-style gibberish voices with a different pitch for each character.
- **Online:** AI Hub Session Protocol v1, side-by-side ("parallel") mode: seeded start, live progress, a result with stats and awards. No other networking.
- **Testing:** Headless Chromium through Playwright (SwiftShader WebGL 2 / WebGPU), a test hook that steps the simulation, the attract AI playing the whole episode, keyboard checks, an emulated standard gamepad, an emulated touch-only phone, offscreen screenshots, and the AI Hub harness (1 player, 2 players, player leaving).
- **Research:** I read the AI Hub `lib/hub` README, session.js, retrofit.md and harness.html. I did no research on the show itself.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** Cost and token counts are unknown. Session time was about 1 h 52 min by wall clock (18:44–20:36).

## Testing Feedback
- **Issues caught:** 13.
  - A soup-line pay timer that never advanced.
  - Key taps lost at low frame rates.
  - Stale input readings reported to the hub harness.
  - Norbert blinded by a stale "inside a building" flag.
  - A near-black road from over-long shadows.
  - A stale HUD showing behind the results screen.
  - Open sky visible over the indoor sets.
  - A caption overlapping the joke cards.
  - The title menu left open when an episode started.
  - The opening objective stalling if you skipped the answering machine.
  - The demo-exit press also starting a new episode.
  - Scene-card timers from a reset episode firing later.
  - Two quick taps of the same key counting as one.
- **Critical:** 2. The pay timer soft-locked the soup errand and the demo, and leaving the demo stranded you in a stand-up set with no menu.
- **Most helpful test:** letting the attract AI play the whole episode with stepped simulation.
- **Least helpful test:** offscreen screenshots. After the first capture, headless Chromium stops firing animation frames, so later shots showed a frozen camera.

## Engine Feedback
- **Liked most:** the WebGPU renderer takes ordinary materials, shadows and AnimationMixer unchanged and falls back to WebGL 2 by itself. Rapier's character controller pushes dynamic bodies for free, which is the entire Gouda-wheel errand.
- **Stuck or guessed wrong:** Rapier 0.19's raycast filter arguments and character-controller API needed care. WebGPU canvases screenshot blank headless, so tests render offscreen and read the pixels back.
- **Most important thing I built:** the dialogue and banter system with each character's tastes, the stand-up timing system, and the attract AI that plays the real game loop.
- **Hardest part:** cameras inside the cut-away sets: fixed sitcom angles, two-person framing during conversations, and camera collision that ignores the hidden front wall.
- **Remove or overhaul:** the split between the `three` and `three/webgpu` entry points, which complicates import maps and bundling.
- **Change one thing:** a documented way to capture WebGPU canvases headless.

## Prompt Feedback
- **Liked most:** firm UX rules (controller-first, attract mode, invert toggles, touch fallback) combined with full freedom on genre.
- **Confusing:** what "engine native style/animation" means for a library like three.js, and whether a TV show counts under the rule against recreating specific existing games.
- **Hardest thing:** giving a game "about nothing" goals, a score and an ending that fit a hub round.
- **The one test I'd have run:** a real DualSense on real hardware, to check feel, dead zones and the intermittent axis inversion.

The same Source Information and feedback are on the in-game About & Credits screen and in an HTML comment at the top of the file.