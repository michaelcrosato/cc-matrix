# Director’s plan

## 1. Build mandate and ownership

Build an original, complete arcade maze-chase game inspired by **K.C. Munchkin (1981)**. Its defining experience is hunting food that runs away while three hungry creatures hunt you. The last few morsels should turn a busy collection round into an enjoyable problem of interception, shortcuts and nerve.

This plan targets **gpt-6.1-sol ultracode with a 1.05M context window**. Use that capacity to understand the actual engine and multiplayer contracts, maintain a consistent implementation across systems, author substantial playable content, and review the finished artifact against the entire brief. Deliver the complete integrated slice described here. A big context window is a reason to preserve design coherence and evidence, not to accumulate unrelated features or postpone playing the game until everything is written.

The builder owns the title. Silently brainstorm fifty playful riffs on the source’s name, choose one with a real random number generator, and apply it consistently. This plan deliberately supplies no candidate or working title.

Your own CEO brief controls exact development-folder names, output names, metadata, and final file locations. Do not copy identifiers from another run. **Every project path below is relative to your development folder.** References to final deliverables describe their role rather than prescribe their names. Use the brief’s exact required names and locations when emitting them.

The brief takes precedence over generic engine advice. In particular, Hub integration is required, the title idle delay is ten seconds, music defaults to 10%, and optimization/FPS targets are outside this assignment. Do not ask for routine implementation decisions. Resolve them, record consequential choices, and continue.

## 2. Research foundation

Research the original before implementation, including a direct look and listen where accessible. Keep a short evidence ledger in `docs/research.md`: source URL, what it confirms, what is interpretation, and what remains unknown. Verify the upstream engine and Hub revisions you actually use; the revisions below are researched starting points rather than promises about future `main` branches.

### Confirmed source identity

The [original rules booklet](https://odyssey2.info/library/manuals/us_kcmunchkin/K.C.%20Munchkin%20(USA).pdf) documents a controllable Munchkin, three Munchers, twelve moving Munchies, four-direction travel, wrapping edges, a rotating central enclosure, temporary enemy edibility, increasing difficulty, several fixed mazes, random and invisible variants, and editable maze walls. Its original scoring is small and legible: ordinary food 1, flashing food 3, enemies 5/10/20 under its chain conditions. Its editor requires connected paths and retains the center enclosure.

A [contemporary first-hand description of the original audiovisual display](https://law.justia.com/cases/federal/appellate-courts/F2/672/607/331150/) describes eight ordinary and four powered moving collectibles. Survivors accelerate as food disappears; the last matches the player’s speed. It describes quarter-turn changes to the central opening, purple maze lines on black, an expressive blue-green protagonist with horns or antennae, enemy eyes indicating travel, warning before power expires, electronic gobbling and a celebratory chuckle. Use that account for observations about the game, without importing its legal discussion into the product.

The manual says invisible walls disappear during movement and reappear briefly on collision. Its description of eaten enemies racing home differs from the contemporary observer’s account of remnants wandering until finding the center. Define an understandable return-to-center behavior for this adaptation; do not present an uncertain detail as exact historical emulation.

An [original-system gameplay recording](https://www.youtube.com/watch?v=EznzG5HpmuM) and an [archived commercial](https://www.odyssey2.info/media/videos/video.php?id=8) are additional leads for the builder’s audiovisual inspection. Their playback has not been audited for this plan. Do not claim exact pitches, musical composition, timing or animation from them without checking.

### Translation into this game

| Source quality | Direction for the new game |
| --- | --- |
| Food moves and the last target becomes hard to catch | All twelve targets are living agents; acceleration and interception drive every round. |
| Player is hunter and prey at once | Three readable enemy personalities complicate routes; power food creates short reversals of fortune. |
| Central rotating access and wrapping paths | A visibly telegraphed rotating pen and paired tunnels create useful shortcuts and timed decisions. |
| Invisible and generated maze variants | Teach a fair disappearing-wall variant and provide seeded generated layouts. |
| User-created mazes | Include a small, finished, controller-usable maze workshop with validation and playtesting. |
| Grinning, comic creatures and electronic chatter | Expressive native-engine creature rigs, short alliterative copy, procedural gobbles and gibberish reactions. |

Simultaneous co-op, distinct enemy personalities, the optional reveal action, campaign structure and modern accessibility are **new adaptations**. Keep those claims separate from source history. Create original layouts, creature designs, animations and music; the source supplies a design vocabulary rather than a tracing template.

## 3. The game the player receives

Use an **arcade action / maze-chase** genre with a **fixed overhead camera**. The entire playable board stays visible. The engine’s native shaded, pixel-conscious objects and expressive blob rigs provide the base style. The board should feel like a mischievous little electronic toy theatre: dark plum floor, luminous violet walls, chewy bright food, cool-coloured heroes, and predators with clearly different silhouettes.

The complete slice contains:

- A six-stage campaign, approximately 12–18 minutes on a successful first run, with a real opening, escalation, finale and victory screen.
- Solo play and simultaneous two-player co-op under the same rules. Standalone supports couch co-op; AI Hub supports the same co-op across devices.
- A seeded remix mode using a validated generated maze and the complete rule set.
- A compact maze workshop: edit, validate, save, reload, export/import, and play a custom board.
- Title, attract demonstration, help, pause, settings, developer tools, results, replay/retry flow, and complete About/Credits with all required feedback.

Do not add combat trees, inventories, crafting, a separate versus game, procedural story, or an unrelated boss. The finale tests the maze mechanics already taught. Richness comes from the moving food, readable enemy decisions, authored spaces, responsive animation and complete supporting systems.

### The first minute

The player sees an attractive complete board behind a spacious title screen. Starting solo takes one selection. A brief, dismissible card says, in the game’s playful voice, that the snacks run away and bright snacks turn the tables. Movement begins in a safe pocket with an obvious nearby target. The first few intersections teach early turn buffering; the next route makes a shortcut more effective than tailing a morsel. Threat ramps within the same board rather than withholding the real game behind a long tutorial.

Give one contextual hint at a time. Once movement, power food and the remaining-food count have been demonstrated, stop explaining and let the board perform.

## 4. Authoritative rules and game feel

Write a short rules specification in `docs/rules.md` before feature expansion. The implementation, bots, content validators, editor and tests must use the same rules.

### Movement and topology

Use a cardinal grid with continuous motion between cell centres. Start near six cells per second and tune by playing. Keep input and grid coordinates separate from rendered world units. Buffer turns approximately 150 ms before a junction, allow immediate reversal along an open edge, and keep held directions moving without repeated button presses. Resolve diagonal stick intent with a stable dominant-axis rule and hysteresis so a resting stick near 45 degrees does not chatter.

All route planning, collision, tunnel wrapping, gate states and editor validation share one authoritative board graph. Represent tunnels as explicit graph edges with matching rendering and collision transforms. Never infer walkability from the pixels or decorative asset collision.

Use fixed simulation steps. Collect motion segments during each tick and resolve swept encounters, including two actors swapping endpoints and entities crossing a tunnel seam. A fast player must not pass through a target or enemy between sampled cell centres. Specify stable event ordering: control/state changes, movement, food collection and power activation, enemy contact, then clear/failure decisions. A powered pickup at the same instant as a predator encounter should favour the readable power reversal. Resolve exact simultaneous contacts deterministically.

### Twelve living targets

Each normal board begins with twelve uniquely identified moving food agents: eight ordinary and four powered. Food has a clear little face, travel direction, bob and footfall; it is unmistakably collectible rather than another danger.

Give food committed route choices with brief anticipation. Avoid a policy that instantly chooses the opposite route whenever the player approaches. Ordinary food initially travels around 55–65% of player speed; a monotonic survivor curve increases speed as targets disappear. The final target should approach the player’s nominal speed. Make interception viable through route commitment, cross-links, the rotating shortcut and tunnels. If the final-target experience produces tedious equal-speed circling, fix the topology and target policy before adding a speed cheat or a new ability.

Keep the last three targets increasingly conspicuous with restrained trails, a clear remaining count and a change in musical phrasing. Telegraph turns rather than let the food reverse unpredictably. The final catch is the round’s small climax. Test it on every authored board and many generated seeds with the ordinary movement rules.

Food cannot spawn inside a wall, predator, closed pen, or another food agent. It can pass through other food while travelling; overlaps must not erase identities or cause duplicate scoring. The generator and editor must preserve safe, useful starting distances.

### Three predators

Begin with exactly three active predators, each original in appearance and behavior:

| Role | Route decision | Visible tell |
| --- | --- | --- |
| Follower | Applies pressure toward the nearest viable player route, with a short decision delay. | Forward lean, narrow eyes and a steady pulse. |
| Interceptor | Aims a few junctions ahead of a player’s committed direction. | Looks toward the intended branch before turning. |
| Keeper | Circulates strategically around the center and useful escape routes, then commits to nearby prey. | Broad body, patient footwork and a clear wind-up. |

These are the adaptation’s roles, not claims about the original enemy AI. Avoid omniscience: make decisions at junctions, include bounded reaction times, and do not spawn unavoidable traps. The three should be distinguishable in greyscale as well as colour.

Use explicit states: penned/releasing, hunting, frightened, recovery warning, harmless returning, and recharging. Bright food makes all hunting predators edible and slower. Harmless returners follow the graph back to the pen and must not kill, block a corridor, or count toward an active chain again. When a closed gate obstructs return, wait visibly or use a separately specified harmless return route; never stall progression.

Start power duration around six seconds with a final 1.5-second visual/audio warning. Further powered food refreshes a bounded timer; it must not create an unbounded permanent-power exploit. Choose and document one chain reset rule. Preserve the satisfaction of 5/10/20 catches, but make its current state understandable on screen. All warning meaning needs a non-colour cue.

### Gates, tunnels and disappearing walls

The pen visibly rotates one quarter turn on a roughly 2–3 second cadence. It has one opening: a player enters, rides out a safe rotation, then exits on another side. Design the outer detour so this timed chamber can actually save travel; measure that rather than depict an impossible straight-through shortcut. Warn before the change with movement, a light sweep and a sound. The graph changes atomically with the authoritative gate state. Defer closure over an occupied crossing or resolve occupancy using a documented safe rule; never crush an actor or teleport it into a wall. Every allowed gate orientation must preserve required reachability. Show its cadence clearly enough that the player can plan a shortcut.

Tunnels have paired mouths, consistent destination orientation and a short visual trail. Food, players and predators obey the same topology. Collision across a wrap seam follows the same encounter rules as a corridor. Do not put a hidden enemy directly at a blind tunnel exit without a visible tell or safe spacing.

For disappearing-wall stages, show the whole maze before the round and during periodic readable reveals. While moving, wall bodies fade, with collisions providing a short local echo. Preserve enough landmarks to navigate. Add a **reveal chirp** on the primary action: a short, non-damaging wall reveal on a cooldown of roughly four seconds. It neither stuns predators nor changes their routing. Use generous automatic reveals and optional auto-chirp assistance on touch. The chirp is the only extra gameplay action; do not add a dash to repair poor interception design.

### Lives, scoring and completion

Use small arcade scores: ordinary food 1, powered food 3, edible predators 5/10/20. Show a shared team score in co-op. Attribute contributions in statistics without making cooperation a competition. Report the same team score for each Hub participant; do not sum those copies into a doubled team total.

Begin the campaign with five team lives. On a valid hit, lose one, play a brief readable reaction, and respawn only the affected player in a safe pocket with approximately 1.5 seconds of invulnerability. Keep collected food and the board state. Add a short team damage grace period to prevent a simultaneous overlap from consuming several lives before the feedback can be read. Two heroes can pass through each other and never body-block an escape. A stage clear can restore one life up to the starting cap; expose the values for tuning.

Clearing the twelve targets wins the board without a separate exit chore. Zero lives ends the run. Define simultaneous final-food/death resolution explicitly and test it. A failed run offers a clean retry; a completed campaign shows the ending, score, useful statistics and immediate replay/remix choices. Save settings, best scores, campaign unlocks and workshop boards with a versioned schema. Handle unavailable or corrupt storage gracefully. No online account or name entry is needed.

## 5. Content and pacing

Use five authored boards and one generated board in the campaign. Vary routes, relationships and timing; changing wall tint alone does not constitute a new stage. Stage names below describe functions, not final display copy.

| Stage | Design purpose | Required moment |
| --- | --- | --- |
| 1 — Open loops | Establish moving food, safe buffered turns, the power reversal and all three predator tells. | Catch a target by cutting across its route; experience a power warning safely. |
| 2 — Side doors | Make paired wrapping tunnels and long/short routes matter. | Use a visible tunnel to meet fleeing food rather than follow it. |
| 3 — Turning center | Introduce the pen’s changing access and useful centre shortcut. | Read the warning and choose whether to cross now or take the outer loop. |
| 4 — Vanishing lanes | Teach disappearing walls, collision echoes and reveal chirp. | Read a reveal, commit to a route, then deliberately reveal again. |
| 5 — Seeded remix | Demonstrate validated generation, displayed seed and a different but fair route puzzle. | Apply the known rules without relying on a memorised layout. |
| 6 — Finale | Combine tunnels, gate timing, disappearing sections and all predator roles on a strong authored board. | A satisfying last-target interception, followed by a proper victory celebration. |

Aim for a successful learned run around 10–12 minutes, roughly two minutes per board with the finale allowed more room. A first standalone run may take 12–18 minutes and has no countdown failure rule. These are pacing hypotheses, not performance targets. Measure real unassisted bot play and manual input traces; tune food speed and routes if a stage stalls or clears before its feature is visible. Hub rounds use the protocol's explicit time limit described below; do not promise an eighteen-minute online session.

Do not make the first stage a stripped demo of a different game. Later stages intensify the same rules. Introduce at most one major concept per stage. Enemy release spacing, initial target routes, safe pockets and reveal timing are authored data, not hard-coded stage-number branches.

Each stage definition contains its map, spawn points, food identities/routes or routing policy, tunnel pairs, gate specification, reveal rules, predator parameters, introduction hint and clear cue. Use schema validation and stable IDs. Keep a mechanic-to-stage coverage table in `docs/coverage.md`; each promised mechanic needs a playable location and a test.

Remix exposes a seed and a few large, understandable options. Reusing a seed reproduces the gameplay layout and initial state. If generation fails validation after bounded retries, use a validated fallback and report that honestly in developer diagnostics. Never serve a disconnected maze and hope the player will not notice.

## 6. Visual direction and animation

Begin with the engine’s native overhead style, materials, palette shading and pixel-aware draw helpers. Keep low wall profiles so every actor and intersection can be read. Give the board a handsome cabinet-like surround, restrained circuit patterns and dimensional pen machinery. Decorative detail, lights, shadows and celebration effects may be rich; their placement must preserve route and threat readability. The assignment has no FPS or optimisation target.

Create original character assets rather than leave the kit’s generic heroes and wisps in place. Base the heroes on the native Blob rig, with a strong rounded body, antennae, a cheerful idle face and a conspicuous mouth. Give co-op players distinct silhouettes or head details, colour accents and numbered rings. Do not rely on colour alone. Food looks smaller and edible; predators have teeth, legs/appendages and purposeful eye direction.

Author and connect these animation states:

- Hero idle grin, anticipation, directional travel, turn, eating bite, reveal chirp, alarm, hit, respawn and victory laugh.
- Food idle/walk, turn anticipation, fleeing acceleration, powered shimmer, final-target excitement and collection pop.
- Predator release, each personality’s travel, frightened retreat, recovery warning, eaten collapse, harmless return and recharge.
- Gate wind-up, quarter-turn, settling, tunnel transit, wall disappearance/reveal, stage opening and closing celebration.

Animation follows authoritative velocity, timers and events. Replaying a snapshot must not repeatedly play the same bite or death cue. Keep cosmetic randomness separate from gameplay randomness. Respect reduced-motion settings: reduce camera shake, aggressive bob and large flashing effects while preserving information. The camera stays fixed during normal play; any celebration movement must settle before control resumes.

Use screenshots and motion strips to judge silhouette, occlusion, clipping, hierarchy and animation. A passing state test cannot tell you whether the final target is visually lost behind a light bloom.

## 7. Controller-first screens and input

Design the same screens for television, mouse/keyboard and touch. Use the engine’s TV shell and menu system rather than building a dense web dashboard. At 1920×1080, start around 28–36 px for ordinary menu text with larger headings, then inspect actual readability. Keep important content within a generous safe area. Menus have a short primary list; settings and credits are paginated by subject.

| Intent | Standard gamepad | Keyboard / mouse | Touch |
| --- | --- | --- | --- |
| Steer | Left stick or D-pad | WASD or arrows | Invisible swipe/drag steering, with cardinal intent and buffered turns. |
| Confirm / reveal chirp | South face button | Enter/Space in menus; Space for chirp | Tap menu item; a small contextual chirp action only when useful. |
| Back | East face button | Escape | Visible back control in menus. |
| Pause / settings | Options, respecting the Hub chord | Escape during play | One persistent menu button. |
| Workshop edit | Focused-cell action, with a small tool palette | Click cells, drag walls, ordinary undo/redo keys | Tap/drag cells and a compact contextual palette. |

Keep menu confirm and gameplay action separate at scene boundaries: the press that starts a run must not also chirp or edit a cell. Mouse hover moves focus; clicks operate real items. This genre needs no aiming or pointer lock. If world clicking is supported, limit it to a clearly explained steering assist rather than silently changing the game into click-to-autoplay.

Prompts follow the last meaningful input device and respect rebindings. Default to PlayStation glyphs; Settings can select Xbox A/B/X/Y glyphs. Ignore incidental pointer jitter when determining the active device. Poll standard-mapped pads, handle connect/disconnect, and give each local co-op seat an explicit device assignment. Support two pads or pad plus keyboard; do not make two players share conflicting default keys.

On touch, preserve the board. Use invisible steering, multitouch-safe pointer tracking, generous buffered turns and assisted reveal timing. Offer a simple sensitivity/assist setting. A held movement contact must survive a second finger tapping the menu/chirp control and must clear correctly on pointer cancellation or lost focus.

Standalone pause freezes simulation and synchronized music. Controller loss or a hidden tab pauses a solo/couch game safely. In a Hub session, settings are a local overlay and **cannot freeze the shared world**; neutralise the local held input and show that play continues. The Hub’s Create+Options chord takes precedence. Never use a browser alert, prompt, new window or navigation as game UI.

## 8. Engine foundation and implementation boundaries

Research baseline: **my-3D2dge v0.89.1**, commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`.

Read the [handoff README](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/README.md), [API card](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API.md), [arcade kit](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/kits/arcade.js), [asset instructions](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/docs/ASSETS.md) and relevant module source before extending their systems. Pin the actual revision locally and record local engine changes.

Start from the arcade kit’s maze slice, as the handoff requests. Keep useful board drawing, buffered grid motion, wrapped-route examples and arcade scaffolding. Replace its static food, four wisps and borrowed scatter/chase behavior. Remove unrelated kit games, kit selection UI, stock hero art and demo branding. Do not spend the project building a second rendering engine.

Use the full `my-3d2dge.js` distribution so the actual material and object renderers are present. It already includes the modules; loading grid or arcade modules again risks duplicate definitions. Use the documented `overhead` view for the fixed board. Engine axes are x east, y south, z up; a normal tile is 16 world units.

### Verified integration points

| System | Starting API and practical implication |
| --- | --- |
| Navigation | `new E.Grid(w, h, { walkable, diagonal: false })`; `grid.path(start, end, options)` includes endpoints. Extend the board abstraction for explicit tunnel/gate edges where necessary. |
| Grid movement | `new E.GridMover({ cx, cy, speed })`, `update(dt, grid, direction, { keep: true })`, `place(cx, cy)`. Speed is cells/second; smooth `x/y` are cell coordinates, rendered at `(value + 0.5) * tile`. |
| Movement gaps | The inspected GridMover retains a desired turn indefinitely and does not reverse mid-edge. Add a narrow, tested extension or wrapper for explicit buffer expiry and reversal that preserves position and progress. Do not assume the kit already supplies the desired feel. |
| Native characters | `E.Blob`, `rig.update(dt, state)`, `rig.kick(v)`, `rig.draw(...)`; use native squash, look, squint and walk controls as the base, then add mouth/antenna details. |
| Rendering | Draw actors through `r.actor(...)` for correct sorting. Use `E.px`, `E.tones`, native shapes/materials and the asset authoring tools. Static shapes do not automatically animate. |
| Screens | Extend `E.Game` menus/settings, `E.Menu` and the TV-scaled `E.Shell`; retain native focus, hover, rebinding and device prompts. |
| Arcade shell | `E.Arcade` can help with solo score flow and idle demonstration. Set `idle: 10` explicitly; its default is twenty seconds. Its built-in two-player option is alternating turns, so do not use that as simultaneous co-op. |
| Headless inspection | `new E.Game({ headless: true, draw: true })`, `game.advance(seconds)`, input `tap`/`hold`, and `game.debug.snapshot()` support deterministic state tests. The engine advances at 1/120-second steps. |

Inspect actual signatures as you implement rather than copying illustrative snippets blindly. Gate and tunnel support must agree across pathfinding and motion even if that requires a focused engine extension. Keep unrelated engine behavior intact unless a verified requirement justifies a change.

### Suggested project structure

The exact module boundaries may evolve, but keep these responsibilities distinct:

```text
vendor/                 pinned engine and unmodified Hub client
src/main.*              boot and standalone/session routing
src/sim/                rules, board graph, movement, encounters, RNG
src/content/            schemas, authored stages, generator and validation
src/view/               board rendering, rigs, effects and HUD
src/input/              intents and device/seat adapters
src/ui/                 screens, settings, credits and developer tools
src/audio/              instruments, score, procedural voices and routing
src/net/                Hub lifecycle, host authority and snapshots
src/workshop/           editing, undo/redo, persistence and playtest
tests/                  simulation, integration and browser scenarios
tools/                  build, test wrapper and scoped Hub harness
docs/                   rules, evidence, coverage and final feedback
build/                  generated intermediate artifacts
```

Implement one simulation callable without rendering, DOM, sound or a local player. Inputs are seat-keyed intents; outputs are snapshots and uniquely identified events. Presentation consumes state. This supports deterministic tests, attract agents, local co-op and a dedicated Hub host without four separate rules implementations.

Use a fixed-step clock, stable entity IDs, explicit stage/run phases and a seeded gameplay RNG. Snapshot at least stage revision/seed, tick, food-alive mask and positions, actors, gate state, power timers, team lives/score and run phase. Do not serialize meshes, UI strings or generated audio nodes. Keep render interpolation and audio event deduplication outside the authoritative simulation.

Transitions must reset temporary speed changes, input latches, timers, effects and audio deliberately. Engine scene changes clear ordinary timers and particles, but kept timers and `timeScale` may survive. Test retry, attract exit and stage change for leaked invulnerability, altered speed and duplicate event subscriptions.

## 9. Procedural audio direction

Everything audible is generated in code. No music, voice or sound-effect files, including embedded audio blobs. Use engine synthesis and original note/event data. Connect custom synthesis through the engine’s music, SFX and voice buses so settings and mute work consistently.

Write a playful electronic score with a simple recognisable motif, a lighter exploration layer and a restrained last-target variation. Store the user-facing music default as **0.10** and preserve later user choices. SFX and gibberish voice levels are separate controls. Do not multiply two “10%” settings into an accidental 1% default.

Give important events distinct sounds: ordinary bite, powered bite, enemy fright, recovery warning, enemy catch chain, gate warning/turn, tunnel hop, reveal chirp, damage, respawn, stage clear and victory. Use short Animalese/Simlish-style phoneme sequences for the hero’s grin, alarm and celebration. These are original procedural vocalisations, not intelligible lines or imported samples. Avoid a voice burst on every tiny event.

Unlock Web Audio on a real user gesture. A pre-interaction attract demo must still run correctly in silence. Session readiness and simulation start cannot depend on audio permission. Use time-synchronised music where appropriate and silence all buses on a Hub end. Validate generated audio with OfflineAudioContext or an analyser: non-silent expected events, finite samples, bounded peaks, correct routing and actual default music gain. Report listening quality as unknown if no one could listen; a waveform is evidence about signal behavior, not a human aesthetic review.

## 10. Multiplayer and AI Hub

Research baseline: Hub Protocol v1, session client **1.4.0**, commit `35a1047f2067b2af3de3943f0fe452f39105d869`. Read the pinned [protocol](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md), [client](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/session.js), [shared-world example](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/examples/arena.html) and [official checker](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/scripts/hub-check.mjs). Refresh the contract if selecting a newer revision.

### Explicit scope

Outside Hub, the single HTML offers solo and two-player couch co-op. Inside Hub, it offers one- or two-seat shared-world play, one seat per participating device. The supplied session client is not an independent internet matchmaking/signalling service. Do not present a standalone internet-room button that has no transport behind it. This scope provides multiplayer both standalone and through Hub without an unrelated backend.

Co-op shares food, score, lives and progression. Either player can take any target; power reversals help both. No mechanic requires both players to stand on switches or remain connected. Players cannot harm or block each other. All campaign rules, special stages and stage transitions work with one remaining player.

The Hub session plays the same six-stage campaign as one timed round. The pinned [round implementation](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/round.js) allows 1.5 times the declared duration, capped at **15 minutes**, and defaults to that cap without a duration declaration. Use an honest measured duration estimate, initially around twelve minutes, and tune normal successful runs to fit with margin. On time-up, report partial team score and completed-stage/remaining-food statistics with `won: false` unless the campaign was actually completed. Do not skip stages, force a win or speed up the simulation to manufacture completion. Standalone retains untimed campaign play.

### Required lifecycle

1. Inline `session.js` byte-for-byte, including its banner, as the **first script immediately after the charset meta**. Do not minify, wrap, edit or let a bundler merge it into game code. Declare `hub:session` as `1`, `hub:session-players` as `1-2`, `hub:session-mode` as `shared-world`, plus `hub:session-goal` and `hub:session-howto`. If declaring measured duration, use `hub:session-minutes`.
2. Register lifecycle/message handlers early and call `await AIHub.connect({ mode: 'shared-world', seats: [1, 2] })`. A null result selects normal standalone boot.
3. In an active session, bypass title, attract, player-count selection and “press start.” Prepare the world and call `AIHub.ready()` once automatically. Prefer Hub’s standard pre-round card instead of implementing a custom card protocol.
4. On `start`, show the shared countdown. Do not simulate gameplay until `AIHub.time() >= 0`; before start it is negative infinity. Keep input neutral until the round is live.
5. Only `AIHub.isHost` advances authoritative world state, validates encounters and decides results. Dedicated-server mode has `AIHub.server === true`; the host’s `me` is absent from players. A host must function without a local hero, camera, input or rendered scene.
6. Handle `leave` by removing that seat safely and continuing with remaining players. Neutralise stale input. No host migration is required; host leave/extended hiding is handled by Hub as a voided round.
7. On campaign completion, run failure or `time-up({ graceMs })`, finish exactly once and within the grace interval. An intermediate board clear advances to the next stage and must not call `finish`. Use the documented `AIHub.finish` shape: one tied co-op group in `standings`, a score entry per remaining real player, `won: true` only for an actual completed campaign, and useful per-player stats. Failure and unfinished time-up use `won: false`. Never rank the dedicated host.
8. On `end`, stop accepting all game input, including settings/menu input, advancing gameplay, sending messages and producing sound. Hub owns the results/removal flow. Fatal load/unsupported-browser failures use `AIHub.fail` rather than a frozen screen.

Do not let in-game quit/restart/title actions alter an active Hub round. A settings overlay is local. Configure session copies with native `autoPause: false` and non-pausing menu/settings overlays so hidden-tab or controller-disconnect handling cannot freeze the authoritative simulation. Ignore Options whenever Create is held so Hub owns its controller chord. Disable mutating cheats and workshop changes during sessions; leave non-mutating diagnostics available. The standalone title-idle requirement applies to standalone menus, while active Hub sessions follow the protocol’s automatic-start flow.

### Transport and authority

Use `AIHub.send` exclusively for session traffic. Do not add sockets, WebRTC, a broker, chat, voice, custom names, popup dialogs or navigation. Treat player names as text. Send intents to `AIHub.host`; never assume player zero is the host. Process host-local intent directly because a copy does not receive its own sends.

Use small cardinal/action intents with monotonically increasing sequence numbers and a heartbeat. Authenticate the seat from the message sender rather than trust a supplied player ID. Reject invalid directions, stale or implausible sequences and unauthorised commands. Neutralise held input after a bounded missing-heartbeat interval.

Start with roughly 10 Hz batched snapshots and input-on-change with a bounded heartbeat. Stay within the protocol’s **20 outgoing messages/second per copy**, burst 40 and **16 KB JSON** limits; target routine unreliable packets around or below 1,200 bytes. Do not send one message per food agent or effect. Respect a false `send()` return and bound retry queues. Use reliable stage/terminal transitions and periodic repair state; sequence and revision checks prevent stale snapshots resurrecting eaten food or rewinding a gate.

Interpolate remote render positions. If local prediction is needed for responsive direction changes, predict motion only and reconcile with the host; never predict confirmed food ownership, score or damage. Budget event traffic with ordinary state traffic. Keep a retained `AIHub.rng('world')` generator or another documented seeded simulation stream; shared-world `Math.random` is not automatically deterministic.

The gameplay state is authoritative; dedicated hosting and impaired-network tests are completion gates, not post-release enhancements.

## 11. Maze workshop and expansion tools

Build a small useful editor, not a sprawling general engine UI. The board fills the screen with a large focused cell and a short tool palette. Provide wall toggle/paint, erase, player spawns, food spawns, tunnel pairing and gate placement/preset. Use templates for the permanent pen so the user cannot accidentally dismantle required infrastructure. Support undo/redo, clear confirmation, reset template, save slot, rename with a sensible default, export/import and playtest/return-to-editor.

Controller editing uses D-pad/stick focus with sensible repeat, an action to apply the selected tool and a short palette to switch tools. Mouse paints directly; touch edits with tap/drag. Provide a large help panel rather than many tiny labels. Text import/export can use an in-game accessible panel in standalone; browser file controls are a convenience, not the only way to save. These authoring functions are not available during a Hub round.

Validation must check dimensions, bounds, wall symmetry if the format needs it, spawn types/counts, twelve food identities, tunnel pairing, safe starts, permanent pen integrity, reachability through every gate state and the existence of useful interception loops. It must reject corrupt imported data with a helpful message and retain the current valid board. Show the first actionable error and highlight its cells. Do not merely disable Play with no explanation.

Workshop boards use the campaign’s schema and simulation. Seeded generation uses the same validator. Save a few varied, known-good templates. Test edit → validate → save → reload → export → import → play → return, including an intentionally invalid maze. New stages should be addable by data and native asset tools without editing AI, collision or network code. Document that workflow in `docs/authoring.md`.

## 12. Attract mode and developer tools

### Attract demonstration

After **ten seconds** without meaningful input on the standalone title/menu, begin a looping AI demonstration. Configure the engine’s twenty-second default explicitly. The attract actors use the normal intent/simulation interface, with cheats permitted only in the attract instance. Cycle through a bright board, power reversal, tunnel interception, rotating centre, disappearing walls/reveal, co-op moment and finale celebration. This is a showcase, not a benchmark of bot fairness.

Any real keyboard, mouse, touch or pad input exits immediately to the appropriate title/menu. Consume that input so it cannot also start a run or activate an item. Gameplay AI events, network messages and minor gamepad drift do not count as user activity. Keep attract scores, saves, unlocks and RNG isolated from real runs. A fresh title state should be correct after repeated attract loops. A pre-gesture loop works silently.

### Developer mode

Expose Developer Tools from the pause menu in standalone. Include stage/seed selection, restart/advance, invulnerability, reveal walls, food/predator/gate overlays, hitboxes/paths, single-step and a read-only event/state inspector. Entering dev mode visibly marks the run as assisted and excludes it from normal records. Disable mutation controls in Hub sessions without disabling ordinary settings or About.

Provide live sliders for player speed, food baseline/final speed, predator speed/reaction delay, power duration, gate cadence, reveal cooldown and damage grace. Lives and spawn-policy changes can apply on restart if necessary; label that fact. Group controls into a few pages and add a genuine Reset Defaults action. Values must update the simulation at a documented safe boundary, not just move a UI thumb. Returning from dev tools must restore the intended pause/time-scale state.

Use these tools to balance the actual game. Do not tune solely by reading numeric tables. Record major tuning outcomes in `docs/balance.md` so the final defaults have an explainable basis.

## 13. Headless verification and artifact packaging

### One quiet command

Expose a single development-folder command, such as **`node tools/test.mjs`**, covering simulation checks, browser checks, content validation and Hub conformance. It prints failures and one summary line containing passed/failed/skipped counts. Capture noisy subprocess output and show it only on failure. A skip must state the limitation; no unimplemented requirement may silently become a pass.

Rerun a check after changing the code or content it covers. Use change-aware selection or explicit arguments under the same entry command during iteration; run the relevant complete suite against the final bundle after packaging. Do not repeatedly rerun passing unrelated suites. There is no FPS gate, performance campaign or optimisation phase.

### Essential automated coverage

| Area | Evidence required |
| --- | --- |
| Movement | Early turns, cardinal stick intent, mid-edge reversal, held-input release, closed paths, tunnel continuity and swept encounters. |
| Food | Exactly twelve initial IDs, eight ordinary/four powered, monotonic survivor speed, no duplicate collection, deterministic routes and feasible final interceptions. |
| Predators and power | All state transitions, warning/expiry boundaries, refresh cap, chain reset, harmless returns, no repeated catch scoring and no unavoidable spawn hit. |
| Gates and walls | Orientation/graph agreement, safe occupancy during rotation, all-state reachability, reveal cooldown, collision echoes and assisted reveal. |
| Run lifecycle | Damage grace, invulnerability, zero-life failure, final pickup/contact ordering, stage clear, six-stage completion, retry, settings save/reset and corruption recovery. |
| Content/editor | Every authored stage validates; a bounded seeded sample generates reproducibly; invalid imports are rejected; workshop roundtrip produces a playable board. |
| Controls/screens | Keyboard, mouse focus/click, stubbed standard pad, two local seats, last-device prompts, glyph option, reconnect, touch multitasking/cancel, small-screen and TV layout. |
| Attract/dev | Ten-second entry, any-input exit, no save pollution, repeated loops, actual live parameter effects and full defaults reset. |
| Audio | Synth output, gain defaults/buses, no pre-gesture failure, mute/pause/end behavior and no audio-file dependency. |
| Online | Shared authority, host-local input, no server phantom player, identical food/lives/gates/revisions, simultaneous collection once, leave/time-up/end correctness and packet-loss repair. |
| Package | The final single HTML boots directly, has no missing local resources, contains the unmodified first-script Hub client, and has working credits/metadata and complete playable content. |

Write meaningful tests of invariants and player outcomes, not assertions that merely restate implementation constants. Expose a bounded `game.debug.snapshot()` and command interface for diagnostics. Keep destructive/time-skipping controls gated to tests or visible developer mode.

Include a scripted **whole-campaign playthrough** using legal player intents, ordinary movement, normal lives and the real stage transitions. Do not teleport to a win, directly clear the food mask or skip untested stages. A separate accelerated state test may target a boundary, but it does not replace the playthrough. Add a solo and co-op trace demonstrating final-target catches; verify actual movement/input as well as internal rules. Attract cheats cannot be used as completion evidence.

### Browser and Hub execution

Prefer engine headless tools and `file://` for standalone. Use the installed Playwright **1.63.0** environment or a matching local package; do not reinstall browsers. Chromium is the primary automated browser; use WebKit for a focused cross-engine/touch-profile pass where supported. This canvas-based game should not depend on WebGPU.

Use device profiles for phone/tablet checks and a `navigator.getGamepads` stub in a browser init script for physical-controller behavior. These are stand-ins; do not claim tests on actual controllers, phones, iOS devices or televisions. Keep one or two browser processes open and close everything you start.

Keep Hub harness dependencies together under `tools/hub/` and serve the harness and built game from a common allowed origin. If a server is required, bind **127.0.0.1** with port **0**, read the OS-selected port, and verify the loaded page is this game. Track the PID and stop only that process. Do not use fixed ports or inspect/kill neighbouring jobs.

Run the official harness for declared 1–2 seats, including one-player coverage and two-player normal, `latency=150&jitter=50&loss=5`, host-leave and dedicated-server cases. The harness supports `game=<relative path>&players=2&auto=1` and corresponding `scenario=host-leave` / `scenario=server` parameters. Await completion and require `window.__hubCheck.pass === true`; a completed page or screenshot alone is not success. Generic four-player examples do not require adding four-player gameplay to a 1–2-seat game.

Protocol conformance alone does not prove the game works. Assert the actual shared food mask, actor state, score/lives, gate orientation and stage revision across clients under latency/loss. Test reliable stage transitions, stale-message rejection, departing players, hostless end and end-of-round silence. Match actual lifecycle payloads to the pinned README.

### Limited visual inspection

Use screenshots only for questions scripts cannot settle: TV readability, board framing, crowded intersections, enemy/food distinction, invisible-stage fairness, co-op identifiers, phone safe areas, menu focus and credits layout. Use short motion strips for mouth/turn animations and the rotating gate. Do not substitute a screenshot of the title for a playable-game check or an FPS readout for visual judgment.

### Single-file build

Develop in modules, then bundle the engine, game, content, art data and procedural audio code into one HTML. Prefer no runtime local fetches or companion asset files so direct opening is reliable. External CDN dependencies are permitted by the brief, but must be pinned, documented and tested under the intended launch conditions; do not introduce one without a real benefit.

The Hub client stays unmodified and first, followed by the engine and then game bootstrap in a deterministic order. Avoid runtime ES-module imports or asset fetches that only worked through a development server. Escape embedded script terminators safely when generating HTML, without altering the required Hub client bytes. Use a deterministic build and validate the final document’s structure.

Run the final artifact through the same playable and Hub checks. Inspect the network/resource failures and console errors. Test direct standalone opening separately from harness serving. The final game must not depend on the development source tree, a leftover local server, a stale storage entry or an open editor tab.

## 14. Production sequence and exit gates

Work in coherent passes. Parallel read-only research, content design, asset authoring and focused audits can save time, but coordinate file ownership. Do not have multiple agents independently rewrite the authoritative simulation or vendored client. Shared-machine browser/process limits still apply.

| Pass | Work | Exit gate |
| --- | --- | --- |
| A — Contract and foundation | Read source/engine/Hub, pin dependencies, choose the title privately, map requirements, establish modular boot/build/test and an engine-native board. | A direct-open test bundle runs; first-script Hub verification and a minimal dedicated-host boot pass. |
| B — Core pleasure | One authored board with twelve moving food agents, responsive movement, three predators, power reversal, encounters, lives and a satisfying final catch. | Legal-input playthrough clears the board; food/hit/reversal invariants pass; the source identity is visible without explanatory text. |
| C — Authority early | Reuse the simulation for couch co-op and Hub host/client/server copies; implement lifecycle, snapshots, local settings and results. | Both players affect one world; dedicated host has no local hero; impaired-network and lifecycle checks pass. |
| D — Complete mechanics | Rotating pen, tunnels, disappearing walls/chirp, seeded generator, schema and validator. | Each mechanic works in solo and co-op, has a test, and cannot strand remaining food. |
| E — Full playable content | Author all six stages, campaign flow, remix, workshop and save schema. | Full normal-rules campaign and workshop roundtrip pass; all features have playable coverage. |
| F — Presentation and access | Original rigs/animations, audio/music/voices, TV menus, responsive controls, touch assists, attract mode, dev sliders and credits. | No stock demo branding; every promised screen works across required inputs; audio and ten-second attract checks pass. |
| G — Balance and release | Play and tune, fix material findings, bundle final artifact, validate metadata/feedback and run final relevant checks. | Final-file playthrough, Hub checks and targeted visual inspection pass; required output files parse and match the game. |

Build minimal cross-system paths early, then deepen them. Do not leave multiplayer, direct-file packaging or the whole-game script until the final hour. Conversely, do not polish six boards around an unproven final-target mechanic. Keep an issue ledger with unique issues, severity, test that caught them, fix and verification; it supplies honest testing feedback.

When a check fails, correct the underlying rule, data or integration before broadening scope. No user-facing placeholder, inert menu item, fake slider, decorative network status or stub editor counts as completed infrastructure. If an unavoidable environment limit remains, test with the specified stand-in and report the precise limit rather than inventing success.

## 15. Release information and acceptance

Create a single source-of-truth release-information object used by About/Credits, exported metadata and the final response. Populate the exact source-information fields required by your own brief: date, source, plan, genre, perspective, stack/versions, art, animation, audio, online features, testing parameters, research, environment, model and usage. The plan field identifies `PLAN.md`. Use your own run’s model/date/environment details. Usage is exactly **added on import**; do not estimate tokens, money or elapsed cost. Write **unknown** for anything unconfirmed.

The in-game About/Credits and final builder reply must both contain **Source Information, Testing Feedback, Engine Feedback and Prompt Feedback**. Answer every question in the brief in its given order. Testing feedback comes from the issue ledger and actual commands run. Engine feedback distinguishes reused systems, focused changes and systems authored for this game. No fabricated issue counts, listening checks, hardware tests or engine complaints.

Save the builder exit-interview JSON under the exact name/location and schema in the builder’s brief. This is separate from any planner interview. Validate that it parses, every required field is filled, feedback arrays have one answer per question, and catalogue title/tagline/description, 1–2 player count, controls, source, franchise and 3–6 lowercase tags describe the finished game. Choose the nearest allowed catalogue genre, likely Action; do not substitute an unsupported label. Use the brief’s schema verbatim instead of inventing a parallel one.

Before finishing, verify:

- The builder-selected title is consistent and was selected from fifty private candidates by real RNG.
- The final single HTML opens by itself and the session client remains byte-for-byte valid in the required position.
- Food genuinely moves, accelerates and can be intercepted; the final catch is fun and achievable on every delivered board.
- All six campaign stages, remix, workshop and complete success/failure/retry flows work with ordinary controls.
- Solo, couch co-op and Hub shared-world co-op use the same authoritative rules; dedicated hosting and impaired-network cases pass.
- Controller, keyboard/mouse and touch stand-ins cover the same screens, with correct glyphs/focus and readable TV framing.
- Native-style original art/animation, procedural audio, 10% default music, ten-second attract mode and real developer controls are present.
- The one-command test result, issue counts, About/Credits, release metadata and builder interview agree with what was actually tested.
- No TODOs, placeholders, stubbed features, stray kit screens or unused promises remain in the delivered experience.
- All files, browser processes and servers created for the work stayed scoped to this project, and owned test processes are closed.

Finish with the required files and a concise, truthful handoff containing the mandated information and feedback. The result should feel like a finished small arcade game whose designers can add more mazes and variations using the systems already delivered.
