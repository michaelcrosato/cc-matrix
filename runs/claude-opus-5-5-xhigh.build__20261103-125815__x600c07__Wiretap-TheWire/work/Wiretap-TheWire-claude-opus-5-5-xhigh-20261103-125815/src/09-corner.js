/* 09-corner: the CornerSim. One corner economy for story missions, Tee's night shifts, versus and attract. Sales are
   choreographed (pay the money man, the runner fetches from the stash, the hand-off at the vacant), every one of them an
   evidentiary act with a window a camera can catch. Ledger invariants: vials and cash are conserved. */
const CORNER = {
  lt: [30.5, 32.1], money: [30.45, 33.3], muscle: [30.3, 34.4], runner: [30.6, 31.2], tout: [30.6, 30.45], stashman: [30.35, 36.6], handoff: [30.45, 35.5], pay: [31.25, 33.3],
  stash: { v1412: { x: W(27.4), y: W(36.3), label: 'the 1412 vacant, behind the radiator' }, trashGate: { x: W(19), y: 44.2 * T, label: 'the trash can by the court gate' }, buick: { x: W(32.3), y: W(39.6), label: 'the wheel well of the dead Buick' } },
  lookouts: { pigeon: { x: W(34.4), y: W(36.3), z: 40, facing: Math.PI, range: 190 }, moe: { route: [[33.6, 30.6], [33.6, 42.5], [24, 42.5], [33.6, 42.5]] }, third: { x: W(29.5), y: W(26.6), facing: Math.PI / 2, range: 150 } },
  reup: { gas: { x: W(62.5), y: W(48.5) }, garage: { x: W(52.5), y: W(50.5) } }
};
const TOUT_BARKS = ['Overtime! Got that Overtime!', 'Orange tops, orange tops!', 'Overtime, y\'all! It\'s fire!', 'Got that orange, got that orange!', 'Testers at five, testers!'];
const CUST_BARKS = ['Y\'all open?', 'Lemme get two.', 'Gimme three.', 'Y\'all got the orange?', 'I\'m good for it.'];
const WARN_BARKS = ['Five-oh!', 'Hoppers up!', 'Knockers! Knockers!', 'Yo! Yo! Five-oh!'];
class CornerSim {
  constructor(o = {}) {
    this.o = o; this.rate = o.rate || .12; this.night = !!o.night; this.fresh = o.fresh || 1;
    this.crew = []; this.customers = []; this.queue = []; this.open = o.open !== false; this.shutT = 0; this.allClear = 0; this.quietT = 0;
    this.stashSpot = o.stash || STATE.crew.stash || 'v1412'; this.vials = o.vials || 80; this.L = { start: this.vials, reups: 0, sold: 0, seized: 0, taken: 0, banked: 0, onMoney: 0, seizedCash: 0, carried: 0 };
    this.reupAt = o.reupAt || 30; this.reupPending = 0; this.autoReup = o.autoReup !== false; this.events = []; this.toutT = 3; this.cars = []; this.patrolT = 20 + RNG.sim() * 30;
    this.ltHuman = !!o.ltHuman; this.runnerHuman = !!o.runnerHuman; this.paused = false; this.custN = 0; this.sales = 0; this.custMax = o.custMax || 6;
    this.build(o.roster || ['tee', 'rook', 'corey', 'dink', 'tavon', 'tout', 'pigeon', 'moe']);
  }
  get stash() { return CORNER.stash[this.stashSpot] || CORNER.stash.v1412; }
  get lt() { return this.byRole('lieutenant'); } get runner() { return this.byRole('runner'); } get moneyman() { return this.byRole('money'); }
  byRole(r) { return this.crew.find(a => a.role === r && !a.gone); }
  spot(k) { const s = CORNER[k]; return { x: s[0] * T, y: s[1] * T }; }
  build(roster) {
    const roles = { tee: 'lieutenant', rook: 'muscle', corey: 'stash', dink: 'money', tavon: 'runner', tout: 'tout', pigeon: 'lookout', moe: 'lookout', third: 'lookout' };
    for (const entry of roster) {
      const [id, over] = entry.split(':'), role = over || roles[id] || 'tout', person = ['tout', 'third'].includes(id) ? null : id;
      const a = new Agent({ id: 'crew:' + id, person, role, seed: hashStr(id) });
      a.crewId = id; a.home = null;
      if (role === 'lieutenant') a.home = this.spot('lt'); else if (role === 'muscle') a.home = this.spot('muscle'); else if (role === 'money') a.home = this.spot('money');
      else if (role === 'runner') a.home = this.spot('runner'); else if (role === 'tout') a.home = this.spot('tout'); else if (role === 'stash') a.home = this.stashHome();
      if (id === 'pigeon' && role === 'lookout') { const L = CORNER.lookouts.pigeon; a.home = { x: L.x, y: L.y }; a.body.z = L.z; a.watcher = true; a.range = L.range; a.fov = 1.9; a.facing = L.facing; a.roof = true; a.light = true; }
      else if (id === 'moe' && role === 'lookout') { a.watcher = true; a.range = 150; a.fov = 1.8; a.bike = true; a.walkSpeed = 62; a.routeI = 0; const p = CORNER.lookouts.moe.route[0]; a.home = { x: W(p[0] - .5), y: W(p[1] - .5) }; }
      else if (id === 'third') { const L = CORNER.lookouts.third; a.home = { x: L.x, y: L.y }; a.watcher = true; a.range = L.range; a.fov = 1.7; a.facing = L.facing; }
      else { a.range = 100; a.fov = 1.6; }
      a.place(a.home.x, a.home.y); if (a.roof) a.body.z = 40;
      this.crew.push(a);
    }
  }
  stashHome() { const s = this.stash; return this.stashSpot === 'v1412' ? this.spot('stashman') : { x: s.x + 10, y: s.y + 8 }; }
  addThird() { if (!this.crew.some(a => a.crewId === 'third')) this.build(['third']); }
  remove(id) { const a = this.crew.find(c => c.crewId === id); if (a) { a.gone = true; this.crew = this.crew.filter(c => c !== a); } }
  moveStash(spot) {
    if (!CORNER.stash[spot]) return; this.stashSpot = spot; STATE.crew.stash = spot;
    const s = this.byRole('stash'); if (s) { s.home = this.stashHome(); s.goTo(s.home.x, s.home.y, 60); }
    bus.emit('stashMoved', { spot });
  }
  /** "5-0!": sales freeze, the runner stashes what he carries, everyone acts like nothing */
  shut(reason, secs = 20, who) {
    if (!this.open && this.shutT > 0) { this.shutT = Math.max(this.shutT, secs); return; }
    this.open = false; this.shutT = secs; this.allClear = 0;
    const w = who || this.crew.find(a => a.watcher) || this.lt; if (w) w.say(pick(RNG.sim, WARN_BARKS), 2.4).loud = true;
    Snd.whistle();
    for (const a of this.crew) {
      if (a.role !== 'runner' || this.runnerHuman) continue;
      // the order he was filling waits for the reopen: the paid customers go back to the front of the line
      if (Array.isArray(a.job)) this.queue.unshift(...a.job.filter(c => !c.served && !c.gone && c.st !== 'leave' && !this.queue.includes(c)));
      a.job = null; a.pose = null;
      if (a.carrying) { const n = a.carrying; a.goTo(this.stash.x, this.stash.y, 70, () => { this.vials += n; this.L.carried -= n; a.carrying = 0; a.goTo(a.home.x, a.home.y); }); }
    }
    for (const a of this.crew) if (!a.goal && !a.roof && !a.bike) a.pose = pick(RNG.sim, ['phone', 'lean', 'crouch', 'hips', null]);
    bus.emit('shut', { reason });
  }
  reopen() { if (this.open) return; this.open = true; this.shutT = 0; for (const a of this.crew) if (!a.roof) a.pose = null; const t = this.byRole('tout'); if (t) t.say('We open! We open!', 2); bus.emit('open', {}); }
  /** customers: Poisson arrivals at the corner */
  spawnCustomer() {
    const r = RNG.sim, z = Crowd.zone, ends = [[20, 30.5], [44, 30.5], [33.6, 44], [30.4, 44.4], [24, 30.5], [33.6, 26.5]].filter(p => !z || (p[0] > z[0] && p[0] < z[2] && p[1] > z[1] && p[1] < z[3])), e = pick(r, ends);
    const c = new Agent({ seed: (hashStr('cust') + this.custN++ * 977) >>> 0, x: W(e[0]), y: W(e[1]), walk: 34 + r() * 10, role: 'customer' });
    c.rig.o.hunch = Math.max(c.rig.o.hunch || 0, .22); c.n = 1 + Math.floor(r() * 3); c.st = 'arrive'; c.wait = 0; c.from = { x: W(e[0]), y: W(e[1]) };
    const pay = this.spot('pay'); c.goTo(pay.x + (r() - .5) * 8, pay.y + (r() - .5) * 10, c.walkSpeed, () => { c.st = 'atPay'; c.faceTo(this.moneyman || pay); });
    if (r() < .5) c.say(pick(r, CUST_BARKS), 2.5);
    this.customers.push(c); return c;
  }
  leave(c) { c.st = 'leave'; c.goTo(c.from.x, c.from.y, c.walkSpeed, () => { c.gone = true; }); }
  tick(dt, police = []) {
    if (this.paused) return;
    const r = RNG.sim;
    // all clear after 20 s with no police in any lookout's view
    if (!this.open && this.shutT > 0) {
      const watched = police.some(p => !p.hidden && this.crew.some(a => a.watcher && E.sees(a, p, { map: World.map, range: a.range, fov: a.fov, facing: a.facing }).seen)) || this.cars.some(c => c.police && this.sees(c));
      if (!watched) this.allClear += dt; else this.allClear = 0;
      this.shutT -= dt;
      if (this.o.versus && !this.manual) { if (this.shutT <= 0) this.reopen(); }   // versus: a called shutdown lasts its time; the lieutenant decides, not the street
      else if (this.allClear > 20 && !this.manual) { this.shutT = 0; this.reopen(); }
      else if (this.shutT <= 0 && !this.manual) { if (!watched) this.reopen(); else this.shutT = 3; }
    }
    // arrivals
    const lam = this.open ? this.rate * (this.o.versus ? 1 : (this.night ? 1.2 : 1) * this.fresh) : 0;
    if (this.customers.filter(c => c.st !== 'leave').length < this.custMax && r() < lam * dt && this.vials > 0) this.spawnCustomer();
    // the tout calls the brand
    const tout = this.byRole('tout'); if (tout && this.open && (this.toutT -= dt) <= 0 && !(tout.quietT > 0)) { tout.say(pick(r, TOUT_BARKS), 2.4); this.toutT = 6 + r() * 5; }
    for (const a of this.crew) if (a.quietT > 0) a.quietT -= dt;
    // customers
    const mm = this.moneyman, run = this.runner, stashman = this.byRole('stash'), fast = this.o.busy ? .6 : 1;
    for (const c of this.customers) {
      c.update(dt);
      if (c.st === 'atPay') {
        if (!this.open) { c.wait += dt; if (c.wait > 15) this.leave(c); continue; }
        if (mm && !mm.busy && dist2(mm, c) < 30) {
          mm.busy = true; c.st = 'paying'; mm.faceTo(c); c.faceTo(mm); mm.doAct('sale-money', 2 * fast, c); c.doAct('sale-money', 2 * fast, mm); mm.pose = 'reach';
          game.after(2 * fast, () => { mm.busy = false; mm.pose = null; const cash = c.n * 10; this.L.taken += cash; this.L.onMoney += cash; c.st = 'toHandoff'; this.queue.push(c);
            const h = this.spot('handoff'); c.goTo(h.x + 6, h.y + (r() - .5) * 6, c.walkSpeed, () => { c.st = 'waitProduct'; c.wait = 0; });
            bus.emit('sale-money', { c, cash }); });
        } else if (mm && !mm.busy) { c.goTo(mm.x + 10, mm.y + 2, c.walkSpeed, () => { c.st = 'atPay'; }); c.st = 'arrive'; }
      } else if (c.st === 'waitProduct') { if (this.open) c.wait += dt; if (c.wait > 50 && !this.runnerHuman && !c.served) { this.queue = this.queue.filter(q => q !== c); this.leave(c); } }
    }
    // the runner fetches from the stash for up to three who paid, then hands off to each in turn
    if (run && !this.runnerHuman && !run.job && this.queue.length && this.open && this.vials > 0) {
      const batch = this.queue.splice(0, this.o.busy ? 4 : 3), s = this.stash, rs = this.o.versus || this.o.busy ? 90 : 64; run.job = batch;
      run.goTo(s.x + 8, s.y + 4, rs, () => {
        const sm = stashman && dist2(stashman, s) < 60 ? stashman : null;
        run.doAct('stash-access', 1.4 * fast); if (sm) { sm.faceTo(run); sm.doAct('stash-access', 1.4 * fast); sm.pose = 'reach'; }
        game.after(1.4 * fast, () => {
          if (sm) sm.pose = null; let n = 0; for (const c of batch) { c.take = Math.min(c.n, this.vials - n); n += c.take; }
          this.vials -= n; this.L.carried += n; run.carrying = n;
          const next = () => { const c = batch.find(x => !x.served && !x.gone && x.st !== 'leave'); if (!c || !run.carrying) { if (run.carrying) { this.vials += run.carrying; this.L.carried -= run.carrying; run.carrying = 0; } run.job = null; run.goTo(run.home.x, run.home.y); return; }
            run.goTo(c.x - 6, c.y, rs, () => this.handoff(run, c, next)); };
          next();
        });
      });
    }
    // the money walks to the lieutenant every $300
    if (mm && !mm.busy && this.L.onMoney >= (this.o.busy ? 500 : 300) && this.lt && !this.lt.busy) {
      const lt = this.lt; mm.busy = true; const amt = this.L.onMoney;
      mm.goTo(lt.x + 6, lt.y + 6, 46, () => { mm.faceTo(lt); lt.faceTo(mm); mm.doAct('count-handoff', 2.2, lt); lt.doAct('count-handoff', 2.2, mm); lt.pose = 'count';
        game.after(2.2, () => { this.L.onMoney -= amt; this.L.banked += amt; lt.pose = null; mm.busy = false; mm.goTo(mm.home.x, mm.home.y); bus.emit('count-handoff', { amt }); }); });
    }
    // re-up
    if (this.vials < this.reupAt && !this.reupPending && this.autoReup) { this.reupPending = this.o.reupDelay || 45; bus.emit('reupNeeded', {}); }
    if (this.reupPending > 0 && this.autoReup) { this.reupPending -= dt; if (this.reupPending <= 0) this.reupArrive(this.o.reupSize || 80); }
    // crew idles, Moe rides, Pigeon keeps his birds
    for (const a of this.crew) {
      if (a.bike && !a.goal && !a.locked) { const R = CORNER.lookouts.moe.route; a.routeI = (a.routeI + 1) % R.length; const p = R[a.routeI]; a.goTo(W(p[0] - .5), W(p[1] - .5), 62); }
      if (!a.goal && a.home && !a.busy && !a.job && !a.bike && !a.locked && !a.ltHuman && dist2(a, a.home) > 14) a.goTo(a.home.x, a.home.y, 40);
      if (!a.goal && !a.busy && a.role === 'lookout' && a.roof && !a.faceGoal) a.facing = CORNER.lookouts.pigeon.facing + Math.sin(game.time * .3 + a.uid) * .7;
      if (a === this.lt && this.ltHuman) continue;
      a.update(dt);
    }
    this.customers = this.customers.filter(c => !c.gone);
    // police cars in a lookout's view shut it down
    for (const car of this.cars) { car.tick(dt); if (car.police && this.open && this.sees(car)) this.shut('car', 20); }
    this.cars = this.cars.filter(c => !c.done);
    if (this.o.patrols) { this.patrolT -= dt; if (this.patrolT <= 0) { this.patrolT = 60 + r() * 30; this.cars.push(new Car('patrol', PATROL_LOOP(), 70, { police: true, laps: 1 })); } }
  }
  handoff(run, c, next) {
    c.served = true;
    if (c.gone || c.st === 'leave') { if (next) next(); return; }
    const k = this.o.busy ? .7 : 1; run.faceTo(c); c.faceTo(run); run.doAct('sale-product', 1.4 * k, c); c.doAct('sale-product', 1.4 * k, run); run.pose = 'reach';
    game.after(1.4 * k, () => { const n = Math.min(run.carrying || 0, c.take || c.n); run.carrying -= n; this.L.carried -= n; this.L.sold += n; this.sales++; run.pose = null; this.leave(c); bus.emit('sale', { c, n }); if (next) next(); });
  }
  reupArrive(n) { this.vials += n; this.L.reups += n; this.reupPending = 0; bus.emit('reup', { n }); }
  /** a human runner (versus, Tee's orders) picks up and hands off */
  humanPickup(a) { const n = Math.min(3, this.vials); if (n <= 0 || dist2(a, this.stash) > 28) return 0; this.vials -= n; this.L.carried += n; a.carrying = (a.carrying || 0) + n; a.doAct('stash-access', 1.4); return n; }
  humanHandoff(a) {
    const c = this.customers.find(x => (x.st === 'waitProduct' || x.st === 'toHandoff') && dist2(x, a) < 26); if (!c || !a.carrying) return false;
    const n = Math.min(a.carrying, c.n); a.carrying -= n; this.L.carried -= n; this.L.sold += n; this.sales++; a.doAct('sale-product', 1.4, c); c.doAct('sale-product', 1.4, a); this.queue = this.queue.filter(q => q !== c); this.leave(c); bus.emit('sale', { c, n, by: a }); return true;
  }
  /** what police take off a frisked crew member */
  seize(a) {
    let vials = 0, cash = 0;
    if (a.carrying) { vials = a.carrying; this.L.carried -= vials; this.L.seized += vials; a.carrying = 0; }
    if (a.role === 'money' && this.L.onMoney > 0) { cash = this.L.onMoney; this.L.onMoney = 0; this.L.seizedCash += cash; }
    return { vials, cash };
  }
  ledgerOK() { const L = this.L; return L.start + L.reups - L.sold - L.seized === this.vials + L.carried && L.taken === L.banked + L.onMoney + L.seizedCash; }
  sees(car) { return this.crew.some(a => a.watcher && !a.hidden && Math.hypot(car.x - a.x, car.y - a.y) < a.range + 20 && Math.abs(angDiff(a.facing, Math.atan2(car.y - a.y, car.x - a.x))) < a.fov / 2 + .3 && World.map.los(a.x, a.y, car.x, car.y)); }
  all() { return this.crew.concat(this.customers); }
  draw(r, listener) {
    for (const a of this.crew) drawAgent(r, a);
    for (const c of this.customers) drawAgent(r, c, { bg: true });
    for (const c of this.cars) c.draw(r);
    // a stash being worked shows nothing: the camera has to catch it
  }
}
/* ---- cars that drive the lanes: patrol loops, knockers, the bus, the Harstad truck, Sunday's hearse ---- */
const PATROL_LOOP = () => new E.Path([[7.5 * T, 28.5 * T], [57.5 * T, 28.5 * T], [57.5 * T, 13.5 * T], [7.5 * T, 13.5 * T]], { closed: true });
class Car {
  constructor(shape, path, speed, o = {}) { this.shape = shape; this.path = path; this.speed = speed; this.d = o.d || 0; this.o = o; this.police = !!o.police; this.stopAt = o.stopAt; this.mats = o.mats; const p = path.at(this.d); this.x = p.x; this.y = p.y; this.facing = p.angle; this.wait = 0; this.lights = !!o.lights; }
  tick(dt) {
    if (this.wait > 0) { this.wait -= dt; return; }
    if (this.parked) return;
    this.d += this.speed * dt;
    if (this.stopAt != null && this.d >= this.stopAt) { this.d = this.stopAt; this.stopAt = null; this.parked = !this.o.go; if (this.o.onStop) this.o.onStop(this); }
    if (!this.path.closed && this.d >= this.path.length) { this.done = !this.o.stay; this.d = this.path.length; if (!this.ended) { this.ended = true; if (this.o.onEnd) this.o.onEnd(this); } }
    if (this.path.closed && this.o.laps && this.d >= this.path.length * this.o.laps) this.done = true;
    const p = this.path.at(this.d); this.x = p.x; this.y = p.y; this.facing = p.angle;
  }
  go() { this.parked = false; }
  draw(r) {
    if (!r.visible(this.x, this.y, 0, 90, 90, 90)) return;
    r.shape(this.shape, this.x, this.y, 0, { facing: this.facing, mats: this.mats });
    if (this.lights) { const on = Math.floor(game.real * 4) % 2; game.lights.add(this.x, this.y, 18, 70, .9, { color: on ? '#ff3030' : '#3060ff' }); }
    if (World.dark && this.shape !== 'burnedcar') game.lights.add(this.x + Math.cos(this.facing) * 26, this.y + Math.sin(this.facing) * 26, 6, 40, .7, { color: '#fff0c0' });
  }
}
