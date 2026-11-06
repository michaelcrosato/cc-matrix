# Pickaxe Puddles

One last, spectacularly bad idea. A complete three-chamber arcade platformer inspired by Pick Axe Pete (1982): chop ore, redirect rocks into rocks, chase falling picks and rising keys, and choose a gate into the next mine. The Motherlode ends in a three-bell extraction.

Open the single HTML in the parent directory directly in a browser. No server, installation, downloaded assets or CDN is needed for standalone play. A browser gesture enables coded audio.

## Controls

| Action | Keyboard / mouse | Standard pad |
| --- | --- | --- |
| Move / climb | A/D, W/S or arrows | Left stick / D-pad |
| Jump | Space | Cross / A |
| Chop, hold to repeat | J / left click | Square / X |
| Redirect, aim high or low | Q / right click, Up/Down or pointer | R2, stick aim |
| Duck | S / Down | Down / Circle |
| Door / hold to rescue | E / in-range world click | Triangle / Y |
| Pause / back | Escape | Options / Circle |

Touch: invisible left thumb movement/climb, right tap jump, assisted chop, and contextual redirect/door/rescue bubble. On narrow portrait displays the camera follows your miner, with advance edge warnings for hazards and resources.

Solo is complete. Local co-op supports two simultaneous miners, keyboard/mouse plus a pad or separate pads. Select Local co-op; a free pad joins with Options during the first eight seconds of a chamber. Online co-op runs in AI Hub shared-world sessions and uses Hub’s own lifecycle and deadline.

## Reproduce

From this directory:

```sh
node tools/build.mjs
node tools/verify.mjs
```

The build reads the parent `build-config.json` and `exit-interview.json`; the latter is also the in-game About model. Verification prints failures only, then a one-line passing count. It uses the installed Playwright 1.63 environment and existing browsers, serves the official Hub harness on an owned OS-selected localhost port, and closes its own resources. Evidence lives in `evidence/`.

## Development

- `src/content`: room definitions, route variants, tuning schema and the native map adapter.
- `src/sim`: renderer-independent fixed-tick mine rules, canonical scripted pilot and snapshots.
- `src/input`, `src/audio`: native input/rebinding and original coded instruments, sounds and syllables.
- `src/view`: native shapes, rigs, poses and room rendering.
- `src/net`: authoritative Hub protocol, prediction and lifecycle.
- `src/main.js`: screen flow, HUD, checkpoints, developer panels and attract lifecycle.
- `docs/authoring.md`: adding rooms, patterns and native assets.
- `docs/testing.md`: coverage, known verification limits and unique defect ledger.

Developer tools are reachable through Pause. Use paged large controls to grant supplies, choose rooms, inspect topology, replay a seed, slow/step the simulation or tune all key rules. Developer runs do not write ordinary records. Hub Developer panels are observational.
