/* PICKOFFS AND REPLAYS. Pickoffs: before the pitch, the pitcher holds L1 and presses a base button to throw over; a
 * runner with an extra lead (R1 for the offense when the Batzooka isn't ready) is easier to catch. Replays: the last 8 s
 * of a play are recorded at 30 Hz; after a big play (homer, diving or wall catch, double play, collision) it plays again
 * at half speed with a REPLAY banner (skippable; Settings, Replays). */
function tryPickoff(base, cpu) {
  const r = runnerOn(base); if (!r || M.outs >= 3) return false;
  const p = clamp(.08 + (r.lead > 0 ? .3 : 0) - .02 * (r.p.spd - 5) + .02 * (defense().pitcher.arm - 5), .02, .6);
  emit('pickoff', { base, cpu }); sfx('whoosh', { pitch: 1.4 });
  if (R() < p) { M.runners = M.runners.filter(x => x !== r); outMade('pickoff', r, false); emit('pickedOff', { runner: r.p }); stamp('PICKED OFF!', RED); sfx('ump'); }
  else { stamp('SAFE!', GREEN, { scale: 2 }); sfx('glove'); r.lead = 0; placeRunner(r); }
  return true;
}
function leadStep() { for (const r of M.runners) if (r.state === 'onBase' && r.lead > 0 && r.base < 3) { const a = basePos(r.base), b = basePos(r.base + 1), d = Math.hypot(b.x - a.x, b.y - a.y); r.x = a.x + (b.x - a.x) / d * 12; r.y = a.y + (b.y - a.y) / d * 12; } }
const REPLAY_LOG = [];
let replayAcc = 0;
function recordFrame(dt) {
  if (M.fast) return; replayAcc += dt; if (replayAcc < 1 / 30) return; replayAcc = 0;
  const b = M.ball;
  REPLAY_LOG.push({ ball: b && b.mode !== 'held' ? [b.x, b.y, b.z, !!b.hidden] : b && b.holder ? [b.holder.x, b.holder.y, b.holder.z + 16, false] : null,
    actors: M.fielders.map(F => [F.rig, F.x, F.y, F.z, F.facing, F.vx, F.vy]).concat(M.runners.filter(r => r.state !== 'out' && r.state !== 'scored').map(r => [r.rig, r.x, r.y, 0, r.facing || 0, Math.cos(r.facing || 0) * (r.state === 'running' ? 120 : 0), Math.sin(r.facing || 0) * (r.state === 'running' ? 120 : 0)])) });
  if (REPLAY_LOG.length > 240) REPLAY_LOG.shift();
}
BZ.bus.on('contact', () => { REPLAY_LOG.length = 0; });
for (const ev of ['homer', 'doublePlay', 'bowlOver']) BZ.bus.on(ev, () => { if (M && M.play) M.play.big = true; });
BZ.bus.on('catch', d => { if (M && M.play && (d.dive || d.wall)) M.play.big = true; });
function startReplay() { M.replay = { frames: REPLAY_LOG.slice(), t: 0 }; M.cam = 'broadcast'; setPhase('replay'); emit('replay', {}); }
function replayStep(dt) {
  const R_ = M.replay; R_.t += dt * .5; const i = Math.floor(R_.t * 30);
  if (!R_ || i >= R_.frames.length || (M.phaseT > .4 && skipPressed())) { M.replay = null; setPhase('playOver'); return; }
  R_.cur = R_.frames[i];
  for (const [rig, x, y, z, f, vx, vy] of R_.cur.actors) if (rig) rig.update(dt * .5, { x, y, z, vx, vy, facing: f, air: z > 2 });
  if (R_.cur.ball) { CAMS.x += (R_.cur.ball[0] - CAMS.x) * .05; CAMS.y += (R_.cur.ball[1] - CAMS.y) * .05; }
}
function replayDraw(r) {
  const f = M.replay && M.replay.cur; if (!f) return;
  for (const [rig, x, y, z] of f.actors) if (rig) { r.shadow(x, y, 5); r.actor(x, y, z, (g, ox, oy) => rig.draw(g, ox, oy, r.view)); }
  if (f.ball && !f.ball[3]) { const [x, y, z] = f.ball; r.shadow(x, y, 2.5, .5); r.queue(x, y, drawZ(z), g => { const s = r.w(x, y, drawZ(z)); ballDraw(g, s[0], s[1], (r.view.zoom || 1) * 1.2, null, 1, 0); }); }
  r.overlay(g => { if (Math.floor(game.real * 2) % 2) E.font.title(g, 'REPLAY', SAFE + 6, r.H - SAFE - 30, { scale: 2, colors: RED }); px.rect(g, 0, 0, r.W, 3, '#e8443a'); px.rect(g, 0, r.H - 3, r.W, 3, '#e8443a'); });
}
