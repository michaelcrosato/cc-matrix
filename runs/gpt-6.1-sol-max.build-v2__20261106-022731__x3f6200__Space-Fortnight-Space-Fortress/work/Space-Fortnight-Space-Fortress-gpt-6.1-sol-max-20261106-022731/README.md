# Space Fortnight

Three lines. One last stand.

Open the single HTML file in the parent folder directly in a browser. It contains the unchanged native my-3D2dge 0.89.1 engine, released AI Hub client 1.4.0, all game code, custom pixel artwork and synthesized audio. No installation, server or external assets are needed for standalone play.

A successful siege takes about 10–12 active minutes. Break the outer screen, defend Fortress 13 and its cooling radiators, then dock onto a horizontal ground rail and destroy the Night Admiral's batteries, tractor emitters and exposed core. Losing either early line triggers an emergency retreat with weaker defenses. The final base loss or complete wing wipe ends the sortie.

## Controls

| Action | Keyboard / mouse | Standard pad |
|---|---|---|
| Thrust | WASD or arrows | Left stick |
| Aim | Mouse | Right stick |
| Laser | Left click or J | R2 |
| Boost | Space or Shift | L2 |
| Defensive pulse | Right click or E | Square |
| Menu | Escape | Options |
| Confirm / Back | Enter / Escape | Cross / Circle |

PlayStation symbols are the default; Settings offers Xbox symbols. Native Controls supports rebinding. Touch uses a floating left thumbstick and a directional right drag to aim/fire, with assisted aim/fire when the right thumb is released. Pulse and boost appear only when useful. Portrait keeps the entire arena and uses the letterbox area for readable status.

Couch co-op uses 2–4 controllers, or two keyboard halves plus controllers. Open Couch co-op, press Options on extra pads, or 2 to add the right keyboard half. With two keyboard pilots: P1 uses WASD, F/G/H; P2 uses arrows, period/slash/comma. These are fire/boost/pulse respectively. Online 1–4 player co-op is available through AI Hub; there is no standalone internet-room browser.

After exactly ten seconds without meaningful title/menu input, the game starts a looping AI demonstration. Any meaningful input returns to command and is consumed.

## Developer tools

Pause → Dev mode contains invulnerability, refill/revive, hitbox/telegraph overlays, wave and boss-phase previews, individual enemy spawning, single-step, simulation rate, eleven bounded live balance sliders, and reset. Balance changes and cheats mark the run modified, excluding its best score. In Hub, simulation changes are host-only, time controls are disabled, and local menus leave the shared world running.

## Build and verification

From this development folder:

```sh
npm run build
npm run verify
```

The verifier prints failures and one final count. It uses Node's native headless simulation, installed Python Playwright 1.63.0, existing Chromium/WebKit browsers, and unchanged official Hub harness support. The Hub tests own an ephemeral server bound to 127.0.0.1, verify the served game identity, and shut down that server themselves. No external multiplayer service is contacted during tests. To run only checks affected by a change: `node tools/verify.mjs simulation`, `browser`, or `hub`.

The bundle tool writes the named final HTML to the parent folder and an identical development game.html. The root exit-interview.json is the single source for About/Credits metadata and feedback; rebuild after changing it. Research, state contracts, controls, issues and evidence are documented under docs/ and evidence/.

Tests use synthetic pads and phone/tablet profiles, not physical hardware. WebKit emulation is not actual iOS. Audio checks measure rendered signals; listening quality is unknown.
