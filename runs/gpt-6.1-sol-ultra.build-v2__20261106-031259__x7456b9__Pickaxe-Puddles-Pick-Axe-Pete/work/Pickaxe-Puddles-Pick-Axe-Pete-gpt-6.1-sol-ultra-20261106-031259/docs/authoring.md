# Authoring the mine

The demonstration is authored in ordinary JavaScript data; no external editor or generated asset dependency is needed. All gameplay coordinates are world units: x right, z up, y=0. A tile is16units. Native map rows are top-first; `cell` and `set` row indices count from the bottom. `PP.makeLevel` is the only adapter between those conventions, and the geometry test checks every floor row.

## Add a chamber

Add a record to `PP.CHAMBERS` in `src/content/content.js`, with a unique `id`, name, subtitle, tier count, palette, a gap per upper tier, boulder patterns, reward deck and target metadata. `PP.makeRoom` derives floors, permanent main ladders, safe temporary shortcut endpoints and the three symbol-marked doors. Keep gaps tile-aligned and leave both main ladder columns104/456clear. The tests validate every ladder has a landing. The expedition ends after the last data record. Set the last room’s `finale` object to `{ waves: 3, clearsPerWave: 5, keyClears: 4, collisions: 3, timeout: 32 }` (or authored values); omit or disable it on ordinary rooms. Finale conditions and palette ramps are data, so adding a room does not require core simulation changes. Add a sky ramp to `PP.PALETTES` for another palette name.

Door routes select SUN/MOON/STAR speed profiles, original/mirrored/staggered gaps, distinct ore-weight profiles and warm/cool/coral work lights. MOON gold pickups award5; STAR collision bonuses add3. Their IDs are stable references, not screen labels. Safe spawns begin near104,16and have an arrival relief period. Practice and Developer room launchers derive their choices from the same chamber data.

## Add a pattern

Room `patterns` lists ordinary, bounce and heavy family choices. `Sim.directorStep` warns a symbol-marked door, then opens its physical rock lane. `schedulePair(reason)` is a visible two-rock seam opportunity; its deferred reward fallback keeps a supply available when a player chops the other half. New encounter records should use the same public `spawnRock`, `spawnPickup`, `emit` and stable ID helpers, and must not set completion or score in drawing code. Add an authored wave condition next to the existing three extraction bells. The mandatory route remains viable without a tool through permanent ladders and collision seams.

The supply deck, key uniqueness and guaranteed opportunities live in the simulation. If all active miners are unarmed, a replacement seam opens within `recoveryWait` (default8s), then yields its falling pick within a further2.1s. A key expires and another visible seam is guaranteed when the key opportunity condition is met, within18s plus2.1s; after expiry the key wait is preloaded to11s, reducing that delay to7+2.1s. Picks fall to the intake landing and linger. Recovery may require traversal but never requires an intact pick.

## Tuning

`PP.TUNING` defines every live slider’s label, default, minimum, maximum and step. `validTuning` validates/clamps numeric values. Movement/climb/gravity/jump, action timing, director pressure and rescue timing apply on the next tick. Rock speed applies at spawn or redirect; pick capacity applies on replacement; pickup lifetimes apply at spawn. Reset replaces the complete validated defaults object. Tests assert every range and reset. Developer manipulation marks the run before modifying rules, preventing score-record writes.

## Native assets and animation

Read vendored `vendor/engine/docs/ASSETS.md`. `src/view/assets.js` registers palettes, materials, native shapes, hat/weapon hooks and custom poses. Geometry uses native code and palette tones. `src/view/view.js` projects side-view world contacts through renderer actors, keeping held-tool arcs aligned with native Attack wind/active/recovery phases. Generic props use the engine library.

Run `node tools/preview.mjs` to generate the native asset/room preview and open its HTML, or use Pause→Developer→Chambers in the finished game. The preview is a development artifact only; the release embeds everything. Every new asset must provide a silhouette and shape cue beyond color. No bitmap or recorded audio dependency belongs in this pipeline.

## Determinism and events

One owner calls `Sim.step(1/120,intents)`; humans, pads, touch, pilots and online authority share that path. Resolution is traversal/world, action contacts, rock pairs, exposed damage, pickups, door transitions. Native attacks deduplicate stable rock IDs. Rock pair contacts and pickup removal prevent duplicate rewards. `emit` assigns stable epoch/event IDs for audio and effects; drawing never advances a rule.

`snapshot` serializes PRNG state, movement internals, action phases, contacts, roster, supply/director state, key, score and transition state. Restore rebuilds native map and prototypes without generating new events. Keep a mid-jump/mid-ladder continuation case when changing snapshots. Keep network payload bounds and fresh epochs when adding entities.

The title attract director can stage positions and ore; its actions still traverse native action contacts. It never writes records. Ordinary expedition pilots and network tests use genuine input without invulnerability, resource grants or completion shortcuts.
