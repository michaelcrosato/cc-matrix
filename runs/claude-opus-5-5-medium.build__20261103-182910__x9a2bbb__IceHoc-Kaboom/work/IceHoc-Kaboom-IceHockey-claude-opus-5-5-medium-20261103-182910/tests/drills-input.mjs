// The seven drills played through game.input only (stick holds and button taps, as a player would): the test reads the
// game's state to decide what to press, but never writes it.
import { load } from './lib.mjs';
const res = [];
for (let n = 1; n <= 7; n++) {
  const { game, G } = load(''); game.advance(.2); const I = game.input, held = new Set();
  const hold = (a, on) => { if (on && !held.has(a)) { held.add(a); I.hold(a); } else if (!on && held.has(a)) { held.delete(a); I.hold(a, false); } };
  const steer = (s, tx, ty, dead = 6) => { const dx = tx - s.x, dy = ty - s.y; hold('right', dx > dead); hold('left', dx < -dead); hold('down', dy > dead); hold('up', dy < -dead); };
  const stopAll = () => { for (const a of [...held]) hold(a, false); };
  G.Drills.start(n); game.advance(.8);
  const D = () => G.Drills.D, M = () => G.M, me = () => M().humans[0].s;
  let t = 0, phase = 0, tChg = 0;
  while (t < 70 && !G.Save.data.drills[n]) {
    const s = me(), m = M(), p = m.puck, d = D();
    if (n === 1) {
      const gt = d.gates[d.gate]; if (gt) {
        const dist = Math.hypot(gt[0] - s.x, gt[1] - s.y);
        if (gt[2] && dist < 34 && Math.hypot(s.vx, s.vy) > 70) { const a = Math.atan2(-s.vy, -s.vx); hold('right', Math.cos(a) > .4); hold('left', Math.cos(a) < -.4); hold('down', Math.sin(a) > .4); hold('up', Math.sin(a) < -.4); }
        else { steer(s, gt[0], gt[1]); hold('turbo', dist > 80 && !gt[2]); }
      }
    }
    if (n === 2) {
      if (p.owner === s) { const mate = m.skaters.filter(o => o.team === 0 && o !== s).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0]; steer(s, mate.x, mate.y, 4); if (t - tChg > .5 && Math.abs(Math.atan2(mate.y - s.y, mate.x - s.x) - s.facing) < .5) { I.tap(d.count >= 4 && !d.saucer ? 'lob' : 'pass'); tChg = t; } }
      else if (!p.passTo || p.passTo === s) steer(s, p.x, p.y, 2); else stopAll();
    }
    if (n === 3 || n === 7) {
      if (n === 7 && d.stage === 1) { const lou = d.lou; if (lou) { const a = lou.facing + Math.PI / 2; steer(s, s.x + Math.cos(a) * 60, s.y + Math.sin(a) * 60); hold('turbo', true); } }   // step out of his line, as Marge says
      else if (p.owner === s) {
        const k = (phase++) % 4;
        // aim with the stick: up for one side, down for the other; tap for a wrister, hold for a slapshot
        const wind = n === 7 ? .8 : (k % 2 ? 1.1 : .05);
        hold('shoot', true); game.advance(Math.max(0, wind - .2)); hold(k < 2 ? 'up' : 'down', true); game.advance(Math.min(wind, .2)); hold('shoot', false); game.advance(1 / 60); hold('up', false); hold('down', false);
        game.advance(1.4); t += 1.45;
      } else stopAll();
    }
    if (n === 4) { stopAll(); if (p.passTo === s && Math.hypot(p.x - s.x, p.y - s.y) < 70 && t - tChg > .3) { I.tap('shoot'); tChg = t; } }
    if (n === 5) {
      const dum = d.dummies.find(x => x.state === 'skate') || d.dummies[0];
      if (phase === 0) { steer(s, dum.x, dum.y + 90); hold('turbo', false); if (Math.hypot(dum.x - s.x, dum.y + 90 - s.y) < 12) phase = 1; }
      else { steer(s, dum.x, dum.y - 10, 2); hold('turbo', true); if (Math.hypot(dum.x - s.x, dum.y - s.y) < 26 && t - tChg > .6) { I.tap('shoot'); tChg = t; phase = 2; } if (phase === 2 && t - tChg > 1.5) phase = 0; }
    }
    if (n === 6) { if (m.phase === 'fight' && Math.floor(t * 10) % 2 === 0) I.tap('pass'); }
    game.advance(1 / 30); t += 1 / 30;
  }
  stopAll(); game.advance(3);
  res.push([n, !!G.Save.data.drills[n], Math.round(t), JSON.stringify({ count: D().count, gate: D().gate, stage: D().stage, glass: D().glass }), game.errors.length]);
}
for (const r of res) console.log((r[1] ? 'PASS' : 'FAIL') + ' [drills-input] drill ' + r[0] + ' completed by input in ' + r[2] + ' s ' + r[3] + ' errors ' + r[4]);
