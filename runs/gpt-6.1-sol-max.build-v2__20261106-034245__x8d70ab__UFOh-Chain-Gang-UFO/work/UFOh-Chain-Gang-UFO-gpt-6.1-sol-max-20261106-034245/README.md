# UFOh Chain Gang

A little saucer. An enormous attitude.

Open the delivered `UFOh-Chain-Gang-UFO-gpt-6.1-sol-max-20261106-034245.html` directly in a browser. It is self-contained and needs no server, installation or sibling assets. The root `exit-interview.json` contains the same source information, implementation feedback and catalogue data as About / Credits.

Shoot to spend your shield. Release fire to recover at half speed. Only the complete ring protects you; ram with it to start a cascade. The white firing bead rotates clockwise toward your aim. The small cross marks your requested aim.

- Controller: left stick or D-pad moves, right stick aims, R2 or Cross fires, Options pauses, Circle backs out. PlayStation glyphs are default; Xbox is in Settings.
- Keyboard / mouse: WASD or arrows move, mouse aims, click or Space fires, Enter confirms, Escape pauses/backs out. Controls can be rebound through the native menu.
- Touch: invisible floating left/right sticks; right aim starts an immediate short burst, then permits shield recovery. Without right aim, safe automatic aim/fire assists. The only persistent control is Menu; Rescue appears when usable. The name wheel also supports touch arrows and Save / Skip.
- Local co-op: select Local co-op, choose keyboard + controller or two controllers, pair with Cross, choose Mission or Score Attack, then launch. Device ownership stays stable. A ready shield touching a wreck revives it with one hull. Both wrecked ends the flight. A disconnected pad pauses; reconnect or use Continue solo.
- AI Hub: protocol-driven 1–2-player shared-world co-op. Hub owns lobby, names, clock and results. This HTML automatically readies and begins after its countdown; no extra room service is used.

The mission has four sectors, fifteen authored encounters, all three ordinary enemy families and a three-phase command craft, followed by extraction and results. A deterministic legal-input first clear takes about ten minutes. Score Attack continues through a seeded escalating deck and recurring command craft until defeat. Mode-specific records and six-character names persist locally; blocked storage leaves play functional.

Pause → Dev Mode opens the unranked Flight Lab: balance sliders, encounter/phase preview, timeline scrub/step, speed controls, invulnerability/refill, spawn/clear, overlays, seed/encounter reset and validated content JSON editing/import/export. Hub offers inspection only. Attract starts after ten idle title seconds and loops an 82-second real-simulation showcase; any intentional input cancels it.

From this development folder:

```sh
npm run build
npm test
```

Build writes `build/game.html` and the required root artifact. Test prints only failures and one count. Coverage subsets: `-- --suite=simulation`, `network`, `browser`, `harness`, `gameplay`, `package`, or `static`. Tests use the workstation's installed Python Playwright 1.63 environment and browser binaries, never install replacements, and bind the official harness server to 127.0.0.1 on an OS-selected port. Each server/browser is closed by its owner.

See [content authoring](docs/content.md), [combat/event contract](docs/rules.md), [research](docs/research.md), [dependencies/licenses](docs/dependencies.md), [network](docs/network.md), [audio](docs/audio.md), [art](docs/art.md), and [verification/issue ledger](docs/testing.md). Evidence and purposeful visual captures are under `artifacts/`.

The upstream my-3D2dge v0.89.1 runtime and released AI Hub client v1.4.0 are unmodified. All game visuals, music, effects and gibberish are original code. Physical controller/mobile hardware, subjective listening quality, and exact original UFO! waveforms remain unknown; automated stand-ins are documented in the evidence.
