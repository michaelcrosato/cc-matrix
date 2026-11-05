/* ============ 90-start: wrappers, validation, the debug handle, boot, start ============ */
EF.validate = () => {
  const bad = [], need = (cond, msg) => { if (!cond) bad.push(msg); };
  for (const t of EF.all('team')) { need(EF.get('stadium', t.stadium), 'team ' + t.id + ' stadium ' + t.stadium); need(EF.get('formation', t.formation), 'team ' + t.id + ' formation'); need(EF.get('tactic', t.tactic), 'team ' + t.id + ' tactic'); need(EF.get('super', t.superId), 'team ' + t.id + ' super'); need(t.players.length === 5, 'team ' + t.id + ' needs 5 players'); }
  for (const rd of EF.STORY.rounds) { need(EF.get('team', rd.team), 'round ' + rd.id + ' team'); need(EF.get('stadium', rd.stadium), 'round ' + rd.id + ' stadium'); need(EF.get('referee', rd.ref), 'round ' + rd.id + ' ref'); need(EF.CHALLENGES[rd.challenge], 'round ' + rd.id + ' challenge'); for (const [who] of (rd.talk || []).concat(rd.after || [])) need(EF.SPEAKERS[who], 'speaker ' + who); }
  for (const k in EF.LINES) for (const ln of EF.LINES[k]) if (/[^\x20-\x7e]/.test(ln)) bad.push('non-ASCII in line pool ' + k + ': ' + ln.slice(0, 30));
  return bad;
};
EF.loadTune();
// every scene: the dev panel sits over it, and the pause menu's quit goes to the title
for (const name in EF.scenes) { const sc = EF.scenes[name]; sc.name = name; const u = sc.update, d = sc.draw; sc.update = function (dt) { if (EF.Dev.on) { EF.Dev.update(dt); return; } return u.call(this, dt); }; sc.draw = function (r) { d.call(this, r); if (EF.Dev.on) EF.Dev.draw(r); }; }
game.debug = { EF, E, game, validate: EF.validate, snapshot() { const sc = game.scene, M = sc && sc.M; return { scene: sc && sc.name, errors: game.errors.length, match: M ? { mode: M.mode, score: M.score, clock: +M.clock.toFixed(1), half: M.half, ball: [Math.round(M.ball.x), Math.round(M.ball.y)] } : null }; } };
const hashScene = ((typeof location !== 'undefined' && location.hash) || '').slice(1).split('/');
EF.firstScene = EF.session ? 'hubwait' : 'title';
EF.deep = () => {
  const [h, a, b] = hashScene; if (!h || EF.session) return null;
  const rd = a && /^r[1-5]$/.test(a) ? +a[1] - 1 : a === 'final' ? 4 : 0;
  switch (h) {
    case 'attract': return ['attract']; case 'setup': return ['setup']; case 'album': return ['album']; case 'about': return ['about']; case 'ending': return ['ending']; case 'training': return a ? ['match', null, a] : ['training'];
    case 'cup': return ['cup', a ? { round: rd, post: false, resume: true } : { resume: true }, rd];
    case 'match': { const st = a && EF.get('stadium', a) ? a : 'smokehouse'; return ['match', { mode: 'kickabout', home: 'kip', away: 'hoo', stadium: st, humans: [{ idx: 0, side: 0 }], rules: { needWinner: false }, seed: +EF.query.seed || 11, onSetup: M => { if (a === 'corner') M.setPiece('corner', 0, 0, 0, { right: true }); else if (a === 'freekick') M.setPiece('freekick', 0, Pitch.X1 - 170, Pitch.CY + 40, {}); else if (a === 'penalty') M.setPiece('penalty', 0, 0, 0, {}); else if (a === 'shootout') M.startShootout(); else if (a === 'super') { M.eu[0] = 1; M.tryEuphoria(0); } } }]; }
  }
  return null;
};
const bad = EF.validate(); if (bad.length) console.warn('content problems:\n' + bad.join('\n'));
if (!EF.noStart) {
  const dl = EF.deep(); let first = EF.firstScene, data;
  if (dl) { first = dl[0]; data = dl[1]; if (first === 'cup' && dl[1] && dl[1].round !== undefined) { EF.Save.load().round = dl[2]; EF.Save.load().started = true; } if (first === 'training') { /* menu */ } if (first === 'match' && dl[2] && !dl[1]) { EF.pendingDrill = dl[2]; first = 'title'; data = undefined; } }
  game.start({ scenes: EF.scenes, scene: first, data, boot: { title: 'EUROPHORIA FOOTBALL', steps: [['Pitching the pitch', () => { Pitch.build('smokehouse'); }], ['Inflating the ball', () => { EF.ballSprite('classic', 0); EF.ballSprite('classic', 1); }], ['Warming up the crowd', () => { for (const k in EF.SPEAKERS) if (!EF.SPEAKERS[k].rig || true) try { EF.speakerRig(k); } catch (e) { /* later */ } }]] } });
}
