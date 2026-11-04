# Brigantime: The Legend of Forseasons

Build plan for a feature-complete demo inspired by **Brigandine: The Legend of Forsena** (Hearty Robin, PlayStation;
Atlus in North America, 1998). It is for the developers who will build the game from `TASK.md` and this file, who may be
other AI models working alone. Every number here is a starting value that the dev-mode sliders can tune.

**How to read it:** §0–§3 give the shape of the game and its code, §4–§5 the rules, §6 the content (look things up as
you build), §7–§11 presentation, UI, audio, modes and online, §12 the order to build in, §13 the risks, §14 how to test
each part, and §15 the definition of done.

**How the title was picked (as TASK.md asks):** I brainstormed 50 riffs on the source's name, then a real random number
generator (Python's `secrets.randbelow(50)`, which draws from the OS) picked #21 on 2026-11-03 at 17:57:56. The title then
shaped the design. *Brigan-time* is the name of an age of war and of a clock that is running out. *Forseasons* stands for
four seasons and four realms: the seasons drive the calendar, the elements, the terrain and the story.

---

## 0. At a glance

**Pitch.** The Keeper of the Wheel sleeps in Meridian, and the Great Clock that turns the seasons is failing. Four
season-realms, Verdance (Spring), Solmark (Summer), Amberlyn (Autumn) and Hoarfast (Winter), race one another and the
usurping Hourless Dominion to reach the Calendar City before the Thirteenth Month, when the Gray Knight will stop time
forever. The player picks a realm and musters Wheelsworn knights who bind monsters to their banners. Castles yield the
mana to summon beasts. Knights go questing, and armies march on neighbouring castles season by season. Every attack
becomes a turn-based hex battle of up to three troops a side, fought within twelve bells. Each season changes the land
(spring floods, summer fires, autumn gales, winter ice) and the strength of every army.

**Core loop (one sentence, write it at the top of `src/00-core.js`):** each season, read the tidings, muster your castles
(summon, bind, move, quest, equip, promote), declare your marches, then fight the battles they cause, growing knights and
monsters until you can take Meridian and defeat the Gray Knight before the Hour-Candle burns out.

**Genre:** turn-based grand strategy with a tactical RPG battle layer.

**Perspective:**
- Campaign: a three-quarter overhead diorama of the continent (the engine's `threequarter` view, north up, pan and zoom).
- Battles: a tilted overhead "board" view of a hex battlefield (a custom `E.View`, yaw 0, pitch 50), rotatable in 60°
  steps and zoomable, with the engine's `iso` view as the alternate (`V`).
- Story events: side-on stage scenes (the engine's `brawler` view) with live portraits in the dialog box.
- Title and attract mode: a diorama of the four seasons around Meridian's clock tower.

**Scope (all of it ships complete, with nothing stubbed):**

| Content | Count |
|---|---|
| Continent / castles / roads | 1 (Forseason) / 25 / 36 |
| Realms | 4 playable + the Hourless Dominion (AI only) + 4 neutral brigand castles |
| Knights | 36: 4 playable rulers, 16 realm knights, 6 Dominion knights (ruler included), the Gray Knight, 5 free knights, 4 brigand captains |
| Knight classes | 23: 5 lines × 3 tiers, plus 8 unique classes |
| Monster species | 30, each with 3 forms (tier 1 → 2 → 3) |
| Skills and spells / effects / items | 90 / 11 / 33 |
| Battle maps | 13 hand-made hex maps (all checked by script), dressed per region and changed per season |
| Story | about 40 events, 4 good endings, 3 kinds of bad ending, a tutorial battle |
| Modes | Campaign (1–4 players, hot-seat), Skirmish (2–4 sides, local humans or CPU), AI Hub shared-world skirmish (2–4 online), attract mode, dev mode |

A campaign lasts at most 16 seasons. A first win on Normal should take 2–3 hours with battles played by hand, or about
45 minutes with battles delegated.

**Deliverables (exact names):**
- Dev folder: `BrigantimeTheLegendOfForseasons-BrigandineTheLegendOfForsena-claude-opus-5-5-max-20261103-174758/` (called
  `<DEV>` below). GameTitle and SOURCE are written in PascalCase with the punctuation removed.
- The game: `BrigantimeTheLegendOfForseasons-BrigandineTheLegendOfForsena-claude-opus-5-5-max-20261103-174758.html`, one
  self-contained file in this folder's root, beside `TASK.md`.
- `exit-interview.json` in this folder's root, in TASK.md's exact shape (§15).
- The About/Credits screen and the final chat reply carry Source Information, Testing Feedback, Engine Feedback and Prompt
  Feedback (§10.4, §15). Plan: `PLAN.md`.

---

## 1. From the source to this game

### 1.1 What makes Brigandine distinctive, and what it becomes here

| Source trait | Mechanic in Brigantime |
|---|---|
| Months of war, each with an Organize phase and an Attack phase | Seasons (Spring → Summer → Autumn → Winter), each with **Tidings** (news), **Muster** (organize) and **March** (attack) |
| A continent of castles held by rival nations; pick one and conquer | Forseason: 25 castles on a wheel-shaped map, 4 playable season-realms, the Dominion at the hub, brigand castles between |
| Rune Knights lead troops of monsters; Rune Power limits how many | **Wheelsworn knights** lead a troop of up to 6 monsters; a knight's **Bond** caps the troop's total bond cost |
| Castles make mana; summoning costs mana; monsters cost upkeep | The same, plus seasonal yields and a **summon circle** per castle (taking castles unlocks new species) |
| Quests: a knight leaves for a while; mostly random help or harm | Quests to named sites with an outcome table (treasure, beasts, wanderers, mana, training, mishap) and short vignettes |
| Hex battles, one unit per hex, up to 3 troops a side; the attacker has 12 turns | Hex battles of up to 12 **bells** (a clock face counts them); an attacker knight on the Keep at the last bell also wins |
| A troop is beaten when its leader falls or retreats; a fallen ruler routs the nation | The same rules |
| Rune Area: monsters outside it weaken and are easier to capture | **Ward**: a radius around each knight; outside it monsters lose 20% ATK, DEF and INT and are easier to capture |
| Monsters at 0 HP die for good; knights are out for a month | Monsters at 0 HP die for good; knights are wounded and miss the next season |
| Elements red, blue, green, white and black, with opposites | **Seasons are the elements**: Spring opposes Autumn, Summer opposes Winter; **Hour** (the enemy's timeless element) stands apart |
| Scale: big monsters struggle to hit small, quick ones | Size classes S, M and L change hit chance (a dragon swinging at a pixie: −30%) |
| Spells can't be cast after moving; some special attacks can | The same: spells need planted feet; specials marked *mobile* work after moving |
| Knights change class; monsters promote | 5 class lines × 3 tiers plus unique ruler classes; every species has 3 forms |
| Brief, earnest story vignettes between turns, a path per nation | The same, with choices that set flags, recruit knights or change the AI |
| Grand Edition: up to 6 human nations; a final boss after conquest | Hot-seat for 1–4 humans; AI Hub online skirmish; the Gray Knight in the Clockwork Sanctum |
| *New, from the title* | **Seasonal Tide** (the season's element hits harder), **seasonal terrain** (floods, fires, gales, ice), the **Hour-Candle** deadline, the **Season Dials** puzzle in the final battle |

### 1.2 Originality guardrails
- The title riff is the only nod to the source's name. Never use the source's proper names: Forsena, Almekia, Esgares,
  Norgard, Caerleon, Iscalio, Leonia, Padstow, Lance, Zemeckis, Cador, Henguist, Vaynard, Lyonesse, Dryst, Cai, or any
  other source character, castle or monster name.
- The world, map, characters, plot, art, music and UI layouts are our own. Knight names come from public-domain
  Arthurian legend or are invented, which matches the source's Arthurian flavour without copying its cast.
- Monsters are generic folklore types (wolves, dragons, golems, pixies) drawn by our own rigs.

---

## 2. Folders, build and the working environment

```
<this folder>/                      TASK.md, STAGE.md, PLAN.md, the built .html, exit-interview.json
  <DEV>/
    engine/        a copy of my-3d2dge dist/handoff (v0.85.2): my-3d2dge.js (full engine, every module), modules/,
                   tools/ (check, filmstrip, replay, asset-*), docs/ASSETS.md, kits/ (reference only), package.json
    engine-ext/    new engine-level code: beasts.js (the Beast rig module, §7.5); changes to engine/ are edits in place
    vendor/hub/    AI Hub: session.js, harness.html, bridge.js, round.js, copied unmodified
    src/           the game: numbered files, concatenated in order into one IIFE (§3.2)
    tests/         run.mjs (the one test command) and the suites t-*.mjs
    tools/         build.mjs, simulate.mjs (balance runs), hub-check.mjs (harness driver)
    dist/          build output: game.js, index.html (the dev page), hub/ (harness files + a copy of the game)
    ENGINE-CHANGES.md   every change to engine/ or engine-ext/, and why (it feeds Engine Feedback)
```

- **Get the engine:** `git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/my-3d2dge.git` into
  a new empty directory, then `git sparse-checkout set dist/handoff`, then copy `dist/handoff/*` into `<DEV>/engine/`. Read
  its `README.md` and `API.md` whole; read the parts of `AI_GUIDE.md` named here; grep `API-INDEX.md` for names. Do the
  same for `https://github.com/michaelcrosato/ai-hub` with `lib/hub`, copied into `<DEV>/vendor/hub/`, and read its
  `README.md` whole.
- **Build (`node tools/build.mjs`):**
  1. Concatenate `src/*.js` in name order inside `(() => { 'use strict'; const E = My3D2dge, G = {}; ... })();` and write
     `dist/game.js`. Each file attaches what it defines to `G`; there are no other globals.
  2. Write `dist/index.html`, which loads `../engine/my-3d2dge.js`, `../engine-ext/beasts.js` and `game.js`, for
     development.
  3. Write the single file in this order: `<!doctype html><html lang="en"><head><meta charset="utf-8">`, then
     `<script>` holding `vendor/hub/session.js` verbatim (the first script, unmodified), then the hub meta tags (§11.2),
     the viewport meta, `<title>Brigantime: The Legend of Forseasons</title>` and the page style. The `<body>` holds the
     `E.bootSplash('BRIGANTIME')` markup and `<canvas id="screen">`, then one `<script>` each for the engine,
     engine-ext and the game. Escape every `</script` inside inlined code as `<\/script`.
  4. Fail the build if `src/` contains `TODO`, `FIXME`, `XXX`, `placeholder` or `lorem`, or if any asset URL is not a
     data URI.
- **Play:** open the single HTML file from `file://`. During development, open `dist/index.html`.
- **This machine:** at planning time `/tmp` was a full 9.8 GB tmpfs with 0 MB free, so command output written there
  gets lost. Set `TMPDIR=<DEV>/.tmp` before running Playwright or Chromium, and send long command output to files on the
  main disk. Delete nothing in `/tmp` that you did not create.
- **Servers** (only the hub harness needs one): run `python3 -m http.server 0 --bind 127.0.0.1` from `<DEV>/dist/hub/`
  and read the port it prints. Fetch the game page and check that its `<title>` is ours before trusting a result. Stop
  the server by its own PID only; never use `pkill`, `killall`, `fuser -k`, or kill whatever holds a port. Other agents
  share this machine and directory tree, so read only your own folder and the engine and hub sources.

---

## 3. Architecture

### 3.1 Layers

```
 data registries ──► simulations (pure, deterministic, JSON state) ──► events ──► presentation (scenes, art, audio, UI)
        ▲                     ▲                                                        │
        │                     └──── commands ◄── AI (campaign, battle) / input (pad, keys, mouse) / net (AI Hub)
```

- **Data.** Every content item is registered once with `G.def(kind, id, spec)`, then read with `G.get(kind, id)` and
  `G.all(kind)`. The kinds are `element, terrain, effect, skill, class, monster, knight, item, castle, map, site, event,
  realm, song, voice`. A validation suite checks that every id a spec refers to exists. Content never edits the code
  that runs it. This is how the rest of the game gets built later with ordinary designer tools: tables, ASCII maps and
  story nodes that a designer edits and the `data` suite checks, plus dev mode's jump, trigger and gallery tools to try
  any piece in seconds.
- **Simulations.** `G.BattleSim` and `G.CampaignSim` keep their state as plain JSON. They never touch the engine, the
  DOM, the clock or `Math.random`. Each one offers `legal(...)`, `apply(cmd) → events[]`, `forecast(...)` (battle),
  `serialize()`, `G.*Sim.load(json)` and `hash()`. Randomness comes from `G.Rng` (mulberry32), whose state lives inside
  the sim state, so the same seed and the same commands always give the same events. Tests assert this.
- **AI.** Pure functions turn a sim state into commands. They serve CPU realms, Delegate (auto-resolve), the attract
  mode, the hub host for players who time out, and the playthrough bot.
- **Presentation.** Engine scenes read sim state and play the event stream through `G.EventPlayer`: a queue in which each
  event type has a player that animates it and reports when it is done. Scenes turn input into commands. Presentation
  never writes sim state directly, so the battle the player watches is the same battle auto-resolve would compute.
- **Net.** The AI Hub layer wraps `BattleSim` in a protocol where the host's copy is the authority (§11).

### 3.2 Source files (concatenated in this order)

| File | Holds |
|---|---|
| `00-core.js` | `G` namespace, the core-loop line, `G.def/get/all`, `G.Rng`, hex helpers (`G.hex.center`, `toCell`, `corners`, `edgeDist`, `dirTo`, screen-direction → neighbour), the event bus `G.on/emit`, `G.tune` (live tunables) and `G.TUNE_DEFAULTS` |
| `01-data-rules.js` | elements and their relations, seasons and the Tide, terrain types and season transforms, size table, effects (statuses, buffs, debuffs) |
| `02-data-skills.js` | every skill and spell (§6.7) |
| `03-data-classes.js` | knight classes, growth, class changes (§6.6) |
| `04-data-monsters.js` | the bestiary: 30 species × 3 forms, rig specs, voices (§6.8) |
| `05-data-items.js` | items (§6.9) |
| `06-data-knights.js` | every knight: class, level, element, look, voice, personality (§6.5) |
| `07-data-world.js` | realms, castles, roads, circles, sites, starting state (§6.1–6.4, §6.11) |
| `08-data-maps.js` | the 13 battle maps as ASCII rows plus their dressing (§6.10) |
| `09-data-story.js` | events: triggers, conditions, `E.Story` nodes, effects, endings, rival lines (§6.12) |
| `10-data-about.js` | the About/Credits text: Source Information and the three feedback lists (§10.4) |
| `20-sim-battle.js` | `BattleSim`: setup and deployment, turn order, legality, actions, formulas, Ward, capture, bells, Keep, wins, EXP and levels, forecast |
| `21-ai-battle.js` | the battle planner (§5.13) and auto-resolve |
| `22-sim-campaign.js` | `CampaignSim`: calendar, phases, economy, summon, bind, move, quest, equip, promote, marches, battle queue, aftermath, Stillness, candle, wins and losses, event triggers |
| `23-ai-campaign.js` | the realm planner (§4.15) |
| `24-save.js` | the save format, versions, migration, the `game.saves` hookup |
| `30-art-palette.js` | realm and season palettes, `E.tones` helpers, sigils |
| `31-art-hexfield.js` | the battlefield: the hex floor baked through a `TileMap`'s `floorTex`, hex decals (range, path, Ward, cursor, danger), terrain props, raised hex blocks as shapes, season dressing, lights, weather |
| `32-art-worldmap.js` | the continent painted through `floorTex`, castles as `E.SHAPES`, roads, banners, troop figures, march arrows, season wipes |
| `33-art-units.js` | the unit visual factory: a Humanoid, Blob or Beast from a spec; move sets per class and species; portraits |
| `34-art-fx.js` | spell effects per element, status icons, summoning circle, capture chains, level-up and class-change flourishes, the bell clock face |
| `35-art-shapes.js` | new `E.SHAPES`: castles in six styles, keep, tower, rampart hex block, gate, clock tower, shrine, season dial, banner pole, ruins |
| `36-art-icons.js` | string sprites: element, size, item and status icons, sigils, PlayStation, Xbox and mouse glyphs, keycap frames |
| `40-audio-music.js` | every song (§9.1) |
| `41-audio-sfx.js` | custom sound effects (§9.2) |
| `42-audio-voice.js` | the babble voice synth and voice profiles (§9.3) |
| `50-ui-kit.js` | 10-foot widgets: `Panel`, `List`, `Grid`, `Card`, `Bars`, `Tabs`, `Slider`, `Toggle`, `PromptBar`, `Toast`, `Confirm`; the focus model (d-pad, stick, hover, click, wheel) |
| `51-ui-input.js` | the game's input presets (§8.2), glyph lookup per device, the PlayStation/Xbox setting, hot-seat input routing, idle tracking (attract), touch-only detection |
| `60-scene-title.js` | boot steps, title, the touch-only notice, the attract trigger |
| `61-scene-setup.js` | campaign setup (realm, players, devices, difficulty), skirmish setup |
| `62-scene-campaign.js` | the world map scene: Tidings, Muster panels, March, resolution |
| `63-scene-battle.js` | the battle scene: the camera, the player's commands, HUD, AI turns, event playback |
| `64-scene-event.js` | story stages, `E.Story` runner, emotes |
| `65-scene-results.js` | battle results, endings, credits roll |
| `66-scene-about.js` | About/Credits, How to Play |
| `67-scene-attract.js` | the attract reel |
| `70-dev.js` | the dev panel: tools, sliders, overlays, the gallery scene |
| `80-net-hub.js` | AI Hub session: connect, roles, protocol, timers, scoring, finish (§11) |
| `81-local-mp.js` | hot-seat seats, device binding, privacy screens |
| `90-main.js` | `new E.Game(...)`, menu items, settings, scenes, deep links, `game.debug`, `game.start` |

### 3.3 What the engine provides (use it; don't rebuild it)
- `E.Game` with `res: 'ps1', expand: true` (320 × 240 at least; a 16:9 screen shows about 427 × 240), scenes, `go` with
  transitions, standard pause, settings, controls and rebinding, full screen, `game.saves`, boot steps, `game.debug`, and
  headless `game.advance`.
- `E.TileMap`, whose `floorTex` bakes the hex battlefield and the continent. `E.Grid(w, h, { hex: 'pointy' })` gives
  neighbours, distances, `path`, `reach` (with `blocked` and `pass`), `line` and `shape`.
- `E.Humanoid`, its moves (`E.MOVES`), poses, expressions and `drawPortrait`; `E.Blob` (slimes, wisps, bats); `r.actor`,
  `r.queue`, `r.decal`, `r.shape`, `r.prop`, `r.shadow`, `r.pick`.
- Particles, `game.hitFx`, `game.flash` and `game.shake` (comfort-aware), canvas lighting (plus `enableGPU({ map })` where
  WebGPU exists), weather, `E.Backdrop`.
- `E.Story` with `E.Dialog` (portraits, markup, choices, emotes, backlog); `E.Menu` for plain lists; `game.input`
  (presets, `label`, `glyphs`, `lastDevice`, players, `allowJoin`); `game.audio` (step-sequencer music, sfx, `ctx`);
  `game.tween`, `game.script`, `E.Path`, `E.rng`.
- Not used: physics, mode7, road, drive, fight, click, terrain, rooms (they stay in the engine file, unused).

### 3.4 Planned engine changes (log each one in ENGINE-CHANGES.md)
1. **`E.Dialog` per-letter voice.** `voice` may be a function `(ch, index, talk)` called for each typed character, so
   Animalese voices can follow the text. The default `'text'` blip stays as it is.
2. **An effects bus.** Expose `game.audio.sfxBus`, a GainNode under the master gain, so custom Web Audio voices follow
   volume and mute. If the engine already has one under another name, use it and note that instead.
3. **`engine-ext/beasts.js`, a new module** written like an engine module with its manual in the header: `E.Beast` rigs
   (quadruped, drake, avian and serpent bodies) and `E.Wings` (insect, feather or bat wings drawn with a Humanoid), with
   the Humanoid's interface: `update(dt, state)`, `draw(g, ox, oy, view)`, `drawPortrait(g, x, y, size)`, plus
   `mouth()` and `tip()` points for breath and projectiles (§7.5).
4. **Only if missing:** registering a custom view by name so scenes can use `view: 'board'`, and input idle time for the
   attract mode. Check the pinball kit for how it uses `new E.View(...)`. Anything else found missing is fixed in place
   and logged.

### 3.5 Saves, settings and tunables
- **A save** is `{ v, campaign: CampaignSim.serialize(), story: story.state(), meta: { realms, season, year, played } }`,
  stored through `game.saves.write` and `read` (3 slots plus the autosave; `menu: { saves: true }` with `version` and
  `migrate`). `saves.canSave` is true only on the campaign map during Muster. Autosave runs at every Tidings and before
  every battle the player commands.
- **Settings:** the engine's own plus the game's (§10.6).
- **Tunables:** `G.tune` is one live object the sims read every time (Appendix A). Dev mode edits it; changed values are
  kept under `E.store` key `brigantime:tune`; Reset copies `G.TUNE_DEFAULTS` back. Saves don't store tunables. Hub
  sessions always use the defaults.

### 3.6 Scenes and deep links
Scenes: `title`, `attract`, `setup`, `skirmishSetup`, `campaign`, `battle`, `event`, `results`, `ending`, `credits`,
`about`, `help`, `gallery` (dev), `hub` (session play). Gameplay scenes are `pausable: true`; title, attract, endings
and credits are not. Deep links (for tools, filmstrips and tests; ignored inside a hub session) are `#title`, `#attract`,
`#campaign/<realm>`, `#battle/<map>/<season>/<preset>`, `#event/<id>`, `#ending/<id>`, `#about`, `#help`, `#gallery`
and `#skirmish`.

### 3.7 `game.debug` (the handle tests and tools read)
- `snapshot()` returns `{ scene, phase, season, year, candle, realm, mana, focus, panel, prompts: [labels shown],
  battle: { map, bell, troop, mode, cursor, units: [[id, side, cx, cy, hp, mp, status]], over }, event, touchOnly,
  attract: { beat }, errors }`.
- Helpers: `newCampaign({ realms, humans, difficulty, seed })`, `startBattle(spec)`, `sim()`, `cmd(c)`,
  `autoplay(on)`, `setTune(k, v)`, `resetTune()`, `trigger(eventId)`, `jump(season, year)`, `hash()`.

---

## 4. Campaign rules (`CampaignSim`)

### 4.1 Calendar and the Hour-Candle
- One turn is one season: Spring → Summer → Autumn → Winter. The campaign opens in Spring of Year 1 ("Spring, Year 1 of
  the Brigantime").
- The event `candle_lit` (Spring, Year 2) lights the **Hour-Candle** with `tune.candleSeasons` seasons (Easy 16,
  Normal 12, Hard 10). Each later Tidings burns one. If a Tidings finds it at 0 and the Gray Knight still stands, the
  Thirteenth Month falls and the player loses. On Normal the last playable season is Winter of Year 4. The HUD shows the
  candle and the seasons left from the moment it is lit.

### 4.2 Seasons outside battle
- **Income:** castles whose region's season is the current season yield +25% (`tune.seasonYield`).
- **Wintering:** in Winter, every non-Winter monster's upkeep is +25% (`tune.winterUpkeep`).
- **AI:** a realm in its own season has ×1.2 aggression.
- **Presentation:** the map recolours and its weather, music and Tidings banner change ("WINTER. Hoarfast's knights grow
  bold.").
- Effects inside battles are in §5.11.

### 4.3 The three phases of a season
1. **Tidings** (automatic, one card at a time; confirm advances, hold to skip all):
   1. the season card (the Wheel turns to the new season, with that season's sting);
   2. the candle burns, if it is lit;
   3. recovery: wounds tick down, every unit at a castle returns to full HP and MP, and last season's Stilled castle
      wakes;
   4. Stillness picks a new castle (§4.16);
   5. quests return (§4.9);
   6. income minus upkeep, per realm (the report shows the player's own);
   7. story events (at most 3 scenes a Tidings; the rest wait for the next one, §6.12);
   8. the AI realms run their Muster instantly (their results are visible on the map).
2. **Muster** (each human realm in seat order; a privacy card between humans, §10.8): the actions in §4.5–4.11, in any
   order, as often as their limits allow. End with □ (Space on a keyboard) held for 0.6 s, or Commands → End Muster, then a confirm.
3. **March:** each human declares attacks (§4.12), then each AI realm declares (hidden until resolution), then the
   battles resolve (§4.13). After the last aftermath, the season ends and the next Tidings begins.

### 4.4 Castles
Each castle has `{ id, name, region (season or hour or neutral), tier, mana, circle: [species], site, map,
treasury, pos: [x, y], roads: [ids] }` from data (§6.2) and `{ owner, knights: [ids], reserve: [monster ids], stilled,
treasuryTaken }` in state. At most 6 knights can be stationed in one castle. Every player sees every castle's knights
and troops (the source hides nothing, and neither does this game).

### 4.5 Mana
- **Yields per season:** capital 40, inner castle 25, flank castle 20, cross-quarter (brigand) castle 30, Hour satellite
  30, Meridian 60. All are scaled by `tune.manaIncome`.
- **Starting mana:** 120 for each season-realm and 300 for the Dominion. Brigands have no economy.
- **Each Tidings:** mana += income − Σ upkeep. If the result is below 0, monsters desert one at a time, the lowest power
  per point of upkeep first, until mana ≥ 0 (each loss is reported).

### 4.6 Summon
At an owned castle that is not Stilled, pick a tier-1 species from its circle (entries marked with a season can be
summoned only in that season). Pay `cost × tune.summonCost`. The monster appears in the castle's reserve at level
`max(1, floor(average level of the realm's knights / 2))`. Each castle allows at most 3 summons per season. Upkeep is
charged from the next Tidings.

### 4.7 Bind (Organize)
Move monsters between a castle's reserve and the knights stationed there. A troop holds at most 6 monsters, and their
bond costs (rank, §6.8) may not add up to more than the knight's **Bond** (class base + floor(level / 4), plus items).
Each knight also has a **formation** (Vanguard, Shield or Column, §5.2). A reserve monster can be **dismissed** (it is
gone; ask first).

### 4.8 Move
A knight with its troop (not wounded, not questing) may move once per Muster to an adjacent castle of its own realm,
but not into or out of a Stilled castle. Moving does not stop it marching from its new castle.

### 4.9 Quests
- **Who:** any knight who is not a ruler, not wounded and has not moved this Muster. It leaves with its troop for the
  site's duration (1 or 2 seasons). At most 2 knights per realm may be away at once.
- **The outcome is rolled at departure** (seeded) and revealed in a vignette when the knight returns. Base weights:

| Outcome | Weight | Effect |
|---|---|---|
| Treasure | 30 | an item from the site's pool |
| Beast | 20 | a monster from the site's pool joins the troop (or the castle reserve), at level = knight level − 2 |
| Wanderer | 10 (0 if none is free) | a free knight from the site's region joins (§6.5.6) |
| Mana spring | 15 | +40 to +80 mana |
| Training | 15 | +60 EXP for the knight, +40 for each monster in its troop |
| Mishap | 10 | the knight returns wounded (out 1 season); 30% chance its weakest monster is lost |

- **Modifiers:** Cleric line +10 Treasure; Beast line +15 Beast; Ranger line +10 Wanderer; knight level 10 or more:
  Mishap −5; the Lucky Horseshoe multiplies the four good outcomes by 1.15; a site's focus adds +10 to its outcome (§6.11).
  Story sites override the table (§6.12).

### 4.10 Equip and items
- Items sit in one inventory per realm. A knight has three slots: weapon, armor and accessory.
- Each class line allows certain weapon kinds: Warrior (sword, spear, axe), Ranger (bow), Mage (staff, tome), Cleric
  (staff, mace), Beast (whip, spear); rulers per class (§6.6).
- Consumables can be used during Muster on any unit at the same castle. They can also be used in battle by knights
  (the Item action, §5.4), from the realm inventory.

### 4.11 Promotions and class changes (Muster only, with an animation and a jingle)
- **Monsters:** tier 2 at level 12, or with the matching Season Seed from level 6; tier 3 at level 22, or with a Seed
  from level 16. Hour monsters promote by level only. The level stays, the new form's base stats apply, and the bond
  cost does not change.
- **Knights:** tier 2 at level 10 (free); tier 3 at level 20 plus a Writ of Knighthood. At the change every stat is
  multiplied by 1.10 (§6.6).

### 4.12 Declaring a march
- Pick an enemy or neutral castle adjacent to at least one of yours, then up to 3 knights (each with its troop) from your
  castles adjacent to the target.
- Wounded, questing or Stilled knights can't march, and each knight marches at most once a season.
- Several attacks per season are allowed, one per target.
- A castle you leave with no knights is open: an enemy attack on it takes it without a battle.
- Arrows on the map show every declaration (the AI's appear at resolution).

### 4.13 Resolution
1. Sort every declared attack by the attacker's highest knight level (descending), then by attacking power, then by a
   seeded tie-break.
2. For each attack in turn:
   - If the target already belongs to the attacker, or every attacking troop is gone, skip it.
   - If the target holds no knights, it changes hands ("The gates stand open").
   - Otherwise there is a battle. If a human commands either side, ask **Command** (fight it) or **Delegate**
     (auto-resolve, §5.14); otherwise auto-resolve.
3. Apply the aftermath (§4.14) after each battle, before the next one. Units keep their damage until the next Tidings,
   so a castle attacked twice in one season fights the second battle hurt.

### 4.14 Aftermath
- **If the attacker wins:** the castle changes owner and the attacking troops occupy it.
  - Surviving or retreated defending knights fall back to the nearest castle of their realm, by roads. If that castle
    is not adjacent, they still go there. If the realm has no castle, it is eliminated.
  - Unbound monsters in the castle's reserve join the new owner's reserve.
  - The first time a castle is taken, its treasury item goes to the winner.
  - A brigand castle taken by a human triggers `brigands_no_more` (§6.12).
- **If the defender wins:** the attacking troops go home to the castles they came from.
- **Losses:** knights at 0 HP are wounded (they miss the next season: no move, march or quest, but they can be
  organized). Monsters at 0 HP are dead. Captures follow §5.9. A ruler at 0 HP or retreating loses the battle for its
  side.
- **Elimination:** a realm with no castles is out. Its knights become free and join the wanderer pools of their old
  regions; its ruler goes into exile. If it was the player's only realm, the game is lost (in hot-seat, that human
  watches until the game ends).

### 4.15 Campaign AI (`23-ai-campaign.js`, deterministic per seed)
- **Power:** `power(unit) = (HP + 4 × (ATK + DEF + INT) + 2 × AGI) × (1 + 0.05 × (level − 1))`, ×1.2 for knights. A
  troop's power is the sum over its units. `defense(c)` = the power of the troops at c × 1.25 (the Keep).
- **Threat:** `threat(c)` = Σ over adjacent castles of other season-realms (and of the Dominion once it is active) of
  their marchable power × that realm's aggression (×1.2 in its own season). `need(c) = threat(c) − defense(c)`.
- **Muster, in order:**
  1. **Summon** while mana > 1.5 × upkeep + 40. Pick the castle with the highest need. Score each option by power per
     mana × 1.2 if its element opposes the strongest neighbouring realm's element, × 1.1 if its element is next
     season's. Bind the monster to a knight there with free Bond, or keep it in reserve.
  2. **Bind** reserve monsters to knights with free Bond, strongest first.
  3. **Move** up to 3 troops, each from the castle with the most surplus to an adjacent castle with the highest need.
     Never leave a border castle (one adjacent to a foe) without a knight.
  4. **Quest** with knights at interior castles that have no need (at most 2 away), at the site with the best expected
     value.
  5. **Equip** the best item per slot (ATK for warriors, rangers and tamers; INT for mages and clerics; armor by DEF;
     accessories by Bond, then Spurs, then Ward). **Promote** and class-change whenever eligible.
- **March:**
  - For each adjacent foreign castle, the attackers are troops that are not needed at home. A troop is needed if taking
    it leaves `need(c) > 0.4 × threat(c)` or leaves a border castle empty.
  - `ratio = Σ top-3 attacker power / defense(target)` (an empty castle is ∞). Attack if `ratio ≥ threshold /
    aggression`, where threshold is 1.6 / 1.3 / 1.1 on Easy / Normal / Hard.
  - Target value: Meridian ×1.5 (if the realm holds an adjacent satellite), capitals ×1.3, brigand castles ×1.2 in Year
    1; then the highest ratio. Each troop marches once.
- **Personalities:**

| Realm | Aggression | Quirk |
|---|---|---|
| Solmark | 1.15 | ×1.3 in Summer; prefers the weakest neighbour |
| Hoarfast | rolled each season between 0.9 and 1.4 ("the Duke's moods") | ×1.3 in Winter |
| Amberlyn | 0.85 | sends up to 3 questers; keeps one extra troop at its capital |
| Verdance | 1.0 | takes brigand castles first |
| Hourless Dominion | 0 in Year 1, 0.8 in Year 2, 1.1 from Year 3 | never leaves Meridian with fewer than 2 troops; summons only Hour monsters |
| Brigands | 0 | never march or summon; full HP at each Tidings |

### 4.16 Stillness
From Autumn of Year 3, each Tidings the Gray Knight stills one castle (seeded) that borders Dominion territory, other
than Meridian. For that season it yields no mana, and its troops can't move, march or quest (they defend normally). It
is drawn in grey with a stopped-clock icon. The first time, the `stillness` event plays; after that a toast announces it.

### 4.17 Winning and losing
- **Win:** defeat the Gray Knight in the Clockwork Sanctum. That battle becomes available the moment your realm takes
  Meridian (§6.12, `meridian_falls`). If you lose it, your troops fall back into Meridian, and you can attack the
  Sanctum again from Meridian in a later March (the Sanctum shows as a special target beside Meridian).
- **Lose:**
  - your realm loses its last castle;
  - the candle burns out;
  - or a rival realm holds Meridian and wins its Sanctum battle. When an AI realm takes Meridian, it fights the Sanctum,
    auto-resolved, at the next Tidings. If it wins, it "sets the Wheel" to its season and you lose (a rival's bad
    ending). If it loses, Meridian returns to the Dominion with a fresh garrison (2 troops, level 14).
- **Hot-seat:** the first human to win wins for everyone; the others see their own epilogue card.

### 4.18 Difficulty (chosen for each new campaign)

| | Easy | Normal | Hard |
|---|---|---|---|
| AI mana income | ×0.8 | ×1.0 | ×1.25 |
| AI march threshold | 1.6 | 1.3 | 1.1 |
| Candle seasons | 16 | 12 | 10 |
| Enemy battle AI | picks from its top 3, weighted | the best plan | the best plan, plus focus fire |
| Player EXP | ×1.25 | ×1.0 | ×1.0 |

---

## 5. Battle rules (`BattleSim`)

### 5.1 The field
- Pointy-top hexes in offset rows (odd rows shifted right): `new E.Grid(w, h, { hex: 'pointy', walkable, cost })`.
- A hex is `T = 28` world units across the flats; `grid.center(c, 28)` gives its centre.
- Maps run from 13 × 9 to 17 × 13 hexes, with one unit per hex.
- The field is flat (z = 0). Height comes from terrain types and props, as in the source's flat hex maps. Raised blocks
  (ramparts, gears, cliffs) are impassable shapes (§7.2).

### 5.2 Sides and deployment
- Two sides, attacker and defender, each with up to 3 troops. A troop is one knight and up to 6 monsters.
- Troop anchors are hexes `1 2 3` (attacker) and `7 8 9` (defender). The defender's first troop takes the anchor next to
  the Keep. Skirmish and hub maps use seat anchors `1 2 3 4`.
- The knight stands on the anchor, and its monsters fill the free hexes nearest it according to its formation:
  - **Vanguard:** hexes 1–2 steps toward the enemy's side first.
  - **Shield:** the ring around the knight first.
  - **Column:** a line behind the knight, away from the enemy.
- Units face the enemy side.

### 5.3 Bells and turn order
- A battle lasts up to `tune.bells` (12) bells.
- Each bell, troops act in order of their knight's AGI (descending; ties go to the defender, then the lower troop id).
- In a troop's turn, each of its units acts once, in any order its controller likes. The troop ends when all have acted
  or its controller ends it (the rest Wait). A troop whose knight has fallen is gone.
- **At the end of each bell:**
  1. effects tick (§5.8);
  2. the Keep heals its owner's unit standing on it by 10% of max HP;
  3. map rules run (the Sanctum's Hands and Dials, §6.10; the hub's season advance, §11);
  4. the win checks run (§5.10).
- Each new bell tolls a bell sound and the clock face's hand moves.

### 5.4 A unit's turn
- **Move:** up to MOV, paying terrain costs (§5.7). A unit can't enter or pass enemies, can pass allies, and can't end
  on an occupied hex. Before acting, a move can be undone with Back.
- **Then one action, or one action with no move:**

| Action | Rule |
|---|---|
| Attack | the unit's basic attack (range and power from its spec); allowed after moving |
| Special | a skill of kind `special`; after moving only if it is *mobile*; some (Charge, Dive) require moving at least 2 hexes this turn |
| Spell | a skill of kind `spell`; **only if the unit has not moved this turn** |
| Item | knights only: a consumable from the realm inventory, on itself or an adjacent ally |
| Guard | +30% DEF and +10 evasion until its next turn; allowed after moving |
| Retreat | knights only: the troop leaves the field at once (capture rolls, §5.9). A ruler's retreat loses the battle |
| Wait | end the unit's turn |

- MP: skills cost MP. Each unit regains 2 MP at its troop's turn start.

### 5.5 Stats
- HP, MP, ATK, DEF, INT (magic power and magic defense), AGI (evasion, hit, crit, turn order) and MOV.
- Tags: element (Spring, Summer, Autumn, Winter or Hour), size (S, M, L), and flags: flier (ignores terrain cost and may
  cross blocked hexes but not end on ramparts), swimmer (water costs 1, deep water is walkable), floater (swamp and
  shallows cost 1).
- Knights also have Bond and Ward radius (§6.6).
- Levels run from 1 to 40, and 100 EXP gives a level, applied at once with a popup.

### 5.6 Formulas (every constant is in `G.tune`, Appendix A)
- **Ward:** a monster outside its own knight's Ward (hex distance > radius) has ATK, DEF and INT × (1 − `wardPenalty`
  0.20).
- **Hit chance (physical):** `clamp(baseHit 85 + (A.AGI − D.AGI) + sizeHit[A.size][D.size] + flank − terrainEvade(D) −
  5 × max(0, dist − 2) − weather − (D guarding ? 10 : 0), 15, 99)`.
  - `sizeHit` (attacker row, target column S / M / L): S: 0 / 0 / +10; M: −10 / 0 / +10; L: −30 / −10 / 0 (the L row
    is `tune.largeVsSmall`).
  - `flank` = +5 for each other unit of A's side adjacent to D, at most +15.
- **Physical damage:** `max(1, round((A.ATK × P − D.DEF × defFactor 0.5) × dmgScale × elem × tide × terrainDef × guard ×
  surround × crit × var))`.
  - P is the attack's power (a basic attack is 1.0).
  - `elem` is 1.30 (`elemStrong`) when A's element opposes D's (Spring ↔ Autumn, Summer ↔ Winter), 0.80 (`elemSame`)
    when they match, and 1.0 otherwise. Hour is 1.0 both ways, except anti-Hour skills (§6.7).
  - `tide` = attacker factor × target factor, from §5.11.
  - `terrainDef` = 1 − D's terrain DEF bonus. `guard` = 0.7 if D guards.
  - `surround` = 1 + 0.10 × (A's allies adjacent to D, at most 3).
  - `crit` = 1.5 with chance `critBase` 3% + A.AGI / 4 % (at most 30%).
  - `var` is uniform between 0.9 and 1.1.
- **Magic damage (always hits):** `max(1, round((P + A.INT − D.INT × 0.5) × magicScale × elem × tide × var))`, where P
  is the spell's power (14, 22 or 34 for bolts, storms and tempests). Areas hit everyone in the shape, friends included.
- **Breath, cone and line specials** use the physical formula, always hit, and apply the element.
- **Healing:** `round((P + A.INT × 0.8) × healScale)`.
- **Status chance:** `clamp(base + A.INT − D.INT, 10, 90) × statusScale`. Bosses halve it; the Warding Charm makes its
  wearer immune to Sleep and Stop.
- **EXP:**
  - per damaging hit: `clamp(8 + 2 × (D.level − A.level), 2, 30) × expScale`;
  - a KO: +20 (a knight +40, a ruler +60);
  - a heal or buff: +8;
  - at the end: +10 for each survivor of the winning side, +4 for the losing side.
- **Level-up growth:** for each stat, `floor(g)` plus 1 more if a seeded roll falls under `g − floor(g)`.

### 5.7 Terrain

| Code | Terrain | Move cost | DEF | Evade | Season transform and notes |
|---|---|---|---|---|---|
| `.` | plain | 1 | 0 | 0 | Winter → snow |
| `,` | road | 1 | 0 | 0 | — |
| `f` | forest | 2 (L: 3; fliers 1) | +20% | +10 | Summer: burns under Summer area spells; Autumn: +10% DEF only (leaf-fall) |
| `h` | hill | 2 (fliers 1) | +10% | +5 | ranged attacks from a hill get +1 range; melee from a hill +10% damage |
| `m` | mountain | blocked (fliers 1) | +20% (a perched flier) | +10 | — |
| `~` | shallows | 2 (swimmers and fliers 1) | −10% | −10 | Spring on flood maps → deep water; Summer: cost 1; Winter → ice |
| `w` | deep water | blocked (swimmers and fliers 1) | 0 | 0 | Winter → ice |
| `L` | lake | as deep water | 0 | 0 | Winter → ice (a frozen lake opens the map) |
| `s` | swamp | 3 (fliers and floaters 1) | −10% | −10 | Summer → plain (dried); Winter: cost 2 |
| `F` | field | 1 | 0 | 0 | Summer: tall wheat, +10 evade; Autumn: stubble; Winter → snow |
| `r` | ruins | 1 | +10% | +5 | — |
| `#` | rampart, gear or building | blocked (fliers may cross but not end there) | — | — | drawn as a raised hex block (§7.2) |
| `g` | courtyard or gate | 1 | +10% | 0 | — |
| `b` | bridge | 1 | 0 | 0 | — |
| `K` | Keep | 1 | +25% for its owner | 0 | owner heals 10% per bell on it; the attacker's seize objective |
| `D` | season dial | 1 | 0 | 0 | the Sanctum only (§6.10) |
| — | snow | 2 for non-Winter walkers, 1 for Winter units and fliers | 0 | 0 | from plain or field in Winter |
| — | ice | 1 | 0 | −10 | from water in Winter; non-Winter units on ice −10 hit |
| — | burning forest | 2 | 0 | 0 | lasts 2 bells; a unit starting its turn there takes 10% max HP; then it becomes ash |
| — | ash | 1 | 0 | 0 | after burning |

### 5.8 Effects (statuses, buffs and debuffs)

| Effect | Kind | Rule | Lasts |
|---|---|---|---|
| Poison | status | −8% max HP at its troop's turn start | 3 bells |
| Burn | status | −5% max HP at turn start, DEF −10% | 2 bells |
| Chill | status | MOV −1, AGI −20% | 2 bells |
| Sleep | status | skips its turns; wakes when damaged | 2 bells |
| Stop | status | skips its next turn, then is immune to Stop for 1 bell | 1 turn |
| Valor | buff | ATK +20% | 2 bells |
| Haste | buff | MOV +1, AGI +20% | 2 bells |
| Warded | buff | DEF +20%, and magic damage taken −20% | 2 bells |
| Guarded | buff | the Guard action (§5.4) | until its next turn |
| Weakened | debuff | ATK −15% | 2 bells |
| Exposed | debuff | DEF −20% | 2 bells |

A unit holds one copy of each effect; reapplying refreshes the duration. Remedy and Purify clear statuses and debuffs.

### 5.9 Knights falling, retreat, capture and death
- When a knight drops to 0 HP or retreats, its troop leaves the field. Each of its monsters still standing rolls for
  capture if it is adjacent to an enemy knight or inside an enemy knight's Ward:
  - chance = `captureBase` 25% + 25% if it was outside its own knight's Ward + 15% if below 30% HP, at most 75%;
  - bosses and Hour elites (Pendulum Wyrm forms) never roll;
  - a captured monster is taken by the nearest enemy knight (shown with a chain of light). After the battle it joins
    the winner's reserve at the contested castle if its captor's side won, or the reserve of the captor's home castle
    if it lost;
  - every other monster retreats with its knight.
- If a ruler falls or retreats, every knight on its side retreats at once and the side loses.
- Monsters at 0 HP die and are gone for good (the Phoenix's Rebirth is the exception, §6.8). Knights at 0 HP are wounded
  for the next season.

### 5.10 Winning
- A side loses the moment it has no knights on the field.
- At the end of the last bell, the attacker wins if one of its knights stands on a Keep hex; otherwise the defender wins
  and the attackers go home.
- The Clockwork Sanctum and the hub skirmish have their own rules (§6.10, §11).

### 5.11 Seasons in battle (the Forseasons rules)
- **Seasonal Tide:** units whose element is the battle's season deal +15% (`tideBonus`) and take 10% less damage. Units
  of the opposed element deal −15%. Hour units ignore the Tide. Winter of Year 1 is the Long Winter: the Winter Tide is
  +30%.
- **Terrain transforms** apply when the battle is built (and at every bell in the hub skirmish): see the season column
  of §5.7. A map flagged `flood` turns its shallows to deep water in Spring, so bridges become the choke points.
- **Weather:** Spring rain gives −5 hit to ranged attacks. Summer is clear: Summer area spells set forests burning.
  Autumn gales give fliers −1 MOV. Winter's cold gives non-Winter units −5 hit.
- The HUD's season badge says all this in one line, and units affected show ▲ (Tide) or ▼ (against) on their cards.

### 5.12 Forecast
`sim.forecast(unit, action, target, fromHex)` returns `{ hit, dmg: [min, max], crit, ko, status: [name, chance],
elem: 'strong' | 'weak' | null, tide, captureRisk }` for each unit the action touches. The HUD shows it before every
confirm (§8.5, item 14).

### 5.13 Battle AI (`21-ai-battle.js`)
- **Per unit, in troop order:** first units that can cast or shoot without moving, then monsters nearest the enemy, and
  the knight last, so that its Ward covers the troop.
- For every reachable hex `h` (`grid.reach`, enemies blocked, allies passable) and every legal action and target from
  `h` (spells only from the start hex), score:
  - `+ Σ expected damage to foes × (1 + 0.5 × knight + 1.0 × ruler)`;
  - `+ expected KO bonus` (30, 70 for a knight, 110 for a ruler);
  - `− 1.5 × expected damage to friends`;
  - `+ 1.2 × healing × (knight ? 2 : 1)`;
  - `− danger(h) × (knight ? 1.5 : 0.6) × (HP < 40% ? 2 : 1)`, where `danger(h)` is the expected damage foes could deal
    at `h` next bell;
  - `− 12` if a monster ends outside its Ward;
  - `+ 10 × terrain DEF`;
  - objective terms: from bell 8, attackers `− 2 × distance(h, Keep)` and defending knights `− 3 × distance(h, Keep)`;
  - when no target is in reach: melee `− 1.2 × distance to the nearest foe`; ranged and casters `− 1.5 × |distance −
    3|`.
- Take the best score; ties go to the first in a fixed order.
- A non-ruler knight below 25% HP whose side is losing on power may Retreat. Rulers never retreat (their danger weight is
  ×3 instead).
- Easy picks among its top 3 (weights 3 : 2 : 1); Hard adds +15 for targets already damaged this bell.
- The same state always gives the same plan, so a bot running both sides is a repeatable test.

### 5.14 Delegate (auto-resolve) and speed
- **Delegate** runs the same `BattleSim` with the AI on both sides to the end, in one synchronous loop with no drawing,
  and shows a summary card (losses, captures, level-ups).
- Animation speed comes from the setting (Full, Fast, Minimal). Holding ✕/Enter during AI turns plays at 4×.

---

## 6. Content

### 6.1 The world: Forseason
- **Shape:** a round continent (radius about 470 world units) on a 1024 × 1024 map (64 × 64 tiles), with the sea all
  around it.
- **The centre:** the grey Hour plateau with Meridian, the Calendar City, whose great clock tower is visible from
  everywhere.
- **The four quarters, one realm each, each in its native season's look:**
  - north, Hoarfast: snowfields, pine forests, frozen lakes and the Rimewall mountains;
  - east, Verdance: green meadows, blossoming orchards, rivers and lakes, spring rain;
  - south, Solmark: golden savanna, red mesas, dunes and palms along the coast;
  - west, Amberlyn: amber farmland, oak woods, pumpkin fields, misty bogs and watermills.
- **The cross-quarter marches** (NE Thaw, SE Beltane, SW Lammas, NW Hallow) blend their two neighbours. Brigand free
  companies hold them.
- **The current season tints everything:** a dusting of snow in Winter, blossoms in Spring, gold in Summer, falling
  leaves in Autumn.

### 6.2 Castles (positions in world units on the 1024 × 1024 map)

| id | Name | Region | Tier | Start owner | Mana | Battle map | Summon circle (tier-1 species; a season in brackets means only then) | Quest site | Treasury | Pos |
|---|---|---|---|---|---|---|---|---|---|---|
| meridian | Meridian, the Calendar City | hour | capital | Dominion | 60 | meridian_clockyard | minute, clockwork, gearhound, stillwraith, pendulumwyrm | The Sleeping Court | Hourglass Rod | 512,512 |
| midnight | Midnight Keep | hour | satellite | Dominion | 30 | hill_fort | minute, stillwraith, gearhound | The Bell That Doesn't Ring | Writ of Knighthood | 512,392 |
| dawnwatch | Dawnwatch | hour | satellite | Dominion | 30 | hill_fort | minute, clockwork, gearhound | The Sunrise Stair | Swift Spurs | 632,512 |
| noonspire | Noonspire | hour | satellite | Dominion | 30 | crossroads | clockwork, gearhound, minute | The Shadowless Square | Signet of Command | 512,632 |
| vesperhall | Vesper Hall | hour | satellite | Dominion | 30 | ruined_abbey | stillwraith, minute, clockwork | The Evensong Crypt | Writ of Knighthood | 392,512 |
| rimeholt | Rimeholt | winter | capital | Hoarfast | 40 | capital_citadel | snowkit, frostwolf, icegolem, yeti, frostwyrm (Winter) | The Lake of Silent Bells | Frostplate | 512,92 |
| wolfsgate | Wolfsgate | winter | flank | Hoarfast | 20 | mountain_pass | frostwolf, snowkit, yeti | The Howling Scar | Winter Shard | 352,235 |
| frostmere | Frostmere | winter | flank | Hoarfast | 20 | lakeside | snowkit, icegolem, frostwolf | Nimue's Mere | Warding Charm | 672,235 |
| kestrel | Kestrel Spire | winter | inner | Hoarfast | 25 | forest_hold | frostwolf, yeti, snowkit | The Kestrel Eyrie | Yew Longbow | 512,277 |
| avalorn | Avalorn | spring | capital | Verdance | 40 | capital_citadel | sproutling, pixie, unicorn, treant, rillserpent (Spring) | The Queen's Orchard | Robe of Seasons | 932,512 |
| thornwick | Thornwick | spring | flank | Verdance | 20 | forest_hold | sproutling, treant, pixie | The Briar Maze | Thornmail | 789,352 |
| rainmere | Rainmere | spring | flank | Verdance | 20 | river_ford | rillserpent, sproutling, pixie | The Weeping Weir | Spring Seed | 789,672 |
| primrose | Primrose Ford | spring | inner | Verdance | 25 | lakeside | unicorn, pixie, sproutling | The Unicorn Glade | Tome of Thaw | 747,512 |
| brazenhold | Brazenhold | summer | capital | Solmark | 40 | capital_citadel | salamander, cinderhound, sunbird, sunmane, wyvern (Summer) | The Furnace Vaults | Sunforged Blade | 512,932 |
| goldspur | Goldspur | summer | flank | Solmark | 20 | crossroads | salamander, cinderhound, wyvern (Summer) | The Wyvern Roost | Summer Ember | 672,789 |
| cinderwall | Cinderwall | summer | flank | Solmark | 20 | mountain_pass | cinderhound, salamander, sunmane | The Ash Dunes | Mail Hauberk | 352,789 |
| lionsreach | Lionsreach | summer | inner | Solmark | 25 | hill_fort | sunmane, sunbird, cinderhound | The Lion Steps | Banner Pin | 512,747 |
| ambergate | Ambergate | autumn | capital | Amberlyn | 40 | capital_citadel | jacklamp, scarecrow, ghoul, tusker, griffin (Autumn) | The Harvest Vault | Lantern Staff | 92,512 |
| ashbarrow | Ashbarrow | autumn | flank | Amberlyn | 20 | ruined_abbey | ghoul, jacklamp, scarecrow | The Barrow Downs | Autumn Acorn | 235,352 |
| russetmoor | Russetmoor | autumn | flank | Amberlyn | 20 | marsh_keep | tusker, jacklamp, scarecrow | The Russet Bog | Lucky Horseshoe | 235,672 |
| lanternfall | Lanternfall | autumn | inner | Amberlyn | 25 | forest_hold | jacklamp, ghoul, scarecrow | The Lantern Road | Ring of Mending | 277,512 |
| thawgate | Thawgate | thaw (winter/spring) | cross | Brigands: Hob Mudspur | 30 | river_ford | snowkit, sproutling, slime, bat | The Breaking Ice | Golden Draught | 756,268 |
| beltane | Beltane Ford | beltane (spring/summer) | cross | Brigands: Mother Gerrow | 30 | marsh_keep | sproutling, salamander, slime, harpy | The Old Mill of Beltane | Amulet of Tides | 756,756 |
| lammas | Lammas Cross | lammas (summer/autumn) | cross | Brigands: Red Dafydd | 30 | crossroads | salamander, scarecrow, skeleton, ogre | The Lammas Fair | Thorn Whip | 268,756 |
| hallowmere | Hallowmere | hallow (autumn/winter) | cross | Brigands: the Hollow Abbot | 30 | ruined_abbey | jacklamp, snowkit, skeleton, bat | The Hollow Abbey Crypts | Hawthorn Bow | 268,268 |

A battle map's dressing (tree kinds, palette, props, castle style) follows the castle's region; terrain then follows the
battle's season (§5.11). A cross-quarter castle's season bonus applies in both of its seasons.

### 6.3 Roads (36)
- **Hoarfast:** rimeholt–wolfsgate, rimeholt–frostmere, wolfsgate–kestrel, frostmere–kestrel.
- **Verdance:** avalorn–thornwick, avalorn–rainmere, thornwick–primrose, rainmere–primrose.
- **Solmark:** brazenhold–goldspur, brazenhold–cinderwall, goldspur–lionsreach, cinderwall–lionsreach.
- **Amberlyn:** ambergate–ashbarrow, ambergate–russetmoor, ashbarrow–lanternfall, russetmoor–lanternfall.
- **Cross-quarters:** thawgate–frostmere, thawgate–thornwick, beltane–rainmere, beltane–goldspur, lammas–cinderwall,
  lammas–russetmoor, hallowmere–ashbarrow, hallowmere–wolfsgate.
- **Into the Hourlands:** kestrel–midnight, primrose–dawnwatch, lionsreach–noonspire, lanternfall–vesperhall.
- **The Hour ring:** midnight–dawnwatch, dawnwatch–noonspire, noonspire–vesperhall, vesperhall–midnight.
- **To Meridian:** meridian–midnight, meridian–dawnwatch, meridian–noonspire, meridian–vesperhall.

Every realm has the same shape: a capital at the back, two flank castles that each face a brigand castle, and an inner
castle that faces an Hour satellite. That keeps the realms fair. A test checks the graph is connected and symmetric.

### 6.4 Realms

| id | Realm | Season | Colours (main / trim) | Sigil | Banner | Ruler | Capital |
|---|---|---|---|---|---|---|---|
| verdance | Kingdom of Verdance | Spring | `#4caf50` / `#f0e6c8` | five-petal blossom | swallowtail | Prince Gareth Greenmantle | Avalorn |
| solmark | Sun-March of Solmark | Summer | `#e0a020` / `#b02a2a` | rayed sun | square | Queen Morgause the Brazen | Brazenhold |
| amberlyn | Harvest Throne of Amberlyn | Autumn | `#c86a1e` / `#5a3a2a` | oak leaf | pointed | King Pellam the Quiet | Ambergate |
| hoarfast | Duchy of Hoarfast | Winter | `#6ab0e8` / `#e8f4ff` | snowflake | triangle | Duke Mordrain the Frostbitten | Rimeholt |
| dominion | Hourless Dominion | Hour | `#3a3a46` / `#d8c070` | hourglass | long tapered | Lord Chancellor Meliant | Meridian |
| brigands | Free Companies | — | `#7a6a5a` / `#2a2a2a` | crossed axes | ragged | (four captains) | — |

Sides are never told apart by colour alone: every unit also carries its realm's sigil on a pennant over it, and the
outline colour, the banner shape and the sigil all agree.

### 6.5 Knights
Each row gives the Humanoid look (§7.5) and the voice profile (§9.3). Each troop lists `species level`. Every realm's
capital also starts with two tier-1 level-2 monsters in reserve: Verdance sproutlings, Solmark salamanders, Amberlyn
jack-o'-lamps and Hoarfast snowkits. Meridian starts with two level-10 minutes.

#### 6.5.1 Verdance (Spring)

| id | Name | Class | Lv | Elem | Castle | Troop | Who they are | Look | Voice |
|---|---|---|---|---|---|---|---|---|---|
| gareth | **Prince Gareth Greenmantle** (ruler) | Springwarden | 6 | Spring | Avalorn | unicorn 4, pixie 4, sproutling 4 | earnest, idealistic, quick to forgive; grieving his mother, the late Queen | heroic 1.25, armor, short golden hair, circlet, green cape, sword | bright tenor, quick |
| lynette | Dame Lynette of Thornwick | Squire | 7 | Spring | Thornwick | treant 4, sproutling 3 | his sworn shield; stern, dry humour, protective | heroic 1.2, armor, dark-red ponytail, band, white-and-green tabard | firm alto |
| pelleas | Sir Pelleas the Lovelorn | Archer | 5 | Spring | Primrose Ford | pixie 4, rillserpent 3 | a poet-archer, overdramatic and brave | heroic 1.15, tunic, long chestnut hair, cap | lilting, high |
| amris | Brother Amris | Acolyte | 6 | Winter | Avalorn | snowkit 3, sproutling 3 | an old monk from the north; gentle, wry | heroic 1.15, hunch .2, grey robe, bald, staff | slow, low |
| wren | Wren Ashfeather | Tamer | 5 | Spring | Rainmere | unicorn 3, pixie 3, sproutling 3 | raised among unicorns; few words | heroic 1.1, leaf-green tunic, ash-white spiky hair, hood | chirpy |

#### 6.5.2 Solmark (Summer)

| id | Name | Class | Lv | Elem | Castle | Troop | Who they are | Look | Voice |
|---|---|---|---|---|---|---|---|---|---|
| morgause | **Queen Morgause the Brazen** (ruler) | Sun Sovereign | 7 | Summer | Brazenhold | wyvern 4, cinderhound 4 | magnificent and war-loving, honourable on the field, ruthless at court | heroic 1.3, gold armor, crown, long copper hair, crimson cape, two-handed sword | commanding mezzo |
| agravain | Sir Agravain Cinderjaw | Squire | 7 | Summer | Cinderwall | cinderhound 4, salamander 3 | a hothead champion who craves glory | bulky 1.25, armor, helmet, red cape | growly baritone |
| elidure | Captain Elidure of Goldspur | Archer | 6 | Summer | Goldspur | sunbird 3, salamander 3 | disciplined, loyal and secretly kind | heroic 1.2, sand coat, black ponytail, band | clear soprano |
| hesper | Magus Hesper Vey | Adept | 6 | Hour | Lionsreach | salamander 3, minute 3 | an ambitious court sorcerer who dabbles in Hour magic | heroic 1.2, purple-and-gold robe, pointed hat, long silver hair | silky |
| brennoc | Old Brennoc | Tamer | 5 | Summer | Brazenhold | sunmane 3, cinderhound 3 | a grizzled, grandfatherly beastkeeper | bulky 1.2, hunch .3, leather coat, bald, whip | gravelly |

#### 6.5.3 Amberlyn (Autumn)

| id | Name | Class | Lv | Elem | Castle | Troop | Who they are | Look | Voice |
|---|---|---|---|---|---|---|---|---|---|
| pellam | **King Pellam the Quiet** (ruler) | Harvest King | 8 | Autumn | Ambergate | griffin 4, scarecrow 4 | silent and wise; speaks rarely and briefly; secretly ill | heroic 1.2, hunch .25, amber-and-umber robe, crown, long white hair, staff | soft, low, slow |
| enid | Lady Enid Russet | Acolyte | 6 | Autumn | Ambergate | jacklamp 3, scarecrow 3 | the king's daughter; gentle, firm, practical | heroic 1.15, cream-and-russet robe, long auburn hair, band | warm |
| dagonet | Sir Dagonet the Motley | Squire | 5 | Autumn | Russetmoor | tusker 3, jacklamp 3 | a jester-knight who jokes to hide his fear | heroic 1.1, two-colour tunic, pointed hat, sword | bouncy |
| vesna | Vesna of the Lanterns | Adept | 6 | Summer | Lanternfall | jacklamp 4, ghoul 3 | a lamplighter witch, kind to the dead | heroic 1.15, black-and-orange robe, pointed hat, long black hair | breathy |
| lamorak | Sir Lamorak Ashbarrow | Squire | 8 | Autumn | Ashbarrow | ghoul 4, scarecrow 3 | a gruff old veteran, loyal to Pellam | bulky 1.2, rusty armor, helmet, brown cape | gruff |

#### 6.5.4 Hoarfast (Winter)

| id | Name | Class | Lv | Elem | Castle | Troop | Who they are | Look | Voice |
|---|---|---|---|---|---|---|---|---|---|
| mordrain | **Duke Mordrain the Frostbitten** (ruler) | Rime Duke | 7 | Winter | Rimeholt | frostwyrm 3, snowkit 4 | theatrical, mad and brilliant; speaks in riddles; grief hidden under ice | heroic 1.25, white coat, icicle crown, long white hair, staff, pale-blue cape, faint eyeGlow | high, erratic pitch |
| ragnell | Dame Ragnell Ice-Eye | Squire | 8 | Winter | Kestrel Spire | frostwolf 4, icegolem 3 | his cold, calculating marshal, the sane one | heroic 1.25, steel armor, helmet, white ponytail, dark-blue cape | flat alto |
| safir | Sir Safir the Pale | Archer | 6 | Winter | Wolfsgate | frostwolf 3, snowkit 3 | a quiet, melancholic hunter | heroic 1.2, white hood, grey coat | soft |
| nimue | Nimue of Frostmere | Adept | 7 | Winter | Frostmere | snowkit 4, snowkit 3 | an enigmatic lake witch who makes bargains | heroic 1.15, teal robe, long pale-blue hair | echoing |
| gorm | Gorm the Bear | Tamer | 5 | Autumn | Rimeholt | yeti 3, tusker 3 | huge and gentle; raised in the western woods | bulky 1.35, brown fur coat, short hair, whip | very low |

#### 6.5.5 The Hourless Dominion (Hour)

| id | Name | Class | Lv | Castle | Troop | Who they are | Look | Voice |
|---|---|---|---|---|---|---|---|---|
| meliant | **Lord Chancellor Meliant** (ruler) | Chancellor of Hours | 14 | Meridian | pendulumwyrm 10, clockwork (tier 2: Tick Knight) 12, stillwraith 12 | cold, grieving and absolute; believes he is merciful | heroic 1.25, black-and-brass robe, brass band, short grey hair, brass rod | measured baritone |
| bertilak | Marshal Bertilak the Hourward | Knight | 12 | Midnight Keep | clockwork (tier 2) 12, gearhound 10, gearhound 9 | courteous, ruthless; loves a duel | bulky 1.3, brass armor, helmet, green-black cape | booming |
| aurelie | Countess Aurelie of Vespers | Sorcerer | 12 | Vesper Hall | stillwraith 10, minute 10, minute 9 | elegant, bored and cruel | heroic 1.2, violet-and-black robe, long black hair, band | drawling |
| morholt | Sir Morholt the Unmoving | Knight | 11 | Noonspire | clockwork 10, clockwork 9 | a silent giant | bulky 1.45, black armor, helmet | grunts only |
| tic | Tic | Ranger | 10 | Dawnwatch | gearhound 9, minute 9 | a clockwork twin who finishes Tac's sentences | chibi 1.0, brass armor, cap | squeaky, high |
| tac | Tac | Ranger | 10 | Dawnwatch | gearhound 9, minute 9 | the other twin | the same, colours swapped | squeaky, low |
| graynight | **The Gray Knight, Sir Nonesuch** | Knight of the Thirteenth Hour | 25 | the Sanctum only | minute (tier 3) 22 ×4, pendulumwyrm (tier 2) 22 | the month that never was: calm, ancient, faintly amused | heroic 1.6, grey armor, helmet, tattered grey cape, white eyeGlow, long sword, clock-hand halo | two detuned low voices |

The Gray Knight's stats are fixed: HP 900, MP 200, ATK 52, DEF 48, INT 50, AGI 30, MOV 5. His skills are Thirteenth
Stroke, Still, Unmaking and Timeless.

#### 6.5.6 Free knights (joined by event or quest)

| id | Name | Class | Lv | Elem | How they join | Brings | Who they are | Look | Voice |
|---|---|---|---|---|---|---|---|---|---|
| lunete | Princess Lunete of Meridian | Hourmaiden | 8 | Hour | the Lunete chain (§6.12) | — | the Keeper's daughter; steady and kind; carries her father's broken watch | heroic 1.15, white-and-brass robe, long gold hair, band | clear, gentle |
| galeron | Sir Galeron the Wanderer | Knight | 10 | Spring | Wanderer outcome at Winter or Spring sites, from Autumn of Year 1 | frostwolf 8 | an errant knight looking for a cause | heroic 1.25, dented armor, faded green cape | weary tenor |
| blanchefleur | Blanchefleur the Sellsword | Ranger | 10 | Autumn | Wanderer at Summer or Autumn sites, or the Lammas Fair (pay 150 mana) | sunmane 8 | a mercenary with a code: coin first | heroic 1.2, red-brown coat, short blonde hair | brisk |
| owain | Owain the Dragonless | Beastlord | 11 | Summer | event `owain`: the first time your realm binds a wyvern or frost wyrm | — | lost his dragon in the Long Winter; will train yours | bulky 1.25, leather coat, short hair | husky |
| ettard | Sister Ettard | Priest | 10 | Winter | Wanderer at Hallowmere, Lanternfall or Frostmere | snowkit 7 | a sharp-tongued healer | heroic 1.15, white-and-blue robe, hood | crisp |

#### 6.5.7 Brigand captains (Brigand Captain class)

| id | Name | Lv | Elem | Castle | Troop | Who they are |
|---|---|---|---|---|---|---|
| hob | Hob Mudspur | 5 | Winter | Thawgate | snowkit 4, frostwolf 4, bat 3, slime 3 | swaggering, and a coward at heart |
| gerrow | Mother Gerrow | 5 | Spring | Beltane Ford | slime 4, harpy 4, sproutling 3, bat 3 | motherly and crafty; hides Lunete at her mill |
| dafydd | Red Dafydd | 6 | Summer | Lammas Cross | ogre 4, skeleton 4, salamander 3 | boisterous and proud |
| abbot | The Hollow Abbot | 6 | Autumn | Hallowmere | skeleton 5, ghoul 4, bat 4 | eerie and sorrowful; keeps the dead company |

### 6.6 Knight classes

**Stat rule:**
- At tier 1, `stat(L) = base + growth × (L − 1)`.
- At a class change, every stat (MP included) is multiplied by 1.10.
- After that, growth is ×1.15 (tier 2) or ×1.30 (tier 3) of the line's tier-1 growth.
- Knights who start at tier 2 or 3 are built the same way with expected values, as if they changed class at levels 10
  and 20.
- Bond = base + floor(level / 4). MOV and Ward come from the class.

| id | Class | Line, tier | Weapons | Basic attack | MOV | Ward | Bond | Base at Lv 1: HP/MP/ATK/DEF/INT/AGI | Growth per level | Skills (level) | Next |
|---|---|---|---|---|---|---|---|---|---|---|---|
| squire | Squire | Warrior 1 | sword, spear, axe | Slash 1.0, range 1 | 5 | 2 | 5 | 70/8/17/15/7/11 | 7/.6/1.6/1.4/.4/.9 | Rally (3) | knight at 10 |
| knight | Knight | Warrior 2 | sword, spear, axe | Slash | 5 | 3 | 7 | ×1.1 at change | ×1.15 | Charge (10), Shield Wall (14) | paladin at 20 + Writ |
| paladin | Paladin | Warrior 3 | sword, spear | Slash | 5 | 3 | 9 | ×1.1 | ×1.30 | Holy Strike (20), Lay on Hands (24) | — |
| archer | Archer | Ranger 1 | bow | Shoot 0.9, range 2–4 | 5 | 2 | 4 | 58/10/16/10/9/15 | 5.5/.8/1.5/.9/.6/1.3 | Aimed Shot (4) | ranger at 10 |
| ranger | Ranger | Ranger 2 | bow | Shoot | 5 | 3 | 6 | | | Volley (10), Pinning Shot (14) | sentinel at 20 + Writ |
| sentinel | Sentinel | Ranger 3 | bow | Shoot, range 2–5 | 5 | 3 | 7 | | | Piercing Arrow (20), Eagle Eye (24) | — |
| adept | Adept | Mage 1 | staff, tome | Strike 0.6, range 1 | 4 | 2 | 4 | 50/30/8/8/18/11 | 4.5/2.2/.5/.7/1.8/.9 | own element's Bolt (1), Hex (6) | sorcerer at 10 |
| sorcerer | Sorcerer | Mage 2 | staff, tome | Strike | 4 | 3 | 6 | | | Storm (10), Mana Siphon (14) | archmage at 20 + Writ |
| archmage | Archmage | Mage 3 | staff, tome | Strike | 4 | 3 | 7 | | | Tempest (20), Haste (24) | — |
| acolyte | Acolyte | Cleric 1 | mace, staff | Strike 0.8 | 4 | 3 | 5 | 55/26/10/10/15/10 | 5/2/.7/.9/1.5/.8 | Mend (1), Purify (5) | priest at 10 |
| priest | Priest | Cleric 2 | mace, staff | Strike 0.8 | 4 | 3 | 7 | | | Renewal (10), Ward of Seasons (14) | hierophant at 20 + Writ |
| hierophant | Hierophant | Cleric 3 | staff | Strike 0.8 | 4 | 4 | 8 | | | Greater Renewal (20), Dawnlight (24) | — |
| tamer | Tamer | Beast 1 | whip, spear | Lash 0.8, range 1–2 | 5 | 3 | 7 | 62/12/14/12/10/13 | 6/.9/1.2/1.1/.7/1.1 | Goad (3) | beastlord at 10 |
| beastlord | Beastlord | Beast 2 | whip, spear | Lash | 5 | 4 | 10 | | | Pack Tactics (10), Roar (14) | beastsovereign at 20 + Writ |
| beastsovereign | Beast Sovereign | Beast 3 | spear, whip | Lash | 5 | 4 | 13 | | | Call of the Wild (20), Bond of Fang (24) | — |
| springwarden | Springwarden | ruler | sword | Slash 1.0 | 5 | 4 | 10 | 75/22/17/15/15/14 | 7/1.5/1.5/1.3/1.3/1.1 | Mend (1), Charge (1), Verdant Oath (6), Bramble Storm (10), Verdant Tempest (16) | — |
| sunsovereign | Sun Sovereign | ruler | greatsword | Cleave 1.1 | 5 | 4 | 11 | 85/14/21/16/10/12 | 8/1/1.9/1.4/.8/1 | Charge (1), Warcry (6), Cinder Storm (10), Solar Flare (16) | — |
| harvestking | Harvest King | ruler | staff | Strike 0.8 | 4 | 5 | 10 | 68/30/11/13/20/10 | 6/2/.8/1.2/1.8/.8 | Mend (1), Gale of Leaves (1), Quiet Counsel (6), Harvest Moon (12), Reaping (16) | — |
| rimeduke | Rime Duke | ruler | staff | Strike 0.8 | 4 | 4 | 10 | 70/28/15/13/19/13 | 6.5/1.8/1.3/1.1/1.7/1 | Hoarfrost (1), Mad Gambit (6), Frost Storm (10), Frozen Hour (12), Blizzard (16) | — |
| chancellor | Chancellor of Hours | ruler | rod | Strike 0.8 | 4 | 4 | 12 | 80/34/12/15/22/12 | 7/2/1/1.4/1.9/.9 | Time Shear (1), Stop (1), Restore (6), Hour Storm (10) | — |
| hourmaiden | Hourmaiden | unique | staff | Strike 0.8 | 5 | 3 | 6 | 58/34/9/11/19/15 | 5/2.2/.6/1/1.8/1.2 | Mend (1), Haste (1), Turning (8) | — |
| graynight | Knight of the Thirteenth Hour | boss | long sword | Slash 1.2 | 5 | 5 | — | fixed (§6.5.5) | — | Thirteenth Stroke, Still, Unmaking, Timeless | — |
| brigand | Brigand Captain | unique | axe | Hack 1.05 | 5 | 3 | 8 | 72/6/18/13/6/12 | 7/.4/1.6/1.2/.3/1 | Charge (1), Ambush (1) | — |

**A knight's element picks its spells.** "Bolt", "Hex", "Storm" and "Tempest" mean that element's spell of that tier
(§6.7). An Adept of Winter learns Hoarfrost, then Frostbite.

### 6.7 Skills and spells
Areas:
- `single`;
- `r1` / `r2`: the target hex plus every hex within 1 or 2 of it;
- `self-r1` / `self-r2`: around the user;
- `adj`: the 6 hexes around the user;
- `cone2` / `cone3`: hexes within 2 or 3 of the user, inside a 120° wedge facing one of the 6 directions;
- `line3` / `line4`: a straight hex line from the user in one of the 6 directions.

"Foes" or "allies" filters who is touched. Status numbers are the base chance (§5.6). P is the power; a heal's P is the
base amount.

| id | Name | Kind | Elem | P | Range | Area | MP | Mobile | Effect / notes |
|---|---|---|---|---|---|---|---|---|---|
| rally | Rally | special | — | — | self | self-r1 allies | 4 | yes | Valor 2 bells |
| charge | Charge | special | user's | 1.3 | 1 | single | 5 | yes | must move 2+ hexes first |
| shieldwall | Shield Wall | special | — | — | self | adj allies | 6 | yes | Warded 1 bell |
| holystrike | Holy Strike | special | none | 1.5 | 1 | single | 8 | yes | ignores element; ×1.5 vs Hour |
| layonhands | Lay on Hands | special | — | heal 60 | 1 | single ally | 10 | yes | |
| aimedshot | Aimed Shot | special | user's | 1.2 | 2–4 | single | 4 | no | +20 hit |
| volley | Volley | special | user's | 0.8 | 3–5 | r1 | 8 | no | |
| pinning | Pinning Shot | special | user's | 0.9 | 2–4 | single | 6 | yes | Chill 70 |
| piercing | Piercing Arrow | special | user's | 1.1 | — | line4 | 10 | no | every unit on the line |
| eagleeye | Eagle Eye | passive | | | | | | | bows +1 max range |
| bramble, cinder, galeleaves, hoarfrost, timeshear | Bramble / Cinder / Gale of Leaves / Hoarfrost / Time Shear (Bolts) | spell | Sp / Su / Au / Wi / Hour | 14 | 1–4 | single | 5 | no | Time Shear ignores the Tide |
| drowse, kindle, rot, frostbite, stophex | Drowse / Kindle / Rot / Frostbite / Stop (Hexes) | spell | Sp / Su / Au / Wi / Hour | — | 1–4 | single | 6 | no | Sleep 60 / Burn 70 / Poison 70 / Chill 70 / Stop 40 |
| bramblestorm, cinderstorm, leafstorm, froststorm, hourstorm | Bramble / Cinder / Leaf / Frost / Hour Storm | spell | Sp / Su / Au / Wi / Hour | 22 | 1–4 | r1 | 10 | no | Cinder Storm on a forest sets it burning (§5.7) |
| verdanttempest, solarflare, harvestmoon, blizzard | Verdant Tempest / Solar Flare / Harvest Moon / Blizzard (Tempests) | spell | Sp / Su / Au / Wi | 34 | 1–5 | r2 | 16 | no | Sleep 20 / Burn 30 (and burns forests) / drains 25% of damage to the caster / Chill 30 |
| manasiphon | Mana Siphon | spell | — | — | 1–4 | single | 2 | no | steals 12 MP |
| haste | Haste | spell | — | — | 0–3 | single ally | 8 | no | Haste 2 bells |
| mend | Mend | spell | — | heal 30 | 0–3 | single ally | 5 | no | |
| purify | Purify | spell | — | — | 0–3 | single ally | 4 | no | clears statuses and debuffs |
| renewal | Renewal | spell | — | heal 24 | 0–3 | r1 allies | 10 | no | |
| wardofseasons | Ward of Seasons | spell | — | — | 0–3 | r1 allies | 9 | no | Warded 2 bells |
| greaterrenewal | Greater Renewal | spell | — | heal 36 | 0–4 | r2 allies | 16 | no | |
| dawnlight | Dawnlight | spell | none | 26 | 1–4 | r1 foes | 14 | no | ×1.5 vs Hour; ignores the Tide |
| goad | Goad | special | — | — | 1–2 | one own monster | 3 | yes | Valor and Haste 1 bell |
| packtactics | Pack Tactics | passive | | | | | | | the knight's monsters +10 hit |
| roar | Roar | special | — | — | self | self-r2 foes | 6 | yes | Weakened 60 |
| callofwild | Call of the Wild | special | — | 20% max HP | self | own troop's monsters | 12 | yes | heals |
| bondoffang | Bond of Fang | special | — | — | Ward | one own monster in Ward | 10 | yes | Valor, Warded and Haste 2 bells |
| verdantoath | Verdant Oath | special | Sp | heal 10% | self | allies in Ward | 10 | yes | Warded 2 bells |
| warcry | Warcry | special | Su | — | self | allies in Ward | 8 | yes | Valor 2 bells |
| quietcounsel | Quiet Counsel | special | Au | — | self | allies in Ward | 10 | yes | Haste 1 bell |
| reaping | Reaping | spell | Au | 20 | 1–3 | single | 8 | no | heals the caster 50% of the damage |
| madgambit | Mad Gambit | special | Wi | 30 (magic) | 1–3 | single | 6 | yes | 25%: misfires and Chills the Duke instead |
| frozenhour | Frozen Hour | spell | Wi | — | 1–4 | single | 12 | no | Stop 70 |
| restore | Restore | spell | Hour | 50% max HP | 0–3 | single ally | 14 | no | |
| turning | Turning | special | none | 40 (magic) | 1–3 | r1 foes | 0, once per battle | yes | ×2 vs Hour; a Gray Knight it hits loses Timeless until the end of the next bell |
| ambush | Ambush | passive | | | | | | | +30% damage when attacking from a forest hex |
| thirteenthstroke | Thirteenth Stroke | special | Hour | 1.6 | 1 | r1 foes | 0 | yes | |
| still | Still | special | Hour | — | self | self-r2 foes | 0, every 3rd bell | yes | Stop 70 |
| unmaking | Unmaking | spell | Hour | 25% of target's max HP | 1–3 | single | 20 | no | ignores DEF, element and Tide |
| timeless | Timeless | passive | | | | | | | immune to effects and the Tide; takes ×0.5 damage until the four Season Dials are lit (§6.10) or Turning hits |
| pollenpuff | Pollen Puff | special | Sp | — | self | self-r1 foes | 6 | yes | Sleep 50 |
| entangle | Entangle | special | Sp | 0.6 | 1–2 | single | 5 | no | Chill 70 |
| scream | Mandrake Scream | special | Sp | — | self | self-r2 foes | 10 | no | Sleep 50 |
| sleepdust | Sleep Dust | spell | Sp | — | 1–3 | r1 foes | 8 | no | Sleep 60 |
| thorns | Thorns | passive | | | | | | | melee attackers take 10% of the damage they deal |
| rootsweep | Root Sweep | special | Sp | 0.9 | — | adj foes | 6 | yes | |
| dive | Dive | special | user's | 1.2 | 1 | single | 4 | yes | fliers; must move 2+ hexes first |
| torrent | Torrent | special | Sp | 1.0 | — | line3 | 6 | no | |
| coil | Coil | special | user's | 0.8 | 1 | single | 4 | yes | Chill 60 |
| emberspit | Ember Spit | special | Su | 0.9 | 1–2 | single | 3 | yes | Burn 30 |
| firebreath | Fire Breath | special | Su | 1.2 | — | cone2 (dragons: cone3) | 8 | no | Burn 25 |
| howl | Howl | special | — | — | self | self-r2 allies | 5 | yes | Valor 1 bell |
| pounce | Pounce | special | user's | 1.2 | 1 | single | 5 | yes | |
| rebirth | Rebirth | passive | | | | | | | once per battle, at 0 HP it rises again with 30% HP |
| sunriddle | Sun Riddle | special | Su | — | self | self-r1 foes | 8 | no | Sleep 50 |
| wispfire | Wisp Fire | special | Au | 0.9 (magic) | 1–3 | single | 4 | yes | |
| fear | Fear | special | Au | — | self | self-r1 foes | 5 | yes | Weakened 60 |
| drain | Drain | special | user's | 1.0 | 1 | single | 4 | yes | heals 50% of the damage |
| gravechill | Grave Chill | special | Wi | — | self | self-r1 foes | 7 | no | Chill 40 |
| gale | Gale | special | Au | 0.7 | 1 | single | 5 | yes | pushes the target 1 hex away; if blocked, 4 more damage |
| trample | Trample | special | user's | 1.0 | — | line3 | 6 | yes | |
| thickhide | Thick Hide | passive | | | | | | | DEF +10% |
| frostarmor | Frost Armor | special | Wi | — | self | self | 5 | yes | DEF +40% 2 bells |
| avalanche | Avalanche | special | Wi | 1.0 | 1–2 | r1 | 9 | no | |
| hurlice | Hurl Ice | special | Wi | 1.0 | 2–3 | single | 5 | no | |
| frostfang | Frost Fang | passive | | | | | | | basic attacks Chill 30 |
| frostbreath | Frost Breath | special | Wi | 1.2 | — | cone3 | 8 | no | Chill 40 |
| tailsweep | Tail Sweep | special | user's | 0.9 | — | adj foes | 6 | yes | |
| windup | Wind-up | special | — | — | self | self | 3 | yes | its next basic attack ×1.5 |
| pendulum | Pendulum | special | Hour | 1.1 | — | adj foes | 6 | yes | |
| stopbite | Stopping Bite | passive | | | | | | | basic attacks Stop 20 |
| engulf | Engulf | special | user's | 0.9 | 1 | single | 4 | yes | Poison 40 |
| regenerate | Regenerate | passive | | | | | | | heals 10% max HP at its turn start |
| groundpound | Ground Pound | special | user's | 1.0 | — | adj foes | 7 | yes | |
| screech | Screech | special | — | — | self | self-r1 foes | 5 | yes | Weakened 60 |

### 6.8 Bestiary (30 species, 3 forms each)
**Form and level rules:**
- Tier 2 = tier 1 × 1.35 (HP, MP, ATK, DEF, INT), AGI +2. Tier 3 = tier 1 × 1.75, AGI +4, MOV +1 for fliers.
- At level L, every stat is `round(formBase × (1 + 0.05 × (L − 1)))`.
- Rank is the bond cost and doesn't change with form. Upkeep ×1.5 at tier 2 and ×2 at tier 3.
- Each form keeps the skills before it and adds its own (column "Skills").

Flags: `fl` flier, `sw` swimmer, `fo` floater. The "Rig" column is the look; §7.5 defines the rig kinds.

| id | Forms | Elem | Size | Rank | Flags | Tier 1: HP/MP/ATK/DEF/INT/AGI/MOV | Basic attack (P, range) | Skills: T1; +T2; +T3 | Cost / upkeep | Rig |
|---|---|---|---|---|---|---|---|---|---|---|
| sproutling | Sproutling → Bloomkin → Mandragora | Sp | S | 1 | | 38/12/12/9/12/13/4 | Headbutt 1.0, 1 | Pollen Puff; +Entangle; +Mandrake Scream | 30 / 2 | Blob R6, leaf ears, a sprout on top; Mandragora gets a root crown |
| pixie | Pixie → Sylph → Faerie Queen | Sp | S, S, M | 1 | fl | 30/24/8/6/16/20/6 | Prick 0.7, 1 | Mend; +Haste; +Sleep Dust | 45 / 3 | Humanoid chibi .55 + insect `E.Wings`, glow |
| treant | Thornback Treant → Elder Treant → Worldroot | Sp | L | 4 | | 120/10/22/22/8/5/3 | Slam 1.1, 1 | Thorns, Entangle; +Renewal; +Root Sweep | 120 / 8 | Humanoid bulky 1.6, bark colours, leaf crown, long arms, hunch .3 |
| unicorn | Unicorn → Alicorn → Dawnhorn | Sp | M, M, L | 3 | T2+ fl | 80/20/19/14/14/16/6 | Gore 1.1, 1 | Charge, Mend; +Dive; +Dawnlight | 90 / 5 | Beast quad `horse` + horn; feather wings from T2 |
| rillserpent | Rillserpent → Floodwyrm → Thaw Leviathan | Sp | L | 4 | sw | 110/18/21/16/14/9/4 | Bite 1.0, 1 | Torrent, Coil; +Bramble Storm; +Verdant Tempest | 130 / 8 | Beast serpent, fins, river-green scales |
| salamander | Salamander → Firedrake → Magma Drake | Su | S, M, M | 2 | | 50/12/16/12/10/12/4 | Bite 1.0, 1 | Ember Spit; +Fire Breath; +Cinder Storm | 45 / 3 | Beast quad `lizard` (low, long tail), ember glow |
| cinderhound | Cinderhound → Blazehound → Twinflame Hound | Su | M | 2 | | 70/10/20/12/8/14/5 | Bite 1.0, 1 | Fire Breath; +Howl; +Pounce | 70 / 4 | Beast quad `hound` + flame mane |
| sunbird | Sunbird → Phoenix → Solar Roc | Su | M, M, L | 3 | fl | 60/18/17/10/14/18/6 | Talon 1.0, 1 | Dive; +Rebirth; +Solar Flare | 90 / 5 | Beast `avian`, fire tail |
| wyvern | Wyvern → Sun Dragon → Elder Sun Dragon | Su | L | 4 | fl | 120/16/25/18/12/10/5 | Bite 1.0, 1 | Tail Sweep, Fire Breath (cone3); +Dive; +Solar Flare | 160 / 10 | Beast `drake`: 2 legs + wings (Wyvern), 4 legs + wings (dragons) |
| sunmane | Sunmane Lion → Solar Chimera → Noon Sphinx | Su | M, L, L | 3 | | 85/12/22/14/9/15/5 | Claw 1.0, 1 | Roar, Pounce; +Fire Breath; +Sun Riddle | 100 / 6 | Beast quad `cat` + mane; wings and a snake tail from T2 |
| jacklamp | Jack-o'-Lamp → Lantern Lord → Will of the Wisps | Au | S, S, M | 1 | fo | 36/20/10/8/15/14/4 | Spook 0.8, 1 | Wisp Fire; +Fear; +Leaf Storm | 30 / 2 | Blob: an orange pumpkin with a glowing carved face and a flame on top; floats |
| scarecrow | Scarecrow → Harvest Reaper → Grim Thresher | Au | M | 2 | | 65/10/18/12/10/12/4 | Scythe 1.1, 1 | Fear; +Reaping; +Trample | 60 / 4 | Humanoid, straw palette, pointed hat, patched coat, scythe drawn from the hands |
| ghoul | Barrow Ghoul → Wight → Barrow King | Au | M | 2 | | 70/12/19/13/9/10/4 | Claw 1.0, 1 (Poison 25) | Drain; +Grave Chill; +Rot | 55 / 3 | Humanoid, hunch .6, grey-green skin, eyeGlow, rags |
| griffin | Griffin → Gilded Griffin → Storm Griffin | Au | L | 4 | fl | 105/14/23/15/12/15/6 | Talon 1.0, 1 | Dive, Gale; +Leaf Storm; +Harvest Moon | 140 / 9 | Beast `griffin`: eagle front and wings, lion rear |
| tusker | Great Tusker → Ironhide Boar → Boar King | Au | M, M, L | 3 | | 85/6/21/16/4/10/5 | Gore 1.1, 1 | Trample; +Thick Hide; +Roar | 70 / 4 | Beast quad `boar`, tusks, bristles |
| snowkit | Snowkit → Rime Sprite → Aurora Wisp | Wi | S | 1 | T3 fo | 36/18/11/9/14/15/4 | Snowball 0.8, 1–2 | Frostbite; +Frost Armor; +Frost Storm | 30 / 2 | Blob, white, cat ears, frost sparkle; aurora glow at T3 |
| frostwolf | Frostwolf → Dire Frostwolf → Long-Night Wolf | Wi | M, M, L | 2 | | 68/8/20/11/7/16/6 | Bite 1.0, 1 | Howl, Frost Fang; +Pounce; +Frost Breath | 65 / 4 | Beast quad `wolf`, white-blue |
| icegolem | Ice Golem → Glacier Colossus → Hoarfrost Titan | Wi | L | 4 | | 130/8/24/26/6/4/3 | Slam 1.1, 1 | Frost Armor; +Avalanche; +Thorns | 130 / 8 | Humanoid bulky 1.5, ice-crystal colours, cyan eyeGlow |
| yeti | Yeti → Great Yeti → Yeti Matriarch | Wi | L | 4 | | 115/8/25/17/6/8/4 | Maul 1.15, 1 | Hurl Ice; +Roar; +Avalanche | 110 / 7 | Humanoid bulky 1.5, white fur, no weapon, hunch .3 |
| frostwyrm | Frost Wyrm → Rime Dragon → Winter's Heart | Wi | L | 5 | fl | 125/18/24/19/14/9/5 | Bite 1.0, 1 | Frost Breath, Tail Sweep; +Dive; +Blizzard | 170 / 11 | Beast `drake`, 4 legs + wings, crest, icy palette |
| minute | Minute → Hour-Wisp → Second Hand | Hour | S | 1 | fo | 34/16/11/10/13/17/5 | Tick 0.8, 1 | Stop (Hex); +Haste; +Time Shear | 40 / 2 | Blob: a brass sphere with a clock face, small orbiting gears |
| clockwork | Clockwork Sentinel → Tick Knight → Pendulum Paladin | Hour | M | 3 | | 80/8/21/20/8/9/4 | Slash 1.0, 1 | Wind-up; +Shield Wall; +Pendulum | 80 / 5 | Humanoid heroic 1.25, brass plate, helmet, gear halo |
| gearhound | Gearhound → Clockwork Hound → Chronohound | Hour | M | 2 | | 65/6/19/15/6/15/6 | Bite 1.0, 1 | Pounce; +Howl; +Stopping Bite | 60 / 4 | Beast quad `hound`, metal palette, gear joints |
| stillwraith | Stillwraith → Hollow Hour → Unhour | Hour | M | 3 | fo | 60/30/10/10/20/13/5 | Spook 0.8, 1 | Time Shear, Stop; +Drain; +Hour Storm | 85 / 5 | Humanoid robe and hood at alpha .75, a clock face for a head, floats 6 up |
| pendulumwyrm | Pendulum Wyrm → Great Pendulum → The Long Hand | Hour | L | 5 | | 150/20/26/22/18/8/4 | Bite 1.0, 1 | Pendulum, Time Shear; +Coil; +Hour Storm | 200 / 12 (Meridian only) | Beast serpent, metal segments, a swinging pendulum disc for a tail |
| skeleton | Skeleton → Skeleton Knight → Bone Lord | Au | M | 2 | | 60/6/18/12/5/11/4 | Slash 1.0, 1 | —; +Shield Wall; +Charge | 50 / 3 | Humanoid build `skeleton`, rusty sword |
| bat | Giant Bat → Vampire Bat → Night Bat | Wi | S, S, M | 1 | fl | 32/8/12/7/8/19/6 | Bite 0.9, 1 (heals 25% of damage) | Dive; +Drain; +Fear | 30 / 2 | Blob with wings and fangs, dark palette |
| slime | Slime → Royal Slime → Slime Sovereign | Sp | S | 1 | | 44/10/11/12/9/9/3 | Headbutt 0.9, 1 | Engulf; +Regenerate; +Bramble Storm | 25 / 2 | Blob, translucent teal; a crown from T2 |
| ogre | Ogre → Ogre Chieftain → Ogre Warlord | Su | L | 4 | | 125/6/27/16/4/7/4 | Maul 1.15, 1 | Roar; +Charge; +Ground Pound | 110 / 7 | Humanoid bulky 1.5, grey-green skin, club |
| harpy | Harpy → Harpy Matron → Storm Harpy | Sp | M | 2 | fl | 55/14/17/10/12/17/6 | Talon 1.0, 1 | Dive; +Gale; +Screech | 55 / 3 | Humanoid 1.0 with feather `E.Wings`, bare taloned feet |

### 6.9 Items (33; there are no shops: items come from quests, events and castle treasuries)

| id | Name | Slot | Who | Effect |
|---|---|---|---|---|
| ashspear | Ashwood Spear | weapon | Warrior, Beast | ATK +3 |
| rimesteel | Rimesteel Sword | weapon | Warrior | ATK +5; a Winter wielder +5% damage |
| sunforged | Sunforged Blade | weapon | Warrior, Sun Sovereign | ATK +7 |
| cleaver | Brigand's Cleaver | weapon | Warrior | ATK +6, DEF −2 |
| hawthornbow | Hawthorn Bow | weapon | Ranger | ATK +4 |
| yewlongbow | Yew Longbow | weapon | Ranger | ATK +6, max range +1 |
| willowstaff | Willow Staff | weapon | Mage, Cleric, staff rulers | INT +4 |
| lanternstaff | Lantern Staff | weapon | Mage, Cleric, staff rulers | INT +6; Autumn spells +10% |
| tomeofthaw | Tome of Thaw | weapon | Mage | INT +5; Spring spells +10% |
| hourglassrod | Hourglass Rod | weapon | Mage, Cleric, rulers | INT +8, MP +10 |
| thornwhip | Thorn Whip | weapon | Beast | ATK +4; Lash range 1–3 |
| jerkin | Leather Jerkin | armor | all | DEF +3 |
| hauberk | Mail Hauberk | armor | Warrior, Beast, rulers | DEF +6, AGI −1 |
| thornmail | Thornmail | armor | Warrior | DEF +5; Thorns |
| frostplate | Frostplate | armor | Warrior, rulers | DEF +8; immune to Chill |
| robeofseasons | Robe of Seasons | armor | Mage, Cleric, rulers | DEF +3, INT +4 |
| spurs | Swift Spurs | accessory | all | MOV +1 |
| signet | Signet of Command | accessory | all | Bond +2 |
| bannerpin | Banner Pin | accessory | all | Ward +1 |
| amuletoftides | Amulet of Tides | accessory | all | the wearer's Tide bonus ×2 |
| wardingcharm | Warding Charm | accessory | all | immune to Sleep and Stop |
| mendingring | Ring of Mending | accessory | all | heals 10% max HP at its troop's turn start |
| horseshoe | Lucky Horseshoe | accessory | all | good quest outcomes ×1.15 |
| herb | Healing Herb | consumable | — | heals 40 HP |
| draught | Golden Draught | consumable | — | heals to full HP |
| ether | Ether Vial | consumable | — | +20 MP |
| remedy | Remedy | consumable | — | clears statuses and debuffs |
| manaseed | Mana Seed | consumable (Muster) | — | +60 realm mana |
| springseed | Spring Seed | promotion | Spring monsters | promotes (T1 → T2 from Lv 6; T2 → T3 from Lv 16) |
| summerember | Summer Ember | promotion | Summer monsters | as above |
| autumnacorn | Autumn Acorn | promotion | Autumn monsters | as above |
| wintershard | Winter Shard | promotion | Winter monsters | as above |
| writ | Writ of Knighthood | special | knights | allows a tier-3 class change from Lv 20 |

Starting inventories: each season-realm starts with 2 Healing Herbs and 1 Remedy, plus its season's promotion item. The
Dominion starts with 3 Ether Vials. Quest pools by region are listed in §6.11.

### 6.10 Battle maps (13)
Each map is a list of rows, top row first, one character per hex (codes in §5.7; anchors `1 2 3` attacker, `7 8 9` defender, `1 2 3 4` seats). Odd rows sit half a hex to the right. A script built and checked every map below: every row has the same length; each anchor appears once and has at least 7 free hexes within 2 steps; and the Keep can be reached from every attacker anchor in all four seasons, floods and ice included. Keep that check as a test (§14). `flood` marks maps whose shallows flood in Spring.

**Border Meadow** (`border_meadow`, 13 × 9): used by the tutorial (§6.13) and Skirmish. A meadow with a stream, a bridge on the road and a ruined watchtower Keep. Two troops a side: anchors 1 2 against 7 8.
```
..f.....h.ff.
.ff.1.....~.f
......f...~h.
..2..f...~...
,,,,,,,,,b,K7
....f....~.8.
.f.......~h..
..h..f...~..f
...f.....~.ff
```
**River Ford** (`river_ford`, 15 × 11, flood): used by Rainmere, Thawgate. A river splits the field, with two fords and one bridge on the road. In Spring the fords flood and only the bridge crosses; in Winter the river freezes into open ground.
```
ff..h..w...hfff
.f.1...w....ff.
.....h.~..8..f.
f......w...h...
..2.f..w..h....
,,,,,,,b,,,K7..
..3.f..w..h....
f......w...h...
.....h.~..9..f.
.f.....w....ff.
ff..h..w...hfff
```
**Forest Hold** (`forest_hold`, 15 × 11): used by Kestrel Spire, Thornwick, Lanternfall. Thick woods, a winding road and a clearing Keep between two hills. Forest slows large units (cost 3); in Summer fire can burn it open.
```
...ff....ff..ff
..fff...fff.fff
..1ff.ff.f8..ff
.....fff..h.h..
......f,,,.....
,2...,,..,,K7..
..,,,,..ff.....
....ff.fffh.h..
.f3.fff.ff9..ff
fff.ff..fff.fff
.ff......ff..ff
```
**Mountain Pass** (`mountain_pass`, 15 × 11): used by Wolfsgate, Cinderwall. Peaks squeeze the field into a pass 3 to 5 hexes wide, with ruins in it. Fliers cross the peaks. The Keep holds the pass's mouth.
```
mmmmmmmmmmmmmmm
mmmmmmmmmmmmmmm
...mmmmmmmmm...
..f.hmm.mm.8h..
..1...r........
,2,,,,,,,,,K7,.
.f3.....r......
....hmm.mm.9h..
...mmmmmmmmm...
mmmmmmmmmmmmmmm
mmmmmmmmmmmmmmm
```
**Hill Fort** (`hill_fort`, 15 × 11): used by Midnight Keep, Dawnwatch, Lionsreach. The Keep crowns a ring of hills (+10% DEF, +1 range for bows) with woods on both flanks.
```
..ff.fff.....ff
.fff.ff.....fff
..ff.........ff
.1..h....8hh...
.........hhhh..
,2,,,,,,,hK7hf.
.........hhhh..
.3..h....9hh...
...ff........ff
..fffff.....fff
...fffff.....ff
```
**Marsh Keep** (`marsh_keep`, 15 × 11, flood): used by Russetmoor, Beltane Ford. Bogs and pools around a causeway road. Summer dries the swamp; Spring floods the pools.
```
...............
..fss.fss......
...sss.sss.8.f.
.1.ss~.ss~..h..
...............
,2,,,,,,,,,K7..
......sss......
.3ss.ss~s...9..
..ssssssss.~ss.
..ss.sss~..sss.
......sss...ss.
```
**Lakeside** (`lakeside`, 15 × 11): used by Frostmere, Primrose Ford. A lake fills the north and the land route bends south around it. In Winter the lake freezes and opens a straight path to the Keep.
```
.fff........ff.
.ff..LLLL..fff.
.....LLLLLh.ff.
.1...LLLLL..8..
......LLLL.....
..2...LLL..K7..
...........,...
,3,.....,,,9...
.ff,,,,,,h...ff
ffffff......fff
.ff.ff.......ff
```
**Ruined Abbey** (`ruined_abbey`, 15 × 11): used by Vesper Hall, Ashbarrow, Hallowmere. Broken walls (blocked) and ruins (+10% DEF) around an abbey-tower Keep.
```
.ff........ffff
fff........ffff
.ff..#..#....ff
.1...#.r...r8..
........r.r....
,2,,,,,,,,,K7..
..........r....
.3...r.r.#.r9..
..ff..#..#...ff
.fff........fff
..ff.........ff
```
**Crossroads** (`crossroads`, 15 × 11): used by Noonspire, Goldspur, Lammas Cross. Two roads cross among fields, with houses (blocked) making lanes. Summer wheat hides units (+10 evade).
```
f......,.....f.
..FF...,FF.....
..FFF..,FFF.#..
.1FF.#.,FF.8...
.......,.#.....
,2,,,,,,,,,K7,,
.......,.#.....
.3FF.#.,FF.9...
..FFF..,FFF.#..
..FF...,FF.....
f......,.....f.
```
**Capital Citadel** (`capital_citadel`, 17 × 13): used by Rimeholt, Avalorn, Brazenhold, Ambergate. A ring of ramparts round the courtyard and Keep, with a west gate on the road and a south-west gate. Fliers cross the walls; walkers must use a gate. Dressing follows the realm (ice, blossom, sandstone, timber).
```
..fffff.......fff
.fffff........ff.
..ff.............
......h...####...
.1........#8gg#..
.....h...#gggg#ff
,,,,,,,,,,ggK7g#f
.2.......#gggg#ff
..........#g9g#..
......h..,g###...
.ff3....,,.......
fff..,,,......ff.
.ff.,,ff......fff
```
**Meridian Clockyard** (`meridian_clockyard`, 17 × 13): used by Meridian. The clock-city: an outer wall with three gates, gear blocks inside, and the Great Clock tower as the Keep.
```
..,,...........rr
...,,,,.......rrr
...rr..,g####..rr
..rrr..#gg8g#....
.1.rr..#g#gg##...
......#gggggg#...
,2,,,,,gggK7g##..
......#gggggg#...
.3.rr..#g#gg##...
..rrr..#gg9g#....
...rr..,g####..rr
...,,,,.......rrr
..,,...........rr
```
**Clockwork Sanctum** (`clockwork_sanctum`, 15 × 13): used by the final battle. A round dial chamber. The Gray Knight's troop starts at the centre (7 8 9) and the player's troops enter from the south (1 2 3). Season Dials D stand at north, east, south and west. Its rules follow the map.
```
###############
####gggggg#####
####gggDggg####
###gggggggg####
###gg#ggg#gg###
##gggg8ggggg###
##gDgggK7ggDg##
##gggg9ggggg###
###gg#ggg#gg###
###gggggggg####
####gggDggg####
####g1g2g3#####
###############
```
**Wheel Shrine** (`wheel_shrine`, 15 × 13): used by Skirmish and the AI Hub. Four corners, seats 1 to 4 (Spring NE, Summer SE, Autumn SW, Winter NW), around the Hour Shrine (K) in its courtyard. With 2 sides use seats 1 and 3; with 3 sides use 1, 2 and 3.
```
..........~....
f4.f..f..~...1~
........~......
..f..f.~....~..
...........~...
.f..f.gg..~....
F.....gKg...h..
....F.gg......h
..F......h.....
F.....F....h...
....F..........
.3......h....2.
F.....F...h....
```

**Clockwork Sanctum rules (the final battle):**
- The player wins when the Gray Knight falls; that is the ruler rule. If he stands at the end of bell 12, the thirteenth bell tolls and the battle is lost (§4.17).
- **The Hour Hand:** at the end of each bell it points along one of the 6 hex directions from the centre, moving one step clockwise per bell. Every player unit on that `line6` (to the wall) rolls Stop 70. The next bell's line glows faintly all bell long, so players can step aside.
- **Season Dials (`D`):** at the end of a bell, a dial with a player unit on it lights and stays lit. A Dominion unit standing on a lit dial at a bell's end puts it out. When all four are lit at once, "The Wheel turns!": Timeless breaks for the rest of the battle (full damage, effects apply), the Gray Knight's DEF drops 40%, and the Hour Hand stops.
- **At 50% HP** the Gray Knight calls 2 Second Hands (tier-3 Minutes, level 22). They head for lit dials, and he uses Still every 2 bells instead of every 3.
- **Lunete (if she is present):** her Turning (×2 against Hour) breaks Timeless for one bell, and a dial she stands on lights at once instead of at the bell's end.
- The troops that took Meridian enter, healed to full ("the Wheel's light"), plus up to one more troop from a castle adjacent to Meridian.

**Wheel Shrine rules (Skirmish "Banners of the Wheel" and the AI Hub):**
- A free-for-all of 2 to 4 sides, one troop each (a ruler at level 10 with 2 monsters, §11.4), lasting 6 bells.
- **The season turns every bell:** bell 1 Spring, 2 Summer, 3 Autumn, 4 Winter, 5 Spring, 6 Summer. The Tide and terrain transforms are applied again at each bell's start.
- **Glory:** +1 for every 5 damage dealt, +10 per monster KO, +25 per knight KO, +5 at each bell's end for the side holding the Shrine (`K`), and +10 at the end if your knight still stands.
- The Shrine (`K`) gives whoever stands on it the Keep's +25% DEF and 10% healing per bell. Highest glory wins; ties share a place. A knight that falls takes its troop out, but its glory still counts.

### 6.11 Quest sites (one per castle; a quest is sent from the castle itself, and a story site from any owned castle adjacent to it)

**Regional pools:**

| Region | Items | Beasts | Wanderers |
|---|---|---|---|
| Winter | herb, wintershard, rimesteel, frostplate, wardingcharm, yewlongbow | snowkit, frostwolf, yeti, bat | galeron (from Autumn, Year 1), ettard |
| Spring | herb, springseed, tomeofthaw, hawthornbow, spurs, willowstaff | sproutling, pixie, unicorn, slime | galeron |
| Summer | herb, summerember, sunforged, hauberk, bannerpin, cleaver | salamander, cinderhound, sunbird, sunmane | blanchefleur |
| Autumn | herb, autumnacorn, lanternstaff, horseshoe, robeofseasons, jerkin | jacklamp, scarecrow, ghoul, tusker | blanchefleur, ettard |
| Hour | ether, writ, hourglassrod, signet, amuletoftides, spurs | minute, gearhound | — |

A cross-quarter site uses both neighbours' pools.

| Site | Castle | Seasons away | Focus (+10) | Extra |
|---|---|---|---|---|
| The Lake of Silent Bells | Rimeholt | 2 | Training | Hoarfast: part of `w_lucid_hour` |
| The Howling Scar | Wolfsgate | 1 | Beast | |
| Nimue's Mere | Frostmere | 1 | Treasure | Ettard can be found |
| The Kestrel Eyrie | Kestrel Spire | 2 | Wanderer | |
| The Queen's Orchard | Avalorn | 1 | Treasure | |
| The Briar Maze | Thornwick | 1 | Beast | unicorns ×2 |
| The Weeping Weir | Rainmere | 1 | Beast | rillserpent added to the pool |
| The Unicorn Glade | Primrose Ford | 2 | Beast | unicorns ×3 |
| The Furnace Vaults | Brazenhold | 1 | Treasure | |
| The Wyvern Roost | Goldspur | 2 | Beast | wyvern added at half weight |
| The Ash Dunes | Cinderwall | 1 | Mana | |
| The Lion Steps | Lionsreach | 1 | Wanderer | sunmane ×2 |
| The Harvest Vault | Ambergate | 1 | Treasure | |
| The Barrow Downs | Ashbarrow | 1 | Beast | Mishap +5 |
| The Russet Bog | Russetmoor | 1 | Beast | tusker ×2 |
| The Lantern Road | Lanternfall | 2 | Wanderer | Ettard can be found |
| The Breaking Ice | Thawgate | 1 | Mana | draught added |
| The Old Mill of Beltane | Beltane Ford | 1 | Treasure | the story site in `lunete_letter` |
| The Lammas Fair | Lammas Cross | 1 | Wanderer | the hire choice in `blanchefleur_hire` |
| The Hollow Abbey Crypts | Hallowmere | 2 | Treasure | skeleton and bat beasts; Ettard |
| The Bell That Doesn't Ring | Midnight Keep | 2 | Treasure | |
| The Sunrise Stair | Dawnwatch | 1 | Treasure | |
| The Shadowless Square | Noonspire | 1 | Mana | |
| The Evensong Crypt | Vesper Hall | 2 | Treasure | |
| The Sleeping Court | Meridian | 2 | Treasure | a vignette of the sleeping Keeper |

Each quest return plays a vignette of 2–4 lines with the knight's portrait, for example:
- TREASURE: "Sir Pelleas returns from the Briar Maze with thorns in his hair and a Spring Seed in his glove."
- BEAST: "A pixie followed Wren home from the Weeping Weir. It will not leave her shoulder."
- MISHAP: "Ragnell's patrol was ambushed at the Howling Scar. She will mend; the wolf will not."

Write 3 variants per outcome kind, and fill in `{$knight}`, `{$site}` and `{$thing}` with the story module's variables.

### 6.12 Story

#### 6.12.1 Premise (the back-story the scripts assume)
- For three hundred years the four season-crowns kept the Concord of the Wheel. In Meridian, the Keeper of the Wheel,
  King Aldous, wound the Great Clock that makes each season give way to the next.
- Last winter Aldous fell into a sleep no physician could break, caught between two seconds, and the Clock began to
  falter.
- Lord Chancellor Meliant had lost his wife to an autumn and his son to a winter. He sealed the city, raised a banner
  with no season and proclaimed the Hourless Dominion: when the Thirteenth Month comes, he will stop the Wheel, and no
  one will ever grow old or die.
- At his side stands the Gray Knight, Sir Nonesuch, who is not a man. He is the month that never was, and he feeds on
  stopped time.
- The Keeper's daughter, Princess Lunete, escaped through the Midnight Door and hides among the brigands of Beltane Ford.
- Each crown claims the Hour Throne for its own reasons:
  - Gareth of Verdance would wake the Keeper and restore the Concord;
  - Morgause of Solmark would have Solmark set the Wheel and rule the calendar;
  - Pellam of Amberlyn, old and ill, would end the war with the fewest dead;
  - Mordrain of Hoarfast, mad with grief, would welcome an eternal winter "where nothing rots and nothing ends".
- The chroniclers call the age the Brigantime: every knight a brigand, every road a war.

#### 6.12.2 Style guide (match the source's register)
- **Brief scenes:** 3 to 10 lines between seasons. Each line is at most about 90 characters, so a page shows it whole.
- **An earnest, formal court register:** "my liege", "Your Grace", "it is done". No modern slang and no winking at the
  player.
- **Humour comes from the characters:** Pelleas's poetry, Dagonet's jests, Mordrain's riddles, Tic and Tac's
  overlapping lines. It never mocks the stakes.
- **Narration:** a heading per scene ("Rimeholt. Spring, Year 1 of the Brigantime."), written in a pale colour with
  markup `{c=#b8b0c8}...{/c}`.
- **Markup is used sparingly:** `{w=.4}` for a beat, `{shake}` for a shout, `{s=12}` for dread, and colour for key words
  (seasons in their colours, the Candle in red).
- **Every speaker has a portrait and a voice** (§9.3). Emotes come from the story module: `!`, `?`, `dots`, `heart`,
  `note`.
- **Choices** are 2 short options, worded as intentions ("Let him send it", "Burn the letter").

#### 6.12.3 How events run
- Each event is `G.def('event', id, { when, realm, if, once: true, priority, stage, cast, nodes, effects })`.
  - `when`: `tidings`, `muster` (on entering), `march`, `afterBattle`, `beforeBattle`, `questReturn` or `capture`.
  - `realm`: a realm id, `'player'` (each human realm sees its own) or `'world'`.
  - `if`: story-module conditions plus game tests: `season`, `year`, `owns:<castle>`, `holds:<knight>`,
    `battle.vs:<realm>`, `flag`.
- **At a Tidings:** play up to 3 eligible scenes in priority order (opening 100, story 50, recruit 30, flavour 10); the
  rest roll over. An event marked `expires` drops after its window passes.
- **Effects** are data: `{ addKnight, removeKnight, moveKnight, addMonster: [species, level, castle], addItem, mana,
  flag, aiFlag: [realm, key, value], unlockSite, setTune }`, applied through `CampaignSim` commands, so effects are
  saved and replayable.
- **A stage** is one of 8 sets (§7.4). The cast stands on it, and the camera frames the speaker (`on.look`, as in the
  tactics kit).

#### 6.12.4 Scripts (write these as given; the rest follow the beats in §6.12.5)
**`prologue` (an opening crawl over the title diorama; narrator; auto-advance every 5 s, or confirm):**
1. In the Age of the Wheel, four crowns kept one calendar.
2. Spring to Verdance. Summer to Solmark. Autumn to Amberlyn. Winter to Hoarfast.
3. And in Meridian, the Calendar City, the Keeper of the Wheel wound the Great Clock, that each season might yield to the next.
4. Last winter the Keeper fell into a sleep no physician could break, and the Great Clock began to falter.
5. From the silent city rode Lord Chancellor Meliant, beneath a banner with no season.
6. "When the Thirteenth Month comes," he swore, "I will stop the Wheel, and no one we love will ever grow old."
7. Four crowns answered with steel. Every knight became a brigand; every road, a war.
8. The chroniclers named the age the Brigantime.

**`open_verdance` "The Last Blossom"** (stage: orchard court):
- NARRATOR: Avalorn, the orchard court of Verdance. Spring, Year 1 of the Brigantime.
- AMRIS: Your mother asked to rest beneath the oldest apple, my prince. It has not blossomed since the Clock faltered.
- GARETH: Then it will blossom when the Wheel turns again. Not before.
- LYNETTE: Brave words. Solmark is sharpening its swords, and Hoarfast's Duke laughs alone in his ice hall.
- GARETH: Let them. We do not ride to take a throne, Lynette. We ride to wake a king.
- PELLEAS: And should a throne fall into our laps along the way? I ask only for the ballads.
- WREN: The unicorns won't graze. They smell the Clock's sickness on the east wind.
- GARETH: Then we march before the petals fall. {shake}Sound the horn!{/shake}

**`open_solmark` "Noon Without End"** (stage: sun hall):
- NARRATOR: Brazenhold, the furnace-throne of Solmark. Spring, Year 1 of the Brigantime.
- HESPER: Majesty, the Chancellor promises the Wheel will stop. Imagine it: a summer without end.
- MORGAUSE: I have imagined it, Hesper. Every harvest burned to dust. Every child born into drought.
- AGRAVAIN: Then we take Meridian and set the Wheel ourselves! Our summer, on our terms!
- MORGAUSE: Now you sound like a Solmarker. {w=.4}A long noon, Sir Agravain, is still a noon that ends.
- ELIDURE: The brigands at Beltane and Lammas grow fat on our roads. Shall I clear them, my queen?
- BRENNOC: Take the wyverns. They've not flown proper since the Clock went sick.
- MORGAUSE: We march. Let every crown in Forseason learn what the sun can do.

**`open_amberlyn` "The Quiet King"** (stage: harvest hall):
- NARRATOR: Ambergate, the harvest hall of Amberlyn. Spring, Year 1 of the Brigantime.
- LAMORAK: The granaries stand half full, Majesty. The rest rotted where the Clock's sickness touched the fields.
- ENID: Father has not slept. He watches the old sundial in the garden, as if it might tell him something.
- DAGONET: It tells me it's noon, my lady. But it told me that yesterday as well.
- VESNA: The lanterns on the Lantern Road burn blue now. The dead grow restless when time limps.
- PELLAM: {w=.8}...
- PELLAM: We will end this.
- LAMORAK: Then we ride, my king. Four words from you are worth a hundred from any other crown.

**`open_hoarfast` "A Crown of Icicles"** (stage: ice hall):
- NARRATOR: Rimeholt, the frozen court of Hoarfast. Spring, Year 1 of the Brigantime. The snow has not melted.
- MORDRAIN: Ragnell! What has a face and hands, and never stops running?
- RAGNELL: A clock, Your Grace. You asked me yesterday.
- MORDRAIN: Did I? Then the clock has not stopped yet. Pity. {w=.3}In winter nothing rots, Ragnell. Nothing ends.
- NIMUE: The Chancellor would agree with you, Duke. That is what frightens me.
- GORM: My yeti won't eat. They don't like the stopped hour. I don't like it either.
- SAFIR: Wolves are out of Thawgate, and brigands ride with them.
- MORDRAIN: Then we go hunting! Safir, the bows. Ragnell, the banners. Gorm, bring the bears.
- RAGNELL: And I shall bring the sense. As always.

**`banner_without_season`** (stage: Meridian clock chamber, with the Keeper asleep on a bier):
- NARRATOR: Meridian. Within the Great Clock, the hands tremble between two seconds.
- MELIANT: Do you hear it, Sir Nonesuch? Every tick is a funeral bell.
- GRAY KNIGHT: I hear nothing, Chancellor. That is the gift I bring.
- MELIANT: My wife died in the turning of an autumn. My son, in a winter. I will not give the Wheel another year.
- GRAY KNIGHT: Then hold the city until the Thirteenth Month. When it comes, the hands will stop. So will grief.
- MELIANT: The four crowns will come for it.
- GRAY KNIGHT: Let them spend their springs and summers on one another. Time is the only army I need.

**`candle_lit`** (stage: clock chamber):
- NARRATOR: Meridian. Spring, Year 2 of the Brigantime.
- GRAY KNIGHT: A candle of hours, Chancellor. Twelve seasons tall. When it is ash, the Thirteenth Month begins.
- MELIANT: And the Keeper?
- GRAY KNIGHT: He will sleep through the end of time. Is that not a mercy? *(emote: dots)*
- *Effect: the Hour-Candle appears on the HUD showing 12 (difficulty-adjusted, §4.1).*

**`meridian_falls`** (stage: clock chamber; the player's ruler and the knights who took the city):
- MELIANT: *(kneels)* So it is done. {w=.5}Forgive me, Keeper. I only wanted the clocks to stop.
- GRAY KNIGHT: And they shall, Chancellor. You were a key, nothing more. A stopped city is only a seed.
- RULER: GARETH "Who are you?" / MORGAUSE "Name yourself, before I burn the name off your tomb." / PELLAM "...Who?" /
  MORDRAIN "A riddle for you: who are you?"
- GRAY KNIGHT: The month that never was. The hour between hours. Every season you ever lost belongs to me.
- GRAY KNIGHT: Come down into the Sanctum, little crown. Let us see whether your Wheel still turns.
- If Lunete is with you, LUNETE: "My father's clock is not yours to break. Stand on the dials with me, and we will turn
  it together." If not, a knight of yours: "The dials, my liege. The old tales say the Wheel answers four seasons
  together."
- *Effect: the Clockwork Sanctum battle starts at once (§6.10).*

**`ending_verdance` "The Wheel Turns Again":**
- NARRATOR: The thirteenth bell never rang.
- GRAY KNIGHT: *(fading)* Then turn, little Wheel. Turn, and lose everything again. I will wait between the seconds.
- NARRATOR: The Great Clock shuddered, and its hands moved on.
- KEEPER: Spring... I dreamed of spring. Thank you, child of the Bough.
- GARETH: Rest now, Keeper. The Wheel is in good hands.
- NARRATOR: In Avalorn, the oldest apple blossomed that very morning.
- Epilogue cards, one per surviving named knight (2 lines each), for example:
  - "Sir Pelleas wrote four hundred verses about the Sanctum. Captain Elidure read none of them, and married him anyway."
    (if `v_elidure_joins`)
  - "Dame Lynette kept the Concord's peace for forty years, and never once admitted she enjoyed it."
  - With Lunete: "Lunete was crowned Keeper of the Wheel. Gareth knelt first." Without her: "Gareth wound the Great
    Clock each midwinter until a new Keeper was found."

**`brigands_no_more_hob`** (an example of the captain pattern; the other three follow it in their own voices):
- HOB: All right, all right! I yield! Mind the boots, they're new.
- RULER: You robbed our roads all winter, Hob Mudspur.
- HOB: And I'd rob 'em for you all summer, if the pay's honest. Better a brigand who knows the passes.
- Choice: "Take his oath" (Hob joins your realm with his surviving monsters) or "Exile him" (+60 mana from his hoard).

#### 6.12.5 Event list (beats; write each scene in the style above)

| id | When / if | Cast and stage | Beats | Effects |
|---|---|---|---|---|
| `prologue` | new campaign | narrator, title diorama | §6.12.4 | — |
| `open_<realm>` | Tidings, Spring Y1, each human realm | its court | §6.12.4 | an objective toast: "Take a brigand castle. Reach Meridian before the Thirteenth Month." |
| `tutorial` | after `open_<realm>` | ruler | "A brigand patrol blocks the border road." Choice: fight (tutorial) or skip | starts Border Meadow (§6.13) |
| `banner_without_season` | Spring Y1, world | clock chamber | §6.12.4 | — |
| `free_companies` | the player's first March | herald card | brigand castles hold the cross-quarter roads; the Keep rule | tutorial tip |
| `first_victory` / `first_loss` | after the first battle won / lost | ruler and a knight | pride or grief; a tip on EXP and promotions, or on Delegate and Retreat | tip |
| `long_winter` | Tidings, Winter Y1, world | ice hall (Mordrain) or herald | "The thaw did not come." Mordrain laughs at the snow | the Winter Tide is +30% this season |
| `candle_lit` | Tidings, Spring Y2, world | clock chamber | §6.12.4 | the candle appears |
| `dominion_awakens` | Tidings, Summer Y2, world | war tent (Bertilak) | "The Hour marches." Bertilak salutes his foes | Dominion aggression on (§4.15) |
| `lunete_letter` | Autumn Y1 if the player holds Rainmere, Goldspur or Beltane; otherwise Spring Y2 | road | a letter signed "L.": "the Keeper's daughter lives; seek the Old Mill" | unlocks the story site at Beltane Ford |
| `lunete_joins` | the Old Mill quest returns | mill | Gerrow: "Take her, then. She eats more than my bats." Lunete: "I am no prize, my lord. I am a promise." | adds Lunete (Lv 8) |
| `lunete_arrives` | Spring Y3 if she hasn't joined | your capital's court | she walks in alone, soaked from the road | adds Lunete |
| `brigands_no_more_<hob, gerrow, dafydd, abbot>` | the player captures that brigand castle | that castle | the yield; §6.12.4 | the choice: captain joins, or +60 mana |
| `owain` | the player's realm first binds a wyvern or frost wyrm | stable | Owain: "I lost my Kerrow in the Long Winter. Let me teach yours to fly." | adds Owain |
| `galeron`, `ettard`, `blanchefleur` | a Wanderer outcome | road | the meeting, and why they join | adds the knight |
| `blanchefleur_hire` | the Lammas Fair quest returns | fair | "One hundred and fifty, and I don't fight children." | choice: pay 150 mana for Blanchefleur, or refuse |
| `stillness` | the first stilling (Autumn Y3) | clock chamber | Gray Knight: "Listen. A castle has stopped breathing." | — |
| `thirteenth_warning` | the candle at 1 | herald | "One season remains." | — |
| `meridian_falls` | the player takes Meridian | clock chamber | §6.12.4 | the Sanctum battle |
| `sanctum_retry` | the Sanctum battle is lost | clock chamber | "The Wheel trembles, but it holds." | the Sanctum can be attacked again |
| `rival_meridian` / `rival_failed` | an AI realm takes Meridian / loses its Sanctum battle | herald | the warning, then the relief | — |
| `realm_falls_<realm>` | a realm is eliminated | that ruler | a lament (Gareth: "Forgive me, Mother"; Morgause: "Even suns set"; Pellam: "...Enough."; Mordrain: "Ice melts. Who knew?") | knights freed |
| `v_pelleas_letter` | Summer Y1, Verdance | orchard | Pelleas has written to Captain Elidure, whom he met at the last Concord | choice: send it (flag `v_letter`) or burn it |
| `v_elidure_joins` | `v_letter`, and Verdance beats a troop led by Elidure or takes Goldspur | war tent | Elidure: "Your poetry is dreadful. Your cause is not." | Elidure moves to Verdance |
| `v_unicorn_herd` | Autumn Y1, Verdance holds Thornwick, Wren alive | glade | Wren finds a herd | a unicorn (Wren's level) and a Spring Seed |
| `v_green_oath` | Verdance takes its first Hour satellite | war tent | Gareth swears to wake the Keeper | Gareth +2 Bond; learns Verdant Tempest now |
| `v_amris_past` | Winter Y2, Verdance | chapel | Amris was once a knight of Hoarfast. Choice: write to the Duke, or keep silent | write: Hoarfast won't march on Verdance for 2 seasons (`aiFlag`) |
| `s_hesper_offer` | Autumn Y1, Solmark | sun hall | Hesper offers the Hour's magic | accept: Lionsreach may summon minutes and stillwraiths, and `s_hesper_betrays` will come; refuse: Hesper +2 levels |
| `s_hesper_betrays` | Summer Y3 if accepted | sun hall | Hesper: "Time was always the better master, Majesty." | Hesper and her troop join the Dominion at the nearest satellite |
| `s_wyvern_eggs` | Spring Y2, Solmark holds Goldspur | roost | Brennoc hatches eggs | a wyvern (Lv 5) and a Summer Ember |
| `s_agravain_duel` | before the first Solmark–Hoarfast battle with Agravain | battlefield | he challenges Ragnell | Agravain has Valor in bell 1 |
| `a_dagonet_jest` | Summer Y1, Amberlyn | harvest hall | a prank unmasks an Hourless spy | a Signet of Command |
| `a_kings_cough` | Winter Y1, Amberlyn | bedchamber | Pellam's illness. Choice: name Enid heir now, or wait | name her: Enid +3 levels and learns Renewal |
| `a_lanterns` | Autumn Y2, Amberlyn (All-Hallows) | the Lantern Road | Vesna lights the lanterns for the dead | 2 jack-o'-lamps (Lv 6) and an Autumn Acorn |
| `a_lamorak_stand` | before a battle where Lamorak defends Ashbarrow | battlefield | the old knight's oath | Lamorak is Warded for bells 1–2 |
| `w_nimue_bargain` | Summer Y1, Hoarfast | frozen mere | an egg for a memory. Choice: accept or refuse | accept: a frost wyrm (Lv 4) and Mordrain "forgets a name" (flag); refuse: Nimue +1 level |
| `w_gorm_cub` | Autumn Y1, Hoarfast | snowfield | Gorm's lost yeti cub comes home | a yeti (Lv 5) |
| `w_ragnell_doubt` | Winter Y2, Hoarfast | battlements | "Do I follow a madman?" Choice: trust him, or watch him | trust: Ragnell +2 levels; watch: Ragnell gets a Warding Charm |
| `w_lucid_hour` | Hoarfast takes its first Hour satellite | ice hall | lucid for once, Mordrain tells of his sister, drowned in the lake beneath Rimeholt: if winter never ends, the lake never gives her back | Mad Gambit never misfires again |
| `ending_<realm>` | the Gray Knight falls | per realm | Verdance in §6.12.4; Solmark "The Long Noon Ends" (Morgause: "Even the sun must set, or it is only a fire."); Amberlyn "The Last Harvest" (Pellam's last word: "Turn." Enid is crowned); Hoarfast "Spring Thaw" (Mordrain: "Let the ice go, Ragnell. Let her go.") | credits |
| `ending_candle` | the candle burns out | clock chamber | Gray Knight: "Hush now. Nothing will ever end again." The picture drains to grey: THE LEGEND ENDS IN SILENCE | Retry (latest save) or Title |
| `ending_wheel_<realm>` | a rival sets the Wheel | Hour Throne | that ruler's line; the land floods, burns, rots or freezes: THE LEGEND ENDS IN FLOOD / FIRE / DUST / ICE | Retry or Title |
| `ending_fallen` | the player's last castle falls | road | the ruler in exile: THE LEGEND FORGETS YOU | Retry or Title |

#### 6.12.6 Rival lines (2 lines before a battle when both are on the field; the first match plays)
- AGRAVAIN / RAGNELL: "Ice-Eye! I've waited all summer to melt you." / "Then you'll wait all winter to stand back up."
- PELLEAS / ELIDURE: "Captain! Did you read my letter?" / "I'm reading your formation, Sir Pelleas. It's worse."
- GARETH / MORGAUSE: "The Wheel isn't yours to take, Your Majesty." / "Then come and stop me, princeling. Bring your blossoms."
- MORDRAIN / PELLAM: "The Quiet King! Say something, old man!" / "...No."
- LYNETTE / AGRAVAIN: "Cinderjaw. Still shouting?" / "Still standing in my way?"
- DAGONET / HOB: "A brigand with a funny name! Finally, a rival." / "Oi! Mudspur is a proud name!"
- MORGAUSE / PELLAM: "Step aside, old king. Summer has no patience for harvests." / "...Patience."
- MORDRAIN / GARETH: "Little sprout! Do you know why snow is so quiet?" / "Because it's waiting for spring."
- MELIANT / LUNETE: "Princess... you should be asleep beside your father." / "Somebody has to stay awake, Chancellor."
- BERTILAK / anyone: "Courtesy first: I shall kill you slowly, and with every respect."
- TIC and TAC / anyone: "Tic says—" / "—Tac agrees!"
- AURELIE / anyone: "Must you? I was enjoying the silence."
- GRAY KNIGHT (the Sanctum opens): "Twelve bells, little crown. Then nothing, ever again."

### 6.13 Tutorial: "The Border Road" (Border Meadow, Spring)
- **Sides:** the player's ruler and the realm's Squire (Lynette, Agravain, Lamorak or Ragnell) with their troops, against
  a brigand patrol: a Brigand Captain, the "Patrol Sergeant" at Lv 3, with a slime, two bats and a skeleton at Lv 2–3.
- **Teaching:** non-modal tip cards walk through these steps. Each one appears when its situation first arises, waits for
  the action it asks for, and never blocks other play:
  1. Choose a unit.
  2. Move (the blue hexes).
  3. Attack (reading the forecast: hit, damage, ▲ ▼ elements).
  4. Ward rings (a monster outside its ring is weaker).
  5. Spells need planted feet (cast before moving).
  6. The season badge (the Spring Tide).
  7. Surround a foe for more damage.
  8. Fell the captain, and his monsters flee or are captured.
  9. Twelve bells and the Keep rule.
- Winning returns to the campaign map. The first opening of each Muster panel shows its own one-card tip (turn tips off
  in Settings).

---

## 7. Presentation: art, rendering and animation

### 7.1 Look target and palettes
Follow the engine's look target (API.md, "Look target") in every scene:
- `res: 'ps1', expand: true`; HD Humanoids at size 1.1–1.6, dressed;
- textured floors; 3–8 props per screen; lights in every scene; effects on every hit; the title font; shading with
  `E.tones` everywhere.

| Palette | Main colours |
|---|---|
| Spring | grass `#6abf4b` / `#9ad86a`, blossom `#f4b8d0`, sky `#a8d8f0`, water `#4a9ad8` |
| Summer | gold `#d8b048` / `#e8d080`, red rock `#c84a2a`, haze sky `#f0d890`, savanna `#c8b060` |
| Autumn | amber `#c87a2a` / `#a85a1e`, bark `#5a3a2a`, field `#d8a050`, sky `#e8b878` |
| Winter | snow `#e8f0f8`, snow shadow `#8aa8c8`, ice `#a8e0f0`, pine `#2a5a4a`, sky `#b8c8e0` |
| Hour | slate `#3a3a46`, brass `#d8c070`, ivory `#f0e8d8`, void `#14121c` |

Battle ambient light by season: Spring .8 (cool green), Summer .95 (warm), Autumn .7 (amber), Winter .65 (blue). The
Hour places are dark (.45): brass lamps and the clock's glow light them.

TASK.md treats the performance budget as unlimited, and FPS targets and optimization are out of scope. Add the detail,
lights, shadows, weather and effects each scene needs, and spend no time on frame-rate work.

### 7.2 The battlefield (`31-art-hexfield.js`)
- **The floor** is a wall-less `E.TileMap({ w, h, floorTex, outside })` sized to the field plus 2 tiles of margin.
  - `floorTex(x, y)` finds the hex with `G.hex.toCell` (cube rounding, not a search) and colours it with that terrain's
    texture for the season and region. Use `E.tex.grass`, `dirt`, `water` and `flagstone` with palettes; write custom
    functions for snow, ice, swamp, field, forest floor, ash and burning.
  - Hex edges are darkened 18% within 0.8 units of the edge (the "Grid lines: Bold" setting), 8% ("Subtle") or not at
    all ("Off").
  - The margin uses the region's ground, fading darker.
  - Re-bake with `map.floors = {}` when the season or terrain changes (fire, ash, the hub's bell seasons).
- **Water:** tag the square cells under water hexes `'water'` (`map.setFloor`) so the engine's shimmer plays, and draw
  2–3 moving dithered ripple arcs per water hex as decals.
- **Props per terrain** (placed by a seeded rng per hex, within 8 units of its centre, recoloured per region and season):

| Terrain | Props |
|---|---|
| forest | 2–3 trees: `tree` and `pine` props or store shapes (`kenney-nature` oaks, fall oaks and pines); blossom tint in Spring, fall oaks in Autumn, snowy pines in Winter |
| hill | floor shading for a lighter top and darker rim, plus 1–2 rocks |
| mountain | clusters of `rock` shapes (r 12–16); crystals in Hour places |
| swamp | reeds (`grass` props, tinted) and puddle decals |
| ruins | broken pillars and rubble |
| field | crops (gold `grass` props), stubble specks in Autumn, snow in Winter |
| bridge | a plank-bridge shape across the hex |
| Keep | the `keep` shape (a round tower flying the owner's banner, with torch lights) |

- **Raised blocks (`#`):** a shape at each hex centre, chosen by the map's `blockShape`:
  - `hexblock`: `['cyl', mat, [0,0,0], 16.2, 24, { seg: 6 }]` (a hex prism), in the region's stone, with crenellations;
  - `cottage`: Crossroads houses;
  - `gear`: Meridian and the Sanctum;
  - `cliff`: rock faces.
  Units behind a block get the engine's x-ray silhouette.
- **Decals each frame** (polygons through `r.w` of the hex corners at z 0):

| Decal | Look |
|---|---|
| move range | blue `#3a9aff`, α .45 |
| attack range | red `#ff3a4a`, α .4 |
| area preview | gold `#ffd040`, α .6 |
| path | white chevrons along the path |
| Ward rings | a dashed outline of each knight's Ward in its side's colour; the active troop's also filled at α .12 |
| danger overlay | a red hatch on hexes enemies can hit next bell |
| cursor | a pulsing white-and-gold hex outline, plus a bobbing arrow over a unit there |
| Sanctum | dials (lit or unlit) and the Hour Hand's glowing line |
| fire | burning hexes: fire particles and a glow |

- **Units:** `r.actor` with the rig, a shadow, and a side pennant above the head (the sigil on the side's banner shape).
  A 12 × 2 px HP bar appears only for the unit under the cursor, the active troop and damaged units. Up to 3 status
  icons sit above the pennant.
- **Camera:**
  - It eases to the cursor hex over .15 s; zoom ranges .7–2; turns are 60° steps with a .3 s tween.
  - During AI turns it frames the actor, then the target.
  - "Battle camera: Dynamic" zooms ×1.25 for spells and crits for a moment; "Fixed" never does.
- **Views:** `board` (custom `new E.View('board', 'Board', 0, 50, 1)`) is the default, and `iso` is the alternate (V,
  or the Settings "Battle view").
- **Weather** (set in `enter`):
  - Spring: rain .35 plus a custom `petals` kind added to `E.WEATHER`;
  - Summer: clear, with faint dust (`sand` .1);
  - Autumn: leaves .5 with wind .4;
  - Winter: snow .6 (.9 for a moment during Blizzard).
  Reduce motion halves every amount.
- **Lighting:** canvas lighting with the season's ambient, Keep torches, a light per spell effect, lit dials and glowing
  wisps (emissive). Call `game.enableGPU({ map })` where WebGPU exists (trees and towers as `lights.caster`), and match
  `gpu.ambient` to the canvas ambient for the fallback.

### 7.3 The world map (`32-art-worldmap.js`)
- **A 64 × 64-tile `TileMap`** (1024 × 1024 units) in the `threequarter` view. `cam.free` pans within bounds; zoom
  ranges .6–1.6.
- **`floorTex`:**
  - **Coast:** sea beyond a coast at radius 470 ± 30 of noise, by angle; deep blue water with shimmer tags and an
    8-unit beach ring.
  - **Land by sector:** north Winter, east Spring, south Summer, west Autumn; the ±12° wedges around the diagonals blend
    two seasons.
  - **Sub-terrain by noise:**
    - Winter: snow plain, pine wood, ice lake, Rimewall rock;
    - Spring: meadow, orchard, river, lake;
    - Summer: savanna, red mesa, dune, oasis;
    - Autumn: field strips, oak wood, bog, pumpkin field.
  - **Hour plateau:** radius < 170, grey flagstone around Meridian.
  - **Rivers:** 4 rivers (`E.Path`, catmull) from the plateau or the Rimewall to the sea.
  - **Roads:** the 36 roads as gently wavy paths, 5 units wide, dirt or cobble.
  - **Ownership:** a dithered tint of the owner's colour over each castle's Voronoi cell, re-baked when ownership
    changes.
  - **Season overlay:** snow dither in Winter (less in the south), blossom specks in Spring, warmth in Summer, leaf
    specks in Autumn.
- **Props:** trees per region (pines; blossoms; palms and cacti; fall oaks), Rimewall rocks and southern mesas,
  watermills (`kenney-fantasy-town:watermill`), a few cottages, shrines, and Meridian's custom `clocktower` with a
  working clock face.
- **Castles:** custom shapes, about 40 × 40 units, in six styles that follow the region:
  - `castle-winter`: grey stone, blue slate, icicles;
  - `castle-spring`: white stone, green roofs, blossom;
  - `castle-summer`: sandstone, red-and-gold domes;
  - `castle-autumn`: timber and brown stone, amber roofs;
  - `castle-hour`: black and white marble, a brass clock;
  - `castle-brigand`: a palisade and tents.
  The banner pole follows the owner and flies its sigil; on capture, the banner lowers and the new one rises (a tween).
- **Troop figures:** one small Humanoid (size .7) per knight in front of its castle (up to 4, then a "+N" badge).
  Questing knights show an "away" icon; wounded knights kneel.
- **Markers:**
  - the focus ring;
  - a red "!" over castles a neighbour can attack this season;
  - Stilled castles in grey with a stopped clock;
  - realm-coloured march arrows (animated chevrons along the road, with a troop count).
- **Resolution:** the marching figures walk the road (a 1.2 s tween along its `E.Path`), then a swirl transition into
  the battle. The banner swap and a short fanfare or defeat sting follow.
- **Season change:** the new season sweeps out from Meridian as a circular wipe with a dithered edge (1.5 s), while the
  music crossfades and the weather changes.

### 7.4 Story stages (`64-scene-event.js`)
- Eight small sets in the `brawler` view, each a little TileMap with props and an `E.Backdrop`:

| Set | Dressing |
|---|---|
| orchard (Avalorn) | blossom trees, the Queen's gravestone, petals |
| sun hall (Brazenhold) | sandstone pillars, braziers, gold banners |
| harvest hall (Ambergate) | timber walls, hay bales and pumpkins (`kenney-graveyard`), lanterns, a sundial |
| ice hall (Rimeholt) | ice pillars (`crystal` props), blue light, light snow |
| clock chamber (Meridian) | a giant clock face, gears, the Keeper's bier, brass lamps, darkness |
| war tent | tents (`kenney-nature`), a map table, the speaker's banners |
| road and field | a backdrop by region and season |
| stable and roost | straw, fences, the monster in question |

- The cast stands in a row. The speaker steps forward and faces the listener, with `pose` and `expr` per line. Emote
  balloons come from the story module, and the camera tweens to frame each speaker.
- `E.Dialog` sits at the bottom, with the speaker's portrait, the name in the realm's colour and the speaker's voice
  (§9.3).

### 7.5 Units (`33-art-units.js`, `engine-ext/beasts.js`)
**Humanoids** (knights, and the humanoid monsters: treant, scarecrow, ghoul, golem, yeti, clockwork, stillwraith,
skeleton, ogre, harpy, pixie):
- Built with `new E.Humanoid(look)` from the data.
- Swords and staves are native. Bows, whips, scythes, clubs and spears are drawn from `rig.hand()` and `rig.tip()`, as
  the tactics kit's `bowOf` draws its bow.
- Give each class line its own moves (the engine's rule: no two classes share a swing):

| Who | Moves |
|---|---|
| Warrior line | Slash `slash`; Charge: run in, then `thrust`; Holy Strike `overhead` with a glow; Shield Wall `block`; Rally `cheer` |
| Ranger line | Shoot `throw` with the bow drawn and an arrow on an arc; Volley rains arrows |
| Mage line | Strike `overhead`; spells: a `cast` pose (.4 s wind-up with a rune circle at the feet), then the effect |
| Cleric line | `rising` with the staff; heals use `cast` with a rising glow |
| Beast line | Lash `backslash` with a whip line to the target; Goad `wave`; Roar `hips` with `expr: 'shout'` |
| Rulers | Gareth `rising` into `slash`; Morgause `twohand` and `spin`; Pellam a slow `cast`; Mordrain a `spin` of the staff with ice; Meliant `cast` with clock effects |
| The Gray Knight | `plunge`, `twohand` and `spin` at size 1.6, each with a .35 s wind-up |

- **Reactions:**
  - hurt: the rig's hurt pose and a flash; Guard: `guard` or `block`; victory: `cheer`;
  - a fallen knight: `kneel`, then fades out under a white banner;
  - a humanoid monster's death: `die`, then it dissolves into motes;
  - Sleep: `down` .3 with z's; Stop: a grey tint and a clock icon; Chill: a blue tint; Burn: small flames.

**`E.Beast` (new: `engine-ext/beasts.js`):**
- **Constructor:** `new E.Beast({ kind: 'quad' | 'drake' | 'avian' | 'serpent', preset, size, colors: { body, belly,
  dark, accent, eye, horn, wing, flame }, parts: { horn, mane, tusks, crest, fins, wings: 'feather' | 'bat' | 'none',
  tail: 'long' | 'short' | 'snake' | 'flame' | 'pendulum' } })`.
- **Skeleton** (3D, in world units from the feet, scaled by size):
  - a spine chain of 4–6 nodes, a neck chain of 2–4, and a head;
  - quad: 4 legs with 2-bone IK;
  - drake: 2 or 4 legs plus wings (shoulder, elbow, wrist and finger tips for the membranes);
  - avian: 2 legs, feathered wings and a tail fan;
  - serpent: 12–20 segments that follow a path history at fixed spacing, with the head raised.
- **Motion:**
  - the gait comes from velocity (the phase advances with speed over stride; quads trot on diagonal pairs);
  - planted feet use IK, the body bobs, the head counter-bobs, and a spring-damper chain sways the tail;
  - fliers hover 8 units up and flap faster when moving;
  - idle: breathing, ear and tail flicks.
- **Actions** (`attack: { kind, phase, u }`, timed like `E.Attack`, with enemy wind-ups of .25–.35 s):

| Action | Motion |
|---|---|
| bite | the neck reaches, the jaw opens, a lunge |
| claw | a foreleg swipe |
| gore | head down, then a charge |
| breath | rear back, then thrust; it emits from `mouth()` |
| tailsweep | the body twists and the tail sweeps an arc |
| roar | head up, mouth open, a shake |
| pounce | crouch, then a leaping arc |
| dive | rise, then swoop down |
| coil | the serpent wraps around its target |
| stomp | rear up, then slam down |

  Reactions: hurt recoil, sleep (lie down), and death (fall onto its side over .6 s, then dissolve into motes of its
  element's colour).
- **Drawing:**
  - project each joint through the view (`view.p`, from the `r.actor` origin);
  - sort the parts by camera depth (far limbs and wing first, then the body, then the near side);
  - body segments are shaded ellipses (`px.ell` with `E.tones`), limbs are tapered strokes, wings are `px.poly`
    membranes or feather stripes;
  - finish with a 1 px dark outline, eye catch-lights, and horns, tusks, manes (flame polygons for Summer beasts) and
    crests.
- **Sizes on screen at zoom 1:** S 12–16 px tall, M 22–30, L 40–60 (dragons up to 70 with wings).
- **`drawPortrait(g, x, y, size)`:** the head and shoulders, framed, rendered once per form to a cached offscreen
  canvas.
- **Presets:** `hound`, `wolf`, `horse`, `cat`, `boar`, `lizard`, `griffin` (eagle front, lion rear, wings),
  `drake2` (wyvern), `drake4` (dragon), `avian`, `serpent`.
- **`E.Wings` for Humanoids** (pixie insect wings, harpy feather wings): drawn behind or in front of the rig by its
  facing against the view, flapping on a sine.
- **Check them in the gallery** (`#gallery`, every species × form × action, cycling) and filmstrip each kind's walk and
  attacks (§14).

**Blobs** (`E.Blob`), with small overlays:
- sproutling: two leaf polygons on top;
- jack-o'-lamp: pumpkin ridges and an emissive carved face;
- snowkit: ear tufts and frost glints;
- minute: a clock face whose hands turn with time, and orbiting gear dots;
- slime: translucency (α .8) and a highlight;
- bat: wings and fangs;
- tier 2 and 3 add a crown or aura sprite.

**Portraits:** knights use `rig.drawPortrait`, beasts their `drawPortrait`, and blobs a scaled framed draw.

### 7.6 Effects (`34-art-fx.js`)

| Source | Effect |
|---|---|
| Spring | green and pink leaf and petal bursts (`particles` bits), vines growing from the ground (animated polylines), yellow pollen glints |
| Summer | `particles.fire` and small explosions, a gold sun-disc flare (`r.glowDisc`), heat shimmer |
| Autumn | spiralling orange, red and brown leaves; Harvest Moon: a pale-orange disc rises behind the target, then floods it with light; purple-orange wisp flames |
| Winter | white-cyan ice shards (radiating polygons), cyan frost rings, snow bursts, a crystal that briefly encases the target |
| Hour | a clock-face ring decal with sweeping hands, a grey desaturation flash (low-strength `game.flash`), brass gear bits |
| Dawnlight and Turning | white-gold rays and glints, with a bell |

- **Hits:** `game.hitFx` (hit-stop .05 s, shake, sparks, a bouncing number). Numbers are white, yellow "CRIT!", green
  "+n" or grey "MISS". "▲ STRONG" or "▼ WEAK" floats over the target for .6 s.
- **Statuses and buffs:** an icon each plus a tint. Poison shows green bubbles, Burn flames, Chill frost, Sleep z's and
  Stop grey with a clock. Valor shows red chevrons, Haste speed lines and Warded a blue shield.
- **Summoning:** a rotating rune ring in the element's colour (a decal), a pillar of light (emissive `r.queue`) and
  rising particles. The monster scales up from 0 with a bounce, then roars.
- **Capture:** a chain of light (a polyline of links) from the captor to the monster. The monster's pennant flips side
  in a flash, then it walks to the captor and fades.
- **Level up:** a gold column with stat gains popping up ("+3 ATK"), and a jingle.
- **Promotion or class change:** a white flash and spiralling ribbons in the element's colours; the rig swaps to the new
  form at the peak; a fanfare.
- **The bell clock (HUD):** a 12-hour dial whose hand ticks to the current bell as the bell tolls.

### 7.7 Animation checklist (each gets a filmstrip or gallery look, §14)
- The 8 class moves and the 6 ruler signatures.
- Every beast kind × its actions.
- Blob idles and attacks.
- Reactions: hurt, guard, sleep, stop, KO, retreat.
- Summon, capture, level-up and promotion effects.
- On the world map: the march walk, banner swaps and the season wipe.
- The title lineup and the story poses.

---

## 8. UI and UX: 10-foot, controller first

### 8.1 Rules for every screen
- **Text:** body text is the engine's 5 × 7 font at a logical 320 × 240 (on a 1080p TV a line is about 32 px tall,
  readable at 10 feet). Titles use scale 2–3. "UI scale: Large" doubles panel text, and layouts reflow to fewer rows.
- **Density:**
  - at most 8 rows per list (5 at Large), at most 6 cards per grid, and about 6 numbers per panel;
  - stats are shown as bars with their numbers, never as stat tables (TASK.md: no dense web-style screens).
- **Panels:** `E.ui.box` at α .85 or more over the world. Keep 8 px from the edges, clear of `game.cornerArea()` and of
  the prompt bar.
- **Focus:** something is always focused. The focused item gets a bright frame, an arrow and a small bounce, and moving
  the focus blips.
- **Every screen has a way back** (○, Esc or right click) and a prompt bar. A disabled choice says why in one line in
  the footer.

### 8.2 The input map (the game's own preset per scene; the engine keeps its menu keys)

| Action | DualSense (standard mapping) | Xbox | Keyboard | Mouse | Does |
|---|---|---|---|---|---|
| `up down left right` | D-pad, left stick | D-pad, left stick | W A S D, arrow keys | hover moves the cursor and focus | move the cursor or focus |
| `confirm` | ✕ (button 0) | A | Enter | left click | select, confirm |
| `cancel` | ○ (1) | B | Esc, Backspace | right click | back, undo a move, close |
| `command` | □ (2): tap opens the command menu, hold 0.6 s ends the turn or phase | X | Space (tap or hold) | — | the context menu: End troop turn, Delegate troop, Danger view (battle); Realm, Chronicle, Objectives, End phase (map) |
| `info` | △ (3) | Y | I | middle click | details of what is focused; the backlog in story scenes |
| `prev`, `next` | L1, R1 (4, 5) | LB, RB | Shift+Tab, Tab | — | cycle units (battle), castles (map) or tabs (panels) |
| `zoomOut`, `zoomIn` | L2, R2 (6, 7) | LT, RT | `-`, `=` | wheel | zoom |
| `danger` | L3 (10) | LS | T | — | battle: toggle the enemy-threat overlay |
| `turn` | R3 (11) | RS | Q, E (left, right) | — | battle: turn the camera 60° |
| `pan` | right stick | right stick | (the camera follows the cursor) | middle drag, screen edge (setting) | pan the camera; moving the cursor re-centres it |
| `pause` | Options (9) | Menu | P, and Esc when nothing is open | the corner button | the pause menu |
| `help` | — | — | F1 | — | How to Play |

- Esc first closes whatever is open (the scene's `back()`, or the cancel action). Only when nothing is open does it call
  `game.pause()`. Bind `pause` to P and Pad9 only, so the engine's Controls screen has no conflict.
- Create (Pad8) is never bound. In a hub session, Options is ignored while Create is held (§11.6).
- Menus repeat a held direction after .25 s, then every .08 s. The battle cursor steps to the hex neighbour whose
  on-screen direction is nearest the input's (`G.hex` neighbour vs. `view.screenDirToGround`), with a fixed tie-break.

### 8.3 Prompts and glyphs
- **`PromptBar`** (bottom centre) shows 3–5 context actions as a glyph plus a verb, for example
  `✕ Select  ○ Back  △ Info  □ Commands  L1/R1 Unit`.
- **The glyph family follows the last device used** (`input.lastDevice`):
  - **gamepad:** PlayStation glyphs by default: ✕ blue, ○ red, □ pink, △ green, with rounded labels for L1, R1, L2,
    R2, L3, R3 and Options. If Settings → "Controller glyphs" is Xbox: A green, B red, X blue, Y yellow, and LB, RB,
    LT, RT, LS, RS, Menu;
  - **keyboard or mouse:** a keycap sprite with `input.label(action, 'keyboard')`, plus the mouse-button icon when a
    mouse button is bound too (`Enter / [L]`).
- **The setting:** at boot set `game.input.glyphs = 'playstation'`, and the setting switches it live. If the engine's
  own Controller "button symbols" setting exists, drive that one instead of adding a duplicate (check
  `settings.keys('Controller')`).
- Glyphs are sprites in `36-art-icons.js` (the 5 × 7 font lacks ○ □ △).

### 8.4 The focus model (`50-ui-kit.js`)
- A `Panel` holds focusable items in a 2D layout. The d-pad and stick move the focus, a mouse hover sets it (only when
  the pointer really moves), a click confirms the hovered item, a right click goes back and the wheel scrolls lists.
- Every widget reads one input: the active seat's in hot-seat, or every player's when shared (§10.8).
- In battle, a hovered hex shows a small tooltip card; on the map, a hovered castle shows its castle card.

### 8.5 Screens (layouts at 427 × 240 logical, anchored to `r.W` and `r.H`)
1. **Title:** the logo at the top centre ("BRIGANTIME" in `E.font.title` at scale 3, gold gradient, extruded; "THE
   LEGEND OF FORSEASONS" below), the season diorama behind it, and the menu low in the centre: Continue (when a save
   exists), New Campaign, Skirmish, Load, How to Play, Settings, About & Credits. The version sits at the bottom left
   (`E.versionLabel()`). After 10 s with no input, the attract mode starts.
2. **Campaign setup**, in four steps:
   1. players 1–4, each claiming a device ("Press ✕ on a controller to be Player 2") or sharing;
   2. realm cards, four side by side (banner, ruler portrait, season icon, a two-line pitch), one per human with no
      repeats;
   3. difficulty, with a line each;
   4. Begin (the prologue plays).
3. **Campaign HUD:**
   - top left, the season wheel and "SPRING · YEAR 1 · MUSTER";
   - top right, mana "◆ 245 (+85)" and the candle;
   - at the bottom, the prompt bar;
   - when a castle is focused, its castle card on the right.
4. **Castle card:**
   - name, owner sigil, season icon, mana, knights present (up to 6 rows: portrait, name, level, "3/6" troop, status
     icon), the circle's species icons and the quest site;
   - for your own castles in Muster, the actions: Organize, Summon, Move, Quest, Equip, Promote.
5. **Organize:**
   - three columns: knights (3 visible), the selected troop (a 2 × 3 grid of big monster tiles, the Bond pips "Bond
     7/9" and the formation) and the reserve (4 visible);
   - ✕ binds or unbinds, △ shows details, L1/R1 change knight, □ sets the formation.
6. **Summon:** the circle in the centre, showing the focused species' live rig; on the left the species list (up to 6)
   with costs; on the right a card with stat bars, element, size and upkeep. "✕ Summon (−90 ◆)" (or the reason it is
   disabled).
7. **Move:** pick a knight; the adjacent castles you own light up on the map; pick one, and the troop walks there.
8. **Quest:** pick a knight, then a site card (a small rendered vignette, the name, two lines, the duration, outcome
   icons and a risk level), then confirm.
9. **Equip:** the knight's full-body rig on the left, the 3 slots, and an item list of 6 rows with stat changes (▲
   green, ▼ red).
10. **Promote:** the eligible units; a before → after preview (both rigs side by side, with bar changes); ✕ promotes.
11. **Realm** (from the command menu): tabs Knights, Monsters, Items (a 4 × 4 grid with descriptions), Chronicle (the
    event backlog) and Objectives (current goals and the candle).
12. **March:**
    - focus a target, then pick up to 3 troops (power bars and formations), then Declare;
    - the target's card shows the defenders' relative power, the map's name and the season;
    - an arrow appears on the map.
13. **Resolution:** a card per battle ("Solmark marches on Thornwick: 3 troops against 2"), with Command or Delegate
    when you are involved. AI-only battles show a quick result banner over the map.
14. **Battle HUD:**
    - top left, the bell clock "BELL 3/12" and the season badge with its Tide note;
    - top centre, this bell's troop order as banners, the active one lit;
    - bottom left, the active unit's card (portrait, name, level, HP and MP bars, element and size, statuses);
    - bottom right, the targeted or hovered unit's card;
    - on the right, the command list: Move, Attack, Special ▸, Spell ▸, Item ▸, Guard, Wait, and Retreat for knights.
      Submenus are lists of up to 6;
    - while targeting, the forecast (bottom centre, up to 3 targets, 1 line each): `FROSTWOLF  HIT 78%  23–28  ▲ STRONG
      CRIT 6%`.
15. **Results:**
    - VICTORY or DEFEAT with the castle line;
    - unit rows, 6 per page, with EXP bars filling and level-up gains popping up;
    - captures and losses.
16. **Tidings:** the season card (1.5 s, full screen), then report cards with icons (mana, quests, events). ✕ next; hold
    ✕ to skip all.
17. **Story scenes:** the stage, and the dialog box with portraits. ✕ advances, △ opens the backlog, and holding ○ skips
    the scene (its effects still apply).
18. **Pause** (the engine's): our items Resume, Save (Muster only), Load, How to Play and Dev Mode come before the
    engine's Settings, Controls, Full screen and Quit to title.
19. **Settings:** the engine's own, plus ours (§10.6).
20. **Dev panel** (§10.3).
21. **About & Credits** (§10.4).
22. **How to Play** (§10.5).
23. **The ending and the credits roll.**
24. **Hot-seat card:** the ruler's large portrait, then "QUEEN MORGAUSE'S MUSTER — pass the controller. ✕ Begin".
25. **Touch-only notice** (on the title): "Controller or keyboard required" with a large Settings button. The attract
    mode still runs (§10.2).

### 8.6 Accessibility
- Sides carry sigils and shapes, and elements carry ▲ ▼; nothing is told by colour alone.
- Status icons have distinct shapes.
- The engine's comfort settings (shake, flashes, reduce motion) are honoured everywhere.
- Text speed, hold-to-skip and UI scale are settings.
- Single player has no timers; timers exist only in the hub and, if chosen, in hot-seat.

---

## 9. Audio (all code: no audio files)

### 9.1 Music (`40-audio-music.js`, the engine's `{ bpm, steps, tracks }` format)
**The Wheel motif** (`D4 - A4 - G4 - A4 - | F4 - E4 - D4 - - -`) appears in every main theme, changed by season.

| id | Where | Key, bpm | Waves | Character |
|---|---|---|---|---|
| title | title, setup | D Dorian, 92 | pulse lead (the motif), triangle bass, soft saw pad, light drums | heroic, wistful |
| spring | the campaign in Spring | F Lydian, 104 | `pulse12` flute lead, triangle bass, hats | pastoral |
| summer | the campaign in Summer | A Mixolydian, 116 | square brass, triangle bass, a snare march | proud |
| autumn | the campaign in Autumn | E minor waltz (12-step bars), 96 | triangle lead, saw harmony, soft drum | wistful |
| winter | the campaign in Winter | B minor, 72 | sine pads, high pulse bells, sparse | cold, still |
| battle_attack | battles where the player attacks | D minor, 140 | square lead, saw bass, driving drums; a `tension` layer from bell 9 | urgent |
| battle_defend | battles where the player defends | G minor, 128 | pulse lead, triangle bass, toms; `tension` layer | taut |
| hourless | Hour castles, Dominion battles, the clock chamber | C minor, 100 | ticking `c` percussion, a falling chromatic saw line | eerie, mechanical |
| boss | the Clockwork Sanctum | E Phrygian, 150, 13-step bars | square and saw leads, heavy drums | dread |
| event | story scenes | the speaker realm's key, 84 | triangle and soft pulse | intimate |
| ending | endings and credits | D major (the motif made major), 80 | everything | bittersweet |

**Stings** (`audio.sting`, played once over the music): `season_spring`, `season_summer`, `season_autumn`,
`season_winter` (2 bars each), plus `victory`, `defeat`, `levelup`, `promote`, `summon`, `capture` and `candle` (a low
drone with a tick).

### 9.2 Sound effects (`41-audio-sfx.js`, with `audio.define` for the custom ones)
- **UI:** `ui_move`, `ui_confirm`, `ui_cancel`, `ui_error`, `ui_open`.
- **Battle:**
  - `bell_toll` (its pitch steps per bell);
  - weapons: `sword_clang`, `slash_whoosh`, `bow_twang`, `arrow_hit`;
  - spells: `cast_charge`, `spell_spring` (chimes rising), `spell_summer` (a roaring whoosh), `spell_autumn` (a rustle
    over a low tone), `spell_winter` (a glassy shimmer), `spell_hour` (a reversed tick-tock);
  - support: `heal`, `buff`, `debuff`;
  - statuses: `poison`, `burn`, `chill`, `sleep`, `stop`;
  - outcomes: `crit`, `miss`, `ko_monster`, `ko_knight` (a low horn), `capture` (chains), `summon_rise`;
  - creatures: `roar_small`, `roar_large`, `growl`, `chirp`, `flap`.
- **World and timers:** `march_drums`, `banner_flip`, `castle_taken`, `candle_hiss`, `tide`, `timer_tick`; the engine's
  `step` preset for footsteps.

### 9.3 Voices: Animalese babble (`42-audio-voice.js`)
- **Hook:** `E.Dialog`'s per-letter voice (engine change 1) calls `G.voice.letter(profile, ch)`. `G.voice.plan(profile,
  text)` is the pure scheduling function (tests use it).
- **Per character typed:**
  - a vowel (a e i o u y) is a tone burst of 45–70 ms: `profile.wave` at `base × 2^(((hash(ch) % range) − range / 2) /
    12)`, through a band-pass formant (a 800 Hz, e 1200, i 2200, o 600, u 400, × `profile.formant`), with a 5 ms
    attack;
  - a consonant is a 15–30 ms high-passed noise tick at low gain;
  - capitals are a little louder; `?` bends the last 3 syllables up; `!` is louder and faster;
  - `.` pauses 120 ms, `,` 80 ms and `...` 250 ms; markup is skipped.
- **Profiles:** `{ base (Hz), range (semitones), wave, formant, rate, breath, vibrato, double }`:

| Voice | base | range | wave | Notes |
|---|---|---|---|---|
| Gareth | 220 | 7 | pulse | formant 1.1 |
| Morgause | 180 | 6 | square | |
| Pellam | 110 | 3 | triangle | slow |
| Mordrain | 200 | 12 | saw | vibrato .03 |
| Meliant | 130 | 4 | square | formant .9 |
| The Gray Knight | 70 | 3 | saw | `double: -7` (a second voice 7 semitones down), slow |
| Lunete | 300 | 6 | sine | formant 1.3 |
| Tic / Tac | 420 / 360 | 5 | pulse | fast |

  Everyone else is derived from the knight data's voice tag (for example "lilting, high" → base 260, range 9).
- Monsters don't babble: they use the growl, chirp and roar sets.
- All of it goes through `audio.sfxBus`, so it follows volume and mute. It is silent headless (no `ctx`) and when
  Settings → "Voices" is Off.

---

## 10. Modes and meta

### 10.1 Boot and title
- **Boot steps** (`game.start({ boot: { title: 'BRIGANTIME', steps } })`):
  1. register and validate all data (it fails loudly on a bad reference);
  2. build the icon and glyph sprites;
  3. compose the songs;
  4. bake the title diorama;
  5. warm the first beast portraits.
  Boot messages: "Winding the Great Clock", "Teaching wyverns to sit", "Counting the bells", "Sweeping the cross-quarter
  roads".
- **The title** (§8.5.1) and the setup menus before play (campaign setup, skirmish setup) track idle time: any key,
  mouse button, pointer move over 4 px, pad button, stick past .5 or touch resets it. At 10 s they go to `attract`.
  Reading screens (About, How to Play) and anything in play never do.
- **On a touch-only device** (coarse pointer, no fine pointer, touch points, no gamepad or keyboard seen): show the
  "Controller or keyboard required" panel with a large Settings button (`game.menu('settings')`) and no touch controls
  (`touch: []` in every scene, `input.touchEnabled = false`). The idle timer still runs. A gamepad connecting or a key
  pressed removes the notice for good.

### 10.2 Attract mode (`67-scene-attract.js`)
A scripted reel of about 90 s that loops and cheats freely (canned data, a fixed seed per loop, a showcase AI). A
"PRESS ANY BUTTON" banner pulses at the bottom, with the logo in a corner.

| Time | Beat | Shows |
|---|---|---|
| 0–12 s | **The Wheel turns** | the world map pans across the four regions while the seasons wipe every 3 s. `CampaignSim` runs AI-only on a canned seed, so banners flip and march arrows fly. Caption: "FOUR SEASONS. FOUR CROWNS. ONE STOPPED CLOCK." |
| 12–20 s | **Summoning** | Rimeholt's circle flares and a Frost Wyrm rises. Caption: "BIND MONSTERS TO YOUR BANNER." |
| 20–65 s | **A battle at 2× speed** | a rotation of three canned battles, one per loop: Winter Lakeside (Solmark against Hoarfast, the lake frozen); Spring River Ford (Verdance against Amberlyn, the fords flooded); and the Sanctum with every dial lit. The showcase AI prefers specials and spells. Scripted inserts make sure a Tide banner, a capture, a level-up and a promotion flash appear. Captions name each mechanic. |
| 65–80 s | **The Gray Knight** | the clock chamber, three lines on auto-advance |
| 80–90 s | **Logo** | "PRESS ANY BUTTON", then the loop starts again |

Any input (the same set as the idle timer) calls `input.consumeAll()` and goes to the title. On a touch-only device a
tap goes to the title with its notice, and attract returns after 10 idle seconds.

### 10.3 Dev mode (pause menu → Dev Mode; absent in hub sessions)
A full-screen panel with tabs (L1/R1, or click), built from the UI kit, so it works with a pad, keys or a mouse.
Anything touched marks the campaign "DEV" in its save and on the HUD.

| Tab | Tools |
|---|---|
| Cheats | God mode (the player's units take no damage); one-hit KOs; infinite MP; free summons; +1000 mana; heal all; level up the selected unit (+1, +5); give an item (a list); add a free knight; spawn a monster into the selected castle or troop; unlock all class changes; reveal the AI's planned marches |
| Battle | win now; lose now; KO the selected unit; set the bell; set the season (terrain re-applies); toggle AI control of the player's side (autoplay); Delegate the rest of the battle; light all Sanctum dials |
| Campaign | jump to a season and year; skip to Muster or March; trigger any event (a list of every event id); set a castle's owner; run N AI seasons; autoplay the player's realm; burn or refill the candle; go to any ending |
| Balance | **live sliders for every tunable in Appendix A**, grouped (combat, magic, economy, AI, pacing). Left/right adjusts (hold to accelerate); the mouse drags the bar; △ resets one slider; **"Reset all to defaults"** at the top. Changes apply at once because the sims read `G.tune` |
| View | hex coordinates; the AI's danger map; every unit's Ward; the AI's top 3 plans per unit; a free camera; HUD on/off; weather on/off; time scale (.25×–8×); the gallery (`#gallery`); a frame-time readout (the engine's own setting) |
| Info | seed, build, state hash, the last 50 sim events, `game.errors`, a "Copy report" button (`E.diagnose()`) |

### 10.4 About & Credits (`66-scene-about.js`, data in `10-data-about.js`)
Pages, flipped with left/right or L1/R1, at most 8 lines each in 10-foot text. **The builder fills in every value at
the end and writes "unknown" for anything it can't confirm:**
1. **The game:** title, tagline ("Four seasons. Four crowns. One stopped clock."), version and build date.
2. **Source Information**, each field from TASK.md:
   - Date: 2026-11-03 17:47:58;
   - Source: Brigandine: The Legend of Forsena (Hearty Robin / Atlus, PlayStation, 1998);
   - Plan: PLAN.md;
   - Genre and Perspective;
   - Tech;
   - Art Direction;
   - Animation;
   - Audio;
   - Online;
   - Testing;
   - Research;
   - Environment: Claude Code CLI (headless); Linux; browser unknown;
   - Model: Anthropic, claude-opus-5-5, reasoning effort max;
   - Usage.
3. **Testing Feedback:** the four answers.
4. **Engine Feedback:** the six answers (draw on ENGINE-CHANGES.md).
5. **Prompt Feedback:** the four answers.
6. **Credits:**
   - the my-3D2dge engine (MIT) by Michael Crosato; the AI Hub Session Protocol v1, client 1.4.0;
   - any asset sets used: Kenney, KayKit and ambientCG, all CC0, as in their catalogs;
   - "Inspired by Brigandine: The Legend of Forsena. The world, characters, music and art are original."
The same text feeds `exit-interview.json` (§15), so the two always agree.

### 10.5 How to Play (from the title, the pause menu and F1)
Eight pages, each with a live diorama of rigs:
1. The Wheel and the seasons.
2. Muster.
3. Summon and Bond.
4. Quests.
5. March.
6. Bells and the Keep.
7. Ward, size and elements.
8. Knights, retreat and capture.

### 10.6 Game settings (beside the engine's standard settings)

| key | Label | Options (default first) |
|---|---|---|
| glyphs | Controller glyphs | PlayStation, Xbox |
| battleAnim | Battle animations | Full, Fast, Minimal |
| battleCam | Battle camera | Dynamic, Fixed |
| battleView | Battle view | Board, Isometric |
| grid | Grid lines | Subtle, Bold, Off |
| tips | Tutorial tips | On, Off |
| textSpeed | Text speed | Normal, Slow, Fast, Instant |
| voices | Voices | On, Off |
| uiScale | UI scale | Normal, Large |
| edgePan | Edge panning (mouse) | Off, On |
| aiBattles | Battles between AI realms | Show result, Skip |
| confirmEnd | Confirm before ending a turn | On, Off |
| hotseatTimer | Hot-seat turn timer | Off, 60 s, 30 s |
| privacy | Hot-seat privacy cards | On, Off |

Difficulty is chosen per campaign, and the Realm screen shows it.

### 10.7 Skirmish (`skirmishSetup`)
- **Choose:**
  - a map (any of the 13 except the tutorial and the Sanctum);
  - a season (Spring, Summer, Autumn, Winter, or "Wheel": it turns every bell);
  - 2–4 sides, each Human (P1–P4, claimed by pressing ✕ on a pad or with the keyboard) or CPU (Easy, Normal or Hard);
  - an army per side: a realm (one of the four, the Dominion or Brigands) and a level band (5, 10, 15 or 20). This builds
    up to 3 troops from that realm's roster, scaled.
- **Banners of the Wheel:** a preset that sets the Wheel Shrine map and its free-for-all rules (§6.10).
- After the battle: Rematch, Change setup or Title.

### 10.8 Hot-seat and local play (`81-local-mp.js`)
- **Seats:**
  - Seat 1 is the keyboard, the mouse and the first pad.
  - Others join with `game.allowJoin({ max: 4 })` (Start or ✕ on a free pad, or the right half of the keyboard as the
    engine allows), or play on the shared device.
  - Each human realm stores a seat.
- **Turn routing:** during a human realm's Muster, March or troop turn, the UI kit reads only that seat's input (if it
  has one) or every input (if shared). Other seats can move a passive "look" cursor.
- **Privacy:** if Settings → "Privacy cards" is On, a ruler card ("pass the controller") separates humans.
- **Human against human:** each side's troops read their own seat. The optional turn timer (Settings) auto-delegates
  units that run out of time.
- Saves keep seats and the human/AI flags. Loading asks seats to be claimed again.

---

## 11. Online: AI Hub (Session Protocol v1)

### 11.1 Mode and game
- **Mode:** `shared-world`, with 2–4 players.
- **The game:** "Banners of the Wheel": the Wheel Shrine map with its free-for-all rules (§6.10). Each seat fields one
  ruler at level 10 with two monsters at level 10:

| Seat | Ruler | Monsters | Corner |
|---|---|---|---|
| 0 | Gareth (Spring) | unicorn, pixie | NE |
| 1 | Morgause (Summer) | cinderhound, sunbird | SE |
| 2 | Pellam (Autumn) | scarecrow, griffin (level 9) | SW |
| 3 | Mordrain (Winter) | frostwolf, ice golem (level 9) | NW |

- With 2 players use seats 0 and 2 (the NE and SW corners). Balance the four with 200 AI-only four-way runs: each
  seat's win rate should land between 20% and 30% (§14.5).

### 11.2 Tags (in `<head>`, after the session client, the first script)
```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Most glory wins: rout rivals and hold the Shrine">
<meta name="hub:session-howto" content="Stick/WASD: cursor · ✕/Enter: select · ○/Esc: back · □/Space: end turn">
<meta name="hub:session-minutes" content="9">
```

### 11.3 Session flow
1. If `AIHub.active`:
   - skip the title, attract mode, menus, tutorial and deep links. The boot screen may show but asks nothing;
   - disable saves, dev mode, Quit to title and `autoPause` (`new E.Game({ autoPause: !AIHub.active })`).
2. Call `const info = await AIHub.connect({ mode: 'shared-world', seats: [2, 4] })`. If it returns `null`, carry on with
   the normal title.
3. Build the battle for `info.players` (seat i takes realm i). Setup randomness comes from `AIHub.rng('setup')`, so
   every copy builds the same field. Names come from `info.players[i].name` and are drawn on the canvas, never inserted
   as HTML. The seat colours tint the pennants.
4. Call `AIHub.ready()` once the scene is built, with no key press. Use the hub's own card (`card` left off).
5. On `start`, show 3-2-1 in large numerals while `AIHub.time() < 0`. At 0 the host starts bell 1.

### 11.4 Roles and messages
- **The host** (`info.isHost`) runs `BattleSim`:
  - it is seeded from `AIHub.rng('battle')` and its state lives in G.Rng;
  - it owns the turn order and the deadlines: 15 s per troop, measured on `AIHub.time()`. Animations run at Fast in
    sessions;
  - it validates every command and broadcasts the results.
- **The other copies** draw the host's state, animate its events and send commands only for their own troop during its
  turn.
- **`G.NetDriver`** runs on `setInterval(50)`, outside the engine's pausable update, on every copy. Opening the pause
  menu (for Settings) never stalls the host. Incoming messages are queued and applied in order.

| `t` | Direction | Payload | When |
|---|---|---|---|
| `snap` | host → all | `{ n, state }`: the compact `BattleSim.serialize()` (units, cells, HP, MP, effects, bell, order, season, glory), about 2–3 KB | at each bell's start, after each troop's turn, and on request |
| `ev` | host → all | `{ n, events }`: what `apply` returned, for animation | after each applied command |
| `turn` | host → all | `{ n, seat, troop, deadline }` | when a troop's turn starts |
| `cmd` | a client → host | `{ seq, cmd }` (move, act, guard, wait, end) | during that client's own turn |
| `need` | a client → host | `{ n }` | when a gap in `n` is seen; the host answers with `snap` |
| `cur` | a client → all (`reliable: false`, at most 4 a second) | `{ seat, cell }` | other players' cursors, drawn as hex outlines in their colours |
| `over` | host → all | `{ standings, glory }` | at the end, just before `finish` |

- `n` is the host's event counter, and clients apply `ev` strictly in order.
- **An illegal or stale `cmd`** (not that seat's turn, or `sim.legal` false) is ignored, and the host sends that client a
  `snap`.
- **At a deadline,** the host plays the rest of that troop with the battle AI and marks the player's banner "AUTO".
- Traffic stays far under the hub's limits (20 messages a second, 16 KB each).

### 11.5 Ending a round
- The round ends:
  - after bell 6;
  - when only one player's knight still stands;
  - or on `time-up`, when the host finishes at once, within `graceMs`.
- The host then sends `over`, then calls `AIHub.finish({ standings, scores: glory, stats: { id: { damage, kos, shrine
  } }, awards: [{ id, title: 'Shrine Keeper' | 'Giant Slayer' | 'Last Standing', detail }] })`. Standings are grouped by
  glory (ties share a place).
- **`leave`:** the host removes that seat's troop (it retreats). If fewer than 2 players remain, it finishes.
- **`end`:** stop all input and sound (stop the music, mute the effects bus, ignore actions), and show "Round over" with
  the standings until the hub removes the game.
- **Server mode** (`info.server`): the host has no player of its own. It runs exactly the same host code with no camera
  or input, and draws a quiet spectator view.

### 11.6 The hub's rules
- The network goes only through `AIHub`; the game has no other network code at all.
- No chat, emotes or custom names.
- No `alert`, `confirm`, `prompt`, `window.open` or navigation.
- Fullscreen requests go through the engine as usual (the client hands them to the hub).
- **Create + Options belong to the hub:** bind a `create: ['Pad8']` action, and on every step while it is down call
  `input.suppress('pause')`.
- **A touch-only device in a session** calls `AIHub.fail('Controller or keyboard required')`.
- `Math.random` is not seeded in shared world, and the sim never uses it anyway.

### 11.7 Standalone
The same rules are Skirmish → "Banners of the Wheel" with local seats and CPUs (§10.7). The hub layer is never loaded
into play when `AIHub.active` is false.

---

## 12. Build order and milestones
The two riskiest pieces go first (the hex field, then the beasts), because everything visual depends on them. Then the
pure sims, before the scenes that show them. The AI comes early, because Delegate, the bots and the balance runs all
need it. Every milestone ends with its suites green and the full run green.

| # | Milestone | Build | Done when |
|---|---|---|---|
| M0 | Scaffold | the dev folder; the engine and hub copied in; `build.mjs` (concatenation, the single file, the guards); `tests/run.mjs`; the `TMPDIR` set-up; an empty title scene with the logo | the single HTML opens from `file://` with no errors (`tools/check.mjs`); the hub client is the first script; `node tests/run.mjs` prints its count line |
| M1 | Hex field spike | `G.hex`; the floor baked through `floorTex` for 2 terrains and 4 seasons, with edges; range and cursor decals; picking through `mouseGround`; cursor stepping by screen direction; the `board` view, 60° turns, zoom; a Humanoid walking a `grid.reach` path; one `hexblock` shape with x-ray | the `hex` suite is green; Border Meadow screenshots in all four seasons look right |
| M2 | BattleSim | everything in §5: deployment, bells, legality, actions, formulas, effects, Ward, capture, death, Keep, wins, EXP, forecast, serialize, hash | the `rules` and `determinism` suites are green |
| M3 | Battle scene and AI | `EventPlayer`; Humanoid moves, projectiles, effects, numbers; the HUD; the player's command flows; the camera; the battle AI; Delegate; results | `ai-battle` is green (all 13 maps × 4 seasons); the input-driven tutorial win passes in `ui-flow` |
| M4 | Beasts and bestiary | `engine-ext/beasts.js` (the 4 kinds and their presets), `E.Wings`, all 30 species × 3 forms, Blob overlays, portraits, the gallery; the custom shapes (castles, keep, hexblock, clock tower) | the gallery runs with no errors; filmstrips of every kind's walk, bite and breath are reviewed; `asset-sheet` checks of the custom shapes are reviewed |
| M5 | CampaignSim and realm AI | everything in §4, the event trigger engine (without scenes), save serialization | `campaign`, `ai-campaign` and `save` are green |
| M6 | Campaign scene | the world map (continent, roads, castles, banners, figures, markers, season wipes); the HUD; every Muster panel; March; resolution with Command and Delegate; Tidings; `game.saves` | the `ui-flow` campaign path runs (one full season with a commanded battle) |
| M7 | Story | stages, every event in §6.12, vignettes, recruitment, endings and credits, rival lines, the Dialog voice hook and the babble synth, tutorial tips | `story` is green; the first `playthrough` run reaches a good ending |
| M8 | Audio | every song, sting, sound effect and voice profile; music by scene and season; layers | `audio` is green; a browser check finds sound starts after the first input with no errors |
| M9 | Front end | title, setup, skirmish setup, How to Play, About, settings, the touch-only notice, the attract mode, the prompt bar and glyphs, UI scale | `attract`, `touch` and `prompts` are green |
| M10 | Dev mode | the panel, every tool, the sliders with Reset | `dev` is green |
| M11 | Multiplayer | hot-seat and local seats; Banners of the Wheel locally; the AI Hub layer (§11) | `localmp` and `hub-unit` are green; the harness passes every scenario (§14.6) |
| M12 | Content and balance | every knight, monster, item, map and event; balance passes with `simulate.mjs` | the balance targets in §14.5 are met; all five `playthrough` runs pass |
| M13 | Polish and ship | act on every look note from `check.mjs`; review 1920 × 1080 and 1280 × 720 screenshots for 10-foot reading; the final bundle; the About text and `exit-interview.json` | every item in §15 is checked |

---

## 13. Risks and how to defuse them

| Risk | Why | Defusing it |
|---|---|---|
| A hex battlefield on an engine built for square tiles | the floor, picking, turning and decals are all ours | M1 is a spike before anything else. Baking the floor through `floorTex` keeps the engine's renderer, lighting and GPU path. The field is flat, so picking through `mouseGround` is exact. Raised hexes are shapes that sort like props. Fallback: per-terrain `floorMats` with hex outlines drawn only as decals |
| Beast rigs, a new art system | 13 species need them, in 3 forms each, and they must read at 12–70 px | M4 comes early. Build `quad` first (it covers 9 species), then `drake` (4), `avian` (2) and `serpent` (3); presets and recolours carry the forms; the gallery and filmstrips check them. Fallback per species: a winged cat quad for the griffin, a Blob-headed quad, and so on |
| Battle pacing with up to 42 units | AI turns drag | Turns go by troop; Fast and Minimal animations; hold to fast-forward; Delegate a battle or one troop. Target: an early battle under 10 minutes, a late one under 20 |
| The campaign AI stalls or snowballs | pacing breaks; the game becomes unwinnable or trivial | `simulate.mjs` runs 50 AI-only seeds and 50 seeds with the player on autoplay per difficulty, and reports castles over time, winners and the season Meridian falls. Thresholds are tunables, and the Dominion's aggression is scripted by year |
| Determinism (saves, the hub, tests) | a stray `Math.random`, clock read or iteration order | all sim randomness goes through `G.Rng`; a test greps the sims and AI for `Math.random`, `Date.now` and `performance`; double runs compare hashes; state is plain JSON |
| The shared world | latency, loss, the host leaving, a paused host | host authority with ordered events, snapshots and resync; `NetDriver` runs outside the pause; the harness runs with latency, jitter and loss, and the host-leave and server scenarios |
| Reading at 10 feet | pixel UIs grow dense | the rules in §8.1; screenshots at 1080p and 720p; the Large UI scale |
| Content volume (36 knights, 90 monster forms, 13 maps, about 40 events) | time | registries and the data suite; templates for vignettes; the maps are already drawn and checked in this plan |
| Engine unknowns (naming a custom view, the Dialog voice hook, the effects bus, Esc vs pause) | each could block a feature | changing the engine is allowed: patch it in place and log it. Look at the pinball kit's `E.View` use; settle all four in M0–M1 |
| The single-file bundle | escaping, size, load order | guards in `build.mjs`, and the `bundle` suite opens the built file in Chromium |
| This machine's full `/tmp` | Chromium and Playwright need temp space | `TMPDIR` on the main disk, checked in M0 |
| Auto-pause in the harness's frames | an unfocused host frame would pause | `autoPause: false` in sessions, and the `NetDriver` interval |

---

## 14. Testing

### 14.1 The one command
- `node tests/run.mjs [suite ...] [--browser]` runs the Node suites; `--browser` adds the Playwright ones. It prints only
  failures (`suite › test: message`) and one final line, `N passed, M failed (S suites, T s)`, and exits with 1 on
  failure.
- The Node harness loads `engine/my-3d2dge.js`, `engine-ext/beasts.js` and `dist/game.js` into a `vm` context with the
  stand-ins `kits/test.mjs` uses (`window`, `addEventListener`, `location`). It drives the game with `game.advance`,
  `input.tap` / `hold` / `feed` and `game.debug`.
- As TASK.md asks: test with headless tools and scripts that play the game and read its state; take screenshots only
  for what a script can't check (§14.4); rerun a suite only after changing the code it covers (§14.7); and don't use
  subagents or workflows to debate, review, judge or audit.

### 14.2 Suites (each line names what it proves)

| Suite | Covers |
|---|---|
| `data` | every reference resolves; the counts (25 castles, 36 roads, 30 species × 3 forms, 36 knights, 13 maps, 90 skills, 33 items); the map checker from planning (row lengths, anchors, room, the Keep reachable in every season, floods and ice included); the road graph is connected and the same shape for every realm; a deny-list of the source's proper names (§1.2) over data and story; no TODO, FIXME or placeholder |
| `hex` | neighbours, distances, lines, cones and rings match `E.Grid`; `center` and `toCell` round-trip for every hex; screen direction → neighbour at all 6 turns; picking: a hex centre projected to the screen comes back through `mouseGround` as the same hex |
| `rules` | each formula with fixed rolls: hit (size, flank, guard, terrain, range); damage (strong and same element, Tide ±, terrain, guard, surround, crit); magic; healing; statuses (chance, duration, Sleep waking, Stop immunity); the Ward penalty. Also: spells illegal after moving; mobile specials legal after moving; Charge and Dive needing 2 hexes; Keep healing and the last-bell seizure; a ruler's retreat losing the battle; a fallen knight taking its troop and the capture chances; monsters dying for good; EXP and level-ups; every season's transforms (flood, ice, drying, fire → ash); the Sanctum's dials, hand and Timeless; hub glory |
| `determinism` | the same seed and commands give the same hash, in battle and campaign; no `Math.random`, `Date.now` or `performance` in sims or AI |
| `ai-battle` | the AI only issues legal commands; it wins clearly favourable fights at least 90% of 200 runs; rulers keep out of danger; attackers go for the Keep late; every map × season ends within 12 bells; an auto-resolved 3-against-3 battle takes under 150 ms |
| `campaign` | the phases cycle; income, upkeep and desertion; summon limits and summon level; Bond limits; moving only to adjacent castles; quest outcome rates (10,000 rolls within ±2% of the weights) and modifiers; march rules (adjacency, 3 troops, once a season); resolution order; empty castles taken without a battle; aftermath (retreat paths, wounds, captures into reserves, treasuries); elimination; Stillness; the candle; every way to win or lose, a rival setting the Wheel included |
| `ai-campaign` | 20 AI-only seeds per difficulty reach an end; no realm wins more than 45% of them; there is at least one battle every two seasons; the Dominion stays home in Year 1 |
| `save` | serialize → load → equal hash (mid-Muster, with knights away, wounded and stilled castles); the `game.saves` slots; migration from a v1 fixture |
| `story` | every event's speakers, conditions and effects are valid; every event fires from the dev trigger without errors; each realm's chain is reachable in a scripted campaign; all 4 good endings and the 3 kinds of bad ending are reachable; rival lines fire for their pairs |
| `ui-flow` | input only (taps, holds, `feed` for the mouse): title → new campaign (each realm) → prologue → tutorial win → Muster (summon, bind, move, quest, equip, promote) → March → a commanded battle (select, move, attack, spell, wait, end) → results → Tidings; pause → save → load; How to Play and About open and close; ○ / Esc backs out of every panel; mouse hover focuses, a click confirms, a right click goes back |
| `prompts` | a gamepad shows ✕ ○ □ △; with the Xbox setting, A B X Y; a keyboard shows key names; a mouse shows its buttons; prompts change on the step after the device does |
| `attract` | 10 s idle on the title starts attract; a key, a mouse move, a pad button or a touch returns to the title within a step; a full 95 s loop runs with no errors and reaches every beat (`snapshot().attract.beat`) |
| `touch` | with `G.forceTouchOnly`, the title shows the notice and its Settings button; no scene has touch buttons; attract still starts |
| `dev` | the panel opens from the pause menu; spot checks of each tab's tools (god mode, win now, give an item, trigger an event, jump a season); a slider changes the outcome (`dmgScale` 2 doubles a fixed-roll hit); Reset restores the defaults; the DEV flag is set |
| `audio` | every song's tokens parse; every scene and season has music; every sound id used is defined; `voice.plan` gives the same syllables for the same line; no audio files are referenced |
| `localmp` | in hot-seat with 2 humans, input reaches only the active seat; privacy cards show; a human-against-human battle reads each seat; a 4-seat local Banners of the Wheel with CPUs finishes |
| `hub-unit` | `NetDriver` against a fake `AIHub` in Node: host and client exchange messages; ordering; a gap → `need` → `snap`; illegal commands rejected; a deadline → AUTO; `leave`; `time-up` → `finish` standings; `end` stops input |
| `playthrough` | for each realm, a new Normal campaign on autoplay: the player's realm uses the campaign and battle AIs through the same commands; battles are Delegated except the tutorial and one battle a year, which the bot fights through the battle scene with real inputs. `tune.aiPlayerBoost` may be raised to make the win reliable. It must reach `meridian_falls`, win the Sanctum and play the ending and credits with no errors. A fifth run lets the candle burn out (the defeat path) |
| `bundle` (`--browser`) | build; the single HTML has no external URLs; the first script after `<meta charset>` is the unmodified session client; the hub tags are present; it opens from `file://` in headless Chromium (`engine/tools/check.mjs`) with no errors; boot → title; attract starts after 10 s |
| `hub` (`--browser`) | the harness procedure in §14.6 |
| `about` | the About pages carry every Source Information field and the three feedback lists; `exit-interview.json` parses and every key has a value (run at the end) |

### 14.3 Bots
- **Battle bot:** drives the battle scene through `game.input`. It moves the cursor with taps, then confirms, using the
  battle AI's chosen command, so it tests the real UI path.
- **Campaign bot:** works the Muster panels through input for at least one season per realm, then switches to sim-level
  autoplay for speed.

### 14.4 Looking (only what a script can't check)
- **Screenshots:** `node engine/tools/check.mjs dist/index.html#<link> --size 1920x1080` (and `1280x720`) of the title,
  the campaign in each season, the castle card and the Organize and Summon panels, a battle in each season (River Ford),
  the Sanctum, a story stage, results, and About. Act on every look note.
- **Filmstrips:** `engine/tools/filmstrip.mjs --seed 1` of every class move, each beast kind's walk, bite and breath, a
  summon, a capture and a promotion.
- **The gallery:** every species in all 3 forms.

### 14.5 Balance runs (`tools/simulate.mjs`)
- **Commands:** `--campaigns 50 --difficulty normal`; `--battles 500 --map river_ford`; `--hub 200`. Each prints summary
  tables.
- **Targets:**
  - AI-only campaigns: no realm wins more than 40%; they end in seasons 12–16 on average;
  - the player's realm on autoplay (Normal) reaches Meridian between seasons 10 and 14 in at least 60% of seeds;
  - early battles average 8 bells or fewer;
  - hub seats each win 20–30% of the time.

### 14.6 The AI Hub harness
1. Copy `vendor/hub/harness.html`, `bridge.js` and `round.js` and the built game HTML into `dist/hub/`.
2. Start `python3 -m http.server 0 --bind 127.0.0.1` there (with `TMPDIR` set) and note its PID and port.
3. Fetch `/<game>.html` and check its `<title>` is ours.
4. Run `tools/hub-check.mjs` (Playwright) on each of these:
   - `harness.html?game=<game>.html&players=2&auto=1`
   - `harness.html?game=<game>.html&players=4&latency=150&jitter=50&loss=5&auto=1`
   - `harness.html?game=<game>.html&players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave`
   - `harness.html?game=<game>.html&players=2&scenario=server&auto=1`

   Each must end with `window.__hubCheck.pass === true` and `document.body.dataset.complete === 'true'`.
5. Open the game outside a session and check it still runs normally.
6. Stop the server by its PID.

### 14.7 When to rerun
After a change, rerun only the suites that cover the changed files:

| Changed | Rerun |
|---|---|
| `20–21` | `rules`, `determinism`, `ai-battle` |
| `22–24` | `campaign`, `ai-campaign`, `save` |
| `0x` data | `data`, plus the suites that use it |
| `09` | `story` |
| `3x` art | the `ui-flow` smoke run, and look checks on demand |
| `4x` | `audio` |
| `5x–6x` | `ui-flow`, `prompts`, `attract`, `touch` |
| `70` | `dev` |
| `80–81` | `hub-unit`, `localmp`, `hub` |

Run everything at each milestone's exit and at the end.

---

## 15. Done: the checklist
- [ ] Every system in §4–§11 works, with no TODO, FIXME, placeholder or stub (the build guard and the `data` suite).
- [ ] All the content in §6 is in the game (the counts in the `data` suite).
- [ ] `node tests/run.mjs --browser` passes. All five playthroughs pass, and the harness passes all four scenarios.
- [ ] The single file sits in this folder's root under the exact name in §0. It opens from `file://`; its first script
      is the unmodified hub client; the hub tags are present.
- [ ] About & Credits is complete. The final chat reply carries the same Source Information, Testing Feedback, Engine
      Feedback and Prompt Feedback, with "unknown" for anything that can't be confirmed.
- [ ] `exit-interview.json` sits beside the HTML, in exactly TASK.md's shape, with every value filled in, and it
      parses. Suggested `aiHub` values:
  - name "Brigantime: The Legend of Forseasons"; tagline "Four seasons. Four crowns. One stopped clock.";
  - description "A seasonal war of monster-binding knights: muster castles, summon beasts and fight twelve-bell hex
    battles to restart the Wheel of Seasons before time stops forever.";
  - type "Game"; genre "Strategy"; source "Brigandine: The Legend of Forsena"; series "Brigandine"; players "1–4";
  - controls "Stick/WASD: cursor · ✕/Enter: select · ○/Esc: back · □/Space: commands · △/I: info · L1/R1 or Tab:
    cycle";
  - tags `["fantasy", "story", "versus", "pixel art", "retro", "boss fights"]`.
- [ ] ENGINE-CHANGES.md is complete.
- [ ] Every server you started is stopped, by PID. This folder gains only the dev folder, the HTML and
      `exit-interview.json`.

---

## Appendix A: Tunables (`G.TUNE_DEFAULTS`; each is a dev-mode slider)

| key | Default | Slider range | Used by |
|---|---|---|---|
| dmgScale | 1.0 | 0.25–3 | physical damage |
| defFactor | 0.5 | 0–1 | physical damage |
| magicScale | 1.0 | 0.25–3 | magic damage |
| healScale | 1.0 | 0.25–3 | healing |
| baseHit | 85 | 50–100 | hit chance |
| largeVsSmall | −30 | −60–0 | the size table (L against S) |
| critBase | 3 | 0–30 | crit chance |
| wardPenalty | 0.20 | 0–0.6 | monsters outside their Ward |
| surroundBonus | 0.10 | 0–0.3 | damage per adjacent ally |
| elemStrong | 1.30 | 1–2 | opposed elements |
| elemSame | 0.80 | 0.5–1 | matching elements |
| tideBonus | 0.15 | 0–0.5 | the Seasonal Tide |
| forestDef | 0.20 | 0–0.5 | forest DEF |
| statusScale | 1.0 | 0–2 | status chances |
| captureBase | 0.25 | 0–1 | capture chance |
| expScale | 1.0 | 0–5 | EXP |
| bells | 12 | 4–20 | battle length |
| manaIncome | 1.0 | 0.25–3 | castle yields |
| summonCost | 1.0 | 0.25–3 | summon costs |
| upkeepScale | 1.0 | 0–3 | upkeep |
| seasonYield | 0.25 | 0–1 | the in-season yield bonus |
| winterUpkeep | 0.25 | 0–1 | wintering |
| questLuck | 1.0 | 0–2 | good quest outcome weights |
| aiAggression | 1.0 | 0.5–2 | campaign AI (multiplies personality) |
| aiManaBonus | 0 | −0.5–1 | AI income, on top of difficulty |
| aiPlayerBoost | 0 | 0–1 | playthrough tests only: the player's units' stats × (1 + x) |
| candleSeasons | 12 (by difficulty) | 4–30 | the Hour-Candle |
| animSpeed | 1.0 | 0.25–4 | presentation speed |
| hubTurnSeconds | 15 | 5–60 | hub troop timer (sessions always use the default) |

## Appendix B: Research done while planning (for the "Research" field)
- **Wikipedia, "Brigandine (video game)"** (https://en.wikipedia.org/wiki/Brigandine_(video_game)):
  - monthly Organize and Attack phases; mana income and upkeep; quests; Rune Power;
  - up to three troops a side; the attacker's 12-turn limit; the leader and ruler retreat rules; the Rune Area;
  - permanent monster death; the five colour elements; no spells after moving;
  - the Grand Edition's 6-player multiplayer, final boss and hold-the-castle rule.
- **RPGFan's review** (https://www.rpgfan.com/review/brigandine-the-legend-of-forsena):
  - the rulers' archetypes (the silent wise king, the prince, the queen, the war-loving king, the mad duke);
  - brief dialogue between turns; the Risk-like map;
  - big monsters struggling against small ones; formations; quest rewards.
- **Read during planning:**
  - my-3D2dge handoff v0.85.2: README, API.md, the relevant AI_GUIDE.md sections, the grid, story, arcade, strategy,
    songs and rpg module headers, the TACTICS kit, docs/ASSETS.md and the asset catalogs;
  - AI Hub `lib/hub`: README, retrofit.md and the examples.
