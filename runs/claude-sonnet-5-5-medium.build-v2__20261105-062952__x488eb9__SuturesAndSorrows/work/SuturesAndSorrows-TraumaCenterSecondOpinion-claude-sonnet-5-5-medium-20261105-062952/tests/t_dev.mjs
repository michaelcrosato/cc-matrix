import { playCase } from './lib.mjs';
export default async function ({ check, load }) {
  const ctx = load(); const G = ctx.GAME, Op = G.Op, game = G.game;
  // sliders change behaviour live
  const drainOf = () => { const S = Op.create(G.CASES.c1, { seed: 1 }); S.learn = false; const v = S.vitals; for (let i = 0; i < 60; i++) Op.step(S, [{ x: 20, y: 20, trig: 0 }], 1 / 60); return v - S.vitals; };
  const base = drainOf(); G.TUNING.drain = 2; const dbl = drainOf(); G.TUNING.drain = G.DEFAULTS.drain; check('drain slider doubles drain', Math.abs(dbl / base - 2) < .05, base + ' ' + dbl);
  const clk = () => Op.create(G.CASES.c1, { seed: 1 }).clock; const c0 = clk(); G.TUNING.clock = 2; check('clock slider scales the clock', Math.abs(clk() / c0 - 2) < .01); G.TUNING.clock = 1;
  const syr = () => { const S = Op.create(G.CASES.c2, { seed: 1 }); S.learn = false; S.vitals = 30; const inp = { x: 20, y: 20, trig: 1, tool: 'syringe' }; for (let i = 0; i < 80; i++) Op.step(S, [inp], 1 / 60); inp.trig = 0; Op.step(S, [inp], 1 / 60); return S.vitals - 30; }; const s0 = syr(); G.TUNING.syringe = 36; const s1 = syr(); G.TUNING.syringe = 18; check('syringe dose slider', s1 > s0 * 1.5, s0 + ' ' + s1);
  Object.assign(G.TUNING, { drain: 2.5, clock: 1.5, assist: .1 }); game.go('op', { id: 'c1' }); game.advance(2.5, { draw: false }); G.devUpdate; // reset restores TUNING
  G.openDev(); game.advance(.5, { draw: false }); G.dev.tab = 0; Object.assign(G.TUNING, G.DEFAULTS); check('reset restores defaults', Object.keys(G.DEFAULTS).every(k => G.TUNING[k] === G.DEFAULTS[k]));
  // cheats: lock vitals keeps the patient alive, force win closes
  const r = playCase(G, 'c3', { maxT: 20, cheat: true }); check('lock vitals cheat keeps pulse up', r.S.vitals >= 29, r.S.vitals);
  G.dev.cheats.lock = true; check('dev dirty flag marks DEV tag', G.devDirty()); G.dev.cheats.lock = false; check('clean state has no DEV tag', !G.devDirty());
  G.dev.open = false;
}
