# Dead Sea Sigh

Open the HTML file beside this folder in a modern browser. It is self-contained and works from `file://`; no server, CDN, installation or network connection is needed for the campaign or solo Salvage Rights.

A ruined lung, two interchangeable armies, and a country without its sea. Fire spreads with the wind and stays on the ground. Guns wear, jam and break. Friends rescue you and can die permanently. The campaign runs from a roadside ambush to three playable endings at the Sill. Salvage Rights is a six-minute diamond-banking match with three AI rivals, or 1–4 players through AI Hub.

## Controls

Use a standard controller (DualSense glyphs by default; Xbox option in Settings) or keyboard and mouse. Touch-only devices show a controller-required notice and offer Settings.

- WASD / left stick: move; mouse / right stick: look. Click the game to capture the mouse.
- Left / right click or R2 / L2: fire / aim. Space / Cross: jump, vault and climb.
- E / Square: interact, enter or exit vehicles. R / Square with nothing to use: reload / clear jam.
- Q / Triangle: next weapon; 1–3 select slots. V / R3: machete. F / L1: fire bottle. G / R1: grenade.
- M / D-pad up: held map; N / right: locator; B / left: monocular.
- H / D-pad down: tap for a syrette or surgery, hold for an ampoule.
- In a vehicle: W/S or R2/L2 accelerate/brake; A/D or stick steers; Tab/Triangle changes a technical's seat; L toggles radio.
- Escape / Options: pause. Dev mode opens from pause; its sliders change the running world. About contains source and testing feedback.

On the map, look input moves the pencil. Click or Cross pins a waypoint; wheel or triggers zoom. Read cards with E, Cross or click. The title starts an eight-scene demonstration after ten seconds idle, including while Settings is open; any input returns to the title.

## Development

Run these commands from this folder:

```sh
node build.mjs
python3 test/run.py
```

The test command prints failures and one count, and writes detailed reports and inspected screenshots under `test/`. Optional `--suite core`, `story`, `browser`, `hub`, or `gpu` runs a relevant subset after changing that system. Browsers run sequentially; the hub uses its own loopback server on an OS-assigned port and stops only that process.

Numbered `src/` modules are concatenated and bundled by esbuild. Sites, roads, weapons, mercenaries, vehicles, contracts, dialogue, barks, radio and shop descriptions are plain tables in `05-data.js` and `06-story.js`. Add content there and reuse the systems. `ENGINE-CHANGES.md` records the small engine customization. `test/ISSUES.md` records defects found and corrected.

No physical controller, iOS Safari or human audio listening was available. Controller tests use a standard-pad stand-in, mobile browser checks use emulation and WebKit, and generated audio is checked through OfflineAudioContext. Firefox simulation is checked; Firefox has no rendered WebGL context in this headless environment. Chromium and WebKit exercise the renderer.
