// WIRETAP: the corner (crew side). One CornerSim runs the story's corner, Tee's nights, versus and attract: roles,
// customers, the sale cycle (money, runner, stash, hand-to-hand), the count, re-ups, shutdowns ("5-0!") and police
// pressure (the patrol car, the knockers). Its ledger always balances.
const TOUT = ['Overtime! Got that Overtime!', 'Orange tops, orange tops!', 'Overtime, y\'all. It\'s back.', 'Testers on the corner later.'];
const CUSTOMER = ['Y\'all open?', 'Lemme get two.', 'Just one. I\'m short.', 'You got that Overtime?', 'Come on, man, I been waiting.'];
const WARN = ['Five-oh!', 'Hoppers up!', 'Knockers! Knockers!', 'Shut it down!'];
const IDLE_CIV = ['Twenty-two bus late again.', 'Orioles ain\'t got no bullpen.', 'Hot for October.', 'You see what they did to Mr. Felton?', 'My cousin got a job at the port.', 'Rent went up again.'];
const SPAWNS = [[10, 28.5], [55, 27.5], [31.5, 16], [32.5, 44], [25, 21], [40, 30.6]];
class CornerSim {
  constructor(o = {}) {
    this.o = Object.assign({ rate: .12, night: false, mode: 'story', stash: 'v1412', vials: 120, crew: ['tee', 'rook', 'corey', 'dink', 'tavon', 'pigeon', 'moe'], player: null, third: false }, o);
    this.rnd = o.rnd || RNG.sim; this.agents = []; this.crew = {}; this.customers = []; this.t = 0; this.shut = 0; this.shutWhy = ''; this.toutT = 3; this.spawnT = 2; this.reupT = 0;
    this.led = { start: this.o.vials, vials: this.o.vials, sold: 0, seized: 0, taken: 0, banked: 0, cash: 0, seizedCash: 0, reups: 0, added: 0 };
    this.acts = []; this.police = []; this.patrol = null; this.knock = null; this.calls = 0; this.queue = [];
    const place = { tee: [30.2, 31.2], rook: [31.2, 33.4], corey: [29.2, 36.4], dink: [30.4, 32.4], tavon: [30.6, 34.2], pigeon: [35.5, 36.5, 40], moe: [33.4, 30.6], kid3: [30.4, 26.6] };
    const roles = { tee: 'lieutenant', rook: 'muscle', corey: 'stash', dink: 'money', tavon: 'runner', pigeon: 'lookout', moe: 'lookout', kid3: 'lookout' };
    const list = this.o.crew.concat(this.o.third ? ['kid3'] : []);
    for (const id of list) {
      if (this.o.player && this.o.player.person === id) { this.crew[roles[id]] = this.o.player; continue; }
      const [cx, cy, z] = place[id], p = C(cx, cy);
      const a = new Agent({ id, person: CAST[id] ? id : null, role: roles[id], x: p.x, y: p.y, z: z || 0, seed: 77, watcher: roles[id] === 'lookout' || id === 'tee' || id === 'rook',
        range: id === 'pigeon' ? 230 : roles[id] === 'lookout' ? 170 : 120, fov: id === 'pigeon' ? 2.4 : 1.7, kind: id === 'kid3' ? 'kid' : 'crew' });
      a.home = { x: p.x, y: p.y }; a.facing = id === 'pigeon' ? Math.PI * .75 : Math.PI / 2;
      this.agents.push(a); if (roles[id] === 'lookout') (this.crew.lookouts = this.crew.lookouts || []).push(a); else this.crew[roles[id]] = a;
    }
    this.setStash(this.o.stash);
  }
  setStash(id) {
    this.o.stash = id; const at = { v1412: [28.4, 36.4], trashGate: [19.5, 44.6], buick: [31.4, 40.2] }[id] || [28.4, 36.4];
    this.stashAt = C(at[0], at[1]);
    const s = this.crew.stash; if (s && s.goTo) { s.home = { x: this.stashAt.x + 8, y: this.stashAt.y }; s.goTo(s.home.x, s.home.y, 60); }
  }
  get open() { return this.shut <= 0; }
  watchers() { return this.agents.filter(a => a.watcher); }
  /** "5-0!": sales freeze, product goes back, everyone idles innocently */
  shutdown(why = 'police', secs = 20) {
    const was = this.shut > 0; this.shut = Math.max(this.shut, secs); this.shutWhy = why;
    if (!was) { const l = (this.crew.lookouts || [])[0] || this.crew.lieutenant; if (l && l.say) l.say(WARN[Math.floor(this.rnd() * WARN.length)]); sfx('whistle'); BUS.emit('shutdown', why); }
  }
  openUp() { if (this.shut > 0) { this.shut = 0; BUS.emit('open'); const t = this.crew.lieutenant; if (t && t.say) t.say('We good. Open up.'); } }
  spawnCustomer() {
    const s = SPAWNS[Math.floor(this.rnd() * SPAWNS.length)], p = C(s[0], s[1]), seed = Math.floor(this.rnd() * 1e6);
    const c = new Agent({ id: 'cu' + seed, x: p.x, y: p.y, seed, kind: this.rnd() < .5 ? 'fiend' : 'civ', speed: 40 + this.rnd() * 12 });
    c.cust = { n: 1 + Math.floor(this.rnd() * 3), state: 'in', wait: 0, exit: p, paid: 0 };
    const q = this.queue.length, qp = C(31.4 + (q % 2) * .8, 31.6 + Math.floor(q / 2) * .7);
    c.goTo(qp.x, qp.y, null, () => { c.cust.state = 'queue'; c.facing = Math.PI; if (this.rnd() < .4) c.say(CUSTOMER[Math.floor(this.rnd() * CUSTOMER.length)]); });
    this.queue.push(c); this.customers.push(c); this.agents.push(c);
  }
  leave(c) { c.cust.state = 'out'; this.queue = this.queue.filter(q => q !== c); c.goTo(c.cust.exit.x, c.cust.exit.y, 50, () => { c.gone = true; }); }
  act(a, name, t) { if (a.doAct) a.doAct(name, t, name === 'sale-money' || name === 'count-handoff' ? 'count' : name === 'payphone' ? 'phone' : null); this.acts.push({ who: a.id, act: name, t: this.t, at: { x: a.x, y: a.y } }); if (this.acts.length > 40) this.acts.shift(); BUS.emit('act', a, name); }
  update(dt, ctx = {}) {
    this.t += dt; const night = this.o.night, rate = this.o.rate * (night && this.o.mode !== 'versus' ? 1.2 : 1);
    if (this.shut > 0) { this.shut -= dt * (ctx.policeSeen ? 0 : 1); if (this.shut <= 0) this.openUp(); }
    // customers arrive (Poisson), not while it's shut
    if (this.open) { this.spawnT -= dt; if (this.spawnT <= 0) { this.spawnT = -Math.log(1 - this.rnd()) / rate; if (this.customers.length < 12) this.spawnCustomer(); } }
    const money = this.crew.money, runner = this.crew.runner, stash = this.crew.stash, lt = this.crew.lieutenant;
    for (const c of this.customers) {
      if (c.cust.state === 'queue') { c.cust.wait += dt; if (!this.open && c.cust.wait > 15) this.leave(c); }
    }
    // the sale cycle
    const head = this.queue.find(c => c.cust.state === 'queue');
    if (this.open && head && money && !money.act && !this.sale && this.led.vials >= head.cust.n) {
      this.sale = { c: head, step: 'money', t: 2 }; head.cust.state = 'buying'; head.facing = angTo(head, money); money.facing = angTo(money, head); this.act(money, 'sale-money', 2);
      if (this.rnd() < .3 && head.say) head.say(CUSTOMER[Math.floor(this.rnd() * CUSTOMER.length)]);
    }
    if (this.sale) this.saleStep(dt, money, runner, stash);
    // the count: the money walks the cash to the lieutenant every $300
    if (money && this.led.cash >= 300 && !this.sale && !money.act && lt && !this.counting) {
      this.counting = true; const back = money.home;
      if (lt.goTo === undefined) { this.act(money, 'count-handoff', 2); this.bank(); this.counting = false; }
      else money.goTo(lt.x + 8, lt.y, 50, () => { this.act(money, 'count-handoff', 2); if (lt !== this.o.player && lt.doAct) lt.doAct('count-handoff', 2, 'count'); this.bank(); money.goTo(back.x, back.y, 50); this.counting = false; });
    }
    // the lieutenant works the payphone now and then (story corner; Tee's own when played)
    if (lt && lt !== this.o.player && lt.goTo && !lt.goal && !lt.act && this.o.mode !== 'versus') {
      lt.phoneT = (lt.phoneT || 25) - dt;
      if (lt.phoneT <= 0 && this.o.payphones !== false) { lt.phoneT = 60 + this.rnd() * 40; const pp = C(POI.P1[0], POI.P1[1] + .7); lt.goTo(pp.x, pp.y, 46, () => { this.act(lt, 'payphone', 5); lt.facing = -Math.PI / 2; lt.onAct = () => { lt.onAct = null; lt.goTo(lt.home.x, lt.home.y, 46); }; this.calls++; BUS.emit('payphone', lt, 'P1'); }); }
    }
    // re-up below 30 vials: the package comes in 40 s later
    if (this.led.vials < 30 && this.reupT <= 0 && this.o.autoReup !== false) { this.reupT = 40; BUS.emit('reupCalled'); }
    if (this.reupT > 0) { this.reupT -= dt; if (this.reupT <= 0) this.reup(100); }
    // touts and idles
    this.toutT -= dt;
    if (this.toutT <= 0) { this.toutT = 4 + this.rnd() * 5; const t = runner && !runner.act && !runner.goal ? runner : null; if (this.open && t && t.say) t.say(TOUT[Math.floor(this.rnd() * TOUT.length)]); }
    for (const a of this.agents) {
      if (a.role && a.home && !a.goal && !a.act && a !== this.o.player) {
        a.pose = !this.open ? (a.role === 'muscle' ? 'dice' : a.role === 'runner' ? 'lean' : a.role === 'money' ? 'phone' : null) : a.role === 'lookout' && a.z > 1 ? null : a.pose;
        if (dist(a, a.home) > 10 && a.z < 1 && !this.sale) a.goTo(a.home.x, a.home.y, 46);
      }
      // idle crew look around: up the block, at the street, at the corner (a photo needs them to look your way)
      if (a.role && a.role !== 'lookout' && a.z < 1 && !a.goal && !a.act && a !== this.o.player) {
        a.lookT = (a.lookT || 0) - dt;
        if (a.lookT <= 0) { a.lookT = 3 + this.rnd() * 4; const opts = a.role === 'stash' ? [0, -Math.PI / 2, -Math.PI * .75, Math.PI / 2] : [-Math.PI / 2, -Math.PI * .75, Math.PI, 0, Math.PI / 2, -Math.PI / 4]; a.lookAt = opts[Math.floor(this.rnd() * opts.length)]; }
        if (a.lookAt !== undefined) a.facing = E.approachAng(a.facing, a.lookAt, dt * 3);
      }
      if (a.role === 'lookout' && a.z > 1) a.facing = -Math.PI / 2 - .4 + Math.sin(this.t * .4 + a.x) * 1.1;   // the roof lookout sweeps Ridley and Gaither
      a.update(dt);
    }
    // police pressure: the patrol car's loop, the knockers
    this.updatePolice(dt, ctx);
    this.customers = this.customers.filter(c => !c.gone); this.agents = this.agents.filter(a => !a.gone);
  }
  saleStep(dt, money, runner, stash) {
    const s = this.sale; if (!this.open && s.step !== 'hand') { if (runner) runner.carrying = 0; s.c.cust.state = 'queue'; s.c.cust.wait = 0; s.c.cust.credit = (s.c.cust.credit || 0) + (s.step === 'money' ? 0 : s.c.cust.paid); this.sale = null; return; }
    if (s.step === 'money') { if (!money.act) { const amt = Math.max(0, s.c.cust.n * 10 - (s.c.cust.credit || 0)); s.c.cust.credit = 0; this.led.cash += amt; this.led.taken += amt; s.c.cust.paid = s.c.cust.n * 10; s.step = 'fetch';
        if (runner && runner.goTo) runner.goTo(this.stashAt.x + 12, this.stashAt.y, 62, () => { s.step = 'stash'; if (stash && stash.doAct) { stash.facing = angTo(stash, runner); this.act(stash, 'stash-access', 1.2); } s.wait = 1.2; });
        else s.step = 'stash', s.wait = .5; } }
    else if (s.step === 'stash') { s.wait -= dt; if (s.wait <= 0) { if (runner) runner.carrying = s.c.cust.n; s.step = 'walk'; const hp = C(POI.handoff[0], POI.handoff[1]);
        s.c.goTo(hp.x + 8, hp.y, 44); if (runner && runner.goTo) runner.goTo(hp.x, hp.y, 62, () => { s.step = 'hand'; s.wait = 0; }); else s.step = 'hand'; } }
    else if (s.step === 'hand') { if (!s.c.goal || dist(s.c, runner || s.c) < 14) { if (!s.handing) { s.handing = true; if (runner) { runner.facing = angTo(runner, s.c); this.act(runner, 'sale-product', 1.5); } this.act(s.c, 'sale-product', 1.5); s.wait = 1.5; }
        s.wait -= dt; if (s.wait <= 0) { const n = s.c.cust.n; this.led.vials -= n; this.led.sold += n; if (runner) runner.carrying = 0; this.leave(s.c); this.sale = null; BUS.emit('sale', n);
          if (runner && runner.goTo) runner.goTo(runner.home.x, runner.home.y, 50); } } }
  }
  bank() { this.led.banked += this.led.cash; this.led.cash = 0; BUS.emit('banked', this.led.banked); }
  reup(n) { this.led.vials += n; this.led.added += n; this.led.reups++; BUS.emit('reup', n); }
  /** product or cash taken by the police */
  seize(what, n) { if (what === 'vials') { n = Math.min(n, this.led.vials); this.led.vials -= n; this.led.seized += n; } else { n = Math.min(n, this.led.cash); this.led.cash -= n; this.led.seizedCash += n; } BUS.emit('seize', what, n); return n; }
  ledgerOk() { const L = this.led; return L.start + L.added - L.sold - L.seized === L.vials && L.taken === L.banked + L.cash + L.seizedCash; }
  updatePolice(dt, ctx) {
    if (this.o.patrol) {
      if (!this.patrol) this.patrol = { d: 0, wait: 30 + this.rnd() * 30, on: false, x: PATROL_LOOP[0][0], y: PATROL_LOOP[0][1], f: 0 };
      const p = this.patrol;
      if (!p.on) { p.wait -= dt; if (p.wait <= 0) { p.on = true; p.d = 0; } }
      else {
        p.d += 70 * dt; const pts = PATROL_LOOP; let d = p.d, i = 0, seg;
        for (; i < 4; i++) { const a = pts[i], b = pts[(i + 1) % 4]; seg = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d < seg) { p.x = lerp(a[0], b[0], d / seg); p.y = lerp(a[1], b[1], d / seg); p.f = Math.atan2(b[1] - a[1], b[0] - a[0]); break; } d -= seg; }
        if (i >= 4) { p.on = false; p.wait = 60 + this.rnd() * 30; }
        else for (const l of this.crew.lookouts || []) if (Math.hypot(l.x - p.x, l.y - p.y) < l.range && this.open) { this.shutdown('patrol'); break; }
      }
    }
    if (this.knock) {
      const k = this.knock; k.t += dt;
      if (k.t > 1.5 && !k.done) { k.done = true; const tgt = k.target; let got = 0;
        if (tgt && tgt.carrying) { got = this.seize('vials', tgt.carrying); tgt.carrying = 0; } else if (tgt === this.crew.money && this.led.cash) got = this.seize('cash', this.led.cash);
        BUS.emit('knocked', tgt, got); }
      if (k.t > 6) this.knock = null;
    }
  }
  /** the knockers jump out on the nearest crew member to a point */
  knockers(target) { this.knock = { t: 0, target, at: { x: target.x, y: target.y } }; this.shutdown('knockers', 25); sfx('yelp'); }
  drawPolice(r) {
    const p = this.patrol; if (p && p.on) { r.shape('patrol', p.x, p.y, 0, { facing: p.f }); }
    if (this.knock) { const a = this.knock.at; r.shape('sedan', a.x + 22, a.y + 4, 0, { facing: 0 }); }
  }
}
