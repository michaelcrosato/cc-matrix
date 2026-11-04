# MASH TV

*A playful riff on Smash TV. I brainstormed fifty riffs on the source's name and numbered them, then drew one with Python's
`secrets.randbelow(50) + 1`. It came up 9: **MASH TV**. Don't re-pick the title.*

**Pitch.** MASH TV is a 1–4 player twin-stick arena shooter set inside the deadliest game show on television. Contestants
fight through single-screen studio rooms while goons, robots and worse pour in through four doors. They grab cash and
ridiculous prizes, play to the cameras to keep the **ratings** up, and pick a route through the studio map. The goal is to
survive three episodes, each capped by a giant boss, and reach the Season Finale. Collect enough Golden Keys and the
secret **Green Room** opens at the end. Your host is the immortal, oily, sequinned **Lance Lustre**: *"KA-CHING! KA-BOOM!"*

**Names and files** (use the model id and timestamp from *your* TASK.md):

| What | Value |
|---|---|
| Title on screen | `MASH TV` (sub-line: `LIVE FROM STUDIO 9`) |
| GameTitle in file names | `MashTV` |
| SOURCE in file names | `SmashTV` |
| Dev folder (all dev files) | `MashTV-SmashTV-<model>-<timestamp>/` |
| Deliverable (root, beside TASK.md) | `MashTV-SmashTV-<model>-<timestamp>.html` |
| Exit interview (root, beside the HTML) | `exit-interview.json` |
| "Plan" field in Source Information | `PLAN.md` |

---

## 0. Quick facts

| | |
|---|---|
| Genre | Twin-stick arena shooter (arcade). Co-op for 1–4 players, with a route choice between rooms. |
| Perspective | One fixed single-screen arena per room, seen from a high three-quarter "studio camera": the engine view `threequarter` (pitch 55). `topdown` (pitch 80) is a Settings option. |
| Engine | my-3D2dge handoff package **v0.85.2** (`github.com/michaelcrosato/my-3d2dge`, `dist/handoff/`; commit `4390a98` when planned). Use the full edition, `my-3d2dge.js`, which includes every module (we use `arcade`). |
| Online | AI Hub Session Protocol v1, client `aihub-session 1.4.0`, **mode `shared-world`**, 1–4 players. |
| Local multiplayer | 1–4 players on one screen: P1 on keyboard+mouse or a pad, P2–P4 on pads (drop-in with Options/Start). |
| Length | A full run takes about 20–25 minutes: three episodes of 2–4 rooms plus a boss, then the bonus Green Room. A hub session round takes about 5–6 minutes. |
| Output | One self-contained HTML file with the engine, the hub client and the game inlined. No image or audio files; everything is drawn and synthesized in code. |

---

## 1. Ground rules for the builder

1. **TASK.md is the contract; this plan is how to meet it.** Where they disagree, TASK.md wins.
2. **Work only inside your dev folder.** Other agents share the parent directories, ports and processes. Read nothing
   outside your folder except what you fetch:
   - Engine: shallow-clone it **inside your dev folder** (e.g. `.cache/my-3d2dge`; when this plan was written, `/tmp` on this
     machine was a full tmpfs) with `git clone --depth 1 https://github.com/michaelcrosato/my-3d2dge .cache/my-3d2dge`.
     Copy `dist/handoff/*` into the dev folder: the engine, the docs, the tools, the kits and `src/assets`.
   - Hub: **don't clone ai-hub** (it's over 1 GB). Fetch the four files you need:
     `curl -fsSO https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/{session.js,harness.html,bridge.js,round.js}`
     into `vendor/hub/`. `lib/hub/README.md` is the protocol; read it once, whole.
3. **Servers and processes.** Prefer `file://` and headless Node. The hub harness needs a server: bind `127.0.0.1` on port 0
   (`python3 -m http.server 0 --bind 127.0.0.1` prints the port, or a Node `http` server on port 0). Before trusting a
   result, check that the page is your game (`window.MT` exists and the title is `MASH TV`). Stop only processes you
   started, by PID. Never use `pkill`, `killall` or `fuser -k`.
4. **Read the engine docs before writing code.** Read `API.md` whole. Read `docs/ASSETS.md` whole before drawing props.
   Grep `API-INDEX.md` for names; read the `AI_GUIDE.md` sections on Standard features, Frame order, Players, Testing
   and the Twin-stick recipe. Every API name in this plan was checked against v0.85.2. If your copy is newer, grep the index.
5. **Engine patches are allowed but kept small**, each listed with its reason in `engine/PATCHES.md`. That list feeds the
   Engine Feedback. The patches this plan needs are in §15.5.
6. **No TODOs, placeholders, stubs or "coming soon" anywhere.** Every menu item works; every feature in this plan ships.
7. **One test command** (`npm test` → `node tools/test.mjs`) prints only failures and a one-line count. Rerun only the
   suites whose code you changed (`--only <suite>`), and run everything before you hand off. Use screenshots only for
   what a script can't check (§17.3). As TASK.md says, don't use subagents or workflows to debate, review, judge or
   audit.

---

## 2. What makes Smash TV distinctive, and how MASH TV makes it play

| Source trait | MASH TV mechanic or feature |
|---|---|
| A lethal TV game show played as entertainment, with a smarmy host | **Lance Lustre** reacts to everything on a **jumbotron** above the arena, with a lower-third subtitle and gibberish voice. The **Ratings** system turns "be entertaining" into a mechanic: it drives a cash multiplier, Prime Time, and producer "stunts" when you dawdle. |
| Hordes flooding in through four doors | Door-spawn wave director: each door opens, enemies pour through and the door slams shut. Up to ~60 enemies on screen. |
| Two-stick 8-way shooting while moving | Analog twin-stick (pad), mouse aim (PC), and 8-way arrow-key fire (keyboard only). |
| Power-ups, cash and absurd consumer prizes | Timed weapons, cash × the ratings multiplier, and named joke prizes ("A SELF-AWARE TOASTER"). Co-host **Penny Prize** tallies them in a Prize Recap after each episode. |
| A room-to-room map with path choice | Episode maps (3×3 grid). After a clear, the exits light up with the destination's name; walk through one to choose. Longer paths hold keys and cash; shorter paths carry less risk. |
| Giant, multi-part bosses | **Mashy** the mascot (shoot off its parts), the **Wheel of Misfortune** (each spin picks the attack), **Lance in the Starmaker 9000**, then **The Network** itself. |
| A secret bonus for collectors | **Golden Keys** (9 in the game). With 5 or more after the finale, you reach the **Green Room** and the true ending. |
| Simultaneous co-op | 1–4 players in one arena, locally or online (AI Hub shared world). Ratings and keys are shared; cash is individual. |

**Tone:** loud, garish and cartoon-violent. Enemies burst into **confetti, sparks and smoke** (no blood: "BY ORDER OF THE
FCC, ALL GORE HAS BEEN REPLACED WITH CONFETTI!"). It's consumerist satire with a retro-future TV aesthetic: neon, chrome,
marquee bulbs, sponsor logos. **Writing style:** short, shouted, ALL-CAPS announcer lines with punchlines and fake sponsor
plugs, like the source's barker energy. Every line is original (§8).

---

## 3. The game at a glance

**Core loop (one sentence):** enter a sealed studio room, survive the waves pouring from its doors while grabbing cash,
prizes and power-ups, then pick the next door on the studio map, until you reach and beat the episode's boss.

**Flow:**

```
Boot ─► Title ─(10 s idle)─► Attract demo ─(any input)─► Title
Title menu: START THE SHOW · EPISODES · HOW TO PLAY · TOP EARNERS · OPTIONS · ABOUT & CREDITS
START THE SHOW ─► Difficulty ─► Contestant Lobby (join 1–4) ─► Cold Open ─► Episode 1 card
  ─► Room ─► (clear) ─► choose exit ─► "NEXT ON MASH TV" map card ─► Room … ─► Boss ─► Prize Recap
  ─► Episode 2 card … Boss ─► Prize Recap ─► Episode 3 card … Finale (Lance ─► The Network) ─► Prize Recap
  ─► keys ≥ 5 ? Green Room ─► Ending B (true ending) : Ending A
  ─► Initials (each qualifying player) ─► Top Earners ─► Title
All lives lost (every player out) ─► CONTINUE? 10…0 (✕/Enter: continue, −50 % winnings) ─► else Game Over ─► Initials ─► Top Earners ─► Title
AI Hub session: Our own card (contestant line-up) ─► 3-2-1 ─► Lightning Round (3 rooms + Mashy) ─► finish ─► end card
```

---

## 4. Controls and input

### 4.1 Bindings

| Action | DualSense (default glyphs) | Xbox glyphs (Settings) | Keyboard + mouse |
|---|---|---|---|
| Move | L-stick, D-pad | L-stick, D-pad | W A S D |
| Aim + fire | R-stick (fires while pushed past 0.35) | R-stick | Mouse aims (reticle); **hold Left click** fires |
| Fire (in the last aim direction) | R2 (hold) | RT | — |
| 8-way fire (keyboard only) | — | — | Arrow keys (hold; two arrows = diagonal) |
| Slide (dodge with i-frames) | L2, or ✕ | LT, or A | Space or Shift |
| Showstopper (screen bomb) | R1, or ○ | RB, or B | E or Right click |
| Showboat (taunt for ratings) | L1, or △ | LB, or Y | Q |
| Pause / menu | Options | Menu | Esc or P |
| Menus: move / confirm / back | D-pad, L-stick / ✕ / ○ | D-pad / A / B | Arrows, WASD / Enter, Space / Esc, Backspace; mouse hover focuses, click picks, wheel scrolls |

The face buttons are alternates for players who don't use the right stick. While twin-sticking, the thumbs are on the
sticks, so every combat action is on a shoulder or trigger. All actions can be rebound on the engine's standard Controls
screen.

### 4.2 Engine input presets

Define two presets and switch between them. Arrows must **aim** in play but **navigate** in menus. The engine keeps
arrows on the moves only if a preset lists them, so the play preset leaves them out.

```js
// A preset lists every action it uses, the menu's own (start, pause, confirm, cancel) included.
// Mouse clicks in menus go through input.clicked() on the hovered item, not through 'confirm'.
const MASH_MENU = { up: ['KeyW','ArrowUp','Pad12'], down: ['KeyS','ArrowDown','Pad13'], left: ['KeyA','ArrowLeft','Pad14'],
  right: ['KeyD','ArrowRight','Pad15'], start: ['Enter','NumpadEnter','Pad9'], pause: ['Escape','KeyP','Pad9'],
  confirm: ['Enter','NumpadEnter','Space','Pad0'], cancel: ['Escape','Backspace','Pad1'],
  tabL: ['KeyQ','Pad4'], tabR: ['KeyE','Pad5'], reset: ['KeyR','Pad3'] };          // tabs/reset: dev mode & pages
const MASH_PLAY = { up: ['KeyW','Pad12'], down: ['KeyS','Pad13'], left: ['KeyA','Pad14'], right: ['KeyD','Pad15'],
  aimUp: ['ArrowUp'], aimDown: ['ArrowDown'], aimLeft: ['ArrowLeft'], aimRight: ['ArrowRight'],
  fire: ['Mouse0','Pad7'], slide: ['Space','ShiftLeft','ShiftRight','Pad6','Pad0'],
  bomb: ['KeyE','Mouse2','Pad5','Pad1'], showboat: ['KeyQ','Pad4','Pad3'],
  start: ['Enter','NumpadEnter','Pad9'], pause: ['Escape','KeyP','Pad9'],
  confirm: ['Enter','NumpadEnter','Pad0'], cancel: ['Escape','Backspace','Pad1'] };
```

- Set `input: MASH_MENU` on front-end scenes and `input: MASH_PLAY` on play scenes (the scene's `input` field).
- **Preset sync hook (engine patch P1, §15.5).** While the pause menu (the Shell) or one of our overlays is open in play,
  every player's input must use `MASH_MENU`, so arrows move the focus. Expose the engine's internal `HOOKS` as `E.HOOKS`
  and push an input hook. The hook runs after `input.tick` and before the Shell reads navigation. It calls
  `p.use(want)` on each of `game.players` when the wanted preset changes: `MENU` if `game.paused || MT.overlay.open`,
  else the scene's preset. Changing presets calls `clear()`, which is fine at those moments.
- Joined players (`game.addPlayer`) copy P1's preset when they join. The hook keeps them in sync afterwards.
- Name the actions on the Controls screen with `menu.controls`: `{ fire: 'Fire', slide: 'Slide', bomb: 'Showstopper',
  showboat: 'Showboat', aimUp: 'Fire up (keyboard)', … , tabL: false, tabR: false, reset: false }`.

### 4.3 How a contestant reads its intent each step

`intentFrom(input, contestant)` returns `{ move:[x,y], aim: angle|null, fire: bool, slide: bool(pressed), bomb:
bool(pressed), showboat: bool(pressed) }`:

1. **Move:** `input.move()` is in screen directions. Convert it with `game.view.screenDirToGround(mx, my)`.
2. **Aim**, in priority order:
   - The right stick, `input.padAim` (non-null past the dead zone; length > 0.35). Aim = the stick's screen direction
     converted to ground. Fire is true if Auto-fire is on (the default).
   - Arrow keys held: an 8-way direction from `aimUp/Down/Left/Right`. Fire is true.
   - The mouse, when `input.lastDevice === 'mouse'` or the mouse moved within the last 2 s. Aim = the angle from the
     contestant to `game.mouseGround()`. Fire = `down('fire')` (Left click).
   - Otherwise keep the last aim. `down('fire')` (R2) fires along it; if there's no aim yet, use the facing.
3. **Aim assist** (Settings, on by default for pads only): if an enemy is within 170 units and within ±10° of the aim,
   rotate the aim halfway toward it.
4. **Facing** follows the aim while firing; otherwise it follows movement.

Bots (attract mode, tests, the dev "bot partner") and remote players (§14) produce the same intent object. A contestant
never reads an `E.Input` directly.

### 4.4 Prompts and glyphs

- Prompts follow `input.lastDevice`. On `gamepad`, show the button glyph in the family from the setting `glyphs`. On
  `keyboard`/`mouse`, show the keycap or mouse icon for that device's binding. Find the code with
  `input.map[action]` (first `Pad…` for pads; first key or `Mouse…` for keyboard and mouse); `input.codeLabel(code)`
  gives the text.
- **The 5×7 font has no ✕ ○ □ △.** Build `src/02-glyphs.js`: small pixel icons, 11×11 at scale 1, drawn with `E.px`.
  - PlayStation: ✕ blue `#7aa8ff`, ○ red `#ff6a6a`, □ pink `#ff8ad8` and △ green `#5fe0a0`, each on a dark disc. L1, R1,
    L2 and R2 are rounded tabs. Options and Create are pills; the sticks are L/R ringed discs; plus a D-pad cross.
  - Xbox: A green, B red, X blue and Y yellow letter discs; LB, RB, LT, RT, Menu and View.
  - Keyboard: a keycap with the label (1–6 chars; wide caps for Space, Shift, Enter and Esc).
  - Mouse: a mouse body with the left or right half lit.

  API: `MT.glyph.draw(g, x, y, action, input, { scale })` returns the width it drew;
  `MT.glyph.prompt(g, x, y, [[action, 'TEXT'], …], input)` draws a row of icons with labels.
- **Engine patch P2:** the standard `glyphs` setting defaults to `'playstation'`, its options are
  `[['playstation','PlayStation'],['xbox','Xbox']]`, and its `apply` sets `glyphs` on **every** `game.players` input. A
  player who joins later inherits it.

---

## 5. Systems and mechanics

All numbers below are defaults. Every one marked **(T)** is a live tuning value with a dev slider (§13). Logic always reads
`MT.T.<key>` and never a literal.

### 5.1 Contestants (the players)

- **Body:** `new E.Body({ x, y, r: 6 })`. Speed `playerSpeed` **(T)** 95 u/s (×1.45 with Speed Sneakers), analog,
  colliding with the arena's walls, closed doors and solid props.
- **Rig:** `new E.Humanoid({ size: 1.1, build: 'heroic', weapon: 'gun', … })`, dressed per look (§9.3). Each step:
  `rig.update(dt, { x, y, z, vx, vy, facing, point: aiming, hurt: hurtT > 0, flip: slideU, pose, expr })`. **Game
  logic never reads rig joints:** the muzzle is `x + cos(aim) * 10, y + sin(aim) * 10, z 14`.
- **HP and lives by difficulty:**
  - ROOKIE: HP 5, lives 5, enemy speed ×0.85, enemy bullets ×0.8.
  - CONTESTANT (default): HP 3, lives 3.
  - CHAMPION: HP 1, lives 3, enemy speed ×1.15. This is the classic one-hit rule.

  Extra life at $250,000, $750,000, $1,500,000 and $3,000,000 per contestant, with an "ENCORE!" banner and the `oneup` sfx.
- **Getting hit** (no i-frames active): −1 HP (−2 from a brute charge or a boss slam).
  - 1.2 s invulnerability (`invulnTime` **(T)**), blinking at 12 Hz.
  - Knockback 120, `game.hitFx` (small), `input.rumble(.5, .15)`, ratings −12, a "wrong answer" buzzer and the crowd's "OOOH".
- **Death (HP 0):**
  - A "MASHED!" pop-up, a confetti burst in the player's colour, `pose: 'die'` then `down: 1`, and a Lance quip.
  - −1 life. The weapon and add-ons reset.
  - 2.0 s later the contestant **drops in on a cable** from the ceiling, under a spotlight near the entry door: z 70 → 0
    over 0.5 s. It has 2.5 s invulnerability and at least 1 Showstopper.
- **Out of lives (co-op):** state `out`, HUD "OUT — PRESS START TO CONTINUE".
  - Pressing Start (Options/Enter) brings the contestant back with full lives and **half their winnings** (the producer's
    cut). The run keeps going for the others.
  - When **every** contestant is out at once, the global CONTINUE countdown runs (§5.10).
- **Slide** (`slide`, pressed): 0.28 s at `slideSpeed` **(T)** 235 u/s in the move direction (or the facing if standing).
  - I-frames for the first 0.22 s. It can fire while sliding.
  - Cooldown `slideCooldown` **(T)** 0.85 s. Dust puff and a whoosh.
  - The rig rolls: pass `flip: u` (0→1 over the slide).
- **Showstopper** (`bomb`, pressed, stock > 0; max 3; 2 at the start of a run):
  - A 0.12 s white `game.flash` (it follows the comfort settings), a camera-flashbulb burst sound and a boom.
  - Ring particles and `particles.glints` everywhere.
  - Every enemy on screen takes 25 damage; boss parts take 30. All foe bullets are cleared, and enemies are stunned for 1.0 s.
  - Ratings +8. A 0.08 s `game.freeze` (not in sessions).
- **Showboat** (`showboat`, pressed, 3 s cooldown): a 0.6 s pose. Cycle `pose: 'cheer' | 'hips' | 'wave'` with
  `expr: 'smile'`; no moving or firing.
  - When it completes, let n = enemies within 64 units and m = enemies within 32. Ratings gain
    `4 + 3n + 3m` (cap 30), and a pop-up "STYLE +N".
  - Crowd cheer, louder with the gain. A hit during the pose cancels the gain.
  - This is how the show's theme becomes a risk/reward mechanic.
- **Walk-in:** at room `ENTER`, contestants walk from the entry door to a 2×2 formation 40 units inside. They are
  invulnerable and ignore input for 1.2 s.
- **Local drop-in:** `game.allowJoin({ max: 4, keys: false, onJoin })` stays open on every play scene. A joining pad gets
  the next free slot, colour and look, $0, default lives, and drops in on a cable.

### 5.2 Weapons and power-ups

| id | On-screen name | Kind | Behaviour | Duration (T: `puDuration` ×) |
|---|---|---|---|---|
| `blaster` | STUDIO BLASTER | primary (default) | 9 shots/s (`fireRate` T), bolt dmg 1 (`dmgMul` T), speed 330 (`bulletSpeed` T), r 2.5, life 0.9 s | ∞ |
| `spread` | TRIPLE PLAY | primary | 8/s, 3 bolts at −13°/0°/+13°, dmg 1 each | 14 s |
| `rockets` | PRIME-TIME ROCKETS | primary | 3.5/s, a rocket accelerating 180→300, direct dmg 4 + splash 3 (r 24), smoke trail, explodes on a hit, a wall or end of life (0.9 s) | 12 s |
| `popcorn` | POPCORN POPPER | primary | 2.5/s, a lobbed bag (`E.arc`) landing 90 ahead (or at the reticle if closer), splash 2 (r 18) + 6 kernels outward (dmg 1.5, speed 200, life 0.35, pierce 1). Clears crowds behind cover. | 12 s |
| `laser` | LIMELIGHT LASER | primary | a continuous beam from the muzzle to the first wall, piercing every enemy on the line, 16 DPS (`16*dt` per step), turn rate limited to 7 rad/s, a hum loop | 10 s |
| `records` | GOLD RECORDS | add-on | 2 gold discs orbit at r 26, 4.2 rad/s; each touch does 2 dmg (0.15 s cooldown per enemy) and destroys small foe bullets (orb, shard, coin, card, static) | 15 s |
| `shield` | SPONSOR SHIELD | add-on | invulnerable bubble with a flickering "KRUNCH-O" logo; touching enemies take 1 dmg per 0.2 s | 8 s |
| `speed` | SPEED SNEAKERS | add-on | move ×1.45, slide cooldown ×0.6, afterimages (`r.actor(..., { ghost })`) | 10 s |
| `bomb` | SHOWSTOPPER | instant | +1 stock (at max 3: +$2,000 instead) | — |
| `life` | ENCORE | instant | +1 life | — |

- One **primary** slot. A new primary replaces the old one; the same primary refreshes its timer. Add-ons stack with the
  primary and with each other.
- In the HUD, the weapon icon has a draining bar. The last 2 s blink with a tick. At expiry a small "BACK TO BASICS".
- **Projectile tech:**
  - Blaster and spread bolts, the kernels and every foe bullet: `E.Bullets` pools on the `'ground'` plane, `pShots`
    (team `p`, `data: { owner, w }`) and `fShots` (team `f`, `data: { id, kind }`; ids are needed for netplay).
  - Rockets and popcorn bags are small custom projectile lists (update, draw and explode).
  - The laser is a per-step segment test against enemy circles; its length comes from stepping the ray against
    `map.heightAt` (or `map.ray`).
- Player bullets stop at walls and closed doors (`shots.update(dt, map)`).

### 5.3 Pickups and economy

| Pickup | Look (string sprite, ~10 px, bobbing, glow) | Effect |
|---|---|---|
| Bill | green banknote | $100 |
| Stack | banded stack | $500 |
| Gold bar | gold ingot with glint | $1,000 |
| Briefcase | silver case with "$" | $5,000 |
| Prize box | gift box (red, blue or gold, with a bow) | a named prize from the episode's table (§7.6), worth its value |
| Golden Key | gold key, star glint | team key +1 (out of 9) |
| Capsule | a mini CRT TV whose screen shows the power-up icon and its letter (S spread, R rockets, P popcorn, L laser, G gold records, B shield bubble, F fast sneakers) | the power-up |
| Showstopper | a flashbulb | +1 bomb |
| Encore | a gold star with "1UP" | +1 life |
| Golden Statuette | a big gold "LANCIE" award statue | Green Room grand prize (ends the bonus) |

- **Collection:** a contestant touches it (radius = contestant r + 7).
  - Cash and prizes are credited × the ratings multiplier × `cashMul` **(T)**, to the collector only.
  - A pop-up "+$1,500" in the collector's colour, plus "ka-ching".
- **Lifetime:** 9 s on the floor, blinking for the last 2.5 s. Keys, placed items and the statuette never expire.
- **Magnet:** once a room is clear, cash within 60 units drifts to the nearest contestant.
- **Prize box:**
  - Draws the next prize from the episode table, shuffled with the run's seed, no repeats until it runs out.
  - A banner: "YOU WON: A SELF-AWARE TOASTER! ($2,500)", with Penny's squeal (babble).
  - The prize joins that player's recap list.
- **Keys** are shared by the team. A banner "GOLDEN KEY 4/9" and a chime; Lance's key line the first time.
- **Drops** on enemy death roll the enemy's drop table (§5.8) × `dropMul` **(T)**. Floor caps: at most 3 capsules and
  25 cash pickups at once.
- **Prize crates** are placed props: HP 3, solid while whole (`map.solid`, or a static body). When broken they spill
  3–5 cash, a 50 % chance of a prize, and the key if the room's data says so.

### 5.4 Ratings (the show's heartbeat)

- `R` runs 0–100 and is **shared by the team**: it's the show's rating, not a player's. It's drawn top-centre as a big TV
  "RATINGS" gauge with a needle, the multiplier and an APPLAUSE light.
- **Gains:**
  - A kill adds the enemy's `rat` value. A multi-kill adds +2 for each kill past 2 within 0.4 s.
  - Showboat (§5.1).
  - A **near miss**: +0.5 when a foe bullet passes within 7 units of a contestant without hitting (at most 3 a second).
  - A prize +2, a key +5, a boss part destroyed +10.
  - All gains × `ratingsGain` **(T)**.
- **Losses:** a hit −12; a death −25; BANKRUPT (the wheel) −10.
- **Decay:** after 2.5 s without a gain, R falls by `ratingsDecay` **(T)** 2.5 a second.
- **Multiplier:** R < 20 ×1; < 40 ×2; < 60 ×3; < 80 ×4; ≥ 80 ×5.
- **PRIME TIME** when R reaches 100. It lasts `primeTime` **(T)** 12 s:
  - The multiplier is locked at ×5.
  - A "PRIME TIME!" banner and fanfare sting; `audio.layer('prime', 1, .3)` brings the brass in.
  - The audience throws 3 random capsules in arcs from the bleachers; confetti cannons fire; the APPLAUSE sign blinks.
  - Afterwards R = 60, with a 20 s cooldown before the next Prime Time.
- **RATINGS STUNT** (anti-stall): if R < 5 for 10 s during waves, "WE'RE LOSING VIEWERS!" and the producers release the
  episode's stunt from a random door:
  - Ep1: 12 clapbots.
  - Ep2: a dolly tank.
  - Ep3: a mascot brute.

  R +15. At most once per room.

### 5.5 Arena, doors and hazards

**Geometry, the same in every room.** A TileMap of 23 × 15 cells is 368 × 240 world units.
- **Walls:** row 0, row 14, col 0 and col 22, wall type 1: `h: 26`, studio-flat faces (§9.2).
  - The south wall row is `cut: true`, so it never hides the floor from the camera.
- **Interior:** 21 × 13 cells, x 16–352, y 16–224, centre **(184, 120)**.
- **Door gaps** (3 cells, wall type 2, painted by our door painter):
  - N: cols 10–12 of row 0. S: cols 10–12 of row 14. W: rows 6–8 of col 0. E: rows 6–8 of col 22.
  - Door centres: N (184, 8), S (184, 232), W (8, 120), E (360, 120).
- **Room data uses interior cells** `[cx, cy]`, cx 0–20 and cy 0–12. In world units that's
  `(24 + cx * 16, 24 + cy * 16)`.

**Door states:**
- `closed`.
- `opening`: 0.35 s; the shutter rolls up, a red beacon and a klaxon.
- `open`: spawning.
- `closing`: 0.3 s; a slam and dust.
- `exit`: a green beacon and a lit sign above the door with the destination's name and room-type icon. Its cells become
  walkable (`map.set(cx, cy, 0)`), with an exit trigger 10 units past the threshold.

**Spawning:**
- From a **door:** enemies appear 20 units outside the gap and walk in with wall collision off ("entering") until inside
  the interior. The door stays open while its queue has spawns, plus 0.6 s.
- From the **audience** (hecklers): a leap from the E or W bleachers over the wall. An arc from x −30 or 398 to a random
  interior point on that side; 0.7 s, invulnerable in the air.
- **Drop:** from the ceiling at a random free interior point at least 50 units from every contestant. A shadow
  telegraphs for 0.6 s, then it falls.

**Hazards:**
- **Conveyor belts** (Ep2): strips 2 cells tall across the room. Each pushes everything on it (contestants, enemies,
  pickups, the key) at ±40 u/s, with animated chevrons. Direction reverses every 12 s after a 1.5 s warning (lights, an
  alarm, the belt slowing).
- **Pyro vents** (Ep3): floor grates firing in data-driven patterns.
  - Telegraph: 1.0 s of glow, sparks and rumble.
  - Then a 1.2 s flame column, r 12: 1 damage to contestants, 3 damage a second to enemies. It's emissive and casts light.
- **Tomato splats:** puddles of r 14 for 6 s that slow contestants to ×0.6.
- **Prize crates** and **vault locks:** static targets (rooms 1-6, 2-6, 3-4).

**Camera:**
- Fixed: `game.focus(184, 120, 0)` every update.
- Zoom is fitted so the walled arena fills the screen, leaving ~22 px top and bottom for the HUD. Measure
  `map.bounds(game.view)` at zoom 1 and recompute when the screen changes size (`game.screen.listeners`). Clamp to
  [0.6, 1.6], then × `camZoom` **(T)**.
- The scene's `camera: { zoom: false }` turns the player's zoom off. Shake goes through `game.shake` (comfort settings
  apply).
- Wide or tall screens show the studio around the arena (bleachers, cranes, the jumbotron; §9.2).

### 5.6 Room flow (phases)

`ENTER` → `INTRO` → `WAVES` → `CLEAR` → `EXIT` → `TRANSITION` → the next room's `ENTER`.

- **ENTER** (1.2 s): the walk-in. The door behind the contestants slams.
- **INTRO** (≤ 2 s): Lance's room line on the jumbotron and a "MASH!" stinger. An episode's first room is preceded by the
  episode card (§11.3).
- **WAVES:** the room script (§5.7) runs.
- **CLEAR:** every wave has spawned and no counted enemy is alive. Mimes, crates and vault locks don't count.
  - "ROOM CLEAR!" banner and sting.
  - Each living contestant gets a clear bonus of `$1,000 × episode × multiplier`, +50 % if cleared under the room's
    `par` seconds.
  - A Lance line. Remaining foe bullets fade out.
- **EXIT:** the exit doors open with their signs. The first contestant into an exit trigger picks it; 0.8 s later every
  contestant goes. Pickups can still be collected meanwhile.
  - If nobody leaves within 25 s: "HURRY UP!" and 4 clapbots every 6 s from the doors that aren't exits.
- **TRANSITION:** a 0.4 s TV-static wipe, then the "NEXT ON MASH TV" map card (2.5 s, skippable with confirm), then
  another static wipe into the next room.

**Boss rooms:** `ENTER` → `BOSS_INTRO` (~4 s cutscene, skippable) → `BOSS` → `BOSS_DEATH` (3 s) → `CLEAR` → the `recap`
scene.

**Survive rooms** (1-4): `WAVES` ends when the timer runs out and the field is clear.

### 5.7 Waves: the room script data format

```js
// src/20-content-*.js — one room
{ id: '1-2', name: 'MIME FIELD', ep: 1, type: 'battle', cell: [0, 2], exits: { N: '1-4' }, par: 60,
  place: [['mime', 4, 3], ['mime', 10, 2] /* … */],      // [kind, cx, cy] at room start (interior cells)
  items: [[1.5, 'spread', [5, 6]]],                      // [seconds after WAVES starts, pickup, 'center' | 'drop' | [cx, cy]]
  key: { rule: 'mimes' },                                 // 'mimes' | 'place' | 'crate' | 'carrier' | 'vault' | 'final' | 'survive'
  hazards: [],                                            // e.g. { kind: 'conveyor', rows: [3, 6, 9], dirs: [1, -1, 1] }
  waves: [
    { at: 2, spawn: [['S', 'goon', 8]] },
    { left: 3, at: 8, spawn: [['N', 'popper', 2], ['E', 'goon', 8]] },
    { left: 3, at: 10, spawn: [['W', 'goon', 10]], items: [['rockets', 'drop']] },
  ] }
```

- **When a wave starts:** `at` seconds after the previous wave started, or when no more than `left` counted enemies are
  alive, whichever comes first. With only one of them given, that one alone. Build it as one `game.script` per room:
  `yield E.any([w.at, () => alive() <= w.left])`.
- **A spawn entry** is `[door, kind, n, gap = 0.25]`. Doors:
  - `N`, `E`, `S`, `W` for one door.
  - `all` (each door gets n), `sides` (E and W), `ends` (N and S).
  - `audience`, `drop`, or `[cx, cy]` for an exact cell.
- **Scaling:** `n' = round(n × (1 + 0.35 × (players − 1)) × waveSize (T) × difficulty)`, where difficulty is ROOKIE 0.8,
  CONTESTANT 1 or CHAMPION 1.2. Lower `spawnGap` **(T)** packs the spawns tighter.
- **The room ends** when the last wave has spawned and the field is clear. With `{ final: true, script: 'name' }` a wave
  runs a named scripted event (the Pyro Pit's FINALE BURST).

### 5.8 Enemies

All enemies share an archetype record:
`{ kind, hp, speed, r, contact, cash, rat, drops, make(world, x, y, o), update(e, dt, world), draw(r, e) }`.

Each draws from `e.rs`, a render state `{ x, y, z, face, vx, vy, state, t, hpPct, flash, alpha }`, so the same draw code
works on hub clients (§14.3). Common rules:
- Target the nearest living contestant. Separate from each other with an `E.SpatialHash` (radius 10, a soft push), so
  crowds don't stack.
- Telegraph every attack with a visible wind-up of at least 0.3 s.
- On a hit, flash white (`r.actor(..., { flash })`) with a small knockback.
- On death, a confetti burst in the enemy's palette (`particles.bits`), a cash pop-up, a pop sound and the drop roll.
- `enemySpeed`, `enemyHp`, `enemyBulletSpeed` and `contactDmg` are **(T)** multipliers.

| kind | HP | Speed | Behaviour | Telegraph | Cash / rat | Drops |
|---|---|---|---|---|---|---|
| `goon` (STUDIO SECURITY) | 1 | 52 ±6 | Walks straight at the target in loose flocks. Within 16 units, a baton swing (`E.Attack('bash')`, wind 0.3 s, reach 14). Contact dmg 1. | the baton rises (wind) | $100 / 1 | bill 8 %, capsule 1.2 %, prize 1 % |
| `clapbot` (APPLAUSE ROBOT) | 1 | hop 115 | Hops every 0.4 s toward the target ±40° (erratic). Clapper hands clap on each hop. Contact dmg 1. | squash before the hop | $150 / 1 | bill 10 % |
| `popper` (PARTY POPPER) | 2 | 38 | Waddles to the target. Within 18 units it lights its fuse (0.6 s: inflates, flashes, hisses), then bursts into a ring of 8 confetti shards (speed 90, life 1.2 s). It also bursts when killed. | swelling and a fuse spark | $250 / 2 | stack 10 %, capsule 3 % |
| `mime` (LAND MIME) | 1 | 0 | Stands still, half-visible (alpha 0.45), miming "trapped in a box". When a contestant is within 34 units: a 0.7 s telegraph (hands up, shaking, beeps), then a blast of r 36 (dmg 1). Shot first, it pops harmlessly. **Doesn't count for room clear.** | a beep and shaking | $300 / 2 | bill 30 % |
| `disco` (DISCO BALL) | 5 (big: 10) | 70 | Bounces diagonally off walls. Every 3 s, 4 light shots in a + or × pattern, alternating (speed 110). A **big** one splits into 2 small ones (HP 3) when it dies. Contact dmg 1. | facets flare 0.4 s | $400 (big $800) / 3 | stack 20 %, capsule 5 % |
| `heckler` (STUDIO AUDIENCE) | 3 | 45 | Arrives over the wall. Keeps 70–110 units from the target and strafes. Every 2.2 s lobs a rotten tomato (`E.arc` to where the target will be in 0.6 s); the splat does dmg 1 within r 10 and leaves a slow puddle. | a red ring on the floor where it lands, the throw pose (`E.MOVES.throw`) | $350 / 2 | prize 6 %, capsule 4 % |
| `tank` (DOLLY TANK) | 14 | 26 | A camera dolly turned tank. The chassis turns slowly; the camera-turret tracks the target at 1.4 rad/s. Every 2.4 s it fires a shell (speed 120) that explodes at walls or contestants (r 16, dmg 1). On death it explodes, damaging enemies too. | lens flash and an aim line, 0.4 s | $1,000 / 6 | case 15 %, capsule 15 % |
| `snake` (CABLE SNAKE) | head 8, segments 2 × 10 | 60 | A head plug and 10 cable segments that follow the head's path history (one point every 6 units). It weaves toward the target. Shot-off segments shorten it; segments can be hit independently. Contact dmg 1. | the head rears back before a 1.5× lunge | head $1,200 / 5, seg $150 / 1 | head: case 30 % |
| `brute` (THE CEREAL KILLER, a mascot) | 24 | walk 40, charge 220 | Walks at the target. Every 4 s: a 0.8 s telegraph (stomps, floor rings, a roar), then a straight charge of up to 1.4 s. Hitting a wall stuns it for 1.5 s, and stunned it takes ×2 damage. Contact dmg 2. | a stomp, rings on the floor, a red line along the charge | $2,000 / 8 | case 40 %, capsule 25 % |
| `hecklerKing` (2-4 only) | 12 | 45 | A heckler with a foam crown who throws 3-tomato volleys. Carries the room's key. | as heckler | $1,500 / 6 | key |
| `crate` | 3 | — | A static prize crate (see §5.3). | — | — | cash, prize, key |
| `lock` (3-4 only) | 15 | — | A vault bolt on the north wall; when all 4 break, the safe opens. | — | $500 / 2 | — |

Enemy foe-bullet kinds, used across enemies and bosses:
- `orb` (generic): r 3.
- `shard` (confetti): r 2.
- `beam` (disco light): r 2, long.
- `tomato`: a lob with z.
- `shell`: explodes.
- `butter`, `gravy`, `coin`, `card` (spins), `static` (jittery), `tot` (lobbed, bursts into 6 shards).

Speeds stay at 70–130, readable at 10 feet, each with a bright core and a dark outline.

### 5.9 Bosses

**The framework** (`src/17-bosses.js`). A boss is
`{ kind, x, y, phase, parts: [{ id, ox, oy, r, hp, max, armor, weak, alive }], script, rs }`.
- Damage goes to the part hit: × `armor` (0.15 means "TINK" sparks and no damage number; 1 is normal; 2 is a weak point).
- A part destroyed: an explosion, debris, ratings +10, and the part's `onDestroy`.
- Phases are coroutines (`game.script` generators) that yield on time and on conditions. A phase switch cancels the old
  script and starts the new one.
- Boss HP bar: top centre, below the ratings gauge, with the boss's name and one segment per part.
- `bossHp` **(T)** and the player count (×(1 + 0.5 × (players − 1))) scale every HP.
- **Netplay:** every boss provides `toNet()`, a small array (position, phase, timers, angles, part bits and HP
  percentages), and `fromNet(a)`, which rebuilds `rs` on clients. All boss drawing reads `rs` only.

**Boss 1: MASHY, "THE NETWORK'S BELOVED MASCOT, NOW WITH UPGRADES"** (room 1-B, *SOUNDSTAGE 9: MASHY'S BIG DEBUT*)
- **Look:** a giant animatronic potato in a tuxedo and bow tie on tank treads, with googly eyes. A **Butter Cannon** on
  the left arm, a **Gravy Gatling** on the right, and a hatch in its smile.
- **Size and parts:** about 70 × 50 units.
  - Body: r 26, HP 160, armor 0.15 while either arm is alive, then 0.5.
  - Left arm (ox −30, oy 6): r 10, HP 45.
  - Right arm (ox +30, oy 6): r 10, HP 45.
  - Mouth hatch (oy 14): r 9, weak ×2, only while open.
- **Entrance:** the N door bursts open and Mashy rolls in to y 70 (2 s); boss music starts.
- **Phase 1 (both arms):** it drifts side to side along the north third at speed 30.
  - Butter Cannon: every 1.8 s, a 5-way spread at the nearest contestant (arc 0.9 rad, speed 95).
  - Gravy Gatling: every 3.2 s, a 1.2 s stream sweeping 100° (10 bullets/s, speed 120).
  - When one arm falls (it drops off smoking), the other fires 30 % faster.
- **Phase 2 (no arms):**
  - The hatch opens for 2.2 s every 4.5 s.
  - Head ring: every 2.5 s, 14 orbs at speed 80, offset alternating.
  - **Tater Tot Toss**: every 5 s, 3 lobbed tots that burst into 6 shards each.
  - 6 goons from the S door every 9 s.
- **Phase 3 (body < 35 %): "MASHY'S GONE MASHY!"**
  - Charges: 0.9 s telegraph (revving, exhaust smoke, red eyes, a line on the floor), then 170 u/s toward the target
    until it hits a wall, where it bounces.
  - 3 charges, then 2.5 s rest with the hatch open.
  - 6 clapbots from E/W every 10 s.
- **Death:** 2 s of chain explosions, beige "mashed potato" confetti, a big flash, then a shower of 30 cash pickups, 2
  prize boxes and 1 capsule. Lance: "MASHY HAS BEEN... MASHED! SOMEBODY GET A SPATULA!"

**Boss 2: THE WHEEL OF MISFORTUNE** (room 2-B, *THE BIG SPIN*)
- **Look:** a giant prize wheel (radius 44) on a mount at the north wall, centre (184, 52).
  - Eight labelled segments, each with a marquee-bulb cluster: TOMATO TIME, LASER LIGHTS, MIME TIME, BANKRUPT,
    DISCO FEVER, GOON SQUAD, JACKPOT and SPIN AGAIN.
  - A clicking pointer on top.
- **Parts:** 8 bulb clusters (at radius 34, rotating with the wheel, HP 18 each) and the hub **Jackpot Core** (r 14, HP
  220, armored 0.15 in phase 1).
- **Phase 1 cycle:**
  - Spin for 2.5 s. The bulb clusters move, so hitting them is a skill.
  - It slows and stops on a random living segment, with clicks and a drum roll. Lance announces it: "LASER LIGHTS!"
  - The segment's attack runs for 4–6 s; then the next spin.
- **Segment attacks:**
  - TOMATO TIME: 8 tomatoes lobbed from the audience, staggered 0.3 s.
  - LASER LIGHTS: 4 beams from the hub, each telegraphed with a thin line for 0.8 s, sweeping 1.2 rad over 4 s.
  - MIME TIME: 6 mimes puff in, scattered around the contestants (never within 40).
  - BANKRUPT: 2 rings of 20 coin bullets (speed 85, offset), ratings −10, a big "BANKRUPT!" sting.
  - DISCO FEVER: 2 disco balls drop out of the wheel.
  - GOON SQUAD: 12 goons from E/W/S.
  - JACKPOT: confetti, 20 cash pickups and 1 capsule rain down; the wheel is stunned for 3 s and the core takes full
    damage.
  - SPIN AGAIN: spins again at once, 1.5× faster, and the next attack's bullets are 20 % faster.
- **Losing segments:** destroying a cluster blacks its segment out ("VOID") and removes it from the draw.
- **Phase 2 (4 segments destroyed): "THE WHEEL BREAKS LOOSE!"**
  - It tears off its mount and rolls around the arena, bouncing off walls at 85 u/s. Contact r 40, dmg 2.
  - Each bounce sprays 8 sparks (orbs).
  - It still lands on its remaining segments every 6 s. The core takes full damage.
- **Death:** it falls flat, spins down like a coin and bursts into bulbs and coins. "THE WHEEL HAS STOPPED... FOREVER!"

**Boss 3: LANCE LUSTRE LIVE! → THE NETWORK** (room 3-B, the Season Finale)
- **Phase A, the STARMAKER 9000.** Lance (a Humanoid at size 1.4) rides a hovering golden podium mech with a spotlight
  turret on each side.
  - Parts: podium r 22, HP 260; turrets r 8, HP 30 each.
  - It hovers and bobs, drifting to stay 100–140 from the contestants. Patterns are scripted in a cycle:
    1. **CUE CARD CYCLONE:** a 3-arm spiral of spinning card bullets (1.4 rad/s, 12 a second) for 3 s.
    2. **MIC DROP:** a shadow circle telegraphs the landing (r 30, 1.0 s); it rises, then slams down there. A ring of
       24 orbs plus a shockwave ring that grows to r 80 (dmg 1). The slide's i-frames get through it, which teaches
       the slide.
    3. **SPOTLIGHT SWEEP:** each living turret throws a telegraphed light cone that sweeps the floor. Standing in a lit
       cone for 0.4 s is a hit. A destroyed turret has no sweep.
    4. **COMMERCIAL BREAK** (at 66 % and 33 % HP): Lance flies off-screen.
       - A "WE'LL BE RIGHT BACK!" banner and the sponsor jingle.
       - 12 s of adds: goons, clapbots and 1 brute. The boss is gone and can't be hit.
       - He returns when the adds are cleared or the timer ends.
  - **At 0 HP:** the podium crashes. Lance tumbles out and his face *peels off*, showing a speaker grille:
    "LANCE WAS A ROBOT ALL ALONG!"
- **Phase B, THE NETWORK.** The north wall rises (a tween on the wall art), revealing a wall of **12 TVs** (3 rows × 4)
  around a giant lens, **THE EYE**.
  - TVs: parts r 10, HP 22. THE EYE: r 18, HP 300, armored 0.15 until 8 TVs are gone.
  - Every 4–6 s each TV flips to a channel, with a 0.5 s flicker telegraph. At most 4 TVs are active at once:
    - STATIC: 5 static sparks aimed at a contestant.
    - NEWS: after a 0.8 s line telegraph, a beam straight down its column for 1 s.
    - CARTOON: 2 clapbots pop out.
    - SHOPPING: drops a cash pickup (bait).
    - LANCE: Lance's face spits a 3-way spread.
  - After 8 TVs, THE EYE opens and alternates every 3 s between a spiral (2 arms) and a ring of 18.
  - **Death:** the screens burst one by one, "SIGNAL LOST", and a white static fade. Victory.

### 5.10 Scoring, lives, continue, high scores

- **Score** is **winnings in dollars**, per contestant. There's no separate points counter. Shown as "$1,234,500".
- **Continue:** when every contestant is out, run the CONTINUE countdown from `E.Arcade` (`cab.continue(10, done)`).
  - "CONTINUE? 10…0" with Lance's line.
  - Any player's confirm or start continues, which needs **engine patch P3**: `continue()` must read every
    `game.players` input.
  - On continue, every contestant gets full lives and half their winnings ("THE NETWORK TAKES ITS CUT!").
  - At zero: Game Over.
- **Game Over:** a sad-trombone sting, "AND THAT'S A WRAP!", the prize recap of what they *would* have won (short), then
  initials.
- **High scores:** `new E.Arcade(game, { id: 'mashtv', hud: false, idle: 10 })`, one table, mode `'show'`.
  - After a run, each qualifying contestant enters initials in turn with **their own** input (**engine patch P3:**
    `cab.enter(score, mode, done, input)`).
  - Then `cab.drawTable` on the "TOP EARNERS" screen.
  - Episode-select "rehearsal" runs and attract demos never enter the table.

### 5.11 Difficulty and player scaling

- Difficulty is chosen before the lobby (ROOKIE / CONTESTANT / CHAMPION; §5.1), stored in `MT.run.diff` and shown in the HUD.
- Player count scales wave counts (§5.7) and boss HP (§5.9).
- Every multiplier is visible and live in dev mode.

### 5.12 The broadcast layer (how the show talks)

- **Jumbotron:** a big screen above the north wall in world space. It shows a live `rig.drawPortrait` of whoever is
  talking (Lance, Penny, or a boss face), with scanlines. Between lines it shows the MASH TV logo, the ratings and a
  sponsor ad loop.
- **Lower third:** a bottom-centre banner while someone talks: name plate (LANCE LUSTRE / PENNY PRIZE / ANNOUNCER), the
  line typing out at 45 chars/s, and the Babble voice (§10.3).
  - Lines queue with priorities, so a boss intro beats a kill quip.
  - Quips are rate-limited (at most one per 6 s).
  - The setting "Host chatter: Normal / Less / Off" filters by priority.
- **Crowd:** the audience sprites bob with R. They cheer at kills, big multi-kills and showboats; "OOH" at hits; laugh
  at deaths; do *the wave* during Prime Time.
- **Events → reactions** come through one table: `MT.react[event] = { line, crowd, sting, priority }`. Gameplay code only
  emits events (`world.event('kill', …)`), so it never calls audio or text directly.

---

## 6. Content overview

| Content | Count |
|---|---|
| Episodes | 3 (THE PILOT · SWEEPS WEEK · THE SEASON FINALE), each with its own set, music and enemy pool |
| Rooms | 18 wave rooms (6 per episode) + 3 boss rooms + the Green Room bonus |
| Session round | THE LIGHTNING ROUND (3 rooms + Mashy, reusing episode rooms) |
| Enemies | 9 kinds + the Heckler King, prize crates, vault locks |
| Bosses | 3 (Mashy · the Wheel of Misfortune · Lance in the Starmaker 9000 → The Network) |
| Power-ups | 5 weapons/add-ons + shield, speed, Showstopper, Encore |
| Pickups | 4 cash kinds, 18 named prizes, 9 Golden Keys, the Golden Statuette |
| Hazards | conveyor belts (Ep2), pyro vents (Ep3), tomato splats, land mimes |
| Characters | 4 contestant looks, Lance Lustre (host), Penny Prize (co-host), the Announcer (voice), the audience, paparazzi |
| Story beats | Cold Open, 3 episode cards, 3 boss intros and defeats, the robot reveal, 3 Prize Recaps, Ending A, Ending B, Game Over, Continue |

### 6.1 Every episode uses the same map shape

```
                  [ B: BOSS ]
                       │
 [ 4: KEY ROOM ] ─► [ 5: ARMORY ] ◄─ [ 6: CASH/BATTLE ]
       ▲                ▲                  ▲
 [ 2: LEFT ] ◄─── [ 1: START ] ───► [ 3: RIGHT ]
```

- Exits: 1 → W:2, N:5, E:3. 2 → N:4. 3 → N:6. 4 → E:5. 6 → W:5. 5 → N:B.
- The paths are **direct** (1→5→B: 2 rooms), **left** (1→2→4→5→B: 4 rooms, 2 keys) and **right** (1→3→6→5→B: 4
  rooms, 1 key).
- Walking out of a door enters the next room from the opposite door; that's the room's `entry`. An episode's start
  room, the Green Room and the Lightning Round's first room are entered from **S**. A boss room is always entered from
  S, because room 5 leaves by N.
- **Keys:** 3 per episode, 9 in all. The left path gets 2 per episode. **The Green Room needs 5**, so a team takes the
  left path at least twice. The "NEXT ON MASH TV" card shows key icons on rooms that hold a key.

**Wave notation** in the tables below:
- `W3 ≤4|@8: N goon×6, E popper×2 · item spread@drop` means: wave 3 starts when 4 or fewer counted enemies are alive,
  or 8 s after wave 2 started, whichever comes first.
- It spawns 6 goons from the north door and 2 poppers from the east, and drops a Triple Play capsule from the ceiling.
- `@2` means 2 s after WAVES begins.
- Cell positions are interior `[cx, cy]` (0–20, 0–12).
- `par` is the clear time, in seconds, for the speed bonus.

---

## 7. Episode and room content

### 7.1 EPISODE 1: THE PILOT (Studio 9, set `studio`)

Enemy pool: goon, clapbot, popper, mime. Stunt: 12 clapbots. Music: `studioBattle`.

| id | Name | Type | Cell | Exits | Key | Notes |
|---|---|---|---|---|---|---|
| 1-1 | OPENING NUMBER | start | (1,2) | W→1-2, N→1-5, E→1-3 | — | tutorial prompts; intros for goon, clapbot and popper |
| 1-2 | MIME FIELD | battle | (0,2) | N→1-4 | `mimes` | 10 placed mimes; rockets |
| 1-3 | CLAP TRAP | battle | (2,2) | N→1-6 | — | clapbot-heavy; gold records |
| 1-4 | KEY GAUNTLET | key (survive) | (0,1) | E→1-5 | `survive` | key in a prize cage that opens at 20 s |
| 1-5 | WEAPONS LOCKER | armory | (1,1) | N→1-B | — | 3 weapon pedestals; the big room before the boss |
| 1-6 | CASH COW CORRAL | cash | (2,1) | W→1-5 | `crate` | 6 prize crates; cash ×1.5 |
| 1-B | MASHY'S BIG DEBUT | boss | (1,0) | — | — | Mashy (§5.9) |

**1-1 OPENING NUMBER** (par 70)
- W1 @2: N goon×6 (gap 0.35), S goon×6 (gap 0.35).
- W2 ≤2|@10: E goon×8, W goon×8.
- W3 ≤4|@8: all goon×3 · item spread@center.
- W4 ≤4|@8: N clapbot×6, S clapbot×6.
- W5 ≤5|@8: all goon×5, N popper×2.

Tutorial prompts appear once per run, in the input glyphs of each player's last device:
- At W1: MOVE and AIM+FIRE.
- At the first capsule: "WALK OVER POWER-UPS".
- At W3: "SHOWBOAT NEAR ENEMIES FOR RATINGS".
- At W4: "SLIDE THROUGH DANGER".
- When 20 or more enemies are alive: "SHOWSTOPPER CLEARS THE SCREEN".
- At EXIT: "PICK A DOOR!"

**1-2 MIME FIELD** (par 60). Place mimes at [3,3] [7,2] [13,2] [17,3] [5,6] [15,6] [3,9] [7,10] [13,10] [17,9].
- W1 @2: S goon×8.
- W2 ≤3|@8: N popper×2, E goon×8.
- W3 ≤3|@10: W goon×10 · item rockets@drop.
- W4 ≤4|@8: all clapbot×3.
- W5 ≤3|@8: N popper×3, S popper×3, E goon×6.
- Key `mimes`: when all 10 placed mimes are destroyed, the key drops where the last one stood. Lance: "MIME OVER MATTER!"

**1-3 CLAP TRAP** (par 65)
- W1 @2: E clapbot×8, W clapbot×8.
- W2 ≤3|@8: N goon×12.
- W3 ≤4|@8: all clapbot×5 · item records@drop.
- W4 ≤4|@8: S popper×4, E goon×8.
- W5 ≤3|@8: all clapbot×6, N goon×6.

**1-4 KEY GAUNTLET** (survive 35 s)
- The key sits on a turning pedestal at the centre inside a **prize cage**: a solid ring of r 14 that blocks contestants.
  The cage lifts at 20 s with a fanfare.
- For 35 s, streams arrive:
  - Every 1.2 s, 1 goon from each door.
  - Every 4 s, 2 clapbots from a random door.
  - Every 7 s, 1 popper from a random door.
- Then a last wave: all goon×4.
- Items: 6 s shield@drop, 18 s bomb@drop, 28 s life@drop.
- A big countdown clock shows on the jumbotron.

**1-5 WEAPONS LOCKER** (par 80). Items at 1.5 s: spread [5,6], rockets [15,6], records [10,3], each on a lit pedestal.
- W1 @3: all goon×8.
- W2 ≤4|@8: N popper×4, S popper×4.
- W3 ≤5|@8: E clapbot×10, W clapbot×10.
- W4 ≤5|@8: all goon×8 · item speed@drop.
- W5 ≤4|@10: N goon×12, S goon×12, sides popper×2.

**1-6 CASH COW CORRAL** (par 60)
- Crates at [4,3] [10,2] [16,3] [4,9] [10,10] [16,9]. One, picked by the run seed, holds the key.
- Cash ×1.5 in this room, and the bill drop chance ×2.
- W1 @2: N goon×10.
- W2 ≤3|@8: E goon×10, W goon×10.
- W3 ≤4|@8: all clapbot×4.
- W4 ≤4|@8: S popper×3, N popper×3, all goon×3.

### 7.2 EPISODE 2: SWEEPS WEEK (the MegaMart Prize Warehouse, set `warehouse`)

Adds disco, heckler and tank; hazard: conveyors. Stunt: a dolly tank. Music: `warehouseFunk`.

| id | Name | Type | Cell | Exits | Key | Notes |
|---|---|---|---|---|---|---|
| 2-1 | AISLE 9 RUMBLE | start | (1,2) | W→2-2, N→2-5, E→2-3 | — | disco intro; popcorn |
| 2-2 | CONVEYOR CHAOS | hazard | (0,2) | N→2-4 | `carrier` | belts at interior rows 2–3 (→), 5–6 (←) and 9–10 (→); the key rides the middle belt |
| 2-3 | DISCO DEPOT | battle | (2,2) | N→2-6 | — | big discos; laser |
| 2-4 | TOMATO TERRITORY | battle | (0,1) | E→2-5 | `carrier` (Heckler King) | heckler intro |
| 2-5 | TANK YARD | armory | (1,1) | N→2-B | — | tank intro; popcorn and rockets pedestals |
| 2-6 | BLOWOUT SALE | cash | (2,1) | W→2-5 | `crate` | 8 crates; cash ×1.5 |
| 2-B | THE BIG SPIN | boss | (1,0) | — | — | the Wheel of Misfortune (§5.9) |

**2-1 AISLE 9 RUMBLE** (par 70)
- W1 @2: N goon×10, S goon×10.
- W2 ≤4|@8: E disco×1, W disco×1.
- W3 ≤3|@10: all goon×6 · item popcorn@center.
- W4 ≤4|@8: N popper×3, S clapbot×10.
- W5 ≤4|@8: E disco×2, W goon×12.

**2-2 CONVEYOR CHAOS** (par 65)
- The key starts at [19,5] on the middle belt, which runs ←, so it crosses the whole room before it first wraps. It
  moves with the belt and wraps from one end to the other through the side doors' frames.
- W1 @2: E goon×12.
- W2 ≤4|@8: W clapbot×10.
- W3 ≤4|@8: N popper×4, S popper×4.
- W4 ≤4|@8: all goon×8 · item laser@drop.
- W5 ≤3|@8: E disco×2, W disco×1.

**2-3 DISCO DEPOT** (par 70)
- W1 @2: N discoBig×2.
- W2 ≤2|@10: E goon×10, W goon×10.
- W3 ≤4|@8: S disco×2 · item laser@drop.
- W4 ≤4|@8: all clapbot×5.
- W5 ≤3|@9: N discoBig×2, S goon×8.

**2-4 TOMATO TERRITORY** (par 70)
- W1 @2: audience heckler×4.
- W2 ≤2|@8: N goon×12.
- W3 ≤4|@8: audience heckler×6.
- W4 ≤4|@8: S popper×4, E clapbot×8.
- W5 ≤3|@8: audience hecklerKing×1 + heckler×3 · item life@drop.
- The key drops from the King.

**2-5 TANK YARD** (par 80). Items at 1.5 s: popcorn [5,6], rockets [15,6].
- W1 @2: N tank×1.
- W2 ≤1|@10: all goon×8.
- W3 ≤4|@8: E tank×1, W tank×1.
- W4 ≤2|@10: S popper×4, N clapbot×10 · item shield@drop.
- W5 ≤3|@9: N tank×2, all goon×6.

**2-6 BLOWOUT SALE** (par 65)
- Crates at [3,2] [9,2] [11,2] [17,2] [3,10] [9,10] [11,10] [17,10]. One holds the key.
- W1 @2: all goon×8.
- W2 ≤4|@8: audience heckler×4.
- W3 ≤3|@8: E disco×1, W disco×1.
- W4 ≤3|@8: all clapbot×5.
- W5 ≤3|@8: N tank×1, S goon×10.

### 7.3 EPISODE 3: THE SEASON FINALE (the Rooftop Gala, set `rooftop`, at night)

Adds snake and brute; hazard: pyro vents. Stunt: a mascot brute. Music: `finaleOverture`.

| id | Name | Type | Cell | Exits | Key | Notes |
|---|---|---|---|---|---|---|
| 3-1 | RED CARPET RIOT | start | (1,2) | W→3-2, N→3-5, E→3-3 | — | brute intro |
| 3-2 | PYRO PIT | hazard | (0,2) | N→3-4 | `final` | 12 vents; FINALE BURST |
| 3-3 | CABLE TANGLE | battle | (2,2) | N→3-6 | — | snake intro; laser |
| 3-4 | PENTHOUSE VAULT | key | (0,1) | E→3-5 | `vault` | 4 locks on the north wall's safe |
| 3-5 | THE AFTER-PARTY | armory | (1,1) | N→3-B | — | everything; laser, popcorn and shield pedestals |
| 3-6 | MASCOT MAYHEM | battle | (2,1) | W→3-5 | `carrier` (second brute of W5) | brutes |
| 3-B | LANCE LUSTRE LIVE! | boss | (1,0) | — | — | Lance → The Network (§5.9) |

**3-1 RED CARPET RIOT** (par 75)
- W1 @2: all goon×8.
- W2 ≤4|@8: audience heckler×4, N disco×1.
- W3 ≤3|@8: E tank×1, W popper×4.
- W4 ≤3|@9: N brute×1.
- W5 ≤2|@10: all clapbot×6, S goon×8.

**3-2 PYRO PIT** (par 70)
- 12 vents at cx {4, 8, 12, 16} × cy {3, 6, 9}.
- Every 3.5 s the pattern cycles through `rows` (one row), `cols` (one column), `checker` and `allButLane` (every
  column but one random one).
- W1 @2: N goon×12.
- W2 ≤4|@8: E clapbot×10, W clapbot×10.
- W3 ≤4|@8: S popper×4 · item records@drop.
- W4 ≤3|@8: audience heckler×4.
- W5 ≤3|@8: script `finaleBurst` (every vent fires twice, each with a 1.0 s telegraph) + all goon×4. Then the key rises
  at the centre.

**3-3 CABLE TANGLE** (par 75)
- W1 @2: N snake×1.
- W2 @8: all goon×6.
- W3 ≤4|@10: E snake×1, W snake×1.
- W4 ≤3|@10: S popper×4 · item laser@drop.
- W5 ≤2|@10: N snake×2, all clapbot×3.

**3-4 PENTHOUSE VAULT** (par 80)
- A safe is built into the north wall's **left** half, between cx 1 and 7, clear of the N door at cx 9–11, which W5
  still uses. It has 4 lock bolts (`lock`, HP 15) at [1,0] [3,0] [5,0] [7,0].
- When all 4 break, the safe door swings open and the key plus 10 cash pickups spill out.
- W1 @2: all goon×8.
- W2 ≤4|@8: audience heckler×4.
- W3 ≤3|@8: E tank×1.
- W4 ≤3|@8: all clapbot×5.
- W5 ≤3|@8: N brute×1.

**3-5 THE AFTER-PARTY** (par 85). Items at 1.5 s: laser [5,6], popcorn [15,6], shield [10,10].
- W1 @2: N snake×1, S goon×10.
- W2 ≤3|@8: E discoBig×1, W tank×1.
- W3 ≤3|@8: audience heckler×6.
- W4 ≤3|@9: N brute×1, all clapbot×4.
- W5 ≤3|@9: all goon×10, N popper×4.

**3-6 MASCOT MAYHEM** (par 80)
- W1 @2: N brute×1.
- W2 ≤1|@10: all goon×8.
- W3 ≤3|@8: E brute×1, W popper×4.
- W4 ≤3|@8: S snake×1 · item rockets@drop.
- W5 ≤2|@10: N brute×2. The second brute carries the key.

### 7.4 THE GREEN ROOM (bonus, set `greenroom`)

- **Entry:** reached after the Episode 3 recap when the team has 5 or more keys. Contestants enter from S. Penny: "YOU
  FOUND THE GOLDEN KEYS! WELCOME TO THE GREEN ROOM!"
- **Rules:** 40 s, with no hostile enemies.
  - Cash and prize boxes drop from the ceiling, 4 a second, at random free points.
  - 6 harmless **paparazzi** (Humanoids holding cameras) wander about. Every 3 s one flashes: a white vignette for
    0.15 s, which follows the comfort settings.
- **The statuette:** at 30 s the **Golden Statuette** rises at the centre under a spotlight. Touching it, or the timer
  reaching 40 s, ends the bonus. Whoever touches it wins **THE NETWORK (YES, ALL OF IT)**: +$100,000 × the multiplier.
- **Then** Ending B.

### 7.5 THE LIGHTNING ROUND (AI Hub sessions only)

- **Rooms:** L1 = room 1-1's waves (no tutorial prompts), L2 = 1-2, L3 = 2-3, LB = Mashy.
- **Exits:** each non-boss room has one exit, N, signed "NEXT". The order is fixed.
- **Scaling:** by player count (§5.7, §5.9).
- **Lives:** unlimited. Each respawn costs $2,500, never going below $0.
- **Keys:** still appear (1-2's mime key) and pay +$10,000 instead of counting.
- **Ending:** the round ends when Mashy dies (won) or at the hub's time-up. Standings are by cash (§14.4).

### 7.6 Prizes (§5.3) and Penny's joke for each

Each prize has a 12×12 icon (a string sprite with a simple silhouette) for banners and the recap.

| Ep | Prize | Value | Penny's line |
|---|---|---|---|
| 1 | A SELF-AWARE TOASTER | $2,500 | "IT ALREADY RESENTS YOU!" |
| 1 | A HOVER BLENDER | $3,000 | "SMOOTHIES AT ANY ALTITUDE!" |
| 1 | A LIFETIME SUPPLY OF CANNED LAUGHTER | $4,000 | "NEVER LAUGH ALONE AGAIN!" |
| 1 | A MOOD-RING THERMOSTAT | $1,500 | "YOUR HOUSE KNOWS HOW YOU FEEL!" |
| 1 | A DRY-LAND JET SKI | $8,000 | "IT DOESN'T FLOAT, BUT IT LOOKS GREAT!" |
| 1 | A SLIGHTLY HAUNTED ROBO-BUTLER | $6,000 | "THE GHOST DOES THE DISHES!" |
| 2 | A FRIDGE THAT JUDGES YOU | $5,000 | "IT KNOWS ABOUT THE MIDNIGHT CAKE!" |
| 2 | MATCHING JETPACKS | $12,000 | "SEATBELTS NOT INCLUDED!" |
| 2 | A 199-INCH MEGA-RAY TV | $9,000 | "WATCH MASH TV LIFE-SIZED!" |
| 2 | A SELF-FOLDING LAUNDRY CUBE | $3,500 | "IT FOLDS YOU, TOO!" |
| 2 | A GOLD-PLATED REMOTE | $4,500 | "CHANGE ANY CHANNEL BUT THIS ONE!" |
| 2 | AN INFLATABLE SPORTS CAR | $7,000 | "ZERO TO SIXTY IN ONE PUMP!" |
| 3 | A TIMESHARE ON THE MOON | $25,000 | "GETTING HOME IS EXTRA!" |
| 3 | A PERSONAL WEATHER MACHINE | $15,000 | "RAIN ON EVERYONE'S PARADE!" |
| 3 | A DIAMOND TOOTHBRUSH | $8,000 | "FOR A SMILE LIKE LANCE'S!" |
| 3 | A PET CLONING KIT | $10,000 | "NOW YOU HAVE TWO PROBLEMS!" |
| 3 | A BOTTOMLESS CHAMPAGNE FLUTE | $6,000 | "CHEERS, FOREVER!" |
| 3 | A SPEEDBOAT NAMED LANCE | $20,000 | "IT ALSO TALKS ABOUT ITSELF!" |
| GR | THE NETWORK (YES, ALL OF IT) | $100,000 | "YOU OWN THE SHOW NOW!" |

**Sponsors**, for the jumbotron ads, banners and lines:
- **KRUNCH-O**: "THE CEREAL THAT CRUNCHES BACK".
- **MEGAMART**: "WE SELL EVERYTHING. EVEN THIS SHOW."
- **DOOM COLA**: "TASTE THE END".
- **LAFF TRAK**: "CANNED LAUGHTER FOR AWKWARD SILENCES".

---

## 8. Story beats and script

**Speakers:**
- `LANCE`: Lance Lustre, the host.
- `PENNY`: Penny Prize, the co-host and prize presenter.
- `ANNC`: the Announcer, a booming voice that's never seen.
- `MASHY`, `NETWORK`: bosses.
- `SPONSOR`: jingles.

Every line is subtitled in a lower third and voiced in Babble (§10.3). All are skippable: confirm skips the line, and
holding confirm (or Start) skips the whole cutscene.

### 8.1 Cold Open (after the lobby)

The camera holds on the dark studio. Spotlights sweep and the crowd murmurs.

1. ANNC: "LIVE FROM STUDIO 9 IN BEAUTIFUL NEO-BURBANK... IT'S... MASH TV!" The logo slams onto the jumbotron, confetti
   cannons fire and the crowd roars.
2. LANCE walks out of the N door, waving with the mic: "GOOD EVENING, PLANET EARTH! I'M LANCE LUSTRE, AND THIS IS THE
   ONLY SHOW WHERE THE PRIZES ARE BIG AND THE LIFE EXPECTANCY IS SMALL!"
3. LANCE: "TONIGHT, {N} BRAVE CONTESTANTS FIGHT FOR CASH, PRIZES AND THE RIGHT TO KEEP BREATHING!"
4. One line per contestant, in a lower-third with their portrait:
   - ROCKET (P1 look): "A RETIRED STUNT DOUBLE, JUST HERE FOR THE TOASTER!"
   - VOLT: "A LICENSED ELECTRICIAN WITH UNLICENSED REFLEXES!"
   - MOXIE: "THREE-TIME CHAMPION OF COMPETITIVE COUPON CLIPPING!"
   - GOLDIE: "WANTS THE MOON TIMESHARE. HAS NO PLAN FOR GETTING HOME!"
5. PENNY: "AND REMEMBER, BY ORDER OF THE FCC, ALL GORE HAS BEEN REPLACED WITH CONFETTI!"
6. LANCE: "LET'S PLAY... MASH TV! KA-CHING! KA-BOOM!" Then the Episode 1 card.

### 8.2 Episode beats

| Beat | Lines |
|---|---|
| Ep1 card: "EPISODE 1: THE PILOT" | LANCE: "OUR VERY FIRST EPISODE! TRY NOT TO MAKE IT YOUR LAST!" |
| Mashy intro | PENNY: "OOH, HERE HE COMES!" · LANCE: "PLEASE WELCOME THE NETWORK'S BELOVED MASCOT... MASHY! WE GAVE HIM A FEW... UPGRADES!" · MASHY: "MASHY LOVE YOU! MASHY MASH YOU!" |
| Mashy phase 3 | LANCE: "UH-OH! MASHY'S GONE MASHY!" |
| Mashy defeat | LANCE: "MASHY HAS BEEN... MASHED! SOMEBODY GET A SPATULA!" |
| Recap 1 | PENNY: "LET'S SEE WHAT OUR CONTESTANTS WON!" (one line per prize, with its joke) · LANCE: "SEE YOU AFTER THE BREAK!" |
| Ep2 card: "EPISODE 2: SWEEPS WEEK" | LANCE: "IT'S SWEEPS WEEK! THE NETWORK SAYS: MORE EXPLOSIONS, FEWER SURVIVORS!" · PENNY: "LIVE FROM THE MEGAMART PRIZE WAREHOUSE!" |
| Wheel intro | LANCE: "IT'S TIME TO SPIN... THE WHEEL OF MISFORTUNE! SPIN TO WIN! OR, STATISTICALLY, SPIN TO LOSE!" |
| Wheel breaks loose | LANCE: "THE WHEEL'S OFF ITS HINGES! JUST LIKE OUR LEGAL DEPARTMENT!" |
| Wheel defeat | LANCE: "THE WHEEL HAS STOPPED... FOREVER! BANKRUPT!" |
| Recap 2 | as Recap 1 · LANCE: "DON'T GO ANYWHERE! LEGALLY, YOU CAN'T!" |
| Ep3 card: "EPISODE 3: THE SEASON FINALE" | LANCE: "THE SEASON FINALE, LIVE FROM THE ROOFTOP GALA! FIREWORKS! CHAMPAGNE! FUNERALS!" |
| Finale intro | LANCE (in the Starmaker 9000): "YOU WERE SUPPOSED TO LOSE! THE SPONSORS HAVE CONTRACTS! NOBODY CANCELS LANCE LUSTRE!" |
| Commercial Break | LANCE: "WE'LL BE RIGHT BACK AFTER A WORD FROM OUR SPONSORS!" · SPONSOR (sung): "KRUNCH-O! THE CEREAL THAT CRUNCHES BACK!" |
| Lance defeat | LANCE (glitching): "THIS... ISN'T... OVER... PLEASE... STAND... BY..." · his face peels off · ANNC: "LADIES AND GENTLEMEN... LANCE WAS A ROBOT ALL ALONG!" |
| The Network reveal | NETWORK (cold, synthetic): "THE SHOW MUST GO ON. THE SHOW WILL ALWAYS GO ON. PLEASE. STAY. TUNED." |
| Network defeat | NETWORK: "SIGNAL... LOST..." · then white static |
| Recap 3 | PENNY: "WHAT A SEASON! LET'S COUNT IT UP!" |
| Keys ≥ 5 | PENNY: "YOU FOUND THE GOLDEN KEYS! THE GREEN ROOM IS OPEN!" → Green Room |
| **Ending A** (keys < 5) | PENNY: "CONGRATULATIONS! YOU SURVIVED THE SEASON!" · the contestants pose in a spotlight (`cheer`) · behind the curtain a spare Lance robot boots up: LANCE: "...HELLO, PLANET EARTH! NEXT SEASON ON MASH TV..." · card: "MASH TV WILL RETURN." · a small hint: "FIND 5 GOLDEN KEYS TO OPEN THE GREEN ROOM" |
| **Ending B** (Green Room) | ANNC: "BREAKING NEWS! TONIGHT'S CONTESTANTS HAVE POOLED THEIR WINNINGS... AND BOUGHT THE NETWORK!" · the contestants hit a giant red OFF switch · ANNC: "MASH TV HAS BEEN... CANCELLED!" · the studio lights go out one by one, the crowd cheers · card: "MASH TV — CANCELLED. THANKS FOR WATCHING." · stinger: rebuilt Lance hosting a cooking show on CHANNEL 3,000: "TONIGHT: MASHED POTATOES!" |
| Game Over | LANCE: "AND THAT'S A WRAP! FOR YOU, PERMANENTLY!" / "YOUR CONSOLATION PRIZE: THE HOME VERSION OF THIS GAME!" |
| Continue | LANCE: "WANT ANOTHER SHOT? THE NETWORK ONLY TAKES HALF!" |
| Session end card | LANCE: "THAT'S OUR SHOW! TUNE IN NEXT ROUND!" (or, after a host leaves: ANNC: "WE ARE EXPERIENCING TECHNICAL DIFFICULTIES.") |

### 8.3 Enemy introductions (the first appearance in a run doubles as the tutorial)

| Enemy | Lance line | Hint under the subtitle |
|---|---|---|
| goon | "OUR SECURITY GOONS! UNION-MADE AND UNDERPAID!" | "ONE SHOT EACH. DON'T GET SURROUNDED." |
| clapbot | "THE CLAPBOTS! THEY CLAP! THEY HOP! THEY BITE!" | "FAST AND ERRATIC. KEEP MOVING." |
| popper | "PARTY POPPERS! KEEP YOUR DISTANCE, THEY'RE A BLAST!" | "SHOOT THEM BEFORE THEY GET CLOSE." |
| mime | "LAND MIMES! TRAPPED IN A BOX... OF EXPLOSIVES!" | "SHOOT THEM FROM A DISTANCE." |
| disco | "DISCO NEVER DIED! IT JUST GOT ARMED!" | "THEY BOUNCE. WATCH THE LIGHT BEAMS." |
| heckler | "OUR STUDIO AUDIENCE HAS... OPINIONS! AND TOMATOES!" | "DODGE THE RED RINGS. SPLATS SLOW YOU." |
| tank | "THE DOLLY TANK! SMILE FOR THE CAMERA... FOREVER!" | "MOVE WHEN THE LENS FLASHES." |
| snake | "CABLE SNAKES! WHO LEFT THESE WIRES LYING AROUND?" | "SHOOT THE SEGMENTS OFF." |
| brute | "BRAND MASCOT ALERT! IT'S... THE CEREAL KILLER!" | "SIDESTEP THE CHARGE. STUNNED, IT TAKES DOUBLE DAMAGE." |

### 8.4 Line pools (random without repeats; rate-limited by §5.12)

- **Room start:**
  - "DOORS OPEN IN 3... 2... OH, THEY'RE ALREADY OPEN!"
  - "THIS ROOM BROUGHT TO YOU BY KRUNCH-O: THE CEREAL THAT CRUNCHES BACK!"
  - "MASH 'EM! CASH 'EM! KA-CHING! KA-BOOM!"
  - "DON'T TRY THIS AT HOME, KIDS! TRY IT HERE, FOR MONEY!"
  - "LET'S GET READY TO... MASH!"
  - "OUR LAWYERS SAY THESE DOORS ARE PERFECTLY SAFE!"
  - "THE AUDIENCE AT HOME IS ON THE EDGE OF THEIR COUCHES!"
  - "MEGAMART: WE SELL EVERYTHING. EVEN THIS SHOW!"
- **Room clear:**
  - "ROOM CLEAR! THE JANITORS HATE YOU!"
  - "MAGNIFICENT! THE CONFETTI BUDGET IS BLOWN!"
  - "NOW THAT'S MUST-MASH TV!"
  - "PICK A DOOR, ANY DOOR! THEY'RE ALL TERRIBLE!"
  - "STAY TUNED... AND STAY ALIVE!"
  - "WHAT A PERFORMANCE! SOMEONE GIVE THEM AN AWARD! NOT A REAL ONE!"
- **Hurt:** "OOH! THAT'S GONNA LEAVE A MARK!" · "WALK IT OFF! THE NETWORK DOESN'T PAY FOR BANDAGES!" ·
  "SO CLOSE! I MEAN... HOORAY!"
- **Death:**
  - "MASHED! LET'S SEE THAT AGAIN IN SLOW MOTION!"
  - "DON'T WORRY, FOLKS! OUR CONTESTANTS ARE FULLY INSURED... BY US!"
  - "THEY'LL BE FINE! PROBABLY! RIGHT AFTER THESE MESSAGES!"
  - "AND DOWN GOES {NAME}! THE CROWD GOES MILD!"
- **Multi-kill:** "MULTI-MASH!" · "A TRIPLE! THE SPONSORS LOVE A TRIPLE!" · "TOTAL MASH-ACRE!"
- **Showboat:** "WORK THAT CAMERA!" · "SHOWMANSHIP! OR STUPIDITY! SAME THING!" · "THE CAMERAS LOVE YOU! THE GOONS DON'T!"
- **Prime Time:** "RATINGS ARE THROUGH THE ROOF! SOMEBODY FIX THE ROOF!" · "PRIME TIME, BABY! FIVE TIMES THE CASH!" ·
  "THE SPONSORS ARE WEEPING WITH JOY!"
- **Stunt:** "WE'RE LOSING VIEWERS! PRODUCERS, DO SOMETHING!" · "BORING! RELEASE THE STUNT!" ·
  "THE AUDIENCE IS CHANGING THE CHANNEL! SPICE IT UP!"
- **Key:** "A GOLDEN KEY! COLLECT FIVE AND THE GREEN ROOM COULD BE YOURS!" ·
  "ANOTHER KEY! WHAT DOES IT OPEN? OUR LAWYERS SAY: NOTHING!"
- **Prize:** PENNY: "OOOH! {PRIZE}!" · LANCE: "YOU WON {PRIZE}! IT'S WORTH MONEY! PROBABLY!"
- **Extra life:** "ENCORE! THE CROWD WANTS MORE OF YOU! FOR NOW!"
- **Hurry:** "PICK A DOOR! WE'RE PAYING OVERTIME HERE!"
- **Low HP** (1 HP left): "ONE MORE HIT AND YOU'RE A COMMERCIAL BREAK!"

Keep all text in `src/21-content-script.js` as data, keyed by id, with `{NAME}`, `{PRIZE}` and `{N}` substitutions. No
text is hard-coded in logic.

---

## 9. Presentation: art direction, assets, animation, effects

### 9.1 Art direction

- **The engine's native look is the base:** `res: 'ps1'` with `expand: true`; HD Humanoid rigs at size 1.0–1.6, every
  one dressed; textured TileMap floors and walls; `r.shape` props; canvas lighting on every scene (`enableGPU({ map })`
  as well where WebGPU exists, with the same ambients); particles and `game.hitFx` on every hit; `E.font.title` logos;
  `E.tones` shading on everything drawn by hand.
- **On top of it, a retro-future TV studio:** neon, chrome, marquee bulbs, sponsor logos, confetti, spotlights, a
  jumbotron. Check every screenshot against "a Saturday-morning game show crossed with a PS1 arcade port", never
  against an NES game.
- **Palette** (shade every colour with `E.tones`):

  | Role | Colours |
  |---|---|
  | Shadow | `#140a24`, `#2a1446` |
  | Neon | magenta `#ff2e88`, cyan `#2ee6ff` |
  | Gold | `#ffcc33` |
  | Chrome | `#c8d0e0` |
  | Tally light | red `#ff3344` |
  | Players | P1 `#e8443a`, P2 `#3b82f6`, P3 `#22c55e`, P4 `#f5b700` (the hub's seat colours, also used standalone) |
  | Foe bullets | warm orange `#ff9a3c` and yellow cores, with dark outlines, never in player colours |

- Information never rides on colour alone: players have numbers on their backs and HUD panels, and pickups carry letters.

### 9.2 Sets (one per episode, plus the Green Room)

Each set provides a floor texture function, a wall decorator, a door painter, an ambient and lights, and an **outside
dressing** list. The outside dressing fills the space a wide or tall screen shows beyond the arena walls, in world
coordinates outside 0–368 × 0–240:
- **Bleachers:** E and W, x −130 to −10 and 378 to 498. Stepped boxes with rows of audience sprites.
- **North:** a lighting truss and the jumbotron at (184, −36, z 46), 120 × 64 units.
- **South:** a camera dolly track with two camera cranes at (54, 272) and (314, 272), plus front-row audience.

| Set | Floor | Walls and doors | Props in the arena (keep play space clear) | Outside | Light |
|---|---|---|---|---|---|
| `studio` (Ep1, Lightning Round) | glossy black-purple tiles with magenta and gold inlay; the MASH TV logo painted in the centre (§9.4) | flats in purple velvet with gold trim and neon strips; marquee bulbs chasing along the top edge; shutter doors in gold frames | 4 spotlight stands in the corners; hazard stripes at doors | bleachers, audience, jumbotron, camera cranes, APPLAUSE and ON AIR signs | ambient 0.55; 4 coloured spotlights sweeping slowly; door beacons |
| `warehouse` (Ep2) | sealed concrete with yellow safety lines and pallet scuffs | corrugated metal with MegaMart banners; roll-up loading-dock doors with red and green beacons | stacks of prize crates and gift boxes in the corners (asset store `kenney-holiday` presents, crates); conveyor belts in 2-2 | shelving racks of prizes (fridges, TVs and sofas from the store), a forklift, audience behind a chain-link barrier | ambient 0.6; cold fluorescent strips; amber beacons |
| `rooftop` (Ep3) | dark slate tiles, a red carpet down the middle, a gold "M" helipad ring | glass balustrades with gold posts and velvet ropes; doors are elevator doors with brass frames | champagne towers, potted palms, a searchlight base in two corners | the city skyline glowing at the far edge (teal and amber window lights); searchlights; fireworks bursting in the sky every few seconds | ambient 0.4 (night); warm string lights; fireworks flashes; the searchlight cones |
| `greenroom` | emerald carpet with a gold pattern | wood panelling with framed headshots of Lance | sofas, a fridge, a cake table, TVs (asset store) | — | ambient 0.6; warm lamps |

### 9.3 Characters

| Character | Build | Look |
|---|---|---|
| ROCKET (P1 default) | Humanoid `heroic`, size 1.1, `weapon: 'gun'` | red jumpsuit (outfit `shirt`, pants the same colour), white trim stripes, short hair, black boots and gloves, a white "1" on the back |
| VOLT (P2) | as above | blue jumpsuit, `ponytail`, a goggles band (`hat: 'band'`), silver gloves, "2" |
| MOXIE (P3) | as above | green jumpsuit, `spiky` hair, `cap`, "3" |
| GOLDIE (P4) | as above | yellow jumpsuit, `long` hair, headband, "4" |
| LANCE LUSTRE | `heroic`, size 1.3 | `spiky` silver pompadour, purple sequinned `coat` (gold trim; sparkle glints in draw), black pants, white gloves, a gold microphone drawn at `rig.hand()`. Portrait: an exaggerated grin with a tooth glint. |
| PENNY PRIZE | `heroic`, size 1.2 | `long` pink hair, teal sequinned gown (`outfit: 'robe'`), white gloves, glitter particles |
| Audience | small string sprites, 8 head-and-shoulders variants × `E.recolor` palettes | they bob, cheer (arms up), do the wave, and some hold signs ("MASH!", "KA-CHING!", "HI MOM") |
| Paparazzi | Humanoid `chibi`, size 0.9 | trench coat, cap, a camera drawn at the hands (a flash on firing) |

- **Contestants pick a look in the lobby;** the slot fixes the colour.
- **In hub sessions** the look follows the seat, and the hub's names replace the flavour names.
- **Enemy and boss looks** are in §5.8 and §5.9. Their build:
  - **Humanoid** (outfits and palettes per kind): goon `bulky` 1.0; popper `chibi` 1.0 with a party hat; mime `heroic`
    1.0 with white face paint, a striped shirt and a beret; heckler `chibi` 0.95 with a jersey and foam finger; brute
    `bulky` 1.6 with a giant bear-mascot head and a cereal-box chest emblem.
  - **Blob:** clapbot is a metallic `Blob` with drawn clapper hands and an antenna.
  - **Custom painters** (`r.queue` + `E.px` polys shaded with `E.tones`): the disco ball (faceted sphere, rotating
    glints), the dolly tank (box chassis, scrolling treads, camera-lens turret), the cable snake (striped cable discs and
    a plug head) and every boss.

### 9.4 New art assets to author (list them in `src/06-art-studio.js`, `07-art-chars.js` and `08-sprites.js`)

**Floors** (floorTex functions):
1. Studio gloss tiles.
2. The **logo decal.** Rasterize "MASH TV" with `E.font.title` into an offscreen canvas once, then sample that canvas
   inside the floorTex for the centre 160×60 area.
3. Warehouse concrete with lines.
4. Rooftop slate with the red carpet strip and helipad ring.
5. Green Room carpet.

**Walls and doors:**
6. Wall decorators (`types[id].decorate(face)`): velvet flats with gold trim, corrugated metal with a banner, glass
   balustrade, wood panelling.
7. A door painter for 4 sides × 5 states. Shutter rise animation, beacons, and the exit sign with the destination text
   and icon.
8. Marquee-bulb chase strips (top of the walls, menu frames, the jumbotron border), drawn per frame as dots.

**Studio dressing and props** (shape entries per `docs/ASSETS.md`, checked with `node tools/asset-sheet.mjs`):
9. Camera crane, studio camera on a tripod, spotlight stand, truss segment, jumbotron frame, APPLAUSE sign, ON AIR
   sign, prize pedestal (turning top), prize cage, bleacher block, sponsor billboard, champagne tower, velvet rope
   stanchion, searchlight, a vault safe with locks (3-4), and a forklift.
10. Store props cut into one set with `tools/asset-set.mjs`: presents, crates, barrels, fridge, televisions, sofas,
    cakes, speakers, lamps.

**Characters and bosses:**
11. Contestant, host and co-host rig definitions.
12. Enemy painters and attachments: clapper hands, the popper's party popper, the mime's face paint, the brute's mascot
    head, the tank, the disco ball, the snake.
13. Boss painters: MASHY (body, arms, treads, hatch, eyes), THE WHEEL (8 labelled segments, bulbs, pointer, mount),
    STARMAKER 9000 (podium, hover jets, turrets), THE NETWORK (a 4×3 TV wall and THE EYE).

**Sprites** (string sprites, 8–16 px):
14. Bullets for each weapon and foe kind; the rocket and popcorn bag; kernels; the gold record.
15. Cash ×4, prize boxes ×3, key, capsule (a mini TV with icon slots), flashbulb, 1UP star, statuette, and the 18 prize
    icons (12×12).
16. HUD icons: weapons, hearts and HP pips, lives (mini contestant heads), keys, the room-type icons (sword, $, gun,
    flame, star, skull), the LIVE dot, the MASH 9 bug.
17. **Glyph icons** (§4.4): PlayStation, Xbox, keycaps, mouse.

**Logos and decals:**
18. The MASH TV logo: `E.font.title` "MASH TV" in a magenta→gold gradient with depth, inside a drawn CRT-TV outline
    with bunny-ear antennas and a sparkle. Plus the "LIVE FROM STUDIO 9" sub-line.
19. Decals: tomato splats, scorch marks, confetti on the floor that slowly fades.

### 9.5 Animation (the engine's system as the base, plus new motion where the source needs it)

**Contestants:** gait from velocity (automatic), and `point: true` with the facing on the aim when shooting.
- The slide is a dive roll (`flip` 0→1).
- Showboat cycles `cheer`, `hips` and `wave` with `expr: 'smile'`.
- Hurt flinch (`hurt`), then death (`'die'`, then `down: 1`).
- The respawn drop: a cable line from the top of the screen, a body descending, a land squash (`land: k`).
- Victory `cheer`.
- The walk-in at room start.

**Host and co-host:** talking gestures, cycling `wave`, `hips` and `point` (the mic raised). On the jumbotron
portraits, the mouth moves while text types (the Dialog portrait technique: `rig.drawPortrait`, with `expr` set while
talking).

**Enemies:**
- Goon: baton `E.MOVES.bash` with a 0.3 s wind; a stagger on hit.
- Clapbot: hop squash and stretch (`blob.kick`), with hands clapping on a sine.
- Popper: waddle, then a fuse swell (a scale tween and a red flash).
- Mime: **"trapped in a box"**, a new animation. After `rig.update`, post-process the joints: hands flat at chest and
  head height, sliding along invisible walls on a slow sine (wrap `rig.solvePose()` as `AI_GUIDE.md` describes). The
  telegraph is a frantic shake.
- Heckler: a leap arc, then the throw (`E.MOVES.throw`).
- Brute: the stomp telegraph (`crouch`, then `kick` squash, rings), a charge lean (`sprint`), and a stunned wobble with
  orbiting stars.
- Tank: tread scroll speed from its velocity, turret slew, recoil on firing.
- Snake: segments follow the head's path, with a sine weave.
- Disco: facet glints rotate with its spin.

**Bosses:** Mashy's arms aim and recoil, the treads scroll, the hatch tweens open, the googly eyes jiggle. The Wheel's
spin uses angle easing (`outCubic`) down to the stop, with pointer clicks on each segment boundary. The Starmaker bobs,
its jets flicker, and the mic drop is a rise-and-slam tween. The Network's screens flip channels with a static wipe, and
THE EYE dilates.

**Studio:** audience bob amplitude grows with the ratings (the wave runs in Prime Time). Spotlights sweep. Marquee bulbs
chase. The jumbotron has scanlines. Confetti cannons fire.

**UI:** the logo drops in with `outBounce`. Menu focus has a pulsing bulb frame. Banners slide and bounce, and the
numbers count up. The "TV static" transition is 0.4 s of animated noise via `px.blend` plus a horizontal roll.

**Check** every attack and pose with `node tools/filmstrip.mjs` (`--seed 1`): a wind-up, a strike and a clean settle.

### 9.6 Effects, lighting, feel

- **Every hit:** a hit flash and small sparks. **Every kill:** a confetti `particles.bits` in the enemy palette, a pop,
  a cash pop-up (`particles.text`).
  - Big kills (tank, brute, boss parts): `particles.explosion` + `game.shake(4)` + a `game.flash` for bosses.
- **Hit-stop:** `game.freeze(.03)` on brute, tank and boss-part kills and on contestant hits. **Never in hub sessions**:
  it would freeze the host's world for everyone.
- **Lights:** each set's ambient, plus `game.lights.add` for spotlights, door beacons (red or green), bullet glows
  (emissive), pyro flames, the laser and the jumbotron's glow. The Prime Time strobe follows the comfort setting.
- **Comfort:** every shake, flash and strobe goes through `game.shake` and `game.flash`, which respect reduce motion,
  screen shake and screen flashes.

---

## 10. Audio (everything synthesized in code)

### 10.1 Music (engine notation songs in `src/03-audio-music.js`, all original)

| id | Used for | Tempo and feel | Layers (`audio.layer`) |
|---|---|---|---|
| `theme` | title, Cold Open, episode cards | 132 bpm, a brassy game-show fanfare in C major, swing hi-hats | — |
| `studioBattle` | Ep1 rooms, Lightning Round | 150 bpm driving funk: slap bass on triangle, square lead, drums | `prime` (brass stabs, `on: false`), `intense` (extra drums when 30+ enemies are alive) |
| `warehouseFunk` | Ep2 rooms | 128 bpm disco funk, four-on-the-floor | `prime`, `intense` |
| `finaleOverture` | Ep3 rooms | 160 bpm dramatic minor, saw strings | `prime`, `intense` |
| `bossShowdown` | all bosses | 170 bpm, minor, relentless | `phase2` (brought in by later phases) |
| `commercial` | Commercial Break, sponsor ads, Prize Recap intro | 112 bpm cheesy jingle | — |
| `recap` | Prize Recap, Green Room | 100 bpm lounge (sine Rhodes, brushed drums) | — |
| `ending` | endings and credits | 96 bpm, a warm reprise of the theme | — |

- **Stings** (`audio.sting`): room clear "ta-da", prize fanfare, key chime, Prime Time fanfare, extra life, BANKRUPT
  (descending trombone), Game Over (sad trombone), continue tick, "MASH!" start hit, boss-defeat fanfare.
- A starting motif for the theme (develop it into 16+ bars; the whole score is original):
  - lead: `G4 . C5 . E5 . G5 - - . E5 . G5 . A5 - | G5 - - - E5 - C5 - D5 - - - . . . .`
  - bass: `C3 . C3 . G2 . G2 . A2 . A2 . F2 . G2 .`
  - drums: `k . h . s . h . k k h . s . h o`
- Use `music(song, { fade: .6 })` for crossfades. `audio.duck` comes from the engine during pause; duck the music
  yourself under host lines too (−40 %).

### 10.2 Sound effects (`audio.define` in `src/04-audio-sfx.js`)

| Group | Sounds |
|---|---|
| Weapons | blaster pew, spread triple, rocket launch and boom, popcorn thunk and kernel pops, laser hum (re-triggered every 0.12 s while firing), records whirr, shield hum, sneakers squeak |
| Contestants | slide whoosh, showboat flourish, Showstopper flashbulb pop + boom, hurt buzzer ("wrong answer"), death (descending "wah" + crowd "ooh"), respawn cable zip and land, cash ka-ching, prize fanfare, key chime, power-up rising arp, power-up expire click, extra life |
| Enemies | goon grunt and baton whoosh, clapbot hop and clap, popper fuse hiss and pop, mime beep and pfft, disco shimmer and beam zap, heckler "boo" and tomato splat, tank lens whine and shell boom, snake hiss and segment snap, brute roar, stomp and wall crash, confetti pop on death |
| Studio | door klaxon, door roll-up and slam, beacon tick, conveyor hum and reverse alarm, pyro whoosh, crowd ambience loop, applause, cheer, laugh, ooh, boo, drum roll, wheel click, TV static, channel flip, camera shutter |
| UI | focus move (a soft blip), confirm (a bell), back, page flip, slider tick, typing blips (when no voice), countdown beeps, continue tick |

Use the engine's voice objects (`wave`, `freq`, `to`, `dur`, `arp`, `vib`, filtered `noise`). Give each sound a
distinct contour, so you can tell weapons apart blind.

### 10.3 Babble: Animalese/Simlish voices (`src/05-babble.js`)

A small formant-synthesis voice engine on `game.audio.ctx`, routed through the engine's effects bus.
- **Engine patch P4:** add a getter `game.audio.bus` that returns `_sfxBus` after `_init()`, so the voice follows the
  volume and mute settings.

**`MT.babble.say(text, voiceId, { speed, emotion })`:**
- Schedules syllables from `ctx.currentTime` and returns the line's duration. Headless (no context), it returns the
  duration and does nothing.
- **Syllables:** split the text into words, and each word into syllables at vowel groups (cap 4 per word). Each
  syllable's sounds come from a seeded hash of the word, so the same line always sounds the same.
- **Each syllable:**
  - An onset consonant by class: plosive (a 15 ms band-passed noise burst at 2–4 kHz), fricative (40–70 ms high-passed
    noise), nasal (a 40 ms low sine) or none.
  - A vowel nucleus, 60–120 ms at the voice's speed. The source is a sawtooth or pulse at `f0`, through 2 parallel
    band-pass filters at the vowel's formants (a 800/1200, e 400/2300, i 300/2800, o 450/800, u 325/700; Q 8),
    shifted by the voice's `formant` factor.
  - A gain envelope: 5 ms attack, 30 ms release.
- **Pitch:** `f0 = base × contour`.
  - Words rise toward a `?`, fall at the end of a sentence, and jump +20 % for `!` or ALL-CAPS emphasis.
  - Jitter ±4 % per syllable, plus a vibrato of 5.5 Hz at 2 %.
  - Pauses: 80 ms at a comma, 160 ms at `.`, `!` or `?`, 300 ms at `...`.
- **Voices:**

  | id | base f0 | speed (syll/s) | wave | formant × | character |
  |---|---|---|---|---|---|
  | `lance` | 135 Hz | 13 | saw | 1.0 | fast, swooping, smarmy (big rises on "!") |
  | `penny` | 300 Hz | 12 | pulse | 1.18 | bubbly, with giggle trills (arp at line ends) |
  | `annc` | 85 Hz | 7 | saw | 0.85 | slow and booming, with a feedback-delay echo |
  | `network` | 70 Hz | 8 | square | 0.8 | monotone, a waveshaper bitcrush, robotic |
  | `mashy` | 110 Hz | 9 | triangle | 0.9 | goofy and bouncy |
  | `contestant1–4` | 160–240 Hz | 12 | pulse | 1.05 | short exclamations: "HUP!", "YES!" |
  | `goon` | 95 Hz | 10 | saw | 0.9 | grunts on spawn and hit, at most 2 at once |

- **Subtitles:** the lower third types at a speed tied to the babble duration, so text and voice end together.
- **Crowd** (`MT.babble.crowd(kind, intensity)`):
  - Cheer: 6–10 detuned "woo"/"yay" vowel voices plus noise.
  - Ooh: a falling "oo" chorus.
  - Laugh: "ha" syllables at 5 Hz in a chorus of 4.
  - Applause: band-passed noise claps at a random 8–14 a second for 1.5 s.
  - Boo: low "oo".
  - Ambience: a quiet murmur loop of random soft syllables.

  Intensity scales the voice count and volume.

---

## 11. UI and UX (10-foot, controller-first)

### 11.1 Rules for every screen

- **Readable from 10 feet:** body text uses the 5×7 font at scale 1 on the 320×240-minimum buffer, which is about 31 px
  tall on a 1080p TV. Headings use scale 2–3 or `E.font.title`. Never use `font: 'tiny'` for anything a player must read.
- **At most 6 focusable items per screen**, and no tables wider than 3 columns. Long content is split into pages, turned
  with ←/→ (L1/R1, Q/E). There are no web-style dense data screens.
- **Focus** is obvious: a gold marquee-bulb frame chasing round the focused item, a scale bump, and a blip sound.
- **Every screen has a prompt bar** at the bottom: "✕ SELECT ○ BACK" in the glyphs of the last device (§4.4). Prompts
  update the moment the device changes.
- **Mouse:** hovering moves the focus; a click activates (`input.clicked()` hit-tested against item rectangles); the
  wheel scrolls lists and turns sliders.
- **Keyboard:** arrows/WASD move the focus, Enter or Space selects, Esc or Backspace goes back.
- Keep clear of the engine's corner buttons (`game.cornerArea()`) and the safe areas. Text is never placed over busy art
  without a panel (`E.ui.box`, alpha 0.85).

### 11.2 The UI kit (`src/30-ui-kit.js`)

Canvas widgets drawn in `r.overlay`, with focus handling written once:
- `FocusList(items, { x, y, w, rowH })` and `Button`.
- `Slider(key)`, `Toggle(key)`, `Tabs`, `Pager`.
- `Banner` (with bulb frame and slide-in), `LowerThird`, `Card` (the episode and NEXT cards), `Popup` (floating text).

Input comes from **any** player's input in the front end (`game.players`), plus mouse hover and clicks. All widgets work
headless: they keep their state and draw nothing.

### 11.3 Screens

| Screen | Contents |
|---|---|
| **Title** | Studio backdrop with sweeping spotlights; the logo drops in; "LIVE FROM STUDIO 9"; a pulsing "PRESS ✕ / ENTER"; `E.versionLabel()` and the game version small at the bottom left. After 10 s idle → attract (§12). Touch-only devices get the notice instead (§11.7). |
| **Main menu** (on the title) | START THE SHOW · EPISODES · HOW TO PLAY · TOP EARNERS · OPTIONS · ABOUT & CREDITS |
| **Difficulty** | ROOKIE / CONTESTANT / CHAMPION, each with a one-line description and its HP and lives |
| **Contestant Lobby** ("TONIGHT'S CONTESTANTS") | 4 podiums under spotlights. P1 is in. An empty podium says "PRESS [Options] TO JOIN" (`game.allowJoin({ max: 4, keys: false })`). Each joined player: ←/→ change look (live portrait), ✕ ready, ○ leave (P1's ○ goes back to the menu). When all joined players are ready: "LET'S PLAY!" and a 2 s countdown. |
| **How to Play** (3 pages) | 1) Controls with live glyphs for the current device. 2) The show: rooms, doors, cash, prizes, ratings, keys. 3) Power-ups: icon, name and one line each, 6 per page (so 2 sub-pages). |
| **Episodes** | Episode 1 is always unlocked; 2 and 3 unlock when reached (`E.store`). Picking one starts a REHEARSAL: same rules, no high-score entry. |
| **Top Earners** | `cab.drawTable(r, 'show', y, 'TOP EARNERS')` styled with the logo, on a gold velvet backdrop |
| **Options** | `game.menu('settings')`: the engine's standard settings screen, with our settings added (§11.5) |
| **About & Credits** | Paged, big text: what MASH TV is, then the credits; then pages for **Source Information**, **Testing Feedback**, **Engine Feedback** and **Prompt Feedback** (TASK.md), from `src/about.json` (§16) |
| **Episode card** | A TV title card: "EPISODE 2", "SWEEPS WEEK", and the set's name, with static wipes, the theme sting and a Lance line |
| **NEXT ON MASH TV** (map card) | The episode's 3×3 map as broadcast graphics: room nodes with icons, the visited path lit, the chosen route animating, key icons on key rooms, the current node pulsing. 2.5 s; confirm skips. Pausing in play can also show it (pause item "Episode map"). |
| **Prize Recap** | Penny on a stage with a turntable. Per player, a column with a portrait; prizes appear one by one (icon, name, value, a DING, Penny's joke) and the totals count up; then "EPISODE MVP: {NAME}" for the most cash. Confirm speeds it up; holding skips. |
| **Continue** | `cab.continue(10, done)` over a dimmed arena, styled: "CONTINUE? 9", "−50 % WINNINGS", with any player's prompt |
| **Game Over** | Sad trombone, the contestants lying `down` under one spotlight, Lance's line, then the qualifying initials |
| **Initials** | `cab.enter(score, 'show', done, input)` for each qualifying player in turn, in their colour, with their prompt |
| **Endings A and B, Credits** | Scripted scenes (§8.2), then a credits roll: MASH TV, made with the my-3D2dge engine, original music and sound in code, the model credit, "Inspired by Smash TV (1990)", AI Hub |
| **Session card / end card** | §14.2 |

### 11.4 The in-play HUD (drawn in `r.overlay`, anchored to `r.W` and `r.H`)

- **Top left:** a blinking red "● LIVE" bug and the "MASH 9" channel bug, small.
- **Player panels** in the screen corners: P1 top left (under the bugs), P2 top right, P3 bottom left, P4 bottom right.
  Each is about 96×26 on a dark panel in the player's colour:
  - portrait (`rig.drawPortrait`, 16 px) and name;
  - cash, big ("$123,450");
  - HP pips; lives as mini heads;
  - the weapon icon and its time bar; add-on icons; Showstopper flashbulbs.
  - When out: "OUT — PRESS [Start]".
- **Top centre:** the RATINGS gauge (a needle on a semicircle, "×3", flashing "PRIME TIME"), the keys "★ 4/9", and the
  room name ("1-3 CLAP TRAP"). During bosses, the boss bar sits under it.
- **Bottom centre:** the lower third when someone speaks; otherwise the wave dots (●●●○○) and, after a clear, the
  "PICK A DOOR!" prompt.
- **Banners** (centre, big, bulb-framed): ROOM CLEAR!, PRIME TIME!, YOU WON: …, GOLDEN KEY 3/9, ENCORE!, BANKRUPT!,
  WE'RE LOSING VIEWERS!, MASHED!
- **In the world:** exit signs over open doors; floating "+$500" pop-ups; "STYLE +12"; a P-number arrow over each
  contestant for the first 3 s of a room and after a respawn.
- **Mouse reticle:** drawn at the pointer while the mouse aims (a gold crosshair with the player's colour dot). Hide the
  OS cursor during play with `canvas.style.cursor = 'none'` while the reticle shows; restore it in menus.
- **Tutorial prompts** (§7.1): a small panel above the lower third, glyph + text, 4 s each, once per run.

### 11.5 Pause menu and settings

- The **engine's standard pause menu** shows on every play scene (`pausable: true`). Add
  `menu.items: [['Dev mode', openDev], ['Episode map', openMap], ['How to play', openHowTo]]`.
  - Each item first closes the Shell, which resumes, then opens our overlay. The overlay freezes the simulation itself
    (§13.1).
  - Set `menu.quit = 'title'` (the engine asks first).
- **10-foot CSS:** inject one `<style>` overriding the engine Shell's sizes (it ships 11–14 px text):
  ```css
  .esh{font-size:clamp(18px,2.6vh,34px)!important}
  .esh h2{font-size:clamp(28px,5vh,60px)!important}
  .esh button{font-size:clamp(17px,2.4vh,30px)!important;padding:.55em .9em!important;min-height:2.3em!important}
  .esh-k,.esh-m,.esh-row small,.esh output{font-size:clamp(14px,2vh,24px)!important}
  .esh-mod{width:min(980px,94vw)!important}
  .esh input[type=range]{width:min(360px,32vw)!important;height:2em!important}
  ```
  Theme it with `new E.Game({ … })` and E.Shell's `theme`: ink `#fff7e8`, paper `rgba(20,8,34,.94)`, accent `#ffcc33`,
  danger `#ff4d6d`, line `rgba(255,204,51,.35)`, titleFont `Impact, "Arial Black", system-ui`.
- **Our settings** (`game.settings.define`, group `'Game'`, saved by the engine):

  | key | Label | Type | Default |
  |---|---|---|---|
  | `aimAssist` | Aim assist (controller) | toggle | on |
  | `autoFire` | Auto-fire with the right stick | toggle | on |
  | `camView` | Camera | select Studio (threequarter) / Overhead (topdown) | Studio |
  | `subtitles` | Subtitles | toggle | on |
  | `chatter` | Host chatter | select Normal / Less / Off | Normal |
  | `confetti` | Confetti amount | select Party / Tasteful | Party |

  Button symbols (PlayStation/Xbox) is the engine's `glyphs` setting (patched, §4.4).

### 11.6 Keyboard and mouse feel native

WASD plus mouse aim and a held left click is the PC twin-stick standard. Arrows are the classic keyboard-only shooting.
Space slides, E or right click bombs, Q showboats, Esc pauses. Hover moves the focus everywhere; clicks pick menu items,
lobby looks and map nodes (map nodes are display only). Prompts show keycaps and mouse icons whenever the keyboard or
mouse was used last.

### 11.7 Touch-only devices

- **Detection** (re-checked when input arrives):
  `touchOnly = navigator.maxTouchPoints > 0 && !matchMedia('(any-pointer: fine)').matches && no gamepad connected && no key pressed yet`.
- **No touch controls:** set `input.touchEnabled = false` and `touch: []` on every scene.
- **The title shows** a framed notice, "CONTROLLER OR KEYBOARD REQUIRED", with a big **SETTINGS** button
  (`game.menu('settings')` on tap) and the engine's corner menu button.
- **The attract mode still starts after 10 s**, and a tap returns to the notice.
- **Lifted at once** if a pad connects (`gamepadconnected`) or a key is pressed: the title becomes the normal title.

---

## 12. Attract mode

- **Trigger:** 10 s without input on any front-end screen (title, main menu, how-to, episodes, top earners, about, an
  empty lobby).
  - "Input" means any key, mouse button, mouse movement over 8 px, wheel, touch, gamepad button, or stick past 0.5, on
    **any** device.
  - Detect it with an `MT.anyInput()` helper: DOM listeners plus `navigator.getGamepads()` polling, and headless
    `input.tap` for tests.
  - Our own idle clock drives it, not `E.Arcade.attract()`, which only reads P1's input.
- **Exit:** any input stops the demo at once. Restore the music and go back to the title (`game.go('title')`).
- **What plays:** `scene 'attract'` runs the **real game** with an `AttractDirector`. It plays a list of reels, each a
  room or boss loaded with a seed, **2 bot contestants** (co-op on show) with cheats, a duration, and a caption in the
  lower third:

  | # | Reel | Setup | Caption |
  |---|---|---|---|
  | 1 | Cold Open snippet | jumbotron logo, the Announcer line, Lance waves | "TONIGHT ON MASH TV!" |
  | 2 | 1-1 OPENING NUMBER, 18 s | blaster → spread pickup | "MASH 'EM!" |
  | 3 | 1-2 MIME FIELD, 14 s | rockets; the key is forced at 10 s | "CASH 'EM!" |
  | 4 | MASHY, 16 s | starts in phase 2 with its HP cut | "BOSSES THE SIZE OF A STUDIO!" |
  | 5 | 2-2 CONVEYOR CHAOS, 16 s | popcorn + laser; Prime Time forced (audience throws capsules) | "PRIME TIME = 5× CASH!" |
  | 6 | THE BIG SPIN, 16 s | forced segments JACKPOT then TOMATO TIME | "SPIN THE WHEEL OF MISFORTUNE!" |
  | 7 | 3-6 MASCOT MAYHEM, 16 s | gold records + shield; one bot showboats and one fires a Showstopper | "PLAY TO THE CAMERAS!" |
  | 8 | LANCE LUSTRE LIVE!, 16 s | MIC DROP, then a forced cut to The Network's screens | "NOBODY CANCELS LANCE LUSTRE!" |
  | 9 | Prize Recap snippet, 8 s | fake prize list | "BIG PRIZES!" |
  | 10 | TOP EARNERS, 6 s | the table | — |

  It loops (about 2.5 minutes).
- **Overlay:** the MASH TV bug, "DEMO PLAY", and a pulsing "PRESS ANY BUTTON" in the glyphs of the last device. Music
  plays at a lower volume.
- **Bot cheats:** god mode, infinite Showstoppers, damage ×3, and the reel's weapon. No high scores and no saves.
- **The bot** (`src/40-bot.js`, also used by tests and the dev "bot partner"):
  - A potential field: repelled by enemies (stronger when close and in front), foe bullets (predicted 0.3 s ahead) and
    hazards; attracted to pickups (weighted by value), the room centre, and the chosen exit when the room is clear.
  - It aims at the nearest enemy with target lead and always fires.
  - Slides when a bullet will hit within 0.25 s; Showstoppers when 25 or more enemies are within 120; showboats when 3
    or more enemies are within 60 and it's at full HP.
  - Route choice is set per use (reel, test route, or "first exit").

---

## 13. Dev mode (pause menu → DEV MODE; standalone only, never in hub sessions or the attract mode)

### 13.1 Panel

- A canvas overlay over the right 45 % of the screen, 10-foot sized, on the UI kit. The game keeps drawing behind it.
- **FREEZE** (on by default) stops the simulation while the panel is open. Off, the game runs behind the panel, so
  slider changes show live.
- **Navigation:** L1/R1 or Q/E switch tabs; ↑/↓ select; ←/→ adjust (hold to repeat, `input.repeat`); ✕ toggles or
  activates; △/R resets the selected value; ○/Esc closes.
- **Mouse:** hover selects, clicking a slider's bar sets the value, the wheel adjusts, and clicking a tab switches.
- While open, the play scene sets `pausable = false`, so Esc closes the panel instead of pausing, and the preset hook
  switches inputs to `MASH_MENU`.
- **Persistence:** values are kept in `E.store('mashtv:tuning')`. **RESET ALL TO DEFAULTS** (with a confirm) and a reset
  per row.
- **An orange "DEV" badge** shows in the HUD whenever a tuning differs from its default or a cheat is on, so a run is
  never mistaken for the real balance. High-score entry is disabled while it shows.

### 13.2 Tabs

**TUNING (live sliders, `MT.T`)**

| key | Label | Default | Range / step |
|---|---|---|---|
| `playerSpeed` | Player speed | 95 | 50–160 / 5 |
| `fireRate` | Blaster shots per second | 9 | 3–20 / 1 |
| `bulletSpeed` | Player bullet speed | 330 | 150–600 / 10 |
| `dmgMul` | Player damage × | 1 | 0.25–4 / 0.25 |
| `slideSpeed` | Slide speed | 235 | 120–400 / 5 |
| `slideCooldown` | Slide cooldown (s) | 0.85 | 0.2–3 / 0.05 |
| `invulnTime` | Invulnerability after a hit (s) | 1.2 | 0.2–3 / 0.1 |
| `hpPerLife` | HP per life (0 = the difficulty's) | 0 | 0–9 / 1 |
| `startLives` | Starting lives (0 = the difficulty's) | 0 | 0–9 / 1 |
| `puDuration` | Power-up duration × | 1 | 0.25–3 / 0.25 |
| `enemySpeed` | Enemy speed × | 1 | 0.25–2.5 / 0.05 |
| `enemyHp` | Enemy HP × | 1 | 0.25–4 / 0.25 |
| `enemyBulletSpeed` | Enemy bullet speed × | 1 | 0.25–2.5 / 0.05 |
| `contactDmg` | Contact damage | 1 | 0–3 / 1 |
| `waveSize` | Wave size × | 1 | 0.25–3 / 0.05 |
| `spawnGap` | Spawn gap × | 1 | 0.25–3 / 0.05 |
| `bossHp` | Boss HP × | 1 | 0.1–4 / 0.1 |
| `dropMul` | Drop chance × | 1 | 0–5 / 0.25 |
| `cashMul` | Cash × | 1 | 0.25–5 / 0.25 |
| `ratingsGain` | Ratings gain × | 1 | 0–5 / 0.25 |
| `ratingsDecay` | Ratings decay per second | 2.5 | 0–10 / 0.5 |
| `primeTime` | Prime Time length (s) | 12 | 3–30 / 1 |
| `camZoom` | Camera zoom × | 1 | 0.6–1.6 / 0.05 |
| `shakeMul` | Screen shake × | 1 | 0–2 / 0.1 |
| `timeScale` | Game speed (`game.timeScale`) | 1 | 0.1–3 / 0.05 |

- Page the 25 sliders 6 at a time, in groups: PLAYER, ENEMIES, ECONOMY, SHOW, CAMERA & TIME.
- **CHEATS** (toggles): god mode (all contestants), infinite Showstoppers, one-hit kills, freeze enemies, no clip,
  autopilot P1 (the bot drives P1), bot partner (adds a bot contestant), mute host chatter.
- **ACTIONS:**
  - Kill all enemies; clear the room (jump to EXIT); next room (first exit); restart the room.
  - Give a weapon (choose from the list), give an add-on; +1 life; +1 Showstopper; +$100,000; +1 key.
  - Max ratings; trigger Prime Time; trigger a Ratings Stunt.
  - Frame step: one press advances 1/30 s while frozen.
  - EXPORT TUNING: shows the changed values as one JSON line on screen and logs it to the console, so a balance pass
    can be pasted into `MT.TDEF` as the new defaults.
- **WARP:** every room (1-1 … 3-B), the Green Room, the Lightning Round rooms, and the scenes Cold Open, Episode card
  1/2/3, Prize Recap 1/2/3, Continue, Game Over, Initials, Ending A, Ending B, Credits, and a session card preview (fake
  players, no hub).
- **SPAWN:** an enemy kind × count (1/5/10) × where (N/E/S/W/drop/audience/at the reticle); a pickup kind at P1.
- **DEBUG** (overlays): hitboxes (bodies, bullets, parts, triggers), AI targets and states, the wave timeline (current
  wave, next trigger, alive count), stats (fps, update steps per frame, entities, bullets, particles), door states, and
  the camera bounds.

---

## 14. Multiplayer

### 14.1 Local co-op (the game on its own)

- **Up to 4 contestants share the one fixed arena screen; there's no split screen.**
  - P1 is `game.input`: keyboard+mouse plus the first free pad.
  - P2–P4 join with Options/Start on a free pad, in the lobby or mid-run (`game.allowJoin({ max: 4, keys: false })`).
  - Their slot sets the colour (red, blue, green, yellow), the HUD corner and the back number.
- **Shared:** ratings, keys, route choice (the first player into an exit picks it).
- **Per player:** cash, prizes, lives, HP, weapon, Showstoppers, glyph prompts (each player's own `lastDevice`).
- **Contestants don't collide with each other or hurt each other.**
- **Pause:** any player can pause; the engine shows who.
- **A lost controller** auto-pauses (the engine does this), and a press re-claims the pad.
- **Out of lives:** a player can continue on their own (§5.1). When every player is out, the CONTINUE countdown runs.

### 14.2 AI Hub sessions (Session Protocol v1, `shared-world`)

**Head tags** (exact; inside `<head>`, before the client script):

```html
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1–4">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Grab the most cash, and beat Mashy together">
<meta name="hub:session-howto" content="Move WASD/L-stick · aim+fire mouse/R-stick · slide Space/L2 · bomb E/R1">
```

`vendor/hub/session.js` (`aihub-session 1.4.0`) is inlined **verbatim** as the **first `<script>`** in `<head>`, after
`<meta charset>`, the viewport, the title, the metas and the style. Never edit or minify it: the hub swaps unmodified
copies for newer versions.

**Session flow:**
1. **At load,** `AIHub.active` is true from its first line. Build `new E.Game({ …, corner: false, autoPause: false,
   backGesture: false, fullscreen: 'button', menu: { quit: false } })`, so nothing pauses or navigates away. The hub owns
   fullscreen through the client.
2. **Boot, then the `sessionCard` scene:**
   - `const info = await MT.hub.connect({ mode: 'shared-world', seats: [1, 4], card: true })`.
   - If it's `null`, go on as the standalone game, from the title.
   - Otherwise build the Lightning Round world: authoritative on the host, a mirror on clients.
   - Seat contestants from `info.players`: their names (drawn on the canvas only, never as HTML, clipped to 12 chars,
     unsupported characters shown as `?`), the seat colour, and the seat's look.
   - Then call `AIHub.ready()` once, at once, with no key press.
3. **Our card** (`sessionCard`): a "TONIGHT'S CONTESTANTS" line-up on stage. It shows:
   - The logo; the players in their colours, each with a ✓ when they're in `card.ready`.
   - "HOW TO WIN: GRAB THE MOST CASH — BEAT MASHY TOGETHER".
   - **This player's** controls in their glyphs.
   - The time left (`card.left`, or PAUSED / STARTING), the theme music, and Lance's babble intro.

   Answers:
   - **Ready:** `confirm` (Enter, Space, ✕), a tap or a click on the READY button → `AIHub.answer('ready')`. Also add a
     raw `keydown` listener for `Enter` while the card is up, as a backstop. The harness pokes Enter as a synthetic event.
   - **More time:** △ (`Pad3`), `M`, or a tap on MORE TIME → `AIHub.answer('more')`. Pressed again it takes the request
     back; the label reads "TAKE BACK" while `card.asked`.

   Nothing on the card changes the round. Any randomness on the card uses `AIHub.rng('card')`.
4. **`start`:** a "3 · 2 · 1 · MASH!" countdown from `AIHub.time()` (negative). At `time() >= 0`, the `play` scene
   starts in session mode with room L1's `ENTER`.
5. **During play:**
   - No pausing (`pausable: false` on the session play scene) and no dev mode.
   - Esc or Options (ignored while Create, `Pad8`, is held: Create+Options belongs to the hub) toggles the **session
     overlay**: VOLUME, MUSIC, BUTTON SYMBOLS, CLOSE.
   - The overlay **never pauses**. While it's open the local contestant's intent is zero, and the world runs on.
6. **`time-up`:** the host calls `finish()` at once (§14.4). Clients wait.
7. **`end`:**
   - Every copy stops sending, calls `game.input.clear()` and ignores input from then on, and calls
     `audio.stopMusic(.3)` then `audio.mute(true)`.
   - It shows the end card:
     - `finished`: "THAT'S OUR SHOW!" with the standings.
     - `void` or `host-left`: "WE ARE EXPERIENCING TECHNICAL DIFFICULTIES".
     - `sat-out`: "YOU SAT THIS ONE OUT".
     - `session-ended`: "THANKS FOR WATCHING".
   - The hub removes the game after that.
8. **`leave { id }`:** the host removes that contestant (a "LEFT THE STUDIO" pop-up and a puff of confetti). If no
   players are left, the host finishes.

**Rules in a session:**
- Network only through `AIHub`.
- No `alert`, `confirm`, `prompt` or `window.open`; no navigation; no restart or title; no chat or custom names.
- Storage is the client's isolated empty storage, so settings start at their defaults.

### 14.3 Netcode: who simulates what

| | Host (has a player) | Server (`info.server`, no player) | Client |
|---|---|---|---|
| World: enemies, foe bullets, pickups, boss, waves, doors, hazards, ratings, cash, keys | **authoritative** | **authoritative** | mirror from snapshots |
| Its own contestant | local sim | — | **local sim, authoritative for its own** position, aim, firing, weapon, HP, lives |
| Other contestants | positions from their reports | from reports | interpolated from snapshots |
| Draws | everything | a minimal "STUDIO SERVER" screen | everything |

**Messages** (JSON; every copy sends at most 20 a second, bursts 40; no message over 16 KB):

| Message | Direction | Reliable | Rate | Body |
|---|---|---|---|---|
| `c`: contestant state | client → host | no | 15/s | `{ t:'c', a: AIHub.time()|0, s: [x*10, y*10, aim*1000, flags, wpn, wT*10, hp, lives] }` |
| `ce`: client events | client → host | yes | ≤ 4/s, batched | `{ t:'ce', ev: [['claim', id], ['hurt', dmg, srcKind, srcId], ['died'], ['bomb', x, y], ['boat', gain], ['respawn']] }` |
| `s`: snapshot | host → all | no | 15/s | below |
| `room` | host → all | yes | on change | `{ t:'room', rm, id: 'L2', entry: 'S' }` |
| `over` | host → all | yes | once | `{ t:'over', won, standings, scores, stats }` |

```js
{ t: 's', a: 12345, n: 812,             // host AIHub.time(), snapshot number
  rm: 3, ph: 2, pt: 41, dr: 0b10100110,  // room seq, phase code, phase time ×10, doors (2 bits each)
  R: 637, X: 4, pm: 0, k: 1,             // ratings ×10, multiplier, Prime Time left ×10, team keys
  P: [[id, x, y, aim, flags, wpn, wT, hp, lives, cash, bombs, kills], …],
  E: [[id, kind, x, y, face, state, hpPct], …],   // snake segments are entries of their own
  B: [[id, kind, x, y, vx, vy, z, vz], …],         // foe bullets (z, vz only for lobs)
  K: [[id, kind, x, y, ttl], …],                   // pickups
  G: 0 /* or boss.toNet() */,
  V: [[seq, code, …args], …] }                     // the last ~1 s of events, as a ring
```

- **Quantize** everything to integers. Cap the lists at 160 enemies, 220 bullets and 40 pickups. Keep a snapshot under
  12 KB at the busiest moment; there's a test for it.
- The kind, state, flag, phase and event **code tables** live in `src/50-net.js` only.

**Client rules:**
- **Render delay:** draw others, enemies, pickups and the boss at `AIHub.time() − 120 ms`, interpolated by id between
  the snapshots around that time. Extrapolate at most 100 ms.
- **Foe bullets:** take the newest snapshot and draw at *now*: `p + v·(now − a)`, plus gravity for lobs.
- **Own contestant:** fully local. Snapshots never correct it, except at room changes and respawns, which the client
  performs itself.
- **Own damage:** tested locally against extrapolated bullets, interpolated enemy contact circles, hazards and mime
  blasts. Apply it at once and send `hurt` with the source id; the host deletes that bullet.
- **Pickups:** on touch, hide the pickup and apply weapons and add-ons locally at once, play the sound and pop-up, and
  send `claim`.
  - The host credits cash, prizes and keys to the first valid claim: the pickup still exists, and the claimant's
    reported position is within 40 units.
  - A capsule claimed by two players stays applied for both.
- **Other contestants' bullets** are cosmetic. Spawn them locally from their snapshot flags (firing, aim, weapon) at the
  weapon's rate. They die at walls or on touching an interpolated enemy (a spark).
- **Events:** play each `V` entry once: anything with `seq` above the last one seen gives FX, sound, a host line (by id)
  or a banner.
- **`room`:** rebuild the arena for that room, place your contestant at its slot by the entry door, and play the
  walk-in.
- **HUD numbers** (cash, lives, ratings, keys) come from snapshots. Pop-ups may predict them.

**Host rules:**
- **Remote contestants:** position from the newest `c` (by `a`), eased toward it; aim and flags from the same report.
  The host fires their bullets from (aim, firing, weapon) at the weapon's rate, and credits kills to their id.
- **Enemy AI** targets every contestant at its reported position.
- **Damage to remote contestants:** the host never computes it. It applies their reports:
  - `died`: −$2,500 in the Lightning Round, ratings −25.
  - `hurt`: ratings −12.
  - `bomb`: the Showstopper effect at that position.
  - `boat`: the ratings gain.
- **Exits:** any contestant's position in an exit trigger picks that door.
- **No hit-stop and no time scaling in sessions.**

### 14.4 The round's end and standings

The host calls `AIHub.finish` exactly once:
- **When:** 3 s after Mashy dies, at once on `time-up`, or when every player has left.
- **Before it,** send the reliable `over` message, so every copy shows the same numbers.
- **What it sends:**
  - `standings`: every player still in the round, best first by cash, ties together in one array.
  - `scores`: `{ id: cash }`.
  - `won`: true if Mashy was beaten.
  - `stats`: `{ id: { Kills, Prizes, Deaths } }`.
  - `awards`: `[{ id, title: 'BIGGEST EARNER' | 'MOST MASHES' | 'CROWD FAVORITE', detail }]`, for the most cash, the
    most kills and the most showboat ratings.

### 14.5 Fallback (only if shared-world can't be made to pass)

If, after a real effort, shared-world can't pass the hub harness, switch the tag and `connect` to `ghost`:
- Each copy plays its own seeded Lightning Round and sends its own contestant 10 times a second.
- Rivals are drawn as translucent contestants in the same room.
- Report `progress({ score: cash, label })` every second and `result({ score })` at the end.

Keep the net modules, so this is a configuration change, and say so in the feedback. **Shared-world is the target.**

---

## 15. Architecture

### 15.1 Folder layout (the dev folder)

```
MashTV-SmashTV-<model>-<ts>/
  package.json              scripts: build, test · devDependencies: playwright 1.63.0
  engine/my-3d2dge.js       the handoff's full engine + patches P1–P4 (each marked "// MASH TV PATCH Pn")
  engine/PATCHES.md         what changed and why
  handoff/                  API.md, API-INDEX.md, AI_GUIDE.md, docs/ASSETS.md, tools/, kits/, game/ (reference)
  assets/mash-props.js      store entries we use (cut with tools/asset-set.mjs) + our own shape entries
  vendor/hub/session.js     aihub-session 1.4.0, unmodified (bundled)
  vendor/hub/harness.html, bridge.js, round.js     (tests only, never bundled)
  src/00-core.js … src/90-main.js                  concatenated in name order into one IIFE
  src/about.json            About & Credits content, and the source of exit-interview.json
  tools/build.mjs, test.mjs, fakehub.mjs, browser.mjs, hub-check.mjs, serve.mjs
  tests/*.test.mjs          the suites (§17)
  build/                    generated: game.js, dev.html
  shots/                    screenshots and filmstrips from checks
```

### 15.2 Modules (`src/`; each file is a fragment of one IIFE that `00-core` opens and `90-main` closes)

| File | Responsibility | Main names on `MT` |
|---|---|---|
| `00-core.js` | `const E = My3D2dge`; the `MT` namespace (also `window.MT` for tests); constants (arena geometry, doors); seeded RNG streams `MT.rng.spawn / drops / ai / fx` (`E.rng(seed)`; `fx` is cosmetic only); the tuning registry (`MT.TDEF`, `MT.T`, `tune`, `setTune`, `resetTunes`, persistence); the event bus | `MT.T`, `MT.rng`, `MT.on`, `MT.emit` |
| `01-input.js` | the presets, the preset-sync hook (P1), `intentFrom`, the any-input idle detector, touch-only detection | `MT.intentFrom`, `MT.idle`, `MT.touchOnly` |
| `02-glyphs.js` | glyph icons and prompts (§4.4) | `MT.glyph` |
| `03-audio-music.js` | songs, layers, stings, music director | `MT.music` |
| `04-audio-sfx.js` | sound definitions; `MT.sfx(name)` with per-frame caps (at most 3 of one sound per frame) | `MT.sfx` |
| `05-babble.js` | voices and crowd (§10.3) | `MT.babble` |
| `06-art-studio.js` | sets: floors, wall decorators, door painter, outside dressing, jumbotron, signs, lights | `MT.sets` |
| `07-art-chars.js` | rigs and looks; enemy, boss and audience painters; portraits | `MT.looks`, `MT.paint` |
| `08-sprites.js` | string sprites: bullets, pickups, icons, prize icons, decals | `MT.spr` |
| `10-arena.js` | TileMap per room, doors (states, spawn queues, exits, signs), hazards, camera fit, cell↔world | `MT.Arena` |
| `11-contestant.js` | the Contestant (§5.1) and its controllers (local, remote, bot) | `MT.Contestant` |
| `12-weapons.js` | weapon data, firing, rockets, popcorn, laser, records | `MT.WEAPONS` |
| `13-enemies.js` | enemy archetypes (§5.8), separation, drops | `MT.ENEMIES` |
| `14-pickups.js` | pickups, prizes, claims, magnet, expiry | `MT.PICKUPS` |
| `15-ratings.js` | ratings, multiplier, Prime Time, stunts | `MT.Ratings` |
| `16-waves.js` | the room-script runner (§5.7), scaling, key rules, survive mode, scripted events | `MT.runRoom` |
| `17-bosses.js` | the boss framework and the 3 bosses, `toNet`/`fromNet` | `MT.BOSSES` |
| `18-world.js` | the World: owns everything in a room; `step` (authoritative) or `mirror` (client); the damage pipeline; kill credit; `event()`; the render list | `MT.World` |
| `19-react.js` | the event → line, crowd, sting, banner table; the line queue and lower third | `MT.react`, `MT.lines` |
| `20-content-episodes.js` | episodes, maps, rooms (§7), the Lightning Round, attract reels | `MT.EPISODES`, `MT.ROOMS` |
| `21-content-script.js` | every word of text (§8, How to Play, credits) | `MT.TEXT` |
| `30-ui-kit.js` | widgets (§11.2) | `MT.ui` |
| `31-hud.js` | the in-play HUD (§11.4) | `MT.hud` |
| `32-screens.js` | front-end and between-room scenes (§11.3) | scenes |
| `33-dev.js` | dev mode (§13) | `MT.dev` |
| `34-cutscenes.js` | cold open, boss intros and deaths, robot reveal, endings (`game.script` sequences) | `MT.cut` |
| `40-bot.js` | the bot (§12) | `MT.bot` |
| `41-attract.js` | AttractDirector and reels | `MT.attract` |
| `50-net.js` | the hub adapter (`MT.hub` = `window.AIHub` or an injected fake), codes, snapshots, interpolation, host and client glue, session card and end scenes, finish | `MT.net` |
| `60-play.js` | the `play` scene: run setup, the room state machine (§5.6), overlays, transitions | scene `play` |
| `90-main.js` | `new E.Game` (session-aware options), menu items, settings, CSS, boot steps, scenes, deep links, `game.debug`, `game.start` | — |

### 15.3 Data model and frame order

```js
MT.run = { mode: 'arcade' | 'rehearsal' | 'session' | 'attract' | 'test', diff, seed, ep, roomId, path: [], keys,
           players: [{ slot, name, look, color, cash, lives, prizes: [], kills, deaths, boatGain, continues }],
           devTouched /* a tuning or cheat changed: no high score */ };
// Every drawable entity exposes rs (its render state); draw code reads only rs:
contestant.rs = { x, y, z, face, aim, vx, vy, state, hurt, slideU, pose, flash, alpha, wpn, addons, slot };
enemy.rs      = { kind, x, y, z, face, vx, vy, state, t, hpPct, flash, alpha };
```

**Authoritative step:**
1. Intents.
2. Contestants.
3. Enemies.
4. Boss.
5. Projectiles: player, foe, custom.
6. Collisions: player shots × enemies, parts, crates, locks and mimes; foe shots × local and bot contestants; contact;
   pickups; hazards.
7. Deaths, drops and ratings.
8. Room script, doors and exits.
9. Events: reactions and the net ring.
10. Net send.
11. Rigs (skipped when `MT.cfg.skipRigs`).

**Client step:**
1. Own intent, then own contestant.
2. Apply snapshots; interpolate.
3. Cosmetic bullets.
4. Local hurt checks.
5. Claims.
6. Events.
7. Net send.
8. Rigs.

**Draw:**
1. Floor (`map.drawFloor`).
2. Decals.
3. The outside dressing.
4. Walls and doors (`map.queueWalls` + the door painter).
5. Props.
6. Actors: contestants, enemies, boss, pickups and bullets, all through the queue.
7. Lights.
8. Overlays: HUD, banners, panels.

### 15.4 Scenes, deep links and the debug handle

**Scenes:** `title` (it also shows the touch notice), `difficulty`, `lobby`, `howto`, `episodes`, `scores`, `about`,
`attract`, `play`, `recap`, `gameover`, `initials`, `ending`, `credits`, `sessionCard`, `sessionEnd`.

**Deep links** (`location.hash`, read at boot; for checks and screenshots):
- Front end: `#title`, `#lobby`, `#howto`, `#scores`, `#about`, `#attract`.
- Rooms: `#room=2-3`, `#boss=1|2|3`, `#greenroom`, `#lightning`.
- Scenes: `#recap=2`, `#continue`, `#gameover`, `#initials`, `#ending=a|b`, `#credits`.
- Tools: `#dev` (room 1-1 with the panel open), `#card` (a session-card preview with fake players).
- Options, appended with `&`: `seed=N`, `players=N`, `bot=1`.

```js
game.debug = {
  snapshot() { return { scene, mode, ep, room, phase, wave, alive, byKind, bullets, pickups, R, X, keys,
    players: [{ slot, x, y, hp, lives, cash, wpn, state }], boss: boss && { kind, phase, parts }, errors: game.errors.length }; },
  warp(target, opts), spawn(kind, n, where), give(kind, slot = 0), cheat(name, on), tune(key, v), resetTunes(),
  bot(slot, opts), addBot(look), killAll(), clearRoom(), chooseExit(dir), teleport(slot, x, y),
  netFake(hub) /* inject a fake AIHub before connect */, seed(n), stateHash() };
game.stateHash = () => game.debug.stateHash();   // E.session replays stop at the first frame that differs
```

### 15.5 Engine patches (each marked in the source and listed in `engine/PATCHES.md`; they feed the Engine Feedback)

| # | Patch | Why |
|---|---|---|
| P1 | `E.HOOKS = HOOKS;` just after `HOOKS` is declared | The game must switch every player's input preset each step, before the Shell reads navigation: arrows aim in play and navigate in menus. |
| P2 | The standard `glyphs` setting defaults to `'playstation'`, offers PlayStation or Xbox, and its `apply` sets `glyphs` on every `game.players` input | TASK.md wants PlayStation glyphs by default with an Xbox option. The stock default is `'auto'`, and only P1 is updated. |
| P3 | `E.Arcade.enter(score, mode, done, input)` reads the given input (default `game.input`); `continue()` takes a press from any `game.players` input | In co-op each player enters their own initials, and anyone may continue. |
| P4 | `get bus() { this._init(); return this._sfxBus; }` on the audio object | Babble voices must pass through the effects bus to obey volume and mute. |

Patch only what the game can't do itself: CSS overrides and our own UI need no patch. If the build needs another patch,
add it to this table with its reason.

### 15.6 Coding rules

- World units and `dt` everywhere. Pixels only when drawing.
- Gameplay randomness only from `MT.rng.*`. `Math.random` only for cosmetics.
- Logic never reads rig joints. Draw code reads only `rs`.
- Gameplay emits events. Sound, text, crowd and banners come from the reaction table.
- All text lives in `21-content-script.js`; every tunable lives in `MT.TDEF`.
- Draw only with engine primitives: no `ctx.arc`, `fillText` or gradients on the game buffer.
- No `alert`, `confirm`, `prompt` or `window.open`. Network only through `MT.hub`.
- Headless-safe: guard every DOM and audio access (`game.headless`, `game.audio.ctx`).

### 15.7 Building out the rest of the game later (the designer workflow)

The demo is a vertical slice. More content should take **data, not code**. Make these true, and test them:
- **A new room** is one entry in `MT.ROOMS`: its waves, places, items, key rule and hazards, in the §5.7 format.
  `#room=<id>` and dev WARP load it at once; RESTART ROOM reloads it after an edit; the `room-sweep` suite picks it up
  automatically.
- **A new episode** is one entry in `MT.EPISODES`: a 3×3 map, 6 rooms and a boss id, a set id, a song id, a stunt kind,
  a prize table and an intro line. The episode select, the map card, the recap and the sweeps read it with no code
  changes.
- **A new enemy or weapon** is one registry entry (`MT.ENEMIES`, `MT.WEAPONS`) with its data and behaviour functions.
  Spawn and give lists in dev mode read the registries, so a new entry shows there at once.
- **A new line, prize or sponsor** is text in `MT.TEXT`, or a row in a prize table.
- **Balance** is the dev sliders plus EXPORT TUNING, pasted into `MT.TDEF`.
- **A new boss** reuses the framework's part, phase and pattern helpers (§5.9). It needs only its painter, `toNet` and
  `fromNet`.

---

## 16. Build and packaging

`npm run build` (`node tools/build.mjs`):
1. **Concatenate** `src/*.js` in name order into `build/game.js`: one IIFE, opened in `00-core` and closed in
   `90-main`. Inline `src/about.json` as `MT.ABOUT`, and stamp `MT.BUILD` with the ISO time.
2. **Check:** `node --check build/game.js`.
3. **Dev page:** write `build/dev.html`, which loads `../engine/my-3d2dge.js`, `../assets/mash-props.js` and `game.js`
   as separate scripts, for fast iteration.
4. **The deliverable:** write `../MashTV-SmashTV-<model>-<ts>.html`.
   - `<head>`, in this order:
     1. `<meta charset="utf-8">`
     2. viewport
     3. `<title>MASH TV</title>`
     4. the hub meta tags (§14.2)
     5. `<style>`: the page, plus the 10-foot Shell CSS (§11.5)
     6. **session.js verbatim, as the first `<script>`**
   - `<body>`, in this order:
     1. The boot splash markup (copy the template's `e3-boot` block, titled MASH TV).
     2. `<canvas id="screen">`.
     3. Then three `<script>`s: the engine, the asset set, the game.
5. **The exit interview:** write `../exit-interview.json` from `src/about.json` (§20). Check it with `JSON.parse` and a
   check against the shape in TASK.md.

- **Set the name once.** The model id and timestamp go in one constant in `tools/build.mjs`:
  `OUT = 'MashTV-SmashTV-<model>-<ts>'`, from your TASK.md.
- **No network:** the deliverable must open from `file://` and make no network requests. `tools/check.mjs` lists any
  external URLs.
- **Size:** about 1.3 MB of engine plus the game. No minifying is needed. Never minify `session.js`.

---

## 17. Testing

### 17.1 The one command

`npm test` runs `node tools/test.mjs [--only suiteA,suiteB] [--no-browser]`.
- It rebuilds first, runs every suite, and prints only failing checks (`suite › check: detail`) plus one line, like
  `MASH TV tests: 412 passed, 0 failed (2m 41s)`. It exits with 1 on any failure.
- **Headless suites:**
  - Each loads the engine and `build/game.js` into a fresh `vm` context, with stand-ins for `window`,
    `addEventListener`, `location.hash`, `matchMedia` and `navigator`, the way `kits/test.mjs` does.
  - They drive the game with `game.advance`, `input.tap/hold/press/feed` and `game.debug`.
  - `MT.cfg.skipRigs = true` keeps them fast. The animation checks are the exception.
- **Browser suites** use Playwright's Chromium: it's already in `~/.cache/ms-playwright` on this machine; otherwise run
  `npx playwright install chromium`.
- **While iterating,** run only the suites you touched. At every milestone and at the end, run everything.

### 17.2 Suites: what each checks

| Suite | Checks |
|---|---|
| `core` | Tuning: defaults, set, reset, persistence. RNG streams are deterministic. The event bus. Arena geometry: door cells, interior bounds, cell↔world. |
| `input` | **Presets:** in play, ArrowUp fires up; paused, ArrowDown moves the Shell's focus; resumed, ArrowUp fires again. **Intent:** the pad stick aims and fires; the mouse aims at `mouseGround`; arrows give 8 ways; R2 fires along the last aim; aim assist is pad-only. **Glyphs:** `lastDevice = gamepad` → ✕/L2/R1 icons, `xbox` → A/LT/RB; keyboard → Space/E/Q; mouse → Left click. |
| `contestant` | Speed and walls. Slide distance, i-frames and cooldown. A hit costs 1 HP with invulnerability and knockback. Death → a life lost → the cable drop with invulnerability and at least 1 bomb. Out of lives → Start continues at half cash. The showboat formula, and its cancel on a hit. A Showstopper clears foe bullets, damages everything and uses stock. A drop-in adds a contestant. |
| `weapons` | For each weapon and add-on: the pickup equips it; fire rate within ±5 %; damage; the spread's angles; the rocket splash; the popcorn lands and throws kernels; the laser pierces 3 goons in a line; records orbit, damage and block bullets; the shield blocks damage; sneakers give ×1.45; expiry goes back to the blaster; the same primary refreshes. |
| `economy` | Cash × multiplier goes to the collector. Prizes don't repeat. Keys are shared. Drop caps. Expiry and blinking. The magnet after a clear. Crates break and drop. Extra lives at the thresholds. |
| `ratings` | Gains, decay and losses; the tiers; **Prime Time** at 100 (12 s at ×5, 3 thrown capsules, back to 60, the cooldown); the **stunt** after 10 s under 5, once per room. |
| `enemies` | For each kind (+ King, crate, lock): spawns from its door, the audience or a drop, and enters the interior; behaves as §5.8 says (one assert per behaviour: the goon closes in, the popper's 8 shards, the mime's telegraph then blast, the disco bounce and pattern, the big disco's split, the heckler's range and lob ring, the tank's telegraph then shell, snake segments shot off, the brute's charge then wall stun and ×2 damage); dies; drops; emits its confetti event; **every attack's wind-up is ≥ 0.3 s** before damage. |
| `rooms` | The wave triggers (`at`, `left`, both) on a synthetic room. Scaling by players, difficulty and slider. Door timings. CLEAR ignores mimes, crates and locks. The clear bonus and par. Only listed exits open. An exit loads the right room with the opposite entry. HURRY UP after 25 s. Each key rule (`mimes`, `survive`, `crate`, `carrier`, `vault`, `final`) yields exactly one key. |
| `room-sweep` | **Every room:** 18 wave rooms, 3 bosses, the Green Room, and the 4 Lightning rooms. Warp in; 2 god-mode bots play to CLEAR within 240 s of game time; no errors; the waves spawned match the data; every listed kind appeared. |
| `bosses` | For each boss: intro, then the phases in order at their HP thresholds. Armor (Mashy's body tinks while an arm lives). Weak points take ×2. Every pattern fires at least once (every wheel segment via forced stops). Commercial Break: Lance is gone, then returns. The robot reveal leads to The Network, and THE EYE unlocks after 8 TVs. Death gives the reward shower, then the recap. |
| `playthrough` | **The whole game, scripted.** 2 god-mode bots (damage ×3 for speed) take the left path in each episode: 1-1→1-2→1-4→1-5→1-B, 2-1→2-2→2-4→2-5→2-B, 3-1→3-2→3-4→3-5→3-B. Then keys ≥ 5, the Green Room, the statuette, Ending B, initials typed through input, Top Earners showing them, and back to the title. Asserts:<br>• Every enemy kind killed; every weapon and add-on picked up and used; both hazards met.<br>• Prime Time at least once; a Showstopper and a showboat used.<br>• 3 recaps with prizes; the robot reveal ran; scenes in order; 0 errors.<br>Then a **second run:** bots without cheats on ROOKIE in 1-1 until every life is gone → CONTINUE → let it run out → Game Over → initials. |
| `ui` | Each title-menu item opens its screen and goes back. The lobby: join with `game.addPlayer({ pad: 1 })`, change looks, ready. Difficulty is applied. How to Play turns pages. Episodes lock and unlock. About has all four required sections, with no empty values. Mouse hover moves the focus and a click activates (`input.feed`). Every prompt bar uses the last device's glyphs. The pause menu has Dev mode, Episode map and How to play. |
| `dev` | It opens from the pause item. FREEZE stops world time. Each slider changes `MT.T` and works live (`playerSpeed` ×2 doubles the distance in 1 s; `enemyHp` changes new goons). Per-row reset and RESET ALL restore defaults. Cheats work: god, one-hit, freeze, noclip. Every warp target loads. Spawning spawns. The DEV badge shows and blocks the high-score table. It can't be reached in sessions or the attract mode. |
| `attract` | 10 s idle on the title → `attract`. All 10 reels play in order. The bots never die. Any input (a key, a mouse move over 8 px, a fake gamepad button, a touch) returns to the title within one step. Input resets the idle clock. It runs with the touch-only flag set. |
| `touch` | Touch-only: the notice shows; SETTINGS opens settings; no touch buttons are registered; the attract mode runs; a key press or a gamepad connecting lifts the notice. |
| `audio` | Headless: music, sound and babble calls never throw. `babble.say` durations scale with the text. Every scene sets a song. Every reaction id resolves to a real line or sound. |
| `net` | A loopback through `tools/fakehub.mjs`: N `vm` contexts with an AIHub-compatible fake. It has a shared clock driven by the test loop, latency 150 ± 50 ms, 5 % loss, a limiter at 20/s with bursts of 40, a 16 KB cap, and reliable-ordered versus unreliable delivery.<br>It runs host+bot with 2 clients+bots, then server + 2 clients. Asserts:<br>• connect and ready with no input; the card's answers (confirm → `ready`, △ → `more`); the countdown, then play at `time() >= 0`.<br>• Traffic both ways, at ≤ 20 msg/s, with max size ≤ 12 KB.<br>• Clients' enemy counts within 10 % of the host's, and 90 % of matched positions within 24 units.<br>• Client bots earn cash; a claim resolves once; a client's `hurt` shows in the host's snapshot.<br>• Room changes reach every copy within 1 s.<br>• Mashy's death → `finish` once, with valid standings and `won: true`; time-up finishes within 1 s.<br>• `leave` removes the contestant; server mode runs and sends.<br>• The **session overlay opened on the host doesn't stop snapshots**.<br>• `end` stops input and audio.<br>• `alert/confirm/prompt/open/WebSocket/RTCPeerConnection/fetch` are stubbed to fail the test. |
| `hub` (browser) | `tools/hub-check.mjs`. Copy the deliverable and `vendor/hub/{harness.html,bridge.js,round.js}` into a serve directory **inside the dev folder**, and serve it on `127.0.0.1:0`, keeping its PID. Check that the page served is MASH TV. Then run the harness 4 times:<br>• `?game=<file>&players=2&auto=1`<br>• `&players=4&latency=150&jitter=50&loss=5&auto=1`<br>• the same with `&scenario=host-leave`<br>• `&players=2&scenario=server&auto=1`<br>Wait for `document.body.dataset.complete === 'true'`, require `window.__hubCheck.pass`, and print any failed checks. Kill the server by PID. |
| `browser` | Playwright on the deliverable over `file://`: no console or page errors, no external requests. Every deep link draws a real frame, with pixel variance above a threshold: `#title`, `#lobby`, `#room=1-1`, `#room=2-2`, `#room=3-2`, `#boss=1..3`, `#greenroom`, `#recap=1`, `#ending=b`, `#about`, `#dev`, `#card`. `tools/check.mjs` passes at 1280×720 and 1920×1080. Touch emulation (`390x844@3`) shows the notice. Keyboard focus and Enter go from the title to the lobby. Screenshots go to `shots/`. |
| `proof` | Determinism: seed 7, room 1-1, 2 bots for 30 s → the same `stateHash` twice. |

### 17.3 What only eyes and ears can judge

These need screenshots or listening; scripts can't judge them:
- **Look at `shots/`:** the look target for every set (§9.1); text readable at 1080p (try the screenshot at 25 % size);
  the HUD clear of the corner buttons; boss silhouettes readable; confetti never hiding bullets.
- **Act on every look note** from `tools/check.mjs`.
- **Filmstrips** (`node tools/filmstrip.mjs <page>#room=1-1 --steps "…" --seed 1`) for every attack, pose and boss
  telegraph: a wind-up, a strike and a settle, with no jerks.
- **Listen once** in a real browser to each song, the voices and each group of sounds.

---

## 18. Build order and milestones

Each milestone ends with a playable build and its tests green. Build the riskiest systems early, the netcode especially.

| # | Milestone | Deliverables | Gate (must pass) |
|---|---|---|---|
| M0 | **Setup** | dev folder; engine and hub fetched; `package.json`; `build.mjs` producing the single HTML; `test.mjs` runner; patches P1–P4 and `PATCHES.md`; a bare title scene | `core`; the browser smoke (it loads with no errors) |
| M1 | **Core arena loop** | 23×15 arena with doors and camera fit; the contestant (every input path, blaster, slide, HP, lives, respawn); goon; bullet pools; the damage pipeline; kill FX; basic HUD; presets and the hook; glyph prompts | `input`, `contestant` (partial), `weapons` (blaster). A person can play 1-1's first waves. |
| M2 | **Netcode prototype** (de-risk) | the World's authoritative and mirror modes; the render-state contract; FakeHub; snapshots; interpolation; client prediction; claims and hurts; room messages. Goons only, one room. | `net` core: traffic, rates, sizes, convergence, kill credit |
| M3 | **Room flow + Episode 1** | the wave runner; door spawns, exits and signs; the phase machine; map and episode cards; ratings with Prime Time and stunts; pickups and economy; all weapons and add-ons; clapbot, popper, mime, crates, key rules; rooms 1-1 to 1-6; local co-op join | `rooms`, `weapons`, `economy`, `ratings`, `room-sweep` (Ep1) |
| M4 | **Bosses + end of run** | the boss framework and Mashy; Prize Recap; continue; game over; initials; Top Earners (E.Arcade + P3) | `bosses` (Mashy), an Ep1 bot playthrough, the end flow in `ui` |
| M5 | **Episodes 2 and 3** | disco, heckler (+King), tank, snake, brute; conveyors and pyro; rooms 2-x and 3-x; the Wheel; Starmaker → Network; Green Room; both endings; the cold open and every cutscene | `enemies`, `bosses`, `room-sweep` (all), `playthrough` |
| M6 | **AI Hub** | the session-aware game; tags; the client as the first script; the card; the Lightning Round; the session overlay; finish, standings and awards; leave, end, host-left and server | `net` (full), `hub` (all 4 harness runs PASS) |
| M7 | **Presentation** | sets and outside dressing; dressed characters; final enemy and boss painters; animations (mime box, brute stun…); lights per set (+GPU); effects; logo; final HUD; banners; jumbotron and lower thirds | `browser`; screenshots reviewed against §9; filmstrips; look notes clean |
| M8 | **Audio** | songs and layers; sounds; Babble voices; crowd; the full reaction table | `audio`; one listening pass |
| M9 | **Front end and UX** | every screen in §11.3; UI kit polish; 10-foot CSS; settings; touch-only; the attract mode with all reels; the full dev mode | `ui`, `dev`, `attract`, `touch` |
| M10 | **Balance, polish, ship** | tuning with the dev sliders to the targets below; the About & Credits content; the exit interview; final `npm test` all green; the deliverable and `exit-interview.json` in the root; the chat reply | everything |

**Balance targets for M10** (use the bot without cheats as a stand-in player, then play it yourself):
- Rooms: one bot on CONTESTANT clears each Episode 1 room in 50–90 s, with at most 2 deaths per room.
- A full run lasts 20–25 minutes. A session round with 2 bots lasts about 5 minutes.
- Prime Time comes at least once per episode.
- No foe bullet is faster than 130 u/s, and no attack lands with less than a 0.3 s telegraph.
- The busiest snapshot (room 3-5, wave 5, 4 players) stays under 12 KB.

---

## 19. Risks and how to de-risk them

| Risk | Why it's risky | De-risk |
|---|---|---|
| Shared-world netcode | The most complex part, and the hub's check is strict (latency, loss, host leaving, a server copy). | The M2 prototype before the content; a strict authority split; compact snapshots; the rate budget; run the real harness as soon as M6 starts; the ghost fallback documented (§14.5). |
| The engine's pause in sessions | A paused engine skips `update`, so the host's world would freeze for everyone. | In sessions: no pausable scenes, no auto-pause, a non-pausing overlay; the `net` test opens it on the host. |
| Arrows aim, but menus need them | The stock presets put arrows on the moves; the Shell navigates by the `up`/`down` actions. | Two presets and the P1 hook; the `input` suite. |
| The font has no PlayStation symbols | ✕ ○ □ △ aren't in the 5×7 font. | The glyph icon module (§4.4), tested through action → icon. |
| Hordes of HD rigs | Cost per frame, and test speed. | `skipRigs` in tests; draw goon and clapbot crowds with `r.actor(…, { every: 2, key, outline: false })`. Performance is out of scope, but the game must stay playable. |
| Three multi-phase bosses | Many patterns and states. | One framework; patterns as coroutines; forced phases and segments in dev and tests; one test per boss. |
| Engine Shell screens at 10 feet | The stock CSS uses 11–14 px text. | The CSS override (§11.5) and 1080p screenshots. |
| The harness pokes keys with `code` = the key (e.g. `'a'`) | Unknown codes are ignored, and Enter must still answer Ready. | Handle Enter through both the action and a raw keydown backstop on the card. |
| Determinism | Random draws in the simulation. | Seeded `MT.rng`; `Math.random` for cosmetics only; the `proof` suite. |
| Scope | 18 rooms, 3 bosses, 9 enemies. | Rooms are data; enemies and bosses reuse spawners (the wheel's segments call the enemy spawners); every milestone keeps a playable build. |
| A full `/tmp` on this machine | During planning, the tmpfs at `/tmp` was 100 % full. | Keep clones, caches and serve directories inside the dev folder. |
| False touch-only detection | Laptops with touch screens. | Require *no* fine pointer *and* no key or pad input yet; lift the notice on the first key or pad. |

---

## 20. Finish checklist

- [ ] Everything in §4–§14 is built. `grep -rniE "todo|tbd|fixme|placeholder|lorem|coming soon" src/` finds nothing.
- [ ] `npm test` is all green, including `hub` (4/4 harness PASS) and `browser`.
- [ ] `MashTV-SmashTV-<model>-<ts>.html` is in the root folder and opens from `file://`. `session.js` is its first
      script and is unmodified.
- [ ] **About & Credits** in the game, generated from `src/about.json`, has real values:
  - **Source Information:**
    - Date: from your TASK.md.
    - Source: "Smash TV (Williams Electronics arcade game, 1990)".
    - Plan: "PLAN.md".
    - Genre and Perspective: "Twin-stick arena shooter; fixed three-quarter overhead (top-down option)".
    - Tech: the engine version and patches, the hub client version, the Node and Playwright versions you used.
    - Art Direction, Animation, Audio.
    - Online: "AI Hub Session Protocol v1, shared-world, 1–4 players; local co-op 1–4".
    - Testing, Research, Environment, Model, Usage.
    - Write "unknown" for anything you can't confirm.
  - Then your answers to the Testing, Engine and Prompt Feedback questions.
- [ ] `exit-interview.json` sits beside the HTML, generated from the same `about.json`. It parses as JSON and has
      exactly the shape TASK.md gives. Suggested `aiHub` values:
  - `name`: "MASH TV"
  - `tagline`: "Mash 'em! Cash 'em! Survive the show."
  - `description`: one or two sentences, e.g. "A 1–4 player twin-stick arena shooter inside the deadliest game show on
    TV: blast through studio rooms of goons and robots, grab cash and absurd prizes, keep the ratings up and survive to
    the Season Finale."
  - `type`: "Game"
  - `genre`: "Shooter"
  - `source`: "Smash TV"
  - `series`: ""
  - `players`: "1–4"
  - `controls`: "WASD/left stick move · mouse/right stick aim & fire · Space/L2 slide · E/R1 Showstopper · Q/L1 Showboat"
  - `tags`: ["arcade", "co-op", "top-down", "pixel art", "comedy", "boss fights"]
- [ ] The chat reply has the Source Information, Testing Feedback, Engine Feedback and Prompt Feedback, with the same
      content as the About screen.
- [ ] Every process you started has been stopped, by PID.

---

## Appendix A. Research behind this plan

- **Engine** (my-3D2dge handoff v0.85.2, commit `4390a98`):
  - Read `README.md`, `API.md` (whole), and the `AI_GUIDE.md` sections listed in §1, including the Twin-stick recipe.
  - Read the `API-INDEX.md` sections on input, audio, standard features, the Shell and the arcade module, and the
    template `game/`.
  - Verified in the engine source: the input presets and arrow handling, the Shell's navigation and pause gating
    (`_step` returns while paused), the pause-on-menu behaviour, player joining (`allowJoin`, `addPlayer`), the audio
    buses, the glyph setting, and the arcade module's input use.
  - Searched the asset store for studio and prize props (televisions, presents, sofas, fridges, cakes, speakers, lamps,
    crates).
- **AI Hub** (`lib/hub`): read `README.md` (the protocol), `retrofit.md`, the harness's automatic checks and timings
  (`harness.html`, `round.js`: hello 10 s, countdown 3 s, grace 5 s), the bridge's card and answer handling, the
  client's wrappers (storage, fullscreen, seeding), and the shared-world example `examples/arena.html`.
- **Smash TV:** written from general knowledge; no web research. Every name, character, line, level, enemy, boss,
  prize and piece of music in this plan is original.
