# Director’s build plan

## Mandate and builder decisions

Build an original, finished arcade space-rescue game inspired by **Freedom Fighters! (1982), for Odyssey² / Philips Videopac**. Deliver a complete vertical slice with a beginning, escalating middle, finale, ending, failure and retry flow, and every promised control and multiplayer mode working. The player fantasy is precise: **thread a rescue ship through a living minefield, free its captives, and use hyperspace to make the dangerous route possible**.

The genre is an arcade rescue shooter. Present the action side-on in a horizontally scrolling, two-dimensional flight plane, with the required engine’s shaded, layered, animated pixel-art treatment providing depth. The defining cooperative mode puts two people in **one ship**. These are the director’s design decisions; the builder owns implementation, final tuning, original visual designs, dialogue, and the game’s title.

**Do not take a game title from this plan.** Follow your own brief: silently brainstorm exactly 50 playful riffs on the source name, select one with a real random-number generator, and use the selected title consistently. Do not publish the candidate list or substitute personal preference for the draw.

Use the development directory, final HTML filename, delivery location, metadata filename, date, and model information specified in **your own brief**. This document deliberately supplies no run-specific output names. All implementation paths below are relative to your development directory. References to delivery outside that directory are expressed in prose; resolve them from your own brief.

This plan is written for gpt-6.1-sol at ultra reasoning effort with a 1.05M-token context window. Use that capacity to understand the full engine and integration contracts, keep systems consistent across modes, and verify complete player journeys. Maintain the requirement-to-test map alongside the implementation. A large context window is especially useful for tracing input → simulation → network state → presentation → save/results without losing the contracts between them. It does not require unnecessary abstraction, extra game modes, or filling the available context.

## Research foundation

The original manual establishes a starship rescuing people inside purple confinement crystals, conventional movement and a faster hyperspace drive, mine-laying Pulsar warships, and two people sharing control. Attack mode permits lasers; Evasion disables them and rewards survival and rescue. Contact frees a captive. The published score weights strongly favor rescue: 20 for a captive, 5 for a warship, 1 for a mine. Threat rises with score. These are the source anchors to retain. The manual does not describe an authored campaign; the sectors and finale below are original additions. [Original rules, archived transcription](https://odyssey2.info/library/manuals/us_freedomfighters/freedom-fighters.txt)

Contemporary coverage identifies a useful tactical relationship: destroying a warship clears the mines it laid. Retain that relationship as the player’s alternative to weaving through every individual hazard. [Electronic Games, November 1982](https://vtda.org/pubs/Electronic_Games%28Reese%29/Electronic_Games_Issue_09_Vol_01_09_1982_Nov.pdf)

Archival screenshots are available for the original’s sparse space field and bright silhouettes. A later detailed review describes the crystals’ vulnerability to fire and the awkwardness of the original two-controller arrangement. Another describes a restrained repeating background cadence and resonant explosions. Treat those accounts as research, not proof of an exact waveform, instrument, or musical transcription. The design below supplies original sounds and readable modern controls. [Screenshots](https://odyssey2.info/media/screenshots.php?r=1), [mechanics review](https://odyssey2.info/reviews/freedom-fighters-19), [sound description](https://videogamecritic.com/odddf.htm?e=98216)

Before making assets, inspect actual reference images and an accessible recording of the 1982 game. Check that a purported recording really shows the Odyssey²/Videopac version; search results also return unrelated games with the same name. [A recording source to inspect](https://www.youtube.com/watch?v=BxCPJ6YP19k). Record what you personally inspected and distinguish it from these planner findings. If a recording cannot be accessed, retain the written evidence and mark exact sound details unknown. Do not claim to have played or listened to material you only read about.

Translate the source’s brisk, declarative space-adventure tone into short original mission lines. A briefing should tell the player what to do, what threatens the captives, and when the route changes. Avoid long lore, copied prose, or jokes that undermine the rescue stakes.

## Experience and scope

The complete demo has one approximately **10–15 minute rescue operation**, including its onboarding and finale, plus a **three-minute Evasion challenge** that reuses its flight, rescue, and mine systems. Duration is a pacing target, not a clock to pad. A skilled player can finish faster. Every mechanical feature must occur naturally in the operation or the clearly accessible challenge.

The most important decisions recur at different scales:

1. Clear a safe lane with the cannon, or take a shorter route through live hazards.
2. Hunt the mine-layer and collapse its entire field, or rescue someone before that opportunity drifts away.
3. Spend hyperspace energy on escape now, or retain it for the next intercept.
4. Stop firing long enough to make a clean approach to a fragile captive crystal.
5. In co-op, coordinate normal positioning with the navigator’s committed hyperspace maneuver.

Keep one primary cannon, one hyperspace system, three enemy roles, a small vocabulary of mine formations, and one boss built from those rules. Depth comes from authored combinations and spatial decisions. Do not add an inventory, crafting, upgrade economy, randomized campaign, extra pilot classes, or a second unrelated combat system. Make the available slice rich in animation, scenery, feedback, and encounter design. Performance targets and optimization are outside this assignment.

### Operation structure

| Beat | Approximate first-run time | Player-facing purpose | Required content and completion |
| --- | --- | --- | --- |
| Playable opening | 30–60 seconds | Establish rescue before combat | Begin already in flight near one safe crystal. Teach movement and contact rescue through a short prompt and visible approach ring. Introduce firing, then a marked hyperspace intercept. No mandatory text tutorial or menu maze. |
| Sector 1 | 2–3 minutes | Read a minefield and choose a route | Rescue three captives; encounter a single mine-layer, its linked mines, and a small interceptor group. Stage the first linked-field collapse so its cause and effect are unmistakable. Reach the evacuation beacon to checkpoint. |
| Sector 2 | 3–4 minutes | Use every basic system under pressure | Rescue four captives among overlapping moving formations. Add an enemy that guards a crystal route, a brief signposted ion-shroud interval that suppresses weapons, and an optional high-risk rescue. Restore weapons visibly. Reach the next checkpoint. |
| Finale | 3–4 minutes | Recombine established skills | Fight a prison carrier with readable external mine-laying organs. Clear organs to open routes; rescue three prisoners released into crystal trajectories; disable the exposed core. Finish with a short hyperspace extraction that remains playable. |
| Results | As long as the player needs | Close the operation and invite mastery | Show rescued/lost captives, score, best score, completion rank, and a short ending reflecting the rescue count. Offer replay, Evasion, and the front end where the current mode permits them. |

These labels are content organization, not additional required game titles. Use scenery and music changes to distinguish the sectors: open rescue space, a dense prison-orbit debris belt, then the looming carrier and escape corridor. The route remains legible rather than becoming an obstacle course of decorative collisions.

Evasion is a finished short challenge available from the front end at first launch. Lasers are visibly offline, hyperspace remains available, and the player rescues captives while surviving a rising sequence of minefields. End with a real extraction/result condition after three minutes; hull depletion ends it earlier. Explain its disabled cannon before the round begins and in a small persistent status icon. Reuse mission definitions with mode modifiers rather than maintaining a second simulation.

### Completion and failure rules

Each operation sector has a rescue quota and a combat/navigation objective. The director must know why a transition is waiting. Announce the next objective once; then express it through the beacon, target marker, and compact HUD. Clear shots, enemies, input latches, temporary effects, and sector-local timers at transitions according to explicit lifetime rules.

Captives rescued by contact are secured immediately. Do not add a delivery cargo system or escort train. A lost crystal reduces the possible score and is recorded in the outcome. If the player destroys or misses every crystal needed for a quota, the mission director brings a clearly announced replacement rescue group on a fresh, reachable trajectory. Replacement groups award their normal rescue points but cannot be farmed indefinitely: rescued IDs and sector credit rules prevent duplicate rewards, and replacement deployment carries a documented rank penalty. Never leave an unwinnable objective running forever.

Start with three hull units. An accepted hit removes one and gives a short damage grace period. Hull depletion shows an explicit failure overlay with checkpoint retry and restart in standalone. Restore the checkpoint’s defined world, hull, energy, objectives, and score baseline; retry cannot accumulate score from the same rescued entity. Checkpoints occur after the opening and each completed sector. A completed operation remains completed even if its final visual effects are still running.

In Hub sessions, team failure is a terminal result for that round, not a private restart menu. This is the same mission and damage model with the Hub owning the round lifecycle. Do not introduce separate online combat rules.

## Mechanical specification

### Flight, cannon, and hyperspace

Conventional flight responds immediately with light acceleration and a quick release/brake curve. Aim is independent of travel within the flight plane. The cannon can fire in any planar direction; neutral aim retains its last valid bearing, initially the ship’s facing. This modernizes the source’s firing while preserving the central rescue and dual-drive decisions. Ship banking, nose orientation, and weapon mount animation must agree with the aim and velocity.

Hyperspace is a **short, committed high-speed maneuver through the world**, not teleportation. Begin with a brief direction preview/windup, then a fixed-duration burst and recovery. A pilot can use it to intercept a drifting crystal, escape an enclosing formation, or cross a route before fresh mines arm. It does **not** grant invulnerability or permit travel through obstacles. Use swept collision so neither mines nor crystals are skipped between simulation steps. Prevent input drift from rotating a committed burst after it begins.

Use a visible energy ring beside the ship or a single readable HUD bar. Denied activation gives a brief low-energy cue; holding the trigger must not automatically spend every newly regenerated unit. Require release and a fresh press for the next burst. Normalize diagonal vectors. If the stick is neutral, use the aim/facing direction consistently and show it in the preview. A checkpoint, retry, or device loss clears pending activation.

Hold fire for an even cannon cadence. Bullets have a readable lifetime and consistent collision shape. Fire cannot pass through the carrier, decorative ship hulls designated solid, or fragile crystals. Decorative debris is non-colliding unless the mission data explicitly marks and telegraphs it as a hazard.

### Rescue and friendly fire

Crystals drift along authored or seeded trajectories, with a visible captive silhouette and a brighter rescue collar. Entering the collar instantly rescues the captive: one authoritative event breaks the shell, brings the survivor aboard in a short light trail, updates the count and score, and plays a distinct rescue phrase. The animation may continue after the logical rescue has completed.

Crystals take several player laser hits before shattering fatally. An early hit changes their appearance and gives a warning cue, giving the player time to stop firing. Do not allow a single accidental frame to erase the first tutorial captive. Aim assistance and automatic targeting favor enemies and explicitly avoid aiming through crystals. They do not make crystals immune to deliberate fire. The operation’s opening demonstrates the distinction safely; the same rule applies to the boss’s released prisoners.

Resolve same-tick rescue, laser damage, and hostile collision in a documented stable order. Recommended rule: a valid rescue contact secures the captive before subsequent damage events against that crystal; ship damage still applies normally. Remove rescued and destroyed crystals from collision participation immediately. Tests must prove that animation, duplicate packets, and lingering projectiles cannot award them twice.

### Threat vocabulary

| Role | Behavior | Telegraph and response |
| --- | --- | --- |
| Mine-layer | Traverses or circles outside the rescue lane and lays an identifiable constellation of mines | Its silhouette and pulse match the mines it owns. A clear laying animation precedes deployment. Destroying it disarms and dissolves its surviving linked field, creating an obvious rescue route. |
| Interceptor | Makes readable attack passes and fires a small aimed pattern | Show its entry route before arrival; give its aiming flash enough lead for ordinary movement. It pressures position while the player decides what to rescue. |
| Crystal guard | Occupies a useful approach lane and protects a high-value rescue opportunity | Its shield/attack cycle has a visual opening. Flank it, wait for the opening, or use a clear hyperspace route. It must not require a new weapon. |
| Prison carrier | A boss composition of the same organs, field ownership, guard windows, and rescue trajectories | Establish phase changes through large silhouette changes and exposed components. No unannounced final mechanic. |

Mines have explicit **deploying → arming → active → disarmed/destroyed** states. Inactive mines cannot damage the ship. Use at least a curtain with a gap, an expanding ring, and a trailing arc. Match pattern shape and movement to an understandable escape route. Show incoming edge threats before they can collide; never spawn an active damaging entity on the ship or inside the first rescue collar.

The carrier has three readable phases: disable outer field organs, rescue the released captives while its pattern changes, then attack the exposed core. The rescue phase always provides a replacement route if a required prisoner is lost. Reserve safe steering space for the extraction. Test carrier death and player death on the same simulation tick and choose one explicit result precedence.

### Score and balance

Use the source’s 20/5/1 rescue/ship/mine values as the base. Add a modest, clearly explained rescue-chain multiplier capped at four and a finale completion award. A chain increases on successive rescues within its visible window; damage or a captive loss breaks it. Do not let mine farming outweigh rescue or let replacements manufacture unlimited rank. The results screen explains rank through rescued count, losses, and score without inventing an opaque rating.

Put important values in one validated balance configuration. These are starting values for playtesting, not immutable targets:

| Variable | Starting direction | Expose live? |
| --- | --- | --- |
| Conventional speed / acceleration | Cross roughly one screen width in five seconds; responsive braking | Yes |
| Hyperspace speed / active duration | About 3× normal speed for 0.45 seconds | Yes |
| Hyperspace cost / regeneration | 60 of 100 energy; about 24 energy per second after a short delay | Yes |
| Hull / damage grace | 3 hits; about 1 second of grace | Yes |
| Cannon cadence / damage | About 8 shots per second; 1 base damage | Yes |
| Rescue collar / crystal integrity | Forgiving contact collar; approximately 3 laser hits to lose a crystal | Yes |
| Mine arming / enemy warning | About 0.8 seconds / at least 1 second initially | Yes |
| Enemy health / pressure / boss health multipliers | Start at 1; tune against the whole operation | Yes |
| Aim-assist cone | A small visible/optional assist, stronger on touch | Yes |
| Music gain | 0.10 initial user setting | User settings |

Validate ranges and normalize values after edits. Changing maximum hull must define what happens to current hull. Apply time scale, invulnerability, or spawn cheats only to the intended test context. Record the shipped defaults separately so Reset actually restores the authored balance.

## Controls and ten-foot UX

Build a semantic action layer and role resolver before content expansion. Keyboard, mouse, gamepad, touch, bot, and remote input all produce the same actions. World rules must never inspect a DOM event or a gamepad index directly.

### Solo and shared-ship authority

| Action | Solo standard pad | Keyboard/mouse | Shared-ship ownership |
| --- | --- | --- | --- |
| Conventional movement | Left stick | WASD; arrows as an alternate | Pilot |
| Cannon aim | Right stick | Mouse position projected into world space | Navigator when joined; otherwise pilot |
| Fire | R2; an accessible face-button alternate | Hold left mouse button; Space alternate | Either seat fires the one cannon at its existing cadence |
| Hyperspace direction and commit | Left-stick direction + fresh L2 press | WASD direction + Shift | Navigator’s left stick + L2 while joined; otherwise pilot |
| Confirm / back | Cross / Circle | Enter or click / Escape | Focused UI owner |
| Pause | Options | Escape | Standalone pauses; online opens only that seat’s local overlay |

Provide a short role card when a second player joins: **Pilot: steer and fire. Navigator: aim, fire, and hyperspace.** During conventional flight, the navigator’s stick sets a non-moving hyperspace preview; the pilot’s normal steering remains active. Committing the preview temporarily grants burst steering to the navigator. Show the committed vector and drive state to both people. There is never a vote between conflicting movement vectors or ambiguous “last packet wins” authority.

Two pads, or keyboard/mouse plus one pad, support standalone couch co-op. A single pad remains a complete solo controller. Join/leave must preserve the current mission; when one seat disconnects, the remaining seat immediately receives all solo actions, including aim and hyperspace. Support a deliberate role swap from standalone pause. In Hub sessions, assign roles deterministically from the initial roster: first seat pilots, second navigates, and a sole remaining seat receives solo control. Do not add a pre-round role-selection menu that conflicts with Hub start rules.

Mouse aiming must genuinely aim, hovering must move menu focus, and clicking must activate the hovered control. Keep the same screen hierarchy on TV, PC, and touch. Offer control help appropriate to the current seat. Use last intentional input to choose prompts, filtering dead-zone stick noise and synthetic pointer movement. Default controller glyphs to PlayStation and provide the required Xbox glyph setting. Prompt labels must honor rebindings.

Keep the main HUD to hull, hyperspace energy, rescue objective, and score/chain. Add a thin directional rescue scanner only when a target is outside the visible field. Do not build a dense tactical dashboard. At 1920×1080, aim for roughly 28–32 physical pixels for normal text, larger menu actions, generous spacing, a visible focus outline, and safe margins. Use icon shape and movement as well as color to distinguish safe rescue targets from armed threats. Reduced motion disables strong shake, flashes, and excessive warp distortion while retaining mechanical tells.

### Touch

Keep a persistent menu affordance and otherwise a clear playfield. The left contact creates an invisible floating movement stick. A right contact can aim; enemy targeting and automatic fire provide a practical one-thumb fallback, with safeguards against crystals. Display a temporary, contact-sensitive hyperspace button/preview near the right thumb when a burst is available and relevant. Touch can still request a burst at any time through its documented gesture; a context suggestion must not withhold a mechanic.

Track pointer IDs, assign each contact once, support steering and hyperspace simultaneously, handle cancellation, and prevent page scrolling/zooming inside the game. Releasing or cancelling all contacts clears movement and fire. Touch assistance changes input assistance, not collision immunity, rescue credit, or objectives. Include a simple assistance toggle in settings. Test the same layouts in phone and tablet profiles in both useful orientations.

## Front end, attract, tools, and saves

The standalone front end contains Play Operation, Evasion, local co-op join/help, Settings, and About/Credits. Show one clear default action and avoid nested setup screens. Pause contains Resume, Controls, Settings, Developer Tools, checkpoint retry/restart where valid, and a return action. Destructive-in-context actions such as abandoning the current run should be deliberate and controller-operable.

After **10 seconds without input on the title/front-end menu**, begin a looping AI demonstration. It must show a rescue, a hyperspace intercept, a field collapse, co-pilot-style coordination, and a glimpse of the carrier, using the real presentation and simulation. A cheat-enabled bot or scripted replay is acceptable. The demonstration uses an isolated run context and never writes progression, scores, settings, or Hub results. Any key, gamepad action, pointer movement/click, or touch exits it; consume that activity so it cannot also start or shoot in a new game. Ignore input-device noise. Reset the idle timer on legitimate activity; do not interrupt a settings slider being adjusted. The demo works silently before the browser permits audio.

Developer Tools is reachable from pause and fully navigable with a pad. Include live balance sliders with numeric values and Reset Defaults, sector/checkpoint selection, restart from seed, invulnerability, energy refill, controlled enemy/crystal spawns, collision and ownership overlays, one-step advance while paused, and standalone time scale. Display the current seed, mode, objective, role ownership, and a compact recent-event log. Make these tools operate on the same configuration and commands used by normal play, rather than a hidden second game.

In a Hub round, keep the developer screen reachable but restrict ordinary participants to read-only diagnostics; disable mutation/time-scale controls with an explanation. Developer mutation tests run in standalone or an explicitly controlled harness. Do not allow one participant to change the shared difficulty privately.

Save standalone settings, best scores by mode, assistance preferences, and a versioned resumable checkpoint. Store a seed and compact checkpoint data, never DOM nodes, audio objects, or renderer state. Handle denied storage and malformed/old saves with usable defaults. Checkpoint resume is offered explicitly, and a clean new run remains possible. Attract runs and debug-modified runs cannot overwrite ordinary records. Hub sessions start from session rules and isolated storage, regardless of standalone progress.

## Engine foundation and implementation architecture

Planner inspection found **my-3D2dge v0.89.1**, commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Reconfirm the handoff and record the revision actually used. Start by reading its README, API card, AI guide, shooter kit, asset documentation, shell/settings code, arcade code, and headless test example. Then inspect additional implementation modules as needed. [Handoff](https://github.com/michaelcrosato/my-3d2dge/tree/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff), [API](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API.md), [shooter kit](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/kits/shooter.js)

Use the **full dependency-free engine**, not the agent edition whose asset-shape rendering is omitted. Adapt the horizontal shooter example. For this engine, `view: 'overhead'` gives the x/y flight plane even though the art depicts spacecraft side-on; `view: 'side'` is an x/z platformer plane. Choose the mathematical plane deliberately and use it consistently in aim projection, collision, bullets, camera, debug overlays, and network state. [Engine AI guide](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/AI_GUIDE.md)

Reuse native `E.Game`, `E.Bullets`, pattern/path helpers, rendering, palette ramps, particle/lighting tools, input actions, settings, and `E.Shell` with its TV theme. Reuse native code-drawn asset and animation conventions. Adapt the starter content into this game rather than shipping the shooter kit’s existing campaign with new labels. A continuous horizontal sector with explicit beginning/end and optional backtracking is sufficient; world wrapping is unnecessary. If wrapping is later chosen, wrap-aware collision and camera logic must accompany wrapped drawing.

The engine already provides much of pause, rebinding, pointer focus, glyphs, safe areas, controller disconnection, focus-loss clearing, and touch menu access. Verify and extend these rather than creating competing handlers. `game.allowJoin({max:2,onJoin})` supports simultaneous local input, but **`E.Arcade.start(2)` is alternating-turn play**. Do not confuse it with shared-ship co-op. Set arcade idle time explicitly to 10; its default is 20. Audit its “any input” detection and add the missing activity hooks. [Arcade implementation](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/modules/arcade.js)

Suggested file responsibilities, all dev-relative:

```text
vendor/                 inspected engine and unmodified Hub client/harness files
src/main.js             boot, dependency order, standalone/session lifecycle
src/config.js           validated defaults and live tuning schema
src/sim/                world, flight, collision, combat, rescue, mission director
src/content/            sector data, formations, boss phases, strings
src/input/              semantic actions, role ownership, device/touch adapters
src/net/                Hub lifecycle, intents, snapshots, event reconciliation
src/presentation/       camera, native assets/animation, effects, HUD, screens
src/audio/              code-defined instruments, music patterns, effects, voices
src/dev/                tools and compact observable state
tools/                  bundling, verification runner, browser driver
tests/                  deterministic scenarios, playthroughs, integration checks
docs/                   requirements map, research, decisions, issue ledger
artifacts/              review screenshots and verification evidence
```

These are responsibilities, not a demand for one file per noun. Keep modules understandable and integrate continuously. A small set of explicit systems is preferable to a generic ECS framework built for imagined future games.

### Authoritative state and boundaries

Run one fixed-step simulation using the engine’s 1/120-second stepping model. State includes run/sector/phase, tick, seed and RNG state, ship hull/energy/drive phase, role assignments, entities with stable IDs, mine ownership, rescue/loss ledger, score/chain, timers, and terminal outcome. Rendering and audio consume state/events without advancing rules or generating gameplay randomness.

Every simulation step accepts normalized per-seat intentions. Validate inputs, resolve role authority, advance movement, perform swept collision/combat/rescue resolution, update objectives, and emit numbered presentation events in a stable order. Separate world RNG from cosmetic RNG. Never reseed a generator every frame or replace global `Math.random` as a multiplayer shortcut.

Keep explicit state machines for the run, ship drive, mines, crystals, and boss. A terminal result is latched once. Declare which values reset on checkpoint retry, sector entry, attract exit, return to title, and Hub end. Scene fades can be presentation-only; they must not silently delete required mission timers. The engine’s normal scene transition clears ordinary timers/scripts, so inspect lifetimes instead of assuming persistence.

Expose a compact game-owned debug interface for tests: read-only snapshot, semantic action injection, deterministic advance, and narrowly scoped fixture setup. Names are your choice; they are not undocumented engine APIs. Include run ID, tick, seed, sector/phase, entity counts, objectives, rescue IDs, ship health/energy, score, outcome, and last error. Tests can inspect this interface, while their full playthrough must still progress through actual gameplay actions.

Mission data describes spawn positions/paths, warning periods, formations, mine ownership, rescue trajectories, quotas, transitions, and checkpoint defaults. Supply a validator and a developer selector/preview for these definitions. Changing a formation, enemy health, rescue count, or briefing line should not require editing the simulation. This is the designer foundation for extending the game after the slice.

## Art, animation, and sound direction

The native engine’s code-drawn, shaded retro-modern pixel look is the foundation. Create a compact rescue craft with a recognizable nose, visible cannon mounting, animated engine vanes, and contrasting hull/drive highlights. Design mine-layers around a pulsing radial silhouette, guards around an unmistakable defensive shape, and captives around violet crystal facets enclosing a readable human silhouette. Make the carrier a large composition of authored native parts, with exposed systems that visibly correspond to its attacks.

Use a restrained role palette: warm player hull, cool thrusters, violet rescue crystals, and sharp hostile warning colors. Separate active mines from stars by shape, animation, outline, and motion. Layer distant constellations, orbital structures, nebula bands, prison fragments, and evacuation signals behind the action. Generic engine props are appropriate background dressing. Author new ship/crystal/foe assets rather than disguising generic library props as the game’s principal actors. Lighting, particles, and detail should emphasize these forms without obscuring a rescue collar or collision edge.

Use native pose/part/animation mechanisms for banking, recoil, thruster response, hyperspace stretch, mine deployment, crystal fracture/opening, captive boarding, boss organ damage, and carrier breakup. State-driven animation should respond continuously to motion and aim rather than cycling an unrelated idle sprite. Keep logical collision readable during distortion. Hit flashes and sounds confirm accepted damage, never merely a near miss. A mine-layer collapse should visibly travel through its linked field so players learn the ownership relationship.

Audio is entirely synthesized in code: music, effects, and gibberish voices. Use the engine’s synth/instrument and music facilities as the base; extend with Web Audio where required. Do not load audio files, soundfonts, recorded speech, or browser text-to-speech. Use short original radio syllables with different pitch/formant rhythms for pilot, navigator, and rescued people. Pair meaningful radio events with concise visible text.

Write an original repeating pulse/arpeggio theme with layers for open flight, threat, rescue relief, and the carrier. Supply a short victory resolution and failure cadence. Effects need distinct envelopes for the cannon, arming mine, field collapse, crystal warning, rescue, warp preview/commit, hull damage, and UI focus/activation. Limit repeated radio chatter and prevent overlapping alert spam through event priorities.

**Initial music volume is 10%.** The engine’s default is higher, so explicitly set the initial saved-setting default and apply the music bus gain. Preserve subsequent player settings. Expose separate master, music, effects, and voice controls. Audio startup waits for a legitimate user gesture; muted and pre-gesture attract states still function. Pause/end must stop or suspend the intended sources and clear stale scheduled voices.

## AI Hub and standalone multiplayer

Planner inspection found Hub protocol v1 and session client v1.4.0 at commit `35a1047f2067b2af3de3943f0fe452f39105d869`. Re-read the current supplied contract before integration and record your actual revision. Implement **shared-world**, not parallel scoring or a cosmetic ghost. [Protocol and API](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md), [client](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/session.js), [shared-world example](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/examples/arena.html)

Scope multiplayer honestly: **standalone solo and 1–2 player couch co-op; remote shared-ship co-op through AI Hub**. The supplied client does not provide a standalone room-discovery or signaling service. Do not display a pretend room code, Internet lobby, or inactive Join Online button. The standalone game is fully playable outside the Hub, including its real local multiplayer. If your own brief explicitly adds standalone Internet rooms, implement a verified transport/lifecycle for that requirement rather than inventing a Hub method.

### Boot and lifecycle contract

- Inline the supplied `session.js` unmodified, once, as the first script in the document head immediately after the character-set declaration. Preserve the banner and exact library text through bundling. Add `hub:session=1`, `hub:session-players=1-2`, `hub:session-mode=shared-world`, and meaningful goal/how-to/duration metadata using the protocol’s actual tags.
- Call `AIHub.connect({mode:'shared-world', seats:[1,2]})`. A null result selects ordinary standalone boot. A live result selects the session adapter and uses its seed, roster, host, and lifecycle.
- In a session, skip the title, attract, difficulty selection, and press-start screen. Load the playable state and call `AIHub.ready()` once without requiring a gesture. Use the Hub’s supplied introduction card.
- Register `start`, but begin simulation only when `AIHub.time() >= 0`; the event arrives before actual play. Honor the Hub’s round clock and seed. Session state cannot depend on standalone unlocks or saves.
- Handle an authoritative server copy with no local player: `info.server === true` can make `info.me` absent from the roster. It must load, ready, simulate, and finish without a player input, audio unlock, or rendered camera.
- On time-up, the host resolves the team outcome and calls `finish` within the allowed grace period. On end, stop control capture, simulation, network sends, and sound. Leave the session results and subsequent round navigation to the Hub.

### World ownership and messages

Only the authority advances objectives, enemies, damage, rescues, score, and completion. Client devices send their own normalized intentions. The Hub supplies authenticated seat identities; the game derives their roles using the assignment rule above. Never trust a claimed sender or role in a payload. The host's local input enters the same queue directly because a copy does not receive its own messages.

Define versioned, compact schemas for input intent, world snapshot, and important events. Include session/run ID, sender sequence, relevant tick, drive phase, ship state, entity IDs and ownership, mission progress, and event sequence. Reject stale/out-of-round intents, invalid numbers, illegal role actions, and implausible values. A repeated rescue or death event cannot duplicate a reward. A newly synchronized client can reconstruct the complete visible mission from a current snapshot.

`AIHub.send(data,{to,reliable})` accepts plain JSON, with confirmed limits of **16 KB per message and 20 sends per second per copy**, with a burst allowance of 40. Rendering has no performance target, but protocol limits still apply. Start around 12 input updates and 10 state updates per second; reserve message headroom for transitions. Assert actual serialized byte sizes and handle a false return from `send`. Do not send every entity event as a separate high-frequency message. Keep unreliable packets small; payloads around/below 1,200 bytes avoid the documented fragmentation issue. Use reliable delivery for critical transitions or include their latched state/event IDs in repeated snapshots. [Message contracts](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md)

Predict local ship response where helpful and reconcile to authority; interpolate remote world presentation. Prediction never awards a rescue or changes the actual outcome. Retain one labelled `AIHub.rng('world')` stream or an explicitly seeded equivalent; repeated calls to `rng(label)` create fresh streams and are not a per-frame read operation.

For non-host departure, transfer missing role authority to the remaining player, clear stale controls, and continue. A host departure voids the round according to Hub rules; do not build speculative host migration. Construct the engine game with `live: true` in Hub mode so native pause, focus-loss, and disconnect handling cannot privately freeze the shared simulation. Local settings overlays suppress only that player's commands while the shared world continues. Reserve Create + Options for the Hub, and ignore the game's Options action while Create is held. No custom chat, voice chat, emotes, name entry, navigation, new tabs, or private restart controls inside sessions. Insert Hub names as text.

On team victory or failure, the host calls `AIHub.finish()` exactly once with every remaining teammate represented exactly once, a tied cooperative standing, numeric team scores assigned appropriately, and the correct `won` flag. The tied standing is a nested array: `standings: [remainingIds]`; provide `scores` keyed by those IDs, assigning each the team score. Include per-ID rescue/loss statistics using the documented `stats` shape. Do not use `result()` or `progress()` as a substitute for shared-world completion. Test normal completion, hull failure, time-up, and terminal-event races.

## Production sequence and exit gates

Work in integrated passes. If delegating, give bounded modules clear ownership, establish input/state/event schemas first, and reserve one integrator for scene lifecycle and the final HTML. Use isolated worktrees where a git repository makes them appropriate. Shared resources and nearby agent folders are not part of this project.

1. **Contract and reference pass.** Read the brief, source references, engine code, and Hub protocol. Choose the title through the required RNG process. Record research, versions, requirements, state contracts, and completion/failure rules. Establish the bundler and quiet verification command. Gate: a single HTML boots through both standalone detection and the Hub lifecycle without fake menu options.
2. **First real rescue.** Implement native ship/crystal assets, normal flight, aim/fire, hyperspace, swept collisions, rescue/loss events, and a tiny authored encounter. Include pad, keyboard/mouse, touch, shared-ship local roles, and observable state now. Gate: two people can control the same craft; the same rescue rules pass headlessly and in the exported browser page.
3. **Shared-world pass.** Attach the authoritative adapter, synchronize the tiny encounter, and support server-only authority, departure, time-up, and one terminal result. Gate: two session pages agree on ship, rescue IDs, damage, and score; protocol harness passes. Fix role/control issues before generating a campaign around them.
4. **Mission systems and content.** Add data-driven formations, enemy roles, ownership-based field collapse, checkpoints, replacement rescues, the three sectors, boss, extraction, and Evasion. Gate: ordinary action-driven scripts complete the operation and Evasion, and failure/retry cannot soft-lock or farm duplicate credit.
5. **Complete front end and tools.** Finish attract, settings, role help, developer sliders/tools, save/resume, results, About/Credits, and all device prompts. Gate: every screen is reachable with a pad; attract starts/exits correctly; no dead buttons or unsupported modes are advertised.
6. **Art, sound, and pacing pass.** Complete original assets and native animations, final backgrounds, procedural music/effects/gibberish, telegraphs, ten-foot composition, and reduced-motion behavior. Play the entire operation at normal speed. Gate: rescues, hyperspace, and field collapse read clearly during the busiest encounter; the ending feels earned and complete.
7. **Delivery pass.** Bundle the exact final artifact, run affected checks on that artifact, validate the required metadata and feedback, and inspect the finite visual review set. Gate: the delivery opens outside the dev server, all required modes are represented in evidence, and the final report matches what was actually built and tested.

Do not leave multiplayer, touch, or packaging to a last-minute optional pass. If a complex presentation choice threatens completeness, simplify that choice while preserving the required behavior. Every listed feature ships working; remove speculative unimplemented choices from the UI and plan record rather than leaving placeholders.

## Verification and evidence

Provide **one command**, for example `node tools/verify.mjs`, which runs the relevant native, browser, audio, and Hub checks. On a successful run it prints only a one-line count; on failure it prints the failing check and actionable details followed by that count. Capture verbose child-tool logs into dev-local artifacts and expose them only for failures. Return a nonzero exit code on failure. Track test dependencies so a rerun follows a change to covered code; do not repeatedly rerun unchanged checks merely to accumulate evidence.

Use fixed seeds and the engine’s native headless mode for most checks. `new E.Game()` can run in Node; `{draw:true}` exercises drawing through a stand-in and `game.advance(seconds)` advances 1/120-second fixed steps. Check `game.errors`. Native drawing checks do not prove the browser looks correct. Account for scene fades in tests; avoid confusing a pending fade with a broken transition. The engine browser checker emits verbose logs, FPS information, and screenshots by default: adapt its functional checks into the quiet runner, and do not turn its FPS output into an acceptance requirement. [Headless example](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/game/test.mjs), [browser checker](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/tools/check.mjs)

### Required automated coverage

| Area | Checks that establish correctness |
| --- | --- |
| Boot/package | Final HTML opens from `file://`; no local-module fetch dependency or missing asset; session client appears exactly once and unchanged; errors/rejections and engine errors fail the run. |
| Flight and combat | Device actions produce equivalent intentions; diagonal movement normalized; burst commit/energy/release rules; swept collision at burst speed; damage grace; crystal warnings/loss; one cannon cadence with two fire buttons. |
| Rescue and objectives | Exactly-once rescue/score; same-tick event priority; destroying a layer clears only its linked mines; arming mines harmless; off-screen warning precedes damage; lost mandatory targets trigger a reachable replacement. |
| Progression | Seeded, action-driven operation from opening to extraction and ending; all enemy roles and boss phases encountered; Evasion completion with the cannon unavailable; death, retry, resume, and fresh run restore their correct state. |
| Cooperative roles | Two standard-pad stubs, keyboard/mouse + pad, join/leave, role handoff, conflicting intentions, pilot movement during navigator preview, and one-ship state after a disconnect. |
| Front end | Pad-only path through every screen, pointer hover/focus and clicks, input-family prompts, Xbox setting, rebinding, pause/resume, storage failure, safe new run, and settings persistence. |
| Attract | No start before 10 seconds; start at the threshold; loop; exit for every input family including pointer activity; exit event consumed; no score/save contamination. |
| Touch | Phone/tablet profiles, multi-contact steering/aim/burst, cancellation and release, contextual control, menu entry, no stuck command, and crystal-safe automatic targeting. |
| Audio | Render representative phrases with OfflineAudioContext or measure an AnalyserNode; finite, non-silent output where expected, bounded peaks, correct bus gains, 0.10 default music, mute/pause/end cleanup, and no fetched audio files. |
| Tools/content | Sliders change the live variable they name; reset restores shipped defaults; scenario selection, seed, single step, and overlays work; invalid mission references fail validation; online mutation controls are disabled. |
| Hub world | Identical authoritative rescue/loss ledger and outcome across pages; authenticated seat enforcement, stale intent rejection, duplicate-event handling, valid snapshot recovery, message-size/rate compliance, solo roster, and no-local-player server host. |

The full playthrough driver must steer, aim, fire, and activate hyperspace through the normal action interface. It may use world observations for decision-making but must not set objectives completed, teleport past encounters, call a victory function, or enable invulnerability. Use separate fixture-based tests for rare edge cases. If the ordinary full run cannot win without cheats, investigate encounter design or the driver rather than relabeling a state-injection test a playthrough. The attract bot is allowed to cheat and stays separate.

### Hub conformance and browser review

Download the Hub harness with its companion bridge and round files into the dev-local vendor area. Serve from `127.0.0.1` on an OS-assigned port and construct the game URL relative to that harness. Use its `players=2&auto=1` case, an impaired-network case with `latency=150&jitter=50&loss=5`, `scenario=host-leave`, and `players=2&scenario=server`. Also test a one-player session. Wait for `document.body.dataset.complete === 'true'` and require `window.__hubCheck.pass === true`; treat relevant Hub warnings as failures. Declaring 1–2 seats does not require inventing four-player gameplay. [Harness](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/harness.html), [checker](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/scripts/hub-check.mjs)

The harness’s synthetic movement is protocol coverage, not a substitute for a real two-page co-op rescue/completion script. Add that script and assert shared mission state. In every browser test, confirm the page’s game identity/build marker before trusting a result. Use the installed browser/test runtime described in your own environment; do not reinstall browsers. Keep one or two browser processes at most, use headless mode or the documented virtual display, and close resources reliably.

Use screenshots only for judgments state cannot settle: title composition, TV readability, a representative rescue/warp, the busiest minefield, the carrier, pause/tools, and a touch layout. Inspect at 1920×1080 and a narrow touch viewport. Look for focus visibility, glyph legibility, misleading collision edges, clipping, safe margins, effects obscuring targets, and text that becomes too small. A blank software-rendered capture is not evidence that the simulation failed; investigate rendering separately. Do not create FPS gates or an optimization backlog.

Maintain an issue ledger with unique defects, severity, detection method, fix, and confirming check. Count unique defects rather than counting every repeated failure. Use that evidence for the required testing feedback. If a category was not tested, report it plainly.

## Bundling, reporting, and final definition of done

Inline the full engine, unmodified Hub client, original asset definitions, music/instruments, styles, and game modules into the one final HTML. Keep development sources and tests modular. The build must need no adjacent source files at runtime. External dependencies are allowed by the brief, but this engine and this asset direction permit a self-contained artifact; prefer that simpler deployment. Preserve the Hub client placement and bytes. Escape embedded closing script sequences in engine, asset, and game-source strings/comments without rewriting the byte-preserved Hub client. Verify the generated document in a browser, not only the source template.

All created caches, downloads, intermediate builds, logs, and screenshots stay in your development directory. Do not use shared temporary or neighboring agent folders. Prefer `file://` and native headless tools. If a server is required, bind loopback on an OS-selected port, retain its PID, verify page identity, and stop only the process you started. Never kill arbitrary port owners or use broad process-name termination. Do not modify global tool installations to make this project run.

Use one canonical reporting data object to populate the in-game About/Credits and delivery metadata. Populate source information from your actual build and your own brief: source, actual plan filename, genre/perspective, engine/library revisions, art and animation methods, synthesized music/effects/voices, actual online features, permitted testing parameters, research actually performed, environment, and model. Use **unknown** where you cannot confirm a fact. Usage is exactly **added on import**; do not estimate cost, time, or tokens.

The About/Credits must include the four required groups: **Source Information, Testing Feedback, Engine Feedback, Prompt Feedback**. Make them readable as controller-navigable pages. Include concrete answers to every feedback question in the original order, not empty headings or a link to the console. The final chat must include those same four groups. The root metadata artifact must match the exact schema, keys, feedback-array ordering, and catalogue enums from your own brief, including the game title, honest player count, one-line controls, concise description, and 3–6 lowercase tags. Validate parsing and required values programmatically. Keep the planner’s separate interview distinct from the builder’s delivery feedback; planning research is not implementation/testing evidence.

Final acceptance requires all of the following:

- A fresh player can start with one standard pad, understand the first rescue, use hyperspace intentionally, and complete a coherent operation with a real ending.
- Standalone solo, couch co-op, Hub shared-world co-op, keyboard/mouse, and assisted touch work through the same mission rules and screen hierarchy.
- Every implemented mechanic appears in the operation or the accessible Evasion challenge; the finale recombines taught skills.
- The title/front end enters attract after 10 idle seconds and exits on any meaningful input without contaminating progress.
- Native engine art and animation have been extended with original source-specific assets and motion; every sound is generated in code; initial music volume is 10%.
- Pause-accessible developer tools, live tuning/reset, settings, help, failure/retry, results, saves, and About/Credits are complete and tested in their valid contexts.
- The final exported HTML and Hub integration pass the relevant checks, the full scripted playthrough reaches the ending, and visual evidence answers the questions scripts cannot.
- Required reports are consistent and valid, with no TODOs, placeholders, stub features, dead controls, invented API claims, or unverified completion claims.
