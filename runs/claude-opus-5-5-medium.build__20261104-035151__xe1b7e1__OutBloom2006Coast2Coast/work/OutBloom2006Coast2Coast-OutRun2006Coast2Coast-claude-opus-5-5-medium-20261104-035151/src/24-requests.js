/* Love in Bloom (PLAN §7.7, §8.7): request objects on the road (OB.Objects), the request director (OB.Requests: the
 * 14 request types, their windows, ratings, petals and grade, the passenger's fork preferences), and the passenger
 * (OB.Passenger: barks and poses for every event, by the Passenger chatter setting, spoken by the babble voice). */
(() => {
'use strict';
const OB = window.OB, E = OB.E, SEG = OB.SEG, tu = k => OB.tuning[k];

/* ---- objects on the road ---- */
OB.Objects = {
  add(race, o) { const obj = Object.assign({ alive: true, y: 0, r: .2, t: 0, v: 0, passed: {}, hitBy: {} }, o); race.objects.push(obj); return obj; },
  step(race, dt) {
    const cars = race.players.map(P => P.car), perfect = race.cheats.perfectRequests;
    for (const o of race.objects) {
      if (!o.alive) continue;
      o.t += dt;
      if (o.follow) { o.z = (o.follow[0].z + o.follow[1].z) / 2; o.x = (o.follow[0].x + o.follow[1].x) / 2; o.stage = o.follow[0].stage; o.gap = Math.abs(o.follow[0].x - o.follow[1].x) / 2 - .12; }
      else if (o.v) o.z += o.v * OB.KMH * dt;
      if (o.sway) o.x = o.x0 + Math.sin(o.t * o.sway[1] + o.sway[2]) * o.sway[0];
      if (o.drift) o.x += o.drift * dt;
      for (const c of cars) {
        if (c.stage !== o.stage) continue;
        const dz = o.z - c.z;
        if (perfect && dz > 0 && dz < 2600 && !o.hitBy[c.id]) { if (o.want === 'hit') { o.x += (c.x - o.x) * Math.min(1, dt * 6); if (o.x0 !== undefined) o.x0 = o.x; } if (o.want === 'avoid') o.x += Math.sign(o.x - c.x || 1) * dt * 2; }
        if (Math.abs(dz) < (o.len || 260) && Math.abs(o.x - c.x) < o.r + c.hw && !o.hitBy[c.id] && c.crash.t <= 0) { o.hitBy[c.id] = true; if (o.onHit) o.onHit(c, o); }
        const was = o.passed[c.id]; if (was !== undefined && was > 0 && dz <= 0 && o.onPass) o.onPass(c, o, c.x - o.x);
        o.passed[c.id] = dz;
      }
      if (cars.every(c => c.stage !== o.stage ? OB.STAGES[c.stage].row > OB.STAGES[o.stage].row : c.z - o.z > 2500)) o.alive = false;
    }
    if (race.objects.length > 40 && race.objects.some(o => !o.alive)) race.objects = race.objects.filter(o => o.alive);
  }
};

/* ---- the request types: spawn its objects (or set up counting), then rate ---- */
const laneX = (l, lanes) => -1 + (2 * l + 1) / lanes;
const TYPES = {
  balloons: { spawn(q) { for (let i = 0; i < q.n; i++) q.obj({ kind: 'balloon', z: q.z0 + i * 1000, x: Math.sin(i * .85) * .62, r: .24, want: 'hit', drift: q.stage === 'S10' ? Math.sin(i) * .08 : 0, onHit: () => q.got1('obj:pop') }); } },
  gnomes: { spawn(q) { for (let i = 0; i < q.n; i++) q.obj({ kind: 'gnome', z: q.z0 + i * 1300, x: laneX(Math.floor(q.r() * q.lanes), q.lanes) * .9, r: .2, want: 'hit', onHit: () => q.got1('obj:bonk') }); } },
  bouquets: { spawn(q) { for (let i = 0; i < q.n; i++) q.obj({ kind: 'bouquet', z: q.z0 + i * 1100, x: (q.r() < .5 ? -1 : 1) * (.3 + q.r() * .45), r: .2, want: 'hit', onHit: () => q.got1('obj:bouquet') }); } },
  arches: { spawn(q) { for (let i = 0; i < q.n; i++) q.obj({ kind: 'arch', z: q.z0 + i * 1700, x: laneX((i * 2 + (i >> 1)) % q.lanes, q.lanes), r: 0, want: 'hit', onPass: (c, o, dx) => { if (Math.abs(dx) < .24) q.got1('obj:arch'); else q.fail1(); } }); } },
  cones: { spawn(q) { for (let i = 0; i < q.n; i++) { const side = i % 2 ? 1 : -1; q.obj({ kind: 'cone', z: q.z0 + i * 1500, x: 0, side, r: .08, want: 'none', onHit: (c, o) => { o.down = true; q.fail1(); OB.bus.emit('obj:cone', { car: c.id, hit: true }); }, onPass: (c, o, dx) => { if (!o.down && (Math.sign(dx) === side || q.race.cheats.perfectRequests)) q.got1('obj:cone'); } }); } } },
  bees: { spawn(q) { for (let i = 0; i < q.n; i++) q.obj({ kind: 'bee', z: q.z0 + i * 1500, x0: 0, x: 0, sway: [.85, 1.3 + q.r(), q.r() * 6], r: .2, want: 'avoid', onHit: c => { q.hits++; OB.bus.emit('obj:sting', { car: c.id }); c.vx += (q.r() - .5) * 2; } }); q.got = 0; } },
  ribbons: { spawn(q) {
    for (let i = 0; i < q.n; i++) {
      const z = q.z0 + i * 2300, l = Math.floor(q.r() * (q.lanes - 1)), T = q.race.traffic, v = 70 + q.r() * 15;
      const a = T.add({ stage: q.stage, z, lane: l, type: 'sedan', v, color: '#ffffff', ribbon: { dx: -.14 } }), b = a && T.add({ stage: q.stage, z, lane: l + 1, type: 'sedan', v, color: '#ffffff', ribbon: { dx: .14 } });
      if (!a || !b) { q.n--; continue; }
      a.ribbon.pair = b; b.ribbon.pair = a; b.side = a.side;
      q.obj({ kind: 'ribbon', z, x: 0, follow: [a, b], r: .14, want: 'hit', len: 300, onHit: (c, o) => { if (!o.snapped) { o.snapped = true; q.got1('obj:snap'); } } });
    }
  } },
  photo: { spawn(q) { const z = q.z0 + 2600; q.box = { z, stopped: false, minV: 999, inside: false, done: false }; q.obj({ kind: 'photo', z, x: 0, r: .55, want: 'none' }); q.obj({ kind: 'photoEnd', z: z + 2 * SEG, x: 0, r: 0, want: 'none' }); q.n = 1; },
    step(q, dt, c) {
      const b = q.box; if (b.done || c.stage !== q.stage) return;
      const inZ = c.z >= b.z - 150 && c.z <= b.z + 2 * SEG + 150, inX = Math.abs(c.x) < .55 - c.hw * .5;
      if (inZ) { b.inside = true; b.minV = Math.min(b.minV, c.v); if (c.v < 8 && inX) b.stopped = true; if (c.v < 8) b.rating = 0; }
      if (c.z > b.z + 2 * SEG + 150 || (b.stopped && b.inside && c.v < 8)) {
        if (b.stopped || c.z > b.z + 2 * SEG + 150) { b.done = true; b.rating = b.stopped ? 0 : b.minV < 50 ? 1 : b.minV < 100 ? 2 : 3; if (q.race.cheats.perfectRequests) b.rating = 0; OB.bus.emit('obj:photo', { car: c.id, rating: b.rating }); q.got = b.rating < 3 ? 1 : 0; q.finish(); }
      }
    } },
  pass: { counter: 'overtake', traffic: true }, close: { counter: 'nearmiss', traffic: true }, clean: { counter: 'contact', traffic: true },
  drift: { counter: 'drift' }, speed: { counter: 'speed' }, draft: { counter: 'draft', traffic: true }
};
OB.REQ_TYPES_IMPL = TYPES;

class Requests {
  constructor(race, P) {
    this.race = race; this.P = P; this.cur = null; this.done = {}; this.pref = null; this.prefFor = null; this.results = []; this.r = OB.rand.stream('requests', race.cfg.seed || 1);
    this.subs = [OB.bus.on('*', (d, n) => this._ev(n, d || {}))];
    this.onlyTypes = race.cfg.requestTypes || null;
  }
  dispose() { for (const u of this.subs) u(); }
  _ev(n, d) {
    const q = this.cur, P = this.P;
    if (d.car !== P.id) return;
    if (n === 'fork:choose' && this.pref && this.prefFor === this.P.car.stage) {
      const ok = (this.pref === 'L' ? -1 : 1) === d.side; this._petals(ok ? 2 : -1, ok ? 'pref' : 'refused'); P.petalMax += 2;
      OB.bus.emit(ok ? 'pref:ok' : 'pref:no', { car: P.id }); this.pref = null;
    }
    if (!this.race.cheats.invincibleMood && this.race.phase === 'run') {
      if (n === 'car:crash') this._petals(-2, 'crash');
      if (n === 'car:bump' && (this.bumpT || 0) <= this.race.t) { this._petals(-1, 'bump'); this.bumpT = this.race.t + 3; }
    }
    if (!q || q.phase !== 'active') return;
    if (q.counter === 'overtake' && n === 'overtake' && d.clean !== false) q.got1();
    if (q.counter === 'nearmiss' && n === 'nearmiss') q.got1();
    if (q.counter === 'contact' && (n === 'car:bump' || n === 'car:crash' || n === 'car:scrape')) q.hits++;
    if (q.counter === 'drift' && n === 'drift:end') q.got += d.score;
  }
  _petals(delta, reason) { const P = this.P; P.petals = Math.max(0, P.petals + delta); OB.bus.emit('petals', { car: P.id, delta, reason }); }
  snap() { const q = this.cur; return q ? { type: q.type, state: q.phase, progress: Math.round(q.got), of: q.n, hits: q.hits } : { type: null, state: 'idle', progress: 0, of: 0 }; }
  /** start a request now (Dev Mode, the attract mode, tests) */
  start(type) {
    const race = this.race, P = this.P, c = P.car, def = OB.REQUESTS[type], st = OB.STAGES[c.stage], impl = TYPES[type], diff = tu('requestDifficulty');
    if (this.cur) this.cur.phase = 'gone';
    const n = Math.max(1, Math.round((def.n[0] + this.r() * (def.n[1] - def.n[0])) * (def.measure === 'objects' || def.measure === 'count' ? diff : 1)));
    const q = this.cur = { type, def, phase: 'intro', t: 0, n: def.measure === 'hits' ? 0 : def.measure === 'share' ? 1 : n, v: type === 'speed' ? n : 0, got: 0, hits: 0, stage: c.stage, z0: c.z + Math.max(2500, c.v * OB.KMH * 1.6 + 1200), lanes: st.lanes, r: this.r, race, counter: impl.counter || null, objs: [], above: 0, win: def.window };
    if (type === 'bees') q.n = n;
    if (type === 'draft') q.n = 6 * diff;
    if (type === 'drift') q.n = n * diff;
    q.obj = o => { const ob = OB.Objects.add(race, Object.assign({ stage: c.stage }, o)); q.objs.push(ob); return ob; };
    q.got1 = ev => { if (q.phase !== 'active' && q.phase !== 'intro') return; q.got++; if (ev) OB.bus.emit(ev, { car: P.id }); OB.bus.emit('req:progress', { car: P.id, n: q.got, of: q.n }); };
    q.fail1 = () => { q.missed = (q.missed || 0) + 1; };
    q.finish = () => { if (q.phase === 'active' || q.phase === 'intro') this._rate(q); };
    if (impl.spawn) impl.spawn(q);
    if (impl.traffic) for (let i = 0; i < 6; i++) race.traffic.add({ stage: c.stage, z: c.z + 3500 + i * 1900, lane: Math.floor(this.r() * st.lanes), type: Object.keys(st.traffic)[i % Object.keys(st.traffic).length] });
    OB.bus.emit('req:start', { car: P.id, type, n: q.n, v: q.v });
    return q;
  }
  step(dt) {
    const race = this.race, P = this.P, c = P.car, S = OB.World.get(c.stage);
    if (race.phase !== 'run' || P.finished) return;
    // the stage's slots, in turn
    if (!this.cur || this.cur.phase === 'gone') {
      const slots = (OB.STAGES[c.stage].slots || []).filter(s => !this.onlyTypes || this.onlyTypes.includes(s.type));
      for (let i = 0; i < slots.length; i++) { const key = c.stage + ':' + i; if (!this.done[key] && c.z >= slots[i].at * S.len * SEG) { this.done[key] = 1; this.start(slots[i].type); break; } }
    }
    // the fork preference, before the junction
    if (S.juncStart >= 0 && this.prefFor !== c.stage && c.z >= (S.juncStart - 170) * SEG && !c.side) {
      this.prefFor = c.stage; const open = race.openSide(c.stage);
      if (!open) {
        const f = OB.forkOf(c.stage), loves = (OB.CAST[P.passenger].loves || []), score = id => (OB.STAGES[id].slots || []).filter(s => loves.includes(s.type)).length + this.r() * .9;
        this.pref = score(f[0]) >= score(f[1]) ? 'L' : 'R'; OB.bus.emit('fork:pref', { car: P.id, side: this.pref === 'L' ? -1 : 1 });
      }
    }
    const q = this.cur; if (!q || q.phase === 'gone') return;
    q.t += dt;
    if (q.phase === 'intro') { if (q.t > 1.6) { q.phase = 'active'; q.t = 0; } }
    else if (q.phase === 'active') {
      const impl = TYPES[q.type];
      if (impl.step) impl.step(q, dt, c);
      if (q.counter === 'speed' && c.v >= q.v) q.above += dt;
      if (q.counter === 'draft' && c.slip > .5) q.got += dt;
      const objsLeft = q.objs.some(o => o.alive && o.kind !== 'photoEnd' && (o.stage === c.stage ? o.z > c.z - 200 : OB.STAGES[o.stage].row > OB.STAGES[c.stage].row));
      const over = q.objs.length ? (!objsLeft || q.t > q.win * 2.2) : q.t > q.win;
      if (q.phase === 'active' && (over || (race.cheats.perfectRequests && q.t > Math.min(4, q.win)))) this._rate(q);
    } else if (q.phase === 'rated') { if (q.t > 2.4) q.phase = 'gone'; }
  }
  _rate(q) {
    const def = q.def, th = def.th, P = this.P;
    let r = 3;
    if (q.type === 'photo') r = q.box && q.box.rating !== undefined ? q.box.rating : 3;
    else if (def.measure === 'hits') r = q.hits <= th[0] ? 0 : q.hits <= th[1] ? 1 : q.hits <= th[2] ? 2 : 3;
    else { const f = def.measure === 'share' ? q.above / q.win : q.got / Math.max(1, q.n); r = f >= th[0] - 1e-6 ? 0 : f >= th[1] ? 1 : f >= th[2] ? 2 : 3; }
    if (q.type === 'clean' && r === 1) r = 2;
    if (this.race.cheats.perfectRequests) r = 0;
    const fav = (OB.CAST[P.passenger].loves || []).includes(q.type) ? 1.2 : 1, petals = Math.ceil(OB.RATING_PETALS[r] * tu('petalScale') * fav);
    P.petalMax += Math.ceil(5 * tu('petalScale') * fav); P.petals += petals;
    q.phase = 'rated'; q.t = 0; q.rating = r; q.petals = petals;
    this.results.push({ type: q.type, rating: r, petals });
    for (const o of q.objs) if (o.kind !== 'ribbon') o.alive = false;
    OB.bus.emit('req:end', { car: P.id, type: q.type, rating: r, petals });
    if (petals) OB.bus.emit('petals', { car: P.id, delta: petals, reason: 'request' });
  }
  grade() { const P = this.P; return OB.gradeOf(P.petalMax ? P.petals / P.petalMax : 0); }
}
OB.Requests = Requests;

/* ---- the passenger: barks, poses, mood ---- */
OB.Passenger = {
  attach(race, P) {
    const r = OB.rand.stream('chatter', (race.cfg.seed || 1) + P.i), set = () => (OB.game && OB.game.settings && OB.game.settings.chatter) || 'full';
    P.mood = 0; P.speech = null; P.pose = null;
    const say = (key, o = {}) => {
      const who = o.who || P.passenger, ch = set();
      if (!o.must && ch === 'off') return; if (!o.must && !o.important && ch === 'less' && r() > .3) return; if (!o.must && !o.important && r() > (o.chance || .35)) return;
      if (P.speech && P.speech.t < P.speech.dur * .6 && !o.must) return;
      const text = o.text || OB.line(key, who); if (!text) return;
      const dur = OB.Voice ? OB.Voice.say(text, who, o.mood || 'happy', { silent: ch === 'off' || race.mode === 'attract' && o.quiet }) : text.length * .06;
      P.speech = { text, who, t: 0, dur: Math.max(1.8, dur + .9) };
    };
    const pose = (name, t = 1.6, dir) => { P.pose = { name, t, dir }; };
    const mood = d => { P.mood = E.clamp(P.mood + d, -1, 1); };
    P.say = say; P.setPose = pose;
    race.subs.push(OB.bus.on('*', (d, n) => {
      d = d || {}; if (d.car && d.car !== P.id) return;
      switch (n) {
        case 'go': if (race.mode !== 'attract' || P.i === 0) say('start', { important: true, chance: 1 }); break;
        case 'req:start': say(null, { must: true, text: (OB.REQ_LINES[d.type] || {})[P.passenger], mood: 'excited' }); pose('point', 1.6, 1); break;
        case 'req:end': { const key = ['perfect', 'great', 'good', 'miss'][d.rating]; say(key, { must: true, mood: d.rating < 2 ? 'happy' : d.rating === 3 ? 'sad' : 'happy' }); pose(d.rating < 2 ? 'cheer' : d.rating === 3 ? 'cross' : 'wave', 2); mood([.6, .3, 0, -.5][d.rating]); break; }
        case 'car:crash': say('crash', { important: true, chance: .9, mood: 'scared' }); pose('cheer', 1.4); mood(P.passenger === 'juni' ? .1 : -.3); break;
        case 'car:bump': say('bump', { chance: .4, mood: 'angry' }); pose('cover', .8); mood(-.1); break;
        case 'nearmiss': say('nearmiss', { chance: .3, mood: 'scared' }); pose('cover', .7); mood(P.passenger === 'juni' ? .15 : -.05); break;
        case 'air:land': say('air', { chance: .5, mood: 'excited' }); pose('cheer', .9); break;
        case 'drift:end': if (d.score > 2500) { say('drift', { chance: .4 }); mood(P.passenger === 'vivi' ? .05 : .1); } break;
        case 'slingshot': say('slingshot', { chance: .3 }); break;
        case 'fork:pref': say(d.side < 0 ? 'forkL' : 'forkR', { must: true, mood: 'excited' }); pose('point', 2.4, d.side); break;
        case 'pref:ok': say('prefOk', { must: true, mood: 'happy' }); mood(.3); break;
        case 'pref:no': say('prefNo', { must: true, mood: 'angry' }); pose('cross', 2); mood(-.4); break;
        case 'checkpoint': say('checkpoint', { important: true, chance: .7 }); pose('wave', 1.2); break;
        case 'time:low': say('lowtime', { important: true, chance: 1, mood: 'scared' }); break;
        case 'goal': say('goal', { must: true, mood: 'excited' }); pose('wave', 3); break;
        case 'time:up': say('timeup', { must: true, mood: 'sad' }); pose('cross', 3); break;
        case 'horn': say('horn', { chance: .3 }); break;
        case 'fullbloom': say('fullbloom', { important: true, chance: .8, mood: 'excited' }); pose('cheer', 1.5); break;
        case 'start:perfect': mood(.2); break;
      }
    }));
  },
  step(P, dt) {
    if (P.speech) { P.speech.t += dt; if (P.speech.t > P.speech.dur) P.speech = null; }
    if (P.pose) { P.pose.t -= dt; if (P.pose.t <= 0) P.pose = null; }
    if (P.mood) P.mood *= Math.pow(.97, dt);
  },
  face: P => P.mood > .2 ? 'happy' : P.mood < -.2 ? 'pouty' : 'neutral'
};
})();
