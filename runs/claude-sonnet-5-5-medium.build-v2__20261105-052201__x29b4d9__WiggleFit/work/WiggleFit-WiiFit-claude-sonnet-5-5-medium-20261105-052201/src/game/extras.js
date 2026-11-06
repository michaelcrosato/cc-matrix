import * as THREE from 'three/webgpu';
import { esc, el } from '../ui/dom.js';
import { REGISTRY, byId } from '../data/events.js';
import { TUNING_DEFS, tuning, resetTuning, tuningJSON } from '../data/tuning.js';
import { LINES } from '../data/dialogue.js';
import { TITLE, SEAT_COLORS } from '../data/config.js';
import { createDoll, PAINTS } from '../art/doll.js';
import { Rig } from '../anim/rig.js';
import { PALETTES } from '../data/palettes.js';
import { rng } from '../core/rng.js';
import { medalOf } from '../events/base.js';
import { CHECK_KINDS } from '../events/checkin.js';
import { Bot } from '../input/bot.js';
import { blankProfile } from '../core/save.js';

export function install(game) {
  const S = game.screens, ui = game.ui, audio = game.audio, I = game.input;
  // ---------- boot, start, touch-only
  S.boot0 = { enter() { game.setScene('island', { palette: 'dawn', music: null, instant: true }); ui.set('<div class="center" style="height:100%"><div class="sign big">Stretching...</div></div>'); }, nav() { } };
  game.begin = () => {
    game.touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
    const last = game.saveData.last; const p = game.saveData.profiles[last]; if (p) game.selectProfile(last);
    game.after(0.6, () => game.go('title'));
  };
  game.showTouchOnly = () => {
    const press = document.getElementById('press'); if (press) press.innerHTML = 'Controller or keyboard required';
    const b = el('button', 'tag', 'Settings'); b.id = 'touchSettings'; b.style.cssText = 'position:absolute;right:5vw;top:5vh'; b.addEventListener('click', () => game.go('settings', { from: 'title' })); b.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') game.go('settings', { from: 'title' }); }); ui.screen.appendChild(b);
  };
  // ---------- attract mode
  const VIGNETTES = ['fruitHat', 'poses', 'cairn', 'stepClass', 'plates', 'springboard', 'raft', 'roomService'];
  game.startAttract = () => {
    if (game.session || game.attract) return; game.attract = { i: 0, from: game.screenName }; game.god = true; game.attractVignette();
  };
  game.attractVignette = () => {
    const a = game.attract; if (!a) return; const list = ['island', ...VIGNETTES.filter((v) => byId(v))]; const id = list[a.i % list.length]; a.i++; game.killScripts();
    if (id === 'island') { game.showHud(false); game.ev && game.disposeEvent(); game.setScene('island', { palette: 'golden', music: 'island' }); if (!game.profile) { /* island without a profile uses a default look */ } game.island.setTiltStatic(9); game.island.group.visible = true; ui.set(attractOverlay()); game.screenName = 'attract'; game.scr = { frame: (dt) => { const c = game.gfx.camera; a.t = (a.t || 0) + dt; c.position.set(Math.sin(a.t * 0.2) * 34, 10, Math.cos(a.t * 0.2) * 34); c.lookAt(0, 3, 0); } }; game.after(8, () => { if (game.attract) game.attractVignette(); }); return; }
    game.showHud(false); game.ev && game.disposeEvent(); const E = byId(id); const n = id === 'raft' ? 4 : 1;
    const lanes = Array.from({ length: n }, (_, i) => ({ kind: 'bot', skill: ['sharp', 'average', 'clumsy', 'sharp'][i], name: ['Ada', 'Ben', 'Cy', 'Di'][i], paint: i, hat: i % 4, colorIdx: i }));
    game.eventOpts = { id, attract: true, lanes, tier: 0, duration: 18 }; const ev = game.buildEvent(game.eventOpts); ev.camSnap = true; game.screenName = 'play'; game.scr = { fixed: () => { if (ev.phase === 'done') { a.done = (a.done || 0) + 1 / 120; if (a.done > 1.4) { a.done = 0; game.attractVignette(); } } }, prompts: () => null }; ev.begin(); game.buildHud(); game.showHud(true); ui.setPrompts(null);
    ui.extra.innerHTML = attractOverlay(true);
    if (id === 'springboard') { /* bot dives */ }
  };
  const attractOverlay = (small) => `<div class="center" style="position:absolute;inset:0;justify-content:space-between;padding:4vh 5vw"><div class="sign mid" style="align-self:flex-start">${esc(TITLE)}</div><div class="paper mid" style="margin-bottom:2vh" id="demo">DEMO · Press ${ui.g('ok')}</div></div>`;
  game.exitAttract = () => {
    if (!game.attract) return; const from = game.attract.from; game.attract = null; game.god = false; game.killScripts(); game.showHud(false); game.ev && game.disposeEvent(); ui.extra.innerHTML = ''; game.gfx.camera.fov = 38; game.gfx.camera.updateProjectionMatrix(); game.idle = 0; game.input.resetAccum(); game.input.drainNav();
    game.screenName = 'x'; game.go('title');
  };
  // ---------- group class
  S.group = {
    t: 0, frame(dt) { S.title.frame.call(this, dt); },
    enter() { game.setScene('island', { palette: 'noon', music: 'levelBest' }); game.island.setTiltStatic(6); this.players = []; this.mode = 'lobby'; this.draw(); },
    draw() {
      const slots = [0, 1, 2, 3].map((i) => { const p = this.players[i]; return `<div class="paper mat center" style="width:calc(var(--u)*380);height:calc(var(--u)*300);border-color:${SEAT_COLORS[i]}"><div class="hint">Mat ${i + 1}</div><div class="mid">${p ? esc(p.name) : 'Empty'}</div><div class="hint">${p ? (p.dev === 'kbm' ? 'Keyboard + mouse' : 'Controller ' + (Number(p.dev.slice(3)) + 1)) : 'Press ' + ui.g('ok') + ' to join'}</div></div>`; }).join('');
      ui.set(`<div class="center" style="height:100%"><div class="sign big">Group Class</div><div class="row" style="margin-top:calc(var(--u)*30)">${slots}</div><div id="gm" style="margin-top:calc(var(--u)*20)"></div></div>`);
      const items = [{ label: 'Quick Class', sub: 'Three random events', ok: () => this.start(false) }, { label: 'Back', ok: () => game.go('menu') }];
      ui.menuOf(document.getElementById('gm'), items, { start: ui.menu ? ui.menu.i : 0, onBack: () => game.go('menu') }); ui.setPrompts([['ok', 'Join'], ['back', 'Leave']]);
    },
    nav(a, n) {
      const dev = n && n.dev === 'pad' ? 'pad' + n.pad : 'kbm'; const idx = this.players.findIndex((p) => p.dev === dev);
      if (a === 'ok' && idx < 0 && this.players.length < 4) { this.players.push({ dev, name: ['Margaret', 'Kevin', 'Sandra', 'Paul'][this.players.length], colorIdx: this.players.length, paint: this.players.length }); audio.sfx('uiOk'); this.draw(); }
      else if (a === 'back' && idx >= 0) { this.players.splice(idx, 1); this.players.forEach((p, i) => { p.colorIdx = i; p.paint = i; }); audio.sfx('uiBack'); this.draw(); }
    },
    refresh() { this.draw(); },
    start(pick) {
      if (!this.players.length) { ui.toast('Join first: press Use on a mat'); return; }
      const pool = REGISTRY.filter((E) => E.couch && E.id !== 'checkin'); const r = rng('group:' + game.sim.toFixed(1)); const ids = pool.map((e) => e.id); const list = []; while (list.length < Math.min(3, ids.length)) { const k = ids.splice(Math.floor(r() * ids.length), 1)[0]; list.push(k); }
      game.group = { players: this.players.map((p) => ({ ...p, points: 0, kind: 'local' })), list, i: 0 }; game.groupNext();
    },
  };
  game.groupNext = () => { const g = game.group; if (g.i >= g.list.length) return game.go('podium'); const id = g.list[g.i]; const lanes = g.players.map((p) => ({ kind: 'local', dev: p.dev, name: p.name, paint: p.paint, hat: 0, colorIdx: p.colorIdx })); game.eventOpts = { id, group: true, lanes, tier: 0 }; game.wipe(() => game.go('intro', game.eventOpts)); };
  game.groupResults = (ev, res) => {
    const g = game.group; const order = res.map((r, i) => [r.form, i]).sort((a, b) => b[0] - a[0]); order.forEach(([f, i], rank) => { g.players[i].points += [4, 3, 2, 1][rank] || 0; });
    ui.set(`<div class="center" style="height:100%"><div class="sign big">${esc(ev.cls.title)}</div><div class="paper mid" style="margin-top:calc(var(--u)*24);text-align:left">${order.map(([f, i], rank) => `<div style="color:${SEAT_COLORS[i]}"><b>${rank + 1}.</b> ${esc(g.players[i].name)} · ${Math.round(f)} form · ${g.players[i].points} pts</div>`).join('')}</div><div id="gr" style="margin-top:20px"></div></div>`);
    game.screenName = 'groupres'; game.scr = { nav() { }, prompts: () => [['ok', 'Next']] }; ui.menuOf(document.getElementById('gr'), [{ label: 'Next', ok: () => { game.disposeEvent(); g.i++; game.groupNext(); } }], {}); ui.setPrompts([['ok', 'Next']]);
  };
  S.podium = {
    enter() {
      game.setScene('stage', { palette: 'golden', music: 'levelBest' }); const g = game.group; const ranked = g.players.map((p, i) => ({ ...p, i })).sort((a, b) => b.points - a.points); this.dolls = []; this.t = 0; this.grp = new THREE.Group(); game.gfx.stage.add(this.grp);
      ranked.forEach((p, rank) => { const h = [1.8, 1.3, 0.9, 0.5][rank]; const x = [0, -2.2, 2.2, 4.4][rank]; const blk = new THREE.Mesh(new THREE.BoxGeometry(1.8, h, 1.8), game.mat(SEAT_COLORS[p.colorIdx])); blk.position.set(x, h / 2, 0); this.grp.add(blk); const d = createDoll({ paint: p.paint, hat: rank === 0 ? 6 : 0 }); d.root.position.set(x, h, 0); const rig = new Rig(d); rig.play(rank === 0 ? 'cheer' : 'idle', 0); this.grp.add(d.root); this.dolls.push({ d, rig, blk }); });
      ui.set(`<div class="center" style="height:100%;justify-content:flex-start"><div class="sign big">Final Podium</div><div class="paper mid" style="margin-top:12px">${ranked.map((p, r) => `<span style="color:${SEAT_COLORS[p.colorIdx]}">${r + 1}. ${esc(p.name)} ${p.points}</span>`).join(' · ')}</div></div>`); game.audio.sfx('sting', 3); ui.setPrompts([['ok', 'Done']]);
      const c = game.gfx.camera; c.position.set(1, 3.4, 10); c.lookAt(1, 2.3, 0);
    },
    fixed(dt) { this.t += dt; if (this.t > 5) { const k = Math.min(1, (this.t - 5) / 1.2); this.grp.rotation.z = k * 0.5; this.grp.position.x = k * 2; this.grp.position.y = -k * k * 3; if (!this.tipped) { this.tipped = true; audio.sfx('fall'); game.comic(null, 'WHOOPS', 1, 3, 1); } } },
    frame(dt) { for (const d of this.dolls) d.rig.update(dt); }, nav(a) { if (a === 'ok' || a === 'back') game.go('menu'); }, exit() { if (this.grp) this.grp.removeFromParent(); this.tipped = false; },
  };
  // ---------- dev mode
  const pagesDev = () => {
    const evIds = REGISTRY.map((e) => e.id); const mk = (label, fn, sub) => ({ label, ok: fn, sub });
    const cycleIdx = (k, n) => { game.dev[k] = ((game.dev[k] || 0) + 1) % n; };
    game.dev = game.dev || { ev: 0, tier: 0, day: 1, ts: 1, pal: 0, mus: 0, line: 0 };
    const tsV = [0.1, 0.25, 0.5, 1, 2, 4];
    const pages = [
      ['Jump', [
        { html: `Event: <b>${esc(game.eventTitle(evIds[game.dev.ev % evIds.length]))}</b> ◀ ▶`, left: () => { game.dev.ev = (game.dev.ev + evIds.length - 1) % evIds.length; game.devRedraw(); }, right: () => { cycleIdx('ev', evIds.length); game.devRedraw(); }, ok: () => { cycleIdx('ev', evIds.length); game.devRedraw(); } },
        { html: `Tier: <b>${game.dev.tier + 1}</b> ◀ ▶`, left: () => { game.dev.tier = (game.dev.tier + 2) % 3; game.devRedraw(); }, right: () => { game.dev.tier = (game.dev.tier + 1) % 3; game.devRedraw(); }, ok: () => { game.dev.tier = (game.dev.tier + 1) % 3; game.devRedraw(); } },
        mk('Go to event', () => { game.paused = false; game.disposeEvent(); game.ensureProfile(); game.startEvent(evIds[game.dev.ev % evIds.length], { tier: game.dev.tier, free: true }); }),
        { html: `Day: <b>${game.dev.day}</b> ◀ ▶`, left: () => { game.dev.day = Math.max(1, game.dev.day - 1); game.devRedraw(); }, right: () => { game.dev.day = Math.min(8, game.dev.day + 1); game.devRedraw(); }, ok: () => { game.dev.day = game.dev.day % 8 + 1; game.devRedraw(); } },
        mk('Go to day', () => { game.ensureProfile(); const p = game.profile; p.day = game.dev.day; p.doneToday = []; p.checkedIn = true; p.step = Math.min(game.totalSteps(), Math.max(0, game.programmeDays().slice(0, p.day - 1).reduce((a, d) => a + d.classes.length, 0))); game.paused = false; game.disposeEvent(); game.persist(); game.go('island', { fresh: true }); }),
        mk('Skip to Results', () => { if (game.ev) { for (const l of game.ev.lanes) l.form = Math.max(l.form, 80); game.paused = false; game.go('play'); game.ev.finish(); game.showHud(false); game.showResults(); } else ui.toast('No class running'); }),
      ]],
      ['Cheats', [
        { html: `God mode: <b>${game.god ? 'On' : 'Off'}</b>`, ok: () => { game.god = !game.god; game.devRedraw(); } },
        { html: `Time scale: <b>${tsV[game.dev.ts]}x</b> ◀ ▶`, left: () => { game.dev.ts = Math.max(0, game.dev.ts - 1); game.timeScale = tsV[game.dev.ts]; game.devRedraw(); }, right: () => { game.dev.ts = Math.min(5, game.dev.ts + 1); game.timeScale = tsV[game.dev.ts]; game.devRedraw(); }, ok: () => { game.dev.ts = (game.dev.ts + 1) % 6; game.timeScale = tsV[game.dev.ts]; game.devRedraw(); } },
        mk('Single step', () => { game.frozen = true; game.stepOnce = true; ui.toast('Stepped one tick. Resume to unfreeze.'); }),
        mk('Unfreeze', () => { game.frozen = false; }),
        mk('Let the bot play', () => { game.autoBot = 'sharp'; if (game.ev) for (const l of game.ev.lanes) if (l.kind === 'local') { l.kind = 'bot'; l.skill = 'sharp'; l.bot = new Bot('sharp', 3); } ui.toast('Bot playing'); }),
        mk('Skip to Ending', () => { game.ensureProfile(); game.paused = false; game.disposeEvent(); game.playEnding(); }),
      ]],
      ['View', [
        { html: `Free camera: <b>${game.freeCam ? 'On' : 'Off'}</b>`, ok: () => { game.freeCam = !game.freeCam; if (game.ev) game.ev.freeCam = game.freeCam; game.devRedraw(); } },
        { html: `Physics lines: <b>${game.debugOn ? 'On' : 'Off'}</b>`, ok: () => { game.toggleDebug(); game.devRedraw(); } },
        { html: `Stats: <b>${game.statsOn ? 'On' : 'Off'}</b>`, ok: () => { game.statsOn = !game.statsOn; game.devRedraw(); } },
        { html: `Input monitor: <b>${game.monitorOn ? 'On' : 'Off'}</b>`, ok: () => { game.monitorOn = !game.monitorOn; game.devRedraw(); } },
        { html: `Ink filter: <b>${(game.settings.ink ?? 100) > 0 ? 'On' : 'Off'}</b>`, ok: () => { game.settings.ink = game.settings.ink > 0 ? 0 : 100; game.applySettings(); game.devRedraw(); } },
        { html: `Palette: <b>${Object.keys(PALETTES)[game.dev.pal % 4]}</b> ◀ ▶`, left: () => { game.dev.pal = (game.dev.pal + 3) % 4; game.gfx.setPalette(Object.keys(PALETTES)[game.dev.pal]); game.devRedraw(); }, right: () => { game.dev.pal = (game.dev.pal + 1) % 4; game.gfx.setPalette(Object.keys(PALETTES)[game.dev.pal]); game.devRedraw(); }, ok: () => { game.dev.pal = (game.dev.pal + 1) % 4; game.gfx.setPalette(Object.keys(PALETTES)[game.dev.pal]); game.devRedraw(); } },
      ]],
      ['Force', [
        mk('Force a gust', () => { if (game.ev) { game.ev.forceGust ? game.ev.forceGust() : game.ev.lanes[0].bal && game.ev.lanes[0].bal.shove(3, 0, 0.5); } }),
        mk('Force a fall', () => { const l = game.ev && game.ev.lanes[0]; if (l && l.bal && !l.bal.fallen) game.ev.fallLane(l); }),
        mk('Force a fruit', () => { if (game.ev && game.ev.spawn) game.ev.spawn(game.ev.lanes[0]); else ui.toast('Not in Fruit Hat'); }),
        mk('Force a stone', () => { if (game.ev && game.ev.dropStone) game.ev.dropStone(game.ev.lanes[0]); else ui.toast('Not in The Cairn'); }),
        mk('Add 10 marbles', () => { game.ensureProfile(); game.profile.marbles += 10; game.persist(); ui.toast('Marbles: ' + game.profile.marbles); }),
        mk('Unlock all', () => { game.ensureProfile(); game.profile.marbles = Math.max(game.profile.marbles, 99); game.profile.met = REGISTRY.map((e) => e.id); for (const e of REGISTRY) game.profile.bestTier[e.id] = 2; game.persist(); ui.toast('Everything unlocked'); }),
      ]],
      ['Play', [
        mk('Play a Trudy line', () => { game.say('trudy', game.line('trudy', Object.keys(LINES.trudy).filter((k) => typeof LINES.trudy[k][0] === 'string')[game.dev.line++ % 20]), { block: false }); }),
        { html: `Music track ◀ ▶`, left: () => { audio.play(['levelBest', 'island', 'stillness', 'strength', 'cardio', 'balance', 'level'][(game.dev.mus = (game.dev.mus + 6) % 7)], 0); }, right: () => { audio.play(['levelBest', 'island', 'stillness', 'strength', 'cardio', 'balance', 'level'][(game.dev.mus = (game.dev.mus + 1) % 7)], 0); }, ok: () => { audio.play(['levelBest', 'island', 'stillness', 'strength', 'cardio', 'balance', 'level'][(game.dev.mus = (game.dev.mus + 1) % 7)], 0); } },
        mk('Sting: medal', () => audio.sfx('sting', 3)), mk('Sting: reveal', () => audio.sfx('reveal')),
        { html: `Wobble Age: <b>${game.profile && game.profile.ages.length ? game.profile.ages[game.profile.ages.length - 1] : '-'}</b> ◀ ▶`, left: () => game.devAge(-5), right: () => game.devAge(5), ok: () => game.devAge(-5) },
        mk('Reset save', () => { game.resetSave(); game.go('title'); }),
      ]],
      ['Data', [mk('Copy tuning as JSON', () => game.copyTuning()), mk('Reset all sliders', () => { resetTuning(); game.devRedraw(); }), mk('Go to title', () => { game.paused = false; game.disposeEvent(); game.go('title'); })]],
    ];
    const groups = {}; for (const k in TUNING_DEFS) (groups[TUNING_DEFS[k].group] = groups[TUNING_DEFS[k].group] || []).push(k);
    for (const [g, keys] of Object.entries(groups)) for (let i = 0; i < keys.length; i += 5) {
      const part = keys.slice(i, i + 5); pages.push([`Tuning: ${g}${keys.length > 5 ? ' ' + (i / 5 + 1) : ''}`, [...part.map((k) => { const d = TUNING_DEFS[k]; const fmt = (v) => (Math.abs(d.step) < 0.01 ? v.toFixed(4) : d.step < 1 ? v.toFixed(2) : String(v)); const chg = (s) => { tuning[k] = Math.max(d.min, Math.min(d.max, +(tuning[k] + s * d.step).toFixed(5))); game.devRedraw(); }; return { html: `<div class="slider"><span style="min-width:calc(var(--u)*430);text-align:left">${esc(d.label)}</span><span class="bar"><i style="width:${Math.round((tuning[k] - d.min) / (d.max - d.min) * 100)}%"></i></span><span style="min-width:calc(var(--u)*120)">${fmt(tuning[k])}</span></div>`, left: () => chg(-1), right: () => chg(1), ok: () => { tuning[k] = d.default; game.devRedraw(); } }; }), mk('Reset to defaults', () => { resetTuning(); game.devRedraw(); })]]);
    }
    return pages;
  };
  game.ensureProfile = () => { if (game.profile) return; let i = game.saveData.profiles.findIndex((p) => p); if (i < 0) { i = 0; game.saveData.profiles[0] = blankProfile('Dev Doll', 0); } game.selectProfile(i); };
  game.devAge = (d) => { game.ensureProfile(); const a = game.profile.ages; if (!a.length) a.push(60); a[a.length - 1] = Math.max(18, Math.min(99, a[a.length - 1] + d)); game.persist(); game.devRedraw(); };
  game.copyTuning = () => { const t = tuningJSON(); try { navigator.clipboard.writeText(t).then(() => ui.toast('Tuning copied'), () => showTuning(t)); } catch (e) { showTuning(t); } if (!navigator.clipboard) showTuning(t); };
  const showTuning = (t) => { const d = el('div', 'paper', `<div class="mid">Tuning (copy this)</div><textarea class="out" readonly>${esc(t)}</textarea>`); d.style.cssText = 'position:absolute;left:10vw;top:10vh;pointer-events:auto'; ui.extra.appendChild(d); game.after(8, () => d.remove()); };
  game.toggleDebug = () => { game.debugOn = !game.debugOn; if (!game.debugOn && game.debugLines) { game.debugLines.removeFromParent(); game.debugLines = null; } };
  S.dev = {
    enter(args) { this.p = (args && args.page) || 0; this.keep = 0; game.devRedraw = () => this.draw(); this.draw(); },
    draw() {
      const pages = pagesDev(); this.p = Math.min(this.p, pages.length - 1); const [name, items] = pages[this.p]; const keep = ui.menu ? ui.menu.i : 0;
      ui.set(`<div class="left" style="height:100%;padding-left:5vw"><div class="sign big">Dev Mode</div><div class="hint" style="color:#fff;-webkit-text-stroke:calc(var(--u)*4) var(--ink);paint-order:stroke fill;margin:8px 0">Page ${this.p + 1} of ${pages.length}: ${esc(name)}</div><div id="dm" style="min-width:calc(var(--u)*1100)"></div></div>`);
      const all = [{ cls: 'pager', html: `Page: <b>${esc(name)}</b> ◀ ▶`, left: () => { this.p = (this.p + pages.length - 1) % pages.length; ui.menu = null; this.draw(); }, right: () => { this.p = (this.p + 1) % pages.length; ui.menu = null; this.draw(); }, ok: () => { this.p = (this.p + 1) % pages.length; ui.menu = null; this.draw(); } }, ...items.slice(0, 6)];
      ui.menuOf(document.getElementById('dm'), all, { start: Math.min(keep, all.length - 1), onBack: () => game.go('pause') }); ui.setPrompts([['nav', 'Move'], ['ok', 'Choose'], ['back', 'Back']]);
    },
    refresh() { ui.setPrompts([['nav', 'Move'], ['ok', 'Choose'], ['back', 'Back']]); },
  };
  // stats / monitor overlay + physics lines
  game.devOverlay = () => {
    let o = document.getElementById('devov'); if (!game.statsOn && !game.monitorOn) { if (o) o.remove(); return; } if (!o) { o = el('div', 'paper'); o.id = 'devov'; o.style.cssText = 'position:absolute;right:3vw;bottom:14vh;font-size:calc(var(--u)*30);line-height:1.2;pointer-events:none'; ui.extra.appendChild(o); }
    const i = game.input; const s = i.dev(i.lastDevice === 'pad' ? 'pad' + i.lastPad : 'kbm'); let h = ''; if (game.statsOn) h += `fps ${game.fpsStat.fps.toFixed(0)} · bodies ${game.ev ? game.ev.bodyCount() : 0} · step ${game.ev ? 'ok' : '-'}<br>`; if (game.monitorOn) h += `device ${i.lastDevice} · stick ${s.stickX?.toFixed(2) ?? 0},${s.stickY?.toFixed(2) ?? 0} · L ${s.L.toFixed(2)} R ${s.R.toFixed(2)}`; o.innerHTML = h;
  };
  const f0 = game.frame.bind(game); game.frame = (dt) => { f0(dt); if (game.statsOn || game.monitorOn || document.getElementById('devov')) game.devOverlay(); if (game.debugOn && game.ev && game.ev.pw) { try { const b = game.ev.pw.world.debugRender(); if (!game.debugLines) { game.debugLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true })); game.debugLines.frustumCulled = false; game.ev.group.add(game.debugLines); } game.debugLines.geometry.setAttribute('position', new THREE.BufferAttribute(b.vertices, 3)); game.debugLines.geometry.setAttribute('color', new THREE.BufferAttribute(b.colors, 4)); } catch (e) { /* ignore */ } } };
}
