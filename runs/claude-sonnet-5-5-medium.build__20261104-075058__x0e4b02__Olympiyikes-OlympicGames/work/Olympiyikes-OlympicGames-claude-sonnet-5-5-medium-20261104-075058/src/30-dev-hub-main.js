// Olympiyikes! dev mode (from the pause menu), AI Hub session flow, and the boot.
(() => {
'use strict';
const E = My3D2dge, O = OLY, { px } = E, game = O.game, clamp = E.clamp, G = globalThis;

// ================================================================ DEV PANEL
O.Dev = {
  openF: false, i: 0, evPick: 0,
  open() { try { game.resume && game.resume(); } catch (e) { /* ignore */ } this.openF = true; this.i = 0; game.input.consumeAll(); },
  close() { this.openF = false; game.input.consumeAll(); },
  isOpen() { return this.openF; },
  slider(label, key, min, max, step, fmt) { return { t: 's', label, get: () => O.tune[key], set: v => { O.tune[key] = v; if (key === 'speed') game.timeScale = v; }, min, max, step, fmt: fmt || (v => v.toFixed(2)) }; },
  toggle(label, key) { return { t: 't', label, get: () => O.cheat[key], set: v => { O.cheat[key] = v; } }; },
  action(label, fn) { return { t: 'a', label, fn }; },
  items() {
    const run = O.playRun, ev = run ? run.ev : null, ids = O.SCHEDULE_ALL();
    return [
      this.slider('CPU skill offset', 'cpuSkill', -.3, .3, .02), this.slider('Timing window x', 'timing', .5, 2.5, .1), this.slider('Mash power x', 'mash', .5, 2, .05), this.slider('Wind x', 'wind', 0, 2, .1),
      this.slider('Hype gain x', 'hype', 0, 3, .1), this.slider('Game speed', 'speed', .25, 2, .05),
      this.toggle('Bot plays for me', 'perfect'), this.toggle('Always qualify', 'qual'), this.toggle('Infinite torches', 'torches'), this.toggle('Show event state', 'showHit'),
      this.action('Fill hype flame', () => { if (run) { run.hype = 1; game.note('HYPE FULL'); } else game.note('Not in an event'); }),
      this.action('Win this event (skip)', () => { if (run && !run.done) { const v = ev.dir > 0 ? O.Records.worldRecord(ev) * .98 : O.Records.worldRecord(ev) * 1.02; run.S.over = false; run.finish(v, 'Dev skip'); game.note('SKIPPED'); } else game.note('Not in an event'); }),
      this.action('Restart event', () => { this.close(); O.restartEvent(); }),
      { t: 'p', label: 'Jump to event', get: () => O.EV[ids[this.evPick]].name, step: d => { this.evPick = (this.evPick + d + 12) % 12; }, fn: () => { this.close(); if (!O.meet || O.meet.mode === 'attract') { O.newMeet('single', [{ p: 0, nat: 'SUN' }], [], { qual: false }); } O.go('play', { ev: ids[this.evPick], humans: [0] }, { fade: 'iris' }); } },
      this.action('Reset to defaults', () => { O.tune = Object.assign({}, O.TUNE_DEFAULTS); O.cheat.perfect = false; O.cheat.qual = false; O.cheat.torches = false; O.cheat.showHit = false; game.timeScale = 1; game.note('DEFAULTS RESTORED'); }),
      this.action('Close dev mode', () => this.close())
    ];
  },
  update(dt) {
    const items = this.items(), n = items.length; this.i = Math.min(this.i, n - 1);
    for (const p of game.players) {
      if (p.repeat('up', .3, .08)) this.i = (this.i + n - 1) % n; if (p.repeat('down', .3, .08)) this.i = (this.i + 1) % n;
      const it = items[this.i], d = p.repeat('right', .3, .06) ? 1 : p.repeat('left', .3, .06) ? -1 : 0;
      if (d) { if (it.t === 's') it.set(clamp(Math.round((it.get() + d * it.step) / it.step) * it.step, it.min, it.max)); else if (it.t === 't') it.set(!it.get()); else if (it.t === 'p') it.step(d); }
      if (p.pressed('confirm')) { if (it.t === 't') it.set(!it.get()); else if (it.fn) it.fn(); }
      if (p.pressed('cancel') || p.pressed('pause')) this.close();
    }
    const c = game.input.clicked(); if (c && this.rects) this.rects.forEach((q, k) => { if (c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]) { this.i = k; const it = items[k]; if (it.t === 's') { it.set(clamp(Math.round((it.min + (c[0] - (q[0] + q[2] * .5)) / (q[2] * .5) * (it.max - it.min)) / it.step) * it.step, it.min, it.max)); } else if (it.t === 't') it.set(!it.get()); else if (it.fn) it.fn(); } });
  },
  draw(g, r) {
    const items = this.items(), w = Math.min(330, r.W - 20), x = 10, y0 = 8, lh = 13; this.rects = [];
    px.rect(g, x - 4, y0 - 4, w + 8, items.length * lh + 26, 'rgba(6,8,30,.93)'); px.rect(g, x - 4, y0 - 4, w + 8, 2, '#4fe0a8');
    O.T(g, 'DEV MODE', x + 2, y0, '#4fe0a8', { s: 1 }); O.T(g, 'tune live • changes are not saved', x + w, y0, '#7f89b8', { s: 1, align: 'right' });
    items.forEach((it, k) => {
      const y = y0 + 12 + k * lh, sel = k === this.i; this.rects.push([x, y, w, lh]); if (sel) px.rect(g, x, y, w, lh - 1, '#274199');
      O.T(g, it.label, x + 4, y + 2, sel ? '#fff' : '#cfd8ff', { s: 1 });
      if (it.t === 's') { const v = it.get(), bw = 90, bx = x + w - bw - 38; px.rect(g, bx, y + 4, bw, 4, '#161a3c'); px.rect(g, bx, y + 4, bw * (v - it.min) / (it.max - it.min), 4, '#ffd36a'); px.rect(g, bx + bw * (v - it.min) / (it.max - it.min) - 1, y + 2, 3, 8, '#fff'); O.T(g, it.fmt(v), x + w - 4, y + 2, '#ffe27a', { s: 1, align: 'right' }); }
      else if (it.t === 't') O.T(g, it.get() ? 'ON' : 'off', x + w - 4, y + 2, it.get() ? '#4fe0a8' : '#7f89b8', { s: 1, align: 'right' });
      else if (it.t === 'p') O.T(g, '← ' + it.get() + ' →', x + w - 4, y + 2, '#ffe27a', { s: 1, align: 'right' });
    });
    O.strip(g, r, [[['up', 'down'], 'Pick'], [['left', 'right'], 'Adjust'], ['confirm', 'Do'], ['cancel', 'Close']], 0);
  }
};
// the pause-menu "Restart event" and "How to play" are safe outside events too
const origHelp = O.showHelp;

// ================================================================ AI HUB (Session Protocol v1, ghost mode)
O.Hub = {
  active: false, started: false, others: {}, sent: 0, lastProg: 0, info: null, done: false,
  begin() {
    const A = G.AIHub; if (!A || this.started) return; this.started = true;
    A.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
      if (!info) { O.inHub = false; return; }
      this.active = true; this.info = info; O.hubInfo = info; O.setSeed(info.seed);
      A.on('message', (d, from) => { this.others[from] = d; });
      A.on('start', () => { this.go = true; });
      A.on('time-up', () => this.timeUp());
      A.on('end', () => { this.done = true; try { game.audio.mute(); } catch (e) { /* ignore */ } });
      const ids = O.SCHEDULE_ALL(); this.evId = ids[(info.seed >>> 0) % ids.length]; this.nat = O.NATIONS[(info.me || 0) % 8].id;
      O.newMeet('hub', [{ p: 0, nat: this.nat }], [this.evId], { qual: false, seed: info.seed });
      O.hubInfo = info; O.go('hubwait', null, { fade: 0 });
      A.ready();
    }).catch(() => { O.inHub = false; });
  },
  startRound() { if (this.launched) return; this.launched = true; O.go('play', { ev: this.evId, humans: [], hub: true, nat: this.nat }, { fade: 0 }); },
  runStarted(run) { this.run = run; this.others = {}; },
  progress(run) {
    const S = run.S, ev = run.ev; let p = 0;
    if (S.x !== undefined && (ev.id === 'sprint')) p = S.x / 100; else if (ev.id === 'javelin') p = (S.x || 0) / 40; else if (ev.id === 'swim') p = (S.pos || 0) / 50; else if (S.course) p = S.s / S.course.len;
    else p = clamp(run.t / 40, 0, .95);
    return clamp(run.done ? 1 : p, 0, 1);
  },
  tick(run, dt) {
    const A = G.AIHub; if (!A || !this.active) return; this.sent += dt; this.lastProg += dt;
    if (this.sent > .12) { this.sent = 0; A.send({ p: this.progress(run), v: run.S.v || 0 }, { reliable: false }); }
    if (this.lastProg > 1) { this.lastProg = 0; A.progress({ score: Math.round(this.progress(run) * 100), label: run.ev.name }); }
  },
  finished(run, sc) {
    const A = G.AIHub; if (this.reported) return; this.reported = true; const ev = run.ev, v = sc ? sc.v : ev.fail;
    if (A) { if (ev.dir < 0) { if (v === ev.fail || v >= 99) A.result({ score: 0 }); else A.result({ time: Math.round(v * 1000) }); } else A.result({ score: Math.max(0, v) }); }
    O.go('hubdone', { ev, v }, { fade: 0 });
  },
  timeUp() { const A = G.AIHub; if (this.reported || !A) return; this.reported = true; const run = this.run; const best = run && run.best !== null ? run.best : null; if (best === null) A.result({ score: 0 }); else if (run.ev.dir < 0) A.result({ time: Math.round(best * 1000) }); else A.result({ score: best }); }
};
O.scene('hubwait', {
  lock: 0, view: 'brawler',
  enter() { game.setView('brawler'); this.t = 0; },
  update(dt) { this.t += dt; const A = G.AIHub; if (A && O.Hub.go && A.time() >= 0) O.Hub.startRound(); },
  draw(r) {
    r.sky(['#101a50', '#223a8a', '#4a6ab0']);
    r.overlay(g => {
      O.stars(g, r, 40, 3); O.emblem(g, r.W / 2, 50, 1.2); O.title(g, 'OLYMPIYIKES!', r.W / 2, 70, 4);
      const ev = O.EV[O.Hub.evId || 'sprint']; O.picto(g, ev.id, r.W / 2, 140, 2, '#fff'); O.T(g, ev.name.toUpperCase(), r.W / 2, 168, '#ffe27a', { s: 2, align: 'center' });
      const A = G.AIHub, tt = A && isFinite(A.time()) ? A.time() : -Infinity; O.T(g, tt > -4000 && tt < 0 ? 'STARTING IN ' + Math.ceil(-tt / 1000) : 'WAITING FOR THE STARTING GUN', r.W / 2, 190, '#fff', { s: 2, align: 'center' });
      O.T(g, 'Same event for every player. Best result wins.', r.W / 2, 212, '#9fb0ff', { s: 1, align: 'center' });
    });
  }
});
O.scene('hubdone', {
  lock: 0, view: 'brawler', enter(d) { this.d = d; game.setView('brawler'); },
  update() {},
  draw(r) { r.sky(['#101a50', '#223a8a', '#4a6ab0']); r.overlay(g => { O.emblem(g, r.W / 2, 50, 1.2); O.T(g, 'YOUR RESULT', r.W / 2, 90, '#fff', { s: 2, align: 'center' }); O.T(g, this.d.ev.fmt(this.d.v), r.W / 2, 114, '#ffe27a', { s: 4, align: 'center' }); O.T(g, 'Waiting for the other athletes...', r.W / 2, 160, '#9fb0ff', { s: 1, align: 'center' }); }); }
});
// hub: Create + Options belongs to the hub's corner bar
if (O.inHub && E.HOOKS) E.HOOKS.input.push(g => { try { const pads = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of pads) if (p && p.buttons && p.buttons[8] && p.buttons[8].pressed) { g.input.suppress('pause'); g.input.suppress('start'); } } catch (e) { /* ignore */ } });

// ================================================================ LAUNCH + BOOT
O.scene('launch', {
  lock: 0, view: 'side',
  enter() {
    const h = (typeof location !== 'undefined' && location.hash) ? location.hash.slice(1) : '';
    if (O.inHub) return O.go('title', null, { fade: 0 });
    let m;
    if ((m = /^ev\/(\w+)/.exec(h)) && O.EV[m[1]]) { O.newMeet('single', [{ p: 0, nat: 'SUN' }], [], { qual: false }); return O.go('play', { ev: m[1], humans: [0] }, { fade: 0 }); }
    if (h === 'attract') { return O.Attract.start(); }
    if ((m = /^games\/day\/(\d+)/.exec(h))) { O.flow.players = [{ p: 0, nat: 'SUN' }]; O.flow.setup = { length: 'Full 12', playlist: 'Track & Pool', qual: true }; O.flow.startMeet(); O.meet.day = clamp(+m[1] - 1, 0, 11); return O.flow.beginDay(); }
    if ((m = /^scene\/(\w+)/.exec(h)) && O.scenes[m[1]]) { if (!O.meet) O.newMeet('single', [{ p: 0, nat: 'SUN' }], [], { qual: false }); return O.go(m[1], { ev: 'sprint' }, { fade: 0 }); }
    O.go('title', null, { fade: 0 });
  },
  update() {}, draw(r) { r.sky(['#0b0f24', '#0b0f24']); }
});
game.debug = {
  snapshot() { const run = O.playRun; return { scene: O.cur, meet: O.meet ? { mode: O.meet.mode, day: O.meet.day, torches: O.meet.torches, yikes: O.meet.yikes } : null, run: run ? { ev: run.ev.id, t: run.t, done: run.done, score: run.score, hype: run.hype, attempt: run.attempt } : null }; }
};
G.__oly = O;
O.boot = () => {
  game.start({
    scenes: O.scenes, scene: 'launch',
    boot: { title: 'OLYMPIYIKES!', version: O.version, steps: [['Inflating the blimp', () => { O.backdrop('stadium'); }], ['Waxing the skis', () => { O.backdrop('snow'); }], ['Teaching the crowd to wave', () => { O.backdrop('pool'); }], ['Calming the mascot', () => { O.NATIONS.forEach(n => O.makeRig(n)); }]], messages: ['Inflating the blimp', 'Waxing the skis', 'Teaching the crowd to wave', 'Calming the mascot'], min: 0 }
  });
};
})();
