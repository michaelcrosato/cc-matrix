import * as THREE from 'three/webgpu';
import { el, esc } from '../ui/dom.js';
import { TITLE, SEAT_COLORS } from '../data/config.js';
import { genName } from '../data/names.js';
import { rng } from '../core/rng.js';
import { PAINTS, HATS, createDoll } from '../art/doll.js';
import { Rig } from '../anim/rig.js';
import { blankProfile, defaultSettings } from '../core/save.js';
import { hatLocked, paintLocked, UNLOCKS } from '../data/unlocks.js';
import { tuning } from '../data/tuning.js';
import ABOUT from '../data/about.json';

const slider = (label, val, min, max, step = 1) => `<div class="slider"><span style="min-width:calc(var(--u)*330);text-align:left">${esc(label)}</span><span class="bar"><i style="width:${Math.round((val - min) / (max - min) * 100)}%"></i></span><span style="min-width:calc(var(--u)*90)">${val}</span></div>`;
export function install(game) {
  const S = game.screens, ui = game.ui, audio = game.audio, I = game.input;
  const back = (to) => () => game.go(to);
  // ---------- title
  S.title = {
    enter() {
      game.setScene('island', { palette: 'dawn', music: 'levelBest' });
      game.island.setTiltStatic(9); this.t = 0;
      ui.set(`<div class="center" style="height:100%;justify-content:space-between"><div style="margin-top:3vh"><div class="sign huge" id="beam" style="font-size:calc(var(--u)*170)">${esc(TITLE)}</div><div class="mid" style="margin-top:calc(var(--u)*14);color:#fff;-webkit-text-stroke:calc(var(--u)*5) var(--ink);paint-order:stroke fill;font-weight:700">The Level Best Retreat</div></div><div class="paper mid" id="press" style="margin-bottom:6vh"></div></div>`);
      this.refresh(); game.gfx.camera.fov = 38;
      if (game.touchOnly) game.showTouchOnly();
    },
    refresh() { const p = document.getElementById('press'); if (p && !game.touchOnly) p.innerHTML = `Press ${ui.g('ok')} to start`; },
    nav(a) { if (a === 'ok' || a === 'pause' || a === 'tri' || a === 'sq') { audio.wake(); audio.sfx('uiOk'); game.go('menu'); } },
    fixed() { },
    frame(dt) { this.t += dt; const c = game.gfx.camera, a = 0.5 + Math.sin(this.t * 0.15) * 0.25; c.position.set(Math.sin(a) * 40, 9, Math.cos(a) * 40); c.lookAt(0, 4, 0); const b = document.getElementById('beam'); if (b) b.style.transform = `rotate(${-1 + Math.sin(this.t * 0.5) * 0.5 + 3.5}deg) translateX(${Math.sin(this.t * 0.7) * 6}px)`; },
  };
  // ---------- main menu
  S.menu = {
    enter() {
      game.setScene('island', { palette: 'dawn', music: 'levelBest' }); game.island.setTiltStatic(9);
      const has = game.profile && game.profile.day > 1 || (game.profile && game.profile.step > 0);
      ui.set('<div class="left" style="height:100%;padding-left:6vw"><div class="sign big" style="margin-bottom:calc(var(--u)*20)">' + esc(TITLE) + '</div><div id="mn"></div></div>');
      const items = [
        { label: game.profile ? (has ? 'Continue' : 'Programme') : 'Programme', sub: game.profile ? game.profile.name : 'Who is here today?', id: 'programme', ok: () => (game.profile ? game.startProgramme() : game.go('profiles', { next: 'programme' })) },
        { label: 'Group Class', sub: '1-4 players, one screen', id: 'group', ok: () => game.go('group') },
        { label: 'Free Play', sub: 'Any class you have met', id: 'free', ok: () => (game.profile ? game.go('freeplay') : game.go('profiles', { next: 'free' })) },
        { label: 'Journal', id: 'journal', ok: () => (game.profile ? game.go('journal') : game.go('profiles', { next: 'journal' })) },
        { label: 'Settings', id: 'settings', ok: () => game.go('settings', { from: 'menu' }) },
        { label: 'About / Credits', id: 'about', ok: () => game.go('about') },
      ];
      ui.menuOf(document.getElementById('mn'), items, { onBack: () => game.go('title') }); ui.setPrompts([['nav', 'Move'], ['ok', 'Choose'], ['back', 'Back']]);
    },
    refresh() { ui.setPrompts([['nav', 'Move'], ['ok', 'Choose'], ['back', 'Back']]); },
    frame(dt) { S.title.frame.call(this, dt); },
    t: 0,
  };
  // ---------- who's here
  S.profiles = {
    enter(args) {
      this.args = args || {}; game.setScene('island', { palette: 'dawn', music: 'levelBest' }); this.mode = 'pick'; this.draw();
    },
    draw() {
      const ps = game.saveData.profiles; ui.set('<div class="center" style="height:100%"><div class="sign big">Who\'s here today?</div><div class="row" id="mats" style="margin-top:calc(var(--u)*40);align-items:flex-start"></div></div>');
      const items = ps.map((p, i) => ({ html: p ? `<span class="ring" style="background:${PAINTS[p.paint % PAINTS.length].c}"></span> ${esc(p.name)}<small>Day ${p.day} · ${p.marbles} marbles</small>` : `<span class="hint">Empty mat</span><br>New guest`, cls: 'mat', ok: () => (p ? this.choose(i) : this.create(i)) }));
      ui.menuOf(document.getElementById('mats'), items, { onBack: back('menu') }); ui.setPrompts([['nav', 'Move'], ['ok', 'Choose'], ['back', 'Back']]);
    },
    choose(i) { game.selectProfile(i); const n = this.args.next; if (n === 'free') game.go('freeplay'); else if (n === 'journal') game.go('journal'); else game.startProgramme(); },
    create(i) {
      const r = rng('names:' + i + ':' + game.sim.toFixed(2)); this.draft = { slot: i, name: genName(r), paint: [0, 1, 2, 3][i % 4], r };
      ui.set(`<div class="center" style="height:100%"><div class="sign big">Name and paint</div><div class="paper" style="margin:calc(var(--u)*30)" id="nm"></div><div id="nmenu"></div></div>`);
      const upd = () => { document.getElementById('nm').innerHTML = `<span class="ring" style="background:${PAINTS[this.draft.paint].c};width:calc(var(--u)*50);height:calc(var(--u)*50)"></span> <span class="big">${esc(this.draft.name)}</span>`; };
      upd();
      const items = [
        { label: 'Another name', ok: () => { this.draft.name = genName(this.draft.r); upd(); } },
        { label: 'Paint', sub: PAINTS[this.draft.paint].name + '   ◀ ▶', id: 'paint', left: () => { this.draft.paint = (this.draft.paint + 3) % 4; upd(); ui.menu.update(1, `Paint<small>${PAINTS[this.draft.paint].name}   ◀ ▶</small>`); }, right: () => { this.draft.paint = (this.draft.paint + 1) % 4; upd(); ui.menu.update(1, `Paint<small>${PAINTS[this.draft.paint].name}   ◀ ▶</small>`); }, ok: () => { this.draft.paint = (this.draft.paint + 1) % 4; upd(); ui.menu.update(1, `Paint<small>${PAINTS[this.draft.paint].name}   ◀ ▶</small>`); } },
        { label: 'Accept', ok: () => { const d = this.draft; const p = blankProfile(d.name, d.paint); game.saveData.profiles[d.slot] = p; game.saveData.last = d.slot; game.persist(); this.choose(d.slot); } },
      ];
      ui.menuOf(document.getElementById('nmenu'), items, { onBack: () => this.draw() }); ui.setPrompts([['nav', 'Move'], ['ok', 'Choose'], ['back', 'Back']]);
    },
    refresh() { ui.setPrompts([['nav', 'Move'], ['ok', 'Choose'], ['back', 'Back']]); },
  };
  // ---------- settings
  const PAGES = ['Sound', 'Controls', 'Display', 'Game'];
  S.settings = {
    enter(args) { this.from = (args && args.from) || 'menu'; this.page = 0; this.pause = args && args.pause; this.draw(); },
    draw(keep = 0) {
      const s = game.settings; const set = (k, v, lo, hi) => { s[k] = Math.max(lo, Math.min(hi, v)); game.applySettings(); game.persist(); };
      ui.set('<div class="left" style="height:100%;padding-left:6vw"><div class="sign big">Settings</div><div id="sm" style="margin-top:calc(var(--u)*20);min-width:calc(var(--u)*1100)"></div></div>');
      const it = [{ cls: 'pager', html: `Page: <b>${PAGES[this.page]}</b> ◀ ▶`, left: () => { this.page = (this.page + 3) % 4; this.draw(0); }, right: () => { this.page = (this.page + 1) % 4; this.draw(0); }, ok: () => { this.page = (this.page + 1) % 4; this.draw(0); } }];
      const sl = (k, label, lo = 0, hi = 100, st = 5) => ({ html: slider(label, s[k], lo, hi), left: () => { set(k, s[k] - st, lo, hi); this.draw(ui.menu.i); }, right: () => { set(k, s[k] + st, lo, hi); this.draw(ui.menu.i); }, ok: () => { set(k, s[k] + st > hi ? lo : s[k] + st, lo, hi); this.draw(ui.menu.i); } });
      const tg = (k, label, opts) => ({ html: `${esc(label)}: <b>${esc(opts[s[k]] ?? String(s[k]))}</b>`, left: () => { cyc(k, -1, opts); }, right: () => { cyc(k, 1, opts); }, ok: () => { cyc(k, 1, opts); } });
      const cyc = (k, d, opts) => { const keys = Object.keys(opts); const cur = keys.findIndex((x) => String(x) === String(s[k])); const nx = keys[(cur + d + keys.length) % keys.length]; s[k] = typeof s[k] === 'number' ? Number(nx) : nx === 'true' ? true : nx === 'false' ? false : nx; game.applySettings(); game.persist(); this.draw(ui.menu.i); };
      if (this.page === 0) it.push(sl('music', 'Music'), sl('sound', 'Sound'), sl('voice', 'Voice'));
      if (this.page === 1) it.push(tg('glyphs', 'Glyphs', { ps: 'PlayStation', xbox: 'Xbox' }), tg('rumble', 'Rumble', { true: 'On', false: 'Off' }), tg('autoBreathe', 'Auto-breathe', { false: 'Off', true: 'On' }), sl('rhythmOffset', 'Rhythm offset (ms)', -150, 150, 10));
      if (this.page === 2) it.push(sl('uiScale', 'UI scale', 80, 130, 5), sl('ink', 'Ink strength', 0, 100, 10), tg('reduceShake', 'Reduce shake', { false: 'Off', true: 'On' }), { html: 'Fullscreen', ok: () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) { /* ignore */ } } });
      if (this.page === 3) { it.push(tg('difficulty', 'Difficulty', { 0: 'Gentle', 1: 'Standard', 2: 'Honest' })); if (!game.session) it.push({ html: this.confirmReset ? 'Really reset? Press again' : 'Reset save', ok: () => { if (!this.confirmReset) { this.confirmReset = true; this.draw(ui.menu.i); } else { this.confirmReset = false; game.resetSave(); game.go('title'); } } }); }
      ui.menuOf(document.getElementById('sm'), it, { start: keep, onBack: () => { this.confirmReset = false; this.close(); } }); ui.setPrompts([['nav', 'Move'], ['ok', 'Change'], ['back', 'Back']]);
    },
    close() { if (this.from === 'pause') game.go('pause'); else if (this.from === 'session') game.closeSessionOverlay(); else game.go(this.from || 'menu'); },
    refresh() { ui.setPrompts([['nav', 'Move'], ['ok', 'Change'], ['back', 'Back']]); },
  };
  // ---------- about
  const A = ABOUT; const si = A.sourceInformation;
  const aboutPages = () => [
    ['Source Information', [['Date', si.date], ['Source', si.source], ['Plan', si.plan], ['Genre and Perspective', si.genre + '; ' + si.perspective]]],
    ['Source Information', [['Tech', si.tech], ['Art Direction', si.artDirection], ['Animation', si.animation]]],
    ['Source Information', [['Audio', si.audio], ['Online', si.online], ['Testing', si.testing]]],
    ['Source Information', [['Research', si.research], ['Environment', si.environment], ['Model', si.model], ['Usage', si.usage]]],
    ['Testing Feedback', ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'].map((q, i) => [q, A.testingFeedback[i]])],
    ['Engine Feedback', ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why? (none if nothing)', 'If you could change one thing about the engine, what would it be?'].map((q, i) => [q, A.engineFeedback[i]])],
    ['Prompt Feedback', ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'].map((q, i) => [q, A.promptFeedback[i]])],
    ['Credits', [[TITLE, A.aiHub.description], ['Fredoka', 'SIL Open Font License 1.1'], ['Three.js r180', 'MIT licence'], ['Rapier 0.19.3', 'Apache-2.0 licence'], ['Made for', 'AI Hub']]],
  ];
  S.about = {
    enter() { this.p = 0; this.sub = 0; this.draw(); },
    pages() { return aboutPages(); },
    draw() {
      const pg = aboutPages(); const [head, rows] = pg[this.p]; const per = rows.length > 3 ? 2 : rows.length; const chunks = []; for (let i = 0; i < rows.length; i += per) chunks.push(rows.slice(i, i + per)); this.sub = Math.min(this.sub, chunks.length - 1);
      const rs = chunks[this.sub];
      ui.set(`<div class="left" style="height:100%;padding:0 4vw"><div class="sign big">${esc(head)}</div><div class="paper" style="margin-top:calc(var(--u)*24);width:88vw" id="ab">${rs.map(([k, v]) => `<div class="mid" style="margin-bottom:calc(var(--u)*14)" data-about="${esc(k)}"><b>${esc(k)}:</b> ${esc(v)}</div>`).join('')}</div><div class="hint" style="margin-top:calc(var(--u)*14);color:#fff;-webkit-text-stroke:calc(var(--u)*4) var(--ink);paint-order:stroke fill">Page ${this.p + 1} of ${pg.length}${chunks.length > 1 ? ` · part ${this.sub + 1} of ${chunks.length}` : ''}</div></div>`);
      ui.setPrompts([['nav', 'Pages'], ['back', 'Back']]); this.chunks = chunks.length;
    },
    nav(a) { if (a === 'back') game.go('menu'); else if (a === 'right' || a === 'ok' || a === 'down') { if (this.sub < this.chunks - 1) this.sub++; else { this.p = (this.p + 1) % aboutPages().length; this.sub = 0; } this.draw(); audio.sfx('uiMove'); } else if (a === 'left' || a === 'up') { if (this.sub > 0) this.sub--; else { this.p = (this.p + aboutPages().length - 1) % aboutPages().length; this.sub = 0; } this.draw(); audio.sfx('uiMove'); } },
    refresh() { ui.setPrompts([['nav', 'Pages'], ['back', 'Back']]); },
  };
  // ---------- journal
  S.journal = {
    enter() { this.p = 0; this.draw(); },
    draw() {
      const pr = game.profile; if (!pr) return game.go('menu'); const meds = Object.entries(pr.medals); const perShelf = 8; const shelves = Math.max(1, Math.ceil(meds.length / perShelf)); const total = 2 + shelves + 1; this.total = total; let body = '', head = 'Journal';
      if (this.p === 0) { head = 'The Calendar'; body = `<div class="row">${Array.from({ length: Math.max(7, pr.day + 1) }, (_, i) => `<div class="paper" style="width:calc(var(--u)*170);padding:10px;text-align:center">Day ${i + 1}<br>${(pr.calendar || []).includes(i + 1) ? '<span class="stamp" style="font-size:calc(var(--u)*50)">Done</span>' : '&nbsp;'}</div>`).join('')}</div>`; }
      else if (this.p === 1) { head = 'Wobble Age'; const ages = pr.ages; const pts = ages.map((a, i) => `${60 + i * (ages.length > 1 ? 700 / (ages.length - 1) : 0)},${340 - (99 - a) / 81 * 300 * 0 - (99 - a) / 81 * 300 + 300 - 40}`); const first = ages[0], last = ages[ages.length - 1], best = ages.length ? Math.min(...ages) : null;
        body = `<svg viewBox="0 0 820 360" style="width:calc(var(--u)*1100);background:#FFF4DC;border:calc(var(--u)*6) solid var(--ink);border-radius:20px"><polyline fill="none" stroke="#1A1420" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" points="${ages.map((a, i) => `${60 + i * (ages.length > 1 ? 700 / (ages.length - 1) : 0)},${40 + (a - 18) / 81 * 280}`).join(' ')}"/>${ages.map((a, i) => `<circle cx="${60 + i * (ages.length > 1 ? 700 / (ages.length - 1) : 0)}" cy="${40 + (a - 18) / 81 * 280}" r="11" fill="#F5B700" stroke="#1A1420" stroke-width="4"/>`).join('')}</svg><div class="row mid" style="margin-top:calc(var(--u)*16)"><div class="paper">First <b>${first ?? '-'}</b></div><div class="paper">Latest <b>${last ?? '-'}</b></div><div class="paper">Best <b>${best ?? '-'}</b></div></div>`; }
      else if (this.p < 2 + shelves) { head = 'Medals Shelf'; const sl = meds.slice((this.p - 2) * perShelf, (this.p - 1) * perShelf); body = sl.length ? `<div class="row">${sl.map(([id, m]) => `<div class="paper" style="width:calc(var(--u)*400);text-align:center">${esc(game.eventTitle(id))}<br><b>${['Attended', 'Adequate', 'Pleasant', 'Exemplary', 'Suspicious'][m]}</b></div>`).join('')}</div>` : '<div class="paper mid">No medals yet. The shelf is patient.</div>'; }
      else { head = 'Silly Totals'; body = `<div class="paper mid" style="text-align:left">Floor Exercises: <b>${pr.floor || 0}</b><br>Minutes trained: <b>${Math.round(pr.minutes || 0)}</b><br>Marbles: <b>${pr.marbles}</b><br>Days attended: <b>${(pr.calendar || []).length}</b></div>`; }
      ui.set(`<div class="center" style="height:100%"><div class="sign big">${esc(head)}</div><div style="margin-top:calc(var(--u)*30)">${body}</div><div class="hint" style="margin-top:20px;color:#fff;-webkit-text-stroke:calc(var(--u)*4) var(--ink);paint-order:stroke fill">Page ${this.p + 1} of ${total}</div></div>`); ui.setPrompts([['nav', 'Pages'], ['back', 'Back']]);
    },
    nav(a) { if (a === 'back') game.go(game.island && game.screenOrigin === 'island' ? 'island' : 'menu'); else if (a === 'right' || a === 'ok') { this.p = (this.p + 1) % this.total; this.draw(); } else if (a === 'left') { this.p = (this.p + this.total - 1) % this.total; this.draw(); } },
    refresh() { ui.setPrompts([['nav', 'Pages'], ['back', 'Back']]); },
  };
  // ---------- the mirror
  S.mirror = {
    enter() {
      game.setScene('stage', { palette: 'noon', music: 'island' }); const pr = game.profile; this.paint = pr.paint; this.hat = pr.hat; this.rebuild(); this.draw();
      game.gfx.camera.position.set(1, 1.6, 5.5); game.gfx.camera.lookAt(1, 1.2, 0);
    },
    rebuild() { if (this.d) this.d.root.removeFromParent(); this.d = createDoll({ paint: this.paint, hat: this.hat }); this.rig = new Rig(this.d); this.rig.play('cheer', 0); this.d.root.position.x = 2.2; game.gfx.stage.add(this.d.root); if (!this.floor) { this.floor = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.3, 24), game.mat('#E8C890')); this.floor.position.set(2.2, -0.15, 0); game.gfx.stage.add(this.floor); } },
    draw() {
      const pr = game.profile; ui.set('<div class="left" style="height:100%;padding-left:5vw"><div class="sign big">The Mirror</div><div id="mm" style="margin-top:calc(var(--u)*20)"></div></div>', 'left');
      const lockP = paintLocked(this.paint, pr.marbles); const lockH = hatLocked(this.hat, pr.marbles);
      const it = [
        { html: `Paint: <b>${PAINTS[this.paint].name}</b>${paintLocked(this.paint, pr.marbles) ? ' 🔒' : ''} ◀ ▶`, left: () => this.chg('paint', -1), right: () => this.chg('paint', 1), ok: () => this.chg('paint', 1) },
        { html: `Hat: <b>${HATS[this.hat]}</b>${hatLocked(this.hat, pr.marbles) ? ' (needs ' + UNLOCKS.find((u) => u.kind === 'hat' && u.id === this.hat).at + ' marbles)' : ''} ◀ ▶`, left: () => this.chg('hat', -1), right: () => this.chg('hat', 1), ok: () => this.chg('hat', 1) },
        { label: 'Wear it', ok: () => { if (paintLocked(this.paint, pr.marbles) || hatLocked(this.hat, pr.marbles)) { ui.toast('Still locked: more marbles, please'); return; } pr.paint = this.paint; pr.hat = this.hat; game.persist(); game.leaveMirror(); } },
      ];
      ui.menuOf(document.getElementById('mm'), it, { start: ui.menu ? ui.menu.i : 0, onBack: () => game.leaveMirror() }); ui.setPrompts([['nav', 'Move'], ['ok', 'Choose'], ['back', 'Back']]);
    },
    chg(k, d) { if (k === 'paint') this.paint = (this.paint + d + PAINTS.length) % PAINTS.length; else this.hat = (this.hat + d + HATS.length) % HATS.length; this.rebuild(); this.draw(); audio.sfx('uiMove'); },
    frame(dt) { if (this.d) { this.d.root.rotation.y += dt * 0.9; this.rig.update(dt); } },
    exit() { if (this.d) this.d.root.removeFromParent(); this.d = null; if (this.floor) { this.floor.removeFromParent(); this.floor = null; } },
    refresh() { ui.setPrompts([['nav', 'Move'], ['ok', 'Choose'], ['back', 'Back']]); },
  };
  // ---------- pause
  S.pause = {
    enter(args) {
      game.paused = true; ui.set(`<div class="left" style="height:100%;padding-left:6vw"><div class="sign big">Paused</div>${args && args.msg ? `<div class="paper mid" style="margin-top:12px">${esc(args.msg)}</div>` : ''}<div id="pm" style="margin-top:calc(var(--u)*16)"></div></div>`);
      const inEvent = !!game.ev; const it = [{ label: 'Resume', ok: () => game.closePause() }];
      if (inEvent && !game.session) it.push({ label: 'Restart', ok: () => game.restartEvent() });
      it.push({ label: 'How to Play', ok: () => game.go('howto') }, { label: 'Settings', ok: () => game.go('settings', { from: 'pause' }) });
      if (!game.session) it.push({ label: 'Dev Mode', ok: () => game.go('dev', { page: 0 }) });
      if (!game.session) it.push({ label: inEvent ? 'Leave Class' : 'Back to Title', ok: () => game.leaveClass() });
      ui.menuOf(document.getElementById('pm'), it.slice(0, 6), { onBack: () => game.closePause() }); ui.setPrompts([['nav', 'Move'], ['ok', 'Choose'], ['back', 'Resume']]);
    },
    refresh() { ui.setPrompts([['nav', 'Move'], ['ok', 'Choose'], ['back', 'Resume']]); },
  };
  S.howto = {
    enter() { const ev = game.ev; const I2 = ev ? ev.cls.intro : null; ui.set(`<div class="center" style="height:100%"><div class="sign big">How to Play</div><div class="paper mid" style="margin-top:30px;max-width:80vw;text-align:left">${I2 ? `<b>${esc(ev.cls.title)}.</b> ${esc(I2.line)}<br><br>${esc(I2.can)}<br>${esc(I2.cant)}` : 'Shift your weight. Everything in this game reads the same Balance Dot. Lean with the left stick, WASD or the mouse. Feet: L2 / R2, Q / E or the mouse buttons. Hop: Cross or Space. Flail: Square or F. Breathe: R1 or Shift.'}</div></div>`); ui.setPrompts([['back', 'Back']]); },
    nav(a) { if (a === 'back' || a === 'ok') game.go('pause'); }, refresh() { ui.setPrompts([['back', 'Back']]); },
  };
}
