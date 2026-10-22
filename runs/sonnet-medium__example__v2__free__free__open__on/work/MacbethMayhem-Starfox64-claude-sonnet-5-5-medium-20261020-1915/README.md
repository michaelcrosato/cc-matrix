# Macbeth Mayhem — dev notes

Deliverable: `../MacbethMayhem-Starfox64-claude-sonnet-5-5-medium-20261020-1915.html` (single file, produced by `python3 build.py`).
Libraries load from jsDelivr (Three.js r180 `three/webgpu`, Rapier 0.19.3 compat). WebGPU only, no fallback.

## Layout
| file | contents |
|---|---|
| `src/01_core.js` | utils, settings/save, `Input` (keyboard + Gamepad API, invert toggles, rumble), Web Audio synth + music sequencer |
| `src/02_gfx.js` | renderer, sky/theme, cel-shading materials + ink outlines, procedural `MODELS`, `FX` particles, `Dust`, `DecorBatch` |
| `src/03_phys.js` | Rapier wrapper (`Phys`), base `Ent`, rigid-body `Debris`, projectiles (`Bullets`), shared world state `W` |
| `src/04_data.js` | characters, wing squad, **data-driven stages** (`STAGES`, `E.*` event helpers), tutorial hints |
| `src/05_rail.js` | `RailPath`, enemy specs + AI, obstacles, pickups, player ship, wingmen, boss |
| `src/06_stage_rail.js` | `RailStage`: environment, event spawner, forks/routes, camera, attract-mode autopilot |
| `src/07_ui.js` | DOM HUD, comms/portraits, banners, menu/focus system |
| `src/08_stage_range.js` | all-range flight, dogfight AI, carrier, generators, core |
| `src/09_game.js` | state machine, title scene, screens, attract mode, dev tools |
| `about.md` | Source Information / Engine Feedback / Prompt Feedback (feeds the HTML comment and the About screen) |

## Adding content (designer workflow)
* **Stage events** live in `STAGES.rail.events` (`04_data.js`). `at` is distance along the rail. Helpers: `E.wave(at, kind, n, form, x, y, opts)`, `E.turret`, `E.obstacle`, `E.ring`, `E.crate`, `E.chase`, `E.train`, `E.say`, `E.hint`, `E.checkpoint`, `E.mid`, `E.boss`, `E.fork`. Wrap events in `routeA([...])` / `routeB([...])` for branch-only content.
* **Enemies**: add an entry to `ESPEC` (model builder, hp, radius, score) and an AI function in `AI` (`05_rail.js`).
* **Models** are procedural functions in `MODELS` (`02_gfx.js`); parts that need animation are returned in `userData.parts`.
* **Music** tracks are step patterns in `MUSIC` (`01_core.js`).
* **Dev tools** (press F3 in game): `1-5` spawn enemies, `I` god mode, `C` Rapier collider debug render, `N` skip ahead, `B` jump to boss, `K` kill all, `H` refill, `R` restart stage.
