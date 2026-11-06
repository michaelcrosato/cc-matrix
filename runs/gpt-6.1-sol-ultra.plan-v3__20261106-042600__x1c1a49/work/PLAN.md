# Director's build plan

## 1. Assignment and creative authority

Build an original, finished arcade garden shooter inspired by **Buzz Bombers (1983)**. The player should recognize its tactical relationship between spray, bees, honeycomb, hummingbird and encroaching flowers within the first minute. By the end, those simple relationships should support deliberate route manipulation, score chasing, resource management and cooperative play.

This plan is for **gpt-6.1-sol, reasoning effort ultra, with a 1.05M context window**. Use that capacity to understand the supplied engine, integrate the complete game, retain cross-system contracts and examine a full playthrough. Deliver a coherent vertical slice with authored content and finish; do not stop at a promising prototype. Read the relevant implementation as well as documentation, and use parallel specialists where independent work helps. Large context is a coordination advantage, not a reason to build an unrelated general-purpose engine.

**The builder chooses the title.** Perform the brief's silent brainstorm of 50 playful riffs and select with an actual random-number generator. This plan deliberately supplies no candidate title. Use the builder's own brief for the exact development directory, final HTML basename and release metadata; none of those assignment-specific basenames are reproduced here.

All implementation paths below are **relative to the development directory** selected by the builder. Put source, vendored inputs, build tools, test fixtures, caches and evidence there. Publish the final single HTML and required builder interview beside it in the location specified by the builder's brief. This planning pass creates no game and makes no claims about tests of a future implementation.

The CEO brief controls deliverables and requirements. This document supplies the creative direction, implementation contracts, content scope and acceptance criteria. If upstream APIs differ when the builder starts, inspect the current source, record the difference and adapt the integration while preserving the player experience.

## 2. Research foundation

Read these primary sources before implementing. Record URLs, inspected revisions, conclusions and unresolved points in `docs/research.md`.

| Reference | What it establishes |
| --- | --- |
| [Original cartridge manual](https://history.blueskyrangers.com/instructions/buzzbombers.html) | Horizontal can movement and upward spray; three initial cans, 56 sprays each, automatic replacement and refill on level completion. Bees descend through tiers. Workers react to combs; faster white bees ignore them. Sprayed bees leave combs; shooting combs removes them. The hummingbird harvests combs for larger rewards and retreats after repeated friendly fire. Trapped workers make bonus hives. Pollination grows flowers that constrict movement. |
| [Developer-alumni history](https://history.blueskyrangers.com/mattelelectronics/games/buzzbombers.html) and [gameplay image](https://history.blueskyrangers.com/mattelelectronics/games/images/buzzbombers/BuzzBomberScreen.gif) | Source credits, visual reference, playful tone and use of *Flight of the Bumblebee*. The original was single-player; its two-player packaging claim was an error. Co-op here is an original addition. |

Do not import unverified claims about a fixed original level count, enemy populations, projectile cap or exact trapping timer. Those are design decisions for this game. Study the reference image for silhouette and information hierarchy; create new artwork rather than copying the screenshot.

Technical references inspected for this plan:

- **my-3D2dge v0.89.1**, revision `8ecc2f62353761187bdfe226f327b7ea5d2eb691`: [handoff README](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/README.md), [API](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API.md), [API index](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API-INDEX.md), [arcade kit](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/kits/arcade.js), [asset guide](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/docs/ASSETS.md), [headless test example](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/game/test.mjs).
- **AI Hub Session Protocol v1, session client 1.4.0**, revision `35a1047f2067b2af3de3943f0fe452f39105d869`: [protocol README](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md), [session client](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/session.js), [shared-world example](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/examples/arena.html), [official harness](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/harness.html).

Fetch only relevant upstream files with `gh`/`git` or direct downloads into this development directory. Preserve licenses and record any engine changes. Pin the tested revision rather than silently following a moving branch.

## 3. The game we are making

**Genre:** fixed-screen arcade shooter with tactical obstacle management and score attack qualities. **Perspective:** a stable, front-facing garden theater, expressed through the engine's native shaded pixel art, procedural creatures, layered scenery, lighting and shadows. The simulation is two-dimensional. The engine's `overhead` coordinate view can render this composition; its API label does not require a bird's-eye camera.

The player is a wonderfully overqualified little spray can defending a garden party from bees with terrible manners. Spray sends a bee tumbling away and leaves a glittering wax parcel. That parcel is both useful food and a dangerous obstacle. A very particular hummingbird wants the parcels; the bees want every flower; the player wants enough breathing room and spray to finish the shift. Keep the fiction cartoonish and brisk. Use short, original bee jokes, expressive reactions and tiny end-of-round exchanges rather than dialogue scenes or a lore screen.

The main loop is:

1. Read the sweep of approaching bees and move beneath a useful shot column.
2. Fire economical upward pulses. A hit creates a comb that can change future routes.
3. Decide whether to preserve that comb for the hummingbird, remove it to open a safe route, or use it to trap a worker into building a hive.
4. Call the hummingbird toward a chosen column at the right moment; protect her from your spray.
5. Prevent pollination from closing the ground lane. Spend reserve cans carefully and reach the round clear for a refill.
6. Bank the hive and harvest rewards, enjoy a brief celebration, and face a new arrangement of the same readable rules.

The principal original addition is a **hummingbird call**. It gives the player influence over harvesting without adding an unrelated weapon system. The campaign culminates in a bee-pageant finale whose defenses are opened by harvesting, so the source's supporting character becomes central to mastery.

Build six authored encounters, solo and simultaneous two-player co-op, a complete win and loss flow, local records, a teaching sequence, attract mode, settings, credits and practical developer tools. Aim for roughly **10–15 minutes for an ordinary complete first run**, then measure actual duration. Failed attempts and score improvement provide replay value. Avoid diluting this with unrelated exploration, crafting, equipment inventories or extra combat genres.

## 4. Rules and resource contract

Implement these rules explicitly in simulation code and expose their tuning as data. Numbers below are first-pass defaults, not claims about the source's balance.

### Arena and movement

- Establish one canonical arena, initially a **640×360 reference composition**, with fixed tier positions, bee entry points and ground bounds. Lock the geometry before networking. Fit it to other aspect ratios and extend decoration outside it; viewport size must never alter collisions, tier count, bee travel distance or difficulty.
- The can moves horizontally along the garden's lower rail, with responsive acceleration and a short, controlled stop. Simultaneous movement and fire are always legal. The nozzle shoots upward; this remains a fixed shooter rather than free-angle aiming.
- Can silhouettes and the currently legal movement interval must remain visible among flowers. In co-op, cans can pass each other without blocking or pushing. Seat colors also differ in stripe pattern, nozzle shape and number marker.
- Use swept projectile collision so a fast pulse cannot pass through a bee, bird, comb or hive between ticks. Resolve contacts in travel order with stable entity-ID tie breaking. Exclude a newly created comb from the pulse that created it.

### Spray, cans and failure

| Variable | Initial rule |
| --- | --- |
| Spray capacity | 56 pulses per active can; show a large fill gauge and low-spray warning. |
| Fire cadence | About 0.16 seconds between pulses; holding fire repeats. No ammo cost while paused, blocked by a menu, or before a valid firing tick. |
| Starting stock | Solo: one active can plus two reserves. Co-op: two active cans plus three shared reserves. |
| Empty can | Replace it automatically using one reserve, with a short readable swap animation; other actors keep moving. |
| Flower enclosure | A failed garden costs one reserve and restarts the current encounter with its initial flower layout and freshly filled active cans. Preserve already earned run score, but make that encounter's one-time hive/clear rewards impossible to farm through restarts. |
| No replacement available | An empty can enters a short last-spray grace state: movement remains legal, firing stops, and outstanding pulses or a feed already in progress can resolve, initially for at most 1.5 seconds. A valid clear refills the can; an earned reserve can pays for replacement. Otherwise the team loses when recovery cannot be paid. Co-op has a shared fate. |
| Encounter clear | Refill active cans, bank eligible hive rewards once and clear encounter-local flowers/obstacles according to the next definition. Do not silently grant reserve cans. |
| Extra stock | Award from configurable score thresholds, initially 20,000, 40,000, 80,000, then each additional 80,000; tune from full-run evidence. |

Keep one authoritative resource ledger. Do not let the arcade helper independently award lives on top of the simulation. A threshold crossed by a multi-hit or harvest chain awards each earned can exactly once. Resolve tick collisions, score and stock awards before terminal resource checks; a valid encounter clear takes precedence over exhaustion on that tick. Test a final pulse hitting the last bee and a final harvest earning its own replacement. Co-op score and reserve stock are shared; individual hit/harvest contributions may appear on the results card without competing for the team's rewards.

Give authored enemy entries stable reward identities across encounter retries. Hit, harvest and hive rewards each have their own once-only claim for that identity, retained with the run score. Retrying restores the playable enemy arrangement, not its previously claimed rewards. The finale's replenishing escorts keep supplying required combs after their finite authored scoring slots are exhausted, but further rescue spawns award no extra score or stock. Communicate repeat/recovery reward status unobtrusively. These rules prevent a retry or an indefinitely delayed shield from manufacturing unlimited cans; verify both cases behaviorally.

Give a pulse a small, finite penetration budget, initially two bee hits. A pre-existing comb or hive consumes the pulse when removed. Bird contact consumes the pulse and causes irritation. A pulse cannot continue through a destroyed obstacle and erase several valuable objects accidentally. Make penetration, widths and cadence tunable; never make collision depend on rendering scale.

### Bees, combs and hives

- **Worker:** amber body, round silhouette, leisurely wingbeat. Sweeps a tier; contact with a field boundary or a comb changes its route downward. One spray converts it into an amber comb at a valid grid location.
- **Fast bee:** pale body, angular wings and a clearly faster buzz. Sweeps faster and passes through comb routes. One spray leaves a red comb. A brief entry glint and flight trail distinguish it without color alone.
- Each route transition is one atomic event. Move the bee outside the triggering collider, advance to the next tier and suppress repeated processing of that contact. Test tight pockets and touching combs; they must not cause an instant fall through the entire field.
- **Trapped worker:** detect a genuine pocket with insufficient travel space using geometry and recent travel, rather than a random timer alone. Show a brief construction wobble before converting to a hive. Start with approximately one second of verified confinement. Recheck when obstacles change. The development overlay must show why the bee is considered trapped.
- **Comb:** stationary, collidable, harvestable and visibly amber or red with an additional shape distinction. Keep enough separation to avoid impossible overlapped hit targets. If two conversions target one cell, resolve deterministically and award a documented merge bonus or choose the nearest free cell; no duplicate invisible colliders.
- **Hive:** a larger striped construction with a readable bonus badge when safe to display. It occupies space, can be shot accidentally, and is banked only on encounter clear. Its presence must not prevent encounter completion forever: a bee that becomes a hive is no longer an unresolved live enemy.
- Emptying an encounter means no scheduled enemy entries remain and no live bee/boss objectives remain. Combs and hives alone do not block completion. Allow a short, bounded final harvest interval, then bank and transition.

### Hummingbird and the new call

- The hummingbird has a visible target, flight, feeding, recovery and temporary retreat state. Her ordinary AI travels to eligible combs and feeds at a measured pace; target choice and arrival are simulation decisions.
- The call selects an eligible comb nearest the caller's horizontal aim column, with a stable preference for value and distance. Mark the chosen comb briefly and play a short answering chirp. She flies to it; harvesting never teleports across the field.
- Start with a **shared eight-second call cooldown**. An invalid call costs nothing and gives a quiet, useful response. Simultaneous co-op calls resolve by authoritative tick and seat order. All players see the same target and cooldown.
- A fed comb awards substantially more than the initial bee hit. Higher, riskier parcels are more valuable. Use a simple three-band score table and a clear red-comb bonus; present the relationship through score pops and a compact help card.
- Spray contact builds irritation; repeated contact causes a telegraphed temporary retreat. She cannot die. Show the player's lost harvesting opportunity, then let her return reliably. Do not require a player to hit an ally to discover this rule: a short contextual hint can explain the warning.
- The boss can require red-comb harvests, so target invalidation, destroyed targets, interrupted feeding and bird return must all recover automatically. No target reference may keep an entity alive or prevent progression after it is removed.

### Pollination and flowers

An escaping bee pollinates a particular ground patch and leaves the active swarm. Show its descent, landing marker and a short growth warning before the flower becomes a blocking patch. Early encounters mainly grow from the sides; later ones demonstrate center patches and split lanes.

Represent ground occupancy as intervals or cells with explicit can-width clearance. When growth overlaps a can, relocate it to the nearest legal position with a visible spring-hop, a protected landing and a marked destination. Prefer its current connected open region; break ties deterministically. Do not bury the can in decoration or charge a reserve while room still exists. If no legal ground position remains, invoke the single team enclosure recovery above. Queue simultaneous growth events and resolve the recovery once.

The threat is **loss of room and can stock**, not arbitrary contact damage from bees. Keep that distinction clear in instructions and tests. Difficulty comes from routes, traffic, ammo decisions and space pressure.

## 5. Authored encounter progression

Give every encounter a distinctive garden arrangement, palette, entrance beat and short success gag. Each should contain an introduction, a combination challenge and a satisfying resolution; do not merely increase a spawn count six times. Keep story captions skippable and short enough to read during a natural breath.

| Encounter | New lesson and authored arrangement | Completion and proof of learning |
| --- | --- | --- |
| 1. Opening the garden | Broad lane, separated workers, then a deliberate comb route. Teach moving while firing, leaving food, calling the bird and the refill. First pollination is slow and unmistakable. | Clear both small waves; an early safe bird harvest is demonstrated before the normal rhythm begins. Instructions disappear once the action is performed. |
| 2. Express delivery | Introduce pale fast bees in a lane already containing amber combs, so their different routing is observable. Mix solitary fast entries with worker sweeps. | Handle the mixed flock and see red-comb reward. The player can win without perfect shots. |
| 3. Wax works | Place a fair, visible pocket that can turn a worker into a hive. Offer a choice between saving it for the clear bonus and shooting through it for room. | Resolve a wave where preserved geometry changes later paths. A hint and highlighted pocket prevent hive building from becoming an unexplained secret. |
| 4. Flower traffic | Start with side pressure, then deliberately telegraph a central pollination patch. Demonstrate safe relocation and meaningful left/right choices. | Recover from a split lane while conserving stock. Every starting arrangement is winnable in solo and co-op. |
| 5. Pageant rehearsal | Combine fast bees, hive pockets and flower pressure. Introduce one festival shield bud which opens when the bird harvests a red comb, then takes normal spray hits. | Teach the final encounter's harvest-to-expose rule without changing the controls. Include guaranteed renewable red-comb opportunities. |
| 6. Garden-party finale | A large, expressive bee-pageant float conducts three escalating phases. Each phase uses familiar escort swarms and one shield bud; red-comb feeding opens the bud, and economical spray breaks it. | Break all three buds and finish a short final mixed sweep. Celebrate the entire garden reopening, show the bird's comic verdict and a complete results card. |

The finale's moving shapes, phase announcements and palette shifts supply spectacle while preserving the upward-shot plane. Every exposure must have a visible cause and a generous first window. Escorts periodically provide the needed red combs until that phase is solved. Destroying all current combs or irritating the bird may cost time and space, never make the fight unwinnable by construction. Define phase-entry, timeout, repeat-supply, final-clear and simultaneous-loss priority in data and tests.

Tune the first pass around ordinary human accuracy, not the test bot's precision. Solo must have enough interception time to cover the entire arena. Co-op gets a distinct traffic arrangement and stock defaults rather than simply doubling enemy health. Let players coordinate two firing lanes and one bird. The final fight should ask them to preserve useful combs, not continuously hold fire.

Finish the complete campaign before adding any replay variants. A replay option may reuse these authored definitions with a new seed and modest data-driven variations. Do not advertise an endless mode or additional mechanics unless they are implemented and tested to the same standard.

## 6. Presentation and animation

The supplied engine is a **Canvas-based, code-drawn pixel-art engine**, not a requirement to install Three.js or build a WebGPU renderer. Its native appearance uses shaded outlines, hue-shifted palettes, procedural volumes and animated rigs. Build a rich little garden with that vocabulary.

- Use `E.px`, `E.tones`, renderer sprites/actors/queues, `E.font` and `E.ui`. Favor the engine's pixel drawing over unrelated antialiased shapes. Its palette helper supplies deep/shadow/base/light/highlight colors for consistent materials.
- Use generic engine props for distant trees, bushes and incidental flowers. Make original assets for the cans, both bee species, hummingbird, amber/red combs, hives, playable flower patches, shield buds and pageant float. Decorative library flowers must not be confused with blocking gameplay patches.
- Build creatures from the native procedural animation language. `E.Blob` is a useful starting point for rounded bodies, eyes, wings and squash. Extend the documented `update(dt,state)` / `draw(...)` rig pattern for distinctive bee banking, bird hovering and feeding. Use `E.anim` where authored frame animation is useful; static asset shapes alone do not animate a nozzle or wing.
- Author can idle pressure, directional lean, nozzle recoil, low-fill wobble, swap, flower-hop, loss and victory poses. Bees need sweep, boundary bank, descent, conversion and construction. Bird needs hover, target glance, travel, feed, irritation and retreat. Flowers need warning, bud growth and clear. The finale needs conduct, shield-open, impact and a happy disassembly.
- Layer rear hedge silhouettes, flower stems, playable actors, ground trim and foreground garden props. Keep the threat plane uncluttered. Use shadows and local honey glows to separate actors from scenery. Gradual morning-to-party lighting gives the campaign a visible arc.
- Give a hit crisp local recoil, a small flash, a wax spiral and a satisfying score pop. Reserve stronger screen shake and global emphasis for can loss, shield breaks and the ending. A crowded conversion chain must remain readable; constant whole-screen hit stops would hide the route puzzle.
- The title screen is a composed game scene with the builder's title, animated can and bird, large mode actions and an unobtrusive controls hint. Its idle presentation should transition naturally into attract mode.

At 1920×1080, read the main UI from a sofa: approximately 30 px or larger for ordinary menu text, much larger for primary actions and outcome cards. Show stock, active-can fill, shared score, encounter progress and bird-call readiness with strong shapes and a restrained amount of text. Inspect real captures; font size alone does not prove legibility. Keep HUD information out of the lane and do not replace the game with dense cards or web dashboards.

## 7. Controls, menus and accessibility

Use one action model for all devices and all modes. Build on the engine's input and shell systems so rebinding, focus, hover, pause and prompts have one implementation. The following defaults are deliberate and may be adjusted for a verified engine binding constraint:

| Intent | Standard gamepad | Keyboard | Mouse | Touch-only |
| --- | --- | --- | --- | --- |
| Move / choose firing column | Left stick or D-pad | A/D or arrows | Move pointer to set the desired column; move the can through normal travel rules | Invisible horizontal steering from a lower-screen drag, with dead zone and multitouch tracking |
| Spray | Cross or R2 | Space | Hold primary button | Assisted fire when a useful shot is available; intentional manual clearing remains possible |
| Call bird | Square | E | Secondary button, using the pointer column | Tap a comb for a brief contextual Harvest / Clear action |
| Pause / local options | Options | Escape | Menu button | One persistent menu button |
| Confirm / back | Cross / Circle | Enter / Escape | Click / back control | Tap |

Pointer motion only takes over movement after actual movement, with a small threshold. A parked cursor must not fight the keyboard or stick. Mouse aim chooses a horizontal column and never grants an instant teleport or an extra firing angle. Menu hover moves focus, clicking acts on that item, and returning to a previous screen restores useful focus. All core actions, settings and developer tools must be reachable by pad.

Prompts follow the last meaningful input device, with enough hysteresis to prevent idle stick noise or a parked pointer from flickering them. Use `input.label(action)` or the verified native equivalent after rebinding. **PlayStation glyphs are the default**, with an explicit Xbox A/B/X/Y option in Settings. Do not rely on the engine's default glyph selection or manually hardcode prompts in several screens.

Touch gets the same rules and screens with assistance suited to invisible controls. Safe auto-fire waits when a friendly bird or valuable obstacle would be hit. A contextual Clear command steers to a valid column and authorizes a normal shot at that obstacle; it consumes ordinary ammo and can be cancelled by steering. Harvest calls the same shared bird ability. Show context actions only while relevant, with generous hit areas in CSS pixels. Support steering plus a second touch without stuck input, browser scrolling or accidental menu activation. Keep the persistent UI to the menu button and essential game information.

Settings include separate master/music/effects/voice volumes, mute, input glyphs, rebinding, text/TV scale, reduced motion and flashes, and touch assistance. Use silhouettes/patterns as well as color. Reduced motion limits shake and decorative camera motion without hiding warnings. Respect safe areas, portrait letterboxing and landscape resizing; a rotation suggestion may help on a phone but must not trap the user on an unplayable instruction screen.

Standalone pause freezes gameplay, spawn timers, cooldowns and the gameplay audio clock. Resume never replays a buffered shot. Loss of focus or controller disconnect pauses standalone safely, clears held actions and explains how to resume. Online local options behave differently as specified below: the shared world cannot pause for one player's menu.

## 8. Procedural audio direction

All music, effects and optional voices are synthesized **in code**, including any buffers generated at runtime. Ship no audio files, sampled speech or remote sound URLs. Reuse the engine's audio facilities where they fit; extend them with Web Audio instruments where necessary rather than substituting an asset pack.

Compose an original nimble, chromatic garden scherzo that evokes the source's buzzing energy. Use a small pulse/triangle/noise ensemble with a light bass and playful answering phrases. Add layers for fast-bee waves, hive banking and the finale. The title, danger, clear and victory states should have related short motifs. The fresh/reset **music setting is 0.10**, applied once to its controlling bus; do not multiply two independent 0.10 gains. Effects and voice have separate controls.

Give spray a short airy hiss and pressure click, conversion a waxy pop, comb clearance a brittle tick, feeding a tiny arpeggio, hive completion a wooden rattle, pollination a warning buzz into a pluck, can replacement a springy metal roll, and shield breaks a cheerful brass-like synth burst. Bee buzz pitch/rhythm should help distinguish species without overwhelming the music. Optional can and bird barks use short Animalese/Simlish-style gibberish made from synthesized syllables; ordinary UI text remains readable language.

Initialize sound without blocking loading. Unlock the AudioContext after a real gesture, or start silently if the browser has not granted one. This must never block `AIHub.ready()`. Suspend/cancel scheduled audio on standalone pause as appropriate, stop it on teardown, and prevent a resume from dumping old scheduled notes at once. Preserve an explicit saved music preference across reload and device changes; use 10% when no preference exists or defaults are reset.

Verify audio with OfflineAudioContext or an analyser: finite, non-silent output when enabled, silence when muted, correct relative music gain, and no clipping in representative busy combinations. Record that nobody listened to the actual output; do not claim a human listening review.

## 9. Engine integration and source organization

Start from the arcade kit's **FORMATION** slice, preserving engine setup, native shell and documented testing approach. Replace its generic combat rules and content with this game's simulation. The full engine already includes the two-dimensional modules; do not load a duplicate arcade module after it.

Use a source layout along these lines; combine small files when that improves clarity:

```text
vendor/engine/              pinned handoff and license notices
vendor/hub/                 pristine released session client
src/main.js                 boot, standalone/session branching, lifecycle
src/simulation.js           world state, fixed-tick rules, authoritative outcomes
src/content.js              encounters, spawn timelines, progression, boss phases
src/tuning.js               defaults, ranges, settings definitions
src/input.js                seat-aware action adapters and device presentation
src/presentation.js         renderer, effects, HUD, camera composition
src/rigs.js                 custom native creatures, cans and animated props
src/audio.js                synthesizers, score scheduler, buses, teardown
src/screens.js              title, teaching, pause, results, About and dev tools
src/network.js              Hub lifecycle, validated inputs, snapshots
tests/                      headless, browser, audio, build and Hub checks
tests/hub/                  unchanged harness, bridge and round fixtures
tools/build.mjs             reproducible single-HTML assembly
tools/test.mjs              one quiet aggregate verification command
docs/                       research, contracts, content guide and evidence
```

The arcade kit's `step(dt,I)`, called from a native scene's `update(dt)`, and its `draw(r)` provide a good boundary. Maintain a rendering-independent state with stable entity IDs, encounter and phase IDs, simulation tick, pending spawns, cans, projectiles, bees, combs, hives, bird, flower occupancy, score ledger and result. Native animation follows this state; cosmetic easing and particles never create authoritative collisions or award points.

Use the engine's fixed **1/120-second** update pattern. Isolate random gameplay choices from cosmetic randomness and provide an injected seeded RNG for headless runs. In Hub, only the host consumes the gameplay RNG; cache the documented `AIHub.rng('gameplay')` source rather than assuming `Math.random` is synchronized. Snapshot recipients render authoritative state and do not need to reproduce the host's RNG stream.

Write the game-owned interfaces before parallel implementation: creating a run, applying seat actions, advancing one tick, emitting gameplay events, exporting a snapshot and finishing a run. These are application interfaces to implement, not names claimed to exist in the engine. Define their state shapes in `docs/contracts.md`. Make event ownership explicit: one authoritative conversion can create one comb and one hit award, while presentation can attach several effects to that event.

Use explicit states for boot, front end, teaching, live encounter, clear/harvest interval, intermission, win, loss and attract. Pause and developer overlays wrap a standalone run; Hub local options wrap only that client's presentation. Keep the SDK lifecycle distinct from the game's encounter phase. Guard every transition against duplicate callbacks, stale entity references and input carried from a menu.

Use the native `E.Shell`, `E.Menu`, settings and binding facilities. The documented `settings.define(...)`, slider rows, `shell.show(...)` and grouped `settings.reset(...)` support the developer menu. Extend the standard pause menu and credits rather than introducing a separate DOM menu framework. Explicitly override the engine's music and glyph defaults.

The arcade module is useful for score cards and attract plumbing, but its two-player flow means **alternating turns**. Implement simultaneous co-op through the custom world and input seats. Likewise, disable any automatic arcade-helper life awards that conflict with the resource ledger.

Store ordinary settings and local records in versioned local storage, with validation and a usable fallback when storage is denied or corrupt. Mark dev-assisted and attract runs ineligible for normal records. No external account, cloud save or service should be necessary to play the standalone HTML.

## 10. Multiplayer and the AI Hub contract

Ship **solo and same-screen local two-player co-op outside Hub**, and **shared-world 1–2 player co-op inside Hub**. The Hub library supplies no standalone room broker; do not invent an online-room button that cannot work. Local mode offers two pads or a pad plus keyboard, assigns devices explicitly, and prevents one pad from controlling both cans. Pointer and touch control only the assigned local seat.

### Boot and lifecycle

1. Embed the released `session.js` **verbatim and unminified as the first script in `<head>`, immediately after the charset meta**. Keep it outside all bundler transformations. Preserve required session metadata: protocol `1`, players `1-2`, mode `shared-world`, accurate goal/how-to, and a duration supported by the measured campaign.
2. Register documented lifecycle handlers while booting, then call `await AIHub.connect({mode:'shared-world', seats:[1,2]})`. If it resolves to `null`, enter the normal standalone front end. Do not show a broken network lobby when there is no Hub parent.
3. When `AIHub.active` identifies a session, bypass title, attract, mode selection and any press-to-start gate. Initialize the correct seat/world, then call `AIHub.ready()` exactly once without requiring a gesture, audio unlock or controller input. Use the Hub's standard round card.
4. Subscribe to `start`, but do not start gameplay just because the event fired: it precedes the countdown. Gate active simulation on `AIHub.time() >= 0`.
5. `AIHub.isHost` owns the world. `AIHub.server` can run that world without a local player or camera. Never assume the host ID is a player ID. A server copy must tick the simulation and send state without polling a pad or creating audible output.
6. Only the host calls `AIHub.finish({standings,scores,won,stats})`, with values shaped exactly as the checked protocol specifies. Guard it so normal victory, loss and `time-up` cannot finish twice. For a shared team outcome, use a tied standing group and shared score, with optional individual contributions in stats. On `time-up`, finish within the supplied `graceMs`; do not start another encounter to avoid finishing.
7. Handle the **`end` event** by disabling input, clearing held actions, stopping simulation/sends/timers and stopping audio. There is no `AIHub.end()` method. Let Hub show results and remove the iframe; online Restart/Quit must not secretly launch another run.

On unrecoverable session initialization failure, call the documented `AIHub.fail(message)` with a useful reason rather than leaving readiness pending forever. A standalone initialization failure gets a readable local error screen.

A Hub session is the same campaign, controls and combat rules. Set its available minutes from observed completion duration, with room for the full slice. Standalone need not impose that session cutoff. If time expires before success, report the actual progress and team result honestly.

### Authority, transport and input

Use only `AIHub.send(data,{to,reliable})` and `AIHub.on('message',(data,from)=>...)` for session networking. No additional sockets, signaling, hosting or third-party game server is needed.

- Clients send compact, sequenced action state: movement/desired column, fire-held and a call-request counter. Authenticate seat ownership from the SDK's sender identity, clamp values and reject malformed or stale messages. Repeated messages must not repeat a call or charge ammo twice.
- Host-local input goes through the same action representation without a needless round trip. A server host has no such local input. After a bounded interval without valid remote input, neutralize its held movement/fire; clear it immediately on leave, end or local input release.
- Host advances collisions, movement, resource use, bird targets, score, spawns and progression. Clients may predict their own can movement and interpolate other motion, but may not award score, generate combs or resolve authoritative hits.
- Broadcast snapshots with tick, entity IDs, phase, team state and acknowledged input sequences. Clients accept authoritative snapshots/events only when the SDK sender is `AIHub.host`. Include enough state for the whole scene to recover after missed packets; important resets and terminal outcomes get reliable delivery. Cosmetic event IDs let clients avoid replaying one conversion effect repeatedly.
- Start with roughly 10 input updates per second per remote copy and 8 host snapshot broadcasts per second, plus batched reliable transitions. Inspect actual traffic and stay below the documented **20 outbound messages per second per copy**, including control and recovery traffic. Prefer broadcasts to duplicating a host send for each seat.
- Respect the **16 KB message limit**. Pack entity data sensibly and keep normal traffic small; packets around 1,200 bytes are friendlier to unreliable delivery, but this is not an invitation to spend the project on compression. If a full snapshot needs chunking, assemble a complete version by ID before applying it, and bound retries within the same send budget. Never silently drop entities to fit a message.
- Unreliable packets may be lost or reordered. Sequence state and use latest-valid snapshots. A reliable checkpoint on initialization or an encounter reset provides recovery. Newest-state semantics and request counters are more useful here than a fragile event-only simulation.

Document the small wire schema and its version in `docs/contracts.md`. Test a stale sequence, duplicate call, late snapshot and malformed seat claim deliberately. The goal is a stable shared garden, not merely two pages that both draw bees.

### Pause, departures and session restrictions

In Hub, disable the engine's native automatic pause (`autoPause:false`) and intercept the standard pause binding. Options opens **local options** using non-pausing native screen handling (`{pause:false}`), neutralizing that seat's actions while the shared world and Hub clock continue. Focus loss and controller disconnect must also avoid freezing the host world. Label this clearly. Do not expose host-only restart, arbitrary dev mutations or a global pause as if they were local settings. Ignore Options while Create is held, because that chord belongs to Hub. Standalone retains native automatic pause and developer tools through the normal pause menu.

A non-host departure is final for that round. Remove its can without charging remaining players, clear its actions, keep shared stock, and adjust only future traffic at an explicit encounter boundary. Continue with a remaining player; finish cleanly if nobody remains. A host departure is handled as a voided session by Hub. Do not claim host migration, seamless reconnect or a persistent lobby that the protocol does not provide.

## 11. Attract mode

After **10 seconds without input on title/front-end menus**, run a looping AI-played or scripted demonstration using the actual game simulation. Configure `E.Arcade` with `idle:10` if reusing it; its default is 20 seconds. The arcade kit's separate demo scene routes interrupted demos to scores, so replace that behavior with a direct return to title. The helper's own attract wake behavior already returns to title; inspect which path is active rather than patching both blindly.

Use a dedicated seed and demonstration run. Sequence short highlights of worker conversion, deliberate harvesting, fast bees, hive building, flower pressure and the finale; the loop should show the game's range instead of getting stuck in the first easy wave. Cheats such as unlimited stock or controlled flower growth are allowed here. Include a large, unobtrusive demonstration label and a simple return prompt.

Track keys, controller buttons, deliberate analog changes even below the gameplay dead zone, pointer movement/clicks and touch start as activity. Reject stationary controller jitter. Any genuine input exits the demo immediately to the title, restores useful focus and is **consumed**, so it cannot also fire, select a mode or launch a run. Preserve real settings and records; attract score, tutorial flags and stock do not leak into a real game.

Do not enter attract from a paused run, developer tools, loading or an active Hub session. Test the boundary around ten seconds, all input classes, repeated loops and a fresh game started after interruption.

## 12. Developer tools and designer handoff

Add **Developer Tools** to standalone pause. Use controller-navigable pages, large rows and contextual help. A developer must be able to inspect and reproduce a difficult situation without editing source.

Provide:

- Encounter and boss-phase selection, restart-current, next encounter and explicit win/loss triggers.
- God mode for stock/enclosure, unlimited spray, simulation freeze, slow motion and one-tick stepping. A frozen developer overlay must still process UI input.
- Spawn actions for each bee, both combs, a hive, a flower patch and the bird. Offer a small selection of meaningful positions/tiers and a clear-arena action rather than requiring a mouse-only editor.
- Collision/tier/ground-interval overlays, entity IDs, bird target, trap reason, pending spawn timeline, stock ledger, seed and current tick. Keep these out of normal play.
- Live sliders for bee speed, fast-bee multiplier, spawn interval, fire cadence, spray capacity, flower growth, hive trap delay, bird flight/feed speed, irritation recovery, call cooldown and bonus-stock thresholds. Set sensible ranges and units, and group the most consequential values first.
- **Reset to defaults** for tuning as a group, restoring actual simulation values as well as widget labels. If a changed capacity would put current fill outside bounds, clamp visibly. Existing movement reacts immediately; already scheduled spawn events follow a documented policy.
- Copy/export a compact diagnostic state and tuning JSON; import validated tuning/content JSON with useful errors and a working fallback. Do not save a bad import over known-good defaults.

Mark the run assisted as soon as gameplay is mutated or timing is changed. Ordinary audio/glyph settings do not mark it assisted. Dev values may persist in a separate explicit profile, but never silently contaminate normal defaults or Hub sessions.

For the future game, provide data definitions and a small schema/validator for encounters, entries, bee attributes, art palettes, flower patterns, phase conditions and score rules. Include two documented examples in `docs/content-guide.md`: adding a normal wave and changing a finale phase. The standard tools are the data files, reload/import path and in-game encounter/tuning panel; a full custom level editor is unnecessary. Demonstrate that a new arrangement can be made without modifying simulation code.

## 13. Build order and delegation

Keep an integration owner. Parallel work begins after shared interfaces and ownership are written, using isolated worktrees or explicitly non-overlapping files. Keep edits within this project; do not inspect neighboring runs. No agent should change a central contract silently.

| Stage | Work and suitable parallel tracks | Exit condition |
| --- | --- | --- |
| A. Read and prove the base | Read handoff API/kit/test and Hub contract; pin inputs; select title; capture source references. Make the smallest native can/bee scene and a pristine-client Hub boot/harness smoke test. | Engine draws and advances headlessly; assembled HTML opens standalone; Hub reaches ready/countdown with real copies, including server-host setup. Resolve infrastructure surprises here. |
| B. Establish the simulation | Implement canonical arena, action/state contracts, seeded tests, projectiles, worker conversion, comb routing, bird, flowers and stock. Renderer/rigs and audio can proceed against those contracts. | One attractive encounter is genuinely playable, including a meaningful keep/clear/harvest choice and both resource failures. |
| C. Make the source loop complete | Add fast bees, hives, scoring/extra stock, clear/refill, teaching and local co-op. Network specialist adds authoritative snapshots and action validation. | Solo and two players can finish a mixed encounter, with matching network state and no duplicate resource awards. |
| D. Author the complete campaign | Build all six encounters and finale, pacing, story beats and results. Extend assets, animations and music to final quality; implement designer tools alongside content. | Ordinary-input scripted run reaches the ending, all mechanics have appeared, and loss/retry/quit work. |
| E. Finish the shell | Complete TV controls, device prompts, touch assistance, settings, dev panels, attract, records and About. Run focused browser, device and audio checks. | Every advertised action and menu path works; demonstrations and assisted runs cannot affect records. |
| F. Validate and publish | Run the one-command suite against the final assembled artifact, inspect only the necessary screenshots, reconcile required feedback and metadata, then publish final outputs. | Every acceptance item below has evidence; no unfinished feature, stub, broken link or hidden boot error remains. |

Do not postpone networking until after tightly coupling gameplay to rendering or local input. Do not polish a single wave indefinitely while progression and the ending are missing. Once the six-encounter game works, use remaining effort on expressiveness, balance, teaching, input feel and difficult integration edges.

Treat the performance budget as **unlimited as directed**. Add the detail, lights, enemies, effects and shadows the composition needs. Do not introduce FPS targets, benchmarking deliverables, an optimization phase or an arbitrary visual-detail cap. Respect machine-sharing and protocol constraints because they affect other users and correctness, not as a substitute performance brief.

## 14. Verification strategy

Create **one command, `npm test`**, orchestrated by `tools/test.mjs`, that prints only specific failures and one final count such as `Checks: 84 passed, 0 failed`. Capture verbose subprocess output and show it only on failure. Let the runner select a focused group for changes, but keep a complete mode under the same command. Rerun a check only after changing code/content it covers or when a new failure gives a reason. Keep a structured issue log so final feedback counts real distinct issues rather than test invocations.

Use Node and the engine's supported headless pattern for most checks: `new E.Game({headless:true,draw:true})`, `game.advance(seconds)`, action `tap`/`hold`, and a game-owned `game.debug.snapshot()`. Adapt the upstream test example and check `game.errors`. Account for native scene fades before asserting a transition. The engine limits browser catch-up after long frames; browser tests should wait for state predicates rather than equating wall-clock sleeps with simulated duration.

### Simulation checks

| Area | Required evidence |
| --- | --- |
| Movement and collision | Move plus fire, fixed tier routes, worker/comb interaction, fast-bee pass-through, two-hit spray limit, swept contacts, newborn-comb exclusion and no repeated same-contact tier descent. |
| Bird and obstacles | Amber/red harvest value, valid and invalid calls, cooldown, simultaneous calls, target removal, irritation/retreat/return, hive creation from a real pocket and no pocket false positive. |
| Resources | Exact shot costs, automatic can swap, last-shot/last-bee and last-harvest/bonus-can races, bounded no-spare failure, clear refill, threshold crossing once, retry/replenishment reward limits, shared co-op stock and single enclosure recovery from simultaneous flower events. |
| Space pressure | Side and center growth, warned occupancy, nearest valid relocation, can-width clearance, safe landing and no trapped state when a legal interval remains. |
| Progression | Pending-spawn completion predicate, bounded last harvest, hive banking once, every encounter transition, boss supply recovery after comb destruction/bird retreat, all three phases and terminal-state priority. |
| State integrity | Same seed/action stream gives the same authoritative state, viewport cannot change geometry, pause changes no game timers, resets clear stale IDs and all tested values remain finite. |

Test mechanics through observable behavior and invariants. Avoid dozens of tests that only restate constants or duplicate the implementation. Use small fixtures for hard-to-reach collisions, but also prove the complete game without fixture teleports.

### Full scripted playthrough

Run a deterministic ordinary-input player through **all six encounters and the ending**, with normal ammo/stock/cooldowns and no invulnerability, direct entity deletion, forced phase changes or dev skips. It may read state to choose actions but must move and fire through the same action adapter as a human, with bounded reaction and movement. It should deliberately harvest, construct or preserve a hive, clear an obstructing comb, handle pollination and solve the finale.

Assert encounter order, mechanic-coverage flags, stock accounting, final score, win card and the ability to start a fresh run. Add an intentional ordinary loss and retry flow, a co-op run, and a shorter negative case in which the player wastes spray. A perfect bot's win does not establish fair balance: examine whether early warnings and travel windows permit an imperfect player to recover, and record any uncertainty about human difficulty.

### Browser, input and audio checks

Use the already installed Playwright **1.63.0** environment or a locally pinned installation; do not download browsers. Prefer `file://` for standalone. Browser checks exercise the **assembled HTML**, not just separate development modules.

- Boot, canvas content, no unhandled errors, title actions, first encounter, pause/resume, settings persistence, defaults reset, credits and results/restart.
- Stub `navigator.getGamepads` with a standard-mapped controller before load. Exercise stick/D-pad, both spray bindings, call, confirm/back, Options, disconnect and glyph switching. Prove keyboard and mouse focus/aim separately.
- Use touch phone/tablet profiles for multitouch steering, contextual actions, menu, cancellation and orientation change. Verify actual gameplay, not only the presence of touch controls.
- Validate the precise idle threshold and all attract interrupt paths, plus repeat loops and no attract inside Hub.
- Render representative sound offline or inspect analyser output, including mute, music default, pause/resume and teardown.
- Exercise another compatible browser for boot/input/layout, and report renderer/browser limitations accurately. A WebKit phone profile is not a physical iPhone.

Take screenshots only to judge composition, artwork, animation poses, overlapping cues, touch layout and TV legibility that state assertions cannot establish. Inspect at least title, busy mixed wave, flower warning, finale, pause/dev tools and results/About; use a compact contact sheet if helpful. Do not build a screenshot loop for collision or score tests.

### Hub verification

Place unchanged official `harness.html`, `bridge.js` and `round.js` fixtures in `tests/hub/`, preserving relative imports. Serve those and the final artifact on one origin with a loopback-only, OS-assigned port. Use the documented `harness.html?game=<encoded-relative-game-url>&players=2&auto=1` form, adapted to the fixture location. Copying only the repository's `hub-check.mjs` is insufficient because it has other dependencies; a local Playwright wrapper around the official harness is appropriate.

Run the supported two-player scenario, `latency=150&jitter=50&loss=5`, `scenario=host-leave` and `scenario=server`. Await `document.body.dataset.complete === 'true'` and require `window.__hubCheck.pass === true`, reporting each failed check. Also test a one-player Hub boot and time-up because the advertised range is 1–2. These fixtures load real game copies under a simulated Hub coordinator; they are not proof of a test against the live production catalogue.

Also exercise actual co-op actions in two copies: one player fires while the other calls, both observe the same bee-to-comb conversion and score, a loss/reset agrees, a departing client stops contributing input, and one terminal result is reported. Confirm server host has no seat and does not invent a controllable can. Check traffic limits and maximum payload sizes. Harness conformance alone cannot prove gameplay synchronization.

Run no more than one or two browser processes at once. A harness may contain its required multiple game frames inside one browser. Close contexts after each group. Record and stop only your own server/process PIDs; never kill by port or pattern. Before trusting a served page, verify a build fingerprint and title/state marker identifying **this** game. Keep browser artifacts and caches in the development directory and do not use shared temporary folders for builds.

## 15. Packaging and documentation

Make `npm run build` assemble one HTML using the exact output path supplied to the builder. Inline the pinned engine, game code, styles, data and generated assets; the engine is self-contained, so a dependency-free release is a sensible default. External CDN dependencies are allowed by the brief, but any adopted one must be versioned, credited and actually exercised in the final boot test. Do not require a development server to play standalone.

Keep the pristine Hub client block separate and byte-preserved. Escape literal closing-script sequences in the **other** embedded JavaScript, including engine comments, so the HTML parser cannot truncate a bundle. Include all game code/data in the final file; no runtime fetch of development modules or adjacent art/audio files may be required.

Build verification should extract/check the session client against the pinned release, parse required Hub metadata, check script order and load the result after moving/copying it away from the source tree. Scan for accidental development paths, missing resources, unfilled UI text, TODOs/stubs and console errors. Preserve applicable upstream notices and accurately identify any borrowed assets.

Provide a concise `README.md` with play/build/test instructions, controls, how to use dev tools, how to edit content and known verification limitations. Keep `docs/research.md`, `docs/contracts.md`, `docs/content-guide.md`, `docs/test-report.md` and any engine-change notes useful enough that the next designer can extend this game without reconstructing the conversation.

## 16. Required reporting and final acceptance

The finished game's **About/Credits** and the builder's **final chat reply** must both contain the CEO brief's four named groups: **Source Information, Testing Feedback, Engine Feedback and Prompt Feedback**. Answer every question in order; do not replace the feedback with a generic release note. For Source Information use the actual title/source, genre, perspective, pinned stack, art/animation/audio implementation, online features, research, tested scope and the builder's assigned date/environment/model. Set the plan field to **`PLAN.md`** and usage to **`added on import`**. Use **`unknown`** for facts the builder cannot confirm; never invent usage, human testing or production deployment.

Write the builder's required **`exit-interview.json`** beside the final HTML in the exact schema from the CEO brief, with complete `sourceInformation`, ordered feedback arrays and accurate `aiHub` catalogue fields. Parse and validate it before finishing. Choose catalogue genre **Shooter**, type **Game**, players **1–2**, and truthful tags such as arcade, co-op and pixel art; use the builder's selected title everywhere. The planner interview requested separately is not a replacement for this builder deliverable.

Maintain the issue log during development so Testing Feedback can report a defensible count of issues found and the critical/game-breaking subset. Distinguish automated conformance, real game-copy co-op checks, screenshots and untested physical hardware. Engine Feedback must state actual modifications and reasons, or none. Put fuller feedback in legible paged About screens rather than squeezing it into tiny text.

Use this checklist as the release gate:

| Requirement | Accept when |
| --- | --- |
| Originality and source identity | The builder selected its own randomized riff title; the game has original assets/writing and the complete spray–comb–route–bird–flower relationship. |
| Full vertical slice | Six finished encounters, all mechanics taught, a functioning finale, real win/loss/results, retry and replay flows. No advertised but absent feature. |
| Engine and animation | The supplied handoff is the genuine base; native rendering and animation are extended with distinctive creatures, props and poses. |
| Moment-to-moment quality | Shots, routes, useful combs, flower danger, stock and bird state are readable, responsive and tactically meaningful. |
| Controller-first UX | A standard-mapped pad can play and navigate every core screen; PS defaults, Xbox option and last-device keyboard/mouse prompts work. |
| Touch and accessibility | Invisible/multitouch controls, safe assist, contextual actions, safe layout and readable cues are exercised in emulation. |
| Audio | Every sound is generated in code; music starts at 10%; unlock/mute/pause/end work, with objective audio-output evidence. |
| Attract | Exactly ten seconds of front-end inactivity enters a looping showcase; any real input exits and is consumed; no record leakage. |
| Developer/designer tools | Pause opens usable tools; live tuning and reset alter actual gameplay; authoring data can add an encounter without simulation edits. |
| Multiplayer | Standalone local co-op is real; Hub shared-world co-op obeys lifecycle, authority, limits, server-host and departure rules. |
| Testing | One quiet command covers meaningful checks and an ordinary-input whole-game run; official harness and two-copy game behavior pass on the final artifact. |
| Single-file delivery | The correctly named HTML runs away from source files; exact names and locations come from the builder's own brief. |
| Reporting | About, final reply and parsed builder interview contain all required information and feedback, with honest unknowns and limitations. |

Finish by playing the complete arc through automation, reviewing the small set of visual evidence, fixing material defects, rebuilding once needed and reporting the concrete result. The handoff should feel like a small complete arcade release whose next expansion is more authored garden content.
