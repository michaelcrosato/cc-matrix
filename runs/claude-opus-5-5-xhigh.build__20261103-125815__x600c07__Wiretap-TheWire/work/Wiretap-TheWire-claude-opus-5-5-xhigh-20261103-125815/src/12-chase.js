/* 12-chase: the foot chase (§5.6). The escape graph is loops with no exits: Corey gets away only by staying out of
   sight for 8 s. He picks the node farthest from you that breaks your line of sight; at 15 s Lou takes the car around
   and blocks the edge he's heading into. Sprint drains stamina: the catch comes from routing, the block, and his legs.
   He ditches the package; vault fences (✕ at a fence), tackle within reach while sprinting (✕), hold ✕ to cuff. */
const ESCAPE = {
  nodes: { A: [30.5, 33], B: [30.5, 42.5], C: [20, 42.5], D: [11, 42.5], E: [8, 43], Q: [8, 26.5], R: [20, 30.5], F: [25, 44.5], G: [18.5, 45.6], H: [18, 50], I: [11.5, 50], E2: [8, 50], J: [29.5, 36.5], K: [26.4, 36.4], L: [25.5, 41], M: [30.5, 26.4], N: [27, 20.5], O: [12, 20.5], P: [8, 20] },
  edges: [['A', 'B'], ['A', 'J', 'c'], ['A', 'M'], ['A', 'R'], ['B', 'C'], ['B', 'F'], ['C', 'D'], ['C', 'L'], ['D', 'E'], ['E', 'Q'], ['E', 'E2'], ['F', 'G', 'g'], ['G', 'H'], ['H', 'I'], ['I', 'E2', 'v'], ['J', 'K', 'c'], ['K', 'L'], ['M', 'N'], ['N', 'O'], ['O', 'P'], ['P', 'Q'], ['Q', 'R']]
};
const DITCH = [{ id: 'can1', x: 30.6, y: 41.3, label: 'Search the trash can' }, { id: 'buick', x: 32.2, y: 39.6, label: 'Look under the Buick' }, { id: 'drain', x: 30.5, y: 43.5, label: 'Storm drain', lost: true }, { id: 'can2', x: 21, y: 44.6, label: 'Search the trash can' }, { id: 'window', x: 23.5, y: 30.5, label: 'Check the vacant\'s window' }];
class Chase {
  constructor(M, runner, o = {}) {
    this.M = M; this.r = runner; this.o = o; this.t = 0; this.node = 'A'; this.next = null; this.oos = 0; this.sprintT = 10; this.blocked = null; this.state = 'run'; this.ditched = null; this.pkgFound = false; this.kidT = 0; this.cuffT = 0; this.searchT = 0;
    this.N = {}; for (const k in ESCAPE.nodes) { const [x, y] = ESCAPE.nodes[k]; this.N[k] = { x: W(x - .5), y: W(y - .5) }; }
    this.adj = {}; for (const [a, b, kind] of ESCAPE.edges) { (this.adj[a] = this.adj[a] || []).push([b, kind]); (this.adj[b] = this.adj[b] || []).push([a, kind]); }
    runner.place(this.N.A.x, this.N.A.y); runner.walkSpeed = 112; runner.carry = 'package'; M.pursuit = true;
    for (const d of DITCH) M.int({ id: 'ditch:' + d.id, x: W(d.x - .5), y: W(d.y - .5), r: 24, verb: d.label, hint: '2 s', when: () => this.state !== 'run' && !this.pkgFound && !this.searching && !this.searched[d.id], act: () => this.search(d) });
    this.searched = {};
    this.vaultInt = M.int({ id: 'vault', x: -999, y: -999, r: 22, verb: 'Vault the fence', key: 'interact', when: () => !this.M.P.vaulting && this.fenceNear, act: () => this.vault() });
    M.int({ id: 'tackle', x: 0, y: 0, r: 16, verb: 'Tackle', key: 'interact', when: () => this.canTackle(), act: () => this.tackle() });
    M.int({ id: 'cuff', x: 0, y: 0, r: 20, verb: 'Hold to cuff', key: 'interact', when: () => this.state === 'down', act: () => { } });
  }
  sees() { const P = this.M.P; return (World.cur || World.map).sight(P, this.r) && dist2(P, this.r) < 260; }
  pickNext() {
    const P = this.M.P, cur = this.N[this.node], R = RNG.sim; let best = null, bs = -1e9;
    for (const [k, kind] of this.adj[this.node] || []) {
      if (this.blocked && ((this.blocked[0] === this.node && this.blocked[1] === k) || (this.blocked[1] === this.node && this.blocked[0] === k))) continue;
      const n = this.N[k], away = Math.hypot(n.x - P.x, n.y - P.y), dirP = Math.atan2(P.y - cur.y, P.x - cur.x), dirN = Math.atan2(n.y - cur.y, n.x - cur.x), align = Math.cos(dirN - dirP) * 60;
      const breaks = !(World.map.los(P.x, P.y, n.x, n.y)) ? 40 : 0, sc = away - .5 * align + breaks + R() * 20 + (kind === 'c' ? 25 : 0) - (k === this.prev ? 80 : 0);
      if (sc > bs) { bs = sc; best = [k, kind]; }
    }
    return best;
  }
  tick(dt) {
    const M = this.M, P = M.P, r = this.r; this.t += dt;
    for (const i of M.ints) if (i.id === 'tackle' || i.id === 'cuff') { i.x = r.x; i.y = r.y; }
    // the nearest fence cell beside you, with a walkable landing on its far side
    const m = World.map, [pcx, pcy] = m.toCell(P.x, P.y); this.fenceNear = null; let fb = 22;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const cx = pcx + dx, cy = pcy + dy; if (m.floorAt(W(cx), W(cy)) !== 'fence') continue; const d = Math.hypot(W(cx) - P.x, W(cy) - P.y); const lx = W(cx) + (W(cx) - P.x) / (d || 1) * 18, ly = W(cy) + (W(cy) - P.y) / (d || 1) * 18, lc = m.toCell(lx, ly); if (d < fb && m.walkable(lc[0], lc[1])) { fb = d; this.fenceNear = { x: W(cx), y: W(cy), lx, ly }; } }
    if (this.fenceNear) { this.vaultInt.x = this.fenceNear.x; this.vaultInt.y = this.fenceNear.y; } else { this.vaultInt.x = this.vaultInt.y = -999; }
    if (this.state === 'run') {
      if (!this.next || (!r.goal && !r.vaulting)) {
        const nx = this.pickNext(); if (nx) { this.prev = this.node; this.next = nx; const n = this.N[nx[0]];
          if (nx[1] === 'v') { r.vaulting = true; r.ghost = true; Snd.play('fence'); r.goTo(n.x, n.y, 70, () => { r.ghost = false; r.vaulting = false; this.node = nx[0]; this.next = null; }); }
          else r.goTo(n.x, n.y, r.walkSpeed, () => { this.node = nx[0]; this.next = null; }); }
      }
      // speed: sprint 10 s, then run; recovers after 4 s out of sight
      const seen = this.sees(); this.sprintT -= dt; if (!seen) { this.oos += dt; if (this.oos > 4) this.sprintT = Math.max(this.sprintT, 10); } else this.oos = 0;
      r.speed = r.vaulting ? r.speed : this.sprintT > 0 ? 112 : 92; r.sprint = true;
      if (this.oos > 8) return this.lose();
      // Lou takes the car around
      if (this.t > 15 && !this.blocked && this.next) {
        this.blocked = [this.node, this.next[0]]; const a = this.N[this.node], b = this.N[this.next[0]], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        M.cars.push(Object.assign(new Car('sedan', new E.Path([[mx - 60, my], [mx, my]]), 120, { stay: true, mats: { b: '#c8b48a glaze' } }), {}));
        M.radio('lou', 'Got the car around! He\'s yours, he\'s yours!', 2.5); Snd.play('busbrake'); r.stop(); this.next = null; r.goTo(a.x, a.y, r.speed, () => { this.next = null; });
      }
      // the ditch
      if (!this.ditched && (dist2(P, r) < 90 || this.t > 10)) {
        const d = DITCH.filter(s => Math.hypot(W(s.x - .5) - r.x, W(s.y - .5) - r.y) < 70).sort((a2, b2) => Math.hypot(W(a2.x - .5) - r.x, W(a2.y - .5) - r.y) - Math.hypot(W(b2.x - .5) - r.x, W(b2.y - .5) - r.y))[0];
        if (d) { this.ditched = d; r.carry = null; r.pose = 'reach'; game.after(.4, () => { r.pose = null; }); Snd.play('coin', { pitch: .6, vol: .4 }); game.particles.glints(W(d.x - .5), W(d.y - .5), 6, 6, '#fff6c0'); if (tip('ditch')) Toast('He ditched something', 'Around ' + placeName(r.x, r.y) + '. Search after you catch him.'); }
      }
    } else if (this.state === 'down') {
      r.vx = r.vy = 0; r.down = 1;
      if (M.ctl.down('interact')) { this.cuffT += dt; if (this.cuffT >= 1.2) this.cuff(); } else this.cuffT = Math.max(0, this.cuffT - dt * 2);
    } else if (this.state === 'cuffed') {
      // the bike kid takes the package after 45 s
      if (this.ditched && !this.pkgFound && !this.ditched.lost) { this.kidT += dt; if (this.kidT > 45 && !this.kidGone) { this.kidGone = true; Toast('Gone', 'A kid on a bike rode past the ' + this.ditched.label.replace(/^(Search|Look under|Check) the /, '') + '. Whatever was there is gone.'); Meters.add('heat', 5, 'The package walked off'); } }
    }
    if (P.tackleT > 0) { P.tackleT -= dt; if (P.tackleT <= 0) { P.locked = false; P.down = 0; } }
  }
  canTackle() { const P = this.M.P; return this.state === 'run' && dist2(P, this.r) < 18 && P.sprinting; }
  tackle() {
    const P = this.M.P, r = this.r, d = dist2(P, r); P.locked = true; P.tackleT = .8; P.down = .6; const a = angTo(P, r); P.body.x += Math.cos(a) * Math.min(d, 12); P.body.y += Math.sin(a) * Math.min(d, 12);
    if (d < 16) { this.state = 'down'; r.stop(); r.down = 1; r.locked = true; game.shake(4); Snd.play('punch'); game.input.rumble(.5, .2); game.particles.dust(r.x, r.y, 2, 10); Toast('Down', 'Hold ' + Prompts.label('interact') + ' to cuff him.'); }
    else { Snd.play('whoosh'); P.tackleT = .8; Toast('Missed', 'He\'s still going.'); }
  }
  cuff() {
    const r = this.r; this.state = 'cuffed'; r.down = 0; r.pose = 'cuffed'; r.locked = true; Snd.play('cuffs'); game.after(.06, () => Snd.play('cuffs')); game.input.rumble(.4, .2); STATE.stats.chases++;
    addEvidence({ id: 'seizure:pager', kind: 'seizure', ref: 'corey', pts: 1, text: 'Pager seized from Corey Lyle on arrest. Label: 555-0110.' });
    STATE.numbers.PG = { n: '555-0110', known: true, tapped: false, user: 'corey' };
    Meters.stat('brass', 10, 'Corey Lyle in custody'); Meters.add('heat', 10, 'They took the stash kid');
    if (!this.ditched) { this.pkgFound = true; this.foundPackage(); }
    else if (this.ditched.lost) Toast('The storm drain', 'Whatever he threw is in the harbor by now.');
    if (this.o.onCuff) this.o.onCuff();
  }
  search(d) {
    const P = this.M.P; this.searching = true; P.locked = true; P.pose = 'crouch'; Snd.play('rustle');
    game.after(2, () => { this.searching = false; P.locked = false; P.pose = null; this.searched[d.id] = true;
      if (this.ditched && this.ditched.id === d.id && !d.lost && !this.kidGone) { this.pkgFound = true; this.foundPackage(); } else Toast('Nothing', d.lost ? 'Just the sound of water.' : 'Cigarette butts and a sock.'); });
  }
  foundPackage() { F().coreyPackage = true; addEvidence({ id: 'seizure:package', kind: 'seizure', ref: 'corey', pts: 1, text: 'Forty vials, orange tops, in a paper bag Corey Lyle ditched.' }); casePoint('seizure', 'The package: forty vials'); Snd.play('powerup'); }
  vault() {
    const P = this.M.P; if (P.vaulting) return; P.vaulting = true; P.locked = true; Snd.play('fence');
    const f = this.fenceNear; if (!f) { P.vaulting = false; P.locked = false; return; } const from = { x: P.x, y: P.y }, to = { x: f.lx, y: f.ly };
    let u = 0; const step = () => { u += 1 / 60 / .7; const k = Math.min(1, u); P.body.x = lerp(from.x, to.x, k); P.body.y = lerp(from.y, to.y, k); P.body.z = Math.sin(k * Math.PI) * 14; if (k < 1) game.after(1 / 60, step); else { P.body.z = 0; P.vaulting = false; P.locked = false; } };
    step();
  }
  lose() { if (this.state !== 'run') return; this.state = 'lost'; this.r.stop(); this.M.fail('He\'s gone', 'Corey stayed out of your sight long enough to disappear into the alleys.', { sub: 'From the start of the chase', fn: () => Director.go(STATE.beat, { noSave: true }) }); }
}
