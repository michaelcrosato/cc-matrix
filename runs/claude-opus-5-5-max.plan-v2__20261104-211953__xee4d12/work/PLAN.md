# PLAN: an over-the-shoulder action-horror game inspired by the source

You build this alone, from this plan and TASK.md. Nobody can answer questions, so where this plan leaves something open, decide and move on.

## 0. How to use this plan

- **TASK.md is the authority** on rules, deliverables and file names. This plan makes the creative and technical choices TASK.md leaves open, so you don't have to debate them again. If you find something better, change it, but keep the pillars (§1) and everything TASK.md requires.
- **The title is yours.** TASK.md says how to pick it. Nothing in this plan depends on it: the world, story and code read one title file (`src/title.txt`) and name the title nowhere else. Riffs that suit a wine-country setting are welcome in your brainstorm.
- **Paths** are relative to your dev folder. "The single HTML file" and "the exit interview" are the deliverables TASK.md names.
- **[verified]** means the plan's author ran it on this computer on 2026-11-04 against my-3D2dge v0.89.1 and AI Hub client 1.4.0, and it worked as written. Don't re-investigate those; build on them.
- **Read in this order:** TASK.md, this plan, then the header of `engine/my-3d2dge-3d.js` (the 3D manual, 260 lines) and `engine/API.md`. Search `engine/API-INDEX.md` for names; don't read it whole.
- **Keep `NOTES.md`** in the dev folder as you go: issues your tests caught (count them, and mark the game-breaking ones), where you got stuck, what you changed in the engine and why. TASK.md asks for these at the end, and you won't remember them.

## 1. The game

**Pitch.** Days before a state dinner, the President's personal sommelier is kidnapped on a buying trip. Special Agent Vera Cask of the U.S. Excise Bureau goes in alone, on a regional train, to a valley in the Grand Duchy of Vaudrenia, where the harvest has gone wrong: a fungus called the Noble Bloom got into the grapes, and then into the people. She shoots, kicks and haggles her way through a village, a château and a bottling plant, keeping a fearless, insufferable 71-year-old snob alive, to stop the Last Pressing: a vintage that would carry the Bloom to every state dinner on Earth.

**Pillars.** When a choice is unclear, the one that serves these wins.

1. **Every shot is a decision.** Feet planted, a laser dot that wobbles. Head, knee and arm each do something different, and each opens a different follow-up.
2. **Crowds, not waves.** Enemies come on slowly, spread out, surround you and cut you off. Space is the resource you spend.
3. **Protect the worst person you've ever met.** Ambrose is useful, brave, fragile and rude. The player should want to save him and want to strangle him.
4. **Greed between the terror.** Crates, treasure, a duty-free trolley that shouldn't exist, upgrades, arranging your case. Neon means safe.
5. **Deadpan pulp.** Scary for twenty seconds, then someone says something stupid with total sincerity.
6. **Keep escalating.** Something new every five minutes: a toy, an enemy, a set piece.

**What we take from the source, and how we make it our own.** TASK.md asks for what makes the source distinctive, turned into an *original* game. Mechanics and genre conventions are fair game. Its specifics are not.

| What makes the source distinctive | Our original version |
|---|---|
| A lone agent, a rescue, a remote Old World backwater | A federal excise agent, the President's sommelier, a wine valley in a fictional duchy |
| Possessed rural folk, then aristocrats, then a militarised finale | The Pressed (vineyard folk), the Confraternity of the Last Pressing at Château Rémuage, Vane Beverages' bottling plant and private security |
| Over-the-shoulder aim with planted feet; body-part hits open melee | The same genre mechanics with our own moves and numbers: KICK, SLAM, FRISK |
| A parasite that bursts out when the host "dies" | The Noble Bloom: magenta fungal growths, with our own variants (tendril, puffball, crawler) |
| An escort who can wait, hide and get carried off | Ambrose Pell: his Nose finds hidden enemies and weak points, and he tastes his way through puzzles |
| A wandering merchant, weapon tuning, a grid case, treasure sets | The Duty-Free Man and his neon-lit trolley, an evidence case, wine treasures you combine |
| Save points as a ritual | Passport stamps at old customs desks |
| Button prompts in the middle of the action | Prompts everywhere, and one set piece built on them: The Toast |
| Cheesy one-liners, operatic villains on the radio | §11, written fresh |

**Must stay original (hard rule).** No character, place, organisation, item name, enemy design, boss design, line of dialogue, tune, level layout or logo from the source or its series. Don't echo its famous lines, even as a wink. Don't recreate its specific rooms or set pieces beat for beat: if a scene feels like a copy of a remembered one, change the place, the trigger and the payoff. The source's name appears only where TASK.md asks: the title riff and the Source Information. Lay out levels from §12, not from memory of any game.

## 2. Decisions at a glance

| TASK.md item | Decision |
|---|---|
| Genre | Over-the-shoulder action horror: a third-person shooter with a survival-horror economy, escort, puzzles and set pieces. A co-op score-attack mode, Last Stand, sits beside the campaign. |
| Perspective | Third person, over the right shoulder (swappable), tighter when aiming. |
| Title | Yours: 50 riffs in your head, then a real RNG (`node -e "console.log(require('crypto').randomInt(50))"`). Write the winner to `src/title.txt`. |
| Research | Done for you here for engine, hub and design. Do more only if you hit a gap, and report what you actually did. |
| Package | One self-contained HTML file: both engines, three.js, Rapier, clips and game inlined, about 6 to 9 MB. No CDN and no downloads, so it runs offline from `file://` and inside the hub. **[verified]** |
| Tech stack | my-3D2dge (v0.89.1 when this was written): the 2D engine from the handoff package plus its **real-3D add-on `E.World3D`** (three.js r182, Rapier 0.19.3), bundled with esbuild. The handoff README itself sends real-3D games to this add-on. Do not build this on the 2D views. |
| Art direction | The engine's own look: code-drawn, toon-banded low-poly, chunky pixel textures at 16 pixels a metre, a pixel-font HUD, fog and strong lighting. New shapes, materials and bodies for the wine country; store and core props for generic things (§10). |
| Animation | The engine's own systems: its procedural soldier skeleton (IK feet, hands on gun) and its motion-clip store in readable key poses, drawn as pen bodies. New clips and poses for our signature moves (§5). |
| Audio | All Web Audio from code, on the engine's buses. Music slider defaults to 10% **[verified recipe]**. Gibberish voices per speaker (§14). |
| Online | AI Hub Session Protocol v1, `shared-world`, 1 to 4 players: the Last Stand round. On its own: solo Last Stand and 2-player couch split-screen (§16). |
| Performance | Out of scope. Add the detail, enemies, effects, lights and shadows the scene needs. The one exception: a hub round must become ready inside the hub's load limit (§16). |
| Testing | One command, failures and a one-line count only (§17). |
| Effort | Spend it where §18 says it shows. |

**Working rules from TASK.md, applied.** Everything stays in your own folder (not `/tmp`, not a parent). Read only what you need; other agents work beside you and share the machine's ports and processes. One or two browsers at once. Prefer `file://`. The only server you need is for the hub suite (§17): `127.0.0.1`, a port the OS picks, confirm the page is yours, stop it by its own PID. Never `pkill`, `killall` or `fuser -k`. Extra Python packages only via `uv` as TASK.md describes.

## 3. Tech setup (all [verified])

### 3.1 Get the engine (2 seconds, 16 MB; a full clone takes minutes and 150 MB)

Run from the dev folder. The `engine/` tree mirrors the repository's so that the tools' relative paths still work.

```sh
git clone --depth 1 --filter=blob:none --no-checkout https://github.com/michaelcrosato/my-3d2dge.git .repo
git -C .repo sparse-checkout set --no-cone '/dist/handoff/' '/dist/my-3d2dge-3d.js' '/vendor/' '/src/starter3d/' '/src/mocap/' '/tools/anim-set.mjs' '/tools/mocap-lib.mjs' '/tools/kit3d-test.mjs' '/docs/MOCAP.md' '/docs/ENGINE-3D.md' '/CHANGELOG.md'
git -C .repo checkout -q main
mkdir -p engine lib/hub tools src assets tests
cp -r .repo/dist/handoff/. engine/
cp .repo/dist/my-3d2dge-3d.js engine/
cp -r .repo/vendor engine/vendor
cp -r .repo/src/starter3d .repo/src/mocap engine/src/
cp .repo/tools/anim-set.mjs .repo/tools/mocap-lib.mjs .repo/tools/kit3d-test.mjs engine/tools/
cp .repo/docs/MOCAP.md .repo/docs/ENGINE-3D.md .repo/CHANGELOG.md engine/docs/
rm -rf .repo
npm init -y >/dev/null && npm install --no-audit --no-fund playwright@1.63.0
for f in session.js harness.html bridge.js round.js README.md; do curl -fsSL "https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/$f" -o "lib/hub/$f"; done
```

Never run `npx playwright install`, even though the handoff README says to: the browsers are already on this computer, and TASK.md forbids it. You may edit anything under `engine/`.

**The setup takes `main`, as TASK.md links, and `main` moves:** it gained TV menus and sound loops while this plan was being written. `engine/API.md`'s first line says what you got, and the top of `engine/docs/CHANGELOG.md` says what changed since v0.89.1. If a recipe here breaks and you can't quickly see why, go back to the commit it was verified on: after the `sparse-checkout` line, run `git -C .repo fetch -q --depth 1 --filter=blob:none origin 8ecc2f62353761187bdfe226f327b7ea5d2eb691` and check out `FETCH_HEAD` instead of `main`.

Files to copy from, not read whole:

- `engine/src/starter3d/30-shooter.js`: the over-the-shoulder camera, look, gunplay, soldier skeleton, tracers, decals, ladders, mantles, gunmen's AI.
- `engine/src/starter3d/40-horror.js`: doors, keys, item box, saves, grabs, flow-field AI, and a bot that plays a whole game.
- `engine/src/starter3d/00-shell.js`: what those two expect around them.

### 3.2 Folder layout

```
engine/   the engine, its docs, tools and asset store     lib/hub/  session client and test harness, unmodified
assets/   clips.js (cut clips), sets.js (cut asset sets)  tools/    build.mjs, patch-engine.mjs, level-check.mjs
tests/    run.mjs, suites/                                .build/   bundler output (not a deliverable)
src/      title.txt, main.js, and:
  core/    config, Tune table, Run state, registry (def), events, FEATURES, about data
  body/    soldier pose, clip pose, looks, drawers, hit zones
  player/  controller, camera, weapons, melee, grenades, traversal
  ai/      director, one file per enemy, bosses/, ally (Ambrose)
  world/   materials, shapes, legend, zone loader, doors, links, barricades, pickups, encounters
  zones/   one data file per zone (pure data, so Node tests can import them)
  ui/      prompts, focus, hud, case, trolley, map, passport, results, title, about, dev, gameover
  story/   dialog, voices, cutscene helpers, qte, lines/
  audio/   sfx, music engine, songs/
  modes/   campaign, laststand, net (hub), attract, bots
```

### 3.3 The build

**`tools/build.mjs`**

```js
// node tools/build.mjs <path of the single HTML file>   (run from the dev folder)
import { readFileSync as read, writeFileSync as write, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const out = process.argv[2], V = resolve('engine/vendor'), T3 = V + '/three-0.182.0', txt = f => read(f, 'utf8');
const esc = s => s.replace(/<\/script/gi, '<\\/script');   // a script's text must not close its tag early
mkdirSync('.build', { recursive: true });
execFileSync('esbuild', ['src/main.js', '--bundle', '--format=esm', '--target=es2022', '--legal-comments=none', '--minify-syntax', '--minify-whitespace', '--loader:.txt=text',
  `--alias:three/webgpu=${T3}/three.webgpu.min.js`, `--alias:three/tsl=${T3}/three.tsl.min.js`, `--alias:three=${T3}/three.webgpu.min.js`,
  `--alias:@dimforge/rapier3d-simd-compat=${V}/rapier3d-simd-compat-0.19.3/rapier.js`, '--outfile=.build/game.js', '--log-level=warning'], { stdio: 'inherit' });
const classic = ['engine/my-3d2dge.js', 'engine/src/mocap/readable.js', 'engine/src/mocap/mocap.js', 'assets/clips.js'];   // cut asset sets go here too
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${txt('lib/hub/session.js')}</script>
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="4">
<meta name="hub:session-goal" content="Survive the harvest and outscore your crew">
<meta name="hub:session-howto" content="Move WASD/stick, aim right click/L2, fire left click/R2, kick E/Cross">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${txt('src/title.txt').trim()}</title>
<style>html, body { margin: 0; height: 100%; overflow: hidden; background: #000 }</style></head><body>
<div id="stage" style="position:relative;width:100%;height:100%;overflow:hidden"><canvas id="view"></canvas><canvas id="screen" style="position:absolute;inset:0;width:100%;height:100%"></canvas></div>
${classic.map(f => `<script>${esc(txt(f))}</script>`).join('\n')}
<script>if (!self.GPUShaderStage) self.GPUShaderStage = { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 };</script>
<script type="module">${esc(txt('.build/game.js'))}</script></body></html>`;
write(out, html); console.log('wrote ' + out + ' ' + (html.length / 1e6).toFixed(1) + ' MB');
```

Why it looks like this:

- `session.js` must be the first script, right after `<meta charset>`, pasted unmodified. The hub swaps in new versions by matching it.
- The `GPUShaderStage` line is required. Without it, three's WebGPU build crashes on load in browsers with no WebGPU, such as Firefox on Linux.
- Inline module scripts run fine on `file://`. Rapier's wasm is embedded as base64, so nothing is fetched.
- The kit's determinism hash came out **identical on Chromium (WebGL 2 and WebGPU), WebKit and Firefox** from a file built this way.

### 3.4 Two engine patches: apply once, right after §3.1

**Without the first patch, every zone change crashes on WebGPU**, which is what Chromium uses on a machine with a GPU: `world.dispose()` throws inside three. WebGL-only tests never see it. The second patch lets the attract mode show behind the touch-only notice, as TASK.md wants. Record both in `NOTES.md`: TASK.md asks what you changed in the engine.

**`tools/patch-engine.mjs`**

```js
// node tools/patch-engine.mjs   (run once from the dev folder, right after getting the engine)
import { readFileSync as read, writeFileSync as write } from 'node:fs';
const patch = (file, from, to) => { const s = read(file, 'utf8'); if (s.includes(from)) write(file, s.replace(from, to)); else console.log(`patch skipped, the engine has changed here (fixed upstream? the webgpu suite will say): ${from.slice(0, 60)}`); };
// 1. world.dispose() throws inside three on WebGPU: dispose each thing once, and let one failure not stop the rest
patch('engine/my-3d2dge-3d.js',
`    this.scene.traverse(o => { if (o.isMesh) { o.geometry && o.geometry.dispose(); } });
    for (const x of this._owned) if (x && x.dispose) x.dispose();`,
`    const gone = new Set(), safely = x => { if (!x || !x.dispose || gone.has(x)) return; gone.add(x); try { x.dispose(); } catch (e) { /* WebGPU: nothing was uploaded to destroy */ } };
    this.scene.traverse(o => { if (o.isMesh) safely(o.geometry); });
    for (const x of this._owned) safely(x);`);
// 2. the touch-only notice hid the attract mode behind 88% black: make it lighter, and put it at the bottom
patch('engine/my-3d2dge.js',
  'display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;background:rgba(5,3,12,.88)',
  'display:flex;align-items:flex-end;justify-content:center;padding:24px;text-align:center;background:rgba(5,3,12,.35)');
```

### 3.5 First boot: start from this

Paste it into `src/main.js`, put any title in `src/title.txt`, run the patch, cut the clips, build, and open the file. You get a dusk village in real 3D, an over-the-shoulder camera with mouse and right stick, planted-feet aiming with a laser, a crowd that comes on by flow field, the engine's menus at TV size, and a hub round that passes all four harness cases. **Grow this into the game; don't start again from an empty file.** Its look (sky, fog, sun, `outlines: false`, `res: 'balanced'`) is the agreed starting point.

```sh
node tools/patch-engine.mjs
echo 'ANY TITLE FOR NOW' > src/title.txt
(cd engine && node tools/anim-set.mjs src/mocap/sets/quaternius.js src/mocap/sets/mesh2motion.js src/mocap/sets/cmu.js --name CLIPS --out ../assets/clips.js --clips "QUATERNIUS:Idle_Loop,QUATERNIUS:Walk_Loop,QUATERNIUS:Walk_Formal_Loop,QUATERNIUS:Jog_Fwd_Loop,QUATERNIUS:Sprint_Loop,QUATERNIUS:Idle_FoldArms_Loop,QUATERNIUS:Idle_Talking_Loop,QUATERNIUS:Idle_Lantern_Loop,QUATERNIUS:Idle_Rail_Loop,QUATERNIUS:Sitting_Idle_Loop,QUATERNIUS:Sitting_Talking_Loop,QUATERNIUS:Zombie_Idle_Loop,QUATERNIUS:Zombie_Walk_Fwd_Loop,CMU:Zombie_Walk_Loop,CMU:Wounded_Walk_Loop,CMU:Hurt_Stomach_Walk_Loop,CMU:Looking_Around,QUATERNIUS:Zombie_Scratch,CMU:Chop_Wood,QUATERNIUS:Melee_Hook,QUATERNIUS:OverhandThrow,QUATERNIUS:Sword_Dash_RM,QUATERNIUS:Idle_Shield_Loop,QUATERNIUS:Idle_Shield_Break,QUATERNIUS:Hit_Chest,QUATERNIUS:Hit_Head,MESH2MOTION:Dizzy,MESH2MOTION:Kneeling Tired,QUATERNIUS:Hit_Knockback,QUATERNIUS:LayToIdle,CMU:Fall_On_Face,CMU:Get_Up_Face_Down,QUATERNIUS:Death01,MESH2MOTION:Death_A,MESH2MOTION:Death_B,MESH2MOTION:Death_C,MESH2MOTION:Defend,CMU:Duck_Thrown_Object,MESH2MOTION:Crawl,MESH2MOTION:Climb Ladder,QUATERNIUS:ClimbUp_1m_RM,CMU:Run_Jump_Over,MESH2MOTION:Land_Three_Point,QUATERNIUS:Push_Loop,CMU:Roundhouse_Kick,CMU:Side_Kick,CMU:Front_Kick,QUATERNIUS:Consume,CMU:Drink_Water,QUATERNIUS:PickUp_Table,QUATERNIUS:Walk_Carry_Loop,CMU:Carry_Heavy_Box,MESH2MOTION:Greeting")
```

That is 53 clips and 350 KB. Add more whenever you need them (`engine/src/mocap/catalogs/*.json` describes every clip). Then build into the root, beside the dev folder: `node tools/build.mjs ../<the single HTML file>`.

**`src/main.js`**

```js
// The first boot: real 3D on one file, an over-the-shoulder camera, a clip-driven pen body, the hub's round. Grow it into the game.
import '../engine/my-3d2dge-3d.js';   // first: it adds E.World3D to the 2D engine
import GAME_TITLE from './title.txt';
const E = My3D2dge, W3 = E.World3D, PI = Math.PI, hubOn = AIHub.active;

const KEYS = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  aim: ['Mouse2', 'Pad6'], fire: ['Mouse0', 'Pad7'], act: ['KeyE', 'Space', 'Pad0'], sprint: ['ShiftLeft', 'Pad1'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'] };
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, bg: null, input: KEYS, touch: 'never', autoPause: !hubOn, live: hubOn, menu: { quit: false, items: [['Sound', () => ui.show('sound')], ['Controller', () => ui.show('pad')]], settings: [
  ...W3.SETTINGS.filter(s => s.key !== 'look3d').map(s => s.key === 'picture3d' ? { ...s, value: 'balanced' } : s),
  { key: 'music', value: .1 },   // the Music slider starts at 10%
  { key: 'glyphs', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']] }] } });
// Ten feet: the engine's menus at TV size (14 px text without this), without their small print, and settings on short pages
const ui = new E.Shell(game, { tv: true, screens: { sound: { title: 'Sound', rows: ['sound', 'volume', 'music', 'effects'] }, pad: { title: 'Controller', rows: ['glyphs', 'invertY', 'deadzone', 'rumble'] } } });
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: '.esh-row small{display:none}' }));
ui.root.addEventListener('pointerover', e => { const b = e.pointerType === 'mouse' && e.target.closest('button, input'); if (b) b.focus(); });   // (hover moves the focus: these menus don't do it themselves)

/* ---- materials and shapes of our own: a material's fn returns [r, g, b] (a hex string bakes black) ---- */
const hx = E.hex;
W3.SIDE.plaster = { w: 32, h: 48, fn(x, y) {   // lime plaster over timber, a rubble course below
  const z = 47 - y; if (x % 16 < 2 || z > 44 || (z > 14 && z < 17)) return hx(E.hash2(x, y) < .2 ? '#3a2616' : '#4c3220');
  if (z < 14) { const r = Math.floor(z / 5), off = r % 2 ? 3 : 0; return hx((x + off) % 7 === 0 || z % 5 === 0 ? '#3a3630' : E.hash2(((x + off) / 7) | 0, r) < .4 ? '#6e675a' : '#7f7768'); }
  return hx(E.hash2(x * 3, y * 7) < .07 ? '#a89a7c' : E.hash2(x, y) < .15 ? '#d6c8a4' : '#c8bb96'); } };
W3.GROUND.cobble = (x, y) => { const h = E.hash2(Math.floor(x / 5), Math.floor(y / 5)), k = 70 + h * 34; return x % 5 < 1 || y % 5 < 1 ? [46, 40, 34] : [k + 8, k, k - 8]; };
E.SHAPES.roofA = { about: 'gable roof', mats: { r: 'shingle' }, parts: [['prism', 'r', [0, 0, 0], [[-50, -1], [50, -1], [0, 44]], 131, { axis: 'x' }]] };
E.SHAPES.vinerow = { about: 'trained vines on posts and wire, heavy with fruit', mats: { p: 'walnut', l: 'leaves', g: '#4a2348 glaze' }, parts: [['row', 5, [16, 0, 0], ['box', 'p', [0, 0, 0], [1.5, 1.5, 26]]], ['box', 'l', [0, 0, 11], [68, 6, 15]], ['row', 9, [8, 0, 0], ['ball', 'g', [0, 3.6, 12], 2.1]], ['row', 9, [8, 0, 0], ['ball', 'g', [4, -3.6, 13], 2]]] };
E.SHAPES.press = { about: 'a great wooden wine press: slatted basket, iron screw, beam', mats: { w: 'oak', i: 'iron', d: 'walnut' }, parts: [['cyl', 'w', [0, 0, 0], 22, 22], ['ring', 12, 22.5, ['box', 'd', [0, 0, 0], [3, 2, 23]]], ['cyl', 'i', [0, 0, 14], 3, 56], ['box', 'd', [0, 0, 56], [64, 7, 7]], ['mirror', 'x', ['box', 'd', [30, 0, 0], [7, 7, 62]]], ['cyl', 'i', [0, 0, 22], 21, 2]] };

/* ---- a level is text, one character a metre. W: a window (sill and lintel, an opening you see and shoot through) ---- */
const LEVEL = { rows: [
  'vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv',
  'v......................................................v',
  'v..V.......V.......V......................V.......V....v',
  'v......,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,.........v',
  'v...HHWHHHHW,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,HHHWHH.......v',
  'v...H......H,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,H.....H......v',
  'v...H......W,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,W.....H......v',
  'v...H......H,,,,,,,z,,,,,,,,,,,,,z,,,,,,,,H.....W......v',
  'v...H.......,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,.....H......v',
  'v...H......H,,,,z,,,,,,,,,,,,,,,,,,z,,,,,,H.....H......v',
  'v...HHHHHHHH,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,HHHHHHH......v',
  'v......,,,,,,,,,,z,,,,,,,,,,,,,,,z,,,,,,,,,,,,.........v',
  'v...B..,,,,c,,,,,,z,,,,,,,,,,,,z,,,,,,,,c,,,,,..B......v',
  'v......,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,.........v',
  'v......,,,,,,,,,,,,,,,,,,,,@,,,,,,,,,,,,,,,,,,.........v',
  'v......,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,.........v',
  'v..V.......V.......V......................V.......V....v',
  'v......................................................v',
  'vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv'],
  ground: 'dirt', colors: { base: '#4c4a2c', dark: '#3e3f26', light: '#5a5632' }, legend: {
    v: { wall: 96, side: 'earth', color: '#2a2a24', top: '#20261c' }, ',': { ground: 'cobble' }, H: { wall: 48, side: 'plaster', top: '#5a3a2a' },
    W: { wall: 14, side: 'plaster', platform: 48, thick: 16 }, V: { shape: 'vinerow', solid: true }, B: { shape: 'barrel' }, c: { shape: 'cart', facing: .6, ground: 'cobble' },
    z: { mark: 'z', ground: 'cobble' }, '@': { mark: 'start', ground: 'cobble' } } };

/* ---- a body: motion clips drive body points (millimetres, forward/right/up), the pen draws limbs over them ---- */
const lib = Mocap.load(MOCAP.CLIPS), MM = .016, buf = new Float32Array(lib.P * 3);   // 16 units a metre
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], nrm = a => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function drawBody(pen, a, X, c) {
  const co = Math.cos(a.facing), si = Math.sin(a.facing), P = n => { const i = lib.idx[n] * 3, f = X[i] * MM, r = X[i + 1] * MM; return [a.x + co * f - si * r, a.y + si * f + co * r, a.z + X[i + 2] * MM]; };
  const tube = (p, q, r, col) => pen.tube(p[0], p[1], p[2], q[0], q[1], q[2], r, col), ball = (p, r, col) => pen.ball(p[0], p[1], p[2], r, r, r, col), slab = (p, q, ac, w, t, col) => pen.slab(p[0], p[1], p[2], q[0], q[1], q[2], ac[0], ac[1], ac[2], w, t, col);
  const pel = P('pelvis'), che = P('chest'), nek = P('neck'), hed = P('head'), top = P('headTop'), face = nrm(sub(P('faceF'), hed)), rt = nrm(sub(P('shR'), P('shL'))), rtP = nrm(sub(P('hipR'), P('hipL'))), up = nrm(sub(top, hed));
  for (const s of 'LR') { const kn = P('knee' + s), an = P('ankle' + s); tube(P('hip' + s), kn, 2, c.pants); tube(kn, an, 1.4, c.pants); ball(kn, 1.5, c.pants); slab(add(an, [0, 0, -.6]), add(P('toe' + s), [0, 0, .3]), rt, 2.3, 1.6, c.boot); }
  slab(add(pel, [0, 0, .4]), che, rtP, 6.6, 4.2, c.shirt); slab(che, nek, rt, 7, 3.9, c.shirt); slab(add(pel, rtP, -3.1), add(pel, rtP, 3.1), face, 3.4, 4.3, c.belt);
  for (const s of 'LR') { const sh = P('sh' + s), el = P('elbow' + s), wr = P('wrist' + s); ball(sh, 1.9, c.shirt); tube(sh, el, 1.35, c.shirt); tube(el, wr, 1.1, c.skin); ball(P('fist' + s), 1.1, c.skin); }
  tube(nek, hed, 1, c.skin); const hc = add(hed, sub(top, hed), .45); pen.ball(hc[0], hc[1], hc[2], 2.2, 2.2, 2.5, c.skin); const cap = add(hc, up, .9); pen.ball(cap[0], cap[1], cap[2], 2.45, 2.45, 1.9, c.hair);
  if (c.eyes) for (const k of [-1, 1]) { const e = add(add(hc, face, 2.05), rt, k * .85); pen.glow(e[0], e[1], e[2], .34, c.eyes); }
}
const VERA = { skin: '#d8ae8c', hair: '#2a1c14', shirt: '#2e3e58', pants: '#23242c', boot: '#17140f', belt: '#3a2a1a' }, PICKER = { skin: '#b89a80', hair: '#4a3a24', shirt: '#7a6a4c', pants: '#3a3430', boot: '#231f1b', belt: '#2a2018', eyes: '#ff5a2a' };

/* ---- the world and one scene: over the shoulder, feet planted to aim, the crowd comes on ---- */
let world, flow, hero, crowd = [], yaw = -PI / 2, pitch = -.05, aimK = 0, heroT = 0, sendT = 0, info = null;
const mouse = [0, 0], dir = [0, 0], focus = { x: 0, y: 0, z: 0 };
function buildWorld() {
  world = new W3(game, { level: LEVEL, res: 'balanced', outlines: false, sky: ['#27284a', '#e8955a'], fog: { color: '#b07a5a', near: 180, far: 900 }, ambient: ['#a4a8d0', '#6a5038', 2.1],
    sun: { color: '#ffb070', intensity: 2.6, dir: [.72, .42, -.45], area: 900, shadow: true, map: 2048 }, lights: 2, camera: { mode: 'fixed', capture: true }, onDraw: w => {
      for (const e of crowd) { lib.sample(lib.clip(Math.hypot(e.vx, e.vy) > 4 ? 'Zombie_Walk_Loop' : 'Zombie_Idle_Loop'), e.data.t, buf); drawBody(w.pen, e, buf, PICKER); }
      if (!hero) return; lib.sample(lib.clip(aimK > .5 ? 'Idle_Loop' : Math.hypot(hero.vx, hero.vy) > 8 ? 'Jog_Fwd_Loop' : 'Idle_Loop'), heroT, buf); drawBody(w.pen, hero, buf, VERA);
      if (aimK > .5) { const cp = Math.cos(pitch), d = [Math.cos(yaw) * cp, Math.sin(yaw) * cp, Math.sin(pitch)], o = [hero.x + d[0] * 8, hero.y + d[1] * 8, hero.z + 21], hit = w.ray(o[0], o[1], o[2], d[0], d[1], d[2], 600, { skip: hero }), L = hit ? hit.dist : 600, p = add(o, d, L); w.pen.bar(o[0], o[1], o[2], p[0], p[1], p[2], .3, .3, '#ff2a1a'); w.pen.glow(p[0], p[1], p[2], 1, '#ff3a2a'); }
    } });
  world.prepare();
}
const play = { pausable: true, view: 'iso',
  enter() {
    world.reset(); flow = world.flow(); world.shape('press', 27.5 * 16, 7.5 * 16, 0, { solid: true }); world.shape('roofA', 8 * 16, 7.5 * 16, 48, { facing: 0 });   // (world.reset takes these away: place them again)
    const s = world.marks.start[0]; hero = info && info.server ? null : world.hero({ x: s.x, y: s.y, r: 4.5, half: 9, visible: false, shadow: false });
    crowd = world.marks.z.map((m, i) => { const e = world.mob({ x: m.x, y: m.y, r: 5, half: 8, visible: false, shadow: false }); e.data.t = i * .37; return e; });
    world.camera.set('fixed'); world.camera.follow(hero || crowd[0]); world.camera.target = focus;
  },
  update(dt) {
    const I = game.input, h = hero;
    if (h) {
      world.camera.takeMouse(mouse); yaw += mouse[0] * .0021; pitch = E.clamp(pitch - mouse[1] * .0021, -1.2, 1.2);
      const a = I.padAim; if (a) { yaw += a[0] * 2.4 * dt; pitch = E.clamp(pitch - a[1] * 1.8 * dt, -1.2, 1.2); }
      aimK = E.approach(aimK, I.down('aim') ? 1 : 0, dt * 6); heroT += dt;
      const m = I.move(), fx = Math.cos(yaw), fy = Math.sin(yaw), sp = aimK > .05 ? 0 : I.down('sprint') ? 88 : 52, mx = fx * -m[1] - fy * m[0], my = fy * -m[1] + fx * m[0];
      h.vx = E.approach(h.vx, mx * sp, 700 * dt); h.vy = E.approach(h.vy, my * sp, 700 * dt);
      if (aimK > .05) h.facing = yaw; else if (Math.hypot(mx, my) > .1) h.facing = E.approachAng(h.facing, Math.atan2(my, mx), dt * 10);
      const cp = Math.cos(pitch), f = [fx * cp, fy * cp, Math.sin(pitch)], piv = [h.x - fy * 12, h.y + fx * 12, h.z + 31], want = E.lerp(42, 30, aimK), ray = world.ray(piv[0], piv[1], piv[2], -f[0], -f[1], -f[2], want + 4, { skip: h, level: true }), d = ray ? Math.max(6, ray.dist - 3) : want;
      world.camera.fixed = { x: piv[0] - f[0] * d, y: piv[1] - f[1] * d, z: piv[2] - f[2] * d, yaw, pitch, roll: 0, fov: E.lerp(60, 46, aimK), near: 2 };
      focus.x = h.x + fx * 320; focus.y = h.y + fy * 320; focus.z = h.z + 10;
    } else world.camera.fixed = { x: 400, y: 500, z: 200, yaw: -PI / 2, pitch: -.5, roll: 0, fov: 60, near: 2 };
    if (!info || info.isHost) { flow.to(h ? h.x : 400, h ? h.y : 200); for (const e of crowd) { e.data.t += dt; const near = h && Math.hypot(h.x - e.x, h.y - e.y) < 26; if (!near && flow.dir(e.x, e.y, dir)) { e.vx = dir[0] * 24; e.vy = dir[1] * 24; e.facing = E.approachAng(e.facing, Math.atan2(dir[1], dir[0]), dt * 4); } else e.vx = e.vy = 0; } }
    if (info && AIHub.time() > -3000 && (sendT -= dt) <= 0) { sendT = 1 / 12; AIHub.send(info.isHost ? { t: 's', e: crowd.map(e => [Math.round(e.x), Math.round(e.y)]) } : { t: 'i', x: h ? Math.round(h.x) : 0, y: h ? Math.round(h.y) : 0 }, info.isHost ? { reliable: false } : { to: info.host, reliable: false }); }
    world.step(dt);
  },
  draw(r) { world.draw(r); r.overlay(g => E.font.text(g, GAME_TITLE.trim(), 8, r.H - 16, '#e8e0d0', { outline: '#000' })); }
};
async function main() {
  info = hubOn ? await AIHub.connect({ mode: 'shared-world', seats: [1, 4] }) : null;
  if (info) {
    AIHub.on('message', (d, from) => { if (d.t === 's' && !info.isHost) d.e.forEach(([x, y], i) => crowd[i] && crowd[i].place(x, y, crowd[i].z)); });
    AIHub.on('time-up', () => { if (info.isHost) AIHub.finish({ standings: [info.players.map(p => p.id)] }); });
    AIHub.on('end', () => game.audio.mute());
  }
  game.start({ scenes: { play }, scene: 'play', boot: { title: GAME_TITLE.trim(), steps: [['The 3D engine', () => W3.init(game)], ['The valley', buildWorld]] } });
  if (info) { await game.booted; AIHub.ready(); }
  window.__game = { game, get world() { return world; }, get hero() { return hero; } };
}
main();
```

### 3.6 Facts and traps

Each of these cost the author time, or would have.

**Testing the 3D**
- `engine/tools/check.mjs` and `filmstrip.mjs` read the clear 2D canvas, so on a real-3D game they **falsely fail** ("the screen stayed one flat color"). Don't use them or act on their look notes. Use your own runner (§17) and `page.screenshot()`.
- Headless Chromium defaults to WebGL 2 here, which is what most tests should use.
- **Real players run WebGPU, so test it too.** Plain headless WebGPU loses its device (`Instance dropped in popErrorScope`, `Device Lost`) because headless can't present. Copy `standInCanvas` from `engine/tools/kit3d-test.mjs` (around line 250), add it with `addInitScript`, and launch with `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-webgpu-adapter=swiftshader --disable-vulkan-surface`. With it, zone swaps ran clean and `__readFrame(2)` returned a real PNG.
- Headless Firefox has no WebGL. Run it headed under `xvfb-run` with `firefox_user_prefs: { 'webgl.force-enabled': true }`.

**The picture**
- A custom `W3.SIDE` or `W3.GROUND` function must return `[r, g, b]` (use `E.hex('#...')`). A hex string bakes **pure black**.
- `{ wall: 14, side: 'plaster', platform: 48, thick: 16 }` on one tile makes a window: a sill and a lintel, with an opening you can see and shoot through.
- Doors are floor-tile gaps with a `world.thing('door', ...)` in them. Roofs are `E.SHAPES` entries placed on top of the walls with `world.shape`.
- `world.reset()` removes everything placed with `world.shape()` (legend shapes stay). Place them again after a reset.
- The ground bakes into one 2048-pixel texture, so zones up to **128 × 128 tiles** keep full texture detail.
- `outlines: false` plus `camera.target` set about 20 m ahead of the eye gives the clean look and centres the sun's shadow where the player looks. With outlines on, pen bodies look heavy and blobby.
- World options reserve lights up front: `lights: n` for `world.light`, `spots: n` for `world.flashlight`.
- World3D's rules from its manual: WebGPURenderer and node materials only; no `ShaderMaterial`, `EffectComposer` or addons. Make meshes and lights when the world is made, not mid-game. An InstancedMesh over 1,000 instances never uses `DynamicDrawUsage`.
- Pens empty after every frame: draw in the world's `onDraw`, whichever scene is showing. Pen batches grow by themselves, so crowd size has no cap.

**Levels and movement**
- One walkable height per tile. `{ floor: h }` is solid down to the ground, so "upstairs" exists only above something solid: a mezzanine at the back of a house, a balcony ring over pillars. Platform slabs can be walked on but are not in the flow grid.
- `flow` climbs stairs and drops off ledges but never jumps, climbs ladders, goes through windows or knows about door things. Those are **links** (§8). One `world.flow()` per target; `flow.to` is cheap while the target stays on one tile.
- `a.place(x, y, z)` moves an actor regardless of collision. Scripted traversal (vault, ladder, drop, grab, cutscene marks) moves the actor with `place` each step.
- `E.Body`, `Platformer` and the 2D `TileMap` are not used. The 2D engine still runs scenes, input, menus, saves, sound and the HUD.

**Input**
- `game.input.padAim` is the right stick, `world.camera.takeMouse(out)` the captured mouse, `game.input.value('fire')` a trigger's travel.
- `input.label(a)` follows the last device, but it treats keyboard and mouse as two devices, so a prompt would flip between `E` and `Left click`. Route every prompt through one helper (§13).

**Clips**
- Body points are millimetres; `MM = .016` converts them to engine units (16 units a metre).
- Clip names repeat across sets, so name them `SET:Clip` when cutting.
- CMU clips carry lead-in and tail (`Roundhouse_Kick` is 6 s for one kick). Find the strike's window and play only that range.

**Determinism**
- Gameplay randomness comes from `E.rng(seed)` (in a hub round, `AIHub.rng(label)`). Never `Math.random` in rules.
- The same inputs then give the same `world.hash()`: that is your determinism test and your replay check.
- Build the game so `step(dt, ctl)` runs headless inside a page (§4). The horror kit's bot played a whole game of 12,000 steps in about 1.2 s this way.

## 4. Architecture

A spine, then content. Content never edits the core (the engine's own lesson from its biggest game; see "Building a big game" in `engine/AI_GUIDE.md`).

- **Registries as a language:** `def('enemy' | 'weapon' | 'item' | 'zone' | 'boss' | 'song' | 'line', id, spec)`. Weapons, enemies, items, prices and zones are plain data in their own files. Someone with a text editor can add a zone, enemy or gun without touching systems. That's what TASK.md means by "could later be built out with normal designer tools".
- **One `Run` object** holds everything a save needs, as ids and numbers only: chapter, zone, spawn, flags, dead and taken ids per zone, hero and ally state, case layout, weapons and levels, crowns, stats, difficulty, tension. `Run.toSave()` and `Run.fromSave()` are the only way in or out.
- **One rule path:** `step(dt, ctl)` is the only function that changes gameplay. `ctl` is `{ move: [x, y], look: [dx, dy], stick2, down(a), pressed(a), use(a) }`. A human's `ctl` reads `game.input`. A bot's comes from a script. A remote player's comes from network messages. The attract mode and tests take the same path as the player.
- **Pose in update, draw reads the pose.** Bodies pose in the fixed step, not in draw (the kit poses in draw; move it). Hit tests then run against real joints in headless runs, and replays stay exact. Steps are 1/120 s, so it stays smooth. Far or unseen bodies can pose every few steps.
- **An event bus:** `emit('kill' | 'hit' | 'pickup' | 'stamp' | ...)`. Stats, the Director, score, audio and coverage listen, rather than being wired through the combat code.
- **Coverage:** `FEATURES` in `src/core/features.js` lists every mechanic (§12.2), and code marks `Run.coverage[id]` when one happens. The scripted playthrough must touch them all. That is how you prove the demo shows ALL features.
- **Tune:** every number a dev slider touches lives in one `Tune` table that systems read each step (§15).
- **Scenes:** `title`, `play` (campaign zones), `attract`, `laststand`, `card` (hub card), `credits`. Screens over `play` (case, trolley, map, passport, dev) are modes inside the scene that freeze the world, as the horror kit's item screen does.
- **Zones:** one `World3D` per zone, built on entry behind a fade and a chapter card, and disposed on exit **[verified with the §3.4 patch: about 0.4 s even on a software renderer]**. Each zone's data sets its own light, fog and sky. Boot builds only what the first screen needs. In a hub session, build only the arena.
- **Saves and checkpoints:** autosave at each zone entry and before each boss (`game.saves.autosave()`); stamp desks write the three slots (`game.saves.write = () => ({ data: Run.toSave(), place, level })`). Death offers Continue from the latest. Title's Continue uses `saves.latest()`. Keep a `version` in the save. The attract mode, tests' bots and hub rounds never write saves.
- **Debug handle:** `window.__game = { game, Run, step, bots, ... }` and `game.debug = { snapshot() {...} }`.

## 5. Bodies and animation

TASK.md: use the engine's native animation system as the base, and make new animations for what makes the game feel like the source. **[verified]** The engine's puppet `E.Humanoid` looks crude this close to the camera (ball head, no visible gun) and its cards look coarse. The two pipelines below are also engine-native and hold up over the shoulder, so use these instead.

**Pipeline A, soldier skeleton (anyone who holds a gun: Vera, Sister Perpetua, Vane Security, Last Stand characters).** Copy `v3..spring`, `body`, `settle`, `pose`, `gunFrame`, `handTargets`, `deadPose`, `drawGun`, `muzzleFlash` and `reloadCurve` from the shooter kit (lines 648 to 1054). You get planted IK feet, a spine that leans and twists, hands on the gun, aim, recoil, reload, ladder and ledge poses, a kick, hit springs and a death fold. Then:
- Write your own `drawVera`, `drawGuard` and so on after `drawSoldier`'s pattern: slabs and tubes over `J`.
- Add pistol, magnum and SMG to `drawGun`.
- Give `pose()` a no-helmet head and a shoulder swap.
- **Vera's back is on screen for the whole game.** Give it the most care: a navy windbreaker with EXCISE in yellow block letters (a small plane mesh with a baked canvas texture, made with the world and placed on her chest frame, or slabs), a dark bob. Hide her body when the camera is pulled closer than about 12 units.

**Pipeline B, clip bodies (melee enemies, Ambrose, the Duty-Free Man, villains, cutscene actors).** `lib.sample(clip, t, buf)` gives 36 named body points, and a drawer draws limbs over them with the pen (`drawBody` in §3.5 is the template; the look is **[verified]**).
- Use `lib.blend(a, b, k)` to crossfade clips over about 0.15 s.
- Add a small lean spring on the chest and head for hit reactions, so a shot visibly rocks them.
- Scale playback to ground speed so feet don't skate: `t += dt * speed / clipSpeed`.
- Actors are invisible physics capsules: `world.mob({ visible: false, shadow: false })` or `world.hero(...)`. The pen's parts cast shadows by themselves.
- `a.setSolid(false)` when they die, so the crowd walks over them.

**Variety.** One drawer per archetype, many looks: palette sets, then hats (flat cap, headscarf, straw hat, wicker basket), aprons, tools in the right fist (pitchfork, pruning hook, sickle, mattock, vine shears), wine stains, a Bloom growth on neck or shoulder. Seed each from its id so a save restores the same villager. Giants: scale the point positions (`MM * k`) and limb radii.

**Which clip for what** (all in the §3.5 set):

| Need | Clip |
|---|---|
| Shamble, idle, limp | `Zombie_Walk_Loop`, `Zombie_Walk_Fwd_Loop`, `Zombie_Idle_Loop`, `Wounded_Walk_Loop`, `Hurt_Stomach_Walk_Loop` |
| Overhead tool, hook swing, claw or grab, throw | `Chop_Wood`, `Melee_Hook`, `Zombie_Scratch`, `OverhandThrow` |
| Stagger (KICK window), kneel (SLAM window) | `Dizzy`, `Kneeling Tired` |
| Hit, thrown down, get up, die | `Hit_Chest`, `Hit_Head`, `Hit_Knockback`, `LayToIdle`, `Fall_On_Face`, `Get_Up_Face_Down`, `Death01`, `Death_A/B/C` |
| Monk shield, Steward lunge | `Idle_Shield_Loop`, `Idle_Shield_Break`, `Sword_Dash_RM` |
| Vera's kick | `Roundhouse_Kick`, `Side_Kick`, `Front_Kick` (windows only) |
| Traversal | `Climb Ladder`, `ClimbUp_1m_RM`, `Run_Jump_Over`, `Land_Three_Point`, `Push_Loop`, `Crawl` (downed) |
| Ambrose | `Walk_Formal_Loop`, `Idle_FoldArms_Loop`, `Defend`, `Duck_Thrown_Object`, `Drink_Water`, `Consume`, `Greeting` |
| Carrying him | `Walk_Carry_Loop`, `Carry_Heavy_Box` |
| Talk, banquet, balcony, lantern patrol | `Idle_Talking_Loop`, `Sitting_Idle_Loop`, `Sitting_Talking_Loop`, `Idle_Rail_Loop`, `Idle_Lantern_Loop`, `Looking_Around` |

**New animation we must author** (a clip is text; see `engine/docs/MOCAP.md`; copy the nearest clip's key poses and edit the numbers, or add a procedural layer):
- **SLAM:** Vera behind a kneeling enemy, hooks under the arms and throws them back over her hip. Two-body sync: paired clips, positions placed by script.
- **FRISK:** a quick pat-down of a downed enemy that shakes loose crowns.
- **Stomp and heel-grind** (finish a crawler or a downed enemy).
- **Ambrose's tasting** (from `Consume`: sniff, swirl, sip, grimace) and **Ambrose carried** over a shoulder (a limp hung pose).
- **Boost and catch** (two-body sync).
- **The Treader's stomp and cask throw**, **the Comte's languid gestures** on the sedan chair, **Vane's transformation** (pieces drawn procedurally).
- **The sabrage** at the finale.

Check each once with a strip of screenshots stepped by `game.advance` (§17).

**Non-human bodies** (draw with the pen on a small procedural skeleton; the horror kit's `drawDog` is the pattern): truffle hog, Bloom crawler, Bloom tendril (a chain of tubes on a spring), the Comte's vine colossus, Vane's final form.

**Hit zones.** For each enemy near the shot's line, build capsules from its pose: head (a sphere at the skull, about 3 units), torso (pelvis to neck, about 4), upper and lower arm, thigh and shin. The shot:
1. `world.ray(ox, oy, oz, dx, dy, dz, range, { skip: [hero, ...enemies] })` finds what the level or props stop it at.
2. Test the ray against the capsules, nearest first, up to that distance. The first capsule hit is the zone.

Keep capsules a little fatter than the art at range, and let aim assist (§6) help the pad player.

## 6. The player

**Controls.** Bind them in `KEYS` with these actions and name them all for the engine's rebinding screen (`menu.controls`). DualSense standard mapping. Keyboard and mouse are what PC players expect, not stand-ins.

| Action | DualSense | Keyboard / mouse |
|---|---|---|
| Move / look | Left stick / right stick | WASD / mouse (a click captures it) |
| Aim (hold; feet planted) | L2 | Right mouse |
| Fire | R2 | Left mouse (while aiming) |
| Action: door, vault, ladder, pick up, talk, KICK, SLAM, prompts | Cross | E (also Space), or left mouse on the focused thing when not aiming |
| Sprint (hold); sprint + Action kicks a door in | Circle (also Cancel in menus) | Shift |
| Quick turn (180°; a prompt on screen takes priority) | Stick back + Cross | X, or S + Space |
| Reload | Square | R |
| Evidence case | Triangle | Tab or I |
| Knife (a tap slashes) | L1 | F |
| Grenade (hold: arc shown; release: throw) | R1 | G |
| Weapon previous / next | D-pad left / right | Wheel, or 1 to 6 |
| Quick heal (best healing item) | D-pad up | H |
| Ambrose: follow / wait (tap), Nose (hold) | D-pad down | C (tap / hold) |
| Shoulder swap | R3 | Q |
| Map | Create (the hub owns Create + Options; the engine handles that) | M |
| Pause | Options | Esc or P |

**Feel numbers** (engine units, 16 a metre; ★ means a dev slider).
- **Movement:** walk ★52, sprint ★88, acceleration 700. Capsule r 5, half 9.
- **Camera:** pivot 12 right of the head, 31 up. Distance 42, down to 30 when aiming. FOV 60, down to 46 when aiming. Eases in 0.15 s. Pulled in by `world.ray`: fast in, slow out, as the kit's `thirdCam` does.
- **Look:** mouse .0021 rad per pixel, scaled by zoom. Right stick: rate `(1.2 + 2.6 m²)` rad/s, ×0.55 aiming, ★multiplier (copy the kit's `look`).
- **Aim:** raises in 0.18 s. **Feet planted**: speed goes to 0 (Settings offers "Walk while aiming" at 40% speed; off by default).
- **Laser:** from the muzzle to where the camera ray lands, with a dot. Wobble ★ starts wide and settles over 0.6 s of steady aim; damage and sprinting widen it. Shots go where the dot is. No crosshair by default (Setting: "Aim dot").
- **Aim assist (Settings; default on for pad, never for mouse):** look slows over an enemy, plus a slight pull. ★strength.
- **Rumble** (`game.input.rumble`): on firing, kicks, hits, and a slow build as the brush-cutter comes near.

**Melee and context.**
- KICK (0.55 s, brief invulnerability at the start, 60 damage in a 2.5 m arc, knocks down what it touches) on a **staggered** enemy within 2 m.
- SLAM (120 damage, kills common enemies) on a **kneeling** enemy, from behind or the side.
- FRISK on a **downed** one (crowns, no damage). Hold it too long and they get up.
- Knife: quick, 20 damage, no ammo, breaks crates and cuts Bloom.
- Sprinting cancels a reload.

**Being hit.** HP ★100. Hits flinch; heavy hits knock down (get up with brief invulnerability). A grab pins you: mash Action to shake free, and a bite lands halfway. At 25% HP: heartbeat, a limp, a red edge to the screen.

**Prompts and QTEs.** `src/story/qte.js` plays timed prompts over the action: a single press, a two-button press (Cross + Circle, or E + Shift), a mash. Windows ★ scale with difficulty, and Settings offers "Hold instead of mash" and "Longer prompts". A failure usually costs health; the deadly ones have a checkpoint just before.

**Traversal.** Vault windows and low walls, climb ladders, drop from ledges, push barricades, open and kick doors. All are context prompts played as scripted moves via `a.place`, with the kit's `findLedge` logic or fixed marks. No free jump: the context button does it. Doors inside a zone swing open and play on. Doors between zones fade through (`world.through` plays the door moment if you want it).

**Cover (Chapter 5).** Standing still within 1 m of a marked waist-high cover and not aiming, Vera crouches (`a.resize`) and enemy shots pass over. Aiming rises above it.

**Difficulty** (New Game; multipliers in data):

| | Story | Agent | Inspector General (unlocked by finishing) |
|---|---|---|---|
| Enemy HP / damage to you | .75 / .6 | 1 / 1 | 1.25 / 1.4 |
| Attack tokens | 2 | 3 | 4 |
| Prompt windows / carry time | 1.4 / 1.5 | 1 / 1 | .8 / .75 |
| Basket-Head's swing | 70 damage | Kills | Kills |

## 7. Weapons, items, case, economy

All values are defaults in data files. Difficulty and dev sliders multiply them.

**Damage model.** Common enemy 100 HP. Head ×2.2 (and stagger), knee ×1 (and kneel), arm ×0.8 (and drop weapon), torso ×1 (flinch only). A weapon's `impact` value decides how often body hits flinch.

| Weapon | Type | Dmg | Rate/s | Mag | Reload s | Case | Price (from) | Exclusive when fully tuned |
|---|---|---|---|---|---|---|---|---|
| Excise M9 | Pistol | 28 | 2.4 | 12 | 1.7 | 3×2 | start | Crits: 1 in 6 hits ×5 |
| Tariff | Pump shotgun | 14 × 8 pellets | 0.8 | 6 | 3.0 | 7×2 | 8,000 (Ch. 1) | Knocks down everything in the cone |
| Long Cork | Bolt rifle, scope ×3 | 120, head ×4 | 1 | 5 | 2.8 | 8×2 | 12,000 (Ch. 2) | Head ×6 |
| Chatterbox | SMG | 14 | 12 | 30 | 1.9 | 4×3 | 18,000 (Ch. 3) | Capacity 200 |
| Sommelier's Regret | Flare gun | 40 + burn; kills Bloom | 0.5 | 1 | 2.2 | 3×2 | 15,000 (Ch. 3) | Mag 3 |
| Last Call | Magnum | 180, passes through 2 | 0.7 | 6 | 3.2 | 4×2 | 22,000 (Ch. 4) | Passes through all, +50% |
| Waiter's Friend | Knife | 20 | 3 | no ammo | none | not in case | start | none |

**Ammo** comes only from drops and crates, never the trolley: pistol (2×1, stack 30), shells (2×1, 12), rifle (2×1, 10), SMG (2×1, 60), magnum (1×2, 6), flares (1×1, 2). Keys go on a key ring outside the case.

**Grenades** (case 1×2; a few in stock at the trolley): **Frag** 250 in 5 m. **Brandy Bomb** burns an area for 6 s. **Champagne Flash** stuns everything in 8 m for 4 s and kills exposed Bloom.

**Tuning.** Each gun has Firepower, Reload, Capacity and Handling, five levels each, at 3k, 6k, 10k, 15k and 22k crowns scaled by the gun's price. Max all four to unlock its Exclusive (its own price, about double the top level).

**Healing, with its own combine logic.** All are 1×2 in the case.
- **Gauze** heals 25%.
- **Iodine** and **Grappa** do nothing alone.
- Gauze + Gauze = 50%. Gauze + Iodine = **100%**. Gauze + Grappa = 50% and +10 max HP. All three = 100% and +10 max HP.
- Healing items can be given to Ambrose.

**Treasure.** Sell to the trolley; combine first for more:
- **Dusty Bottle** + **Foil Capsule** + **Wax Seal** = **Certified Grand Cru**, worth far more than the parts sold apart.
- Also: Vintage Cork (500), Silver Tastevin (4,000), Truffle (2,500, from hogs), Pruner's Medal, Comte's Signet, Gold Bung (9,000). Pick the rest yourself in this spirit.
- The trolley sells a treasure map per act (3,000).

**Evidence case.** An aluminium case with foam, on a grid. Picked-up items must fit:
- Sizes: S 10×6 at start, M 10×8 (6,000), L 12×8 (14,000), XL 14×9 (28,000).
- Items move and rotate (R1 or Q), and can be combined, used, given to Ambrose or discarded. Auto-arrange is a button.
- When something won't fit, the case opens with it held: place it or leave it.
- Build it on `E.RPG`'s item data with a `CaseGrid` of your own (the module's grid has no rotation). Keep ids and cells in saves.

**Economy targets.** About 6,000 to 9,000 crowns by the end of Chapter 1: enough for the shotgun or the bigger case, not both. That is the first real choice. Enemies drop 0 to 200. The Director's need-based drops (§8) keep ammo near empty but not quite.

**Excise Stamps (side quest).** 15 blue-and-gold wax stamps hidden on walls and under bridges through Chapters 1 and 2, destroyed by a shot. The trolley pays for them: at 5, a free tune-up; at 10, the treasure maps; at 15, a free Exclusive for one gun. Listed on the Map screen.

**Cork Alley.** A shooting gallery beside the trolley: pop bottles and corks, spare the waiter. Three stages, 45 s each, with a score table in `E.store`. Tokens buy collectible cork tops (a small Extras gallery) and one prize tune-up.

## 8. Enemies and the Director

**Data** (`src/ai/*`). HP is on Agent; speed in units a second.

| Enemy | Act | HP | Speed | Behaviour | Answer |
|---|---|---|---|---|---|
| **Picker** (farmer; hook, fork, mattock) | I | 100 | 24 to 34 | Shambles, encircles, swings (12 dmg) or grabs | Knee then SLAM, head then KICK |
| **Harvest Wife** (sickle, firebombs) | I | 80 | 30 | Lobs lit bottles from 8 to 18 m: arm up, grunt, throw (14 + fire patch) | Shoot the bottle in the air; an arm shot drops it at her own feet |
| **Basket-Head** (wicker harvest basket on his head, gasoline brush-cutter) | I, II | 900 | 30, sprint 62 | Mini-boss. You hear the two-stroke motor first. Rev-up 1.2 s, then a swing that **kills outright**; a prompt can dodge it | Keep moving, flash stalls the motor, explosives |
| **Truffle Hog** | I, II | 60 | 110 charge | Low, fast, knocks you down | Aim down early; may drop a Truffle |
| **Cellar Brother** (robed monk; crossbow or censer) | II | 130 | 28 | Bolts (12) after a glint; the censer leaves a spore cloud | Close in; shoot the censer |
| **Lid-Bearer** (monk with a barrel-lid shield) | II | 130 + shield 120 | 26 | Blocks from the front; advances in a line | Shoot feet, flank, explosives |
| **Steward** (white gloves, apron, corkscrew) | II | 240 | 70 | Bows, then lunges (25). Sidesteps when your laser settles on him (with a cooldown) | Hit him after a lunge; shotgun |
| **Bloom** (from the neck of a killed host) | I+ | 120 / 60 / 50 | see right | **Tendril** whips at 3 m (20). **Puffball** bursts spores at 3 m. **Crawler** detaches and leaps, 90 speed | Flash or flare kills instantly |
| **Vane Security** | III | 120 + helmet | 50 | Rifle bursts (3 × 6) with an aim that lags (copy the kit's `raiderStep`), uses cover marks, flanks, calls out in gibberish | Head after popping the helmet; grenades |
| **Riot Guard** | III | 120 + shield 300 | 34 | Pushes, baton knockdown | Feet, explosives, flash |
| **Fermenter** (bloated, pale, regrows limbs) | III | limbs only | 24 | Reach 3 m, grab (30). Dies only when its 3 hidden nodes die | Ambrose's Nose or a flare reveals nodes; rifle |

**Bloom chance:** a killed host grows one at 0% in Act I's first half, 20% late Act I, 35% Act II, 50% Act III. Reveal the first one with a held camera beat and Ambrose's line (§11).

**The crowd.** Three layers, in `src/ai/director.js`:
1. **Tokens:** only a few enemies may be attacking at once (★, by difficulty). The rest hold.
2. **Slots:** engaged enemies take angular slots round the player at 3 to 6 m, biased to the flanks and behind so the player gets surrounded unless they keep moving. They edge in slowly, feint and shuffle. They use one shared `flow` when far, and straight steering plus separation when near.
3. **Telegraphs:** every attack has a clear wind-up (pose, gibberish grunt) and a recover that gives you a window. Nothing surprises from inside the camera frame without a sound cue first.

**Links.** Flow can't use ladders, windows or doors, so `src/world/links.js` holds pairs of marks: `{ kind: 'ladder' | 'window' | 'hatch' | 'door', a, b, closed }`, and regions (tiles flood-filled per zone from `world.level.pass`). When the player is in a different region than an enemy, the enemy flows to the nearest open link, plays the clip with `place`, and carries on. Pressed open plain doors and bash barred ones over time (door HP, a bash clip). They bring and raise ladders to upper windows if you camp upstairs. At the top, a prompt kicks the ladder away, dropping whoever is on it. Ambrose uses links too.

**Barricades.** A wardrobe or cask stack beside a door or window: PUSH prompt, 1 s scripted slide, and the link closes until it's broken.

**The Director (adaptive tension).** A hidden `tension` 1 to 10 (★lockable in dev mode) rises with accuracy and clean clears, and falls with deaths and low health. It shifts tokens (±1), enemy HP (±15%) and throw rate. **Need-based drops:** when an enemy drops loot, the table weights what the player is short of (ammo for guns they own, healing if hurt, crowns otherwise), drawn from `E.rng`. Never a menu or text about any of this.

**Bosses** are registered and have phases as data. Details in §12.

## 9. Ambrose Pell (the ally)

A tiny, upright, 71-year-old Master Sommelier in a burgundy waistcoat, bow tie and polished shoes, a silver tastevin on a chain. He has never run in his life. He walks briskly (`Walk_Formal_Loop`, 70 units a second when he must). 60 HP. Friendly fire hurts him and he says so.

- **Follow / Wait** (tap): follows 3 m behind-left, or stays. He ducks when your laser crosses him (`Duck_Thrown_Object`, "Mind the waistcoat!"). He teleports only when he has been stuck more than 6 s and is off-screen.
- **Hide:** context prompt at marked casks and wardrobes. Nothing finds him there. He complains from inside.
- **Nose** (hold, 20 s cooldown): he sniffs, and for 3 seconds nearby hidden enemies, Bloom about to burst, Fermenter nodes and hidden treasure show as pale ring markers on the HUD, even through walls (`world.project`), with one line of tasting notes. A lifted-nose pose and a wine-glass ring on the HUD show the cooldown.
- **Boost and Catch:** at marked high windows and transoms, boost him up; he unlatches the far door or crank, comes back along his own route, and you catch him at a drop (a prompt). If you don't catch him, he lands on his dignity and says so (small damage).
- **Tasting puzzles** (§12): he identifies bottles, casks and vintages, and his insults are the clues.
- **Carried off:** an enemy within 1.5 m for 3 s hoists him (`Walk_Carry_Loop`) and walks to the nearest exit mark. Shoot the carrier and he drops, unhurt but offended. If a carrier reaches an exit, or he dies, it's game over with its own line ("He had a state dinner on Friday.").
- **Health:** a small second bar under Vera's. Case items can be given to him.

He's absent from the end of `grandhall` to the middle of `banquet` (captured), to change the rhythm.

## 10. The look

**Base [verified]:** `res: 'ps1', expand: true` HUD pixels over a `res: 'balanced'` 3D picture, `outlines: false`, sun with a 2048 shadow map, fog on, filter clean. The player can choose the engine's Comic cel or Pixel filters in Settings (`W3.SETTINGS`). Lights can be as many as a scene wants. Aim for a late-PS2 horror game drawn by a pixel artist.

**Palette by act** (each zone's sky, fog, ambient and sun are data):
- **Act I, dusk to moonlight:** amber sky falling to violet, lime plaster, terracotta and slate, deep vine green, purple grapes. Later: blue moonlight, amber lanterns.
- **Act II, the château:** candle gold, oxblood drapes, black oak, wet stone, cold green hedges. In the cellars: torchlight in black, wine-red floors, `world.flashlight` in the darkest stretch.
- **Act III, the plant at dawn:** fluorescent white, hazard yellow, stainless steel, red wine in glass pipes, grey-pink dawn through skylights.
- **The Bloom is always the same sick magenta with pale fruiting bodies**, so it reads instantly in any light. Enemy eyes glow faintly orange-red.
- **Neon means safe:** the cyan-and-pink DUTY FREE sign is the only neon in the valley. It's visible from far off and buzzes audibly.

**Our own assets** (materials in `W3.SIDE`, `W3.GROUND`; objects in `E.SHAPES`; read `engine/docs/ASSETS.md` whole):
- **Act I:** timbered plaster and rubble walls, cobbles, tilled vineyard earth, terraced dry-stone, wine-stained flagstones; vine rows (`vinerow` in §3.5), trellises, the Great Press (`press`), gable and lean-to roofs, carts of grapes, harvest baskets, tubs, a stone cross, a chapel front, lantern posts, shutters, a railway platform, a freight wagon, the customs stamp desk.
- **Act II:** ashlar and panelling, chequer marble, hedges (store `kenney-fantasy-town:hedge*`), fountains, candelabra, chandeliers (droppable), tapestries, a banquet table, racks of bottles, cask stacks, huge vats, cellar rails and carts.
- **Act III:** steel-tile floors, corrugated walls, conveyor sections, bottling carousels, tanks, catwalks, pallets, a forklift, glass pipes, hazard signage, VANE logos, a helipad.

**Use the store for generic props.** `node engine/tools/asset-find.mjs "wine bottle"` finds `kenney-food:wine-red`; also there are `kaykit-dungeon-remastered:barrel-small-stack`, `table-long-decorated-a`, `kenney-graveyard:hay-bale`, gravestones, `kenney-platformer:ladder-long`, and more. Cut only what you use (`node engine/tools/asset-set.mjs <sets> --ids a,b --name mine --out ../assets/sets.js`, add the file to `classic` in the build, call `E.addAssets`). Check a new shape once with `node engine/tools/asset-sheet.mjs mine.js#stool`.

**Effects** (copy from the shooter kit): `fxMeshes`, `tracer`, `decal`, `impactStar`, `drawFlashes`. Muzzle light via `world.light`. Blood is red-purple must; a hit sprays, and walls and floors keep stains. Corpses fade after 8 s. `game.particles` for dust, splinters, glass, sparks, fire. Crates and barrels break into bits and drop things.

**Faces in dialogue.** Keep one non-world `E.Humanoid` per speaker just for `rig.drawPortrait`: the pixel close-ups are charming and engine-native. Dress each to match their pen body.

## 11. Story and writing

**Tone.** Earnest B-movie pulp: action-movie deadpan from the hero, operatic menace from the villains, bureaucratic comedy from the radio. Nobody knows they are in a comedy. No fourth-wall jokes, no jokes about game mechanics or buttons, no winks at other games. Short lines: three at most on screen. Wine vocabulary is the running gag; don't overuse it in any one scene.

**Plot in six lines.** Vera arrives at Sainte-Lie and the village tries to kill her. She finds Ambrose in a barn; the cult wants his palate, the only one that can certify the Bloom's final vintage. They fight up through the vineyards with a nun's help and kill the matriarch's giant son. At the château, Comte Lucien retakes Ambrose and invites Vera to dinner; she survives the toast, rescues him and kills the Comte in his great vat. They find the Comte was only the supplier: Vane Consolidated Beverages bottles the Last Pressing for the world's state dinners. On the plant's roof, Ambrose's prized bottle ends it.

**Cast.**
- **Special Agent Vera Cask**, 38, U.S. Excise Bureau. Ex-Marine, ex-field-audit. Deadpan, unimpressed, secretly decent.
- **Ambrose Pell**, 71, Sommelier to the President. §9. Physically fragile, socially lethal. Afraid of nothing except a bad pairing.
- **Deputy Director Lyle Hobart**, on the radio: dry, tired, obsessed with paperwork.
- **The Duty-Free Man:** long and thin, faded teal airline uniform, pillbox hat, sunglasses at night, an enormous grin. Pushes a trolley hung with bottles and guns. No one knows how he gets anywhere.
- **Sister Perpetua:** a very calm nun with a very long rifle. The convent held out for six weeks. She's the only local who still has her mind and her ammunition. Comes back on the ridge in the final fight.
- **Mother Odile Gruss:** the village matriarch. Enormous, maternal, terrifying. Feeds you before she kills you. Her empty seat at the Comte's table is a late, nasty joke ("Odile could not join us. She has been decanted.").
- **Comte Lucien de Rémuage:** Grand Cellarer of the Confraternity. Absurdly tall and thin, powdered wig, lavender coat, gold tasting spoon, carried everywhere on a sedan chair by four monks. Nine hundred years of inbred disdain. Critiques Vera over the château's speaking tubes as if reviewing a wine.
- **Dominic Vane:** CEO of Vane Consolidated Beverages. Perfect teeth, lanyard, headset. Calls it a "premium lifestyle brand". The Comte supplies the Bloom; Vane has the distribution.
- **The Pressed:** the infected folk. Their language is gibberish (§14). They still do chores between murders.

**Words of the world.** The Grand Duchy of Vaudrenia. The village of **Sainte-Lie**. Château Rémuage. The Confraternity of the Last Pressing. The Noble Bloom. Crowns (the currency). Vane Consolidated Beverages, slogan "A Glass In Every Hand."

**The voice, by example.** Write the rest yourself in this register. These are yours to use.

VERA
- (arrival) "Nice town. Smells like a hangover that learned to walk."
- (first Pressed gets up after a head shot) "In most countries, that ends the conversation."
- (the horn sounds; the whole crowd drops its tools and files away) "Union rules, I guess."
- (first sees the trolley) "Is that... a duty-free trolley?" (to him) "I'm a federal excise agent. Do you have a license for any of this?" (beat) "...I'll take the shotgun."
- (the Treader falls) "That's what I call full-bodied."
- (on the radio) "Hobart, the sommelier's alive. Unfortunately, so is everything else."

AMBROSE
- (first meeting, sitting calmly in a locked cellar, tasting) "You're late. And you have been shooting people in those shoes."
- "I was told there would be a car."
- "Young lady, I have stayed close to four Presidents. I shall manage a corridor."
- (a Bloom bursts for the first time) "Botrytis. With ambitions."
- (hiding in a cask) "French oak. Medium toast. How dreadful."
- (carried off) "Unhand me! I have a state dinner on Friday!"
- (Nose) "Left. Barnyard, wet wool, and malice."
- (healed) "Grappa. In my condition. Barbaric. ...Another."

HOBART
- "Cask, Hobart. Accounting wants receipts."
- "Negative on air support. It's the end of the budget cycle."
- "The President asked about the sommelier. He also asked about the fish course."

THE DUTY-FREE MAN (catchphrases; he never explains himself)
- (greeting) "Anything to declare?"
- (purchase) "Lovely choice. Tax free. Blood free. Well. Tax free."
- (leaving) "Mind the gap."
- (late game, in a burning plant) "Last call for passengers. Anything to declare?"

MOTHER ODILE
- "Sit. Eat. You have a hungry face. And a soft neck."

COMTE LUCIEN (over the speaking tubes; he can go on)
- "Do you know what a wine is, Agent? A thing that has been crushed, and left in the dark, and has grown better for it. You could learn so much."
- "My family has pressed this valley for nine hundred years. You have pressed... a radio button."
- "Bring me the old man's tongue. The rest of him may keep his opinions."
- (after you win a fight) "A certain roughness on the finish. We shall let you breathe."

DOMINIC VANE
- "We are not a cult, Agent Cask. We are a premium lifestyle brand."
- "A glass in every hand by Q4."

**The Pressed's barks** are gibberish only, on the voice bus. Show them on screen rarely, in invented words: "Vendanj!", "Pressho, pressho!", "Ombrelu!"

**Radio.** Non-modal: `talk.say(line, { name, portrait, auto: 2.5, modal: false })` plays over the action with a static-filtered voice. A few Comte taunts trigger as you enter new areas.

**Cutscenes** are `game.script` coroutines: the camera moves by tweening `world.camera.fixed`, actors by `a.place` and clips, with bars top and bottom, on `E.Dialog` or `E.Story` for the talk. All are skippable (hold Circle or Esc). Give each cutscene an `end()` that sets its final state, so skipping is always safe.

**Documents.** About 10 short notes to find: a harvest ledger, a sermon, a Vane memo, a child's letter. Maximum 60 words each, big type, one screen. A good place for the world's creepiness to sit still.

## 12. The demo, chapter by chapter

The target is 60 to 75 minutes of first-time play: a prologue and 5 chapters over 3 acts. Zones are levels in text, one character a metre, in `src/zones/`. Sizes are starting points. For each zone, write its bot path as data when you write the zone (§17): it's your proof the zone can be finished.

**Level design rules.**
- Every fight space has at least two routes in and out, so the player can back away, circle and use height. No dead ends without a barricade.
- Sightlines of 15 to 30 m, so you can pick your shots at a crowd coming on. Fog and light lead the eye to the way forward.
- Rhythm: fight, breather, treasure, fight, neon. Never more than two fights without a breather.
- Treasure sits off the path but visible from it. Crates cluster where a fight will send you.

**Common legend** (`src/world/legend.js`, shared; zones may add): `.` the zone's ground, `,` cobble, `:` planks, `;` flagstone, `"` tilled earth, `#` stone wall 64, `H` plaster wall 48, `W` window, `~` low wall 12 (vault), `=` raised floor, `^ v < >` stairs, `V` vine row, `c` crate, `b` barrel, `t` torch, `@` start, `z` picker mark, and letters for other marks. Doors, links, stamps, treasure and encounter triggers are named marks with data beside the rows.

**Encounter data:** `{ id, trigger: box | flag | enterZone, spawn: [{ type, mark | door | offscreen, n, delay }], maxActive, end: 'allDead' | seconds | flag, reward, music }`. The dev mode lists and restarts them.

### Prologue: "Anything to Declare?" (Act I, 5 min)

Teaches moving, aiming, reloading, doors, knife, KICK, SLAM, a QTE, saving and pickups.

- **`halt`** (40×24), Sainte-Lie Halt at dusk: platform, waiting room, freight shed, customs booth.
  - Black screen, Hobart's briefing. Vera steps off the regional train. The conductor, grinning, says "Terminus." The train backs away with no one driving it.
  - The customs booth has a dusty stamp desk: Vera stamps her own passport (save tutorial; the sound of it should please you).
  - In the waiting room the stationmaster sits with his back to us, sharpening a pruning hook. Aim, shoot. He stands up again ("In most countries..."). Head shot, stagger, KICK prompt.
  - Two Pickers come off the freight shed: a knee shot, kneel, SLAM. Crates: knife them for gauze and crowns.
  - A runaway wine-tanker wagon comes down the line: dodge QTE, then a tide of red, and the way back is gone.
- **`road`** (24×80), a terraced switchback at dusk. A low wall to vault, a ladder, the first Excise Stamp under a culvert, a Harvest Wife on the terrace above throwing a firebomb you can shoot in the air. The village gate.

### Chapter 1: "Terroir" (15 min)

Teaches crowd fighting, barricades, windows and ladders, the trolley, the case, selling and tuning, treasure, the Map, chapter results.

- **`square`** (64×48), Sainte-Lie's square at sunset (grow it from §3.5): the Great Press in the middle, a chapel front (locked), four houses you can enter (ground room plus raised mezzanine with a window to drop from), a well, carts, lanterns.
  - Villagers are at chores and ignore you until you pass the well. Mother Odile, on the chapel steps, sets a table: "Sit. Eat..." Then she snaps her fingers.
  - **The Crush:** the press starts turning by itself and the crowd pours in, 18 Pressed in all, up to 8 at once, by doors and alleys. Hide in a house, push the wardrobe, go up the mezzanine, kick the ladder off the window.
  - Basket-Head arrives at 90 s, the motor audible from far away.
  - At 3:00, or when the count is done, a harvest horn sounds and everyone drops their tools and walks out. "Union rules, I guess." Odile is gone.
- **`backlane`** (40×40), blue dusk. The neon sign. First Duty-Free scene: buying, selling, tuning, the case arrange tutorial, a stamp desk. **Cork Alley** next to him. Beyond: a farm path, hogs and the tithe barn. An Iron Key is in Odile's kitchen back in `square`: a small backtrack with a few stragglers and treasure.
- **`barn`** (32×24), the tithe barn cellar. Pressed asleep among the casks (the first hidden ones). At the back, Ambrose, seated, tasting: "You're late." Chapter results.

### Chapter 2: "The Crush" (18 min)

Teaches Ambrose (follow, wait, hide, Nose, boost, catch, carried off), Bloom, dodge prompts, a defence, and the first boss.

- **`terraces`** (48×96), the vineyard terraces at night going uphill, with moonlight and lantern patrols.
  - Wait and Follow tutorial, hiding Ambrose in a cask, first Nose ("Left. Barnyard, wet wool, and malice."), first carried-off rescue, and the first **Bloom** bursting from a Picker ("Botrytis. With ambitions.").
  - Rolling casks come down the steps: dodge prompts, then a boost through a transom at the pump house.
  - Hogs in the rows. Excise Stamps. Treasure with a Bottle and Seal to combine.
- **`cooperage`** (40×32), a barrel workshop. **The Cooperage Siege:** the gate winch takes 2:30 to raise. Sister Perpetua, in the loft, shoots from above and calls out targets on the radio ("Your left, child. I am only asking you to look."). Enemies come at four windows and a roof hatch. Push cask stacks to bar them. Harvest Wives outside, Basket-Head again at the end. Ambrose hides or minds the winch.
- **`quarry`** (72×60), a stone quarry used as a pressing yard. **Boss: The Treader**, Mother Odile's son, 3.5 m tall, purple-stained to the thigh, a great Bloom on his spine, a cask strapped to his back.
  - Ambrose hides in a wine cart ("I shall supervise.").
  - Attacks: Stomp (ring telegraph with `world.arc`, 40 dmg, a dodge prompt when close), Cask Throw (shoot it in the air and it bursts on him), Grab (mash).
  - Stun: three iron vats hang on chains around the yard. Shoot a chain as he passes beneath, or do 200 damage to the Bloom. Stunned for 6 s, the prompt CLIMB puts Vera on his back: mash the knife into the Bloom. Three cycles. Each one speeds him up and brings two Pressed.
  - He falls. "That's what I call full-bodied." 15,000 crowns and the Pruner's Medal. Chapter results; the gate to the château opens.

### Chapter 3: "Noble Rot" (12 min)

Teaches shields, ranged monks, Stewards, puzzles, a chandelier, losing your ally.

- **`gardens`** (72×72), formal hedges and a dry fountain under a gibbous moon, the Comte speaking through stone mouths in the hedge. Hogs and Cellar Brothers in the walks. Find the two halves of a garden key; Nose finds the shortcut.
- **`grandhall`** (56×56), a hall with a double stair and a balcony ring. Lid-Bearers advance in a line, crossbows on the balcony, a chandelier you can shoot down onto them.
  - **The Vertical Tasting:** a locked cellar door has four bottle niches. Ambrose tastes eight bottles on a table, and his insults give the order and the year ("Nineteen seventy-one. A tragic year. Everyone involved should apologise."). A wrong order costs a poison puff.
  - Solved: a trapdoor takes Ambrose. "Do not touch the fifty-eight!"
- **`cellars`** (64×48), torchlit, with a flooded stretch of wine. Solo. Stewards are introduced, bowing in the dark. Two sluice valves lower the wine and open the way. A flashlight stretch. The trolley again, with a stamp desk under the neon ("Mind the gap.").

### Chapter 4: "The Toast" (10 min)

Teaches the QTE set piece, the on-rails section, the second boss.

- **`banquet`** (40×24), a long candlelit hall. **The Toast.** Vera is seated at the Comte's table with twelve Bloom-bound nobles, Ambrose tied to a chair at the far end. The Comte proposes a toast. A prompt sequence plays over a slow mocking waltz: lift, swap glasses behind his back, sip without sipping, duck the corkscrew, kick the table. Fail a deadly one and it's a comic game over ("Corked."), retried from the first prompt. Win and the nobles are on you in a table-top brawl in the candlelight. Free Ambrose.
- **`railcart`** (a long track, 100 s), a barrel cart down the cellar railway with Ambrose aboard. Free aim. Barrels to shoot off the line, Pressed leaping on (kick them off with a prompt), low beams (a duck prompt), a switch to shoot. Ambrose rates the ride. Built with `E.Path` and `a.place`; no driving.
- **`greatvat`** (48×48), a cathedral of a wine vat with a ring walkway. **Boss: Comte Lucien.**
  - Phase 1, the sedan chair: four monks carry him along the upper ring as he reviews you. Shoot the bearers.
  - Phase 2: he falls into the vat, drinks, and rises as a colossus of vine and wine, his head under a glass tasting dome. Four root-casks around the ring must be shot to expose him. Wine rises round your ankles and then knees (slows, then hurts); Ambrose can be boosted to the sluice wheel to drain it.
  - Attacks: vine sweep (a duck prompt), arcing spit, Stewards summoned.
  - Phase 3: the dome breaks, and flash or flare does extra. Ambrose, as he goes down: "All nose. No finish."

### Chapter 5: "Last Pressing" (15 min)

Teaches gunfights and cover, belts and machinery, Fermenters, the finale.

- **`plant`** (80×60), Vane's bottling plant at dawn. Vane Security with rifles and cover, catwalk snipers, Riot Guards. Cover (§6). Conveyors carry you and the bottles. Shoot switches to reroute a line and open a path. The trolley is here too, its sign flickering, with a "closing sale".
- **`coldroom`** (part of `plant` or its own small zone). Fermenters in the fog. Nose shows their nodes. Slow, nasty, the scariest room in the game.
- **`tanks`** (56×56), a forest of steel tanks; a hold-the-line fight while Ambrose tastes samples to find the master tank ("That one. It tastes like the end of the world, and they've oaked it.").
- **`roof`** (48×48), the helipad at sunrise. **Boss: Dominic Vane.**
  - Phase 1: Vane and his security team, with a corporate pep talk over the PA. Sister Perpetua's rifle from the ridge takes the helicopter.
  - Phase 2: he drinks the Last Pressing and turns into a thing of suit, Bloom and bottling machinery. Bottle barrages you can shoot out of the air, a charge, three glass nodes.
  - Phase 3: he armours over, and bullets stop mattering. Ambrose: "Agent! The fifty-eight!" and he throws the bottle he has protected all game, a Magnum of it. CATCH prompt; **sabre** the neck with the knife (a timed press); the cork goes through him. Vera: "Last call." Ambrose, tasting what's left in the broken neck: "Hmph. Corked."
- **Epilogue:** a short scene at the state dinner: a long table, candlelight, the President's gibberish. "What's good tonight, Ambrose?" "Water, sir." At the back of the room, a waiter with sunglasses and an enormous grin pushes a trolley. Results, unlocks (Inspector General difficulty, Vera's dinner-jacket costume), credits.

### 12.1 Last Stand

Always on the title. §16.

### 12.2 Features: every one must appear in the scripted playthrough (`FEATURES`)

`move, sprint, quickturn, aim, fire, reload, swapweapon, shoulderswap, headstagger, kneekneel, armdrop, kick, slam, frisk, knife, grenadefrag, grenadebrandy, grenadeflash, shootthrown, door, keydoor, kickdoor, vault, ladder, kickladder, drop, barricade, cover, qte_press, qte_two, qte_mash, grabbed, pickup, crate, drops_need, case_arrange, case_rotate, case_combine, case_use, case_discard, case_upgrade, trolley_buy, trolley_sell, trolley_tune, exclusive, treasure_map, stamp_save, autosave, load, gameover_continue, treasure_combine, excise_stamp, corkalley, map, document, radio, cutscene, cutscene_skip, chapter_results, ally_follow, ally_wait, ally_hide, ally_nose, ally_boost, ally_catch, ally_carried, ally_heal, tasting_puzzle, valve_puzzle, switch_puzzle, rail_ride, conveyor, rising_wine, flashlight, chandelier, bloom_tendril, bloom_puffball, bloom_crawler,` every enemy id, every boss id, `director_tension, laststand_solo, laststand_split, attract, devmode, settings_glyphs, about.`

## 13. UI and UX: 10-foot, controller first

**Rules.**
- The game's own screens and HUD are canvas pixel UI (`E.font`, `E.ui`, sprites, `r.overlay`) in game pixels. At 1080p that is **[verified]** 480×270, so one default font row is about 2.6% of the screen height, which reads at 10 feet.
- The engine's menus (pause, settings, controls) are HTML overlays with 14 px text and paragraphs of help: fine on a desk, unreadable on a TV. **`new E.Shell(game, { tv: true })` scales them to about 30 px at 1080p, and §3.5 also hides their small print [verified].** Colour them with its `theme` (`ink, paper, accent, muted, line, font, titleFont`). Add short pages with `screens: { sound: { title: 'Sound', rows: [...] } }` and `ui.show('sound')`. The setting keys are `fullscreen frameRate showFps filter sound volume music effects background audioOffset motion shake flashes deadzone invertY invertMoveX invertMoveY glyphs rumble picture3d shadows3d filter3d`, plus yours.
- The pixel font draws ASCII, the face buttons, arrows, ★ ♥ ♪ ✓ … ° € £, curly quotes, dashes and accented Latin letters (Château Rémuage is fine). Anything else draws as `?`, so no « ».
- **Never use `font: 'tiny'` for anything the player must read.**
- Safe margin of 5% on all sides.
- A screen shows one focus and at most 8 rows or 12 tiles. No tables over 3 columns. A long list scrolls, and long text pages. When in doubt, take information away.
- Never carry meaning in colour alone.
- Judge from 1920×1080 screenshots (§17).

**One focus system** (`src/ui/focus.js`): lists and grids moved by d-pad, stick, arrows and WASD (with `input.repeat`), confirmed by Cross, Enter or click, cancelled by Circle or Esc. **Mouse hover moves the focus** (`input.pointer()`), and a click confirms (`input.clicked()`). In the world, with the mouse captured, the centre of the screen hovers: the interactable under it, or nearest it, is focused and its prompt shows. Left mouse (not aiming) or E uses it. `E.Menu` already follows the mouse. The engine's HTML menus (pause, settings, controls) take d-pad, stick, keys and clicks, but hover doesn't move their focus until you add the one-line listener in §3.5 **[verified]**. When the mouse has been released (after a pause), show "Click to aim" until it's captured again.

**Prompts** (`src/ui/prompts.js`), the one helper:
```js
const glyphFor = a => { const I = game.input, m = I.map[a]; if (I.lastDevice === 'gamepad') return I.label(a, 'gamepad'); const mouse = m.find(c => c.startsWith('Mouse')); return mouse ? I.codeLabel(mouse) : I.label(a, 'keyboard'); };
```
Draw the result as a real icon: PlayStation shapes in their colours for ✕ ○ □ △, pills for L1 R1 L2 R2, Xbox's A B X Y letters in their colours, keycaps for keys, a small mouse with the right button lit for mouse buttons. **[verified]** `{ key: 'glyphs', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']] }` shows PlayStation unless the player picks Xbox; a stubbed pad then gives L2/✕ or LT/A, and the mouse gives `Left click`.

**Touch-only devices. [verified]** `touch: 'never'` hides the touch controls and shows "Controller or keyboard required" with its Settings button until a pad connects or a key is pressed. The §3.4 patch moves the notice down and lightens its backdrop, so the attract mode shows behind it. The title's idle timer still runs, so the attract mode runs there. A tap on the screen outside the button counts as input and returns to the title. Do not add touch buttons anywhere.

**Screens.**
- **Boot:** the engine's boot screen with jokes for lines ("Decanting the valley", "Declaring goods").
- **Title:** a slow dusk pan across vine rows and the press, the logo from `E.font.title` with the title file, one menu: Continue (if a save exists), New Game (three big difficulty tiles), Last Stand, Extras (Cork Alley once found, cork-top gallery, documents found), Settings, About & Credits. Idle for 10 s anywhere on the title or its sub-menus starts the attract mode.
- **HUD in play:** minimal, big. Bottom left: VERA health as a tilted bottle whose wine level falls, plus a number; beneath it AMBROSE when present. Bottom right: ammo, large numerals, weapon icon, reserve. Top: objective line for 4 s when it changes. Centre: prompts, big, with a glyph. Crowns tick up beside the ammo only when they change. Radio with a portrait at the top left, non-modal. First-time hints, one at a time (Setting: Hints).
- **Evidence case (full screen, world frozen):** grid at left in large cells, item name and two lines at right, a row of glyph prompts at the bottom. Hold-to-rotate is never required. Auto-arrange button. A foam thud on placing things. Music ducks (`audio.duck`).
- **Duty-Free trolley:** the Man's animated portrait at left, tabs Buy / Sell / Tune-Up (L1/R1 or Q/E), one row of 5 large item tiles, the focused one's stats drawn as 3 to 4 big bars with before and after. Never a spreadsheet. Crowns large. His voice lines. Tune-Up shows the gun large and four bars.
- **Map:** the zone drawn large from its own rows, icons for you, objective, trolley, desk, stamps found, treasure (if the map was bought). Three legend items at most.
- **Passport (save and load):** three slots and the autosave drawn as passport pages, each with a chapter stamp, time, crowns. Uses `game.saves`. The stamp lands with a thunk when you save.
- **Results:** kills, accuracy, deaths, crowns, time, then a rank (S to C) stamped on. One screen.
- **Game Over:** the screen drains to wine red, one dry line ("Corked.", "Past its prime.", "He had a state dinner on Friday."), Continue from checkpoint or Quit.
- **Pause:** the engine's menu at TV size (`menu: { items: [['Map', ...], ['Sound', ...], ['Controller', ...], ['Dev mode', ...], ['About & Credits', ...]], settings: [...], controls: {...}, quit: 'title' }`).
- **Settings:** the engine's (Display, Sound, Comfort, Controller; `tv: true`), plus yours: aim assist, walk while aiming, aim dot, look sensitivity, subtitle size, hints, longer prompts, hold instead of mash, button symbols, gore (Must / Less). Invert aim is the engine's.
- **About & Credits:** paged, large type, from one data file: Credits, Source Information, Testing Feedback, Engine Feedback, Prompt Feedback (§19). Long answers page with left and right.

## 14. Audio: all code

Nothing but Web Audio made in code. Everything connects to the engine's buses (`audio.bus('sfx' | 'music' | 'voice')`), so the sliders and mute work.

**Music at 10%: [verified]** `menu: { settings: [{ key: 'music', value: .1 }] }` starts the Music slider at 10% (`game.settings.music === .1`, `audio.musicVolume === .1`). All music, including your own synth voices, must go through the music bus. Master volume stays at the engine's .7. Compose loud on the bus, so it still reads at the 10% default.

**Music** (original compositions; the engine's song format with `layer` and `audio.music(song, { fade })`, and your own instruments: `audio.instrument('fiddle', (ctx, bus, time, freq, dur, vol) => ...)` makes a `wave` a track can use):

| Cue | Idea |
|---|---|
| Title | D minor 6/8, 72 bpm. A hurdy-gurdy drone (saw through a narrow band-pass, slow vibrato), a lone fiddle (two detuned saws, soft attack), low wordless choir (formant filters). A real tune: this is the game's theme. |
| Explore, Acts I and II | Sparse: drone, plucked figure, a distant bell every 8 bars. Layers fade in with danger. |
| Tension layer | Heartbeat kick, scraping noise bands, a rising fiddle harmonic. |
| Combat | A stomping folk ostinato at 126 bpm: frame drum, tambourine, accordion-like stabs. Three layers by enemy count, so a big fight is audibly bigger. |
| The Crush | Combat, with the press's creak on the beat. |
| Safe (neon) | **Duty-free muzak:** bossa at 104 bpm, FM electric piano, major sevenths, brushed shaker. Cheerfully wrong. Comes through a filter as you approach the sign. |
| Boss | Odd meters: Treader 5/4 with heavy thuds; Comte a grotesque harpsichord over low brass; Vane industrial percussion. |
| The Toast | A slow mocking waltz on plucked strings. |
| Plant | Metal percussion, sub drone, mechanical rhythm. |
| Ending | A warm mock-patriotic brass chorale, slightly out of tune. |

**Effects.** Layered and physical, built from noise and oscillators with filters: guns (crack, body, tail; each gun different, with a distant echo outdoors), footsteps by ground type, kicks that thud, cork pops, bottles, wine slosh, door creaks, the press, the brush-cutter's two-stroke (saw with amplitude modulation, pitch follows the rev: the player must fear it from far away), hogs, spores, the DUTY FREE sign's buzz, the passport thunk, case foam, heartbeat, UI ticks. Keep an `sfx` table so one line defines one sound. Use the engine's `A.define` where it's enough, your own nodes where it isn't. Loops (a motor, rain, the sign's buzz): `const h = audio.sfx(sound, { loop: true, pan })`, then `h.set({ pan, vol })` and `h.stop(.3)`. A pitch that follows the rev needs your own nodes.

**Voices: Animalese-style gibberish.** `src/story/voices.js` makes a syllable per 1 to 2 letters as the text types (`new E.Dialog(game, { voice: (ch, i, talk) => {...} })`):
- A short pitched buzz through 2 to 3 band-pass formants chosen by the letter's vowel class, with a noise burst for consonants, on the voice bus.
- Pitch contour from punctuation: rises on `?`, falls at the end of a sentence, bigger on `!`.
- Letters hash to fixed formants, so the same word sounds the same every time. No samples, no real words.

| Speaker | Profile |
|---|---|
| Vera | Alto, clipped, flat contour |
| Ambrose | Reedy, high, slow, with little disapproving glides |
| Hobart | Mid, monotone, radio band-pass and static |
| Duty-Free Man | Bright, fast, sing-song, always rising |
| Sister Perpetua | Soft, level, unhurried |
| Odile | Very low, warm, rolling |
| Comte | Languid, wide vibrato, long vowels |
| Vane | Smooth, mid, perfectly even |
| Pressed | Short guttural syllables in threes, overlapping, pitched per villager |

Check sound by rendering or reading levels (TASK.md says how); nobody can listen here.

## 15. Attract and dev mode

**Attract mode.** On the title and its menus, 10 s without input starts it (`game.hook('input', fn)` runs every step, menus and all: a natural idle timer). It loops a series of AI-played segments, each a real zone with cheats on (god mode, infinite ammo, teleports, no-clip to skip travel):

1. Square: The Crush, kicks and SLAMs.
2. The trolley and case screens with a scripted cursor.
3. Terraces: Ambrose carried off and rescued, Nose.
4. Treader: chain shot, CLIMB.
5. The Toast with auto-pressed prompts.
6. Plant: gunfight, conveyors.
7. Last Stand with four bots.
8. Back to the title for 5 s, then again.

About 20 s each. Bots use the same `step(dt, ctl)` path and the zones' bot data. An overlay shows the logo and "Press any button". **Any input exits:** key, pad button or stick, mouse button or a real mouse move, a tap. The attract mode never touches saves or settings, and uses its own `Run` and seed. It runs on touch-only devices behind the notice, and never in a hub session.

**Dev mode** (pause menu → Dev mode; absent in hub sessions). A pad-first full-screen list over the frozen world, with L1/R1 tabs, using the focus system:

- **Tools:** god mode, infinite ammo, one-hit kills, freeze AI, no-clip and free fly camera, time scale (0.1 to 4), teleport (every chapter, zone, mark and encounter from a list), start or restart an encounter, skip boss phase, complete objective, spawn any enemy in front of you, give crowns, weapons, ammo, items, kill all, heal all, force a Bloom, force game over, reset the zone, unlock everything, play any QTE, music cue and layer test, voice test for each speaker.
- **Overlays:** hit zones, nav flow arrows and links and regions, enemy state labels and tokens, Director tension and need table, fps and frame stats, input viewer (shows glyph and device), coverage list.
- **Sliders (live, with values, and "Reset to defaults" for one tab or all).** Player: walk, sprint, look, aim wobble, aim assist, HP. Damage: to enemies, to player, head multiplier. Enemies: HP, speed, attack tokens, slot radius, attack cooldown, spawn cap, Bloom chance, throw rate. Economy: drop rate, crowns, prices. Ally: follow distance, HP, carry time. Camera: FOV, distance, shoulder. Director: tension lock. Prompt window. Sound: music, sfx, voice.

Sliders edit the `Tune` table that the game reads every step: all systems read `Tune.x`, never a copy. Defaults come from data. Changes last until reset or reload; they never enter a save, and the attract mode and hub rounds always use defaults.

## 16. Multiplayer

### The mode: Last Stand

A four-minute score attack in a walled arena (the `square` zone at night, re-dressed, with barricades, ammo crates, and health pickups). Waves come from the Director, with a looser token limit. Basket-Head at 2:00, and again at 3:15 with a friend. Everyone shares one world.

- **Score:** kill 100, head or knee follow-up melee 300, Bloom 200, combo chain +10% per kill inside 5 s, up to ×3, revive +500. The chain breaks if you go down.
- **Down, not out:** at zero HP you crawl (`Crawl`), and a teammate holds Action near you for 2 s within 20 s. If all are down, the round ends.
- **Characters by seat:** P1 Vera (M9, Tariff), P2 Sister Perpetua (Long Cork, M9), P3 the Duty-Free Man (Last Call, frag), P4 Ambrose (flare gun, Brandy Bombs, and a remarkable lack of concern). The seat colour (`#e8443a`, `#3b82f6`, `#22c55e`, `#f5b700`) colours each player's laser and a band on the arm. Names over heads come from the hub, drawn as text, never as HTML.

### In AI Hub (read `lib/hub/README.md` whole): `shared-world`, seats 1 to 4, **[verified]**

A World3D game passes all four of the hub's checks with host-authoritative play and the skeleton in §3.5: `players=2`, `players=4&latency=150&jitter=50&loss=5`, the same with `scenario=host-leave`, and `players=2&scenario=server`. A game-owned card passes too (Enter reached the engine's `confirm` from the harness's synthetic keys).

- **Joining:** when `AIHub.active`, skip title, attract and menus. `info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true })`. If it returns `null`, carry on as a normal launch. Boot **only** the arena, then `await game.booted; AIHub.ready();` with no key press. The harness allows 20 s, on a software renderer with up to five copies sharing the machine, so keep this boot light (the hub suite shows you if it isn't). In a session use `new E.Game({ autoPause: false, live: true, menu: { quit: false, items: [] } })`: the pause menu opens over a world that keeps stepping, with no dev mode and no quit.
- **The game's own card:** a 3D fly-over of the arena, the title, the players in their colours with Ready marks, how to win, this player's controls (from the prompt helper), the time left from the `card` event. Enter, Cross or a click on Ready calls `AIHub.answer('ready')`. Triangle, a named key or a click on More Time calls `AIHub.answer('more')`. No menus or choices, and no `Math.random` on it (`AIHub.rng('card')`).
- **The clock:** the round's clock is `AIHub.time()`, not game time: a slow machine's fixed steps fall behind real time. Play begins at `time() >= 0`. Show the countdown.
- **Who runs what:** the host (`info.isHost`) runs enemies, waves, damage, pickups and score, with `AIHub.rng('waves')` and friends. Each client runs its own player's movement and sends it; the host trusts it, clamped to a sane speed. Shots go to the host, and the host's body poses decide hits. `info.server` true means a host with no player of its own: no hero, no input, a slow overview camera.
- **Messages** (ints where possible):
  - Host to all, unreliable, 12 Hz: `{ t: 's', at, p: [[id, x, y, z, yaw, pitch, state, hp]...], e: [[id, type, x, y, z, yaw, clip, hpPct]...], c: clock }`. Keep each under **1,100 bytes** (over about 1,200 it splits and is lost whole if a piece drops): nearest enemies first, the rest in rotation.
  - Host to all, reliable, 5 Hz: `{ t: 'v', ev: [...] }`, with spawns, deaths, hit effects, score, pickups, downs, revives.
  - Client to host, unreliable, 12 Hz: `{ t: 'i', at, x, y, z, yaw, pitch, aim, move }`. Reliable at up to 6 Hz: `{ t: 'a', ev: [['fire', ox, oy, oz, dx, dy, dz, w], ['melee', id, kind], ['revive', id]] }`.
  - Limits: 20 messages a second leave each copy, bursts 40, 16 KB each. Stay under them.
- **Remote bodies:** interpolate 120 ms behind using `at`. Show your own muzzle flash, laser and sound at once, and the host's result when it arrives. Enemies on a client are puppets: `a.place` from the snapshot, the clip from its index, no AI.
- **End:** on all-down or at 4:00 the host calls `AIHub.finish({ standings, scores, stats, awards })`, standings by personal score, best first. No `won`, so medals show. Awards such as Sharpest Palate (head shots), Bouncer (kicks), Designated Driver (revives), Over-Served (downs). On `time-up`, the host finishes at once. On `end`, stop input, sending and sound. On `leave`, remove that player and carry on.
- **Rules:** network only through the hub; no chat, no custom names; no `alert`, `confirm`, `prompt`, `window.open` or leaving the page. Quit does nothing in a session. `session.js` stays unmodified.

### On its own

`AIHub.active` false: everything else in this plan, and Last Stand from the title:

- **Solo:** choose a character on a big 4-tile screen; a score table in `E.store`.
- **Couch co-op, 2 players on one TV, [verified]:** press Start on a second pad (or 2 on the keyboard) on the Last Stand screen. `game.allowJoin({ max: 2, onJoin })`, `game.splitScreen(2, { follow: [h1, h2], layout: 'auto' })`, `world.addCamera({ mode: 'fixed', fixed: {...} })`, and set `world.cameras[1].fixed` each step. The scene's `draw(r)` runs once per viewport (`r.viewport`), and `scene.hud(r)` once over the whole screen. Filters are off while split.

**Why both:** TASK.md asks for multiplayer in the hub "as well as for the game on its own". Online play in a session is hub-only by its rules; a friend on your couch is how the game on its own gets multiplayer on a TV. The campaign stays single player.

## 17. Testing

**One command:** `node tests/run.mjs [suite ...]` prints only failures and one line: `212 passed, 0 failed`. Run a suite only after changing the code it covers. Don't use subagents or workflows to debate, review, judge or audit. Screenshots only for what a script can't check.

**How it drives the game [verified]:** Playwright 1.63.0 (installed in §3.1) opens the built file on `file://`. `page.evaluate` runs the game at full speed, without drawing, through `__game.step` or `game.advance(seconds)`, and `game.input.hold / tap` script input. Long runs go in slices of a few seconds of wall time so the protocol doesn't time out. Wait on state, not the clock: under this machine's load, frames are slow, and late ones give up their time. Keep one or two browsers open, close them when done, and treat "Target closed" as memory (TASK.md).

**A DualSense in tests [verified]:**
```js
await page.addInitScript(() => {
  const btn = () => ({ pressed: false, touched: false, value: 0 });
  window.__pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: 1, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn) };
  navigator.getGamepads = () => [window.__pad, null, null, null];
});
// R2 at 60%: __pad.buttons[7] = { pressed: true, touched: true, value: .6 }; __pad.timestamp++;
```

**The bots.** Each zone's data has a bot path: `[['goto', 'mark'], ['act'], ['fight', 'all'], ['take', 'key'], ['qte'], ...]`. A shared player bot turns it into `ctl` input: walks the flow field, opens doors, aims at the nearest enemy's zone, kicks when it can, uses healing, solves puzzles from the zone's data. See `HORROR.bot()` in the kit. The same paths drive the attract mode.

**Suites.**

| Suite | Checks |
|---|---|
| `data` (Node, no browser) | Level rows even, legend known, marks present, every zone's regions reachable or linked. Items fit the case, prices positive, every line's speaker known. `FEATURES` all referenced. No `TODO`, `FIXME`, `placeholder` or `lorem` anywhere in `src/`. No `Math.random` in rules files. |
| `boot` | Opens on `file://` with no page errors, no `game.errors`, no external requests. Title shows the title file. `session.js` is byte-identical and the first script. |
| `playthrough` | **The whole game, New Game to credits:** the tour bot (cheats allowed) in every zone, no softlock, every `FEATURES` entry marked, every zone's exit reached. Save then load mid-run restores the same `world.hash()` and `Run` state. |
| `webgpu` | The zone-swapping part of the playthrough on WebGPU with `standInCanvas` (§3.6): no errors, `__readFrame` isn't blank. **This suite caught the dispose crash; run it after any change to zone loading or materials.** |
| `fair` | With no cheats on Agent difficulty, the bot finishes the Prologue and Chapter 1. Numbers to read for balance: deaths, ammo floor, crowns at the end vs §7's target. |
| `determinism` | The same inputs give the same hash twice. |
| `combat` | One scenario per enemy, reaction and weapon: head gives stagger, knee gives kneel, KICK/SLAM/FRISK fire and pay out, Exclusive unlocks, grenades, Bloom kills, ally states. |
| `ui` | Glyphs: PlayStation by default, Xbox via Settings, keys and mouse follow the last device, without flipping between keyboard and mouse. Mouse hover moves focus and click selects on every custom screen (`input.feed` or real `page.mouse`). Every screen opens and closes by pad and by keyboard. The engine's menus are at TV scale. |
| `attract` | Not at 9.9 s of idle, yes at 10.1 s (`game.advance`). Each input type exits. It writes no save. It loops. It runs on the phone profile. |
| `touch` | iPhone profile, on Chromium and once on WebKit: notice text, Settings button works, no touch buttons drawn, attract visible behind it. |
| `dev` | Reachable from pause. Every slider changes `Tune` live and the game reads it. Reset restores defaults exactly. Absent in a session. |
| `audio` | `settings.music === .1` on a fresh start. Each music cue and speaker voice produces signal on the right bus (AnalyserNode, or render in an OfflineAudioContext). |
| `split` | Two stubbed pads, the second joins with Start, two viewports draw, both move. |
| `hub` | Below. |

**The hub suite.** Copy the built file as `game.html`, with `lib/hub/{harness.html,bridge.js,round.js}`, into `tests/.serve/`. Start the server from Node: spawn `python3 -u -m http.server 0 --bind 127.0.0.1 --directory tests/.serve`, read the port from its first line, and confirm the page's title is your game's before trusting a result. Open `http://127.0.0.1:PORT/harness.html?game=game.html&auto=1&<each case>`:
`players=2`; `players=4&latency=150&jitter=50&loss=5`; the same with `&scenario=host-leave`; `players=2&scenario=server`.
Wait for `document.body.dataset.complete === 'true'`; pass means `window.__hubCheck.pass`. Print the names of failed `checks`. Each case took 12 to 21 s for the first-boot game. Stop your server by its own PID. Add one test with no hub (the game opens normally), and one on `players=2` that reads both frames of the harness and checks that a kill on the host shows on the client.

**Pictures (rarely, by hand).** `page.screenshot()` at 1920×1080 with WebGL 2, for the look and the 10-foot read. For motion, a strip: `game.advance(1/12)` then a screenshot, 8 times, into one image with `magick montage`. Check the kick, the SLAM, the boss's stomp, a Bloom burst. Run one WebKit and one Firefox boot near the end (§3.6). The kit's hash was identical across all of them, so yours should be too.

## 18. Build order

Each milestone ends with the game building, tests green, and something you could hand over. The chapter list is data, so the ending always follows the last chapter that exists.

| # | Milestone | Done when |
|---|---|---|
| M0 | Setup, patch, build, first boot (§3), test runner, hub and webgpu suites | §3.5 runs from `file://`; four hub cases pass |
| M1 | Player: soldier body, camera, input map, prompts, aim, laser, fire, reload, weapons as data, in a `range` test zone | It holds up with stubbed pad and mouse by the numbers, and a strip looks right |
| M2 | Enemies: clip bodies, hit zones, Picker, tokens and slots, KICK, SLAM, grab, the **dev mode with sliders** | The fight in `range` against 12 Pickers is tense and fair by the `fair` metrics. The dev mode exists from here on, and you use it |
| M3 | Items: case, pickups, crates, trolley, tuning, passport saves, results, HUD, Map | Buy, tune, save, load, die, continue |
| M4 | Story tech: dialog, voices, radio, cutscene helpers, QTE; title, pause, settings, About; audio core; first songs | A cutscene plays with gibberish and subtitles; music at 10% |
| M5 | Prologue and Chapter 1, including Basket-Head, Cork Alley, stamps | Playable start to results; bots finish it |
| M6 | Ambrose, Bloom, Chapter 2, The Treader | Playable to the château gate. **This is the core game: polish it until it's good before going wider** |
| M7 | Last Stand: solo, split, full hub round; attract mode | All hub cases pass with the real game; attract loops |
| M8 | Chapters 3 and 4, The Toast, the rail ride, Comte | Playable |
| M9 | Chapter 5, Vane, ending, unlocks | Full playthrough suite green with every feature marked |
| M10 | The polish pass: 10-foot UI at 1080p, audio mix, one-liners, feel, deaths and difficulty, About & Credits with real answers, exit interview, final build | §19 |

**If you must cut,** cut from this list, top first, and keep the game whole (the ending follows the last chapter, and `FEATURES` shrinks to match):
1. `tanks`.
2. `coldroom` and the Fermenter.
3. `gardens` down to a short walk.
4. Rail ride down to a corridor chase.
5. Enemy-raised ladders.
6. Riot Guard.
7. Chapter 5 entirely: end at the Comte, with the Magnum and sabre finale moved to him.

Never cut: anything TASK.md requires, Ambrose, the trolley, the case, Prologue, Chapters 1 and 2, The Toast, at least two bosses, Last Stand in all three forms, attract, dev mode.

**Where to spend extra effort:** the feel of aim and kick, the crowd, Ambrose's writing, the trolley's joke landing, the first ten minutes. Not on photorealism: the charm is the point.

## 19. Definition of done

**Everything TASK.md asks, in one list:**

- [ ] The single HTML file in the root, as TASK.md names it, self-contained, from `file://`. All dev files in the dev folder, as TASK.md names it.
- [ ] Title picked by a real RNG from 50 riffs; on the title screen, in `<title>`, in About, in the exit interview.
- [ ] Original world, characters, writing, art and music, per §1. Writing style matches the source's pulp register, per §11.
- [ ] Feature-complete demo: every `FEATURES` entry marked by the scripted playthrough. No TODOs, placeholders or stubs: a menu item either works or doesn't exist. Built from data so the rest could be built out later.
- [ ] Dev mode from the pause menu: tools and live sliders with reset to defaults.
- [ ] Attract mode: 10 s idle on title or menus, loops AI play, any input exits; runs on touch-only devices.
- [ ] Multiplayer: hub `shared-world` passes all harness cases with the real game; the game runs on its own, with solo and split-screen Last Stand.
- [ ] Controller first on a TV at 10 feet: same screens for keyboard and mouse; keys PC players expect; mouse aims, looks and clicks, and hover moves focus; prompts follow the last input; PlayStation glyphs by default, Xbox option in Settings; no dense data screens.
- [ ] Touch-only: no touch controls, "Controller or keyboard required", the Settings button, attract running.
- [ ] Audio all code; voices gibberish; Music defaults to 10%.
- [ ] Tests behind one command, printing only failures and a one-line count, including a scripted playthrough of the whole game.
- [ ] Only your own processes stopped, by PID. Nothing written outside your folder.

**About & Credits and the chat reply.** TASK.md's Source Information, Testing Feedback, Engine Feedback and Prompt Feedback go in **both** your final chat reply and the in-game screen, with "unknown" for anything you can't confirm. Keep the answers in one file (`src/core/about.js`) that the screen renders and the exit interview is made from. Pull the numbers from `NOTES.md`. Answer honestly about what happened in *your* build; don't copy this plan's expectations. Likely values, to be corrected by what you actually did:

- **Plan:** `PLAN.md`
- **Genre / Perspective:** over-the-shoulder action horror / third person, over the shoulder.
- **Tech:** my-3D2dge (the version on `engine/API.md`'s first line) with World3D, three.js r182 (WebGPU, falling back to WebGL 2), Rapier 0.19.3, esbuild, AI Hub client 1.4.0.
- **Online:** AI Hub Session Protocol v1, shared-world, 1 to 4; 2-player split-screen on its own.
- **Usage:** `added on import`, exactly.

**The exit interview** (shape in TASK.md; check it parses as JSON). For its `aiHub` block, unless you found better:

- `name`: your title.
- `tagline`: `Anything to declare?`
- `description`: `An over-the-shoulder action-horror romp: a deadpan federal agent, a fearless snob of a sommelier, and a valley of vineyard folk with something growing in them. Shoot, kick, haggle, and get him home for the state dinner.`
- `type`: `Game`. `genre`: `Horror`. `source`: `Resident Evil 4`. `series`: `Resident Evil`. `players`: `1–4`.
- `controls`: `Left stick or WASD move, right stick or mouse look, L2 or right click aim, R2 or left click fire, Cross or E action.`
- `tags`: `3d`, `third-person`, `story`, `co-op`, `comedy`, `boss fights`.
