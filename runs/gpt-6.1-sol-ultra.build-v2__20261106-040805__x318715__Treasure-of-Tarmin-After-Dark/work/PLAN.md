# Director’s build plan

For gpt-6.1-sol ultracode, with a 1.05M context window.

Build a complete, original first-person dungeon RPG about preparing for the next encounter, preserving two kinds of strength, and committing to a deeper maze. The defining pleasure is realizing that the right object, defense, or route can turn a frightening encounter into a calculated victory. Give that strategy a vivid physical presence: a lantern-lit corridor, a weapon in each hand, an ominous eye mural, and a creature whose intentions the player can read.

This plan chooses the design and implementation direction. The builder chooses the title: silently produce 50 playful riffs on the source name, select one with a real random number generator, and use the result consistently. Derive every delivery filename and development folder name from the builder’s own brief. None are prescribed here. All implementation paths below are relative to that development folder; upstream locations are linked as URLs.

Use the context window to keep the complete rules, content definitions, engine contracts, integration requirements, and test evidence coherent across the build. Finish the interconnected systems and authored campaign. Do not substitute a tiny proof of concept for the requested vertical slice, and do not add unrelated game modes just to spend capability.

## 1. Research and foundation

The source is **Advanced Dungeons & Dragons: Treasure of Tarmin (1983)**. Begin by reading the [scanned Mattel manual](https://mocagh.org/intvaction/addtot-manual.pdf), cross-checking the [official manual transcript](https://history.blueskyrangers.com/instructions/addtarmininst.html), and inspecting representative gameplay for its spatial presentation, enemies, pacing, and sounds. [Publisher history](https://history.blueskyrangers.com/mattelelectronics/games/addtarmin.html) confirms the Intellivision release and development credits. A [complete gameplay recording](https://www.youtube.com/watch?v=ZqhCM5Ntllo) is a research lead, not evidence that playback has already been reviewed. Record what you actually inspect; exact original music and timbres remain unconfirmed until checked.

Confirmed source anchors: first-person mazes; separate War and Spiritual strength and defenses; alternating attacks; six pack slots plus two hands; arrows and expendable weapons; food-funded rest; hidden doors; one-way descent; strength-altering gates; eye murals; a Minotaur guarding treasure that must actually be collected. The original supports much deeper exploration than this demo needs. Its tone is terse, ominous adventure. The manual documents counting clicks and magical traversal sounds. These anchors come from the manual; the campaign, balance, encounters, and cooperative rules below are original adaptations.

Read the actual engine and Hub contracts before implementation. Planning research found:

| Foundation | Confirmed starting point | Implication |
| --- | --- | --- |
| Engine | Handoff v0.89.1, revision `8ecc2f62353761187bdfe226f327b7ea5d2eb691` | The handoff core is 2D; its own documentation directs first-person games to the same engine’s World3D add-on. |
| 3D stack | World3D, three.js 0.182.0, Rapier 0.19.3 | Extend this foundation and its native art/animation systems. |
| Existing crawler | Tweened grid movement, first-person camera, doors, traps, automap, combat modes, bot/proof examples | Reuse infrastructure; author new rules, maps, enemies, writing, and presentation. |
| AI Hub | Session Protocol v1, client 1.4.0, revision `35a1047f2067b2af3de3943f0fe452f39105d869` | Implement its real lifecycle and authority contract, including a host with no player. |

Pin compatible revisions or deliberately update them after re-reading their contracts. Record the versions actually shipped. Useful engine references: [handoff README](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/README.md), [API card](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/API.md), [World3D implementation/manual](https://github.com/michaelcrosato/my-3d2dge/blob/main/engine/my-3d2dge-3d.js), [crawler kit](https://github.com/michaelcrosato/my-3d2dge/blob/main/src/starter3d/70-crawler.js), [native assets](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/docs/ASSETS.md), and [3D test examples](https://github.com/michaelcrosato/my-3d2dge/blob/main/tools/kit3d-test.mjs).

## 2. The complete playable slice

Commit to three compact authored dungeon floors, a staged Minotaur confrontation, and a treasure-claim ending. Support one adventurer solo and two adventurers in cooperative play. The camera is first-person in the dungeon; the automap and pack are temporary overlays on the same game screen. Avoid an additional strategic overworld, town, class system, crafting tree, or generated endless campaign.

A practiced direct route should take roughly 8–10 minutes. A first exploration can take 15–25 minutes because solo decisions have no timer and optional passages reward attention. Every supported mechanic must appear in this campaign. Do not create equipment, menus, or network capabilities that only make sense in hypothetical later content.

The player starts with a modest bow, a durable weak melee weapon, a few arrows, food, and readable War/Spirit meters. Within the first two encounters, they acquire a reusable spiritual implement and learn why both strength pools matter. The goal remains visible in one sentence: descend, defeat the guardian, claim the treasure.

The repeated loop is:

1. Read the room and enemy intent.
2. Choose a route, equipped hand, or useful item.
3. Resolve a short tactical encounter, with retreat available.
4. Collect supplies and make a six-slot carrying decision.
5. Spend food to recover, improve equipment, and commit to descent.

Solo completion includes a proper victory tableau and run summary, with Continue/New Expedition available afterward. Failure offers a floor-entry retry or a fresh expedition. A quick retry must restore a viable saved state rather than respawn the player into the exhausted state that killed them.

## 3. Rules that make the source recognizable

### Two strengths, two defenses

War and Spirit are distinct survival pools. Reaching zero in either incapacitates an adventurer. Armor reduces War damage; a ring or ward reduces Spirit damage. Pair each color with an icon, label, and shape: green/steel for War, blue/rune for Spirit. Never communicate a vital distinction through hue alone.

Normal enemies also have War and Spirit pools. Damage applies to its channel; emptying either pool defeats that enemy. The interesting choice is the vulnerable channel and whether using a strong expendable now is worth its future cost. Show both channels on inspection and a concise target panel in combat. This is a chosen demo rule; do not imply every numerical detail reproduces the original.

Use deterministic damage with small, explicit modifiers. Initial tuning can start around 36 War / 24 Spirit for the player, weak reusable attacks of 3–5 damage, ordinary enemy hits of 3–6, and 2 points of matching defense. Tune against actual scripted routes. Damage must explain itself: attack channel, defense reduction, and final loss should agree across visuals, text, and state.

Do not make spiritual offense consume the survival pool needed to remain alive. A weak reusable attack in each channel must always remain available once both are introduced. The tutorial permanently unlocks a basic War strike and Spirit spark for each adventurer; the action selector can reach these weak fallbacks even if a held implement is lost. Equipment makes them substantially stronger. Ammo and expendables create opportunities, rather than a permanent inability to finish the game.

### Deliberate combat with readable turns

Use explicit alternating rounds, with smooth animations. Exploration is not timed resource attrition. Encounter entry stops free traversal and presents enemy intentions before the player commits an action. One action may attack, guard, use an item, change equipped gear, reposition one tile, or retreat. Looking, quarter-turn orientation, and inspecting are free. Invalid actions explain why they fail and consume neither a turn nor an item.

Solo waits for the player. In co-op, the first committed intention opens a shared planning window; both ready intentions resolve immediately, otherwise an uncommitted adventurer guards when the window expires. Start with an 8-second window, allowing deliberate pack and inspection choices, and expose it in tuning/accessibility. One host-owned deadline belongs to each numbered round; duplicate or revised packets cannot restart it. Accept one committed intention per living participant, show teammate readiness, and resolve once. Clearly distinguish choosing an action from committing it. A disconnected, downed, or departing player must never block resolution.

Resolve friendly actions in a stable order, then surviving enemy actions; consume items and mark deaths exactly once. Revalidate target, range, line of sight, resources, and occupancy at resolution, with a predictable no-cost fallback if an earlier friendly action invalidates an intention. Make enemy target choice and attack channel visible before resolution and preserve the telegraph until that round resolves. Restrict each encounter to a small number of clearly framed threats. If an attack removes a threat, it does not still deliver its scheduled blow. Guard reduces the next appropriate hit; retreat gives a clearly previewed parting strike and returns the party to a validated safe tile.

The cooperative exploration phase accepts movement without waiting for a shared combat timer. Allow only one shared encounter at a time: the first authoritative trigger wins, atomically freezes both adventurers' exploration positions, and starts one numbered turn cycle. A distant teammate can approach through tactical movement from their current tile; their map marks the encounter. Reject movement into an unrelated encounter trigger until the active encounter resolves, with an explanation. Keep the party on one floor, permit allies to share corridor cells, and use a shared readiness gate for irreversible descent. Reject or resynchronize stale movement when combat starts. This prevents trigger races, narrow passages, and floor transitions from becoming multiplayer deadlocks.

### Carrying and recovery

Provide exactly six pack slots plus two visible hand slots. Use a radial or equally readable six-item selector. Right hand supplies the active attack/use object; left hand supplies an appropriate defense or alternate held object. A quick swap makes the second hand useful. Equipped armor and ring have clear dedicated indicators. Food and arrows are counters rather than six separate inventory objects. Quest keys use a keyring so progression cannot be lost by dropping them.

The item roster is small and complete:

| Family | Role in this slice |
| --- | --- |
| Durable blade | Reliable War attack, always recoverable. |
| Bow and arrows | Stronger ranged War attack with clear line of sight and ammunition cost. |
| Throwing weapon | Powerful, visibly consumed War option. |
| Reusable rune implement | Reliable Spirit attack, acquired before Spirit defense becomes necessary. |
| Scroll | Powerful, visibly consumed Spirit option. |
| Shield / armor / ring | Legible protection with an immediately useful comparison. |
| Food and restorative potion | Planned post-battle recovery and emergency recovery. |
| Permanent training book | Raises the appropriate maximum strength; provides a tangible improvement within the demo. |
| Wall-sight book | Reveals nearby secret geometry for a limited, explicit duration; works with the automap. |

Mark reusable, ammo-based, and single-use objects before use. Picking up with a full pack opens a comparison/swap choice and leaves the object safely in the world if canceled. Dropped items keep stable IDs and remain where placed. Co-op uses personal packs and strength, a shared keyring and objective state, and explicit nearby item handoff. Loot claims are authoritative transactions, never optimistic permanent duplication.

Rest is available only in safe conditions. Preview its food cost and exact restoration before confirming. A starting rule is one ration restoring up to 8 War and 5 Spirit, clamped to maxima; prevent waste when both pools are full. Maps guarantee adequate supplies on the direct route, while secrets give flexibility. Food pressure should make a decision matter without making an unlucky novice’s save unwinnable.

### Navigation, secrets, and commitment

Use grid-grounded movement with interpolation, quarter-turn buttons, a compass, and an explored automap. A gate visibly states whether it favors War, favors Spirit, or preserves both before a one-way transfer. Preview numerical effects and never reduce a pool below one through traversal. A ladder explicitly asks for commitment; it does not silently teleport the player for walking over its tile.

Eye murals signal the next area’s emphasis. Secret walls have discoverable visual or sound clues; the wall-sight book confirms them. Critical progression uses readable doors and reachable keys, while the secret passage rewards curiosity. Include a trapped container with a fair tell and a safe way to inspect/disarm it. Floor validation proves that every irreversible transfer lands in a reachable, survivable region with a path to the next objective.

## 4. Author the campaign before decorating it

Use small looping layouts with recognizable landmarks rather than long interchangeable corridors. Roughly 35–55 traversable cells per floor is a starting scale, not a quota. Put each new mechanic where the player can try it safely and soon see it tested. Write room, encounter, and item IDs before art placement.

| Floor | Mandatory experience | Optional reward and landmark | Exit proof |
| --- | --- | --- | --- |
| Upper vault | Bow/ammo, first War enemy, food/rest, pack pickup and swap, first Spirit weapon and enemy, ordinary key/door | Eye mural framing a lantern-lit junction; a clear view of the lower descent | Both attack channels understood and available; key cannot be stranded. |
| Spirit passages | Spirit defense, guarded foe best beaten through the opposite channel, basic training book, trapped container, wall-sight, one-way gate | Discoverable secret route to extra supplies or an improved book; blue-lit flooded-looking chamber | Gate warning works; both branches reach the ladder; no mandatory resource lies behind a consumed key. |
| Guardian approach | Mixed intentions, final gear decision, safe preparation point, cooperative handoff/revive opportunity, boss | Vault machinery and enormous horn-shaped shadows; optional treasure cache | Guaranteed baseline tools and sufficient recoverable supplies before the final encounter. |

Author five ordinary enemy roles and one boss, with genuinely different behavior:

- A skeletal guard teaches War damage and basic guard/retreat.
- A rune-marked scorpion teaches Spirit damage and the matching defense.
- A shield sentinel has obvious War protection and a useful Spirit weakness.
- A heavy brute announces a high-damage attack a round early, inviting guard or repositioning.
- A wraith alternates visible War/Spirit intentions and tests balanced preparation.
- The Minotaur warden combines the two channels over three short phases: physical pressure, spiritual pressure, then mixed mastery. Phase changes are unmistakable and do not quietly erase damage already earned. Give the player a preparation beat between phases.

Tune ordinary encounters to a few meaningful rounds. Strength and equipment upgrades must reduce friction noticeably by the final floor. The boss must test learned decisions, not introduce an unexplained resource or a new control. Defeating it unlocks the treasure; only interacting with the treasure completes the expedition. Record separate boss-defeated and treasure-claimed states and test both.

Use original names, silhouettes, rooms, item descriptions, and prose. Maintain the manual’s direct threatened-adventurer voice in short original lines. Keep the title’s playfulness out of lengthy parody dialogue. No lore dumps are needed to understand a door, an intention, or the goal.

## 5. Use the engine as the actual foundation

Start from the verified crawler kit’s first-person shell, not its pre-existing party or campaign. Use `My3D2dge`, `E.Game`, `E.World3D.init(game)`, and the World3D scene/camera/step/draw lifecycle. Check current signatures in the pinned source before copying them. The verified engine convention is x east, y south, z up, with 16 units per metre; the crawler’s 32-unit cells, 25-unit eye height, 0.28-second steps, and 0.2-second turns are useful starting values. Keep logical tile coordinates separate from render coordinates.

Use the native WebGPU renderer with its WebGL 2 fallback and supported material pipeline. Custom geometry must respect `E.World3D.toThree(...)` and engine axes. Build the grid’s collision/line-of-sight rules in the game model; do not let physics jitter decide a legal step or tactical hit. Replace the crawler’s animation-timed damage/turn scheduler with the authoritative rules above, and remove inherited automatic MP regeneration. Waiting, free looking, rendering speed, and menu use cannot restore strength or alter damage.

A useful module organization is:

```text
src/core/         deterministic state, commands, rounds, inventory, rules, save migration
src/content/      floor, encounter, item, enemy, text, and tuning definitions
src/view/         World3D presentation, actors, hands, effects, camera, lighting
src/ui/           screen flow, HUD, focus, prompts, accessibility, developer tools
src/audio/        procedural synthesis, sequencing, mix, gibberish voice
src/net/          authority, message schema, Hub and standalone transport adapters
vendor/engine/    pinned engine and compatible 3D dependencies
vendor/hub/       pinned unmodified session client and local harness support
tools/            build, validation, deterministic playthrough, browser/harness runner
docs/             research ledger, controls, content schema, issue counts, build notes
```

Names here are organizational suggestions. Implement a clean boundary, not a needless framework. One deterministic state model owns the run; renderers and audio consume events. Do not maintain a second combat simulation inside animations or networking. Keep versioned content definitions, stable IDs, an explicit state schema, seeded RNG, and a fixed simulation clock. Saves exclude GPU objects, live sockets, audio nodes, and animation internals.

Normal designer work must be possible without editing combat code: define maps, exits, encounters, items, dialogue, and balance in validated data. Supply a map preview and a small tile/entity editing or import/export workflow through developer tools, using native editor capabilities where verified. Validate reachability, dangling IDs, gate destinations, key/lock order, spawn collisions, encounter budgets, and required tutorial supplies. Content exports are data that can be rebuilt into the single HTML; runtime does not require neighboring JSON files.

## 6. Art, animation, and sound direction

Base the look on the engine’s native procedural pixel textures, outlined volumetric puppets, shaded stone, and bold silhouettes. Use warm lantern light against readable cool masonry, green martial markings, and blue spiritual sigils. Preserve visible floor edges and object silhouettes in the darkest scene. Rich lighting, particles, shadows, and environmental detail are welcome; an FPS or optimization project is outside scope.

Use library chests, barrels, and urns where generic props suffice. Author custom enemy bodies, eye murals, the guardian, channel-specific implements, key doors, gate frames, and treasure. A creature must read through anatomy and motion before its label appears. The scorpion needs an articulated tail, the wraith a distinctive dissolving silhouette, and the warden horns, weight, and a readable weapon. Use native shape/part data such as `E.SHAPES` and supported `E.World3D.THINGS` extensions rather than replacing the engine’s art system.

Extend `E.Humanoid`, `E.Blob`, `E.Attack`, `E.Combo`, and the move/pose/weapon registration facilities actually present in the engine. Every enemy needs idle, anticipation, strike, recovery, hurt, and defeat. Add channel-specific cast/impact effects, bow draw/release, hand swap, guard, item use, door/gate motion, descent, pickup, and treasure reveal. Hook damage to authoritative action events, never to a wall-clock animation callback that can fire twice. The first-person overlay keeps hands readable and out of wall clipping. Reduced-motion settings suppress bob, strong shakes, and large transition sweeps while preserving intentions.

All sound, music, and voice must be synthesized in code. Use the engine’s procedural audio as a base, with original compositions and effects: restrained dungeon pulses, slightly richer encounter music, distinct War/Spirit impacts, bow release, food/rest, inventory selection, keys, gate suction, and victory. Short synthesized gibberish can characterize the warden or spectral creatures; no recorded speech or audio files. Text carries any actual meaning.

Music defaults to **0.10** in a fresh profile, with independently adjustable effects and voice. Audio starts only after a genuine user gesture; silent autoplay must not prevent loading or Hub readiness. Suspend or stop the right nodes on pause, visibility changes, scene changes, and session end. Verify finite nonzero output, envelopes, clipping, mute behavior, and mix defaults with Web Audio analysis/offline rendering. Describe this evidence honestly; no human listening is available on this machine.

## 7. Controller-first screens and controls

Build one TV-readable layout for controller, keyboard/mouse, and touch. At 1920×1080, body text should generally be at least 28–32 CSS pixels at the chosen UI scale, with larger primary choices and generous safe margins. Offer a UI scale control. Keep normal play to two strength meters, equipped hands, small food/ammo indicators, compass/objective, and a contextual prompt. Combat adds the currently relevant target/intention panel. Hide a dashboard’s worth of details behind the pack or inspection view.

Initial bindings, all using shared logical actions:

| Action | Standard pad, PlayStation labels by default | Keyboard/mouse |
| --- | --- | --- |
| Step / strafe | Left stick | WASD |
| Look / turn | Right stick; shoulder snap-turn alternatives | Mouse look; Q/E quarter turns |
| Attack / confirm selected action | R2 / Cross according to context | Left click / Enter |
| Guard | L2 | Right click in combat |
| Interact | Cross | F; world click when unlocked |
| Pack / quick hand swap | Triangle / Square | Tab / X |
| Map | Touchpad or a verified spare standard-mapping button | M |
| Back / retreat | Circle, with a warning before a combat retreat | Escape for back; R for explicit retreat |
| Pause | Options | Escape outside an overlay |

Resolve context conflicts in the action map before implementation. Free looking may offset the view around a tile heading; movement/turn commits remain unambiguous. Pointer lock belongs to playing, not menus; unlocking the pointer must make world objects and UI naturally clickable. Mouse hover moves focus. Every menu is usable with a focus ring, a directional pad, keyboard navigation, and direct clicks. Repeat timing, focus restoration, scroll behavior, and confirm/cancel must work in long credits and developer panels too.

Prompts follow the last meaningful input, without flickering from tiny stick drift. Use `game.input.label(action)` or the verified native equivalent, honor rebinding, show PlayStation glyphs by default, and offer Xbox A/B/X/Y labels in Settings. Handle controller disconnect and reconnect without losing the run. The Hub reserves its Create+Options chord; a session must not open the game’s pause menu for that combination.

For touch, retain a menu button and minimal contextual UI. Use invisible left-thumb movement and right-thumb look regions, multitouch, a target-sensitive interaction/attack popup, automatic target selection, and optional auto-guard/aim assistance. Show a brief gesture tutorial that can be dismissed. Avoid the starter kit’s bank of permanent mobile buttons. Adapt the same pack/map screens to touch rather than building a separate dense mobile layout.

Required screen flow: title, new/continue, solo/co-op setup, settings, concise controls/help, gameplay, pack/map, pause, developer mode, About/Credits, defeat/retry, and victory. Use the engine’s native menu/settings infrastructure. Local settings remain accessible during network play, with a clear live-world indicator.

## 8. Standalone and Hub multiplayer

Deliver **1–2 player shared-world cooperative play**. Each participant has a full first-person view in their own browser. Share doors, encounters, keys, treasure, and floor progression; keep personal hands, packs, and strengths. Scale encounter strength once at encounter entry, not every time a participant drops. A downed player spectates and can be revived by a nearby ally using one ration and a combat action, or an ordinary interaction outside combat. Atomically consume the ration and restore each pool to at least 30% of its maximum, preserving any higher remaining value and guaranteeing both exceed zero. Preview that recovery. With no food, explain the requirement and let the survivor find supplies or continue; downed allies travel with the party and do not block descent readiness. If everyone is down, end the expedition fairly. Recover a departing guest's transferable inventory in a bag at a safe reachable tile; retain shared keys and each remaining adventurer's unlocked basic attacks. A leaving guest must not strand their key, hold the turn open, or leave an unreachable objective.

### Authority and transport

Host authority owns movement validation, turns, damage, loot claims, enemy intentions, RNG, descent, and completion. Messages carry protocol version, expedition ID, turn/tick, sender sequence, and stable entity IDs as appropriate. Derive identity from the transport, not a claimed player ID inside a packet. Reject invalid, duplicate, stale, or out-of-phase commands. Clients can animate tentative movement but cannot permanently award themselves items or damage.

Use a small transport interface for send/receive, reliable delivery, peer identity, lifecycle, and close. The same simulation supports local solo, standalone co-op, Hub player-host, and Hub server-only host. A rendering-free server must be able to run every rule. Resynchronize using a versioned snapshot with all authoritative state, and use idempotent event IDs so a resent pickup or boss-death event is harmless. Hub's `bridge.js` belongs to its outer iframe host/harness, not inside this game's peer implementation.

### Standalone remote play

The Hub library does not provide a public standalone lobby or signaling server. Implement a genuine two-browser WebRTC DataChannel connection outside Hub sessions. Use a clear Host / Join workflow with copy/paste offer and answer codes, connection progress, validation, timeout, cancel, and retry. Create the channels before the host offer; set the local description, wait for ICE gathering to complete, and export the current `localDescription` including its candidates. The guest imports it, creates/sets its answer, gathers candidates, and returns that current description; the host imports the answer. Start only after channel-open, a compatible version handshake, and initial authoritative state. Use reliable ordered messages for commands and critical events; snapshots may use an unordered `maxRetransmits: 0` second channel or the same reliable channel at this scale. Bound invite length, prefix/version/type-check it, and recover from malformed, truncated, or wrong-role input. Native clipboard access can fail on local files, so ordinary selectable text fields must always work. Data-only play requests no camera or microphone permissions. Follow the [WebRTC specification](https://www.w3.org/TR/webrtc/) and [official peer connection guidance](https://webrtc.org/getting-started/peer-connections).

Do not claim universal internet reachability: without a supplied TURN relay, some NAT/firewall combinations cannot connect. Support local-network/direct connections, a documented optional STUN configuration if useful, and a readable connection failure that returns to setup. Do not deploy an unrequested service or invent a room API. Test the real WebRTC path with two isolated browser contexts and UI-generated exchanged codes; an in-memory transport test alone does not count. Test cancel/timeout/retry cleanup and stale messages across a new expedition. A departing guest lets the host continue alone; loss of the host gives the guest a clear ended-session state. Do not claim host migration. Stop all WebRTC connections when switching modes. Solo remains available without signaling or a network connection once required rendering dependencies are loaded. Same-machine success does not confirm cross-network NAT reachability.

### AI Hub session path

Follow the actual [Hub README](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/README.md), [session client](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/session.js), [shared-world example](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/examples/arena.html), [bridge](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/bridge.js), and [round coordinator](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/round.js). Do not mix a second network stack into an active Hub session.

- Inline the pinned `session.js` unmodified as the first script immediately after charset. Declare the required session version, shared-world mode, 1–2 seats, goal, controls, and truthful typical duration metadata. Claim WebGPU required only if fallback truly cannot run; this design should support WebGL 2.
- Call `AIHub.connect({ mode, seats })`. A null result chooses the standalone boot flow. Register session lifecycle handlers before playing. Load the expedition automatically and call `ready()` without a click. Skip title, attract, standalone invitation UI, and saved progression in a Hub session.
- Wait for `start` and synchronized `AIHub.time() >= 0` before advancing gameplay. Use the supplied session players and names, inserted as text. Override native auto-pause on visibility/controller loss in network modes. Authority scheduling and round deadlines use host/session monotonic time independently of rendering and `requestAnimationFrame`; the engine's clamped frame time is not a valid session clock. Respect Hub's own host-hidden/end policy rather than trying to defeat it.
- Use `AIHub.send(...)` and incoming message events for all session networking. No game-owned WebRTC, WebSocket, signaling fetch, popups, or navigation during a Hub session.
- Support `AIHub.server === true`: the host may have no avatar or local seat. It must simulate, receive actions, and finish without starting a renderer, audio device, or controller flow.
- Respect 20 outbound messages/second per copy, 16 KB JSON/message, and the documented burst/transport rules. Start around 8 Hz compact host broadcasts and up to 8 Hz client input batches, coalescing unchanged input and leaving room for reliable events. Keep unreliable packets near/below 1,200 bytes; split larger resync state reliably with a validated schema. Measure actual traffic with two active players. These are protocol correctness limits, not graphics optimization targets.
- The coordinator caps a round at `min(15 minutes, declared typical minutes × 1.5)` in the inspected revision. Declare a truthful 10-minute typical expedition and make the direct route complete comfortably before the cap. Put all core mechanics on that route. Show a session countdown; optional exploration is a risk the team can judge. On time-up, submit an honest incomplete-expedition result within the supplied grace period rather than manufacturing victory.
- Only the authority calls `finish`, once. Report a team tie with the current participant IDs, team success in `won`, and useful depth/treasure statistics. On `end`, stop simulation, input application, outgoing traffic, and audio, including intervals or delayed callbacks.
- Handle guest departure and host loss according to the protocol. Do not promise host migration where the protocol voids the round. Do not expose chat, voice, emotes, custom names, local restart-to-title controls, or developer mutations in scored sessions. Settings overlays use live/non-pausing native menu behavior.

Network play must not load local solo checkpoints or persist a network session as a solo continuation. Standalone hosting may offer a mutually agreed pause and developer session, visibly unscored; the normal co-op path uses stock balance.

## 9. Persistence, developer tools, and attract mode

Save versioned solo state at viable floor entry and safe milestones: floor entities, doors, loot IDs, inventory, strengths, keyring, explored map, RNG, and progression. Keep settings and balance overrides separate. Handle absent, blocked, or corrupt local storage gracefully. On an opaque local-file origin where persistence is unreliable, keep the run playable and offer explicit save export/import; never advertise a successful durable save without confirming the write/read. New Expedition starts clean without erasing user preferences.

Developer mode is reached from Pause. Provide floor/encounter jump, checkpoint reload, invulnerability, supplies/item spawning, map reveal, collision/secret visualization, enemy intent inspection, seed/state display, a replay/step control, and the content preview/import/export workflow. Every tool performs its real action and updates the same model used in ordinary play.

Expose the consequential tuning variables as live sliders: player outgoing damage, enemy outgoing damage, starting/max War and Spirit, ration recovery, cooperative planning window, and presentation/animation tempo. Label units/ranges and show defaults. Apply changes safely at a defined boundary; keep all strengths legal and cancel/rebuild pending plans when necessary. Reset to Defaults must restore the actual canonical configuration. Mark modified runs and exclude them from scored Hub results. A read-only diagnostics panel can remain available online.

After exactly 10 seconds of inactivity on standalone title/menu screens, enter an isolated AI-played or scripted attract expedition. Demonstrate traversal, pack choice, both damage channels, a gate/secret, and a boss glimpse across a varied loop. Cheating is allowed here. Any meaningful input exits immediately to the title and is consumed so it cannot also start or delete a run. Attract mode never changes saves, tuning, online state, achievements, or the next real expedition. Keep its audio within user settings. It never starts over an active run or inside Hub sessions.

## 10. Build and package early

Make a real single-HTML packaging proof before building the full campaign. The engine’s ready-made 3D template uses root-relative vendor imports and expects a server; shipping it unchanged would fail the delivery requirement. Bundle/inline engine, add-on, game code, authored assets/data, CSS, and procedural audio. Escape embedded closing script tags and test the result as HTML, not just as JavaScript.

Prefer bundling the complete three.js module graph and the pinned [Rapier SIMD compat JavaScript](https://github.com/michaelcrosato/my-3d2dge/blob/main/vendor/rapier3d-simd-compat-0.19.3/rapier.js). That verified compat build embeds its WASM in JavaScript; its normal exported initializer decodes the bytes, so it needs no separate WASM fetch or special MIME server. Preserve the engine's normal initialization and dependency licenses. Exact-version CORS-enabled HTTPS dependencies are also permitted by the brief, if useful. Verify the chosen approach through `file://` immediately. Do not leave runtime references to source modules, neighboring assets, absolute local paths, or root-relative vendor URLs. If CDN access is required, document it and show a helpful loading failure/retry instead of a blank canvas. Do not describe CDN-dependent operation as fully offline.

Create one reproducible build command and one verification command, for example `npm run build` and `npm run verify`. Pin tool dependencies, follow the installed npm version’s script-approval behavior, and install only what is missing. Write generated files and caches inside this development folder or an allowed project cache, never shared temporary folders. Source files may remain modular; the delivered HTML must open independently of them.

The build copies the final HTML and the builder’s required machine-readable report to the delivery locations and exact names supplied by the builder’s own brief. Reopen that exact HTML after copying, with the source folder unavailable to the browser. Packaging success includes the title, menus, art, native animation, audio initialization, save handling, solo completion, standalone co-op, and Hub metadata surviving the bundle.

## 11. Verification that establishes playability

Design meaningful probes while implementing the systems, then expose all checks behind one command that prints only failures and a one-line count. Use a test-only interface that can inspect state, advance deterministic time, and inject logical input. It must drive the production command handlers and rules. Default gameplay and attract mode must not enable test cheats.

Do not require a live GPU or browser for pure rule tests. Do use the real final HTML for browser, input, audio, packaging, and Hub lifecycle checks. The engine’s `game.advance(...)`, input injection, debug snapshots, and `world.hash()` are useful verified foundations; adapt the upstream checker so irrelevant view-switching assumptions do not create false failures.

| Check group | Required evidence |
| --- | --- |
| Rules | Both survival pools; correct defense; all item costs and reusable behavior; turn ordering; guard/retreat; full-pack cancellation; no double loot; no negative counters; both downed/loss and recovery. |
| Content | All referenced IDs exist; key/door and one-way routes are solvable; no spawn inside geometry; every mechanic is reachable; floor entry and boss preparation have viable supplies. |
| Full solo run | A deterministic, non-cheating scripted playthrough through normal commands from New Expedition to treasure claim, exercising both channels, equipment change, rest, gates, secret discovery, and boss phases. Assert milestone state and ending, not just lack of exceptions. |
| Save/load | Reload at a safe milestone and floor entry; compare authoritative state and subsequent replay; corrupt/blocked storage and export/import paths remain usable. |
| Input and focus | Standard-mapping gamepad stub, reconnect, PS/Xbox prompts, keyboard/mouse look and clicks, rebinding, menu focus, pause, phone/tablet gestures, contextual popups, multitouch. |
| Attract/dev | Idle boundary at 10 seconds, immediate consumed-input exit, looping content and save isolation; live sliders, reset, tools, and disabled scored-session mutations. |
| Audio | Fresh-profile music gain 0.10; gesture unlock; finite nonzero synthesized output; mute/mix behavior; no activity after session end. |
| Rendering/package | Final HTML under `file://`; WebGPU state/boot and WebGL 2 fallback; missing dependency failure; no local source requests or console exceptions. |
| Standalone co-op | Two real WebRTC peers exchange codes, join, move, fight, claim simultaneous loot safely, hand off items, revive from either depleted pool, descend, finish, disconnect, and clean up. Cover no-food and post-combat downs, guest inventory recovery, invalid invites, timeouts, retries, stale messages, and simultaneous encounter triggers. |
| Hub | Automatic readiness/start, two-player state agreement, server-only host, time-up, leaves, result once, traffic limits, clean end, and official harness pass. Open settings, unplug a controller, and exercise visibility loss without improperly freezing another client's world or bypassing Hub's lifecycle. |

For the [official Hub harness](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/harness.html), vendor its required sibling support files locally and serve only the intended test tree. The [official checker](https://github.com/michaelcrosato/ai-hub/blob/main/scripts/hub-check.mjs) filters its default seat counts to the game's advertised capacity: a 1–2 game must use two-player stress, not a forced four-player run. Run `players=2&auto=1`, then add `latency=150&jitter=50&loss=5`; repeat with `scenario=host-leave` and `scenario=server` (two players plus a server-only host). Also test a one-player Hub session and explicitly trigger nonhost departure: the harness's automatic nonhost-removal probe otherwise starts at three players. Wait for `document.body.dataset.complete === "true"` and assert `window.__hubCheck.pass === true`, saving failed check details. Add game-specific assertions: agreeing boss pools and phase, one winner of a contested pickup, matching door states, no stuck downed turn, and no mutations after end. Exercise time-up during an ordinary floor, boss phase, and downed state, and prove the direct-route scripted victory fits the real session clock. Protocol compliance alone is insufficient.

Use Chromium for the dependable WebGL 2 visual route; test WebGPU state independently because a headless capture can be blank even when state advances. Firefox here has no WebGL, so provide/test a clear unsupported-renderer message rather than claiming gameplay compatibility. Test WebKit’s available WebGL 2 path and emulated mobile layouts, while recording the lack of real iOS hardware.

Screenshots address questions state tests cannot answer: 10-foot legibility, focus visibility, wall/hand clipping, monster silhouettes, animation poses, lighting, touch clutter, map/pack readability, and the victory composition. Inspect representative title, ordinary encounter, Spirit chamber, boss, pause/dev, and phone frames. Keep only useful evidence. Do not rerun unchanged tests just to accumulate passes; rerun after changing the code they cover, then run final integration checks on the built artifact when it changes.

Keep one or two browser processes open at most and close them after each scenario. Use installed browser versions; do not reinstall browsers or system dependencies. If using Python Playwright, select its documented environment or `uv run --with playwright==1.63.0` rather than the package-free system interpreter. For servers, bind only 127.0.0.1 on an OS-assigned port, verify the served document is this game, and stop only PIDs created by this build. No port hunting, process-pattern killing, or access to neighboring agents’ work.

Track actual issues caught, critical/game-breaking counts, fixes, and the most/least helpful tests during development. Do not turn a test count into a fabricated defect count. Keep limitations and unconfirmed real-device behavior separate from passing emulation evidence.

## 12. Execution order and acceptance gates

Complete each gate before expanding the next layer. These are dependency gates within one build, not permission requests or separate demos to leave unfinished.

1. **Contracts and packaging.** Read and pin the engine/Hub; choose the title by the required random process; prove World3D, native animation, procedural audio initialization, single HTML under local-file access, Hub auto-boot, and rendering-free authority. Resolve dependency/WASM loading now. Save source findings and actual version notes.
2. **One complete room.** Implement the shared state/action model, dual strengths, one enemy of each channel, a real six-slot pack, rest, save/retry, controller/mouse/touch actions, and a fair retreat. Add focused rule checks and real browser input verification. Establish two-client authority and the actual standalone connection before designing systems around assumptions.
3. **Complete authored expedition.** Build all three floors, the complete item/enemy roster, secrets/gates, progression, boss phases, and treasure claim from validated data. Finish the no-cheat scripted victory and loss/retry paths. Tune the direct route for the Hub cap without removing any mechanic.
4. **Finish presentation and tools.** Replace generic starter content, complete native species/hand animations, lighting, effects, procedural score/SFX/gibberish, controller focus, accessibility, touch assistance, attract mode, developer sliders, and content authoring workflow. All screens perform their advertised actions.
5. **Network and release proof.** Finish the real standalone peer flow and official Hub scenarios, including authority with no player. Inspect selected visual evidence, verify defaults in a clean profile, rebuild, test the exact final artifact, and complete the reports/credits from actual evidence.

If parallel builder agents are available, divide by stable contracts: simulation/content validation; native visuals/audio; UI/input; transport/harness. Keep one integration owner and a shared action/state schema. Use isolated worktrees when appropriate; avoid concurrent edits to the same bootstrap or output artifact. Integrate frequently enough to catch authority, timing, or packaging disagreements before polish.

Do not spend effort on FPS targets, benchmark-driven optimization, unrelated engine suites, matchmaking infrastructure, or extra procedural modes. Spend it on authored encounters, meaningful carrying decisions, animation, readable input, correct shared state, and finishing every requested feature.

## 13. Credits, reports, and final delivery

The builder’s final chat reply and in-game About/Credits must both contain Source Information, Testing Feedback, Engine Feedback, and Prompt Feedback. Preserve the exact fields, question ordering, schema, environment/model/date requirements, and delivery names from the builder’s brief. Include the actual supplied plan basename. Set usage to exactly `added on import`; write `unknown` for unconfirmed facts, never estimated cost or invented research/testing.

Keep the required source-information, feedback answers, and catalogue metadata in one canonical data object so the in-game screen, machine-readable report, and final reply agree. Fill catalogue title, tagline, description, player count, controls, appropriate RPG genre, source/franchise attribution, and 3–6 truthful lowercase tags. Describe the actual standalone transport and Hub mode. State CDN and WebRTC reachability limitations if applicable. Check the report parses as JSON and matches the exact required object/array shapes.

Before declaring done, establish all of the following:

- The required single HTML opens from its final delivery location with no neighboring source files.
- A fresh player can understand and finish the complete three-floor expedition using controller, keyboard/mouse, or assisted touch.
- War/Spirit strategy, pack pressure, rest, progression, gates/secrets, five enemy roles, the staged boss, defeat/retry, and deliberate treasure claim all work.
- Native engine art and animation are visibly extended with original content; music, effects, and voice are code-generated and music defaults to 10%.
- The 10-second attract loop, reachable developer mode, live tuning/reset, content workflow, save behavior, accessibility, and every menu are functional.
- Standalone remote co-op is real within its stated connectivity limits, and Hub passes lifecycle, server-only, authority, traffic, end-state, and harness checks.
- One verification command reports meaningful failures and a one-line count; the full normal-rules victory has passed against the delivered build.
- Credits, feedback, research/version evidence, machine-readable reporting, and final chat disclosure are complete and consistent.
- There are no TODOs, placeholder assets/screens, dead buttons, fake network modes, stubbed features, or unsupported claims of testing.

The final result should feel like a finished expedition whose dungeon can be extended through content tools, with the source’s peculiar strategic identity intact.
