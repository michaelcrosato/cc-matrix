# Olympiyikes!

**Tagline:** *Faster. Higher. Yikes.*
**One line:** the complete Summer *and* Winter Games, held in the same fortnight in one twin-city host, played as
an over-the-top arcade multi-event: 12 events, 8 nations, ceremonies, a rival, two hyperventilating commentators,
1–4 players on the couch and AI Hub ghost heats online.

> **How the title was picked (TASK.md rule):** 50 riffs on "Olympic Games" were brainstormed silently, then
> `secrets.randbelow(50)` (Python, OS CSPRNG) returned **16 → "Olympiyikes!"**. Do not re-roll it. Its file-name
> form is `Olympiyikes`; the SOURCE token is `OlympicGames`.

---

## 0. Read this first (ground rules for the builders)

- **Inputs:** `TASK.md` (requirements) + this plan. If they disagree, TASK.md wins. Where this plan is silent, follow
  the engine's own docs (`API.md`, `AI_GUIDE.md`) and the plan's spirit. Everything listed here ships: **no TODOs,
  placeholders, locked "coming soon" slots or stubbed features.**
- **Names (with this TASK.md):** dev folder `Olympiyikes-OlympicGames-claude-opus-5-5-max-20261103-174837/`, deliverable
  `Olympiyikes-OlympicGames-claude-opus-5-5-max-20261103-174837.html` in the root (beside TASK.md), and
  `exit-interview.json` in the root. If your TASK.md's name pattern carries a different model/date, use your pattern
  with `Olympiyikes` and `OlympicGames`.
- **Shared machine:** read only the files you need (other agents share the parent directories, ports and processes).
  Prefer `file://` and the engine's headless tools. If you need a server (the AI Hub harness does), run
  `python3 -m http.server 0 --bind 127.0.0.1` from your dev folder, read the port it prints, and confirm the served page
  is *your* game before trusting a result. Stop only processes you started, by PID. Never `pkill`, `killall`,
  `fuser -k`. During planning `/tmp` was 100% full: if npm/Playwright fail with ENOSPC, set `TMPDIR=<dev>/.tmp`.
- **Engine:** my-3D2dge handoff package, **v0.85.2** at planning time
  (`https://github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff`). We own our copy and may change it (§4.6).
- **Online:** AI Hub Session Protocol v1, client **1.4.0** (`https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub`).
- **No subagents/workflows to debate, review, judge or audit** (TASK.md). Tests are scripts.
- **Units used in this plan:** world units (u) are the engine's (one tile = 16 u, z is up). Distances shown to the
  player are meters; each event says its scale (default **M = 12 u per meter**). Times in seconds unless marked ms.
  The engine runs fixed steps of 1/120 s.

### 0.1 Fetch what you build on (once, inside the dev folder)

```sh
D=Olympiyikes-OlympicGames-claude-opus-5-5-max-20261103-174837 && mkdir -p $D/{engine,src,tests,tools,vendor/hub,.tmp} && cd $D
git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/my-3d2dge.git vendor/my-3d2dge
git -C vendor/my-3d2dge sparse-checkout set dist/handoff
cp vendor/my-3d2dge/dist/handoff/my-3d2dge.js engine/my-3d2dge.js          # our engine copy (we edit this one)
for f in session.js harness.html bridge.js round.js README.md; do
  curl -fsSL -o vendor/hub/$f https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/$f; done
(cd vendor/my-3d2dge/dist/handoff && export TMPDIR="$(cd ../../../.. && pwd)/.tmp" && npm install && npx playwright install chromium)
```

Read whole: `vendor/my-3d2dge/dist/handoff/API.md`, `README.md`, `kits/README.md`, `docs/ASSETS.md`,
`vendor/hub/README.md`. Read as references (copy patterns, not whole files): `kits/sports.js` (hockey), `kits/road.js`
(downhill/bobsled), `kits/rhythm.js` (figure skating), `kits/pinball.js` + `modules/physics.js` (curling),
`kits/kart.js` (drawing a rig through a custom view), `modules/arcade.js` (record tables, initials), `game/test.mjs`
and `kits/test.mjs` (headless harness). Grep `API-INDEX.md` for names; don't read it whole.

---

## 1. The game

### 1.1 Pitch

For the first time in history the Summer and Winter Games share one fortnight and one host: **Mount Glory–Sunny Bay**,
where a ski jump towers over the beach and the swimming pool shares a wall with the ice rink. Eight fictional nations
send their stars. You pick a nation and its athlete, light the cauldron, and chase gold across **12 events** that
alternate summer and winter, while defending champion **Max Overdrive of Turbonia** insists, loudly, that it is all
pointless because he will win. Everything is broadcast like the real thing (parade of nations, "Up Close & Personal"
profiles, photo finishes, medal ceremonies with anthems, a medal table) and played like an arcade cabinet (mashing,
timing, aiming, steering, rhythm, physics; a HYPE meter that sets you on fire; world records that explode into
fireworks). When it goes wrong, it goes *gloriously* wrong: false starts, belly flops, ski-jump tumbles, bobsleds on
their roof. That's an **OLYMPIYIKES!**, and the game celebrates it.

### 1.2 Pillars

1. **Ten seconds to learn, a lifetime to perfect.** Each event teaches one verb (mash, time, aim, steer, keep the beat,
   sweep) on one card, and has a perfect-play ceiling with world records to chase.
2. **Broadcast spectacle.** Ceremonies, commentators, crowd, jumbotron, slow-mo, photo finishes, anthems, records.
3. **Failure is a show.** Every event has at least one comic "Yikes" moment that is funny, fast to recover from, and
   even pays a little hype (§5.8).
4. **Both seasons.** 6 summer + 6 winter events on alternating days; each venue has its own look, light and music.
5. **Couch first, online too.** 1–4 local players in every mode; AI Hub ghost heats when the hub launches the game.

### 1.3 Genre and perspective (decisions)

- **Genre:** arcade multi-event sports (Track & Field / Winter Games lineage) with a short campaign, local party
  play and online ghost heats. Each event is a compact mini-game built on one shared event framework.
- **Perspective:** per event, all on the engine's native 2D views (pixel art at `res: 'ps1'`, `expand: true`):
  - **2.5D side-on lanes** (`'brawler'` view, pitch 25): 100m Dash, Javelin, 50m Freestyle, Weightlifting.
  - **Pure side view** (`'side'`): 10m Diving, Ski Jump, the archer's inset.
  - **Target close-up overlay:** Archery's main view.
  - **Pseudo-3D behind the athlete** (the `road` module, `E.Road`): Downhill, Bobsled.
  - **Three-quarter** (`'threequarter'`): Figure Skating, Ice Hockey.
  - Ceremonies, podiums and the title use `'brawler'` in their venue.
  - **Top-down** (`'topdown'`): Curling.
  Rationale: each event gets the camera its classic arcade ancestors used, and the engine has a native, tested view
  for every one of them.

### 1.4 Core loop

Pick nation → (ceremony) → **day card** (who, where, a human-interest segment) → **event card** (one screen: goal and
controls with button glyphs) → **compete** (live vs CPU rivals and friends) → **results** (records, qualifying) →
**medal ceremony** → **medal table** (story beat) → next day. 12 days, then the closing ceremony and an ending that
depends on your nation's rank.

### 1.5 Modes (main menu, in this order)

| Item | What it is |
|---|---|
| CONTINUE GAMES | only when an autosave exists: resumes The Games at the next day |
| THE GAMES | the campaign: opening ceremony, 12 days (all 12 events), story beats, halftime report, closing ceremony, ending; or, chosen on its setup screen, **Quick Games**: 4 events (playlists *Track & Pool*, *Snow & Ice*, *Greatest Hits*, *Random 4*) with mini ceremonies and party points. 1–4 players |
| SINGLE EVENT | any of the 12 events, vs CPU or practice (no rivals); 1–4 players |
| RECORDS | world records and top-5 tables per event (initials), the Laurel cabinet, the Medal cabinet |
| HOW TO PLAY | Basics (mash, timing, hype & turbo, yikes) + every event's card |
| SETTINGS | the engine's settings screen plus the game's own (§2.5) |
| ABOUT & CREDITS | Source Information, Testing/Engine/Prompt Feedback, credits, engine changes, controls |

Online play is not a menu item: it starts only when the AI Hub launches the page (§12.2).

---

## 2. Controls and input (controller-first, keyboard and mouse native)

### 2.1 The action map (custom preset `OLY_KEYS`, replaces the engine presets for the whole game)

| Action | Meaning | DualSense (default glyphs) | Xbox glyphs (setting) | Keyboard | Mouse |
|---|---|---|---|---|---|
| `up/down/left/right` | move, steer, aim, balance, menu focus | left stick, d-pad | left stick, d-pad | WASD, arrows | — |
| `mashL` | "left": left foot/arm, push, pass, tuck (diving), in-turn | □ and L1 | X and LB | **J** | — |
| `mashR` | "right": right foot/arm, push, check, pike (diving), out-turn | ○ and R1 | B and RB | **K** | — |
| `action` | jump, throw, release, start, take-off, shoot | ✕ | A | **Space** | Left button (aim events only) |
| `turbo` | fire the YIKES TURBO when the hype flame is full | △ | Y | **Shift** | — |
| `alt` | hold: tuck, breathe, hold breath, skate burst | R2 (and L2) | RT (and LT) | **L** | Right button (aim events only) |
| `pause` | pause menu | Options | Menu | Esc, P | — |
| `confirm` | menus: choose | ✕ | A | Enter, Space | click |
| `cancel` | menus: back | ○ | B | Esc, Backspace | — |

Rules:
- **`confirm`/`cancel` deliberately do not include J or K** (the engine's DEFAULT preset has them): a sprinter mashing J/K
  must never skip a results screen. Every screen entered after play has a **0.6 s input lockout** and calls
  `input.consumeAll()` on enter.
- **Mash = alternate `mashL` and `mashR`.** PC players mash J/K with the right hand; pad players rock □/○ with a thumb
  or alternate L1/R1 with index fingers (both pairs are bound). Mash assist (§2.5) offers one-button and hold modes.
- **Mouse:** menus everywhere (hover moves the focus, click picks; `E.Menu` does this, our widgets copy it). In-world
  only where the genre uses it: Archery (pointer aims, hold left to draw/release to shoot, hold right to hold breath),
  Curling (pointer aims the broom target, left button = `action`), Hockey (left: hold/release shoot toward the
  cursor, right: pass toward the cursor), plus clicking flags on Nation Select and tiles on Single Event. Those event
  scenes set their own `input` preset that adds `Mouse0`/`Mouse2`; other scenes leave the mouse unbound in play.
- **Pause and the hub:** in an AI Hub session, "Create + Options" belongs to the hub: while pad button 8 (Create) is
  held, suppress `pause` *before* the engine reads it (needs the exported input hook, §4.6 change 1).
- Two players on one keyboard: the engine's `game.allowJoin` splits it (P1 WASD + F G H R T Y, P2 arrows + `.` `/` `,`
  and numpad); our actions map onto the halves in preset order (`mashL, mashR, action, turbo, alt`). Prompts follow
  automatically because every prompt comes from `input.label(action)`.

### 2.2 Per-event use of the actions

| Event | stick / WASD | mashL □ J | mashR ○ K | action ✕ Space | turbo △ Shift | alt R2 L | mouse |
|---|---|---|---|---|---|---|---|
| 100m Dash | — | left foot | right foot | react at the gun; dip at the line | turbo | — | — |
| Javelin | — | run | run | hold: angle rises; release: throw | turbo | — | — |
| 50m Freestyle | — | left arm (on the beat) | right arm (on the beat) | start dive, flip turn, touch | turbo | breathe | — |
| 10m Diving | tap ←/→: half twist | hold: tuck | hold: pike | take-off timing | turbo | — | — |
| Archery | aim | — | — | hold: draw; release: shoot | turbo | hold: hold breath | pointer aims, L draw, R breath |
| Weightlifting | ←/→ balance | lift | lift | jerk timing | turbo | — | — |
| Ski Jump | ↑/↓ balance, body angle | — | — | push off, take-off, telemark | turbo | — | — |
| Downhill | steer | — | — | pre-jump | turbo | hold: tuck | — |
| Bobsled | steer | push | push | jump in (load) | turbo | — | — |
| Figure Skating | ← ↓ ↑ → notes | — | — | hold/release jump notes | turbo | — | — |
| Curling | aim | in-turn; sweep | out-turn; sweep | start slide; release | turbo | — | pointer aims, L = action |
| Ice Hockey | skate | pass | check / switch skater | hold: charge, release: shoot | ON FIRE | skate burst | L shoot at cursor, R pass at cursor |

### 2.3 Button prompts and glyphs (a must-build: the pixel font has no ✕ ○ □ △)

`input.label(action)` already returns the right *text* for the player's last device and bindings ('J', 'Space',
'Left click', '✕', 'A'...), and the engine's `glyphs` setting picks the controller family. But the engine's 5×7 pixel
font has no ✕ ○ □ △ (they render as `?`). Build **`O.Prompt`** (src/02-prompts.js):

- `O.Prompt.draw(g, x, y, action, { input = player's input, size: 1|2, label: 'RUN', align })` resolves the code
  for that player's `lastDevice` from `input.map`/`input.bindings`, then draws an **icon**, never plain text:
  - PlayStation face buttons: a 9×9 (size 1) / 17×17 (size 2) dark disc with a light rim and the symbol drawn in pixels
    in its traditional color (✕ blue `#7fb2ff`, ○ red `#ff6b6b`, □ pink `#ff8fd8`, △ green `#4fe0a8`).
  - Xbox face buttons: disc with the letter (A green `#5bc236`, B red `#e8443a`, X blue `#3a7cf0`, Y yellow `#f2c21b`).
  - Shoulders/triggers: rounded tab "L1/R1/L2/R2" or "LB/RB/LT/RT"; Options/Menu: small pill; sticks: a ring with an
    arrow; d-pad: a cross with the pressed arm lit.
  - Keyboard: a keycap (rounded rect, 1 px darker bottom edge) with the key's label; Space and Shift are wide caps.
  - Mouse: a mouse outline with the left/right half filled.
  - A pair prompt for mashing (`O.Prompt.pair(g, x, y, 'mashL', 'mashR')`) alternates highlight at the player's
    current mash rhythm (teaches the alternation).
- Prompts follow the **last input used, per player** (`input.lastDevice`); in multiplayer each lane/turn shows its
  own player's glyphs.
- **Default glyph family for controllers: PlayStation.** On first boot, if `game.settings.glyphs` is `'auto'` (never
  chosen) set it to `'playstation'` (engine change 4). The Settings → Game screen has **Controller prompts:
  PlayStation / Xbox** (key `promptStyle`) whose `apply` calls `game.settings.set('glyphs', v)`.
- Also add pixel glyphs for ✕ ○ □ △ to the engine's 5×7 and 3×5 fonts (engine change 3) so any stray label text
  still reads correctly.

### 2.4 Menus

Stick/d-pad/WASD/arrows move the focus (with `input.repeat`); ✕/Enter/Space/click choose; ○/Esc/Backspace go back;
L1/R1 or Q/E switch tabs (also clickable); hovering with the mouse moves the focus. Every screen shows its prompt strip
at the bottom (`✕ Select  ○ Back`) with glyph icons.

### 2.5 The game's settings (Settings → Game group, via `new E.Game({ menu: { settings: [...] } })`)

| Key | Label | Options (default **bold**) |
|---|---|---|
| `difficulty` | Difficulty | Easy / **Normal** / Hard (CPU skill offset −0.12 / 0 / +0.06; timing windows ×1.25 / 1 / 0.85; qualifying standards per event) |
| `promptStyle` | Controller prompts | **PlayStation** / Xbox |
| `mashAssist` | Mash assist | **Off** / One button (any mash button counts as an alternation) / Hold (holding either = steady 72% pace) |
| `timingAssist` | Timing assist | **Off** / On (all timing windows ×1.4) |
| `commentary` | Commentary | **Voices + subtitles** / Subtitles only / Off |
| `textSize` | Text size | **Large** / Huge (×1.5 for subtitles, cards and HUD labels) |
| `hints` | Hints | **On** / Off (contextual tips, e.g. "Alternate □ and ○!") |
| `voices` | Voices volume (Sound group) | slider 0–1, **0.8** (engine change 6) |
| `crowd` | Crowd volume (Sound group) | slider 0–1, **0.7** |

The engine's own Display/Sound/Comfort/Controller/Touch settings, rebinding and full screen stay as they are
(TASK.md: don't rebuild standard features).

---

## 3. UI and UX (10-foot)

### 3.1 Rules

- **Base resolution** `res: 'ps1'` with `expand: true` (a 16:9 TV shows ~427×240 game pixels, scaled ×4.5 at 1080p).
  Primary text uses `E.font` at **scale 2** (≈63 px tall on a 1080p TV), secondary at scale 1 (≈31 px); never the
  `tiny` font for anything a player must read. Titles use `E.font.title` scale 4–5.
- **At most 7 items per list; at most 8 rows per table** (8 nations / 8 lanes). No scrolling tables, no web-style
  dense screens; long content is paged (L1/R1, ←/→ or clickable page dots).
- **Focus is loud:** the focused item has a gold bar, a ▸ cursor, a 1 px glow and a gentle scale pulse; a `select`
  blip on move, `confirm` on choose.
- **TV-safe margins:** keep HUD and text ≥ 12 game px from every edge; keep the top-right clear of
  `game.cornerArea()` (the engine's menu/full-screen buttons).
- **Anchoring:** every HUD element anchors to `r.W`/`r.H`; wide screens show more venue (more stands, more slope).
- **Information never in color alone:** players are P1–P4 tags plus color (`E.PLAYER_COLORS`), medals carry 1/2/3.
- **The engine's HTML screens** (pause, settings, controls) must be TV-readable: inject a stylesheet (no engine change)
  after the engine creates its shell, e.g. `.esh{font-size:clamp(16px,1.55vw,30px)} .esh button{font-size:1.15em;min-height:2.9em;padding:.7em 1em}
  .esh h2{font-size:2.2em} .esh-mod{width:min(820px,94vw)} .esh input[type=range]{width:min(320px,30vw);height:2.2em}`
  and theme it gold-on-navy via `E.Shell` theme variables (`accent: '#f2b632'`, `paper: 'rgba(12,16,40,.92)'`).
  Check with a 1920×1080 screenshot.

### 3.2 Screens (all pixel art unless marked HTML)

| # | Screen | Layout essentials |
|---|---|---|
| 1 | Boot (engine) | `boot: { title: 'OLYMPIYIKES!', steps: [...], messages: ['Inflating the blimp', 'Waxing the skis', 'Teaching the crowd to wave', 'Calming the mascot'] }` |
| 2 | Title | stadium at sunset (summer half) beside a floodlit ski jump (winter half), cauldron burning, blimp, the 8 athletes warming up in a row, logo `OLYMPIYIKES!` (E.font.title scale 5, gold→orange, red outline, depth 3), emblem, tagline, pulsing "PRESS ✕" (glyph by device), engine version tiny bottom-right. Idle 10 s → attract |
| 3 | Main menu | left: big list (§1.5); right: a live vignette for the focused item (parade / pictogram wheel / trophy / the mascot); bottom: description + prompt strip |
| 4 | Touch-only notice | replaces "PRESS ✕": panel **"CONTROLLER OR KEYBOARD REQUIRED"**, one line "Connect a controller or keyboard to play.", a big **SETTINGS** button (tap → `game.menu('settings')`). Attract still runs |
| 5 | Games setup | rows: Length (Full 12 / Quick 4 + playlist), Difficulty, Qualifying (On for 1P / Off), START |
| 6 | Nation select + join | 4×2 grid of big flags (48×32) with codes; each player's cursor in its color with a P-tag; right panel: the focused nation's athlete (live rig cheering), name, 3 specialty pictograms, one-line bio; "P2–P4: press ✕ on another controller, or 2 on the keyboard" |
| 7 | Opening ceremony | cinematic (§7.4), hold ✕ for 1 s to skip |
| 8 | Day card ("broadcast bumper") | `DAY 3 · 50m FREESTYLE` / venue / weather; lower third: **UP CLOSE & PERSONAL** with a big portrait and 2–3 subtitle lines; optional rival line |
| 9 | Event card | pictogram + name; GOAL line; 3–4 rows of glyph icon(s) + verb; Qualifying standard, World record; prompts `✕ Start  ○ Back` (+ `△ Practice` in Single Event) |
| 10 | Event HUD | per event (§6); common: top-left event + pictogram, top-right clock/score (big digits), bottom: per-player prompt strip and the hype flame |
| 11 | Turn card | "P2 — YOUR TURN" in player color / "ROUND 2 OF 3" + top-4 standings |
| 12 | Results | ≤ 8 rows: rank, medal icon, flag, athlete, performance, notes (WR, GR, PB, Q, DNF, DQ); humans' rows in player color; records burst; `✕ Continue` |
| 13 | Initials entry | `E.Arcade` letter wheel when a human makes a top-5 table (skipped in hub) |
| 14 | Medal ceremony | podium in the venue, medals, three flags rising, the winner's procedural anthem, fireworks |
| 15 | Medal table | 8 nation rows (flag, code, G S B, total), yours highlighted; a ticker of the day's highlights |
| 16 | Story beat | day-card layout with one or two portraits (halftime report, incidents, rival) |
| 17 | Torch lost / Games over | "YIKES! NO QUALIFYING MARK — TORCHES ●●○" → retry; at 0: "GAMES OVER — CONTINUE? 9" |
| 18 | Closing + ending + credits | cinematic, ending text by rank, credits roll (paged, skippable) |
| 19 | Single Event select | 4×3 grid of event tiles (pictogram, name, season color, your best medal); bottom: description |
| 20 | Records | tabs per event (←/→ or L1/R1): top-5 rows; tabs LAURELS (12 tiles) and CABINET (nation × event medals as icons) |
| 21 | How to play | Basics pages + list of 12 event cards (read-only) |
| 22 | Settings / Controls / Pause | engine HTML (scaled, themed) |
| 23 | About & Credits | paged: Source Information · Testing Feedback · Engine Feedback · Prompt Feedback · Credits & engine changes · Controls |
| 24 | Dev panel | pixel overlay (§13) |
| 25 | Hub card / hub splash | §12.2 |

Transitions: `game.go(scene, data, { fade: 'wipe' })` between menu screens, `'iris'` into events, `'white'` into
ceremonies (reduce-motion turns them into plain fades by itself).

### 3.3 Touch-only devices

`touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches
&& navigator.maxTouchPoints > 0` **and** no key press or gamepad has been seen this visit. While true: show screen 4,
hide engine touch buttons (scenes declare `touch: []`; set the engine's `touch` setting to `'off'` at boot),
let the attract mode run after 10 s; a tap during attract returns to the notice. A `gamepadconnected` event or any key
press flips `touchOnly` to false at once and shows the normal title.

---

## 4. Architecture

### 4.1 Tech stack

- **Engine:** our copy of the my-3D2dge v0.85.2 full engine (`engine/my-3d2dge.js`: the core plus every module; we use
  the `road`, `rhythm`, `physics`, `arcade` and `songs` modules from it). Plain JavaScript, no libraries, no CDN, no
  network at runtime.
- **Online:** AI Hub `session.js` 1.4.0, unmodified, first script in `<head>`.
- **Tooling:** Node (headless tests via `vm`, as `game/test.mjs` does), Playwright 1.63.0 + Chromium (browser checks,
  hub harness, screenshots), the handoff's `tools/check.mjs` and `tools/filmstrip.mjs`.
- **Deliverable:** one self-contained HTML (engine + session client + game inlined), ~1.8 MB, works from `file://`.

### 4.2 Folder layout

```
Olympiyikes-OlympicGames-claude-opus-5-5-max-20261103-174837/
  index.html                 dev page: same <head> as the bundle; loads engine + src files in order (the list is the bundle's source of truth)
  engine/my-3d2dge.js        the engine + our changes, each marked  // OLY: <why>
  vendor/hub/                session.js (bundled, unmodified) + harness.html, bridge.js, round.js, README.md (tests only)
  vendor/my-3d2dge/          sparse clone of the handoff: docs, kits, tools (reference + Playwright); never bundled
  src/                       the game: one IIFE per file, all attach to window.OLY (alias O)
  tests/                     run.mjs (the one command) + suites
  tools/bundle.mjs           builds the root HTML from index.html's script list
  tools/shots.mjs            screenshot/filmstrip helper around the handoff tools
```

### 4.3 Source files (load order = bundle order)

| File | Responsibility |
|---|---|
| `00-core.js` | creates `window.OLY`, defines `OLY_KEYS` and `GAME_SETTINGS`, then the `E.Game` (§4.4), constants (`M`, palettes), `O.def(kind, id, spec)` registries, `O.bus` (on/emit), `O.store` (E.store wrappers), `O.rng(label)` streams (§4.7), formatting helpers |
| `01-input.js` | per-scene presets (archery/curling/hockey add mouse), **pilots** (§5.2), `Mash` meter, `O.AutoPlayer` (bot intents → real `input.tap/hold`), idle/any-input tracker, touch-only detection, hub Create+Options guard |
| `02-prompts.js` | `O.Prompt` glyph renderer (§2.3) |
| `03-ui.js` | 10-foot widgets: `Menu10` (vertical list), `Grid10` (tile grid), `Tabs`, `Panel`, `Banner` (big stamped words), `Ticker`, `LowerThird`, `Toast`, page dots, number/time formatters; mouse hover/click via `input.pointer()`/`clicked()` |
| `04-audio.js` | SFX definitions (`audio.define`), songs (§9), `O.Voice` gibberish synth, `O.CrowdAudio`, `O.Anthem` generator, stings |
| `05-art.js` | palettes per venue, flag painter, pictograms, emblem, equipment sprites, stands + crowd painter, jumbotron (dot matrix), podium, fireworks/confetti helpers, mascot (Blob) |
| `06-pose.js` | `O.Pose` library and `O.Gear` (equipment drawn at joints), body rotation (§8.2) |
| `07-athletes.js` | `NATIONS` data (§7.1), teammates, `O.makeRig(nation, sport, opts)` outfits per sport, voice params |
| `08-commentary.js` | `O.Comms`: commentators, line banks (§7.6), cue rules, subtitles + voice + portraits |
| `09-hype.js` | `O.Hype` (meter, turbo), `O.Yikes` (stamp, count, sympathy hype), `O.Crowd` (visual excitement), slow-mo/photo helpers |
| `10-records.js` | world records seed table, games records, personal bests, top-5 tables via `E.Arcade`, points formulas, medal table, party points, laurels, cabinet |
| `11-ghosts.js` | ghost recording/playback (local turns + hub), compact samples |
| `12-eventkit.js` | the event contract, `O.defEvent`, the phase runner, formats (race / attempts / match / program), CPU simulation, results assembly, qualifying, timing widgets (`TimingBar`, `Ring`, `Balance`, `Sway`, `StrokeBeat`) |
| `20-ev-sprint.js` … `35-ev-hockey.js` | one file per event (§6), ids: `sprint javelin swim diving archery weights skijump downhill bobsled figure curling hockey` |
| `40-sc-title.js` | title, main menu, touch-only notice, attract director (§11) |
| `41-sc-games.js` | games setup, nation select/join, opening ceremony, day card, story beats, event card, turn card, results, initials, medal ceremony, medal table, torch/continue, closing + ending + credits |
| `42-sc-misc.js` | single event select, records, how to play, about & credits, pose lab |
| `43-dev.js` | dev panel, tuning sliders, cheats, overlays (§13) |
| `44-hub.js` | AI Hub session flow (§12.2) |
| `99-main.js` | registers scenes, deep links (`#ev/<id>`, `#scene/<name>`, `#attract`, `#poselab`, `#games/day/<n>`), `game.debug`, `window.__oly` for tests, `game.start({ scenes, scene, boot })` |

Each file: `(() => { 'use strict'; const E = My3D2dge, O = OLY; ... })();`. Tests load exactly the same files in the same
order into a `vm` context (read the list from `index.html` so it can't drift).

### 4.4 The game object

```js
const game = O.game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'brawler', input: OLY_KEYS,
  id: 'olympiyikes', bg: '#0b0f24',
  menu: { items: inHub ? [] : [['Restart event', () => O.restartEvent()], ['How to play', () => O.showEventCard()], ['Dev mode', () => O.Dev.open()]],
          settings: GAME_SETTINGS /* §2.5 */, quit: inHub ? false : 'title',
          controls: { mashL: 'Left (mash, pass, tuck)', mashR: 'Right (mash, check, pike)', action: 'Action (jump, throw, release)',
                      turbo: 'Yikes Turbo', alt: 'Hold (tuck, breathe, steady)' } } });
```
`inHub = !!(window.AIHub && AIHub.active)` (true from the client's first line). `OLY_KEYS` and `GAME_SETTINGS` are defined
in `00-core.js` above this call (the later files only add to them); the menu callbacks are arrows because their targets
are defined in later files. Menu items are static, so each item's
function is context-aware: outside an event "Restart event" and "How to play" show `game.note('Not in an event')`.

### 4.5 Scenes

`O.scene(name, def)` registers a wrapped engine scene. The wrapper: calls `input.consumeAll()` on enter; applies the
0.6 s lockout (`def.lock`); if the dev panel is open, runs `O.Dev.update()` instead of `def.update` and draws the panel
after `def.draw`; draws global overlays (toasts, commentary lower third, attract banner, "YIKES" stamps, laurel toasts)
after the scene; tracks idle time on menu scenes (`def.menu: true`) for the attract mode; routes `back()`.

Scenes: `title`, `menu`, `touchonly` (a state of `title`), `attract`, `gamesSetup`, `nations`, `opening`, `dayCard`,
`beat`, `eventCard`, `turnCard` (overlay state inside events), `ev:<id>` ×12, `results`, `initials`, `podium`,
`medals`, `torch`, `closing`, `credits`, `single`, `records`, `howto`, `about`, `poselab`, `hubCard`, `hubSplash`.

`O.flow` is the state machine above them: it holds the current **meet** (§4.8) and decides the next scene after each
one ends (`O.flow.next(from, payload)`), for each mode (games, quick, single, hub, attract).

### 4.6 Engine changes (all marked `// OLY:` in `engine/my-3d2dge.js`; list them on the About screen)

1. **Export the hooks:** `E.HOOKS = HOOKS;` so the game can run code at the start of every step even while paused
   (`HOOKS.input`): hub Create+Options guard, global any-input detection.
2. **Cosmetic randomness off `Math.random`:** the Humanoid (`this.t` start phase, blink timer), `Particles` and
   `hitFx`'s number jitter draw from a module-level `const cosmetic = rng(0xC05E7)` instead of `Math.random`. Then
   cosmetics never shift gameplay randomness, the hub card draws no `Math.random` numbers, and tests stay
   deterministic.
3. **Font glyphs:** add ✕ ○ □ △ to the 5×7 (`G57`) and 3×5 (`GLYPHS`) tables.
4. **PlayStation by default:** the `glyphs` setting's default becomes `'playstation'`.
5. **Pose hook on the Humanoid:** at the end of `solvePose()`, if `this.post` is a function call `this.post(this, this.J)`;
   then, if `this.bodyPitch || this.bodyRoll`, rotate every joint (and cape/hair points, as `_roll` does) about
   `this.pivot` (default: hip centre) by pitch (forward–up plane) and roll (right–up plane), **without** `_roll`'s
   floor lift. This is what flips, dives, swims, tumbles and V-style flight need (§8.2).
6. **Voice bus:** `ChipAudio` gets a `_voiceBus` gain under the master, a `voiceVolume` field honored by
   `applyVolume()`, and the settings get `voices` (Sound group, default .8). `O.Voice` connects to it.

### 4.7 Randomness and determinism

- **Gameplay randomness only through labeled streams:** `O.rng(label)` returns a `[0,1)` generator. In a hub session
  it is `AIHub.rng(label)` (identical on every copy); otherwise `E.rng(hash(meet.seed + '|' + label))`. Labels are
  namespaced: `'sprint:gun'`, `'javelin:wind:r2'`, `'cpu:FRM:skijump:j1'`, `'judges:diving:SUN:d3'`.
- Cosmetics (particles, blinks, crowd bob) never touch `Math.random` (engine change 2) or the gameplay streams.
- `meet.seed` comes from the clock when a meet starts; tests and the dev panel can set it.
- Every event sim is a function of (state, intents, streams), independent of drawing, so a sim can run headless,
  twice, and hash the same (the kits' "proof" idea).

### 4.8 Data model

```
Nation   { id: 'SUN', name: 'SUNVALE', colors: { a, b, c }, flag: { kind, ... }, athlete: { name, rig, bio, voice },
           team: [3 names], skills: { sprint: .92, ... }, anthem: { seed, key, bpm } }
Athlete  { id, nation, name, rig, gear, pilot, lane, human, player (0-3 | null), hype, turboT, state: {}, attempts: [],
           best, notes: [], ghost }
Pilot    { kind: 'human' | 'bot' | 'ghost' | 'net', input?, skill, cheat?: 'perfect' | null }
Intent   { L, R, A, T (pressed this step), Lh, Rh, Ad, Au, X (held / released), mv: [x, y], aim: [x, y] | null }
Meet     { mode, seed, events: [ids], day, players: [{ input, nation, color }], difficulty, qualifying, torches,
           medals: { SUN: { g, s, b } }, party: { P1: pts }, results: { eventId: Results }, beats: Set, yikes: { SUN: n } }
Results  { event, rows: [{ athlete, perf, display, rank, medal, notes, points }], records: [], laurels: [] }
Store    'oly:records' (top-5 per event + WR), 'oly:laurels', 'oly:cabinet', 'oly:games' (autosave),
         'oly:ghost:<event>' (best local run), 'oly:seen' (first-time tips), 'oly:tune' (only if the dev opts in)
```

### 4.9 Bundle

`node tools/bundle.mjs` reads `index.html`'s `<script src>` list and writes the root HTML:

```html
<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>/* vendor/hub/session.js, byte-for-byte */</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Olympiyikes! — Faster. Higher. Yikes.</title>
<meta name="description" content="Twelve over-the-top Summer and Winter events in one wild fortnight, for 1–4 players.">
<meta name="theme-color" content="#f2b632"><link rel="icon" href="data:image/svg+xml,...the emblem...">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="4"><meta name="hub:session-goal" content="Score the most points across three Olympiyikes events">
<meta name="hub:session-howto" content="Stick/WASD move · □○ or J K mash · ✕/Space act · △/Shift turbo · R2/L hold">
<meta name="hub:source" content="The Olympic Games"><meta name="hub:model" content="(the building model's id)">
<style>/* page + 10-foot shell overrides */</style></head><body>
<!-- E.bootSplash('OLYMPIYIKES!') markup --><canvas id="screen"></canvas>
<script>/* engine/my-3d2dge.js */</script><script>/* src/*.js concatenated */</script></body></html>
```
Escape every `</script` inside inlined code as `<\/script`. The session client must stay unmodified and first after
`<meta charset>`. The bundle test (§16) checks all of this.

---

## 5. Shared gameplay systems

### 5.1 The event contract (`O.defEvent`) and the phase runner

Every event is one call. The EventKit turns it into an engine scene `ev:<id>`, registers it in `O.EVENTS`, its
tunables in the tuning registry (§5.13), its card in How to Play, its segment in the attract playlist and, if
`hub.ok`, in the hub deal.

```js
O.defEvent({
  id: 'sprint', name: '100m DASH', short: '100m', season: 'summer', venue: 'stadium', pictogram: 'sprint',
  music: 'sprint', view: 'brawler', input: OLY_KEYS, camera: { zoom: [.8, 1.6] }, M: 12,
  format: { type: 'race', attempts: 1, maxHumans: 4 },                  // race | attempts | match | program
  measure: { unit: 's', better: 'lower', fmt: v => v.toFixed(2) + ' s',
             wr: [9.48, 'TRB', 'MAX OVERDRIVE'], qualify: { Easy: 12.30, Normal: 11.40, Hard: 10.60 } },
  points: t => 25.4347 * Math.pow(Math.max(0, 18 - t), 1.81),          // ≈ 0..1250 (WR level ≈ 1100–1250), used by party + hub
  tune: { vMax: [11.6, 8, 16, .1, 'Top speed (m/s)'], ... },           // [default, min, max, step, label]
  howto: { goal: 'Fastest to the line wins.', rows: [[['mashL', 'mashR'], 'Alternate to run'], [['action'], 'React to the gun · dip at the line'], [['turbo'], 'Turbo when the flame is full']] },
  laurel: { id: 'rocket', name: 'ROCKET MAN', text: 'React in 0.120 s or less and win', test: (ctx, a, res) => ... },
  hub: { ok: true, attempts: 1, seconds: 35 }, attract: { seconds: 18, featured: 'perfect' },
  build(ctx) {},            // once per scene entry: venue, props, crowd, static data (heavy work: boot steps or here)
  intro(ctx, t) {},         // optional cinematic (lane introductions); returns true when finished; skippable
  start(ctx) {},            // per heat / attempt: place athletes, reset per-attempt state
  ready(ctx, dt) {},        // marks / countdown; returns true when play begins
  step(ctx, dt) {},         // the simulation: reads ctx.intent(a) for each active athlete; never reads game.input directly
  bot(ctx, a) {},           // returns an Intent for a CPU/attract/autopilot athlete (skill a.pilot.skill, cheat a.pilot.cheat)
  done(ctx) {},             // true when the heat / attempt is over
  perf(ctx, a) {},          // the performance number, or null (DNF / foul / DQ: put the reason in a.notes)
  draw(ctx, r) {}, hud(ctx, r) {}                                     // skipped headless
});
```

**The runner's phases:** `intro` → `ready` → `play` (`step` until `done`) → `finish` (2–3 s celebration, slow-mo,
"WORLD RECORD!" bursts) → `between` (turn card / next round / standings) → back to `start` or → `done` → the flow
gets the `Results`. `intro` is skipped in hub, attract and on retries; any phase can be jumped to from the dev panel.

**`ctx`** (what the runner gives every hook): `def, meet, game, athletes, humans, active` (those in the current
heat/attempt), `round, attempt, phase, phaseT, t` (seconds of play), `rng(label)` (namespaced by event and attempt),
`T` (live tunables of this event: `ctx.T.vMax`), `G` (global tunables), `intent(a)`, `emit(name, data)` (bus: comms,
crowd, hype, sfx, laurels, tests listen), `finish(a, perf, notes)`, `dnf(a, why)`, `dq(a, why)`, `slowmo(scale, s)`,
`cam` helpers, `ghosts`.

**Sims are separable from scenes:** each event's state lives in plain objects created by `start`; `step` only touches
them. The runner can create a **sandbox ctx** (no scene, no drawing, its own stream labels) to simulate unseen CPU
attempts by running `start`/`ready`/`step` with bot pilots until `done` (§5.3). Tests use the same sandbox.

### 5.2 Pilots, intents and the autoplayer

- A **pilot** fills an athlete's `Intent` each step: `human` (from its `game.players[i]` input: `pressed('mashL')`,
  `down('alt')`, `move()`, pointer for aim), `bot` (from `def.bot(ctx, a)`), `ghost` (replays a recording, §5.9),
  `net` (a hub ghost: drawn only, never simulated).
- Mash assist is applied in the human pilot (§2.5): One button → every `mashL`/`mashR` press is reported as the
  alternation the meter expects; Hold → while either is held, synthesize alternations at 72% of `G.mashRateMax`.
- **`O.AutoPlayer`** drives a *human* athlete through the real input path: each step it asks `def.bot` for an intent
  and turns it into `input.tap`/`input.hold` calls on that player's input. Used by the dev "Autopilot" cheat and by
  the scripted playthrough test (so menus, prompts, lockouts and the human pilot all get exercised).
- Cheats are pilot flags: `cheat: 'perfect'` makes `bot` return frame-perfect inputs and keeps hype full (attract,
  dev "God mode").
- **Fresh presses only:** a human intent ignores buttons still held from before the current phase began (`Ad`, `Lh`,
  `Rh`, `X` become true only after a press inside the phase), so Space or ✕ held through the event card never starts
  a javelin's angle or a dive's tuck.

### 5.3 Formats

| Format | Used by | How the runner plays it |
|---|---|---|
| `race` | 100m, 50m Free | one heat, all 8 athletes live (humans in the middle lanes 3–6, CPUs fill) |
| `attempts` | Javelin (3), Diving (3), Archery (6 arrows as 2 ends), Weightlifting (3), Ski Jump (2), Downhill (1), Bobsled (2) | rounds × athletes in start order. Humans play live. CPU attempts: per round the **2 most relevant** (current leader, the rival, or whoever can overtake a human) play live as **highlights** at 1.5× game speed (✕ skips to the result); the rest are simulated instantly in a sandbox and appear on the standings board |
| `program` | Figure Skating | like `attempts` with 1 attempt; CPU programs are simulated (score cards shown in the kiss & cry) |
| `match` | Curling, Ice Hockey | the event runs its own match vs one CPU (or human) nation; the other placings come from `O.Sim.placings(eventId, nations)` (skill-weighted draws from a stream), so all 8 nations get a rank |

Turn order: humans in join order, CPUs by ascending skill (best last, like a real final). Between rounds the standings
board shows the top 4 and every human.

### 5.4 Input widgets (src/12-eventkit.js; each has `update`, `press`/`read` and a 10-foot `draw`)

- **`Mash`** (`window: .5 s`): counts *alternations* (a press of the other button than the last one). `rate` = EMA of
  alternations per second; a same-button press counts 0.25 and grows `same` (the streak resets on a true
  alternation). Events map `rate` to power with `power = clamp((rate - G.mashRateMin) / (G.mashRateMax - G.mashRateMin), 0, 1) ** .75`
  (defaults: `mashRateMin 2`, `mashRateMax 10.5` Hz). HUD: the two glyphs pulsing alternately + a 10-segment rate bar.
- **`TimingBar`**: a needle sweeping a bar (ping-pong, `hz`), zones `[{ from, to, name, q }]`; `press()` → `{ q, zone }`.
  Windows scale with difficulty and Timing assist.
- **`Ring`**: a ring shrinking onto a target ring over `dur`; `press()` → signed error in ms → PERFECT ≤ 60 ms,
  GOOD ≤ 140 ms (×window scale), else BAD.
- **`Balance`**: a needle `b ∈ [-1, 1]` with drift `b'' = noise(t) * drift - b' * damp`, corrected by the stick axis
  (`b' += -axis * k * dt`); out of `[-1, 1]` = lost. Noise from the event's stream (deterministic).
- **`Sway`**: archery reticle: Lissajous + value noise, amplitude driven by the event (§6.5).
- **`StrokeBeat`**: swimming: alternating expected buttons on a tempo that follows speed; judged like `Ring`.

### 5.5 Hype and YIKES TURBO

- Each athlete has `hype ∈ [0, 1]`, shown as a **flame meter** beside its name (fills orange → white-hot; full = the
  turbo glyph flashes: "△ TURBO!"). Gains come from the event (perfect starts, perfect timing, clean gates, combos),
  scaled by `G.hypeGain` (1.0); decay `G.hypeDecay` (0.02/s) when not full.
- Pressing `turbo` with a full flame fires **YIKES TURBO** for `G.turboTime` (3 s): the event's own effect
  (listed per event), the athlete bursts into (harmless, cartoon) flames (`particles.fire` at the feet/hands + glow
  light), the music's `hype` layer fades in (`audio.layer('hype', 1, .3)`), the crowd surges, commentary cue
  `turbo`. `G.turboPower` (1.0) scales every event's turbo multiplier.
- CPU bots fire turbo at their event's best moment with probability = skill.

### 5.6 CPU rivals and difficulty

- Every nation's athlete has a skill per event (§7.1). Effective skill = `clamp(skill * G.cpuSkillScale + offset, .05, .99)`
  with offset −0.12 / 0 / +0.06 for Easy / Normal / Hard (all three offsets are dev sliders).
- Bots play **the same rules through intents** (no pre-rolled results): mash rate, reaction time, timing error,
  aim error, steering noise, turbo use all derive from skill plus noise from the event's stream. This keeps balance
  honest and lets tests measure it.
- The rival (Turbonia's Max Overdrive; if a human picked Turbonia, the CPU nation with the highest average skill) gets
  +0.03 and always plays live highlights.

### 5.7 Results, qualifying, points, records, medals

- **Ranking** by best performance (`better`), ties by the event's tie rule (stated per event), then by earlier
  attempt. Nulls (DNF/foul/DQ) rank last in their order.
- **Medals** to ranks 1–3 (match events: winner gold, loser silver, simulated bronze match).
- **Qualifying (The Games, 1 player, Qualifying On):** a human result worse than `qualify[difficulty]` → "YIKES! NO
  QUALIFYING MARK" → lose a torch (3 per Games) and retry the event (CPU results stand; the retry replaces yours).
  0 torches → GAMES OVER → CONTINUE? (10 s countdown): yes restores 3 torches and retries; no → title (records and
  laurels are kept). Match events have no qualifying check. Multi-human Games default Qualifying Off.
- **Points** (≈ 0–1250, per event formula; a world-record performance is worth ≈ 1100–1250 in every event): party totals in Quick Games / multi-human Games and the hub score.
- **Party points** (multi-human): 10 8 6 5 4 3 2 1 by rank among all 8; the overall champion is crowned at the end.
- **Records:** in-world World Records (seed table in §7.5), Games Records (best ever on this device, `oly:records`),
  Personal Bests per nation. A beaten WR → "WORLD RECORD!" banner, fireworks, WR sting, commentary, the jumbotron.
  Top-5 tables per event with **initials** (`E.Arcade`: `cab.qualifies`, `cab.enter`, `cab.table`), skipped in hub.
- **Medal table:** gold, then silver, then bronze, then nation name.

### 5.8 Yikes moments

`O.Yikes.trigger(a, kind, at)`: a giant comic stamp **"OLYMPIYIKES!"** (or the kind's own word: "FALSE START!",
"BELLY FLOP!", "BONK!", "FOUL!") with shake, the descending-trombone sting, crowd gasp + "OOOH", a commentary cue,
`yikes[nation]++` (shown at the closing ceremony as the "Yikes reel"), and **sympathy hype +0.15** (`G.yikesHype`), so
a comeback is always possible. Reduce-motion keeps the stamp still. Each event lists its yikes kinds; every one must
be reachable by ordinary bad play (tests force each).

### 5.9 Ghosts

`O.Ghost.rec(a)` samples `[t, x, y, z, facing, poseCode, extra]` at 20 Hz into a compact array; `O.Ghost.at(track, t)`
interpolates; `O.Ghost.draw(ctx, r, state, { tint, name })` draws a translucent rig (`r.actor(..., { alpha: .45 })`
tinted with the player/seat color) plus a name tag. Uses: the leader's run in Downhill/Bobsled, the previous
player's attempt in turn-based multiplayer, your best local run per event (stored, ≤ 3000 samples), and hub ghosts
(§12.2) which arrive as the same samples over the network.

### 5.10 Commentary

- Two commentators plus the stadium PA (§7.6): **CHIP BELLOWS** (play-by-play, booming hyperbole), **DAME VERA
  VELOCITY** (seven-time champion turned colour commentator, dry and sentimental), and the PA announcer (echo).
- `O.Comms.cue(key, vars, { prio })`: picks a line from the event bank, falling back to the generic bank; never two
  lines within 3.5 s, each key has a cooldown, higher priority interrupts (WR > yikes > photo finish > lead change >
  filler). Lines may be two-speaker exchanges.
- Display: a **lower third** with the speaker's live portrait (`rig.drawPortrait`), name, and up to 2 lines of
  subtitles at scale 2 (Text size Huge = larger), above the prompt strip and clear of the touch area. Voice: `O.Voice`
  gibberish (§9.3); the portrait's mouth moves while it speaks. Setting "Commentary" picks voices+subs / subs / off.
- Vars: `{name}`, `{nation}`, `{time}`, `{dist}`, `{rival}`, `{place}`.

### 5.11 Crowd, jumbotron, camera, slow-mo

- **Stands** are TileMap tiers (or painted bands in side views) with a crowd painter: one `r.queue` per stand section
  draws hundreds of 3×5 px spectators (head + shirt in nation colors), bobbing by `O.Crowd.level` (0..1), waving flags,
  camera-flash glints, doing **the wave** when hype turbo fires or a record falls. The crowd audio follows the same
  level.
- **Jumbotron** (stadium, arena, pools): a dot-matrix panel (like the pinball kit's display) showing the event, the
  clock, the leader, "WORLD RECORD!" and a live portrait of the leader.
- **Camera:** `game.focus` on the human leader (or `cam.frame` on all humans, `zoom: [.6, 1]`) in races; event-
  specific shots elsewhere. `ctx.slowmo(scale, seconds)` sets `game.timeScale` (photo finish .25, landings .35) and
  restores it; reduce motion shortens it.

### 5.12 Laurels

One per event (listed in §6), checked when an attempt ends; awarding shows a toast **"LAUREL EARNED: ROCKET MAN"**
with a golden laurel sprite, saved in `oly:laurels`, shown in Records → Laurels (12 tiles: earned gold / unearned
outline with its hint text).

### 5.13 Tuning registry (the dev sliders' data)

`O.tune.def(group, key, [default, min, max, step, label])`, `O.tune.get(group)` → live object (events read `ctx.T.key`
every step, so a slider change applies immediately), `O.tune.reset(group?)`, `O.tune.changed()`,
`O.tune.json()`. Global group `G` (defaults): `cpuSkillScale 1`, `cpuOffsetEasy -.12`, `cpuOffsetNormal 0`,
`cpuOffsetHard .06`, `windowScale 1`, `hypeGain 1`, `hypeDecay .02`, `turboTime 3`, `turboPower 1`,
`mashRateMin 2`, `mashRateMax 10.5`, `mashHoldRate .72`, `yikesHype .15`, `slowmoScale .3`, `qualifyScale 1`,
`gameSpeed 1`. Every event defines **at least 6** of its own (listed per event).

### 5.14 Saves

`O.store` over `E.store`: records, laurels, cabinet (best medal per nation per event), the Games autosave (written
after each day's medal table: meet minus runtime objects), best local ghost per event, first-time tips seen. Settings
are the engine's. Storage blocked → everything still works for the visit. In a hub session the client gives an empty
storage (nothing to do).

---

## 6. The twelve events

Day order in The Games alternates seasons: **1 100m Dash (S) · 2 Ski Jump (W) · 3 50m Freestyle (S) · 4 Curling (W) ·
5 Javelin (S) · 6 Downhill (W) · halftime · 7 Archery (S) · 8 Figure Skating (W) · 9 Weightlifting (S) ·
10 Bobsled (W) · 11 Diving (S) · 12 Ice Hockey Final (W)**.

Numbers below are **starting values for tuning**, each one a dev slider where marked *(T)*. The *targets* are what
tests check (§16.3); retune freely as long as the targets hold.

### 6.1 100m DASH — summer · Glory Stadium · mash

- **View:** `'brawler'`, M = 12. Track along x: start line x = 0, finish x = 1200, run-out to 1500. 8 lanes at
  y = 20 + (lane−1)·14 (lane 1 nearest the camera). Stands (3 tiers + crowd) behind lane 8, advertising boards
  (cut low) in front of lane 1, the finish gantry with a clock, the jumbotron at the far end, the blimp above. Day,
  sunny; `lights` ambient .85 with sun-warm tint.
- **Format:** race, 8 athletes, 1 heat. Humans in lanes 4, 5, 3, 6; with one human, the rival takes lane 5 beside them.
- **Flow:** *intro* (camera pans lane 8 → 1 while the PA names each athlete and nation: 6 s, skippable) → "ON YOUR
  MARKS" (athletes crouch in the blocks) → "SET" (hips up; the gun comes after `1.0–2.2 s` from `rng('sprint:gun')`) →
  **BANG** (smoke puff, flash, sound) → race → photo finish → finish.
- **Reaction:** the first `mashL`/`mashR`/`action` press after the gun starts the athlete; reaction = press − gun.
  A press between SET and the gun, or a reaction < 0.100 s, is a **FALSE START**: everyone resets; the athlete gets a
  yellow card; a second one by the same athlete is a **DQ** (result null, note DQ).
- **Speed:** `vTarget = vMax · power(rate)` (§5.4); `v` approaches it at `accel` 9 m/s² *(T)* up and `decel` 5 m/s²
  *(T)* down; during the first 30 m accel is ×(0.6 + 0.4·d/30). `vMax` 11.6 m/s *(T)* (139 u/s). Turbo: `vMax` ×1.12
  *(T)*. Same-button streak 3 → **stumble** (v ×0.85 for 0.3 s); streak 5 → **FACEPLANT** (yikes: roll + down, 1.4 s
  on the ground, `faceplantTime` *(T)*).
- **Dip:** `action` within the last 2.5 m starts a lean; the torso (which is what crosses the line) leads by 0.35 m
  *(T)* if the dip lands in the last 1.2 m; earlier dips cost 10% speed for 0.3 s.
- **Finish:** time when the torso crosses x = 1200, to 0.001 (shown 0.01). Top two within 0.05 s → **PHOTO FINISH**:
  slow-mo .25 for 1 s, then a frozen sepia frame with the finish line and the two torsos, then the result.
- **Scoring:** lower time; ties by thousandths, then reaction. WR **9.48 s (MAX OVERDRIVE, TRB)**. Qualify Easy 12.30 /
  Normal 11.40 / Hard 10.60. Points `25.4347·(18 − t)^1.81`.
- **CPU:** rate `6.5 + 4.2·skill` Hz ± stream noise, reaction `0.24 − 0.11·skill ± .03`, false-start chance 2% (Normal),
  dip success = skill, turbo at 50 m.
- **Hype:** reaction < 0.15 s +0.35; each second at > 85% power +0.08; good dip +0.1.
- **Tunables:** vMax, accel, decel, turboMult, dipLead, faceplantTime, stumbleStreak, falseStartMin (0.100).
- **Yikes:** FALSE START!, FACEPLANT. **Laurel:** ROCKET MAN (reaction ≤ 0.120 s and win).
- **HUD:** per human: lane tag, mash-pair prompt pulsing, power bar, hype flame; top-right race clock; split board at
  50 m (times) on the jumbotron; reaction times shown under each lane after the start.
- **Targets (tests):** perfect bot 9.40–9.70 s (with turbo ≤ 9.55); skill .9 bot ≈ 9.8–10.2; skill .5 ≈ 10.8–11.4;
  idle human = DNF after 30 s; a press before the gun = false start; skill .9 beats .3 in ≥ 95% of 40 seeds.
- **Multiplayer:** up to 4 humans live; **hub:** yes (1 heat, ghosts in lanes).

### 6.2 JAVELIN THROW — summer · Glory Stadium infield · mash + angle

- **View:** `'brawler'`, M = 12. Runway x 0 → 360 (30 m), foul line (white arc) at x = 360, landing sector to
  x = 360 + 1440 (120 m) with lines every 10 m and numbers, the stadium wall at 120 m and a parking lot beyond it.
  Windsock, distance board, judges with flags. The blimp crosses above (see Over the top).
- **Format:** attempts × 3 rounds, best counts; ties by second-best.
- **Flow per attempt:** athlete at x = 0 with the javelin over the shoulder (pose `javCarry`) → run-up (mash, `vMax`
  9.0 m/s *(T)*) → **hold `action`**: the angle needle rises 0 → 80° at 55°/s *(T)* (and back down if held on,
  ping-pong) → **release** throws at the current angle → flight → landing → a judge jogs to the mark with a tape
  (1.2 s) → the distance pops up.
- **Foul:** crossing x = 360 before release → FOUL (the athlete trips over the line and rolls: yikes), red flag, no mark.
- **Physics (meters):** release speed `vRel = 13 + 1.9·vRun` m/s *(T coefficients)* at the chosen angle, from 2.0 m up;
  `a = (0, −9.81) − kD·|v_air|·v_air` with `v_air = v − (wind, 0)`, `kD = 0.0011` *(T)*. Wind per throw from
  `rng('javelin:wind:<round>:<athlete>')` in −2.0…+3.0 m/s *(T range)*. Tip-first landing requires release angle in
  20°–60°; outside → **FLAT!** (the javelin bounces, "BOING", no mark).
- **Camera:** follow the athlete; at release `cam.frame([javelin, predictedLanding], { zoom: [.5, 1] })`; slow-mo .35
  for the last 0.6 s; then a close shot of the javelin quivering in the turf.
- **Scoring:** higher distance (0.01 m). WR **101.20 m (BLAZE CINDERHART, VOL)**. Qualify 58 / 72 / 82 m. Points
  `10.14·(d − 7)^1.05` (WR ≈ 1200).
- **CPU:** run rate by skill; release angle ~ N(38°, 7° − 5°·skill); foul chance (1 − skill)·12%; turbo on the run.
- **Turbo:** HYPER ARM: release speed ×1.12 *(T)* and the javelin trails fire.
- **Over the top:** > 120 m → OUT OF THE STADIUM: the javelin clears the wall, a car alarm whoops, the mark is
  measured at the landing point in the parking lot (counts!). The blimp (at 55–70 m altitude, crossing at a random
  x per round) can be popped by a steep, fast throw: confetti, "BLIMP BUSTER!", the javelin drops and its landing
  counts.
- **Tunables:** vMaxRun, angleRate, vRelBase, vRelPerRun, drag, windMax, turboMult.
- **Yikes:** FOUL!, FLAT!. **Laurel:** OUT OF THE STADIUM (> 120 m).
- **HUD:** angle gauge (a big quarter-circle dial with a green band 34°–42°), wind (arrow + m/s), run power, best mark,
  standings strip.
- **Targets:** perfect bot (38°, full run) 88–93 m; perfect + turbo + 3 m/s tailwind > 120 m possible; skill .5 ≈ 65–75 m;
  release at 10° → flat; crossing the line → foul.
- **Multiplayer:** humans alternate (the previous thrower's javelin flight shows as a ghost); **hub:** yes (2 throws).

### 6.3 50m FREESTYLE (short course) — summer · Splash Palace · rhythm + breath

- **View:** `'brawler'`, M = 12. A 25 m pool (x 0 → 300) with 8 lanes 2.5 m wide (30 u), animated water floor
  (`E.tex.water` + caustics), lane ropes as rows of colored floats, backstroke flags, starting blocks, a deck, stands
  and big windows to the beach; indoor bright light. 2 lengths with a turn at x = 300.
- **Flow:** "TAKE YOUR MARKS" → beep after `0.8–1.6 s` → **start** (reaction as in the sprint; early = false start) →
  **dive:** holding `action` 0.2–0.6 s then releasing gives the best glide (4 + 3·q m); holding past 0.75 s →
  **BELLY FLOP START** (yikes, glide 2 m) → strokes → **turn** → strokes → **touch**.
- **Strokes (`StrokeBeat`):** expected buttons alternate `mashL`, `mashR` on a beat whose tempo follows speed
  (`50 + 50·v/vMax` strokes/min). A press within ±70 ms *(T)* of the beat is PERFECT, ±150 ms GOOD, else MISS (wasted,
  splash, −5% speed); the wrong button is a MISS. Quality `q` = EMA (1.5 s) of 1 / .6 / 0;
  `vTarget = vMax·(0.45 + 0.55·q)`, `vMax` 2.45 m/s *(T)*.
- **Breathing:** O2 drains 0.11/s *(T)*; `alt` within 0.25 s after a stroke breathes (+0.45 O2, that stroke ×0.7).
  O2 < .25 caps strokes at GOOD; O2 = 0 → **GASP!** (yikes: 1.2 s stop, cough, O2 back to .6).
- **Turn:** inside 1.6 m of the wall the prompt "✕ TURN" appears: press at 0.6–1.1 m → PERFECT FLIP TURN (push-off at
  1.25·vMax, hype +0.2); 1.1–1.6 m early (weak push); < 0.6 m late (normal); not pressed by the wall → **BONK!**
  (yikes, +1.0 s).
- **Touch:** `action` within the last 0.8 m reaches (−0.05 s); otherwise an automatic glide-in.
- **Scoring:** lower time. WR **19.62 s (MARINA SPLASHWORTH, WAV)**. Qualify 25.5 / 23.2 / 21.6. Points
  `18.9·(35 − t)^1.5`.
- **CPU:** P(perfect) = .35 + .55·skill, P(good) the rest minus a miss rate (1 − skill)·.15; breathes every 3–4
  strokes; turn quality by skill.
- **Turbo:** DOLPHIN MODE: 3 s of automatic PERFECT strokes, vMax ×1.1, a cartoon dolphin leaps in the next lane.
- **Tunables:** vMax, perfectWindow, goodWindow, o2Drain, breathGain, turnPush, diveGlide.
- **Yikes:** FALSE START!, BELLY FLOP START, GASP!, BONK!. **Laurel:** TORPEDO (reaction < 0.15, perfect dive and
  perfect turn in one race).
- **HUD:** per human: the stroke ring with the next expected glyph, O2 bubble meter, hype flame; lap/turn indicator.
- **Targets:** perfect bot 19.4–19.9 s; skill .5 ≈ 22.5–24; never breathing → at least one GASP; missing the turn →
  BONK.
- **Multiplayer:** up to 4 live; **hub:** yes.

### 6.4 10m PLATFORM DIVING — summer · Splash Palace · tricks + entry timing

- **View:** `'side'`, M = 12. Tower at the left (platforms at 1, 3, 5, 7.5, 10 m; the 10 m edge at x = 30, z = 120),
  pool cross-section below (surface z = 0, depth to z = −60 drawn translucent with light shafts and bubbles), the 5
  judges' table, the scoreboard, stands. Camera frames the diver and the water; slow-mo .35 at entry.
- **Format:** 3 rounds; each round the diver picks 1 of 3 dives (one easy, one medium, one hard, never repeating a
  dive). Total = sum of dive scores.
- **Dive list:** Forward 2½ Pike (105B, DD 2.8, 5 half-somersaults, pike); Back 2½ Tuck (205C, DD 3.0, 5, tuck, back
  take-off); Forward 3½ Tuck (107C, DD 3.3, 7, tuck); Inward 3½ Tuck (407C, DD 3.2, 7, tuck); Forward 2½ with 2 Twists
  Pike (5154B, DD 3.6, 5 half-somersaults + 4 half-twists); **YIKES! Armstand Quintuple** (DD 4.8, 10, tuck: the
  over-the-top dive).
- **Take-off:** `TimingBar` (1.4 Hz): `vz = 4.2 + 1.6·q` m/s up, `vx = 1.0` m/s; airtime ≈ 1.9–2.1 s.
- **In the air:** hold `mashL` = TUCK (ω 12.5 rad/s *(T)*), hold `mashR` = PIKE (ω 9 rad/s *(T)*), neither = OPEN
  (1.5 rad/s *(T)*). A dial shows half-somersaults done vs required. Twist dives: each tap ←/→ while open or piked
  adds a half twist (0.25 s each). The body rotation is drawn with the Pose module's `bodyPitch` (+ yaw for twists).
- **Entry judgement:** at the surface, error `e` = |body angle − vertical (head first)| in degrees: ≤ 8 RIP (no
  splash) base 9.5; ≤ 15 → 8.5; ≤ 25 → 7.0; ≤ 45 → 5.0; ≤ 75 → 3.0; > 75 → **BELLY FLOP / BACK SLAP** (yikes) 1.0.
  Adjust: take-off +0…+0.5; wrong position −1.0; each missing/extra half-somersault −2.0; each missing half-twist −1.5;
  judge noise ±0.5 per judge from `rng('judges:...')`; clamp 0–10, round to 0.5. 5 judges, drop high and low,
  dive score = middle three × DD.
- **Scoring:** higher total. WR **338.40 (COCO BONBON, BON)** (the maximum possible is 351: three perfect dives of DD 4.8, 3.6, 3.3). Qualify 150 / 195 / 240. Points `3.4·total`.
- **CPU:** take-off q ~ skill; release error σ = (1 − skill)·35°; picks hard dives when skill > .8.
- **Turbo:** SLOW-MO SUPREMACY: time ×0.5 for 2.5 s of the dive (more control), sparkle trail.
- **Tunables:** tuckSpin, pikeSpin, openSpin, takeoffVz, ripTolerance, judgeNoise, twistTime.
- **Yikes:** BELLY FLOP (the judges hold up 0.5 cards; the splash soaks them), WRONG WAY (back slap). **Laurel:**
  PERFECT 10s (all five judges 10).
- **HUD:** dive name + DD, rotation dial, position prompt (glyph □ TUCK / ○ PIKE), twist counter, judges' cards on
  entry.
- **Targets:** perfect bot on the 4.8 dive → five 10s (score ≥ 140); skill .5 average ≈ 60–70 per dive; holding tuck
  to the water from a 2½ → over-rotation penalty or belly flop.
- **Multiplayer:** alternate; **hub:** yes (2 dives, the options dealt from `AIHub.rng`).

### 6.5 ARCHERY — summer · Bullseye Lawn (seaside) · aim under sway

- **View:** main = the **target close-up** (a 122 cm face, 10 rings + X, drawn ~200 px across: readable at 10 feet);
  inset (bottom-left, ~30% height) = the archer in `'side'` view at the line drawing the bow, palm trees and the sea
  behind, wind flags. During flight the inset shows the arrow leaving; the target view zooms 1.1× toward the impact.
- **Format:** attempts: 6 arrows in 2 ends of 3 (a 20 s shot clock per arrow; 12 s in hub heats). Score 0–60; ties by X count, then 10s.
- **Draw:** hold `action` 0.9 s *(T)* to full draw (string tension bar). Release before full draw → weak arrow
  (25 cm low + spread).
- **Aim:** stick/WASD moves the aim at 40 cm/s *(T)*; mouse: the pointer sets the aim directly. **Sway** adds
  `A·(sin 1.3t·cos 0.7t, sin(1.7t + 1))` + value noise, `A = A0·(1 + 0.6·max(0, held − 2.5 s))·hr`, `A0` 7 cm *(T)*,
  heart rate `hr` 1.0 → 1.6 (rises after a bad arrow and on the final arrow of the match).
- **Hold breath:** hold `alt` (L, R2 or right mouse) at full draw: sway ×0.25 for up to 2.5 s *(T)*; when the breath
  bar empties, sway ×2 for 2 s (gasping).
- **Wind:** per arrow from `rng('archery:wind:<n>')` in −4…+4 m/s; impact shift 4.5 cm per m/s *(T)* sideways. Shown
  as a flag, an arrow and a number. Aim off to compensate.
- **Release:** let go of `action` at full draw → flight 0.75 s → impact = aim + sway at release + wind shift + release
  jitter (more if the aim was moving) → ring score; X ring → "BULLSEYE!". An impact within 1.0 cm of an earlier arrow
  → **ROBIN HOOD** (the old arrow splits; same score).
- **Scoring:** WR **60 (6 X) — PIXEL VANCE (NEO)**. Qualify 40 / 48 / 53. Points `20·score`.
- **CPU:** aim error σ = (1 − skill)·12 + 2 cm, wind compensation accuracy = skill; CPU arrows show on a mini target
  on the standings board.
- **Turbo:** EAGLE EYE: game time ×0.4 and sway ×0.1 for 3 s of real time.
- **Tunables:** drawTime, swayA0, swayGrowth, breathTime, windMax, windShift.
- **Yikes:** STRING SLAP (releasing while gasping: "OW!", the arrow flies wide). **Laurel:** ROBIN HOOD.
- **Targets:** perfect bot = 60; a no-breath, no-wind-compensation bot at 4 m/s wind averages < 8 per arrow.
- **Multiplayer:** alternate per arrow; **hub:** yes (3 arrows, 12 s shot clock).

### 6.6 WEIGHTLIFTING (clean & jerk) — summer · Iron Hall · mash + balance + timing

- **View:** `'brawler'`; the lifter (bulky build, singlet, belt, chalked hands) faces the camera on a wooden platform;
  spotlights in a dark hall (`lights` ambient .35 + two warm spots); 3 referees with white/red lights; the bar bends
  with load; plates colored by mass (25 red, 20 blue, 15 yellow, 10 green, 5 white, 2.5 black, collars). Chalk dust.
- **Format:** attempts × 3. Pick the opening weight from 5 offered (Normal 200/210/220/230/240 kg), then +5 / +10 / +15
  for the next; the third attempt may take the **YIKES BAR** (WR + 10 kg). Best good lift counts; ties go to whoever made
  that weight first.
- **Load factor** `w = (kg − 150)/120`.
- **CLEAN (4.0 s *(T)*):** bar height `h` 0 → 1 (floor → shoulders): `h += (rate − 0.7·rReq)·0.12·dt` *(T)*,
  `rReq = 5.5 + 4.5·w` Hz; the bar sinks if rate < 0.5·rReq; time out → no lift.
- **RACK:** `Balance` (drift ×(1 + w)); keep |b| < .35 for 1.2 s *(T)*; |b| > 1 → drop.
- **JERK:** `Ring` (0.9 s): PERFECT → overhead wobble ×0.5; GOOD ×1; BAD → 50% fail, else wobble ×1.8.
- **HOLD:** `Balance` overhead for 2.0 s *(T)*, drift grows with w → three white lights "GOOD LIFT!" (a WR cracks the
  floor), else the bar drops.
- **Scoring:** WR **270 kg (BLAZE CINDERHART, VOL)**. Qualify 200 / 225 / 245 kg. Points `min(1200, 9.5·(kg − 150))`.
- **CPU:** success probability `1/(1 + e^((kg − (190 + 80·skill))/6))`; picks weights like a cautious coach.
- **Turbo:** IRON WILL: balance drift ×0.2 and lift power ×1.4 for 3 s.
- **Tunables:** cleanTime, liftGain, rReqBase, rReqPerW, rackTime, holdTime, driftBase.
- **Yikes:** DROP (the bar bounces twice and the lifter sits down hard, "OOF"). **Laurel:** YIKES WEIGHT (lift the
  YIKES BAR).
- **HUD:** big kg number, phase name, the mash pair, the balance needle (huge, center-bottom), the jerk ring, the 3
  lights.
- **Targets:** perfect bot lifts 280; skill .5 tops out ≈ 220–230; idle → no lift; |b| > 1 → drop.
- **Multiplayer:** alternate attempts; **hub:** yes (2 attempts: 220 then 240 kg).

### 6.7 SKI JUMP (large hill, K-125, HS-140) — winter · Mount Glory Jumping Hill · timing + flight balance

- **View:** `'side'`, **M = 8** (the hill is big). Night, floodlights (`lights.add` along the in-run and the landing
  hill), light snow (`game.weather = { kind: 'snow', amount: .3 }`), alpine backdrop (custom `E.Backdrop` layers:
  mountains, pine forest, a starry sky), the jump tower, the K-point and HS lines, distance boards every 10 m,
  cowbell crowd and flags in the out-run.
- **Hill profile (meters, origin at the take-off edge):** in-run 95 m at 35° from the start gate, table −11°; landing
  hill: knoll `z = −3·(x/15)²` for x < 15, then a 30° slope `z = −3 − 0.58·(x − 15)` to x = 125, then easing out with
  `+0.0045·(x − 125)²` into the flat out-run. Distance is measured along the slope from the edge (precompute a
  polyline with arc lengths).
- **Format:** attempts × 2 jumps. Score per jump = distance points + style points.
- **Flow:** start gate (`action` pushes off) → **in-run:** a `Balance` needle on ↑/↓ (keep the tuck): speed ×(0.94…1.0)
  by average balance quality; `a = g·sin35° − μ·g·cos35° − kAir·v²` (μ .02, kAir .0016 *(T)*) → ≈ 25.5 m/s at the
  table with a perfect tuck. → **take-off:** press `action` in the last 4 m before the edge: last 1.0 m q = 1, 1–2.5 m
  .7, 2.5–4 m .4; no press → **FELL OFF THE TABLE** (q .1, yikes hop). Adds `vz += 2.4·q` m/s. → **flight:** body
  angle α (to the airflow) changed by ↑/↓ at 40°/s; gusts from `rng('skijump:gust')` push α; lift `aL = cL(α)·v²`
  (⊥ velocity), drag `aD = cD(α)·v²`, with `cL(α) = cL0·max(.1, 1 − ((α − 12)/30)²)`, `cL0` .00095 *(T)*,
  `cD(α) = .0006 + .00002·α` *(T)*. → **landing:** within 2.5 m above the slope the prompt "✕ TELEMARK!" appears;
  press within 0.35 s before contact → telemark; later/none → two-footed; landing with |α| > 40° *(T)*, or beyond
  HS + 10 m without a telemark → **CRASH** (tumble down the out-run: Pose tumble, skis fly as sprites, snow spray).
- **Scoring:** distance points `60 + (d − 125)·1.8`; style: 5 judges, telemark 17.5–19.5, two-footed 15–17, crash 6–9
  (minus wobble in flight), drop high/low, sum 3 (max 60). Event = 2 jumps. Hill record **148.0 m (INGRID
  SNOWCASTLE, FRM)**, event WR **296.4**. Qualify 160 / 210 / 245 (2-jump total). Points `3.9·total`.
- **CPU:** balance and take-off q by skill, flight α error (1 − skill)·15°, telemark chance = skill.
- **Turbo:** ROCKET SKIS: lift ×1.1 and +3 m/s² thrust for 2 s, flames from the ski tails.
- **Tunables:** kAir, takeoffBoost, cL0, cDBase, gust, telemarkWindow, crashAngle.
- **Yikes:** FELL OFF THE TABLE, CRASH. **Laurel:** OFF THE CHART (land > 150 m without crashing).
- **HUD:** speed (km/h) in the in-run, take-off zone bar, the flight angle gauge (a skier silhouette rotating over a
  green band), distance counter following the jumper, telemark prompt, judges' style cards.
- **Targets:** perfect bot 132–140 m; perfect + turbo ≥ 150 m; skill .5 ≈ 112–122 m; no take-off press → < 80 m.
- **Multiplayer:** alternate jumps; **hub:** yes (1 jump).

### 6.8 DOWNHILL — winter · "The Yikes Face" · steering + tuck + gates

- **View:** pseudo-3D `E.Road` (`segment: 200`, 1 m = 100 road units; `width: 1600`, `lanes: 0`, `draw: 220`), the
  skier drawn from behind at the bottom center through a custom rear view (§8.2: `new E.View('rear', 'Rear', 0, 18,
  1.6, 1)`, rig facing +y, skis and poles projected with the view's `ax ay bx by bz`), snow colors (road
  `#f4f8ff/#e8f0fb`, grass `#dfe9f6/#d3e0f0` deep snow, rumble = orange netting `#ff7a2a/#f05a1a`), pines,
  spectators with flags and cowbells, banners, start hut, ice tunnel (`tunnel: true`, blue-white walls), sun glare
  (an additive flare overlay), light snow.
- **Course (≈1,440 m, 24 gates):**

| # | Section | Length | Slope | Curves | Gates | Feature |
|---|---|---|---|---|---|---|
| 1 | Start Schuss | 150 m | 28° | 0 | 1 | start hut, crowd |
| 2 | The Corkscrew | 220 m | 22° | +4, −4, +3 | 5 | S-bends |
| 3 | Kangaroo Kicker | 60 m | 10° → 32° | 0 | 1 | crest jump |
| 4 | Pine Alley | 200 m | 20° | −2 | 3 | fences at x = ±1.05 (narrow) |
| 5 | Ice Tunnel | 120 m | 18° | +2 | 1 | tunnel, grip ×0.6 |
| 6 | The Yikes Face | 180 m | 38° | 0 | 3 | big crest jump at its top |
| 7 | Glory Bend | 260 m | 18° | +5 (long) | 4 | strong outward push |
| 8 | Finish Schuss | 250 m | 15° | ±1 | 6 | Victory Hop jump, finish arch, grandstand |

  Build: for each section `road.add(len/2, { curve, hill: -len·tan(slope)·100 })` (in road units) and keep a parallel
  meter-based table for physics (slope per segment, features, gate list `{ s, xc }`).
- **Physics:** speed `v` along the course: `a = g·sin(slope) − (tuck ? dTuck : dUp)·v² − μ·g − carve·|steer|·v`
  (dTuck .0028, dUp .0062, μ .03, carve .18 — all *(T)*). Lateral `x` (half-roads, piste |x| ≤ 1): `x' = steer·turn(v) −
  push·curveAt(z)·v²·k`; `turn` ×0.55 while tucking. 1 < |x| < 1.25 deep snow (drag ×3); |x| ≥ 1.25 → **CRASH into the
  netting** (yikes tumble 2.0 s, respawn |x| = 1, v = 10 m/s). **Jumps:** when the slope falls away faster than a
  ballistic arc, the skier is airborne (`h'' = −g`, shadow on the snow); `action` 0.2–0.5 s before a crest = PRE-JUMP
  (half the airtime: faster). Landing with |steer| > .6 or |x| > 1 → crash. **Gates:** passing |x − xc| ≤ .32 → +2%
  speed (whoosh) and hype +0.05; missing → +0.50 s penalty (red "+0.50").
- **Splits:** 3 checkpoints vs the current leader (green −, red +). The leader's run is a ghost skier.
- **Scoring:** lower time incl. penalties. Course record **47.62 s (ROCKY SUMMIT, MTP)**. Qualify 58.0 / 52.5 / 49.0.
  Points `8.5·(80 − t)^1.4`.
- **CPU:** simulated runs with steering toward the next gate center, tuck on straights, noise and crash chance
  (1 − skill)·15% at the Yikes Face; the top CPU run becomes the ghost.
- **Turbo:** AVALANCHE: speed ×1.18 for 3 s with a cartoon avalanche cloud chasing behind.
- **Tunables:** dTuck, dUp, turnRate, curvePush, gateBoost, missPenalty, crashSteer.
- **Yikes:** CRASH (netting), CRASH (landing). **Laurel:** CLEAN SWEEP (all 24 gates).
- **HUD:** time, speed (km/h), split popups, gate counter (n/24), a course strip (progress line with the leader's
  dot), tuck indicator, hype flame.
- **Targets:** perfect bot 46.5–48.5 s; skill .5 ≈ 53–56 s; steering hard into the netting → crash; all gates
  possible.
- **Multiplayer:** humans take turns, each seeing the best run so far as a ghost; **hub:** yes (1 run; other
  players' skiers as ghosts drawn as road "cars").

### 6.9 TWO-MAN BOBSLED — winter · Glory Ice Track (dusk) · push + load + banked steering

- **View:** `E.Road` again (1 m = 100 units, `width` ≈ 400: a narrow channel; tune for the look), the track as an ice channel: road = ice (`#d8eef8/#cfe6f2`),
  rumble = blue-white walls, grass = snow banks, tunnel roofs on covered sections, dusk sky with floodlights placed as
  glowing scenery, timing boards. The sled (drawn with `px.poly` boxes through the rear view, in the nation's colors,
  number on the cowl) with two rigs seated (Pose `bobPilot`, `bobBrake`), tilted by its wall height.
- **Track (≈1,300 m, 15 named curves):** Sunny Start, Glory Kink, The Twins (2), Shark Fin, Kreisel (long +6),
  Labyrinth (3, S-S-S), Omega (+6/−6), The Washing Machine, Double Trouble (2), Last Gasp, Finish Curve.
- **Flow:** **push** (first 50 m): mash; `dv/dt = 6·power·(1 − v/11)` m/s² *(T)*; the start time at 50 m is shown
  (good ≈ 4.9 s) → **load:** press `action` between 40 and 50 m (the "LOAD" zone flashes): in the zone no loss; early
  ×0.95 speed; missed by 50 m → automatic load with −1.5 m/s and a **YIKES** (the brakeman flails, one leg out) →
  **drive:** `a = g·sin(slope) − drag·v² − μ·g − scrape`; lateral `x'' = force·curveAt(z)·v² − steer·steerForce −
  damp·x'`; the **groove** (ideal x for this curve and speed) shows as a glowing band on a U-shaped cross-section gauge;
  |x − groove| > .25 → skid (−2%/s, sparks); |x| > 1.55 → **FLIP** (yikes: the sled slides on its roof for 2 s in
  slow-mo, then rights itself at −35% speed) → finish and braking zone.
- **Format:** attempts × 2 runs, combined time. Track record **40.11 s per run (MAX OVERDRIVE, TRB)**. Qualify (2 runs)
  92.0 / 86.0 / 82.0. Points `6.4·(120 − total)^1.4`.
- **CPU:** simulated; push rate by skill; groove error by skill.
- **Turbo:** JET SLED: speed ×1.15 and auto-groove for 3 s, a jet flame from the tail.
- **Tunables:** pushGain, loadZone, drag, curveForce, steerForce, grooveTolerance, flipHeight.
- **Yikes:** LATE LOAD, FLIP. **Laurel:** ICE DANCER (a run with no skid or wall contact).
- **Targets:** perfect bot 39.8–40.6 s per run; skill .5 ≈ 42.5–44; not steering in Omega → flip.
- **Multiplayer:** alternate runs with the best run as a ghost; **hub:** yes (1 run).

### 6.10 FIGURE SKATING (free skate) — winter · Glory Ice Palace · rhythm

- **View:** `'threequarter'`; a 60×30 m rink (ice texture with scratches and reflections), boards with sponsor-free
  banners, spotlights (ambient .45 + moving spots), the kiss & cry booth (bench, flowers, a giant plush mascot) where
  scores are read, stands. The skater follows a closed `E.Path` (a large loop with a figure-8 crossing) at a pace tied
  to the music.
- **Music/chart:** original **"Waltz of the Yikes"** in 3/4 at 138 bpm, ~64 s (§9.1), played through `E.Rhythm`
  (`lanes: ['left', 'down', 'up', 'right', 'action']`, holds on `action` are jumps). Windows perfect 45 / great 90 /
  good 135 ms (×1.4 with Timing assist). Chart parts: Intro 4 bars · Step Sequence A 8 · Jump Combo 1 4 (two holds) ·
  Spiral & Spin 8 · **Coach's Corner** 8 (4 bars of calls `c` from the coach, then you answer: PaRappa-style) · Step
  Sequence B 8 (denser) · Jump Combo 2 4 (the 4-beat **QUAD YIKES** hold) · Finale 4 + the final-pose note. About 140
  notes. Easy uses every other non-hold note.
- **Highway:** a horizontal highway along the bottom third (notes travel right → left to a target line), 5 lanes
  labeled with glyph icons (← ↓ ↑ → and ✕/Space), big notes (10 px), judgement words over the skater.
- **Moves:** each judged note triggers a move on the rig: ←/→ edge steps and leans; ↑ spiral (one leg high behind,
  arms out); ↓ sit spin (`rig.spin` accelerating); a hold = jump: take-off on the hold's head, airborne rotations
  (`rig.spin` 4 turns/s, arms crossed), landing on release (great/perfect → clean landing with the free leg back; a
  miss → **FALL**: slide on the backside, get up, combo lost).
- **Scoring:** TES = Σ note value × (1 / .8 / .5 / 0) scaled so a perfect program = 130; PCS = 5 components (skating
  skills, transitions, performance, composition, interpretation) 0–10 each from accuracy, max combo, falls and finish
  pose, ×2 → max 100; falls −1 each. WR **228.56 (COCO BONBON, BON)**. Qualify 120 / 150 / 180. Points
  `min(1200, 5.3·total)`.
- **CPU:** simulated accuracy ~ skill ± noise → TES/PCS; the top 2 rivals' scores revealed in the kiss & cry.
- **Turbo:** STAR POWER: 4 s, every judgement one level better, rainbow trail and glitter; afterwards the crowd throws
  plush mascots onto the ice.
- **Tunables:** perfectMs, greatMs, goodMs, lifeDrain, tesScale, pcsWeight.
- **Yikes:** FALL. **Laurel:** FULL COMBO (no misses).
- **Targets:** autoplay (`rh.hit` on every note) = full combo, ≈ 225–230; idle → life fails → program ends early with
  low score but still a result.
- **Multiplayer:** alternate programs; **hub:** no.

### 6.11 CURLING (gold medal match) — winter · Glory Curling Club · aim + weight + sweep (physics)

- **View:** `'topdown'`; an arcade sheet (meters): hack y = 0, near hog line 6, far hog line 22, tee (house center) 27,
  back line 28.8, width 4.75 (x ±2.375), house radius 1.83 with rings (blue/white/red), stones r = 0.30 (arcade-sized,
  granite with handles in the two nations' colors). M = 12; camera zoom 1.2 during the delivery, follows the stone,
  2.5 over the house; a house-cam inset (top-right) always shows the house. Warm club lights, a scoreboard with ends.
- **Match:** you vs one CPU nation (Mountopia unless you are Mountopia; then the best other curler), 2 ends × 4 stones
  per team, alternating; hammer to the team that did not score (end 1 by coin flip from `rng('curling:hammer')`).
- **Delivery:** (1) **AIM**: stick ←/→ (or the pointer) moves the skip's broom target across the house; (2) **CURL**:
  `mashL` in-turn, `mashR` out-turn (an arrow on the stone; the first ~30% of the predicted path shows as dots);
  (3) **WEIGHT**: `action` starts the slide; a weight meter oscillates 0 → 1 → 0 at 1.1 Hz *(T)* with bands GUARD
  .25–.45, DRAW .45–.65, TAKEOUT .65–1.0; `action` again releases at that weight (`v0 = 1.8 + 2.0·w` m/s); releasing at
  w ≥ .98 = over-throw slip (yikes, still delivered); (4) **SWEEP**: mash while the stone travels: sweep =
  rate/8 Hz (clamped) cuts friction `μ = .019·(1 − .35·sweep)` and curl ×(1 − .5·sweep).
- **Physics:** `E.Physics` with gravity 0 for collisions (`world.circle(..., { bounce: .85, friction: .1, bullet: true })`);
  each step the game applies the ice: deceleration `μ·g` along the velocity and curl `a = spin·κ/(v + .5)`
  (κ .05 *(T)*) across it. Stones that touch the side boards or pass the back line are removed; a stone that stops
  before the far hog line is removed. Collisions above 2 m/s make sparks and a CLACK.
- **Scoring per end:** the team with the stone nearest the button scores 1 per stone nearer than the opponent's
  nearest (stones touching the house only). Ties after 2 ends → an extra end.
- **CPU:** for its throw it evaluates 9 aims × 6 weights × 2 spins = 108 candidates, **each simulated in a sandbox
  physics world** (12 per frame, so no hitch), scores the outcome (own shot stone in the house +, opponent shot
  stones −, guards protecting own stones +), picks the best, then adds execution noise (aim ±.15 m, weight ±.06,
  × (1 − skill)) and sweeps by its own plan.
- **Turbo:** HYPER SWEEP: 3 s of maximum sweep regardless of mashing, glowing brooms and ice sparkles.
- **Medals:** winner gold, loser silver, bronze from a simulated match between the next two nations.
- **Tunables:** mu, sweepCut, curlK, weightHz, v0Base, v0Range, cpuNoise.
- **Yikes:** OVER-THROW SLIP; a stone you throw that knocks your own shot stone out → "OWN GOAL!". **Laurel:** DOUBLE
  TAKEOUT (two opponent stones removed by one throw).
- **Targets:** a draw-weight throw with no sweep stops in the house (±1.5 m of the button); takeout weight on a stone
  removes it; a .9-skill CPU beats a .3-skill CPU in ≥ 80% of 30 seeded matches; no frame spends > 8 ms on CPU sims.
- **Multiplayer:** versus (P1 and P2 skip opposing teams) or co-op (P1 throws, P2 sweeps); **hub:** no.

### 6.12 ICE HOCKEY FINAL (2-on-2 + goalies) — winter · Glory Arena · team action

- **Start from `kits/sports.js`** (its cage, ball-as-Body, passes led to the teammate, `E.arc` lobs, shot meter with
  aftertouch curl, formation AI, `game.allowJoin({ max: 4 })`) and turn it into hockey: the pitch becomes a rink
  (ice floor texture, red center line, blue lines, faceoff circles, creases), the boards get glass on top (`h` higher,
  translucent top band), nets 3 tiles wide with posts; the ball becomes a **puck** (flat sprite, `bounce` 0 on the
  ice, board restitution .65, low friction); players skate with momentum (accel 220 u/s², max 105 u/s, glide);
  add an **automatic goalie** per side (a Body on an arc in its crease that moves toward the puck–goal line at a
  skill-limited speed and saves on contact, sometimes freezing the puck for a faceoff). Arena: dark with spotlights,
  a center-hung jumbotron, goal lights and horn, organ music.
- **Match:** your nation vs the rival (Turbonia, or §5.6's rival if you are Turbonia), 2 periods × 90 s of running clock *(T)*, a resurfacing machine
  crossing at intermission, sudden-death overtime 90 s, then a **shootout** (3 rounds then sudden death: a skater
  starts at center with the puck, 6 s to shoot, vs the goalie).
- **Controls:** skate (stick), `mashL` pass (to the teammate the stick points at, led), `action` hold = shot meter,
  release = shoot (stick aims; push sideways just after = curl), `mashR` = **check** without the puck (a shoulder
  lunge: a hit knocks the opponent down 1 s, the puck squirts loose; into the boards → the glass shakes, crowd "OOOH")
  or switch to the teammate nearer the puck when far, `alt` = skate burst (stamina bar), `turbo` = **ON FIRE** (when
  the hype is full, or automatically after 3 straight good plays: the puck burns, shots ×1.4 speed, goalies react 50%
  slower, until a goal or 8 s). Mouse: left hold/release shoots toward the cursor, right passes toward it.
- **Hype:** completed passes, hits, shots on goal, saves avoided.
- **Medals:** winner gold, loser silver; bronze simulated.
- **Tunables:** periodLength, skateAccel, skateMax, shotPower, puckFriction, goalieSpeed, checkPower.
- **Yikes:** CHECKED INTO THE GLASS (when you get hit), OWN GOAL. **Laurel:** HAT TRICK (one skater scores 3).
- **Targets:** bot vs bot (skill .9 vs .3) wins ≥ 80% of 30 seeded matches; goals happen (≥ 1 per period on average
  at equal skill .7); a shot on an empty net scores; checks knock down.
- **Multiplayer:** up to 4: 2v2 versus or co-op vs the CPU; **hub:** no.

---

## 7. Content

**Originality rules:** fictional nations, athletes, venues and mascot; no Olympic rings or official emblems, no real
anthems, fanfares or broadcast themes; in-game text says "the Games". The hub `source` meta may say "The Olympic
Games" (it is descriptive).

### 7.1 Nations and their star athletes (8 = 8 lanes)

| Code | Nation | Colors (a / b / c) | Flag (drawn in code) | Athlete | Rig (`new E.Humanoid`) | Voice | Personality |
|---|---|---|---|---|---|---|---|
| SUN | SUNVALE | `#f2b632` gold / `#2f7fe0` sky / `#ffffff` | sky field, gold sun disc with 8 rays | **DASH GOLDBERRY** | heroic, hair short `#3a2414`, skin `#8d5a3b` | pitch 1.0, speed 1.1 | sunny optimist |
| FRM | FROSTMARK | `#f4f8ff` snow / `#2fa8d8` glacier / `#1a3a6a` navy | white field, glacier snowflake, navy border | **INGRID SNOWCASTLE** | heroic, ponytail `#f3e6c0`, skin `#f2d4c4` | 1.3, 0.9 | deadpan |
| TRB | TURBONIA | `#e23b2e` red / `#1e2026` carbon / `#ffd23a` yellow | diagonal red/carbon split, yellow lightning bolt | **MAX OVERDRIVE** (the rival) | heroic, spiky `#141414`, skin `#c88a5e`, red headband (`hat: band`) | 0.9, 1.25 | arrogant, loud |
| BON | BONBONIA | `#ff7fb8` pink / `#6fe0c0` mint / `#ffffff` | vertical candy stripes, small heart | **COCO BONBON** | heroic, long `#ff9ad0`, skin `#f5c9a8`, `face: { eyes: 'big' }` | 1.45, 1.05 | theatrical |
| VOL | VOLCANICA | `#ff6a1a` lava / `#3a2e2e` basalt / `#ffd0a0` ember | basalt field, orange volcano, yellow eruption dot | **BLAZE CINDERHART** | **bulky**, bald, skin `#6a4028` | 0.7, 0.85 | gentle giant |
| WAV | WAVELIA | `#1fa8a0` teal / `#0e4a6a` deep / `#e8fbf7` foam | teal field, three white waves | **MARINA SPLASHWORTH** | heroic, short `#24160e`, skin `#5a3420` | 1.25, 0.95 | calm poet |
| MTP | MOUNTOPIA | `#6a3fc8` purple / `#c8ccd8` silver / `#ffffff` | purple field, white peak, 3 silver stars | **ROCKY SUMMIT** | heroic, short `#8a5a2a`, skin `#e0b090`, beanie (`hat: cap`) | 0.95, 1.0 | folksy |
| NEO | NEON REPUBLIC | `#e83ae0` magenta / `#14102a` night / `#3ae8f0` cyan | night field, cyan ring, magenta star | **PIXEL VANCE** | heroic, spiky `#3ae8f0`, skin `#f0c8a8` | 1.15, 1.2 | gamer slang |

Outfits come from `O.makeRig(nation, sport)`: singlet + shorts (track, weights: belt), swim cap + goggles (pool),
racing suit + helmet + goggles (downhill, bobsled, ski jump bib with number), sparkly costume (figure skating: the
nation's colors + `trim` sequins), sweater (curling), padded jersey + helmet (hockey), team tracksuit (ceremonies).
Every rig size 1.25 (bulky Blaze 1.3), with the nation's 4–6 colors (never engine defaults).

**CPU skill per event** (0–1; effective skill per §5.6):

| | 100m | Jav | Swim | Dive | Arch | Wts | SkiJ | Down | Bob | Fig | Curl | Hock |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SUN | .92 | .85 | .70 | .62 | .66 | .70 | .60 | .65 | .78 | .60 | .62 | .74 |
| FRM | .70 | .74 | .66 | .68 | .80 | .66 | .94 | .92 | .74 | .76 | .80 | .78 |
| TRB | .93 | .90 | .78 | .70 | .72 | .82 | .80 | .84 | .95 | .62 | .66 | .93 |
| BON | .66 | .62 | .80 | .92 | .74 | .58 | .70 | .68 | .62 | .95 | .70 | .64 |
| VOL | .72 | .88 | .62 | .55 | .64 | .95 | .62 | .70 | .86 | .52 | .82 | .88 |
| WAV | .74 | .68 | .95 | .88 | .70 | .64 | .66 | .62 | .64 | .80 | .72 | .66 |
| MTP | .68 | .72 | .64 | .60 | .86 | .74 | .82 | .88 | .80 | .66 | .93 | .80 |
| NEO | .78 | .70 | .72 | .74 | .93 | .60 | .74 | .76 | .70 | .82 | .76 | .84 |

**Teammates** (bobsled brakeman, hockey partner and goalie, curling team), generated rigs in team colors:
SUN Sunny Ray, Bo Marigold, Lux Daybright · FRM Sven Driftholm, Liv Hailstrom, Nils Frostby · TRB Rev Throttleton,
Nitro Vex, Gigi Torque · BON Taffy Swirl, Praline Dupree, Nougat Fizz · VOL Ash Kindleton, Ember Stone, Obsidia Crag ·
WAV Coral Finley, Tide Brennan, Kai Seaborne · MTP Edelweiss Vogt, Cliff Hangar, Scree Halvorsen · NEO Byte Ortega,
Glitch Kowalski, Vector Nakamura.

**"Up Close & Personal" bios** (one per day card, rotating; the player's own athlete gets one on Day 1):
- **Dash Goldberry (SUN):** "Dash grew up on a farm in rural Sunvale, chasing the family's prize ostrich to school
  every morning. The ostrich never once let him win. Today, he runs for Daisy."
- **Ingrid Snowcastle (FRM):** "Ingrid's grandmother taught her to ski jump off the roof of the family sauna. The sauna
  has since been rebuilt. Twice."
- **Max Overdrive (TRB):** "Defending champion in, quote, 'everything'. Max has never lost a race, a staring contest,
  or an argument with a mirror. His hobbies include winning and describing winning."
- **Coco Bonbon (BON):** "Coco skates every program to the songs her grandfather whistled. She says she can still hear
  him in the crowd. Usually slightly off-key."
- **Blaze Cinderhart (VOL):** "Every winter morning, Blaze lifts the family car out of a volcanic ash drift. The car is
  fine. The car is extremely well-defined."
- **Marina Splashworth (WAV):** "Born on a houseboat, Marina didn't touch dry land until she was four. On land she still
  walks like the deck is moving. In the water... poetry."
- **Rocky Summit (MTP):** "Rocky's village sits so high that the mail arrives by curling stone. He has been sweeping since
  before he could walk. His first word was 'HARD!'"
- **Pixel Vance (NEO):** "Pixel learned archery from an arcade cabinet and has never seen daylight without sunglasses.
  Pixel's coach is a toaster named Gary. Gary believes in Pixel."

### 7.2 Venues (levels)

| Venue | Events / scenes | View | Light | Key art (all drawn in code; generic props from the engine library/asset store) |
|---|---|---|---|---|
| **Glory Stadium** (Sunny Bay) | 100m, Javelin; opening & closing ceremonies; stadium podiums | brawler | day (events), night + fireworks (ceremonies) | red 8-lane track with lane numbers, infield grass with mown stripes, 3-tier stands + crowd, the cauldron tower, jumbotron, finish gantry & clock, flags of the 8 nations on the rim, the blimp, parking lot past the wall |
| **Splash Palace** | 50m Free, Diving | brawler / side | indoor bright, caustics | pool, lane ropes, blocks, flags line, the dive tower, judges' table, windows onto the beach, jumbotron |
| **Bullseye Lawn** | Archery | overlay + side inset | sunny, breezy | target faces, palms, the sea, wind flags, shade tent |
| **Iron Hall** | Weightlifting | brawler | dark, two spotlights | platform, chalk bowl, referee lights, plate rack, dim crowd |
| **Mount Glory Jumping Hill** | Ski Jump | side | night floodlights, light snow | tower, in-run, K/HS lines, distance boards, out-run crowd with cowbells and flags |
| **The Yikes Face** | Downhill | E.Road | bright day, sun glare, light snow | piste, orange netting, pines, start hut, ice tunnel, jumps, finish arch, grandstand |
| **Glory Ice Track** | Bobsled | E.Road | dusk, floodlights | ice channel, named curve signs, tunnels, timing boards |
| **Glory Ice Palace** | Figure Skating | threequarter | spotlights | rink, kiss & cry, flowers, plush rain |
| **Glory Curling Club** | Curling | topdown | warm indoor | sheet, houses, scoreboard, pennants |
| **Glory Arena** | Ice Hockey | threequarter | dark arena + spots | rink, glass, center jumbotron cube, goal lights, organ loft |

Use `node vendor/my-3d2dge/dist/handoff/tools/asset-find.mjs "<thing>"` for generic props (benches, fences, pines,
snow blocks, banners, lamps, flags: the `kenney-holiday`, `kenney-nature`, `ambientcg` sets have snow, pines, ice and
fences); cut the few you use into a set of your own with `tools/asset-set.mjs` and inline it.

### 7.3 Story structure (The Games)

| When | Beat | Content |
|---|---|---|
| Start | **Opening ceremony** | §7.4 |
| Day 1 (before) | Max's welcome | in the call room: "Lane four? Cute. I'm in lane five. Lane five is where legends warm up." |
| After Day 2 | **Mascot incident** | Yikesy "test-jumps" the ski jump: a 6 s cutscene (the Blob launched, spinning, lands in a snowbank head-first). Chip: "The mascot has... the mascot has set a personal best!" Vera: "And a personal worst. Simultaneously." |
| After Day 4 | Curling chat | Rocky: "Back home we curl to settle arguments. Mostly about curling." |
| After Day 6 | **HALFTIME REPORT** | medal table + banter; Yikesy appears, dripping ("rescued from the pool filter"); Max line depends on standings (§7.6) |
| After Day 8 | Coco's moment | Coco (any result): "Grandpa, that one was for you." Vera, quietly: "...Give me a second, Chip." |
| After Day 10 | Sled scandal | Vera: "Turbonia's sled has a spoiler. And a cup holder." Max: "It's called aerodynamic hospitality." |
| Day 12 (before) | **THE FINAL** | both anthems tease; Max: "Two nations. One puck. Zero chance. For you." |
| After Day 12 | Sportsmanship | win: Max: "...Good game. Next Games I'm bringing two helmets. One for my ego." · loss: Max: "Good game. You were almost me." |
| End | **Closing ceremony** | §7.4; ending by rank |
| Dynamic | Rival reactions | after any event with you and Max both in the top 4: a line from the bank (beat him / he beat you) |
| Dynamic | Records & yikes | a WR by you → Vera's sentimental line; 5+ yikes → Vera: "Statistically, the most entertaining athlete in Games history." |

### 7.4 Ceremony scripts

**Opening ceremony** (Glory Stadium at night, ~60 s, hold ✕ 1 s to skip):
1. Fireworks over the twin city (the ski jump floodlit beyond the stadium rim). PA (echo): "Ladies and gentlemen...
   welcome to the Games of Mount Glory and Sunny Bay!"
2. Chip: "Good evening, everybody! For the first time in history, the Summer and Winter Games are happening at the
   SAME TIME, in the SAME PLACE!" Vera: "Some called it impossible. Others called it a scheduling error. Tonight we
   call it... OLYMPIYIKES!"
3. **Parade of nations** (rigs marching in tracksuits behind a flag bearer, crowd waving that nation's colors), one
   line each: SUNVALE "where the sun never sets and the sunscreen budget is classified." · FROSTMARK "their flag bearer
   is carrying the flag AND a small sauna." · TURBONIA "led by defending champion Max Overdrive, who has asked us to
   call him 'The Defending Champion', even while he sleeps." · BONBONIA "their uniforms are, legally, dessert." ·
   VOLCANICA "please don't stand too close. They're very warm people." · WAVELIA "they arrived by boat. They prefer
   it." · MOUNTOPIA "they train at altitude, with less oxygen and more yodeling." · NEON REPUBLIC "their uniforms
   come with a firmware update." The player's nation enters last: "And finally... the nation everyone came to see!"
4. **The flame (playable):** "The final torchbearer is... YOU!" A flaming javelin throw at the cauldron: hold
   `action`, release in the gold zone of a `TimingBar`. Perfect: "Bullseye! The cauldron is LIT!" (+0.25 hype into
   Day 1). Miss: the javelin hits the scoreboard, the scoreboard catches fire, "...and the scoreboard is now the
   cauldron. Olympiyikes!" (it still lights).
5. Max, in the tunnel (portrait close-up): "Nice throw. Enjoy it. It's the closest you'll get to gold." Vera: "Let
   the Games... begin!" Grand fireworks finale.

**Medal ceremony** (each event, ~12 s, ✕ skips after 2 s): podium blocks 2–1–3 in the venue; athletes walk up; medals
appear on their chests (a sprite at the neck joint); three flags rise on poles (tweens); the winner's **procedural
anthem** (§9.5) plays; camera flashes; confetti in the winner's colors; one commentary line.

**Closing ceremony** (~70 s, skippable): the final medal table on the jumbotron; all athletes dance in the infield
(`cheer`, `wave`, spins); the "Yikes reel" counter for each nation; a snow cannon misfires and **puts out the
cauldron** ("OLYMPIYIKES!"), then all eight star athletes relight it together with their torches; the motto appears:
**FASTER. HIGHER. YIKES.**; the ending text; then the credits (paged).

**Endings by your nation's final rank:**
- 1st: "Your nation tops the medal table! Back home they're renaming a mountain after you. It's a small mountain.
  It's a hill. But it's YOUR hill."
- 2nd–3rd: "A podium nation! Respect. Max sends a fruit basket. It's mostly lemons."
- 4th–8th: "The medals didn't come, but the highlights did. Your yikes reel has four million views. Next Games, champ."
- Multi-human Games add the **party champion** podium (by party points) before the ending.

### 7.5 Records (in-world World Records, seeded into `oly:records`)

| Event | WR | Holder | Qualify E / N / H |
|---|---|---|---|
| 100m Dash | 9.48 s | Max Overdrive (TRB) | 12.30 / 11.40 / 10.60 |
| Javelin | 101.20 m | Blaze Cinderhart (VOL) | 58 / 72 / 82 m |
| 50m Freestyle | 19.62 s | Marina Splashworth (WAV) | 25.5 / 23.2 / 21.6 |
| 10m Diving | 338.40 | Coco Bonbon (BON) | 150 / 195 / 240 |
| Archery | 60 (6 X) | Pixel Vance (NEO) | 40 / 48 / 53 |
| Weightlifting | 270 kg | Blaze Cinderhart (VOL) | 200 / 225 / 245 kg |
| Ski Jump | 296.4 (hill record 148.0 m) | Ingrid Snowcastle (FRM) | 160 / 210 / 245 |
| Downhill | 47.62 s | Rocky Summit (MTP) | 58.0 / 52.5 / 49.0 |
| Bobsled | 40.11 s per run (80.40 total) | Max Overdrive (TRB) | 92.0 / 86.0 / 82.0 |
| Figure Skating | 228.56 | Coco Bonbon (BON) | 120 / 150 / 180 |
| Curling, Ice Hockey | match events: "most points in a final" records (curling 6, hockey 7) | Rocky Summit / Max Overdrive | — |

The top-5 table of each event starts with the WR holder plus four seeded CPU marks a little below it.

### 7.6 Commentary banks (write ≥ 160 lines in total; samples below set the voice)

Style: earnest Olympic broadcast (statistics, sentiment, national pride, "up close and personal") colliding with
arcade bombast. Chip exaggerates; Vera undercuts with memories and dry wit. Short lines (≤ 70 characters each half).
Lines refer to athletes by `{name}` (or "they"), never a gendered pronoun: any athlete or player can be in any line.

**Generic keys:** `start, lead, close, photo, wr, gr, pb, yikes, falsestart, foul, turbo, win, lose, last, comeback,
rivalBeat, rivalWins, idle (filler), dnf`.
- start: Chip "And they're OFF!" · Chip "Here we go, folks, the moment of truth!" · Vera "Breathe. That's all I ever told myself. Breathe and go."
- lead: Chip "{name} takes the lead for {nation}!" · Chip "{name} hits the front and the crowd is ON ITS FEET!"
- close: Chip "Too close to call!" · Vera "Somebody fetch a ruler. A very small ruler."
- photo: Chip "We go to the PHOTO!" · Vera "Grab some popcorn, Chip. Photos take a while."
- wr: Chip "A NEW WORLD RECORD! Somebody call the record books! Somebody call the record books' MOTHER!" · Vera "I held a world record once. For eleven minutes. Cherish this."
- yikes: Chip "OLYMPIYIKES! That's going on the highlight reel for a thousand years!" · Vera "They're okay. The snow will need counseling." · Chip "OH NO. Oh no no no. Oh... yes, actually, that was amazing."
- falsestart: Chip "Too eager! The gun hadn't even THOUGHT about firing!" · Vera "Nerves. I once false-started a press conference."
- foul: Chip "Over the line! The judges say NO!" · Vera "Lines are there for a reason. Mostly to be stepped on."
- turbo: Chip "{name} is ON FIRE!" · Chip "LOOK at that! Is that legal? Vera, is that legal?" Vera "Entirely. I checked in 1988."
- win: Chip "GOLD for {nation}!" · Vera "Somewhere, a small town is throwing a very loud party."
- rivalWins: Max "Second place is just first loser. That's a quote. Mine." · Max "Did you see me? Everybody saw me."
- rivalBeat: Max "That was a fluke. A very fast fluke." · Max "I let you have that one. For morale. Yours." · Max "I'm not crying. Turbonians don't cry. We vent."
- halftime (lead): Max "Halftime means nothing. I'm a second-half athlete." · (trail) Max "Halfway home, and already bored of winning."

**Per event (≥ 8 each), examples:**
- Sprint: "Ten seconds. A whole life of training for ten seconds." · "That's not a start, that's a LAUNCH!"
- Javelin: "That javelin is still climbing!" · "It's left the stadium! Someone check the parking lot!"
- Swim: "Perfect turn! Like a dolphin with a mortgage to pay!" · Vera "I could never do flip turns. I did flip-flops."
- Diving: "A rip entry! You could hear a pin drop. You could NOT hear that diver!" · "SLAP! You could hear that one in the next time zone."
- Archery: "Dead center! The wind didn't stand a chance." · Vera "I tried archery once. The target was very relieved."
- Weights: "Look at that bar BEND!" · "Three white lights! GOOD LIFT!"
- Ski jump: "{name} is flying! Still flying? STILL FLYING!" · Vera "Gravity always wins. It just takes its time."
- Downhill: "One hundred and thirty kilometers an hour down a frozen cliff. On purpose." · "Into the netting! The netting has done its job!"
- Bobsled: "Through the Omega like it isn't even there!" · "They're upside down! Still fast, though!"
- Figure: "A quad! A QUAD YIKES!" · Vera "Grandpa would be whistling now."
- Curling: "HURRY HARD! HURRY HARD!" · "Double takeout! The house has been CLEARED!"
- Hockey: "{name} shoots... and SCORES!" · "Into the glass! The glass is fine. The glass is always fine."

**PA lines:** "In lane {lane}... representing {nation}... {name}!" · "Ladies and gentlemen, a new World Record!" ·
"Please rise for the anthem of {nation}."

### 7.7 Pictograms, emblem, flags

- **12 pictograms** (16×16 `E.sprite` strings; white figure on a rounded tile, summer coral `#ff6b4a`, winter ice-blue
  `#3fa8e8`; drawn ×2 or ×3 on cards): sprint (leaning runner), javelin (arm back, diagonal shaft), swim (head and
  arm arc over waves), diving (inverted figure over a splash), archery (figure drawing a bow), weights (bar overhead),
  ski jump (forward-leaning figure on long V skis), downhill (tucked skier, diagonal), bobsled (sled with two
  helmets), figure (spinning figure, one leg out), curling (stone + broom), hockey (stick + puck + skater). Used on the
  schedule, event cards, results, Single Event tiles, the HUD and the records tabs.
- **Emblem "the Yikes Flame":** a flame split down the middle, orange (summer) and ice-blue (winter), inside a gold
  laurel wreath. Title, ceremonies, hub card, favicon (an inline SVG data URI of the same shape).
- **Flags:** `O.Art.flag(g, x, y, w, h, nation, wave)` draws each flag from its spec with a 2-step cloth wave and
  shading (`E.tones`).

### 7.8 Items, power-ups, opponents and hazards

| Kind | Content |
|---|---|
| **Equipment (items)** | spikes and blocks, javelin, swim cap and goggles, bow and arrows, barbell and color-coded plates, jump skis, downhill skis and poles, the two-man sled, curling stones and brooms, hockey sticks, puck and nets, the torch. Drawn by `O.Gear` (§8.2) in the nation's colors |
| **Golden gear (unlock)** | winning gold in an event turns that event's equipment golden for that nation in later plays (saved in the cabinet); shown in Records → Cabinet |
| **Power-ups** | YIKES TURBO (one per event, §6: HYPER ARM, DOLPHIN MODE, SLOW-MO SUPREMACY, EAGLE EYE, IRON WILL, ROCKET SKIS, AVALANCHE, JET SLED, STAR POWER, HYPER SWEEP, ON FIRE and the sprint's TURBO); sympathy hype after a yikes; speed gates in the downhill |
| **Collectibles** | medals (cabinet), 12 laurels, world records and top-5 places with initials |
| **Opponents ("enemies")** | the 7 CPU nations' stars with per-event skills (§7.1); the rival Max Overdrive (+0.03, always shown live); CPU curling skips that plan shots by simulation; the Turbonia hockey team and the goalies |
| **Hazards** | the starter's gun (false starts), the foul line, wind and gusts, the pool wall, the take-off table's edge, gravity under a loaded bar, orange netting, crests that launch you, the tunnel's ice, banked walls that flip a sled, the hog and back lines, the boards and the glass |

---

## 8. Art and animation

### 8.1 Look (the engine's native style, pushed to its look target)

Follow every step of API.md's "Look target": `res: 'ps1'` + `expand`, HD Humanoids at size 1.25 dressed in each
nation's palette, a backdrop or painted horizon behind every view, textured floors (`floorTex` functions for track,
grass, pool water, ice with scratches, snow with sparkle), 3–8 props per screen (`r.prop`/`r.shape`: flags, banners,
lamps, benches, pines, fences, barriers, cameras on tripods, medal tables), effects on every impact, `E.font.title`
logos, lights in every scene, faces in every dialog (portraits). The season split in palettes: summer warm (gold,
coral, sky), winter cool (ice blue, violet, white) with warm floodlights; UI panels navy `#0c1028` with gold `#f2b632`
trim. Screenshots should compare with the best PS1-era 2D, not NES.

### 8.2 Pose layer (`O.Pose`, src/06-pose.js) and the engine's pose hook

- The Humanoid already animates runs, jumps (`air`), crouch, kneel, cheer, wave, hips, down, die, rolls (`flip`),
  climbs, landings (`rig.land`) and every move in `E.MOVES` (use `new E.Attack('throw')` for the javelin release,
  `'bash'` for hockey checks, `'twohand'` for slapshots, `'cast'` for the torch raise). **Use these first.**
- For what it lacks, `O.Pose.set(rig, name, params)` installs `rig.post = (rig, J) => ...` (engine change 5). A pose
  edits joints in the rig's own frame `[forward, right, up]`: `J.hipC, hipL/R, kneeL/R, footL/R, shC, shL/R, elbowL/R,
  handL/R, head`, using helpers `armTo(J, side, target, hint)` and `legTo(J, side, target, hint)` (two-bone IK with
  `E.ik3` and the rig's limb lengths `rig.o.armUpper/armLower/legUpper/legLower`), `lean(J, fwd, side)`,
  `look(J, dir)`. Poses blend in/out with a weight (ease .15 s). Whole-body rotations set `rig.bodyPitch`,
  `rig.bodyRoll`, `rig.pivot`.
- **Pose list** (each previewable in the Pose Lab, `#poselab`): `blocks` (sprint crouch, hands on the line), `set`
  (hips up), `dip` (torso thrown forward), `javCarry` (right hand above the shoulder), `javWithdraw`, `swimCrawl(phase,
  breath)` (prone via bodyPitch 90°, arms on circles around the shoulders, flutter kick, head turned on breaths),
  `diveStart(u)`, `flipTurn(u)`, `armsUp` (diving stance), `tuck`, `pike`, `layout`, `entry` (hands joined over the
  head), `bellyFlop`, `archerDraw(u)` (bow arm extended to the target, string hand to the jaw), `archerRelease`,
  `liftSetup`, `liftClean(h)` (hands on the bar, bar height h), `liftRack`, `liftJerk(u)` (split stance, arms locked
  overhead), `liftDrop(u)`, `skiTuck`, `skiFlight(α)` (V-style: straight body leaning over the skis, arms back),
  `telemark`, `tumble(t)`, `bobPush`, `bobPilot`, `bobBrake`, `skateGlide`, `skateSpiral`, `sitSpin`, `skateJump`
  (arms crossed), `skateLand`, `curlSlide` (deep lunge, hand on the stone), `sweep(phase)`, `skipPoint`,
  `hockeyStride`, `stickHandle`, `goalieStance`, `kneeSlide` (goal celebration), `flagCarry`, `torchRaise`, `bowHead`
  (receiving a medal), `medalBite`, `podiumWave`, `faceplant` (built-in `flip` roll + `down`).
- **Gear** (`O.Gear`, drawn with `r.queue` at projected joint positions so it depth-sorts with the rig): javelin,
  bow + string + arrow, barbell + plates (ellipses facing the camera) with bend, skis (two long quads from the feet
  along the ski direction, V in flight), poles, helmets/goggles, swim cap/goggles, bobsled (boxes through the view,
  like `kits/kart.js` `box()`), curling stone and broom, hockey stick (line from hands to a blade on the ice) and puck,
  medals, flags on poles, torch (with `particles.fire` and a light).
- **Rear view for E.Road events:** `new E.View('rear', 'Rear', 0, 18, 1.6, 1)`; a rig with `facing: Math.PI / 2` faces
  into the screen. Draw it inside the road's overlay at the skier's screen point (`rig.draw(g, sx, sy, REAR)`); for
  ghosts and other sleds at a distance, cache views per quantized scale (`E.View(..., scale)` at 12 steps) as
  `m7.view(k)` does in the kart kit.
- **Check every pose** with `tools/filmstrip.mjs <page>#poselab/<pose> --steps "wait:300 rec:16:2" --seed 1`: no
  joints through the body, no snapping when blending, readable silhouettes at 1×.

### 8.3 Effects

Fireworks (`particles.explosion(..., { debris: false })` + colored `glints`, launched with trails), confetti (`bits`
in nation colors), splashes (blue/white `bit` particles sized by entry error; a rip makes only bubbles), snow spray
(white dust on carves and crashes), sparks (sled scrapes, curling clacks, skate stops), chalk dust, camera flashes
(white glints in the stands), turbo flames (`fire` + emissive glow), the gun's smoke puff, speed lines and sun
glare overlays on the road events, the "YIKES!" stamp, the WR burst (rays + stars), the plush rain.

### 8.4 Lighting per venue

`game.lights.enabled = true` in every venue's enter: stadium day ambient .85 warm; stadium night .4 + stadium
floodlights + fireworks flashes; pool .8 cool + caustic glows; lawn .9; Iron Hall .35 + two warm spots; ski jump .35
+ floodlights along the hill; ice palace .45 + moving colored spots; curling .6 warm; arena .4 + spots + goal light
flash. E.Road scenes draw as overlays (unlit): bake the mood into their colors and add additive glow sprites.

### 8.5 The mascot: YIKESY

An `E.Blob({ R: 9, ears: 'cat', feet: true, mouth: true, colors: { base: '#f8f8ff', dk: '#d8e2f0', lt: '#ffffff' } })`
(a round snow-yeti) with a flame tuft on its head (fire particles + glow) and a half-orange/half-blue scarf drawn on
top. Appears on the title, in ceremonies, story beats, the attract mode, the curling scoreboard, as plush toys on the
ice, and in the Pose Lab. Voice: squeaky gibberish (pitch 1.9).

---

## 9. Audio (all in code)

### 9.1 Music (engine songs `{ bpm, steps: 4, tracks }`, every one original)

| Id | Where | Feel | BPM | Notes |
|---|---|---|---|---|
| `title` | title, menus' first entry | heroic brass fanfare with a comic chromatic "yikes" slide, then triumph | 120 | motif below |
| `menu` | main menu, setup screens | bright funk-pop loop | 112 | |
| `parade` | opening ceremony | march, snare rolls | 116 | |
| `sprint` | 100m | chiptune drum & bass | 172 | `hype` drum layer |
| `javelin` | javelin | funky groove | 104 | |
| `swim` | 50m free | bubbly arpeggios | 128 | |
| `diving` | diving | sparse, timpani, suspense | 90 | |
| `archery` | archery | tense minimal + heartbeat kick | 80 | heartbeat speeds with `hr` |
| `iron` | weightlifting | heavy rock riff (saw bass) | 96 | |
| `alpine` | ski jump | floodlit alpine pulse, bells | 124 | |
| `yikesface` | downhill | driving rock | 150 | |
| `icesurf` | bobsled | surf rock | 160 | |
| `waltz` | figure skating | "Waltz of the Yikes", 3/4 (bars of 12 steps) | 138 | the rhythm chart's song |
| `lounge` | curling | lounge jazz (swing feel) | 92 | |
| `organ` | hockey | stadium organ + chant | 132 | goal horn sting |
| `table` | results, medal table | proud, warm | 100 | |
| `closing` | closing ceremony, credits | emotional anthem turning into a party | 96 → 128 | |
| stings | WR, YIKES (descending trombone "wah-wah-wah-waaah"), laurel, qualify fail, games over, victory, goal horn | | | `audio.sting` |

Every event song names a `hype` track (`on: false`) faded in during turbo. Title motif (lead, one token a 16th, bars
of 16): `G4 - - - C5 - - - E5 - - - G5 - - - | C6 - - - - - - - B5 - A5 - G5 - - - | A5 - - - F5 - - - D5 - - - G5 - - - |
E5 - - - D#5 - - - D5 - - - C#5 - - - | C5 - - - . . G4 - C5 - E5 - G5 - - - | C6 - - - - - - - - - - - . . . .`
over a bass `C3 C3 G2 G2 | A2 A2 E2 E2 | F2 F2 G2 G2 | C3 B2 Bb2 A2 | F2 G2 C3 - | C3 - - -` (quarters) and drums
`k . . . s . . . k . k . s . . .` with a snare roll into the last bar. Keep the "rise, comic slide, recover" shape:
it is the game's sonic logo.

### 9.2 Sound effects (`audio.define`, layered voices; names → recipe)

`gun` (noise burst 1800→200 Hz .12 s + sine 90→40 .3 s), `beep` (sine 880 .15), `step` (engine preset, pitched by
speed), `whoosh`, `thunk` (javelin into turf: noise lowpass + sine 140→60), `boing` (triangle 300→600→300 with vib),
`twang` (pulse 220→180 with fast vibrato), `thwack` (noise 3000→800 .05 + sine 180), `clank` (square 800 + noise,
metallic `arp`), `slam` (bar drop: boom preset + rattle), `splash` (noise 2000→300 .5, size by vol), `slap` (belly
flop: noise 4000→900 .08 + boom), `bubbles` (sine blips 600–1200), `swish` (ski carve: noise highpass 2–4 kHz),
`crunch` (snow), `rumble` (sled: low noise loop by speed), `scrape` (noise 3–6 kHz + square 70), `clack` (stone:
noise 1500 .04 + square 400), `brush` (sweep: noise bursts), `puck` (click 2000 .03), `check` (boom + noise),
`glass` (noise 5 kHz + triangle 1200 shimmer), `horn` (saw 220 + 277 + 330 1.2 s), `buzzer` (square 180 .8 s),
`whistle` (from the sports kit), `cowbell` (square 560 + 840 decay), `camera` (click + highpass noise), `firework`
(explode + crackle bits), `medal` (chime triangle C6–E6–G6), `cough` (noise formant), `alarm` (car alarm: square
880↔660), `pop` (blimp: noise 3000→100), `yikes` sting. All go through the engine's sfx bus (volume settings apply).

### 9.3 Voices: `O.Voice.speak(text, voice)` (Animalese/Simlish gibberish)

- Split the line into syllables (`/[^aeiouy\s]*[aeiouy]+[^aeiouy\s]*|[.,!?]/gi`). For each syllable: vowel → formants
  (a 730/1090, e 530/1840, i 270/2290, o 570/840, u 300/870, y 300/2000 Hz) scaled by the voice's `formant` (female
  1.15, child/mascot 1.5); pitch `f0 = voice.base · 2^((hashOffset + contour)/12)` with `hashOffset` −3…+3 semitones
  from a hash of the syllable (deterministic: never `Math.random`), contour rising on a question's last syllable,
  falling on a period, +4 semitones and faster on "!". Duration `(.075 + .012·len) / voice.speed`, gap .02 s, pauses
  .12 (comma) / .22 (period).
- Source: an `OscillatorNode` (sawtooth for Chip, triangle for Vera, square for the PA, a narrow pulse built with `createPeriodicWave` for Max) with a little
  vibrato and a −1 semitone fall at the end; consonant onsets add a 12 ms highpassed noise tick; two parallel band-pass
  filters at F1 (Q 6) and F2 (Q 9); envelope 5 ms attack, 25 ms release; into the voice bus (engine change 6). The PA
  adds a `DelayNode` echo (.18 s, feedback .3).
- Returns the line's duration (subtitle timing, portrait mouth). Headless or before the first input: returns the
  duration and makes no sound.
- Voices: Chip (base 140 Hz, speed 1.15), Vera (210, .95), PA (120, .8, echo), Max (150, 1.25), each athlete per §7.1
  (base 130 Hz × pitch), Yikesy (420, 1.4), crowd chant (6 detuned voices on "O-LY-YI-KES!").

### 9.4 Crowd

`O.CrowdAudio`: a looping noise source → band-pass (900 Hz, Q .7) → gain = `crowd volume × (.15 + .6·level)`, plus a
low murmur layer; events: cheer swell (level → 1, filter up), gasp (fast filter fall), "OOOH" (a cluster of 6 voices on
"oooh"), applause (deterministic clap bursts), the chant, cowbells (winter outdoor), organ stabs (arena). Starts at the
first user input (browsers' rule), ducks under the pause menu.

### 9.5 Anthems

`O.Anthem.song(nation)`: deterministic from the nation's seed: a major key (C, D, Eb, F, G or Bb), 8 bars of 4/4 at
84–96 bpm, rhythm cells drawn from a small set (half + 2 quarters, dotted quarter + eighth + half, 4 quarters), melody
on chord tones on strong beats over I–IV–V–I–vi–IV–V–I, brass lead (saw), harmony (square, quiet), bass (triangle),
timpani (low sine `k`) on downbeats and a snare roll into bar 8. ≈ 20 s, played once at the medal ceremony (and a
4-bar excerpt for "THE FINAL" tease). Two nations never share a melody (test).

### 9.6 Mix

Defaults: master .7 (engine), music .5, effects 1, voices .8, crowd .7. While a commentary line plays, music ducks
×0.7. Pause ducks everything (engine). Sound on/off and every volume live in the engine's Settings → Sound.

---

## 10. Modes and flow

### 10.1 The Games (the campaign)

```
menu → gamesSetup → nations (join + pick) → opening
  → for day 1..12: [beat before?] → dayCard → eventCard → ev:<id> → results → [initials]
        → (failed qualifying? → torch → retry the event | 0 torches → gamesOver → continue? retry : title)
        → podium → medals → [beat after?] → autosave
  → closing → ending (+ party podium if several humans) → credits → title
```
- **Setup:** Length (Full 12 days / Quick 4 with its playlist), Difficulty, Qualifying (On by default for 1 player,
  Off for several).
- **Nations:** every human picks a different nation; CPU nations take the rest (8 total always compete).
- **Day card + event card** always shown; the event card waits until every human pressed `confirm` ("READY" in their
  color) or P1 presses Start.
- **Autosave** after each day's medal table (`oly:games`); CONTINUE GAMES resumes at the next day card. Quitting to
  the title (the engine asks first) keeps the autosave. Finishing the Games deletes it and fills the cabinet.
- **Quick Games:** playlists *Track & Pool* (100m, Javelin, 50m Free, Diving), *Snow & Ice* (Ski Jump, Downhill,
  Bobsled, Curling), *Greatest Hits* (100m, Ski Jump, Diving, Ice Hockey), *Random 4* (2 summer + 2 winter from a
  stream). A short flame-lighting opening (no parade), rival reactions only, party podium at the end.

### 10.2 Single Event

single (event grid) → nations (join + pick) → eventCard (with **Practice** on △: no CPUs, unlimited attempts, no
records) → ev → results → [initials] → short podium → a menu: **Retry · Change event · Main menu**.

### 10.3 Records, How to Play, Settings, About

- **Records:** one tab per event (top-5 table with initials, nation flag, date-free), **Laurels** (12 tiles with hints),
  **Cabinet** (nation × event best medal icons). ←/→ or L1/R1 switch tabs.
- **How to Play:** *Basics* (4 pages: mash, timing, hype & turbo, yikes) then the 12 event cards.
- **Settings:** `game.menu('settings')` (engine HTML, scaled), with the Game group of §2.5.
- **About & Credits** (paged, 10-foot): (1) **Source Information** (every field TASK.md lists), (2) **Testing
  Feedback**, (3) **Engine Feedback**, (4) **Prompt Feedback** (the answers to TASK.md's questions, the same text as
  the chat reply and `exit-interview.json`), (5) **Credits** (planned and built by which models, engine and version,
  AI Hub client version, the engine changes of §4.6, asset sets used with their CC0 sources), (6) **Controls** (the
  action map with glyphs for the current device).

---

## 11. Attract mode

- **Trigger:** 10 s without input on the title or any main-menu screen (title, menu, single, records, howto, about,
  gamesSetup, nations before anyone joined). "Input" = any key, mouse button, wheel, mouse movement > 4 px, gamepad
  button or stick past the dead zone, touch. Tracked per step in the scene wrapper (`E.HOOKS.input` catches presses
  while menus are open). The idle clock does not run while an engine HTML screen (settings, controls) is open
  (`game.shell && game.shell.screen`).
- **Playlist** (a director scene; every segment loads the real event scene with `meet.mode = 'attract'`):
  `LOGO (4 s) → EVENT → RECORDS TABLE (6 s) → EVENT → MEDAL TABLE (6 s) → EVENT → LAUREL / TIP CARD (5 s) → EVENT → loop`,
  events rotating through all 12 across loops: sprint, skijump, diving, downhill, curling, figure, hockey, javelin,
  swim, archery, weights, bobsled. Each event has `attract.setup(ctx)` that starts at its showcase moment: the sprint
  from SET, the ski jump from the gate with rocket skis, the YIKES quintuple dive, the downhill from the Yikes Face
  jump, a curling end set up for a double takeout, figure skating from Jump Combo 2, 25 s of 2-on-2 hockey ending in an
  ON FIRE goal, the out-of-the-stadium javelin, a perfect flip turn, a Robin Hood arrow, the YIKES BAR lift, the
  Labyrinth on the bobsled. Segment length = `attract.seconds` (15–25 s).
- **Cheating is allowed:** every athlete is a bot; the featured one uses `cheat: 'perfect'` (frame-perfect inputs,
  infinite hype). Each loop also shows one scripted wipeout by a non-featured athlete, so the demo shows what can go
  wrong.
- **Overlay:** "DEMO" badge, the small logo, "PRESS ANY BUTTON" with the glyph of the last device (touch-only: the
  "Controller or keyboard required" line instead), commentary subtitles on.
- **Exit:** any input → title (the input is consumed so it doesn't also press anything there). Attract never writes
  records, laurels, saves or ghosts.

---

## 12. Multiplayer

### 12.1 Local (the game on its own)

- Players join on the Nations screen (and in Single Event) with `game.allowJoin({ max: 4, onJoin })`: Start/✕ on a
  free gamepad, or **2** on the keyboard (the halves split); ○/Esc leaves before the event starts
  (`game.removePlayer`). Each player's color is `E.PLAYER_COLORS[i]` and tag P1–P4.
- Formats: races put humans in middle lanes, simultaneously (one shared camera framing the humans); attempts/programs
  take turns with a **turn card** ("P2 — YOUR TURN") and the previous player's attempt as a ghost; matches offer
  **Versus** (P1 vs P2, or 2v2 in hockey) or **Co-op** (humans on one team; curling co-op = one throws, one sweeps).
- Every prompt, pause ("P2 PAUSED") and Controls page is per player (engine).

### 12.2 AI Hub sessions: "Hub Heats" in **ghost** mode

Why ghost: every copy runs its own seeded heat of the same three events at the same moments on the hub's clock, and
shows the other players as ghosts in neighbouring lanes, so it plays like a real head-to-head final with no
host-authoritative sync.

- **Tags** (§4.9): `hub:session 1`, `hub:session-players 1-4`, `hub:session-mode ghost`, `hub:session-minutes 4`,
  goal and how-to. The client `vendor/hub/session.js` is pasted unmodified as the first script in `<head>`.
- **Detect:** `AIHub.active` (true from the first line). Then the game **never shows the title, attract or menus**.
  A boot step awaits `AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true })`; if it resolves `null`, boot the
  normal game.
- **The deal:** three events from `AIHub.rng('deal')`, one per group: A {sprint, swim}, B {javelin, archery, weights,
  diving, skijump}, C {downhill, bobsled}; order A, B, C. Nations by seat from `AIHub.rng('nations')` (a permutation);
  names and colors come from `info.players` (seat colors `#e8443a #3b82f6 #22c55e #f5b700`) and are drawn with the
  pixel font, never inserted as HTML. No CPU athletes in hub heats; a translucent "WR pace" marker gives a target.
- **Our own card** (`card: true`, scene `hubCard`): the venue of event 1 as backdrop, the three dealt events with
  pictograms, the players lined up in seat colors with a READY tick each (from `card` events), "Most points over three
  events wins", this player's controls (keyboard and controller columns with glyph icons), the countdown from
  `card.left`. **Enter/✕/tap on READY → `AIHub.answer('ready')`; △ (button 3), the T key or a tap on MORE TIME →
  `AIHub.answer('more')`** (again takes it back). No menus, settings or choices on the card. **No `Math.random`
  consumers on the card:** with engine change 2 the rigs and particles no longer call `Math.random`, so the card may
  animate them; any randomness of the card's own comes from `AIHub.rng('card')`.
- **Ready:** call `AIHub.ready()` once, as soon as boot has built the first venue, with no key press.
- **Start:** on `start`, show a big 3-2-1 synced to `AIHub.time()` (negative during the countdown); play begins at
  `AIHub.time() >= 0`.
- **Slots on the hub clock:** event *i* runs in a fixed slot (`hub.seconds` per event: sprint 35, swim 45, javelin 45,
  archery 50, weights 50, diving 45, skijump 40, downhill 70, bobsled 60). Each slot: 5 s "GET READY" (the event card
  as an overlay + countdown), the heat (hub variant: attempts as in §6), then a 4 s results splash; finishing early
  means watching the ghosts until the slot ends; reaching the slot's end unfinished finalizes the attempt (DNF scores 0
  for that event). Everyone moves to the next event together. If the tab was hidden past a slot, finalize it and
  jump to the current slot.
- **Ghost traffic:** ~10 messages/s, unreliable: `{ t: 'g', e: eventId, i: slot, a: attempt, s: [x, y, z, facing,
  poseCode, extra] }` (≈ 60–90 bytes); reliable on each attempt and event result: `{ t: 'r', e, i, perf, pts, total }`.
  Ghosts render as translucent athletes tinted in their seat color with their hub name: other lanes in races (lanes
  assigned by seat around yours), alongside jumpers/divers/javelins (offset slightly in depth), colored hit marks on
  the archery target, extra platforms for weights, road "cars" in downhill/bobsled. Ghosts never affect your world.
  `leave` removes that ghost.
- **Scoring:** points per event (§6 formulas); `AIHub.progress({ score: total, label: '100m · 9.87 s · 1,032 pts' })`
  whenever points change and about once a second; after the third event: **`AIHub.result({ score: total, stats:
  { '100m': '9.87 s', ... }, awards: [{ title: 'WORLD RECORD', detail: '100m · 9.41 s' }] })` exactly once**.
- **`time-up`:** if no result was sent, send `AIHub.result({ score: total })` at once and freeze input ("TIME!").
- **`end`:** stop taking input (all players' `input.clear()` and a flag the scene wrapper checks), `audio.music(null)`,
  silence voices/crowd, show "ROUND OVER" over the venue; send nothing afterwards.
- **Rules:** no network but the hub, no `alert/confirm/prompt`, no new windows, no navigation; the pause menu has no
  Quit, Restart or Dev mode (§4.4); Options is ignored while Create (pad button 8) is held (§2.1); storage is the
  client's empty one (nothing to do); fullscreen requests go through the client automatically.

---

## 13. Dev mode (pause menu → "Dev mode"; the ` key also opens it; absent in hub sessions)

- **Opening** closes the engine's pause menu (`game.resume()`) and sets `game.timeScale = 0` (the scene keeps updating with dt 0, so the
  scene wrapper can run the panel); closing restores the previous time scale. **LIVE** (a toggle on the panel) lets
  the game run at the dev speed while the panel stays open; then the panel suppresses the game's actions each step
  (`input.suppress`), so only bots and the autopilot play.
- **Panel:** pixel art, right 45% of the screen, 10-foot sized, tabs **TUNE · GLOBAL · CHEATS · JUMP · VIEW · DATA**
  (L1/R1, Q/E or click). ↑/↓ choose a row, ←/→ change it (held: accelerates after .5 s), Shift/R2 = fine steps, ✕
  activates the row (toggles and buttons; on a slider it resets that slider), △ resets the whole tab to defaults,
  ○/Esc closes. Mouse: hover focuses, drag a slider, wheel nudges.
- **TUNE:** the current event's tunables (≥ 6, listed in §6) as live sliders with their default marked; changed
  values in gold with a count; **RESET TO DEFAULTS**; **COPY JSON** (clipboard + console) of changed values;
  **KEEP AFTER RELOAD** (stores `oly:tune`, off by default).
- **GLOBAL:** the global tunables (§5.13), same controls and reset.
- **CHEATS:** Autopilot P1 (the AutoPlayer), Perfect P1, God mode (no wipeouts, fouls, DQs for humans), Infinite hype,
  WIN NOW (gold), LOSE NOW (8th), DNF NOW, SKIP TO PHASE (each event lists its phases: e.g. ski jump: gate / take-off /
  flight / landing; downhill: section 1–8; hockey: period 2 / overtime / shootout), NEXT ATTEMPT, UNLOCK ALL LAURELS,
  TORCHES +3, GIVE MEDAL (gold/silver/bronze to your nation).
- **JUMP:** any event (Single Event, P1 SUN vs CPU), any Games day (earlier days simulated), opening ceremony, closing
  ceremony + ending (choose rank), podium and medal table with sample data, any story beat, attract, Pose Lab, the hub
  card with a local stub hub and three fake ghosts (to see ghost rendering offline).
- **VIEW:** rig skeletons (`rig.debug`), physics bodies (`world.draw`), radii/hitboxes, input display (each player's
  `input.history` as glyph icons), FPS (the engine setting), state JSON (`game.debug.snapshot()`, paged), time scale
  0.1×–4× and a FRAME STEP button (each ✕ on it advances one fixed step while frozen), free camera (`cam.free`) and zoom, HUD on/off,
  lights on/off, photo mode (all UI hidden).
- **DATA:** meet seed (view/set), reset records, reset laurels, clear the Games save, clear ghosts, sound test (any song,
  sting, sfx, voice line), commentary test (cue any key).
- `O.Dev.set(group, key, v)`, `O.Dev.cheat(name)`, `O.Dev.jump(target)` are the same actions for tests.

---

## 14. Build order and milestones

Build the spine and one complete event first, de-risk the hard techniques with spikes, then fill in events by reuse.
Each milestone ends with `node tests/run.mjs` green and a short screenshot review.

| M | Scope | Exit criteria |
|---|---|---|
| **M0 Setup** | §0.1 fetch; folder; `index.html`; `tests/run.mjs` + harness; `tools/bundle.mjs`; engine changes 1–4 | headless boot to a blank `title`; bundle opens via `tools/check.mjs` with no errors; tests print one line |
| **M1 Spine** | 00–12 core files: game object, `OLY_KEYS`, pilots, `Mash` and timing widgets, `O.Prompt`, 10-foot widgets, tuning registry, streams, nations + rig factory (basic outfits), scene wrapper, `O.flow` (title → menu → single → event card → event → results → back), EventKit with formats, results/records/points, hype/turbo, yikes, comms (text first), crowd (visual), store | the 100m sim runs headless with 8 bots, deterministic twice, results and records correct; menus navigable by keys, pad codes and mouse in tests; prompts resolve to icons for every device |
| **M2 Reference event + presentation** | 100m complete (stadium art, crowd, jumbotron, lights, music, sfx, `O.Voice`, crowd audio, commentary with portraits, HUD with glyphs, photo finish, false starts, faceplant, turbo, laurel); podium + anthem generator; medal table; dev panel v1 (TUNE/GLOBAL/CHEATS/JUMP); attract v1 (title → sprint demo → records → loop); touch-only notice; 10-foot CSS for the engine's HTML screens | all 100m targets (§6.1) pass; screenshots of title, stadium, HUD, podium, dev panel at 1920×1080 read well |
| **M3 Risk spikes** (before more events; independent of M2) | (a) Pose layer + engine change 5: swim crawl, tuck/pike rotation, V-flight, telemark, jerk in the Pose Lab + filmstrips; (b) rear-view skier and gates on `E.Road`; (c) hub: a minimal ghost round with the sprint in the real harness via Playwright; (d) bundle from `file://` at full size; (e) curling ice model calibration (draw/takeout distances); (f) `E.Rhythm` 5-lane chart with the waltz + skater path | each spike has a passing test or an approved filmstrip; findings folded into §6 numbers |
| **M4 Summer events** | Javelin (reuses the stadium), 50m Free, Diving, Archery, Weightlifting | each meets the event Definition of Done (below) |
| **M5 Winter events** | Ski Jump, Downhill, Bobsled (reuses Downhill), Figure Skating, Curling, Ice Hockey (from the sports kit) | each meets the event Definition of Done |
| **M6 The Games** | setup, nations + join, opening ceremony, day cards, all story beats, qualifying/torches/continue, halftime report, closing ceremony, endings, credits, autosave/continue, Quick Games, party points; local multiplayer in every format | the scripted playthrough (§16.3) passes for 1 player and for 2 players |
| **M7 Front end** | attract (full playlist), Records/Laurels/Cabinet, How to Play, all Game settings, About & Credits pages | attract test passes; every menu screen reachable by keys, pad and mouse in tests |
| **M8 AI Hub** | §12.2 complete: tags, card, deal, slots, ghosts for the 9 hub events, progress/result/time-up/end/leave, Create+Options | headless hub-stub suite passes; real harness: 2 players auto, 4 players with latency/jitter/loss, host-leave → `__hubCheck.pass === true` |
| **M9 Balance and polish** | bot statistics per event and difficulty, commentary density, audio mix, visual passes per venue, crowd, effects | every event's targets (§6) hold; screenshot review of all venues; no runtime warnings in `check.mjs` |
| **M10 Ship** | final bundle, full test run, final screenshots, About & Credits filled with real Source Information and feedback, `exit-interview.json` (valid JSON, every field), the chat reply | §17 checklist all ticked |

**Event Definition of Done:** playable start to finish by keyboard, pad (and mouse where §2.2 says), and by bots;
CPU rivals; HUD with glyph prompts and the event card; ≥ 6 tunables; turbo; every listed yikes; laurel; ≥ 8
commentary lines; its music and sfx; records, qualifying and points; multiplayer as specified; hub variant where
listed; attract segment; headless tests (determinism, bot completes, skill monotonic, every mechanic check of §6);
a screenshot reviewed.

---

## 15. Risks and how to de-risk them

| Risk | Impact | Mitigation | Early signal |
|---|---|---|---|
| Scope: 12 events + ceremonies + hub | an unfinished game | one event contract and widgets; reference event first; reuse kits (sports → hockey, road → downhill + bobsled, rhythm → figure, physics/pinball → curling); events written in order of reuse; nothing beyond this plan | milestone burn-down; DoD per event |
| Custom athlete animation looks broken | cheap look, unreadable actions | built-in rig vocabulary first; `O.Pose` + Pose Lab + filmstrips in M3; equipment carries readability (a javelin, a barbell, skis say what the pose is) | M3 filmstrips |
| Rigs from behind on `E.Road` | downhill/bobsled unconvincing | M3 spike with a custom rear `E.View`; fallback: skier and sled drawn as code-drawn sprites with 8 lean frames | spike screenshot |
| Hub protocol failures | the game is kept out of sessions | M3 spike against the real harness; follow §12.2 literally; test every scenario | harness pass |
| Cosmetic `Math.random` use (rigs, particles) | hub card rule broken; flaky tests | engine change 2; gameplay only via `O.rng` streams; proofs run twice | determinism tests; `Math.random` call-count check on the card |
| Input conflicts (J/K/Space/○ in menus vs play) | skipped screens, accidental cancels | custom preset without J/K in confirm/cancel; lockouts; `consumeAll` on enter; hold-to-skip cinematics | input tests |
| Missing ✕○□△ in the pixel font | `?` in prompts | `O.Prompt` icons + font glyphs (engine change 3) | prompt test for every action × device × glyph style |
| Engine HTML menus too small on a TV | 10-foot failure | CSS override; 1920×1080 screenshot | screenshot |
| Unbalanced events | boring or unfair | points tables; bot calibration tests per skill; dev sliders; difficulty presets | bot statistics test |
| Slow headless tests | tests skipped | sims are draw-free; `--quick`; the full playthrough uses perfect bots | test time printed |
| Bundle breakage (`</script>`, order, size) | a broken deliverable | bundler escapes; a bundle test in Chromium from `file://` | bundle test |
| Voices grating | players mute everything | cooldowns, priorities, voices volume, subtitles-only | a listening pass with the dev sound test |
| Touch-only misdetection on touch laptops | locked-out players | coarse && no fine pointer && no key/pad seen; any key or pad unlocks | touch emulation test |
| Curling CPU cost (108 sims) | hitches | 12 candidates per frame, early exits | per-frame timing test |

---

## 16. Testing

### 16.1 The one command

`node tests/run.mjs` (from the dev folder) runs every suite: headless Node suites first, then the browser suites
(Playwright). It prints **only failures** (suite, check, a one-line detail) and then **one line**:
`olympiyikes: 512 checks, 0 failed (headless 41 s, browser 63 s)`; exit code 1 on any failure. `--quick` runs only the
headless suites; `--only <suite>` runs one. Rerun a suite only after changing the code it covers. The browser suites
load Playwright from the handoff's install (`createRequire(<dev>/vendor/my-3d2dge/dist/handoff/package.json)('playwright')`),
so there is one `npm install` for everything.

### 16.2 The harness (`tests/harness.mjs`)

As the handoff's `game/test.mjs` and `kits/test.mjs`: a `vm` context with stand-ins (`window`, `addEventListener`,
`location`, `matchMedia`, `navigator`, a fake clipboard), the engine, then the `src` files in `index.html` order;
optionally a **fake `AIHub`** (connect resolves an info object; `time()` driven by the test; `send/progress/result`
recorded; `emit(event)` to deliver `card/start/message/leave/time-up/end`). Helpers: `tap(action, player)`,
`hold(action, on, player)`, `advance(s)`, `until(cond, maxS)`, `snap()` (= `game.debug.snapshot()`), `jump(target)`.
**`game.debug.snapshot()`** returns `{ scene, mode, day, event, phase, attempt, round, athletes: [{ id, nation,
human, x, v, hype, perf, notes }], results, medals, torches, hub: { slot, total, sent }, dev: { open, changed },
errors: game.errors.length }`.

### 16.3 Suites and what they check

- **core:** boot reaches `title`; every scene registered; `OLY_KEYS` has no J/K in confirm/cancel; the glyph
  default is PlayStation and the setting switches to Xbox; `O.Prompt` resolves an icon for every action × device
  (keyboard, mouse, gamepad) × family (playstation, xbox) with no `?`; points formulas are monotonic; WR/top-5 table
  insertion and initials flow; tuning registry reset restores defaults; streams are deterministic per label; engine
  changes present (`E.HOOKS`, `rig.post`, font glyphs, voice bus).
- **events (×12):** for each event, in a sandbox with fixed seeds: (1) a full heat/attempt set with bots completes,
  results valid, **the same hash twice** (determinism); (2) skill monotonic (skill .9 beats .3 in ≥ 90% of 40 seeds,
  ≥ 80% for matches over 30); (3) the perfect bot hits the event's target band (§6); (4) every listed mechanic check
  (false start, dip, foul, flat landing, belly-flop start, gasp, bonk, rip vs belly flop, Robin Hood, drop, fell off
  the table, telemark vs crash, netting crash, gate penalty, load timing, flip, full combo, fall, curl direction sign,
  takeout removes a stone, hog-line removal, goal, check knockdown, shootout); (5) every yikes kind reachable;
  (6) the laurel test fires for a crafted performance; (7) a human pilot fed by scripted `input.tap/hold` (not the
  bot) completes the event (the human path works); (8) idle human: the event still ends with a valid result.
- **flow / playthrough:** the **scripted playthrough of the whole game**: title → menu → THE GAMES (Full, Normal,
  Qualifying On) → nation SUN → opening (the torch throw played) → 12 days, P1 driven by the AutoPlayer at skill .95
  through the real input path (cards confirmed, results continued, initials entered, ceremonies watched to their end,
  not skipped, on days 1 and 12) → closing → credits → title. Asserts: 12 results, 12 golds/12 silvers/12 bronzes
  awarded in the medal table, autosave written each day and cleared at the end, no errors. A second run with a
  .2-skill autopilot exercises torches, GAMES OVER and CONTINUE. A third: Quick Games with 2 humans (both
  autopiloted), party points, versus hockey. A fourth: CONTINUE GAMES resumes at the right day after a reload of
  the store.
- **attract:** title idle 9.9 s → still title; 10.1 s → `attract`; runs 3 full loops (all 12 events seen, records/
  medal cards seen) with no errors and no store writes; one tap → title.
- **dev:** open from the pause item; time frozen; a TUNE slider change (sprint `vMax` ×1.5) makes the next bot heat
  ≥ 25% faster; RESET TO DEFAULTS restores the default and the timing; each cheat does what it says; each JUMP target
  reaches its scene; the panel suppresses game actions in LIVE mode; absent in hub mode.
- **local multiplayer:** 4 players via `game.addPlayer` (pads 1–3); 100m with 4 humans holding their own inputs → 4
  lanes move independently; javelin turns rotate P1→P2→P3→P4 with turn cards; hockey 2v2 each human controls its own
  skater; keyboard halves map our actions.
- **hub (headless, fake AIHub):** tags present in `index.html`; with `active` true the title never appears; `connect`
  called with `{ mode: 'ghost', seats: [1, 4], card: true }`; `ready()` once without input; Enter on the card →
  `answer('ready')`; △ → `answer('more')`; no `Math.random` calls while the card runs; the deal is the same for two
  contexts with the same seed; play starts at `time() >= 0`; slots advance on the hub clock; `send` rate ≤ 20/s and
  payloads ≤ 16 KB; progress sent; `result` exactly once; `time-up` before the end → result at once; `end` stops input
  and music; `leave` removes the ghost; pause menu has no Quit/Restart/Dev.
- **browser (Playwright, against the bundled HTML):** (1) **bundle**: the root HTML exists with the TASK.md name; its
  first `<script>` after `<meta charset>` is byte-identical to `vendor/hub/session.js`; all hub tags present; opens
  from `file://` with no console errors; title visible within 10 s; `#ev/sprint` deep link plays (via
  `tools/check.mjs`-style probing of `__oly`); (2) **touch-only**: a mobile context with touch and coarse pointer
  shows the notice and the SETTINGS button opens settings; after 10 s the attract runs; a keypress restores the
  title; (3) **hub harness**: copy the bundle, `harness.html`, `bridge.js`, `round.js` into `<dev>/.hubtest/`, start
  `python3 -m http.server 0 --bind 127.0.0.1` there (parse the port; confirm `game=` page's title is "Olympiyikes!"),
  run `harness.html?game=<bundle>&players=2&auto=1`, then `&players=4&latency=150&jitter=50&loss=5&auto=1`, then
  `&scenario=host-leave` (and `&players=1&auto=1`); each must end with `document.body.dataset.complete === "true"` and
  `window.__hubCheck.pass === true`; kill the server by its PID.

### 16.4 Screenshots (only what scripts can't judge)

Use `vendor/.../tools/check.mjs <bundle>#<deep link>` and `tools/filmstrip.mjs` (via `tools/shots.mjs`), at 1920×1080
and 1280×720: title, main menu, nations, opening ceremony (parade + flame), each of the 12 venues in play with its
HUD, a results screen, the podium, the medal table, the dev panel, the touch-only notice, the hub card, the engine's
pause and settings screens (10-foot CSS), and filmstrips of every pose in the Pose Lab plus the javelin throw, a
dive, a ski-jump flight and landing, a skating jump, a curling slide and a hockey check. Act on `check.mjs` look notes.

### 16.5 Rules

Tests never depend on wall-clock time (only `game.advance`), never on `Math.random` (streams with fixed seeds), and
print nothing on success. Keep the headless suites under ~2 minutes (perfect bots, short segments) so they get run.

---

## 17. Done checklist (TASK.md → where in this plan → how it's verified)

| TASK.md requirement | Plan | Verified by |
|---|---|---|
| Genre and perspective chosen to fit the source | §1.3 | review |
| Title: playful riff, 50 brainstormed, picked by a real RNG | top of this file | done at planning |
| Single HTML named per the pattern, in the root; dev files in the subfolder | §0, §4.2, §4.9 | bundle test |
| Built on the my-3d2dge handoff; engine changes allowed and listed | §4.1, §4.6 | core test; About |
| Engine-native art + new source-specific assets | §7.2, §7.7, §8 | screenshots |
| Engine-native animation + new animations | §8.2 | Pose Lab filmstrips |
| All music, sfx and voices in code; gibberish voices | §9 | core/audio checks; listening |
| Online via AI Hub, and multiplayer on its own | §12 | hub suites; local multiplayer suite |
| Working environment, ports, processes, file:// first | §0 | practice |
| Headless tests behind one command printing failures + a count; scripted playthrough of the whole game | §16 | `node tests/run.mjs` |
| Original game capturing the source's world, characters, themes, tone | §1, §7 | review |
| Feature-complete vertical slice showing every mechanic | §6 (12 events, every mechanic family), §10 | playthrough suite |
| Dev mode from the pause menu; live sliders with reset to defaults | §13 | dev suite |
| Attract mode after 10 s idle on title/menus; any input exits; may cheat | §11 | attract suite |
| Narrative tone like the source (broadcast + ceremony + human interest) | §7.3–§7.6 | review |
| 10-foot, controller-first; native keyboard/mouse; prompts follow the last input; PlayStation glyphs default, Xbox option; no dense web screens | §2, §3 | core prompt tests; screenshots |
| Touch-only: "Controller or keyboard required" + settings button; attract runs | §3.3 | touch-only browser test |
| No TODOs, placeholders, stubs | §0 | grep for TODO/FIXME/placeholder in `src` (a core check) |
| Source Information, Testing/Engine/Prompt Feedback in the chat reply and an in-game About/Credits screen | §10.3, Appendix A | review |
| `exit-interview.json` beside the HTML, valid JSON, every field filled | Appendix A | a bundle-suite check parses it |

---

## Appendix A: About & Credits, the chat reply and `exit-interview.json`

The builders fill these at the end from their own run (write "unknown" for anything they can't confirm). Known at
planning time:

- **Date:** 2026-11-03 17:48:37 (TASK.md's value) · **Source:** the complete Summer and Winter Olympic Games
  (over-the-top arcade style) · **Plan:** `PLAN.md`
- **Genre and Perspective:** arcade multi-event sports; 2.5D side lanes, side view, pseudo-3D behind-the-athlete,
  three-quarter and top-down per event (§1.3)
- **Tech:** my-3D2dge v0.85.2 handoff (full engine with the road, rhythm, physics, arcade and songs modules), modified
  (§4.6); AI Hub session client 1.4.0; Node + Playwright 1.63.0 for tests; single self-contained HTML
- **Art Direction:** the engine's native PS1-era pixel art with HD Humanoid rigs; new flags, pictograms, venues,
  equipment, mascot · **Animation:** the engine's procedural Humanoid rigs + the `O.Pose` layer and `E.MOVES`
- **Audio:** the engine's chip synth: original songs, procedural anthems, synthesized sfx and crowd, gibberish voices
- **Online:** AI Hub Session Protocol v1, ghost mode ("Hub Heats"); local 1–4 players
- **Testing / Research / Environment / Model / Usage:** from the build run (TASK.md's wording for Environment)
- **AI Hub catalogue block (suggested):** name `Olympiyikes!`, tagline `Faster. Higher. Yikes.`, description
  "Twelve over-the-top Summer and Winter events in one wild fortnight: sprint, swim, fly off a ski jump, sweep stones
  and win the hockey final for your nation, alone or with up to four players.", type `Game`, genre `Sports`, source
  `The Olympic Games`, series `` (empty), players `1–4`, controls `Stick/WASD move · □○ or J K mash · ✕/Space act ·
  △/Shift turbo · R2/L hold`, tags `["2d", "arcade", "pixel art", "comedy", "versus", "retro"]`.
- The Testing, Engine and Prompt Feedback answers (TASK.md's questions, in order) go on About pages 2–4, in the chat
  reply and in `exit-interview.json` with identical text. Check the JSON parses (`node -e "JSON.parse(require('fs').readFileSync('exit-interview.json','utf8'))"`).

