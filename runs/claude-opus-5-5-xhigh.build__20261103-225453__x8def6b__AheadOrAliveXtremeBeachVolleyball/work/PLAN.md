# Ahead or Alive: Xtreme Beach Volleyball

**Build plan.** It is written for developers (people or AI models) who will build the game from `TASK.md` and this file
alone, without the planner. Where the two differ, `TASK.md` wins.

- **Title:** *Ahead or Alive: Xtreme Beach Volleyball*. On screen the logo reads **AHEAD OR ALIVE** with the strap
  **XTREME BEACH VOLLEYBALL**. Tagline: *Stay ahead. Stay alive. Stay tanned.*
- **How the title was picked (as TASK.md asks):** 50 playful riffs on "Dead or Alive Xtreme Beach Volleyball" were
  brainstormed, then one was drawn with a real RNG: Python `secrets.randbelow(50)` (OS entropy) gave index 27, *Ahead or
  Alive: Xtreme Beach Volleyball*. Don't re-roll it.
- **Names and paths** (relative to this folder; `DEV/` and `GAME.html` are this plan's shorthand for the first two):

| What | Path |
| --- | --- |
| Dev folder (`DEV/`): every source, tool and test | `./AheadOrAliveXtremeBeachVolleyball-DeadOrAliveXtremeBeachVolleyball-claude-opus-5-5-max-20261103-174749/` |
| The deliverable (`GAME.html`): one self-contained file | `./AheadOrAliveXtremeBeachVolleyball-DeadOrAliveXtremeBeachVolleyball-claude-opus-5-5-max-20261103-174749.html` |
| Exit interview, beside the html | `./exit-interview.json` |

---

## 0. The game in one page

**Core loop** (put this sentence at the top of the game's source): *pick where to spend each morning, afternoon and night
of a five-day island vacation; win 2-on-2 beach volleyball with a partner you befriend through chats and gifts; spend the
prize money on swimsuits, gifts and casino nights; then beat the island's owner in the Fortuna Cup final.*

**Premise** (original fiction in the source's tone): six of the world's toughest fighters each get a gold-trimmed
invitation: *"You are cordially invited to the AHEAD OR ALIVE Invitational on the private island of Isla Fortuna. Prize:
everything. — S. Fortuna, Esq."* They arrive expecting a brawl. Instead, flamboyant jackpot billionaire **Sonny Fortuna**
announces that the "tournament" is a five-day beach vacation ending in a volleyball cup, the **Fortuna Cup**, while his
deadpan concierge **Pepper Quill** hands out villa keys and sunscreen. Rivals become partners and the casino never closes.
On day four you learn that Sonny has bet the island itself on the Cup.

| Mode | What it is | Players |
| --- | --- | --- |
| **Vacation** (story) | 5 days × 3 time slots: matches, friendships and gifts, shopping, Pool Hop, casino, postcards; tutorial, semifinal, final, two endings | 1 |
| **Beach Match** (exhibition) | any fighters, owned outfits, court and time of day; any mix of 1–4 local players and CPUs | 1–4 local |
| **AI Hub session** | opens straight into a shared-world match on its own card; CPUs fill empty seats | 1–4 online |
| **Attract** | after 10 s idle on the title or menu: an AI-played broadcast of matches and a feature montage | — |

**Feature checklist.** Everything here ships. There are no stubs; §11 repeats it as the definition of done.

1. 2v2 beach volleyball. One timed **Play** button does the bump, set, spike and serve, with a timing ring on the sand.
   Also: dive, shot/block, Mine/Yours calls, aiming by stick or mouse, rally scoring, every fault, an AI partner and
   opponents, partner chemistry, two cameras, a TV-style HUD, Sonny's commentary, a crowd, celebrations and high-fives,
   and highlight replays.
2. Vacation calendar: 5 days of Morning, Afternoon and Night; weather; NPC schedules, teams and moods; a summary at the
   end of each day.
3. Island map travel and 5 walkable places: Sunset Courts, Lagoon Pool, Fortuna Promenade, Your Villa, and Casino
   Fortuna (night only). The Dock is used for cutscenes.
4. Talk, chat, gifts, team-ups and challenges; affinity hearts; likes you discover; partners who break up.
5. Money in Sonny Dollars (S$); 3 shops; 21 swimsuits, 10 accessories, 25 gifts; a wardrobe with try-on; NPCs wear the
   swimsuits you give them.
6. Pool Hop, a rhythm hopping minigame.
7. Casino: cashier, *Fortuna Sevens* pachislot, blackjack, roulette.
8. Postcards (photo mode), an album, and a postcard as the title backdrop.
9. Story: invitation, arrival, a welcome tutorial match against Sonny & Pepper, daily events, semifinal, a final against
   "The House" with special rules, farewell party, two endings, credits slideshow, vacation results, New Vacation+.
10. Save and load: 3 slots plus autosave; Continue.
11. Beach Match with 1–4 local players (pads and a split keyboard).
12. AI Hub shared-world online matches with the game's own card.
13. Attract mode.
14. Dev mode from the pause menu: tools, plus live tuning sliders with reset to defaults.
15. A controller-first 10-foot UI. PlayStation glyphs by default with an Xbox option in Settings; native keyboard and
    mouse (hover moves focus everywhere); touch-only devices get a gate instead of touch controls.
16. All audio made in code: 9 music tracks, jingles, about 45 sound effects, and Animalese-style voices per character.
17. How to Play pages, and an About & Credits screen with the Source Information and the three feedback sections.

---

## 1. Capturing the source

| What the source is known for | How it shows up here |
| --- | --- |
| A fighting-game cast on holiday, lured by a flamboyant host under a fake tournament | 6 original fighters, each with a fighting style, personality and tastes, plus Sonny & Pepper. The invitation-ruse premise. Fighting backgrounds shape volleyball stats and celebrations. |
| Simple, timing-based 2v2 volleyball with an AI partner whose teamwork depends on your relationship | One Play button with a timing ring for every touch. Partner chemistry comes from affinity and changes how well she passes, sets and covers. |
| A vacation calendar where every activity takes time | 5 days × 3 slots. A location visit or an activity ends the slot. |
| Gift-giving and friendship as the social game | Loves, likes and dislikes; moods; accept/refuse reactions; team-up requests; break-ups. |
| Collecting swimsuits and accessories with prize money | 3 shops, 21 suits and 10 accessories with a live try-on. NPCs wear suits you give them. |
| Casino nights and pool hopping | Casino Fortuna (slots, blackjack, roulette) and Pool Hop. |
| Glossy tropical paradise, sunsets, a camera to play with | Resort art direction, time-of-day lighting, Postcards photo mode and album. |
| Campy, upbeat, slightly cheesy writing and a buffoonish host | Sonny's ALL-CAPS PA announcements, Pepper's deadpan, short punchy character lines. |
| A sunny pop/tropical soundtrack | An original chip-tropical score with steel drum, marimba and pluck instruments. |

**Content line (keep it):** the source is famous for fan service. This game keeps its world, its cast dynamic, its
fashion collecting and its tone, but stays PG/teen:

- every character is an adult (21+);
- swimwear is athletic or fashion-forward;
- the camera never lingers on bodies, and there is no jiggle physics;
- there are no peeping or "dress her up for you" mechanics;
- photo poses are holiday-snapshot poses;
- relationships are friendship and rivalry.

The humor comes from Sonny, the rivalries and vacation mishaps.

---

## 2. Genre, perspective and scope

- **Genre:** sports (arcade 2v2 beach volleyball), plus a light life-sim (vacation calendar, friendship, collecting),
  plus minigames (rhythm Pool Hop, casino). Matches are the heart of it, about 60% of play time.
- **Cameras:**
  - **Matches:** a custom side-on **Broadcast** view, `new E.View('court', 'Broadcast', 0, 32, 1.5, 1)`. The net runs
    into the screen at the centre, your team is on the left, and the sea is behind the court. `cam.frame` keeps the ball
    and players in shot like a TV director.
  - Alternate: **Serve Cam**, `new E.View('servecam', 'Serve Cam', ±90, 46, 1.5, 1)`, behind your team as in the
    source. Pick the yaw sign that puts your team at the bottom of the screen (check with a screenshot). V or R3 toggles
    it, and Settings has it too; the attract mode cuts between both. Tune Broadcast pitch 28–36 and scale 1.3–1.5 by
    screenshot, keeping characters at least 44 px tall at zoom 1.
  - **Resort places and the Villa:** `threequarter`. **Island map:** `iso`. **Pool Hop:** the Broadcast angle following
    the hopper.
  - **Shops, wardrobe, casino tables and album:** full-screen canvas UI over a live world view.
- **Resolution:** `res: 'ps1'` with `expand: true` (at least 320×240; about 427×240 on 16:9). Every HUD is anchored to
  `r.W` and `r.H`.
- **Length:** a whole vacation takes about 45–75 minutes. A Beach Match to 7 takes about 4 minutes.
- **Performance:** TASK.md makes the budget unlimited, so spend it on the look: full HD crowds, plenty of props, lights
  and particles, GPU lighting where it helps. Do no FPS or optimization work; that is out of scope.
- **Hooks for the full game:** days, slots, cast, items, locations, events, text, music and tuning are all data tables.
  Adding a day, a fighter or a shop is a data edit plus art.

---

## 3. Tech and architecture

### 3.1 Stack

- **Engine:** my-3D2dge **v0.85.2**, the handoff package at
  `https://github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff`.
  - Use the full engine `my-3d2dge.js`, which carries every module (story, songs, rhythm, arcade…).
  - Copy it to `DEV/engine/my-3d2dge.js` and patch it as §3.2 says.
  - Read `API.md` and `docs/ASSETS.md` whole. Grep `API-INDEX.md` and `AI_GUIDE.md` for: the sports recipe, Shell,
    Players, Audio, Testing without a browser, Recorded sessions, and "New animation on the rigs".
- **Kit to learn from:** `kits/sports.js` (2v2, `game.allowJoin`, the ball as a Body, `E.arc`, the crowd, radio
  commentary, the `proof()`/`bot()` pattern). Read it all. The volleyball simulation is new, but reuse its patterns.
- **Motion clips:** `src/mocap/readable.js`, `src/mocap/mocap.js`, and a small set cut with `tools/anim-set.mjs` from
  `src/mocap/sets/{quaternius,mesh2motion,cmu}.js`. Raw files are at
  `https://raw.githubusercontent.com/michaelcrosato/my-3d2dge/main/<path>`. The clip list is in §4.26.
- **AI Hub client:** `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/session.js` (v1.4.0 when this
  was planned), pasted in **unmodified**. For tests also fetch `harness.html`, `bridge.js` and `round.js` from the same
  folder. Read `lib/hub/README.md` whole.
- **Tooling:** Node ≥ 20 (24 is installed); Playwright **1.63.0** (the handoff pins it) and Chromium for browser checks;
  the handoff's `tools/check.mjs`, `filmstrip.mjs` and `replay.mjs`; Python 3 for the hub harness's local server.
- **Rules:** no other runtime libraries and no network at runtime. The hub client only talks to its parent frame.
- **Machine note:** `/tmp` was almost full when this was planned. If npm or Playwright fail with ENOSPC, set
  `TMPDIR=DEV/.tmp`.

**Fetching the sources** (M0):

```sh
git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/my-3d2dge.git DEV/.src/my-3d2dge
cd DEV/.src/my-3d2dge && git sparse-checkout set --no-cone /dist/handoff/ /src/mocap/mocap.js /src/mocap/readable.js \
  /src/mocap/sets/ /src/mocap/catalogs/ /tools/anim-set.mjs /docs/MOCAP.md
# (add any file anim-set.mjs imports if it complains)
curl -fsSL -o DEV/vendor/aihub-session.js https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/session.js
for f in harness.html bridge.js round.js README.md; do curl -fsSL -o DEV/hub/$f https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/$f; done
```

### 3.2 Engine patches

All patches go in `DEV/engine/my-3d2dge.js`. Mark each with `// AOA:`, list it in `DEV/ENGINE-CHANGES.md` with what
changed and why, give it a headless test, and mention it in the About screen's Engine Feedback.

1. **PlayStation symbols in the pixel font.** The 5×7 font table `G57` (around line 1322) lacks ✕ ○ □ △, which
   `input.label()` returns for PlayStation pads. Add them, plus ◀ ▶ for steppers.
2. **Button symbols setting.** Change the standard `glyphs` setting (around line 2999) to `{ group: 'Game', label:
   'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation ✕ ○ □ △'], ['xbox',
   'Xbox A B X Y']] }`. That way it appears on the Settings screen and defaults to PlayStation, as TASK.md requires.
3. **Per-letter dialog voice.** In `Dialog`'s typing (around line 8956, `if (this.voice && …) this.game.audio.sfx(this.voice)`),
   when `typeof this.voice === 'function'`, call `this.voice(ch, index, pageText, this)` for **every** newly shown
   letter. Do not skip every other letter, and do not call sfx. This drives the Animalese voices (§4.24.3).
4. **Audio.**
   - (a) Add a third bus `_voxBus` under `_master`, with `audio.voiceVolume` and a standard setting `voices` (Sound
     group, slider, default .8). Add `audio.bus('sfx' | 'music' | 'voice')`, which returns the GainNode, or null
     headless.
   - (b) New options for a music track:
     - `decay` (seconds): an exponential pluck envelope instead of a held note;
     - `filter: 'lowpass'` with `cutoff` (Hz);
     - `detune` (cents): a second detuned oscillator;
     - `wave`: may name an entry in `audio.instruments`, a registry of PeriodicWave partial tables `{ real: [], imag: [] }`,
       so songs can use `steel`, `marimba`, `pluck`, `bell`, `organ` and `pad` (§4.24.1).
5. **Humanoid** (the art patch, §4.25.2):
   - (a) an `athletic` entry in `BUILDS`;
   - (b) `outfit: 'swim'` with `swim: { cut, pattern, colors: { main, accent, trim }, brief }`. Also allow
     `o.pattern` on the `shirt` outfit, for Sonny's loud shirt.
   - (c) hair styles `twinbuns`, `bun`, `braid`, `bob`, `puff` and `curly`;
   - (d) hat styles `sunhat` and `visor`;
   - (e) an `extras` hook: `rig.extras = [{ at: 'head' | 'face' | 'neck' | 'hair' | 'wristL' | 'wristR', draw(g, P,
     rig, view) }]`. It is called inside `draw` with the projected anchor point and depth-sorted with the head and torso.
     Sunglasses, flowers, necklaces, masks, glasses and wristbands use it.
   - (f) bare feet: when `colors.boot === colors.skin`, draw simple feet with no boot cuff; also an optional sandal strap
     color.
   - (g) new held poses: `vready`, `bump`, `set`, `block`, `toss`, `highfive`, `clap`, `facepalm`, `peace`, `lookback`,
     `stretch`, `sit`, `sunbathe`. Build them as `cheer`, `cast` and `kneel` are built in `solvePose`: joint targets,
     arms solved with `E.ik3`, blended by `poseW`.
6. **Session combo.** Add `game.input.reserveCombo = [8, 9]`: while pad button 8 (Create/View) is held, button 9
   (Options/Menu) presses reach no action. This is an AI Hub rule.
7. **Touch-off mode.** `new E.Game({ touch: 'never' })` hides touch buttons and the touch stick for good and hides the
   Touch settings group, but keeps the corner's menu button. Touch-only devices use it (§4.1.5).
8. Register the `court` and `servecam` views. Adding them to `E.VIEWS`, or making them in game code with `new E.View`,
   are both fine.

### 3.3 Folder layout

```
./PLAN.md                    this plan
./<GAME>.html                the deliverable (built; never edited by hand)
./exit-interview.json
DEV/
  package.json               { "type": "module", "scripts": { "build": "node tools/build.mjs", "test": "node test/run.mjs" },
                               "devDependencies": { "playwright": "1.63.0" } }
  README-DEV.md              how to build, run and test; conventions
  ENGINE-CHANGES.md          every engine patch: what and why
  .src/                      sparse clone of the engine repository (reference only; never bundled)
  engine/my-3d2dge.js        the patched engine
  vendor/aihub-session.js    unmodified hub client
  vendor/mocap/readable.js, mocap.js, aoa-clips.js     (the cut clip set, name AOA)
  hub/harness.html, bridge.js, round.js, README.md      (tests only; never bundled)
  src/*.js                   game modules (§3.6), concatenated in name order
  build/game.js              generated: every src file inside one IIFE
  build/dev.html             generated: engine, vendor and build/game.js as separate <script src>, for quick looks
  tools/build.mjs            builds build/ and the deliverable
  tools/rigsheet.mjs         every fighter × suit × facing × view to test-output/rigsheet/*.png (Playwright)
  tools/check.mjs, filmstrip.mjs, replay.mjs, asset-sheet.mjs, asset-find.mjs, asset-set.mjs   (copied from the handoff)
  test/run.mjs               THE test command (§9)
  test/lib/load.mjs, fakehub.mjs, bots.mjs, assert.mjs
  test/suites/*.test.mjs
  test-output/               screenshots, filmstrips, rig sheets (never bundled)
```

### 3.4 Build (`node tools/build.mjs`, also `npm run build`)

1. Concatenate `src/*.js` in lexical order into `build/game.js`, wrapped as
   `(() => { 'use strict'; const E = My3D2dge, G = {}; window.AOA = G; /* files */ })();`. Each src file is plain code
   that adds to `G`: no import or export.
2. Write `build/dev.html`.
3. Write the deliverable html. Order matters:
   ```html
   <!doctype html><html lang="en"><head><meta charset="utf-8">
   <script>/* vendor/aihub-session.js, verbatim */</script>        <!-- first script, right after meta charset (hub rule) -->
   <meta name="hub:session" content="1"> … (the tags of §4.23)
   <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
   <title>Ahead or Alive: Xtreme Beach Volleyball</title>
   <style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
   </head><body>
   <!-- the handoff template's #e3-boot splash div, retitled AHEAD OR ALIVE -->
   <canvas id="screen"></canvas>
   <script>/* engine/my-3d2dge.js */</script>
   <script>/* vendor/mocap/readable.js + mocap.js + aoa-clips.js */</script>
   <script>/* build/game.js */</script>
   </body></html>
   ```
4. Escape every `</script` inside inlined code as `<\/script`. Add no external URL. Print the file size.
5. The build never edits the vendor client.

### 3.5 Runtime architecture

- **One game.**
  ```js
  G.game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'court', id: 'ahead-or-alive', bg: '#0a2d3d',
    menu: hub ? false : { items, settings, quit: 'title' },
    autoPause: !hub, corner: !hub, fullscreen: hub ? false : true, touch: touchOnly ? 'never' : 'auto' })
  ```
  Here `hub = window.AIHub && AIHub.active` is known on the first line, and `items` are the pause actions of §4.2.
  Add `G.ui = new E.Shell(game, { theme })` for themed standard screens, toasts and tutorial cards. If the Shell's pause
  screen doesn't list the `menu.items`, pass them again as `screens: { pause: { actions } }`. A headless test checks the
  pause screen lists them.
- **Scenes** (`game.start({ scenes, scene, boot })`): `title`, `menu`, `attract`, `charselect`, `cutscene` (runs story
  scripts), `map`, `location` (every walkable place, entered with `{ loc }`), `match`, `poolhop`, `shop`, `wardrobe`,
  `journal`, `album`, `casino` (cashier, slots, blackjack and roulette as sub-states), `dayend`, `results`, `credits`,
  `about`, `howto`, `exhibition` (setup and join), `hub` (AI Hub card and match). Gameplay scenes are `pausable: true`;
  title, menu, attract, about, credits and the hub scene are not.
- **Overlays.** `G.overlay` is a stack for the dev panel, photo mode, toasts, the touch-only notice and the attract
  watcher. Wrap every scene with `G.wrapScene(scene)`: its `update` first calls `G.overlay.update(dt)`, which returns
  true when an overlay took the input, and its `draw` ends with `G.overlay.draw(r)`.
- **State.** `G.state` is the vacation save object (§4.19), or null outside a vacation. `G.session` is the
  exhibition/hub match config. `G.unlocks` lives in `E.store('aoa-unlocks')`.
- **Tuning.** `G.T` is the live object every system reads every step. It is built from `G.TUNING` defaults (§4.22.2),
  with dev overrides from `E.store('aoa-dev-tuning')`.
- **Randomness.** Gameplay never calls `Math.random`; use `G.rng(stream)`:
  - `world`: schedules, moods, weather and stock (seeded per save);
  - `match`: AI rolls, net cords (seeded per match);
  - `casino`;
  - `cosmetic`: crowd, particles, voices (never affects state).
  In a hub shared world the host seeds `match` from `AIHub.rng('match')`. A test greps `src/` for `Math.random(`.
- **Event bus.** `G.bus.on/off/emit` carries `point`, `touch`, `fault`, `matchEnd`, `gift`, `affinity`, `purchase`,
  `slotEnd`, `dayEnd`, `photo` and `story`. Commentary, stats, tests and the attract director listen to it.
- **Debug handle.** `game.debug = { snapshot(), tools }` (§9.2). The dev panel's buttons call the same `tools`.

### 3.6 Source modules (`DEV/src/`)

| File | Holds |
| --- | --- |
| `00-core.js` | G namespace, constants, rng streams, event bus, scene wrapper, overlay stack, helpers (`G.fmtMoney` → `S$12,500`) |
| `01-tuning.js` | `G.TUNING` (every slider: default, min, max, step, group, label, unit) and difficulty presets |
| `02-data-cast.js` | fighters, hosts and staff: looks, stats, tastes, likes, voice profiles, schedules, celebration clips |
| `03-data-items.js` | swimsuits, accessories, gifts, shops and stock rotation |
| `04-data-world.js` | location maps (rows, legends, props, spots, interactables), island map, calendar, weather, events |
| `05-data-text.js` | all dialogue as `E.Story` nodes, commentary lines, UI strings, How to Play and About texts |
| `06-data-music.js` | songs (step notation), jingles, instrument tables |
| `10-input.js` | action maps per context, devices, glyph icons, prompt drawing, the touch-only gate, mouse helpers |
| `11-ui.js` | the 10-foot canvas UI kit (§4.2) |
| `12-audio.js` | SFX defines, music control and layers, ambience loops, the Animalese voice synth |
| `13-rigs.js` | the rig factory (cast + suit + accessories), extras drawers, portraits |
| `14-world-art.js` | resort `E.SHAPES` and `E.MATERIALS`, backdrops and lighting by time of day, water, effects helpers |
| `15-anim.js` | move timelines, the arm-IK overlay, celebrations and emotes, mocap glue |
| `20-ball.js` | closed-form ball flight, launches, aiming, prediction, net and ground events |
| `21-rules.js` | the referee: touches, faults, scoring, serve rotation, match end, stats |
| `22-players.js` | player entity: movement, actions, the timing judge, the human controller |
| `23-ai.js` | volleyball AI: assignment, positioning, decisions, error model, chemistry, spectacle mode |
| `24-match.js` | the Match: phases, cameras, HUD, crowd, commentary, celebrations, replay, results |
| `25-netplay.js` | AI Hub shared-world host and client sync, the card, reporting |
| `30-vacation.js` | calendar, slots, weather, schedules, moods, affinity, partners, money, events, saves |
| `31-map.js` | the island map scene |
| `32-location.js` | the walkable location scene, NPC spots, talk menu, interactables |
| `33-shop.js` | shops, wardrobe, gift bag, journal |
| `34-story.js` | `E.Story` wiring, cutscene scripts, portraits and voices, prologue, party, endings |
| `40-poolhop.js` | Pool Hop |
| `41-casino.js` | casino floor, cashier, slots, blackjack, roulette |
| `42-photo.js` | photo mode and album |
| `50-title.js` | boot steps, title, main menu, How to Play, About & Credits |
| `51-attract.js` | the attract director |
| `52-exhibition.js` | Beach Match setup and local join |
| `53-dev.js` | the dev panel |
| `54-results.js` | match results, day end, vacation results, credits roll |
| `99-main.js` | building the game, scene registry, hub detection, boot, `game.start` |

---

## 4. Systems

### 4.1 Input, devices, glyphs, prompts (`10-input.js`)

**4.1.1 Action maps.** Each scene sets an `input` preset. Every preset includes the engine defaults for `up`, `down`,
`left` and `right` (WASD, arrows, d-pad, left stick) and for `start` and `pause`.

| Preset | Action | Keyboard | Mouse | Pad (standard mapping) |
| --- | --- | --- | --- | --- |
| MATCH | `play`: bump, set, spike, serve (timed) | Space, J | Left | 0 ✕/A |
| | `shot`: tip/cut shot, block, jump serve, free ball | E, K | Right | 2 □/X |
| | `dive` | Left Shift, L | — | 1 ○/B |
| | `call`: Mine / Yours / Auto | Q, I | Middle | 3 △/Y |
| | `view`: Broadcast ↔ Serve Cam | V | — | 11 R3 |
| EXPLORE | `interact` | E, Space, Enter | Left (on a person or thing) | 0 ✕/A |
| | `run` (hold) | Left Shift | — | 1 ○/B, 7 R2 |
| | `bag`: gift bag | G | — | 2 □/X |
| | `leave`: island map | M, Tab | — | 3 △/Y |
| | `snap`: postcard (not in sessions) | C | — | 8 Create/View |
| MENU | `confirm` | Enter, Space | Left | 0 ✕/A |
| | `cancel` | Backspace (Esc on non-pausable screens) | Right | 1 ○/B |
| | `alt` | F | — | 2 □/X |
| | `extra` | R | — | 3 △/Y |
| | `tabL` / `tabR` | Q / E | wheel | 4 L1 / 5 R1 |
| POOLHOP | `hopA` / `hopB` / `hopX` / `hopY` | J, Space / L, Shift / K, E / I, Q | Left = hopA, Right = hopX | 0 / 1 / 2 / 3 |
| CASINO | MENU, plus blackjack H hit, S stand, D double, P split; slots J K L stop reels 1-2-3 | | | |

- **Split keyboard (Beach Match).** The engine's half-keys give P1 WASD plus F G H R and P2 the arrows plus `.` `/` `,`
  `L`. Order the MATCH actions `play, dive, shot, call` so the halves come out as F/`.` = play, G/`/` = dive, H/`,` =
  shot, R/L = call. Show this on the join screen as keycaps.
- **Escape.** In pausable scenes Escape opens the pause menu, and Backspace or right click goes back inside our canvas
  screens. On title and menu screens Escape goes back.

**4.1.2 Device and glyph logic.**

- `G.dev(input)` returns `'ps' | 'xbox' | 'kbm'`. `lastDevice === 'gamepad'` gives `padStyle()`, which follows the
  Button symbols setting; keyboard or mouse gives `kbm`.
- `G.prompt(g, x, y, action, text, { input })` draws a glyph icon and the text and returns its width. Prompts redraw from
  the current device every frame; never cache them.
- **Glyph icons** are pixel art drawn with `px`:

| Device | How it is drawn |
| --- | --- |
| PlayStation | a 9×9 dark disc with the symbol in its color: ✕ `#8fb8ff`, ○ `#ff7a7a`, □ `#f59ad8`, △ `#5fe0b4` |
| Xbox | a disc in the letter's color, with a dark letter: A `#6ad66a`, B `#ff5a5a`, X `#4aa8ff`, Y `#ffd23a` |
| Pad shoulders and system buttons | rounded pills: L1/R1/L2/R2 or LB/RB/LT/RT; Options/Create or Menu/View; d-pad and stick icons |
| Keyboard | a keycap (light rounded rectangle, darker bottom edge) with `input.label(action, 'keyboard')` |
| Mouse | a 7×9 mouse with the bound button lit |

- `G.ui.promptBar([[action, text], …])` sits at the bottom centre of every screen. Text never says "press A": the glyph
  always comes from the action map.

**4.1.3 Mouse.**

- **Canvas UI:** hover moves focus (`input.pointer()` hit-tested against the widgets laid out last frame); left click
  activates; right click goes back; the wheel scrolls or pages lists.
- **World:** hovering an NPC or an interactable highlights it and shows its name (`r.actor(…, { pick: npc })` with
  `r.pick`). Clicking walks there and interacts.
- **Matches:** while the last device is keyboard or mouse, a reticle follows `game.mouseGround()` on the opponents' half.
  Spike, shot and serve aim at it.
- **Photo mode:** right-drag orbits and the wheel zooms.

**4.1.4 Rumble.** Use `input.rumble`: spikes and serves (.35, .1 s), blocks (.5, .12 s), dives (.3, .15 s), the jackpot
(.6, .5 s).

**4.1.5 Touch-only gate.**

- `G.touchOnly()` is `matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches &&
  !G.sawKeyOrPad`. Check it at boot and on each pointer event.
- While it is true:
  - there are no touch controls (patch 7);
  - the title and menu show a centred panel, **"Controller or keyboard required"**, with the line "Connect a controller
    or keyboard to play. The demo keeps running." and a big **Settings** button (a tap opens `game.menu('settings')`);
  - the engine corner's menu button stays;
  - taps do nothing else, and the attract mode runs as usual (a tap ends it, as any input does).
- The first key or gamepad button sets `G.sawKeyOrPad` and normal play resumes.
- In an AI Hub session a touch-only player's fighter is played by the AI, with the banner "Connect a controller or
  keyboard to take over".

### 4.2 The 10-foot canvas UI kit (`11-ui.js`)

**Readability rules.** Each one is a review item.

- **Text sizes:** the smallest text anywhere is `E.font` 5×7 at scale 1 with a shadow. Headings are scale 2; screen
  titles are `E.font.title` at scale 3; numbers that matter (money, score) are scale 2.
- **Density:** at most 8 focusable items per screen. Item grids are 3×2 (shops, gifts, wardrobe) or 4×2 (album), paged
  with L1/R1, Q/E or the wheel. There is one detail panel. Never show stat tables: use icons, bars, hearts and short
  phrases.
- **Safe area:** keep content inside a 5% margin of `r.W`/`r.H` (TV overscan) and clear of `game.cornerArea()` and
  `input.touchArea()`.
- **Focus:** a 2-px gold outline with a 1-px white inner line, a soft additive glow pulse and a 1-px lift. Sounds:
  `ui_tick` on move, `ui_select` on confirm, `ui_back` on back, `ui_error` on refusal.
- **Navigation:** d-pad, stick, WASD and arrows move focus spatially to the nearest widget in that direction, repeating
  via `input.repeat` (0.35 s delay, 0.09 s rate). Confirm and back come from MENU; tabs are L1/R1 and Q/E; the mouse
  works as in §4.1.3.
- **Themes:**

| Theme | Panel bg | Border | Ink | Muted | Accent |
| --- | --- | --- | --- | --- | --- |
| Day | `['#0f4c5c', '#0a2d3d']` | `#f6d38a` | `#fff8e8` | `#9fd3d6` | `#ff9e5e` |
| Night (casino, night villa) | `['#2a1240', '#12081e']` | `#ff5fa2` | as day | as day | `#5ff0ff` |

**Widgets:**

| Widget | Purpose |
| --- | --- |
| `Panel` | gradient window (`E.ui.box`) |
| `Button` | label, optional glyph, disabled state |
| `List` | vertical menu, scrolls past 8 |
| `Grid` | cards in rows and columns, paged |
| `Tabs` | categories; L1/R1 |
| `Slider` | number; left/right steps, held accelerates, mouse drag; shows the default as a tick |
| `Toggle`, `Stepper` | ◀ value ▶ |
| `Card` | item: icon or live rig preview, name, price, NEW/OWNED/WEARING badges |
| `CharCard` | portrait (`rig.drawPortrait`), name, hearts, mood icon and word |
| `MoneyBadge` | coin icon and amount, animated count |
| `ClockBadge` | "Day 2 · Afternoon" with sun/moon and weather icons |
| `Confirm` | yes/no; default No when destructive |
| `Toast` | slides in at the top for 3 s |
| `PromptBar` | glyph prompts at the bottom |
| `Tip` | one line under the focused card |

- **Layout:** `ui.frame(r)` lays out widgets from `r.W`/`r.H` each draw and records hit rects; `update` uses last
  frame's rects.
- **E.Shell theme**, for the engine's standard pause, settings and controls screens and for toasts: the day palette,
  `font: '600 20px/1.35 "Trebuchet MS", system-ui, sans-serif'`.
- **Pause actions:** Resume (engine), **How to Play**, **Take a Postcard** (walkable places and match results only),
  **Dev Mode**, then the engine's Settings, Controls, Full screen and Quit to title (which asks first).
- **Game settings** (via `menu.settings`, group Game):

| Setting | Values |
| --- | --- |
| Difficulty | Easy, Normal, Hard, Pro |
| Timing assist | Tight, Normal, Generous |
| Auto-run to the ball | on, off |
| Auto-receive | off by default |
| Timing ring | on, off |
| Match camera | Broadcast, Serve Cam |
| Text speed | Slow, Normal, Fast, Instant |
| Commentary | on, off |
| Button symbols | PlayStation, Xbox (patch 2) |

  The Voices volume is in the Sound group (patch 4).

### 4.3 The court and its coordinates

One `E.TileMap` is used both as the beach to walk around and as the match court.

| Name | Value | Notes |
| --- | --- | --- |
| tile | 16 units | engine standard |
| map | 44 × 28 tiles (704 × 448) | rows 0–5 sea (floor tag `sea`, `block: true`), row 6 wet sand `wet`, rows 7–27 sand `sand`; `outside: false` so the backdrop shows past the far edge |
| court X0, X1 | 224, 480 | length 256 (128 a side) |
| net | x = NET_X = 352; top tape z = NET_H = 44; mesh z 28–44 | posts at y = Y0−10 and Y1+10 (h 52); antennae at y = Y0 and Y1, up to z 62 |
| court Y0, Y1 | 176, 304 | width 128; CY = 240 |
| serve zones | x < X0 (left) or x > X1 (right), y within the court | the server stands 20 behind the line |
| lines | 2-unit blue rope lines in `floorTex` on x = X0, X1 and y = Y0, Y1 | beach courts have no centre line |
| far-side strip | y 112–175 | bleachers, umbrellas, Sonny's DJ booth, Pepper's scorer table and flip scoreboard |
| left and right sand | x < 224, x > 480 | tiki bar (left), lifeguard tower and loungers (right) |
| near side | y > 304 | **low props only** (towels, sandcastle, cooler): tall ones would hide the court in Broadcast |

- Draw order: the backdrop (sky, sun, clouds, distant islands, sea) is drawn first, then `map.drawFloor`. Match the
  `sea` floor color to the backdrop's sea layer by screenshot.
- Time of day sets the backdrop, `lights.ambient`, the tint, and torches and floodlights (lamppost shapes with lights)
  at night.

### 4.4 Ball flight (`20-ball.js`)

The ball is **not** an `E.Body`. It is the current **launch**:
`{ t0, p: [x, y, z], v: [vx, vy, vz], k, g, ay, wob: { a, w, ph } | null, by, kind }`. `t0` is on the match clock,
`M.now()` in seconds: `game.time` locally, or `AIHub.time() / 1000` in a hub session.

**Closed form.** With τ = t − t0, e = exp(−kτ), k ≥ 1e-4:

```
x = x0 + vx(1−e)/k
y = y0 + vy(1−e)/k + ay(τ/k − (1−e)/k²) + wobble(τ)            wobble = a·sin(wτ + ph)·min(1, τ/0.3)  (float serves)
z = z0 + (vz + g/k)(1−e)/k − gτ/k
velocity: (vx·e,  vy·e + ay(1−e)/k,  (vz + g/k)e − g/k)
```

- `ball.at(t)` and `ball.vel(t)` are sampled every step for drawing. There is no integration drift, and every machine
  agrees, which the online play relies on.
- **Aiming** (`aim(from, to, T)`): given a flight time T,
  - vx = (xT − x0)·k / (1 − e^(−kT)), and vy the same way (subtract the wind term when `ay` ≠ 0);
  - vz = ((zT − z0) + gT/k)·k / (1 − e^(−kT)) − g/k.
- **Flight times by kind:**

| Kind | T |
| --- | --- |
| pass | `T.passT` (1.05 s) |
| set | `T.setT` (1.1 s); quick set .75 |
| float serve | `T.serveT` (1.3 s) |
| jump serve | `T.jumpServeT` (.85 s) |
| spike | from speed: horizontal distance / (spikeSpeed · cos 15°) |
| shot | `T.shotT` (.95 s) |
| free ball | 1.2 s |
| setter dump | .6 s |

- **Precomputed events.** Each new launch computes these once:
  - `tNet`, when x crosses NET_X (x is monotonic). At that moment:
    - **clear** if z − r > NET_H;
    - **tape** (net cord) if z + r ≥ NET_H − 3. A new launch starts from the crossing point: with probability
      `T.netCordOver` it keeps going (vx·.35, vz 60 ± 20, from the `match` rng), otherwise it drops back (vx·−.3);
    - **net** if lower: it bounces back (vx·−.25, vy·.5, vz·.3), and the team still has its touches;
    - **antenna/outside** if |y − CY| > 64 + r: a fault on the team that hit it.
  - `tLand`, when z = r. Use bisection on the descending branch to 1e-4 s. The ball is **in** when
    X0 − r ≤ x ≤ X1 + r and Y0 − r ≤ y ≤ Y1 + r (touching the line is in).
  - `timeAtHeight(h)` (descending branch) and `posAt(t)`, for contact planning.
- **The ball itself:** radius r = 3.5; a 10-px sprite (white with blue and yellow panels) whose rotation follows its
  speed; a ground shadow `r.shadow(x, y, 4 − min(2, z·.03), .4)`. The shadow is essential for reading depth.
- **Landing:** dust (`particles.dust`), `sfx('sand')`, and a ball-mark decal for 2.5 s. The ball rolls about 6 units
  for show after the point is decided.
- Players may chase and play the ball outside the court lines, but never past the net plane.

**Default feel** (all of these are sliders): g 330, k .12, r 3.5. With these numbers:

| Shot | Path | Apex / timing |
| --- | --- | --- |
| pass | from z 18 to set height 40 | apex ≈ 75 |
| set | from 40 to the spike contact ≈ 62 | apex ≈ 100 |
| float serve | from 52 to the floor in 1.3 s | apex ≈ 98; clears the net by ≈ 40 |
| spike from 20 behind the net, 330 u/s | to 100 beyond the net | lands in ≈ .38 s; clears the tape by ≈ 7 |

A spike hit from far behind the net with a short, sharp target hits the net. Errors come out of the physics.

### 4.5 Rules and referee (`21-rules.js`)

- **Scoring:** rally scoring; one set to `pointsToWin` (vacation 7, final 11, exhibition 7/11/15/21, hub 7); win by 2;
  hard cap at pointsToWin + 4 (to 7, the first to 11 wins even at 11–10). Exhibition can play best of 3 sets of the
  same length.
- **Touches:** at most 3 a side. A block counts as a touch (the beach rule). The same player may not touch twice in a
  row, except straight after her own block.
- **Faults** (point to the other team):
  - the ball lands out after the team's last touch;
  - a 4th touch;
  - a double touch;
  - the ball crosses outside the antennae or under the net;
  - a **net touch**: an airborne player's hands or body pass NET_X ± 2 while the ball is live within 40 units (rare;
    mostly from early, fast blocks);
  - a **serve fault**: into the net, out, or no hit within 1.2 s of the toss.
- **Serve rotation:** on a side-out the receiving team serves, and its server is the player who did not serve last time
  for that team. The first serve goes by coin toss: the player's team, unless an event says otherwise.
- **After a point:** `dead` (1.0 s: the ball settles) → `point` (1.6 s: celebrations) → optional replay → `serveSetup`.
- **Calls:** big banners with a whistle: "IN!", "OUT!", "NET!", "4 TOUCHES", "DOUBLE TOUCH", "ANTENNA", "ACE!", "KILL!",
  "BLOCK!", "NET TOUCH". Each is text plus an icon, never color alone.
- **Stats:**

| Scope | Counted |
| --- | --- |
| per player | serves, aces, serve faults, digs, perfect passes, sets, kills, attack errors, blocks, points |
| per match | rallies, longest rally |

### 4.6 Players, actions and the timing judge (`22-players.js`)

**The player entity:** `{ id, side: 0 | 1, slot: 0 | 1, cast, rig, x, y, z, vx, vy, vz, facing, act, input | null, ai,
call: 'auto' | 'mine' | 'yours', lockT, stats }`.

**Movement.**

- Speed is `T.runSpeed × (0.86 + 0.03 × SPD)`, default 96, with acceleration 900 u/s². Players face the ball while it
  is live.
- They can't cross NET_X (clamp at ±6). They can leave the court, but not the map.
- **Auto-run** (`T.autoMove`, Settings): while a human's stick is neutral and she is assigned the next contact, she
  steers toward the contact point at `autoMove ×` her speed.

**Contact planning.** `planContacts(side)` runs whenever a launch heads to a side and after each touch on that side.
For each player on that side it computes:

- **kind**, by touch number: 0 = receive/dig, 1 = set, 2 = attack. A ball arriving from the other side is always
  touch 0.
- **contact height h:** bump 18; set 40; attack = that player's reach, about `50·size/1.25` plus her jump apex
  `12 + 1.2·JMP` (≈ 58–66). If the ball is too low to set or attack, fall back to bump height.
- **t\*** = `timeAtHeight(h)`. If the ball never comes down to h, use tLand − .05 and the ball's height then: a dig.
- **P\*** = `posAt(t*)` on the ground, and her travel time to it.

**Assignment.**

- A human's call wins: Mine gives her the ball and Yours gives it to the partner, provided that player can reach P* by
  t* + .1 s.
- Otherwise the faster arrival takes it; on a tie, whoever didn't make the previous touch.
- The partner **covers** a ball assigned to the human only when the human is more than 40 units from P* at t* − .4 s.

**Timing ring.** A ground ring at P* (decal) shrinks from radius 22 to the reach radius over the last .8 s. It turns
from white to gold inside the PERFECT window, and a "!" pip appears over the head .35 s before t*. Settings can turn it
off, and the final's Golden Glare hides it (§4.8.6).

**The judge.**

- The **first** `play` press in [t* − .6, t* + okWin] counts; other presses do nothing. err = tPress − t*.
- PERFECT if |err| ≤ `T.perfectWin` (.05 s), GREAT if ≤ `T.greatWin` (.10), OK if ≤ `T.okWin` (.16); otherwise MISS:
  a whiff animation and a .45 s lock.
- **Reach check:** horizontal distance from the player to P* ≤ `T.reach` (14 + .4·TEC) keeps the judged quality; up to
  8 more gives a **stretch** (one quality lower); beyond that, a whiff.
- **Timing assist** multiplies the windows: Tight × .8, Normal × 1, Generous × 1.6.
- **Auto-receive** (Settings; forced on for the tutorial's first 2 receives): with no press by t*, a receive (not a set
  or spike) happens at OK quality.
- No press means the ball passes her. If it lands, the point is lost, unless the partner covered it (see Assignment
  above).

**What each quality does:**

| Quality | Accuracy radius around the intended target | Speed |
| --- | --- | --- |
| PERFECT | 4 | × 1.12 |
| GREAT | 10 | × 1.0 |
| OK | 20 | × .85 |
| stretch | 30 | × .8 |

**Actions:**

| Action | Input | What happens |
| --- | --- | --- |
| **Receive / dig** (touch 0) | Play | Bump to the **pass target** (NET_X ∓ 40, the partner's y) in passT; the stick biases the target ±24. Holding **Shot** instead sends a free ball over the net to the deepest open zone. |
| **Set** (touch 1) | Play | Set to the **attack spot** (NET_X ∓ 22, the hitter's y) in setT. Stick neutral = high set; toward the net = quick set (T .75, lower apex); away = back set. **Shot** = setter dump (a tip to the nearest open short zone, T .6). |
| **Attack** (touch 2) | Play = spike, Shot = cut/roll shot | She approaches and jumps on her own: the jump starts at t* − jumpTime(JMP) so her hand meets the ball at t*. The press at t* swings. Spike speed is `T.spikeSpeed × (0.85 + .035·POW) × quality`; a shot takes shotT and peaks just over the block. If she wasn't in reach (a bad set), the press makes a high, soft free ball. |
| **Aim** | Stick at contact, or mouse | Pad and keyboard pick one of 9 zones on the opponents' half: neutral = deep centre, up/down on screen = line or cross-court, toward the net = short angle, away = deep. With the mouse as the last device, the reticle's ground point is the target, clamped 6 inside the lines. Quality then scatters by the radius above, which can push it out. |
| **Spike assist** | difficulty | If the aimed spike can't clear the net from the contact point, raise the arc just enough: always on Easy; on Normal only when the miss would be under 4 units; never on Hard or Pro, where it goes into the net. |
| **Serve** | Play (float) or Shot (jump serve) to toss; the same button again at the top of the toss | Before the toss she walks along the baseline with the stick. The hit's timing is judged against the toss apex with the same windows. Aim with the stick or mouse; a target marker shows during the toss. Jump serves are faster and scatter × 1.5. No second press within 1.2 s is a serve fault. AI serves after 1.2–2.5 s; a human gets an automatic float serve after 10 s. |
| **Block** | Shot, within 20 of the net while the opponents attack | She jumps; her hands reach the top `T.blockRise` (.28 s) after the press and stay up .18 s. When the spike crosses the net plane, it is blocked if abs(y_ball − y_blocker) ≤ 9 + .6·JMP and NET_H ≤ z_ball ≤ handTop(t). Timing error = (tPress + blockRise) − tNet. PERFECT or GREAT is a **stuff** (back down on the attacker's side: v = (−.35vx, .3vy ± 20, −60)). OK is a **soft block**: it pops up on her side as a touch. Cut shots arc over the block unless she has JMP 9 and timed it PERFECT. |
| **Dive** | Dive | Lunge toward the stick (or toward P* when neutral) at 190 u/s for .22 s, slide .3 s, down .45 s. Reach is +`T.diveReach` (16) during the lunge. A judged Play press during it is a **dig**: accuracy radius × 1.6 and a higher apex. A dive with no ball is just the lunge and recovery. |
| **Call** | Call | Cycles mine → yours → auto. A speech bubble ("MINE!" / "YOURS!") appears with a gibberish shout. AI teammates call too ("MINE!" when they take a ball). |

Every action sets the rig state `{ act, phase, u }` for animation (§4.26).

### 4.7 AI (`23-ai.js`)

**Skill.** Each AI player, for each touch, has
`skill = clamp((base × T.aiSkillMul + difficulty) × (0.8 + 0.05 × stat) × chem, 0, 1)`:

- `base` is the day's value (§5.6);
- `difficulty` is the setting's offset: Easy −.2, Normal 0, Hard +.12, Pro +.22;
- `stat` is the stat the touch uses: TEC for passes, digs and sets; POW for attacks and serves; JMP for blocks. SPD
  scales movement speed instead (§4.6).
- `chem` is 1 for opponents. For the player's AI partner it is `(1 − T.chemistry/2) + T.chemistry × affinity/100`; the
  default `T.chemistry` .3 gives .85–1.15.

**Reaction.** She starts toward P* `T.aiReaction × (1.2 − skill)` s after a launch, and moves at speed × `T.aiSpeedMul`.

**Errors per touch.** Roll on the `match` rng:

| Outcome | Probability |
| --- | --- |
| PERFECT | .10 + .45·skill |
| GREAT | .30 |
| MISS | max(.02, .16·(1 − skill)): a shank in a random direction, or no touch |
| OK | the rest |

**Formation by phase:**

| Phase | Positions |
| --- | --- |
| receiving serve | split the court in y, 40% deep |
| own attack | the setter under the pass target; the hitter backs off for her approach |
| defending an attack | if the set is near the net and a skill roll passes, one blocks in line with the attacker; the other defends deep cross-court |
| free ball | both back |

**Decisions.**

- **Attack target:** of the 9 zones, the one with the largest "distance to the nearest defender's predicted spot minus
  her reach", minus 8·(1 − skill) for zones within 10 of a line.
- **Shot or spike:** a shot when a blocker is up and in line, plus 20% at random for variety.
- **Serve:** float 70% and jump 30% (50% jump when POW ≥ 8), aimed at the deep corners or the seam between receivers.
- **Setter dump:** 8% when the opponents' front court is empty.

**AI with a human teammate.** Beach pattern: whoever passes, attacks. When the human passes, the AI sets back to her;
when the AI passes, the human sets and the AI attacks.

**Spectacle mode** (attract only): perfect skill until the rally reaches a random 3–9 touches, then the attacking side's
spike goes into the biggest gap, a guaranteed kill.

**Determinism.** Every roll comes from `G.rng('match')`, so the same seed and inputs give the same score (tested).

### 4.8 Match flow and presentation (`24-match.js`)

**4.8.1 Phases.** `intro` → `coin` → `serveSetup` → `toss` → `rally` → `dead` → `point` → [`replay`] → … →
`matchPoint` sting → `end`.

- `intro`: walk-on, Sonny's PA line, the teams line up at the net; 3 s, skippable.
- `coin`: who serves; 1 s.

**4.8.2 Cameras.**

- **Broadcast:** `cam.frame([ball, ...players, netTop], { margin: 28, zoom: [.78, 1] })` with `cam.smooth` .22. During
  `serveSetup` it frames the server and the receivers.
- **Serve Cam:** follows the ball's x with a lead, fixed at the court's centre y, zoom .9.
- `view` (V / R3) toggles them; Settings has "Match camera". The scene's `camera: { zoom: [.85, 1.25] }` lets the
  player nudge the zoom.

**4.8.3 HUD** (pixel art, anchored to the screen):

| Where | What |
| --- | --- |
| top left | TV score bug: per team two small portraits, names, score, a serve ball icon, set count, and a MATCH POINT tag |
| top right | ClockBadge (vacation) or the hub clock |
| bottom left | partner card: portrait, name, hearts = chemistry, mood |
| bottom centre | context prompts (at most 3, e.g. "✕ BUMP · ○ DIVE · △ CALL") |
| at players | judgement popups (PERFECT! gold, GREAT cyan, OK white, MISS grey) and call bubbles |
| bottom right | commentary box: `E.Dialog` with `modal: false, auto: 2.2`, Sonny's portrait, his voice |

**4.8.4 Crowd and set dressing.**

- 24 spectators on the far-side bleachers and towels, drawn as small pixel sprites like the sports kit's crowd, plus 4
  HD rigs at size .9 drawn `every: 2`. They sway, jump and cheer on points (more for the home side) and groan at errors.
- Sonny reacts at his DJ booth.
- Pepper sits at the scorer's table beside a flip scoreboard shape whose cards change with the score.
- Night matches add floodlights (lights) and tiki torches.

**4.8.5 Celebrations.**

| Moment | Animation |
| --- | --- |
| point won | the partners high-five (§4.26), plus a fist pump |
| ace, kill or block | the scorer's signature celebration |
| point lost | a shrug, an encouraging pat or a facepalm (short) |
| match won | both cheer, then the MVP's signature move |
| match lost | kneel and sigh |

All of these fit inside the `point` phase.

**4.8.6 Specials in the final against Sonny & Pepper ("The House").** Each is telegraphed in Pepper's Day 4 letter and
by the commentary.

- **Golden Glare:** half of Sonny's serves. His sunglasses flash (a .6 s telegraph: glint particle, `sfx('glare')`), and
  the receiving human's timing ring is hidden for that serve ("DAZZLED!"). A receiver wearing **any sunglasses**
  accessory is immune ("SHADES ON!").
- **House Edge:** once per set Pepper hits a precise line shot. The AI partner covers it only at chemistry Good Friend
  or better ("I've got line!").
- **Lucky Seven:** the first time The House reaches game point, Sonny's next attack clips the tape and is guaranteed to
  dribble over.

**4.8.7 Highlight replay.**

- Keep a ring buffer of the last 6 s at 60 Hz: rig states, launches and camera.
- After an ace, a stuff block, a spike over 400 u/s, or a rally of 8+ touches (at most once every 3 points), replay the
  last 3 s at .4× from the other camera with a "REPLAY" letterbox. Any button skips.
- Off in hub sessions.

**4.8.8 Results.**

- The winners pose.
- Three big stat cards: points, kills, longest rally. The MVP (most points) gets a portrait and her signature move.
- Vacation: prize money counts up, the partner's affinity change animates as hearts, then **Continue**.
- Beach Match: Rematch / Change setup / Title.

**4.8.9 Sound.**

- The match song `spike` has a named drum layer `rally` that comes in on long rallies (`audio.layer`). At match point
  the tempo goes up by 6 (`audio.tempo`) with a sting.
- Ball sounds per kind, the whistle, crowd swells, and Sonny's PA voice.

### 4.9 Beach Match: exhibition and local multiplayer (`52-exhibition.js`)

**The setup screen.** Four columns, one per slot (Left 1, Left 2, Right 1, Right 2). Each shows a fighter on a pedestal
and who controls it: CPU or P1–P4.

- **Joining:** `game.allowJoin({ max: 4, onJoin })`. Start or ✕ on a free pad, or 2 on the keyboard (the split halves).
- **Each joined player:** left/right moves her badge between slots; up/down picks the fighter; □ picks the outfit
  (signature suits, plus suits ever owned in a vacation, or every suit once a vacation is finished); ✕ is ready.
- **Options row:** points (7/11/15/21), sets (1/3), difficulty, court time (Morning/Sunset/Night), camera.
- The match starts when every joined player is ready.

**Any mix works:** 1P with a CPU partner vs CPU; 2P co-op vs CPU; 1v1 with CPU partners; 2v2; 3 players (2 vs 1 + CPU).

Each player's prompts use her own device (`p.input.label`, per-player glyph style). Results offer Rematch / Change setup
/ Title.

### 4.10 Calendar, slots, weather, schedules, moods (`30-vacation.js`)

**Days and slots.** `DAYS = 5` (data). Slots are Morning (06–12), Afternoon (12–18) and Night (18–24). The ClockBadge
shows "Day 2 · Afternoon" with weather.

**What uses up a slot:** finishing a match; finishing Pool Hop; leaving a location you entered (the confirm says
"Leaving ends the Morning."); leaving the casino at night; Rest in the villa. Talking, gifting, shopping and changing
clothes inside a location don't.

**At night** only the Villa, the Casino and story events are open. The map shows the rest as closed.

**Day start** (seeded from `world`):

- roll moods, form NPC teams, place NPCs by schedule, pick each shop's 2 daily deals, and add any items whose day has
  come (§4.12);
- set the weather from the table: D1 sunny; D2 sunny or cloudy; D3 cloudy morning, rain in the afternoon, clear night;
  D4 sunny; D5 sunny with a golden afternoon (sunset light);
- autosave.

**Day end (sleep)** shows a summary card: money earned and spent, matches, affinity changes (arrows by each portrait),
tomorrow's weather. Then:

- your partner leaves if you lost a match that day and her affinity is below 35;
- affinity drifts `T.affinityDecay` (2) toward its base value for every NPC you didn't talk to;
- NPC pairs "play" each other off-screen for that day's record: one simulated result per pair from skills on the
  `world` rng. The Match Board shows records like "Lola & Tess 3–1".

**Schedules** (weights in §5.4).

- Each NPC has weights over locations for each slot, changed by weather and mood; the `world` rng picks.
- NPC team-mates go together, to the place chosen for the first one.
- Story events override the schedule.
- Guarantee at least one NPC pair at the Beach in every daytime slot.
- Your partner isn't scheduled: she "jogs over" whenever you open the Match Board.

**Moods.**

| Mood | Icon and word |
| --- | --- |
| Happy | ☀ |
| Normal | ◐ |
| Gloomy | ☁ |

Daily roll 35/45/20. One step up if the weather is one she likes; one step down if you beat her yesterday or the
weather is one she dislikes. Mood shifts gift thresholds and invite chances.

### 4.11 Affinity, gifts and team-ups (`30-vacation.js`, `32-location.js`)

**Affinity** is 0–100 between you and each NPC: one symmetric number per pair, shown as 5 hearts in half steps. Start
values come from the table in §5.3.

| Stage | Affinity |
| --- | --- |
| Stranger | 0–19 |
| Acquaintance | 20–39 |
| Friend | 40–59 |
| Good Friend | 60–79 |
| Best Friend | 80–100 |

**Changes.** Positive changes are multiplied by `T.affinityGainMul`.

| Cause | Change |
| --- | --- |
| chat, first of the day | +2 |
| chat, later (once per slot) | +1 |
| gift loved / liked / neutral | +12 / +6 / +2 |
| gift disliked | −6 (and the gift comes back to your bag) |
| your team wins / loses | +6 / −2 (−5 if she is Gloomy) |
| you beat her team | −3 (+1 for good sports: Tess and Rin) |
| event choices | ±4 |
| winning the final, for your partner | +10 |

**Gift acceptance.** score = taste + stage bonus + mood.

- taste: love 3, like 2, neutral 0, dislike −3;
- stage bonus: Friend 1, Good Friend 1, Best Friend 2;
- mood: Happy +1, Normal 0, Gloomy −1.

She accepts if score ≥ `T.giftThreshold` (0). So neutral gifts are accepted unless she is a Gloomy stranger, and
dislikes are refused unless she is a Happy Best Friend. One gift per NPC per slot.

**Reactions:**

| Reaction | Animation and sound |
| --- | --- |
| love | jumps, a burst of hearts, "I love it!"-style line, jingle `gift_love` |
| like | smile and nod |
| neutral | polite nod |
| refuse | folded arms and a head shake (`Reject` or `Idle_FoldArms`), jingle `gift_refuse` |

**Known likes.** The first time you see her reaction to an item, record it in `known[npc][item]`. The Villa journal's
Friends page shows what you've learned as icons.

**Team-up.**

- She accepts if affinity ≥ `T.inviteThreshold` (40), with the threshold −10 if she's Happy and +10 if Gloomy.
- If she's already on an NPC team she needs 20 more. Her old team-mate then goes solo and is sour with you (−4).
- You have one partner at a time. Switching asks first ("Tess will be disappointed…").
- Partner chemistry is her affinity, shown as hearts on the match HUD.

**Swimsuit gifts.** A suit you give must match one of her tastes or she refuses it ("Not really my style"). An accepted
suit becomes her outfit (in matches and around the island), and she keeps it.

### 4.12 Money, shops, wardrobe, inventory (`33-shop.js`)

**Currency:** Sonny Dollars, written S$12,500. You start with S$30,000 (`T.startMoney`).

**Income** (match prizes × `T.prizeMul`):

| Source | Amount |
| --- | --- |
| match win | S$ (12,000 + 3,000·day + 1,000·winning margin) |
| match loss | S$3,000 |
| tutorial | S$10,000 |
| semifinal win | S$30,000 |
| final win | S$100,000 and the "Fortuna Gold" suit |
| Pool Hop | S$ (2,000 + 400·perfects + 150·seconds left) |
| casino | chips cashed out at S$100 each |

**Shops**, all on the Promenade. Each shows its whole stock from §5.2. Items marked "Day N+" arrive on that day and
carry a NEW badge for it. Every day each shop also has **2 daily deals at −25%**, picked by the `world` rng. Prices ×
`T.priceMul`.

| Shop | Keeper | Sells |
| --- | --- | --- |
| **Riptide Sports** | Coach Bo | sporty suits, sports accessories, sports gifts |
| **Coral Couture** | Odette | fashion suits and accessories, fashion gifts |
| **Sundries & Smiles** | Kai | food, goods and books gifts, the luchador mask |

**The shop screen.**

- Category tabs; a 3×2 card grid; a detail panel.
- For suits and accessories, a **live rig of your fighter wearing the focused item** turns on a pedestal (right stick,
  L1/R1 or a mouse drag). □ "Try on" switches between the item and your current outfit.
- ✕ buys. A confirm appears when the price is over 30% of your money.
- Badges show OWNED and WEARING. Items you can't afford are dimmed with the shortfall shown.
- The keeper's portrait says a short quip, with voice.

**Wardrobe** (the Villa closet, and the changing hut at the Beach and Pool): the suits and accessories you own; ✕
equip, □ remove an accessory, the same rotating preview. A second page shows your partner and the suits she has
accepted.

**Gift Bag:** counts per gift, sorted by category, at most 9 of each. Opened from talk menus, or with □ on the map or in
a location to browse.

### 4.13 Island map (`31-map.js`)

**The map:** an iso view of Isla Fortuna, a TileMap of about 48×36 tiles.

- Sea all round (`outside` set to the sea color, animated water floor at the edges); beaches, grass, palm groves.
- A dormant volcano: stepped rock walls, 3 levels, with steam wisps.
- The lagoon pool, the courts, the Promenade, a row of villas, the casino (neon at night), the Dock with Sonny's
  seaplane, a lighthouse.

**Pins:** Sunset Courts, Lagoon Pool, Fortuna Promenade, Your Villa, Casino Fortuna (night only), and the Dock (shown
greyed: "Departures only").

**Controls.**

- The stick or d-pad jumps the cursor to the nearest pin in that direction; L1/R1 cycle pins; mouse hover highlights
  (`r.pick`).
- ✕ or a click opens the **location card**: name, a small picture, who's there (portraits with mood icons, NPC pairs
  marked), activities, open or closed. ✕ again travels, with an `iris` transition at the pin.
- □ opens Friends (affinity overview), △ the Journal (save, stats), Options pauses.

**The header** shows the ClockBadge, the MoneyBadge and the partner card.

**Sky and weather:** a morning pastel sky, a bright afternoon, a night of stars, lit windows and neon; weather
particles.

### 4.14 Walkable locations (`32-location.js`)

**One scene, driven by data per location** (§5.4): a TileMap in `threequarter`, the outside color or a backdrop,
shapes (`map.solid` for collision), NPC spots, interactables, music and ambience, exits.

- **You:** an `E.Body` (r 5) moving at 70 units/s walking and 110 running, with the camera on you
  (`game.follow(hero, { z: 16 })`, `cam.bounds`). Lights and GPU lighting come on at night.
- **NPCs present** (from the schedule) sit at spots doing idle activities and turn their heads toward you within 40
  units.
- **Talk.** Interact within 22 units opens the talk panel: her portrait, mood, hearts, and a vertical list.

| Choice | Notes |
| --- | --- |
| **Chat** | |
| **Give a Gift** | |
| **Team Up** | if she isn't your partner; for your partner: "Our next match?", which opens the Match Board |
| **Challenge** | beach only, when she's in a pair |
| **Bye** | |

- **Interactables:**

| Place | Interactables |
| --- | --- |
| Beach | Match Board (challengeable pairs with difficulty stars and records, your partner, Play), changing hut (Wardrobe) |
| Pool | Pool Hop start deck, changing hut (Wardrobe) |
| Promenade | the three shop doors |
| Villa | bed (Rest / Sleep), closet (Wardrobe), desk (Journal), album frame, mailbox (letters) |
| Casino floor (its own scene, §4.16) | cashier, slot machines, blackjack table, roulette table, prize counter, VIP lounge (events) |

- **Leaving:** walk to the exit, or press `leave` (△ / M / Tab), then confirm "Leave? This ends the Afternoon." Back on
  the map, it is the next slot.

### 4.15 Pool Hop (`40-poolhop.js`)

**Goal:** cross the lagoon on 32 floating pads in `T.poolTime` (40 s). Each pad shows the glyph of one of the four face
buttons for the current device (✕○□△, A B X Y, or J L K I keycaps). Press it as the hopper lands, on the beat.

**Rhythm.**

- The song `lagoon` runs at `T.poolBpm` (112) with `sync: true`. One hop per beat, judged against the music clock
  (`audio.pos`).
- PERFECT is within 60 ms and GOOD within 130 ms (× `T.poolWindowMul`).
- Too early, too late or the wrong button: she slips, splashes, swims back (1.8 s), and continues from the same pad on
  the next bar.
- Each run of 8 PERFECT hops in a row adds +1 s.

**Twists:**

- from pad 12, **wobble pads**: the glyph flips between two buttons and settles one beat before you need it;
- from pad 22, **double pads**: two glyphs; press both together.

**Score and reward.** Time, perfects and falls give the prize (§4.12). Your best time is saved. Characters at the pool
cheer, and a present partner gains +2 affinity when you clear it.

**Camera and effects:** the Broadcast angle follows the hopper; pads bob to the beat; splashes; water shimmer.

The attract mode runs Pool Hop with a perfect bot.

### 4.16 Casino Fortuna (`41-casino.js`, nights only)

**The floor** is a `threequarter` map with neon, chandeliers and lights, and a crowd. Stations:

- **Cashier:** chips at S$100 each; buy in steps of 10, 50 or 100; cash out any time. The chip count shows on every
  casino screen.
- **6 slot machines.**
- **Blackjack table**, dealer Pepper.
- **Roulette table**, croupier Kai.
- **Sonny's VIP lounge**, for story events.

On the first night Sonny hands you 20 free chips and explains the games. A prize counter swaps 300 chips for the
"Jackpot" suit.

**Fortuna Sevens (pachislot).**

- 3 reels with 3 visible rows. Bet 1, 2 or 3 chips: 1 = the centre line, 2 = plus the top and bottom lines, 3 = plus
  both diagonals.
- ✕ / Space spins. Then ✕ ○ □ (J K L) stop reels 1, 2 and 3. A stop "slips" 0–4 symbols on the `casino` rng, so
  timing matters a little.
- Strips of 21 stops per reel. Payouts per line bet:

| Line | Pays |
| --- | --- |
| 7-7-7 | ×100, with a jackpot fanfare and coin shower |
| BAR-BAR-BAR | ×30 |
| Sonny-Sonny-Sonny | ×20 (Sonny is wild) |
| Volleyball ×3 | ×12 |
| Palm ×3 | ×8 |
| Coconut ×3 | ×5 |
| Cherry, by count on the line | 1 ×2, 2 ×5, 3 ×10 |

- Tune the strips so the RTP is **92% ± 3** at `T.slotsPayMul` 1 (a simulation test checks it).
- Spinning reels show blur rows, then a stop clunk and a line highlight.

**Blackjack.**

- 6-deck shoe, reshuffled at 75%. The dealer stands on soft 17 (`T.dealerHitsSoft17` toggles it). Blackjack pays 3:2.
  Double on any first two cards. Split once; split aces get one card each. No insurance, no surrender.
- Bets of 1, 5, 10 or 25 chips (a stepper).
- Controls: ✕/H hit, □/S stand, △/D double, R1/P split (only when legal), ○ leave between hands. Every button is also
  clickable on screen. The betting phase (left/right sets the bet) and the playing phase each read only their own
  actions, so S and D never clash with WASD.
- Cards are pixel sprites (rank glyphs and suit sprites ♠ ♥ ♦ ♣ made with `E.sprite`), dealt with tweens and flipped.
  Pepper has deadpan lines for a blackjack and a bust.

**Roulette.**

- A single-zero wheel in real order: 0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16,
  33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26.
- **Betting layout:** a cursor moved with the stick, WASD or the mouse.

| Bet | Pays |
| --- | --- |
| straight number | 35:1 |
| red/black, odd/even, 1–18/19–36 | 1:1 |
| dozens, columns | 2:1 |

- Controls: ✕ place a chip (L1/R1 sizes 1/5/10/25), □ remove, △ spin, ○ leave.
- An inset wheel shows the pocket ring turning while the ball spirals in, slows, bounces two pockets and settles. Then
  the result is highlighted, payouts made, and a strip shows the last 10 results.
- The dev-only toggle `T.rouletteDoubleZero` gives an American wheel.

Leaving the casino ends the night and goes to the day-end card.

### 4.17 Postcards (photo mode) and album (`42-photo.js`)

**Where:** the pause menu's "Take a Postcard", or Create / C in walkable locations and on match results. Never in hub
sessions or the attract. Gameplay time freezes (`timeScale` 0), while cosmetic motion (water, breathing idles) keeps
going.

**Controls:**

| Input | Does |
| --- | --- |
| left stick / WASD | pan the focus |
| right stick / right-drag | orbit at any angle (`game.rotateView`) |
| L2/R2 / wheel | zoom .75–2.5 |
| ✕ | take the photo |
| ○ | exit |
| □ | choose the subject: you, or any NPC present |
| △ | the panel |
| R3 / H | hide the UI |

The △ panel has:

- **pose:** Wave, Peace, Hips, Cheer, Stretch, Look Back, Sit, Victory, Salute, Bow;
- **expression:** smile, shout, wince, neutral;
- **filter:** Clean, Sunny, Sepia, Retro, Night Glow;
- **frame:** none, or a postcard border with a "Greetings from Isla Fortuna" stamp and the date.

**Taking a photo.** The shutter sound and a white flash, then a "developing" postcard slides to a corner. It is saved
in `state.album` (at most 24; asks before replacing the oldest) as a **spec**, never pixels:
`{ loc, day, slot, tod, weather, cam: { x, y, z, yaw, zoom, view }, people: [{ id, suit, acc, pose, expr, x, y, facing
}], filter, frame }`.

**The album** (Villa, or the menu for the latest save):

- A 4×2 grid of live thumbnails: each spec is re-rendered at half size.
- Opening one re-renders it full screen, live, so the palms still sway.
- □ deletes (with a confirm); △ "Set as title backdrop"; R1 exports a PNG download (not in sessions).

The credits slideshow re-renders the album, plus a group photo taken automatically at the party.

### 4.18 Story, dialogue, voices, cutscenes (`34-story.js`)

- `E.Story` holds `people` for every speaker (portrait = their rig) and the nodes from `05-data-text.js`. Its `on`
  events run game actions: `startMatch`, `giveMoney`, `giveItem`, `setPartner`, `openShop`, `photo`, `fade`.
  `story.state()` goes in the save.
- **The dialog box:** bottom, 2 lines, the name tag in the speaker's color, a portrait with expression
  (`portraitOpts`), markup for emphasis (`{c=#ffd36a}…{/c}`, `{wave}`, `{shake}`). The Animalese voice runs from the
  per-letter hook (patch 3). Text speed is a setting. Hold ○ or right click to fast-forward; Options on a cutscene asks
  "Skip scene?".
- **Cutscenes** are `game.script` generators: camera tweens, walk-ons (`game.tween` on bodies), emotes
  (`story.emote(target, 'heart' | '!' | '?' | 'note' | 'dots')`), fades. The list is in §5.5.

### 4.19 Save and load (`30-vacation.js`)

**Slots:** `game.saves` (3 slots plus autosave). The title's Load and the Villa journal's Save open `saves.show('load'
| 'save')`. The game autosaves at every slot start; Continue loads `saves.latest()`.

- `saves.write = () => ({ data: G.state, place: locationName, level: 'Day ' + day })`;
- `read = save => G.loadState(save.data)`, with `version: 1` and a `migrate`.

**State shape:**

```js
{ v: 1, seed, day: 1, slot: 0, weather: ['sunny', …], me: 'rin', money: 30000, chips: 0,
  wardrobe: { suits: ['seigaiha'], acc: ['ribbon'] }, wearing: { suit: 'seigaiha', acc: ['ribbon'] },
  npcWear: { lola: { suit: 'estrella', acc: ['sweatband'] }, … }, bag: { mango_smoothie: 1 },
  affinity: { lola: 20, … }, mood: { lola: 'happy', … }, known: { lola: { hot_sauce: 'love' } },
  partner: null, teams: [['lola', 'tess'], ['amara', 'mei']], record: { 'lola+tess': [0, 0] },
  flags: {}, story: {}, chatted: {}, gifted: {}, album: [], titlePostcard: null,
  stats: { matches: 0, wins: 0, points: 0, kills: 0, aces: 0, blocks: 0, poolBest: null, casinoNet: 0, gifts: 0,
           photos: 0, earned: 0, spent: 0 } }
```

**New Vacation+** (after an ending) keeps the wardrobe, album and lifetime stats. It resets the days and affinity (to
base +10) and starts money at S$30,000 plus 10% of your final money.

**Unlocks** for Beach Match (suits ever owned; everything after the first ending) live in `E.store('aoa-unlocks')`.

### 4.20 Front end: boot, title, menu, How to Play, About (`50-title.js`)

**Boot.** Boot steps build the rigs, maps, music and caches behind the engine's boot screen, with messages: "Raking the
sand", "Inflating volleyballs", "Chilling the smoothies", "Counting Sonny's chips", "Polishing the golden sunglasses".

**Title.**

- A sunset beach backdrop: sea layers, the sun, distant islands, palms, gentle waves.
- The six fighters stand on the sand in their signature suits, each with her own idle: Rin stretching, Lola flexing,
  Ingrid fanning herself, Amara dancing, Tess juggling a ball, Mei waving. Now and then Sonny jogs across the background
  with a giant trophy.
- The logo **AHEAD OR ALIVE**: `E.font.title` scale 4, colors `['#fff7d6', '#ffd36a', '#ff9e5e', '#ff5f7a']`, depth 3,
  with a small spinning volleyball beside it. Under it **XTREME BEACH VOLLEYBALL** at scale 2, white with a teal shadow.
- A blinking "PRESS ✕" in the current device's glyph.
- A footer with the version label (`E.versionLabel()`) and "An original parody-tribute game".
- If a postcard is set as the title backdrop, it renders behind the logo instead.

**Main menu.** A big list on the left; a turning fighter preview on the right.

- **New Vacation**
- **Continue** (if a save exists)
- **Load**
- **Beach Match**
- **Album** (if there are postcards)
- **How to Play**
- **Settings** (`game.menu('settings')`)
- **About & Credits**

10 s idle starts the attract mode.

**How to Play.** 10 pages, one idea each, with a live mini-scene in the panel and the current device's glyphs:

1. Moving and the ring
2. The touch chain: bump, set, spike
3. Aiming and shots
4. Serving
5. Blocking and diving
6. Calls and chemistry
7. The vacation: slots, map, money
8. Friends and gifts
9. Casino and Pool Hop
10. Postcards

**About & Credits.** Pages turned with L1/R1, left/right or the on-screen arrows; the stick scrolls; large text, one
field per line. Contents in §10:

1. Credits
2. Source Information
3. Testing Feedback
4. Engine Feedback
5. Prompt Feedback

### 4.21 Attract mode (`51-attract.js`)

**Trigger.** 10.0 s without input on `title` or `menu`. Input means any key, a pad button, a stick past its dead zone,
the mouse moving more than 4 px, a click, the wheel, or a touch; each resets the timer.

**Playlist.** A director kept alive across scenes (`game.script(…, { keep: true })` plus the overlay watcher) plays it,
re-seeded each cycle for variety. Demo scenes run on a throwaway demo state, never the player's save.

1. **Match, about 50 s.** AI vs AI on Sunset Courts with random fighters, outfits and time of day: `spectacle` AI, the
   camera cutting between Broadcast and Serve Cam every 2 points, commentary and highlight replays on.
2. **Vacation montage, about 50 s.** 7 beats of 6–8 s, each with a big caption banner:

| Caption | Shows |
| --- | --- |
| FIVE DAYS IN PARADISE | the island map flying from morning to night |
| MAKE FRIENDS · GIVE GIFTS | a gift scene with hearts |
| COLLECT 21 SWIMSUITS | the shop preview cycling suits |
| POOL HOP | a perfect-bot run |
| CASINO NIGHTS | slots hitting 7-7-7, then a blackjack |
| SNAP POSTCARDS | a photo-mode orbit |
| BEAT THE HOUSE | a slice of the final against Sonny & Pepper, with the Golden Glare |

3. **Title card, 5 s**, with "PRESS ✕". Then repeat.

**Rules.**

- The AI may cheat freely: perfect timing, scripted outcomes, instant travel.
- **Any input** returns to `title` with the input consumed, so it doesn't also press a menu item, and the title music
  resumes.
- A "DEMO" tag shows top left. On touch-only devices the bottom banner reads "Controller or keyboard required".
- Sound starts only after the browser's first gesture (engine rule), so before that the attract runs silent.

### 4.22 Dev mode (`53-dev.js`)

**Reach.** The pause menu's **Dev Mode**, in every pausable scene. Once opened, F1 (or L3+R3 on a pad) reopens it for
the rest of the session. Never in hub sessions.

**While it is open:**

- gameplay time is frozen (`game.timeScale = 0`; the overlay updates on real time);
- the panel is a 10-foot canvas overlay built with the UI kit;
- tabs (L1/R1, Q/E or a click): **Tools · Match · Vacation · Minigames · Presentation · Tuning**;
- **Back to game** restores `timeScale`.

**4.22.1 Tools** (every button calls `game.debug.tools.*`).

| Tab | Tools |
| --- | --- |
| Tools | jump to any scene, location or minigame; set the day (1–5) and slot; jump to the Semifinal, the Final, the party or ending, the credits; restart the scene; reset the save (with a confirm) |
| Match | start a match against any pair; force a point left or right; set the score; end the match (win/lose); CPU controls your player (watch); Perfect Player (all your presses PERFECT); the debug overlay (trajectory line, landing point, every player's P* ring, AI assignment and state labels, a judge-window bar); slow motion ×.25 / ×.5 / ×1; frame step (one step per press while frozen); switch camera |
| Vacation | money +10k / +100k / set to 0; chips +100; unlock all items; fill the gift bag ×3; set affinity per fighter (a slider 0–100); set mood; make or clear partner; reveal all likes |
| Minigames | Pool Hop autopilot; slots: force 7-7-7 next; blackjack: deal a blackjack; roulette: force a number |
| Presentation | time-of-day override (0–24 h); weather (sunny/cloudy/rain); show FPS (engine setting); **Voice Lab** (pick a speaker and a preset phrase, play it); music jukebox; SFX board; rig sheet viewer (fighter × suit × pose × view) |

**4.22.2 Live sliders** (the Tuning tab).

- Changes apply at once: every system reads `G.T` every step.
- Each slider shows its default as a tick. △ or R on a slider resets it.
- **Reset all to defaults** asks to confirm.
- Values persist in `E.store('aoa-dev-tuning')`, and **Copy JSON** copies them to the clipboard.

| Group | Key | Default | Range | Step |
| --- | --- | --- | --- | --- |
| Ball | `ballGravity` | 330 | 180–500 | 5 |
| Ball | `ballDrag` | .12 | 0–.6 | .01 |
| Ball | `passT` | 1.05 | .7–1.6 | .05 |
| Ball | `setT` | 1.1 | .7–1.6 | .05 |
| Ball | `serveT` | 1.3 | .9–1.8 | .05 |
| Ball | `jumpServeT` | .85 | .6–1.3 | .05 |
| Ball | `spikeSpeed` | 330 | 220–480 | 5 |
| Ball | `shotT` | .95 | .6–1.4 | .05 |
| Ball | `netCordOver` | .45 | 0–1 | .05 |
| Timing | `perfectWin` (s) | .05 | .02–.12 | .005 |
| Timing | `greatWin` (s) | .10 | .05–.2 | .005 |
| Timing | `okWin` (s) | .16 | .08–.3 | .01 |
| Timing | `reach` | 14 | 8–24 | 1 |
| Timing | `diveReach` | 16 | 6–30 | 1 |
| Timing | `blockRise` (s) | .28 | .15–.45 | .01 |
| Players | `runSpeed` | 96 | 60–140 | 2 |
| Players | `autoMove` | .85 | 0–1 | .05 |
| AI | `aiSkillMul` (× the day's base) | 1 | .3–1.6 | .02 |
| AI | `aiReaction` (s) | .25 | 0–.6 | .01 |
| AI | `aiSpeedMul` | 1 | .6–1.4 | .02 |
| AI | `chemistry` | .3 | 0–.6 | .02 |
| Match | `pointsToWin` (vacation) | 7 | 3–21 | 1 |
| Economy | `prizeMul` | 1 | 0–3 | .05 |
| Economy | `priceMul` | 1 | .25–3 | .05 |
| Economy | `startMoney` | 30000 | 0–200000 | 5000 |
| Social | `affinityGainMul` | 1 | 0–3 | .05 |
| Social | `affinityDecay` | 2 | 0–10 | 1 |
| Social | `inviteThreshold` | 40 | 0–100 | 1 |
| Social | `giftThreshold` | 0 | −3–3 | 1 |
| Pool Hop | `poolBpm` | 112 | 80–150 | 2 |
| Pool Hop | `poolWindowMul` | 1 | .5–2 | .05 |
| Pool Hop | `poolTime` (s) | 40 | 20–80 | 1 |
| Casino | `slotsPayMul` | 1 | .5–1.5 | .01 |
| Casino | `dealerHitsSoft17` | off | toggle | — |
| Casino | `rouletteDoubleZero` | off | toggle | — |
| Presentation | `textSpeed` (letters/s) | 45 | 10–200 | 5 |
| Presentation | `cameraZoomMul` | 1 | .7–1.3 | .02 |

### 4.23 AI Hub sessions (`25-netplay.js`)

**Head tags** in the deliverable. Keep the goal ≤ 60 characters and the howto ≤ 80.

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Win the beach volleyball match: first to 7, by 2">
<meta name="hub:session-howto" content="Stick/WASD move · Cross/Space hit on time · Circle/Shift dive · Square/E shot">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
```

**Flow when `AIHub.active` is true.**

1. **Build the game for a session:** `menu: false` (no pause), `autoPause: false`, `corner: false`,
   `fullscreen: false`, no saves, touch `'never'`, no title and no attract.
2. **Connect.** Boot straight into the `hub` scene, which calls
   `const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true })`. If it returns `null`, go to
   `title` and run normally.
3. **Teams.** Left = seat indexes 0 and 2; Right = 1 and 3. Empty slots are CPUs (Normal).
   - Fighters: shuffle the six with `AIHub.rng('cast')`; everyone wears signature suits.
   - Court time: `AIHub.rng('court')`.
   - Each human's fighter gets a ground ring and a name tag in her seat color (`#e8443a`, `#3b82f6`, `#22c55e`,
     `#f5b700`). Names are drawn with `E.font` on the canvas, never inserted as HTML.
4. **Our own card**, until `start`:
   - Shows: the court at sunset with the four fighters lined up (CPUs tagged), the logo, the goal line, this player's
     controls in her device's glyphs, every player's name in her color with a READY tick (from `card.ready`), and the
     countdown from `card.left` ("Paused: more time" while `paused`).
   - Two buttons: **READY** (✕ / Enter / click) → `AIHub.answer('ready')`; **MORE TIME** (△ / T / click) →
     `AIHub.answer('more')`, which toggles.
   - Nothing else to choose. Call `AIHub.ready()` as soon as the card is built, with no key press.
   - The server copy (`AIHub.server`) builds the world, calls `ready()`, and draws a minimal "Hosting" screen.
5. **Start.** On `start`, the intro walk-on plays. Play begins when `AIHub.time() >= 0`, with a 3-2-1 countdown from the
   negative clock.
6. **Messages.** All are small JSON with short keys.

| Msg | Direction | Rate | Reliable | Content |
| --- | --- | --- | --- | --- |
| `m` | client → host | 12/s while playing (also as a heartbeat) | no | `{ t: 'm', at, x, y, f, a }`: own fighter's position, facing, action |
| `c` | client → host | per judged press | yes | `{ t: 'c', at, k, q, aim: [x, y], sh }`: a touch claim; `at` = hub ms of contact, `k` kind, `q` quality, `sh` shot or play |
| `v` | client → host | when serving | yes | `{ t: 'v', at, q, aim, jump }`: a serve claim |
| `s` | host → all | 12/s | no | `{ t: 's', at, p: [[id, x, y, f, a, u], …], sc: [l, r], ph, sv, tc }` |
| `b` | host → all | each launch | yes | `{ t: 'b', t0, p, v, k, g, ay, wob, by, kind }` |
| `e` | host → all | per point, fault or phase | yes | `{ t: 'e', ev, side, why, sc, next }` |
| final `s` | host → all | once | yes | the last snapshot with `over: 1` |

   The budget: the host sends ≤ 16 messages/s and each client ≤ 14, under the hub's 20/s. Unreliable messages stay
   under 1,200 bytes.
7. **Authority.**
   - The host runs the rules and the AI, and accepts claims.
   - Each client moves its own fighter at once and sends it at 12 Hz. The host clamps reports to max speed and the court.
   - Each client judges its own touches against the shared ball. Every copy computes the same trajectory from `b` on the
     shared clock, so the timing is fair whatever the latency.
   - The host validates a claim: contact time within the planned window ±.12 s; the claimant within reach + 12 of the
     ball at that time; the touch still open; the first valid claim wins. It then broadcasts the new launch with
     `t0 = claim.at`, so every copy continues from the same instant; clients ease the visual jump over .12 s.
   - Before awarding a point, the host waits for remote claims until `tLand + .25 s`.
8. **Others' fighters.** Clients interpolate other fighters from snapshots with a 100 ms buffer. A client's own fighter
   is never overwritten.
9. **Reporting** (only the host calls `finish()`):
   - Match over: `AIHub.finish({ standings: [[winner ids…], [loser ids…]], scores: { id: teamScore }, stats: { id: {
     Points, Kills } }, awards: [{ id, title: 'MVP', detail }] })`.
   - With one human against CPUs: `standings: [[me]]` and `won: true | false`.
   - On `time-up`: finish at once with the current score, the team ahead first. If tied, everyone goes in one array.
10. **Leaving.** On `leave`, that seat becomes a CPU and its fighter plays on. If the host leaves, `end` arrives with
    `host-left`: show "Round cancelled" and stop.
11. **End.** On `end`: stop input and sound (music off, mute the buses), freeze the simulation, and draw the final
    standings with names. Send nothing more.
12. **Session rules.** No pause, quit or title; no dialogs, alerts or new windows; nothing relies on storage; no network
    but `AIHub.send`. Options is ignored while Create is held (patch 6).
13. **Outside a session** nothing changes: the client is inert when `!AIHub.active`.

### 4.24 Audio (`12-audio.js`, `06-data-music.js`)

**4.24.1 Music.** The engine's step sequencer plus the instrument patch (patch 4).

**Instruments:**

| Instrument | Built from |
| --- | --- |
| `steel` | partials 1, 2, 3, 4.2 at amps 1, .5, .35, .2; decay .5 s |
| `marimba` | partials 1, 4, 9.9 at amps 1, .3, .05; decay .35 s |
| `pluck` | saw through lowpass 1800; decay .25 s (ukulele and guitar) |
| `bell` | partials 1, 2.76, 5.4, 8.9; decay 1.2 s |
| `organ` | partials 1, 2, 3, 4; held |
| `pad` | saw + detune 8 cents, lowpass 1200; held |

Plus the engine's square, pulse, triangle, saw and sine waves, and drums.

**Tracks.** Original compositions. Each loops cleanly over 16–32 bars, with named layers so drums can drop in and out.

| id | Where | Tempo, key | Feel and instruments | Chords |
| --- | --- | --- | --- | --- |
| `sunrise` | title, menu | 116, C | bright tropical pop: steel lead, marimba arpeggios, pluck chords, bass, light drums | C G Am F; bridge Dm G |
| `island` | map, Promenade | 100, F | breezy: ukulele pluck, marimba melody, shaker hats | F Bb C F; Dm Gm C |
| `spike` | matches | 138, Am | driving synth-pop: square lead, saw bass; drum layer `rally` comes in on long rallies; +6 bpm at match point | Am F C G |
| `house` | the final | 150, Dm | campy-dramatic: organ stabs, brassy pulse lead, tom rolls, a cheesy key change up a step in the last 8 bars | Dm Bb C A |
| `lagoon` | pool, Pool Hop | 112, G | bossa-nova: pluck comping, soft steel lead, rim clicks on the quarter notes (the hop beat) | G Em Am D |
| `boutique` | shops, wardrobe | 108, Bb | cute shopping funk: bell arpeggios, popping bass | Bb Gm Eb F |
| `neon` | casino | 96, Em | lounge funk: organ, muted bass, swung hats, bell sparkles on wins | Em A vamp; C B7 turnaround |
| `siesta` | villa, night map | 80, D | gentle pad and marimba lullaby, with a cricket ambience | D Bm G A |
| `farewell` | party, endings, credits | 124, C → D | anthemic: steel and square in harmony, full drums, firework hits | C G Am F, then the key change to D |

**Jingles** (`audio.sting`): `win` (3 s), `lose`, `ace`, `matchpoint`, `gift_love`, `gift_refuse`, `jackpot`,
`daystart` (a bright chime), `levelup` (an affinity stage up), `photo`.

**Ambience loops** (noise on the sfx bus): waves (lowpass swells on a 6 s period), wind, crowd murmur, lapping pool
water, casino murmur with distant slot jingles, night crickets (pulse chirps). Rain is the engine weather's sound.

**4.24.2 Sound effects** (`audio.define`). Leave about 6 dB of headroom and balance them by ear.

| Group | Effects |
| --- | --- |
| Ball | `bump` (soft sine thump 160→90 Hz plus noise), `set` (short tap, 400 Hz), `spike` (noise crack plus sine 120→40, louder with speed), `block` (two-hand slap), `serveToss` (whoosh), `serveHit`, `sand` (lowpass noise 600→150), `net` (rattle: 3 noise ticks), `tape` (tick and wobble), `whistle` (square 2200 Hz with vibrato) |
| Crowd and court | `crowdCheer` (1.4 s noise swell), `crowdGroan` (noise down-sweep), `ooh`, `step_sand`, `dive` (slide noise), `high_five` (clap), `glare` (shimmer bell), `seagull` (sine squeak glides) |
| Pool | `splash`, `hopLand` (plop) |
| UI | `ui_tick`, `ui_select`, `ui_back`, `ui_error`, `ui_tab` |
| Casino | `cash` (coin arpeggio), `chip` (click), `card_deal`, `card_flip`, `reel_spin` (a looped tick), `reel_stop` (clunk), `wheel_spin`, `ball_rattle` |
| Story and misc | `gift_unwrap` (paper noise plus chime), `heart_up` and `heart_down` (arpeggios), `shutter`, `flash`, `firework` (boom and crackle), `door` |

**4.24.3 Animalese voices** (`G.voice`). Synthesized letter by letter on the voice bus.

- **Speaker profile:** `{ base: Hz, range: semitones, rate: letters/s, formant: × shift, wave: 'saw' | 'pulse' |
  'triangle', breath: 0..1, vib: Hz }`. The values are in §5.1.
- **Letters to sounds:**

| Letter class | Sound |
| --- | --- |
| vowels a e i o u y | a 70 ms voiced tone at pitch p through two bandpass "formants" × the formant shift (Q 6): a 800/1200, e 450/1900, i 300/2300, o 500/900, u 350/750 |
| plosives b d g k p t | a 12 ms noise burst, then a 40 ms schwa (500/1500) |
| fricatives f h s z c x | 45 ms of high-passed noise |
| nasals and liquids l m n r w j v | 50 ms of triangle at p, lowpass 900 |
| pauses | comma 120 ms, period 220 ms; digits and other marks silent |

- **Pitch:** each letter is `base × 2^(range·n/12)`, where n follows a gentle random walk on the `cosmetic` rng seeded
  by the line's hash, so a line always sounds the same.
- **Contours:** questions rise over the last 4 letters; exclamations go up 3 semitones and × 1.15 rate; ellipses slow
  to × .7.
- **Emotion** from the line's `mood`: happy +2 semitones and bouncier; angry −1, × 1.2 rate, pulse wave; sad −2,
  × .8 rate, falling.
- **Two ways in:** the dialog's per-letter hook (patch 3), at typing speed, keeps speech and text together.
  `voice.say(text, who, mood)` plays barks without a box: calls ("MINE!"), cheers, laughs ("hahaha" as three rising
  /a/ blips), gasps.
- The Voices slider sets the volume; mute is respected; headless it does nothing.

### 4.25 Art direction and assets

**4.25.1 Look.** The engine's native PS1-era pixel art, following every step of API.md's Look target: `ps1` with
expand, HD Humanoids at size 1.15–1.4, dressed characters in real palettes, backdrops, textured floors, 3–8 props a
screen, effects on every hit, `E.tones` shading, title fonts, lights and portraits.

**Palette:**

| Group | Colors |
| --- | --- |
| sea | `#0b5a7a` → `#2ec4c9` → `#9ff3e8` |
| sand | `#f3d9a4`, `#e2c088`; wet `#c9a06a` |
| foliage | `#2f8f4e`, `#5fc35a` |
| sunset | `#ff9e5e`, `#ff5f7a`, `#6a3fa0` |
| night | `#14163a`; neon `#ff5fa2`, `#5ff0ff` |
| gold accents | `#ffd36a` |

**Light by time of day:**

| Time | Light |
| --- | --- |
| morning | ambient .9, slightly cool |
| afternoon | ambient 1.0, warm |
| Day 5 afternoon | sunset tint |
| night | ambient .38; torches, lamps, neon and floodlights as `game.lights` |

Locations at night also try `game.enableGPU({ map })` (it falls back to canvas lighting by itself).

**4.25.2 Characters.**

**The `athletic` build:** `{ legUpper: 7.1, legLower: 7.2, hipZ: 13.9, torso: 8.9, shoulderHalf: 2.95, headR: 3.0,
neck: 1.4, armUpper: 5.1, armLower: 4.9, hipHalf: 2.05, limbW: 1.75, torsoW: 2.7, stride: 7.4, speedRef: 80 }`.

- Faces use `face: { eyes: 'big', bangs: .5 }`.
- Arms are bare (`sleeves: 'none'`) unless the suit has sleeves. Legs are skin color. Feet are bare or in sandals.

**Swimsuits** (`outfit: 'swim'`):

| cut | torso | hips and thighs | arms |
| --- | --- | --- | --- |
| `onepiece` | main color over the whole torso plate, a scoop neckline (a skin wedge at the front top), straps | a brief band (top 15% of the thigh) | bare |
| `racer` | onepiece plus accent side panels and racer-back straps | brief | bare |
| `halter` | onepiece with a halter strap to the neck (trim) | brief | bare |
| `sport2` | a crop top from the shoulders to 55% of the torso; skin midriff from 55% to 88%; the bottom band from 88% | shorts to 35% of the thigh, or a brief with `brief: true` | bare |
| `tankini` | a top to 80% of the torso | shorts to 30% of the thigh | bare |
| `rash` | a rash guard: whole torso plus sleeves (short or long) in main, with a zip line (trim) | board shorts to 45% of the thigh, in accent | sleeves |
| `sarong` | onepiece | a wrap skirt (the engine's tunic slab) in accent, knotted at the hip | bare |

**Patterns.** Drawn per pixel inside the filled torso and shorts polygons, with 1-px features so they read on a 50-px
character.

| Pattern | Look |
| --- | --- |
| `solid` | plain |
| `stripes` | horizontal accent rows every 2 px |
| `pin` | thin vertical lines |
| `dots` | a 2-px offset grid |
| `waves` | scallops |
| `stars` | 3-px stars |
| `floral` | 3-px flowers in accent and trim |
| `palms` | leaf strokes |
| `check` | 2-px gingham with a blended cross |
| `gradient` | 3 bands from main to accent |
| `geo` | zigzag |
| `scales` | small arcs |
| `sevens` | tiny 7s |
| `lame` | gold sparkle dither with an animated glint |

**Hair and hats:**

| Style | Shape |
| --- | --- |
| `twinbuns` | two balls (.55 headR) on the top sides, plus short tails |
| `bun` | one ball at the back top |
| `braid` | a simulated chain like `long`, with alternating segment widths and a tie |
| `bob` | a cap down to the jaw, with side bangs |
| `puff` | a big ball (1.1 headR) at the back top, with a hairband in trim |
| `curly` | a bob with a bumpy dithered outline |
| `sunhat` (hat) | a wide brim ellipse with a band |
| `visor` (hat) | a cap with no crown |

**Accessories** draw through `extras` (§5.2.2 lists them).

**Rig sheet.** `tools/rigsheet.mjs` renders every fighter in every suit, at 4 facings, in the court, servecam,
threequarter and iso views, at 2×, into `test-output/rigsheet/`. Screenshots are the check for art.

**4.25.3 Environment assets.** `E.SHAPES` written per `docs/ASSETS.md` and checked with `node tools/asset-sheet.mjs`:

| Group | Shapes |
| --- | --- |
| Beach | `umbrella` (params color, stripes: pole and an 8-segment canopy), `lounger`, `beachtowel`, `cooler`, `sandcastle`, `surfboard` (params color), `surfrack`, `lifeguard` (tower), `bleacher` (3 tiers), `scoreboard` (flip cards; params left, right), `djbooth` (speakers and a gold disc), `netpost` (with antenna), `tikibar` (thatch hut, counter, stools), `changinghut` |
| Pool | `cabana`, `poolfloat` (round pad; params color), `flamingo` (inflatable), `pooledge` (tiled coping), `deckchair` |
| Casino | `slotmachine` (params color), `bjtable` (half-moon felt), `roulettetable` (with the wheel bowl), `cashier` (a cage), `neonsign` (glow material), `velvetrope` |
| Promenade | `shopfront` (facade with an awning; params color and sign), `icecreamcart`, `bench`, `planter` |
| Villa | `bed`, `wardrobe`, `desk`, `mailbox`, `rug` |
| Island | `seaplane`, `dockplanks`, `lighthouse` |

- **Engine props:** `torch` (tiki torches, `light: true`), `lamp`, `palm`, `flowers`, `rock`, `chandelier`, `sign`.
- **Store:** cut `kenney-pirate:palm-detailed-straight`, `kenney-pirate:boat-row-large` and `kenney-holiday:present-a-cube`
  with `tools/asset-set.mjs`, then load them with `E.addAssets`.
- Shop windows show posed rigs, not mannequin shapes.

**Materials:** `sand` (tuned), `wetsand`, `pooltile` (tiles, aqua), sea and pool `water` with a shimmer floor tag,
`boardwalk` (bleached planks), `felt` (green), `carpet` (casino diamonds), `gold`.

**Backdrops** (`E.Backdrop`, custom per time of day): a sky gradient, the sun or moon, clouds, distant teal islands
(`mountains` layer), the volcano's silhouette, and a `sea` layer with glints. At night: stars, the moon, and a lit
yacht.

**Effects:** sand puffs, splashes (blue bits and a ring), sparkles on PERFECT, hearts (gifts and affinity), confetti
(wins), fireworks (the party), a coin shower (jackpot), sweat drops (Ingrid's running joke), the glare star (Sonny).

**4.25.4 UI art.**

- The logo.
- Icons made with `E.sprite`: heart (full, half, empty), coin, chip, gift box, hanger (suits), sunglasses, star, mood
  icons, weather icons, lock, NEW badge, camera.
- Glyph icons (§4.1.2); gradient panels with borders; portraits from the rigs.

### 4.26 Animation (`15-anim.js`)

**Technique, in layers:**

1. The rig's own procedural walk, run, idle and jump.
2. The **arm-IK overlay:** after `rig.update`, override the hand targets with `E.ik3` for timed moves, blended by a
   weight curve (wind 0→1, hold, release 1→0). Wrap `rig.solvePose` as AI_GUIDE's "New animation on the rigs" shows.
3. Body offsets through rig state: `crouch`, `lean`, `air`, `land`, `flip`, `down`.
4. Mocap clips through `Mocap.drive(rig, lib)`, faded with `rig.mocapW`, or upper body only with
   `rig.mocapMask = 'upper'`.
5. Faces through `expr`.

Animation is driven from the simulation's plan, not the other way round. A spike's jump starts at t* minus its rise time,
and the hand's IK target is the ball's position at t*.

**Moves:**

| Move | Timing (s) | How |
| --- | --- | --- |
| ready stance | loop | crouch .35, hands low in front (IK), weight shifts, eyes on the ball |
| bump | .12 wind, .08 hit, .3 recover | crouch .55 then extend; hands joined at hip height in front (IK); arms swing up 20° through contact |
| dig (low) | as bump | crouch .8, `land: .4` |
| set | .1, .06, .25 | hands above the forehead (IK, wrists back), knees push; a small hop for quick sets |
| approach and spike | .38 rise, .06 hit, .3 land | 2-step approach toward the net; `air`; the right arm cocks back (IK) then whips over (the engine's `overhead` arc with `hop`); the left arm points at the ball; land squash (`rig.land(.6)`) |
| shot (cut / roll) | as spike, slower arm | open-hand poke (IK) |
| block | .28 rise, .18 hold, .3 fall | both arms straight up over the net (IK), hands angled forward; land |
| float serve | .5 toss, .1 hit | the left hand tosses (IK), then the right arm hits overhead, with a step |
| jump serve | .6 toss, .4 approach, .1 hit | high toss, 2 steps, a jump, a spike-like swing |
| dive | .22 lunge, .3 slide, .45 down | the mocap `Dive_Roll` (CMU), or `flip` with a forward lunge; arms out; a sand trail |
| call | .5 | free arm up, `expr: 'shout'` |
| high five | .5 | partners turn to face each other; the near hands meet at shoulder height + 4 (IK to the midpoint); clap sound and a sparkle |
| celebrations | 1.2 | Rin `Bow`; Lola `Victory Fist Pump`; Ingrid `Head Nod` with a small fist; Amara `Dance Charleston` or `Cartwheel`; Tess `Wave_Hello` (a shaka); Mei `Backflip`; Sonny `Cheering_Two_Hands`; Pepper `Salute` (deadpan) |
| disappointment | 1 | `Idle_No_Loop`, `Shrug`, the facepalm pose |
| give / receive a gift | 1 | give: both hands forward holding a gift-box sprite. Receive: love = a hop, `Cheer_One_arm` and hearts; like = `Yes` or `Head Nod`; refuse = `Reject` or `Idle_FoldArms_Loop` |
| idles | loop | `Idle_Talking_Loop`; `Sitting_Idle_Loop` (bar stools, loungers); `Sitting_Talking_Loop`; sunbathing (`down: 1` plus the `sunbathe` pose); `Swim_Idle_Loop` and `Swim_Fwd_Loop` (pool); `Stretch_Yawn`; `Jumping_Jacks_Loop` (warm-ups); `Meditate` (Rin); `Idle_TalkingPhone_Loop` (Sonny) |
| party | loop | `Dance_Loop`, `Dance Body Roll`, `Dance Reach Hip`, `Dance Charleston` |
| Pool Hop | .45 a hop | crouch, an `air` arc between pads, a land squash. A slip blends `hurt` and `down` with a splash, then `Swim_Fwd_Loop` back and `ClimbUp_1m_RM` onto the pad |
| casino | loop | sitting at slots, leaning on the table, cheering on wins |
| photo poses | hold | Wave, Peace (IK hand by the face with a two-finger sprite), Hips, Cheer, Stretch, Look Back (torso twist and head turn), Sit, Victory, Salute, Bow |
| Sonny gags | 1–2 | `Fall_On_Face` (tripping into the pool), `Confused`, `Angry` |

**The clip set to cut.** Make it with `tools/anim-set.mjs` into `vendor/mocap/aoa-clips.js` (name `AOA`) and keep it
under about 250 KB. Quote the `--clips` argument, since some names have spaces.

| Source set | Clips |
| --- | --- |
| quaternius | `Idle_Talking_Loop`, `Sitting_Enter`, `Sitting_Idle_Loop`, `Sitting_Talking_Loop`, `Sitting_Exit`, `Swim_Idle_Loop`, `Swim_Fwd_Loop`, `Dance_Loop`, `Idle_FoldArms_Loop`, `Idle_No_Loop`, `Yes`, `Idle_TalkingPhone_Loop`, `LayToIdle`, `ClimbUp_1m_RM`, `Jump_Start`, `Jump_Loop`, `Jump_Land` |
| mesh2motion | `Bow`, `Victory`, `Victory Fist Pump`, `Cheer_One_arm`, `Cheering_Two_Hands`, `Dance Charleston`, `Dance Body Roll`, `Dance Reach Hip`, `Reject`, `Head Nod`, `Greeting`, `Salute`, `Backflip`, `Meditate`, `Confused`, `Angry` |
| cmu | `Dive_Roll`, `Wave_Hello`, `Shrug`, `Stretch_Yawn`, `Cartwheel`, `Jumping_Jacks_Loop`, `Fall_On_Face` |

**Checks.**

- Check every clip on the athletic build in the rig sheet. Use `mocapMask: 'upper'` where the legs look wrong, and fall
  back to a procedural pose for any clip that still fails.
- Record every move with `tools/filmstrip.mjs` and look for a wind-up, a strike and a clean settle, with no jerks or
  backward sweeps. Keep the strips in `test-output/filmstrips/`.

---

## 5. Content

### 5.1 Cast

**The six fighters: look and personality.** All use the `athletic` build. Sizes are rig `size`.

| id | Name, epithet | From · style · age | Look | Personality |
| --- | --- | --- | --- | --- |
| `rin` | Rin Takamine, "The Quiet Blade" | Japan · kendo and iaido champion · 24 | 1.22; long blue-black high ponytail `#1d1a24`, bangs .6; skin `#f1cfb2`; eyes `#4a2c22` | composed perfectionist, dry one-liners; secretly adores cute things |
| `lola` | Dolores "Lola" Vega, "La Tormenta" | Mexico · luchadora (pro wrestler) · 27 | 1.30, shoulderHalf +.25; curly dark brown `#3a2218` with a red bandana (`band` `#d8302a`); skin `#b9825a`; eyes `#3a2416` | loud, warm, theatrical; trash-talks with a grin; lives for a crowd |
| `ingrid` | Ingrid Halvorsen, "The Glacier" | Norway · glíma wrestling and kickboxing, ex-biathlete · 26 | 1.38, the tallest; platinum braid `#f2ead2`; skin `#f7dccb`; eyes `#5aa0d8` | stoic and deadpan; hates the heat and misses snow; secretly a karaoke fiend |
| `amara` | Amara Okafor, "Rhythm Queen" | UK/Nigeria · capoeira and dance fighting · 22 | 1.26; high puff `#2a1810` with gold cuffs; skin `#7a4a2e`; eyes `#2a1810` | cheerful social butterfly who loves music and fashion; dramatic |
| `tess` | Tess Callahan, "Riptide" | Australia · surfer and MMA brawler · 25 | 1.28; sun-bleached messy bob `#f0d890`; skin `#e2ad84`; eyes `#3c7a5a` | laid-back but fiercely competitive; cheeky and outdoorsy |
| `mei` | Mei-Lin Zhou, "Little Phoenix" | Hong Kong · wushu acrobat and xiangqi prodigy · 21 | 1.16, the smallest; black twin buns `#1a1418` with pink ribbons; skin `#f3d2b8`; eyes `#3a2420` | mischievous prankster with a sweet tooth; hates losing at anything |

**The six fighters: play and voice.** Stats are 1–10. Voice values are base Hz, range in semitones, rate in letters/s,
formant shift and wave (§4.24.3).

| id | Tastes | POW / TEC / SPD / JMP | Voice | Signature suit | Starts with | Celebration |
| --- | --- | --- | --- | --- | --- | --- |
| `rin` | classic, elegant | 5 / 9 / 7 / 6 | 330, 3, 13, 1.05, triangle | Seigaiha | Ribbon (red) | `Bow` |
| `lola` | bold, sporty | 9 / 5 / 5 / 8 | 260, 6, 16, .95, saw | Estrella | Sweatband | `Victory Fist Pump` |
| `ingrid` | sporty, classic | 7 / 6 / 4 / 9 | 210, 2, 10, .9, triangle | Fjord | Sport Shades | `Head Nod` and a small fist |
| `amara` | bold, cute | 5 / 6 / 9 / 8 | 340, 7, 15, 1.1, pulse; sing-song contour | Kente Pop | Hibiscus | `Dance Charleston` or `Cartwheel` |
| `tess` | sporty, bold | 7 / 7 / 7 / 6 | 290, 5, 14, 1.0, saw; statements end rising | Reef Break | Wristbands | `Wave_Hello` (a shaka) |
| `mei` | cute, elegant | 4 / 8 / 8 / 6 | 400, 6, 18, 1.18, pulse | Peony | Ribbon (pink) | `Backflip` |

**Hosts and staff:**

| id | Who | Look | Voice | Role |
| --- | --- | --- | --- | --- |
| `sonny` | Sonny Fortuna, "The Man with the Golden Tan": jackpot billionaire, DJ and would-be champion; a harmless buffoon | `bulky` 1.32; slick black hair (`spiky` `#121014`); gold aviators; a loud palm-print shirt (`shirt`, pattern `palms`, `#2fb5a0` / `#ffd36a`); white shorts; gold chain; skin `#d9a27a`. Final kit: black-and-gold tank and board shorts | 120, 7, 13, .8, saw, vibrato 6 Hz | host, PA commentator, casino boss, final opponent (POW 8 / TEC 5 / SPD 5 / JMP 5) |
| `pepper` | Pepper Quill: concierge, scorekeeper and dealer; deadpan, ultra-competent, quietly holds Sonny's debts | `athletic` 1.24; auburn `bun` `#5a2a1e`; thin glasses; navy vest `#1d2433` with gold trim, slacks. Final kit: the Pinstripe racer | 230, 1, 17, 1.0, triangle | concierge, tutorial coach, blackjack dealer, final opponent (POW 6 / TEC 10 / SPD 7 / JMP 6) |
| `kai` | Kai Makoa, an islander: bartender and croupier | `heroic` 1.25; short black hair; skin `#a8714a`; floral shirt (`#2fb5a0`), khaki shorts | 170, 4, 12, .85, triangle | Tiki Tok Bar, Sundries & Smiles, roulette |
| `odette` | Odette Belrose, couturier | `athletic` 1.2; long silver-lilac hair `#c8b8e8`; pink sundress (`robe`, `#ff8aa8`); sun hat | 300, 5, 12, 1.1, pulse | Coral Couture |
| `bo` | Coach Bo Brannigan, a retired beach pro | `bulky` 1.28; bald; visor; whistle; yellow tank `#ffd04a`, blue shorts | 150, 3, 14, .85, square | Riptide Sports |
| crowd | staff and guests | small pixel sprites, plus a few HD rigs at .9 | — | spectators, casino crowd |

### 5.2 Items

**5.2.1 Swimsuits (21).** Colors are main · accent · trim. "Day N+" items reach the shop on that day.

| id | Name | Cut | Pattern | Colors | Tastes | Where | S$ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `seigaiha` | Seigaiha | onepiece | waves | `#23306b` `#e8eef8` `#c8303a` | classic, elegant | Rin's signature | — |
| `estrella` | Estrella | sport2, shorts | stars | `#c8202c` `#ffd04a` `#1a1a1a` | bold, sporty | Lola's signature | — |
| `fjord` | Fjord | rash, short sleeves | solid | `#9fd8f0` `#1d3560` `#ffffff` | sporty, classic | Ingrid's signature | — |
| `kentepop` | Kente Pop | tankini | geo | `#ff8a1e` `#2f9e4a` `#ffd36a` | bold, cute | Amara's signature | — |
| `reefbreak` | Reef Break | racer | gradient | `#1fb7b0` `#ff7a5e` `#ffffff` | sporty, bold | Tess's signature | — |
| `peony` | Peony | halter | floral | `#ffb2a0` `#e85a8a` `#ffffff` | cute, elegant | Mei's signature | — |
| `protour` | Pro Tour | racer | pin | `#f4f6fa` `#d8283a` `#1a2a5a` | sporty | Riptide | 12,000 |
| `sandstorm` | Sandstorm | sport2, shorts | solid | `#e8c06a` `#1a1a1a` `#ffffff` | sporty, bold | Riptide | 9,000 |
| `lifeguard` | Lifeguard | onepiece | solid | `#e0302a` `#ffd04a` `#ffffff` | sporty, classic | Riptide | 8,000 |
| `coralrash` | Coral Rash | rash, long sleeves | stripes | `#ff7a5e` `#ffffff` `#2a3a5a` | sporty | Riptide | 14,000 |
| `neonrush` | Neon Rush | tankini | gradient | `#7cff5a` `#ff4fb8` `#1a1a1a` | bold, sporty | Riptide, Day 2+ | 16,000 |
| `monaco` | Monaco | halter | stripes | `#1d2f6a` `#ffffff` `#d8283a` | classic, elegant | Coral Couture | 22,000 |
| `polkapop` | Polka Pop | sport2, brief | dots | `#e8283a` `#ffffff` `#ffd04a` | cute | Coral Couture | 18,000 |
| `tropicana` | Tropicana | sarong | palms | `#2f8f4e` `#ffe0a0` `#ff8a1e` | elegant | Coral Couture | 26,000 |
| `mermaid` | Mermaid | onepiece | scales | `#1fb7b0` `#7a5fd8` `#e8f8ff` | cute, elegant | Coral Couture, Day 3+ | 30,000 |
| `sunsetblvd` | Sunset Boulevard | tankini | gradient | `#ff9e5e` `#7a3fa0` `#ffd36a` | bold, elegant | Coral Couture | 28,000 |
| `midnight` | Midnight | onepiece | solid | `#16141c` `#ffd36a` `#ffd36a` | elegant, bold | Coral Couture, Day 4+ | 35,000 |
| `gingham` | Gingham Picnic | tankini | check | `#6aa8e8` `#ffffff` `#e8283a` | cute, classic | Coral Couture | 15,000 |
| `fortunagold` | Fortuna Gold | racer | lame | `#ffd36a` `#fff3c0` `#1a1a1a` | bold | win the Final | — |
| `jackpot` | Jackpot | sport2, shorts | sevens | `#1a1a2a` `#ffd36a` `#e8283a` | bold, cute | casino prize counter | 300 chips |
| `pinstripe` | Pepper's Pinstripe | racer | pin | `#121216` `#f4f4f4` `#ffd36a` | classic, elegant | Pepper's gift on Day 4 (see §5.5) | — |

**5.2.2 Accessories (10).** One per anchor: head, face, hair, neck, wrists.

| id | Name | Anchor | Look | Tastes | Where | S$ |
| --- | --- | --- | --- | --- | --- | --- |
| `ribbon` | Ribbon | hair | a bow in the wearer's accent color | classic, cute | Rin and Mei start with it; Coral Couture | 2,000 |
| `sweatband` | Sweatband | head (`band`) | terry band | sporty | Riptide; Lola starts with it | 3,000 |
| `sportshades` | Sport Shades | face | wraparound lenses `#20262e`, frame `#e8eef2`; **sunglasses** | sporty | Riptide; Ingrid starts with them | 6,000 |
| `heartshades` | Heart Shades | face | two pink hearts; **sunglasses** | cute, bold | Coral Couture | 7,500 |
| `aviators` | Gold Aviators | face | like Sonny's; **sunglasses** | bold | Coral Couture, Day 3+ | 15,000 |
| `visor` | Sun Visor | head (`visor`) | white with a colored brim | sporty | Riptide | 4,000 |
| `sunhat` | Straw Sun Hat | head (`sunhat`) | wide straw brim, ribbon band | elegant, classic | Coral Couture | 9,000 |
| `hibiscus` | Hibiscus | hair | a red flower behind the ear | cute, elegant | Sundries; Amara starts with it | 2,500 |
| `shellnecklace` | Shell Necklace | neck | white shell dots | cute, classic | Sundries | 4,500 |
| `wristbands` | Wristbands | wrists | 2-px bands | sporty | Riptide; Tess starts with them | 3,500 |

**5.2.3 Gifts (25).** Stock and daily deals work as for every shop item (§4.12). Icons are `E.shapeSprite` of a store
shape where one exists (`kenney-food:coconut`, `kenney-food:ice-cream`, `kenney-holiday:present-a-cube` for the
wrapping), otherwise a 12×12 `E.sprite`.

| Category | Items (S$) | Shop |
| --- | --- | --- |
| food and drink | `mango_smoothie` Mango Smoothie 800 · `bubble_tea` Bubble Tea 900 · `matcha_icecream` Matcha Ice Cream 700 · `mochi_box` Mochi Box 1,500 · `bbq_skewers` BBQ Skewers 1,200 · `hot_sauce` Hot Sauce Sampler 2,000 · `iced_coffee` Iced Coffee 600 · `coconut` Fresh Coconut 400 | Sundries & Smiles |
| goods | `plush_seal` Plush Seal 3,000 · `snow_globe` Snow Globe 2,500 · `puzzle_cube` Puzzle Cube 2,200 · `portable_speaker` Portable Speaker 9,000 · `matcha_kit` Matcha Kit 4,500 · `calligraphy_set` Calligraphy Set 6,000 · `knitting_kit` Knitting Kit 2,800 · `maracas` Maracas 1,400 · `luchador_mask` Luchador Mask 5,000 (Day 2+) | Sundries & Smiles |
| books | `beach_paperback` Beach Paperback 1,200 · `fashion_mag` Fashion Magazine 800 | Sundries & Smiles |
| sports | `energy_drink` Energy Drink 500 · `surf_wax` Surf Wax Deluxe 1,600 · `sunscreen` Sunscreen SPF 100 1,000 · `foam_finger` Foam Finger 900 | Riptide Sports |
| fashion | `glitter_sandals` Glitter Sandals 5,500 · `gold_hoops` Gold Hoop Earrings 12,000 | Coral Couture |

### 5.3 Tastes and starting affinity

**Gift tastes.** L = love (+3), + = like (+2), · = neutral, − = dislike (−3). Each fighter has 2 loves, at least 3 likes
and at least 3 dislikes; the data test checks it.

| Gift | Rin | Lola | Ingrid | Amara | Tess | Mei |
| --- | --- | --- | --- | --- | --- | --- |
| mango_smoothie | · | + | · | + | + | · |
| bubble_tea | · | · | · | · | · | + |
| matcha_icecream | + | · | + | · | · | + |
| mochi_box | + | · | · | · | · | L |
| bbq_skewers | · | + | · | · | L | − |
| hot_sauce | − | L | − | · | + | − |
| iced_coffee | · | · | + | · | · | · |
| coconut | · | · | · | · | + | · |
| plush_seal | L | · | + | · | · | + |
| snow_globe | · | · | L | − | · | · |
| puzzle_cube | + | − | · | · | · | L |
| portable_speaker | − | + | · | L | + | · |
| matcha_kit | L | − | · | · | · | + |
| calligraphy_set | + | · | · | · | − | · |
| knitting_kit | · | · | L | − | · | − |
| maracas | · | + | · | + | · | · |
| luchador_mask | · | L | · | · | + | · |
| beach_paperback | + | − | + | · | · | · |
| fashion_mag | · | · | − | + | − | + |
| energy_drink | − | · | · | − | + | − |
| surf_wax | · | · | · | · | L | · |
| sunscreen | · | · | + | · | + | · |
| foam_finger | − | + | · | · | + | · |
| glitter_sandals | · | · | − | + | − | + |
| gold_hoops | · | + | · | L | · | · |

**Weather tastes** (for mood):

| Fighter | Likes | Dislikes |
| --- | --- | --- |
| Ingrid | cloudy, rain | — |
| Amara | sunny | rain |
| Tess | sunny | — |
| others | neutral | neutral |

**Starting affinity.** One symmetric value per pair. It is also used to pair NPCs into teams.

| | Rin | Lola | Ingrid | Amara | Tess | Mei |
| --- | --- | --- | --- | --- | --- | --- |
| **Rin** | — | 20 | 35 | 25 | 30 | 40 |
| **Lola** | 20 | — | 25 | 40 | 45 | 20 |
| **Ingrid** | 35 | 25 | — | 20 | 35 | 25 |
| **Amara** | 25 | 40 | 20 | — | 30 | 40 |
| **Tess** | 30 | 45 | 35 | 30 | — | 25 |
| **Mei** | 40 | 20 | 25 | 40 | 25 | — |

Every fighter except Ingrid starts with someone at 40 or more, who is willing to team up at once. Ingrid ("The
Glacier") has to earn a partner; Pepper's tutorial gives everyone a starter partner anyway: the highest-affinity NPC.

### 5.4 Locations and schedules

**Locations.**

| Location | Open | Map (tiles) | Features | NPC spots |
| --- | --- | --- | --- | --- |
| **Sunset Courts** | Morning, Afternoon (final and party override) | the 44×28 court map (§4.3) | Court A, bleachers, Tiki Tok Bar (Kai), umbrellas and loungers, lifeguard tower, DJ booth (Sonny in the mornings), surf rack, sandcastle, changing hut, Match Board | 3 bar stools, 3 loungers, 2 on the shoreline, 1 practice pair bumping a ball |
| **Lagoon Pool** | Morning, Afternoon | 30×22 | a free-form pool, the Pool Hop deck and 32 pads, cabana bar, loungers, flamingo float, palms, tiki torches, changing hut | 2 swimming, 3 loungers, 2 sitting on the pool edge, 2 cabana stools |
| **Fortuna Promenade** | Morning, Afternoon | 36×16 boardwalk | 3 shopfronts with doors, ice-cream cart, benches, lamps, planters, the railing over the sea | 2 benches, 3 window-shopping, 1 at the ice-cream cart |
| **Your Villa** | always | 14×10 interior plus a balcony | bed (Rest / Sleep), closet (Wardrobe), desk (Journal: Save, Friends, Stats), album frame, mailbox (letters), a balcony view by time of day | 1 visitor spot (night events) |
| **Casino Fortuna** | Night | 30×20 | cashier, 6 slots, blackjack (Pepper), roulette (Kai), VIP lounge (Sonny), prize counter, chandeliers, neon | 3 at slots, 2 at the roulette rail, 2 at the bar |
| **Dock** | story only | 24×14 | seaplane, planks, crates, flags | the arrival lineup |

**Schedule weights.** Daytime columns are Beach / Pool / Promenade / away; night is Casino / away.

| NPC | Morning | Afternoon | Night |
| --- | --- | --- | --- |
| Rin | 4 / 2 / 3 / 1 | 4 / 3 / 2 / 1 | 3 / 7 |
| Lola | 5 / 2 / 2 / 1 | 5 / 2 / 2 / 1 | 6 / 4 |
| Ingrid | 3 / 4 / 2 / 1 | 2 / 5 / 2 / 1 | 2 / 8 |
| Amara | 3 / 2 / 4 / 1 | 3 / 3 / 3 / 1 | 7 / 3 |
| Tess | 6 / 2 / 1 / 1 | 5 / 3 / 1 / 1 | 4 / 6 |
| Mei | 2 / 3 / 4 / 1 | 3 / 2 / 4 / 1 | 8 / 2 |

- **Rain** multiplies Beach × .2, Pool × .5, Promenade × 1.5 (it's covered) and away × 1.5.
- **NPC teams** are formed at day start. Of the NPCs who aren't your partner, choose the pairing with the largest sum of
  pair affinities plus ±10 noise from the `world` rng, preferring not to repeat yesterday's pairs. With 5 free NPCs, one
  stays solo and can be invited.

**Mailbox letters** (a simple letter screen with a portrait):

| When | Letter |
| --- | --- |
| D1 night | Pepper's welcome (the rules again) |
| D2 morning | Sonny's flyer: "Free chips for champions!" |
| D3 morning | a note from your highest-affinity friend |
| D4 morning | Pepper's warning |
| D5 morning | Sonny's "FINAL HYPE" poster |

### 5.5 Story beats and events

Data lives in `05-data-text.js`; triggers live in `30-vacation.js`.

| When | Event | What happens | Effects |
| --- | --- | --- | --- |
| New Vacation | **The Invitation** | The letter on parchment with Sonny's gold seal; "Who opened it?" leads to character select (6 cards with portraits, epithets, style, stats as bars, tastes) | — |
| D1 Morning | **Arrival** (Dock) | The seaplane lands and your fighter steps off; the other five are already there, each with one line. Sonny's grand welcome reveals the "tournament" is volleyball and a vacation. Pepper hands out keys and explains the slots, Sonny Dollars and the Cup in five days. | flags |
| D1 Morning | **Welcome Match** (the tutorial) | "Allow me to demonstrate!" You and your starter partner (Pepper assigns the highest-affinity NPC) play Sonny & Pepper ("five percent effort"), first to 5, with Pepper's coaching (§5.5.1). Sonny loses comically and falls on his face. | partner set; S$10,000 |
| D1 Night | Casino opening | If you go: Sonny gives 20 free chips and explains the games | chips |
| D2 Night | Villa visit | If you rest in the villa and someone has affinity ≥ 50, she knocks with a snack: a 3-line chat with one choice (±4) | affinity |
| D3 Afternoon | Rain shower | Sonny on the PA: "LIQUID SUNSHINE, PEOPLE!"; a rain match (wet ball: pass scatter × 1.2) | — |
| D3 Night | **The Overheard Call** | At the casino: Sonny on the phone in the VIP lounge, "…Yeah, I put the island on the Cup. What could go wrong?" Pepper sees you hear it. Choice: "Your secret's safe" (kind) or "Everyone's going to hear about this" (cheeky). If you're not at the casino, you get a rumor letter instead. | flag `kind` |
| D4 Morning | **Pepper's Letter** | "The Final is tomorrow. Mr. Fortuna's serve is… dazzling. Eyewear is advised. — P." If you were kind on Day 3 and visited the casino at least once, it comes with the Pinstripe suit. | hint, suit |
| D4 Afternoon | **Semifinal** | The NPC pair with the best record challenges you; it's marked SEMIFINAL on the Match Board. Win: seeded (you serve first in the Final), S$30,000. Lose: unseeded. | flags |
| D5 Afternoon | **THE FORTUNA CUP FINAL** | The beach in banners, a bigger crowd; Sonny & Pepper in match gear as "THE HOUSE"; first to 11; the specials of §4.8.6 | win: S$100,000, Fortuna Gold |
| D5 Night | **Farewell Party** | The beach at night: torches, fireworks, everyone dancing. Each fighter says goodbye with a line for her affinity stage. A group postcard is taken automatically. | album |
| Ending A (Final won) | **The House Folds** | Sonny must hand over the island, but Pepper produces his IOUs: she owns it now. Sonny paddles off on the flamingo float: "I'LL BE BACK… NEXT SUMMER!" Pepper: "Breakfast is at eight. The island is under new management." | — |
| Ending B (Final lost) | **The House Always Wins** | Sonny gloats, then bets the island on one spin of a giant roulette wheel at the party "to make it interesting". Pepper calls red. It lands red. Same flamingo exit. Pepper: "The house always wins. I am the house." | — |
| After either | Credits | The postcard slideshow plus the party photo, with credits | — |
| Then | **Vacation Results** | A report card: money earned, W–L, best friend (portrait), suits collected x/21, gifts given, best Pool Hop, casino net, postcards. A title: "Island Icon" (won the final and 3 Best Friends), "Fortuna Champion" (won the final), "Social Butterfly" (3+ Good Friends), otherwise "Beach Bum". Unlocks New Vacation+ and every suit for Beach Match. | unlocks |

**5.5.1 The tutorial script** (Welcome Match, first to 5). Pepper's tips are non-modal callouts (Shell tutorial cards or a
UI-kit panel) shown at the right moment, with the current device's glyphs:

1. **Receive:** "The ring shows where the ball comes down. Stand in it. Press ✕ as the ball reaches you."
   (Auto-receive covers the first 2 receives if you miss.)
2. **Set:** "Your partner passed it to you. ✕ again as it drops, to set her up."
3. **Spike:** "She set you. You'll jump on your own. ✕ at the top. Push the stick, or point the mouse, to aim."
4. **Serve:** "✕ to toss, ✕ again at the top of the toss. □ tosses for a jump serve."
5. **Block:** "When they spike near the net, □ to block."
6. **Dive:** "Out of reach? ○ dives."
7. **Call:** "△ calls 'Mine!' or 'Yours!'. Your partner listens."
8. **Chemistry:** "The better you two get along, the better she plays. Chat. Bring gifts. Win."

New Vacation+ offers "Skip the Welcome Match".

### 5.6 Opponents and difficulty

**Day skill base** (before stats, difficulty and `T.aiSkillMul`):

| Match | Base |
| --- | --- |
| tutorial | Sonny .20, Pepper .35 (Pepper never hits hard) |
| Day 1 | .40 |
| Day 2 | .50 |
| Day 3 | .58 |
| Day 4 | .66 |
| Day 4 semifinal | .74 |
| Final | Sonny .70, Pepper .85, plus the specials |

- The Match Board lists the pairs present, each with stars (skill) and its record.
- Off-screen NPC results (§4.10) decide which pair has the best record, and so who plays the semifinal.

### 5.7 Writing

**Style.**

- Short: at most 2 lines of about 36 characters per page.
- Upbeat and a little cheesy; each fighter's voice stays consistent.
- **Sonny** speaks in ALL-CAPS bursts, with nicknames ("CHAMP", "SUNSHINE") and casino metaphors.
- **Pepper** is dry, exact and faintly sarcastic, and never uses an exclamation mark.
- Jokes come from fighting backgrounds and vacation mishaps. **No innuendo.**

**How many lines** (the data test checks the counts):

| Speaker | Lines needed |
| --- | --- |
| each fighter | greet ×3 (by stage); chat ×6 (2 each for affinity 0–39, 40–79, 80+); gift love ×2, like ×2, neutral ×1, refuse ×2; suit accepted ×1, suit refused ×1; invite accept ×2, decline ×2; leaving her old team ×1; pre-match taunt ×2; match win ×2, loss ×2; partner barks ×2; villa visit ×1 (with a choice); party farewell ×2 (low, high); ending ×1 |
| Sonny | about 40 PA and commentary lines, plus story |
| Pepper | about 25 (tutorial tips, quips, letters) |
| Kai, Odette, Bo | about 8 each (shop quips) |

**Sample lines.** They set the tone; reuse them.

| Speaker | Line |
| --- | --- |
| Sonny, arrival | "WELCOME, FIGHTERS, TO ISLA FORTUNA! The tournament of the century is… drumroll… BEACH VOLLEYBALL!" / "And a VACATION! You're welcome!" |
| Pepper, arrival | "Villa keys. Sunscreen is in the minibar. The Cup is in five days. Mr. Fortuna is not taking questions." / "Please don't feed him." |
| Rin | greet: "Good morning. The sand is… adequate." · chat: "I practice my swing at dawn. The sea doesn't judge." · love (plush seal): "…It's so round. I will name him Admiral." · refuse (energy drink): "My heart rate is fine as it is. Thank you." |
| Lola | greet: "¡Hola, compañera! Ready to bring the THUNDER?" · love (hot sauce): "THIS! This is the fuel of champions!" · refuse (paperback): "A book? On vacation? Ay, you're funny." |
| Ingrid | greet: "It is thirty-one degrees. I am melting. Hello." · love (snow globe): "Snow. Tiny, perfect snow. I may cry." · refuse (sandals): "Glitter gets everywhere. Everywhere." |
| Amara | greet: "Hey hey! You hear that? The ocean's got rhythm!" · love (speaker): "Okay. The party starts NOW." · refuse (snow globe): "Snow? Babe, we're in paradise." |
| Tess | greet: "G'day! Waves are pumping, sun's out. Life's good, yeah?" · love (surf wax): "Ohhh, the good stuff! My board says thanks." · refuse (calligraphy): "Mate, I can barely write my own name." |
| Mei | greet: "Hehe. Bet you can't beat me at anything today." · love (puzzle cube): "Solved it. Twice. Got another?" · refuse (skewers): "I don't eat things on sticks that used to have faces." |
| Invites | Tess, accepting: "Partners? Too right!" · Ingrid, declining: "I prefer to know someone before I trust them with my spikes." |
| Results | Lola wins: "¡VICTORIA! Somebody ring the bell!" · Rin loses: "I will reflect on this. Deeply." |
| Sonny, commentary | "WHAT A SPIKE! Somebody call a lifeguard!" · "ACE! That serve had TAXES on it!" · "BLOCKED! The wall is CLOSED for business!" · "Long rally, folks. I'm getting a tan just WATCHING." · "MATCH POINT! I can't look! …I'm looking." |
| Pepper, in the final | "Statistically, that was unwise." · "The house has noticed." |

---

## 6. UI/UX and controls

### 6.1 Screen flow

```
boot → title ──(10 s idle)──► attract ──(any input)──► title
title → menu ─ New Vacation → invitation → character select → arrival → Welcome Match → map
             ─ Continue / Load → map (at the saved slot)
             ─ Beach Match → setup and join (1–4) → match → results → setup / title
             ─ Album · How to Play · Settings (engine) · About & Credits
map ⇄ location (Beach / Pool / Promenade / Villa)
      inside: talk · gift · team up · challenge → match; shops · wardrobe · journal · album · letters · Pool Hop
map (night) → casino (cashier / slots / blackjack / roulette) or villa → day end → map (next day)
Day 5: Final → party → ending A or B → credits → vacation results → title
AI Hub session: boot → hub card → match → end overlay (no title, no menus)
Pause (gameplay scenes): Resume · How to Play · Take a Postcard · Dev Mode · Settings · Controls · Full screen · Quit to title
```

### 6.2 Controls

**Matches:**

| Action | DualSense | Xbox | Keyboard | Mouse |
| --- | --- | --- | --- | --- |
| Move | L stick, d-pad | L stick, d-pad | WASD, arrows | — |
| Bump · set · spike · serve (timed) | ✕ | A | Space, J | Left |
| Shot / tip · block · jump serve · free ball | □ | X | E, K | Right |
| Dive | ○ | B | Shift, L | — |
| Call Mine / Yours / Auto | △ | Y | Q, I | Middle |
| Aim | L stick at contact | L stick | WASD at contact | the cursor on their court |
| Camera | R3 | RS click | V | — |
| Pause | Options | Menu | Esc, P | — |

**Everywhere else:**

| Context | Controls |
| --- | --- |
| Exploration | Move: stick / WASD · Run: hold ○ or R2 / Shift · Interact: ✕ / E, Space, Enter / click a person or thing · Gift bag: □ / G · Island map: △ / M, Tab · Postcard: Create / C · Pause: Options / Esc |
| Menus | Navigate: d-pad, stick / arrows, WASD / hover · Select: ✕ / Enter, Space / click · Back: ○ / Backspace / right click · Tabs: L1, R1 / Q, E / wheel · Option: □ / F · Special: △ / R |
| Pool Hop | the four face buttons ✕ ○ □ △ (A B X Y; J, L, K, I or Space, Shift, E, Q); two at once on double pads |
| Casino | the on-screen prompts (§4.16), plus blackjack H, S, D, P and slot stops J, K, L |
| Beach Match, split keyboard | P1: WASD with F hit, G dive, H shot, R call · P2: arrows with `.` hit, `/` dive, `,` shot, L call |

### 6.3 Prompt rules

- Every screen has the bottom prompt bar. During a rally, at most 3 context prompts.
- Glyphs follow the last device at once, per player.
- PlayStation symbols are the default for any controller; Settings → Button symbols switches to Xbox (A B X Y).
- Keyboard prompts show keycaps and mouse prompts show the mouse icon. Never show controller glyphs to a keyboard
  player, or keys to a pad player.

---

## 7. Build order and milestones

**Every milestone ends with:**

- `npm test` green;
- a fresh build of `GAME.html` that runs from `file://` with no console errors;
- its screenshots reviewed.

Grey-box art may appear inside a milestone only if that same milestone replaces it. Nothing shipped carries placeholder
art, text or TODOs.

| # | Milestone | Build | Tests and acceptance |
| --- | --- | --- | --- |
| **M0** | Foundation | Fetch the sources (§3.1), copy the engine and tools, `npm install`, `npx playwright install chromium`. `tools/build.mjs`; the `test/run.mjs` skeleton and vm loader (§9.1). `00-core`, `01-tuning`, `10-input` (action maps, glyph icons, prompt bar, touch-only gate), `11-ui` (Panel, Button, List, PromptBar, Slider), `99-main`, and real boot, title and menu scenes. Engine patches 1, 2, 6, 7. | rng reproducibility; glyph per device (PS ✕ / Xbox A / keycap); UI focus by taps and by `input.feed('move')` hover; title → menu. **Accept:** GAME.html shows the title with ✕ on a pad and keycaps on a keyboard; Settings shows Button symbols. |
| **M1** | Volleyball core (the most important) | `20-ball`, `21-rules`, `22-players`, `23-ai`, `24-match` (phases, Broadcast camera, basic HUD); the court map with sand, lines and net; human controls with the judge and ring; AI vs AI; 1P with an AI partner vs AI. **Dev panel v1** with the Ball, Timing, Players and AI sliders and Reset, because tuning needs it now. | ball, rules, judge, ai and match suites (§9.3). **Accept:** a full 1P match to 7 is fun with the default numbers; filmstrips of the ring and of a rally look right. |
| **M2** | Characters and court art | Engine patch 5 (athletic build, swim cuts and patterns, hair, hats, extras, poses, bare feet); `13-rigs`; `15-anim` (every volleyball move, IK overlay, high-fives, celebrations); cut the mocap set and wire it; `14-world-art` (court surroundings, backdrops for day, sunset and night, bleachers and crowd, net art, DJ booth, scoreboard); the Serve Cam view; `tools/rigsheet.mjs`. | every suit, hair and accessory builds a rig and draws without errors (browser suite); rig sheet and filmstrips reviewed. **Accept:** match screenshots meet the Look target in both cameras; no character in default colors. |
| **M3** | Presentation, audio, exhibition, local multiplayer | `12-audio` (patches 3 and 4, SFX, voices, the `spike` and `sunrise` songs, jingles); commentary; judgement popups; celebrations; replay; results; `52-exhibition` with 1–4 joins and per-player prompts; final title and menu art and music. | 4 local players (`addPlayer` pads plus the keyboard halves) each control one fighter; songs parse with no unknown tokens; voices are no-ops headless and play in the browser. **Accept:** a Beach Match end to end with 2 keyboard halves and 2 pads. |
| **M4** | Vacation core | `30-vacation` (state, calendar, weather, schedules, moods, affinity, partners, money, saves); `31-map`; `32-location` (Beach, Pool, Promenade, Villa with real maps, props and NPC spots); talk menu, gifts, team-up, Match Board challenges, day end; `34-story` wiring with the invitation, character select, arrival, Welcome Match and its coaching. | vacation suite; New Vacation → tutorial → map; save and load in the middle of a day. **Accept:** Days 1–2 fully playable. |
| **M5** | Shops, wardrobe, journal, postcards | `33-shop` (3 shops, deals, try-on), wardrobe and partner page, suit gifts to NPCs, the Journal (Friends with known likes, Stats, Save), letters, `42-photo` (photo mode, album, title backdrop, PNG export). | shop suite; photo specs saved, restored and re-rendered (browser); album replace and delete. |
| **M6** | Minigames | `40-poolhop` (song `lagoon`, judging on the music clock, wobble and double pads); `41-casino` (floor, cashier, prize counter, slots, blackjack, roulette; song `neon`). | poolhop and casino suites (RTP, rules, payouts). |
| **M7** | Story to the end | Every event of §5.5 (D1 casino opening, D2 villa visit, D3 rain and the overheard call, D4 letter and semifinal, D5 final with its specials, party, endings A and B, credits slideshow, results, New Vacation+); every dialogue line in §5.7's counts; How to Play pages; About & Credits pages (filled at M10); the remaining songs `house`, `island`, `lagoon`, `boutique`, `neon`, `siesta`, `farewell`. | story suite; data counts; the full playthrough (§9.3) to both endings. |
| **M8** | AI Hub online | `25-netplay`; session game options; the card; host and client sync; server mode; time-up, leave and end; `test/lib/fakehub.mjs`. | netcode suite (Node, with latency, jitter and loss); hub suite (the harness's four scenarios). |
| **M9** | Attract, dev mode, touch-only, polish | `51-attract` with the full playlist; every dev tool and slider; the touch-only gate; every game setting; a juice pass (particles, shake and flash under the comfort settings); lighting per time of day; an art pass on every screen; a mix pass on all sound. | attract, dev and touch tests; the full playthrough again. **Accept:** the screenshot review list (§9.5) passes at 1280×720 and 1920×1080. |
| **M10** | Ship | Final build. `npm test` all green, including browser and hub. `tools/check.mjs GAME.html`: act on every look note. Fill in About & Credits (§10). Write and validate `exit-interview.json`. Make sure nothing dev-only is bundled; report the final size. | everything in §11 is true. |

---

## 8. Risks and how to de-risk them

| Risk | Why it is risky | De-risking |
| --- | --- | --- |
| **Volleyball feel**: floaty, unfair, endless or one-touch rallies | timing, physics and AI all interact | Closed-form ball: exact and testable. Every feel number is a TUNING slider from M1. An AI-vs-AI statistics test: rallies average 3–8 touches, serve faults < 12%, 1.5–4 points a minute. Filmstrips and real play each milestone. Difficulty presets. |
| **Swimsuit and athletic rigs** look wrong in some views or facings | the Humanoid draw method is big; characters are about 50 px tall | Spike it in M2's first hours with one cut and one pattern. The rig sheet covers every view and facing. Patterns use 1-px features. Fallback if editing `draw` stalls: overdraw the suit inside the `r.actor` callback from projected joints (`rig.worldOffset(J.x)`), with no engine edit. |
| **Animation doesn't meet the ball** at contact | sim and animation could drift apart | Drive animation from the plan: the jump starts at t* − rise and the IK targets the ball's position at t*. A filmstrip check per move. |
| **Netcode** under latency, jitter and loss | a timing game, online | Deterministic launches on the shared hub clock; client-judged touches the host validates; snapshots only for positions. Node fake-hub tests with 150 ± 50 ms and 5% loss run before the real harness. |
| **Hub rule violations**: pause, quit, storage, dialogs, Create+Options | engine defaults | Session-specific game options (no menu, corner or autoPause), patch 6, and the harness's automatic checks inside the one test command. |
| **Scope**: many systems | the breadth of the plan | The match comes first and every milestone ships something playable. Content is data. Reuse: one location scene, one Match class for every mode, one UI kit. |
| **UI density on a TV** | inventories and stats invite tables | The rules in §4.2 are review items; at most 8 focusables; screenshot reviews at 1920×1080 and 1280×720. |
| **Voices** harsh or out of sync | home-made synthesis | The per-letter hook; the dev Voice Lab; soft envelopes and a lowpass; Voices at .8 by default. |
| **Music** quality | hand-written step notation | The instrument patch; the chord plans in §4.24.1; layered tracks; a listening pass; loops of at least 16 bars. |
| **Mocap on the athletic build** | the clips were measured on other proportions | Check every clip in the rig sheet; `mocapMask: 'upper'`; a procedural fallback for any clip that fails. |
| **Determinism** breaking tests or the netcode | a stray `Math.random` | rng streams only. Tests seed `Math.random`, and a test greps `src/` for `Math.random(` and fails. |
| **Touch-only misdetected** on hybrid devices | touchscreen laptops | Require coarse-only pointers and no key or pad input yet; the notice goes on the first key or pad press. |
| **No Chromium, or a full /tmp** | the machine is shared | `TMPDIR=DEV/.tmp`; `CHROMIUM_PATH` for `check.mjs`; ask the user before skipping a browser check, and never report one as passed if it was skipped. |

---

## 9. Testing

### 9.1 One command

`npm test`, which runs `node test/run.mjs`:

- It runs every suite and prints **only failures** (`FAIL suite › case: detail`), then **one line**:
  `N passed, M failed (core, data, ball, rules, judge, ai, match, vacation, shop, story, poolhop, casino, ui, attract,
  dev, netcode, playthrough, browser, hub) in 42 s`. A failure exits with code 1.
- Flags: `--only=ball,rules`, `--skip-browser`, `--skip-hub`, `--seed=n`.
- As TASK.md says, rerun a suite only after changing the code it covers (`--only`). Run everything before a milestone
  ends.
- **The headless loader** (`test/lib/load.mjs`) builds `build/game.js` first if any src file is newer. It makes a fresh
  `vm` context with stand-ins: `window`, `addEventListener`, `location`, `matchMedia: () => ({ matches: false })`,
  `navigator: { maxTouchPoints: 0 }`, and `AIHub` either absent or the fake. It loads the engine, the mocap scripts and
  `build/game.js`, seeds `Math.random` with `E.rng(seed)`, and returns `{ E, game, G }`. It drives play with
  `game.advance(seconds)`, `input.tap` and `input.hold`, and reads `game.debug.snapshot()`. Copy the pattern from the
  handoff's `game/test.mjs` and `kits/test.mjs`.

### 9.2 The debug handle (`game.debug`)

- **`snapshot()`** returns: `{ scene, day, slot, money, chips, partner, affinity, mood, flags, match: { phase, score,
  serving, touches, ball, players: [{ id, x, y, z, act }] }, ui: { screen, focus }, attract, dev }`.
- **`tools`**: `goto(scene, data)`, `newVacation(char, seed)`, `setDay(d, slot)`, `give(id, n)`, `money(n)`,
  `affinity(id, v)`, `partner(id)`, `match(opts)`, `forcePoint(side)`, `perfectPlayer(on)`, `cpuControl(on)`,
  `predict()` (each player's next t*, P* and kind), `step(n)`, `poolBot(on)`, `slotsForce(symbols)`, `deal(cards)`,
  `rouletteForce(n)`.
- The dev panel calls the same tools.

### 9.3 Suites: what each proves

| Suite | Cases |
| --- | --- |
| core | rng streams independent and reproducible; event bus; scene wrapper and overlays; TUNING reset; save migration |
| data | unique ids; a taste for every gift and fighter; ≥ 2 loves, ≥ 3 likes and ≥ 3 dislikes each; every shop item exists with a price; every cut and pattern is known; every NPC spot is on walkable floor; schedule weights are valid; every story speaker exists and has a voice and portrait; line counts per §5.7; every line fits 2 lines of the box (`E.font.width`); no "TODO", "TBD", "lorem" or "placeholder" anywhere in `src/`; no `Math.random(` in `src/` |
| ball | closed form vs stepped 1/120 s integration within .01 units over 3 s; `aim()` lands within .5 units; `timeAtHeight`; net clear / tape / net / antenna for constructed launches; in and out exactly at the line (r tolerance) |
| rules | rally scoring, win by 2, the cap; 4 touches; double touch; a block counts as a touch; serve rotation alternates within a team; every fault scores for the right side; the match-point flag |
| judge | boundaries at ±perfect, great and ok (inclusive); assist multipliers; first press only; reach, stretch and whiff; auto-receive |
| ai | calls respected in assignment; formation by phase; attack zones avoid defenders (statistically); spectacle mode ends rallies within 3–9 touches |
| match | AI vs AI over 20 seeds: it finishes; no phase stuck over 15 s; the ball never NaN or off the map; rally stats in range. A perfect bot beats Easy; an idle human loses 0–7. Golden Glare hides the ring, but not for a sunglasses wearer; Lucky Seven fires once; an ace triggers a replay; result stats add up to the score; same seed, same score |
| vacation | slots used correctly; night places; weather table; schedules (same seed, same places; pairs together; a pair at the beach every daytime slot); moods; affinity math; gifts (the accept/refuse table, one per slot, a refused gift returns); invite thresholds; partner break-up; prize money; day-end drift; autosave and load mid-slot |
| shop | buy, insufficient funds, caps; deals deterministic; equip and unequip; NPC suit acceptance by taste |
| story | every event fires at its slot under its conditions; endings A and B; New Vacation+ carries the right things over |
| poolhop | a perfect bot clears under time with all PERFECT; a wrong-button bot falls and recovers; double pads need both buttons; payout formula |
| casino | slots: payout per line, and RTP 89–95% over 200k seeded spins; blackjack: S17 and H17, 3:2 blackjack, double, split aces, reshuffle; roulette: payouts for every bet type, wheel order, results uniform over 37k spins (loose chi-square); cashier rounding |
| ui | focus moves spatially; hover via `input.feed('move', x, y)` focuses; click activates; right click goes back; prompts change with `lastDevice` and the glyph setting (✕, then A, then keycaps) |
| attract | 9.9 s idle stays on the title, 10.0 s starts the attract; a key, pad, mouse or touch returns to the title with the input consumed; it plays a match, then the montage beats in order |
| dev | the pause menu lists Dev Mode; opening it freezes time; moving a slider changes `G.T` and the behavior (gravity changes flight time); Reset all restores the defaults; jump tools land in the right scenes |
| netcode | Node fake hub at 150 ± 50 ms latency and 5% loss, 1 to 4 players: host and clients agree on every launch and score; claims inside the window are accepted and outside it rejected; the host waits for late claims; a leaver becomes a CPU; time-up gives the right standings; a server host with no player runs and finishes; messages per second within limits; unreliable messages under 1,200 bytes |
| playthrough | New Vacation as each fighter (6 fast runs): Day 1 tutorial won by a bot; D1 afternoon beach match; D1 night casino slots, blackjack and roulette; D2 morning buy a suit and give a gift; D2 afternoon Pool Hop; D2 night villa rest with a visit; D3 morning Promenade gifts; D3 afternoon rain match; D3 night the overheard call; D4 morning the letter and a postcard; D4 afternoon semifinal; D4 night rest; D5 morning shopping; D5 afternoon the final (won in 3 runs, lost in 3); D5 night party; ending; credits; results; title. Assert state at each step and no errors |
| browser | Playwright on `file://GAME.html` at 1280×720. A 30 s tour (title → menu → Beach Match quick start → a few points → pause → Dev Mode open and close → quit) with no console errors; the title has pixels; the attract starts after 10 s idle; an emulated touch-only device (`hasTouch`, `isMobile`; if Chromium still reports a fine pointer, stub `matchMedia` in `page.addInitScript`) shows "Controller or keyboard required" and no touch buttons; `tools/check.mjs GAME.html` passes; screenshots saved |
| hub | see below |

**The hub suite** (Playwright with a local server):

- Copy `harness.html`, `bridge.js` and `round.js` with `GAME.html` into `DEV/test-output/hub-serve/`.
- Start `python3 -m http.server 0 --bind 127.0.0.1` there and read the port it prints. Confirm the served page's title
  is ours before trusting a result.
- Run four URLs: `harness.html?game=GAME.html&players=4&latency=150&jitter=50&loss=5&auto=1`, the same with
  `&scenario=host-leave`, `&players=2&scenario=server`, and `&players=1&auto=1`.
- Each passes when `document.body.dataset.complete === 'true'` and `window.__hubCheck.pass === true`. On failure print
  the failing checks.
- Stop the server **by its own PID** at the end.

### 9.4 Art and animation checks

These are screenshots and filmstrips, outside the pass/fail count:

- the rig sheet;
- filmstrips (`tools/filmstrip.mjs --seed 1`) of the bump, set, spike, block, float and jump serves, dive, high-five,
  every celebration, and a Pool Hop hop and slip;
- every screen at 1280×720, at 1920×1080, and in a 4:3 window.

### 9.5 Screenshot review list

- **Front end:** title; menu; attract (the match and each montage beat); character select; invitation; arrival; tutorial
  callouts.
- **Travel and places:** island map (morning, night, rain); each location by day and by night; talk menu; a gift
  reaction; shop with try-on; wardrobe; the Journal's Friends page.
- **Minigames:** Pool Hop; casino floor; a slots jackpot; blackjack; roulette.
- **Photos:** photo mode; album.
- **Matches:** Broadcast and Serve Cam at day, sunset, night and in rain; the final with banners.
- **Story ends:** party; both endings; credits; results.
- **Multiplayer:** the Beach Match join screen with 4 players; the hub card.
- **System:** every dev panel tab; the pause menu; Settings with Button symbols; the touch-only title.

---

## 10. Packaging, About screen and exit interview

**Build `GAME.html`:** one file that works offline from `file://`. Check that:

- it opens with no console errors;
- the AI Hub client is the first script after `<meta charset>`, and the hub meta tags are present;
- there are no external requests (`check.mjs` lists any);
- `DEV/.src`, `DEV/hub` and the tests are not in it.

**About & Credits** (the pages of §4.20). Fill them at M10, truthfully; write "unknown" for anything you can't confirm.

1. **Credits.**
   - *Ahead or Alive: Xtreme Beach Volleyball* is an original parody-tribute inspired by *Dead or Alive Xtreme Beach
     Volleyball* (Team Ninja / Tecmo, Xbox, 2003). No assets from it are used.
   - Design, code, art, music and writing: the builder (name the model).
   - Engine: my-3D2dge v0.85.2 (MIT, github.com/michaelcrosato/my-3d2dge), modified (see Engine Feedback).
   - Motion clips via the engine's mocap sets: Quaternius Universal Animation Library (CC0), Mesh2Motion (CC0), the CMU
     Graphics Lab Motion Capture Database (free for all uses).
   - Store shapes, if used: Kenney (CC0).
   - The AI Hub session client and its version.
2. **Source Information:** TASK.md's 14 fields in its order: Date (2026-11-03 17:47:49), Source, Plan (`PLAN.md`), Genre
   and Perspective, Tech, Art Direction, Animation, Audio, Online, Testing, Research, Environment, Model, Usage.
   For Research, add your own to what this plan did: it read the engine handoff (API card, guide, index, asset card,
   the sports kit, the Humanoid, Dialog and audio source), the AI Hub protocol, client example and harness checks, and
   the engine repository's motion-capture catalogs. The source game was described from general knowledge, with no web
   research.
3. **Testing Feedback:** the four answers.
4. **Engine Feedback:** the six answers, including the list of engine patches.
5. **Prompt Feedback:** the four answers.

Put the same text in the final chat reply.

**`exit-interview.json`:** exactly TASK.md's shape, every value filled in, plain text. Suggested `aiHub` values:

```json
{
  "name": "Ahead or Alive: Xtreme Beach Volleyball",
  "tagline": "Stay ahead. Stay alive. Stay tanned.",
  "description": "A five-day island vacation of 2-on-2 beach volleyball, friendships, swimsuit shopping, pool hopping and casino nights, ending with a match for the island against its owner.",
  "type": "Game",
  "genre": "Sports",
  "source": "Dead or Alive Xtreme Beach Volleyball",
  "series": "Dead or Alive",
  "players": "1–4",
  "controls": "Stick/WASD move · Cross/Space/click hit on time · Square/E shot and block · Circle/Shift dive · Triangle/Q call",
  "tags": ["sports", "versus", "co-op", "pixel art", "comedy", "arcade"]
}
```

Check that it parses: `node -e "JSON.parse(require('fs').readFileSync('exit-interview.json', 'utf8'))"`.

**Working rules** (from TASK.md):

- Keep every dev file in `DEV/`, and don't read other agents' folders.
- Prefer `file://` and the engine's headless tools.
- Start a server only for the hub harness, bound to 127.0.0.1 on a port the OS picks, and confirm the page is ours.
- Stop only processes you started, by PID (never pkill, killall, or fuser -k).
- Use no subagents or workflows to review, judge or audit.

---

## 11. Definition of done

- [ ] Every item of §0's feature checklist works in `GAME.html`. No TODO, placeholder or stub text or art anywhere; the
      data suite's grep passes.
- [ ] A vacation plays from the invitation to the results through both endings, with save, load and Continue.
- [ ] Beach Match works with 1–4 local players (pads and a split keyboard).
- [ ] The AI Hub harness passes all four scenarios, and the game is unaffected outside a session.
- [ ] The attract mode starts after 10 s idle on the title or menu, shows matches and every montage beat, and any input
      exits it.
- [ ] Dev Mode opens from the pause menu, with its tools and live sliders, and Reset to defaults works.
- [ ] PlayStation glyphs by default and Xbox (A B X Y) in Settings; native keyboard and mouse with hover focus on every
      screen; prompts follow the last device.
- [ ] Touch-only devices show "Controller or keyboard required" with a Settings button and no touch controls, while the
      attract runs.
- [ ] Every sound is synthesized in code: music, effects, and gibberish voices for every speaker.
- [ ] `npm test` prints only failures and one count line, and the final run is green.
- [ ] About & Credits holds the Source Information and the Testing, Engine and Prompt Feedback; `exit-interview.json`
      parses.
