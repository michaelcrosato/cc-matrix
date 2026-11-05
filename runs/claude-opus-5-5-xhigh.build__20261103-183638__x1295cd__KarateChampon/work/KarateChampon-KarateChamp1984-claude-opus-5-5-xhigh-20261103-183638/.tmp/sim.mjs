import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url), rd = f => readFileSync(new URL(f, root), 'utf8');
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(rd('engine/my-3d2dge.js'), ctx); vm.runInContext(rd('build/game.js'), ctx);
const { My3D2dge: E, KC } = ctx;
const game = new E.Game({ headless: true }); KC.game = game;
const ids = ['taro','kamaboko','negi','ebi','kikurage','ika','buta','asari','kyabetsu','mei'];
const tally = {}; let fulls = 0, hits = 0, rounds = 0, roundT = 0, matches = 0, wins = [0,0], aiuchi = 0, blocks = 0, hantei = 0;
for (let m = 0; m < 40; m++) {
  const a = new KC.Karateka({ fid: ids[m % 10], side: 0 }), b = new KC.Karateka({ fid: ids[(m * 3 + 1) % 10], side: 1 });
  const bout = new KC.Bout({ fighters: [a, b], seed: m + 1, rules: {} });
  const ai = [new KC.KarateAI({ fid: a.fid, seed: m * 2 + 1, level: 5 }), new KC.KarateAI({ fid: b.fid, seed: m * 2 + 2, level: 5 })];
  let rt = 0;
  bout.bus.on('point', d => { tally[d.tech] = (tally[d.tech] || 0) + 1; hits++; if (d.full) fulls++; if (d.counter) ctx.__c = (ctx.__c||0)+1; ctx.__q = (ctx.__q||0) + d.q; });
  bout.bus.on('aiuchi', () => aiuchi++); bout.bus.on('block', () => blocks++); bout.bus.on('whistle', () => hantei++);
  bout.bus.on('roundEnd', () => { rounds++; });
  let steps = 0;
  while (bout.phase !== 'over' && steps < 120 * 600) {
    a.control(ai[0].intent(a, b, 1/120)); b.control(ai[1].intent(b, a, 1/120));
    bout.update(1/120); steps++; if (bout.phase === 'fight') roundT += 1/120;
  }
  if (bout.phase === 'over') { matches++; wins[bout.winner]++; } else console.log('STUCK', m, bout.phase, a.st, b.st);
}
console.log({ matches, wins, rounds, meanRound: (roundT / rounds).toFixed(1), hits, fullPct: (fulls / hits * 100).toFixed(0), aiuchi, blocks, hantei });
console.log(Object.entries(tally).sort((x,y)=>y[1]-x[1]).map(([k,v])=>k+':'+v).join(' '));
console.log('never:', KC.SCORING.filter(id => !tally[id]).join(' '));
console.log('counters', ctx.__c, 'meanQ', (ctx.__q/hits).toFixed(2));
