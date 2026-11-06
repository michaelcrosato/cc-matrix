# Auto Lap Happy

Little cars. Great country roads.

Open the root `Auto-Lap-Happy-Auto-Racing-1980-gpt-6.1-sol-ultra-20261106-041321.html` in a browser. The ordinary game has no runtime downloads or server requirement. This folder contains all source, pinned dependencies, authoring notes and evidence. `index.html` is a byte-identical development copy of the root deliverable.

Choose the guided road tour, any two/five-lap time trial, solo pursuit, two-human couch duel, direct peer duel or free drive. Five cars use four handling profiles; tan and blue are matched. All five circuits, connectors and the secret timed straight are open immediately. Ordinary best runs and ghosts save locally; dev-altered drives do not overwrite them. Corrupt or unavailable storage does not prevent play.

## Controls

- Keyboard: A/D or arrows steer; Space/S/down brake; hold R recover; Escape pause. Automatic acceleration is default. Manual throttle: W/up.
- Standard controller: left stick steer, L2 brake, hold Triangle recover, Options pause; manual R2 throttle. PS glyphs default, Xbox symbols selectable.
- Touch: drag an invisible left zone to steer, hold the right side to brake; both touches work together. Automatic throttle and gentle road assist; only pause and transient cues occupy the driving view.
- Couch: two pads, keyboard+pad or shared keyboard. Shared keys use WASD/Space/R for Driver1 and arrows/down/right-Shift for Driver2. Explicit seats remain bound through disconnects.

Pause→Developer paddock offers live balance sliders, AI driving, invulnerability, free camera, gate/collision overlays, course/car changes, checkpoint recovery and tour-step tools. Online rules remain authoritative and dev balance actions are disabled.

## Direct connection

Multiplayer→Invite/Join. Host creates an invitation, guest imports it and sends the complete reply, host imports the reply and starts. Copy/paste and text-file fallbacks are available. No account/broker. Optional STUN URL; some internet networks require TURN, which is not included. Same-machine real WebRTC and loopback/file paths were verified; public cross-NAT connectivity is unknown.

AI Hub sessions bypass menus, use the official shared-world transport, auto-ready and finish through the host. No standalone transport is opened within Hub.

## Build and verify

From this folder:

```sh
node tools/build.mjs
node tools/test.mjs
```

The one quiet test entry prints only failures plus a one-line count. Filters: `core`, `audio`, `network`, `hub`, `ui`, `direct`, `gameplay`, `package`. Browser workers use the workstation’s installed Python Playwright environment. No browser download is needed. Any harness server binds loopback port0 and shuts itself down.

`docs/research.md`, `docs/world.md`, `docs/network.md`, `docs/audio.md`, `docs/architecture.md`, `docs/issues.md` and `docs/testing.md` describe provenance, authoring, authority and evidence. The root `exit-interview.json` also populates the in-game paged About/Credits.

Original game code and procedural assets: MIT. my-3D2dge upstream notices retained. Auto Racing historical reference is credited separately; no original maps or art are used by the game.
