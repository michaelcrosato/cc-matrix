# Build plan for gpt-6.1-sol ultracode

## Mandate and working conventions

Build a complete, original arcade maze-chase game inspired by **K.C.'s Krazy Chase! (1982)**. The experience should be immediately readable, funny in motion, tactically satisfying, and substantial enough to establish the finished game's systems and content pipeline. Use ultracode's 1.05M context window to keep the engine, session protocol, simulation, content, and tests in view together. Invest that capacity in integration, authored situations, and thorough completion.

**The builder chooses the title.** Privately generate 50 playful riffs on the source name, select one using an actual random-number generator, and use it consistently in the game and delivery metadata. This plan deliberately supplies no title or candidate list.

The builder's CEO brief controls exact delivery names, its development directory, date/model metadata, and required interview schema. Derive those from that brief. All proposed local paths below are relative to that development directory. Put the finished single HTML and required machine-readable interview at the delivery locations specified there. Keep downloads, caches, tools, screenshots, and working files inside the owned development directory; never inspect neighboring builders' work.

This plan makes the major game decisions. Numbers are initial tuning values, to be adjusted through play and the live controls. Preserve the complete feature set while improving its execution. Do not substitute an endless prototype, a static chase scene, or disconnected demonstrations for the finished slice.

## Source research and the interpretation

The [original rules](https://odyssey2.info/library/manuals/us_kcskrazychase/kcs-krazy-chase.txt) establish four-way movement with edge wrapping; a tree-eating Dratapillar whose head always threatens the player; edible body segments; and two Drats that become frightened after a bite. Catching a frightened Drat temporarily immobilizes it in a spin. Scores are 1 for a tree, 3 for a segment, 10 for a Drat, and 20 for clearing the creature's segments. Subsequent rounds accelerate. There are five standard mazes, a wall editor, and high-score/name entry. The documented multiplayer is competition over successive turns or time, not simultaneous cooperation. The manual recommends attacking from behind but does not conclusively specify a tail-tip-only hit rule. Treat that detail as unknown history.

Consult the [illustrated manual](https://odyssey2.info/library/manuals/us_kcskrazychase/K.C.%27s%20Krazy%20Chase%20%28USA%29.pdf) for silhouettes and maze readability. The [original packaging](https://elisoftware.org/wiki/K.C.%27s_Krazy_Chase%21_%28Odyssey_2%2C_Cartridge%29_Magnavox_-_1982_USA%2C_Canada_Release) supplies the Venus setting and gleeful, alliterative menace. [Contemporary coverage, printed page 75](https://www.worldradiohistory.com/Archive-Radio-Electronics/80s/1983/Radio-Electronics-1983-06.pdf) describes synthesized encouragement and laughter. Inspect accessible gameplay footage before finalizing motion and sound references; record the URL and what was actually observed. Do not claim to have heard or verified material that was unavailable.

Our interpretation is **overhead arcade action with a tactical maze-pursuit loop**, presented in the engine's shaded pixel style. The player is a mischievous garden keeper on a strange, exuberant Venus. Chase a giant creature's edible tail, escape its hunting head, and use every successful bite to turn its two helpers into temporary scoring opportunities. Trees provide route choices and resources rather than becoming a mandatory dot-clear checklist.

Modern additions are deliberate: a clearly marked tail-only bite target; plantable bait; encounters with two crawlers; five authored gardens forming a finite campaign; simultaneous two-player cooperation; and an accessible maze workshop. Describe these as this game's design decisions, not recovered original rules. Preserve the original's comic chase, shifting predator/prey relationship, wraparound tricks, and editable-maze spirit.

## The experience to build

Aim for a first successful campaign of roughly **12–18 minutes**, with instant retries, a satisfying ending, replayable scoring, and a workshop that produces playable new mazes. This is a content and pacing target, not a test timeout or a performance target.

The opening screen shows the selected title, an animated garden, and a few large choices: Play, Local Co-op, Maze Workshop, Settings, and About/Credits. Continue appears only when a valid campaign checkpoint exists. All routes work with a controller, keyboard, mouse, and touch. Starting Play reaches movement quickly; teach through short, contextual prompts and safe situations rather than a long instruction page.

The minute-to-minute loop is:

1. Read the head's route and the moving chain. Move through loops and marked wrap exits to reach the glowing tail.
2. Bite automatically on contact. The chain shortens with an unmistakable chomp, the tail marker moves, and the two sentries turn pale and frightened.
3. Choose between pursuing another bite, catching frightened sentries for points, collecting trees, or planting bait to set up the next intercept.
4. Dodge the head, which remains dangerous throughout. Clear all required tails to finish the garden, recover some safety, and move on.

Solo is the complete experience. Local co-op and Hub co-op use the same gardens, objectives, rules, menus, and character capabilities. Cooperation comes from splitting routes, drawing a pursuer away, and setting up a teammate's bite. Do not add a separate competitive ruleset or a second campaign.

## Rules, fairness, and game feel

### Movement and topology

Use a cardinal grid with continuous visual motion, buffered turns, and immediate reversals when legal. Start the hero near **5.2 cells/second**, the crawler near **3.6**, and sentries near **4.2**. Slightly increase pressure by garden. Early directional input should queue the next legal turn without requiring frame-perfect alignment. Sticks choose a dominant axis with hysteresis; diagonal keyboard input has a stable, documented resolution. Stop at walls cleanly.

Use a fixed, whole-maze overhead camera. The player must always see the head, current tail target, two sentries, and both ends of every active wrap connection. Wrap exits are paired, animated openings with matching marks. Crossing one moves an actor to its actual partner; never interpolate a creature across the middle of the board. Navigation, click-to-move, AI, collision, replays, and workshop validation must all use the same graph of ordinary and wrap edges.

The engine uses 16 world units per tile. Keep simulation positions in cells and convert to world coordinates at one boundary. Start with a native custom logical resolution around **512×288**; fit each complete garden and its HUD before play begins. Adapt the viewport and fixed zoom for portrait screens while retaining the complete maze. Avoid scrolling, camera rotation, and character-sized HUD overlays.

### The crawler and sentries

The crawler consists of one permanently dangerous head and a visible, shortening train of segments. **Only its brightly marked final segment is biteable in this adaptation.** Other segments are nonlethal, soft visual bodies; they do not become hidden solid walls or new damage sources. React to brushing with a squash animation. The tail can be bitten from any contact direction; avoid a hard-to-read approach-angle test.

Record the head's continuous traveled path and sample body positions by distance along that path. Preserve corner and wrap discontinuities explicitly. Biting removes one segment exactly once, contracts the train coherently, and starts a short bite cooldown, initially **0.45 seconds**. The next target becomes obvious immediately. Render the mouth and head danger silhouette independently of segment count. A head with no segments remains threatening until the garden-clear transition actually begins.

Give the crawler readable states: forage toward trees, chew on bait, periodically pursue or cut off a keeper, and become more urgent when little tail remains. Announce a pursuit change through eyes, posture, and a short musical cue. Decisions occur at meaningful junctions using seeded choices. It can surprise the player through routes; it should not know future player input or reverse into them without warning. Prefer routes that avoid visually collapsing its train onto itself.

The two sentries have distinct silhouettes and intentions: one trails a player's recent route, while the other favors an upcoming junction. After a bite, both become frightened for an initial **5 seconds**, flee, and display an expiring visual rhythm. Catching one awards points once and spins it harmlessly for about **2.5 seconds** before it returns to pursuit. Refreshing fright does not repeatedly award points for a sentry already spinning. Use shape, expression, and animation as well as color for every state.

### Trees, bait, score, and consequences

Trees are optional pickups worth 1 point. They also supply a shared bait reserve, capped initially at three. The action button plants one conspicuous snack sprout on a legal adjacent passage cell. Preview the valid placement; reject invalid placement without spending resources. Each player may have one active sprout. The crawler diverts toward nearby bait and chews for about **0.9 seconds**, creating a readable intercept opportunity. Bait never blocks passages or becomes necessary to clear a garden. At garden entry, supply enough resources to demonstrate it. Resolve simultaneous spending authoritatively so two players cannot spend the same final seed.

Retain the recognizable 1/3/10/20 base scoring for tree/bite/sentry/clear. Add a modest, well-explained chain multiplier for consecutive bite-and-sentry plays; cap it and show its expiry. Keep scoring legible and resistant to farming. Offer a concise garden report with score, bites, catches, and a clear next step. Save solo and cooperative records separately; modified workshop/dev runs cannot overwrite normal campaign records. Give high-score name entry a controller-friendly character picker, with keyboard entry available standalone.

Start a run with three shared lives. A dangerous contact costs one life and sends the affected hero to the safe nursery after a short, visible respawn. Grant roughly two seconds of visible invulnerability. Multiple contacts in the same simulation instant cost at most one shared life; use a short team damage grace period to prevent unfair double losses. At zero lives, show a complete defeat state. A garden clear restores one life up to the cap. Retry restores the garden-entry checkpoint, including its score and resource state, so repeated partial clears cannot farm records. New Run resets the campaign.

Define event order explicitly. Capture contacts, resolve genuinely dangerous hits, then valid surviving-player bites and pickups, then score/clear/defeat transitions. A killed player cannot award a bite on that tick. Team defeat wins over a simultaneous clear if no lives remain. A surviving teammate can still finish a legitimate bite. Write these policies once in the simulation and cover the ambiguous cases with tests.

### Five authored gardens

Use original layouts rather than tracing the cartridge maps. Each garden receives a distinct palette, prop set, musical variation, entrance, and short comic line. The campaign introduces rules through geography and then combines them.

| Garden role | Initial size and creatures | Authored lesson and payoff |
| --- | --- | --- |
| First chase | 15×9, one six-segment crawler | Broad loops, one obvious wrap pair, safe first bite. Introduce sentries at low pressure and make their first frightened state easy to catch. |
| Wrap interception | 17×11, one eight-segment crawler | Multiple marked edge routes, a tail that can be intercepted through a wrap, and a head that punishes blindly chasing it. |
| Bait orchard | 19×11, one nine-segment crawler | Branching tree routes and junctions that make bait useful. First planting opportunity is generous; the same rules remain beatable without bait. |
| Crossing paths | 19×13, two five-segment crawlers | Independent heads and tails force route reading. Biting either scares the shared sentry pair. Both trains must be cleared. |
| Final garden | 21×13, two seven-segment crawlers | Combine wrap shortcuts, bait, head avoidance, and scoring windows at higher pressure. End with a real celebration and campaign summary. |

Tune segment counts and routes to create the intended length, with no waiting for an inaccessible tail. Before content lock, run every garden solo and co-op, test zero-bait recovery, and inspect all spawn/transition states. Do not introduce an exclusive rule in the finale. After victory, allow replaying unlocked gardens and returning to the workshop; preserve the finite campaign ending.

## Native engine, art, and animation

Research confirmed [my-3D2dge v0.89.1 at commit 8ecc2f6](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/README.md). Start from the full handoff engine, read its [API card](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API.md), and adapt the maze portion of the [arcade kit](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/kits/arcade.js). Pin the actual snapshot used and report its version. Re-check newer documentation if choosing to update it. The full engine already includes its arcade and grid modules; do not load duplicate copies.

Use the engine's code-drawn shaded pixel art, projected procedural rigs, material tones, props, lights, contact shadows, and pixel helpers. Select the native `overhead` view. Make bespoke hero, partner, crawler head, segments, tail fruit, sentries, trees, bait, and wrap-mouth assets. A round `E.Blob`-based hero is a reasonable foundation; develop original expressions and proportions around it. The library is appropriate for generic stones, fences, flowers, and background dressing.

Art direction: jewel-colored alien garden dioramas, cool shaded ground, warm edible highlights, soft expressive creatures, and cheerful menace. Blue and coral heroes should remain distinct from the crawler and sentries. Keep head danger readable without relying only on red; tail targets receive a separate shape and pulse. Put rich foliage, spores, reactive flowers, tiny spectators, layered lighting, and celebration effects around the action. Foreground props and shadows must never conceal a passage or collision boundary.

Build continuous native animation states: locomotion and turns, anticipatory chomp, bite recoil, bait placement, head suspicion/lunge/chew, chain contraction, frightened trembling, sentry spin/recovery, hit/respawn, idle comedy, and victory. Add squash, gaze, antenna motion, and secondary leaf movement. Drive gameplay from simulation events, not from an animation reaching an arbitrary frame. Draw through `r.actor`, `E.px.*`, sprites, and native UI/font helpers; do not blur the game buffer with antialiased canvas primitives. [Engine rendering and animation contract](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API.md).

There is no FPS target or optimization milestone. Use as much visual detail as serves the scene. Still preserve legibility, input correctness, reliable loading, and respectful sharing of the workstation's memory and processes.

## Audio and writing

Generate every sound in code through Web Audio and the engine's synthesis system. Include a memorable main motif with five garden arrangements, a title variation, frightened-state layer, garden-clear sting, defeat sting, and ending. Route music, effects, and gibberish voices to separate native buses. **Music starts at 10% volume** on a fresh profile; restore a user's saved setting afterward. Keep effects and voices independently adjustable. Do not load audio samples or embed audio files.

Give bites, head warnings, sentry fright/recovery, wraps, pickups, valid/invalid planting, life loss, and menu actions distinct sounds. Compose short Animalese/Simlish-style utterances from synthesized syllables with pitch and rhythm variations. Tie every warning to a real, current event; no irrelevant spoken alarms. Unlock audio on the first permitted user gesture without blocking gameplay or Hub readiness. Suspend/mute the appropriate buses on pause, blur, and Hub end, and avoid stacking duplicate loops after restart.

Write short, playful arcade copy with alliteration and comic overconfidence. Let body language carry most of the story. Tutorials should fit in one or two short lines; every garden needs at most a brief arrival quip. Include a readable text equivalent for meaningful gibberish cues. Reduced motion lowers shake and flashing; no audio cue is the sole warning of danger.

## Controller-first screens and device behavior

Extend the engine's existing pause, settings, controls, fullscreen, focus, and menu behavior. Its `E.Menu` already supports controller/keyboard navigation, hover-to-focus, clicking, and tapping. Use native focus styling and consistent back navigation. Do not build a parallel HTML application around the canvas. [Native UI/input API](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API.md).

| Action | Standard-mapped controller | Keyboard/mouse | Touch |
| --- | --- | --- | --- |
| Move | Left stick or D-pad | WASD or arrows; optional click-to-move on reachable floor | Invisible floating thumb stick with forgiving cornering |
| Plant bait | Cross by default | Space; click a valid adjacent placement preview | A contextual Plant pop button near a valid opportunity; second-finger use supported |
| Confirm/back | Cross/Circle | Enter/Escape; click and hover | Tap; native back control |
| Pause | Options | Escape | The small menu button |

Mouse click-to-move uses the same wrap-aware navigation and cancels immediately on directional input. It does not dodge enemies or grant a different movement speed. Mouse hover moves menu focus. Controller prompts default to PlayStation glyphs, with an Xbox A/B/X/Y option in Settings. Prompts follow the last real input modality through `game.input.label(action)` and the configured glyph setting; movement noise must not cause constant glyph flicker.

Local co-op supports two pads or keyboard plus one pad. Assign each physical device to one seat and show a simple join/assignment screen; never let one device silently steer both players. Disconnect pauses standalone play and offers reassignment or continuing solo. A player leaving restores a safe solo balance without losing the run. Two simultaneous local touch players are outside this design; the touch screen remains a full solo input route.

At 1920×1080, use large labels and generous safe margins that read from ten feet. Show only team lives, score, seeds, and remaining tail segments during play. Put explanations in focused panels, not dense tables of game data. Check portrait phone, landscape phone, and tablet: no clipped menus or hidden action, no permanent giant button deck. Touch assistance includes a generous turn buffer and useful placement preview, with any optional auto-plant assistance clearly labeled and record-separated if it changes difficulty.

## Attract mode, developer tools, and maze workshop

### Attract mode

After exactly **10 seconds of physical inactivity on the standalone title/menu**, enter an AI-played tour. Use the actual campaign scenes and simulation with a separate demo flag, not a video or unrelated animation. Show a bite, frightened catch, wrap, bait, a two-crawler garden, and a short co-op example; then loop. The AI may ignore damage or reposition between marked scenes. It must never write saves, scores, achievements, or network messages.

Use `E.Arcade` with `idle:10`, extending its demo controller as necessary. The native default is 20 seconds, and its default two-player support is alternating turns; neither satisfies this design without adaptation. Extend wake handling to real pointer movement, touch, keyboard activity, button presses, and meaningful analog movement. Ignore synthetic bot actions and gamepad drift. Any real input exits attract, restores the clean title state, and is consumed so it cannot also purchase a menu selection or start a run. Never enter attract inside an active Hub session. [Arcade implementation](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/modules/arcade.js).

### Developer tools

Add Developer Tools to the native pause menu. Supply invulnerability, freeze/step, restart garden, garden/wave selection, seed display/reseed, spawn/reset actors, refill lives/bait, hitboxes, grid and wrap graph, AI targets, chain-history visualization, and state/snapshot inspection. A teleport/cursor tool should make reaching a situation quick.

Expose live sliders for player speed, crawler speed factor, sentry speed factor/aggression, fright duration, sentry recovery duration, bait chew duration, bite cooldown, and life count. Each has units, sensible bounds, controller adjustment, and an immediate observable effect. Include **Reset Defaults** that restores the complete tuning preset. Keep tuning data centralized and serializable so authored gardens can use overrides. Mark any altered run as modified and protect normal saves/records.

Local debug overlays may be inspected during Hub play, but developer commands and sliders cannot change shared gameplay in a live session. Local settings must not pause the remote simulation. Exercise these restrictions in tests.

### Maze workshop and designer pipeline

Provide a real, controller-friendly workshop using the same level schema as the campaign. Start from any unlocked garden or a small usable template. Offer a grid cursor, floor/wall brush, paired wrap placement, tree brush, hero nursery, crawler route/spawn placement, sentry spawns, and a compact palette/theme choice. Allow undo/redo, reset template, validate, playtest, save/load, and return from playtest with edits intact. Use a few focused tool panels rather than a wall of parameters. Mouse painting and touch tapping use the same editing commands.

Validate dimensions, legal entity placement, connectivity, paired wraps, reachable trees/targets, safe nursery space, and sufficient legal initial path length for each chain. Disallow isolated passages and malformed wrap links. Explain validation errors on the board and place the cursor at the first problem. A connected but tactically weak custom maze may be allowed with a warning; impossible geometry must not silently start.

Persist named local creations with a versioned schema and handle unavailable storage gracefully. Offer JSON import/export in standalone mode, with validation and useful errors. Keep browser file dialogs/download flows outside Hub sessions. Campaign maps and workshop maps feed one simulation and renderer; adding another garden should be data authoring, plus optional custom art/music variation, without editing collision or menu code.

## Multiplayer and AI Hub

Implement **1–2 player shared-world cooperation**. Standalone multiplayer means genuine couch co-op. Online cooperation is provided through AI Hub. Do not label a same-browser harness or BroadcastChannel as internet play. The official client has no standalone online lobby/transport; do not promise one. This is the selected interpretation of the CEO brief's standalone multiplayer requirement.

Research confirmed [AI Hub protocol v1, client v1.4.0, commit 35a1047](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md). Read the full contract, [pristine client](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/session.js), and [shared-world example](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/examples/arena.html) before implementing. Use the same revision across client, harness, and checking tools.

Place exactly one **unmodified** session client as the first script in the HTML head immediately after charset. Declare session version 1, players `1-2`, and mode `shared-world`, with honest goal/how-to metadata and an approximate campaign duration. Do not declare a WebGPU requirement for this 2D engine.

Lifecycle requirements:

1. Register lifecycle/message handlers promptly and call `AIHub.connect({mode:'shared-world', seats:[1,2]})`. A null result enters the ordinary standalone title flow.
2. In a Hub session, skip the title, attract, local joins, and standalone launch screens. Use Hub's instructional card. Construct the world and call `AIHub.ready()` once without requiring input, audio unlock, or a local avatar.
3. Start only after receiving `start` and `AIHub.time() >= 0`; the start notification arrives before play time.
4. The host owns all authoritative world rules. At completion or time-up, only the host calls `AIHub.finish`, once. Honor `graceMs`, report actual progress/score, and identify whether the team cleared the campaign.
5. On `end`, every copy stops game input, sending, simulation, and sound. Hub owns the result screen and session removal. Standalone Restart/Quit controls cannot escape or reset a live Hub round.

**Separate authority from local-player existence.** `AIHub.server === true` is a required supported mode: the host has no playable seat and its `me` is absent from `players`. Run the same complete world simulation there without creating a phantom hero or waiting for local controls. Render/input adapters find a local actor only when one actually exists. In Hub mode configure native `autoPause:false` and adapt standalone pause actions before readiness: blur, a hidden page, or controller loss must not pause the authoritative world. Keep standalone automatic pause behavior outside sessions.

Normalize player commands into direction and plant intent, tagged with sequence and round/garden identity. Bind each message to the transport's `from`, not a client-claimed seat. Send each discrete plant press reliably with a unique action ID; the host deduplicates it and acknowledges its accepted/rejected result, directly or in snapshots. Do not repeat a plant action merely because a held button appears in another heartbeat. The host owns chain history, AI, bait, collisions, lives, scores, checkpoints, garden transitions, and ending. Clients cannot award themselves pickups, bites, or wins. Use named retained `AIHub.rng(...)` streams or a host-owned serialized seeded PRNG; shared-world `Math.random` is not automatically deterministic.

Non-host clients send directional input/heartbeat around 8 Hz; the host applies its own local commands directly and broadcasts snapshots around 10 Hz. Keep each copy below the documented 20 messages/second allowance with room for reliable actions and events. Broadcast one snapshot rather than separately sending it to each peer. Payloads must remain below 16 KB; keep repeatable unreliable packets near 1,200 bytes where practical. Use reliable messages for planting, stage changes, and results; repeatable directional input and snapshots may be unreliable. Reject stale sequence numbers and wrong-round commands. Time out stale input, repair dropped state with later snapshots, and reconcile visual movement without changing the authoritative collision result. The final packaged build must use these same paths.

Co-op uses shared lives, seeds, objectives, and score. Introduce only a modest enemy-pressure adjustment for two players, reset safely when a non-host leaves, and keep the remaining game solvable. Remove a departing player's actor, bait ownership, and stale commands. Host departure voids the round through Hub; do not invent host migration. Group all remaining players in one tied standings entry and include each exactly once with the real shared score. Render supplied names as text.

During a session, networking goes exclusively through `AIHub.send` and the session lifecycle. No independent sockets/brokers, player chat, emotes, custom names, popups, navigation, or new tabs. Reserve Create+Options for Hub by ignoring Options while Create is held. Settings can be local overlays without stopping other players. These restrictions are protocol requirements, not optional polish.

## Architecture and construction order

Use ordinary modular JavaScript with a reproducible Node build/assembly command. Favor the native engine's patterns over adding a framework. Keep gameplay rules independent of DOM/audio/rendering so headless tests and authoritative hosting execute the same code. The following paths describe ownership boundaries, not required artificial complexity:

| Dev-relative area | Responsibility |
| --- | --- |
| `vendor/engine/`, `vendor/hub/` | Pinned handoff, pristine session client, required harness resources, licenses/version notes |
| `src/sim/` | Fixed-step world, maze graph, movement adapter, chain history, enemy states, contacts, score, campaign state |
| `src/content/` | Versioned garden data, palettes, tuning presets, tutorial beats, concise writing |
| `src/view/` | Native rigs, world drawing, effects, readable HUD, menu extensions |
| `src/input/`, `src/net/` | Device/seat mapping, normalized commands, Hub adapter, snapshots and lifecycle |
| `src/audio/`, `src/tools/` | Procedural composition, synth voices, workshop commands, live developer controls |
| `tools/`, `tests/` | Builder, validators, bots/replays, one-command verification, browser/Hub checks |
| `artifacts/` | Owned research notes, captures, test evidence and accurate feedback bookkeeping |

Give the simulation a seeded initial state and one step function accepting normalized commands. Give the renderer read access to snapshots plus a one-shot presentation event stream. Save only versioned campaign/workshop data and user settings; handle corrupted/missing storage without crashing. Session state and dev changes must not leak into campaign saves. Provide a snapshot/restore contract usable by retries, replays, networking, and tests instead of four unrelated state representations.

The native [grid module](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/modules/grid.js) supplies `E.Grid`, deterministic `grid.path`, and `E.GridMover`. Its mover speed and smooth coordinates are in cells; `update(...,{keep:true})` queues turns and continues movement. Inspect and adapt it for paired wrap edges and our controls. Native direction changes occur at cell arrivals, so implement the promised immediate reversal explicitly: swap the current edge endpoints and replace progress with `1-u`, preserving the smooth position. Apply the same topological treatment at wrap edges. Do not assume its default pathfinder already handles custom topology. Isolate any engine extensions and record the exact changes and reasons.

Build in dependency order, finishing playable states at each gate:

1. **Foundation and early delivery proof.** Read the handoff and Hub contracts; pin them. Make a tiny native scene with one animated hero, a legal maze, real input, synthesized sound, and the final HTML assembly route. Open that assembled page directly. Wire null-session and Hub connect/ready/start/end, including the no-player host, before substantial content work.
2. **Complete first garden.** Finish wrap-aware movement, the head/path/tail system, both sentries, fright, score, trees/bait, lives, retry, and clear. Include real art/animation and sound early enough to judge the chase's feel. Exercise solo, local co-op, and a two-copy authoritative session on the same core rules.
3. **Full authored campaign.** Build all five gardens, progression/checkpoints, two-crawler encounters, tutorials, victory/defeat, records, and content validation. Tune routes and incentives through deterministic bots plus inspection of actual play. Keep every mechanic accessible in a normal unmodified run.
4. **Complete player-facing systems.** Finish all device paths, TV/portrait layouts, device reassignment, attract tour, dev tools/sliders, workshop/save/import/export/playtest, About/Credits, and audio variations. Validate connections between these systems, including returning from workshop playtest and dismissing attract.
5. **Integration and delivery.** Run the full campaign and device/Hub gates against the assembled artifact. Repair remaining issues, regenerate it, validate metadata/interviews, remove accidental dependencies on working files, and record honest limitations. No unfinished modes, dead menu entries, silent stubs, or placeholder assets may remain.

Delegate independent content, procedural art/audio, and test work once the shared simulation, input, and event contracts exist. Keep ownership boundaries explicit and review integrated behavior after each merge. The primary builder retains responsibility for every gate; parallel work must converge into one game and one final artifact.

## Verification that proves the game works

Create **one command**, for example `node tools/verify.mjs`, for the selected checks. It prints only failures plus one summary line containing passed/failed counts. Capture noisy underlying tools and expose their output only when they fail. Track unique issues discovered and which were game-breaking for the required feedback. Rerun only affected checks after covered code changes; a final assembled artifact change justifies its relevant delivery checks. Do not repeatedly run unchanged checks to accumulate reassuring output.

Use the engine's headless capabilities: `new E.Game()`, exact `game.advance(...)`, input injection, `game.debug.snapshot()`, and draw-enabled exception checks. Add a narrow game-specific debug snapshot/control interface for tests. No production test hook should let a remote client override authority. A normal scripted playthrough must send real game commands and reach the campaign ending without teleporting, invulnerability, dev tuning, or force-clearing objectives. Separate focused setup tests may construct precise situations to verify edge cases. [Engine testing documentation](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/README.md).

Required meaningful checks:

- Movement through walls, early turns, reversal, blocked input, every wrap pair, and cell/world conversion; chain spacing and no cross-maze interpolation during wraps.
- Tail bite eligibility/cooldown; permanently dangerous head; frightened expiry, sentry catch/recovery, double-contact scoring, two simultaneous bites, shared resource spending, life-loss grace, and clear/defeat event order.
- All five garden data sets and workshop validation. A seeded full solo campaign; a two-player campaign; defeat/retry; checkpoint score rollback; victory/replay; save corruption and denied-storage recovery. Include a zero-bait clear route.
- Controller-only start-to-ending and every menu back path; standard-mapping stub with two independent pads; keyboard plus pad; prompt switching and Xbox setting; disconnect/reassignment; mouse hover/click and movement cancellation; phone/tablet multitouch and context planting.
- Attract starts after ten inactive seconds, demonstrates its promised beats, loops, and exits on every physical input modality without consuming records or immediately activating a menu item. It never runs in a session.
- Every slider changes the intended simulation value and Reset Defaults restores it; modified scores remain separated. Workshop create/edit/undo/validate/playtest/save/reload/import/export works and preserves edits.
- Procedural audio produces finite, nonzero, bounded output via OfflineAudioContext or an analyser, bus controls work, fresh-profile music gain is 0.1, and pause/restart/end do not duplicate or leak sound. This does not establish subjective audio quality; report that limitation honestly.
- Final HTML opens from `file://` without project-relative fetch/import failures, loads visibly, is playable, reaches About, and matches its delivery metadata. Check console/page errors and forbidden audio-file requests. CDN use, if any, must be intentional and disclosed.

Screenshots are for judgments scripts cannot establish: the hero/head/tail separation, frightened-state legibility, the five garden compositions, TV text/focus size, portrait obstruction, animation silhouettes, and celebration. Use a small purposeful set of captures. Do not infer gameplay success or WebGPU failure solely from a screenshot.

### Hub acceptance

Use the pinned [harness](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/harness.html) and [official checking runner](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/scripts/hub-check.mjs), reading their actual CLI/options. Two declared seats are valid; the runner filters test counts to the declared player range. Run normal two-player, impaired two-player (`latency=150`, `jitter=50`, `loss=5`), impaired host departure, and `players=2&scenario=server` with a third non-playing authority copy. Explicitly test single-seat shared-world play as well, because the standard runner does not automatically cover it.

Wait for `document.body.dataset.complete === 'true'` and require `window.__hubCheck.pass === true`; inspect any failed checklist. Beyond protocol conformance, assert that both players see the same tail depletion, lives, scores, bait, garden transitions, and outcome; a departing player's stale input stops; and time-up/end leave no simulation or audio running. Exercise packet reordering/stale snapshots and normal gameplay input through the authoritative route. Verify that planting under loss/reordering is processed once or rejected once, with no duplicate spending or permanently missing acknowledgement, and that blur/device loss does not suspend the session authority. A passing connection screen alone is insufficient.

The game and harness must share an origin. Use a loopback server with an OS-selected port, verify that its returned page is this game, and record the PID. Close only owned processes. Keep ordinary test runs to one or two browser instances; the dedicated-host scenario may use three pages in one instance. Prefer the already installed Playwright 1.63.0 or its Python environment; do not download browsers or install system dependencies.

## Single-file delivery and truthful reporting

Assemble one HTML containing the pristine Hub client, full engine, all authored code, styles, data, rigs, and procedural audio definitions. There are no required audio assets or separately served local game modules. External downloadable dependencies are allowed by the brief, but this engine can support a self-contained game; prefer that reliable result. Preserve licenses and record exact revisions.

Take care when inlining: literal closing script tags inside engine strings/comments can terminate HTML parsing. Escape those occurrences in the engine/authored bundle during assembly, and test the generated document. Keep the session client's required pristine bytes intact; validate it separately. Do not assume a development page proves the assembled page works. Ship a reproducible build command and keep development evidence out of the root delivery except what the brief requires.

About/Credits and the builder's final chat reply must include **Source Information, Testing Feedback, Engine Feedback, and Prompt Feedback**, with every item required by the builder's own brief. Use the actual selected title, actual plan filename, final stack/version, source research, network scope, art/animation/audio systems, environment, and model metadata. Usage is exactly **added on import**. Unknown observations are **unknown**; do not invent playtester listening, physical-device coverage, costs, or engine changes. Stand-ins are described as stand-ins.

Create the builder's required machine-readable interview at its specified delivery location, using its exact schema and ordered feedback arrays. Fill catalogue title/tagline/description, correct player count, controls, source/series, genre, and three to six lowercase tags. Validate JSON parsing and required fields, and ensure the title, player count, source, controls, and technology agree across the HTML metadata, title screen, About, and interview. Maintain issue notes during construction so testing feedback has evidence.

Completion means the full garden campaign can be won and lost, co-op works standalone and in Hub including a non-playing host, the workshop creates valid playable content, all devices reach all screens, the attract tour and dev controls work, audio is synthesized with the required default, and the packaged artifact plus reporting pass their checks. Hand over the finished vertical slice and concise evidence of validation.
