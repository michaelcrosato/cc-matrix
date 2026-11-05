// WEIGHTLIFTING (clean & jerk) — summer · Iron Hall · pick a weight, mash the clean, balance the rack, time the jerk,
// hold it for three white lights. The third attempt may take the YIKES BAR.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp, lerp } = E;
const UI = O.UI, Art = O.Art, PX = 0, PY = 110;
const OPEN = { Easy: [180, 190, 200, 210, 220], Normal: [200, 210, 220, 230, 240], Hard: [210, 220, 230, 240, 250] };

O.defEvent({
  id: 'weights', name: 'WEIGHTLIFTING', short: 'Weights', season: 'summer', venueName: 'IRON HALL', music: 'iron', view: 'brawler',
  format: { type: 'attempts', attempts: 3 }, highlights: 1, maxTime: 30, roundName: 'ATTEMPT',
  measure: { unit: 'kg', better: 'higher', fmt: v => Math.round(v) + ' kg', wr: [270, 'VOL', 'BLAZE CINDERHART'], qualify: { Easy: 200, Normal: 225, Hard: 245 }, seedStep: -5, dp: 0 },
  points: kg => Math.min(1200, 9.5 * (kg - 150)),
  tie: (a, b) => (firstMade(a) - firstMade(b)),
  tune: { cleanTime: [4, 2, 8, .1, 'Clean time (s)'], liftGain: [.12, .04, .3, .01, 'Lift gain'], rReqBase: [5.5, 2, 9, .1, 'Mash needed: base (Hz)'], rReqPerW: [4.5, 0, 8, .1, 'Mash needed per load (Hz)'], rackTime: [1.2, .4, 3, .1, 'Rack steady time (s)'], holdTime: [2, .5, 4, .1, 'Overhead hold time (s)'], driftBase: [1, 0, 3, .05, 'Balance drift'] },
  howto: { goal: 'Best good lift of three. Mash the bar up to your shoulders, steady it, jerk it overhead on the ring, hold it for three white lights.', rows: [[['mashL', 'mashR'], 'MASH: THE CLEAN'], [['moveH'], 'BALANCE THE BAR'], [['action'], 'JERK WHEN THE RING CLOSES'], [['turbo'], 'IRON WILL: STEADY AND STRONG']] },
  yikesKinds: ['drop'], turboName: 'IRON WILL!',
  laurel: { id: 'yikesweight', name: 'YIKES WEIGHT', text: 'Lift the YIKES BAR', test: (ctx, a) => !!(ctx.s && ctx.s.yikes && ctx.s.good) },
  hub: { ok: true, attempts: 2, seconds: 50 }, attract: { seconds: 22, setup(ctx) { ctx.w.attractYikes = true; } },
  phases: ['pick', 'clean', 'rack', 'jerk', 'hold'],
  hubSample: ctx => { const s = ctx.s; return s ? [['pick', 'setup', 'clean', 'rack', 'jerk', 'hold', 'lights', 'drop', 'done'].indexOf(s.phase), s.h || 0, s.kg || 0] : null; },
  hubPoint: (ctx, q, g) => { const k = Object.keys(O.Hub.ghosts).indexOf(String(g.id)); return [PX + (k % 2 ? -1 : 1) * (80 + Math.floor(k / 2) * 40), PY - 20, 0]; },
  build(ctx) { for (const a of ctx.athletes) a.rig = O.makeRig(a.nation, 'weights'); ctx.w.refs = [0, 1, 2].map(i => O.makeRig(O.NATION_IDS[(i * 5 + 2) % 8], 'ceremony', { mate: i })); ctx.w.cracks = 0; },
  start(ctx, a) {
    const wr = ctx.wr0 || 270, prev = a.attempts.filter(Boolean), last = prev[prev.length - 1], lastKg = last ? last.info.kg : null, made = last ? last.perf != null : false;
    let opts;
    if (ctx.meet.mode === 'hub') opts = [ctx.round === 0 ? 220 : 240];
    else if (!last) opts = OPEN[O.difficulty()] || OPEN.Normal;
    else opts = (made ? [lastKg + 5, lastKg + 10, lastKg + 15] : [lastKg, lastKg + 5, lastKg + 10]).concat(ctx.round === 2 ? [wr + 10] : []);
    const attract = ctx.w.attractYikes && a.cheat;
    ctx.s = { a, phase: attract ? 'setup' : 'pick', pt: 0, opts, pick: Math.min(1, opts.length - 1), kg: attract ? wr + 10 : null, yikes: attract, h: 0, bal: null, ring: null, wobble: 1, good: false, lights: null, dropT: 0, cleanT: 0, steadyT: 0, holdT: 0, chalk: 0 };
  },
  step(ctx, dt) {
    const s = ctx.s, a = s.a, I = a.I, T = ctx.T; s.pt += dt;
    if (s.phase === 'pick') {
      if (I.Lf || I.U) s.pick = (s.pick - 1 + s.opts.length) % s.opts.length; if (I.Rt || I.D) s.pick = (s.pick + 1) % s.opts.length;
      if (I.A || s.pt > 12) { s.kg = s.opts[s.pick]; s.yikes = ctx.round === 2 && s.pick === 3; s.phase = 'setup'; s.pt = 0; if (s.yikes) ctx.cue('yikesbar', { a }, { prio: 4 }); else ctx.cue('start', { a }); }
      return;
    }
    const w = (s.kg - 150) / 120, iron = a.turboT > 0;
    if (s.phase === 'setup') { s.chalk += dt; if (s.pt > (ctx.meet.mode === 'attract' ? .5 : 1.2)) { s.phase = 'clean'; s.pt = 0; } }
    else if (s.phase === 'clean') {
      s.cleanT += dt;
      const rate = a.mash.smooth * (iron ? 1.4 : 1), rReq = T.rReqBase + T.rReqPerW * w;
      if (rate < .5 * rReq) s.h = Math.max(0, s.h - .12 * dt); else s.h += (rate - .7 * rReq) * T.liftGain * dt;
      s.h = clamp(s.h, 0, 1);
      if (s.h >= 1) { s.phase = 'rack'; s.pt = 0; s.bal = new O.Widgets.Balance(ctx.rng('rack:' + a.id), { drift: T.driftBase * (1 + w) * .55 }); ctx.cue('clean', { a }); ctx.sfx('clank'); ctx.hype(a, .1); }
      else if (s.cleanT > T.cleanTime) drop(ctx, 'NO LIFT', true);
    } else if (s.phase === 'rack') {
      s.bal.update(dt, I.mv[0], { driftK: iron ? .2 : 1 });
      if (Math.abs(s.bal.b) < .35) s.steadyT += dt; else s.steadyT = Math.max(0, s.steadyT - dt * .5);
      if (s.bal.lost) drop(ctx);
      else if (s.steadyT >= T.rackTime) { s.phase = 'jerk'; s.pt = 0; s.ring = new O.Widgets.Ring(.9); }
    } else if (s.phase === 'jerk') {
      s.ring.update(dt);
      if (I.A || s.ring.done) {
        const res = s.ring.done ? s.ring.result : s.ring.press(), r = ctx.rng('jerk:' + a.id)();
        if (res.j === 'BAD' && r < .5) { drop(ctx); return; }
        s.wobble = res.j === 'PERFECT' ? .5 : res.j === 'GOOD' ? 1 : 1.8; s.jerkJ = res.j; s.phase = 'hold'; s.pt = 0; s.holdT = 0;
        s.bal = new O.Widgets.Balance(ctx.rng('hold:' + a.id), { drift: T.driftBase * (.6 + w * 1.1) * s.wobble * .55 }); ctx.cue('jerk', { a }); ctx.sfx('clank'); if (res.j === 'PERFECT') ctx.hype(a, .2);
      }
    } else if (s.phase === 'hold') {
      s.bal.update(dt, I.mv[0], { driftK: iron ? .2 : 1 }); s.holdT += dt;
      if (s.bal.lost) drop(ctx);
      else if (s.holdT >= T.holdTime) { s.good = true; s.lights = ['W', 'W', 'W']; s.phase = 'lights'; s.pt = 0; ctx.cue('good', { a }, { prio: 3 }); ctx.sfx('medal'); if (s.kg > (ctx.wr0 || 270) || s.yikes) { ctx.w.cracks++; ctx.cue('crack', { a }, { prio: 5 }); ctx.shake(6); } if (!O.sandbox) { O.CrowdAudio.cheer(); O.Crowd.bump(1); } }
    } else if (s.phase === 'lights') { if (s.pt > (O.sandbox ? 0 : 1.8)) s.phase = 'done'; }
    else if (s.phase === 'drop') { s.dropT += dt; if (s.pt > (O.sandbox ? 0 : 1.8)) s.phase = 'done'; }
    if (!O.sandbox) animate(ctx, dt);
  },
  done: ctx => ctx.s.phase === 'done',
  perf: ctx => ctx.s.good ? ctx.s.kg : null,
  attemptInfo: ctx => ({ kg: ctx.s.kg, good: ctx.s.good, at: ctx.round }),
  bot(ctx, a, dt) {
    const s = ctx.s, I = O.blankIntent(), bs = a.bs, perfect = a.cheat === 'perfect';
    if (!s || s.a !== a) return I;
    const cap = 190 + 80 * a.skill;
    if (s.phase === 'pick') {
      if (bs.want === undefined) { const prev = a.attempts.filter(Boolean), last = prev[prev.length - 1]; let want = perfect ? (ctx.round === 2 ? 1e9 : 250 + ctx.round * 15) : 5 * Math.round((cap - 22 + ctx.round * 8) / 5); if (last && last.perf == null && !perfect) want = last.info.kg; bs.want = want; }
      let best = 0; s.opts.forEach((k, i) => { if (Math.abs(k - bs.want) < Math.abs(s.opts[best] - bs.want)) best = i; });
      if (perfect && ctx.round === 2) best = s.opts.length - 1;
      if (s.pick < best) I.Rt = true; else if (s.pick > best) I.Lf = true; else if (s.pt > .5) I.A = true;
      return I;
    }
    if (bs.ok === undefined && s.kg) { const p = perfect ? 1 : 1 / (1 + Math.exp((s.kg - cap) / 6)); const r = ctx.rng('lift:' + a.id + ':' + s.kg)(); bs.ok = r < p; bs.failAt = ['clean', 'rack', 'hold'][Math.floor(r * 37) % 3]; }
    if (s.phase === 'clean') { const hz = bs.ok || bs.failAt !== 'clean' ? 12.5 : 4; const m = O.botMash(bs, hz, dt); I.L = m.L; I.R = m.R; if (a.hype >= 1) I.T = true; }
    else if ((s.phase === 'rack' || s.phase === 'hold') && s.bal) { const failing = !bs.ok && bs.failAt === s.phase && s.pt > .5; const k = failing ? -1.5 : 3; I.mv = [clamp(s.bal.b * k + s.bal.v * (failing ? 0 : 1.2), -1, 1), 0]; }
    else if (s.phase === 'jerk' && s.ring) { if (s.ring.t >= s.ring.dur - .01) I.A = true; }
    return I;
  },
  cam() { game.focus(PX, PY + 10, 26); },
  draw(ctx, r) {
    const s = ctx.s, g = r.ctx, t = game.real;
    game.lights.enabled = true; game.lights.ambient = .38;
    Art.sky(g, r.bw, r.bh, ['#08060e', '#14101e', '#1e1828']);
    // the dim crowd and the banner wall
    const yTop = r.w(0, -40, 60)[1], yBot = r.w(0, 30, 0)[1];
    Art.stands(g, 0, yTop, r.bw, yBot, { tiers: 3, seed: 61, scroll: r.ix, dark: true, bg: '#14101e', lip: '#221a2e', rail: '#4a3f5a', level: O.Crowd.level });
    for (let k = 0; k < 6; k++) { const bx = Math.round(r.bw * (k + .5) / 6) - 12; px.rect(g, bx, yTop - 30, 24, 26, ['#e23b2e', '#2f7fe0', '#f2b632', '#3ab04a', '#ffffff', '#2a2a2a'][k]); E.font.text(g, ['25', '20', '15', '10', '5', '2.5'][k], bx + 4, yTop - 22, k === 4 ? '#14182e' : '#ffffff', { outline: false }); }
    // the hall floor and the wooden platform
    Art.quad(r, [[-400, 30, 0], [400, 30, 0], [400, 260, 0], [-400, 260, 0]], '#2a2430');
    Art.quad(r, [[-60, 70, 0], [60, 70, 0], [60, 150, 0], [-60, 150, 0]], '#a8743a');
    for (let k = 0; k < 8; k++) Art.wline(r, [-60 + k * 15, 70, 0], [-60 + k * 15, 150, 0], '#8a5a2a');
    Art.wline(r, [-60, 70, 0], [60, 70, 0], '#c89050', 2);
    if (ctx.w.cracks) for (let k = 0; k < 6 * ctx.w.cracks; k++) { const h = O.hash('crack' + k), a0 = r.w((h % 100) - 50, 90 + (h >>> 7) % 50, 0); px.line(g, a0[0], a0[1], a0[0] + ((h >>> 3) % 20) - 10, a0[1] + ((h >>> 5) % 8) - 4, '#3a2410', 1); }
    // spotlights
    game.lights.add(PX - 40, PY - 20, 120, 150, 1, { color: '#ffd8a0' }); game.lights.add(PX + 40, PY - 20, 120, 150, .9, { color: '#ffe8c0' });
    for (const sx of [-140, 140]) { const p = r.w(sx, 20, 120); px.blend(g, .12, 'add', () => px.poly(g, [[p[0] - 6, p[1]], [p[0] + 6, p[1]], [r.w(0, PY, 0)[0] + 40 * Math.sign(-sx), r.w(0, PY, 0)[1]], [r.w(0, PY, 0)[0] - 40 * Math.sign(-sx) * -1, r.w(0, PY, 0)[1]]], '#ffe8c0')); }
    // the chalk bowl, the plate rack
    r.queue(-90, 120, 0, gg => { r.box(gg, -98, 114, 0, -82, 126, 14, '#c8ccd8', '#8a90a8'); const p = r.w(-90, 120, 15); px.ell(gg, p[0], p[1], 7, 2, '#ffffff'); });
    r.queue(95, 110, 0, gg => { r.box(gg, 86, 100, 0, 104, 120, 26, '#3a3f5a', '#2a2e40'); for (let i = 0; i < 4; i++) { const p = r.w(95, 110, 6 + i * 5); px.rect(gg, p[0] - 7, p[1] - 6, 14, 3, ['#e23b2e', '#2f7fe0', '#f2b632', '#3ab04a'][i]); } });
    // the referees with their lights, at the front
    ctx.w.refs.forEach((rf, i) => { const x = -90 + i * 90, y = 170; rf.update(1 / 60, { x, y, z: 0, facing: -Math.PI / 2, pose: s && s.lights ? 'cheer' : undefined }); r.actor(x, y, 0, (gg, ox, oy) => rf.draw(gg, ox, oy, r.view)); r.queue(x, y - 8, 0, gg => { const p = r.w(x, y - 8, 22); const c = s && s.lights ? (s.lights[i] === 'W' ? '#ffffff' : '#e23b2e') : '#3a3a48'; px.disc(gg, p[0], p[1], 4, '#14161e'); px.disc(gg, p[0], p[1], 3, c); if (s && s.lights) r.glowDisc(gg, p[0], p[1], 10, c, .6); }, { emissive: true }); });
    if (!s || !s.kg && s.phase === 'pick') { if (s) { s.a.rig.update(1 / 60, { x: PX, y: PY, z: 0, facing: Math.PI / 2, pose: 'hips' }); r.actor(PX, PY, 0, (gg, ox, oy) => s.a.rig.draw(gg, ox, oy, r.view)); } return; }
    const a = s.a;
    r.shadow(PX, PY, 9, .5);
    r.actor(PX, PY, 0, (gg, ox, oy) => { a.rig.draw(gg, ox, oy, r.view); if (s.phase !== 'drop' || s.dropT < .25) O.Gear.barbell(gg, a.rig, r.view, ox, oy, { kg: s.kg, bend: s.phase === 'clean' ? .4 + s.h * .6 : 1 }); }, { ghost: a.turboT > 0 ? { color: '#ffb060', life: .25, alpha: .5, owner: a.rig } : undefined });
    if (s.phase === 'drop' && s.dropT >= .25) { const z = Math.abs(Math.sin(s.dropT * 9)) * Math.max(0, 1 - s.dropT) * 20; r.queue(PX, PY + 10, z, gg => { const p = r.w(PX, PY + 10, z); px.line(gg, p[0] - 24, p[1], p[0] + 24, p[1], '#c8ccd8', 1); for (const sx of [-1, 1]) { px.rect(gg, p[0] + sx * 22 - 2, p[1] - 9, 4, 18, '#e23b2e'); px.rect(gg, p[0] + sx * 26 - 2, p[1] - 7, 3, 14, '#2f7fe0'); } }); }
    if (s.chalk > 0 && s.chalk < 1 && Math.floor(t * 20) % 3 === 0) game.particles.dust(PX, PY, 20, 2, { color: '#ffffff' });
  },
  hud(ctx, r, g) {
    const s = ctx.s, W = r.W, H = r.H; if (!s) return; const a = s.a;
    if (s.phase === 'pick') {
      UI.text(g, 'CHOOSE THE WEIGHT', W / 2 - UI.tw('CHOOSE THE WEIGHT', 2) / 2, 46, '#ffffff', { scale: 2 });
      const n = s.opts.length, w = 64; s.opts.forEach((kg, i) => { const x = Math.round(W / 2 - n * (w + 6) / 2 + i * (w + 6)), y = 66, f = s.pick === i, yk = ctx.round === 2 && i === 3; UI.panel(g, x, y, w, 40, { trim: f ? '#f2b632' : yk ? '#e23b2e' : '#3a3f66', alpha: .92 }); UI.text(g, String(kg), x + w / 2 - UI.tw(String(kg), 2) / 2, y + 8, f ? '#ffe066' : '#ffffff', { scale: 2 }); UI.text(g, yk ? 'YIKES BAR' : 'KG', x + w / 2 - UI.tw(yk ? 'YIKES BAR' : 'KG', 1) / 2, y + 27, yk ? '#ff6b6b' : '#aab0d0'); });
      if (a.human) O.Prompt.strip(g, [['moveH', 'CHOOSE'], ['action', 'LIFT']], W / 2, H - 22, { inp: a.inp });
      if (ctx.humans.length) O.HUD.board(g, ctx, 10, 120, 4, { w: 150 });
      return;
    }
    E.font.text(g, Math.round(s.kg) + ' KG', W - 14 - E.font.width(Math.round(s.kg) + ' KG', { scale: 3 }), 10, s.yikes ? '#ff6b6b' : '#ffe066', { scale: 3, shadow: '#000', outline: '#0b0814' });
    const name = { setup: 'CHALK UP', clean: 'THE CLEAN', rack: 'STEADY!', jerk: 'JERK!', hold: 'HOLD IT!', lights: 'GOOD LIFT!', drop: s.noLift ? 'NO LIFT' : 'DROPPED!' }[s.phase] || '';
    UI.text(g, name, W / 2 - UI.tw(name, 3) / 2, 44, s.phase === 'lights' ? '#4fe0a8' : s.phase === 'drop' ? '#ff6b6b' : '#ffffff', { scale: 3 });
    if (s.phase === 'clean') {
      UI.bar(g, W / 2 - 80, 76, 160, 10, s.h, '#4fe0a8'); UI.text(g, 'BAR HEIGHT', W / 2 - 80, 88, '#aab0d0');
      const rReq = ctx.T.rReqBase + ctx.T.rReqPerW * (s.kg - 150) / 120; UI.text(g, 'MASH ' + a.mash.smooth.toFixed(1) + ' / ' + (rReq * .7).toFixed(1) + ' Hz', W / 2 + 10, 88, a.mash.smooth > rReq * .7 ? '#4fe0a8' : '#ff9a9a');
      UI.bar(g, W / 2 - 80, 100, 160, 3, 1 - s.cleanT / ctx.T.cleanTime, '#f2b632');
      if (a.human) O.Prompt.pair(g, W / 2 - 30, H - 56, 'mashL', 'mashR', { inp: a.inp, flip: a.mash.flip ^ 1, size: 2, label: 'MASH!' });
    }
    if ((s.phase === 'rack' || s.phase === 'hold') && s.bal) { s.bal.draw(g, W / 2, H - 60, 200, { label: s.phase === 'rack' ? 'KEEP IT IN THE GREEN' : 'HOLD ' + Math.max(0, ctx.T.holdTime - s.holdT).toFixed(1) + ' s' }); if (a.human) O.Prompt.draw(g, W / 2, H - 34, 'moveH', { inp: a.inp, label: 'BALANCE', align: 'center' }); if (s.phase === 'rack') UI.bar(g, W / 2 - 50, H - 70, 100, 3, s.steadyT / ctx.T.rackTime, '#4fe0a8'); }
    if (s.phase === 'jerk' && s.ring) { s.ring.draw(g, W / 2, H - 70, 22); if (a.human) O.Prompt.draw(g, W / 2, H - 38, 'action', { inp: a.inp, label: 'JERK!', align: 'center', size: 2 }); }
    if (s.jerkJ && (s.phase === 'hold' || s.phase === 'lights')) UI.text(g, s.jerkJ, W / 2 - UI.tw(s.jerkJ, 1) / 2, 70, s.jerkJ === 'PERFECT' ? '#4fe0a8' : '#ffe066');
    O.HUD.flame(g, 12, 50, a);
    if (ctx.humans.length && ctx.meet.mode !== 'attract') O.HUD.board(g, ctx, 10, 66, 3, { w: 140 });
  }
});
function firstMade(a) { const i = a.attempts.findIndex(x => x && x.perf != null && x.perf === O.aggregate(O.EVENTS.weights, a)); return i < 0 ? 9 : i; }
function drop(ctx, why, noLift) {
  const s = ctx.s, a = s.a;
  if (O.god(a)) { if (s.bal) { s.bal.lost = false; s.bal.b = 0; s.bal.v = 0; } if (s.phase === 'clean') s.h = 1; return; } s.phase = 'drop'; s.pt = 0; s.dropT = 0; s.good = false; s.lights = ['R', 'R', 'R']; s.noLift = !!noLift;
  if (!noLift) { ctx.yikes(a, 'drop'); ctx.sfx('slam'); ctx.shake(5); } else { ctx.sfx('buzzer'); ctx.cue('dnf', { a }); }
}
function animate(ctx, dt) {
  const s = ctx.s, a = s.a, rig = a.rig, st = { x: PX, y: PY, z: 0, facing: Math.PI / 2, vx: 0, vy: 0 };
  if (s.phase === 'pick') { O.Pose.clear(rig); st.pose = 'hips'; }
  else if (s.phase === 'setup') { O.Pose.set(rig, 'liftSetup'); }
  else if (s.phase === 'clean') { O.Pose.set(rig, 'liftClean', { h: s.h }); st.expr = s.h > .3 ? 'shout' : 'angry'; }
  else if (s.phase === 'rack' || s.phase === 'jerk') { O.Pose.set(rig, 'liftRack'); st.expr = 'angry'; if (s.bal) st.x += s.bal.b * 3; }
  else if (s.phase === 'hold' || s.phase === 'lights') { O.Pose.set(rig, 'liftJerk', { u: Math.min(1, s.pt * 6 + (s.phase === 'lights' ? 1 : 0)) }); st.expr = s.phase === 'lights' ? 'shout' : 'angry'; if (s.bal) st.x += s.bal.b * 4; }
  else if (s.phase === 'drop') { if (s.noLift) { O.Pose.clear(rig); st.pose = 'kneel'; } else O.Pose.set(rig, 'liftDrop'); st.expr = 'wince'; }
  rig.update(dt, st);
}
})();
