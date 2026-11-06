# Director’s build plan

Build an original, finished isometric arcade action-puzzle game inspired by **Diner (1987, Intellivision)**. The pleasure is lining up a kick, sending a huge ball of food down a ridiculous restaurant, flattening a pursuing gang, and watching dinner land on the plate. Every system should strengthen that sequence.

This plan is for **gpt-6.1-sol ultracode (ultra), with the stated 1.05M context window**. Use that capacity to understand the full engine, keep the complete game and integration contracts in view, author substantial content, and follow failures through all affected systems. Deliver the whole vertical slice described here. Work in coherent implementation passes with explicit acceptance gates; do not mistake a large context window for a reason to produce one giant source file.

The builder owns the title. Follow the builder brief’s silent fifty-candidate brainstorm and real random selection procedure. Do not use a title supplied by this plan. The builder’s own brief controls its development-folder name, final HTML name, completion-interview destination, run metadata, and final reporting. **All project paths below are relative to that development folder.** Upstream links identify research sources, not local output locations.

## 1. Research and creative direction

### Confirmed source identity and mechanics

The original is Realtime Associates’ Intellivision game, designed/programmed by Ray Kaestner, with graphics by Connie Goldman and sound by David Warhol. Its cast includes a chef pursued by hot dogs, cherries, bananas, and a root-beer mug. The developer history describes food-ball kicking as its central invention. [Developer-history archive](https://www.intellivision.us/intvlibrary/Games/Trivia/games_intv.htm#diner).

The instructions establish the useful design spine: food rolls across floors, ramps, and ledges toward a lower plate; rolling food squashes pursuers, which later recover; directional pepper briefly makes enemies safe to touch. Side orders replenish pepper and improve a food-catching bonus after four plates. Moving floors create holes and lifts. Source multiplayer alternates turns. A player starts with five lives and five peppers. [Original instructions, preserved by Blue Sky Rangers](https://history.blueskyrangers.com/instructions/diner.html).

Archival screenshots and descriptions show a fixed diagonal view of an improbable stepped diner, strong food silhouettes, and room-to-room transitions. Use those references for composition and spatial character. [Visual archive](https://www.intvfunhouse.com/games/dine.php). This planning research did not establish the exact original musical arrangement by listening; verify a gameplay recording before describing it as heard. Compose new music and effects.

Before implementing, record the source references and observations in `docs/research.md`; inspect representative source screenshots and a gameplay recording covering a normal room, moving architecture, and the bonus. Separate confirmed behavior, uncertain observations, and this game’s deliberate inventions. Do not stall development trying to reproduce every historical level or emulator quirk.

### The directed interpretation

**Genre:** arcade action-puzzle, with food bowling, pursuit, and route planning. **Perspective:** fixed orthographic isometric overview, with real height relationships and a shared camera. **Players:** one or two simultaneous chefs, locally or online. Simultaneous cooperation is an intentional adaptation of the source’s alternating play.

The original addition is a small family of **quarter-turn serving turntables and fixed bank bumpers**. They let players redirect a roll through a gang and into a delivery route. Introduce them safely, then combine them with pursuit and moving architecture. Required solutions always work with one chef. Two chefs gain freedom to bait enemies and prepare routes together.

The tone is exuberant restaurant slapstick: grumpy food, enormous dinnerware, nervous chefs, optimistic signs, and brief menu-board jokes. Write original lines. Example tone: “Lunch has escaped!” or “Please keep your dinner on the plate.” Give antagonists original names and designs; establish a recognizable chef-versus-rotten-food world through behavior and silhouettes.

Four pillars govern decisions:

1. **A kick is a visible plan.** Facing, target, route, danger, and destination are understandable before commitment.
2. **The meal is also the weapon.** Routes deliver food and create satisfying opportunities to squash pursuers.
3. **Height is readable.** Overlapping floors never produce mysterious collisions or hidden mandatory controls.
4. **The whole shift is complete.** Four authored boards, a celebratory bonus, defeat, victory, replay, co-op, settings, tools, and credits all work.

## 2. Finished slice and player journey

Target roughly **12–18 minutes for a first successful shift**, adjusted through real play rather than padded waiting. There are four connected service boards with five required food balls apiece, followed by a 35-second catching bonus and a finished results sequence. Skilled replays can be substantially shorter. This is a content target, not a timed-loss condition.

Standalone flow:

`Title → Solo / Couch Co-op / Online Co-op → Short service card → Board 1 → Board 2 → Board 3 → Board 4 → Bonus → Results → Replay or Title`

Title also exposes How to Play, Settings, and About/Credits. Pause exposes Resume, Controls, Settings, Developer, Restart Board, and Return to Title. Restarting a board through pause marks the run Practice; a fresh shift restores normal scoring eligibility. Defeat offers Retry Shift, Practice This Board, and Title. Every choice is implemented, focused, and reversible where appropriate.

First-run onboarding happens through safe play in the first board’s opening area. The first kick is available immediately; the first delivery takes under a minute for a new player. Teach move, aim/kick, pepper, and the plate objective with short, dismissible prompts triggered by actual actions. A returning player can skip prompts. No separate tutorial room is required.

The main objective remains **deliver all five foods to the plate**. Optional side orders, combo opportunities, and service medals add risk and replay value. Do not add a restaurant economy, ingredient crafting, dialogue trees, a sprawling campaign, or an unrelated boss subsystem. The fourth board supplies the climax by combining the established rules.

### Content progression

These board labels are internal descriptions, not a game title or mandatory shipped names.

| Board | Spatial composition | Required learning and play | Authored payoff |
| --- | --- | --- | --- |
| 1: Front counter | Three readable tiers, broad safe starting landing, two ramps, visible lower plate | Move and aim; kick a resting food; deliver; evade a sausage pursuer; pepper; collect a side order; try one turntable in safety | An obvious two-enemy bowling opportunity and a route that visibly lands on the plate |
| 2: Soda balcony | Two crossing routes on different heights, a bypass stair, two quarter-turn devices and one fixed bumper | Distinguish height; select a route; bank a shot; bait a corner-cutting cherry pair; rotate a turntable under mild pressure | A multi-tier bank shot through a clearly telegraphed enemy group |
| 3: Back kitchen | One moving service lift, permanent access stairs, a warned opening-floor segment, marked food recovery chute | Board/ride/exit lift; wait for safe floor phases; exploit enemies using the same traversal rules; recognize a banana’s committed rush | A lift-assisted delivery, safe recovery of a deliberately demonstrated misroute, and an optional side order behind a timed gap |
| 4: Midnight service | A grand stepped room connecting every learned device, alternate routes, root-beer captain in the roaming gang | Choose routes under full pursuit; use every enemy tell; combine pepper, turning, banking, lift timing, and delivery | A staged final delivery with a large fair combo opportunity, followed by a chef celebration and bonus transition |

Author each board with a beginning, complication, and mastery opportunity. Increase enemy pressure deliberately, for example from two active enemies in the opening to five in the final room. Every enemy behavior and traversal feature has a guaranteed encounter; random selection must not hide part of the demo. Food appearance varies across meatball, leafy, rice-like, mashed, and curled-pasta silhouettes, while all five obey the same handling rules.

The bonus changes the rhythm: catch safe falling morsels while avoiding clearly marked spoiled ones. Side orders collected during the shift increase the safe-food quota. Spoiled catches end the bonus and bank the achieved service result; completing four boards remains a completed shift. Telegraph danger with shape, striping, and a warning cue, using a gentle pulse rather than fast flashing. The bonus is fully playable in solo and co-op and appears in attract mode.

Results show team score, service grade, deliveries, best chain, side orders, bonus catches, and whether the run was Practice. Award a small set of explicit medals, such as complete service, no lost lives, and all side orders; display their actual conditions. Store local best results by difficulty/assistance profile. Offer an immediate replay. No unavailable campaign teaser or fake unlock.

## 3. Exact game rules

### Movement, surfaces, and traversal

Use continuous chef movement over authored walkable surfaces. A surface has an ID and height; projected overlap is never enough to establish collision. Stairs and ramps are explicit connectors between surfaces, with tested entry, traversal, and exit positions. Walking toward a valid stair or ramp enters it naturally. There is no jump button.

Movement is screen-relative: up on the stick moves toward the top of the screen along the ground plane. Convert with the engine’s view transformation. Keep the camera orientation fixed during live play so players retain a stable spatial model. Normalize diagonals, apply a real deadzone, and make stopping precise. A tiny amount of acceleration is acceptable; kitchen movement must not feel slippery.

The lift has boarding, traveling, and docked states. Its floor carries attached chefs and enemies; disembarking is possible only at a connected dock. Food lanes never cross a moving lift in this slice: a lift-assisted delivery means riding to a landing, then reaching and kicking food from its fixed socket. A permanent stair route keeps every required area reachable if a player misses the lift. Lifts have predictable synchronized phases, visible destination indicators, and ample boarding time. A falling/open floor has safe, warning, open, and returning states; the warning precedes the collision change by at least 0.8 seconds on standard settings. Falling costs a life and respawns safely. Fixed platform boundaries guide chefs away from ordinary decorative edges; actual fall hazards are marked.

### Food kicking and route simulation

Use **authored food lanes and sockets with continuous-looking rolling**, rather than unrestricted rigid-body food physics. A food ball rests at a socket. A kick selects a legal outgoing route; the ball rolls across connected lane segments, down ramps, over authored drops, through routing devices, and stops at the next stop socket or delivery plate. Native rendering supplies roll, bounce, shadow, and squash animation.

Keep these rules explicit:

- Kick is a deliberate contextual action on pad/keyboard/mouse. Touch may auto-kick a valid clearly selected ball as an assistance rule. Walking near food on the other input methods does not accidentally launch it.
- Select the nearest resting ball in a generous but bounded facing sector on the same reachable surface. A visible foot ring and short route arrow identify the selected ball. Mouse hover selects the actual visible ball on its actual surface.
- Aim chooses among the socket’s legal lane directions. Pad right stick or mouse position determines the preferred direction; movement facing supplies the default. Preserve the chosen direction while briefly stationary. A route with no legal first segment produces immediate harmless feedback.
- Holding aim shows the first route leg and the next routing device’s orientation. Optional route assistance can show the entire predicted path. Calculate previews with the same route resolver used by the simulation.
- A short kick windup leads to exactly one simulation event, then a brief recovery. Initial tuning: 0.12-second windup and 0.18-second recovery. Interruptions before the hit event do not launch food.
- Each chef may own one active roll. The roll remains valid until it settles, returns, or is delivered; another kick by that chef is visibly unavailable during that period. Co-op can therefore have two moving foods. A moving ball cannot be kicked again.
- Food does not harm chefs. Rolling food squashes eligible enemies only when their surface/height overlaps its swept path. Sweep between positions so fast rolls cannot tunnel through a target.
- Every launch has a unique roll ID and per-roll hit set. An enemy can contribute to that roll’s chain once. Delivery, reward, and recovery events are idempotent.
- Food balls do not push or block one another. Give stop locations enough authored display slots to separate coincident foods; select by a stable target rule and distinct rings. Keep their lanes as readable nonphysical paths. This avoids introducing a second block-pushing puzzle.

A fixed bumper redirects the lane by ninety degrees with a springy visual reaction. A serving turntable is a rotatable elbow: the contextual action near its handle cycles the valid orientations, with a large arrow showing the exit. It accepts a ball only through an orientation-compatible inlet; a blocked inlet has a safe holding socket. A device locks briefly while a ball occupies its junction. Once the ball exits, changing the device cannot rewrite the route segment already being traveled. Reject an attempted rotation while locked with a clear click and cue.

Every ball route terminates in a stop, plate, or visible return chute. A food that takes a bad drop or reaches an out-of-play boundary visibly travels through the chute and reappears at its authored recovery socket after a short delay, without delivery credit. Add an invariant watchdog for non-finite positions, missing surfaces, and unresolvable route states; recover visibly and record a diagnostic. Validate enough stop slots and recovery destinations for all five foods. Required food can never be permanently lost.

### Enemies and pepper

Build four readable enemy families from the native rig systems. All move through the actual walkable graph, obey floor states, and use the same surface collision rules as chefs.

| Family | Behavior | Tell and counterplay |
| --- | --- | --- |
| Sausage | Direct, persistent chase with modest turn speed | Leans into turns; lead it behind a food route |
| Cherry pair | Replans toward the next junction ahead of a target | Stem points toward its intended cut-off; take a bypass or interrupt with pepper |
| Banana | Alternates ordinary pursuit with a short committed straight rush | Peel winds up and a lane cue appears; step aside, then line up the recovery |
| Root-beer captain | Slow patrol between important routes; briefly accelerates after a visible froth-up | Froth rises before the burst; stun or bait it away from the plate approach |

These are original behavior specifications, not claims about historical enemy AI. Use bounded target selection and clear committed states. Enemies must not know instantaneous unreceived client inputs, teleport between floors, or hide unavoidable attacks under foreground props. Spawn/recovery points are visible and temporarily harmless.

Pepper is a short directional cone. It consumes one charge only when accepted, stuns every eligible enemy in the cone, and leaves a visible recovering state. Initial tuning: 55-degree half-angle, about 1.5 chef-heights of reach, 2.3 seconds of stun, 0.35-second use cooldown. It affects the facing/aim direction, including on mouse. Stunned enemies cannot damage chefs. Recovered enemies telegraph their return before regaining contact damage. A squashed enemy flattens, remains harmless for about four seconds, and visibly reinflates; it is not permanently killed.

The first stage teaches scarcity without requiring pepper to be spent to progress. A zero-stock run remains solvable with movement and food. Side orders appear at fixed, visible, reachable places after delivery milestones, live long enough for a sensible detour, and give a charge plus points. At full stock, collecting still counts toward bonus quota and score. A side order is collected once even if both chefs touch it on the same tick.

### Lives, score, and co-op conflicts

Start with five **shared team lives** and five pepper charges **per chef**; cap pepper stock at nine. A harmful contact or fall consumes one shared life, puts that chef into a two-second respawn state, and grants about 1.6 seconds of visible invulnerability on return. Repeated overlap cannot spend multiple lives. Reaching zero ends the shift. There is no revive or separate downed-player system.

Preserve delivered foods and settled route/device states across an ordinary lost life. Restore the chef at a safe checkpoint with a grace radius; do not reset a chef into a gang or on an opening hole. Pause/restart is a separate explicit action.

Use one transparent scoring table in content data: suggested starting values are 500 per delivery, 250 per side order, 100/250/500/1,000/2,000 for one through five enemies in a single roll, and 100 per safe bonus catch. Chain values are total awards, so grant only the increase when a chain grows. Award each enemy’s scoring contribution once per board; already-scored enemies do not increase a later roll’s scoring-chain count. Later squashes remain useful crowd control. This keeps pursuit from becoming an endless stationary score farm. Do not award points for repeatedly kicking in a loop. Grade the completed shift with score and clear medal conditions; do not make time expire into failure.

The authority resolves simultaneous actions in a stable order: tick, accepted input sequence, then stable player ID. A food launch or device interaction has one winner; the other player receives harmless busy feedback and spends no resource. Deliveries and rolling-food squashes resolve before chef damage. Completing the board protects the team for that transition, so its final accepted delivery is not undone by same-tick contact. Clamp simultaneous life loss at zero and trigger defeat once.

Couch players share the overview, score, lives, and plate; they retain separate pepper and identifiable apron colors plus distinct shape markers. Each chef has every action. New local players join through the couch lobby or at a board transition, never by accidentally taking over the active chef. One keyboard/mouse seat plus one pad, or two pads, must work. Online uses one local seat per peer in this slice; do not promise mixed couch-plus-online seats.

## 4. Engine foundation and implementation architecture

### Verified handoffs

Planning inspected **my-3d2dge 0.89.1**, commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`, and **AI Hub Session Protocol v1 / client 1.4.0**, commit `35a1047f2067b2af3de3943f0fe452f39105d869`. Start from these audited revisions, or explicitly record and recheck any newer revision before changing the contract.

- [Engine handoff and README](https://github.com/michaelcrosato/my-3d2dge/tree/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff)
- [Full engine API](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API.md)
- [Native asset authoring](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/docs/ASSETS.md)
- [Hub protocol](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md)

Read the engine README, the full API, asset guide, closest genre kits, and integration example before writing adapters. Use the full `my-3d2dge.js`; the compact agent edition omits asset and menu functionality needed here. Adapt the arcade kit’s framing and adventure kit’s isometric examples while removing their unrelated content. Keep the native renderer, asset construction, humanoid/blob animation, input, audio, and shell as the actual foundation.

Useful verified vocabulary:

- `My3D2dge.Game`, `Shell`, `Humanoid`, `Blob`, `SHAPES`, `MATERIALS`, `addAssets`.
- Game configuration supports `view:'iso'`, `views:['iso']`, `res:'ps1'`, `expand:true`; declare only the authored view.
- World axes are **x east, y south, z up**, with 16 units per tile. `PlatformMap` slopes belong to its side-view system; do not invent an isometric ramp API on `TileMap`.
- `game.view.screenDirToGround(mx,my)` converts movement. Native input provides `move`, `pressed`, `down`, `buffered`, `consume`, `label`, `pointer`, and `clicked`.
- Use `r.actor`, `r.sprite`, or `r.queue` for depth-sorted overlapping objects. Directly drawing a foreground object outside the sort creates avoidable occlusion bugs.
- `Humanoid.hat`, `Humanoid.pose`, and the rig’s draw hooks support custom chef accessories and action poses; food enemies can extend `Blob` motion.
- `new Shell(game,{theme:{tv:true}})` supplies TV-oriented presentation. `ui.show(name,{title,text,actions,rows})` and native settings support controller-ready custom screens and live sliders.
- Settings overrides with the existing key and no replacement label preserve native handlers. Set fresh-user defaults for `music` to `0.1` and `glyphs` to `playstation`; preserve saved user preferences afterward.

`E.Arcade` offers an attract helper with `idle:10`, but its two-player game is alternating. Keep simultaneous co-op state in the game simulation. Reuse native pause/settings/rebinding behavior, extending its screens rather than creating contradictory menu systems.

### Suggested project layout

```text
index.html                    development entry
package.json                  pinned tools and build/test commands
src/main.js                   bootstrap and mode selection
src/sim/                      pure rules, world state, events, route/traversal resolver
src/content/                  four boards, rosters, dialogue, tuning, medals
src/render/                   engine adapters, camera, native assets, rigs and effects
src/input/                    semantic actions, seat assignment, touch assistance
src/ui/                       shell screens, HUD, prompts and accessibility
src/audio/                    synthesized instruments, score and event sounds
src/net/                      local, Hub and standalone transport adapters
src/tools/                    in-game developer panels and board editor
vendor/engine/                audited engine handoff, docs and tools
vendor/hub/                   pristine session client and local test harness dependencies
scripts/build.mjs             deterministic single-HTML build and artifact checks
scripts/test.mjs              quiet test orchestrator
tests/                        rule, replay, input, audio, packaging and integration tests
docs/                         research, controls, content workflow, verification and defects
artifacts/                    local reports, selected visual captures and failure traces
build/play.html               staged final artifact
```

Keep authored data and procedural assets in JavaScript modules. Bundle game modules to one IIFE with a locally pinned tool such as esbuild; inspect existing commands before adding dependencies. A modular development entry may use HTTP, but the staged artifact must open directly with `file://` without local imports, fetches, or sidecar assets.

### State and authority boundary

Create a pure `Simulation` with `step(fixedDt,commands)`, serializable snapshots, seeded randomness, and an event stream. The method names here are game-owned interfaces, not assumed engine APIs. Use a fixed simulation step, for example 1/60 second; this is a rules/replication choice, not an FPS target. Engine render interpolation and cosmetic particles never determine outcomes.

Minimum authoritative state includes:

- Run ID, schema version, seed/RNG state, tick, phase, board, score, lives, difficulty/assistance profile, Practice flag, bonus quota and outcome.
- Player IDs/seats, position, surface, traversal state, facing/aim, pepper, action state, respawn/invulnerability, owned roll, last accepted input.
- Foods with immutable IDs, type, resting socket or active route segment/progress, roll owner, per-roll hit set and delivery/recovery state.
- Enemies with family, surface, current path/target, behavior timers, stun/squash/recovery and scoring eligibility.
- Device orientations/locks, lift and floor phases, side-order availability, delivery ledger, medal counters and emitted event IDs.

Input becomes semantic commands; all accepted commands pass through this simulation in solo, co-op, bots, replay, and tests. Keep action edges separate from held movement. A renderer reads state and events; it must not spawn entities, create required interaction targets, consume resources, or advance rules during drawing. Separate simulation RNG from cosmetic randomness and retain generator instances.

The ordinary engine browser loop updates through `requestAnimationFrame`, auto-pauses on blur unless configured otherwise, and caps long frame deltas. It cannot be the only authority clock for a nonrendering Hub host. Give the pure simulation one monotonic-time scheduler, independent from rendering. Accumulate elapsed time, step in bounded batches, and reconcile against Hub synchronized elapsed time where appropriate. Tests drive the same step directly. Never advance the world both from that scheduler and from the engine update callback. Disable inappropriate local auto-pause in active network sessions; single-player blur may pause normally.

An alternative supported engine arrangement is a dedicated `Game({headless:true,loop:false,autoPause:false})` advanced through `game.advance(seconds)`. Choose one authority path and document it. Browser timers can still throttle, and Hub can cancel a hidden host; obey cancellation rather than promising perpetual background hosting.

Give the simulation driver its own explicit pause, time-scale, and single-step gate. Single-player/couch pause freezes world rules, hazards and gameplay timers; discard paused elapsed time on resume rather than catching it up. Wire offline developer controls into that gate. Native engine pause/time-scale/advance calls alone do not control an independently scheduled pure simulation. Reset both driver and presentation clocks on mode changes. Network overlays follow the continuing-world rules below.

## 5. Art, animation, and audio direction

### Native visual treatment

Use the engine’s procedural, shaded, low-resolution 3D-to-2D art and rigged characters as the base. Build a richly detailed diner diorama: cream enamel, cherry-red trim, turquoise booths, checkerboard floors, chrome edges, warm counter lights, signs, steam, dishes, stools, bottles, and a huge lower serving plate. Generic native props are appropriate for background furniture. Make the food, chef, gang, serving machines, stair structures, and delivery plate specifically for this game.

Prioritize visual hierarchy: brightest treatment for selected food and the destination; distinct chef apron/marker colors; readable enemy expressions and silhouettes; quieter, lower-contrast background service clutter. Keep walkable edges, stop sockets, dangerous gaps, and lane arrows legible. Food types must differ in silhouette and pattern as well as color. Do not cover gameplay with score text or particles.

Build native reusable asset definitions for chef toque/apron/pepper shaker, four enemy families, five food skins, turntable, bumper, recovery chute, lift, opening floor, plate and accumulating meal. Add distinct board dressing and a clear transition between rooms. Use native lights and shadows for depth, with foreground rails/walls fading or lowering when they obscure a chef. Test sort order on every crossing and raised platform. Reserve any camera pan/zoom flourish for safe transitions.

Use the handoff’s asset search, contact-sheet, and filmstrip tools to inspect sizes, all relevant facings, and action poses. Read each tool’s CLI before invoking it. Render source-specific assets through native shapes/materials and rig hooks; generated bitmap art is unnecessary for this direction.

### Animation coverage

Chef: idle/breath, directional run, step ascent/descent, kick windup/contact/recovery, pepper shake, turntable operation, ride pose, hit/fall, respawn, victory wave. Enemies: family-specific locomotion, behavioral tell, rush/burst, pepper stun, flattened state, reinflation, harmless recovery. Food: surface-correct rotation, ramp roll, ledge arc, bumper bounce, settle wobble, delivery flourish, chute return. Architecture: turntable quarter-turn, lift travel/docks, warning/open/return floors, plate filling. UI: responsive focus, restrained panel transitions, score/stock feedback and results reveal.

Drive animation from authoritative action phases and events. Key kick contact, collision enablement, and resource spend to simulation time rather than visual frame counts. Cosmetic hit-stop, screen shake and flashes must not freeze the network clock or change collision rules. Support reduced motion and reduced flash; haptics are optional enhancement and failure to vibrate must be harmless.

### Code-only sound

Use native Web Audio synthesis through `game.audio.define`, `sfx`, `music`, instruments and buses, extending with oscillator/noise/filter envelopes for gibberish voices as needed. Guard custom nodes when audio buses are unavailable. There are no imported or encoded audio recordings, sample packs, speech files, or generated audio files in the runtime.

Compose an original buoyant short-form diner score with melody, walking bass, light percussion and several variations so four boards do not feel like one repeated bar. A busier final-board arrangement and a distinct bonus cue communicate pacing. **Fresh-user music volume is 10%**; separate master, music, effects and voice controls persist after user adjustment. Voice volume is an explicit added setting: wire its handler to the actual voice gain, using the engine’s `voiceVolume` and `applyVolume()` where appropriate, rather than assuming a stock voice menu row exists.

Sound set: footstep variants, kick thump, roll rattle, ramp/ledge movement, bumper boing, squash, pepper hiss, side-order pickup, delivery chime, lift bell, floor warning, hit/respawn, bonus safe/danger, menu focus/confirm/back, service success and defeat. Use original short Animalese/Simlish-like syllable synthesis for chef reactions, enemy grumbles and celebration. Caption essential events; a sound cannot be the only warning.

Unlock audio only after a real gesture. An untouched title and its attract loop may remain silent. Offline rendering/analyser checks must establish that each patch produces finite, non-silent output with bounded peaks, that mute works, and that the music bus really defaults to 0.1. Structural checks cannot establish that the music sounds pleasant to a human; report the actual validation performed.

## 6. Controls and ten-foot UX

Use one semantic action map for menus, gameplay, bots and tests. Action priority is modal/pause, then menu, then gameplay. Consume the input that opens or closes a screen so Cross/Enter/click never also kicks or spends pepper.

| Action | Standard pad, PlayStation prompts by default | Keyboard/mouse |
| --- | --- | --- |
| Move | Left stick or D-pad | WASD or arrows |
| Aim | Right stick; facing when neutral | Mouse points at the world; movement facing when mouse is idle |
| Kick / operate selected turntable | Cross | Space or left click on selected world target |
| Pepper | Square | E or right mouse button |
| Show route preview | Hold L2 | Hold Shift |
| Pause / resume | Options | Escape |
| Menu navigate / confirm / back | Stick or D-pad / Cross / Circle | Arrows or WASD / Enter / Escape; mouse hover and click |

The contextual action chooses a visibly selected ball or nearby turntable handle; never silently rotate something behind a ball the player intended to kick. Clicking a specific object selects and acts on that object if it is in range. Clicking elsewhere sets aim without inventing click-to-move. Keyboard play works without a mouse, and rebinding uses the native settings where supported.

Default pad glyphs are PlayStation. Settings can choose Xbox A/B/X/Y glyphs. Last-used meaningful input changes prompts, including menus, tutorial, HUD and help. Ignore stick jitter and irrelevant pointer noise; require a threshold and brief hysteresis. Hover moves menu focus. Provide a clear focus graph, remembered selection, consistent Back, slider navigation and readable disabled/busy states. Handle connected pads after page load, index changes, unplug/replug, browser blur, held-button release and UI focus restoration. In standalone, a disconnected assigned pad pauses or requests reconnection; in online, neutralize that seat’s movement and keep the shared session running.

Use the same screens for pad and keyboard/mouse. Aim for generous TV text, a small number of choices per page, visible focus, safe margins, and a compact HUD: five-slot plate progress, shared lives/score, and each chef’s pepper. Show the current objective in plain language. Credits and feedback can be paginated, with accessible DOM text and controller navigation. Avoid making the title look like a project dashboard.

Touch uses the same game with assistance:

- A small menu button is always available. The movement thumb starts a dynamic invisible stick in the lower-left play area; feedback appears briefly under contact rather than occupying the idle screen.
- A contextual action bubble appears only near a selected ball or turntable and supports tap-to-kick/rotate. A deliberate tap on a visible nearby food also selects it. The right-side drag can aim independently while the left thumb moves.
- Assisted facing chooses a legal route; optional auto-kick requires a stable valid target and does not fire during menu touches. Offer context-sensitive pepper near a threat, with an optional auto-pepper assistance mode and a visible charge-spend cue.
- Track touch IDs so movement, aim and action support multitouch without double activation. Respect pointer cancellation, screen edges, safe areas and orientation changes. A menu tap cannot become a world tap.
- Phone and tablet use the same information hierarchy. Adapt camera framing and the active-area emphasis so required interactions remain readable in portrait; keep a clear off-screen plate/partner indicator if needed. Do not shrink an entire desktop HUD into illegibility.

Include difficulty/assistance settings that change tuning rather than remove mechanics. Start with Standard and a Mild preset, route-preview assistance, reduced motion/flash, and the touch assists above. Keep separate best-result categories where settings materially change play. Volume, glyph and accessibility choices persist when local storage works; memory-only behavior remains playable when it does not.

## 7. Attract-mode lifecycle

After **10 seconds of genuine inactivity on the idle title/main menu**, enter an AI-played showcase using the real simulation, rendering, camera and animation. A 75–100-second loop should show a kick, multi-enemy squash, pepper escape, turntable, bank shot, lift, warned gap, delivery, final-board spectacle, and a bonus sample. Use authored showcase checkpoints between short demonstrations if necessary; bots still issue normal semantic commands. Isolated invulnerability and resource cheats are allowed here.

Display “Demo” and a last-input-appropriate “Press any button” prompt. Any meaningful pad, key, mouse or touch activity exits immediately to the title and is consumed. Account for pointer motion and touch as well as native arcade-helper wake behavior. Raw hardware activity, not synthetic bot inputs, controls inactivity.

Do not interrupt settings editing, text entry, an online connection handshake, an occupied co-op lobby, an active run, or an active Hub session. Re-arm the title timer after a modal closes. Each loop starts from clean showcase state; it cannot write scores, consume a human save, alter persistent settings, create an online connection, or leave slow motion enabled. Attract audio obeys the browser’s unlock state and the player’s sound settings.

## 8. Multiplayer in standalone and AI Hub

### Shared game contract

Use one host-authoritative simulation for couch, standalone peers and Hub. Clients send inputs, not hits, delivered-food counts, or score claims. The host validates seat, sequence, ranges, action cooldowns and phase. Clients interpolate replicated world state, with optional local movement prediction corrected from authoritative acknowledgements. Do not predict irreversible rewards or phase transitions.

Use a versioned packet envelope containing run/round ID, packet type, sequence and tick. Send state snapshots/deltas separately from reliable action/event batches. Include device phases and full interaction state, not just positions. Keyframes permit recovery after dropped deltas. Deduplicate events and ignore stale/out-of-round data. A brief stale-input timeout releases movement if a peer disappears. Stop every scheduler, subscription, connection and audio voice when leaving a session.

Nonhost departure neutralizes input and removes that chef safely; the host can continue solo with current team resources and in-flight foods. A departing chef’s roll is allowed to finish without leaving a locked action slot. Standalone host departure ends the peer session cleanly; no host migration is required. New peers join before the shift; lost peers can reconnect only through an explicit return-to-lobby flow. Do not promise mid-board late joining or transparent reconnect that has not been built.

Network pause opens a local overlay and neutralizes the local chef while the world continues. Host-only restart requires an explicit return-to-lobby confirmation shared with the guest. Never let one peer’s pause freeze or rewrite the other’s world without agreement. Mark altered/cheat sessions Practice for both peers.

### AI Hub contract

Inline the **pristine released `session.js`** as the first script after the charset declaration, preserving its contents. Include Hub metadata for protocol 1, players `1-2`, mode `shared-world`, concise goal/how-to and a duration matching the playable shift. Derive this metadata from the finished game.

Register lifecycle handlers and call:

```js
const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 2] });
```

`null` selects standalone. In an active session, use Hub-provided IDs, names, colors, seed and authority. Skip the game’s title, attract, connection lobby, local save/load, restart and quit flows. Prepare the round, call `AIHub.ready()` once without requiring player input, and begin only when `AIHub.time() >= 0`. Keep the default Hub ready/countdown card. Never confuse negative countdown time or the pre-start `-Infinity` with active play.

Host alone runs outcomes. Crucially, `AIHub.server === true` can describe an authority copy with **no local player**; `me` may be absent from the player roster. Such a host must run without a camera, pad, draw call, local avatar, or audio gesture. The simulation boundary and independent clock above are mandatory for this case.

Use `AIHub.send(data,{to,reliable})` and `AIHub.on('message',(data,from)=>...)`. The sender supplied by Hub identifies the seat. A copy does not receive its own sends, so the host applies its own local commands directly. Keep the observed protocol limits: JSON messages at most 16,384 bytes, at most 20 sends per second per copy with burst 40; compact unreliable payloads should fit roughly 1,200 bytes. Broadcast one host state packet rather than sending separate copies to every seat.

Start with approximately 8–10 held-input updates/second and 8–10 host state updates/second, batched reliable action edges/events, and occasional reliable keyframes. Budget all message types together below the limit, especially when a host also plays. Unreliable state needs sequence IDs; reliable critical commands need deduplication. These are transport limits, not a rendering-performance budget.

Retain `AIHub.rng(label)` generator instances for authoritative randomness. Shared-world does not automatically seed `Math.random`. Handle `leave`, `time-up({graceMs})`, and `end`; on time-up the host reports the current won/lost state inside the grace period. Normal completion calls `AIHub.finish` exactly once, with all remaining player IDs tied in one standings group, per-player score entries based on the shared team score, and the correct `won` flag. Use shared-world finish, not parallel/ghost progress/result APIs.

End freezes gameplay, sends and sound while preserving the final display for Hub’s overlay. Report inability to run via `AIHub.fail`. Respect host-loss cancellation. Use roster names as text, never injected HTML. Respect the Create+Options Hub chord by ignoring game Options while Create is held. In active Hub sessions, never instantiate standalone WebRTC, a signaling connection, chat, custom-name entry, navigation dialogs or the game’s own online lobby. Developer tools remain reachable through pause for inspection; shared-state cheats/sliders are host-only and replicate, with the session clearly marked Practice.

### Real standalone co-op

The inspected Hub client does **not** provide standalone rooms. Implement a separate native-WebRTC adapter sharing the same authority and packet model. The required self-contained baseline is a polished **host invitation / guest response exchange**, without an invented matchmaking backend.

Host creates the reliable command channel and an unreliable state channel, makes an offer, and waits for ICE gathering completion before exposing the full invitation. Guest imports it, gathers a complete answer, and returns the response; host imports that response. Use versioned, validated connection data and bounded parsing. Support copy buttons, paste buttons where permitted, and an accessible editable fallback when clipboard permission is unavailable. UI presents one step and one primary action at a time, with focusable cancel/back, status and clear invalid/expired/retry feedback. Do not show an entire networking dashboard. This exchange is an out-of-play setup screen; gameplay remains controller-first. Test keyboard, mouse and pad navigation of setup, including a practical paste fallback rather than an unexplained code field.

The invitation flow is a direct-connection feature. Use a verified STUN configuration if available and keep any optional ICE-server configuration external to game rules; do not invent TURN credentials or require a new paid service. Explain connection failures in player language and offer retry or couch/solo. Local two-browser validation establishes the adapter, not arbitrary internet reachability. Restrictive NATs may require TURN; never advertise universally reachable public rooms without a tested relay/signaling service. [ICE completion](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceGatheringState), [data-channel options](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel), [STUN/TURN and connectivity](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols).

Online setup must be real and complete even if the available machine cannot prove remote-internet traversal. A second browser must actually exchange inputs, share a board, finish it, disconnect cleanly, and start another session. Local tabs that never exchange game state do not satisfy online integration.

## 9. Developer mode and content authoring

Developer mode is a fully controller-accessible pause-menu screen. Inspection is always safe; enabling cheats or changing gameplay tuning marks the run Practice. Keep cosmetic settings separate from balance changes. In a network session, only authority can alter shared state; clients get a clear read-only explanation and retain local presentation controls.

Network lifecycle restrictions override every developer/editor entrypoint. During a Hub round, disable board/checkpoint replacement, restart, stage import and return-to-lobby. Live networking keeps the authority advancing, so offline pause/single-step and time-scale changes are unavailable there; host-only safe live balance adjustments can still replicate and mark Practice. In standalone online play, board replacement, editing, restart and time-control changes go through the agreed lobby/Practice flow. Explain disabled tools in the UI rather than bypassing session ownership.

Provide board/checkpoint selection, restart, single-step while paused, slow motion, invulnerability, pepper refill, enemy freeze, collision/surface/navigation overlays, food route and predicted-path overlay, AI targets/tells, IDs/state inspection, and an explicit reset. A normal player never needs developer mode to finish.

Expose at least these live sliders, with labels and units: chef speed, enemy speed multiplier, roll speed, pepper reach, stun duration, respawn invulnerability, side-order lifetime, lift cycle length, floor-warning duration, and hazard cycle length. Store defaults and bounds in one tuning schema; validate ordering constraints such as warning shorter than a cycle. Apply changes at defined safe points: speeds and durations for new actions update immediately, in-flight lane/lift travel remains continuous, and timed-device phase maps proportionally into a changed cycle. Show applied values and give a visible preview or resume/step action while paused.

Use native `settings.define` with slider types and a Developer group, and `settings.reset('Developer')` for a genuine reset-to-defaults action. Reset the runtime values as well as the displayed controls. Native settings load/apply saved values, so explicitly reset this group before each fresh normal shift, or restore altered values only into a clearly marked Practice run. Do not let prior-session tuning silently enter an eligible run. Restore normal driver and engine time scales when leaving dev/attract, restarting or returning to title; the engine retains `timeScale` across scenes.

Supply normal designer tools rather than making later boards require code surgery:

- A documented content schema for surfaces/connectors, food lanes/sockets, turntables, bumpers, hazards, food/recovery spawns, enemy encounters, side-order milestones, dressing, dialogue and medal thresholds.
- A small usable in-game board editor under Developer: select and move a node/prop, connect or edit a route, rotate a device, adjust spawn/phase properties, validate, play from a checkpoint, and export/import stage JSON. A focused list/property panel is enough; do not build a general-purpose engine editor.
- Copy/paste JSON fallback if file download/upload APIs are unavailable. Imported content is validated before it replaces a practice stage. Exported content recreates the same board.
- `docs/content-authoring.md` describing the workflow, coordinate convention, required IDs, example changes and validation results. A fifth board using existing mechanics should be authorable from data and the tools.

The validator checks unique IDs, valid references, connected walkable areas, legal route endpoints, delivery reachability from every food/recovery socket, enough resting slots, accessible turntable handles, consistent device orientation, safe spawn/respawn positions, and solvable timed traversal. Test route states and device cycles, not just a static flood fill. Follow every board with a legitimate command-driven completion trace; connectivity alone cannot prove playable balance.

## 10. Build order and acceptance gates

Use the large context to keep all contracts and acceptance criteria available. Delegate independent native asset definitions, audio patches, content validation or test coverage if useful; keep a single owner for simulation schema and network protocol, and integrate work before diverging further. Share explicit interfaces and disjoint files. Avoid simultaneous uncoordinated edits to core engine/runtime files.

| Pass | Concrete work | Exit gate |
| --- | --- | --- |
| A: Verify and bootstrap | Research source; audit/pin handoffs; record title selection privately; create modular project, quiet test runner and inline build; set native iso view and shell | Staged HTML boots from `file://`, title works by pad/keyboard/mouse, pristine SDK is present, no local asset requests or startup errors |
| B: Prove the full architecture | Build pure state/commands, one representative raised-platform route, chef and enemy, one kick/pepper/delivery loop; bring up local and Hub server authority; establish standalone peer exchange | Same rules complete a tiny test fixture headlessly, in browser, and through two peers; nonrendering Hub authority advances; double stepping is ruled out |
| C: Finish the mechanic vocabulary | Turntables, bumpers, lifts, warned floors, recovery, enemy families, side orders, lives, score and deterministic conflict resolution | Every mechanic has an assertable scenario, safe recovery and readable native presentation; required routes remain solo-solvable |
| D: Author the actual shift | Complete all four boards, onboarding, transitions, bonus, defeat/results, medals and persistence | Normal-rules command replay finishes the whole shift; manual play sampling shows escalating choices; every feature is encountered |
| E: Complete player-facing systems | All input modes and prompts, TV shell, accessibility, pause/dev sliders, stage editor, attract loop, online lifecycle and reconnect-to-lobby path | Controller-only UI traversal, mobile emulation, attract exit, content round-trip and two complete multiplayer sessions pass |
| F: Art, animation, sound and final tuning | Finish source-specific native assets/poses, dressing, music/voices/SFX, final pacing, About/Credits and evidence | Intentional visual captures confirm readability; audio checks pass; no placeholder art/actions/text or unfinished menu routes |
| G: Package and report | Build final artifact, validate metadata/interview JSON, test the artifact at its final destination, complete reporting | Acceptance checklist below passes; every remaining environmental limitation is described accurately |

Art and audio should begin alongside the first playable loop and improve throughout; pass F is the final consistency review, not the first time the game gets presentation. Prove networking early because it determines authority, clocks, player identity and scene flow. Continue until the complete slice passes; do not cut a required feature simply because the first fixture is playable.

Performance budget is unlimited by the brief. Add the detail, lighting, enemies, animation and effects the scene needs. There is no FPS target, profiling milestone, optimization project or imposed draw-call cap in this plan. Respect the shared machine’s file/process/browser limits while doing the work.

## 11. Verification strategy

Expose one **`npm test`** entrypoint that captures detailed logs/reports under `artifacts/`, prints failures only, and ends with a one-line test count and status. Let it select impacted groups from changed source/build inputs or accept group arguments; rerun a covered group only after changing its inputs. Do not flood the terminal with per-test success logs. Track distinct discovered defects and their severity in `docs/testing-notes.md` from the start so final feedback has evidence.

Use deterministic Node/engine tests for rules, browser automation for actual interaction and packaging, and screenshots for visual questions scripts cannot settle. Native `Game` supports Node headless use, `advance(seconds)`, input taps/holds and structured snapshots; the engine’s step is 1/120 second when using `advance`. Tests using the pure simulation should use its own declared fixed step consistently. Native scene fades need to finish before assertions, or tests can set a zero fade. Check `game.errors` and browser console/page errors.

Expose a deliberate read-only debug snapshot with phase, ticks, board, actors/surfaces, food/routes, stocks, devices, score and outcome. Developer mutation hooks remain separate. Test hooks must not silently complete the game or alter normal rules in the main playthrough.

### Required automated groups

| Group | Evidence to collect |
| --- | --- |
| Rules and geometry | Aim/selection, valid/invalid kick, one roll per chef, device lock, route preview agreement, height separation, swept squash, once-only rewards, stun safety, life loss/invulnerability, floor timing, lift entry/ride/exit and chute recovery |
| Content | All four board validators; safe spawns; reachability through device orientations and phases; no lost food; each mechanic guaranteed by encounter data; editor import/export round-trip and invalid-data rejection |
| Normal full playthrough | Seeded semantic-input bot completes all four boards and bonus on ordinary lives/pepper/collision rules; asserts deliveries, transitions and final score/outcome; records at least one use/encounter of each mechanic |
| Loss and restart | Legitimate zero-life defeat, retry fresh state, practice restart with score rollback/flag, board-transition final-food/contact ordering, zero pepper and full-stock pickup, repeated title/run cycles without leaked state |
| Input and shell | Standard-mapping gamepad stub; every menu/dev action by pad; keyboard-only completion of core play; mouse hover/aim/world click; PS/Xbox glyphs; meaningful last-input switching; disconnect/reconnect; no action leakage through pause |
| Touch | Phone/tablet emulation, portrait/landscape, multitouch movement plus action, safe areas, menu isolation, pointer cancel and route/pepper assistance |
| Attract | Before ten seconds remains menu; at ten enters; required demonstrations occur; each physical-input family exits and is consumed; repeated loops preserve settings/scores; excluded screens never auto-enter |
| Audio | No-gesture startup, unlock, finite/non-silent synthesized patches, bounded peaks, default music gain, independent volume/mute, voice generation, end-session silence and no runtime audio-file fetches |
| Packaging | Final HTML parses and starts under `file://`; no unresolved module/import/source paths, local fetches or missing assets; title/credits metadata agree; embedded SDK integrity; fresh and unavailable storage; clean console |
| Multiplayer | Two actual peers complete cooperative play; duplicate/out-of-order/stale commands; simultaneous kick/pickup; snapshot recovery; nonhost leave; host loss; pause behavior; session teardown and a second session |

The main completion bot navigates actual surfaces, faces/aims, kicks, uses pepper, rotates devices, rides the lift and waits for hazards. It must not teleport, set delivery counts, force phase transitions, inject health, or disable enemies. Separate scenario tests can use controlled fixtures and developer hooks to reach edge cases quickly. Keep a movement/action replay as evidence, and run an additional different-seed playthrough when gameplay changes make encounter/randomness coverage uncertain.

### Browser and Hub integration

Use the already downloaded Playwright **1.63.0** browsers; pin the local Node package to that version if using Node. Do not run browser or host-dependency installers. Chromium is the primary automated play target; WebKit supplies a second real engine for artifact boot and input/audio checks. Firefox’s unavailable WebGL must not be confused with evidence for another renderer. Use engine Canvas rendering as the native baseline rather than depending on WebGPU. Browser/device emulation is the stated stand-in for physical pads, touch hardware and iOS.

Prefer `file://` for the final artifact and native headless tools for rules. When serving the development modules or Hub harness, create a loopback server on port **0**, read the selected address, and verify a unique game/build marker on the loaded page before trusting assertions. Capture and stop only the server/browser processes started by this project. Keep one or two browsers open at once; run the Hub harness’s internal frames inside that allowance. Store all files, reports and caches inside this development folder rather than shared temporary or neighboring directories.

Vendor the official Hub harness with its companion files. Run it from the same origin as the artifact. Required cases include two players with `latency=150&jitter=50&loss=5&auto=1`, host-leave, server authority with no local player, forced time-up, nonhost leave and clean end. Read `window.__hubCheck.pass` only after `document.body.dataset.complete === 'true'`. Wrap its verbose tooling in the quiet project command. Add game-specific assertions: a delivery performed by the guest reaches the host and both clients; no duplicate reward; every client reaches the same board/outcome; host ticks continue with rendering disabled; no independent standalone networking exists in Hub mode; no sends or sound survive end. Respect packet size/rate limits and fail on protocol warnings.

Two separate browser contexts must also exercise the actual standalone offer/answer adapter, a complete cooperative board, interruption, teardown and a second session. Simulated loss tests for packet handling can be separate from the real transport test. Report local peer success separately from unverified remote-internet reachability.

Use selected screenshots/contact sheets for 1920×1080 TV hierarchy, first-room composition, overlapping heights, readable enemy tells, final-board spectacle, co-op identification, portrait touch framing, focus visibility, pause/dev pages and credits. Inspect these images and fix what they reveal. A screenshot is not evidence of working collision or a successful playthrough; state assertions are. Do not repeatedly capture identical screens when no visual input changed.

## 12. Packaging, metadata, feedback and completion

The staged `build/play.html` contains the complete runtime: pristine Hub session client, full native engine, game code, styles, procedural assets, synthesized music and voices, content and credits. There should be no dependency on development files or a running local server for standalone play. External dependencies are allowed by the brief, but this dependency-free engine and procedural direction make a self-contained build the preferred result.

Inline game/engine code safely: **escape literal closing-script sequences inside JavaScript payloads**, including those in comments, before embedding. Keep the pristine Hub client outside transforms; verify its contents remain exactly the released source and confirm its own text is safe to embed. Do not use an unsafe global replacement that modifies the SDK. Preserve upstream notices and record versions. Build checks compare content hashes where appropriate and scan for unresolved development paths, accidental placeholders and audio assets.

Publish/copy the tested artifact and the builder’s required completion JSON to the exact destinations in that builder’s brief. Keep the development tree intact. Open the final named artifact again; do not assume renaming or copying cannot change a path-dependent bug. Follow the brief’s exact structured interview schema and catalogue enumerations rather than inventing an alternative.

Provide all four required reporting sections both in the game’s About/Credits and in the final builder chat: **Source Information, Testing Feedback, Engine Feedback, Prompt Feedback**. Page the in-game text for TV readability. A shared metadata/feedback data object should populate credits and exported reporting so they agree. If final artifact checks change the actual findings, refresh those values and validate affected packaging again.

Source Information must cover the builder’s run date, source, actual supplied plan filename, genre, perspective, stack/versions, native art and animation approach, synthesized audio, actual online features, testing parameters, research references, environment, model/effort, and usage. Take run-specific facts from the builder’s own brief; write **`unknown`** where unconfirmed. Usage is exactly **`added on import`**; do not estimate cost/tokens/time. Record this plan’s actual filename when used.

Answer every Testing Feedback, Engine Feedback and Prompt Feedback question from the builder brief in its original order. Testing counts distinguish unique discovered issues and game-breaking issues, not individual failed assertions. Explain the most/least useful actual tests. Engine feedback names what was reused, added or changed and why; do not fabricate engine changes. Prompt feedback is the builder’s own assessment. The planner’s separate interview is not a substitute for these game-completion answers.

Parse the completion JSON and validate required keys, all populated values, catalogue type/genre/players/tags and source-information fields. Catalogue title equals the selected title on the title screen, controls match the shipped map, players is 1–2, and online description accurately separates Hub, couch and direct standalone support. Report test stand-ins and any unconfirmed environmental capability plainly, without treating missing physical hardware/listeners as unfinished implementation.

### Final acceptance checklist

- A new player can start from the exported HTML, understand the plate objective, and play the entire shift to either a legitimate defeat or a finished victory.
- All four authored boards, five foods per board, four enemy behaviors, directional pepper, side orders, routing devices, lift, warned floor, recovery, bonus, medals and replay are complete.
- The game actually uses the handoff engine’s native rendering, asset and animation systems with source-specific additions.
- Pad-first TV play, keyboard/mouse, prompt switching, Xbox preference, touch assistance, settings and all menu paths work.
- Ten-second attract mode showcases the full vocabulary, exits cleanly and leaves player data untouched.
- Developer mode has useful tools, working live sliders/reset and a validated content-authoring workflow; cheats mark Practice.
- Solo, couch, actual standalone peer play and Hub shared-world are implemented, including nonrendering authority and session cleanup.
- The quiet verification command covers normal whole-game play and consequential edge cases; selected visuals and synthesized audio have been inspected by available methods.
- Fresh-user music is 10%, all audio is code-generated, and no audio files are required.
- The final single HTML works at the brief’s destination, reporting matches the artifact, the required JSON parses, and no TODOs, placeholders, fake controls or stubbed features remain.
