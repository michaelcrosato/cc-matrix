# Director’s plan

Build an original, colourful fixed-screen planetary-defense shooter for one or two players. Its central decision is where to cut a firing lane through your own bunkers, and when to spend recovered alien salvage rebuilding that protection. Six escalating formations culminate in a new flagship encounter. The result should feel like a complete arcade cartridge: immediately understandable, expressive in motion, satisfying to replay, and finished from boot through credits.

This plan is for gpt-6.1-sol ultracode with a 1.05M-token context window. Keep the full engine contracts, Hub protocol, authored content, implementation and test evidence available together. Use that capacity to resolve interactions between systems and finish the whole experience. Do not substitute a generic shooter template or a menu-heavy feature checklist for the game described here. There is no prescribed time limit, token-spending target, or performance-optimization phase.

The builder owns the game’s title. Silently brainstorm 50 playful riffs on the source name, select one with an actual random-number generator, and use it consistently. Do not treat any mechanic labels below as proposed titles. Follow your own CEO brief for the development folder, final HTML filename and reporting destinations; none are supplied here. Every implementation path below is relative to your development folder. The CEO brief remains authoritative where it supplies additional requirements.

## 1. Research foundation and creative boundaries

The working interpretation of the source is Bally’s **1979 Astrocade Space Invaders, subsequently called Astro Battle**, rather than Sidam’s similarly named arcade game. The combined source wording supports this interpretation; record it as an interpretation, not a newly established release-history fact. The renamed manual bears a 1981 copyright.

The [archived manual](https://ballyalley.com/cart_manuals/html_manuals/astro_battle.htm) establishes horizontal base movement, upward missiles, four difficulty settings, bunkers eroded by either side’s shots, accelerating survivors, lower subsequent formations, and a nonattacking bonus parent ship. It awards row values of 10/20/30/40, parent-ship bonuses of 100/200/300, three initial bases and one extra at 1,000 points. Crucially, clearing six formations ends the game. These are source facts; our co-op, repair system, specialised enemies and finale are new design choices.

Before implementation, inspect the [manual scan](https://ballyalley.com/cart_manuals/pdf_manuals/Astro_Battle.pdf) and representative play linked by the [cartridge-video archive](https://ballyalley.com/astrocade_videos/cartridge_videos/cartridge_videos.html). Study silhouettes, screen composition, movement cadence and sound events, not just a written synopsis. The [contemporary comparison article](https://ballyalley.com/articles_and_news/Video_Games_October_1982.pdf) is additional look-and-sound evidence. Record what you actually examined; if playback or a detail cannot be verified, say unknown. Do not import the unrelated Astro Fighter’s fuel/docking loop, generic Galaga dives, exact column counts, or invented lore as source history. No ROMs or extracted commercial assets are needed.

The emotional spine is shrinking safety beneath a marching, increasingly impatient sky. Preserve left/right movement, upward fire, readable formations, destructive cover, tempting bonus saucers and a short finite campaign. New systems should deepen that spatial problem. Keep writing to terse planet-defense alerts, playful alien chatter and decisive arcade messages.

## 2. Player promise and complete content

Use a fixed overhead playfield with the cannon at the bottom and enemies above. In this engine, overhead means screen-aligned x/y gameplay; it does not mean free movement or a roaming camera. Aim for an approximately 8–12 minute first successful standard run, tuned through play rather than padded with transitions. A skilled replay can be shorter.

The whole campaign uses two actions: **fire** and **repair**. Move horizontally to line up shots, dodge falling threats, catch salvage and choose a bunker to restore. Every new enemy and the finale must use those same verbs. Include four difficulty presets using the same complete content; the standard preset must reveal every mechanic without requiring a second run.

Required playable offering:

- Standalone solo and simultaneous local two-player co-op, including two pads or keyboard/mouse plus a pad.
- Online one- or two-seat shared-world co-op when launched by AI Hub.
- Six authored formations, one original flagship finale, complete victory and defeat flows, and immediate replay.
- A contextual first-wave introduction, accessible controls/settings, pause-menu dev tools, looping attract play, local scores, and complete About/Credits and feedback pages.

Standalone multiplayer means local co-op; the Hub supplies online sessions. Its library does not create standalone remote rooms. Make these distinctions clear in the menu and catalogue. Do not add an external matchmaking service.

### Combat rules

Use one fixed combat rectangle on every display; 480×270 logical units is a useful starting layout. Author the final bounds after testing silhouettes and TV readability. Extra display area may contain scenery or cabinet framing, never extra playable width. Landscape and portrait devices see the same threats and timing.

- A cannon fires vertically, with hold-to-repeat, a short recovery and at most two of its missiles alive at once. This shot limit is our design, not a historical claim. Make readiness visible through barrel light and sound rather than an ammo panel. No weapon inventory or upgrade tree.
- Enemies march as a formation, reverse at the living formation’s horizontal bounds, descend after reversal, and accelerate as survivors diminish. Use surviving bounds, not the initial rectangle, so the final attacker behaves properly. The breach line is explicit; an invader crossing it defeats the team.
- Enemy fire originates from eligible exposed attackers, with authored telegraphs and bounded volleys. Difficulty comes from narrowing choices and accelerating rhythms. Never require an unavoidable hit immediately after a transition or respawn.
- Model four bunkers as cell masks with a recognisable intact silhouette. Enemy bombs crater from above; friendly missiles cut upward tunnels. Collision and drawing use the same mask. Repair can rebuild a completely demolished bunker inside its original footprint.
- Every fourth standard enemy kill drops one salvage pickup; its owner is whoever catches it, and it expires visibly if missed. Pickups pass through bunker masks and are visually distinct from damaging projectiles. Each player can hold three repair charges. Bonus saucers provide a predictable extra salvage opportunity. This ensures repairs are available without depending on lucky drops.
- Repair spends one charge and restores a bounded cluster of missing cells in the bunker nearest the player’s x-position. Preview the target with a subtle outline when usable. Use stable tie-breaking. Restore protection around the firing corridor first; preserve a narrow vertical aperture at each active cannon’s x-position beneath that bunker so repair does not instantly plug a teammate’s barrel line. Bunker destruction can still force the player to cut a fresh lane elsewhere. At full health or without a valid target, give feedback and spend nothing.
- Damage to ships is one-hit, with an unmistakable destruction and a protected respawn. Solo begins with three total deployments; two-player co-op with six, including the initially active ships. Remaining deployments form a shared reserve. The team earns one additional deployment at 1,000 points, once per run. Respawn consumes a reserve exactly once; do not declare defeat while a valid respawn is pending.
- Teammates overlap without blocking or damaging each other. Friendly missiles still damage cover. A player with no remaining deployment spectates until a newly earned reserve can restore them or the run ends. Keep seat ownership and contribution scores stable through reconnects that the relevant platform supports.
- Preserve row-based base scoring and the bonus-saucer score family. Show team score prominently and individual contributions on results. Avoid a combo system that competes with survival and repair. Local records distinguish difficulty, solo/co-op and assisted/dev runs.

Start tuning with roughly a one-second respawn delay and two seconds of protection, clear projectile silhouettes, and an attack cadence that lets a novice recognise a safe lane. These are starting values, not immutable balance. Expose meaningful variables and tune the complete six-wave run, not just the opening minute.

### Six formations and finale

Use a four-row/eight-column opening formation as our authored layout. Later formations may contain gaps and specialists, but remain recognisably marching troops. Present six formations as three connected defense locations, two formations per location. Changing colour, silhouettes and foreground framing should communicate travel without interrupting play for a long story sequence.

| Formation | Teaching and pressure | Authored content |
| --- | --- | --- |
| 1 | Learn movement, fire, erosion and repair in the first minute. | Ordinary one-hit marchers; generous safe lanes; guaranteed early salvage; a brief prompt disappears after the action succeeds. |
| 2 | Choose between a profitable saucer lane and safe cover. | First guaranteed bonus-saucer pass; faster survivors; alternating exposed firing columns. |
| 3 | Read enemy identity and shot timing. | Add armoured attackers: first hit visibly breaks the shell, second destroys them. Introduce slowly and keep ordinary targets mixed in. |
| 4 | Repair before an attack, rather than only after damage. | Add bombardiers whose broad, telegraphed bombs remove more bunker cells. Do not also introduce a new control. |
| 5 | Prioritise armour, bombardiers and bonus opportunities under pressure. | Combine existing types, offset gaps and lower starting rows; alternate focused barrages with genuine recovery windows. |
| 6 | Demonstrate mastery of the complete marching game. | A deliberately composed final formation; fastest survivor rhythm, scarce intact cover, generous enough salvage to make good repair decisions matter. |

Carry bunker damage through a location’s pair of formations. Between locations, show a short visible restoration to a defined partial baseline, keep any stronger surviving cover, clear spent projectiles, and provide a quiet repair window. Do not silently reset the battlefield after every wave or allow damage to accumulate into an inevitable later failure.

After the sixth formation, an **original hostile flagship** arrives. Keep it visually and mechanically separate from the source’s nonattacking bonus parent ships. Give it two readable phases built from existing rules: break two armoured emitters while dodging alternating bunker-cratering volleys, then attack its exposed core while moving between telegraphed safe lanes. Give damage windows a clear opening/closing animation. Include salvage opportunities during the encounter so a player who arrives empty can use repairs. No new late-game button, damage immunity without visual explanation, or new control tutorial.

Victory shows the defended planet, a short celebratory sequence, team outcome and contribution breakdown. Defeat identifies breach or depleted deployments, then offers replay and a route to settings in standalone play. Both results are fully controllable. AI Hub handles its own next-round navigation.

## 3. Art, animation and procedural sound

Base the presentation on the engine’s native crisp, shaded retro-modern pixel style. Verified handoff guidance targets expressive PS1/N64-era 2D with hue-shifted ramps, depth and procedural lighting. Use that foundation rather than replacing the engine with a separate rendering stack.

Create original pixel silhouettes for the cannon pair, four row identities, armoured shells, bombardier, bonus saucer, flagship, bunkers, salvage and destruction stages. Alien identities should be slightly comic and distinct in silhouette as well as colour. Use the generic library for appropriate peripheral props; do not use unrelated generic characters as the enemy roster. Author foreground bunker masonry, the defense apron, a distant threatened planet and three coherent location palettes. Effects enrich the scene without hiding missiles, telegraphs or the breach line.

Use native `E.sprite`, `E.tones`/`E.ramp`, `E.anim`, engine clocks and tweens. March poses should coincide with movement and sound beats; cannons recoil, armour peels visibly, bunkers spray cell-coloured debris, repair grows in visible clusters, saucers wobble, and the flagship telegraphs each emitter. Every damaging entity has an entry, attack, hit and destruction state where relevant. Avoid animation-driven collision ambiguity. Respect reduced-motion and reduced-flash settings; use restrained shake for major events. Engine explosion helpers add freeze/shake by default, so suppress those defaults for routine multikills and apply deliberate major-hit effects separately.

All audio is synthesized in code at runtime; no audio files, including encoded samples. Use Web Audio oscillators, generated noise, envelopes and filters through the engine’s music/SFX/voice buses. Build a march-linked bass pulse, sparse melodic layers per location, an escalating finale and short result stingers. Distinguish friendly shots, enemy volleys, armour hits, cell erosion, repair, pickup, loss and saucer approach without saturating every moment. Occasional alien or command barks are generated gibberish, with short subtitles carrying any necessary meaning. Music defaults to **10%**, including after reset; individual mute/volume controls persist when storage is available. Unlock browser audio on a real gesture; a silent pre-gesture attract sequence is valid.

## 4. Controller-first interaction and screens

Use the same screen structure and hierarchy for controller, mouse/keyboard and touch. Design important text and targets to read at 1920×1080 from ten feet: large type, generous spacing, a safe margin around the edges, and one obvious focus target. Inspect the actual result rather than accepting a nominal font size.

| Action | Standard pad, PlayStation labels by default | Keyboard/mouse |
| --- | --- | --- |
| Move | Left stick or D-pad left/right | A/D or Left/Right; moving the pointer inside the field sets a horizontal movement target |
| Fire | R2 or Cross, hold to repeat | Space or left mouse, hold to repeat |
| Repair | L1 or Square | Q or right mouse |
| Pause/local overlay | Options | Escape |
| Menu confirm/back | Cross/Circle | Enter/Escape; click targets |

Pointer movement translates into ordinary bounded cannon motion, not teleportation. Clicking menus never shoots through them. Keyboard movement cancels a pointer target until the pointer moves again. The right mouse button is useful for repair, so suppress the context menu over the game. Preserve conventional browser behaviour outside it.

Track the last meaningful input per local seat, with a stable primary device for front-end prompts. Do not switch glyphs because of stick drift, repeated polling, passive pointer position or synthetic game events. Settings allow Xbox A/B/X/Y labels. Menus support directional focus, predictable repeat, pointer hover moving focus, clickable actions and sliders, Back, and visible disabled reasons. Implement focus and hit targets during update so headless interaction does not depend on a preceding draw.

Required screens: title, local solo/co-op selection and difficulty, brief controls, settings, pause, developer tools, results, local records and paged About/Credits. Keep each screen short; split credits and feedback across readable pages. Seed meaningful focus when entering, restore it on Back, and handle controller removal without trapping the player. Lock local player roster when a run begins; returning devices reclaim their seat rather than creating another ship.

Touch uses an invisible, relative horizontal thumb control in the lower play area, assisted auto-fire, and a menu button. Permit simultaneous movement and a temporary context-sensitive repair button when a charge and damaged target are available. Auto-fire should take clear upward shots; an intentional second contact can fire through cover to cut a lane. Make that gesture discoverable in the short touch controls page. Pointer capture, cancellation, rotated layouts and browser gesture suppression over the field need explicit handling. No permanent virtual controller covering the action. Test phone and tablet profiles; these are emulations, not claims about real iOS hardware.

Settings include audio buses, glyph family, reduced shake/flash, touch assistance, and reset. Persist preferences and local records with a versioned schema; if storage is blocked or malformed, keep playing with safe in-memory defaults. Full-screen and other gesture-gated browser actions must fail gracefully.

## 5. Attract play and developer tools

After **10 seconds** without input on the standalone title/front-end menus, enter a clearly labelled, looping AI-played demonstration. Cycle through an opening exchange, damaged-cover repair, a saucer opportunity, specialised enemies and the flagship so the loop sells the full demo. Attract may grant itself resources or jump between scenes. It uses separate state and random streams, never modifies records or the next real run, and restores a clean title state when interrupted.

Any actual keyboard, pointer, touch or controller activity exits attract; account for stick/trigger motion as well as button presses. Consume the wake event so it cannot also start a game, fire or activate an unrelated menu item. Browser noise and stick drift should not keep attract from starting. Reset its idle timer on return. Disable this entire front-end loop inside an active Hub session. Attract cheating must never be confused with a tested ordinary-rules campaign completion.

Developer mode is reachable from pause. Provide invulnerability, deployment/resource controls, wave and flagship-phase selection, restart encounter, deterministic seed entry, spawn a selected enemy/saucer, collision/telegraph overlays, a readable state summary, and step/time controls where the current execution mode permits them. Expose live sliders for player speed, shot recovery, enemy march/descent, fire interval, projectile speeds, salvage cadence, repair yield and flagship health. Show current numeric values, sensible bounds, descriptions and a reset-to-defaults action using the same data as normal difficulty presets.

Use `game.settings.define` and its set/reset facilities for live settings where suitable. A slider’s effect must be observable immediately or explicitly marked as applying on the next spawn. Mark modified runs as assisted and exclude them from normal records. On restart and mode changes, explicitly restore time scale, invulnerability, overlays and state ownership. In Hub sessions, dev tools remain reachable but world-mutating controls are disabled with a clear reason; local diagnostics and accessibility settings remain usable. Never let a client edit the authoritative world or pause other players.

## 6. Engine baseline and implementation shape

Research verified **my-3D2dge handoff v0.89.1**, repository commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Read the [handoff README](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/README.md), [API](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API.md), [style guide](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/AI_GUIDE.md) and [arcade kit](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/kits/arcade.js) before building. Pin the version actually used and record intentional changes. If using a newer revision, reverify these contracts first.

Use the full `my-3d2dge.js`, not simultaneous copies of its included modules. Start from the arcade kit’s lifecycle scaffolding, but replace its Galaga-like movement with this game’s marching formation. Use `view:'overhead'`, a fixed combat rectangle, `camera:{zoom:false}` and peripheral expansion only where it preserves that rectangle. Reuse native sprites, animation, renderer, settings and audio. `E.Bullets` may handle projectile storage/drawing, but its hit helpers use endpoint overlap, not swept collision. Implement one swept first-hit resolver for bunker cells, ships, enemies and flagship; do not also apply the helper’s hit damage afterward.

**Do not use `E.Arcade.start(2)` as simultaneous co-op.** The arcade helper’s two-player model alternates turns. Use `game.allowJoin({max:2,...})`/player inputs for the local lobby and implement the shared battle state ourselves. Reuse arcade scoring/cards/attract helpers only where their lifecycle matches the design; its default attract delay is 20 seconds and must be changed.

Suggested internal organisation, adjustable if the implementation stays coherent:

| Relative path | Responsibility |
| --- | --- |
| `vendor/engine/` | Pinned handoff, necessary documentation, licenses and an explicit engine patch record. |
| `vendor/hub/` | Pristine session client and the matching protocol/test assets. |
| `src/sim/` | Seeded world state, commands, formation, collision, erosion, salvage, life accounting, flagship and progression. |
| `src/content/` | Validated enemy definitions, six-wave/location data, flagship phases, difficulty defaults and balance bounds. |
| `src/view/` | Native pixel assets/animation, draw-only presentation and cosmetic effects. |
| `src/ui/` | Input action routing, focus, front-end/session overlays, glyphs, dev tools and reports. |
| `src/audio/` | Procedural instruments, event sounds and music scheduling. |
| `src/session/` | Standalone authority and the actual AI Hub adapter. |
| `tools/` | Reproducible build/export and one quiet verification entry point. |
| `tests/` | Simulation, browser, input, audio and Hub scenarios. |
| `evidence/` | Research provenance, distinct issue log, test summaries and selected visual evidence. |

Maintain a compact requirements/acceptance checklist rather than another speculative design document. Do not split trivial code solely to match this table. A clear modular source can still export to one HTML.

The engine updates at 1/120 second and supports `game.advance(seconds)` headlessly. Keep gameplay in an explicit fixed-step simulation with a serializable state: tick, seed/PRNG state, encounter and epoch, formation, entity IDs, ships/deployments, projectiles, bunker masks, pickups, scores and flags. Use a small explicit stateful PRNG or seed plus tracked draw count; native `E.rng` is an opaque closure, not an object with a state accessor. Separate UI, audio nodes, engine objects and cosmetic randomness from that state. Centralise ordering: input, movement, firing, swept collisions, damage/deaths, drops/repairs, progression, then presentation events. Never let draw mutate the world. Use stable collision ordering so a shot cannot both destroy a bunker cell and hit an enemy behind it in the same tick.

Create small adapters around verified APIs, not a replacement general-purpose engine. Rendering consumes snapshots and deduplicated presentation events. Standalone drives simulation from engine fixed updates; Hub authority derives its target tick from the shared Hub clock. Avoid stepping twice through both paths. Seed simulation and visual randomness separately. Save/reset must cover every run-owned field. Engine fades and timer clearing are real lifecycle effects: tests must advance transitions, and code must deliberately reset persistent time scale.

Content definitions should contain arrangement, starting height, type distribution, fire schedule, saucer opportunity, salvage rules, backdrop and transition policy. A designer must be able to add a formation or tune a difficulty without editing collision or session code. Validate definitions and give actionable errors. A custom editor is unnecessary; structured content plus the dev preview tools satisfies this need.

## 7. AI Hub integration: an architectural requirement

Research verified **Session Protocol v1, client 1.4.0** at commit `35a1047f2067b2af3de3943f0fe452f39105d869`. Read the actual [protocol README](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md), [client](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/session.js) and [shared-world example](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/examples/arena.html). Do not invent a generic room/socket API or defer networking until after the game’s state architecture is fixed.

The final document includes the required `hub:session=1`, `hub:session-mode=shared-world`, `hub:session-players=1-2`, goal and how-to metadata, and an honest round-duration hint. Paste the matching `session.js` unmodified as the **first script immediately after `<meta charset>`**, preserving its banner and keeping it outside bundler transformations. Then load the inlined engine and game. Verify placement and client integrity in the exported artifact.

Call `await AIHub.connect({mode:'shared-world',seats:[1,2]})`. A null result selects ordinary standalone flow. A real session bypasses title, attract, local lobby and press-to-start gates. Build state and register handlers, then call `AIHub.ready()` once without waiting for user input or audio unlock. Use the Hub’s supplied start card. Its start event precedes play; begin gameplay only when `AIHub.time() >= 0`.

Only the host simulates. Guests send bounded action packets and render authoritative state. The host processes its own player input locally because Hub messages do not self-deliver. Each participant controls exactly one roster seat regardless of browser gamepad index; bypass local join handling inside Hub sessions. Derive sender identity from the message callback’s `from` argument, never a packet-supplied player ID. The host must also support `server:true` with no local player: no assumption that a host ship, player input, camera target or audio context exists, and no local input sampling. Use roster IDs and validated seat ownership as network identities.

For this modest shared world, use complete compact snapshots rather than a fragile dependency chain of deltas. Send formation origin/direction and alive/type data, compact bunker masks, active projectiles/pickups, ship state, scores, tick and encounter epoch. Start around 10 Hz state publication and 10 Hz input heartbeats with held actions, repair-edge sequence numbers and acknowledgments; verify actual packet sizes and responsiveness. Consume repeated repair edges once, discard stale packets, bound finite values and reject sender/seat mismatches. Neutralize input after a short stale-input timeout, then recover automatically from a subsequent heartbeat.

The library permits 16 KB per message and 20 sends/second per copy, with burst 40. Unreliable packets around 1,200 bytes or larger fragment, so prefer compact snapshots under that size and reserve capacity for reliable lifecycle events. If the complete designed state exceeds that target, choose a documented reliable/full-state strategy within the verified limits and test it under loss; never truncate the world to fit. These are protocol constraints, not a reason to introduce the performance targets excluded by the brief. Interpolate remote visuals, acknowledge local movement for reconciliation, and never predict authoritative kills, repairs or score awards.

Capture `AIHub.rng('world')` once; repeatedly asking for that named generator restarts it. This returns an opaque closure without readable state, so derive one seed from it for the game-owned stateful simulation PRNG and serialize that generator’s state. Synchronize meaningful clocks to Hub time. The engine can discard slow browser frame time, so shared-world progression must not assume rendered frames equal elapsed session time. Keep networking alive while local overlays are open and when there is no local player.

Hub Options/settings is a local overlay: neutralize that seat’s controls while shared simulation and the Hub clock continue. Suppress native global pause/focus-loss behaviour that would freeze a host. Ignore Options while Create is held, since that chord belongs to the Hub. Disable restart, title, quit navigation and world-changing dev actions for a live session. Use no external sockets, brokers, chat, voice, emotes, custom naming, dialogs or navigation in the session.

Handle nonhost departure by clearing that seat’s pending input and ship, continuing with the surviving player, and adjusting only future attack scheduling; do not award reserve lives or points for leaving. A host departure voids the round; there is no host migration. On victory/defeat, the host publishes a reliable terminal snapshot, then calls `AIHub.finish({standings:[activeIds],scores,won})` once; group active co-op teammates as a tie and key scores by roster ID. On `time-up`, finish within the supplied grace period, even mid-encounter; expiry is a team loss unless victory already occurred. Align the recommended round length with the full campaign and label a time-expired result clearly. On every `end` reason, stop input transmission, simulation, networking and audio immediately. Display names as text, never interpreted markup.

## 8. Build sequence and review gates

Complete each gate before widening content. These are integration checkpoints, not permission requests or stopping points. Independent source research, asset authoring and test design may run in parallel with clear ownership; keep changes inside this project, integrate frequently, and never leave a subsystem as a promised future addition.

1. **Verify dependencies and boot.** Read/pin the actual engine and Hub contracts; select the title using the required process. Produce a reproducible one-file export with native engine rendering, title focus, gesture-safe audio and inactive-Hub standalone detection. Smoke-test the exported document from `file://`.
2. **Prove the core fight.** Build one fully playable formation with correct march/descent, cannon, swept collisions, mask-based erosion, salvage, repair, deployments, score and genuine win/loss. Give it representative native art and sound so feel can be judged early. Prove an ordinary-rules scripted clear and a deliberate loss.
3. **Prove shared authority.** Add simultaneous local play and Hub host/guest/server operation using the same world state. Exercise lossy two-page input, remote repairs, death and terminal results now. A networking problem at this gate must be solved before authoring the rest of the campaign.
4. **Complete all playable content.** Author the six formations, three locations and flagship; balance solo/co-op and four difficulties. Every content entry is reachable through both normal progression and dev tools. Play the complete standard run without debug assistance.
5. **Finish the product shell.** Complete device-sensitive prompts, native mouse interaction, touch assistance, pause/settings/dev flow, records, results, attract, full About/Credits and feedback. Fill out transitions and animation/audio for every gameplay state. Test session restrictions alongside standalone menus.
6. **Verify and ship.** Resolve gameplay, integration and presentation failures; finalize source and feedback data; export the complete artifact and validate that exact artifact. Stop only after the acceptance evidence supports the finished demo.

## 9. Verification that earns the completion claim

Provide **one command**, for example `node tools/test.mjs`, that orchestrates the project’s checks, prints only failures and a one-line count, and exits nonzero on failure. Use the engine’s headless tools first; browser automation covers actual browser/input/audio/session integration. Capture detailed diagnostics in `evidence/` without flooding normal output. Rerun checks only after changing covered code or final export inputs, not repeatedly for reassurance. This is correctness and usability verification, with no FPS target, benchmark or optimization checklist.

Use the engine’s [headless example](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/game/test.mjs), `game.advance`, debug snapshots, synthetic input and `game.errors`. Run draw code through the supported headless stand-in too. Add a small explicit test interface to inspect state and submit ordinary commands; dev cheats must not masquerade as normal input. Browser tests wait for state conditions rather than equating wall-clock sleeps to simulation time.

Cover these meaningful behaviours:

- Seed reproducibility; the last surviving invader’s bounds and acceleration; reversals/descent; breach and collision ordering; missile caps; armour and flagship vulnerability windows.
- Friendly/enemy bunker erosion, shots through holes, repair preview/target/cost, full-footprint rebuilding, and no resource use when nothing can be restored.
- Deterministic salvage availability, pickup capacity, deployment accounting, simultaneous deaths, protected respawns, the one-time score extra, exhausted teammate behaviour, stage transitions and cleanup.
- A complete input-driven solo campaign through all six formations and both flagship phases with normal damage/resources; a complete normal co-op run; losses to both causes. Use an adequately capable bot with observations and ordinary actions, then test repair/saucer/specialist mechanics explicitly if the bot can skip them. No instant kills, invulnerability, hidden difficulty reductions or wave jumps in these completion tests.
- Start/pause/settings/dev/reset/replay/focus flows, device/glyph switching, held-button debouncing, gamepad unplug/reclaim, mouse hover/click/aim behaviour, touch movement/fire/repair and cancellation. Use a standard-mapping gamepad stub, not a claimed physical controller.
- Attract idle threshold, all wake-input families, consumed wake actions, a repeatable loop, clean next-run state and no persistent score writes.
- Browser audio unlock; finite generated samples; expected nonzero signal; muted-bus silence; sensible gain bounds; music’s initial/reset setting at 0.10; no runaway voices. Use `OfflineAudioContext` or an analyser. Signal tests do not prove that a human liked the mix.
- Safe handling of unavailable storage, malformed saved data, resizing/orientation, and exported-artifact startup without the development directory.

For Hub integration, vendor the matching [harness](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/harness.html), `bridge.js` and `round.js` together. Serve them and the final packaged game from one local origin. Test supported one-seat and two-seat sessions; use two pages with `latency=150&jitter=50&loss=5&auto=1`, then exercise `scenario=host-leave` and `scenario=server`. Await `body[data-complete="true"]`, require `window.__hubCheck.pass === true`, and fail on page errors or Hub protocol/rate/size warnings. Cover no-gesture readiness, countdown, idle bidirectional heartbeats, stale/out-of-order input, local overlays, time-up, valid results and clean end. Add semantic world-state agreement checks; passing transport checks alone does not demonstrate that remote repairs and deaths agree. The repository’s Node checker imports other helpers, so do not assume copying that one file creates a working test tool.

Use the installed Python Playwright 1.63.0 environment described in the CEO brief, or Node Playwright pinned to 1.63.0 if needed. Do not reinstall browsers. Native rendering is Canvas2D; WebGPU lighting is optional and WebGL is not required. Use Chromium for full integration checks and Firefox/WebKit for startup, input and layout smoke checks. Keep one or two browser instances open, close them afterward, and use separate pages/contexts for multiplayer.

Take screenshots only for questions assertions cannot answer: combat hierarchy and silhouettes, TV text/focus, portrait touch occlusion, critical telegraph readability, flagship phase distinction and About pagination. Use short native filmstrips when animation timing needs visual inspection. Inspect those images and fix the issues they reveal. A screenshot alone is not a playable-path test. Real controller feel, human listening, real TV distance and physical iOS behaviour remain unverified on this machine and must be reported accordingly.

Track distinct issues found and fixed, with severity and the test that caught them. Count unique problems rather than repeated failing assertions. This supplies honest answers to the required testing feedback; use unknown rather than retroactively inventing a count or observation.

## 10. Export, provenance and final acceptance

Bundle modular development sources into the **single final HTML specified by the builder’s CEO brief**. Prefer an entirely self-contained artifact: inlined full engine, game, pixel assets and synthesized audio, with the pristine Hub client first. No source fetches, audio files or local-module imports at runtime. If a CDN is intentionally used, pin its version and disclose the network dependency. Retain required license notices. Escape literal closing-script sequences in generated inline code, including comments; preserve the upstream Hub client intact and verify its embedding separately.

Test the actual exported HTML from `file://` after isolating it from development files, and from the local HTTP origin used by the Hub harness. Verify that it boots, plays, replays, opens credits and renders the full asset set. A development-page pass does not certify the export. Do not place builds or caches in shared temporary storage. For any necessary server bind `127.0.0.1` on an OS-chosen port, verify that the served page is this game, retain its PID and stop only that owned process. Inspect no sibling agent folders and kill no unrelated process.

Prepare one source-information/feedback data object and render the same material in the in-game About/Credits, the builder’s exact required exit-interview schema and the final chat reply. Include every required source-information field and all testing, engine and prompt feedback questions in their specified order. Use the builder’s actual supplied date/model/environment, actual plan filename, actual versions and actual research/testing. Usage is exactly **added on import**. Never estimate cost, tokens or elapsed usage. Use unknown for unavailable facts and none where the schema explicitly permits it. Catalogue metadata must match the title screen, advertised 1–2-player modes, actual controls and implemented features; use the required allowed genre/type values and tag count. Parse the final JSON and validate its shape.

The planner’s interview is a separate planning deliverable. The builder still writes its own implementation/testing interview based on what actually happened, and must not reuse planner answers as evidence of a completed game.

The build is done when all six formations and the flagship are complete and reachable under normal rules; source-defining movement, erosion, acceleration and finite progression are obvious; repairs add meaningful choice; solo/local/Hub co-op agree on the same game; all input families and lifecycle paths work; attract and dev tools meet their contracts; the exported HTML passes the appropriate checks; and the required reports are present and truthful. No visible TODOs, inert controls, placeholder assets, stubbed sessions, missing phases, or unfinished results. Spend remaining effort improving the weakest part of that complete experience rather than adding an unrelated mode.
