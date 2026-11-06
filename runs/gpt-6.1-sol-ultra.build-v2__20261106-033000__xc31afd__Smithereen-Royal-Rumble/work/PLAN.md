# Build plan

Builder: **gpt-6.1-sol ultracode, 1.05M context window**. Use that capacity to carry the complete game design, engine contracts, content definitions, network lifecycle, and test evidence together through implementation. Deliver the finished game described here, with several rounds of actual play and refinement. The target is a substantial, coherent vertical slice whose remaining content could be authored with the same tools.

Your own CEO brief controls the source label, output naming, development directory, run metadata, and required reporting. Choose the game's title yourself: privately generate 50 playful riffs on the source name, select one using a real random number generator, and use that result consistently. This plan deliberately supplies no title or deployment basename. All local paths below are relative to **your development folder**; publish the final artifact and builder interview at the destinations prescribed by your own brief.

## 1. Creative direction

Build a **simultaneous artillery action game**, presented as a ridiculous medieval demolition tournament. Two catapults face each other across water. You hold to wind the launcher, release to throw, and read the changing castle silhouette to choose the next target. A hit on masonry makes permanent progress; a hit on the opposing launcher or crew buys a brief opening. The opponent is winding up while you are. This interaction must feel excellent before adding the tournament around it.

Use a fixed, side-on battlefield with the engine's richly shaded, pixel-crisp 2D world and shallow decorative depth. Both castles, both crews, the water, and the complete useful projectile arc remain legible together. It should look like a lively toy theatre: carved stone, oversized winches, bright heraldry, straining crew, splintering battlements, and a pompous sporting ceremony after every bout.

The player should immediately understand four things: how far this charge will throw; what their previous shot hit; which opposing target is worth interrupting; and why the remaining castle shape calls for a different shot. Every major system should reinforce these decisions.

Keep the source's charge timing and simultaneous combat. The artillery kit's walking soldiers, free angle adjustment, turn queue, rockets, and inventory are examples to replace. Avoid adding free movement, a technology tree, an economy, equipment rarity, or a separate adventure mode. Put the ambition into demolition, expressive machinery, varied authored opponents, robust controls, and complete integration.

## 2. Research foundation and evidence

Research was performed for this plan. Recheck the actual versions you acquire before coding; if upstream has changed, update the implementation notes rather than silently mixing interfaces.

| Reference | Confirmed finding | Consequence |
| --- | --- | --- |
| [Official Smithereens! manual](https://odyssey2.info/library/manuals/us_smithereens/smithereens.txt) and [illustrated manual](https://odyssey2.info/library/manuals/us_smithereens/Smithereens%20%28USA%29.pdf) | Opposing players charge and release throws simultaneously. Castle sections disappear; crew and launcher hits temporarily interrupt play, with protected returns. A war has ten battles and weighted scoring. Tension settings alter timing sensitivity. | Preserve charge timing, target priority, progressive demolition, short interruptions, and a ten-bout format. |
| [Stone Sling gameplay description](https://videopacgames.wordpress.com/videopac/20-stone-sling/) | The recognizable arrangement is opposing castles and launchers across water. | Preserve the composition and readable range relationship. |
| [Odyssey² source review](https://odyssey2.info/reviews/smithereens-43) | Changing targets and interruption opportunities provide the tactical interest. | Castle shapes must materially change target selection. |
| [Stone Sling archive record](https://www.odyssey2.info/db/game/stone-sling-112) | The regional title is associated with 1981; the US manual carries 1982. These differ from the brief's supplied year. | Preserve the brief's source label in required metadata; record the historical discrepancy without inventing a resolution. |

Stone Sling and Smithereens! are regional names for the source. No source campaign, elaborate enemy roster, independent aiming-angle system, or wind mechanic was established. The solo tour, special stones, structural collapse, and opponent personalities below are **original additions**. Use the source's short, boastful medieval-sport tone, writing original lines. Do not copy its manual, branding, dialogue, or art. Convey speech as synthesized gibberish paired with brief readable captions.

Verified engine baseline: **my-3D2dge 0.89.1**, revision `8ecc2f62353761187bdfe226f327b7ea5d2eb691`:

- [Handoff README](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/README.md), [API card](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API.md), and [artillery kit](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/kits/artillery.js).
- [Terrain module](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/modules/terrain.js) and [native asset guide](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/docs/ASSETS.md).

Verified Hub baseline: **protocol 1, client 1.4.0**, revision `35a1047f2067b2af3de3943f0fe452f39105d869`:

- [Integration contract](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md), [client](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/session.js), [shared-world example](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/examples/arena.html), and [official harness](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/harness.html).

These are references and verified starting points, not evidence that the new game has been tested. Keep research findings, design choices, and eventual test observations separate in your notes and reporting.

## 3. The finished player experience

The title screen shows an animated court and a brief instruction: hold, watch the tension, release. Offer Solo Tour, Quick Duel, Local Versus, Settings, and About/Credits. A saved solo tour adds Resume. Explain hosted online play in a short line without advertising a standalone room browser that does not exist.

**Solo Tour:** ten bouts across five courts, two bouts per court. Target roughly 12–18 minutes for an ordinary first run, including short ceremonies; tune through play. Losing a bout advances the tournament, so a newcomer still sees every mechanic and court. The final weighted total decides the championship. Save progress between bouts and provide a deliberate restart action. The tour contains the teaching, full rules, escalation, final rivalry, victory or defeat ceremony, credits access, and replay route.

**Quick Duel:** one court, selected AI difficulty, selected tension, and the complete weapon set. One battle is sufficient; offer rematch and court change after the result. This is a finished fast-play mode and a convenient way to practice specific targets.

**Local Versus:** two humans playing simultaneously on the same screen. Support two pads, pad plus keyboard/mouse, and two distinct keyboard bindings. Seat assignment is explicit, disconnect handling is legible, and a player cannot accidentally control both castles. Offer a single-bout duel or the same ten-bout war. No hot-seat turns.

**Hub Versus:** exactly two players in a shared authoritative world. Use a compact, self-contained match on one court, bounded at three minutes, with the same stones, destruction, recovery, and scoring rules. A castle destroyed early ends the match; otherwise a transparent timeout rule decides it. This short format is separate from tour progression but shares all combat code.

**Attract mode:** after exactly ten seconds without meaningful input on the standalone title/front-menu screens, play a looping demonstration using the real simulation. Any input exits and is consumed before restoring the title/menu focus. No attract mode runs during a live match, an in-game pause/dev screen, or an active Hub session.

## 4. Combat rules and initial tuning

These values are starting parameters, all centralized and tunable. Refine them against the complete player experience. Avoid scattering balancing constants through drawing or input code.

### Charge and launch

- A launcher occupies a fixed battle station and fires inward at a fixed authored elevation, initially around 50 degrees. Shot range comes from power. Use a consistent ballistic model; there is no default wind, angle-selection layer, or compulsory camera aiming.
- Hold Fire to build tension from zero to full; release to launch. The meter stops at full rather than silently wrapping. A maximum-power shot normally overshoots useful targets, so precision remains necessary. A release below the minimum charge cancels safely, with a clear feedback cue.
- Provide three tension speeds, initially about 1.4, 1.0, and 0.7 seconds to full charge. Tension changes timing sensitivity, not the maximum reachable range. Tutorial starts at the forgiving setting; higher settings are a player choice, not an unannounced control change halfway through the tour.
- Reload is automatic, initially about 0.9 seconds for the ordinary stone. A buffered press may begin the next charge when reloading completes; releasing before it can begin cancels the buffer. Never emit an unrequested shot after an input loss, pause, focus change, or scene transition.
- Show the current charge, a world-space range cue, and the last impact marker. A full predicted arc is an optional assist; the standard presentation shows an understandable landing/range hint without filling the sky with curves. Predictions use the same simulation as actual shots, including target height and weapon behavior.
- Choose launch speed, fixed elevation, and arena dimensions together. Every intended castle section, operator, and launcher must be reachable at every tension setting. A flat-ground range equation alone is insufficient for elevated battlements.

### Three stones, one control grammar

Use three visibly distinct, code-defined projectile types. All use hold/release, and all remain available once taught. There is no inventory screen or resource collection.

| Stone | Tactical role | Initial tradeoff |
| --- | --- | --- |
| Roundstone | Reliable precision; crew or launcher harassment; finishing a small remnant | Fastest reload, modest masonry damage, smallest hit area |
| Masonry stone | Break a reinforced block or support and bring down a connected section | Roughly twice ordinary masonry damage and a longer reload; visibly heavier launch and impact |
| Split stone | Cover a broad upper wall or several weakened pieces | Deterministically splits near its apex into three smaller stones; lower damage per fragment and longest reload |

Different launch-speed curves are allowed, but keep all required targets reachable and show a separate remembered range marker per stone type. Do not simulate weight by applying inconsistent gravity. Lock the selected type while charging; switching happens only when ready or after a safe cancel. There is no secondary detonation button. Ensure one split projectile cannot multiply crew disable duration through repeated fragment hits.

### Target priority and recovery

The castle is the battle objective. The launcher and crew are temporary tactical targets; hitting them does not directly win the battle. Give each target a clear silhouette, hit flash, unique sound, and status icon.

- Crew hit: a comic retreat for roughly 1.8 seconds, followed by a readable return. The launcher cannot begin a new charge during the absence.
- Launcher hit: a repair withdrawal/animation for roughly 2.6 seconds. It cannot charge or fire. Already airborne stones remain valid.
- On either interruption, cancel any pending charge and clear its input latch. Do not queue a shot for the returning unit.
- Returning targets receive about 1.25 seconds of protection after becoming usable. Make protection unmistakable. During protected return, additional hits neither award repeat points nor restart the disable timer.
- Overlapping crew/launcher interruptions use the latest applicable recovery endpoint rather than adding durations. Recovery cannot be extended indefinitely by debris or by one split shot.
- Reload, interruption, protection, and held-input behavior need explicit state transitions. A target may recover while a stone is in flight, but a single impact is resolved against one authoritative state.

An opponent's recovery is the chance to attack the castle or prepare another target. The feedback should make that opening apparent without a long explanatory panel.

### Destruction and scoring

Represent each castle as authored blocks with stable IDs, material, health, footprint, and support links. Use a small set of readable materials: timber, ordinary masonry, and reinforced masonry. Each hit damages actual blocks; the remaining silhouette and colliders change immediately. A painted crack alone is insufficient.

After removing a block, recompute which remaining objective blocks connect to an authored foundation through their support graph. Unsupported components are removed from authoritative collision/objective state and become falling visual debris. This gives satisfying structural collapse without making full rigid-body settling part of the win condition. Foundations and purely decorative trim are marked explicitly and excluded from the remaining-objective count. Use a support graph suitable for arches rather than assuming every block needs a neighbor directly beneath it.

Award one direct-hit score per struck target, using the source-inspired ratio **castle 3, crew 7, launcher 13**. Structural cascade damage helps win but awards no additional direct-hit points; fragment and area damage must not farm repeated score from the same target on the same throw. At the end of a tour/war bout, the winner banks that bout's direct-hit score multiplied by its one-based bout number; the loser banks zero. Show the calculation plainly. A drawn bout banks zero for both sides. Total the banked values over ten bouts. This intentional late-bout weighting should be clear in the tournament UI.

Destroy all objective blocks to win a battle. Resolve all impacts scheduled for the same simulation tick before adjudicating: mutual destruction in that tick is a draw. An ordinary bout has a visible 90-second ceiling. At the ceiling, compare remaining castle health as a percentage of that castle's authored maximum, then direct-hit score; equal values produce a draw. Hub uses its three-minute round deadline and the same comparison. Do not introduce an invisible tiebreaker or a late sudden-death system.

After an outcome, freeze new gameplay actions, let cosmetic debris settle, play the flag/fanfare ceremony, and present a readable result. Do not let an old projectile damage the next bout. Results and advancement occur exactly once.

## 5. Authored content and learning sequence

Build five genuinely different court compositions from reusable materials and rules. Layouts affect shot selection and target exposure; changing only the sky color does not make a new court. Keep both seats fair in versus. Solo personalities and asymmetry may vary within the same validated geometry rules.

| Court | Geometry and mood | First bout teaches | Second bout tests |
| --- | --- | --- | --- |
| Village exhibition | Broad, low masonry with timber turrets; bright afternoon; conspicuous water | Charge/release, undershoot/overshoot, ordinary stone, last-impact marker | Choosing between castle progress and a crew interruption |
| Quarry meet | A curtain wall with exposed support columns; dusty cream stone | Masonry stone and support collapse | Using a launcher interruption to place a deliberate support shot |
| High keep | Taller staggered towers with gaps and small surviving silhouettes | Split stone and its precision tradeoff | Switching stone types as the target changes |
| Lakeside night court | Offset battlements, exposed timber sections, reflections and torches | Reading an opponent who changes tactical target | Sustaining pressure through protection/recovery windows |
| Royal final | A spectacular, multi-section castle combining the previous structural patterns | All mechanics together against a deliberate rival | A decisive rematch with faster AI decisions and a different opening target |

All five courts use the same combat systems. Cosmetic water, flags, clouds, and spectators must not secretly affect collision. Do not add a new untelegraphed hazard in the final. Each layout needs several viable target paths and a finishable last fragment; there must be no block whose only solution is a hidden mechanic.

Teach through short in-world prompts and a forgiving opening opponent. The first lesson asks for an actual shot and an actual hit, rather than advancing because a timer expired. The player can skip teaching and replay it from Controls. Lessons must follow the player's current device and input bindings. A held teaching prompt cannot stop a hosted match.

The ten-bout tour advances even after defeat, preserving its complete demonstration. Give opponents a recognizable sporting persona through target preferences, launch rhythms, heraldry, physical reactions, and a handful of short captions. Use little text between bouts: one boast, one objective hint when new, then play. A completed tour offers replay, quick duel, and credits; a resumed tour restores only a validated between-bout save.

## 6. AI that plays the actual game

Use a common decision interface for solo opponents, attract players, and test bots. Ordinary AI submits the same legal charge/release and stone-selection commands as humans. It does not write damage, score, or target state directly.

Build a shot evaluator around the production projectile simulator. Search a discrete set of legal charge durations for each available stone; score predicted damage, support removals, interruption opportunity, current protection, and the opponent's next likely launch. Re-evaluate after a meaningful structural change. A launcher/crew predicted to be protected at impact should not be a high-value target.

Difficulty changes reaction delay, deliberate range error, breadth of target evaluation, and tactical preference. It does not give ordinary solo opponents extra health, impossible shots, or knowledge of a future player release. Early AI misses visibly, leaves learning space, and varies its aim. The final rival should exploit exposed supports and protection timing while remaining beatable with the same rules.

Choose initial personalities such as impatient harasser, careful mason, broad-wall destroyer, and adaptive finalist. Centralize their parameters in content data. Keep simulation RNG seeded and separate from decorative randomness so that AI behavior and replay evidence can be reproduced.

Attract mode may use stronger assistance or invulnerability, as the brief allows. Mark those options as attract-only; they must never leak into a new player's game or a scored Hub match.

## 7. Presentation and animation

Use the engine's **native 2D renderer, materials, props, UI, and animation system** as the base. The full engine already supports this game without an external 3D renderer. Read the asset card before making generic scenery. Spend custom asset work on the things that identify the game: three readable stone types, the catapult, its moving rig, crew costumes, sectional castles, banners, and surrender flags.

Create a strong palette relationship: warm sunlit stone and wood, cool shadows and water, two distinct heraldic teams, and a bright accent for current charge/protection. Team distinction needs patterns/shapes as well as color. Generic props may come from the native library. Keep original compositions and record any external asset provenance.

The catapult is a real animated object with resting, winding, held-tension, release, recoil, reload, damaged, repair, and recovery phases. Drive its arm, sling, cord, wheels, crew pose, and dust from simulation state. Use native `E.Humanoid` rigs and poses for the crew; add game-specific poses/moves for hauling the winch, flinching, retreating, carrying tools, returning, cheering, and planting the white flag. A generic prop with a periodic rotation is not sufficient animation.

Use layered parallax, water reflections/ripples, passing cloud shadows, tournament spectators, weathered material edges, dust, chips, trails, splashes, hit flashes, and localized lights where they strengthen the scene. The performance budget is not a design constraint. Do not spend the build on FPS targets, LOD systems, batching work, or performance dashboards. Maintain finite lifetimes and clean scene teardown for correctness.

Camera shake is short, adjustable, and presentation-only. A major collapse deserves a richer visual/sound beat, but gameplay does not pause through global hit-stop: both humans and the hosted authority continue at the same clock. At the verified engine baseline, `particles.explosion()` freezes the game unless passed `{ freeze: false }`, and `game.hitFx()` always calls `freeze()`. Explicitly disable explosion freezing and compose non-freezing impact effects, or extend the helper with a tested opt-out. Reduced-motion settings suppress shake, flashes, and excessive debris without changing hit timing.

Compose for TV first: show the lane and highest useful trajectory with safe margins for HUD and overscan. Preserve a clear aiming silhouette at the farthest useful distance. On narrower displays, fit the full lane and use the space above/below it for charge/status. Do not crop away the remote castle or leave touch users aiming at an unseen target. Inspect at actual phone size; add automatic framing or a small target inset if needed while preserving the side-on control grammar.

## 8. Audio entirely in code

Use the engine's synth and Web Audio for music, effects, and gibberish. Ship no recorded or generated audio files, remote audio URLs, sample banks, or embedded audio recordings. Code-defined oscillators, envelopes, filters, noise, and note/event data are appropriate.

- Music: a light medieval sporting march, quieter rhythmic court variations, a tense final variation, and short victory/defeat cadences. Default the **music setting to 0.10** before saved preferences; do not multiply the same attenuation at several buses or overwrite a player's stored choice on each scene.
- Effects: winch ticks and straining cord, charge thresholds, sling release, airborne whistle, distinct stone/wood/armor impacts, clustered rubble, water plop/splash, repair hammer, recovery cue, menu focus/confirm, and fanfare.
- Voices: short synthesized syllable/formant sequences for crew and announcer reactions. Pair important information with captions. Rate-limit commentary, vary the patterns, and avoid talking over every shot.

Use separate music, effects, and voice buses with working sliders and mute. Unlock audio from a real user gesture in standalone play; game readiness and Hub start cannot depend on an audio gesture. A suspended or unavailable audio context must leave the whole game playable. Stop and dispose scene voices/music appropriately on end, attract exit, restart, and teardown.

Nobody can listen on this machine. Render representative effects/music/voice through `OfflineAudioContext` or inspect an analyser for nonzero finite output, plausible envelopes, clipping, bus isolation, and the default music gain. Report acoustic quality as unconfirmed; a waveform check cannot establish that music sounds good.

## 9. Input and ten-foot UX

Use the same screens and game layout across pad, keyboard/mouse, and touch. Menus should be sparse, with large focus targets, high contrast, and one obvious primary action. Keep a visible focus ring and mouse hover focus synchronized through the native menu system. The player's last meaningful device controls prompts, not which devices happen to be connected.

| Action | Standard-mapped pad, PlayStation labels by default | Keyboard/mouse |
| --- | --- | --- |
| Charge / release | Hold / release Cross | Hold / release Space or left mouse button |
| Previous / next stone | L1 / R1 | Q / E or wheel over the battlefield |
| Cancel charge / back | Circle | Right mouse button or C in combat; Escape in menus |
| Menu navigation / confirm | D-pad or stick / Cross | Arrows or WASD / Enter; hover and click |
| Pause | Options | Escape |

Escape reliably opens pause. Opening pause cancels any active charge and clears held fire; resuming requires a fresh press. Circle, C, or right click cancels a charge without opening pause. Route these through the input adapter so a cancellation cannot also dismiss a menu or activate the next scene. In Hub, the local overlay cancels only that player's charge and leaves the shared world running.

Keyboard/mouse must feel native. Mouse position chooses an intended world target/range reference, and a hover highlights the target under it; holding and releasing fires by the same tension rule as a pad. Moving the mouse does not secretly change elevation or damage. A keyboard-only player can move the same reference with horizontal arrows while combat is active. The reference is guidance, not an automatic shot. Native button and wheel interaction handles menus and stone selection. The HUD explains the timing relationship in one short sentence.

Local keyboard player two uses a separate, rebindable fire key and stone keys, initially Right Shift and U/O. Separate keyboard and mouse ownership so mouse fire does not also fire for a pad-assigned seat. Ensure screen selection, join actions, and focus cannot trigger a combat launch. Test two held fire actions at once, including release in opposite orders.

Set the engine's glyph preference explicitly to PlayStation; its verified default is automatic and does not meet the brief by itself. Provide an Xbox A/B/X/Y option, retaining standard mapping internally. Prompt labels use the input abstraction/rebindings rather than handwritten strings spread across screens. Use stick dead zones and meaningful axis movement to avoid prompt flicker and false idle resets.

Touch gameplay needs only the menu affordance persistently visible. Hold a thumb anywhere in the friendly half/bottom firing region to wind; release to fire. Show a temporary tension halo at contact and context-sensitive previous/next-stone chips only when useful. Touch cancellation, menu activation, and multitouch must not produce duplicate releases. Use pointer capture, track pointer IDs, and cancel safely on `pointercancel`. A generous optional timing assist can widen a useful release window or slow charging; it must not apply hidden damage bonuses. No movement stick is necessary in this fixed-station game.

Settings include music/effects/voice, glyph family, controls/rebinding, charge tension, prediction assist, reduced motion, and comfortable TV UI scale. Persist them defensively. Pausing solo/local play freezes simulation but keeps menu navigation responsive. A pad disconnect cancels its charge and pauses local play; in Hub it shows a local recovery overlay while the shared match continues.

Review title, combat HUD, settings, results, and About at 1920×1080 from a ten-foot composition. Use screenshots for legibility and visual hierarchy; scripts can check focus order, hit rectangles, and state transitions.

## 10. Engine integration and code boundaries

Acquire only the handoff and Hub material needed for this project, inside your own development folder. Use GitHub/git CLIs for repository access. Read the engine API card, relevant guide sections, artillery kit, asset guide, and the current Hub contract before implementing adapters. Do not read unrelated runs or adjacent builders' work.

Begin with the **full native engine plus the artillery kit**, retaining the demonstrated shell, fixed-step behavior, input helpers, native effects/audio, and useful trajectory/CPU techniques. Replace its match rules with this game's rules. Audit inherited shortcuts and touch handlers: a generic kit camera toggle, turn counter, debug key, or rocket sound must not survive accidentally.

Suggested local organization:

```text
src/
  boot.js                    standalone/Hub entry and lifecycle
  config.js                  defaults, ranges, validation, version
  sim/
    world.js                 authoritative fixed-step state
    commands.js              validated player/AI intentions
    ballistics.js            predictor and live projectile integration
    castles.js               blocks, damage, support graph, collapse
    combat.js                charge, launch, reload, interruption, recovery
    match.js                 scoring, deadlines, bout/tour progression
    ai.js                    legal-command shot planner
  content/
    courts.js                five layouts and presentation definitions
    rivals.js                solo profiles and tournament sequence
    lessons.js               triggered teaching and captions
  view/
    battlefield.js           native rendering and camera
    catapult.js               custom animated machine
    crew.js                  native rigs and state-driven reactions
    effects.js               presentation events and lifetimes
  ui/
    screens.js               title/setup/results/About
    hud.js                   readable combat status and prompts
    developer.js             live tuning, scenarios, authoring helpers
  audio.js                   code-only synth patches, songs, routing
  input.js                   seats, device adapters, safe cancellation
  online.js                  Hub adapter and snapshot schema
  persistence.js             versioned settings/tour save
  metadata.js                one source for credits and interview content
vendor/
  engine/                    acquired handoff and recorded revision
  hub/                       unchanged client, docs and harness dependencies
tests/
scripts/
artifacts/                   generated verification evidence and build staging
```

Keep the structure useful rather than ceremonially creating an empty file for each row. JavaScript ES modules and a small Node-based bundler are sufficient; use another language/tool only when it materially helps. Pin actual dependencies, retain a lockfile, and expose build/verify scripts through the project manifest. The final game must not require Node, a build server, or the dev folder.

Simulation runs on the engine's fixed 1/120-second step and is independent of DOM, draw calls, audio, and a locally seated player. The view consumes state and presentation events. Menus, local players, AI, attract scripts, tests, and Hub clients all feed the same command layer. `draw()` never creates a collision shape, click target, AI decision, or gameplay timer.

Use stable IDs and serializable state. A useful snapshot includes tick, seed, mode/phase, court/bout, players, selected stones, charge/reload/recovery endpoints, active projectiles, changed castle blocks, direct/banked scores, deadlines, and outcome. Keep camera, particles, local menu focus, audio nodes, and decorative random values out of authoritative state.

Coordinate contract: normal engine world axes are x east, y south, z up. The terrain module's second coordinate is **height/up**; the artillery kit maps it to engine `(x, 0, terrainHeight)`. Establish one conversion boundary. Use swept collision along each projectile step against castle block shapes, crew/launcher targets, terrain, and water. Resolve the first valid contact by travel time with stable tie ordering. Do not rely on a fast stone overlapping a block at the end of a frame.

The terrain module supplies destructible masks and terrain collision; it does **not** supply this game's castle health, ownership, support graph, scoring, or repairs. Keep those as explicit game systems. Terrain carving may dress impact craters, but it cannot silently disconnect the objective model from what is drawn.

Extend the native standard menu, settings, controls, and focus-loss behavior rather than replacing all of them. `E.Menu` handles device focus; `E.Shell(..., { tv: true, ... })` is available for scalable screens over the pixel world. At the verified baseline, unlabeled overrides for existing music/glyph setting keys preserve their built-in behavior. Confirm the actual API before applying this pattern. Engine edits are authorized if a real limitation blocks the game; record the changed behavior and why, and verify the affected path.

## 11. Hub multiplayer contract

Multiplayer is required. Implement and test **standalone same-device versus** and **Hub-hosted online versus**. The supplied Hub client is inert outside Hub and contains no standalone matchmaking service. Do not label a static lobby or room-code form as online play. Additional standalone internet matchmaking is outside this planned scope; if your own brief explicitly demands it, resolve that requirement through a real supported transport rather than pretending the Hub client supplies it.

### Session lifecycle

1. Embed the released Hub client **verbatim**, as the first script in the final HTML head immediately after charset. Keep game code outside that script; the Hub recognizes and upgrades unmodified released clients on import.
2. Declare protocol `1`, `hub:session-players` as `2-2`, mode `shared-world`, a short goal/how-to, and the three-minute round declaration. Keep declaration and `AIHub.connect({ mode: 'shared-world', seats: [2, 2] })` consistent.
3. Check `AIHub.active` before starting standalone menus, attract mode, or saved-tour resume. Active sessions bypass all of them. A `null` connection result is the documented standalone fallback.
4. Register lifecycle handlers before signaling readiness. Build all required state/resources, then call `ready()` automatically, with no press-to-start dependency. Use the Hub's default round card.
5. Wait for the scheduled start and do not advance combat while `AIHub.time()` is negative. It reports milliseconds; convert once at the adapter boundary to the simulation's seconds/ticks. Start from the synchronized round time rather than whichever browser paints first.
6. The host owns physics, projectile creation, all damage/collapse, RNG, scores, timers, disconnections, and outcomes. Each client renders confirmed state and sends intentions. A separate `AIHub.server` host has **no local player**; world construction/update must work without camera, input, audio, or a host seat.
7. On natural completion or `time-up`, the host publishes the final reliable state and calls `finish({ standings, scores })` once. Standings are arrays of player IDs, best first, with tied IDs together. Respect the time-up grace interval.
8. On `end`, every copy stops all game input, game messages, and all audio, including menu input/sounds, until disposal. Handle player leave and host leave through the documented lifecycle. There is no invented host migration; the Hub voids host departure.

### Commands, snapshots, and fairness

Use only `AIHub.send` and message events for network traffic. No independent sockets, WebRTC, public brokers, chat, emotes, or custom player names. Display Hub-provided names as plain text. In-session code must not open browser dialogs, popups, new tabs, or navigate away.

Send sequence-numbered charge-begin, release/cancel, and stone-choice intentions reliably to the host. Identify the player from the event's authenticated `from` value, never from a claimed seat in a payload. Validate phase, ownership, monotonic sequence, selected stone, charge state, and plausible timestamps. Duplicate or stale messages must not cause a second launch or overwrite newer state.

Because charge timing is the main skill, design latency handling deliberately. Show local charge feedback immediately. A release may include the locally measured held duration; the host clamps it to the legal curve and reconciles it against the corresponding begin command, a bounded timing tolerance, and the authoritative cooldown/recovery interval. Never accept client-reported hit, damage, score, or arbitrary power outside those bounds. Remote latency must not change the duration of a local button hold into a completely different stone range. Document and test the chosen policy under asymmetric delays. Do not add a broad rollback system unless an observed failure requires it.

Use host snapshots at a modest rate, initially around 6–8 per second, plus reliable launch/impact/collapse/recovery/outcome events. Interpolate only presentation. Enforce the **aggregate** outgoing budget per copy: 20 messages/second, burst 40, maximum JSON message size 16 KB. Keep unreliable snapshots near or below 1,200 bytes by sending compact IDs/bitsets and changes; send reliable full baselines on start/resync, chunked and sequenced if necessary. Reserve room for split-shot impact bursts. Coalesce events produced in one tick rather than emitting a packet per fragment/block. Measure packet count and size in tests.

Every client acknowledges a received baseline reliably, including passive players who never fire, and may send low-rate last-applied-sequence acknowledgements for reconciliation. Include acknowledgements in the traffic budget. The official harness's generic input is arrows/WASD, so it will not exercise this game's Fire action; passive clients must still demonstrate valid traffic in both directions. Add game-specific firing tests separately rather than changing the controls to satisfy the harness.

Check the boolean returned by `AIHub.send()`: `false` means the message was not accepted, even if requested as reliable. Keep a bounded, ordered queue for critical commands/events, retry transient local rate-limit rejection, and deduplicate by sequence at the receiver. Reserve capacity for cancels and final state. Reject oversized/nonserializable payloads before sending rather than retrying them forever; clear queues on round end.

Apply only snapshots from the host, with monotonic tick/sequence handling and complete baseline versions. A missed unreliable delta must be repairable by a later baseline or confirmed reliable event; it cannot leave a wall permanently different across screens. Separate the simulation RNG from effects; shared-world mode does not seed global `Math.random` for you.

In-session local menus may overlay controls/settings but do not pause the authority. Use the engine's `live: true` behavior for hosted sessions, and verify that menu/focus-loss paths cannot stop authoritative updates; local solo/versus retains ordinary pause. Disable standalone restart, quit-to-title, tour load, and scored-world developer mutations. Ignore Options while Create is held as required by the Hub controller contract. Any network test mode is explicit and excluded from scored player controls.

## 12. Attract mode, saves, and developer tools

**Attract mode** is a distinct lifecycle state using a throwaway match. Demonstrate charging, each stone, structural collapse, crew/launcher interruption and recovery, at least two court moods, and a surrender ceremony in a roughly 75–100-second loop. Use authored AI goals when ordinary AI is unreliable for a showcase; it still operates through real combat commands. Reset the entire showcase state when looping. Avoid writing progress, records, settings, or tournament results. Restore the user's prior settings and title focus on exit.

Reset the idle timer on meaningful keyboard, mouse, touch, or pad input; ignore stick drift and synthetic replay actions. Test the ten-second threshold exactly. Consume the exit event and clear held inputs/pointers, particles, pending sound, and scheduled callbacks. Input used to leave attract must not launch a stone or select a menu item.

**Persistence** uses versioned, validated local storage under a game-specific namespace. Save settings and between-bout tour state only. Store seed, next bout, totals, progression, and relevant configuration; regenerate the next court from validated content. Corrupt/missing/old saves recover to a usable menu with defaults. Storage denial, private mode, or `file://` restrictions are nonfatal. A local-versus or Hub outcome never overwrites a solo tour.

**Developer mode** is reachable from pause with pad, keyboard, mouse, and touch. Provide paged tools rather than a dense web console:

- Restart current bout, choose court/bout/opponent, skip teaching, switch AI/human seats, restore castles, clear projectiles, and force a result for presentation inspection.
- Pause/step, simulation speed, invulnerability, show collision/support graph, show predicted shot, and inspect a compact state summary with seed/tick.
- Live sliders for charge time, launch speed/range, gravity, ordinary and special reloads, masonry damage/health scale, crew/launcher disable, recovery protection, AI error/reaction time, and assist strength. Show units, validated ranges, sensible stepping, and a working reset-to-defaults action.
- A lightweight court authoring page: select/move/add/remove blocks, choose material/foundation/support roles, validate target reachability and support connectivity, preview a collapse, and export/import a versioned court definition. Reuse normal menu/focus controls; pointer placement is convenient but not the only way to edit. The remainder of the game should be additional validated court/rival/tour data.

Define slider application rules. Reload/timing changes affect the next action; health scaling preserves an existing block's health fraction or applies on reset; gravity updates predictions and new projectiles consistently. Never turn a slider into NaN or a negative duration. Record that a local run used cheats so its results do not masquerade as clean records. In Hub, keep diagnostics readable but world-changing tools unavailable to players.

## 13. Build and verification strategy

Provide one command, **`npm run verify`**, for all meaningful automated verification. It exits nonzero on failure and prints only failure details plus a final one-line count such as `142 checks, 0 failures`. Count real assertions; do not inflate counts with frames or empty cases. Wrap verbose upstream tools rather than streaming their success chatter. Keep visual inspection separate from this command and capture images only for questions scripts cannot answer.

Run checks after changing the code they cover. Use a small coverage/dependency map or selected subcommands internally; avoid repeatedly rerunning an unchanged suite just to watch it pass. After final integration/bundling changes, run the affected end-to-end and artifact checks. Track distinct bugs found, severity, fix, and regression evidence so the exit interview contains observed numbers.

Use native Node headless execution for simulation and most complete-tour tests. `new E.Game()` works without a browser; `draw: true` additionally exercises rendering against stand-ins. `game.advance(seconds)` advances exact fixed steps; input helpers and seeded RNG support repeatable play. Scene fades normally last about .22 seconds, so advance through them or disable them explicitly in tests. Check `game.errors`. Use existing pinned Playwright 1.63.0 browsers for real input, DOM/UI, audio graph, file loading, and the Hub harness. Do not install browsers or host dependencies on this shared machine.

| Area | Required meaningful evidence |
| --- | --- |
| Ballistics | Prediction/live impact agreement; near/far/elevated target reachability; mirrored sides; fast projectile sweep; each stone and split event; water/terrain ordering; no NaN |
| Charge/input | Short/medium/full holds, legal cancel, buffered reload, mixed-device ownership, independent two-player holds/releases, focus loss/disconnect, pointer cancellation, no duplicate fire |
| Destruction | Actual block removal; correct support cascade; stable foundations; no score multiplication from cascade; last fragment finishable; same-tick mutual destruction; no invisible wall |
| Recovery | Crew and launcher states; protected return; overlapping hits; split-fragment deduplication; no indefinite lockout; no queued shot after interruption |
| Match/tour | Win, loss, draw, timeout tie ordering, exactly-once result; weighted banked totals; all ten bouts and five courts; save/resume; final ceremony and replay |
| AI | Legal commands; same reachable physics; bounded reaction/error; protected-target handling; every rival/court can complete without deadlock; no ordinary cheat leakage |
| Menus/dev | All screens pad reachable; hover focus; correct back behavior; current-device/glyph prompts; sliders apply/reset; authoring round-trip/invalid data; no Hub mutation route |
| Attract | No entry before ten seconds; entry at threshold; looping coverage; exit by each device; consumed exit input; no saved progress/settings pollution |
| Audio | Finite nonzero rendered output; music default 0.10; bus isolation/mute; no clipping in representative mix; muted/suspended-context startup; no audio-file dependencies |
| Persistence | Corrupt/version-mismatched/denied storage; separate tour versus local/Hub state; settings retained across court and attract transitions |
| Browser/artifact | Fresh standalone `file://` boot; no runtime/page errors or missing assets; title-to-play-to-result; controller stub; touch phone/tablet; final artifact boot separate from dev page |
| Hub | Two independent players; passive-client ACKs; no-local-player server; loss/jitter/reorder; rejected-send retry; host leave/player leave; time-up; valid standings; packet budget; consistent block state; no startup input required; all input/audio stopped after end |

Write a deterministic complete-tour driver that starts through the real entry path, teaches and changes stone types, plays all ten bouts, causes both temporary target interruptions and support collapses, reaches the championship result, and starts another run. Assert coverage events and progression, not only a terminal phase flag. It may use a skilled test bot or test-only fast clock; include at least one human-paced input sequence so an instantly perfect bot does not hide awkward controls. Also run two-human local scenarios and a real Hub match through command adapters. Test hooks expose observation and setup; gameplay assertions must not pass by setting the expected outcome directly.

Use the official Hub harness and its required sibling files over a loopback server on an **OS-selected** port. Confirm the served page is your built game before trusting results. Required cases include normal two-player, `latency=150&jitter=50&loss=5`, host departure, the two-player server-host scenario, and deadline/end handling. Require `document.body.dataset.complete === 'true'` and `window.__hubCheck.pass === true`. If using the repository's official checker, acquire its actual script dependencies; copying one script alone is insufficient. Check the embedded client is a released unchanged version.

Keep at most one or two browser instances open and close them. Use Chromium for the primary Canvas/headless path and WebKit for the closest available phone/tablet approximation; exercise fallback if a browser capability is absent. There is no physical controller, touch hardware, real iOS Safari, TV, listener, or remote second player here. Test with the documented stubs/profiles/pages and state those limits honestly. Firefox's environment has no WebGL; this native 2D design should not require it.

For visual review, choose a small set of deliberate captures: TV title/focus, charged combat shot, major collapse, protection/repair state, smallest useful target, phone combat, results, and credits. Inspect composition, contrast, native animation identity, team/readout clarity, and touch occlusion. A state assertion cannot establish these. Avoid repetitive screenshot sweeps or using screenshots to count health, scores, or messages that are directly observable.

## 14. Implementation order and review gates

Keep a requirement ledger mapping each brief/plan requirement to its implementation and observed acceptance evidence. Maintain a short decision log for departures justified by testing. Use the large context window to review interactions across these systems rather than treating each module as a separate game.

1. **Verify and scaffold.** Finish source/API research, choose the randomized title, acquire/pin the handoff and Hub client, create the development layout, build a runnable native-engine page, and establish the one-command verification runner. Record exact acquired versions and required final report fields. Gate: the page boots directly and the headless harness observes real state.
2. **Prove the shared combat contract.** Implement fixed-station simultaneous charge/release, one stone, a genuinely destructible castle, crew/launcher interruptions and protection, and deterministic outcomes. Build the headless authority and a minimal two-page Hub vertical path now, including server-host. Gate: all three play arrangements use the same combat rules, and no-local-player hosting works. Resolve lifecycle and command timing before layering content.
3. **Make one court compelling.** Complete native catapult/crew animation, clear HUD, impact feedback, structural collapse, three stone types, fair AI, basic teaching, audio routing, and proper result/retry. Play and refine target readability and reload/disable rhythm. Gate: one complete court is fun and comprehensible with pad, mouse, and touch; intended targets remain reachable.
4. **Complete the demo content.** Author all five courts and rivals, wire the ten-bout tour, weighted scoring, between-bout saves/resume, final ceremonies, Quick Duel, and Local Versus setup. Gate: a scripted full playthrough demonstrates every mechanic and ends normally, and a player can lose without losing access to the remaining demo.
5. **Finish the system surfaces.** Complete settings, prompt/glyph behavior, developer tuning and court authoring, attract showcase, reduced-motion/assist options, credits/reporting data, and all device/disconnect/focus paths. Finish Hub snapshots, traffic budgets, time-up/leave/end behavior, and latency tests. Gate: no required screen or mode is a stub or an untested claim.
6. **Director review and refinement.** Inspect a whole match and the whole tour as connected experiences. Adjust the pace of teaching, number of hits, interruption windows, AI variation, scene readability, ceremony duration, voice density, and touch/TV composition. Fix problems with evidence. Revisit implicated tests after changes, avoiding unrelated retesting.
7. **Package and close.** Build the single-file artifact, verify it independently via `file://` and the Hub harness, validate metadata/interview schemas and naming against your own brief, remove development dependencies from runtime paths, and record final honest feedback. Gate: the artifact stands alone, all required mechanics/features work, and there are no placeholders, TODO features, or fake network controls.

Parallel work can help. After the command/state contracts exist, isolate content/art work, UI/device work, and audio/verification work under clear ownership. Keep one integrator responsible for simulation and Hub authority. Give delegated workers the exact APIs and shared state definitions; require a runnable integration point and evidence, not prose claims. Use local worktrees only if helpful, and avoid concurrent edits to the same integration file. Review the complete game together before declaring it done.

## 15. Single-file delivery and reporting

Provide a deterministic build command that inlines the native engine, game bundle, styles, content, and required assets into one HTML artifact. The dependency-free native 2D engine makes a fully self-contained offline standalone build practical. Keep the Hub client as the separate first inline script with its exact released contents. Do not accidentally let the bundler wrap, rewrite, minify, or move that client. Detect unsafe embedded script terminators in other content; the engine's README specifically warns about `</script` appearing inside inlined JavaScript. Escape safely and verify the resulting document parses without altering the Hub client.

No runtime request may depend on a development module, neighboring file, local server, absolute workstation path, or untracked asset. External CDN dependencies are permitted by the brief, but none is necessary for this chosen 2D design; if added, pin and disclose them and handle their failure. Do not replace native art/audio with remote media. Test the exact output artifact, not only a development page with separate modules.

All generated development files, harness copies, browser evidence, dependency stores under project control, and build staging stay in your own folder. Publish only the requested artifacts to the location your own brief specifies. Do not use shared temporary storage or inspect neighboring builders. If a server is needed, bind only loopback on a port chosen by the OS, record its PID, and stop only that process. Never kill another process to reclaim a port. Do not launch Windows GUI programs or require sudo.

About/Credits and the final chat reply must contain **Source Information, Testing Feedback, Engine Feedback, and Prompt Feedback**. Maintain one metadata source to prevent contradictions between game, interview, and reply. Follow your own brief's exact date/model/environment fields and builder-interview schema; do not copy this planner run's identifiers. The plan attribution is `PLAN.md`. Usage is exactly **`added on import`**. Use **`unknown`** where a fact was not confirmed; do not estimate cost, time, tokens, unheard audio quality, or untested hardware behavior.

The builder interview must include every required source-information field, four testing answers, six engine answers, four prompt answers, and complete catalogue data in the prescribed object shape and order. Catalogue title, player count, controls, genre, source, description, and tags must match the delivered game. Distinguish local versus and Hub versus in the online description. Record actual tests, actual bugs found and severity, the most/least helpful tests, actual engine extensions, and prompt feedback. Validate the JSON by parsing it and checking required keys/types rather than treating a pretty-printed file as proof.

The build is complete when a fresh player can understand a shot, damage and finish a changing castle, exploit and survive recovery windows, use all stones, play the entire tour, rematch locally or through Hub, change settings, enter working developer tools, watch/exit attract, and reach accurate credits—all from the delivered artifact, with the required evidence and reporting finished.
