# Game Plan: an inked, co-op, isometric action-RPG

You are building this game alone, from this plan, with no director to ask. TASK.md is the brief and wins any conflict with this plan. Where this plan is silent, decide for yourself using the pillars in §1 and do not stop to ask.

- **Paths** in this plan are relative to your dev folder (the subfolder TASK.md tells you to create). Deliverable names and locations come from your TASK.md.
- **The title is yours.** Follow TASK.md: silently brainstorm 50 playful riffs on the source's name, then pick one with a real random number generator (run code). Do this first, because your folder and file names depend on it. Keep the title in one constant (`src/data/meta.js`). Nothing in the story, world or code depends on it. A silly title on a grim game is fine: it is a wink on the title screen, and the game never mentions it again.
- **"Verified"** means the planner ran it on this computer on 2026-11-04 with the pinned versions, in throwaway prototypes. Trust those facts and copy the recipes in Appendix A. Anything else is design intent, so change it if testing shows something better.
- **Reading order:** §1–§4, then §20 (build order). Use the other sections as reference while you build each part.

---

## 1. The game in one page

**Source:** Diablo 3.

**Genre:** isometric action-RPG (hack-and-slash loot game) with story campaign, endgame runs and 1–4 player co-op. That is what the source is, and the genre is what makes it great.

**Perspective:** fixed three-quarter overhead camera (perspective lens, 45° yaw, about 55° pitch), so hordes, ground telegraphs and loot all read from a sofa.

**Pitch.** A black bell fell out of a clear sky and split the hill under an abbey. Every toll takes something from the world, and the seventh takes the sun. Four mortals who appear in no holy book, and so belong to neither Heaven nor Hell, fight up through candle-headed dead, a tax-collecting devil lord and the faceless choir above, cutting down hundreds at a time while legendary loot rains out of the dark. It looks like a woodcut in a burnt psalter that has started to move.

**Pillars** (use these to settle any decision the plan leaves open):
1. **Every press kills something, and it feels wonderful.** Impact within 0.2 s of the button. Hit-stop, flash, ink spatter, ragdolls, breaking furniture, rumble, a thump you feel. Enemies come in crowds and die in crowds.
2. **The next drop might change everything.** Loot arrives constantly and has a moment: colour, beam, bell, big name. Legendaries change how a skill works in a way you can see.
3. **Build freely, never be punished.** Any skill in any slot, swap out of combat at no cost, respec everything.
4. **The world is dying loudly.** Grand, doom-laden melodrama. Villains taunt you personally over the whole level. Lore is read aloud while you keep fighting. Gallows humour at the edges.
5. **Made for a sofa.** One controller or four, on a TV at ten feet. Large text, few words, one thing on screen at a time. Keyboard and mouse get the same screens and feel native.

**Length.** A first campaign run takes 50–70 minutes. After it, *The Hours* (endgame runs) can be replayed freely. A hub session round takes about 10 minutes.

**Slice, not sprawl.** The demo is one complete game loop built to final quality on infrastructure that can scale. Three short acts show every mechanic. Content lives in data tables so designers can add more without touching systems (§4.3).

**No stubs, ever.** If you run short of capacity, follow the cut rules in §20. Removing something cleanly is allowed. Shipping a stub is not.

---

## 2. What we take from the source, and what we never take

This is an **original game inspired by the source**. Take the genre, the feel and the kinds of systems. Never take its names, characters, art, music, levels or look.

| What makes the source distinctive | Our version |
|---|---|
| Fallen star, doomed town, cathedral with dead beneath it | The Black Bell falls on the Abbey of Saint Oren above Tallowgate |
| Heaven vs Hell with mortals caught between, heroes outside the order | The Choir Immaculate vs the Under-Court, heroes are "the Unsung", written in neither book |
| Five-act melodrama with taunting villains | Three canonical-hour acts: Vespers, Compline, Matins. Villains who never shut up |
| Lore books read aloud while you play | Margin Pages, narrated by Archivist Odalys over the fighting |
| Class resources with different rhythms | Contrition, Wick (with Overburn), Dirge, Oil + Nerve |
| Active skills with rune modifiers, passives, free respec | Skills with Glyphs, passives, free swap out of combat |
| Rarity colours, affixes, legendary powers, sets | Worn → Common → Blessed → Exalted → Legendary / Set |
| Salvage, crafting, enchanting, gems, the legendary-power cube | Hesper's forge, Nan Tallow's wax-work, the Reliquary |
| Elite packs with random affixes, boss phases, ground telegraphs | Champion and Exalted packs, 10 elite vows, 5 multi-phase bosses |
| Treasure thief who flees with loot | The Tithe Imp ("Arrears! Arrears!") |
| Grotesque butcher mini-boss | The Chandler ("MORE WICKS!") |
| Kill-streak XP bonus, destructible scenery, physics corpses | CARNAGE ×37, Ruinous, Devastation, Rapier ragdolls and debris |
| Procedural zones, events, shrines, health globes, town portal, waypoints | Stamp-built zones, Vigils and Cursed Reliquaries, Saint's relic shrines, Heartsparks, Homeward Candle, Vesper Shrines |
| Timed randomized endgame runs, scaling difficulty tiers | The Hours, the timed Vigil Trial, Pilgrim → Penance III |
| Couch co-op, stick movement, evade roll | All kept, designed first for the pad |

**Never use**, in names, text, art or sound: Diablo (except the About/Credits "Source" field, the exit interview's source and series fields, and the title riff if you use it), Sanctuary, Tristram, Cain, Leah, Adria, Tyrael, Azmodan, Belial, Maghda, Nephalem, Horadrim, Barbarian, Demon Hunter, Witch Doctor, Crusader, Necromancer, Wizard, Monk (as classes), Treasure Goblin, Whimsyshire, Nephalem Rift, Greater Rift, Paragon, Kanai, Fury, Hatred, Discipline, Arcane Power, its logo lettering, its round-globe HUD, its class art, its music or any melody resembling it. Do not copy its level layouts. Every in-game name comes from this plan's bible or your own invention in its spirit. All text you write is original.

---

## 3. Verified technical facts

These cost real time to discover. Do not rediscover them.

### 3.1 Stack (pinned, verified)

| Piece | Choice |
|---|---|
| Renderer | `three@0.180.0`, `import * as THREE from 'three/webgpu'`, TSL from `three/tsl`, addons from `three/addons/...` |
| Physics | `@dimforge/rapier3d-compat@0.19.3` (WASM inlined as base64, works in the browser and in Node) |
| Language/build | Plain ES modules, `esbuild` (installed) bundling to a single inline IIFE |
| UI | DOM + CSS overlay above the canvas, never canvas text |
| Audio | Web Audio only, everything synthesized |
| Input | Gamepad API (standard mapping), keyboard, mouse |
| Fonts | `@fontsource/uncial-antiqua` (titles, 20 KB) and `@fontsource/alegreya` 500/800 (all UI text, 24 KB each), OFL, inlined as base64 woff2 from each package's `files/*-latin-*-normal.woff2`. Credit them in About/Credits. These subsets have no symbols like ▲▼◆★, so draw symbols as inline SVG |
| Packaging | One HTML file, no external requests. TASK.md allows CDNs, but inline is simpler and verified on `file://` (3.2 MB for the renderer, Rapier and a test scene) |

The hub repo also has a `lib/kit` built on a newer three.js. Do not use it: TASK.md pins R180.

### 3.2 WebGPU in this environment

| Launch flags for Playwright Chromium | Result (verified) |
|---|---|
| `--enable-unsafe-webgpu --enable-features=Vulkan --use-webgpu-adapter=swiftshader` (the list in TASK.md) | **Broken: the device is destroyed right after the first frame.** Later `render()` calls silently do nothing, so frame rates look great and every screenshot is blank |
| Add `--use-vulkan=swiftshader --use-angle=swiftshader` | **Use this.** WebGPU stays alive, and `page.screenshot()` and `canvas.toDataURL()` show real pixels, so TASK.md's warning about blank screenshots no longer applies (`--use-angle=swiftshader` is the part that matters) |
| No flags | No adapter. `WebGPURenderer` falls back to its WebGL2 backend by itself. TSL materials and the ink post chain all work, screenshots work |

- **Always assert the backend** in browser tests (`renderer.backend.isWebGPUBackend`) and listen for `device.lost`. A dead device looks like a fast game.
- WebKit runs the WebGL2 path (verified, screenshots work). Firefox has no `navigator.gpu`, and Playwright's Firefox gave `getContext('webgl2') === null` on real pages in the planner's tests (plain `about:blank` worked), which made three throw during `renderer.init()`. So: wrap renderer init in try/catch, and if no backend starts, show a plain readable message instead of an uncaught error. Do not spend time on Firefox beyond that.
- Software frame rates at 1280×720 with a heavy scene (60 skinned figures, 17 lights, shadows, ink + bloom): about 2–5 fps on WebGPU, 2 fps on Chromium WebGL2, 4 fps on WebKit. **Never make a test depend on wall-clock frame rate.** Tests drive the sim with `step(n)` (§19).
- TASK.md's rule stands: both `file://` and `http://127.0.0.1` count as secure. `localStorage`, `navigator.clipboard`, `RTCPeerConnection` all exist on `file://` (verified).

### 3.3 What rebuilds GPU pipelines in r180 (verified by counting pipeline creations)

| Change | New pipelines | Rule |
|---|---|---|
| Set a light's `intensity` to 0 | 0 | **Pool lights: fixed count, move them, dim them** |
| `light.visible = false`, or adding a light | Rebuilds every lit pipeline | Never at runtime |
| Toggle a light's `castShadow` | Rebuilds every lit pipeline | Decide at load and never change |
| Toggle `material.transparent` | 1–2 | Create both variants up front |
| New mesh or clone with an existing material | 0 | Fine anytime |
| New material with the same structure (same nodes, different colour) | 0 | **Each monster may own its material** |
| Skinned clone (`SkeletonUtils.clone`), shared or own material | 0 | Spawn crowds freely |
| Uniform change (`flash.value = 1`) | 0 | Do per-object effects with uniforms |
| Each new `InstancedMesh`, even with the same material | **1 each** | Create instanced batches at zone load and keep their number small. Merge static level geometry instead (`mergeGeometries`) |

Two traps that give **no error**, only a wrong picture (both verified on both backends):
- **`renderer.compileAsync(scene, camera)` before the post chain makes the scene pass draw nothing but the background.** Do not call it. To avoid first-use stalls, build the zone behind the loading veil with one instance of every FX material in view, and render one real frame with `post.render()`.
- **Inside a post-processing `Fn`, `cameraNear`, `cameraFar`, `cameraProjectionMatrixInverse` and `cameraWorldMatrix` are the full-screen quad's camera, not your scene camera.** Bind uniforms to the scene camera instead, as in A.4. Checked numerically: the reconstructed world position then matches a CPU ray cast to within 0.03 u and stays correct when the camera pans.

Other r180 facts: `MeshToonNodeMaterial` with a `DataTexture` gradient works. `material.emissiveNode` and `material.maskNode` work on both backends (recipes in Appendix A). `interleavedGradientNoise` is **not** exported from `three/tsl` in r180. `PostProcessing` is the class name in r180 (later releases rename it, so ignore newer docs). The hub's notes for a newer three.js say WebGPU draws `Points` at 1 px and does not support `LineLoop`. The planner did not re-test those on r180, so use instanced quads for particles and avoid `LineLoop`.

### 3.4 Physics

`await RAPIER.init()` logs a "deprecated parameters" console warning. It is harmless. Verified working: `createCharacterController`, `computeColliderMovement`, `castRay`, kinematic bodies, dynamic bodies. **150 character-controller actors against 400 static colliders cost 2.4 ms per step in Node.** Use the controller for every actor.

### 3.5 AI Hub (verified against the real harness with a prototype: all pass at 2, 3, 4 players, host-leave, server, on both backends)

Full details in §18. The traps:
- `session.js` must sit **byte-identical** between its banner and last line, exactly once, as the first script in `<head>` right after `<meta charset>`. The hub hashes it from disk. So paste it into the HTML template outside the bundle, and make sure the text `/*! aihub-session ` occurs nowhere else in the file.
- Meta tags must be written `name` first, then `content`, double quotes, no quote characters inside (the checker uses a regex).
- `AIHub.connect()` must be the first thing your main script does, and `AIHub.ready()` must follow as soon as the **sim** is ready, never waiting for the renderer. The harness gives 10 s for hello and 20 s for ready, and all copies share one main thread.
- **`window.__hubCheck.pass` can be true with a broken game.** If your game fails right after `ready()`, the harness stops early with only a few checks, all passing. Require `checks.length >= 13` too (14 with your own card, verified).
- Any console line starting `[AIHub]` fails the hub's check. That includes sends over the rate limit and oversized sends. Use the outbox in §18.4.
- `python3 -m http.server 0 --bind 127.0.0.1` buffers its "port" line when stdout is a pipe, and a script reading it **hangs forever**. Use `python3 -u -m http.server 0 --bind 127.0.0.1`.
- With a heavy scene on software WebGL and four copies, the shared main thread gives each copy about 1.5 fps and the sim timer about 2 Hz. That still passes (verified) as long as the sim catches up from elapsed time and time-up is handled as an event. Add the render governor (§18.6) so a heavier scene stays safe.

### 3.6 Serverless online (verified on `file://`)

WebRTC with copy-paste invite codes connects two pages in the same browser, with both same-context and separate-context pages, on both a reliable ordered channel and an unordered no-retransmit channel. Codes are about 860 characters without STUN. With a public STUN server, the offer grew to about 1,050 characters, gathering ran into the 3 s cap, and the pages still connected. BroadcastChannel only reaches pages in the same context, so do not build on it.

### 3.7 Touch-only detection (verified on iPhone, iPad and Pixel profiles against desktop)

`navigator.maxTouchPoints > 0 && !matchMedia('(any-pointer: fine)').matches`. Touch-only until a gamepad connects or a key is pressed.

---

## 4. Architecture

### 4.1 Layout

```
package.json              pinned deps; no other runtime deps
tools/build.mjs           esbuild + HTML assembly -> dist/game.html; checks the client hash
tools/test.mjs            the one test command (§19)
tools/hub_run.py          drives the hub harness (§19)
tools/make-exit.mjs       writes the exit-interview JSON from src/data/about.js and validates it
vendor/hub/               session.js, harness.html, bridge.js, round.js, verbatim from the hub repo
src/index.template.html   head tags, CSS, pasted client, bundle slot
src/main.js               boot order (§18.1)
src/core/                 rng, clock, events, math, save, settings, tuning
src/data/                 every table in this plan, as plain data
src/sim/                  world, actors, combat, skills, status, ai/, bosses/, loot, levelgen, nav,
                          quests, events, hours, bot. NO DOM, NO three. Runs in Node.
src/view/                 renderer, ink, materials, camera, lights, kit/, rigs/, anim/, fx/,
                          decals, fxphysics (ragdolls, debris), actorsView, levelView
src/audio/                engine, reverb, music, sfx, voice
src/input/                devices, actions, pad, kbm, glyphs
src/ui/                   ui stack, focus, hud, prompts, icons, style.css, screens/
src/net/                  net interface, hubNet, peerNet, localNet, replicate, outbox, protocol
src/modes/                campaign, hours, session, attract, dev
tests/                    data/, sim/, browser/, hub/
docs/CONTENT.md           how to add a monster, skill, item, room, quest, line of dialogue
dist/game.html            build output; copy to the name and place TASK.md requires
```

### 4.2 The spine: intents in, events out

```
input / bot / network  ->  Intent per player per tick  ->  Sim (fixed 30 Hz)  ->  Event stream + plain-data state
                                                                                     |-> View (draws, sounds, fx, ragdolls)
                                                                                     |-> Net (replicates to clients)
                                                                                     |-> Tests (assert on it)
```

- **Sim** is plain data and logic, seeded RNG streams only (`rng('loot')`, `rng('world')`), never `Math.random`. It runs headless in Node, on the hub's playerless server copy, and at high speed in tests. It reads nothing from the GPU. Cosmetic code in the view may use `Math.random`.
- **Intent:** `{mx, mz, moveTo, aimX, aimZ, pressed:[...], held:[...]}`. Pad, mouse, keyboard, bot, attract and network all produce the same thing.
- **Events:** `hit, death, cast, status, drop, pickup, levelup, quest, say, toll, spawn, break, telegraph, ...`. The view and the network consume the same stream. A client copy feeds received events into the same view code.
- **Two Rapier worlds.** `simWorld` in the sim: static colliders, actor capsules, character controllers, ray and shape queries. `fxWorld` in the view: ragdolls, gibs, furniture debris, coins, falling chandeliers, tipping vats. `fxWorld` is cosmetic and local to each copy, so it never needs syncing and the server copy has none. A chandelier's damage is a scripted timer and radius in the sim, and its fall is Rapier in the view.
- **Sim clock:** a timer (`setInterval`), not `requestAnimationFrame`, stepping from elapsed time with catch-up capped at 15 ticks per call. The view interpolates at display rate. A hidden host tab must keep the world running.
- The sim is 2.5D: gameplay happens in x/z. The view lifts actors onto the visual ground height. Simple, robust, and it matches what the source's camera shows.

### 4.3 Data-driven everything ("normal designer tools" later)

Every class, skill, glyph, monster, affix, item base, legendary, set, room stamp, zone, quest, dialogue, lore page, bark, music cue, sound patch and balance value is a plain data entry in `src/data/`, loaded through one validator (`tests/data`). Rooms are ASCII stamps a designer can edit in a text editor. Skills are composed from effect primitives (§7.1), so a new skill means new data, not new code. Dev mode can export current tuning as JSON. `docs/CONTENT.md` explains in a page how to add each kind of content.

### 4.4 Saves

`localStorage`, one versioned JSON document: 4 hero slots, shared stash and gold, settings, unlocks, tuning overrides. Autosave on zone change, quest step and quit. Wrap all storage in try/catch. In a hub session the client swaps in a memory-only storage, so no special case is needed.

---

## 5. Controls and camera

Standard-mapping buttons: 0 Cross, 1 Circle, 2 Square, 3 Triangle, 4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options, 10 L3, 11 R3, 12–15 D-pad, 16 PS, 17 touchpad. Design for any pad reporting `mapping === 'standard'`. Use a non-standard pad on the same indices as best effort, with a one-time notice that its buttons may differ.

### 5.1 Controller

| Input | In the world | In menus |
|---|---|---|
| Left stick | Move (direct, analog speed) | Move focus |
| Right stick | Aim override: skills fire that way, an arc shows at the hero's feet. Released: auto-aim | Scroll, or spin the hero on the Wheel |
| ✕ Cross | Slot 1, hold to keep attacking. A **tap** while an interact prompt shows: interact | Confirm |
| □ Square | Slot 2 | Item action (mark, salvage) |
| △ Triangle | Slot 3 | Details / compare |
| ○ Circle | Slot 4 | Back |
| R1 / R2 | Slot 5 / Slot 6 | Next tab / page down |
| L1 | Potion | Previous tab |
| L2 | Evade roll (move direction, else facing) | Page up |
| D-pad ↑ → ← | Wheel / Psalter / Journal | Move focus |
| D-pad ↓ (hold) | Homeward Candle | Move focus |
| Create (tap) or touchpad | Map | |
| Options | Pause | Back to game |

Auto-aim: best target in a ±35° cone inside the skill's range, weighted by distance and elite status, strength in Dev sliders. Rumble through `gamepad.vibrationActuator?.playEffect('dual-rumble', ...)`, guarded and toggleable. Deadzones: stick 0.18 radial. Ignore Options while Create is held (the hub owns that chord). Open the map on Create **release**, only if Options was not pressed during the hold.

### 5.2 Keyboard and mouse (the keys genre players expect)

| Input | Action |
|---|---|
| Left mouse | Hold to move toward cursor. On a monster: Slot 1 at it. On loot, NPC, door, shrine: walk there and use it |
| Right mouse | Slot 2 at cursor |
| 1 2 3 4 | Slots 3–6 at cursor |
| Q | Potion |
| Space | Evade roll toward cursor |
| Shift (hold) | Stand still and attack toward cursor |
| Alt (hold) | Show all loot labels |
| I or C | Wheel (inventory) |
| S or K | Psalter (skills) |
| J | Journal |
| M or Tab | Map |
| T | Homeward Candle |
| Esc | Pause / back |
| Enter | Confirm, or use the highlighted thing |
| Arrow keys | Move directly. WASD too when Settings ▸ Controls ▸ WASD Movement is on (off by default, as `S` is Psalter; K always works) |
| Mouse wheel | Camera zoom in the world, scroll in menus |

In the world, **hover highlights** anything usable with an ink-gold outline and a nameplate. In menus, **hover moves the focus**, left click confirms, right click is the item quick action (equip, sell) or back on empty space. Only real mouse movement changes focus, never a menu scrolling under a still cursor. Show a gothic gauntlet cursor (CSS data-URI) and hide it while the controller is the last-used device.

### 5.3 Prompts

Every on-screen prompt goes through `Glyph(action)`, which resolves from the last-used device: **PlayStation shapes** by default on a pad, **A B X Y / LB RB LT RT / Menu View** with Settings ▸ Controls ▸ Controller Glyphs set to Xbox, and **keycaps and mouse-button icons** for keyboard and mouse. Draw them as inline SVG. Prompts swap instantly on device change, and stick noise under 0.5 must not flip the device. The hotbar labels swap the same way: same bar, same position, different glyphs.

### 5.4 Camera

Perspective, FOV 30°, yaw 45° (diamond grid), pitch about 55°, default distance about 30 u (a 2 u hero is then about 9% of screen height, verified), which shows about 28 u across the ground. Three zoom steps. Critically damped follow with a slight lead toward movement. Pulls back in boss arenas, dollies close with letterbox for dialogue. Shake on big hits, with a Settings slider. In couch co-op it frames all local players and zooms out to a limit (§18.8).

**Occlusion.** Walls whose outward face points at the camera (+x and +z sides) are built as knee-high stubs with an inked cap, the classic isometric cut-away. Tall props in front of the hero use a dithered screen-space hole (`maskNode`, verified, Appendix A).

---

## 6. Combat model

Tick 30 Hz. Units: 1 u ≈ 1 m. Hero run speed 6 u/s, evade roll 7 u in 0.45 s with i-frames, cooldown 3 s, two charges.

```
damage = weaponDPS × (1 + primary/100) × skillPct × (1 + typeBonus + eliteBonus)
       × (crit ? critMult : 1) × tuning.playerDamage
monsterHP(level) = baseHP × tier × (1 + 0.28 × (level−1)) × difficulty.hp × (1 + 0.75 × (partySize−1))
monsterDmg(level) = baseDmg × tier × (1 + 0.18 × (level−1)) × difficulty.dmg
mitigation = armor / (armor + 50 × monsterLevel), resist likewise with 5 ×
xpToNext(L) = 120 × L^1.6
```

**Targets to tune against with the bot (§19):** a normal monster dies in 2–3 Slot 1 hits at level parity on Pilgrim; champions in 15–25 hits; a boss fight takes the times in §8.3; a level-appropriate hero survives about 8 normal-monster hits. Level 12 at the end of Act I, 20 at the end of Act II, 24 at the end of the campaign, cap 30 in The Hours.

**Damage types:** Physical, Fire, Holy, Shadow. **Status:** Burn and Bleed (damage over time), Slow, Waxed (slow, three stacks becomes Root), Stun, Root, Fear, Blind (ranged enemies stop firing), Marked (+damage taken), Knockback. Elites take quarter duration on hard control, bosses are immune but build a stagger meter.

**Feel, tuned in Dev:** hit-stop 40–80 ms (scaled, never on the hero's movement), white flash via uniform, knockback slide, ink spatter decal, layered sound, rumble, shake on crits and big kills. Generators land within 0.12–0.2 s of the press. Movement cancels recovery.

**Life:** Vial of Last Light (potion) has unlimited uses on a 30 s cooldown. **Heartsparks** (health globes) drop from kills and drift to you. Gold is collected automatically in a radius. **Death:** "You have fallen." Rise at the last checkpoint, or at your corpse (three times per zone). In co-op, allies revive you with a 2 s hold. **Hardcore toggle ("Final Hour")** at hero creation: death ends the hero, who is then listed on a Memorial page.

**Kill bonuses** (big text, XP, cheer sound):
- **CARNAGE ×N:** kills within 1.5 s of each other, from N ≥ 5.
- **DEVASTATION:** 8+ kills from one hit.
- **RUINOUS:** 10+ objects broken in 3 s.
- **SENT UPWARD:** killing blow launches the corpse far (physics).

---

## 7. Classes

Every class: 8 active skills, 3 Glyphs per skill (unlock 2, 5 and 9 levels after the skill), 6 passives, 6 action slots, passive slots at levels 5, 10, 15. Any skill may sit in any slot. Changing skills costs nothing out of combat. In each class, the Session loadout below is also what the attract mode and the hub round start with, with one Glyph on each skill. Each class has a code-built rig and silhouette (§12.3), its own resource vial and voice.

Hero creation: choose class on a 3D line-up, accept a generated gothic name (△ re-rolls), choose difficulty and the Final Hour toggle. No text entry is needed.

### 7.1 Skill primitives (`src/sim/skills.js`)

`melee_arc{range,arc,pct}`, `projectile{speed,count,spread,pierce,homing,chain,radius}`, `nova{radius,pct,delay}`, `ground{radius,duration,tick,pct,status,follow}`, `beam{length,width,pctPerS,channel}`, `leap{range,radius,pct}`, `dash{range,width,pct,iframes}`, `blink{range}`, `pull{range,count}`, `summon{kind,count,max,duration}`, `buff{stats,duration,aura}`, `trap{arm,radius,pct}`, `turret{duration,rate,projectile}`, `corpse{op}`, `wall{length,duration}`. A skill is a list of these plus cost, cooldown, clip, sound and VFX ids. A Glyph is a data patch on that list. Legendary powers and passives are hooks (`onHit`, `onKill`, `onCast`, `onStruck`, `modifySkill`).

In the tables, `Gen` builds resource, `%` is weapon damage, `CD` is cooldown, `(n)` is unlock level, and Glyphs are separated by `/`.

### 7.2 The Penitent: bruiser in a rusted confession cage, swinging a bell-clapper maul

**Might.** **Contrition** (0–100): builds when you strike and when you are struck, decays out of combat. **Absolution:** at full, your next spender deals +40% and rings a shock.

| Skill | Use | Effect | Glyphs |
|---|---|---|---|
| Clapper Strike (1) | Gen +8 | 100° arc, 120% | Ringing Blow: third hit sends a 160% shock cone / Heavy Hand: 25% stun, more knockback / Long Reach: +50% range, tugs enemies in |
| Censer Whirl (2) | Hold, 15/s | Spin at 70% speed, 90% per 0.3 s | Incense of Ash: burning trail / Bloody Devotion: heal per enemy hit / Thunder Thurible: pulls enemies inward |
| Chain of Absolution (3) | CD 6 | Hurled chain pulls up to 5, 140% | Drag Them Down: root 2 s / Confession: pulled enemies are Marked / Martyr's Link: pull yourself instead |
| Martyr's Fall (5) | CD 10 | Leap 14 u, landing 320%, r6, launches ragdolls | Crater: burning ground / Falling Bell: stun 2 s / Second Fall: recast within 3 s |
| Vow of Iron (7) | CD 20 | 8 s: 40% less damage, +6 Contrition/s | Hairshirt: thorns 200% / Shared Vow: allies too / Unbroken: cheat death once |
| Great Toll (9) | 35 | Cone slam 380% with travelling shockwave | Toll for Thee: Marked / Cracked Bell: 3 aftershocks / Funeral Peal: kills echo 60% |
| Flagellant's March (11) | CD 8 | Dash 16 u, 200%, smashes doors and furniture | Trample: stun / Bleeding Road: bleed trail / Ram: double vs elites |
| Last Rites (14) | CD 60 | 10 s: bigger, +50% attack speed, each kill +0.5 s | Ecstasy of Pain: heal on hit / Bell-Struck: nova every 1.5 s / Endless Penance: kills shorten cooldown |

Passives: Scarred (+armor), Hard Confession (+Contrition when struck), Bruised Knuckles (crit after being hit), Weight of Sin (+damage at full), Lay Down (survive a lethal hit, 60 s), Absolver (spending heals).
Session loadout: Clapper Strike, Great Toll, Martyr's Fall, Chain, Vow of Iron, Censer Whirl.

### 7.3 The Anchorite: walled-up mystic with a crown of candles, robes of melted wax

**Will.** **Wick** (0–100): regenerates 12/s. **Overburn:** you may spend down to −40, paying the difference in Life, and the screen edge scorches. Risk is the class's rhythm.

| Skill | Use | Effect | Glyphs |
|---|---|---|---|
| Ember Flick (1) | Free, +regen | Small homing bolt, 110% | Twin Spark: 2 bolts / Cinder Trail: burn / Tallow Drop: Waxed |
| Scalding Wax (2) | 16 | Lobbed blob 220%, r3.5, slow pool 3 s | Hardening: root / Flashpoint: fire ignites the pool / Drip: 3 small blobs |
| Snuff (3) | CD 8 | Blink 14 u, smoke blinds at origin | Afterimage: decoy taunts / Second Snuff: 2 charges / Sputter: 180% burst at both ends |
| Candlemas Nova (5) | CD 10 | Nova r9, 260%, stun 1.5 s | Wick Burst: burn / Hollow Light: stronger at distance / Penumbra: pull in first |
| Vesper Ray (7) | Hold, 20/s | Beam 18 u, 320%/s, pierces | Prism: splits in 3 / Searing Psalm: ramps +20%/s / Long Vigil: cheaper, slows |
| Votive Host (9) | CD 20 | 3 orbiting flames fire 60% every 0.7 s for 15 s | Sentries: 5 placed / Martyr Flames: burst on expiry / Lantern Ward: flames absorb hits |
| Falling Lamp (11) | 40 | 1 s telegraph, huge iron lamp lands r6, 600%, burning ground, real debris | Chain of Lamps: 3 sequential / Molten Oil: bigger burn / Swift Descent: no delay, −20% |
| Immolation Vow (14) | CD 60 | 12 s: no Wick costs, +40% cast speed, life drains 1%/s | Phoenix: prevents death / Inferno Crown: aura 60%/s / Burn Bright: +30%, drains 3% |

Passives: Long Wick (+max), Practised Overburn (+20 limit), Glass Reliquary (+15% damage, −10% life), Tallow Skin (first hit each 8 s absorbed), Pyre Psalm (longer burns), Lit from Within (+regen under 30).
Session loadout: Ember Flick, Scalding Wax, Snuff, Candlemas Nova, Vesper Ray, Falling Lamp.

### 7.4 The Gravecaller: hunched sexton who taught the dead to sing, spade-staff, bone lantern

**Will.** **Dirge** (0–100): builds from generators and from corpses near you. **The choir sings:** each raised Chorister adds a live voice to the music (§14.2). A full choir is audibly glorious.

| Skill | Use | Effect | Glyphs |
|---|---|---|---|
| Bone Psalm (1) | Gen +8 | Shard 100%, pierces 2 | Splinter: splits on hit / Marrow Tap: small heal / Homily: minions focus the target, +10% |
| Raise Chorister (2) | 20 | Raise from a corpse (or 30 without one), max 6, melee | Tenors: ranged / Bassos: max 3, huge / Altos: fast, bleed |
| Corpse Lantern (3) | 15 | Every corpse within r10 explodes, 180% each, r3 | Shrapnel Hymn: +range / Funeral Pyre: burn pools / Harvest: corpses refund Dirge |
| Grave Mist (5) | CD 12 | Zone r8 for 6 s: 50% slow, 80%/s Shadow, heals minions | Choking: silences casters / Walking Mist: follows you / Cold Earth: root on entry |
| Ossuary Wall (7) | CD 15 | 10 u wall of bone, 5 s, blocks pathing | Spiked: thorns / Collapse: 300% burst at end / Ring of Bone: circle |
| Soul Lash (9) | 20 | Arc through 5 enemies, 240%, heal | Chain Lash: +3 / Reaping: execute under 20% / Tether: shares damage among them |
| Open Grave (11) | CD 20 | Pit r5: hands root 3 s, 500% over time | Mass Grave: +radius / Unquiet: 4 temporary diggers / Six Feet: kills under 30% |
| Requiem (14) | CD 60 | 12 s: minions sing, enemies r15 +30% damage taken and slowed, you take 50% less, then minions burst and return free | Encore: repeat at half / Dies Irae: burst doubled / Lullaby: enemies sleep at start |

Passives: Sexton's Patience (minion life), Common Grave (+1 max), Cold Hands (Shadow bonus), Well-Dug (corpses last longer), Choirmaster (minion damage per minion), Last Verse (minion death heals).
Session loadout: Bone Psalm, Raise Chorister, Corpse Lantern, Grave Mist, Soul Lash, Open Grave.

### 7.5 The Nightwarden: lamp-lit hunter of the night roads, wide hat, long coat, repeating crossbow

**Nerve.** Two resources: **Oil** (fast regen, powers attacks) and **Nerve** (slow regen, powers movement and traps). **Lantern circle:** enemies within 6 u take +10% damage, shown as a warm pool of light at the hero's feet.

| Skill | Use | Effect | Glyphs |
|---|---|---|---|
| Nailshot (1) | Gen +6 Oil | Bolt 110% | Ricochet / Silver Nail: Holy, pierce / Quick Hands: +attack speed |
| Hallowed Spread (2) | 20 Oil | Fan of 5, 70% each | Buckshot: knockback / Wide Litany: 9 at 45% / Salt Rounds: slow |
| Vault (3) | 15 Nerve | Flip 12 u, caltrops behind | Rattling Landing: stun / Double Vault / Ghost Step: i-frames, speed |
| Caltrop Field (5) | 10 Nerve, CD 6 | Armed zone 120%/s, 60% slow | Hook Trap: pulls / Oil Spill: burn / Bear Trap: root, 400% |
| Lantern Flare (7) | CD 15 | Cone r12: Blind and Fear 2.5 s | Searchlight: crits on blinded / Burning Oil / Long Beam |
| Rain of Nails (9) | 40 Oil | Area r7 for 5 s, 180%/s | Iron Monsoon: +r / Cross Pattern: 2 lines 300% / Harrow: slow |
| Clockwork Sentry (11) | CD 18 | Turret 20 s, 80% every 0.5 s, max 2 | Repeater / Thumper: area / Decoy Bell: taunts |
| Hour of the Wolf (14) | CD 60 | 10 s: enemies 40% slower, +50% attack speed, free Oil | Wolfsbane: +crit / Long Night: elite kills +2 s / Last Bolt: final burst |

Passives: Steady Hand (+crit standing still), Cold Nerve (+Nerve regen), Lamplighter (bigger circle), Bounty Ledger (+elite damage, +gold), Road-Worn (+speed), Second Wind (Nerve on kill).
Session loadout: Nailshot, Hallowed Spread, Vault, Caltrop Field, Rain of Nails, Clockwork Sentry.

---

## 8. Monsters

### 8.1 Roster

`hp×` and `dmg×` multiply level values. Speeds in u/s. Each uses a shared rig (§12.3) and needs its own silhouette, palette, attack clip and sounds.

| Name | Act | Rig | Role | hp× | dmg× | Speed | Behaviour (always telegraph with a ground decal if it can hurt badly) |
|---|---|---|---|---|---|---|---|
| Wick-Dead | I | biped | Swarm | 0.7 | 0.6 | 2.6 | Shambling corpses with lit wicks through the skull. Flame drifts up on death |
| Tallow Thrall | I | hulk | Tank | 3 | 1.2 | 1.8 | Melted-together corpses. Slam r3. Dies into a slowing wax pool |
| Carrion Rook | I | flyer | Flock | 0.4 | 0.5 | 5.5 | Flocks of 6–10, dive and peck, ignore low obstacles |
| Gnawhound | I | quad | Rusher | 0.6 | 0.8 | 7 | Packs of 4–6, leap 8 u |
| Wick-Sworn Acolyte | I | biped | Caster | 0.8 | 1.2 | 3 | Lobs wax globs, keeps 10 u away |
| Chantry Bellringer | I | biped | Support | 1.2 | 0.4 | 2.8 | Handbell every 6 s: raises 3 corpses, nearby allies +25% speed. Kill first |
| Censer Bearer | I | biped | Bomber | 0.5 | 2.5 | 5 | Runs in, 1 s fuse, r4 fire burst. Kill it among its friends |
| Reliquary Mimic | any | crawler | Ambush | 4 | 1.5 | 4 | A chest with legs and teeth |
| Brinebloat | II | hulk | Bomb tank | 2.5 | 0.8 | 1.6 | Bursts: salt haze r5, slow |
| Mire Reaver | II | crawler | Burrower | 1 | 1 | 5 | Tunnels under mud, erupts beneath you |
| Ledger Imp | II | small biped | Ranged | 0.5 | 0.8 | 4.5 | Fans of quills, blinks when struck |
| Bailiff | II | hulk | Charger | 3.5 | 1.6 | 3 (charge 11) | Front shield 50%, charge stuns on walls, can be baited |
| Salt Golem | II | hulk | Tank | 5 | 1.5 | 1.6 | Reflects 10%, line of crystal spikes |
| Drowned Chorister | II | biped | Caster | 1 | 1 | 2.4 | Sings a cone: slow plus damage, interrupted by stun |
| Psalter | III | flyer | Swarm | 0.5 | 0.8 | 4 | Parchment wings, fires straight lines of verse |
| Cantor Novice | III | biped | Melee | 1.4 | 1.2 | 4 | Hollow bell for a head, rings when struck, glaive sweep |
| Thurifer | III | biped | Healer | 1.2 | 0.6 | 3 | Incense heals allies and burns you |
| Errant Seraph | III | flyer | Diver | 1.2 | 1.5 | 8 | Circles, telegraphed dive line, burst on landing |
| Litany Knight | III | hulk | Guardian | 5 | 1.8 | 2.6 | Immune from the front, turns slowly, flank it |
| Tithe Imp | any | small biped | Runner | 3 | 0 | 7.5 | See below |

**The Tithe Imp.** A fat tiny devil-clerk dragging a coin sack, shrieking "Arrears! Arrears!" It flees, sprays coins when hit, and after 15–20 s opens a little black door and escapes. If killed, a fountain of gold (real Rapier coins) plus a guaranteed Exalted or better. One guaranteed in Wickfield so everyone meets it.

### 8.2 Elites

**Champions** (blue name): pack of 3–5, hp× ×4. **Exalted** (yellow name, generated title): leader hp× ×6 with 4–6 minions. Vows: 1–2 on Pilgrim, up to 3 on Penance.

| Vow | What you see |
|---|---|
| Burning Tallow | Flaming wax pools every 3 s |
| Vesper Beam | A slow rotating beam from one pack member |
| Manacled | Iron chains root you after a 0.8 s telegraph |
| Undertow | Pulls you toward them |
| Bulwark | Ring of stone rises around you, telegraphed, 3 s |
| Blink | Teleports to you |
| Zealot | +40% speed and attack speed |
| Ward | Rotating 3 s invulnerability, one always exposed, shown by aura |
| Bell Mortar | Lobbed small bells, burst on landing |
| Mirror Vow | 3 s reflect windows, shown by aura |

Name tables: titles {Deacon, Sister, Bailiff, Old, Blessed, Sexton, Brother, Mother, Clerk, Canon} + {Grell, Maud, Ansel, Hob, Wynn, Isolde, Tam, Corvin} + {the Unlit, of the Long Drip, Who Counts, the Twice-Buried, the Overdue, Who Sang Once, of the Short Wick, the Unforgiven}.

### 8.3 Bosses

Intro: camera sweep, name in Uncial, music change, skippable. Each has a boss bar with phase ticks. Hit points are set so a level-appropriate solo fight lasts the listed time on Pilgrim. Each drops a guaranteed Legendary on first kill (the Chandler's is the player's first).

**The Chandler (Act I, about 90 s).** Grotesque tallow-renderer, apron, hook on a chain, huge cleaver. *Rendering Hall: vats, grates, hanging corpses.*
- P1: cleaver combos, hook throw that drags you to him.
- Vat tip: he smashes a vat, wax floods a marked lane, and fire lines ignite it. Bait his charge into a vat and it explodes, stunning him (Rapier vat, sim timer).
- P2 under 60%: sets himself alight, faster, burning footprints.
- P3 under 25%: grabs corpses and hurls them, Wick-Dead waves every 20 s.
- Lines: "MORE WICKS!" / "Hold still, little candle." / "You'll burn so LONG." / death: "...who'll... mind... the vats..."

**Abbess Maudlin Vane (Act I finale, about 120 s).** Tall, veiled, soft-spoken, a thousand burned-down candles fused to her back. *The Broken Nave: four pulpits, huge chandelier.*
- P1: teleports between pulpits, lines of hymn crawl along the floor, summons Bellringers.
- P2 under 66%: **Mourning Veil.** The whole arena goes black and shadow damage ticks everywhere except near lit candles, which she snuffs one by one. The showcase moment for lighting.
- P3 under 33%: she drops the chandelier at you (telegraphed). Lure her under the next one for huge damage.
- Lines: "Hush now. It only hurts until it doesn't." / "Do light a candle for yourself. No one else will." / death: "...They were so *quiet*, before..."

**The Margrave of Arrears (Act II finale, about 150 s).** Colossal bloated devil in rotten court finery, carried on a litter by four Bailiffs. *His vault, walls of ledgers and coin.*
- P1: kill the Bailiffs to bring him down, while he rains coins (lobbed area bursts).
- **Audit:** marks one player, whose gold pickups hurt for 8 s.
- P2: on foot. **Foreclosure:** arena walls advance, shrinking the floor. Smash the pillar seals to push them back.
- P3 under 25%: **Final Notice:** pulls everything in and detonates. Dodge out in time.
- Death: an absurd physics explosion of coins.
- Lines: "You are in arrears." / "Every soul has a balance. Yours... is missing. How irregular." / "Bailiffs! Repossess this person's legs." / death: "This... will be... appealed..."

**Cantor Aurel, the Cracked (Act III, about 90 s).** Your mute seraph ally, revealed. Parchment wings, cracked bell for a head, sweeping glaive. Fast dives, verse-lines, ring shockwaves. At half health he kneels and sings once. It is the only time you hear him clearly, a four-note motif from the title theme.

**The Precentor (Act III finale, about 240 s).** Vast robed conductor, an enormous bell for a head, hanging in the sky over the Belfry. *The Black Bell above you, the arena a clock face.*
- P1: **The Stave.** Five glowing lines sweep the floor with note-bombs that burst **on the music's beat** (telegraph on bar 1, burst on bar 2).
- P2 under 66%: **Silence.** The music and all sound drop except a heartbeat. Telegraphs turn pure white. "Silence is also a verse."
- P3 under 33%: **The Final Hymn.** Cantors pour in. Three small bells on the clock face must each be rung (interact under fire) to crack his head open for a burst window. The eighth toll is a silence.
- Lines: "You are a wrong note. I do not hate a wrong note. I correct it." / "Sing." / death: a held note, cut off mid-breath.

**Hour-Warden (The Hours):** a random boss kit from the above with one extra elite vow and a generated title.

---

## 9. Loot and crafting

**Rarity:** Worn (grey), Common (white), Blessed (blue, 1–2 affixes), Exalted (yellow, 3–4), Legendary (orange, 4 + power), Set (green, 4 + set bonus). Each rarity also has an icon shape (◦ • ◆ ★ ✦ ✠) for readability and colour-blind play. Drop tuning: something worth reading roughly every 90 s; the first Legendary at the Chandler at the latest; pity timer so no one goes 20 minutes without one.

**A drop has a moment:** arcs out with Rapier, lands with a sound per slot, rarity beam (Legendary: tall orange pillar, deep bell, 0.1 s slow-motion, big name over it). Personal loot in co-op, rolled per player.

**Slots (12, arranged as a clock face on the Wheel):** Head, Shoulders, Chest, Hands, Belt, Legs, Feet, Amulet, Ring, Ring, Main Hand, Off Hand. Weapons by class: Penitent maul or flail plus shield; Anchorite wand or censer plus candle; Gravecaller spade-staff or bone rod plus skull lantern; Nightwarden crossbow plus quiver or lamp. Head, shoulders, chest colour and weapons **visibly change the hero** (§12.3).

**Affixes (magnitude scales with item level):** Primary, Vitality, Armor, All Resist, Crit Chance, Crit Damage, Attack Speed, Cooldown Reduction, Resource Cost Reduction, Area Damage, Fire/Holy/Shadow/Physical Skill Damage, Life per Hit, Life per Second, Move Speed, Gold Find, Magic Find, Pickup Radius, Thorns, Elite Damage. Item names: prefix + base + suffix from gothic word lists you write (Psalter Greaves of Long Suffering, Saint's Rusted Coif).

**Legendaries** (each must be visible in play, not just a number):

| Name | Slot | Power |
|---|---|---|
| The Ninth Clapper | Maul | Every third Clapper Strike tolls a ring that stuns 1 s |
| Hairshirt of Saint Oren | Chest | Thorns also Burn |
| Chains of the Unforgiven | Belt | Chain of Absolution resets on kill |
| Ashen Reliquary | Amulet | Censer Whirl leaves burning ground and costs 30% less |
| The Wick That Would Not Die | Candle | First 20 of Overburn cost no Life |
| Crown of Molten Saints | Head | Falling Lamp drops twin lamps |
| Cellbreaker | Ring | Kills refund Snuff |
| Thurible of Last Breath | Wand | Ember Flick chains to 3 |
| The Sexton's Spade | Staff | Raise Chorister needs no corpse, +2 max |
| Bone Cantata | Amulet | +4% damage per Chorister, and their voices get louder |
| Shroud of the Unsung | Chest | Grave Mist follows you |
| Ring of Common Graves | Ring | Corpse Lantern spawns a temporary skeleton per burst |
| Widow's Repeater | Crossbow | Nailshot fires in bursts of 3 |
| Lantern of the Long Road | Lamp | Lantern Flare leaves a burning cone |
| Road-Warden's Boots | Feet | Vault's caltrops explode |
| Ledger of Bounties | Amulet | Elite kills grant 20 Nerve and speed |
| Bell-Thief's Purse | Belt | +50% gold, gold pickups heal |
| Penny for the Ferryman | Ring | Gold pickups spit a damaging coin at the nearest enemy |
| The Collector's Thumb | Ring | Tithe Imps appear twice as often |
| The Stopped Clock | Amulet | 5% on kill: world slows 1 s |
| Halo of Rust | Head | Aura slows enemies 10%, visible flakes |
| Gloves of the Last Rite | Hands | Spender crits refund 5 |
| Boots of the Sleepwalker | Feet | +15% speed, evade free for 2 s after a kill |
| Psalter of Hollow Verses | Off hand | Every 30 s a random cooldown resets, with a whisper |

**Sets (4 pieces, bonus at 2 and 4, per class):** Vestments of the Ninth Penance (2: +Contrition from hits; 4: Absolution triggers at 75 and rings twice). Regalia of the Walled Flame (2: +Wick; 4: Overburn doubles damage). The Sexton's Last Rites (2: +1 max minion; 4: Requiem cooldown falls with each minion death). Harness of the Night Road (2: +Nerve; 4: Lantern circle doubles and burns).

### 9.1 Tallowgate services (each one simple screen)

| NPC | Services |
|---|---|
| **Hesper Kell**, smith | **Salvage** any item to Scrap Iron, Wax Dust, Reliquary Ash. **Craft:** pick slot and rarity, pay materials, get a rolled item at your level |
| **Nan Tallow**, wax-witch | **Enchant:** re-roll one affix, choosing from 3. **Reliquary:** render a Legendary into a Relic, destroying the item and keeping the power. One Relic each of Weapon, Armor, Jewel may be worn on top of gear. **Gems:** socket and combine (3 → next rank) |
| **Gaspard Nill**, fence | Buy/sell. **Blind Reliquaries:** gamble Bell Shards on a chosen slot |
| **Stash** | Shared across heroes, large cells |
| **Vesper Shrine** | Travel, change difficulty |
| **Archivist Odalys** | Story, lore, The Hours |

**Gems:** Ember Garnet, Salt Diamond, Grave Jet, 3 ranks, different effect by socket type (weapon, armor, jewel).
**Devotion:** after level 30, XP grants points spent on four plain sliders (Core, Attack, Defense, Utility).

---

## 10. World, zones and modes

### 10.1 Zones

| Zone | Act | Kit | Shape | Kills | Time | Holds |
|---|---|---|---|---|---|---|
| Tallowgate | hub | town | authored | – | – | NPCs, stash, shrine. The Black Bell visible on the horizon, tolling |
| The Gibbet Road | I | exterior | authored, 3 chunks | 40 | 3 min | Tutorial by doing, first loot, first ragdoll |
| Wickfield | I | exterior | 6–8 stamps | 140 | 7 min | Lantern Vigil, Tithe Imp, random event, optional barrow |
| The Sexton's Barrow | I, optional | interior | 6 rooms | 50 | 3 min | Lore, chest room, mimic |
| Abbey Undercroft | I | interior | 2 floors, 10 rooms each | 220 | 9 min | Rescue Ilse, traps, breakables |
| The Rendering Hall | I | authored arena | – | boss | 3 min | The Chandler |
| The Broken Nave | I | authored + 3 rooms | – | 30 + boss | 4 min | Aurel scene, Abbess Vane |
| The Saltmere | II | exterior, black water | 8 stamps | 180 | 7 min | Boardwalks, stilts, wading slows you, 3 Ledger Pages |
| Counting-House of Arrears | II | interior re-dressed | 12 rooms | 140 | 5 min | Vault trap room, then the Margrave |
| The Hour Spire | III | floating slabs | 3 floors, 5 rooms each | 150 | 8 min | Giant stopped clocks, Choir enemies |
| The Belfry | III | authored arena | – | bosses | 6 min | Aurel, then the Precentor |

**Generator (`src/sim/levelgen.js`).** Seeded. Tile 4 u. Interiors: graph of ASCII room stamps (5–12 tiles across) connected through door sockets on a coarse grid, critical path to the exit, side rooms for loot, events and shrines. Exteriors: a grid of 40×40 u chunk stamps with matching road edges. Stamps declare spawn, prop, light and socket markers. Must be connected on every seed (test 200 seeds). Output is plain data: walkable grid, wall colliders, markers. **Kits** (§12.4) turn the data into merged geometry in the view.

**Events** (each zone rolls 1–2): **Cursed Reliquary** (timed waves, then a rich chest), **Lantern Vigil** (hold 3 posts while enemies come), **Pilgrims' Last Mile** (escort), **Mass Grave** (horde of 80+).
**Shrines** (relics of a saint, 2-minute buffs): Saint's Thumb +25% damage, Saint's Tongue +25% XP, Saint's Purse +100% gold and magic find, Saint's Knee +30% speed, Saint's Rib −25% damage taken.
**Traps and scenery that kill for you:** falling chandeliers, swinging censers, hanging cages, stacked coffins, burning oil lines. Enemies die in them too. Almost everything breakable breaks into Rapier debris (§12.5).

**Travel:** Vesper Shrines between discovered zones. **Homeward Candle:** 3 s channel opens a door to town, and a return door stays. Checkpoints at each door. In co-op, a Party Standard in town warps you to an ally.

### 10.2 Campaign quests

Quests are data (`src/data/quests.js`): `{id, title, objective, on:'kill:x|enter:z|talk:n|use:o|flag:f', rewards, say}`. Always show one current objective, plus a gold arrow at the screen edge and on the map. **The player is never lost.**

| Quest | Beat |
|---|---|
| The Fourth Toll | Intro → fight down the Gibbet Road → reach Tallowgate → talk to Odalys |
| What the Bell Brought | Wickfield: light three Lantern Posts (a Vigil) to open the Abbey road |
| Under the Abbey | Undercroft: fight down, rescue Ilse of the Ninth Bell. Brother Cuthbert joins as follower (solo) |
| More Wicks | Kill the Chandler. First Legendary |
| A Mother's Mercy | Broken Nave: find Aurel pinned under rubble, kill Abbess Vane. **The Fifth Toll.** Act card |
| Arrears | Follow the Abbess's ledger to the Saltmere |
| The Salt Ledger | Recover 3 Ledger Pages from wrecks. They show your names are missing from every book |
| Foreclosure | Counting-House: kill the Margrave. His ledger shows the Bell was **bought from above**. **The Sixth Toll.** |
| Matins | Climb the Hour Spire as the Choir descends |
| The Cracked Voice | Aurel turns on you: "I cast it down. It was mercy." Kill him |
| The Final Hymn | Kill the Precentor. Ilse, deaf, climbs and stills the Bell with her hands. Dawn. End scene, credits, unlocks The Hours and Penance |

**Follower:** Brother Cuthbert, cheerful flagellant, melee and small heals, runs on the bot AI, comic barks. In co-op he "goes to pray".

### 10.3 Difficulty

| Name | Monster HP | Monster damage | XP / Gold / Legendary chance | Unlock |
|---|---|---|---|---|
| Pilgrim | ×1 | ×1 | ×1 | start |
| Zealot | ×1.6 | ×1.3 | ×1.25 | start |
| Martyr | ×2.6 | ×1.7 | ×1.6 | start |
| Penance I | ×4.2 | ×2.2 | ×2 | Act I done |
| Penance II | ×6.8 | ×2.9 | ×2.6 | campaign done |
| Penance III | ×11 | ×3.8 | ×3.4 | campaign done |

### 10.4 The Hours (endgame)

- **Open Hour:** seeded 2-floor run through any kit. Kills fill the **Toll Meter**. At full, the Bell tolls and an Hour-Warden appears. Rewards: Bell Shards, guaranteed Exalted, chance of Legendary and a Vigil Candle. Screen-edge meter shaped like a bell.
- **Vigil Trial:** spend a Vigil Candle, pick Tier 1–20 (HP ×1.17 and damage ×1.1 per tier), 7-minute timer. Beat it to level your gems and record Best Tier in the Journal. Same systems, more pressure.

### 10.5 Modes at a glance

Campaign, The Hours, Couch and Online Party on its own (§18.8–9), Hub round "The Last Toll" (§18), Attract (§16), Dev (§17).

**Feats:** write about 12 (beat the Chandler without touching burning wax, kill a Tithe Imp, fill a 50-voice CARNAGE, raise a full choir). A toast when earned, listed in the Journal.

### 10.6 Pacing: when the player meets each feature

The demo is long enough to show everything, and each new thing arrives on its own. Check this schedule against bot and human runs. Times are for a first run on Pilgrim.

| Minutes | Where | The player meets |
|---|---|---|
| 0–1 | Opening | Cinematic, then straight into moving, Slot 1, ragdolls, ink spatter |
| 1–3 | Gibbet Road | Loot, gold, Heartsparks, potion, breakables, CARNAGE, first Blessed item, the Wheel, level-up, second skill |
| 3–5 | Tallowgate | Dialogue, Journal, map, Stash, Gaspard, Hesper's salvage, Vesper Shrine |
| 5–12 | Wickfield | Lantern Vigil, first Champion pack and vow, Tithe Imp, a Saint's shrine, the Psalter and Glyphs, first Margin Page |
| 12–15 | Sexton's Barrow (optional) | Mimic, Cursed Reliquary |
| 15–24 | Undercroft | Traps, falling chandelier, Exalted pack, rescue, follower, Homeward Candle, first passive |
| 24–27 | Rendering Hall | First boss, first Legendary, Nan Tallow's Reliquary |
| 27–31 | Broken Nave | Mourning Veil, Act card, then crafting, enchanting and gems in town |
| 31–45 | Act II | New enemy family, Set items, changing difficulty, the Margrave |
| 45–58 | Act III | The Choir, Aurel, the Precentor, the ending, credits |
| After | Anywhere | The Hours, Vigil Trial, Penance, Devotion, a Final Hour hero |

---

## 11. Story bible

**World:** the Vespermark, a dying march-land of salt mines and abbeys. **The Choir Immaculate:** faceless bell-headed host who sang the world and can sing it out. They call mortals a wrong note. **The Under-Court:** devil aristocracy of debts and tithes, rotting finery, everything in ledgers. **The Unsung:** a few mortals written in neither the Hymn nor the Ledger, which is why both can be killed by them. **The Black Bell:** cast from a stolen voice. Seven tolls and the sun forgets the way. It has rung three when the game begins.

**Tone rules.** Grand, doom-laden, fully sincere on the surface. Short sentences carry dread, and long ones carry scholarship. Villains speak to the hero personally and gloat across whole levels. Scholars digress. Merchants cheat. Soldiers die bravely and stupidly. No modern slang, no irony aimed at the genre. Humour is gallows humour from Gaspard, Cuthbert, Odalys and the Tithe Imp only. Every line fits on two lines of 10-foot subtitle. All voices are gibberish (§14.3) with subtitles always on.

**Cast:**
- **Archivist Odalys Wren:** ancient, half-blind, sardonic keeper of the burned scriptorium. Narrator. "Mind the margins, child. That is where the truth is kept."
- **Hesper Kell:** widowed smith. "Hammer's the only prayer I've ever seen answered."
- **Nan Tallow:** wax-witch in a wagon. "Everything melts, dearie. The question is what it sets into."
- **Gaspard Nill:** fence. "Lightly haunted. That's a discount, not a defect."
- **Brother Cuthbert:** "Praise be! Another wound!" / "I have taken a vow of silence, but only on Thursdays." / "Do you suppose it's Thursday?"
- **Ilse of the Ninth Bell:** young deaf bell-ringer, immune to the toll, feels it in her teeth. Signs, shown in italics with no voice: *"Four. I felt it in my teeth. There are three left."*
- **Cantor Aurel:** fallen seraph with a cracked bell for a head, speaks in broken rings. "...the Hymn... has no verse... for you."

**Opening (Odalys, over ink-and-woodcut panels, skippable):**
> They say the sky was clear the night the Bell came down.
> It fell without a sound, which is the worst thing a bell can do.
> It struck the Abbey of Saint Oren and split the hill to the root, and there it hung, black and mouth-down, ringing nothing, until the first of the dead sat up in their graves and asked the hour.
> Three tolls it has rung. The first took our sleep. The second took our saints. The third took the morning, and we have burned candles ever since.
> Seven, says the old psalter. Seven tolls, and the sun forgets the way.
> I have read every book that did not burn. No one is coming. No host, no choir, no one.
> But you are not in the books, stranger. I checked.

**Act cards:** *VESPERS: The Fourth Toll* / *COMPLINE: The Fifth Toll* / *MATINS: The Sixth Toll*.

**Key scenes:**
- *Odalys, first meeting:* "Sit. Stay. Let an old woman be right about something for once." / "Your name. I have looked. It is not in the Hymn. It is not in the Ledger. Do you know how hard it is to be overlooked by both?"
- *Abbess, over the Undercroft:* "I buried four hundred children of this parish, hero. I have merely asked for them back."
- *Abbess, after the Chandler:* "You killed my chandler. Who will keep the dark away now?"
- *Aurel found:* "...not... the Court's... bell..." *Ilse signs: He says it is not theirs. He says it was never theirs.*
- *Margrave, over the Saltmere:* "A notice has been served. You will find it... in your ribs."
- *After the Margrave, Odalys reads:* "Paid in full. One bell. Received from... Above." She closes the book. "Well. That is the last of my good moods."
- *Aurel turns:* "I cast it down. It was mercy. One note, and no more wrong ones."
- *Precentor:* "You are a wrong note. I do not hate a wrong note. I correct it."
- *End, Odalys, over dawn:* "She could not hear it. That is the whole of the miracle. She put her hands on the Bell and held it, the way you hold a child who will not stop crying. And the morning came up, late and embarrassed. Somewhere below, a ledger has opened to a fresh page. Mind the margins."

**Margin Pages (lore, read aloud in play, one found per zone or so):**
1. *Psalter of the Seven Tolls.* "The first toll shall take sleep, and the second the saints, and the third the morning. Of the fourth the page is burned. The scribe has written beside it, in a small and careful hand: do not."
2. *The Sexton's Daybook.* "Dug four. Filled none. They were gone by morning, and the earth was pushed up from beneath. Wife says I should ask for more wages."
3. *Field Notes on the Wick-Dead.* "They do not hunger. They are not angry. They walk toward light, and they are very sorry. I would feel better if they were not sorry."
4. *A Chandler's Wife, to Her Sister.* "He has found work again, which is a blessing. He comes home so cheerful. I wish he would wash."
5. *Abbess Vane, Private Devotions.* "I asked and the Choir did not answer. I asked and the Court replied by return of post, with terms."
6. *Bill of Sale, Saltmere.* "One village, entire, with its souls. Warranted free of prior claims. Buyer to collect."
7. *On the Bailiffs.* "They will not be bribed, reasoned with or outrun. They will, however, accept a receipt."
8. *The Ledger of Arrears, Page One.* "Every soul has a column. I have been through the columns. There are some that cannot be found, and I want it known that this is not an accounting error."
9. *On the Unsung.* "Neither hymned nor billed. The old word for them was 'nobody'. I find I like them better than the somebodies."
10. *Hymn Fragment, in Cracked Script.* "And when the note is wrong you do not curse the note. You lift your hand. You lift your hand."
11. *Hesper Kell's Tally.* "Fourteen swords mended. Nine owners came back. I keep the rest by the door."
12. *Odalys, in the Margin of Everything.* "I have read that the world will end in fire, in water, in silence. No one has written what we are to do on the Tuesday before."

**Barks.** Write 4–6 per class per trigger: level up, low health, Legendary, big kill, idle, resource empty. Sample:
- Penitent: "More." / "I have earned this." / "Not enough. Never enough."
- Anchorite: "I was walled up for less." / "Burn it. Burn it all, and light the way."
- Gravecaller: "Sing, you lazy dead." / "Dig deeper." / "A fine voice. Shame about the rest of him."
- Nightwarden: "Long road. Short fuse." / "That one owed money." / "Light's holding. Barely."

Tithe Imp: "Arrears! Arrears!" / "Not the purse!" / "You'll get a letter about this!" Margrave idle over a zone: "Interest accrues." Bell: every 3–5 minutes a low toll rolls across the map, dust falls, candles gutter, enemies flinch and then speed up for 5 s.

---

## 12. Art direction: "Inked Reliquary"

**Base:** three.js's own node materials and procedural geometry. Everything is built in code from `RoundedBoxGeometry`, `LatheGeometry`, `ExtrudeGeometry`, `TubeGeometry`, `ConvexGeometry`, merged with `mergeGeometries`. No model or texture files. Addon geometry and helpers are the "engine's asset library". Textures, if any, are generated in code. Use `mx_noise_float` in TSL for stone, wax and rot.

**The look:** a woodcut in a burnt psalter that has started to move, and not the source's painted look. Black ink lines on everything, 3–4 flat colour bands, hatching in the dark bands, pools of warm candlelight in deep darkness, bold red ink for blood. Light is scarce and precious, so every candle matters. Use as many lights, shadows, particles and enemies as a scene wants (TASK.md: the performance budget is unlimited, and FPS targets and optimization are out of scope). Build crowds and effects boldly, and do not spend effort on LOD or culling. The render governor in §18.6 is not an FPS target: it only keeps the hub protocol responsive on software rendering.

### 12.1 Ink filter (recipe in Appendix A, verified on both backends)

`PostProcessing` chain with a `pass()` writing colour and view normals (MRT). Then:
- Ink edges from view-depth and normal differences.
- Line boil: UV jitter from noise stepped at 8 fps, so lines feel hand-drawn.
- Hatching in the two darkest bands, computed in **world space** by reconstructing position from depth, so it stays glued to the world as the camera scrolls.
- Paper grain and vignette.
- Bloom for flames and magic.
- A per-zone colour grade (shadow tint and highlight tint uniforms).
Settings has Ink Strength. Dev can toggle each stage.

### 12.2 Palettes (per zone grade)

| Zone | Shadows | Light | Accent |
|---|---|---|---|
| Tallowgate | Soot blue-black | Tallow gold | Dried-blood red |
| Wickfield, Gibbet Road | Bruise violet | Ember orange on ash wheat | Rust |
| Undercroft, Nave, Barrow | Cold black-green | Candle yellow | Verdigris |
| Rendering Hall | Oil brown-black | Molten orange | Fat white |
| Saltmere | Slate teal | Sick moon white | Salt cyan |
| Counting-House | Oxblood black | Coin gold | Ledger green |
| Hour Spire, Belfry | Night indigo | Bone-white, stained-glass flares | Hymn gold |

### 12.3 Characters

Rigs are real `THREE.Bone` hierarchies with a single `SkinnedMesh` per figure, built from merged rigid parts weighted to their bones (verified, Appendix A), plus attachable rigid meshes on sockets for weapons, helms, shoulders. Each figure gets its own material for flash, tint and dissolve uniforms (0 extra pipelines, verified).

- **Rigs:** `biped` (hips, spine, chest, neck, head, shoulder/arm/forearm/hand ×2, thigh/shin/foot ×2, cape ×2, sockets), `hulk` (biped proportions), `smallBiped`, `quad`, `crawler`, `flyer`. Bosses compose or extend these.
- **Silhouette first:** every figure must read as a shape at 10 feet.
  - Penitent: huge iron cage over the head, massive shoulders, long maul.
  - Anchorite: bell-shaped robe, ring of lit candles for a crown.
  - Gravecaller: hunched, deep hood, tall spade with hanging lantern, tattered choir robe.
  - Nightwarden: wide hat, flaring long coat, crossbow, glowing hip lantern.
- Each hero has a seat-coloured soft ring on the ground. Rim light via `emissiveNode` separates them from the floor.
- **Gear shows:** at least 3 helms, 3 shoulders and 4 weapon shapes per class. Rarity adds gold trim, Legendary adds glow or flames. Chest rarity tints the torso.
- Enemies get palette and part variation so a crowd is not clones.

### 12.4 Kits (code-built props; merge static ones by material)

- **Interior:** flagstone, wall, arch, pillar, door, stairs, altar, pew, coffin, urn, candelabra, chandelier, chained censer, gate, skull niche, rubble, banner, font.
- **Exterior:** ash ground with road decals, cliff, dead tree, gibbet, lantern post, wagon, fence, hedge, grave, scarecrow, wheat clumps.
- **Saltmere:** boardwalk, pier, stilt hut, reeds, black water (TSL ripple plane).
- **Counting-House:** ledger stacks, coin piles, vault doors, scales.
- **Spire:** floating slabs, giant gears and clock dials, stained-glass shards, night sky with a dead moon.
- **Town:** timber buildings, forge, wagon, stall, tents, wall of hundreds of candles.
- **Below-world:** dark drop-offs so level edges fade into ink.

### 12.5 Physics spectacle (`fxWorld`, Rapier)

Ragdolls (7 bodies, spherical joints) on big kills, simple dissolve on small ones. Limb gibs on overkill. Everything breakable shatters into debris with restitution and sound on contact: pews, urns, coffins, doors, barrels, fences. Falling chandeliers, tipping vats, Falling Lamp, collapsing walls, coin fountains, loot arcs. Corpses stay as Gravecaller fuel, then dissolve into ink. Keep them all on screen as long as they look good.

### 12.6 VFX

Instanced quads (not `Points`) in a few pre-made batches. Fire (TSL noise), wax drips, holy lines of glowing script, shadow smoke, bone shards, expanding bell-ring ink circles. Persistent ink-spatter decals on floors (instanced quads, thousands). Ground telegraphs are bright, outlined, with a fill that shows time to impact. Damage numbers in DOM or instanced quads, large, crits larger, off via a setting. Light pool: 32 point lights at fixed count, assigned each frame to the candles and effects nearest the camera target, intensity 0 when unused (§3.3), plus a moon directional with a 4096 shadow map and a hero-lantern spot with shadow, decided at load.

### 12.7 Cinematics

Real-time dioramas, not video: a few silhouetted figures and kit props against a flat lit backdrop, with a slow camera push, all through the ink filter so they read as moving woodcuts. Voiced with subtitles, skippable by holding ✕, Enter or a click. Needed: the opening (§11), three act cards with short scenes, the end scene over dawn, then rolling credits.

---

## 13. Animation

Use the engine's own system: `AnimationMixer`, `AnimationClip`, `QuaternionKeyframeTrack`, `crossFadeTo`, `LoopOnce`, and additive clips via `AnimationUtils.makeClipAdditive` for flinches.

Author clips in code with a small pose DSL:

```js
pose('wind', { armR:[-2.2,0,.4], forearmR:[-.8,0,0], chest:[0,.6,0] });
clip('slash', 0.45, [[0,'idle'],[.12,'wind','out'],[.2,'strike','in'],[.45,'idle']], { hit:.2 });
```

Poses are joint Euler angles. The compiler outputs one quaternion track per joint. `hit:` marks the frame where the sim's damage lands, and the sim's attack-speed value sets `timeScale`.

**Required clips.**
- **Heroes:** idle, combat idle, run (speed-matched timeScale), evade roll, flinch (additive), death, revive, slash ×3 (combo), overhead slam, leap, spin, throw, cast one-hand, cast two-hand, channel, shoot, reload, plant trap, kneel, talk.
- **Class flourishes:** Penitent flail whirl; Anchorite raises candle; Gravecaller conducts the choir like a choirmaster (signature); Nightwarden vault flip.
- **Monsters per rig:** idle, walk, run, attack ×2, hit react, death, special.
- **Bosses:** intro, each attack's windup and strike, phase change, death.

**Feel:** snappy anticipation, heavy follow-through, overshoot. Coats, capes and censers lag with 2-bone spring secondary motion. Hit-stop freezes the mixer of the struck figure and the striker's arm, never the movement of the hero.

---

## 14. Audio

Everything is synthesized in Web Audio. **No audio files.** Buses: Master → Music (**default 0.10, shown as 10%**), SFX, Voice, each with a Settings slider and a Reset to Defaults that restores 10%. Shared `ConvolverNode` with a generated 3.5 s cathedral impulse (decaying noise). Duck music slightly under Voice. Start `AudioContext` on first input. Stop everything on hub `end`. The hub's server copy creates no audio.

### 14.1 SFX (`src/audio/sfx.js`, patches in data)

Bake each patch once to an `AudioBuffer` with `OfflineAudioContext`, then play with pitch and gain variation, panned and attenuated by world position. About 70 patches: footsteps by floor (stone, ash, boardwalk), swings, flesh and bone hits, crit crack, glass and wood shatter, iron clank, fire, wax sizzle, holy tone, shadow whoosh, gold clink (FM), per-slot item landings, Legendary drop (deep bell + choir swell), level-up (organ chord), potion, resource empty, UI move and confirm, monster groans and attacks per family (formant-filtered noise), the Bell toll (inharmonic FM partials with a long tail, very low, felt more than heard).

### 14.2 Music (`src/audio/music.js`, cues in data)

Generative and scheduled by lookahead on the audio clock. Original themes in Aeolian and Phrygian minor. Build these instruments: pipe organ (additive), male choir (saw stacks through vowel formant filters), low strings (detuned saws), timpani and tom (pitched noise), tubular bells (FM), plucked lute (Karplus-Strong).

| Cue | Character |
|---|---|
| Title: "The Last Hour" | Slow organ, choir, single bell on the downbeat. Contains a four-note motif that recurs everywhere (Aurel sings it) |
| Tallowgate | Solo lute and sparse pad, sad, gentle, its own melody |
| Exploration ×3 (Act I, II, III) | Low drones, distant motif, room to breathe |
| Combat layers | Strings ostinato and percussion that rise and fall with a danger value (nearby enemy threat) |
| Boss ×3 | Driving timpani, full choir. The Precentor's cue exposes its beat to the sim so note-bombs land on it |
| Stings | Victory, death, Legendary, Act card |

**The Gravecaller's living choir:** each Chorister raised adds one voice to the current cue's choir, and Requiem swells it all. Expose the beat clock (`music.nextBeatTime()`) to the view for sync. In the sim, the Precentor's beat is derived from its own timer, so server and tests need no audio.

### 14.3 Voices

Animalese/Simlish gibberish, generated per line. Each syllable from the text selects a formant pair (vowel) and a short noise burst (consonant) on a glottal saw, with pitch contour (rising on `?`, falling on `.`). Character profile: `{pitch, range, rate, formantShift, rasp, ring, chorus}`. Odalys old and creaky. Hesper low and flat. Nan warbling. Gaspard fast and nasal. Cuthbert bright. Abbess soft with chorus. Chandler huge and ragged. Margrave slow, pitched-down, ring-modulated. Precentor many stacked notes. Aurel broken syllables with a bell partial. Subtitles reveal in sync with syllables.

### 14.4 Sound checks (no one can listen here)

Render patches with `OfflineAudioContext` and assert peak and RMS are in range. Read `AnalyserNode` levels per bus during play. Assert `settings.music === 0.10` on a fresh save and that the Music bus gain equals it.

---

## 15. UI and UX: 10-foot, controller first

**Rules.**
- DOM + CSS, sized from viewport height (`1rem` = 20 px at 1080p), so everything scales with the TV.
- Minimum text 28 px at 1080p, body 32 px, 5% safe-area margin.
- One focus at a time with a heavy gold focus ring.
- **At most one item card plus one comparison card on screen, each ≤ 7 lines.** No tables of numbers, no scrolling walls, no small icons without labels. Details are one △ press away.
- Anything a screen shows must be usable with pad only, keyboard only, and mouse only (tested).
- Parchment, iron and wax textures generated with CSS gradients and SVG filters. Uncial for titles, Alegreya for everything else.
- Player names only through `textContent`.

**Focus engine (`src/ui/focus.js`).** One system for all screens: directional spatial navigation with explicit overrides, key repeat (300 ms then 120 ms), hover moves focus, click confirms. Screen stack with `push/pop`, each screen declaring its prompts, which render in a bottom bar through `Glyph`.

**Screens.**

| Screen | Shape |
|---|---|
| Title | 3D Bell swinging in ink smoke, title, one prompt. 10 s idle → attract. Touch-only variant below |
| Main Menu | Continue, New Hero, The Hours, Party, Settings, About/Credits. Large vertical list |
| Hero Select / Create | 3D line-up, §7. Save slots |
| HUD | See below |
| Pause | Resume, Wheel, Psalter, Journal, Settings, **Dev Mode**, About/Credits, Save & Quit |
| The Wheel (inventory) | The world camera dollies in on the hero and the world dims (no second renderer). **Twelve slots around a clock face.** Pick a slot with stick or hover: the matching items appear as a short list (5 big rows). Card plus comparison card with big ▲▼ differences. ✕ equip, □ mark or salvage. L1/R1 flip to Backpack (10×4 big cells) |
| The Psalter (skills) | Six slots across the bottom. Pick a slot, a carousel of skills, one sentence each. Below: 3 Glyph choices. R1: Passives page |
| Journal: "The Margin" | Tabs: Quests, Lore (replay reading), Feats, Records. One entry at a time |
| Map | Ink-drawn map fills the screen with objective arrow. Also a corner minimap in the HUD |
| Vendors | One purpose per screen (Salvage, Craft, Enchant, Reliquary, Gems, Buy, Sell, Gamble, Stash). Short big lists with a card |
| Dialogue | World camera dollies in, letterbox, name plate, two big lines, ✕ to advance, big topic list |
| Margin Page | Corner page plate, narrated, play continues |
| Zone veil | Ink wash, a line from the Margin Pages, a guttering candle, while the next zone builds |
| Death | "You have fallen." Two big choices |
| Act / Boss title cards | Uncial on black ink wash |
| Settings | Tabs: Video (fullscreen, render scale, ink strength, shake, flash reduction), Audio (Master, Music, SFX, Voice), Controls (Glyphs PlayStation/Xbox, rumble, aim assist, WASD, reference picture of pad and keys), Accessibility (text size, damage numbers, rarity icons, hold/toggle). Reset to Defaults on each tab |
| Dev Mode | §17 |
| About/Credits | Paged, §21 |
| Party | §18.8–9 |
| Touch-only | Text **"Controller or keyboard required"** and a **Settings** button that works by tap. No touch controls anywhere else. The attract mode keeps running behind it (§16). Dismissed as soon as a gamepad connects or a key is pressed |

**HUD (one layout for all devices):**
- Bottom centre: six slots with big icons, cooldown wipes and swapping glyphs.
- Flanked by two hanging glass reliquaries in iron cages, Life and Resource, with liquid that sloshes (not round globes).
- Thin XP line above. Potion beside Life.
- Top centre: boss or elite bar with name and vows.
- Top right: minimap and one line of objective.
- Top left: party frames in seat colours.
- Right side: big loot toasts.
- Centre top on trigger: CARNAGE ×N.

**Icons.** Generate all skill and item icons in code as bold ink sigils (SVG paths or Canvas2D), rarity frame around them.

**Say what can't be done.** A locked skill shows its unlock level, a barred door says why, an empty resource sounds and flashes, and an unusable item says so. The player should always understand what they can and cannot do. Settings ▸ Controls has a reference picture of the pad and keys.

**Teach by doing.** On the Gibbet Road, non-modal prompts appear exactly when needed, using current-device glyphs: move, attack, pick up, potion, second skill, open the Wheel, then fade forever.

---

## 16. Attract mode

**Trigger:** 10 s with no input on the title or any main-menu screen (reset by any key, mouse movement, click, pad button, stick past deadzone, or touch). Never in a hub session.

**Exit:** any input stops it at once and returns to where it started, and that input does nothing else. Touch-only devices let it run, and a tap returns to the "Controller or keyboard required" screen, whose idle timer restarts it.

**What it is:** a real sim with a separate world, never touching saves, driven by `src/modes/attract.js` and the bot (§19.3). It cheats freely: infinite life, resources and no cooldowns, no clip, teleports, spawns, forced drops. Its only job is to show as much of the demo as possible, and it plays no part in balance. It loops a tour of short reels, cutting with an ink wipe, with an Uncial caption, a "DEMO" mark and a pulsing "Press Any Button" (glyph-aware):

1. Penitent on the Gibbet Road: skills, ragdolls, CARNAGE.
2. Anchorite in the Undercroft: chandelier, breakables, Falling Lamp, an Exalted pack with vows.
3. Legendary drop, then the Wheel shown for a few seconds.
4. The Chandler fight at speed through his phases.
5. Gravecaller in the Saltmere: full choir, Requiem, Tithe Imp fountain.
6. Tallowgate walkthrough: each NPC with a one-line voiced caption, forge and Reliquary shown.
7. Nightwarden in the Spire: turrets, traps, Hour of the Wolf.
8. The Precentor's Stave and Silence.
9. An Open Hour with Toll Meter filling and Warden.
10. Four heroes together, one of each class. Title card. Loop.

Sound plays if the browser allows it, at normal settings. Target length 3–4 minutes. Tests assert every reel flag is reached.

---

## 17. Dev mode

Reachable from the Pause menu, hidden in hub sessions. Controller-friendly: large rows, ← → adjust, L1/R1 change tab, △ reset row, □ reset all. Tabs:

- **Balance (live sliders, reset to defaults, applied immediately):** Player Damage, Player Life, Monster HP, Monster Damage, Monster Speed, Spawn Density, Elite Chance, XP Rate, Gold Rate, Drop Rate, Legendary Chance, Heartspark Chance, Potion Cooldown, Resource Regen, Cooldown Scale, Hero Move Speed, Crit Bonus, Knockback Force, Hit-Stop, Aim Assist. Each shows its default. When anything differs from default, the HUD shows a small "TUNED" mark. Export/Import tuning as JSON (clipboard).
- **Cheats:** God mode, One-hit kills, No costs, No cooldowns, Infinite potions, No clip, Invisible to monsters, Reveal map.
- **Spawn:** any monster with count and vows, any boss, Tithe Imp, any item by slot and rarity, any Legendary or set piece, gold, materials, gems.
- **Travel:** any zone, any quest step, next door, skip to boss, end act. Regenerate level with a new or chosen seed (shows seed).
- **Hero:** set level, grant XP, unlock all skills and Glyphs, respec, heal, kill self.
- **World:** time scale 0.1–4×, freeze AI, force toll, trigger any event or line of dialogue.
- **View:** nav grid, colliders, aggro and attack ranges, hit shapes, spawn markers, FPS and draw calls, backend name, toggles for ink, hatch, bloom and grade.

---

## 18. Multiplayer

### 18.1 Hub rules and boot order

Follow the AI Hub library at `https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub`, the Session Protocol v1 (`https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md`). Read it. Download `session.js`, `harness.html`, `bridge.js`, `round.js` into `vendor/hub/`. Client version verified here: 1.4.0.

**Mode: `shared-world`.** The host's copy runs the world. Every copy moves its own player at once.

Head tags (build fills in the title):
```html
<meta charset="utf-8">
<script>/* session.js pasted verbatim */</script>
<title>TITLE — TAGLINE</title>
<meta name="description" content="...">
<meta name="theme-color" content="#14100c">
<link rel="icon" href="data:image/svg+xml,...">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
<meta name="hub:source" content="Diablo 3">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="10">
<meta name="hub:session-goal" content="Reach the Bell and slay the Abbess before the seventh toll">
<meta name="hub:session-howto" content="Move: stick or click · Skills: face buttons, R1, R2 or 1-4 · Potion: L1 or Q">
```
Do not add `hub:webgpu required`, because the game runs on the WebGL2 fallback. Goal stays ≤ 60 characters, howto ≤ 80.

**Boot (`src/main.js`), in this order:**
1. `const info = await AIHub.connect({mode:'shared-world', seats:[1,4], card:true})` as the first statement. `null` → normal game (title, attract, saves).
2. In a session: init Rapier, build the sim world from `AIHub.rng('world')`, call `AIHub.ready()` at once. **Never** wait for the renderer.
3. Show the DOM card. Build the view in slices of at most about 50 ms with `await` yields so messages keep flowing. If `info.server`: no renderer, no audio, no input, no camera at all.
4. Play starts when `AIHub.time() >= 0`. Show 3-2-1 with bell strokes during the countdown.

No title, menus, dialogs, `alert`, new tabs, or navigation in a session. No sockets, `RTCPeerConnection`, `EventSource` or external fetch in a session (the hub wraps these and reports them). No chat, emotes, pings or custom names. Hide Dev Mode, Save & Quit and Party in a session. Options opens a non-pausing overlay with Settings and About/Credits only. In a session the world never pauses.

### 18.2 The card (the game's own)

Connect with `card:true`. DOM parchment over the live scene (heroes lining up, once the view is ready): game name, players in their colours with ready marks, the goal, this player's controls for their device, time left from the `card` event, and two answers. **Ready:** Enter, Cross, or tap → `AIHub.answer('ready')`. **More time:** Triangle, or tap, or a key it names → `AIHub.answer('more')`. Listen on `window` (the harness dispatches synthetic `keydown` Enter). No menus or settings on the card. Handle `paused`, `starting` and `asked` from the event. Verified: harness check "its own card: Enter answers Ready" passes this way.

### 18.3 The round: "The Last Toll"

Seven bell tolls, one every `min(85 s, (info.limitMs − 30 s)/7)`. At the seventh the world ends.

| Stage | Content | Time |
|---|---|---|
| Bell Yard | Exterior chunk, waves, light 3 Lantern Posts together | ~1.5 min |
| Undercroft | 6–8 rooms, elite pack, breakables, a guaranteed Tithe Imp, a shrine | ~2.5 min |
| Rendering Hall | The Chandler | ~2 min |
| Broken Nave | Abbess Vane (kill = win) | ~2.5 min |

Tune so a competent party wins in about 8–9 minutes, leaving the seventh toll a real threat.

- **Heroes by seat:** a shuffled class order from `AIHub.rng('classes')`, all copies agree. Level 15, the Session loadout (§7), a preset Exalted kit and passives. Fresh every round (nothing saved carries, the client gives empty storage).
- Personal loot, levels and all menus work without pausing.
- **Down:** ally revive, or auto-rise at the last door after 10 s. If everyone is down at once, all rise at the door and the next toll comes early.
- **Touch-only seat:** shows "Controller or keyboard required", and its hero follows the party on the bot AI.

**Ending.** The host calls `AIHub.finish({standings, scores, won, stats, awards})` exactly once on: Abbess dead (`won:true`), seventh toll (`won:false`), or `time-up` at once (`won:false`). Standings by score = damage/1000 + kills + 150×revives − 50×downs + 300 for the killing blow, grouped for ties, listing every present player (`AIHub.players` is current). Stats (≤ 6, name ≤ 16 chars): Kills, Damage, Downs, Revives, Gold, Legendaries. Awards (≤ 3 per player, title ≤ 24, detail ≤ 40): Bell-Breaker, Good Samaritan, Candle Snuffer. Send a last reliable snapshot with `over:1` so every copy shows the same end. On `end`: stop input, sim, sound and drawing, show a one-line "The hour passes." The hub covers the rest. Handle every `reason`.

**Leaving.** `leave`: remove that hero in a puff of ink, rescale monster HP. Host gone: the hub voids, just wait for `end`.

### 18.4 Wire protocol (`src/net/protocol.js`)

Limits: 20 messages/s per copy, burst 40, 16 KB per message, unreliable over ~1,200 bytes fragments and is lost whole. All sends go through **one outbox** with its own token bucket at **18/s, burst 30**, batches split below 12 KB. Going over prints `[AIHub]` warnings, which fail the hub's check.

| Msg | Direction | Rate | Channel | Content |
|---|---|---|---|---|
| `me` | client → host | 10 Hz | unreliable | `at`, position, facing, moving, channel state |
| `do` | client → host | ≤ 6/s, coalesced | reliable | Casts with aim, interactions, equip, skill changes |
| `s` | host → all | 10 Hz | unreliable, ≤ 1,100 bytes | `at`, heroes, then flat int array of nearby actors `[id,x10,z10,hp%,state]`, closest first, far ones on a rotating window |
| `ev` | host → all | ≤ 7/s, coalesced | reliable | Spawns, deaths, hits (batched), telegraphs, quest, say, toll, breaks, stage changes |
| `drop` | host → one (`to`) | as needed | reliable | Personal loot |

Clients: own hero runs fully locally with the same `simWorld` static map and character controller (instant response), skills play animation and VFX immediately, and the host resolves damage. Others interpolate 200 ms behind, extrapolating up to 300 ms. Ignore older snapshots by `at`. Clamp reported positions to the map, reject non-finite values. Host decides monster attacks and tells the client it was hit. Smooth beats strict, friends do not cheat each other.

**Protocol-required traffic:** every player copy sends `me` even when idle, and the host sends `s` even with nothing to report, so "traffic flows both ways" is always true.

### 18.5 RNG

`AIHub.rng(label)` for anything all copies must agree on (world, classes). The host alone uses `rng('loot')`, `rng('ai')`, etc., for its authoritative rolls. `Math.random` is not seeded in shared-world and must not touch the sim.

### 18.6 Render governor

In a session, if a frame took over 100 ms, skip rendering for twice that long (sim and messages keep running). Verified shape: passes 4-player harness runs on software WebGL. Solo and standalone play have no governor.

### 18.7 If graphics fail

Non-host copy: `AIHub.fail('no WebGPU or WebGL here')`. Host copy: show a notice and keep running the sim for the others.

### 18.8 On its own: couch co-op (up to 4 on one screen)

Press ✕ on an unassigned pad at any time to join: quick class carousel, uses that player's saved hero or a level-matched temporary hero. Keyboard + mouse may be one of the players. One shared camera frames everyone, and a player left far behind warps in after 2 s. HUD: compact personal HUD in each player's corner, in seat colours (`#e8443a`, `#3b82f6`, `#22c55e`, `#f5b700`). Menus: one player at a time owns a full-screen menu tinted in their colour, only their device drives it, and the game pauses during it unless remote players are present. Couch and online are not mixed: online is one player per copy.

### 18.9 On its own: online party with invite codes (never in a session)

The Party screen offers **Couch**, **Host**, **Join**. Verified recipe in Appendix A.
- **Host:** creates a WebRTC offer with full ICE gathering (STUN `stun:stun.l.google.com:19302`, 3 s cap), shows the code big with Copy (clipboard works on `file://`). The friend answers with a code, Host pastes it (button pastes from clipboard, Ctrl+V works too).
- **Join:** the mirror image.
- Star topology, up to 3 guests, one code per guest. `src/net/peerNet.js` exposes the same interface as `hubNet.js` (`send`, `on`, `time`, `rng`, players, leave), so **all game code is identical**. The host's campaign runs and guests bring their saved hero. Loot saves to the guest's own save. Drop-in sends a full world snapshot in chunks. If no path after 20 s, say so plainly ("No path between you. Try another network."). Nothing is contacted until the player chooses Host or Join.

---

## 19. Testing

### 19.1 One command

`node tools/test.mjs` runs everything and prints **only failures and one final count line** (`PASS 412  FAIL 0  SKIP 3`). Suites: `data`, `sim`, `browser`, `hub`. `node tools/test.mjs sim` runs one. It stores a hash of each suite's source inputs and skips unchanged suites, so you rerun only what your change covers. Prefer `file://` and headless scripts. three.js has no headless tool of its own, so the Node sim and Playwright fill that role. Browser tests can use the system Python's Playwright, or `npm install playwright@1.63.0` in your folder. Keep one or two browsers open at a time and close them. Keep every file inside your own folder, not `/tmp`, and do not read files outside it that you do not need, because other agents work in the folders beside yours. Do not run `playwright install`. Start servers yourself on an OS-picked port bound to 127.0.0.1 with `python3 -u -m http.server 0 --bind 127.0.0.1`, confirm the page is your game before trusting a result, and stop only the processes you started, by PID (never `pkill`, `killall`, `fuser -k`, or killing whatever holds a port). The system Python has Playwright and nothing else, so for Pillow or numpy use `uv run --with pillow python script.py`, adding `--with playwright==1.63.0` when the script drives a browser. Other agents share this machine, and "Target closed" or "page crashed" means memory ran out, so run fewer browsers rather than retrying. Do not use subagents or workflows to debate, review, judge or audit.

### 19.2 Test API

`window.__game` exposes `state()`, `step(ticks)`, `intent(player, intent)`, `press(action)`, `ui()` (screen id, focused id, prompts shown), `goto(zone)`, `dev(cmd)`, `seed(n)`. URL params: `?seed=`, `?backend=webgl2`, `?norender=1`. In browser tests, always wait on state, never on frames.

### 19.3 The bot

`src/sim/bot.js` plays the game through intents: follows the objective arrow, fights, uses every skill in slots, picks up and equips upgrades, uses potions and shrines, spends skill points, talks, walks into doors. The same bot powers tests, the attract mode, Cuthbert and idle hub seats. Build it early.

### 19.4 What to test

**data:** every table validates, all references resolve, no `TODO`, `FIXME`, `stub` or `placeholder` in `src/`, no `Math.random` in `src/sim`, none of the proper names from §2 anywhere in `src/` other than the allowed fields.

**sim (Node, fast):** damage, mitigation and XP formulas. Status rules. Every skill and every Glyph fires and has a visible event. Every monster spawns, attacks, dies. Every vow. Every boss through every phase. Loot rolls, every Legendary's power event. Salvage, craft, enchant, Reliquary, gems. Saves round-trip and migrate. `levelgen` connected across 200 seeds per kit. **Full campaign bot run for each class** with real balance on Pilgrim, reporting pacing against §6 targets (fail outside the ranges). An Open Hour and a Vigil Trial. **Fake-network co-op:** two to four sim copies through a simulated 150 ± 50 ms, 5% loss link, assert no budget overruns, identical quest state, hero positions converge, and every message under limits.

**browser (Playwright, `file://`, flags from §3.2, assert backend):**
- Boot with no console errors, WebGPU and WebGL2 fallback, WebKit.
- Scripted title → new hero → play → pause → quit flows by keyboard, mouse (with hover focus) and gamepad stub (replace `navigator.getGamepads` with a standard-mapping pad via `add_init_script`).
- Glyphs swap with last device, and the Xbox setting works.
- Every screen: no text overflow (`scrollWidth`), minimum font size, inside safe area, every focusable reachable by pad-only navigation.
- Touch-only phone and tablet profiles (`page.touchscreen.tap`, and WebKit with an iPhone profile as the closest thing to iOS) show the exact text, Settings works by tap, attract runs.
- Attract: starts at 10 s idle (use time control or a test hook, plus one real-time check), loops through all reel flags, any input exits and has no side effect.
- Dev Mode: reachable from Pause, each slider changes the sim live, reset restores defaults.
- About/Credits contains all 14 Source Information fields and all 14 feedback questions with non-empty answers (§21). `added on import` appears once. The title matches everywhere.
- Audio: `settings.music` is 0.10 on first run, Music bus gain matches, levels non-zero when playing, patches render clean offline.
- Couch: two stub pads, both control heroes, menus are owned.
- Online: two pages connect by codes, play one minute of sim, one leaves.
- Scripted playthrough of the whole game with `?norender=1` using the bot at high speed, then again with sparse rendering to catch runtime shader errors.

**hub (`tools/hub_run.py`, Appendix A):** serve `vendor/hub/` files beside `dist/game.html`, then run the real harness at `players=2,3,4` with `latency=150&jitter=50&loss=5&auto=1&play=8000`, `scenario=host-leave` at 3, `scenario=server` at 2. Run on default flags (software WebGL, which is what the hub's own check uses) and with WebGPU flags. Pass means `__hubCheck.pass`, `checks.length >= 13`, no `[AIHub]` console lines, no page errors. Then verify the client hash (SHA-256 of banner to last line, LF endings, equals `529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a` for 1.4.0; if the hub has released a newer client, the hash is in `RELEASES` in the hub repo's `scripts/lib/hub-client.mjs`), and repeat the hub's "on its own" check: open normally, press Enter, Space, Enter, Space, confirm the client is inactive, the page draws, no errors.

### 19.5 Screenshots

Only for what a script cannot check, with the §3.2 flags at 1920×1080: each zone's look, ink strength, hero readability, HUD at 10 feet, the Wheel, boss intros, loot beam. Look at them and fix what looks wrong. They are the only eyes the game gets.

---

## 20. Build order

Build the spine first, then one thin playable path, then widen. Every milestone ends with a working `dist/game.html` and passing tests.

| # | Milestone | Done when |
|---|---|---|
| 0 | Title picked with RNG. Scaffold, `build.mjs`, `test.mjs`, pinned deps, fonts, hub files. Empty scene + ink chain + Rapier + client from Appendix A | Single file boots from `file://`, backend asserted, hub harness passes with an empty round |
| 1 | Sim core in Node: actors, intents, events, combat, Wick-Dead, one room, loot basics, Penitent's first 3 skills, bot | Bot kills things in Node |
| 2 | View: renderer, materials, camera, biped rig, pose DSL, ragdolls, damage feedback, one kit | Screenshot shows an inked fight. It feels good to press attack |
| 3 | Input and UI foundation: devices, Glyphs, focus, HUD, Wheel, pause, settings, touch-only | Pad-only, keys-only, mouse-only tests pass |
| 4 | **Vertical slice:** Gibbet Road → Tallowgate → Wickfield → Undercroft → Chandler, with one class, audio engine (SFX, music, voice), dialogue, quests, saves | Bot and human path through Act I's first half. Sound checks pass |
| 5 | Net spine: hub session with that slice (host/client, outbox, card, round, finish). Do this **before** widening, as it shapes everything | Hub suite green at 2, 3, 4, host-leave, server. Two-page play works |
| 6 | All four classes with all skills, Glyphs, passives, VFX, rigs | Sim tests for every skill |
| 7 | Full loot: rarities, affixes, Legendaries, sets, services, gems, Reliquary, stash | Sim tests. Screenshots of vendor screens |
| 8 | Rest of Act I, Acts II and III, all monsters, vows, all bosses, events, shrines, traps, lore, barks | Bot finishes the campaign in every class on target pacing |
| 9 | The Hours, Vigil Trial, difficulty tiers, Devotion, Final Hour | Sim tests pass |
| 10 | Couch and online party | Browser tests pass |
| 11 | Attract mode and Dev Mode | Tests pass |
| 12 | Polish: music per zone, cinematics, feats, gear visuals, more variation, teach-by-doing, screenshots of everything | Full suite green |
| 13 | About/Credits, exit interview, package (§21) | §21 checklist complete |

**Cut rules, if you run out of capacity.** Finish systems before content, and never leave a stub or a dead menu row. If something must go, remove it and every reference to it. Cut in this order, one step at a time:
1. Feats, Devotion, extra gear visuals.
2. Sets, then reduce Legendaries to 12.
3. Glyphs to 2 per skill, skills to 6 per class.
4. Vigil Trial (keep Open Hour).
5. Online invite codes (keep couch and hub).
6. Saltmere and Spire shrink to a single short floor each, keeping all bosses.
7. Monsters to 12, keeping one per role.

**Never cut:** four classes, ink filter, Rapier spectacle, loot moments, all bosses, hub session, 10-foot UI with all three input schemes, voices, music at 10%, attract, Dev sliders, About/Credits.

---

## 21. Finishing: everything TASK.md requires at the end

TASK.md marks this part critical. Do not leave it to memory. From the first day, keep `docs/dev-log.md`: one line each time a test catches a real bug (mark the critical or game-breaking ones), each time you get stuck or guess wrong about three.js or Rapier, and each time you have to build something the libraries did not give you. Your feedback answers come from that log. **Write `unknown` for anything you cannot confirm, and never invent a number.**

### 21.1 One source of truth

`src/data/about.js` holds all the fields and answers below. Three things read from it, so they cannot drift apart:
- the in-game About/Credits screen (§21.4)
- the exit-interview JSON (§21.5), written by `tools/make-exit.mjs`
- your final chat reply (§21.6): `node tools/make-exit.mjs --print` prints the text to paste

### 21.2 Source Information: every field, in this order

These 14 fields go in **both** your final chat reply **and** the About/Credits screen.

| Field | What to write |
|---|---|
| Date | Copy it from your TASK.md, exactly |
| Source | The work it's based on: `Diablo 3` |
| Plan | The file name of this plan, as you received it |
| Genre and Perspective | The genre and camera perspective you used: isometric action-RPG, fixed three-quarter overhead camera, unless you changed them. The JSON keeps these as two fields |
| Tech | Stack, libraries and engines with versions: three.js R180 (`three@0.180.0`) WebGPURenderer with its WebGL2 fallback and TSL, Rapier 0.19.3 (`@dimforge/rapier3d-compat`), Web Audio, Gamepad API, esbuild, plain JS modules, DOM UI, plus anything you added |
| Art Direction | The style you used: "Inked Reliquary", cel-shaded node materials, ink outline and hatching post filter, all models built in code |
| Animation | The system you used: `AnimationMixer` with keyframe clips authored in code on code-built skeletons, Rapier ragdolls |
| Audio | The music, sound effects and voice you used: all synthesized in Web Audio, Animalese-style gibberish voices, music at 10% by default, no audio files |
| Online | The network features you actually shipped, or `none`: AI Hub Session Protocol v1 (shared-world), couch co-op, WebRTC invite codes outside sessions |
| Testing | The testing parameters TASK.md allowed: headless scripts that play the game and check its state, a scripted whole-game playthrough, one quiet command, screenshots only for what a script can't check, no subagents or workflows to debate, review, judge or audit |
| Research | The research you did, or `none`. Note that this plan's research (the AI Hub docs and harness, tests of the pinned libraries) came with the plan |
| Environment | Copy it from your TASK.md |
| Model | Copy it from your TASK.md (provider, model id, reasoning effort) |
| Usage | Exactly `added on import`. You can't see your own cost, so don't estimate it. The runner records the real cost, tokens and time, and the agent that imports the game into AI Hub puts them on your About/Credits screen. So keep that exact string on its own row, once in the final HTML, where that agent can find it |

### 21.3 Feedback questions: answer every one, in this order

These answers also go in **both** your final chat reply **and** the About/Credits screen. "The engine" means three.js with TSL, and Rapier. The answers must be your own, from your own run. This plan does not supply them.

**Testing Feedback**
1. How many issues did testing catch?
2. How many would be considered critical issues / game breaking?
3. What was the most helpful test you ran?
4. What was the least helpful test you ran?

**Engine Feedback**
1. What did you like most about the engine?
2. Did you get stuck or guess wrong?
3. What was the most important thing you had to build yourself?
4. What was the hardest part about using the engine?
5. What did you change in the engine, and why? (none if nothing)
6. If you could change one thing about the engine, what would it be?

**Prompt Feedback**
1. What did you like most about this prompt?
2. What was confusing?
3. What was the hardest thing to do?
4. What would you change in this prompt?

If your TASK.md words any question differently, use its wording.

### 21.4 The About/Credits screen

Reachable from the Main Menu and the Pause menu, and from the non-pausing overlay in a hub session. It keeps to the 10-foot rules (§15), so it is paged, not one dense wall:

| Page | Holds |
|---|---|
| 1 | Source Information: all 14 fields |
| 2 | Testing Feedback: 4 questions with answers |
| 3 | Engine Feedback: 6 questions with answers |
| 4 | Prompt Feedback: 4 questions with answers |
| 5 | Credits: your game's title, three.js, Rapier, Uncial Antiqua and Alegreya with their licenses |

L1/R1, ← → or a click flip pages. The stick or mouse wheel scrolls a long answer rather than shrinking its text. A browser test asserts all 14 fields and all 14 questions are present with non-empty answers (§19.4).

### 21.5 The exit-interview JSON

Save it under the file name your TASK.md gives, in the root beside the game's HTML (not in the dev folder). It is one JSON object in exactly this shape, and tools read it (the game's run record and the AI Hub catalogue):

```json
{
  "sourceInformation": {"date": "", "source": "", "plan": "", "genre": "", "perspective": "", "tech": "", "artDirection": "", "animation": "", "audio": "", "online": "", "testing": "", "research": "", "environment": "", "model": "", "usage": "added on import"},
  "testingFeedback": ["your answer to each Testing Feedback question, in order"],
  "engineFeedback": ["your answer to each Engine Feedback question, in order"],
  "promptFeedback": ["your answer to each Prompt Feedback question, in order"],
  "aiHub": {
    "name": "", "tagline": "", "description": "", "type": "", "genre": "",
    "source": "", "series": "", "players": "", "controls": "", "tags": []
  }
}
```

Every value is filled in (`unknown` for anything you can't confirm) and written as plain text with no Markdown or HTML. The three feedback arrays hold 4, 6 and 4 answers. `tools/make-exit.mjs` reads the saved file back with `JSON.parse` and asserts the exact keys and those counts, so a typo fails the build. The catalogue's model, effort, CLI, date and usage come from the run's record after you finish, so do not add them.

Suggested `aiHub` values:

| Key | Value |
|---|---|
| `name` | The game's title, exactly as on its title screen |
| `tagline` | A few words to go under the title: `Seven tolls, and the sun forgets the way` (also used in the page `<title>`) |
| `description` | One or two sentences for the catalogue: `An inked co-op action-RPG: cut through candle-headed dead and a tax-collecting devil lord to silence a black bell before the seventh toll.` |
| `type` | `Game` (allowed: Game, Tech demo or Tool) |
| `genre` | `RPG` (one of Action, Adventure, Fighting, Flight, Horror, Kids & Learning, Life Sim, Platformer, Puzzle, Racing, RPG, Shooter, Simulation, Sports, Stealth, Strategy) |
| `source` | `Diablo 3` |
| `series` | `Diablo` |
| `players` | `1–4` |
| `controls` | `Stick or mouse to move, face buttons or 1-4 for skills, L1 or Q for potion` |
| `tags` | 3 to 6 lowercase tags: `3d`, `co-op`, `fantasy`, `boss fights`, `top-down`, `story` |

### 21.6 Your final chat reply

It must contain, as readable text, all four sections with every field and question:

```
Source Information
- Date: ...
- Source: ...
(all 14 fields)

Testing Feedback
- How many issues did testing catch? ...
(all 4)

Engine Feedback
- What did you like most about the engine? ...
(all 6)

Prompt Feedback
- What did you like most about this prompt? ...
(all 4)
```

Then say where the game's HTML is and give the final test count line.

### 21.7 Package

The deliverable is one HTML file. Its exact name is in your TASK.md, built from your title, the source and your run's own identifiers, and it goes in the root above your dev folder. All dev files stay in the dev folder. Run `node tools/build.mjs`, copy `dist/game.html` to that name, then run the whole test suite against that final copy. Answers to the feedback questions come at the very end, so rebuild once more after writing them, so the screen has them.

### 21.8 Done means

- [ ] Every row of §22 is true.
- [ ] Full test suite green against the final file. Whole-campaign bot passes in every class.
- [ ] Hub harness passes on all scenarios with no warnings.
- [ ] `grep` of `src/` finds no TODO, FIXME, stub or placeholder.
- [ ] You looked at screenshots of every zone and screen at 1920×1080.
- [ ] The title is identical on the title screen, in `<title>`, on the About/Credits screen and in the exit interview's `name`.
- [ ] About/Credits, the exit interview JSON and your chat reply all agree, and the JSON parses.
- [ ] The exit interview sits beside the game's HTML, both named as your TASK.md says.
- [ ] Your temporary files are gone and all your processes are stopped.

---

## 22. Brief coverage, in TASK.md's order

Each row is one thing TASK.md asks for, in the order it asks. Go down this list before you finish.

| TASK.md asks for | Where |
|---|---|
| Source: Diablo 3 | §1, §2 |
| Pick the genre that best fits | §1 |
| Pick the camera perspective that best fits | §1, §5.4 |
| Title: a playful riff on the source's name, 50 ideas silently, picked with a real RNG | Top of plan, §20 M0 |
| Research: whether and how much is your choice | §21.2 (Research field). This plan's research is already built in |
| Package: a single HTML file with the name TASK.md gives. Downloadable dependencies need not be inlined | §3.1, §21.7 |
| Three.js R180 | §3.1 |
| WebGPU | §3.1, §3.2 |
| Stylized cel-shaded / ink filter | §12.1, A.3, A.4 |
| Rapier 0.19.3 for physics | §3.1, §3.4, §4.2, §12.5, A.6 |
| Web Audio | §14 |
| Gamepad API | §5.1, §19.4 |
| The rest of the stack is your choice | §3.1, §4.1 |
| Art: engine's native style as the base, new art for the source's feel, engine library for generic props | §12 |
| Animation: engine's native system as the base, new animations for the source's feel | §13, A.5 |
| Audio: all music, sound effects and voices in code, no audio files | §14 |
| Voices are Animalese/Simlish-style gibberish | §14.3 |
| Music at 10% volume by default | §14, §14.4 |
| Online: the AI Hub library | §18.1 |
| A dev subfolder for all dev files, separate modules, bundled to a single file in root when done | §4.1, §21.7 |
| External CDN dependencies allowed | §3.1 |
| Do not read files you don't need, other agents work beside you | §19.1 |
| Shared ports and processes: prefer `file://`, bind 127.0.0.1 on an OS-picked port if a server is needed, confirm the page is yours, stop only your own PIDs | §19.1, §3.5, A.8 |
| Performance budget unlimited: as much detail, enemies, effects, lights and shadows as the scene needs | §12 |
| FPS targets and optimization are out of scope | §12 |
| Testing: headless scripts that play the game and check state | §19.2, §19.3, §19.4 |
| Scripted playthrough of the whole game | §19.3, §19.4 |
| One command that prints only failures and a one-line count, rerun only after changing covered code | §19.1 |
| Screenshots only for what a script can't check | §19.5 |
| No subagents or workflows to debate, review, judge or audit | §19.1 |
| Effort: yours to spend | Spend it where the pillars in §1 show |
| This computer: tools, browsers and flags | §3.2, §19.1, A.2 |
| No controller: stub `navigator.getGamepads` | §19.4 |
| No touch device: Playwright phone and tablet profiles | §19.4 |
| Nobody to listen: check audio with `OfflineAudioContext` and `AnalyserNode` | §14.4 |
| No second player: two browser pages | §19.4 |
| No real iPhone or iPad: WebKit with an iPhone profile | §19.4 |
| No TV: judge the 10-foot view from 1920×1080 screenshots | §19.5 |
| Sharing: one or two browsers, files in your folder, no `playwright install`, `uv` for extra Python packages | §19.1 |
| Earlyoom: "Target closed" or "page crashed" means memory | §19.1 |
| Build an original game inspired by the source | §1, §2 |
| Capture its world, characters, themes and tone in mechanics, pacing and UX | §2, §10.6, §11 |
| Feature-complete demo, long enough to show all features and mechanics, what the player can and cannot do | §1, §10.6, §15 |
| Complete, polished vertical slice with the infrastructure to build the rest with normal designer tools | §1, §4.3, §20 |
| Dev mode reachable from the pause menu, with the standard testing tools | §17, §15 |
| Important gameplay variables as live sliders, with a reset to defaults | §17 |
| Attract: after 10 s without input on title or menu, a looping AI demo, any input exits, may cheat freely, shows as much as possible | §16 |
| Multiplayer: AI Hub integration | §18.1–§18.7 |
| Multiplayer: the game on its own | §18.8, §18.9 |
| Narrative tone in the source's style | §11 |
| 10-foot, controller-first, PS5 DualSense or any standard-mapping pad on a TV | §5.1, §15 |
| Keyboard and mouse: same game, same screens, feel native | §5.2, §5.3, §15 |
| Keys PC players expect for the genre | §5.2 |
| Mouse aims and clicks menu items and things in the world, hover moves the focus | §5.2, §15 |
| Prompts follow the last input: PlayStation glyphs, Settings option for Xbox A B X Y, keys and mouse buttons | §5.3, §15 |
| No overly dense, web-style data screens | §15, §21.4 |
| Touch-only: no touch controls, "Controller or keyboard required", settings button, attract runs | §3.7, §15, §16 |
| No TODOs, placeholders or stubbed features | §1, §19.4, §20, §21.8 |
| Source Information in the chat reply and an About/Credits screen, `unknown` if unconfirmed | §21.2, §21.4, §21.6 |
| Fields: Date, Source, Plan, Genre and Perspective, Tech, Art Direction, Animation, Audio, Online, Testing, Research, Environment, Model, Usage | §21.2 |
| Usage: "added on import", no cost estimate | §21.2 |
| Exit interview JSON beside the HTML, exact shape, every value filled, plain text, parses | §21.5 |
| `aiHub` block: name, tagline, description, type, genre, source, series, players, controls, tags | §21.5 |
| Testing Feedback: 4 questions | §21.3 |
| Engine Feedback: 6 questions | §21.3 |
| Prompt Feedback: 4 questions | §21.3 |

---

## Appendix A: verified recipes

Each of these ran on this computer with the pinned versions. Copy them, then build on them.

### A.1 Build (`tools/build.mjs`, shape)

```js
execSync(`esbuild src/main.js --bundle --format=iife --target=es2022 --minify --charset=utf8 --legal-comments=none --outfile=dist/bundle.js`);
let bundle = readFileSync('dist/bundle.js','utf8').replace(/<\/script/gi,'<\\/script');
const client = readFileSync('vendor/hub/session.js','utf8').trimEnd();
// Assemble with template strings or split/join. Never pass the bundle as a String.replace replacement:
// its `$&` patterns would corrupt the code.
```
Paste `client` in a plain `<script>` right after `<meta charset>`. Put `bundle` in a plain `<script>` at the end of `<body>`. Then verify the hash (§19.4). Classic script + IIFE works on `file://` with no module or CORS issues.

### A.2 Launch flags

```python
FLAGS = ['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader',
         '--use-webgpu-adapter=swiftshader','--use-angle=swiftshader']
browser = p.chromium.launch(args=FLAGS)
```

### A.3 Materials

```js
import * as THREE from 'three/webgpu';
import { uniform, float, dot, normalView, positionViewDirection, color as tslColor, Fn, length, vec2,
         screenUV, screenCoordinate, fract, sin } from 'three/tsl';

const bands = new THREE.DataTexture(new Uint8Array([40,110,200,255]), 4, 1, THREE.RedFormat);
bands.minFilter = bands.magFilter = THREE.NearestFilter; bands.needsUpdate = true;
const toon = (c) => new THREE.MeshToonNodeMaterial({ color: c, gradientMap: bands });

// rim + hit flash, per object through a uniform
const flash = uniform(0);
const rim = float(1).sub(dot(normalView, positionViewDirection).max(0)).pow(3);
mat.emissiveNode = tslColor(0xff3322).mul(flash).add(tslColor(0xffd9a0).mul(rim).mul(0.35));

// dithered hole around the hero on screen, for tall props in front of them
const heroUV = uniform(new THREE.Vector2(.5,.5));
wall.maskNode = Fn(() => {
  const d = length(screenUV.sub(heroUV).mul(vec2(16/9, 1)));
  const noise = fract(sin(dot(screenCoordinate.xy, vec2(12.9898, 78.233))).mul(43758.5453));
  return d.sub(0.08).div(0.08).greaterThan(noise);
})();
```

### A.4 Ink chain

```js
import { pass, mrt, output, normalView, uv, vec2, vec3, vec4, Fn, abs, max, mix, smoothstep, step,
         luminance, length, fract, clamp, time, uniform, getViewPosition, perspectiveDepthToViewZ,
         screenSize, mx_noise_float, floor } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

const inkStrength = uniform(1);
// The scene camera, on purpose: cameraNear, cameraWorldMatrix etc. would be the full-screen quad's camera here.
const near = uniform(camera.near), far = uniform(camera.far);
const projInv = uniform(camera.projectionMatrixInverse), camWorld = uniform(camera.matrixWorld);
const post = new THREE.PostProcessing(renderer);
const scenePass = pass(scene, camera);
scenePass.setMRT(mrt({ output, normal: normalView }));
const colorTex = scenePass.getTextureNode('output');
const normalTex = scenePass.getTextureNode('normal');
const depthTex = scenePass.getTextureNode('depth');
const rawDepth = (p) => depthTex.sample(p).r;
const viewZ = (p) => perspectiveDepthToViewZ(rawDepth(p), near, far);

const inked = Fn(() => {
  const p = uv(), px = vec2(1).div(screenSize);
  const boil = floor(time.mul(8));
  const wob = vec2(mx_noise_float(p.mul(90).add(boil)), mx_noise_float(p.mul(90).add(boil).add(7.3))).mul(px).mul(1.1);
  const q = p.add(wob), w = px.mul(1.25);
  const c = colorTex.sample(q);
  const z0 = viewZ(q);
  const zA = viewZ(q.add(vec2(w.x, w.y))), zB = viewZ(q.add(vec2(w.x.negate(), w.y.negate())));
  const zC = viewZ(q.add(vec2(w.x, w.y.negate()))), zD = viewZ(q.add(vec2(w.x.negate(), w.y)));
  const depthEdge = smoothstep(0.012, 0.03, abs(zA.sub(zB)).add(abs(zC.sub(zD))).div(abs(z0)));
  const nA = normalTex.sample(q.add(vec2(w.x, w.y))).xyz, nB = normalTex.sample(q.add(vec2(w.x.negate(), w.y.negate()))).xyz;
  const nC = normalTex.sample(q.add(vec2(w.x, w.y.negate()))).xyz, nD = normalTex.sample(q.add(vec2(w.x.negate(), w.y))).xyz;
  const normalEdge = smoothstep(0.35, 0.7, length(nA.sub(nB)).add(length(nC.sub(nD))));
  const edge = clamp(max(depthEdge, normalEdge), 0, 1).mul(inkStrength);
  // hatching glued to the world: rebuild world position from depth
  const vp = getViewPosition(p, rawDepth(p), projInv);
  const wp = camWorld.mul(vec4(vp, 1)).xyz;
  const notSky = step(rawDepth(p), 0.9999);
  const lum = luminance(c.rgb);
  const h1 = step(0.55, fract(wp.x.add(wp.z).add(wp.y).mul(3.5)));
  const h2 = step(0.55, fract(wp.x.sub(wp.z).sub(wp.y).mul(3.5)));
  const hatch = max(h1.mul(smoothstep(0.16, 0.07, lum)), h2.mul(smoothstep(0.07, 0.025, lum))).mul(0.55).mul(inkStrength).mul(notSky);
  const paper = mx_noise_float(p.mul(vec2(900, 500))).mul(0.035).add(1);
  const vig = smoothstep(0.95, 0.35, length(p.sub(0.5)));
  const ink = vec3(0.035, 0.028, 0.03);
  return vec4(mix(mix(c.rgb, ink, hatch), ink, edge).mul(paper).mul(mix(0.55, 1, vig)), 1);
});
post.outputNode = inked().add(bloom(colorTex, 0.6, 0.5, 0.75));
// each frame: post.render();
```
Use `renderer = new THREE.WebGPURenderer({ antialias:false, forceWebGL: param==='webgl2' })`, `await renderer.init()`, `renderer.shadowMap.enabled = true`, `renderer.toneMapping = THREE.NoToneMapping`. Set `camera.near` and `camera.far` before building the chain, or update the two uniforms if they change. Emissive colours above 1 feed the bloom. Tune thresholds and hatch frequency by eye. Add the zone grade and FXAA (`fxaa` from `three/addons/tsl/display/FXAANode.js`) on top.

### A.5 A rig and a clip

```js
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
// bones: const hips = new THREE.Bone(); hips.name='hips'; ...add children...
// part(geo, boneIndex): set skinIndex (boneIndex,0,0,0) and skinWeight (1,0,0,0) on every vertex, toNonIndexed if needed
const mesh = new THREE.SkinnedMesh(mergeGeometries(parts), toon(color));
mesh.add(hips); mesh.bind(new THREE.Skeleton(bones));
const walk = new THREE.AnimationClip('walk', 0.8, [
  new THREE.QuaternionKeyframeTrack('legR.quaternion', [0,.4,.8], [...qa, ...qb, ...qa]),
]);
const mixer = new THREE.AnimationMixer(mesh); mixer.clipAction(walk).play();
const crowd = skeletonClone(mesh); crowd.material = toon(otherColor);   // 0 new pipelines
```

### A.6 Rapier

```js
import RAPIER from '@dimforge/rapier3d-compat';
await RAPIER.init();
const world = new RAPIER.World({x:0,y:-18,z:0}); world.timestep = 1/30;
const kcc = world.createCharacterController(0.02); kcc.setSlideEnabled(true);
const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x,1,z));
const col = world.createCollider(RAPIER.ColliderDesc.capsule(.5,.4), body);
kcc.computeColliderMovement(col, {x:dx,y:0,z:dz});
const m = kcc.computedMovement(), p = body.translation();
body.setNextKinematicTranslation({x:p.x+m.x, y:p.y+m.y, z:p.z+m.z});
world.step();
const hit = world.castRay(new RAPIER.Ray(origin, dir), maxDist, true); // hit?.timeOfImpact
```

### A.7 Hub boot and host skeleton

```js
const info = await AIHub.connect({ mode:'shared-world', seats:[1,4], card:true });   // first line of main
if (!info) return startStandalone();
await RAPIER.init();
// build sim from AIHub.rng('world')...
AIHub.on('message', (d, from) => { /* route by d.t, check from === info.host on clients */ });
AIHub.on('leave', ({id}) => removeHero(id));
AIHub.on('time-up', () => { if (info.isHost) finishRound(false); });
AIHub.on('end', ({reason}) => stopEverything(reason));
AIHub.on('card', updateCard);
addEventListener('keydown', e => { if (e.key === 'Enter') AIHub.answer('ready'); });
AIHub.ready();                          // before any renderer work
setInterval(simPump, 16);               // sim + outbox on a timer, catch up from elapsed time
if (info.server) return;                // no player, camera, audio, renderer
await buildViewInSlices();              // yields often
requestAnimationFrame(drawWithGovernor);
```

### A.8 Harness driver

```python
srv = subprocess.Popen(['python3','-u','-m','http.server','0','--bind','127.0.0.1'],
                       stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
port = int(srv.stdout.readline().split('port ')[1].split(' ')[0])
# in a folder holding harness.html, bridge.js, round.js and the game page
url = f'http://127.0.0.1:{port}/harness.html?game=game.html&players={n}&latency=150&jitter=50&loss=5&auto=1&scenario={sc}&play=8000'
page.goto(url); page.wait_for_selector('body[data-complete="true"]', timeout=300000)
r = page.evaluate("()=>({pass:__hubCheck.pass,n:__hubCheck.checks.length,fails:__hubCheck.checks.filter(c=>!c.pass).map(c=>c.name+' -- '+c.detail)})")
# scenarios: (2,'standard'),(3,'standard'),(4,'standard'),(3,'host-leave'),(2,'server')
# browser args for the hub's default run: ['--no-sandbox','--autoplay-policy=no-user-gesture-required']
srv.terminate(); srv.wait(timeout=5)
```

### A.9 Invite codes

```js
const pc = new RTCPeerConnection({ iceServers:[{urls:'stun:stun.l.google.com:19302'}] });
const rel = pc.createDataChannel('rel', { ordered:true });
const fast = pc.createDataChannel('fast', { ordered:false, maxRetransmits:0 });
const gather = () => new Promise(r => { if (pc.iceGatheringState==='complete') return r();
  pc.onicegatheringstatechange = () => pc.iceGatheringState==='complete' && r(); setTimeout(r, 3000); });
await pc.setLocalDescription(await pc.createOffer()); await gather();
const code = btoa(JSON.stringify(pc.localDescription));
// guest: new RTCPeerConnection, pc.ondatachannel, setRemoteDescription(JSON.parse(atob(code))),
//        setLocalDescription(await pc.createAnswer()), gather, btoa answer
// host:  await pc.setRemoteDescription(JSON.parse(atob(answer)))
```
Guard all of this behind `!AIHub.active`.
