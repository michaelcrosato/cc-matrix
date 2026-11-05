import vm from 'node:vm'; import { readFileSync, readdirSync } from 'node:fs';
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(readFileSync('my-3d2dge.js','utf8'), ctx);
const files = readdirSync('game/src').filter(f=>f.endsWith('.js')&&f<'30').sort();
const src = files.map(f=>readFileSync(`game/src/${f}`,'utf8')).join('\n');
vm.runInContext(`(() => {${src}
 game = new E.Game({ headless: true, view: 'threequarter', res: 'ps1', expand: true });
 globalThis.__t = { buildWorld, makeHero, makeBot, simStep, RUN, get W(){return W}, placeHeroes, PLAN, CLASSES, TUNE, DEV, OPT, game };
})()`, ctx);
const T = ctx.__t, E = ctx.My3D2dge;
const steps = +process.argv[2] || 0, secs = +process.argv[3] || 60;
for (const s of (steps? [steps]:[0,1,2,4,5,6,8,9,10])) {
  T.RUN.seed = 777; T.RUN.step = s;
  const W = T.buildWorld(s, { players: 4 });
  const hs = [0,1,2,3].map(i => { const h = T.makeHero(i, i, null); h.bot = T.makeBot(true); return h; });
  W.heroes = hs; T.placeHeroes(hs, W.starts);
  let err = null;
  try { for (let t=0;t<secs*120;t++){ T.simStep(1/120); if (W.descend) break; } } catch(e){ err = e; }
  console.log('step', s, W.meta.name, 'time', W.time.toFixed(1), 'descend', !!W.descend, 'mons', W.mons.length, 'gens alive', W.gens.filter(g=>!g.dead).length, 'hp', hs.map(h=>Math.round(h.hp)).join('/'), 'score', hs.map(h=>h.score).join('/'), err? '\nERR '+err.stack : '');
}
