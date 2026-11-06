# Director’s plan

## Mandate and creative ownership

Build an original, finished arcade siege shooter inspired by **Yars’ Revenge (1982)**. The distinguishing experience is being a small, living insect warrior dismantling a colossal defense, sheltering inside dangerous static, and calling a weapon powerful enough to kill its operator. Deliver a complete vertical slice with a beginning, an escalating middle, a decisive ending, and a compelling reason to replay.

This plan is for **gpt-6.1-sol ultracode with a 1.05M context window**. Use that capacity to understand the engine and session contracts together, maintain consistency across gameplay, art, controls, networking, and tests, and finish the entire experience. Build substantial authored content and custom animation. Do not reduce the assignment to a starter-kit reskin or substitute a broad feature list for developed interactions. Organize work around playable acceptance gates; context capacity is not a reason to build a large speculative framework.

**The builder chooses the title.** Follow the brief’s silent brainstorm of 50 distinct playful riffs, select with a real random-number generator, and use the resulting title consistently. No title or candidate is supplied here. Follow your own brief for the development-folder name, final artifact names and locations, timestamps, and run-specific metadata. All local paths below are relative to the **development folder**; they are proposed internal organization, not replacements for the brief’s delivery paths.

The brief remains authoritative. This document supplies the game direction and an implementation route. Numerical tuning below is an initial design hypothesis, to be adjusted through play. The performance budget remains unlimited: do not introduce FPS targets, optimization milestones, or arbitrary caps on visual richness. Readability, correct simulation, and the network protocol’s actual limits still matter.

## 1. Research and the source contract

Before implementation, read and observe the original 1982 game. Save a concise, linked research ledger in `docs/research.md`, separating verified source behavior from this adaptation’s inventions. Study both shield configurations, movement, a normal cannon kill, an airborne Swirl kill, failure, and progression. Consult the pack-in comic for tone; where gameplay footage or a detail cannot be verified, record that limitation rather than claiming fidelity.

The source’s essential relationships are these: shoot or eat shield cells to open a path; use the remote Zorlon Cannon to destroy the Qotile; align the cannon through the player’s vertical position and escape its shot. The glittering Neutral Zone blocks Destroyer Missile damage and prevents firing, but does not protect against Swirls. Movement wraps vertically. These interdependent rules make a siege duel. [Atari’s original-game page and reproduced instructions](https://atari.com/pages/yarsrevenge)

Do not confuse variants. Five TRONS and summoning the cannon from the left edge are **Ultimate Yars** rules. They are not the universal original charging procedure. Alternating two-player play and reflected cannon shots also have specific variation contexts. Our visible energy meter and simultaneous co-op are deliberate new designs. [Original instruction manual](https://atariage.com/2600/manuals_old/yars_revenge.html)

Preserve insect embodiment, abstract cosmic hostility, strong warning cues, and the release of an enormous fortress explosion. Use sparse, earnest pulp science fiction with a little strange playfulness. [Atari’s retrospective](https://atari.com/blogs/newsroom/the-addictive-and-unique-gameplay-of-yars-revenge) The electrical hum and overwhelming detonation have a strong basis in the creator’s account; synthesize a new sound identity around that inspiration. [Howard Scott Warshaw interview](https://www.digitpress.com/library/interviews/interview_howard_scott_warshaw.html) For narrative reference, consult the [original pack-in comic](https://www.atarimania.com/documents/atari_comic_yars_revenge.pdf); create new characters, wording, designs, and scenario.

## 2. The game we are making

**Genre:** arcade arena siege shooter, with multidirectional shooting and positional superweapon play. **Perspective:** fixed overhead combat on an x/y plane, with the engine’s dimensional pixel-art bodies, relief, lighting, and decorative height. The image should have depth without obscuring the rules. There is no scrolling camera, free-look, or requirement for a perspective 3D renderer.

The player is a winged scavenger of an exiled swarm. A fortress intelligence has turned the swarm’s destroyed home into a band of broadcast static. The survivors can hide within that remnant and feed stolen shield energy to distant siege guns. Their attack becomes a retaliation against the intelligence’s three defense stations. Give those places and characters original names during production.

The core loop is **read the threat → approach → shoot or bite a breach → charge the siege gun → align a lane → fire and evade → exploit or survive the fortress’s transformation**. A safe shot and a risky bite should both be useful. The decisive shot should feel earned through position and timing, with a clear consequence for firing badly.

Ship one authored three-sector campaign, playable solo or in simultaneous two-player co-op, plus immediate campaign replay and sector practice after discovery. Aim for roughly **8–12 minutes for a new player’s successful run**, without waiting gates or filler. Skilled play can finish sooner. All mechanics, fortress phases, control modes, and multiplayer systems must appear in this slice. Additional content should later be creatable through the supplied content data and dev tools.

### Spatial composition

Keep the left launch rail, middle static refuge, and right fortress legible in one screen. Give the scout enough room to move through and around the fortress shell. Let the top and bottom edges wrap, with paired edge cues and a ghosted exit/entry silhouette; clamp horizontal travel. Implement wrapped distances and collision consistently, including targeting and warning trajectories. A teleported wrap must not create a collision sweep across the entire arena.

The refuge’s border must be obvious under every palette and effect. Background ruins, distant machinery, swarm silhouettes, and depth layers enrich the scene without masquerading as hitboxes. Reserve the brightest colors and strongest silhouettes for players, dangerous projectiles, the active cannon lane, and the exposed core.

### Combat rules to implement

| System | Required behavior and design purpose |
| --- | --- |
| Scout flight | Immediate, precise movement with modest acceleration and strong braking; normalize diagonals. Separate movement from aim. Keep the collision body smaller than the wing silhouette, and show that body clearly in dev mode. |
| Primary shot | A held, aimed stream removes shield cells. Ordinary shots cannot damage the fortress core or destroy its Swirl form. Use clear impact feedback when a shot is ineffective. There is no ammunition chore. |
| Bite | Sustained contact automatically eats a nearby shield cell on a short, explicit cadence. Mandibles and a contact spark show the interaction. Contact with an ordinary shield is safe; the risk comes from remaining near hostile weapons. Biting awards more score than shooting and feeds the cannon. |
| Shield | Author cells as persistent, individually destructible data. Clearing a useful corridor is enough; total demolition is unnecessary. Moving shields transform their remaining cells rather than resetting damage every frame. Every legal corridor must be wide enough for the actual cannon projectile. |
| Energy | Each scout has a visible cannon charge, initially requiring about five bites. This is an adaptation, not a claimed original rule. Brushing the exposed, non-Swirl core grants a refill on a cooldown, so shooting away every cell can never make victory impossible. Every final-phase flight returns to a visibly distinct, contact-safe dock/refill window before relaunching, including after a miss or player death. Charge is capped at one ready shot and resets on death. |
| Siege cannon | Each scout links to a gun on the left rail. When ready, a fine guide follows that scout’s y position. Pressing the cannon action locks the lane, consumes one charge, shows a brief warning, and launches a physical projectile from the rail. The gun does not become a rocket fired from the scout. Both scouts can operate their own gun in co-op. |
| Cannon danger | The shot can hurt its operator and a teammate. Ordinary scout fire has no friendly damage. Distinguish each player’s lane by shape and identity color. A blocked shot damages the blocking cell and is spent; later reflective defenses can return it once, with an explicit return warning. No indefinite bouncing. |
| Pursuer | A readable guided threat maintains pressure. Entering static suppresses its damage to that scout; it does not delete the threat. It should circle or cross according to visible rules, so stepping out carelessly is dangerous. |
| Static refuge | Suppresses both scout weapon commands while occupied, including calling the cannon. Preserve stored charge. Existing projectiles continue traveling. Static blocks pursuer damage but never Swirl or siege-shot damage. Feedback says why an attempted shot is unavailable. |
| Swirl transformation | The fortress itself winds up, changes silhouette, and launches. Use a readable audiovisual telegraph, a committed path, and a return phase. It can cross the refuge and can be damaged by the cannon in flight. Do not add an unrelated pinwheel enemy and leave the fortress firing as if nothing happened. |
| Damage and lives | Use an arcade one-hit death with a shared reserve: start with three replacement scouts in solo and four in co-op, in addition to those initially alive. Respawn after a short readable delay at a safe launch position with brief visible protection. Spend each reserve once. With no reserve, a dead player waits; failure occurs when no scouts remain alive or pending a paid respawn. |
| Recovery | A sector clear restores eliminated partners and grants one reserve up to a small displayed cap. An airborne Swirl hit grants a clearly announced reserve bonus, subject to that cap. Explain this skill reward in the first relevant encounter. |
| Score | Reward breaches, bites, core hits, and especially airborne cannon interception. Offer a readable, capped chain for active risk-taking. Idle hiding cannot farm points. Award the ending bonus once. Separate solo/co-op and difficulty records; cheats and checkpoint retries do not produce normal records. |

Start with a short bite interval around 0.15 seconds, a cannon warning around 0.25 seconds, and a Swirl telegraph around one second. Tune speeds and geometry together so a warned player can escape a newly fired cannon lane without a dedicated dodge button. Keep the action vocabulary small: move, aim/fire, cannon, pause. Favor generous collision clarity over hidden exceptions.

All deaths, hits, cell removals, phase changes, rewards, and finishes must be idempotent. Test simultaneous co-op hits explicitly. A missed or intercepted cannon shot must always leave another obtainable charge and a possible future victory. No phase may wait forever for a destroyed object, a departed player, or a tutorial action the player already completed.

## 3. Three authored sectors and a real ending

| Sector | Authored progression | What it proves |
| --- | --- | --- |
| 1 — the outer shell | Start with a broad, stationary arch, one slow pursuer, and a permanent refuge. Give brief contextual lessons during real play: move and shoot, bite to charge, leave static to fire, align/fire/evade. Schedule a clearly telegraphed Swirl during the first breach attempt, without blocking an unusually fast successful kill. One decisive core strike ends the sector. | The full basic loop, the refuge’s limitation, and a first spectacular cannon kill. Tutorials read semantic events and accept equivalent actions, including an early successful interception. |
| 2 — the moving defense | Two offset shield plates shift vertically, preserving damage. Two core strikes are required, with an authored transition between layouts. Introduce visibly different reflective cells and show a blocked cannon’s return path. Add a pursuer variation and a Swirl path that threatens a familiar hiding route. | Breach timing, return-shot danger, coordinated co-op lanes, and adaptation to moving geometry. Teach reflective material before putting it in a lethal combination. |
| 3 — the fortress intelligence | A three-strike boss combines an outer cellular shell, an exposed moving heart, and a final roaming Swirl phase. Each strike visibly dismantles a layer and changes its attack composition. The refuge periodically fractures only after a generous warning, then returns. The final shot must intercept the airborne heart; after each unsuccessful pass it docks in a contact-safe refill posture, then telegraphs another flight. The docked heart cannot take the final damage. | Every established interaction combined into a climax, including a renewable refill route after a missed shot or death when no shield cells remain. Increase pressure through combinations and geometry rather than an inflated health bar. |

Do not require a player to fail to discover a mechanic. The first reflective shot, refuge outage, and dangerous Swirl must be announced through staging and visible cues. Let competent players act immediately instead of waiting through a modal lesson. Co-op tutorials advance on either player’s correct action and explain per-player charge.

Each sector needs an individual silhouette, palette, ambient motion, music treatment, entrance, fortress collapse, and concise narrative beat. Reuse the same combat grammar. A short transition shows the swarm moving deeper into the broadcast, with a button to advance immediately. The final destruction dissolves the fortress signal into a visible surviving swarm, followed by a clear victory screen with score breakdown, records, replay, sector practice, and credits.

Provide Normal and an explicit Assist preset. Assist lengthens telegraphs, eases pursuit, and increases reserves while retaining every mechanic. Make its record category clear. Sector practice offers unlocked sectors and never pretends to be a completed campaign. On defeat, offer retry sector as practice or restart the campaign; neither action should strand a controller player in a browser dialog.

## 4. Engine foundation and project structure

Use the actual [my-3D2dge handoff](https://github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff). At planning time it reports **v0.89.1**, at revision `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Recheck and record the revision actually imported. Keep a reproducible local copy under `vendor/engine/` and record upstream changes or patches. Do not replace the engine with an unrelated renderer.

Read `vendor/engine/README.md` and the whole `vendor/engine/API.md`; search `vendor/engine/API-INDEX.md` for exact signatures. Start from the [SHOOTER kit](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/kits/shooter.js), using its **overhead** view. Its x/y plane and decorative z height are appropriate. Do not mix in side-view x/z collision assumptions. Remove the kit’s unrelated game catalogue, actors, scenes, and branding.

The handoff’s native aesthetic is dimensional pixel art made with mathematical bodies, material ramps, pixel primitives, lights, particles, and procedural motion. Real perspective 3D is a separate add-on and is unnecessary for this direction. The full supplied engine is dependency-free and can be embedded with the game. Read `vendor/engine/docs/ASSETS.md` before drawing generic props; use the library for background objects and create the source-defining bodies yourself.

Suggested internal structure:

```text
vendor/engine/          pinned handoff, documentation, provenance
vendor/hub/             pristine session client and local test-harness dependencies
src/main.js             boot, standalone/session selection, scene ownership
src/sim/                world state, rules, collisions, fixed-step updates
src/content/            sectors, shield masks, boss patterns, balance defaults
src/presentation/       custom rigs, effects, HUD, scenes, synthesized audio
src/input/              common action frames and device adapters
src/online/             AI Hub lifecycle, validation, snapshot protocol
src/dev/                live tuning, drills, inspection, content editing
tools/                  packaging and the single test runner
tests/                  rule, replay, browser, audio, and session checks
docs/                   research, controls, authoring, decisions, test evidence
```

Use plain JavaScript modules or TypeScript if it improves implementation, then bundle to a deterministic browser load sequence. Select actual build tooling after checking what is installed; the handoff is not itself a bundler. A small Node packaging script is sufficient for a dependency-free implementation.

### State and system boundaries

Keep the authoritative simulation independent of DOM, canvas, sound, menu focus, and wall-clock animation. Store stable IDs, tick, seed streams, phase, shield occupancy, core state, cannon state, players, reserves, hazards, and score in serializable data. Use explicit fortress states such as shielded, windup, flight, return, phase-break, and defeated, with specified entry/exit behavior. Emit presentation events from confirmed simulation changes.

Use the engine’s fixed **1/120-second** advance for simulation and headless proof. Cache seeded RNG streams; use separate streams for combat, content, attract behavior, and visual noise. Cosmetic drawing must never consume combat randomness or change gameplay. Build collision on the gameplay plane; decorative height, wings, glow, and shake cannot move a hitbox.

Useful existing primitives include `E.Bullets`, `E.pattern`, `E.Path`, native particles/lights, tweens, script sequences, and wrapping helpers. Verify each signature before use. Implement shield topology, the refuge’s protection matrix, remote cannon behavior, fortress state machines, and simultaneous co-op as game systems. Patch an engine defect where appropriate and record why; do not assume the engine has a ready-made insect or siege system.

Use one simulation in solo, local co-op, network-host, bot, and test modes. Local input adapters and network actions produce the same action-frame shape. Keep dev commands distinct from normal actions. Expose a semantic `game.debug.snapshot()` and fail checks on `game.errors`. Rendering, snapshots, and instrumentation must be read-only.

### Menus, pause, and lifecycle

Extend the engine’s standard pause, settings, controls/rebinding, fullscreen, input labels, safe-area, and focus-loss behavior. `E.Menu` and `E.Shell` provide appropriate focus, hover, large screens, and sliders; use those conventions throughout. Add How to Play, Dev, and About/Credits. Avoid implementing a competing settings stack.

Standalone flow is boot → title → campaign/practice → sector transitions → victory/defeat. The title also opens local co-op, Settings, How to Play, and About. Pause is available throughout normal play and every submenu has a reliable back action. Restore time scale, held-input state, timers, and audio on retries and scene changes. The engine clears many scene timers and has a default transition fade; write tests that respect those contracts.

The stock `E.Arcade.start(2)` means **alternating players**. Do not use it as simultaneous co-op. Use the engine’s join/input support or explicit player input sources feeding the common world. Controller disconnection pauses standalone play and offers reconnection or continuing with an available device. A missing device must never leave a permanent held action.

## 5. Art, animation, sound, and narrative

### Custom visual production

Build an articulated insect with a segmented abdomen, wing pairs, mandibles, antennae, and a readable glowing thorax. Distinguish the second scout through contour and markings as well as color. Create custom fortress bodies, destructible cellular shells, the siege-gun rail, pursuers, and the transforming heart. A humanoid with wings, a flat triangle, or generic engine props cannot carry these roles.

Work through the native body update/draw pattern, pixel primitives, depth ordering, material tones, and procedural posing. Native techniques such as `E.ik3` and `E.charView` can help where appropriate; verify their contracts. Animate flight banking, wing beats, biting, charge readiness, firing recoil, hit dissolution, respawn, core warning, Swirl transformation, shield motion, phase breaks, and victory. Drive transitions from actual simulation state. Isolate cosmetic motion from collision.

Give each action a complete audiovisual response: anticipation, contact, aftermath. Bite pulls fragments inward; ordinary shots chip outward; a completed charge illuminates the thorax and launch rail; a cannon opens a line through the picture; a phase break visibly removes fortress anatomy. Layer animated static, emissive tracks, volumetric pixel shading, drifting debris, silhouettes, localized light, and large explosions. Build rich scenes while maintaining the danger hierarchy.

Use engine primitives and authored mathematical assets for the core art. Optional generated bitmaps can support the background only if they fit the style and can be embedded; they are not a replacement for the required animated bodies. Keep asset provenance and any licenses with the development files. The final game must have no missing images or external asset-folder dependency.

### Code-only audio

Write all music, effects, and voice synthesis in code. Do not load recorded sound, music, or speech files. Use Web Audio oscillators, generated noise, envelopes, filters, and procedural sequencing, routed through `game.audio.bus('music')`, `bus('sfx')`, and `bus('voice')` so the engine’s settings apply.

Set the **first-run music volume to 0.10**; the engine’s current default is higher. Respect a returning user’s saved selection. Master, music, effects, and voice settings must actually change the corresponding output. Unlock audio after a real user gesture, and recover from suspended contexts without a silent broken state. Attract mode must also work when autoplay restrictions keep it silent.

Compose a restrained electrical drone and insect pulse, then develop an original motif across the three sectors. Let threat, charge, and core exposure alter layers rather than simply making everything louder. Give the pursuer, Swirl, and reflected cannon separate warning signatures that remain readable together. Use brief synthesized formant/syllable chatter for the swarm and fortress, with original readable captions. Voices are Animalese/Simlish-style gibberish, never intelligible recorded speech or browser text-to-speech.

Verify generated sound with offline rendering or analysis: finite output, non-silence, controlled peaks, envelope endings, bus volume, mute, pause, and cleanup. Sound must communicate the same facts as the image without being required for survival. Reduced-flash and reduced-shake settings preserve timing and warnings.

### Writing

Keep the writing short, eerie, concrete, and sincere. Let a few original lines establish a wounded swarm and an inhuman intelligence; carry most story through the transformation of the arena. Use large captions during quiet openings and transitions. Tutorial language names the action and consequence. Do not cover live hazards with lore paragraphs or explain engine/network internals to players.

## 6. One game across controller, mouse, and touch

Design for a DualSense on a television first. Use a single spatial layout and menu hierarchy on every device. At 1920×1080, important menu text should read comfortably from ten feet, with large focus treatment, safe margins, and restrained HUD density. Use a separate readable UI scale if the world’s pixel resolution demands it. Test 16:9, wider screens, 4:3, and portrait without changing the underlying game rules or clipping essential information.

| Action | Standard controller default | Keyboard and mouse default | Touch behavior |
| --- | --- | --- | --- |
| Move | Left stick | WASD; arrows as an alternative | Floating invisible left-thumb movement region |
| Aim | Right stick; retain last meaningful direction | Pointer in the world | Floating invisible right-thumb aim region |
| Primary fire | R2; optional right-stick auto-fire setting | Hold left mouse button | Aim-region deflection auto-fires |
| Siege cannon | L2, shown only as available when charged | Right mouse button; Space as an alternative | One large contextual cannon action when ready |
| Pause/back | Options / Circle | Escape; clickable controls | Small persistent menu button; normal touch menu navigation |
| Confirm | Cross | Enter or click | Tap the focused item |

Eating is contact-driven on every device. A keyboard-only accessibility binding can aim along movement and fire with a key; it uses the same mechanics and screens. Expose aim assist and deadzone settings. Modest controller/touch targeting assistance may favor nearby valid shield cells, while the cannon always depends on positioning.

Use `game.input.label(action)` or a single equivalent last-device label layer for every prompt. Default to PlayStation glyphs and include Xbox A/B/X/Y glyphs in Settings. A meaningful mouse move, click, key, stick movement beyond deadzone, or pad press changes the prompt family. Stick drift, bot actions, and browser-generated events do not. Mouse hover moves menu focus, buttons click naturally, and world aiming correctly transforms through scaling and letterboxing. Disable the browser context menu over the play surface when right-click operates the cannon.

Touch controls are deliberately sparse: invisible sticks, the menu button, and the contextual cannon button. Support concurrent touches with stable pointer ownership, pointer capture, cancellation, orientation changes, and safe areas. Add light touch-only assistance for aim and avoiding immediate self-hit when firing the cannon; preserve the visible danger and allow deliberate maneuvering. A brief first-touch hint can explain the regions, then disappear. Never let a menu touch leak into firing or consume a new touch with a stale pointer.

Standalone local co-op supports two pads, or keyboard/mouse plus one pad. Bind each device to one player, allow joining at a safe moment, and prevent one controller from driving both scouts. One shared camera keeps all action visible. Online players each use their own local device; touch online play should be a supported version of the same game.

## 7. Attract mode and developer tools

### Attract mode

After **10 seconds without real input on the title/menu screen**, start an AI-played demonstration in the actual game world. The engine’s arcade idle default is 20 seconds, so explicitly configure the required threshold. Its built-in attract cancellation watches only some action/click/join events; add meaningful raw pointer, touch, keyboard, and gamepad activity coverage.

Write a simple state-aware pilot: select a useful breach, bite, collect readiness, align, fire, evade, show refuge protection, avoid or intercept the Swirl, and transition through the sectors. It may use invulnerability and convenient charges. Give it a reliable showcase route that reaches the final phase and loops. Display a small DEMO indicator and a clear invitation to return. Never fake gameplay by moving only decorative sprites.

Any real input exits immediately to the title. Consume that input so it cannot also start a campaign or select a menu item; clear held actions and pointer ownership. Do not let the bot reset the inactivity timer. Run the demonstration in an isolated world with isolated RNG, scores, settings, and persistence. It cannot unlock sectors, change records, submit multiplayer results, or leave music and timers running after exit. Attract mode is standalone only; embedded sessions follow hub ownership.

### Dev mode and content authoring

Dev is reachable from the pause menu with a controller, without a secret key chord. Include invulnerability, infinite charge, collision/warning overlays, seed display/load, sector and boss-phase jumps, restart encounter, spawn threat, freeze, one-tick step, and time-scale control. Preserve the original pause context when leaving the tools. Mark altered runs as practice and isolate them from normal records.

Provide live sliders for scout speed, bite cadence, charge threshold, primary cadence, cannon speed/windup, pursuer speed/turn rate, Swirl speed/telegraph, refuge outage duration, and reserve count. Show readable values and units. Include a real **Reset to Defaults** action. Validate changes, apply them on a fixed-step boundary, and reset dependent timers safely; a slider must not produce NaN, a zero-divide, or a permanently untouchable boss. Freeze and single-step controls need an input/update route that remains operable while simulation time is zero.

Create a controller-operable sector/encounter selector and shield-layout editor, with a pointer painting shortcut. Designers should be able to place/remove cells, select normal/reflective material, configure plate paths, position the refuge, and preview a fortress attack from data. Provide validated JSON import/export and save/load for presets without requiring a local web server. Keep the tooling in the dev screen, away from normal play. Write a short authoring guide with the schema and one completed example. Prove the workflow by exporting, reloading, and playing an edited encounter.

Embedded sessions disable gameplay cheats and content editing. Keep informational diagnostics available where the hub permits; do not expose a player-facing way to change authority or match rules. Host-side harness configuration supplies test settings when needed. Standalone dev settings cannot leak into a network round.

## 8. Multiplayer: standalone and AI Hub

Support **standalone solo/local 1–2 co-op** and **AI Hub online 1–2 shared-world co-op**, using the same campaign and simulation. The hub library provides remote sessions when hosted by AI Hub; it does not supply standalone matchmaking or an invite service. Do not invent such an API. Explain the available modes clearly on the standalone title screen, with local play working immediately from the final HTML.

Read the complete [hub protocol README](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/README.md), [shared-world example](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/examples/arena.html), [session client](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/session.js), and relevant harness/checker code. Planning inspection found protocol 1, client **1.4.0**, revision `35a1047f2067b2af3de3943f0fe452f39105d869`. Use and document the actual compatible revision imported.

### Embed and lifecycle contract

- Embed the released `session.js` **unmodified as the first script immediately after the charset declaration**. Keep it outside any transformation/minification of game code. The importer verifies the client, so verify both its pristine content and safe HTML embedding.
- Supply `hub:session=1`, `hub:session-players=1-2`, `hub:session-mode=shared-world`, and meaningful `hub:session-goal` and `hub:session-howto` metadata. A duration hint may reflect the actual completed slice. This engine direction does not require a WebGPU-required flag.
- Call `AIHub.connect({mode:'shared-world',seats:[1,2]})`. A null result enters the normal standalone title flow. A live session skips the title, attract mode, local lobby, and start prompts. Register lifecycle listeners early and call `AIHub.ready()` when the world is ready without requiring user input.
- Let the hub own the session card and synchronized start. `start` occurs before the countdown completes; simulate gameplay only when `AIHub.time() >= 0`. Treat pre-start `-Infinity` and negative countdown time explicitly.
- `AIHub.isHost` owns simulation and results. A `server:true` host is **not a player**: its ID can be absent from `players`. It must simulate, send state, and finish without an avatar, local input, or visible canvas. Decouple host ticking from rendering and focus. Continue during brief focus/visibility loss without double-advancing on return; respect the hub’s void/end behavior when its host remains hidden for more than 20 seconds. Never resume a void round.
- In shared-world mode, create and cache `AIHub.rng(label)` streams; ordinary `Math.random()` is not automatically seeded. Repeatedly constructing the same labeled RNG resets that stream.
- Only the host calls `AIHub.finish(...)`, once. Include every active player exactly once in standings, with cooperative ties and consistent team scores/outcome. Victory, total elimination, and `time-up` all funnel through one guarded completion path. Handle time-up inside its supplied grace period, even in a transition or death animation.
- Remove a departed non-host and let the remaining scout continue without a softlock. Host departure follows the hub’s void/end behavior; do not invent host migration. On `end`, stop all input, ticks, sends, sound, and pending callbacks, retaining an inert image for hub results.
- The hub owns names, colors, fullscreen, round start/end, and results. Use safe text insertion for names. Avoid standalone restart/title flows, browser dialogs, new tabs, and game-owned networking during a session. Ignore Options while Create is held because the hub owns that chord. In an online local menu, gameplay continues; it must not pause the remote world or transmit held controls.

### Authoritative action and snapshot protocol

Each client sends quantized movement/aim and uniquely identified action edges. Deliver cannon presses reliably, or repeat them until acknowledged, and deduplicate on the host so packet loss cannot swallow the press or create two shots. Check the result of `AIHub.send`: queue critical events for a budget-respecting retry if it returns false, while superseding stale movement with the latest state. Validate sender membership, vector ranges, sequence, timing, cannon availability, and fire cadence on the host. Clients cannot grant charge, remove shield cells, award scores, or report their own damage. Apply host-local input through the same validation path because sends are not echoed to the sender.

Host snapshots carry tick/sequence, sector and phase, shield masks and plate transforms, players, reserves, charges, cannon shots, core state, important hazards, and score. Use stable IDs, stale-packet rejection, full-state recovery, and reliable phase/outcome events. Coalesce events; do not transmit a reliable packet for every chip or particle. Reconstruct visual effects locally from confirmed events.

The current transport caps JSON messages at **16 KB** and outbound traffic at **20 messages per second per copy**, with a burst allowance. Unreliable packets should preferably remain around **1,200 bytes or less** to avoid fragmentation loss. A starting schedule of about 10 compact snapshots per second and bounded client input updates leaves room for reliable control events. Measure actual packet size and total sends, including recovery events. These are protocol-correctness requirements, not an FPS budget.

Use local movement prediction with authoritative correction for the controlled scout, and interpolation for remote bodies. Cannon and core damage remain host-confirmed. Reserve consumption, simultaneous bites, overlapping cannon strikes, phase rewards, and victory need exactly-once semantics. Full-state updates must recover after loss without resurrecting destroyed cells or duplicating a phase transition.

## 9. Build order and acceptance gates

Do not spend the entire run polishing one scene before discovering a lifecycle or packaging mismatch. Each gate ends with a working executable result, a small recorded acceptance check, and an updated decision log.

1. **Foundation proof.** Import and pin the handoff and session client. Read the contracts. Boot the shooter view, move a custom provisional insect body, prove headless stepping and debug snapshots, then generate and open the first single-file artifact. Run a minimal two-page hub round including a server-only host. This establishes the delivery route before content expands.
2. **Complete siege interaction.** Implement cells, bite, charge, refuge rules, guided threat, cannon launch/self-danger, Swirl transformation, death, and win. Make one sector fun with final-quality action feedback. Add rule tests as these interacting systems settle. Both solo and two simultaneous inputs must play it.
3. **Campaign and authoring.** Author all three sectors, moving and reflective shields, boss phases, scoring, practice/retry, and final resolution. Build the data schema, encounter editor, presets, and live tuning together with the content they control. Demonstrate an edited encounter round trip.
4. **Full presentation and UX.** Finish custom rigs, backgrounds, lighting, transitions, music and voices, controller-first menus, input prompts, mouse behavior, touch assistance, accessibility settings, About/Credits, and attract pilot. Check the actual final battle visually, not only the title screen.
5. **Online completion.** Extend the proven session adapter to the complete world, enforce authority and lifecycle, test loss and departures, and ensure the server-only path can finish the full campaign. Check local co-op and solo again where shared rules changed.
6. **Release proof.** Run the appropriate final checks against the packaged artifact, complete the actual feedback and metadata, verify both delivery formats, and leave clean reproducible build/test instructions. Resolve every known broken required feature before calling the demo complete.

If parallel agents are available, useful bounded tasks are custom rig/FX production, audio synthesis, and independent contract/testing review. Agree on state/event/action schemas first, assign separate files or worktrees, and integrate each contribution into the real playable artifact. The builder retains responsibility for cohesion and the full playthrough.

## 10. Verification that proves the game

Create **one command, `npm test`**, that runs the game’s verification suite and prints only failures plus a one-line pass/fail count. Store verbose evidence, replays, screenshots, and harness reports under `tests/artifacts/`. The command may accept a targeted group for iteration; rerun a group only after its covered code changes. Run the required final coverage on the final artifact. Do not repeatedly run unchanged checks to create activity.

Use the engine’s headless primitives and semantic state for rules. Adapt the supplied VM harness rather than assuming browser globals exist in Node. `game.advance(seconds)` is deterministic; drawn headless mode can exercise renderer calls and collect `game.errors`. Account explicitly for scene fades, cleared timers, restored time scale, and isolated storage between test worlds. Repeated identical seed/action traces must agree, and rendering enabled/disabled must produce the same gameplay hash.

### Required proof matrix

| Area | Meaningful checks |
| --- | --- |
| Core rules | Shooting and biting differ correctly; core ignores primary fire; refuge blocks only its specified damage classes and suppresses both weapon commands; energy is obtainable after all cells are gone; cannon starts at the rail and can hit its owner; airborne interception works. |
| Geometry | Moving shields preserve holes; narrow corridors use real projectile radius; vertical-wrap collision and targeting work; reflection returns once; spawn protection ends; no spawn occurs inside an unavoidable hazard. |
| Progression | A non-cheating scripted pilot using ordinary actions completes all sectors, every boss phase, and the ending. Confirm progression and outcome through state assertions. Capture a replay on failure. Also exercise defeat, retry/practice, early tutorial success, a missed final cannon shot, and phase transitions under simultaneous hits. Explicitly start a final-phase recovery check with zero cells, zero charge, and a newly respawned scout; prove refill and airborne victory remain possible. |
| Balance and scoring | A close approach is worthwhile, hiding cannot farm, bonuses apply once, reserve exhaustion works with both players dead, and dev/practice/Assist categories never contaminate normal records. Test representative deterministic seeds and inspect any noncompletion rather than granting the pilot hidden victories. |
| UI/input | Finish the flow with keyboard/mouse and with a standard-mapping gamepad stub. Verify focus/back paths, hover, glyph switching including Xbox, rebinding, disconnect/reconnect, deadzones, and loss of focus. Ensure a mouse target at the edge of a letterboxed world maps correctly. |
| Touch | Use phone and tablet profiles with multiple simultaneous pointers. Test movement plus firing plus cannon, menu cancellation, pointer loss, rotation, safe areas, and portrait framing. Native touchscreen hardware is unavailable; describe the stand-in accurately. |
| Attract | It starts at ten idle seconds, demonstrates the complete mechanic set, loops, and exits on every real input family. That exit input is consumed and no score, unlock, setting, audio node, or timer leaks into the next run. |
| Dev/authoring | Pause-menu reachability, live slider application, reset, freeze/step, phase jumps, valid/invalid content import, editor export/reload, and an actual played edited encounter. |
| Audio | Offline/analyser proof of synthesis, first-run 10% music, respected saved volume, mute and bus routing, no nonfinite/clipped runaway output, and silence after disposal/session end. Audio context startup and resume work after browser suspension. |
| Multiplayer | Solo session and two-page co-op; matching shared state and outcomes; host-local actions; malicious/impossible client actions ignored; simultaneous cell/core hits; correction and recovered cannon presses after packet loss; non-host leave; host leave; short host visibility loss and the hub’s over-20-second hidden-host cancellation; server-only host; time-up during gameplay and transitions; zero sends/input/audio after end. |
| Artifact | The delivered single HTML boots and plays from `file://`, with no missing local imports/assets or console/page errors. The exact packaged file passes the hub harness over loopback HTTP. Credits, metadata, and interview fields agree with actual implementation. |

The full-play pilot must use real game actions and assertions. Unit fixtures may jump to a phase to test a corner case; that does not replace the end-to-end campaign proof. The attract pilot may cheat, so its completion is not balance evidence. Keep useful issue counts while developing so the final testing feedback can distinguish fixed defects from remaining limits.

Use existing Playwright **1.63.0** and downloaded browsers. Do not install browsers or host dependencies. Run no more than one or two browser instances at a time, reuse pages/contexts for local multiplayer, and close them. Chromium is the main browser; check WebKit and touch/TV layouts for relevant portability issues. Firefox’s lack of WebGL in this environment must not be misreported as a defect if the selected renderer does not need WebGL.

For hub integration, vendor the official harness dependencies and use the [protocol harness](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/harness.html) or an equivalent faithful orchestration. Include a two-player run with `latency=150`, `jitter=50`, `loss=5`, then host-leave and server scenarios. Add an explicit non-host-leave test: the automatic two-seat matrix does not cover that by itself. Assert `document.body.dataset.complete === 'true'` and `window.__hubCheck.pass === true`, and inspect actual game state as well as protocol conformance. Consult the [official checker](https://github.com/michaelcrosato/ai-hub/blob/main/scripts/hub-check.mjs) for the current declared-seat matrix.

Prefer file URLs and engine headless tools. When the hub harness needs a server, bind **127.0.0.1 with an OS-selected port**, retain its PID, verify an unmistakable game identity in the loaded page, and terminate only that process. Keep generated files in the development folder, avoid shared temporary directories, and never stop processes or browsers belonging to other builders.

Use screenshots or filmstrips for what state checks cannot establish: insect readability, animation, depth, warning hierarchy, TV typography, portrait composition, and the quality of the final explosion. Request representative title, bite/charge, refuge/Swirl, reflected-shot, co-op, boss, and credits views. Browser checks should wait for semantic state rather than assume wall time equals simulation time. No screenshot, FPS readout, or synthetic bot victory replaces a rule assertion.

## 11. Packaging, feedback, and completion

Provide `npm run build` to generate the final single HTML using the artifact name and output location specified by the builder’s own brief. Inline the full engine, game code, styles, custom art data, content, and procedural audio code. There should be no runtime dependence on development-file paths, ES-module fetches from `file://`, or an asset directory. External CDN dependencies are permitted by the brief, but this direction should work without them unless an actual need appears.

Handle script embedding carefully: the engine itself contains a closing-script sequence in a comment. Escape or otherwise safely encode script bodies in the packager. Preserve the official session-client block according to its import/checker contract; do not silently rewrite it with a generic minifier. Verify the generated HTML parses correctly, contains the full scripts, and passes the client-integrity check. If upstream changes introduce a conflict, resolve it against the current official embed instructions and test the result.

Keep the development source, pin/provenance information, content schema, authoring guide, and exact build/test commands. Record any engine edits and the reason for each. Test the actual shipped artifact after packaging, including a fresh-storage first launch. Verify no starter title, unrelated kit menu, placeholder button, TODO, empty credit, or diagnostic overlay remains in ordinary play.

The in-game About/Credits and builder’s final chat must contain **Source Information, Testing Feedback, Engine Feedback, and Prompt Feedback**, with every field and answer required by the builder’s own brief. They must report what was actually built and tested. Use the actual plan filename, engine/library versions and imported revisions, genre/perspective, original source, procedural audio details, available online/local modes, research links, environment, and run metadata. Mark anything unconfirmed **unknown**. Usage must read **added on import**; do not estimate cost, tokens, or time.

Also produce the builder’s required machine-readable exit interview with its exact schema and prescribed location. Keep all four testing answers, six engine answers, and four prompt answers in the requested order. Fill the catalogue from the finished game: the builder-selected title, useful tagline, accurate description, Game type, Shooter category, correct player range and controls, and honest tags. Validate JSON parsing and required fields, and ensure all representations agree. This builder report is separate from the planner’s exit interview.

Completion means a newcomer can start on a pad, learn the whole loop, experience every mechanic and sector, lose and recover, finish the boss, and replay; a second player can participate locally or through AI Hub; a designer can tune and author another encounter; and the single-file artifact plus evidence demonstrate those claims. End with the finished deliverable and concise factual testing results, including any stand-ins or unknowns.
