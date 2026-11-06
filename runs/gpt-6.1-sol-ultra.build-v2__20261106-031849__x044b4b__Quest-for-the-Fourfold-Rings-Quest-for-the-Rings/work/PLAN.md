# Director’s build plan

Build an original, complete cooperative fantasy action-adventure inspired by **Quest for the Rings (1981)**. The defining experience is two differently gifted heroes stealing a ring from a hostile labyrinth, then escaping together while an unseen Ringmaster changes the terms of the expedition. Make the cooperation, threatening geography, and stolen treasure memorable enough that the player wants another expedition.

This plan is for **gpt-6.1-sol, reasoning effort ultra, with a 1.05M-token context window**. Use that capacity to maintain a coherent view of the engine, the multiplayer contract, the whole campaign, and the evidence that it works. Build the finished slice, including the awkward integration cases. Do not substitute a small arena prototype for the expedition or defer required systems to hypothetical future work. Large context is useful for integration and review; it is not a reason to add unrelated systems.

Choose the title yourself. Privately brainstorm 50 playful riffs on the source’s name and select one with an actual random-number generator, as the build brief requires. Use it consistently in the game and catalogue. This plan deliberately supplies neither a title nor delivery filenames. Take the development-folder and delivery-naming rules from your own brief. Every example path below is relative to **your development folder**.

## 1. Research foundation and adaptation

Read the [original manual transcript](https://odyssey2.info/library/manuals/us_questfortherings/quest-for-the-rings.txt) and inspect the [scanned manual](https://odyssey2.info/library/library_view.php?i=53), including its illustrated packaging and gameplay screens. The essential historical facts are:

- A physical castle-route board links simultaneous two-hero labyrinth action. Ten hidden rings, expedition turns, and a human or computer Ringmaster structure the quest.
- Warrior kills lesser foes; Wizard temporarily neutralizes threats; Phantom passes through stone/crystal but remains vulnerable to lava; Changeling’s invisibility redirects attention without preventing contact damage. Ring acquisition benefits both heroes.
- Four labyrinth families are Dungeons, Crystal Caverns with disappearing walls, lethal Infernoes, and Shifting Halls. Orcs/Firewraths, spider and flying Nightmares, and indestructible dragons create different obstacles.
- Human Ringmaster play includes possession. One/two-player practice can use the computer Ringmaster.
- The presentation combines colorful maze silhouettes, gold fantasy illustration, and grand, ominous prose. The manual describes a lightning/trumpet ring celebration. Exact original audio timbres and any continuous musical score remain unconfirmed.

The rest of this document is an **original adaptation specification**, not a claim about the original game. Four rings replace ten for a compact, conclusive expedition; ring extraction, a modern companion, readable telegraphs, and the final encounter are new designs. Preserve the source’s relationships between abilities, enemies, and dangerous spaces. Write new fiction and dialogue; create new assets rather than tracing the packaging.

Before implementation, also inspect these supplied foundations:

- [Engine handoff README](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/README.md), [API card](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/API.md), [adventure kit](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/kits/adventure.js), and [asset manual](https://github.com/michaelcrosato/my-3d2dge/blob/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff/docs/ASSETS.md). Reviewed baseline: **my-3D2dge v0.89.1**, commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`.
- [AI Hub Session Protocol v1](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md), [session client](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/session.js), and [harness](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/harness.html). Reviewed client: **1.4.0**, commit `35a1047f2067b2af3de3943f0fe452f39105d869`.

Record the revisions actually used. If the supplied handoff has changed, read the corresponding documentation and reconcile the differences before relying on an API. Historical research, engine research, and protocol research are different evidence; keep their findings distinct.

## 2. The game to make

**Genre:** cooperative action-adventure with tactical labyrinth exploration and a compact expedition board.

**Perspective:** fixed three-quarter ground view using the engine’s native rendering. Use a shared camera for couch play and frame both heroes, nearby threats, and the escape route. Keep the same comprehensible spatial language online. No camera rotation is necessary.

**Players:** one human with an AI companion, or two humans. Standalone supports couch co-op with two pads or keyboard/mouse plus pad. AI Hub supplies online shared-world co-op. Clearly label these modes; the supplied Hub library does not supply standalone online matchmaking or transport. Do not imply that it does.

**Campaign:** approximately 20–30 minutes on a first successful playthrough, with an actual ending and replayable route decisions. Timing is a design target, not a speedrun requirement. There are four selectable hero archetypes, four complete labyrinth families, an adaptive but bounded Ringmaster, and one final dragon-and-seals encounter. All these systems must appear in the shipped expedition.

Three pillars govern choices:

1. **Rescue beats damage.** Distract, stun, phase, guard, revive, and carry treasure. Combat serves the escape; killing everything is rarely required.
2. **The labyrinth is an opponent.** Concealed walls, moving partitions, flame lanes, and attack geometry change how a room is played.
3. **A stolen ring changes the expedition.** The extraction is a clear cooperative climax; its recovered seal opens a visible shortcut and contributes to the final victory.

Do not add crafting, loot inventories, gear rarity, skill trees, open-world travel, independent online infrastructure, or a playable human Ringmaster to this slice. Put the available effort into the complete expedition and its presentation. The Ringmaster is a real authored director system, not merely a portrait above random enemy spawns.

## 3. The player’s journey

### Opening and teaching

The title screen should immediately communicate two heroes, a gleaming ring, and a watching antagonist. Offer New Expedition, Continue when a valid checkpoint exists, How to Play, Settings, and About/Credits. Let an unclaimed controller join without an account or lobby form. Hero selection uses four large animated portraits with one short explanation each; duplicates are allowed.

Begin at a small safe courtyard. Teach movement, aiming, primary action, class power, dodge, and contextual interaction through a short playable approach. Offer dismissible prompts when relevant; do not require a separate text tutorial. Show the companion making one useful action early. The first castle teaches ring pickup and extraction before combining hazards.

### Expedition board

Use a beautifully staged tabletop/enchanted-map scene with large castle tokens, visible paths, four empty ring sockets, an hourglass-shaped Dread indicator, and the Ringmaster’s hand or shadow. This is a controller-navigable choice screen within the same game, not a dense strategy dashboard.

The opening Dungeon is mandatory. Then the other three castles can be approached in different orders through a small connected graph. Add two optional cache nodes, each a short authored challenge using an existing labyrinth family. Reveal the reachable destinations, travel consequences, and next castle’s hazard/monster token before confirming. Every required castle must remain reachable without a consumable or a particular class.

Each completed ring unlocks a specific map shortcut. The player should see the route change, rather than only a counter increasing. Cache rewards are immediate team benefits such as a heal or one-use ward; they require no inventory screen. Make their additional expedition pressure explicit.

Use **Dread**, a capped turn-based expedition pressure, instead of an opaque global real-time deadline. Entering a castle/cache and retrying a failed attempt advances it by a visible step; safe tutorial activity, pause, menus, and accessibility reading do not. Dread selects authored escalation tiers, never an impossible layout. A suggested starting range is 0–6, capped at 6. Charge once on initial castle entry and once per failed-room retry; moving to room two or loading Continue does not charge again. Mandatory routes, optional detours, retry behavior, and final difficulty must be balanced together. Players can retry even at maximum Dread.

The lowest-numbered active human seat chooses the party’s destination, with a clear on-screen indication. Other players retain control of their own safe-waystone hero changes. Route choices and hero changes are validated input intentions applied by the simulation authority. If the route chooser leaves, assign the remaining human; a server-only host never needs to operate this screen.

### Room loop

Read the space → manipulate enemies/hazards → reach the ring → carry it to the lit exit → secure it on the board. Ring ownership is shared. A carrier remains able to use their class power, but the ring visibly attracts danger. The other hero can distract, guard, reveal a path, or revive.

Use one contextual interaction action for pickup, pass to a nearby willing teammate, and revive. Resolve context by clear, stable priority and show the selected target. Do not make the player drop the ring when trying to revive. A downed carrier drops it at a valid nearby walkable position. Recover it automatically from an unreachable hazard using the last safe location, with an obvious return effect. Ring delivery and room completion are idempotent operations.

### Ending

Four secured rings open the final site. The Ringmaster wakes an indestructible dragon and attempts to rebind the seals. Players win by using the four recovered rings at four stations while surviving its patterns, then completing a shared escape. Show the dragon being contained or the curse breaking, followed by a short victory tableau, expedition results, credits, and working replay/return options. A conventional dragon health-bar kill would weaken this adaptation.

## 4. Hero and cooperation design

Implement four genuinely different kits. These proposed kits elaborate the source roles; their exact numbers are live tuning data. Everyone can move, aim, dodge, interact, carry a ring, revive, and finish any objective.

| Hero | Primary action | Class power | Cooperative purpose and constraint |
| --- | --- | --- | --- |
| Warrior | Short directional sword arc; kills lesser enemies and clearly deflects on impervious threats | Facing guard/brief shield brace | Creates a safe crossing or extraction window. Strong commitment and recovery prevent holding attack to solve every encounter. |
| Wizard | Aimed rune bolt that stuns rather than deals universal damage | Short-lived ward that interrupts a flame lane or intercepts a projectile | Turns dangerous timing into a usable window. Stun recovery is visibly communicated; large threats resist repeated chaining. |
| Phantom | Spectral pulse that reveals nearby concealed geometry and briefly repels lesser threats | Limited-duration phase through tagged interior walls | Opens routes and scouts. Excludes outer boundaries, seals, lava, and invalid destinations; slowed traversal and a safe re-entry preview make the risk legible. |
| Changeling | Place one short-lived lure/echo that draws eligible enemies | Limited-duration cloak with slower movement | Diverts pursuit for a teammate or a revive. Collision remains dangerous. A carried ring’s glow still reveals the treasure, preserving the extraction problem. |

Do not quietly turn every primary action into a damage spell. Give each class a distinctive pose, silhouette, sound, effect, and UI symbol. Enemies that cannot be killed need an unmistakable response to a hit, stun, deflection, or failed attack.

All ten unordered two-hero class combinations, including duplicates and non-damaging pairs, must be viable. Class-specific passages are shortcuts or alternative solutions. No mandatory door requires a specific class. Every encounter has a movement/timing solution alongside the stronger class interactions. Let players change heroes at safe board waystones, retaining expedition progress.

Use a small, readable health display; five pips is a reasonable first tuning value. On zero health a hero becomes downed and can be revived by a short, interruptible hold. Both heroes downed means room failure. A surviving hero may complete an extraction and bring a downed partner to safety; do not require an incapacitated character to stand on an exit. Restore the party at the checkpoint after failure, with the documented Dread consequence and no loss of previously secured rings. Avoid a revive timer that creates a long spectator wait in this slice.

### Companion and local joining

The solo companion is a full participant using the same world rules. It follows traversable paths, avoids telegraphed danger, uses its own class power, assists the ring carrier, and prioritizes a safe revive. A contextual ping can request follow, help, or an objective without opening a command wheel. It must understand shifting navigation and concealed-wall knowledge.

Use a small utility/behavior system with explicit priorities: escape immediate hazard, rescue when safe, support carrier, execute objective, then follow. Stuck recovery may relocate the companion only to a verified safe point near the human, visibly and without awarding progress. Never teleport it through an objective gate or let it collect unseen rewards.

An arriving second local player takes over the companion at a safe transition. A controller disconnect opens a readable reconnect/continue-with-AI choice in standalone; a remote departure transfers that hero to AI without freezing the session. Hero ownership, input device, and AI control are separate fields.

## 5. Content that proves the whole game

Author an eight-room core: two rooms per castle, plus the final encounter. The courtyard, map, and two optional cache challenges complete the slice. A room is an authored playable layout, not a palette swap with more enemies. The first room in each castle teaches its rule; the second combines it with enemies and a ring extraction.

| Site | Required experience | Signature content | Completion evidence |
| --- | --- | --- | --- |
| Dungeon, rooms 1–2 | Discover melee/stun/lure cooperation, retrieve the first ring, revive safely | Gatehouse, occluding stone arches, sword enemies and ranged fire threats | Solo and co-op can secure the ring; no combat-clear prerequisite blocks non-damaging pairs |
| Crystal Caverns, rooms 3–4 | Learn wall reveal, remember a route, carry the ring through alternating visibility | Crystal ribs, ripple/reveal effects, spider drops with marked shadows | Hidden geometry remains navigable and cannot trap a player without feedback |
| Inferno, rooms 5–6 | Cross telegraphed flame lanes and exploit safe islands | Molten channels, furnace doors, dragon-flame preview, Wizard ward opportunity | Every class pair can cross through timing; phase/cloak never silently grant lava immunity |
| Shifting Halls, rooms 7–8 | Read impending movement, split/reunite, escape a changed route | Clockwork partitions, floor arrows, flying Nightmare pressure | Shifts preserve a valid objective path and never place a wall through a hero without a safe resolution |
| Final site | Reuse every family’s rule in a staged ring-binding escape | Bespoke dragon, four seal stations, Ringmaster presence, celebratory escape | Four rings are actually required and consumed/secured exactly once; victory occurs through play |
| Optional caches, two short layouts | Decide whether an immediate reward is worth another Dread step | One concealed-route challenge, one shifting-route rescue/cache | Reward and pressure are clear, single-use, and persist correctly |

Each room definition includes entry and fallback spawns, walkability, phaseable boundaries, ring/exit positions, hazard timelines, enemy budgets, reveal rules, navigation regions, camera framing, tutorial triggers, and AI waypoints where necessary. Validate these data rather than scattering special-case coordinates through game logic.

### Enemies and Ringmaster

Build five legible enemy families: a pursuing lesser fighter, a ranged fire threat, a ceiling-dropping spider, a flying Nightmare, and the dragon. Use separate silhouettes and wind-up/active/recovery poses. Teach one new threat at a time; later rooms combine them. No unavoidable damage from spawns, offscreen projectiles, or overlapping telegraphs.

The Ringmaster has an explicit encounter budget and cooldowns. It selects from authored events appropriate to the current room, Dread tier, and player progress: activate a hazard lane, move a partition, send a limited reinforcement, or cast a possession echo. A possession echo visibly copies a hero’s silhouette/attack into a hostile projection; it does not silently steal the player’s controller. Its first appearance must be taught and every occurrence avoidable.

The director cannot stack every event at once or spawn directly on a player. It should pause escalation during teaching, revival recovery, and critical transition animations. Record its chosen event and reason in the debug snapshot. Use deterministic labeled random streams so a reported encounter can be reproduced.

The dragon finale has three clearly signaled beats: learn its sweeping breath and safe cover; activate the exposed seal stations while the Ringmaster combines learned hazards; escape after the final binding. Completing stations persists through the encounter’s internal beats. A full wipe atomically resets station activations and restores all four secured rings to their available binding state; campaign ring ownership is never permanently consumed by a failed finale. Provide alternatives to a Wizard ward and a Phantom shortcut so no loadout is mandatory.

## 6. Art, animation, sound, and writing

### Native art, bespoke identity

Use the engine’s richly shaded procedural pixel style: volumetric skeleton characters, continuous poses, textured surfaces, contact shadows, and colored light/glow. A three-quarter view with the supplied `ps1` resolution preset is a good starting point; tune it for readable silhouettes and TV UI. Avoid replacing the engine with an unrelated renderer or reproducing the original hardware’s limitations.

Set an art grammar: obsidian and warm gold for the Ringmaster and rings; cool luminous crystal for hidden paths; red/orange furnaces with pale safe stone; blue-violet machinery for shifting walls. Color reinforces shape and motion; it is never the only danger cue. Hero identity survives hurt flashes, cloak, phase, ring glow, and partner outlines.

Make original assets for the four heroes’ distinguishing gear, ornate rings/seals, Ringmaster silhouette, dragon, Nightmare forms, moving gates, crystal ribs, furnace mechanisms, castle tokens, and victory tableau. Use the engine’s library for generic masonry, vegetation, furniture, and rubble. Rooms need foreground/midground/background composition, readable floor paths, and small environmental motion. Detail can be generous; clutter must not conceal play.

Use depth-sorted native drawing and player x-ray/outline support behind walls. Concealed geometry must have proximity/contact cues and periodic reveal opportunities for every hero; Phantom’s pulse offers a stronger scouting advantage. Offer persistent outlines as an accessibility option. Set the camera’s maximum gameplay framing so hazards and silhouettes remain readable; long narrow rooms can use regroup points rather than unlimited zoom-out. The shared camera must not force heroes through dangerous geometry. On HUD, preserve crisp type, contrast, and safe margins when the world scales.

### Native animation

Extend the existing rigs and attack timeline. Share one wind-up/active/recovery definition between animation, telegraph, hit detection, and sound. Add class-specific cast, guard, phase-entry/exit, cloak, lure, carry, pass, hurt, downed, revive, ring acquisition, and victory poses. Build the dragon and unusual monsters as custom rigs in the native update/render idiom, with secondary motion and a readable anticipation pose.

Phase and cloak require clear entry, sustained state, expiry warning, and safe exit. A shifting wall needs anticipation, movement, and settlement. The ring celebration should feel exceptional without hiding a new attack. Screen shake, flashes, camera impulses, particles, and musical layers need reduced-motion/flash alternatives.

### Procedural audio only

Use the engine synth and code-created Web Audio instruments. No recorded or generated audio files are part of the game. Compose a quiet ominous title/courtyard motif, sparse exploration music, escalating hazard layers, a final encounter variation, and a ring/victory fanfare. Use short pitch/noise/envelope designs for footsteps, weapons, stuns, stone movement, crystal reveal, fire, revives, menu focus, and pickups.

Voices are code-synthesized gibberish with character-specific rhythm and pitch. Caption every meaningful line. Write compact, grand fantasy prose with restrained ominous imagery; the title can be playful without turning the adventure into constant modern banter.

Set **music to 10% in the actual Settings default**, including reset and first-run behavior. Keep master, music, SFX, and voice controls independent. Audio starts/resumes only after a user gesture; gameplay and Hub readiness never wait for audio permission. Attract mode is silent until audio has legitimately unlocked. Pause, hidden tabs, session end, and restarts must not leave orphan oscillators or double-running music.

## 7. Controller-first UX and touch

Use one screen hierarchy for all devices. At 1920×1080 a person ten feet away must read objectives, health, focused menu items, contextual actions, and failure explanations. Prefer large focus targets, short text, modest safe margins, and a sparse HUD. Put detailed metadata on a paginated About screen, not in the action HUD.

Suggested action mapping, adjustable through the engine’s rebinding system:

| Action | Standard pad / PlayStation labels | Keyboard and mouse |
| --- | --- | --- |
| Move | Left stick | WASD; arrows as an alternative |
| Aim/facing | Right stick; facing-based aim assist when idle | Mouse position in world |
| Primary | R2 | Left mouse |
| Class power | L2 | Right mouse |
| Dodge | Cross | Space |
| Context: interact/pass/revive | Triangle | E |
| Companion/objective ping | R1 | Q |
| Map/objective view | Square (standard button 2); Touchpad as an additional binding where present | Tab |
| Pause | Options | Escape |
| Menu confirm/back | Cross / Circle | Enter / Escape, pointer clicks |

Default to PlayStation glyphs; offer Xbox A/B/X/Y labels in Settings. Prompts follow the last meaningful input, with analog dead zones and hysteresis so drift cannot flicker prompts. Mouse hover moves menu focus, clicks activate, and aiming transforms through the camera correctly. Suppress browser context menus only where right-click is a game action. Consume menu-closing inputs so they cannot also attack or select a new screen.

In an active Hub session, respect the Hub-owned Create+Options chord. Opening a local menu neutralizes that player’s commands while the shared world continues. Standalone pause stops its simulation. Explain the online behavior with a small, readable status line.

For touch-only play, keep only a menu affordance permanently visible. Use an invisible left movement stick and right aiming zone, multitouch tracking, forgiving aim assistance, and contextual auto-primary. Show a temporary class action when useful and a contact-sensitive interact/revive action when in range. Provide a brief first-use explanation and an accessible evade gesture or small contextual evade control. Do not require simultaneous precise aiming, movement, and multiple tiny buttons. Ensure every hero power and every mandatory interaction is reachable through touch; assistance may handle targeting and timing, but it cannot bypass the expedition’s rules. Test actual simultaneous pointer IDs and cancellation, not only taps on menus.

Include readable subtitle size, high contrast outlines, reduced motion/flashes, configurable screen shake, aim assistance, and volume controls. Menu focus must remain visible with a pad, mouse, and keyboard. Returning from a submenu restores the previous selection. Settings and help never strand the player without a back route.

## 8. Attract mode, checkpoints, and development tools

### Attract mode

After exactly ten seconds without meaningful input on an eligible standalone title/menu screen, start a looping AI-played expedition showcase. Show ring extraction, all four environment rules, distinct heroes, and the dragon in a compact sequence. Use the real simulation and authored rooms; controlled cheats and shortened transitions are allowed for this presentation. Label it clearly as a demonstration.

Any meaningful input exits immediately, consumes that input, restores the title focus, and restarts the inactivity timer. Run attract in a separate disposable world: it must never change a save, a real run’s state, statistics, or network state. Do not start it over settings, credits, gameplay pause, or any Hub session. Verify idle entry, exit by every supported device, repeated loops, and no leaked audio/timers/entities.

### Checkpoints and recovery

Save standalone progress atomically at safe transitions: castle entry after its Dread charge, room completion, and secured-ring board state. Clearing room one checkpoints the entrance to room two; failing room two retries room two with its ring restored to its original uncollected position. Continue restores that checkpoint, class pair, map changes, Dread, and consumed cache rewards, without a new entry charge. Explicitly abandoning an unfinished castle clears its temporary room progress and returns to the board without refunding Dread; secured rings remain intact. Do not promise arbitrary mid-projectile restoration. Version the save, reject malformed/outdated data gracefully, and handle unavailable/full storage without preventing play. Active Hub runs neither load standalone progress nor overwrite it.

Room failure offers Retry, Return to Board when valid, and Quit to Title with correct checkpoint behavior. Every ring, reward, door, and ending transition needs a single source of truth so retry, reconnect handling, and repeated interaction cannot duplicate progress. Repeated New Expedition and victory/replay cycles must cleanly dispose of the previous world.

### Dev mode

Expose Dev Mode from pause, navigable with pad and pointer. Include room jump, checkpoint restart, heal/revive, invulnerability, AI behavior inspection, enemy/hazard spawning in valid positions, collision/telegraph/navigation overlays, and a readable state inspector. Mark assisted runs clearly. Test hooks must distinguish normal input from debug mutations; a cheated run cannot count as the required normal playthrough.

Provide live sliders with displayed values and **Reset to Defaults** for at least hero speed, primary recovery, class cooldown/duration, stun duration, enemy movement/attack cadence, hazard telegraph length, damage, revive time, companion response, and Ringmaster event cadence/Dread influence. Route defaults and UI bounds through one tuning registry. Apply changes immediately and safely; avoid destructive remounts while dragging a slider.

In Hub play, only the authoritative host may mutate shared tuning or world state. Remote players can inspect and use local visual tools; explain disabled authoritative controls. Replicate host changes consistently. A server-only host remains operable by the automated harness without needing a camera or dev UI. Never expose a debug shortcut as ordinary victory evidence.

## 9. Implementation architecture and engine use

Keep the development sources modular, then bundle the deliverable. A useful organization is:

```text
src/entry.js                 boot, standalone/session selection, disposal
src/sim/                    world, entities, combat, AI, objectives, checkpoints
src/content/                heroes, rooms, encounters, route graph, tuning, dialogue
src/view/                   native renderer integration, rigs, VFX, camera, HUD
src/ui/                     title, selection, map, pause, settings, dev, about
src/audio/                  synth instruments, music, gibberish, event mapping
src/net/                    Hub lifecycle, input validation, snapshots/events
vendor/engine/              only the supplied handoff files actually needed
vendor/hub/                 unmodified session client and dev-only harness files
tools/build.mjs             deterministic one-HTML bundling
tools/test.mjs              single quiet test entry point
tests/                      simulation, browser, protocol, packaging scenarios
docs/                       research, content schema, controls, evidence and issue log
```

This is an organization proposal, not an obligation to build a framework. Preserve clean ownership boundaries and explicit data. A room designer should be able to author another castle by editing documented room/encounter data, previewing it in Dev Mode, and running validation, without changing combat or networking internals. A separate visual editor is unnecessary.

### Concrete native-engine choices

- Use the **full** `my-3d2dge.js` once. Its separate small agent edition has no-op asset registration and is the wrong base for this bespoke-asset plan. Adapt the adventure kit into your scenes instead of stacking a second engine or loading all modules twice.
- Read the API card and asset guide fully, then use the API index for targeted lookup. Useful native systems include `TileMap`, `Body`, `Humanoid`, `Attack`, `Bullets`, and `FlowField`. Ground coordinates are x/y, height is z, and a tile is 16 world units. Transform screen-relative movement/aim through the native view helpers.
- Extend `E.SHAPES`, `E.MATERIALS`, and `E.PATTERNS` for assets. Inspect new shapes using the asset-sheet tooling. Use native pixel/font/UI helpers and depth-sorted actor/sprite/queue paths rather than raw high-resolution canvas drawing inside the pixel world. Collision and rendered prop placement must share data.
- Drive hit timing and poses from the same `E.Attack` state; use its hit tracking to avoid repeated damage from one swing. Extend humanoid poses through the native pose registration API. Custom rigs should fit the same update/render contract.
- Extend the existing game menu, input, rebinding, settings, shell, local joining, and pause support. Verify the needed behavior before adding a parallel implementation. Native live settings can also hold the dev tuning registry. Configure session menus as live and disable native focus-loss/controller-disconnect auto-pause for session simulation (`autoPause:false`, or the documented equivalent in the revision used); neutralize affected hero input instead of halting the host.
- Keep rendering observational. Drawing cannot advance AI, consume random numbers that affect simulation, create interaction targets, or award progress. Scene entry resets scene-owned state; transitions, timers, and time scale need deliberate cleanup.
- The native headless `game.advance(seconds)` uses 1/120-second steps. Build reproducible scenarios on that stepping model. In real browser tests, wait for world state rather than assuming wall-clock seconds equal simulation progress; the engine clamps slow frames.

The simulation must support a normal client, a headless test, and a server-only Hub host. No authoritative rule may require a renderer, audio context, DOM click, local hero, or active camera. Use seeded, separately labeled streams for layouts, AI/director choices, and cosmetic randomness. A render-only random particle must not alter the next encounter.

Have a compact event vocabulary for attacks, hits, stuns, hazard shifts, down/revive, pickup/drop/pass, room transitions, ring secured, and expedition ended. Each gameplay event has a stable ID/tick and clear ownership. This keeps audio/VFX, network replication, tests, and the issue log aligned. A full generic entity-component or rollback framework is unnecessary.

## 10. AI Hub integration

Treat the pinned protocol documentation as the final authority. These are the important reviewed obligations, not a replacement for reading it.

### Boot and authority

Paste the supplied `session.js` **unmodified as the first script in the document head, immediately after the charset declaration**. Declare Session Protocol v1, 1–2 players, shared-world mode, and truthful goal/controls/duration metadata. Do not declare WebGPU as required for this native renderer.

Call `AIHub.connect({mode:'shared-world', seats:[1,2]})` and branch on the result. A null result takes the standalone path. Register session handlers promptly. Within a session, bypass title, attract, player-selection, and press-start gates; assign a valid default party, prepare the world, and call `ready()` once without a user gesture. Use the normal Hub briefing. Start simulation only after the start event **and** `AIHub.time() >= 0`; the event arrives before playable time.

The host owns world simulation: enemies, hazards, combat, ring state, room progression, revives, director events, and the ending. Clients submit input intentions. A one-human session gets the same companion behavior as standalone. Server authority and player ownership are independent: `AIHub.server` is a real host with no owned hero or camera and must still simulate the entire expedition.

### Transport and consistency

Use only `AIHub.send` and its message events for session traffic. Validate the actual sender against seat ownership; never trust a player ID supplied inside an input payload. Ignore impossible actions, invalid vectors, stale sequences, and messages for an old room/epoch. Messages do not echo to their sender, so apply authoritative local actions explicitly.

Start with approximately 10 input bundles/second per nonhost client and 10–12 compact snapshots/second from the host, reserving headroom for reliable events. Apply a player-host’s own inputs locally; do not also transmit its input bundles and accidentally add those rates together. The protocol allows at most 20 outgoing messages/second per copy, burst 40, and JSON payloads up to 16 KB. Keep unreliable packets near/below 1,200 bytes. These are protocol limits, not graphics performance targets. Batch events or encode compact state instead of broadcasting one message per monster.

Input bundles contain current axes/buttons plus sequenced one-shot edges. Deduplicate edges, acknowledge as appropriate, and neutralize stale input so a disconnected hero cannot keep walking or firing. Snapshots carry authoritative tick/sequence, room epoch, entity state, objectives, party state, and relevant tuning. Reliable room transitions/checkpoints prevent a client from applying an old-room packet to a new scene. Interpolate presentation; do not let smoothing move authoritative collision or award pickups twice. Use `AIHub.rng(label)` for session encounter streams; shared-world mode does not automatically seed `Math.random`.

### Lifecycle

Only the host calls `finish`, once, from an authoritative expedition-ending condition or time-up state. A room wipe/retry keeps the same Hub round running. Submit `finish({standings:[remainingPlayerIds], won:boolean, ...})`, with all remaining players in one cooperative standings group and `won` true only for a completed expedition victory; follow the documented schema for any additional fields. Handle time-up within its provided grace period using actual progress; never wait for an ending cinematic to submit. On nonhost departure, transfer its hero to AI and continue. Host departure voids the round under the protocol; do not invent host migration.

On session end, stop gameplay input, outbound traffic, and sound. Do not navigate away or reopen standalone title/attract beneath the Hub. Local menus keep the shared simulation running and neutralize their owner’s input. Respect Hub controller chords and render Hub names as plain text.

Do not add independent sockets/WebRTC, chat, voice chat, player-generated emotes/names, browser dialogs/popups, or navigation to an active session. The companion ping is a predefined gameplay command, not a communications feature.

### Conformance harness

Keep the supplied `harness.html`, `bridge.js`, and `round.js` together in the dev-only Hub vendor directory. Serve from a loopback-only OS-assigned port, point `game=` to the game path relative to the harness, and verify the served game’s identity. Drive it through your test wrapper; the repository’s separate checker has additional repository-layout dependencies and is not a standalone copied script.

Run ordinary two-player, bad network (`latency=150&jitter=50&loss=5&auto=1`), host departure (`scenario=host-leave`), and **two players with a server-only host** (`scenario=server`). Also test one-player session and nonhost departure. Await `document.body.dataset.complete === 'true'` and require `window.__hubCheck.pass === true`. A moving game iframe is not conformance evidence. Add gameplay assertions for real shared damage, ring pickup/pass, revive, and room progression; the protocol harness alone cannot prove those.

## 11. Build sequence and review gates

Work in integrated passes. Keep a concise requirements checklist, content manifest, and evidence ledger in the development sources. You can delegate independent asset, room, protocol, or test work with explicit module ownership; integrate and play each contribution. Shared systems and authority rules need one coherent owner.

1. **Foundation and integration proof.** Research the source; choose the title by the required process; vendor and record the real engine/Hub revisions. Prove a native-rendered room, controller navigation, headless simulation, early one-HTML bundling, and a minimal genuine shared-world session including server-only authority. This catches packaging/protocol mistakes before content multiplies them.
2. **First complete theft.** Finish one Dungeon room from title and hero selection through enemy interaction, ring carrying, revive/failure, extraction, map update, checkpoint, and replay. Implement the normal solo companion and second-player takeover here. Gate: actual input can complete the loop in solo and co-op.
3. **Four-hero system and all geometry rules.** Finish every kit, status effect, and enemy interaction; add concealed geometry, lava/flame timing, moving-wall safety, and navigation updates. Gate: all class pairings have a valid route and non-damaging pairs can complete objectives.
4. **Whole authored expedition.** Build the eight core rooms, optional caches, connected map, Ringmaster pressure, four-ring final encounter, ending, and full checkpoint behavior. Gate: an unassisted scripted run travels from new expedition to victory using every mandatory mechanic.
5. **Presentation and every input path.** Complete bespoke assets/poses, audio, fiction, TV screens, touch assistance, accessibility, attract, dev tools, and About. Develop these alongside earlier passes; this gate removes inconsistent or unfinished treatment rather than postponing all art to the end.
6. **Network and delivery audit.** Exercise all required Hub scenarios and gameplay synchronization using the finished expedition, complete final-file tests, repair failures, and produce truthful source/testing/engine/prompt feedback and catalogue metadata. Gate: every advertised feature works, every requirement has evidence, and no placeholder remains.

Each gate finishes a runnable artifact. When a problem changes architecture, update its dependent systems and tests before resuming content work. Do not discard the supplied engine just because its rendering or serialization requires understanding.

## 12. Verification that earns “complete”

Keep all automated verification behind **`node tools/test.mjs`**, with optional suite selection through that same entry point. Capture routine tool chatter; print only failures and one final pass/fail count. Store detailed evidence inside the development folder. Rerun a suite after changing code or data it covers; do not repeatedly run unchanged suites for reassurance. Track which passing results still match current code so the final evidence is current.

### Simulation and content

- Validate room/route schemas, reachable exits and rings, every authored wall-shift state, safe spawns, fallback positions, phase boundaries, and finite director budgets. Check that a required route never depends on a hero class or a cache reward.
- Assert sword timing, one hit per swing, stuns and resistance, ward timing, safe phase exit, cloak/lure targeting, dodge/hurt rules, down/revive, ring recovery, single delivery, and checkpoint restoration. Include state transitions that occur on the same tick.
- Test ten class pairings against the encounter rules, including duplicate and non-damaging parties. Test companion rescue and stuck recovery in every geometry family. Do not call “path exists” a proof that an actual hero can execute it.
- Run a deterministic whole-expedition playthrough through ordinary actions: board choices, both rooms in every castle, ring extractions, finale, victory, and replay. It must use normal damage/resources and must not set objective flags, grant rings, skip rooms, or invoke dev victory. Observe state to choose actions; exercise the same movement/ability rules as a player. Assert the resulting objective/event history independently of the driver.
- Cover a wipe/retry, Continue, corrupted/unavailable storage, optional reward idempotency, repeated fresh starts, and exit/replay cleanup. Record a seed and action history for failures.

### Browser, input, and packaging

- Test the final bundled HTML independently through `file://`: boot, menus, gameplay, checkpoint/Continue behavior where the browser permits storage, audio unlock, ending, and restart. Assert no missing development-relative requests, unresolved imports, or console/page errors. Test clean-profile first launch as well as stored settings.
- Run a real UI path with keyboard/mouse and an emulated standard-mapping pad injected before startup. Verify hot input switching, PlayStation/Xbox prompts, mouse aim transformation, hover/click focus, rebinding, disconnect recovery, and menu input consumption. Include controller-only access to dev sliders and credits.
- Use phone and tablet profiles with real multitouch event sequences for movement plus contextual/class actions. Verify resizing, portrait/landscape legibility, safe areas, touch cancellation, and a representative extraction. Report WebKit emulation accurately; it is not a real iPhone test.
- Verify ten-second attract entry using controllable time, all input exits, disposable world/save behavior, and repeating showcase coverage. Assert that a session never enters attract or waits for title input.
- Render procedural sound through an `OfflineAudioContext` or inspect analyzer output. Check non-silence, finite samples, expected durations/envelopes, sensible peaks, routing, 0.10 music defaults/reset, mute, and teardown. This supplies acoustic evidence; it cannot establish that a human enjoyed the mix.
- Use Chromium as the primary browser and exercise the native path in available WebKit/Firefox as applicable. Declare the browser evidence actually obtained. Do not install browsers already provided by the environment.

### Multiplayer

Run the conformance cases in section 10 and observe authoritative gameplay from all views. Stress dropped/duplicated inputs, stale room packets, lagged abilities, simultaneous ring/revive interactions, local pause, time-up, nonhost departure, and server-only host completion. Verify traffic limits and reliable objective transitions. Keep the test’s fake gamepads separate per client.

### Visual review

Use screenshots only for judgments a state script cannot establish: TV readability, focus visibility, silhouette separation, crystal-wall cues, moving-wall anticipation, flame lanes, camera occlusion, ring celebration, and the dragon composition. Inspect title, map, each family, pause/dev, credits, and victory at 1920×1080 plus a touch profile. Repair the visible problem, then rerun only affected checks. No FPS targets, benchmarking, or optimization pass is required by this brief; simulation, protocol, and resource-lifecycle correctness still matter.

Maintain a deduplicated issue log with severity and resolution. Count actual findings when answering testing feedback. Do not invent counts, claim a screenshot as a playthrough, or count an intentional dev cheat as a gameplay pass. Identify stand-ins for absent controllers, touch hardware, listeners, and remote humans honestly.

## 13. Packaging, provenance, and final acceptance

Bundle the engine, selected asset data, game modules, UI, and procedural audio into the one required HTML deliverable. Prefer no runtime dependency downloads for this engine path. If a CDN dependency is useful, pin it, disclose it, and test the supported launch conditions. No audio files. No development server, local module tree, build tool, or neighboring folder may be required to play the delivered file.

Keep the Hub session client recognizable and unmodified. Escape internal HTML script-closing sequences in the other inlined JavaScript; the engine header itself contains one, so naive concatenation can truncate the document. Test the emitted HTML, not just the development entry point. Generate truthful Hub metadata from the finished game. Keep harnesses, test data, screenshots, and development sources out of the playable bundle unless the runtime actually needs them.

Follow your own brief’s exact placement and naming rules for the HTML, development folder, and builder interview JSON. Report the actual plan filename used. Do not copy a model/date/folder identifier from this plan into a different builder’s artifacts.

The in-game About/Credits screen **and final chat reply** must contain Source Information, Testing Feedback, Engine Feedback, and Prompt Feedback. Fill every field required by the brief, including source/date/plan, genre/perspective, actual stack and versions, art/animation/audio, online modes, testing parameters and evidence, research, environment, and actual model/effort. Usage is exactly **“added on import”**. Use **“unknown”** where something cannot be confirmed, rather than estimating usage or the original game’s unverified details.

Answer all four testing questions, all six engine questions, and all four prompt questions in the required order. Explain important engine changes and their reasons. The builder interview must use the brief’s exact JSON object shape, include truthful catalogue information, contain every required value, and parse successfully. The catalogue player count is 1–2; distinguish couch and Hub co-op in the description/controls. Its genre field must use one allowed category even though the game’s prose can describe an action-adventure hybrid.

Finish only when all of these are true:

- A new player can start, learn, explore every labyrinth family, use any hero pairing, recover all four rings, survive the final encounter, and reach a polished ending.
- Solo companion, couch co-op, Hub co-op, server-only authority, failure/retry, Continue, and replay work under their documented conditions.
- Controller, keyboard/mouse, and assisted touch operate the same complete game; menus, prompt switching, Settings, About, Dev Mode, and ten-second attract behavior are finished.
- Native-style bespoke art and animation, code-only audio with 10% default music, ominous original writing, and TV readability are present throughout.
- Current automated evidence includes a normal whole-game playthrough, final-file launch, and passing Hub conformance plus gameplay checks. Visual evidence covers the remaining presentation judgments.
- The delivery names/locations match your own brief, all required feedback and catalogue data are present and valid, and there are no TODOs, placeholder rooms, disabled advertised controls, or stubbed features.

Make the expedition feel like a complete small game whose next castle could be built with the tools and content data already in place.
