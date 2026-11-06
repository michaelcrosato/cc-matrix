# Authoring the climb

Run `npm run --silent verify` from this directory. It validates content and runs deterministic rule, route, packaged browser/device/audio and AI Hub checks. `npm run --silent build` writes the one shipping HTML to the workspace root, using the required basename in `content/tower.js`.

Edit the `definitions` array in `content/tower.js`. Each entry is one composition; the last has a `finale` object. The generated schema is deliberately plain JavaScript data, so no editor or engine changes are needed to replace a room or insert another section before the finale.

- Give the section a unique `id`, readable `name`, facade limits `x0/x1`, `spawn`, and `goal`. Ledges are one-way native PlatformMap surfaces; the collision span uses an exact 8-unit grid. Put the spawn inside that grid, not at its decorative overhang.
- Floors start at z=16, spaced by 48. A normal held jump rises 20.83 units. Changing those dimensions requires revalidating the whole composition; ordinary content work keeps them.
- Each row of `windows` has exactly two x anchors and connects one floor to the next. Four rows make a normal section; three make this rooftop. `offsets` phase each floor's clock. Stable IDs are generated as SECTION-wFLOOR-SLOT.
- A slot cycles opening (.65 s), open (5.4 s by default), warning (1.4 s), closing (.45 s), and gap (1.3 s). Only its selected slot is usable. The alternate slot then takes its turn. Climbing takes .7 s; release holds, down reverses. The native E.Action owns the body until exit or shutter failure.
- `lanes` contains each floor's authored encounters. `kind` is rolling, bumper, split, rat, bird, or bat. Set `delay`, signed `dir`, and positive `speed`. Bumper encounters name a valid bumper ID. Split encounters give `breakX`. All arrivals telegraph before collision.
- Bumpers reverse first, then drop one lane on the next edge contact. Splits produce two opposed fragments. Birds have high edge pockets and a low middle; bats wind up and swoop on a 3.4 s rhythm. Their smaller collision cores allow readable jumps while retaining expressive art.
- `hearts` lists the assisted floors. Mabel throws along a 2.2 s path to the first anchor. A pickup empowers both climbers for six seconds. The rooftop retires an old lower throw after eight seconds and offers a new reachable one on the reached ledge, reusing its award ID.
- Pressure repeats taught patterns at bounded 14 s intervals. Repeated instances share an award ID, so staying put never farms score. The `hard` object reverses window order, changes phase offsets, and adds one authored companion hazard; it does not multiply every speed.
- The final section declares `finale: { beats: 3, heartFloor: 2, rescueFloor: 3 }`. Its first two retreats expose windows; a final powered approach to `goal` commits rescue. Nine seconds of laundry-bound Hank, plane pickup and departure follow before results.
- `banner`, `lessons`, colors, trim and sky are presentation data. Keep lessons brief enough to read while moving.

`FF.validate()` rejects duplicate IDs, missing per-floor routes, broken bumper links, bad endpoints, invalid timings and invalid finale/replay links. Tests additionally prove controller reach, all hazard responses and complete normal-intention routes. The route driver is a semantic pilot using the same intentions as players; it cannot teleport, grant power or award objectives. Dev warps and invulnerability are separate, unranked tools.

# Architecture and persistence

`src/simulation.js` owns every rule, timer, collision, pickup, chance, award and objective. Native E.Platformer owns locomotion. Custom E.Action ffWindow owns traversal exclusively. Native overlapBox is sampled across relative motion to prevent fast hazards tunnelling. `src/presentation.js` reads simulation; drawing consumes no gameplay random values or clocks. Audio and visual effects consume monotonic event IDs. All custom visuals and sounds are code; the shipped file fetches no adjacent assets.

The score table is 50 per heart/unique powered clear, 100 per pursuit, 500 rescue, 75 clean-section bonus and 50 teamwork bonus. The checkpoint serializes the award ledger and score totals. Retry restores its baseline and marks the run continued. Clean and continued bests, including separate harder-encore keys, use versioned game-specific storage. Attract cannot write records or checkpoints; balance/cheat runs are unranked. Invalid or blocked storage falls back to playable defaults.

`src/network.js` is a host-authoritative AI Hub adapter. It runs unchanged on a non-playing server. One scheduler sends at 12 Hz; acknowledged jump/climb counters survive loss. Snapshots reject stale ticks; clients replay bounded unacknowledged movement and extrapolate hazards using the same update code without collision or awards. Reliable transition snapshots carry the award ledger and checkpoint baseline. Local menus send neutral input while the Hub world continues. Only the host can finish, after departure, or promptly on time-up using committed rescue truth. End stops input, sends and sound. No matchmaking, external sockets, chat, migration or reconnect behavior is advertised.

# Dependency provenance

- my-3D2dge full handoff v0.89.1, commit 8ecc2f62353761187bdfe226f327b7ea5d2eb691; MIT; Michael Crosato.
- AI Hub protocol 1, unmodified session client 1.4.0, commit 35a1047f2067b2af3de3943f0fe452f39105d869. The client is the first script immediately after charset. Pristine harness/bridge/round files retain their relative imports.
- No engine source changes. Game-specific registries, input-instance presentation hooks and Shell styling extend the native API.

# Play and diagnostics

Open the root HTML directly. Local co-op takes two pads or keyboard plus one pad. Standard pad mapping uses stick/d-pad and Cross; Options pauses. Keyboard uses WASD/arrows, Space and Escape. Click a nearby usable window for ordinary alignment and ascent. Touch uses an invisible left stick, right-half jump and a contextual native-action button; auto-jump is optional.

Pause → Dev Mode exposes real balance sliders, reset, section warps, invulnerability, bot, slow motion, single-step, hitboxes/anchors and all six hazard spawns. Hub sessions expose inspection only. `__game.debug.snapshot()` is read-only semantic evidence in every mode; construction/warp/advance shortcuts are not exposed by that interface in Hub.

Evidence lives in `artifacts/`: validator/rules/network/browser reports, full-route states, Hub conformance/rescue records, selected compositions and motion strips. Device checks are emulation, not physical hardware tests. Sound is measured numerically; human listening and first-player seven-to-nine-minute pacing are unknown. The semantic clean pilot is intentionally much faster than the learning target.

The Games Database 30.2-second emulator capture was downloaded for research and inspected at five-second intervals (see `artifacts/source-motion.png`). It confirms the four-floor composition, small cap-wearing climber, conspicuous shutter apertures, rolling/falling stones, heart color change and overview plane. Source capture: https://www.gamesdatabase.org/Media/SYSTEM/Mattel_Intellivision/Video/Formated/Beauty_And_The_Beast___Imagic.mp4 . It is reference material only and is not embedded in the game. Human listening and the original melody remain unknown.
