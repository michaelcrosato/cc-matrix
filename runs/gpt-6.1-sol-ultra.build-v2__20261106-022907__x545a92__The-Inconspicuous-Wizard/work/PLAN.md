# Game direction and build plan

For **gpt-6.1-sol ultracode, with a 1.05M-token context window**.

Build a complete, original arcade dungeon game inspired by **The Incredible Wizard (1982), the Bally Astrocade cartridge**. The central pleasure is choosing a firing lane while something dangerous disappears around the corner. Make a single shot feel consequential, the radar feel indispensable, and the Wizard feel like an unwelcome intelligence entering an otherwise understandable machine.

Use the large context window to keep the source research, engine contracts, game rules, content, multiplayer lifecycle, and verification evidence consistent throughout implementation. Work through integrated, playable milestones and finish every committed feature. There is no artificial time, token, frame-rate, or optimization budget in this plan. Spend the effort on game feel, expressive assets, encounter design, reliable systems, and a finished presentation.

The CEO's brief remains authoritative. **Choose the game's title yourself:** silently brainstorm 50 playful riffs on the source's name, then select one with an actual random-number generator. Carry that selection through the title screen, metadata, credits, and packaging. This plan deliberately supplies no candidate title. Derive all required final artifact and development-folder names from your own brief; none are prescribed here. Every project path below is relative to the development folder you create.

## 1. Research baseline and intended interpretation

Start with the [original manual transcription](https://ballyalley.com/cart_manuals/text_manuals/incredible_wizard.txt), cross-check against the [manual scan](https://ballyalley.com/cart_manuals/pdf_manuals/Incredible_Wizard%2C_The.pdf), and study the contemporary [December 1982 feature](https://vgpavilion.com/mags/1982/12/vi/conquering-the-incredible-wizard/). The [archived hardware recording](https://archive.org/details/IncredibleWizardBallyArcadeAstrocade1982) is useful for observing pacing, motion, and sound. Research the source before implementing; retain URLs and distinguish what you actually observed from what a document reports.

Confirmed source anchors: the cartridge is a licensed adaptation of *Wizard of Wor*. One or two players share a maze. Movement and shots are cardinal; each player has one projectile in flight until impact. Some monsters become visible only in a shared corridor, while radar tracks their hidden positions. Clearing ordinary enemies releases an escaping flying bonus creature; the Wizard can follow, teleporting, firing lightning, and evading radar. Bonus-creature and Wizard kills each double the following maze's points, combining to 4×. Later mazes become more exposed, including Arena and Pit milestones. The tone is ominous, boastful arcade fantasy. [Manual](https://ballyalley.com/cart_manuals/text_manuals/incredible_wizard.txt), [contemporary account](https://vgpavilion.com/mags/1982/12/vi/conquering-the-incredible-wizard/).

Use the manual when accounts disagree. Exact historical AI, generation algorithms, instrument synthesis, and ordinary monsters firing on Hard are unconfirmed. Do not label invented rules as historical facts. This planning pass located hardware footage but did not listen to its audio; the builder should inspect it where useful and report any remaining uncertainty honestly.

Translate these anchors into a new dungeon, new character and creature designs, new room layouts, new compositions, and new writing. The original encounter structure is the foundation; the following authored campaign, resonators, assistance settings, and cooperative rules are deliberate new design decisions.

## 2. The game we are making

**Genre:** arcade maze shooter, with tactical lane combat and score attack. **Perspective:** one fixed, full-arena, near-overhead camera using the engine's `topdown` view. Ground movement remains aligned with screen axes. Character art may use the engine's more readable sprite-like projection. Restrict supported views to `['topdown']` and disable player wheel/pinch zoom through the documented scene camera settings. Use fit-to-arena framing that keeps every escape route visible.

**Premise:** one or two dungeon wardens enter a pompous sorcerer's sealed menagerie to stop his creatures escaping. Their awkwardly powerful lantern-rifles can sustain only one bolt each. Ancient bell posts let them expose and misdirect things they cannot see. Each descent provokes a more personal response from the owner.

**Core loop:** read the radar, choose a lane, commit a bolt, reposition while it travels, clear the room, intercept the escaping familiar for a bonus, survive any Wizard intrusion, and descend with the multiplier you earned.

Build around five pillars:

1. **A shot is a commitment.** Long lanes offer reach and create a dangerous recovery window. Nearby walls let a player recover their weapon quickly.
2. **Hidden does not mean unknowable.** Radar, shared corridor visibility, sound, and resonators give consistent information without removing suspense.
3. **The same room supports several tasks.** Hunting, interception, and a Wizard intrusion change how players use the geometry.
4. **Partners cover each other's blind sides.** Co-op shares the board and information while preserving each player's weapon commitment.
5. **Occult spectacle stays readable.** Rich native pixel art, animated silhouettes, colored light, and coded sound support a clear combat board.

Deliver six authored chambers and a complete ending, approximately **10–15 minutes for a first successful normal run**, with replay through difficulties and score pursuit. Measure this during development; tune density and geometry rather than inserting waits. Every mechanic must appear during an ordinary completed run. No required feature depends on a rare random event or finding a hidden mode.

## 3. Rules and feel contract

### Movement, aiming, and bolts

Use smooth, grid-constrained movement through cardinal lanes, with buffered turns near junctions. Grid centers and walls define the authoritative board; render motion continuously. Keep the response immediate, allow a short input buffer, and preserve an explicit facing direction when standing still. The input adapter must quantize diagonal wants and own buffer expiration/release: native `GridMover` retains its wanted direction indefinitely and does not enforce this policy for you. Partners can pass through each other so a narrow doorway cannot become a co-op deadlock.

Aim independently when the player uses the right stick, keyboard aim keys, or mouse. Quantize aiming to four directions with hysteresis around diagonals; display a small muzzle indicator so this is understandable. When no deliberate aim input is active, movement supplies facing. Mouse clicks fire along the visibly selected cardinal lane. Keep the rule identical across devices.

Each living player owns **at most one active bolt**. Firing is unlimited over time, with no ammunition inventory, but another bolt cannot exist until the previous one resolves. A bolt is consumed by its first blocking wall, ordinary enemy, hostile projectile, or resonator. Friendly fire is off: allied bodies and allied bolts do not block each other. Define deterministic collision ordering and test fast movement across cell boundaries. A small fire buffer and hold-to-fire are welcome; neither bypasses the one-bolt invariant. Give a quiet blocked-fire sound and a readable empty/ready muzzle light rather than an error message.

Start tuning around 4 cells/second player movement, 12 cells/second bolts, 100–150 ms input buffering, and a brief minimum firing interval. These are seeds for tuning, not historical claims. Choose speeds that make a long missed shot observably risky and a short wall shot noticeably recover sooner. Swept collision must prevent a fast bolt skipping a wall or enemy.

### Visibility and radar

A cloaked hunter is visible when it shares an unobstructed cardinal lane with **either living player**, independent of which direction that player faces. Both local and online players see the same union of revealed enemies. Walls stop visibility; decorative props do not secretly change it. A short fade can express appearing/disappearing, but authoritative visibility cannot depend on drawing or frame rate.

The radar always tracks ordinary hunters, including hidden ones. Show player markers and enemy blips in a compact, high-contrast instrument with no detailed wall map. Give players enough orientation to map a blip back to the arena. Shape, pulse, and motion distinguish tiers in addition to color. The Wizard never appears on radar. An idle radar must look functional, and the first hidden encounter must teach that its information remains live when the arena looks empty.

Do not leak invisible hunters through shadows, particles, damage labels, aim assist, target highlights, or cosmetic light sources. Telegraph their approach through the intended radar and audio channels. Accessibility options may deliberately strengthen those channels and should explain the assistance.

### One original mechanic: resonator posts

Build shootable bell posts into selected walls or dead ends. A bolt striking an available post ends that bolt and rings it. The ring briefly reveals nearby cloaked hunters and lures nearby ordinary hunters toward the post along walkable paths. A player spends their sole shot to obtain information and influence traffic, then moves to exploit it.

Starting values: reveal for about 1.25 seconds within 3 cells; lure for at most 1.5 seconds within 5 cells of traversable path distance; post cooldown around 5 seconds. Make availability, ring radius, attraction, and cooldown legible through the asset and animation. The lure does not stun enemies, stack indefinitely, cross disconnected walls, or affect the Wizard. A player standing beside a post cannot permanently disable the room by firing repeatedly. Resonator visibility is shared between partners.

Teach it through a safe, shootable example before making it useful under pressure. It enriches lane decisions without adding another required combat button. No other new combat subsystem is required for this slice; depth should come from combinations of these rules.

### Ordinary enemies and finite waves

Make three unmistakable families, each with new anatomy, names, animation, and sound:

| Family / design role | Behavior | Readable cue | Counterplay |
| --- | --- | --- | --- |
| Slow visible hopper | Patrols and pursues through junctions; commits to a short hopping rhythm | Rounded, horned silhouette and buoyant gait | Learn lane alignment and weapon recovery |
| Cloaked stalker | Uses alternate routes toward the team's position; periodically chooses a flank | Broad jaw, deliberate footfall, distinct radar blip | Check radar before a corner; ring a post |
| Fast cloaked skitterer | Quick cardinal bursts with a visible commitment at junctions | Narrow, angular body, sharp foot rhythm and pulsing radar mark | Predict its lane instead of chasing its current position |

Give each family a compact finite-state machine and seeded decisions. Keep route choice fair: enemies cannot see through the authoritative rules simply because they are AI. Begin with visible spawn warnings and forbid damage on the spawn frame. Use mild, capped pressure escalation as a room goes on, communicated by heartbeat and creature animation. Every difficulty remains finite and winnable.

Some room data schedules stronger replacements after particular kills, echoing the source's escalating bestiary. Use an explicit finite spawn budget. `Hunt` ends only when living ordinary enemies, queued spawns, and replacement obligations are all exhausted. Never key progression only to the current on-screen count. Ordinary hunters use contact attacks; reserve projectile barrages for the Wizard in this design.

### Escape creature, Wizard, and scoring

After the hunt, release one fully visible, winged bonus creature. It darts through legal lanes toward either side portal. Announce the interception opportunity, make its chosen route inferable, and permit it to escape. Catching it awards points and earns a next-room multiplier; missing it must still advance the campaign. Partners and ordinary hunters traverse paired portals; the familiar reaching a portal escapes instead. Place traversing actors just inside the destination with a brief lockout until they leave its arrival area, preventing recursive teleporting. Animate these rules clearly and test arrival safety. Bolt travel ends at a portal mouth; bolts do not wrap invisibly to the opposite side.

Author Wizard intrusions at fixed moments so every full run demonstrates them. The first teaches a warning rune, teleport, short firing window, and a one-hit banishment. Subsequent manifestations add pressure through timing and geometry. The finale is **three short one-hit manifestations**, each with a distinct attack rhythm and transition. One well-timed hit ends the current manifestation. Avoid extending the finale by simply increasing hit points.

The Wizard chooses legal, telegraphed destinations, never materializes inside a player or wall, and gives a fair interval before collision or firing becomes dangerous. His lightning is cardinal and blockable by the intended walls. A bell cannot reveal, lure, or stun him. He stays outside radar even during teleport tells. Use a spectacular but comfort-aware dungeon tremor when he is banished.

Track `currentMultiplier` separately from `earnedNextMultiplier`. Catching the familiar earns 2× for the next room; fully banishing that room's Wizard doubles it again, up to 4×. Apply the current multiplier to the current room's eligible points exactly once, then consume/replace it at descent. Explain this with a short transition stamp, not a dense score sheet.

For the last chamber, announce a fixed **exit bounty** before the chase. Apply the final chamber's earned 1×/2×/4× next-room bonus to that bounty once on victory. This gives the last familiar and Wizard a real payoff without retroactively multiplying earlier kills. Use shared team score in co-op and modest individual contribution statistics on results; avoid incentives to steal kills from a partner.

### Failure, checkpoints, difficulty, and saves

Give each player three lives on Normal. Contact or a hostile bolt costs one life. Respawn remaining lives at a safe entrance with approximately 1.25 seconds of visibly indicated protection. Clear or relocate immediate hazards so respawning is safe; protection cannot be used to farm enemies. A player with no lives watches until the partner clears the room, then returns with one life. Solo defeat occurs at zero lives; co-op defeat occurs when both players have no active life. Keep encounters short enough that a fallen partner's wait is reasonable.

Award a capped life recovery at selected campaign milestones, and tune the whole run around that economy. Show lives per player without health-bar ambiguity. A death cannot create duplicate score, respawn an already-consumed bonus, or drop a player's active bolt into an orphaned state.

On defeat, offer Retry chamber and New run. A retry restores a complete room-entry checkpoint, including room data, RNG, phase, scheduled spawns, scores, bonus state, and the defined entry-life policy. Retrying grants a playable starting stock and marks the run **Practice**, excluding it from ranked local scores. Online rounds end on team defeat; Hub owns restarting. Developer-modified runs are also Practice.

Ship Gentle, Normal, and Fierce settings with the same mechanics and campaign. Gentle slows pressure, starts with more lives, and strengthens warning cues; Fierce tightens timing and enemy coordination. Record separate score categories by difficulty and assistance. Persist settings, legitimate local records, and campaign checkpoint data with a versioned schema. Blocked or corrupt storage must leave the game playable. Never persist an attract run, a Hub round, or developer cheats as a normal campaign save.

## 4. Authored content arc

Room names below are working content labels, not a game title. Write final text in the chosen game's own voice. Build original layouts, then validate reachability, useful firing lanes, safe entrances, portal destinations, and every scheduled spawn.

| Chamber | Geometry and presentation | Required lesson / encounter | Payoff |
| --- | --- | --- | --- |
| 1. Entry Galleries | Warm brass against dark plum stone; short turns beside one conspicuously long corridor | Move, face, fire, observe a bolt still in flight; visible hoppers; forgiving first familiar chase | First descent and clear explanation of the next-room bonus |
| 2. Blind Choir | Tight loops, readable corners, lanterns outside critical sight lines | Stalker replacements, active radar, shared corridor reveal; brief guaranteed Wizard intrusion after the chase | Player understands that an empty-looking lane can be dangerous |
| 3. Resonance Vault | Bell posts overlooking intersecting routes; paired side portals with strong arrival cues | Safe post demonstration, reveal/lure tradeoff, first skitterer, portal use | A successful trick comes from a committed shot and repositioning |
| 4. Crossfire Court | Broader arena with fewer partitions; cover remains in useful islands | Mixed finite waves, back-to-back coverage, familiar interception across several lanes | Recovery milestone and a visible step up in pressure |
| 5. Crooked Observatory | Alternating long exposures and small refuges; cold, prismatic light | Full enemy roster and posts; a more demanding authored Wizard intrusion | All ordinary systems combined before the finale |
| 6. Last Floor | Pit-inspired exposed board, strong perimeter landmarks and escape gates | Short mastery hunt, final familiar, three one-hit Wizard manifestations with escalating patterns | Exit-bounty cashout, dungeon release, victory tableau, complete results |

Target roughly 60–100 seconds of active play per early chamber and a somewhat longer final sequence. Intros and inter-room cards should be brief and skippable after their essential information is understood. The first room is playable teaching, with a prompt tied to the player's actual action and last-used input device. Hints disappear after success and remain available through Help.

The finale uses three clear rhythms: telegraphed single-lane lightning; alternating cross-lane volleys with safe gaps; then faster relocations with a final committed firing window. Test at least one clean solution to each with ordinary inputs and no invulnerability. Let the entire scene change on victory: hostile light drains, portals stabilize, the wardens celebrate, and the score resolves. Credits and Replay are reachable from there.

## 5. Art, animation, and sound direction

### Native art with source-specific assets

Use the full engine's shaded, volumetric pixel art: math-driven 3D puppets rasterized through a 2D camera, textured materials, warm/cool shading, stepped glow, and deliberate silhouettes. The dark field, bright actors, rigid lanes, and compact information of the source become richer dungeon craft. The environment should feel expensive and alive while never disguising a collision boundary or projectile.

Start with a documented logical resolution such as `res: [640, 360]`, with `expand: true`, and a fixed arena camera. Fit the map inside a reserved gameplay rectangle; keep radar and HUD outside critical lanes. Use engine-supported scaling to retain the full arena on narrow screens. Verify framing before committing all maps. Characters need enough visual size for pose and anatomy to read; choose a sensible cell count and zoom rather than shrinking them into anonymous dots.

Make original assets for the wardens and lantern-rifles, all three hunter families, winged familiar, Wizard, resonator posts, portals, radar instrument, and signature boss effects. Give partner identities different silhouettes/accessory shapes as well as colors. Use included generic dungeon props for surrounding detail where appropriate; record their provenance. Build a small coherent material palette and room-specific light treatments. Wall cutaways and sorted drawing must prevent a tall wall or character from concealing a lethal lane.

Keep new assets code-native where that matches the engine. Read its asset specification before defining shapes and materials. Draw world objects through the render queue and native primitives; native pixel art should remain crisp. If an external bitmap workflow would materially improve a specific asset, follow the applicable asset skill and embed the finished result in the final file. All assets must be complete and properly credited.

### Animation inventory

Base motion on native `Humanoid`, `Blob`, rig poses, continuous phases, and render helpers. Extend those systems with source-specific anatomy and motion rather than using identical generic puppets with different colors. Required states include:

- Wardens: breathing/lantern sway, cardinal locomotion and turn, aim, bolt discharge and recoil, weapon-empty/ready cue, hurt, protected respawn, defeat, and celebration.
- Hunters: family-specific travel and junction commitment, anticipation of contact, cloak transitions, lure response, hit, and death.
- Familiar: expressive wing motion, abrupt lane changes, escape anticipation, portal departure, and interception burst.
- Wizard: apparition, boast/cast, teleport dissolve/reform, lightning release, one-hit banishment, and final collapse.
- Environment: portal charge/transit/cooldown, bell vibration and cooldown, radar pulses, and visible restoration after victory.

Animation shows gameplay state; it does not define collision timing accidentally. Preview critical motions with native filmstrips where timing or silhouette cannot be established from state assertions. Check anticipation, action, and recovery, plus front/back layering in the chosen camera. Reduced motion replaces strong shakes and flashes with readable color and pose changes.

### Code-written audio

Write every musical phrase, effect, and gibberish voice in code. Use the engine's synth and buses, with Web Audio synthesis extensions if needed. Do not load audio files, recorded speech, or remote music. Provide an original title phrase, evolving dungeon bed, chase pulse, Wizard motif, victory resolution, and defeat cadence.

Differentiate firing, weapon return, wall impact, enemy impact, cloak movement, radar alert, bell ring, portal use, familiar flight, Wizard teleport, lightning, life loss, bonus awards, and menu actions. Use stereo position and timbre as readable information, backed by visible equivalents. The sorcerer's brief, procedurally generated Animalese/Simlish-like syllables should have character without conveying critical instructions through unintelligible sound. Keep spoken-looking text captions concise.

**Music defaults to 10% volume.** The engine's default is higher, so initialize the music setting explicitly to `0.1` for a new profile and honor later saved choices. Keep effects, voices, and master gain separate. Audio unlock follows a real gesture; a muted browser must never block loading, readiness, or play. First-load attract mode can run silently before unlock. Pause, hidden pages, retry, scene changes, and Hub `end` must not leave hanging oscillators or duplicate loops.

Check coded audio through `OfflineAudioContext` or analyser output for finite samples, expected duration, nonzero intended output, safe peaks, envelope release, voice cleanup, and the actual 10% music-bus gain. State clearly in final feedback that no human listening check occurred if that remains true.

## 6. Controller-first screens and input

Make the same game and screen hierarchy work with a standard-mapped DualSense, keyboard/mouse, and touch. Use native menus, focus, input labeling, settings, and rebinding, extending them where necessary. Test the controller path from boot to credits without a mouse.

| Action | Controller default | Keyboard/mouse default |
| --- | --- | --- |
| Move | Left stick or D-pad | WASD |
| Aim in four directions | Right stick | Mouse bearing; arrow keys for keyboard-only aim |
| Fire | R2; Cross as an equivalent binding | Left mouse; Space for keyboard-only play |
| Confirm / back | Cross / Circle | Enter / Escape; click menu items |
| Pause | Options | Escape or P |

Use a custom gameplay input preset: native presets also bind arrow keys to movement, so arrow-key aiming needs explicit separation. Menus still need arrows/D-pad/stick through their own input ownership; the native shell reads movement input. Verify opening/closing a menu swaps ownership cleanly and never leaks an aim, movement, or confirm into play. Use device-aware prompts, default PlayStation glyphs, and the existing Xbox-glyph setting. Only deliberate device activity changes the prompt family; pad drift and harmless cursor jitter should not cause flicker. Mouse hover moves menu focus and clicks activate the item. Pointing at a resonator or eligible world target gives an appropriate highlight or tooltip without revealing hidden monsters.

Keep title actions few and large: Play, Co-op, Settings, How to play, About/Credits. Play leads to difficulty selection and a new/continue choice when relevant. Couch co-op provides a clear join/leave flow using a second pad or keyboard plus pad. Assign devices to seats explicitly; do not accidentally steer both actors from one input stream. Use the native local-player input facilities where suitable, with a small tested adapter if assignment needs extension.

In play, prioritize the arena, compact radar, score, chamber/phase, per-player lives, and current/next bonus cues. Critical text should read at 1920×1080 from a 10-foot viewing distance. Keep normal HUD text around 24–32 display pixels or larger, with strong contrast and a comfortable safe margin. Use short panels with paging for Help and Credits; dense browser-style forms have no place in the default flow.

Touch uses an invisible anchored left-thumb movement stick and an invisible right-thumb aim area, supporting multitouch. Keep only the menu button permanently visible. Offer assisted cardinal target alignment and cautious auto-fire at a visible, unobstructed target when the weapon is available. Assistance obeys the same projectile and visibility rules. Tapping an eligible aligned target or post may show a momentary contact-sensitive fire action; contextual buttons vanish when the action is unavailable. Respect safe areas, contact cancellation, and both orientations. Preserve the shared arena and screen hierarchy; scale/position surrounding HUD elements as needed. Test touch deliberately because the engine's default visible stick/buttons do not satisfy this brief automatically.

Settings cover audio buses, glyphs, rebinding, dead zone, vibration, reduced motion/flashes, readable contrast, and assistance. In standalone play, pause and focus loss freeze the simulation and cancel held inputs. Unplugging the active pad presents a recoverable pause. Credits and all settings remain navigable with every supported input method.

## 7. Attract mode and developer tools

### Attract mode

After **10 seconds** without intentional input on the title/main-menu flow, begin a looping AI-driven demonstration. Set this explicitly; native `E.Arcade` defaults to a longer delay. Use the real simulation with scripted/bot commands and private demo state. It may grant infinite lives or force favorable situations, as allowed by the brief.

Script a concise showcase that includes committed shots, hidden hunters and radar, a bell reveal/lure, portal travel, a familiar chase, co-op coverage, and the Wizard. A rotating sequence of actual campaign situations is preferable to a bot circling one easy room. Label it as a demo and show the actual input-aware start prompt. Loop cleanly and keep every demonstrated action possible in the normal rules, aside from the allowed survival cheats.

Any intentional keyboard, controller, mouse, or touch input exits immediately to the title. Consume the waking input so it cannot also confirm a menu or fire a shot. Reset inputs, sound, RNG/run state, developer overrides, timers, and demo-only actors. The demo must never change saves, records, settings, or Hub standings. In a Hub session, bypass both title and attract mode.

### Developer mode

Put a complete Developer entry in the pause menu, with a clear Practice indicator. Use the native TV shell and settings rows, including live sliders and **Reset to defaults**. Include room/phase selection, restart room/run, single-step, pause/resume, slow motion, invulnerability, lives, spawn/remove each enemy family, force chase/intrusion/finale, show grid/collision/LOS/radar state, and display current seed and encounter budget.

Expose the important balance values live: player speed, projectile speed/minimum interval, enemy-family speeds, pressure-growth rate and cap, spawn spacing, familiar speed, Wizard teleport/attack intervals and warning time, respawn protection, resonator reveal/lure radii and durations/cooldown, and touch assistance. Put related controls on short pages; retain sensible validated ranges. Explain whether changing a value affects living actors or their next spawn, and make the usual tuning controls take effect immediately.

Reset restores every gameplay override and `timeScale`, even across scene transitions. Changes invalidate normal records for that run. In Hub sessions, keep diagnostic overlays and local display settings available while disabling world-mutating developer actions. Reach the Developer screen from the local pause overlay and clearly explain that the online round continues.

## 8. Engine integration and architecture

### Verified handoff and the initial spike

The inspected engine handoff is **my-3D2dge v0.89.1**, at commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Recheck the version you actually vendor and record it. Read the [handoff README](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/README.md), the complete [API card](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/API.md), and relevant sections of the [AI guide](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/AI_GUIDE.md) and [asset specification](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/docs/ASSETS.md). Search the [API index](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/API-INDEX.md) for individual systems. Use `gh`/`git` for GitHub access.

Vendor the full readable engine and only the handoff material/tools needed by this game into your dev folder. Start from the complete [ARCADE kit](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/kits/arcade.js), preserving useful shell/maze patterns while removing its unrelated games and starter identity. The full engine is required for working native shapes/materials; the smaller agent edition intentionally omits some of that rendering.

Use `E.Game`, `E.TileMap`, `E.Grid`/`E.GridMover`, `E.Bullets`, native rigs, sound, menu/settings, and render helpers where appropriate. Verify signatures against the vendored card before calling them. `GridMover` positions are in cells; map/rig/projectile logic is in world units, with a native tile equal to 16 units. Centralize conversions and test them. Do not accidentally combine the kit's custom cell scale with the map's default scale.

Use one fixed camera and the full native render queue. `E.Arcade` can help with records and attract timing, but its two-player mode alternates turns. **Implement simultaneous co-op in the game's own simulation** using explicit players and input adapters. Extend the existing native pause/settings shell instead of building a competing menu stack. The brief's networking and CDN permissions take precedence over the engine guide's generic no-network hand-back example.

### Project organization

Organize for clear responsibility; the following relative paths are suggestions, not required output names:

```text
src/main.js                 boot, scene composition, dependency wiring
src/sim/                   state, input commands, movement, combat, visibility
src/game/                  encounter director, scoring, checkpoints, AI, bots
src/presentation/          native rendering, rigs, effects, menus, music/SFX
src/platform/              input adapters, storage, Hub adapter
content/                   room definitions, enemy tuning, procedural asset specs
vendor/                    pinned engine and unmodified Hub client/tooling
tools/                     build, verification entry point, evidence helpers
tests/                     state, campaign, browser, audio, multiplayer checks
evidence/                  research notes, test results, targeted visual evidence
index.html                 development entry page
```

Use plain JavaScript modules or another stack you know can bundle cleanly into the required HTML. A small explicit Node build script is sufficient; do not add a framework just to create menus the engine already supplies. Make content authorable as declarative room rows, tags, encounter phases, spawn obligations, palettes, and tunable enemy specs. Provide concise authoring notes and validation so another designer can add a chamber without editing the simulation loop.

### Simulation contract

Keep one authoritative simulation usable by solo, local co-op, Hub host/server, attract bots, and headless tests. Run it on the engine's fixed step, normally 1/120 second. Drawing, sound, and interface layout consume state and events; they do not spawn gameplay entities or decide visibility. A server with no local actor can advance the world without a camera or input object.

Define a small command shape per seat: movement direction, aim direction, held fire, and sequenced action edges. Provide adapters for real input, bots/replays, and networking. Give entities stable IDs and keep room transitions atomic. Own and serialize the gameplay RNG separately from cosmetic randomness.

Use explicit run and encounter states, for example:

```text
Boot -> Title -> Setup -> Playing -> Victory / Defeat -> Results
Playing: Entry -> Hunt -> Familiar -> Intrusion (when authored) -> Clear
```

Pause, developer screens, and About are overlays with explicit ownership. Attract is a separate run context. A Hub waiting/countdown state leads directly to Playing. Checkpoints contain everything needed to reconstruct a run; snapshots contain everything needed to render and reconcile a remote world. A single score ledger and event sequence prevent double awards.

Useful invariants include: one live bolt per player; legal navigable actor positions; finite encounter budgets; no duplicate death/score events; no Wizard radar blip; no player damage before a telegraphed spawn becomes active; no transition with unresolved spawn obligations; one result submission per round; and no network/audio activity after terminal shutdown.

Use native `game.advance`, input feeding, and a serializable `game.debug.snapshot()` or equivalent debug boundary for tests. Expose read-only state plus narrowly scoped setup hooks; make them explicit tools, not hidden normal controls. Test normal play through actual commands. Do not make an automated campaign pass solely by directly setting enemies dead or jumping scene flags.

## 9. Multiplayer: one world, two wardens

Deliver **standalone solo and 1–2-player couch co-op**, plus **1–2-player online shared-world co-op through AI Hub**. Couch play is real simultaneous play in one instance. Online copies share enemies, projectiles, visibility, scores, progression, and victory. The current Hub client has no independent Internet matchmaking API; use the Hub session flow for remote play and identify it clearly in Help/About. Do not disguise independent solo copies as multiplayer or ship a nonfunctional lobby button.

Follow the [Session Protocol v1](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/README.md), [unmodified client](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/session.js), [harness](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/harness.html), and [server-host example](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/examples/arena.html). The inspected client is 1.4.0. Recheck it at vendoring time.

### Boot and lifecycle

- Paste the official `session.js` **unmodified**, as the first script in the HTML head immediately after charset. Preserve its bytes through the build. Declare `hub:session=1`, `hub:session-players=1-2`, `hub:session-mode=shared-world`, and accurate goal/how-to/minutes tags using the final game's controls and measured duration.
- Register lifecycle handlers and call `AIHub.connect({mode:'shared-world', seats:[1,2]})`. A null result uses ordinary standalone flow. In an active session, bypass title, menus, attract, local saves, and difficulty prompts; use a defined Normal session configuration and the Hub's default instruction card.
- Load the playable world and call `AIHub.ready()` once without requiring a gesture. Wait for `start`, then begin only when `AIHub.time() >= 0`. Audio unlocking must be independent of readiness.
- Support `AIHub.server`: the authoritative host may have no player of its own, and `me` may not belong to the player list. World stepping cannot depend on local input, a local player, renderer, camera, or a focused page.
- On a nonhost departure, cancel its held commands, remove its actor/bolt safely, update active seats, and continue. Hub ends the round when the host leaves; do not invent host migration.
- The host alone calls `AIHub.finish` once on victory, team defeat, or `time-up`, within `graceMs`. Put every remaining active player into one tied standings group, supply team-consistent scores, and set `won` truthfully. Time-up ends an unfinished campaign as an unsuccessful team result with progress statistics.
- On `end`, stop simulation, input, sends, scheduled sound, and loops on every copy. Leave the final view for the Hub results overlay.

Online pause/settings are local live overlays: neutralize that seat's controls while the shared world continues. Adapt native auto-pause/focus-loss behavior accordingly, especially for a no-player host. Session quit/restart/title controls cannot navigate or reset the round; Hub owns its lifecycle. Reserve Create+Options for the Hub, ignoring Options while Create is held. No session chat, voice communication, emotes, custom names, dialogs, popups, or external game server/broker. Procedural character gibberish remains game audio.

### Authority and synchronization

The host validates commands and owns enemies, movement, projectiles, cloak state, spawns, deaths, multipliers, and results. Clients send commands and render authoritative snapshots. Predict/reconcile their own movement if needed for feel; keep damage and scoring authoritative. Interpolate remote presentation without inventing missing gameplay events. Use `AIHub.rng('simulation')` as a retained gameplay stream because shared-world `Math.random` is not automatically seeded.

Define a versioned, game-owned wire schema. A reasonable starting point is up to 15 compact input packets/second per nonhost, and 10 reliable full snapshots/second from the host, with sequenced events batched into those snapshots. Include sequence/tick, last acknowledged command, room/phase, living actors/bolts, pending encounter state, scores/multipliers, and important event IDs. Keep idle clients sending a light heartbeat so a no-input session still has bidirectional traffic. Discard stale command edges; never replay one fire press twice.

The verified transport limits are **16 KB JSON per message and 20 outgoing messages/second per copy, with bursts up to 40**. Count all packet types together and leave room for lifecycle-critical data. Reliable messages are ordered; unreliable payloads over roughly 1,200 bytes fragment and become more vulnerable to loss. For this small two-player game, modest reliable snapshots avoid unnecessary fragmentation complexity. Measure actual encoded sizes and send counts, including the busiest finale. Handle `send()` returning false without corrupting the world; a subsequent full snapshot repairs missed presentation.

Validate the transport-provided sender against the seat, accept world state only from the actual host, bound numeric input, reject malformed/out-of-order packets, and neutralize stale held input after a defined timeout. Use `textContent` for Hub-supplied names. Do not serialize purely decorative particles. Derive cosmetic effects from authoritative event IDs, deduplicating them during reconciliation.

## 10. Verification strategy and evidence

Keep all checks behind **one project command**, such as `node tools/verify.mjs`. Its normal output should contain only failures and one final count line. Let it capture noisy child-tool output and show details on failure. Make checks meaningful: assert rules, progress, lifecycle, and player-visible outcomes. Track distinct issues and critical/game-breaking issues when found and fixed; do not count assertions as bugs. Save concise evidence for the final feedback.

Run the relevant suite after code it covers changes. Rerun the integrated/package suites after changes that affect integration or bundling; do not repeatedly rerun unchanged checks. There is no FPS target, benchmark gate, or optimization assignment. Functional timing, encoded packet limits, and safe audio levels are still correctness requirements.

### Automated coverage

| Area | Required evidence |
| --- | --- |
| Core simulation | Buffered junction turns; standing aim; cells/world conversion; one-bolt ownership; long/short recovery; swept wall/entity collisions; simultaneous contact and death ordering |
| Hidden information | Wall-blocked cardinal LOS, facing independence, union of two players' sight, radar positions, no cosmetic/assist leaks, Wizard excluded, bell radius/path/cooldown/timeout |
| Encounters | Finite replacement queues, delayed spawns, no premature clear, familiar catch and escape both progress, portal arrival safety, every authored Wizard phase, correct finale cashout |
| Failure and persistence | Lives/respawn protection, one fallen partner, team defeat, atomic retry/Practice tagging, checkpoint and settings round-trip, bad/blocked storage, clean new run |
| Full campaign | A seeded scripted playthrough from new run to ending using movement/aim/fire commands; cover every room and mechanic, then results/credits/replay; no cheats in the success path |
| Alternate outcomes | At least one familiar escapes, a Wizard attempt fails, retry restores correctly, different difficulty settings produce valid runs, simultaneous kills score once |
| Input and UI | Standard-mapped pad stub, keyboard-only, mouse hover/click, device prompt changes and Xbox setting, rebinding, controller disconnect, menu focus/back, touch multitouch/cancel/context action |
| Attract and developer tools | No attract before 10 seconds; attract after 10; each device wakes it without leakage; repeat loops preserve real saves; every dev command/slider and reset works; overrides never contaminate records |
| Audio | Fresh-profile music gain 0.1, unlocked/muted paths, finite/nonclipping rendered output, envelopes terminate, pause/end cleans up, no audio files requested |
| Online | Two peers agree on movement/hits/hidden state/room/score, sender validation, dropped/stale packets, player leave, local menus do not pause host, no-player server, time-up, one finish, end silences/stops all copies |
| Packaging | Final bundled file boots from `file://`, standalone couch play works, metadata/client ordering intact, no missing assets, no console/runtime errors, final credits/interview schema valid |

A campaign driver can plan routes and inspect a debug snapshot, but it must win by ordinary action commands. Separate setup-based edge-case tests from the honest end-to-end playthrough. Run deterministic seeds that put real pressure on corners and long shots, then a small varied-seed set for liveness and spawn validity. A test that only reaches a title screen is not a gameplay check.

### Browser and visual checks

Use native Node headless tools first. Run browser checks against the built artifact, using installed Playwright 1.63.0 and its existing browsers. A suitable portable invocation is `uv run --with playwright==1.63.0 python tests/browser.py`; keep project-managed scripts and caches inside the dev folder. Do not install browsers again. Use Chromium for the main state/UI pass and WebKit for the closest available touch/iOS approximation. Record Firefox results and any engine rendering limitation honestly rather than requiring unavailable browser features.

Drive tests by state conditions, not arbitrary sleeps: the engine discards excess time on very slow browser frames. Use screenshots only for questions state assertions cannot answer: visual hierarchy at 1920×1080, creature silhouettes, wall/actor overlap, radar readability, effect clutter, touch safe areas, and motion filmstrips. Inspect a small purposeful set of title, crowded fight, hidden-hunter/post scene, final Wizard, pause/dev, and credits views. These are craft checks, not an automated screenshot quota.

### Hub harness

Keep test copies of the harness and its `bridge.js` and `round.js` dependencies together at the dev-folder root. Bind a server to **127.0.0.1 with an OS-selected port**, serving only that dev folder, capture the printed address, and confirm a game-specific marker before trusting any test. Use the same server for the harness and built game. If the required final output lives outside the dev folder, put a byte-identical test copy inside it and compare hashes. With the harness at the server root, substitute a dev-folder-relative path for the built page:

```text
harness.html?game=<relative-built-page>&players=2&latency=150&jitter=50&loss=5&auto=1
harness.html?game=<relative-built-page>&players=2&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1
harness.html?game=<relative-built-page>&players=2&latency=150&jitter=50&loss=5&scenario=server&auto=1
```

The harness resolves the game URL from its own location, so retain this root placement or adjust the URL deliberately; verify the actual iframe is the intended packaged game. Wait for `document.body.dataset.complete === 'true'`, then require `window.__hubCheck.pass === true`. Also test ordinary solo/standalone loading. The current [Hub admission runner](https://github.com/michaelcrosato/ai-hub/blob/main/scripts/hub-check.mjs) filters its default seat-count matrix to the game's declared range: a valid 1–2-player game need not pretend to support four players. Retain no-player-host and host-departure scenarios. If using that runner, do not use catalogue-mutating record options.

Passing admission does not prove co-op gameplay. Add a two-page test in which one player's shot resolves the same enemy on both pages, both players cover a room, a familiar changes the same next multiplier, the finale ends everywhere, and no copy plays sound or sends input after `end`.

Keep one or two browser processes open at most; multiple contexts/pages can represent peers. Close contexts and browsers after scenarios. Stop only servers/processes you started, by their recorded PID. Never kill a port holder or another agent's process. Keep downloads, caches, test evidence, and builds inside your dev folder; avoid shared temporary storage and neighboring workspaces.

## 11. Build order and completion gates

Use this order to make the hardest integration questions concrete early. Parallelize independent research, asset design, content, and test work when useful, with clear file ownership. Keep the simulation schema and input contract under one integration owner. Integrate each contribution into the actual playable game before considering that work complete.

1. **Research and foundation.** Choose the title using the required process; inspect source media; pin the handoffs; read their real APIs. Create the dev structure, build command, metadata ledger, and one-command verifier. Boot the native title, pause/settings, and About shell. Gate: the first packaged HTML runs from `file://` with the right engine and no starter-game residue.
2. **One chamber worth playing.** Implement cardinal movement/aiming, one bolt, walls, one distinctive animated enemy, one real room, readable radar frame, basic scoring/death, and coded audio. Establish the original visual palette and 10-foot hierarchy now. Gate: ordinary input can win and lose the chamber; core invariants pass; a targeted image confirms the presentation.
3. **Prove multiplayer and packaging.** Add simultaneous local seats and the authoritative Hub adapter using that same chamber. Handle waiting/start/end, leave/time-up, and no-player server. Gate: actual two-seat couch play plus two-page shared combat and the required harness scenarios pass on the packaged file. Fix architecture problems here before multiplying content.
4. **Complete the rule set.** Add cloak/radar rules, the other enemy families, finite replacements, resonators, portals, familiar chase, score carry, Wizard intrusions, lives/checkpoints, and difficulty. Implement developer controls alongside their systems. Gate: isolated edge cases and a complete real-input encounter sequence pass, with assets and animations for every introduced rule.
5. **Author the six-room campaign.** Compose every chamber and the three-part finale from validated content data. Add teaching, brief narration, transitions, coded music evolution, victory/defeat/results, legitimate records, and all replay paths. Gate: a non-cheating scripted full campaign reaches the finished ending and demonstrates every mechanic; failure and retry paths also work.
6. **Finish every input and unattended flow.** Refine controller/keyboard/mouse, touch assistance, context actions, last-device glyphs, safe-area behavior, menu navigation, attract showcase, and all dev/reset controls. Gate: boot-to-credits controller path, touch path, 10-second attract/wake tests, and live settings tests pass.
7. **Craft review and release.** Inspect key visuals/motions, check audio output, tune difficulty and pacing through play, fix recorded issues, and rebuild the exact deliverable. Run changed checks plus final packaged/browser/Hub suites. Complete required credits, interviews, research provenance, and feedback from evidence. Gate: every requirement has an implemented result and a verified or explicitly qualified observation.

These are integration gates, not permission stops. Continue autonomously when the work is authorized. Replace a proposed implementation if engine inspection or play reveals a better one, while retaining the committed behaviors and complete slice.

## 12. Packaging, reporting, and final acceptance

Build one distributable HTML using the exact location and naming rules in your own brief. Inline the engine, game, styles, assets, content, and official Hub client. The native engine has no runtime dependency requirement, so prefer a file that plays standalone without a server or asset fetch. External CDN dependencies are permitted by the brief when genuinely useful; document any that remain and make failures understandable.

Keep the official Hub client unmodified. Order scripts explicitly. When inlining other JavaScript, escape every literal HTML-closing script sequence safely; do not let a string or embedded engine comment terminate the script element. If a byte-preserving Hub client cannot be embedded safely, use a documented client inclusion mechanism accepted by the current handoff rather than editing its source. Test the final HTML after all build transformations.

Keep all development material in the designated dev folder. Copy only the required final artifacts to the deliverable locations specified by your own brief. The plan's own filename for build provenance is **PLAN.md**; preserve that in Source Information.

The in-game About/Credits and final chat reply must both contain **Source Information, Testing Feedback, Engine Feedback, and Prompt Feedback**, with every field/question from the brief answered in its required order. Include actual engine/library versions, source research URLs, original-versus-inspired attribution, asset provenance, animation/audio systems, online/local distinction, test conditions, and environment/model details exactly as applicable. Use `unknown` where something cannot be confirmed. The Usage value is exactly **added on import**; never estimate cost, tokens, or time.

Write the builder's required machine-readable exit interview using the brief's exact object schema and required location. Include all source-information keys, four testing answers, six engine answers, four prompt answers, and the complete AI Hub catalogue object. Arrays must contain plain-text answers in order. Set catalogue type to Game, select the closest allowed genre (Shooter fits this design), declare actual players/controls, and use 3–6 accurate lowercase tags. Validate JSON parsing and the schema. This is a builder artifact distinct from the planner's separate interview.

Record what changed in the engine and why, including any touch input, online auto-pause, or asset/animation extensions. Report real issues found and fixed, identify actual limitations of headless sound/device testing, and distinguish a successful automated playthrough from human playtesting.

Accept the build only when:

- The chosen original identity is present throughout, with completed source-specific art, animation, audio, writing, and credits.
- Six original chambers, all mechanics, meaningful failure/retry, all finale stages, victory/results, and replay work through ordinary controls.
- The one-bolt commitment, hidden-information rules, resonator tradeoff, and next-room scoring remain clear and consistent in solo and co-op.
- Controller-first menus, native mouse/keyboard behavior, touch assistance, developer sliders/reset, and 10-second attract/wake work as specified.
- Standalone solo/couch co-op and Hub shared-world co-op work in the actual packaged file; no-player hosting and terminal shutdown pass.
- The one-command test suite passes for the final artifact, targeted craft checks are inspected, and all required metadata/feedback artifacts parse and agree with the game.
- No TODOs, placeholders, dead menu entries, fake network features, missing assets, unexplained starter content, or unimplemented promised systems remain.
