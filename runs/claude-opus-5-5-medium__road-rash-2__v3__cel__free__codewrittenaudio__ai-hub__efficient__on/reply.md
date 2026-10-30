Road Rasp is finished: the single-file game is `RoadRasp-RoadRashII-claude-opus-5-5-medium-20261029-0620.html` (266 KB) in the folder root. Its SHA-256 starts `94bf18bc…`. Every result below is from that exact file, with no edits after testing, and a TODO/placeholder/stub search of the source came back empty.

**Results on the final build**
- **AI Hub harness (the hub's own conformance test):** all checks passed in four setups:
  - 2 players.
  - 4 players on a bad network (150 ms latency, 50 ms jitter, 5% packet loss).
  - Host leaving mid-round (3 players, bad network).
  - The server scenario, where a copy with no player of its own runs the computer rivals.
- **Gamepad-only standalone race:** the stick steered, R2 accelerated, Square struck, Options opened the menu and Circle closed it.
- **Sound output:** I measured the signal level going to the speakers:
  - 0.163 RMS during a race (engine, music and effects).
  - 0.147 RMS for the gibberish voice alone.
  - 0.000 with everything muted, as a control.
  - That proves the game produces sound, but I can't listen, so how it actually sounds is unverified.
- **Career race:** ran to over 1.5 km with no errors.
- **Standalone online play (lib/hub round between two browsers):** one full round ran to completion.
  - The hub ranked the finish times (28.63 s and 28.81 s) and sent the end of the round to both browsers.
  - Earlier runs of the same round passed 680 messages with none dropped.
  - Twice, the joining browser never got into the room. That happens at the connection step through PeerJS's free public server, before any game messages flow. Retrying fixed it, but a friend joining may occasionally need a second try.
  - One other failed run was my test script's fault: it teleported a rider while they were mid-crash.
- **Earlier 4-player failure:** the one failing run was on a previous build, and the final build passed this setup. I believe that failure was software rendering stalling under four WebGPU frames, but I couldn't prove it.

## Source Information
- **Date:** 2026-10-29 06:20
- **Road Rash II** (Electronic Arts, 1992, Sega Genesis / Mega Drive)
- **Tech:**
  - Three.js r180 (WebGPU only, no fallback), Rapier 3D 0.19.3 for physics.
  - Gamepad API and Web Audio API.
  - AI Hub Session Protocol v1 (client 1.3.0), with lib/hub's `round.js` and `bridge.js` bundled unmodified.
  - PeerJS 1.5.4, used only to carry messages between browsers in standalone online play.
  - Bundled with Bun 1.3.14.
- **Art Direction:** stylized cel shading with three bands of light, ink outlines, bold flat colours for each region, distance fog and real-time shadows.
- **Animation:** riders are animated in code (lean, punch, kick, weapon swing, running back to the bike). Crashes use Rapier physics for tumbling riders, bikes and debris. The camera shakes on impacts and widens its view at speed.
- **Audio:** all generated in code with Web Audio — engines, hits, crashes, sirens, a 7-song garage-rock soundtrack, and gibberish "Animalese" voices for taunts.
- **Online:** AI Hub race mode, both inside the hub and on the game's own.
  - Every copy builds the same course from a shared seed.
  - Computer rivals are run by the lowest seat, or by the hub's server copy when there is one.
  - Traffic follows a shared clock.
  - The rider who gets hit decides the outcome of that hit.
  - Standalone online rounds are real lib/hub rounds between friends' browsers.
- **Testing:**
  - Bun bundling.
  - Playwright driving a visible Chrome on a virtual display (Xvfb), with software-rendered WebGPU.
  - AI Hub harness: 2 players, 3 and 4 players on a bad network, host leaving, and the server scenario.
  - Gamepad-only race.
  - Measured audio output.
  - A two-browser lib/hub round.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** unknown

## Testing Feedback
- **How many issues did testing catch?** Eight in the game, plus two problems with the test setup:
  - The road and ground triangles faced the wrong way, so both were invisible.
  - Attract mode never advanced its race.
  - The race froze while the menu was open.
  - Computer rivals were too slow.
  - A flash message lingered on screen.
  - The subtitle covered the results table.
  - The harness's input check saw the previous frame's controls instead of the current ones.
  - The server copy didn't run the computer rivals.
  - Test setup: a port clash with another process, and blank WebGPU captures in headless Chrome.
- **How many were critical or game-breaking?** Three: the invisible road and ground, the dead attract mode, and the race freezing behind the menu in a hub session.
- **Most helpful test:** the AI Hub harness across all its scenarios, together with the two-browser lib/hub round.
- **Least helpful test:** headless Chrome, which lost its WebGPU device so every capture came back blank.

## Engine Feedback
- **What did you like most about the engine?** Three.js's node-based materials (TSL): the ink outline is one line of node maths, and the toon material gives the cel bands almost for free.
- **Did you get stuck or guess wrong?**
  - Three's WebGPU renderer quietly falls back to WebGL 2 unless you check the backend yourself.
  - Headless Chrome loses its WebGPU device, so I had to run a visible Chrome on a virtual display (Xvfb).
  - Rapier logs a deprecation warning from its own start-up code.
- **Most important thing you had to build yourself:** the arcade riding model. It tracks distance along the road and sideways offset, curves push the bike outward, and crests launch it into the air.
- **Hardest part about using the engine:** keeping the cel look readable at speed, with outlines on hundreds of parts and fog and shadows that follow a 3 km road.
- **If you had to remove or overhaul one thing:** the split between the `three/webgpu` and `three/tsl` modules, and the import-map setup it needs.
- **If you could change one thing:** a built-in outline or toon post-process for the WebGPU renderer, instead of building the outlines by hand.

## Prompt Feedback
- **What did you like most about this prompt?** A concrete source game plus a precise multiplayer contract, with a harness to test against.
- **What was confusing?** "Multiplayer … for the game on its own." I resolved it by running real lib/hub rounds between browsers, with PeerJS only as the connection.
- **What was the hardest thing to do?** Fitting career, combat, cops, physics crashes, attract mode, hub play and standalone online play into one polished file.
- **If there was one test you could have run, what would it be?** The AI Hub harness on a real GPU with four emulated DualSense controllers, plus a full-length soak race and a person listening to the audio.