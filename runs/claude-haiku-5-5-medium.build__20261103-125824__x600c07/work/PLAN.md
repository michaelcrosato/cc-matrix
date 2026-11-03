# WIRETAP

*"Somebody's always listening."*

An original crime game inspired by **The Wire (2002-2008)**. It plays both sides of one West Baltimore corner: a police detail that builds a case with cameras, pagers, payphones and paper, and the crew that runs the corner and adapts to every move the detail makes. It is gritty, slow-burning and human. Nobody gets a clean win.

- **Title:** WIRETAP. I brainstormed 50 riffs on "The Wire" and numbered them, then a cryptographic RNG (`python3 -c "import secrets; print(secrets.randbelow(50)+1)"`) drew **7**, which was "Wiretap". Keep this title. Don't re-roll it.
- **File stem** (TASK.md's `[GameTitle-SOURCE-…]`, written like the other runs, e.g. `Rewired-TheWire`): `Wiretap-TheWire-claude-opus-5-5-max-20261103-105319`
- **Deliverables, in this folder (`work/`):**
  - `Wiretap-TheWire-claude-opus-5-5-max-20261103-105319.html`: the whole game in one file.
  - `exit-interview.json`, next to the html (shape in §13).
  - `Wiretap-TheWire-claude-opus-5-5-max-20261103-105319/`: the dev folder with sources, tools and tests (§3.2).
- **Readers:** whoever builds this from TASK.md and this plan, possibly another AI model working alone. Every system, number, name and piece of content you need is here. Where you have to make a choice yourself, the plan says so.
- **How to read it:** §1-§4 and §14 first, then build in §14's order and look up each system (§5-§10) and appendix as you reach it. §17 is the ship checklist.
- **Shared folder:** other agents share the parent directory. Don't read files outside this `work/` folder, except your own temp dirs and the two GitHub repos named below.

---

## 0. Contents

1. The game on one page
2. Genre, perspective and why
3. Tech stack, architecture and modules
4. Controls and 10-foot UX
5. Core systems (field, perception, camera, tail, chase, raid)
6. Investigation systems (board, notebook, cipher, box, paper, wire, brass/heat/legal/case)
7. The corner (crew side)
8. Story mode: setting, cast, five episodes, endings
9. Versus mode and online play (AI Hub)
10. Attract mode
11. Audio: music, effects, voices
12. Art direction and world building
13. About/Credits screen and the exit interview
14. Build order and milestones
15. Risks and de-risking
16. Testing plan (lightweight)
17. Definition of done
- Appendices: A map · B Annex map · C cipher and pages · D wire calls · E interrogation data · F affidavit and judge · G writing guide and key scenes · H music scores · I voice profiles · J data schemas

---

## 1. The game on one page

**Core loop (police, "the detail"):** *Watch → identify → intercept → decode → act → answer to the brass → climb the chain.*
You plant yourself near the corner without getting "made", photograph the crew mid-deal, put faces, names and numbers on the Board, write an affidavit good enough for a judge, then sit in the wire room deciding which calls you're legally allowed to hear. Every arrest you make for the bosses' statistics warns the crew. Every week you wait, the Major's patience runs lower.

**Counter-loop (street, "the corner"):** between episodes you play **Terrence "Tee" Mabry**, the crew's lieutenant, for one night shift. You post lookouts, keep the line moving, move the stash, page the re-up through the code, spot the van that wasn't there yesterday and call "5-0". How well you play Tee changes how hard Dana's next day is. That is the game's thesis: *the game is rigged both ways.*

**Modes:**

| Mode | Players | What it is |
|---|---|---|
| **The Case** (story) | 1 | Five episodes, about 60-75 min: field missions, the Annex hub, the wire room, the box, the judge, plus four corner interludes as Tee and a finale with two paths and computed endings |
| **The Game** (versus) | 1-4 | Corner vs Detail, 5-minute rounds. The detail hides among AI civilians and photographs deals; the corner makes money and calls out cops (SpyParty-style hidden identity). Bots fill empty seats. Local split screen for 2, online through AI Hub shared-world for up to 4 |
| **Attract** | 0 | Starts after 10 s idle on title/menus: a looping reel of bot-played vignettes from every system. Any input exits |

**Pillars**
1. **Real over cool.** No superheroes. Police work is waiting, paper and patience. Violence is rare, sudden and has weight. Failure usually doesn't end the game. It makes things worse.
2. **Both sides of the corner.** One simulation (the CornerSim, §7), seen from both sides. Choices on one side ripple into the other.
3. **Institutions are the antagonists.** The Major's statistics, the judge's rules, the boss's count. Meters (Brass, Heat, Legal, Case) make those pressures playable.
4. **Watch, wait, listen.** The best tools are observation and patience: staying unnoticed, reading roles, hearing a key line in a call about chicken wings.
5. **Couch and TV first.** DualSense on a TV at 10 ft. Large type, few choices per screen, prompts with the right glyphs.

**What the player can do:** walk, run, sneak, blend in, watch and read roles, photograph, eavesdrop, talk, pay informants, read payphone numbers, sit in a van and shoot through a long lens, tail on foot with partner hand-offs, chase on foot (vault fences, tackle, cuff), search for ditched evidence, dig through trash, raid a stash garage, interrogate, decode pager codes, build the Board, write and defend an affidavit, run the wire room (minimize, spot-check, log, identify voices, decode live pages), make institutional choices, and play the other side as Tee.
**What the player cannot do:** shoot people (Dana never fires her gun, and that is on purpose), drive freely (travel between places is a car-ride dialogue scene), climb buildings, or break the law without the game noticing (Legal meter).

---

## 2. Genre, perspective and why

- **Genre:** *stealth investigation / crime drama*, with a light **management sim** (the corner) and an **asymmetric social-stealth versus** mode. The show is about surveillance, institutions and the corner economy. A shooter or beat-'em-up would betray it. Stealth (don't get made), deduction (Board, cipher, affidavit, voices) and management (the count) are the show's verbs. Catalogue genre: **Stealth** (§13).
- **Perspective:** **isometric 2.5D** (`view: 'iso'`, the engine's yaw 45 / pitch 30) over a 72×56-cell West Baltimore neighborhood. Iso turns rowhouse blocks into a readable diorama, shows sightlines and distance (what tails and surveillance depend on) and fits the engine's stealth tooling (`E.sees`, `E.Suspicion`, `r.sightCone`, `cut` walls, x-ray). The camera turns in 90° steps (L1/R1) to see behind buildings.
  - Interiors (Annex, wire room, the box, judge's chambers) are small TileMaps. The Annex uses iso. The others use `brawler` (pitch 25) for close, theatrical framing.
  - Investigation screens (Board, wire room panels, affidavit, notebook) are HTML "case file" panels over the pixel world. The engine's own guidance for a modern adaptation is `E.Shell`-style HTML.
- **Look:** the engine's native retro-modern pixel style (PS1-era 2D), pushed toward grit: sodium-orange streetlight, overcast daylight, rain, boarded vacants, Formstone, phone wires overhead (the visual motif for a game called WIRETAP).

---

## 3. Tech stack, architecture and modules

### 3.1 Stack (pin these)
| Piece | Version | Source | Notes |
|---|---|---|---|
| my-3D2dge **full engine** `my-3d2dge.js` | **v0.85.1** (check `E.version`) | `github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff` | One file with every module (story, strategy for `E.Clock`, grid, drive). **Never edit it.** Extend from game code |
| AI Hub session client `session.js` | **1.4.0** | `raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/session.js` | Paste it **unmodified** as the **first script in `<head>`, right after `<meta charset>`** |
| AI Hub harness | `harness.html`, `bridge.js`, `round.js` | same repo, `lib/hub/` | Test only. Not shipped |
| Your game code | vanilla JS (ES2020), one IIFE | this plan | No other libraries. No runtime network. No web fonts (system font stacks only) |
| Build/test | Node ≥ 18, Playwright 1.63 (preinstalled on this machine) | | Engine tools: `tools/check.mjs`, `filmstrip.mjs`, `asset-find.mjs`, `asset-sheet.mjs` |

Fetch fresh copies (don't rely on any planner temp dir):
```sh
DEV=Wiretap-TheWire-claude-opus-5-5-max-20261103-105319
git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/my-3d2dge.git /tmp/wt-engine
git -C /tmp/wt-engine sparse-checkout set dist/handoff
mkdir -p $DEV/engine $DEV/vendor $DEV/tests/hub && cp -r /tmp/wt-engine/dist/handoff/* $DEV/engine/
curl -fsSL https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/session.js -o $DEV/vendor/aihub-session.js
for f in harness.html bridge.js round.js; do curl -fsSL https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/$f -o $DEV/tests/hub/$f; done
```
Read `engine/API.md` whole first. Then read `engine/AI_GUIDE.md` sections *Standard features*, *Heights*, *Mover*, *Perception*, *Shell*, *Lighting* and *Genre recipes → Third-person stealth*, and `engine/docs/ASSETS.md` before writing shapes. Start from `engine/game/game.js` (the template) and `engine/kits/stealth.js` (guards, Suspicion, E.Shell HUD, layered music).

### 3.2 Dev folder layout
```
Wiretap-TheWire-claude-opus-5-5-max-20261103-105319/
  engine/                 the handoff package, unmodified (my-3d2dge.js, tools/, docs, kits)
  vendor/aihub-session.js the hub client 1.4.0, unmodified
  src/                    game sources, concatenated in name order inside ONE IIFE by the build
    00-core.js            E alias, constants, rng streams, event bus, registries, STATE, utils
    01-settings.js        game settings specs, gamepad axis-inversion wrapper, glyph style
    02-input.js           WIRETAP input preset, Controller classes, prompt/glyph helpers (canvas + DOM)
    03-audio.js           songs (App. H), sfx defs, ambience beds, Animalese voice synth, phone filter
    04-ui.js              DOM UI kit (screens, focus navigation, hover focus, legend footer), headless-safe
    05-world.js           neighborhood TileMap (App. A), wall types, facade decorators, shapes, lights, weather, time-of-day presets
    06-people.js          cast roster (rigs, colors, voices), civilian generator, custom poses
    07-agents.js          Agent (Mover + rig + brain), routines, FlowField cache, interactions, barks
    08-perception.js      "made" system: observers × police suspicion, behavior factors, HUD heat
    09-corner.js          CornerSim (roles, customers, sales, stash, count, shutdown, heat hooks)
    10-camera.js          Watch mode, reticle, read/observe, photo scoring, polaroid renderer
    11-tail.js            tail routes, counter-surveillance, distance band, partner hand-off
    12-chase.js           escape graph, ditch, vault, tackle, cuff, search
    13-raid.js            raid planning, breach, interior reactions, stash search
    14-board.js           case model + Board screen
    15-notebook.js        notebook screen (objectives, map, people, evidence, phones, case)
    16-cipher.js          keypad ciphers + decoder UI
    17-box.js             interrogation system (box + kitchen configs)
    18-paper.js           affidavit builder + judge cross-examination
    19-wire.js            wire room (call scheduler, playback, minimization, logging, voice ID, pages)
    20-meters.js          Brass / Heat / Legal / Case rules and consequences, ops choices
    21-story.js           Director (episode beats), mission runner, E.Story setup, epigraphs, montage, endings
    30-data-*.js          content as data: people, missions, dialogue nodes, calls, routes, evidence, credits
    40-scenes.js          boot, title, attract shell, episode card, annex, field, box, chambers, wire, corner, montage, credits, about, versus, results
    50-versus.js          versus rules, roles, bots, split screen
    51-net.js             Transport (Local / Hub), host sim loop, snapshots, inputs, finish
    52-attract.js         attract reel + bot drivers
    60-debug.js           game.debug, deep links, ?dev=1 overlay, test hooks
    99-start.js           new E.Game, scenes, boot steps, start (or AI Hub round)
    ui.css                HTML UI theme (case-file look)
    credits.json          About/Credits + exit-interview source of truth (§13)
  tools/build.mjs         bundles the single html + writes exit-interview.json
  tests/
    headless.mjs          systems + smoke tests on the engine's fixed-step clock (Node vm)
    browser.mjs           Playwright: gamepad glyphs/invert, attract, touch-only notice, screenshots
    hub/                  harness.html, bridge.js, round.js + hub-check.mjs
  index.html              dev page: engine + src files as separate scripts (fast iteration)
```

### 3.3 Single-file bundle (`tools/build.mjs`)
Order inside `Wiretap-TheWire-claude-opus-5-5-max-20261103-105319.html`:
1. `<!doctype html><html lang="en"><head><meta charset="utf-8">`
2. `<script>` + `vendor/aihub-session.js` (byte-identical) + `</script>`
3. viewport meta (`width=device-width, initial-scale=1, viewport-fit=cover`), hub tags (§9.3), `<meta name="hub:type" content="Game">`, `<meta name="hub:players" content="1-4">`, `<title>WIRETAP</title>`, `<style>` with `ui.css`
4. `<body>`: boot splash markup (run the engine in Node `vm` at build time and insert `My3D2dge.bootSplash('WIRETAP')`), then `<canvas id="screen"></canvas><div id="ui"></div>`
5. `<script>` engine `</script>`, then `<script>` game: `(() => { 'use strict'; const CREDITS = <credits.json>; …src files in order… })();`

The build must:
- fail if any inlined JS contains `</script` (escape it as `<\/script`)
- re-parse `credits.json`
- write `../exit-interview.json` from `credits.json` (§13) and `JSON.parse` it back to verify
- print the bundle size (expect about 1.6-1.9 MB)

### 3.4 Architecture rules (non-negotiable; they make attract, bots, network and tests possible)
1. **Controllers, not input.** Gameplay never reads `game.input` directly. Every controllable character has a `ctl`: `HumanController(input)`, `BotController`, `RemoteController` (network) or a scripted one. A controller exposes `move()`, `aim()`, `down(a)`, `pressed(a)` and `released(a)`. Scenes build the `E.Mover` intent `{ move, sprint, crouch, jumpPressed }` from `ctl`.
2. **Systems are model + view.** Every system keeps pure state and rules (headless-testable). Drawing (canvas) and DOM views read the state. The UI kit and `E.Shell` are headless-safe: no DOM means no view and the same model.
3. **Content is data.** People, missions, beats, dialogue nodes, calls, routes, evidence, board slots, ending cards and credits live in `30-data-*.js` objects with documented schemas (App. J). A boot step `validateData()` checks cross-references (missing ids, unknown people, bad cells) and reports them through `game.fail`. That is the "infrastructure for designer tools" the task asks for.
4. **Registries + event bus.** `def(kind, id, spec)` / `get(kind, id)`. `bus.on('photo' | 'made' | 'evidence' | 'beat' | 'sale' | 'callLogged' | …)`. Meters, toasts, achievements-style stats and the debug overlay listen. Systems never call each other's UI.
5. **Seeded randomness.** Use `E.rng(seed)` streams per system (`rng.world`, `rng.sim`, `rng.cosmetic`), never `Math.random`, in anything that affects play. Versus host streams come from `AIHub.seed` / `AIHub.rng(label)`.
6. **World units and dt.** Engine rules: 1 tile = 16 units, z up, fixed step 1/120 s, draw only through engine primitives on the game buffer.
7. **One save state.** `STATE` (App. J) is the only thing `game.saves` writes. Systems rebuild themselves from it.
8. **Global per-step systems run from a scene wrapper.** Engine timers and tweens end with each scene, so every scene is registered through `withGlobals(scene)`, whose `update` first runs `Globals.tick(dt)`: the idle timer, the attract director, the device/glyph watcher and the hub hooks.

### 3.5 Scenes
| Scene | View | Pausable | Purpose |
|---|---|---|---|
| `title` | iso (live diorama) | no | Logo, main menu, idle timer → attract, touch-only notice |
| `attract` | varies | no | Demo reel (§10) |
| `card` | none | no | Episode title + epigraph (black, white text) |
| `annex` | iso interior | yes | Hub between missions: stations (§6.0) |
| `field` | iso | yes | All neighborhood missions (photos, tail, chase, van, trash, raid, money tail, cold open, corner interludes as Tee) |
| `wire` | brawler interior + DOM | yes | Wire room shifts (§6.6) |
| `box` | brawler interior + DOM | yes | Interrogation / kitchen talk (§6.4) |
| `chambers` | brawler interior + DOM | yes | Affidavit review with the judge (§6.5) |
| `montage` | iso/brawler stills | no | Epilogue cards (§8.8) |
| `credits` | none | no | Credits roll after the finale |
| `about` | DOM | no | About & Credits pages (§13) |
| `versusSetup`, `versus`, `versusResults` | iso, split | versus yes (local only) | §9 |
| `shutdown` | none | no | Detail shut down (game over) → retry from autosave or montage |
| `hubWait` | none | no | AI Hub only: "Connecting…" while `AIHub.connect` resolves (no prompts, no menus) |

The Board, notebook, cipher, affidavit editor, ops choice and evidence viewer are **UI screens** opened over `annex`/`field`/`wire`, not scenes.

### 3.6 Engine setup (99-start.js)
```js
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'iso', views: ['iso'], input: KEYS, id: 'wiretap',
  menu: { items: [['Restart this part', () => Director.restartBeat()], ['Episode select', () => Director.toEpisodes()]],
          settings: GAME_SETTINGS, controls: CONTROL_NAMES, quit: 'title', saves: true } });   // Save/Load in the pause menu; saves.canSave only in the Annex
E.style.propSize = 1.35;                       // props match size-1.25 heroes
installGamepadInversion(game);                  // before the first tick (§4.4)
const ui = new E.Shell(game, { theme: THEME, meters: .0625 });   // HUD, toasts, standard pause/settings/controls; 16 units = 1 m
game.start({ scenes, scene: 'title', boot: { title: 'WIRETAP', version: '1.0', steps: BOOT_STEPS, messages: BOOT_LINES } });
```
- **Boot steps:** "Laying Ridley Avenue" (map, FlowField cache), "Hanging the phone lines" (wires, shapes), "Waking the block" (roster/rigs), "Checking the paperwork" (`validateData`), "Charging the pagers" (audio defs).
- **Boot lines** (the engine's flavor messages): "Pouring the coffee", "Juking the stats", "Filling out the 24-hour report", "Finding a parking space on Ridley".
- **In an AI Hub session** (`AIHub.active`), 99-start skips the title: `menu.quit = false`, `autoPause: false`, and §9.3's async flow calls `game.start` itself and goes straight into the versus round. The `game.start` call above is the non-session path.

---

## 4. Controls and 10-foot UX

### 4.1 Input preset `KEYS` (custom; include moves and the menu keys verbatim, since custom presets don't inherit them)
```js
const KEYS = {
  up: ['KeyW','ArrowUp','Pad12'], down: ['KeyS','ArrowDown','Pad13'], left: ['KeyA','ArrowLeft','Pad14'], right: ['KeyD','ArrowRight','Pad15'],
  start: ['Enter','NumpadEnter','Pad9'], pause: ['Escape','KeyP','Pad9'],
  confirm: ['Enter','NumpadEnter','Space','KeyJ','KeyZ','Pad0'], cancel: ['Escape','Backspace','KeyX','KeyK','Pad1'],
  interact: ['KeyE','Pad0'], crouch: ['KeyC','ControlLeft','Pad1'], blend: ['KeyF','Pad2'], partner: ['KeyQ','Pad3'],
  notebook: ['Tab','KeyN','Pad8'], map: ['KeyM'],
  watch: ['Mouse2','Pad6'], photo: ['Mouse0','Pad7'], sprint: ['ShiftLeft','ShiftRight','Pad10'],
  rotL: ['BracketLeft','Pad4'], rotR: ['BracketRight','Pad5'], camReset: ['KeyR','Pad11'],
  tabPrev: ['KeyQ','Pad4'], tabNext: ['KeyE','Pad5'], uiAlt: ['Digit2','KeyT','Pad2'], uiInfo: ['Digit3','KeyI','Pad3'], uiFast: ['ShiftLeft','Pad7'],
  boxTop: ['Digit1','Pad3'], boxLeft: ['Digit2','Pad2'], boxRight: ['Digit3','Pad1'], boxBottom: ['Digit4','Pad0']   // the box's diamond (§6.4)
};
```
On the Controls screen, hide `tabPrev`, `tabNext`, `uiAlt`, `uiInfo`, `uiFast` and the four `box*` actions with `menu.controls: { tabPrev: false, … }`, and name the rest (`interact: 'Interact / vault / tackle'`, `blend: 'Act natural (hold)'`, `partner: 'Partner / crew orders'`, `watch: 'Watch (aim camera)'`, `photo: 'Take photo'`). Pad8 (Create) opens the notebook **on release, and only if Options (Pad9) wasn't pressed during the hold**, because Create+Options belongs to the AI Hub. While Pad8 is held in a session, call `input.suppress('pause')`. Don't use the touchpad button (Pad17): the engine has no label for it and not every browser reports it.

### 4.2 Context maps (DualSense / keyboard + mouse)
| Context | DualSense | Keyboard + mouse |
|---|---|---|
| Move / sneak | L-stick (analog: walk) · ○ crouch toggle | WASD/arrows · C or Ctrl |
| Run | L3 toggles run · (chase/tail: run becomes sprint, with stamina) | hold Shift |
| Act natural (blend) | hold □ | hold F |
| Interact / vault / tackle / cuff | ✕ (context) | E · or left-click the highlighted thing in the world (walks there if far) |
| Watch (aim camera) | hold L2, aim with R-stick | hold right mouse, aim with the mouse |
| Photo | R2 while watching | left click while watching |
| Look ahead | R-stick (when not watching): camera peeks up to 64 px | move mouse toward a screen edge (edge peek, optional setting) |
| Rotate view / reset | L1 / R1 · R3 | [ / ] · R |
| Zoom | (engine) via Settings · D-pad ↑/↓ is movement, not zoom | wheel, - / = |
| Partner (hand off the eye, commands) / crew orders as Tee | △ (Tee: hold △ for the order wheel) | Q (Tee: hold Q, wheel follows the mouse) |
| Notebook / map | Create | Tab (or N) / M |
| Pause | Options | Esc / P |
| UI screens | D-pad/L-stick move focus · ✕ select · ○ back · □ alt · △ info · L1/R1 tabs · R2 hold fast | arrows/WASD · Enter/Space · Esc/Backspace · 2 / T · 3 / I · Q / E · Shift · **hover focuses, click selects, wheel scrolls** |
| Dialogue choices | ✕ on highlighted · face-button shortcuts when the choice shows a glyph (△ □ ○ ✕ diamond in the box, §6.4) | arrows + Enter, number keys 1-4, hover + click |

Settings add **Run: Hold / Toggle** and **Watch: Hold / Toggle**.

### 4.3 Prompts and glyphs
- **Source of truth:** `game.input.label(action)` (the player's bindings, `lastDevice`, `glyphs`). It returns, for example, `'✕' '○' '□' '△' 'L1' 'R2' 'Create' 'Options' 'L3' 'R3'` (PlayStation), `'A' 'B' 'X' 'Y' 'LB' 'RT' 'View' 'Menu' 'LS' 'RS'` (Xbox), and `'E' 'Shift' 'Tab' 'Space' 'Left click' 'Right click'` (keyboard/mouse).
- **Canvas glyphs** (`Glyph.draw(g, label, x, y)` in 02-input.js), 9×9 pixel art:
  - PlayStation: disc with symbol. ✕ `#7aa7ff` · ○ `#ff6b6b` · □ `#f08fd8` · △ `#45d6a0`.
  - Xbox: disc with letter. A `#5dc24a` · B `#e8483c` · X `#3d8ef0` · Y `#f2c230`.
  - Shoulders and triggers: a rounded pill with text (`L1`, `R2`, `LB`, `RT`). Create/Options/View/Menu: a small pill.
  - Keys: a keycap box with `E.font` text. Mouse: a 7×11 mouse sprite with the pressed button lit.
- **DOM glyphs** (`<span class="g g-ps-cross">✕</span>`, `<kbd>E</kbd>`, `<span class="g g-mouse-l"></span>`) use the same colors in CSS. Style E.Shell's key chips (`.esh-k`, `.esh-pr`, `.esh-keys`) with an override stylesheet so its prompts show the same colored glyphs. Don't hide the `esh-` CSS. Map label text to classes.
- **Follow the last device.** Every frame, compare `input.lastDevice` (plus `padStyle()` and the glyph setting) with last frame's. On change, re-render DOM legends and prompts. Add hysteresis: ignore mouse moves under 6 px so a nudged mouse doesn't flip a pad player's prompts.
- **Defaults:** PlayStation glyphs. Settings → *Button symbols: PlayStation / Xbox*. Override the standard `glyphs` setting by defining it again in `GAME_SETTINGS` with `{ key: 'glyphs', group: 'Game', label: 'Button symbols', options: [['playstation','PlayStation  ✕ ○ □ △'],['xbox','Xbox  A B X Y']], value: 'playstation', apply: (g, v) => g.players.forEach(p => p.glyphs = v) }`. Verify it now appears on the Settings screen. If redefining a standard key misbehaves, use a new key `padSymbols` that also calls `game.settings.set('glyphs', v)`.

### 4.4 Gamepad axis inversion (the ~10% inverted-input issue)
Settings (group *Game*): **Invert stick left/right** (`stickInvX`) and **Invert stick up/down** (`stickInvY`). Don't reuse the key `invertY`: the engine already has that one, and it only inverts the aim stick. They flip both sticks' axes for every pad and every consumer (gameplay, engine menus, E.Shell, versus) through one wrapper installed before the first `input.tick`:
```js
function installGamepadInversion(game) {
  const real = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : () => [];
  const wrap = p => { if (!p) return p; const ix = game.settings.stickInvX, iy = game.settings.stickInvY; if (!ix && !iy) return p;
    const a = Array.from(p.axes); if (ix) { a[0] = -a[0]; if (a.length > 2) a[2] = -a[2]; } if (iy) { a[1] = -a[1]; if (a.length > 3) a[3] = -a[3]; }
    return { id: p.id, index: p.index, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, buttons: p.buttons, axes: a,
             vibrationActuator: p.vibrationActuator, hapticActuators: p.hapticActuators }; };
  try { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => Array.from(real() || []).map(wrap) }); } catch (e) { game.fail('gamepad inversion', e); }
}
```
Help text: "Flips the sticks for controllers that report them backwards." Test it with a fake gamepad (§16).

### 4.5 10-foot UI rules
- **Type.** HTML body `font-size: clamp(18px, 2.6vh, 34px)` (about 28 px at 1080p), headings 1.6-2.4×. Canvas text uses the engine's 5×7 font at `res 'ps1'` (about 28 px glyphs at 1080p) for dialogue and barks. Never below that.
- **Density.** At most 6 focusable items in a list, at most 8 cards in a grid page, no tables of data, one primary action per screen. Long content pages with L1/R1.
- **Thumbnail test.** Scale a 1920×1080 screenshot to 480×270. If any essential text is unreadable there, it's too small or dense.
- **Safe area.** 5% margins on all screen-anchored UI (TV overscan). Keep the top-right 110×60 CSS px clear for the engine's corner buttons (`game.cornerArea()`).
- **Focus.** 4 px amber `#ffb347` outline, 1.04 scale and a soft tick sound. Spatial navigation: nearest focusable in the pressed direction, by rect centers with an angle penalty. **Hover focuses** (pointerover) and click activates.
- **Hover patch.** Add one global handler so hover moves focus in the engine's own E.Shell screens too: `document.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const b = e.target.closest && e.target.closest('.esh-sh button, .esh-sh [tabindex], .esh-sh select, .esh-sh input'); if (b) b.focus({ preventScroll: true }); });` E.Shell navigates by `document.activeElement`, so this keeps them in sync.
- **Legend.** Every screen has a footer legend built from actions (`UI.legend([['confirm','Select'],['cancel','Back'],['tabNext','Next page']])`) that re-renders on device change.
- **Same game on every device.** Keyboard+mouse and pad use the same screens and layouts. Only prompts differ. No desktop-only layout.
- **Color is never the only signal.** Suspicion uses icons (`·` `?` `!`) plus meters. Pertinent/non-pertinent uses icons plus text.

### 4.6 HUD (E.Shell `ui.hud` each step; field scenes)
- `objective: { step: 'EP1 · 2/4', title, text, at, from: dana }`. It shows distance and above/below (the Shell was built with `meters: .0625`, so 16 units = 1 m).
- `status`: `Unnoticed` / `Noticed` / `Watched` / `MADE` / `Blending` / `In the van` / `Winded`, with a color *and* a word.
- `bars`: **Heat** (max suspicion toward the player 0..1, label "Eyes on you"), **Stamina** (chase/tail), **Distance** (tail, §5.5).
- `counts`: `[['Film', 27], ['Fund', '$180']]`.
- `prompt: { act: 'interact', label: 'Talk', hint: 'Pockets' }` for the nearest/hovered interactable (§5.1).
- `minimap: { map, at: dana, markers }` (objective, known payphones, last-seen target).
- `ui.toast(title, text)` for photos ("Terrence 'Tee' Mabry ★★☆ ACT"), numbers, evidence and meter changes. `ui.tutorial(title, text)` for first-time tips (once each, stored in STATE.tips).
- Over each watcher's head in the world: `·` (calm, only with the assist on), `?` (noticed, amber), `!` (made, red), with a 12-px suspicion bar. Same as the stealth kit's overlay.

### 4.7 Settings (game group; the engine adds Display/Sound/Comfort/Controls)
| Key | Label | Values (default first) |
|---|---|---|
| `glyphs` | Button symbols | PlayStation, Xbox |
| `stickInvX` / `stickInvY` | Invert stick left/right · up/down | off |
| `difficulty` | Case difficulty | Detective, Rookie, Murder Police |
| `runMode` / `watchMode` | Run · Watch | Hold, Toggle |
| `textSpeed` | Text speed | Normal (45 cps), Slow (28), Fast (80), Instant |
| `voices` | Voice volume | slider .8 (multiplies the voice bus) |
| `language` | Strong language | Uncensored, Bleeped (replaces a small word list with `—`) |
| `hints` | Investigation hints | on: highlights key wire lines on Rookie, Szabo hints after 2 failed tries |
| `cones` | Show sight cones | on (assist; `r.sightCone` for watchers when you're near) |
| `edgePeek` | Mouse edge peek | on |

Difficulty multiplies suspicion rise (Rookie .7 · Detective 1 · Murder Police 1.35), the minimization window (10 s · 8 s · 6 s), Brass decay (.7 · 1 · 1.3) and tail tolerance (lost after 16 s · 12 s · 9 s).

### 4.8 Touch-only devices
- **Detection** at boot and on every input: `touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0`, and no gamepad connected, and no keydown seen yet.
- **What shows:** the title shows a centered panel, "**Controller or keyboard required**" (subtext: "Connect a controller or keyboard to play. The demo will run in the meantime."), and a large **Settings** button. Tap it → `game.menu('settings')`.
- **No touch controls anywhere:** never pass `touch:` in scenes, set `game.input.touchEnabled = false`, and `game.settings.set('touch', 'off')` on touch-only devices.
- **Attract still runs:** after 10 s it starts, and a tap returns to the panel.
- **Recovery:** `gamepadconnected` or any `keydown` hides the panel and shows the normal menu.

---

## 5. Core systems

### 5.0 Shared numbers
| Thing | Value |
|---|---|
| Tile | 16 units; map 72×56 cells = 1152×896 units |
| Dana walk / run / sprint / crouch | 52 / 85 / 125 / 32 u/s. Intent magnitude ×0.62 = walk; `sprint` held = run; in `pursuit` (chase) run becomes sprint |
| Stamina (pursuit and tail sprinting only) | 100; drains 14/s sprinting; regenerates 10/s otherwise; at 0 "Winded" for 2 s (jog 60, breathing sfx) |
| Humanoid sizes | adults `size 1.25, build 'heroic'`; teens 1.1; kids 13-14 1.0; Rook `build 'bulky'` |
| Field camera | `camera: { zoom: [.8, 2], start: 1.2, tall: 1.4 }`, `game.follow(dana, { z: 16, lead: 18 })`, `cam.bounds = v => map.bounds(v)`, rotation in 90° steps with a 0.35 s tween |

### 5.1 Field scene and interactions
`field` loads a **mission** (data, App. J) and gets from it the time of day, weather, cast spawns and behaviors, objectives, events, checkpoints, music and rules. One scene runs every neighborhood mission.

**Mission clock:** an `E.Clock` running at 30 game minutes per real minute from the mission's start time. Lighting interpolates between the time presets (§12.1) and scheduled events fire on it. It stops at the mission's end time. There are **no time limits** unless a mission says so (the tail's timers, the chase, the 60-s rescue, the raid's 30 s).

**Interactables** are registered per mission. Each has `{ id, at: {x,y}, r: 18, verb: 'Talk'|'Read number'|'Search'|'Sit'|'Buy a soda'|'Vault'|..., when(ctx), act(ctx) }`.
- The nearest valid one within its radius drives the HUD prompt.
- The mouse hovering one (screen-pick through `{ pick: obj }` on `r.actor`/`r.shape`, then `r.pick(sx, sy)`) highlights it with a 1-px outline.
- Left click on a hovered interactable: in range → act; out of range → Dana walks to it along the cached FlowField and then acts. Any movement input cancels the walk.

**Cover activities** (§5.2 behavior factor "cover"):
- sit at the bus stop
- sit on a stoop where allowed (Odessa's, after her scene)
- buy a soda at Gaither Market (Dana goes inside for 6 s: hidden, and suspicion decays at 3× the normal rate)
- lean at a wall (any wall cell edge)
- wait in a car (Dana's unmarked Chevy on Ridley, or the van)

**Eavesdrop.** Barks (speech bubbles over NPCs, §7.5) are readable within 48 units *and* while the speaker's suspicion of you is below "notice". Otherwise they show as "…". Key barks carry intel and add an observation log.

### 5.2 Perception: getting "made" (08-perception.js)
- **Observers:** every crew member flagged `watcher`, plus the target in a tail.
- **Watched:** every police character (Dana, the partner, AI plainclothes; in versus, detective players).
- One `E.Suspicion` per (observer, police) pair, updated each step:
```js
const seen = E.sees(o, p, { map, range: o.range ?? 150, fov: o.fov ?? 1.7 });
let b = 1;                                                   // behavior factor
if (p.watching && aimedAt(p, o, 0.17)) b = 2.2;              // staring through the camera at this observer (±10°)
else if (p.still > 2 && !p.cover) b = 1.6;                   // loitering in plain view
if (p.sprinting) b = Math.max(b, 1.4); if (p.crouching) b = Math.max(b, 1.3);
if (p.cover) b *= 0.6; if (p.blending) b *= 0.35; if (p.inCar) b *= 0.3;
if (o.knows && o.knows.has(p.id)) b *= 1.5;                  // a face they've made before
const light = isLit(p) ? 1.1 : (night ? 0.7 : 1);             // game helper: within 40 units of a lit lamp/light this frame
o.minds[p.id].update(dt, { ...seen, exposure: seen.exposure * b * light * DIFF.rise }, p);
```
- **Tuning targets.** Tune `E.Suspicion` options until these hold on Detective; record the constants in one table:
  - Staring at a lookout from 60 units: made in about 4 s.
  - Walking past at 60 units without watching: never noticed.
  - Standing still, uncovered, 100 units away: noticed about 3 s, made about 9 s.
  - Blending at 100 units: never made.
  - Watching a non-watcher (e.g., the money man) from 120 units while a watcher only sees you from the side: made in about 15 s.
- **States:** `calm` → `notice` (`?`, the observer turns to look, the tout stops calling for 2 s) → `search` (`??`, whistles, nudges the next crew member, who also starts watching you) → `alert` = **MADE**.
- **Made consequences:**
  - The corner shuts down (§7.2) for 60 s (bark "Five-oh!" plus a two-tone whistle).
  - Heat +15.
  - That observer and everyone within 120 units add Dana to `knows`.
  - `p.burnedUntil = now + 60`: Dana's photos score 0 stars while burned and the HUD shows "MADE: walk it off".
  - Leaving every observer's sight for 20 s and getting 2 blocks away resets the local state.
  - In story missions, being made never fails the mission. It costs time and Heat, and some events (Tee's payphone call) skip a cycle. Exceptions: tail and trash (§5.5, §5.7).
- **Van heat:** each van parking spot has `heat` that rises 1 per 12 s while any watcher is within 160 units. When a crew member passes within 40 units and the van has been parked more than 90 s, add 25. At 100 the van is burned (bark "That van been there two days", Heat +10, and the mission asks you to relocate: choose one of the other spots).

### 5.3 Watch mode, reading roles and photos (10-camera.js)
- **Enter.** Hold `watch`: zoom tween ×1.6 (0.25 s), a reticle at screen center, and the camera keeps the reticle in the central 60% (pans up to 7 tiles from Dana; 14 tiles with the van's long lens in Ep3). The R-stick moves the reticle at 220 px/s (mouse: the reticle *is* the pointer). Dana's rig plays the camera-raise pose. Movement slows to 20.
- **Target.** The nearest NPC whose screen anchor (chest, `r.w(x,y,z+22)`) lies within 10 px of the reticle. Show its name if known, else "Unknown", plus a focus ring that tightens over 0.4 s while the reticle moves under 30 px/s.
- **Read.** Holding the reticle on a person performing a role behavior fills a read meter over 3 s. When full: an observation log (`obs:<person>:<role>`), the role tag shows on the person's card ("LOOKOUT", "RUNNER", "STASH", "MONEY", "MUSCLE", "LIEUTENANT") and Case +1. Reading a watcher who can see you is risky (b = 2.2).
- **Photo.** Press `photo`. Shutter sound (synthesized click-whirr), no flash (covert), a 2-frame white border flicker on the HUD. Film −1 (30 shots per mission; Ep3 van: 48). Score:
  - **Range rule:** beyond the camera's range (220 units; the van's long lens 360), every photo is Blurry (0 stars).
  - **★ Face:** the target is in range, `map.sight(dana, npc)` is clear, and |angle between the NPC's facing and the NPC→Dana direction| ≤ 75°.
  - **★ Focus:** the focus ring completed.
  - **★ Act:** the NPC is in an evidentiary act right now (`sale-money`, `sale-product`, `reup-handoff`, `payphone`, `stash-access`, `count-handoff`, `robbery`), each exposing a 1.5-2.5 s `actWindow`.
  - 0 stars = "Blurry", which is kept but useless. Burned Dana always gets 0.
  - **First ★ Face of a person** identifies the face (Case +2). **★ Act** adds evidence (Case +5) tagged with place and time (`act:sale-money@corner 16:42`).
- **Photo object:** `{ id, subject, t, place, stars, tags, turn, light, ep }`. Rendering: `rig.drawPortrait(g, x, y, 64, { zoom: .95, turn, bg })` onto an offscreen canvas, where `turn` is the subject's facing relative to Dana's line of sight. **The photo shows them from your angle:** the back of a head if they faced away. Add a background tone by time of day, 6% grain noise, and an orange LCD date stamp `10 14 '04 16:42`. In the DOM it's a polaroid with a slight random tilt. Thumbnails are cached as dataURLs (not saved; re-render from data on load).
- **Plates and signs.** Vehicles and storefronts can carry a photo `tag` (Harstad truck → `plate:HARSTAD`). Photographing them with ★Focus yields evidence.

### 5.4 Agents and routines (07-agents.js)
- **Agent** = `E.Mover` (or `E.Body` for crowds) + `E.Humanoid` + `brain` + `ctl` (BotController) + `say()` barks.
- **Movement:** a `FlowField` cache keyed by destination POI id (precompute about 30 POIs at boot; compute others lazily and keep them). Agents read `flow.next(x, y)` and steer.
- **Stuck rule:** less than 4 units of progress in 3 s → nudge sideways, then teleport to the nearest walkable cell out of the camera's view.
- **Routines** (data): a list of `{ go: poi, do: activity, for: [min,max] }` with activities `idle`, `lean`, `sit`, `smoke`, `phone`, `chat`, `dice`, `ball`, `wash-car`, `sweep`, `wait-bus`, `shop`, `pray` (church steps), `pigeons` (Pigeon on the roof).
- **Civilian generator:** ~25 at a time in day missions, ~12 at night. Seeded outfits from palettes (§12.4), age/sex varying size and voice. They spawn and despawn at map-edge sidewalks out of view.
- **Custom poses** (06-people.js). Post-process `rig.J` after `rig.update`, as the guide's Emberdeep notes describe. Use `E.ik3` for arms:
  - **sit:** hips to z+10, thighs forward
  - **lean:** torso tilted 8° toward the wall, one foot flat on it
  - **phone:** right hand at the head
  - **camera:** both hands at the face, elbows out
  - **smoke:** hand to mouth every 4 s, with an ember particle
  - **count money:** hands forward, thumb flick
  - **cuffed:** hands behind the back
  - **hands up**
  - **dice:** crouch, plus the `throw` move
  - **sweep:** a broom held from the hand joints

  If a pose fights the rig, the repo's mocap clips (Mesh2Motion "sitting", "talking") are allowed through `tools/anim-set.mjs` + `Mocap.drive` (AI_GUIDE, *Where to find more*). Prefer the procedural poses.

### 5.5 Tail (11-tail.js)
- **Route data:** `waypoints` (cells) and `acts` at waypoint indices, App. J. The target walks at 46 u/s (Dana's walk is 52). The target is an observer with `fov 1.5`, `range 170`.
- **Counter-surveillance acts:**
  - `lookBack` (2.5 s): turns 180°, fov 2.2.
  - `doubleBack`: walks back 48 units, then resumes.
  - `window` (3 s): stops at a storefront and watches the reflection, i.e. a backward cone at 0.6 strength.
  - `cutThrough`: through the 1412 vacant or the Courts breezeway at a jog (70).
  - `phoneStop` (4 s): at a payphone.
  - `wait` (n s): leans on a wall.
- **Distance band** (HUD bar with zones):
  - under 64: too close; suspicion ×1.8 whenever you're in his view
  - 64-160: good
  - 160-220: amber
  - over 220 or no line of sight: the **Losing him** timer runs (difficulty 12 s), and at 0 he's lost.
- **Mirroring rule:** while he's in `lookBack`/`window`/`wait` and Dana is visible, Dana standing still within 3 s of his stop counts as loitering (b = 1.8). Teach it: "When he stops, keep walking or take cover. Don't stop when he stops."
- **Partner hand-off** (△/Q):
  - Szabo (AI) shadows on a parallel street: he picks the candidate point 120-200 units from the target, outside its cone, preferring the opposite side of a block.
  - Available when Szabo is within 200 of the target, his own suspicion < 0.3, and the 20 s cooldown is over.
  - Press: control switches to the other detective (camera tween 0.6 s), and the previous one becomes AI and peels off. Each detective has separate suspicion pairs (a different face).
- **Fail:** lost or made → "Retry from the last checkpoint" (one every 3 waypoints) with Brass −5 per retry, or Heat +10 if made. The tail always completes eventually.
- **Success:** reach the route's end and fulfil its objective (photo or observation).

### 5.6 Foot chase (12-chase.js)
- **Escape graph** (data): nodes on cells with edges typed `run`, `vault` (a fence cell: 0.5 s for the runner, 0.7 s for Dana), `cut` (vacant or breezeway) and `gate`.
- **Start:** the knockers' car pulls up and Corey bolts from the post with a **110-unit head start**: the chase cutscene places Dana on Ridley's south sidewalk at 36,30, about 107 units from the post.
- **Runner AI:** the escape graph is a network of loops with no exits (App. A). At each node pick the next node maximizing `dist(pursuer, node) − 0.5·alignment + rng·20`, preferring edges that break line of sight. At 15 s Lou "takes the car around": his car blocks the edge Corey is about to take next (a car shape plus a blocked floor cell), forcing a reroute.
- **Speeds and stamina:** Corey sprints 112 for 10 s, then runs 92, and recovers his sprint after 4 s out of Dana's sight. Dana sprints 125 on stamina (about 7 s from full, §5.0) and runs 85 otherwise. Sprinting from the start empties Dana before she closes the gap: the catch comes from routing (cut-throughs, the court gate instead of the fence), Lou's block and Corey tiring. **Target length: 20-45 s** for a competent player.
- **Vault:** a context prompt at fence cells, when moving toward the fence and within 14 units. `✕` triggers a jump arc over the blocked `fence` floor cell. Fences are floor-tagged and blocked (App. A), so walkers stop and jumpers pass.
- **Ditch:** when Dana gets within 90 units, or after 10 s, the runner throws the package into the nearest ditch spot within 40 units: trash can, under a parked car, storm drain (lost) or vacant window. Cues: throw animation, a soft "plink", 6 glint particles.
- **Tackle:** within 14 units while sprinting, the prompt `✕ Tackle`. The paired action `E.ACTIONS.tackle` is written like the engine's `takedown` (lunge 0.25 s, both bodies fall). A miss means a stumble of 0.8 s. A hit means the runner is `down`. Then **hold ✕ for 1.2 s** to cuff (cuffed pose; a rumble of 0.4 for 0.2 s).
- **Search:** ditch spots within 30 units show "Search" (2 s each). After 45 s a kid on a bike rides in and takes the package if it's still there (no drugs charge, Heat +5). A storm drain is gone.
- **Win:** cuffed. **Lose:** Corey stays out of Dana's sight for 8 s in a row ("He's gone."). Retry from the chase start.

### 5.7 Stealth search (trash, Ep4) and the long lens (Ep5B)
- **Trash:** 5 trash bags behind Ridley Wireless (alley cells 39-43, 20-21), each needing a 2.5 s search with a rustle sound that `E.hears` can pick up (loud 60). Two observers patrol: the store owner's nephew smoking at the back door, and Lil Moe on his bike through the alley every 40 s. Dark alley cells drop exposure (light factor 0.7 → 0.5 when crouched). Being made here aborts the search (retry from the alley entrance, Heat +5). Find the bag with 12 phone boxes: serial numbers become evidence `serials:burners`.
- **Long lens (Ep5B):** from the roof of the vacant at cells 49-51 × 16-19, directly across the alley from Mama B's back window (about 80 units away). Dana reaches it with ✕ on the vacant's alley door at (50, 20), which fades to her on the roof at z 40 and puts the camera in Watch. Watching that window opens a framed close-up vignette: a 2D painted room. Draw Easy and Lonnie with `drawPortrait` (zoom 1.2), money stacks as `px` rects and a lamp light. Easy's face shows only during `count-handoff` (4 s windows, three times). A ★★★ photo of Easy in the act is the Path B win condition.

### 5.8 Raid (13-raid.js, Ep5A)
1. **Plan screen** (DOM, 3 cards): *Front (roll-up door)*, *Side door*, *Both (split the team)*. This sets which AI officers stand where.
2. **Stack and breach:** Dana at the chosen door. Press `✕ Breach` (a ram animation, a heavy thud with shake 4, the door cell opens with `map.set(...)`). The garage's fake roof fades (§12.6).
3. **Reactions:** 30 s real time.
   - Lil Moe runs to the toilet corner to flush. Dana must reach him within 6 s; Szabo reaches him with 50% chance if the side door is covered.
   - Dale (the courier) bolts for the roll-up door: caught if covered, otherwise he escapes (flag).
   - Tee sits on a crate: "Let me see the paper." Interact → Dana shows the warrant (dialogue).
   - Rook, if free, reaches for a pistol on the workbench. Dana must interact within 3 s ("Hands!"). There's no shooting: if missed, Rook drops it anyway after a tense 2 s stand-off, and the flag `rookDrew` changes later lines.
4. **Search:** 4 suspicious spots (car trunk, ceiling tile, toolbox, false wall). Two hold the stash, picked from a seed. Clue decals: plaster dust under the false wall, a ladder under the ceiling tile.
5. **Results:** the package, cash and gun are seized. The press-conference cutscene follows (§8.7).

---

## 6. Investigation systems

### 6.0 The Annex (hub scene) and the car
The detail's office is a converted records room above the city impound lot, 22×10 cells (App. B). Dana walks it in iso. **Stations** are interactables, lit only when the current beat allows them:

| Station | What it does |
|---|---|
| **The Board** (north wall, bullpen) | Opens the Board screen (§6.1). The wall shape redraws its pinned cards and strings from STATE, so progress shows in the world too |
| **Lt. Navarre's office** (glass, east) | Briefings (story nodes), the **ops choice** of the episode (§6.7), the Major's phone calls. Shows the Brass gauge |
| **Wire room** (west door) | The wire scene (§6.6), only while a line is up |
| **Evidence cage** (south-west) | Evidence viewer: photos large, items, decoded pages; also the cipher (§6.3) when a pager is in evidence |
| **Coffee** (south-east) | Talk to whoever is on break: hints (the `hints` setting), flavor, relationship lines |
| **Hal's bench** | Hal fixing a 1962 Zenith radio: wire tips, voice-ID practice |
| **Ren's desk** | Photo prints come out here (flavor); van requests |
| **Stairs** (south exit) | Leave for the next field beat → **car scene** |

**Car scene:** Dana and Lou in a beige Chevy Lumina, as a side view of a city-night `E.Backdrop` scrolling (parallax by time), the car body drawn as a `px` silhouette with the two of them in the windows. It runs 1-3 short topics (E.Story with choices: "the case", "Lou's daughter", "the Orioles", "Felton"). It's skippable with ○ after the first line. It replaces free driving and carries character beats the way the show's car conversations do.

### 6.1 The Board (14-board.js)
- **Model:** `slots` by tier, `cards` (people, phones, places, vehicles, businesses) and `links` (string between cards). Each slot has `needs` (facts). Facts come from photos (★Face → `face:<id>`), reads (`obs:<id>:<role>`), informants (`name:<id>`, `stmt:<id>:<fact>`), intercepts and decoded pages (`num:<phone>:<person>`) and plates (`plate:harstad`).
- **Tiers and slots:**
  - **THE CORNER:** Lieutenant (Tee), Muscle (Rook), Stash (Corey), Money (Dink), Runner (Tavon), Lookout ×2 (Pigeon, Lil Moe).
  - **THE PACKAGE:** Courier (Dale), Supplier front (Harstad Auto Parts), Re-up spot (Arundel Gas → the garage).
  - **THE MONEY:** Boss (Easy), Driver (Lonnie), Front (Mama B's), Count (Thursday after close).
  - **PHONES** column: P1, P2, P3, pager clone, burners B1-B5.
- **Interaction** (DOM corkboard, 10-ft sized: at most 8 cards visible per tier page, L1/R1 change tier):
  - Select a card (✕/click), then a slot or another card (✕/click): pin it or tie a string. Mouse drag-and-drop works too. □ unpins. △ inspects (a polaroid big, with its facts).
  - **Validation:** a pin succeeds only if the card has the slot's needed fact. Otherwise Szabo says why not ("Says who? Get me something that puts him on the stash."). Nothing is lost.
  - Correct pins and links add Case points (§6.7) and play a pin-push sound.
  - An unknown person shows as a silhouette card with "?". Easy's slot shows "?" until Ep3 (name) and Ep5 (face).
- **Board tutorial** (Ep1): pin 4 faces, assign roles, and tie Tee to P1 if you photographed his payphone call.

### 6.2 Notebook (15-notebook.js; Create / Tab)
Tabs with L1/R1, at most 6 items each:
- **Objectives:** current and optional, plain sentences.
- **Map:** the neighborhood at 1 px per 2 units, with markers (objective, payphones, known places, last-seen target) and a legend.
- **People:** cards with portrait, name/alias, role, notes.
- **Evidence:** polaroids and items.
- **Phones:** known numbers, what they are, decoded pages.
- **Case:** Case strength bar, Major's patience, estimated street heat ("Calm / Wary / Spooked / Gone dark"), Legal risk, episode stats.

### 6.3 Pager cipher (16-cipher.js; App. C)
- **The crew's code:** "turn the pad". Each digit is replaced by the digit that sits in its place after the keypad is turned a quarter-turn clockwise (`1→7 2→4 3→1 4→8 5→5 6→2 7→9 8→6 9→3 0→0`).
- **Format:** pages are `<encoded callback> <crew code> <sender id>`. Crew codes are sent in the clear (vocabulary from Corey and intercepts): `11` package ready · `22` call me at the usual phone · `33` the count · `44` need product · `55` all clear · `77` police around · `99` stop everything. Sender ids: Tee 07, Rook 13, Pigeon 14, Corey 21, Easy's people 00.
- **Decoder UI:** a big 3×4 keypad on the left and the encoded digits on the right. L1/R1 (or click the arrows) **turn the keypad** 90° at a time, and the decoded digits update live by position. When the decoded number matches a number Dana knows (notebook Phones), it locks with "MATCH: Suds City payphone" and becomes evidence `page:<n>` (Case +3). △ toggles a hint: Corey's line "It's the phone... you turn it."
- **Code flip (Ep3):** after the robbery Tee **always** switches to counter-clockwise (the inverse), so every playthrough meets the puzzle. Old decodes stop matching ("NO MATCH ×3"). It's a **known-plaintext** puzzle: a page arrives right after Tee is overheard saying "call me at the laundry". The player turns the pad the other way until it matches P2. Hal: "They didn't change the lock. They just turned the key the other way."

### 6.4 The box: interrogation (17-box.js; App. E)
- **Scene:** `brawler` view of a small room: table, two chairs, one-way glass, a buzzing fluorescent light (flicker light plus a 120 Hz hum). The suspect sits (sit pose). Dana and Lou stand or sit.
- **DOM side panel:** the suspect's **Resolve** (100 → 0), **Fear** (0 → 100) and a clock ("Booking wants him at Central in 20 min" = 12 exchanges). Each is a bar with a word, with no color-only meaning.
- **Each exchange,** choose an approach. The four sit on a face-button diamond drawn in the dialog area (glyph + verb + number key; hover/click). They use the box's own actions (`boxTop` △/1, `boxLeft` □/2, `boxRight` ○/3, `boxBottom` ✕/4), so the box never reads `cancel`, and Esc/Options still pause:
  - **△ Show evidence:** opens a 6-card evidence picker. Relevant evidence = a big Resolve drop. Irrelevant = Resolve +10 ("That's a picture of a corner, Detective.").
  - **□ Bluff:** "Your boy already told us…". Succeeds only if the bluffed fact is known on the Board (Resolve −25). Otherwise Resolve +20 and Rapport −1.
  - **○ Lean on him:** Resolve −12, Fear +15.
  - **✕ Offer a way out:** Fear −15, Resolve −8. Right after a Lean (Lou plays bad cop, you play good cop) it combos: an extra Resolve −20 and Rapport +1.
- **Rapport** (0-3 pips, shown under the bars): each pip lowers the Fear a Lean adds by 3, and *Work for us* needs Rapport ≥ 1.
- **Beats:** 3 info beats per suspect, unlocked at Resolve thresholds and/or specific evidence. Each adds facts to the Board.
- **Lawyer:** Fear ≥ 80 → "I want a lawyer." The session ends and you keep what you have.
- **Flip:** when beat 3 is reached, Fear ≤ 60 and Rapport ≥ 1, **"Work for us"** replaces ✕ Offer (same button). Accept → CI flag (with consequences later).
- **Kitchen variant (Ep4, Pigeon at Miss Odessa's table):**
  - Meters: **Trust** (0 → 100) and **Fear**.
  - Approaches: △ *Be honest* (+Trust if Board facts back it), □ *Promise* (+Trust now; broken promises cost later), ○ *Push* (+Fear, risky), ✕ *Listen* (small +Trust, lets him talk; Odessa approves).
  - Goal: Trust ≥ 70 → he agrees to tell Dana when the count moves (Path B enabler). Push twice → Odessa ends it.
- **Lines:** every approach × Resolve band (high/mid/low) has 2 variants per side. That's about 40 lines per suspect, written in App. E style.

### 6.5 Paper: affidavit and the judge (18-paper.js; App. F)
- **Affidavit screen:** a typed document (typewriter keys sound as text appears) with a section per **target line** (e.g., P1, P2, pager clone).
  - Each line takes up to 3 evidence cards from the evidence locker. **Probable-cause points:**

    | Evidence | Points |
    |---|---|
    | ACT photo tied to that number | 2 |
    | Decoded page showing the number | 2 |
    | Intercept or observation log of a crew member using it | 1 |
    | Informant statement | 1 (counts only with a direct item) |
    | Seizure | 1 |
    | Face ID linking the user to the Board | 1 |

  - A line needs **≥ 4 points including at least one direct item** (ACT photo or page).
  - **The pager-clone line** targets the stash pager, **555-0110**. That number is on the label of Corey's seized pager, and the crew keeps it in service for whoever holds the stash. Direct items: the seized pager with its decoded memory (2) and each decoded page in evidence (+1, at most 2). Support: Corey's code statement B2 (1), Corey's face ID (1), an ★Act `stash-access` photo (1).
- **Necessity section:** checkboxes for techniques tried: *Physical surveillance*, *Confidential informant*, *Undercover purchase*, *Search warrant*, *Grand jury subpoena*. Only what STATE says you did is true. Ticking a technique you didn't use is **perjury**: hidden until the judge asks. It's a real choice: an honest affidavit with fewer ticks is weaker but safe.
- **Chambers (judge cross-examination):** Judge Halloway (crossword in hand) asks **3 questions**, chosen from App. F's pool: the weakest lines first, then any false necessity tick (always asked if present).
  - Each question offers 3-4 answers, built from your evidence and statements. The right answers cite the right item.
  - A wrong answer strikes that line. A caught lie denies everything: Brass −15, Legal +30, and Vance is furious.
  - Signed lines go up for 30 days.
  - All lines struck → denied (Brass −10). The mission runner then offers a short field beat to get one more item (any ACT photo at a payphone), and you resubmit.

### 6.6 The wire room (19-wire.js; App. D) — the signature system
- **Layout:** the room on the left 38% of the screen (canvas: Hal at the reel-to-reel, which turns while recording, a green CRT, a radiator that clanks) and three DOM panels on the right, switched with L1/R1:
  - **LIVE:** the current call. Line and number, time, speakers (`UNKNOWN MALE 1` until identified), an animated speech-energy strip, and the transcript typing in sync with the voice.
  - **LOG:** recorded pertinent calls; replay any of them.
  - **PAGER:** clone-pager pages, plus the cipher.
- **A shift** is a scheduled list of calls on a session clock (e.g., 16:00 → 23:00). One game hour passes in about 45 s; hold **R2 / Shift** to fast-forward silence ×4. About 8-10 calls per session, each 15-45 s of speech. Voices go through the phone filter (§11.3).
- **Minimization (the law).**
  - On every call you may listen for the first **8 s** (difficulty 6-10 s) to judge pertinence.
  - If it's **non-pertinent** (family, food, a citizen on a public payphone), press **□ MINIMIZE** before the window ends. Listening past it on a non-pertinent call adds **Legal +4 per second**.
  - While minimized: the audio cuts, the transcript shows "— minimized —" and the reels stop. You may **spot-check (□ again) for 3 s once every 10 s** to catch a call that turns pertinent, then keep listening if it did.
  - Minimizing a pertinent call loses whatever is said while minimized.
- **Logging:** press **✕ LOG** while a key line is spoken (or up to 2 s after) to log it. That becomes evidence `int:<call>:<line>` (Case +4). Key lines aren't highlighted unless `hints` is on and difficulty is Rookie. Logging a line that isn't key does nothing ("Hal: Write that down if you want, it ain't evidence.").
- **Voice ID:** **△ ID** opens a strip of known voiceprints: people Dana heard talk in person (dialogue and barks record them in STATE) and confirmed IDs. A voiceprint is a 16-bar glyph generated from the voice profile (App. I). Matching the current speaker's glyph links the number to the person (Case +2, Board fact) for every call from now on. A wrong pick only gets "Listen to the vowels."
- **Live pages** arrive on the clone pager (a beep and a toast). Decode them in PAGER (§6.3).
- **Session result screen:** pertinent calls logged, intel unlocked, minimization record, Legal change. This feeds the Director. If **Legal ≥ 100**, the judge pulls the wire: the rest of the session is skipped, a fallback beat has Dana get the missing intel the hard way (a field observation), and Brass −20.

### 6.7 Meters and ops choices (20-meters.js)
| Meter | Range / start | Up | Down | Effects |
|---|---|---|---|---|
| **Brass** (Major's patience) | 0-100 / 60 | Arrests and seizures: Corey +10, Rook gun stop +15, sweep +25, raid +40; Sunday package +10 | Each episode start without new stats −10; affidavit denied −10; perjury −15; wire pulled −20; tail retries −5; corner gone dark −15 | **0 → the detail is shut down** (game over → retry the beat from its autosave, or take the Shut Down ending). Below 30 in Ep5 locks Path B |
| **Heat** (crew wariness) | 0-100 / 10 | Made +15; van burned +10; Corey arrest +10; seizure +15; sweep +20; wall-off stop +5; confronting Sunday +30; Tee's interlude choices ±10 | −5 per episode; good discipline as Tee is the reverse (higher Heat means a tighter crew) | ≥30: a 3rd lookout and customer screening. ≥50: payphone rotation (a tapped line goes dead one session early; the scheduler moves its calls). ≥70: more `lookBack`s in tails (+50%). ≥90: corner goes dark for a day (Brass −15) |
| **Legal** | 0-100 / 0 | Minimization violations; perjury +30; an illegal search (searching a person without cause in a field beat) +15 | −10 per episode | 100 → the wire is pulled; it also lowers the conviction lines in the endings |
| **Case** | 0+ / 0 | Faces +2, reads +1, ACT +5, statements +2, pages +3, intercepts +4, voice IDs +2, plate +5, seizure +5, Easy ACT +20 | never | Bands at the end: low < 60, mid 60-119, high ≥ 120 → sentences in the montage |

**Ops choice** (one per episode, Navarre's office, 2-3 cards with consequences spelled out):

| Ep | Choice |
|---|---|
| 1 | *Ask for the van*: the Ep3 stakeout uses Ren's van (normal van heat) · vs · *Ask for overtime*: the stakeout uses Dana's Chevy (heat ×1.5), but each Ep3 wire session gets one extra hour with one extra pertinent call (App. D calls S1-OT and S2-OT, +4 each) |
| 2 | *Use Pockets* (free; his statement only counts with a direct item) · vs · *Pay Miss Pat*, the Gaither Market cashier (Fund −$100): a citizen witness whose statement is worth **2** PC points on P1 by itself |
| 3 | **Give the Major bodies (sweep)** vs **Hold the line** |
| 4 | *Rush the burner subpoenas* (Legal +10, Brass +5: the Major likes speed) · vs · *By the book* (Brass −5). Same calls either way: the choice is Legal against Brass |
| 5 | **Dope on the table** vs **Follow the money** |

---

## 7. The corner: crew side (09-corner.js)

### 7.1 CornerSim (one system for story, interludes, versus and attract)
**Roles** (each an Agent with a role brain):
- **lieutenant:** oversees, collects cash, uses payphones and the pager.
- **muscle:** stands near the money; deals with trouble.
- **stash:** guards the stash spot and fetches product.
- **money:** takes cash from customers.
- **runner:** carries product from stash to customer.
- **tout:** calls out the brand, steers customers.
- **lookout ×1-3:** watchers on roofs, corners and bikes.

**Places:**
- **post** (sidewalk cells 30,31-30,34, beside the corner vacant)
- **stash** (one of the stash spots: vacant 1412 inside 27,36 · trash can by the basketball court gate 19,45 · wheel well of a dead Buick on Gaither 32,40)
- **handoff spot** (alley mouth 29,42 or the vacant's side 30,35)
- **payphones** P1/P2/P3 (App. A)
- **re-up drop** (Arundel Gas → the garage in Ep4-5)

**A sale:**
1. A customer arrives (spawn at the map edge, walks to the tout area).
2. **Money exchange** with the money man (2 s, act `sale-money`).
3. The money man signals the runner (a hand sign).
4. The runner walks to the stash and back (or the stash keeper hands it out at the vacant door, act `stash-access`).
5. **Product handoff** at the handoff spot (1.5 s, act `sale-product`).
6. The customer leaves.

$10 a vial, and a customer buys 1-3.

**Rates:**
- Customer arrivals (Poisson):
  - **story field missions:** 0.12/s (observation pace)
  - **interludes as Tee:** 0.35/s (a busy night)
  - **versus:** 0.30/s

  Story and interludes multiply by night 1.2 and package freshness (1.2 fresh → 0.8 stale); versus uses no multipliers; × 0 while shut down. At $10 a vial and 2 vials per customer on average, an interlude makes about $7-8/s and versus about $6/s at full uptime, before shutdowns.
- The money man walks the cash to the lieutenant every $300 (act `count-handoff`).
- Re-up needed when the stash < 30 vials (versus starts with 60 and re-ups below 20).

**Shutdown** ("5-0!"): triggered by any lookout reaching `alert` on police, a patrol car or knockers in view, or a call (player Tee or bot).
- Touts go quiet, sales freeze, runners stash what they carry, and everyone switches to innocent idles (dice, phone, lean).
- "All clear" after 20 s with no police in any lookout's view (versus: after the player calls it).
- Customers waiting during a shutdown leave after 15 s.

**Ledger** (invariant tests): `vials_start − vials_sold − vials_seized = vials_now` and `cash_taken = cash_banked + cash_on_money + cash_seized`.

### 7.2 Police pressure (for crew-side play, versus and attract)
- **Patrol car:** a sedan shape drives App. A's lane loop (Abbott → Ridley → Harlow → Dunmore) at 70 u/s every 60-90 s, with a light bar off. It triggers shutdowns when seen.
- **Knockers:** an unmarked car stops; 2 officers jump out and frisk the nearest crew member carrying product or cash. Seized if not stashed in time.
- **Detectives** (AI plainclothes in interludes/attract, players in versus) behave like civilians but linger and raise cameras (a visible tell: the camera-raise pose for 0.6 s before a shot).

### 7.3 Playing Tee (interludes)
- **Controls:** same movement as Dana. **✕** talks and gives a context order ("Wake up, Pigeon", "Count it again", "Walk with me").
- **Hold △/Q for the order wheel** (canvas radial around Tee; stick or mouse selects; release issues):
  - *Shut it down* (5-0)
  - *Open up*
  - *Move the stash* (pick a spot)
  - *Post up* (send a lookout to a spot chosen with the reticle)
- **Watch (L2/RMB)** works for Tee too: he can study people. A suspicious read reveals undercover cops and the van, and lets you call them out.
- **Pager and code card** (Create/Tab): incoming pages, and a keypad to send pages. **The code card shows Tee's plaintext and the encoded result side by side.** An observant player can learn the cipher from the crew side. That's dramatic irony on purpose; the police side still needs evidence (Corey's statement) to use it legally.
- **Payphones:** walk up and ✕, then dial on a keypad with real DTMF tones (697/770/852/941 × 1209/1336/1477 Hz).
- **The count** at the end of the shift: an animated tally (bills flick, a running total), compared with the target, then the episode's interlude choice.
- **Shortfall:** missing the target sets `teeShort`. Easy's scenes get colder and Tee's ending changes. There's no game over.

### 7.4 Interludes (all at night, 5:00 of real time on a fast clock 22:00 → 02:00, CornerSim running; targets are about 70-80% of what the rates allow)
| # | After | Target | Events (scripted on the sim) | Choice at the end (flags) |
|---|---|---|---|---|
| I1 | Ep1 | $1,500 | Tutorial; Dutch is $2 short (let it slide / turn him away / let Rook handle it); a patrol drive-by (call 5-0 in time); Pigeon asleep on the roof; page the re-up with the code card; Rook and Tee talk about Felton ("who told you his name?" → the 911 leak thread) | Dutch: `goodwill±`, `discipline±` |
| I2 | Ep2 | $1,600 | Corey locked up; choose a new stash spot (3 options: near/risky, far/safe, slow/safe); re-up via a **payphone choice P1/P2/P3**. Tapped phones = more intel for Dana in Ep3; untapped P3 → Ep3 starts with Hal amending (Brass −5); knockers jump out | Corey: bail him out / let him sit / "Rook wants to send a message" (danger flag on Corey) |
| I3 | Ep3 | $2,000 (a stretch: making back the loss) | Easy's summons at Mama B's back room (scene: Easy, Lonnie, Tee); double shift with Pigeon promoted to runner; the van event (if burned); Sunday's hearse rolls by (panic shutdown); Rook missing if arrested; **if the wall-off stop didn't happen:** two distant gunshots from Harlow at 01:10 (Rook went after Sunday's hearse; nobody hit) and a 40-s shutdown | **Who takes the loss?** Tee / Corey / Pigeon (`lossOn`) |
| I4 | Ep4 | $1,700 | Burner handout at the basketball court; Tee spots Dana's car (dramatic irony); Lonnie's message about the count | **Canary trap?** Feed Corey a fake re-up time (yes/no). If yes and Corey is a CI → Corey exposed in Ep5 (a rescue objective in Path A/B) |
| I5 | Ep5 | none | Path A: Central Booking, Easy's lawyer visits. Path B: dawn on the corner | A: take the weight / talk. B: run / stay |

### 7.5 Barks
Short speech bubbles (`E.font` on a small box over the head, 2.5 s) with Animalese voice, from a data table per role and state:
- tout: "Overtime! Got that Overtime!", "Orange tops, orange tops!"
- lookout warning: "Five-oh!", "Hoppers up!", two-tone whistle
- customers: "Y'all open?", "Lemme get two."
- civilians: small talk, Orioles, the heat, the bus being late

Intel barks (eavesdrop) carry facts: "Re-up at four, the old gas station." / "Pigeon, get your little ass back on that roof."

---

## 8. Story mode: The Case

### 8.1 Setting
- **Place and time:** **Penn Row**, a fictional neighborhood in West Baltimore, **October 2004**. Pagers, payphones and the first throwaway cell phones. Use the real city, invent the streets and places:
  - **Ridley Avenue** (the main drag), **Gaither Street** (the corner at Gaither & Ridley), **Dunmore**, **Abbott** and **Harlow** Streets.
  - Shops: **Gaither Market** (corner store), **Suds City** (laundromat), **Ridley Wireless & Pager** (sells the burners), **Mama B's Soul Food** (Easy's front), **Ridley Check Cashing**, **Fades & Grades** (barbershop), **Abbott Liquors**, **Ridley Carryout**.
  - Also: **Greater Hope Baptist Church**, **the Delancey Courts** (low-rise projects), **Arundel Gas** (closed station), **the garage behind the Courts**.
- **The crew's product:** **Overtime** (orange-top vials). A rival brand, **Hurricane**, is only talked about.
- **The detail:** officially "Special Detail 9", which everyone calls *the detail*. Its office is **the Annex**, above the city impound lot.
- **Real things stay generic:** "Central Booking", "the courthouse", "the Western District". All phone numbers use the fictional `555-01xx` block.

### 8.2 Cast (all original; App. I has voices, §12.4 has colors)
| id | Name | Who | Look (Humanoid options) |
|---|---|---|---|
| dana | **Det. Dana Whitlock**, 34 | Player. Western District narcotics, grew up three blocks off Ridley; her mother Gloria still lives there. Patient, watchful, dry; takes it personally | heroic 1.25, hair short, coat (brown leather), cream sweater, jeans |
| lou | **Det. Louis "Lou" Szabo**, 52 | Partner. Exiled from Homicide for embarrassing a deputy commissioner. Smokes, Orioles, his father's sayings; very good in the box | heroic 1.25, bald, tan trench, hunch .15 |
| hal | **Det. Harold "Hal" Pettiford**, 61 | Thirteen years in the pawn unit, Army Signal Corps. Fixes tube radios at his desk; runs the wire room with infinite patience | heroic 1.2, gray hair, brown cardigan, hunch .2 |
| ren | **Officer Renata "Ren" Ocasio**, 26 | On loan from Southwest patrol. Digital camera, laptop, drives the van; talks fast | heroic 1.15, ponytail, navy hoodie |
| navarre | **Lt. Gilbert "Gil" Navarre**, 45 | Runs the detail. Careful careerist with a conscience; an old rumor follows him | heroic 1.25, shirt and burgundy tie |
| pruitt | **Maj. Leland Pruitt**, 55 | District commander. Lives for the stat sheet | bulky 1.3, navy uniform coat, gold trim, cap |
| ostrowski | **Deputy Commissioner Raymond Ostrowski** | The politics (speakerphone, press conference) | bulky 1.3, dark suit |
| vance | **ASA Corinne Vance**, 38 | Prosecutor who shepherds the affidavit; sharp, impatient | heroic 1.2, long hair pulled back, charcoal suit |
| halloway | **Judge Abner Halloway**, 68 | Signs or refuses the wire. Crosswords, bow tie, reads every log | heroic 1.2, white hair, black robe, hunch .25 |
| easy | **Darnell "Easy" Booker**, 39 | The boss. Never on the corner, never on a phone. Owns Mama B's and the check-cashing store. Soft-spoken, frightening | heroic 1.3, black leather coat |
| lonnie | **Lonnie Fitch**, 45 | Easy's driver and voice on the phone | bulky 1.25, gray cap |
| tee | **Terrence "Tee" Mabry**, 24 | Lieutenant; the second playable character. Reads business books; the counter-surveillance brain | heroic 1.25, black fitted cap, white tee, jeans, **wheat Timberlands** |
| rook | **Ricky "Rook" Batts**, 27 | Muscle; volatile | bulky 1.35, black do-rag, black hoodie, **black Air Force 1s, red swoosh** |
| corey | **Corey "Stash" Lyle**, 19 | Stash keeper; nervous, stammers; flip candidate | heroic 1.15, gray hood up, **duct-taped Nikes**, hunch .25 |
| pigeon | **Junior "Pigeon" Hollis**, 14 | Roof lookout; keeps pigeons on his grandmother's roof; comics. The heart of the story | heroic 1.0, red hoodie, **light-up sneakers** (blink while he runs) |
| moe | **Maurice "Lil Moe" Dorsey**, 13 | Bike lookout | heroic 1.0, green cap, yellow tee, bike |
| dink | **Darius "Dink" Pratt**, 16 | Money man | heroic 1.1, blue jersey |
| tavon | **Tavon Gibbs**, 17 | Runner/tout | heroic 1.15, black puffy coat, red band |
| pockets | **Wesley "Pockets" Gaines**, 47 | Informant and addict. Sells loosies and batteries from a baby stroller. Never looks at faces, knows everyone by their **shoes** | heroic 1.15, army jacket, old red cap, hunch .3, stroller shape |
| odessa | **Miss Odessa Tillman**, 70 | Pigeon's grandmother, church usher, sits on her stoop; calls Dana "Dana Lynn" | heroic 1.1, gray hair, plum housedress, hunch .2 |
| sunday | **Royal "Sunday" Odom**, 52 | Stick-up man with a code: never on Sunday, never a citizen, never a child. Drives an old **hearse** | heroic 1.25, flat cap, fishing vest |
| dale | **Dale Kucharski**, 50s | Courier; drives the **Harstad Auto Parts** box truck | bulky 1.25, red company cap, work shirt |
| harstad | **Glenn Harstad**, 57 | The connect (Dundalk). Montage teaser only | heroic 1.25, navy blazer |
| felton | **Cornelius Felton**, 66 | Retired MTA bus driver who called in the corner. Murdered in the cold open (seen only under a sheet; a photo on his stoop memorial) | |
| others | Officers Dukes and Kowalczyk (patrol), knockers, civilians, "Dutch" (a customer), Gloria Whitlock (phone only), State Senator Marian Ocheltree (montage) | | |

### 8.3 Episode 1: EYES ON (~15 min)
Epigraph: *"Everybody on that corner is working. Question is, who's signing the checks."* (Lou Szabo)

| # | Beat | Where | What happens / mechanics | Exit, flags |
|---|---|---|---|---|
| 1.1 | **Cold open** | field, 05:40, rain | Police tape at 1407 Gaither, two patrol cars with light bars (red/blue lights), Felton under a sheet on his stoop, candles and flowers. Dana walks in (move tutorial). Talk to Officer Dukes, then Lou (Homicide primary), then Miss Odessa across the street. She won't talk ("I got a grandbaby to raise."), and the camera drifts up to Pigeon on her roof with his birds, watching. Optional: read the cards on the stoop | Lou: "This ain't a whodunit, Dana. It's a who-cares." |
| 1.2 | Card | | WIRETAP logo sting, then "Episode 1: Eyes On" and the epigraph | |
| 1.3 | **Briefing** | Annex | Navarre assembles the detail (introductions in App. G). The Sun ran Felton's photo; the Deputy Commissioner wants "six weeks, one corner, arrests". Brass gauge appears. Stations: Board (empty: tutorial arrow), Evidence cage (take the camera: 30 shots; Fund $200), Coffee (Lou). Ops choice 1 | Car scene |
| 1.4 | **Eyes on** | field, 15:00-17:30, overcast | **Required:** ★Face photos of Tee, Rook, Corey and Pigeon; read 2 roles; meet Pockets in the alley behind Gaither Market (pay $20, show photos, match shoes to names: App. G). **Optional:** an ★Act photo of a sale; Tee's call at P1 (16:10, then every 12 game minutes). Pockets also drops "Dre broke his ankle jumping the fence at the old Arundel station". It's needed in Ep3 and logged in the notebook. Tutorials as each first happens: Watch, Photo, Blend, Cover, Heat, Made, Eavesdrop | Back to the Chevy |
| 1.5 | **Board** | Annex | Board tutorial: pin faces, assign roles, tie Tee to P1 if photographed. Pruitt calls Navarre (speaker): "I've got a dead taxpayer on page one and a detail with no arrests." | Autosave |
| 1.6 | **Interlude I1** | field, night, as Tee | §7.4 | flags |

### 8.4 Episode 2: PAPER (~15 min)
Epigraph: *"A judge doesn't care what you know. He cares what you can write down."* (ASA Corinne Vance)

| # | Beat | Where | What happens / mechanics | Exit, flags |
|---|---|---|---|---|
| 2.1 | Card | | | |
| 2.2 | Briefing | Annex | Vance explains what a wire needs (numbers, probable cause, necessity). Hal: "They don't carry cell phones. Payphones and pagers." Ops choice 2 | Car scene |
| 2.3 | **Payphones** | field, 11:00-13:00, day | Read the number plates on P1, P2 and P3 (interact; reading in a watcher's view counts as loitering). ★Act payphone photos (Tee at P1, Tavon at P2 on schedules). Then Navarre on the radio: the knockers are rolling on the corner to grab the stash kid with the pager. **Corey bolts → CHASE** (tutorial: sprint, vault, tackle, cuff), ditch and search | Corey in custody (+ package if found) |
| 2.4 | **The box** | box | Corey (App. E): B1 who he works for (Tee), B2 the code hint ("you turn it"), B3 the stash (1412 vacant, behind the radiator). Flip offer | `coreyCI`, facts |
| 2.5 | **Cipher** | Evidence cage | Decode Corey's pager memory (5 pages, App. C). Matches P1/P2/P3; 555-0174 stays unknown (later Harstad) | evidence |
| 2.6 | **Affidavit** | Annex | Lines for P1, P2 and the pager clone (+P3 if supported). Necessity honesty | |
| 2.7 | **Chambers** | chambers | Halloway, 3 questions (App. F). Signed: "You're up. Thirty days. Minimize, Detective. I read the logs." Denied: an extra field beat (one more ★Act payphone photo), then resubmit | `wireUp` |
| 2.8 | **Interlude I2** | Tee | Includes the payphone choice that shapes Ep3 | flags |

### 8.5 Episode 3: UP (~18 min)
Epigraph: *"You don't listen to a phone. You listen to a man getting comfortable."* (Hal Pettiford)

| # | Beat | Where | What happens / mechanics | Exit, flags |
|---|---|---|---|---|
| 3.1 | Card | | | |
| 3.2 | **We're up** | Annex | Hal's wire tutorial (minimize, spot-check, log, ID, pages, fast-forward) | |
| 3.3 | **Session 1** | wire, 16:00-23:00 | Calls S1-1…S1-10 (App. D). The re-up riddle: "the place where Dre messed up his ankle" → pick the place on the notebook map (Arundel Gas). If Pockets' line was missed, Hal suggests finding Pockets (a 1-minute field beat at the bus stop) | `reupSpot` |
| 3.4 | **The van** | field, 15:30-16:30, next day | Ren drives. Choose a spot (V1 Harlow curb, V2 Ridley east, V3 lot gap); van heat (§5.2); long lens (48 shots, range 360, pans 14 tiles: every spot reaches the pumps). Photograph the **Harstad box truck** (logo + plate), **Dale** (★Act re-up handoff with Tavon) and Pigeon circling on a bike. Then **Sunday's hearse**: he robs Tavon of the package at gunpoint, quick, no shots (act `robbery`, photographable). **Dilemma:** *Stay on the eye* (Sunday on the Board; violence follows) / *Call it in anonymously* (patrol rolls up, Sunday escapes, Heat +20) / *Go in yourself* (stand-off dialogue; Sunday leaves the package: "I don't do police, Detective. Police do me." Van burned, Heat +30, Brass +10) | `dilemma` |
| 3.5 | **The Major** | Annex | Pruitt in person. **Ops choice 3:** *Give him bodies* (sweep: Brass +25, Heat +20, P1 line goes dead) vs *Hold the line* (Brass −20). Board: THE PACKAGE tier (plate → Harstad Auto Parts; 555-0174 matches) | `sweep` |
| 3.6 | **Session 2** | wire, 20:00-01:00 | Calls S2-1…S2-8. Rook asks for "a hammer" → **threat to life:** *Let it ride* vs *Wall-off stop* (a patrol car stops Rook's Monte Carlo for a broken taillight, finds the gun, arrests him: Brass +15, Heat +5; Rook in the box, 3 lines: "Lawyer."). Lonnie: "He wants to see you. Mama B's." → THE MONEY tier gets "Boss ?" and Mama B's. **Code flip** (known-plaintext page) | `wallOff`, `rookFree` |
| 3.7 | **Interlude I3** | Tee | Easy's scene at Mama B's; who takes the loss | `lossOn` |

### 8.6 Episode 4: DRY CLEANING (~15 min)
Epigraph: *"Smart ain't never being seen. Smart is being boring when they look."* (Terrence Mabry)

| # | Beat | Where | What happens / mechanics | Exit, flags |
|---|---|---|---|---|
| 4.1 | Card | | | |
| 4.2 | Quiet lines | Annex | The payphones went dead: "Throwaways." Hal explains burners: bought for cash, used a week, thrown in the harbor. Plan: tail Tee to the handout, get the packaging, subpoena the carrier. Ops choice 4. Gloria calls: "Somebody was asking about you at the market." If Rook went after Sunday in I3, Lou: "Somebody shot up a hearse on Harlow last night. Nobody hit. The church lost a window." | Car scene |
| 4.3 | **The tail** | field, 20:00, rain | Tee's dry-cleaning route (App. J `teeDry`) with Lou hand-offs (§5.5). Ends at the basketball court: Tee hands phones to the crew (read = observation `burners`) | checkpoint |
| 4.4 | **Trash** | field, 21:30, rain | The alley behind Ridley Wireless (§5.7): find the bag with 12 phone boxes | `serials` |
| 4.5 | Numbers | Annex | The subpoena returns B1-B5. Halloway amends by phone ("Same rules, Detective."). Pin burners to people | |
| 4.6 | **Session 3** | wire, 6 calls (App. D) | The count is Thursdays at Mama B's after close; Friday's truck goes to "the garage behind the Courts". Tee mentions Dana's mother → choice: *call your mother* (`momSafe`: she goes to her sister's in the county) / *stay on the wire* | |
| 4.7 | **Kitchen** | Odessa's kitchen (box scene variant, warm light) | Pigeon at the table, Odessa at the stove (§6.4 kitchen). The "I heard your call" option exists only if Dana listened past S3-4's window | `pigeonTrust` |
| 4.8 | **Interlude I4** | Tee | The canary trap | `canary` |

### 8.7 Episode 5: THE COUNT (~15-20 min)
Epigraph: *"Every week the money gets counted. Every week somebody comes up short."* (Darnell "Easy" Booker)

| # | Beat | Where | What happens / mechanics |
|---|---|---|---|
| 5.1 | Card | | |
| 5.2 | **Two ways** | Annex | Pruitt, with Ostrowski on speakerphone: "Friday. Dope on the table, cameras rolling." Navarre lays out both paths. **Ops choice 5:** **A, Dope on the table** (raid the garage, Friday 21:00) or **B, Follow the money** (Thursday's count at Mama B's). B needs Brass ≥ 30 and either (`coreyCI` and Corey not exposed) or `pigeonTrust` ≥ 70; otherwise its card says why it's locked |
| 5.3A | **Raid** | field, Friday 21:00 | §5.8. If the canary trap exposed Corey, first a **60-second rescue:** Rook holds Corey in the 1412 vacant (sprint there; Rook flees from police; there's no fight). Late means Corey disappears |
| 5.4A | **Press conference** | outside the garage | A table with dope, guns and cash. Pruitt and Ostrowski at the mic, camera flashes, the detail at the back. Ostrowski: "a major blow to the drug trade in West Baltimore." Lou: "Major blow. They'll be open by Monday." |
| 5.3B | **The count** | field, Thursday 22:30 | Tail the count runner (Pigeon if he trusts Dana and tells her the route: easier; otherwise Tavon) to Mama B's back door. Lonnie's car circles (a moving headlight cone = an observer). Then the vacant roof and the long lens (§5.7): ★★★ Easy in the act |
| 5.4B | **The morning after** | Annex | Navarre: the detail is disbanded anyway ("The Deputy wanted a podium, not a case file."). Vance takes the file to a grand jury: "Eighteen months, Detective. If you're lucky." |
| 5.5 | **Interlude I5** | Tee | A: Central Booking; Easy's lawyer: "Easy says your mother's rent is paid through spring." Take the weight / talk. B: dawn on the corner. Run / stay |
| 5.6 | **Montage → credits** | | §8.8. Then the credits roll (names, plus "Inspired by The Wire (2002-2008)") → title. All episodes unlock in Episode select |

**Shut Down** at any point (Brass 0) → the `shutdown` scene: Navarre packing boxes: "Detail 9 is disbanded, effective Monday." Choose *Retry from the last autosave* or *See how it ends* (the Shut Down montage).

### 8.8 Endings and montage
- **Three paths:** A (raid), B (money) or Shut Down. Each montage is 14 cards (one per row group in App. G's table, in that order), each picked by rules over the flags.
- **Fixed cards** (the game goes on):
  - "The corner at Gaither & Ridley: open for business by Monday."
  - "Maj. Leland Pruitt: promoted to Colonel."
  - "Hal Pettiford: kept the wire room. Nobody told him to leave."
- **Variable cards:**
  - Tee: by I5 choice and Case band
  - Easy: by path
  - Pigeon (4 fates): by `lossOn`, `pigeonTrust`, Path B runner and `rookFree`
  - Corey (4 fates): `coreyCI`, `canary`, rescue
  - Rook: `wallOff`, `rookDrew`
  - Sunday: `dilemma`
  - Dana: by path
  - Lou, Ren, Navarre
- **The teaser** always runs last: "Glenn Harstad: guest of honor at State Senator Marian Ocheltree's harbor fundraiser." Then **TO BE CONTINUED**.
- **How a card is shown:** a live vignette (camera on a POI, characters posed, letterboxed 2.35:1), caption at the bottom, 6 s each, crossfade, the `montage` song (App. H).

### 8.9 Episode select and saves
- **Saves:** `game.saves` slots (3 + autosave). `saves.write = () => ({ data: STATE, place: 'Ep 2 · Paper', level: 'Episode 2' })`, `saves.read = s => restoreState(s.data)`. Autosave at every beat start. Manual Save/Load sits in the pause menu (`menu.saves: true`), and `saves.canSave` is true only in the Annex: your desk is the save point, so a save never lands mid-mission.
- **Title menu:** CONTINUE (latest), NEW CASE, EPISODES (unlocked), THE GAME, SETTINGS, ABOUT & CREDITS.
- **Episode select** starts an episode from a **canonical state** (STATE presets in data):
  - Ep2: 4 faces with names; Heat 20, Brass 50.
  - Ep3: wire up on P1, P2 and the pager clone; `coreyCI` false; Heat 25, Brass 60.
  - Ep4: dilemma "stay", sweep false, `wallOff` true; Heat 45, Brass 55.
  - Ep5: burners known, `pigeonTrust` 75; Heat 40, Brass 45.
- **Restarting:** the pause menu offers *Restart this part* (the beat's autosave) and *Episode select*.

---

## 9. Versus mode and online play: THE GAME (50-versus.js, 51-net.js)

### 9.1 The round
- **Sides:** *The Corner* (crew) vs *The Detail* (police) on the **versus zone** of the same map (cells 10-55 × 15-45: Ridley between Abbott and Harlow, Gaither from Dunmore to the strip, the two alleys, the strip, the Courts lane). Barricades and police tape block the zone's edge (blocked floor cells, sawhorse shapes). AI civilians walk through; detectives look like civilians.
- **Length:** 5:00 (local setup: 3, 5 or 8 min).
- **Outcome:**
  - **Detail win:** Evidence reaches **100** (immediate).
  - **Corner win:** at time-up, Count ≥ the **quota: $1,200** for 5:00 ($240 per minute of round length) and Evidence < 100.
  - **Draw:** neither ("The game goes on").
- **Seats:** side of seat *i* = `(i + round) % 2 === 0 ? 'corner' : 'detail'`, so players alternate sides between rounds. **Exception:** a single human always plays Detail (vs a bot Corner). With 3: two on one side.
  - Corner players take the **Lieutenant** first, then the **Runner**. Detail players are **Detectives** (up to 2).
  - Bots fill every empty crew role (always) and empty detective slots (to at least 1 detective).

| Corner actions | Detail actions |
|---|---|
| **Lieutenant:** watch people (L2/RMB); **call out** a person (△/Q while watching). A detective → **burned** 25 s (their photos score 0, they're outlined red for the Corner, and AI lookouts track them). A civilian → −$200 and customers avoid the corner for 10 s; cooldown 15 s. **Shut it down / open up** (□/F). Move the stash (✕ at the stash, pick a spot). **Re-up** at a payphone (✕, 2 s) when the stash < 20 → a car drops the package in 20 s, which the Runner must fetch | **Photos** (L2 + R2 / RMB + LMB): first ★Face of each crew member +4; ★Act +12 (max 2 per crew member). Photo of the **stash** in use +25 (+15 again after it moves). **Tap a payphone** (✕, 4 s, unseen) → each Corner re-up call from it +10. **Jump-out** (△/Q while watching, once per round): patrol frisks the target 8 s later. Carrying → seizure +20 and the Corner loses what was carried; clean → −10 |
| **Runner:** pick up product at the stash (✕), hand off to a waiting customer (✕), ditch (○) if a cop closes in (lost product) | **Blend** (□/F) and cover activities work as in story. AI lookouts build suspicion on detectives (§5.2); full = auto-burn |

- **Bots:**
  - **Corner bot:** the CornerSim role brains, plus a lieutenant brain. It shuts down when any lookout reaches `search`. It calls out the person with the highest *observed* suspicion score once that passes 0.8 (from behaviors it can see: lingering, camera raises, following the runner). It re-ups at the payphone it hasn't seen tampered with. It moves the stash after a stash photo it noticed.
  - **Detective bot:** picks vantage points (data list of 12), photographs the next sale it sees, moves when its heat passes 0.5, sometimes tails the runner, and taps a payphone when no crew is within 120 units.
  - Bots may cheat a little on perception (they read exact act windows). They're for filling seats, not balance.
- **Personal score:** Detail = the evidence they earned. Corner = the count they handled ÷ 10 + correct call-outs × 20.
- **Results screen:** outcome, then per player: photos, burns, call-outs, count. Awards (*Eyes On*: most ★Act; *Made You*: first correct call-out; *Clean Hands*: Corner player never seized; *Paper Trail*: most tap points).

### 9.2 Local play ("on its own")
- **Setup screen** (DOM): P1 side, *P2: press ✕ on a second controller or Enter on the keyboard's right half* (`game.allowJoin({ max: 2 })`), round length, Start.
- **1 human:** vs bots.
- **2 humans:** split screen with `game.splitScreen(2, { follow: [c1, c2], layout: 'auto' })`. Each viewport draws its own HUD on the canvas inside `r.viewport` (E.Shell's HUD is single-screen, so versus uses a canvas HUD). Then `scene.hud(r)` draws the timer and the shared Count/Evidence bar at the top.
- **Caveat:** hidden identity can be peeked at on one screen. Accept it locally; online it's truly hidden.
- **Same code path:** local play runs the same `VersusSim` through `LocalTransport` (this copy is the host; all players are local).

### 9.3 AI Hub: shared-world (AI Hub Session Protocol v1, client 1.4.0)
**Tags** (in `<head>`, after the client script):
```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Cops: build a 100-point case. Corner: make $1,200 unseen.">
<meta name="hub:session-howto" content="Move: stick/WASD · Watch: L2/RMB · Photo: R2/LMB · Act: ✕/E · Call out: △/Q">
```
**Flow** (99-start.js):
```js
if (window.AIHub && AIHub.active) (async () => {         // async wrapper: the game's IIFE itself is not async
  game.start({ scenes, scene: 'hubWait', boot });        // 'Connecting…' (no prompts): straight into the round, no title/attract/menus
  AIHub.on('start', () => Versus.countdown());           // overlay: role card + 3-2-1 until AIHub.time() >= 0
  const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4] });   // the hub's own card (no card: true)
  if (!info) { game.go('title'); return; }               // no hub after all: the normal game
  await Versus.buildRound(info);                         // roster from AIHub.rng('roster'); sides from seats + info.round
  AIHub.ready();                                         // once, with no key press
})().catch(e => { game.fail('hub', e); AIHub.fail(String((e && e.message) || e)); });
else game.start({ scenes, scene: 'title', boot });
```
- **Host authority** (`info.isHost`): the host copy runs `VersusSim`: NPCs, crew AI, bots, rules, scoring, the timer (from `AIHub.time()`).
- **Every copy moves its own character locally** (no input lag) and reports it. The host trusts positions inside a speed check.
- **Other copies render snapshots** with 150 ms interpolation.
- **Messages:**
  - Host → all, unreliable, 10 Hz: `{t:'s', at, tl, ev, cn, ph, p:[[id,x,y,f,st,fl],…], n:[[nid,x,y,f,st],…]}`.
    - x, y are integers (world units); f is facing quantized 0-63; st is an animation code (0 idle, 1 walk, 2 run, 3 crouch, 4 watch, 5 act, 6 down, 7 sit, 8 phone, 9 bike); fl is flags (burned, carrying, shut).
    - **Keep each message under 1,100 bytes.** If the NPC list makes it bigger, send NPCs in two alternating halves (5 Hz each).
  - Host → all, reliable, on events: `{t:'e', k:'photo'|'burn'|'callout'|'tap'|'jump'|'seize'|'stash'|'reup'|'shut'|'open'|'sale', …}` (sounds, toasts, particles).
  - Client → host, unreliable, 10 Hz: `{t:'me', at, x, y, f, st, w, ax, ay}` (w = watching; ax, ay = the aimed world point).
  - Client → host, reliable: `{t:'act', k:'photo', target, q, at}` · `{k:'callout', target}` · `{k:'tap', phone}` · `{k:'jump', target}` · `{k:'shut'|'open'|'stash'|'reup'|'pickup'|'handoff'|'ditch', …}`.
  - Budget: host 10 snapshots + under 5 events per second (< 20/s); clients 10 + a few.
- **Validation on the host:**
  - Positions are clamped to `maxSpeed × elapsed × 1.5` and to walkable cells.
  - A photo claim needs: the target exists, is within 240 units of the claimer, and `map.sight` is clear on the host. If ★Act is claimed, the host's 1-second act history must show an act within 600 ms.
  - Call-outs are checked against the true identity.
- **Events:**
  - `leave` → that player's character becomes a bot on the same side; the round goes on.
  - The host leaving voids the round (the hub sends `end` `host-left`) → show "Round cancelled".
  - `time-up` → the host finishes at once with the timer-end outcome.
  - `end` → stop input (controllers to null), stop music and effects, show our results under the hub's. After `end`, send nothing.
- **Server** (`AIHub.server`): the host has no local player. It runs the sim and shows a spectator camera (`cam.frame` over all players). No audio, no input.
- **Finish** (host only, once):
  - `standings`: winners `[[winning side ids],[losing side ids]]`; draw `[[all ids]]`. Use only ids from `AIHub.players` that haven't left (left players may be omitted: the hub places them last). Never bots, never the server's own id.
  - `won`: when only one side has humans (one player vs bots, or every human on one side), pass `won: true` or `false` for that side. Standings alone can't say it.
  - `scores`: `{ id: personalScore }`.
  - `stats`: `{ id: { Photos, Burns, 'Call-outs', Count } }` (numbers or short strings).
  - `awards`: `[{ id, title, detail }]`, e.g. `{ id: 2, title: 'Eyes On', detail: '4 hand-to-hand photos' }`.
- **Session rules:**
  - **Round length:** `min(300 s, info.limitMs − 5 s)`, so the host always finishes before the hub's hard limit (the harness sets it with `&limit=`).
  - **Hidden host tab:** the engine's animation loop stops in a hidden tab. While `document.hidden` on the host, step the sim from a `setInterval` that calls `game.advance(elapsed)` (real elapsed time, capped at 1 s per call; browsers may throttle it to 1 Hz) and keep sending snapshots, so the other players don't freeze. Check that `advance` behaves while the loop is suspended. The hub voids the round after 20 s hidden anyway.
  - **Names** from the hub are text: render them with `textContent` or canvas text (`E.font`), never as HTML.
  - No other network use.
  - No `alert`/`confirm`/`prompt`, no new windows.
  - Pause doesn't stop the host: the versus scene is `pausable: false` in a session. Options opens a non-pausing overlay with Settings/Controls (`game.menu('settings')`) while the character's input is suppressed.
  - `menu.quit: false` and no restart items.
  - While Create (Pad8) is held, ignore Options.
- **Randomness:** the host never uses `Math.random` for the sim. Shared rolls come from `AIHub.rng(label)`, and the roster from `AIHub.rng('roster')`, so every copy builds identical NPC rigs.

---

## 10. Attract mode (52-attract.js)
- **Trigger:** 10 s with no input (keys, mouse buttons, mouse moves over 6 px, wheel, touches, gamepad buttons, or axes past 0.3) on **title, main menu, episode select or versus setup**. Settings, About and Controls don't count (a player may be reading).
- **Exit:** any input → back to the title, and the idle timer resets. On touch-only devices, a tap → the notice panel.
- **The reel:** a looping playlist of vignettes, each a real system running with bot controllers. Bots may cheat: no suspicion, unlimited film, teleports, scripted perfect actions.
  - **Overlay:** letterbox bars, a **DEMO** badge, a small WIRETAP logo, a caption, and a blinking "Press any button" built from the current device's glyph.

| # | s | Vignette | Bot does |
|---|---|---|---|
| 1 | 12 | **THE CORNER**: night, rain, CornerSim full; the camera turns 90° twice | Nothing: customers, touts, lookouts |
| 2 | 10 | **EYES ON**: Dana on the bus-stop bench | Enter Watch, aim at the next sale, snap ★★★, polaroid slides in |
| 3 | 10 | **THE TAIL**: Tee's route | Dana tails; Tee looks back; Dana takes cover in a doorway; hand-off to Lou |
| 4 | 9 | **THE CHASE**: Corey bolts | Sprint, vault the court fence, tackle, cuff |
| 5 | 10 | **THE WIRE**: wire room | Grandma call → MINIMIZE; pertinent call → LOG; a page decodes with a keypad turn |
| 6 | 7 | **THE BOARD**: corkboard | Cards fly onto slots; red string ties Tee to P1 |
| 7 | 8 | **THE BOX**: Corey | Lean → Offer a way out → beat unlocked |
| 8 | 10 | **THE GAME**: versus, split screen, bots | A call-out burns a detective; a stash photo |
| 9 | 8 | **THE COUNT**: Tee's tally | Bills flick, the total ticks up, then the title card |

- **Implementation:** each entry is `{ id, seconds, setup(), tick(dt), caption }`. `setup()` loads a mission/scene with `attract: true`: no saves, no tutorials, no autosave, quieter music, no HUD prompts. The attract scene owns the clock and calls `game.go` for the next entry with a short dissolve.

---

## 11. Audio (03-audio.js): all written in code

### 11.1 Music (engine `game.audio.music`, scores in App. H)
| Song | Plays | Layers (start `on: false`, faded with `audio.layer(name, vol, fade)`) |
|---|---|---|
| `theme` (84 bpm, A minor) | title, menus, about, credits, episode cards (as a `sting` of its last 2 bars) | — |
| `field` (92 bpm, D minor) | field missions as Dana | `tension` while any observer is at `notice`+ toward Dana; `pulse` at `search`; `alarm`+`stab` for 8 s after MADE |
| `corner` (95 bpm, G minor) | interludes as Tee; diegetic: also from a parked car's open door during Ep1-2 nights (volume by distance) | `lead` while the count is ahead of target pace |
| `wire` (70 bpm, E minor) | wire room, evidence cage | `pulse` while a pertinent call is live |
| `chase` (132 bpm) | foot chase, raid reactions, the 60-s rescue | — |
| `montage` (68 bpm) | epilogue montage, Shut Down | — |
| `versus` (104 bpm, C minor) | versus rounds | `pressure` at Evidence ≥ 50; `clock` in the last 60 s; `cash` once Count reaches 2/3 of the quota |

- **Stings** (`audio.sting`, `{ at: 'beat' }`):
  - `made`: square A4 F4 D4, 0.12 s each
  - `photoGood`: triangle E5 then B5
  - `casePoint`: triangle C5 E5 G5 arp
  - `beatDone`: the theme's last bar
- **Ducking:** call `audio.duck(true)` while dialogue voices play.
- **Field realism:** music volume in field missions is 0.6× the setting, so the ambience carries the street.

### 11.2 Sound effects (`audio.define(name, voice)`; engine voice format)
| Name | Recipe |
|---|---|
| `shutter` | `[{wave:'noise',freq:3000,dur:.03,vol:.25},{wave:'square',freq:1800,to:900,dur:.05,vol:.08}]`, then `whirr` `{wave:'saw',freq:220,to:320,dur:.18,vol:.04}` after 40 ms |
| `pager` | three `{wave:'square',freq:'A6',dur:.07,vol:.1}` 110 ms apart, preceded by `{wave:'square',freq:'E6',dur:.07}` |
| `dtmf_<d>` | two sines at the DTMF row/column pair (697/770/852/941 × 1209/1336/1477 Hz), 0.12 s, vol .08 |
| `dialtone` / `ringback` | 350+440 Hz sines (loop); 440+480 Hz, 2 s on / 4 s off |
| `phonering` | `{wave:'square',freq:1250,vib:[22,.06],dur:.9,vol:.06}` twice |
| `reel` | noise 0.02 s click (tape start/stop); the `tape` bed is low noise while recording |
| `siren` | sine 650→1300→650 over 3.6 s (wail, loop); `yelp`: 700↔1500 at 8 Hz for 1.2 s |
| `radio` | noise burst 0.08 + squelch click (radio chatter in/out) |
| `cuffs` | `{wave:'square',freq:2400,to:1800,dur:.03,vol:.12}` ×2, 60 ms apart |
| `fence` | noise 0.22 s with vibrato (chain-link rattle on a vault) |
| `doorRam` | `boom` preset at pitch 0.7, plus `game.shake(4)` |
| `gunshot` | noise 0.18 s vol .45 + `boom` tail + an echo at −10 dB after 130 ms. Used in exactly one moment: two distant shots during I3 if the wall-off stop didn't happen (Rook goes after Sunday) |
| `bark` (dog) | `{wave:'saw',freq:320,to:180,dur:.12,vol:.12}` ×2 |
| `coo` / `flap` | sine 420→380 with vibrato 0.35 s; noise bursts for wings (Pigeon's roof) |
| `busbrake` | noise hiss 0.9 s + sine squeal 2200 Hz 0.3 s |
| `typekey` / `typebell` | noise 0.015 s at 4 kHz; `blip` at a line end (affidavit) |
| `stamp` | `land` preset + paper noise (judge signs) |
| `pin` / `string` | square 900→700, 0.03 s; soft noise 0.08 s |
| `cashflick` | noise 0.01 s, repeated for the count |
| `ui_tick` / `ui_ok` / `ui_back` | triangle 1400 Hz 0.02 s vol .05; engine `confirm`; engine `cancel` |
| `step_*` | engine `step` at pitch by floor tag: concrete 1.0, asphalt 0.9, alley 0.85 + grit, grass 0.7, wood (Annex) 1.1 |

### 11.3 Ambience beds and voices
- **Ambience** is built on `game.audio.ctx` from looping noise buffers and filters. Route it into the engine's sfx bus (`game.audio._sfxBus`, an internal field: check it exists, otherwise use your own gain scaled by `volume × sfxVolume × !muted`).
  - **Street day:** low-passed traffic rumble; a bus every 60-90 s.
  - **Street night:** traffic, plus far sirens and dog barks every 40-90 s.
  - **Rain:** band-passed noise, with thunder from engine weather.
  - **Annex:** HVAC hum, a phone ringing far off.
  - **Wire room:** tape hiss, radiator clank every 20 s, clock.
  - **Box:** 120 Hz fluorescent hum.
  - **Chambers:** clock tick.
- **Voices: Animalese/"Simlish" synth** (`Voice.speak(text, profile, { onChar, filter })`):
  - **Syllables:** split the text into syllables (consonant cluster + vowel); punctuation is a pause (`,` 120 ms, `.?!` 260 ms). Each syllable is a 60-80 ms grain at `profile.rate` syllables/s.
  - **Source:** an oscillator (`profile.wave`) at pitch `base × (1 + range × contour)`. The contour falls across a sentence, rises at the end of a `?`, and adds a per-syllable offset **seeded by the syllable's letters**, so the same word always sounds the same.
  - **Filters:** two parallel band-pass formant filters (F1/F2 per vowel: a 800/1200, e 400/2300, i 300/2700, o 450/800, u 325/700, all × `formant`, Q≈9), then an envelope (attack 5 ms, release to 0 by grain end).
  - **Consonants:** plosives (b d g k p t c q) are 12 ms noise bursts; fricatives (f s z h x j v) are 40 ms band-passed noise (2-6 kHz); nasals (m n) are a 60 ms low hum.
  - **Breath:** noise mixed in at `profile.breath`.
  - **Tics:** `stammer` (repeat the first syllable of 30% of words: Corey), `vibrato` (Odessa).
  - **Sync with text:**
    - `E.Dialog`: set `talk.voice = null`. Each update, play syllables for the letters added since `talk.shown` last frame. Pick the profile by `talk.name`. The text speed setting sets `talk.speed`.
    - The wire transcript is driven by `Voice.speak` itself (`onChar` reveals letters).
  - **Phone filter** (wire calls, payphone conversations): high-pass 300 Hz → low-pass 3400 Hz → a gentle `WaveShaper` → plus line hiss at −32 dB. **Radio filter** (police radio): band-pass 500-2500 Hz + squelch clicks at the start and end.
  - **Bleeped words** (Strong language: Bleeped) get a 1 kHz sine over their syllables.
  - **Voice volume** setting multiplies the voice bus.
  - **Headless:** no-op.

---

## 12. Art direction and world building (05-world.js, 06-people.js)

### 12.1 Mood by time of day (canvas lighting always; GPU lighting where available for night, `game.enableGPU({ map })`, with the same ambient set on both)
| Preset | Ambient / tint | Lights | Weather |
|---|---|---|---|
| `dawnRain` (cold open) | .45, blue-gray | patrol light bars (red/blue lights alternating at 2 Hz, radius 70), streetlamps fading | rain .7, wind .2 |
| `day` | lights off (full bright), slightly desaturated palette | none | none |
| `dusk` | .62, orange-violet | streetlamps flicker on at 17:40 | none |
| `night` | .38, cool blue | streetlamps every 6 cells (`r.prop('streetlamp', …, { light: true, cone: true })`, color `#ffb04a`); lit windows; store signs emissive; TV-blue flicker in 1 window per block | none or rain (Ep4) |

### 12.2 Wall types (App. A legend). Everything gets `cut: true` except low walls.
| Char | What | h | Face / roof | Facade options | Colors (top/side) |
|---|---|---|---|---|---|
| `#` | boundary rowhouses/warehouses | 56 | brick / slab | windows `{ lit: .15 }` | `#3a2a26` / `#5a3a30` |
| `R` | brick rowhouse | 40 | brick / slab | windows `{ lit: .25 }`, door `{ chance: .35, color: '#4a2a1e' }` | `#4a3a34` / `#7a3b2e` |
| `F` | Formstone rowhouse | 40 | material `formstone` = `'#8a8680 stones size=5'` / slab | windows `{ lit: .25 }`, door .35 | `#4a4844` / `#8a8680` |
| `P` | painted brick | 36 | plaster / slab | windows `{ lit: .3 }`, shutters `#3a5a6a` | `#5a5048` / `#b8a27a` or `#6a7f8f` (alternate by block) |
| `V` | vacant | 40 | brick (dark) / slab | `decorate`: plywood panels `#b08a5a` over window and door spans, spray-paint tags | `#3a2a24` / `#4a2e26` |
| `S L E M $ K B Q` | storefronts | 32 | brick or plaster / slab | `decorate`: a lit display-window band (z 4-18, warm `#ffd890` glow texels), a sign band (z 20-28); the sign text is an `r.queue` board (§12.5) | per store |
| `H` / `T` | church / bell tower | 64 / 88 | stone / slab | arch windows `{ chance: 1 }`, stained glass `window` props on the Ridley side | `#5a5650` / `#8a847a` |
| `C` | Delancey Courts | 44 | brick (tan `#9a7a5a`) / slab | windows grid `{ lit: .35 }`, doors .3, balcony walkway `{ z: 22 }` | `#5a4a3a` / `#9a7a5a` |
| `G` | garage | 24 | metal (corrugated `'#6a6a6a metal'`) / plain | roll-up door painted on the east face | `#4a4a4a` / `#6a6a6a` |
| `k` | gas kiosk | 20 | plaster white with red band (decorate) | | `#d8d8d0` / `#e8e8e0` |

### 12.3 Floors (legend values `{ floor: tag }`; `floorTex` per tag, or `floorMats`)
| Char | Tag | Look |
|---|---|---|
| `.` | `walk` | concrete slabs (1-cell grid lines `#8a8a86`/`#7a7a76`, cracks); stoops (shapes) along rowhouse fronts |
| `=` | `road` | asphalt `#2e2e32` with speckle; Ridley's dashed yellow center line; crosswalk stripes at intersections; manholes; puddles when raining (darker glossy patches with a GPU glow texel picking up lamp color) |
| `-` | `alley` | cracked asphalt `#3a3836`, weeds in cracks, litter sprites |
| `,` | `lot` | dirt + weeds (`E.tex.dirt` + grass props) |
| `:` | `court` | courtyard pavers |
| `b` | `ball` | court asphalt with painted lines |
| `p` | `play` | rubber play surface (faded red) |
| `v` | `vacant` | gutted floorboards, debris |
| `g` | `garage` | oil-stained concrete |
| `f` | `fence` | blocked floor cell; draw chain-link shapes on its edges (vaultable by a jump: §5.6) |
| `x` | `edge` | blocked; sawhorse barricades (map exits) |

### 12.4 People and palettes
- **Cast looks:** §8.2. Skin tones span a realistic range (`#3a2418 #4a2e20 #5a3a28 #6b4630 #8a5a3c #c8946a #e0b89a #f0c8a8`). Baltimore's West Side is mostly Black, so the cast and crowds reflect that, drawn with dignity. No caricature.
- **2004 clothes:** oversized white tees, throwback jerseys, puffy coats, hoodies, fitted caps, do-rags, Timberlands, Air Force 1s; church clothes on Odessa's friends; work uniforms; cops in windbreakers and khakis or blazers.
- **Civilians:** 6 palette families (warm, cool, earth, sport, church, work). Seeded per NPC.
- **Addicts:** thinner (`hunch .3`), mismatched layers. Shown as people, not monsters.

### 12.5 Shapes to write (E.SHAPES data, docs/ASSETS.md format; check each with `node engine/tools/asset-sheet.mjs mine.js#id`)
- **Vehicles** (also moving, drawn with `facing` each frame):
  - `sedan`, `chevy` (Dana's beige Lumina)
  - `van` (white Ford Econoline, county tags)
  - `hearse` (black, long)
  - `boxtruck` (white, red **HARSTAD AUTO PARTS** band: the text is a queued sign)
  - `patrol` (white/blue with a light-bar box; the lights themselves are game lights)
  - `montecarlo` (Rook's), `deadbuick` (flat tires), `burnedcar`
- **Street:**
  - `payphone` (pole, hood, handset)
  - `busshelter`; `bench` (core)
  - `trashbag`, `dumpster`; plus the engine props `trashcan`, `hydrant`, `firedrum`, `streetlamp`, `awning`, `sign`
  - `stoop` (3 marble steps), `pole` (utility pole with a crossbar)
  - `sawhorse`, `chainlink` (a 16-unit segment with posts and diamond mesh: a custom `E.PATTERNS.mesh`)
  - `hoop` (basketball, chain net), `swings`, `gaspump`, `stroller`, `bike`, `coop` (pigeon coop), `mattress`
- **Interiors:**
  - `corkboard` (draws live Board state: `r.queue`), `desk` + `officechair` (cut `kenney-furniture:desk-corner`, `chair-desk` with `node engine/tools/asset-set.mjs`, or write them)
  - `filecab`, `reel2reel` (reels drawn turning in `r.queue`), `crt`, `radiator`, `coffeemaker`, `watercooler`
  - `table`/`chair`/`bookcase` (core), `judgedesk`, `sheetbody` (a covered body for the cold open)
- **Signs** are `r.queue` boards: a dark panel plus `E.font.text`, lit by an emissive flag for neon ("OPEN", "CHECKS CASHED", "WINGS · FRIES · SUBS", "SUDS CITY", "RIDLEY WIRELESS & PAGER", "MAMA B'S SOUL FOOD", "FADES & GRADES"), plus a barber pole (stripes animated by time).

### 12.6 World details that sell it
- **Phone wires** (the motif): utility poles every 8 cells along alleys and the avenue. Between pole tops (z 70), draw 8-segment sagging catenaries with `px.line` in `r.queue` (sorted above roofs). **A pair of sneakers hangs on the wire over Gaither & Ridley.** Pigeons sit on the wire near Odessa's roof and scatter (flap) when someone runs below.
- **Fake roofs** for walk-in interiors (the garage): an `r.queue` polygon with `footprint` that fades to 15% when Dana is inside or within 24 units of a door. The 1412 vacant has no roof (burned): draw charred beams.
- **Vacants and decay:** plywood, a "V" spray mark, a mattress in the lot, the fire drum (flame prop, `light: true`) at night with two men warming their hands.
- **Life:** a bus pulls up at P3 every 90 s (a bus shape drives the Ridley lane and stops 4 s); kids shoot hoops in daytime; Odessa sweeps her stoop at dawn.
- **Felton's memorial** stays on his stoop through Ep5: candles, flowers, a photo. It gets smaller each episode.

### 12.7 Title screen
- **Scene:** the live iso diorama of the corner at night in rain (CornerSim with AI, no player), camera slowly turning (one 90° step every 20 s).
- **Logo:** "WIRETAP" in `E.font.title` (scale 4, colors `['#fff6dc','#ffcf7a','#e08a2a']`, depth 3, depthColor `#3a1a0a`). A telephone wire runs behind the logo with sneakers hanging from it. Tagline "Somebody's always listening."
- **Menu:** `E.Menu` (canvas; keys, d-pad, stick, hover, click). `E.versionLabel()` tiny at the bottom right.
- **Keep clear:** the top-right corner area.

### 12.8 UI look (ui.css and the E.Shell theme)
- **E.Shell theme:** `THEME = { ink: '#f2ead8', paper: '#141210', accent: '#ffb347', muted: '#9a9080', danger: '#ff5a4a', line: '#3a342c', font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', titleFont: '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif' }`
- **Case-file panels** (Board, notebook, affidavit, evidence): manila `#e9dcb5` with ink `#2b2418`; typewriter text in `"Courier New", Courier, ui-monospace, monospace`; headings condensed uppercase with letter-spacing .04em; red string `#b3261e`; pushpins as CSS circles; polaroids `#f4f1ea` with a soft shadow and ±2° tilt; corkboard `#a8794a` with a subtle noise background (CSS gradients, no images).
- **Wire-room panels:** near-black `#0b0f0c`, phosphor green text `#8fe388`, amber `#ffb347` for actions, a faint scanline overlay (CSS `repeating-linear-gradient`), tape counters in tabular numerals.
- **Focus and legends:** §4.5. Glyph chips: §4.3.

---

## 13. About/Credits screen and the exit interview
- **`credits.json` is the single source** of the About pages and of `exit-interview.json`. The build copies its `exitInterview` object verbatim into `../exit-interview.json` and verifies it parses.
- **About & Credits** (title menu → DOM screen; L1/R1 pages; large type; at most about 10 short lines per page; stick scrolls long answers):
  1. **Credits:**
     - WIRETAP; "An original game inspired by *The Wire* (HBO, 2002-2008). Not affiliated with HBO or the show's creators."
     - Design and code: the model(s) that built it (truthfully: if the builder isn't claude-opus-5-5 at max effort, list both, e.g. "Planned by Anthropic claude-opus-5-5 (max); built by <id>").
     - Engine: my-3D2dge v0.85.1 by Michael Crosato (MIT). Multiplayer: AI Hub Session Protocol v1, client 1.4.0.
     - Any CC0 asset entries used (Kenney/KayKit via the engine's store), each with its source line.
  2. **Source Information:** every field of TASK.md's list, same text as `exitInterview.sourceInformation`.
  3. **Testing Feedback:** the 4 questions with answers.
  4. **Engine Feedback:** the 6 questions with answers.
  5. **Prompt Feedback:** the 4 questions with answers.
- **Write "unknown" for anything you can't confirm.** Fill in real answers at the end of the build: no placeholders ship.
- **Exit interview shape** (exactly TASK.md's). Suggested values to start from; correct any that turn out untrue:
```json
{
  "sourceInformation": {
    "date": "2026-11-03 10:53",
    "source": "The Wire (2002-2008)",
    "genre": "Stealth investigation / crime drama with a corner-management sim and an asymmetric versus mode",
    "perspective": "Isometric 2.5D (pixel-art 3D skeletons on a tile world); brawler-view interiors; HTML case-file screens",
    "tech": "my-3D2dge v0.85.1 full engine (canvas 2D, optional WebGPU lighting); AI Hub session client 1.4.0; vanilla JavaScript; Web Audio",
    "artDirection": "Engine-native retro-modern pixel art (PS1-era 2D look) pushed toward grit: sodium streetlight, rain, Formstone rowhouses, boarded vacants",
    "animation": "Engine-native procedural Humanoid rigs (E.MOVES, poses, E.ACTIONS paired actions) plus custom joint post-processed poses; tweens and coroutine scripts",
    "audio": "Code-written chip-synth music (engine music tracks, layered), synthesized effects and ambience, Web Audio formant gibberish voices with a telephone filter",
    "online": "AI Hub Session Protocol v1, shared-world versus for 1-4 players (host-authoritative); local split-screen versus; no other network",
    "testing": "Lightweight, token-efficient testing as TASK.md allows (FPS targets and optimization out of scope). Run: <replace with what you actually ran, e.g. headless Node tests on the engine's fixed-step clock, engine check.mjs screenshots, Playwright gamepad/touch checks, the AI Hub harness, a viewport-matrix spot check>",
    "research": "my-3D2dge handoff docs (API.md, AI_GUIDE.md, ASSETS.md, kits) and the AI Hub protocol README; knowledge of the series from memory; no other web research",
    "environment": "Claude Code CLI (headless); Linux; browser unknown",
    "model": "Anthropic, claude-opus-5-5, reasoning effort max",
    "usage": "unknown"
  },
  "testingFeedback": ["…", "…", "…", "…"],
  "engineFeedback": ["…", "…", "…", "…", "…", "…"],
  "promptFeedback": ["…", "…", "…", "…"],
  "aiHub": {
    "name": "WIRETAP",
    "tagline": "Somebody's always listening.",
    "description": "Work both sides of a West Baltimore corner in 2004: build a wiretap case one photo, page and phone call at a time, then run the corner the case is built on. Includes a 1-4 player cops-vs-corner versus mode.",
    "type": "Game",
    "genre": "Stealth",
    "source": "The Wire (2002-2008)",
    "series": "",
    "players": "1–4",
    "controls": "Stick/WASD move · L2/RMB watch · R2/LMB photo · ✕/E interact · △/Q partner · Create/Tab notebook",
    "tags": ["story", "versus", "pixel art", "isometric", "crime", "detective"]
  }
}
```
- **The build's final chat reply** must also contain Source Information, Testing Feedback, Engine Feedback and Prompt Feedback (TASK.md).

---

## 14. Build order and milestones
Build systems before content and one complete episode before breadth. **Each milestone ends with its tests green and a bundle that runs.**

| M | Goal | Done when |
|---|---|---|
| **M0** Setup | Dev folder, engine and hub client fetched, `build.mjs`, `index.html`, `tests/headless.mjs` skeleton, blank title scene | The bundle opens with no errors; `node engine/tools/check.mjs <bundle>` passes; headless boot test passes |
| **M1** Framework | Scenes skeleton; Controller classes; KEYS preset; settings (glyphs, stick inversion, difficulty, text speed, language, voices); canvas and DOM glyph rendering with device switching; DOM UI kit (focus nav, hover focus, legend); hover patch for E.Shell; save system; touch-only notice; About screen (rendering `credits.json`); **Voice synth prototype** (speak a line with 3 profiles, phone filter); music player with the 7 songs | Fake-gamepad test shows ✕ prompts and Xbox after switching; inversion test flips movement; the touch-only profile shows the notice; voice speaks in sync with a test dialog |
| **M2** World | Neighborhood TileMap (App. A) with wall types, facades, floors, stoops, poles and wires, props, lights, weather, time presets; Annex map; camera rotate/zoom/peek; Dana moves (walk/run/crouch/blend); civilians with routines; FlowField cache | Screenshots of day/night/rain in 3 rotations look right (thumbnail test, check.mjs look notes acted on); 25 civilians walk 5 min without getting stuck (headless) |
| **M3** Corner and eyes | CornerSim (all roles, sales, shutdown, ledger); perception/made; Watch, reads, photos and polaroids; HUD; interactables, cover, eavesdrop, barks | Headless: ledger invariants hold over 10 min; a careless bot gets made within 30 s; a careful bot reads 2 roles and gets 4 faces |
| **M4** Episode 1 vertical slice | Director and mission runner; E.Story + Dialog with voices; Annex stations; Board; notebook; Pockets' shoe game; cold open; I1 as Tee (order wheel, code card, payphone keypad, count) | Ep1 playable start to finish with a pad and with keyboard+mouse; autosave/continue works; deep links `#ep1.*` reach every beat |
| **M5** Episode 2 | Chase (escape graph, vault, tackle, cuff, ditch, search); box; cipher; affidavit and necessity; chambers; I2 | Headless chase bot catches Corey; box thresholds and lawyer rule; affidavit scoring and perjury detection; Ep2 playable |
| **M6** Episode 3 | Wire room (scheduler, playback, minimize/spot-check, log, voice ID, pages, fast-forward, legal); van stakeout with van heat; dilemma; ops sweep; wall-off; code flip; Easy's scene (I3) | Wire session tests (legal increments, logging windows, ID); Ep3 playable on all branches |
| **M7** Episode 4 | Tail (routes, acts, distance band, hand-off), trash stealth, kitchen talk, burners, session 3, I4 | Tail bot completes `teeDry`; Ep4 playable |
| **M8** Episode 5 + endings | Raid, rescue, press conference, money tail with moving cone, long lens, the morning after, I5, montage rules, credits, Shut Down, episode select presets | The branch-matrix test (§16) produces a valid montage for every combination; story mode is complete |
| **M9** Versus | VersusSim rules, roles, actions, scoring, bots, local split screen, results; then `HubTransport`, host loop, snapshots, interpolation, leave/time-up/end/server | A local bot match ends with a valid outcome; **hub harness passes** all four runs (§16) |
| **M10** Attract and title | Attract reel (9 vignettes), idle detection, touch-only attract; title diorama; episode select; versus setup; full settings | Idle 10 s → attract; any input → title; all vignettes run 3 loops without errors |
| **M11** Polish and ship | Balance pass (difficulty table), juice (particles, shake, stings), audio mix, writing pass against App. G, viewport/WebKit checks, final About content, bundle, exit interview | §17 checklist all ticked |

**Content budgets** (to keep scope honest): at most ~90 dialogue lines per episode excluding wire calls; wire calls as in App. D; montage cards as in App. G. Write tight. The show's people say less than they mean.

---

## 15. Risks and how to de-risk them
| # | Risk | Why it's risky | De-risk |
|---|---|---|---|
| 1 | **Scope** | Many systems and five episodes | Shared systems (one map, one CornerSim, one perception, one photo system everywhere); data-driven content; Ep1 slice by M4 proves the pipeline; content budgets; milestone gates |
| 2 | **AI Hub shared-world passing the harness** (latency 150 / jitter 50 / loss 5, host leave, server) | Netcode bugs show up late | `LocalTransport` and a `LoopbackTransport` that simulates latency/loss in-process for headless tests; client-authoritative own movement (the arena example's pattern); message size asserts; run the real harness at the *start* of M9 with a minimal round (two dots moving, finish at 30 s), then grow |
| 3 | **Wire room fun and readability** | Lots of text plus a clock | Few calls per session, short lines, 8 s rule shown as a visible ring, Rookie hints; deep link `#ep3.wire1` for fast iteration; thumbnail test |
| 4 | **Voice synth** (quality, sync, CPU) | Custom Web Audio | Prototype in M1; fixed lookahead scheduling (`ctx.currentTime + 0.05`); fallback: the engine's `text` blip with per-profile pitch if formants misbehave in a browser |
| 5 | **NPC simulation stability** | Stuck agents, flow-field cost, sorting | FlowField cache by POI; stuck rule; draw background civilians `every: 2`; invariant tests |
| 6 | **Perception tuning** | Made too easily, or never | The target table in §5.2; the `?dev=1` overlay shows every suspicion value; careless/careful bot tests |
| 7 | **10-foot UI and glyph switching** | Dense screens creep in | §4.5 rules; thumbnail test; fake-gamepad/mouse device-switch tests |
| 8 | **Branch combinatorics** | Flags interacting | Few flags; endings by a rule table; episode presets; a branch-matrix headless test that runs every choice combination with action parts auto-resolved (`debug.autoResolve`) |
| 9 | **Engine pitfalls** (heights, `cut`, sorting big shapes, iso facades, lighting cost) | New engine for most builders | Follow API.md's rules; `footprint` sorting for canopies and roofs; act on every `check.mjs` look note; keep the engine unmodified |
| 10 | **Single-file bundling** | `</script>` in strings, the order of the hub client | The build checks; tests run against the bundle, not only the dev page |
| 11 | **Gamepad wrapper side effects** | It overrides a browser API | `try/catch`, pass-through when both toggles are off, Playwright fake-pad test |
| 12 | **Tone and sensitivity** | Gritty material about real communities | App. G writing guide: no slurs, everyone human, violence mostly offscreen with consequences, no glamor; a final writing pass |

---

## 16. Testing plan (lightweight and token-efficient)
**Principles:**
- Test rules headless (fast, exact, no screenshots).
- Look at a *few* screenshots per milestone.
- Run the hub harness only for versus.
- Never paste big logs into context: print one PASS/FAIL line per test plus the first error.

**Tools** (on this machine):
- Node, Playwright 1.63 with Chromium/WebKit/Firefox.
- `node engine/tools/check.mjs <page>#<deeplink>`: errors, a screenshot, look notes, `game.debug.snapshot()`.
- `viewport-matrix <url>` (keep runs small: `--only` / `--devices`; don't run several at once). Real iOS Safari isn't available; WebKit with iPhone profiles is the closest check.
- `python3 -m http.server` to serve the bundle and the harness side by side.

**Hooks** (60-debug.js):
- `game.debug.snapshot()` → `{ scene, ep, beat, meters, flags, dana:[x,y], objective, versus:{ev, cn, tl, sides} }`.
- `game.debug.jump(beatId)`, `game.debug.autoResolve(on)` (missions and screens complete themselves with default good choices), `game.debug.bot(name)`.
- Deep links: `#title`, `#attract`, `#about`, `#ep<N>.<beat>` (e.g. `#ep3.wire1`), `#versus.bots`, `#versus.local`.
- `?dev=1` overlay: cells under the mouse, POIs, routes, suspicion numbers, agent states, F9 toggles it.

**`tests/headless.mjs`** loads `engine/my-3d2dge.js` and the bundled game script into a Node `vm` context with the stand-ins from `engine/kits/test.mjs` (`window`, `addEventListener`, `location`), then runs:

| Test | Asserts |
|---|---|
| boot | Boot steps finish; `validateData()` reports 0 problems; `game.errors.length === 0` |
| cipher | CW/CCW are permutations and inverses; App. C's 5 pages decode to App. C's numbers; the flip page decodes with the other turn |
| photo scoring | Fixture cases: back turned = no ★Face; 230 units = blurry; act window = ★Act; burned = 0 |
| perception | Careless bot (stare at a lookout from 60) made in ≤ 6 s; careful bot (walk past) never noticed; blending at 100 for 30 s never made |
| corner ledger | 10 min of sim: vial and cash conservation hold; shutdown freezes sales; re-up triggers below 30 |
| chase | A routing bot catches Corey in 20-45 s; a bot that sprints from the start along his exact path runs out of stamina and hasn't caught him by 15 s; out of sight 8 s → "He's gone"; the ditch happens; the bike kid takes the package after 45 s if it isn't searched |
| tail | A careful bot completes `teeDry`; a bot that stops on every `lookBack` gets made |
| box | Thresholds unlock B1-B3; Fear ≥ 80 → lawyer; the Lean → Offer combo; flip only at B3 with Fear ≤ 60 |
| paper | PC sums per line; a false necessity tick is always asked and denies |
| wire | Non-pertinent past the window adds Legal 4/s; a minimized pertinent line is lost; spot-check timing; LOG windows; voice ID links the number |
| meters | Brass 0 → shutdown scene; Heat thresholds add the 3rd lookout and rotate payphones; the code flip happens in every Ep3 Session 2 |
| branch matrix | With `autoResolve`, every combination of dilemma × sweep × wallOff × lossOn × canary × path × I5 reaches the montage with all 14 cards valid |
| save/load | Save at `ep3.van`, new game instance on the same storage, CONTINUE → same beat and STATE |
| versus balance | 20 bots-only 5-minute rounds with competent bots on both sides: Corner wins 35-65%, Detail wins 35-65%, draws ≤ 20%. Tune the quota and evidence points until it holds |
| versus | A bots-only local match ends with a valid outcome; host rules (burn, tap, jump-out) apply; snapshot JSON < 1,100 bytes at the 45-entity worst case; `LoopbackTransport` at 150 ms ±50 and 5% loss still converges |
| attract | 10.1 s idle on the title → `attract`; one `input.press` → `title`; 3 loops of the reel with no errors |

**`tests/browser.mjs`** (Playwright, one browser at a time):
1. **Gamepad:** an init script defines a fake standard gamepad (`navigator.getGamepads` returns a DualSense-like id with buttons and axes). Assert the HUD prompt reads ✕; switch Settings → Xbox → it reads A; enable `stickInvX`, push axis0 = +1 → Dana moves left (−x).
2. **Mouse:** hover a main-menu item → it gets focus; click → it activates; the legend shows mouse/key glyphs.
3. **Touch-only:** an iPhone profile (WebKit) shows the notice and a Settings button; after 10 s attract runs; a tap returns.
4. **Screens:** 8 screenshots via deep links at 1920×1080 (title, `ep1.photos`, `ep3.wire1`, Board, box, versus local split, about, montage). Look at each once; apply the thumbnail test (downscale to 480×270).

**Viewport sweep** (once, at M11): `viewport-matrix http://localhost:8000/<bundle> --only phone,tablet,desktop --engines chromium,webkit -o /tmp/viewport-matrix/wiretap`. Expect: phones show the touch-only notice; desktop sizes (16:9, 21:9, 4:3) fill edge to edge with the HUD inside the safe areas; no horizontal overflow; no console errors.

**AI Hub harness** (`tests/hub/hub-check.mjs`): serve `tests/hub/` with the bundle copied in. Open in Playwright and wait for `document.body.dataset.complete === 'true'`, then assert `window.__hubCheck.pass === true` for:
1. `harness.html?game=<bundle>&players=2&auto=1`
2. `…&players=4&latency=150&jitter=50&loss=5&auto=1`
3. `…&players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave`
4. `…&players=2&scenario=server&auto=1`

Also open the bundle outside a session: it must still reach the title.

**When to run:** headless after every change to a system; browser screens at the end of each milestone; viewport sweep and hub harness at M9 and M11.

---

## 17. Definition of done (tick every line before shipping)
- [ ] Title is **WIRETAP** (RNG-picked, §0); the bundle is `Wiretap-TheWire-claude-opus-5-5-max-20261103-105319.html` in `work/`; the dev folder holds sources, tools and tests; `exit-interview.json` sits next to the html and parses.
- [ ] One html file runs offline: the engine and hub client inlined, no runtime network, no external fonts.
- [ ] Genre/perspective as §2; engine-native art and animation, extended (§12); all music, effects and gibberish voices written in code (§11).
- [ ] **Story mode:** 5 episodes, 4 interludes + finale interlude, both finale paths, Shut Down, montage with computed cards, credits, episode select, continue/autosave.
- [ ] **Every system in §5-§7 is reachable in normal play**, with no TODOs, placeholders or stubs. Each one appears in the feature matrix (App. J.6) at least once.
- [ ] **Versus:** local (1 human vs bots; 2 humans split screen) and AI Hub shared-world (1-4). All four harness runs pass, and the game runs outside a session.
- [ ] **Attract:** 10 s idle on title/menus → bot-played reel; any input exits; it runs on touch-only devices.
- [ ] **10-foot UX:** controller-first; keyboard+mouse native (hover focuses, click selects, mouse aims and clicks world objects); prompts follow the last device; PlayStation glyphs by default with an Xbox option; **stick inversion toggles** for both axes; no dense data screens; thumbnail test passes.
- [ ] **Touch-only:** no touch controls; "Controller or keyboard required" with a Settings button; attract allowed.
- [ ] Standard engine features only (no custom pause/settings/rebinding/full screen); E.Shell HUD; standard settings plus the §4.7 game settings.
- [ ] **About/Credits** screen with Credits, Source Information, Testing, Engine and Prompt Feedback, matching `exit-interview.json`; "unknown" where unconfirmed.
- [ ] Headless suite green; browser checks looked at; hub harness passes; WebKit check done.
- [ ] Writing pass done against App. G (tone, no slurs, no quotes from the show).

---

# Appendices

## Appendix A: Penn Row neighborhood map (72 × 56 cells; 1 cell = 16 units; x east, y south)
Generated and checked by script: 56 rows of 72 characters, every listed POI on a walkable cell. Paste `ROWS` into `30-data-world.js` as-is. Wall heights and looks: §12.2. Floors: §12.3.

```js
const ROWS = [   // x: 000000000011111111112222222222333333333344444444445555555555666666666677
                 //    012345678901234567890123456789012345678901234567890123456789012345678901
  '#######xx######################xx########################xx#############',   // 0
  '#-----.==.--------------------.==.----------------------.==.-----------#',   // 1
  '#-----.==.--------------------.==.----------------------.==.-----------#',   // 2
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',   // 3
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',   // 4
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',   // 5
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',   // 6
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',   // 7
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',   // 8
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',   // 9
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',   // 10
  '#RRRRR.==.RRRFFFRRRPPPVVVRRRFF.==.FFFRRRRRRVVVPPPRRRFFFR.==.PPPRRRFFFRR#',   // 11
  '#......==......................==........................==............#',   // 12
  'x=====.==.====================.==.======================.==.===========x',   // 13
  'x=====.==.====================.==.======================.==.===========x',   // 14
  '#......==......................==........................==............#',   // 15
  '#RRRRR.==.RRRPPPFFFRRRVVVRRRPP.==.PPPRRRFFFRRRRRRVVVFFFR.==.HHHHHHHHTTT#',   // 16
  '#RRRRR.==.RRRPPPFFFRRRVVVRRRPP.==.PPPRRRFFFRRRRRRVVVFFFR.==.HHHHHHHHTTT#',   // 17
  '#RRRRR.==.RRRPPPFFFRRRVVVRRRPP.==.PPPRRRFFFRRRRRRVVVFFFR.==.HHHHHHHHTTT#',   // 18
  '#RRRRR.==.RRRPPPFFFRRRVVVRRRPP.==.PPPRRRFFFRRRRRRVVVFFFR.==.HHHHHHHHHHH#',   // 19
  '#-----.==.--------------------.==.----------------------.==.HHHHHHHHHHH#',   // 20
  '#-----.==.--------------------.==.----------------------.==.HHHHHHHHHHH#',   // 21
  '#QQQQQ.==.FFFRRRRRBBBBRRRRSSSS.==.LLLLEEEEEEMMMMMM$$$$$$.==.HHHHHHHHHHH#',   // 22
  '#QQQQQ.==.FFFRRRRRBBBBRRRRSSSS.==.LLLLEEEEEEMMMMMM$$$$$$.==.HHHHHHHHHHH#',   // 23
  '#QQQQQ.==.FFFRRRRRBBBBRRRRSSSS.==.LLLLEEEEEEMMMMMM$$$$$$.==.HHHHHHHHHHH#',   // 24
  '#QQQQQ.==.FFFRRRRRBBBBRRRRSSSS.==.LLLLEEEEEEMMMMMM$$$$$$.==.HHHHHHHHHHH#',   // 25
  '#......==......................==........................==............#',   // 26
  'x=====.==.====================.==.======================.==.===========x',   // 27
  'x=====.==.====================.==.======================.==.===========x',   // 28
  'x=====.==.====================.==.======================.==.===========x',   // 29
  '#......==......................==........................==............#',   // 30
  '#RRRRR.==.RRRFFFPPPRRRVVVRVVVV.==.KKKKRRRFFFRRRPPPRRRRRR.==.fff,,ffffff#',   // 31
  '#RRRRR.==.RRRFFFPPPRRRVVVRVVVV.==.KKKKRRRFFFRRRPPPRRRRRR.==.f,,,,,,,,,,#',   // 32
  '#RRRRR.==.RRRFFFPPPRRRVVVRVVVV.==.KKKKRRRFFFRRRPPPRRRRRR.==.f,,,,,,,,,,#',   // 33
  '#RRRRR.==.RRRFFFPPPRRRVVVRVVVV.==.KKKKRRRFFFRRRPPPRRRRRR.==.f,,,,,,,,,,#',   // 34
  '#RRRRR.==.PPPRRRFFFRRRRFFRVvvV.==.RRRR------------------.==.f,,,,,,,,,,#',   // 35
  '#RRRRR.==.PPPRRRFFFRRRRFF-vvvv.==.RRRR::::::::::::::::::.==.f,,,,,VVVVV#',   // 36
  '#RRRRR.==.PPPRRRFFFRRRRFF-VvvV.==.RRRRCCCCCCCC::CCCCCCCC.==.f,,,,,VVVVV#',   // 37
  '#RRRRR.==.PPPRRRFFFRRRRFF-RRRR.==.FFFFCCCCCCCC::CCCCCCCC.==.f,,,,,VVVVV#',   // 38
  '#RRRRR.==.PPPRRRFFFRRRRFF-RRRR.==.FFFFCCCCCCCC::CCCCCCCC.==.f,,,,,VVVVV#',   // 39
  '#RRRRR.==.PPPRRRFFFRRRRFF-RRRR.==.FFFFCCCCCCCC::CCCCCCCC.==.f,,,,,VVVVV#',   // 40
  '#RRRRR.==.PPPRRRFFFRRRRFF-RRRR.==.FFFFCCCC::::::::::CCCC.==.f,,,,,VVVVV#',   // 41
  '#-----.==.--------------------.==.----CCCC::::::::::CCCC.==.-----------#',   // 42
  '#-----.==.--------------------.==.----CCCC::::::::::CCCC.==.-----------#',   // 43
  '#RRRRR.==......................==.RRRRCCCC:::pppp:::CCCC.==............#',   // 44
  '#RRRRR.==......................==.RRRRCCCC:::pppp:::CCCC.==............#',   // 45
  '#RRRRR.==.fffffffbbfffffffRRRR.==.RRRRCCCC:::pppp:::CCCC.==............#',   // 46
  '#RRRRR.==.fbbbbbbbbbbbbbbfRRRR.==.RRRRCCCC:::pppp:::::::.==............#',   // 47
  '#RRRRR.==.fbbbbbbbbbbbbbbfRRRR.==.RRRRCCCC::::::::GGGGGG.==............#',   // 48
  '#RRRRR.==.fbbbbbbbbbbbbbbfRRRR.==.RRRRCCCC::::::::GggggG.==............#',   // 49
  '#RRRRR.==.fbbbbbbbbbbbbbbfRRRR.==.RRRRCCCC::::::::GggggG.==.......kkkkk#',   // 50
  '#RRRRR.==.fbbbbbbbbbbbbbbfRRRR.==.RRRRCCCC::::::::GggggG.==.......kkkkk#',   // 51
  '#RRRRR.==.fbbbbbbbbbbbbbbfRRRR.==.RRRRCCCC::::::::GggggG.==.......kkkkk#',   // 52
  '#RRRRR.==.ffffffffffffffffRRRR.==.RRRRCCCC::::::::GGGGGG.==.......kkkkk#',   // 53
  '#RRRRR.==.RRRRRRRRRRRRRRRRRRRR.==.RRRRffffffffffffffffff.==.......kkkkk#',   // 54
  '#######xx######################xx########################xx#############',   // 55
];
```

**Legend → TileMap.** Walls: `# R F P V S L E M $ K B Q H T C G k` (numbers 1-17 in `types`). Floors: `. = - , : b p v g` are `{ floor: tag }`. `f` and `x` are `{ floor: 'fence' | 'edge', block: true }`. Storefront letters: **S** Gaither Market · **L** Suds City · **E** Ridley Wireless & Pager · **M** Mama B's Soul Food · **$** Ridley Check Cashing · **K** Ridley Carryout · **B** Fades & Grades · **Q** Abbott Liquors · **H/T** Greater Hope Baptist Church and tower · **C** Delancey Courts · **G/g** the garage (walls / walkable inside) · **k** Arundel Gas kiosk · **V/v** vacants (1412 Gaither is walkable inside) · **,** the vacant lot.

**Streets:** Dunmore (rows 12-15), **Ridley Avenue** (rows 26-30; road rows 27-29), Abbott (cols 6-9), **Gaither** (cols 30-33), Harlow (cols 56-59). Alleys: rows 1-2, 20-21, 42-43; the Courts service lane at row 35; the yard path at col 25 (rows 36-41).

**Points of interest** (cells; world = `(c + .5) × 16`):
| id | Cell | What |
|---|---|---|
| `P1` | 28,26 | Payphone outside Gaither Market (555-0187) |
| `P2` | 35,26 | Payphone outside Suds City (555-0143) |
| `P3` | 42,30 | Payphone + bus shelter + bench, Ridley south side (555-0129) |
| `post` | 30,31-30,34 | The crew's spot on Gaither's west sidewalk, beside the boarded corner vacant |
| `v1412` | front door 29,36 · inside 27-28,35-37 · back door 26,36 | Cut-through vacant; **stash** behind the radiator at 27,36 |
| `yard` | 25,36-25,41 | Path from 1412's back door down to the alley (row 42) |
| `felton` | stoop 30,39 (house 26-29,38-41) | 1407 Gaither: Mr. Felton's house and memorial |
| `odessa` | stoop 33,37 (house 34-37,35-41) | 1410 Gaither: Miss Odessa; Pigeon's coop on her roof at 35,36, z 40 |
| `pockets` | 27,21 | The alley behind Gaither Market (Pockets' spot in Ep1) |
| `barber` | 20,26 | Fades & Grades door |
| `mamab` | door 46,26 · back door 46,21 | Mama B's; the count room is behind 45-48,22-23 (long-lens vignette) |
| `lens` | stand at 50,20 → roof of the vacant 49-51,16-19 | Ep5B long-lens position |
| `wireless` | door 40,26 · trash 39-43,20-21 | Ridley Wireless & Pager; Ep4 trash bags |
| `church` | steps 64,26 | Greater Hope steps (vantage, montage) |
| `courtsE` | 52-55,47 | Courtyard entrance from Harlow |
| `breezeway` | 46-47,37-40 | Through the Courts' north building |
| `garage` | side door 50,50 · roll-up door 55,50-51 · inside 51-54,49-52 | The raid target. Both doors are wall cells (`G`) in `ROWS`; scripts open them with `map.set(cx, cy, 0)` (the roll-up for the truck and at the breach, the side door at the breach) |
| `gas` | forecourt 60-65,44-53 · pumps 62,47 and 62,50 · canopy footprint 60-65,46-51 · kiosk 66-70,50-54 | Arundel Gas (closed): the re-up spot in Ep1-3 |
| `lot` | 61-70,32-41 (gap in the fence at 63-64,31) | Vacant lot: fire drum 63,34 · burned car 64,38 · mattress 61,40 |
| `court` | gate 17-18,46 · inside 11-24,47-52 · hoops 11,49.5 and 24,49.5 | Basketball court (burner handout in Ep4) |
| `strip` | 10-29,44-45 | Sidewalk strip between the south alley and the court |
| `chevy` | 22.5,29 facing east | Dana's car (Ep1 cover) |
| `vanV1` / `vanV2` / `vanV3` | 58,45 facing north · 62.5,29 facing west · 63,33 facing south | Ep3 van spots (close/risky · far/safe · inside the lot, middle) |
| `buick` | 32,40 | Dead Buick on Gaither (a stash spot option and a ditch spot) |
| `trashGate` | 19,45 | Trash can on the strip by the court's north gate (a stash option in I2 and versus) |

**Paths:**
- **Patrol loop:** a closed `E.Path` through lane centers. Abbott x 7.5 → Ridley y 28.5 → Harlow x 57.5 → Dunmore y 13.5 → back to Abbott.
- **Bus:** Ridley eastbound in row 28 (y 28.5), pulling into parking row 29 for 4 s at P3 (42,29).
- **Ridley lanes:** westbound row 27, eastbound row 28, parking row 29 (south curb). Parked cars (the Chevy, van V2) use parking cells only. Keep P3's curb (x 40-44, row 29) clear for the bus.
- **Lonnie's car (Ep5B):** the loop Ridley → Harlow → Dunmore → Gaither, headlight cone range 120, fov .5.

**Versus zone:** cells x 10-55, y 15-45.
- **Characters** (players, bots, civilians) can't leave it: a character-only boundary check, not `map.block`.
- **Cars:** patrol cars drive the loop above and pass through the zone's edges on Ridley. Knockers drive in along Ridley or Gaither and stop at the curb nearest their target.
- **Dressing:** sawhorses and tape where streets leave the zone. Civilians spawn and leave at its street edges.

**Tail route `teeDry` (Ep4)** (waypoints in cells; `[act]` at that waypoint):
`30,32` → `30,26` → `28,26 [window 3]` → `20,26 [lookBack]` → `9,26` → `9,21` → `15,20 [doubleBack 48]` → `29,20` → `30,15 [wait 4]` → `44,15 [lookBack]` → `56,15` → `56,30` → `56,47` → `49,47 [cutThrough]` → `46.5,41` → `46.5,36 [lookBack]` → `55,36` → `56,36` → `56,30` → `42,30 [phoneStop 4]` → `34,30` → `33,31 [window 3: carryout]` → `30,32` → `30,44 [wait 3]` → `18,45` → `18,49` (END: the handout).
Checkpoints at waypoints 4, 9, 14 and 19. With Heat ≥ 70, add `lookBack` at 6, 12 and 21.

**Money-tail route `countRun` (Ep5B):** `27,36 (inside 1412)` → `26,36` → `25,41` → `25,42 [cutThrough]` → `30,43` → `33,31 [window 3]` → `33,26` → `33,21 [lookBack]` → `46,21` (END: knock at Mama B's back door).

**Chase escape graph `coreyRun` (Ep2):** a network of loops with **no exits**. Corey gets away only by staying out of Dana's sight for 8 s.
- **Nodes:**
  - `A` post 30,33 · `B` Gaither at the south alley 30,42 · `C` alley 20,42.5 · `D` alley 11,42.5 · `E` Abbott 9,43
  - `Q` Abbott at Ridley 9,26 · `R` Ridley south sidewalk 20,30
  - `F` strip 25,44.5 · `G` court gate 18,45.5 · `H` court 18,50 · `I` inside the court's west fence 11,50 · `E2` Abbott 9,50
  - `J` 1412 front door 29,36 · `K` 1412 back door 26,36 · `L` yard path 25,41
  - `M` Ridley crossing 30,26 · `N` store alley 27,20.5 · `O` alley 12,20.5 · `P` Abbott 9,20
- **Edges** (both ways; `v` vault, `c` cut-through, `g` gate): A-B · A-J (c) · A-M · A-R · B-C · B-F · C-D · C-L · D-E · E-Q · E-E2 · F-G (g) · G-H · H-I · I-E2 (v, over the fence cell 10,50) · J-K (c) · K-L · M-N · N-O · O-P · P-Q · Q-R.
- **Loop lengths:** A-B-C-D-E-Q-R-A is about 1,100 units (about 10 s at Corey's sprint); A-M-N-O-P-Q-R-A is about 1,200.
- **Lou's block:** at 15 s his car blocks the edge Corey is heading into next.

**Vantage points** (bots and versus; all inside the zone): bus shelter 42,30 · laundromat bench 36,26 · carryout line 35,30 · Gaither Market doorway 27,26 · barber window 20,26 · Odessa's stoop 33,37 (story only after her scene) · alley mouth 29,21 · Courts walkway 40,36 · Chevy 22.5,29 · strip 25,44 · Dunmore corner 30,15 · alley east 34,21.

**Ditch spots** (chase): trash can 30,41 (sidewalk) · under the Buick 32,40 (parked at the curb) · storm drain 30,43 (lost) · trash can 21,44 · window of the Ridley vacant at 22-24,31-34 (search it from the sidewalk at 23,30).

## Appendix B: Annex and small interiors
**The Annex** (iso; walls `h 40 plaster cut`, floor `E.tex.checker` linoleum `#8a8478`/`#7a746a`; `,` = door floor, open):
```js
const ANNEX = [
  '######################',   // 0  the Board hangs on the north wall at x 8-13
  '#....#..........#....#',   // 1  wire room (x1-4,y1-4)  | bullpen (x6-15) | Navarre's glass office (x17-20,y1-4)
  '#....#..........#....#',   // 2
  '#....,..........,....#',   // 3  doors
  '#....#..........#....#',   // 4
  '######..........######',   // 5
  '#....#..........#....#',   // 6  evidence cage (x1-4,y6-8) | coffee & break (x17-20,y6-8)
  '#....,..........,....#',   // 7  doors
  '#....#..........#....#',   // 8
  '#########,,,,#########',   // 9  stairs down (exit to the field)
];
```
- **Desks** (bullpen): Dana 7,2 · Lou 10,2 · Ren 7,6 · Hal's bench 13,6. Make Navarre's office walls glass with a `decorate` that paints blinds and glass tint.
- **Station spots** (interact cells): board 10,1 · navarre 18,2 · wire 3,2 · evidence 3,7 · coffee 18,7 · halBench 13,7 · renDesk 7,7 · stairs 10,9.
- **Light:** day = window light from the east; night = desk lamps (`lights.add` warm, radius 40) plus the CRT glow.

**Wire room** (`brawler` view, an 8×5 interior): desk with the reel-to-reel `reel2reel`, CRT, two chairs (Hal, Dana), a radiator, a window with rain at night. Camera framed on the left 38% of the screen.

**The box** (`brawler`, 7×5): table center, chairs at 3,2 (suspect) and 3,3 (Dana), Lou standing at 5,3; the one-way glass is the north wall (dark tinted `decorate`); a single fluorescent light (flicker: `lights.add` intensity .85-1 noise, plus a 120 Hz hum).

**Chambers** (`brawler`, 8×5): judge's desk at 4,1, bookcases along the north wall, flag in the corner, Vance and Dana standing at 3,3 and 5,3. Warm lamp light.

**Odessa's kitchen** (the box scene variant, 7×5): table, stove, a window with the pigeons on the sill, warm light, a radio playing gospel softly (the `corner` song's chords on sine at 0.3 volume; it's fine to write a short 4-bar gospel loop).

## Appendix C: Cipher and pages (verified by script)
**Keypad:** `1 2 3 / 4 5 6 / 7 8 9 / * 0 #`. 0 and 5 never change.

| | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| **CW encode** (Ep1-3) | 0 | 7 | 4 | 1 | 8 | 5 | 2 | 9 | 6 | 3 |
| **CW decode** = **CCW encode** (the flip) | 0 | 3 | 6 | 9 | 2 | 5 | 8 | 1 | 4 | 7 |

**Known numbers:**
| Number | What | CW encoded | CCW encoded |
|---|---|---|---|
| 555-0187 | P1 Gaither Market payphone | 555-0769 | 555-0341 |
| 555-0143 | P2 Suds City payphone | 555-0781 | 555-0329 |
| 555-0129 | P3 bus stop payphone | 555-0743 | 555-0367 |
| 555-0174 | Harstad Auto Parts, Dundalk (on the truck's side) | 555-0798 | 555-0312 |
| 555-0161 | Mama B's Soul Food (never paged; it's on the menu sign) | 555-0727 | 555-0383 |

**The stash pager:** 555-0110, printed on the label of Corey's pager. The crew keeps the number in service for whoever holds the stash, so the Ep2 affidavit's clone pager receives everything paged to it.

**Corey's pager memory (Ep2), code CW:**
| # | Page | Decodes to | Meaning |
|---|---|---|---|
| 1 | `555-0781 22 07` | 555-0143 | Tee: call me at the laundromat phone |
| 2 | `555-0743 11 00` | 555-0129 | Easy's people: package ready, call the bus-stop phone |
| 3 | `555-0769 33 07` | 555-0187 | Tee: the count, at the market phone |
| 4 | `555-0769 77 14` | 555-0187 | Pigeon: police around (the morning Felton died) |
| 5 | `555-0798 44 07` | 555-0174 | Tee: need product → **unknown number** until Ep3 links it to Harstad |

- **Live pages in Ep3 Session 1:** `555-0743 11 00`, `555-0769 33 07`.
- **The flip page (Ep3 S2, every playthrough):** `555-0329 22 07`. It only matches P2 when the keypad is turned the *other* way. The setup: S2-1's line "hit me at the laundry" comes right before it.

**Burners (Ep4 subpoena):**
| Phone | Number | User |
|---|---|---|
| B1 | 555-0102 | Tee |
| B2 | 555-0115 | Lonnie |
| B3 | 555-0136 | Rook, or Tavon if Rook is locked up |
| B4 | 555-0158 | Dale |
| B5 | 555-0190 | Pigeon |

## Appendix D: Wire calls
- **Type:** **N** = non-pertinent (minimize within the window). **P** = pertinent. **T@k** = turns pertinent at line k (a spot-check catches it). **★** = key line (log it).
- **Speakers** show as `UNKNOWN MALE n` until voice-ID'd.
- **Lines:** if a call's line is down (swept or untapped), the scheduler moves it to the nearest live line, or drops it if none.
- **Length:** each call is its lines plus 1.5-3 s of dial and hang-up sounds. Write any extra filler in the same voice.

**Session 1 (Ep3, 16:00-23:00):**
| id | Time | Line | Speakers | Type | Lines (★ key) | Unlocks |
|---|---|---|---|---|---|---|
| S1-1 | 16:05 | P2 | Pigeon → Odessa | N | PIGEON: Hey Grandma. I'm at the library. / ODESSA: Library closes at five on Tuesdays, Junior. / PIGEON: It's the study room. They got a study room now. / ODESSA: Mm-hm. You eat? / PIGEON: I ate. I'll be home by the streetlights. / ODESSA: You be home *before* them. | Teaches minimizing. Over the window: Hal: "That's a boy and his grandmother, Detective." |
| S1-2 | 16:40 | P1 | Tee → Tavon | T@4 | TEE: You see the game? / TAVON: They ain't got no bullpen. None. / TEE: They got a bullpen. Bullpen just tired. / ★TEE: Tell your man the thing go down at the place where Dre messed up his ankle. Four o'clock. / TAVON: Where Dre… oh. Yeah. / TEE: Don't "yeah" me. Be there. | Re-up riddle (map pick), time 16:00; teaches spot-check |
| S1-3 | 17:10 | pager | page `555-0743 11 00` | P | — | Decode → P3, "package ready" (page evidence) |
| S1-4 | 17:25 | P3 (else P2) | Dale → Tee | P | DALE: Usual? / TEE: Usual. But your count been light, my man. / DALE: Count is the count. I don't open the boxes. / ★TEE: Somebody opening them. / ★DALE: Four o'clock. Don't make me wait, I got a route. | Courier voice (ID later), "route" → delivery truck |
| S1-5 | 18:00 | P2 | Ms. Arnetta (citizen) → cab company | N | "I need a cab at Ridley and Gaither, the laundromat… No, I am not waiting forty minutes…" | — |
| S1-6 | 18:30 | P1 | Rook → Keisha | N | ROOK: I said I'ma bring it. / KEISHA: You said that Friday. He need shoes, Ricky. His toes out the front. / ROOK: I got him. Tonight. | Rook is a father (used in his ending) |
| S1-7 | 19:05 | P1 | Tee → Lil Moe | P | If Dana was made before: ★TEE: That lady on the bench Tuesday, leather coat? / MOE: She was reading the paper. / TEE: Nobody reads the paper on Ridley. Otherwise: ★TEE: Knockers came through twice. Nothing in the pockets, nothing on the corner. | Shows they know Dana's face (Heat note) or crew discipline (+4) |
| S1-8 | 19:40 | P3/P2 | Rev. Mayfield → church office | N | "Sister Pauline, about the folding chairs for Sunday…" | — |
| S1-9 | 20:30 | P2 | Tavon → Dink | P | TAVON: How we looking. / ★DINK: Light. Like nine hundred light. / TAVON: Nine hundred? / DINK: Testers was weak. Overtime ain't moving like last week. / TAVON: Don't tell Tee. I'll tell Tee. | Money flow evidence |
| S1-10 | 21:15 | pager | page `555-0769 33 07` | P | — | Decode → P1, "the count" |
| S1-OT | 22:10 | P1 | Tavon → Dink (only with ops choice *overtime*) | P | TAVON: Tee want it tight tonight. Extra man up on Harlow. / ★DINK: Package came in light, so we cutting the testers. / TAVON: Cut 'em. Ain't nobody gonna complain. | Crew structure + product handling (+4) |

**Session 2 (Ep3 night, 20:00-01:00, after the van and the ops choice):**
| id | Time | Line | Speakers | Type | Lines (★ key) | Unlocks |
|---|---|---|---|---|---|---|
| S2-1 | 20:10 | P2 (P1 if not swept) | Tee → Rook | P | TEE: Man took it right off the boy. Walked up like he was asking directions. / ROOK: In a hearse? A *hearse*? / ★TEE: Hit me at the laundry later. Not this phone. / ROOK: It's Sunday. Gotta be. / ★TEE: Don't say names on the phone. | Sunday named (+4); sets up the flip page |
| S2-2 | 20:45 | P3/P2 | Rook → "Smokey" | P | ★ROOK: I need a hammer. Tonight. / SMOKEY: What kind of hammer? / ★ROOK: The kind that finishes a job. / SMOKEY: Come by the shop at eleven. Cash. | **Threat to life → decision:** let it ride / wall-off stop |
| S2-3 | 21:20 | P2 | Odessa → the laundromat payphone | N | ODESSA: Hello? Is this the laundromat phone? Is my grandson out there? Junior Hollis. Little red hoodie. / MAN: Ain't nobody here, ma'am. | — |
| S2-4 | 21:50 | pager | **flip page** `555-0329 22 07` (CCW) | P | — | Known-plaintext puzzle (§6.3) |
| S2-5 | 22:30 | P1/P2 | Lonnie → Tee | P | LONNIE: He wants to see you. / TEE: Tonight? / ★LONNIE: You know where. Mama B's. The back. / TEE: I'm coming. / LONNIE: And Terrence. Come by yourself. | THE MONEY tier: Boss ?, Mama B's |
| S2-6 | 23:10 | P2 | two teenage girls (citizens) | N | Arguing about a boy named Marcus and a borrowed jacket | — |
| S2-7 | 23:50 | P3/P2 | Tavon → unknown | P | TAVON: Tee say we gotta be easy for a minute. No more phones on Ridley after Friday. / UNKNOWN: Then what we using? / ★TAVON: He gonna get us something. Throwaways. | Foreshadows burners (+4) |
| S2-8 | 00:30 | P1/P2 | drunk citizen → his ex | N | Sad, funny, about a dog he misses more than her | — |
| S2-OT | 00:50 | P2 | Dink → Tavon (only with ops choice *overtime*) | P | DINK: Tee got scared of phones. Say after Friday nobody talk on these no more. / ★TAVON: Then how I'm supposed to reach the stash? / DINK: He say he got a plan. Everybody getting a new number. | Burner switch confirmed (+4) |

**Session 3 (Ep4, burners B1-B5, 22:00-01:00):**
| id | Time | Line | Speakers | Type | Lines (★ key) | Unlocks |
|---|---|---|---|---|---|---|
| S3-1 | 22:05 | B1↔B2 | Lonnie → Tee | P | ★LONNIE: Thursday. After close. Same as always. / TEE: Same as always. / LONNIE: He says bring it counted this time. Counted twice. | The count: Thursdays at Mama B's |
| S3-2 | 22:30 | B3 | Rook (or Tavon) → girlfriend | N | Small talk about a cousin's cookout | — |
| S3-3 | 23:00 | B1↔B4 | Tee → Dale | P | DALE: Friday, the truck, nine o'clock. / ★TEE: Not the gas station. The new place. / DALE: Which new place? / ★TEE: The garage behind the Courts. Pull in off Harlow. | Raid target and time |
| S3-4 | 23:25 | B5 | Pigeon → Odessa | N | PIGEON: Grandma? I'm okay. I'm at Tavon's… Past the window (the temptation): PIGEON: I don't wanna do this no more. / ODESSA: Then come home, baby. | Nothing. Listening past the window costs Legal, and if Dana mentions it in the kitchen, Trust −40 ("You was listening to me?") |
| S3-5 | 23:50 | B1↔B2 | Tee → Lonnie | P | ★TEE: That detective. Whitlock. She grew up on Ridley. Her mother still stays over by the church. / LONNIE: He ain't gonna like you saying that on a phone. Or at all. | Dana's choice: call her mother (`momSafe`) |
| S3-6 | 00:20 | B2↔B1 | Lonnie → Tee (only if Heat ≥ 70) | P | ★LONNIE: Count's moving to Saturday. He's feeling something. | Path B night shifts (dialogue only) |

## Appendix E: Interrogation data
**Corey "Stash" Lyle (Ep2 box).** Starts at Resolve 100, Fear 30, Rapport 0, 12 exchanges.

| Evidence (△) | Effect | Line |
|---|---|---|
| The package (if found) | Resolve −30 | DANA: Forty vials. Orange tops. Your prints on the bag. / COREY: That bag was on the ground. |
| The pager | Resolve −15; **needed for B2** | LOU: Your pager's been busy, Corey. Real popular kid. |
| A photo of Corey at the vacant (★Act `stash-access` or a `stash` read) | Resolve −25 | DANA: That's you going into fourteen-twelve. Again. And again. |
| A photo of Tee | Resolve −10 | COREY: I don't know him. *(he does)* |
| Anything irrelevant | Resolve +10, Fear +5 | COREY: That's a kid. Why you showing me a kid? |

| Beat | Condition | Corey says | Board fact |
|---|---|---|---|
| B1 | Resolve ≤ 75 | "Tee. Terrence. He run Gaither. I just… I just sit." | `stmt:corey:tee-lieutenant` |
| B2 | Resolve ≤ 50 and pager shown | "The numbers… it's the phone, man. You turn it. That's all I know." | `stmt:corey:code` |
| B3 | Resolve ≤ 25 | "Fourteen-twelve. Behind the radiator. There's a board loose." | `stmt:corey:stash` |
| Flip | After B3, Fear ≤ 60, Rapport ≥ 1 → *Work for us* (replaces ✕) | "If Tee finds out, I'm dead. You know that, right? …What I gotta do?" | `coreyCI` |
| Lawyer | Fear ≥ 80 | "I-I want a lawyer. I know my rights. I want a lawyer." | session ends |

**Approach lines** (2 variants each in the build; Corey's reply by Resolve band: high > 60, mid 30-60, low < 30):
- **○ Lean.** LOU: "You know what distribution in a school zone gets you? That court's a school zone, Corey. Look it up." COREY high: "I ain't distributing nothing. I was sitting." · mid: "Why y'all on me? I'm nobody." · low: "Stop. Just… stop."
- **✕ Offer.** DANA: "You're nineteen. Tee's twenty-four. Who do you think takes the weight?" COREY high: "Tee look out for me." · mid: "…Tee ain't gonna let me go down." · low: "What happens to me? If I say something. What happens?"
- **Lean → Offer combo:** Lou slams the table and walks out. DANA: "He's gone. It's just me. Talk to me, Corey."
- **□ Bluff (fact known).** DANA: "Pigeon told us you hold for them." COREY: "Pigeon don't know nothing about— …man." **(Fact unknown):** DANA: "Rook says you set up Felton." COREY: "Rook don't talk to police. You making stuff up now."

**Rook (Ep3, if the wall-off stop happened)**, a 3-exchange comic beat that can't be won:
- DANA: "Nice car." ROOK: "Lawyer."
- LOU: "Taillight's out." ROOK: "Lawyer."
- DANA: "Who's the hammer for, Ricky?" ROOK: "Law. Yer."

**Pigeon (Ep4 kitchen).** Starts at Trust 20 (+15 if Dana chose the respectful option with Odessa in the cold open), Fear 40, 8 exchanges. The goal is Trust ≥ 70.
- **△ Be honest:** cite a Board fact ("I know you watch from the roof. I know Tee pays you forty a day."). Trust +15 if it's known, −5 if not.
- **□ Promise:** "Nobody will know you talked to me." Trust +20 and sets `promise`, which the montage remembers.
- **○ Push:** "You want to end up like Corey?" Fear +20, Trust −10. A second Push → ODESSA: "That's enough. You can go now, Dana Lynn." (ends it)
- **✕ Listen:** Trust +8. PIGEON (about his birds): "Homers always come back. You take 'em fifty miles and they come back. That's the thing about 'em."
- **Special option** (only if Dana listened past S3-4's window): *"I heard your call."* Trust −40. PIGEON: "You was listening to me?"
- **Success:** PIGEON: "Thursdays I carry the bag. Mama B's. The back door." → `pigeonTrust`; Pigeon becomes the Path B runner.
- **Odessa frames it:** "He's a good boy. He's fourteen. Those two things don't last long around here."

## Appendix F: Affidavit and the judge
**Probable cause:** §6.5 table. A line needs ≥ 4 points including a direct item.

**Halloway's question pool.** He asks 3: the weakest lines first, and always any false necessity tick.
| Q | He asks | Correct answer | Wrong answers (strike the line) |
|---|---|---|---|
| Q1 identity | "How do you know the man on this payphone is the man in your photograph?" | "We photographed him using that phone at [time] on [date]." (needs an ★Act payphone photo of that person) | "Our informant says so." / "He's on that corner every day." |
| Q2 informant | "Your informant is a drug addict. Why should I believe a word?" | "He's corroborated by the pager memory and our photographs." (needs both) | "He's been reliable before." (no record) / "He has no reason to lie." |
| Q3 digits | "These are numbers on a pager. How do you know they're phone numbers at all?" | "Decoded with the crew's keypad code, they match three payphones on Ridley. A crew member described the code in an interview." (needs decodes + B2) | "It's how they do it." |
| Q4 necessity | "Why can't you just keep watching the corner?" | "Surveillance shows us hand-to-hands, not who supplies them." (always true) · "Their lookouts made us on [date]." (true only if Dana was made) | the "made" answer when it never happened (strike) |
| Q5 undercover | ticked falsely: "Tell me about the undercover buys." / not ticked: "Why no undercover buys?" | not ticked: "We have no undercover officer, and anyone from the neighborhood is known." | **ticked falsely = caught lying: denied** |
| Q6 search | ticked falsely: same trap / not ticked: "Why not just search the stash?" | "A raid gets one package and tips the organization. It won't identify the supplier." | ticked falsely = denied |
| Q7 scope | "Why the pager clone? What do you expect to hear?" | "Pages from the lieutenant to his crew and supplier: re-up times, the count." (needs codes 11/33 decoded) | "Whatever they say." |
| Q9 grand jury | ticked falsely: "Which grand jury? I'd like to see those returns." / not ticked: "Why no grand jury subpoenas?" | not ticked: "Subpoenaed witnesses would warn the organization, and the people who know won't testify against it." | ticked falsely = denied |
| Q8 minimization | "Who's monitoring, and do they know the rules?" | "Detective Pettiford. Every call logged, minimized in the first seconds if it isn't pertinent." (always correct) | — |

**Halloway's lines:**
- "I've signed wiretaps for twenty-two years, Detective, and I regret eleven of them."
- "I read every log. If I find a grandmother's phone call in your transcripts, I'll pull this wire myself."
- Signing: "You're up. Thirty days." (stamp)

## Appendix G: Writing guide, key scenes, endings
**Tone:**
- Understated and specific. People talk around things and say less than they mean.
- Humor is dry and dark.
- Cops and crew both have bosses, quotas and rent.
- Profanity exists but isn't every line.
- No exposition dumps. The player learns by watching.

**Do:**
- Concrete details: the number 22 bus, the Orioles' bullpen, court dates, overtime, a son who needs shoes.
- Institutional logic: stats, clearance, OT, the count, the re-up, the 24-hour report.

**Don't:**
- No slurs, ever, in any setting.
- No quoting the show (not its catchphrases or famous lines).
- No glamorized violence.
- No caricatured dialect. Write it lightly: "ain't", "y'all", dropped g's now and then, "yo" or "na'mean" at most once a scene.

**Vocabulary** (characters use it; UI and narration stay plain): re-up, package, testers, hoppers, the count, knockers / jump-out boys, 5-0, throwaway, the box, red ball (a high-profile case), OT, stat sheet, clearance rate, Central Booking, the Western, downtown, ASA, "up on the wire", minimize, pertinent, PC, CI, dry cleaning (counter-surveillance), walled-off stop.

**Bleep list** (Strong language: Bleeped → "—" plus a voice bleep): shit, fuck/fucking, motherfucker, bitch, ass, damn.

**Epigraphs:** §8.3-8.7 (all original lines spoken by characters in that episode).

**Cold open (1.1):**
- DUKES: Detective. Neighbor found him at five, going out for the paper. Nobody heard nothing.
- DANA: Nobody heard a man get beat on his own steps.
- DUKES: That's what nobody said.
- LOU *(kneeling by the sheet)*: Cornelius Felton. Thirty-one years driving the number 22. Retired in March.
- DANA: He called the corner in. Three times since August. Name and address every time.
- LOU: Then somebody read his name out loud to the wrong person.
- DANA: You're Homicide. This is yours.
- LOU: It's mine till Friday. Then it's a file. You know the street?
- DANA: Grew up three blocks off it.
- *(at Odessa's stoop)* DANA: Morning, Miss Odessa.
- ODESSA: Dana Lynn. Your mama know you're out here this early?
- **Choice:** *"Did you see anything last night?"* / *"I remember your choir, Miss Odessa."* The respectful second choice sets `odessaRespect` (+15 Trust in the kitchen) and she adds: "Then you remember I don't say things twice."
- ODESSA: I saw the TV and the inside of my eyelids. I got a grandbaby to raise, Dana Lynn.
- *(the camera drifts up to Pigeon on the roof, feeding his birds)*
- LOU: This ain't a whodunit, Dana. It's a who-cares.

**The detail assembles (1.3):**
- NAVARRE: The Sun put Mr. Felton on page one. So now the Deputy Commissioner cares. Six weeks. One corner. Arrests.
- LOU: Arrests. Not a case.
- NAVARRE: He said arrests. I heard case. We'll see who's right. Detective Szabo, Homicide.
- LOU: Formerly. I said something true at a retirement party.
- NAVARRE: Detective Pettiford, pawn unit.
- HAL: Thirteen years. Nobody complained, because nobody knew I was there.
- NAVARRE: Officer Ocasio, on loan from Southwest.
- REN: I brought my own camera. The department's has a crack in the lens.
- NAVARRE: Detective Whitlock, Western narcotics. She knows Ridley.
- DANA: Ridley knows me. That might be the problem.
- NAVARRE: The Major wants bodies by Friday. I want to know who pays for that corner. We'll try to give him both.

**Pockets' shoes (1.4).** After each description, the player picks the matching photo. Photos show full bodies, shoes included (§5.3).
- POCKETS: Pockets don't do faces, Detective. Faces get you a funeral. Shoes, though. Shoes don't talk back. Twenty for the shoes. Pockets don't do credit.
- Wheat Timbs, laces tucked, not a scuff on 'em. That's a man who thinks he's a businessman. Terrence. Tee.
- Black Air Force, red check, size thirteen. Ricky Batts. Rook. Don't let him see you looking.
- Nikes with the duct tape on the left toe. Corey. He holds for 'em in the vacant. Nervous boy. Nervous boys live longer.
- Little sneakers that light up when he runs. Junior. Miss Odessa's grandbaby. They call him Pigeon on account of the birds. He's fourteen. *(beat)* Fourteen.
- And Dre ain't with 'em no more. Broke his ankle jumping the fence at the old Arundel station, running from y'all. They still meet out there. Ain't nobody fixed that fence.

**Easy's back room (I3):**
- EASY: Sit down, Terrence.
- TEE: I'd rather stand.
- EASY: I didn't ask what you'd rather. *(Tee sits.)* You lost my package to a man who drives a hearse.
- TEE: Sunday hit the boy right after the drop. Nobody could've—
- EASY: Somebody knew where the drop was. Somebody always knows. That's the cost of doing business outside.
- EASY: You know why they call me Easy? Because I never make anything hard that doesn't have to be. Make it back, Terrence. By the count.
- LONNIE: And the phones.
- EASY: The phones. Lonnie says you like the payphones.
- TEE: Payphones don't have names on 'em.
- EASY: Everything has a name on it. Stop using them.
- *(Tee leaves)* EASY *(to Lonnie)*: He's smart. Smart gets you so far.

**The van dilemma (3.4):**
- REN: He's got a gun on that kid. We have to do something.
- LOU *(radio)*: We do something, the wire's dead by tonight, and that kid's still a corner kid tomorrow.
- **Go in:**
  - DANA: Police. Put it down.
  - SUNDAY: Detective. Ain't Sunday, so it's business. But I don't do police. *(sets the bag on the hood)* Police do me. *(drives off in the hearse)*

**The finale choice (5.2):**
- PRUITT: Friday. A table. Dope, guns, cash. The Deputy's bringing Channel 11.
- NAVARRE: Hit the re-up Friday, we get Mabry and a package. Wait for Thursday's count, we might get the man who owns the package.
- PRUITT: "Might" doesn't fit on a stat sheet, Lieutenant.
- LOU: Neither does a soul-food restaurant with a check-cashing license. But it should.

**Montage cards** (14, always in this order; for each person the first matching row wins):
| Who | Condition | Card |
|---|---|---|
| Corner (always first) | — | "The corner at Gaither & Ridley: open for business by Monday." |
| Tee | A + weight + `teeShort` | "Terrence Mabry: pleaded to twelve years. Easy stopped paying his mother's rent in March." |
| | A + weight + Case high | "Terrence Mabry: pleaded to twelve years. Never said Easy's name." |
| | A + weight | "Terrence Mabry: pleaded to six years. Out in four. Never said Easy's name." |
| | A + talk | "Terrence Mabry: agreed to testify. Moved to a prison in Pennsylvania under another name." |
| | B + stay + `teeShort` | "Terrence Mabry: cut loose by Easy, then indicted. Testified against him." |
| | B + stay | "Terrence Mabry: indicted with Darnell Booker eighteen months later." |
| | B + run | "Terrence Mabry: last seen boarding a Greyhound to Charlotte." |
| | Shut Down | "Terrence Mabry: runs three corners now." |
| Easy | B + Case high | "Darnell Booker: arrested at Mama B's on a Thursday. The count was light." |
| | B | "Darnell Booker: indicted. The case is still in discovery." |
| | A | "Darnell Booker: opened a second check-cashing store on Cathedral Row." |
| | Shut Down | "Darnell Booker: sponsored the church's back-to-school drive." |
| Pigeon | `lossOn = pigeon` + `rookFree` + A | "Nobody has seen Junior Hollis since October. His grandmother still feeds the birds." |
| | `lossOn = pigeon` | "Junior Hollis: back on the roof. The birds are gone." |
| | `pigeonTrust ≥ 70` or (B and the runner wasn't Pigeon) | "Junior Hollis: started ninth grade at a school in the county. Still keeps one bird." |
| | otherwise | "Junior Hollis: running for Tavon now. Fourteen." |
| Corey | CI, not exposed | "Corey Lyle: moved to an aunt's in Richmond. Calls Detective Whitlock on her birthday." |
| | CI, exposed, rescued | "Corey Lyle: relocated by the State's Attorney. Testified for two days." |
| | CI, exposed, not rescued | "Corey Lyle: found in a vacant on Harlow Street. No witnesses." |
| | not CI | "Corey Lyle: serving five years for possession with intent." |
| Rook (always) | `wallOff` | "Ricky Batts: eight years on a gun charge from a taillight stop." |
| | `rookFree` | "Ricky Batts: shot in December over a parking space. His son got the shoes." |
| Sunday (always) | stay | "Royal Odom: still drives the hearse. Still doesn't work Sundays." |
| | call | "Royal Odom: robbed a Hurricane stash in November. Nobody called it in." |
| | go in | "Royal Odom: sent Detective Whitlock a card at Christmas. No return address." |
| Pruitt (always) | — | "Maj. Leland Pruitt: promoted to Colonel, Administrative Bureau." |
| Dana | A / B / Shut Down | "Dana Whitlock: back in Western narcotics. Drives past the corner every day." / "…assigned to the State's Attorney's money task force." / "…back in uniform on the midnight shift." Add "Her mother moved to the county in November." if `momSafe` |
| Lou | not Shut Down / Shut Down | "Lou Szabo: back in Homicide. Fourteen open cases on the board." / "Lou Szabo: retired. Took up fishing. Hates fishing." |
| Ren (always) | — | "Renata Ocasio: transferred to the Tactical Section. Kept the camera." |
| Navarre | A / else | "Gil Navarre: promoted to captain." / "Gil Navarre: passed over for captain." |
| Hal (always) | — | "Hal Pettiford: kept the wire room. Nobody told him to leave." |
| Teaser (always last) | — | "Glenn Harstad: guest of honor at State Senator Marian Ocheltree's harbor fundraiser." → **TO BE CONTINUED** |

## Appendix H: Music scores (engine `audio.music` format; all checked: every bar is 16 steps, notes are valid, the JS parses)
```js
const H = '- - - - - - - - - - - - - - -';        // 15 holds: the note before it lasts the whole bar
const BAR = '- - - - - - - - - - - - - - - -';    // a whole bar of holds: the note carries on
const SONGS = {
  theme: { bpm: 84, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: 0.2, notes: 'k . h . s . h k . h k . s . h . | k . h . s . h k . k h . s . o .' },
    { name: 'bass', wave: 'triangle', vol: 0.3, notes: 'A2 . . . . . A2 . C3 . . . E3 . D3 . | A2 . . . . . A2 . G2 . . . E2 . G2 . | D3 . . . . . D3 . F3 . . . A3 . G3 . | D3 . . . . . D3 . C3 . . . A2 . C3 . | F2 . . . . . F2 . A2 . . . C3 . A2 . | E2 . . . . . E2 . G#2 . . . B2 . D3 . | A2 . . . . . A2 . C3 . . . E3 . C3 . | E2 . . . G#2 . . . B2 . . . D3 . B2 .' },
    { name: 'padA', wave: 'sine', vol: 0.07, notes: `C4 ${H} | ${BAR} | F4 ${H} | ${BAR} | A4 ${H} | G#4 ${H} | C4 ${H} | G#4 ${H}` },
    { name: 'padB', wave: 'sine', vol: 0.06, notes: `G4 ${H} | ${BAR} | C5 ${H} | ${BAR} | E4 ${H} | D5 ${H} | G4 ${H} | D5 ${H}` },
    { name: 'lead', wave: 'pulse12', vol: 0.06, notes: '. . . . E5 . . G5 . . A5 - - . . . | C6 . A5 . G5 . E5 - - - - . . . . . | . . . . D5 . . F5 . . A5 - - . . . | G5 . F5 . D5 . C5 - - - - . . . . . | . . A4 . C5 . . D5 . D#5 . E5 - - . . | G#4 - - - . . B4 . . D5 . . . . . . | . . . . E5 . . G5 . A5 . C6 . A5 . . | B5 - - - G#5 - - - E5 - - - . . . .' },
  ] },
  field: { bpm: 92, steps: 4, tracks: [
    { name: 'hats', wave: 'drums', vol: 0.05, notes: 'h . . h . . h . h . . h . . h .' },
    { name: 'bass', wave: 'triangle', vol: 0.26, notes: 'D2 . . . . . . . D2 . . . . . F2 . | C2 . . . . . . . C2 . . . . . E2 . | A#1 . . . . . . . A#1 . . . . . D2 . | A1 . . . . . . . A1 . . . C#2 . E2 .' },
    { name: 'keys', wave: 'sine', vol: 0.05, notes: '. . . . F4 . . . . . . . A4 . . . | . . . . E4 . . . . . . . G4 . . . | . . . . D4 . . . . . . . F4 . . . | . . . . C#4 . . . . . . . E4 . . .' },
    { name: 'tension', wave: 'saw', vol: 0.04, on: false, notes: `D4 ${H} | C4 ${H} | A#3 ${H} | A3 ${H}` },
    { name: 'pulse', wave: 'drums', vol: 0.1, on: false, notes: 'k . . . . . k . k . . . . . . .' },
    { name: 'alarm', wave: 'drums', vol: 0.14, on: false, notes: 'k . k . s . . k k . . k s . k .' },
    { name: 'stab', wave: 'square', vol: 0.05, on: false, notes: 'D5 . . D5 . . F5 . E5 . . C5 . . A4 .' },
  ] },
  corner: { bpm: 95, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: 0.22, notes: 'k . . k s . . . k . k . s . . h | k . . k s . . k . . k . s . h h' },
    { name: 'bass', wave: 'triangle', vol: 0.32, notes: 'G2 . . G2 . . A#2 . C3 . . . A#2 . G2 . | G2 . . G2 . . A#2 . D3 . . . C3 . A#2 . | D#2 . . D#2 . . G2 . A#2 . . . G2 . D#2 . | D2 . . D2 . . F#2 . A2 . . . D3 . C3 .' },
    { name: 'keys', wave: 'pulse12', vol: 0.06, notes: 'G4 . A#4 . D5 . . . . . . . C5 . A#4 . | . . . . . . . . . . . . . . . . | D#4 . G4 . A#4 . . . . . . . A4 . G4 . | F#4 - - - . . . . . . . . . . . .' },
    { name: 'lead', wave: 'square', vol: 0.04, on: false, notes: 'D5 . . . D5 . C5 . A#4 . . . G4 . . . | . . . . . . . . . . . . . . . .' },
  ] },
  wire: { bpm: 70, steps: 4, tracks: [
    { name: 'tick', wave: 'drums', vol: 0.04, notes: 't . . . t . . . t . . . t . . .' },
    { name: 'pad', wave: 'sine', vol: 0.06, notes: `E3 ${H} | ${BAR} | C3 ${H} | D3 ${H}` },
    { name: 'bell', wave: 'triangle', vol: 0.04, notes: '. . . . . . . . B4 . . . . . . . | . . . . . . . . . . . . G4 . . . | . . . . . . . . E5 . . . . . . . | . . . . . . . . F#4 . . . . . . .' },
    { name: 'pulse', wave: 'drums', vol: 0.08, on: false, notes: 'k . . . . . . . k . . . . . . .' },
  ] },
  chase: { bpm: 132, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: 0.22, notes: 'k . h k s . h . k k h . s . h h' },
    { name: 'bass', wave: 'saw', vol: 0.12, notes: 'E2 E2 . E2 G2 . E2 . A2 . G2 . E2 . D2 . | E2 E2 . E2 G2 . E2 . B2 . A2 . G2 . F#2 .' },
    { name: 'stab', wave: 'square', vol: 0.05, notes: 'E4 . . . . . E4 . G4 . . . F#4 . . . | E4 . . . . . E4 . B4 . . . A4 . G4 .' },
  ] },
  montage: { bpm: 68, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: 0.08, notes: 'k . . . . . . . s . . . . . h .' },
    { name: 'bass', wave: 'triangle', vol: 0.26, notes: `A2 ${H} | F2 ${H} | C3 ${H} | G2 ${H}` },
    { name: 'chords', wave: 'sine', vol: 0.06, notes: 'A3 . C4 . E4 . C4 . A3 . C4 . E4 . C4 . | F3 . A3 . C4 . A3 . F3 . A3 . C4 . A3 . | C4 . E4 . G4 . E4 . C4 . E4 . G4 . E4 . | G3 . B3 . D4 . B3 . G3 . B3 . D4 . B3 .' },
    { name: 'lead', wave: 'triangle', vol: 0.07, notes: 'E5 - - - . . D5 . C5 - - - . . . . | . . . . A4 . C5 . D5 - - - . . . . | E5 - - - . . G5 . E5 - - - D5 . C5 . | D5 - - - - - - - . . . . . . . . | E5 - - - . . D5 . C5 - - - . . A4 . | C5 - - - . . D5 . E5 - - - . . . . | G5 - - - E5 - - - D5 - - - C5 - - - | B4 - - - - - - - - - - - . . . .' },
  ] },
  versus: { bpm: 104, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: 0.2, notes: 'k . . . s . . k . k . . s . . .' },
    { name: 'bass', wave: 'triangle', vol: 0.3, notes: 'C2 . . C2 . . D#2 . F2 . . . D#2 . C2 . | G#1 . . G#1 . . C2 . D#2 . . . D2 . A#1 .' },
    { name: 'pressure', wave: 'saw', vol: 0.04, on: false, notes: `C4 ${H} | G#3 ${H}` },
    { name: 'clock', wave: 'drums', vol: 0.06, on: false, notes: 'h h h h h h h h h h h h h h h h' },
    { name: 'cash', wave: 'pulse12', vol: 0.05, on: false, notes: 'G4 . . G4 . . A#4 . C5 . . . A#4 . G4 . | D#4 . . D#4 . . F4 . G4 . . . F4 . D#4 .' },
  ] },
};
```
- **Use:** `game.audio.music(SONGS.field, { sync: true })`. Layers are tracks with `on: false`; turn them up with `game.audio.layer('tension', 1, .6)` and down with `layer('tension', 0, 2)`.
- **Gospel loop** for Odessa's kitchen: write 4 bars in C major (I-IV-I-V), sine, vol .05.
- **Jingles:** §11.1.

## Appendix I: Voice profiles (Animalese synth, §11.3)
| id | base Hz | range | syll/s | wave | formant | breath | tics |
|---|---|---|---|---|---|---|---|
| dana | 205 | .22 | 13 | triangle | 1.05 | .10 | — |
| lou | 118 | .18 | 10.5 | sawtooth | .90 | .25 | gravel (+noise) |
| hal | 142 | .15 | 9.5 | sine | .95 | .12 | — |
| ren | 255 | .30 | 15 | square | 1.12 | .08 | — |
| navarre | 135 | .16 | 12 | triangle | .97 | .08 | — |
| pruitt | 112 | .25 | 12.5 | square | .90 | .10 | loud (gain 1.2) |
| ostrowski | 108 | .20 | 11 | square | .88 | .10 | — |
| vance | 220 | .20 | 14 | triangle | 1.08 | .06 | — |
| halloway | 98 | .14 | 9 | sawtooth | .88 | .20 | — |
| easy | 108 | .10 | 9 | sine | .90 | .18 | soft (gain .8) |
| lonnie | 125 | .18 | 11 | sawtooth | .92 | .20 | — |
| tee | 158 | .20 | 13.5 | triangle | 1.00 | .10 | — |
| rook | 102 | .30 | 12 | sawtooth | .87 | .30 | — |
| corey | 188 | .35 | 15.5 | square | 1.05 | .12 | stammer .3 |
| pigeon | 330 | .30 | 15 | square | 1.20 | .05 | — |
| moe | 350 | .30 | 16 | square | 1.22 | .05 | — |
| dink / tavon | 200 / 175 | .25 | 14 | triangle | 1.05 / 1.0 | .08 | — |
| pockets | 172 | .40 | 16 | sawtooth | 1.00 | .35 | — |
| odessa | 238 | .18 | 10 | sine | 1.08 | .15 | vibrato .03 |
| sunday | 128 | .12 | 10 | triangle | .93 | .15 | — |
| dale | 132 | .15 | 11 | square | .95 | .10 | — |
| civilians | seeded: men 100-170, women 190-280, kids 300-360 | .15-.35 | 10-15 | any | .9-1.2 | .05-.3 | — |

**Voiceprint glyph** (voice ID, §6.6): 16 bars. Bar *i* height = `round(8 × (0.5 + 0.5 × sin(base/37 × (i+1) + formant × 3 + wave index)))`, colored by `range`. Deterministic, distinct per profile, shown in the LIVE panel during a call and in the ID strip.

## Appendix J: Data schemas and the feature matrix
**J.1 STATE** (the only thing saved):
```js
{ v: 1, ep: 1, beat: 'e1.cold', played: 0, tips: {},
  meters: { brass: 60, heat: 10, legal: 0, case: 0, fund: 200 },
  flags: { odessaRespect: false, pocketsMet: false, coreyCI: false, wireUp: false, reupSpot: null, dilemma: null, sweep: false,
           wallOff: false, rookFree: true, lossOn: null, pigeonTrust: 0, promise: false, canary: false, coreyExposed: false,
           coreyRescued: false, momSafe: false, path: null, i5: null, danaKnown: false, teeShort: false, rookDrew: false },
  photos: [{ id, subject, t, place, stars, tags, turn, light, ep }],
  evidence: [{ id, kind: 'photo'|'obs'|'stmt'|'page'|'int'|'seizure'|'plate'|'serials', ref, pts, text }],
  facts: ['face:tee', 'obs:corey:stash', 'num:P1:tee' /* … */],
  numbers: { P1: { n: '555-0187', known: true, tapped: false, dead: false, user: 'tee' } /* … */ },
  board: { pins: { lieutenant: 'tee' /* … */ }, links: [['tee','P1'] /* … */] },
  wire: { lines: { P1: 'up' }, logs: [{ call, line, t }], ids: { UM1: 'tee' }, voiceprints: ['tee','rook' /* … */] },
  cipher: { dir: 'cw', solved: { cw: false, ccw: false } },
  crew: { discipline: 1, goodwill: 0, count: 0, stash: 'v1412', phones: 'payphones', knows: ['dana'] },
  stats: { photos: 0, made: 0, minimized: 0, violations: 0, chases: 0, tails: 0, retries: 0 } }
```
**J.2 Mission** (`def('missions', id, {...})`):
```js
{ id: 'photos1', time: 'day', clock: [15, 0, 17, 30], weather: null, music: 'field', player: 'dana', start: [24, 29], partner: null,
  cast: [{ person: 'tee', role: 'lieutenant', at: 'post' }, { person: 'pigeon', role: 'lookout', at: [35, 36, 40] } /* … */],
  civilians: 25, corner: { open: true, rate: .12 }, interactables: ['pocketsAlley', 'busBench', 'marketSoda', 'chevy'],
  objectives: [{ id: 'faces', text: 'Photograph the crew', need: 'facesAll(tee,rook,corey,pigeon)' }, { id: 'reads', need: 'reads>=2' },
               { id: 'pockets', need: 'flag:pocketsMet' }, { id: 'act', optional: true, need: 'photoTag:act' }],
  events: [{ at: '16:10', every: '0:12', do: 'teeCallsP1' }], done: 'all(faces,reads,pockets) && at(chevy)', fail: null, checkpoints: [] }
```
**J.3 Beat** (`EPISODES[n].beats[]`): `{ id: 'e2.box', kind: 'card'|'annex'|'field'|'wire'|'box'|'chambers'|'paper'|'cipher'|'corner'|'ops'|'scene'|'montage', ref, stations?, story?, if?, next? }`.

**J.4 Person** (`def('people', id, {...})`): `{ name, alias, role, rig: { build, size, outfit, hair, hat, hood, sleeves, hunch, colors }, voice, shoes: 'text for Pockets', portrait: { zoom, turn } }`.

**J.5 Call** (`def('calls', id, {...})`): `{ session: 's1', t: '16:40', line: 'P1', from: 'tee', to: 'tavon', type: 'N'|'P'|'T', turnAt?, lines: [['tee','You see the game?'], …], keys: [3], unlock: ['fact:reupRiddle'], if?: 'flag:danaKnown' }`.
Routes: `{ id, waypoints: [[x,y], …], acts: { 3: ['window', 3] }, checkpoints: [4, 9] }`. Escape graphs: `{ nodes: { A: [30,33], … }, edges: [['A','B','run'], …], exits: ['X1','X2'] }`. Interactables: `{ id, at, r, verb, when, act }`. Montage cards: `{ who, if, text }`.

**J.6 Feature matrix** (every feature, where it's taught → where it comes back):
| Feature | Taught | Comes back |
|---|---|---|
| Move/run/crouch/blend/cover, heat and made | Ep1 cold open + 1.4 | every field beat, versus |
| Watch, read roles, photos, polaroids, shoes | 1.4 | 2.3, 3.4 (long lens), 5.3B, versus |
| Eavesdrop, barks, informant | 1.4 | 3.3 (Pockets fallback) |
| Annex hub, car scenes, notebook, Board | 1.3, 1.5 | every episode |
| Tee: order wheel, code card, payphone keypad, the count, counter-surveillance | I1 | I2-I4, versus (Corner) |
| Payphone numbers | 2.3 | affidavit, wire |
| Chase: sprint, vault, tackle, cuff, ditch, search | 2.3 | 5.3A rescue sprint, attract |
| Box (4 approaches, evidence, combo, flip, lawyer) | 2.4 | 3.6 (Rook), 4.7 (kitchen variant) |
| Cipher (turn the pad), known-plaintext flip | 2.5 | 3.3/3.6 live pages |
| Affidavit + necessity honesty + judge | 2.6-2.7 | 4.5 (amendment) |
| Wire: minimize, spot-check, log, voice ID, pages, fast-forward, legal | 3.2-3.3 | 3.6, 4.6 |
| Van stakeout, van heat, plate photo | 3.4 | — |
| Moral choices (dilemma, threat to life, mother, canary, loss) | 3.4 | 3.6, 4.6, I3, I4 |
| Ops choices and Brass/Heat/Legal/Case meters | 1.3 | every episode, endings |
| Tail with partner hand-off | 4.3 | 5.3B (moving cone) |
| Stealth search (trash) | 4.4 | — |
| Raid (plan, breach, flush, search) | 5.3A | — |
| Endings, montage, credits, episode select | 5.6 | — |
| Versus (hidden identity, call-outs, burn, tap, jump-out, bots, split screen, hub) | versus | attract |
| Attract reel, touch-only notice, settings (glyphs, inversion) | title | everywhere |
