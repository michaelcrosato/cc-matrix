/* 11-tail: following a careful man (§5.5). He walks a route and dry-cleans it: looks back, doubles back, watches a shop
   window's reflection, cuts through a vacant, stops at a payphone, waits. Keep him 64-160 away; past 220 or out of
   sight the "Losing him" timer runs. When he stops, don't stop. △ hands the eye to your partner (a different face). */
const ROUTES = {
  teeDry: { waypoints: [[30, 32], [30, 26.5], [28, 26.5], [20, 26.5], [9, 26.5], [9, 21], [15, 20.5], [29, 20.5], [30, 15.5], [44, 15.5], [56, 15.5], [56.5, 30], [56.5, 47], [49, 47], [46.5, 41], [46.5, 36], [55, 36], [56.5, 36], [56.5, 30], [42, 30.4], [34, 30.4], [33.4, 31], [30.5, 32], [30.5, 44], [18, 45], [18, 49]],
    acts: { 2: ['window', 3], 3: ['lookBack'], 6: ['doubleBack', 48], 8: ['wait', 4], 9: ['lookBack'], 13: ['cutThrough'], 15: ['lookBack'], 19: ['phoneStop', 4], 21: ['window', 3], 23: ['wait', 3] }, checkpoints: [4, 9, 14, 19], extra: { 6: ['lookBack'], 12: ['lookBack'], 21: ['lookBack'] } },
  countRun: { waypoints: [[27.5, 36], [26, 36], [25.4, 41], [25.4, 42.5], [30.5, 43], [33.4, 31], [33.4, 26.5], [33.4, 21], [46, 21]], acts: { 3: ['cutThrough'], 5: ['window', 3], 7: ['lookBack'] }, checkpoints: [3, 6] }
};
class Tail {
  constructor(M, target, routeId, o = {}) {
    this.M = M; this.a = target; this.R = ROUTES[routeId]; this.i = 1; this.o = o; this.lose = 0; this.lostAt = DIFF.lose; this.act = null; this.done = false; this.cool = 0; this.cp = 0; this.handoffs = 0;
    this.wp = this.R.waypoints.map(([x, y]) => ({ x: W(x - .5), y: W(y - .5) }));
    this.acts = Object.assign({}, this.R.acts); if (STATE.meters.heat >= 70 && this.R.extra) for (const k in this.R.extra) if (!this.acts[k]) this.acts[k] = this.R.extra[k];
    target.place(this.wp[0].x, this.wp[0].y); target.watcher = true; target.range = 170; target.fov = 1.5; target.walkSpeed = 46; target.tailT = true;
    M.observers.push(target);
    this.save();
  }
  save() { const M = this.M; this.check = { i: this.i, tx: this.a.x, ty: this.a.y, px: M.P.x, py: M.P.y, partner: M.partner ? [M.partner.x, M.partner.y] : null }; }
  restore() {
    const M = this.M, c = this.check; this.i = c.i; this.a.place(c.tx, c.ty); this.act = null; this.lose = 0; M.P.place(c.px, c.py); if (M.partner && c.partner) M.partner.place(c.partner[0], c.partner[1]);
    Perception.calm(M.P); if (M.partner) Perception.calm(M.partner); this.a.minds = {}; STATE.stats.retries++; M.failing = false;
  }
  get dist() { return dist2(this.M.P, this.a); }
  band() { const d = this.dist; return d < 64 ? 'close' : d <= 160 ? 'good' : d <= 220 ? 'far' : 'lost'; }
  tick(dt) {
    if (this.done) return; const M = this.M, a = this.a, P = M.P;
    if (this.cool > 0) this.cool -= dt;
    // his route and his tricks
    if (this.act) {
      this.act.t -= dt; const k = this.act.kind;
      if (k === 'lookBack') { a.vx = a.vy = 0; a.faceGoal = this.act.dir; a.fov = 2.2; }
      else if (k === 'window' || k === 'phoneStop' || k === 'wait') { a.vx = a.vy = 0; a.reflect = k === 'window'; a.pose = k === 'phoneStop' ? 'phone' : k === 'wait' ? 'lean' : null; if (k === 'phoneStop') a.doAct('payphone', .5); }
      if (this.act.t <= 0) { a.faceGoal = null; a.fov = 1.5; a.reflect = false; a.pose = null; this.act = null; }
    } else if (!a.goal) {
      const w = this.wp[this.i]; if (!w) { this.finish(); return; }
      const sp = a.cutting ? 70 : 46;
      a.goTo(w.x, w.y, sp, () => {
        const ac = this.acts[this.i]; a.cutting = false;
        if (this.R.checkpoints.includes(this.i)) { this.save(); this.cp++; if (!Globals.attract) Toast('Checkpoint', 'If you lose him, you pick it up from here.', 2); }
        this.i++;
        if (ac) {
          const [kind, n] = ac;
          if (kind === 'doubleBack') { const back = this.wp[this.i - 2] || w, d = Math.hypot(back.x - w.x, back.y - w.y) || 1; a.goTo(w.x + (back.x - w.x) / d * (n || 48), w.y + (back.y - w.y) / d * (n || 48), 50, () => { this.i = Math.max(this.i, 1); }); }
          else if (kind === 'cutThrough') a.cutting = true;
          else this.act = { kind, t: kind === 'lookBack' ? 2.5 : n || 3, dir: a.facing + Math.PI };
        }
        if (this.i >= this.wp.length) this.finish();
      });
    }
    // the distance band and the losing timer
    const d = this.dist, seen = (World.cur || World.map).sight(P, a) && d < 240;
    if (d > 220 || !seen) { this.lose += dt; if (this.lose > this.lostAt) return this.fail('lost'); } else this.lose = Math.max(0, this.lose - dt * 2);
    P.tooClose = o => o === a && d < 64;
    const stopped = this.act && ['lookBack', 'window', 'wait', 'phoneStop'].includes(this.act.kind);
    P.loiter = stopped && P.still > .3 && P.still < 3.5 && !P.inCover ? 1.8 : 0;
    if (stopped && P.still > .5 && tip('mirror')) Tut.say('Don\'t stop when he stops', 'When he stops, keep walking or take cover. Standing still when he does is what a tail looks like.');
    // the partner shadows on a parallel street, and takes the eye on △
    const L = M.partner;
    if (L && !L.isPlayer) { L.shadowT = (L.shadowT || 0) - dt; if (L.shadowT <= 0) { L.shadowT = 2; const side = a.facing + Math.PI * .66, tx = a.x + Math.cos(side) * 150, ty = a.y + Math.sin(side) * 150, w = World.walkableNear(tx, ty); L.goTo(w.x, w.y, 60); } }
    if (L && M.ctl.pressed('partner')) this.handoff();
    if (a.minds[P.id] && a.minds[P.id].state === 'alert') return this.fail('made');
  }
  canHandoff() { const L = this.M.partner, a = this.a; if (!L || this.cool > 0) return false; const m = a.minds[L.id]; return dist2(L, a) < 200 && (!m || m.level < .3); }
  handoff() {
    const M = this.M; if (!this.canHandoff()) { Toast(nameOf(M.partner.person), this.cool > 0 ? 'Give it a minute.' : 'I\'m not close enough. Keep him.'); return; }
    const old = M.P, L = M.partner; old.isPlayer = false; L.isPlayer = true; old.watching = false; M.P = L; M.partner = old; this.cool = 20; this.handoffs++;
    L.stop(); old.vx = old.vy = 0; const away = World.walkableNear(old.x - Math.cos(this.a.facing) * 80, old.y - Math.sin(this.a.facing) * 80); old.goTo(away.x, away.y, 52);
    Talk.radio(L.person, L.person === 'lou' ? 'I got him. Peel off.' : 'I have the eye.', 2.2); Snd.play('radio'); bus.emit('handoff', { to: L.person });
  }
  fail(why) {
    const M = this.M; if (M.failing) return; this.a.stop(); this.act = null;
    if (why === 'made') { Meters.add('heat', 10, 'He made the tail'); STATE.stats.made++; } else Meters.add('brass', -5, 'Lost him on the street');
    M.fail(why === 'made' ? 'He made you' : 'You lost him', why === 'made' ? 'He looked right at you and knew.' : 'Somewhere around ' + placeName(this.a.x, this.a.y) + ', he was just gone.', { fn: () => this.restore(), sub: 'From the last checkpoint (Brass -5 or Heat +10)' });
  }
  finish() { if (this.done) return; this.done = true; this.a.stop(); STATE.stats.tails++; if (this.o.onDone) this.o.onDone(); }
  hudBar() { const d = this.dist, b = this.band(); return { label: 'Distance' + (this.lose > 0 ? ' · LOSING HIM ' + Math.ceil(this.lostAt - this.lose) : ''), value: Math.round(clamp(220 - Math.abs(d - 112) * 1.6, 0, 220)), max: 220, color: b === 'good' ? '#9ae89a' : b === 'close' ? '#ff5a4a' : '#ffb347' }; }
}
