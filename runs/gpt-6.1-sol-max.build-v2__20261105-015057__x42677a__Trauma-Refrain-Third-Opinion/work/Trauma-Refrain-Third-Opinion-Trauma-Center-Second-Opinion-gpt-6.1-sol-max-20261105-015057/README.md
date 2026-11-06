# Trauma Refrain: Third Opinion

An original surgical-action drama built on the Pavilion engine. Eight campaign cases follow Mara Quill and Pet Nwosu through Mercy Harbor's Night Ward. All eight instruments, four parasite movements, the Hush, Echo, Duet and cardiac resuscitation are playable. Code Blue is a four-minute survival round for one to four local or AI Hub surgeons.

Open the HTML beside this directory in Chrome or Edge, from disk or a normal static host. It includes the WASM engine, all content, its font and the unmodified AI Hub session client. WebGPU is required for the 3D theatre. WebKit displays a clear requirement notice; its mobile UI remains usable. Touch-only devices show “Controller or keyboard required”; settings and the automatic demonstration remain available.

Controls: mouse or right stick aims; hold left click, E, R2 or Cross to operate; digits 1–8, wheel or a left-stick flick selects an instrument. WASD/arrows move the cursor without a mouse; Shift/L2 enables precision. Space/Triangle charges a gift; release on the heartbeat. Tab/Square opens the patient chart. Both mouse buttons, Shift+E or L2+R2 charge the defibrillator during Code; release on the ghost beat. Wheel or L1/R1 rotates a held bone. Esc/Options pauses. Additional standard-mapped controllers join with Cross. Xbox glyphs are selectable.

Every instrument has a gesture: trace incisions, pull hooks along their axes, zigzag sutures along the advancing needle, suction pools, release the laser at 75–108%, paint gel, scan hidden objects, and release an IV dose in its mint band. In Cases 6 and 7 the Cryoprobe replaces an instrument, as labelled. Closure automatically selects Dressing. The early cases teach these gestures on the field.

Build: `./tools/build.sh`. This uses Rust 1.98.1, its wasm32 target and wasm-bindgen 0.2.129 already installed here. It creates the exact root deliverable and refreshes the harness copy. `tools/bundle.py` repacks changed HTML/CSS/JS or metadata without recompiling Rust.

Verify: `python3 tests/run_all.py`. Subsets: `--rust`, `--web`, `--hub`. The runner captures routine logs and prints only failures plus a one-line count. Browser logic tests run the real WASM simulation with drawing disabled; separate actual WebGPU captures verify art. `tests/visuals.py` creates the TV-size screenshots. `tests/out` contains the test evidence. No physical controller, second human, real iOS Safari or listening test was available.

Pause → Dev mode exposes live tuning, a bot, checkpoints, snapshots, rewind, phase/case jumps, hazard spawning and visual overlays. Content edits are documented in `engine/crates/pav_core/src/games/surgery/content/README.md`.

Architecture: `pav_core` owns deterministic surgical state and replayable four-seat input. `pav_view` draws original 3D tissue, instruments, organisms and extruded paper actors through Pavilion's renderer and procedural animation. `pav_surgery` is the dedicated wasm product host; `web` supplies the controller-first shell, save format, synthesized Web Audio and AI Hub bridge. Cases and story are editable JSON. No image, model or audio files are used. Font: Barlow Condensed Semibold, SIL OFL 1.1 (licence in `vendor`). Pavilion's licence is unknown: no licence file was supplied in the source checkout.

The final About block is generated from the root `exit-interview.json`. Usage stays “added on import” for the catalogue importer.
