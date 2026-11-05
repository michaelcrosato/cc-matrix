(() => {
const E = My3D2dge, SN = globalThis.SN, px = SN.px;
const { clamp } = SN, U = SN.U, UI = SN.UI, T = UI.T, R = SN.R, HUD = SN.HUD, Menu = UI.Menu, Bg = SN.Bg;
const TITLE = 'SNIPEOUT HD', TAGLINE = 'Anti-gravity. Anti-everyone.';
SN.save.load();
let game, cur = null, setupMode = 'race';
const hub = SN.Hub;
const go = (name, data) => game.go(name, data);
const activity = (() => { let lp = null; return (reset) => { const I = game.input; if (reset) { lp = null; return false; } const p = I.pointer(), mv = I.padMove || [0, 0]; let moved = false; if (p) { if (lp && (Math.abs(p[0] - lp[0]) + Math.abs(p[1] - lp[1]) > 1)) moved = true; lp = p.slice(); } return I.anyPressed() || moved || Math.hypot(mv[0], mv[1]) > .3; }; })();
SN.activity = activity;
const cycle = (arr, v, d) => arr[(arr.indexOf(v) + d + arr.length) % arr.length];
const backdrop = (id) => Bg.ensure(id);
const startRace = cfg => { SN.lastCfg = cfg; go('race', cfg); };
SN.startRace = startRace; SN.director = () => cur;

// ---- scenes ------------------------------------------------------------------------------------------------------------
const scenes = {};
// TITLE ---------------------------------------------------------------------------------------------------------------
{ let menu, idle = 0, touch = false, boot = 0;
  scenes.title = { enter() { backdrop('meridian'); SN.Audio.music('menu'); idle = 0; boot = 0; activity(true); touch = SN.touchOnly(); cur = null; SN.Audio.humStop();
      const items = [{ label: 'START', pick: () => go('menu') }, { label: 'SETTINGS', pick: () => game.menu('settings') }, { label: 'ABOUT', pick: () => go('about', {}) }];
      menu = new Menu(touch ? [items[1]] : items); },
    update(dt) { Bg.update(dt); boot += dt; touch = SN.touchOnly(); if (touch && menu.items.length > 1) menu = new Menu([{ label: 'SETTINGS', pick: () => game.menu('settings') }]);
      if (activity()) idle = 0; else idle += dt; menu.update(game, dt); if (idle > 10) go('attract', { i: 0 }); },
    draw(r) { Bg.draw(r); r.overlay(g => { const W = r.W, H = r.H; px(g, 0, 0, W, H, 'rgba(6,3,22,.32)'); E.font.title(g, 'SNIPEOUT', W / 2, H * .13, { scale: 5, align: 'center', colors: ['#ffffff', '#9fe8ff', '#4a7aff'], depth: 3, depthColor: '#10104a' }); E.font.title(g, 'HD', W / 2 + 134, H * .13 + 6, { scale: 3, align: 'center', colors: ['#ffe08a', '#ff8a2a'], depth: 2, depthColor: '#5a2a0a' }); T(g, TAGLINE, W / 2, H * .13 + 46, '#d8d4ff', { align: 'center' });
        if (touch) { T(g, 'Controller or keyboard required', W / 2, H * .5, '#ffd36a', { align: 'center', scale: 1 }); menu.draw(r, g, W / 2, H * .6, 140); }
        else { menu.draw(r, g, W / 2, H * .52, 150); if (Math.floor(boot * 1.6) % 2 === 0) T(g, 'PRESS ' + SN.Glyph.label('start').toUpperCase(), W / 2, H * .52 - 18, '#ffd36a', { align: 'center' }); UI.footer(r, g, [['confirm', 'SELECT']]); }
        T(g, 'An original game inspired by Wipeout HD', W / 2, H - 12, '#7a74a8', { align: 'center' }); }); } };
}
// MAIN MENU ---------------------------------------------------------------------------------------------------------------
{ let menu;
  scenes.menu = { enter() { if (game.players && game.players.length > 1) { game.players.slice(1).forEach(p => game.removePlayer(p)); } game.allowJoin(false); backdrop('meridian'); SN.Audio.music('menu'); const sel = (m) => ({ pick: () => { setupMode = m; go('setup', { mode: m }); } });
      menu = new Menu([Object.assign({ label: 'QUICK RACE' }, sel('race')), { label: 'SEASON', pick: () => go('season') }, Object.assign({ label: 'VERSUS (2 PLAYERS)' }, sel('versus')), Object.assign({ label: 'TIME TRIAL' }, sel('time')), Object.assign({ label: 'SNIPEOUT (COMBAT)' }, sel('snipeout')), Object.assign({ label: 'OVERCLOCK (SURVIVAL)' }, sel('overclock')),
        { label: 'ACADEMY (TUTORIAL)', pick: () => startRace({ mode: 'academy', track: 'solenne', cls: 'spark', laps: 2, team: SN.S.team }) }, { label: 'HOW TO PLAY', pick: () => go('howto') }, { label: 'SETTINGS', pick: () => game.menu('settings') }, { label: 'ABOUT & CREDITS', pick: () => go('about', {}) }, { label: 'BACK', pick: () => go('title') }], { onCancel: () => go('title'), start: SN.menuStart || 0 }); menu.i = SN.menuStart || 0; activity(true); },
    update(dt) { Bg.update(dt); menu.update(game, dt); SN.menuStart = menu.i; },
    draw(r) { Bg.draw(r); r.overlay(g => { const W = r.W; px(g, 0, 0, W, r.H, 'rgba(6,3,22,.45)'); UI.title(g, 'SNIPEOUT HD', W / 2, 14); UI.panel(g, W / 2 - 100, 52, 200, menu.items.length * 15 + 12); menu.draw(r, g, W / 2, 58, 190, { lh: 15 });
        const d = ['Five rivals, ten weapons, one league.', 'Eight events, from open day to Singularity.', 'Two pilots, one screen, split down the middle.', 'Beat the clock. The clock cheats less.', 'Points for hits. Double for eliminations.', 'The speed never stops. Neither does the neon.', 'Eleven drills. Zero judgement.', 'Controls and tips.', 'Sound, display, controller.', 'Credits, and how this was made.', 'Back to the title.'];
        T(g, ['QUICK RACE', 'SEASON', 'VERSUS', 'TIME TRIAL', 'SNIPEOUT', 'OVERCLOCK', 'ACADEMY', 'HOW TO PLAY', 'SETTINGS', 'ABOUT', 'BACK'][menu.i] ? d[menu.i] : '', W / 2, r.H - 34, '#d8d4ff', { align: 'center' }); UI.footer(r, g, [['confirm', 'SELECT'], ['cancel', 'BACK']]); }); } };
}
// SETUP ---------------------------------------------------------------------------------------------------------------------
{ let menu, mode, reload = 0, pending = null, lastTrack;
  scenes.setup = { enter(d) { mode = d.mode; const S = SN.S; lastTrack = S.track; backdrop(S.track); reload = 0; pending = null;
      const items = [];
      if (mode !== 'overclock' || true) items.push({ label: 'SPEED CLASS', value: () => SN.CLASSES[S.cls].name, adjust: s => { S.cls = cycle(SN.CLASS_ORDER, S.cls, s); } });
      items.push({ label: 'TRACK', value: () => SN.TRACKS[S.track].name, adjust: s => { S.track = cycle(SN.TRACK_ORDER, S.track, s); reload = .45; } });
      items.push({ label: mode === 'versus' ? 'P1 TEAM' : 'TEAM', value: () => SN.TEAMS[S.team].name, adjust: s => { S.team = cycle(SN.TEAM_ORDER, S.team, s); } });
      if (mode === 'versus') { S.team2 = S.team2 || 'soratek'; items.push({ label: 'P2 TEAM', value: () => SN.TEAMS[S.team2].name, adjust: s => { S.team2 = cycle(SN.TEAM_ORDER, S.team2, s); } }); game.allowJoin({ max: 2 }); }
      if (mode === 'race' || mode === 'time' || mode === 'versus') items.push({ label: 'LAPS', value: () => String(S.laps), adjust: s => { S.laps = clamp(S.laps + s, 1, 9); } });
      items.push({ label: 'START', get disabled() { return mode === 'versus' && game.players.length < 2; }, pick: () => { SN.save.write(); startRace(mode === 'versus' ? { mode: 'race', versus: true, track: S.track, cls: S.cls, laps: S.laps, team: S.team, team2: S.team2 } : { mode, track: S.track, cls: S.cls, laps: S.laps, team: S.team, goal: 0 }); } });
      items.push({ label: 'BACK', pick: () => go('menu') });
      menu = new Menu(items, { onCancel: () => go('menu') }); menu.i = items.length - 2; activity(true); },
    update(dt) { Bg.update(dt); menu.update(game, dt); if (reload > 0 && (reload -= dt) <= 0) backdrop(SN.S.track); },
    draw(r) { Bg.draw(r); r.overlay(g => { const W = r.W, H = r.H, S = SN.S, tm = SN.TEAMS[S.team], tr = SN.TRACKS[S.track], cl = SN.CLASSES[S.cls];
        px(g, 0, 0, W, H, 'rgba(6,3,22,.35)'); UI.title(g, { race: 'QUICK RACE', time: 'TIME TRIAL', snipeout: 'SNIPEOUT', overclock: 'OVERCLOCK', versus: 'VERSUS' }[mode], W / 2, 10, { scale: 2 });
        if (mode === 'versus') { const n = game.players.length, p2 = game.players[1]; T(g, n < 2 ? 'PLAYER 2: press Start on a second controller, or 2 on the keyboard' : 'PLAYER 2 JOINED (' + (p2.device || 'ready') + '). P1 steers ' + game.input.label('left') + '/' + game.input.label('right') + ', thrust ' + game.input.label('thrust') + '; P2 steers ' + p2.label('left') + '/' + p2.label('right') + ', thrust ' + p2.label('thrust'), W / 2, H - 50, n < 2 ? '#ffd36a' : '#5dff9a', { align: 'center', wrap: W - 40 }); }
        UI.panel(g, 16, 40, 180, menu.items.length * 17 + 14); menu.draw(r, g, 106, 47, 170);
        UI.panel(g, W - 196, 40, 180, 150, { edge: tm.main });
        T(g, tm.tag.toUpperCase(), W - 190, 48, tm.main); T(g, '"' + tm.slogan + '"', W - 190, 60, '#d8d4ff', { wrap: 168 });
        const stat = (l, v, y) => { T(g, l, W - 190, y, '#a8a2d8'); px(g, W - 130, y + 1, 70, 5, '#1a1630'); px(g, W - 130, y + 1, Math.round(70 * clamp(v, 0, 1.2) / 1.2), 5, tm.main); };
        stat('SPEED', tm.speed * .8 + .2 * 1.2 - .2, 86); stat('HANDLING', tm.handling, 98); stat('SHIELD', tm.shield, 110);
        T(g, tr.name, W - 190, 128, '#ffffff'); T(g, tr.desc, W - 190, 140, '#d8d4ff', { wrap: 168 }); T(g, cl.blurb, W - 190, 170, cl.color, { wrap: 168 });
        T(g, 'Top speed ' + cl.kmh + ' km/h  |  ' + SN.getTrack(S.track).lengthM.toFixed(0) + ' m lap', 16, H - 36, '#9fe8ff');
        UI.footer(r, g, [['confirm', 'SELECT'], ['cancel', 'BACK']], [['left', 'CHANGE']]); }); } };
}
// RACE ------------------------------------------------------------------------------------------------------------------------
const pauseItems = () => { const d = cur; if (!d || hub.active) return []; const m = d.cfg.mode; const out = [['Restart', () => { startRace(d.cfg); }], ['Camera: ' + R.CAMS[R.camMode], () => { SN.S.camMode = R.camMode = (R.camMode + 1) % 3; game.resume(); }],
  ['How to play', () => { d.overlay = SN.howtoOverlay(d); game.resume(); }], ['Dev mode', () => { SN.Dev.open(d); game.resume(); }]];
  if (m === 'overclock') out.push(['End run', () => { game.resume(); d.race.finish(); }]); return out; };
SN.pauseItems = pauseItems;
scenes.race = { pausable: true, hud(r) { if (cur && cur.cfg.versus) cur.hud(r); }, enter(cfg) { cur = new SN.Director(game, cfg); cur.onEnd = d => { if (d.cfg.replay) { go('menu'); return; } if (d.frames.length && !d.cfg.versus && !d.cfg.event) SN.replay = { cfg: Object.assign({}, d.cfg), tune: d.tune, frames: d.frames, hash: d.race.hash() }; else if (d.cfg.event || d.cfg.versus) SN.replay = d.cfg.versus ? null : { cfg: Object.assign({}, d.cfg), tune: d.tune, frames: d.frames, hash: d.race.hash() }; const sum = SN.summarize(d); go('results', sum); }; activity(true); },
  update(dt) { if (cur) { cur.update(dt); if (cur.cfg.replay && game.input.pressed('confirm') && cur.race.time > .5) { cur.endHandled = true; go('menu'); } } }, draw(r) { if (cur) cur.draw(r); }, exit() { if (cur) cur.dispose(); } };
// summarize a finished race
SN.summarize = d => {
  const race = d.race, h = race.human, cfg = d.cfg, rows = race.results(), mode = cfg.mode;
  const s = { cfg, rows, mode, place: h ? h.place : 0, finished: h ? h.finished : false, time: h ? h.finishTime : null, best: h && h.lapTimes.length ? Math.min(...h.lapTimes) : null, score: h ? h.score : 0, kills: h ? h.kills : 0, zone: race.zone, oscore: race.score, drills: race.drillDone.length, topKmh: h ? h.stats.topKmh : 0, hits: h ? h.stats.hits : 0 };
  const S = SN.S, key = cfg.track + ':' + cfg.cls;
  if (mode === 'time' && s.finished) { s.medal = SN.medalFor(cfg.track, cfg.cls, s.time); const prev = S.bests[key]; if (!prev || s.time < prev) { S.bests[key] = s.time; s.record = true; S.ghosts[key] = { ms: s.time, s: d.rec }; } }
  if (mode === 'overclock') { const k = 'oc:' + cfg.track; if (!S.bests[k] || s.oscore > S.bests[k]) { S.bests[k] = s.oscore; s.record = true; } }
  if (mode === 'snipeout') { const k = 'sn:' + cfg.track; if (!S.bests[k] || s.score > S.bests[k]) { S.bests[k] = s.score; s.record = true; } }
  if (cfg.event) { const ev = cfg.event; let pass = false; if (ev.mode === 'race') pass = s.finished && s.place <= ev.goal; else if (ev.mode === 'time') pass = !!s.medal; else if (ev.mode === 'snipeout') pass = s.score >= ev.goal; else if (ev.mode === 'overclock') pass = race.zone >= ev.goal; s.pass = pass; if (pass) { const old = S.done[ev.id]; if (!old || s.place < old.place) S.done[ev.id] = { place: s.place || 1, score: s.score || s.oscore || 0 }; } }
  SN.save.write(); return s;
};
// RESULTS ---------------------------------------------------------------------------------------------------------------------
{ let menu, sum, t;
  scenes.results = { enter(s) { sum = s; t = 0; backdrop(s.cfg.track); SN.Audio.music(s.pass === false || (s.mode === 'race' && s.place > 3) ? 'menu' : 'victory', { fade: .5, sync: false });
      const items = []; const ev = s.cfg.event;
      if (SN.replay && SN.replay.cfg.track === s.cfg.track && !s.cfg.versus) items.push({ label: 'WATCH REPLAY', pick: () => startRace(Object.assign({}, SN.replay.cfg, { replay: SN.replay })) });
      if (ev && s.pass) { const idx = SN.STORY.events.findIndex(e => e.id === ev.id), nx = SN.STORY.events[idx + 1]; items.push({ label: nx ? 'NEXT EVENT' : 'FINISH SEASON', pick: () => nx ? go('season', { focus: nx.id }) : go('ending') }); }
      items.push({ label: 'RETRY', pick: () => startRace(s.cfg) }); if (ev) items.push({ label: 'SEASON MENU', pick: () => go('season') }); items.push({ label: 'MAIN MENU', pick: () => go('menu') });
      menu = new Menu(items); activity(true); },
    update(dt) { t += dt; Bg.update(dt); menu.update(game, dt); },
    draw(r) { Bg.draw(r); r.overlay(g => { const W = r.W, H = r.H; px(g, 0, 0, W, H, 'rgba(6,3,22,.6)'); const s = sum;
        const head = s.cfg.versus ? (s.rows.find(x => x.human).name + ' TAKES IT') : s.mode === 'race' ? (s.finished ? SN.ord(s.place).toUpperCase() + ' PLACE' : 'ELIMINATED') : s.mode === 'time' ? (s.medal ? s.medal.toUpperCase() + ' MEDAL' : s.finished ? 'NO MEDAL' : 'RUN ENDED') : s.mode === 'snipeout' ? s.score + ' POINTS' : s.mode === 'overclock' ? 'ZONE ' + s.zone : 'ACADEMY';
        E.font.title(g, head, W / 2, 10, { scale: 4, align: 'center', colors: s.place === 1 || s.medal === 'gold' ? ['#fff6c8', '#ffd36a'] : ['#ffffff', '#9fe8ff', '#4a7aff'], depth: 2, depthColor: '#1a1a5a' });
        if (s.cfg.event) T(g, s.pass ? SN.STORY.events.find(e => e.id === s.cfg.event.id).win : 'Goal missed: ' + goalText(s.cfg.event), W / 2, 44, s.pass ? '#5dff9a' : '#ff9b9b', { align: 'center', wrap: W - 80 });
        UI.panel(g, 20, 62, W - 150, Math.min(H - 100, 10 + s.rows.length * 14));
        s.rows.forEach((row, i) => { const y = 68 + i * 14, hum = row.human; if (hum) px(g, 22, y - 2, W - 154, 13, 'rgba(122,106,255,.35)'); px(g, 26, y, 4, 8, row.color); T(g, String(row.place), 36, y, '#ffd36a'); T(g, row.name, 52, y, hum ? '#fff' : '#c8c2f0');
          const right = s.mode === 'snipeout' ? row.score + ' pts  ' + row.kills + ' KO' : s.mode === 'race' || s.mode === 'time' ? (row.finished ? SN.fmtTime(row.time) : 'DNF') : ''; T(g, right, W - 134, y, hum ? '#fff' : '#a8a2d8', { align: 'right' }); });
        let y = 64; const side = (l, v) => { T(g, l, W - 120, y, '#a8a2d8'); T(g, String(v), W - 20, y, '#fff', { align: 'right' }); y += 12; };
        if (s.best) side('BEST LAP', SN.fmtTime(s.best)); if (s.time) side('TIME', SN.fmtTime(s.time)); side('TOP SPEED', Math.round(s.topKmh) + ' km/h'); side('HITS', s.hits); if (s.mode === 'snipeout') side('KOs', s.kills); if (s.mode === 'overclock') side('SCORE', s.oscore); if (s.mode === 'academy') side('DRILLS', s.drills + '/' + SN.DRILLS.length); if (s.record) { T(g, 'NEW RECORD', W - 70, y + 4, Math.floor(t * 3) % 2 ? '#ffd36a' : '#fff', { align: 'center' }); }
        menu.draw(r, g, W - 70, H - 96, 120); UI.footer(r, g, [['confirm', 'SELECT']]); }); } };
  const goalText = ev => ev.mode === 'race' ? 'finish ' + SN.ord(ev.goal) + ' or better' : ev.mode === 'time' ? 'earn a medal' : ev.mode === 'snipeout' ? 'score ' + ev.goal + ' points' : 'reach zone ' + ev.goal;
  SN.goalText = goalText;
}
// SEASON -------------------------------------------------------------------------------------------------------------------------
{ let menu, sel = 0;
  const evStatus = (i) => { const E2 = SN.STORY.events, S = SN.S; if (SN.CHEATS.allUnlocked) return S.done[E2[i].id] ? 'done' : 'open'; if (S.done[E2[i].id]) return 'done'; return (i === 0 || S.done[E2[i - 1].id]) ? 'open' : 'locked'; };
  scenes.season = { enter(d) { backdrop('solenne'); SN.Audio.music('menu'); const S = SN.S, ev = SN.STORY.events; const items = [{ label: 'TEAM', value: () => SN.TEAMS[S.team].name, adjust: s => { S.team = cycle(SN.TEAM_ORDER, S.team, s); SN.save.write(); } }];
      ev.forEach((e, i) => items.push({ label: (i + 1) + '. ' + e.name, value: () => { const st = evStatus(i); return st === 'done' ? 'DONE' : st === 'locked' ? 'LOCKED' : SN.TRACKS[e.track].name.split(' ')[0]; }, get disabled() { return evStatus(i) === 'locked'; }, pick: () => go('brief', { event: e }) }));
      items.push({ label: 'BACK', pick: () => go('menu') }); menu = new Menu(items, { onCancel: () => go('menu') });
      const first = ev.findIndex((e, i) => evStatus(i) === 'open'); menu.i = d && d.focus ? 1 + ev.findIndex(e => e.id === d.focus) : 1 + Math.max(0, first); activity(true); },
    update(dt) { Bg.update(dt); menu.update(game, dt); },
    draw(r) { Bg.draw(r); r.overlay(g => { const W = r.W, H = r.H, ev = SN.STORY.events; px(g, 0, 0, W, H, 'rgba(6,3,22,.5)'); UI.title(g, 'SEASON', W / 2, 8, { scale: 3 }); T(g, 'The Anti-Gravity Racing League, a wholly owned subsidiary of everyone.', W / 2, 36, '#d8d4ff', { align: 'center' });
        UI.panel(g, 16, 50, 214, menu.items.length * 17 + 12); menu.draw(r, g, 123, 56, 204, { lh: 17 });
        const e = ev[menu.i - 1]; UI.panel(g, W - 214, 50, 198, 150);
        if (e) { T(g, e.name, W - 208, 58, '#ffd36a'); T(g, SN.TRACKS[e.track].name + ' | ' + SN.CLASSES[e.cls].name + ' | ' + e.mode.toUpperCase(), W - 208, 70, '#9fe8ff', { wrap: 186 }); T(g, 'GOAL: ' + SN.goalText(e), W - 208, 94, '#fff', { wrap: 186 }); const d = SN.S.done[e.id]; if (d) T(g, 'COMPLETED', W - 208, 116, '#5dff9a'); } else T(g, 'Pick a team. The Authority will pretend it was your idea.', W - 208, 58, '#d8d4ff', { wrap: 186 });
        const n = ev.filter(x => SN.S.done[x.id]).length; T(g, n + '/' + ev.length + ' events complete', 16, H - 32, '#a8a2d8'); UI.footer(r, g, [['confirm', 'SELECT'], ['cancel', 'BACK']]); }); } };
}
// BRIEFING -----------------------------------------------------------------------------------------------------------------------
{ let ev, line, chars, t, spoken;
  scenes.brief = { enter(d) { ev = d.event; line = 0; chars = 0; t = 0; spoken = -1; backdrop(ev.track); activity(true); },
    update(dt) { Bg.update(dt); t += dt; const I = game.input, txt = ev.brief[line]; if (spoken !== line) { spoken = line; chars = 0; SN.Audio.voice(txt, 9, 0); }
      chars = Math.min(txt.length, chars + dt * 45); if (I.pressed('confirm') || (I.clicked() && true)) { if (chars < txt.length) chars = txt.length; else if (line < ev.brief.length - 1) { line++; } else { SN.startRace({ mode: ev.mode, track: ev.track, cls: ev.cls, laps: ev.laps || SN.TRACKS[ev.track].laps, team: SN.S.team, event: ev, goal: ev.mode === 'snipeout' || ev.mode === 'overclock' ? ev.goal : 0 }); } }
      if (I.pressed('cancel')) go('season'); },
    draw(r) { Bg.draw(r); r.overlay(g => { const W = r.W, H = r.H; px(g, 0, 0, W, H, 'rgba(6,3,22,.4)'); UI.panel(g, 30, H - 112, W - 60, 90); px(g, 38, H - 104, 40, 40, '#1a1640'); const mouth = Math.floor(t * 10) % 2; px(g, 44, H - 98, 28, 28, '#7a6aff'); px(g, 50, H - 90, 5, 5, '#fff'); px(g, 62, H - 90, 5, 5, '#fff'); px(g, 52, H - 80, 16, mouth ? 5 : 2, '#0b0814');
        T(g, SN.STORY.authority, 88, H - 104, '#ffd36a'); T(g, ev.name + ' | ' + SN.TRACKS[ev.track].name, 88, H - 92, '#9fe8ff'); T(g, ev.brief[line].slice(0, Math.floor(chars)), 88, H - 76, '#fff', { wrap: W - 130 });
        UI.footer(r, g, [['confirm', line < ev.brief.length - 1 ? 'NEXT' : 'RACE'], ['cancel', 'BACK']]); }); } };
}
scenes.ending = { enter() { backdrop('borealis'); SN.Audio.music('victory', { fade: .5 }); this.t = 0; activity(true); }, update(dt) { Bg.update(dt); this.t += dt; if (game.input.pressed('confirm') && this.t > 1) go('menu'); },
  draw(r) { Bg.draw(r); r.overlay(g => { const W = r.W, H = r.H; px(g, 0, 0, W, H, 'rgba(6,3,22,.6)'); E.font.title(g, 'SEASON COMPLETE', W / 2, 30, { scale: 4, align: 'center', colors: ['#fff6c8', '#ffd36a', '#ff8a2a'], depth: 2, depthColor: '#4a2a0a' }); SN.STORY.ending.forEach((l, i) => T(g, l, W / 2, 90 + i * 22, i === 2 ? '#ffd36a' : '#fff', { align: 'center' })); UI.footer(r, g, [['confirm', 'MENU']]); }); } };
// HOW TO PLAY ----------------------------------------------------------------------------------------------------------------------
SN.howtoDraw = (r, g) => {
  const W = r.W, H = r.H; UI.title(g, 'HOW TO PLAY', W / 2, 8, { scale: 3 }); const L = SN.Glyph;
  const rows = [['thrust', 'Thrust'], ['left', 'Steer left'], ['right', 'Steer right'], ['up', 'Nose down'], ['down', 'Nose up'], ['airL', 'Left airbrake'], ['airR', 'Right airbrake'], ['shiftL', 'Shift left (air: roll)'], ['shiftR', 'Shift right (air: roll)'], ['fire', 'Fire weapon'], ['absorb', 'Absorb weapon'], ['camera', 'Camera'], ['lookBack', 'Look back'], ['pause', 'Pause / dev mode']];
  rows.forEach(([a, l], i) => { const col = i < 7 ? 0 : 1, y = 40 + (i % 7) * 16; L.prompt(g, a, l, 24 + col * (W / 2 - 10), y); });
  const tips = ['Airbrakes bite harder than steering: tap one into each corner.', 'Blue pads boost. Amber pads give a weapon.', 'Absorb a weapon to turn it into shield energy.', 'Rolling in the air boosts you but costs shield.', 'Green pit strip beside the start line recharges the shield.', 'Hold thrust in the green band at the lights for a launch boost.'];
  tips.forEach((t, i) => T(g, '- ' + t, 24, 162 + i * 11, '#d8d4ff', { wrap: W - 48 }));
};
{ scenes.howto = { enter() { backdrop('solenne'); activity(true); }, update(dt) { Bg.update(dt); if (game.input.pressed('cancel') || game.input.pressed('confirm')) go('menu'); },
    draw(r) { Bg.draw(r); r.overlay(g => { px(g, 0, 0, r.W, r.H, 'rgba(6,3,22,.7)'); SN.howtoDraw(r, g); UI.footer(r, g, [['cancel', 'BACK']]); }); } }; }
SN.howtoOverlay = dir => ({ update() { const I = game.input; if (I.pressed('cancel') || I.pressed('confirm')) dir.overlay = null; }, draw(r) { r.overlay(g => { px(g, 0, 0, r.W, r.H, 'rgba(6,3,22,.8)'); SN.howtoDraw(r, g); UI.footer(r, g, [['confirm', 'CLOSE']]); }); } });
// ABOUT -------------------------------------------------------------------------------------------------------------------------------
{ let page, scroll, pages;
  scenes.about = { enter() { backdrop('borealis'); page = 0; scroll = 0; const A = SN.ABOUT, kv = o => Object.keys(o).map(k => k.toUpperCase() + ': ' + o[k]).join('\n');
      pages = [{ t: 'SOURCE INFORMATION', s: kv(A.sourceInformation) }, { t: 'TESTING FEEDBACK', s: A.testingQuestions.map((q, i) => q + '\n  ' + A.testingFeedback[i]).join('\n') }, { t: 'ENGINE FEEDBACK', s: A.engineQuestions.map((q, i) => q + '\n  ' + A.engineFeedback[i]).join('\n') }, { t: 'PROMPT FEEDBACK', s: A.promptQuestions.map((q, i) => q + '\n  ' + A.promptFeedback[i]).join('\n') }, { t: 'ENGINE CHANGES', s: A.engineChanges.map(x => '- ' + x).join('\n') }, { t: 'CREDITS', s: A.credits }]; activity(true); },
    update(dt) { Bg.update(dt); const I = game.input; if (I.repeat('right', .3, .2)) { page = (page + 1) % pages.length; scroll = 0; } if (I.repeat('left', .3, .2)) { page = (page + pages.length - 1) % pages.length; scroll = 0; } if (I.repeat('down', .2, .03)) scroll += 3; if (I.repeat('up', .2, .03)) scroll = Math.max(0, scroll - 3); if (I.pressed('cancel')) go(SN.aboutBack || 'menu'); },
    draw(r) { Bg.draw(r); r.overlay(g => { const W = r.W, H = r.H; px(g, 0, 0, W, H, 'rgba(6,3,22,.78)'); UI.title(g, 'ABOUT', W / 2, 6, { scale: 2 }); T(g, '< ' + pages[page].t + ' (' + (page + 1) + '/' + pages.length + ') >', W / 2, 28, '#ffd36a', { align: 'center' });
        const txt = pages[page].s, lines = E.font.wrap ? E.font.wrap(txt, W - 50, {}) : null; g.save(); g.beginPath(); g.rect(0, 40, W, H - 62); g.clip(); const tl = T(g, txt, 24, 42 - scroll, '#e8e4ff', { wrap: W - 48 }); g.restore(); const max = Math.max(0, tl.h - (H - 64)); if (scroll > max) scroll = max;
        UI.footer(r, g, [['cancel', 'BACK']], [['left', 'PAGE'], ['down', 'SCROLL']]); }); } };
}
// ATTRACT -----------------------------------------------------------------------------------------------------------------------------
{ const LIST = [{ mode: 'race', track: 'solenne', cls: 'flare' }, { mode: 'snipeout', track: 'karakum', cls: 'flare' }, { mode: 'race', track: 'meridian', cls: 'storm' }, { mode: 'overclock', track: 'borealis', cls: 'flare' }, { mode: 'time', track: 'solenne', cls: 'spark' }, { mode: 'race', track: 'borealis', cls: 'singularity' }];
  let dir, i = 0, age = 0;
  scenes.attract = { enter(d) { i = (d && d.i) || 0; const c = LIST[i % LIST.length]; age = 0; activity(true); dir = new SN.Director(game, { mode: c.mode, track: c.track, cls: c.cls, laps: 2, team: SN.TEAM_ORDER[i % 6], demo: true, seed: 40 + i, humans: [{ name: 'DEMO', team: SN.TEAM_ORDER[i % 6], control: 'ai' }], rules: { respawn: true } }); cur = null; HUD.say('DEMO', c.mode.toUpperCase() + ' | ' + SN.TRACKS[c.track].name, 5); },
    update(dt) { age += dt; if (age > .05 && activity()) { dir.dispose(); go('title'); return; } dir.update(dt); if (age > 32 || dir.race.over) { dir.dispose(); go('attract', { i: i + 1 }); } },
    draw(r) { dir.draw(r); }, exit() { if (dir) dir.dispose(); } };
}
// AI HUB SESSION --------------------------------------------------------------------------------------------------------------------------
{ let dir, ready = false, tr, shown = 0, last = 0;
  scenes.session = { enter() { const ev = hub.event, me = hub.humanEntry(); ready = false; hub.reported = false; hub.started = false; SN.Audio.music('attract', { fade: .5 });
      const hs = [me]; dir = hub.dir = new SN.Director(game, { mode: 'race', track: ev.track, cls: ev.cls, laps: ev.laps, team: me.team, seed: ev.seed, humans: hs, rules: { respawn: true, countdown: 3 }, session: true });
      dir.race.human.color = me.color; dir.race.ghostShips = []; for (const g of hub.ghosts.values()) dir.race.ghostShips.push(Object.assign(g, { pose: null })); R._shipsFor = null; R.ensureShips(dir.race); tr = dir.race.track; dir.race.countdown = 99; last = performance.now();
      R.camStates = []; R.world.camera.fixed = null; if (window.AIHub) window.AIHub.ready(); ready = true; },
    update(dt) {
      const A = window.AIHub, race = dir.race; if (!A) return; const now = performance.now(); if (hub.ended) return;
      const I = game.input; if (!hub.started) { if (I.pressed('confirm') || (I.clicked() && I.lastDevice !== 'gamepad')) A.answer('ready'); if (I.pressed('camera')) { hub.more = !hub.more; A.answer('more'); } R.update(race, race.ships[race.ships.length - 1], true, false); R.world.step(dt); return; }
      if (race.state === 'grid') race.countdown = clamp(-A.time() / 1000, 0, 3);
      dir.update(dt); for (const g of hub.ghosts.values()) { g.pose = hub.pose(g, tr); } hub.sendState(race, dt * 1000);
      for (const e of race.events) if (e.t === 'over') { /* keep racing visuals; the hub ends the round */ }
    },
    draw(r) {
      const A = window.AIHub; if (!dir) return;
      if (hub.ended) { r.overlay(g => { px(g, 0, 0, r.W, r.H, '#06031a'); E.font.title(g, 'ROUND OVER', r.W / 2, 40, { scale: 4, align: 'center', colors: ['#fff', '#9fe8ff'] }); const rows = dir.race.results(); rows.forEach((row, i) => T(g, row.place + '  ' + row.name + '  ' + (row.finished ? SN.fmtTime(row.time) : 'DNF'), r.W / 2, 100 + i * 12, row.human ? '#ffd36a' : '#c8c2f0', { align: 'center' })); }); return; }
      if (!hub.started) { R.glows(dir.race, r); R.world.draw(r); r.overlay(g => { const W = r.W, H = r.H; px(g, 0, 0, W, 60, 'rgba(6,3,22,.7)'); UI.title(g, 'SNIPEOUT HD', W / 2, 6, { scale: 2 }); T(g, SN.TRACKS[hub.event.track].name + ' | FLARE | 3 LAPS', W / 2, 26, '#9fe8ff', { align: 'center' }); T(g, 'Finish 3 laps first: fastest time wins', W / 2, 38, '#ffd36a', { align: 'center' });
          const card = hub.card || {}, ps = (card.players || hub.info.players || []); ps.forEach((p, i) => { const y = 70 + i * 14; px(g, 20, y, 6, 8, SEAT_COLOR(i)); T(g, (p.name || 'PILOT') + (p.ready ? '  READY' : ''), 32, y, p.ready ? '#5dff9a' : '#fff'); });
          if (card.left != null) T(g, 'TIME LEFT ' + Math.round(card.left / 1000) + 's', W - 20, 70, '#fff', { align: 'right' }); UI.footer(r, g, [['confirm', 'READY'], ['camera', hub.more ? 'MORE TIME ✓' : 'MORE TIME']], [['thrust', 'THRUST'], ['fire', 'FIRE']]); }); return; }
      dir.draw(r); } };
  const SEAT_COLOR = i => ['#2ec4ff', '#ff4a5a', '#ffd21f', '#ff9a2a'][i % 4];
}
SN.scenes = scenes;

// ---- boot ------------------------------------------------------------------------------------------------------------------
const tuneDifficulty = v => { SN.Tune.T.aiSkill = v === 'Easy' ? .88 : v === 'Hard' ? 1.1 : 1; };
const inHub = hub.active;
game = SN.game = window.game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, bg: null, input: SN.INPUT, id: 'snipeout-hd', autoPause: !inHub,
  menu: { items: () => pauseItems(), quit: inHub ? false : 'title', settings: [{ key: 'difficulty', label: 'AI difficulty', options: ['Easy', 'Normal', 'Hard'], value: 'Normal', group: 'Game', apply: (g, v) => tuneDifficulty(v) }],
    controls: { thrust: 'Thrust', fire: 'Fire weapon', absorb: 'Absorb', camera: 'Camera', lookBack: 'Look back', airL: 'Left airbrake', airR: 'Right airbrake', shiftL: 'Shift left / roll', shiftR: 'Shift right / roll', up: 'Nose down', down: 'Nose up', left: 'Steer left', right: 'Steer right', start: false, pause: false, confirm: false, cancel: false } } });
SN.Controls.game = game; SN.Audio.init(game);
scenes.wait = { update() { if (hub.info) go('session'); else if (!hub.active) go('title'); }, draw(r) { r.overlay(g => { px(g, 0, 0, r.W, r.H, '#06031a'); T(g, 'Joining the league...', r.W / 2, r.H / 2, '#fff', { align: 'center' }); }); } };
game.start({ scenes: Object.assign({}, scenes), scene: inHub ? 'wait' : 'title', boot: { title: TITLE, steps: [
  ['Waking the 3D engine', async () => { if (typeof window === 'undefined') return; const t0 = Date.now(); while (!E.World3D) { if (window.__sn3dFail || Date.now() - t0 > 30000) throw new Error('The 3D engine could not load (three.js from cdn.jsdelivr.net). Check the connection and reload.'); await new Promise(r => setTimeout(r, 50)); } await E.World3D.init(game); }],
  ['Building the city', () => { SN.TRACK_ORDER.forEach(id => SN.getTrack(id)); }],
  ['Joining the league', async () => { if (inHub) await hub.connect(); const b = document.getElementById('e3-boot'); if (b) b.remove(); }]] } });
})();
