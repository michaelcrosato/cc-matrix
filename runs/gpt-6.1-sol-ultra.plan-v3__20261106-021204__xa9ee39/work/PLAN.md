# Director’s build plan

## 1. Commission and creative direction

Build a complete, polished arcade action platformer inspired by **Pick Axe Pete (1982)**. Use a side-on, whole-room camera and the supplied engine’s procedural pixel art and animated 3D rigs. The player is a comically overconfident prospector trying to turn an unruly mine into one last spectacular payday.

The central pleasure is making a dangerous mine work for you: chop a boulder for immediate gold, redirect it into another rock for a resource-producing collision, then choose between a replacement pick descending below and a key escaping above. A fresh tool makes the miner bold; a broken tool turns the same room into a dexterity challenge. Doorways punctuate this pressure with a short, glorious breather.

This plan is for gpt-6.1-sol at ultra effort with a 1.05M context window. Use that capacity to understand the complete engine handoff, Hub contract, game code, authored content and test evidence together. Deliver the integrated game described here, including its failure paths and presentation. Keep modules understandable, retain useful research and decisions, and use independent agents for bounded investigations, asset work or review where that helps. A large context window supports thoroughness; it does not require a large framework or an oversized feature list.

The builder owns the title and final branding. Silently generate 50 playful riffs on the source name, select an index with an actual code-executed random draw, and use that selected title consistently. For example, Node’s `crypto.randomInt(0, 50)` supplies a uniform index. Do this in the builder’s run; this plan supplies no title candidates or predetermined selection.

All project paths below are relative to the builder’s development folder. Obtain that folder’s name and the final HTML and feedback output locations from the builder’s own run brief. Keep those run-specific names out of reusable code and documentation.

## 2. Evidence to preserve

Research checked for this plan:

- The [original U.S. manual](https://odyssey2.info/library/manuals/us_pickaxepete/pick-axe-pete.txt), with its [scanned edition](https://odyssey2.info/library/manuals/us_pickaxepete/Pick%20Axe%20Pete%20%28USA%29.pdf), establishes platforms and gaps, intermittent ladders, three boulder-emitting doors, breakable picks, evasive jumps and ducks, temporary keys, and doorway progression. Scoring increases pressure; entering another mine eases it. The original multiplayer competition uses successive turns.
- A [contemporary October 1982 review](https://www.ataricompendium.com/archives/magazines/vg_ill/videogaming_ill_oct82.pdf) describes bouncing rocks, downward-moving replacement picks and upward-moving keys. These opposing resource paths are especially valuable design material.
- Archived [mine](https://www.odyssey2.info/i/screens/pick-scr.gif), [alternate field](https://www.odyssey2.info/i/screens/pick-scr2.gif), and [door-transition](https://www.odyssey2.info/i/screens/pick-scr3.gif) images show a dark field, colored ledges and doors, stark ladders and a bold enlargement effect during transitions.

The source’s precise sound synthesis and music are **unknown** from the material checked. The new score, gibberish voice, deliberate ricochet control, contact-based tool wear, three-mark health, co-op rules and finale are original adaptations. Record any additional audiovisual research before claiming closer authenticity. Keep dialogue short, gleeful and full of prospecting bravado; write fresh lines rather than copying the manual.

Start the build by confirming these sources and the supplied dependencies. Record consulted URLs, facts versus adaptations, versions and commit hashes in `docs/research.md` and `docs/dependencies.md`. Recheck API details if the repositories have changed.

## 3. The playable promise

Deliver a three-chamber expedition with a beginning, escalating middle, climactic extraction and decisive results screen. Target roughly 10–12 minutes for a first successful expedition, with faster repeat runs. Time is a pacing intention, not a gate: a competent player should finish through decisions and execution. Hub adds its explicit session deadline; author the same expedition to fit comfortably within it.

Every gameplay system appears meaningfully during this expedition. The ending opens immediate replay and chamber practice. Room definitions, encounters and balance data must support adding further expeditions through ordinary data and asset authoring.

The moment-to-moment loop is:

1. Read a door’s warning and the incoming rock trajectories.
2. Move, climb, jump or duck into a useful position.
3. Chop for gold or redirect a rock to create a collision.
4. Decide whether to pursue a falling pick, rising key or additional score.
5. Carry the team’s key to a chosen doorway and deliberately unlock it.
6. Enjoy a short transition and relief period, then face a changed arrangement.

The expedition is fully playable solo. Two-player co-op shares the same objective and content, allowing one miner to maintain a rock lane while the other climbs for the key. It adds coordination and rescues without making any obstacle require a second person. Pickaxe actions do not damage the partner; redirected rocks retain their clearly signaled hazard rules for both miners.

## 4. Rules that make the loop reliable

Implement the following as explicit simulation rules. Initial numbers are tuning seeds, to be adjusted after testing; store them together and expose the important ones in Developer mode.

| System | Required behavior |
| --- | --- |
| Movement | Responsive horizontal movement, variable-height jump, crouch/duck, ladder ascent/descent, ladder dismount and safe drops between tiers. Preserve native coyote time and jump buffering. Landing and ladder attachment must agree with drawn feet and hands. |
| Chop | A deliberate pickaxe swing with anticipation, active arc and recovery. Holding Chop repeats at a readable cadence. A successful normal strike shatters a vulnerable boulder for score. Begin around a 0.32-second cycle and tune against rock speed. Deduplicate contacts within each swing. |
| Redirect | A separate, short timed pickaxe action redirects an incoming boulder. Start with an approximately 0.14-second active window. Default to a forward rising arc; up/down selects a high/low route. Mouse users can choose the arc from the pointer’s position. Show the chosen direction briefly through the pick pose and a small arc cue. |
| Tool lifecycle | Begin with six successful contacts of durability. Chop and redirect each spend one contact; misses do not. Show wear clearly, signal the final contact, then break the pick with a distinct pose and sound. Unarmed miners retain all traversal and ducking. Picking up a replacement restores a complete tool. |
| Boulder families | Use ordinary rolling ore, high-bouncing ore that rewards ducking, and a clearly banded heavy rock that needs a redirect into another rock or multiple chops. Each has a distinct silhouette, motion and warning sound. Introduce them separately before combining them. |
| Rock collisions | Resolve each pair once per contact event. Collisions can destroy rocks and release gold, a falling pick or a rising key. Redirected rocks remain hazards to miners after a clearly signaled short contact grace; the ownership cue explains who redirected them, without implying permanent safety. |
| Supply director | Use a seeded reward deck and authored collision opportunities. Schedule a reachable replacement opportunity when all active miners are unarmed. Guarantee another achievable key opportunity after one expires. Define maximum recovery waits in tuning and prove them with tests. Generate opportunities through visible mine events. |
| Rising key | At most one progression key is active or carried for the team. A loose key travels upward along a readable path and eventually expires. A carrier has an unmistakable icon and light trail. Losing a carrier recovers the key into a reachable, deterministic location. |
| Falling pick | The tool visibly falls through the shaft network, then lingers near a reachable lower ledge. Telegraph its expiration. Allow a meaningful chase without demanding an unsafe blind drop. |
| Temporary ladders | Each has inactive, forming, usable, warning and expired states. Signal expiry with flashing rungs and sound. A miner already climbing receives enough grace to reach the nearer landing. Never remove the floor under a player as an incidental ladder update. |
| Doors | Three doors have distinct colors **and symbols**. They emit hazards after a warning, offer recognizable route personalities, and accept the shared key. Unlocking uses an explicit interaction. An attempted keyless interaction causes a short, escapable comic jam with a clear explanation. Walking past a door never triggers it. |
| Pressure | Increase pattern intensity with gold strikes and encounter progress, within authored fair combinations. Every doorway starts with a visibly calmer interval. The next objective must remain possible when the team has no tool. |
| Damage | Use three clear helmet/health marks per miner, brief invulnerability and visible knockback that cannot chain into unavoidable damage. Falls between valid tiers are safe; bottom hazards have an obvious recovery rule. Avoid invisible hitboxes and damage during doorway fades. |
| Checkpoints and failure | In standalone play, a chamber entry is a checkpoint. A solo knockout or complete co-op wipe produces a clean failure screen and chamber retry. Retry restores the checkpoint’s defaults and forfeits the current chamber’s unbanked bonus; it cannot duplicate rewards. Preserve a completed expedition’s best score separately. A Hub session wipe ends the round as a loss and waits for Hub results. |
| Co-op rescue | A knocked-out miner remains as a conspicuous recoverable marker. The partner can hold Interact nearby for a short rescue. If only one miner remains active, the route and supply director continue to support solo completion. After a doorway transition, restore a remaining downed partner with a clear score cost. |
| Scores | Retain the source’s recognizable relative rewards: evasion, breaking ore, replacing a pick, catching a key, entering a door. A modest collision-chain multiplier rewards deliberate ricochets. Award each event once. Evade credit requires a genuine nearby pass; stationary looping cannot farm the same rock. |

Resolve collisions in a documented order: traversal and world contacts, player action contacts, rock-pair contacts, damage to remaining exposed miners, pickups, then door/encounter transitions. Give every entity and reward event a stable ID. When one tick contains a tool break, rock collision and pickup, the result must be reproducible and comprehensible.

The director must prevent resource starvation without erasing the armed/unarmed rhythm. Test deliberately poor play: missed keys, ignored picks, several unarmed minutes, a partner camping, and repeated door mistakes. Recovery should require recognizable play and remain available.

## 5. Expedition and encounter design

Author compact arenas whose routes can be understood at a glance. Prefer five tiers in the introduction, six in the middle, and seven in the climax if the readability study supports them. Doors, safe pockets, ladder routes and opposing supplies form the layout. Give every chamber multiple sensible routes and at least one optional scoring risk.

| Chamber | Experience and teaching | Completion evidence |
| --- | --- | --- |
| Intake workings | A warm, timbered entrance and an eager miner arrival. First demonstrate move/jump/duck with generous warnings, then chopping and tool wear. Stage a visible two-rock collision, a descending replacement and a rising key. Teach a redirect in a forgiving lane. Introduce ladder warning and the keyless door jam safely. | Player has used the movement set, experienced being unarmed, renewed the tool and used a key. Tutorial assistance reacts to completed actions and disappears; returning players can skip its prompts. |
| Crosscurrent workings | More open vertical routes, contrasting lantern light and mineral seams. Introduce high-bouncing and heavy ore, crossing collision lanes, and ladder schedules that reward planning. Door choices lead to different authored encounter arrangements and lighting while retaining all mandatory features. | At least one deliberate collision reward, meaningful high/low redirect, an evasive unarmed route and a door choice are available. Co-op has a natural opportunity to split jobs and rescue. |
| Deep workings and extraction | A rich, dramatic chamber with three characteristic door mechanisms and the full route vocabulary. The extraction sequence sends three escalating, clearly telegraphed waves through those mechanisms. Successful collisions expose the final key opportunity; the team carries it to the extraction door. | All established systems combine without a newly invented final-stage control. Extraction resolves the expedition, banks results and opens replay. Failure and time-up also reach complete results states. |

Door choices select data-defined encounter variants within the expedition; they do not imply a large unseen branching campaign. Each route rejoins the same next chamber with its own pattern and bonus opportunity. Guarantee that every supported route demonstrates the whole demo’s mechanics by the end.

Use short visual interludes rather than dialogue stops: the miner flourishes the pick, a door unfolds into impossible depth, the new mine’s palette surges forward, and dust settles before the next warning. Keep controls, objective and safety state unambiguous through every transition.

The finale is a mine-wide rock-handling setpiece. Its machinery, anticipation and changing lanes provide spectacle using the same action vocabulary. Provide an authored extraction, victory sting, co-op celebration and legible results, including final score, contribution highlights and a clear standalone replay action. Active sessions finish through Hub and leave further rounds to its lifecycle.

## 6. Controller-first UX and all input methods

Build one screen flow: title → expedition or practice → gameplay → pause/settings/developer/about → results. Online sessions use the Hub’s entry and results lifecycle described below. Main screens use a small number of large choices. Paginate long credits and feedback instead of shrinking type or adding dense scrolling panels.

| Action | Standard pad / PlayStation prompts | Keyboard and mouse |
| --- | --- | --- |
| Move / climb | Left stick or D-pad | A/D or Left/Right; W/S or Up/Down on ladders |
| Jump / accept | Cross | Space; Enter for menu acceptance |
| Chop | Square, hold to repeat | J or primary mouse button, hold to repeat |
| Redirect | R2, direction from stick | Q or secondary mouse button; pointer selects high/low aim |
| Duck | Circle or Down when not climbing | S/Down when not climbing |
| Door / rescue | Triangle | E; click an in-range highlighted door or rescue marker |
| Pause / back | Options / Circle | Escape; clickable menu controls |

Resolve contextual overlap deliberately. On a ladder, up/down means climbing; on a ledge, down means ducking. Redirect can read a short-lived aim choice without latching unwanted climb input. A door or rescue action consumes its input so it cannot also dismiss a menu or trigger the next chamber.

Use the engine’s input/rebinding system and `game.input.label(action)` for prompts. Last meaningful device use changes labels without flapping from analog noise or idle pointer movement. PlayStation glyphs are the default; Settings offers Xbox A/B/X/Y glyphs. Preserve player rebinding, dead zones and device ownership. Mouse hover moves menu focus, clicks activate the hovered item, and world clicks respect range and line-of-play rules.

Title, pause, settings, practice, Developer mode, About and results must all work with a pad alone. Restore focus sensibly after closing a panel. Handle controller disconnect in standalone with a recoverable pause and device reassignment. A second pad joining couch play must not steal player one’s bindings or held input.

Judge the TV view at 1920×1080. Use generous safe margins, prominent objective and key ownership, distinct player outlines and readable action prompts. Establish logical resolution and camera scale from a silhouette test before dressing rooms. The starter’s 320×240 assumptions are inadequate evidence for a seven-tier arena. Use a compact action area, with surrounding mine scenery filling wider displays. Prove the whole-room action remains understandable on narrow screens; if camera tracking is necessary, retain advance warnings for hazards beyond the visible edge and look ahead toward rising resources.

Touch uses the same game, screens and encounter data. Start with an invisible left-thumb movement/climb area, a right-thumb jump gesture or tap region, assisted chopping, forgiving ladder attachment and assisted redirect aiming. Left-thumb down ducks off ladders. A large contextual action bubble appears only when a redirect, doorway or rescue is relevant; use pointer IDs so movement plus action works simultaneously. Give it an explicit target and symbol: prioritize a nearby rescue, then a deliberately faced in-range door, then an available redirect. Keep its target stable while held, consume its press, and allow other right-area taps to jump. Keep a persistent menu button and minimal other chrome. Provide a short first-touch hint that fades. Touch assists must exercise genuine movement, damage, wear and objective rules. Test landscape and portrait with actual Playwright touch events; the game must remain operable without a keyboard.

Include independent music/SFX/voice volume, mute, reduced motion, reduced flashes, shake strength and glyph choice. Honor them in impact effects, door transitions and attract playback. Color and pitch are supplementary cues; shapes, animation and text carry the same information.

## 7. Native art, animation and coded audio

### Art and staging

The inspected handoff is **my-3d2dge 0.89.1**, commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Its style is procedural pixel drawing with posed 3D humanoids projected into 2D views. Use that style confidently: layered cave silhouettes, shaped timber supports, warm work lamps, cool mineral glints, drifting dust, ore flecks, machinery and lively shadows. Give interactive platforms and collision silhouettes the strongest readability.

Create original identifying assets: the miner’s helmet and costume, a substantial pickaxe, door mechanisms and their emblems, three ore families, the key, temporary ladder appearance, tool-break pieces and extraction machinery. Use the engine library for ordinary carts, barrels, crates, rocks and background props. Add detail, lights and effects wherever they improve the scene; the brief sets no FPS target or optimization phase.

Read [asset authoring](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/docs/ASSETS.md) before defining custom native shapes and materials. Use registered shapes, palette tones and native drawing hooks. Asset shapes are still objects: moving mechanisms and held tools need animated props or code. Their generic collision footprints do not define rolling-rock gameplay. Use the full engine for the finished visual build; its lightweight agent edition omits asset drawing.

Treat useful props as authored scene elements with intent: a safe alcove reads as shelter, a high ledge frames a key route, a door’s pistons preview its wave. Strong foreground silhouettes frame the arena while decorative dust and flashes leave upcoming hazards visible.

### Animation

Build on `E.Humanoid`, `hero.rigState(...)`, native climbing and `E.Attack` phases. Register the pickaxe and helmet through the verified weapon/hat hooks; add custom poses through the native pose system. Keep movement, facing and tool contact aligned.

Complete an animation checklist: idle anticipation, run, jump rise/apex/fall, landing, climb, ladder dismount, duck, chop windup/contact/recovery, redirect anticipation/contact/recovery, final-wear warning, tool break, unarmed reaction, pick/key collection, door jam, unlock, hurt, knockout, rescue, extraction and celebration. Co-op miners remain recognizable in silhouette as well as color.

Authoritative hitboxes come from simulation data. Rendering a pose must never create or alter a hit, consume a reward, advance a cooldown or make a menu item actionable. Presentation can emphasize contacts with sparks, camera impulses, squash and trails while gameplay remains identical in a renderer-free authority.

### Audio

Generate all music, effects and gibberish with code using the native audio system and Web Audio. Ship no recorded audio files and make no audio-file network requests. Use separate music, SFX and voice buses. Initialize music to **10%**, synchronize that value with Settings, and preserve an existing user preference thereafter.

Write a playful mining motif with chamber variations, calmer entry phrases, pressure layers, a finale and complete success/failure stings. Sounds cover footsteps, ladder rungs, each boulder family, door warnings, chopping, redirect timing, rock collisions, pick wear/break, rising keys, pickups, hurt, rescue and UI focus/accept. Short synthesized syllable clusters express boast, alarm and delight; provide text/caption equivalents for informative cues.

Start audio only after an allowed gesture and tolerate a suspended context. Online readiness must not wait for sound permission. Keep audio scheduling separate from gameplay authority. Use offline rendering and analyzer checks to verify non-silence, bus gains, bounded amplitude and cleanup; listening quality remains unconfirmed in this environment.

## 8. Technical foundation and project organization

Inspect the complete [API card](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API.md), [index](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API-INDEX.md), [guide](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/AI_GUIDE.md) and [platformer kit](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/kits/platformer.js). Vendor the handoff under `vendor/engine/`, record its origin and keep any engine patches reviewable. Extend native systems where they fit.

Suggested ownership boundaries; adjust filenames when the actual implementation benefits:

| Relative path | Responsibility |
| --- | --- |
| `src/main.js` | Bootstrap, standalone/Hub branch, screen lifecycle and application teardown. |
| `src/sim/` | Authoritative mine, miners, rocks, tools, pickups, collisions, encounters, rescue and scoring. No DOM or audio dependencies. |
| `src/content/` | Chamber definitions, route variants, spawn patterns, authored supply opportunities, text and shared tuning definitions. |
| `src/input/` | Canonical actions, pad/keyboard/mouse/touch adapters, couch seat ownership and touch assists. |
| `src/view/` | Native rigs, custom assets, room presentation, camera, effects, HUD, menus and accessibility. |
| `src/audio/` | Instruments, sequences, SFX, gibberish and bus lifecycle. |
| `src/net/` | Hub transport adapter, protocol validation, snapshots, interpolation and session completion. |
| `src/dev/` | Pause-reachable Developer tools, overlays, scenario controls and tuning UI. |
| `tests/` | Deterministic simulation, input, browser, audio, expedition and Hub cases. |
| `tools/` | Quiet verification runner, packaging, content validation and owned test-server lifecycle. |
| `docs/` | Research, dependency provenance, design decisions, content authoring, issue ledger and captured evidence. |

Use `E.PlatformMap` and `E.Platformer` in `side` view. The native coordinate convention is x right, z up and y depth; keep the gameplay plane consistent. One tile is 16 world units. Map text is top-first while `cell`/`set` vertical cell coordinates are bottom-first. Put conversion in one tested content adapter.

Use native movement, coyote/buffer behavior, one-way platforms, crouch and ladders. Feed `hero.update(dt, level, intent, movingPlatforms)` from canonical intents. That same path must accept humans, attract AI, scripted tests and remote input. Dynamically change ladder tiles with `level.set(...)`; store the underlying tile and replicate the ladder’s state and grace timer.

The engine’s fixed tick is **1/120 second**. Choose one stepping owner for each runtime. A pure simulation containing the native platform map and platformers works without a renderer. Alternatively, a verified browser authority can use `new E.Game({headless:true, loop:false, step:1/120, autoPause:false, menu:false, fullscreen:false, corner:false})`, initialized with update and a no-op draw, then advanced once by its owner. Never double-step through both a native loop and an external scheduler.

Define canonical, serializable state: run and chamber epochs; simulation tick; active roster; miner movement and action timers; tool/health/downed state; rocks and contact identities; pickups/key owner; ladder topology and timers; door states; director progression and RNG state; score; and completion. Distinguish presentation-only particles and animation cues. Build a serialize/restore round-trip test early, including a miner mid-jump and another mid-ladder.

Use seeded gameplay randomness and a separate cosmetic stream. Hub generators expose no state-export API: track draws for each named generator so restoration recreates and advances its stream, or initialize a game-owned serializable PRNG from the session seed. Round-trip tests must compare subsequent random outcomes. Make simulation events carry unique IDs and route them to presentation and audio. Keep menu opening, drawing, audio suspension and viewport changes from affecting gameplay outcomes. Impact pauses should be presentation effects unless deliberately synchronized as simulation rules.

## 9. Standalone and AI Hub multiplayer

### Supported modes

- Standalone: complete solo expedition and **two simultaneous couch players**, using separate pads or keyboard/mouse plus pad. Player two may join safely at a chamber entry or clear join window; disconnect and drop-out leave a viable solo run.
- AI Hub: one or two players in a genuine online **shared-world** session, including the hidden nonplayer authority scenario.

This is the chosen interpretation of the brief’s standalone and Hub requirement. The supplied library provides online sessions inside Hub; it supplies no standalone room or matchmaking service. Label the standalone option “Local co-op” and the Hub capability accurately. Any broader standalone internet transport would be a separate product decision.

Use `game.allowJoin({max:2,...})` and explicit miner ownership for couch play. `E.Arcade.start(2)` means alternating turns and does not implement this co-op mode. A local join must never add a seat to an active Hub session.

### Verified Hub contract

The inspected baseline is Session Protocol v1, client **1.4.0**, commit `35a1047f2067b2af3de3943f0fe452f39105d869`. Read its [contract](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md), [client](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/session.js), [shared-world example](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/examples/arena.html) and [checker](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/scripts/hub-check.mjs). Recheck them at build time and record the actual baseline used.

1. Embed the released client **unmodified**, as the first script after the charset declaration. Keep that block outside game-code transforms. Include `hub:session=1`, `hub:session-players=1-2`, `hub:session-mode=shared-world`, clear goal/how-to metadata, and a positive session duration suited to the expedition. Use 15 minutes, the inspected maximum, and prove deliberately paced successful runs on every route finish with margin. Treat `AIHub.time()` and `time-up` as the wall-clock deadline; paused menus or accelerated simulation ticks cannot extend it.
2. Call `AIHub.connect({mode:'shared-world', seats:[1,2]})`. Its null standalone result enters the ordinary local flow. An active session bypasses title, attract, local lobby and other pre-round menus. Use the default Hub instruction card.
3. Install lifecycle handlers, initialize the appropriate copy, and call `AIHub.ready()` once without waiting for audio or a player press. `start` includes a countdown; gameplay begins only when `AIHub.time() >= 0`.
4. Only `AIHub.isHost` owns the world. Support `AIHub.server === true`: that authority has no miner or local input, and does not need renderer, camera or audio. It still initializes, readies, steps, broadcasts and finishes.
5. Send client actions to `AIHub.host`; authenticate the sender from the message callback’s `from`. Use the Hub-assigned seat, name and color, and accept world snapshots only from the host. Names enter the UI through text rendering.
6. Retain separate generators from `AIHub.rng(label)` for gameplay and presentation. Repeatedly requesting the same label starts a fresh generator, so hold the generator instead of recreating it on every random draw.
7. On a nonhost leave, update the active roster, remove that miner safely and recover a carried key. Finish co-op using all remaining active players in one tied standing and the appropriate `won` value. Contribution statistics can appear separately.
8. Only the host calls `AIHub.finish()`, exactly once. On `time-up`, finish from current authoritative state within the supplied `graceMs`; the inspected contract currently gives five seconds. Extraction, wipe and time-up need explicit results.
9. On `end`, stop gameplay, inputs, messages, timers, scheduled music and all sound. Follow Hub results. Host loss voids the round under the contract; leave migration and restarts to Hub.

### Transport and session UX

Build a small versioned protocol with epochs, input sequence numbers, repeated action-edge counters and acknowledgments, snapshot IDs, and reliable critical-event IDs. Lost movement packets may be replaced by newer state; a lost Jump/Interact edge must survive until acknowledged. Reject stale packets after a chamber change. Deduplicate rewards, damage and completion.

The Hub’s limits remain binding: at most 20 outgoing messages per second per copy and 16 KB per JSON message. The transport recommends keeping unreliable packets near 1,200 bytes. Start with approximately 10–12 state/input updates per second, low-rate reliable keyframes and batched critical events under one bounded send scheduler. Count the combined traffic. Use compact state representations; chunk a larger reliable full state with explicit atomic assembly if required. This is protocol compliance, independent of the scene’s visual detail budget.

Apply local movement promptly with interpolation and, if needed, limited local movement prediction/reconciliation. Keep damage, tool wear, pickups, score, topology and door transitions authoritative. Use a short input-silence timeout that neutralizes held controls, and test it under the prescribed delay and loss. Remote interpolation and cosmetic effects never create another authoritative simulation.

In online play, a local pause/settings overlay leaves the world and Hub clock running and sends neutral local input. State that clearly. Adapt the engine’s native hidden-page/controller-disconnect pause so a single client cannot freeze the authority. Session menus omit local restart/title navigation. Ignore the Options shortcut when Create is held, reserving that combination for Hub. Respect Hub-provided storage isolation and fullscreen handling; no persistent unlock is required to enter a session.

In active sessions, route gameplay networking only through `AIHub.send`. Follow Hub’s restrictions on external sockets/brokers, player chat/voice/emotes/custom names, browser dialogs/popups and page navigation. The miner’s authored gibberish remains ordinary game audio.

## 10. Attract mode, Developer mode and authoring

### Attract

Exactly ten seconds without meaningful input on the standalone title/menu starts a looping AI-driven demonstration. Use the real simulation and canonical input path with an attract-specific director. It may have invulnerability, supplied resources and scripted positioning. Show traversal, a broken pick, resource recovery, a ricochet, a rising key, a ladder race, a door transition and the extraction spectacle across its loop. Label it as a demo.

Any key, button, meaningful axis movement, pointer/touch action or click exits attract immediately to an appropriate focused menu. Consume that wake input. Normalize input history, RNG, clocks, time scale, audio, particles, score and persistent state before a real run. Attract never writes records, consumes a checkpoint, joins online or changes player settings. Continuous stick drift must neither prevent attract forever nor cause a rapid exit loop. Native arcade helpers are useful after their timing and wake behavior are verified against these rules.

### Developer tools

Reach Developer mode from the pause menu with a controller. Use a few paged panels and large sliders. Include chamber/encounter selection, restart/checkpoint controls, seed display/replay, invulnerability, tool/key grants, spawn/purge boulders and supplies, step/slow motion, collision and navigation overlays, director status, and deterministic scenario playback.

Live balance sliders include move/climb speed, jump/gravity, chop cadence, redirect window, tool durability, rock speed, spawn interval/pressure, key/pick lifetime, ladder timing and rescue time. Keep defaults, allowed ranges and current values in one typed/schema-validated tuning definition. Reset to Defaults restores the complete set and Settings displays the new values immediately. Specify whether each change applies immediately or at the next spawn, avoiding half-updated entities.

Developer sessions are visibly marked and cannot overwrite ordinary score records. Standalone tools can alter the simulation freely. In live Hub sessions, keep tools observational unless an explicit authoritative test session enables replicated debug commands; ordinary peers cannot mutate the mine through a local slider. The normal standalone Developer mode remains fully usable.

### Content authoring

Define rooms, ledges/gaps, door positions and variants, ladder schedules, encounter patterns, reward decks, safe spawn zones, tutorial triggers and completion conditions in readable data. Validate IDs, references and reachability. Provide a room preview/scenario launcher, native asset preview workflow, and `docs/authoring.md` explaining how to add a chamber, boulder pattern and asset without modifying the core simulation. The complete demo must exercise that pipeline.

## 11. Build sequence with reviewable gates

Work through dependencies in this order; keep valid end-to-end play working as each layer arrives. Parallelize isolated assets, research, tests or adapters after their interfaces are established. Use separate worktrees under the development folder when concurrent edits require isolation. Integrate and review continuously.

1. **Contract and dependency baseline.** Confirm research, engine and Hub APIs, environment tools and output conventions. Record the requirement-to-system/test map. Establish native engine loading, the pristine first Hub script and a basic single-file packager. Gate: a bundled native animated miner launches from `file://`, and Hub bootstrap chooses the correct runtime role.
2. **Readability and movement study.** Build the first undecorated but intentionally styled mine with native platforms, gaps, temporary ladders, camera and inputs. Test TV, phone portrait/landscape and controller ownership. Gate: a player can traverse every supported route and read doors, miner and hazards at each size.
3. **Complete gameplay circuit.** Implement rocks, chops, redirects, wear, collisions, supplies, key and door transition. Add seeded control and state serialization. Gate: a scripted player can go armed → unarmed → renewed → keyed → next chamber without directly setting those outcomes. Edge cases cannot strand the run.
4. **Whole expedition.** Author all chambers, door variants, pressure, finale, checkpoints, failure/retry and results. Add scoring and record separation. Gate: normal-input scripts complete every route from title to extraction; defeat and retry also work, with no test-only completion switch.
5. **Co-op and Hub.** Add simultaneous local seats, rescue, safe join/drop-out, authority/client adapters, countdown/results, network faults and dedicated authority support. Gate: two players complete the expedition with a shared objective; one can leave carrying the key and the other can still finish. The official harness scenarios pass.
6. **Presentation and accessibility.** Complete source-specific assets/poses, audio, effects, transitions, all menus, mouse and touch behavior, glyphs and accessibility settings. Gate: every action has readable anticipation/contact/recovery; each required screen works with pad alone and touch operates the complete expedition.
7. **Attract, tuning and authoring finish.** Complete the demonstration, all live controls and data authoring workflow. Gate: the ten-second demonstration and wake/reset tests pass; all default values restore and authored content validates.
8. **Release proof.** Run the applicable quiet suite after the final covered changes, inspect only unresolved visual questions, validate the shipped HTML and metadata, and complete the required feedback outputs. Gate: the final artifact passes the same gameplay and lifecycle evidence as the modular development version.

These are completion gates, not permission checkpoints. Keep building and resolving defects until the deliverable meets them. Budget no work for FPS targets or an optimization pass; use the available scene detail where it serves the game.

## 12. Verification and evidence

Provide **one command**, preferably `node tools/verify.mjs`, that aggregates applicable simulation, content, browser, audio, packaging and Hub checks. Successful output contains only a one-line count; failures include actionable context. Capture noisy tool output and print it only when the associated check fails. Rerun covered checks after code changes that affect them; reuse valid evidence otherwise.

Use native headless tools first: `game.advance(...)`, canonical intent streams, snapshots, error capture and `dispose()`. Browser tests verify integration with actual rendering/input/audio/storage. Use state-based waits; software rendering can make wall-clock waits unreliable. Keep debug snapshots stable enough to explain a failed run without a screenshot.

| Area | Minimum useful proof |
| --- | --- |
| Native movement and geometry | Coyote/buffer, variable jumps, gaps, crouch clearance, ladder attach/dismount/expiry grace, body/feet contacts and all route reachability. Map row conversion has an explicit case. |
| Action contacts | A swing cannot hit the same rock twice; redirect arc/window behave consistently; final durability hit breaks the tool once; invulnerability and simultaneous contacts resolve in documented order. |
| Resources and fairness | Reward deck reproducibility, bounded key/pick recovery, expired key replacement, no reachable route depending on an expired ladder, and a complete unarmed recovery. No duplicate key or score reward on concurrent collection. |
| Full expedition | Scripted human-equivalent input from title through all chambers and extraction; each route variant covered; standalone checkpoint failure/retry and results/replay; session wipe reports loss without restart. Assert ordered feature events so a finish flag alone cannot pass the test. |
| Co-op | Separate ownership, joining, dropping out, rescue, wipe, simultaneous pickups, key carrier departure and shared transition. Extra local pads cannot create Hub seats. |
| Menus and input | Standard-mapping pad injected before bootstrap; pad-only navigation of every screen, rebinding and Xbox/PlayStation labels, focus restoration, mouse hover/click, keyboard genre controls, touch multi-pointer movement plus contextual action. |
| Attract | Before/at the ten-second boundary, demo feature coverage and loop, wake from every device, wake event consumption, clean new-run state and unchanged saved records. Use virtual/native time rather than a real ten-second sleep. |
| Developer mode | Every slider affects the intended rule, ranges validate, Reset restores all defaults, chamber/scenario tools work, debug state excludes normal records, and online read-only behavior is clear. |
| Audio | Programmatic music gain starts at 0.1, expected buses produce nonzero samples, mute and voice settings work, suspend/resume is tolerated, and end/dispose stop future scheduling and output. No audio assets or requests. |
| Packaging | Final `file://` launch, no missing relative resources/imports, pristine Hub client placement, no console/game errors, title/metadata consistency, exact feedback JSON shape and fresh-state launch. |
| Hub | One and two players; two players with 150 ms latency, 50 ms jitter and 5% loss; host leave; two players plus nonplayer server authority; countdown and ready; complete expedition with deadline margin; stale/duplicated/delayed action handling; wipe and time-up; no input/traffic/audio after end. |

Vendor the official Hub harness and its required support files inside the development folder at the game’s origin. Use an owned `127.0.0.1` server on an OS-selected port and verify page identity before trusting the result. Assert both `window.__hubCheck.pass === true` and `document.body.dataset.complete === "true"`, plus gameplay-level assertions. Wrap the official checker rather than using any catalogue-recording option. The declared 1–2 seat range defines the relevant player-count cases; the hidden authority is an additional copy, not a third player.

Use installed Playwright 1.63.0 and existing browsers. Run Python browser scripts with the provided Playwright environment, or use a locally pinned Node package. Keep one or two browsers open, close owned contexts/processes, and store all evidence and server state inside the development folder. Stop only recorded PIDs you started. Avoid browser/dependency reinstalls and shared-port assumptions.

Use screenshots for questions scripts cannot settle: TV legibility, silhouette separation, composition, overlapping effects, touch occlusion, reduced-flash presentation and the visual relationship of pick/hitbox/rock. Inspect opening, dense midgame, unarmed recovery, doorway, finale, pause/developer and About views. Use a short animation sequence only for unresolved pose/contact readability. A screenshot is not proof of a completed mechanic or network session. Browser stand-ins cannot establish real DualSense hardware feel, real iOS behavior, TV comfort or how the sound feels to a listener; report those limits accurately.

Maintain `docs/testing.md` with command/coverage, passing evidence, unique defects caught and fixes. Define a critical defect as one that prevents launch/control/progression/completion, loses the authoritative game state, or breaks a mandatory mode. Count unique defects rather than repeated failing assertions. Use this record for the final feedback; zero is valid when true, and unmeasured information is unknown.

## 13. Packaging, provenance and feedback

Keep development modular, then generate the single HTML at the exact final location required by the builder’s run brief. The generator receives or derives its output name; this plan deliberately supplies no filename template. Include native engine, chosen native assets, game code, CSS, UI and procedural content in dependency order. External CDN dependencies are permitted, but the engine itself can be included without a CDN.

Preserve the pristine Hub client block byte-for-byte as required by its checker. For other embedded scripts, escape literal closing-script sequences safely; the engine header itself can contain them. Use a tested generator, and independently check the final HTML’s parse and runtime behavior. Development-relative module loads and local asset fetches must be resolved into the artifact. Confirm `file://` standalone play and same-origin HTTP Hub play separately.

Build one provenance/feedback data model and render it in the in-game About/Credits pages, serialize it into the brief-prescribed root feedback JSON, and use it in the final chat reply. All three locations include **Source Information, Testing Feedback, Engine Feedback and Prompt Feedback**. Use the brief’s exact schema and question order: four testing answers, six engine answers and four prompt answers, with every required value filled. Populate `unknown` for unconfirmed facts.

Source Information includes the run’s date, source, actual supplied plan filename, chosen genre/perspective, actual engine and library versions, art style, animation, coded music/SFX/gibberish, online scope, allowed testing parameters, research, environment and exact model/effort from the builder’s brief. The `usage` value is exactly **`added on import`**. Derive run-specific values from that brief; do not estimate tokens, cost or elapsed usage.

The catalogue block uses the selected title and matching title-screen branding, a short tagline, concise description, type `Game`, one permitted genre (use `Platformer` for this design), the source, a confirmed franchise or empty series, players `1–2`, concise actual controls and three to six lowercase tags. Report online co-op through Hub and standalone local co-op precisely. Do not claim hardware or listening tests that were unavailable.

Answer engine feedback from actual implementation experience, including any engine changes and why they were necessary. Keep the engine patch list alongside dependency provenance. Answer prompt feedback candidly; the standalone-online interpretation is a concrete ambiguity worth reporting if it remains unresolved. Check JSON parsing, required keys, array lengths and value types before delivery.

The builder’s final reply should identify the completed artifact and give the required provenance and feedback, including validation results and remaining verification limits. It must be self-contained even when progress messages are hidden.

## 14. Final acceptance

The release is ready when a fresh player can understand the objective, enjoy all movement and rock-handling systems, recover from tool loss, choose and use doors, complete the authored extraction, fail/retry cleanly and immediately replay. Solo, simultaneous couch co-op and Hub co-op must exercise the same complete game. All promised menus, touch assists, attract behavior, Developer controls, animation, coded audio and About/feedback content are finished.

The delivered HTML must be the tested final build. The developer folder must support reproducing that build, adding content and running the quiet verification command. Finish with complete feedback and cleanly disposed owned processes, with no stubbed actions, placeholder assets or advertised unfinished features.
