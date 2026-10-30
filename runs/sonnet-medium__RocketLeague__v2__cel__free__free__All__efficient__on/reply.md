**Rocket Leagueless** is built and bundled as a single HTML file. It is a car-soccer spiritual successor to Rocket League, with every feature in TASK.md implemented and no TODOs or stubs. The title was drawn by a real RNG from 50 riffs on the source's name. I never ran it with a real gamepad, on a real GPU, or by ear. Online play was only tested between two local browsers using a local PeerJS server, not over the internet.

The file is `RocketLeagueless-RocketLeague-claude-sonnet-5-5-medium-20261028-2106.html` in the task folder root. Dev files and `build.py` are in the subfolder of the same name. Three.js, Rapier and PeerJS load from CDNs, so it needs an internet connection and a WebGPU browser. I confirmed the CDN-loaded file boots and starts a match.

## What's in it
- **Modes:** Soccer, Mayhem (six power-ups on big boost orbs), Hoops (raised ring goals), Chaos (three balls), Free Play, and a 12-lesson Training Academy.
- **Match rules:** boost pads, jump/double-jump/flip, wall and ceiling driving, air roll, powerslide, demolitions, overtime, goal replays, stats and MVP, and a results screen.
- **Local and online:** split-screen for 1–4 players (controllers plus two keyboard layouts), with bots filling empty seats. Online uses 4-letter room codes for up to 4 players, and a bot takes over if someone drops.
- **Controller-first UI:** DualSense layout with matching keyboard glyphs, pause menu, quick chat, garage customization, and settings including the horizontal/vertical axis-invert toggles.
- **Attract mode:** starts after 10 idle seconds on any menu, cycles all four modes with cheating bots, and any input exits it.
- **Touch-only devices:** show "Controller or keyboard required" and a Settings button.

## Source Information
- **Date:** 2026-10-28 21:06
- **Source:** Rocket League
- **Tech:** Three.js r180 (WebGPU renderer, no fallback), Rapier 0.19.3, Web Audio, Gamepad API, PeerJS 1.5.4 (WebRTC) for online
- **Art Direction:** stylized cel-shading (toon ramp, ink outlines, glass walls, glow FX)
- **Animation:** procedural (springs, squash/stretch, wheel spin, topper motion, particles, replay recorder)
- **Audio:** all procedural. Generative music tracks, synthesized SFX and engines, and a browser speech-synthesis announcer with subtitles.
- **Online:** peer-to-peer WebRTC through the PeerJS cloud broker. The host runs the physics, clients send inputs and receive 30 Hz snapshots.
- **Testing:** lightweight. Headless Chrome 154 via Playwright at about 6 fps, a fast-forward sim hook, a two-browser online test against a local PeerJS server, fake-DualSense injection, and render-target screenshots.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown (dev tests used headless Chrome 154)
- **Model:** Anthropic, claude-sonnet-5-5, reasoning effort medium
- **Usage:** unknown (no estimates available)

## Testing Feedback
- **Issues caught:** about 10. The two critical ones were that WebGPU clears ignore the scissor (only the last split-screen viewport survived), and that the second keyboard could not join the lobby. The rest included lost key taps at low frame rate, bots that never scored or used power-ups, shadow stipple, and a garage framing glitch.
- **Most helpful test:** render-target composite screenshots combined with the fast-forward hook, then the two-browser online test.
- **Least helpful test:** plain screenshots of the WebGPU canvas, which come out blank in headless, and real-time driving at about 6 fps.

## Engine Feedback
- **Liked most:** TSL node materials and `MeshToonNodeMaterial` made cel-shading cheap. Rapier's CCD, trimesh colliders and ray casts made the arcade car controller straightforward.
- **Stuck / guessed wrong:** I assumed `setViewport` applies to render targets (it doesn't), that `scene.background` was harmless in split-screen (it wipes earlier viewports), and that the viewport origin was bottom-left (it's top-left).
- **Most important thing built myself:** the arcade car controller (ground ray casts, wall sticking, air control, flips), plus all the menus, netcode, bots and audio.
- **Hardest part:** debugging WebGPU rendering without a GPU inspector or reliable canvas capture, and sparse TSL documentation.
- **Overhaul or remove:** the classic-vs-node material split in `three/webgpu`, which is easy to mix up.
- **Change one thing:** first-class split-screen rendering that preserves earlier viewports.

## Prompt Feedback
- **Liked most:** the concrete, testable scope (10-foot controller UX, attract mode, 4-player online, replays) and the playful axis-inversion trap.
- **Confusing:** the bracketed filename pattern versus the SOURCE token, what "root" means, how to do online play without a backend, and the same feedback being requested in three places.
- **Hardest thing:** shipping physics, netcode, split-screen, audio, menus and AI in one pass without a real GPU, gamepad or second machine.
- **One test I'd have run:** two real machines on the internet, each with a physical DualSense on a real GPU, playing a full 4-player match to judge latency and feel.