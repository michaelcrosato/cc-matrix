# Californium Games

An original California Games (1988) inspired arcade festival: half-pipe skating, surfing, and BMX. Three one-minute heats, practice sessions, medals, persistent personal bests, and 1–4 rider hotseat competition.

Open the HTML file in the parent folder in a current browser. Internet is needed for the pinned Three.js and Rapier dependencies and optional web fonts. WebGPU is preferred; Three.js provides its WebGL2 fallback. `?renderer=webgl` explicitly selects that fallback for screenshot inspection.

## Controls

- Move / carve / pedal: left stick, A/D, or arrow keys.
- Pump: stick down, S, or down arrow.
- Pop: Cross / A / Space / left click.
- Grab or cutback: Square / X / J / right click.
- Flip or barspin: Circle / B / K / middle click.
- Pause: Options / Menu / Escape.
- Menus: stick or D-pad, Cross / A / Enter to select, Circle / B / Escape to return. Hover and click work too.
- Touch: drag anywhere in the playfield to steer; tap or the context-sensitive POP button to jump. Aerial grabs, forgiving landings, and cone hops are assisted. The menu button remains available.

Idle menus start a full festival attract replay after ten seconds. Any input returns to the title.

## Multiplayer

Couch Crew takes turns on the same device. Use the small plus button to choose 2–4 riders.

Online Rooms creates a six-character code for up to four independent devices. The host shares the code and starts the festival. Starts are synchronized; live standings update throughout. Public PeerJS signaling and browser WebRTC carry room traffic. A room depends on network reachability and the signaling service.

The HTML embeds the unmodified AI Hub session client 1.4.0 and declares Session Protocol v1 parallel mode for 1–4 players. Hub rounds skip menus, use the Hub clock, report progress and results, and stop sound/input at the end. Standalone networking is never used in a Hub session.

## Developer tools

Pause → Dev Workshop exposes ride speed, gravity, pop strength, landing assist, heat duration, and simulation rate, with reset defaults. Auto Rider, infinite time, restart heat, next sport, score injection, and physics diagnostics support quick iteration. Competitive online sessions keep tuning closed.

Edit `main.js` for event rules and UI, `art.js` for procedural geometry and native animation clips, `audio.js` for synthesis, `network.js` for standalone rooms, and `style.css` / `template.html` for presentation. Event descriptions/medal goals and tuning defaults are near the top of `main.js`. Track geometry uses simple dimensions in `art.js` mirrored by the ground profile in `main.js`.

Build the single-file deliverable:

```sh
python3 ./Californium-Games-California-Games-gpt-6.1-sol-ultra-20261105-212540/build.py
```

From the parent folder, run all deterministic browser and network checks with one command:

```sh
./Californium-Games-California-Games-gpt-6.1-sol-ultra-20261105-212540/test.sh
```

Add `--online` for the real two-page public room test and `--visual` to save title/sport screenshots using WebGL2. `test.sh --package-only` verifies the standalone file URL and embedded metadata. Final validation: 105 gameplay/input/audio/network checks plus 10 package checks; zero failures. The runner starts its own loopback server on an OS-assigned port, closes browsers and server, and prints only failures and a one-line count. The suite covers three-event completion, scores, combos, hotseat handoff, pause, live tuning, controller stubs, glyphs, touch, attract replay loops, audio rendering, simulated rooms, and the official Hub harness (2 and 4 players, delay/loss, and host leaving). Report JSON files remain beside the development sources.

No source research or web search was used. The supplied Hub implementation contract and pinned runtime dependencies were downloaded. All art, animation, voices, effects, and music are made in code; no California Games assets are included.
