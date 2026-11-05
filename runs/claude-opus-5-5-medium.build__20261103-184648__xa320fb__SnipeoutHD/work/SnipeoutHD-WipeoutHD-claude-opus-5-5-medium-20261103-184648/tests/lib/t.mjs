// A tiny test kit: test(name, fn) collects checks; done() prints FAIL lines and a RESULT line for tests/run.mjs
let pass = 0, fail = 0, cur = '';
export const check = (ok, msg, detail) => { if (ok) pass++; else { fail++; console.log('FAIL ' + cur + ': ' + msg + (detail !== undefined ? ' ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 600) : '')); } return !!ok; };
export const test = async (name, fn) => { cur = name; try { await fn(); } catch (e) { fail++; console.log('FAIL ' + name + ': threw ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); } };
export const done = () => { console.log('RESULT ' + pass + ' ' + fail); process.exit(0); };
/** advance a headless game with bots driving every human craft */
export function botDrive(ctx, o = {}) {
  const SN = ctx.SN, g = ctx.My3D2dge.current;
  const R = SN.scenes.race.race; if (!R || g.sceneName !== 'race') return;
  for (const h of R.humans) { const c = SN.AI.controls(h, R, Object.assign({ skill: 1, stateKey: 'bot' }, o.ai || {})); if (o.override) Object.assign(c, o.override(h, R, c)); Object.assign(SN.vpad[h.player], c); }
}
export function runRace(ctx, secs, o = {}) { const g = ctx.My3D2dge.current; for (let k = 0; k < 120 * secs && ctx.My3D2dge.current.sceneName === 'race' && !(o.until && o.until()); k++) { botDrive(ctx, o); g.advance(1 / 120); } }
export const errs = g => g.errors.map(e => e.message + ' @' + (e.stack || '').split('\n').slice(1, 3).join(' ')).join(' || ');
/** the academy bot: the AI with each drill's own behaviour */
export function academyBot(ctx) {
  const SN = ctx.SN, A = SN.Academy;
  return {
    ai: { skill: 1, weapons: true, uAt: s => { const d = A.d, Tk = A.R.track; if (!d) return null;
      if (d.id === 'steer') { const g = A.gates.find(q => !q.done); return g ? g.u : null; }
      if (d.id === 'pads') { const p = Tk.speedPads.find(q => { const ds = SN.wrapDiff(A.R.humans[0].s, q.s, Tk.L); return ds > -40 && ds < 2500; }); return p ? p.u : null; }
      if (d.id === 'weapons') return A.R.humans[0].weapon ? 0 : null;
      if (d.id === 'shift') { const m = A.R.weapons.mines; if (!m.length) return null; const us = m.map(q => q.u), hw = Tk.frameAt(m[0].s).hw, gap = Math.min(...us) > -hw * .2 ? -hw * .75 : hw * .75; return gap; }
      if (d.id === 'pit') { const f = Tk.frameAt(s); return Tk.pit.side * (f.hw - Tk.pit.w / 2 - 8); }
      return null; } },
    override(h, R, c) { const d = A.d, Tk = R.track, o = {}; if (!d) return o;
      if (d.id === 'airbrake' && Tk.inRange(h.s, Tk.knots[18] - 200, Tk.knots[20])) { let k = 0; for (let s2 = Tk.knots[18]; s2 < Tk.knots[20]; s2 += 64) k += Tk.curvL(s2); if (k > 0) o.brakeR = Math.max(c.brakeR, .5); else o.brakeL = Math.max(c.brakeL, .5); }
      if (d.id === 'pitch') { o.pitch = 1; o.thrust = 1; }
      if (d.id === 'steer') o.thrust = SN.Ship.fwdSpeed(h) < 62 * 16 ? 1 : 0;
      if (d.id === 'airbrake') o.thrust = SN.Ship.fwdSpeed(h) * SN.KMH < 215 ? 1 : 0;
      if (d.id === 'absorb' && h.weapon === 'mine' && h.pickT <= 0) { o.absorb = 1; o.fire = 0; o.firePressed = 0; }
      if (d.id === 'shift') { const m = R.weapons.mines[0]; if (m) { const ds = SN.wrapDiff(h.s, m.s, Tk.L); if (ds > 60 && ds < 260 && h.shiftCD <= 0) { const tgt = this.ai.uAt(h.s); o[tgt > h.u ? 'shiftR' : 'shiftL'] = 1; } } }
      if (d.id === 'roll' && !h.grounded && h.airT > .1 && !h.rollT && !h.rollDone) o.flick = 1;
      if (d.id === 'lap' || d.id === 'thrust') o.thrust = 1;
      return o; }
  };
}
