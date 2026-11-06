# ComBop

Small tanks. Big comebacks.

Open `../ComBop-Combat-1977-gpt-6.1-sol-ultra-20261105-212552.html` in a modern browser. The game is one HTML file. Internet access is needed to load the pinned Three.js 0.180.0 and Rapier 0.19.3 engine dependencies. All art, animation and sound are created in code. WebGPU is preferred; Three.js can use its WebGL2 backend when WebGPU is unavailable.

## Play

- **Solo circuit:** win three bouts, each first to three wrecks. Bankshot boogie introduces bouncing shells and destructible cover. Ghost shift adds cloaking. Double time features rapid-fire pickups. Every bout also supports repair drops, burst dodges, fuel-can explosions and sudden death.
- **Couch duel:** two tanks, one arena. Select the arena in Settings. Two standard controllers or one shared keyboard are supported.
- **Online duel:** AI Hub rooms start automatically. Standalone copies connect with an invitation and a return code over WebRTC. No relay is provided; direct connections depend on the peers’ networks.
- **Attract mode:** after ten seconds of title inactivity, both tanks play a looping three-arena demonstration. Any input returns to the title without selecting a menu item.

| Action | Player 1 | Player 2 on keyboard | Standard controller |
| --- | --- | --- | --- |
| Move | WASD | Arrows | Left stick |
| Aim | Mouse | IJKL | Right stick |
| Fire | Left click | Enter | R2 / RT |
| Burst | Space | Shift | Circle / B or L2 / LT |
| Pause | Escape | Escape | Options / Menu |

Touch: drag on the left to drive, with automatic aim and fire. Drag on the right to aim manually with automatic fire. The Burst button shows its recharge time. Landscape gives a wider view.

Music defaults to 10%. Settings also offer Xbox prompts, aim-guide and shake toggles. Pause → Dev workshop provides live balance sliders, invulnerability, repair, sudden death, and a win-bout action. Developer changes are disabled for network sessions.

## Development and verification

The editable modules are `sim.js`, `view.js`, `app.js`, `audio.js`, and `hub.js`. Arena layouts and rules are in `MAPS` in `sim.js`; live balance defaults are in `DEFAULTS`. AnimationMixer clips are authored in `view.js`. The unmodified supplied AI Hub session client is `session.js` and its integration notes are in `hub-integration.md`.

Rebuild the single-file deliverable:

```sh
python3 ComBop-Combat-1977-gpt-6.1-sol-ultra-20261105-212552/build.py
```

Run all automated checks with one command (prints failures and a one-line count):

```sh
./ComBop-Combat-1977-gpt-6.1-sol-ultra-20261105-212552/run-tests.py
```

The test runner starts its own loopback server on an OS-assigned port and closes it. It uses the installed Python Playwright environment and emulates controllers and multitouch. It also renders synthesized audio offline and tests direct WebRTC plus the supplied AI Hub harness. The confirmed working software WebGPU flags for this Chromium build are recorded in the runner; the initially supplied adapter flag loses its device even in a minimal Three.js scene.

`test-results.json` records the latest checks. `visual-title.png` and `visual-play.png` document visual review. `../exit-interview.json` contains the catalogue metadata and required feedback, also embedded in the game’s About screen.
