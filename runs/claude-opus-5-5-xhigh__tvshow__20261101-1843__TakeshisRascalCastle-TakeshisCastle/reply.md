I built **Takeshi's Rascal Castle**, an original spiritual successor to the TV gameshow Takeshi's Castle. The bundled single file is in this folder's root: `TakeshisRascalCastle-TakeshisCastle-claude-opus-5-5-xhigh-20261101-1843.html` (326 KB; three.js and Rapier load from the jsDelivr CDN). The source modules, build script and test tools are in the subfolder of the same name.

**Verified:**
- The AI Hub harness automatic check passes at 1, 2, 3 and 4 players, with 150 ms latency, jitter and 5% loss, with the host leaving, and with the no-splash ready prompt. A final 2- and 4-player re-run on the shipped file also passed.
- An autopilot played a whole Episode: all five games, a Comeback Coupon retry, the Showdown and the results screen.
- It boots and plays on both the real WebGPU backend and the WebGL 2 fallback with no console errors.
- The emulated PS5 controller worked in menus and settings, including the invert toggles. The touch-only profile shows the notice and still runs the demo.

**Not verified:** feel with a real DualSense on a GPU machine, and a live hub session on real devices. All testing was headless with software rendering.

**What's in it**
- **Episode:** Door Dash, Plop Stones, Spin Cycle, Boulder Rush and Cannon Bridge, then a kart Showdown against Count Rascal (his ring is on his back). Fail a game and a Comeback Coupon buys a retry; your score is the TV ratings you pull in.
- **Modes:** the Gauntlet is the whole course as a race against seven AI rivals. Practice lets you replay any single game.
- **Physics:** ragdoll wipeouts, breakable paper doors, a swaying rope bridge, a crowd that cheers and laughs.
- **Commentary:** a cheeky booth commentator in the UK-dub style of the show, spoken as gibberish voices with subtitles.
- **Cameras:** Chase is the main view; switch with R3 or V to TV Broadcast, Helmet Cam (first person) or Overhead.
- **Couch UI:** controller-first menus with keyboard and mouse mapped onto them, and Settings toggles to invert the pad's horizontal and vertical axes.
- **Attract mode:** after 10 seconds idle on the title screen, a looping AI demo of the Gauntlet and the Showdown starts; any input exits it.
- **Multiplayer:** AI Hub race mode for 1–4 players on one seeded course.

## Source Information
- **Date:** 2026-11-01 18:43
- **Source:** Takeshi's Castle (TBS, Japan, 1986–1990; also known abroad through its dubbed versions). All characters, lines and art in the game are original.
- **Genre and Perspective:** physics party platformer / obstacle-course gameshow with a kart-battle finale. Main view is a third-person Chase Cam (THREE.PerspectiveCamera); you can switch to TV Broadcast, Helmet Cam or Overhead (THREE.OrthographicCamera).
- **Tech:** Three.js r180 (WebGPURenderer with automatic WebGL 2 fallback, TSL node materials for water), Rapier 0.19.3 (`@dimforge/rapier3d-compat`), Web Audio, Gamepad API, Pointer Lock, AI Hub session client 1.3.0, bundled with Bun.
- **Art Direction:** engine native: MeshStandardMaterial on primitive shapes, sun shadows plus spot and point lights, fog, canvas-painted textures, instanced crowd and particles.
- **Animation:** engine native: THREE.AnimationMixer with keyframe clips written in code, cross-faded; Rapier ragdolls take over on wipeouts.
- **Audio:** all written in code: sequenced music on Japanese pentatonic scales (taiko, koto-like plucks), synthesized sound effects and crowd, and gibberish voices for all commentary.
- **Online:** AI Hub Session Protocol v1, race mode, 1–4 players. No chat, no other networking.
- **Testing:** headless Chromium with Playwright and SwiftShader, test hooks that step the simulation, autopilot AI for the player, an emulated gamepad, a touch-device profile, and the AI Hub harness.
- **Research:** the AI Hub README, client and examples only; the show was recalled from memory.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** API cost unknown; total tokens unknown; session time about 2 h 30 min (estimate).

## Testing Feedback
- **Issues caught:** 20. They include:
  - the Shadows setting crashing when switched back on;
  - the Showdown ring being impossible to hit;
  - AI contestants drowning at, or stopping on, the Spin Cycle walkway;
  - boulders flinging people into the pool;
  - "You has" in the commentary;
  - menu taps shorter than one frame being lost;
  - six hub-session timing problems.
- **Critical / game-breaking:** 5:
  - the Shadows crash;
  - the unwinnable Showdown;
  - hub rounds stalling under slow frames, which failed the menu checks;
  - hub copies saying hello and ready too late at 3–4 players;
  - the attract demo stuck in a loop at the Spin Cycle.
- **Most helpful test:** the AI Hub harness suite, and the autopilot run through a whole Episode.
- **Least helpful test:** screenshots of practice games with the player standing idle.

## Engine Feedback
- **What I liked most:** one scene, one material model and one AnimationMixer run on WebGPU or WebGL 2 unchanged. Rapier's kinematic bodies made the moving obstacles easy to drive from a shared clock, so every hub copy sees the same course.
- **Where I got stuck or guessed wrong:**
  - Headless screenshots needed the WebGL 2 backend forced.
  - Software-rendered shader compiles block the page for seconds, which starved the other hub copies; I had to stop rendering under the hub's card until the round starts.
  - Switching a light's `castShadow` at runtime crashes the WebGPU shadow code.
  - I first placed the Showdown ring too high for the water arc.
- **Most important thing I built myself:** the character controller on a physics capsule (ground checks, moving-platform velocity, dive, duck) and the ragdoll mapping back onto a rig built from primitives.
- **Hardest part:** keeping the rig, its animation mixer and the ragdoll in sync without a skinned mesh.
- **Overhaul:** the WebGL 2 fallback's shader compilation, so it's parallel and non-blocking by default.
- **Change:** give Rapier JS a character controller that rides moving kinematic platforms, and give three.js a simple in-world text/label helper.

## Prompt Feedback
- **What I liked most:** freedom over the show and genre, combined with concrete, testable requirements (attract mode, couch UI, invert toggles, a real protocol with a harness).
- **What was confusing:**
  - the literal "pick a famous tv show" left in the Goal, Scope and Source lines;
  - "engine native" for three.js, which is a library rather than an engine;
  - whether "Online" meant AI Hub sessions only, or the game's own multiplayer too.
- **Hardest thing to do:** fitting a full gameshow into one demo while also passing the hub harness with four software-rendered copies in one browser.
- **One more test I'd run:** a real DualSense on a GPU-equipped browser, plus four real devices in a live hub session.