# Direction and build plan

## 1. Your assignment

Build an original, finished rescue-maze arcade game inspired by **Turtles (1983)**. The player should feel like a small, determined caretaker outwitting an increasingly clever infestation, with a delighted hatchling clinging to their shell. Rescue is the purpose; bombs create opportunities to escape.

You are gpt-6.1-sol ultracode with a 1.05M context window. Use that capacity to understand the actual engine, keep the whole game's contracts consistent, integrate every required mode, and finish the presentation. This plan describes a complete production target, not a prototype followed by a list of possible improvements. Make implementation decisions autonomously, and revisit them when playtesting produces evidence. Extra capacity should produce a more coherent game, rather than unrelated systems or excessive documentation.

Read your own CEO brief first. It supplies your delivery identifiers, metadata, exact output locations, and final reporting requirements. **Choose your own title:** silently brainstorm 50 playful riffs on the source name, then select one with a real random number generator. This plan supplies no title. Derive all delivery filenames and the development directory name from your own brief; do not copy identifiers from another run.

Every local path below is relative to your development directory. Keep your working files there. The final HTML and required root metadata belong in the containing delivery folder, under the names specified by your own brief. The suggested internal organization is adjustable.

## 2. Research and source interpretation

Use the **1983 US Odyssey² hotel-rescue release** as the primary reference. The year alone is ambiguous because multiple ports appeared in 1983; record this interpretation rather than claiming it is uniquely established. Basic Videopac equivalents are useful secondary references, but enhanced Videopac+ versions can change the scenario. Do not confuse this game with Teenage Mutant Ninja Turtles. The arcade ancestor dates to 1981.

The original [1983 US manual](https://odyssey2.info/library/manuals/us_turtles/Turtles%20%28USA%29.pdf) establishes the essential loop: investigate question marks in a hotel maze; uncover a baby turtle or a beetle; carry one baby on your back to a home at the edge. Beetles progress from blue wandering to yellow line-of-sight pursuit and red pursuit around corners. Limited bug bombs temporarily disable them, permit safe passage, and return them to their least intelligent state. A flashing central supply point replenishes bombs; only one bomb can be active. Completing rescues advances to a harder floor. The manual also establishes music through The Voice accessory. Its life-count wording is inconsistent, so choose and document clear rules for this game.

The [1983 release entry](https://odyssey2.info/db/game/turtles-47) corroborates the platform and describes hotel intermissions, an attract sequence, and Voice-generated music. Its title sequence and the manual's illustrations are useful visual references. The [historical review](https://odyssey2.info/reviews/turtles-117) distinguishes the port's floor/layout structure and describes its vocal musical texture. Historical counts are reference material, not a content quota for this original demo.

Before implementation, inspect the manual's pictures and a clearly identified gameplay recording or documented screenshots. Investigate mechanics, layouts/progression, enemies, visual language, and sound separately. If footage or audio cannot be directly inspected, state that in the research record; do not say it was watched or heard. Save brief evidence, links, observations, and uncertainties in `./docs/research.md`.

Preserve the recognizable relationships: mystery rooms, a visible passenger, distant sanctuary, maturing pursuers, a scarce defensive trap, central resupply, and an upward journey. Invent the layouts, character designs, music, writing, and presentation. The new game's authorship should be apparent through its hotel world, expressive animation, cooperative tactics, and authored rescue routes.

## 3. The game we are making

**Genre:** arcade maze-rescue action with route-planning decisions. **Perspective:** fixed overhead 2D play using the engine's native projection and pixel renderer. Show the entire playable floor. Use a brief three-quarter hotel view for introductions and floor transitions if it improves the sense of ascent. Keep gameplay directions consistent and the camera still during threats.

**Players:** one or two. Standalone play supports solo and simultaneous shared-screen local co-op. AI Hub supports a genuinely synchronized two-player shared-world cooperative campaign. Both use the same rules and content. This explicitly defines the standalone multiplayer requirement: local co-op works without a service; remote co-op uses AI Hub. Do not imply that the Hub client supplies independent standalone rooms.

**Campaign:** five authored floors, four distinct maze arrangements, a conclusive rooftop rescue, and a short celebration. Aim for approximately 10–15 minutes for a new player, with faster repeat runs. Duration is a tuning target, not a reason to pad corridors. Every mechanic must be taught, combined under pressure, and used before the ending. Include complete failure, retry, results, and replay flows.

**Player promise:** discover someone who needs help, choose a route home, make a clever defensive play, and see the rescue pay off. A single successful delivery should be rewarding even before the score changes.

Keep the action vocabulary compact: movement and one defensive action. Avoid adding weapons, platforming, crafting, a skill tree, or a boss health bar. Difficulty comes from routes, information, timing, supply, and coordinated rescues. High scores and better runs provide replay value.

The tone is cheerful arcade urgency: earnest turtles, officious hotel furnishings, mischievous beetles, oversized punctuation, and concise instructions. Use playful original copy and synthesized gibberish reactions. A delivery is a tiny reunion; taking a hit is a startled shell retreat. Avoid lengthy dialogue or cruel outcomes.

## 4. Establish the real engine base

Use the supplied [engine handoff](https://github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff). Planning inspection found **v0.89.1**, commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Pin the version you actually download and record it; inspect changes if the supplied version differs.

The handoff is a dependency-free 2D engine with procedural shaded pixel rendering, projection, continuous character rigs, tile/grid systems, native UI/input/audio, and headless stepping. Start from its arcade kit's maze slice. Retain the engine as the game's foundation, including its art and animation conventions. A decorative engine import alongside an unrelated canvas implementation would miss the brief.

Download the handoff into `./vendor/engine/`. Read its README and complete API document before designing adapters; the large context window makes this practical. Use its API index and guide to locate the relevant recipes. Inspect the arcade kit, assets documentation, native input/settings implementations, rig examples, audio synthesis, and headless examples. Do not read unrelated projects or generated asset dumps merely to fill context.

Use these verified capabilities as starting points, checking signatures against the pinned copy:

- `E.Game` owns the loop and a 1/120-second simulation step. Headless games support `advance(seconds)`, input actions, optional drawing, and captured draw errors. Advance through scene transitions in tests; their default fade takes time.
- `E.TileMap` provides tiles, cell/center conversion, collision, draw, and walkability. `E.Grid.from(map)` supports navigation. Maintain one authoritative graph derived from the same level data.
- The engine's `overhead` view gives the full maze the clearest reading. Use its coordinate and projection helpers instead of assuming screen coordinates equal every view's ground coordinates.
- Render actors, sprites, shapes, fonts, and UI through native facilities. Use native pixel primitives and depth ordering for new art; preserve a consistent pixel scale. Generic hotel props may use the asset library after inspecting its catalogue.
- Extend native menus, settings, input labels, and touch hooks. The engine already handles much of pause, rebinding, fullscreen, and device changes. Explicitly select PlayStation glyphs as the initial setting; the engine's automatic default is insufficient for this brief.
- Native settings definitions support sliders with live apply callbacks. Native drag steering and contextual touch buttons can underpin the required touch controls.
- Native synthesized audio, instrument definitions, music, and separate buses fit the all-code audio requirement.
- `E.Arcade` provides useful attract, scoring, and arcade-shell facilities, but its two-player mode is **alternating turns**. Our simultaneous co-op must own its team state and seat controls. Do not accidentally inherit alternating-player death or save behavior.

Use the full engine initially. Remove the kit's global scene/view-cycling shortcuts from normal play so they cannot break the fixed camera or expose unrelated demos. Do not add the 3D addon or another rendering/game engine without a concrete need. Fix or extend the supplied engine when warranted, keeping a concise change log and an upstream version reference. Performance targets and optimization are out of scope; spend visual effort on readability and character.

## 5. Rules that must be unambiguous

Put rules in a simulation independent of rendering, local menus, audio playback, and transport. The following are original game defaults, not claims about the historical cartridge. Tune them through play while preserving their relationships.

### Movement and interaction

Use four-way movement on a corridor graph with continuous visible travel between cell centers. Buffer the next turn briefly and allow sensible corner forgiveness. Reversal should feel immediate. Resolve diagonal input consistently, preserve the most recently intended cardinal direction, and prevent diagonal shortcuts through walls. Swept movement/contact must catch actors crossing between ticks.

Suggested initial speed is 3.5 tiles/second, approximately 10% slower while carrying. Encounters should be escapable through good routing. Avoid a pursuer that wins a straight race against a carrying turtle with no available response.

Entering a mystery room while empty-handed reveals its preassigned contents. Seed the reveal deck when a floor begins; do not reroll it by approaching differently or reconnecting. The first instructional reveal is guaranteed to be a baby. Each floor has a known authored rescue quota. Unknown rooms that contain only beetles need not be opened to finish the floor.

A baby visibly climbs onto the shell. Reserve a reachable home on the outer edge and mark it with the passenger's matching symbol and color. A carrying turtle cannot open another room or silently replace its passenger. Entering the assigned home's delivery zone completes the rescue automatically. Keep target selection deterministic and reserve distinct destinations for simultaneous passengers.

Delivery consists of approach, hop-down, welcoming light, a short musical response, and an unmistakable rescue-counter change. The interaction resolves once in the simulation; animation completion must not be the authority for scoring. Gameplay should resume promptly without a lengthy modal screen.

### Beetle behavior

Each beetle uses the same navigation graph, a seeded random stream, explicit state, and elapsed age:

| State | Behavior | Communication |
| --- | --- | --- |
| Blue wanderer | Chooses legal corridor turns without tracking the player. | Rounded silhouette, loose antennae, relaxed scuttle. |
| Yellow lookout | Detects a turtle along an unobstructed corridor; pursues to the last seen junction, then searches. | Alert antennae, a brief sight-line cue, sharp chirp on acquisition. |
| Red tracker | Routes around corners toward an authoritative target, reconsidering at junctions. | Distinct angular shell markings, purposeful gait, warning pulse. |
| Stunned | Harmless and passable for a limited time; recovers as a blue wanderer with age reset. | Clearly stopped feet, wobble/stars, recovery anticipation. |

Use color plus silhouette, motion, and sound. Give escalation a short warning. Initial age thresholds might be 18 and 42 seconds; initial speeds might be 2.2, 2.6, and 2.9 tiles/second. Later floors increase pressure chiefly through layout and encounter composition. Expose these relationships as balance data.

When both players are valid targets, choose deterministically using reachability and distance, with hysteresis so a beetle does not oscillate between them every tick. Do not read future input. Room-spawned beetles have a short, clearly animated emergence delay so revealing one cannot cause an unavoidable same-frame hit. Reset/recovery positions must never overlap a live threat.

### Bombs and supply

Use one active bug bomb for the **team**, preserving the source's important tactical constraint. Both players can place it; a clear HUD indicator explains when it is already active. Use shared stock, initially three, capped at five. Placing a bomb is an edge-triggered action and costs exactly one unit when accepted. Invalid placements consume nothing.

Plant at the turtle's valid current corridor position, leaving room to escape. An enemy crossing it triggers a localized stun; the planter and passenger remain unharmed. Define the affected area in rules and communicate it visually. Start with a six-second untriggered lifetime and three-second stun. Expiration frees the active slot. A turtle taking a hit does not leave a permanently occupied bomb slot.

The central supply station is a visible landmark and a routing temptation. Start with two units per pickup and a six-second recharge. Require a fresh entry to collect after a recharge; camping must not generate an unbounded inventory or repeated sounds. Station availability, pending recharge, and accepted pickups are authoritative. At zero stock, an attempted action gives immediate, distinct feedback and a useful supply cue.

### Hits, progress, score, and completion

Start a normal run with three team life icons. A damaging contact removes one. The final loss ends the run; there is no ambiguous extra-life count. Briefly retract the struck turtle, then respawn it at a safe authored location with clear temporary invulnerability. A short team damage grace prevents one pile-up from consuming every life. In co-op, the other turtle can keep acting.

A carried baby returns to its revealed origin room after a hit; release its home reservation. It remains visibly revealed and available for recollection. Discovery points apply only once per baby per floor, including after hits. Already delivered babies remain safe. Preserve sensible stock and provide recurring supply so a mistake cannot produce a resource softlock. A retry starts a clean run; a separate practice floor selector belongs in dev mode.

Use one shared team score: an initial proposal is 100 for discovery, 400 for delivery, 50 for a beetle's first stun on that floor, and a small clear bonus. Further stuns of that beetle award no points, preventing farming. Show score changes close to the event without obscuring routes. Keep local bests for solo and co-op; separate assisted/dev runs from ordinary records.

A floor clears only when every required baby has been delivered, including all passengers currently carried. Resolve simultaneous pickups, hits, stuns, final deliveries, and scene changes in a documented order. Stable entity/seat ordering must give the same result on every replay. Freeze further encounter resolution once a terminal transition has been committed.

After the last floor, show the rescued family leaving together, then a complete result screen with score, rescues, time, and a clear next action. Losing has an equally complete result/retry flow. Hub session completion follows its lifecycle instead of offering an independent rematch.

## 6. Author the whole campaign

Use five compact floors. Names here describe spaces and may be changed; they are not a game title. Each floor has an authored opening, several viable routes, a resupply trade-off, and a late rescue that tests its lesson.

| Floor | Place and structure | Content and teaching purpose |
| --- | --- | --- |
| 1 | Welcoming lobby; broad loop and clear sight lines. | Four babies; a gentle wanderer; guaranteed safe first pickup. Teach passenger, home, bomb, supply, and floor clear through actual play. Escalation still exists so lingering demonstrates the danger. |
| 2 | Laundry/service corridors; paired loops and connecting junctions. | Five babies, two initial beetles, one decoy room. Teach yellow detection, breaking sight, deliberate bomb placement, and central resupply under pursuit. |
| 3 | Conservatory; asymmetric branches and a loop around the supply point. | Five babies, three initial beetles, two decoys. Make red tracking and stun-to-blue recovery relevant. Long and short delivery routes should both be useful. |
| 4 | Upper guest floor; ring route with cross-links and tempting side rooms. | Six babies, three initial beetles, two decoys. Combine carrying pressure, branching pursuits, supply timing, and co-op role choices. Place a safe route around every potential trap. |
| 5 | Roof garden/evacuation landing; a fresh composition of the established route grammar. | Six babies, four initial beetles, two decoys. A demanding but fair final sequence uses every rule, ending with a visible group evacuation. No new unexplained mechanic at the finish. |

Use four distinct navigational layouts; the roof may deliberately transform one earlier layout rather than merely changing its palette. A grid around 21 by 13 cells at the native 16-unit tile scale is a useful starting point. Adjust it for the actual renderer and TV/mobile framing. Keep routes legible, not mathematically maximal.

In two-player mode, retain the same rescue objectives. If playtesting makes it too easy, add a data-defined extra beetle on later floors before changing fundamental speeds. Both turtles can carry independently, pass through one another, scout different branches, and lure pursuers away from a partner. There is no player damage or collision-based griefing. Do not require simultaneous switches, so losing a connection cannot make a floor structurally impossible.

Give each floor a distinct palette, wall treatment, sound accent, and one memorable piece of hotel staging. Put detailed scenery outside navigable corridors. The ending should visually pay off the ascent established by the title sequence and short floor intermissions. Transitions are skippable through the normal confirm action and never hide an uninitialized next stage.

Content must be data-driven: tile rows/legend, mystery-room outcomes, homes, safe spawns, beetle starts/presets, supply location, palette, decorations, and tutorial cues. Provide validation for disconnected corridors, invalid cells, unreachable required rooms/homes, spawn conflicts, missing quotas, and impossible objective counts. Every co-op floor needs at least two distinct home slots reachable from every rescue room, with reservations cleared correctly on delivery, hit, leave, and floor reset. Treat an unavailable reservation as a failed pickup without consuming or losing the baby, and surface it as a content/state error during validation. Document how to create another floor with the same systems in `./docs/authoring.md`. A readable grid format and documented presets are sufficient; a general-purpose editor is unnecessary.

## 7. Art and animation direction

Build on native shaded pixel art. Give the hotel a warm miniature-toy quality: mossy shells, cream and amber sanctuary lights, dark ink corridors, colorful beetles, small plants, brass bells, luggage, and numbered doors. Danger and safe destinations must remain distinct from decoration. The maze is readable before it is ornate.

Create bespoke adult turtle, hatchling, and beetle bodies; generic humanoid substitutions will not carry this game. The adult needs a recognizable patterned shell, head, four feet, retract pose, and room for the baby. A second rescuer has a different shell pattern and small accessory, not just a hue shift. Match player/passenger/home identity with symbols as well as color.

Use the engine's continuous rig/timer/easing approach. Its blob and character examples can provide gait, squash, projection, and sorted-part foundations; customize anatomy and motion. Do not replace native animation with unrelated frame-strip machinery. Keep gameplay positions authoritative while rigs add expressive offsets.

Complete this animation vocabulary: idle breathing/blink; directional walk; turning; carrying gait and baby peeking; discovery/climb-on; bomb plant; delivery/hop-down; hurt/retraction; invulnerable recovery; beetle wander/alert/chase/stun/recovery; stair or lift transition; final family celebration. Connect anticipation, contact, and follow-through. A hatchling should react to a narrow escape, and delivery should feel different from merely deleting a sprite.

Use brief native particles and light accents for discovery, supply readiness, stun, and reunions. Limit flashes and offer reduced motion. Keep effects from covering walls or disguising an enemy's collision state. Verify silhouettes and critical poses at their actual displayed size, including portrait touch screens.

## 8. Input, screens, and accessibility

All devices use the same game structure and screens. Controller navigation must reach every action: title, solo/co-op selection, instructions, settings, pause, developer tools, results, and About/Credits. Use a visible focus state, reliable back behavior, and deliberate repeat timing. Keep the playfield within TV safe areas. At 1920×1080, ordinary menu text should read comfortably from across a room; approximately 32 output pixels or larger is a useful check. Avoid dense tables and small web-style panels.

| Device | Gameplay | Menus |
| --- | --- | --- |
| Standard-mapped pad | Left stick or D-pad moves; Cross places bomb; Options pauses. | D-pad/stick navigates; Cross confirms; Circle backs out; left/right adjusts sliders. |
| Keyboard | WASD or arrows move in solo; Space places bomb; Escape pauses. | Arrows/WASD, Enter, Escape; native pointer interaction remains available. |
| Mouse | Click a reachable tile/room/home to route there; right-click places a bomb. Manual movement cancels routing. | Hover moves focus; click activates; drag/click sliders. |
| Touch | Invisible drag stick with four-way assistance; one contextual bomb affordance when useful; contextual auto-defence assistance. | Large tap targets and one persistent menu button. |

There is no aiming mechanic, so do not invent mouse aiming. Click routing must obey the same graph and collision rules and stop/replan safely after a transition or hit. It must not reveal hidden room contents. Mouse movement and hover should feel intentional rather than fighting pad focus.

Local co-op supports two pads, keyboard plus pad, and a shared-keyboard option. In shared-keyboard mode use WASD/Space for one rescuer and arrows/Right Shift for the other; show this mapping clearly. In solo, both movement key sets control the one rescuer. Assign seats explicitly so a keyboard and the first pad do not unintentionally drive both avatars. Handle pad unplug/reconnect with a usable recovery flow. Single-device touch play may remain solo; describe this honestly rather than showing an unusable join button.

Prompts follow the last meaningful input. Default to PlayStation glyphs, offer Xbox glyphs in Settings, and use keys/mouse buttons for keyboard/mouse. Ignore small axis noise and synthetic pointer motion when changing device or resetting idle timers. Preserve native Hub controller chords rather than binding over them.

For touch, reserve UI hit regions before feeding movement. Support movement with one finger and a contextual action with another. Use generous corridor snapping, buffered turns, and an optional imminent-contact auto-bomb when stock and the active slot allow it. Clearly show assisted status; keep assisted records separate. Avoid a permanent virtual controller overlay. Fit the entire floor in landscape and portrait; reuse the same HUD components, reflowing them into safe space rather than cropping routes or creating a separate desktop-style interface.

The compact HUD needs floor, rescued/required, team lives, bomb stock/active status, and score. Reveal contextual guidance only when useful. Provide music/SFX/voice volumes, glyph choice, input settings, reduced motion/flashes, and touch assistance. No required setting or slider may be mouse-only.

## 9. Procedural audio

All music, effects, and voices originate in code through Web Audio/native synthesis. Include no audio files or disguised embedded recordings. Make an original buoyant, short-loop tune with a light vocal/synth texture that recalls the source's playful electronic character. Add a restrained pursuit layer and a satisfying rescue cadence without obscuring warnings.

Use distinct cues for room reveal, baby pickup, home activation, delivery, bomb placement, trigger, expiry, empty stock, supply ready/pickup, beetle detection/escalation/recovery, hit, floor clear, menu focus/confirm, and final victory. Make short turtle/baby vocalizations with oscillators/noise/formant-like filtering and changing pseudo-syllables. Voices are gibberish, not recorded speech or text-to-speech.

Set the actual persistent music default and gain to **0.10**. The settings screen must agree with the audible bus. Separate music, SFX, and voice controls, all respecting master mute. Unlock the audio context from a valid gesture, handle suspended contexts, and avoid duplicate schedules after pause, retry, attract restart, or Hub transitions. An unattended attract sequence must still work visually when autoplay policy prevents sound.

Exercise the real synthesizer through OfflineAudioContext or analyser checks: finite/non-silent output, sensible levels, correct buses, mute behavior, and no growing duplicate music graphs. State honestly that these establish generated signal behavior, not a human listening judgment.

## 10. Title, attract, pause, and dev mode

The title introduces the hotel and rescuers, presents clear Play/Local Co-op/How to Play/Settings/About choices, and reaches real play promptly. Do not ship the engine kit's title, unrelated slices, example credits, or decorative menu entries without behavior.

After **10 seconds** without meaningful input on the title/main menu, launch a looping AI-driven demonstration. Configure the native arcade facility explicitly; its default idle period differs. Use the real simulation and content with a separate demo session. A bot can inspect state, route perfectly, and use cheats. It must show discovery, carrying, delivery, bombs, refill, escalating beetles, multiple floors, and the ending before looping. Use a conspicuous demo label and a brief invitation to play. Two bot rescuers may briefly demonstrate co-op.

Any meaningful key, mouse action, touch, or pad action exits attract immediately. Consume that input so it cannot also launch a run or activate a menu choice. Clear held state as appropriate. Demo sessions never save scores, alter campaign progress, dirty settings, or leak into a real run. Do not start attract during actual play, a pause screen, an active settings modal, or a Hub session.

Standalone pause stops the shared local simulation and offers resume, restart, settings, developer mode, About/Credits, and return to title. Online pause is a local overlay; label that the world continues, suppress that player's movement, and follow Hub's own quit/restart rules. Do not freeze the host world because a client opened a menu.

Developer mode is a finished controller-accessible screen reachable from pause. Include floor selection/restart, invulnerability, refill, reveal-room data, spawn/clear encounter tools, single-step/time scale where appropriate, graph/LOS/collision overlays, entity/phase inspection, and a reset of balance defaults. Expose live sliders for player speed, carrying multiplier, beetle speed, escalation thresholds, stun duration, bomb lifetime, and supply recharge. Give sliders sensible ranges and enforce cross-field constraints.

Keep defaults immutable and changes observable on the running simulation. Mark a run as practice/unranked when cheats or balance changes are used. Resetting defaults must not silently erase unrelated accessibility/audio preferences. In production Hub sessions, players have a read-only inspector; authoritative mutation is available only to the host in an explicit test/dev session. Dedicated server hosting must work without someone navigating its UI. Never let a client-only slider create a divergent world.

## 11. Multiplayer and AI Hub contract

Read and follow the actual [Hub protocol and client documentation](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), including the shared-world example and supplied harness. Planning inspection found **Session Protocol v1, client 1.4.0**, commit `35a1047f2067b2af3de3943f0fe452f39105d869`. Record the version actually embedded. Keep the client unmodified.

### Standalone

When `AIHub.connect` resolves null, run the normal title/attract/solo/local-co-op application. Local co-op owns one simulation and two independently assigned input seats. It must be genuine simultaneous cooperative play, with shared objectives, damage rules, supply, score, transitions, and results. It must work from the final HTML without an online backend.

Do not advertise a standalone remote lobby that has no transport. An informational note may explain that remote co-op is available when launched through AI Hub. The supplied session client does not provide rendezvous outside Hub; do not turn a null result into a fake online room or add an undocumented signaling service.

### Embedded shared-world co-op

Inline the unmodified session client as the first script in the document head immediately after charset. Declare `hub:session` as `1`, `hub:session-players` as `1-2`, and `hub:session-mode` as `shared-world`; also supply the documented goal, how-to, and optional duration metadata. Connect with `AIHub.connect({mode:'shared-world',seats:[1,2]})`. Verify these values against the pinned docs if the protocol changes. A session may start with one player; a full advertised co-op session supports two.

In an active session, bypass title, attract, local join, and blocking gameplay menus. Register lifecycle handlers, initialize the scene, and call `ready()` exactly once without a Start-button gate. `start` arrives three seconds before play: hold authoritative gameplay until Hub time reaches zero. Hub time is in milliseconds and may be negative or not yet finite; do not treat it as ordinary elapsed seconds.

One host owns simulation, room contents, passengers/home reservations, enemy AI, bomb stock, damage, score, floor advancement, and completion. Clients send intentions and render authoritative outcomes. Handle a dedicated host with `AIHub.server === true`: it has no player seat but must still run the complete world and lifecycle. Never assume the host is one of the turtles. Use native `live:true` for shared-session game instances so menu/focus/controller overlays do not silently stop world updates; set `autoPause:false` for the dedicated host. Follow Hub's focus/visibility and suspension policy rather than letting ordinary standalone auto-pause govern a session host.

Use a small, versioned application protocol with session/run identity, floor identity, tick/snapshot sequence, stable entity IDs, and event IDs. Read seat/host identifiers from the documented API rather than inventing field names. Derive the sender's seat from the authenticated transport sender; validate direction ranges, button edges, sequencing, rate, and phase. Clients cannot submit rescues, scores, spawns, or positions as authoritative facts.

Input changes plus modest heartbeats and roughly 10 snapshots/second are a reasonable starting point. Respect the documented **20 messages/second per copy**, burst allowance, JSON size limit, and preference for small unreliable messages. Coalesce routine updates; use reliable delivery for important phase/outcome messages. Keep snapshots sufficient for recovery after a dropped packet. Use explicit named RNG streams; shared-world mode does not automatically seed all Math.random calls. Cosmetic randomness must never alter simulation outcomes.

Give the locally controlled turtle responsive movement through bounded prediction/reconciliation using the same maze collision rules; interpolate remote presentation. Bomb effects, room reveals, rescues, and hits still require host acceptance. Duplicate or reordered messages must not duplicate a delivery, spend stock twice, or rewind a floor. Reinitialize all transient references on authoritative floor changes.

Handle player leave without leaving a passenger or reservation stranded. If one player remains, continue the same completable campaign with a clear notification; remove or safely settle the departed seat's temporary state. Follow Hub's documented host-loss behavior, which voids the round; do not invent host migration. Handle `time-up` within the provided grace and stop input, audio, and outgoing traffic on `end`.

Only the authoritative host calls shared-world `finish` once, using the documented cooperative outcome/standings schema. Use the same completed-campaign objective for everyone; a team failure is a team outcome. Do not substitute the parallel-mode `result` API. Hub controls its outer results, quitting, and next round. No custom chat, names, sockets, broker, or unrelated room UI inside sessions.

## 12. Suggested implementation shape

Keep boundaries clear without turning the project into a framework. For example:

```text
./package.json
./vendor/engine/          pinned handoff and license/provenance
./vendor/hub/             pinned client and local harness dependencies
./src/main.js             boot and environment/session selection
./src/game/               simulation, rules, input intents, bots, run lifecycle
./src/content/            floor definitions, balance, enemy presets, music data
./src/art/                native turtle/beetle rigs, hotel tiles/props, effects
./src/ui/                 screens, HUD, dev tools, credits content
./src/net/                Hub lifecycle, authority, messages, interpolation
./tools/build.mjs         deterministic single-HTML packaging
./tools/verify.mjs        quiet test orchestrator
./tests/                  behavior, campaign, input, Hub, audio, export checks
./docs/research.md
./docs/authoring.md
./docs/validation.md
./build/                  staged previews and final-bundle test copies
```

The important contracts are:

- A run has a mode, seed/streams, phase, floor, tick, seats, team resources, objective state, and explicit terminal state.
- Input becomes device-independent intentions, with edge-triggered bomb requests. Bots, local devices, test traces, and remote clients all use this boundary.
- A simulation step consumes accepted intentions and produces state plus identified events. Presentation consumes events without causing rules changes.
- Content describes a floor completely. Rendering and navigation derive from it rather than maintaining hand-edited competing maps.
- Session adapters own startup, authority, pause policy, persistence policy, and finish reporting. They do not fork the core game into separate solo and online rule sets.
- A stable debug snapshot exposes assertions such as phase, positions/cells, room contents, carried IDs, target homes, stock, active bomb, enemy state, score, lives, and run flags. Test hooks stay out of normal player flow.

If delegating work, split along these interfaces: native art/animation, simulation/content, and Hub/input validation are useful independent areas. Agree on state/events first and give each worker distinct files or a worktree. Keep one integrator responsible for the exported build and ordinary playthrough. Read and run contributions; do not accept a module's completion claim as integration evidence.

## 13. Build order and completion gates

1. **Groundwork and export proof.** Finish source/engine/protocol inspection, select the title correctly, pin dependencies, define state/content contracts, and create the packager. Show an engine-native map and moving custom-body prototype from a single staged HTML opened with `file://`. Prove Hub handshake separately at this early point. This catches packaging and lifecycle mistakes before content multiplies.
2. **One complete floor.** Implement buffered movement, reveal/carry/home/delivery, all beetle states, bomb/refill, hits/respawn, score, victory/failure, and retry. Use a finished first-floor layout. Clear it through normal actions. Replace temporary art during this gate rather than allowing it to become the final identity.
3. **Co-op and authority.** Add independent local seats and the shared-world host/client adapter. Exercise simultaneous discoveries/deliveries, a dedicated host, lost messages, and a leaving player before authoring the rest. The same floor must finish in all supported modes.
4. **Complete campaign.** Author all floors, transitions, tutorial beats, escalating encounters, and the ending. Complete an ordinary uncheated run from title to victory. Ensure a designer can add a floor through data and validation without editing core rules.
5. **Full player shell.** Finish device prompts, mouse routing, touch assistance, all menus, audio settings, About/Credits, dev tools/sliders, persistence, attract loop, and results. Add expressive rigs, hotel staging, effects, and all procedural audio cues. No dead menu items or sample text may remain.
6. **Delivery validation.** Test the exact final bundled HTML and metadata, close resource/process leaks, record actual findings, and deliver the artifact required by the brief. Completion means every gate passed or an unavoidable environmental limitation was accurately stated; it does not mean an unimplemented feature was renamed a limitation.

Integrate continuously. Do not postpone packaging, multiplayer, touch, or metadata until after spending the whole effort on scenery. Do not stop after the first playable floor: that floor establishes the pipeline for finishing the specified demo.

## 14. Verification that earns confidence

Keep all checks behind **one command**, for example `npm run verify`, with optional suite selection through that command. It prints failure details and one final count line, suppressing routine passes and harness chatter. Track unique issues found, severity, fix, and covering check in `./docs/validation.md`; feedback counts must come from that record. Rerun covered checks after relevant changes, not repeatedly against unchanged code. Run the final relevant set after bundling changes.

Prefer native headless stepping for rules and full campaign tests. Use browser automation where actual DOM/input/audio/export/Hub behavior matters. Reuse installed browsers; the supplied environment has Playwright 1.63.0. Keep one or two browsers open, closing contexts and processes you created. For Hub's multi-copy harness, use pages/iframes in those browsers rather than launching a browser for every seat.

Required behavioral evidence:

| Area | Checks that matter |
| --- | --- |
| Maze movement | Buffered turns, reversal, diagonal resolution, wall/corner handling, swept contact, carrying speed, mouse-route cancellation. |
| Objective integrity | Seeded reveal outcomes, one passenger per turtle, distinct/reachable homes, no second pickup while carrying, exactly-once delivery/score, dropped-baby recovery, final clear only after all deliveries. |
| Pursuit and defence | Blue/yellow/red detection differences, obstruction and corner pursuit, warning/escalation, emergence grace, stock/active-slot rules, expiration, stun safety/recovery, recharge entry rules, zero-stock feedback. |
| Damage and lifecycle | Safe spawn, invulnerability and team grace, preservation of delivered progress, terminal loss, clean retry, simultaneous final events, no leaked actor/home references across floors. |
| Ordinary full run | A deterministic input-driven bot or replay completes every floor and reaches the ending with production balance, finite lives, and no cheats, teleports, direct objective edits, or forced clears. It must exercise all mechanics. Separate controlled fixtures cover failure and rare races. |
| Local co-op | Two independently driven seats act simultaneously, carry to different homes, share stock/lives/score correctly, survive device replacement, advance together, and complete a campaign. |
| Menus and input | Stub a standard gamepad and navigate every screen/slider, including dev mode and About. Verify default PS and optional Xbox prompts, keyboard/mouse focus, pause/back, controller noise, and touch multitouch/UI exclusion. Complete representative gameplay with touch actions. |
| Attract | No demo before the threshold, demo at 10 seconds, required mechanic coverage, loop reset, every input class exits and is consumed, no storage/progress contamination. Hub never starts attract. |
| Dev and persistence | Sliders affect actual rules, reset restores defaults, constraints hold, cheats mark practice, ordinary restart clears transient overrides, local records/settings persist where storage is available, denied storage degrades safely. |
| Audio | Actual generated buffers/levels, finite samples, useful signal, music default 0.10, bus/mute behavior, gesture unlock, pause/retry/attract/end cleanup without duplicate schedules. |
| Final export | Open the packaged file itself, confirm scene/game identity, start and complete gameplay, exercise menus, catch runtime/draw errors, and detect missing local imports/assets or accidental filesystem dependencies. |

For the full run, a bot may inspect a debug snapshot to choose legal inputs, but must play through the real input/rules boundary and accept normal hazards. Demo cheats belong only to attract tests. A success flag set by test code is not a playthrough.

Use the Hub's provided harness, bridge, round support, and documented checks. Serve your copies on `127.0.0.1` using an OS-selected port. Confirm the loaded game is this build. Cover normal two-player play, the documented latency/jitter/loss controls, dedicated server hosting, player leave, host leave, time-up, and end cleanup. Poll the harness completion marker and require its actual check result to pass; a page loading is insufficient. Verify a synchronized full campaign, not merely two matching screenshots or a successful handshake.

Screenshots are for matters scripts cannot establish: title hierarchy, the whole maze's readability, focus/glyph legibility at TV distance, character poses, carry/home pairing, danger clarity, and mobile composition. Capture a small purposeful set at 1920×1080 plus representative phone/tablet sizes, including an intense late floor and a contextual touch action. Use native filmstrips to inspect animation continuity when useful. Fix what these reveal. Do not turn screenshot volume into a substitute for playing or state checks.

Use the documented stand-ins for absent hardware: standard-mapped gamepad stubs, touch profiles, WebKit's closest supported phone profile, generated audio analysis, and two browser pages. Report those as emulation/automation, without claiming a real controller, phone, TV, remote human, or listening test. FPS targets, profiling, and an optimization phase are outside this brief.

## 15. Packaging, provenance, and finish

Produce one shareable HTML under your own brief's exact filename. Inline the engine, selected assets/rigs, game, metadata content, and unmodified Hub client in the correct order. A deterministic Node packager with ordinary inline scripts/IIFEs is sufficient; source modules are fine during development. Escape every case-insensitive closing-script sequence inside embedded JavaScript before insertion. Avoid runtime relative imports, local asset fetches, or dependence on the development server. Include appropriate license/provenance information.

Downloaded dependencies are allowed by the brief, but the required engine and procedural art/audio permit a robust self-contained baseline. If an external dependency is genuinely useful, pin its version, declare it honestly, and test the final file's behavior when it is unavailable. Do not claim complete offline operation while relying on a CDN.

Keep development and generated working files inside your designated directory. Do not inspect neighboring agent runs. Prefer `file://` and headless engine tools. If a server is needed, bind loopback on an OS-picked port, retain its PID, verify page identity, and stop only your process. Do not reinstall already supplied browsers or start GUI applications. Unlimited visual performance scope does not override shared-machine process etiquette.

Populate the required Source Information, Testing Feedback, Engine Feedback, and Prompt Feedback in **both** the in-game About/Credits and the builder's final chat reply. Preserve the exact source-information fields and ordered questions from your own brief. Use your actual selected genre, perspective, stack/version, native art and animation approach, procedural audio, supported multiplayer modes, research, and tested parameters. The Plan field identifies the plan actually supplied to you. Use your own assigned date/environment/model information. Usage is literally **added on import**; do not estimate it. Unknown facts are **unknown**.

Create the required root exit-interview JSON with the exact schema in your own brief, including the catalogue object. Fill every field with factual plain text and choose the catalogue genre from its allowed list; Action is appropriate here. State the real player count and control support. Keep catalogue title/tagline/description, title screen, About information, and JSON consistent. Preserve the expected feedback array lengths and order. Parse and validate the file, rather than relying on visual inspection. Do not confuse the builder's required interview with a planner's separate prompt review.

Before delivery, remove temporary art, test-only menu entries, TODOs, stubs, fake networking, and sample engine attribution masquerading as game information. Ensure every visible option works and every advertised mechanic occurs in the campaign. Test the final export after the last packaging change. Deliver the actual game, the required metadata, and an honest account of the evidence behind completion.
