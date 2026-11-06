# Jungle Scurry

**A little trouble. A grand adventure.**

Open the HTML file in the parent folder in a modern browser. All engine code, physics WASM, art and sound generation are embedded; it needs no asset server or CDN. WebGPU is the default. Three.js uses its WebGL2 backend if WebGPU is unavailable, and the game recovers to that backend after a lost graphics device.

## Controls

| Action | Keyboard / mouse | Standard controller |
|---|---|---|
| Move / swim / pump vine | WASD or arrows | Left stick / D-pad |
| Jump / release vine | Space | Cross / A |
| Knife / ring bell | E, F or left click | Square / X |
| Duck / dive | S or Down | Circle / B |
| Pause | Escape or P | Options / Menu |
| Menus | Arrows + Enter, mouse | D-pad / stick + Cross |
| Long credits / guide | Wheel, Page Up / Down | Right stick |

Couch scout two uses IJKL, Right Shift, and O, or a second controller. On touch devices drag anywhere to move, tap to jump, and use the contextual knife / bell / release button. River combat and low-air surfacing have touch assistance.

Vines catch automatically. Pump right and release on the upswing. In the creek, surface or collect air bubbles to refill oxygen; the knife stuns crocodiles. Jump small boulders and duck beneath large ones. Ring three Sunbells to lower Professor Pip's basket and reach the final flag.

The pause menu opens **Dev camp** with live physics and difficulty sliders, invincibility, autopilot, chapter selection, telemetry and default reset. Leaving the title untouched for ten seconds starts an AI expedition; any input returns to the title.

## Co-op

- **Couch expedition:** two controllers or a shared keyboard.
- **Nearby camp:** host and join the same code in two tabs on the same origin/device.
- **Direct connection:** the host makes an invitation, the friend pastes it and returns the reply, and the host connects the reply. This uses a real WebRTC data channel with public STUN discovery; restrictive NATs can prevent a direct connection.
- **AI Hub:** the embedded unmodified session client implements the official shared-world protocol. The host owns physics and sends snapshots; clients send input. The dedicated host has no graphics device or local scout. The Hub owns round start, finish and timeout.

## Development and verification

From this directory:

```sh
npm run build --silent
npm test --silent
```

The build emits the single distributable HTML into the parent folder and embeds the adjacent `exit-interview.json` into About. The test command builds, checks real Rapier mechanics and the complete route, inspects native geometry/animation, drives the game with keyboard/mouse/gamepad/touch, measures synthesized audio, tests real peer transports and runs the unmodified AI Hub harness in four scenarios. It starts its own loopback server on an OS-selected port and closes every browser and server. Only failures and one summary count are printed. Detailed reports are in `tests/`.

To see the official harness separately, serve the parent directory and open this folder's `harness.html?game=../Jungle-Scurry-Jungle-Hunt-gpt-6.1-sol-ultra-20261105-215315.html&players=2&auto=1`.

Source inspiration: Jungle Hunt (1983). No internet research was used for source, art, mechanics or narrative. Only the explicitly requested AI Hub integration code was consulted. Original models, animations, writing, music, effects and gibberish voices are generated in code.
