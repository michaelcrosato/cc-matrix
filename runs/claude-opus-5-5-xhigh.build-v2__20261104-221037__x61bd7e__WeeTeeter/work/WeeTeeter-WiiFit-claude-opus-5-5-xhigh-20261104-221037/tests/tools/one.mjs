import { load } from '../lib.mjs';
const { G, E, game } = load({ draw: false });
const [id, tier, skill] = [process.argv[2], +process.argv[3] || 0, process.argv[4] || 'average'];
game.fadeTime = 0; game.advance(.1); G.devMember(5); G.S.freePlay = true;
G.scenes.__idle = { update() {}, draw() {} }; game.scenes.__idle = G.scenes.__idle; game.go('__idle', null, { fade: 0 }); game.advance(.1);
const ctx = G.makeRun(id, { tier, seed: +process.argv[6] || 31, contestants: [{ name: 'Bot', skill, local: true, look: G.S.look }], quiet: true });
if (ctx.def.begin) ctx.def.begin(ctx);
let n = 0; const every = +process.argv[5] || 10;
while (!ctx.done && n < 200 * 120) { game.advance(1 / 120); G.stepRun(ctx, 1 / 120); n++; if (n % (every * 120) === 0) { const c = ctx.contestants[0]; console.log(ctx.time.toFixed(0), JSON.stringify({ wx: c.wx && +c.wx.toFixed(0), falls: c.falls, pen: c.pen, lastPost: c.lastPost, sy: c.sy && +c.sy.toFixed(0), sx: c.sx && +c.sx.toFixed(0), miss: c.miss, gate: c.nextGate, hits: c.hits, cups: c.cups, tot: ctx.cupsTotal, zone: c.zone && +c.zone.toFixed(0), cad: c.cad && +c.cad.toFixed(2), z: c.z && +c.z.toFixed(0), inGlass: c.inGlass, tray: c.trayI, ol: c.olives && c.olives.length })); } }
const c = ctx.contestants[0]; console.log('end', ctx.time.toFixed(1), c.pct.toFixed(3), c.stars, c.detail);
