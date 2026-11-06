# Drainio Bros.

Bump. Flip. Boot. An original arcade platformer inspired by Mario Bros. (1983).

Open the single HTML file in the parent folder in a current browser. It supports file://, WebGPU, and a WebGL 2 compatibility backend. The pinned Three.js and Rapier modules download from jsDelivr; fonts, game code, art and audio synthesis are inside the HTML.

## Play

Eight shifts introduce Bottlebacks, two-hit Clawbacks, hopping Springwings, freezing Frosties, coin breaks, sparks, icicles, and the Big Clog finale. Bump the floor below a pest to flip it. Reach its floor and touch it or press the boot button before it recovers. Healthy enemies hurt from every side.

- Controller: left stick / D-pad moves, Cross jumps, Square boots or activates BOP nearby, Down + Cross drops, Options pauses. Xbox glyphs are available in Settings.
- Keyboard: A/D moves, Space/W jumps, E boots/BOP, S + Space drops, Esc pauses. Solo also accepts arrow keys. Left mouse jumps and right mouse boots.
- Second keyboard player: arrows move, Up / Right Shift jumps, Right Ctrl boots. Third and fourth couch players need controllers.
- Touch: drag the left side to move, tap/hold the right side to jump. A context button appears for nearby BOP and boot opportunities. Touch assistance times bumps against overhead pests.

The title screen starts an AI demonstration after ten idle seconds. Any input returns to the title.

## Co-op

Couch crew supports 2–4. Online Shift creates a six-digit room code for 1–4 players. Internet rooms use PeerJS 1.5.5 signaling and direct WebRTC data connections; same-browser tabs can communicate through BroadcastChannel. The host runs the physics. Guests send inputs and receive world snapshots.

AI Hub uses the unmodified 1.4.0 session client and shared-world protocol v1. The hub owns starting, timing and finishing a round. It supports four seats, simulated loss and latency, player departure, host departure, and a dedicated host with no player. Standalone signaling is never opened in hub sessions.

## Workshop

Pause → The Workshop. Feel and Pests tabs expose run speed, jump, gravity, time scale, enemy speed, flip duration, spawn cadence and starting lives. Tools include invincibility, single-frame step, physics collider view, phase advance/restart, life and BOP refill, and every enemy spawner. Run World previews live changes. Reset Defaults restores the baseline. Workshop modifications make the local score unranked. Hub sessions keep developer mutations disabled.

## Develop and verify

Development sources are in `src/`. Run `npm run build` to regenerate the single HTML and `exit-interview.json` beside it. `interview.json` supplies the in-game source information and feedback pages as well as the exported interview.

Run **`node tests/run.mjs`** for the full suite. It prints failures and one count, chooses its own loopback port, and closes its browsers and server. It covers pinned Rapier physics, complete campaign simulation, real WebGPU initialization, direct file loading, keyboard, virtual standard controllers, touch, procedural audio, standalone WebRTC, WebKit compatibility, and four AI Hub harness scenarios. Test APIs are enabled only with `?test=1`. `__drainio.inspect()` is always available for read-only state inspection. `?renderer=webgl` selects the compatibility backend explicitly for visual diagnosis.

The generated HTML uses Three.js AnimationMixer/AnimationClip as its animation base. All meshes, ink outlines, wall texture, signs and comic effects are procedural. The Web Audio score, effects and formant-filtered nonsense voices use no audio files. Music defaults to 10%.

Research references and the upstream hub harness/client are preserved in `research/`. The title was selected using Node’s cryptographic random generator from 50 silently brainstormed candidates.
