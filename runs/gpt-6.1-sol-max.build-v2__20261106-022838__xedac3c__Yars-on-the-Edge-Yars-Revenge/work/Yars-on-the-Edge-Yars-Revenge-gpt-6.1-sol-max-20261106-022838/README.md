# Yars on the Edge

Small wings. Colossal revenge.

A complete three-sector arcade siege for one or two scouts, inspired by Yars’ Revenge (1982). Open the single HTML file beside this source folder directly in a browser, or open `index.html` here. It works offline; no server, asset directory or CDN is required for standalone play.

## Build and verify

Node 24 is sufficient for the dependency-free build and simulation suite.

```sh
npm run build
npm test
```

The build writes the exact TASK.md artifact name to the parent folder and an identical local `index.html`. It inlines the full engine, procedural bodies/audio/content and game code. The unmodified AI Hub client is the first script after the charset declaration.

The test command prints only failures and a one-line count. Detailed evidence is in `tests/artifacts/`. During iteration, use `npm test -- rules`, `npm test -- campaign`, `npm test -- browser` or `npm test -- network`. The browser groups use the workstation’s existing Python Playwright 1.63 installation and installed Chromium/WebKit; no browsers are installed by the suite. The network group creates its own loopback server on an OS-selected port and shuts it down in `finally`. At most one browser instance is active in each group.

## Fly

- Controller: left stick flies, right stick aims, R2 fires, L2 calls the siege cannon. Cross confirms, Circle backs, Options pauses. PlayStation prompts are default; Xbox symbols are selectable in native Controls.
- Keyboard/mouse: WASD or arrows move, pointer aims, hold left click to fire, right click or Space calls the cannon, Escape pauses. J/Z also fire; keyboard-only aiming follows movement. Rebind gameplay actions in native Controls.
- Touch: invisible left/right thumb regions move and aim/fire. Bite by contact. A single contextual siege action appears when ready; firing gives a short self-hit avoidance nudge. The menu button remains available.
- Local co-op: two controllers, keyboard/mouse plus a controller, or shared keyboard. On a shared keyboard P1 uses WASD/F/G and P2 uses arrows/J/K. Each pad is assigned only once. A solo player can call a second scout from pause, a safe joining moment.

Bite five cells to charge a gun on the left rail. Firing locks your vertical lane: leave it before your own shot arrives. Static protects against guided pursuers and suppresses both weapons. It does not stop a Swirl, a siege shot or its reflection. Touch the docked heart to refill if no cells remain. The final strike must hit the flying heart.

Normal starts with three replacements (four in co-op); Assist adds two, slows pursuit and lengthens Swirl warnings. One hit loses a scout. The reserve is shared. A sector clear restores a lost partner and adds one replacement; airborne interceptions add another, capped at eight.

## Play again, tune or author

Discovered sectors are available in practice. Defeat offers practice retry or a fresh campaign. Solo/co-op and Normal/Assist records are separate. Dev changes, checkpoint retries, custom encounters and attract play never set campaign records.

Pause → Dev workbench exposes live balance, overlays, invulnerability, infinite charge, freeze/single step, time scale, seed, sector/phase jumps, attack preview, threat spawn and restart. The shield loom exports, imports, validates, saves and plays encounter JSON. See [the authoring guide](docs/authoring.md) and [the completed example](docs/encounter-example.json).

An isolated AI demo begins after ten idle seconds on the title or its menus. Any real input returns to title and is consumed. It shows actual combat, including a deliberately staged reflection, and loops through the campaign.

## Online

Launching through AI Hub supplies shared-world online co-op for one or two remote players. The hub owns matchmaking, names, colors, start, fullscreen and results. Standalone play offers solo/local co-op. No standalone invite service is invented.

The host owns every simulation step, collision, reward and outcome. Clients send quantized action frames and retry siege edges until acknowledged. Full compact snapshots recover cell masks and phases. Local flight is predicted; remote bodies interpolate. Input and snapshots run at ten messages per second, with recovery packets sharing that schedule. Unreliable packets stay at or below 1,180 bytes; larger snapshots are reliable and all remain below the 16 KB protocol limit. A server-only host simulates without an avatar or rendering loop. The local online menu leaves the shared world running. End disposes input/audio/ticks and leaves the canvas image inert.

The suite vendors the official harness. Two-player stress cases use 150 ms latency, 50 ms jitter and 5% loss, including departures, hidden-host cancellation, time-up and authoritative validation. A full ordinary-action campaign runs at baseline latency with one remote client, a server-only host and client drawing stopped; complete solo and simultaneous co-op campaigns also run through the deterministic simulation. `vendor/provenance.json` records exact upstream revisions. The engine has one documented boot-flag fix, in `vendor/engine/boot-false.patch`; the session client is pristine.

## Provenance and limits

Read [the linked research ledger](docs/research.md). All source-defining bodies, effects, animation, writing, music, effects and gibberish voices are original code. No recorded media, source ROM or external font is embedded. Generic distant crystals/rocks use the engine’s retained core shapes.

Physical controllers, touch hardware, iOS devices, a TV and a human listening panel were unavailable. Tests use standard-mapping controller stubs, Chromium CDP multitouch, phone/tablet profiles, WebKit, 1920×1080 screenshots and Web Audio analysis. Novice completion time and subjective audio quality are unknown. A deterministic pilot’s completion time demonstrates playability, not an 8–12 minute novice pacing measurement.

Required source information and feedback are in the in-game About/Credits and the parent `exit-interview.json`. Usage is **added on import**.
