# Game direction and build plan

Build a complete, original arcade defense game inspired by **Attack of the Timelord! (1982)**. The player slides a time machine along the bottom of a fixed arena, shoots through winding alien formations, and decides whether to destroy incoming weapons or evade them. A theatrical temporal tyrant turns each new attack into a personal challenge. Preserve that immediate, readable contest while adding a short authored campaign, a useful temporal defense, and simultaneous cooperative play.

This plan is for **gpt-6.1-sol, ultra reasoning, with the supplied 1.05M context window**. Use that capacity to integrate the source research, engine implementation, protocol, complete game, and verification evidence coherently. Own the design and finish the game; this is direction and a set of acceptance contracts, not a request to stop after scaffolding or seek approval between milestones.

The CEO brief remains authoritative for artifact names, development directory, run metadata, and delivery location. **Choose the game title yourself: silently brainstorm fifty playful riffs on the source's name, then use a real random number generator to select one.** No title is assigned here. Every local path below is relative to your own development directory. Place the final deliverables where your own brief requires, using its names.

## 1. The experience to deliver

The first thirty seconds should explain the game without a manual: slide under a curling fleet, shoot an incoming missile, watch the shot open a path through the armada, and hear the tyrant react in ridiculous synthesized syllables. Later, a red seeker follows your position, a green crawler threatens the bottom lane, and a predictive hunter punishes a repeated dodge. The best moments come from choosing what to intercept before committing to a move.

Make a **fixed-screen arcade shooter**, using the engine's overhead projection as a screen-aligned shooting plane. Player movement is horizontal; fire travels upward. This is the entire game's playable camera. The background may suggest immense depth and the villain may loom beyond the arena, but perspective changes must not change collision interpretation or aiming. The engine's native procedural pixel art, shaded forms, animation, and lighting should make it feel lavish and alive.

Ship one complete campaign of eight authored waves and a three-phase finale, approximately ten to fifteen minutes for a successful first run. Include solo and one-to-four-player cooperative play through the same campaign, with the same mechanics and screens. The solo experience must stand on its own. Co-op must work both inside AI Hub and through a real standalone online room. A victorious run reaches a proper ending and results screen; a failed run reaches an equally complete retry flow.

The memorable addition is a **time brake**: intercepted ordnance charges a brief slowdown of enemy weapons. It creates a chance to turn a bad situation into a deliberate shot. It must complement aiming and evasion rather than become a permanent shield.

Do not add an inventory, equipment grind, crafting, an explorable hub, or additional camera modes. Spend the available effort on the enemies, authored encounters, presentation, input quality, networking, and complete execution of this game.

## 2. Research foundation and interpretation

Read the original material before implementing. The [North American instruction manual](https://odyssey2.info/library/manuals/us_timelord/Attack%20of%20the%20Timelord%20(USA).pdf) establishes a horizontally moving time machine, unlimited laser energy, successive fleets, and four cumulative enemy-weapon introductions: falling missiles, tracking antimatter mines, Annihilators, and predictive Nucleonic Time Killers. Destroying every Time Ship advances the wave. One hit restarts the original at level one; its advertised progression has 256 increasing levels. Intercepted weapons score points. The optional Voice module gives Spyrus the Deathless taunts, threats, and reluctant praise between attacks.

The [hands-on review](https://odyssey2.info/reviews/attack-of-the-timelord-6) adds useful behavioral and visual observations: serpentine ships, a rotating multicolored rift, one player shot at a time, white descending arrows, red seeking spheres, green X-shaped weapons that descend and then travel along the ground, and bright predictive diamonds. Grounded Annihilators cannot be shot by the original upward cannon. The [gameplay image](https://odyssey2.info/i/screens/time-scr.gif) and [box illustration](https://odyssey2.info/i/boxes/us_attack-of-the-timelord-f.webp) provide reference for the bright geometry, hostile face, and saucer silhouettes.

Record the references you actually inspect in `./docs/research.md`, including observed mechanics and explicit uncertainties. Do not claim to have watched gameplay video unless you successfully view it. Precise steering equations, original timings, and a continuous original musical score remain unconfirmed. The source is the Odyssey² game; do not import Doctor Who lore or substitute the European television-license reskin.

Our campaign, time brake, damage allowance, simultaneous co-op, and boss confrontation are **new adaptation choices**. Preserve the source's relationship between movement, interceptable threats, and escalating combinations rather than pretending those additions appeared in 1982. Use original art, arrangements, dialogue, and encounter construction.

## 3. Start from the actual engine

The inspected handoff is **my-3D2dge v0.89.1**, at commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Begin with the [handoff README](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/README.md), read the [API card](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API.md), and use the [API index](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API-INDEX.md) to find the implementation and recipes you need. Check the revision you download and record it. Reconcile any differences before relying on names in this plan.

Use the **FORMATION slice of `kits/arcade.js`** as the mechanical starting point. It demonstrates curved fleet arrivals, formation motion, limited player shots, enemy bombs, procedural ships, stage cards, and demo AI. Remove the unrelated kit launcher and other sample games. Consult `kits/shooter.js` selectively for projectile and presentation examples; do not ship the samples as the game.

Use the complete dependency-free `my-3d2dge.js` as the engine base. Its overhead view maps world x/y onto the screen and is appropriate for this arena. Read `docs/ASSETS.md` before building assets. Reuse these verified seams where they fit:

| Need | Native starting point | Game-specific work |
| --- | --- | --- |
| Fixed-step simulation | Exact 1/120-second updates, `game.advance(seconds)` | Authoritative state, seeded randomness, explicit phase transitions |
| Fleet movement | `E.Path`, Catmull smoothing, path sampling | Formation offsets, weapon schedules, readable arrival routes |
| Shots and patterns | `E.Bullets`, `E.pattern` helpers | Threat families, collision ordering, owner identity, hit rules |
| Pixel art | `E.sprite`, `E.tones`, native render primitives | Time machines, ships, warheads, tyrant, arena dressing |
| Animation | `E.anim`, scripts, tweens, easing | Banks, recoil, faces, warning motions, phase choreography |
| Arcade services | `E.Arcade`, score cards, high scores, demo flow | Shared co-op run, adaptation-specific results and rewards |
| UI and controls | `E.Shell`, input labels, menus, settings | Television composition, online screens, About and Dev Mode |
| Effects | Particles, lights, flashes, shake, freeze | Distinct impacts, portal distortion, phase changes |
| Code audio | `game.audio.define`, music, voice bus | Entire original score, SFX vocabulary, gibberish speech |
| Headless inspection | Test input, `game.debug.snapshot()`, `game.errors` | Stable gameplay assertions and whole-run coverage |

`E.Arcade.start(2)` means alternating turns; it does not implement our simultaneous co-op. `game.players` and `allowJoin` concern local devices, not remote multiplayer. Reuse compatible arcade services without allowing their turn model to own the shared simulation. Likewise, use native settings and menus before creating duplicate UI systems.

Engine changes are authorized when they solve a real integration need. Keep them focused, document what changed and why, and patch the exact engine copy bundled into the final game. Do not let separate full, module, and agent editions silently diverge. A new 3D renderer or replacement engine is unnecessary for this direction.

## 4. Core play and exact rules

### Player and targeting

- The player occupies a horizontal defense lane near the bottom. Movement has immediate response, a short visual lean, and a clean stop; cosmetic motion must not move the hitbox unexpectedly.
- A normal shot travels straight upward from the cannon's current x position. Holding Fire repeats as soon as the weapon is available. Begin with one live normal shot per player, a fast projectile, and a short release/rearm interval. Tune for intentional interception without tedious waiting.
- Keyboard movement uses A/D and Left/Right, with Space to fire. Mouse movement or a world click sets the desired cannon x position; the cannon still moves at its normal speed rather than teleporting. Left mouse holds fire. This is native pointer positioning, not free-angle aiming inconsistent with the vertical cannon.
- Stick or keyboard movement takes control from an old pointer target. Require deliberate pointer movement or a click before pointer targeting takes control again; incidental mouse jitter must not pull a cannon away from an active stick or key.
- Each machine starts with three integrity pips. A hit removes one, clearly knocks the cannon, clears immediate overlapping threats, and grants a brief visible invulnerability interval. Multiple overlapping hazards cannot consume several pips in one simulation instant. One collision produces one hit event.
- A solo machine at zero integrity ends the run. In co-op, a destroyed machine stays visibly disabled until a wave clear restores it with one pip. If all connected machines are disabled, the run ends immediately. A departed player does not keep the team alive or block completion.
- Teammates can overlap, have distinct colors and shapes, and cannot damage each other. Players share campaign progression, team score, and time-brake charge. Each shot carries its owner's ID for feedback and tests.

Keep the player hitbox modest and visible in Dev Mode. Give every threat a silhouette and warning animation; danger must remain readable without relying on color alone. The bottom lane and its attack warnings take priority over decorative effects.

### Enemy fleet and four weapon families

Formation ships enter from the rift, travel a winding route, and split into readable subgroups as the campaign progresses. Surviving ships continue to move and attack; the fleet must not depend on an enemy being hit at one inaccessible instant. Keep hit geometry on the common plane even when sprites bank or bob.

| Threat | Behavior and tell | Player's decision | Authoring parameters |
| --- | --- | --- | --- |
| Falling missile | White dart, brief muzzle blink, mostly vertical descent | Shoot the lane open or sidestep | Launch interval, speed, lane spread |
| Antimatter mine | Red orb with orbiting marks; turns toward a target with limited steering | Bait its curve, then intercept | Turn rate, acceleration, retarget policy |
| Annihilator | Green cross/roller; descends, then visibly lands and sweeps along the defense lane | Shoot before landing, or move into a marked safe gap | Drop point, landing warning, ground speed, finite lifetime |
| Time Killer | Diamond drone announces a predicted intercept position before committing | Change direction after its tell, or shoot it | Prediction horizon, warning duration, committed travel speed |

Annihilators are shootable while airborne and cease being targets for the upward cannon after landing. Mark their bounded sweep segments and endpoints. Every sweep must leave a reachable safe position or expire before it can force a player against the arena boundary; the player must not need to cross a grounded roller or possess a charged brake to survive. Check the reachable escape against the other scheduled threats as well. Avoid trackers with instantaneous steering or continuous perfect prediction.

All four types are real simulation actors with distinct collision and scoring behavior, not the same projectile drawn four ways. Determine targets on the host. Spread co-op attacks fairly across live machines and use a stable ID to break ties. Do not multiply every spawn interval by player count; tune co-op encounter data to create coverage decisions without filling every escape lane.

Define collision order explicitly: player shots intercept eligible weapons and enemies, resulting removals apply once, surviving hostile objects can hit players, then phase completion is evaluated. A destroyed object cannot also deal damage later in that step. Use swept tests or equivalent continuous intersection for fast shots; do not allow a projectile to skip a thin target between ticks.

### Time brake

Use a single shared meter, initially empty. Intercepting enemy weapons is the main charge source; fleet kills add a smaller amount. One activation consumes the full meter, with a short team cooldown and a visible activation wave. Initial tuning: approximately 1.6 seconds at 35% hostile-motion and hostile-weapon-clock speed, followed by normal speed without a catch-up burst.

Only hostile movement and attack clocks slow. Apply hostile-specific delta-time/clock multipliers rather than global `game.timeScale`. Player movement, player shots, UI, audio scheduling, and the authoritative real-time clock continue normally. Boss warning timers affected by the brake must remain aligned with the attack they describe. Ground rollers slow but do not become shootable. This is a slowdown, not a rewind: no restoring dead enemies, reversing score, or duplicating pickups. Any cosmetic hitstop must likewise avoid freezing the shared authoritative clock.

Permit one activation for simultaneous requests. The host accepts the first eligible request at a tick and emits one event; repeated or stale edges cannot retrigger it. Show the shared meter clearly, plus a concise controller/key prompt when ready. Teach it in a safe opportunity before encounters require the player to use it well.

### Score, difficulty, and recovery

Use the source's readable relative values as a starting point: missile 2, mine 4, fleet ship 5, Annihilator 8, and Time Killer 16. Add modest end-of-wave integrity and interception bonuses. Show a short end-of-run breakdown that makes improvement understandable. Avoid a second currency or upgrade economy.

Keep one locally saved high-score table with six-character initials, including a controller-operable character picker. The native arcade picker assumes three characters, so explicitly extend its entry, navigation, rendering, and storage together or provide a small custom picker through the existing shell. Separate assisted, solo, and co-op records or mark their rules clearly. Attract runs and dev-modified runs must never submit normal scores. In hosted play, use Hub identity rather than asking for typed player names.

Offer a clearly named assistance preset and individual assists in Settings: automatic fire, reduced hostile speed, and automatic emergency brake when charged. Defaults should produce a fair standard run. Touch may enable appropriate assists automatically and show that setting succinctly. Let the player reset preferences and tuning to known defaults. Store versioned settings safely and survive unavailable or corrupt local storage.

## 5. Author the complete campaign

Aim for the following pacing, adjusting duration through play rather than adding filler. The four weapon families enter cumulatively; each first appearance gets a low-pressure moment and a short in-world cue.

| Encounter | New information | Composition and dramatic purpose |
| --- | --- | --- |
| Wave 1, roughly 45 seconds | Slide, hold fire, intercept | Slow winding fleet, spaced darts, first villain reaction |
| Wave 2, roughly 50 seconds | Bait a seeker | Orb tells and wide gaps; introduce charge visibly |
| Wave 3, roughly 60 seconds | Prevent a ground threat | A few rollers with clear landing lanes; demonstrate brake |
| Wave 4, roughly 60 seconds | Dodge a prediction | Diamond aim marks; first full four-family vocabulary |
| Wave 5, roughly 75 seconds | Alternate offense and defense | Braided fleets and seekers; reward planned interception |
| Wave 6, roughly 75 seconds | Read the bottom lane | Rollers and staggered darts; terrain remains cosmetic |
| Wave 7, roughly 90 seconds | Manage shared coverage and charge | Paired formations and predictive cross-lane pressure |
| Wave 8, roughly 90 seconds | Master the combined rules | Complete vocabulary, deliberate safe windows, final rift opening |
| Finale, roughly 2 minutes | Recombine everything | Three clear phases, tyrant vulnerability tells, final escape |

The table gives direction, not an obligation to stretch a cleared wave to its nominal time. Destroying the final fleet ship should feel decisive. On wave clear, existing ordnance visibly dissolves harmlessly, the team gets a brief recovery, disabled teammates return, and the next attack begins promptly. Do not leave invisible hazards running under an intermission.

The finale is a new confrontation with the temporal tyrant's projected mask and machinery. Phase one uses missile and mine patterns around a clearly telegraphed weak point. Phase two adds landed sweep threats and predictive drones while the mask's expression and portal choreography change. Phase three combines the established patterns with shorter windows and a final opportunity to earn and spend the brake. Invulnerability must be communicated by appearance and hit feedback, not discovered through wasted shots.

No surprise new control, unavoidable full-screen attack, or required unexplained mechanic belongs in the finale. Ensure victory occurs once, cancels all hostile damage, delivers an original short ending, and reaches results. Every feature in this plan should appear naturally before the end of one successful run.

Content must be data-authored: formation paths, members, cue times, weapon mixes, warning times, boss phases, dialogue triggers, and balance values. Include a documented example encounter in `./docs/authoring.md` that explains how to add another wave without changing simulation code. A standalone editor application is unnecessary; usable declarative data, validation, and the live dev tools provide the designer workflow.

## 6. Art, animation, sound, and writing

### Visual direction

Use the engine's procedural pixel style with strong silhouettes, rich palette ramps, hard highlights, expressive deformations, and layered light. Keep the playfield predominantly dark. Use the source's rainbow rift and bold geometric weapons as motifs; enrich them with original engine-native assets rather than applying a generic retro filter over sample graphics.

Create at least these bespoke visual families: four distinguishable player machines, several related fleet hulls, all four hostile weapons, the temporal tyrant's face with several expressions, a substantial multi-layer portal, phase-specific boss mechanisms, and a coherent HUD and prompt skin. Generic engine debris or props can decorate the edges where they fit. The actual identity-bearing objects must be custom.

Animate each ship's arrival, bank, damage, and destruction; the cannon's travel, recoil, hit, disabled state, and recovery; each weapon's warning and behavior change; and the tyrant's speaking, gloating, irritation, and defeat. Use native paths, frame animation, tweens, procedural draw hooks, and appropriate existing rigs. A continually bobbing static icon is insufficient for a main actor.

Layer the arena with deep stars, broken temporal rings, orbiting fragments, volumetric-looking portal surfaces, and reactive illumination. Use impact debris, radial geometric bursts, light pulses, and selective screen shake to distinguish interception, hull hit, player damage, and boss phase transitions. The performance budget is unrestricted by the brief: add detail where it supports the scene. FPS targets, profiling campaigns, and optimization work are outside this task.

Provide reduced-flash and reduced-motion settings. Effects may soften with these settings, while warning shapes and collision timing stay readable and unchanged. Keep the primary firing lanes, landing markers, and player identities visible through the richest effects.

### Code-only audio

Write every sound in code: procedural oscillators, generated noise, filters, envelopes, sequencing, and synthesis. **No audio files, downloaded recordings, speech recordings, or browser text-to-speech.** Generated in-memory buffers are acceptable synthesis components; they must originate from code.

Compose a compact original score with related title, combat, escalation, boss, victory, and failure phrases. Set the saved/default **music setting to 0.1**, preserving later user adjustments; a quiet per-track constant with the actual setting still at full volume does not meet the requirement. Keep music, effects, and voice on separately controlled buses.

Build a consistent SFX vocabulary: cannon, each enemy launch, each interception family, mine turn or lock cue, roller landing, predictive warning, brake charge/activation/release, player hit, recovery, menu focus, confirmation, phase break, victory, and defeat. Warning cues should reinforce visual tells rather than carry essential information alone.

Give the tyrant a procedural Animalese/Simlish-style syllable generator with controlled pitch, formant-like filtering, rhythm, and emotional envelopes. Use a proper voice bus so voice volume and mute affect every syllable. Subtitle the intended line in short original text. The tone is extravagant arcade menace with petty frustration and grudging praise. Do not reproduce a long speech transcript or claim these new lines are original game dialogue.

Unlock audio on deliberate user interaction. Attract playback must work visually even when autoplay blocks sound; waking it should permit normal audio thereafter. Pause and teardown stop or suspend the appropriate voices and scheduled notes, with no accumulating loops across retries. Hosted end events must silence the game.

## 7. Controller-first interface and all input paths

Compose one interface for a television at 1920×1080, with responsive scaling to narrower screens. Define canonical logical arena bounds independent of canvas size, device pixel ratio, and aspect ratio. Resize by scaling/letterboxing and mapping input into those bounds; the starter kit's viewport expansion must not change spawn lanes, collision geometry, or the host/client world. Use large text, generous spacing, high contrast, and a restrained HUD: team score and wave at the top, integrity at the machines or bottom corners, shared brake charge in one prominent location. Put detail behind focused screens rather than making the game resemble a dashboard.

Reuse `E.Shell` and native menu stacks, safe areas, focus behavior, settings, and rebinding. Build complete title, play setup, online room, instructions, settings, pause, Dev Mode, About/Credits, results, and ending screens. Every screen needs an obvious selected item, confirm/back actions, pointer hover focus, and sensible return focus. Menus should fit or scroll intentionally with a pad.

| Action | Standard controller mapping | Keyboard / mouse | Touch |
| --- | --- | --- | --- |
| Move | Left stick or D-pad | A/D, Left/Right, or pointer x target | Invisible relative horizontal drag region |
| Fire | Cross or right trigger | Space or left mouse hold | Automatic by default |
| Time brake | Square or left trigger | Shift or right mouse | Context button only when charged; optional emergency assist |
| Pause / menu | Options | Escape; visible clickable menu | Small persistent menu button |
| UI confirm / back | Cross / Circle | Enter / Escape; direct click | Direct tap |

Use the browser's standard gamepad mapping. Start with PlayStation glyphs and provide the requested Xbox glyph setting. Prompts follow the most recently used real input device; idle gamepad polling must not repeatedly steal the prompt style from keyboard or touch. Ignore analog drift below a defined deadzone and debounce transitions between modalities. If rebinding changes an action, labels must follow it.

On touch-only devices, keep the playfield almost clear. Support simultaneous dragging and a context action, cancel released/cancelled pointers correctly, prevent page scrolling only in the appropriate game surface, and use assists to account for finger occlusion and limited precision. Reserve comfortable reachable areas without drawing permanent twin sticks or a full controller overlay. Scale the arena with consistent collision geometry, not a cropped defense lane.

For standalone solo, focus loss and controller disconnect should pause safely and explain how to continue. For active network play, do not freeze the shared world because one browser loses focus; expire that player's input and show the appropriate local/session overlay. Clear held keys and fire when focus changes to avoid stuck movement.

## 8. Attract mode, pause, and developer tools

Set the native arcade idle interval explicitly to **10 seconds**. After that interval without human activity on the title/main-menu flow, show a looping AI-driven demonstration using the real simulation, actors, and effects. Do not start attract mode from a paused run or interrupt an active room connection or text-entry operation. Hosted sessions bypass it entirely.

Use a private demo seed and state. A roughly ninety-second sequence should visibly show fleet motion, all four threats, interception, the brake, co-op imagery if useful, and the finale. It may grant invulnerability, prefill charge, or jump between showcase encounters. It must not modify high scores, progress, ordinary balance, saved preferences, or network state. Mark it clearly as a demonstration.

Any deliberate human input exits the demonstration, restores the menu and focus, and is consumed for waking so it does not also start a run. Count pointer movement, touch, keyboard, clicks, and meaningful gamepad activity. Native `anyPressed()` alone does not cover all of these; the input hook runs while paused and can maintain the activity timer. Reset correctly after leaving and revisiting the front end.

Add **Dev Mode** to the pause menu using the native menu extension and settings system. Make it useful during a real run:

- Jump to any wave or boss phase, restart the current encounter, and return to normal play.
- Toggle invulnerability, hitboxes, targeting/trajectory overlays, and AI control.
- Step one simulation tick and select a simulation-speed multiplier while paused. Single-step calls the canonical simulation step directly while retaining pause; `game.advance` ordinarily respects the paused state.
- Refill integrity and brake charge, spawn one of each threat, and inspect current state/seed.
- Provide live sliders for player speed, fire interval, missile speed, mine turn rate, roller speed, hunter prediction horizon, enemy firing interval, brake duration, slowdown factor, and charge gain. Give every slider units, bounds, defaults, and an immediate understandable effect.
- Reset tuning as a group through the native settings reset path. Keep default balance immutable so retry/reset really restores it.

Opening Dev Mode marks a run as modified before any score can be saved. Keep developer balance overrides session-only despite the native settings system's ordinary persistence. At every new run, also compare effective balance with immutable defaults and flag nonstandard values, so inherited tuning can never submit a normal score. Distinguish Retry, which may retain the current marked tuning, from Reset to Defaults, which restores the baseline. A dedicated test-mode entry may expose stable automation hooks, but Dev Mode itself must be reachable with normal controls. In active hosted play, obey Hub's session controls and disallow shared-state editing, level jumps, restarts, and a local world pause. Offer the full toolbox in standalone solo; expose only safe local presentation settings or read-only inspection during hosted rounds.

## 9. Multiplayer: one world, two transport environments

Implement networking early enough to influence the simulation design. Use a host-authoritative world for both AI Hub and standalone. A transport adapter should carry the same player-action, snapshot, phase, hit, score, and terminal messages. Rendering and input collection must not be prerequisites for simulating the host.

### AI Hub contract

Read the current [Hub protocol](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/README.md), [session client](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/session.js), and [arena example](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/examples/arena.html). The inspected protocol is v1, session client 1.4.0. Vendor the revision actually used and keep the client unmodified.

- Inline the unmodified session client as the first script in the document head, immediately after charset, following the protocol's exact ordering. A CDN script or a reimplementation does not satisfy its upgrade checks.
- Declare `hub:session=1`, `hub:session-players=1-4`, `hub:session-mode=shared-world`, and accurate goal/how-to metadata.
- Call `AIHub.connect({mode:'shared-world', seats:[1,4]})`. A null result selects standalone behavior. In hosted play, skip the game's title, attract loop, lobby, and ordinary start prompts; prepare the world, automatically call `AIHub.ready()` once, and wait for `AIHub.time() >= 0` before advancing the round.
- Only `AIHub.isHost` advances authoritative gameplay. Support `AIHub.server=true` with no local player, camera, or input device. Clients render synchronized state and send their actions through the Hub.
- Send guest action messages to `AIHub.host`; validate actual sender identity from the message callback, seat ownership, sequence numbers, data shape, and finite numeric ranges. A guest cannot claim another player's cannon, award points, or choose a phase.
- Respect the protocol's 16 KB JSON maximum, 20 outbound messages/second, and burst limit of 40. Keep unreliable packets near or below 1,200 bytes. A starting schedule is 12 input updates/second per guest and 10 world updates/second from the host, leaving space for reliable transitions. Measure the actual encoded payloads and totals.
- Handle `time-up` within the supplied `graceMs`. The host finishes once with the required standings, scores, and win state; all players still in the round tie, including disabled players. Include each current participant exactly once, and handle departed seats according to the current protocol. After `end`, disable gameplay input, transmission, simulation activity, and sound.
- Remove departed guests cleanly. A departing host voids the round according to Hub rules; host migration is outside this demo.
- Use the default Hub card initially. Respect Hub's Options/Create behavior. Hosted rounds must not introduce their own chat, emotes, typed names, navigation, independent restart, title escape, sockets, PeerJS connections, or alternate network requests for game-server traffic.

The real one-to-four-player design also matches the protocol's required four-player stress scenario. Do not advertise two seats and silently manufacture four only for a test.

### Standalone online rooms

The session client returns null outside the Hub; it supplies no automatic internet lobby. The local-network example is a simulator, not a complete standalone online feature. Build the missing room flow deliberately.

Use a pinned PeerJS browser client and its default public PeerServer signaling service, as documented by [PeerJS getting started](https://peerjs.com/client/getting-started) and [PeerServer Cloud](https://peerjs.com/server/cloud). Verify and record the client version when implementing. One browser hosts up to three guests over WebRTC data links; the same authoritative simulation and packet validation apply. Load and instantiate this transport only after an explicit standalone Online selection and only when Hub is inactive.

Provide Create Room, a readable room code/invite, Join Room, connection status, a one-to-four-seat roster, ready status, host start, leave, disconnect handling, results, and replay with the remaining roster. Joining must have a controller-operable character picker/keypad as well as normal keyboard entry and paste support. Copy/share actions must have a visible fallback if clipboard access fails under `file://`. Require no user-supplied server credentials.

Public signaling and NAT traversal are external dependencies. The [PeerJS FAQ](https://peerjs.com/client/faq) documents that some connections need TURN. Use a connection timeout, accurate error feedback, retry, and a clear route back to solo. Do not label a room connected before a data link and application handshake succeed, and do not claim universal internet reachability or same-machine tests as proof of every NAT configuration. In Hub mode, none of this independent transport may initialize.

### Shared simulation and synchronization

Keep the world in serializable state: seed, tick, phase, encounter index, players, formation state, active threats, shots, brake state, score, and authoritative outcome. Use deterministic RNG for gameplay and a separate cosmetic RNG. Stable entity IDs and monotonically increasing input sequences prevent duplicated hit or phase events.

Sample actions into a normalized frame: movement or target x, fire held, and a brake press edge. Expire stale movement/fire within a short bounded interval after packets stop. Reconcile local player prediction with host position and interpolate remote presentation. A predicted visual hit never changes authoritative integrity or score.

Design packets around the protocol budget before multiplying enemy counts. Transmit compact numeric state, IDs, pattern seeds, and host timestamps; derive decorative motion locally. Avoid per-particle traffic and full verbose object graphs every frame. Include periodic authoritative corrections, reliable critical transitions, and an initial/keyframe state. If state needs chunking, sequence and pace it within the send budget and apply only a complete matching revision. Verify that weapon removals, disabled players, brake timing, wave clears, and the final result converge under loss and latency.

Support joining an existing standalone room in its lobby; lock the active run roster until results. Hosted seat lifecycle follows the actual Hub contract. Avoid inventing late-join semantics that the protocol does not provide. A local solo run uses the identical rules with an in-process adapter.

## 10. Implementation shape and packaging

Prefer modern JavaScript and the native engine, browser canvas, DOM shell, and Web Audio. Use a small local Node build step; add a pinned local bundler only if it makes the result simpler. No application framework is required. Develop in modules with clear contracts, then bundle the game into the single HTML required by the brief.

A useful organization is:

```text
./vendor/                 engine, unmodified Hub client, licenses, revision notes
./src/main.js            boot, standalone/hosted selection, teardown
./src/game/              state, simulation, collisions, phases, players
./src/content/           encounters, boss phases, dialogue, tuning defaults
./src/presentation/      procedural assets, animation, renderer, effects
./src/audio/             synthesis, score, voice, bus lifecycle
./src/ui/                shell screens, input prompts, settings, dev tools
./src/network/           common messages, Hub adapter, standalone adapter
./tools/build.mjs        deterministic single-file assembly
./tools/test.mjs         one quiet verification entry point
./tests/                 state tests, browser scripts, Hub harness support
./docs/                  research, authoring, implementation and test evidence
```

Adjust this layout if the engine's conventions suggest a cleaner one. These are development-relative suggestions, not output artifact names. Keep every scratch file, dependency, server log, test artifact, and generated asset in your own development directory. Do not inspect neighboring agents' work.

Enforce a few architecture boundaries:

1. Simulation owns gameplay state and never reads the DOM, plays a sound directly, or draws.
2. Presentation consumes state and events; draw calls do not alter gameplay.
3. Input devices map to actions; simulation does not know controller button labels.
4. Network adapters carry validated actions and authoritative state, rather than separate game rules.
5. Encounter and balance data are inspectable and resettable; authoring does not require editing the renderer.
6. Session teardown owns timers, audio, input captures, transports, and listeners, so repeated play is reliable.

Use explicit states such as boot, front end, lobby, countdown, playing, intermission, finale, ending, results, and terminated, with a separate local pause overlay and isolated attract session. Make transition ownership clear; neither a draw callback nor two network peers should independently decide to finish a wave.

The build must inline the engine, custom art/animation code, game modules, styles, required Hub client, and game-owned content in dependency order. Escape literal `</script` sequences inside embedded JavaScript as `<\/script`, including text in engine comments. Never depend on sibling development files being present beside the final HTML. Permitted external dependencies must be version-pinned and listed in About; copy any necessary runtime assets into the artifact or use deliberate stable remote URLs rather than accidental local module fetches.

The script-escape example above shows the emitted HTML sequence with exactly one backslash; the build language's replacement string may require its own escaping. Test the final artifact directly through `file://` for standalone solo and through loopback HTTP for Hub/harness and transport features that need it. Runtime networking errors must not prevent solo play. Rebuild after a source change before claiming the artifact is tested.

## 11. Build sequence and decision gates

Use substantial, coherent passes. Do not spend the context window producing repeated summaries or a forest of planning documents. Maintain a small decision/issue ledger in `./docs/build-notes.md` and keep the actual code, content, protocol, and current failures in view. Delegate bounded independent work when useful—source verification, procedural assets/audio, protocol integration, or focused review—while one integrator owns the playable artifact and state contracts. Assign distinct files to concurrent contributors.

### Pass 1: Verify contracts and make a real executable

Complete source and handoff research, choose the title by the required random procedure, vendor exact dependencies, and produce a minimal bundled HTML based on the formation example. Establish engine-native art and motion, shell, one player, one winding fleet, interception, and a hit/retry path. Define the pure-state boundary and test snapshot immediately.

**Gate:** the bundled artifact boots from `file://`; a controller and keyboard can start, move, shoot, pause, resume, lose, and retry. At least one original ship and a short code-generated sound prove the art/audio path. This is a foundation, not the delivered demo.

### Pass 2: Prove shared-world play before full content

Implement the canonical player/world state, Hub connection and countdown, headless/server host path, common input protocol, and standalone room transport. Use a small real encounter with a projectile that either peer can intercept. Complete host/guest leave and terminal handling.

**Gate:** two clients act on one world, agree on a kill, hit, score, and wave clear, and finish once. The Hub conformance runs can reach a valid terminal state; standalone clients establish real data links. Fix architectural errors now, before authoring eight waves.

### Pass 3: Finish the complete rules and campaign

Implement all four threats, brake, integrity and co-op recovery, score handling, authored encounters, finale, ending, results, and replay. Establish useful balance defaults and ensure encounter data is extendable. Complete the entire run with ordinary player actions before treating polish as the remaining task.

**Gate:** a seeded scripted player clears all eight waves and every boss phase without dev invulnerability or phase skips. Failure, disabled-team recovery, and multiplayer disconnect paths also terminate correctly. Every promised mechanic appears in the actual run.

### Pass 4: Complete presentation, input, and tools

Finish custom assets and native animation, layered arena, effects, full procedural audio, gibberish voice/subtitles, all menus, device-aware prompts, touch assists, Settings, Dev Mode, About, and attract playback. Refine pacing and feedback through play.

**Gate:** the game looks intentional at title, early wave, combined-threat wave, brake, boss, victory, and failure. No sample branding, placeholder text, missing glyph, silent voice path, inaccessible screen, or unfinished online flow remains.

### Pass 5: Verify the delivered artifact and close the brief

Run the required state, browser, input, audio, and networking checks against the final bundle. Correct failures, rerun only affected coverage, inspect the few visuals that need human-style judgment, and finish the required credits, feedback, metadata, and JSON. Keep source and artifact synchronized.

**Gate:** the acceptance list below is satisfied with recorded evidence. Deliver the game and required feedback honestly, including unverified environmental limits. Do not mark a stubbed system or a test-only bypass as complete.

## 12. Verification strategy

Provide **one command**, preferably `node ./tools/test.mjs`, that runs the relevant automated checks and prints only failures plus a one-line count. Capture verbose dependency/harness output into your own directory and surface it when a check fails. Record each distinct discovered defect, whether it was game breaking, and which test found it so the final testing feedback uses real counts.

Rerun a check after changing code it covers. Do not repeatedly run the entire suite after unrelated copy edits. Use tests to establish behavior and scripts to play; reserve screenshots for appearance, composition, and UI legibility. Do not add FPS or optimization gates.

### State and whole-game checks

- Validate encounter data, paths, phase references, finite values, legal spawn cues, and complete defaults.
- Exercise all four threat behaviors, airborne/ground Annihilator eligibility, reachable roller escape without a charged brake, targeting, predictive commitment, and expiration.
- Cover shot tunneling, one-event collision resolution, invulnerability, simultaneous brake requests, charge bounds, slowdown expiry, no catch-up firing burst, and hazard cleanup at wave clear.
- Step the same seed and actions twice and compare canonical state. Rendering on or off must not change the result.
- Script a full legitimate campaign using movement, firing, and brake actions. Require every encounter and boss phase, correct final score/outcome, no enemies stranded outside reachable space, no softlock, and no state errors. Set a generous simulation-time bound so an unending wave fails clearly.
- Verify loss, immediate retry, repeated run teardown, corrupted/unavailable storage, assisted/dev score flags including inherited nondefault tuning, and all-disabled versus partially-disabled co-op teams.

Use the engine's `game.advance`, test inputs, and snapshots rather than real-time sleeps for deterministic logic. Test hooks may inspect state or inject ordinary actions; a whole-game success must not be awarded by directly setting the victory flag. Separate intentional Dev Mode tests from the legitimate playthrough.

### Browser and input checks

Test the **bundled artifact**, not only a development page. Require a booted game, visible nonempty arena, no uncaught exceptions or unexpected failed resources, and no source-module requests. Use the installed Playwright 1.63.0 browsers; do not download replacements. Use the dedicated Playwright Python environment or a matching local Node package.

Cover these paths:

- Standard-mapping gamepad stub: movement, hold fire, brake, menu focus, confirm/back, pause, and glyph switching.
- Keyboard/mouse: expected keys, pointer cannon targeting, click/hover focus, context action, and last-device prompt transitions.
- Touch profiles: simultaneous drag and brake tap, pointer cancel, narrow/landscape layout, usable menu, and no blocked critical play area.
- Attract: no early launch, launch after ten seconds, representative threats shown, wake from each input family, consumed wake action, and unchanged saved scores/preferences.
- Settings and Dev Mode: all key sliders really change behavior, defaults reset, hitbox display, wave jump, step, and return to play.
- Controller disconnect and focus loss with the correct solo/network distinction.
- Chromium for full gameplay, WebKit for a second browser pass and closest available iPhone-like behavior, and Firefox for a basic boot/input pass when the chosen renderer supports it. Document genuine renderer limits rather than pretending Firefox has WebGL on this workstation.

Capture a compact contact sheet for television-scale title/menu legibility, early combat, all-threat combat, brake, boss, results, credits, and one touch layout. Judge silhouette separation, safe areas, warning visibility, focus, truncation, and portrait/landscape scaling. A screenshot alone is not a gameplay assertion, and a blank WebGPU headless capture alone is not proof that simulation failed.

### Audio checks

Render representative music, SFX, and voice through an `OfflineAudioContext`, or inspect Web Audio with an analyser where offline rendering is impractical. Check finite nonzero output, reasonable peak levels, music default at 10%, mute/volume control for every bus, and no voices continuing after session termination. Verify audio resumes from a real input gesture and does not require audio files. State plainly that automated signal checks do not establish subjective listening quality.

### Hosted and standalone networking checks

Copy the current Hub harness support into your own test directory. Serve it and the actual bundled HTML from loopback using an OS-assigned port. Run the documented [harness](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/harness.html) scenarios sequentially:

1. Two players with automatic flow.
2. Four players with 150 ms latency, 50 ms jitter, and 5% loss.
3. The stressed four-player case with `scenario=host-leave`.
4. Two players with `scenario=server`.

For each, require both `document.body.dataset.complete === "true"` and `window.__hubCheck.pass === true`. Follow the README's exact current query syntax, using the real artifact as `game`; do not copy a planner-specific filename. Record revision, parameters, and result. Keep these runs within one or two browser processes, using their pages/contexts or the harness's own frames for the player count, and close them afterward.

Beyond protocol conformance, verify that remote movement and firing change the real shared game, players observe consistent phase/integrity/score/brake state, stale inputs expire, guest departure cannot strand progression, and the outcome agrees. Verify the server host has no phantom local cannon. Count packets and encoded sizes against the protocol limits. Spy on hosted networking to ensure the standalone transport never initializes.

Test standalone Create/Join/ready/start/play/result/replay with separate browser contexts using actual PeerJS/WebRTC data links. Include a failed join, timeout, host leave, guest leave, and the solo fallback. A BroadcastChannel-only test does not verify internet networking. If public signaling is unavailable, fix and test everything independently possible, preserve the accurate user-facing failure path, and report the remaining external limitation rather than calling the room feature verified.

### Shared-machine discipline

Prefer `file://` and engine headless tools. If a server is needed, bind `127.0.0.1` on port zero, capture its assigned port, and verify the served page's game identity before trusting results. Track and stop only processes you started, by PID. Do not scan, terminate, or reuse another agent's ports or processes. Keep large downloads/builds and logs in your development directory rather than shared temporary storage. No browser installation, GUI executable launch, or system-wide toolchain changes are needed.

## 13. Delivery and completion contract

Include the four required information groups **both in the final chat reply and in an accessible in-game About/Credits screen**: Source Information, Testing Feedback, Engine Feedback, and Prompt Feedback. Preserve all fields and answer every feedback question in the order supplied by the CEO. Use actual implementation facts and observations; write `unknown` where something cannot be confirmed.

Source Information must use your brief's date, model, environment, and naming context; identify the plan actually provided, actual genre/perspective, exact engine and dependency revisions, custom art/animation systems, code-only audio, online features, allowed testing parameters, and research actually performed. Usage must be exactly **`added on import`**; do not estimate tokens, cost, or elapsed usage. Include credits, licenses, and dependency/source links in a pad-readable format.

Save the builder exit-interview artifact required by your brief with its exact schema, filled source-information object, ordered feedback arrays, and complete AI Hub catalogue object. Parse it with code before delivery. The catalogue title must match the randomly chosen title on screen; list the actual one-to-four-player support, concise controls, appropriate genre, source, and three to six lowercase tags. Do not confuse the planner's separate interview with the builder's required feedback artifact.

Final acceptance:

- The chosen title follows the brief's fifty-candidate RNG process and is consistent everywhere.
- The required single HTML opens independently of development siblings, with permitted dependencies handled deliberately.
- Engine-native custom art and animation establish a recognizable temporal arcade identity.
- All four threats, projectile interception, brake, damage/recovery, eight waves, every finale phase, ending, loss, and retry work.
- Solo, real standalone online co-op, and hosted shared-world co-op use the same real game rules and support the advertised seats.
- Controller, keyboard/mouse, and assisted touch paths play and navigate the whole game with correct prompts.
- Attract begins after ten idle seconds, demonstrates the game, and exits cleanly on any deliberate input.
- Pause includes useful Dev Mode and working live balance sliders with reset.
- All audio is synthesized in code, music defaults to 10%, and gibberish voice is controlled and subtitled.
- The quiet test command covers the complete run and the required integration cases; the packaged artifact is the one tested.
- Required credits, research, feedback, catalogue data, and parsed interview are complete and agree with implementation.
- No TODO, placeholder, sample launcher, disabled feature masquerading as complete, or unreported material limitation remains.

Deliver a finished vertical slice with an authored beginning, escalation, and conclusion, plus the infrastructure to build more encounters using the same systems.
