# Director's plan

Build a complete arcade siege: one fortress, three successive lines of defense, and a last stand that can actually be won. The player should remember the pull of a gravity bomb, the relief of cooling an overloaded fortress, and the moment their interceptor becomes the last gun on the ground. Make every menu, encounter, effect, and network state belong to that game.

This plan is for gpt-6.1-sol ultracode with the supplied 1.05M context window. Use that capacity to understand the engine and integration contracts together, keep the whole game's state model coherent, and complete the full vertical slice. It is an implementation brief, not a request for another planning round. Make routine decisions, implement, verify, and finish. The CEO's brief controls deliverable names and requirements wherever they differ from this plan.

All proposed development paths below are relative to your assigned development folder. Create that folder and place the final artifact at the locations specified by your own brief; this plan deliberately does not reproduce their names.

## 1. Establish the source and choose your title

Use **Space Fortress, Century Electronics/CVS, 1981** as the source interpretation. The title and year are ambiguous: an Astrocade game and a Zaccaria release also exist. This plan chooses the Century arcade game because its three-scenario retreat is an unusually strong foundation. State this interpretation in your research notes and credits. Do not silently combine it with the unrelated cognitive-training game or the Astrocade four-direction shooter.

The evidence that informs this direction is:

- The [original Century sales flyer](https://flyers.arcade-museum.com/videogames/show/3233), with its [original illustrated text](https://flyers.arcade-museum.com/videogame-flyers/3/space-fortress-03229-01.jpg), describes Fortress 13, a Viper interceptor, the Dronian Empire, scouts and gravity bombs, accumulating fortress energy discharged through radiators, and military promotion.
- The [Museum of the Game entry](https://www.arcade-museum.com/Videogame/space-fortress) and [MobyGames description](https://www.mobygames.com/game/233640/space-fortress/) document three scenarios: free flight, central-ship defense, and a ground defense with horizontal movement. Loss advances the original's stages. MobyGames also reports fuel and fuel replenishment from destroyed gravity bombs; treat those details as secondary-source evidence.
- The [MAME CVS driver](https://github.com/mamedev/mame/blob/master/src/mame/misc/cvs.cpp) corroborates the Century release, color-raster display and speech hardware. Exact music, scoring tables and transition timings remain unknown.

Before implementing, inspect the flyer and representative footage of this specific version, then read the engine and Hub sources below. Record what you actually inspected in `docs/research.md`, including links, revisions, uncertainties and the deliberate departures in this plan. Historical fidelity concerns the structure and feeling; exact original timings and scores are unnecessary.

**The title is yours.** Silently brainstorm 50 playful riffs on the source's name and select one with an actual random-number generator. Do not substitute a favorite after drawing. Use the result consistently in the game, catalogue and the deliverable naming scheme specified in your brief. This plan supplies no candidate title.

## 2. The game to make

**Genre:** fixed-screen arcade action shooter with inertial flight, objective defense and score attack. **Perspective:** overhead in the first two acts; a clearly announced side-view firing line in the final act. Both use the engine's native 2D rendering. No camera orbit or aiming in depth is required.

**Promise:** repel a siege across three connected defensive layers. Surviving well makes the next stand stronger; losing a layer advances the story with a tangible cost rather than hiding the rest of the demo behind a game-over screen. The final battle has a real victory and defeat.

Ship these modes, all using the same simulation and encounter data:

| Mode | Intended experience |
| --- | --- |
| Solo siege | The complete authored campaign, approximately 10–12 minutes of active play on a successful run, with all tools and enemies introduced through play. |
| Standalone couch co-op | 2–4 independent ships sharing one arena, entered through a simple join screen. Solo remains one button away. |
| AI Hub co-op | 1–4 players in the same siege, with an authoritative host and a valid dedicated-host path. Online transport comes from the Hub. |
| Attract mode | A looping AI demonstration spanning all three acts, entered after exactly 10 seconds of title/menu inactivity. |

Standalone multiplayer means couch play; online co-op is available through AI Hub. Describe this accurately in the menus and credits. Do not show an unsupported standalone internet-room screen. No competitive mode, inventory grid, crafting, open world, or separate progression game is needed.

The standalone main menu needs Play, Co-op, Settings and About/Credits. Results offer retry and title; pause offers resume, settings, controls, dev mode and an appropriate exit. Adapt those choices to the active Hub lifecycle rather than presenting invalid actions.

### The moment-to-moment loop

Read a threat's silhouette and wind-up; accelerate into a firing lane; shoot its vulnerable part; use a boost or defensive pulse when boxed in; collect the resulting charge; redirect attention to the objective before its danger meter fills. Advance a wave, receive a brief tactical update, then confront a recombination of the tools you already understand.

Keep the player's active kit small and useful throughout:

- **Laser:** sustained fire with clear cadence and instant feedback. A short impact flash, recoil, sparks and pitch variation distinguish a hit from a miss. The visual beam must agree with collision.
- **Inertial movement:** responsive directional thrust with readable drift and automatic drag. A skilled player can coast through a firing lane; a new player can recover without mastering a flight simulator.
- **Boost:** a brief directional burst drawing on a visible energy reserve. Energy recovers slowly, and gravity-hazard kills drop an extra refill. Empty energy disables boost, never basic movement or shooting.
- **Defensive pulse:** a rechargeable, local projectile-clearing shove with a visible readiness cue. It buys space and disrupts a tractor lock; it does not erase an entire wave or damage the objective.

Use a small source-inspired resource economy rather than several overlapping meters. Ship hull, boost reserve and pulse readiness belong near the ship or its compact player badge. The team objective has one large danger meter. Label that meter **heat** during the fortress act so players understand that it rises toward failure, while final base integrity falls toward failure. Animate and explain the change.

Friendly fire is off. Players do not collide with each other. Pickups are shared team benefits or owner-neutral grants, so four players are not fighting over the only useful resource.

### Three connected acts

The durations below are pacing targets, not padding requirements. Encounters advance on explicit objectives, with a bounded timeout fallback so a missed enemy cannot stall the campaign.

| Act | Play and teaching | Payoff and transition |
| --- | --- | --- |
| Outer perimeter | Free-flight interception. Begin with movement and shooting in a safe skirmish, then introduce hunters, bombers and a visibly charging gravity anchor. The player learns drift, boost, pulse and weak points. Three authored encounter beats culminate in breaking the siege ship's escort screen. | A successful break earns a defense bonus. If the interceptor line is overwhelmed, show an emergency extraction and a reduced bonus. Either outcome brings the player to the central fortress with an unmistakable change of objective. |
| Fortress orbit | Defend the central installation against rammers, marked bomber lanes and tractor ships. Hits add heat; functioning radiator sections cool it after a short hit-free interval. A radiator under lock is visibly disabled until its attacker is destroyed. Three beats escalate from a single obvious threat to coordinated attacks. | Survive the evacuation countdown and destroy the siege ship's shield relays. A successful hold preserves stronger ground defenses. Heat overflow forces an early retreat with damaged defenses, then advances to the last stand. |
| Ground line | Interceptors dock into mobile gun carriages along the bottom of the scene. Movement is horizontal; firing covers the upper field. Introduce dive formations, then the full combination of bomber lanes and gravity hazards in this new geometry. | The recurring siege ship descends as the final boss. Defeat it before the ground base is destroyed. Show a real ending, team score, rank, act outcomes and rematch flow. |

The siege ship is one recurring antagonist, visible in the background before it becomes the final boss. Its three final phases remix recognizable patterns: side batteries mark lanes, tractor emitters expose weak points while pulling, then the exposed core alternates volleys and cooling windows. Every phase needs an unmistakable wind-up, a safe response and visible progress. Do not create a separate unexplained mechanic for the final blow.

At act boundaries, use a short playable or animated transition showing the physical retreat, then at most one screen of instructions. Preserve team score and individual upgrades. Clear obsolete projectiles and hazards. No damage can sneak through a cinematic, loading transition or join screen.

Keep the redeploy/wipe rule explicit: while at least one teammate is alive, a destroyed pilot returns after a short delay with temporary invulnerability and a score/combo penalty. If nobody remains alive, the team wipes immediately rather than waiting for pending redeploys. In solo, losing the only pilot is therefore a wipe. During the first two acts, a wipe consumes that defensive layer and invokes its retreat transition; during the final act it ends the run, as does base integrity reaching zero. Give solo hull and encounter pressure an appropriate default so this rule remains fair. Prevent respawn and last-enemy timing from granting both victory and defeat on the same tick; define and test a single resolution priority.

### Enemy and encounter language

Create a concise bestiary with different jobs. These names are production descriptions, not a mandated vocabulary for the finished fiction.

| Threat | Readable cue | Player response |
| --- | --- | --- |
| Hunter | Narrow dart, bright nose, brief aim line before a burst. | Cut across its line, then punish the recovery. |
| Bomber | Broad silhouette, opening bomb bay, marked impact lane. | Intercept before release or leave the lane. |
| Scout / gravity anchor | Small carrier; a dropped anchor expands concentric inward-moving rings before pull begins. | Destroy the anchor for charge, or boost across its pull. Never hide the hazard inside decorative particles. |
| Rammer drone | Solid wedge, pulsing chevrons, commits to a visible route toward the objective. | Prioritize interception; its objective damage makes ignoring it consequential. |
| Tractor ship | Forked shape and a tether that changes from acquisition to lock. | Break line/range, pulse free, or shoot its emitter. Clamp forces so a recoverable lock remains recoverable. |
| Dive formation | Linked silhouettes telegraph their arc together, then separate into marked dives. | Read the formation, reposition horizontally, clear a gap. |
| Siege ship | Persistent large silhouette; individual batteries, emitters and core have distinct activation animations. | Apply the lessons of the three acts to exposed components. |

Introduce each threat alone or in an easy pairing before combining it with others. Spawn schedules must express intention: pressure from one side, a recovery pocket, then an objective threat. Use authored wave data with seeded variation, rather than merely raising a random spawn rate. Spawn outside the safe player radius and telegraph entry.

At each of the two intermissions, offer a choice between three concise upgrades: stronger focused laser, longer boost reserve, or faster pulse recharge. They should change a parameter visibly without adding new buttons. Each participant chooses independently; solo sees the same screen. A disconnected or idle participant gets a sensible default after a clearly shown short countdown. These are run upgrades, not a persistent unlock tree. All branches must work, and a default build must be able to win.

Score rewards threat kills, protected-objective bonuses, surviving a layer and an uninterrupted hit/kill chain. Make multiplier gain and loss visible. Damage, redeploys and forced retreats have defined penalties. End with a military-style rank based on authored, recorded thresholds; present it as this game's scoring system, not a reconstruction of the original. Store standalone best score and settings locally with a safe fallback if storage is unavailable. Hub finishes use actual run results and finite numeric scores; no claimed global leaderboard without one.

## 3. Art, animation, sound and writing

Use the engine's shaded procedural pixel style: crisp silhouettes, hue-shifted shade ramps, metal panels, luminous weapon cores, colored rim lights, stars and restrained atmospheric depth. Keep the combat plane unambiguous. The target is a finished arcade machine with rich pixel artwork, not a collection of primitive collision shapes.

Make custom assets for player ships, every enemy, the evolving fortress, radiator sections, gravity anchors, boss components, ground carriages, pickups and the title composition. Use the generic asset library only where a generic prop is appropriate. Player 1–4 need a visible number and different markings as well as different accent colors. Enemy silhouettes and danger patterns must survive grayscale viewing.

Build the title image from the actual fortress and ships. Show its lights, antennas, traffic and looming attacker in motion. Let the act backgrounds describe a continuous location: outer debris and distant station, the station at combat scale, then its damaged ground installation under the same sky. After each retreat, retain a few visible signs of what happened. Those signs need not simulate arbitrary destruction.

Use native sprite animation, tweens, scripted sequences and state-driven motion. Required animation states include idle/thrust/boost, laser recoil, shield hit and break, pulse expansion, enemy acquisition and recovery, anchor deployment/charge/collapse, radiator cooling and overload, boss component opening/destruction, docking, retreat and victory. Timing for collision and invulnerability comes from simulation state, not the end of an independently playing visual tween. Clear transient animations on restart and snapshot restoration.

Compose all audio in code with Web Audio through the engine's buses:

- A restrained military synth motif on the title; increasingly urgent variations for each act; a boss arrangement; brief victory and defeat cadences.
- Separate, identifiable sounds for laser fire/hit, shield crack, pickup, pulse, gravity charge, tractor lock and objective warning. Prioritize warnings over dense combat chatter.
- Short synthesized gibberish radio voices paired with readable captions: a clipped briefing, urgent warning, relieved extraction and triumphant sign-off. Do not use intelligible speech synthesis, recorded samples or audio files.

Set **music to 10% by default**, SFX and voice separately adjustable. Respect a returning player's saved settings. Audio unlock follows a real gesture, while rendering, menus, attract and Hub readiness remain functional without one. Pause/visibility, device loss, mute, retry and session-end must not leave oscillators or music layers running. Use both visual and audio warnings so hearing is never required.

Write terse arcade military captions with a slight theatrical flourish. Let a half-dozen good lines carry the fiction; do not put a codex or long dialogue in front of the action. Instructions explain the immediate opportunity: what threatens the fortress, what the player can do, and how to see success.

## 4. Controller-first UX across devices

Design at a 1920×1080 ten-foot view, with a generous safe margin, large text, short labels and an obvious focused item. Use the same screen hierarchy on keyboard/mouse, controller and touch. Menu hover moves focus; click activates. Every screen and slider can be reached, adjusted and exited using a standard-mapped pad alone.

The intended controls are:

| Action | Standard pad, PlayStation prompts by default | Keyboard/mouse |
| --- | --- | --- |
| Move / directional thrust | Left stick; horizontal movement in the ground act. | WASD; A/D on the ground, with arrow-key movement available if convenient. |
| Aim | Right stick; limited to the upper firing arc on the ground. Without aim input, retain a sensible last heading. | Mouse world position; clamp to the same legal arc on the ground. |
| Fire | R2. | Left mouse button. |
| Boost | L2, along movement intent or facing if neutral. | Space. |
| Defensive pulse | Square. | Right mouse button; E as an alternate binding. |
| Confirm / back | Cross / Circle. | Enter / Escape, plus native click targets. |
| Pause | Options, except the Hub-reserved Create+Options chord. | Escape. |

Let the engine's last-device tracking drive all prompts, including tutorials and dev mode. Default to PlayStation glyphs and retain the Settings choice for Xbox A/B/X/Y glyphs. Use a deadzone and meaningful-activity threshold so stick drift does not constantly change glyphs, navigate menus or cancel attract mode. Rebinding must update the displayed labels.

On touch, provide an invisible floating left thumbstick. A right-side drag aims and fires; when unused, assist aim at the most relevant visible threat and assist firing during combat. A context-sensitive pulse affordance appears only when the action is useful and ready. Add a similarly conditional boost affordance only where touch testing shows it is needed; do not create a permanent wall of controls. Keep the menu button reachable, support two simultaneous contacts, handle cancellation cleanly, and ensure taps on menus do not fire into gameplay. Explain the invisible controls with a brief first-use hint that fades.

The playfield is a normalized, fixed logical arena shared by every participant. Viewport aspect ratio must not alter enemy positions, objective boundaries, range or difficulty. Set explicit logical dimensions with the engine's `res: [logicalW, logicalH]` and `expand: false`, rather than inheriting the starter's expanding world. Fit the full arena on portrait devices with safe letterboxing or restrained framing; use remaining space for legible UI. Mouse and touch coordinates must map through that transform. Favor legibility over cropping out a threat to fill the display.

Settings include music/SFX/voice, glyph set, movement/aim assistance, screen shake and reduced flashes. Use finite bounded defaults; accessibility choices must survive a restart. Keep the HUD to objective danger, current act/wave, team score and compact player status. Put full controls and credits on separate readable pages rather than shrinking everything to fit.

### Attract mode and dev tools

Use a clean simulation instance or a clean run reset for attract. At 10 seconds without meaningful input on the title/menu, begin a compressed AI tour: free flight, gravity escape, core defense, then the boss last stand. It may cheat to ensure a strong demonstration. Loop after the result with a visible DEMO label and an input-to-return hint. Any meaningful key, button, pointer action, touch or stick movement returns to the title; consume that input so it does not also start a run. Attract cannot write scores, achievements, campaign progress or normal saved state. In an active Hub round it never starts.

Dev mode is reachable from pause with controller navigation. Provide invulnerability, refill/revive, act/wave jump, boss-phase jump, spawn selected enemy, collision/telegraph overlays, seed and state display, simulation single-step and a time-scale control where allowed. Expose live sliders for player thrust/drag, laser damage/cadence, boost recharge, pulse cooldown, enemy aggression, gravity strength, fortress heat per hit/cooling rate and base damage. Show values and units, clamp them, and offer one Reset to defaults action. Balance defaults live in data, not scattered literals.

Standalone pause freezes the simulation. In a Hub round, the menu is a local overlay and neutralizes that player's controls while play continues. Changes that alter shared simulation are host-only and authoritative; disable single-step/time-scale there. Mark a run modified by cheats or balance edits and keep it out of normal best-score records. Read-only inspection can remain available to every participant.

## 5. Use the supplied engine deliberately

The inspected handoff was **my-3D2dge v0.89.1**, at revision `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Resolve and record the revision you actually use. Relevant primary sources are the [handoff README](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/README.md), [API card](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/API.md), [API index](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/API-INDEX.md), [arcade kit](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/kits/arcade.js) and [asset guide](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/docs/ASSETS.md).

Fetch the scoped handoff into `vendor/engine/`. Read the complete API card and the relevant guides; inspect the actual starter implementation before relying on an API. The full `my-3d2dge.js` is dependency-free and includes its 2D modules. Do not load the separate arcade module again after the full engine. Start from the arcade kit's ROCKS slice for useful thrust, drift, wrap and shot examples, then replace the starter game and presentation completely. Do not mistake the arcade helper's alternating turns for simultaneous multiplayer.

Useful verified native facilities include:

| Need | Engine starting point |
| --- | --- |
| Rendering | `E.Game`, `view: 'overhead'`, `E.tones`, `E.ramp`, `E.px`, `E.sprite`, renderer sprite/queue/starfield methods, lights and particles. Switch presentation for the final side-view act without changing the simulation schema. |
| Animation | `E.anim`, rotated/time-indexed sprites, `game.tween`, `game.script`; moving mechanical components are separate sprites or parts. |
| Menus | `E.Shell`, `E.Menu`, native pause/settings extension and pointer focus. Use a TV-readable scale rather than keeping the starter's tiny text. |
| Input | `input.label`, movement/aim/pointer helpers, native rebinding, touch steering and action zones. Convert them into game intents in one adapter. |
| Arcade behavior | `E.Arcade` can help with score/attract lifecycle. Its default idle is 20 seconds, so explicitly set 10 and verify all activity sources. A custom wrapper is acceptable if the helper's turn model gets in the way. |
| Audio | Native procedural sound/music and custom `audio.instrument`; route through music, SFX and voice buses. Native music defaults to 0.5, so override the initial value to 0.1. |
| Headless control | `E.Game({headless:true,draw:true})`, `game.advance(seconds)`, input injection and a game-defined debug snapshot interface. The native fixed update is 1/120 second. Inspect `game.errors`, not just process exit. |

Use the engine's established systems before extending them. Changes are allowed when needed for correct gameplay, accessibility or Hub authority, but record the reason and make the smallest coherent change. Remove the starter's arbitrary view-switch/debug shortcuts from the shipped player flow. This game does not need a different renderer, a 3D physics stack or a generic engine rewrite.

## 6. Architecture for one coherent game

Use modules during development, then bundle. The following is a practical responsibility split; combine or rename files when the engine's structure makes that clearer.

| Dev-relative path | Responsibility |
| --- | --- |
| `src/main.js` | Bootstrap, standalone versus Hub mode, engine construction, scene registration and cleanup. |
| `src/sim/world.js` | Explicit fixed-step state, entity IDs, seeded RNG, collisions, damage, resources, deterministic resolution and serialization. |
| `src/sim/director.js` | Wave scheduler, objective states, act transitions, boss phases, win/loss and rank. |
| `src/data/encounters.js` | All authored beats, spawn patterns, seeds, difficulty curves and condition triggers. |
| `src/data/balance.js` | Validated defaults, live-edit metadata, upgrade modifiers and reset behavior. |
| `src/input.js` | Pad, mouse/keyboard, touch and attract bot converted into the same intent structure. |
| `src/render/` | Arena transform, custom procedural assets, animation state, effects, HUD and camera presentation. |
| `src/ui/` | Title, join, pause, settings, controls, upgrades, results, dev mode and paged credits. |
| `src/audio.js` | Procedural instruments, songs, effects, gibberish and bus lifecycle. |
| `src/online.js` | Hub lifecycle, authority, input validation, packet scheduling, snapshot/reconciliation and finish reporting. |
| `src/about.js` | One factual metadata/feedback source feeding both in-game credits and the final interview output. |
| `tests/` | Simulation, input/UI, audio, packaging and two-context/multi-page Hub checks. |
| `tools/` | Bundle, verify, scoped local-server lifecycle and evidence helpers. |
| `docs/` | Research, decisions, controls, test evidence and an issue ledger for honest feedback counts. |

Define the shared contracts before independent subsystems are developed:

- **RunState:** run/epoch, seed/RNG state, tick, lifecycle, act/wave, objective state, transition timer, upgrades, players, entities, projectiles, score/rank, modified-run flag and result.
- **PlayerIntent:** seat, sequence, movement vector, aim vector, fire/boost/pulse values and any allowed menu-ready choice. Network senders cannot name someone else's seat.
- **Events:** uniquely identified spawns, shots, hits, resource grants, redeploys, upgrade choices, phase changes and result. Reapplying an event cannot double-award score or damage.
- **Snapshot:** version/epoch, authoritative tick, sufficient complete state for recovery, plus each player's last processed input sequence. Do not serialize engine objects, DOM nodes, audio nodes or tweens.
- **Lifecycle:** boot → title/join → briefing → play → transition/upgrade → play → result. Pause, attract and Hub countdown/end have explicit ownership and cannot accidentally tick the wrong world.

Make simulation rendering-independent. Draw calls must not consume gameplay RNG, spawn entities, award score or alter cooldowns. Use separate cosmetic randomness. The same seeded input stream must reproduce the same simulation, including when rendered at different rates or not rendered at all. Collider shapes and animation origins come from shared asset metadata; moving fast shots need swept collision or an equally sound fixed-step solution. Use stable IDs and deterministic tie-breaking for simultaneous hits, kills and objective loss.

Author additional waves with ordinary data: enemy type, spawn position/pattern, trigger, telegraph duration, goal and completion condition. Add a useful validation pass for impossible positions, missing enemy definitions and unreachable progression. Provide a small dev encounter preview with wave jump/reset; a general-purpose editor is unnecessary. Demonstrate that a new wave can be added without editing collision, rendering or networking code.

If you delegate, first settle these contracts and file ownership. Suitable parallel work packages are procedural art/animation, procedural audio, encounter content, and Hub/test integration. Keep a single integration owner responsible for actual playability. Parallel agents should not each invent a separate input loop, run state or menu system.

## 7. AI Hub integration is part of the foundation

Read the current [Hub README](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/README.md), [released client](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/session.js), [shared-world example](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/examples/arena.html), [harness](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/harness.html) and [actual checking CLI](https://github.com/michaelcrosato/ai-hub/blob/main/scripts/hub-check.mjs). At inspection, protocol was v1 and client 1.4.0. Recheck the contract at implementation and follow the released code if it changes.

### Boot and lifecycle

1. Include the released `session.js` **unmodified**, as the first script in the document head immediately after the charset metadata. Follow the current importer requirement exactly. Inline engine/game code after it.
2. Declare the required `hub:session`, `hub:session-players` (`1-4`), `hub:session-mode` (`shared-world`), `hub:session-goal` and `hub:session-howto` metadata, plus a truthful positive `hub:session-minutes` estimate. Do not declare WebGPU required for this 2D game.
3. Call `AIHub.connect({mode:'shared-world',seats:[1,4]})`. A null result enters the standalone title. An active session bypasses title, attract and normal join menus, using Hub-provided identities and ready/countdown UX.
4. Construct world state and subscriptions, then call `AIHub.ready()` once without requiring input or audio unlock. A dedicated host has no player or render surface but still creates and runs the simulation.
5. Only the `isHost` copy simulates gameplay. Gate the start on `AIHub.time() >= 0`; the start event precedes actual play. Neither clients nor the host may move, damage or score during the countdown.
6. On departure, neutralize/remove the departing participant and reconcile the team. The Hub voids host departure; do not invent host migration. The engine's visibility auto-pause must not freeze an active authoritative session unexpectedly.
7. Handle both natural completion and `time-up`, finishing within the supplied grace period. Call `AIHub.finish` once from the host with valid remaining player IDs, a tied co-op standings group, `won`, and any finite scores/stats. Match the exact current schema.
8. On `end`, stop the world, input transmission and sound, and let the Hub own navigation and rematch. In-session menus must not call title/restart/quit navigation. Respect Create+Options reservation, and render Hub names as text.

The standalone game can own full pause/retry. Active Hub games use local overlays and neutral input, never a unilateral pause of the shared world. Do not add chat, voice, emotes, custom identities, raw sockets or an alternative multiplayer transport inside a Hub session.

Own the authoritative clock explicitly. A hidden browser tab can stop RAF even with auto-pause disabled. One verified engine integration is a Hub instance constructed with `{loop:false, live:true, autoPause:false}`, its scenes started normally, and explicit `game.advance` calls from a single scheduler accumulating elapsed session time into 1/120-second steps. Alternatively, step the independent simulation directly through one equally explicit scheduler. Never advance a world through both native scene updates and a second authority loop. Dedicated/headless execution also requires stepping. Rendering stays separate; local menu overlays cannot freeze the host. Test timer throttling, catch-up and end handling, while respecting the Hub's own hidden-host timeout.

Keep the full siege within the round budget. The inspected [round implementation](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/round.js) imposes a 15-minute ceiling. Target 10–12 minutes of active play with brief transitions and intermissions, normally finishing within 13 minutes. Respect the actual `info.limitMs`; budget encounter deadlines and reserve time for every boss phase and the result. Shorten gaps or redundant formation repetitions when necessary, preserving every mechanic. Routine successful play must reach the ending before the Hub ends the round; `time-up` handling is a fallback, not the usual conclusion.

### Replication

Clients send intents, not authoritative positions, damage or score. Apply host-local input directly: the transport does not echo a sender's own messages. Validate identity, sequence, finite values, legal vector ranges and action cadence. Expire stale input into a neutral state so a lost release packet cannot leave a ship firing or boosting forever.

Use an explicit world RNG derived from the provided session seed or `AIHub.rng('world')`; shared-world mode does not seed arbitrary global randomness for you. Store the RNG state for replay and snapshot recovery.

Start with roughly 15 input packets/second per client and 10 snapshot packets/second from the host, interpolating remote motion and reconciling predicted local movement against acknowledged input. Keep authoritative hits and objective transitions on the host. Prediction must not award provisional permanent kills, score or victory.

The current transport permits at most 20 outgoing messages/second per copy and JSON messages up to 16KB. That total includes reliable events. Keep routine unreliable packets around or below 1,200 bytes to avoid fragmentation; the hard JSON limit is not a safe unreliable-packet target. Coalesce event bursts, reserve capacity for lifecycle/keyframes, and measure actual serialized byte size in the largest authored encounter. Prefer compact deltas/quantized coordinates and deterministic projectile descriptions where useful for the transport contract, not as an FPS optimization project. Use reliable bounded keyframes/chunks for larger complete state; label epoch and part count, rate-limit them within the same message budget, and apply only a complete assembly. Never assume reliable events alone restore a late or dropped snapshot. Periodic complete recoverable state is required.

Snapshots must cover phase/objective state, player health and resources, enemy/component state, live hazards/projectiles, upgrades, scores and results. Ignore stale ticks and prior-run epochs. Reconciliation resets visual interpolation/one-shot event tracking as needed; it cannot replay a reward or play the same explosion repeatedly. Verify genuine remote control and convergence under latency/loss, not just that four canvases opened.

## 8. Build order and acceptance gates

Use the gates to protect integration, while completing all the planned content. Do not end at the first playable prototype.

1. **Bootstrap and contracts.** Read the scoped references, select your title, record revisions, create a reproducible bundle and one-command verifier, establish the state schema and transport lifecycle. Gate: a native engine scene opens from the bundled single HTML using `file://`; pad/mouse focus works; a dedicated host can ready and tick without DOM or audio assumptions.
2. **A complete thin siege.** Implement movement, fire, collision, objective danger, damage/redeploy, all three act transitions, the boss state graph and real results. Use simple finished-readable first-pass art, not absent assets. Gate: a deterministic script can win and lose a whole run, including forced retreats, without directly setting the result.
3. **Full mechanical content.** Add all threat behaviors, authored beats, upgrades, shared objectives, couch joining and online intents/snapshots. Gate: every mechanic has a reachable normal-play introduction; 1–4 players can complete the campaign; clients agree on phase, health and scores.
4. **Presentation and usability.** Finish custom assets, all state animations, procedural score/voices/SFX, transitions, HUD, responsive screens, contextual prompts, touch assistance and the 10-second attract tour. Gate: the first minute teaches the core game, and the final act visibly pays it off; menus and dev tools work on pad alone.
5. **Balance and delivery.** Tune live variables against scripted runs and representative manual inspection; run the relevant headless suites and final artifact checks; fill factual credits/interviews; remove every placeholder and abandoned control. Gate: the complete definition of done below passes on the packaged artifact.

The performance budget is deliberately open: add scene detail, effects, lights and shadows that improve the result. Do not invent FPS targets, profiling gates, optimization work or reduced feature scope. Process count, RAM/tmpfs discipline, message limits and shared-machine isolation still apply because they are environment and protocol constraints.

## 9. Verification that proves the game works

Expose one documented command, preferably `npm run verify`, that runs the selected relevant suites and prints **only failures and a one-line count** on success. Child tool chatter should be captured; on failure report the useful assertion and evidence path. Rerun a suite after changing code it covers; once passing, do not repeatedly run unchanged checks. Keep an issue ledger with unique defects, severity, detecting check and fix so exit feedback is factual.

Use native headless simulation for the many fast state checks, real browser automation for DOM/input/Web Audio/packaging, and the Hub harness for session behavior. Browser screenshots are for composition, readability, animation appearance and focus visibility that scripts cannot establish. They are not substitutes for state assertions, and state checks do not substitute for looking at the art.

| Area | Required evidence |
| --- | --- |
| Complete playthrough | A seeded agent completes all three acts, every mandatory threat introduction, both upgrade choices and all boss phases, reaching victory through normal intents. A second script reaches defeat and returns/retries correctly. Fast-forward the real simulation rather than sleeping for campaign duration. |
| Retreat and resources | Exercise both successful and forced act transitions; empty boost still permits movement/fire; heat cools only under the defined conditions; destroyed pilots redeploy correctly; final wipe loses; no simultaneous win/loss. |
| Combat correctness | Hits/misses match collision; swept shots cannot tunnel; gravity and tractor escape are possible; pulse clears only intended hazards; pickups and kill rewards apply once; invulnerability has exact start/end behavior. |
| Reproducibility and reset | Same seed/intents yield identical important snapshots headlessly and with drawing enabled. Retry, attract exit, checkpoint/dev jumps and network resync leave no old entities, timers, held inputs or duplicate audio. |
| Progression/content | Data validation finds missing definitions and invalid spawns. The campaign cannot stall on an offscreen enemy. Exercise every upgrade branch and confirm all three acts remain winnable with a default build. |
| Controller | Inject a standard-mapped gamepad before page load; traverse title, co-op join, settings, pause, dev sliders/reset, credits and results. Verify disconnect handling, deadzones, Xbox option and the Hub-reserved chord. |
| Keyboard/mouse | Real movement, world aim, fire/pulse, clicks, hover focus, Escape/back, rebinding and input-label switching. No pointer aim jump after a resize. |
| Touch | Phone and tablet profiles, portrait and landscape, multi-touch move/aim/fire, menu button, conditional pulse/boost, touch cancel and safe areas. HUD and all arena threats remain visible. |
| Attract | Before 10 seconds it has not started; at the threshold it starts. It tours all acts and loops. Test exit with each meaningful input class and confirm no score/save pollution or input leakage. |
| Audio | OfflineAudioContext or analyser tests produce finite, non-silent music/SFX/voice with bounded levels; new-profile music defaults to 0.1; mute/bus controls and pause/end cleanup work. Report these as signal checks, not human listening. |
| Hub conformance | Current official checker/harness for declared counts, adverse network (including 150ms latency, 50ms jitter and 5% loss), host departure, dedicated hosting and standalone smoke. No warnings, forbidden APIs or stale-client mismatch. |
| Hub gameplay | Remote input really moves and shoots on host; countdown is inert; stale/invalid input is rejected; snapshot convergence includes score, phase, objective and death; local pause leaves world running; authority catches up correctly after timer throttling; successful siege fits the actual round limit; time-up and natural end finish exactly once; after end there is no input traffic or audio. |
| Final artifact | Open the actual delivered HTML from `file://` and through the isolated Hub server. Assert boot, input and a real playable state with no uncaught errors, local import/fetch dependencies or missing assets. Parse metadata and final interview JSON and check them against the displayed credits. |

Include a bot without cheats in at least one meaningful win test, so an invulnerable attract bot cannot conceal broken combat or impossible objectives. A separate high-difficulty stress scenario is useful only if it covers actual unresolved behavior. Do not write hundreds of tests that simply restate constants.

For Hub checks, copy the documented harness, bridge and round support in their expected relative layout under `tests/hub/`, or use the repository's actual checking CLI with its required dependencies. Its documented `node scripts/hub-check.mjs <game>` path is relative to that tool's own repository, not a promise that the handoff contains it. Adapt it behind your verification wrapper. Confirm `document.body.dataset.complete === 'true'` and `window.__hubCheck.pass === true`; also assert your game's actual replicated state.

Use existing browsers and the installed Playwright version; do not download browsers or install system packages. Keep one or two browser processes open, using several pages/contexts for co-op. Prefer the engine headless tools and `file://`. When HTTP is required, start your own server bound to `127.0.0.1` with port 0, capture its assigned port, confirm a unique game marker before testing, and terminate only the PID you started. Keep caches, logs, recordings and generated files within your assigned development folder. Do not inspect adjacent agents' work or use shared `/tmp` for the project.

Visually inspect a small purposeful set: title, each act during a representative threat, final boss, results, controller focus/dev sliders, readable credits, and touch framing. Verify the 1080p ten-foot view. Inspect animations as short filmstrips when a static screenshot cannot reveal a broken transition. Distinguish desktop WebKit emulation from actual iOS testing, synthetic pads from hardware, and analysed signals from listening. Write unknown for unverified claims.

## 10. Packaging, factual credits and the finish line

Bundle engine, released Hub client, game modules, CSS and custom assets into the **single HTML artifact named by your brief**. Procedural art and audio suit an entirely embedded result. Avoid local module imports, runtime fetches of development data and dependence on the dev server. If a truly necessary external dependency is retained, pin and disclose it; the preferred result here needs none for standalone play.

HTML script boundaries are a known trap: embedded JavaScript, including engine comments, may contain a closing-script sequence. Escape those occurrences in bundled engine/game code without changing runtime behavior. Preserve the Hub client's exact released contents and its required first-script placement; if a current release poses an embedding conflict, resolve it according to the current official contract and validate with the actual importer/checker rather than casually patching the client. Inspect and test the generated artifact itself, not only the development page.

Provide an About/Credits flow with clearly readable pages for **Source Information, Testing Feedback, Engine Feedback and Prompt Feedback**. Drive it and the builder's required exit interview from the same factual data. Fill the exact schema and answer every question in its supplied order. Include the catalogue fields, truthful player count, one-line controls and 3–6 appropriate lowercase tags. Use Shooter as the catalogue genre and Game as its type. Record actual stack versions, research performed, source interpretation, plan used, coded art/animation/audio, online modes, environment and tests. Copy the assigned source/run date and model identity from your brief. Usage must read **added on import**. Never estimate cost or token use; use unknown wherever you cannot confirm a requested fact.

Keep the builder's exit interview separate from any planner interview. Its required name and destination come from the builder's own brief. Validate its JSON syntax and shape. In your final chat reply, include the four mandated information/feedback sections, accurate test results and the artifact location. Feedback counts come from the issue ledger, and engine criticism comes from actual implementation experience. Do not fabricate findings to fill the fields.

The finished demo must satisfy all of the following:

- The chosen title came from 50 candidates and an actual random draw; all naming matches the builder's own brief.
- A first-time player can understand, play, win and lose the complete three-act siege, with every mechanic demonstrated and no placeholder content.
- The source's changing defensive situations, gravity danger, fortress cooling and urgent arcade tone are recognizable; original additions form one consistent game.
- One to four participants have complete tools and readable identities; standalone couch play and Hub online play both work, including dedicated hosting and lifecycle cleanup.
- Pad-only operation, native mouse aim/clicks, touch assistance, input-dependent prompts, 10-second attract mode and useful pause-accessible dev tools are finished.
- Native-style custom art, stateful animation and entirely coded audio are present throughout; music defaults to 10%.
- The packaged HTML passes the relevant simulation/browser/Hub checks; visual inspection covers the claims scripts cannot establish.
- In-game credits, the builder's interview JSON and final reply report the required facts and feedback accurately.
- No TODOs, stubbed menu actions, fake online screens, starter-game leftovers, inaccessible act, unimplemented upgrade or unfinished ending remains.

Finish when the complete game is delivered and these conditions are true. Use your context and effort to close the connections between systems and polish the play experience, rather than handing off another list of work.
