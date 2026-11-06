# Pitfall-ish — The Understory

Open the single HTML in the parent folder. It contains the engine, physics WASM, art, procedural audio, UI and networking client; no runtime downloads or server are needed for solo play.

Move with WASD or arrows; Space jumps; W/S climbs and swims; E catches or releases balloons; M opens the map; Esc pauses. Any standard controller works: left stick, Cross jump, Square interact, Triangle map, Options pause. Switch to Xbox glyphs in Settings. On touch, drag the left side in any direction and tap/hold the right side to jump or rise; Catch appears beside nearby balloons.

Rescue Pip in the Fern Gallery, dive for Nibs in the river, and catch a balloon to Professor Fern's upper ledge. All three rescues lower the homeward bridge. Return to Daylight Camp. Three knocks return you to the most recent shared lantern; found friends and treasure stay found. Gold is optional. Jump across the camp ladder opening on the return trip.

Pause → Developer tools exposes live movement, gravity, swim, hazard and camera tuning, invincibility, quick travel, refill, checkpoint return, and reset. Settings also provide explorer assist and reduced motion. Idle on the title for ten seconds to watch the looping expedition replay.

## Co-op

AI Hub links players automatically. Standalone Co-op camp can host and join two tabs at the same address using the same camp code (default UNDERSTORY). For remote play, host creates an invitation; guest pastes it and selects Use connection code to produce an answer; host pastes that answer and selects Use connection code. This uses a direct WebRTC data channel and public STUN, without a TURN relay; restrictive networks may require AI Hub. Hosting a local HTTP page requires 127.0.0.1 or HTTPS for WebGPU. Solo file:// works offline.

## Build and verify

`npm run build` bundles the installed Three.js 0.180.0 and Rapier 0.19.3 with Bun and embeds everything into the parent HTML. `npm test` is the single acceptance command; it starts its own loopback server on an OS-selected port, closes all of its browsers/processes, prints only failures and a final check count, and saves test-results.json. It covers the complete physics route, input, touch, procedural PCM output, repeated co-op rounds, real WebRTC, and the official AI Hub harness, including a dedicated host.

WebGPU is primary. If the graphics device is lost, a fresh Three.js WebGL2 backend restores the same scene. Software WebGPU on this workstation also loses a device on a minimal native clear-frame test. Hardware WebGPU and physical controllers/mobile devices are unknown; standard-pad injection and touch emulation provide coverage here.
