// M1's measurable half: modelled people playing every activity through the REAL device paths (nudged keys, the pointer,
// buttons), not by writing intent as the bots do. They react late, as the average bot does.
import { load } from './lib.mjs';
export function devicePlay(id, device, seed) {
  const env = load(), { G, game, E } = env; G.ensureMember(); G.noSave = true; const I = game.input, mouse = device === 'mouse';
  game.go('act_' + id, { mode: 'test', seed, skipCard: true, contestants: [{ name: 'T', local: true, input: I, color: '#fff' }] }, { fade: 0 }); game.advance(.02);
  const sc = game.scene, ctx = sc.ctx, c = ctx.local, b = c.bal, def = ctx.def; sc.phase = 'play'; sc.t = 0; if (def.begin) def.begin(ctx);
  const q = [], lag = Math.round(.25 * 120), held = {}, set = (a, on) => { if (!!held[a] !== on) { I.hold(a, on); held[a] = on; } };
  const btn = (code, on) => { if (!!held[code] !== on) { if (on) I.press(code); else I.release(code); held[code] = on; } }, tapBtn = code => { I.press(code); held['t' + code] = 2; };
  const W = game.W || 427, H = game.H || 240, reach = H * G.DEV.mouseReach; let n = 0, spin = 0, nextStep = 0, side = 0, pi = 0; const R = E.rng(seed + 5);
  const lean = (tx, ty, dz = .05) => { const u = c.intent; if (mouse) { if (n % 2 === 0) I.feed('move', W / 2 + tx * reach, H / 2 - ty * reach); } else { set('right', tx > u.ux + dz); set('left', tx < u.ux - dz); set('up', ty > u.uy + dz); set('down', ty < u.uy - dz); } };
  if (mouse) I.feed('move', W / 2, H / 2);
  const notes = id === 'step' ? c.rh.notes.map(k => ({ lane: k.lane, step: k.step + (R() - .5) * .35 })) : null;
  c.lean = c.lean || new G.LeanBot('average', E.rng(seed));
  while (sc.phase === 'play' && n++ < 120 * 170) {
    for (const k in held) if (k[0] === 't' && --held[k] <= 0) { I.release(k.slice(1)); delete held[k]; }
    const fam = def.family;
    if (fam === 'hold' || fam === 'candle' || id === 'laundry') { q.push([b.px - b.ringX, b.py - b.ringY, b.vx, b.vy]); const s = q[Math.max(0, q.length - 1 - lag)]; lean(-1.4 * s[0] - .3 * s[2], id === 'laundry' ? 0 : -1.4 * s[1] - .3 * s[3]);
      if (id === 'flow') { const rising = (ctx.t % ctx.T.cycle) < ctx.T.cycle / 2; if (mouse) btn('Mouse0', rising); else set('breath', rising); }
      if (id === 'laundry') { if (mouse) btn('Mouse0', true); else set('breath', true); const s2 = c.s, pin = ctx.pins.find(p => p.x > s2.x && p.x - s2.x < (s2.v || 8) * .18 + 1.5 && !p.tried); if (pin) { pin.tried = true; if (mouse) tapBtn('Mouse2'); else I.tap('jump'); } } }
    else if (fam === 'rep') { const side2 = !!def.side, sgn = side2 ? (ctx.rep % 2 ? -1 : 1) : 1, u = ctx.u + .2, bd = u < ctx.T.down ? u / ctx.T.down : u < ctx.T.down + ctx.T.hold ? 1 : Math.max(0, 1 - (u - ctx.T.down - ctx.T.hold) / ctx.T.up); if (side2) lean(sgn * bd, -b.py); else lean(-b.px, -bd); }
    else if (id === 'hoop') { const rate = mouse ? 9 : 5.3; spin += rate * (1 / 120) * (ctx.half ? -1 : 1) * (c.s.hoops > 2 ? 1.06 : 1); if (mouse) { if (n % 2 === 0) I.feed('move', W / 2 + Math.cos(spin) * reach, H / 2 - Math.sin(spin) * reach); } else { const q4 = ((Math.round(spin / (Math.PI / 2)) % 4) + 4) % 4; set('right', q4 === 0); set('up', q4 === 1); set('left', q4 === 2); set('down', q4 === 3); }
      for (const t of ctx.tosses) if (!t.seen && Math.abs(ctx.t - t.at) < .12) { t.seen = true; if (mouse) tapBtn(t.side < 0 ? 'Mouse0' : 'Mouse2'); else I.tap(t.side < 0 ? 'catchL' : 'catchR'); } }
    else if (id === 'jog') { if (ctx.t >= nextStep) { nextStep = ctx.t + 1 / 3; const a = side ? 'paceR' : 'paceL'; if (mouse) tapBtn(side ? 'Mouse2' : 'Mouse0'); else I.tap(a); side = 1 - side; } const s = c.s, cup = ctx.items.find(k => k.kind === 'cup' && !k.gone && k.z > s.z); lean(clamp2((cup ? cup.x : 0) - s.x), 0, .12); }
    else if (id === 'step') { const p = game.audio.pos.step; while (pi < notes.length && notes[pi].step <= p) { const L = notes[pi].lane; if (mouse) tapBtn(L === 0 ? 'Mouse0' : 'Mouse2'); else I.tap(['stepL', 'stepD', 'stepU', 'stepR'][L]); pi++; } }
    else { const sx = c.intent.ux, sy = c.intent.uy; def.botFill(ctx, c, 'average', 1 / 120); const tx = c.intent.ux, ty = c.intent.uy; c.intent.ux = sx; c.intent.uy = sy; lean(tx, ty, .08); }
    game.advance(1 / 120);
  }
  return { pct: c.pct, stars: c.stars, source: c.intent.source, errors: game.errors.map(e => e.message) };
}
const clamp2 = v => Math.max(-1, Math.min(1, v));
export const ALL = ['stork', 'flow', 'candle', 'squat', 'pushup', 'lunge', 'step', 'hoop', 'jog', 'slalom', 'tray', 'laundry'];
if (process.argv[1].endsWith('devices.mjs')) for (const id of ALL) for (const d of ['keys', 'mouse']) { const r = [1, 2].map(s => devicePlay(id, d, s * 31)); console.log(id.padEnd(8), d.padEnd(6), r.map(x => x.pct.toFixed(2)).join(' '), 'src', r[0].source, r[0].errors.slice(0, 1).join()); }
