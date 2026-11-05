/* MASH TV — 19-endings: the two endings staged in the play scene (§8.2): the contestants posed in a row under the spotlight,
 * Ending A's spare Lance robot booting up behind the curtain, and Ending B's red OFF switch with the studio lights going out
 * one by one. The flow waits on MT.stage(kind); the play scene steps and draws the stage while it is up. */

MT.endX = (i, n) => 184 + (i - (n - 1) / 2) * 44;

// the stage runs for its time, or until a confirm after a second; then the flow's end card follows
MT.stage = function* (kind) {
  const S = MT.PLAY, dur = kind === 'a' ? 13 : 15;
  S.ending = { kind, t: 0, dur, done: false, lanceRig: null };
  MT.lines.length = 0; MT.lineNow = null;
  const lines = kind === 'a' ? [['PENNY', MT.TEXT.endingA[0]], ['LANCE', MT.TEXT.endingANext]] : [['ANNC', MT.TEXT.endingB[0]], ['ANNC', MT.TEXT.endingB[1]]];
  for (const [w, t] of lines) MT.say(w, t, { prio: 5 });
  MT.music('ending');
  yield E.any([dur, () => (S.ending && S.ending.done) || (S.ending && S.ending.t > 1 && MT.anyConfirm())]);
  S.ending = null;
};
MT.endingStep = (G, dt) => {
  const X = MT.PLAY.ending; if (!X) return;
  X.t += dt; if (X.t >= X.dur) X.done = true;
  const beat = 60 / (MT.SONGS.ending.bpm || 96);   // the ending's tempo: each cue lands on a beat of its song
  const cues = X.kind === 'a' ? [[4, 'static'], [6, 'powerup'], [9, 'sting']] : [[6, 'drumroll'], [8, 'click'], [9, 'click'], [10, 'click'], [11, 'click'], [12, 'click'], [13, 'boo'], [14, 'lose']];
  for (const [beats, sfx] of cues) { if (!X.beats) X.beats = {}; if (!X.beats[beats] && X.t >= beats * beat) { X.beats[beats] = 1; MT.sfx(sfx); } }
  const cs = MT.run ? MT.run.players.map(p => p.c).filter(Boolean) : [];
  cs.forEach((c, i) => {
    if (!c.rig) c.rig = MT.lookRig(c.slot);
    const pose = X.kind === 'a' ? 'cheer' : (X.t < 6 ? 'point' : 'cheer');
    c.rig.update(dt, { x: MT.endX(i, cs.length), y: 130, z: 0, vx: 0, vy: 0, facing: X.kind === 'a' ? -Math.PI / 2 : -Math.PI / 2, pose, expr: 'smile' });
  });
  if (X.kind === 'a' && X.t > 5) {
    if (!X.lanceRig) X.lanceRig = new E.Humanoid(MT.LANCE_LOOK);
    X.lanceRig.update(dt, { x: 262, y: 84, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: X.t < 9 ? 'wince' : 'smile', pose: X.t < 9 ? undefined : 'wave' });
  }
};
MT.drawEnding = (r, X) => {
  const lightsOut = X.kind === 'b' ? Math.min(1, Math.max(0, (X.t - 6) / 7)) : 0;
  r.sky(X.kind === 'a' ? ['#140a34', '#3a1c66'] : ['#080410', '#1a0a14']);
  // the contestants, under the spotlight
  const cs = MT.run ? MT.run.players.map(p => p.c).filter(Boolean) : [];
  if (X.kind === 'b') r.queue(184, 188, 0, g => r.box(g, 170, 180, 0, 198, 196, 14, '#7a1010', '#4a0808'));
  if (X.kind === 'b') r.overlay(g => E.font.text(g, 'OFF', r.W / 2, r.H * .68, '#ffffff', { scale: 2, align: 'center', shadow: '#000' }));
  cs.forEach((c, i) => { const x = MT.endX(i, cs.length); if (!c.rig) return; r.shadow(x, 130, 6, .35, undefined, 0); r.actor(x, 130, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { outline: true }); });
  if (X.kind === 'a' && X.t > 5 && X.lanceRig) {
    const glitch = X.t < 9 && Math.floor(X.t * 20) % 3 === 0;
    if (!glitch) r.actor(262, 84, 0, (g, ox, oy) => X.lanceRig.draw(g, ox, oy, r.view), { outline: true });
    if (X.t < 9) r.overlay(g => E.font.text(g, 'REBOOTING...', r.W - 90, 40, '#2ee6ff', { scale: 1, shadow: '#000' }));
  }
  if (lightsOut > 0) r.overlay(g => px.rect(g, 0, 0, r.bw, r.bh, 'rgba(0,0,0,' + (lightsOut * .9).toFixed(2) + ')'));
  r.overlay(g => E.font.title(g, X.kind === 'a' ? 'THE SEASON SURVIVED' : 'MASH TV, CANCELLED', r.W / 2, 16, { scale: 2, align: 'center', colors: X.kind === 'a' ? ['#ffcc33', '#ff2e88'] : ['#ff3344', '#ffffff'] }));
};
// the endings as the flow runs them: the staged scene, then the end card
MT.endingA = function* (G, run) {
  yield* MT.stage('a');
  yield* MT.cardWait('MASH TV WILL RETURN.', 'FIND 5 GOLDEN KEYS TO OPEN THE GREEN ROOM', '', 4.2);
};
MT.endingB = function* (G, run) {
  yield* MT.stage('b');
  yield* MT.cardWait('MASH TV - CANCELLED.', 'THANKS FOR WATCHING.', 'CHANNEL 3,000: TONIGHT: MASHED POTATOES!', 4.2);
};
