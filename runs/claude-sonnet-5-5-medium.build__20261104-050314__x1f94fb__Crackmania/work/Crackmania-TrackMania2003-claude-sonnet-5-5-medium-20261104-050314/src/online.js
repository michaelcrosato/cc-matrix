// AI Hub session (protocol v1), ghost mode: everyone time-attacks the same track; others appear as ghost cars.
import { COURSES, COURSE_IDS, ENVS, U } from './data.js';
import { CFG } from './config.js';
import { fmt } from './arena.js';
import { Pane, C, box, prompts, tw, veil } from './ui.js';
const E = globalThis.My3D2dge;
const SESSION = ['D1', 'D2', 'D3', 'R1', 'R2', 'R3', 'S1', 'S2', 'S3'];

export function installOnline(X) {
  const { game, S, scenes, A, au, helpers } = X;
  const Tx = (g, s, x, y, col = C.text, o = {}) => E.font.text(g, String(s), x, y, col, Object.assign({ shadow: C.shade, outline: false }, o));
  const H = () => globalThis.AIHub;
  const O = { phase: 'connect', info: null, ghosts: new Map(), best: null, runs: 0, sentAt: 0, progAt: 0, card: { left: null, ready: [], asked: false }, over: false, reported: false, limit: 180000, restartAt: 0, respawns: 0 };
  X.online = O;
  scenes.online = {
    view: 'iso', input: X.KEYS,
    enter() {
      const hub = H(); O.phase = 'connect'; S.hub = { onFinish: steps => onFinish(steps) }; S.mode = 'online';
      hub.on('card', c => { O.card = Object.assign(O.card, c); });
      hub.on('start', () => { O.started = true; });
      hub.on('message', (d, from) => onMessage(d, from));
      hub.on('leave', l => { const gv = O.ghosts.get(l.id); if (gv) { gv.car.place(-9999, -9999, -9999); O.ghosts.delete(l.id); } });
      hub.on('time-up', () => report());
      hub.on('end', e => { O.over = true; O.phase = 'over'; O.standings = e.standings; game.audio.mute(true); S.sound.stop(); });
      hub.connect({ mode: 'ghost', seats: [1, 4], card: true }).then(info => {
        if (!info) { O.phase = 'none'; game.go('menu'); return; }
        O.info = info; O.limit = Math.min(180000, (info.limitMs || 180000) - 5000);
        const rnd = hub.rng('track'); O.id = SESSION[Math.floor(rnd() * SESSION.length)]; O.def = COURSES[O.id];
        scenes.race.enter({ mode: 'online', def: O.def, count: 1e9 }); S.mode = 'online'; S.hub = { onFinish: steps => onFinish(steps) };
        O.phase = 'card'; O.myColor = (info.players.find(p => p.id === info.me) || {}).color || '#e8443a'; S.car.o.color = O.myColor;
        for (const p of info.players) if (p.id !== info.me) { const gc = S.arena.spawn({ ghost: true, color: p.color, slot: 1, name: p.name }); gc.fade = .55; O.ghosts.set(p.id, { car: gc, buf: [], area: null, name: p.name, color: p.color }); }
        S.arena.world.camera.set('fixed'); hub.ready();
      });
    },
    update(dt) {
      const hub = H(), I = game.input;
      if (O.phase === 'card') { orbit(dt); S.arena.world.step(dt); if (I.pressed('confirm') || I.pressed('start')) { hub.answer('ready'); I.consumeAll(); } if (I.pressed('look') || I.pressed('restart')) hub.answer('more'); if (O.started) O.phase = 'count'; return; }
      if (O.phase === 'connect' || O.phase === 'none') return;
      const t = hub.time(); S.run.count = 1e9;
      if (O.phase === 'count') { orbit(dt); S.arena.world.step(dt); S.run.update(); if (t >= 0) { O.phase = 'play'; S.run.count = 0; S.run.phase = 'racing'; S.cam = 0; helpers.setCam(S.arena.world, S.car, 0); } return; }
      if (O.phase === 'over') { S.arena.world.step(dt); return; }
      if (O.phase === 'wait') { scenes.race.update(dt); ghostsUpdate(); return; }
      // play
      if (t >= O.limit) { report(); return; }
      if (O.restartAt && game.time > O.restartAt) { O.restartAt = 0; S.run.restart(); S.run.count = 0; S.run.phase = 'racing'; O.runs++; S.rec = []; }
      scenes.race.update(dt);
      S.run.count = 0; if (S.run.phase === 'countdown') S.run.phase = 'racing';
      ghostsUpdate(); send(t); progress(t);
    },
    draw(r) {
      const a = S.arena; if (!a) { r.overlay(g => { veil(g, r, 1); Tx(g, 'CONNECTING TO THE HUB', r.W / 2 - 80, r.H / 2, C.text, { scale: 1.5 }); }); return; }
      if (O.phase === 'card' || O.phase === 'count') { a.world.draw(r); r.overlay(g => cardDraw(g, r)); return; }
      a.world.draw(r);
      r.overlay(g => { hudDraw(g, r); });
    }
  };
  function orbit(dt) {
    const a = S.arena, line = a.course.line; O.oT = (O.oT || 0) + dt * .06; const k = O.oT % 1, i = Math.floor(k * (line.length - 1)), p = line[i], q = line[Math.min(line.length - 1, i + 3)], ang = Math.atan2(q.y - p.y, q.x - p.x);
    a.world.camera.fixed = { x: p.x - Math.cos(ang) * 180 + Math.cos(ang + 1.57) * 200, y: p.y - Math.sin(ang) * 180 + Math.sin(ang + 1.57) * 200, z: p.z + 130, yaw: Math.atan2(Math.sin(ang) * 180 - Math.sin(ang + 1.57) * 200, Math.cos(ang) * 180 - Math.cos(ang + 1.57) * 200), pitch: -.35, fov: 62 };
  }
  function cardDraw(g, r) {
    const W = r.W, Hh = r.H, hub = H(), info = O.info; veil(g, r, .5);
    E.font.title(g, 'CRACKMANIA', W / 2, 8, { align: 'center', scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
    Tx(g, O.def.name.toUpperCase() + '  (' + ENVS[O.def.env].name + ')', W / 2 - tw(O.def.name) , 50, C.hot, { scale: 1.5 });
    let y = 72; for (const p of info.players) { const rdy = (O.card.ready || []).includes(p.id); box(g, 24, y - 2, W - 48, 14, false); Tx(g, p.name + (p.id === info.me ? ' (you)' : ''), 32, y, p.color); Tx(g, rdy ? 'READY' : '...', W - 32 - tw(rdy ? 'READY' : '...'), y, rdy ? C.good : C.dim); y += 16; }
    Tx(g, 'Best time in 3 minutes wins. Restart as often as you like.', 24, Hh - 74, C.text);
    const I = game.input; Tx(g, 'Gas ' + I.label('gas') + '   Brake ' + I.label('brake') + '   Steer ' + (I.lastDevice === 'gamepad' ? 'stick' : 'A / D') + '   Respawn ' + I.label('respawn'), 24, Hh - 60, C.dim);
    const left = O.card.left; Tx(g, left === null || left === undefined ? 'STARTING' : 'STARTS IN ' + Math.ceil(left / 1000) + 's', W - 24 - tw('STARTS IN 00s'), 50, C.text);
    prompts(game, g, r, [['confirm', 'Ready'], ['restart', 'More time']]);
    if (O.phase === 'count') { const t = hub.time(); if (isFinite(t)) Tx(g, String(Math.max(1, Math.ceil(-t / 1000))), W / 2 - 14, Hh / 2 - 20, '#fff', { scale: 8 }); }
  }
  function hudDraw(g, r) {
    const hub = H(), t = hub.time(), left = Math.max(0, O.limit - t); const W = r.W;
    Tx(g, 'ROUND ' + fmt(Math.round(left / 1000 * 120)).slice(0, 4), W / 2 - 36, 36, left < 20000 ? C.bad : C.text, { scale: 1.5 });
    if (O.best !== null) Tx(g, 'BEST ' + fmt(O.best), W - 12 - tw('BEST ' + fmt(O.best)), 10, '#c8d8ff');
    for (const [, gh] of O.ghosts) { if (gh.area !== O.id || !gh.car) continue; const p = S.arena.world.project(gh.car.x, gh.car.y, gh.car.z + 18); if (p) Tx(g, gh.name, p[0] - tw(gh.name) / 2, p[1], gh.color); }
    if (O.phase === 'wait') { box(g, W / 2 - 100, 70, 200, 34, true); Tx(g, 'WAITING FOR THE OTHERS', W / 2 - tw('WAITING FOR THE OTHERS') / 2, 82, C.hot); }
    if (O.phase === 'over') { veil(g, r, .5); Tx(g, 'ROUND OVER', W / 2 - 60, r.H / 2 - 10, C.hot, { scale: 2 }); }
  }
  // ghost traffic
  function send(t) {
    if (game.real - O.sentAt < .1) return; O.sentAt = game.real; const v = S.car;
    H().send({ t: 'g', area: O.id, run: O.runs, ms: Math.round(S.run.steps * 1000 / 120), p: [Math.round(v.x * 10) / 10, Math.round(v.y * 10) / 10, Math.round(v.z * 10) / 10], a: Math.round(v.angle * 1000) / 1000, v: Math.round(Math.abs(v.speed) / U * 3.6) }, { reliable: false });
  }
  function onMessage(d, from) {
    const gh = O.ghosts.get(from); if (!gh || !d) return;
    if (d.t === 'g') { gh.area = d.area; gh.buf.push({ at: game.real, p: d.p, a: d.a }); if (gh.buf.length > 20) gh.buf.shift(); }
  }
  function ghostsUpdate() {
    const now = game.real - .15;
    for (const [, gh] of O.ghosts) {
      if (gh.area !== O.id || gh.buf.length < 1) { gh.car.place(-9999, -9999, -9999); gh.car.vx = gh.car.vy = gh.car.vz = 0; continue; }
      let a = gh.buf[0], b = gh.buf[gh.buf.length - 1]; for (let i = 0; i < gh.buf.length - 1; i++) if (gh.buf[i].at <= now && gh.buf[i + 1].at > now) { a = gh.buf[i]; b = gh.buf[i + 1]; }
      const k = b.at > a.at ? E.clamp((now - a.at) / (b.at - a.at), 0, 1) : 1;
      gh.car.place(a.p[0] + (b.p[0] - a.p[0]) * k, a.p[1] + (b.p[1] - a.p[1]) * k, a.p[2] + (b.p[2] - a.p[2]) * k + 2); gh.car.vx = gh.car.vy = gh.car.vz = 0; gh.car.angle = gh.car.facing = a.a + E.angDiff(a.a, b.a) * -k * -1 * 0 + (b.a - a.a) * k * (Math.abs(b.a - a.a) < 3 ? 1 : 0); gh.car.fade = CFG.ghostAlpha + .1;
    }
  }
  function progress(t) {
    if (game.real - O.progAt < 1) return; O.progAt = game.real; const run = S.run;
    const score = O.best !== null ? 2e6 - Math.round(O.best * 1000 / 120) : run.cps * 1000 + Math.round(progressM());
    H().progress({ score, label: O.best !== null ? 'BEST ' + fmt(O.best) : 'CP ' + run.cps + '/' + run.cpTotal });
  }
  function progressM() { const line = S.arena.course.line, v = S.car; let b = 1e18, bi = 0; for (let k = 0; k < line.length; k += 2) { const d = (line[k].x - v.x) ** 2 + (line[k].y - v.y) ** 2; if (d < b) { b = d; bi = k; } } return line[bi].d / U; }
  function onFinish(steps) {
    if (O.best === null || steps < O.best) { O.best = steps; H().send({ t: 'best', ms: Math.round(steps * 1000 / 120) }); }
    O.restartAt = game.time + 2;
  }
  function report() {
    if (O.reported) return; O.reported = true; const stats = { Runs: O.runs + 1, Respawns: (O.respawns || 0) + (S.run ? S.run.respawns : 0) };
    if (O.best !== null) H().result({ time: Math.round(O.best * 1000 / 120), stats }); else H().result({ score: S.run.cps * 1000 + Math.round(progressM()), stats });
    O.phase = 'wait';
  }
}
