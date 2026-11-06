// PLAN.md, read against what was built. It parses the plan's own text wherever it can, so the two can't drift apart.
// Behaviour is checked by the other suites (docs/PLAN-CHECK.md says which); this one holds the concrete content.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAM, MOVE, TUNING_DEFAULTS, DIFFICULTY } from '../../src/data/tuning.js';
import { WEAPONS, GRENADES, KNIFE, TUNE_PRICES } from '../../src/data/weapons.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { ITEMS, TREASURE } from '../../src/data/items.js';
import { PRICES, STOCK } from '../../src/data/shop.js';
import { NOTES } from '../../src/data/notes.js';
import { SONGS } from '../../src/audio/songs.js';
import { MOODS } from '../../src/game/world.js';
import { MAPS } from '../../src/game/mapPaint.js';
import { PALETTE } from '../../pixel-engine.js';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const ENGINE_SHA = '80408b4c72ef08be3ec628d578f8b008644c1c7e447a4cc8c5979b08212e78aa';

export default async function (t) {
  const planPath = join(DEV, '..', 'PLAN.md');
  if (!existsSync(planPath)) { t.log('no PLAN.md beside the dev folder: nothing to compare'); return; }
  const planText = readFileSync(planPath, 'utf8');
  const plan = planText.split('\n');
  const section = (from, to) => { const a = plan.findIndex((l) => l.startsWith(from)); const b = plan.findIndex((l, i) => i > a && l.startsWith(to)); return plan.slice(a, b); };
  const srcFiles = walk(join(DEV, 'src')).filter((f) => /\.m?js$/.test(f));
  const SRC = srcFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
  const NSRC = norm(SRC);
  const none = (label, total, missing) => t.ok(missing.length === 0, `${label}: ${total - missing.length}/${total}${missing.length ? ` missing: ${missing.slice(0, 8).join(' | ')}` : ''}`);

  // ---- 1 Originality guardrails. ----
  const banned = /\b(Leon|Ashley|Ada|Luis|Krauser|Salazar|Saddler|Hunnigan|Plagas|Ganados|Umbrella|Raccoon|Spain|Spanish|stranger)\b/i;
  none('no guardrail names', srcFiles.length, srcFiles.filter((f) => banned.test(readFileSync(f, 'utf8'))).map((f) => f.slice(DEV.length)));
  none('the source named only in About', srcFiles.length, srcFiles.filter((f) => /Resident Evil/.test(readFileSync(f, 'utf8')) && !f.endsWith('about.js')).map((f) => f.slice(DEV.length)));

  // ---- 2 The script, word for word. ----
  const a = plan.findIndex((l) => l.startsWith('ARRIVAL (pier')); const b = plan.findIndex((l, i) => i > a && l.startsWith('```'));
  let lines = plan.slice(a, b).map((l) => l.match(/^[A-Z][A-Za-z.]*: (?:\(gibberish, subtitle\) )?(.+)$/)).filter(Boolean).map((m) => m[1]);
  lines = lines.flatMap((l) => l.split(' / ')).map((l) => l.replace(/^(Greet|Buy|Sell|Tune|Can't afford|Leave): /, ''));
  none('script lines', lines.length, lines.filter((l) => !NSRC.includes(norm(l))));
  const barkStart = plan.findIndex((l) => l.startsWith('**Commodore Tannoy lines**')); const barkEnd = plan.findIndex((l) => l.startsWith('Chapter cards:')) + 1;
  const barks = plan.slice(barkStart, barkEnd).join('\n').match(/`[^`]+`/g).map((s) => s.slice(1, -1)).filter((s) => !['-', "'", 'Noted.', 'Thank you.'].includes(s));
  none('Tannoy, bark, radio and card lines', barks.length, barks.filter((l) => !NSRC.includes(norm(l))));

  // ---- 4.1 Movement and camera. ----
  t.eq(TUNING_DEFAULTS.walkSpeed, 3, 'walk 3.0'); t.eq(TUNING_DEFAULTS.runSpeed, 4.8, 'run 4.8');
  t.eq(MOVE.slowSpeed, 1.6, 'under 55% tilt 1.6'); t.eq(MOVE.slowTilt, 0.55, 'tilt 55%'); t.eq(MOVE.accel, 18, 'acceleration 18'); t.eq(MOVE.quickTurn, 0.3, 'quick turn 0.3 s');
  t.eq(JSON.stringify(CAM.explore), JSON.stringify({ dist: 4, up: 0.45, side: 0.55, fov: 55 }), 'explore camera');
  t.eq(JSON.stringify(CAM.aim), JSON.stringify({ dist: 2.9, up: 0.1, side: 0.95, fov: 42 }), 'aim camera');
  t.eq(CAM.scopeFov, 16, 'scope fov 16'); t.eq(CAM.ease, 0.16, 'ease 0.16 s'); t.eq(CAM.mouseExplore, 0.0026, 'mouse explore'); t.eq(TUNING_DEFAULTS.mouseAimSpeed, 0.0016, 'mouse aim');
  t.eq(CAM.pitchMin, -0.7, 'pitch min'); t.eq(CAM.pitchMax, 0.7, 'pitch max');

  // ---- 4.4 Weapons, read from the plan's table. ----
  const wm = [];
  for (const m of planText.matchAll(/^\| (pistol|scatter|rifle|harpoon) \| [^|]+ \| ([\d.]+)[^|]*\| ([\d.]+) \| (\d+) \| ([\d.]+) \| ([\d.]+) \| [^|]* \| (\d)×(\d) \| (\w+) \|$/gm)) {
    const d = WEAPONS[m[1]]; const want = { damage: +m[2], interval: +m[3], mag: +m[4], reload: +m[5], sway: +m[6], w: +m[7], h: +m[8], price: m[9] === 'start' ? 0 : +m[9] };
    for (const [k, v] of Object.entries(want)) if (d?.[k] !== v) wm.push(`${m[1]}.${k} ${d?.[k]} != ${v}`);
  }
  none('weapon table', 32, wm);
  t.eq(JSON.stringify(TUNE_PRICES.at(0)) + JSON.stringify(TUNE_PRICES.at(-1)), '3001500', 'tuning 300 to 1500');
  t.ok(GRENADES.flare.radius === 6 && GRENADES.flare.blind === 4, 'flare: 6 m, 4 s'); t.ok(GRENADES.depth.fuse === 1.5 && GRENADES.depth.damage === 80 && GRENADES.depth.radius === 4, 'depth charge: 1.5 s, 80, 4 m');
  t.ok(GRENADES.oil.burn === 3 && GRENADES.oil.dps === 15, 'oil: 3 s, 15 a second'); t.ok(KNIFE.damage === 8 && KNIFE.time === 0.4 && KNIFE.reach === 2 && KNIFE.downed === 3, 'knife: 8, 0.4 s, 2 m, x3');

  // ---- 4.5, 4.6 Items, treasure, prices. ----
  const im = [];
  for (const [id, w, h, max] of [['ammoPistol', 2, 1, 50], ['ammoShells', 2, 1, 24], ['ammoRifle', 2, 1, 20], ['ammoBolts', 3, 1, 6]]) if (ITEMS[id].w !== w || ITEMS[id].h !== h || ITEMS[id].max !== max) im.push(id);
  for (const id of ['samphire', 'dulse', 'holly', 'tin', 'flare', 'depth', 'oil']) if (ITEMS[id]?.w !== 1 || ITEMS[id]?.h !== 2) im.push(`${id} footprint`);
  for (const [k, v] of Object.entries({ pearl: 500, blackPearl: 1500, seaGlass: 400, amber: 700, scrimshaw: 900, goldTooth: 150, reliquary: 1200 })) { const x = TREASURE[k]; if ((x?.value ?? x?.price ?? x) !== v) im.push(k); }
  if (PRICES.tin !== 800 || PRICES.caseMedium !== 1500 || PRICES.caseLarge !== 4000 || PRICES.chart !== 300) im.push('prices');
  none('items, footprints, treasure, prices', 16, im);

  // ---- 4.8 Enemies, read from the plan's table. ----
  const em = [];
  let enemies = 0;
  for (const m of planText.matchAll(/^\| (gaffer|netwife|bottler|runner|carrier|flenser|limpet|monk|knight|drowned|harpooner) \| [^|]+ \| (\d+)[^|]*\| ([^|]+) \|/gm)) {
    enemies++;
    const d = ENEMIES[m[1]];
    if (d?.hp !== +m[2]) em.push(`${m[1]}.hp ${d?.hp} != ${m[2]}`);
    const sp = m[3].trim().match(/^([\d.]+)(?:-([\d.]+))?/);
    if (sp && (d.speed[0] !== +sp[1] || d.speed[1] !== +(sp[2] ?? sp[1]))) em.push(`${m[1]}.speed ${d.speed} != ${m[3]}`);
  }
  t.eq(enemies, 11, 'the plan\'s enemy table is all there');
  none('enemy hp and speed', enemies * 2, em);
  t.ok(ENEMIES.knight.helmet === 40, 'knight helmet 40'); t.ok(ENEMIES.gaffer.grabChance === 0.2 && ENEMIES.gaffer.grabDps === 6, 'islander grab: 20%, 6 a second'); t.ok(ENEMIES.harpooner.glint, 'harpooner has a glint');

  // ---- 5 Maps: the plan's painter commands, every one. ----
  const mapsSrc = readFileSync(join(DEV, 'src/data/levels/maps.js'), 'utf8');
  const mapStart = plan.findIndex((l) => /^map quay /.test(l));
  const mapEnd = plan.findIndex((l, i) => i > mapStart && (l.startsWith('```') || /^\s*$/.test(l)));
  const commands = plan.slice(mapStart, mapEnd).filter((l) => !/^map /.test(l)).flatMap((l) => l.split(' | ').map((c) => c.trim()));
  const inSrc = new Set(mapsSrc.split('\n').flatMap((l) => l.split(' | ').map((c) => c.trim())));
  none('map painter commands', commands.length, commands.filter((c) => !inSrc.has(c)));
  const count = (ch) => Object.values(MAPS).reduce((n, m) => n + (m.rows.join('').split(ch).length - 1), 0);
  t.eq(count('m'), 6, 'six Mr. Fathoms'); t.eq(count('y'), 15, 'fifteen Tannoys');
  t.ok(MAPS.cannery.rows.join('').split('t').length - 1 === 2, 'the Cannery has its office and its north corridor telegraph');

  // ---- 4.6, 17 Everything in the data is in the game. ----
  const placed = walk(join(DEV, 'src/data/levels')).map((f) => readFileSync(f, 'utf8')).join('\n') + readFileSync(join(DEV, 'src/game/loot.js'), 'utf8') + walk(join(DEV, 'src/game/bosses')).map((f) => readFileSync(f, 'utf8')).join('\n') + readFileSync(join(DEV, 'src/data/shop.js'), 'utf8');
  const sold = new Set(Object.values(STOCK).flat());
  const items = Object.keys(ITEMS).filter((id) => !/^mix/.test(id));
  none('every item obtainable', items.length, items.filter((id) => !sold.has(id) && !new RegExp(`['"]${id}['"]`).test(placed)));
  const treasure = Object.keys(TREASURE).filter((id) => !/Full$/.test(id));
  none('every treasure placed', treasure.length, treasure.filter((id) => !new RegExp(`['"]${id}['"]`).test(placed)));
  const noteIds = Array.isArray(NOTES) ? NOTES.map((n) => n.id) : Object.keys(NOTES);
  t.eq(noteIds.length, 6, 'six Claim Notes');
  none('every note placed', noteIds.length, noteIds.filter((id) => !placed.includes(id)));
  const elsewhere = srcFiles.filter((f) => !f.endsWith('enemies.js') && !f.endsWith('dev.js')).map((f) => readFileSync(f, 'utf8')).join('\n');
  none('every enemy spawned in play', Object.keys(ENEMIES).length, Object.keys(ENEMIES).filter((id) => !new RegExp(`['"]${id}['"]`).test(elsewhere)));

  // ---- 8 Moods, as the plan's table has them. Dawn: "a first guess, so check it": checked by eye, and its fog moved. ----
  const mood = (n, hour, sun, ambient, color, top, amount, near, far, bg) => {
    const m = MOODS[n];
    t.ok(m.hour === hour && m.sun === sun && m.ambient === ambient && m.fog.color === color && m.fog.top === top && m.fog.amount === amount && m.fog.near === near && m.fog.far === far && m.bg === bg, `mood ${n}`);
  };
  mood('dusk', 18.6, 1, 1.1, 0x4a3a5a, 1.2, 0.55, 12, 70, PALETTE.plum);
  mood('rain', 21.5, 0.5, 1, PALETTE.night, 2, 0.7, 8, 46, PALETTE.ink);
  mood('abbey', 2, 0.25, 0.8, PALETTE.ink, 0.8, 0.5, 10, 40, PALETTE.ink);
  t.ok(MOODS.dawn.hour === 6.5 && MOODS.dawn.sun === 1.2 && MOODS.dawn.ambient === 1.2 && MOODS.dawn.fog.near === 30 && MOODS.dawn.fog.far === 120, 'mood dawn');
  t.eq(MOODS.rain.rain, 900, 'rain: 900 drops');

  // ---- 9 Clips. ----
  const clips = 'AimPistol AimLong FirePistol FireLong ReloadPistol ReloadPump ReloadBolt Roundhouse HipThrow KnifeSlash DoorKick Vault LadderUp QuickTurn Throw Boost Stagger KnockedDown StampForm Shamble Lurch WorkChop WorkMend RaiseTool Swing ThrowOverhand StunHands KneelHit BashDoor ClimbIn WalkToSea Wade SawRev SawSwing SawLunge ShieldWalk ShieldBlock FlailSpin KnightWalk HalberdSweep DrownedRise CarrierShoulder CarrierWalk DameWalk DameCane DameBarrelIn DameHoist FathomIdle FathomPresent AnsgarHook AnsgarSwing BosunDrag BosunSweep BosunThrow BosunStomp BosunKneel BosunRoar BathyWalk BathyCharge BathySag MotherSpit'.split(' ');
  for (const n of clips) if (!planText.includes(n)) t.ok(false, `the plan no longer names ${n}`);
  const clipSrc = readFileSync(join(DEV, 'src/data/clips.js'), 'utf8');
  none('clips defined', clips.length, clips.filter((n) => !new RegExp(`\\b${n}\\b`).test(clipSrc)));

  // ---- 10 Songs, tempos, sounds, voices. ----
  const sm = [];
  let songs = 0;
  for (const m of planText.matchAll(/^\| `(\w+)` \| (?:(\d+) bpm)?/gm)) {
    if (!['title', 'explore', 'combat', 'siege', 'shop', 'safe', 'boss', 'onhold', 'tide', 'dawn'].includes(m[1])) continue;
    songs++;
    if (!SONGS[m[1]]) sm.push(`${m[1]} absent`);
    else if (m[2] && (SONGS[m[1]].bpm ?? SONGS[m[1]].tempo) !== +m[2]) sm.push(`${m[1]} tempo`);
  }
  t.eq(songs, 10, 'ten songs in the plan');
  none('songs and tempos', songs, sm);
  const sfx = readFileSync(join(DEV, 'src/audio/sfx.js'), 'utf8').toLowerCase();
  const wanted = ['pistol', 'scatter', 'rifle', 'harpoon', 'dry', 'reload', 'kick', 'knife', 'hit', 'pop', 'grunt', 'door', 'glass', 'ladder', 'crate', 'barrel', 'flare', 'depth', 'fire', 'tannoy', 'foghorn', 'saw', 'steam', 'rain', 'sea', 'gull', 'conveyor', 'crane', 'chain', 'telegraph', 'bubbl', 'ui', 'stamp', 'qte', 'heartbeat', 'skitter'];
  none('sounds named in the plan', wanted.length, wanted.filter((n) => !sfx.includes(n)));
  const voice = readFileSync(join(DEV, 'src/audio/voice.js'), 'utf8').toLowerCase();
  none('voices', 8, ['max', 'dame', 'commodore', 'fathom', 'pym', 'islander', 'monk', 'bosun'].filter((n) => !voice.includes(n)));

  // ---- 11, 12 Menus and sliders. ----
  const menus = ['CONTINUE', 'NEW CLAIM', 'NIGHT SHIFT', 'SETTINGS', 'ABOUT', 'RESUME', 'RESTART FROM CHECKPOINT', 'DEV MODE', 'QUIT TO TITLE', 'MUSIC', 'SFX', 'VOICE', 'MASTER', 'INVERT Y', 'AIM ASSIST', 'CONTROLLER GLYPHS', 'SCREEN SHAKE', 'LOOK', 'PIXEL SIZE', 'QUALITY', 'FRAME RATE', 'FULLSCREEN', 'GOD MODE', 'NO-CLIP', 'INFINITE AMMO', 'ONE-HIT KILLS', 'FREEZE AI', 'SHOW HIT ZONES', 'SHOW NAV', 'SHOW TRIGGERS', 'GAME SPEED', 'SKIP CUTSCENE', 'GIVE 10,000', 'FILL CASE', 'KILL ALL', 'UNLOCK ALL', 'ENGINE DEBUG', 'TOOLS', 'TELEPORT', 'SPAWN', 'BALANCE', 'VALUABLES', 'KEY ITEMS', 'MAP', 'FILES', 'RADIO', 'BUY', 'SELL', 'TUNE', 'CLAIM FORM', 'CLAIM DENIED', 'CONTROLLER OR KEYBOARD REQUIRED', 'PRESS ANY BUTTON', 'KEYBOARD NEEDED', 'CLICK TO AIM', 'LAPSED', 'COVERAGE', 'DAME TAKEN'];
  none('menu and HUD words', menus.length, menus.filter((w) => !SRC.includes(w)));
  const sliderLine = plan.find((l) => l.startsWith('- **BALANCE: live sliders**')).match(/`(walkSpeed[^`]+)`/)[1].split(' ');
  t.eq(sliderLine.length, 24, 'the plan lists 24 sliders');
  none('dev sliders', sliderLine.length, sliderLine.filter((n) => TUNING_DEFAULTS[n] === undefined));

  // ---- 14 Layout. ----
  const layoutEnd = plan.findIndex((l) => l.startsWith('**Data-driven so designers'));
  const layoutStart = plan.findIndex((l) => l.startsWith('### Folder layout'));
  const named = [];
  for (const l of plan.slice(layoutStart, layoutEnd)) {
    const m = l.match(/^(src\/\w+\/|tools\/|tests\/|docs\/|vendor\/hub\/)\s+(.*)$/);
    if (!m) continue;
    for (const f of m[2].split(/[\s,()]+/)) if (/^[\w*/]+\.(js|mjs|py|md|html)$/.test(f) && !f.includes('*')) named.push(join(m[1], f));
  }
  t.ok(named.length > 40, `the layout lists files (${named.length})`);
  none('files the layout names', named.length, named.filter((f) => !existsSync(join(DEV, f))));
  t.ok(readdirSync(join(DEV, 'src/game/enemies')).length > 0 && readdirSync(join(DEV, 'src/game/bosses')).length > 0, 'enemies/ and bosses/ hold their modules');

  // ---- 14, TASK.md The engine as it ships, and the deliverables. ----
  t.eq(createHash('sha256').update(readFileSync(join(DEV, 'pixel-engine.js'))).digest('hex'), ENGINE_SHA, 'pixel-engine.js is untouched');
  none('no TODO markers', srcFiles.length, srcFiles.filter((f) => /\b(TODO|FIXME|XXX|HACK)\b/.test(readFileSync(f, 'utf8'))).map((f) => f.slice(DEV.length)));
  const root = join(DEV, '..');
  const html = readdirSync(root).find((f) => f.endsWith('.html'));
  t.ok(html, 'the single HTML file is in the root');
  const head = readFileSync(join(root, html), 'utf8').slice(0, 80000);
  none('hub tags', 7, ['hub:session"', 'hub:session-players', 'hub:session-mode', 'hub:session-goal', 'hub:session-howto', 'hub:session-minutes', 'hub:webgpu'].filter((m) => !head.includes(m)));
  const ex = JSON.parse(readFileSync(join(root, 'exit-interview.json'), 'utf8'));
  t.eq(Object.keys(ex.sourceInformation).join(), 'date,source,plan,genre,perspective,tech,artDirection,animation,audio,online,testing,research,environment,model,usage', 'exit interview: source fields');
  t.ok(ex.testingFeedback.length === 4 && ex.engineFeedback.length === 6 && ex.promptFeedback.length === 4, 'exit interview: every question answered');
  t.ok(ex.aiHub.type === 'Game' && ex.aiHub.genre === 'Horror' && ex.aiHub.source === 'Resident Evil 4' && ex.aiHub.series === 'Resident Evil' && ex.aiHub.players === '1–4', 'exit interview: the plan\'s catalogue values');
  t.eq(ex.sourceInformation.usage, 'added on import', 'usage reads added on import');
  // ---- 4.13 Difficulty. ----
  t.ok(DIFFICULTY.assisted.enemyDamage === 0.6 && DIFFICULTY.assisted.aimAssist === 1.5 && DIFFICULTY.assisted.sawLethal === false && DIFFICULTY.assisted.loot === 1.3, 'Assisted');
  t.ok(DIFFICULTY.standard.enemyDamage === 1 && DIFFICULTY.standard.sawLethal === true, 'Standard');
  t.ok(DIFFICULTY.professional.enemyDamage === 1.4 && DIFFICULTY.professional.tokens === 1 && DIFFICULTY.professional.loot === 0.8, 'Professional');
}
