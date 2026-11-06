# Super Bounceout

Good angles. Bad intentions.

An original ink-and-paper arcade brick breaker inspired by Super Breakout (1981).
The complete four-stage run features Classic, Cavity, Double and Progressive rules,
armored bricks, captive balls, three pickups, piercing ink bursts and shared-world co-op.

## Play

Open the HTML in the parent folder in a current browser. The Three.js r180 engine,
TSL shaders, Rapier 0.19.3 code and physics WebAssembly are embedded in that file.
The Barlow Condensed and DM Sans fonts are embedded. Cross-device online rooms
load PeerJS 1.5.5 on demand and use its public signaling service; same-device tabs use
BroadcastChannel. AI Hub sessions use only the supplied Hub client and transport.

- Move: left stick / D-pad, mouse, A/D or arrows. On touch, drag anywhere on the board.
- Serve / next stage: Cross, A, Space, click or tap.
- Ink burst at 100%: Triangle, Y, Shift, right click, two-finger touch or the burst button.
- Pause: Options, Escape, P or the menu button.
- Local player two: second controller or arrow keys; player one uses A/D or mouse.
- Title attract mode begins after 10 seconds idle; any input exits.
- Pause → Developer tools exposes live balance sliders, infinite balls, AI, stage skip,
  multiball, burst fill and reset. Music starts at 10%.

## Build and check

From this directory:

```
npm run build
npm test
```

The tests own an OS-selected loopback port and close their own browser/server resources.
The single test command prints failures and one count line. It covers real physics,
a natural AI run through all four stages, controls, touch, audio, networking and the
supplied Hub conformance harness, including dedicated-server and packet-loss cases.

`visual_check.py` creates screenshots for manual layout inspection. Its `?webgl` URL
uses the renderer's WebGL2 fallback to obtain nonblank screenshots on headless machines;
the game and automated engine checks default to WebGPU.

`main.js` owns data-driven stages, gameplay, UI, native AnimationMixer effects and controls.
`audio.js` synthesizes every sound and voice. `online.js` owns session/room transport.
`credits.json` supplies the in-game source information and feedback. `build.mjs` bundles
all code and inserts the unmodified Hub session client as the first head script.

The root `exit-interview.json` is the machine-readable catalogue and production record.
