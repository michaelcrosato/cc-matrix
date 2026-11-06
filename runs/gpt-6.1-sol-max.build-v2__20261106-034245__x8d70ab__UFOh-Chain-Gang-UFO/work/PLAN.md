# Game direction and build plan

This is the handoff for gpt-6.1-sol at ultra reasoning effort with a 1.05M-token context window. Build a finished, original arcade game inspired by **UFO! (Odyssey², 1981)**. Use the context capacity to maintain a coherent picture of the rules, authored encounters, presentation, multiplayer protocol, and verification evidence. Carry the work through implementation, tuning, final-file validation, and the required reporting. There is no artificial time, token, feature-count, or rendering-performance target in this plan.

The builder owns the game's title. Follow your own brief's instruction to silently brainstorm 50 playful riffs on the source name and select one with an actual random-number generator. This plan supplies no candidates. Use your own brief's development-folder and final-artifact naming rules; none of its run-specific names are prescribed here. **All implementation paths below are relative to your chosen development folder.** Publish the finished single HTML artifact and builder interview at the enclosing delivery location required by your own brief.

## 1. The game we are making

Make a **fixed-arena, multidirectional arcade shooter**, seen through a stable overhead camera, about piloting an overconfident little saucer through a field of hostile space machinery. Its central decision is immediate and visible: **keep your shield ready to ram safely, or fire the cannon and commit to an exposed recharge window**. Your cannon's bright aiming bead travels clockwise around the shield ring. Explosions can propagate through a carefully arranged cluster, turning one good shot into a spectacular cascade.

The player should understand the premise from the title-screen demonstration, learn the shield tradeoff by doing it, then discover how drifting enemies, merging pursuers, crossing gunships, and a final command craft interact. The demo has an authored beginning, escalation, climax, victory, defeat, and immediate replay. Target roughly **8–12 minutes for a successful first mission**, with pace determined by play and encounter completion. A replayable score-attack mode reuses the complete encounter vocabulary.

Support one player, two players sharing the screen locally, and one or two players in an AI Hub shared-world session. Co-op introduces mutual rescue and coordinated chain ownership while retaining the same movement, cannon, shield, enemies, and mission. The source's sparse, enthusiastic space-defense tone should guide the writing: short commands, outsized confidence, readable mechanical threats, and a little absurdity. Keep dialogue brief enough that the action carries the experience.

### Pillars and their visible proof

| Pillar | What the player experiences | What proves it works |
| --- | --- | --- |
| Attack spends safety | Every shot or shield impact visibly empties the defensive ring; recovering speed and protection has a clear finish | A player can predict exposure without reading a number |
| Aim has character | A distinct white bead orbits clockwise toward the requested bearing | Shooting while moving sideways feels intentional and learnable |
| Enemies make situations | Drifters merge into pursuers; crossing craft threaten lanes; blasts connect clusters | Encounters change because of interactions, beyond increasing spawn counts |
| Readable spectacle | Volumetric pixel art, sharp silhouettes, expanding chain effects, a responsive saucer | The ship, shield state, and next danger remain legible during the busiest cascade |
| One complete arcade experience | Guided first encounter, full mission, co-op, score attack, attract, settings, dev tools, credits | Every offered screen and mechanic reaches a working outcome |

## 2. Research and adaptation boundaries

### Resolved source identity

The 1981 source is **UFO!**, published for Magnavox Odyssey² and known in Europe as **Satellite Attack / Videopac 34**. The [archival game record](https://odyssey2.info/db/game/ufo-49) identifies the year, programmer Ed Averett, and regional equivalents. Use that identity in the game's source information.

Read the [original manual](https://odyssey2.info/library/manuals/us_ufo/UFO%20%28USA%29.pdf), especially its play and scoring pages. It establishes directional movement, unlimited cannon ammunition, a rotating aiming marker, and a shield depleted by shots or impacts. A recovering ship moves at half speed and is unsafe until fully charged. Threats include drifters, linking hunter-killers, and missile-equipped light-speed craft; their base scores are 1, 3, and 10. An unshielded collision ends the original turn, and its high-score entry accepts six letters. These are the mechanical reference points, rather than an obligation to duplicate every original penalty.

The [archival review](https://odyssey2.info/reviews/ufo-49) describes enemy-destroying chain explosions, rotating symbol-like enemy graphics, a dotted blue defensive ring, and an unusually expressive death sequence. It characterizes the sound chiefly as explosion effects. [Videopac Games' analysis](https://videopacgames.wordpress.com/videopac/34-satellite-attack/) explains the clockwise aiming behavior, collision-created pursuers, and escalating single-screen play; it also calls out recharge and satellite audio cues. These are secondary observations, so distinguish them from manual-confirmed facts in your notes.

The planner inspected the [archival gameplay image](https://odyssey2.info/i/screens/thumbs/ufo-scr.gif): black space, compact bright glyph-like threats, a saucer, an isolated white bead, and a simple score strip. The [regional box illustration](https://videopacgames.wordpress.com/wp-content/uploads/2018/09/videopac-34.jpg) supplies a complementary painted space-age cockpit mood. The original sound has **not been auditioned by the planner**; exact waveforms, music behavior, enemy timings, and collision minutiae remain unconfirmed. Before composing, consult an accessible gameplay recording or other reliable audiovisual reference when possible and record what you can actually verify. Use code-generated original sound in the finished game regardless.

Write a concise source matrix in `docs/research.md`: mechanic/look/sound observation, evidence URL, confidence, and planned interpretation. Record the original's ongoing arena structure; the authored sectors, final boss, forgiving hull allowance, independent aim requests, rescue, and co-op below are **new design additions**. Do not attribute them to the 1981 game. When historical references disagree, favor the manual for documented rules and mark unresolved details unknown. Research should inform implementation without consuming the build in emulator archaeology.

### Establish the required technical foundation

Inspect the actual upstream handoffs before writing gameplay. Research completed for this plan found:

- **my-3D2dge v0.89.1**, revision `8ecc2f62353761187bdfe226f327b7ea5d2eb691`: [handoff README](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/README.md), [API card](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API.md), [arcade starter](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/kits/arcade.js), and [asset format](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/docs/ASSETS.md).
- **AI Hub Session Protocol v1, client v1.4.0**, revision `35a1047f2067b2af3de3943f0fe452f39105d869`: [protocol README](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md), [session client](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/session.js), [shared-world example](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/examples/arena.html), and [harness](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/harness.html).

Fetch necessary files with `gh`, `git`, or HTTP into `vendor/`; record exact revisions and licenses in `docs/dependencies.md`. If using a newer upstream revision, recheck its API and protocol before relying on this plan's signatures. Keep the native engine as the runtime foundation and preserve notices. Its ordinary renderer is procedural 2D with projected world coordinates; the engine name does not require a separate WebGL/Three.js stack.

## 3. Combat rules

Implement these rules as an explicit simulation contract before content production. The numeric defaults are starting balance values; tune them through play and keep the final defaults in one data object.

### Saucer movement and orbital cannon

- Use direct planar steering with a short acceleration/deceleration response. The player's requested direction controls translation; z is visual elevation only. Normalize diagonals and apply controller dead zones. The arena remains fully visible.
- Declare one authoritative arena rectangle in content data, independent of viewport dimensions, native canvas size, device aspect ratio, and resize events. Fit that rectangle into each device's local play area and invert the same transform for pointer/touch aiming. Enemy gates, collision bounds, movement speeds, and encounter positions use this shared coordinate system. The starter's viewport-derived bounds must not leak into multiplayer simulation.
- Use a bounded arena with visible edge rails and warning space outside them. This is an authored adaptation. Ships slide along boundaries, enemies enter through telegraphed gates, and no essential actor or projectile can persist beyond cleanup bounds. Do not inherit wrapping, thrust/turn controls, hyperspace, or asteroid-splitting rules accidentally from the starter.
- Cannon state contains its current bearing, requested bearing, angular speed, and fire cooldown. An explicit right-stick or mouse aim request takes priority; without one, steering supplies a bearing. With no request, preserve the previous bearing. The bead slews **clockwise** to the target at a readable speed, initially about one revolution per second, stopping precisely at its requested direction without oscillation or extra revolutions.
- Display both the real firing bead and a smaller target indicator while they differ. Shots leave from the real bead's bearing. This visible delay is shared across input devices. Avoid hidden instant aim changes.
- Fire on a press and repeat while held, initially around four shots per second. Ammunition is unlimited. Every accepted shot restarts the shield recovery timer, including shots fired while the shield is already empty. Continuous fire therefore commits to continuous exposure. A blocked cooldown does not spend additional charge.

### Shield and damage

Use `READY` and `RECHARGING` shield states, plus a separate hull/invulnerability state. Start with a recharge duration around 1.6 seconds. During recharge, movement speed is 50% of normal. Visual fill can advance smoothly, but protection returns only at full charge. The ring must never visually promise safety early.

When ready, touching a normal enemy destroys it, consumes the shield, and may begin a chain. A shield blocks one hostile projectile and is consumed. A boss body collision consumes the shield and deals a defined ram hit during valid vulnerability windows; it never silently destroys the boss. While recharging, hostile contact removes one hull point. Start the mission with three hull points; a damaging hit gives roughly one second of clear invulnerability and separation from the contact. Use an outline/strobe pattern compatible with reduced-flash settings. Do not leave a body continuously taking contact damage each update.

Resolve events in a documented deterministic order. Capture whether the shield was ready at the start of a contact batch; a consumed shield cannot destroy an entire overlapping crowd for free. Give a very short contact-resolution grace, initially about 0.1 seconds, so simultaneous overlaps cannot immediately consume both shield and hull before the player sees the state change. Distinguish this from the longer hull-damage immunity. Swept projectile collision and stable entity IDs prevent tunneling and duplicate kills. Destruction, score award, and removal each happen once.

At zero hull, enter a brief readable wreck sequence. Solo ends in defeat. In co-op the wreck stays as a rescue target while the partner is alive: contact with a **ready shield** revives the wreck with one hull and consumes the rescuer's shield. Make the contextual rescue cue appear only while usable. Both players down means defeat. A rescued ship receives normal damage immunity. No extra rescue currency is needed. Explain rescue before its first consequential use.

### Threats and chain reactions

| Threat | Behavior and silhouette | Telegraph / counterplay | Interaction role |
| --- | --- | --- | --- |
| Drifter | Slowly tumbling plus/cross satellite with a predictable local drift | Large readable core; enough room to maneuver around clusters | Ramming target, shot blocker, chain fuel; two eligible drifters can merge |
| Hunter-killer | Two drifters draw together and become a sharp, ringed pursuit unit | Connecting tether and fusion pulse, then a brief arming delay; pursuits have a bounded turn rate | Forces movement and rewards a timed shield ram |
| Light-speed gunship | Distinct elongated saucer crosses a declared diagonal lane | Edge warning and lock line before its missile volley; projectiles have clear trajectories | Punishes careless exposure; its fire can hit drifters, changing the field |
| Command craft | Large segmented original boss built from the same visual grammar | Exposed emitter windows, lane tells, and a visible phase transition | Combines the three ordinary behaviors into the mission's examination |

Data defines enemy movement, hit shape, score, merge eligibility, arming delay, attack timings, and destruction effects. Drifter fusion consumes both originals and creates one pursuer at their midpoint after a visible windup. Already-dying objects cannot merge. The gunship's shot hitting a drifter destroys that drifter and can initiate a chain; keep this rule distinct from fusion. Explicit, predictable interaction rules are more valuable than unexplained randomness.

A destroyed hostile emits a short-lived damaging blast or fragment pattern that can destroy nearby hostiles. Each cascade has a unique chain ID, initiating player/team owner, depth, and set of already-resolved victims. Newly destroyed enemies may propagate it. Effects cannot repeatedly rescore one entity. Friendly chain explosions do not damage players, and every eligible hostile destroyed awards its base value. Start with source-referencing base values **1 / 3 / 10**, plus an additional chain-depth multiplier capped at a readable value such as ×8. The boss has an explicit reward outside that table.

Show one concise chain callout at the cascade centroid instead of filling the arena with overlapping numbers. In co-op all points feed a team total, with individual contribution retained for results. Attribute an enemy-fire-initiated cascade consistently to the team or to an environmental category; specify the choice in the rules data and tests. Decorative sparks never affect simulation.

### Tuning intent

The intended rhythm is approach with a ready ring, choose a shot or impact, escape slowly through the exposed interval, then hear and see the shield return. At least one safe opening should normally be available after a deliberate attack. Shooting from distance, baiting pursuit into a cluster, ramming a hunter, and using drifters to obstruct gunships must all be viable. Avoid a balance in which sitting still and waiting for impacts dominates the mission. Tune encounter geometry, enemy pressure, cannon reach, and recharge duration to support these choices.

## 4. Complete demo content

Build one mission of four authored arena sequences with brief transition choreography. They can share the same battlefield dimensions and camera while changing background depth, gate placement, palette, formations, and hazards. Every gameplay mechanic appears during the mission; replay should deepen mastery rather than reveal missing basic features.

| Sequence | Approximate first-clear time | Content and purpose | Completion |
| --- | --- | --- | --- |
| Launch and first contact | 1–2 minutes | A short playable launch; movement and bead alignment; one safe shot; one shield ram; an exposed escape. Prompts disappear when demonstrated. Failure can retry the teaching beat immediately | Finish a compact encounter using the actual combat rules |
| Drifting field | 2–3 minutes | Deliberate clusters, visible first fusion, pursuit routes, and chain opportunities. Teach the player to read a merger before adding overlapping ones | Clear authored waves, with no indefinitely hiding straggler |
| Crossing signals | 2–3 minutes | Gunship lane tells, projectile cover, mixed pursuit, and pressure with breathing gaps. In co-op include a safe rescue demonstration or contextual explanation | Defeat the marked gunship wave and clear remaining threats |
| Command encounter and extraction | 2–4 minutes | A three-phase command craft; first exposes emitters, then sends familiar pursuit units, then combines crossing volleys and chain opportunities. Defeating it releases the extraction cue and final score sequence | Reach a full victory screen with score, best chain, contribution, and replay |

The boss should test the shield economy through **familiar rules**. Give it two or three exposed components that can be hit by cannon, a valid ram, or a well-positioned cascade. Each phase has an unmistakable opening and a recovery beat. Its last phase changes the arrangement and timing of known attacks. Ensure solo has enough time to exploit every opening; co-op scaling can add modest target health or formations without doubling projectile noise.

Use short, source-like briefing and result lines written specifically for the game. Avoid long lore dumps. Give each sector a visual motif and one memorable arrangement. Build the ending, failure, and restart early enough to exercise them throughout development.

Offer **Mission** and **Score Attack** as working modes. Score Attack uses the same enemies and boss vocabulary in a seeded escalating wave deck, ends on defeat, and records a local best. Mission completion records a separate best. Persist settings, mode-specific scores, and six-character names through a versioned local-storage adapter; storage denial must leave the game playable. Controller name entry must work, with keyboard typing supported on the same screen. The native arcade initials wheel has three columns, so extend it or supply a complete six-character entry screen and storage path. Keep debug and attract results out of genuine records. Do not add upgrade trees, inventory, crafting, or an unfinished campaign map.

## 5. Native visual direction and animation

Use the engine's house style as the base: sharp code-drawn pixel forms with shaded volume, deliberate palette ramps, emissive accents, rich layered backgrounds, and procedural motion. Start with its native `'overhead'` view and an appropriate native resolution preset; adapt scale after visual review. Use native drawing primitives, `E.tones`, palette ramps, shape/sprite registration, and the engine's font. Draw the important source-specific assets yourself in code or native asset data.

Create a custom saucer body with a raised dome, rim lamps, small attitude tilt, underside glow, and a defensive ring whose beads are clear at TV distance. Give the two pilots different silhouettes/trim markers as well as colors. Drifters retain the cross-like motif; hunters read as fused mechanisms; gunships look fast and purposeful. The command craft visibly shares their parts and has animated weapon covers and damage states. Generic debris and station props can come from the engine library.

Animation runs through the native timing, tween/easing, path, and procedural facilities. Use `game.tween`, `E.ease`, `E.Path`, and suitable native animation helpers for launch, banking, orbiting lights, recoil, shield collapse/reformation, fusion, warning apertures, boss component motion, wreck sparks, rescue, and extraction. Ship movement does not require humanoid skeletal rigs. Static shape definitions need explicit animated parameters or transforms for moving parts.

Keep the combat layer at a stable planar depth. Backgrounds may contain planets, antenna arrays, distant machinery, parallax stars, and soft-looking color fields constructed within the engine's style. Bright foreground effects communicate actual gameplay. Every visual effect needs a start, evolution, and end; dense cascades can be lavish while preserving strong player and threat outlines. Use source-inspired color accents without copying box art or presenting downloaded reference images as original assets.

Distinguish shield ready, recovering, damaged, and invulnerable through shape and animation as well as hue. Distinguish friendly shots, hostile shots, lane warnings, fusion warnings, and rescue cues. Provide reduced motion, shake, and flash controls through native settings. Camera motion should be modest, with a completely stable reduced-motion option. Inspect the busiest boss scene and chain scene at 1920×1080 for the ten-foot view.

## 6. Controller-first UX, keyboard/mouse, and touch

Retain the engine's standard menu, input, saved-settings, and pause infrastructure, then extend it. The same title, mode choice, settings, results, and credits screens serve every input method. Large selected states, short labels, generous spacing, and a persistent back/confirm hint matter more than ornamental panels.

| Action | Standard-mapped controller, PlayStation labels | Keyboard and mouse | Touch |
| --- | --- | --- | --- |
| Move | Left stick; optional D-pad | WASD, with arrows supported | Invisible floating left-thumb steering zone |
| Request aim | Right stick; moving supplies aim when stick neutral | Mouse points at world; movement supplies aim when pointer aim is inactive | Invisible right-thumb aiming zone; auto-aim when absent |
| Fire | R2; Cross may mirror it | Left mouse; Space as a one-hand alternative | Right-thumb aim fires with a small activation threshold; contextual fire tap when useful |
| Confirm / back | Cross / Circle | Enter or click / Escape | Tap / back control |
| Pause / menu | Options | Escape | One unobtrusive menu button |
| Join local co-op | Second pad confirms on the join screen | Keyboard+pad pairing available | Touch controls one pilot |

Use `game.input.label(action)` or the verified equivalent for prompts. Default to PlayStation glyphs and provide Xbox A/B/X/Y symbols in Settings. Track the last meaningful input, using dead zones and pointer-movement thresholds to avoid drifting sticks or a resting mouse repeatedly switching hints. Mouse hover moves menu focus, clicks activate the hovered item, and world aim uses the camera's screen-to-world mapping. The mouse should be useful immediately without requiring a controller-style focus step.

Touch should leave only the menu button persistently visible during ordinary combat. Implement invisible sticks, pointer ownership per touch contact, simultaneous movement and aiming, and cancellation on lost focus. Use optional short contact halos during onboarding, aim assistance, forgiving target selection, and automated firing where needed. These assists preserve shield recharge: fire in deliberate safe bursts with recovery opportunities rather than holding the shield empty forever. A rescue/action button appears only when the action is possible. Test both phone and tablet profiles, including landscape safe areas and a usable portrait presentation.

The title should offer Start Mission, Score Attack, Local Co-op, Settings, and About with a clear initial selection. Explain local co-op as a second pad or keyboard+pad; maintain stable device-to-pilot ownership after disconnect/reconnect. Both local pilots share the arena. Do not let the first controller's input steer both ships.

HUD: score and chain state at the top, compact hull indicators and shield state per pilot, a short objective line, and boss health only when relevant. The ship's ring is the primary shield instrument. Keep subtitles and prompts off threat lanes. The results screen offers restart, mode selection, and credits with complete controller navigation.

Pause contains Resume, Restart, Settings, **Dev Mode**, About/Credits, and Return to Title. Solo and couch co-op pause simulation. In Hub, the menu is a local overlay, with a clear indication that the shared game continues; use the session-specific restrictions below.

## 7. Audio made entirely in code

Use the engine synth and native audio routing for all sound. No audio files, sampled speech, or rendered sound assets are shipped or fetched. Custom oscillators, generated noise buffers, envelopes, filters, and algorithmic sequencing are allowed. Start audio only after a user gesture; gameplay and Hub readiness must work while audio is locked.

Create distinct sounds for cannon acceptance, shield consumption, recharge progress/ready, hull damage, drifter break, fusion, hunter charge, gunship warning/missile, chain escalation, rescue, boss phases, victory, defeat, menu focus, and confirm. Tie the sounds to actual simulation events so a cascade cannot produce repeated duplicate cues. Musical pitches and timbral categories should make a shield-ready signal clearly different from a threat warning.

Compose a restrained code-authored space-arcade score with title, mission, heightened boss, and result variations. Initialize the saved **music setting to 10%** on first launch, and preserve the player's later selection. Set the music bus and settings UI consistently; do not reset its volume on every transition. Route SFX, music, and voice through their corresponding buses and respect pause, mute, focus, and Hub end.

If a pilot or dispatcher speaks, generate short Animalese/Simlish-style gibberish with matching readable subtitles. A handful of purposeful cues is enough. Verify audio numerically with `OfflineAudioContext` or analysis nodes: finite samples, nonzero expected output, bounded peaks, correct bus gain, cue differences, no sound before unlock, and successful mute/stop. State the limitation honestly: automated signal checks cannot certify subjective listening quality.

## 8. Engine architecture and content workflow

Use plain JavaScript modules or a similarly simple build arrangement. The final delivery remains a single HTML file. A sensible development layout is:

```text
index.html
package.json
src/
  main.js
  game-state.js
  simulation.js
  combat.js
  enemies.js
  encounters.js
  presentation.js
  audio.js
  controls.js
  screens.js
  dev-tools.js
  storage.js
  net/hub-adapter.js
  data/balance.js
  data/enemies.js
  data/mission.js
  data/score-attack.js
  data/assets.js
  data/music.js
vendor/engine/
vendor/hub/
tools/build.mjs
tools/test.mjs
tests/
docs/
artifacts/
build/game.html
```

These are suggested responsibility boundaries, not a requirement to split small functions into many files. Keep all research, tools, caches, generated reports, and development assets within your development folder. The packaged game must not require those folders at runtime.

### Use the engine deliberately

- Adapt the arena structure of the arcade starter's ROCKS section. Use `new E.Game({ view: 'overhead', ... })`, native scene flow, and pausable gameplay scenes. Keep a stable arena focus through `game.focus`. Remove stock cabinet choices and unrelated starter games.
- The full engine bundle already includes its modules; do not load the arcade module twice. `E.Arcade` can provide score-entry/attract helpers, but its built-in two-player mode is **alternating turns**. Implement simultaneous pilots in your own shared simulation.
- `E.Bullets(game, { plane: 'ground' })` and `E.pattern` can supply projectile handling/patterns when they fit the required swept collision and chain rules. Extend the engine where useful and document the reason. Keep the actual shield/merge/score contract centralized.
- The native Node simulation uses fixed 1/120-second updates. Treat rendering as a read-only projection of simulation and presentation state. Do not spawn entities, award score, consume random numbers used by gameplay, or change aim from a draw function.
- Inspect native effect helpers for simulation side effects: the explosion helper can trigger engine-wide hit-stop and shake. Disable simulation freeze in shared sessions and express impact feedback through local presentation animation. Cosmetic effects must not advance or stop authority differently across copies. Any solo hit-stop is explicit and covered by scenario timing checks.
- Separate seeded gameplay randomness from cosmetic randomness. Use `E.rng(seed)` for standalone play and cached protocol seed streams where appropriate in Hub. Replays must record the seed, balance/content version, and input sequence.
- Expose a stable `game.debug` snapshot and command surface. Native `game.advance`, input `feed`/`tap`/`hold`/`clear`, and headless draw validation should reach the same simulation used by the browser.

Maintain a small explicit top-level flow: boot → title/menu → launch → mission or score attack → victory/defeat → results → replay/title. Attract has isolated run state. Co-op adds per-pilot lifecycle; Hub adds its own waiting/countdown/running/ended adapter states. UI routing, simulation running state, audio state, and network state must agree at every transition.

### Designer-ready content

Keep enemy definitions, formations, spawn gates, wave conditions, sector transitions, boss phase tables, visual palettes, music patterns, and balance defaults in validated data. Encounter records should have stable IDs and describe spawn timing, prerequisite events, completion conditions, cleanup behavior, and intended learning beat. Boss attack sequences should use the same timeline/formation vocabulary.

Provide a documented content workflow in `docs/content.md`: create a formation, add a wave, assign a sector background, preview it in Dev Mode, export/import validated JSON, and rerun its scenario checks. A small encounter picker, timeline scrub/step, and data editor/importer is sufficient tooling if it actually works. Adding another sector should require ordinary content data and asset definitions. Reject invalid data with a readable error and retain the working configuration.

### Dev Mode

Reach it from Pause and navigate it fully with the controller. Provide invulnerability, refill hull/shield, enemy/formation spawn, clear enemies/projectiles, sector and boss-phase jump, single-step, slow/normal/fast simulation, seed reset, collision/aim/telegraph overlays, snapshot export, and restart of the current encounter.

Live sliders should cover movement speed, acceleration response, cannon slew speed, shot interval, shield recharge time, recovery speed factor, damage immunity, drifter speed, hunter speed/turn rate, fusion radius, gunship warning/volley timing, chain radius, and boss health/attack interval. Group them across a few readable pages. Every slider shows a value, a sensible range, and reset; reset-all restores canonical defaults. Pause-time edits apply on resume. Changes that invalidate a running actor, such as reducing its maximum health, have a defined clamp/restart policy.

Debug runs are visibly marked and excluded from local score records. Attract always starts from its own known configuration. In Hub, expose diagnostic inspection through the local pause overlay, but keep world-changing dev commands unavailable; conduct gameplay tuning in standalone. Document this session behavior in the controls/help screen.

## 9. Attract mode

After **10 seconds without input on the title/menu**, enter a looping AI-played or scripted demonstration. Set the engine arcade helper's idle value explicitly; its researched default is 20 seconds. Do not trigger attract while someone is editing settings, entering a score name, using Dev Mode, or participating in a Hub session.

Create a roughly 60–90-second showcase loop using real simulation and scripted encounter setup: flight and orbit aim, a shield ram, an exposed escape, a fusion, a long cascade, gunship lanes, and a boss exchange. It may grant its pilots invulnerability or guaranteed opportunities. A small caption and clear demo indicator should explain what is being shown. Cycle the whole feature showcase rather than displaying an empty bot arena. If retaining `E.Arcade`'s attract clock, configure its demo duration explicitly too; its default 30-second demonstration would cut this showcase short.

Any intentional key, mouse button, mouse movement, wheel, touch, controller button, or stick movement cancels attract and returns to an interactive title. Account for raw input categories rather than relying solely on a button-only helper. Apply drift/noise thresholds for device stability. Consume the canceling event so it does not also start a run. Reset the idle clock and clear pressed/held input, timers, audio, spawned entities, and camera effects before returning. Attract never writes best scores, advances real progress, opens a Hub session, or leaves debug values active.

## 10. Multiplayer and AI Hub

### Standalone co-op

Ship solo and two-player same-screen couch co-op in the independent HTML. Device pairing is explicit, with second-pad join and keyboard+pad supported. A shared simulation owns both pilots and team state. No external room service is needed for this scope. AI Hub supplies remote co-op when embedded; its client is not a standalone create-room/join-room service.

Both players receive full movement/aim/fire controls and readable player identity. Start encounters with player-count-aware formations and boss health from data; preserve solo timing windows. Joining occurs at the local join/menu flow, with disconnect behavior defined during play. Rescue is the only co-op-specific combat action. A single surviving pilot can finish the mission. In solo there are no inaccessible two-pilot objectives.

### Session client and lifecycle

Follow the pinned protocol, not invented `AIHub.hostGame()` or matchmaking APIs. Preserve the exact released `session.js` **unmodified** as the first script in `<head>`, immediately after charset, including its banner. Keep it outside build transformations; import validation recognizes released clients. Add the required metadata for session support, players `1-2`, mode `shared-world`, goal, and controls, with a sensible mission-duration hint. The native 2D game does not need a WebGPU-required tag.

Call `await AIHub.connect({ mode: 'shared-world', seats: [1, 2] })`. A null result selects standalone boot. In a session, skip the game's title, attract, name entry, and start-button gate. Build the world and call `AIHub.ready()` exactly once without requiring a gesture. Audio can remain locked. The Hub's start event precedes actual play by three seconds; advance mission time and accept combat only once `AIHub.time() >= 0`.

Separate **authority**, **players**, and **local presentation**. `AIHub.isHost` owns AI, movement resolution, shots, hits, shield/hull state, merges, score, encounters, and finish. `AIHub.server === true` can create a host with no local pilot; `AIHub.me` is then absent from `AIHub.players`. That host must still initialize, ready, simulate, send snapshots, and finish without a local camera, gamepad, or audio device.

### Transport model

Use `AIHub.send(data, { to, reliable })` and `AIHub.on('message', (data, from) => ...)`. Nonhosts send sequenced move/aim/fire intent to `AIHub.host`; the host sends compact authoritative world snapshots and reliable lifecycle events. Validate the sender against session membership and accept world state only from the current host. Inputs contain intent, never claimed kills or scores.

Begin with about ten input packets and eight full snapshots per second, using reliable delivery for a simple correct baseline. Include the latest input sequence acknowledged in snapshots. Predict local ship motion/bead presentation, reconcile to host state, and interpolate remote actors; damage and scoring remain host-owned. Expire stale held input after a suitable timeout, initially around half a second. Send neutral heartbeats while idle so the harness can observe two-way traffic. A standalone host uses the same intent format locally.

The researched protocol limits each copy to **20 messages/second**, JSON messages to **16 KB**, and a burst of 40. Reserve capacity for transitions; batch events and measure encoded sizes in tests. Keep visual particles and lights local. Compact actor/projectile arrays are appropriate; snapshots must fit the actual content rather than silently dropping gameplay entities. If choosing unreliable delivery later, account for the approximately 1,200-byte fragmentation threshold and add loss/reordering tests. Never rely on `Math.random` being seeded in shared-world mode. Cache `AIHub.rng(label)` streams when using the shared seed.

On nonhost leave, disable/remove that pilot and continue with fair remaining-player pressure; clear their inputs and rescue state. Host leave voids the round through Hub handling. No host migration is required. Settings overlays do not stop the shared clock, and opening one sends neutral gameplay input. Ignore controller Options while Create is held so the Hub's Create+Options chord remains available.

The host calls `AIHub.finish({ standings, scores, won })` once. For co-op put all remaining player IDs in one tied standings group, expose the team result consistently, and set `won` from actual mission completion. On `time-up`, settle and report within `graceMs`; an unfinished mission is a team loss with its earned score. Send the final reliable world state first. On `end`, stop simulation input, outbound traffic, and sound, and let Hub own session navigation.

Within sessions, use Hub names as text, skip independent initials entry, and obey its restrictions on extra sockets, multiplayer servers, chat/voice/emotes, custom names, popups, navigation, and dialogs. Asset loading follows the protocol's allowances. Do not add a parallel transport inside a Hub session.

## 11. Implementation sequence and completion gates

Use parallel agents when they can work on independent responsibilities: source/art specification, audio generation, content authoring, protocol adapter, or test scenarios. Agree on simulation events and state contracts first. Assign file ownership or isolated worktrees, integrate deliberately, and have one owner maintain the final rule set and build. The model's capacity supports a thorough integrated review of every screen and system before delivery.

1. **Evidence, boot, and packaging.** Resolve source notes, fetch the real handoffs, create native engine boot, define data schemas, add the build command, inline the Hub client correctly, and verify a generated HTML opens through `file://`. Establish stable game identity and debug snapshots. Gate: native render, input, locked/unlocked audio handling, scene transition, and prototype packaging all work.
2. **Complete combat loop.** Implement steering, clockwise aim, shot acceptance, shield recovery, hull damage, one threat, chains, pause, defeat, restart, and results. Add deterministic scenario checks as the rules stabilize. Gate: a small encounter already supports safe ramming, meaningful shooting, visible vulnerability, a cascade, and a full loss/retry loop.
3. **All enemy interactions and co-op.** Add drifter fusion, pursuit, gunships, lane warnings, solo/local device pairing, per-pilot lifecycle, rescue, and team results. Gate: a scripted scenario exercises every interaction and cannot double-award a kill or confuse pilots.
4. **Authored mission and designer workflow.** Build all four sequences, boss phases, extraction, score attack, data validation, encounter preview/import/export, and checkpoints for testing. Gate: an input-driven playthrough reaches victory with all mechanics covered; defeat and replay also work.
5. **Native presentation, audio, and UX.** Finish custom art and animation, transitions, sound score/cues/gibberish, controller navigation, keyboard/mouse, touch assistance, persistence, accessibility, Dev Mode, and the complete attract loop. Gate: the title is understandable and inviting, combat states are legible, and every offered menu item works.
6. **Hub integration and adverse cases.** Integrate the authority adapter, headless server host, protocol lifecycle, snapshots, reconciliation, leave/time-up/end handling, and session restrictions. Gate: the official harness and two-page gameplay scenarios pass, including lag/loss and server-host cases.
7. **Tuning and delivery review.** Adjust real encounter spacing and timing, inspect visual-only questions, validate audio signals, fill honest feedback, generate the final artifact, and test that exact artifact. Gate: every requirement below has evidence, no TODO or stub remains, and reporting matches what was actually tested.

These phases may overlap when contracts are clear. Keep the complete game flow working at each integration point. Fix defects uncovered by a gate before treating its dependent systems as finished. Rendering richness and polish are encouraged; FPS targets, optimization passes, and benchmark work remain outside scope.

## 12. Verification strategy

Expose **one command**, preferably `npm test`, that runs all applicable checks and prints only failures plus one count line such as `124 passed, 0 failed`. Use a coordinator around Node and browser checks; save verbose upstream output, snapshots, and failure traces under `artifacts/`. Exit nonzero on failure. Rerun checks after changing the code/data they cover, using their dependency coverage to avoid redundant unchanged runs. Validate the exported HTML after its final change.

### Simulation and whole-game checks

- Directional movement, acceleration, diagonal normalization, boundaries, and half-speed recharge.
- Clockwise aim across the zero-angle boundary, stationary aim retention, real-bead shot direction, cooldown acceptance, held fire, and recharge restart.
- Ready shield protection, one consumption per contact batch, grace duration, hull loss, damage immunity, death, and absence of repeated overlap damage.
- Two drifters merge exactly once; dying objects do not merge; fusion telegraph/arming are observable. Gunship fire, shot blocking, friendly chains, chain attribution, score multipliers, and duplicate-kill prevention.
- Boss component vulnerability, each phase transition, solo-clearable windows, defeat, extraction, victory, and score attack termination.
- Two-device isolation, co-op rescue, both-down defeat, surviving-player victory, disconnect behavior, team score, and local replay.
- Valid/invalid content data, import/export round trips, slider effects and resets, debug record exclusion, persistence unavailable/corrupt/versioned cases, and attract isolation.

Keep a deterministic full-mission playthrough driven by legal input through the real update/collision/encounter code. It should demonstrate firing, ramming, surviving recharge, a fusion, a cascade, a gunship, every boss phase, and victory. A separate two-pilot scenario demonstrates rescue. Setup commands can select fixtures or starting encounters, but the complete successful run must not be equivalent to calling a win function or deleting enemies. Record milestone events so a passing screen alone cannot conceal skipped gameplay. Run a separate defeat-and-restart journey and an extended score-attack sequence.

Use native headless stepping and input tools first. Enable stand-in draw validation and inspect `game.errors` for registered drawing faults. Native transition fades can delay assertions; advance through them or set an explicit test fade policy. Replay fixed seeds and compare meaningful state hashes to catch draw-dependent or cosmetic-randomness bugs.

### Browser, input, and UI checks

Use the installed Python Playwright environment or the exact installed Node Playwright version. Prefer Chromium for the main headless journey; smoke-test the native 2D game in installed Firefox and WebKit where supported. Do not install new browser binaries. Verify the packaged file loads without sibling assets, uncaught errors, missing requests, or console failures.

Emulate standard-mapped pads by replacing `navigator.getGamepads` through an initialization script. Navigate from title through settings, rebinds, mode choice, play, pause, Dev Mode, results, and About with a pad. Test PlayStation default, Xbox setting, last-input switching, hover focus, mouse world aim, keyboard-only play, controller loss, held input across transitions, and the Hub reserved chord.

Use phone and tablet profiles for simultaneous touch contacts, invisible-stick ownership, contextual buttons, assistance, touch cancellation, and safe areas. Check all interactive screen routes and that a menu overlay cannot accidentally fire into the world. Advance the idle timer to just before and after ten seconds, then cancel attract separately with each meaningful input category. Confirm it loops and leaves records/defaults untouched.

Audio checks render representative code-generated cues offline, test bus gains and music's first-run 0.10 default, verify saved-volume persistence, and ensure stop/mute/end cleanup. There is no listener or physical controller here; the specified stand-ins are the completion criteria. WebKit device emulation is evidence about that browser, not proof of testing a real iPhone.

### Hub checks

Stage `harness.html`, `bridge.js`, and `round.js` together with the actual packaged game. Use a localhost server bound to `127.0.0.1` on an OS-selected port. Confirm the served page is this game's artifact before trusting results. Adapt fixed-port examples from upstream to this environment.

Run the official harness for the declared player range, including a normal two-player round; `latency=150&jitter=50&loss=5&auto=1`; `scenario=host-leave`; and `scenario=server`. Check the supported one-player session path too. Wait for `document.body.dataset.complete === 'true'` and assert `window.__hubCheck.pass === true`. Retain protocol failure details. Verify automatic ready, countdown gating, bidirectional traffic, bounded messages, correct time-up result, one finish, every copy's end, and no prohibited networking/dialog/navigation behavior.

The harness uses random movement and does not establish mission completeness. Add a two-page gameplay scenario that exercises shared collisions, rescue, score, phase transitions, loss/reordering recovery, and consistent results. Give the pages different viewport dimensions, resize one during play, and verify identical authority bounds and correct local aim projection. Exercise dense explosions to confirm presentation hit feedback cannot freeze shared simulation. Test that the server host has no pilot but runs the same world. Check that a departing pilot cannot keep firing and that no messages or sound continue after `end`.

### Screenshots for visual questions

Use screenshots/filmstrips only for matters state checks cannot settle: title appeal, TV-scale text, focus visibility, saucer/threat silhouettes, orbital bead readability, motion progression, warning contrast, chain clutter, boss framing, credits legibility, and touch occlusion. Use a small purposeful set, including a busy frame and 1920×1080 ten-foot view. State assertions should establish functionality first. Adapt the engine's check/filmstrip helpers to suppress success chatter and performance reporting; do not turn FPS measurement into a completion gate.

### Shared-workstation discipline

Keep one or two browser instances open and close owned contexts. Use the installed tools after checking availability. Store generated files and caches inside your development folder; avoid the RAM-backed shared temporary directory. Prefer `file://` except for the Hub harness or cases that genuinely require an origin. Stop only processes you started, identified by their recorded PID; never kill by port, broad pattern, or process name. Do not inspect adjacent builders' folders. Respect the brief's headless environment and do not launch Windows GUI applications.

## 13. Packaging, credits, and final acceptance

`tools/build.mjs` should bundle the game's modules and inline engine/runtime, native asset definitions, fonts where needed, styles, procedural music, and audio code into `build/game.html`. Preserve execution order, keep the released Hub client outside transformations, and safely escape script-closing sequences when embedding code. Avoid runtime imports or fetches of local development files. If a CDN dependency is truly useful, pin its version and record the dependency; this native design can be self-contained apart from the Hub environment.

After generating the final bundle, open and exercise that exact file both independently and through the Hub staging origin. The delivered root artifact gets the builder-specific filename from your own brief. Keep source and tools in the chosen development folder for continuation. A consumer should be able to copy the HTML by itself and play standalone with no build step.

Create About/Credits pages with **Source Information, Testing Feedback, Engine Feedback, and Prompt Feedback**, and include the same required sections in the final chat reply. Copy the builder brief's machine-readable interview schema exactly into its prescribed output file; fill every value and verify JSON parsing. The planner's separate interview is not a substitute for the builder's implementation feedback.

- Source information must include date, identified source, plan filename, actual genre and perspective, technology and versions/revisions, native art approach, animation, procedural audio, implemented online modes, testing parameters, research, environment, model/effort, and usage. Use the builder run's supplied date and environment/model details. Set usage to the exact text **`added on import`** and do not estimate cost or tokens.
- Answer all feedback questions in order: **4 Testing**, **6 Engine**, and **4 Prompt** answers. Track issues found and critical/game-breaking issues during development so the test feedback is evidence-based. Record engine modifications and useful limitations while working. Use **`unknown`** for anything unconfirmed, rather than inventing a result.
- Fill the catalogue with the builder's chosen title, tagline, concise description, actual controls and players, and 3–6 appropriate lowercase tags. This design fits type **Game**, catalogue genre **Shooter**, and players **1–2**. Identify the historical source correctly; leave the franchise/series empty if no confirmed series applies.
- Populate final testing feedback before the last build so the in-game version and interview agree. The final artifact check need not change that feedback unless it finds an issue; if it does, fix, update the evidence/credits, rebuild, and retest the changed coverage.

The delivery is complete when the mission and score attack both work end to end; solo, couch co-op, and Hub paths work as declared; every visible setting/action has an implementation; the dev tools and attract demonstration are complete; art/animation/audio use the required foundations; the exact exported HTML passes its checks; and credits, feedback, catalogue metadata, and the builder interview accurately describe the finished game. Leave no placeholders, TODO features, fabricated test claims, or broken menu destinations.
