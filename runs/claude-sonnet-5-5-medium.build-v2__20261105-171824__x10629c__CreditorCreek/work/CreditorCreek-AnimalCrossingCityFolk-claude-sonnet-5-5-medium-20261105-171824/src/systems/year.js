// The year: four festivals, three contests, Vesper, cheese, Rocco's story, Inspector Pimm, the ending.
import { THREE, PALETTE } from '../engine.js';
import { item, ITEMS } from '../data/items.js';
import { FISH, BUGS } from '../data/collect.js';
import { NEIGHBOURS, HOSTS } from '../data/neighbours.js';
import { ListScreen, PocketsScreen, TextEntry, confirmBox } from '../ui/screens.js';
import { PatternStudio, PALETTE_NAMES } from '../ui/pattern.js';
import { W, H } from '../ui/controls.js';
import { seeded } from '../core/rng.js';
import { buildLantern, buildSnowman, part } from '../world/scenery.js';
import { HOST_LINES } from '../data/dialogue.js';
import { seasonOf, dayTypeOf, SEASONS, realClockInfo } from '../core/calendar.js';
import { chimeSong } from '../audio/composer.js';
import { Actor } from '../actors/actor.js';
const host = (g, id) => g.sys.venues.host(id);
/** The whole village takes part: every awake neighbour holds its spot and acts out the festival until `end` is called. */
const CROWD = { seed: ['Wave', 'Dance', 'Hum', 'Cast'], lantern: ['Sway', 'Hum', 'Wave'], soup: ['Eat', 'Hum', 'Sway', 'Wave'], long: ['Sway', 'Hum', 'Wave', 'Dance'] };
export function festivalCrowd(g, kind) {
  const list = g.npcs.list.filter(n => !n.sleeping); list.forEach((n, i) => { n.busy = false; n.state = 'idle'; n.timer = 9999; n.doing = n.festival = CROWD[kind][i % CROWD[kind].length]; });
  const fx = { seed: ['sparkle', 'lime'], lantern: ['sparkle', 'sand'], soup: ['splash', 'white'], long: ['sparkle', 'white'] }[kind]; let alive = true;
  const tick = () => { if (!alive) return; const n = list[Math.floor(g.cosmetic() * list.length)]; if (n) { g.ctx.particles.burst('sparkle', new THREE.Vector3(n.pos.x, 1.6, n.pos.z), { count: 5, colors: [fx[1], 'white'] }); if (kind === 'seed') g.sfx('whoosh', { volume: 0.4 }); } g.after(0.9, tick); }; g.after(0.5, tick);
  return () => { alive = false; for (const n of list) { n.timer = 1; n.doing = null; n.festival = null; } };
}
const gather = (g, spots) => { g.npcs.list.forEach((n, i) => { if (n.sleeping) return; const s = spots[i % spots.length]; g.npcs.goto(n, s[0], s[1]); }); };
export const festivals = {
  crowdOn: true,
  list: [{ id: 'seed', name: 'Seed Toss' }, { id: 'lantern', name: 'Lantern Float' }, { id: 'soup', name: 'Great Soup' }, { id: 'long', name: 'Long Night' }],
  hourly(g, h) { const w = g.world; if (dayTypeOf(w.day) !== 3 || g.place === 'round') return; const s = seasonOf(w.day); const at = [10, 19, 12, 16][s]; if (h === at && !w.festivals[w.year + ':' + s]) { g.ui.toast(`${this.list[s].name} is starting at the plaza!`); w.flags.festivalDue = s; } },
  target(g) { const w = g.world; if (w.flags.festivalDue == null || g.place !== 'town') return null; const p = g.player.pos; if (Math.hypot(p.x - 21, p.z - 22) > 6) return null; const s = w.flags.festivalDue; if (w.festivals[w.year + ':' + s]) return null; return { kind: 'custom', label: 'Join the ' + this.list[s].name, run: (gg) => this.start(gg, this.list[s].id) }; },
  daily(g) { const w = g.world; w.flags.festivalDue = null; if (w.flags.seedBloom) { for (const [x, z] of w.flags.seedBloom) if (!w.town.flowers.find(f => f.x === x && f.z === z)) w.town.flowers.push({ x, z, sp: 0, col: (x + z) % 4, wet: 0, age: 1 }); w.flags.seedBloom = null; } },
  async start(g, id) {
    const w = g.world; const s = this.list.findIndex(f => f.id === id); w.festivals[w.year + ':' + s] = true; w.flags.festivalDue = null; g.cutsceneStart(); g.setMusic({ seed: 'seed', lantern: 'lantern', soup: 'soup', long: 'longnight' }[id]);
    const endCrowd = this.crowdOn ? festivalCrowd(g, id) : null; try { await this[id](g); } finally { endCrowd?.(); g.cutsceneEnd(); g.updateMusic(true); }
  },
  async seed(g) {
    const w = g.world; const trundle = host(g, 'trundle'); gather(g, [[19, 21], [23, 21], [21, 25], [18, 24], [24, 24]]); { const mn = g.npcs.byId.trundle; if (mn) { mn.sleeping = false; mn.actor.show(true); mn.busy = true; mn.walkAnim = true; for (let i = 0; i < 40; i++) { const dx = 21.5 - mn.pos.x, dz = 20.5 - mn.pos.z; const dd = Math.hypot(dx, dz); if (dd < 0.2) break; mn.pos.x += dx / dd * 0.25; mn.pos.z += dz / dd * 0.25; mn.yaw = Math.atan2(dx, dz); mn.state = 'walk'; mn.speed = 0.5; await new Promise(r => g.after(0.08, r)); } mn.state = 'idle'; mn.busy = false; mn.walkAnim = false; } } await g.say(trundle, 'Welcome... to the Seed Toss. We fling seeds... at chalk rings... for ninety... seconds. Then I... cut a ribbon.');
    const rings = [[19, 20], [23, 20], [21, 24], [17, 23], [25, 24]]; const hits = []; let score = 0; g.player.pos.x = 21; g.player.pos.z = 22; const marks = rings.map(([x, z]) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 6, 16), new THREE.MeshBasicNodeMaterial({ color: PALETTE.white })); m.rotation.x = Math.PI / 2; m.position.set(x + 0.5, 0.08, z + 0.5); g.town.group.add(m); return m; });
    let t = 90; let thrown = 0; await new Promise(res => { const sc = { id: 'seedtoss', freeze: false, tick(ui, dt, active) { const d = ui.d; g.frozen = false; t -= dt; d.rect(160, 40, 160, 28, 'night'); d.text(240, 46, `Seed Toss ${Math.ceil(t)}s   Hits ${score}`, 'sand', { align: 'center' }); d.text(240, 58, 'Face a ring and press Tool', 'white', { align: 'center' }); if (active && ui.c.input.wasPressed('Space', 'PadSquare', 'KeyF')) { const f = g.player.facing ?? { x: 0, z: 1 }; const tx = g.player.pos.x + f.x * 3, tz = g.player.pos.z + f.z * 3; g.sfx('whoosh'); let hit = null; rings.forEach(([x, z], i) => { if (Math.hypot(x + 0.5 - tx, z + 0.5 - tz) < 2.2) hit = rings[i]; }); thrown++; if (hit) { score++; hits.push(hit); g.sfx('sparkle'); g.sparkle(hit[0] + 0.5, hit[1] + 0.5, 0.6, 'lime'); g.sparkle(hit[0] + 0.5, hit[1] + 0.5, 1.2, 'red'); } } if (t <= 0) { ui.pop(this); res(); } ui.prompt('tool', 'Toss'); } }; g.ui.push(sc); });
    marks.forEach(m => g.town.group.remove(m)); w.flags.seedBloom = []; for (let i = 0; i < Math.min(12, score * 2 + 2); i++) { const h = rings[i % 5]; w.flags.seedBloom.push([h[0] + (i % 3) - 1, h[1] + Math.floor(i / 3) % 3 - 1]); }
    await g.say(trundle, `${score} hits. The town will bloom tomorrow... in the pattern you sowed. Now... the ribbon.`); await g.say(trundle, 'I declare this... ribbon... cut. Has anyone... seen... the ribbon? It was here... in March.'); g.sfx('fanfare'); g.give('trophy_derby') && 0; w.flags.seedScore = score;
  },
  async lantern(g) {
    const w = g.world; const clem = host(g, 'clementine'); await g.say(clem, 'The Lantern Float. A lantern, a wish, a river. The bee will not be supervising.');
    const colors = ['red', 'orange', 'sand', 'lime', 'sky', 'plum']; const pick = await new Promise(res => { const sc = new ListScreen({ title: 'Pick a lantern colour', items: colors.map(c => ({ label: c[0].toUpperCase() + c.slice(1), sub: 'It will drift. It will glow. It will not come back.', c })), onPick: () => 'close', pickLabel: 'Choose' }); g.ui.push(sc); sc.promise.then(res); }); const col = pick?.c ?? 'orange';
    const wish = await new Promise(res => { const te = new TextEntry({ title: 'A one-line wish', max: 40, suggest: () => ['Less debt, more soup.', 'A kind goose.', 'Fish with manners.'][Math.floor(g.rng() * 3)] }); g.ui.push(te); te.promise.then(res); });
    g.player.pos.x = 28; g.player.pos.z = 21.5; g.setMusic('lantern'); const lanterns = []; for (let i = 0; i < 160; i++) { const l = buildLantern(colors[i % 6]); l.position.set(29.4 + (i % 3) * 0.7, 0, 2 + (i * 5.3) % 6); g.town.group.add(l); lanterns.push({ l, v: 1.4 + (i % 5) * 0.2, x0: 29.3 + (i % 3) * 0.8 }); } const mine = buildLantern(col); mine.position.set(30, 0, 21); g.town.group.add(mine); lanterns.push({ l: mine, v: 1.6, x0: 30 });
    g.sfx('wish'); g.zoomOverride = 1.3; const end = g.t + 9; await g.say(null, 'You set your lantern on the river. Hundreds of lights drift to the sea.'); const t0 = g.t; await new Promise(res => { const sc = { id: 'lanternfly', freeze: false, tick(ui, dt) { for (const L of lanterns) { L.l.position.z += L.v * dt; L.l.position.y = -0.2 + Math.sin(g.t * 2 + L.x0) * 0.05; } if (g.t - t0 > 7) { ui.pop(this); res(); } } }; g.ui.push(sc); });
    // fireworks at 21:00 over the beach, including one in your pattern
    g.player.pos.x = 34; g.player.pos.z = 37; g.target.set(34, 0.8, 37); await g.say(null, 'Night. The sky is clear. The fireworks begin over the beach.'); const pat = w.patterns.find(Boolean);
    for (let i = 0; i < 6; i++) { g.sfx('firework'); g.ctx.particles.burst('sparkle', new THREE.Vector3(30 + i * 3, 9 + (i % 2) * 2, 44), { count: 28, colors: [['red', 'sand'], ['sky', 'white'], ['lime', 'sand']][i % 3] }); g.engine.screen.flash('white', { duration: 0.06 }); await new Promise(r => g.after(0.9, r)); }
    if (!pat) await g.say(clem, 'Oh. A plain burst. If you drew a pattern at Mothwick\'s, the sky would carry it. Next year, dear.');
    else { g.sfx('firework'); g.fireworkPattern = { pat, t: 4 }; await new Promise(r => g.after(4.2, r)); g.fireworkPattern = null; await g.say(clem, 'That one! In your own pattern! The bee wept. The bee weeps at a lot.'); }
    for (const L of lanterns) g.town.group.remove(L.l); g.zoomOverride = null; g.sys.mail.queue(g, { from: 'The River', subject: 'In reply to your wish', body: `We heard: "${wish ?? ''}". The river keeps no promises, only lanterns. Enclosed: a small something.`, gift: 'beanbag', arriveDay: w.day + 1 });
  },
  async soup(g) {
    const w = g.world; const dorrit = g.npcs.byId.dorrit; const dn = dorrit ? dorrit.def : { name: 'Dorrit', type: 'hearth', pitch: 0.8 }; dn.actor = dorrit?.actor; gather(g, [[19, 21], [23, 21], [21, 25], [18, 24], [24, 24]]); g.player.pos.x = 21; g.player.pos.z = 24; g.cutsceneStart; await g.say(dorrit ?? dn, "Giant pot, giant soup, giant opinions, mmhm. You get three ingredients. Fish, fruit, mushroom, boot. I'll taste it. Everyone will. Mmhm.");
    const added = []; for (let i = 0; i < 3; i++) { const s = await new Promise(res => g.ui.push(new PocketsScreen({ title: `Ingredient ${i + 1} of 3`, pick: res }))); if (!s) break; const it = item(s.id); if (!['fish', 'fruit', 'mushroom', 'bug', 'weed'].includes(it.kind) && it.id !== 'boot') { g.ui.toast("The pot refuses it. Politely. Violently."); i--; continue; } g.take(it.id); added.push(it); g.sfx('splash'); }
    let score = 0; const kinds = new Set(added.map(a => a.kind)); for (const a of added) { score += a.kind === 'fish' ? 3 : a.kind === 'fruit' ? 3 : a.kind === 'mushroom' ? 4 : a.kind === 'weed' ? -2 : a.junk ? -5 : 1; } score += kinds.size * 2; const good = score >= 8;
    for (const n of g.npcs.list.slice(0, 3)) { if (!n.sleeping) await g.say(n, good ? ['Ohhh. Oh, that is good. ' + n.def.tic, 'I would marry this soup. ' + n.def.tic][Math.floor(g.rng() * 2)] : ['...Interesting. Texture. Lots of texture. ' + n.def.tic, 'I am being brave. ' + n.def.tic][Math.floor(g.rng() * 2)]); }
    if (good) { g.sfx('fanfare'); await g.say(dorrit ?? dn, 'A feast, mmhm! Everyone eats! Take a pot for yourself.'); g.addBeans(1500); g.give('pear'); g.ui.toast('Reward: 1,500 beans'); w.stats.soup++; } else { await g.say(dorrit ?? dn, 'The village is queasy, mmhm. It was brave of you. Tomorrow: a gag-gift.'); g.sys.mail.queue(g, { from: 'Dorrit', subject: 'Tummy', body: 'I send you a cooking pot. It is a gag-gift. Mmhm. It is also a good pot.', gift: 'hat_pot', arriveDay: w.day + 1 }); }
  },
  async long(g) {
    const w = g.world; const clem = host(g, 'clementine'); g.zoomOverride = 1.5; await g.say(clem, 'The Long Night. The sun sets at four. We carry lights to the doors, exchange a gift, then gather at the Old Pear at midnight.');
    for (const id of ['dorrit', 'tavi', 'bartleby']) { const n = g.npcs.byId[id]; if (!n) continue; g.sfx('pickup'); w.friend[id] = Math.min(100, (w.friend[id] ?? 0) + 6); await g.say(n, ['A gift! Mmhm. Warm bowl of something.', "A light at my door! It's like I'm important, isn't it?!", "I'd prefer not... but I'll take it. And the light."][['dorrit', 'tavi', 'bartleby'].indexOf(id)]); }
    gather(g, [[20, 21], [22, 21], [21, 24], [19, 23], [23, 23], [18, 22], [24, 22], [21, 20]]); g.player.pos.x = 21; g.player.pos.z = 23; g.target.set(21, 0.8, 22); w.min = 1140 + 0; g.sys.time.visual(g, 0, true); await g.say(clem, 'Midnight. The Old Pear is lighting. The Bell plays your Chime, harmonised.'); g.sfx('bell'); g.town.bellSwing = 0.8; g.ctx.audio.playMusic(chimeSong(w.chime, 80), 'chime'); await new Promise(r => g.after(4, r));
    const r = g.sys.rating.townScore(g); await g.say(clem, `Your town rates ${r.grade}, ${r.score} points. ${r.score >= 65 ? 'The Old Bell turns gold. It has never done that. It will not do it again for a while.' : 'The Bell stays bronze. The bee is not mad. The bee is disappointed.'}`); if (r.score >= 65) { w.flags.goldBell = true; g.sfx('fanfare'); }
    const ra = new Actor({ species: 'armadillo', c: 'mist', a: 'red', name: 'Rocco' }); ra.setPos(14, 23); ra.yaw = Math.PI / 2; ra.play('Roll'); g.ctx.scene.add(ra.root); for (let i = 0; i < 40; i++) { ra.x += 0.17; ra.update(0.05, i); await new Promise(r => g.after(0.05, r)); } ra.play('Idle'); ra.yaw = 0; await g.say({ name: 'Rocco', type: 'gogetter', pitch: 1, actor: ra }, "I ROLLED here! From over there! It's the last night, let's roll!"); g.ctx.scene.remove(ra.root); await this.ending(g);
  },
  async ending(g) {
    const w = g.world; const stats = [`Biggest catch: ${Object.keys(w.coll.fish).map(id => item(id)).sort((a, b) => b.price - a.price)[0]?.name ?? 'nothing yet'}`, `Debt: ${w.debt > 0 ? w.debt + ' beans, still lovingly noted' : 'paid in full (eerie)'}`, `Donated to the museum: ${Object.keys(w.donated).length}`, `Most talked to: ${Object.entries(w.friend).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'nobody (yet)'}`];
    g.zoomOverride = null; await new Promise(res => { const sc = { id: 'credits', freeze: true, t: 0, tick(ui, dt, active) { const d = ui.d; this.t += dt; d.rect(0, 0, W, H, 'night'); const lines = ['Creditor Creek', '', 'A year in the village', '', ...stats, '', 'Written and built by Claude Sonnet 5.5', 'Engine: Riftlight Pixel Engine 0.46.0', 'Furniture: Kenney (CC0)', '', 'Year Two begins in the morning.', 'There is a letter.']; lines.forEach((l, i) => { const y = H - this.t * 18 + i * 14; if (y > 0 && y < H) d.text(240, y, l, i === 0 ? 'sand' : 'white', { align: 'center' }); }); if (this.t > 22 || (active && this.t > 1 && ui.c.pressed('confirm'))) { ui.pop(this); res(); } ui.prompt('confirm', 'Skip'); } }; g.setMusic('credits'); g.ui.push(sc); });
    w.day = 16; w.min = 1300; w.flags.yearOneDone = true; g.sys.mail.queue(g, { from: 'Mrs. Gander', subject: 'Year Two', body: `Dear ${w.name}, the interest has been compounding in your absence. And in your presence. A new year begins. HONK. Pardon me.`, arriveDay: 1 }); g.sys.time.newDay(g, 'bed');
  },
};
export const contests = {
  defs: { derby: { name: 'Fishing Derby', day: 6, start: 10, kind: 'fish' }, bugoff: { name: 'Bug-Off', day: 10, start: 10, kind: 'bug' }, snow: { name: 'Snowman Contest', day: 14, start: 10, kind: 'snow' } },
  daily(g) { },
  start(g, id) { const w = g.world; const c = this.defs[id]; w.contest = { id, kind: c.kind, endMin: w.min + 180, best: 0, total: 0, snow: [] }; g.ui.toast(`${c.name} begins! Three hours.`); g.sfx('fanfare'); g.setMusic('contest'); g.after(1, () => { }); },
  onCatch(g, def) { const c = g.world.contest; if (!c) return; if (c.kind === 'fish' && def.kind === 'fish' && !def.junk) { c.best = Math.max(c.best, def.price); c.total += def.price; } if (c.kind === 'bug' && def.kind === 'bug') c.total += def.price; },
  hourly(g, h) { const w = g.world; if (!w.contest && g.mode === 'play' && w.clockMode === 'real' && h === 10) { const info = realClockInfo(new Date()); if (info.contest) this.start(g, ['derby', 'derby', 'bugoff', 'snow'][g.season === 1 ? 0 : g.season === 2 ? 2 : g.season === 3 ? 3 : 1]); } if (!w.contest && g.mode === 'play' && w.clockMode !== 'real') { for (const [id, c] of Object.entries(this.defs)) if (w.day === c.day && h === c.start) this.start(g, id); } const c = w.contest; if (c && w.min >= c.endMin) this.finish(g); },
  async finish(g) {
    const w = g.world, c = w.contest; w.contest = null; const r = seeded('contest', w.seed, w.day); const bart = g.npcs.byId.bartleby; const scores = NEIGHBOURS.slice(0, 5).map(n => ({ name: n.name, s: Math.round((c.kind === 'fish' ? 400 + r() * 3000 : 300 + r() * 2200)) }));
    const mine = c.kind === 'fish' ? c.best : c.total; scores.push({ name: w.name, s: mine, me: true }); scores.sort((a, b) => b.s - a.s); const place = scores.findIndex(x => x.me) + 1; g.updateMusic(true);
    await g.say(null, `${this.defs[c.id ?? 'derby']?.name ?? 'Contest'} results: ${scores.slice(0, 3).map((x, i) => `${i + 1}. ${x.name} ${x.s}`).join('  ')}.  You: ${place}${['st', 'nd', 'rd'][place - 1] ?? 'th'} with ${mine}.`);
    if (place <= 3) { const id = { fish: 'trophy_derby', bug: 'trophy_bug', snow: 'trophy_snow' }[c.kind]; g.give(id); g.sfx('fanfare'); await g.say(null, `A trophy! (${item(id).name}.) It goes on a shelf, where trophies go to be admired from a distance.`); } else await g.say(null, 'No trophy. The neighbours were suspiciously good. Practice. Or bribery.');
    w.contests[c.id ?? 'x'] = place;
  },
};
export const cheese = {
  price(g) { const w = g.world; const p = this.pattern(g); const d = w.day, off = (d - 1) % 4; const slot = off * 2 + (g.hour >= 14 ? 1 : 0) + (g.hour >= 8 && g.hour < 14 ? 0 : 0); const r = seeded('cheese', w.seed, w.year, Math.floor((d - 1) / 4)); const vol = g.world.cheeseVol ?? 1; const base = 100; const t = [0, 1, 2, 3, 4, 5, 6, 7][slot] ?? 0; let m = 1; if (p === 'rising') m = 0.9 + t * 0.18; else if (p === 'falling') m = 1.1 - t * 0.12; else if (p === 'wobble') m = 1 + Math.sin(t * 1.4) * 0.35; else m = t === 4 || t === 5 ? 2 + r() * 3 : 0.8; const mult = 1 + (m - 1) * (g.tuning?.cheeseVol ?? 1); return Math.max(10, Math.round(base * mult)); },
  pattern(g) { const w = g.world; return ['rising', 'falling', 'wobble', 'spike'][Math.floor(seeded('cheesepat', w.seed, w.year, Math.floor((w.day - 1) / 4))() * 4)]; },
  priceText(g) { return `${this.price(g)} beans a wheel (${this.pattern(g)})`; },
  async talk(g) {
    const w = g.world, r = host(g, 'rind'); const buyP = g.dayType === 0 ? 90 + ((w.day * 7) % 21) : 0; const c = await g.ask(r, HOST_LINES.rind[0].text, [`Buy a wheel (${buyP})`, 'Notice-board prices', 'Bye']);
    if (c === 1) { await g.say(r, `Today's wheel price elsewhere: ${this.priceText(g)}. Wheels go bad at the next Market Day. A smell, a visible one.`); return; } if (c !== 0) return; if (w.beans < buyP) { await g.say(r, 'No beans, no wheel.'); return; } if (!g.give('cheese')) { await g.say(r, 'Pockets full. Cheese needs room to be nervous.'); return; } g.addBeans(-buyP); const slot = w.pockets.slice().reverse().find(s => s.id === 'cheese'); if (slot) slot.bought = w.day; g.sfx('cash'); w.flags.boughtCheese = true; await g.say(r, 'A wheel! Hold it up to the light. It only goes up. Mostly.');
  },
  daily(g) { const w = g.world; for (const s of w.pockets) if (s.id === 'cheese' && s.bought != null && g.dayType === 0) { s.id = 'rotcheese'; s.n = 1; g.sfx('smell'); } },
  hourly() { },
};
export const vesper = {
  async show(g) { const w = g.world, v = host(g, 'vesper'); const c = await g.ask(v, HOST_LINES.vesper[0].text, ['Something wistful', 'Something bouncy', 'Something sleepy', 'Something rainy', 'Something odd', 'Surprise me']); const i = c === 5 ? Math.floor(g.rng() * 6) : c; g.setMusic('vesper' + i); gather(g, [[19, 23], [23, 23], [21, 25], [18, 24], [24, 24]]); for (const n of g.npcs.list) if (!n.sleeping) n.doing = 'Sway'; await g.say(v, `This one's called "${['Slow Hours', 'Pear Season', 'Moth Hymn', 'Puddle Waltz', 'The Spoon Variations', 'Ceiling Blues'][i]}". That's how the notes fall out.`); { const { singNote } = await import('../audio/voice.js'); for (let k = 0; k < 10; k++) { singNote(g.ctx.audio, g.settings, { voice: 'flute', pitch: 1.2 }, [0, 2, 4, 5, 7, 5, 4, 2, 0, -3][k], 'aeiou'[k % 5]); await new Promise(r => g.after(0.55, r)); } } if (!(w.vesper.songs ?? []).includes(i)) { w.vesper.songs.push(i); g.give('record'); g.sfx('reveal'); await g.say(v, 'Take the record. It plays on a stereo. It will smell faintly of accordion.'); } },
  target(g) { const w = g.world; if (g.dayType !== 2 || g.hour < 20 || g.hour >= 23 || g.place !== 'town') return null; const p = g.player.pos; if (Math.hypot(p.x - 25.5, p.z - 22.5) > 3) return null; return { kind: 'custom', label: 'Talk to Vesper', run: (gg) => this.show(gg) }; },
};
export const pimm = {
  maybeVisit(g, fresh) { const w = g.world; if (fresh) { w.cleanExit = false; return; } const dirty = !w.cleanExit; w.cleanExit = false; if (dirty && w.daysPlayed > 0 && g.mode === 'play') g.after(1.5, () => this.visit(g)); },
  async visit(g) {
    const w = g.world; const p = host(g, 'pimm'); const n = w.pimm ?? 0; const L = HOST_LINES.pimm; const line = n >= 3 ? L[3].text : L[Math.min(n, 2)].text; g.cutsceneStart(); const a = new Actor({ species: 'hermit', c: 'orange', a: 'slate', name: 'Pimm' }); a.setPos(g.player.pos.x + 1.4, g.player.pos.z); a.yaw = -Math.PI / 2; a.play('Scuttle'); g.ctx.scene.add(a.root); await g.say({ ...p, actor: a }, line); await g.say({ ...p, actor: a }, 'No bed. No goodbye. I have a filing cabinet to attend to. It is a home. It is lonely.'); g.ctx.scene.remove(a.root); w.pimm = n + 1; g.cutsceneEnd(); g.sfx('door');
  },
};
export const story2 = {
  daily(g) {
    const w = g.world; const d = w.day + (w.year - 1) * 16; if (dayTypeOf(w.day) === 2 && w.home.furn.length > 2) { const r = g.sys.venues2.homeScore(g); g.sys.mail.queue(g, { from: 'Better Burrows Bureau', subject: `Home rating: ${r.grade}`, body: `Agent Brisket here. Show Day inspection, in your absence. Grade ${r.grade}, ${r.score} points. ${r.critique}`, arriveDay: w.day + 1 }); } if (w.day === 9 && !w.movedOut.rocco) { w.movedOut.rocco = true; const best = (w.friend.rocco ?? 0) >= 80; g.sys.mail.queue(g, { from: 'Rocco', subject: 'I rolled away', body: `${w.name}, I rolled out this morning.${w.flags.roccoArgued ? ' You argued with me. I lost. I left anyway. It is a very close loss.' : ''} It is thirty metres to the bus and a lot further to anywhere. Thank you for the fish. Let's roll! ${best ? 'I enclose my favourite trophy.' : ''}`, gift: best ? 'trophy_derby' : null, arriveDay: 9 }); }
    if (w.day === 15 && w.movedOut.rocco) g.sys.mail.queue(g, { from: 'Rocco', subject: 'From the road', body: "I'm halfway somewhere. It's very flat. I'll roll back for the last night, let's roll!", arriveDay: 15 });
  },
  moveRocco(g) { g.world.movedOut.rocco = true; g.npcs.reset(); g.ui.toast('Rocco moves out. Fitch moves in.'); },
  async roccoTalk(g, n) { },
};

/** Hosts who stand in the village at certain times: Old Rind at his stall on Market mornings, Vesper hanging from the plaza lamp on Show nights. */
export const cameos = {
  update(g, dt) {
    if (g.mode === 'title' || g.mode === 'round' || !g.world) return; this.a ??= {}; const town = g.place === 'town';
    const want = { rind: town && g.dayType === 0 && g.hour >= 6 && g.hour < 12, vesper: town && g.dayType === 2 && g.hour >= 20 && g.hour < 23 };
    const spec = { rind: ['stoat', 'sand', 'ink', 22.5, 24.2, 'Idle', 0], vesper: ['bat', 'plum', 'sand', 25.5, 22.5, 'Hang', 1.55] };
    for (const k of ['rind', 'vesper']) { let a = this.a[k]; if (!a && want[k]) { const [sp, c, ac, x, z, clip, y] = spec[k]; a = this.a[k] = new Actor({ species: sp, c, a: ac, name: k }); a.setPos(x, z, y); a.yaw = 0; a.play(clip); g.ctx.scene.add(a.root); } if (a) { a.root.visible = !!want[k]; if (want[k]) a.update(dt, g.t); } }
  },
};
