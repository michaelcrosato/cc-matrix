# Director’s build plan

For **gpt-6.1-sol ultracode, ultra reasoning, 1.05M context**. Build a finished, original arcade game inspired by **Killer Bees! (1983, Odyssey²)**. This document supplies the game direction and implementation contract; the builder owns execution, final tuning, and the title.

All implementation paths below are **relative to the development folder assigned in your own brief**. Use your brief’s exact development-folder name, final HTML name and destination, and machine-readable delivery filenames. Do not derive any of those names from this plan. Follow your own brief for run date, model attribution, and other run-specific metadata.

## 1. The game to make

Make a **single-screen overhead action arcade game about steering a living swarm through a moonlit garden**. You attack fleeing garden automatons by surrounding and stinging them. Their fallen shells change the routes through the arena. Rival insect swarms mature from wandering nuisances into relentless pursuers. Killing an automaton recharges a horizontal flash that destroys rival swarms, so offense creates the means to survive.

The central decision is: **commit to finishing this target, or break contact before the hunters take more of your bees?** A smaller swarm is visibly smaller and less effective. Killing targets in useful places can make later targets easier to catch—or leave an awkward obstacle in your own escape route.

The presentation is the engine’s shaded, code-drawn pixel art made specific to insects: luminous wings, striped segmented bodies, springy antennae, odd little clockwork gardeners, waxy husks, jewel-like tunnels, and a lavish garden perimeter around a quiet play surface. Keep the camera directly overhead and the arena fully visible. Animation supplies personality and depth without obscuring the rules.

Deliver a complete **six-encounter campaign, approximately 10–12 minutes on a successful run**, with an ending, replay, and a local best score. Leave headroom for Hub’s 15-minute hard session cap. Include solo, simultaneous two-player couch co-op, Hub shared-world co-op, and standalone direct peer co-op. Every mode uses the same combat and campaign. This is a polished small game with a reusable content pipeline.

### Title ownership

The builder must silently generate **50 distinct playful riffs on the source’s name**, then select one with an actual random-number generator, such as `crypto.randomInt(50)` or Python `secrets.randbelow(50)`. Choose once from the eligible list; do not silently reroll to favor a preferred title. Keep the list out of player-facing content. Apply the chosen title consistently to the game, catalogue information, and your brief’s prescribed deliverable naming scheme. This plan intentionally supplies no candidate title.

### Pillars to protect

1. **A swarm you can feel.** Steering, compression, stinging, losses, and replenishment must be obvious through motion and sound.
2. **A readable positioning puzzle at arcade speed.** Routes, contact commitment, and horizontal alignment matter more than aiming dexterity or upgrade menus.
3. **Small campaign, complete arc.** Teach every mechanic in play, combine them, then provide a decisive final encounter and celebration.
4. **A shared screen made for a controller on a TV.** Two players cooperate without split-screen, dense panels, or a cursor requirement.
5. **One trustworthy game state.** Normal play, attract, tests, developer tools, and multiplayer operate the same simulation.

## 2. Research and fidelity

Read the source material before implementation and keep a concise evidence ledger in `research.md`: URL, what it supports, what you actually inspected, and any uncertainty. Planning research established the following:

- The original begins each wave with twelve bees. Sustained contact stings Beebots; breaking contact lets wounded targets recover. Their differing turn behavior and the graves left behind shape routes.
- Hostile swarms progress through wandering, guarding, and pursuing behavior. They remove individual player bees on contact.
- The horizontal RoSHa Ray destroys hostile swarms, including those touching the player. Beebot kills recharge one nonstacking charge. Do not misremember it as a weapon that freezes or kills Beebots.
- Perfect-survival rounds increase the original bonus multiplier. Its long difficulty progression is useful inspiration, rather than the required structure of this new campaign.

Primary references:

- [Original U.S. manual](https://odyssey2.info/library/manuals/us_killerbees/Killer%20Bees%20(USA).pdf), particularly the rules and ray description.
- [Bob Harris interview, Classic Gamer issue 5, page 40](https://www.oldschoolgamermagazine.com/osgdigital/cgm05/files/basic-html/page40.html), including twelve bees per wave.
- [Bob Harris creator interview](https://experienciaodyssey.com.br/the-fantastic-fantastic-world-of-bob/), discussing predictable turns, obstacle placement, unfair entrance deaths, and background readability.

Gameplay recordings are available [without](https://www.youtube.com/watch?v=i3OVu6cs3CQ) and [with The Voice](https://www.youtube.com/watch?v=yN8ekDBvpJY). The planning pass located these recordings but did not view or listen to them. Exact original sound, speech wording, and audiovisual timing remain **unknown** until the builder actually verifies them. Record that distinction honestly.

Use the source’s short, exuberant arcade tone: a mischievous garden emergency, big verbs, tiny boasts, and brief results messages. Write original wording. Do not reproduce its title treatment, sprites, or marketing copy.

The **Focus formation**, authored garden campaign, cooperative play, and concluding encounter below are deliberate new design. Making husks obstruct the flying player swarms as well as the fleeing automatons is another intentional addition; the source establishes obstruction of Beebots. Starting each encounter with one charged ray is also our explicit onboarding/balance choice, rather than a confirmed original rule.

## 3. Combat contract

### Player swarm

Each player starts an encounter with **12 bees**, a full charge, and a clearly identified swarm centroid. Movement is direct and responsive, with a little visual spring in the followers. Keep the simulated steering response sharp; apply most squash, sway, and wing flutter in presentation.

Give the swarm two formations:

- **Roam:** normal speed and a broad sting footprint, suitable for chasing, surrounding, and escaping.
- **Focus, held:** compress the swarm and slow it moderately. It concentrates contact damage on a small area and makes gaps easier to navigate. Holding it while a pursuer closes is dangerous. Releasing returns immediately toward normal formation.

Focus is the one substantial new player verb. It must create a visible and useful decision. Do not add a projectile gun, inventory, skill tree, crafting loop, or unrelated dash economy.

Use an authoritative swarm footprint for contact, informed by formation and surviving-bee count. Render the actual number of surviving bees around that footprint. The visible extent, optional contact highlight, and collision extent must agree. Decorative wing tips and particles do not deal damage. A small centroid marker and a brief outline during contact make the attack zone understandable.

### Stinging targets

Garden automatons are the Beebot-inspired quarry. Give them original names and designs. They flee, predictably turn at obstacles, and visibly weaken while being stung. Damage accumulates only during valid contact; after a short grace period without contact, they recover toward full strength. Concentrated contact and a healthy swarm finish them faster.

Show damage with a changing body pose and a small local progress treatment, rather than a permanent forest of health bars. Interrupting an attack must clearly show recovery. The last sting produces a satisfying collapse, score event, charge refill, and a solid husk.

Two basic families are enough: one preferentially turns left, one right. Differentiate them by silhouette, antenna arrangement, gait, and accent color. Their rules remain deterministic and learnable. Use a navigation fallback when congestion defeats the preferred turn; never let a target or the campaign become permanently stuck.

### Hostile swarms

Use one recognizable family with three stages: wandering scout, protective guard, aggressive hunter. Changes require a visible maturation cue and an audible motif. Distinguish the states through shape and motion as well as color.

- Scouts drift through lanes and give the player early warning.
- Guards orbit or screen a target, creating the decision to spend a charge before committing.
- Hunters pursue the player with bounded turning and readable anticipation, so escape relies on movement and route choice.

Contact removes bees at a controlled damage cadence. Overlapping several enemies must not empty twelve bees in one update. Give a short, clearly communicated damage grace period, an unmistakable lost-bee effect, and a brief swarm recoil. Co-op collision with a friend causes no damage or body blocking.

Stage enemies visibly in entrance cells before release. Do not spawn on a player, inside a solid husk, or without warning. Decorative entrances may be elaborate; the arrival cue must remain clear.

### Horizontal ray

One press fires left and right across the arena at the player’s current ground-plane row. Give the attack a short bright core, readable width, and afterimage. A restrained alignment preview appears when charged, especially when an eligible threat lies in that row.

The ray destroys intersecting hostile swarms. It does **not** hurt automatons, husks, or friendly bees. It is not blocked by scenery. One target kill refills one charge, capped at one. In co-op, grant the single refill to a living, empty-charge contributor, prioritizing the greatest damage contribution since the target last fully recovered and then stable player ID. If no contributor qualifies, refill the living teammate who has been empty longest, again breaking ties by stable ID. If everyone is charged, discard the refill; there is no reserve bank. An empty press gives a quiet dry cue without interrupting movement. Resolve simultaneous kills, input presses, and charge spending in a documented fixed-step order so a kill cannot accidentally discard or duplicate a charge.

### Arena-changing husks

Fallen automatons leave static obstacles for the rest of the encounter. Their footprint is established at the kill location with a slight visible settle. Both the obstruction and its edges must be obvious against the floor. Animate only the visual settling; do not create invisible moving collision.

Validate placements and provide a deterministic escape rule so bodies cannot seal every reachable route, imprison the player, or strand a required target. Preserve useful route changes. A recoverable target may nudge free after a clear hesitation; do not silently teleport an enemy under attack. Keep arena topology and collision in the simulation, not in drawing code.

### Pacing, score, failure

Clearing all required targets ends the encounter. Cancel further hazards, settle the last score events once, show a short result, then refill each active swarm to twelve for the next encounter. Carry score and perfect-clear streaks forward; reset encounter-local obstacles and danger according to content data.

Award score primarily for finished targets, with a readable surviving-bee bonus and perfect-survival streak. Do not reward stinging-and-healing loops. Give each target a single score owner/event ID; simultaneous co-op contact cannot duplicate points or refills. Team score is the primary result; per-player contributions are secondary and cooperative.

In solo, losing the final bee fails the encounter. In co-op, a fallen swarm becomes a clearly marked observer until the surviving player clears the encounter; both return at the next checkpoint. Losing both fails. Offer **Retry encounter**, **Restart campaign**, and **Title**. Retrying preserves a playable checkpoint and marks the run assisted for local score purposes. An uninterrupted clean run and a developer-assisted run must not overwrite the same best score.

There is no mandatory speedrun timer. Gradually increasing hunter pressure prevents indefinite safe stalling. Difficulty should come from meaningful lane and commitment decisions, not unreadable spawn floods.

### Initial tuning, to be tested rather than treated as truth

Express movement and geometry in engine-native world units; one engine tile is 16 units. Begin with an arena around 24 by 15 tiles and adjust its framing before dressing it.

| Variable | Starting intent | Live developer control |
| --- | --- | --- |
| Swarm speed | Cross the useful arena width in about 4–5 seconds | Movement speed |
| Focus speed | About 75% of normal | Focus movement factor |
| Full-swarm target kill | Roughly 1.2–1.8 seconds of committed contact | Sting strength / target health |
| Focus benefit | Clearly faster concentrated kill, without making Roam obsolete | Focus concentration |
| Target recovery | Begins after roughly 0.8 seconds apart | Recovery delay / rate |
| Contact loss cadence | Around one bee per 0.4–0.6 seconds of danger | Damage grace / loss interval |
| Ray thickness | Visibly alignable on pad and touch | Ray width |
| Spawn warning | Around 1 second, never zero | Entrance warning duration |
| Hunter pressure | Mild during learning, pronounced in the finale | Speed / maturation / spawn interval |

Clamp all settings to valid ranges and label units. Tune with real uninterrupted play, not just invulnerability or accelerated tests.

## 4. Campaign and content tools

Author six encounters across three related garden environments. Each is a complete composition with routes, entrances, target schedules, hazard caps, and a finish condition. The names below describe functions and are not prescribed game titles or final level names.

| Encounter | Space and pacing | New lesson | Completion proof |
| --- | --- | --- | --- |
| 1. First bed | Open planting bed, a few predictable runners, generous warning | Move, sustain a sting, spend/refill a ray | Player can kill, escape, lose a bee, and understand the refill |
| 2. Split paths | Two loops and offset entrances | Left/right turn behavior; a husk changes pursuit | Both target families and route changes are exercised |
| 3. Guarded bloom | Trellis courtyard with separated approach lanes | Guards mature; align a ray before committing | All hostile swarm states have been demonstrated |
| 4. Narrow work | Broad lanes linked by deliberate gaps | Focus, concentrated damage, and escape discipline | Both formations offer a useful solution |
| 5. Evening rush | Several entrances around a recognizable central landmark | Prioritize targets and preserve charge under pressure | Simultaneous threats and co-op coordination are meaningful |
| 6. Last bell | Finale arena combining established route patterns | Read and master the complete system | Defeat the concluding target, clear remaining quarry, and reach a real ending |

Build one distinctive concluding automaton, an oversized bell-carrying gardener with a readable three-beat routine: relocate along a predictable circuit, stop and expose a stingable core, then telegraph a dispersal pulse before moving again. Its pulse pushes friendly swarms away rather than dealing unexplained instant damage. Escorts and maturing rivals make it necessary to earn and spend rays while exploiting the opening. Use the normal target damage system, normal rival-swarm counter, and ordinary movement. Scale health/opening duration to player count. No special minigame, new mandatory controls, or damage immunity without a clear visual reason.

The ending shows the garden settling, surviving swarms regrouping, a concise team result, and **Play again** / **Title**. Give the campaign a beginning, escalation, and an authored final release. Do not end on a blank screen or an unannounced endless loop.

Put stage definitions in `content/stages.js` or equivalent structured data. Include identifiers, arena bounds, obstacle footprints, entrance positions, target types/counts, timing, rival rules, and presentation palette. Build validators for impossible geometry, unsupported archetypes, missing schedules, and unreachable completion conditions.

Developer stage tools must let a future designer select/restart an encounter, change its seed, inspect collision and spawn zones, and tune the important variables without rewriting game logic. Keep content authoring documented in `content/README.md`. Avoid a full general-purpose editor; reusable encounter data and working inspection tools meet the vertical-slice need.

## 5. Presentation and animation

### Composition

Use a fixed **`overhead`** engine view. The engine’s `topdown` view is tilted; exact overhead makes row attacks and collision truthful. Depth comes from native shaded volumes, ground shadows, wings, elevation on props, and the perimeter diorama. Keep the gameplay arena’s dimensions fixed across aspect ratios. Extra width or height shows scenery or framing, never extra spawn territory or a larger escape area.

Explicitly fit the projected arena bounds plus a safety margin inside a gameplay rectangle that excludes the HUD and touch controls. Use the tighter width/height fit through the engine’s supported camera/resolution facilities; `expand:true` alone does not perform this containment. The proposed 24-by-15-tile arena is 384 by 240 world units, larger than the default 320-by-240 native viewport. Assert that all four corners remain visible in landscape, portrait, and resized windows. Preserve readable native pixel rendering and use letterboxing or extra framing where necessary.

The arena floor is dark, low contrast, and mostly quiet. Reserve bright ivory/gold for the first player and a distinct pale accent plus marker shape for the second. Reserve hostile state colors for enemies. Frame three environments with soil strata, glazed planters, bent wire fences, oversized petals, dew beads, clockwork garden hardware, and moving leaves. Use generic native props where appropriate, but author custom insect and automaton assets.

Keep decorative motion outside contact lanes. Lighting, shadows, particles, and material detail are encouraged without a numerical performance cap. Judge their placement by play readability. Prevent flashes, shakes, text, and foreground leaves from masking damage or blocking input. Include reduced motion and restrained flashing settings.

### Native animation foundation

Extend the engine’s procedural rigs rather than importing a different animation stack. `E.Blob` supplies squash, eyes, and wing flapping; its state-driven `update`/`draw` pattern is a suitable foundation for custom insect rigs. Add segmented striped abdomens, antennae, feet, paired wings, and distinct emotional poses. Do not recolor a humanoid and call it a bee.

Required animation states: idle hover, acceleration/bank, Focus compression, contact stinging, target recovery, warning/maturation, damage recoil, bee loss, charged/empty ray, target collapse, swarm replenishment, boss exposure/pulse, victory, and defeat. Transitions should derive from simulation state and explicit events; cosmetic easing must not decide hits or completion.

Use native custom shapes and materials for fixed scenery, native pixel sprites/animations for tiny icons or spark accents, and custom rigs for moving anatomy. Preserve the engine’s pixel edges, palette shading, and visual vocabulary. Make palette and shape sheets in the dev folder so new assets can be added consistently.

### Audio, entirely written in code

Use engine synthesis/Web Audio for all sound. Do not ship audio files, recorded dialogue, encoded samples, or downloaded music. Create distinct procedural voices for calm wings, agitated wings, stinging, recovery, lost bees, charge ready, empty fire, ray sweep, entrance warning, maturation, target collapse, UI, and final clear.

Write a light original arcade garden score with layers that react to pressure and a short finale resolution. **Music defaults to 10%** on first use. Wire that default into the engine’s actual persisted settings, not just a temporary bus assignment later overwritten by settings initialization. Provide music, SFX, and voice controls, master mute, and persistence. Route new sounds through the existing buses.

Occasional tiny Animalese/Simlish-like chatter gives the garden characters personality. Generate syllable envelopes and pitches in code; use no intelligible sampled speech. Start sound after a permissible user gesture, tolerate suspended/no-audio contexts, and suppress audio in a dedicated Hub server. Attract mode must remain useful if audio cannot start. Verify synth output with offline rendering or analyser levels; this machine cannot verify subjective listening quality.

## 6. Controller-first screens and input

Use the engine’s input and menu infrastructure. Extend native pause/settings/controls rather than duplicating them with a separate web UI. Every screen must work with a standard-mapped DualSense, keyboard, pointer, and touch.

| Action | PlayStation default | Keyboard | Mouse / touch |
| --- | --- | --- | --- |
| Steer | Left stick / D-pad | WASD / arrows | Hold right mouse toward ground cursor; invisible left touch stick |
| Ray | Cross | Space | Left click; one contextual charged touch button |
| Focus | R2, held | Shift, held | Keyboard modifier; right-side touch hold area |
| Pause / back | Options / Circle | Esc | Menu click/tap |
| Confirm | Cross | Enter / Space | Click / tap |
| Local join | Second pad join action | Explicit keyboard join option | Menu selection |

Use action mappings, not scattered hardware codes. Offer rebinding through native controls. Normalize diagonal movement, apply dead zones, and clear held gameplay input at transitions. A held button from the previous screen must not fire the first ray or instantly choose a result action.

Only show one prompt family at a time based on the last meaningful input. PlayStation glyphs are the default; a Settings option selects Xbox A/B/X/Y. Mouse hover moves menu focus, click activates, keyboard navigation feels native, and cursor movement does not steal focus through invisible layers. Preserve visible focus and clear back behavior.

For touch, keep only the menu button and a charged ray button when useful. The movement stick is invisible; a brief first-use gesture hint may fade. Handle simultaneous movement, Focus hold, and ray taps with separate pointer IDs. A held Focus gesture must not emit a ray on release. Provide slight contact assistance where needed, while retaining the same targets, rules, and authored spaces. Test cancelled touches, dragging off canvas, browser interruption, and portrait framing.

Required screens are Title, a short Play/Co-op choice, Settings/Controls, About/Credits, Pause with Developer tools, encounter result, failure/retry, and ending. Use large native menu rows and compact prose. Target readable body/prompts around 28–32 displayed pixels at 1920×1080, larger important actions, strong focus, and generous safe margins. Check the actual rendered result; a nominal font size is not proof. A 10-foot screen must not resemble a dashboard.

The gameplay HUD needs only team score, encounter progress, player markers/bee counts, and charged/empty status. Show short contextual teaching during safe early moments, then get out of the way. Keep the encounter goal discoverable from pause. Text must remain readable without relying on hue, and text must not overlap the active arena at narrow aspect ratios.

### Attract mode

After **10 seconds with no meaningful input on the title/menu screen**, enter a looping real-simulation demonstration. Use a bot or short sequence of seeded scenarios that shows chasing, Focus, stinging, a husk changing routes, maturation, a successful ray, co-op, and a glimpse of the finale. The bot may cheat; the presentation should still explain real mechanics.

Any input exits attract to the title, consumes that input, and restarts the idle timer. Cover mouse movement, analogue movement, keyboard, button presses, and touch—not only clicks. Suppress controller drift with a meaningful dead zone. Demonstration saves, score, seed, settings, stage state, and achievements must not leak into the real run. Do not run attract inside an active Hub session.

## 7. Engine integration and source organization

The planning pass inspected **my-3D2dge v0.89.1**, commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Start with the required handoff, inspect the version you actually receive, and record changes if upstream has moved.

Reference material:

- [Handoff README](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/README.md)
- [API card](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API.md) and [API index](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API-INDEX.md)
- [Native asset authoring](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/docs/ASSETS.md)
- [Arcade module](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/modules/arcade.js)

Vendor the handoff into `vendor/engine/`. Prefer the full dependency-free `my-3d2dge.js`; it already contains modules, so do not register them twice. Adapt the useful arcade shell rather than retaining unrelated sample games. Its built-in arcade lives rules are solo/alternating; simultaneous co-op requires the shared-run rules specified here.

Suggested organization:

```text
src/main.js                 boot, integration, scene registration
src/sim/                    world, swarm, targets, rivals, collision, rules, seeded RNG
src/presentation/           native rigs, environment, effects, HUD, synthetic audio
src/scenes/                 title, run, result, ending, about
src/input/                  action normalization and touch adaptation
src/net/                    Hub, direct peer, shared authority/packet contract
src/dev/                    tools, sliders, snapshots, inspection overlays
content/                    authored encounters and content documentation
vendor/engine/              required handoff and notices
vendor/hub/                 pristine SDK and test harness dependencies
tools/build.mjs             reproducible single-file export
tools/test.mjs              one quiet test command
tests/                      simulation, browser, audio, network, packaging checks
evidence/                   targeted screenshots and machine-readable test results
research.md                 verified source/engine/network evidence
```

Change module boundaries when the actual source suggests a better design. Keep dependency direction clear: simulation knows no renderer, DOM, audio device, or transport. Presentation consumes snapshots/events. Inputs enter as validated actions. A headless authority must be able to construct the whole campaign.

### Verified extension points

- `new E.Game({canvas, view:'overhead', ...})` and native scenes provide the shell. World x/y is ground and z is height. Translate screen input through `game.view.screenDirToGround` where appropriate.
- Native `E.Body`, map collision, and overlap helpers can support movement; game-specific swarm/target contact remains explicit and testable. Rendering cannot supply last-frame collision truth.
- Use `r.actor(..., drawCallback)` for rigs, native shadows/rings, `r.shape` for props, `E.SHAPES`/`E.MATERIALS` for authored scenery, and `E.sprite`/`E.anim` for small animated accents.
- Custom rigs follow `update(dt,state)` and `draw(g,ox,oy,view)`. Use native pixel drawing/shading, easing, and `E.Blob` motion as the base.
- `E.Menu`, settings definitions, `input.label(action)`, pointer support, and local `game.allowJoin({max:2,...})` already exist. Local join is not network synchronization.
- Native `settings.define` supports sliders and resettable groups. Native audio exposes music/SFX/voice buses and a music volume property. Verify exact setting keys before configuring defaults.
- Native headless mode supports `new E.Game({headless:true,draw:true})`, exact fixed-step `game.advance(seconds)`, injectable input, and collected `.errors`.

These are orientation points, not a substitute for reading the implementation. Keep the complete relevant API cards, examples, engine implementation, Hub contract, and acceptance ledger in working context. The large context window is useful for maintaining cross-system consistency; it is not a reason to build a second engine or add unrelated systems.

### Simulation discipline

Use a seeded RNG and the engine’s fixed update cadence; its headless stepping is 1/120 second. Do not use wall time, `Math.random()`, frame count from rendering, or audio completion for gameplay. Establish stable entity IDs and one-shot event IDs. Define update order for inputs, movement/collision, contact, deaths/charge events, spawning, and encounter completion.

Keep compact serializable authoritative state: seed/tick, phase, encounter, players, target state, rival state, husks, score, charge, timers, and concluding-target phase. Cosmetic wings and particles reconstruct from state/time. A snapshot restore or encounter restart must produce a coherent world without replaying old sounds or awarding old scores.

Preserve a fixed gameplay arena under resize and native `expand` behavior. Scene changes must clear stale timers, input, effects, and developer time scale; native scene changes do not necessarily reset every persistent setting. Pause, suspend, restart, quit, reconnect, attract exit, and ending need deliberate ownership of each subsystem.

## 8. Multiplayer that actually works

Use **one host-authoritative shared world for 1–2 players**. The network path must preserve meaningful player steering and actions. A remote player cannot merely watch a host simulation.

The planning pass inspected **AI Hub Session Protocol v1, client 1.4.0**, commit `35a1047f2067b2af3de3943f0fe452f39105d869`:

- [Protocol/API](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md)
- [Pristine session client](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/session.js)
- [Shared-world example](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/examples/arena.html)
- [Harness](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/harness.html) and [automated checker](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/scripts/hub-check.mjs)

Re-read the shipped contract and use the version actually vendored if these interfaces change.

### Hub lifecycle

1. Inline the pristine session client **byte-for-byte**, as the first script in the head directly after charset. Do not minify or rewrite it. Add correct session version, `1-2` player count, `shared-world` mode, goal/how-to, and duration metadata using the official schema.
2. Call `AIHub.connect({mode:'shared-world', seats:[1,2]})`. A null result selects the standalone flow.
3. When active, build the world and automatically call `AIHub.ready()` once. Bypass title, attract, local join, and blocking start screens. Use Hub’s instruction card.
4. Respect its start clock. The start event arrives before play: gameplay input and simulation remain gated until `AIHub.time() >= 0`.
5. Only the host advances gameplay. The host may be a dedicated server copy with `AIHub.server === true` and no local player. Never assume `AIHub.me` occupies a seat or that authority has a canvas, audio, or gamepad.
6. Handle leave, time-up, and end. Neutralize departed inputs; if a guest leaves, the remaining player can continue. A host departure is a void round managed by Hub. On time-up, host finishes inside the supplied grace period. Stop traffic, input, timers, and sound on end.
7. Host calls `AIHub.finish(...)` exactly once, supplying valid scores, win/loss, and a cooperative tied standing for the remaining player IDs according to the current result schema. Campaign completion finishes normally; a timed-out unfinished campaign is an honest incomplete/loss result with score.

Declare a duration appropriate to the finished campaign rather than a sample game’s short timer. The inspected Hub runtime enforces a **15-minute hard cap**, even if longer duration metadata is supplied. Tune a clean campaign toward 10–12 minutes and verify its normal completion below that cap. Standalone retries may take longer. Test natural victory separately from the harness’s accelerated time-up path.

While Hub is active, use **only its transport**. Do not create WebRTC, WebSocket, EventSource, public broker requests, chat, emotes, custom-name entry, new windows, dialogs, or navigation. Display supplied names as text. Honor the Hub-reserved Create+Options chord. A player’s pause/settings overlay does not freeze the shared world; make that behavior clear. Native menus and focus/controller-loss handling can pause the engine by default, so use documented live/no-pause menu options and disable automatic pausing for network authority, or separate authoritative stepping from local UI suspension. Apply this rule to standalone peer authority too. Developer gameplay cheats, restart, and quit-to-title are unavailable during an active Hub round; read-only diagnostics and presentation settings may remain accessible.

### Transport-independent authority

Normalize local pad, keyboard, touch, Hub input, and direct-peer input into one command format. Validate sender ownership, finite/ranged axes, phase, sequence, and monotonic action counters. A guest submits intention; it cannot submit its own authoritative position, damage, score, charge, or kills.

Start with approximately 15 guest input packets/s and 12 host snapshots/s, reserving headroom for reliable phase and result events. Hub permits **20 outbound game-data messages/s**, burst 40, and at most **16,384 JSON bytes** per message. These limits apply per sender across reliable and unreliable `AIHub.send` packets; lifecycle calls such as ready/finish do not consume that game-data token bucket. Track actual encoded sizes/rates in diagnostics and tests.

Use full compact snapshots with entity IDs and bounded precision. Keep unreliable snapshots near or below 1,200 bytes; split no gameplay-critical structure across fragile ad hoc deltas. If worst-case content needs larger snapshots, use an explicitly tested reliable strategy within the official limit and rate budget. Send centroid, bee count, formation, authoritative phase/time/seed, compact targets/rivals/husks, and scores; derive decorative individual-wing motion locally.

Use interpolation for remote presentation and gentle local movement prediction/reconciliation. Host authority decides contact and damage. Use action counters or equivalent acknowledgements so loss cannot duplicate or permanently swallow a ray press. Bound stale input duration, neutralize movement after a tested timeout, and document the behavior. Releasing a button must recover under packet loss.

Scale authored target counts, health, and rival pressure for two active players through data. Keep route readability and encounter duration close to solo. Give both players a clear color/shape identity and independent charge. Do not double every number blindly. Joining couch play occurs at a safe encounter boundary; leaving removes held inputs and retains a coherent campaign.

### Standalone play

The session client supplies no standalone signalling, room service, or TURN credentials. Do not invent a six-digit matchmaking service or embed credentials from another application.

Ship two independent standalone multiplayer routes:

- **Couch co-op:** two standard pads, or explicitly supported keyboard-plus-pad. Use native local-join support and the same authoritative command path. One-player use remains effortless.
- **Direct peer:** a minimal manual WebRTC offer/answer exchange, available only outside an active Hub session. One peer creates a connection offer after ICE gathering; the other accepts it and returns an answer; the host applies the answer. A single ordered data channel carries the same command/snapshot messages. No external server is required for loopback/LAN direct peers.

Give direct setup a short step-by-step screen with Copy, Paste, connection status, Cancel, retry, and malformed-code recovery. Clipboard failure must leave selectable/pasteable text and a working fallback. Keep technical connection text inside its focused setup flow rather than the main menu or HUD. Use conservative input-length limits and validate decoded fields. Deliver and acknowledge the final result before closing the data channel, with a bounded disconnect fallback. Close peer connections on cancel/end and clear stale state before retry.

Direct connectivity is guaranteed only to the extent demonstrated on this machine/local network. STUN can help across networks, but without provisioned TURN, arbitrary internet connectivity is not guaranteed. Say this plainly in setup help and final limitations. Do not claim public matchmaking or universal remote support. Verify actual data-channel play between two browser contexts; mocked packets alone are insufficient.

## 9. Developer mode and inspectability

Developer tools are reachable from Pause. Organize a few readable pages rather than a wall of sliders. Include encounter selection/restart, seed entry/regeneration, single-step, time scale, invulnerability, charge refill, spawn controls, collision/footprint overlays, enemy state labels, and a state snapshot/export suitable for debugging.

Expose the tuning table’s important variables as **live sliders** with units and **Reset tuning to defaults**. Update the authoritative tuning model at a safe tick boundary. Restart-only changes must be labeled and applied through an explicit restart action. Mark a run modified as soon as a gameplay cheat or tuning change occurs. Resetting a slider must not erase that history for the current run.

Provide a narrow debug/test interface for snapshots, action injection, stage loading, event counters, network rate/size, and transition observability. Keep it separate from player UI. Never require test-only win triggers for the principal scripted campaign playthrough.

In standalone peer play, only the host can change authoritative developer settings; replicate any permitted change and mark both results assisted. In Hub, keep gameplay modification disabled as described above. Restoring default time scale and clearing held inputs on exit are mandatory.

## 10. Execution order and integration gates

Use the long context window to keep the actual engine, API, source evidence, content definitions, and integration contracts coherent throughout the build. Maintain a compact acceptance ledger with each brief requirement, its implementation location, and proof. Delegate bounded research, asset, or test work where useful; make one owner responsible for each edited module and final integration. Parallel work must stay within the assigned workspace and avoid collisions with other runs.

### Gate A — Prove the foundations

Read required instructions and handoff documentation. Select the title properly. Vendor and record engine/Hub versions and notices. Establish the single-file build early. Boot a native overhead scene, synthetic sound after a gesture, large native menus, a headless simulation, and a real Hub ready/start/server lifecycle smoke test. Export and open the result with `file://` before content grows.

**Exit:** the chosen stack, headless authority, pristine SDK placement, and packaged launch work. The project has one build command and the beginnings of the quiet test command. Do not postpone multiplayer viability until after art production.

### Gate B — Make the central minute satisfying

Complete one arena with a custom bee rig, Roam/Focus, one fleeing target, real sustained contact/recovery, rival maturation, bee loss, ray/charge rules, a husk, encounter clear, failure, and retry. Add minimum honest cues and audio now. Tune movement and contact with an uninterrupted controller-style run.

**Exit:** every core rule can be demonstrated and tested in that arena. It is fun without progression rewards or presentation covering weak interaction.

### Gate C — Finish shared-world control

Integrate two local swarms, player-count scaling, authoritative snapshots, guest actions, loss/jitter handling, dedicated server, leave/end rules, and actual direct-peer setup. Run the real Hub harness and two-context direct-peer test.

**Exit:** each player can independently move, sting, fire, lose bees, and affect the same result. A server with no local seat completes a round. Standalone and embedded transports cannot accidentally activate together.

### Gate D — Complete the campaign

Author all six encounters, three visual sets, the concluding gardener, checkpoint/retry, score/best rules, narrative cues, and ending. Validate the content definitions. Implement attract as a separate run of real game logic. Finish live developer tools.

**Exit:** an action-driven script can play the whole campaign from start to ending, exercising every mechanic. A clean manual-style playthrough has reasonable pacing and no dead periods or impossible traps.

### Gate E — Finish the presentation and access paths

Complete procedural rigs/transitions, scenery, music, gibberish, contextual teaching, glyph switching, rebindings, touch, large-screen legibility, safe areas, focus behavior, reduced motion, and all menu/result flows. Populate About/Credits and feedback from actual evidence.

**Exit:** no mode, screen, control route, or asset is a placeholder. Every player-visible action works. Pause, restart, ending, device loss, and return to title leave consistent state.

### Gate F — Ship and verify the actual artifact

Build the prescribed final HTML and run the final test group against that file, not just a development entry page. Validate the prescribed machine-readable interview, match catalogue data to title/screens, and produce the brief’s required final chat sections. Preserve the dev files and compact evidence.

**Exit:** all acceptance items below have evidence; any hardware/network limitations are stated precisely. Do not substitute a list of future fixes for completion.

## 11. Verification plan

Keep all automated checks behind **`node tools/test.mjs`**, exiting nonzero on failure. Routine output is only actionable failures and one final count, for example `148 checks: 148 passed, 0 failed`. Capture noisy engine/browser/harness output and print it only when it explains a failure. Record issue counts and severity as testing proceeds so final feedback is based on evidence.

Run affected groups after changing their covered code. After final packaging, run the integrated artifact checks once. Broaden or repeat testing when changes, failures, or unresolved concerns justify it. Do not repeatedly burn time on unchanged checks or benchmark FPS; performance targets and optimization are outside this brief.

### Deterministic simulation and content

Use native headless stepping with drawing enabled where useful. Check seeded reproducibility, finite positions, bounds/collision, legitimate target reachability, contact break/recovery, Focus tradeoffs, bee-count limits, damage cadence, ray eligibility, nonstacking charge, simultaneous events, score deduplication, husk placement/escape, maturation, stage transitions, checkpoint retry, co-op wipe/observer/refill, and final win/fail.

Run an action-driven bot through **all six encounters** using normal movement/formation/ray commands. It may inspect world state to choose actions; the principal completion test must not teleport, grant invulnerability, directly set enemy health, or invoke stage-clear. Separate fast fixtures can use debug setup to isolate edge cases. Assert that each feature was actually exercised, not merely loaded. Keep at least one representative survival/balance run under normal tuning.

Use `new E.Game({headless:true,draw:true})`, `game.advance`, and injectable input. Inspect collected errors. Native kit tests and `vendor/engine/tools/check.mjs` can inform the wrapper; adapt their noisy reporting. Browser wall time is not reliable game time because slow frames can discard elapsed time. Wait on observable state or use explicit stepping.

### Browser, input, storage, and audio

Test the packaged file in installed Chromium and WebKit. Probe Firefox’s no-WebGL environment for graceful operation as applicable to the Canvas engine. Do not claim physical-console or real-iOS verification. Use only one or two browser instances at once and reuse contexts where possible.

Exercise mouse hover/click focus, keyboard start/play/pause/retry, rebinding and prompt updates, settings persistence, blocked storage fallback, standard-mapped gamepad stubs, stick dead zones, disconnect/reconnect, two-pad control, glyph selection, lost focus, touch multitasking/cancellation, and resize/orientation. Mock `navigator.getGamepads` through browser initialization; no physical pad is available.

Use an offline audio context or analyser to verify nonzero finite output, envelopes/decay, the 0.1 initial music setting, mute and bus controls, and no stuck tone after pause/end. Check that no audio-file requests occur. Do not claim anyone listened.

Check attract at just before and after 10 seconds, its feature coverage, cancellation by every input family, and isolation of scores/settings/run state. Verify that Hub never enters attract.

### Real multiplayer harness

Vendor the official harness, bridge, and round dependencies together. They require same-origin HTTP and module/fetch support; do not assume the harness runs from `file://`. Bind a server to **127.0.0.1 on an OS-assigned port**, confirm the served page has this game’s identity, and close only the processes/contexts you started.

Drive the harness with one and two players, then the two-player latency profile of approximately **150 ms latency, 50 ms jitter, 5% loss**. Include guest departure, `scenario=host-leave`, `scenario=server`, time-up, normal completion, and teardown. Require both `document.body.dataset.complete === 'true'` and `window.__hubCheck.pass === true` where supplied by the current harness. Also assert meaningful remote steering/action effects and correct authoritative state; protocol success alone does not prove gameplay.

The official checker is invoked from its own repository as `node scripts/hub-check.mjs <served-game-path> --players 2`; adapt its harness into the project runner or drive it through the installed Python Playwright. Do not blindly run that relative path from this project. Assert packet size/rate limits under worst-case authored content, no forbidden active-session APIs, no duplicate finish, and a dedicated authority without local rendering/audio/input.

Test the real standalone WebRTC offer/answer exchange between two contexts, then action delivery, cancellation, bad codes, retry, connection loss, and clean return to menu. Test couch co-op independently. Keep any limitations of internet/NAT reachability explicit.

### Targeted visual inspection

Use screenshots only for what state checks cannot establish: title identity, 10-foot legibility, native-style composition, swarm/hostile distinction, Focus readability, contact and recovery cues, ray row clarity, husk collision alignment, two-player overlap, finale, portrait touch, and About/Credits overflow. Choose useful moments through state hooks or the engine filmstrip tool. Inspect the images rather than merely saving them. Automated state checks remain the proof of campaign completion and network behavior.

### Shared-machine discipline

Keep every generated file and cache inside the assigned development folder; no shared `/tmp`, sibling-run reads, or broad searches through other agents’ work. Use the provided installed tools and pinned browser version; do not reinstall browsers. Use the available Python Playwright environment or an appropriately pinned local dependency. Any local server uses loopback and port zero. Track PIDs and stop only your own processes; never kill by a broad name or occupied port.

## 12. Packaging, provenance, and completion

Build a single HTML artifact at the exact name/destination specified in your brief. Inline engine, game code, content, CSS, and any required drawn assets so standalone play needs no runtime local fetch/import. Retain required notices. The pristine Hub client must remain the first script and byte-identical; handle it separately from any minification or bundling. Escape literal closing-script sequences in other embedded JavaScript, including engine comments, so they cannot truncate the document. The builder may use downloadable dependencies if justified, but this engine does not require a CDN for its main runtime.

Test opening the final artifact directly through `file://`, and the same bytes through loopback for Hub. No absolute workstation paths, missing development assets, external audio, broken source-map dependency, console exceptions, or instructions to run a build before playing. Persistence must fail gracefully where file-origin storage is restricted.

The in-game About/Credits and final chat reply must contain **Source Information, Testing Feedback, Engine Feedback, and Prompt Feedback**, with every field/question required by your own brief. Populate the prescribed machine-readable delivery interview with its exact schema and parse it before finishing. The planner’s separate interview is not a substitute for the builder’s.

Include the real source, this plan’s filename, actual chosen genre/perspective, actual engine/library versions, authored art/animation/audio approach, functioning online features, research performed, allowed testing parameters, environment/model information from your brief, and **`added on import`** for usage. Use **`unknown`** wherever confirmation is unavailable. Do not invent listening tests, physical device tests, public-network guarantees, costs, or testing issue counts. Keep descriptions consistent across the game, catalogue, structured interview, and chat.

Track and answer every required testing, engine, and prompt feedback question. Explain actual engine changes and why; write none if unchanged. Catalogue the game as a 1–2 player Action game with accurate controls and a short description of the swarm/route/ray loop. Use only features that were delivered in its tags and description.

### Final acceptance ledger

- [ ] Builder-selected randomized title; correct per-brief output names and locations.
- [ ] Required engine is the functioning foundation for visuals, animation, input, menus, and game loop.
- [ ] Source research is documented, with confirmed rules distinguished from original design.
- [ ] Responsive swarm steering, Focus, sustained sting/recovery, visible bee loss, three rival states, single-charge horizontal ray, and route-changing husks all work.
- [ ] Six authored encounters, complete concluding encounter, fair failure/retry, ending, clean/assisted score separation, and reusable content definitions.
- [ ] Solo, two-player couch, actual standalone direct-peer, Hub shared-world, and dedicated no-local-player authority all work.
- [ ] Hub’s metadata, pristine SDK placement, start clock, traffic limits, leave/time-up/end, and valid once-only results pass its real harness.
- [ ] Controller-first title/pause/settings/results/about, native keyboard/mouse behavior, last-device prompts, PlayStation default and Xbox option, touch multitasking, and visible focus.
- [ ] Ten-second attract, feature-rich replay, any-input exit, and save/state isolation.
- [ ] Reachable developer tools with meaningful live sliders, reset defaults, encounter controls, and safe session restrictions.
- [ ] Custom source-specific art and native procedural animation, readable arena, original code-only audio/voices, and persistent 10% default music.
- [ ] One quiet test command; normal-rule scripted whole-campaign completion; targeted inspected screenshots; honest device/audio/network limitations.
- [ ] Final single HTML tested directly and in the harness, required structured interview parses, and all required credits/chat feedback fields are complete.
- [ ] No TODOs, stubbed modes, inert buttons, placeholder assets, or unfinished player-facing flows.
