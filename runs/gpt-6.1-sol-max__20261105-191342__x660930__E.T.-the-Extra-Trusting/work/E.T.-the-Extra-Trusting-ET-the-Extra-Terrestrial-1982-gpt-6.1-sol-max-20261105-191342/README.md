# E.T. the Extra-Trusting

The way home begins with a friend.

Open the single HTML file in the parent folder in a current WebGPU-capable browser. The complete game, art, physics WASM, music, effects, voices, and libraries are embedded. Solo play needs no downloads or server. A WebGL 2 fallback is available when WebGPU is unavailable.

A complete adventure: borrow three transmitter parts, slip past searchlights, distract searchers with physical candy, hide in ferns, restore a living bridge and three flowers, match a three-note signal, pedal through six rings of starlight, and share a farewell. Rescues keep your collected parts. Checkpoints save automatically. After the ending, take a free ride or return to the title.

- Standard controller: left stick ride, right stick orbit/tilt, Cross interact, Square glow, Circle candy, R2 pedal harder, L2 hush, Triangle map, Options pause. Settings also provides Xbox glyphs.
- Keyboard: WASD/arrows ride, E interact, Q glow, F candy, Space pedal harder, Shift hush, Tab map, Esc pause. Click the world to ride/interact; right-drag to orbit/tilt; wheel to zoom.
- Touch: invisible left thumb stick; tap on the right to help; double-tap to glow; context button appears when useful. Pickup and tuning assistance are enabled. Use the small pause button for menus and the map.

Pause → Developer’s workbench provides seven live balance sliders, reset to defaults, invincibility, collision lines, refills, objective teleport, transmitter/flight chapter skips, and restart. In a Hub session, restarting the round is disabled. The title begins an autonomous looping tour after ten seconds; any input returns to the menu.

## Together

AI Hub Session Protocol v1 is integrated as an authoritative 1–4 player shared world. The unmodified 1.4.0 client is the first script in the HTML. Hub rounds skip the title, wait for the shared clock, support a server with no player, handle departures, report team standings at victory or time-up, and stop on end.

Outside the Hub, choose Ride together → Make a room. Share the six-letter code with a friend who opens the same game and selects Join a friend. Rooms use PeerJS WebRTC signaling for remote connections and BroadcastChannel for same-browser tabs on the same origin. The public PeerJS service is required for internet signaling. The host runs the simulation; visitors send controls. Clean host departure or heartbeat timeout preserves a guest’s checkpoint in solo play.

## Build and verify

From this folder:

```sh
npm run build
npm test --silent
```

Building uses the installed Bun bundler and the exact versions in package-lock.json. The build writes both game.html here and the requested standalone HTML beside this folder. Runtime dependencies are bundled, including Rapier’s WASM. Third-party license texts are embedded in the HTML and saved in LICENSES.txt.

The quiet test command prints failures and one final count. It starts a temporary loopback server on an OS-selected port, checks the actual game title, uses one Chromium browser, and closes its own server and browser. It tests a complete journey using the real Rapier simulation, rescues, stealth, flowers, timing, flight and ending, save/continue, attract mode, keyboard, standard gamepad stubs, touch, developer tools, settings, generated audio, standalone co-op and the four official Hub harness scenarios. It records test-results.json and the harness reports.

For visual review, append `-- --visual` to the npm test command. This also saves six 1920×1080 screenshots. Only these diagnostic captures use Three’s WebGL backend because software WebGPU screenshots can stall. Behavior and Hub checks use WebGPU. `-- --group journey`, `interface`, `network`, or `hub` selects an affected group for a rerun.

Source information and all exit-interview answers are in the game’s About screen, credits.json, and the root exit-interview.json. No internet source research was done; only the requested Hub integration files and pinned dependency packages were fetched.
