# Game direction and production plan

## 1. Mandate for the builder

Build an original, finished game inspired by **B-17 Bomber (Intellivision, 1982)**. The central pleasure is keeping one vulnerable bomber and its crew working through a dangerous sortie: choose a route, fly it, answer an offscreen warning, defend the correct side, hold a bombing run, and bring the aircraft home. Make the player feel responsible for the whole aircraft.

You choose the title. Follow your own brief’s instruction to silently generate 50 playful riffs on the source name and select one with an actual random-number generator. This plan supplies no candidate or working title. Resolve the development-directory name, final artifact names, metadata and required output destinations from your own brief. **Every project path below is relative to that development directory.** Remote repository paths refer only to the linked upstream sources.

This plan targets gpt-6.1-sol at ultra effort with the supplied 1.05M context window. Use that capacity to hold the engine contracts, source research, complete game state, input mappings, network rules and acceptance scenarios together. Build an integrated vertical slice with proper tools and evidence. Do not reduce it to a flyover, a single shooting gallery, or a menu-heavy mockup. Equally, do not turn capacity into a sprawling campaign: spend it on coupled systems, readable decisions, authored encounters, art, animation and finishing.

The CEO brief remains authoritative. This document makes creative and implementation decisions within it; it does not replace its exact delivery instructions or feedback schema. Planning is complete when the build can proceed autonomously. Building is complete only when the actual packaged game passes the acceptance gates below.

## 2. Research basis and interpretation

The [preserved original instructions](https://history.blueskyrangers.com/instructions/b17bomber.html) establish the distinctive loop: select and preview map targets, trade fuel for bombs, pilot, switch among four clock-face guns and a downward bombsight, then return to England to repair, refuel and rearm. Crew reports supply tactical information. Damage can disable a gun or degrade the sight; evasive flying reduces flak risk. These are the adaptation’s anchors.

The [developers’ history](https://history.blueskyrangers.com/mattelelectronics/games/b17bomber.html) emphasizes changing crew roles and functional radio chatter. The [preserved screenshots](https://www.intvfunhouse.com/games/b17b.php) show legible map silhouettes, strong land/water contrast and simple aiming graphics. Translate that clarity into the engine’s native visual language. The original audio’s detailed timbres and music were not directly audited during planning; describe the new score and synthesis as original work, not verified reproductions.

Everything below is a new design choice. Read the primary sources yourself before implementation, retain a concise evidence record in `./docs/research.md`, and record any correction that changes the design. Credit the inspiration without implying affiliation. Do not copy original art, recordings or dialogue performances.

**Genre:** arcade flight action with light mission planning and station-based shooting. **Perspective:** first-person pilot and gun stations, downward bombsight, and a clean overhead operational map. Brief exterior shots establish the aircraft and show consequences. The main play stays inside the crew’s jobs.

**Design pillars:**

1. **One aircraft, several urgent jobs.** Navigation, defense and bombing interact through the same heading, speed, altitude, payload, fuel and damage.
2. **Information becomes action.** A clock bearing, sight solution or fuel warning makes the player change what they do.
3. **Commit, then recover.** A steady bomb run exposes the bomber; an accurate strike is only half the mission.
4. **Readable from the couch.** Large threats, strong silhouettes, concise radio captions and a small number of immediate choices.
5. **A capable crew, an important player.** Assistance makes switching jobs viable while leaving useful decisions and demanding moments for humans.

## 3. The complete demo

Ship one replayable operation lasting roughly **10–12 active minutes**, with an authored first run and seeded variations thereafter. Compress travel distance rather than removing flight decisions. Build one coherent Channel-and-coast operating area: home airfield, sea crossing, defended coastline, harbor/shipyard primary objective, and an optional inland refinery. A coastal battery is an optional tactical target. All target names and crew identities are yours to write.

The required mission objective is achievable with every offered loadout. Optional destruction raises score or changes risk; it never supplies fuel or ammunition required to finish. The primary route demonstrates navigation, flight, all four threat bearings over the operation, flak evasion, bombing, resource management and recovery. Optional locations reuse these mechanics rather than hiding exclusive features.

| Beat | Player experience | Required implementation |
| --- | --- | --- |
| Brief and prepare | Preview the military target, compare a direct defended route with a safer dogleg, choose payload and see estimated return reserve. | Interactive map, target preview, three viable payload presets, concise objective and controls. |
| Launch and climb | Increase power, lift off with assistance, learn bank/pitch and course hold. | Controllable takeoff, forgiving stall warning, readable gauges and a short skip-able exterior reveal. |
| Cross and intercept | A bearing call interrupts navigation; move to the matching gun and break an attack. | Spatial fighter passes, directional stations, lead aiming, ammunition and AI pilot handover. |
| Coast and flak | Read a barrage, alter course or altitude, decide whether to spend bombs on the battery. | Telegraphs, real danger volumes, evasion, optional battery suppression. |
| Primary bomb run | Stabilize, compensate for drift, release a finite salvo, see impact and objective change. | Shared flight/bomb ballistics, target components, score and unmistakable strike feedback. |
| Decision and return | Choose another pass, optional refinery, or home based on reserves and damage. | Route revision, resource forecasts, secondary interception and valid abort. |
| Recover and debrief | Reach the home approach, see assisted landing, assess results, repair and rearm. | Safe recovery gate, success/partial/failure outcomes, transparent scoring and replay. |

Trigger encounters by location, route progress and objective state. Timestamps are only pacing safeguards. A player who circles, turns back or approaches from another direction must remain in a coherent mission. Add a pressure ceiling so a long diversion cannot stack every encounter at once.

The harbor strike should have a memorable composition: water, cranes, warehouses, a military ship and visible flak positions; approaching fighters cross the glass while the target drifts into the sight. Return should visibly contrast with launch through the aircraft’s condition and exhausted resources, rather than requiring unavoidable scripted damage.

Provide three difficulty presets affecting enemy accuracy, fuel margin and assistance. Default is approachable but requires a deliberate bomb release and at least one defensive response. Do not add a campaign economy, technology tree, additional playable aircraft or unrelated boss system. After debrief, allow another sortie in the same completed operating area with reset flight orientation, repaired systems and a new seed. This demonstrates that normal content authoring can extend the game.

## 4. Flight, stations and crew assistance

Use a forgiving heavy-aircraft model: position, heading, bank, pitch, airspeed, altitude, throttle, fuel, payload and per-engine condition. Bank drives turning; pitch trades speed for climb; throttle and weight affect acceleration and consumption. Smooth inputs and enforce sensible authority limits. Stall and ground collision must be real, clearly warned and recoverable early enough to act. Avoid introducing a full checklist simulator.

World units and flight tuning must be explicit and consistent. The native 3D engine uses **z up**, x east, y south, with 16 units per metre. Keep aircraft-local forward/right/up conversion in one module. Use one world scale for flight, bomb fall time, gun ranges, map position and camera attachment. Geographic compression is a mission-design parameter, separate from physical units.

| Station | Human job | Assistance and failure behavior |
| --- | --- | --- |
| Pilot | Bank, pitch, throttle, watch airspeed and choose evasions. | On leaving, course hold preserves heading/altitude within power limits. It does not dodge flak or silently repair bad flight. Warn before an unsafe handover. |
| Four gun mounts | Select the threatened bearing, aim within the mount arc, lead fighters and fire controlled bursts. | AI yields immediately when claimed. Unattended guns provide modest suppression; they should not complete every encounter. A disabled mount has a clear alternate response. |
| Bombardier | Hold a viable run, adjust sight/drift, choose release timing and salvo size. | Pilot holds a stable run when available. No automatic primary strike on default difficulty. A damaged sight retains a usable coarse reference. |
| Navigator/map | Select a waypoint, preview targets, judge danger and reserve, order return. | Map opening holds the existing course; route edits apply explicitly. The aircraft and fuel keep moving while the map is open. |

All four gun directions are actual mounts with different camera transforms and bounded firing arcs. Do not represent every bearing as the same forward-facing gun. Ring markers and captions use aircraft-relative clock positions, including when the aircraft banks or turns. A nonexclusive map overlay may be viewed by either player; only the player with flight-command permission commits a new route. Both players can inspect targets and resource forecasts.

Add a station wheel and quick gun-bearing selection. A station transition is short, intentional and cancelable before firing. Preserve the aimed direction sensibly between visits, clamp it to the mount, and prevent the confirmation input from also releasing a bomb. AI handover uses the same ownership rules as multiplayer.

Course hold is an explicit, visible aid. While it is active, direct pilot input returns control immediately. It must not continue commanding an impossible climb after engine damage. Human absence, menu opening and disconnection have defined handover behavior; none should leave a stuck throttle or trigger.

## 5. Combat, bombing and consequential damage

**Fighters:** implement three readable attack patterns using the same aircraft family: a head-on pass, a crossing/side attack, and a tail pursuit. Combine them into authored waves spanning all four bearings. Each attack has approach, commitment, firing and disengagement states. Give the player enough warning to select a station and acquire a target. Hits, near misses, suppression and disengagement need different feedback. Enemies obey the same authoritative rules in solo, co-op and attract mode.

Use finite mount ammunition and short bursts, with a visible tracer cadence. Aim assistance can slightly slow over a valid target and aid controller/touch lead; it must preserve aiming. Resolve fast rounds with swept segments or equivalent continuous hit checks so aircraft cannot tunnel through shots. Count kills and damage once, independently of render effects.

**Flak:** batteries lead the bomber’s recent trajectory and communicate an approaching danger region, then burst after a reaction window. Changing bank, altitude or speed can evade it. Burst smoke occupies convincing world space and recedes correctly in rear and side views. Destroying a battery actually reduces its local barrage. Telegraphs are gameplay aids, not a promise that the original had this UI.

**Bombs:** carry aircraft horizontal velocity, fall under gravity, and optionally experience one legible wind vector. Compute the sight prediction from the same integration used for released bombs. Provide a large aim reference and restrained predicted-impact cue, with more aid on easy/touch settings. Opening doors, lining up and release have visible state. Keep bombs inside a readable sight envelope rather than letting reticle motion teleport their origin. Salvo count cannot exceed inventory; dropping the final bomb must leave a valid return outcome.

Targets have a few meaningful components with clear damage thresholds: a docked military ship, fuel tanks and industrial structures. Show a release-to-impact transition or small impact inset without taking control away during danger. A miss is legible and leaves another-pass, secondary-target or abort choices. Scoring rewards primary completion, accuracy, fighter defense, optional objectives and safe return; show deductions for aircraft damage and wasted ordnance. Do not let cosmetic debris remain targetable or award score twice.

**Damage:** use hull condition plus a small number of consequential subsystems, rather than a page of gauges. Engine damage lowers available power and increases consumption; a gun mount may jam; sight damage degrades precision. Each condition has a sound, caption, clear indicator and an actionable fallback. Include one limited emergency extinguisher action for an engine fire and a deliberate payload-jettison action to improve a distressed return. Confirm irreversible jettison with a hold; routine firing stays immediate.

Do not force damage just to demonstrate it. Explain it in the briefing and make the same system accessible through finished practice/dev scenarios. If extinguishers are spent, the fire must have an authored recoverable-or-terminal progression with explicit warning, not indefinite unexplained damage. Ground impact, destroyed aircraft, fuel exhaustion, deadline, missed objective and an early return all resolve into complete results with retry options.

## 6. Native art and animation direction

Base the look on the engine’s code-drawn, chunky PS1/N64-style geometry and pixel/cel presentation. Use olive aircraft, warm metal interiors, pale sky, strong blue sea, dark flak and amber instrumentation. Inspect the actual native examples before fixing palettes or resolution. Pixel filtering should support distance readability, not erase fighters or labels.

Create custom recognizable silhouettes for the four-engine bomber, fighters, gun barrels, cockpit glazing, bomb bay, military ship, cranes, refinery tanks, flak mounts and airfield. The bomber must read from exterior and interior views: broad wings, four nacelles, tail, glass framing and distinct firing positions. Generic native assets may furnish terrain, sheds, vegetation, crates and incidental props.

Author assets through native shapes/material slots and procedural drawing, not a pasted screenshot backdrop. Record palettes, dimensions, attachment points and variants in `./content/`. Native `E.SHAPES`, the 3D pen and shape drawing keep custom content in the same visual family. Use native humanoid rigs for brief radio portraits and crew identity; a walkable aircraft interior is unnecessary.

Build animations around fixed simulation state: propeller speed and failure, aileron/elevator/rudder deflection, bank and buffeting, turret traverse and recoil, bomb doors, falling bombs, impact destruction, smoke, fire, landing gear where visible, and crew portrait reactions. Use the native math rigs/tweens as the base. Damage changes motion, material or silhouette in addition to a health value. Do not leave essential identity animations as static props.

Cockpit frames and barrels can live in the camera overlay, while world-visible aircraft parts use bomber transforms. Prevent the camera clipping into the plane or pilot geometry. Use exterior framing sparingly; it is useful for title, takeoff, strike confirmation and recovery. Add native lights, shadows, layered clouds, coastline detail and purposeful effects freely. The brief explicitly leaves FPS targets and optimization out of scope: no performance milestone, benchmark chase or detail cap belongs in this build.

## 7. Audio and writing

All music, sound effects and voices are synthesized in code. No audio-file dependency or recorded speech. Create layered four-engine drone with throttle and engine-health variation, slipstream, gun bursts, recoil mechanisms, bomb release/whistle, flak, impacts, radio clicks, warning tones and landing feedback. Generate buffers procedurally where useful and route everything through the engine’s music, SFX and voice buses.

Give pilot, gunner and bombardier distinct coded gibberish voices: different pitch ranges, syllable envelopes, rhythms and radio filters. Use Animalese/Simlish-style invented syllables rather than browser text-to-speech. Exact information appears in captions with a portrait/role, clock bearing and concise text. Prioritize urgent warnings, suppress repetition, interrupt chatter for critical information, and keep subtitles available independently of voice volume.

Write terse operational dialogue with occasional dry crew warmth. For example, captions can convey a bearing, target sighting, confirmed hit or need to return; avoid long conversations or cinematic speeches. Keep the playful title separate from the mission’s practical tone.

Compose a short procedural score with calm preparation, tense approach and resolved return motifs. **Initialize music to 10% on the first run**; the native engine’s default is higher and must be overridden. Honor later player settings. Duck music under warnings. Audio unlock failure must never block menus, gameplay or Hub readiness. Stop or suspend scheduled sources correctly on pause, restart, session end and page teardown; avoid duplicate drones after replay.

## 8. Controller-first screens and equivalent inputs

Use the engine’s native menu, settings, focus and prompt systems as the base. The title should lead with Play, Co-op, Settings and About/Credits. Pause exposes Resume, Controls, Settings, Dev Mode and appropriate session/exit choices. Standalone pause, including couch co-op, freezes the shared simulation and suspends gameplay sound. The player who opened it owns menu focus until resume; clear held actions on either transition. Hub uses the nonfreezing local-overlay policy below. Give every screen a working back route and a sensible focus target. Avoid a desktop dashboard or dense telemetry table.

At 1920×1080, begin with approximately 32–40 px menu text and 28 px gameplay captions, then judge actual couch-distance screenshots. Limit the common HUD to objective/course, fuel/condition, station-specific ammunition or payload, and the current actionable warning. Details belong in the map or an expanded instrument view. Pair color with shapes/text; provide subtitle sizing, camera-shake reduction, flight-axis inversion, aim sensitivity and volume controls.

| Action | Standard gamepad default | Keyboard/mouse default |
| --- | --- | --- |
| Fly / aim | Left stick flies; right stick looks or aims at the active station. | WASD pitch/bank; mouse looks/aims. Offer flight inversion. |
| Fire / release | R2, contextual to station. | Left click or Space. |
| Fine aim / sight zoom | L2. | Right mouse. |
| Throttle | L1/R1 in pilot view. | Q/E or explicit throttle keys shown in Controls. |
| Change station | Hold Triangle for wheel; D-pad selects gun bearing in gun mode. | Tab wheel; 1/2/3 quick pilot/guns/bombsight. |
| Map | Square. | M; click target/waypoint. |
| Confirm / back | Cross / Circle. | Enter or click / Escape. |
| Pause | Options, respecting the Hub-reserved chord. | Escape during play. |

Finalize conflicts against the actual engine bindings before implementing. Render PlayStation glyphs by default, with a Settings choice for Xbox A/B/X/Y. Use `input.label(action)` or a native-compatible extension so prompts follow the last deliberate input. Pointer hover moves menu focus; mouse aiming and clicking targets must work naturally. Pointer lock, if used, releases when menus open and is never required to use a menu.

Support gamepad hot-plug, disconnect and dead zones. Preserve focus when the input method changes. For local co-op, track last input separately for each player pane rather than letting one player change the other’s prompts.

**Touch:** retain the same game and screens. Keep only a menu control persistently visible; use invisible left/right thumb regions for flight/aim, multitouch, assisted throttle/course hold, strong aim help and contextual pop actions for station, release and emergency use. Show a small contextual action only while useful and explain the controls briefly on first touch. Touch assistance may automate routine defense, but preserve deliberate bomb release and route choices. Do not scatter a full controller overlay across the sight. Touch support is for solo here; co-op can use pads or Hub clients.

## 9. Two-player cooperation, standalone and AI Hub

Scope multiplayer to **1–2 people on one bomber**. Each person has a camera and station context. Default Player 1 flies/navigates, Player 2 handles defense/bombing; both can switch and request control. Shared resources and objective state make it cooperation rather than two adjacent solo games.

**Standalone:** provide finished local couch co-op with two standard-mapped pads, or keyboard/mouse plus one pad. Use two readable first-person panes with per-player station HUD and shared mission essentials. Start with a horizontal split; validate target visibility and text at TV resolution. The native engine already supports this: `game.splitScreen(2, {layout:'rows'})`, a second camera through `world.addCamera`, and independent poses in `world.cameras`. Advance the shared world once; `world.draw(r)` selects the camera using `r.viewport.i` and handles viewport/scissor rendering. The [native racing reference](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/src/starter3d/50-racing.js) demonstrates the pattern. Emit procedural pen geometry and player-specific foreground through `world.onDraw(world, r)` for each viewport because drawing clears the batches. Its camera overlay is shared, so rebuild or toggle the foreground for that player's station on each draw. Draw projected HUD immediately after that viewport's world draw. Native postprocessing filters are disabled in split screen; use geometry, outlines, lights and clear composition to retain the style. Test two-view rendering in the first technical spike. Standalone couch co-op satisfies play on its own; remote online sessions are supplied through AI Hub. Do not claim standalone internet room hosting or invent a new signaling service.

**Ownership:** one human or AI owns flight actuators, each gun mount and the bombardier station. Only the bombardier owner may release a salvo. Keep the human flight-command permission separate from temporary AI course hold: its owner can still commit routes, extinguish a fire or jettison payload while looking at another station. Assign it to Player 1 initially and transfer it explicitly when the other player takes the pilot role. It persists while AI stabilizes flight, and transfers to the remaining human on departure. Emergency actions are centrally validated atomic commands, so simultaneous or repeated requests cannot consume resources twice.

A station request is accepted centrally; a busy seat shows its owner and a handover request. Resolve simultaneous requests in a consistent order. Viewing a map or another camera does not grant firing or flight authority. AI releases a claimed station immediately and resumes an abandoned one. A disconnected player’s controls clear, their duties return to AI, and the remaining player can finish. In solo, the one human retains command permission while changing stations; AI actuator control does not lock them out of navigation or emergencies.

The verified [Hub handoff](https://github.com/michaelcrosato/ai-hub/tree/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub) is Session Protocol v1, client 1.4.0. Re-read its current contract before implementing and retain the downloaded revision. In particular:

- Paste the released `session.js` unmodified as the first script in the HTML head immediately after the charset declaration. Keep it out of transformations that change its source.
- Declare `hub:session=1`, `hub:session-players=1-2`, `hub:session-mode=shared-world`, clear goal/how-to text, and a meaningful typical duration using the handoff's documented metadata. A 12-minute round fits its 15-minute maximum; ensure your own mission deadline and reporting do not overrun it.
- Connect with `AIHub.connect({mode:'shared-world', seats:[1,2]})`. Null means standalone. In a Hub session, bypass the normal title, attract and blocking setup menus, prepare the world, and call `AIHub.ready()` without input. Use the Hub’s default instruction card. Begin play only when `AIHub.time() >= 0`.
- Start Hub play in an active assisted launch/staging state with a viable default route and payload. If you offer adjustments, make them immediate in-world actions with defaults and no readiness barrier. The full round must complete if nobody touches a setup control.
- The `AIHub.isHost` copy owns all simulation. A dedicated host may have `AIHub.server === true` and no player seat: local pilot/camera/audio are optional to authority. Assign player roles from the player list, never from host status.
- Use `AIHub.send` and `message` events for game data. Do not create sockets, brokers or a second protocol envelope inside a Hub session.
- Budget for the documented 20 outbound messages per second, burst 40, and 16 KB JSON maximum. Start around 10 Hz snapshots and 10 Hz guest continuous-input packets, batching events and keeping room for reliable actions. Keep ordinary unreliable payloads near or below 1,200 bytes; split state by importance if necessary. These are transport constraints, not frame-rate optimization targets.
- Continuous aim/input and presentation snapshots can be unreliable. Station ownership, accepted bomb releases and terminal outcomes need reliable delivery plus authoritative periodic correction. Tag packets with tick/sequence numbers; validate sender, bounds, ownership and duplicates. A retried release must never consume two bombs.
- Keep named random generators returned by `AIHub.rng`, rather than recreating them each call. Shared-world mode does not seed `Math.random`; only the authority rolls gameplay randomness.
- Guest departure transfers work to AI. Do not implement host migration: the Hub voids a shared world when its host leaves. Handle the resulting end cleanly.
- Report once with `AIHub.finish`, using a tied standings group containing every present teammate exactly once, plus valid scores, win state and stats. On time-up, resolve current progress and report within the supplied grace period; an incomplete sortie is a valid partial result.
- On end, stop input, sends and sound; leave result presentation to the Hub. Session settings are local overlays and cannot freeze the world. World-changing dev tools remain available in standalone dev play. Respect the reserved Create+Options chord and render player names as text. Follow the Hub prohibition on player communication: no chat, emotes or communication pings; scripted crew warnings and station-control commands are gameplay systems.

Keep a small transport/session adapter in `./src/online/` so standalone and Hub feed the same commands into the same simulation. Do not fork damage, missions or scoring into separate implementations.

## 10. Engine foundation and portable packaging

The audited engine is **my-3D2dge v0.89.1**, revision `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Begin with the [full handoff](https://github.com/michaelcrosato/my-3d2dge/tree/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff), read its API and asset documentation, and retain required notices. Its normal projection views do not provide a perspective flight camera. Use its native [World3D extension](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/engine/my-3d2dge-3d.js) from the same revision, while retaining `E.Game` scenes, fixed-step loop, native input, menus/settings, HUD, audio and animation foundation.

The extension uses pinned **Three.js 0.182.0** and **Rapier 0.19.3** dependencies supplied in the repository. Rapier is a hard dependency of the unmodified extension even if bomber combat uses custom collision checks: initialization and world creation require it. The compatible Rapier module embeds its WASM. Preserve MIT and Apache notices as applicable. Use the complete engine: the smaller agent edition ignores `E.addAssets`, and genre-pruned builds can remove systems this game needs.

The [native flight reference](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/src/starter3d/60-flight.js) is a technical reference for flight, terrain, projectiles, radio portraits and test bots. Its rail shooter mechanics are not the game design. Wrap or replace `world.flyer` behavior where the bomber’s weight, resources and course hold require it.

Use fixed bomber-attached cameras for pilot, four guns and downward sight. The native camera’s fixed pose, `world.project`, camera overlay, 3D pen, shapes and humanoid rigs cover the presentation foundation. Let native coordinates flow through `E.World3D.toThree` when integrating low-level geometry. The extension uses `WebGPURenderer`/node materials and supports a WebGL 2 backend; do not bolt on incompatible classic shader/composer code. Verify the documented WebGL fallback explicitly.

**Prove portability before content production.** Existing 3D examples reference root-relative vendor files even when their game code is inline. A copied example therefore does not satisfy the final package. Create a minimal built artifact with native engine, extension, custom aircraft, HUD, audio unlock and split-view proof. Open it through `file://` from an arbitrary location and through the local Hub harness.

Choose a maintainable bundling route: inline game, native engine, content and local assets; bundle dependencies too when practical, or use pinned absolute HTTPS CDN imports with verified cross-origin support from a file origin. Handle any WASM location explicitly. No development-server URL, root-relative vendor path, sibling asset, raw development-source fetch or build-folder dependency may remain. External CDN dependencies are permitted by the brief; document network requirements honestly. Escape embedded closing-script tokens, preserve the Hub client verbatim, and verify the delivered file itself after moving it away from the dev tree.

A dependency-level fallback was checked during planning: map both `three` and `three/webgpu` to `https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js`, map `three/tsl` to `https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.min.js`, and map `@dimforge/rapier3d-simd-compat` to `https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs`. These modules served JavaScript with permissive CORS; the WebGPU module's relative core import is available on the same CDN. This is evidence for a packaging route, not a completed browser boot test. Prove the actual inline extension, import map, renderer fallback and final file together.

## 11. Project and state architecture

Keep modules during development and emit the single final HTML at the destination prescribed by the brief. Suggested internal organization:

| Relative path | Responsibility |
| --- | --- |
| `./src/core/` | Fixed-step clock, commands, seeded RNG, world state, serialization and events. |
| `./src/sim/` | Aircraft, flight aids, station ownership, fighters, guns, bombs, flak, damage and resources. |
| `./src/mission/` | Operation state machine, encounters, objectives, scoring, recovery and debrief. |
| `./src/view/` | Native 3D scene, cameras, split views, effects, animation and tactical map. |
| `./src/ui/` | Native menus, prompts, controls, settings, touch assistance and credits. |
| `./src/audio/` | Procedural instruments, SFX, gibberish voice scheduler and bus integration. |
| `./src/online/` | Hub adapter, input/snapshot codecs and standalone seat management. |
| `./content/` | Authored targets, routes, encounter graphs, aircraft/asset definitions, palettes and animation tuning. |
| `./tests/`, `./tools/` | Quiet verification entrypoint, deterministic bot, browser drivers, bundler and local harness. |
| `./docs/` | Research, control contract, engine changes, known limits and truthful feedback evidence. |

The names are organizational suggestions, not an excuse to add abstraction layers. Keep a documented authoritative state containing mission phase/time/seed; aircraft transform, motion, resources and systems; players and station owners; enemies, batteries and bombs; objectives; score; and monotonically increasing event/action identifiers. Rendering objects and audio nodes do not belong in snapshots.

All play passes through commands: flight input, aim, fire, release, route selection, station claim, emergency action and pause policy. One simulation produces state and events. Presentation consumes them; effects cannot apply gameplay damage. AI and attract controllers submit the same command types. Local and remote input differ only in where validated commands originate.

Use native fixed stepping. Keep deterministic clocks/RNG injectable for tests; interpolation and camera easing belong in rendering. Restart must recreate mission state and release old entities, events, input holds and audio nodes. Settings persist independently. Treat unavailable storage gracefully, and do not leak standalone saves or cheats into Hub rounds.

Content should be authorable as data: target position/components, route zones, encounter conditions, enemy patterns, dialogue cues, assistance profiles and balance values. Add validation and a small in-dev mission tool: select/move a waypoint or target, preview trigger volumes and enemy paths, edit a parameter, then export the definition. A full standalone editor is unnecessary; adding another operation should not require editing combat logic.

## 12. Dev mode, practice and attract mode

Dev Mode is reachable from the native pause menu and works with controller, keyboard and pointer. Include invulnerability, infinite resources, free camera, collision/attack/trigger visualization, simulation pause/step, mission-beat jump, spawn fighter/flak, apply/clear subsystem damage, teleport to approach/home, deterministic seed, and exportable state. Cheats visibly mark the run; do not save cheated scores as normal results.

Expose the most useful variables as live sliders with units, sensible ranges, current/default values and reset: flight response, course-hold strength, fuel consumption, enemy accuracy, flak reaction window, gun aim help, bomb drift/dispersion and damage multiplier. Sliders affect real simulation parameters immediately without producing invalid state. Reset restores canonical defaults, including dependent values. Keep world-changing tools inactive during Hub rounds with a clear explanation, while local display/audio settings remain usable.

Provide short finished practice scenarios for directional gunnery, bomb calibration and a damaged return. Reuse actual mission systems. Practice is useful for teaching damage that good play avoids and for quick verification, not a substitute for the full operation.

After **10 seconds without input on the title/menu screen**, enter a looping AI-played attract sortie with visible Demo labeling. Show takeoff/exterior silhouette, a directional interception, flak avoidance, bomb release and impact, then damaged-looking return and recovery. It may cheat to guarantee the showcase. Drive the real simulation with a separate transient state; do not alter saves, scores, settings or the next real sortie. Any deliberate key, click, tap or pad action exits immediately, consumes that action, resets the menu’s idle timer and restores focus. Filter stick drift so it cannot prevent attract mode or eject it continuously. Attract never starts in a live Hub session, an active game, a text entry field or while someone is adjusting settings.

## 13. Build sequence and completion gates

Work in this order. Keep the full contracts visible; parallelize bounded asset/content/research tasks when useful, with clear file ownership. Integrate against shared state and command contracts before expanding content.

1. **Research and pin.** Read source and engine/Hub documents; select title by the required random procedure; record revisions, dependency licenses, control scheme, mission graph and requirement checklist. Gate: no unresolved misconception about source identity, native engine or session authority.
2. **Technical proof.** Build portable native 3D, both renderer paths, camera attachments, custom aircraft, input switching, two local views, procedural audio bus, headless stepping and Hub connect/ready/playerless-host boot. Gate: the real single-file route works from file origin and through the harness. Fix architecture blockers now.
3. **Playable spine.** Implement takeoff, course hold, map routes, one fighter, one gun, one flak battery, one bomb target, fuel, recovery and debrief. Gate: one complete sortie is playable with normal inputs and winnable without dev tools.
4. **Full mechanics and authored operation.** Add all four gun bearings, attack patterns, payload choices, target components, optional risk/reward, damage, emergency actions, seed variation and practice. Gate: every mechanic has a usable demonstration and every state has an exit.
5. **Co-op and session completion.** Finish split-screen ownership, handovers, input isolation, snapshots, loss/retry handling, departure, time-up and terminal cleanup. Gate: local two-player and two-browser Hub missions both finish, including a playerless server.
6. **Art, animation, sound and interface pass.** Replace temporary shapes and wording with finished assets; tune threat readability, guidance, captions, coded voices, score, touch and accessibility. Gate: screenshots establish the game’s identity at a glance and automated evidence confirms the systems behind them.
7. **Tools and showcase.** Complete pause/dev sliders, content editing/export, practice, title idle replay, settings persistence and About/Credits. Gate: every exposed button and slider has an implemented effect; no placeholder panels.
8. **Release verification.** Build the actual final artifact, run relevant suites, resolve failures, rerun affected coverage, check copied-artifact portability, fill feedback from evidence, validate required JSON and clean up only your own processes. Gate: all CEO requirements accounted for and no TODOs, stubs or knowingly broken features remain.

Stages overlap for polish and integration; gates prevent building elaborate content on an unproven renderer or transport. Balance each coupled loop together: changing fuel, flight speed or bomb load changes route viability; changing aim help or enemy accuracy changes time available to bomb. Keep every offered default loadout and difficulty replayable after tuning.

## 14. Verification with evidence

Expose one command, such as `npm run verify`, that runs relevant static/build checks and the suites below, prints failures with enough detail to reproduce, and ends with a single count line. Keep verbose traces in files. Rerun coverage after changing code it covers; avoid redundant full-suite loops after unchanged code. Record real issues and critical failures as they are found so feedback counts are supportable.

Use native `game.advance`, input scripting and `game.debug.snapshot()` plus a small game-specific inspection adapter. `E.World3D.init(game, {render:false})` supports simulation testing without a renderer. Expose state, objective/event histories and station owners, not a backdoor that passes the entire game. A deterministic pilot bot may choose actions intelligently, but at least one browser playthrough must use actual input and exercise the public UI path. Unit tests of isolated formulas do not prove a playable operation.

| Suite | Evidence required |
| --- | --- |
| Flight/resources | Takeoff, climb, stall warning/recovery, course hold/handover, throttle/fuel effects, payload tradeoff and every offered loadout’s mandatory-strike/return viability. |
| Combat | Hits and misses from four bearings, mount arc enforcement, ammo exhaustion, fast-shot collision, enemy disengagement, flak evasion/suppression and no duplicate score. |
| Bombing/damage | Prediction agrees with impact; single and salvo release debit correctly; direct hit, miss and last-bomb paths work; each subsystem failure and emergency action has expected consequences. |
| Full operation | Seeded launch → interception → flak → primary strike → return → recovery → debrief; plus abort, destroyed bomber, fuel exhaustion, missed target, deadline and replay reset. |
| Inputs/UI | Standard pad stub, hot-plug/disconnect, glyph switching, keyboard/mouse focus/aim, touch multitouch/context actions, all menu back routes, pause and live-slider reset. |
| Local co-op | Two pads and keyboard-plus-pad, simultaneous independent input, two useful camera views, station contention/handover, AI yield, pause policy and departure. |
| Attract/tools | 10-second entry, showcase beat coverage, exit with each device, consumed exit input, no save/score pollution; dev spawn/jump/step/damage/reset and mission-data export round-trip. |
| Audio | Render representative procedural sounds with OfflineAudioContext or inspect an analyser: nonzero output, finite samples, no unintended clipping, music gain 0.1 at first run, independent buses and silence after terminal cleanup. |
| Package | Actual delivered HTML starts away from dev files; no missing local requests or console errors; allowed CDN behavior checked; required metadata, notices, About/Credits and JSON are present. |

For Hub, download its harness, bridge and round support into the dev folder and run its documented checks. Serve on **127.0.0.1 with an OS-assigned port**, confirm that the served page is this game, and retain its process PID. Required scenarios include normal two-player play; 150 ms latency, 50 ms jitter and 5% loss; guest departure; host departure; and a playerless-server run. Wait for the harness completion flag, assert `window.__hubCheck.pass === true`, and fail on `[AIHub]` client warnings such as rate-limit, oversize-packet or API-use warnings. Add game assertions: both players affect their stations, releases count once, state converges, departed duties return to AI, time-up reports once and end stops sound/sends. A 1–2 seat declaration is valid; the admission runner filters tests to declared seats. Do not add unsupported four-player gameplay merely to follow a generic README example.

Use the installed Playwright version and browsers. Keep at most one or two browser processes open, using multiple pages/contexts for multiplayer as appropriate, and close them afterward. Do not download replacement browsers. Prefer file origin and native headless tools when a server is unnecessary. The authoritative host must continue without a visible local canvas; test it independently of requestAnimationFrame-driven rendering.

Check Chromium’s WebGPU route where available and the native WebGL 2 route in Chromium/WebKit. A blank headless WebGPU screenshot does not establish a broken simulation: inspect state and use WebGL screenshots for visible composition. Firefox in the supplied environment has no WebGL; show a useful unsupported-renderer message rather than promising a playable renderer there.

Screenshots are for what scripts cannot establish: cockpit silhouette, four station identities, sight/target clarity, effect layering, split-screen readability, TV-size menus, portrait captions and uncluttered phone/tablet views. Do not use screenshots instead of assertions for health, networking, objectives or completion. There is no physical pad, touch device, second human or listener here; use the prescribed stand-ins and state their limits in feedback without claiming hardware validation.

Keep generated files and downloads in the dev folder. Do not inspect neighboring runs, use fixed shared ports, launch Windows GUI apps, reinstall existing tools, or kill processes you did not start. Stop your own server by its PID. Apply the repository’s own required checks to engine changes and record why each native extension was necessary.

## 15. Release content and honest reporting

The in-game About/Credits and final builder reply must contain **Source Information, Testing Feedback, Engine Feedback and Prompt Feedback** as required by the CEO brief. Use the builder’s actual date, model/effort, plan filename, versions and implemented online mode, rather than copying planner-time values blindly. Record usage as **added on import**. Use **unknown** for anything that cannot be confirmed.

Maintain one structured metadata/feedback source and render it into the in-game screen and required builder JSON to prevent drift. Use the exact JSON shape, question order, catalogue fields, filename and output location specified in the builder’s own brief; parse it before finishing. The planner’s exit interview is separate and is not the builder’s game record.

Testing feedback must report observed issue counts, severity and most/least helpful checks. Engine feedback should distinguish native capabilities from changes you made, particularly split rendering, flight rules, packaging or input adaptations. Prompt feedback should reflect the build experience. Do not fabricate test coverage, original audio research, real-device checks or session success.

The final handoff includes the finished single HTML at the prescribed destination, the complete dev sources/tools/content, the required builder feedback JSON, and a concise reply identifying what shipped, how to play, what was verified, and any confirmed environment limitation. The game starts cleanly, teaches its complete loop, offers all promised features, ends coherently, and can be replayed without leaking state.
