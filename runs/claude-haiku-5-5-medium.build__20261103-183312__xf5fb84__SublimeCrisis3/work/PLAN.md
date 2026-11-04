# Tide Crisis 3

**The title.** As TASK.md asks, I brainstormed 50 riffs on *Time Crisis 3* without showing them, then picked one with an
OS-entropy RNG (`python3`, `secrets.randbelow(50)` → #9). In file names it is `TideCrisis3`, and the source is
`TimeCrisis3`.

**The pitch.** Tide Crisis 3 is an original arcade light-gun shooter on rails, drawn in my-3D2dge's PS1-era pixel style
and played in first person. Two agents of C.R.E.S.T. (Covert Response & Emergency Strike Team) fight to take an island
city's tidal barrier back from a disgraced admiral before the dawn king tide drowns the city. You take cover to dodge
and reload, then pop out to shoot. You switch between four weapons, read the "crisis flash" that marks every shot that
can hit you, and beat the clock in every area. You can play alone, with two players on one machine (split screen), or
with 1–4 players online in an AI Hub session.

**The core loop** (write this sentence at the top of the game code): *the camera rides the rail to the next area (WAIT)
→ ACTION! starts the clock → pop out and shoot → duck when a crisis flash says a shot will hit → reload in cover →
clear the area before TIME runs out → ride on → beat the boss → STAGE CLEAR.*

---

## Contents
0. Read this first: deliverables, rules, environment, glossary
1. The game: what we keep from the source, pillars, modes, length
2. Source information (verified at planning time)
3. Technology and architecture
4. Systems (each with its spec, numbers and tests)
5. Content: world, cast, tone, enemies, stages, bosses, script, art, animation, audio
6. Build order and milestones
7. Risks and how to de-risk them
8. Testing
9. Done checklist (every TASK.md requirement, and where this plan covers it)

---

## 0. Read this first

### 0.1 Deliverables (exact names, all in this folder)
| What | Name |
|---|---|
| Dev folder (every dev file lives here) | `TideCrisis3-TimeCrisis3-claude-opus-5-5-max-20261103-174731/` |
| The game, one self-contained HTML file | `TideCrisis3-TimeCrisis3-claude-opus-5-5-max-20261103-174731.html` |
| Exit interview (exactly TASK.md's shape; check that it parses) | `exit-interview.json` |

The HTML inlines the patched engine, the game and the AI Hub session client. It plays from `file://` with no network.
Source Information, Testing Feedback, Engine Feedback and Prompt Feedback go in three places: the in-game About/Credits
screen, `exit-interview.json`, and the final chat reply. Generate all three from one data file (`src/99-about.js`,
§4.14) so they agree.

### 0.2 Golden rules
1. **Original world, original cast.** The source gives us a genre and a feel, nothing more (§1.1). Never use its names,
   levels, music, logos or UI art.
2. **The simulation knows nothing about rendering, and it is deterministic.** `Sim` holds the whole game state and
   steps it from player commands, with seeded RNG streams. The presentation layer (renderer, HUD, audio, FX) only reads
   it. Netcode, the headless tests, the bot and the attract mode all depend on this rule.
3. **Content is data, held in registries** (`def(kind, id, spec)`), and validators keep it honest (§4.10). Designers
   build the rest of the game later by adding entries, not by editing systems.
4. **No TODOs, placeholders or stubs.** If time runs short, cut whole scenes in the order in §6. Never cut a mechanic.
5. **Use the engine's standard features**: the pause menu, settings, control rebinding, full screen, the boot screen
   and auto-pause. Adjust them through `new E.Game({ menu: {...} })`; don't rebuild them.
6. **Tests run behind one command** that prints only failures and a one-line count (§8). After a change, rerun only
   the suites that cover the code you changed.
7. Don't use subagents or workflows to debate, review, judge or audit (TASK.md).

### 0.3 Environment notes
- Other agents share this machine. Read only what you need. Any server binds `127.0.0.1` on an OS-picked port
  (`python3 -m http.server 0 --bind 127.0.0.1` prints it). Confirm the served page is your game before you trust a
  result. Stop only processes you started, by their PID: never `pkill`, `killall`, `fuser -k`, or a kill on whatever
  holds a port.
- **`/tmp` (a tmpfs) was 100% full at planning time.** `git clone` failed there with "No space left on device".
  Chromium and Playwright write their profiles to `TMPDIR`, so export `TMPDIR=<dev>/.tmp` (create it, and add it to
  `.gitignore`) before any browser tool runs.
- Playwright: the handoff pins `playwright` 1.63.0. A Chromium build (`chromium-1243`) is already in
  `~/.cache/ms-playwright`. If the versions don't match, run `npx playwright install chromium` with `TMPDIR` set.
- Put reference clones outside the shared `runs/` tree, as sparse checkouts in a scratch folder you own, e.g.
  `~/.cache/<run-id>/`. Take `dist/handoff` of github.com/michaelcrosato/my-3d2dge and `lib/hub` of
  github.com/michaelcrosato/ai-hub. Copy into the dev folder only the files you ship or run (§3.2). The handoff is 16 MB.

### 0.4 Glossary
| Term | Meaning |
|---|---|
| Stage | One of the three levels (plus the Training range), each with its own world geometry, palette, music and boss |
| Scene (area) | One fight point in a stage: a time limit, player slots, enemy cover points, waves, cues. Shown to players as "AREA 2" |
| Slot | Where player *i* stands in a scene: a *stand* pose (exposed) and a *cover* pose (hidden), each a camera pose |
| Cover point | A spot an enemy hides behind and peeks out from |
| Wave | A group of spawns that starts at a time, at a distance travelled, or when an earlier wave is cleared |
| Threat | An enemy attack that will hit a player who is still exposed when it lands. Telegraphed by the crisis flash |
| Director | The per-scene runner: waves, cues, the clear condition |
| Rail | The camera paths between scenes (`E.Path`), and inside moving scenes |
| Carrier | A moving object a slot rides on (the boat, the funicular car, the tower lift) |
| View units (vu) | Resolution-free screen coordinates: `ax ∈ [−A, A]`, `ay ∈ [−1, 1]`, y up, where A is the viewport's aspect ratio |
| u | World units. 16 u = 1 m |

---

## 1. The game

### 1.1 From the source into our game
| Distinctive in Time Crisis 3 (and the series) | What we build (original) |
|---|---|
| A foot pedal: release it to hide behind cover and reload, press it to stand and shoot | **Cover is the game.** Hold L2, right mouse button or Space to duck behind real geometry; let go to pop out. You are invulnerable in cover, and you can only reload there. Toggle mode is a setting. |
| The series' first weapon-select system: a 9-round handgun with unlimited ammo, a machine gun, a shotgun, a grenade launcher | The same four weapon roles with our own names and numbers (§4.4). Fire while hidden cycles weapons, so a player with only a trigger can switch; R1/L1, the mouse wheel and the 1–4 keys also switch. |
| Shooting yellow-clad soldiers refills special-weapon ammo | **Quartermasters in orange life vests** carry ammo crates. Kill one and you get special ammo at once. |
| The crisis flash: shots that will hit you flash brighter, so you know to duck | **Crisis flash**: every threat shows a shrinking red ring with a white core and a "!" glyph at the shooter's muzzle, a muzzle flare, a rising tick sound, and an arrow at the screen edge if the shooter is off screen. Only threats can hurt you; misses are spectacle. |
| Red-uniformed soldiers (series tradition) who shoot fast and accurately | **Red Tide elites**: crimson coats, short telegraphs, every shot a threat. |
| A time limit on every area | **TIME** on every scene, drawn as a rising-tide gauge. When it runs out ("TIDE'S IN!") you lose a life. |
| Lives, continues, arcade score | Lives, 10-second continues, score, a chain multiplier, ranks, high-score initials. |
| Two-player link play, each player with their own screen | **Co-op where every player has their own viewpoint and cover**: split screen on one machine, or AI Hub shared-world co-op for 1–4 players. |
| A B-movie secret-agent story: an island invaded, a villain's broadcasts, partner banter, bosses on vehicles | The Lumen Isles, the Black Current mercenary fleet, Admiral Krake's broadcasts on giant screens, CREST radio banter in gibberish voices with subtitles, bosses on a gunboat, in a lighthouse and in a crab mech. |

**What we don't copy:** the agency (VSSE), the characters (Alan, Wesley, Alicia, Zott and the rest), the places
(Astigos, Lukano, Zagoria), the stage layouts, the music, the logos and the HUD art. The title is only a pun.

### 1.2 Pillars
1. **Duck, pop, shoot.** Cover protects you and reloads you, but every second in cover costs TIME.
2. **Read the crisis.** Every attack that can hurt you is readable, by shape, sound and timing, never by color alone.
3. **Beat the clock.** Each area's TIME pushes you to expose yourself.
4. **Spectacle on rails.** Whip-pan arrivals, vehicle chases, explosions, breakable scenery and bosses that fill the
   screen.
5. **A B-movie heart.** Hammy heroes, a grandiose villain, radio banter.
6. **Every agent sees their own angle**, whether on a couch or online.

### 1.3 Modes and the main menu
- **ARCADE**: one player plays Stages 1→3 with their cutscenes and the ending, and the high-score table is `arcade`.
- **CO-OP**: two players on one machine in split screen. P2 needs a gamepad. Same content as ARCADE; table `coop`.
- **STAGE SELECT**: any stage at any difficulty, with a table per stage. Every stage is open from the start: this is a
  demo, and every part should be reachable.
- **TRAINING**: the CREST shooting range, four drills that teach every mechanic (§5.8).
- **RECORDS**: high-score tables, the best Training time, and INTEL (the message bottles found).
- **SETTINGS**: the engine's screens plus our items (§4.15).
- **ABOUT**: credits, Source Information and the three feedback sections.
- **AI Hub session**: no title screen. The game opens on its own briefing card, then plays one stage as shared-world
  co-op for 1–4 players (§4.19).

### 1.4 Length targets
| Part | Target |
|---|---|
| Training | 2–3 min |
| Stage 1 (4 scenes + boss) | about 6 min of play |
| Stage 2 (4 scenes + boss) | about 6.5 min |
| Stage 3 (4 scenes + two-phase final boss) | about 7 min |
| Cutscenes (skippable) | about 4 min in total |
| ARCADE run | 20–24 min |
| AI Hub round (one stage) | 6–7 min (`hub:session-minutes` = 7) |

---

## 2. Source information (verified at planning time)

Fetched from Wikipedia's "Time Crisis 3" article on 2026-11-03. Put these facts on the About screen and in the exit
interview, and write "unknown" for anything not confirmed here or by the builder's own research.

- **Developers:** Namco and Nextech. **Publisher:** Namco (arcade). The PS2 version was published by Namco Hometek in
  North America and Sony Computer Entertainment in Europe.
- **Arcade:** North America February 2003, Japan April 1, 2003, on **Namco System 246** hardware. Its title screen says
  2002, and the 2002/2003 dating differs between sources.
- **PlayStation 2:** North America October 21, 2003; Europe October 31, 2003; Japan November 20, 2003. It supports the
  GunCon 2, which has a button in place of the pedal, and two-player play, including two linked consoles and TVs.
- **Mechanics:**
  - the pedal for hiding and advancing;
  - weapon switching, new to the series;
  - four weapons: a 9-round handgun (the only one with unlimited ammo), a 200-round machine gun, a 50-shell shotgun
    and a 5-round grenade launcher with splash damage;
  - shooting yellow-clad soldiers refills the special weapons;
  - a refined crisis flash, in which life-threatening shots are brighter;
  - two-player link play.
- **PS2 extras:** a playable Alicia Winston, with sniper sections; the "Crisis Mission" exercise menu.
- **Setting:** six years after Time Crisis II, the Mediterranean island of Astigos is invaded by the Zagorian
  Federation under General Giorgio Zott. We mention this only on the About screen; none of it appears in the game.
- **Not confirmed:** the exact time-limit rules, the lives defaults, and how weapons are switched in the arcade
  version. Write "unknown" if you state them.

Values for the Source Information block, for the builder to complete:
- **Date:** 2026-11-03 17:47:31
- **Source:** Time Crisis 3 (Namco/Nextech, 2003)
- **Plan:** `PLAN.md`
- **Genre and Perspective:** an on-rails light-gun shooter with a cover system, played from a first-person rail camera,
  with third-person cutscene cameras
- **Tech:** the my-3D2dge handoff v0.85.2 full engine (patched), a custom software 3D renderer module ("Rail3D"), and
  AI Hub session client 1.4.0. No other libraries.
- **Art Direction:** the engine's native PS1-era pixel style, in perspective 3D
- **Animation:** the engine's Humanoid procedural rigs, plus new weapons, poses and moves
- **Audio:** the engine's chip synth and tracker for music and SFX, plus a Web Audio formant gibberish voice synth
- **Online:** AI Hub Session Protocol v1, shared-world co-op for 1–4 players
- **Testing:** headless Node tests (`game.advance` and `game.debug`), Playwright checks, the AI Hub harness
- **Research:** the engine handoff docs, the AI Hub protocol docs, the Wikipedia article (fetched 2026-11-03)
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model** and **Usage:** as TASK.md says

---

## 3. Technology and architecture

### 3.1 The decision: the handoff's 2D engine, plus our own perspective renderer module
TASK.md says to build on `dist/handoff`. The handoff holds the full 2D engine (`my-3d2dge.js`, which includes every
module), but not the 3D engine (three.js and Rapier). The engine guide's light-gun recipe leans on that 3D engine.
We build a perspective first-person view on the 2D engine instead, because it gives us everything else:
- the exact fixed-step loop and headless `game.advance`;
- scenes, input with rebinding, pause and settings, the boot screen and audio;
- `E.Humanoid` rigs drawn by the engine from any view at any scale. `E.Mode7.view(k)` already draws rigs as
  billboards sized by distance.
- `E.shapeMesh(id)`, which gives any library shape (or one of ours) as triangles for "a 3D renderer";
- `E.materialTile(id, { band })`, which gives any material as a texture tile at any of the engine's five light bands.

So our module **Rail3D** draws the world itself:
- a z-buffered, perspective-correct, banded-light, fogged triangle rasterizer, run in JS into the game's own
  low-resolution buffer (320×240 minimum, `expand: true`, about 427×240 on 16:9);
- engine rigs composited into it as depth-tested billboards;
- our own 3D particles.

The result looks like a PS1 light-gun game drawn in the engine's own palette, shading and character art. It runs from
`file://`, bundles into one file, and the whole game logic stays testable headless.

Rejected: Mode 7 alone (a flat floor with billboards can't do rooms, stairs or cover that occludes properly); the 3D
engine plus three.js (it is not in the handoff, must be served rather than opened from disk, and sits outside the
native pixel pipeline).

### 3.2 Folder layout and commands
```
TideCrisis3-TimeCrisis3-claude-opus-5-5-max-20261103-174731/
  engine/my-3d2dge.js        handoff v0.85.2 full engine, patched (§3.6)
  engine/PATCHES.md          every engine change, with its reason (it feeds Engine Feedback)
  hub/session.js             AI Hub client 1.4.0, byte for byte (shipped)
  hub/harness.html bridge.js round.js   AI Hub harness (tests only, never shipped)
  src/                       the game, as fragments of one IIFE, concatenated in file-name order (table below)
  tests/run.mjs              THE test command; tests/*.test.mjs are its suites
  tools/build.mjs            concat → build/game.js; bundle → ../TideCrisis3-…-174731.html
  tools/hubcheck.mjs         serves hubtest/ on 127.0.0.1:0, runs the harness scenarios in Playwright, kills its own PID
  tools/check.mjs filmstrip.mjs   copied from the handoff (browser smoke test, motion contact sheets)
  index.html                 dev page: the engine + src/*.js loaded one by one (readable stack traces)
  package.json               "type": "module", devDependencies playwright 1.63.0
  .gitignore                 node_modules, .tmp, build, hubtest, check-output
```
Commands:
```
node tools/build.mjs                      # build/game.js and the single HTML in the work folder root
node tests/run.mjs                        # fast headless suites (the default)
node tests/run.mjs weapons threats        # chosen suites only
node tests/run.mjs --playthrough          # bot playthroughs of every stage and the whole ARCADE (slow)
node tests/run.mjs --browser              # tools/check.mjs on the bundle at four window sizes
node tests/run.mjs --hub                  # AI Hub harness scenarios in Chromium
node tests/run.mjs --all
```
**Source fragments.** Each fragment starts with a header comment (what it owns, what it reads). Top-level `const`s
are shared because the build wraps everything in one `(() => { const E = My3D2dge; … })();`. The tests load the same
`build/game.js`. A fragment has no side effects except registering things; `90-main.js` starts the game.

| File | Owns |
|---|---|
| `00-core.js` | `TC` namespace, units (`U = 16`), `def()` registries, event bus, RNG streams (`E.rng`), `TUNE` defaults (frozen) and live `tune`, difficulty tables |
| `01-math3d.js` | vec3 helpers, camera basis, project and unproject, aim↔ray, ray vs AABB/OBB/sphere/capsule, angle lerps, spring and trauma helpers |
| `02-materials.js` | new `E.MATERIALS`/`E.PATTERNS` entries, the texture bank (5 bands per material, lids), canvas textures (signs, live screens) |
| `03-geometry.js` | geometry builder `G`: brushes, prefabs, `E.shapeMesh` import, tessellation, static batching and baked light, colliders |
| `04-rail3d.js` | the renderer: framebuffer, depth, sky, triangle raster, billboards, splats, lines, decals, present |
| `05-fx.js` | 3D particles, tracers, explosions, muzzle flashes, decals, rain, splashes, fireworks, casings, screen FX |
| `10-input.js` | action map preset, per-player aim (mouse, pad, keys), aim assist, wheel, device tracking, prompt labels |
| `11-camera.js` | RailCam: rail following, slots, cover blend, carriers, shake, recoil, bob, cutscene camera, dev free camera |
| `12-weapons.js` | weapon registry and firing (hitscan, pellets, projectiles), ammo, switching |
| `13-player.js` | PlayerState: cover state, lives, i-frames, score, chain, stats, continues |
| `20-actors.js` | actor base: rig wrapper, hit volumes from joints, damage pipeline, reactions, deaths, corpses |
| `21-enemies.js` | enemy archetype registry and behavior state machines (cover points, entries, peeks, routes) |
| `22-threats.js` | ThreatDirector: telegraph, caps, minimum gap, pop-out protection, resolution, misses |
| `23-projectiles.js` | grenades, rockets, harpoons, torpedoes, missiles, flares, player GL rounds; all shootable |
| `24-objects.js` | breakables, explosive barrels, pickups, life rings, intel bottles, civilians, allies, doors |
| `25-bosses.js` | boss framework plus Stingray/Barracuda, Hammerhead, Scylla, Krake (also Bulldog, The Gull, Seawolf) |
| `30-stagefmt.js` | stage, scene and wave schema; the Director; validators |
| `31-stage1.js` … `33-stage3.js`, `34-range.js` | content: geometry, rails, scenes, waves, cues |
| `40-story.js` | speakers, cutscene scripts, radio lines, briefing pages |
| `41-voice.js` | gibberish voice synth |
| `42-audio.js` | songs, SFX voices, ambience, the spatial mix |
| `50-hud.js` | HUD |
| `51-screens.js` | title, menus, select, co-op join, briefing, results, continue, game over and initials, records, about, ending, how-to, touch-only notice |
| `52-dev.js` | dev mode panel, overlays, free camera |
| `53-attract.js` | attract controller and the Autopilot bot |
| `60-sim.js` | `Sim`: the authoritative state and `step(dt, commands)` |
| `61-local.js` | local session: drop-in co-op, split screen, routing devices to players |
| `62-net.js` | AI Hub: connect, card, host and replica replication, finish |
| `90-main.js` | `new E.Game`, scenes, boot steps, `game.debug` |
| `99-about.js` | About and credits data; `tools/build.mjs` also writes `exit-interview.json` from it |

**The bundle.** `<meta charset="utf-8">` comes first. Next comes `hub/session.js`, the first script in `<head>`,
unmodified. Then the hub meta tags (§4.19), the viewport meta, the style, the engine's `E.bootSplash` markup at the
start of `<body>`, `<canvas id="screen">`, the engine script, and the game script. Nothing is fetched from the network.

### 3.3 Units and conventions
- The engine's world: x east, y south, z up, **16 u = 1 m**. **Yaw** is in radians, with 0 = east (+x) and +π/2 = south
  (+y), the same as `E.angleTo` and `E.Path.at().angle`. **Pitch** is in radians, positive up. **FOV** is vertical,
  55° by default (dev slider 45–75°).
- The camera basis for yaw ψ and pitch θ:
  - forward `f = (cosθ cosψ, cosθ sinψ, sinθ)`;
  - right `r = (−sinψ, cosψ, 0)` (looking east, your right is south);
  - up `u = (−sinθ cosψ, −sinθ sinψ, cosθ)`.

  View space is `x = d·r`, `y = d·u`, `z = d·f`. Screen: `sx = cx + x·F/z`, `sy = cy − y·F/z`, with
  `F = (h/2) / tan(fov/2)`. Roll rotates (x, y) before the divide.
- **Aim (view units):** the reticle is at `(ax, ay)`, with `sx = cx + ax·h/2` and `sy = cy − ay·h/2`. The ray
  direction in camera space is `normalize(ax·tan(fov/2), ay·tan(fov/2), 1)`. Headless, every viewport's aspect is
  16/9 unless the presentation layer sets it.
- **Human scale:** a Humanoid at `size: 1` is about 26 u tall (the asset library is "sized for a 26-unit hero").
  - Soldiers use `size: 1.0–1.1`. Measure the head-top height at boot (`rig.J.head` after one `rig.update`), store it in
    `TC.H.rig`, and have a test assert it is between 24 and 30 u.
  - Player eye height: **24 u standing, 12 u in cover.**
  - Crouch-height cover is 13–16 u (an engine crate is 15×15×14). High cover, which enemies peek around from the side,
    is 34–48 u.
  - A container is 98×39×42 u (6.1 × 2.4 × 2.6 m). A door is 16×34 u. A building floor is 48 u.
- Fights happen at 96–320 u (6–20 m), and bosses at up to 480 u. At FOV 55° and 240 px, a 26-u soldier at 10 m is
  about 37 px tall.
- **Time:** the Sim steps on the engine's `dt` (1/120 s × `timeScale`). All timers are in seconds of Sim time.
- **Randomness:** inside the Sim, only `sim.rng(stream)` (mulberry32 via `E.rng`, seeded from the run seed). Cosmetic
  FX may use their own stream. **No `Math.random` in `1x`–`3x`, `60` or `62` files**; a test greps for it.

### 3.4 How it runs
**Engine scenes** (`game.start({ scene, scenes, boot })`):
- `title`
- `menu`
- `difficulty`
- `select`
- `coop`: join
- `briefing`
- `play`: every stage, the Training range and the cutscenes. It is pausable when not in a session.
- `results`
- `gameover`: initials
- `records`
- `about`
- `howto`
- `ending`: credits
- `attract`
- `session`: the AI Hub briefing card, then play
- `server`: an AI Hub host with no local player

Every scene sets `camera: { zoom: false }` (the wheel switches weapons) and `touch: []`.

**`Sim`**
```js
const sim = new TC.Sim({ mode: 'arcade' | 'stage' | 'coop' | 'range' | 'attract' | 'host' | 'replica',
  stage: 1, scene: '1-1', difficulty: 'normal', seed, cheats: { god, ammo, freeze, oneHit },
  players: [{ id: 0, name: 'P1', color: '#e8443a', agent: 'kai', aspect: 16 / 9 }] });
sim.step(dt, commands);   // commands[i] = { aim: [ax, ay], fireDown, firePressed, coverDown, coverPressed,
                          //                next, prev, select: 0..4 (0 = none), reload }
sim.state                 // plain data: phase, stage, scene, timer, players[], enemies[], projectiles[], objects[], boss
sim.events                // this step's events: { type: 'shot' | 'hit' | 'kill' | 'threat' | 'impact' | 'pickup' |
                          //   'spawn' | 'cue' | 'say' | 'phase' | 'clear' | 'timeup' | 'boss' | ..., ... }
sim.cameraFor(i)          // player i's logical camera pose {x, y, z, yaw, pitch, roll, fov} (no shake)
sim.jump(stage, sceneId, { phase })   // dev, attract, tests
sim.hash()                // determinism checks
```
`Sim` has its own coroutine runner with the same yield rules as `game.script`: a number of seconds, a predicate,
another generator, nothing (one step). It does not use `game.script`, so several Sims can run in one Node process for
the net tests, and a scene change never kills them.

**One update step** (the `play` scene's `update(dt)`):
1. Build each player's command from its device (or the bot, or the network).
2. `sim.step(dt, cmds)`, which runs, in order:
   1. player commands, then the cover blend, reload and cooldowns, then shots;
   2. shot resolution (hitscan rays, pellets, launching projectiles);
   3. the Director (rail phase, waves by time, distance or clear; cues);
   4. enemies: their behaviors, then `rig.update`, then hit volumes rebuilt from the joints;
   5. ThreatDirector: new telegraphs, impacts resolved against cover;
   6. projectiles, objects, civilians, allies;
   7. bosses;
   8. TIME;
   9. events out.
3. The presentation consumes the events: SFX, voices, particles, HUD popups, camera trauma, rumble.
4. Online: `net.tick()` sends and applies messages (§4.19).

**One frame** (`play.draw(r)`, once per viewport in split screen):
1. `Rail3D.begin(sim.cameraFor(i) + presentation offsets, viewport rect)`;
2. the sky;
3. static and dynamic meshes;
4. blob shadows;
5. actor billboards, far to near;
6. decals, particles, lines and glows;
7. screen FX (rain, cover vignette, hit edge);
8. `present(g)` through **one** `r.overlay`;
9. the HUD overlay for that viewport;
10. the dialog box.

The engine draws `game.flash()` after the scene's overlays, so the crisis flash and explosion flashes sit on top and
follow the player's Screen flashes setting. In play, nothing goes through `r.actor`/`r.queue`, and
`game.lights.enabled = false`: Rail3D does its own lighting.

### 3.5 Registries (the designer-facing data)
```js
def(kind, id, spec)
```
The kinds are `material`, `prefab`, `weapon`, `enemy`, `boss`, `stage`, `scene`, `speaker`, `voice`, `song`, `sfx`,
`cutscene`, `highlight` (attract playlist) and `intel`. Entries refer to each other by id. The validators (§4.10)
check every reference, so adding content never means touching a system.

### 3.6 Engine patches (log each in `engine/PATCHES.md`)
1. **Long guns and off-hand items on `E.Humanoid`.**
   - New weapons: `weapon: 'rifle' | 'smg' | 'shotgun' | 'launcher' | 'sniper' | 'minigun' | 'harpoon' | 'cutlass' | 'flare'`.
   - New off-hand items: `offhand: 'shield' | 'hatch' | 'crate' | 'lantern' | null`.
   - Code to extend: the whitelist near `my-3d2dge.js` line 3960, `tip()` near 4011, the weapon rest direction near
     4231, and the weapon drawing in both the HD and the classic draw (the `// ---- weapons ----` blocks near 4535 and
     4616: `ops.push({ d, f })` with `Sp()`/`cap()`).
   - Two-handed weapons re-solve the left arm with `ik3` to a fore-grip at `handR + bladeDir · grip`.
   - `tip()` returns the muzzle.
   - `cutlass` is the sword path with a curved blade.
   - The shields block from the left forearm.

   Acceptance: a filmstrip of every weapon idle, aiming (`point: true`, `aim` ±0.5) and firing, from the front, the side
   and three-quarter, with no detached hands.
2. **PlayStation glyphs by default.** In the STANDARD settings table (`glyphs`, about line 2999), the default becomes
   `'playstation'` and the options become `[['playstation', 'PlayStation'], ['xbox', 'Xbox']]`, as TASK.md asks.
3. **Mouse-wheel codes.** A `wheel` listener on the canvas presses `'WheelUp'` or `'WheelDown'` for one step;
   `codeLabel` gives "Wheel up" and "Wheel down". They can be bound and rebound like any code.
4. **Audio buses.** `game.audio.bus('sfx' | 'music')` returns the existing `_sfxBus` / `_musBus` GainNode, or null
   before sound starts. The voice synth and the richer SFX graphs connect there, so the volume settings apply to them.
5. (Optional, only if a test shows it's needed:) a hook that lets `E.Arcade.enter`'s letter wheel take its
   up/down/left/right from our input map.

Also confirm, with a test rather than a patch:
- `input.label()` gives `'R2'`/`'L2'` with PlayStation glyphs and `'RT'`/`'LT'` with Xbox glyphs;
- the codes on a custom preset include the menu keys. Copy `up down left right start pause confirm cancel` from
  `E.Input.DEFAULT` into our preset.

---

## 4. Systems

### 4.1 Rail3D, the renderer
**Data**
- **Mesh**: `{ groups: [{ mat, pos: Float32Array, nrm, uv, lit: Float32Array (baked light per vertex), flags }], bounds, sphere }`.
- **TextureBank** (built at boot):
  - each material has 5 band tiles: `E.materialTile(id, { size: 32, px: 2, band: 0..4 })`, plus `lid: true` versions
    for faces that look up or down. Each tile is converted to a `Uint32Array`.
  - Tiles are `v`-up with the top row first, so flip v when sampling.
  - Face-pattern materials (crate) use uv 0..1 across each face.
  - Use **named** materials in shape entries so `materialTile(id)` resolves them. Register any inline material in
    `E.MATERIALS` under a generated id first.
  - Material flags: `glow` (emissive), `water`, `double` (draw both sides), `alphaTest` (nets, grates, foliage cards,
    on the tile's alpha or a pattern mask), `scroll` (uv speed).
- **Instances**: `{ mesh, M (3×4), visible, dynamic, tint, flash, collider ids }`.
- **Static world**: built when a stage is built, then transformed to world space and baked. The baked light is
  `ambient + sunK·max(0, n·sun) + Σ static lights` plus contact darkening where a wall meets the floor. Tessellate
  faces to edges of 64 u or less so the vertex light, fog and near clipping stay clean. Bin it into 256-u chunks with
  bounding spheres for frustum culling.

**Per viewport, per frame**
1. `begin(cam, rect)`: the basis, `F`, the frustum planes; clear the depth to `+∞`.
2. **Sky**, per pixel from the ray's elevation e and azimuth a:
   - a three-stop gradient (the stage palette);
   - stars from a hash of the quantized direction where e > 0.05, twinkling;
   - a moon or sun disc with a halo;
   - two octaves of drifting noise clouds;
   - one to three distant silhouette layers on the horizon (`h(a)` heightfields: skyline, cliffs, the barrier);
   - lightning brightens it.
3. **Triangles**, for each visible group:
   - transform to view space, clip against the near plane (z = 2 u; Sutherland–Hodgman, a triangle becomes 0–2),
     project, and cull back faces unless the material is `double`;
   - rasterize over the integer bounding box with edge functions and a top-left fill rule. Interpolate `1/z`, `u/z`,
     `v/z` and `L/z` for perspective-correct values;
   - depth test on view z;
   - per pixel: `band = clamp(floor(L·4 + bayer4[x&3][y&3]), 0, 4)` (the engine's banded light, dithered between
     bands) → texel → fog → write color and depth;
   - fog `f = clamp((z − near)/(far − near))^1.2`, quantized to 8 steps with the Bayer threshold. Emissive materials
     skip lighting and take half the fog.
   - *Retro wobble* (a setting, off by default) snaps vertices to whole pixels and makes texturing affine.
4. **Dynamic light** on top of the baked light: up to 12 point lights per frame (muzzle flashes, explosions, flares,
   the lighthouse beam, the tram's lamps). Each adds `k·(1 − d/r)²` per vertex, only for triangles whose bounding
   sphere it touches.
5. **Water**: a material with `water: true`.
   - The band comes from `base + 0.6·sin(u·.11 + t·1.3)·sin(v·.07 − t)` plus noise.
   - Sparkles: the `hi` color where noise(u + t·8, v) > 0.82, weighted toward the moon or sun direction.
   - Vertex foam near shores and sluices.
   - Anything that falls below the water height spawns a splash.
6. **Actors as billboards.** Sort far to near; for each actor:
   - project the foot point; `k = F/z`; skip it if it is under 3 px tall or off screen.
   - Choose the view with `new E.View('r3', 'Rail3D', yawDeg, pitchDeg, k, 1)`. Take `yawDeg` from the
     **camera→actor bearing** `b`: `−b·180/π − 90`, as `E.Mode7.view` does from the heading. Take `pitchDeg` from the
     ray's downward elevation, **clamped to at least 3°** (a View at 1° or less becomes a side view, and Views can't
     look up). Cache the views by quantized key: yaw and pitch in 2° steps, k in 1/16 steps.
   - Clear a scratch canvas sized to the actor's bounds × k plus a margin (the engine draws actors up to about
     250 px), then `rig.draw(g, ox, oy, view)`; the patched engine draws the weapons.
   - `getImageData`, then for each pixel with alpha ≥ 128: depth = the view z of the actor's chest point − 4 u. If the
     depth test passes, write `color × actorLight` (mixed 60% toward white while the hit flash is on), and write the
     depth.
   - `actorLight = clamp(ambient + sun + Σ lights at the chest, 0.45, 1.25)`, tinted 25% toward the strongest light's
     color, so actors stay readable at night.
   - Draw a blob shadow before the actors: a dithered dark ellipse, 7 u in radius, on the ground under each.
7. **Splats and lines.**
   - Particles are projected points with a world-unit size. They are depth-tested, never write depth, and are either
     additive (sparks, fire, muzzle, glows) or dithered alpha (smoke, dust, spray).
   - Debris uses opaque pixels or `E.sprite` sprites.
   - Lines (tracers, laser sights, ropes, the lighthouse beam's edges) are depth-tested at their interpolated depth.
8. **Decals**: bullet holes and scorch marks on colliders' faces, with a depth bias of −0.5 u. A ring buffer holds 160.
9. **Canvas textures**:
   - signs, posters, and the festival's giant screens showing Krake's live broadcast, which is `rig.drawPortrait` into
     a 64×48 canvas, re-read every 4 frames;
   - consoles' screens;
   - text painted with `E.font`.
10. **Present**: `putImageData` into the buffer at the viewport's offset. Mirror `E.Mode7.draw`'s handling of
    `r.viewport`: `r.viewport || { x: 0, y: 0, w: r.bw, h: r.bh }`.
11. **Dev overlays** draw after `present`, in screen space: collider wireframes, hit volumes, cover points, rail paths,
    spawn markers, light radii, AI labels.

Canvas work happens only in `draw`; headless, `draw` is skipped. Create scratch canvases lazily, the first time they
are drawn, so Node never needs a canvas.

### 4.2 Camera, rail and cover
- **Logical pose**: the rail plus the slot plus the cover blend. It is deterministic and is the origin of every hitscan
  ray.
- **Presentation offsets**, visual only: trauma shake, weapon recoil, travel bob, carrier sway, hit jolt, breathing.
  They never move the aim ray. The reticle is drawn in screen space, so aiming stays exact.
- **Cover blend `c`** (0 out, 1 in):
  - it moves toward its target at `1/coverIn` (0.12 s) or `1/coverOut` (0.15 s);
  - **exposed means `c < 0.5`**;
  - pose: `pos = lerp(stand, cover, smooth(c))`, with yaw and pitch on the short way round; `roll = sin(πc)·2°`.
  - A cover pose sits 10–14 u lower and 6–16 u to the side, and is turned 8–20° away. The cover object fills 40–60% of
    the screen, so ducking reads instantly.
- **Arrival**:
  - each scene has an `arrive` path (`E.Path`, catmull) walked at its speed, easing in and out at the ends;
  - the look direction follows `look` keys along the path (`'path'` heading, or a world point), slerped;
  - at the end the camera blends into the slot's stand pose over 0.3 s, then "ACTION!" shows and TIME starts.
  - On foot (speed > 80 u/s): 2 Hz bob, 1.2 u.
- **Moving scenes**: slots ride a **carrier** (the boat, the funicular car, the tower lift) on its own path. The cover
  prop is part of the carrier, and waves trigger by the carrier's distance `d`. If enemies are still alive at the end
  of the path, the carrier stops until they're dead.
- **Shake**: trauma in 0..1, decaying 1.6/s; the offset is `noise(t·18) · trauma² · 2.5°`, scaled by `settings.shake`,
  and zero under reduce motion.
- **Recoil**: pitch kick per shot (handgun 0.6°, MG 0.25° each, shotgun 2.2°, GL 1.5°), with spring recovery.
- **Hit jolt**: roll 4°, pitch −2°, as a damped spring.
- **Carrier sway**: boats roll and pitch on slow noise of ±1.5°; the funicular swings ±1°.
- **Cutscene camera**: keys `[{ t, at, look, fov }]` with easing, plus 16-px letterbox bars. A cutscene can borrow the
  rail.
- **Free camera (dev)**:
  - fly with WASD or the left stick; look with the mouse or the right stick; Q/E or L1/R1 move down/up; Shift goes fast;
  - **Copy pose** writes `[x, y, z, yaw°, pitch°]` to the clipboard and the console for authoring.

### 4.3 Controls, aiming and prompts
| Action | DualSense (standard mapping) | Keyboard + mouse | Keyboard only |
|---|---|---|---|
| Aim | Right stick (the left stick also aims) | Mouse (absolute reticle, like a light gun) | Arrows / WASD move the reticle |
| Fire | **R2** (Pad7), also ✕ (Pad0) | **Left click** | Z or J |
| Take cover (hold; toggle is a setting) | **L2** (Pad6), also ○ (Pad1) | **Right click** or **Space** | X or Shift |
| Next / previous weapon | R1 / L1 (Pad5/Pad4) | **Wheel**, E / Q | E / Q |
| Pick a weapon | — | 1 2 3 4 | 1 2 3 4 |
| Switch while hidden | Fire while in cover cycles to the next weapon with ammo | same | same |
| Quick reload (ducks for the reload time) | □ (Pad2) | R | R |
| Pause | Options (Pad9) | Esc / P | Esc / P |
| Cutscene: next line / skip (hold 0.6 s) | ✕ / hold ✕ | Click or Enter / hold Enter | Enter |
| Menus | D-pad or stick, ✕ confirm, ○ back | Hover focuses, click picks, wheel scrolls; Enter / Esc | Arrows, Enter, Esc |

Create (Pad8) is never bound: the AI Hub reserves Create+Options. In play, the d-pad nudges the pad reticle.

**The aim model**, per player, in view units. The Sim receives only `aim` (exact, resolution-free).
- **Mouse.** `aim` comes from `input.pointer()`, mapped through that player's viewport rect, so it sits exactly under
  the pointer. Hide the OS cursor over the canvas while play is active and the last device is the mouse. When the
  pointer leaves the canvas, keep the last aim.
- **Pad.**
  - Response curve `v = sign(s)·|s|^2.2`; speed 1.6 vu/s × `padSpeed`.
  - Acceleration up to ×1.5 after the stick has been held 0.35 s.
  - **Aim assist** (Off, Low .35, Medium .6, High .85; Medium by default):
    - friction: speed × (1 − 0.55·assist) while the reticle is within 0.07 vu of a target's projected volume;
    - magnetism: `aim += (center − aim) · min(1, assist·6·dt)`, only while the stick moves (|s| > .2) and the target
      is within 0.12 vu;
    - targets are enemies, shootable projectiles, life rings and bottles; never civilians.
- **Keys.** A constant 1.2 vu/s.
- In cover the reticle hides. When you pop out, the pad keeps its position; the mouse follows the pointer.
- **Prompts** always come from `input.label(action)`: `game.input` for P1, `game.players[i]` for the others. They show
  in a rounded button frame and follow `input.lastDevice` (keyboard/mouse labels like "Right click"; the pad's glyph
  family from the Button symbols setting). Before any input, show both the pad and the keyboard/mouse prompts.
  Hardcoding a key name anywhere is a bug, and a test greps the source for it.

### 4.4 Weapons
| | Handgun **"P9 Marlin"** | Machine gun **"Riptide"** | Shotgun **"Breakwater"** | Grenade launcher **"Squall"** |
|---|---|---|---|---|
| Ammo | 9-round magazine, unlimited reserve | pool, max 240, +60 a pickup | pool, max 36, +8 | pool, max 6, +2 |
| Fire | semi-auto, up to 6/s; holding auto-repeats at 3.5/s (Auto-fire setting) | full auto, 12/s held | pump, 1.5/s | 1/s |
| Damage | 1.0 | 0.45 | 8 pellets × 0.45 | 6 at the center, falling to 1.5 at 48 u |
| Spread | 0 | 0.6°, blooming to 3° (recovers 6°/s) | 5.5° cone | projectile, 640 u/s, gravity 240 u/s² |
| Special | reloads in cover in 0.30 s | shreds drones and crowds | staggers; knocks shields aside; knocks rushers back | wrecks vehicles, barricades, armor; splash hurts enemies only |
| Switch time | 0.20 s | 0.25 s | 0.30 s | 0.35 s |

- Hits: head ×2 (HEADSHOT), torso ×1, legs ×0.75 plus a stagger.
- Special ammo carries over between scenes and stages within a run. An empty special switches back to the handgun.
- A weapon appears in the cycle once you have ammo for it.
- You can't fire while `c > 0.2`.
- "RELOAD!" flashes when the magazine is empty.
- Weapons are registry entries (`def('weapon', …)`) whose numbers are dev sliders.

### 4.5 Player state, TIME and scoring
- **Lives:** Easy 7, Normal 5, Hard 3. Extra lives come from 150,000 and 400,000 points, and from the one life ring
  per stage.
- **After a hit:** 1.5 s of invulnerability, a red border pulse, the chain resets, a camera jolt, rumble (0.6, 0.25 s),
  and a voice grunt.
- **Out of lives:**
  - one player: the Sim freezes for **CONTINUE? 10…0**. Continuing restores lives, **resets the score to 0** (a
    continue mark is shown beside it) and restarts the current scene's waves.
  - co-op: each player counts down alone while the Sim runs.
  - AI Hub: an automatic return after 6 s with −5,000 points.
- **TIME:**
  - each scene has its seconds, × difficulty (Easy ×1.25, Hard ×0.85) × a dev slider. It counts only during ACTION
    and boss fights.
  - Killing an elite (Red Tide, a sniper) gives +2 s ("TIME EXTEND +2").
  - At 0: **"TIDE'S IN!"**, −1 life (this ignores invulnerability), and TIME refills to 60% (a slider).
  - On a clear: remaining seconds × 100 points.

**Score**

| Event | Points |
|---|---|
| Hit on an enemy | 100 |
| Kill | by archetype (§5.3) |
| Headshot | +500 |
| Quick kill (within 0.7 s of exposure) | +500 |
| A projectile shot down in the air | +1,000 |
| A breakable | 50 |
| A bonus target (bottle, ring) | 2,000 |
| A civilian or hostage hit | −5,000 and −1 life |

**Chain.** +1 per hit. The multiplier is `1 + floor(chain/5)·0.1`, at most ×2.0. A miss (a shot that touches no enemy
and no bonus target) or a hit taken resets it.

**Stage ranks**

| Rank | Condition |
|---|---|
| S | accuracy ≥ 75% and no lives lost |
| A | accuracy ≥ 60% and ≤ 1 life lost |
| B | ≥ 45% |
| C | otherwise |
| D | a continue was used |

**Stats:** shots, hits, accuracy, headshots, kills, quick kills, cover saves (threats blocked), lives lost, civilians
hit, the best chain, time. They feed the results screen and the AI Hub stats.

### 4.6 Enemies (framework; the roster is in §5.3)
**Cover points** in the scene data: `{ id, at: [x, y, z], face (yaw toward the players), h: 14 | 40, peek: ['up', 'left', 'right', 'over'], ledge: bool, water: bool }`.

**The state machine**, with timings from the archetype and `sim.rng`:
```
SPAWN → ENTER(entry) → HIDE ⇄ PEEK → AIM (maybe a telegraph) → FIRE → HIDE …
                         ├→ RELOCATE (after n cycles, along a route to another cover point)
                         ├→ FLEE (quartermaster) / ADVANCE (rusher, shield)
any → HIT (react) → DEAD (death style) → CORPSE 2.5 s → dithered fade 0.5 s
```
**Entries**, each its own animation:
- `stand`: already there; pops up;
- `run`: along a route to the cover point;
- `jump`: down from a roof or container, with an arc, `air` and a heavy `land`;
- `rappel`: down a rope line, with `climb`, hand over hand;
- `door`: the door swings open, then the enemy runs out;
- `vault`: over a barrier;
- `roll`: a dive into cover (`flip`);
- `vehicle`: off a boat, jet ski or truck.

**Peeks**:
- `up`: crouch → stand with `point: true` and `aim` toward the target camera;
- `left` / `right`: a 10-u side step with a 12° lean;
- `over`: a shield trooper fires over his shield.

Leaning is done by turning the upper joints about the hips after `rig.update` (the Emberdeep technique: wrap
`solvePose`).

**Fire plan.** On each exposure: aim for 0.35–0.6 s, then a burst of N shots. Each shot asks the ThreatDirector for
`threat` or `miss` (§4.7).

**Hit volumes**, rebuilt from the rig's joints every step through `rig.worldOffset(J.*)`. `rig.update` runs headless,
so they are deterministic.
- head: a sphere of `headR·size·1.15` at `J.head`;
- torso: a capsule from the hip center to the neck, radius `torsoW·0.6·size`;
- legs: a capsule from the hips to the feet, radius 2.2·size;
- a shield: an oriented box in front of the left forearm, which blocks rays and sparks.

A shot hits the nearest of (volumes ∪ colliders ∪ shootables ∪ civilians) along its ray.

**Reactions**:
- a 0.06-s white flash; a flinch (`hurt` for 0.25 s);
- a stagger for leg hits or shotgun hits: knockback 30–60 u/s and a lean back;
- a headshot snaps the head back 25° (a joint post-process) and the body collapses.

**Death styles**:
- `crumple`: the engine's `die` pose;
- `flyback`: a close shotgun blast or an explosion; velocity away from the blast, a roll (`flip`), then `down`;
- `fall`: off a ledge, with `air`, then lying down;
- `splash`: into the water, with spray, sinking;
- `spin`: an MG kill; a 120° turn into `die`.

### 4.7 The ThreatDirector (the crisis flash)
- **The decision.** A shot becomes a threat if all of these hold:
  - `rng < chance × tune.threatMul × difficulty`;
  - the target has fewer active threats than `maxThreats` (Stage 1: 1, Stages 2–3: 2; Easy −1, Hard +1, minimum 1);
  - `minGap` (0.35 s) has passed since the target's last impact.

  Otherwise it is a miss. Red Tide shots, snipers, rockets, rusher slashes, torpedoes and boss attacks are always
  threats, but they hold their aim longer to respect `minGap`. **No two impacts on one player land closer together
  than `minGap`.**
- **The telegraph**:
  - a ring at the muzzle's screen point, shrinking from 26 px to 6 px over the telegraph time, red with a white core
    and a "!" glyph (a "Large" setting doubles its size);
  - a muzzle flare and a dynamic light;
  - a tick at 66% and a sharp chirp at impact;
  - an edge arrow when the shooter is off screen;
  - threats aimed at teammates show only a small outline.
- **Pop-out protection.** If a player leaves cover with less than 0.15 s of a telegraph left, the impact slides 0.15 s
  later.
- **Resolution at impact time T**:
  - exposed, not invulnerable, not in god mode → **HIT** (§4.5);
  - otherwise **BLOCKED**: the bullet strikes the cover prop (sparks or splinters, a ricochet "ping") and the "cover
    saves" stat goes up.
  - Online, the host resolves at T + 0.2 s, using the cover timeline the client reported (§4.19).
- **Misses**:
  - a tracer from the muzzle to a point 8–30 u off the camera, never through the reticle;
  - a whizz panned by screen x;
  - an impact effect on the nearest collider behind: metal sparks, wood splinters, concrete dust, water spray, glass.

### 4.8 Projectiles, objects, pickups, civilians and allies
**Projectiles**: `{ kind, pos, vel, gravity, hp, r (shootable radius), team, target }`. Every one is shootable and
shows a shrinking ring while it is a threat.
- **Enemy grenade**: lobbed to land 30–60 u in front of the target's cover in 1.1–1.4 s; hp 1. It is a threat at
  landing. Shot down in the air, it explodes there, hurting enemies within 48 u, for +1,000.
- **Rocket**: 220 u/s with a smoke trail; hp 1; a threat on arrival; shot down for +1,000.
- **Harpoon** (Barracuda): 300 u/s with a rope line; hp 2.
- **Torpedo**: runs on the surface at 120 u/s with a wake; hp 2. **Cover does not stop it: you have to shoot it.** A
  big prompt says "SHOOT THE TORPEDO!".
- **Missile** (Scylla): an arc; hp 1.
- **Flare** (Krake): 160 u/s and glowing; hp 1; it bursts into firework sparks.
- **Player GL round**: explodes on contact with a collider, an actor or water, or after 1.2 s.

**Breakables** `{ hp, debris, onBreak }`:

| Breakable | hp | Notes |
|---|---|---|
| Wooden crate | 3 | Breaking it removes its collider, which can expose an enemy |
| Window | 1 | Glass |
| Paper lantern | 1 | Falls and burns for 2 s |
| Bottles and market goods | 1 | Cosmetic, 50 points |
| Sign | 2 | Swings |
| Gallery and barricade sections | scripted | |

**Explosive barrels and tanks**: hp 2, radius 56 u, damage 8. Neighbors chain-explode after 0.15 s. They leave scorch
decals, a light, shake and debris.

**Pickups**:
- Quartermaster ammo, granted on the kill with a banner and the icon flying to the weapon panel;
- the **life ring** (red and white; shoot it): +1 life, "1UP!";
- the **intel bottle** (green glass; shoot it): added to the INTEL list (§4.20).

**Civilians** (festival-goers, dock workers, fishermen in yellow raincoats) and **hostages**:
- they have hit volumes and stop bullets; hitting one costs −1 life (even through invulnerability) and −5,000;
- radio: "Hold your fire!";
- civilians run routes and crouch.

**Allies** (single player): Rook and Mari as scripted actors.
- Shots pass through them, with a "Hey—watch it!" bark at most every 5 s.
- At cues they make scripted kills, shown as a tracer from the ally.
- In co-op they appear only in cutscenes.

### 4.9 Bosses (framework)
```js
def('boss', 'stingray', { name: 'STINGRAY', title: 'Black Current gunboat', time: 100,
  body: G => buildStingrayRig(G),                 // a mesh rig: hull and turret parts, posed by code
  parts: { turretL: { hp: 12, vol: [...], weak: true }, … },
  bars: [{ label: 'STINGRAY', parts: ['turretL', 'turretR'] }, { label: 'BARRACUDA', actor: 'barracuda' }],
  script: function* (B, sim) { /* phases: yields of seconds, predicates, sub-patterns */ } });
```
- **Parts** are named hit volumes on a mesh rig's transforms or on a Humanoid's joints. Each has hp and optional armor.
  A `weak` part pulses gold while it can be damaged, and breaking a part plays its own effects.
- **HP bars** sit under TIME, with a label and a segment per part. They flash on damage.
- **Intro**: a 2.5-s name card ("BARRACUDA — Captain of the Black Current"), a close-up, a music sting. In AI Hub
  sessions only the card shows; the camera isn't taken away.
- Every attack goes through the ThreatDirector and the projectile system, so cover, telegraphs and the tests all work
  the same for bosses.
- **Defeat**: 0.6 s of slow motion (`timeScale` 0.35, presentation-side), chained explosions, the death animation,
  then the outro.

### 4.10 Stage format, the Director and the validators
```js
def('stage', 1, { name: 'HARBOR LIGHTS', place: 'Port Lumen Docks', clock: '23:40', music: 'harbor',
  env: { sky: 'festival', fog: ['#1a2242', 400, 2000], ambient: .38,
         sun: { dir: [-.35, .45, .82], color: '#a8b8ff', k: .45 }, water: { z: -24, mat: 'sea-night' },
         weather: null, fireworks: true },
  build(G) { /* geometry: brushes and prefabs (§5.10) */ },
  intro: 'c1-intro', outro: 'c1-outro', scenes: ['1-1', '1-2', '1-3', '1-4', '1-B'] });

def('scene', '1-1', { title: 'LANTERN PIER', time: 45,
  arrive: { path: [[-160, 0, 24], [-60, -10, 24], [0, -20, 24]], speed: 110,
            look: [[0, 'path'], [.8, [300, 0, 18]]] },
  slots: [   // P1 on the left, P2 on the right (facing east, +y is to the right)
    { stand: { at: [0, -20, 24], look: [300, -10, 16] }, cover: { at: [-6, -32, 12], look: [300, -60, 10] } },
    { stand: { at: [0, 22, 24], look: [300, 10, 16] },   cover: { at: [-6, 34, 12], look: [300, 60, 10] } } ],
  covers: { c1: { at: [160, -30, 0], h: 16, peek: ['up'] },
            c2: { at: [180, 30, 0], h: 16, peek: ['up', 'right'] }, … },
  waves: [
    { at: .5, spawn: [['deckhand', 'c1', { entry: 'stand' }], ['deckhand', 'c2'], ['deckhand', 'c3']] },
    { after: 'clear', spawn: [['deckhand', 'c5', { entry: 'door' }], ['deckhand', 'c4', { entry: 'jump' }]] },
    { after: 'clear', spawn: [['quartermaster', null, { route: [[360, -80, 0], [360, 90, 0]], drop: 'mg', flee: 3.5 }],
                              ['deckhand', 'c6', { entry: 'run', from: [420, -60, 0] }]] } ],
  civilians: [{ at: 2, kind: 'festival-pair', route: [[120, -50, 0], [300, -50, 0]] }],
  objects: [['lifering', [100, 58, 18]], ['lanterns', 'stalls'], ['bottles', 'c1']],
  cues: [{ at: 0, say: ['juno', 'Hostiles on the pier! Watch the festival crowd!'] },
         { on: 'spawn:quartermaster', say: ['juno', "Orange vest! He's hauling ammo—drop him!"] }] });
```
- **Director phases**: `intro` (cutscene) → `travel` (WAIT) → `action` → `clear` (the time bonus counts up, 1.2 s)
  → `travel` … → `boss` → `outro` → results.
- A wave starts by `at` (seconds into the action), `atD` (carrier distance), `after: 'clear' | '<waveId>' | 'kills:N'`,
  or `on: '<event>'`.
- A scene clears when every non-civilian it spawned is dead and no wave is pending.
- Cues: `say` (radio, not modal), `cut` (a short modal line), `prompt` (a tutorial hint, the first time only), `fx`
  (an explosion, a door, a vehicle), `music` (a layer or a sting).
- **AI Hub slots 3–4.** Scenes author two slots. Slot 3 = slot 1 moved 28 u further left, perpendicular to the view;
  slot 4 = slot 2 moved 28 u further right. Each gets an auto cover prop (a crate pair 20 u ahead of its cover pose)
  unless the scene authors one. The validators check them like real slots.

**Validators** (tests run them over every stage):
- every id resolves (types, covers, speakers, songs, cutscenes);
- every cover point's **exposed** head and chest are inside the view (|ax| < 0.95A, |ay| < 0.95) from every slot's
  stand pose, with a clear ray (no collider in the way). This means every enemy can be shot;
- every **hidden** pose is fully occluded from every slot (the cover really works);
- no camera point, sampled along every arrive path and every slot pose, is inside a solid or within 4 u of a wall in
  front of it;
- paths are continuous; carriers' slots stay on their carrier;
- each scene's time allowance is at least 1.3 × the fair bot's clear time (measured by `--playthrough`; the result is
  stored in `tests/balance.json`);
- the scene lists in the attract playlist, the dev jump list and the stage lists match.

### 4.11 Story, dialogue and cutscenes
- **Speakers**: `def('speaker', id, { name, color, rig: { …Humanoid options }, voice: '<voice id>' })`. The portraits
  are live: `rig.drawPortrait` inside `E.Dialog`.
- **Cutscene pages** are modal: `talk.say(lines, { name, portrait: rig, onDone })` with the engine's markup:
  `{c=#ffd36a}…{/c}` for color, `{w=.4}` for a pause, `{shake}…{/shake}` for shouting.
- **Radio** is not modal: `{ auto: 2.5–4, modal: false, place: 'top' }`, one line at a time and queued. A Subtitles
  setting hides the text but keeps the voices.
- **Voice sync.** Set `talk.voice = null`. When a page starts, `Voice.say(text, speakerVoice)` plays it, and the
  Dialog's typing speed matches the voice's syllable rate.
- **Cutscene scripts** are generators on the Sim's runner. Steps: `cam(keys)`, `actor(id, { at, path, pose, expr })`,
  `say(id, text)`, `radio(id, text)`, `wait(s)`, `fx(…)`, `music(…)`.
  - Press confirm to advance a line; **hold confirm for 0.6 s to skip** ("HOLD ✕ TO SKIP" in the corner).
  - Skipping jumps to the cutscene's end state.
  - In AI Hub sessions, cutscenes are skipped; the radio and the boss cards stay.
- **Briefings** (one per stage) are pages over a stylized map of the Lumen Isles drawn with `px`, with Director Hale's
  and Juno's portraits and two or three objectives. They are skippable.

### 4.12 Audio: music, SFX and voices (everything written in code)
- **Music** uses the engine tracker `{ bpm, steps, tracks: [{ wave, vol, notes, name, on }] }` (§5.12).
  - Tracks are named so `audio.layer` can bring the drums and the lead in during ACTION and drop them during WAIT.
  - `audio.tempo(+8 bpm)` while TIME < 10 s.
  - Stings (stage clear, boss intro, extra life) via `audio.sting`.
  - Crossfade between scenes with `music(song, { fade: 1 })`.
- **SFX** are registered with `audio.define`. Each weapon is a list of voices: a noise burst with a falling filter plus
  a sine thump; the explosion is 1.2 s of decaying noise plus a 50-Hz sub. Long or filtered sounds (rain, surf, the
  crowd, the turbine hum, sluices) are small Web Audio graphs on `audio.bus('sfx')`.
- **Spatial mix**: pan by screen x, volume `1/(1 + d/240)`. At most 24 voices at once; quieter sounds are dropped first.
- **Ambience per stage**:
  - festival: crowd murmur (filtered noise), gibberish cheers, fireworks pops, gulls;
  - storm: rain, gusts, thunder after each lightning flash, surf on the rocks;
  - Tidewall: sluice roar, turbine hum, PA announcements in gibberish.
- **The voice synth** (Animalese/Simlish style, `41-voice.js`):
  - the text splits into syllables (consonant clusters plus a vowel); each syllable lasts 50–90 ms;
  - **vowels** drive a sawtooth or pulse source through two parallel band-pass filters at the formants:
    a 800/1200, e 400/2000, i 300/2300, o 450/800, u 325/700, y 300/1900 Hz;
  - **consonants** add a short filtered noise burst by class: plosives (p t k b d g) 12 ms clicks; fricatives
    (s f h z x c) 40 ms hiss; nasals (m n) a 30 ms hum; liquids (l r w) a glide into the vowel;
  - pitch is the speaker's base × the sentence contour (falling at a ".", rising at a "?", +25% and louder for
    ALL CAPS or "!") × a jitter per letter (a hash ±6%);
  - pauses: 120 ms at commas, 250 ms at sentence ends;
  - a per-speaker effect: `radio` (a 300–3000 Hz band and crackle), `boom` (low and wide, with a short delay),
    `gravel` (40 Hz amplitude modulation, slight drive);
  - the same text always sounds the same (seeded by its hash).
  - Barks ("Hraa!", "Reloading!", "Ugh!") use pools of short random syllable strings with no subtitles.
  - At most 2 dialog voices and 4 barks at once.
  - Headless (no `audio.ctx`), it schedules nothing and returns the line's duration, which the tests read.

### 4.13 HUD (canvas pixel UI; anchor to `r.W`/`r.H`; keep clear of `game.cornerArea()`)
- **Top center: TIME.**
  - "TIME" over **`45.00`** (font scale 3), on a 90×28 plate whose water level rises as TIME runs out;
  - red below 10 s, blinking below 5 s, a tick sound each second;
  - the boss bar goes under it.
- **Top left: SCORE** (scale 2), with the chain "×1.4" under it.
- **Bottom left: LIFE**, a row of CREST shield-badge sprites that flash and break when lost.
- **Bottom right: the weapon panel.**
  - icon, name and ammo: 9 bullet pips for the handgun; a number and a bar for specials;
  - a reload ring while in cover;
  - a 4-slot strip shows for 0.8 s after a switch.
- **Center**:
  - the reticle in the player's color with a white outline (styles: cross, ring, dot; sizes S/M/L);
  - a hit marker (a white ×, gold for a headshot);
  - "RELOAD!" under the ammo and flashing over the reticle when empty;
  - **"ACTION!"** (scale 4, slides in, 0.9 s) and **"WAIT"** (scale 3, blinking);
  - "TIME EXTEND +2", "TIDE'S IN!", "STAGE CLEAR";
  - score popups ("+1500") at the projected enemy positions;
  - pickup banners ("MACHINE GUN +60");
  - "NEW WEAPON" cards the first time a weapon is picked up.
- **Threat rings and edge arrows**, as in §4.7.
- **Cover feedback**: a dark vignette, a small "COVER" tag at the bottom center, the reticle hidden.
- **Radio box**: at the top, with a 32-px live portrait, the name in the speaker's color, two lines of at most 40
  characters, auto-advancing.
- **Prompt bar** (bottom center): device-aware tutorial prompts the first time ("HOLD [L2] TO TAKE COVER").
- **Co-op**:
  - split screen: each viewport has its own HUD. Secondary text uses scale 1, but key numbers never go below scale 2.
  - AI Hub: a teammate strip at the top right (name in the seat color, lives, a ● when in cover).
- **10-foot sizes**: the smallest text is scale 1 (7 px of 240, about 31 px on a 1080p TV); key numbers are scale 2–3.
  Check 16:9, 4:3 and 21:9.

### 4.14 Screens, flow and the 10-foot UI
**Rules**:
- at most 7 items a screen, each with a one-line description under it;
- one big focus highlight, animated as a wave;
- d-pad, stick or arrows move the focus, and hovering the mouse moves it too; ✕, Enter or a click picks; ○, Esc or a
  right click goes back;
- no dense tables: the results show 6 big count-up stats, and lists are paged (L1/R1, the wheel, or arrows), never
  scrolled.

Use `E.Menu` (it already does hover, click and keys), drawn with our own frame (`E.ui.box`, gradient
`['#10244a', '#081428']`, accent `#3aa0e8`, text `#f4f7ff`, gold `#ffd36a`, warning `#ff3b30`).

```
boot → title ─(any button)→ menu ─┬ ARCADE → difficulty → briefing(1) → play(1) → results → briefing(2) … → ending → initials → records → title
                                  ├ CO-OP → coop join (P2 press START on a pad) → difficulty → (as ARCADE, split screen)
                                  ├ STAGE SELECT → 3 cards → difficulty → briefing(n) → play(n) → results → initials → title
                                  ├ TRAINING → play(range) → range results → menu
                                  ├ RECORDS (tables per mode · range best · INTEL)   ├ SETTINGS (engine screens)
                                  └ ABOUT (pages)                                     └ HOW TO PLAY (device-aware diagram)
play: pause (engine menu: Resume · Restart scene · Restart stage · How to play · Dev mode · Settings · Controls · Full screen · Quit to title)
title/menu idle 10 s → attract (§4.17)          AI Hub: boot → session card → play(round stage) → session results
```
**The screens**:
- **Title**: a slow flyover of Stage 1's night harbor with fireworks, rendered by Rail3D.
  - The logo is `E.font.title` "TIDE CRISIS" (scale 4; colors `#ffffff #9fe3ff #3aa0e8 #1a4f9c`; outline `#08142a`;
    depth 3) with a big "3" in `#fff3b0 #ffb347 #ff5a2a #a81e1e` and an animated wave band under it.
  - "PRESS ✕" for a pad, "PRESS ENTER OR CLICK" for keyboard and mouse.
  - `E.versionLabel()` small, at the bottom.
- **Touch-only** devices (coarse pointer, no fine pointer, no gamepad, no key pressed yet): the title shows **"Controller
  or keyboard required"** and a large gear button that opens `game.menu('settings')`. There are no touch controls
  (`touch: []`, `input.touchEnabled = false`). The attract mode runs. A key press or a connected pad unlocks the
  normal title.
- **Briefing**: map pages; skip with ✕ or Enter.
- **Results**: the stage name, then count-ups (time, accuracy, kills, headshots, cover saves, lives lost), the time
  bonus, the accuracy bonus (`accuracy% × 300`), the no-damage bonus (20,000) and the total. The rank letter lands
  with a shake.
- **Game over**: "GAME OVER" → initials on `E.Arcade`'s letter wheel if the score qualifies → the table.
- **Ending**: the cutscene, the credits roll (cast with live portraits, "Made with my-3D2dge", the music), the final
  score, the initials.
- **Records**: tables `arcade`, `coop`, `stage1`–`stage3` (via `E.Arcade.table/qualifies/enter/drawTable`), the range's
  best time, and INTEL (the bottles found, each with its short funny note).
- **About**, as pages:
  1. the game and its credits;
  2. **Source Information**;
  3. **Testing Feedback**;
  4. **Engine Feedback**;
  5. **Prompt Feedback**;
  6. thanks and licenses (the engine is MIT; the asset store is CC0 if used).

  All of it comes from `src/99-about.js`.

### 4.15 Settings (our items, added through `menu.settings` beside the engine's)
| Key | Label | Options (default) |
|---|---|---|
| `difficulty` | Difficulty (new runs) | Easy / **Normal** / Hard |
| `aimAssist` | Aim assist (controller) | Off / Low / **Medium** / High |
| `padSpeed` | Aim speed (controller) | slider 0.5–2.0 (**1.0**) |
| `coverMode` | Cover control | **Hold** / Toggle |
| `autoFire` | Hold fire to repeat (handgun) | **On** / Off |
| `reticle` / `reticleSize` | Reticle / size | **Cross** / Ring / Dot · S / **M** / L |
| `threatSize` | Crisis rings | **Normal** / Large |
| `subtitles` | Subtitles | **On** / Off |
| `wobble` | Retro texture wobble | **Off** / On |

The engine already provides Button symbols (patched to PlayStation by default, with Xbox), volumes, comfort settings
(shake and flashes, which our FX respect), screen filters (CRT, scanlines), dead zone, invert Y, vibration and
rebinding. Its Controls screen names our actions: `menu.controls = { fire: 'Fire', cover: 'Take cover', next: 'Next weapon', prev: 'Previous weapon', reload: 'Quick reload', w1: 'Handgun', … }`.

### 4.16 Dev mode (from the pause menu; not available in AI Hub sessions)
"Dev mode" in the pause menu resumes the engine and opens our **canvas dev panel**. The Sim is frozen while the panel
is open; close it to play with the new values. It has 6 tabs (L1/R1, Q/E or a click):

1. **PLAYER**: God mode · Infinite ammo · Start lives (1–9, 5) · I-frames (0.5–3 s, 1.5) · Cover in (0.05–0.4, 0.12) ·
   Cover out (0.05–0.4, 0.15) · Reload (0.1–1.0, 0.30) · Pad aim speed (0.5–3, 1.6) · Aim assist (0–1, .6).
2. **WEAPONS**: handgun damage (0.5–3, 1) · MG rate (4–20/s, 12) · MG damage (0.1–1, .45) · shotgun pellets (4–14, 8) ·
   shotgun spread (2–12°, 5.5) · GL radius (24–96, 48) · GL damage (2–12, 6) · Ammo pickups × (0.5–3, 1).
3. **ENEMIES**: HP × (0.5–3, 1) · Threat chance × (0–3, 1) · Telegraph × (0.5–2, 1) · Fire interval × (0.5–2, 1) ·
   Max threats (1–4) · Minimum gap (0.1–1 s, .35) · Reaction delay × (0.5–2, 1) · Boss HP × (0.25–3, 1).
4. **TIME**: Freeze timer · Scene time × (0.5–2, 1) · Elite bonus (0–5 s, 2) · Refill after time-up (20–100%, 60) ·
   Game speed (0.25–1.5, 1).
5. **VIEW**: FOV (45–75, 55) · Show hit volumes · Colliders · Rail and cover points · AI state labels · Threat debug ·
   Perf overlay (ms per pass, triangles, pixels, actors) · Free camera · Hide HUD.
6. **ACTIONS**: Restart scene · Next / previous scene · Jump to… (every scene, boss and cutscene) · Kill all · Spawn
   enemy (pick a type; it appears at the nearest free cover point) · All weapons and full ammo · +1 life · Lose a life ·
   Trigger a threat on me · Clear stage · Game over · Bot plays (Autopilot) · Add a P2 bot (split-screen test) ·
   Voice test (each speaker says a line) · Music test (every song and layer).

**RESET ALL TO DEFAULTS** sits at the bottom, with a confirmation. □ or Backspace resets the focused item.
- Changed values show in gold, with the default in grey.
- Navigation: up/down move; left/right adjust (holding accelerates); ✕ or Enter toggles or runs; ○ or Esc closes.
  Hovering the mouse focuses, dragging moves a slider's knob, and the wheel adjusts.
- Values live in `tune` for the visit, and Reset copies `TUNE` back.
- Every slider's key is a path into `tune` (`'enemy.hpMul'`), and the panel is generated from a descriptor list, so
  adding a variable takes one line.

### 4.17 Attract mode and the Autopilot
**The attract controller** (`53-attract.js`):
- **Trigger**: 10 s on the title or the main menu with no input. Input means any key or button, a pointer move of more
  than 4 px, the wheel, or a stick past its dead zone.
- **The cycle**: DEMO (highlight *i*, about 28 s) → HIGH SCORES (6 s) → DEMO (*i+1*) → TITLE (8 s) → repeat, carrying
  on through the playlist.
- **The playlist** (`def('highlight', …)`), in order:
  1. 1-1 Lantern Pier
  2. 1-4 Canal Run
  3. 1-B Barracuda
  4. 2-1 Gull's Rest
  5. 2-3 Funicular and The Gull
  6. 2-B Hammerhead
  7. 3-2 Sluice Locks and Seawolf
  8. 3-3 Turbine Hall
  9. 3-B Scylla and Krake
- **The demo** is `Sim({ mode: 'attract' })` jumped to the highlight. It cheats freely: god mode, infinite ammo, travel
  ×1.5. Telegraphs still show, so the mechanic is visible. The bot plays in `showoff` style.
- The overlay shows "DEMO PLAY", the small logo and a blinking "PRESS START" in the right device label. The HUD stays.
- **Any input** goes back to the title, and that input is consumed so it doesn't also pick a menu item.
- **Watchdog**: if nothing progresses for 8 s, move to the next highlight.
- On touch-only devices the attract mode runs the same way; a tap goes back to the title, which shows the notice.

**The Autopilot** produces the same `Command` objects a player does. It drives tests (`fair`), the attract mode
(`showoff`) and the dev "P2 bot".
- **Perception**: it reads the Sim state, including threats and their timers.
- **Target priority**:
  1. threats on me, soonest impact first;
  2. projectiles in flight;
  3. Red Tide and snipers;
  4. rushers, nearest first;
  5. shields, if a shotgun or GL is available;
  6. the rest, by exposure time left.

  Never civilians, hostages or allies. When idle: life rings, bottles, and barrels next to enemies.
- **Aim**: a critically damped spring toward the target's head (headshot chance by skill) or chest, with a maximum
  speed and a reaction delay. It fires when the projected reticle is inside the target's volume, with jitter by skill.
- **Cover**: hide when a threat on me has under 0.25 s left and its source won't die first; hide to reload when empty
  (or at ≤ 2 rounds with no threats); pop out when no impact is due within 0.3 s.
- **Weapons**: MG against drones and groups; the shotgun against rushers, shields and close range; the GL against
  vehicles, barricades and bosses' armored parts; otherwise the handgun.
- **Skills**:

| Skill | Reaction | Speed | Headshots |
|---|---|---|---|
| `fair` | 0.30 s | 2.2 vu/s | 30% |
| `expert` | 0.18 s | 3.5 vu/s | 60% |
| `showoff` | `expert`, and uses every weapon and bonus target | | |

### 4.18 Local co-op (split screen)
- **CO-OP** opens a join screen: "PLAYER 2 — PRESS START ON A CONTROLLER".
  - `game.allowJoin({ max: 2, onJoin })`; the new player is `game.addPlayer({ pad: i })`.
  - P1 keeps the keyboard and mouse and any other pad. The mouse always belongs to P1.
  - In ARCADE, a second pad's Start also drops P2 in during play, with a slide into split screen.
- `game.splitScreen(2, { layout: 'columns' })`. Rail3D renders each viewport with that player's camera, and the HUD is
  drawn per viewport.
- One Sim with two players: shared enemies, time and rail; separate slots, cover, aim, weapons, ammo, lives, score
  and continues.
  - Threats choose a target player.
  - Pickups go to the player who made the kill.
  - Life rings go to whoever shoots them.
- When a player is out, their half shows "CONTINUE? 10" while the other plays on. If both are out, it's game over.

### 4.19 AI Hub online co-op (shared world; follow `lib/hub/README.md`, protocol 1)
**Tags** in `<head>`, after the session client:
```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Clear the stage together; most points wins">
<meta name="hub:session-howto" content="Aim mouse/stick · Fire click/R2 · Hold right-click/L2: cover+reload">
<meta name="hub:session-minutes" content="7">
```
The goal must stay at 60 characters or fewer and the howto at 80 or fewer.

**Flow** when `AIHub.active`:
1. Skip the title, the attract mode and every menu. Use `new E.Game({ autoPause: false, corner: false, fullscreen: false, … })`,
   and make the play scene not pausable.
2. In the first boot step, call
   `const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true })`. If it returns `null`,
   carry on as a normal game.
3. Build the round's stage: **stage = ((info.round − 1) mod 3) + 1**. Seats map to agents in seat order: Kai, Rook,
   Mari, Juno, and the colors come from `info.players`.
4. Call `AIHub.ready()` with no key press.
5. Show **our own card**, the session briefing: the stage name and art, every player in their color with a READY tick,
   the goal, this device's controls, and the countdown from the `card` event.
   - Enter or ✕ (button 0) calls `AIHub.answer('ready')`.
   - △ (button 3) or M calls `AIHub.answer('more')`; answering again takes it back.
   - The card has no menus or choices, and draws no `Math.random`.
6. On `start`, count down 3-2-1 while `AIHub.time() < 0`; ACTION! at 0. No intro cutscene.
7. **Host** (`info.isHost`) runs the authoritative Sim with every player.
   - **Server** (`AIHub.server`): no local player, input or camera. Show a status screen ("HOSTING · 3 AGENTS ·
     AREA 1-3") and keep the world running.
8. The end:
   - the host calls `AIHub.finish({ standings, scores, won, stats, awards })` once: on the boss's defeat, when every
     player has left, or immediately on `time-up`;
   - `standings` group equal scores; `won` is true if the boss was defeated;
   - stats per player: Kills, Accuracy, Headshots, Cover saves, Lives lost;
   - awards: Sharpshooter (best accuracy), Pointman (most kills), Iron Wall (most cover saves);
   - on `end`: stop input (`input.clear()`, ignore everything after), `audio.stopMusic()` and mute, and show "ROUND OVER"
     (or "HOST LEFT — ROUND VOID", or "YOU SAT THIS ONE OUT").
9. **Rules**:
   - network only through `AIHub.send`;
   - no `alert`, `confirm`, `prompt`, `window.open` or navigation;
   - Quit, Restart and Title do nothing;
   - Options while Create is held is ignored;
   - names are only ever drawn to the canvas, never into HTML.

**Messages** (short keys, quantized integers):

| Direction | Message | Reliability, rate | Content |
|---|---|---|---|
| client → host | `in` | unreliable, 15/s | `{ t: 'in', at, a: [ax·1000, ay·1000], c: 0/1, w }` |
| client → host | `sh` | reliable, ≤ 8/s, only when something happened | shots `[[at, w, ax, ay], …]` and cover changes `[[at, c], …]` since the last |
| host → all | `s` | unreliable, 10/s, **≤ 1,100 bytes** | `{ t: 's', at, ph, sc, d, tm, p: [[id, score, lives, chain, w, ammo, c]], e: [[id, type, x, y, z, yaw, state, hp]], pr: [[id, kind, x, y, z]], b: [phase, …hp] }` |
| host → all | `ev` | reliable, ≤ 8/s, batched | spawn, kill (with the shooter), hit, threat (`{ id, src, target, t0, dur }` in hub time), pickup, cue, scene, clear, over |

- **Rate limit**: a token bucket of 18 messages per second per copy (the protocol caps it at 20). Skip a snapshot when
  the bucket is empty; reliable batches merge.
- **The host**:
  - applies each player's latest `in` and every `sh` shot, rewinding the enemies: it keeps a 300-ms ring buffer of hit
    volumes at 30 Hz and tests each shot against the sample nearest its `at`, clamped 0–250 ms into the past;
  - keeps a cover timeline per player;
  - resolves each threat at T + 0.2 s against the cover state that player reported at T.
- **The replica** (a client):
  - renders enemies interpolated at `AIHub.time() − 120 ms`, driving rigs from position, velocity and state codes;
  - draws threat rings from `threat` events on the hub's timeline;
  - predicts its own cover, weapon and ammo at once and corrects them when the snapshot disagrees for 0.5 s;
  - takes score and lives from the host;
  - shows its own shots' sparks and hit markers at once, against the interpolated volumes, as cosmetics only; the
    host's `kill` events decide.
- **When a player leaves**: their agent disappears and threats retarget. If the host leaves, the clients get
  `end: host-left`.
- A snapshot over budget drops the enemies furthest from every camera; they come round-robin in the next snapshot.

### 4.20 Records, saves and intel
- High-score tables go through `E.Arcade` (modes `arcade`, `coop`, `stage1`–`stage3`). Don't use `E.Arcade.add`: it
  floats points in 2D world space. Use only `table`, `qualifies`, `enter` and `drawTable`.
- The range's best time, the flags (`seenTraining`, `seenPrompts.*`) and the INTEL bottles found (6: two per stage) go
  in `E.store`.
- There are no mid-run saves; this is an arcade game. STAGE SELECT makes every stage reachable.
- In AI Hub sessions, storage is the client's memory-only storage, so nothing persists. That's fine.

---

## 5. Content

### 5.1 World and cast
The **Lumen Isles** are an island republic whose capital, **Port Lumen**, lies below sea level behind the **Meridian
Tidewall**, a 3-km tidal barrier and power plant. Tonight is the **Lantern Festival**, on the eve of the **king tide**,
the highest in eighteen years, which peaks at **06:00**. **Admiral Silas Krake**, court-martialed after a storm
disaster he blames on the city, leads the **Black Current** mercenary fleet. He has seized the harbor and the
Tidewall, and at the peak he will open all forty floodgates.

| Character | Role | Look (Humanoid options) | Voice |
|---|---|---|---|
| **Kai Navarro** (P1, seat 1, red) | CREST agent; calm, fond of one-liners | `heroic`, size 1.05; charcoal suit coat, red tie (trim), short black hair; `gun` | 150 Hz, saw, 11 syllables/s |
| **Rook Halvorsen** (P2, seat 2, blue) | CREST demolitions, ex-navy diver; gruff; calls Kai "kid" | `bulky`, 1.1; brown leather coat, blue shirt, bald | 105 Hz, `gravel`, 9/s |
| **Mari Tejada** (P3, seat 3, green) | Lieutenant, Lumen Coast Guard; drives the boats | `heroic`, 1.0; orange and white coast-guard jacket with green trim, ponytail | 230 Hz, bright, 12/s |
| **Juno Achterberg** (P4, seat 4, yellow) | CREST tech on the radio (in hub sessions, a field agent) | `chibi`, 1.0; yellow headset (band hat), spiky teal hair | 200 Hz, nasal, `radio`, 13/s |
| **Director Ines Hale** | CREST HQ; briefings | `heroic`, 1.0; grey coat, long silver hair | 175 Hz, `radio`, 10/s |
| **Dr. Tomas Tejada** | Tidewall chief engineer; a hostage | white lab coat, short grey hair | 140 Hz, warm, 9/s |
| **Admiral Silas Krake** | Villain; the final boss | `heroic`, 1.15; long navy greatcoat with gold trim, cape, long white hair, naval cap; `cutlass` + `flare` | 95 Hz, `boom`, 8/s |
| **Brigitte "Barracuda" Sorel** | Stage 1 boss, captain of the gunboat *Stingray* | teal wetsuit with armor, white ponytail; `harpoon`, then `cutlass` | 210 Hz, staccato, 13/s |
| **Bruno "Hammerhead" Kessler** | Stage 2 boss, the enforcer | `bulky`, 1.6; armor, flat-topped steel helmet; `minigun` + `hatch` shield | 80 Hz, `gravel`, 6/s, often in CAPS |
| **The Gull** | Stage 2 sniper mini-boss | a hooded grey coat; `sniper` with a laser | 190 Hz, whispery |

The vehicles and machines are the **Stingray** gunboat, the **Bulldog** armored truck, the **Seawolf** gunship
helicopter and **Scylla**, a six-legged crab walker.

### 5.2 Tone guide (the source's B-movie style; original lines)
- Short, punchy, earnest. Names get said a lot, and exclamation marks are common. At most 70 characters a page, and at
  most two lines.
- Heroes trade cool one-liners and their partner groans at them. HQ talks in urgent radio jargon ("Copy that",
  "HQ to Kai").
- The villain is grandiose and speaks in sea metaphors. Henchmen announce themselves.
- Keep it slightly over the top, as 2000s arcade localization was, but never broken English, and never mocking.

### 5.3 Enemy roster
| id | Look | HP | Entries | Peek | Exposed for | Fire | Threat chance / telegraph | Score | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `deckhand` | navy sweater, watch cap, `rifle`; 4 skin tones | 1 | stand, run, jump, door | up, side | 1.4–2.2 s | burst of 3 at 0.12 s | 25% (S1) → 40% (S3) / 1.10 s | 1,000 | the common grunt |
| `marine` | olive armor, helmet, `rifle` | 2 | run, rappel, vault | up, side | 1.6–2.4 | burst of 4 | 35% / 0.95 | 1,500 | flinches on the first hit |
| `redtide` | crimson coat, beret, balaclava, `smg` | 2 | roll, jump | side | 0.9–1.3 | burst of 2 | **100% / 0.55** | 3,000, +2 s | radio warns the first time |
| `quartermaster` | **orange life vest**, crate on the back (`offhand: 'crate'`) | 1 | runs a route across | — | 2.5–4 s crossing | rarely: 10% / 1.2 | — | 2,000 | drops the scene's ammo; flees |
| `grenadier` | `bulky`, bandolier | 2 | stand, run | up | 1.2 | lobs a grenade | the grenade lands as a threat | 2,000 | the grenade can be shot down |
| `rocketeer` | helmet, goggles, `launcher` | 2 | stand (high) | up, side | 2.0 aim | a rocket | 100% (aim glint 0.8 + flight) | 2,500 | the rocket can be shot down |
| `shield` | `bulky`, riot shield, `smg` | 3 | advances between covers | over | — | burst of 3 | 40% / 0.9 | 3,000 | immune from the front; a shotgun or GL hit drops the shield aside for 1.5 s; head open when he fires |
| `rusher` | tank top, bandana, `cutlass` | 1.5 | sprints in a zigzag | — | 2–3 s approach | slashes at 2 m | 100% / 0.45 wind-up | 2,000 | cover blocks the slash; he staggers back and runs in again |
| `sniper` | hooded, `sniper` | 1 | stand (far, high) | up | long | 1 shot | 100% / 1.4 (the laser converges) | 3,000, +2 s | the beam is visible in the world |
| `drone` | a small quadrotor mesh with a red eye light | 2 | flies a path | — | erratic | zap beam | 30% / 0.9 | 1,500 | falls in sparks |
| `jetski` | a rider on a jet ski | rider 1 / ski 3 | races a water path | — | a pass | pistol | 30% / 1.0 | 1,500 (+1,000 for the ski) | the ski's explosion kills the rider |
| `gunner` | a mounted gun (bridge or truck) | 3 | stand | — | — | long bursts | 50% / 1.0 | 2,500 | |
| `captor` | Red Tide holding a hostage | 1 (head only) | stand | side (head) | 0.7 s | pistol | 100% / 0.8 | 5,000 | hitting the hostage = −1 life |
| `civilian` | festival-goers, dock workers, fishermen | 1 | run, hide | — | — | — | — | −5,000 | panics and crouches |

### 5.4 Stage 1, HARBOR LIGHTS (Port Lumen Docks, 23:40, Lantern Festival)
**Look**:
- night blue; the sky goes `#0b1026 → #1b2a52 → #3a3060` with a magenta city glow at the horizon; fog `#1a2242`
  400–2000;
- warm paper lanterns (`#ffb347`, static lights of radius 90);
- festival string lights (emissive `#ff5a5a #ffd34a #5ad1ff #8aff8a`);
- fireworks bursting over the bay, each flash a dynamic light;
- dark water with lantern sparkles.

Music: "Harbor Lights".

| Scene | Time | Setting and cover | Waves (about 8–14 enemies) | New in this scene | Objects and cues |
|---|---|---|---|---|---|
| **1-0 intro** | — | Mari's speedboat races in under fireworks; Krake's broadcast plays on the festival's giant screens (a live portrait texture); they dock at Lantern Pier | — | — | lines in §5.9 |
| **1-1 LANTERN PIER** | 45 | A 7.5-m wooden pier lined with lantern stalls; the warehouses of the quay ahead (x 380). P1 hides behind stacked fish crates, P2 behind barrels and a bollard (the schema example in §4.10) | (a) 3 deckhands pop up behind stalls; (b) one comes out of the warehouse door, one jumps off a fishing boat's cabin roof; (c) a quartermaster crosses the quay (MG +60) and a deckhand runs in | cover, reload, the handgun, the MG pickup, civilians | a festival couple flees early (don't shoot); breakable lanterns and bottles; **life ring** on a post; first-time prompts for cover and reload |
| **1-2 FISH MARKET** | 50 | Travel: along the quay, then Rook kicks in a side door. Inside, a brick hall with a tiled floor, wooden stalls, ice tables, hanging paper lanterns and an upper gallery | (a) 4 deckhands, 2 of them on the gallery, who fall when killed; (b) **the first Red Tide** rolls out from behind the ice table; (c) 2 marines vault the stalls, and a grenadier on the gallery throws the **first grenade** | Red Tide, grenades, explosive red generator tanks under the gallery (shooting them drops a section of it, killing 2) | an **intel bottle** on a shelf; Rook visible fighting at the far end |
| **1-3 CONTAINER YARD** | 60 | Berth 9: container stacks (red, blue, ochre, green), a gantry crane, sodium lamps, forklifts | (a) 3 deckhands jump down off containers and 2 hide behind forklifts; (b) **BULLDOG**, an armored truck, smashes through a container wall: its gunner (3 HP, above the gun shield, 50% threat), then its fuel tank (6 HP) for a huge blast; 2 marines climb out of the back; (c) a grenadier and a quartermaster (MG) | a vehicle set piece | a dock worker hides behind a forklift ("Don't shoot! I just work here!") |
| **1-4 CANAL RUN** (moving) | 60 | Mari drives through the Silver Canals under festival bridges; duck behind the boat's armored gunwale (part of the carrier); spray, sway | 3 pairs of jet skis from side canals; bridge gunners on 2 bridges, with deckhands on the railings who fall into the water; a quartermaster on a moored boat | a moving fight, jet skis | a fireworks barge: shoot its crates and the rockets wreck an enemy boat; a low bridge ("Heads down!", purely visual) |
| **1-B BOSS: STINGRAY → BARRACUDA** | 100 | The harbor mouth, the two boats side by side; cover behind the gunwale | §5.7 | the boss framework, torpedoes | — |
| **1-Z outro** | — | Barracuda falls into the sea; the Stingray explodes; Juno traces Krake's signal | — | — | STAGE CLEAR → results |

### 5.5 Stage 2, STORM SIGNAL (Gull's Rest and Lighthouse Point, 02:10, thunderstorm)
**Look**:
- slate and green-grey, with heavy rain (screen streaks and splashes);
- lightning every 9–15 s: the sky flashes, a white `game.flash` at 0.25, thunder after 0.5–1.5 s;
- fog `#26343c` 200–1200;
- timber and plaster houses with slate roofs; wet stone (a `wet` overlay pattern that brightens lit bands);
- fishermen in yellow raincoats;
- the lighthouse beam sweeps every 8 s: a visible cone of glowing lines and a dynamic light.

Music: "Storm Signal".

| Scene | Time | Setting and cover | Waves | New | Objects and cues |
|---|---|---|---|---|---|
| **2-0 intro** | — | The boat docks in the rain; lightning shows the lighthouse; Krake's radio intercept and Hammerhead's reply | — | — | — |
| **2-1 GULL'S REST** | 50 | A steep cobbled lane, timber houses, washing lines, boats up on blocks; cover behind a fish cart and a stone well | (a) deckhands in windows (the glass breaks); (b) **rushers**, 2 then 3, sprinting down the lane; (c) a quartermaster from an alley drops the **SHOTGUN +8** ("NEW WEAPON"); marines behind a cart barricade | rushers, the shotgun | a fisherman ducks in a doorway; laundry that tears and swings |
| **2-2 NET LOFTS** | 55 | Inside a tall wooden loft: stairs, hanging nets (`alphaTest`), fish-oil barrels | (a) a **shield** trooper advances down the stairs ("Shotgun! Knock that shield aside!"); (b) 3 **rappellers** drop through a roof hatch; (c) 2 Red Tide and a grenadier on the upper floor | shields, rappelling | the fish-oil barrels explode into fire; an **intel bottle** |
| **2-3 FUNICULAR** (moving) | 60 | The cliff funicular climbs through the storm; duck behind the car's bench and bulkhead | deckhands on the cliff-path terraces; **the passing car**: the descending car crosses with 3 gunners in a 4-s window; at the top station the car stops for **THE GULL**: a laser sniper among 3 perches on the lighthouse gallery, 4 HP (a headshot does 2) | snipers and laser telegraphs; a mini-boss | a quartermaster at the top station (MG); the **life ring** |
| **2-4 LIGHTHOUSE KEEP** | 60 | The courtyard, the keeper's house, the lighthouse door; then up the **spiral stairs** (vertical travel; shoot upward) | (a) marines and a Red Tide; (b) **hostage**: a captor holds Dr. Tejada at the door ("One more step and the old man swims!"); his head shows for 0.7-s windows; (c) rushers and deckhands through the house windows; 2 deckhands on the stairs above | hostages | rescuing Dr. Tejada is a cue |
| **2-B BOSS: HAMMERHEAD** | 120 | The lantern gallery at the top: the giant rotating lens, the storm, cover in the doorway and then behind the lens housing | §5.7 | cover that degrades and a scripted cover swap | — |
| **2-Z outro** | — | Dr. Tejada reveals the override is in the control tower; Juno: take the maintenance tram | — | — | results |

### 5.6 Stage 3, THE TIDEWALL (05:20 → 06:00, dawn)
**Look**:
- dawn: violet, then orange; the sky goes `#1f1a3a → #6a3f6f → #f29e6b` and the sun rises over the stage; fog
  `#8a7a8f` 500–2400;
- concrete slab, steel, hazard stripes (`#f2c12e`/`#1b1b1b`), sodium lamps (`#ffb04a`);
- teal water that **rises** through the stage: the water z goes up 1.5 u per scene and 4 u in the final fight;
- white foam at the sluices; the turbine hall's emissive screens (`#43f0c8`).

Music: "Tidewall".

| Scene | Time | Setting and cover | Waves | New | Objects and cues |
|---|---|---|---|---|---|
| **3-0 intro** | — | The maintenance tram runs along the crest, the sea high on one side and the city low on the other; Krake on the barrier's giant screens | — | — | — |
| **3-1 CREST ROAD** | 50 | The crest road, gate-machinery houses, lamp posts, a barricade | (a) a swarm of 5 **drones** ("Use the machine gun!"); (b) 2 **rocketeers** on gantries ("Rocket! Shoot it down!"); (c) a quartermaster drops the **GRENADE LAUNCHER +2**; marines and a shield behind a barricade (GL blasts it apart) | drones, rockets, the GL | — |
| **3-2 SLUICE LOCKS** | 70 | Catwalks over the roaring sluices; the giant gate | **4 glowing gate locks**, 6 HP each, to jam before the tide gauge peaks (a scene-local gauge); **SEAWOLF**, a gunship helicopter, strafes (threat bursts), drops rappellers and retreats after 30 damage; deckhands and Red Tide on the catwalks; drones | an objective set piece | Dr. Tejada on the radio guides you |
| **3-3 TURBINE HALL** | 60 | An interior: spinning turbines (dynamic meshes), steam vents, cranes, catwalks | (a) marines and Red Tide on catwalks; (b) 2 shields and rushers; (c) a grenadier and a rocketeer | combinations of everything | coolant tanks (explosive, white vapor); an **intel bottle**; Rook across the hall |
| **3-4 TOWER LIFT** (moving) | 50 | The glass elevator on the outside of the control tower; duck behind the lift's console | drones; rappellers on the lift roof; **SEAWOLF returns**: 2 weapon pods (10 HP each), then the rotor hub (15 HP), and it crashes into the sea | — | the **life ring** on the lift |
| **3-B FINAL: SCYLLA → KRAKE** | 90 + 90 | The tower roof and helipad (behind a concrete parapet), then the control room (behind the consoles) | §5.7 | the **FINAL SHOT** | — |
| **3-Z ending** | — | The gates close, the sunrise floods in, Krake is arrested, then the credits | — | — | the ending and the credits roll |

### 5.7 Bosses (patterns)
**STINGRAY → BARRACUDA** (1-B, 100 s):
1. **The Stingray, 100% → 60%.** The gunboat runs alongside, 25–40 m off and bobbing. Two deck turrets (12 HP each)
   spin up (a 0.8-s whine, which is the telegraph) and fire bursts; deckhand gunners respawn on deck, 2 at a time.
   Fuel drums on deck (3) do heavy damage to the turret next to them. Destroying both turrets moves to phase 2.
2. **Barracuda on the bridge wing, 60% → 25%.** She fires harpoons (projectiles, 2 HP) and **torpedoes**: a visible
   wake, "SHOOT THE TORPEDO!", 2 HP, and cover doesn't help. She ducks behind the armored bridge between volleys and is
   open for about 2 s. Her HP is 30.
3. **Boarding, 25% → 0.** The Stingray burns. She swings across on a rope with her `cutlass`, lands on our boat and
   slashes (a 0.6-s telegraph; cover blocks it). Each time she staggers she is open for 1.5 s, three cycles in all.
   Defeat: "This isn't over, CREST!", she splashes into the sea, and the Stingray explodes in slow motion.

**HAMMERHEAD** (2-B, 120 s; 60 HP, × the boss slider):
- **A. Shield advance.** He walks behind his hatch-door shield (immune from the front); only an exposed shin takes leg
  damage. A shotgun or GL hit knocks the shield aside for 1.5 s and opens his torso.
- **B. Rotary sweep.** He plants the shield, the cannon spins up for 1.2 s (a whine, the barrels glowing red, a big
  ring), then he sweeps left to right for 2.5 s; you are hit if you're exposed at any moment of it. Each sweep damages
  your cover (intact → cracked → broken, with debris). When it breaks, the camera dives to the second cover, the lens
  housing ("Cover's gone—moving!").
- **C. Grenade volley.** He throws 3 grenades in arcs. A grenade shot down near him damages him (4 each).
- **Below 50%.** The shield is broken and falls off the gallery ("MY DOOR! YOU BROKE MY DOOR!"). He **charges** like a
  rusher; 6 damage within 1.5 s staggers him, otherwise he slams your cover. The lighthouse beam sweeps by and dazzles
  for 0.4 s (a white flash, following the comfort settings).
- **Defeat**: he staggers through the railing and falls into the surf below ("HAMMERHEAD… FALLS… DOWN…").

**SCYLLA** (3-B, phase 1, 90 s):
- A six-legged crab walker: a 3-segment IK leg rig of meshes, two claws with cannons, two missile pods, an armored
  cockpit.
- Six **knee joints** (8 HP each, glowing weak points).
- Claw-cannon shots are threats (0.9-s charge glow).
- **Missile volleys** of 6 in arcs: shoot them down, or take cover; missiles that hit your cover shake it.
- Destroying any 3 knees **topples it** (it falls on its side): the cockpit hatch opens for 6 s (20 HP). Then it rights
  itself, limping. A second topple, from the remaining knees, breaks the cockpit open and Krake ejects.

**ADMIRAL KRAKE** (3-B, phase 2, 90 s; 40 HP):
- He rolls and dashes between the control-room consoles.
- He fires **flares** with both pistols: slow, glowing, shootable, bursting into firework sparks.
- He throws smoke, which cuts visibility to 40% for 3 s.
- He summons 2 Red Tide at a time.
- **FINAL SHOT.** At 15% HP he lunges for the master sluice lever. Slow motion (presentation timeScale 0.3) and a
  3-second ring show over the lever arm; hitting the arm or the lever wins. A miss means he pulls it partway: the water
  surges, "TIDE RISING!", and the fight resumes; repeat until it lands.
- **Defeat**: "The sea… always… wins…" Kai: "Not today." Then the ending.

**Mini-bosses**: **BULLDOG** (1-3), **THE GULL** (2-3) and **SEAWOLF** (3-2 and 3-4) are registered as bosses with an
HP bar but no intro card.

### 5.8 Training: the CREST RANGE (Juno instructs)
An indoor range of concrete lanes with dividers, plywood cut-outs of Black Current goons on rails, and score lamps.
1. **AIM & FIRE**: 6 pop-up cut-outs at 8–15 m. "AIM [stick/mouse] · FIRE [R2/Left click]".
2. **COVER & RELOAD**: a turret robot (a box with a red lamp) telegraphs 3 shots; hide for each. Then empty the
   magazine and reload in cover. "HOLD [L2] TO TAKE COVER — YOU RELOAD IN COVER".
3. **WEAPONS**: shoot an orange-vest cut-out for MG ammo, switch with [R1], shred 3 drone targets; a shotgun on a
   shield cut-out; the GL on a crate stack. "[R1]/[L1] — OR FIRE WHILE IN COVER — TO SWITCH".
4. **READ THE CRISIS**: a Red Tide cut-out (a fast telegraph), a grenade lob (shoot it), a civilian cut-out ("DON'T
   SHOOT"), then a timed drill: 8 targets in 20 s, with the TIME HUD.

"TRAINING COMPLETE" records the best time. The first ARCADE start offers Training once (and `seenTraining` remembers).

### 5.9 Script (every story beat; the lines are original)
- **Briefing 1** (HQ):
  - HALE: "Agents. Two hours ago the Black Current seized Port Lumen's harbor and the Tidewall."
  - HALE: "Their leader is Silas Krake. A disgraced admiral with a grudge the size of an ocean."
  - JUNO: "He'll open the floodgates at dawn. King tide. The whole city goes under."
  - HALE: "You have until 06:00. Land at Lantern Pier. Find his signal. End this."
  - KAI: "Understood. CREST is on it."
- **1-0 intro**:
  - MARI: "Hang on! Lumen Coast Guard express—next stop, trouble!"
  - KRAKE (screens): "Citizens of Port Lumen! Enjoy your lanterns. They are the last lights you will see."
  - KRAKE: "At dawn the king tide comes, and I open every gate. The sea takes back what you stole!"
  - ROOK: "Charming guy."
  - KAI: "Let's make some waves."
  - ROOK: "Kid, you say that every mission."
- **1-1**:
  - JUNO: "Hostiles on the pier! Watch the festival crowd!"
  - JUNO, at the quartermaster: "Orange vest! He's hauling ammo—drop him!"
  - KAI, on the clear: "Pier's clear. Moving!"
- **1-2**:
  - ROOK: "Market hall. Stay sharp."
  - JUNO: "Red uniform! That's Red Tide—they don't miss. Hit him first!"
  - JUNO: "Grenade! Shoot it out of the air!"
  - ROOK, when the gallery falls: "Now that's what I call fresh fish."
- **1-3**:
  - JUNO: "Something big is coming through the containers!"
  - KAI: "Armored truck! Take out the gunner!"
  - ROOK: "Fuel tank—light it up!"
  - WORKER: "Don't shoot! I just work here!"
- **1-4**:
  - MARI: "Grab something! We're taking the canals!"
  - JUNO: "Jet skis, three o'clock!"
  - MARI: "Low bridge! Heads down!"
  - ROOK: "Fireworks barge. Happy festival."
- **1-B**:
  - BARRACUDA: "CREST! The Admiral said you'd come. He didn't say you'd be this slow!"
  - BARRACUDA: "Say hello to the Stingray!"
  - BARRACUDA, phase 3: "Enough! I'll do this myself!"
  - MARI: "Torpedo in the water! Shoot it!"
  - BARRACUDA, on defeat: "This isn't over, CREST!"
- **1-Z outro**:
  - JUNO: "Krake's signal is coming from Lighthouse Point."
  - MARI: "Gull's Rest. They've held my father there since yesterday."
  - KAI: "Then that's where we're going."
  - ROOK: "Into a storm. Naturally."
- **Briefing 2**:
  - HALE: "The lighthouse relays Krake's commands to the whole fleet."
  - JUNO: "Take it out and his ships go deaf. Also, it's raining. A lot."
- **2-0 intro**:
  - KRAKE (intercept): "Hammerhead. No one reaches the lamp."
  - HAMMERHEAD: "NOBODY. PASSES. HAMMERHEAD."
  - ROOK: "He talks in capital letters."
- **2-1**:
  - JUNO: "Blades! Don't let them get close!"
  - KAI: "Shotgun. Now we're talking."
  - FISHERMAN: "Not me! Not me!"
- **2-2**:
  - JUNO: "Shield! Knock it aside with the shotgun!"
  - ROOK: "Ropes! They're coming through the roof!"
- **2-3**:
  - MARI: "The funicular's the only way up the cliff."
  - JUNO: "Car coming down—it's full of them!"
  - JUNO: "Laser sight! Sniper on the lighthouse!"
  - THE GULL: "Hold still, little agents."
- **2-4**:
  - CAPTOR: "One more step and the old man swims!"
  - KAI: "Easy… easy…"
  - DR. TEJADA: "Mari! You came!"
  - MARI: "Papa—get down!"
- **2-B**:
  - HAMMERHEAD: "LITTLE AGENTS. BIG MISTAKE."
  - ROOK: "Minigun! Get down!"
  - KAI: "Cover's gone—moving!"
  - HAMMERHEAD: "MY DOOR! YOU BROKE MY DOOR!"
  - HAMMERHEAD, on defeat: "HAMMERHEAD… FALLS… DOWN…"
- **2-Z outro**:
  - DR. TEJADA: "The override is in the Tidewall control tower. At the peak, Krake opens every gate."
  - JUNO: "Forty minutes to dawn. The maintenance tram can get you there."
  - KAI: "Then let's catch a ride."
- **Briefing 3**:
  - HALE: "This is it, agents. Jam the gates, reach the tower, stop Krake."
  - JUNO: "And maybe don't fall in. The water's rising."
- **3-0 intro**:
  - KRAKE (screens): "Look at the sea, CREST. It rises for me."
  - KRAKE: "At dawn, Port Lumen returns to the deep!"
  - KAI: "Not on our watch."
  - ROOK: "Did you rehearse that?"
  - KAI: "…Maybe."
- **3-1**:
  - JUNO: "Drones! Use the machine gun!"
  - JUNO: "Rocket! Shoot it down!"
  - ROOK: "Grenade launcher. My kind of party."
- **3-2**:
  - DR. TEJADA (radio): "Jam the gate locks! Four of them—the glowing clamps!"
  - JUNO: "Gunship inbound! It's the Seawolf!"
  - DR. TEJADA: "Gate jammed! Hurry to the tower!"
- **3-3**:
  - ROOK: "Turbine hall. Mind the fans."
  - JUNO: "Coolant tanks—stay clear. Unless the bad guys are closer."
- **3-4**:
  - KAI: "Going up."
  - JUNO: "Seawolf's back! Hit the weapon pods!"
  - ROOK: "Scratch one gunship."
- **3-B**:
  - KRAKE: "You climbed my tower. Admirable. Now meet my Scylla."
  - JUNO: "It's down! Hit the cockpit!"
  - KRAKE: "You think a machine is my only weapon? I am the storm!"
  - DR. TEJADA: "He's going for the master lever—stop him!"
  - HUD: "FINAL SHOT!"
  - KRAKE: "The sea… always… wins…"
  - KAI: "Not today."
- **Ending**:
  - JUNO: "All forty gates closing! You did it!"
  - MARI: "Silas Krake, you're under arrest by the Lumen Coast Guard."
  - KRAKE: "The tide will turn again."
  - ROOK: "Twice a day. It's called science."
  - HALE: "Outstanding work, agents. Port Lumen owes you its dawn."
  - KAI: "Tell the festival to save us some lanterns."
  - ROOK: "Kid. No puns at the debriefing."
  - KAI: "No promises."
  - THE END.
- **Intel bottles** (6, shown in RECORDS → INTEL), for example:
  - "Note to self: never trust a fish that winks. —J."
  - "Krake's coffee order: black, like the Current. Two sugars."

### 5.10 Art list
- **New materials** (`E.MATERIALS` and `E.PATTERNS`):
  - `corrugated` (container walls; vertical ridges), with four container colors;
  - `concrete`, `asphalt`;
  - `grate` (catwalks; `alphaTest`), `hazard` (diagonal stripes);
  - `tarp`, `awning-stripe` (red and white, blue and white);
  - `paper-lantern` (emissive with a warm ramp), `glass-lit` (emissive windows), `screen` (canvas texture);
  - `wet` (an overlay that brightens lit bands);
  - `sea-night`, `sea-storm`, `sea-dawn` (water);
  - `rope`, `net` (`alphaTest`), `rubber`, `camo`;
  - `signboard` (canvas text: "PORT LUMEN FISH MARKET", "BERTH 9", "GULL'S REST", "TIDEWALL CONTROL", "DANGER — SLUICE").
  - From the engine library, reuse `planks`, `crate`, `brick`, `cobble`, `stone`, `slate`, `shingle`, `timber`,
    `plaster`, `tiles`, `iron`, `steel`, `rusted`, `sand` and `rock`.
- **Prefabs** (helpers on `G`, written as shape entries where they are still objects):
  - Stage 1: `pier`, `quay`, `warehouse` (doors, windows, sign), `stall` (canopy, lanterns, goods), `lanternString`,
    `fishingBoat`, `speedboat` (the player's carrier, with gunwale cover), `container`, `containerStack`,
    `gantryCrane`, `forklift`, `marketHall` (with a gallery that can collapse), `canal` (walls, bridges, a low bridge),
    `fireworksBarge`;
  - Stage 2: `house` (timber or plaster, slate roof, breakable windows), `lane` (cobble, steps), `cart`, `well`,
    `washingLine`, `netLoft` (stairs, roof hatch), `cliff` (rock meshes from `E.shapeMesh('rock', { params })`),
    `funicular` (track and two cars), `lighthouse` (a tessellated tower, the gallery, the rotating lens, the beam),
    `keeperHouse`;
  - Stage 3: `seawall`, `gateHouse`, `sluiceGate` (with lock clamps), `catwalk` (rails), `turbine` (rotating),
    `steamVent`, `controlTower`, `glassLift` (the carrier), `console` (emissive screens), `masterLever`, `helipad`;
  - shared: `sandbags`, `barricade`, `lamppost` (static light), `bollard`, `explosiveBarrel` (red with a hazard label),
    `ammoCrate` (orange), `lifeRing` (a red and white torus as a lathe), `intelBottle`, `sign`, `skyline` (low-poly far
    buildings), `screen` (the giant broadcast screens).
- **Vehicles and mechs** (mesh rigs posed by code): Stingray (hull, bridge, 2 turrets, a deck rail), jet ski, Bulldog
  (with a turret), Seawolf (body, rotors, 2 pods), Scylla (body, 6 legs × 3 segments, 2 claws, 2 pods, cockpit),
  drones (a box, 4 rotor discs, a red eye).
- **Sprites** (`E.sprite` strings): weapon icons (4); bullet pips; life badges; the threat "!"; the reticles (3 styles);
  the hit marker; an ammo crate icon; the life-ring icon; the bottle icon; debris chips; casings.
- **Effects**:
  - muzzle flashes (4 sizes; the player's at the bottom right);
  - impact sparks, splinters, dust, glass shards, water splashes;
  - tracers, laser beams, smoke trails;
  - explosions: a fireball core, smoke columns, debris, a shock ring, a scorch decal;
  - fire on barrels and lanterns; fireworks (peony, willow, ring); rain and splashes; steam; foam; sparks on drones;
  - the lighthouse beam; dust under the Scylla's feet; the Seawolf's rotor wash on the water.

### 5.11 Animation list (all on the engine's procedural rig, plus our post-process joint layers)
- **Enemies**:
  - pop up from a crouch (blending the `crouch` pose out while `point: true`);
  - lean out (a joint layer); side step;
  - roll (`flip`); vault (an arc with `air`); jump down (`air`, then `land`); rappel (`climb` on a rope line);
  - run, and run-and-gun (`point` while running);
  - kneel and fire (`kneel` with `point`);
  - throw (the `throw` move); shoulder a launcher; reload (left hand to the magazine, a custom attack spec);
  - shield walk (a stance with the shield forward); rusher slashes (`slash`, `overhead`, `backslash`, with long winds);
  - surprise (`expr: 'shout'`).
- **Reactions**: flinch (`hurt`); stagger (knockback and a lean); a headshot snap (a joint layer); the 5 death styles
  of §4.6.
- **Allies and NPCs**: run, point, cover crouch, `cheer` on stage clear, `hips` (Rook), `wave` (Mari to her father);
  civilians panic (run with arms up as a joint layer, then crouch with hands over their heads).
- **Bosses**:
  - Barracuda: aims the harpoon gun; ducks behind the bridge; swings on a rope (a pendulum path with `air`); cutlass
    combo (`slash`, `backslash`, `thrust`); falls backwards into the sea;
  - Hammerhead: shield bash; minigun spin-up and sweep (the torso twists); grenade toss; a charge (`sprint` lean); a
    kneeling stagger; a fall through the railing;
  - Krake: twin flare pistols; a dodge roll; a cutlass lunge; a dramatic point (`expr: 'angry'`); the lever lunge; a
    defeat stagger to the window.
- **Machines**: the Scylla's IK gait (tripod, alternating), claw aim, topple and get-up; turret spin-up and tracking;
  Seawolf bank and strafe; jet-ski bounce; boat bobbing; turbines turning; sluice gates moving; the lens turning.
- **Camera**: cover duck and pop; recoil; hit jolt; arrival whip-pans; travel bob; carrier sway; cutscene moves;
  slow-motion final shot; boss reveal.

### 5.12 Music and SFX (written as code)
| Song | Use | Feel |
|---|---|---|
| `theme` | title, attract | 140 bpm in D minor: a rising "wave" arpeggio motif, a brassy pulse lead, saw octave bass, rock drums |
| `briefing` | briefings, the hub card | 90 bpm, a tense pad (triangle and pulse12), a ticking hi-hat |
| `harbor` | Stage 1 | 150 bpm, festival latin-rock: tresillo bass, square lead, clave-like drums; layers `drums` and `lead` |
| `storm` | Stage 2 | 160 bpm, driving minor, galloping bass, noise "thunder" hits |
| `tidewall` | Stage 3 | 155 bpm, heroic, modulating up a step at 3-3 |
| `boss` | 1-B, 2-B, mini-bosses | 170 bpm, aggressive |
| `kingtide` | the final boss | 165 bpm, epic; tempo up for the FINAL SHOT |
| `range` | Training | light funk |
| `results` / `clear` (sting) / `continue` / `gameover` / `ending` (a slow ballad version of `theme`) | | |

**SFX**:
- the 4 weapons; empty click; reload; switching;
- cover in and out (a cloth whoosh, a thud);
- whizz; ricochet; impacts on metal, wood, concrete, water and glass; enemy hit, headshot "ding" and death barks;
- the threat tick and chirp; the TIME tick, TIME EXTEND, TIDE'S IN;
- ammo pickup, 1UP, NEW WEAPON;
- explosions (small and big), barrel and tank fire;
- grenade bounce; rocket whoosh; harpoon twang; torpedo hiss; missile; flare pop;
- turret spin-up; the minigun; the Scylla's stomp and servo; rotor; jet ski; boat engine;
- glass break, lantern burn, wood break;
- UI: move, confirm, back, a rank stamp, count-up ticks.

---

## 6. Build order and milestones
Every milestone ends with: its tests green in `node tests/run.mjs`, the bundle building, and `tools/check.mjs` free of
errors.

| # | Milestone | Done when (acceptance) |
|---|---|---|
| **M0** | **Setup.** The dev folder, the engine copy, the tools, `hub/` files, `package.json`, `build.mjs`, `run.mjs`, a title text in the bundle | The bundle opens from `file://` with no errors; the build test passes (meta order, session client byte-identical, hub tags, no external URLs); the runner prints its count line |
| **M1** | **Renderer spike** (the biggest risk; do it first). math3d, the texture bank, a textured and lit box room with a floor, water and sky, an `E.shapeMesh` crate, **a Humanoid billboard half-hidden behind the crate**, a corridor that tests near clipping, a muzzle-flash light | Unit tests for projection round trips, near clipping (no NaN, 0–2 triangles), the z-test, and billboard compositing on synthetic pixels; 3 screenshots (actor at 6, 12 and 24 m) look right |
| **M2** | **The core loop** in a grey-box version of 1-1. Sim and commands, RailCam slots and cover, aim (mouse, pad, keys), the handgun and reload, `deckhand` with peeks, the ThreatDirector and the crisis flash, lives, TIME, clear → WAIT → travel → the next scene, the HUD basics, basic SFX | Tests: the cover timings and `exposed`; no firing in cover; fire in cover switches weapons; reload; rays hit the head and torso and are blocked by cover; threats hit exposed players and are blocked in cover; pop-out protection; TIME counts only in ACTION; time-up; the scene flow |
| **M3** | **Combat roster.** All 4 weapons, every archetype with its entries, reactions and deaths, projectiles, breakables, barrels, pickups, civilians, allies; **engine patch 1** (the long guns) | One scripted test per archetype and per object; filmstrips of the pop-up, the deaths and the rusher's slash |
| **M3.5** | **Net spike.** Host and replica with a FakeHub in Node on the grey-box scene; a minimal session build | The net suite passes at 2 and 4 players with latency, jitter and loss; the harness passes `players=2` and `scenario=server` |
| **M4** | **Stage 1 complete**: the geometry and look, scenes 1-1…1-4, Bulldog, the Stingray/Barracuda boss, cutscenes and briefings, **the voice synth**, music and SFX, results, continue, game over and initials | The content validators pass; the `fair` bot clears Stage 1 on Normal; cutscenes run headless to the end, and skipping works; screenshots of every scene |
| **M5** | **Stage 2 complete**: rain and lightning, the funicular, The Gull, shields, rushers, the hostage, Hammerhead with degrading cover | As M4, for Stage 2 |
| **M6** | **Stage 3 complete**: drones, rockets, the GL, the sluice locks, Seawolf, the turbines, the lift, Scylla, Krake, the FINAL SHOT, the ending and the credits | As M4; the `--playthrough` cheat run reaches the ending and writes records |
| **M7** | **Front end and attract**: the title flyover, menus, difficulty, select, briefing, Training, records, about, how-to, settings items, device-aware prompts, glyph patch 2, wheel patch 3, the touch-only notice, the attract cycle | UI flow tests; attract tests (10 s idle → demo, input → title, the playlist cycles, the watchdog); prompt tests per device and glyph family |
| **M8** | **Dev mode**: the panel, every slider, toggle and action, the overlays, the free camera, reset | Each slider changes `tune`; reset restores `TUNE` exactly; each action works (tested) |
| **M9** | **Local co-op**: join, split screen, per-player HUD, continues | Co-op tests: two cameras, independent cover and hits, pickups to the killer, continues per player |
| **M10** | **Full AI Hub integration**: our own card, stats and awards, every scenario | All 4 harness scenarios pass (`__hubCheck.pass`); the game still runs outside a session |
| **M11** | **Polish and balance**: juice, the audio mix, the `fair` bot's balance (`tests/balance.json`), screenshot reviews at 16:9, 4:3 and 21:9, `About` data, `exit-interview.json`, the final bundle | The §9 checklist is all ticked; `--all` is green |

**Cut order, if time runs short.** Cut whole scenes, never mechanics. The validators must pass after each cut.
1. 3-4 Tower Lift: the Seawolf's finale moves into the end of 3-2.
2. 2-2 Net Lofts: the shield and the rappellers move into 2-1 and 2-4.
3. 1-3 Container Yard: the Bulldog moves into 1-2's street exit.
4. The intel bottles.
5. The allies' appearances in single player.

---

## 7. Risks and how to de-risk them
| Risk | Why it's risky | De-risk |
|---|---|---|
| **The software renderer** (correctness, look, speed) | It is the largest piece of new code, and everything depends on it | M1 comes first, with unit tests for projection, clipping, depth and compositing, and screenshots. Use typed arrays and no allocations in inner loops; cull by chunk and per object; tessellate big faces; give the dev perf overlay ms per pass. Fallbacks: affine spans of 16 px; a lower internal resolution for the 3D pass only |
| **Rig billboards in perspective** (scale, angle, ground contact, night light) | The engine draws rigs orthographically, from views that can't look up | Bearing-based yaw per actor; pitch clamped to 3° or more; a chest-depth bias; blob shadows; light per actor with a floor of 0.45. Filmstrips at 3 distances and bearings in M1 and M3 |
| **Hit fidelity** (what you see vs what you hit) | Players feel every miss | Hit volumes from the rig's joints every step; the dev "show hit volumes" overlay; tests that aim at `rig.J.head` and expect HEADSHOT |
| **Pad aiming feel** | A light gun on a stick feels slow | The response curve, acceleration and aim assist (friction and magnetism), all as sliders; the `fair` bot's time-to-target as a metric; early hands-on tests in M2 |
| **Threat fairness** | Unreadable damage kills the genre | Telegraphs read by shape, sound and arrow; `maxThreats`, `minGap`, pop-out protection; tests that inject overlapping threats |
| **Content volume** (3 stages) | Big, and easy to leave half-done | Prefabs, data scenes, validators, the free camera with Copy pose; finish Stage 1 completely before starting Stage 2; the cut order in §6 |
| **Netcode and hub compliance** | Latency and loss, the server and host-leave scenarios | The M3.5 spike; FakeHub tests in Node (rates, sizes, standings, leave, time-up); the real harness in Chromium; the host authoritative and the replica cosmetic |
| **Engine patches regressing the engine** | Shared code | Small, documented patches (`PATCHES.md`), each with a test; `node kits/test.mjs brawler` and `shooter` from the handoff copy still pass |
| **The single-file bundle** | Script order, the session client first, size | The build test parses the output; `check.mjs` opens it from `file://` |
| **The attract bot getting stuck** | An endless loop on a kiosk | Cheats on, the watchdog, a highlight timeout, tests over the whole playlist |
| **Voice synth timing and CPU** | Many nodes | Schedule ahead in the audio clock; at most 2 dialog voices and 4 barks; a headless no-op path; the dev Voice test |
| **Determinism drift** | Breaks the tests, the replays and the net rewind | Seeded streams per system; a test greps the sim files for `Math.random`; a test that the same seed and commands give the same `sim.hash()` |
| **`/tmp` full** | Browsers fail with misleading errors | `TMPDIR=<dev>/.tmp` for every browser tool (§0.3) |

---

## 8. Testing

### 8.1 The one command
`node tests/run.mjs [suite …] [--playthrough] [--browser] [--hub] [--all]`
- It loads `engine/my-3d2dge.js` and `build/game.js` into a fresh `vm` context for each suite (the pattern of the
  handoff's `game/test.mjs`), headless, where `draw` is skipped. It rebuilds `build/game.js` first if any `src/` file
  is newer.
- Each suite is `export default async t => { … }`, using:
  - `t.check(name, ok, detail)`;
  - `t.load({ seed, mode })` → `{ E, game, debug }`;
  - `t.step(seconds)`, which wraps `game.advance`;
  - helpers `aimAt(world point, player)`, `fire`, `cover`.
- **The output is only `FAIL suite › check: detail` lines, then one line, `N passed, M failed (T s)`.** The exit code
  is 1 on any failure.
- `game.debug`:
  - `snapshot()`: scene, phase, stage, scene id, timer, players, enemies, threats, boss, errors;
  - `jump`, `cheat`, `bot(on, style)`, `aimAt`, `fire`, `cover`;
  - `sim` and `tune`.
- Every suite ends by checking that `game.errors` is empty.

### 8.2 Suites (what each part is tested by)
| Suite | Checks |
|---|---|
| `build` | `<meta charset>` comes first, then the session client (sha256 equal to `hub/session.js`), then the hub tags (goal ≤ 60 characters, howto ≤ 80); the engine before the game; no `http(s)://` fetches; `exit-interview.json` parses and has every key |
| `math3d` | project and unproject round trips; aim → ray → aim; ray vs box, sphere and capsule; the yaw and pitch conventions (yaw 0 looks east, right is +y) |
| `raster` | near-plane clipping cases; the depth test (a near quad hides a far one in a 16×16 buffer); band dithering stays in range; billboard compositing with depth; fog quantization |
| `materials` | every material builds 5 distinct bands; the lid variants; the canvas textures headless-safe |
| `geometry` | `E.shapeMesh` import; prefabs give colliders; `TC.H.rig` is 24–30 u |
| `content` | every validator in §4.10, over every stage |
| `input` | `label()` per device and glyph family (PlayStation by default, Xbox via the setting); wheel codes; pointer → aim exact; pad curve, acceleration and assist (friction near a target, none on civilians) |
| `cover` | blend timings; `exposed`; hold vs toggle; reload in cover; fire in cover switches weapons |
| `weapons` | fire rates; magazine and pools; pellets; GL splash and falloff; the bloom; switch times; ammo carried over; auto-switch when empty |
| `player` | lives; i-frames; continue (score reset, the mark); extra lives at the thresholds; the life ring |
| `timer` | counts only in ACTION and boss; TIME EXTEND; TIDE'S IN; the refill; the clear bonus |
| `scoring` | points by event; the chain growing, capping and resetting; the ranks |
| `enemies` | one scripted scenario per archetype: its entry, peek and fire plan, death by every style, the quartermaster's drop and flight, shield immunity and knock-aside, the rusher's slash vs cover, the sniper's laser, drones, jet skis, the captor and hostage |
| `threats` | `maxThreats`, `minGap`, pop-out protection, always-threat kinds, the ring timing, misses never damaging |
| `projectiles` | each kind shootable; grenade, rocket and missile blocked by cover; the torpedo not blocked; explosions damaging enemies only |
| `objects` | barrel chains; breakables removing colliders; the civilian penalty; allies passing shots through; bottles going to INTEL |
| `bosses` | each boss: phases advance on scripted damage (`debug.fire` at its parts), cover degradation and the swap, the topple and cockpit, the FINAL SHOT hit and miss paths, defeat → outro |
| `story` | every cutscene runs headless to its end; skipping lands on the same end state; every speaker and voice exists; voice durations are positive |
| `audio` | every song parses (each track has a whole number of steps); every SFX name exists; layers by phase |
| `ui` | title → menu → ARCADE → difficulty → briefing → play → pause → Dev mode → reset → quit to title; results → initials → records; About pages are complete with no empty fields; the touch-only notice (stubbed `matchMedia`) |
| `dev` | each slider changes its `tune` path; reset restores `TUNE` deep-equal; each action works |
| `attract` | 10 s idle → demo; any input → title (consumed); the playlist cycles; the watchdog advances |
| `coop` | P2 joins; 2 viewports; independent cameras and cover; separate hits and continues; pickups to the killer |
| `net` | FakeHub (injectable `hub` object): 1, 2 and 4 players; latency 150, jitter 50, loss 5%; server mode; host leave; time-up → `finish` with valid standings and scores; ≤ 20 messages a second per copy; every `s` ≤ 1,200 bytes; kills credited to the right player; replicas converge |
| `determinism` | the same seed and commands give the same `sim.hash()` after 60 s; no `Math.random` in sim files; no hardcoded key names in prompts |
| `--playthrough` | the `fair` bot clears Stages 1, 2 and 3 on Normal without a continue (and records the time per scene to `tests/balance.json`, which the content suite reads); the `showoff` cheat bot plays the whole ARCADE to the credits and the initials; the Training range completes |
| `--browser` | `tools/check.mjs` on the bundle at 1920×1080, 1280×720, 2560×1080 and 1024×768: no errors, the canvas filled, screenshots of the title, 1-1, a boss and split screen |
| `--hub` | `tools/hubcheck.mjs` copies the bundle and the harness files into `hubtest/`, serves it on `127.0.0.1:0`, confirms the page is ours, then runs `harness.html?game=…&players=2&auto=1`, `…&players=4&latency=150&jitter=50&loss=5&auto=1`, the same with `&scenario=host-leave`, and `…&players=2&scenario=server&auto=1`. It waits for `document.body.dataset.complete === 'true'`, reads `window.__hubCheck.pass`, and prints only the failed checks. It kills its server by PID |

### 8.3 What only eyes can check (screenshots and filmstrips)
- The M1 renderer spike.
- One screenshot per scene; every boss in each phase.
- The HUD at 16:9, 4:3 and 21:9; split screen; the title and menus; the attract overlay; the touch-only notice.
- Filmstrips (`tools/filmstrip.mjs --seed 1`): the cover duck, an enemy pop-up, each death style, the rusher's slash,
  Hammerhead's sweep, the Scylla's gait and topple, every engine weapon pose.

Rerun only after changing what they show.

---

## 9. Done checklist (TASK.md → where it's covered)
- [ ] **Title** picked by RNG from 50 riffs: Tide Crisis 3 (the top of this plan).
- [ ] **Genre and perspective** chosen: an on-rails light-gun shooter with cover, in first person (§1).
- [ ] **The single HTML** and the dev folder with the exact names; plays from `file://` (§0.1, §3.2).
- [ ] **Built on the handoff engine**; the changes logged in `engine/PATCHES.md` (§3.6).
- [ ] **Art** in the engine's native style with new assets (§4.1, §5.10); **animation** on the engine's rigs with new
      moves (§5.11).
- [ ] **Audio** all in code: music, SFX and gibberish voices (§4.12, §5.12).
- [ ] **Online**: AI Hub shared-world co-op, all 4 harness scenarios pass (§4.19); **multiplayer on its own**: local
      split-screen co-op (§4.18).
- [ ] **Every mechanic** shown in the demo:
  - cover and reload; 4 weapons and switching; quartermaster ammo; the crisis flash;
  - Red Tide; grenades, rockets, torpedoes, missiles and flares shot down;
  - shields, rushers, snipers, drones, jet skis, vehicles, hostages, civilians;
  - breakables and barrels; life rings and intel; TIME, TIME EXTEND and TIDE'S IN;
  - chain, ranks, continues, initials;
  - moving scenes; 3 bosses, 3 mini-bosses and the FINAL SHOT;
  - Training (§5).
- [ ] **Dev mode** from the pause menu: live sliders, toggles, actions, reset to defaults (§4.16).
- [ ] **Attract mode** after 10 s idle on the title or menu, a looping AI demo, any input exits (§4.17).
- [ ] **10-foot, controller-first UI**:
  - DualSense mapping; native keyboard and mouse (the mouse aims and its hover moves the focus);
  - prompts follow the last device; PlayStation glyphs by default with an Xbox option;
  - no dense screens (§4.3, §4.13–4.15).
- [ ] **Touch-only**: "Controller or keyboard required" with the settings button, and the attract mode runs (§4.14).
- [ ] **Narrative tone** in the source's B-movie style, with every beat scripted (§5.2, §5.9).
- [ ] **Tests**: one command printing only failures and a count; a scripted playthrough of the whole game; headless
      `game.advance`/`game.debug` (§8).
- [ ] **No TODOs, placeholders or stubs.** A last check:
      `grep -rniE "todo|fixme|placeholder|lorem|stub" src/` returns nothing.
- [ ] **About/Credits screen** with Source Information, Testing Feedback (4), Engine Feedback (6) and Prompt Feedback
      (4) (§4.14).
- [ ] **`exit-interview.json`** in the exact shape, every value filled ("unknown" where unconfirmed), parsed by a test.
      Suggested `aiHub` block:
      `{ "name": "Tide Crisis 3", "tagline": "Duck. Pop. Shoot. Beat the tide.", "description": "An original arcade light-gun rail shooter in PS1-style pixel 3D: duck behind cover, switch between four weapons and race each area's clock to retake an island's tidal barrier before the dawn king tide. Play solo, couch co-op or AI Hub co-op for up to four.", "type": "Game", "genre": "Shooter", "source": "Time Crisis 3", "series": "Time Crisis", "players": "1–4", "controls": "Mouse or stick aims · left click/R2 fires · hold right click/L2 for cover and reload · wheel/R1 switches weapons", "tags": ["first-person", "arcade", "co-op", "boss fights", "pixel art", "retro"] }`
- [ ] **The final chat reply** repeats Source Information, Testing Feedback, Engine Feedback and Prompt Feedback.
