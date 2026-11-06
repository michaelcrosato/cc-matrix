# H.E.R.O. IN A HOLE

An original five-assignment cave rescue game inspired by Activision’s H.E.R.O. (1984).

Open the single HTML file beside this directory in a current browser. All dependencies, physics WASM, art and audio code are embedded; there are no asset downloads. WebGPU is preferred, with an automatic WebGL 2 fallback. Add `?renderer=webgl` to request the compatibility renderer.

Controls: WASD and Space move/fly; mouse aims, left click or J fires, E or K plants dynamite, Escape pauses. Standard gamepad: left stick moves and flies, Cross/A flies, right stick aims, R2/RT fires, Square/X plants dynamite, Options/Menu pauses. A second controller or arrows/N/M controls the local partner. Touch: drag on the left to move/fly, drag on the right to aim/fire, contextual blast button for dynamite; targeting assist is enabled.

Rescue all three miners in each assignment, then reach the green EVAC lift. Power and six dynamite charges reset at each assignment. Laser fire also clears bulkheads. Stay clear of a planted charge. Keep lamps intact, ride the lava raft, and avoid tentacles. Fifteen rescues finish the campaign.

Local co-op is on the title screen. Online co-op connects automatically inside an AI Hub session. Outside the Hub, Play Online offers direct WebRTC invite/answer codes; exchange them using your own chat. Direct connection availability depends on the two networks' NAT/firewall configuration. No chat, voice, account, external assets or public game server is used.

Pause → Dev mode exposes live movement, gravity, energy, enemy, damage and fuse sliders; invulnerability, infinite power, refill, rescue, warp and assignment selection tools. Assisted runs are marked. Title inactivity starts a looping attract demonstration after ten seconds; any input returns to dispatch.

## Development

- `npm run build` bundles source into the root HTML and a local `index.html`.
- `node test.mjs` runs all simulation, UI, audio, network, bundled-game, official AI Hub and packaging checks. It prints failures and one final count.
- To run a subset after a narrow edit: `node test.mjs simulation`, `node test.mjs ui`, `node test.mjs modules`, `node test.mjs game`, `node test.mjs hub`, or `node test.mjs package`.
- Authored level definitions and physics rules are in `sim.js`; presentation is in `renderer.js`; native animation clips are created there. `shell.html`/`ui.js` define menus. `audio.js` synthesizes every sound. `online.js` implements AI Hub and standalone co-op.

Research references are in `research/notes.md`. Source information and production feedback appear in About / Credits and in the root `exit-interview.json`. Usage is filled by the importer.
