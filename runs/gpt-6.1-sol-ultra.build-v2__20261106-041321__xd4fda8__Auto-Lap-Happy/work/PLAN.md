# Game director’s build plan

## Mandate and working assumptions

Build a complete, original arcade driving game inspired by **Auto Racing (Mattel Intellivision, 1980)**. The identity is a small car moving fast through a surprisingly large countryside: read the road, brake before the bend, recover from a mistake, and learn how the circuits fit together. Make the road, handling, and competitive pursuit carry the game.

This plan is for **gpt-6.1-sol at ultra reasoning effort with a 1.05M context window**. Use that capacity to retain the engine contracts, world data, implementation, and verification evidence together. Build the complete connected experience rather than a showcase with one functioning track. Work in integrated milestones, delegate independent systems when useful, and give one owner responsibility for the authoritative simulation and integration. There is no imposed development time limit or FPS target. Spend iteration on driving feel, authored content, presentation, and correctness; optimization is outside this assignment.

The build brief remains authoritative for delivery names, locations, metadata, and environment rules. **The builder owns the title**: privately generate fifty playful riffs on the source’s name, select one using an actual random-number generator, and use it consistently. This plan supplies no title or output basename. All implementation paths below are suggestions **relative to the development folder**. Publish the finished HTML and reporting artifacts with the exact names and locations prescribed by the builder’s brief.

## 1. Research that should shape the game

The original’s confirmed mechanical vocabulary is unusually useful: five increasingly difficult courses; five car colours with four handling profiles; automatic acceleration; braking and skidding; scenery, grass, and water that punish poor lines. Solo play times five laps. Two-player play awards two points for an opponent’s crash and one for pulling far enough ahead, with checkpoint restarts, until fifty points. The manual gives the lead distance as roughly twelve car lengths. Tan and blue are mechanically identical. Original-release steering points toward screen directions; the revised release uses car-relative steering. These facts come from the [original instructions](https://history.blueskyrangers.com/instructions/autoracinginst.html).

The circuits share an explorable, wrapping landscape, including off-road connections and a hidden drag strip. The corrected historical account also warns that older accounts reversed the steering-version chronology. Use the [Blue Sky Rangers history](https://history.blueskyrangers.com/mattelelectronics/games/autoracing.html) as the historical reference. Exact original music, detailed track measurements, and any unverified visual or sound claims remain **unknown**. Inspect archival gameplay and the manual’s map/illustrations before final art and track authoring; record what was actually observed.

Translate those discoveries into an original world and rules implementation. Do not trace the old courses or reuse its artwork. AI opponents, a guided tour, personal ghosts, a modern recovery action, and direct online play are additions designed here, not features to attribute to the 1980 game. Avoid weapons, item boxes, nitro, progression currencies, damage upgrades, and unrelated kart mechanics.

Record sources, observations, uncertainties, dependency revisions, and licenses in `docs/research.md`. Research the source before implementation; then recheck any engine or protocol details against the revision actually imported.

## 2. The game to make

**Genre:** arcade circuit racing and two-car pursuit competition. **Perspective:** stable, north-up overhead driving using the engine’s gently pitched top-down view. The car rotates; the world does not. Preserve generous visibility ahead and a legible silhouette through every heading.

The central loop is: choose a road and car, read the next corner, trade speed for grip, cross valid checkpoints, and improve a lap or win a pursuit exchange. Exploration connects those competitive spaces into a place worth learning.

Ship these complete experiences:

| Experience | Content and purpose | Completion |
| --- | --- | --- |
| Guided road tour | A short driving lesson, a timed circuit, an exploration connection, and a duel against AI | A proper ending, results, and immediate replay/quick-play choices; approximately 12–18 minutes at a new player’s pace |
| Time trial | Any of five circuits, any car; classic five-lap event and a clearly labelled shorter two-lap preset | Valid lap splits, personal best, results, retry, course/car change; optional personal-best ghost |
| Pursuit duel | Human versus AI, two local humans, or two online humans | Sprint to 10 points by default; classic 50-point option standalone; coherent scoring, checkpoint restarts, winner, and rematch flow |
| Free drive | The connected region with every circuit entrance and the hidden straight accessible | Discoveries and a route passport save locally; no mandatory grinding or race rules accidentally active |

The tour is the recommended first choice, but every mode, course, car, and control preset is available without completing it. The tour must expose all mechanics, including grass, water, grip loss, collisions, recovery, checkpoint legality, lead scoring, and crash scoring. Do not leave multiplayer as the only way to experience a core rule.

Keep the feature set coherent. A ghost is a saved best-run visualization, not another progression system. Free drive reuses the same roads and handling. The AI used for duels also drives the attract mode and supports automated playthroughs.

## 3. Handling and race simulation

### Driving feel

Use automatic acceleration as the default and teach **brake before the turn, release to accelerate**. Provide manual throttle as a setting for players who want standard trigger driving. Auto acceleration must not apply during grid lock, pause, recovery, results, or missing-input safety states.

Braking must settle the car at zero and hold it there; releasing the brake resumes automatic acceleration. The stock car model can reverse when braking from rest, so adapt that behaviour for this game. Do not make a player back into the scenery by holding the brake. Reverse is unnecessary with a good recovery action; if deliberately added, give it a distinct documented intent.

Use the handoff’s `E.Car` as the foundation. Preserve continuous speed, heading, lateral slip, steering response, surface effects, braking, and car contact. Tune for readable slides and recovery rather than a realistic drivetrain. Make every loss of control explainable through road shape, speed, surface, or impact.

Build five original bodies/liveries with four profiles. Start from the source’s relative speed ladder of 55:65:75:90:90, treating it as a ratio rather than a claim about real-world units:

| Car identity | Handling intention |
| --- | --- |
| White | Slowest, forgiving cornering, slow acceleration; lesson and precision choice |
| Green | Strongest acceleration, good grip; forgiving recovery and short courses |
| Red | Balanced speed and cornering; useful reference for tuning |
| Tan | High speed, slower acceleration, weaker cornering; rewards anticipation |
| Blue | Exactly the same physics as tan; fair matched competition |

Use data, not scattered conditionals, for all profiles. The matched pair must remain identical after settings and tuning changes. Explain cars with three large comparison bars and one sentence; do not bury the choice in statistics.

Road has high predictable grip; grass reduces drive and top speed; gravel has lower grip and a distinct skid; water triggers an unmistakable crash/recovery; buildings and trees have visible collision footprints. Small shoulder mistakes should lose time without becoming an endless pinball sequence. Make the collision boundary and artwork agree.

A crash is a rule event with a reason and location, not every low-speed touch. Classify hard solid impact, entering deep water, and unrecoverable immobilization separately from ordinary bumps or skids. Add a brief crash/recovery state and immunity against repeated scoring from the same incident. In a duel, manual recovery counts as a crash so it cannot erase a losing position for free. In time trial, recovery adds a visible fixed penalty as well as the time lost. Free drive uses a forgiving recovery with no competitive consequence.

### One authoritative update

Keep intent collection, simulation, rules, and presentation distinct. The engine runs at a fixed **1/120-second simulation step**. One subsystem advances each car exactly once per step. `E.Race.update()` already advances cars; do not also call their update in another loop. Either adapt its lifecycle carefully or own the simulation loop and reuse its verified helpers. Render interpolation, particles, sounds, UI, and camera do not change authoritative state.

Use seeded, named random streams for rule-relevant decisions; keep cosmetic randomness separate. State should be serializable enough for snapshots, recovery, replay, and diagnostics. Tests should control simulation ticks rather than infer game time from slow software-rendered wall time.

### Route legality

Build a connected road graph, but make race progress explicit. Every circuit defines a forward start/finish gate, ordered directed checkpoints, legal road-edge sequences, safe restart anchors, and any approved alternate edges. Compute local progress with segment continuity. Do not let global nearest-path projection decide which road or lap a car occupies.

A lap requires every required gate in order and a forward start-line crossing. Crossing backwards, skipping a gate, crossing a nearby parallel road, teleporting through a reset, and repeatedly oscillating over the line must not award progress. A shortcut may be slower, faster, or useful only to a particular car, but it must have authored legality. Show a clear return-to-route cue when the player misses a required section; keep free-drive navigation permissive.

Use unwrapped legal route distance for duel separation, so a hairpin, crossover, or start-line wrap cannot create a false lead. Keep the competition threshold in world/rule units, initially twelve car-body lengths, independent of display size, camera zoom, and network frame rate.

## 4. World and authored content

Build **one connected countryside containing five original circuits**, rather than five unrelated backdrops. Reuse roads where it produces recognition, but give each route a distinct rhythm and landmark. The source’s wrapping geography is inspiration; a polished bounded connected region is sufficient. If wrapping is implemented, seams must work for cameras, progress, collisions, AI, and networking.

| Circuit | Driving lesson | Landmark and course character |
| --- | --- | --- |
| 1 | Brake timing and road re-entry | Broad meadow loop, generous shoulders, small paddock, visible first corner |
| 2 | Linking bends and managing acceleration | Orchard or farm lanes, alternating curves, gates and recognisable buildings |
| 3 | Precision and risk | Lakeside road, narrow causeway, water, a clearly readable optional connection |
| 4 | Sustained speed and grip recovery | Woodland sweeps, gravel shoulder, technical hairpin, long acceleration section |
| 5 | Mastery of the complete handling model | The region’s longest mixed loop, combining recognisable roads with a new demanding sector |

Aim initially for roughly 45–100 seconds per lap with the red profile; tune geometry and distances after driving it. These are pacing guides, not performance targets. The short presets and tour should avoid repeated filler laps. Five-lap classic events remain available for source-style endurance and route learning.

Connect the circuits with drivable lanes and visible entrances. Put the hidden straight somewhere a curious player can discover from a visual clue, not a random pixel hunt. Give it a working start marker and timed speed/acceleration run so the discovery has a purpose without creating another full game mode.

Author race gates and free-drive navigation separately. A driver following a circuit must be able to distinguish the active route from a tempting connector through colour-independent signs, chevrons, road treatment, and a sparse route ribbon/minimap. Landmark placement should teach where the next corner goes.

Content is data-driven: road control points and widths, surfaces, barriers, scenery placements, route edges/gates, start grids, restart anchors, AI hints, tour steps, and medal targets. A designer must be able to add a sixth circuit or rebalance a car by editing validated data, not rewriting race code. Include a concise authoring guide and schema checks. A full visual editor is unnecessary; useful in-game overlays and inspectable data are necessary.

## 5. Rules, AI, and state flow

Use explicit states: boot, standalone front end, setup, grid countdown, running, exchange/recovery, finish, results, pause overlay, dev overlay, attract, and session end. Store a return destination for overlays. Assign each state one owner for input, clock, audio, and transition events.

**Time trial:** show lap, current time, best/delta, and essential route guidance. Store valid results with circuit version, physics/rules version, car profile, preset, assists, and penalties. A dev-altered run cannot overwrite ordinary personal bests. A ghost follows the saved authoritative run; it has no collision and cannot affect gates. A missing or obsolete ghost fails gracefully.

**Duel:** both drivers share a view and try to make clean distance while inducing mistakes through pressure and positioning. Car contact changes motion but awards no points directly. An opponent’s crash awards 2; a clean qualifying lead awards 1. Announce the reason, update the score once, then stage both cars at the latest valid checkpoint reached by the leader, in safe side-by-side slots. Preserve their chosen car profiles.

Resolve all incidents for a tick in one place. Simultaneous crashes produce no point award; a crash takes priority over an overlapping lead award; a single incident cannot produce both. If a manual recovery and crash overlap, count one crash. Check the winning threshold before starting another exchange. A short freeze and clear countdown make restarts legible. The sprint preset uses a short time cap; a timed tie is a draw. Classic standalone play can continue to 50 without that cap. Hub deadlines always take precedence.

Frame both cars with a bounded shared camera. Do not shrink the road into illegibility to keep a distant loser visible; resolve the lead rule before that point. If needed, use an edge indicator during the short lead-confirmation window. Two-player shared-screen pursuit is the core local mode; split-screen is available infrastructure, not a substitute for this rule.

**AI:** begin with the engine’s path following and corner braking, then add route-aware look-ahead, surface-aware speed choice, safe re-entry, and finite stuck recovery. It must drive the real car model and legal gates. Easy/normal/hard vary braking margin, reaction delay, and mistakes; do not secretly change the opponent’s car stats. Attract mode may cheat to keep the presentation moving, but ordinary duel AI and acceptance playthroughs must not.

Teach by doing. Use one brief cue for each lesson, dismiss it through the demonstrated action, and allow skip/retry. Keep the writing cheerful, direct, and sports-announcer-like, in the spirit of the source’s instructions. Make the ending acknowledge the player’s driving and offer the rest of the demo.

## 6. Controller-first screens and input

Design for a 1920×1080 TV at ten feet. Use large high-contrast text, generous spacing, and a small number of choices. The title opens into one consistent full-screen interface: start tour, quick play, multiplayer, settings, and About/Credits. Keyboard, mouse, controller, and touch use these same screens.

Default controls:

| Action | Standard controller | Keyboard/mouse |
| --- | --- | --- |
| Steer | Left stick horizontal, car-relative | A/D or left/right arrows in solo |
| Brake | L2, analog | S/down or Space |
| Throttle when manual mode is selected | R2, analog | W/up |
| Recover | Hold Triangle | Hold R |
| Confirm / back | Cross / Circle | Enter or click / Escape |
| Pause | Options | Escape |
| Menu navigation | D-pad or stick | Arrows/WASD; hover focuses and click activates |

Screen-direction steering is a clearly described alternative inspired by the original release; use the stick vector or directional keys as the target heading with a bounded turn rate. Keep it compatible with the same car rules. Mouse-driven steering can be an option if implemented and explained; menus and route selection must support native pointing and clicking regardless.

Show prompts for the last meaningful input device. Ignore analog noise when changing device or resetting idle time. Use PlayStation glyphs by default and offer Xbox A/B/X/Y glyphs in Settings. Match actual bindings, not hardcoded labels. Every menu, slider, modal, and results action must work without a mouse, with visible focus and predictable back behaviour.

For two local humans, support two pads and pad plus keyboard. If offering a shared keyboard preset, separate the action maps and remove the solo arrow-key aliases that would otherwise move both cars. Confirm seat assignment visibly; handle a disconnected pad without assigning its held buttons to another player.

Touch defaults to automatic acceleration, assisted re-entry, and damped steering. Use an invisible steering zone on the left and a right-side hold-to-brake zone; support both touches simultaneously. Keep only the menu control persistent. Show a large contextual recovery action when crashed or stuck, and explain gestures once. Respect safe areas, cancel held inputs on interruption, and avoid browser scrolling or zooming during driving. Assist strength is recorded with competitive results.

Pause freezes a standalone local round for both players. During online play, a settings/pause overlay leaves simulation and the shared clock running and sends safe braking input. Clearly say the race continues. Options while Create is held belongs to the Hub, so do not intercept that chord.

Disable the engine’s automatic focus/visibility/controller-loss pausing for online operation with `autoPause:false`. A hidden host or actorless server copy must continue authority. Drive competitive countdowns and deadlines from the Hub timeline or the standalone host’s monotonic match clock, not engine simulation time, which can lag behind wall time. Losing a local controller may neutralize that seat’s input, but it must not freeze the other player’s round.

## 7. Native art, animation, and code-only sound

Base the game on the handoff’s **shaded, code-drawn retro pixel art**, using a bright miniature countryside, readable car colours, textured roads, depth-sorted props, and cast shadows. Choose the engine’s top-down 80-degree-pitch view; true 3D, Mode 7, and a chase camera are unnecessary for this direction. The engine’s native style and driving playbook are documented in its [API card](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API.md).

Create new car bodies, wheel groups, cockpit/driver silhouettes, gantries, route signs, checkpoint markers, paddock props, and landmark structures. Reuse library trees, bushes, rocks, and fences where appropriate. Keep collision shapes visible and the road unobscured by foreground scenery. An attractive title vignette should use the actual world and cars, not unrelated promotional art.

Use `E.SHAPES`, native materials/tones, `r.shape`, and native drawing primitives with the full engine build. The smaller agent edition does not provide the same shape drawing support. Shapes are static definitions: animate wheel steering, wheel rotation cues, body lean, driver lean, flags, and pit-crew reactions through gameplay-side procedural groups, native tweens, and rigs. Do not assume an asset animation editor exists. See the [asset contract](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/docs/ASSETS.md).

Make motion communicate state: speed-sensitive dust, gravel spray, tyre marks, skid smoke, impact stars, water splash, brief body squash/lean, a settling suspension on reset, and animated finish flags. Use particles and lighting generously where they help the scene. Give the player a reduced-motion setting; screen shake and flashes must not be the only indication of an event.

All audio is synthesized in code through Web Audio and the engine buses. Make a continuous engine voice responsive to speed/load, a separate tyre-slip voice, grass/gravel/water sounds, contact and recovery sounds, countdown and gate cues, point stings, and a satisfying finish phrase. Use a small original procedural music score with title, driving, and results arrangements. Brief crew/announcer voices are synthesized gibberish with optional readable captions; no speech synthesis reading real dialogue and no recorded audio files.

Explicitly set music’s initial gain to **0.10**: the engine default is higher. Respect saved player changes thereafter. Expose master/music/SFX/voice sliders and mute through the same buses. Resume audio only after an allowed gesture in normal play; Hub readiness and server simulation must never wait on audio. Maintain sensible headroom, suspend/mute obsolete scenes, and prevent duplicate loops after retry or focus changes.

## 8. Multiplayer that actually works

Use **one host-authoritative two-car Duel simulation** for local and online play. Declare **shared-world**, not ghost, for AI Hub: collisions, point awards, and checkpoint restarts affect both drivers. Advertise **1–2 human players**. A single-player Hub session may supply the AI opponent; with two humans it must not add an extra competing car.

### AI Hub integration

The inspected contract is [Session Protocol v1](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md), client **1.4.0**, at commit `35a1047f2067b2af3de3943f0fe452f39105d869`. Revalidate against the imported version. Use the official [shared-world example](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/examples/arena.html) as the lifecycle reference.

Inline the released `session.js` **unmodified** as the first script in the head immediately after charset, and include the required session, player-count, mode, goal, and controls metadata. Call `AIHub.connect({mode:'shared-world', seats:[1,2]})` and register lifecycle/message handlers promptly. `null` means standalone. A live Hub session bypasses title, attract, setup, and press-start gates; load the deterministic round and call `AIHub.ready()` once without requiring a gesture.

Use `AIHub.time()` in milliseconds for the common session timeline. It is negative during the Hub countdown and `-Infinity` before start. Do not advance competitive physics until the timeline reaches zero, and do not add a second private countdown. The seed and named retained RNG streams select the course/configuration consistently.

The host simulates both cars, route validation, contact, scores, and results. Guests send sequenced control intents to `info.host`; the host broadcasts compact tick-stamped snapshots. The host can be a server copy with **no local player**, so authority must not depend on `me` having a car, rendering a view, gamepad input, an audio gesture, or a visible menu. Separate player identity from simulation authority.

Use `AIHub.send(data,{to,reliable})` and `AIHub.on('message',...)`; messages are not echoed to their sender. Put continuous input/snapshots on unreliable delivery and configuration, exchange resets, and final rule events on reliable delivery. Validate sender, round, sequence, bounds, and payload shape. Rate-limit traffic below the documented **20 outgoing messages/second per client**, keep unreliable packets below about 1,200 bytes, and stay under the 16 KB JSON ceiling. For two cars, approximately 10 Hz intents and 10 Hz snapshots fit that budget if bursts and reliable events are accounted for.

Interpolate remote presentation and locally predict steering if useful, then reconcile against authoritative snapshots. Only the authority awards points or validates a lap. A snapshot contains enough to recover after a lost event: round/exchange identifiers, state, tick/time, car poses/velocities, checkpoint/route progress, score, and countdown/reset status. Stale input becomes safe braking rather than a permanently held turn.

Report local progress from authoritative state using the documented progress API. On win or `time-up`, **only the host** calls `AIHub.finish(...)` with every remaining human player represented once in best-first standings, grouping ties. Do not use the ghost-mode result API for shared-world completion. Respect the Hub’s time limit and grace window. Remove departed guests appropriately; host departure voids a shared-world round under the contract. Do not invent host migration. On `end`, stop control, simulation traffic, and sound, and leave the subsequent UI/navigation to the Hub.

Never create WebRTC, WebSocket, EventSource, a broker, custom chat, emotes, or player naming inside a Hub session. Use Hub names/colours as text and the provided messaging transport. Balance-changing dev actions are disabled in competitive sessions; read-only diagnostics remain useful.

### Standalone play

The official session client supplies **no standalone lobby or transport**. Implement both couch Duel and a real standalone direct connection so online play outside the Hub is also covered. Use a transport interface beneath the same authority/input/snapshot code; do not implement a second game simulation.

Provide a standalone-only WebRTC data-channel connection with manual offer/answer exchange. A host shares an invitation after ICE gathering; the joiner pastes it and returns a reply; the host pastes that reply. These are complete signalling descriptions, not short room codes. Use an accessible, large-step connection screen with copy/paste controls and a fallback selectable text field or text-file import/export. No sign-in or unspecified custom signalling server is required. A configurable STUN service can assist internet peers; direct connectivity is not guaranteed across every NAT without TURN. Make timeout, rejection, cancellation, and failure actionable and truthful, and offer couch play or Hub play when a direct connection cannot be established. Do not silently relabel same-machine tabs as internet play. See the [WebRTC peer-connection guidance](https://webrtc.org/getting-started/peer-connections) and [STUN/TURN explanation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols).

Implement non-trickle ICE correctly: create data channels before the offer, set the local description, wait for ICE gathering to complete, and export the resulting `pc.localDescription`, including gathered candidates. The guest sets that remote description, creates/sets its answer, waits for its own gathering completion, and exports its resulting local description. The host imports the answer. Bound waits and implement cancellation/retry. This follows the [data-channel sample](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Simple_RTCDataChannel_sample) and [ICE gathering lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icegatheringstatechange_event).

Use a reliable ordered channel for setup/rule events and a channel configured with `{ordered:false,maxRetransmits:0}` for continuous state when supported. Bound `bufferedAmount` and drop obsolete snapshots rather than queueing delay. Validate invitations/replies and remote messages, version the protocol, and prohibit starting incompatible builds/configurations. Use a reliable-only fallback with bounded queues if necessary. Ready both peers, confirm the course and matched competitive preset, then start from the host’s countdown. Distinguish transient disconnects from final connection failure, apply a finite recovery timeout, and end a failed match cleanly. A disconnected guest can return to the standalone lobby with a clear result; a vanished host ends that match. No host migration is required. Follow the [data-channel configuration contract](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel).

Instantiate this transport **only after standalone mode is established**. Ordinary solo/couch play must still launch from `file://` without a signalling service or network request. Feature-detect WebRTC and secure-context support; handle clipboard permission failures with native text/file fallbacks. Data-channel play requires no microphone or camera permission. Test direct connection between two browser contexts with actual `RTCPeerConnection` objects; label externally untested network conditions honestly in feedback. File origins and clipboard access vary; use the browser’s observed behaviour, guided by [secure-context rules](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts).

## 9. Engine integration and project structure

The inspected handoff is **0.89.1**, commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Read its README, API card, driving module, KART kit, asset format, and relevant tests before coding. Keep the full engine and adapt the kit’s car/race setup to overhead rendering. Preserve upstream license notices and record local changes. Engine [packaging/headless guidance](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/README.md) and [actual driving implementation](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/modules/drive.js) are the implementation references.

Prefer plain JavaScript modules plus a small deterministic Node build pipeline. Do not introduce a UI framework or new renderer to replace working native infrastructure. Suggested organization:

| Relative path | Responsibility |
| --- | --- |
| `vendor/engine/` | Pinned full handoff, notices, and clearly recorded modifications |
| `vendor/hub/` | Released unmodified session client and local conformance fixtures |
| `src/main.js` | Boot, dependency setup, standalone/Hub branching |
| `src/sim/` | World/vehicle state, fixed-step update, surfaces, collisions, gates, time trial and Duel rules |
| `src/data/` | Validated region, circuits, cars, tour, settings, and tuning defaults |
| `src/ai/` | Legal driving, speed planning, recovery, difficulty, showcase director |
| `src/input/` | Device bindings, analog normalization, seat assignment, touch assistance |
| `src/presentation/` | World/car drawing, procedural animation, camera, effects, audio |
| `src/ui/` | Front end, HUD, focus, pause, settings, About/Credits, connection screens |
| `src/net/` | Shared authority protocol, Hub adapter, standalone-only peer adapter |
| `src/dev/` | Inspectors, live tuning, overlays, reproducible test bridge |
| `tools/build.mjs` | Validates data and emits the prescribed single-file deliverable |
| `tools/test.mjs` | One quiet entry point for applicable automated checks |
| `tests/` | Rule, simulation, input, browser, audio, network, packaging, and complete-playthrough checks |
| `docs/` | Research, architecture/authoring notes, issue ledger, validation evidence, feedback notes |

Expose a small, read-only runtime snapshot and deliberate test actions: get current state, advance controlled simulation where supported, set a test input intent, and read errors/events. Keep it separate from competitive authority and unavailable as an online cheat. Avoid tests coupled to transient draw calls or DOM implementation details.

### Known engine fixes to address early

1. **Countdown and stopping:** the existing race countdown supplies brake from rest, while the car model can reverse under braking. Anchor/freeze grid bodies before GO and verify no reverse creep. Recovery staging needs the same protection. During ordinary driving, holding brake at rest must hold zero speed; releasing must resume auto acceleration.
2. **Analog input:** the input-instance path can turn trigger values into booleans. Normalize with `input.value(action)` and pass explicit `{steer,gas,brake,drift}` intents so intermediate pressure survives. Drift remains zero unless an authored handling feature needs it; no kart boost.
3. **Progress:** replace or supplement global `path.nearest` and distance-bin checkpoints with the directed-gate/road-edge system above. Keep one authoritative progression owner.
4. **HUD:** adapt the default kart HUD; remove item slots and replace tiny information with the sparse TV-readable race HUD.
5. **Contact:** verify circular car collisions for coincident bodies, stationary contact, and fast scenery impacts. Improve the model only where observed failures require it.
6. **Pause and input:** extend native menu/focus/bindings rather than stacking another incompatible pause/input loop. Use live overlays online and disable automatic focus/visibility/controller-loss pausing for network authority.

Upstream generic instructions that conflict with this build’s required Hub integration, permitted dependencies, or installed-browser rules do not override the build brief. Do not download browsers or install another game engine.

## 10. Dev mode, saves, and attract mode

Dev mode is reachable from pause with normal controls. Include course/car selection, restart at gate, free camera, invulnerability for solo testing, AI driving, seed display, gate/collision/route overlays, state inspection, and a way to finish or reset the current tour step. Make enabled cheats obvious and mark affected records unranked.

Expose important balance values as real live sliders: speed scale, acceleration, braking, steering, road/grass/gravel grip, crash threshold, AI pace, lead distance, and duel score target. Show value and default, apply changes at safe boundaries when required, and include a reliable reset-to-defaults action. Shared matched profiles remain matched. Do not allow remote competitive clients to change rules; a host may select a new agreed preset between standalone matches, not mid-round.

Version and validate settings, discoveries, personal bests, and ghost data. Recover from absent, corrupt, or incompatible storage. Storage failure under `file://` must not block playing. Separate ordinary player records, test/dev records, and transient Hub session storage.

After **10 seconds without meaningful input on standalone title/menu screens**, enter a looping AI-played showcase. Show road driving, all five course identities, a time-trial finish, an exploration connection, and duel scoring/restarts across the loop. A subtle DEMO indicator and one clear exit prompt are enough. Any meaningful input exits immediately and is consumed, restoring the prior menu/focus; it must not also launch a race or change a selection. Preserve settings, saves, and any pending connection setup, and make the attract run unable to write records or unlocks. Never run attract inside an active Hub session or a paused live match.

Use the real game systems for the showcase, with permitted AI cheats and fallback resets so it never gets stuck. The acceptance playthrough uses legitimate driving separately; a cheating attract replay is not evidence that the game is completable.

## 11. Build order and milestone gates

### A. Establish the working foundation

Research the source, choose the title privately with the required RNG procedure, import pinned engine/Hub references, and run a small native driving/headless proof. Define settings, world coordinates, data schemas, state ownership, transport envelopes, and rule invariants before dividing work. Inspect the KART kit rather than copying it wholesale.

**Gate:** a native overhead car drives a real road; gas/brake/steer values are continuous; countdown holds still; pause/focus works; the build pipeline can already emit a file-openable single HTML.

### B. Finish one representative circuit end to end

Create a course with bends, scenery, grass, gravel, water, a parallel road, valid gates, and restart anchors. Implement both a complete timed run and a complete AI duel, including scoring, recovery, results, retry, and the sparse HUD. Establish handling and car-profile differences here.

**Gate:** legitimate scripted drivers finish both modes; wrong-way and shortcut attempts cannot cheat progress; all incident priority cases pass; no placeholder screens remain along these loops.

### C. Complete the connected region and tour

Author the other four circuits, connectors, landmarks, hidden straight, remaining car bodies/animations, free drive, personal records/ghost, and the guided tour. Drive every circuit with every handling profile; adjust impossible geometry and unintentional hazards. Add the authoring guide and dev overlays while the data model is fresh.

**Gate:** the full tour reaches its ending; all five routes have valid laps and restart positions; discoveries persist; every mechanic is taught or demonstrated; all content can be chosen directly.

### D. Complete input and multiplayer

Integrate local seat assignment and the shared-world Hub adapter against the real harness early enough to expose architectural problems. Finish the standalone peer connection and shared authority handling. Verify no-local-player authority, latency/loss, disconnects, countdowns, authoritative score events, and exact session completion.

**Gate:** two emulated players finish a Duel in local, direct-peer, and Hub paths; Hub server-copy and host-leave scenarios behave as documented; no forbidden side transport opens inside a Hub round.

### E. Finish presentation and accessible operation

Integrate final native art, procedural animation, audio, music default, touch assistance, dynamic prompts, settings, attract tour, complete credits, and all error/empty states. Inspect representative stills and motion sequences for what state tests cannot judge.

**Gate:** a controller can traverse every screen; title-to-ending and replay are coherent; sound signals are measurable; attract enters/exits correctly; no mode leaks its audio, inputs, storage, or actors into another.

### F. Package, verify, and report

Build the final HTML, run the relevant final checks on the actual deliverable, repair failures, fill real feedback and source information, validate the required reporting JSON, and publish to the brief’s exact destination. Finish all requested reports and the in-game About/Credits before declaring completion.

Do not substitute an earlier milestone for the finished assignment. When a shared implementation changes, run the meaningful tests it affects. Avoid repeatedly rerunning unrelated green checks just to accumulate output.

## 12. Verification and evidence

Keep all automated validation behind **`node tools/test.mjs`**, with filters for affected subsystems and a final comprehensive mode. It prints only failures and a one-line count; capture verbose diagnostics in local evidence files when needed. Meaningful tests should assert external behaviour and game invariants, not mirror implementation expressions.

Use engine headless simulation first: `E.Game({headless:true,draw:true})`, `game.advance(...)`, input helpers, snapshots, and the error list are available. Adapt supplied kit tests and use browser tooling where engine-only tests cannot cover the behaviour. The [handoff tools](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/README.md) include checks, filmstrips, and replay support.

| Area | Required evidence |
| --- | --- |
| Handling | Four distinct profiles; matched tan/blue identical; braking and surfaces change motion; analog partial pressure differs from zero/full; reset/countdown never creep backwards; long brake hold stops at rest and release resumes acceleration |
| Route validity | Forward ordered gates pass; wrong-way, missing gates, nearby roads, start-line oscillation, shortcuts, and recovery cannot manufacture laps or lead points |
| Duel | Crash +2, lead +1, simultaneous-crash tie, crash/lead priority, manual recovery, safe restart, winning threshold, deadline draw, rematch/reset all behave once |
| AI/content | Legal AI laps on every circuit/profile; finite stuck recovery; every restart anchor safe; no inaccessible tour objective; all five circuits reachable |
| Whole game | Input-driven title → tour → every stage → ending → results → replay, plus a five-lap time trial and a complete scored Duel; do not use finish/teleport cheats as the success path |
| Input/UI | Standard-mapping pad stub, reconnect, trigger pressure, keyboard/mouse, focus/hover, PS/Xbox switch, same-screen menus, modal back, local seat separation |
| Touch | Phone/tablet profiles, simultaneous steer/brake, contextual recovery, pause, safe areas, interruption cleanup, readable landscape layout |
| Attract | Absent at 9.9 seconds; begins at 10 seconds of meaningful inactivity; each input device exits; input consumed; no save changes; never starts in active sessions |
| Dev/storage | All sliders alter the intended value, reset restores defaults, records stay separated, corrupt storage recovers, disabled online cheats cannot mutate authority |
| Audio | Offline render or analyser demonstrates nonzero bounded engine/SFX/music/voice output, music initial gain .10, sliders/mute work, no runaway loops or clipping after retries |
| Network | Real two-peer authority, stale/reordered input, duplicate events, snapshots after packet loss, guest leave, host loss, actorless server copy, focus/visibility loss, controller disconnect, time-up and end cleanup |
| Packaging | Final HTML opens through file URL; no missing local fetch/import/assets; no audio files; unchanged Hub client in correct position; notices preserved; JSON parses; required screens/metadata exist |

For Hub conformance, keep its harness, bridge, and round support together under `vendor/hub/` and serve the development folder on loopback with an OS-assigned port. Open the actual game through the [official harness](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/harness.html), passing its relative game URL and `players=1` or `players=2` with `auto=1`. Cover ordinary sessions, approximately 150 ms latency/50 ms jitter/5% loss, `scenario=host-leave`, and shared-world `scenario=server`. Verify `document.body.dataset.complete === 'true'` **and** `window.__hubCheck.pass === true`; completion alone is insufficient. Incorporate the official checker if available. Its random driving proves protocol conformance, not successful gameplay, so retain the legitimate game playthrough.

For standalone direct play, exercise the actual invitation/reply screens and real channels through start, driving, contact, points, finish, and rematch. Cover malformed/truncated descriptions, wrong description type, incompatible builds, duplicate replies, gathering/connection timeout, clipboard rejection, cancellation, and host/guest closure. Inject application-level delay/loss around the real transport to test authority without substituting a fake connection. Try both the final file URL and loopback path in supported browsers. Instrument forbidden transport constructors to fail if invoked in a live Hub session. Local two-context success does not prove cross-NAT internet or TURN coverage; record those as unknown unless tested.

Use installed Playwright and browsers. In Python, use the dedicated Playwright interpreter provided by the environment, not system Python. Keep at most one or two browser processes open, closing contexts when done. Test core rendering/input in Chromium, then compatible WebKit paths; Firefox has no WebGL in this environment, so report the observed renderer support rather than promise it. Stub `navigator.getGamepads()` for controller checks and use touch device profiles. There is no physical controller, listener, second person, TV, or real iOS device; test their available stand-ins and say what remains unconfirmed.

Use screenshots for composition, TV readability, route clarity, touch clutter, native style, and About/Credits; use a short filmstrip for car lean, wheels, skids, recovery, camera, and UI motion. Do not use a screenshot to prove a scoring rule. Do not use a nonblank canvas as proof of a complete game.

Maintain an issue ledger with unique issues, severity, test that exposed each, fix, and confirming rerun. Count issues, not repeated occurrences. Record the most/least helpful actual tests while building so feedback is factual. No FPS profiling or optimization gate is required.

## 13. Packaging, provenance, and final reporting

Develop in modules, then inline engine, game, procedural assets, styles, and the unmodified Hub client into the single deliverable. Escape embedded closing-script sequences safely. Prefer no external runtime dependencies for the ordinary 2D/solo/couch path. An optional network service for direct connectivity must not become a hidden boot requirement. Open the final artifact itself after bundling; testing only the module development page is insufficient.

Keep build products, caches, evidence, and source under the assigned development area. Use no sibling project material. Prefer file URLs and headless tools; if a server is needed, bind `127.0.0.1` on an OS-chosen port, verify the page identity, record the PID, and stop only processes started for this build. Do not use shared-port guesses, broad process kills, or system installation to solve local setup.

The in-game About/Credits and final chat reply must both include **Source Information, Testing Feedback, Engine Feedback, and Prompt Feedback**. Make credits navigable with a controller and readable at TV distance, using pages rather than a dense spreadsheet. The required machine-readable build exit interview must follow the brief’s exact object schema, with every value filled and unknown facts written as `unknown`.

Source information must cover date from the build brief; source; actual supplied plan filename; genre and perspective; real stack/dependency versions; art; animation; synthesized music/SFX/gibberish voices; actual online features; allowed testing parameters; research; Codex CLI headless/Linux environment; OpenAI gpt-6.1-sol at ultra effort; and usage exactly **`added on import`**. Do not estimate cost, tokens, or time. Catalogue fields must reflect the actual title, Racing genre, source/franchise, 1–2 human-player support, controls, description, and 3–6 lowercase tags. Never claim that real-world hardware, external internet connectivity, or listening was verified when only stand-ins were available.

Answer all feedback questions explicitly, in their required order:

- **Testing:** number of issues found; number critical/game-breaking; most helpful test; least helpful test.
- **Engine:** most liked; where stuck or guessed wrong; most important self-built system; hardest engine aspect; engine changes and why, or none; one desired engine change.
- **Prompt:** most liked; confusing aspects; hardest part; desired prompt change.

Use evidence from this build, not the planner’s observations, for those answers. Preserve upstream notices and distinguish engine code, original art/code, and reference research. Validate the reporting JSON’s exact structure and parseability through the test command.

**Completion means:** all five connected courses and five cars work; the tour finishes; every mode has a real start, middle, finish, and replay path; controller/touch/keyboard operation is complete; dev tuning and attract work; standalone and Hub multiplayer are demonstrated with the permitted stand-ins; the single HTML works; all required feedback and provenance are present. No TODO, placeholder, fake room, dead button, or unimplemented advertised feature remains.
