# Cosmic Arkipelago

**Small ship. Big rescue.** An original arcade rescue game inspired by Imagic’s *Cosmic Ark* (1982).

Open the HTML file beside this folder in a current browser. Solo play needs no server, installation, or internet connection. Three.js, Rapier’s WASM, and PeerJS are embedded. WebGPU is preferred; the renderer supports WebGL 2 when WebGPU is unavailable.

The expedition visits three worlds, rescues six creatures, and ends with the Sunheart escape. A fast automated flight takes about 2 minutes 35 seconds; a human expedition allows longer rescue windows and return visits.

## Controls

| Action | Keyboard / mouse | Standard gamepad |
| --- | --- | --- |
| Fire in orbit | WASD / arrows; or aim and hold left mouse | Left or right stick / D-pad |
| Fly shuttle | WASD / arrows | Left stick / D-pad |
| Tractor beam | Hold Space / left mouse | Hold Cross / A or RT |
| Boost | Shift | Circle / B or L1 |
| Shield pulse | E / Q | R1 / RB or Triangle / Y |
| Pause | Esc / P; or click pause | Options / Menu |

Touch: drag anywhere to fly with an invisible stick. Aiming and tractor beams are assisted. The contextual circle pulses in orbit and boosts on the surface. Multitouch allows steering and boosting together.

Menus support keyboard, controller focus and range adjustment, mouse hover/click, and touch. Settings include PlayStation/Xbox prompts, music (10% by default), effects and voices, automatic tractor beam, screen shake, and fullscreen.

## Crew

- **Local, 1–2:** choose Crew up → Launch local co-op. P1 defends with WASD or pad 1; P2 flies with arrows or pad 2. Space beams, Shift boosts, E pulses.
- **Standalone online, 1–2:** the captain hosts a room and shares its six-character code. The guest joins, then the captain launches. PeerJS supplies public signaling and WebRTC carries state and controls directly. Same-origin tabs can also connect through BroadcastChannel without the relay. Cross-network NAT traversal depends on the network; a TURN relay is not supplied.
- **AI Hub, 1–4:** shared-world co-op with a host, or a dedicated host without a player. All crew share control of one Ark and shuttle. State, controls, cues, result reporting, time-up, departures, and end-of-round silence use the unmodified Hub client. No standalone signaling starts inside a Hub session.

After ten seconds without title-screen input, a looping AI expedition begins. Any input exits it. The demo has unlimited energy.

## Development

The pause menu exposes Developer tools: live shuttle speed, meteor speed and interval, beam time, damage, energy drain, simulation speed, and storm duration. Tools include energy refill, stage completion, next world, invulnerability, autopilot, collision outlines, stage restart, and reset to defaults.

- `core.js`: Rapier simulation, campaign rules, data-driven world definitions, events, snapshots, and autopilot.
- `scene.js`: procedural meshes, TSL quantized shading, ink hulls, Three.js AnimationMixer clips, camera, and effects.
- `input.js`: keyboard, mouse, touch, standard gamepad, menu navigation, and rumble.
- `audio.js`: Web Audio music, effects, and gibberish voices. No audio assets.
- `network.js`: standalone rooms; `main.js` also integrates Hub sessions.
- `template.html`: interface and layout; `feedback.json`: credits and import metadata.

With Node 24 and Bun installed:

```sh
npm ci --ignore-scripts
npm run build --silent
npm test --silent
```

The build emits the final HTML and `exit-interview.json` one folder above, and a matching development `index.html` here. No build server is required.

The test command uses the workstation’s installed Python Playwright environment, binds a quiet HTTP server to 127.0.0.1 on an OS-selected port, and stops it on exit. It prints only failures and one result count. Inspectable results and visual captures are in `artifacts/`. It checks file:// startup, WebGPU, WebGL 2, a complete default campaign, physics and rescue rules, input methods, generated audio levels, attract mode, standalone co-op, and four official Hub harness scenarios.

WebGPU screenshots on headless WSL may be blank; WebGPU is checked through live engine state, and visual captures use WebGL 2. Physical controller feel, human audio listening, TV viewing, real iOS hardware, and external NAT combinations are unknown.

## Research and provenance

- [Imagic’s original instructions, transcribed by AtariAge](https://www.atariage.com/2600/manuals_old/cosmic_ark.html): four-direction meteor defense, shuttle beaming, two creatures, indestructible moving defenses, energy, recall warnings, and two-player role division.
- [Original gameplay footage, Silver Blue’s Retrocade](https://www.silverbluesretrocade.com/wp-content/uploads/2024/08/atari-2600-cosmic-ark-demo.mp4): original saucer, tiny surface creatures, starfield, side defenses, and sparse electronic sound context. A frame and audio spectrum are retained in `research/`; the video is not shipped.
- [Official Three.js WebGPU documentation](https://threejs.org/manual/pages/webgpurenderer): renderer setup, TSL materials, and fallback behavior.
- [AI Hub Session Protocol v1](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub): unmodified client, bridge, round coordinator, and official conformance harness are retained here.

Fifty title candidates were considered privately. Node’s cryptographic random generator selected index 7 (zero-based): Cosmic Arkipelago. The draw record is in `title-draw.json`.

Library licenses: Three.js MIT, PeerJS MIT, Rapier Apache-2.0. The engine itself was not modified.
