# Demon Bonanza

**Cold moon. Hot cannon. Bad company.**

Open `../Demon-Bonanza-Demon-Attack-gpt-6.1-sol-max-20261105-191333.html`
in a modern browser. Direct `file://` play works. The single HTML includes the
complete game and the official AI Hub client. Three.js R180, Rapier 0.19.3 and
the fonts load from pinned/public CDNs, so the first load needs internet.

An original fixed-screen, 2.5D arcade shooter inspired by **Demon Attack**
(Imagic, 1982). Six authored waves introduce moths, firebirds, split demons,
divers, armor, beam warnings, reflective pulses, overdrive pickups, upgrade
choices and a three-phase boss. Victory opens an endless, escalating encore.
No art or sound files are used by the game. All models, animation and audio
are generated in code.

## Controls

| Action | Keyboard / mouse | Standard controller |
|---|---|---|
| Slide | A / D or Left / Right | Left stick or D-pad |
| Aim tracers | Mouse | Right stick |
| Fire | Hold Space or left click | R2 / RT or Cross / A |
| Reflective pulse | E or right click | Square / X |
| Dash | Shift | Circle / B or R1 / RB |
| Pause / back | Esc or P | Options / Menu |
| Select menu item | Enter or click | Cross / A |
| Scroll long menu pages | Page Up / Page Down or wheel | Right stick |

Couch player two: **J / L** slide, **K** fire, **I** pulse, **U** dash, or a second
controller. Both cannons share the reserve bunkers. Touch: drag from anywhere
for an invisible thumb control; swipe quickly to dash. Auto-fire and assisted aiming/emergency pulse
are on by default. A second finger activates pulse manually. The menu button
remains visible. Landscape offers a larger arena on a phone.

Music defaults to 10%. Settings save volume, input glyphs, shake and touch
assistance locally. Prompts follow the input used last.

## Multiplayer

- **Couch:** title → Bring a partner → Couch co-op.
- **Direct WebRTC, two devices:** host creates an invitation; partner joins
  using that code and sends the reply code back; host pastes the reply and
  connects. Keep both pages open. This uses a direct data channel with STUN;
  there is no application server or TURN relay. Restrictive networks may
  prevent a connection. Local two-context connections are tested; connection
  success between arbitrary external networks is unknown.
- **AI Hub, one to four players:** Session Protocol v1, `shared-world`, host
  authority, clocked start, validated inputs, snapshots, departure handling,
  time-up, cooperative results and end handling. A server host without its own
  player is supported. All session traffic goes exclusively through AI Hub.

## Attract and development modes

Ten seconds of title inactivity starts an invulnerable AI expedition that loops
through the full campaign. Any input returns to the title.

Pause → **Development lab** exposes live cannon speed, fire rate, flock speed,
enemy fire rate, pulse cooldown, damage and simulation speed. It also provides
invulnerability, autopilot, bunker refill, wave selection/restart, enemy-fire
clearing, stepping, diagnostics and reset to defaults. Resume applies changes.
The host owns simulation tuning in network games.

## Build and verify

From this directory:

```sh
npm run build --silent
./test
```

`./test` is the single verification entry point. It prints only failures and a
one-line check count. It runs deterministic Rapier gameplay checks and a full
campaign bot playthrough; Chromium WebGPU, WebGL visual captures, keyboard,
standard-gamepad emulation, touch, pause, sliders, audio waveform analysis,
file-URL play, couch co-op, two-context WebRTC, the four official AI Hub harness
scenarios, and WebKit compatibility. All server sockets bind to **127.0.0.1**
on an OS-assigned port and close afterward. No global processes are stopped.
Artifacts are in `tests/artifacts/`; `test-report.json` is the final count.
Visual captures are optional: `./test --screenshots`.

For visual inspection on a headless software GPU, append `?renderer=webgl`.
The default renderer uses WebGPU; a native WebGL 2 fallback also handles
unavailable GPU devices. WebGPU headless screenshots can be blank despite a
working state and submitted geometry, so the tests verify those separately.

`PLAN.md` records this game's implementation design. No plan was supplied by
the user; the required source-information field is therefore `none`.
`research/notes.md` documents source research. `selection.json` records the
cryptographic random draw from fifty silently brainstormed titles.

Source Information, Testing Feedback, Engine Feedback and Prompt Feedback are
available in the in-game **About & credits** screen and in the root
`exit-interview.json`. Usage is **added on import**.
