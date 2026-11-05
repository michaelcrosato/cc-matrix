import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const D = process.cwd();
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(D + '/' + f, 'utf8'), ctx, { filename: f });
const G = ctx.BRIG;
console.log('skills', G.all('skill').length, 'classes', G.all('class').length, 'monsters', G.all('monster').length, 'items', G.all('item').length, 'knights', G.all('knight').length, 'castles', G.all('castle').length, 'maps', G.all('map').length, 'roads', G.ROADS.length);
const kn = id => { const d = G.get('knight', id); const st = G.classStats(d.cls, d.level); return G.unitFromKnight({ id, cls: d.cls, level: d.level, stats: st, elem: d.elem, items: {}, ruler: d.ruler, realm: d.realm }); };
const mons = id => G.get('knight', id).troop.map(([sp, lv, f], i) => G.unitFromMonster({ uid: id + i, sp, form: f || 1, level: lv }));
const troop = id => ({ knight: kn(id), monsters: mons(id), formation: G.get('knight', id).form });
for (const map of ['river_ford', 'capital_citadel', 'forest_hold', 'lakeside']) for (const season of G.SEASONS) {
  const t0 = Date.now();
  const sim = G.BattleSim.create({ seed: 7, map, season, sides: [{ realm: 'solmark', role: 'att', troops: [troop('morgause'), troop('agravain'), troop('elidure')] }, { realm: 'hoarfast', role: 'def', troops: [troop('mordrain'), troop('ragnell'), troop('nimue')] }] });
  const ev = G.BattleAI.resolve(sim);
  const r = sim.result();
  console.log(map, season, 'winner', r.winner, r.reason, 'bell', r.bell, 'events', ev.length, 'ms', Date.now() - t0, 'caps', r.captures.length, 'illegal', ev.filter(e => e.e === 'illegal').map(e=>e.why).slice(0,3));
}
