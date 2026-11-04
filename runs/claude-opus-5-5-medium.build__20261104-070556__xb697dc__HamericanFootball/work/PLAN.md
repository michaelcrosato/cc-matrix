# AMERICAN FOOTBALL FIASCO

**The build plan.** Source: American football (over-the-top arcade style). Engine: my-3D2dge v0.85.2 (the
handoff package). Online: AI Hub Session Protocol v1. Planned on 2026-11-03 by claude-opus-5-5 (reasoning effort max)
from `TASK.md` and `STAGE.md`. This plan is for the developers who will build the game from `TASK.md` and this file
alone, possibly other AI models working without the planner. Every engine and hub name it uses was checked against
the real files during planning (engine commit `4390a9852fe0`, hub commit `f8835e4824fb`).

---

## 0. Read this first

### 0.1 The title
Picked the way TASK.md asks. 50 playful riffs on "American Football" were brainstormed silently and one was drawn
with a real random number generator: Python `secrets.randbelow(50)`, which uses OS entropy, gave index 33, which is
**American Football Fiasco**. It shows on the title screen as `AMERICAN FOOTBALL FIASCO`. Do not re-roll it.

### 0.2 Names and deliverables
- GameTitle, file-safe: `AmericanFootballFiasco`. SOURCE, file-safe: `AmericanFootball`.
- The dev folder (all dev files go here, inside this folder):
  `AmericanFootballFiasco-AmericanFootball-claude-opus-5-5-max-20261103-174831/`
- The deliverable: `AmericanFootballFiasco-AmericanFootball-claude-opus-5-5-max-20261103-174831.html` in this
  folder's root, beside TASK.md. It is one self-contained HTML file and runs from `file://`.
- `exit-interview.json` beside it, in exactly the shape TASK.md gives. Check that it parses.
- If your TASK.md gives another model name or timestamp in those brackets, use your names and keep the GameTitle and
  SOURCE parts.

### 0.3 Working rules (from TASK.md, repeated here so none is missed)
- Read only the files you need. Other agents share this directory, this machine's ports and its processes.
- Prefer `file://` and the engine's headless tools. If you need a server (the AI Hub harness does), run
  `python3 -m http.server 0 --bind 127.0.0.1`, read the port it prints, and check that the page it serves is your game
  before you trust a result. Stop only processes you started, by their PID. Never use pkill, killall, `fuser -k`, or
  kill whatever holds a port.
- `/tmp` on this machine is a small tmpfs that other agents fill up (it was full during planning). Put clones, caches
  and test output in your dev folder (`.cache/`, `shots/`, `check-output/`), not in `/tmp`.
- Tests: one command that prints only failures and a one-line count (§21). Rerun it only after you change code it
  covers. Take screenshots only for what a script can't check. Don't use subagents or workflows to debate, review,
  judge or audit.
- Done means no TODOs, placeholders or stubbed features. Every feature in this plan ships, or this plan says how it
  is cut.
- The Source Information, Testing Feedback, Engine Feedback and Prompt Feedback go in the in-game About/Credits screen
  and in your final chat reply. The same answers go in `exit-interview.json` (§23). Write "unknown" for anything you
  can't confirm. The Plan field is `PLAN.md`.

### 0.4 How to read this plan
- §1–2: what the game is, and where each TASK.md requirement is covered. §3–4: setup and architecture.
  §5–17: the systems. §18: the content. §19: build order. §20: risks. §21: testing. §22: tuning defaults. §23: done
  and hand-off. Appendices: data schemas, the network messages, pose codes, events.
- Numbers are starting values. The important ones are dev sliders (§17, §22). Tune with the sliders and the Play Lab;
  don't hand-edit numbers spread through the code.
- "Engine change E#" means modify your copy of the engine (§3.6) and log it in `ENGINE-CHANGES.md`, because the About
  screen and the exit interview ask what you changed and why.

---

## 1. The game on one page

**Pitch.** The Tumbleweed Junction Fiascos have lost 99 games in a row, and their owner has just bet their field on
the Fiasco Cup, the most over-the-top football tournament on Earth. It is 7-on-7 arcade football: turbo sprints,
bone-rattling Big Hits, flaming Hot Streaks, trick plays, mascots running onto the field, laterals across the field
and announcers losing their minds, all in pixel art drawn by code, with gibberish voices.

**Core loop (write it as one sentence at the top of `src/00-boot.js`):** *Call a play from big cards, snap, then run,
pass, juke and hit your way down the field in a 5–10 second burst of chaos, cheer the replay, and do it again before
the clock runs out.*

| | |
|---|---|
| Genres | Arcade sports (American football), with beat-'em-up hit feel and a light story campaign |
| Perspective | A sideline **Broadcast** camera: the field runs left to right, seen from above the near sideline (a custom view, pitch 50°). A rotated **Kick Cam** behind the kicker for field goals and PATs. Replay angles: low field level, isometric, reverse. Optional Sky and Blimp views on V. |
| Players | 1–4 local (couch: pads and shared keyboard), or 1–4 online in AI Hub sessions (shared world) |
| Modes | Story (THE FIASCO CUP: prologue plus 5 chapters), Exhibition, Practice (the tutorial drills), Hall of Fiasco (records), Options, About/Credits, the attract mode, the Dev mode (from the pause menu) |
| Length | Story about 45 minutes. An exhibition about 12 minutes with 2:00 quarters. A hub round about 5–6 minutes (one half). |
| Tone | A 1990s arcade sports broadcast turned to 11: hype-man announcers, small-town underdog movie, trash talk, puns, harmless cartoon violence (PG) |
| Look | my-3D2dge's native style: HD Humanoid rigs drawn as pixel art, `res: 'ps1'` with `expand`, lit scenes, weather, particles |

**What makes it the source (the pillars every feature serves):**
1. **The play call and the snap.** Football's rhythm: a strategic beat (cards), then an explosive physical burst.
2. **Big plays that feel huge.** Hit-stop, shake, slow motion, comic text, the crowd on its feet, the announcers
   screaming, a replay.
3. **Spectacle.** Stadiums, crowds, cheerleaders, mascots, marching band, pyrotechnics, weather, night lights.
4. **Underdogs and trash talk.** Cartoon characters with big personalities and a clear villain.
5. **Couch-to-online competition.** Head-to-head and co-op from 1 to 4 players.

**Fiasco rules** (arcade simplifications, said on the loading tips and the Help screen): 7 per side; 4 downs to gain
**20 yards**; no penalties; late hits allowed (and celebrated); laterals any time; turbo for everyone.

---

## 2. TASK.md coverage map

| TASK.md asks for | Where in this plan |
|---|---|
| Genre and perspective that best fit | §1, §5.6, §11.1 |
| Title from 50 brainstormed with a real RNG | §0.1 |
| Single HTML file; CDN deps allowed (none needed) | §3.5 |
| Built on the engine handoff, which may be changed | §3, §3.6 |
| Engine's native art style plus new assets for the source | §12 |
| Engine's native animation plus new animations | §12.3–12.5 |
| Audio all in code; Animalese/Simlish voices | §13 |
| Online through AI Hub, and the game on its own | §16 |
| Dev subfolder; bundle in the root; servers and processes etiquette | §0.2, §0.3, §3 |
| Performance unlimited (detail, effects, lights, shadows) | §11.5, §12.7 |
| Headless tests, scripted whole-game playthrough, one command | §21 |
| Feature-complete demo showing every mechanic; vertical-slice infrastructure | §15, §18, §19 |
| Dev mode from the pause menu; live sliders with reset to defaults | §17 |
| Attract mode after 10 s idle; AI may cheat; any input exits | §15.4 |
| Multiplayer through the hub protocol | §16 |
| Narrative tone like the source | §15.1, §18.6 |
| 10-foot, controller-first UI; native keyboard and mouse; device-following prompts; PS glyphs plus an Xbox option; no dense web screens | §9, §14 |
| Touch-only: "Controller or keyboard required", the Settings button, attract runs | §14.12 |
| No TODOs or stubs | §0.3, §23 |
| Source Information, feedback, About screen, exit-interview.json | §14.10, §23 |

STAGE.md's own list, for the plan:

| STAGE.md asks the plan to cover | Where |
|---|---|
| The title first, picked as TASK.md says | the heading, §0.1 |
| Architecture and modules | §3, §4 |
| Every system and mechanic | §5–§17 |
| Levels | stadiums §18.2, story chapters §15.1, drills §15.2, attract segments §15.4 |
| Enemies | the opposing teams and their AI §18.1, §8; bosses and their specials §10.5 |
| Items | the Fiasco Cards and the Fiasco Meter §10.2; halftime adjustments §18.6 |
| Story beats | §15.1, §18.6 |
| Build order with milestones | §19 |
| The riskiest parts and how to de-risk them | §20 |
| How to test each part | §21, plus each milestone's exit check in §19 |

---

## 3. Tech stack and setup

### 3.1 What you build on
- **Engine:** my-3D2dge **v0.85.2**, the handoff package (`dist/handoff/` of github.com/michaelcrosato/my-3d2dge,
  commit `4390a9852fe0ad01e1699a160f2a331931bb1a72`, 2026-11-03). `my-3d2dge.js` there is the full engine with every
  module (1.2 MB, readable). Read `API.md` whole. Grep `API-INDEX.md` for names. From `AI_GUIDE.md`, read these
  sections: Visual craft, Animation, Hard rules, Standard features, Frame order, Systems in more depth (Views,
  Scenes, Camera, Players, Motion and timing, Body, Attack, Humanoid, Audio, Text and UI, Shell, Lighting, Testing
  without a browser, Recorded sessions), the Sports recipe, Building a big game, Where to find more, and the
  Checklist. Read `docs/ASSETS.md` whole before writing shapes. Copy patterns from `kits/sports.js` (the
  SPORTS kit: the crowd on the stands, goalposts drawn with `r.queue`, the ball's shadow, `game.allowJoin`, the radio
  commentary through `E.Dialog`) and `game/test.mjs` (the headless test).
- **AI Hub client:** `lib/hub/session.js` **1.4.0** from github.com/michaelcrosato/ai-hub (commit
  `f8835e4824fbf9bbb4bac3a35e88e3ab197fdd1e`). Paste it unmodified. Read `lib/hub/README.md` whole, and
  `lib/hub/examples/arena.html` for the shared-world pattern this plan follows.
- **Motion clips:** the repository's `src/mocap/readable.js` and `src/mocap/mocap.js` (the runtime, 49 KB) and a set
  cut with `tools/anim-set.mjs` (§12.4). Clips are CC0 (Quaternius, Mesh2Motion) and free for any use (CMU). Credit
  them on the About screen.
- **No other runtime libraries.** Canvas 2D and Web Audio through the engine.
- **Tooling:** Node 24 (v24.22.1 here), Playwright **1.63.0** (pinned by the handoff's `package.json`; Chromium 1243 is
  already in `~/.cache/ms-playwright`), Python 3 for the local server.

### 3.2 Fetching (sparse, into your dev folder)
The full engine repository is large (its `examples/` alone is 79 MB) and the AI Hub repository is over 1 GB. Fetch
only what you need:
```sh
cd AmericanFootballFiasco-AmericanFootball-claude-opus-5-5-max-20261103-174831
mkdir -p .cache && cd .cache
git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/my-3d2dge.git engine
git -C engine sparse-checkout set dist/handoff src/mocap tools
git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/ai-hub.git hub
git -C hub sparse-checkout set lib/hub
git -C engine log -1 --format=%H; git -C hub log -1 --format=%H   # record them in ENGINE-CHANGES.md
```
If HEAD has moved past the commits above, check that `dist/handoff/README.md` still says v0.85.2 and `session.js`
says 1.4.0. If they don't, fetch the pinned commits (`git fetch --depth 1 origin <sha>` then `git checkout <sha>`).
`.cache/` is never bundled and may be deleted at the end.

### 3.3 The dev folder
```
AmericanFootballFiasco-AmericanFootball-claude-opus-5-5-max-20261103-174831/
  package.json         type: module; scripts: test, build, shots; devDependencies: playwright 1.63.0
  index.html           the dev page: loads vendor/ then src/ in order (open with file://)
  build.mjs            the bundler: writes ../<deliverable>.html and ../exit-interview.json
  ENGINE-CHANGES.md    every engine change: what, where, why (feeds the About screen)
  vendor/
    my-3d2dge.js       the engine (your modified copy of dist/handoff/my-3d2dge.js)
    session.js         the AI Hub client 1.4.0, byte for byte
    mocap/readable.js  mocap/mocap.js   from the engine repository's src/mocap
    anim/fiasco-anim.js                 generated (§12.4)
    assets/fiasco-store.js              generated: the few store props used (§12.6)
  src/                 the game, one file per module, numbered in load order (§4.3)
  tools/               copied from the handoff: check.mjs filmstrip.mjs replay.mjs (standalone; they import playwright)
  test/                run.mjs (the one command), lib/, suites/, browser/, hub/ (harness.html bridge.js round.js)
  shots/               screenshots (output only)
```
**Run the asset and mocap tools in place, from `.cache/`.** They find the engine and the asset store relative to
their own folder, so copies in `tools/` would miss both:
- `node .cache/engine/dist/handoff/tools/asset-find.mjs "<words>"`
- `.../asset-set.mjs` (§12.6)
- `.../asset-sheet.mjs $PWD/src/24-shapes.js#<id>` (keep `24-shapes.js` free of `FF`: it may only use `My3D2dge`)
- `node .cache/engine/tools/anim-set.mjs` (§12.4)
`npm install` in the dev folder is enough for every tool: Node resolves `playwright` up the folder tree from
`.cache/` to the dev folder's `node_modules`.

### 3.4 The dev page
`index.html` copies the handoff template's page: the `e3-boot` splash markup at the start of `<body>`, the canvas
`#screen`, then one `<script src>` per file. `session.js` goes first in `<head>`, right after `<meta charset>`
(§16.2). Next come the `hub:` meta tags, then in the body the engine, mocap/readable.js, mocap/mocap.js, the anim
set, the store props, and `src/*.js` in order. Opening it from `file://` must play the whole game.

### 3.5 The bundle (`node build.mjs`)
1. Read `index.html`. Replace each `<script src="X"></script>` with `<script>` + the file's text + `</script>`.
   Escape every `</script` inside a file's text as `<\/script` (the engine and the anim set contain strings that need
   it). Keep `session.js` byte-identical apart from that wrapper, and keep it the first script in `<head>`.
2. Inline `src/about.json` as `window.FF_ABOUT = {...}`, and write `../exit-interview.json` from the same object
   (§23), so the About screen and the file can never disagree.
3. Write `../AmericanFootballFiasco-AmericanFootball-claude-opus-5-5-max-20261103-174831.html`. Expect about 2 MB.
4. Print the size and the SHA-256 of the bundled `session.js` part, and check that it matches the vendor file.

The bundle needs no network. Don't use CDN dependencies: everything is already local.

### 3.6 Engine changes to make (log each in ENGINE-CHANGES.md)
Keep the changes small and general. Each one is an engine feature a future game would want too.

| # | Change | Where (in `my-3d2dge.js` v0.85.2) | Why |
|---|---|---|---|
| E1 | Add the glyphs `✕ ○ □ △` to the 5×7 font `G57` and the 3×5 `GLYPHS` | the PIXEL FONT section (search `const G57 =`) | `input.label()` returns `'✕'` and similar for a PlayStation pad, but the pixel font draws `?` for them |
| E2 | The `glyphs` setting defaults to `'playstation'`, its options are `[['playstation','PlayStation'],['xbox','Xbox']]`, and it shows on the Settings screen under a "Controller" heading as well as on the Controls screen | the standard settings table (search `glyphs: { group: 'Controller'`) and `Shell._settingsRows` | TASK.md: PlayStation glyphs, with a Settings option for Xbox |
| E3 | A **gear hook** on the HD Humanoid: `o.gear(api)` called in `_drawHD` just before `ops.sort(...)`, with `api = { g, view, Sp, S, Q, J, C, u, cap, limb, push(d, fn), rig }` | `_drawHD` (search `ops.sort((a, b) => a.d - b.d)`, the first one) | Facemasks, shoulder pads, jersey numbers, the carried ball, pom-poms and mascot heads, depth-sorted inside the rig |
| E4 | A `'football'` hat style in `Humanoid._hat`: a shell 1.12× the head, a center stripe (`h.stripe`), an ear logo dot (`h.logo`), and a grey facemask of 2 bars plus a vertical bar in front of the face | `_hat` (search `st === 'helmet'`) | A helmet that reads as football from every view |
| E5 | `E.Dialog`'s `voice` may be a function: `voice(ch, i, text, dialog)` is called for each newly typed letter instead of `audio.sfx(voice)` | `Dialog.update` (search `if (this.voice && Math.floor(this.shown) > prev`) | The Animalese voice synth (§13.4) |
| E6 | Audio buses: `audio.bus(name)` returns a GainNode under the master that follows mute and volume, and its volume follows a setting (`voices`, `crowd`) | the AUDIO section, after `_init` | Voices and the crowd bed need their own sliders and long-lived nodes |
| E7 | `Shell.show(name, { rows: [settingKeys] })`: any screen may list settings rows, and settings in a group whose name starts with `Dev` never show on the standard Settings screen | `Shell._render` (search `if (name === 'settings') this._settingsRows(add);`) and `_settingsRows` | The Dev mode's live sliders (§17) reuse the engine's slider rows |
| E8 | `game.menu('settings', { pause: false })` opens Settings without pausing | where `game.menu` is defined | In a hub session the world must not freeze when one player opens Settings (§16.6) |
| E9 | 10-foot Shell theme: an option `new E.Shell(game, { scale: 1.6 })` that scales the Shell's CSS (fonts, buttons, sliders, panel widths) by a factor, with `clamp()` by viewport | `SHELL_CSS` and the Shell constructor (or inject your own stylesheet with selectors stronger than `.esh`) | The standard pause, settings and controls screens are built for a desk at 14 px. A TV at 10 feet needs about 24 px or more. |

Anything else you change, log it the same way. After the engine changes, `node tools/check.mjs` on the handoff's
`kits/sports.html` must still pass. Keep a copy of the untouched handoff in `.cache/` to diff against.

---

## 4. Architecture

### 4.1 Principles
1. **The sim and the presentation are split.** The match simulation (`FF.sim`) owns athletes, the ball, rules and the
   clock in world units. It never reads a rig, a camera or the DOM. The presentation (rigs, camera, HUD, FX,
   commentary, audio) reads the sim's state and its events. This gives fast headless tests (presentation off), network
   clients that only render, and replays.
2. **Everything that controls an athlete makes intents.** Humans (pad, keyboard, mouse), the AI, network clients, the
   attract director and test bots all produce the same intent object per athlete per step (Appendix A.6). The sim
   consumes intents and nothing else.
3. **Content is data.** Teams, rosters, formations, plays, stadiums, cards, story chapters, cutscenes, drills,
   commentary lines and tuning are plain data objects in `src/1x-data-*.js`, checked by a validation test. A designer
   adds a team, a play or a chapter without touching code. This is the "built out later with normal designer tools"
   requirement.
4. **One scenario system.** A *scenario* (Appendix A.5) sets up any game situation: stadium, teams, score, clock,
   down and distance, weather, cheats and a scripted sequence. Story chapters, practice drills, the attract mode, the
   Dev mode's situation jumper and the tests all use it.
5. **Events, not hooks everywhere.** The sim emits events on `FF.bus` (Appendix D). Commentary, the crowd, FX,
   replays, stats, the Fiasco Meter, Hot Streak, cards and boss specials listen. Adding a card never touches the
   tackle code: the tackle code asks the bus for modifiers (`FF.bus.mod('tackle.p', value, ctx)`).
6. **Deterministic.** The engine's fixed 1/120 s step. All gameplay randomness comes from `FF.rng.sim` (a seeded
   `E.rng`) and cosmetic randomness from `FF.rng.fx`. Never call `Math.random` in the sim. With the same seed and
   inputs, a match plays out the same. Tests rely on this.

### 4.2 Namespace and file pattern
`src/00-boot.js` creates `window.FF = { E: My3D2dge, game, rng, bus, data: {}, ... }`. Every other file is an IIFE:
`(() => { 'use strict'; const E = My3D2dge, FF = window.FF; ... FF.Crowd = ...; })();`. Files only read what earlier
files defined, and `90-main.js` starts the game. In Node tests, `window` is the vm context (kits/test.mjs pattern).
Guard every browser-only global (`matchMedia`, `navigator`, `document`) with `typeof` checks.

### 4.3 Modules (load order)

| File | Responsibility | Key exports |
|---|---|---|
| `00-boot.js` | the `E.Game` (`res: 'ps1', expand: true`; `menu: { items, settings, controls, quit }` with `items` a function of the current scene, which gives Dev Mode and, in exhibition and practice, Restart; `quit: 'menu'`, which the engine labels "Quit to menu" and confirms; in sessions `quit: false` and no items), the input map `FF.KEYS` (§9.1), settings definitions (§14.11), the RNG streams, the bus, hub detection (`FF.inHub = !!(window.AIHub && AIHub.active)`) | `FF.game`, `FF.KEYS`, `FF.rng`, `FF.bus` |
| `01-util.js` | math (yards ↔ world), angle helpers, intercept solver, segment distance, weighted pick, line-bank picker with no repeats, compact encoders for net | `FF.u` |
| `02-tuning.js` | every tunable with its default, range and group (§22), registered as `Dev …` settings (E7); `FF.T.get(key)` | `FF.T` |
| `10-data-teams.js` | 6 teams: colors, logos, rosters, stats, looks, mascots, coaches, AI personalities, stars and specials (§18.1) | `FF.data.teams` |
| `11-data-plays.js` | formations, offensive, defensive and special plays, kickoff and PAT choices (§18.3) | `FF.data.formations`, `.plays`, `.dplays` |
| `12-data-stadiums.js` | 5 stadiums (§18.2) | `FF.data.stadiums` |
| `13-data-cards.js` | 8 Fiasco Cards with their effects as bus listeners (§10.2) | `FF.data.cards` |
| `14-data-story.js` | chapters, cutscene scripts (E.Story nodes), halftime choices, rewards, loss lines (§15.1, §18.6) | `FF.data.story` |
| `15-data-drills.js` | the tutorial and practice drills (§15.2) | `FF.data.drills` |
| `16-data-lines.js` | commentary line banks per event, refs, QB cadences, crowd chants (§18.5) | `FF.data.lines` |
| `17-data-attract.js` | the attract director's segments (§15.4) | `FF.data.attract` |
| `20-audio-voice.js` | the babble voice synth and the speaker profiles (§13.4) | `FF.voice` |
| `21-audio-music.js` | songs, layers, stings, the sfx definitions, the crowd bed (§13) | `FF.music`, `FF.sfx`, `FF.crowdAudio` |
| `22-glyphs.js` | button chips per device and glyph setting; prompt strings (§9.3) | `FF.glyph` |
| `23-ui-kit.js` | 10-foot canvas UI: a focus grid with mouse hover, big buttons, cards, tabs, panels, comic bursts, the prompt strip, captions, toasts | `FF.ui` |
| `24-shapes.js` | the game's own `E.SHAPES` entries (§12.6) and its materials | — |
| `25-field.js` | the stadium builder: TileMap, floor painting, stands, goalposts, pylons, markers, sideline dressing, lights, weather (§5) | `FF.Stadium` |
| `26-crowd.js` | crowd agents, excitement, waves, signs, flashes (§11.4) | `FF.Crowd` |
| `27-rigs.js` | athlete and cast rig factory, the gear hook (§12.2), pose codes to rig drive (§12.3), the mocap player, PoseFX | `FF.Rigs` |
| `28-ball.js` | the football: held, thrown, kicked, loose; drawing the spiral, shadow and trails (§7.6) | `FF.Ball` |
| `30-sim.js` | the match: the state machine, rules, clock, possession, spotting (§6) | `FF.sim` |
| `31-sim-athletes.js` | athletes, movement, turbo, collisions, blocking contact (§7.1–7.4, §7.9) | |
| `32-sim-actions.js` | actions and their resolution: throw, catch, tackle, Big Hit, dive, spin, stiff arm, hurdle, strip, lateral, handoff, kick, late hit, pile-up (§7.5–7.8) | |
| `33-ai.js` | athlete brains and behaviors (§8.1–8.4) | `FF.ai` |
| `34-ai-coach.js` | CPU play calling, cards, 4th down, clock, difficulty, COACH SAYS (§8.5) | `FF.coach` |
| `35-control.js` | human control: assignment, switching, intents from devices, the mouse pointer on the field (§9) | `FF.control` |
| `36-ots.js` | the over-the-top systems: Hot Streak, Fiasco Meter, cards in play, boss specials, Dinged, helmets popping off, mascots, refs, lights-out (§10) | `FF.ots` |
| `37-camera.js` | the camera director and views (§11.1) | `FF.cam` |
| `38-replay.js` | the recorder, replay player and highlight reel (§11.2) | `FF.replay` |
| `39-commentary.js` | the announcer and on-field text pops (§11.3) | `FF.talk` |
| `40-fx.js` | hit FX, divots, confetti, fireworks, pyro, breath puffs, fire trails (§11.5) | `FF.fx` |
| `41-hud.js` | score bug, turbo, meters, prompts, captions, event text, receiver chips, kick meter (§14.6) | `FF.hud` |
| `50-scene-title.js` | title, attract trigger, touch-only gate | scene `title` |
| `51-scene-menus.js` | main menu, exhibition setup, controller assignment, team and stadium select, Hall of Fiasco, About/Credits | scenes `menu`, `setup`, `records`, `about` |
| `52-scene-match.js` | the match scene, which ties sim, control, AI, camera, HUD, play call, kicking, halftime, results and pause items together | scene `match` |
| `53-playcall.js` | the play-call UI (§14.5) | `FF.PlayCall` |
| `54-scene-story.js` | the story hub (the bracket board), the cutscene player, chapter intros and outros, rewards, ending and credits | scenes `story`, `cutscene`, `credits` |
| `55-scene-drills.js` | tutorial and practice drills | scene `drill` |
| `56-scene-attract.js` | the attract director and its overlay | scene `attract` |
| `57-scene-hubcard.js` | the AI Hub card and countdown (§16.3) | scene `hubcard` |
| `70-dev.js` | Dev mode: screens, sliders, toggles, situations, Play Lab, overlays (§17) | `FF.dev` |
| `80-net.js` | the AI Hub adapter: roles, messages, snapshots, prediction, loopback for tests (§16) | `FF.net` |
| `90-main.js` | registers the scenes, the boot steps, deep links (`#match`, `#drill/passing`, `#attract`, `#story/ch3`), `game.debug`, `game.start` | |

### 4.4 Scenes and the flow between them
```
boot ─▶ (AIHub.active?) ─yes─▶ hubcard ─▶ match(session) ─▶ (hub ends the round)
  └─no─▶ title ─(10 s idle)─▶ attract ─(any input)─▶ title
           └─▶ menu ─▶ story ─▶ cutscene ⇄ match / drill ─▶ credits
                    ├▶ setup (exhibition) ─▶ match ─▶ results (inside match) ─▶ menu
                    ├▶ drill (practice)   ├▶ records   ├▶ about   └▶ Options (game.menu('settings'))
```
Gameplay scenes (`match`, `drill`) are `pausable: true`, except in hub sessions (§16.6). Their pause menu shows Resume,
**Dev Mode**, **Restart** (exhibition and practice only), then the standard Settings, Controls, Full screen, Help and
the engine's own "Quit to menu" (from `menu.quit: 'menu'`, with its confirmation). Titles, menus and cutscenes aren't
pausable, but the corner menu button opens Settings there.

### 4.5 One step of a match (`match.update(dt)`)
1. `FF.control.update(dt)`: device input to intents for human-held athletes, including mouse picks.
2. `FF.ai.update(dt)`: AI brains think at 20 Hz, staggered by athlete index, and emit intents every step from their
   current behavior.
3. In a hub session on the host, `FF.net.applyRemote()` writes remote players' intents and predicted positions.
4. `FF.sim.step(dt, intents)`: phase timers, athlete movement and actions, collisions and blocks, the ball, contacts
   (tackles, catches, recoveries), boundaries, rules and the clock. It emits events.
5. `FF.ots.update(dt)`, then `FF.replay.record()`.
6. Presentation, skipped headless when `FF.fast` is set: `FF.Rigs.update(dt)`, `FF.cam.update(dt)`,
   `FF.Crowd.update(dt)`, `FF.talk.update(dt)`, `FF.hud.update(dt)`.
7. In a hub session, `FF.net.send()` on its own clock (§16.5).

`draw(r)`: stadium floor and walls, decals (field lines of scrimmage, the pass target marker, divots), shapes and
props, the crowd, athletes (`r.actor`, with `{ pick: athleteId }` for the mouse), the ball, refs and sideline cast, FX,
lights, the HUD in `r.overlay`, the play-call UI, then captions.

### 4.6 The `game.debug` handle (for tests and tools)
```js
game.debug = {
  snapshot(),            // { scene, mode, phase, clock, quarter, score, down, toGo, los, possession, ball: {state, x, y, z, holder},
                         //   athletes: [{ id, team, pos, x, y, z, pose, ctl }], controlled: { p1: id, ... }, events: last 10, errors }
  scenario(spec),        // load a scenario (A.5) now
  cheat(name, on),       // godMode, infiniteTurbo, forceCatch, forceFumble, forceINT, noTackle, cpuVsCpu, ...
  playLab(off, def, n),  // run n headless plays of off vs def, return stats (§8.6)
  skipCutscene(), finishGame(winnerSide), setClock(s), setScore(h, a), giveCard(side, id), setHot(athleteId),
  fast(on),              // presentation off for speed (headless only)
};
```
`tools/check.mjs` prints `snapshot()` after its run.

---

## 5. World, units and the stadium

### 5.1 Units
**One yard is one tile, 16 world units.** The engine's own scale is 16 units = 1 m and a 26-unit hero, so players
(about 1.9–2.2 yd tall at rig sizes 1.2–1.45) and the store's props stay in proportion. z is always up. Angles are
radians, 0 east. `FF.u.yd(n) = n * 16`.

### 5.2 Field geometry
- The playing field is 100 yards between the goal lines, plus 10-yard end zones, so 120 × 53 yards.
- The TileMap is 128 columns × 70 rows. Columns 0–3 are outside the left end, 4–123 are the 120 field yards (end
  zones at 4–13 and 114–123), and 124–127 are outside the right end.
- Rows from the top: 0–7 are the far stands (8 tiers), 8–11 the far sideline area, 12–64 the 53 field rows, and 65–69
  the near sideline (benches, cheerleaders, photographers, chain gang).
- World constants (in `25-field.js`): `END_L = 64` (the left end line, x), `GOAL_L = 224`, `GOAL_R = 1824`,
  `END_R = 1984`, `SIDE_T = 192` (the far sideline, y), `SIDE_B = 1040` (the near sideline, y), `MID_Y = 616`.
- Yard lines run every 5 yards. Numbers every 10 sit 12 yards in from each sideline. Hash marks every yard sit at
  `MID_Y ± 3 yd` (arcade hashes, close to the middle). A team abbreviation is painted in each end zone, and the home
  logo at midfield.
- The ball spot after a play: x where the ball was when it died, y clamped to the hashes.
- A team attacking right has `dir = +1`; attacking left, `dir = -1`. Field position "own 20" for a team attacking right
  is x = `GOAL_L + 20*16`. `FF.sim.yardline(x, side)` converts both ways.
- Goalposts sit at each end line (x = END_L, END_R; y = MID_Y): a base post, a gooseneck 1 yd toward the field, the
  crossbar at **53** units (10 ft), and uprights **99** units apart (18.5 ft) rising **160** above the bar. Draw them
  with `r.queue` lines like the SPORTS kit's posts, 2 px wide, in yellow `#ffd84a` with a `#c89a1a` shaded side. They
  are drawn, not shapes, because they need exact proportions and a hit test for kicks.
- Pylons sit at the 4 goal-line and 4 end-line corners (shape `pylon`, §12.6).

### 5.3 The TileMap
- Legend: `.` grass (floor tag `grass`), `e` end zone (`endzone`), `s` sideline (`sideline`), `m` mud (`mud`), `i` ice
  (`ice`), `,` outside (`outside`), and `1`–`8` the stand tiers (wall types 11–18).
- Wall types 11–18: heights 14, 26, 38, 50, 62, 74, 86, 98, each 1 tile deep, with
  `cut: true, cutH: 8` so reversed and rotated views see past them. Faces and roofs come from the stadium
  (`face: 'plank'` bleachers at Tumbleweed, `'stone'` concrete at the Mega Dome, `roof: 'slab'`).
- Tiers rise away from the field. Row 7, the front row next to the far sideline area, is type 11 (h 14), and each row
  further back is one type higher, up to row 0 = type 18 (h 98). A stadium with N tiers (§18.2: 3 to 8) fills rows
  8−N to 7. The row behind its top tier (7−N) is the back wall, and any rows above that are `outside`.
- Behind the top tier is a back wall (type 19, h 120) with banners (props) and, by stadium, a scoreboard or jumbotron
  shape.
- Side stands behind each end zone (columns 0–3) are 4 tiers (types 11–14), so an end zone view has a crowd too.
- `outside`: the stadium's ground color beyond the map. The sky comes from an `E.Backdrop` drawn first in `draw`
  (mesas, bayou trees, a skyline, mountains with the northern lights, the dome's ceiling truss). It shows above the
  far stands when the camera looks high.

### 5.4 Floor painting (`floorTex(x, y, tag)`)
- Grass in mown stripes 5 yards wide, alternating two greens per stadium, with per-pixel noise (`E.hash2`,
  `E.noise2`), like the SPORTS kit's floor.
- White paint for yard lines (a band 1.2 units wide), hashes (0.8 yd long), and the sidelines and end lines (2 units).
  Numbers are the 5×7 font's digit bitmaps scaled to 2.5 yd tall, sampled per world pixel. End-zone letters and the
  midfield logo work the same way from their bitmaps (§12.8).
- Mud (`mud` tag and noise blotches) is brown and wet-dark. Ice is pale blue with streaks. Divots are decals added at
  runtime (§11.5).
- Night stadiums: `[r, g, b, glow]` texels make the Afterglow Arena's yard lines glow. A wear pass darkens the grass
  between the hashes.
- The floor bakes once per view (engine behavior). View changes (Kick Cam, replays) rebake. That's fine: cut, don't
  rotate continuously (§11.1).

### 5.5 Dressing per stadium
Each stadium (§18.2) lists its props: shapes and `r.prop`s on the far sideline (benches, coolers, the Gatorade-style
cooler table, TV cameras, light towers at the 4 corners), the near sideline (team benches, the cheerleader squad, the
mascot, the chain gang with down markers that move to the line of scrimmage and the line to gain, photographers),
behind the end zones (pyro cannons, banners, a parked pickup or an airboat), and the backdrop layers. Aim for 3–8
props on any screen (the API's look target). Light towers carry `lights: [...]` that light the field at night.

### 5.6 Views
| Id | Made as | Used for |
|---|---|---|
| `broadcast` | `new E.View('broadcast', 'Broadcast', 0, 50, 1, 1)` | the default for play |
| `sky` | `new E.View('sky', 'Sky Cam', 0, 65, 1, 1)` | option (V cycles; Settings, Camera) |
| `blimp` | `E.VIEWS.topdown` | option |
| `kickcam` | `new E.View('kickcam', 'Kick Cam', ±90, 32, 1, 1)`, turned so the kick goes up the screen | FGs and PATs (and kickoffs from behind the kicker for 1.2 s) |
| `field` | `new E.View('field', 'Field Level', 0, 25, 1, 1)` (the brawler pitch) | replays, celebrations, cutscenes on the field |
| `iso` | `E.VIEWS.iso` | replays |
| `reverse` | `new E.View('reverse', 'Reverse Angle', 180, 45, 1, 1)` | replays (the far stands cut low) |

Steer with `game.view.screenDirToGround(mx, my)`, so pushing up always means up the screen in every view, including
the Kick Cam. `E.charView` draws rigs from a lower angle in pitch 40–89 views automatically, and that's wanted.

---

## 6. Football rules and the match flow (`30-sim.js`)

### 6.1 The match state machine
```
COIN_TOSS ─▶ KICKOFF_SETUP ─▶ KICK_LIVE ─▶ (DEAD) ─▶ PLAYCALL ─▶ PRESNAP ─▶ LIVE ─▶ DEAD ─▶ ...
DEAD branches: score ─▶ CELEBRATE ─▶ [REPLAY] ─▶ PAT_CALL ─▶ PAT ─▶ KICKOFF_SETUP
               turnover / downs ─▶ PLAYCALL (other side)    quarter end ─▶ QUARTER_BREAK
               halftime ─▶ HALFTIME ─▶ KICKOFF_SETUP        end of regulation, tied ─▶ OVERTIME ─▶ ...
               final ─▶ FINAL (results)
```
- **COIN_TOSS** (1.5 s): the home mascot flips a giant coin (cosmetic). The winner is `FF.rng.sim`'s, or the
  scenario's. The winner receives.
- **PLAYCALL**: both sides choose on the play-call UI (§14.5). The CPU chooses after a human-like 0.6–1.4 s delay.
  The timer is `T.playcallTime` (12 s). When it runs out, the COACH SAYS play is picked. Kicking situations show the
  special cards.
- **PRESNAP**: athletes jog to their formation spots (1.2 s), then the line sets. The offense hikes with b1. The CPU
  hikes after 0.5–2.0 s. A human gets an auto-hike when `T.autoHike` (8 s) runs out, with a visible play clock from
  5 s. The defense's human may move their defender behind the line. The QB barks his cadence (§13.4).
- **LIVE**: the play. It ends with a **dead ball**: a carrier down (tackled, or a knee or body touching the ground
  after a dive), out of bounds, an incomplete pass, a score, a pile-up resolved, a kick dead (touchback, out of
  bounds, downed), or a kneel.
- **DEAD** (1.2 s, or longer for presentation): refs signal, the chain gang moves, late hits are possible for
  `T.lateHitWindow` (1.2 s), then the spot and downs update.
- **CELEBRATE** (after a TD, 3.5 s, skippable with b1): the scorer's dance (§10.6), pyro, the crowd, the announcer.
  Then **REPLAY** if the Replays setting allows (§11.2).
- **PAT_CALL**: KICK XP (1 point, the snap from the 15) or GO FOR 2 (a normal play from the 3).
- **QUARTER_BREAK** (1.5 s, a card "END OF THE 1ST"). Teams switch ends only at halftime.
- **HALFTIME**: story mode plays the locker-room cutscene with an adjustment choice. Exhibition shows the halftime
  show (cheerleaders, band, mascot; 6 s, skippable) and 4 stat tiles. A hub session gets a 3 s card.
- **OVERTIME**: tied after Q4. A coin toss, then sudden death: the first score wins, with a period of
  `T.quarterLength`. Still tied after it: exhibition ends in a TIE; story chapters say "That's a FIASCO!" and offer a
  rematch; a hub round finishes tied (every player in one standings array).
- **FINAL**: the whistle, the winners cheer (`pose: 'cheer'`) and the losers kneel. Then the results screen (§14.8).

### 6.2 Downs, distance and spotting
- First and **20** (`T.yardsToGo`, 10–30). Gain the distance within 4 downs for a new set. Otherwise it's a turnover
  on downs at the spot.
- Forward progress is the ball's x when the play dies. A dive gains to where the ball lands.
- An incomplete pass puts the ball back at the previous spot.
- A loss behind the line counts against the distance. "2ND & 27" is legal and funny.
- Goal to go: when the line to gain is past the goal line, show "& GOAL".
- The first-down line (yellow) and the line of scrimmage (blue) are drawn on the field as decals, broadcast style.

### 6.3 Scoring
| Score | Points | After |
|---|---|---|
| Touchdown: the ball carried over the goal line (the ball's x), or caught in the end zone with both feet in (simplified: the catch point inside it) | 6 | CELEBRATE, then PAT_CALL |
| Extra point kick | 1 | kickoff |
| Two-point conversion (any play from the 3) | 2 | kickoff |
| Field goal (between the uprights and over the bar, §7.8) | 3 | kickoff by the scoring team |
| Safety (the carrier downed in his own end zone) | 2 | the team that gave up the safety kicks off from its own 20 |
| Defensive TD on an INT or fumble return | 6 | as a touchdown |

### 6.4 Kicks
- **Kickoff** from the kicking team's 30. Choices: DEEP (meter power 0.6–1.0 gives 50–70 yd), SQUIB (a low bouncer of
  30–40 yd that is hard to field), ONSIDE (10–14 yd, high bounce; recovery is a scramble, §7.7).
- **Receiving:** the returner auto-catches when under the ball within 1.2 yd. A ball caught in the end zone becomes a
  **touchback** at the 25 if the returner presses b1 (take a knee) or stays in the end zone for 1.5 s. A kick out of
  bounds puts the ball at the receiving team's 40.
- **Punt:** a long snap to the punter 12 yd deep, then the meter. A return, or a fair catch: the returner presses b1
  before the catch. A ball into the end zone is a touchback at the 20.
- **FG / PAT:** a snap to the holder 7 yd deep, a 0.35 s plant, the kick. The Kick Cam (§11.1). Rushers can block a
  kick if one reaches within 1.2 yd of the kick point before contact (`T.blockChance` 0.6).

### 6.5 The clock
- Quarters of `T.quarterLength`: 2:00 in exhibition (a setting: 1:00, 1:30, 2:00, 3:00, 5:00), set per chapter in
  story mode, 1:30 in hub rounds.
- The clock runs during live plays. After an in-bounds play that wasn't a score, an incompletion or a turnover, it
  runs `T.runoff` (10 s) more (the huddle), but not in the last 30 s of a half.
- It stops for the play-call screen and every presentation beat. The play-call timer is separate (12 s).
- Hurry-up: in the last minute of a half the music tempo rises 8% (`audio.tempo`) and the announcer counts down.
- The clock never goes below 0. A play that starts at 0:01 is played out. At 0:00 the quarter ends when the ball is
  dead.

### 6.6 Turnovers and possession changes
- **Interception:** the defender has the ball live and can return it. Control flips (§9.4).
- **Fumble:** the ball goes loose (§7.7). Whoever recovers has possession. A recovery by the defense is live (can be
  returned). A recovery by the offense is live too (arcade).
- **Lateral or backward pass:** legal any time. A bad lateral that hits the ground is a loose ball (a fumble).
- **Turnover on downs:** the other side takes the ball at the spot.
- After a change of possession, the line of scrimmage, `dir` and the down reset for the new offense.

---

## 7. Athletes, movement and actions

### 7.1 Ratings
Each athlete has ratings 1–10: `SPD` speed, `ACC` acceleration and agility (cuts, spins), `STR` strength (blocking,
breaking tackles), `HND` hands (catching, ball security), `TCK` tackling, `ARM` throw power, `AIM` throw accuracy,
`AWR` awareness (AI reaction and reads), `KCK` kicking (power and steadiness). Team ratings on the team-select screen
are 4 bars averaged from the roster: PASS, RUN, DEFENSE, SPECIAL.

### 7.2 Movement
- Top speed in units/s = `T.speedBase` (92) + SPD × `T.speedPerSpd` (7), so SPD 2 is 106 (about 6.6 yd/s, a lineman)
  and SPD 10 is 162 (10.1 yd/s, Zap Zapata).
- Carrying the ball costs −4%. Backpedaling (moving against `facing` by more than 100°) costs −35%.
- Acceleration = `T.accelBase` (520) + ACC × 30 units/s². Braking is 900. Turn rate is 9 rad/s at speed and 16 rad/s
  slow (`E.approachAng`).
- **Turbo** (the `turbo` action, held): × `T.turboMult` (1.25) speed and × 1.3 acceleration. It drains `T.turboDrain`
  (0.45/s of a full bar) and regenerates `T.turboRegen` (0.22/s) when not held. Each dead ball refills +35%.
  Big Hits need turbo ≥ 0.15 and cost 0.15. Every athlete has a bar; the HUD shows the bars of human-held athletes.
- Surfaces: `mud` × 0.85 speed and × 0.7 acceleration, dives slide 1.5× farther. `ice` × 0.7 grip: velocity
  approaches the desired one at half the rate (slides), and cuts are wider. Snow weather × 0.95 speed. These come from
  the floor tag under the athlete (`map.floorAt`).
- Bodies are `E.Body` (r 6; linemen r 7.5; gravity 700) with `body.update(dt, map)` for z, jumps and the stands.
  The sim sets `vx, vy` from intents each step.

### 7.3 Collisions between athletes
- Circle against circle every step for every pair (91 pairs at 14 athletes; no hash needed). Separate along the
  normal in proportion to the inverse of mass (mass = 1 + STR × 0.15; linemen get +0.6).
- Teammates push gently. Opponents push hard: no overlap.
- An overlap with the ball carrier during LIVE is a **contact** and may start a tackle (§7.5). An overlap between a
  blocker and a rusher starts an **engagement** (§7.9).
- Refs and sideline cast don't collide with the sim. Refs are pushed aside cosmetically and fall comically if a play
  runs through them (§10.8).

### 7.4 The action system
Each athlete has at most one action at a time: `{ id, t, dur, phase, data }`. Actions lock movement as their table
says, set the athlete's **pose code** (Appendix C) for the presentation, and resolve at their key moment.

| Action | Who | Input | Duration | Key moment and effect |
|---|---|---|---|---|
| `hike` | C | the offense's b1 in PRESNAP | 0.25 s | the ball to the QB (shotgun: an arc in 0.3 s; under center: in hand) |
| `handoff` | QB → RB | automatic on run plays at the play's `handoffT` | 0.35 s | the ball changes hands when within 1.2 yd; a pitch or toss is a short arc |
| `throw` | QB | a receiver button, or a click on a receiver | 0.28 s wind + release | the ball's flight (§7.6); with turbo held, a Rocket Pass |
| `dive` | carrier | b1 | 0.45 s air + 0.6 s down | a lunge of 2.5 yd at 1.4× speed; the ball spot is where he lands; the play ends (down) unless he's in the end zone, which is a TD |
| `spin` | carrier | b3 | 0.32 s | evade window 0.0–0.22 s: a contact from a tackler that isn't behind him (angle > 110° from his facing) misses; speed × 0.8 during the spin; cooldown 0.8 s |
| `stiffArm` | carrier | b2 | 0.4 s | a tackler in front (within 60° of facing, within 1.8 yd) gets the break chance + `T.stiffBonus` (0.35); on a break the tackler stumbles (0.6 s down) |
| `hurdle` | carrier | b4 | 0.55 s (`body.jump(260)`) | airborne: low dives (`dive`, `tackleDive`) pass under him; a standing tackler isn't evaded |
| `lateral` | carrier | lb or rb | 0.25 s | pitch to the nearest teammate behind or beside him (within 100° of the backward direction, ≤ 9 yd), a 0.35–0.6 s arc; a bad lateral (no teammate in range) is thrown to the nearest spot and is a loose ball |
| `tackleDive` | defender | b1 (the AI decides when, §8.4) | 0.45 s lunge + 0.7 s down on a miss | contact with the carrier during the lunge resolves a tackle (§7.5) |
| `bigHit` | defender | turbo + b1 | 0.35 s lunge at 1.6× speed | as a tackle with `T.bigHitBonus` (+0.12) and a fumble roll × 3; a miss is 1.0 s down |
| `strip` | defender | b3 | 0.3 s | within 1.2 yd of the carrier: fumble chance `T.stripChance` (0.12) − HND × 0.01; otherwise a whiff |
| `jump` | any | b4 | 0.5 s | a jump for a catch, an INT or a swat: +16 units reach height and +6 catch radius for the ball arriving during 0.12–0.42 s |
| `diveCatch` | receiver | b1 while the ball is in the air | 0.45 s | +10 catch radius for low balls (arrival z < 12); he ends on the ground |
| `kick` | K or P | the meter (§7.8) | 0.6 s | the ball's flight from the meter's power and accuracy |
| `lateHit` | anyone | b1 within `T.lateHitWindow` after the whistle, an opponent within 2 yd | 0.5 s | cosmetic knockdown, crowd boos and cheers, the announcer's outrage, the "Late hits" stat |
| `celebrate` | scorer | auto or b2/b3/b4 | 3.5 s | dance (§10.6) |
| `getUp` | anyone downed | auto | 0.6–1.0 s | back on his feet |

Inputs are buffered for 0.15 s (`input.buffered` + `consume`) so a press slightly early still happens.

### 7.5 Tackle resolution
When a tackler's lunge, or an engaged contact, touches the carrier (centers within r1 + r2 + 4):
```
p = T.tackleBase (0.62) + 0.03*TCK(t) - 0.015*STR(c) - 0.012*ACC(c)
  + (fromBehind ? 0.15 : 0) + (bigHit ? T.bigHitBonus : 0) + (carrier diving or hurdling ? +0.25 : 0)
  + bus.mod('tackle.p', ctx)    // cards, Hot Streak, Dinged, specials, difficulty
p = clamp(p, 0.15, 0.97)
```
- Evasions are checked first: a spin's window, a stiff arm's frontal break, a hurdle against a low dive.
- Success: the carrier goes down (pose `TACKLED`, falling the way the tackle pushed him), the ball is dead where it
  is, and the tackler lands on him. On a **Big Hit**, the carrier is launched along the hit direction at
  `T.bigHitLaunch` (180 u/s) and up at 150 u/s (pose `FLY`). Hit-stop 0.08 s, shake 4, a comic "BOOM!" (§11.3).
  The fumble roll is `T.fumbleBase` (0.03) × (bigHit 3) × (rain or snow 1.6) × (1 − HND × 0.05) + mods. A fumbled
  ball comes loose at the moment of the hit (§7.7).
- Failure: the tackler's lunge carries on and he lands (0.7 s down; 1.0 after a Big Hit). The carrier loses 25% of
  his speed for 0.3 s (a stumble) and gets a "BROKEN TACKLE!" pop when he was going ≥ 60% of top speed.
- **Gang tackles:** 2+ tacklers in contact within 0.3 s get +0.18 each beyond the first.

### 7.6 The ball (`28-ball.js`)
States: `held` (by an athlete), `snap`, `pass`, `kick`, `loose`, `dead`.
- **Held:** at the holder's carry point (sim: 6 units in front of the hip at z 14). The presentation draws it at the
  rig's hand through the gear hook (§12.2).
- **Pass:** analytic flight. At the throw, pick the target point P = the receiver's predicted position at the arrival
  time (iterate twice: t = d / speed). Speed by type: lob `T.lobSpeed` (240) + ARM × 8 u/s along the ground, bullet
  (Rocket Pass) `T.bulletSpeed` (400) + ARM × 10. Height at release is 30, and the ball aims to arrive at chest
  height (z 20): `E.arc({ x, y, z: 30 }, { x: P.x, y: P.y, z: 20 }, T.passGravity (300), { time: t })` gives the
  velocity. Passes use their own gravity, 300 (loose balls use 600), so the arcs read well. A 30-yd bullet (about
  1.2 s) peaks about 3 yd up, and a lob (about 1.6 s) about 6 yd up, a rainbow over the defender.
  - **Accuracy:** P gets a gaussian offset with σ = `T.aimError` (0.035) × distance × (1.3 − AIM × 0.06) × (pressure:
    a rusher within 2 yd 1.6; throwing on the run 1.25) + mods.
  - **Max range:** `T.maxPass` (55 yd) + ARM × 1.5 yd. Beyond it the ball is short.
  - **In flight:** the ball spins (draw the spiral, §12.7). A marker shows the landing point on the ground for the
    receiving team's human and the defending human (an X in team color, with a ring that shrinks as it nears).
  - **Arrival** (the ball at z ≤ 34 near P): resolve the catch (§7.7). If no one is in range, or the ball hits the
    ground, the pass is incomplete (a bounce: a short random-direction `loose` bounce for 0.6 s, cosmetic, dead).
- **Kick:** analytic flight to the landing point the meter gives, by `E.arc(from, landing, T.kickGravity (260),
  { apex })`, with apex `T.kickApex` (punts 260, kickoffs 220, FGs and PATs 150, squibs 20, onside 60). The hang time
  follows: a punt is about 2.8 s. A high kick may leave the top of the screen. The KICK shot zooms out to 0.75, and
  the shadow and landing marker keep the ball readable. On landing it goes `loose`: the `E.Body` ball, bounce 0.45,
  with friction. A football bounces erratically, so on each bounce add a random ±25° turn and ±30% speed from
  `FF.rng.sim`.
- **Loose:** an `E.Body` (r 3, bounce 0.45, gravity 600) with erratic bounces as above. Players dive at it (§7.7).
- Out of bounds (y outside the sidelines, or past an end line) kills the ball at the crossing point. A kick out of
  bounds follows §6.4.

### 7.7 Catches, interceptions, deflections, fumbles and pile-ups
**Catch resolution** at arrival. Candidates are athletes whose reach covers the ball. The horizontal distance must be
≤ `T.catchRadius` (14) (+6 jumping in window, +10 diving), and the arrival height must be ≤ reach (34 standing, 50
jumping). For each candidate:
```
offense: pc = T.catchBase (0.66) + 0.03*HND - 0.22*(defenders within 14) - (bullet ? 0.10 : 0)
             + (jump in window ? 0.08 : 0) + bus.mod('catch.p')        // Glue Gloves, Butterfingers, Hot Streak
defense: pi = 0.10 + 0.035*HND + (jump in window ? 0.12 : 0) + (in front of receiver ? 0.10 : 0) + bus.mod('int.p')
```
- Order the candidates by distance to the ball. Each nearest defender rolls first: INT with `pi`, else a
  **deflection** with 0.35 (the ball pops up to z 20–40 with a random velocity and can be caught again).
- Then the receiver rolls `pc`: a catch, or a **drop** ("DROPPED!", the ball bounces dead).
- Cheats and specials can force outcomes: `forceCatch`, `forceINT`, Golden Spiral (no INT).
- A catch gives the receiver the ball live with his velocity kept (catch and run). Control follows (§9.4).

**Fumbles and loose balls.** The ball pops out with a velocity away from the hit plus up 60–110 u/s. Every athlete
within `T.pileRadius` (5 yd) of the ball gets the brain behavior `recover` (dive at the ball). Humans dive with b1.
- The first athlete whose dive or feet touch the ball while z ≤ 6 gets a **recovery**. Rolled, not instant: if 2+
  athletes are within 1.5 yd at that moment, a **pile-up** starts.
- **Pile-up** (1.6 s): every athlete within 2.5 yd of the ball dives in (poses `PILE`, stacked by z offsets), a dust
  or mud cloud, the camera punches in, the crowd "OOOH". Then the ref "digs" (comic) and signals possession, a roll
  weighted by each piler's distance to the ball when it started (closer is more likely) and STR. "WHO'S GOT IT?! ...
  THE FIASCOS HAVE IT!"
- A loose ball that goes out of bounds belongs to the team that last had it.

### 7.8 Kicking and the kick meter
A 3-press meter in screen space near the kicker (§14.7):
1. b1 starts the needle sweeping a power bar. It rises at `T.meterSpeed` (1.4 sweeps/s), then falls back.
2. b1 again sets the **power** (0–1). Past 0.95 is the red zone: +5% distance but the accuracy needle runs 1.5×
   faster.
3. The accuracy needle sweeps across a center band. b1 sets **accuracy** (−1..1). |acc| ≤ the band
   (`T.accBand` 0.12; Super Foot ×2.5) is straight; otherwise the kick hooks by acc × 9° (FG) or acc × 14° (punt
   and kickoff).
- Before step 1 the stick aims: ±15° for punts and kickoffs, ±4° for FGs (the Kick Cam shows the aim line).
- Distance: FG = 25 + power × (25 + KCK × 1.6) yd, so KCK 7 at full power is about 61 yd, before wind. Punt: 30–55
  yd. Kickoff: as §6.4.
- The FG test: when the ball reaches the end line's x, it's good if y is between the uprights (±49.5) and z > 53.
  A ball off an upright (within 3 units) bounces "DOINK!" and is no good (or good if it falls inside: roll it).
- CPU kickers: power and accuracy from KCK and difficulty, plus gaussian noise (σ 0.08 / 0.10).
- A mouse left click, b1 and Space all press the meter.

### 7.9 Blocking
- **Engagement:** a blocker and a rusher overlap, or come within 1.5 yd with the blocker facing him, which locks them
  as a pair: they hold 0.8 yd apart, facing each other.
- **Contest:** each step the pair moves together with velocity `T.blockPush` (18 u/s) × (STR_r − STR_b +
  rushMoveBonus + (turbo ? 2 : 0)) toward the rusher's goal (the QB or the carrier) when positive, or the blocker's
  drive direction when negative. Run blocks add the blocker's drive (+1.5).
- **Shed:** the rusher sheds when his shed timer runs out. `shedTime = T.shedBase (1.9 s) × (STR_b / STR_r) ×
  rand(0.7, 1.3)`, or ∞ under Brick Wall. On a shed the rusher gets a 0.3 s burst (×1.2) toward his target, and the
  blocker staggers 0.3 s. A human rusher can mash b3 (□) to cut his timer by 0.12 s per press (a swim move; max 6).
- **Pancake:** when STR_b − STR_r ≥ 3, a 15% roll on engagement knocks the rusher down for 1.2 s. "PANCAKE!"
- Pass blocks mirror the most dangerous unblocked rusher in the blocker's zone (left, middle, right). Run blocks
  follow the play's assignment (§8.2).
- A human-controlled lineman (co-op, or by switching) moves freely. Engagement then happens on contact.

---

## 8. The AI (`33-ai.js`, `34-ai-coach.js`)

### 8.1 Brains and behaviors
Every athlete not held by a human (or by a remote player) has a brain. A brain picks a **behavior** from its play
assignment and the phase, re-thinks at 20 Hz (staggered: `(step + index) % 6 === 0`), and every step turns the current
behavior into an intent (a move vector, turbo, presses). Reaction delays come from `AWR` and difficulty: an AI sees a
**delayed** world. It reads other athletes' positions from a 0.1–0.4 s history buffer, which makes cutbacks, jukes
and play fakes work against it.

| Behavior | Role | What it does |
|---|---|---|
| `formation` | all, PRESNAP | jog to the formation spot, face the line, take the stance |
| `passBlock(zone)` | OL, RB on some plays | hold a spot 1.5–2.5 yd in front of the QB in his zone, mirror the most dangerous rusher there, engage |
| `runBlock(target, drive)` | OL, WR, TE | engage the assigned defender and drive him along `drive`, or climb to the 2nd level |
| `pull(path, then)` | G on sweeps and counters | run the path, then lead-block the first defender in front of the carrier |
| `route(points, after)` | WR, RB | run the waypoints (cut sharply: brake to 60% at a break, 0.12 s), then `after`: `settle` (find the nearest hole in the zones, face the QB), `scramble` (work toward the sideline the QB scrambles to) or `block` |
| `carry(path)` | the carrier | follow the play's path while it's open, then **free running**: score 16 directions each 0.1 s, `forward·w1 − Σ threat(defender) − sideline penalty − crowding`, where threat = closing speed / distance² for defenders within 8 yd; pick the best with hysteresis; turbo when no defender is within 4 yd or one is closing from behind; evasive moves, below |
| `qbPass(drop, reads)` | QB | drop back to the play's spot. From `readT` (0.6–1.0 s) read the receivers in order. **Openness** = the distance from the nearest defender to the receiver's arrival point, minus 8 per defender within 3 yd of the pass lane. Throw to the first receiver with openness > `T.aiOpen` (3 yd; by difficulty) whose route is ≥ 40% done. At 2.8 s, or with a rusher within 2 yd, throw to the best, scramble if the best is < 1 yd open, or throw it away out of bounds (Pro and Fiasco difficulty). Scramble: `carry`, and still look to throw while behind the line. |
| `qbRun` | QB on sneaks and the run fakes of draws | his part of the play script |
| `rush(gap)` | DL, blitzers | attack the gap toward the QB, engage blockers, try to shed; once free, `pursue` the QB; when the QB throws, `pursue` the ball |
| `manCover(target)` | DB, LB | keep a cushion of `T.cushion` (2 yd, smaller near the goal line) on the goal side of the target, matching his speed with the reaction delay; when the ball is in the air, break to the arrival point after the reaction delay and jump when within 2 yd as it arrives |
| `zoneCover(zone)` | DB, LB | drop to the zone center; pick the most threatening receiver inside (zone radius + 3 yd), weighted by depth and how open he is; shadow him; release him when he leaves; the ball in the air is as above |
| `spy(QB)` | LB | mirror the QB at 5 yd; when the QB crosses the line, `pursue` |
| `pursue(carrier)` | all defenders, once there is a carrier past the line, a scramble, or a return | head for the intercept point: the smallest t with `|c + v_c·t − d| ≤ speed_d·t`, solved in 0.05 s steps up to 3 s, with the angle limited by the sideline. Tackle decision below |
| `kickCover(lane)` | the kicking team | sprint downfield in lanes 6 yd apart, then `pursue` the returner |
| `returnBlock` | the receiving team | form a wedge of 3 in front of the returner's lane; engage the nearest coverage man |
| `recover` | everyone near a loose ball | dive at the ball (§7.7) |
| `celebrate`, `dejected`, `idle` | after the play | poses (§10.6) |

**Evasive moves for an AI carrier.** When a tackler is within 1.6 yd and closing: against a diving tackler, hurdle
with chance 0.25 + ACC × 0.03; against a frontal one, stiff arm with 0.2 + STR × 0.03; against one from the side,
spin with 0.2 + ACC × 0.03. One move per 0.8 s. Difficulty scales these.

**The tackle decision (AI tacklers).** With a reachable carrier, dive when the distance is under 1.8 yd and the angle
to his predicted position is under 35°. Use a Big Hit when turbo ≥ 0.15 and a roll of 0.2 + TCK × 0.03 passes (×1.5
when Hot). Otherwise keep pursuing to contact (a wrap-up on contact counts as a tackle attempt with −0.08).

### 8.2 Play assignments (data to brain)
`FF.data.plays[id].assign[slot]` (Appendix A.2) is read when PRESNAP ends:
- Offense: `{ block: 'pass' | 'run', zone, target, drive }`, `{ pull: [[x, y], ...], then: 'lead' }`,
  `{ route: [[x, y], ...], after: 'settle', read: n }`, `{ carry: [[x, y], ...], handoffT }`, and the QB's
  `{ drop: [x, y], reads: ['WR2', 'WR1', 'RB'], readT, fake }`.
- Defense: `{ rush: 'A' | 'B' | 'C' | 'contain' }`, `{ man: 'WR1' | 'WR2' | 'RB' | 'C' }`,
  `{ zone: { at: [x, y], r } }`, `{ spy: 'QB' }`.
- Play coordinates are in **yards** from the ball spot: x downfield (+ is the offense's attacking direction), y
  across (+ is the offense's right). Mirroring (FLIP) negates y. Defense coordinates use the same frame (x is the
  distance past the line toward the defense's own goal). The sim converts with `dir`.
- Targets in defense assignments point at offensive slots. If the offense's formation lacks a slot, fall back to
  zone `[8, 0], r 7`.

### 8.3 Special teams brains
Kick coverage, wedge returns, the punt shield (3 blockers in front of the punter for 1.5 s), FG protection
(pass-block in place) and the FG rush (all-out `rush`; 2 jumpers in the middle `jump` at the kick).

### 8.4 Difficulty
| | Rookie | Pro | Fiasco |
|---|---|---|---|
| CPU reaction delay | 0.38 s | 0.24 s | 0.13 s |
| CPU tackle p × | 0.85 | 1.0 | 1.12 |
| CPU QB openness threshold | 4.5 yd | 3 yd | 2 yd |
| CPU kick noise × | 1.5 | 1.0 | 0.6 |
| CPU coverage cushion × | 1.3 | 1.0 | 0.85 |
| Catch-up assist (`T.rubberBand`): when the human trails by ≥ 14, his team gets +0.05 catch, +0.04 tackle and −0.04 to the CPU's | on | off | off |
Story chapters set a difficulty per chapter (§15.1), scaled by the Difficulty setting.

### 8.5 The coach AI (play calling, cards, decisions)
- **Situation features:** down, distance, field position, score difference, time left, quarter, and the opponent's
  last 5 play types (Fiasco difficulty only).
- **Offense:** start from the team's tendency weights (`ai.run`, `ai.pass`, `ai.trick`, §18.1), then apply the
  situation rules in order:
  - 3rd/4th & 10+ means pass deep or mid (×2.5).
  - Less than 3 to go means run, sneak or quick passes (×2).
  - Goal to go inside the 5 means GOAL LINE runs, slants and fades.
  - In the last 1:00 while trailing: sideline routes (Quick Outs, Out & Up) ×3, and get out of bounds.
  - Leading by 9+ in the last 2:00: runs and kneels.
  - 4th down: field goal if the kick is ≤ `T.cpuFgRange` (45 yd) + KCK. Go for it if the distance is ≤ 3 and the ball
    is past midfield, or if trailing late. Punt otherwise. A 5% fake punt roll on 4th & ≤ 5.
- **Defense:** counter the offense's tendency (blitz on 3rd & long ×1.8, goal line inside the 3, prevent while
  leading late), with 20% randomness so the CPU can be read only roughly.
- **Cards:** the CPU uses a card when its trigger matches (§10.2) and it holds one. At most one card per 3 plays.
- **PAT:** go for 2 when down by 2, 5, 9, 10 or 12 after the TD in the second half. Otherwise kick.
- **COACH SAYS:** run the offense logic for the human's side, and mark the top pick with a star badge on the
  play-call screen. If the human doesn't choose, it plays when the timer runs out.

### 8.6 The Play Lab (an AI quality tool and test)
`FF.dev.playLab(offPlay, defPlay, n, { seed, teams, difficulty })` runs n plays headless and fast (presentation off)
from midfield on 1st & 20, both sides CPU. It returns `{ avgYards, completion, sacks, ints, fumbles, tds, avgTime,
maxTime, stuck }`, where `stuck` counts plays over 25 s or an athlete idle more than 3 s while LIVE.
**The bands it must stay in** (every offensive play against each of the 8 non-kick defenses, n = 30, Pro, Fiascos vs
Mudhogs):
- Nothing is `stuck`, and every play ends within 25 s.
- A pass play's completion, averaged over the 8 defenses, is 35–85% (HAIL MARY 5–40%), and its sack rate is under
  25%.
- A run play averages 1.5–9 yd over the 8 defenses.
- No play averages over 25 yd over the 8 defenses (no unstoppable play), and no defense holds every play under 1 yd
  (no unbeatable defense).
In the browser the Dev menu runs the same lab on screen with debug overlays (§17).

---

## 9. Controls and human control (`35-control.js`)

### 9.1 The input map (`FF.KEYS`)
A custom preset (scene `input: FF.KEYS`). The order matters: `Input.halfKeys` gives a shared-keyboard half its 6
buttons in this order. The engine's standard `confirm`/`cancel` are redefined so J and K don't mean menu
confirm/cancel.
```js
FF.KEYS = {
  up: E.Input.DEFAULT.up, down: E.Input.DEFAULT.down, left: E.Input.DEFAULT.left, right: E.Input.DEFAULT.right,
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'Space', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  b1: ['Space', 'KeyK', 'Pad0'],   // ✕ / A    hike, dive, tackle, kick meter, pick
  b2: ['KeyL', 'Pad1'],            // ○ / B    stiff arm, switch player, back
  b3: ['KeyJ', 'Pad2'],            // □ / X    spin, strip, flip play
  b4: ['KeyI', 'Pad3'],            // △ / Y    hurdle, jump, catch, Fiasco Card
  turbo: ['ShiftLeft', 'ShiftRight', 'Pad7'],   // R2 / RT
  lb: ['KeyQ', 'Pad4'],            // L1 / LB  lateral, previous tab
  rb: ['KeyE', 'Pad5'],            // R1 / RB  lateral, next tab
  r1: ['Digit1'], r2: ['Digit2'], r3: ['Digit3'], r4: ['Digit4']   // keyboard: throw to receiver 1-4
};
```
Check `E.Input.DEFAULT` for the exact move codes (WASD, the arrows, the d-pad, `PadAxis*`). The Controls screen names
them with `menu.controls: { b1: 'Hike · Dive · Tackle · Kick', b2: 'Stiff arm · Switch player', b3: 'Spin · Strip ·
Flip play', b4: 'Hurdle · Jump · Catch · Card', turbo: 'Turbo', lb: 'Lateral · Tab left', rb: 'Lateral · Tab right',
r1: 'Throw to receiver 1', ... }`.

### 9.2 The control table by context
| Context | Action | PlayStation | Xbox | Keyboard | Mouse |
|---|---|---|---|---|---|
| Menus | move the focus | d-pad / left stick | d-pad / left stick | arrows / WASD | hover moves the focus |
| | select | ✕ | A | Enter / Space | left click |
| | back | ○ | B | Esc / Backspace | the on-screen BACK button |
| | tabs | L1 / R1 | LB / RB | Q / E | click a tab |
| Play call | pick the play | ✕ | A | Enter / Space | click a card |
| | flip it | □ | X | J | click FLIP |
| | Fiasco Card | △ (opens the card row) | Y | I | click a card slot |
| Pre-snap, offense | hike | ✕ | A | Space | click the QB |
| Pre-snap, defense | move your defender | stick | stick | WASD | — |
| | switch defender | ○ | B | L | click a defender |
| QB behind the line | throw to receiver ✕ ○ □ △ | ✕ ○ □ △ | A B X Y | 1 2 3 4 (or K L J I) | click a receiver |
| | Rocket Pass | hold R2 + a receiver | RT + | Shift + | Shift + click |
| | scramble | stick (+ R2) | stick (+ RT) | WASD (+ Shift) | — |
| Ball carrier | turbo | R2 | RT | Shift | — |
| | dive | ✕ | A | Space | — |
| | stiff arm | ○ | B | L | — |
| | spin | □ | X | J | — |
| | hurdle | △ | Y | I | — |
| | lateral | L1 / R1 | LB / RB | Q / E | — |
| Ball in the air, offense | jump catch | △ | Y | I | — |
| | diving catch | ✕ | A | Space | — |
| Defense, live | switch to the defender nearest the ball | ○ | B | L | click a defender |
| | tackle (dive) | ✕ | A | Space | — |
| | Big Hit | R2 + ✕ | RT + A | Shift + Space | — |
| | jump, swat, intercept | △ | Y | I | — |
| | strip | □ | X | J | — |
| | swim move (while blocked) | □ repeatedly | X | J | — |
| After the whistle | late hit | ✕ | A | Space | — |
| Kicking | aim | stick ← → | stick | A / D, ← / → | — |
| | the meter (3 presses) | ✕ | A | Space | left click |
| Kick return in the end zone | take a knee | ✕ | A | Space | — |
| TD celebration | pick a dance | ○ □ △ | B X Y | L J I | — |
| Holding a boss star | his special (§10.5) | L1 + R1 together | LB + RB | Q + E | — |
| Anywhere | pause | Options | Menu | Esc / P | the corner menu button |
| Anywhere | change the camera view | — | — | V | — |
The mouse wheel zooms the camera within the scene's range (engine standard, `camera: { zoom: [.7, 1.4] }`).

### 9.3 Prompts that follow the device
- `FF.glyph.chip(g, x, y, action, { player, scale, device })` draws a button chip for that player's last device
  (`input.lastDevice`):
  - **Gamepad, PlayStation** (the default): a dark disc with the symbol drawn as pixels in its classic color: ✕ blue
    `#7aa8ff`, ○ red `#ff6a6a`, □ pink `#ff8ad8`, △ green `#5ae0a0`.
  - **Gamepad, Xbox** (Settings, Controller, Button symbols): colored discs with letters: A green, B red, X blue,
    Y yellow.
  - Shoulders and triggers are rounded rectangles labeled L1, R1, R2 or LB, RB, RT. Options/Menu are small pills.
  - **Keyboard:** a keycap (a light rectangle with a darker bottom edge) with `input.label(action, 'keyboard')`. Wide
    caps for SPACE and SHIFT.
  - **Mouse:** a mouse icon with the left or right button lit, used where the mouse does that context's job (clicking
    a receiver, a card, the kick meter). Elsewhere the keyboard chip.
  - Labels come from `input.label(action, device)` after rebinding. Never hard-code a key. Map the engine's label to
    a chip style: glyph labels (`✕ ○ □ △ A B X Y L1 ...`) are pad chips, everything else is keycaps.
- The receiver chips over receivers' heads show b1–b4 on a pad, r1–r4 (1–4) on a keyboard (b1–b4 on a shared-keyboard
  half), and a mouse cursor badge on the hovered receiver.
- **The prompt strip** (bottom right, 1–5 chips with words, §14.6) shows the current context's actions only: "✕ HIKE",
  then "✕ ○ □ THROW · R2 ROCKET", then "□ SPIN ○ STIFF △ HURDLE ✕ DIVE R2 TURBO". It changes the moment the context
  changes. Each local player's strip sits in their own corner.

### 9.4 Who controls whom
- **Offense, one human:** the QB through the snap. After a handoff or pitch he controls the carrier. After a throw he
  controls the **target receiver** (camera and control follow the ball). After a catch, the catcher.
- **Offense, two humans (co-op):** player A has the QB, then the ball. Player B picks a receiver at the play call
  (□ cycles the highlighted receiver on his panel; default WR1) and runs it himself; the route line shows as a guide.
  If B's receiver catches the ball, B has the ball and A takes the nearest teammate (to block). Otherwise B keeps his
  receiver (to block downfield).
- **Defense:** each human controls one defender. At PRESNAP the first human gets the S (a safety sees the whole play
  and can roam) and the second gets LB1, both of which can be moved before the snap. During the play, b2 or a click
  switches to the free defender nearest the ball (on a pass in the air: the one nearest the landing point). With the **Auto-switch** setting (on by default), a
  pass in the air or a carrier past the line switches each defensive human to the best unheld defender, with 0.5 s
  hysteresis.
- **Turnovers:** at an INT or a fumble recovery, the humans of the side that gained the ball take the carrier (the
  first human) and the nearest teammates. The other side's humans take their nearest defenders.
- **Kicks:** the kicking human runs the meter. The receiving human controls the returner.
- **Hub sessions:** the same rules, keyed by seat (§16.4).
- A ring under each held athlete in the player's color (local: `E.PLAYER_COLORS`; sessions: the seat color), and a
  tag over him ("P1", or the hub name) during PRESNAP and for 1 s after each switch.

### 9.5 The mouse on the field
- Every athlete is drawn with `r.actor(..., { pick: athleteId })`. Each step, `r.pick(...input.pointer())` gives the
  hovered athlete. Hovering a receiver while QB highlights his chip, and a left click (`input.clicked()`) throws to
  him (Shift held: a Rocket Pass). Hovering a defender on defense outlines him, and a click switches to him.
- Pre-snap on offense, a click on the QB or the ball hikes.
- During the kick meter, a click anywhere presses it.
- Clicking open ground does nothing in play. A click is never bound to b1, which avoids accidental hikes and dives.
- The pointer hides after 2 s without mouse movement. `input.lastDevice` switches back to the keyboard on the next
  key.

---

## 10. The over-the-top systems (`36-ots.js`)

### 10.1 Hot Streak ("BLAZING!")
- **Big plays** are: a TD, a catch of 20+ yd, a run of 15+ yd, a sack, an INT, a forced fumble, and a Big Hit that
  tackles. Each athlete keeps a heat count. +1 per big play by him. It resets when the opponents make a big play
  against him (a sack of that QB, a tackle for a loss on that carrier, a pick of that QB) or when they score.
- At heat 3 he goes **BLAZING** for `T.hotPlays` (6 plays), or until a reset event happens:
  - unlimited turbo, +12% speed;
  - offense: tackle p −0.15 against him;
  - defense: tackle p +0.15, Big Hit fumble ×2;
  - a QB: aim error ×0.6 and fire-trail passes;
  - visuals: fire particles at his feet and shoulders (`particles.fire` every 0.05 s, emissive), a flaming ball while
    he has it, an orange light on him at night;
  - audio: the music's `hot` layer comes in (`audio.layer('hot', 1, .5)`), the crowd chants, the announcer's
    `hotStreakOn` lines.
- A team can have 2 blazing athletes. The HUD shows a flame icon by his name and a heat pip count (1–3) on held
  athletes' tags.

### 10.2 The Fiasco Meter and the Fiasco Cards (the items)
**The Fiasco Meter** is the title's mechanic: every disaster is an opportunity. Each team's meter (0–100) fills when
things go wrong for it:

| Event | Fill |
|---|---|
| fumble lost | 35 |
| INT thrown | 35 |
| safety allowed | 40 |
| sacked | 20 |
| turnover on downs | 25 |
| opponent's TD | 20 |
| dropped pass | 10 |
| Big Hit received | 10 |
| late hit received | 5 |

When it fills, the team **draws a Fiasco Card** at random from its pool (story: the cards you've unlocked;
exhibition: all 8), up to 3 held. Then the meter resets. A HUD flourish plays: a card flips in, "FIASCO BREAK!".
Each team also starts a game with cards: story, a loadout of up to 3 picked on the chapter screen; exhibition, 1
random card each; hub rounds, 1 each, dealt from `AIHub.rng('cards')`.

**Using a card:** on the play-call screen press b4 (△) to open the card row and pick one (or click a slot). One card
per play. A card on offense needs an offensive card and so on; a card that doesn't fit the side is greyed out. Its
effect lasts as its text says. Cards are data: `{ id, name, side: 'off' | 'def' | 'any' | 'kick', text, art,
apply(ctx) }`. `apply` registers bus modifiers for the play or for N plays. The CPU trigger is in §8.5.

| Card | Side | Effect | CPU uses it when |
|---|---|---|---|
| ROCKET CLEATS | off | your carrier and receivers +20% speed this play | 3rd & 10+, or trailing in the last 2:00 |
| GLUE GLOVES | off | your receivers can't drop the ball; contested catches +30% this play | a pass play on 3rd or 4th down |
| BRICK WALL | off | your blockers can't be shed for 3.5 s | a pass play on 3rd & long |
| HOT SAUCE | any | the held athlete (CPU: its best player) goes BLAZING for 3 plays | first chance in the 2nd half |
| MEGA HIT | def | this play's first tackle is a Mega Hit: launch × 1.6, fumble chance 60%, the slow-mo cam | 3rd down defense, or the opponent in the red zone |
| BUTTERFINGERS | def | opposing receivers' catch chance −35% this play | 3rd & long defense |
| MASCOT MAYHEM | any | your mascot runs on as a 12th player for the play: he blocks the nearest defender on offense, rushes the passer on defense, with `noClip` through blockers. The announcers lose their minds. | trailing by 7+ |
| SUPER FOOT | kick | the next kick: +15 yd, an accuracy band ×2.5, the power needle ×0.7 speed | a FG of 45+ yd, or a PAT in the last minute |

### 10.3 Big Hits, Mega Hits, Dinged and the flying helmet
- **Big Hit:** turbo + b1 (§7.4–7.5). Hit-stop 0.08 s, `game.shake(4)`, `game.hitFx` with an impact star, grass, mud
  or snow bits, a camera punch-in to 1.25× for 0.35 s, slow motion (`timeScale` 0.4 for 0.3 s, honoring reduce
  motion), a comic "BOOM!" / "WHAM!" / "KER-RUNCH!" burst over the hit, and the crowd "OOOOH".
- **Mega Hit** (the card, or a 1-in-6 roll of a Blazing Big Hit): launch × 1.6, the victim spins in the air (PoseFX
  spin), hit-stop 0.12, the slow-mo cam (`timeScale` 0.25 for 0.6 s), a white flash (`game.flash`, honoring the
  flashes setting).
- **Dinged:** the victim of a Mega Hit, or of 2 Big Hits in one drive, is Dinged for 2 plays: −10% speed and little
  cartoon stars orbiting his helmet (3 tiny glints circling, emissive).
- **The flying helmet:** on a Mega Hit (and 25% of Big Hits) the victim's helmet pops off as a separate bouncing
  prop: a shape `helmet` in team colors, an `E.Body` with bounce 0.5. His hair shows until the next PRESNAP, when he
  picks it up (cosmetic). The announcer says "HIS HELMET IS IN A DIFFERENT AREA CODE!"

### 10.4 Late hits
After the whistle, for 1.2 s, b1 near an opponent does a late hit (cosmetic knockdown). The refs throw their caps
(Fiasco rules: no flags). A crowd reaction, the announcer's outrage lines, a stat. AI athletes late-hit too, by team
personality (the Mudhogs often, the Dynasty sneakily).

### 10.5 Boss specials (story bosses; also in exhibition)
Each special is used by the AI, or by a human holding that star (in exhibition or a hub round), who presses **lb and
rb together** (L1 + R1, LB + RB, Q + E) within 0.1 s while its conditions hold. A single shoulder press waits those
0.1 s before it becomes a lateral, so the chord never laterals by accident. For the Golden Spiral, press the chord,
then a receiver button within 1 s. A badge shows "SPECIAL READY" on the star's tag. NIGHT VISION is passive.

| Star | Special | Rules |
|---|---|---|
| BIG BERTHA BOUDREAUX (Mudhogs RB #44) | **MUDSLIDE** | once per drive: for 1.2 s she lowers her shoulder; the first tackler in front is bowled over (down 1.2 s) unless it's a Big Hit from the front; mud spray FX |
| LUMEN LOPEZ (Owls QB #1) | **NIGHT VISION** | always on: his reads see 1 extra yard of openness, and his aim error ×0.8 |
| ZAP ZAPATA (Owls WR #11) | **AFTERBURNER** | once per play: a 1.0 s burst at ×1.35 speed that leaves neon light trails (`ghost` afterimages in cyan) |
| AVALANCHE (Yetis DE #99) | **SNOWPLOW** | once per drive: his engagement drives the blocker straight back at 3× push for 1.5 s; a snow spray |
| BROCK STERLING III (Dynasty QB #12) | **GOLDEN SPIRAL** | once per drive: a perfect pass, no aim error, it can't be intercepted (defenders may still deflect it with 0.15), gold sparkle trail |
| THE MOUNTAIN, MALU FALEOLO (Dynasty LB #55) | **SEISMIC SACK** | once per half, when within 3 yd of the carrier: he leaps (0.6 s) and slams down; everyone within 2.5 yd is knocked down; a shockwave ring (`particles.ring`), shake 7, "SEISMIC!" |
The commentary has lines for each, and the HUD shows a banner with the star's portrait for 1.2 s when one fires.

### 10.6 Celebrations
After a TD the scorer celebrates. Locally the scorer's human picks one: b2 the Charleston, b3 the Body Roll, b4 the
Helicopter (breakdance). Otherwise it's random by personality, from the list below. In hub sessions it's always
random (no player-triggered emotes, §16.6).

| Celebration | How it's animated |
|---|---|
| Spike | a throw-down attack spec, the ball bounces high |
| Charleston, Body Roll | mocap `Dance Charleston` / `Dance Body Roll` |
| Helicopter | mocap `Breakdance_Helicopter` |
| Backflip | mocap `Backflip` |
| Fist pump | mocap `Victory Fist Pump` |
| Stands Dive | he leaps into the end zone stands: `body.jump`, the crowd lifts him, bodies bob |
| Group Huddle Dance | 3 nearest teammates do `Dance_Loop` in a ring |

Teammates near him do `Cheering_Two_Hands`. Defenders kneel (`pose: 'kneel'`) or put their hands on their helmets
(PoseFX). Pyro cannons fire, confetti falls (`particles.bits` in team colors from z 160), the crowd goes wild.

### 10.7 Mascots
Each team has a mascot on the near sideline: a Humanoid in team colors with a big costume head drawn by the gear
hook (§12.2). They react: dance on scores, slump on turnovers, and do a backflip on a Big Hit. They flip the coin, and
run on with Mascot Mayhem (`noClip`, a cartoon dust cloud, a squeaky sfx). Fumbles the Flaming Tumbleweed sets
himself on fire when the Fiascos score (fire particles), and trips over the power cable in chapter 3 (§15.1).

### 10.8 Refs
Two refs on the field (an umpire 6 yd behind the defense, a back judge 20 yd deep) and a line judge on the near
sideline. They're cosmetic Humanoids in striped shirts (the gear hook draws the stripes), with poses for signals:
TOUCHDOWN (both arms up), FIRST DOWN (an arm pointing at the offense's goal), INCOMPLETE (arms crossing, a wave),
FUMBLE / POSSESSION (pointing), and "Sure, why not" (a shrug) after a late hit. A play running through a ref knocks
him over comically (the announcer: "AND THE REF GOES DOWN! HE'S FINE! HE'S... MOSTLY FINE!").

### 10.9 LIGHTS OUT (chapter 3's event; also a Dev toggle)
For 3 plays: `lights.ambient` 0.12, `darkness` 0.9, the light towers off. Every uniform's trim, the Owls' neon, the
ball, the yard lines and the Fiascos' glow paint (their trim turns `#7aff6a` with glow) stay bright as emissive (the
gear hook draws trims with `px.glow` and queues them `emissive: true`). Camera flashes in the crowd sparkle.
Commentary and the crowd play along, then the lights come back with a thunk and a flicker.

---

## 11. Presentation

### 11.1 The camera director (`37-camera.js`)
Our own smoothing (`E.smoothDamp` on x, y and zoom), `game.focus(x, y, z)` every update, `game.setZoom(z)`, and
`cam.bounds = v => map.bounds(v)`. The player's own zoom (wheel, `-` `=`) multiplies ours.

| Shot | When | Focus and zoom |
|---|---|---|
| PRESNAP | the formation | x = LOS + dir × 5 yd; y = the ball's y × 0.6 + MID_Y × 0.4; zoom 1.0 |
| RUN | a carrier | the carrier + v × `T.camLead` (0.35 s); zoom 1.05 |
| PASS_PRE | QB with the ball on a pass play | `cam.frame([qb, ...receivers within 30 yd], { margin: 40, zoom: [.62, 1] })` |
| BALL_AIR | a pass in the air | between the ball's ground point and its landing point, zoomed to fit both (min .62) |
| KICK | kickoffs and punts | follow the ball, zoom .75; on the catch, RUN on the returner |
| KICKCAM | FG and PAT | cut (`{ fade: 0 }` style, 0.15 s dissolve) to the `kickcam` view behind the kicker; follow the ball to the posts; hold 1.2 s on the result; cut back |
| PUNCH | a Big Hit or Mega Hit | zoom × 1.25 over 0.12 s, hold 0.25 s, ease back over 0.4 s |
| CELEBRATE | after a TD | the scorer, zoom 1.35 |
| CUTAWAY | after the celebration (50% of TDs) | pan up to the stands at the end zone for 1.2 s, zoom 1.2: "the crowd goes wild" |
| REPLAY | §11.2 | `field`, `iso`, `reverse` views at 0.5× and 0.35× |
| CUTSCENE | §15.1 | scripted tweens (`game.tween` on a camera target object) |
Views are fixed per shot. Never animate the yaw continuously: each new yaw rebakes the floor.

### 11.2 Instant replay and the highlight reel (`38-replay.js`)
- **Recording:** from the snap to 1 s after the whistle, at 60 Hz (every 2nd step), record a frame per entity:
  athletes `[x, y, z, facing, poseCode, poseU, flags]` (flags: carrying, hot, dinged, helmet off), the ball
  `[x, y, z, state, spin]`, refs and the mascot. Record presentation events with their time: hit FX, particles
  bursts, comic pops, sfx names, card banners. A 12 s ring buffer in `Float32Array`s.
- **Playback** is a REPLAY sub-state of the match scene. The sim is frozen and untouched. Rigs are driven from the
  frames (positions interpolated, velocity derived for the gait), the recorded events re-fire at their times, and
  the audio plays the sfx (the commentary doesn't repeat; the crowd bed stays). Shots: 1) the `field` view following
  the ball at 0.5× over the 3 s around the key moment; 2) the `iso` or `reverse` view at 0.35× for the impact. Then
  back to the live view.
- **The overlay:** a REPLAY badge with a blinking red dot, a VCR timecode, letterbox bars, "✕ SKIP" (b1 or a click
  skips). The music ducks.
- **Triggers:** a TD (when Replays is All big plays or Touchdowns only), a turnover, a Mega Hit, a Big Hit fumble, a
  play of 40+ yd, a FG of 50+ yd, a Seismic Sack, a Mascot Mayhem play. Setting: Replays: All big plays (default) /
  Touchdowns only / Off. In hub sessions: off.
- **Highlight reel:** the 5 most exciting clips of the game, by an excitement score (event priority × yards), are
  kept (8 s each). The results screen offers WATCH HIGHLIGHTS, which plays them back to back with captions
  ("Q2 3:12 — DOC DOBSON 48-YD TD RUN").
- **Invariant (tested):** the sim's state hash is the same before and after a replay.

### 11.3 Commentary and on-field text (`39-commentary.js`)
- **Two announcers:** CHET THUNDERBUNS (play-by-play: loud, excitable) and LOU "THE TOE" DIGGS (color: an ex-kicker,
  folksy, deadpan).
- **Events** have priorities (Appendix D): TD 10, turnover 9, Mega Hit 9, special 8, Big Hit 8, sack 8, long play 7,
  Hot Streak 7, mascot 7, FG result 7, late hit 6, card 6, drop 5, first down 4, incomplete 3, weather 2, idle
  chatter 1.
- **Rules:** at most one line per 2.5 s. A higher priority interrupts a lower one. On events of priority ≥ 7, CHET
  speaks and LOU answers 1.2 s later with chance 0.4. No line repeats within the last 8 for that event. Lines take
  variables (`{player}`, `{team}`, `{opp}`, `{yards}`, `{score}`).
- **The caption:** a non-modal box at the bottom left (keep clear of the prompt strip and the score bug). The
  speaker's portrait (`rig.drawPortrait` of the announcer rig: a headset and a blazer) and name, the text typed at
  45 chars/s with the babble voice (§13.4). It hides after its length / 15 + 1.5 s. The Commentary setting: On /
  Subtitles only (no voice) / Off.
- **On-field pops:** comic bursts in world space over the event: BOOM!, WHAM!, KER-RUNCH!, SACKED!, PICKED OFF!,
  FUMBLE!, PANCAKE!, BROKEN TACKLE!, DOINK!, BLAZING!, FIASCO BREAK!, SEISMIC!, DROPPED!. `E.font.title` with an
  outline over a jagged polygon burst (`px.poly`, 12 points with radii alternating 1 and 0.6). It scales from 0.4 to
  1.1 to 1.0 (`outBack`) and lasts 0.9 s. Anchor it with `r.w(x, y, z + 40)`.
- **Center text** for game events: TOUCHDOWN! (title scale 4 in the scoring team's colors with a shine sweep), FIRST
  DOWN!, TURNOVER!, SAFETY!, IT'S GOOD! / NO GOOD!, TOUCHBACK, 4TH DOWN, RED ZONE, TWO-MINUTE WARNING (if quarters
  are 2:00 or longer), LIGHTS OUT!

### 11.4 The crowd (`26-crowd.js`)
- **Fans** sit on the stand tiers: 2–3 per tile per tier (about 2,400 at the Mega Dome). Each is drawn like the SPORTS
  kit's fans (`r.queue` with 2–3 `px.rect`s: shirt, head, an optional hat), with the team colors by section (home
  sections, plus an away section by one end zone), and skin and hat variety from a seeded hash. 8% hold signs: a
  6×4 rectangle with a tiny-font word ("FIASCO!", "D!", "HOGS!", "HOOT!", "BRRR!", "$$$"). 5% have foam fingers.
- **Excitement E** (0–1): big events set it up, `T.crowdDecay` (0.15/s) brings it down. Above 0.6 the fans stand and
  bob. On a TD the scoring side's fans jump (+5 z). Below 0.2 they sway.
- **The Wave** rolls around the stands every 40–70 s when E is moderate and the home team leads: a sine wave of
  stand-ups moving 10 tiles/s.
- **Density** by stadium. Tumbleweed Field is 35% full until the story's ending, when it's 100%.
- **Camera flashes** at night: random 1-px white dots with tiny lights, more on big plays.
- **Audio:** the crowd bed and reactions (§13.3).

### 11.5 FX (`40-fx.js`)
- **Hits:** `game.hitFx(x, y, z, { power, angle })` with no damage number (leave `damage` out and check that none
  shows), `particles.impact`, surface bits (grass `#4a8a3a`/`#2e5a22`, mud `#5a3a1a`, snow `#f0f4ff`), dust, and white
  `particles.sparks` on helmet-to-helmet hits.
- **Divots:** on Big Hits and dives, a persistent decal of torn turf at the spot, up to 40 per game (the oldest fade).
- **Footprints** in snow and mud: small decals behind runners every 0.15 s, fading over 6 s, up to 200.
- **Breath puffs** at Frostbite: `particles.smoke` at each head every 1.2 s, on the cosmetic RNG stream.
- **Weather:** `game.weather = { kind: 'rain', amount: .6, wind: .2, lightning: .1 }` at the Hog Wallow;
  `{ kind: 'snow', amount: .7, wind: .3 }` at Frostbite; set in the match's `enter` (weather ends with the scene).
- **Celebrations:** confetti (`particles.bits` in team colors from z 160), fireworks in the sky
  (`particles.explosion(..., { debris: false, shake: 0 })` and colored rings at z 300+ over the end zone), pyro columns
  from the cannons (`particles.fire` + a light), streamers.
- **Trails:** a Hot Streak's fire on the ball and athlete, Afterburner's neon ghosts (`r.actor(..., { ghost })`), the
  Golden Spiral's gold glints.
- **Lights** (`game.lights.enabled = true` in every stadium):
  - Tumbleweed: dusk, `ambient` 0.62 warm, a low sun light from the west, string lights over the bleachers.
  - Hog Wallow: overcast, 0.55, lightning flashes from the weather.
  - Afterglow: night, 0.35, 4 light towers (radius 420, intensity 0.9) and colored neon lights.
  - Frostbite: 0.5, the northern lights tint the sky, towers.
  - Mega Dome: indoor 0.55, 6 spotlights sweeping on tweens, pyro lights.
  - Try GPU lighting (`game.enableGPU({ map })`, ground views) for soft shadows from the stands. The canvas fallback
    must look right too: set both ambients.
- **Shadows:** `r.shadow` under every athlete, and under the ball with a radius and alpha that shrink with its
  height. The ball's shadow is how players read a lob.

---

## 12. Art and animation

### 12.1 The look target (from API.md: use every step)
`res: 'ps1'` with `expand: true` (480×270 at 1080p, 427×240 at 1440p and 4K). Dressed HD characters 40–60 px tall
(sizes 1.2–1.45; bosses 1.6–1.8). A backdrop behind the stands. A textured field and stands. 3–8 props on screen.
Effects on every hit. Colors shaded with `E.tones`. Titles with `E.font.title`. Lights in every scene. Portraits in
every dialog. Compare screenshots with Metal Slug and Symphony of the Night, not NES games. `node tools/check.mjs`
gives look notes: act on every one.

### 12.2 Characters (`27-rigs.js`)
**Rig recipes by position** (`new E.Humanoid({...})`, `weapon: null`, `sleeves: 'short'`, `outfit: 'shirt'`,
`hat: { style: 'football', color, stripe, logo }` (E4)):

| Position | build | size | Notes |
|---|---|---|---|
| OL, DL | bulky | 1.38–1.48 | `shoulderHalf` +0.6, `torsoW` +0.6, a lean of 0.1 |
| LB | bulky or heroic | 1.3 | |
| RB | heroic | 1.22 | stocky: `limbW` +0.3 |
| WR, CB, S | heroic | 1.2 | lean: `limbW` −0.2 |
| QB | heroic | 1.25 | |
| K | heroic | 1.02 | the tiny kicker (a joke the announcer makes) |
| Bosses: Bertha 1.6, The Mountain 1.7, Avalanche 1.8 | bulky | | Avalanche has a beard (gear hook) and `eyeGlow` off |
| Refs | heroic | 1.15 | a cap (`hat: 'cap'`, white); stripes from the gear hook |
| Coaches | bulky or heroic | 1.2 | a cap and a headset (gear hook), a polo |
| Cheerleaders | heroic | 1.1 | `hair: 'ponytail'`, pom-poms (gear hook) |
| Mascots | bulky | 1.3 | a costume head (gear hook), team colors |
| Announcers (portraits only) | heroic | 1.2 | a headset, a blazer (`outfit: 'coat'`) |
| Story cast (Mama Pearl, Sterling, ...) | per character | 1.2 | §18.1 |

**The uniform from team colors:** `colors.cloth` is the jersey, `trim` the jersey trim (sleeve bands), `pants`,
`belt`, `boot` the cleats, `glove` the gloves, the hat color the helmet. Away teams wear white jerseys with
team-color trim, and home teams wear their color. Skin tones (`#f0c8a8 #e0b090 #c89070 #a87050 #6a4028 #4a2c18`) and
hair styles vary per player (data). Faces show: `face: { eyes: 'big' }` on story cast, default on athletes, and eye
black on athletes (gear hook).

**The gear hook (E3)** draws, depth-sorted inside the rig:
- **Shoulder pads:** a wide disc over each shoulder joint in the jersey color, with a darker rim. They sit over the
  torso, so the silhouette reads as football at a glance.
- **The jersey number:** 3×5 digits (`font: 'tiny'`, scale by `u`) in the trim color, on the chest when the torso
  faces the camera (`dot(facing, view.fx/fy) > .3`), on the back when it faces away (< −.3), hidden edge-on. Placed at
  `Sp(J.shC, ±torsoDepth, 0, -3)`.
- **The carried ball:** at the carrying hand, a brown ellipse with white laces (below), at the hand's depth + 0.02.
  The sim sets `rig.carry = 'R' | 'L' | null`.
- **Eye black,** a headset on coaches, pom-poms on cheerleaders (discs at the hands, team colors), ref stripes (black
  vertical lines over the torso).
- **Mascot heads:** a big disc 2.2× the head with features. Fumbles is a twig ball (brown line scribbles) with googly
  eyes. Hambone is a pink hog with a snout and ears. Hooty is an owl with neon eyes (glow). Abominable Al is a white
  fur ball with horns. Goldie is a gold lion with a mane.
- **Big Heads cheat:** `rig.o.headR × 1.9` live. Check it re-solves; if not, rebuild the rigs.
- **The Fiascos' glow paint** in LIGHTS OUT: the trims drawn with `px.glow(g, 1)` and an emissive queue.

### 12.3 Pose codes to animation (`FF.Rigs.drive(rig, athlete, dt)`)
The sim sets `pose` and `poseU` (Appendix C). The presentation maps each to rig inputs, from four sources: the
engine's procedural rig (velocity gait, `pose`, `expr`, `air`, `down`, `stance`, `run`, `flip`, `land`), `E.MOVES`
and attack specs, mocap clips (§12.4), and PoseFX (§12.5).

| Pose | Drive |
|---|---|
| IDLE, RUN | `rig.update(dt, { x, y, z, vx, vy, facing })`, the velocity gait; `sprint: true` with turbo |
| STANCE3 (linemen) | mocap `Land_Three_Point` held at its last key (a hand on the ground), `mocapW` 1 |
| STANCE2 (LB, WR, DB) | `pose: 'crouch'` blended 0.5, a lean of 0.25 |
| QB_UC / QB_SG | `pose: 'crouch'` 0.35 with the hands forward (an attack spec held), or upright with the hands at the chest |
| SNAP | a two-handed spec from low forward to between the legs, 0.25 s |
| DROPBACK | the gait backward (verify the backpedal in a filmstrip; if it looks wrong, turn `facing` 25° off the motion) |
| THROW | mocap `OverhandThrow`, `mocapMask: 'upper'` while moving (throwing on the run), time-scaled so the release lands on the sim's release frame |
| HANDOFF give / take | specs: the arm extends / both arms form a pocket |
| CARRY | the gait plus PoseFX `tuck` (the carrying hand to the chest side, the elbow in) |
| CATCH_READY, CATCH | a two-handed spec reaching to the ball's height (`z1` from the arrival height); `air: true` with a jump |
| DIVE, TACKLE_DIVE | PoseFX `tilt` forward 0→75° over 0.15 s, the arms forward (a two-handed `thrust`), `air: true`; on landing `down: 1` |
| SPIN | the `facing` passed to `rig.update` turned through a full circle over the action (`facing + 2π·u`, eased); don't write `rig.spin` (the rig's own field for attack spins) |
| STIFFARM | the `jab` move with the free hand, held 70% of the action |
| HURDLE | mocap `Run_Jump_Over`, time-scaled to the jump |
| BLOCK | mocap `Push_Loop` (`mocapMask: 'upper'`) + a lean of 0.2; feet from the gait |
| SHED / SWIM | `E.MOVES.hook` (an arm over) |
| BIGHIT | `E.MOVES.bash` + PoseFX `tilt` 25° |
| TACKLED | mocap `Fall_On_Face` (tackled from behind) or `Hit_Knockback` (from the front), then DOWN |
| FLY (a Big Hit victim) | PoseFX `tilt` back 70° + `roll` spin (Mega Hit), `air: true`, then DOWN |
| DOWN | `down: 1` |
| GETUP | mocap `Get_Up_Face_Down` or `Get_Up_From_Back`, by how he fell |
| PILE | `down: 1` + PoseFX random `tilt`/`roll` and a z offset (stacked) |
| KICK | `E.MOVES.kick` after a 3-step run-up |
| HOLD | `pose: 'kneel'` + a hand low forward |
| CELEBRATE(k) | §10.6 |
| CHEER | mocap `Cheering_Two_Hands` (teammates), `pose: 'cheer'` (refs and coaches) |
| DEJECTED | `pose: 'kneel'`, or PoseFX `handsOnHelmet` |
| REF_TD, REF_FD, REF_INC, REF_SHRUG | specs: both arms up, an arm pointing, arms crossing back and forth, a shrug |
| CHEERLEADER | mocap `Jumping Jacks` and `Cheering_Two_Hands`, alternating |
| COACH_YELL | `expr: 'shout'`, `pose: 'hips'`, the headset |
Faces act: `expr: 'shout'` on hits and celebrations, `'wince'` when hurt, `'smile'` when Blazing. Enemy specials
telegraph with a 0.25–0.35 s wind-up and a flash.

### 12.4 Motion clips (the FIASCO set)
Cut once, from the engine repository (§3.2):
```sh
node .cache/engine/tools/anim-set.mjs .cache/engine/src/mocap/sets/quaternius.js .cache/engine/src/mocap/sets/mesh2motion.js \
  .cache/engine/src/mocap/sets/cmu.js \
  --clips "QUATERNIUS:OverhandThrow,QUATERNIUS:Push_Loop,QUATERNIUS:Dance_Loop,Dance Charleston,Dance Body Roll,Victory Fist Pump,Cheering_Two_Hands,Breakdance_Helicopter,Run_Jump_Over,Dive_Roll,Fall_On_Face,Get_Up_Face_Down,Get_Up_From_Back,QUATERNIUS:Hit_Knockback,MESH2MOTION:Land_Three_Point,Jumping Jacks,Front_Kick,MESH2MOTION:Backflip" \
  --name FIASCO --credit "Quaternius (CC0), Mesh2Motion (CC0), CMU Graphics Lab Motion Capture Database (free for all uses)" \
  --out vendor/anim/fiasco-anim.js
```
This was run during planning. It writes 18 clips, 736 key poses, 222 KB. In the set the clips are named without the
`SET:` prefix (`lib.clip('OverhandThrow')`). A headless probe confirmed that each drives an HD Humanoid (bulky, 1.3) on
the handoff engine: `Land_Three_Point` ends with the hand at z ≈ 1 (a three-point stance), and `OverhandThrow` raises
the hand to z ≈ 28 and comes through. Use:
```js
const lib = Mocap.load(window.MOCAP.FIASCO);  Mocap.drive(rig, lib);           // once per rig
rig.mocap = lib.sample(lib.clip('OverhandThrow'), t); rig.mocapW = w; rig.mocapMask = 'upper';  // each step, before rig.update
```
Fade clips in and out with `mocapW` over 0.1 s. Never snap.

### 12.5 PoseFX (new animation by joint post-processing)
Wrap each athlete rig's `solvePose` (the API allows it): call the original, then apply the active transforms to
`rig.J` (all joints are in the rig's own frame: forward, right, up):
- `tilt(angle)` rotates every joint about the hip center around the right axis (forward dives, backward falls).
- `roll(angle)` rotates about the forward axis.
- `lift(dz)` raises everything.
- `tuck(side)` moves the hand and elbow of that side to fixed points by the chest (ball security).
- `handsOnHelmet` puts both hands at the head's sides.
Transforms blend with weights so they ease in and out. This is how Emberdeep makes its dodge roll (AI_GUIDE, Building
a big game).

### 12.6 New shapes (`24-shapes.js`) and store props
Write these as `E.SHAPES` entries (docs/ASSETS.md format; 16 units = 1 m; face south). Look at each with
`node .cache/engine/dist/handoff/tools/asset-sheet.mjs $PWD/src/24-shapes.js#<id>` and fix its lint notes:
`pylon` (orange foam 2×2×7), `cone` (an orange traffic cone on a base), `dummy` (a red tackling dummy, r 4, h 22),
`sled` (a blocking sled with two pads), `cooler` (an orange sports-drink cooler with a white lid and spigot), `cups`
(a stacked paper cup tower), `teamBench` (a long bench, `params: { len }`, a team-color material slot), `lightTower` (a
lattice tower h 200, a lamp bank in a glow material, `lights`), `oldScoreboard` (Tumbleweed's hand-flipped board;
digits drawn by code), `jumbotron` (a big dark screen on a pylon; the content drawn by code into its projected quad:
the score and "MAKE SOME NOISE!"), `downMarker` (an orange pole with a flip card; the down drawn by code),
`chainPole`, `tvCamera` (a camera on a tripod), `podium`, `micStand`, `locker` (a metal locker 10×6×30 with vents and a
team-color door), `chalkboard` (on an easel; X's and O's by code), `trophy` (the Fiasco Cup: a gold lathe cup with
handles and a football on top), `pickupTruck`, `waterTower` ("TUMBLEWEED JCT" by code), `airboat`, `neonSign` (glow
letters by code), `snowbank` (snowy rock lumps), `pyroCannon`, `blimp` (a flattened ball with fins, drawn at z 300+),
`stage` (a ceremony stage with bunting), `cake` (a tiered victory cake), `bulldozer` (yellow, blade, tracks),
`goldCart` (a gold golf cart), `grill` (a tailgate grill; smoke from particles), `helmet` (a loose football helmet:
a shell ball and facemask bars, mats per team), `inflatableHelmet` (the giant team-entrance tunnel helmet), `bassDrum`
(held by band members through the gear hook).

From the core library, no store needed: `bench`, `table`, `barrel`, `crate`, `lamppost`, `fence`, `pine`, `tree`,
`bush`, `grass`, `rock`. `r.prop` built-ins: `banner`, `sign`, `lamp`, `streetlamp`, `awning`, `cactus`, `palm`,
`lantern`, `trashcan`, `firedrum`, `vines`. Cut the few store entries into one set:
```sh
S=.cache/engine/dist/handoff/src/assets/sets
node .cache/engine/dist/handoff/tools/asset-set.mjs $S/kenney-survival.js $S/kenney-graveyard.js $S/kenney-pirate.js $S/kenney-nature.js $S/kenney-furniture.js \
  --ids kenney-survival:bucket,kenney-graveyard:hay-bale,kenney-pirate:flag,kenney-nature:tent-small-closed,kenney-furniture:speaker \
  --name fiasco-store --out vendor/assets/fiasco-store.js
```
This was run during planning: 5 shapes, 10 materials, 1,799 tokens. Load it with
`E.addAssets(window.ASSETS['fiasco-store'])`, which names the entries `fiasco-store:<id>`. The bucket is the sports-drink bucket dump. Use
`asset-find.mjs` for anything else. The store sets are CC0: credit Kenney on the About screen.

### 12.7 The football
Drawn in `r.queue` at the ball's world position, or by the gear hook while carried. It is a prolate ellipse (a
10-point polygon), 7×4 px at zoom 1, brown `#8a4a22` with an `E.tones` shade and highlight, a white lace stripe of 3
stitches, and a white band at each tip. Its long axis follows the projected velocity
(`r.w(p)` → `r.w(p + v·dt)`). In flight it spins: alternate the lace position each 1/30 s so it reads as a spiral.
Kicks tumble end over end (the axis rotates in screen space at 10 rad/s). Shadow below. A flame trail when Blazing, a
gold trail on the Golden Spiral, white speed lines on Rocket Passes.

### 12.8 Logos, field art and UI art
- **Team logos** are string sprites (`E.sprite`), 16×16, with a 4–6 color palette per team: a flaming tumbleweed, a
  hog head with tusks, neon owl eyes, a yeti footprint, a crown on a football, and a grey "P" on a whistle for the
  Scrubs. Use them on the score bug (×1), menus (×3), the helmet ear dot (a 1–2 px dot of the main color), the
  midfield paint (sampled as a bitmap at 1 sprite px = 0.5 yd) and the end-zone walls.
- **The title logo:** `AMERICAN FOOTBALL` in `E.font.title` scale 3 (white, cream, orange, deep orange, extruded
  purple), with `FIASCO` beneath in scale 5, colors fire yellow to orange to red, a crack line through it (`px.line`
  in dark), and a cartoon football with motion lines bouncing off the "O". A short intro animation: the football hits
  the word, which cracks and shakes.
- **Play cards:** `E.ui.box` with a team-color gradient, a mini field strip (green with yard lines) where routes are
  `px.line` with arrow heads in white and the team color, blocks as short T bars, and zones as dithered circles
  (`px.polyDither`). The play name is font scale 2, plus a RUN/PASS/TRICK/KICK badge and the star badge for COACH
  SAYS.
- **Fiasco Cards:** a card frame in purple and gold with the card's art drawn by code (cleats with flames, glue
  gloves, a brick wall, a hot sauce bottle, a big fist, butter, the mascot's head, a boot) and the name in big text.
- Comic bursts, glyph chips (§9.3), the score bug, tabs and buttons all draw with engine primitives only (rule 2 of
  API.md: no `ctx.arc`, `fillText` or canvas gradients on the game buffer).

### 12.9 Checking the art
`node .cache/engine/dist/handoff/tools/asset-sheet.mjs $PWD/src/24-shapes.js#<id>` for every shape. `node tools/filmstrip.mjs <page>#<deep link> --steps "..." --seed 1` for
every pose in §12.3 (the drill and dev deep links set them up). A swing must wind up, strike and settle back without
jerks. Take screenshots only for the look (§21.6).

---

## 13. Audio (`20-audio-voice.js`, `21-audio-music.js`)
All sound is synthesized: the engine's chip synth (`audio.sfx`, `audio.music`, `audio.define`) plus our Web Audio
nodes on engine buses (E6). There are no audio files. Every composition is original: write new melodies, and
don't transcribe known stadium tunes or fight songs.

### 13.1 Music (`{ bpm, steps, tracks }`, named tracks for layers)
| Song | For | Character |
|---|---|---|
| FIASCO ANTHEM | the title, the story hub | stadium rock, 132 bpm: a square lead, saw bass, a `k . s .` beat, a cheer-like hook |
| LOCKER ROOM FUNK | menus, setup | 110 bpm, a slap-bass `pulse12` line, offbeat hats |
| HUDDLE UP | the play-call screen | a drumline loop (drums only plus a low triangle ostinato), 120 bpm, 2 bars, rising tension |
| DUST DEVIL STOMP | Tumbleweed Field | a western shuffle, triangle bass, a twangy pulse lead, 128 bpm |
| SWAMP STOMP | The Hog Wallow | a blues shuffle, saw bass, a harmonica-like pulse with vibrato, 96 bpm |
| NEON NIGHTDRIVE | Afterglow Arena | synthwave, saw arpeggios, a square lead, 118 bpm |
| FROSTBITE FANFARE | Frostbite Field | bells (triangle and sine arpeggios), 100 bpm |
| MEGA DOME ANTHEM | the Mega Dome | epic brass (3 squares in fifths), 140 bpm |
| HALFTIME SHOW | halftime | a marching band: `k s s` drums, a brass melody |
| ARCADE ATTRACT | the attract mode | a 150 bpm remix of the anthem |
| FIASCO FOREVER | the credits | a slow ballad version of the anthem |
| Stings | `audio.sting` | TD fanfare, FG good, first-down organ riff, defense chant riff, Fiasco Break "wah-wah", victory jingle, defeat jingle (a sad sliding saw) |

In matches the stadium song plays low under the crowd bed, with layers `hot` (more drums and a guitar-like saw, for a
Blazing athlete), `redzone` (bass pulses inside the 20) and `final` (`audio.tempo` +8% in the last minute). Between
plays, original stadium-organ riffs (square and triangle chords with vibrato) play as stings on first downs, and a
defense-chant riff plays on 3rd down.

### 13.2 Sound effects (`audio.define` each; the engine warns on unknown names, and a test fails on such a warning)
hike (the QB's "HUT" voice + a snap thump), whistle, helmetClang (square 1800→1200 + a triangle ring), padsCrunch
(lowpass noise 900→200 + sine 120→50), bigHit (crunch + clang + a boom sine 80→30), tackleThud, dive (whoosh),
spinWhoosh, stiffArm (punch), hurdle (jump2), catchSlap (bandpass noise 1200, short), drop (thunk), throwWhoosh,
rocketPass (a saw sweep), kickThump (sine 150→60 + noise), doink (a triangle 1400 ring), airHorn (3 saw voices
220/277/330, 0.6 s), cannon (boom), fireworks (explode + crackle bursts), confettiPop, coinFlip (blip arpeggio),
cardFlip, fiascoBreak (a descending arpeggio + wah), hotOn (a fire whoosh + a rising arpeggio), pileThumps, refCapPop,
mascotSqueak, lightsOut (a power-down sweep), lightsOn (a thunk + hum), menuMove, menuSelect, menuBack, meterTick,
meterSet. Crowd one-shots: roar, boo, oooh, groan, gasp, cheer swell (bandpassed noise shapes on the crowd bus).

### 13.3 The crowd bed
A long-lived looping noise source on the `crowd` bus, through a bandpass (500–1500 Hz), with gain
`0.12 + 0.38 × E` (E from §11.4), plus a lower "murmur" layer. Reactions are the one-shots above. Chants are 6
detuned babble voices in rhythm with the team's chant syllables ("FI-AS-CO!", "HOGS! HOGS! HOGS!", "HOOT-HOOT!",
"BRRR-BRRR!", "DY-NAS-TY!"), on the beat (`audio.onBeat`) when E > 0.4. Stadium size scales it: Tumbleweed is thin
and quiet (until the ending), the Mega Dome thick.

### 13.4 Voices: the babble synth (Animalese and Simlish)
**The API:** `FF.voice.say(text, profile, { onSyllable })` plans syllables, schedules them on the `voices` bus and
returns the plan. `FF.voice.letter(ch, profile)` is the E5 dialog hook, which groups typed letters into syllables
live. `FF.voice.stop(profile)`.

**Two styles, one synth:**
- **Animalese** (the story cast, refs, mascot noises): letter-driven. Each vowel group in the typed text is one
  syllable, with its onset taken from the preceding consonant(s). Quick, high and cute.
- **Simlish** (the announcers, coaches on the radio, the crowd chants): count the line's syllables, then speak that
  many syllables drawn from a gibberish bank (`ba do zee ka fla nu ree bo shma gli va tor mip zub lo neh`), picked by
  a hash of each real word so the same line sounds the same every time. More fluent, with less pitch jitter.

**A syllable** = onset + nucleus:
- **Onset** by consonant class: plosives (p b t d k g c q) are an 8 ms broadband noise click; fricatives (f s z v h
  x, sh, th) are 25–40 ms of bandpassed or highpassed noise (s at 5 kHz, f at 3 kHz, h at 1.2 kHz); nasals (m n) are
  30 ms of lowpassed voiced hum; liquids (l r w y) are a formant glide into the vowel.
- **Nucleus:** an oscillator (the profile's wave) through two parallel bandpass filters at the vowel's formants
  (a 800/1200, e 500/1900, i 320/2300, o 500/900, u 350/800 Hz, × the profile's formant scale; Q 6 and 10), with an
  envelope of 6 ms attack, a sustain, and a 25 ms release. The duration is (1 / rate) × 0.6–1.0.
- **Pitch** = base × 2^((jitter + contour) / 12). The jitter is ±2 semitones from a hash of the syllable, so it's
  deterministic. The contour: questions rise +4 on the last 2 syllables, exclamations +3 and +30% volume, statements
  fall −2 at the end, ALL-CAPS words +2 and louder.
- The voice is monophonic per speaker: a new syllable cuts the previous one. A lowpass at 3.5 kHz on the bus softens
  it.
- Build the nodes on `game.audio.ctx` (null until the first key press or click, and always null headless: then plan
  only). For `pulse` and `pulse12` waves, reuse the engine's PeriodicWave (`audio._pulse(.25)`, `audio._pulse(.125)`).
  For noise, reuse `audio._noise`. Connect to the `voices` bus (E6).

**Speaker profiles** (`{ base Hz, rate syl/s, wave, formant, breath, style }`):

| Speaker | Profile |
|---|---|
| CHET THUNDERBUNS | 125, 13, saw, 0.95, 0.05, simlish, excited contours |
| LOU DIGGS | 105, 9, triangle, 0.9, 0.08, simlish, falling contours |
| COACH GUS BLUSTER | 140, 14, square, 1.0, 0.15, animalese, shouty |
| MAMA PEARL | 210, 10, triangle, 1.15, 0.05, animalese, warm |
| HAP HAZARD | 165, 12, saw, 1.05, 0.03, animalese |
| BROCK STERLING III | 150, 11, pulse, 1.0, 0.02, animalese, smug (rise then fall) |
| MONTGOMERY STERLING II | 115, 8, saw, 0.92, 0.06, animalese, pompous |
| BIG BERTHA | 190, 9, square, 1.1, 0.1, animalese |
| GATOR GUIDRY | 120, 10, saw, 0.95, 0.12, animalese |
| LUMEN LOPEZ | 140, 11, pulse, 1.0, 0.02, animalese |
| ZAP ZAPATA | 190, 16, pulse12, 1.1, 0.0, animalese |
| DJ HOOT | 130, 12, pulse, 1.0, 0.04, animalese, vibrato |
| COACH ICEBERG | 100, 6, sine, 0.85, 0.05, animalese, slow and solemn |
| AVALANCHE | growls only: lowpass noise + a 70 Hz sine, no syllables |
| THE MOUNTAIN | 90, 7, square, 0.8, 0.1, animalese |
| refs | 150, 12, square, 1.0, 0.0, animalese, short |
| QBs | the QB's own profile, cadence "SET... HUT!" (2–4 syllables + a strong plosive "HUT" on the snap) |
| crowd chant | 6 voices, ±15 cents detuned, simlish |
Voices are on whenever text is spoken: subtitles always show. Settings: Voices volume (the `voices` bus), Commentary
(On / Subtitles only / Off). Headless, the synth schedules nothing and returns the plan, so tests can check that
syllables were planned.

---

## 14. Screens and UX (10-foot, controller-first)

### 14.1 Rules for every screen
- **Text size** on the 480×270 / 427×240 canvas: everything the player must read is `E.font` scale 2 (14 px glyphs,
  56–84 px on a TV). Secondary text is scale 1 with a shadow. Titles are scale 3–5. `font: 'tiny'` only for jersey
  numbers, signs and dev overlays.
- **Few, big things:** at most 6–7 focusable items on a screen, one primary action highlighted, big cards, and
  generous spacing. Focus shows as a pulsing border plus the `▸` marker. Results have at most 4 stat tiles, team
  select 4 bars, records 6 rows a page. No tables of numbers outside the Dev mode.
- **Navigation:** d-pad and stick with repeat (`input.repeat`); confirm and back; mouse hover moves the focus and a
  click selects; the wheel scrolls lists. Every screen has a way back (○, Esc or the on-screen BACK).
- **The prompt bar:** every screen's bottom edge shows its actions as chips for the current device (§9.3).
- **Safe margins:** HUD and menus stay 8 px in from the edges (`T.safeMargin`, TV overscan) and clear of
  `game.cornerArea()`.
- **Contrast:** text over the field sits on dark translucent panels (`E.ui.box`, alpha 0.85) or has an outline.
- **The HTML screens** (pause, settings, controls, help, dev) use the engine Shell with the 10-foot scale (E9: body
  text ≥ 22 px at 1080p, buttons ≥ 56 px tall). Theme: `{ ink: '#f4f0e6', paper: 'rgba(14,16,34,.92)', accent:
  '#ffb02e', muted: '#a9a6c0', danger: '#ff6a5a', line: 'rgba(255,176,46,.35)', font: 'system-ui, sans-serif',
  titleFont: '"Arial Black", Impact, system-ui, sans-serif' }`: a sports-broadcast look.
- **Every screen works with keyboard alone, pad alone, and mouse plus keyboard.** Tests drive them all three ways
  (§21.3).

### 14.2 Title
- Tumbleweed Field at dusk in the broadcast view. Two lines of players face each other at midfield in stance, Fumbles
  dances, the crowd sways. Every 6–8 s a scripted gag plays (Hap throws, a lineman catches it with his face; the
  kicker whiffs; Fumbles catches fire).
- The logo animates in (§12.8). "PRESS START" pulses with chips. Before any input, show both chips (Enter and ✕);
  after that, the device's. The version label (`E.versionLabel()` + the game's version) is small at the bottom left.
- 10 s idle starts the attract mode (§15.4). Touch-only devices: §14.12.

### 14.3 Main menu
STORY: THE FIASCO CUP (Continue, New Game), EXHIBITION, PRACTICE, HALL OF FIASCO, OPTIONS (opens
`game.menu('settings')`), ABOUT & CREDITS. A big vertical list on the left. On the right, a live vignette for the
focused item: the bracket board, two helmets clashing, a tackling dummy getting flattened, the trophy case, spinning
gears, the announcers' booth. 10 s idle starts the attract mode.

### 14.4 Exhibition setup (two steps)
1. **CONTROLLERS & TEAMS.** Three columns: HOME (left), CPU (middle), AWAY (right). `game.allowJoin({ max: 4 })`:
   Start on a free pad, or 2 on the keyboard (the right half), joins. Each player's device icon (a pad with P#, the
   keyboard, or a keyboard half) starts in the middle. Left and right move it to a side. Up and down change that
   side's team (the first human on a side chooses). The team panel shows the helmet (a portrait of a rig in that
   helmet, turning slowly), the logo, the name, 4 rating bars, and the star player's portrait and special. ✕ readies.
   A side with no human is the CPU, and P1 changes its team with △. When everyone is ready, go to step 2.
2. **GAME OPTIONS.** Stadium (the home team's by default; arrows cycle with a preview), weather (Stadium / Clear /
   Rain / Snow), quarter length, difficulty, then the big **PLAY BALL!** button.
A coin toss starts the match. After the results: REMATCH, CHANGE TEAMS, MAIN MENU.

### 14.5 The play-call screen (`53-playcall.js`)
- **Layout:** a full-width panel when one side is human. With humans on both sides, split halves (home left, away
  right), each player's choice hidden from the other: after picking, a panel turns its cards face down ("READY").
  Co-op on one side: one panel with two cursors.
- **The top bar:** the team logo, OFFENSE or DEFENSE, the down and distance, the ball spot, the play clock (big
  digits, red under 4 s) and the team's Fiasco Meter.
- **Tabs:** offense RUN | PASS | TRICK | SPECIAL (punt, field goal, fake punt, kneel). Defense BASE | PRESSURE |
  SPECIAL (prevent, goal line, FG block). Kickoffs, PATs and returns show their own choices. L1/R1 or Q/E change the
  tab; so does moving past the grid's edge, or a click on a tab.
- **The grid:** 3×2 cards (§12.8). The focused card scales to 1.08. ✕ picks. □ flips (a FLIP badge, the routes
  mirrored). The COACH SAYS card has a ★.
- **The card row:** △ moves the focus to the 3 held Fiasco Cards, ✕ arms one (only one; greyed when it doesn't fit),
  and ○ goes back to the grid.
- **Co-op:** player 2's cursor picks his receiver (□ cycles).
- **The timer:** when it runs out, the COACH SAYS play is picked.
- **Behind:** the field, dimmed. The music is HUDDLE UP.

### 14.6 The HUD (`41-hud.js`)
- **The score bug** (bottom center, broadcast style, about 230×20): logo, abbreviation and score for each team, a
  possession arrow, the quarter, the clock, the down and distance, and the ball spot. A thin Fiasco Meter bar under
  each team, and flame icons for Blazing athletes. The scores flip on change.
- **Player panels** for each local human, in their own corner (P1 top left, P2 top right, P3 bottom left above the
  caption, P4 bottom right above the strip): the name tag, a big turbo bar (60×6), the held card count and SPECIAL
  READY.
- **The prompt strip** (§9.3), the caption (§11.3), center event text, the play clock in PRESNAP (from 5 s), and the
  REPLAY overlay.
- **In the world:** rings under held athletes; receiver chips with their glyphs; the pass target marker; the line of
  scrimmage and first-down lines; the kick meter; tags; the down marker on the near sideline shows the down.
- The HUD hides during replays (except the REPLAY overlay) and cutscenes.

### 14.7 The kick meter
- An arc meter (64×36 px) above the kicker in screen space. The power fill goes green, yellow, red. The accuracy
  needle crosses a center band.
- An aim line on the field: a dashed line from the ball along the aim, with the predicted landing marker for punts
  and kickoffs. FGs show it in the Kick Cam with the posts in view.
- Prompts step through ✕ KICK, ✕ SET POWER, ✕ SET AIM.

### 14.8 Results
- FINAL, both logos and scores huge, a winner banner.
- PLAYER OF THE GAME: a portrait, his name and 2 key stats.
- 4 stat tiles: total yards, turnovers, biggest hit (launch in yards), longest play.
- Buttons: WATCH HIGHLIGHTS, then CONTINUE (story), or REMATCH / MAIN MENU (exhibition). In a hub session, the
  results stay up under the hub's own results overlay.

### 14.9 Hall of Fiasco (records)
- `E.store('ff:records')`, 6 per page: longest TD, longest FG, biggest hit, most points in a game, most sacks in a
  game, the fastest Fiasco Cup, and each chapter's stars.
- Each row shows the team logo, the player, the value and the date.
- Updated after exhibition and story games. Never written in hub sessions or the attract mode.

### 14.10 About & Credits
Pages turned with ←/→ (L1/R1, clicks on the arrows), big text, scrolled with up/down when long:
1. SOURCE INFORMATION: every field of TASK.md's list.
2. TESTING FEEDBACK: the 4 answers.
3. ENGINE FEEDBACK: the 6 answers.
4. PROMPT FEEDBACK: the 4 answers.
5. CREDITS: the engine my-3D2dge (MIT, michaelcrosato), the AI Hub client, motion clips (Quaternius CC0, Mesh2Motion
   CC0, the CMU Graphics Lab Motion Capture Database), store props (Kenney CC0), and who built it and from what
   (`PLAN.md`).
6. ENGINE CHANGES: the summary from ENGINE-CHANGES.md.

All of it comes from `window.FF_ABOUT` (§23). Never type these texts in two places.

### 14.11 Settings
The game's own (group `Game`, through `menu.settings`): Difficulty (Rookie / Pro / Fiasco; Pro), Quarter length
(1:00 / 1:30 / 2:00 / 3:00 / 5:00; 2:00), Camera (Broadcast / Sky Cam / Blimp), Replays (All big plays / Touchdowns
only / Off), Commentary (On / Subtitles only / Off), Voices (slider, 0.8), Crowd (slider, 0.7), Auto-switch on
defense (On), Show routes (On: your receivers' route lines while you're the QB), Pass target marker (On), Late hits
(On), Big Heads (Off; locked until the story is finished, or unlocked in the Dev mode).
Plus the engine's: Display (full screen, pixel scaling, the screen filter: Clean / Scanlines / CRT), Sound, Comfort
(reduce motion, screen shake, flashes), and **Controller: Button symbols (PlayStation / Xbox; PlayStation)** (E2).
Everything applies live. The Controls screen (engine) rebinds every action per player.

### 14.12 Touch-only devices
- **Detection:** `matchMedia('(pointer: coarse)')` matches, `(any-pointer: fine)` doesn't, `navigator.maxTouchPoints`
  > 0, no gamepad is connected, and no key has been pressed.
- **Then:** turn the touch controls off (`game.input.touchEnabled = false`, the Touch setting hidden, no scene
  declares `touch` buttons). The title replaces PRESS START with **CONTROLLER OR KEYBOARD REQUIRED** and a big
  **SETTINGS** button (a tap calls `game.menu('settings')`). The corner's menu button stays. The attract mode runs
  after 10 s as usual, and a tap goes back to the title.
- **Unlock** the game the moment a gamepad connects (`gamepadconnected`, or `input.lastDevice === 'gamepad'`) or a key
  is pressed.
- In a hub session on such a device, the card says the same, and that seat is played by the AI until a controller or
  keyboard input arrives. Don't call `AIHub.fail`, because from a host it would void the round.

### 14.13 The pause menu
Resume (engine), then the game's items: Dev Mode, Restart (exhibition and practice). Then the engine's Settings,
Controls, Full screen, Help, and "Quit to menu" (made by `menu.quit: 'menu'`; don't add a quit item of your own).
In story mode, Quit to menu returns to the story board. Help comes from our Shell's `screens.help`: the
controls by context in short sections (Offense, Ball carrier, Defense, Kicking, Menus), each line a key and what it
does, for the device last used. Cutscenes aren't pausable: hold ○ or Esc for 1 s (a fill ring) to skip one.

---

## 15. Modes

### 15.1 Story: THE FIASCO CUP (`54-scene-story.js`, `14-data-story.js`)
**The hub** is the bracket board, a corkboard in the Fiascos' locker room. It holds 5 chapter cards, each locked,
open or done with 0–3 stars. Below them sit the Fiasco Card collection and the **loadout**: up to 3 cards picked for
the next chapter. CONTINUE plays the next chapter. A chapter runs: intro cutscene → gameplay (a scenario) → halftime
cutscene (chapters 2 and 5) → outro cutscene on a win, or the loss screen → reward → autosave
(`game.saves.autosave()`, with the place, the chapter and the time played). Main menu CONTINUE loads
`game.saves.latest()`. Wire the slots once at boot:
`game.saves.write = () => ({ data: { story: story.state(), done, stars, collection, loadout, unlocked, playTime },
place: 'THE FIASCO CUP', level: nextChapter })` and `game.saves.read = s => restoreStory(s.data)`, with
`menu: { saves: { version: 1 } }` so a future version can `migrate`. Records and settings live in `E.store`, not in
the slots.

| # | Chapter | Stadium | Opponent | Scenario | Win condition | Shows | Reward |
|---|---|---|---|---|---|---|---|
| 0 | PROLOGUE | Tumbleweed, night | — | a cutscene | — | the stakes | — |
| 1 | TRYOUTS | Tumbleweed, dusk | the Scrubs | drills D1–D9 (§15.2) | finish D1–D8; D9 scored | every control | HOT SAUCE, SUPER FOOT |
| 2 | THE MUD BOWL | Hog Wallow (rain, mud) | Mudhogs | a full game, 4 × 1:30 | win | run defense, tackling, fumbles, weather, halftime choice | MEGA HIT |
| 3 | LIGHTS OUT | Afterglow (night) | Nite Owls | from the start of Q3, 1:30 quarters, trailing 7–21, Owls kick off | win | passing, pass defense, Hot Streak, the LIGHTS OUT event at the 4th play of Q3 | ROCKET CLEATS, GLUE GLOVES |
| 4 | FROSTBITE | Frostbite (snow, ice) | Yetis | Q4 with 1:30 left, trailing 17–20, your ball 1st & 20 at your 20 | win (a FG ties: sudden death OT) | the two-minute drill, sidelines, the clock, laterals, ice, Snowplow | MASCOT MAYHEM |
| 5 | THE FIASCO BOWL | Mega Dome | Dynasty | a full game, 4 × 2:00 | win | everything, both bosses, the halftime show | the trophy, the ending, the credits, Big Heads |

- The collection starts with BRICK WALL and BUTTERFINGERS.
- **Difficulty** per chapter: ch2 Rookie+, ch3 Pro−, ch4 Pro, ch5 Pro+ (a blend of the §8.4 columns), shifted one
  step by the Difficulty setting.
- **Stars:** 1 for the win, +1 for the bonus (ch2: force 2 fumbles; ch3: win by 7+; ch4: score with 20+ s left; ch5:
  hold the Dynasty to 14 or fewer), +1 for no turnovers.
- **Loss:** a "THAT'S A FIASCO!" screen with the coach's loss line and RETRY, RETRY EASIER (one step lower for this
  chapter) or STORY MENU.

**Cutscenes.** A cutscene is `{ set, stadium, cast: [{ who, at: [x, y], facing, pose }], camera: { view, focus,
zoom }, node }`. Its node is an `E.Story` node list. `event` steps stage it: move an actor (a tween), set a pose or
mocap clip, play an sfx, FX, a camera tween, a wait. The dialog is an `E.Dialog` with a live portrait of the speaker's
rig and `voice: ch => FF.voice.letter(ch, profile)` (E5). Hold ○ or Esc to skip to the end, keeping flags and
rewards. Sets are small TileMaps in the `field` view, built in code:
- **LOCKER ROOM:** a row of lockers, benches, the chalkboard, the cooler and a team banner, a flickering lamp
  (light). It is recolored for each team.
- **OFFICE:** Mama Pearl's Pickle Barn: pickle barrels, a desk, a framed photo of the 1974 team, a lamp.
- **PRESS ROOM:** the podium with mics, a backdrop wall painted with logos, chairs, TV cameras, camera flashes
  (`game.flash` at 0.1 strength, honoring the flashes setting).
- **FIELD:** the match stadium itself at midfield, with the trophy stage for the ending.
The lines are in §18.6.

### 15.2 Tutorial and practice drills (`55-scene-drills.js`, `15-data-drills.js`)
| Drill | Setup | Goal | Teaches |
|---|---|---|---|
| D1 RUN THE CONES | Hap at the 20, 5 cones zigzagging, a finish gate 15 yd past the last cone | pass within 1.5 yd of each cone in order and cross the gate within 9 s | move, turbo |
| D2 HIKE & HANDOFF | offense, 3 dummies, HB DIVE called | hike, the RB takes the ball, gain 10 yd | hike, handoff, running |
| D3 MOVES | the RB in a lane against 3 scrubs (a standing tackler, a frontal tackler, a diver), the goal line at 25 yd | beat each with the right move, then dive into the end zone | spin, stiff arm, hurdle, dive |
| D4 PASSING | QB, 3 receivers on SLANTS, 2 slow defenders | complete 2 passes, then a Rocket Pass to the covered man | receiver buttons, Rocket Pass |
| D5 CATCHING | you are Wheels (WR); the coach lobs high balls | catch 2 of 3 with a jump | jump catch, the target marker |
| D6 DEFENSE | defense against a scrub runner, then a scrub QB | switch to the nearest defender and tackle; Big Hit to force a fumble and recover it; intercept a pass with a jump | switch, tackle, Big Hit, fumble recovery, INT |
| D7 KICKING | a 37-yd FG, then a kickoff | make the FG; kick off 50+ yd | the meter, the Kick Cam |
| D8 PLAY CALL | the play-call screen, HOT SAUCE given | pick a PASS play, flip it, use HOT SAUCE, run it Blazing | play calling, cards, Hot Streak |
| D9 SCRIMMAGE | one drive against the Scrubs from your 30 | score a TD in 4 downs | all of it together |
- Each drill opens with a big instruction card (2 lines with chips) and Coach Bluster's line, and shows a progress
  counter. Success gives a star burst and praise. A failure restarts at once (b2 also restarts). After 2 failures,
  "□ SKIP DRILL" appears.
- Every drill has a `bot(ctx)` that completes it through intents. The tests and the attract mode use it.
- **PRACTICE** (main menu) offers a grid of the 9 drills, any of them replayable, with best times kept.

### 15.3 Exhibition
Setup (§14.4), the coin toss, the match, the results, then REMATCH, CHANGE TEAMS or MAIN MENU. 1–4 local humans in
any split, or CPU vs CPU (no humans: a "spectate" exhibition; P1 can press Start to take over a side).

### 15.4 The attract mode (`56-scene-attract.js`, `17-data-attract.js`)
- **Trigger:** 10 s with no input on the title, the main menu or the exhibition setup, with no Shell screen open.
  Input means: any action pressed by any player, a click, the pointer moving more than 6 px, the wheel, a touch, or a
  gamepad axis past the dead zone.
- **Exit:** any input goes back to the screen it came from with a quick fade, and that input is consumed.
- **Content:** a looping director, about 100 s a cycle. Each segment is a scenario with forced play calls and the
  cheats it needs (TASK.md allows the attract AI to cheat freely):

| # | Segment | Where | Shows | Cheats |
|---|---|---|---|---|
| 1 | Logo sting, 3 s | — | the title logo cracking | — |
| 2 | Kickoff return, 8 s | Tumbleweed, dusk; Fiascos vs Mudhogs | the meter, a return with a spin and a stiff arm | returner god mode |
| 3 | Play call, 3 s | same | the play-call screen, both cursors picking DEEP POST and COVER 2, HOT SAUCE armed | — |
| 4 | Blazing TD, 10 s | same | a deep pass, a jump catch, flames, the TD, a dance, the replay (field and iso) | forceCatch, noTackle |
| 5 | Mud fumble, 8 s | Hog Wallow, rain | Bertha's MUDSLIDE, a Big Hit fumble, a pile-up | forceFumble |
| 6 | Kick Cam FG, 6 s | Hog Wallow | a 52-yd FG, DOINK off the upright and in | forced accuracy |
| 7 | Pick six, 7 s | Afterglow, night | Zap's AFTERBURNER, an INT returned for a TD, a late hit, a ref flattened | forceINT |
| 8 | Mascot Mayhem, 6 s | Afterglow | Hooty runs on and sacks the QB | — |
| 9 | Lights out, 5 s | Afterglow | glowing uniforms in the dark | — |
| 10 | Snowplow, 6 s | Frostbite, snow | Avalanche's SNOWPLOW sack, divots, breath puffs | — |
| 11 | Story snippet, 6 s | the press room | Brock's "pickles" line with his babble voice | — |
| 12 | Halftime show, 5 s | Mega Dome | cheerleaders, the band, pyro, the blimp | — |
| 13 | Seismic Sack, 5 s | Mega Dome | The Mountain's slam and shockwave | — |
| 14 | Champions, 5 s | Mega Dome | the trophy stage, confetti, the bucket dump | — |
| 15 | Hall of Fiasco, 5 s | — | the records | — |
| 16 | Title, 5 s | — | the title, then the loop again | — |

- **The overlay:** DEMO PLAY at the top, PRESS ANY BUTTON pulsing at the bottom, the ARCADE ATTRACT music,
  commentary on with voices at 60%. Nothing is saved and no records are written.
- Both teams are played by the normal brains. The director only forces play calls, the listed outcomes and the story
  snippet's camera. The attract mode runs the same on touch-only devices.

---

## 16. Multiplayer (`80-net.js`)

### 16.1 How TASK.md's multiplayer line is met
- **The game on its own:** full local multiplayer for 1–4 on one machine (pads and a shared keyboard), in exhibition.
  Story and practice are single player.
- **In AI Hub:** sessions of the AI Hub Session Protocol v1 in **shared-world** mode for 1–4 players, each on their
  own device. One player plays against the CPU; 2–4 play head to head or 2-on-1 and 2-on-2 with CPU teammates. The
  hub's relay only exists inside a session, so outside one the game is unaffected (`AIHub.active` is false) and plays
  as above.

### 16.2 The page head
`session.js` goes right after `<meta charset>`, unmodified and first:
```html
<meta charset="utf-8">
<script>/*! aihub-session 1.4.0 … (the whole file, unmodified) */</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Outscore the other side over one half of arcade football">
<meta name="hub:session-howto" content="Stick/WASD run · ✕/Space hike, dive, tackle · ✕○□△ or 1-4 throw · R2/Shift turbo">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1–4"><meta name="hub:source" content="American football">
```

### 16.3 A session, step by step (when `AIHub.active`)
1. Boot skips the title, attract mode and menus. The boot steps build everything.
2. `const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true })`. If it returns `null`, play
   as on its own.
3. **The setup** comes from `AIHub.rng('setup')`, the same on every copy: a stadium (one of the 5), two different
   teams (never the Scrubs), the stadium's weather. Seats map to sides: 0 home, 1 away, 2 home, 3 away. With one
   player, seat 0 is home against a CPU away team.
4. **The card scene** (`57-scene-hubcard.js`):
   - It shows the two helmets facing off over the stadium backdrop, the team logos, the players by side in their seat
     colors with ready ticks (`card.ready`), "HOW TO WIN: OUTSCORE THEM OVER ONE HALF", this device's controls as
     chips, and the countdown (`card.left`; PAUSED while `card.paused`).
   - **READY** (Enter, ✕ or a tap) calls `AIHub.answer('ready')`. **MORE TIME** (△, T or a tap) calls
     `AIHub.answer('more')`; pressing again takes it back.
   - It has no menus or choices, and nothing on it changes the round. Any randomness comes from `AIHub.rng('card')`.
   - Call `AIHub.ready()` as soon as the match is built, without a key press.
5. On `start`, show a 3-2-1 countdown over the opening kickoff setup while `AIHub.time() < 0`. Kick off at ≥ 0.
6. **The match** is one half: 2 quarters of 1:30. A play takes about 17 s of real time for about 16 s of game clock
   (live play plus the runoff), plus about 8 s per TD celebration, so plan on 1.3 real seconds per clock second. When
   `info.limitMs` is short, use `quarter = clamp((limitMs / 1000 − 60) / 2 / 1.3, 45, 90)` seconds (a 300 s limit
   gives 90; a 200 s limit gives 54). No overtime: a tie is a tie.
7. At the end of Q2, or on `time-up` (within `graceMs`), the host calls
   `AIHub.finish({ standings, scores, stats, awards })` and sends a last reliable snapshot with `over: 1`. Every copy
   shows the final score (§14.8) until `end`.
8. On `end`: take no more input, send nothing, `audio.music(null)` and mute. `reason` picks the message: finished,
   ROUND CANCELLED (void, host-left) or YOU SAT THIS ONE OUT (sat-out).

### 16.4 Roles
- **Host** (`info.isHost`): runs the sim, the AI and the rules for every seat. Its own seat, if any, plays locally
  with no prediction needed.
- **Others:** predict their own held athlete, render snapshots, and run their local UI (the play call and the kick
  meter).
- **Server** (`info.server`): a host with no player of its own. It runs the same host code with every seat remote,
  draws nothing (`draw` fills the screen once and returns), plays no audio, and owns no camera or input.
- **Control** (§9.4) is keyed by seat. The host owns the assignment and broadcasts changes as events.

### 16.5 Messages, rates, prediction (formats in Appendix B)
- Client → host: `i`, its state and inputs, unreliable at 15 Hz. `call`, its play call, reliable. `kick`, its kick
  meter result, reliable.
- Host → all: `s`, the snapshot, unreliable at **14 Hz**, **at most 1,100 bytes** (under the hub's ~1,200
  fragmentation size). `e`, events, reliable, at most 4/s: phase changes with the plays, control changes, scores,
  stats, card draws, `over`. One `send()` to everyone counts as one message.
- **The budget:** each copy sends at most 18 messages/s. The host sends 14 + ≤ 4. A client sends 15 + about 1
  reliable (`call` or `kick`). The hub allows 20/s with bursts of 40, and the client drops the rest. `FF.net.budget` is
  a token bucket at 18/s that refuses sends past it: it drops the oldest queued unreliable message, never a reliable
  one, and delays the next snapshot rather than skipping an event. Tests check this.
- **Client prediction** (the arena example's rule: "your controls never wait for the network"):
  - The client moves its held athlete locally with the same movement code, plus a soft push from the snapshot's
    nearby athletes. It sends its position, velocity, facing, intent bits and an **action log**: the last 8 actions
    with sequence numbers. The host runs each new sequence number once, so losing a packet loses nothing.
  - The host accepts the reported position unless the athlete is `locked` (tackled, engaged, in an action the host
    started, a dead ball) or it is farther than top speed × elapsed + 8 units from the host's last position.
    Otherwise it keeps its own and flags `corr`.
  - The client snaps to the host when the difference is over 2 yd, or `corr` or `locked` is set. While locked it
    stops predicting.
- **Interpolation:** others and the ball render 100 ms behind the newest snapshot, interpolated, extrapolated up to
  150 ms when late.
- **The play call:** each client opens its play-call UI on the host's `e: phase PLAYCALL` and sends `call`. The host
  waits for every human side or its own timer, then sends `e: phase PRESNAP` with both plays.
- **The kick meter** runs on the kicking human's copy. Its `{ power, acc, aim }` goes as `kick` and the host executes
  it.
- **Leaving:** on `leave { id }`, that seat's athletes go back to the AI (a CPU tag over them) and the match goes on.
  When the host leaves, the hub voids the round and the clients show ROUND CANCELLED on `end`.

### 16.6 Session rules (the protocol's, and what they mean here)
- No title, menus, attract mode or story. No quit or restart (`menu.quit: false`, no Restart item, no Dev Mode item).
- **No world freeze:** `AIHub.active` is known from the page's first line, so in a session the game is constructed
  with `new E.Game({ autoPause: false, ... })` and the match scene is `pausable: false`. The match scene reads the
  `pause` action itself: Options (or Esc) opens a small local canvas overlay with SETTINGS
  (`game.menu('settings', { pause: false })`, E8) and CONTROLS. While it is open, that player's athlete is driven by
  the AI.
- **Create + Options is the hub's:** each step, while Pad8 (Create) is held on any pad, call
  `input.suppress('pause')` and `input.suppress('start')`.
- **No player-to-player communication:** celebrations are random, there are no taunts, and names come only from the
  hub. They're drawn in the pixel font, where characters outside its set become `?`. Never insert them as HTML.
- No replays, cutscenes or halftime show (one half has no halftime). Saves and records are never written.
- `Math.random` isn't seeded in a shared world: the host's sim uses `FF.rng.sim` seeded from `AIHub.rng('match')`.
  Clients don't run the sim.

### 16.7 Results
- **Standings** by team: the winners' ids, then the losers' (a tie puts everyone in one array).
- **One player against the CPU:** `standings: [[0]], won: true | false`.
- `scores`: each player's team score.
- `stats` per id: `{ Yards, TDs, Tackles, Sacks }`.
- `awards`: `[{ id, title: 'Player of the Game', detail }, { id, title: 'Biggest Hit', detail: '12-yard launch' }]`.

---

## 17. Dev mode (`70-dev.js`)
- **Entry:** the pause menu's **Dev Mode** (never in hub sessions), the deep link `#dev`, and Backquote once Dev mode
  has been opened in this visit.
- **The Dev screens** are Shell screens (E7) with page buttons across the top: TUNING, CHEATS, JUMP TO, PLAY LAB,
  OVERLAYS, TOOLS. Each page lists 6–10 rows. Back returns to the pause menu.
- **TUNING:**
  - Sub-pages Movement, Passing, Catching, Tackling, Blocking, Kicking, AI, Rules, Presentation.
  - Every tunable in §22 is a live slider row (min, max, step, unit). The sim reads `FF.T` on every use, so a change
    applies at once.
  - **Reset this page** and **Reset all to defaults**.
  - Values persist as `Dev …` settings, so a designer's tuning survives a reload.
  - **Copy values** puts the current tuning as JSON on the clipboard, or shows it in a text panel where clipboard
    access isn't allowed, to paste into `02-tuning.js`.
- **CHEATS** (toggles): god mode (your carriers can't be tackled), infinite turbo, always catch, always intercept,
  force a fumble on the next hit, no tackles by the CPU, CPU vs CPU (your side played by the AI), unlimited cards,
  always Blazing, Big Heads, lights out, slow motion (0.25 / 0.5 / 1 / 2), freeze the clock, win now / lose now.
- **JUMP TO:**
  - Situations: 4th & goal at the 1, 3rd & 25, the last 0:10 trailing by 4, a kickoff, an onside kick, a 52-yd FG,
    overtime, the red zone, backed up at your own 1.
  - Any story chapter (start, halftime, outro), any cutscene, any drill, any stadium and weather.
  - Set the score, the clock, the down and the distance with sliders, then Apply.
  - Give a card, or set Blazing on the held athlete.
  - Trigger: a Mega Hit on the next tackle, a fumble now, a replay of the last play, the TD celebration, the halftime
    show, lights out, Mascot Mayhem, each boss special.
- **PLAY LAB:**
  - Choose an offensive play, a defensive play, the teams, the difficulty and n (10 / 30 / 100).
  - RUN ON FIELD loops the matchup with overlays. RUN HEADLESS shows its stats (§8.6) and an all-defenses sweep for
    the play. The dev screens are the one place a small table is fine.
- **OVERLAYS:**
  - AI debug: each athlete's behavior name, target lines, routes, zones as circles, man assignments, intercept
    points, blocking pairs with shed timers.
  - Hitboxes: `rig.debug(r)` skeletons plus body circles.
  - The ball's predicted path and landing point; the camera target and bounds.
  - FPS and ms per update and draw; the last 12 bus events; each player's device, stick vector and held actions.
- **TOOLS:** frame step (the sim paused, b1 steps 1/120 s, b4 steps 0.1 s), a free camera (`cam.free`), HUD off for
  clean screenshots, presentation off, record a session and Save session (`E.session`), reseed the RNG, reset save
  data (asks first), unlock all (chapters, cards, Big Heads).
- **Hotkeys while Dev mode is on:** Backquote toggles the overlays, `[` and `]` change the time scale, `\` steps a
  frame. Leave F5, F11 and F12 to the browser.

---

## 18. Content

### 18.1 Teams and rosters (`10-data-teams.js`)
**Base ratings by position** (1–10). A player is the base for his position, plus his team's modifier, plus his own
line below (clamped 1–10):

| Pos | SPD | ACC | STR | HND | TCK | ARM | AIM | AWR | KCK |
|---|---|---|---|---|---|---|---|---|---|
| QB | 5 | 5 | 4 | 5 | 2 | 7 | 6 | 6 | 1 |
| RB | 7 | 7 | 6 | 5 | 3 | 1 | 1 | 5 | 1 |
| WR | 8 | 7 | 3 | 7 | 2 | 1 | 1 | 5 | 1 |
| C, G | 2 | 3 | 7 | 3 | 3 | 1 | 1 | 5 | 1 |
| DE | 5 | 5 | 6 | 3 | 6 | 1 | 1 | 5 | 1 |
| NT | 2 | 3 | 8 | 2 | 6 | 1 | 1 | 5 | 1 |
| LB | 5 | 5 | 6 | 4 | 7 | 1 | 1 | 6 | 1 |
| CB | 8 | 7 | 3 | 5 | 4 | 1 | 1 | 5 | 1 |
| S | 7 | 6 | 4 | 5 | 6 | 1 | 1 | 6 | 1 |
| K | 3 | 3 | 2 | 3 | 1 | 4 | 3 | 5 | 7 |

Each team has an offense of QB, C, LG, RG, RB, WR1, WR2; a defense of DE1, NT, DE2, LB1, LB2, CB, S; and a K, who
also punts and replaces the QB slot on kick plays (the QB holds for FGs). Skin tones are indexes into the §12.2 list
(1 lightest to 6 darkest). The AI tendencies are `{ run, pass, trick }` play weights, `blitz`, `lateHit`.

**1. TUMBLEWEED JUNCTION FIASCOS** (TUM; the player's team in story mode)
- **Colors:** jersey burnt orange `#e8742a`, purple `#4a2a6a`, cream trim `#f4e8c8`. The helmet is orange with a
  purple stripe, the pants cream, the cleats black.
- **Logo:** a flaming tumbleweed. **Home:** Tumbleweed Field. **Chant:** "FI-AS-CO!"
- **Team modifier:** −1 to every rating except those of the stars below. They're bad, and the player's skill and
  cards carry them. **AI tendencies:** {.45, .45, .10}, blitz .25, late hits .10.
- **Offense:**
  - QB #7 HAP HAZARD: skin 2, short brown hair, a big grin. ARM +2, AWR +1. The rookie: a pickle-barrel hauler with
    a cannon arm.
  - RB #22 "DOC" DOBSON: skin 4, bald, a mustache. ACC +1. A dentist on weekdays.
  - WR #88 WHEELS WASHINGTON: skin 5, spiky hair, a gold chain. SPD +2. Fast, vain.
  - WR #81 PETEY PICKENS: skin 1, red hair, freckles. HND −1. The owner's nephew: brave, butterfingered.
  - C #50 TANK TANKERSLEY: skin 3. STR +2. A gentle giant who cries at sad movies and in big moments.
  - G #63 SPUD MURPHY: skin 1, a ginger beard. He always has a potato.
  - G #66 LUGNUT LOPEZ: skin 3, a ponytail. A mechanic.
- **Defense:**
  - DE #91 GRIZZ GRIZZWOLD: skin 2, a huge beard. STR +1.
  - NT #95 MOOSE MALONEY: skin 4.
  - DE #97 "RATTLESNAKE" RITA RUIZ: skin 3, a ponytail. ACC +2, SPD +1. The team's best player, and she knows it.
  - LB #52 BUCK BOONE: skin 1, a buzz cut.
  - LB #54 SAGEBRUSH SAM: skin 5, a mustache.
  - CB #24 DUST DEVIL DIAZ: skin 3, spiky hair. SPD +1.
  - S #31 PREACHER PRUITT: skin 6. AWR +2. He quotes scripture about tackling.
- **K** #3 TOE-JAM TOMMY: skin 1, long hair, size 1.0.
- **Cast:** Coach GUS BLUSTER (bulky, a red face, a too-small polo, a cap, a whistle, a megaphone in the drills).
  Owner MAMA PEARL PICKENS (heroic 1.15, grey ponytail, an apron with a pickle on it; she runs Pickens' Pickle Barn).
  Mascot FUMBLES THE FLAMING TUMBLEWEED.

**2. BAYOU MUDHOGS** (BAY)
- **Colors:** swamp green `#4a6a2a`, mud brown `#6a4a2a`, gold trim `#e8c040`. The helmet is green with a gold
  stripe, the pants brown.
- **Logo:** a hog head with tusks. **Home:** The Hog Wallow. **Chant:** "HOGS! HOGS! HOGS!"
- **Team modifier:** STR +2 on OL, DL and LB; SPD −1 on everyone. **AI tendencies:** {.70, .25, .05}, blitz .30,
  late hits .35.
- **Offense:**
  - QB #10 CLETUS THIBODEAUX: ARM −2, AIM −1, SPD +2. A scrambler.
  - RB #44 BIG BERTHA BOUDREAUX: the boss; bulky 1.6; STR 10, SPD 6, ACC 4. Special MUDSLIDE.
  - WR #80 CRAWDAD COMEAUX.
  - WR #84 SKEETER LANDRY.
  - C #60 GUMBO GUIDRY JR.
  - G #71 BOUDIN BROUSSARD.
  - G #75 TOOTIE TRAHAN.
- **Defense:**
  - DE #90 BAYOU BILLY BREAUX.
  - NT #98 HOG JAW HEBERT.
  - DE #92 CATFISH CORMIER.
  - LB #51 MOSSY MOUTON.
  - LB #57 RUSTY ROBICHAUX.
  - CB #21 PIROGUE PREJEAN.
  - S #33 GATOR BAIT GUILLORY.
- **K** #8 BOOTS BOUDREAUX (Bertha's cousin).
- **Cast:** Coach "GATOR" GUIDRY (an alligator-hide cap in green, a toothpick). Mascot HAMBONE (hog head).

**3. NEON NITE OWLS** (NEO)
- **Colors:** black `#1a1a2a`, neon cyan `#3af0f0` (glowing), magenta trim `#f03ab0`. The helmet is black with a
  cyan glow stripe, the pants black.
- **Logo:** neon owl eyes. **Home:** Afterglow Arena. **Chant:** "HOOT-HOOT!"
- **Team modifier:** SPD +2 and HND +1 on QB, RB, WR, CB and S; STR −1 on OL and DL. **AI tendencies:**
  {.25, .65, .10}, blitz .15, late hits .10.
- **Offense:**
  - QB #1 LUMEN LOPEZ: ARM 9, AIM 9. Special NIGHT VISION.
  - RB #26 STROBE STEVENS.
  - WR #11 ZAP ZAPATA: SPD 10, ACC 9. Special AFTERBURNER.
  - WR #17 PIXEL PARK.
  - C #55 BASS DROP BAKER.
  - G #64 SUBWOOFER SMITH.
  - G #68 REVERB REYES.
- **Defense:**
  - DE #93 NEON NIKKI NAKAMURA.
  - NT #96 BLACKLIGHT BRUNO.
  - DE #99 GLOWSTICK GUS.
  - LB #50 LASER LARUE.
  - LB #58 DISCO DAN.
  - CB #2 SPARKLE SPARKS.
  - S #20 MIDNIGHT MOSS.
- **K** #4 RAVE RAVENSWOOD.
- **Cast:** Coach DJ HOOT (headphones, sunglasses at night). Mascot HOOTY (owl head with glowing eyes).

**4. GLACIER BAY YETIS** (GLB)
- **Colors:** ice blue `#8ac8f0`, white `#f0f4f8`, navy trim `#2a3a6a`. The helmet is white with an ice-blue stripe,
  the pants navy.
- **Logo:** a yeti footprint. **Home:** Frostbite Field. **Chant:** "BRRR! BRRR!"
- **Team modifier:** STR +2 and TCK +2 on DL and LB; HND +1 on everyone (ball security); SPD −1 on everyone.
  **AI tendencies:** {.50, .45, .05}, blitz .45, late hits .15.
- **Offense:**
  - QB #9 SLEET SORENSEN.
  - RB #30 PLOW PETERSON.
  - WR #82 FLURRY FINN.
  - WR #87 ICICLE IVERSEN.
  - C #61 TUNDRA THORSON.
  - G #70 PERMAFROST PAULSEN.
  - G #77 GLACIER GUNDERSON.
- **Defense:**
  - DE #99 AVALANCHE: the boss; bulky 1.8, a beard; STR 10, SPD 6, TCK 9. Special SNOWPLOW. He speaks only in
    growls.
  - NT #94 BERG BJORKLUND.
  - DE #91 HAILSTORM HANSEN.
  - LB #53 FROSTY FJELD.
  - LB #59 SNOWBALL SVENSSON.
  - CB #23 POWDER PEDERSEN.
  - S #36 WHITEOUT WALLIN.
- **K** #5 SNOWSHOE SAMUELSSON.
- **Cast:** Coach BJORN ICEBERG (fur coat, speaks in proverbs). Mascot ABOMINABLE AL.

**5. GOLD COAST DYNASTY** (GCD; the final boss team)
- **Colors:** gold `#f0c040`, black `#18161e`, white trim `#f4f4f0`. The helmet is gold with a black stripe, the
  pants black.
- **Logo:** a crown on a football. **Home:** The Mega Dome. **Chant:** "DY-NAS-TY!"
- **Team modifier:** +1 to everything. **AI tendencies:** {.45, .50, .05}, blitz .30, late hits .20 (sneaky).
- **Offense:**
  - QB #12 BROCK STERLING III: the boss; ARM 10, AIM 9, AWR 8. Special GOLDEN SPIRAL. The owner's son: smug, never
    been hit.
  - RB #28 CHASE MONEY.
  - WR #13 TREY GOLD: SPD +1.
  - WR #19 PRESTON PLATINUM.
  - C #52 BLUE CHIP BIXBY.
  - G #67 TRUST FUND TUCKER.
  - G #74 OFFSHORE OSGOOD.
- **Defense:**
  - DE #90 GOLDEN GATE GRAYSON.
  - NT #97 VAULT VANCE.
  - DE #94 DIAMOND DUKE.
  - LB #55 "THE MOUNTAIN" MALU FALEOLO: the boss; bulky 1.7; STR 9, TCK 10, SPD 6. Special SEISMIC SACK.
  - LB #50 ROYCE ROLLINS.
  - CB #22 SILVER SPOON SINCLAIR.
  - S #29 HEDGE FUND HARRINGTON.
- **K** #1 PENNY PINCHER PERKINS: KCK 9.
- **Cast:** Coach PRESCOTT PRIMROSE (a cashmere sweater over the shoulders). Owner MONTGOMERY STERLING II (a gold
  suit, a cane; he wants Tumbleweed Field for a parking lot). Mascot GOLDIE (a gold lion head).

**6. THE SCRUBS** (PRC; the practice squad: drills and the chapter 1 scrimmage only, hidden in exhibition)
- **Colors:** grey practice jerseys `#8a8a90`, red trim `#c83a3a`. **Logo:** a whistle with a "P".
- **Team modifier:** −2 to everything. **AI tendencies:** {.60, .40, 0}, blitz .10, late hits 0.
- **Players:** BACKUP BOB, SCOUT TEAM SCOTT, PRACTICE PAT, CLIPBOARD CARL, WATERBOY WALT, DUMMY DAN, FILLER FRANK,
  BENCH BRENDA, TRYOUT TROY, SPARE SPENCER, UNDERSTUDY URSULA, DEPTH CHART DEV, SUB SUSIE, PINNIE PETE, and the
  kicker LONG SHOT LARRY. Numbers 60–99.

**Other cast:** the announcers CHET THUNDERBUNS (play-by-play) and LOU "THE TOE" DIGGS (color). Head ref ZEBRA ZEKE
and two more refs. A cheer squad of 4 per team in team colors with pom-poms. The Mega Dome's marching band of 8
(bass drums and horns drawn by the gear hook). Photographers, a chain gang of 2, TV camera operators.

### 18.2 Stadiums (`12-data-stadiums.js`)
| | TUMBLEWEED FIELD | THE HOG WALLOW | AFTERGLOW ARENA | FROSTBITE FIELD | THE MEGA DOME |
|---|---|---|---|---|---|
| Home | Fiascos | Mudhogs | Nite Owls | Yetis | Dynasty |
| Light | dusk, ambient .62, warm sun from the west; a night variant for the prologue (.3, one flickering light) | overcast .55 | night .35, 4 towers, neon colors | cold day .5, towers | indoor .55, cool white, 6 sweeping spots |
| Weather | clear | rain .6, wind .2, lightning .1 | clear | snow .7, wind .3 | none |
| Field | worn grass, dirt patches | mud blotches between the hashes and at midfield (`mud`), shiny puddle decals | dark synthetic turf, glowing yard lines | snow-dusted grass, ice strips by the sidelines (`ice`), footprints | pristine turf, gold end zones, a giant crown at midfield |
| Backdrop | a sunset sky, mesas, desert hills, cactus silhouettes | a grey sky, bald cypress with moss, fog | a city skyline at night with lit windows, neon billboards | snowy mountains and animated northern lights (green and purple bands) | the dome's dark ceiling truss with lights, banners |
| Stands | 3 tiers of wooden bleachers (`plank`), 35% full (100% in the ending) | 5 tin-roof tiers (`metal`), 80%, ponchos | 7 concrete tiers with neon trims, 90%, glow sticks | 6 tiers, 75%, parkas and fur hats | 8 concrete tiers, 100%, gold and black sections |
| Props | a water tower, a pickup truck, string lights, the hand-flipped scoreboard, hay bales, cacti, an old bench | an airboat, crab traps (crates), a smoking grill, lanterns, a HOG WALLOW sign | neon signs (HOOT, AFTERGLOW), laser emitters (sweeping emissive lines), a DJ booth (speakers, a table), towers | snow-capped pines, a plow (the bulldozer shape in blue), heaters (fire drums), a yeti ice sculpture (crystal) | 4 pyro cannons, the inflatable helmet tunnel, the indoor blimp, the jumbotron, TV cameras, confetti cannons, the trophy stage (the ending) |
| Music | DUST DEVIL STOMP | SWAMP STOMP | NEON NIGHTDRIVE | FROSTBITE FANFARE | MEGA DOME ANTHEM |
| Special | crickets at night | lightning, puddle splashes | LIGHTS OUT (ch3, and a Dev toggle), lasers on TDs | breath puffs, slippery edges | pyro on scores, the halftime band, the blimp's message board |

### 18.3 Plays (`11-data-plays.js`; coordinates in yards from the ball spot, x downfield, y + to the offense's right)
**Offensive formations** (C, LG and RG are always at `[-0.6, 0]`, `[-0.8, -1.4]`, `[-0.8, 1.4]`):

| Formation | QB | RB | WR1 | WR2 |
|---|---|---|---|---|
| PRO | [-1.4, 0] | [-6, 0] | [-0.8, -13] | [-0.8, 12] |
| SHOTGUN | [-5, 0] | [-5, 1.8] | [-0.8, -13] | [-0.8, 12] |
| TIGHT | [-1.4, 0] | [-5, 0] | [-0.8, -6] | [-0.8, 3.4] |
| SPREAD | [-5, 0] | [-0.8, 7] | [-0.8, -15] | [-0.8, 15] |

| Kick formation | Slots |
|---|---|
| PUNT | the K replaces the QB at [-12, 0]; RB up-back [-5, 1.5]; WR1 and WR2 gunners at [-0.8, ∓20] |
| FIELD GOAL | QB holder [-7, 0]; K [-9.5, -1.2]; RB wing [-1, -2.6]; WR2 wing [-1, 2.6]; WR1 sits out |
| KICKOFF | the defense unit with the K for the NT; the K at [-6, 0] behind the spot; the others on the line at y −20, −12, −5, 5, 12, 20 |

**Offensive plays** (QB reads in order; `readT` is when reading starts):

| Tab | Play | Formation | Assignments |
|---|---|---|---|
| RUN | HB DIVE | PRO | QB hands off at 0.45 s, then fakes a drop to [-5, 1]. RB carries [-2.5, 0.6] → [2, 0.8] → [8, 0.8]. C drives the NT. LG seals DE1 (drive [0.3, -1]). RG climbs to LB2. WR1 blocks the CB, WR2 the S. |
| RUN | HB SWEEP | PRO | QB pitches at 0.3 s. RB carries [-5, 4] → [-1, 11] → [6, 13]. LG pulls [-1.8, 1.5] → [0.5, 9], then leads. C reaches the NT. RG seals DE2 inside. WR2 crack-blocks LB2. WR1 blocks the CB. |
| RUN | HB DRAW | SHOTGUN | QB drops to [-6.5, 0] and hands off at 0.9 s. RB waits, then carries [-4.5, 0.5] → [3, 0] → [9, 0]. The OL pass-sets for 0.9 s, then run-blocks the nearest man. WR1 and WR2 run go routes to clear out. |
| RUN | QB SNEAK | TIGHT | QB keeps: [0.5, 0.3] → [4, 0.3]. RB leads into his back. The OL drives straight ahead. WRs block. |
| RUN | COUNTER | PRO | QB hands off at 0.55 s. RB steps [-6, -1.5], then cuts: [-4, 0.5] → [1, 2.6] → [8, 3.5]. LG pulls [-2, 0] → [0, 3] and kicks out DE2. C blocks the NT. RG blocks LB1. WRs block the CB and S. |
| RUN | TOSS | SHOTGUN | QB tosses at 0.2 s. RB carries [-5, -4] → [0, -11] → [6, -13]. WR1 crack-blocks LB1. C and LG reach left. RG cuts off the NT. WR2 blocks the S. |
| PASS | SLANTS | SHOTGUN | Drop [-6, 0]; reads WR2, WR1, RB; readT 0.6. WR1 [2.5, -13] → [9, -6]. WR2 [2.5, 12] → [9, 5]. RB flat [-2, 5] → [1, 10]. |
| PASS | CURLS | SHOTGUN | Drop [-6.5, 0]; reads WR1, WR2, RB. WR1 [11, -13] → [9, -12]. WR2 [11, 12] → [9, 11]. RB swing [-3, -6] → [1, -11]. |
| PASS | DEEP POST | PRO | Drop [-7, 0]; reads WR2, WR1, RB; readT 1.0. WR1 post [12, -13] → [28, -3]. WR2 go [35, 12]. RB blocks 1.2 s, then [2, 3] → [5, 6]. |
| PASS | MESH | SHOTGUN | Reads WR1, WR2, RB. WR1 crosses [5, -13] → [5, 10]. WR2 crosses [7, 12] → [7, -10]. RB wheel [-3, 5] → [2, 10] → [18, 12]. |
| PASS | OUT & UP | SHOTGUN | Reads WR2, WR1, RB; readT 0.9. WR2 [8, 12] → [8, 16] → [30, 17]. WR1 dig [12, -13] → [12, -2]. RB flat [-1, -4] → [2, -9]. |
| PASS | QUICK OUTS | SHOTGUN | Drop [-5.5, 0]; reads WR2, WR1, RB; readT 0.5. WR1 [5, -13] → [5, -18]. WR2 [5, 12] → [5, 17]. RB seam [-1, 0.5] → [6, 0.5]. |
| TRICK | HB SCREEN | SHOTGUN | Drop [-7.5, 0]; reads RB only; readT 1.4. RB to [-3, 5] and waits. The OL pass-sets 0.8 s, then releases to [1, 5], [0, 7], [2, 8] and leads. WR1 go [25, -13]. WR2 blocks. |
| TRICK | FLEA FLICKER | PRO | QB hands off at 0.5 s. RB to [-2, 0.5] and pitches back to the QB at 1.3 s (automatic). QB at [-5, 0] reads WR1, WR2 from 1.8 s. WR1 [30, -8]. WR2 [25, 10]. The OL pass-blocks. |
| TRICK | HOOK & LATERAL | SHOTGUN | Reads WR1 only; readT 0.9. WR1 hook [10, -12] → [9, -12]. WR2 [6, 12] → [9, -7], trailing behind WR1. After the catch, the lateral to WR2 (lb/rb; the CPU laterals by itself when WR2 is within 4 yd behind). RB blocks. |
| TRICK | FUMBLEROOSKI | PRO | QB sets the ball down behind the C at 0.2 s. The C scoops it at 0.6 s and carries [1, -2] → [6, -4] → [12, -5]. QB and RB fake a sweep right ([-4, 6] → [0, 11]). Defenders are fooled for 0.8 s (they chase the RB). LG and RG block. |
| TRICK | HAIL MARY | SPREAD | Drop [-9, 0]; reads WR1, WR2, RB; readT 2.2. WR1 [40, -2]. WR2 [42, 2]. RB [38, 0]. Maximum protection. |
| SPECIAL | PUNT | PUNT | A long snap, the meter, the shield protects 1.5 s, then everyone covers. The gunners sprint. |
| SPECIAL | FIELD GOAL | FIELD GOAL | The snap to the holder, the plant, the kick, the Kick Cam. |
| SPECIAL | FAKE PUNT | PUNT | The punter rolls right and throws to WR1 at [8, -10], or runs when open. |
| SPECIAL | KNEEL | PRO | The QB kneels at once; the clock runs `T.runoff`. |
Kickoff choices: DEEP KICK, SQUIB KICK, ONSIDE KICK. PAT choices: KICK XP, GO FOR 2.

**Defensive formations** (x = yards off the ball on the defense's side; y in the offense's frame):

| Formation | DE1 | NT | DE2 | LB1 | LB2 | CB | S |
|---|---|---|---|---|---|---|---|
| BASE 3-2-2 | [1.2, -2.8] | [1.0, 0] | [1.2, 2.8] | [4.5, -3.5] | [4.5, 3.5] | [6, over WR1] | [12, 0] |
| PRESSURE | as BASE | as BASE | as BASE | [3, -2.5] | [3, 2.5] | [5, over WR1] | [10, over WR2] |
| PREVENT | [1.2, -2.8] | [3, 0] | [1.2, 2.8] | [10, -8] | [10, 8] | [20, -8] | [20, 8] |
| GOAL LINE | [0.9, -2.6] | [0.8, 0] | [0.9, 2.6] | [2.2, -1.5] | [2.2, 1.5] | [1.5, over WR1] | [3, over WR2] |

**Defensive plays:**

| Tab | Play | Formation | Assignments |
|---|---|---|---|
| BASE | COVER 2 | BASE | DE1 and DE2 contain, NT rushes the A gap. LB1 zone [6, -7] r5, LB2 zone [6, 7] r5. CB zone [16, -9] r10, S zone [16, 9] r10. |
| BASE | MAN-TO-MAN | BASE | The DL rushes. CB on WR1, S on WR2, LB2 on the RB. LB1 robber zone [8, 0] r6. |
| BASE | QB SPY | BASE | The DL rushes. LB1 spies the QB. CB on WR1, S on WR2, LB2 on the RB. |
| PRESSURE | LB BLITZ | PRESSURE | The DL rushes; LB1 rushes the A gap, LB2 the B gap. CB on WR1, S on WR2. The RB is free. |
| PRESSURE | ZONE BLITZ | PRESSURE | The NT drops to zone [5, 0] r6. LB1, DE1 and DE2 rush. LB2 zone [6, 6] r5. CB zone [15, -9] r10, S zone [15, 9] r10. |
| PRESSURE | FIASCO BLITZ | PRESSURE | Six rush (everyone but the S). S zone [18, 0] r14. All or nothing. |
| SPECIAL | PREVENT | PREVENT | DE1 and DE2 rush, the NT spies the QB. LB1 zone [10, -8] r7, LB2 zone [10, 8] r7, CB zone [22, -8] r12, S zone [22, 8] r12. |
| SPECIAL | GOAL LINE | GOAL LINE | The DL and LBs fill the A, B and C gaps. CB on WR1, S on WR2. |
| SPECIAL | FG BLOCK | GOAL LINE | Everyone rushes; the NT and LB1 jump at the kick. |
Return choices: RETURN MIDDLE, RETURN LEFT, RETURN RIGHT (the wedge's lane), HANDS TEAM (against an onside kick).
Punt returns: RETURN, BLOCK THE PUNT.

### 18.4 Fiasco Cards
The 8 cards and their rules are in §10.2. Each card needs its art (§12.8), its commentary line (§18.5) and its CPU
trigger.

### 18.5 Commentary line banks (`16-data-lines.js`)
Write at least 8 lines for each of the main events (kickoff, bigRun, td, bigHit, megaHit, sack, int, fumble, drop,
lateHit, hotOn, final) and at least 3 for the rest, in this voice: short (at most 48 characters a line, so they fit
two caption lines at 10 feet), CHET in ALL CAPS and LOU in sentence case, puns and broadcast clichés, never cruel, no
real teams, players or leagues, no real broadcasters' catchphrases, and no profanity ("DAG NABBIT!" is as far as it
goes). The samples set the tone:

| Event | Samples |
|---|---|
| kickoff | CHET: "HERE WE GO! THE BALL IS IN THE AIR!" · LOU: "I used to kick those. Then my leg retired." |
| bigRun | "{player} FINDS DAYLIGHT!" · "THE 40! THE 30! SOMEBODY TACKLE HIM!" · "LOOK AT THOSE WHEELS!" |
| td | "TOUCH! DOWN! {team}!" · "HE IS GONE! LIKE MY HAIRLINE!" · "SIX POINTS AND A SIDE OF FRIES!" · LOU: "Somebody call the mayor." |
| bigHit | "OH! THAT HIT HAD A ZIP CODE!" · "HE JUST GOT DELIVERED!" · "SOMEBODY CALL HIS MAMA!" |
| megaHit | "OH, THE HUMANITY OF IT ALL!" · "HE'S IN ORBIT! NASA, ARE YOU SEEING THIS?" · "HIS HELMET IS IN A DIFFERENT AREA CODE!" |
| sack | "SACKED! {player} PUTS HIM IN A BAG!" · "BROUGHT DOWN LIKE THE GROCERIES!" |
| int | "PICKED OFF! {player} HAS IT!" · "THAT'S A GIFT WITH A BOW ON IT!" · "INTERCEPTED! HE'S TAKING IT TO THE HOUSE!" |
| fumble | "FUMBLE! THE BALL IS LOOSE!" · "THAT'S A FIASCO, FOLKS!" · "BUTTERFINGERS!" |
| pile | "WHO'S GOT IT?! THERE'S A PILE OF HUMANITY!" · LOU: "I see a shoe. I see an elbow. I see a sandwich?" |
| drop | "DROPPED! RIGHT IN THE BREADBASKET!" · LOU: "Hands of stone, Chet. Granite." |
| lateHit | "THE WHISTLE BLEW, FOLKS! HE DID NOT CARE!" · "LATE HIT! AND THE REF JUST SHRUGS!" |
| hotOn | "{player} IS BLAZING!" · "IS IT HOT IN HERE OR IS IT JUST {player}?" · "SOMEBODY GET A FIRE EXTINGUISHER!" |
| hotOff | "AND THE FIRE IS OUT. RESET THE SMOKE ALARMS." |
| card | ROCKET CLEATS "THOSE SHOES ARE ILLEGAL IN FOUR STATES!" · GLUE GLOVES "NOTHING'S GETTING LOOSE NOW!" · BRICK WALL "WHERE'D THEY GET THE BRICKS?!" · HOT SAUCE "HE DRANK THE WHOLE BOTTLE!" · MEGA HIT "SOMEBODY'S GOING TO ORBIT!" · BUTTERFINGERS "THAT BALL IS SLICK AS A GREASED PIG!" · MASCOT MAYHEM "IS THAT {mascot} ON THE FIELD?! IT IS!" · SUPER FOOT "THAT LEG IS INSURED FOR A MILLION BUCKS!" |
| fiascoBreak | "FIASCO BREAK! EVERY DISASTER IS AN OPPORTUNITY!" |
| fgGood / fgMiss | "IT'S GOOD! RIGHT DOWN THE PIPE!" · "DOINK... AND IN! LUCKY, LUCKY!" / "NO GOOD! WIDE LEFT! WIDE EVERYTHING!" |
| punt | "BOOMING PUNT!" · LOU: "Beautiful spiral. I'd know. I never had one." |
| safety | "SAFETY! TWO POINTS AND A LOT OF SHAME!" |
| firstDown / thirdLong / fourthDown / redZone | "MOVE THE CHAINS!" / "THIRD AND A COUNTY MILE!" / "FOURTH DOWN! DECISION TIME!" / "RED ZONE! THE CROWD IS ON ITS FEET!" |
| halftime / final | "THAT'S THE HALF! {team} LEADS {score}!" / "THAT'S THE BALL GAME! {team} WINS IT {score}!" · close: "WHAT A FINISH! I NEED A NAP!" · blowout, LOU: "That wasn't a game, Chet. That was a crime scene." |
| specials | MUDSLIDE "BERTHA IS BULLDOZING THROUGH!" · AFTERBURNER "ZAP JUST BROKE THE SOUND BARRIER!" · SNOWPLOW "AVALANCHE IS CLEARING THE ROAD!" · GOLDEN SPIRAL "THE GOLDEN SPIRAL! YOU CAN'T TOUCH IT!" · SEISMIC SACK "THAT ONE REGISTERED ON THE RICHTER SCALE!" |
| mascot, refDown, lightsOut | "IS THAT A TUMBLEWEED ON THE FIELD?! AND IT'S ON FIRE!" · "AND THE REF GOES DOWN! HE'S FINE! HE'S... MOSTLY FINE!" · "THE LIGHTS ARE OUT AT THE AFTERGLOW!" |
| weather, idle | LOU: "It's raining sideways, Chet." · LOU: "I can't feel my microphone." · LOU: "Football's a lot like life, Chet. Mostly running into things." |
| incomplete, brokenTackle, pancake | "INCOMPLETE. THE BALL HAD OTHER PLANS." · "HE SHRUGGED HIM OFF LIKE A BAD HABIT!" · "PANCAKE! WITH SYRUP!" |
- **Refs** (babble plus a tiny speech bubble): "FIRST DOWN!", "TOUCHDOWN!", "INCOMPLETE!", "BALL'S HERE!", "...SURE,
  WHY NOT."
- **QB cadences** (a small bubble over the QB): Hap "PICKLE 7! PICKLE 7! HUT!"; Brock "GOLD! GOLD! HUT HUT!"; Lumen
  "LIGHTS! CAMERA! HUT!"; Cletus "MUD 44! MUD 44! HUT!"; Sleet "COLD! COLDER! HUT!"; others "BLUE 42! SET... HUT!"

### 18.6 The story scripts (`14-data-story.js`; [stage directions] become E.Story `event` steps)
**PROLOGUE: TUMBLEWEED FIELD, 11:58 PM.** [night, one flickering light, crickets; the team mopes at midfield]
- CHET (radio): "LIVE FROM TUMBLEWEED JUNCTION... WHERE FOOTBALL COMES TO DIE!"
- LOU (radio): "Ninety-nine losses in a row, Chet. You have to admire the consistency."
- MAMA PEARL: "Ninety-nine losses, one leaky roof, and zero quit. That's my Fiascos."
- [a gold golf cart rolls in; a bulldozer rumbles behind it, headlights on]
- STERLING: "Pearl! Sign the papers. This dirt patch would make a lovely parking lot."
- MAMA PEARL: "Over my pickled body, Montgomery."
- BROCK: "Dad, it smells like a pickle barrel exploded out here."
- STERLING: "Fine. The Fiasco Cup. Win it, keep your field. Lose it... and I pave it."
- COACH BLUSTER: "You got yourself a bet! ...Wait. What's the Fiasco Cup?"
- LOU (radio): "Only the most over-the-top football tournament on Earth, Gus."
- CHET (radio): "FOUR GAMES! NO RULES! ONE TROPHY! IT'S THE FIASCO CUP!"
- MAMA PEARL: "Then we need a quarterback. A real one."
- [a spotlight finds HAP, who is carrying two pickle barrels]
- HAP: "I can throw a pickle barrel sixty yards. Does that count?"
- COACH BLUSTER: "Kid... tryouts are at dawn." [title card: THE FIASCO CUP]

**CH1 TRYOUTS.**
- **Intro** [dawn, cones and dummies]:
  - COACH: "Listen up, Hazard! This is tryouts. You fail, you go back to pickles."
  - COACH: "First drill: run the cones. Then hit the turbo like it owes you money!"
- **Between drills,** one line each:
  - D2: "Hike it! The ball goes to the man in the backfield, not the man in the stands!"
  - D3: "Spin, stiff arm, hurdle! Like a ballerina with anger issues!"
  - D4: "See the button over his head? Press it! Football is easy!"
  - D5: "Jump at the top! The ball's shadow tells you where!"
  - D6: "Defense wins championships! Offense wins... also championships. Hit somebody!"
  - D7: "Three taps, son. Power, then aim. Don't kick the holder. AGAIN."
  - D8: "Pick a play. Flip it. And Pearl's hot sauce? That's for emergencies."
  - D9: "One drive. Score, and you're my quarterback."
- **Outro:**
  - COACH: "Hazard, you might be the worst thing to happen to this franchise..."
  - COACH: "...which makes you the best thing to happen to this franchise."
  - MAMA PEARL: "Here, sugar. Pearl's Five-Alarm Hot Sauce. For emergencies only."
  - [cards: HOT SAUCE and SUPER FOOT]

**CH2 THE MUD BOWL.**
- **Intro** [the press room at the Hog Wallow, rain drumming on the tin roof]:
  - CHET: "ROUND ONE! THE FIASCOS VISIT THE BAYOU MUDHOGS IN THE HOG WALLOW!"
  - GATOR: "Y'all ever play in mud this deep? We got crawdads livin' in the end zone."
  - BIG BERTHA: "I'm gonna run through y'all like hot butter through grits."
  - COACH: "Grits don't tackle, ma'am. ...Do they?"
  - HAP: "Coach, why are we wearing snorkels?"
  - COACH: "Mud management, son. Tackle low, hold the ball tight, watch for the MUDSLIDE."
  - LOU: "Rain's coming in sideways, Chet. Fumbles are gonna fly like bats."
- **Halftime** [the visitors' locker room]:
  - COACH: "We're {score} at the half! Somebody tell me what we do about it!" [choice]
  - The choices (each effect lasts the second half): **GROUND AND POUND** (+10% run blocking, carriers break
    tackles +0.05), **AIR IT OUT** (catch +0.06, aim error ×0.9), **HIT 'EM HARDER** (tackle +0.05, Big Hit fumble
    +5%), **TRICKERY** (draw a Fiasco Card).
- **Win:**
  - BIG BERTHA: "Well I'll be. Y'all hit like a family reunion. Respect."
  - GATOR: "Come on back for the crawfish boil. Bring that rookie."
  - CHET: "THE FIASCOS WIN A FOOTBALL GAME! I REPEAT! THE FIASCOS WIN A FOOTBALL GAME!"
  - [card: MEGA HIT]
- **Loss:** COACH: "We got mud in places mud shouldn't go. Again!"

**CH3 LIGHTS OUT.**
- **Intro** [the Afterglow tunnel, neon, bass thumping]:
  - CHET: "THE QUARTERFINAL! THE NEON NITE OWLS AT THE AFTERGLOW!"
  - DJ HOOT: "Welcome to the Afterglow, small town. Hope your eyes can keep up."
  - LUMEN: "I see the open man in the dark. I AM the open man in the dark."
  - ZAP: "You blinked. I'm already in the end zone."
  - [card: 3RD QUARTER. OWLS 21, FIASCOS 7]
  - COACH: "We're down fourteen because SOMEBODY slept through the first half!"
  - WHEELS: "...I needed my beauty rest, Coach."
- **In-game, at the 4th play of Q3** (radio, non-modal):
  - CHET: "WAIT, THE LIGHTS! THE LIGHTS ARE OUT AT THE AFTERGLOW!"
  - LOU: "Looks like a tumbleweed tripped over the power cable, Chet."
  - FUMBLES: [guilty tumbleweed noises]
  - COACH: "Glow paint! Everybody rub on the glow paint!"
  - [LIGHTS OUT for 3 plays]
- **Win:**
  - DJ HOOT: "Respect, Tumbleweed. That comeback was a banger."
  - ZAP: "...Can I get your rookie's autograph? For my cousin. Not for me."
  - [cards: ROCKET CLEATS and GLUE GLOVES]
- **Loss:** COACH: "Somebody turn the lights back on in your heads! Again!"

**CH4 FROSTBITE.**
- **Intro** [Frostbite Field, snow, the northern lights]:
  - CHET: "THE SEMIFINAL! IT'S MINUS TWELVE AND THE HOT DOGS ARE FROZEN SOLID!"
  - ICEBERG: "The glacier does not hurry. Yet it carves the valley."
  - COACH BLUSTER: "...Is that a threat or a fortune cookie?"
  - AVALANCHE: [a growl that shakes the snow off the roof]
  - LOU: "That's Avalanche. Seven feet tall. Speaks only in growls and sacks."
  - [card: 4TH QUARTER, 1:30 LEFT. YETIS 20, FIASCOS 17. YOUR BALL ON YOUR 20]
  - COACH: "Ninety seconds, eighty yards. Get out of bounds to stop the clock!"
- **Win:**
  - AVALANCHE: [a soft growl; he hands Hap a hand-knitted scarf]
  - LOU: "He knits, Chet. The big fella knits."
  - [card: MASCOT MAYHEM]
- **Loss:** COACH: "Frozen solid. Thaw out and run it back!"

**CH5 THE FIASCO BOWL.**
- **Intro** [the Mega Dome press conference, camera flashes]:
  - CHET: "THE FIASCO BOWL! SEVENTY THOUSAND FANS AND ONE BULLDOZER!"
  - BROCK: "I've got a golden arm, a golden helmet, and a golden future."
  - BROCK: "You've got... pickles."
  - HAP: "And you've never been hit by a guy who hauls pickle barrels for a living."
  - THE MOUNTAIN: "I will fall on you. Like a mountain. Because I am THE MOUNTAIN."
  - STERLING: "Win and keep your little field, Pearl. Lose, and the bulldozer's warming up."
  - MAMA PEARL: "Warm it up all you like, Montgomery. It's gonna be a long, cold night."
- **Halftime** [the visitors' locker room]:
  - MAMA PEARL: "Ninety-nine losses taught us one thing: how to get back up."
  - COACH: "So get back up! What's the plan?" [the same 4 choices as CH2]
- **Win** [the field, confetti, the trophy stage]:
  - CHET: "THE TUMBLEWEED FIASCOS ARE FIASCO CUP CHAMPIONS! I NEED TO SIT DOWN!"
  - LOU: "You ARE sitting down, Chet."
  - [the team dumps the sports-drink bucket on Coach Bluster]
  - COACH: "AAAAH! IT'S ORANGE! WHY IS IT ALWAYS ORANGE?!"
  - STERLING: "This is a... a FIASCO!" [he steps back off the stage into the victory cake]
  - MAMA PEARL: "Keep your bulldozer, Montgomery. We're keeping our field."
  - BROCK: "...Hey. Rookie. Nice arm."
  - HAP: "Nice cake, Brock."
  - [EPILOGUE card: TUMBLEWEED FIELD, ONE YEAR LATER. ATTENDANCE: SOLD OUT. The full bleachers chant "FI-AS-CO!",
    then the credits roll over a montage of the season's highlight clips.]
- **Loss:**
  - STERLING: "Start the engines!"
  - COACH: "Not today! Run it back!"

**The credits roll** (`credits` scene): the FIASCO FOREVER ballad. The About pages scroll as credits (§14.10), over
replays of the player's best story highlight clips (or the attract segments when there are none). Any button speeds
it up 4×, and ○ held for 1 s skips it.

---

## 19. Build order and milestones
Build in this order. Each milestone ends with the one test command passing (§21) and its exit check. Systems before
content, and the riskiest systems first. Placeholders are fine *between* milestones; none may remain at the end.
Don't commit to git unless you're asked to (the folder is inside a shared repository).

| M | Milestone | Build | Exit check |
|---|---|---|---|
| M0 | Setup | the dev folder; sparse fetches; the engine copy; E1 and E2; the mocap set and the store props cut; `build.mjs`; `test/run.mjs` and `test/lib/context.mjs`; `index.html`; `package.json` with Playwright | `npm test` prints a count line; `node build.mjs` writes the deliverable and it boots from `file://` |
| M1 | Field and athletes | the stadium builder with Tumbleweed Field (floor paint, stands, crowd v1, goalposts, pylons, sideline props, backdrop, lights); the views; E3 and E4 gear; 14 athletes in formation with team uniforms; the ball drawn; movement, turbo and collisions; one human athlete; the camera following | tests: yard ↔ world, formation spots, collision separation, speed caps. Screenshots of the formation at 1920×1080 and 1280×720 read clearly at TV distance |
| M2 | Football core | the match state machine, rules and clock; `02-tuning.js` and the first Dev sliders (E7); all formations and plays as data; actions (hike, handoff, throw, catch, tackle, dive); AI v1 (blocking, routes, coverage, rush, pursuit, QB reads, carrier steering); kicks (the meter, the Kick Cam, the FG test, kickoffs, punts, returns, touchbacks); INTs and fumbles v1; PATs; HUD v1; the play-call UI v1; the CPU coach; the Play Lab | a whole exhibition (Fiascos vs Mudhogs at Tumbleweed) plays start to finish against the CPU with keyboard, pad, and mouse for passing and menus; the Play Lab bands pass; no stuck plays |
| M3 | Netcode spike | `80-net.js`: the adapter, roles, snapshots, prediction, the action log, play-call and kick sync, leave, time-up, end, finish; the hub card scene (functional); the fake hub and the loopback test; the browser harness runner | the net suite passes; all 4 harness configurations give `__hubCheck.pass === true` on the bundle. If not, §20 risk 2's decision is made now |
| M4 | The over-the-top layer | every action in §7.4; Big and Mega Hits with FX, punch-ins and slow motion; fumbles and pile-ups; Hot Streak; the Fiasco Meter and the 8 cards; boss specials; celebrations; mascots; refs; divots, footprints, breath; replays and the highlight reel; commentary text and pops; crowd excitement, the Wave, signs | each feature's tests (§21.2 `actions`, `ots`, `replay`); a filmstrip of each new animation is clean |
| M5 | Front end and UX | the title, main menu, exhibition setup, play-call final, HUD final, kick meter, results, Hall of Fiasco, About/Credits (wired to `FF_ABOUT`), settings with E2 and E9, glyph chips and device prompts everywhere, mouse hover and click everywhere, the touch-only gate, the pause items, Help; the attract mode with all 16 segments | the `ui`, `control` and `attract` suites; screenshots of every screen at both sizes |
| M6 | Audio | all songs, layers and stings; every sfx; the crowd bed and chants; E5 and E6; the babble synth and every profile; the dialog voice hook; the commentary voice; the Voices, Crowd and Commentary settings | the `audio` suite (no unknown-sound warnings); a listening pass through every scene |
| M7 | Content and story | all 6 teams (rosters, looks, logos, mascots, cast); all 5 stadiums (dressing, weather, light, backdrops, music); story mode (the board, the loadout, the prologue, chapters 1–5, the cutscene sets and scripts, halftime choices, rewards, stars, loss and retry, the ending, the credits); drills D1–D9 with bots; Practice; saves and Continue | the `data` and `story` suites (the scripted whole-game playthrough reaches the credits) |
| M8 | Multiplayer complete | local 1–4 polish (prompts and colors per player, the co-op rules, keyboard halves); hub polish (card art, seat colors and names, the session overlay, Create + Options, stats and awards, results) | the `net` and `control` suites; the harness passes on the new bundle; a manual 2-player local game |
| M9 | Dev, balance, polish, ship | every Dev page; balance against §22.2 with the sliders, the Play Lab and `test/balance.mjs`; the look pass (check.mjs notes, filmstrips, screenshots); the final `about.json`; the final bundle | the full `npm test -- --browser` passes; the §23 checklist is all ticked |

---

## 20. Risks and how to de-risk them
| # | Risk | Why it's risky | De-risk | Fallback |
|---|---|---|---|---|
| 1 | The football AI feels broken: stuck plays, clumps, no blocking | many interacting agents, the heart of the game | build it first (M2) in the Play Lab with overlays; keep behaviors small and data-driven; delay perception for realism; the Monte Carlo bands are tests; tune with sliders | simplify a behavior (zone-only coverage, timed sheds) before shipping a stuck play; never ship a play that can stall |
| 2 | Shared-world netcode under latency and loss | real-time physics across devices | spike it at M3, before content; the arena example's prediction model; action logs that survive loss; a snapshot size budget; the Node loopback with a simulated network; the harness | if prediction can't be made stable by M3's end, ship host-authoritative rendering without prediction (it passes the harness; it feels laggier). Only if the shared world can't pass the harness at all: a parallel-mode "TWO-MINUTE DRILL" round (each player scores what they can against the CPU in 2:00). Decide at M3, write the decision in ENGINE-CHANGES.md's notes and on the About screen. |
| 3 | Animation quality: retargeted clips on bulky rigs, PoseFX pops | new animation | a filmstrip of every clip on every build at M1 and M4; ease all weights; Dev deep links that loop a pose | replace any clip that looks wrong with the engine's procedural poses and E.MOVES |
| 4 | Readability at 10 feet: small characters on a busy field | the TV distance | screenshots at 1080p and 720p from M1; text-size rules (§14.1); panels behind text; E1 and E9 | zoom the default camera in (`camera.start` 1.15) and simplify the field paint |
| 5 | The babble voices sound harsh or annoying | synthesis | a voice test page (a Dev page: say any line with any profile) early in M6; soft envelopes, a bus lowpass, short syllables; the Voices slider; subtitles always on | turn the rate down and use Animalese blips only (letter blips through formants) |
| 6 | Content volume: 6 teams, 5 stadiums, 5 chapters, 35 shapes, 13 songs, 400+ lines | time | content as data with validation; base ratings plus modifiers; content passes after the systems are done (M7); reuse sets (the locker room recolored) | cut variety, never features: fewer props per stadium, 6 lines per event instead of 8 |
| 7 | Engine changes break the engine | a shared base | small isolated changes; after each, `node tools/check.mjs kits/sports.html` and `node kits/test.mjs sports` | revert the change and do it in game code |
| 8 | The single-file bundle | `</script>`, the size, `session.js` integrity, `file://` | the build escapes and checks session.js's hash; check.mjs on the bundle from `file://`; no fetches at runtime | — |
| 9 | Slow headless tests | 14 rigs at 120 Hz | fast mode (presentation off); short quarters through scenario overrides; cheats to finish chapters | split the playthrough into one suite per chapter |
| 10 | Replays mutate or desync the sim | shared state | presentation-only playback from recorded frames; the hash test | — |
| 11 | View switches stall (floor rebakes) | the Kick Cam and replays | measure the rebake in a test; if over 100 ms, pre-bake the Kick Cam views in a boot step | a dissolve hides it |
| 12 | 10-foot scaling breaks the Shell's layout | CSS | `clamp()`; screenshots of pause, settings, controls and Dev at both sizes | lower the scale to 1.4 |
| 13 | Touch-only false positives (touch laptops) | detection | require no fine pointer and no key or pad; any key or pad unlocks | — |
| 14 | The hub card's ready timing | protocol | `ready()` only after the boot steps and the match build; the harness checks it | — |
| 15 | The violence reads as mean | tone | slapstick only: stars, flying helmets, pancakes, no blood, no injuries beyond "Dinged"; the comfort settings respected | — |

---

## 21. Testing

### 21.1 The one command
`npm test` (that is, `node test/run.mjs`) prints **only failures** (`FAIL suite › test: detail`) and one final line:
`N passed, M failed (12.3 s)`. The exit code is 1 on any failure.
- `node test/run.mjs rules ai` runs only those suites. Rerun only the suites covering code you changed. Run the full
  set at the end of each milestone.
- `--browser` adds the Playwright suites. `--seed n` reseeds.
- `test/lib/context.mjs` builds a vm context with stand-ins: `window`, `addEventListener` (records listeners),
  `location { hash }`, `matchMedia` (configurable, for the touch-only tests), `navigator { getGamepads: () => [],
  maxTouchPoints }`, `performance`, and a `console` whose warnings are collected (an engine warning fails the test
  unless it is listed as expected).
- It loads `vendor/` and `src/` in `index.html`'s order (parse the script tags, as `kits/test.mjs` does) and returns
  `{ game, FF, E, I, step(s), tap(a), hold(a, on), feed(...), snap() }`.

### 21.2 The suites
| Suite | What it asserts |
|---|---|
| `boot` | boots headless; the boot steps run; every scene enters and exits with `game.go(..., { fade: 0 })`; deep links parse; no errors |
| `data` | every team (15 unique numbers, ratings 1–10, hex colors, a valid logo), play (every slot assigned, coordinates in range, reads pointing at eligible slots, 3 linemen on the line), stadium (props exist, songs exist), card, chapter (nodes, cast and scenarios exist), drill, line (≤ 48 characters, known variables) and attract segment is valid |
| `rules` | downs and distance, first downs, a turnover on downs, TDs (run and catch), PAT kick and 2-point, FG good, no good and doink, safety, touchback, out of bounds, the incomplete spot, INT and fumble possession, the clock (live, runoff, stops, the last-30 s rule), quarters, halftime ends switching, OT sudden death, the final. All through scenarios with forced outcomes |
| `physics` | speeds by rating and turbo, turbo drain and regen, collision separation after 1 s of pushing, a pass with no aim error landing within 1 unit of its target, bounces, kick distances by power, FG geometry |
| `actions` | every action's pose code and timing; a spin evades a frontal tackle in its window and not outside it; the stiff-arm bonus; a hurdle evades low dives; a Big Hit launches and its fumble roll is ×3 (seeded Monte Carlo within ±0.05); strip; the jump-catch window; laterals; the late-hit window; pile-up resolution; the 3-press meter |
| `ai` | the Play Lab bands (§8.6) for every offense × defense pair (n = 30, seeded, fast mode); the coach's choice in 20 canonical situations (4th & 15 at your 30: punt; 4th & 1 at their 40, late and trailing: go; down 2 after a late TD: go for 2) |
| `ots` | Hot Streak starts at 3 big plays and ends on its reset events; the Fiasco Meter fills and draws a card; each card's effect is measurable (ROCKET CLEATS gives +20% speed, and so on); boss specials fire under their conditions and keep to once per drive or half; Dinged; cosmetics (the flying helmet, divots, breath) don't change the sim hash |
| `replay` | the sim hash is equal before and after a replay; the frame count; the highlight reel keeps the top 5 |
| `control` | switching (auto, b2, a mouse click through `FF.control.pickAt`); the co-op assignment; control after turnovers; keyboard halves get b1–b4, turbo and lb; prompt labels per device and glyph setting (PlayStation by default gives `✕`, Xbox gives `A`, the keyboard gives Space or K, r1–r4 on a full keyboard) |
| `ui` | every menu navigable by keyboard taps, pad taps, and the mouse (`input.feed('move' / 'down' / 'up', x, y)`: hover focuses, a click picks); the title's 10 s idle starts the attract mode and any input leaves it; touch-only mode shows the message and the Settings button; the settings specs hold the game's settings, and `glyphs` defaults to PlayStation with Xbox as the other option (`game.settings.spec('glyphs')`; headless the Shell keeps only screen names, so the Settings screen's look is checked by screenshot, §21.6); `game.menu('settings')` opens the screen named `settings` (`game.shell.screen`); the pause items (`menu.items()`) include Dev Mode outside sessions and not in them |
| `audio` | every sfx and song named in data exists (no unknown-sound warnings during a full attract cycle); the voice planner's plans are deterministic for every profile; Commentary Off plans nothing; a hub `end` leaves the audio muted and the music stopped |
| `dev` | every Dev action runs; each slider changes `FF.T` live (`game.settings.set('dev.speedBase', v)` changes the sim's top speed); Reset all restores the defaults; the Play Lab returns stats; the cheats work |
| `attract` | the whole loop runs headless and each segment's key event fires (TD, fumble, pile-up, doink FG, INT, late hit, ref down, mascot sack, lights out, Snowplow, the story line, the halftime show, Seismic Sack, the trophy, the records); nothing is saved; any input leaves within one step |
| `story` (**the scripted whole-game playthrough**) | title → menu → STORY → NEW GAME → the prologue (confirm taps) → the ch1 drills by their bots → chapters 2–5 with the human side on autopilot (the CPU brains drive its athletes through intents, the play calls are COACH SAYS) with `godMode` and `forceCatch` for that side and `quarterLength: 20` → halftime choices → outros → the ending → the credits → the menu. It checks the chapter flags, the rewards, stars ≥ 1, `game.saves.latest()` with chapter 5 done, Big Heads unlocked, the records, no errors, and no NaN positions (snapshots every 120 steps). Also a loss in one chapter (the CPU forced to win) → THAT'S A FIASCO → RETRY works. Also a 2-player local exhibition (`game.addPlayer({ keys: 'right' })`) to the results and REMATCH. |
| `net` | 2–4 vm contexts with a fake `AIHub` (`test/lib/fakehub.mjs`: `active`, `connect` → info, `ready`, `answer`, `on`, `send(data, { to, reliable })`, `time`, `finish`, `rng(label)`, `server`) over a bus with 150 ± 50 ms latency, 5% loss for unreliable messages, reliable ordering, the 20/s burst-40 limiter, 16 KB maximum, and the card → start → time-up → end flow. Cases: 2 players; 4 players with latency and loss; the host leaving; a server host; a player leaving mid-match (his athletes go CPU); time-up (finish within grace). It checks traffic both ways, ≤ 18 msgs/s per copy, snapshots ≤ 1,100 bytes, the predicted athlete within 2 yd of the host's 95% of the time when not locked, that play calls and kicks arrive, `finish` called once with valid standings (every player once) and scores, every copy ended, nothing sent after `end`, and no errors |
| `browser` (with `--browser`) | (1) `node tools/check.mjs <deliverable> --size 1920x1080` and `--size 1280x720`: exit 0, no errors, look notes saved. (2) The deep links `#match`, `#drill/passing`, `#attract`, `#story/ch5` play 4 s without errors. (3) The hub harness: copy `harness.html`, `bridge.js`, `round.js` and the deliverable into `test/hub/serve/`. Start `python3 -m http.server 0 --bind 127.0.0.1` there (read the port from its output, keep its PID), and confirm that `GET /<deliverable>` contains `AMERICAN FOOTBALL FIASCO`. Open `harness.html?game=<deliverable>&players=2&auto=1`, then `&players=4&latency=150&jitter=50&loss=5&auto=1`, the same with `&scenario=host-leave`, and `&players=2&scenario=server&auto=1` (add `&limit=90` to keep rounds short). Wait for `document.body.dataset.complete === 'true'`. Assert `window.__hubCheck.pass === true`, printing the failed checks otherwise. Stop the server by its PID. |

### 21.3 Devices in tests
- Keyboard and pad go through `input.tap` / `input.hold`. Set `input.lastDevice` to check prompts.
- The mouse goes through `input.feed('move' | 'down' | 'up', x, y, { button })`.
- Headless there is no last frame for `r.pick`, so the game has its own `FF.control.pickAt(sx, sy)`: it projects
  athletes through the current view and hit-tests their bounds. Use it in both the browser and tests, with `r.pick`
  as a cross-check in the browser.

### 21.4 Determinism
Tests seed `FF.rng` through the scenario's `seed` and never read the wall clock. The kits' `proof()` pattern
(`kits/sports.js`) shows that the same seed gives the same match hash twice. Keep a `FF.sim.hash()`.

### 21.5 Filmstrips (animation review; not in the one command)
`node tools/filmstrip.mjs <page>#drill/moves --steps "wait:800 rec:16:2 ..." --seed 1` for the spin, stiff arm,
hurdle and dive, and a Dev deep link `#dev/pose/<CODE>` that loops one pose code on every build, to review each
§12.3 row.

### 21.6 Screenshots (only for what a script can't judge)
`npm run shots` (`test/browser/shots.mjs`) saves to `shots/`, at 1920×1080 and 1280×720:
- the title, the main menu, the exhibition setup, team select;
- the play call (offense, defense, split);
- live play at each of the 5 stadiums, a Big Hit, a TD celebration, a replay, the Kick Cam, a pile-up, a Blazing
  player, LIGHTS OUT;
- each cutscene set, the results, Hall of Fiasco, the About pages;
- the pause menu, Settings (with Button symbols), the Dev screens;
- the touch-only title (`--size 390x844@3`), the hub card.
Review them against §12.1, and fix what reads badly.

---

## 22. Tuning defaults (the Dev sliders; `02-tuning.js`)
| Group | Key: default (min–max) |
|---|---|
| Movement | `speedBase` 92 (60–140), `speedPerSpd` 7 (3–12), `accelBase` 520 (200–1200), `turboMult` 1.25 (1–1.6), `turboDrain` 0.45 (0.1–1.5), `turboRegen` 0.22 (0.05–1), `turboDeadRefill` 0.35 (0–1), `carrySpeedMult` 0.96 (0.8–1), `backpedalMult` 0.65 (0.4–1) |
| Passing | `lobSpeed` 240 (150–350), `bulletSpeed` 400 (250–550), `passGravity` 300 (150–700), `aimError` 0.035 (0–0.12), `maxPass` 55 yd (30–80), `pressureMult` 1.6 (1–3) |
| Catching | `catchBase` 0.66 (0.3–0.95), `catchRadius` 14 (6–24), `contestPenalty` 0.22 (0–0.5), `intBase` 0.10 (0–0.4), `deflectChance` 0.35 (0–0.8) |
| Tackling | `tackleBase` 0.62 (0.3–0.9), `bigHitBonus` 0.12 (0–0.3), `bigHitLaunch` 180 (60–320), `fumbleBase` 0.03 (0–0.2), `stripChance` 0.12 (0–0.4), `stiffBonus` 0.35 (0–0.6), `spinWindow` 0.22 s (0.05–0.4), `gangBonus` 0.18 (0–0.4), `pileRadius` 5 yd (2–10) |
| Blocking | `blockPush` 18 (5–40), `shedBase` 1.9 s (0.5–4) |
| Kicking | `meterSpeed` 1.4 (0.6–3), `accBand` 0.12 (0.04–0.3), `kickGravity` 260 (120–600), `kickApex` punt 260 / kickoff 220 / FG 150 (40–500), `blockChance` 0.6 (0–1), `cpuFgRange` 45 yd (30–60) |
| AI | `aiOpen` 3 yd (1–6), `cushion` 2 yd (0.5–5), `reactionMult` 1 (0.5–2), `aiThinkHz` 20 (5–60), `rubberBand` (by difficulty; a toggle) |
| Rules | `yardsToGo` 20 (10–30), `quarterLength` 120 s (30–300), `runoff` 10 s (0–25), `playcallTime` 12 s (5–30), `autoHike` 8 s (3–20), `lateHitWindow` 1.2 s (0–3), `hotPlays` 6 (1–12), `fiascoMeterMult` 1 (0.25–3) |
| Presentation | `camLead` 0.35 s (0–1), `camSmooth` 0.18 (0–0.6), `crowdDecay` 0.15 (0.02–0.5), `replayRate` 0.5 (0.2–1), `commentaryGap` 2.5 s (1–6), `safeMargin` 8 px (0–24) |

### 22.2 Balance targets
At Pro difficulty, measured over CPU-vs-CPU games and the Play Lab, with 2:00 quarters:

| Measure | Target |
|---|---|
| Points per team per game | 14–28 |
| Completion rate | 55–70% |
| Yards per carry | 4–6 |
| Sacks per team per game | 1–3 |
| Turnovers per game | 1–2.5 |
| FG% from 40–49 yd | 60–75% |
| Average live time per play | 5–8 s |
| Hot Streaks per game | about 1 |
| Fiasco Meter fills per team per game | 1–2 |

`node test/balance.mjs` (not in the one command) runs 20 such games headless and prints these against the targets.

---

## 23. Definition of done and the hand-off
- [ ] Every system and every piece of content in this plan works in the bundle, opened from `file://`. There are no
  TODOs, placeholders, stub features, console errors, engine warnings or debug leftovers. The Dev mode is a feature,
  behind the pause menu.
- [ ] `npm test` and `npm test -- --browser` pass. The hub harness passes all 4 configurations on the final file. The
  scripted playthrough reaches the credits.
- [ ] `tools/check.mjs` has no errors and its look notes are addressed. The screenshots (§21.6) have been reviewed.
- [ ] `src/about.json` is filled in for real. `build.mjs` writes it into the game (`window.FF_ABOUT`, the About and
  Credits pages) and as `exit-interview.json` beside the deliverable, in exactly TASK.md's shape. Check that it parses
  (`node -e "JSON.parse(require('fs').readFileSync('exit-interview.json','utf8'))"`). Write "unknown" for what you
  can't confirm. Suggested values:
  - `sourceInformation`:
    - date: "2026-11-03 17:48:31"
    - source: "American football (over the top arcade style)"
    - plan: "PLAN.md"
    - genre: "Arcade sports (American football) with beat-'em-up hits and a story campaign"
    - perspective: "Sideline broadcast camera (a custom 50° view), a Kick Cam behind the kicker, replay angles"
    - tech: "my-3D2dge v0.85.2 handoff (modified, see the Engine Changes page), AI Hub session client 1.4.0, my-3D2dge
      mocap runtime with a FIASCO clip set, Canvas 2D, Web Audio; Node 24 and Playwright 1.63 for tests". Confirm
      the versions.
    - artDirection: "my-3D2dge native: HD Humanoid rigs drawn as pixel art, lit stadiums, weather, particles; new
      football gear, field painting, 35 shapes, logos"
    - animation: "my-3D2dge procedural rigs, E.MOVES and attack specs, joint post-processing (PoseFX), and 18
      motion-capture clips (Quaternius, Mesh2Motion, CMU)"
    - audio: "The engine's chip synth: original songs and sound effects, a crowd bed, and a formant babble synth for
      Animalese and Simlish voices"
    - online: "AI Hub Session Protocol v1, shared world, 1–4 players; local 1–4 on one machine"
    - testing: what TASK.md allowed and what you used
    - research: what you researched, or "none"
    - environment: "Claude Code CLI (headless); Linux; browser unknown", or yours
    - model: your model and reasoning effort
    - usage: the estimate, or "unknown"
  - `testingFeedback` (4 answers), `engineFeedback` (6 answers), `promptFeedback` (4 answers): your real answers.
  - `aiHub`:
    - name: "American Football Fiasco"
    - tagline: "Over-the-top arcade football"
    - description: "Lead the hopeless Tumbleweed Junction Fiascos through the Fiasco Cup: 7-on-7 arcade football with
      turbo, Big Hits, Hot Streaks, trick plays and mascots, for 1–4 players."
    - type: "Game"
    - genre: "Sports"
    - source: "American football"
    - series: ""
    - players: "1–4"
    - controls: "Stick/WASD run · ✕/Space hike, dive, tackle · ✕○□△ or 1–4/click throw · R2/Shift turbo"
    - tags: ["arcade", "comedy", "versus", "co-op", "story", "retro"]
- [ ] **The final chat reply:** a short summary of the game, plus the Source Information, Testing Feedback, Engine
  Feedback and Prompt Feedback, the same as the About screen.
- [ ] **Clean up:** stop every server you started (by its PID). `.cache/` may be deleted. Leave the dev folder, the
  deliverable and `exit-interview.json`.

---

## Appendix A. Data schemas
```js
// A.1 team
{ id: 'fiascos', name: 'TUMBLEWEED JUNCTION FIASCOS', short: 'FIASCOS', abbr: 'TUM',
  colors: { primary: '#e8742a', secondary: '#4a2a6a', trim: '#f4e8c8', helmet: '#e8742a', stripe: '#4a2a6a', pants: '#f4e8c8', cleats: '#1e1a22' },
  logo: { rows: [/* 16 strings of 16 */], pal: { o: '#e8742a', y: '#ffd84a', b: '#6a4a2a' } }, stadium: 'tumbleweed', chant: ['FI', 'AS', 'CO'],
  mod: { all: { '*': -1 } },                  // or { OL: { STR: 2 }, DL: { STR: 2 }, all: { SPD: -1 } }
  ai: { run: .45, pass: .45, trick: .10, blitz: .25, lateHit: .10 },
  coach: { name: 'GUS BLUSTER', rig: { build: 'bulky', size: 1.2, hat: 'cap', colors: { cloth: '#e8742a', skin: '#f0a080' } }, voice: 'bluster' },
  mascot: { name: 'FUMBLES', head: 'tumbleweed' }, cheer: { count: 4 },
  roster: [{ slot: 'QB', num: 7, name: 'HAP HAZARD', skin: 2, hair: { style: 'short', color: '#6a4a2a' }, delta: { ARM: 2, AWR: 1 }, special: null, bio: 'Rookie. Hauls pickle barrels.' }, /* ... 15 */] }

// A.2 play (offense; defense uses rush / man / zone / spy)
{ id: 'slants', name: 'SLANTS', side: 'off', tab: 'PASS', formation: 'shotgun', type: 'pass', tags: ['quick'],
  qb: { drop: [-6, 0], reads: ['WR2', 'WR1', 'RB'], readT: .6 },
  assign: { C: { block: 'pass', zone: 'mid' }, LG: { block: 'pass', zone: 'left' }, RG: { block: 'pass', zone: 'right' },
            RB: { route: [[-2, 5], [1, 10]], after: 'settle' }, WR1: { route: [[2.5, -13], [9, -6]], after: 'settle' },
            WR2: { route: [[2.5, 12], [9, 5]], after: 'settle' } } }
// a run: QB: { handoff: 'RB', at: .45, then: { fake: [-5, 1] } }, RB: { carry: [[-2.5, .6], [2, .8], [8, .8]] }
// a defense: { id: 'cover2', side: 'def', tab: 'BASE', formation: 'base', assign: { DE1: { rush: 'contain' }, NT: { rush: 'A' },
//   DE2: { rush: 'contain' }, LB1: { zone: { at: [6, -7], r: 5 } }, LB2: { zone: { at: [6, 7], r: 5 } }, CB: { zone: { at: [16, -9], r: 10 } }, S: { zone: { at: [16, 9], r: 10 } } } }

// A.3 stadium
{ id: 'hogwallow', name: 'THE HOG WALLOW', home: 'mudhogs', music: 'SWAMP_STOMP',
  light: { ambient: .55, tint: '#9aa4b0', towers: false, sun: null }, weather: { kind: 'rain', amount: .6, wind: .2, lightning: .1 },
  surface: { stripes: ['#3e6a2e', '#4a7a36'], mud: { blotches: 9, seed: 4 }, ice: null, glowLines: false },
  backdrop: { sky: ['#5a6470', '#7a848e', '#9aa2a8'], layers: [{ kind: 'forest', color: '#2a3a2a', y: .62, height: .25, parallax: .2 }, { kind: 'fog', color: '#8a9490', y: .8, height: .15, parallax: .1, drift: 6 }] },
  stands: { tiers: 5, face: 'metal', roof: 'slab', density: .8, sections: { home: ['#4a6a2a', '#6a4a2a'], away: 'byEndzone' }, signs: ['HOGS!', 'MUD!', 'OINK'] },
  props: [['airboat', -6, -4, { facing: 0 }], ['grill', 20, 58, {}] /* [shape or prop id, x yd from the left goal line, y yd from the far sideline, opts] */],
  specials: ['lightning', 'puddleSplash'] }

// A.4 card
{ id: 'ROCKET_CLEATS', name: 'ROCKET CLEATS', side: 'off', art: 'cleats', text: 'Carrier and receivers +20% speed this play',
  cpu: ctx => (ctx.down >= 3 && ctx.toGo >= 10) || (ctx.trailing && ctx.timeLeft < 120),
  apply: ctx => ctx.mod('speed', a => a.team === ctx.team && (a.carrier || a.role === 'WR' || a.role === 'RB') ? 1.2 : 1, { plays: 1 }) }

// A.5 scenario
{ id: 'ch3', seed: 7, stadium: 'afterglow', weather: null, home: 'owls', away: 'fiascos', humans: { away: [0] }, difficulty: 'pro-',
  quarterLength: 90, quarter: 3, clock: 90, score: { home: 21, away: 7 }, kicking: 'home', start: 'kickoff', // or { possession: 'away', los: 20, down: 1, toGo: 20 }
  cards: { away: 'loadout', home: ['MEGA_HIT'] }, events: [{ when: { quarter: 3, play: 4 }, do: 'lightsOut', plays: 3 }],
  win: { type: 'outscore' }, bonus: { type: 'margin', value: 7 }, cheats: {},
  script: [/* attract and tests: { call: { off: 'deep_post', def: 'cover2', card: 'HOT_SAUCE' }, force: { catch: true, td: true } } */] }

// A.6 intent (one per athlete per step)
{ mx: 0, my: 0, turbo: false, press: 0 /* bits: b1 1, b2 2, b3 4, b4 8, lb 16, rb 32 */, held: 0, recv: -1 /* receiver 0..3 */, click: -1 /* athlete id */ }

// A.7 drill
{ id: 'moves', title: 'MOVES', scenario: { /* A.5 */ }, coach: 'Spin, stiff arm, hurdle! Like a ballerina with anger issues!',
  steps: [{ text: 'Spin past the first tackler', chips: ['b3'], goal: 'evade:spin' }, { text: 'Stiff-arm the second', chips: ['b2'], goal: 'evade:stiff' },
          { text: 'Hurdle the diver', chips: ['b4'], goal: 'evade:hurdle' }, { text: 'Dive into the end zone', chips: ['b1'], goal: 'td:dive' }],
  bot: ctx => { /* intents that complete it */ } }

// A.8 chapter
{ id: 'ch3', n: 3, title: 'LIGHTS OUT', stadium: 'afterglow', opponent: 'owls', scenario: 'ch3', intro: 'ch3_intro', halftime: null,
  win: 'ch3_win', loss: 'ch3_loss', rewards: ['ROCKET_CLEATS', 'GLUE_GLOVES'], bonus: { type: 'margin', value: 7, text: 'Win by 7 or more' } }
```

## Appendix B. Network messages (compact JSON: integers, keys of 1–2 letters)
```js
// client → host, unreliable, 15 Hz
{ t: 'i', at: 41234 /* AIHub.time() ms */, q: 812 /* seq */, a: 3 /* athlete */, p: [10234, 6120] /* x, y × 10 */, v: [1450, -220],
  f: 314 /* facing × 100 */, b: 5 /* held bits */, log: [[57, 1, 0], [58, 4, 2]] /* last 8 actions: [seq, code, arg] */ }
// client → host, reliable
{ t: 'call', ph: 23 /* the play-call id */, play: 'slants', flip: 0, card: null, rcv: 'WR1' }
{ t: 'kick', ph: 24, power: 870, acc: -40, aim: 120 }   // ×1000
// host → all, unreliable, 14 Hz, ≤ 1,100 bytes
{ t: 's', at: 41250, n: 619, ph: 5 /* phase code */, c: 873 /* clock × 10 */, q: 2, sc: [14, 7], d: [3, 120, 10420] /* down, toGo × 10, los x × 10 */,
  ball: [10234, 6120, 140, 1 /* state */, 3 /* holder */], A: [[0, 10234, 6120, 0, 314, 1, 128, 1], /* id, x, y, z (×10), facing, pose, u (0–255), flags */],
  ack: { 1: 58 }, corr: [] }
// host → all, reliable, ≤ 4/s
{ t: 'e', k: 'phase', ph: 24, phase: 'PRESNAP', off: { play: 'slants', flip: 0, card: null }, def: { play: 'cover2', flip: 0, card: 'MEGA_HIT' }, ctl: { 0: 4, 1: 13 } }
{ t: 'e', k: 'ctl', seat: 1, a: 12 }    { t: 'e', k: 'score', sc: [21, 7], by: 5, how: 'td' }
{ t: 'e', k: 'card', team: 1, card: 'HOT_SAUCE' }    { t: 'e', k: 'over', sc: [21, 14], stats: { /* per seat */ } }
```
Flags: 1 carrying, 2 hot, 4 dinged, 8 helmet off, 16 locked, 32 CPU (seat left), 64 special ready. Test the JSON length
of the biggest snapshot (every athlete plus the mascot on the field).

## Appendix C. Pose codes
0 IDLE, 1 RUN, 2 STANCE3, 3 STANCE2, 4 QB_UC, 5 QB_SG, 6 SNAP, 7 DROPBACK, 8 THROW, 9 HANDOFF_GIVE, 10 HANDOFF_TAKE,
11 CARRY, 12 CATCH_READY, 13 CATCH, 14 JUMP, 15 DIVE, 16 TACKLE_DIVE, 17 SPIN, 18 STIFFARM, 19 HURDLE, 20 BLOCK,
21 SHED, 22 BIGHIT, 23 TACKLED, 24 FLY, 25 DOWN, 26 GETUP, 27 PILE, 28 KICK, 29 HOLD, 30 CELEBRATE (u selects the
dance), 31 CHEER, 32 DEJECTED, 33 REF_TD, 34 REF_FD, 35 REF_INC, 36 REF_SHRUG, 37 CHEERLEADER, 38 COACH_YELL, 39 KNEEL,
40 STRIP, 41 LATERAL, 42 DIVE_CATCH, 43 SEISMIC, 44 MUDSLIDE. `poseU` is the action's progress 0–1 (0–255 on the
network).

## Appendix D. Bus events and modifiers
Events, with their commentary priority:
- 10: `td` (scorer, team, how, yards)
- 9: `int` (defender), `fumble` (carrier, forcer), `megaHit`
- 8: `bigHit`, `sack` (defender, qb), `special` (who, kind)
- 7: `catch` (receiver, yards) when 20+ yd, `tackle` (tackler, carrier, bigHit, yards) when the play went 15+ yd,
  `hotOn`, `mascotOn`, `fg` (good, yards, doink)
- 6: `lateHit`, `cardUsed` (team, card)
- 5: `drop` (receiver)
- 4: `firstDown`
- 3: `incomplete`
- 2: weather
- 1: idle chatter
- No commentary priority: `snap`, `handoff`, `pass` (thrower, target, type), `deflect`, `brokenTackle`, `recover`
  (athlete, team), `pile`, `pat` (good, type), `safety`, `touchback`, `turnoverOnDowns`, `punt`, `kickoff`, `return`
  (yards), `outOfBounds`, `hotOff`, `fiascoFill`, `fiascoBreak` (team, card), `refDown`, `lightsOut`, `lightsOn`,
  `quarterEnd`, `halftime`, `twoMinute`, `overtime`, `final` (winner, score), `phase` (from, to).

Modifiers, through `FF.bus.mod(name, value, ctx)` (listeners multiply or add): `tackle.p`, `catch.p`, `int.p`,
`fumble.p`, `speed`, `accel`, `aim.err`, `shed.t`, `kick.acc`, `kick.power`, `turbo.drain`. Cards, Hot Streak,
Dinged, halftime choices, boss specials, difficulty and cheats are all modifiers, so they never edit the core code.
