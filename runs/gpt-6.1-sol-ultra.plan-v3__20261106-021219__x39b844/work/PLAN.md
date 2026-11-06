# Build plan

## Mandate and working method

Build an original, complete expedition inspired by the 1982 Intellivision **Advanced Dungeons & Dragons**, later called **Cloudy Mountain**. The direction is a controller-first, overhead action-adventure: a readable wilderness route above ground, tense bow-and-arrow exploration below it, and a two-guardian treasure climax. Use the supplied engine's native shaded, code-drawn characters, scenery, and procedural animation as the foundation.

The title is entirely yours. Privately produce 50 playful riffs on the source name, select one with a real random-number generator, and use that result consistently. This plan supplies neither a title nor candidates. Use the development-folder and delivery filenames from your own brief. Every implementation path below is relative to that development folder; place the finished delivery artifacts where your brief requires them.

You are gpt-6.1-sol ultracode with a 1.05M context window. Use that capacity to understand the actual engine, its examples, the session protocol, the content model, and the complete game together. Keep authoritative contracts and implementation consistent across systems. Do not turn this into a tiny mechanics sketch, an engine showcase with disconnected examples, or a large quantity of unfinished rooms. The target is a polished 18–25 minute first expedition, faster on replay, containing every mechanic and all necessary product infrastructure. The milestones below are integration gates toward that complete result, not alternate stopping points.

Keep a short requirement/evidence ledger in `docs/verification.md`, an architecture record in `docs/architecture.md`, and research notes with links in `docs/research.md`. Record substantive decisions, current risks, actual test results, and unresolved facts. These are working memory, not substitutes for implementation. Use parallel agents for bounded research, native asset/animation work, content authoring, and adversarial testing when useful. Agree on interfaces first; give each contributor distinct files; integrate and play the result yourself.

Rendering performance targets and optimization are outside scope. Spend detail on atmosphere, expressive creatures, animation, lighting, and effects where they improve the game. Shared-machine limits and the network protocol's traffic limits still apply. Keep files and caches inside your assigned development folder, avoid RAM-backed temporary storage, keep at most one or two browsers open, and stop only processes you launched, by PID.

## Research and technical starting point

### What the source establishes

The [original instructions](https://history.blueskyrangers.com/instructions/addinst.html) describe an overworld, persistent discovery of cave passages, scarce arrows, ricochets that can hit the shooter, sound and tracks as warnings, boat/axe/key terrain gates, and two dragon-guarded crown halves. Three adventurers are sequential lives, not three simultaneous party members. Some creatures sleep; slow blobs are indestructible. Cave exits use guarded ladders. The [production history](https://history.blueskyrangers.com/mattelelectronics/games/addcloudy.html) identifies the 1982 cartridge and explains the later Cloudy Mountain subtitle. This is distinct from Treasure of Tarmin. Simultaneous co-op, the arrow-light/noise interaction, and the authored campaign below are original adaptations. Exact original music and uninspected sound timbres remain unknown.

Before creating game content, read those primary sources, inspect the available screenshots and gameplay reference, and record what you actually inspected. Study the contrast between a simple strategic map and dangerous unknown passages, readable creature identities, and the economical fantasy-adventure prose. Write new world names, dialogue, descriptions, scenery, guardian designs, and music. Keep instructional prose concise and earnest, with a little adventurous wit.

### Verified engine baseline; recheck at implementation time

Planning inspected **my-3D2dge v0.89.1**, commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Start at the [handoff README](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/README.md). Vendor a coherent handoff revision and record its actual version and hash. If the upstream revision changes, read the changes before depending on these notes.

Read `API.md`, `docs/ASSETS.md`, relevant `AI_GUIDE.md` recipes, and the adventure and roguelike kits. Consult `API-INDEX.md` before inventing an API. Use the full `my-3d2dge.js`, which includes assets and has no runtime dependencies; the agent edition omits asset features this game needs. Start with the adventure kit's lifecycle and shell, borrowing grid/fog patterns from the roguelike kit. Replace starter gameplay and content completely.

Useful verified foundations:

- `E.Game`, scenes, `game.start`, `game.go`, camera follow/focus, menus, and the input abstraction.
- `E.TileMap`, `E.Grid`, `E.Fog`, pathfinding, and `E.FlowField` where appropriate.
- `E.Body` for actors; either extend `E.Bullets` or own the specialized arrow simulation.
- `E.Humanoid`, custom `E.Humanoid.weapon` and `E.Humanoid.pose` hooks, and attachment helpers. There is no built-in bow. Read their real signatures before writing the extension.
- Native asset primitives and `E.Blob` features for suitable small creatures; custom native-style forms for snakes, spiders, and dragons.
- Engine menus, input labels, controller glyph options, safe areas, audio buses, save facilities, and contextual `touchSet` controls.

The native world uses x/y ground coordinates, z height, and 16 world units per tile. Use one conversion module throughout navigation, projectiles, lighting, content, and tests. The three-quarter view needs `game.view.screenDirToGround()` for screen-relative movement and aim. Begin with `res:'ps1'`, `expand:true`, and an overhead three-quarter ground view. Use camera framing and presentation tests to settle the final scale. Do not assume every new game system is already in the kit.

Use the engine's painter-order pipeline: floor first, queued walls and actors with correct ground anchors, then effects, fog, and UI as appropriate. Lighting must work on the ordinary renderer; optional GPU effects need a working fallback. Fog is gameplay state, separate from light intensity. Explicitly omit currently unseen enemies from drawing, including shadows, health bars, target selection, and nameplates: dimming remembered tiles alone is insufficient.

### Verified multiplayer baseline

Read the complete [AI Hub contract](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md), its session client, examples, and harness. Planning inspected Session Protocol v1, client **1.4.0**, commit `35a1047f2067b2af3de3943f0fe452f39105d869`. Record the revision actually shipped.

The chosen scope is **1–2 players**: solo, two-player local co-op, two-player standalone network co-op, and AI Hub shared-world sessions. Do not expand to four players just because the engine supports them. AI Hub does not provide standalone room discovery: `AIHub.connect()` resolves to null outside a session. Standalone network play therefore needs the explicit adapter described below. Local co-op alone does not satisfy this plan's standalone network mode.

## The player experience

### Core promise

**Listen, place the shot, retrieve what you can, and find the way through.** A player should remember hearing a sleeping beast behind a bend, banking an arrow into the passage to draw it away, recovering the shaft, and slipping past to an exit they discovered themselves.

The bow is the principal weapon. Each arrow also makes light and sound. That creates the original systemic hook: one limited resource can hurt an enemy, briefly scout a passage, or lure a listener toward a different corner. An obvious shot may be less useful than a carefully placed miss. Scenery, creatures, and audio should make those choices understandable without a dense HUD.

The loop is:

1. Read a small wilderness map and choose an available route.
2. Enter a cave with a known quiver and incomplete information.
3. Read tracks, listen, reveal passages, and manage movement noise.
4. Fight, distract, or evade; recover missed arrows and locate supplies.
5. Claim a tool or relic, defeat or outmaneuver the exit encounter, and emerge elsewhere.
6. See a new route physically open on the map.
7. Use everything learned against the two final guardians, complete the relic, and see a proper ending.

Keep the campaign authored. Seed decorative variations and optional encounter variations only after the core route works. A seed must not randomize away a required tutorial, supplies, progression item, safe restart, or mechanic. Avoid crafting, classes, XP trees, equipment grids, procedural maze generation, and unrelated minigames. Future expansion should mean authoring new caves and encounters with the same tools.

### Campaign and pacing

The names here are functional content labels; give the places original in-world names during writing. Build roughly 25–30 meaningful chambers/passages across four delves, with loops, landmarks, and short connections. Count a chamber because it contains a decision, reveal, encounter, or reward, not because a grid has another rectangle.

| Segment | Approximate first-play time | Required experience | Progression |
| --- | --- | --- | --- |
| Trailhead and first delve | 4 minutes | Movement, aiming, first shot, darkness, tracks, safe recovery, rat, telegraphed snake, first supplies | Axe; guarded ladder exit |
| Forest route and second delve | 4–5 minutes | Visible forest opening, mandatory safe bank-shot lesson, bat sound interference, spider recovery stash, optional risky cache | Boat; new return shortcut |
| River route and third delve | 4–5 minutes | Boat crossing, lure an indestructible ooze, loop navigation, ground drake guarding a useful route, layered sound clues | Key; wall gate opens |
| Summit and two guardian wings | 6–8 minutes | Both guardians, one relic half each, all prior systems remixed, short connection between wings, final assembly | Complete relic and escape/resolution |
| Wilderness transitions and ending | About 2 minutes total | Route decisions, changed landmarks, camp/checkpoint feedback, victory tableau and results | Replay/continue options |

Time is a pacing target, not a speedrun requirement or a performance budget. Do not pad with empty walks or repeat the same fight. Include two or three optional treasure/supply alcoves that reward reading clues and taking risks. All mechanics and enemy archetypes must appear on the main route; optional areas remix them.

Make the wilderness a compact, attractive, playable route graph of approximately 8–10 landmarks. Navigation moves focus between adjacent reachable destinations; confirmation travels there with a brief ranger animation. Mouse users click the same destinations. Show the upcoming cave's main clue and a clear missing-tool symbol on blocked routes. Tool use is contextual and permanent for the party: axe clears the forest, boat unfolds for a crossing, key opens the gate. Tools are progression abilities, not separate combat weapons or consumable inventory puzzles.

The primary tool chain is axe → forest → boat → river → key → wall → summit. Add useful optional branches, supply choices, and return shortcuts within it. Cleared delves remain traversable as shortcuts for this slice. No repeated cave-clearing tax is needed. Each cave has a clearly justified one-way entrance and a discoverable exit; a locked gate must explain what opens it. Never let a player finish a cave while accidentally abandoning its required progression tool.

### Tutorial and narrative

Begin play quickly. Show a short expedition objective at camp and teach through the first cave, using a few brief contextual prompts. Stage the first hostile encounter after the player has moved, aimed, fired safely, and recovered a missed arrow. Put a visible safe supply before the first demanding fight. Teach a bank shot against a harmless target and then offer an immediately useful corner encounter. Teach the ooze with a visible failed threat response and an alternate route, not an unexplained instant death.

Dialogue is short text with synthesized gibberish, not spoken language. A guide, old trail marker, or expedition journal may supply two or three memorable lines. The relic and summit should be foreshadowed visually and acoustically from the map. At victory, visibly complete the relic, change the wilderness atmosphere, celebrate the rangers, and show an expedition result card. The ending must resolve the premise and support a clean replay.

## Rules and systemic design

### Movement, visibility, and sound

Use responsive ground movement with acceleration short enough to feel direct. Analog deflection provides quiet walking through running; keyboard Shift provides sprint. A focus/listen hold slows movement, reduces footstep noise, steadies the aim cue, and ducks music. It does not reveal exact hidden enemy positions. A short quickstep has a readable cooldown and adds noise; no stamina meter is necessary. Start tuning around a 0.9-second quickstep cooldown and a brief clearly animated evade window, then validate against the authored attack timings.

Separate three visibility states: unknown, explored memory, and currently visible. Traversal writes persistent explored memory. Arrows may briefly illuminate their local flight cells, clipped by walls and a short radius, without making them permanently explored. This is temporary scouting, not a whole-room wallhack. Only enemies in a currently visible or legitimately arrow-illuminated cell render; echoes alone never draw their precise silhouettes. An arrow can still strike an unseen enemy through a valid physical path.

Implement sound as simulation events with origin, kind, loudness, timestamp, and a bounded lifetime. Walking, running, quicksteps, bow release, bank impacts, pickups, and monsters produce distinguishable events. Propagate creature hearing through traversable passages, attenuated by distance and occluding geometry. An audible clue around a bend should not imply the wrong physical direction merely because straight-line distance is short. Use a small navigation/acoustic graph, not unrestricted hearing through all walls.

Enemies investigate the event's origin rather than following a player's current location magically. Different species react differently to noise. Give listening a real advantage, but keep the game playable muted: directional coarse sound indicators, floor traces, environmental animation, and optional descriptive cue captions communicate equivalent actionable information without exact through-wall targeting. Avoid continuous rings and labels overwhelming the cave.

### Bow, ammunition, and bank shots

Begin with three arrows and teach replenishment immediately. Use a shared party quiver so tool acquisition, co-op disconnects, and ammunition ownership never create stranded progression. A default capacity around 12 is a starting balance value, not a sacred number. Supply piles retain overflow rather than deleting it. In co-op, draw from the same authoritative quiver, with both avatars showing a clear dry-fire response when it is empty.

Use one-damage arrows and small, legible enemy hit counts. A press starts a short bow draw, then releases one arrow; holding the button must not silently empty the quiver. Start near 0.18 seconds of anticipation and 0.22 seconds of recovery. Keep aim controllable during anticipation. Support a clear reticle, a short visible aiming line, and optional modest aim assistance that only considers visible threats. Do not show a complete predicted route through unknown rooms.

Arrows move continuously, collide along their swept path, and can reflect from walls/bank stones. Begin with a maximum of three reflections, predictable reflected directions, diminishing energy, and a visible/sonic distinction between flight, wall contact, damaging impact, and final landing. Expose the relevant values for tuning. Bank surfaces must look like plausible reflectors with readable angles. At least one critical-path arrangement must make a corner shot useful and understandable.

Compile collision geometry from the same content that draws the cave. Use verified engine contact-normal APIs if they fit; otherwise own a small swept segment collision routine over wall edges and explicit bank stones. A segment crossing a thin collider in one step must still hit it. Resolve the earliest contact, reflect using the contact normal, consume the remaining movement for that step, and offset away from the surface to prevent repeated zero-distance hits. Bound per-step contact processing. Test corner cases and diagonal walls explicitly.

An arrow that damages a creature is spent. A miss, deflection, or shot at an indestructible ooze remains recoverable when it stops. Never destroy arrows merely because their lifetime expires or they reached an inaccessible location: settle them at a reachable validated recovery point. Give every projectile and pickup a unique identity. Repeated contact reports or replicated messages must not produce multiple hits or duplicate ammunition. Ignore the shooter on initial release; after a bank, self-hit becomes possible and visibly fair. Do not inflict ordinary partner damage in co-op.

The ammo economy must be solvable by construction. Budget supplies against all authored damageable enemies on each route, with a margin for the intended difficulty. Do not add endlessly respawning ammo-consuming enemies. Place reserve supplies before mandatory guardians, and make spider-stolen shafts recoverable without requiring a shot to access the stash. Misses can be retrieved. Every committed checkpoint, including the checkpoint between guardians, needs sufficient carried arrows plus reachable supplies for the remaining mandatory encounters. Validate that condition rather than relying only on a whole-cave total.

Keep a normal Restart Cave/Section action available from pause even at zero ammunition. It restores the full current cave/wing restart snapshot, including creatures, quiver, and supplies, rolls back partial section progress, and records a restart; voluntary restart spends no reserve. It cannot restore spent expedition reserves, and it must not preserve dead enemies while minting fresh ammunition. Retain a guaranteed-solvable restart snapshot separately from any low-ammo resume state. An empty quiver should create tactical pressure and a recovery decision, not a permanently unwinnable save. Do not solve this with an unlimited emergency attack that replaces the bow economy.

### Enemy roster and guardians

Each creature needs a silhouette, characteristic locomotion, anticipation, attack or special behavior, hit reaction, defeat/withdrawal response, and a synthesized cue. Reuse the native animation grammar, not one generic blob with different colors. Hit counts below are initial balance settings.

| Archetype | Behavior and clue | Player lesson | Initial durability |
| --- | --- | --- | --- |
| Cave rat | Skitters between cover; scratching and small tracks precede a short committed rush | Aim deliberately; do not panic-fire | 1 hit |
| Coiled snake | Sleeps or waits; hiss and a raised coil telegraph a straight lunge, followed by recovery | Listen, bait, sidestep, then shoot | 2 hits |
| Bat | Roosts and flits; wing beats temporarily mask a nearby cue; position still has a visual alternative | Read multiple information channels | 1 hit |
| Cave spider | Takes loose recoverable shafts to a marked nearby stash, then defends or flees from it | Follow traces and reclaim resources | 1 hit |
| Slow ooze | Cannot be killed; follows strong local sound along corridors; visibly sheds embedded arrows | Lure and bypass rather than waste shots | Indestructible |
| Ground drake | Snoring, heavy prints, and a long windup precede a lane attack; turns slowly | Use geometry and recovery windows | 2 hits |
| First winged guardian | Armored front, readable listening/turning behavior, exposed flank; hurt triggers a telegraphed swoop | Combine noise placement and a bank/flank shot | 3 valid wounds |
| Second winged guardian | Telegraphs alternating breath lanes, then exposes itself during recovery; bank stones provide safe angles | Relocate, read the cue, and commit at the right moment | 3 valid wounds |

Drive regular enemies through explicit states such as dormant, alert, investigating, attacking, recovering, stunned, and defeated. Make hearing thresholds, vision rules, attack windups, cooldowns, and damage data-driven. Do not let a hidden enemy damage the player before the intended cue and reaction window. Prevent multiple contact-damage callbacks during one attack from consuming several hearts.

Give each guardian a distinct arena landmark and acoustic signature. Start the fight through approach, not a modal wall of text. Reinforce valid wounds with a visible change to the creature and arena, not only a number above its head. Invalid armor hits deflect or fall recoverably with a recognizable response. Both fights work solo and with two players; neither requires two pressure plates, synchronized button presses, or a particular class. One player may lure while another shoots, but one ranger can perform both actions.

### Health, expedition failure, and checkpoints

Use three clear health segments with silhouette/shape changes and brief invulnerability after damage. Keep health readable independent of color. Three shared expedition reserves evoke the source's fragile expedition while supporting modern retries. A solo death spends a reserve and, if any remain, restores the current cave checkpoint. In co-op, a downed ranger can be revived by holding interact nearby during a short safe window; the downed ranger cannot fight or attract attacks. If the window expires, spend one reserve and, if any remain, return them at a validated safe anchor. A simultaneous party wipe spends one reserve total and, if any remain, reloads the cave checkpoint. One damage event cannot trigger both paths and double-charge the reserve. The spend is persistent expedition state: restoring a checkpoint must not restore the old reserve count or erase the death/assistance record.

At zero reserves, show a proper defeat result with retry-expedition and return options. Offer a checkpoint retry for learning, visibly identified as an assisted continuation; it must not masquerade as an untouched successful run. Track the distinction in results. Supply enough safe practice and resources that the default expedition is demanding without being hostile to a first-time controller player.

Checkpoint at each cave entry, completed tool transition, and guardian-wing completion. A checkpoint contains the full relevant simulation state, content/version identifier, party progression, quiver, reserves, consumed resources, seed, and stable entity IDs. Reload atomically. Do not combine a new inventory with an old enemy state. Guard saves against interrupted writes and invalid schema. Where browser storage is unavailable, continue safely in memory and describe the limitation without a blocking error loop.

Solo and local co-op use local saves. A standalone network host owns the shared expedition save; the guest's unrelated solo save stays separate. Hub rounds use session state and do not overwrite local campaign saves. Dev experiments and attract mode use isolated transient state. Provide New Expedition and Continue where a valid local save exists; require an intentional menu action before replacing it.

## Presentation, animation, and audio

### Visual direction

The engine's native shaded pixel/skeletal style is the base. Build original rangers with readable bows and quivers, small creature rigs, larger articulated dragons, distinctive tool props, relic halves, tracks, and cave dressing. Generic rocks or vegetation may come from the engine library; source-defining objects deserve custom work. Do not import an unrelated art pack or switch rendering styles halfway through the game.

Give each delve a deliberate palette and material identity: dry pale stone, root-choked green/brown passages, cold waterlit masonry, and a dramatic summit with warm/cool guardian wings. Use pools of light, silhouetted banks, moving foliage, dust, spores, ripples, and restrained particles to make still moments interesting. The map should read as a handcrafted miniature of the same world, with the opened forest, boat crossing, ruined gate, and altered summit visible after progression.

Keep hero/creature ground anchors and depth ordering correct. Tall walls near the ranger need cutaway/fade behavior that reveals the playable floor without revealing hidden enemies. Telegraphs must remain visible through foreground decoration. Compose rooms so exits, banks, tracks, supplies, and attack lanes can be identified at TV distance. Extra detail must serve those priorities.

### Animation deliverables

Extend the native rig/pose system for bow draw, release, recoil, nocking/recovery, quiet walk, run, quickstep, listening, hurt, downed, revival, pickup, climbing, boat travel, and celebration. Attach arrow and bowstring endpoints to actual rig attachments. The projectile should originate at the bow, not the character's feet or screen center. Test left/right and diagonal aim, moving aim, and interrupted animations.

Creature animation must communicate state: rat anticipation, snake coil and extension, bat roost/flap, spider leg coordination, viscous ooze movement, drake breath windup, dragon wing loading and swoop, and distinct guardian defeat sequences. Timing is driven by simulation state, not independent draw-time timers. Animation events must not spawn duplicate projectiles on remote copies or after a paused frame.

### Code-only audio

All music, SFX, ambience, and voices are synthesized in code through Web Audio and the engine's synth/mixer. No audio files, encoded audio payloads, downloaded speech, or sample-library shortcuts. Procedural buffers created at runtime from code are acceptable. Use separate music, SFX, ambience if useful, and voice gains; do not multiply the music default twice.

Set music to **10% by default**, persist explicit user changes, and verify the effective bus level. Compose an understated expedition theme, cave variations, guardian intensity layers, short pickup/wound cues, a victory resolution, and a defeat cadence. Preserve quiet gaps for monster clues. Focus/listen should duck music rather than simply making every cue louder.

Give arrows a bow twang, directional passing sound, distinct bank ping, hit, landing, pickup, and dry-fire. Create recognizable but original rat/snake/bat/spider/ooze/drake/guardian cues, including distant summit snoring. Include a brief quiver-count click sequence as an optional diegetic check. Gibberish voices use pitch/formant/rhythm variations on the voice bus and accompany readable text. Unlock audio on the first genuine gesture, handle suspend/resume, and stop scheduled sound cleanly on exit or session end.

## Controller-first UX and supported inputs

Use the same screens and game rules across controller, keyboard/mouse, and touch. Design the HUD for 1920×1080 viewed at ten feet: health, shared arrows, reserve count, current small objective, and compact collected-tool/relic indicators. Use generous safe areas, large high-contrast text, and no web-style inventory grid. Start important text near a 28–32 CSS-pixel equivalent at 1080p and validate visually; scale it for the actual engine/UI resolution rather than blindly shrinking it with the world canvas.

| Action | Standard pad; PlayStation glyphs by default | Keyboard/mouse | Touch |
| --- | --- | --- | --- |
| Move / run | Left stick, analog speed | WASD; Shift sprint | Invisible left thumb zone; deflection controls speed |
| Aim | Right stick; retain last deliberate aim | Mouse position projected to ground | Optional right-thumb drag; visible-target assistance by default |
| Fire | R2 | Left mouse button | Right-side tap; one shot per intentional gesture |
| Focus/listen | L2 hold | Right mouse button hold | Aim hold/low-motion assisted focus; explain in controls |
| Interact / revive | Cross; hold for revive | E; hold for revive | Context-sensitive pop action only when available |
| Quickstep | Circle | Space | Left-zone double tap; optional common dodge assist |
| Field map | Triangle | Tab | Menu entry; no permanent map button |
| Quiver check | Square | R | Available through context/menu if desired |
| Pause | Options | Escape | One persistent small menu button |

Confirm the engine's standard-action mapping and add these bindings through its abstraction. Menus use stick/D-pad, Cross confirm, Circle back; keyboard navigation and expected Enter/Escape work too. Mouse hover moves focus and clicks activate the focused item. Aiming and clicking world objects are native pointer interactions, not controller-key emulation. Maintain consistent navigation, sensible initial focus, visible disabled reasons, and input-repeat delay. For couch co-op, support two distinct pads or keyboard/mouse plus one pad. Assign each physical device to one seat, show the assignment, and prevent another device's activity from silently taking control of an occupied ranger.

Prompts follow the last meaningful device used. Ignore resting gamepad drift and synthetic test/attract events for device switching. Default to PlayStation glyphs, with an Xbox A/B/X/Y option in Settings. Rebinding must update prompts and the controls page. Controller unplugging and tab visibility changes must not leave movement/fire held forever. Respect the Hub's Create/Options handling rules.

Touch keeps the screen almost clear: invisible movement/aim regions, multitouch pointer ownership, visible-target aiming assistance, easy pickup, and brief contextual actions. Prevent scroll/zoom gestures only over the game surface. Handle pointer cancellation, orientation changes, safe insets, and menu return without stuck actions. Avoid making a charged bow, simultaneous tiny buttons, or pixel-precise bank targeting mandatory. Provide forgiving bank targeting and the same optional aim/dodge assistance available to other input devices. Do not require audio, hover, or a hardware keyboard to complete the campaign.

Use the engine shell for pause, settings, controls/rebinding, fullscreen, motion/flash preferences, Developer Tools, and About/Credits. Pause actually stops a local solo simulation. In multiplayer, a player's menu is a live overlay and plainly says the expedition continues; clear their held actions. An explicit host-controlled shared pause may be offered outside Hub if implemented consistently. Never let opening a local menu freeze a dedicated authority.

## Attract mode, developer tools, and content handoff

After **10 seconds** without real input on the title/front-end menus, enter an AI-played or scripted attract expedition. Exclude an active game pause, an active network pairing flow, and Hub-managed sessions. Use a separate state/store/seed and no external connections. Show exploration, an audible clue with visual equivalent, a bank shot, a tool-opening transition, and a guardian moment before looping smoothly. A simple cheating director may warp between staged beats and use infinite supplies; its only job is to show the game well.

Display a quiet “press any input to play” prompt. Any deliberate controller, keyboard, mouse, or touch input exits immediately to the title. Consume that input and release any held actions so it does not fire, select New, overwrite a save, or accidentally join multiplayer. Internal replay actions must not reset the idle timer. Attract cannot write campaign progress, award completion, or trigger online messages. If browser audio remains locked before a gesture, visuals still run; do not pretend sound was audible.

Developer Tools must be reachable from pause. Reuse the engine menu system and expose:

- Restore health/reserves, infinite health, infinite ammo, noclip, fog reveal, and separate collision/navigation/hearing/LOS overlays.
- Warp to named cave/checkpoint/guardian, restart encounter or cave, choose a seed, and spawn a chosen enemy at a safe point.
- Inspect actor state, recent noise events, active checkpoint, projectile IDs, authority role, peer state, last input sequence, and traffic counters.
- Time scale and single-step tools that operate on the simulation clock.
- Live balance sliders, grouped into sparse pages: movement/focus/quickstep, arrow speed/recovery/reflection count, quiver yield/capacity, vision/hearing/noise, enemy speed/damage, and guardian anticipation/recovery. Include current value, sensible range, and Reset to Defaults.

Changing a slider must affect existing applicable actors rather than only the next load. Distinguish a tunable from an irreversible campaign action. Keep defaults in one data record and restore all changed values on reset. Dev effects stay out of ordinary saves and mark the current expedition as assisted. Only the authority may change shared rules. In Hub, retain a reachable read-only diagnostic view but disable world-mutating cheats and sliders with a brief reason; do not compromise a managed round.

Author levels and encounters as data. Use one documented schema with map geometry, stable IDs, spawn records, bank surfaces, tracks, sound properties, supplies, tools, triggers, exits, safe anchors, and checkpoints. Tiled-exported JSON is a suitable authoring input if useful; convert it at build time into the same runtime records. No editor runtime dependency belongs in the shipped game. Provide a commented example and a validator. A designer must be able to add a side chamber, move a guard, retune a cue, or add a new encounter without modifying engine code. Demonstrate that workflow on a real optional chamber, not a blank schema example alone.

## Multiplayer architecture and lifecycle

### One authority model for every mode

Separate deterministic gameplay state from rendering, input devices, storage, audio, and transport. Offline and couch play use an in-process authority. Standalone peers and Hub use the same commands, state schema, event IDs, and checkpoint logic through different transports. Use the engine's fixed-step lifecycle; its headless `game.advance()` advances in 1/120-second steps. Do not start another unrelated timer loop for enemies or bow damage.

Maintain explicit authority/client roles, simulation tick, round/connection epoch, content version/hash, and sequenced inputs. The authority owns movement validation, ammunition, hits, pickups, AI, gates, relics, deaths, reserves, checkpoints, and the final result. Clients may predict their own motion/aim and display transient feedback, but never authoritatively award damage or progression. Correct predicted motion smoothly; do not let a predicted shot consume the quiver a second time when confirmed.

Use a single shared camera and party visibility for the two-ranger expedition, with soft separation warnings and a generous bounded separation rule so couch play needs no split screen. Tune rooms and attacks for two bodies. The hard separation boundary must be visible before it stops travel and must never pull someone into an attack. Shared gates/exits use a short gathering zone/countdown; a downed, disconnected, or not-yet-spawned avatar cannot permanently block a transition. Every puzzle remains solvable by one ranger.

Late-arriving accepted standalone peers receive a complete current state and spawn at a validated safe anchor near the party with brief spawn protection. A guest departure removes that avatar and clears its pending interactions; shared inventory and progression remain. Standalone reconnection uses a fresh state handshake and a new input epoch, not stale commands. If the authority disappears, report the ended connection cleanly; do not invent implicit host migration. Couch join/leave also uses these player-lifecycle rules, capped at two total rangers. Keep couch and remote pairing choices unambiguous rather than accidentally assigning three seats.

### Standalone network transport

Implement a real direct WebRTC connection with manual one-time signaling. This is game-owned functionality, not a supposed Hub API. Consult the [W3C specification](https://www.w3.org/TR/webrtc/) and [official peer-connection guide](https://webrtc.org/getting-started/peer-connections) for current APIs. Both peers load the game. Host creates an offer, waits for complete ICE gathering, and exports an invitation; guest imports it, creates and exports a complete answer; host imports the answer. Begin the expedition only after the data channel and version handshake succeed.

Use a reliable ordered channel for handshakes/progression and an unordered short-lived channel for frequent input/snapshots, or an equivalently tested channel strategy. Validate message types, maximum sizes, protocol/content version, session nonce, sender role, and numeric ranges. Reject incompatible, malformed, expired, or wrong-role packets safely. Handle gathering timeout, clipboard permission failure, cancellation, retry, connection failure, and disconnect. Clipboard reads must be initiated by the user's action. Offer a compact expandable text fallback where the browser cannot copy/paste directly.

The main TV pairing flow is large Host / Join / Copy Invitation / Paste Invitation / Copy Reply / Paste Reply / Connect cards with status and Cancel. Do not fill the screen with SDP or fabricate short room codes backed by no service. Exchange can happen through the players' existing communication channel. Use a documented STUN configuration for candidate discovery as appropriate; never embed private relay credentials. Some networks need TURN: direct pairing is not a guarantee of universal internet connectivity. Report the actual tested scope and provide an honest connection failure message. No account system, paid service, or undeclared signaling backend is required.

Two browser contexts can verify the real production offer/answer and shared play locally. They cannot establish that every WAN/NAT combination works. Record that limitation accurately. Keep local/couch play functional even if all network access fails.

### AI Hub integration

Inline the **unmodified** session client as the first script in the head immediately after charset, before engine/game scripts. Add protocol metadata for session version 1, players `1-2`, mode `shared-world`, a concise goal, useful controls/how-to text, and an expected round duration. Invoke `AIHub.connect({mode:'shared-world',seats:[1,2]})` and branch on the actual result. In a session, do not construct standalone WebRTC/STUN connections, launch ordinary title/lobby/attract flows, or require input before readiness.

Install lifecycle listeners before declaring readiness. Use the Hub instruction card and call `AIHub.ready()` exactly once after genuine loading. `start` arrives before the common playable instant: no player movement or scoring until `AIHub.time() >= 0`. Handle `message`, `leave`, `time-up`, and `end` through the real documented API. Use `AIHub.rng(label)` or explicit shared seeds for gameplay randomness; do not assume `Math.random()` is synchronized.

Critically, `AIHub.server === true` is an authority with **no local player**. The server is not in the player roster. Do not create a phantom hero, require a local camera/input, or stop simulation because the page lacks focus. Use the engine's live-menu/auto-pause facilities appropriately, including `autoPause:false` where authority must continue. Rendering and audio are optional there; game logic is not.

Respect the documented hard limits: at most 20 outgoing messages/second/copy, 16 KB JSON per message, and preferably under roughly 1200 bytes for an unreliable packet. Start with sequenced held-input updates at 15 Hz and compact authority snapshots around 8 Hz. A host's local actions enter authority directly. Batch/coalesce progression events and resync requests through a rate limiter; count all sends, including startup and dedicated-server sends. Include input sequences, a heartbeat/held-state timeout, and acknowledgement/state ticks so dropped input cannot leave a ranger running forever.

Latest held state is not sufficient for one-shot actions. Give fire, interact, quickstep, and other discrete commands monotonically numbered IDs within the player's input epoch; queue them until acknowledged, retransmit through the same bounded transport, and deduplicate at authority. A press shorter than one send interval must survive. A lost acknowledgement must not create two arrows, two quiver debits, or two interactions. Use reliable batched commands or acknowledged retransmission as appropriate, while keeping all traffic inside the same send budget.

Send deterministic static content by seed/version or a bounded reliable initialization payload; do not send the whole map every snapshot. Use compact numeric dynamic state with stable IDs. If initial/resync state needs chunks, version and bound them, rate-limit delivery, and apply atomically. Budget actual serialized size and message rate in tests. This is protocol correctness, not an invitation to spend time optimizing the renderer.

Only authority resolves gameplay. Reliable progression events have idempotent IDs and are reconciled with periodic authoritative state, so losing an unreliable frame cannot lose a relic or duplicate an arrow. Synchronize enemy wounds, pickups, fog/progression, down/revive state, transitions, and the two-part relic. Use a fresh full snapshot for a loaded-late roster member. Hub roster changes follow the protocol; a departing non-host is final for that round. Remove their avatar and continue solo. Host departure voids the round; obey the coordinator rather than migrating it.

Authority calls `AIHub.finish()` once, with all currently active co-op participants tied in the documented standings shape, correct win/loss, and useful expedition stats. On `time-up`, finish within `graceMs`; an unfinished expedition can resolve as a withdrawal/defeat. On `end`, stop input, outbound traffic, simulation-affecting actions, and scheduled sound. Follow coordinator visibility/time-out decisions rather than promising that a background host can run indefinitely. In sessions, no custom chat/names/emotes, alerts/dialogs, navigation, game restart/title/quit flow, or extra sockets. Insert supplied player names as text. Ignore Options while Create is held as instructed by the contract. The ordinary Restart Cave/Section action is unavailable during a managed Hub round; authority-owned death recovery remains part of gameplay. Ensure Hub encounters have reachable reserve supplies so this menu restriction cannot strand the expedition.

## Implementation structure and delivery

Keep source modular and the final artifact singular. A suitable layout is:

```text
package.json
vendor/engine/             coherent engine handoff, assets, tools, licenses
vendor/hub/                unchanged session client and harness support
src/main.js                boot, capabilities, mode selection, lifecycle
src/config.js              defaults and live tunables
src/sim/                   state, clock, commands, movement, arrows, hearing, AI
src/content/               campaign graph, cave data, encounters, cue definitions
src/render/                camera, draw adapters, native assets, rigs, lighting
src/input/                 actions, pointer aim, touch adapter, device prompts
src/ui/                    HUD, front end, pause, dev tools, credits, pairing
src/audio/                 synth instruments, score, cues, mix policy
src/net/                   transport interface, local, WebRTC, Hub adapters
src/save/                  versioned checkpoints and storage policy
scripts/build.mjs          reproducible single-HTML packer
scripts/test.mjs           one quiet test orchestrator
tests/                     simulation, content, browser, transport, Hub tests
docs/                      research, architecture, authoring, verification
```

Adjust this structure to the handoff after inspection; do not build a generic framework unrelated to the campaign. Keep substantive engine changes small and documented, or clearly explain a necessary larger change. Prefer game extensions for the bow, hearing, campaign, and networking. Preserve engine credits/licenses. Record any altered engine behavior and why for the required feedback.

Bundle engine, needed native asset definitions, session client, game code, content, styles, and code-generated visuals into the delivered HTML. No localhost development dependency, local ES-module import, sibling asset fetch, or missing font may be required. Inline assets where practical; a CDN dependency is permitted by the brief but unnecessary for the verified core engine. Escape script-closing sequences inside embedded script text without altering the session client's executed code. Test the generated artifact after packing; the dev entry page is not sufficient evidence.

Use `file://` for final solo/local smoke tests. WebRTC should also be tried from the final file where browser support allows. The Hub harness needs HTTP: serve only your assigned folder, bound to `127.0.0.1` with a port chosen by the OS, and verify a unique marker proves the page is this game. Track and shut down that server by its own PID. Never claim or terminate a preexisting port owner. Use installed browsers; do not install browsers or host dependencies on this shared workstation.

## Build sequence and completion gates

### 1. Establish the real substrate

Finish source research, title draw, engine/protocol inspection, vendoring, version records, and the module/data contracts. Boot the full engine with one original ranger in a small cave. Prove native bow attachment, wall ordering, input projection, code audio unlock, file-based packing, and deterministic headless stepping. Separately prove a two-copy Hub handshake including a server-only authority and a real standalone WebRTC handshake. Resolving these risks early prevents a finished-looking campaign from depending on imaginary APIs.

Gate: the same production simulation can boot headlessly and in a browser; the final packaging pattern and both network transports are viable. Keep the simplest playable cave as an integration fixture, not a shipped placeholder level.

### 2. Complete the central playable loop

Implement movement/focus, swept arrows, bank shots, shared ammo and recovery, health/reserves, visibility, acoustic propagation, rat/snake behaviors, a supply, a tool, an exit, map route change, and a real checkpoint restart. Add sparse HUD/prompts, controller/mouse menus, and the first audio/animation pass. Author the first finished cave so it teaches these systems through play.

Gate: a real-input script completes that cave without state mutation or cheats, and a human-readable visual review finds the cave legible. Zero-ammo, death, wall-corner, self-hit, and retry cases are coherent. Run the same loop in two-player authority mode; do not defer all synchronization until after content completion.

### 3. Finish the full expedition

Author the remaining caves, tools, branches, shortcuts, complete creature roster, two guardians, relic assembly, victory, defeat, and replay. Build all native art and animation needed to make the slice distinctive. Add the score, complete synthesized cue set, voice gibberish, accessible sound cues, and environmental storytelling. Integrate co-op joins/leaves/revives/transitions against these actual encounters.

Gate: the whole campaign is completable with standard rules and every mechanic appears on the critical path. There are no tutorial promises for absent features, inaccessible supplies, undefined locked doors, repeated placeholder enemies, or unfinished ending screens.

### 4. Finish the product systems

Complete touch input and assists, controller rebinding/glyph preferences, Settings, save/continue, pause behavior per mode, attract loop, live developer sliders/reset, authoring documentation/validator, standalone pairing UI, Hub lifecycle restrictions, About/Credits, and the feedback/metadata data model. Verify local and Hub modes do not contaminate each other's saves, connections, or menus.

Gate: every front-end item works on pad and pointer, touch can finish a representative progression sequence, attract is isolated, and a dedicated authority runs without a hero. All requested screens and tools are populated with truthful information.

### 5. Verify, tune, package, and deliver

Run the acceptance suite below, fix real failures, tune encounters and presentation from evidence, and rerun only affected coverage plus final artifact integration after relevant changes. Review title, first cave, low-ammo tension, both guardians, result screens, and the 10-foot experience. Rebuild the delivery file, test that file directly, parse the builder interview, and reconcile recorded claims with actual evidence.

Gate: every requirement has implementation and evidence, or an honestly recorded environment limitation permitted by the brief. A complete feature cannot be replaced by an “unknown” label; that word is for facts and external verification you cannot confirm. Leave no TODOs, stubs, disabled promised modes, or placeholder credits.

## Verification plan

### One command and trustworthy evidence

Expose **`npm test`** as the single quiet orchestrator for meaningful content, simulation, browser, audio, standalone network, and Hub checks. Output failures and one summary line with real counts; capture verbose upstream logs to a dev-local report and surface them only on failure. Close browsers, contexts, audio resources, peer connections, and owned servers even after assertion failures. Keep tests deterministic where possible. Do not repeatedly rerun unchanged coverage for reassurance.

Use the engine's headless `E.Game`, `game.advance()`, input tap/hold helpers, debug snapshots, seeded RNG, and optional headless draw stand-in. Read the actual tool interfaces before using them. Headless draw errors such as `game.errors` are failures. Scene fades consume time; advance through them or explicitly disable them in focused tests. Drawing must not mutate gameplay or consume gameplay randomness. Clear/isolate engine stores between test cases.

A test inspector may expose state and route actions through the real input abstraction. Keep mutation/warp helpers clearly separate. The full-playthrough evidence must not teleport, give ammo, kill enemies, skip guardian phases, grant tools, force flags, or load a victory state. Fast deterministic stepping is fine. A recorded action director that walks paths, aims, shoots, interacts, and retries through production commands is useful both for tests and replay. Attract's cheating director is separate and cannot serve as proof of a legitimate clear.

### Coverage matrix

| Area | Required checks |
| --- | --- |
| Authored content | Graph reachability with each tool state; valid spawns/safe anchors; all exits and checkpoints; every mandatory mechanic represented; stable unique IDs; supplies cover damage budget at every checkpoint; zero-ammo recovery before each mandatory guardian; no gate depends on an item trapped behind itself |
| Arrows and resources | Swept collision; near-corner and diagonal reflection; bounce limit; no zero-distance loops; no repeated enemy/self damage; miss recovery; inaccessible landing relocation; capacity overflow retained; atomic pickup under simultaneous input |
| Threat information | Acoustic path/occlusion; wake/investigation state changes; live LOS vs remembered fog; no hidden enemy shadows/prompts; arrow light expires; muted cues preserve the encounter's intended information |
| Survival | One hit per attack; damage immunity interval; solo death; co-op revive; expired revive; simultaneous wipe costs exactly one persistent reserve across reload; zero reserves; checkpoint restores enemy/ammo state together; voluntary restart costs no reserve and rolls back the whole section |
| Campaign | Standard-rules scripted complete expedition; all tools visibly open their routes; both relic halves; two distinct guardians; proper ending, defeat, replay, and continue |
| Saves and settings | Reload at every major checkpoint; corrupted/unsupported save handling; storage denial; isolated dev/attract/Hub state; music default and persisted user override; resetting live tunables |
| Inputs | Stubbed standard pad; PS/Xbox prompts and rebinding; input switching; pointer hover/click and aim; keyboard held-state cleanup; controller loss; touch multitouch/cancel, quickstep assist, contextual interaction, rotation/safe insets |
| Attract | Idle threshold at 10 seconds; representative loop; every device exits and consumes input; held input cleanup; save checksum unchanged; no networking; no Hub activation |
| Online gameplay | Two peers fight the same enemy; one projectile applies one wound; a press shorter than one send interval survives loss/reordering and spends one arrow exactly once; contested supply credits once; tool/gate/relic agreement; join/bootstrap; guest departure; reconnect rules; transition cannot wait on a removed avatar; shared victory exactly once |
| Packaging | Final file launches without sibling imports; solo and local play from file; actual final file under harness; script order/metadata; no audio-file requests; no missing assets; no runtime errors |

Track issues with IDs and severity when tests actually discover them. Count distinct defects, not failing assertions or repeated reruns, for the requested feedback. Record which tests were most and least useful from actual experience.

### Browser and presentation checks

Use the installed Playwright version matching the workstation browsers. Python automation should run through the provided Playwright environment, not system Python. If using Node, pin the matching installed-browser version; do not trigger a browser download. Stub `navigator.getGamepads()` with standard-mapping pads to test axis edges, buttons, disconnect, prompts, menus, and representative combat. Use phone/tablet profiles and real pointer/touch events for mobile checks. Exercise Chromium plus a relevant secondary engine for startup/input/storage fallback; WebKit emulation is not a real iPhone certification.

Screenshots are for judgments state cannot settle: TV-distance typography, hero/arrow visibility, painter ordering, fog boundaries, dense scenery, touch clutter, focus indicators, guardian tells, and About/Credits fit. Capture a small purposeful set at title, cave tension, map transition, each guardian, results, and a touch layout. Do not use screenshots as proof that a button, pickup, save, or network message works. Do not claim target hardware tests that were only emulated. No FPS acceptance target or optimization work is required.

Render synthesized cues/music into an `OfflineAudioContext`, or inspect the live buses with analysers where the engine architecture requires it. Verify nonzero finite output, bounded peaks, the 10% default music gain, correct bus routing, distinct cue envelopes, focus ducking, unlock/resume behavior, and clean stop. Without a listener, musical quality remains a judgment based on composition and signal evidence; do not claim human listening occurred.

### AI Hub harness matrix

Vendor the unchanged harness/support files and run the delivered artifact through the actual harness. For this two-player game, use:

1. `players=2&auto=1`.
2. `players=2&latency=150&jitter=50&loss=5&auto=1`.
3. The adverse two-player case with `scenario=host-leave`.
4. `players=2&scenario=server&auto=1`.
5. A one-player session if supported by the current harness.
6. Explicit guest removal during play, followed by a valid solo continuation/finish.

Use the documented `game` query parameter pointing at the final HTML. Wait for `document.body.dataset.complete === 'true'` and require `window.__hubCheck.pass === true`, with a bounded failure timeout. The ordinary harness removes a guest automatically only at higher player counts, so the explicit two-player removal test is necessary. Do not run four copies while declaring a two-player capability and call that compliance.

The harness proves protocol behavior, not combat synchronization. Separately instrument two actual copies using production actions to prove hit/pickup uniqueness, state agreement, tool and relic transitions, dedicated-server behavior, departure handling, time-up, and win/loss delivery. Test real standalone WebRTC offer/answer and shared progression too, including malformed pairing data, cancel, and host/guest loss. Do not replace production transports with a loopback mock for these acceptance checks.

## Final obligations and honest reporting

Use the exact HTML filename, development-folder name, and builder-interview filename/schema from your own brief; this plan deliberately supplies none of those run-specific names. The bundle is the game deliverable, while modular source, tests, authored content, and documentation remain available in the development folder. The plan metadata should identify the actual plan filename you were given.

Populate **Source Information, Testing Feedback, Engine Feedback, and Prompt Feedback** in both the final chat response and the in-game About/Credits screen. Preserve every required metadata field and answer every requested feedback question in order. Include those answers in the exact machine-readable interview structure required by your brief; validate that it parses and that the catalogue fields agree with the game.

Source Information must cover date, source, plan, genre/perspective, actual tech versions, art direction, animation, code-only audio, network modes, allowed testing and performed research, environment, and the builder's own model/effort. Use the values from your own brief and the actual implementation, not this planner's surrounding run identifiers. Set usage to the exact string **“added on import”**. Write **“unknown”** for facts you cannot confirm, including unperformed real-device/WAN checks; never estimate cost or invent testing results.

For the catalogue, use the builder's randomly selected title consistently, an original short tagline and description, type Game, genre Adventure, a truthful 1–2 player count, a concise controls line, the source/franchise attribution, and 3–6 accurate lowercase tags. If the final design warrants a different allowed genre, change it consistently with the implemented game rather than the plan's aspiration. List network modes and their tested limitations plainly.

Before finishing, confirm that a new player can launch, understand the objective, complete the expedition, lose and retry, change settings, discover the developer tools, watch and dismiss attract mode, play the supported co-op modes, and read the credits without encountering a broken or empty path. Deliver the finished game and concise evidence of verification, with truthful feedback and no unfinished promises.
