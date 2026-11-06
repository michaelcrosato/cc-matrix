# Star Riders

Open the single HTML file in the parent directory in a current browser. An internet connection loads the pinned engine libraries and fonts. WebGPU is the default renderer; Three.js falls back to WebGL 2 if needed. The optional `?webgl=1` URL parameter forces that backend for screenshot capture.

The complete sortie contains six hostile patrol sectors, two repair stations, an asteroid belt and a command-ship finale. Shielded command ships must be attacked within 260 metrons. Destroy nearby patrols to reduce pressure on the stations. Docking restores the fighter and reinforces its station. Command evaluates kills, sector clearance, energy, elapsed time and surviving bases.

Use the Flight Manual in the main menu or pause screen for all controls. Mouse look starts by clicking the flight view or holding the right mouse button. E / L2 tracks a target; photons have predictive aim assistance once locked. Touch pilots use invisible left and right thumb sticks with assisted targeting and automatic photons. Pause contains the galactic chart as well as the Flight Lab with live balance sliders, invulnerability, repair/refuel, clear-sector and mission-completion tools.

After ten seconds without title-screen input, an invulnerable AI demonstration begins. Any input returns to the title.

Online Wing creates a six-letter code. Share it with up to three other pilots, join the wing, and let the leader launch. Ace Chase uses separate, identically seeded campaigns with visible ghost fighters and score rankings. Standalone networking uses PeerJS cloud signaling and browser WebRTC; successful connectivity on every network is unknown. AI Hub sessions use only the Hub transport and its clock, names, seats and results.

Rebuild:

```sh
python3 Star-Riders-Star-Raiders-gpt-6.1-sol-ultra-20261105-224539/build.py
```

Run all automated checks from the parent directory:

```sh
/home/micha/.local/share/pipx/venvs/playwright/bin/python Star-Riders-Star-Raiders-gpt-6.1-sol-ultra-20261105-224539/tests.py
```

The runner prints failures and one count, owns its loopback servers and browser processes, and shuts them down itself. It exercises file loading, WebGPU, exact library versions, menu input, controller mapping, touch, live developer tools, shields and subsystem damage, navigation, docking, real photon collisions, every combat sector and finale, loss conditions, attract mode, procedural audio, a real two-browser online lobby, and three unmodified AI Hub harness scenarios. See `exit-interview.json` beside the HTML for source information and feedback, also embedded in About / Credits.

No build tools or first-party modules are required to share the final HTML. All original geometry, UI, animations, sounds and game code are embedded. External dependencies are pinned CDN imports; the unmodified Hub client is embedded.
