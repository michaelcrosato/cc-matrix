// node tools/evidence.mjs: raw evidence from the SHIPPED file, not pass / fail. The bundle's own three inline scripts
// (session client, engine, game) run in a headless page and play every mission on the playthrough's autopilot routes
// (which teleport between beats and play in god mode; both are counted and printed), logging what the game itself
// reports on its event bus: objectives, Silent Cuts by kind, kills, tools, grapples, bells, detections, parries, bosses,
// the lines spoken, the songs. Then the story's own words, the inventory, and (in Chromium) which of the game's own
// shapes each mission draws. Writes the same text to tests/EVIDENCE.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NAME } from './name.mjs';
import { makeContext } from '../tests/context.mjs';
import { ROUTES, runRoute } from '../tests/routes.mjs';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..'), FILE = join(DEV, '..', NAME + '.html'), html = readFileSync(FILE, 'utf8');
const out = [], say = s => { out.push(s); console.log(s); };
const OWN = [...readFileSync(join(DEV, 'src', '20-assets.js'), 'utf8').matchAll(/^  ([a-zA-Z]+): \{ about: /gm)].map(m => m[1]);
// the shipped file and what runs below
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]), names = ['aihub-session.js', 'my-3d2dge.js', 'game.js'];
say(`# Evidence from ${NAME}.html (${(html.length / 1048576).toFixed(2)} MB)`, );
say('Its inline scripts, run as they are below: ' + scripts.map((s, i) => `${names[i] || 'script' + i} ${(s.length / 1024).toFixed(0)} KB sha256 ${createHash('sha256').update(s).digest('hex').slice(0, 12)}`).join(' · '));
const P = makeContext({ scripts: scripts.map((s, i) => [names[i] || 'script' + i, s]) }), { game, B, I } = P;
const t = { ...P, step: s => game.advance(s), tap: a => I.tap(a), hold: (a, on = true) => I.hold(a, on), load: (id, opts) => { game.debug.load(id, opts); game.advance(1 / 30); } };
game.advance(.5);
// what the game reports while it plays
let L = null; const bump = (k, n = 1) => { L.c[k] = (L.c[k] || 0) + n; };
const on = (ev, f) => B.on(ev, e => { if (L) f(e || {}); });
on('silentCut', e => bump('Silent Cut (' + e.kind + ')')); on('mark', e => bump('Silent Cut on a training mark (' + e.kind + ')')); on('kill', e => bump('kill by ' + (e.how || 'strike')));
on('toolUsed', e => bump('tool ' + e.tool)); on('grapple', () => bump('grapple')); on('bell', () => bump('bell rung')); on('detected', () => bump('detected'));
on('parry', () => bump('parry')); on('riposte', () => bump('riposte')); on('pickup', () => bump('pickup')); on('baitEaten', e => bump('bait eaten (' + e.kind + ')'));
on('bodyFound', () => bump('body found')); on('reinforce', () => bump('reinforcements')); on('drag', () => bump('body dragged')); on('checkpoint', () => bump('checkpoint'));
on('bossDefeated', e => L.boss.push(e.boss.D.name + ': "' + (B.Story.lines[e.boss.id + '_defeat'] || '') + '"'));
const V = B.Voice, bark0 = V.bark, say0 = V.say, play0 = B.Music.play;
V.bark = function (text, ...a) { if (L && text && L.heard.length < 40) L.heard.push(String(text)); return bark0.call(this, text, ...a); };
V.say = function (text, ...a) { if (L) bump('voice lines spoken'); return say0.call(this, text, ...a); };
B.Music.play = function (id, ...a) { if (L && id && !L.songs.includes(id)) L.songs.push(id); return play0.call(this, id, ...a); };
say('\n## The playthrough, on the shipped scripts');
B.Save.data = B.Save.fresh('sojiro'); B.Save.get().story = true;
for (const [id, mode, char] of [['training', 'story', 'sojiro'], ['m1', 'story', 'sojiro'], ['m2', 'story', 'sojiro'], ['m3', 'story', 'sojiro'], ['m1', 'missions', 'kaede'], ['delivery', 'trial', 'sojiro']]) {
  L = { c: {}, boss: [], heard: [], songs: [] };
  const R = ROUTES[id], tele = R.filter(b => b.at).length, inv = R.filter(b => b.fn && /invisible = true/.test(String(b.fn))).length;
  const M = runRoute(t, id, { mode, char }); game.advance(2.5); L.done = true;
  const best = (B.Save.get().best[id] || {})[char], m = B.get('mission', id);
  say(`\n### ${m.title} (${id}, ${char}, ${mode}): ${M.result === 'win' ? 'WON' : 'NOT WON (' + M.result + ')'} in ${M.t.toFixed(0)} s` + (best ? ` · score ${best.score} · rank ${best.rank}` : '') + ` · then: ${game.sceneName}`);
  say(`route: ${R.length} beats, ${tele} teleports, invisibility switched on in ${inv} beat(s), god mode on`);
  say('objectives: ' + M.objectives.map(o => o.id + (o.optional ? ' (optional)' : '') + ' ' + o.state).join(', '));
  say('the game reported: ' + Object.entries(L.c).map(([k, n]) => k + ' ×' + n).join(', '));
  if (L.boss.length) say('boss defeated: ' + L.boss.join(' · '));
  say('songs: ' + L.songs.join(', '));
  if (L.heard.length) say('heard in play: ' + [...new Set(L.heard)].slice(0, 6).map(s => '"' + s + '"').join(' · '));
  const gear = {}, add = k => { gear[k] = (gear[k] || 0) + 1; };
  for (const a of [M.hero, ...M.guards, ...(M.civs || []), ...(M.bosses || []), M.escort].filter(Boolean)) { const o = a.rig && a.rig.o; if (!o) continue;
    if (o.hat && o.hat.style) add(o.hat.style + (o.hat.style === 'kabuto' && o.hat.crest ? ' with crest' : '')); if (o.mask) add('mask ' + (o.mask.style || 'cloth')); if (o.weapon) add(o.weapon); if (o.offhand) add('offhand blade'); if (o.sashimono) add('sashimono banner'); }
  say('the cast wears and carries (the engine\'s Humanoid gear, patch 3): ' + Object.entries(gear).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ×' + n).join(', '));
  say(`the world: ${M.world.caps.length} kawara roof caps, ${M.world.halls.length} halls whose roofs fade when you enter`);
  const placed = {}; for (const p of M.world.props) if (OWN.includes(p.id)) placed[p.id] = (placed[p.id] || 0) + 1;
  say(`the game's own shapes placed: ${Object.keys(placed).length} kinds, ${Object.values(placed).reduce((a, b) => a + b, 0)} props`);
  L = null;
}
// the stealth model, measured: one of Rice and Ash's own guards, the hero in its light and in its shadow, running and creeping behind it, then an alarm
{ t.load('m1', { mode: 'story', character: 'sojiro' }); B.Cutscene.clear(); game.advance(.5);
  const M = B.M, h = M.hero, W = M.world;
  // the guard to measure: awake, and with the most light contrast in its view, and open ground behind it at its own level
  const spots = g => { const cf = Math.cos(g.facing), sf = Math.sin(g.facing), at = (d, lat) => ({ x: g.x + cf * d - sf * lat, y: g.y + sf * d + cf * lat, d });
    const flat = p => [0, 8, 16, 24].every(k => Math.abs(W.map.groundAt(p.x - sf * k, p.y + cf * k) - g.z) < 1) && Math.abs(W.map.groundAt(p.x, p.y) - g.z) < 1;
    const pick = (d0, d1, better) => { let best = null; for (let d = d0; d <= d1; d += 6) for (const lat of [-18, -9, 0, 9, 18]) { const p = at(d, lat); if (!flat(p)) continue; p.l = W.lightAt(p.x, p.y, g.z); if (!best || better(p.l, best.l)) best = p; } return best; };
    const lit = pick(50, 70, (a, b) => a > b), dark = pick(80, 120, (a, b) => a < b); let back = null; for (const lat of [0, -10, 10, -20, 20]) { const p = at(-30, lat); p.z = g.z; if (flat(p) && W.map.ray(g, p, { eye: 20, target: 4 }).clear) { back = p; break; } }
    return lit && dark && back ? { lit, dark, back, side: [-sf, cf], score: lit.l - dark.l } : null; };
  const cand = M.guards.filter(x => x.alive && !x.asleep && x.mind && (x.type === 'ashigaru' || x.type === 'samurai')).map(x => [x, spots(x)]).filter(c => c[1]).sort((a, b) => b[1].score - a[1].score);
  const [g, SP] = cand[0]; const { lit, dark } = SP;
  g.mode = 'stand'; const gx = g.x, gy = g.y, gf = g.facing;
  const trial = (p, crouch, secs, move) => { g.mind.reset(); g.target = null; Object.assign(g, { x: gx, y: gy, facing: gf }); g.home && (g.home.facing = gf);
    game.debug.teleport(p.x, p.y, W.map.groundAt(p.x, p.y), gf + Math.PI); h.crouch = crouch; let tA = null, exp = B.Perception.exposure(h, M), peak = 0;
    for (let k = 0; k < secs * 20; k++) { B.testIntent = move ? { move } : {}; game.advance(.05); B.testIntent = null; h.crouch = crouch; peak = Math.max(peak, g.mind.level); if (tA === null && g.mind.state === 'alert') tA = (k + 1) * .05; }
    return `exposure ${exp.toFixed(2)}, the guard's suspicion peaked at ${peak.toFixed(2)}, ${tA !== null ? 'alert after ' + tA.toFixed(2) + ' s' : 'never alerted in ' + secs + ' s'} (${g.mind.state})`; };
  say('\n## The stealth model, measured (Rice and Ash, guard "' + g.id + '", the shipped scripts)');
  say(`standing in its lantern light ${lit.d} px ahead (light ${lit.l.toFixed(2)}): ` + trial(lit, false, 3));
  say(`crouched in its shadow ${dark.d} px ahead (light ${dark.l.toFixed(2)}): ` + trial(dark, true, 5));
  const steps = []; const offN = B.on('noise', e => { if (e.kind === 'step') steps.push(Math.round(e.loud)); });
  say('creeping (crouched) 30 px behind it, on open ground at its level, out of its view: ' + trial(SP.back, true, 1, SP.side) + ' · its steps carry ' + ([...new Set(steps)].join('/') || 'no') + ' px');
  steps.length = 0; say('running the same way: ' + trial(SP.back, false, .7, SP.side) + ' · its steps carry ' + [...new Set(steps)].join('/') + ' px'); offN();
  L = { c: {}, boss: [], heard: [], songs: [] }; g.mind.reset(); const away = M.level.hero.at; game.debug.teleport((away[0] + .5) * 16, (away[1] + .5) * 16, W.map.groundAt((away[0] + .5) * 16, (away[1] + .5) * 16));
  const sam = M.guards.find(x => x.alive && x.type === 'samurai'); game.debug.alert(sam.id); game.advance(14);
  say(`an alerted samurai ("${sam.id}"), 14 s later: ` + Object.entries(L.c).map(([k, n]) => k + ' ×' + n).join(', ') + (L.heard.length ? ' · heard: ' + [...new Set(L.heard)].slice(0, 4).map(x => '"' + x + '"').join(' · ') : ''));
  L = null; }
// the story's own words
const S = B.Story, lines = id => (S.scenes[id] ? S.scenes[id].steps.filter(s => s[0] === 'say').map(s => s[1] + ': ' + s[2]) : []);
say('\n## The words (the tone, as written)');
say('Opening crawl: ' + S.crawl.slice(0, 5).map(s => '"' + s + '"').join(' / '));
say('Prologue: ' + lines('prologue').map(s => '"' + s + '"').join(' / '));
say('Briefing, Rice and Ash: ' + lines('briefing1').slice(0, 4).map(s => '"' + s + '"').join(' / '));
say('Kokaku, if the moon rises first: ' + lines('m3_fail').slice(0, 3).map(s => '"' + s + '"').join(' / '));
say('Guards: ' + Object.keys(S.barks).slice(0, 8).map(k => k + ' "' + S.barks[k][0] + '"').join(' · '));
// the inventory
say('\n## The inventory');
say('Characters: ' + Object.values(B.CHARS).map(c => c.name).join(', '));
say('Missions: ' + ['training', 'm1', 'm2', 'm3', 'delivery'].map(id => B.get('mission', id).title).join(', '));
say('Bosses: ' + ['ittetsu', 'gonroku', 'hotaru', 'kurogane'].map(id => { const D = B.get('boss', id); return D.name + ' (' + D.moves.length + ' moves' + (D.phases.length ? ', ' + (D.phases.length + 1) + ' phases' : '') + ')'; }).join(', '));
say('Tools: ' + B.TOOL_ORDER.map(k => B.get('tool', k).name).join(', '));
say('Enemies: ' + ['ashigaru', 'samurai', 'archer', 'ninja', 'hound', 'civ'].map(k => (B.get('enemy', k).name || k)).join(', '));
say(`Dev Mode: ${B.TUNE.length} live sliders on ${B.TUNE_PAGES.length} pages (` + B.TUNE_PAGES.join(', ') + '), plus Cheats, Mission, Teleport and Debug view pages');
say('Attract vignettes: ' + B.Attract.VIGNETTES.map(v => v.name || v.id || v.mission).join(', '));
say(`The game's own shapes: ${OWN.length} (` + OWN.join(', ') + ')');
// the art, drawn: each mission in Chromium, the hero taken through its zones, every r.shape call recorded
const require = createRequire(join(DEV, 'handoff', 'package.json')), { chromium } = require('playwright');
const br = await chromium.launch(); const drawn = new Set();
say('\n## The art, drawn (Chromium, the shipped file: the game\'s own shapes each mission draws as the hero goes through its zones)');
for (const id of ['training', 'm1', 'm2', 'm3']) {
  const pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
  await pg.goto(pathToFileURL(FILE).href + '#' + id); await pg.waitForTimeout(4000);
  const zones = await pg.evaluate(() => { const B = window.__BENTOU, g = window.My3D2dge.current, M = B.M, r = g.r, f = r.shape; B.Cutscene.clear(); M.cheats.invisible = true; M.cheats.god = true; window.__d = new Set(); r.shape = function (n, ...a) { window.__d.add(n); return f.call(this, n, ...a); };
    return M.world.zones.map(z => [(z.rect[0] + z.rect[2]) / 2, (z.rect[1] + z.rect[3]) / 2, z.name]); });
  for (const [x, y] of zones) { await pg.evaluate(([x, y]) => { const g = window.My3D2dge.current; g.debug.teleport(x * 16 + 8, y * 16 + 8, window.__BENTOU.M.world.map.groundAt(x * 16 + 8, y * 16 + 8)); }, [x, y]); await pg.waitForTimeout(350); }
  const got = await pg.evaluate(own => own.filter(n => window.__d.has(n)), OWN); got.forEach(n => drawn.add(n));
  say(`${id} (${zones.length} zones): ${got.length} kinds drawn: ${got.join(', ')}`);
  await pg.close();
}
await br.close();
say(`In all: ${drawn.size} of the game's ${OWN.length} own shapes drawn in the four missions` + (drawn.size < OWN.length ? '; not seen on these walks: ' + OWN.filter(n => !drawn.has(n)).join(', ') : ''));
writeFileSync(join(DEV, 'tests', 'EVIDENCE.md'), out.join('\n') + '\n');
