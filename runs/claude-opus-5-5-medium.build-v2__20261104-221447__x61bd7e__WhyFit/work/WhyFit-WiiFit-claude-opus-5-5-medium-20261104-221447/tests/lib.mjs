// Loads engine, vendor and game files in a vm context, headless, drawing on a stand-in.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const bsrc = readFileSync(new URL('build.mjs', root), 'utf8');
const list = name => JSON.parse(bsrc.match(new RegExp('export const ' + name + ' = (\\[.*?\\]);'))[1].replace(/'/g, '"'));
const VENDOR = list('VENDOR'), GAME = list('GAME_FILES');
const cache = {}; const src = f => cache[f] || (cache[f] = new vm.Script(readFileSync(new URL(f, root), 'utf8'), { filename: f }));
export function load({ draw = false, hash = '', AIHub = null, about = {} } = {}) {
  const errs = [];
  const ctx = { console: { log() {}, info() {}, warn() {}, error: (...a) => errs.push(a.join(' ')) }, addEventListener() {}, location: { hash, search: '' }, Date, setTimeout, clearTimeout };
  ctx.window = ctx; if (AIHub) ctx.AIHub = AIHub; vm.createContext(ctx);
  VENDOR.forEach((f, i) => { src(f).runInContext(ctx); if (i === 0 && draw) vm.runInContext('{ const G0 = My3D2dge.Game; My3D2dge.Game = class extends G0 { constructor(o) { super(Object.assign({}, o, { draw: true })); } }; }', ctx); });
  ctx.G = { ABOUT: about };
  GAME.forEach(f => src('game/' + f).runInContext(ctx));
  const G = ctx.G, game = G.game; game.fadeTime = 0; return { ctx, G, game, E: ctx.My3D2dge, errs };
}
// play an activity with a bot (or passive) to its end, returns pct
export function playAct(env, id, tier, skill, seed = 1, data = {}) {
  const { G, game } = env; G.ensureMember(); G.noSave = true;
  const contestants = [{ name: 'T', local: true, bot: skill, input: skill ? null : game.input, color: '#fff' }];
  game.go('act_' + id, Object.assign({ mode: 'test', tier, seed, skipCard: true, contestants }, data), { fade: 0 }); game.advance(.02);
  const sc = game.scene; sc.phase = 'play'; sc.t = 0; if (G.acts[id].begin) G.acts[id].begin(sc.ctx);
  let guard = 0; while (sc.phase === 'play' && guard++ < 260) game.advance(.5);
  return { pct: sc.ctx.local.pct, ctx: sc.ctx, t: sc.ctx.t, scene: sc };
}
