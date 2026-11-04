# Bentou 2: Birth of the Lunchbox Assassins

*An original isometric ninja stealth-action game, a playful riff on* Tenchu 2: Birth of the Stealth Assassins.
*Build plan for the developers (human or AI) who will build it from TASK.md and this file alone.*

---

## 0. At a glance

**Pitch.** Kasugai Province, the Sengoku era. The granaries are full and the people starve. In the shadow of Kokaku
Castle, a humble shop, the **Jubako-ya**, sells two-tier lunchboxes (jubako) to the lord's household. Its boxes have two
tiers. So does the shop: one tier for the rice and one for the blade. You play one of its two apprentices, **Sojiro**
(katana, steady) or **Kaede** (twin short blades, quick), through the night they pass their trial and become true
**Lunchbox Assassins**. The story is played straight, in the source's earnest, terse feudal-drama voice. The jokes are
deadpan and come from the world (poisoned rice balls, rank names taken from bento grades), never from winking.

**Core loop (one sentence, put it at the top of the game code):** take a mission at the shop, pack your bento of ninja
tools, slip into a lantern-lit night location unseen, silence guards with Silent Cuts, reach the target, survive the
boss, escape, and earn a rank that unlocks new tools.

**Genre:** third-person ninja stealth-action, with light melee combat and boss duels.
**Perspective:** isometric third person on the engine's `iso` view (yaw 45, pitch 30), rotatable in 45-degree steps and
zoomable, with `threequarter` as a Settings alternative ("Camera angle: Low / High"). Tenchu's behind-the-back 3D camera
is not available in this 2D engine. Its job (limited sight, the ki sense, looking around corners) is rebuilt as
**Shadow Sight** (section 5.5): enemies the ninja can't see are hidden unless the Ki gauge senses them.

**Scope of the demo (all required, no stubs):**

- A training mission and three story missions, each with a boss. That is about 45 minutes of play.
- Two playable characters.
- 10 tools, packed in the bento.
- 5 guard types plus civilians and disguised enemies.
- Silent Cuts from 5 directions.
- Grappling hook, swimming and diving, body dragging, wall hugging, light and shadow, noise, alarm bells with
  reinforcements, and an escort mission.
- Ranks and unlocks, and saves.
- Story cutscenes with gibberish voices.
- Dev mode with live balance sliders.
- An attract mode.
- A Mission Editor (the "Workshop", after Tenchu 2's Mission Editor).
- AI Hub ghost-mode multiplayer for 1–4 players, plus its standalone twin, the Shadow Trial, where you race your own
  best ghost.
- An About/Credits screen.

**Deliverables (names follow TASK.md's bracket pattern with GameTitle = `Bentou2`, SOURCE = `Tenchu2`):**

- Dev folder: `Bentou2-Tenchu2-claude-opus-5-5-max-20261103-174734/` (every dev file goes in here).
- Single-file game in the root: `Bentou2-Tenchu2-claude-opus-5-5-max-20261103-174734.html`.
- `exit-interview.json` in the root, beside the HTML.

If your own TASK.md carries a different model or timestamp suffix, use yours. The title stays.

---

## 1. Title selection (done; do not change)

TASK.md asks for a playful riff on the source's name, chosen by a real RNG from 50 silently brainstormed candidates.
The 50 candidates were written into a script and one was drawn with Python's `secrets.randbelow(50)` (the OS CSPRNG).
The draw was 26, so entry #27 won: **"Bentou 2: Birth of the Lunchbox Assassins"**. It riffs on *Tenchu 2: Birth of
the Stealth Assassins* (Tenchu → Bentou/bento; Stealth → Lunchbox). The world and story build on it: the "2" is the
two-tier box and the two apprentices. The title screen shows **BENTOU 2** in large type with the subtitle *Birth of the
Lunchbox Assassins*.

---

## 2. What makes the source distinctive, and how this game captures it

Facts about the source come from research (Wikipedia's article on the game; see the Source Information in section 10).
Tenchu 2 (Acquire / Activision, PlayStation, 2000) is a prequel to the first Tenchu. Three Azuma clan ninja (two
campaigns) support a young lord against a coup in Sengoku Japan. Compared with the first game, it adds:

- redesigned swimming;
- more stealth kills;
- guards that hear better and call reinforcements;
- escort missions;
- ranks per mission that unlock gadgets;
- a widely praised Mission Editor.

Its signatures, and our *original* version of each (no names, characters, levels, music or art are taken from it):

| Source signature | Our version |
|---|---|
| Stealth first; detection is dangerous; the camera limits what you see | **Shadow Sight** hides enemies the ninja cannot see. **Light and shadow, noise and cover** decide detection. Being seen brings shouts, the alarm bell and reinforcements |
| Ki meter: a number showing how near enemies are, colored by their awareness | **Ki Gauge** (bottom left): 0–99 for the nearest sensed enemy; teal, yellow, orange or red with `?` or `!`; a taiko heartbeat when high. **Ki Focus** (hold L2/Tab) extends the sense |
| Instant cinematic stealth kills with an on-screen kanji splash | **Silent Cuts**: 5 directions (back, side, unaware front, from above, from the water), different for each character, with slow motion, a zoom and a red brush splash of **静斬** ("silent cut", an original choice; not the source's kanji) |
| Grappling hook to rooftops | **Kaginawa**: the only way onto roofs. Auto-target, an aim mode, and mouse targeting |
| Ninja tools carried into missions; items chosen before each mission | **The Bento**: 8 compartments (2 tiers × 4) packed on a "Pack the Bento" screen. Food tools (rice balls, poisoned rice, sleep dango, sour plum) and steel tools (shuriken, smoke, caltrops, firecracker, fire pot, straw cloak) |
| Poisoned rice that guards eat | The **Poison Rice Ball**, the game's signature lunchbox item; hungry guards complain about garrison rice |
| Ranks after each mission from kills and times spotted; high ranks unlock gadgets | Results scroll with a hanko rank stamp: **Grand Kaiseki / Makunouchi / Ekiben / Hinomaru / Leftovers** (bento grades). High ranks unlock tools |
| Lord's briefing, mission, boss at the end | Briefings in the shop or the lord's garden; every mission ends in a boss duel |
| Tenchu 2: swimming; enemies call reinforcements; escort missions | Moats and lakes to swim and dive (unseen, with a breath limit); Undertow kills; an alarm bell; the escort of the courier Tobei |
| Tenchu 2: Mission Editor | **Workshop**: a full controller-friendly editor on the same level format the campaign uses; save, test, play, export JSON |
| Several playable ninja, one story | Sojiro and Kaede. Same missions, different stats, moves, Silent Cuts and lines |
| Tone: earnest, melodramatic feudal drama, stoic ninja, a traitor, a hint of the supernatural, comic guard chatter | Same register: a starving province, a corrupt magistrate, a traitor chamberlain in a cursed oni mask, a rival ninja band, guards who mutter about bad rice |

---

## 3. Technology and architecture

### 3.1 Stack and folder layout

- **Engine:** my-3D2dge v0.85.2 handoff package (`github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff`), the full
  readable engine `my-3d2dge.js` (one file, no dependencies). Read its `API.md` whole, `kits/stealth.js` whole (it
  already has guards with `E.sees` / `E.Suspicion`, FlowField chasing, takedowns, parry, Shell HUD, layered music) and
  `docs/ASSETS.md` whole. Grep `API-INDEX.md` for names. The game starts from the STEALTH kit's slice, reorganized into
  the modules below (copy its patterns; delete the kit's starter shell, title menu and other slices).
- **Multiplayer:** AI Hub Session Protocol v1, client `session.js` 1.4.0, pasted unmodified
  (`raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/`). The harness (`harness.html`, `bridge.js`,
  `round.js`) is for tests only.
- **Tooling:** Node 20+ (the machine has Node 24), Playwright with Chromium (the handoff's `package.json` pins it) for
  the browser checks, and Python's `http.server` only for the hub harness.
- **No other libraries, no external fonts, no image or audio files.** Everything is drawn and synthesized in code.

```text
<root>/                                        (the folder holding TASK.md and this PLAN.md)
  Bentou2-Tenchu2-claude-opus-5-5-max-20261103-174734.html   final single file (built)
  exit-interview.json
  Bentou2-Tenchu2-claude-opus-5-5-max-20261103-174734/       dev folder
    engine/my-3d2dge.js        copy of the handoff engine, patched (section 3.3); engine/PATCHES.md lists every change
    vendor/aihub/session.js    unmodified client; harness.html, bridge.js, round.js (tests only)
    handoff/                   API.md, API-INDEX.md, AI_GUIDE.md, docs/ASSETS.md, kits/stealth.js, tools/*.mjs (check,
                               filmstrip, replay, asset-sheet, asset-find), package.json: reference + tools
    src/                       the game, in load order (section 3.4)
    index.html                 dev page: loads engine + each src file with <script> tags (works from file://)
    tools/build.mjs            bundles into the single HTML in <root>
    tests/run.mjs              THE test command (section 9) + tests/*.test.mjs + tests/browser/*.mjs
    shots/                     screenshots and filmstrips (output)
```

Environment rules (from TASK.md):

- Read nothing outside your folder that you don't need; other agents share this machine.
- Prefer `file://` and headless tools.
- The hub harness needs a server. Start `python3 -m http.server 0 --bind 127.0.0.1` from the folder being served, parse
  the port it prints, and confirm the served page is your game before trusting a result.
- Stop only the processes you started, by PID. Never use `pkill`, `killall` or `fuser -k`.
- `/tmp` on this machine is a small, nearly full tmpfs. Keep temp files inside the dev folder.

### 3.2 Build and bundle (`tools/build.mjs`)

One command, `node tools/build.mjs`, writes `<root>/Bentou2-Tenchu2-claude-opus-5-5-max-20261103-174734.html`:

```html
<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>/* session.js, byte-for-byte unmodified (starts with "/*! aihub-session 1.4.0") */</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Silent kills, unseen, fast: top ninja score wins">
<meta name="hub:session-howto" content="Move WASD/stick · Strike click/□ · Jump Space/✕ · Crouch C/○ · Tool R/R2">
<title>Bentou 2: Birth of the Lunchbox Assassins</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head><body>
<!-- E.bootSplash('BENTOU 2') markup -->
<canvas id="screen"></canvas>
<script>/* engine/my-3d2dge.js (patched) */</script>
<script>/* the game: src/*.js concatenated, in order, inside ONE IIFE: (() => { 'use strict'; const E = My3D2dge; ... })(); */</script>
</body></html>
```

- Escape every `</script` inside the inlined code as `<\/script`.
- The session client must be the **first script in `<head>`, right after `<meta charset>`**, unmodified.
- The goal meta is at most 60 characters and the howto meta at most 80.
- `tools/build.mjs --js` writes only the concatenated game script to `dev/build/game.js`. The tests load that, so tests
  and the bundle run the same code.
- The build fails loudly if a `src` file is missing from the order list or if `TODO|FIXME|placeholder|lorem` appears in
  `src`.

### 3.3 Engine patches (do them in `engine/my-3d2dge.js`, mark each `// BENTOU PATCH n`, list them in `PATCHES.md` and on the About screen)

1. **Pixel font glyphs.** Add `✕ ○ □ △` to the 5×7 font `G57` (7-row bitmaps), so `input.label()` text (which returns
   them for PlayStation pads) renders in canvas text and dialogs instead of `?`.
2. **Button symbols setting.** In `STANDARD_SETTINGS.glyphs`, make the default `'playstation'` and the options
   `[['playstation','PlayStation'],['xbox','Xbox']]`. TASK.md: PlayStation glyphs, with an option for Xbox A B X Y.
3. **Humanoid gear** (in the head and weapon draw code, around the face block that draws eyes and mouth):
   - `mask: { color, style: 'cloth' | 'oni' }`. Cloth covers nose and mouth and keeps the eyes; it skips the mouth and
     also draws in portraits. Oni draws a red face with tusks, heavy brows and glowing eyes.
   - New hats: `hat: 'jingasa'` (wide shallow cone) and `hat: 'kabuto'` (helmet with a crest; `crest` color).
   - New weapons:
     - `weapon: 'spear'` (yari: a staff with a blade tip);
     - `weapon: 'bow'` (a curved stave with a string to the draw hand; drawn while `point` is true);
     - `weapon: 'club'` (kanabo: thick, tapered, studded).
   - `offhand: { len }`: a second short blade in the left hand (twin kodachi, twin kama).
   - `sashimono: color`: a small back banner on a pole (samurai).

   Check each with `node handoff/tools/filmstrip.mjs` and the Animation Lab views.
4. **Shell: custom rows.** In `Shell._render`, add `if (s.rows) for (const k of v(s.rows)) add(this._row(k));`, so a
   custom screen can show settings rows (sliders, toggles, choices). In `_settingsRows`, skip the group `'Dev'`, so dev
   sliders never appear in the player's Settings.
5. **Shell: hover moves focus.** Add a `pointermove` listener on the screen that focuses the focusable under the
   pointer (`preventScroll: true`). TASK.md requires that hover moves the focus.
6. **Shell: 10-foot scale.** Add a CSS variable `--ui` (default
   `clamp(1, (innerHeight/720) * userScale, 3)`) and apply it with `zoom: var(--ui)` on `.esh-mod`, `.esh-ttl>div`,
   `.esh-toast`, `.esh-pr`, `.esh-tut`. Recompute it on resize. `userScale` comes from the setting "Interface size"
   (Normal 1, Large 1.25, Huge 1.5). Raise the base font to 16 px and buttons to a minimum height of 52 px.
7. **Music track envelopes.** In `_note`, honor per-track `pluck: true` (non-held exponential decay over
   `ring`, default 1.1 s), `attack` (default .006) and `release`. Koto, shamisen and harp plucks then ring and decay.
   Shakuhachi uses a slow attack (.09) with `vib`.
8. **Voice bus.** Expose `audio.voiceBus` (a gain on `_master`, created in `_init`), and apply the game setting
   `voices` (0–1) to it. The voice synth (section 5.17) connects there.
9. **Hub pause guard.** While `window.AIHub && AIHub.active` and `Pad8` (Create) is held, ignore the `pause` action
   (Options). The hub owns Create + Options.

Keep every patch small, and don't refactor the engine.

### 3.4 Module map (`src/`, concatenated in this order inside one IIFE)

| File | Responsibility | Key exports (on the shared `B` namespace object) |
|---|---|---|
| `00-core.js` | namespace `B`, registries `B.def(kind, id, spec)` / `B.get(kind, id)` / `B.all(kind)`, event bus `B.on/off/emit`, `rand()` (gameplay, Math.random) vs `crand` (cosmetic E.rng stream), math helpers | `B`, `def`, `bus` |
| `01-tune.js` | every balance number as a `game.settings` entry in group `'Dev'` (section 5.20 table), `B.T(key)` getter with difficulty multipliers | `TUNE`, `T()` |
| `02-input.js` | action map (section 4.1), wheel listener, `B.intentFromInput()` (stick + keys, d-pad excluded in play), device and touch-only detection, "any input" clock for attract | `PlayerInput` |
| `03-glyphs.js` | pixel button icons per device and family; `B.glyph(g, action, x, y, o)`, and inline `{a:jump}` tokens in canvas text | `Glyph` |
| `04-camera.js` | follow, 45-degree rotation, zoom, look-ahead (mouse lean, Focus + right stick), cinematic overrides (Silent Cut zoom, boss intro, cutscenes) | `Cam` |
| `10-audio.js` | `audio.define` sfx set, songs with layers (section 5.17), `B.music.mood(level)` | `Sfx`, `Songs`, `Music` |
| `11-voice.js` | gibberish formant voice synth, speaker profiles, dialog hook, barks with distance and panning | `Voice` |
| `20-assets.js` | `E.SHAPES` / `E.MATERIALS` / `E.PATTERNS` for Japanese props, floor textures, wall `decorate` functions, the kawara roof-cap renderer, string sprites (item icons, crest, kanji, moon, eyes) | `Art` |
| `21-rigs.js` | character factories (section 6.1), `Hound` quadruped class, joint post-processing helpers (arms-back ninja run, wall-hug pose, eating, sleeping, mouth cover) | `Rigs`, `Hound` |
| `30-world.js` | level JSON → `World` (TileMap + navigation map + light map + hide map + water + anchors + props + lights + zones); queries (`lightAt`, `isHide`, `isDeep`, `anchorsNear`, `nearestBell`, `zoneAt`) | `World` |
| `31-actors.js` | base `Actor` (a Mover plus rig plus HP plus status); spawn helpers | `Actor` |
| `40-hero.js` | hero controller from an *intent* (section 5.1): traversal, swim, hug, drag, focus, noise emission, tool use, combat hooks | `Hero` |
| `41-silentcut.js` | Silent Cut detection and `E.ACTIONS` entries per variant and character; cinematic and splash | `SilentCut` |
| `42-grapple.js` | anchor search, targeting UI, `E.ACTIONS.grapple`, rope drawing | `Grapple` |
| `43-combat.js` | damage pipeline (`B.damage(src, dst, amount, kind)`), hero combos and jump attack, block, parry, riposte, dodge, i-frames, hit fx | `Combat` |
| `44-tools.js` | the 10 tools: data and behavior (projectiles, lobs, clouds, traps, baits), `Bento` loadout model | `Tools`, `Bento` |
| `50-perception.js` | sight (exposure from light, crouch, cover, motion, look-up limit, smoke), hearing (`B.noise(x,y,z,loud,kind)`), smell, body discovery, Shadow Sight visibility, Ki values | `Perception` |
| `51-guard-brain.js` | guard state machine on top of `E.Suspicion` (section 5.4), patrol, post, sleep, eat, chat, search, chase, fight, flee, bark scheduling, alarm and bell logic | `Brain` |
| `52-enemies.js` | archetype registry: ashigaru, samurai, archer, ninja, hound, civilians, disguised | `def('enemy',...)` |
| `53-bosses.js` | `Boss` base with phases and pattern scripts (`game.script` generators); Ittetsu, Gonroku, Hotaru, Kurogane | `def('boss',...)` |
| `54-escort.js` | the escort follower (Tobei) | `Escort` |
| `60-mission.js` | mission runtime: objectives, triggers, timers, checkpoints, fail states, pickups, interactions | `Mission` |
| `61-score.js` | scoring events → score, ranks, unlocks, best records, results data | `Score` |
| `62-story.js` | all text: crawl, briefings, cutscene scripts, boss lines, barks, results comments (section 6.6) | `Story` |
| `63-cutscene.js` | cutscene player (staged rigs, camera tweens, letterbox, `E.Dialog` with portraits and voices, skip) | `Cutscene` |
| `64-levels-*.js` | one file per level: training, m1, m2, m3, delivery (data only, `def('level', id, {...})`) | level data |
| `65-missions.js` | mission metadata (`def('mission', id, {...})`): title, level, briefing, loadout hint, par, unlock rules, next | mission data |
| `70-hud.js` | canvas HUD (section 4.4): health, Ki gauge, tool box, prompts, tutorial cards, toasts, boss bar, timer, breath, stamina, awareness marks, threat arrows, letterbox, splash | `Hud` |
| `71-scenes-menu.js` | boot, title (idle timer), main menu, character select, mission select, about/credits, touch-only notice | scenes |
| `72-scenes-story.js` | briefing, bento packing, results, game over, ending and credits | scenes |
| `73-scene-mission.js` | the gameplay scene used by story, trial, hub, attract and workshop test play | `MissionScene` |
| `74-dev.js` | dev mode screens, cheats, overlays, sliders (section 5.20) | `Dev` |
| `75-workshop.js` | the Mission Editor (section 5.21) | scene `workshop` |
| `80-autopilot.js` | intent-producing autopilot (beats), shared by attract mode and the playthrough test; per-mission routes | `Autopilot` |
| `81-attract.js` | attract director and vignettes (section 5.19) | scene `attract` |
| `82-hub.js` | AI Hub ghost mode, own card, ghost send and draw, progress and result, end handling; Shadow Trial ghost recording | `Hub`, scene `hubCard` |
| `90-main.js` | `new E.Game(...)`, scene registration, boot steps, saves wiring, `game.debug`, `window.__BENTOU` | — |

Architecture rules (the Emberdeep lessons from AI_GUIDE):

- **A spine, then content.** Content (levels, enemies, tools, bosses, lines) is data in registries and never edits the
  core. Systems talk through the **event bus**:

  ```text
  noise, seen, detected, alert, bodyFound, silentCut, kill, damage, heroDeath, toolUsed,
  objective, checkpoint, bell, boss, missionEnd
  ```

  Score, HUD toasts, music mood, barks, hub progress and tests all listen. None of them is called directly from the
  combat or AI code.
- **One intent interface for the hero.** The player's input adapter, the autopilot and the tests all produce the same
  intent object (section 5.1), so attract mode never touches `game.input` and can't be mistaken for player input.
- **Game logic in world units, with `dt` everywhere.** Gameplay randomness uses `rand()` in update only; cosmetic
  randomness in draw uses `crand` (an `E.rng` stream). Draw code never consumes `Math.random`, which keeps hub-seeded
  runs and tests deterministic at any refresh rate.
- **No DOM at load in headless.** Guard every `matchMedia`, `document` and `navigator` use, so the game runs under
  `node:vm` (as `game/test.mjs` does).

### 3.5 Scenes and flow

```text
boot ─┬─(AIHub.active)──► hubCard ──start──► mission(mode:'hub') ──end──► hub results overlay
      └─► title ◄──────── any input ──── attract (after 10 s idle on title or main menu)
           │ menu: Continue · New Story · Missions · Shadow Trial · Workshop · Settings · About
           ├─ New Story ─► charSelect ─► story(crawl+prologue) ─► briefing ─► bento ─► mission ─► results ─► story ─► …
           │                                                     (training → m1 → m2 → m3 → ending+credits → title)
           ├─ Missions ─► missionSelect (character + mission, best ranks) ─► briefing ─► bento ─► mission ─► results
           ├─ Shadow Trial ─► bento(trial rules) ─► mission(mode:'trial', with your best ghost) ─► results(trial board)
           ├─ Workshop ─► workshop ◄─► mission(mode:'workshop')
           └─ About ─► about (pages)
mission: pausable. Pause = Shell pause: Resume · Restart from checkpoint · Restart mission · Objectives · Dev Mode ·
         Settings · Controls · Full screen · Quit to title   (hub: Resume · Settings · Controls only)
mission death ─► "Your box is empty" overlay: Retry from checkpoint · Restart mission · Quit
```

Scene options:

- `mission`:

  ```js
  { pausable: true, view: 'iso', views: ['iso', 'threequarter'], res: 'ps1', expand: true, input: B.INPUT,
    touch: [], camera: { zoom: [.75, 2], start: 1.15, tall: 1.35, rotate: true, wheel: false } }
  ```

- Menu scenes use the same input preset and `touch: []`.
- The title is a side-view diorama (`view: 'side'`) with a `PlatformMap` ledge and an `E.Backdrop`.

### 3.6 Data formats (the campaign and the Workshop share them exactly)

**Level** (`def('level', id, spec)`; the Workshop exports the same JSON):

```js
{ id: 'm1', name: 'Rice and Ash', size: [56, 48], time: 'night' /* dusk | night | rain | festival */, ambient: .38,
  rows: ['########…', …],                 // terrain only, default legend below (48 strings of 56 chars)
  zones: [{ id: 'mansion', rect: [cx0, cy0, cx1, cy1], name: 'Kanemori Mansion' }],   // HUD place names
  lights: [{ at: [cx, cy], z: 18, r: 64, i: .9, color: '#ffb060', kind: 'stoneLantern' }],   // kind also places its prop
  props: [['stoneLantern', cx, cy, { facing: 0 }], ['bamboo', cx, cy], …],   // solid unless { solid: false }
  anchors: [[cx, cy, z]],                // extra grapple anchors (tree crowns, beams); roof edges are found automatically
  hero: { at: [cx, cy], z: 0, facing: 0 }, exit: { at: [cx, cy], r: 1.5 },
  guards: [{ id: 'g1', type: 'ashigaru', at: [cx, cy], z: 0, facing: 90, mode: 'patrol', lantern: true,
             route: [[cx, cy, wait, lookDeg], …], loop: true, partner: null, faction: 'kanemori' }],
  civilians: [{ id: 'c1', type: 'maid', at: [cx, cy], mode: 'idle', route: null, disguised: false }],
  pickups: [{ id: 'ledger', kind: 'story', at: [cx, cy], z: 0 }, { kind: 'tool', tool: 'riceball', n: 2, at: [cx, cy] }],
  bells: [[cx, cy]], barracks: [[cx, cy]],          // alarm bell spots; where reinforcements come out
  interact: [{ id: 'lever', at: [cx, cy], hold: 1.2, text: 'Open the water gate', do: [['open', cx, cy, w, h]] }],
  escort: { id: 'tobei', at: [cx, cy], hp: 60 },
  boss: { id: 'gonroku', at: [cx, cy], arena: [cx0, cy0, cx1, cy1], start: 'trigger:court' },
  objectives: [{ id: 'kill', type: 'assassinate', target: 'kanemori', text: 'Silence Magistrate Kanemori' },
               { id: 'letter', type: 'retrieve', pickup: 'ledger', optional: true, text: 'Find what he hides' },
               { id: 'escape', type: 'reach', exit: true, after: ['kill', 'boss'], text: 'Escape by the canal boat' }],
  triggers: [{ id: 'court', rect: [cx0, cy0, cx1, cy1], once: true,
               do: [['checkpoint'], ['boss', 'gonroku'], ['say', 'gonroku', 'gon_intro']] }],
  timer: null,            // { seconds: 720, fail: 'text', stopOn: 'objective:sake' }
  par: 600, music: 'm1', weather: null }
```

Trigger conditions:

- `rect` / `at+r` (enter);
- `when: 'objective:<id>'`;
- `'kill:<id>'`;
- `'alert'`;
- `'time:<s>'`;
- `'pickup:<id>'`.

Trigger actions:

- `say`, `toast`, `tutorial`;
- `checkpoint`;
- `spawn` (a guard spec);
- `boss`, `cutscene`;
- `objective` (`show` | `done` | `fail`);
- `open` / `close` (`map.set` cells);
- `music` (layer);
- `flag`.

**Default legend** (rows are terrain; actors are listed in the entity arrays):

| Char | What | Rule |
|---|---|---|
| `.` | earth path | normal footsteps |
| `,` | tall grass | hide: crouched exposure ×0.15, standing ×0.6 |
| `"` | bamboo grove | hide like grass; bamboo props scattered automatically (seeded by cell) |
| `:` | raked gravel | noise ×1.6; even crouch-walking makes noise 12 |
| `=` | wooden boards (engawa, pier) | noise ×1.2 when running; creak sfx |
| `_` | tatami (inside halls) | noise ×0.6 |
| `+` | stone paving | normal |
| `~` | deep water | swim/dive; guards and hounds never enter (nav map blocks it) |
| `-` | shallow water | wade: speed ×0.7, splash noise 40 even walking, no hiding |
| `#` | castle / outer stone wall (ishigaki) | h 56, face granite stone, top slab, `cut: true, cutH: 8`; grapple only |
| `W` | compound wall, plaster with tile cap | h 30 (climbable ledge), face plaster, roof tiles, `cut: true, cutH: 6` |
| `F` | bamboo fence | h 14 (vaulted at a run) |
| `H` | hall wall (enterable building perimeter) | h 40, face timber with shoji `decorate`, `cut: true, cutH: 6`; its roof cap is visual (section 5.18) |
| `d` | doorway in a hall wall | floor `door`; drawn as an open sliding door |
| `A` | townhouse (machiya) | h 40, plaster and timber with lattice, kawara roof (walkable) |
| `B` | two-story house or inn | h 64, timber and plaster, balcony, kawara roof |
| `C` | storehouse (kura) | h 48, white plaster with a namako band, heavy kawara roof |
| `D` | shop with noren curtain | h 40, timber, noren `decorate`, kawara roof |
| `S` | shrine or temple hall | h 56, vermilion pillars, dark kawara roof |
| `T` | watchtower (yagura), 2×2 | h 80, plank, small roof; archers stand on top |
| `G` / `K` / `M` | castle keep tiers | h 64 / 112 / 160; ishigaki base to z 24, then white plaster; chidori gables; golden shachihoko on `M` |
| `P` | planter or stone platform | h 10 (jump up; cover when crouched behind it) |
| `R` | rocks | h 20, face rock, climbable |

Every solid building has a flat walkable top at its height. "No passages under things" is an engine rule, so halls are
enterable but their roofs are not walkable.

**Guard / enemy archetype** (`def('enemy', id, spec)`):

```js
{ rig, hp, walk, run, sight: { range, fov, lookUp }, hear, smell, moves: [...], ranged, climbs, faction, barks,
  canSilentCut: true }
```

**Tool** (`def('tool', id, spec)`):

```js
{ name, icon, stack, use: 'eat' | 'throw' | 'lob' | 'drop' | 'self', range, effect(ctx), unlock }
```

**Mission** (`def('mission', id, spec)`):

```js
{ title, level, briefing, debrief, loadoutHint: [...], par, next, unlocks: [{ tool, rank }] }
```

---

## 4. Controls and UX: controller first, 10 feet from a TV

### 4.1 Action map (`B.INPUT`, passed as `new E.Game({ input })`; every action is rebindable on the standard Controls screen)

| Action | DualSense (default glyphs) | Xbox glyphs (Settings) | Keyboard + mouse | Notes |
|---|---|---|---|---|
| Move | Left stick (tilt <55% = quiet walk) | Left stick | WASD / arrows | in play the d-pad does **not** move: the hero reads the stick and keys only |
| Camera | Right stick: ←/→ flick turns 45°, ↑/↓ zooms | Right stick | Q / E turn 45°, − / = zoom; mouse leans the view toward the cursor | R3 / X resets the camera |
| Jump · climb · vault | ✕ (Pad0) | A | Space | parkour first (ledge ≤ 30, vault ≤ 14, gap leap) |
| Crouch (toggle; hold in Settings) | ○ (Pad1) | B | C | **never bind Ctrl**: Ctrl+W closes the browser tab |
| Strike · Silent Cut · riposte | □ (Pad2) | X | Left click / J | context: the prompt says which |
| Interact (drag body, pick up, open, talk, lever) | △ (Pad3) | Y | F (or left click on a highlighted thing) | |
| Block (hold) · parry (timed) | L1 (Pad4) | LB | Right click / K | block + jump + direction = dodge roll |
| Grappling hook (tap: fire at the highlighted anchor; hold: aim) | R1 (Pad5) | RB | G / middle click | with the mouse: the anchor under the cursor |
| Ki Focus (hold) | L2 (Pad6) | LT | Tab | slows to a walk; sense radius 220; right stick or mouse scouts further |
| Use tool | R2 (Pad7) | RT | R | thrown at the cursor (mouse) or auto-aimed (pad/keys) |
| Sprint | L3 (Pad10, a toggle until the stick is released) | LS | Shift (hold) | stamina |
| Previous / next tool | D-pad ← / → | D-pad | mouse wheel, 1–8 picks a compartment | |
| Eat a rice ball (quick heal) | D-pad ↓ | D-pad ↓ | H | |
| Whistle (lure) | D-pad ↑ | D-pad ↑ | V | noise 70 at the hero: lures nearby guards to search |
| Objectives | Create (Pad8) | View | M | shows the objectives panel (in a hub session Create does nothing: the hub owns Create + Options) |
| Pause | Options (Pad9) | Menu | Esc / P | engine standard (hub: ignored while Create is held) |
| Menus | d-pad / stick, ✕ confirm, ○ back | A / B | arrows, Enter, Esc; mouse hover focuses, click picks | |

Implementation notes:

- Action names, in `B.INPUT` and on the Controls screen (`menu.controls` gives the names):

  | Action | Controls name |
  |---|---|
  | `jump` | Jump / climb |
  | `crouch` | Crouch |
  | `attack` | Strike / Silent Cut |
  | `interact` | Interact |
  | `block` | Block / parry |
  | `grapple` | Grappling hook |
  | `focus` | Ki Focus |
  | `useTool` | Use tool |
  | `sprint` | Sprint |
  | `toolPrev` | Previous tool |
  | `toolNext` | Next tool |
  | `heal` | Eat rice ball |
  | `lure` | Whistle |
  | `camLeft` | Turn camera left |
  | `camRight` | Turn camera right |
  | `camReset` | Reset camera |
  | `objectives` | Objectives |

  The engine adds `up/down/left/right/start/pause/confirm/cancel`. Its menu actions `confirm` (Enter, Space, J, Z,
  pad A) and `cancel` (Escape, Backspace, X, K, pad B) overlap some play keys; that is harmless, because play never
  reads them.
- Movement in play is `B.intentFromInput()`: the left stick from `input.padAxes` with the radial deadzone, plus the
  key codes of the `up/down/left/right` actions that are not `Pad*`, through `game.view.screenDirToGround`. Menus still
  use the engine's `up/down/left/right`, which include the d-pad.
- Tool cycling with the wheel: set `camera.wheel: false` on the mission scene and add a passive `wheel` listener that
  taps `toolPrev` / `toolNext`.
- `input.lastDevice` decides prompts. A mouse used in the last 3 s means "mouse mode": cursor aiming, hover highlights
  and camera lean. A stick or key press ends it.
- Mouse in the world:
  - Hovering a guard shows its awareness meter and type label.
  - Hovering a highlighted interactable within reach changes the left click from Strike to Interact.
  - Hovering a valid roof edge or anchor highlights it for G / middle click.
  - Strikes face the cursor (Diablo-style).
  - Thrown tools land at `game.mouseGround()`, clamped to range.

### 4.2 Glyphs and prompts (`03-glyphs.js`)

- Every prompt, tutorial card, menu footer and dialog token follows the last device used, and redraws the moment it
  changes.
- **Pad (PlayStation):** a dark circle with a colored symbol: ✕ blue `#7ab4ff`, ○ red `#ff6a6a`, □ pink `#ff8ad8`,
  △ green `#5ae0a0`.
- **Pad (Xbox):** A green, B red, X blue, Y yellow.
- **Shoulders, triggers and buttons:** L1/R1/L2/R2 (LB/RB/LT/RT) are rounded tabs. Sticks are rings with an arrow.
  The d-pad is a cross with the used arm lit. Create/Options (View/Menu) are pills.
- **Keyboard:** a light keycap with `input.codeLabel(code)`.
- **Mouse:** a mouse icon with the left, right or middle button lit, or the wheel.
- Icons are 9–11 game pixels tall and drawn with `E.px` (no font dependency). Canvas text can embed `{a:attack}`,
  which renders that action's icon inline.
- HTML (Shell) text uses `input.label()` (Unicode is fine there).

### 4.3 Screens (big, sparse, one decision per screen; never dense web-style tables)

Canvas screens use `E.Menu`, which already moves its cursor on hover and picks on click. HTML screens (pause, settings,
controls, dev, objectives, Workshop menus, About) use one `E.Shell` with this theme:

```js
{ ink: '#f4ead5', paper: 'rgba(20,12,12,.92)', accent: '#e8b04a', muted: '#b8a890', danger: '#d8402a',
  line: 'rgba(232,176,74,.35)', font: 'system-ui, sans-serif', titleFont: 'Georgia, "Times New Roman", serif' }
```

- **Title** (canvas, side view):
  - A night sky with a big moon over a castle silhouette (custom `E.Backdrop`: moon, stars, mountains, castle, fog).
  - Sojiro and Kaede on a tiled ridge in front, scarves fluttering, cherry petals falling.
  - The logo is `E.font.title('BENTOU 2', … { scale: 4, colors: gold → vermilion, depth: 3 })` with the subtitle below
    and the clan crest stamp.
  - "PRESS {a:start}" first, then the `E.Menu`: Continue · New Story · Missions · Shadow Trial · Workshop · Settings
    (`game.menu('settings')`) · About. Missing items are hidden (no Continue without a save).
  - Version line: `E.versionLabel()` + game version, small, bottom right.
- **Character select:**
  - Two rigs on a rooftop, side by side; ←/→ or hover picks one.
  - Name, weapon, three short bars (Strength, Speed, Stealth) and one sentence.
  - A spoken gibberish greeting with a subtitle.
- **Mission select:** a vertical list of unlocked missions on a scroll. Each shows its best rank stamp per character
  and the character toggle (L1/R1).
- **Briefing:**
  - A painted interior (the shop's back room: shoji, stacked boxes, a lantern; or the lord's moonlit garden) with live
    portraits (`rig.drawPortrait`).
  - `E.Dialog` lines with names and voices, then an objectives card (2–3 lines).
  - Hold {a:start} to skip.
- **Pack the Bento:**
  - A black-lacquer two-tier box seen from above; each tier has 4 compartments.
  - The left column is the tool shelf (big icons, name, one-line effect). The stick moves, ✕ fills the focused
    compartment, ○ empties it, △ restores the mission's suggested loadout, Options starts.
  - Mouse: hover focuses, click places, right click empties.
  - Shows each stack count. The last loadout is remembered.
- **Results:**
  - A scroll unrolls. One stat line appears at a time with a brush underline: Time, Silent Cuts, Kills, Times detected,
    Civilians harmed, Optional tasks, Tools used, Retries. Then the score counts up.
  - The rank hanko slams down (screen thump, stamp sound).
  - Granny's one-line comment, and a "New tool" card if one unlocked.
  - Buttons: Continue · Retry · Missions.
- **Game over overlay:** time slows, the screen desaturates, "YOUR BOX IS EMPTY" in brush type, and three choices.
- **About / Credits:** paged (◀ ▶), one section per page, large type (section 5.23).
- **Ending:** cutscene, then a credits roll over the moon. Any input speeds it up; it returns to the title.

### 4.4 In-game HUD (canvas, anchored to `r.W` / `r.H`, inside 4% overscan margins)

| Where | Element |
|---|---|
| top left | health bar (brush stroke in vermilion, the character's crest at its head); below it **静斬 ×n** (Silent Cut count) |
| top center | objective toast on change (fades after 4 s); the boss bar (wide, the name in brush caps, phase ticks); "ALARM!" banner |
| top right | M3 moon timer (an arc with the moon's position; turns red under 60 s); place name on entering a zone (fades) |
| bottom left | **Ki Gauge**: an 18-px-radius semicircle with the number 0–99 in large digits (font scale 2), a colored ring and `?`/`!`; the eye icon in its middle shows your light (closed = shadow, half = dim, open = lit) |
| bottom right | **tool box**: the selected tool's icon (16 px at scale 2) with its count; neighbors slide by on change; d-pad glyphs |
| bottom center | context prompts (at most 2): icon + label ("□ Silent Cut — Back", "R1 Grapple", "△ Drag body", "△ Hold: open gate" with a progress ring) |
| over the hero | breath bubbles when diving; a stamina ring when <100 |
| over guards | `?` yellow (notice), `?` orange (search), `!` red (alert), `Zz` (asleep), `…` (eating), with a small suspicion bar; tinted by Shadow Sight state |
| screen edges | red chevrons toward alerted enemies off screen; `r.marker` objective diamond (Settings: Objective marker) |
| cinematic | letterbox bars (Silent Cuts, boss intros, cutscenes); the 静斬 splash; a red edge pulse when hit |

The objectives panel (Create/M) is an `E.Shell` screen: the mission title, objectives with checkmarks, the time, and
Silent Cuts so far. In the pause menu it is "Objectives".

### 4.5 Touch-only devices

- Detection: `!matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0`, with no gamepad connected
  and no key pressed yet.
- Then: `input.touchEnabled = false`, and no scene declares touch buttons.
- The title replaces its menu with a large panel: **"Controller or keyboard required"**, a line ("Connect a controller
  or a keyboard to play."), and a big **Settings** button (tap → `game.menu('settings')`). The engine corner menu button
  stays.
- Attract mode runs after 10 s as usual, and a tap returns to the title.
- `gamepadconnected` or any key press removes the notice at once.

### 4.6 Settings (the engine's standard screens plus ours in group "Game"; Sound gets "Voices")

| Setting | Values (default first) |
|---|---|
| Button symbols *(engine, patched)* | PlayStation · Xbox |
| Interface size | Auto · Normal · Large · Huge |
| Difficulty | Ninja · Novice · Grand Master: guard perception ×1 / .8 / 1.2, damage taken ×1 / .6 / 1.4, Ki range ×1 / 1.2 / .85 |
| Camera angle | Low (iso) · High (threequarter) |
| Invert camera turn | Off · On |
| Crouch | Toggle · Hold |
| Sight cones | On · Off (the faint cones of guards you can see) |
| Objective marker | On · Off |
| Show all enemies (assist) | Off · On (Shadow Sight off) |
| Ki heartbeat | On · Off |
| Text speed | Normal · Slow · Fast |
| Blood | Ink · Off (red ink splashes and decals) |
| Voices *(Sound)* | slider 0–1, default .8 |

### 4.7 Camera

- `game.follow(hero, { z: 18, lead: 10 })`, `cam.smooth = .12`, `cam.bounds = v => world.map.bounds(v)`.
- **Turn:** `game.rotateView(±45)` with a .25 s cooldown and a short whoosh. The compass on the tool box shows north.
  Movement stays screen-relative through `screenDirToGround`.
- **Zoom:** .75–2×, starting at 1.15 (1.35 on a tall screen). Right stick ↑/↓ or −/=.
- **Look-ahead:** mouse mode leans the focus toward the cursor by up to 40 units (140 with Focus). Pad: Focus + right
  stick pans up to 140 units, eased back on release.
- **Cinematics:**
  - Silent Cut: zoom tween to 1.8× in .15 s, `timeScale = T('slowmo')` for .55 s, letterbox, then restore.
  - Boss intro: a `game.tween` pan to the boss, the name card, then a pan back.
  - Cutscenes: scripted focus and zoom.
  - Respect Reduce motion: no shake, shorter zooms.
- **Occlusion:**
  - The hero always draws with `xray: { actors: true }`. Visible guards draw with `xray: { color: <awareness color> }`.
  - Walls nearest the camera use `cut`.
  - Hall roof caps fade while the hero is inside that hall (section 5.18).

---

## 5. Systems

Numbers marked *T* are live dev sliders (section 5.20). Every system emits bus events and is covered by tests (section 9).

### 5.1 Hero, intent and traversal (`40-hero.js`)

**Intent** (built by `PlayerInput`, `Autopilot` or a test):

```js
{ move: [x, y]  /* world ground dir, length 0..1 */, walk, sprint, crouchPressed, jumpPressed, attackPressed,
  blockDown, interactPressed, interactDown, grapplePressed, grappleDown, grappleReleased, usePressed, focusDown,
  toolDelta, toolSlot, healPressed, lurePressed, aimPoint /* {x,y} or null */ }
```

**Body:**

```js
new E.Mover({ x, y, z, r: 5, climbAny: false, climbMax: 30, vault: 14, hopMax: 48, staminaMax: 100,
              run: T('heroRun'), sneak: T('heroSneak'), sprintSpeed: T('heroSprint'), jumpSpeed: 220 })
```

`climbAny` is off on purpose: roofs need the grapple, as in the source. Fed with
`{ move, sprint, crouch, jumpPressed }` each step. `rig.update(dt, hero.rigState({...}))`.

| Mode | Speed | Noise radius (*T* `noiseRun`) | Notes |
|---|---|---|---|
| walk (stick <55% or Focus) | 50 | 0 | |
| run | *T* 85 (Kaede 92) | 60 (Kaede ×.8) | surface multipliers from the legend |
| sprint (stamina 20/s) | *T* 125 (Kaede 132) | 110 | |
| crouch (toggle) | *T* 32 | 0 (gravel 12) | `hero.chest = 8`; E.sees ×.6 built in |
| jump / land | — | land 50 (roll at 26+ drop silences it to 20) | fall >72 hurts 15 |
| swim (deep water) | 30 | 15 (splash) | no attacks or tools except eat; visible |
| dive (crouch in deep water) | 24 | 0 | **unseen** (exposure 0); breath *T* 12 s, then 8 dmg/s; bubbles |
| wall hug | 24 sideways | 0 | exposure ×.6; peek at corners |
| drag body | 24 | 10 | can't jump, strike or use tools |

- **Wall hug:** crouched and pushing into a wall face (`map.wall(hero, dir)`) for .2 s presses the back to the wall
  (custom pose: arms flat, head turned along the wall).
  - The stick moves along the face only.
  - At a face end, the hero leans out: the camera pans 48 units past the corner, and Shadow Sight checks from a peek
    eye 10 units past the corner.
  - Push away or press ○ to leave.
- **Roll:** block + jump + direction → `hero.dodge(dir, 34)` (invulnerable mid-roll).
- **Drag:**
  - △ near a dead or asleep body grabs it under the arms. The victim's rig stays `down: 1` and is dragged 14 units
    behind, facing up. △ drops it.
  - Dropped in deep water, it sinks (splash, removed).
  - Dropped in grass, bamboo or a lightAt <.3 spot, it is hidden (body discovery needs exposure >.35).
- **Falls and hazards:** Mover's `rollAt` / `hurtAt`. Out-of-map or unwalkable spots → `hero.respawn()` (−10 HP).
- **Stats** (`def('character', …)`):

  | | HP | Damage | Block | Silent Cut | Grapple pull | Noise |
  |---|---|---|---|---|---|---|
  | Sojiro | 100 | ×1.2 | 85% | .9 s | ×1.0 | ×1.0 |
  | Kaede | 80 | ×.85, attacks ×1.25 faster | 70% | .7 s | ×1.15 | ×.8 |

  The hub and Shadow Trial use equal "trial" stats (Sojiro's) for both looks.

### 5.2 Grappling hook — kaginawa (`42-grapple.js`)

- **Anchors:**
  - The auto-found ones are wall tops of solid cells whose top is between `z+16` and `z+T('grappleMaxRise')` (96),
    within `T('grappleRange')` (112) horizontally of the hero.
  - The rope line from the hand (z+28) to the edge point must be clear (`map.ray`), and the landing must be standable
    (`map.standable(edge-in by 6, top)`).
  - Plus the level's `anchors` (tree crowns, beams).
  - Hall walls `H` and keep tiers above the next tier are excluded, so every grapple lands somewhere sensible.
- **Targeting:**
  - Every .1 s, score the candidates: angle to the facing (or to the cursor / aim point) + distance.
  - The best one within a 70-degree cone gets a subtle gold diamond, plus the prompt "R1 Grapple".
  - Hold R1 to aim: time slows to .5, every anchor in range shows, and the stick or cursor picks one.
  - Release fires. Tap fires at the highlighted anchor.
  - In mouse mode, the anchor nearest the `map.pick` point under the cursor wins.
- **Action** `E.ACTIONS.grapple`, with beats `[['throw', .16], ['pull', dist / T('grappleSpeed')], ['mantle', .2]]`:
  - throw: the `throw` move. The rope is drawn from `rig.hand('R')` out to the hook along a sagging curve.
  - pull: the body moves along a quadratic Bezier from the start to the edge point with a 10-unit arc. The rig is
    `air: true` with hands up.
  - mantle: a hang-to-crouch pull-up onto the top, ending crouched.
  - Noise 30 at the hook. It can be fired mid-jump. Cooldown .3 s.
- **Rope drawing:** `r.queue` a 1-px line through 8 points (rope color `#c8b080`, shadowed), with a hook glint at the
  anchor.

### 5.3 Light, shadow and cover (`30-world.js` + `50-perception.js`)

- **Light map:** a grid of half-cells (8 units), baked in a boot step per level:

  ```text
  L = ambientMoon + Σ i · (1 − d/r)² · LOS(light → point)     (LOS = map.los; clamp 0..1)
  ```

  ambientMoon is `.22` at night, `.45` at dusk, `.18` in rain and `.3` at the festival.
- **Dynamic lights**, added at query time: guards' hand lanterns (r 48, i .8), fire, burning fire pots, and lightning
  flashes (rain: all exposure ×2 for .25 s; the thunder sfx follows).
- **Exposure** given to `E.sees` as `hero.exposure`:

  ```text
  lightF = lerp(1 − T('darkness'), 1, L)
  coverF = 1 | grass/bamboo (.15 crouched / .6 standing) | dive 0 | wall hug .6 | Kakuremino .15
  motionF = still .75 | walk 1 | run 1.15 | sprint 1.3
  exposure = lightF · coverF · motionF · (crouch ? T('crouchVis') / .6 : 1)
  ```

  The last factor turns the engine's built-in .6 for crouching into the slider value.
- **Visuals match gameplay:** every light in `lights` is also a `game.lights.add` (with flicker) and a prop.
  - Ambient: `game.lights.ambient` = .38 (night), plus a cool tint.
  - GPU lighting when available: `game.enableGPU({ map })`, which also gives wall shadows. Set both ambients so the
    canvas fallback matches.
- Dev overlay "Light map" draws L as a dithered heat map on the ground.

### 5.4 Perception and guard minds (`50-perception.js`, `51-guard-brain.js`)

- **Sight**, every step per awake guard:

  ```js
  E.sees(g, hero, { map, range: T('sightRange') * g.sightMul, fov: T('sightFov'), eye })
  ```

  then exposure as above, and two gates:
  - **Look-up limit:** if the hero is >16 above the guard's eyes and the elevation angle is above `T('lookUp')`
    (35 degrees), the guard can't see. Archers and ninja ignore this.
  - **Smoke:** if the sight segment passes within a cloud's radius, not seen.
- **Mind:**

  ```js
  g.mind = new E.Suspicion({ rise: T('suspRise'), decay: T('suspDecay'), forget: 7 })
  ```

  Its states are calm, notice (turn toward `mind.last`, bark), search (walk to last, look around 4 s, then a widening
  search around it) and alert (chase or fight).
  - Added game states: `post`, `sleep`, `eat` (bait), `chat` (pairs face each other and bark), `stunned`, `blinded`
    (smoke), `poisoned`, `flee` (civilians, and archers with no arrow line), `returning`.
- **Hearing:**

  ```js
  B.noise(x, y, z, loud, kind)
  for each guard: s = E.hears(g, noise, map) * T('hearing')
  if (s > .15) g.mind.hear(s, noise)
  ```

  Sleeping guards wake at s > .5. Hounds hear ×1.5.
- **Smell** (hounds): within 60 (crouched 40) of the hero → bark (noise 150) and notice. Diving cancels it.
  Fragrant baits within 120 attract them.
- **Bodies:**
  - A guard whose cone sees a body (`E.sees` on the body with exposure from light and cover; bodies in grass, dark or
    water don't count) within `T('bodyRange')` (96) runs to it.
  - It shouts ("Assassin!") → alert-shout noise. The level becomes **Heightened** for 90 s: sight range ×1.2, rise
    ×1.3, and the guard runs for the bell.
- **Barks:** each state change (and calm idles every 12–25 s) picks a line from `Story.barks[category]`. It is spoken by
  the voice synth with a world-positioned subtitle bubble (canvas, 1.5–2.5 s), at most one bark per 2 s within the
  screen.
- **Guard update order:** perceive → mind → behavior → move (`g.flow` = shared FlowField cache by goal cell, LRU 24,
  built on the **nav map**, which blocks water; ninja fields use `{ climb: 56, drop: 56, jump: 60 }`) → rig.

### 5.5 Shadow Sight, the Ki Gauge and Ki Focus (`50-perception.js`, `70-hud.js`)

- **Shadow Sight** (20 Hz): a guard is *visible* if `map.sight(heroEye, guard)` is true within 200 units (360 degrees;
  from the peek eye while hugging).
  - Otherwise, if within `T('kiRange')` (160), it is *sensed*: drawn as a translucent indigo silhouette
    (`alpha .35, flash '#5a5aff', flashMix 1`, no shadow, no cone), but its awareness mark still shows.
  - Otherwise it is *hidden* and not drawn.
  - Civilians follow the same rule. The setting "Show all enemies" and the dev "Reveal all" disable it.
- **Ki number:** `K = max over sensed or visible guards of round(99 · (1 − d / kiRange))`.
  - The color is the highest awareness among them: calm teal `#5ad8c8`, notice yellow `#f0d050`, search orange
    `#f09040`, alert red `#ff4a3a`.
  - The glyph is `?` or `!`.
  - At K ≥ 50, a soft taiko heartbeat (rate 0.8–2.2 Hz by K). Setting: Ki heartbeat.
- **Ki Focus** (hold L2/Tab):
  - The hero walks at most; the zoom eases to .9×; the sense radius is 220; sensed guards brighten and show their sight
    cones through walls.
  - Disguised Red Lanterns get a red aura (only way to spot them). Anchors and pickups in range glint. The world
    desaturates 30%.
  - No cost but speed.

### 5.6 Alarm, reinforcements, Heightened

- An alert guard shouts: noise `T('alertShout')` (160), so guards who hear it search toward the hero's position.
- If a bell is within 240 nav units, the shouting guard (or the first to find a body) **runs to the bell**. After 1.5 s
  of ringing (a big bronze sfx, screen toast "The alarm bell rings!"):
  - all guards go to search at the hero's last known position;
  - the level is Heightened for the rest of the mission;
  - after `T('reinforceDelay')` (15 s), 2 reinforcements (one samurai, one ashigaru, of the level's faction) come out
    of the nearest barracks door.
  - At most 2 waves per mission.
  - Killing the runner before the ring stops it (bonus line: "The bell stays silent.").
- **Music:** tension layer at any notice or K ≥ 60; alert layers (taiko + fue) on any alert, faded out 4 s after the
  last alert ends (`audio.layer`).
- **Calm-down:** an alert guard that loses the hero for `forget` seconds searches, then returns to its route with a
  "lost" bark ("…Must have been the wind."). A Heightened level never fully relaxes.

### 5.7 Silent Cuts — 静斬 (`41-silentcut.js`)

Checked every step for the best candidate. The prompt is "□ Silent Cut — <kind>", and the button runs it. Only
non-boss enemies, and never while they are alert or in combat. `rel` is the angle between the guard's facing and the
direction hero→guard (0 = the hero is directly behind):

| Kind | Condition | Victim | Noise |
|---|---|---|---|
| **Back** | d ≤ *T* `killRange` 18, same level (10), rel < *T* `killBackAngle` 60° | calm, notice or search, not seeing the hero this step | 0 |
| **Side** | d ≤ 18, same level, 60° ≤ rel < 120° | calm only, not seeing the hero | 15 (grunt) |
| **Front** | d ≤ 18, same level, rel ≥ 120° | incapacitated: asleep, eating, stunned, blinded, poisoned | 15 |
| **From above** | hero on a top ≥14 above, horizontal d ≤ 44, `map.arcClear`, hero on ground | calm, notice or search | 0 |
| **Undertow** (from water) | hero swimming or diving, d ≤ 20, victim on a cell next to deep water | not alert | 10 (splash) |

- Each kind is an `E.ACTIONS` paired action per character (copy the engine's `takedown` structure: `beats`, `setup`,
  `at` returning `{ x, y, z, state, other }`), built from `E.move(...)` poses and joint post-processing.

  | Kind | Sojiro | Kaede |
  |---|---|---|
  | Back | `[['grab',.16],['strike',.24],['hold',.25],['drop',.4],['recover',.18]]`: left hand over the mouth (post-processed arm), `thrust` through | a hop, then two `thrust` beats (main and offhand), `drop` |
  | Side | a dash past with `slash` | a `spin` |
  | Front | a `rising` cut, the victim falls backward | an X-cut: `slash` with the main blade and a mirrored `backslash` with the offhand blade at once |
  | Above | the engine's aerial leap with `overhead` | a `plunge` |
  | Undertow | rises with a `claw`-like grab and drags the victim into the water (victim slides, sinks, splash, fades) | same |

  Victims get `hurt`, `expr: 'wince'`, then `down`.
- **Presentation:**
  - Freeze .05.
  - Camera zoom 1.8× and slow motion `T('slowmo')` for .55 s; letterbox.
  - The **静斬** splash: two 32×32 brush-kanji string sprites, red `#d02a20` with a dark edge, drawn scaled ×2 at the
    screen's center-left, with an ink-splatter burst. A small "SILENT CUT" caption under it.
  - A shamisen twang + reverse-swell sting; ink-splatter decals (Blood setting).
  - Restore after .9 s.
- **Effects:** `bus.emit('silentCut', { kind, victim })` gives score +150; the HUD counter goes up; hub progress
  updates.

### 5.8 Combat (`43-combat.js`)

- **Damage pipeline:** `B.damage(src, dst, amount, { kind, angle })` applies:
  1. multipliers: the character's damage multiplier for hero hits; difficulty × *T* `enemyDmg` for hits on the hero;
     *T* `enemyHp` scales enemy HP at spawn;
  2. block (front 120 degrees, reduces by the character's block %);
  3. i-frames (.4 s after a hit);
  4. death → `kill` or `heroDeath` events.

  Hit feedback has **no damage numbers** (the source shows none). Check `game.hitFx`'s options for turning its number
  off; if it can't, call `game.freeze(.05)`, `game.shake`, `particles.impact`, `particles.sparks` and the hit sfx
  yourself, plus ink drops.
- **Hero melee:**
  - Sojiro: `new E.Combo(['slash','backslash','overhead'], { window: .3 })`, damage 14 / 14 / 24.
  - Kaede: `['thrust','backslash','spin']`, damage 9 / 9 / 18, at speed ×1.25.
  - Jump attack: `plunge`, 20 / 16.
  - `attack.hits(enemies, e => E.inArc(hero, facing, e, 20, 1.3, 10), …)`. Face the cursor in mouse mode, or the
    nearest enemy within 40 (auto-aim).
- **Block (L1 hold):** pose `block`. The guard's chip goes through at 15%.
- **Parry:** press block within `T('parryWindow')` (.18 s) before an enemy swing's active beat (the last part of its
  wind-up).
  - The enemy is staggered 1.3 s ("staggered" stars).
  - The prompt "□ Riposte" kills ashigaru, samurai and ninja instantly (a short cinematic, counted as a kill, not a
    Silent Cut) and does 60 damage to bosses.
  - A white flash, ring sfx and sparks.
- **Enemy swings:** `E.Attack(move, { wind: base × T('enemyWindup'), … })` with visible wind-ups, longer than the
  hero's. Red `groundArc` decals warn for area attacks.
- **Hero HP 0:** the `die` pose, then the game over overlay. Retry restores the last checkpoint (section 5.14).

### 5.9 Tools and the Bento (`44-tools.js`)

The bento has 8 compartments (2 tiers × 4). Each holds one tool type, up to that tool's stack; the same tool may fill
several compartments. Stock is unlimited: what limits you is packing. The default loadout comes from the mission's
`loadoutHint`, and the last one is remembered.

| Tool | Stack | Use | Effect (numbers are TUNE entries) | Unlock |
|---|---|---|---|---|
| **Rice Ball** (onigiri) | 3 | eat (.6 s, vulnerable) | +40 HP | start |
| **Poison Rice Ball** | 2 | drop at the feet or a short toss ≤48 | a guard or hound that sees it within *T* `baitRange` 80 (hounds smell 120) and is calm walks to it (`eat` state, back to the room), eats 2 s, then dies 3 s later ("Ugh… my stomach…"). Counts as a kill: +100 "clean" | start |
| **Sleep Dango** | 2 | same as poison | the eater sleeps 25 s (snores, noise 20). Front Silent Cut allowed | rank ≥ Ekiben in "Rice and Ash" |
| **Sour Plum** (umeboshi) | 3 | eat (instant) | stamina full + **soft steps** 20 s (run noise 0, sprint 30) | rank ≥ Ekiben in the Trial |
| **Shuriken** | 10 | throw (`E.Bullets` ground plane, 300 u/s, range 160) | 8 damage; a calm guard hit turns to search toward the thrower's line | start |
| **Smoke Bomb** | 2 | lob ≤96 (or at the feet with block held) | a cloud r 40 for *T* `smokeTime` 6 s blocks sight through it. Guards inside are `blinded` (cough, 1.5 s) and lose the hero (`mind.level` capped at search; last position stale). Big `particles.smoke` | start |
| **Caltrops** | 2 | drop | area r 24 for 20 s: an enemy stepping in takes 6 damage, a 2 s stun, then limps (×.5 speed, 6 s). The hero is immune | start |
| **Firecracker** | 3 | lob ≤128 | pops .8 s after landing: noise 140 at the landing, so non-alert guards search there; hounds bark | start |
| **Fire Pot** (horokudama) | 1 | lob ≤112, explodes on impact | r 32, 45 damage (the hero too if inside), noise 220 (wakes and alerts), fire particles + light 1 s | rank ≥ Makunouchi in "Kiri Lake" |
| **Straw Cloak** (kakuremino) | 1 | self | 15 s: sight rise ×.15 unless within 16, striking or sprinting; drawn as a straw-cloaked silhouette | Grand Kaiseki in any mission |

- **Aiming:** thrown and lobbed tools target `intent.aimPoint` (the mouse ground point). Otherwise auto-aim at the
  nearest visible guard in a 45-degree cone within range, else 80 units ahead. Lobs use `E.arc(from, to, 700, { apex:
  24 })` on a small `E.Body` with a trail.
- Each use emits `toolUsed` (results line "Tools used"). Pickups in levels add to the current stacks, up to the stack.

### 5.10 Bodies

- Dead and asleep guards stay where they fell (rig `down: 1`). Discovery is covered in section 5.4; dragging and
  hiding in section 5.1.
- Bodies in deep water sink. A poisoned guard's body counts as found like any other.
- The dev overlay marks bodies and whether each is hidden.

### 5.11 Enemies and civilians (`52-enemies.js`; rigs in section 6.1)

| Type | HP | Speeds walk/run | Sight range / fov | Moves | Special |
|---|---|---|---|---|---|
| **Ashigaru** (spear) | 40 | 30 / 70 | ×1.0 / 1.5 | `thrust` 12 (wind .42), `overhead` butt 10 | often carries a hand lantern (lights itself: easy to see, sees well) |
| **Samurai** (katana, sashimono) | 70 | 32 / 75 | ×1.05 / 1.5 | `slash` 16 (wind .36), `overhead` 22 (wind .5), blocks frontal hits 50% | parry target; the bell-runner of choice |
| **Archer** (bow, on towers and roofs) | 30 | 28 / 65 | ×1.25 / 1.3; looks up | arrows 14 dmg, 260 u/s at chest height, 1.6 s draw (the `point` pose, bow drawn; the telegraph is a glint) | won't leave its post; flees in melee range |
| **Red Lantern ninja** | 50 | 40 / 95 | ×1.1 / 1.7; looks up | quick `slash` 10 (wind .28), shuriken 6 ×3, dodge rolls | climbs and leaps (FlowField `climb/jump`); notices ×1.3 faster |
| **Hound** (custom quadruped) | 20 | 45 / 120 | ×.8 / 1.8 | bite 8 (wind .25) | smell, bark (noise 150), eats baits from 120 |
| **Civilian** (merchant, maid, monk, drunk, noble, servant) | 15 | 25 / 80 | ×.9 / 1.6 | none | seeing the hero or a body → scream (noise 160) and flee to the nearest guard. Harming one costs −400 |
| **Disguised Red Lantern** (M3) | 50 | as a servant | ×1.1 | becomes a ninja when within 24 of the hero or when attacked | only Ki Focus shows its red aura. A Silent Cut on it is fine; on a real servant it is a civilian harm |

Behaviors are data: `mode: 'patrol' | 'post' | 'sleep' | 'eat' | 'chat'`. Patrol routes are lists of waypoints with
waits and look-around angles; `post` guards sweep their gaze ±60 degrees every 4 s.

### 5.12 Bosses (`53-bosses.js`)

Shared rules:

- A `Boss` has HP, phases at HP fractions, and a pattern script (a `game.script` generator that picks moves by distance
  and phase).
- Every move telegraphs: a wind-up pose, a red `groundArc` or `groundRing` decal, and a sound cue.
- Stealth kills are impossible. Parry works where noted.
- On entry: arena walls (the trigger closes the exits with `map.set`), the boss intro (camera, name card, line) and the
  boss song.
- On defeat: slow motion, a white flash, the defeat line, a checkpoint, and the arena opens.

| Boss | Where | HP | Moves | Phase 2 |
|---|---|---|---|---|
| **Brother Ittetsu** (bokken; training sparring) | gravel ring | 120 | `overhead` (parry lesson), `thrust` (dodge lesson), a 3-hit combo (block lesson) | none; he kneels at 0 ("Well struck.") |
| **Gonroku the Iron Ox** (kanabo, bulky, size 1.9) | Kanemori's inner gravel court, 12×12 | 300 | **Smash** (wind .55, arc 40/60°, 30 dmg; on a miss he is stuck 1.2 s); **Sweep** (wind .4, 120°, 20, parryable); **Charge** (wind .6, 160 u/s for 1 s; hitting a wall stuns him 2 s) | <50%: **Quake** stomp (ring wave to 60 r; jump it), faster smashes |
| **Hotaru of the Red Lantern** (twin kama, size 1.2) | the rain-soaked pier at Kiri Lake | 220 | **Fan** (3–5 shuriken spread, hand flash); **Dash cut** (wind .3, parryable); **Vanish** (smoke, reappears behind after 1.2 s with a back cut; cue: a "shing" + her red lantern glow) | <50%: 2 illusion clones (pop in one hit, throw fans); the real one has a faint red glow |
| **Chamberlain Kurogane** (nodachi, armored, size 1.8) | the top roof of the keep, h 160, 8×8 | 420 | **Three-cut** combo, **Lunge** thrust, **Iron Guard** stance (blocks frontal hits 2 s; flank him or use tools) | at 50% the oni mask wakes (cutscene beat; the rig swaps to size 2.1, eyes glow, ember aura): **Oni Flame** (fire trail on the roof tiles for 3 s), **Fireball volley** (3 lobbed, `E.arc`), **Roar** (stun within 40 unless blocking), summons 2 **spirit flames** (Blobs with `eyeGlow`, fire particles, 1-hit, chase) |

### 5.13 Escort — Tobei (`54-escort.js`, M2)

- Tobei follows the hero within 20–40 units on the ground nav map. He can't grapple or climb, so the escort route has
  no roofs: it runs on the ground through the water gate the hero opens, then swims the channel to the reeds.
- He crouches when the hero crouches and swims when the hero swims.
- △ near him toggles "Wait here" / "Follow me" (bark both ways).
- Guards perceive him like the hero (`E.sees` with his own exposure). If any guard is alert on him, he runs to the hero
  and hides behind them.
- HP 60. If it reaches 0: mission failed ("Tobei has fallen.").
- HUD: a small portrait with an HP pip bar under the health bar while escorting.
- Comic-earnest barks ("Is that a rice ball? …Later. Yes. Later.").

### 5.14 Missions: objectives, triggers, checkpoints, timers (`60-mission.js`)

- **Objective types:**
  - `assassinate` (target dead by any means; a Silent Cut gives a bonus);
  - `retrieve` (pickup collected);
  - `rescue` (reach the NPC and interact);
  - `escort` (the NPC reaches a zone);
  - `reach` (zone; may require `after`);
  - `defeat` (boss);
  - `interact` (hold a lever or post; `count` for "3 ropes");
  - `stopTimer` (M3 sake swap).

  Optional ones give +300 each. States: hidden → active → done or failed. Each change emits `objective` (a HUD toast and
  a voice line if defined).
- **Triggers:** as in section 3.6, evaluated every step.
- **Checkpoints:**
  - Taken by triggers (and after each boss).
  - A snapshot of: hero position, HP refilled, tool stacks, alive/dead and body positions of every actor, objective
    states, opened cells, timer.
  - Retry restores it; guards go back to their route starts, calm, and the level stays Heightened if it was.
  - Each retry: −200 score and "Retries" on the results.
- **Timer (M3):** 12:00 of "moon rising". It stops when the poisoned sake is swapped. At 0, a cutscene ("The lord
  raises his cup…") → mission failed.
- **Fail states:** hero death (unless retried), escort death ("Tobei has fallen."), and timer expiry (M3). Keep the fail
  hook generic (`mission.fail(reason)`), so the Workshop and future missions can add "target escapes".
- **Mission end:** all required objectives done → `missionEnd` → (story) a short outro beat → the results scene.

### 5.15 Score, ranks, unlocks, saves (`61-score.js`)

```text
score = 1000 (complete) + 150·silentCuts + 25·otherKills + 100·cleanKills(poison) + 300·optionalDone
      − 150·detections (count an alert caused by seeing the hero; 5 s cooldown per level) + 400 if detections == 0 ("Unseen")
      − 400·civiliansHarmed − 200·retries + 200 if no damage taken ("Untouched")
      + min(500, max(0, par·T('parTimeMul') − seconds))
rank  = ≥2600 Grand Kaiseki · ≥2000 Makunouchi · ≥1400 Ekiben · ≥800 Hinomaru · else Leftovers   (tune in the balance pass)
```

- **Unlocks:** the per-mission rules in section 5.9's table. New tools are announced on the results screen.
  Dev: Unlock all.
- **Saves:** `game.saves`. `write` returns `{ data, place, level }`; autosave after every results screen and at the
  start of every briefing.
  - Data: `{ v: 1, character, nextMission, completed: {id: true}, best: {id: {char: {score, rank}}}, tools: [...],
    lastLoadout, flags, playSeconds, trialBest }`.
  - The title's Continue = `saves.latest()`.
  - Hub sessions get empty storage from the client automatically; never write saves in a session.
- **Shadow Trial board:** the top 5 local scores in `E.store.set('bentou:trial', …)`, plus the best run's ghost track
  (10 Hz samples).

### 5.16 Story presentation (`62-story.js`, `63-cutscene.js`)

- **Cutscene player:** a scene or overlay that stages rigs at marks, runs `game.script` steps (`say`, `move`, `face`,
  `pose`, `wait`, `camera`, `fade`, `sfx`, `music`), shows letterbox, and uses `E.Dialog` (bottom; names; live
  portraits `{ name, portrait: rig }`).
  - Text speed comes from Settings. Hold Start/Options (or Esc) for .6 s to skip a scene; tap ✕/Enter to finish a page.
- **Dialog voice:** `talk.voice = null`, and `Voice.speakDialog(talk, speaker)` watches `talk.shown`. On each new vowel
  group it plays a syllable in the speaker's profile; punctuation pauses; `?` rises; `!` gets louder. The portrait
  mouths move while typing (built in).
- All text lives in `62-story.js` (section 6.6), ASCII only (the pixel font has no macrons): Sojiro, Kokaku, Jubako-ya.

### 5.17 Audio (`10-audio.js`, `11-voice.js`) — all code, no files

- **Music** on the engine's step sequencer (patched envelopes, section 3.3 #7). Japanese scales, mainly Hirajoshi
  (D E F A Bb) and In (E F A B C).
  - Instruments are named tracks:
    - `koto`: `pulse12`, `pluck: true, ring: 1.2`;
    - `shamisen`: `saw`, `pluck: true, ring: .35`, octave 0;
    - `shaku` (shakuhachi): `sine`, `attack: .09, vib: [5, .012]`;
    - `fue` (flute): `pulse`, high, `vib`;
    - `drone`: `triangle`, low held;
    - `taiko`: `drums` `k`/`t` tokens, and `kane` (bell) via `c`.
  - Mission songs are one song in layers: `drone` + `koto` (base, always on); `shamisen` (tension, `on: false`);
    `taiko` + `fue` (alert, `on: false`). See section 5.6 for when they play.

| Song | bpm | Character |
|---|---|---|
| `title` "Two Tiers" | 72 | koto melody in D Hirajoshi over a drone; a shakuhachi answer every 8 bars; soft taiko on bar ends |
| `shop` "Steam and Lacquer" | 96 | shamisen and koto plucks, light, for briefings, bento packing and menus |
| `training` "Bamboo Breath" | 84 | sparse koto, wind-like shakuhachi; layers |
| `m1` "Rice and Ash" | 90 | low drone, walking koto bass; layers |
| `m2` "Kiri Lake Rain" | 78 | minor drones, dripping high plucks (with the rain weather); layers |
| `m3` "Moon over Kokaku" | 88 | a distant festival fue and drum motif in the base layer; layers |
| `boss` "Iron and Blood" | 132–148 | driving taiko, shamisen riffs, fue shrieks (tempo and key vary per boss via `audio.tempo`) |
| `results` "Report to the Shop" | 80 | calm koto with a stamp hit on the rank |
| `ending` "Fed by All" | 66 | shakuhachi lead, koto arpeggios, then the title motif in major |
| stings | — | silent cut, alert, objective done, bell, game over "Empty Box", new tool, rank stamp (`audio.sting`) |

- **SFX** (`audio.define`), each a short voice list:
  - footsteps by surface (dirt, gravel crunch as band-passed noise, wood knock, tatami soft, splash);
  - grapple whoosh, clink, zip; shuriken whistle and thunk;
  - steel clash, parry ring, Silent Cut twang + thud, body drop, dive, bubbles;
  - smoke puff, caltrop clicks, firecracker cracks, fire pot boom (`explode`);
  - bronze bell (layered sine partials with long decay);
  - dog bark (noise + square formant), eating crunch, snoring, heartbeat (low sine thumps);
  - UI: wood-block move, koto confirm, soft back, fusuma slide (menu open), hanko stamp.
- **Gibberish voices** (`Voice`, Animalese-style, WebAudio on `audio.voiceBus`):
  - Text is converted to syllables: consonant + vowel groups. Vowels `a e i o u` map to formant pairs
    (a 800/1200, e 500/1900, i 300/2300, o 500/900, u 350/800 Hz, scaled by the profile).
  - A syllable is a `sawtooth` (male) or `square`/`pulse` (female) oscillator at the profile pitch with a ±3% random
    jitter (cosmetic rng) and slight vibrato. It feeds two parallel band-pass filters (F1, F2), then a gain envelope
    (attack 8 ms, hold, release 25 ms). The duration comes from the profile speed.
  - Plosives (`p t k b d g`) add a 15–25 ms noise burst at 1.5–4 kHz before the vowel. Fricatives (`s sh f h z`) add
    40–60 ms of high-passed noise. Nasals (`m n`) add a 30 ms low-passed hum.
  - Sentence pitch slopes down 15%; `?` rises 25% on the last 2 syllables; `!` is +20% pitch and +3 dB.
  - Profiles:

    | Speaker | Base Hz | Formant | Syllables/s | Wave |
    |---|---|---|---|---|
    | Granny Oshima | 205 | 1.05 | 9, creaky jitter 6% | square |
    | Sojiro | 108 | .9 | 10 | saw |
    | Kaede | 265 | 1.12 | 13 | pulse |
    | Lord Takanori | 140 | .95 | 10 | saw |
    | Kurogane | 82 | .85 | 8 (phase 2 adds a distorted saw an octave down) | saw |
    | Gonroku | 72 | .8 | 7 | saw |
    | Hotaru | 240 | 1.1 | 14 | pulse |
    | Tobei | 175 | 1.0 | 15 | square |
    | guards | 95–145, per seed | — | — | — |
    | maids / civilians | 230–290 | — | — | — |

  - Barks in the world are attenuated by distance (silent past 220) and panned by screen x (`StereoPannerNode`).
  - Headless: a no-op.

### 5.18 Visuals, assets, animation (engine-native look, PS1-era pixel art)

- **Base:** `res: 'ps1', expand: true` (320×240 minimum; about 427×240 on 16:9), `E.style.propSize = 1.4`, HD Humanoids
  at size 1.15–1.3 (bosses 1.8–2.1), canvas lighting in every mission plus GPU lighting where WebGPU exists.
  TASK.md treats the performance budget as unlimited: dress every screen densely (3–8+ props, many lit lanterns,
  particles, weather, shadows), and don't simplify art for speed. Night palettes:

  | Element | Color |
  |---|---|
  | earth | `#3a3430` |
  | grass | `#2e4a32` |
  | lit plaster | `#d8d0c0` |
  | timber | `#4a3428` |
  | kawara roof tiles | slate `#4a5468` |
  | ishigaki stone | `#6a6a72` |
  | water | `#1e3a5a`, highlights `#4a7aa0` |
  | lantern light | `#ffb060` |
  | moon tint | `#5a6aa8` |

  UI palette:

  | Element | Color |
  |---|---|
  | lacquer black | `#140c0c` |
  | lacquer red | `#8a1c1c` |
  | vermilion | `#d8402a` |
  | gold | `#e8b04a` |
  | paper | `#f4ead5` |
  | ink | `#1a1418` |
  | indigo | `#232a44` |

- **Floors** (`floorTex` per tag):
  - earth = `E.tex.dirt` (dark); grass = `E.tex.grass` (night greens);
  - gravel = a custom texture of light grey speckle with raked parallel lines and rings around rocks;
  - boards = `E.tex.planks`; tatami = straw green-gold with dark cloth borders every 1×2 cells;
  - water = `E.tex.water` (deep and shallow tones); paving = `E.tex.flagstone` (grey).
- **Walls:** material faces (plaster, timber, stone, plank, rock) plus `decorate(face)` painters, baked once:
  - shoji lattice (paper glow on lit faces);
  - koshi wooden slats; noren cloth with the shop crest;
  - the namako diagonal tile band on kura;
  - vermilion pillars on shrines; arrow slits on castle walls.
- **Kawara roof caps** (`Art.roofCap`): for every solid building block, `r.queue` with its `footprint` draws:
  - an eave lip (a 3-unit dark tile strip hanging just below the top edge on visible faces);
  - hip lines from the corners to a ridge beam (white-plaster-capped) along the long axis at h+2, with onigawara end
    tiles;
  - gold shachihoko on keep tier `M`; chidori gables (triangles) on tier faces.

  Roofs stay **flat and walkable** at h (no slope offsets: a deliberate low-risk choice). Hall (`H`) footprints get a
  visual roof cap at h 40 that hides their interior, faded to 0 while the hero stands inside the footprint or on its
  walls.
- **New shapes** (`E.SHAPES`, data, checked with `node handoff/tools/asset-sheet.mjs`):

  | Shape | Built from |
  |---|---|
  | stone lantern (ishidoro) | lathe base, box firebox with flame glow, cyl roof `r2: 0, seg: 6` |
  | paper lantern on a post (chochin) | ball, sz .8, glow material |
  | festival lantern string | a row of small balls between posts |
  | torii | cyl posts, box nuki, prism kasagi |
  | bamboo cluster | 3–5 tall thin cyls with node rings, leaves |
  | maple tree (red) and cherry tree (pink) | the `tree` generator recolored |
  | bonsai pine | `pine` scaled |
  | stepping stones | — |
  | sake barrel (komodaru) | a straw lathe with a rope band |
  | rice bale (tawara) | a cyl on its side, straw |
  | lunchbox stack (jubako) | glazed black and red boxes |
  | noodle stall (yatai) | with a noren |
  | weapon rack | — |
  | archery target (mato) | — |
  | taiko drum on a stand | — |
  | alarm bell (hansho) | a bronze lathe on a ladder frame |
  | well | the core library's |
  | water barrels | — |
  | straw mats | — |
  | moored boat | a prism hull |
  | rice barge | — |
  | mooring post with rope | — |
  | bamboo cage | — |
  | lever | — |
  | nobori banner | animated: a `r.queue` cloth wave |
  | shachihoko | — |

  Use the core `barrel`, `crate`, `sack`, `rock` and `bush` where they fit.
- **Sprites** (`E.sprite` strings):
  - 10 tool icons (16×16); the clan crest (two stacked boxes in a ring, 16 and 32 px);
  - the kanji 静 and 斬 (32×32 brush strokes, hand-authored);
  - moon, eye states, ki glyphs, hanko frame, ink splats, koi (pond decoration);
  - button glyphs (section 4.2).
- **VFX:**
  - ink-blood bits and fading floor stains (setting);
  - smoke clouds (stacked `particles.smoke`, size 2–3);
  - weather: rain (M2, lightning .15); falling cherry petals (training, M1) and maple leaves (M3) as new `E.WEATHER`
    kinds `petals` / `maple`, recolored from `leaves`;
  - fireflies (glints by water); water rings (decal) and splash bits; dust on landing;
  - lantern flicker (light intensity noise); fire (Kurogane, fire pot);
  - spirit embers; a heartbeat edge pulse; an iris transition into missions and a brush-wipe between scenes.
- **New animations** (procedural, on the rig: `rigState` extras, `E.ACTIONS`, and joint post-processing by wrapping
  `rig.solvePose` as AI_GUIDE describes):
  - the ninja run: torso lean, arms swept back, on run and sprint;
  - the crouch sneak (Mover built-in) and wall-hug pose;
  - grapple throw, zip and mantle;
  - swim strokes (alternating arms, body flat via `down: .7`, drawn 10 units lower with a translucent water overlay
    `r.queue` above the waist) and a dive (only shoulders and bubbles; a dark silhouette under the surface);
  - 10 Silent Cut choreographies (section 5.7);
  - drag (hero walking backward hunched; the victim slid);
  - guard idles: look around, yawn and stretch (`hips` + `expr`), chatting gestures, eating (crouched, hand to mouth),
    sleeping (sitting, head bob, `Zz`), the poisoned collapse;
  - archer draw and release; spear thrust; samurai iaido draw on alert;
  - hound walk, run, sniff, bark, eat and die cycles;
  - boss moves: smash, charge, quake stomp, vanish/reappear, clone pop, oni transformation (scale-up flash), roar;
  - victory bow (ojigi) on the results screen; Granny's paddle tap; the lord's toast.

  Check every attack and choreography with `filmstrip.mjs` (a wind-up, a strike, a clean settle).

### 5.19 Attract mode (`81-attract.js`, `80-autopilot.js`)

- **Trigger:** 10 s without input on the title or main menu (the title's `idle` clock resets on any key, button, stick
  beyond the deadzone, mouse move >4 px, wheel, click or touch). Then `game.go('attract', null, { fade: 'dissolve' })`.
- **Exit:** any input of those kinds → `game.go('title')`. The autopilot drives the hero through *intents*, never
  `game.input`, so its activity can't count as input.
- **Overlay:** a small logo top-left, "DEMO PLAY" top-right, "PRESS ANY BUTTON" blinking at the bottom (the glyph for
  the current device).
- **Loop:** vignettes cycle forever. Each loads its level (cached), spawns only the actors it lists at given positions
  and states, gives the hero cheats (invulnerable, unlimited tools), runs its beats, and stops at its cap. The guard AI
  runs for real.

| # | Vignette | Level / beats (about 15–25 s each) |
|---|---|---|
| 1 | **Rooftops** | M1 south: run along a roof, leap a gap, grapple to a two-story roof, crouch at the edge, Silent Cut from above on a guard below |
| 2 | **Silent Cut** | M1 alley: shadow a lantern ashigaru crouched (Ki rising), Back Silent Cut with the full splash |
| 3 | **Rice for the Hungry** | M1 garden: drop a poison rice ball; a guard finds it ("Oh? A rice ball…"), eats, collapses; drag the body into bamboo |
| 4 | **The Moat** | M2: swim, dive under an archer's sweep (breath bubbles), Undertow kill at the pier |
| 5 | **Smoke and Steel** | M2 bailey: get spotted (!), the alert music swells; smoke bomb, guards lose track ("Where did he go?!"); parry and riposte a third guard |
| 6 | **Oni on the Roof** | M3 keep top: Kurogane phase 2 flames; dodge, combo, final hit, defeat flash |
| 7 | **Report** | the results scroll with a Grand Kaiseki stamp, then the title logo card (4 s) |

- **Autopilot beats:**

  ```text
  { at, facing }         (teleport)
  { goto: [cx, cy], gait } (shared FlowField toward a cell; arrives within 6)
  { wait: s }, { until: fn }, { press: action }, { hold: action, s }
  { grapple: [cx, cy, z] }, { use: tool, at }, { cut: guardId }   (approach from behind on the nav map, then the cut)
  { fight: seconds }     (approach; attack in range; block on enemy wind-up; roll away from red decals)
  { camera: { zoom, pan } }, { say: [...] }
  ```

  Each beat times out at 8 s and skips ahead, so the loop can't get stuck. Routes for the playthrough test are the same
  beats.

### 5.20 Dev mode (`74-dev.js`) — pause menu → **Dev Mode** (not offered in hub sessions or attract)

Shell custom screens, using the patched `rows` (section 3.3 #4). Pages have at most 8 rows each (10-foot readable).
L1/R1 (keyboard: PageUp/PageDown, mouse: the "◀ Prev page" / "Next page ▶" buttons at the bottom of each page) switch
pages; left/right stay on the focused slider. Toggles and actions are Shell buttons whose labels show their state
("God mode: On").

1. **Cheats:**
   - Toggles: God mode, Invisible to guards, No-clip (walk through walls; jump/crouch fly up/down), Infinite tools,
     One-hit kills, Freeze AI, Reveal all enemies.
   - Actions: Heal, Give all tools, Unlock everything.
2. **Mission:** Complete current objective, Kill all enemies, Alert all, Calm all, Spawn guard here (cycles the type),
   Skip to boss, Win mission (choose rank), Fail mission, Restart mission, Jump to mission…, **Edit this level**
   (opens the Workshop on the current level).
3. **Teleport:** to start / next objective / boss arena / exit / each zone; **to cursor** (closes the menu; the next
   click or ✕ on the ground teleports there).
4. **Debug view:** AI overlay (cones for all guards, state labels, suspicion bars, last-known points, patrol routes,
   noise rings, FlowField arrows), Light map, Nav map, Hide spots, Grapple anchors, Ranges (kill range, block arc,
   bait radius), Time scale (.25 / .5 / 1 / 2 / 4), Show frame rate (engine setting), Free camera (`cam.free`).
5. **Balance pages**, live sliders bound to `game.settings` group `'Dev'`, each with **Reset page**, plus **Reset all
   to defaults** (`game.settings.reset('Dev')`). The 32 sliders:

   **Hero**

   | Key | Default | Range |
   |---|---|---|
   | heroRun | 85 | 60–130 |
   | heroSneak | 32 | 18–50 |
   | heroSprint | 125 | 90–170 |
   | heroHpMul | 1 | .5–2 |
   | grappleRange | 112 | 64–200 |
   | grappleSpeed | 240 | 120–400 |
   | breath | 12 s | 5–30 |
   | noiseRun | 60 | 20–140 |

   **Guards**

   | Key | Default | Range |
   |---|---|---|
   | sightRange | 112 | 60–200 |
   | sightFov | 1.5 | .8–2.4 |
   | suspRise | 1.4 | .4–3 |
   | suspDecay | .3 | .05–1 |
   | darkness | .65 | 0–1 |
   | crouchVis | .55 | .2–1 |
   | hearing | 1 | .3–2 |
   | lookUp | 35° | 15–70 |

   **Combat and tools**

   | Key | Default | Range |
   |---|---|---|
   | killRange | 18 | 10–30 |
   | killBackAngle | 60° | 30–90 |
   | parryWindow | .18 | .05–.4 |
   | enemyDmg | 1 | .25–2 |
   | enemyHp | 1 | .5–2 |
   | enemyWindup | 1 | .6–1.6 |
   | smokeTime | 6 | 2–12 |
   | baitRange | 80 | 40–160 |

   **World**

   | Key | Default | Range |
   |---|---|---|
   | kiRange | 160 | 80–300 |
   | alertShout | 160 | 0–320 |
   | bodyRange | 96 | 40–180 |
   | reinforceDelay | 15 | 5–40 |
   | ambientNight | .38 | .15–.7 |
   | lanternRadius | ×1 | .5–1.6 |
   | parTimeMul | 1 | .5–2 |
   | slowmo | .3 | .1–1 |

   `B.T(key)` reads the live value (with the difficulty multiplier where noted), so a change applies on the next step.
   Systems that cache (the light map) rebake on change.
- The backquote key toggles the AI overlay while dev mode has been opened once this session.

### 5.21 Mission Editor — "Workshop" (`75-workshop.js`)

Tenchu 2's signature feature, and the designer tool the TASK asks for: it edits the exact level JSON the campaign uses
(section 3.6).

- **Entry:** Title → Workshop (3 save slots + "New from template": blank 40×40, or a copy of any campaign level), or
  Dev Mode → Edit this level.
- **View:** the level drawn by the same renderer (lights included), a grid overlay, a cursor box drawn at the cell's
  top height, the camera rotatable and zoomable.
- **Panels (10-foot):**
  - Category tabs at the top: Ground · Walls · Buildings · Props · Lights · Actors · Routes · Items · Settings.
  - A brush strip at the bottom (big icons, the name of the focused one).
  - The cursor cell info at top left; the control legend with glyphs at bottom right.
- **Controls:**

  | Input | Edits |
  |---|---|
  | **Pad** | left stick moves the cursor (repeat), right stick pans, L1/R1 change category, L2/R2 change brush, ✕ paints or places, ○ erases, □ eyedropper (pick or select), △ rotates the facing, Create test-plays, Options opens the menu |
  | **Mouse/keys** | hover moves the cursor, left click paints (drag paints lines), right click erases, middle drag pans, wheel changes brush, Tab changes category, 1–9 pick a brush, Q/E rotate, F5 test-plays, Esc opens the menu |

- **Brushes:**
  - Ground: the 10 floor types.
  - Walls: `#`, `W`, `F`, `H` with `d`.
  - Buildings: `A B C D S T G K M P R`.
  - Props: all of section 5.18's shapes.
  - Lights: stone or paper lantern, torch, brazier.
  - Actors: hero start, exit, target, ashigaru, samurai, archer, ninja, hound, civilian types, disguised, bosses
    (Gonroku, Hotaru, Kurogane), bell, barracks.
  - Routes: select a guard (□), then ✕ adds a waypoint, ○ removes the last, △ cycles the wait (0 / 1 / 2 / 4 s).
  - Items: tool pickups, the scroll (optional objective).
- **Settings:** name, size (32 / 40 / 48), time (dusk / night / rain / festival), par time, music.
  - Objectives are generated: "Silence the target" (when a target is placed) + "Escape" (exit) + "Steal the scroll"
    (optional, if placed). A boss placed means "Defeat <boss>" before the exit.
- **Validation** before test or save: a hero start, an exit and a target or boss are present, and both are reachable
  from the start (FlowField on the hero's map with climb 30 + grapple edges). Problems are listed in plain words and
  the cursor jumps to them.
- **Menu:** Test play (mission scene, mode `workshop`; results then back to the editor), Save to slot 1–3, Load,
  Export (copies the JSON with `navigator.clipboard`, falling back to a read-only `<textarea>` overlay to select from),
  Import (a `<textarea>` overlay; validated), Play (a fresh run with results), Exit. No `alert`, `prompt` or `confirm`:
  questions are Shell screens.
- **Storage:** `E.store.set('bentou:workshop:<slot>', levelJson)` / `E.store.get(...)`.

### 5.22 Multiplayer — AI Hub ghost mode, and the Shadow Trial on its own (`82-hub.js`)

- **Mode: `ghost`, seats `[1, 4]`.** Each player runs the same round, "Night Delivery" (section 6.5), in their own copy.
  The other players appear as translucent shadow ninja in their seat colors (`#e8443a`, `#3b82f6`, `#22c55e`,
  `#f5b700`) wherever they are. They never affect the world.
- **Boot in a session:**
  1. Check `AIHub.active` first. If true: no title, no attract, no menus.
  2. Go straight to the scene `hubCard`, then call
     `AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true })`.
  3. If it resolves `null`, fall back to the normal title.
  4. Otherwise build the trial level and call `AIHub.ready()` with no key press.
- **The game's own card** (`hubCard`, canvas):
  - The title art's rooftop at night, with up to 4 ninja lined up in seat colors (Sojiro's rig for even ids, Kaede's
    for odd ids; equal stats).
  - Names in a DOM overlay via `textContent` only (never HTML).
  - Ready ticks from `card.ready`, the goal line, this player's controls as glyphs, and the countdown from `card.left`
    ("Paused: more time asked" when `paused`, "Starting…" when `starting`).
  - **Enter / ✕ → `AIHub.answer('ready')`. △ / M → `AIHub.answer('more')`** (pressing it again takes it back; name the
    key M on the card).
  - No menus or choices. The card draws no `Math.random` numbers: no particles or sfx variance; use
    `AIHub.rng('card')` for cosmetic motion.
- **Start:**
  - On `start`, show a 3-2-1 countdown from `AIHub.time()` (negative) in large brush digits.
  - Gameplay begins when `AIHub.time() >= 0`.
  - The round clock is `AIHub.time()`; the trial's par is 300 s.
- **Ghost traffic:**
  - Every 100 ms, send `AIHub.send({ t: 'g', a: 'delivery', x, y, z, f, s, k }, { reliable: false })`, where `s` is a
    state code (0 run, 1 crouch, 2 swim, 3 dive, 4 attack, 5 cut, 6 dead, 7 done) and `k` is kills.
  - On finish or death, send `{ t: 'done', score }` (reliable).
  - Receivers interpolate (`k = 1 − .002^dt`) and draw a rig at alpha .45 with an afterimage trail (`ghost` option),
    the seat-color scarf, and a DOM name label. They are drawn only when in the same area (`a`; the whole Night
    Delivery level is one area, `'delivery'`).
  - `leave` removes that ghost.
- **Progress:** `AIHub.progress({ score, label })` **every second from the start of play** (even at score 0) until the
  result. Labels: "Cuts 2 · Unseen", "Target down", "Escaped 3:12".
- **Result:**
  - On escape or death: `AIHub.result({ score, stats, awards })` once. Stats are at most 6 entries:
    `{ 'Silent cuts': n, 'Detected': m, 'Time': '3:12', 'Rank': 'Ekiben' }`.
  - Awards (at most 3; titles ≤24 characters, details ≤40):
    - "Ghost of the Moon" (never detected);
    - "Silent Blade" (5+ cuts);
    - "Fed by All" (no kills except the target).
  - **On `time-up`:** report the current score at once (well within `graceMs`).
- **Scoring in the round:**
  - +2000 target silenced; +1000 escaped after the target.
  - +250 per Silent Cut; +50 per other kill.
  - +600 if never detected, else −150 per detection.
  - −500 per civilian harmed.
  - Time bonus on escape: +4 per second under 300, at most 1200.
  - Death ends the run with the score so far.
- **On `end`:** stop all input (ignore actions) and sound (`audio.stopMusic`, mute sfx). Show a "Round over"
  overlay with the standings by name (DOM `textContent`). Send nothing more.
- **Session rules:**
  - The pause menu shows only Resume / Settings / Controls, and Quit is off. Create the game with
    `menu: { quit: (window.AIHub && AIHub.active) ? false : 'title', items: () => B.pauseItems() }`. If `connect()`
    resolves `null`, set `game.o.menu.quit = 'title'`; the Shell reads `menu.quit` and the items function each time
    the pause screen renders.
  - No dev mode, Workshop, saves or attract.
  - Create (Pad8) does nothing in a session (no objectives panel), and patch #9 ignores Options while Create is held:
    the hub owns that pair.
  - No other network; no `alert` / `confirm` / `prompt` / `window.open`.
  - If the canvas can't start, `AIHub.fail('…')`.
- **The game on its own (standalone twin): Shadow Trial.**
  - Title → Shadow Trial runs the same "Night Delivery" round with the same rules and score.
  - Your best run's ghost (a 10 Hz track saved with the score) plays alongside you, in white.
  - A local board of the top 5 (score, rank, character, date) shows on the results.
  - The ghost send, draw and score code is shared with the hub path.

### 5.23 About / Credits (title → About; paged)

1. **About:** what the game is; "an original game inspired by *Tenchu 2: Birth of the Stealth Assassins* (Acquire /
   Activision, 2000); not affiliated"; how to play in three lines.
2. **Source Information:** the TASK.md fields (date, source, plan = `PLAN.md`, genre and perspective, tech with
   versions, art direction, animation, audio, online, testing, research, environment, model, usage). Fill them with
   your real values; write "unknown" for anything you can't confirm.
3. **Testing Feedback**, 4. **Engine Feedback**, 5. **Prompt Feedback:** your answers to TASK.md's questions (written at
   the end, the same text as in your chat reply and `exit-interview.json`).
6. **Credits:** built by (your model); plan: PLAN.md; engine: my-3D2dge v0.85.2 (michaelcrosato/my-3d2dge) with the
   listed patches; AI Hub Session Protocol v1, client 1.4.0 (unmodified); all art, music, sound and voices generated in
   code.

---

## 6. Content

### 6.1 Characters and rigs (`21-rigs.js`)

| Who | Rig |
|---|---|
| **Sojiro** (player) | `new E.Humanoid({ size: 1.25, build: 'heroic', hood: true, mask: { color: '#232a44' }, outfit: 'coat', sleeves: 'long', weapon: 'sword', bladeLen: 8, cape: { len: 4, width: 3, seg: 2 } /* scarf tail */, colors: { hair: '#232a44', cloth: '#2a3050', coat: '#2a3050', pants: '#1e2236', belt: '#b0302a', boot: '#2a2a2e', glove: '#2a2a2e', cape: '#b0302a', capeIn: '#6a1a18', metal: '#d8dce8' } })` |
| **Kaede** (player) | `size: 1.2, build: 'heroic', hair: 'ponytail' (#18141c), mask: { color: '#2a1a2a' }, outfit: 'tunic', weapon: 'sword', bladeLen: 5.5, offhand: { len: 5.5 }`, cloth plum `#4a2a44`, sash and scarf teal `#2a8a8a` |
| **Granny Oshima** | `size: 1.0, build: 'chibi', hunch: .35, outfit: 'robe', hair: 'ponytail' (grey bun #b8b0a8)`, robe brown `#5a4030`, apron; a rice paddle as a short `staff` |
| **Lord Mibu Takanori** | `heroic 1.2, outfit: 'robe'`, kamishimo indigo `#2a3a6a` with gold trim, topknot (`ponytail`), no weapon |
| **Chamberlain Kurogane Dosetsu** | `bulky 1.8, armor, hat: 'kabuto' (crest #c8a040), weapon: 'sword', bladeLen: 14 (nodachi)`, black `#2a2a30` with red lacing `#8a1c1c`; in the briefing a plain grey robe with no armor. Phase 2: a second rig, size 2.1, `mask: { style: 'oni', color: '#b0201a' }`, `eyeGlow: '#ff5a2a'` |
| **Magistrate Kanemori** | `bulky 1.25, outfit: 'robe'`, rich brown and gold, `hat: 'band'` (cap), no weapon; flees and cowers |
| **Gonroku the Iron Ox** | `bulky 1.9, hair: 'spiky', sleeves: 'none', weapon: 'club'`, tattered brown, `expr: 'angry'` |
| **Hotaru** | `heroic 1.2, hair: 'ponytail' (#2a0a10), mask: { color: '#1a1018' }, weapon: 'sword', bladeLen: 5, offhand: { len: 5 } (kama)`, crimson `#8a1a2a`, a black scarf with a red lantern emblem |
| **Tobei** | `size: 1.1, outfit: 'tunic', hat: 'band'`, brown and green, a furoshiki bundle on his back (a short wide cape in cloth `#3a6a3a`) |
| **Brother Ittetsu** | `bulky 1.4, hair: 'bald', outfit: 'robe', weapon: 'sword'` (wooden bokken: metal `#8a6a4a`) |
| **Disciples Ume, Kiku, Masa** | `heroic 1.15, hood, mask`, green, blue and brown cloth; carry hand lanterns |
| **Ashigaru** | `heroic 1.15, hat: 'jingasa', armor` (dull plate), `weapon: 'spear'`; faction cloth: Kanemori ochre `#8a6a2a`, Red Lantern `#8a2a2a`, Kokaku indigo `#2a3a6a` |
| **Samurai** | `heroic 1.25, hat: 'kabuto', armor, sashimono: <faction>, weapon: 'sword'` |
| **Archer** | ashigaru dress, `weapon: 'bow'` |
| **Red Lantern ninja** | `heroic 1.2, hood (#6a1a1a), mask (#1a1418)`, black cloth `#1a1418`, red sash |
| **Civilians** | robes in varied colors: merchants `band` hats, maids in bright patterned robes with buns, monks bald in saffron, drunks with `expr` red cheeks, nobles in rich colors at the festival, servants in grey |
| **Hound** | custom `Hound` class: a 3D skeleton (spine of 3 points, head, 4 two-segment legs on a trot cycle, a curled tail), drawn with `px.poly` / `px.disc` through `r.w()` inside `r.actor`; Akita colors (tan `#c88a4a`, cream `#f0e0c0`); states walk, run, sniff (head down), bark (head up, mouth), eat, down |

Portraits for dialog are `rig.drawPortrait` of the same rigs (masks included, via patch #3).

### 6.2 Missions

Coarse sketches, 1 character = 2×2 cells. Author the full `rows` from them, keeping roofs within a jump or a grapple of
each other: roof gaps of 3–4 cells, and height steps within the grapple's rise.

In the sketches, uppercase legend characters and the floor symbols (section 3.6) are terrain. Digits, lowercase
letters and `@ X ! Q L` are **markers** for entities: they go in the level's entity arrays, never in `rows`.

#### Mission 0 — "The Trial of the Second Tier" (training; 40×28; dusk turning to night; petals; music `training`)

```text
####################
#AAAAAA..FFFF"""""""#   A the Jubako-ya shop (h40)   F bamboo fence (vault)   " bamboo grove
#AAAAAA....,,"""1"""#   1 Disciple Ume (lantern, slow loop in the grove)
#..@..........""""""#   @ start, the back porch (Granny watches from the door)
#..PP....W.W......C.#   P planters (cover)   W low walls h30 (climb)   C kura storehouse h48
#..PP....W.W....CCCC#
#.......~~~~~...CCCC#   ~ koi pond (deep): Disciple Kiku (2) stands at the bank
#..,,,..~~~~~2..CC3C#   3 Disciple Masa below the kura's edge (the from-above mark target)
#.............t..b..#   t persimmon tree (grapple anchor)   b bait test spot (training dummy guard "Big Daikon")
#..:::::::::........#   : raked-gravel sparring ring (Brother Ittetsu)
#..:::::::::...dd...#   d practice dummies (combo practice)
####################
```

Beats, each with a canvas tutorial card and a Granny line; each teaches by doing:

1. Move, run, walk with a light tilt, crouch, jump, vault the fence, climb the low wall.
2. The Ki Gauge, hiding in bamboo, and Ume's token by a Back "Silent Mark". Training cuts are marks: the disciple sits
   down, "defeated". The same choreography as a Silent Cut, but with a chalk-white splash and no blood.
3. Swim and dive past Kiku; an Undertow mark.
4. Grapple to the kura roof (and to the persimmon tree), cross, then a mark from above on Masa.
5. Tools: throw a firecracker to pull "Big Daikon" off his post. Drop a Poison Rice Ball; in the Trial, Granny has
   swapped the poison for a sleeping herb, so Big Daikon eats it and dozes off. Then a front mark. Smoke test:
   Ittetsu's lantern-bearers spot you deliberately; smoke and slip away.
6. Spar with Brother Ittetsu (block, parry, roll, combo).
7. Return to Granny → results.

Par 420 s. Unlocks: Sour Plum at Ekiben or better.

#### Mission 1 — "Rice and Ash" (castle town; 56×48; night; petals; music `m1`; faction Kanemori)

```text
############################
#WWWWWWWWWWWWWWWWWWWWWW....#   North: Kanemori's walled mansion
#W::::::::W HHHHHHHHH  W...#   : inner gravel court = Gonroku's arena
#W::::::::d d___k___H  W.T.#   H hall (enterable, roof cap): the feast; k Kanemori, 2 maids, 1 samurai
#W::::::::W H_______H  W...#   T watchtower + archer (lantern)
#WWWWWdWWWW HHHHdHHHH  W...#   d doorways
#W ~~~ ll  ,,,   CC    W...#   ~ garden pond, l stone lanterns, C kura (the strongbox: optional ledger)
#WWWWWWWWWWgWWWWWWWWWWWW...#   g front gate (2 gate guards); a side door on the east wall
#....AA..BB....BB...AA.....#   Middle: market square; ! alarm bell; samurai pair patrol;
#.AA.AA..BB.!..BB...AA.AA..#   noodle stall lights (yatai), 2 drunk civilians
#.AA........DD.......D.DD..#
#.BB..DD..AA....AA...BB....#   South: alleys and rooftops; 3 ashigaru, 1 hound in the rice-merchant yard
#.BB......AA.,,.AA...BB....#
#~~~~~~~~~~~~~~~~~~~~~~~~~~#   canal (deep): arrive by boat at the east end, leave by the boat (X) at the west end
#X~~~~~~~~~~~~~~~~~~~~~~~~@#
############################
```

- **Enemies:** 9 ashigaru, 4 samurai, 1 archer, 1 hound; 4 civilians (2 drunks, 2 maids).
- **Objectives:**
  1. Silence Magistrate Kanemori (in the feast hall).
  2. *(optional)* Find what Kanemori hides (the strongbox in the kura: the letter with the black iron seal).
  3. Defeat Gonroku. The fight starts on `objective:kill` or on entering the inner court, whichever comes first. The
     hall's west door opens onto the court, the only way back out, so the fight can't be skipped.
  4. Escape by the canal boat.
- **Kanemori alerted:** he runs into the inner court and cowers behind Gonroku. No escape, no fail. After Gonroku falls,
  his "cornered" line plays as you approach.
- **Checkpoints:** inside the compound wall; after Gonroku.
- Par 720 s. Unlocks: Sleep Dango at Ekiben or better.

#### Mission 2 — "The Fort at Kiri Lake" (60×52; rain + lightning; music `m2`; faction Red Lantern)

```text
##############################
#,,,,,,~~~~~~~~~############.#   West: reed shore (,) and fishing huts (A); start @ and the escape boat X
#,AA,,,~~~~~~~~~#T::::::::T#.#   ~ lake channel (deep, 9 cells): archers on towers T sweep it with lanterns
#,AA,@,~~~~~~~~~#:BBB:!:CC:#.#   # fort outer wall h56 (grapple); B barracks (reinforcements); ! bell
#,,,,X,~~~~~~~~~#:BBB:::CC:#.#   C storehouses; Q bamboo cage with Tobei (north-east)
#,,,,,,~~~~~~~~~#::::::::Q:#.#   w water gate (closed; lever L inside opens it: the escort route)
#,AA,,,~~~=====~w::L::::::::.#   = pier (Hotaru's arena on the escape route)
#,AA,,,~~~=====~#:::::::::::.#
#,,,,,,~~~~~~~~~#T:m=r=m=r=mT#   dock: m mooring posts (3) holding rice barges r (optional: cut them loose)
##############################
```

- **Enemies:** 6 ashigaru, 3 samurai, 3 archers, 3 Red Lantern ninja (rooftops), 2 hounds.
- **Objectives:**
  1. Rescue Tobei (cage: hold △ 1.5 s to open).
  2. Open the water gate (lever).
  3. Escort Tobei to the boat in the reeds.
  4. *(optional)* Cut the rice barges loose (0/3: hold △ 1.5 s at each post; the barges drift away downstream).
  5. Defeat Hotaru (an ambush on the pier, a trigger on the escort route).
- **Fail:** Tobei falls.
- **Checkpoints:** inside the fort; after the rescue; after Hotaru.
- Par 900 s. Unlocks: Fire Pot at Makunouchi or better.
- Lightning flashes briefly expose everyone (section 5.3).

#### Mission 3 — "Moon over Kokaku" (64×56; festival night, a huge moon; maple leaves; music `m3`; faction Kokaku + Red Lantern)

```text
################################
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#   outer moat (deep); start @ swimming at the south
#~##########################~~~#   # ishigaki wall h56; T corner towers (grapple anchors)
#~#T,,,,,,,,,,,,,,,,,,,,,,,T#~~#   second bailey: the festival garden; lantern strings, stalls,
#~#,  stalls   ll   ll  ,,,,#~~#   6 nobles and servants (civilians) + 3 disguised Red Lanterns
#~#,  HHHH(tea pavilion) ,,,#~~#   H tea pavilion (hall): the poisoned sake flask (stopTimer objective)
#~#,  H__H   ll    ll   ,,,,#~~#
#~#WWWWWWWWWWWdWWWWWWWWWWWWW#~~#   W inner wall h30, gate d
#~#::::GGGGGGGG::::::::!::::#~~#   honmaru: keep tiers G h64 (16×16), K h112 (12×12), M h160 (8×8)
#~#::::GGKKKKGG:::::::::::::#~~#   samurai and archers on each tier's roof walkway
#~#::::GGKMMKGG:::::::::::::#~~#   the top of M = Kurogane's arena (shachihoko, moon behind)
#~#::::GGKKKKGG:::::::::::::#~~#
#~#::::GGGGGGGG:::::::::::::#~~#
#~##########################~~~#
#~~~~~~~~~~@~~~~~~~~~~~~~~~~~~~#
################################
```

- **Enemies:** 6 samurai, 6 ashigaru, 4 archers, 2 Red Lantern ninja + 3 disguised, 1 hound; 6 civilians.
- **Objectives:**
  1. Find the poisoned sake before the moon is high (12:00 timer; swap it at the pavilion: interact 1 s).
  2. Climb the keep.
  3. Defeat Kurogane.
- **Optional:** silence the 3 disguised Red Lanterns (0/3; Ki Focus shows them).
- **Checkpoints:** inside the bailey; after the swap; at the keep's second tier; at the arena.
- Par 960 s.

### 6.3 Enemy totals by mission (for balancing)

| Mission | Ashigaru | Samurai | Archers | Ninja | Hounds | Civilians | Boss |
|---|---|---|---|---|---|---|---|
| Trial | — (3 disciples + 1 dummy guard) | — | — | — | — | — | Ittetsu |
| Rice and Ash | 9 | 4 | 1 | — | 1 | 4 | Gonroku |
| Kiri Lake | 6 | 3 | 3 | 3 | 2 | — | Hotaru |
| Moon over Kokaku | 6 | 6 | 4 | 2 + 3 disguised | 1 | 6 | Kurogane |
| Night Delivery (trial / hub) | 3 | 2 | 1 | 1 | 1 | 2 | — (target: Broker Sakubei) |

### 6.4 Tools: see section 5.9 (10 tools; 6 at the start, 4 unlocked by rank)

### 6.5 "Night Delivery" — the Shadow Trial and AI Hub round (level id `delivery`; 34×30; night; music `m1`)

```text
#################
#~~~~~~~X~~~~~~~#   canal along the north edge; X the canal gate (exit)
#WWWWWWWdWWWWWWW#   W compound wall h30 (climb) with the canal gate d
#W..CC....T..CCW#   C two kura h48, roofs a grapple apart; T watchtower + archer (lantern)
#W..CC.......CCW#
#W,,....HHH....W#   H small hall: Sakubei counting coins (target), a clerk (civilian)
#W,,.l..H_H..l.W#   l stone lanterns (light pools); , tall grass by the wall
#W....~~~....,,W#   ~ pond (deep: dive past the samurai's beat)
#W..h.~~~......W#   h hound on a short beat by the storehouse
#WWWWWWWWWWWWWWW#
#.......@.......#   @ start outside the south wall
#################
```

- The rice broker Sakubei's walled yard by the canal.
- **Guards:** 3 ashigaru (one a lantern patrol on the inner loop), 2 samurai (one posted at the hall door), 1 archer,
  1 Red Lantern ninja on the kura roofs; 1 hound; 2 civilians (clerks).
- The objective is to silence Sakubei and escape through the canal gate. Par 300 s.
- The level is the same for every copy: static data, no randomness at build. Patrols are deterministic with
  `Math.random` seeded by the hub.

### 6.6 Story script (tone: earnest, terse feudal drama; deadpan bento details; ASCII only)

**Opening crawl** (white brush text on dark paper, Granny's voice):

> The Sengoku era. Lords devour lords, and the land devours the poor.
> In Kasugai Province the granaries are full, and the people starve.
> In the shadow of Kokaku Castle stands a humble shop, the Jubako-ya.
> It sells lunchboxes to the lord's household. Every box has two tiers.
> So does the shop.

**Prologue** (the shop's back room, night):

- GRANNY: "Rice that is never tested is only seed. Tonight, you two are tested."
- KAEDE: "Finally. Six years of folding boxes." · SOJIRO: "...We are ready, Master."
- GRANNY: "Ready? The rice says when it is ready. Not the cook. Go."

**Trial lines (samples):**

- GRANNY: "Walk softly. A guard hears your feet before he sees your face."
- GRANNY: "The gauge in your belly is your ki. When it shouts, you whisper."
- GRANNY: "The roof is a road for those with a rope." · "Hungry men are careless men."
- ITTETSU: "Ha! The old woman sends me children. Draw, little dumplings." · defeated: "...Well struck. She was right
  about you."
- GRANNY (end): "Your rice is cooked. Whether it is seasoned, the world will decide."

**Briefing 1** (the lord's moonlit garden; Granny kneels, the apprentices hidden behind a screen):

- TAKANORI: "Magistrate Kanemori swears the harvest failed. Yet his storehouses groan with rice."
- KUROGANE: "My lord, Kanemori has served your house for twenty years. To accuse without proof is—"
- TAKANORI: "Enough, Kurogane. Leave us." (He bows and goes.)
- TAKANORI: "Grandmother. The law cannot reach him. Can your boxes?" · GRANNY: "Every box reaches its table, my lord."
- GRANNY (to the hero): "He feasts tonight by the canal. He will not finish his meal. And bring me any letter he
  keeps. A man who hides rice also hides paper."

**Mission 1:**

- GONROKU intro: "The magistrate pays me by the bowl. Tonight, I eat well." · phase 2: "RAAAH! Stand still, mosquito!"
  · defeat: "The rice... was always... his..."
- KANEMORI cornered: "W-wait! I only followed orders! The man with the iron seal promised me a castle!"
- After the kill: SOJIRO: "Heaven was too slow." / KAEDE: "You should have shared."
- Debrief, GRANNY reading the letter:
  - "Black iron. Kurogane's seal."
  - "The rice was sold to the Red Lanterns. Sake-house ninja. They are paid in silver, and they pay in poison."
  - "Tobei carried a copy to the lake. He has not come home."

**Briefing 2:**

- GRANNY: "Tobei is a fool with good feet. The Red Lanterns hold him at Kiri Lake. Bring him home."
- KAEDE: "And the rice barges?"
- GRANNY: "Rice belongs in bellies, not in a traitor's war chest. Cut them loose. The river knows the way to the
  villages."

**Mission 2:**

- TOBEI freed: "You came! I knew you would. I mean, I hoped. I mean... is that a rice ball?"
- TOBEI barks: "Waiting. Quietly. Like a pickle in a jar." · "Following!"
- HOTARU intro: "The Jubako-ya sends its children to fetch its fool. How sweet. Like bean paste."
  - Clones: "Which of me will you cut?"
  - Defeat: "Hm. Sharper than you look. Tell your grandmother: on the night of the full moon, your lord drinks his
    last." (Smoke; she is gone.)

**Briefing 3** (the shop, the night of the moon-viewing):

- GRANNY: "Kurogane hosts the moon-viewing. The Red Lanterns pour the sake. Find the poisoned flask before the lord
  raises his cup. Then go up. A man like Kurogane always waits at the top."
- SOJIRO: "And if he wears the castle's colors?" · GRANNY: "Then cut through the colors."

**Mission 3:**

- KUROGANE intro (on the roof, the moon behind):
  - "Little boxes. Do you know what a lord is? A mouth. Feed it fear, and it rules a hundred years."
  - "Takanori feeds it rice. I will be the new mouth."
  - (Puts on the mask.) "Shuten. Wake."
- Phase 2: "THE MOON... TASTES OF IRON!" · defeat: "The mask... was hungrier... than I..."
- Ending (in the castle town at dawn): the lord opens the granaries; the people line up with bowls.
- At the shop, GRANNY presents two black-lacquer jubako with the crest:
  - "Black lacquer. The clan's crest. You are apprentices no longer. You are Lunchbox Assassins. Seen by none."
  - KAEDE: "...Fed by all." SOJIRO bows.
- Post-credits (a red-lantern sake house): HOTARU turns a shard of the oni mask in her fingers: "Two tiers... Then I
  shall be the lid."

**Results comments (Granny):**

| Rank | Comment |
|---|---|
| Grand Kaiseki | "Not one grain out of place." |
| Makunouchi | "Well packed." |
| Ekiben | "Edible." |
| Hinomaru | "Plain rice and one plum. Hm." |
| Leftovers | "Even the dogs would refuse this box." |

**Guard barks** (each category 4–8 lines; the voice synth speaks them; samples):

| Category | Lines |
|---|---|
| idle | "Another cold night..." · "The barracks rice tastes of sand." · "When does my watch end?" · (yawn) · "My feet hurt." |
| notice | "Hm? What was that?" · "Is someone there?" · "A cat...?" |
| search | "Show yourself!" · "I know I heard something." · "Check the shadows!" |
| lost | "...Must have been the wind." · "Bah. My eyes play tricks." · "Nothing. Back to my post." |
| alert | "Intruder!" · "Ninja! Over here!" · "Sound the bell!" |
| body | "He's... dead?!" · "Assassin! Wake the garrison!" |
| bait | "Oh? A rice ball... nobody will miss it." → "Ugh... my stomach..." / (sleep dango) "So... sleepy..." |
| hurt / death | "Ngh—" · "M-mother..." |
| civilian | "Eek! Murderer!" · "Please, spare me!" |
| hound | (bark) (growl) (whine) |
| Red Lantern ninja | "A Jubako rat." · "Your lunch is over." |

**Character-specific lines:** each briefing and cutscene has 1–2 lines that differ for Sojiro (stoic, dutiful) and
Kaede (sharp, impatient, warm underneath). The rest is shared.

---

## 7. Build order and milestones

Each milestone ends with three checks: (1) `node tests/run.mjs` all green; (2) `node tools/build.mjs`; (3)
`node handoff/tools/check.mjs <root>/<game>.html` clean, with its look notes read. Build the riskiest things first.

| # | Milestone | Contents | Done when |
|---|---|---|---|
| **M0** | Foundation | dev folder; engine copied; `index.html`; `build.mjs`; `tests/run.mjs` with a smoke test; vendored `session.js`; Playwright installed in the dev folder | the bundle opens from `file://` to a boot screen; the test command prints `1/1 checks passed` |
| **M1** | Core feel (the riskiest mechanics) | greybox of the Trial map; patches #1–#3, #4; ninja rigs; intent layer + input map + glyphs; camera turn, zoom, look; one ashigaru with sight, light, hearing, Suspicion; Shadow Sight + Ki Gauge; Back Silent Cut with splash and slow motion; grapple (auto + aim + mouse); HUD v1; light map + lanterns; kawara roof caps + 4 Japanese props; the pause menu's Dev Mode with the Hero and Guards slider pages | you can sneak, grapple onto the kura, and Silent Cut a guard who would see you in lantern light but not in shadow. Tests for movement, grapple, perception, the cut and labels pass. Screenshots of the yard at night look PS1-grade (section 9.5) |
| **M2** | Player kit | sprint and noise per surface; wall hug and peek; swim, dive, breath; drag and hide; roll; falls; all 5 Silent Cut kinds × 2 characters; combat (combos, block, parry, riposte, i-frames, death); all 10 tools; the Bento model; checkpoints and retry | each feature has its test; filmstrips of every cut and attack read cleanly |
| **M3** | Enemies and AI | the archetypes (ashigaru, samurai, archer with arrows, ninja climbing and leaping, hound with smell and bark, civilians, disguised); modes patrol/post/sleep/eat/chat; search patterns; alert shout; bell + reinforcements + Heightened; body discovery; barks with voice; shared FlowField cache; the nav map | the AI suite passes; a 10-minute soak of M1 with random input throws no errors |
| **M4** | Mission framework and meta | level loader; objectives, triggers, timers, escort, fail states, checkpoints; score, ranks, unlocks; saves; scenes (title, character select, briefing, bento, mission, results, mission select, about, game over); cutscene player; dialog and voice; music layers (patch #7) | a full story loop runs on the greybox Trial: briefing → bento → mission → results → save → Continue |
| **M5** | Content | final Trial, M1, M2, M3 maps (rows + entities + lights + props + triggers); the 4 bosses; Tobei; the timer; disguised enemies; the full story script; all songs; the asset set complete | each mission's scripted completion test passes; each boss test passes; a manual playthrough of each mission as both characters |
| **M6** | Presentation and UX polish | title art and logo; transitions; VFX; patches #5, #6 (hover focus, 10-foot scale); all Settings; the touch-only gate; glyph switching everywhere (PS ↔ Xbox ↔ keys ↔ mouse); results and bento screen art; the About screen | the UI suite passes; screenshots at 1920×1080 and 3840×2160 are legible; the touch emulation shows the notice |
| **M7** | Attract mode | the autopilot + 7 vignettes + idle timer + exit on input | attract runs 3 full loops headless with no errors and visits every vignette; any input returns to the title |
| **M8** | Multiplayer | the hub card, ghost mode, progress and result, end; patches #8, #9; the Shadow Trial with your own ghost and the local board | the mock-hub suite passes; the **real harness passes** (2 players; 4 players with latency 150, jitter 50, loss 5; host-leave), `window.__hubCheck.pass === true` |
| **M9** | Workshop | the editor (section 5.21) + Dev "Edit this level" + export, import, slots | the editor suite passes (build, validate, save/load round trip, a test play won by script) |
| **M10** | Finish | the full scripted playthrough; the balance pass with dev sliders (update the defaults); the bug bash; final bundle; About pages and `exit-interview.json`; screenshot review | every check is green; no `TODO/FIXME/placeholder` anywhere; the bundle is the only file needed to play |

---

## 8. Risks and how to de-risk them

| Risk | Why it is risky | De-risk / decision |
|---|---|---|
| **Japanese architecture in a height-map engine** (one column per cell, no passages under things) | walkable sloped roofs and enterable rooms with roofs are both impossible as geometry | decided: flat walkable roofs with drawn kawara caps (eaves, hips, ridge); halls are enterable but their roofs are visual (they fade when you're inside). Prototype in M1 with the kura and one hall, and check the sorting with the hero on a roof edge, behind a hall and inside a hall in all 8 camera turns |
| **Stealth fairness from a high iso camera** (the player sees more than the ninja) | trivializes stealth | Shadow Sight + Ki sensing (section 5.5); assist toggles; tuned with sliders; the perception tests pin the rules (lit vs dark, crouch, look-up, smoke) |
| **Grapple targeting** on pad, keys and mouse | frustration if it picks the wrong edge | a visible highlight at all times; hold-to-aim with slow motion; mouse picks under the cursor; tests list the anchors at fixed spots |
| **Paired-action animation quality** (10 cut choreographies, grapple, drag) | jerky or ugly kills ruin the signature moment | build on the engine's `takedown` structure and `E.move` poses; check every one with `filmstrip.mjs --seed 1`; keep them short (<1.3 s) |
| **Boss AI and telegraphs** | unfair or broken fights | each boss is a data-driven pattern script with red decals and long wind-ups; a bot fight test per boss (god mode + scripted attacks) asserts defeat in <90 s and that every move fires at least once |
| **Escort AI** | stuck followers break M2 | ground-only route through the opened water gate; a teleport-to-hero fallback when he is >160 away and out of the player's sight; an M2 escort test |
| **Swimming visuals** | the body would draw on top of the water | draw 10 units lower with a translucent water overlay queued above the waist; while diving, a dark silhouette and bubbles only; screenshot check |
| **AI Hub compliance** | a failed harness keeps the game out of the hub | build M8 against the real harness early (a spike in M4: a bare `hubCard` + trial greybox through the harness); follow section 5.22 to the letter; progress every second from 0; result on `time-up` |
| **Single-file bundling** (session.js first, inline 1.2 MB engine, `</script>` escapes, `file://`) | subtle load-order or escaping bugs | `build.mjs` asserts the head order and the escapes; a browser test opens the bundle from `file://` and checks the title scene and zero console errors |
| **Gibberish voice** | harsh, too loud, or spamming | profiles clamp the volume; a voice bus with its own setting; one dialog voice at a time; a 2 s bark cooldown; a browser listening check |
| **10-foot legibility and the HTML Shell** | default 13–14 px Shell text is tiny on a TV | patch #6 scales by window height; the canvas HUD scales with pixels; screenshot review at 1080p and 4K |
| **Attract mode getting stuck** | the demo loop must never freeze | 8 s beat timeouts; a 25 s vignette cap; cheats; a 3-loop headless test |
| **Workshop scope creep** | the editor can swallow time | a fixed feature list (section 5.21); built last (M9) on the existing loader and renderer; it is complete when its tests pass |
| **Determinism and flaky tests** | hub seeding and replays need stable gameplay | fixed-step engine; gameplay randomness only in update; cosmetic `crand` in draw; tests seed `Math.random = E.rng(7)`; a same-input → same-hash test |
| **Input conflicts** (the d-pad moves in menus but means tools in play; browser shortcuts) | broken controls | custom play movement without the d-pad (section 4.1); no Ctrl bindings; `preventDefault` on Tab and Space (the engine does it for bound keys; verify) |
| **Performance** (unlimited budget, but hitches are still bad UX) | first-time bakes per camera turn | bake floors and walls for the starting view in the level's boot step; accept a first-turn bake; shared FlowFields; canvas lighting tuned, GPU when available |

---

## 9. Testing (`tests/run.mjs` — one command, failures only, one-line count)

### 9.1 The runner

- `node tests/run.mjs [filter…]`:
  - runs `tools/build.mjs --js` first;
  - for each `tests/*.test.mjs` (filtered by name), creates a **fresh `node:vm` context** with stubs (`window`,
    `addEventListener`, `location`, an in-memory `localStorage`, `matchMedia` → false, `navigator`), loads
    `engine/my-3d2dge.js` + `build/game.js`, and seeds `Math.random = E.rng(7)`;
  - calls the test's default export with a helper `t`:

    ```text
    t.game, t.E, t.B, t.I, t.snap(), t.step(sec), t.tap(a), t.hold(a, on), t.intent(obj, sec),
    t.load(missionId, { character, loadout, checkpoint }), t.check(name, cond, detail)
    ```

  - then runs `tests/browser/*.mjs` (Playwright) unless `--fast`.
- It prints **only** `FAIL <suite> › <check>: <detail>` lines, then **one line**:
  `<passed>/<total> checks passed, <failed> failed (<seconds>s)`. Exit code 1 on any failure.
- Rerun a suite only after changing the code it covers (filter by suite name).
- Don't use subagents or workflows to review, judge or audit (TASK.md). Do run the tests and read the screenshots
  yourself.
- **`game.debug`** (also `window.__BENTOU.debug`), used by the tests and `tools/check.mjs`:

  ```text
  snapshot() → { scene, mode, mission, t,
    hero{x,y,z,hp,state,crouch,swim,dive,breath,stamina,tool,stacks},
    guards[{id,type,x,y,z,state,level,alive,vis}], ki, light, exposure, detections, silentCuts, kills,
    civiliansHarmed, objectives{}, score, rank, boss{id,hp,phase}, escort{hp,state}, timer, flags,
    attract{vignette,beat}, hub{phase,sent,progress}, editor{} }
  teleport(x,y,z,f), cell(cx,cy), load(id,opts), go(scene,data), tune(k,v), resetTune(), cheat(name,on),
  give(tool,n), kill(id), alert(id|'all'), calm(), complete(objId), win(rank), fail(), autopilot(routeId), hash()
  ```

### 9.2 Suites (each check uses fixed spots in test levels or the campaign maps)

| Suite | Checks |
|---|---|
| `boot` | title after boot; attract after 10.5 s idle, and *not* before 10 s; any key, pad press or mouse move exits it; no errors |
| `input` | labels per device (keys "Space"; pad "✕" by default, "A" after the setting); prompts change with `lastDevice`; the d-pad doesn't move the hero in play but cycles tools; wheel taps cycle tools; the touch-only gate (stubs) shows the notice and hides the menu |
| `move` | run/walk/crouch speeds; vault 14; climb a 30 wall; can't climb 40 (needs the grapple); hop down; fall damage over 72; swim in `~`, dive unseen, breath runs out → damage; shallow water slows; wall hug engages, peek extends sight |
| `grapple` | the anchor is found at a kura edge; a tap pulls the hero onto the roof (z = 48); no anchor through a wall; range and rise limits follow the sliders; the mouse picks the nearer anchor |
| `perception` | a lit hero at 80 in the cone becomes alert in under 2 s; a crouched hero in shadow at 100 stays calm 5 s; a hero on a roof directly above is unseen; running at 50 is heard, crouching isn't; smoke blocks sight; grass hides; lightning exposes; a body is found → Heightened + bell run |
| `ki` | the Ki number is right at a known distance; Shadow Sight hides a guard behind a wall, senses it within range, hides it beyond; Focus extends it and reveals a disguised ninja |
| `alarm` | the bell rings after the runner arrives; the reinforcements spawn after the delay; killing the runner prevents the ring; music layers turn on and off |
| `silentcut` | every kind triggers from its geometry and not outside it (angles, heights, water); never on an alert guard or a boss; counters and score; `timeScale` restored to 1 afterwards; both characters' actions run to the end |
| `combat` | combos deal the listed damage; block reduction per character; a parry inside the window staggers, outside fails; riposte kills; the roll is invulnerable; i-frames; death → game over overlay; retry restores the checkpoint snapshot exactly |
| `tools` | each of the 10 tools does what section 5.9 says (one or more checks each); stacks and compartments; unlocks gate the shelf |
| `ai` | patrols follow routes and waits; post sweeps; sleepers wake on loud noise; eaters take baits; hounds smell and bark; archers shoot only with a clear line; ninja climb onto roofs; civilians scream and flee |
| `bosses` | each boss: intro, every move fires at least once, phase 2 triggers at its threshold, the bot wins in <90 s with god mode, the arena opens, defeat lines |
| `mission` | objective ordering (`after`), optional objectives, triggers fire once, timer fail (M3), escort fail (M2), the generic `mission.fail(reason)` hook, checkpoints; the score formula on a scripted run equals the hand-computed value; rank thresholds; unlocks; save round trip |
| `story` | every briefing and cutscene id exists and runs to completion when skipped; character-specific lines exist for both |
| `playthrough` | **the whole game, scripted**: New Story (Sojiro) → crawl → Trial → M1 → M2 → M3 → ending → credits → title, using the autopilot routes (cheats allowed: teleports, god mode); asserts each mission succeeded, results shown, unlocks granted, the save shows all completed, no errors. Then M1 as Kaede |
| `attract` | 3 loops, each vignette visited, no errors, beat timeouts never needed in a normal loop (log if they are) |
| `dev` | every toggle and action changes the state it names; each slider changes `B.T()` live; Reset page / Reset all restore the defaults |
| `workshop` | create a level via the editor API (paint walls, place hero, target, exit, guards with routes); validation catches a missing exit and an unreachable target; save/load and export/import round trips are identical; a test play is completed by the autopilot |
| `hub` (mock) | inject a fake `AIHub` before load (`active: true`; records calls; emits `card`/`start`/`message`/`leave`/`time-up`/`end`): `connect({mode:'ghost',seats:[1,4],card:true})`; `ready()` with no key; Enter → `answer('ready')`, △ → `answer('more')`; no `Math.random` calls on the card (spy); play starts at `time() >= 0`; `progress` every second from 0; `send` at about 10 Hz unreliable; ghosts drawn and removed on `leave`; `result` within 1 s of `time-up`; `end` stops input and sound; quit and dev mode unavailable |
| `determinism` | 30 s of scripted input in M1, twice → the same `hash()` |
| `browser/bundle` | opens the bundle from `file://` (Playwright Chromium): head order (meta charset, then the session script, then the hub metas), title scene, zero console errors, glyph switching on a fake gamepad, touch emulation (`hasTouch`, `isMobile`) shows the notice, attract after 10 s |
| `browser/hub` | copies the bundle + `harness.html`, `bridge.js`, `round.js` into `dev/.hubtest/`, starts `python3 -m http.server 0 --bind 127.0.0.1` there (parses the port; checks the frame title is ours), runs `harness.html?game=<file>&players=2&auto=1`, then `&players=4&latency=150&jitter=50&loss=5&auto=1`, then `&scenario=host-leave`; waits for `body[data-complete=true]`; asserts `window.__hubCheck.pass`; prints failing check names; kills the server **by its PID** |

### 9.3 Engine tools

- `node handoff/tools/check.mjs <bundle>#mission` (errors, fill, colors, look notes, snapshot) at every milestone.
- `filmstrip.mjs` for every attack, cut, grapple and boss move.
- `asset-sheet.mjs` for every new shape.

### 9.4 Balance pass (M10)

- Play each mission with both characters at Ninja difficulty. Tune with the dev sliders until:
  - a careful stealth run reaches Makunouchi;
  - a perfect run reaches Grand Kaiseki;
  - a loud run still finishes, at Hinomaru.
- Write the final values back into the TUNE defaults, and update the score-test expectations.

### 9.5 Screenshots (only what scripts can't judge)

Review each against the look target (Symphony of the Night / Legend of Mana grade, not NES):

- the title;
- the Trial yard at dusk and at night;
- M1 rooftops with lanterns;
- the M1 feast hall (roof cap faded);
- the M2 lake in rain with lightning;
- the M3 keep and the moon;
- each boss mid-fight;
- the Silent Cut splash;
- the bento screen; results with the stamp;
- the HUD with PS, Xbox, keyboard and mouse prompts;
- the touch-only notice;
- the Workshop;
- the hub card with 4 names;
- the Shell menus at 1080p and 4K;
- the swim and dive views.

Check legibility at the size a TV shows.

---

## 10. Final checklist (and what to write at the end)

- [ ] `<root>/Bentou2-Tenchu2-claude-opus-5-5-max-20261103-174734.html` plays from `file://` with no other file.
- [ ] Everything in section 0's scope works: no TODOs, placeholders or stubs; every menu item does what it says.
- [ ] `node tests/run.mjs` passes, including the playthrough and the real hub harness.
- [ ] About pages hold the Source Information and the three feedback sets. The same text goes in your final chat
      reply.
- [ ] `<root>/exit-interview.json` in exactly TASK.md's shape, every value filled ("unknown" where you can't confirm);
      check that it parses (`node -e "JSON.parse(require('fs').readFileSync('exit-interview.json','utf8'))"`).
      Pre-filled parts:

```json
"aiHub": {
  "name": "Bentou 2: Birth of the Lunchbox Assassins",
  "tagline": "Seen by none. Fed by all.",
  "description": "An isometric ninja stealth-action game: pack your bento of tools, slip past lantern-lit guards, land Silent Cuts and earn your rank across a feudal night of missions, bosses and a mission editor.",
  "type": "Game",
  "genre": "Stealth",
  "source": "Tenchu 2: Birth of the Stealth Assassins",
  "series": "Tenchu",
  "players": "1–4",
  "controls": "Move WASD/left stick · Jump Space/✕ · Crouch C/○ · Strike click/□ · Grapple G/R1 · Tool R/R2 · Block right click/L1",
  "tags": ["pixel art", "isometric", "third-person", "story", "boss fights", "retro"]
}
```

- **Source Information values to carry over:**
  - Source: *Tenchu 2: Birth of the Stealth Assassins* (Acquire / Activision, PlayStation, 2000).
  - Plan: `PLAN.md`.
  - Genre: stealth-action (ninja assassination) with melee combat. Perspective: isometric third person, rotatable
    (engine `iso`; `threequarter` option).
  - Tech: my-3D2dge v0.85.2 handoff engine (patched as listed), AI Hub session client 1.4.0, vanilla JS in one HTML
    file, Node + Playwright for tests.
  - Art direction: the engine's native PS1-era pixel art (320×240 expanded), HD Humanoid rigs, canvas + WebGPU
    lighting, procedural Japanese props and materials.
  - Animation: the engine's procedural rigs and `E.ACTIONS`, with new choreographies.
  - Audio: the engine's chip synth with Japanese-scale layered music + a WebAudio formant gibberish voice synth.
  - Online: AI Hub Session Protocol v1, ghost mode, 1–4 players.
  - Research: your own, plus the planner's (Wikipedia on Tenchu 2; the engine handoff docs; the AI Hub README and
    harness).
  - Environment: Claude Code CLI (headless); Linux; browser unknown.
  - Model and usage: yours.
