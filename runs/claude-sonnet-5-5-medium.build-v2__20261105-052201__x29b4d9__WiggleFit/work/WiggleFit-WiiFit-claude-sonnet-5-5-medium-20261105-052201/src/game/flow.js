import * as THREE from 'three/webgpu';
import { esc } from '../ui/dom.js';
import { REGISTRY, byId } from '../data/events.js';
import { DAYS, MAINT_POOL } from '../data/programme.js';
import { DAY_STEPS } from '../data/palettes.js';
import { rng } from '../core/rng.js';
import { createDoll, PAINTS } from '../art/doll.js';
import { Rig } from '../anim/rig.js';
import { medalOf, MEDALS } from '../events/base.js';
import { tuning } from '../data/tuning.js';
import { blankSave, defaultSettings } from '../core/save.js';
import { UNLOCKS } from '../data/unlocks.js';
import { RAPIER, PhysWorld, propGroups, groundGroups } from '../physics/world.js';
import { toon } from '../render/renderer.js';
import { HOTSPOTS as ALL_HOTSPOTS } from './island.js';
const UTIL = ['jar', 'board', 'bed', 'mirror', 'gazebo', 'lighthouse'];
const HOTSPOTS = ALL_HOTSPOTS.filter((h) => UTIL.includes(h.id) || byId(h.id));
import { SEAT_COLORS } from '../data/config.js';
import { LINES } from '../data/dialogue.js';

const MEDAL_BONUS = [0, 1, 2, 3, 5];
export function install(game) {
  const S = game.screens, ui = game.ui, audio = game.audio, I = game.input;
  game.programmeDays = () => DAYS.map((d) => ({ ...d, classes: d.classes.filter((c) => byId(c)), checks: d.checks })).filter((d) => d.classes.length || d.n === 5);
  game.totalSteps = () => game.programmeDays().reduce((a, d) => a + d.classes.length, 0);
  game.eventTitle = (id) => (byId(id) ? byId(id).title : id);
  game.todaysClasses = () => { const p = game.profile; const days = game.programmeDays(); if (p.day <= days.length) return days[p.day - 1].classes; const r = rng('maint:' + p.day); const pool = MAINT_POOL.filter((c) => byId(c)); const out = []; while (out.length < Math.min(3, pool.length)) { const c = pool[Math.floor(r() * pool.length)]; if (!out.includes(c)) out.push(c); } return out; };
  game.isMaintenance = () => game.profile.day > game.programmeDays().length;
  game.paletteForDay = () => { const p = game.profile; const d = game.programmeDays()[p.day - 1]; if (!d) return 'noon'; const done = p.doneToday.length; return DAY_STEPS[Math.min(3, Math.floor(done / Math.max(1, d.classes.length) * 3 + 0.01))] || d.palette; };
  game.selectProfile = (i) => { game.profIdx = i; game.profile = game.saveData.profiles[i]; game.saveData.last = i; game.persist(); };
  game.resetSave = () => { game.saveData = blankSave(); game.settings = game.saveData.settings; game.audio.settings = game.settings; game.profile = null; game.profIdx = -1; game.persist(); game.applySettings(); };
  // ---- scene management
  game.setScene = (kind, { palette = 'noon', music = null, instant = false } = {}) => {
    if (game.ev) game.disposeEvent();
    game.showHud(false); game.paused = false;
    if (!game.island) { game.island = new (game.IslandClass)(game.gfx); game.gfx.scene.add(game.island.group); }
    game.island.group.visible = kind === 'island';
    if (kind === 'island') { game.island.restTarget = game.profile ? tuning.islandRest * (1 - game.progressFrac()) : tuning.islandRest; game.gfx.islandCentre.value.set(0, 0, 0); game.gfx.seaFoam.value = 1; game.gfx.sun.target.position.set(0, 0, 0); game.gfx.sun.position.set(14, 26, 12); }
    else { game.gfx.seaFoam.value = 0; }
    game.gfx.stage.visible = kind !== 'island' || !!game.ev; game.gfx.setPalette(palette, instant || !game.gfx.enabled); if (music) game.audio.play(music, 0);
  };
  game.progressFrac = () => { const t = game.totalSteps(); return t ? Math.min(1, game.profile.step / t) : 0; };
  game.disposeEvent = () => { if (!game.ev) return; const ev = game.ev; game.ev = null; try { ev.dispose(); } catch (e) { game.errors.push('dispose: ' + e.message); } for (const c of game.comics) c.s.removeFromParent(); game.comics = []; game.gfx.camera.fov = 38; game.gfx.camera.updateProjectionMatrix(); };
  // ---- programme start
  game.startProgramme = () => {
    const p = game.profile; game.wipe(() => {
      game.go('island', { fresh: true });
      if (!p.checkedIn) game.run(function* () { yield* game.morning(); }); else game.afterCheckIn = true;
    });
  };
  game.morning = function* () {
    game.busy = true; const p = game.profile; const first = p.day === 1 && p.step === 0 && !(p.ages || []).length; const maint = game.isMaintenance();
    yield 0.4; if (maint) yield game.say('trudy', game.line('trudy', 'maint')); else if (first) { yield game.say('trudy', game.line('trudy', 'arrive')); yield game.say('trudy', 'Lean left. Your other left. No, that was correct. I was testing you.'); game.island.tutorial = true; yield 1; yield game.say('trudy', game.line('trudy', 'lean').split('.')[0] + '.'); } else yield game.say('trudy', game.line('trudy', p.day > 2 ? 'morningLate' : 'morning1', { days: p.day }));
    const dn = DAYS[p.day - 1]; if (dn && p.day > 1 && p.day <= 5) yield game.say('trudy', game.line('trudy', 'day' + p.day));
    yield* game.askQuestion();
    yield game.say('trudy', game.line('trudy', 'checkin')); game.run(function* () { yield* game.checkIn(); });
  };
  game.askQuestion = function* () {
    const p = game.profile; const r = rng('q:' + p.day); const side = p.day === 2;
    const Q = side ? null : game.questions[Math.floor(r() * game.questions.length)]; let done = false; let ans = null;
    ui.speech.innerHTML = ''; const q = side ? game.qSide : Q;
    yield game.say('trudy', q.q, { auto: false });
    ui.set('<div class="left" style="height:100%;justify-content:center;padding-left:6vw"><div id="qm"></div></div>', 'left'); const labels = side ? [q.a, q.b] : ['Yes', 'No']; const items = labels.map((l, i) => ({ label: l, ok: () => { ans = i; done = true; } }));
    ui.menuOf(document.getElementById('qm'), items, {}); ui.setPrompts([['nav', 'Move'], ['ok', 'Choose']]); game.speechBlock = false;
    yield () => done; ui.clear(); const reply = side ? (ans === 0 ? q.ra : q.rb) : (ans === 0 ? q.yes : q.no); yield game.say('trudy', reply);
  };
  game.questions = LINES.trudy.q; game.qSide = LINES.trudy.qSide;
  // ---- island screen
  S.island = {
    enter(args) {
      game.screenOrigin = 'island'; const p = game.profile; const isl = game.island; game.setScene('island', { palette: game.paletteForDay(), music: 'island' });
      if (!isl.playerDoll || isl.playerDoll.paint !== p.paint || isl.playerDoll.hat !== p.hat) { const d = createDoll({ paint: p.paint, hat: p.hat }); isl.playerDoll = { d, rig: new Rig(d), paint: p.paint, hat: p.hat }; isl.setPlayer(isl.playerDoll); }
      isl.setMarbles(p.marbleList || []); isl.setLevel(game.progressFrac()); isl.mountPhysics(); isl.restTarget = tuning.islandRest * (1 - game.progressFrac());
      if (args && args.fresh) isl.teleport(0, 10); else if (args && args.at) { const h = HOTSPOTS.find((x) => x.id === args.at); if (h) isl.teleport(h.x + 2.2, h.z + 2.2); }
      this.cam = { yaw: 0, dist: 11, pitch: 0.42 }; this.hover = null; this.focus = null; this.target = null; game.gfx.camera.fov = 45; game.gfx.camera.updateProjectionMatrix(); this.label = document.createElement('div'); this.label.className = 'tag'; this.label.style.cssText = 'position:absolute;pointer-events:none;transform:translate(-50%,-120%);'; ui.extra.appendChild(this.label); this.refresh();
      this.onClick = (e) => { if (game.speechBlock || game.screenName !== 'island' || game.paused) return; if (e.button !== 0) return; const h = this.pickAt(e.clientX, e.clientY); if (h) { this.target = h; } }; window.addEventListener('click', this.onClick); this.idleT = 0;
    },
    exit() { window.removeEventListener('click', this.onClick); if (this.label) this.label.remove(); },
    prompts() { return [['move', 'Walk'], ['ok', 'Use'], ['ask', 'Ask Trudy'], ['pause', 'Pause']]; },
    refresh() { ui.setPrompts(this.prompts()); },
    pickAt(x, y) { let best = null, bd = 120; const cam = game.gfx.camera; for (const h of HOTSPOTS) { const v = new THREE.Vector3(h.x, 1.5, h.z).applyMatrix4(game.island.root.matrixWorld).project(cam); if (v.z > 1) continue; const sx = (v.x * 0.5 + 0.5) * innerWidth, sy = (-v.y * 0.5 + 0.5) * innerHeight; const d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = h; } } return best; },
    nav(a) {
      if (game.speechBlock) return;
      if (game.busy) return;
      if (a === 'ok') { const h = this.focus; if (h) game.useHotspot(h); else if (game.island.walker) { game.island.hopT = 0.5; } }
      if (a === 'tri') game.bark('trudy', game.island.t % 3 < 1.5 ? 'ask' : 'idle');
      if (a === 'pause') game.openPause();
    },
    fixed(dt) {
      const isl = game.island; if (!isl.pw) return; const sp = game.speechBlock || game.paused;
      let mx = 0, mz = 0; if (!sp) { const dev = I.lastDevice === 'pad' ? 'pad' + I.lastPad : 'kbm'; const st = I.steer(dev); const yaw = this.cam.yaw; mx = st[0] * Math.cos(yaw) + st[1] * Math.sin(yaw); mz = -st[0] * Math.sin(yaw) + st[1] * Math.cos(yaw); const l = I.dev(dev); if (Math.hypot(l.lookX, l.lookY) > 0.2) { this.cam.yaw -= l.lookX * dt * 2; this.cam.pitch = Math.max(0.15, Math.min(1, this.cam.pitch + l.lookY * dt)); } if (I.mouseButtons & 2 && false) { /* drag-look handled below */ } if (I.wheel) this.cam.dist = Math.max(6, Math.min(20, this.cam.dist + I.wheel * 1.2));
        if (Math.hypot(mx, mz) > 0.1) this.target = null; }
      if (this.target && !sp && !game.busy) { const dx = this.target.x - isl.px, dz = this.target.z - isl.pz, d = Math.hypot(dx, dz); if (d < 2.4) { game.useHotspot(this.target); this.target = null; } else { mx = dx / d; mz = dz / d; } }
      isl.fixed(dt, { mx, mz });
      const near = HOTSPOTS.map((h) => ({ h, d: Math.hypot(h.x - isl.px, h.z - isl.pz) })).filter((o) => o.d < 3.2).sort((a, b) => a.d - b.d).map((o) => o.h)[0] || null; if (near !== this.focus) { this.focus = near; }
      this.idleT += dt; if (!sp && this.idleT > 45) { this.idleT = 0; game.bark('trudy', 'idle'); }
      for (const gst of isl.guests) { if (!sp && Math.hypot(gst.x - isl.px, gst.z - isl.pz) < 3 && (gst.lastTalk ?? -99) < game.sim - 25) { gst.lastTalk = game.sim; const key = gst.name.includes('Margaret') ? 'margaret' : gst.name.includes('Kevin') ? 'kevin' : gst.name.includes('Sandra') ? 'sandra' : gst.name.includes('Paul') ? 'paul' : 'gerald'; game.bark('guests', key); } }
      if (I.mouseButtons & 2) { const d = I.px - (this.lastPx ?? I.px); this.cam.yaw -= d * 0.006; } this.lastPx = I.px;
    },
    frame(dt) {
      const isl = game.island; const c = game.gfx.camera; const p = isl.root.localToWorld(new THREE.Vector3(isl.px, 1.5, isl.pz)); if (!isFinite(p.x)) return; const cp = this.cam;
      const tp = new THREE.Vector3(p.x + Math.sin(cp.yaw) * cp.dist * Math.cos(cp.pitch), p.y + cp.dist * Math.sin(cp.pitch) + 1, p.z + Math.cos(cp.yaw) * cp.dist * Math.cos(cp.pitch)); c.position.lerp(tp, 1 - Math.exp(-6 * dt)); c.lookAt(p);
      const f = this.focus; if (f && !game.speechBlock) { const v = isl.root.localToWorld(new THREE.Vector3(f.x, 2.5, f.z)).project(c); this.label.style.display = 'block'; this.label.style.left = (v.x * 0.5 + 0.5) * innerWidth + 'px'; this.label.style.top = (-v.y * 0.5 + 0.5) * innerHeight + 'px'; this.label.innerHTML = `${esc(f.label)}<small>${ui.g('ok')} Use</small>`; } else this.label.style.display = 'none';
    },
  };
  game.useHotspot = (h) => {
    const p = game.profile; if (game.busy && h.id !== 'jar') { game.say('trudy', 'The Check-In first, please. It is only three tests.'); return; } if (h.id === 'board') return game.go('plan'); if (h.id === 'jar') { game.bark('trudy', 'marbles'); return; }
    if (h.id === 'bed') return game.goToBed(); if (h.id === 'mirror') { game.screenOrigin = 'island'; return game.go('mirror'); } if (h.id === 'gazebo') return game.go('group');
    if (h.id === 'lighthouse' && (p.day < 5 || p.doneToday.length < 2)) { game.say('trudy', 'The Grand Hold is for Level Day, when the other two classes are done. Until then the lighthouse is just leaning.'); return; }
    const E = byId(h.id); if (!E) { game.bark('trudy', 'idle'); return; }
    const today = game.todaysClasses().includes(h.id); if (!today && !p.met.includes(h.id)) { game.say('trudy', "That one is not on today's plan, and we haven't met it yet. Try the Notice Board."); return; }
    game.startEvent(h.id, { programme: today, tier: game.tierFor(h.id) });
  };
  game.tierFor = (id) => (game.isMaintenance() ? (game.profile.bestTier[id] || 0) : 0);
  // ---- plan
  S.plan = {
    enter() {
      const p = game.profile, cl = game.todaysClasses(); const d = game.programmeDays()[p.day - 1];
      ui.set(`<div class="center" style="height:100%"><div class="sign big">Today's Plan</div><div class="hint" style="color:#fff;-webkit-text-stroke:calc(var(--u)*4) var(--ink);paint-order:stroke fill;margin:12px">Day ${p.day}${d ? ' · ' + esc(d.name) : ' · Maintenance'}</div><div class="cards" id="pc"></div></div>`);
      const items = cl.map((id) => { const E = byId(id); const done = p.doneToday.includes(id); return { html: `<b>${esc(E.title)}</b><small>${esc(E.discipline)}</small>${done ? '<span class="stamp" style="font-size:calc(var(--u)*50)">Done</span>' : `<small>${esc(E.intro.line.slice(0, 60))}…</small>`}`, cls: 'card' + (done ? ' done' : ''), ok: () => game.startEvent(id, { programme: true, tier: game.tierFor(id) }) }; });
      items.push({ label: 'Back to the island', ok: () => game.go('island', {}) }); ui.menuOf(document.getElementById('pc'), items.slice(0, 6), { onBack: () => game.go('island', {}) }); ui.setPrompts([['nav', 'Move'], ['ok', 'Choose'], ['back', 'Back']]);
    },
    refresh() { ui.setPrompts([['nav', 'Move'], ['ok', 'Choose'], ['back', 'Back']]); },
  };
  S.freeplay = {
    enter() { this.page = 0; this.draw(); },
    draw() {
      const p = game.profile; const open = REGISTRY.filter((E) => p.met.includes(E.id) || p.levelled); const per = 5; const pages = Math.max(1, Math.ceil(open.length / per));
      ui.set(`<div class="center" style="height:100%"><div class="sign big">Free Play</div><div class="cards" id="fp" style="margin-top:20px"></div></div>`);
      const items = open.slice(this.page * per, this.page * per + per).map((E) => ({ html: `<b>${esc(E.title)}</b><small>${esc(E.discipline)} · Tier ${(p.bestTier[E.id] || 0) + 1} open</small>`, cls: 'card', ok: () => game.pickTier(E.id) }));
      if (!open.length) items.push({ label: 'Nothing met yet. Start the programme.', ok: () => game.go('menu') });
      if (pages > 1) items.push({ label: `Page ${this.page + 1} of ${pages}`, left: () => { this.page = (this.page + pages - 1) % pages; this.draw(); }, right: () => { this.page = (this.page + 1) % pages; this.draw(); }, ok: () => { this.page = (this.page + 1) % pages; this.draw(); } });
      ui.menuOf(document.getElementById('fp'), items.slice(0, 6), { onBack: () => game.go(game.screenOrigin === 'island' ? 'island' : 'menu') }); ui.setPrompts([['nav', 'Move'], ['ok', 'Choose'], ['back', 'Back']]);
    },
    refresh() { ui.setPrompts([['nav', 'Move'], ['ok', 'Choose'], ['back', 'Back']]); },
  };
  game.pickTier = (id) => { const p = game.profile; const top = Math.min(2, (p.bestTier[id] || 0)); if (top === 0) return game.startEvent(id, { tier: 0, free: true }); ui.set(`<div class="center" style="height:100%"><div class="sign big">${esc(game.eventTitle(id))}</div><div id="tm" style="margin-top:20px"></div></div>`); const names = ['Gentle', 'Honest', 'Unreasonable']; ui.menuOf(document.getElementById('tm'), names.slice(0, top + 1).map((n, i) => ({ label: 'Tier ' + (i + 1) + ': ' + n, ok: () => game.startEvent(id, { tier: i, free: true }) })), { onBack: () => game.go('freeplay') }); };
  // ---- events: intro, play, results
  game.makeLanes = (opts) => {
    if (opts.lanes) return opts.lanes; const p = game.profile; const dev = I.lastDevice === 'pad' ? 'pad' + I.lastPad : 'kbm';
    return [{ kind: 'local', dev, name: p ? p.name : 'Guest', paint: p ? p.paint : 0, hat: p ? p.hat : 0, colorIdx: 0 }];
  };
  game.startEvent = (id, opts = {}) => {
    const E = byId(id); if (!E) return; game.eventOpts = Object.assign({}, opts, { id }); game.wipe(() => game.go('intro', game.eventOpts));
  };
  game.buildEvent = (opts) => {
    const E = byId(opts.id); game.setScene('stage', { palette: opts.palette || E.palette || 'noon', music: E.music || 'balance' });
    const lanes = game.makeLanes(opts); game.gfx.stage.visible = true; game.gfx.islandCentre.value.set(40, 0, 40);
    const ev = new E(game, { tier: opts.tier || 0, lanes, seed: opts.seed || 1 + Math.floor(game.sim) % 97, session: !!opts.session, duration: opts.duration }); ev.attract = !!opts.attract; game.ev = ev; return ev;
  };
  S.intro = {
    enter(opts) {
      const ev = game.buildEvent(opts); const E = ev.cls; this.opts = opts; this.ev = ev; const who = E.instructor; ev.camSnap = true; ev.updateCamera(0.1);
      const tn = ['Gentle', 'Honest', 'Unreasonable'][ev.tier];
      ui.set(`<div class="center" style="height:100%;justify-content:flex-start"><div class="paper" style="max-width:62vw;text-align:left;margin-top:2vh"><div class="big">${esc(E.title)}</div><div class="hint">${esc(E.discipline)} · Tier ${ev.tier + 1}: ${tn}</div><div class="mid" style="margin:12px 0">${esc(E.intro.line)}</div><div style="font-size:calc(var(--u)*34)">✔ ${esc(E.intro.can)}<br>✘ ${esc(E.intro.cant)}</div></div></div>`);
      ui.setPrompts([...E.intro.prompts, ['ok', 'Begin'], ['back', 'Back']]); this.t = 0; game.audio.sfx('whoosh'); this.who = who;
      if (!opts.attract) game.bark(who === 'trudy' ? 'trudy' : who, who === 'trudy' ? 'intro' in game.lines('trudy') ? 'intro' : 'plan' : 'intro');
    },
    refresh() { ui.setPrompts([...this.ev.cls.intro.prompts, ['ok', 'Begin'], ['back', 'Back']]); },
    nav(a) { if (a === 'ok' || a === 'sq') { game.endSpeech(); game.beginPlay(); } else if (a === 'back') { game.disposeEvent(); game.wipe(() => game.go(game.eventOpts.programme || game.screenOrigin === 'island' ? 'island' : 'menu', {})); } },
    frame(dt) { if (game.ev) game.ev.frame(dt); },
  };
  game.lines = (who) => (window.__LINES || {})[who] || {};
  game.beginPlay = () => { const ev = game.ev; ui.clear(); game.go('play'); ev.begin(); game.buildHud(); game.showHud(true); game.endSpeech(); };
  S.play = {
    enter() { game.paused = false; this.done = 0; this.msgT = 0; },
    exit() { },
    prompts() { return game.ev ? game.ev.prompts() : null; },
    fixed(dt) { const ev = game.ev; if (!ev || (game.eventOpts && game.eventOpts.checkin)) return; if (ev.phase === 'done') { this.done += dt; if (this.done > 1.8 && !game.attract) game.showResults(); else if (this.done > 1.2 && game.attract) game.attractNext && game.attractNext(); } },
    nav() { },
  };
  game.openPause = (msg) => { if (game.paused) return; if (game.session) { game.openSessionOverlay && game.openSessionOverlay(); return; } game.pausedFrom = game.screenName; game.paused = true; game.scrBefore = game.scr; game.go('pause', { msg }); };
  game.closePause = () => { game.paused = false; const from = game.pausedFrom; game.go(from); if (from === 'play') { game.showHud(true); } };
  game.restartEvent = () => { const o = game.eventOpts; game.paused = false; game.disposeEvent(); game.wipe(() => game.go('intro', o)); };
  game.leaveClass = () => { game.paused = false; const o = game.eventOpts || {}; if (game.ev) { game.disposeEvent(); game.showHud(false); game.wipe(() => (game.profile ? game.go('island', {}) : game.go('menu'))); } else { game.wipe(() => game.go('title')); } };
  game.leaveMirror = () => game.go('island', { at: 'mirror' });
  // ---- results
  game.resultFor = (ev) => ev.laneResult(0);
  game.showResults = () => {
    const ev = game.ev; if (!ev) return; const opts = game.eventOpts; const res = ev.lanes.map((l, i) => ev.laneResult(i)); const r0 = res[0]; const p = game.profile; const E = ev.cls; game.showHud(false);
    if (opts.group) return game.groupResults(ev, res); let marbles = 0; const mins = ev.duration / 60;
    if (p && !game.session) { const first = !p.met.includes(E.id); if (first) p.met.push(E.id); const prev = p.medals[E.id]; if (prev === undefined || r0.medal > prev) p.medals[E.id] = r0.medal; p.minutes = (p.minutes || 0) + mins;
      const tierBest = p.bestTier[E.id] || 0; if (ev.tier === tierBest && ((ev.tier === 0 && r0.medal >= 2) || (ev.tier === 1 && r0.medal >= 3)) && tierBest < 2) { p.bestTier[E.id] = tierBest + 1; this.tierOpened = true; }
      if (opts.programme && !p.doneToday.includes(E.id)) { marbles = Math.max(2, Math.round(tuning.marblesPerMinute * mins)) + MEDAL_BONUS[r0.medal] + (first ? 2 : 0); p.doneToday.push(E.id); if (!game.isMaintenance()) p.step++; }
      game.persist(); }
    game.pendingMarbles = marbles; game.go('results', { res, opts, ev, marbles, medal: r0.medal });
  };
  S.results = {
    enter({ res, opts, ev, marbles, medal }) {
      const E = ev.cls; const r = res[0]; const who = E.instructor; game.audio.sfx('sting', medal); this.opts = opts; this.marbles = marbles;
      ui.set(`<div class="center" style="height:100%;justify-content:flex-start"><div class="paper center" style="margin-top:1vh;padding:calc(var(--u)*14) calc(var(--u)*60)"><div class="sign big" style="font-size:calc(var(--u)*70)">${esc(E.title)}</div><div class="stamp" style="margin:calc(var(--u)*14);font-size:calc(var(--u)*80)">${MEDALS[medal]}</div><div class="huge" style="font-size:calc(var(--u)*120)">${Math.round(r.form)}</div><div class="mid">Form · ${r.falls} floor exercise${r.falls === 1 ? '' : 's'}${marbles ? ' · +' + marbles + ' marbles' : ''}</div><div id="rm" class="row" style="margin-top:calc(var(--u)*10)"></div></div></div>`);
      const items = [{ label: 'Retry', ok: () => game.restartEvent() }, { label: marbles ? 'Marbles!' : 'Continue', ok: () => game.afterResults() }];
      ui.menuOf(document.getElementById('rm'), items, { start: 1, onBack: () => game.afterResults() }); ui.setPrompts([['nav', 'Move'], ['ok', 'Choose']]);
      const k = medal >= 3 ? 'good' : medal >= 2 ? 'res' : medal >= 1 ? 'res' : 'res'; game.bark(who === 'trudy' ? 'trudy' : who, who === 'trudy' ? (medal >= 2 ? 'goodRes' : medal >= 1 ? 'okRes' : 'badRes') : 'res');
    },
    refresh() { ui.setPrompts([['nav', 'Move'], ['ok', 'Choose']]); },
  };
  game.afterResults = () => {
    const m = game.pendingMarbles || 0; const o = game.eventOpts; game.pendingMarbles = 0; game.disposeEvent(); game.endSpeech();
    const nextStep = () => { if (o.id === 'grandHold' && o.programme && !game.profile.levelled) return game.playEnding(); game.go('island', { at: o.id }); const p = game.profile; if (p && game.todaysClasses().every((c) => p.doneToday.includes(c)) && !game.dayDoneSaid) { game.say('trudy', 'That is the whole plan. The bed hut is open. I will pretend not to hope.'); } };
    game.wipe(() => { if (m > 0) game.go('jar', { n: m, next: nextStep, medal: game.lastMedal }); else nextStep(); });
  };
  // ---- jar
  S.jar = {
    enter({ n, next, medal }) {
      game.setScene('stage', { palette: 'golden', music: 'island' }); this.next = next; this.n = n; this.spawned = 0; this.t = 0; this.pw = new PhysWorld(9.81); const w = this.pw.world;
      const base = w.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.2, 0)); w.createCollider(RAPIER.ColliderDesc.cylinder(0.2, 1.05).setFriction(0.3).setRestitution(0.35), base);
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a + Math.PI / 2); const b = w.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(Math.cos(a) * 1.12, 1.2, Math.sin(a) * 1.12).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })); w.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 1.4, 0.04), b); }
      this.bodies = []; this.group = new THREE.Group(); game.gfx.stage.add(this.group);
      const pts = [[0.01, 0], [1, 0.02], [1.08, 0.12], [1.08, 1.9], [0.86, 2.2], [0.86, 2.45], [0.95, 2.5]].map((q) => new THREE.Vector2(q[0], q[1])); this.group.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 28), new THREE.MeshBasicNodeMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })));
      for (const [r, y] of [[1.08, 0.12], [1.08, 1.9], [0.86, 2.2], [0.95, 2.5]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 28), toon('#1A1420')); t.rotation.x = Math.PI / 2; t.position.y = y; this.group.add(t); }
      const g2 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 24), game.mat('#C99A62')); g2.position.y = -0.35; this.group.add(g2);
      const prior = game.profile.marbleList || []; this.inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 10, 8), toon('#ffffff'), 300); this.inst.count = 0; this.inst.frustumCulled = false; this.group.add(this.inst); this.cols = []; this.settled = []; const medalCol = game.lastMedalIdx ?? 1;
      const p = game.profile; this.startMarbles = p.marbles; this.colors = ['#B8C0C8', '#6FB7FF', '#FFC83D', '#FF6FB5', '#B05CFF'];
      const pr = game.lastMedalIdx ?? 1; this.mc = pr; this.prior = prior.slice(-60);
      this.prior.forEach((m, i) => this.addMarble(m, true));
      ui.set(`<div class="center" style="height:100%;justify-content:flex-end"><div class="paper big" id="jc" style="margin-bottom:8vh">${p.marbles}</div></div>`); this.jc = document.getElementById('jc');
      const c = game.gfx.camera; c.position.set(0, 2.4, 6.2); c.lookAt(0, 1.2, 0); c.fov = 38; c.updateProjectionMatrix(); this.count = p.marbles; ui.setPrompts([['ok', 'Skip']]); this.dummy = new THREE.Matrix4();
    },
    addMarble(m, quiet) { const i = this.bodies.length; const b = this.pw.body(RAPIER.RigidBodyDesc.dynamic().setTranslation((Math.sin(i * 2.4)) * 0.4, quiet ? 0.3 + (i % 20) * 0.1 : 3.6, Math.cos(i * 2.4) * 0.4).setCanSleep(false)); this.pw.world.createCollider(RAPIER.ColliderDesc.ball(0.14).setRestitution(0.35).setFriction(0.3).setMass(0.1), b); this.bodies.push(b); this.cols.push(m); this.inst.setColorAt(i, new THREE.Color(this.colors[m])); if (this.inst.instanceColor) this.inst.instanceColor.needsUpdate = true; this.inst.count = this.bodies.length; },
    fixed(dt) {
      this.t += dt; const p = game.profile; if (this.spawned < this.n && this.t > 0.5 && Math.floor((this.t - 0.5) / 0.05) >= this.spawned) { this.addMarble(game.lastMedalIdx ?? 1); this.spawned++; p.marbles++; p.marbleList = (p.marbleList || []).concat([game.lastMedalIdx ?? 1]).slice(-220); this.jc.textContent = p.marbles; game.audio.sfx('marble'); if (this.spawned % 6 === 0) game.rumble({ kind: 'local', dev: game.input.lastDevice === 'pad' ? 'pad' + game.input.lastPad : 'kbm' }, 0.15, 40);
        const un = UNLOCKS.find((u) => u.at <= p.marbles && u.at > p.marbles - 1); if (un) { ui.toast('Unlocked: ' + un.name); game.audio.sfx('unlock'); } }
      this.pw.step(); for (let i = 0; i < this.bodies.length; i++) { const t = this.bodies[i].translation(); this.dummy.setPosition(t.x, t.y, t.z); this.inst.setMatrixAt(i, this.dummy); } this.inst.instanceMatrix.needsUpdate = true;
      if (this.spawned >= this.n && this.t > 0.5 + this.n * 0.05 + 1.6) this.finish();
    },
    nav(a) { if (a === 'ok' || a === 'back') this.finish(); },
    finish() { if (this.fin) return; this.fin = true; const p = game.profile; while (this.spawned < this.n) { this.spawned++; p.marbles++; p.marbleList = (p.marbleList || []).concat([game.lastMedalIdx ?? 1]).slice(-220); } game.persist(); game.wipe(() => this.next()); },
    exit() { this.fin = false; if (this.pw) { this.pw.free(); this.pw = null; } if (this.group) this.group.removeFromParent(); },
    refresh() { ui.setPrompts([['ok', 'Skip']]); },
  };
  // ---- bed, days
  game.goToBed = () => {
    const p = game.profile; const cl = game.todaysClasses(); const allDone = cl.every((c) => p.doneToday.includes(c));
    game.run(function* () {
      if (!p.checkedIn) { yield game.say('trudy', 'The Check-In first, please. It is only three tests.'); return; }
      if (!allDone) { yield game.say('trudy', game.line('trudy', 'bedSkip')); }
      yield game.say('trudy', game.line('trudy', 'bed')); game.nextDay();
    });
  };
  game.nextDay = () => {
    const p = game.profile; (p.calendar = p.calendar || []).push(p.day); p.day++; p.doneToday = []; p.checkedIn = false; game.persist(); game.audio.sfx('stamp'); game.audio.sfx('creak');
    game.wipe(() => { game.go('island', { fresh: true }); game.run(function* () { yield* game.morning(); }); }, 0.6);
  };
}
