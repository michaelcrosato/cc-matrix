# The Empire Bites Frost

An original three-wave arcade flight and generator-defense game inspired by the 1982 Atari 2600 game **Star Wars: The Empire Strikes Back**. The title was selected from 50 original candidates using Node's cryptographic random-number generator; `selection.json` records the draw.

Open the adjacent, self-contained HTML file in a current browser. The pinned Three.js and Rapier libraries and the display font download from CDNs. WebGPU is preferred; Three.js can use WebGL 2 where WebGPU is unavailable. An internet connection is needed for these dependencies. No media files are loaded.

## Play

Defend the generator through three timed waves of walkers and reinforcements. Each cleared wave evacuates a transport. Choose a field upgrade between waves; destroy the final siege walker to complete the sortie. Losing the generator or the entire reserve fleet ends the mission.

- **Keyboard and mouse:** WASD or arrows fly, mouse aims, left mouse or Space fires, Shift boosts, E activates charged resonance, Escape pauses. Mouse hover selects menu focus; Enter activates it.
- **Standard controller:** left stick flies, right stick aims, R2/RT fires, L2/LT boosts, Square/X activates resonance, Options/Menu pauses. D-pad and Cross/A navigate menus; Circle/B goes back. Settings switch PlayStation and Xbox prompts.
- **Touch:** drag anywhere on the left half to fly; drag on the right half to aim. Weapons fire automatically and aim assistance selects nearby enemies. A full drag boosts; the resonance button appears when charged. The pause button stays visible.

An amber flashing hatch is a lethal weak point on ordinary walkers. Resonance clears hostile fire, exposes nearby hatches and protects the craft for five seconds. Settle low over the cyan pad at the western base to restore shields. Homing bombs can be shot down.

The title screen starts an AI-controlled, looping demonstration after ten idle seconds. Any input returns to the title. Pause → Developer tools provides live balance sliders, invulnerability, an AI pilot, shield/resonance restoration, wave clearing and a final-wave jump.

## Co-op

AI Hub supplies the shared-world session automatically using its unmodified inline Session Protocol v1 client. The authority simulates Rapier and combat; both pilots send controls and receive snapshots. The official harness is included under `hub/` for integration verification.

Standalone **Nearby tabs** uses a shared flight code and BroadcastChannel. Open two copies under the same origin, host one and join the other, then launch together. File origins vary by browser; a local HTTP server provides a consistent origin.

Standalone **Across the stars** uses direct WebRTC. The host creates a connection card and sends it to the guest. The guest pastes it, chooses Reply to card, and sends the resulting reply to the host. The host pastes that reply and chooses Accept reply, then launches. There is a public STUN service but no TURN relay; connectivity through restrictive networks is unknown. The game has been tested using two browser pages on this workstation.

## Build and verify

From this folder:

```sh
node build.mjs
./run-tests.sh
```

The build inlines all game modules, CSS, report metadata and the unmodified Hub session client into the root HTML. Dependencies remain pinned CDN imports. The test command prints failures and a single final count; detailed reports are saved as JSON. Tests use the installed Playwright Python environment, run WebGPU state checks and a full scripted sortie, emulate controllers and touch, analyze synthesized audio, and exercise two-page transports and the official Hub harness. Any HTTP test server binds only `127.0.0.1` on an operating-system-assigned port and is closed afterward.

`research.md` records the primary source research. `exit-interview.json` beside the HTML is the catalogue/import report and is embedded in the game's About/Credits screens.
