/* 13-raid: the garage behind the Courts, Friday at nine (§5.8). Plan (front, side or both), stack, breach (✕), then
   thirty seconds: Lil Moe runs to flush, Dale bolts for the roll-up, Tee sits and asks for the paper, Rook reaches for
   a pistol on the bench (✕ within 3 s: "Hands!"). Nobody fires. Then search four spots; two hold the stash. */
const RAID_SPOTS = [{ id: 'trunk', x: 52.6, y: 51.6, label: 'Pop the car trunk' }, { id: 'ceiling', x: 53.6, y: 49.6, label: 'Check the ceiling tile', clue: 'A ladder under a loose tile' }, { id: 'toolbox', x: 53.9, y: 49.8, label: 'Open the toolbox' }, { id: 'wall', x: 51.3, y: 50.4, label: 'Knock on the back wall', clue: 'Plaster dust on the floor here' }];
class Raid {
  constructor(M, o = {}) {
    this.M = M; this.o = o; this.state = 'plan'; this.t = 0; this.found = 0; this.searched = {}; this.res = { moe: false, dale: false, tee: false, rook: false, gun: false, pkg: 0 };
    const r = E.rng(1412 + STATE.ep * 7 + (STATE.meters.case | 0)); const ids = RAID_SPOTS.map(s => s.id).sort(() => r() - .5); this.stash = ids.slice(0, 2);
    this.doors = { front: { x: W(56.5), y: W(50.5), cells: [[55, 50], [55, 51]] }, side: { x: W(50), y: W(49.6), cells: [[50, 50]] } };
  }
  plan(done) {
    UI.choose({ kicker: 'The raid', title: 'How do you go in?', text: 'Friday, 21:00. The Harstad truck pulled in off Harlow twenty minutes ago.', back: false, cards: [
      { id: 'front', label: 'Front: the roll-up door', sub: 'Everybody through one door. Nobody covers the side.' }, { id: 'side', label: 'Side door', sub: 'Quiet. The roll-up stays open behind them.' },
      { id: 'both', label: 'Both: split the team', sub: 'Szabo takes the side, you take the front. Thinner on each.' }] }, id => { F().raidPlan = id; this.state = 'stack'; if (done) done(id); });
  }
  breachDoor() { return F().raidPlan === 'side' ? this.doors.side : this.doors.front; }
  breach() {
    const M = this.M, dr = this.breachDoor(); this.state = 'live'; this.t = 0;
    Snd.play('boom', { pitch: .7 }); game.shake(4); game.particles.dust(dr.x, dr.y, 6, 14); for (const [cx, cy] of dr.cells) World.map.set(cx, cy, 0);
    if (F().raidPlan !== 'side') for (const [cx, cy] of this.doors.front.cells) World.map.set(cx, cy, 0);
    if (F().raidPlan !== 'front') for (const [cx, cy] of this.doors.side.cells) World.map.set(cx, cy, 0);
    Snd.music('chase'); M.radio('lou', F().raidPlan === 'front' ? 'Nobody on the side! Move!' : 'Side\'s covered!', 2);
    const p = M.ppl; if (p.moe) p.moe.goTo(W(54.4), W(52.3), 60); if (p.dale) p.dale.goTo(W(55.5), W(50.5), 70, () => { if (F().raidPlan === 'side') { p.dale.goTo(W(58), W(47), 80); this.res.daleOut = true; } });
    if (p.tee) { p.tee.pose = 'sit'; p.tee.say('Let me see the paper.', 3); }
    if (p.rook) { p.rook.goTo(W(52.5), W(50.2), 50, () => { p.rook.pose = 'reach'; this.rookT = 3; }); }
  }
  tick(dt) {
    const M = this.M, P = M.P, p = M.ppl;
    if (this.state !== 'live') return; this.t += dt;
    // Moe flushes in 6 s unless someone gets to him (Szabo has a chance if the side is covered)
    if (p.moe && !this.res.moe) { if (dist2(P, p.moe) < 22) { this.res.moe = true; p.moe.stop(); p.moe.pose = 'handsUp'; p.moe.say('I ain\'t do nothing!', 2); } else if (this.t > 6 && !this.flushed) { this.flushed = true; const szabo = F().raidPlan !== 'front' && RNG.sim() < .5; if (szabo) { this.res.moe = true; p.moe.pose = 'handsUp'; M.radio('lou', 'Got the little one at the toilet!', 2); } else { Toast('Flushed', 'Lil Moe got some of it down the toilet.'); this.res.flush = true; } } }
    if (p.dale && !this.res.dale && !this.res.daleOut) { if (dist2(P, p.dale) < 22 || (F().raidPlan !== 'side' && dist2(p.dale, this.doors.front) < 24)) { this.res.dale = true; p.dale.stop(); p.dale.pose = 'handsUp'; } }
    if (this.res.daleOut && !this.res.dale) { F().daleEscaped = true; }
    if (this.rookT > 0) { this.rookT -= dt; if (this.rookT <= 0 && !this.res.rook) { F().rookDrew = true; p.rook.pose = 'gun'; this.rookDrewAt = this.t; M.radio('lou', 'GUN! Gun!', 2); game.after(2, () => { if (p.rook) { p.rook.pose = 'handsUp'; p.rook.say('Aight. Aight.', 2); this.res.rook = true; this.res.gun = true; } }); } }
    if (this.t > 30 && this.state === 'live') { this.state = 'search'; Snd.music('field'); Toast('Clear', 'Search the garage. Two of these hold what you came for.'); }
  }
  hands() { const p = this.M.ppl; if (p.rook && this.rookT > 0) { this.res.rook = true; this.res.gun = true; this.rookT = 0; p.rook.pose = 'handsUp'; this.M.say('dana', 'Hands! HANDS!'); Snd.play('hit'); } }
  search(s) {
    const M = this.M, P = M.P; if (this.searched[s.id]) return; this.searched[s.id] = true; P.locked = true; P.pose = 'reach'; Snd.play('rustle');
    game.after(1.6, () => { P.locked = false; P.pose = null;
      if (this.stash.includes(s.id)) { this.found++; Snd.play('powerup'); Toast('Found', this.found === 1 ? 'Two kilos in a gym bag.' : 'Cash, banded. Thirty-one thousand, the count says later.'); if (this.found >= 2) this.finish(); }
      else Toast('Nothing', s.clue ? 'Nothing here. ' : 'Oil rags and a socket set.'); });
  }
  finish() {
    if (this.state === 'done') return; this.state = 'done'; const r = this.res;
    addEvidence({ id: 'seizure:raid', kind: 'seizure', ref: 'tee', pts: 1, text: 'Garage raid: two kilos, $31,000, a pistol, ' + ['tee', r.moe && 'Maurice Dorsey', r.dale && 'Dale Kucharski', r.rook && 'Ricky Batts'].filter(Boolean).length + ' arrests' });
    Meters.stat('brass', 40, 'Dope on the table'); Meters.add('heat', 15, 'The raid'); casePoint('seizure', 'The raid');
    if (this.o.onDone) this.o.onDone(r);
  }
}
