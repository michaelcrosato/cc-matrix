# Operation Wolfpack

*An original first-person light-gun rail shooter for 1–4 players, inspired by Taito's* Operation Wolf *(1987).*
*Build plan, written 2026-11-03 for the developers (human or AI) who will build the game from TASK.md and this file alone.*

**How the title was chosen.** TASK.md asks for a playful riff on the source's name, picked with a real random number generator
from 50 titles brainstormed in silence. The planner wrote 50 riffs, ran
`python3 -c "import secrets; print(secrets.randbelow(50) + 1)"`, got **33**, and title #33 was **Operation Wolfpack**. Don't
pick again. The pun runs through the whole game: the original's lone commando becomes a squad (co-op for 1–4), and the
enemy is the *Hyena Legion*, so the game is wolves against hyenas.

---

## Contents

1. Deliverables and names
2. The game in one page
3. Research summary: what we keep, what we change
4. Genre, perspective, rendering approach
5. Controls and prompts
6. Architecture and modules
7. Systems (exact rules and numbers)
8. Content: setting, cast, writing, bestiary, items, the six operations, cutscenes
9. Presentation: art assets, animation, audio
10. UI and UX (10-foot), screens, HUD, settings
11. Dev mode
12. Attract mode and the bot
13. Multiplayer: local co-op and AI Hub
14. Touch-only devices, About/Credits, exit interview
15. Build order and milestones
16. Risks and how to de-risk them
17. Testing
18. Definition of done

---

## 1. Deliverables and names

| What | Exact name or place |
|---|---|
| Title (title screen, `<title>`, hub metas, About, exit interview) | `Operation Wolfpack` |
| Name tokens | GameTitle = `OperationWolfpack`, SOURCE = `OperationWolf` |
| Dev folder (every dev file goes here) | `./OperationWolfpack-OperationWolf-claude-opus-5-5-max-20261103-174746/` |
| The single-file game | `./OperationWolfpack-OperationWolf-claude-opus-5-5-max-20261103-174746.html` (this folder's root, beside TASK.md) |
| Exit interview | `./exit-interview.json` (root, beside the .html; the exact shape is in TASK.md; check that it parses) |
| Chat reply when done | Source Information, Testing Feedback, Engine Feedback and Prompt Feedback (TASK.md), the same text as the in-game About/Credits screen |

`./` is the folder holding TASK.md, STAGE.md and PLAN.md. Other agents share the parent `runs/` folder, the machine's ports
and its processes: don't read their folders, and stop only processes you started, by PID.

**Getting the base.** Engine: the handoff package of my-3D2dge **v0.85.2** (repository commit `4390a98`, 2026-11-03):
`https://github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff`. AI Hub client and harness:
`https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub` (protocol 1, client **1.4.0**). Fetch both into the dev folder,
not `/tmp`: when this plan was written the machine's `/tmp` tmpfs was full. For example, from the dev folder:

```sh
git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/my-3d2dge.git vendor/my-3d2dge
git -C vendor/my-3d2dge sparse-checkout set dist/handoff
cp -r vendor/my-3d2dge/dist/handoff/. engine/
mkdir -p hub && cd hub && for f in session.js harness.html bridge.js round.js; do
  curl -fsSO https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/$f; done
```

If a newer engine version is there, read its `CHANGELOG.md` first. The rest of this plan names the v0.85.2 APIs.

---

## 2. The game in one page

**Pitch.** General Hugo Kragg and his mercenary *Hyena Legion* have seized the Brimstone Coast and taken five relief workers
hostage. No army will go in, so they sent the pack. You are the **Wolfpack**, four commandos with submachine guns, limited
magazines and a few grenades. Over six operations, from a radio hill at dawn to a cargo plane escaping a gunship at
sunrise, you blast through a battlefield that scrolls past in depth, spare the civilians, and bring the hostages home.

**How it plays.** It's a first-person light-gun shooter. The camera rides a scripted rail across each battlefield (sideways,
like the source; forward up a river; backward off a plane's ramp). The player aims a free crosshair with the mouse, a
stick or the keys, and holds the trigger for full-auto fire. Soldiers run, pop out of cover and windows, throw grenades and
knives, and fire rockets. Vehicles and helicopters come in. Every gun-armed enemy telegraphs its shot with a closing ring:
kill it before the ring closes, or the damage meter fills. Grenades, knives, rockets and mortar shells can all be shot out
of the air. Ammo comes in magazines and runs out, so you restock by shooting supply crates and spooking the supply animals
the villagers keep. Every operation has an **enemy quota** (soldiers, vehicles, boats, aircraft, shown as counters). Fill
the quota, reach the end of the rail, and the operation's boss arrives. Beat it to clear the operation and earn that op's
perk for the rest of the run.

**A run.** Title → briefing → map → Op 1 Radio Hill → Op 2 Mangrove Run → interrogation → Op 3 Palm Village → Op 4 Powder
Keg Depot → Op 5 The Kennel (the hostage breakout) → Op 6 Last Flight Out (boarding, takeoff, the gunship) → an ending
that depends on how many hostages came home → rank, credits, initials. A first clear takes about 25–30 minutes. Players
2–4 can drop in at any time with another controller, and in AI Hub sessions 1–4 players fight one operation together
online.

**What the player can do:** aim; fire full-auto; reload by hand (or let it reload automatically); throw grenades at the
crosshair; on a pad, snap the crosshair to the most dangerous target; shoot pickups to collect them; shoot projectiles out
of the air; shoot props (crates, red barrels, fuel tanks, masts, searchlights, ropes); protect civilians and hostages by
killing what threatens them.

**What the player cannot do:** walk, strafe, duck, take cover or choose a path (the rail is scripted); heal except with
pickups and stage clears; carry more than the pouch limits; shoot through cover (sandbags, walls, wrecks); pause an online
session (the menu opens, the world goes on).

**Pillars.**
1. **Every bullet counts:** magazines, reload timing, supply crates, the DRY rule.
2. **Read the battlefield in depth:** near knife-throwers, far snipers, closing rings, shootable projectiles.
3. **Don't shoot the innocent:** civilians and hostages cross the line of fire; hitting them costs damage and points.
4. **Pack tactics:** 1–4 seat-colored crosshairs, shared quotas, rings colored by who is targeted.
5. **80s arcade punch:** terse all-caps cards, big explosions, a score chase, initials, an attract mode.

---

## 3. Research summary: what we keep, what we change

**Facts about the source** (Wikipedia, arcade-history.com): an arcade game by Taito, released in 1987, played with a
mounted Uzi-style gun that vibrates as it fires. A special forces operative rescues five hostages across six stages:
Communication Setup, Jungle, Village, Powder Magazine, Concentration Camp and Airport. The trigger fires full-auto, and a
button launches a grenade with a wide blast. Each stage requires a set number of soldiers and vehicles (trucks, boats,
helicopters, armored transports), shown on counters. Ammo and grenades are limited; you replenish them by shooting objects
and passing farm animals. A machine-gun power-up gives unlimited ammo and faster fire for 10 s. Dynamite damages
everything on screen, friend and foe. A damage bar fills when you are hit or shoot civilians or hostages. Clearing the
Village restores a lot of damage, clearing the Powder Magazine refills ammo and grenades, and the other stages restore a
little. After the jungle the hero interrogates a soldier, who gives up the camp's location. In the camp you protect
hostages as they run, and at the airport they run for the plane, with a bonus per hostage aboard. Big machine gunners die
fast to shots in the face, and mortar crews sit behind sandbags. Enemy projectiles can be shot down. The game ends when the
damage bar fills or when both ammo and grenades run out. After the ending it loops at a higher difficulty.

| We keep (what makes the source itself) | We change (to make it original, modern and fair) |
|---|---|
| A crosshair over a battlefield scrolling past in depth | An original setting, cast and stage names (Brimstone Coast, Hyena Legion, Wolfpack) |
| A full-auto SMG with limited magazines; grenades with a big blast | A boss at the end of every operation, with weak points and phases |
| A damage meter that fills; damage repaired on stage clears | A closing **telegraph ring** before every enemy shot, so damage is readable and avoidable |
| Enemy quota counters per stage | Co-op for 1–4, locally and in AI Hub sessions |
| Supplies from crates, barrels and animals | Animals are never killed: a hit makes them drop what they carry and flee |
| A 10 s machine-gun power-up (**FURY**); **DYNAMITE** that hurts everyone on screen | No child civilians; a green cross, not the Red Cross emblem; no blood (dust, flashes, falls) |
| Civilian and hostage penalties; hostage escorts in the camp and at the airfield | A streak multiplier, aim assist for pads, three difficulty levels |
| Six stages: comms → jungle → village (heal) → ammo dump (refill) → camp → airport | Out of ammo and grenades ends the run only on ARCADE difficulty; on the others an emergency drop comes |
| The interrogation beat; endings that depend on hostages saved; loop 2 after the ending | First-person SMG overlay, shell casings, rumble, a gibberish-voiced radio |

---

## 4. Genre, perspective, rendering approach

- **Genre:** light-gun rail shooter, the shooting-gallery kind (catalogue genre: *Shooter*).
- **Perspective:** first person. The camera sits on a scripted rail with a fixed heading per segment, at eye height. The
  crosshair is free; the camera never follows it.
- **Rendering:** the engine's **Mode 7 module** (`E.Mode7`, part of the full engine `my-3d2dge.js`): a perspective floor
  drawn a row at a time, a `E.Backdrop` sky, and billboards drawn far to near at the size their distance gives. That means
  HD Humanoid rigs (`m7.rig`), shapes-as-data (`m7.shape`: vehicles, buildings and props seen from the right side and
  facing), string sprites (`m7.sprite`), and our own drawing (`m7.add(x, y, z, (g, sx, sy, k) => …)`, where `k` is screen
  pixels per world unit there). This is the API card's light-gun recipe on the engine's own depth view (the 3D engine is not
  in the handoff), and it gives real parallax: the camera moves sideways, and near things pass faster than far ones.
- **Resolution:** `res: [480, 270]`, a fixed 16:9 buffer with **no `expand`**. Every player, screen and test then shares
  one aim space; a 1080p TV is exactly ×4, and 4K is ×8. Leave `game.settings.scale` on `'auto'` (sharp on desktops;
  players can pick fill). The page's bars use a CSS background: dark olive with a faint repeating wolf emblem, like
  cabinet side art.
- **Coordinates:** world units, 16 = 1 m; x east, y south, z up. Most rails run along +x at y = 0 with the camera looking
  north (`angle = -Math.PI / 2`); depth ahead means negative y. Camera eye `h` is 22–28, `pitch` 4–8°, and `fov` 60°
  (vertical). At 480×270 with fov 60, the focal length is `f = 135 / tan(30°) ≈ 234 px`. A rig 34 units tall stands about
  130 px high at depth 60 (a foreground threat), 20 px at 400, and 9 px at 900. The visible half-width at depth D is about
  1.03 × D.

---

## 5. Controls and prompts

The action map is a custom preset, `WP.INPUT`, passed to `new E.Game({ input })`; the menu actions come from the engine's
own menu keys. Every action except the menu ones can be rebound on the standard Controls screen.

| Action | DualSense (default glyphs) | Xbox glyphs (setting) | Keyboard + mouse | Keyboard only |
|---|---|---|---|---|
| Aim | Left stick (fast) + right stick (half speed, fine), d-pad nudges | same | Mouse (absolute, like a light gun) | WASD / arrow keys |
| Fire (hold = full-auto) | R2 (`Pad7`) | RT | Left click (`Mouse0`) | Space or J |
| Grenade (thrown at the crosshair) | L2 (`Pad6`) or R1 (`Pad5`) | LT / RB | Right click (`Mouse2`) or G | K or G |
| Reload | □ (`Pad2`) | X | R or middle click (`Mouse1`) | R or L |
| Snap to threat (aim assist) | L1 (`Pad4`) | LB | Q | Q |
| Pause / menu | Options (`Pad9`) | Menu | Esc or P | Esc or P |
| Menu confirm / back | ✕ / ○ | A / B | Click / Esc, Enter / Backspace | Enter / Esc |
| Join (local co-op) | Options on a controller nobody holds | Menu | n/a | n/a |

```js
WP.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire: ['Mouse0', 'Space', 'KeyJ', 'Pad7'], grenade: ['Mouse2', 'KeyG', 'KeyK', 'Pad6', 'Pad5'],
  reload: ['KeyR', 'KeyL', 'Mouse1', 'Pad2'], snap: ['KeyQ', 'Pad4'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
```

- **The crosshair from keys:** read the movement keys from `input.held` (`KeyW`, `KeyA`, `KeyS`, `KeyD`, `Arrow*`), not
  from the `up`/`down`/`left`/`right` actions. The engine presses those actions when a stick passes halfway, which would
  count the stick twice.
- **Mouse:** the crosshair is `input.pointer()`, in the buffer's own pixels. Hide the OS cursor over the canvas in play
  (`canvas.style.cursor = 'none'`) and show it in menus. In menus the mouse hovers to move the focus and clicks to pick
  (`E.Menu` and `E.Shell` do both). On the map, hovering an operation node focuses it.
- **Prompts** always come from `input.label(action)`, which follows `input.lastDevice`: "R2" / "RT" on a pad, "Left
  click" after mouse use, "Space" after keyboard use. HUD prompts are short, glyph first: `□ RELOAD`, `L2 GRENADE`.
- **Glyphs:** PlayStation by default, with an Xbox option. Change the engine's standard `glyphs` setting (see 6.5) so its
  default is `'playstation'` and its options are PlayStation and Xbox only, and add a mirror in Settings → Game
  ("BUTTON SYMBOLS") that calls `settings.set('glyphs', v)`. The engine's own entry lives on the Controls screen; the task
  asks for it in Settings.
- **Rumble** (`input.rumble`, per player's pad): each shot .06 strength for .03 s; your grenade .45 for .2 s; taking
  damage .8 for .25 s; a boss explosion 1 for .6 s.
- **Hub sessions:** ignore Options while Create (`Pad8`) is held. Create + Options belongs to the hub.

---

## 6. Architecture and modules

### 6.1 Folder layout (inside the dev folder)

```
package.json         scripts: test, build, check; devDependency playwright 1.63.0 (the handoff's pin)
manifest.json        the script order (engine first, then src/*) used by dev/index.html, the tests and the bundler
engine/              the handoff copy: my-3d2dge.js (the full engine, edited), modules/, tools/, docs/, API.md, API-INDEX.md, AI_GUIDE.md
engine/CHANGES.md    every engine edit and why (it feeds the Engine Feedback answers)
hub/                 session.js (client 1.4.0, never edited), harness.html, bridge.js, round.js (harness files: tests only)
src/                 the game: plain scripts sharing one namespace, WP (list below)
dev/index.html       loads hub/session.js, engine/my-3d2dge.js and src/* one by one (works over file://)
tools/build.mjs      bundles everything into ../OperationWolfpack-OperationWolf-claude-opus-5-5-max-20261103-174746.html
tests/               run.mjs (the one command) and the suites (section 17)
shots/               screenshots and filmstrips for visual review only (never bundled)
vendor/              the clone the engine was copied from (not bundled)
```

### 6.2 Source files (`src/`, loaded in this order)

Every file starts `(() => { const E = My3D2dge, WP = globalThis.WP; ... })();` and adds to `WP`. No ES modules: the
headless tests load the files into a `node:vm` context, as the handoff's `game/test.mjs` does.

| File | Owns |
|---|---|
| `00-core.js` | `globalThis.WP = {}`; constants (`W = 480`, `H = 270`, `PLAY_H = 234`); seat colors; small utils; the event bus |
| `01-tuning.js` | `WP.T` (live tuning values) and `WP.TUNING_SPEC` (defaults, ranges, labels: 11.1); difficulty presets; co-op scaling |
| `02-text.js` | `WP.TEXT`: every visible string (cards, radio, cutscenes, endings, HUD words, help, About). Nothing hard-coded elsewhere |
| `03-rng.js` | seeded streams from `E.rng`: `sim`, `loot`, `ai`, `fx`; hub seeding |
| `10-view3d.js` | `WP.View3D`: Mode 7 math for the sim (`begin`, `project`, `toFloor`, `halfWidth(depth)`), camera basis, camera-anchored → world |
| `11-rail.js` | `WP.Rail`: keyframes → `E.Path` (catmull), speed, holds, tweens of yaw/pitch/h/fov, bob, segment cuts |
| `12-hit.js` | hit shapes per entity in screen space, tests nearest first, cover occlusion, explosion queries |
| `20-entities.js` | the entity store (ids, kinds), the `WP.TYPES` registry, shared update (anchors, timers, death, fade, despawn) |
| `21-infantry.js` | infantry behaviors (7.6) |
| `22-enemyfire.js` | telegraphs, target choice, hitscan accuracy, damage to players |
| `23-projectiles.js` | grenades, knives, rockets, missiles, mortar and tank shells, flame waves: motion, shoot-down, impact |
| `24-vehicles.js` | jeep, truck, APC, tank, skiff, gunboat, helicopter, cargo plane (scenery), weak points, wrecks |
| `25-bosses.js` | the six bosses (8.7): phases, weak points, attacks, intros, defeats |
| `26-friendlies.js` | civilians, hostages (escort, capture, recapture), supply animals, friendly markers |
| `27-props.js` | destructibles and cover: crates, red barrels (chains), sandbags, masts, fuel tanks, searchlights, ropes, ammo wagons, window and door openings |
| `28-pickups.js` | pickup kinds, drops, bounce and expiry, collection, the supply director, the emergency drop |
| `30-players.js` | player state, device adapters → `InputFrame`, crosshair motion, aim assist, snap, join, down, return at the next op |
| `31-weapon.js` | SMG (rate, bloom, magazines, reload, FURY), grenade throws, dynamite, shot resolution → damage, score, events |
| `32-scoring.js` | scores, streaks, accuracy, the stage tally, ranks, high scores (through `E.Arcade`) |
| `33-sim.js` | `WP.Sim`: one operation's run. `step(dt, frames)`, beats and spawns, quotas, reinforcements, boss trigger, clear or fail, `events`, `snapshot()` |
| `34-mirror.js` | `WP.Mirror`: a hub client's world, rebuilt from snapshots and events, with the same read interface as `WP.Sim` |
| `40-stages-common.js` | layout helpers (rows of palms, fence runs, sandbag lines, hut rows, tree walls), floor painters, sky specs, beat macros |
| `41-op1.js` … `46-op6.js` | the stage data, one operation per file (8.6) |
| `47-cutscenes.js` | briefing, interrogation, Kennel aftermath, takeoff cut, ending variants, as scripts |
| `50-art-shapes.js` | new `E.SHAPES` entries, materials and patterns (9.1) |
| `51-art-rigs.js` | Humanoid and Blob presets per type and cast member, the rig pool, custom poses (9.2) |
| `52-art-sprites.js` | string sprites (pickups, projectiles, icons, emblems) and procedural sprites (muzzle flashes, explosion frames) |
| `53-fx.js` | world FX particles (drawn through `m7.add`), floor decals; screen FX (grade, darkness mask, rain, vignette, flashes, hit markers, floating numbers, threat arrows) |
| `54-render.js` | the frame: gather scenery (culled), entities and FX → `m7.draw`; post; telegraph rings; crosshairs |
| `55-gun.js` | the first-person SMG overlay: model, recoil, reload, FURY glow, grenade hand |
| `60-audio.js` | sound definitions, loops (rotors, engines, rain), the mixer, the rumble map |
| `61-music.js` | songs as data; the music director (layers by intensity, ducking under radio lines) |
| `62-voice.js` | the gibberish voice synth, speaker profiles, barks, the howl, radio crackle; the Dialog hook |
| `70-hud.js` | the canvas HUD (10.3) |
| `71-screens.js` | canvas screens: title, squad, map, briefing, op card, tally, continue, ending, credits, initials, About, the touch notice, the hub card |
| `72-shell.js` | the `E.Shell` theme, 10-foot CSS, pause items, game settings, help |
| `73-devmode.js` | the dev screen and the dev overlay (section 11) |
| `80-bot.js` | `WP.Bot`, the AI player (attract mode, autopilot, tests) |
| `81-attract.js` | the attract playlist and controller (`E.Arcade` phases) |
| `90-net.js` | the AI Hub session: roles, card, start, inputs, snapshots, events, interpolation, finish (13.2) |
| `91-codec.js` | compact encoding, the size guard, the rate limiter |
| `95-scenes.js` | the scene table, flow and deep links (6.4) |
| `99-main.js` | `new E.Game`, boot steps, settings, the debug handle, start |

### 6.3 Layers and the one rule that keeps them testable

- **The Sim** (`WP.Sim` and `20`–`33`) holds all game state and rules. It is deterministic: fixed steps, its own seeded
  streams, no `Math.random`, DOM, audio or rigs. Each step it takes one `InputFrame` per player:
  `{ x, y (crosshair in buffer px, floats), fire (held), grenade, reload, snap (presses this step), device }`. Every
  noteworthy thing becomes an event in `sim.events` (`{ k: 'kill', id, by, part }`, `shot`, `hit`, `pickup`, `damage`,
  `explode`, `spawn`, `telegraph`, `radio`, `boss`, `clear`, …).
- **Presentation** (`50`–`72`) reads a world (a `WP.Sim`, or a `WP.Mirror` on a hub client) and consumes its events for
  sound, FX, rig poses and the HUD. Rig posing happens in `update` (the engine's rule: draw only draws), but it is
  cosmetic and never feeds back into the Sim.
- **Players** (`30`) turn devices, the bot or the network into `InputFrame`s. Tests can inject frames directly:
  `WP.Players.override(pid, fn)`.
- **Net** (`90`, `91`) moves `InputFrame`s from clients to the host, and snapshots and events from the host to clients.

Hit tests run inside the Sim, on the Sim's own `WP.View3D` (a second `E.Mode7` used only for its math:
`m7.begin({ W: 480, H: 270 }, cam)`, then `project` and `toFloor`). It is built from the same camera as the renderer's
`E.Mode7`, so what you see is what you hit, headless included.

### 6.4 Scenes, flow, deep links

Scenes (`game.start({ scenes, scene: 'boot', boot: { steps } })`):
`boot` → `hubcard` (sessions only) or `title` ⇄ `attract` (demo, then the high-score table) → `squad` (optional co-op lobby) →
`briefing` → `map` → `opcard` → `play` (`pausable: true`, except in sessions) → `tally` → (`cutscene`) → `map` → … →
`ending` → `credits` → `initials` → `title`. Also `continue` (game over), `about`, `range` (dev target practice), and
`touch` (the touch-only notice, laid over `title`).

Deep links, for the tools and tests (read from `location.hash` at boot): `#title`, `#attract`, `#about`, `#map`, `#op1` …
`#op6`, `#op3/boss`, `#op6/b` (the takeoff segment), `#cut/interrogation`, `#ending/0` … `#ending/5`, `#range`, `#dev`
(play with the dev screen open).

### 6.5 Engine usage and engine changes

What the game uses from the engine: `E.Game` (fixed 1/120 s steps, scenes, fades, `flash`/`shake`/`freeze`/`timeScale`,
`script`/`tween`/`after`/`every`, `advance` and `debug` for tests), `E.Mode7`, `E.Backdrop`, `E.Humanoid` and `E.MOVES`,
`E.Blob`, `E.SHAPES` with `E.MATERIALS` and `E.PATTERNS` (`docs/ASSETS.md`), `E.sprite`/`E.anim`/`E.recolor`, `E.px.*`
including `px.blend`, `px.ddisc` and `px.polyDither`, `E.font`, `E.ui`, `E.Dialog` (portraits, non-modal radio), `E.Menu`,
`E.Shell` (pause, settings, controls, help, the dev screen), `game.settings` (`define`, `set`, `reset`), `game.input`
(`pressed`, `down`, `held`, `pointer`, `padMove`, `padAim`, `label`, `glyphs`, `lastDevice`, `rumble`, and `tap`/`hold`/
`feed` for tests), `game.allowJoin`/`addPlayer`/`players`, `E.Arcade` (cards, tables, initials, continue, attract phases),
`game.audio` (`sfx`, `define`, `music` with tracks and layers, `duck`, `sting`), `E.rng`, `E.noise2`, `E.tex.*`, `E.arc`,
`E.Path`, `E.store`, `E.versionLabel`. Look names up in `API-INDEX.md` (grep it; don't read it whole); `API.md` is the
card to read whole.

Engine edits, each logged in `engine/CHANGES.md`:

1. **Dialog voice as a function.** At the per-letter blip in `Dialog.update` (around line 8956 of v0.85.2:
   `if (this.voice && …) this.game.audio.sfx(this.voice)`), when `typeof this.voice === 'function'`, call
   `this.voice(ch, index, this)` instead. That is the hook for gibberish voices.
2. **Shell rows screen.** `shell.show(name, spec)` gets `spec.rows`, a list of `[heading, [settingKeys]]` drawn with the
   existing `_row(key)` (sliders, toggles, selects, with pad and keyboard focus), plus `spec.actions` buttons. The
   standard Settings screen skips setting groups listed in `E.Shell.hiddenGroups` (set it to `['Dev']`).
3. **A non-pausing menu for sessions.** `new E.Game({ menu: { pauses: false } })`: the pause and settings screens open
   over a running game, which keeps calling `update`. The game's input is held back while a screen is open, as it is now.
4. **Glyph setting.** The standard `glyphs` setting (around line 2999) defaults to `'playstation'`, with options
   `[['playstation', 'PlayStation'], ['xbox', 'Xbox']]`.
5. **Stereo pan (optional, nice to have).** `audio.sfx(voice, { pan: -1..1 })` through a `StereoPannerNode`, to place
   gunfire, rotors and explosions left and right.
6. **Anything else you find missing:** extend it in the engine and log it. Don't work around a bug in game code without
   logging it either.

`My3D2dge` loads headless in Node (no DOM). The game must too: guard every DOM use (`typeof document !== 'undefined'`),
and keep the Sim free of it.

### 6.6 Data formats

**Stage definition** (one per `src/4x-opN.js`, pushed onto `WP.STAGES`):

```js
WP.STAGES.push({
  id: 'op1', n: 1, name: 'RADIO HILL', card: 'DESTROY THE ENEMY RADIO STATION', music: 'op1', time: 'dawn',
  sky: { sky: ['#1d1a3a', '#7a3f6e', '#e88a6a', '#f6c48c'], sun: { x: .7, y: .62, r: 18, color: '#ffd6a0' },
         layers: [{ kind: 'mountains', color: '#5a3a5e', y: .58, height: .12, parallax: .1 }, { kind: 'sea', color: '#8a5a7a', y: .66 }] },
  fog: { color: '#e0a07c', near: 320, far: 1600 }, grade: { mul: '#ffe6d6', add: '#100008' },
  floor: 'hill',                        // a painter in WP.FLOORS: (x, y, t) => [r, g, b]
  cam: { h: 28, pitch: 6, fov: 60 },
  rail: [{ d: 0, x: 0, y: 0, angle: -Math.PI / 2 }, { d: 2700, x: 2700, y: 0 }],   // knots: position and tweened angle/h/pitch/fov
  speed: 16,                            // units a second, times WP.T.railSpeed
  holds: [{ d: 520, until: 'beat:b6', max: 15 }, { d: 1720, until: 'air', max: 30 }, { d: 2700, until: 'boss' }],
  scenery: [['shape', 'radioMast', 900, -380, 0, { facing: 0 }], ['row', 'palm', 0, 2700, -900, { every: 60, jitter: 20 }]],
  props: [['sandbags', 'sbA', 160, -110], ['crate', 'c1', 420, -120, { drop: 'mag' }], ['mast', 'm1', 900, -380]],
  beats: [{ id: 'b1', at: 0, radio: 'op1.go' },
          { id: 'b2', at: 40, spawn: [['rifleman', { side: 'R', dz: 200, n: 3, gap: .8, path: 'cross' }]] }],   // ids follow 8.6's table order
  quotas: { soldier: 36, vehicle: 3, air: 1 }, objective: { kind: 'masts', ids: ['m1', 'm2', 'm3'] },
  boss: 'bigEar', perk: 'commsDown', clearHeal: 10, animals: ['goat'],
  attract: [{ from: 'b4', seconds: 25 }]  // the attract mode's segment of this op
});
```

- Spawn positions are given **in the camera's frame at the moment the beat fires**: `lx` (sideways, + right), `dz` (depth
  ahead), `z`. `side: 'L' | 'R'` puts the spawn just off that edge: `lx = ∓(halfWidth(dz) + 30)`. They become world
  positions at once, so they parallax, unless `anchor: 'cam'`, which keeps them in the camera's frame (river pursuers, the
  takeoff chase, the gunship).
- Paths: a named behavior (`'cross'`, `'popup'`, …) or a list of `[lx, dz]` waypoints in the same frame. Cover references
  name a prop id.
- Beats fire when the rail passes `at`, or `after: 'b5'` (that beat is cleared), plus an optional `delay`.

**Type registry** (`WP.TYPES[id]`): `{ kind: 'infantry' | 'vehicle' | 'air' | 'boat' | 'boss' | 'civilian' | 'hostage' |
'animal' | 'projectile' | 'pickup' | 'prop', quota: 'soldier' | 'vehicle' | 'air' | 'boat' | null, hp, score, h (height
in units), rig | shape | sprite, behavior, fire: { telegraph, bullets, accuracy, damage } | throws: {...}, weak: [...] }`.
The bestiary tables in section 8 are the source of these values.

**Text:** `WP.TEXT['op1.go'] = { who: 'DEN', text: 'OPERATION WOLFPACK IS GO. GOOD HUNTING.' }`. Speakers map to voice
profiles and portraits.

**Designer tools.** Stage data are plain arrays, and the dev screen can print a ready-to-paste spawn or prop line for the
point under the crosshair (section 11). New operations are new data files; new enemies are new `WP.TYPES` entries with a
behavior. That is what lets the rest of the game be built out later with normal designer tools.

### 6.7 The debug handle (for the tests and the engine's tools)

```js
game.debug = {
  snapshot: () => ({ scene, op, beat, d, hold, quotas, boss: { id, phase, hp }, players: [{ pid, x, y, damage, mag, spares, grenades, score, streak, down }],
                     counts: { enemies, projectiles, pickups, civilians, hostages }, hostagesSaved, events: lastN, dev: changedKeys, errors: game.errors.length }),
  jump: (op, beatOrD) => {}, cheat: (name, on) => {}, tune: (key, value) => {}, spawn: (type, opts) => id,
  aim: (pid, x, y) => {}, frames: (pid, fn) => {}, sim: () => currentSim, hub: () => WP.Net.state
};
```

---

## 7. Systems (exact rules and numbers)

Numbers are VETERAN defaults. The live ones live in `WP.T`; section 11 lists the sliders. The difficulty and co-op
multipliers of 7.16 apply on top.

### 7.1 Rail camera (`11-rail.js`)

- Rail knots become an `E.Path` (catmull). The camera's distance `d` advances at `speed × T.railSpeed` and eases to 0
  over .6 s at a **hold** (and back up over .8 s after it). Holds wait for `until`: `beat:<id>` (that beat's enemies are
  dead or gone), `vehicle`/`air`/`boat` (that quota's live units are gone), `escort` (the escort is resolved), `quota` (all
  quotas met), or `boss` (the boss is dead). A hold with `max` lets go after that many seconds; a unit still alive then
  leaves and comes back in the reinforcement loop (7.14).
- Per-knot tweens: `angle` (yaw), `h`, `pitch`, `fov`. River bob: `h ± 1.2` and `pitch ± .5°` at .35 Hz. Walking sway on
  land: `h ± .4` at the step rate (1.6 Hz), and no sway while held.
- **Segment cuts** (Op 6's takeoff): `rail.cut(nextRail, { fade: 'wipe' })` swaps rails behind a .4 s transition.
- Camera shake is the engine's `game.shake` (screen space), scaled by the standard shake setting.

### 7.2 Projection and hit testing (`10-view3d.js`, `12-hit.js`)

- At the start of every step: `view.begin(cam)`. Every hittable thing produces **hit shapes** in buffer pixels, each with
  a depth (distance along the view direction).
  - **Humanoids** (standing height `h` from the calibration table, 9.2): head is a circle at `z + .885h`, radius `.085h`;
    body is a rectangle from `z + .45h` to `z + .80h`, half-width `.17h`; legs are a rectangle from `z` to `z + .45h`,
    half-width `.12h`. Kneeling: heights × .72. Behind cover: anything below the cover's top `z` is removed. In a window or
    door: everything is clipped to the opening's projected rectangle. Dying: no shapes. Minimum size: body 4×8 px, head
    radius 2 px.
  - **Vehicles, boats, aircraft:** the convex hull of the 8 projected corners of the hull box, plus each weak point as a
    circle (a local offset turned by facing, radius in units, at least 4 px).
  - **Projectiles and pickups:** circles, radius `r × k`, at least 5 px for projectiles and 6 px for pickups (fairness).
  - **Cover and props:** a hull of the projected box. Cover stops bullets; props take damage.
- **A shot** at point `p` (the crosshair plus bloom, 7.4) hits the **nearest** shape containing `p`. If that is cover, the
  bullet stops there (sparks or dust). With no shape, the floor point `toFloor(p)` gets a dust puff, or nothing if `p` is
  above the horizon.
- **Explosions** query by world distance (3D) to every entity and prop, civilians and hostages included.
- **Calibrate in M0:** draw each rig preset with the engine at view scale 1, in standing, kneeling and crouching poses, to
  an offscreen canvas; measure the bounding box; and write `WP.RIG_H` from it. A dev toggle draws every hit shape over the
  scene to check alignment (section 11).

### 7.3 Crosshair and aiming (`30-players.js`)

- **Mouse:** absolute. The crosshair equals the pointer, clamped to the playfield. Mouse play gets no aim assist.
- **Stick:** velocity = `T.padSpeed` (520 px/s) × setting multiplier (.5–2) × `curve(|s|) = |s|^2.0`. After .3 s held
  above .95 deflection, ×1.5 (turbo). Stick vector = left + .5 × right (`input.padMove`, `input.padAim`). The d-pad nudges
  at 90 px/s.
- **Keys:** 300 px/s, ramping to 520 over .4 s.
- **Aim assist** for pads and keys (`assist` = Off 0 / Low .35 / Medium .6 / High .85; RECRUIT adds .15):
  - *Friction:* inside a hostile's hit shapes grown by 6 px, crosshair speed × (1 − .55 × assist).
  - *Magnetism:* while the stick is moving and a hostile's body center is within 28 px with direction dot > .3, pull
    toward it at 160 × assist px/s.
  - *Snap* (L1/Q): ease .08 s to the highest-priority threat (a projectile about to hit, then the telegraph closest to
    firing, then the nearest hostile), preferring the stick's direction. .2 s cooldown.
  - Never toward civilians, hostages or animals.
- Co-op start positions: P1 at 42% of the width, P2 at 58%, P3 at 30%, P4 at 70%, all at 55% of the height.

### 7.4 Weapon: the WOLF-9 SMG (`31-weapon.js`)

- **Fire:** `T.fireRate` 11 rounds a second while fire is held. The first round fires on the press step; the rest follow
  on a fixed interval, so the count is exact for the tests.
- **Bloom:** offset radius `T.spreadBase` 1.5 px, +`T.bloomPerShot` .8 px a shot, up to `T.bloomMax` 7 px, recovering at
  18 px/s. Each shot's offset comes from the `sim` stream (uniform in a disc).
- **Damage:** `T.bulletDmg` 1 a hit; a head hit does ×2, and ×4 on BRUTES and TUSK.
- **Magazines:** `mag` (rounds in the gun, `T.magSize` 30) and `spares`, a list of round counts (start 5 full spares, so 6
  magazines; pouch limit `T.maxMags` 9, or 11 after Op 4's perk). **Reload** (`T.reloadTime` 1.0 s) loads the fullest
  spare; a part-used magazine goes back into the pouch with its rounds (no waste, no merging). Auto-reload starts .12 s
  after the gun runs dry. Manual reload works whenever `mag < magSize` and a spare exists. Firing on empty clicks.
- **FURY** (pickup): `T.furySeconds` 10 s, fire rate ×2, damage ×1.5, no ammo used, golden tracers, a music sting, and a
  ring timer around the crosshair.
- **Accuracy stat:** shots that hit a hostile, projectile, pickup or prop ÷ shots fired.
- **Tracers and impacts:** each round draws a 1-frame tracer from the gun's muzzle (the overlay, or the player's edge of
  the screen in co-op) to the impact point, plus impact FX by material (dust, sparks on metal, splinters on wood, splashes
  on water).

### 7.5 Grenades and explosions

- Start with `T.startGrenades` 4; pouch limit 9. On a press, the target is the entity under the crosshair (its 3D point,
  so helicopters can be air-burst) if it is within `T.grenadeRange` 420 units. Otherwise it is the floor point under the
  crosshair, clamped to range; above the horizon, the point at range along the view ray.
- Flight time `.55 + .0015 × distance` s along an `E.arc` lob from the camera's lower front (`h − 6`). A small sprite
  spins on the way, with a shadow dot on the floor. You can't throw another for .5 s.
- **Blast:** radius `T.grenadeRadius` 52 units, damage `T.grenadeDmg` 12 at the center falling to 6 at the edge. Every
  infantry type inside dies except BRUTES, which take the damage. Vehicles and weak points take the damage. Enemies within
  1.5 × radius are stunned for 1 s. **Civilians and hostages inside are hurt** (penalties apply). Props in range take the
  damage, which chains barrels and tanks. Supply animals in range drop their items and flee.
- **Explosion feel:** a fireball, smoke, debris and a shock ring on the floor; `game.flash('#fff0c0', .08)`; `game.shake(3)`;
  .04 s hit-stop (`game.freeze`); rumble; boom plus a low sine thump.
- **DYNAMITE** (pickup, shot to trigger): a screen-wide blast. Every non-boss enemy in view dies; vehicles and bosses take
  30; **civilians and hostages in view take a penalty hit each**. White flash, big shake.

### 7.6 Enemy AI (`21-infantry.js`, `22-enemyfire.js`)

Each infantry entity runs a small state machine: `enter` → `move` → `cover`/`stand` → `telegraph` → `attack` → `recover`,
repeated `cycles` times, then `exit` (runs off) or `advance`. Its reactions: `hurt` (a .25 s flinch that cancels a
telegraph; for HP > 1 types), `stun` (1 s, from nearby grenades), and `die` (the `die` pose; the body falls and fades after
2.5 s). Speeds: walk 32, run 70, sprint 110 u/s.

| Behavior | What it does |
|---|---|
| `cross` | runs from one edge to the other at a depth; with `stops`, stops once or twice to fire |
| `sprint` | a fast cross that never fires (quota fodder, and practice) |
| `popup` | hides behind a cover prop and stands every 2–3 s to fire (`cycles` 2–4); between pops only the head shows |
| `window` / `door` | the same inside a building opening, clipped to it (shutters open first: .3 s) |
| `advance` | walks toward the camera to depth 70, then fires (or throws knives) from there |
| `para` | parachutes from z 160 at 22 u/s. The chute (2 px+ circle above) and the body are both hittable; a shot chute drops him fast to his death. On landing he becomes `cross` |
| `dismount` | leaves a truck, APC or boat and fans out (`cross` or `popup` on nearby cover) |
| `chase` | follows a hostage; within 10 units for 1 s he grabs and drags the hostage back (7.11) |
| `mortar` | a crew of two behind sandbags far away; launches every 6 s |
| `snipe` | stationary at a tower, window or tree; a lens glint telegraph |
| `officer` | blows a whistle for 2 s (an icon over his head); if he finishes, 3 riflemen arrive (2 after Op 1's perk). Kill him during the whistle to cancel it |

**Enemy fire** (`22-enemyfire.js`):

- When the telegraph starts, the enemy picks a target player: a random living one, from the `ai` stream. The ring is drawn
  in that player's seat color, so in co-op everyone sees who is targeted. Ring radius 22 → 6 px over the telegraph time,
  shifting yellow → orange → red, with a tick that rises in pitch.
- When it closes, if the enemy is alive and not stunned, it fires `bullets` hitscan rounds .1 s apart. Each one hits with
  chance `accuracy(type) × depthFactor × difficulty × T.enemyAccuracy × spotted` (`depthFactor`: 1 at depth ≤ 150, falling
  linearly to .55 at 500 and beyond; `spotted` is 1.5 while a searchlight is on the camera). A hit adds `damage ×
  T.enemyDamage` to the target. Hit or miss, the enemy shows a muzzle flash and a tracer to the screen's lower edge; a miss
  makes a whiz.
- Direction cue: every hit flashes a red arc on the screen edge toward the shooter (left, right or center).

### 7.7 Projectiles (`23-projectiles.js`)

| Kind | Thrown or fired by | Motion | Flight | Shootable | Damage | Intercept score |
|---|---|---|---|---|---|---|
| grenade | GRENADIER, boss decks | an `E.arc` lob to a point 12 units in front of the camera (±20 sideways) | 1.3 s | yes, 1 hit, r 4 | 12 | 50 |
| knife | KNIFE | straight and spinning (the sprite's `rot`) | .65 s | yes, 1 hit, r 3 | 8 | 100 |
| rocket | RPG, APC, BIG EAR, IRON HOG | straight, ±2 u wobble, a smoke trail | 1.6 s | yes, 1 hit, r 4 | 16 | 150 |
| missile | VULTURE, HYENA ONE | slight homing toward the camera | 1.8 s | yes, 1 hit, r 4 | 18 | 200 |
| mortar shell | mortar crews, CROCODILE, IRON HOG | a high arc from far away, a falling whistle, a landing marker on the HUD's top edge | 2.6 s | yes, 1 hit, r 4 | 14 | 100 |
| tank shell | MAULER, WARTHOG's cannon, HYENA ONE's nose cannon | fast and straight, a big glow | .8 s | yes, 2 hits, r 6 | 22 | 250 |
| flame wave | WARTHOG | rolls along the ground toward the camera | 1.2 s | no (stop it at the source) | 15 | n/a |

A projectile "hits" when its depth drops below 14. Shot down, it pops in the air (a small explosion, or sparks for a
knife), scores, and counts as an intercept (a stat and an award).

### 7.8 Vehicles and aircraft (`24-vehicles.js`)

Vehicles are shapes-as-data drawn by `m7.shape` (quantized to 16 facings), moving along paths, with overlays for moving
parts (wheels, rotors, turrets as separate shapes with their own facing, dishes, propellers). Damage states: under 50%
smoking, under 25% burning, at 0 an explosion chain (3 blasts over .6 s, `explosion(..., { debris })`). The wreck (charred
materials) stays as cover for 6 s, then fades (on water, it sinks). A vehicle with a gunner (a separate rig, HP 1) stops
firing when the gunner dies. Vehicles that leave the screen alive come back in the reinforcement loop.

### 7.9 Bosses (`25-bosses.js`)

The boss framework is `{ phases: [{ weak: [...], attacks: [...], onEnd }], intro, defeat }`. The boss bar is the sum of
the current phase's weak points. Weak points that can be hurt blink at 3 Hz with a white outline; armored parts spark and
show "ARMORED" once. Intro: a klaxon, the card `WARNING!` + name (`E.Arcade.card`), a radio line, music to `boss`.
Defeat: .5 s at `timeScale .3`, the explosion chain, a white flash, a victory sting, then the tally. Each boss is in 8.7.

### 7.10 Player damage, DOWN, continue

- `damage` runs 0–100; at 100 the player is **DOWN**. Solo: a death beat (camera h → 8 and pitch −10 over .8 s, a red
  tint, a fade), then **CONTINUE?** (`E.Arcade.continue(10, done)`). Continuing restarts the current operation from its
  start, with damage 0, the score kept, `continues + 1` (it affects the rank), and the ammo the player had when the op
  began (at least 4 magazines and 3 grenades). Without a continue comes the GAME OVER card ("THE HUNT IS OVER... FOR
  NOW." and the score), then initials if the score qualifies, then the title. This is not the 0-hostage ending, which
  only follows Op 6.
- **Co-op:** a DOWN player's crosshair turns grey and their panel shows "DOWN". They come back at the next operation with
  damage 50. All players DOWN brings up the continue screen for everyone.
- **DRY rule** (mag 0, no spares, no grenades). On ARCADE it is the source's rule: DOWN. On VETERAN and RECRUIT an
  **emergency drop** parachutes in within 4 s and delivers 2 full magazines to that player when it lands (score −2000,
  "RESUPPLY FEE"), at most once every 30 s. RECRUIT also refills a 15-round magazine 3 s after going dry.
- Healing: RATION −15, MEDKIT −35, stage clear −`clearHeal` (10; Op 3: 40).

### 7.11 Civilians, hostages, animals (`26-friendlies.js`)

- **Civilians** (villagers, medic pairs with a stretcher, a reporter) cross on paths and **panic** when shots land within
  40 units: they run 1.5× faster with their hands over their heads. **A player hit** on a civilian adds `T.civilianDamage`
  (8) to that player, costs 1000 points and the streak, and shows a big red "CIVILIAN HIT!". The civilian falls (wounded,
  not killed), crawls off-screen and doesn't return. A civilian who crosses unharmed while enemies are on screen tosses a
  small gift 10% of the time ("THANK YOU!": a RATION or MAG).
- **Hostages** (Ops 5 and 6): each has HP 3 against enemy fire, shown as pips over its head. A player hit costs +10
  damage, −2000 points and −1 hostage HP. Each hostage follows an escort path at 46 u/s. A `chase` enemy within 10 units
  for 1 s **grabs** it and drags it back toward its spawn at 20 u/s; shoot him within 3 s and the hostage runs on, or it is
  **lost**. At 0 HP it falls and is lost. Reaching the goal counts it rescued (+5000, a cheer, its portrait lit on the HUD).
- **Supply animals** (never killed): goats, chickens, pigs, parrots, monkeys, seagulls, built with `E.Blob`. Any hit or
  nearby blast makes one squawk, drop the item it carries (shown as a pack on its back or a bundle in its beak), and bolt.
- **Friendly markers** (setting, on by default): a small green ▼ over a civilian or hostage while a crosshair is within 36
  px of it.

### 7.12 Destructibles and cover (`27-props.js`)

| Prop | HP | Blocks shots | On destruction |
|---|---|---|---|
| wooden crate | 3 | no | splinters; drop roll (60%) |
| ammo crate (olive, stenciled) | 3 | no | drop from {MAG 50, AMMO CRATE 20, GRENADE 20, GRENADE BOX 10} |
| red fuel barrel | 4 | no | explosion r 48, damage 10 (it chains) |
| sandbag wall | 40 (grenade 15) | yes, below its top | chips through 3 visual stages; gone at 0 |
| wreck | n/a | yes | fades after 6 s |
| radio mast (Op 1) | 25 at its junction box | no | sparks, then topples over 1.2 s (shape tilt steps), dust |
| fuel tank (Op 4) | 20 | yes | a big explosion r 90, damage 20, chains |
| searchlight (Ops 5, 6) | 2 | no | glass pops; its beam goes out |
| bridge rope (Op 2) | 6 each end | no | the bridge drops: every soldier on it falls (+300 each, "BRIDGE OUT!") |
| ammo wagon (Op 4) | 4 | no | explosion r 70, damage 30 (hits the train car next to it) |
| window shutters | 1 | no | swing open (snipers can't hide behind them) |

### 7.13 Pickups and the supply director (`28-pickups.js`)

| Pickup | Sprite | Effect | Where it comes from |
|---|---|---|---|
| MAG | olive magazine | +1 full spare (at the pouch limit: +300 points) | crates, animals, gifts, carriers |
| AMMO CRATE | stenciled box | +3 full spares | ammo crates, supply parachutes |
| GRENADE | pineapple | +1 grenade | crates, animals |
| GRENADE BOX | box of 3 | +3 grenades | ammo crates, monkeys |
| RATION | tin | damage −15 | crates, animals, gifts |
| MEDKIT | white box, green cross | damage −35 | rare; more after Op 3's perk |
| FURY | golden SMG | FURY mode for 10 s (7.4) | rare; scripted once per op |
| DYNAMITE | bundle of red sticks | screen blast (7.5) | scripted, once per op from Op 3 |
| FLARE | red flare | lights the night scene for 12 s and outlines snipers (Op 5) | Op 5 crates |
| INTEL | folder | +1500 | officers, the reporter |
| WOLF FANG | white fang | +500 | rare animal drop |

- Dropped items pop up, bounce twice, hover with a glow, last 6 s (blinking for the final 1.5), and are collected by
  shooting them once. In co-op, the player who shot it gets it.
- **Supply director** (`loot` stream, deterministic): a crate's base drop chance is 60%, and carriers always drop.
  Weights adjust to need: lowest player's total rounds (mag + spares × 30) under 60 → MAG ×3; grenades 0 → GRENADE ×2;
  damage over 60 → RATION/MEDKIT ×2. At most one FURY per beat. Below 1 magazine and 0 grenades, a **supply parachute**
  (AMMO CRATE) arrives mid-screen within 2 s, at most once every 20 s.

### 7.14 Quotas, beats, reinforcements, clear, perks (`33-sim.js`)

- Quotas count kills by class (`soldier`, `vehicle`, `air`, `boat`) and show as counters counting down. Masts (Op 1) are
  an objective chip.
- **The boss comes when the rail's end is reached and every quota is met.** When a quota is met early, its counter shows a
  check and later spawns still score. When the rail ends with quota left, the **reinforcement loop** runs at the final
  hold: every 3–5 s it spawns from a weighted list biased toward the missing classes (a jeep if vehicles are missing, a
  VULTURE if air is) until the quotas are met, with a radio line: "MORE OF THEM ARE COMING!". Scripted spawns total about
  quota ÷ .85, so a careful player needs few or no reinforcements.
- Enemies that leave the screen (more than 60 px past the edge for 2 s) despawn as escaped, which doesn't count toward the
  quota.
- **Clear:** the tally (10.2 `tally`), then the perk card, then the heal, then the map.

| Perk | From | Effect for the rest of the run |
|---|---|---|
| COMMS DOWN | Op 1 | quotas ×.8 in later ops; whistles call 2, not 3 |
| CAMP LOCATED (intel) | Op 2 | the interrogation; snipers and mortars in later ops show a red marker for their first 1.5 s |
| VILLAGE LIBERATED | Op 3 | damage −40 now; MEDKIT weight ×2 |
| SUPPLIES SEIZED | Op 4 | spares and grenades refilled to the limits now; pouch limit +2 magazines (11) |
| HOSTAGES FREED (n/5) | Op 5 | n hostages come to Op 6 |

### 7.15 Scoring, streaks, ranks, high scores (`32-scoring.js`)

- **Kills:** RIFLEMAN 100, GRENADIER 150, KNIFE 200, BRUTE 500, RPG 300, SNIPER 400, MORTAR 200 each, OFFICER 600,
  PARATROOPER 150 (+100 while airborne). Jeep 1000, truck 1200, APC 2000, tank 3000, skiff 800, patrol boat 1500, VULTURE
  3000. Bosses 10000 (Op 1) to 30000 (Op 6). Headshot +50%. Intercepts per 7.7.
- **Streak:** +1 a kill; multiplier = 1 + ⌊streak ÷ 8⌋, at most ×4. Taking damage, or hitting a civilian or hostage,
  resets it; so do 4 s without a kill. At ×4: "PACK FURY!" and a howl.
- **Tally per op:** soldiers and vehicles, accuracy (accuracy% × 100 × op number), headshots × 200, intercepts × 100,
  CIVILIANS SPARED +5000 (or −1000 for each hit), op bonus 10000 × op number, hostages × 5000 (Ops 5, 6). One line at a
  time, big numbers.
- **Ranks:** ALPHA WOLF (5 hostages, 0 continues, accuracy ≥ 55%), PACK LEADER (≥ 4 hostages), TIMBER WOLF (≥ 3), LONE
  WOLF (1–2), WOLF PUP (0). Loop 2 and later put `BLACK MOON` before the rank.
- **High scores:** `E.Arcade` (`id: 'wolfpack'`, mode `'campaign'`; Mission Select uses `'op1'` … `'op6'`), top ten with
  initials on the letter wheel. In co-op, everyone who qualifies enters theirs in turn. Hub rounds save nothing (the hub
  gives the game a throwaway storage anyway).

### 7.16 Difficulty and co-op scaling (`01-tuning.js`)

| | RECRUIT | VETERAN (default) | ARCADE |
|---|---|---|---|
| Enemy accuracy | ×.6 | ×1 | ×1.25 |
| Telegraph time | ×1.35 | ×1 | ×.85 |
| Enemy damage | ×.7 | ×1 | ×1.2 |
| Drop chances | ×1.4 | ×1 | ×.8 |
| Quotas | ×.85 | ×1 | ×1.1 |
| Aim assist | +.15 | ±0 | magnetism off |
| DRY | refill after 3 s + emergency drop | emergency drop | DOWN (the source's rule) |

Co-op with n players: quotas and spawn counts both × (1 + .3(n − 1)) (rounded, deterministic, so the quota-to-spawn
ratio stays about .85), and each player has their own damage, ammo, grenades and score. Loop 2 and later: ARCADE multipliers × 1.15 on top of the chosen level.

---

## 8. Content

### 8.1 Setting and cast

- **The Brimstone Coast:** a fictional tropical coast under a smoking volcano, Mount Brimstone. Jungle, mangrove rivers,
  fishing villages, a munitions depot, an old cliff-top prison, an airfield. The time is unstated; the feel is 1987.
- **General Hugo Kragg, "the Hyena":** a bulky mercenary general with a peaked cap, a greatcoat and gold trim. He laughs a
  high hyena cackle and rides the gunship HYENA ONE.
- **The Hyena Legion:** tan uniforms with brown spots (a custom `spots` pattern), red armbands with a grinning hyena
  emblem (original art), caps, helmets and bandanas.
- **The Wolfpack:** callsigns only. WOLF 1 **LOBO** (the leader; red headband, black hair, stubble), WOLF 2 **FANG**
  (backward cap, crew cut), WOLF 3 **TUNDRA** (white ponytail, green beret), WOLF 4 **MOONSHINE** (yellow bandana). Solo,
  you are LOBO.
- **DEN MOTHER:** the handler on the radio (grey short hair, green beret, coat).
- **MAJOR TUSK:** the warden of the Kennel (bulky, helmet, armor, a riot shield).
- **PRIVATE GIGGS:** a nervous Hyena who giggles under interrogation.
- **The five hostages** (relief convoy, each with its own clothes and colors, hands bound): DR. AMARA OKONJO (a doctor;
  white coat), HAL BRODY (an engineer; glasses, rolled sleeves), LUCIA MARCH (a reporter; vest), "SKIP" TANAKA (a pilot;
  flight jacket; aboard OLD HOWLER, he takes the co-pilot's seat in the ending), AMBASSADOR GRANT WHITFIELD (a torn suit).
- **OLD HOWLER:** the Wolfpack's twin-prop cargo plane with a rear ramp.

### 8.2 Writing style (like the source's)

ALL CAPS for cards, radio subtitles and HUD words. Short lines: 2–9 words, at most 2 lines per box. Plain military words
(COPY, INBOUND, MOVE OUT). Exclamations for alerts. Now and then a little of the stiff, earnest 80s arcade-translation
voice ("ENEMY AIR SUPPORT IS COMING!", "YOU ARE OUR LAST HOPE."), charming and never mocking. The villain is theatrical
and laughs. Nothing graphic. Every line has a speaker, a gibberish voice and a subtitle (the text is the subtitle). Every
string lives in `WP.TEXT`.

### 8.3 Story beats and key lines (these exact lines; add more in the same voice)

- **Intro (`briefing`, skippable):** cards over a slow pan of the coast at night:
  "THE BRIMSTONE COAST." · "GENERAL KRAGG AND HIS HYENA LEGION HAVE TAKEN IT." · "FIVE RELIEF WORKERS ARE HIS PRISONERS." ·
  "NO ARMY WILL GO IN. SO THEY SENT THE PACK."
  DEN: "WOLFPACK, THIS IS DEN MOTHER. YOUR MISSION: RESCUE THE FIVE HOSTAGES." · DEN: "AMMUNITION IS LIMITED. SHOOT
  SUPPLY CRATES TO RESTOCK." · DEN: "DO NOT SHOOT CIVILIANS. GOOD HUNTING." · LOBO: "AWOOOO!" (the howl).
- **Op cards:** OP 1 RADIO HILL, "DESTROY THE ENEMY RADIO STATION" · OP 2 MANGROVE RUN, "BREAK THROUGH THE RIVER PATROL" ·
  OP 3 PALM VILLAGE, "FREE THE VILLAGE. SPARE THE PEOPLE." · OP 4 POWDER KEG DEPOT, "TAKE THE SUPPLIES. BLOW THE REST." ·
  OP 5 THE KENNEL, "RESCUE THE HOSTAGES" · OP 6 LAST FLIGHT OUT, "GET THEM ON THE PLANE".
- **First-time tips** (radio, each once per save; see 8.6): "SHOOT ITEMS TO COLLECT THEM!" · "GRENADE INCOMING! SHOOT IT
  DOWN!" · "{reload} TO RELOAD. DON'T RUN DRY!" · "{grenade} THROWS A GRENADE." · "KNIVES CAN BE SHOT OUT OF THE AIR!" ·
  "STOP THAT WHISTLE!" · "BIG ONES GO DOWN FASTER WITH A HEADSHOT." · "CIVILIANS! WATCH YOUR FIRE!" ({reload} and {grenade}
  are `input.label` values, filled in when spoken.)
- **Boss warnings:** "WARNING! SIGNAL TRUCK 'BIG EAR' APPROACHING!" · "WARNING! GUNBOAT 'CROCODILE' DEAD AHEAD!" ·
  "WARNING! HALF-TRACK 'WARTHOG' IN THE PLAZA!" · "WARNING! ARMORED TRAIN 'IRON HOG' INBOUND!" · "WARNING! THE WARDEN, MAJOR
  TUSK!" · "WARNING! GUNSHIP 'HYENA ONE'! KRAGG IS ABOARD!"
- **Clears:** Op 1 "RADIO HILL IS SILENT. THE HYENAS CANNOT CALL FOR HELP!" · Op 2 "THE RIVER IS OURS. AND WE CAUGHT ONE
  ALIVE." · Op 3 "THE VILLAGE IS FREE! THE VILLAGE DOCTOR PATCHES YOU UP." · Op 4 "WE TAKE WHAT WE CAN CARRY. THE REST GOES
  BOOM." · Op 5 "{n} OF 5 HOSTAGES ARE FREE. KRAGG IS RUNNING FOR THE AIRFIELD!"
- **Interrogation (after Op 2, a cutscene in a dim tent: LOBO holds GIGGS by the collar):** LOBO "WHERE ARE THE
  HOSTAGES?" · GIGGS "HEE... HEE... I KNOW NOTHING!" · LOBO "WRONG ANSWER." (a shake, a thump) · GIGGS "OKAY! OKAY! THE
  KENNEL! THE OLD PRISON ON THE CLIFFS!" · GIGGS "BUT THE ROAD GOES THROUGH PALM VILLAGE AND THE DEPOT. YOU WILL NEVER MAKE
  IT!" · DEN "WE WILL SEE ABOUT THAT. WOLFPACK, MOVE OUT."
- **Kragg's taunts (radio, his portrait):** "HA HA HA HA! NOBODY LEAVES MY COAST!" · "RUN, LITTLE WOLVES! RUN!" · "MY
  HYENAS ARE HUNGRY!" · on defeat: "NOOO! MY BEAUTIFUL GUNSHIP!"
- **Hostages:** freed, "YOU CAME FOR US!" · grabbed, "HELP! THEY HAVE ME!" · boarding, "GO, GO, GO!"
- **Endings** (`#ending/n`; each over the plane at sunrise, with the hostages' portraits lit or dark):
  - 5: "ALL FIVE HOSTAGES ARE SAFE. THE COAST IS FREE." · "THE PACK HOWLS AT THE RISING SUN." · "CONGRATULATIONS! YOUR
    MISSION IS A PERFECT SUCCESS."
  - 3–4: "{n} HOSTAGES ARE SAFE. NOT EVERYONE CAME HOME." · "BUT KRAGG WILL NEVER HURT ANYONE AGAIN." · "MISSION
    ACCOMPLISHED."
  - 1–2: "ONLY {n} MADE IT. THE PACK WILL REMEMBER THE REST." · "MISSION OVER."
  - 0: "THE PLANE FLIES HOME WITH EMPTY SEATS." · "THE HUNT IS NOT OVER." · "MISSION FAILED."
  - Then the rank, "THE HUNT CONTINUES..." with the choices **LOOP 2** (keeps the score, harder) and **TITLE**, then the
    credits and initials.

### 8.4 Bestiary: the Hyena Legion (VETERAN values)

| Type | Rig | HP | Behaviors | Attack (telegraph → effect) | Score | Quota | First op |
|---|---|---|---|---|---|---|---|
| RIFLEMAN | Humanoid 1.3, cap, `gun` | 1 | cross, popup, window, door, advance, dismount, chase | 1.3 s ring → 1–3 bullets, accuracy .45, 4 each | 100 | soldier | 1 |
| GRENADIER | 1.3, helmet, no weapon (a grenade sprite at `rig.hand()`) | 2 | popup, roof, cross with stops | `throw` move (.6 s) → grenade | 150 | soldier | 1 |
| KNIFE | 1.25, bandana, a knife sprite at the hand | 1 | popup at depth 55–90, branches (Op 2), doorways | `throw` move (.45 s) → knife | 200 | soldier | 1 |
| BRUTE | 1.55 `bulky`, blond crew cut, helmet off, `gun` | 8 (head ×4) | popup behind sandbags, stand | 1.6 s ring → 5-round burst, accuracy .30, 4 each | 500 | soldier | 1 |
| RPG | 1.3, cap, a tube over the shoulder (custom pose) | 2 | kneel on cover, roof | 1.5 s ring → rocket | 300 | soldier | 4 |
| SNIPER | 1.3, cap, `gun` | 1 | snipe (tower, window, tree) | 2.4 s glint → 1 shot, accuracy .85, 10 | 400 | soldier | 1 |
| MORTAR | two 1.2s behind sandbags | 1 each | mortar | a launch every 6 s → mortar shell | 200 each | soldier | 1 |
| OFFICER | 1.35, peaked cap, coat | 2 | officer (whistle) | 2 s whistle → 3 riflemen | 600 + INTEL | soldier | 1 |
| PARATROOPER | 1.3, helmet, chute sprite | 1 (chute 1) | para → cross | as RIFLEMAN once landed | 150 (+100 airborne) | soldier | 1 |

### 8.5 Vehicles, boats, aircraft

| Type | Shape | HP | Movement | Attacks | Score | Quota |
|---|---|---|---|---|---|---|
| Jeep SCAVENGER | `jeep` + gunner rig | 14 (gunner 1) | crosses at 80 u/s, may stop | gunner: 1.2 s ring → 3 bullets | 1000 | vehicle |
| Truck HAULER | `truck` | 20 | drives in, stops, unloads 4 | none | 1200 | vehicle |
| APC BADGER | `apc` (turret separate) | 32 | crosses at 40, stops | 1.8 s turret glow → rocket; unloads 3 | 2000 | vehicle |
| Tank MAULER | `tank` (turret separate) | 48 | rolls out of a hangar, turret tracks the camera | 2.0 s barrel glow → tank shell | 3000 | vehicle |
| Skiff | `skiff` + 2 gunner rigs | 10 | river: from ahead, from side channels | gunners: 1.3 s rings | 800 | boat |
| Patrol boat | `gunboat` (small) | 26 | river | turret: 1.4 s ring → 4 bullets | 1500 | boat |
| Gunship VULTURE | `heli` + a rotor overlay | 34 | flies in from far at z 60–90, hovers, strafes, leaves when damaged (and returns) | 1.6 s ring → MG burst (6 × 3); missiles every 7 s | 3000 | air |
| Cargo plane | `cargoPlane` | n/a | scenery overhead (Op 4), drops paratroopers and crates | none | n/a | n/a |

### 8.6 The six operations

Every op follows the same frame: the card (3 s, quotas shown with icons), "GO!", the beats, the boss, the tally. Each one
introduces something new so that the whole game teaches itself. Beats are listed by rail distance `d`, and their ids are
`b1`, `b2`, … in table order (the `d 0` row is `b1`). "×n" means count, "@D" means depth, L/R means the edge spawned
from. Scenery positions are world x (along the rail) and depth. Fill every screen: 3–8 props near, a midground and a far
layer. Keep each op's scripted soldiers at about its soldier quota ÷ .85 when you edit beats.

#### OP 1: RADIO HILL (dawn; teaches everything)
- **Look:** a pink and orange dawn; dry hill grass with a dirt road band (depth 70–110) and rocks; a sea and mountains on
  the horizon. Floor painter `hill` (E.tex.grass and E.tex.dirt by noise; the road's ruts). Music `op1` (D minor, 140 bpm).
- **Rail:** sideways from x 0 to 2700 at 16 u/s; cam h 28, pitch 6. Holds at 520 (jeep), 1720 (air), 2700 (boss).
- **Scenery:** sandbag lines (depth 90–130); barbed wire posts; tents (x 300–700 @260); ammo crates; a wrecked jeep (x 1000
  @150, cover); **three radio masts** (x 900 @380, x 1500 @420, x 2150 @360: lattices 130 tall with blinking red lights);
  the radar building with its dish (x 2550 @420); goats (supply carriers) at x 200 and 1200; seagulls; palms and rocks far
  away.
- **Quotas:** soldier 36, vehicle 3, air 1; objective MASTS 3 (scripted: 43 soldiers, 3 vehicles, 1 aircraft). **Boss:**
  BIG EAR. **Perk:** COMMS DOWN.

| d | Spawns | Notes |
|---|---|---|
| 0 | none | card; DEN "OPERATION WOLFPACK IS GO. GOOD HUNTING."; tip chip "AIM · {fire} FIRE" |
| 40 | RIFLEMAN ×3 R @200, cross, gap .8 s | they fire late; the first kills |
| 160 | RIFLEMAN ×2 popup (sandbags sbA @110); goat carrying a MAG @130 | tip "SHOOT ITEMS TO COLLECT THEM!" on the goat's drop |
| 300 | GRENADIER ×1 @160; RIFLEMAN ×2 L @240 cross | tip "GRENADE INCOMING! SHOOT IT DOWN!" |
| 420 | crates ×3 @120 (MAG, GRENADE, RATION) | tip "{reload} TO RELOAD" when below 10 rounds |
| 520 | jeep R @250 with gunner; **hold** ≤ 15 s | tip "{grenade} THROWS A GRENADE." |
| 680 | KNIFE ×1 popup @65 (rock); RIFLEMAN ×2 sprint @300 | tip "KNIVES CAN BE SHOT OUT OF THE AIR!" |
| 820 | mast 1 in view; SNIPER on its platform (z 90); RIFLEMAN ×3 popup by the tents | objective chip MASTS 0/3 |
| 1000 | truck stops @300 → RIFLEMAN ×4 dismount | |
| 1180 | OFFICER @180 (whistle); RIFLEMAN ×2 | tip "STOP THAT WHISTLE!" |
| 1350 | mast 2; MORTAR crew @620 behind sandbags | landing markers |
| 1500 | RIFLEMAN ×4, both edges @150–260; red barrels ×2 beside them | the first barrel chain |
| 1720 | VULTURE from far (z 70); **hold** until air or 30 s | |
| 1900 | BRUTE behind sandbags @170; GRENADIER ×2 @200 | tip "BIG ONES GO DOWN FASTER WITH A HEADSHOT." |
| 2080 | mast 3; PARATROOPER ×4 (from the VULTURE if alive, else a cargo plane) | |
| 2250 | jeep @220; RIFLEMAN ×3; a crate holding FURY @140 | FURY's first showing |
| 2450 | KNIFE ×2 popup @70; RIFLEMAN ×3 | |
| 2700 | **hold**: reinforcements until the quotas are met, then BIG EAR | |

#### OP 2: MANGROVE RUN (misty morning; forward rail on a river)
- **Look:** green mist, a brown-green river with moving ripples (the floor painter reads `WP.time`), muddy banks with
  roots, dense mangroves and palms, ferns. Fog near 200, far 1100. Music `op2` (E minor, 132 bpm, toms).
- **Rail:** forward (north) from y 0 to −3000 at 20 u/s; cam h 20, pitch 4, river bob. Holds at 1000 (air; the boat slows
  to 8 u/s, not a stop) and 2600 (boss, on a sandbar).
- **Scenery:** the river 220 wide (|x| < 110); stilt huts and docks on the banks; wrecked boats; side channels at d 700
  (right) and d 2100 (left); a **rope bridge** at d 1300 (y −1500, z 40, ropes hittable); a waterfall far away at the end;
  parrots and monkeys (carriers) in the trees.
- **Quotas:** soldier 28, boat 6, air 1 (scripted: 33 soldiers, 6 boats, 1 aircraft). **Boss:** CROCODILE. **Perk:** CAMP
  LOCATED (and the interrogation).

| d | Spawns | Notes |
|---|---|---|
| 0 | none | DEN "STAY LOW. THE RIVER IS CRAWLING WITH THEM." |
| 60 | RIFLEMAN ×3 popup in the bank roots @200–260, lx ±120 | |
| 200 | skiff from ahead @400 with 2 gunners, passing on the left | the first boat |
| 380 | KNIFE ×2 dropping from branches @70, lx ±60 | close threats |
| 520 | monkey carrying a GRENADE BOX in a tree; RIFLEMAN ×3 on a dock @250 | |
| 700 | skiff ×2 out of the right side channel @300, crossing | |
| 860 | GRENADIER ×2 on stilt huts @220; crates on the dock | |
| 1000 | VULTURE ahead (z 60) drops PARATROOPER ×3 onto the banks; the boat slows | |
| 1250 | the bridge: RIFLEMAN ×5 on it (z 40) @250 | shoot a rope: "BRIDGE OUT!" |
| 1500 | patrol boat @350; MORTAR bunker on the bank @700 | |
| 1700 | parrot flock (one carries FURY); RIFLEMAN ×4 on the banks | |
| 1900 | skiff; BRUTE and RIFLEMAN ×2 on a barge @300 | |
| 2100 | left channel: RIFLEMAN ×3; SNIPER in a tree @500 | |
| 2350 | KNIFE ×2 @70; red barrels on a floating dock; a skiff from ahead | the sixth boat |
| 2600 | **hold**: reinforcements, then CROCODILE from ahead | |

#### OP 3: PALM VILLAGE (noon; civilians and windows)
- **Look:** bright noon; sand street with cobble patches, whitewashed houses with terracotta roofs, thatched stilt huts,
  market stalls with awnings, laundry lines, a well, palms, a teal sea with fishing boats behind. Music `op3` (G minor, 150
  bpm, syncopated).
- **Rail:** sideways 0 → 3000 at 15 u/s. Holds at 1600 (APC) and 2600 (the plaza, boss).
- **Scenery:** house fronts with **window and door openings** (enemy pop-ups clipped to them); a chapel with a bell tower
  (x 1800 @450, snipers); the plaza with a fountain (x 2600–3000); carts, crates, barrels; chickens and pigs (carriers).
  Civilians: about 20 villager crossings, two medic pairs with stretchers, one reporter.
- **Quotas:** soldier 38, vehicle 4 (scripted: 45 soldiers, 4 vehicles). **Boss:** WARTHOG. **Perk:** VILLAGE LIBERATED
  (damage −40).

| d | Spawns | Notes |
|---|---|---|
| 0 | none | DEN "THE VILLAGERS ARE STILL INSIDE. WATCH YOUR FIRE!" |
| 50 | villagers ×2 fleeing @140; RIFLEMAN ×3 window pop-ups @200 | tip "CIVILIANS! WATCH YOUR FIRE!" |
| 200 | chickens ×3 (MAG, RATION, none); RIFLEMAN ×2 cross | |
| 350 | jeep @230; a civilian crossing in front of it @120 | a line-of-fire test |
| 500 | GRENADIER ×2 on roofs (z 30) @240; medic pair crossing @110 | |
| 680 | OFFICER and RIFLEMAN ×4 popping up behind the market stalls | |
| 850 | pig carrying a GRENADE BOX; KNIFE ×2 from doorways @80 | |
| 1000 | truck → dismount ×4; villagers ×3 run | |
| 1200 | BRUTE in the street @160; the reporter crosses | spare him: "THE PRESS THANKS YOU!" + INTEL |
| 1400 | RIFLEMAN ×5 crossing both ways, with civilians ×2 mixed in | tension |
| 1600 | APC @300 (rockets) → dismount ×3; **hold** ≤ 30 s | |
| 1800 | SNIPER ×2 in the bell tower (z 60) @450; RIFLEMAN ×3 | |
| 2000 | jeep; PARATROOPER ×3 | |
| 2200 | a crate holding DYNAMITE, civilians far off; RIFLEMAN ×6 | tip "DYNAMITE HITS EVERYONE ON SCREEN!" |
| 2400 | KNIFE ×2; GRENADIER ×2; villagers ×2 | |
| 2600 | **hold** (plaza): reinforcements, then WARTHOG | |

#### OP 4: POWDER KEG DEPOT (dusk; explosions)
- **Look:** a purple and orange dusk; concrete and dirt; stacked ammo crates, big red fuel tanks, metal sheds, cranes,
  floodlights coming on, a water tower, embers in the air. Music `op4` (C minor, 146 bpm, industrial noise hits).
- **Rail:** sideways 0 → 3000 at 16 u/s. Holds at 950 and 2000 (air) and 2700 (boss).
- **Scenery:** **railway tracks** at depth 260 along the whole rail (the boss arena), flatcars, three ammo wagons on a
  siding (x 2500–2900 @250), the water tower (x 1600 @400), a warehouse with doors (x 2400 @300), barbed wire, a cargo
  plane overhead at d 560.
- **Quotas:** soldier 37, vehicle 3, air 2 (scripted: 43 soldiers, 3 vehicles, 2 aircraft). **Boss:** IRON HOG.
  **Perk:** SUPPLIES SEIZED.

| d | Spawns | Notes |
|---|---|---|
| 0 | none | DEN "THIS PLACE IS A POWDER KEG. LIGHT IT UP!" |
| 60 | RIFLEMAN ×4 cross @220 beside fuel tank A | shoot the tank: a chain |
| 220 | RPG ×2 kneeling on crates @200 | the first RPG troopers |
| 400 | jeep @240; MORTAR crew @650 | |
| 560 | the cargo plane drops PARATROOPER ×5 and a supply chute (AMMO CRATE) | |
| 760 | BRUTE and RIFLEMAN ×3 behind sandbags @150 | |
| 950 | VULTURE #1; **hold** ≤ 25 s | |
| 1150 | a forklift carrying a GRENADE BOX crate crosses @160; RIFLEMAN ×3 | |
| 1350 | APC @300 → dismount ×3 | |
| 1600 | SNIPER on the water tower (z 70); RIFLEMAN ×4 | |
| 1800 | a row of 3 fuel tanks with RIFLEMAN ×6 beside them | "CHAIN!" bonus +1000 for 4+ kills in one blast |
| 2000 | VULTURE #2; RPG ×2; **hold** ≤ 25 s | |
| 2200 | KNIFE ×2; OFFICER | |
| 2400 | jeep; RIFLEMAN ×4 from the warehouse doors | |
| 2700 | **hold**: reinforcements, then IRON HOG on the tracks | |

#### OP 5: THE KENNEL (night and rain; the breakout)
- **Look:** a black-blue night, rain, mud with puddle glints, a double barbed-wire fence (depth 80 and 100), wooden
  barracks, four watchtowers with **sweeping searchlights**, fire barrels, floodlights, the cage block ("the kennel"), a
  flagpole with the hyena flag. Darkness .75 (10.1 `53-fx`). Music `op5` (F# minor, 120 bpm, sparse, a heartbeat kick)
  under rain.
- **Rail:** sideways 0 → 2800 at 14 u/s; a yaw pan from −90° to −75° over d 1500–1700 to look into the yard. Holds at 1450
  (escort, ≤ 70 s) and 2500 (boss).
- **Searchlights:** each sweeps an ellipse on the ground (radius 40) along a path. When a beam crosses the camera's
  position (depth < 30), **SPOTTED** for 3 s (enemy accuracy ×1.5, a white flash, an alarm chirp). Shoot the light (HP 2)
  to put it out.
- **Quotas:** soldier 35, vehicle 3 (scripted: 41 soldiers including the 10 chasers, 2 jeeps and the truck).
  **Hostages:** escort as many as you can (they count toward the ending, not toward clearing the op). **Boss:** MAJOR
  TUSK. **Perk:** HOSTAGES FREED.

| d | Spawns | Notes |
|---|---|---|
| 0 | none | card; LOBO "THE KENNEL. FIVE HOSTAGES. ZERO MISTAKES." |
| 60 | RIFLEMAN ×3 patrol, cross @160 with flashlights; tower 1 searchlight | |
| 250 | a crate holding a FLARE @120; RIFLEMAN ×3 | tip "SHOOT THE FLARE TO LIGHT THE YARD!" |
| 420 | jeep with a searchlight @220 | |
| 600 | SNIPER in tower 1's cabin (z 70); GRENADIER ×2 | |
| 800 | RIFLEMAN ×4; KNIFE ×2 through a gap in the fence @70 | |
| 1000 | tower 2's searchlight; BRUTE | |
| 1200 | the gate opens: truck → dismount ×4 | |
| 1450 | **BREAKOUT** (**hold**, escort): the cells open one by one, 8 s apart. Each hostage runs from lx +180 to the breach at lx −200 @140–180, chased by 2 `chase` riflemen; tower MGs fire | the hostage pips and portraits on the HUD |
| 1750 | RIFLEMAN ×4 out of the barracks doors | |
| 1950 | tower 3; jeep | |
| 2200 | RIFLEMAN ×5; GRENADIER ×2 | |
| 2500 | **hold**: reinforcements, then MAJOR TUSK (the central tower, x 2700) | |

#### OP 6: LAST FLIGHT OUT (sunrise storm; boarding, takeoff, the gunship)
- **Look:** a dark grey sunrise under storm clouds, wind; the apron with painted lines, hangars, a control tower, fuel
  trucks, a windsock, runway lights. Then the air: Mode 7 at altitude over jungle, coast and sea (Pilotwings-like). Music
  `op6` (A minor, 156 bpm, lifting into C major at takeoff).
- **Part A rail:** sideways 0 → 2000 at 18 u/s. Holds at 450 (air), 850 (tank ≤ 40 s), 1500 (escort), 2000 (quota).
- **Scenery A:** hangars ×3 (x 200, 900, 1600 @320; the tank comes out of hangar 2), the control tower (x 1200 @500;
  snipers), fuel trucks (explode like barrels), parked prop planes, a radar dish, crates, barrels; OLD HOWLER at x 2050
  @180 with its ramp down.
- **Part B rail (takeoff):** cut to the plane's open ramp, looking **back** (south, `angle = +π/2`) while the plane runs
  north along the runway; speed 30 → 90 over 20 s, liftoff at 20 s, climbing h 28 → 260 and pitch 6 → 28 by 35 s.
- **Quotas (part A):** soldier 27, vehicle 4, air 2 (scripted: 32 soldiers including the 10 escort attackers, 4
  vehicles, 2 aircraft). **Boss:** HYENA ONE (part B). **Hostages:** the n freed in Op 5 (5 when the op is played alone).

| d / t | Spawns | Notes |
|---|---|---|
| 0 | none | DEN "OLD HOWLER IS ON THE RUNWAY. GET THEM ABOARD!" |
| 60 | RIFLEMAN ×4 popping out of hangar doors @320 | |
| 250 | jeep ×2 cross @200 | |
| 450 | VULTURE #1; **hold** ≤ 25 s | |
| 650 | RPG ×2 on fuel trucks | the trucks explode like barrels |
| 850 | MAULER rolls out of hangar 2 @320; **hold** ≤ 40 s | the tank |
| 1100 | PARATROOPER ×5; SNIPER ×2 in the control tower (z 80) | |
| 1300 | APC @280 → dismount | |
| 1500 | **ESCORT** (**hold**): a friendly truck drops off the n hostages, who run to the ramp (x 1500 → 2050 @140–200, about 25 s). Always 10 attackers: 2 chasers per hostage, the rest firing from the hangar doors. VULTURE #2 strafes | with 0 hostages, the hold lasts 15 s |
| 1900 | RIFLEMAN ×4; KNIFE ×2 | the last push |
| 2000 | **hold** for the quotas; then the cut "EVERYBODY ON THE PLANE!" → part B | |
| B t 0 | jeep ×3 chasing on the runway (`anchor: 'cam'`, depth 60–160), each with a gunner | bonus vehicles, not quota |
| B t 10 | a SAM truck at the runway's end fires 3 missiles | shoot them down |
| B t 20 | liftoff; DEN "HANG ON!" | |
| B t 30 | HYENA ONE climbs into view behind the plane → boss | |

### 8.7 Bosses

| Boss | Arena | Phases and weak points (HP) | Attacks | Score |
|---|---|---|---|---|
| **BIG EAR** (Op 1): a six-wheel signal truck | drives in from the right @260, parks, shuffles ±120 every 8 s | 1: radar dish (30, rotating), gunners L and R (1 each, each respawns twice after 6 s), rocket pod (15). 2: once the dish is gone, the cab and engine (60) stop being armored | dish up: 2 PARATROOPERS every 12 s; gunners' rings; 2 rockets every 6 s | 10000 |
| **CROCODILE** (Op 2): a gunboat | ahead, backing up at the camera's speed @160–240, weaving ±80 | front turret (20), rear turret (20), deck mortar (15) → bridge (45) | turret rings (4-round bursts); mortar arcs; 2 skiffs at 50% | 14000 |
| **WARTHOG** (Op 3): a flamethrower half-track | the plaza @200, moving ±100 | cannon (25), fuel tanks L and R (12 each), SGT. SNARL in the hatch (head 2: each hit stuns the vehicle 2 s) → hull (50) | cannon: 2.0 s glow → tank shell. Flamethrower (while a tank holds out): the nozzle glows 1.5 s, then a flame wave (shoot that side's tank during the glow to stop it). Civilians cross the far side 3 times | 18000 |
| **IRON HOG** (Op 4): an armored train | the tracks @260, back and forth over 900 units at 45 u/s | MG car (20), rocket car (25), mortar car (20) → boiler (50; its vents glow) | rings; rocket salvos (3); mortar arcs; vent steam (1.5 s glow → 10 damage, unless the boiler takes 10 in the glow). Ammo wagons on the siding deal 30 to the car beside them | 22000 |
| **MAJOR TUSK** (Op 5): the warden | 1: the central tower @300, cabin at z 80. 2: on foot | 1: tower MG (15), searchlights ×2 (2 each), support legs ×3 (15 each) → the tower falls. 2: TUSK (40; head ×3; a riot shield blocks the body) | 1: MG bursts, SPOTTED. 2: he walks from depth 250 to 90; lowers the shield 1.0 s → shotgun (3 pellets × 6); a grenade knocks the shield aside for 3 s; below depth 90 he charges, and reaching depth 60 hits for 20 and knocks him back to 150 | 26000 |
| **HYENA ONE** (Op 6): KRAGG's gunship | in the air behind the plane (`anchor: 'cam'`), depth 140–220 | 1: rocket pods L and R (25 each), door gunner (3; respawns). 2: nose cannon (30). 3: KRAGG leaning out with a launcher (head 3: each hit staggers 2 s) and the rotor hub (60) | 1: salvos of 3 rockets every 5 s; door gunner rings. 2: 2.0 s glow → tank shell (2 hits to shoot down). 3: homing missiles; his taunts. Defeat: it spirals into the sea below | 30000 |

### 8.8 Cutscenes (`47-cutscenes.js`)

Scripts (`game.script` generators) drive rigs, camera moves, `E.Dialog` (modal, with portraits) and sound. Hold
✕/Enter/click for 1 s to skip, with a ring that fills. Every cutscene works headless (the tests run them at speed).

1. **Briefing** (40 s): a night coast pan in Mode 7 (the coastline floor, the volcano glow in the Backdrop), cards, DEN's
   lines, the howl.
2. **Interrogation** (30 s): a dim tent drawn with px (canvas walls, a hanging lamp swinging, its light), LOBO and GIGGS
   (rigs), the lines in 8.3, a shake on "WRONG ANSWER."
3. **Kennel aftermath** (12 s): the freed hostages kneel (`pose: 'kneel'`) as their portraits slide in, lit or dark; "{n}
   OF 5 HOSTAGES ARE FREE."
4. **Takeoff cut** (1.5 s): a wipe "EVERYBODY ON THE PLANE!"
5. **Endings** (25 s): OLD HOWLER over the sea at sunrise (Mode 7 at altitude, the plane drawn as a shape from behind),
   the text of 8.3, the rank, the Wolfpack's howl.
6. **Credits:** scrolling text over the night coast (the About content, 14.2).

---

## 9. Presentation: art assets, animation, audio

### 9.1 Art direction and assets

The engine's native style is the base: PS1/SNES-era pixel art, shaded HD Humanoid rigs, shapes-as-data with the house
shading and outline, `E.tones` ramps, the 5×7 font, `E.font.title` logos. Aim for the look list in `API.md` (backdrop,
textured floors, 3–8 props a screen, dressed characters, effects on every hit, lighting, title font). Compare screenshots
with Metal Slug, not with NES games.

**New shapes** (`50-art-shapes.js`, written to the `docs/ASSETS.md` format, facing south, in units of 16 = 1 m; check each
with `node engine/tools/asset-sheet.mjs src/50-art-shapes.js#<id>`):

| Group | Shapes |
|---|---|
| Field props | `sandbags` (a row of flattened `ball` sacks, burlap, `len` param), `sandbagNest` (a ring), `redBarrel` (a lathe with bands), `ammoCrate` (olive with stencil lines), `medCrate`, `fuelTank` (a horizontal cylinder on legs), `barbedFence` (posts; wire drawn as lines by the renderer), `tent` (a linen prism), `campfireDrum`, `floodlight`, `searchlight` (a cylinder head on a pivot), `windsock`, `runwayLight`, `forklift` |
| Structures | `radioMast` (a lattice: thin boxes in `row`s with braces, a platform, a red light; `tilt` param for toppling), `radarDish` (a lathe dish; spun by facing), `radarHut`, `stiltHut` (thatch), `villageHouse` (plaster with tile roof; window and door openings as data for the clip system), `marketStall` (an awning wedge), `chapelTower`, `dock`, `ropeBridge`, `barracks`, `watchtower` (4 legs, a cabin, a roof), `cageBlock`, `gate`, `hangar` (an arched roof), `controlTower`, `waterTower`, `crane`, `shed` |
| Plants and rocks | `palm` (a leaning trunk of `cyl` segments, frond prisms), `mangrove` (a tree on root cylinders), `fern`, plus the core `tree`, `bush`, `rock`, `grass`, `pine` |
| Vehicles | `jeep`, `truck`, `halftrack` (WARTHOG), `apc` + `apcTurret`, `tank` + `tankTurret`, `skiff`, `gunboat` (small, and CROCODILE big with turrets and a bridge), `heli` (fuselage, tail boom, skids, pods; the rotor is an overlay), `hyenaOne` (bigger, a nose cannon, pods, an open door), `bigEar` (a 6×6 with a dish mount), `locomotive`, `trainCar` (×3 variants), `ammoWagon`, `flatcar`, `cargoPlane` (OLD HOWLER: fuselage, wings, two engines with prop overlays, a ramp), `propPlane` |
| Materials and patterns | `olive` (painted steel), `hyenaTan`, the `spots` pattern (camouflage), `charred` (wrecks), `thatch` and `burlap` from the core, `asphalt` with painted lines |

**Rigs** (`51-art-rigs.js`): Humanoid presets for every type in 8.4 and every cast member in 8.1. Each has its own
`outfit`, `hair`, `hat`, `sleeves` and full `colors`; never the defaults. Civilians: villagers (tunics, shirts, straw
hats), medics (white coats, green trim), the reporter (a vest and a camera sprite). Animals are `E.Blob`s: chicken (R 4,
white, wings, feet), pig (pink, `ears: 'cat'`, tail, feet), goat (grey-white, horns, feet), parrot (wings, bright green
and red), monkey (brown, ears, tail), seagull (white, wings). A **rig pool** keeps one rig per live entity, posed every
update from the entity's state and released on despawn.

**Sprites** (`52-art-sprites.js`, string sprites designed at 8–16 px): every pickup in 7.13; projectiles (grenade 5×5,
knife 7×3, rocket 8×3 with flame frames, mortar shell 4×7, tank shell 5×5); shell casing 2×1; chute; muzzle flash frames
(3); HUD icons at 8×8 (soldier, jeep, helicopter, boat, mast, magazine, bullet 2×5, grenade, hostage); the wolf emblem
(32×32, for the title, the HUD and the page background) and the hyena emblem (flags and armbands).

**The first-person SMG** (`55-gun.js`): a pixel-art submachine gun drawn with `px.poly` from a small 2D vector model at the
bottom of the playfield. It slides along the bottom under its crosshair's x and turns toward the crosshair (±25°). Each
shot kicks it back 3 px and up 2°, with brass ejecting to the right (screen-space particles that bounce on the HUD bar). The
reload animation runs .4 s magazine out, .4 s magazine in, .2 s charging handle. Under FURY it glows gold. A grenade throw
shows the left hand arcing up. Settings: "SHOW GUN" (on). In local co-op each player gets a smaller gun at their panel's
position; online, only your own.

### 9.2 Animation (the engine's rig system as the base, plus what this game needs)

Engine-native: walks and runs from velocity; `point: true` with `aim` for guns; `E.MOVES.throw` for grenades and knives;
poses `kneel`, `crouch`, `die`, `down`, `cheer`, `wave`, `hips`; `hurt`; `expr` faces; `drawPortrait` for the dialog and
HUD (blinking, talking mouths).

New animations to build (as `rig.solvePose` wrappers or state mixes, per `API.md` "Characters"):

| Animation | How |
|---|---|
| Kneel and aim | `pose: 'kneel'` + `point` + `aim` toward the camera |
| Pop-up from cover | `crouch` ↔ stand blended over .2 s; `point` only while up |
| Rocket on the shoulder | wrap `solvePose`: both hands up at the shoulder; a tube sprite at `rig.hand()` |
| Blown back by a blast | the entity flies with velocity and spin while the rig blends to `down`; it lands and slides |
| Parachute descent | `air: true`, legs dangling with a slow sway; the chute sprite above, swaying with it |
| Hands up / surrender (TUSK, GIGGS) | wrap `solvePose`: arms raised |
| Hostage with bound hands | wrap `solvePose`: hands together behind the back; a hunched run |
| Panic run (civilians) | wrap `solvePose`: hands over the head; a faster gait |
| Dragged hostage | `kneel` blend while being pulled backward |
| Officer's whistle | a hand to the mouth (`solvePose`); the whistle icon bobs |
| Sniper glint | a 2-frame star sprite at the head, pulsing over the telegraph |
| Heavy gunner's burst | `point` with a recoil shake (±1 px a shot) and `expr: 'shout'` |
| Knife and grenade throws | `E.MOVES.throw` with `wind` scaled to the telegraph |
| Death variety | `die` with a random facing twist; a headshot snaps the head back; a fall from towers and bridges falls in z |
| Cheering hostages, waving villagers | `cheer`, `wave` |
| KRAGG's cackle | `expr: 'shout'` + a head bob at 8 Hz for the laugh |

Vehicles and the rest: wheels turn (an overlay of spokes keyed to distance traveled); suspension bobs; turrets track the
camera (`facing` toward it); rotors spin (an ellipse of 2–4 lines, plus blur arcs); the tail rotor; propellers; the
dish's slow turn; boats bob and leave a wake (FX); the train's wheels and smoke puffs; the masts topple (`tilt` steps);
the tower collapses (its parts fall with `E.arc`); the wrecks smoke. UI: cards slide; tally numbers count up; the logo's
howl; crosshairs pulse at low ammo.

Check every attack and death with the engine's filmstrip (`node engine/tools/filmstrip.mjs dev/index.html#range --steps
"..." --seed 1`): a wind-up, a strike and a clean settle, with no backward sweeps. Look at the result; a script can't
judge it.

### 9.3 Audio (all in code, no files)

**Music** (`61-music.js`), as `game.audio.music({ bpm, steps: 4, tracks })` data with named layers. The director turns
`perc` and `lead` layers up with intensity (a boss, a hold, many enemies on screen), ducks the music under radio lines
(`audio.duck`), and plays stings (FURY, PACK FURY, boss defeated). Every theme is original. The **howl motif** opens the
title theme and returns in Op 6 and the ending:

```js
WP.SONGS.title = { bpm: 128, steps: 4, tracks: [
  { name: 'lead', wave: 'square', vol: .13, notes: 'A4 - - - E5 - - - A5 - - - - - G5 - | F5 - E5 - D5 - E5 - - - - - . . . . | A4 - - - E5 - - - A5 - - - C6 - B5 - | A5 - - - - - - - - - - - . . . .' },
  { name: 'bass', wave: 'triangle', vol: .2, notes: 'A2 . A2 . A2 . A2 . F2 . F2 . F2 . F2 . | D2 . D2 . E2 . E2 . A2 . A2 . A2 . A2 . | A2 . A2 . A2 . A2 . F2 . F2 . G2 . G2 . | A2 . A2 . E2 . E2 . A2 . . . A2 . . .' },
  { name: 'perc', wave: 'drums', vol: .22, notes: 'k . h . s . h . k k h . s . h h | k . h . s . h . k k h . s . s s | k . h . s . h . k k h . s . h h | k . h . s . k . k . s s s s s s' } ] };
```

| Song | Mood |
|---|---|
| `title` | the Wolfpack March (above, extended to 32 bars, with a saw pad layer) |
| `briefing` | 90 bpm, pulse arpeggios, radio-noise layer |
| `map` | a snare roll and horn calls (the motif's first 4 notes) |
| `op1` … `op6` | as in 8.6; each 32–64 bars with `perc`, `bass`, `lead` and `pad` layers |
| `boss` | 160 bpm, chromatic menace, double-time kick |
| `tally`, `gameover`, `continue` | jingles |
| `ending` | the motif in A major, slow, swelling |

**Sounds** (`60-audio.js`, `audio.define`): SMG shot (a noise burst .05 s + a square thump 90 → 50 Hz .06 s, pitch vary
.05, at most 14 a second per player even under FURY's 22 rounds), dry click, reload (two clicks + a slide), brass tinkles, grenade throw whoosh,
explosion (the engine's `explode` + a 60 → 30 Hz sine over .6 s + a noise tail), ricochet ("pyeeew", a sine bend), enemy
rifle crack (filtered noise, quieter with depth), MG burst, whiz (a missed bullet), telegraph tick (rising pitch),
projectile whistle, knife whoosh, rocket hiss, mortar whistle, tank shell boom, helicopter rotor (a loop of noise chops
every .08 s at a volume by distance), truck and tank engine loops, boat motor, rain loop, thunder, searchlight alarm chirp,
whistle (officer), pickups (an arpeggio per kind), FURY sting, civilian-hit sting (a dissonant chord), hostage rescued
(a fanfare), low-ammo beep (when below 6 rounds and no spares), heartbeat (damage over 75), the menu's move, pick and back.
Positional: volume by depth, and pan by screen x if engine change 5 is in.

**Voices** (`62-voice.js`): Animalese/Simlish-style gibberish. Per typed character (the Dialog hook, engine change 1) or
per syllable for barks: a vowel plays a blip (`pulse` or `square`, .05–.09 s) whose pitch is the speaker's base ×
(vowel offset: a 1.0, e 1.12, i 1.25, o .9, u .8) × a small seeded jitter (seeded by a hash of the line, so a line always
sounds the same); a consonant adds a .015 s noise click; "?" bends the last blip up, "!" makes it louder; spaces are
silent. Profiles: DEN MOTHER 300 Hz `pulse12` with radio crackle bursts at each line's start and end; LOBO 150 square,
gruff; FANG 170; TUNDRA 260; MOONSHINE 190; KRAGG 120 saw with slow vibrato, and the cackle (6 "HA" blips 220 → 160);
TUSK 100; GIGGS 230, fast, with giggles; hostages 220–320; villagers 240–300. Barks: Hyena deaths ("GWAH!", "UGH!",
"HYAA!"), the grenade "HUP!", civilian "EEK!", hostage "HELP!". **The howl:** a sine gliding 220 → 440 → 330 Hz over 1.4 s
with growing vibrato, used for LOBO's line, PACK FURY and the endings.

---

## 10. UI and UX (10-foot, controller first)

### 10.1 Rules

- Design for a TV at 10 feet. Body text is the 5×7 font at scale 1 (28 px on a 1080p TV); key numbers and menus use scale
  2; titles use `E.font.title` at scale 3–4. Nothing smaller. High contrast: outlines or shadows on every HUD string.
- One idea per screen; no web-style dense panels. Tallies reveal one line at a time. The About screen is pages, not a
  scroll of text.
- Focus is always visible (a pulsing chevron and a brighter row) and moves with the d-pad, the stick, the arrow keys, and
  mouse hover. ✕/Enter/click picks; ○/Esc/Backspace goes back. Every screen shows its prompts in the last-used device's
  glyphs at the bottom right ("✕ SELECT  ○ BACK").
- The standard HTML screens (pause, settings, controls, help, dev) come from `E.Shell` with a theme (ink `#f2ead3`, paper
  `rgba(18,22,14,.92)`, accent `#e0b040`, danger `#e05a3a`, line `rgba(224,176,64,.35)`, title font `Impact,
  'Arial Black', sans-serif`) and a CSS override for 10-foot sizes: `.esh` font 20px, `h2` 34px, buttons 18px with 14px ×
  18px padding, sliders 260px wide.

### 10.2 Screens (`71-screens.js`, canvas, pixel art)

| Screen | Contents |
|---|---|
| `title` | the logo "OPERATION WOLFPACK" (olive-to-amber gradient, depth), a full moon, four wolf silhouettes on a ridge, sweeping searchlights, a helicopter crossing; the menu: START MISSION, SQUAD (co-op), MISSION SELECT (after a first clear), HIGH SCORES, SETTINGS (`game.menu('settings')`), ABOUT / CREDITS; `E.versionLabel()` and the game's version small at the bottom; "PRESS {start}". 10 s idle → attract |
| `squad` | four slots (WOLF 1–4), each with its device icon and portrait; "PRESS OPTIONS ON A CONTROLLER TO JOIN"; START |
| `briefing` | 8.8 #1 |
| `map` | a pixel-art map of the Brimstone Coast (coastline polygon, jungle, river, roads, the volcano), six nodes with icons, the route drawn as you go, done ops ticked with their perk icons, the next op pulsing; DEN's line for the next op; "✕ DEPLOY". In Mission Select every node can be picked |
| `opcard` | "OPERATION N", the name, the objective, quota icons with counts, "GET READY", then "GO!" |
| `tally` | 7.15's lines, one at a time, then the perk card, then "DAMAGE REPAIRED −10" |
| `continue` | "CONTINUE?" with a 10-second count (`E.Arcade.continue`), the continue count, the score |
| `ending`, `credits`, `initials` | 8.8 #5–6 and `E.Arcade.enter` |
| `about` | 14.2 |
| `touch` | 14.1 |
| `hubcard` | 13.2 |

### 10.3 The HUD (`70-hud.js`, the buffer is 480×270)

- **Playfield** y 0–233; **HUD bar** y 234–269: a dark olive panel with rivets.
- **1–2 players:** P1's panel x 4–176, the quota block x 180–300, P2's panel x 304–476. In solo the P2 area shows "WOLF 2:
  PRESS OPTIONS TO JOIN" while a free controller is connected, and P1's wide stats otherwise.
- **3–4 players:** four panels 118 px wide; the quotas move under the top score row.
- **A player panel:** a 24 px portrait (it winces when hit, grins at a streak); the callsign and score; spare magazines as
  icons (a part-used one notched); the current magazine as 30 tiny bullets in 2 rows; grenades as icons; the DAMAGE bar (60
  px, filling red, flashing over 75); the streak "×3"; "RELOADING" (the crosshair ring fills too); "FURY 7"; "DOWN".
- **Quota block:** silhouettes with remaining counts (soldier, jeep, helicopter or boat, as the op uses); a check when one
  is met.
- **Top row** (y 2–12): `1UP 012300   HI 050000   2UP 004500` (3–4 players add 3UP/4UP); in hub sessions the round time
  "TIME 3:42".
- **Boss bar:** under the top row, 200 px, with the boss's name.
- **Radio box:** top left, 220×48, the speaker's portrait, 2 lines (`E.Dialog`, non-modal, `auto`).
- **Objective chips:** top right ("MASTS 2/3", the five hostage portraits).
- **In the playfield:** telegraph rings, the sniper glint, mortar landing markers, threat arrows at the edges for
  attackers off-screen, the red hit arcs, friendly markers, hit markers (a white ×, a "HEADSHOT" ding), floating scores,
  crosshairs (each a circle with 4 ticks and a center dot in the seat color with a black outline; it grows with bloom,
  turns red over a hostile, and shows the player number in co-op), low-ammo blinking, the grey crosshair of a DOWN player.
- **Prompts** (above the HUD bar, glyph first, from `input.label`): `□ RELOAD` below 30%; "NO AMMO! SHOOT CRATES!" when the
  pouch is empty; tips from 8.3 the first time.

### 10.4 Settings (`72-shell.js`, group "Game")

Difficulty (RECRUIT / VETERAN / ARCADE; asked again on START MISSION, defaulting to the saved one); Aim assist (Off / Low
/ Medium / High); Crosshair speed (.5–2); Crosshair size (S / M / L, default L); Button symbols (PlayStation / Xbox,
mirroring the engine's setting); Show gun (on); Friendly markers (on); Text size (Normal / Large: scale 2 radio text).
Standard ones come free: volumes, mute, reduce motion, screen shake and flashes, pixel scaling, the screen filter (clean,
scanlines, CRT), frame rate, vibration, dead zone, rebinding. Pause menu items: RESTART OPERATION, DEV MODE (hidden in hub
sessions), and the standard Resume, Settings, Controls, Full screen, Help, Quit to title. Help: the controls per device
and "HOW TO PLAY" in 6 short lines (fill the quota, beat the boss; shoot items to collect; shoot projectiles; don't shoot
civilians; reload; grenades hit everything nearby).

---

## 11. Dev mode (`73-devmode.js`)

Reached from the pause menu (DEV MODE). It is an `E.Shell` screen built with the rows extension (engine change 2), so it
works with the pad, keys and mouse like the rest of the menu. In hub sessions it is hidden.

### 11.1 Live sliders (the important balance variables)

Each is a setting in group `Dev` (hidden from Settings) whose `apply` writes `WP.T[key]` at once, even mid-fight.
**RESET TO DEFAULTS** is `settings.reset('Dev')`. While any value differs from its default, the HUD shows a small "DEV"
badge.

| Key | Label | Default | Range |
|---|---|---|---|
| `fireRate` | Fire rate (rounds/s) | 11 | 4–24 |
| `magSize` | Magazine size | 30 | 10–60 |
| `reloadTime` | Reload time (s) | 1.0 | .2–3 |
| `bulletDmg` | Bullet damage | 1 | .5–4 |
| `bloomMax` | Max spread (px) | 7 | 0–20 |
| `startMags` | Starting magazines | 6 | 1–15 |
| `startGrenades` | Starting grenades | 4 | 0–9 |
| `grenadeRadius` | Grenade radius | 52 | 20–140 |
| `grenadeDmg` | Grenade damage | 12 | 2–40 |
| `assist` | Aim assist strength | .6 | 0–1 |
| `padSpeed` | Pad crosshair speed (px/s) | 520 | 150–1000 |
| `enemyHp` | Enemy HP × | 1 | .25–4 |
| `enemyAccuracy` | Enemy accuracy × | 1 | 0–2 |
| `telegraph` | Telegraph time × | 1 | .3–2.5 |
| `enemyDamage` | Enemy damage × | 1 | 0–3 |
| `spawnDensity` | Spawn density × | 1 | .25–2.5 |
| `projectileSpeed` | Projectile speed × | 1 | .5–2 |
| `railSpeed` | Rail speed × | 1 | .25–3 |
| `quota` | Quotas × | 1 | .25–2 |
| `dropChance` | Drop chance × | 1 | 0–3 |
| `civilianDamage` | Civilian hit damage | 8 | 0–30 |
| `clearHeal` | Stage-clear heal | 10 | 0–100 |
| `timeScale` | Game speed | 1 | .1–2 |

### 11.2 Toggles, tools and actions

- **Cheats:** God mode, Infinite ammo, Infinite grenades, One-hit kills, Enemies hold fire, Bot autopilot (P1).
- **View:** Show hit shapes, Show paths and spawn markers, Perf overlay (frame ms, entities, particles, rail d, beat,
  seed), Slow motion (1, .5, .25, .1), Frame step (while paused: STEP ONE FRAME).
- **Jump:** an operation select (1–6), a beat select (that op's beats, plus BOSS and, for Op 6, PART B), GO. Also RANGE (a
  target-practice scene with dummies at depths 60–600, a moving target, a projectile thrower, a civilian walker, and a
  readout of time-to-target).
- **Spawn:** a type select (every `WP.TYPES` id) → SPAWN AT CROSSHAIR. It takes the floor point under P1's crosshair and
  converts it to the camera frame.
- **Flow:** Fill quotas, Trigger boss, Kill all, Damage self 25, Heal, Give 3 mags / 3 grenades / FURY / DYNAMITE, Set
  hostages 0–5, Play ending (n), Play cutscene (each).
- **Data (designer tool):** COPY SPAWN LINE and COPY PROP LINE print a ready-to-paste stage entry for the point under the
  crosshair (`['rifleman', { lx: 42, dz: 180 }]`, `['crate', 'c?', 1234, -120]`) to the console and an on-screen toast.
- **Reset:** RESET TO DEFAULTS (sliders), RESET SAVE (high scores, unlocks, tips seen).

---

## 12. Attract mode and the bot

### 12.1 Attract mode (`81-attract.js`)

- On `title` (and every menu screen reached from it), `E.Arcade` with `{ idle: 10, demo: 150, scores: 6 }` counts idle
  time. After **10 s** without input it enters `demo`: the attract scene plays a looping **playlist** of each op's
  `attract` segments (Op 1 from b4 25 s → Op 2 boss 25 s → Op 3 b14 20 s → Op 4 b11 20 s → Op 5 breakout 25 s → Op 6 part
  B and the boss 30 s), each starting by `jump` with cheats on (god, infinite ammo) and the bot playing P1. Then the
  high-score table (6 s), then the title, again and again.
- A banner reads "DEMO PLAY · PRESS ANY BUTTON", and the HUD runs as in play. Audio stays at half volume (and silent until
  the page has had a gesture: browsers require it).
- **Any input** (a key, a mouse move or click, a pad button or stick) calls `arcade.wake()` and returns to the title with
  the menu focused.
- It also runs on touch-only devices (14.1), where taps don't count as input to stop it.

### 12.2 The bot (`80-bot.js`)

`WP.Bot.frame(world, pid, dt) → InputFrame`. One bot serves the attract mode, the dev autopilot and the playthrough
tests.

- **Target choice** (every .1 s): projectiles that will hit within .8 s, then telegraphs by time left, then vehicle and
  boss weak points, then the nearest hostiles, then pickups when low on ammo or health, then props near hostiles
  (barrels).
- **Aim:** a critically damped spring toward the target's body center (the head for BRUTES and TUSK), at most 900 px/s
  (attract) or 600 px/s (`fair` mode, for the tests).
- **Fire** when the crosshair is inside the target's shape, but **never** when the frontmost shape at the aim point is a
  civilian, hostage or animal-in-the-way (re-check every shot; side-step 10 px).
- **Grenades:** at 3+ hostiles within the blast radius, or at a vehicle or boss weak point, with no friendly inside 1.2 ×
  radius.
- **Reload** when the magazine is under 6 and nothing will fire within .9 s.
- **Mistakes** (`fair` mode only): a reaction delay of .15–.3 s and a .5% chance a shot misses by 12 px, so the tests
  measure a beatable game, not a perfect machine.

---

## 13. Multiplayer

### 13.1 Local co-op (the game on its own)

- `game.allowJoin({ max: 4, onJoin })`: Options on a controller nobody holds joins (anywhere on the title, squad, map or
  in play). P1 keeps the keyboard, mouse and first pad. Joining mid-op starts with 6 magazines, 4 grenades and damage 0,
  and the scaling of 7.16 updates at the next beat.
- Every player has their own crosshair, HUD panel, ammo, grenades, damage, score and streak. Quotas and hostages are
  shared. A player who disconnects mid-run is paused out (the engine pauses on a lost controller); "DROP OUT" in the pause
  menu removes them.
- Colors: `E.PLAYER_COLORS` locally (P1 blue, P2 red, P3 green, P4 yellow).

### 13.2 AI Hub sessions (`90-net.js`, `91-codec.js`): Session Protocol v1, mode `shared-world`

**Head of the bundled page, in this order:**

```html
<meta charset="utf-8">
<script>/* hub/session.js, byte for byte, unmodified */</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Clear the operation as a team; top score wins">
<meta name="hub:session-howto" content="Aim: mouse or stick · Fire: click/R2 · Grenade: right click/L2 · Reload: R/□">
<meta name="hub:session-minutes" content="5">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1–4">
<meta name="hub:genre" content="Shooter"><meta name="hub:source" content="Operation Wolf"><meta name="hub:model" content="(the builder's model)">
```

**Joining:**
- When `AIHub.active` is true (decided before the game builds), create the game with `autoPause: false` and
  `menu: { pauses: false, quit: false, items: [] }`. Make `play` non-pausable, disable `allowJoin`, and skip the title,
  attract mode, briefing, map and tips.
- `await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true })`. With `null`, run as if standalone.
- The op is `1 + floor(AIHub.rng('stage')() * 6)`, played standalone (default loadout; 5 hostages for Ops 5 and 6; no
  perks). The host's sim seed is `floor(AIHub.rng('sim')() * 2^32)`.
- Session tempo: rail speed ×1.3 and every hold's `max` ×.6, so an op with its boss takes about 4 minutes (the meta
  says 5, to leave margin).
- Call `AIHub.ready()` as soon as the op is built, with no key press.

**Our card (`hubcard` scene, `card: true`):** the logo; the op's name and card line; the players in seat colors
(`info.players[i].color`), each with READY ticks from the `card` event; the goal; this device's controls (from
`input.label`); the time left (`card.left`; PAUSED when `paused`). **Enter / ✕ / a click on READY** →
`AIHub.answer('ready')`. **△ / M / a click on MORE TIME** → `AIHub.answer('more')` (pressing again takes it back). The
card has no menus or settings, and its cosmetic randomness comes from `AIHub.rng('card')`.

**Start:** on `start`, show 3-2-1 from `AIHub.time()`; play begins when `AIHub.time() >= 0`. The HUD shows TIME from
`AIHub.limitMs - AIHub.time()`.

**Roles:**
- **The host** (`AIHub.isHost`) runs `WP.Sim` with one player slot per `info.players` entry: its own from local input,
  the others from the network. With **`AIHub.server`** (a host with no player of its own), there is no local player,
  input or camera, and it draws nothing.
- **Clients** run `WP.Mirror`: they draw the world from snapshots, move their own crosshair locally at once, and play their
  own muzzle flashes, tracers, sounds, hit sparks and hit markers at once (predicted). Kills, pickups and damage come only
  from the host.

**Messages** (JSON with short keys; at most 18 a second from any copy, counting everything; a token bucket in `91-codec.js`
mirrors the client's limit of 20/s with bursts of 40):

| Name | Direction | Delivery | Rate | Contents |
|---|---|---|---|---|
| `i` (input) | client → host | unreliable | 15/s | `{ k:'i', s: seq, a: [x*10|0, y*10|0], b: fireBit, g: grenadeCount, r: reloadCount, n: roundsFired, h: [[seq, [[id, part, dmg], …]], …] }`: the hit batches the host hasn't acked yet (at most 3, so a loss is covered) |
| `s` (snapshot) | host → all | unreliable | 15/s | `{ k:'s', t: simMs, d: railD, q: quotas, p: [[pid, x, y, dmg, mag, spares, gren, score, flags]], e: [[id, typeCode, x, y, z, facing16, state, hp%]], j: [[id, kind, x, y, z]], u: [[id, kind, x, y, z]], ack: { pid: seq } }` |
| `ev` (events) | host → all | reliable | ≤ 3/s, batched | `{ k:'ev', l: [[type, …args], …] }`: spawn, kill (id, by, part), pickup (id, pid, kind), damage (pid, amount, from), explode, telegraph, radio, boss phase, hostage, clear, fail |

- **Size guard:** every unreliable message stays under 1100 bytes, because larger ones travel as several packets and are
  lost whole. Quantize to integers and keep keys short. If a snapshot is too big, leave out pickups, then props, then the
  farthest entities, round-robin, so each still updates at ≥ 5/s. Over 16 KB is impossible by construction; assert it.
- **Hits are the client's call, checked by the host:** a client tests its shots against its interpolated world and
  reports the target ids and parts. The host applies them when the target is alive and the report is less than 400 ms old
  (co-op, so be generous). The host deducts ammo from `n` and handles grenade and reload counts by their difference. Each
  pickup goes to the first reporter.
- **Interpolation:** draw remote entities 100 ms behind (`AIHub.time() - 100`), interpolating linearly between snapshots.
  Create entities from `spawn` events (types and rigs), play deaths from `kill` events, and drop an entity missing for 3
  snapshots.
- **Reporting:** the host calls `AIHub.finish({ standings, scores, won, stats, awards })` once: when the op is cleared
  (`won: true`), when everyone is DOWN (`won: false`), or on **`time-up`** at once (`won: false` unless cleared). Standings
  are player ids sorted by score, best first (ties share an array), listing every player still in. Stats per player:
  kills, accuracy, headshots, intercepts, civilians hit. Awards: SHARPSHOOTER (best accuracy), GUARDIAN (most intercepts),
  LIFESAVER (most hostages escorted, or civilians spared).
- **`leave`:** the host removes that player's slot, and their crosshair fades on every copy. A host leaving ends the round
  (the hub voids it).
- **`end`:** stop all input, sound and music (`audio.music(null)`, mute effects), freeze the frame, and send nothing
  more.
- **Rules for sessions:** no network but `AIHub.send`; no `alert`, `confirm`, `prompt`, `window.open` or navigation; quit,
  restart and title do nothing (they're hidden); no chat; names come from the hub and are drawn with the pixel font only
  (anything outside ASCII falls back to "P1"–"P4"); never pause the sim (the menu overlays it); the tab hidden on the host
  keeps simulating.

---

## 14. Touch-only devices, About/Credits, exit interview

### 14.1 Touch-only devices

At boot, and whenever input changes: `touchOnly = matchMedia('(any-pointer: coarse)').matches &&
!matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0 && no gamepad connected && no key pressed
yet`. While it holds: no touch controls (`input.touchEnabled = false`, no `touchButtons`); the title shows a panel
"CONTROLLER OR KEYBOARD REQUIRED" with a large **SETTINGS** button (`game.menu('settings')`) and the engine's corner menu
button; the attract mode starts after 10 s and loops, and taps don't stop it. A `gamepadconnected` or `keydown` leaves
touch-only mode and shows the normal title.

### 14.2 About/Credits (`about` scene; the same text goes in the chat reply)

Pages, left/right to turn, ○ to leave:
1. **SOURCE INFORMATION (1/2):** Date `2026-11-03 17:47:46`; Source: Operation Wolf (Taito, 1987); Plan: `PLAN.md`;
   Genre and perspective: light-gun rail shooter, first person on a scripted rail; Tech: my-3D2dge v0.85.2 (the full
   engine with Mode 7, Arcade and Shell; the version of every edit noted), AI Hub session client 1.4.0, Playwright
   (tests), Node (tests and build).
2. **SOURCE INFORMATION (2/2):** Art direction; Animation; Audio; Online (AI Hub Session Protocol v1, shared-world co-op
   for 1–4; local co-op for 1–4); Testing (what was allowed and used); Research (the planner: Wikipedia and
   arcade-history.com on Operation Wolf, plus the engine's and hub's docs; the builder adds their own or "none"); Environment
   (Claude Code CLI (headless); Linux; browser unknown, or what was used); Model; Usage (an estimate, or "unknown").
3. **TESTING FEEDBACK:** the four answers.
4. **ENGINE FEEDBACK:** the six answers.
5. **PROMPT FEEDBACK:** the four answers.
6. **CREDITS:** "OPERATION WOLFPACK, an original game inspired by Operation Wolf (Taito, 1987). Not affiliated with or
   endorsed by Taito." The engine my-3D2dge (MIT, michaelcrosato), the AI Hub client (michaelcrosato), any CC0 store
   assets used (with their credit lines), and the model and harness that built it.

Fill every field with what is true at the end of the build; write "unknown" for anything you can't confirm. `WP.TEXT.about`
holds the text, and the build fails if a field is empty.

### 14.3 Exit interview

Write `./exit-interview.json` in the exact shape TASK.md gives. Suggested `aiHub` values: name "Operation Wolfpack";
tagline "Every bullet counts. Bring them home."; description "A first-person light-gun rail shooter for 1–4 players:
storm the Brimstone Coast with limited ammo, spare the civilians and rescue five hostages from the Hyena Legion."; type
"Game"; genre "Shooter"; source "Operation Wolf"; series "" (the franchise has the source's own name); players "1–4";
controls "Mouse or stick aims · click/R2 fires · right click/L2 grenade · R/□ reload"; tags ["first-person", "arcade",
"co-op", "pixel art", "retro", "boss fights"]. `tests/run.mjs` parses the file and checks every key is there.

---

## 15. Build order and milestones

Each milestone ends with the test command green (`npm test`) and the listed checks. Build systems before content, and Op
1 completely before the other ops.

| # | Milestone | Build | Exit criteria |
|---|---|---|---|
| **M0** | Setup and spike (**de-risk the renderer, hits and bundle first**) | the dev folder; the engine and hub copies; `manifest.json`; `dev/index.html`; a Mode 7 test scene: floor painter, Backdrop, 30 Humanoids at depths 60–900, a jeep shape driving, palms; the mouse crosshair; hit shapes with the debug overlay; rig height calibration (`WP.RIG_H`); `tools/build.mjs` producing the single file with session.js and the metas; `tests/run.mjs` skeleton | a screenshot shows correct depth scaling; hit shapes line up with rigs at 4 depths and in 3 poses (screenshot); the bundle opens over file:// with no errors; the harness loads the bundle (a stub `connect`/`ready`) |
| **M1** | Core loop | input adapters (mouse, pad, keys), aim assist, the weapon (fire, bloom, magazines, reload, auto-reload), grenades and explosions, RIFLEMAN (cross, popup) with telegraph and fire, the damage meter and DOWN, pickups (MAG, GRENADE, RATION), crates and barrels, FX v1 (dust, sparks, explosion), the gun overlay, HUD v1, SFX v1; the `range` scene | the range is playable for 2 minutes; T-core, T-proj, T-weapon, T-hit, T-input pass |
| **M2** | The stage framework and Op 1 | the stage schema, rail and holds, beats and spawns, quotas and reinforcements, layout helpers and floor painters, the Op 1 shapes, GRENADIER, KNIFE, OFFICER, SNIPER, MORTAR, BRUTE, PARATROOPER, jeep, truck, VULTURE, the grenade, knife, rocket, missile and mortar projectiles, FURY, props (sandbags, masts), BIG EAR; the radio and voice v1; music `op1`; the op card, tally and continue | Op 1 plays from the card to the tally; T-enemy-*, T-boss-1 and T-stage-1 (god bot, then fair bot on RECRUIT) pass |
| **M3** | The game's frame | title (logo art), menus, settings, glyph default and the mirror, pause items, help, briefing, map, high scores (`E.Arcade`), continue, the ending skeleton for all 6 variants, About, the attract mode with the bot, touch-only mode, the dev screen (engine changes 2–4) | the title → Op 1 → tally → map flow works; attract starts at 10 s and any input ends it; dev sliders change play live and reset; T-flow (partial), T-attract, T-touch, T-dev pass |
| **M4** | Multiplayer | local co-op (join, panels, crosshairs, shared quotas, DOWN and return); AI Hub: card, roles, codec, rate limiter, interpolation, server mode, time-up, leave, end, finish | T-coop and T-hub-mock pass; **the real harness passes** in all 4 configurations (17.3) |
| **M5** | Op 2 and the interrogation | the river floor and forward rail, bob, skiffs, patrol boat, the bridge, carriers in trees, CROCODILE, the interrogation cutscene, music `op2` | T-stage-2, T-boss-2, the cutscene test |
| **M6** | Ops 3 and 4 | windows and doors (clip), civilians and their penalties, the reporter, RPG, APC, DYNAMITE, WARTHOG and the village perk; the depot, chains, the cargo plane, forklift, IRON HOG and the refill perk; music `op3`, `op4` | T-stage-3/4, T-boss-3/4, T-perks |
| **M7** | Ops 5 and 6 and the endings | the darkness mask, searchlights and SPOTTED, rain, FLARE, the breakout escort, TUSK; the airfield, tank, the boarding escort, the part B cut, altitude Mode 7, HYENA ONE; all endings, credits, loop 2; music `op5`, `op6`, `ending` | T-stage-5/6, T-boss-5/6, T-endings, **T-playthrough** (the whole campaign, headless) |
| **M8** | Polish and balance | the full audio pass (every song, sound and voice), animation polish (9.2 list, filmstrips), FX polish, the HUD and 10-foot pass, aim assist tuning in the range, balance from bot statistics (damage taken per op, quota ÷ spawns, ammo curve: no fair-bot DRY on VETERAN), the attract playlist finished, the About text | every op looks right in screenshots (a list: 17.4); a fair bot finishes VETERAN with ≥ 3 hostages in ≥ 2 of 3 seeds; no look notes from `check.mjs` left unhandled |
| **M9** | Ship | the final bundle; the whole test command; the harness; the browser smoke on the final file; `exit-interview.json`; the About pages filled; the chat reply | section 18's checklist is all ticked |

---

## 16. Risks and how to de-risk them

| Risk | Why it is risky | De-risk |
|---|---|---|
| **Mode 7 as a first-person gallery** (scale, sorting, cost) | It was built for karts: rigs at k up to ~4, big set pieces, many shapes; anchors that sort wrongly; the shape sprite cache churning (300 entries) | M0 spike with screenshots at 4 depths; scenery at fixed depth keeps the same k (cache hits); raise the cache size in the engine if needed; give covers and openings their own depth bias; test the worst screen (Op 4 chains + 40 entities) early. Performance has no budget, but frames must still be drawn correctly |
| **Hit shapes not matching what is drawn** | Rig heights vary by preset and pose; Mode 7 quantizes the view's scale | calibrate (7.2) instead of guessing; the debug overlay; a test that projects a known rig and checks the head shape lies in the top 15% of its drawn box (using the calibration table) |
| **Lighting under Mode 7** | Mode 7 draws as an overlay, so the engine's `game.lights` and particles don't apply | own world FX through `m7.add` and an own screen-space darkness mask with dithered light holes (`px.ddisc`), planned from M1 (FX) and M7 (night); verify Op 5's readability by screenshot |
| **Netcode in a shared world** | Rate limits, 1100-byte unreliable messages, host leave, server mode, interpolation | the protocol in 13.2 is the design; M4 builds a Node mock bus first (latency, jitter, loss) with assertions on rate and size, then the real harness in all configurations before any more content |
| **Session rules colliding with engine defaults** | The engine pauses on hidden tabs and menus, offers Quit, and may use storage | engine change 3 (non-pausing menu), `autoPause: false`, menu items hidden in sessions; T-hub checks that nothing pauses the host sim |
| **Pad aiming feels bad** | A stick is not a light gun | the range scene with a time-to-target readout; acceleration, friction, magnetism and snap; difficulty-scaled assist; tune in M1 and again in M8 |
| **Gibberish voices and synthesized guns sound cheap** | Everything is chip synthesis | a dev soundboard (dev screen: PLAY SOUND select) from M1; layered sounds; the per-letter voice hook from M2 |
| **Content volume** (6 ops, 6 bosses, about 90 beats) | Time, and stubs creeping in | data-first stage files, beat macros and layout helpers; finish Op 1 to "done" in M2 so later ops copy a working pattern; a test that every beat of every op fires and every op clears |
| **Bundling** | `session.js` must be first and unmodified; `</script>` inside inlined code breaks the page | the bundler escapes `</script` as `<\/script` in inlined code only (never inside session.js; check it has none) and compares session.js's hash; T-bundle |
| **Determinism drift** | Rigs or FX reading the sim's random stream; `Math.random` sneaking in | separate streams (`sim`, `loot`, `ai`, `fx`); a test that runs the same seed twice and compares a hash of the snapshots; a lint step in `run.mjs` that fails on any `Math.random` in `src/` |
| **Touch detection false positives** | Touch laptops have fine pointers and keyboards | the `any-pointer: fine` check, recovery on keydown or gamepadconnected; T-touch with stubbed `matchMedia` |
| **Disk space** | `/tmp` was full when this was planned | keep clones, Playwright output and temp files in the dev folder (`TMPDIR=./.tmp` for the test runs) |

---

## 17. Testing

### 17.1 The one command

`npm test` (= `node tests/run.mjs`) prints **only failures** and then **one line**: `412 passed, 0 failed (38.2 s)`.
Options: `--quick` (headless suites only), `--only <suite>` (for example `--only weapon`), and `--changed` (only the suites
whose `covers` files changed since the last green run; a stamp file in `tests/.last`). Rerun a suite only after changing
code it covers. Each suite declares `covers: ['src/31-weapon.js', …]`. As TASK.md says, don't use subagents or workflows
to debate, review, judge or audit; the tests and your own screenshots are the checks.

Headless suites load `engine/my-3d2dge.js` and the `src/` files from `manifest.json` into a `node:vm` context with small
stand-ins (`window`, `addEventListener`, `location`, `navigator`, `matchMedia`, `performance`), as the handoff's
`game/test.mjs` and `kits/test.mjs` do. Then they drive the game with `game.advance(seconds)`, `input.tap/hold/feed`,
injected frames (`game.debug.frames`), and read `game.debug.snapshot()`. Every suite also fails on `game.errors`.

### 17.2 Suites (what each proves)

| Suite | Checks |
|---|---|
| T-core | fixed-step determinism: two runs, same seed and the same frames, give the same snapshot hash after 60 s of bot play; no `Math.random` anywhere in `src/` (lint) |
| T-proj | `project` and `toFloor` round trips; `halfWidth`; a rig's hit shapes against its calibrated drawn box at depths 60/200/400/800 and in 3 poses |
| T-input | mouse (`input.feed('move')`) moves the crosshair absolutely; keyboard movement from `held` codes; stick velocity through an injected stick; aim assist friction and snap pick the right target; `input.label('fire')` gives "R2" (PlayStation), "RT" (Xbox) and "Left click" (mouse) |
| T-weapon | 11 rounds in a second held; magazine count; auto-reload after .12 s and a 1.0 s reload; part-used magazines kept; empty clicks; FURY doubles the rate and uses no ammo; bloom stays ≤ 7 px |
| T-hit | head vs body vs legs; a headshot ×2 (×4 on BRUTE); cover blocks; nearest first; projectiles intercepted; pickups go to the shooter; the floor puff on misses |
| T-grenade | the count; range clamp; the blast kills inside the radius and spares outside; vehicles take damage; civilians inside are penalized; barrel chains |
| T-enemy-<type> | every type in 8.4 and 8.5: spawns, telegraphs (ring time per difficulty), fires (ignored → damage rises by the expected amount ± the accuracy roll with a fixed seed), dies when shot, counts toward the right quota; OFFICER calls 3 (2 after the perk); paratrooper chute; vehicles' weak points and wrecks |
| T-friendlies | civilian hit: +8 damage, −1000, streak reset; hostage grab and recapture; lost and rescued counts; animals drop and flee, never die |
| T-pickups | each effect; expiry at 6 s; the supply director's weights move with need; the emergency drop by difficulty; the DRY rule (DOWN on ARCADE) |
| T-boss-1…6 | each boss's phases advance when its weak points die (`debug.tune('oneHit')` or targeted frames); armored parts take no damage; defeat leads to the tally |
| T-stage-1…6 | with the god bot: every beat fires, every hold releases, the quotas reach 0, the boss comes, the op clears within its time budget; with damage off for vehicles, the reinforcement loop spawns vehicles until the quota is met |
| T-perks | quotas ×.8 after Op 1; −40 after Op 3; the refill and pouch +2 after Op 4; n hostages carried into Op 6 |
| T-flow | title → briefing (skip) → map → opcard → play → tally → … → ending → credits → initials → title; continue restores the op-start state; all 6 endings by hostage count; loop 2 raises the multipliers; Mission Select unlocks after a clear |
| T-cutscenes | each cutscene runs to its end at speed and can be skipped by holding confirm |
| T-coop | `game.addPlayer({ pad: 1 })` gives a second player; separate ammo and damage; pickups to the shooter; quotas scale; DOWN, then back at the next op with 50; all DOWN → continue |
| T-attract | 10 s idle on the title → demo; the bot kills enemies and hits no civilian or hostage across the whole playlist; `tap('confirm')` or a mouse move returns to the title; the scores table shows |
| T-touch | with stubbed `matchMedia` and `maxTouchPoints`: the notice and the settings button show, taps don't start a game, attract runs; a keydown turns it off |
| T-dev | the pause menu has DEV MODE; changing `spawnDensity` to 2 doubles a beat's spawns; `railSpeed` changes the time to reach a beat; RESET TO DEFAULTS restores every slider; JUMP reaches the right op and beat; the cheats work |
| T-hub-mock | a Node mock of `AIHub` (connect, ready, card, start, send, on, time, rng, finish) with an in-memory bus (150 ms latency, 50 jitter, 5% loss), 1 host and 3 clients: clients see the host's entities within 250 ms; client hits kill on the host; every unreliable message < 1100 bytes; ≤ 18 messages a second per copy; time-up → exactly one `finish`; a leave removes a slot; server mode runs with no local player; `end` stops input and sound |
| T-bundle | the final file exists with the exact name; session.js is the first script right after `<meta charset>`, byte-identical to `hub/session.js`; all `hub:` metas are present; no `WebSocket`, `RTCPeerConnection`, `fetch(`, `XMLHttpRequest`, `alert(`, `confirm(`, `prompt(`, `window.open` in the game's code; `exit-interview.json` parses with every key and no empty value |
| T-playthrough | **the whole game:** a fair bot on RECRUIT, no cheats, from the title (press start) through all 6 ops, the cutscenes and the ending, to the initials; asserts the ending is reached, the rank exists, ≥ 3 hostages, no errors. A god-bot run on VETERAN asserts the same, faster |
| T-browser (not in `--quick`) | Playwright on the **final file** over `file://`: boot with no console errors; the title canvas isn't empty; attract after 10 s; deep links `#op1`…`#op6`, `#ending/5` load and report the right `debug.snapshot().scene`; `node engine/tools/check.mjs <final>.html#op1` passes with no errors |
| T-hub-harness (not in `--quick`) | 17.3 |

### 17.3 The real AI Hub harness

Copy the final .html and `hub/harness.html`, `bridge.js`, `round.js` into `tests/.serve/`. Start
`python3 -m http.server 0 --bind 127.0.0.1` there, read the port from its first line, and **keep its PID**. With
Playwright, open `http://127.0.0.1:PORT/harness.html?game=<final>.html&…` for each configuration:
`players=1&auto=1`, `players=2&auto=1`, `players=4&latency=150&jitter=50&loss=5&auto=1`,
`players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1`, `players=2&scenario=server&auto=1`. Wait for
`document.body.dataset.complete === 'true'`, then require `window.__hubCheck.pass === true`. First confirm that the frames
hold our game (`document.title` is "Operation Wolfpack" inside a frame) before trusting a result. Print the checklist only
on failure. Stop the server by its PID, and only that one: never `pkill`, `killall`, `fuser -k`, or kill whatever holds a
port.

### 17.4 Screenshots (only for what a script can't check)

Look, readability at 10 feet, animation quality and lighting. Use `node engine/tools/check.mjs` and
`node engine/tools/filmstrip.mjs` on deep links into `shots/`, and review: each op's opening screen, each boss, the
breakout at night, the takeoff at altitude, the HUD with 1 and 4 players, the title, the map, the tally, the About pages,
the hub card, the touch notice, plus filmstrips of a rifleman's death, a grenade throw, a knife throw, the reload, an
explosion and the mast toppling. Act on every look note `check.mjs` prints. Retake a screenshot only after changing what
it shows.

---

## 18. Definition of done

- [ ] `./OperationWolfpack-OperationWolf-claude-opus-5-5-max-20261103-174746.html` is one file that runs over `file://`
      and in the AI Hub harness; every dev file is in the dev folder.
- [ ] Every system in section 7 and every screen in section 10 works; all six operations, six bosses, every cutscene in
      8.8 and all six endings play; no TODO, placeholder text or stubbed feature (`run.mjs` fails on `TODO|FIXME|placeholder|lorem` in
      `src/` and on an empty `WP.TEXT` value).
- [ ] Keyboard and mouse, keyboard only and a standard pad all play the whole game; prompts follow the last device;
      PlayStation glyphs by default and Xbox in Settings; the mouse hovers and clicks every menu.
- [ ] Attract mode starts after 10 s idle on the title and menus, shows every op, and stops on any input; touch-only
      devices show the notice, the settings button and the attract mode.
- [ ] The dev mode opens from the pause menu, with live sliders (11.1), reset to defaults, toggles, jumps, spawns and the
      data tools.
- [ ] Local co-op for 1–4 and AI Hub shared-world sessions for 1–4; the harness passes in all five configurations.
- [ ] All music, sound and voices are synthesized in code (no audio files); voices are gibberish with subtitles.
- [ ] `npm test` is green: failures only, plus one count line; the headless whole-game playthrough passes.
- [ ] The About/Credits screen and the chat reply carry Source Information, Testing Feedback, Engine Feedback and Prompt
      Feedback ("unknown" where you can't confirm); `./exit-interview.json` parses in the exact shape.
- [ ] `engine/CHANGES.md` lists every engine edit; the research clone and any servers you started are cleaned up.
