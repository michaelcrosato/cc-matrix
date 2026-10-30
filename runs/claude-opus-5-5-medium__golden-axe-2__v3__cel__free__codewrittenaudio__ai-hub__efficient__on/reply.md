I've built **Golden Waxed II** as one HTML file, `GoldenWaxedII-GoldenAxeII-claude-opus-5-5-medium-20261029-0611.html`. It's a three-stage brawler in the spirit of Golden Axe II, and a cheating AI can play it from stage 1 through the boss to the ending without errors. The AI Hub test harness passed every scenario I ran. All testing was in a headless browser with software WebGPU, so nobody has played it on a real GPU or with a real controller yet. The title was picked by a random draw (Python `secrets`) from 50 riffs on the source's name. The dev source and test scripts are in the subfolder of the same name.

**What's in the game:**
- **Story:** the Golden Axe has been stolen by a wax sorcerer, Lord Tallowmar, who is turning the land to wax. The writing copies Golden Axe II's terse, dramatic style.
- **Heroes:** three to choose from, each with their own magic: Brannoc (wind), Ysolde (fire) and Gorrim (thunder).
- **Combat:** 3-hit combos, throws, a running dash attack, jump slash, downward stab and back attack. Magic charges one level per spellbook while you hold the button and casts on release, as in Golden Axe II.
- **Beasts and imps:** you can ride a tail-whipping beast or a fire-breathing drake, and knock enemy riders off theirs. Little imps run through; hit them for spellbooks and meat.
- **Journey:** the village, a night camp, the cliffs (enemies can fall off the edge), another camp, then the castle hall and the boss, then the ending.
- **Bosses:** two heavy brutes, a shielded knight and the final boss, who has slam, wax-rain and summon attacks.
- **Other features:**
  - Continues and difficulty levels.
  - Tutorial hints that appear the first time each mechanic comes up.
  - Two-player co-op on one machine; a second controller can join at any time.
  - A demo plays itself after 10 seconds idle on the title screen, and any input stops it.
- **Controls and menus:** the controller is the main input; menus are large and work with controller, keyboard or mouse. Settings include invert horizontal and invert vertical for the gamepad.
- **Touch-only devices:** these get "Controller or keyboard required" plus a Settings button.
- **Online:** AI Hub co-op for 1–4 players. The game requires WebGPU and declares that to the hub, since the task ruled out a fallback.
- **Tech and visuals:** Three.js r180 on WebGPU only, and Rapier 0.19.3 for collisions, ground and pits, and breakable debris. Enemies shatter into wax chunks rather than bleeding.
- **Audio:** all music, sound effects and gibberish voices are generated in code.

**Testing:**
- **Headless screenshots:** at first they came back pure white. The test browser needed a different software-rendering flag (`--use-vulkan=swiftshader`) to capture WebGPU frames; nothing was wrong with the game.
- **Logic tests:** the software renderer runs at about 7 fps, so I tested game logic by stepping the simulation directly instead of in real time.
- **AI Hub harness:** passed with 2 players, 4 players on a bad network (150 ms latency, 50 ms jitter, 5% packet loss), the host leaving, and a server with no player of its own.

---

## Source Information
- **Date:** 2026-10-29 06:11
- **Source:** Golden Axe II
- **Tech:** Three.js r180 (0.180.0: WebGPURenderer, TSL node materials, PostProcessing with BloomNode, RoundedBoxGeometry), WebGPU only with no fallback; Rapier 3D 0.19.3 (`@dimforge/rapier3d-compat`); Gamepad API; Web Audio API; vanilla JavaScript modules bundled into one HTML file; DOM/CSS UI; AI Hub session.js 1.3.0
- **Art Direction:** stylized cel shading (toon material with a 3-step light ramp), black ink outlines, chunky low-poly particles, bloom, painted parallax silhouettes, warm firelight against cool skies
- **Animation:** my own keyframed pose-clip system on jointed characters built from simple shapes. Clips are data (joint angles) with easing and cross-fades, plus procedural extras: cape lag, beast gaits and tail whips, hit flashes, attack warning flashes, candle flicker.
- **Audio:**
  - Music written in code: a Web Audio step sequencer with lead, bass, pad chords, synthesized drums and a delay "hall". Six themes: title, village, cliffs, boss, camp and victory.
  - Sound effects synthesized in code.
  - Animalese-style gibberish voices, one per character.
- **Online:** AI Hub Session Protocol v1, co-op for 1–4 players.
  - The host runs the shared world; each player's own copy runs their hero.
  - The host sends world updates 15 times a second; hits, pickups, mounts, magic and stage changes are sent as reliable events.
  - A dedicated server with no player of its own is supported.
  - The round ends with standings, stats and awards.
  - No other network features.
- **Testing:** headless Chromium through Playwright with software WebGPU.
  - Boot and console-error checks.
  - Screenshots of the title, character select, story, every stage, camp, magic and settings screens.
  - A full-journey run by a cheating AI from stage 1 to the ending.
  - Keyboard flow from title into play, plus the pause and settings menus.
  - Demo mode after 10 s idle.
  - A touch-only phone emulation.
  - AI Hub harness: 2 players; 4 players on a bad network; 3 players with the host leaving; dedicated server. All passed.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** unknown (I had no usage meter during the session)

## Testing Feedback
- **Issues testing caught:** 14.
  1. A variable named `scene` hid the 3D scene in the main loop and threw an error.
  2. Rapier doesn't see new colliders until its first step, so heroes fell through the floor at spawn.
  3. Floors were darkened by their own texture colour being applied twice.
  4. A cloud layer drew as a flat slab.
  5. Backdrops were placed where the camera couldn't see the mountain tops.
  6. Fire magic whited out the screen.
  7. Spell levels showed wrong roman numerals.
  8. The boss parked just off-screen where no one could reach him.
  9. The demo AI got stuck mounting and dismounting beasts.
  10. Imps snagged on props and never left.
  11. Stage transitions ran on real-time timers instead of game time.
  12. The hub's input probe sampled between frames.
  13. Round-end screens overlapped.
  14. Stacked menus showed through each other, and slider rows collapsed because of a CSS class clash.
- **Critical / game-breaking:** 4 (falling through the floor at spawn, the unreachable boss, the `scene` error, stage transitions on wall-clock timers).
- **Most helpful test:** the full-journey run with a cheating AI. It found both soft-locks.
- **Least helpful test:** the first screenshots, which came back white because of the capture flag, not a game bug.

## Engine Feedback
- **What I liked most:** Three.js r180's WebGPU renderer with node materials (toon material plus the bloom pass) gave a convincing cel look with very little code. Rapier's character controller made sliding along walls and props trivial.
- **Did I get stuck or guess wrong?** Yes. I assumed Rapier ray casts see newly created colliders right away; in 0.19 they appear only after `world.step()`. I also assumed headless WebGPU screenshots would just work.
- **Most important thing I built myself:** the data-driven pose-clip animation system, and the host-runs-the-world co-op netcode (world updates, hit claims, the hit player's copy applying its own damage).
- **Hardest part of using the engine:** debugging WebGPU on a software renderer. Errors show up as opaque internal "WeakMap" exceptions.
- **One thing to remove or overhaul:** Rapier silently deferring scene-query updates. An explicit, documented update call would remove a whole class of bugs.
- **One thing to change:** clearer WebGPU validation errors (for example "scene is not an Object3D") instead of internal map failures.

## Prompt Feedback
- **What I liked most:** the clear done-criteria, and the hub protocol coming with a runnable test harness, so multiplayer could actually be verified.
- **What was confusing:** the hub README asks for a WebGL 2 fallback, but the prompt requires WebGPU with no fallback. I resolved it by declaring WebGPU as required to the hub. It was also unclear whether local co-op was wanted on top of hub co-op; I built both.
- **Hardest thing to do:** fitting a feature-complete brawler (combat, magic, mounts, camps, bosses, demo mode, co-op netcode) into one tested file at medium effort.
- **One test I wish I could have run:** a real-GPU playthrough with a physical DualSense, to judge feel, frame pacing and the audio mix by ear.