I built **Ghostbustle**, an original co-op ghost-wrangling game inspired by **Ghostbusters (1984)**. It's one 308 KB file: `Ghostbustle-Ghostbusters-claude-opus-5-5-medium-20261101-1843.html` in the work folder. three.js and Rapier load from the jsDelivr CDN. Dev files, the build script (`tools/build.mjs`) and the tests are in `Ghostbustle-Ghostbusters-claude-opus-5-5-medium-20261101-1843/`.

In the final headless runs, a bot finished every job, a scripted Training Day using real inputs finished, and the AI Hub co-op harness passed every scenario I ran. All testing was headless on software rendering. Nobody has played it on a real GPU with a real controller, and I couldn't hear the audio.

**What's in it**
- **Four jobs:**
  - **Training Day:** a tutorial that teaches every control.
  - **The Grand Pemberton ballroom:** the Gobbler ghost eats the buffet to heal.
  - **The library:** invisible ghosts that only the PKE meter reveals, and "The Hush", whose shush knocks your stream away.
  - **The rooftop finale:** two hound statues come alive, then a "Clear your mind!" moment where whatever button you press picks the boss's form (three costumes). You break three glowing cores on the giant, then two players have to cross their streams on the gate.
- **Core loop:**
  - You lock onto a ghost with the stream, swing or slam it into walls, and drag it over a trap once it's weak.
  - Your pack overheats, so you vent it; there's also a boson dart and the PKE meter.
  - Crossing streams by accident causes an explosion.
  - Every broken chair, vase or piano goes on the client's invoice, which is the results screen.
- **Views:** over-the-shoulder by default, plus top-down and first person, switched with R3 or V.
- **Players:**
  - Up to 3 AI buddy busters (2 by default), which also revive you.
  - A second controller can drop in for couch co-op by pressing Options; the camera goes top-down.
  - Online co-op runs through AI Hub sessions, with the host's copy running the shared ballroom.
- **Attract mode:** after 10 seconds idle on the title, a bot plays a cycle of jobs with cheats on, and any input exits.
- **Controls and settings:**
  - Controller-first menus, with matching keyboard and mouse controls.
  - Settings include invert pad horizontal and vertical.
  - A touch-only device shows "Controller or keyboard required" with a Settings button, and attract mode still runs.
- **Look and sound:**
  - Art is standard three.js lighting, shadows and bloom.
  - Characters are animated with three.js's built-in animation system.
  - Music, sound effects and gibberish voices are all generated in code.

**Things that behave differently from what you might assume**
- A Quality setting (Auto/High/Low) drops shadows, bloom and resolution automatically on software graphics. I added it because three copies on software rendering stalled the harness's "world keeps moving" check. I expect the hub's own Playwright check to run on software graphics too.
- In a session, the world keeps simulating from a timer if frames stall or the tab is hidden, as the protocol requires.
- In solo, AI buddies do 45% of normal stream damage and wait before trapping. With three full-strength bots the ballroom was cleared in 30 seconds and the player had nothing to do; it now takes about 80.
- The rooftop finale always adds at least one AI buddy, because crossing streams needs two people.
- All jobs are open from the start rather than unlocked in order, so the whole demo is reachable.
- Rapier prints one deprecation warning from inside its own startup code that I can't fix from the game.

## Source Information
- **Date:** 2026-11-01 18:43
- **Source:** Ghostbusters (1984). The title came from 50 brainstormed riffs picked with Python's `secrets.randbelow` (index 41: Ghostbustle).
- **Genre and Perspective:** co-op third-person action (physics ghost-wrangling plus a property-damage invoice). The main view is over-the-shoulder; you can switch to an orthographic top-down view or first person at any time.
- **Tech:**
  - three.js r180 (WebGPU renderer with automatic WebGL 2 fallback, bloom post-processing)
  - Rapier 0.19.3 (rapier3d-compat: character controller, dynamic props, ray casts)
  - Web Audio, Gamepad API, Pointer Lock
  - ES modules bundled with esbuild 0.28
- **Art Direction:** standard three.js look: PBR materials, models built from primitive shapes, textures drawn in code, real-time lights with shadow maps, glow through bloom, additive particles.
- **Animation:** three.js AnimationMixer with keyframe clips written in code. Separate leg and arm layers cross-fade, plus one-shot clips for throws, slams and vents.
- **Audio:** original step-sequenced funk/spook music (one theme per job), synthesized sound effects, and Animalese-style gibberish voices for every line of dialogue.
- **Online:** AI Hub Session Protocol v1 (session.js 1.3.0) in co-op mode, with the host or a player-less server running the world. Outside sessions: AI buddies and local drop-in co-op.
- **Testing:**
  - Headless Playwright and Chromium on SwiftShader WebGPU.
  - A bot played through every job, and Training Day ran scripted with real inputs.
  - An emulated DualSense tested menus, play, pause, the invert fix and Create+Options.
  - Also tested: touch-only mode, attract mode, couch co-op drop-in, and screenshots.
  - AI Hub harness co-op runs all passed:
    - 2 players
    - 2 players without the hub's splash card
    - 3 players with host-leave on a lossy network
    - 4 players on a lossy network
    - server-hosted
- **Research:** read the AI Hub protocol docs, session.js, the harness and the arena example, and checked the three.js r180 and Rapier 0.19.3 type definitions. Nothing on the film beyond memory.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** unknown (no token or cost counter is available in the session); session time about 1 h 16 min (18:43 to 19:59).

## Testing Feedback
- **How many issues did testing catch?** 21: 3 crashes, 4 that made a job impossible to finish, 2 that would fail the AI Hub check, plus camera, layout, input and polish bugs.
- **How many were critical or game-breaking?** 7. Three crashes: one in the camera when there was no local player, and two from physics calls on props that had already broken. Four that blocked a job:
  - the boss's cores were out of reach
  - the gate portal had no collider
  - the portal never registered as complete
  - Training Day never ended
- **Most helpful test:** the bot playthrough of every job with rendering switched off. It found every job that couldn't be finished in seconds.
- **Least helpful test:** timing frames on SwiftShader. The GPU work runs asynchronously, so the numbers meant little.

## Engine Feedback
- **What I liked most:** three.js covers a lot out of the box: WebGPU with a WebGL fallback, AnimationMixer, instancing and bloom. Rapier's character controller and ray casts made the proton stream and props feel physical with little code.
- **Did I get stuck or guess wrong?** Rapier's collision-group bitmasks: a filter of 0 silently hides a collider from ray casts. I also had to look up which post-processing class r180 ships (PostProcessing, not RenderPipeline).
- **Most important thing I built myself:** the host-authoritative world and its networking (snapshots, interpolation, commands), the stream lock/pull/slam model, and the bot AI that both the buddies and attract mode use.
- **Hardest part:** there's no scene editor or asset pipeline, so every model, level and animation clip is code. Headless WebGPU screenshots also need an offscreen render-to-texture workaround.
- **One thing to remove or overhaul:** the split between classic and node materials in the WebGPU build; they're easy to mix and you get warnings.
- **One thing to change:** ship a small first-party networking/replication layer and an animation retargeting helper alongside the renderer.

## Prompt Feedback
- **What I liked most:** the bar is concrete and testable: attract mode, controller-first UX, the invert-axis fix, the touch fallback, and a documented multiplayer protocol with its own harness.
- **What was confusing:** "pick a famous movie" is pasted in literally as the source in several places. The Source Information list also mixes facts I can know with things only the harness can know (usage and cost).
- **Hardest thing:** fitting a full shared co-op world (host, server host, guests), a solo campaign, attract mode and all the menus into one HTML file without an editor.
- **One test I wish I could have run:** a real two-device session with real controllers and real latency, played start to finish by people.

The same three sections, plus the testing feedback, are in the in-game About & Credits screen and in the HTML comment at the top of the file.