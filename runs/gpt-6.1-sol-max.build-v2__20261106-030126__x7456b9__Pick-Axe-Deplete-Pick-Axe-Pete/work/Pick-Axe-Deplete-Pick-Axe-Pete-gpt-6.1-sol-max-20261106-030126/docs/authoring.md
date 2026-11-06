# Authoring another shift

Run `node tools/build.mjs` from the development folder to reproduce the standalone HTML and feedback JSON in the enclosing delivery folder. Run `node tools/verify.mjs` for the quiet release checks. The final HTML has no runtime imports, file requests, CDN dependency or audio files.

## Rooms and routes

`src/content/content.js` is the room/tuning catalogue. Every room declares a unique ID, name, tier count, work quota, palette, boulder families, gaps, props and a teaching line. Coordinates are x-right / z-up; a tile is 16 world units. `floorZ(tier)` is 16 + tier × 48. The content adapter writes top-first map text once; native `cell` and `set` use bottom-first cell rows. `rowFromBottom` is tested explicitly.

To add a chamber, add a ROOM record; the expedition length and practice entries follow the room catalogue. Mark its extraction flag only when it should use the existing machine-wave setpiece. Keep a permanent ladder between every adjacent pair of tiers. Temporary center ladders offer shortcuts, rather than being the only route. Add gaps to upper tiers only; the bottom basin provides safe recovery. Door records are built from the three ROUTES (symbol, color, family, bonus) at three readable landings. Validate content with `PD.validateContent()` or the quiet suite. A route biases the following room's ore family and rewards; it rejoins the same three-chamber expedition.

Work quotas describe decisions, rather than time gates. Chopping adds one work; a genuine collision adds three. The final chamber exposes its key only after all three extraction mechanisms have been primed by actual collisions and the chamber quota is reached. Unarmed miners can still finish because visibly warned crossing-rock opportunities continue without a weapon.

## Patterns and supplies

`PD.PATTERNS` and `PD.EXTRACTION` in the content catalogue are the encounter authoring points. A room references a pattern ID containing its door pool, families, optional introductory stages, pair interval, spawn scale and route bias. Copy a record, change its data, and reference that ID from a room to add a new boulder pattern without editing the simulation. `PD.EXTRACTION` declares each wave’s work threshold, collision tier, participating doors and announcement. The core director interprets this data. A warning record declares a door/family or a crossing pair, a landing tier, delay and optional reward. A warning always precedes a hazard. Native input, attract and remote players all call the same `Mine.step(canonicalIntents, 1/120)` path. Never grant rewards from drawing or an animation callback.

The reward deck is shuffled from the serialized gameplay PRNG. Add a resource to the deck only after implementing its collection and expiry rule in the simulation. Picks descend and linger at the bottom; keys rise by the left shaft. There is at most one loose/carried progression key per team. A missed key and an all-unarmed team schedule another visible collision opportunity within validated recovery bounds. The seeded opportunity and the player's actual chase remain distinct.

## Assets and animation

Use `src/view/assets.js` and the engine's complete `vendor/engine/docs/ASSETS.md`. Register an original `PD:` shape with named material slots; use `E.tones` and native material patterns. Generic crates, barrels, carts and crystals can use the native library. Supply/ore collision radii belong to `Mine`, not a static shape footprint.

For a new item, add the native shape to `PD.ASSETS`, a drawing call to `MineView`, and its meaningful gameplay rule to `Mine` separately. Animated machinery uses native shapes plus queued moving pistons/wheel spokes. Hats and held picks use the Humanoid hat/weapon hooks. Held poses live in the native pose registry; `updateMinerRig` reads authoritative state without mutating it. See `docs/assets.md`, its preview sheets, and the native `tools/asset-sheet.mjs` for preview instructions.

## Scenario launcher and balance

Pause → Developer → Chamber, route & replay previews each room and route. The deterministic scenario replay uses the same ordinary-input Pilot used by the full expedition tests and is visibly marked as a developer shift. It cannot overwrite records. The Developer balance pages expose every `PD.TUNING` value with validation, range, default and application timing. Reset ALL defaults restores the entire definition. Collision/navigation overlays and single-step/quarter-speed execution are available from Hazards & instruments.

Developer grants, live tuning and content launch are disabled in ordinary Hub sessions; its Developer screen shows observations only. Session input/physics authority remains with the host, including a hidden server with no miner of its own.
