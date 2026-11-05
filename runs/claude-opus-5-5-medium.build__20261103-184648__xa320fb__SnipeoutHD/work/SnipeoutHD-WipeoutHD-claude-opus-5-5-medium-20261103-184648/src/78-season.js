// Saves, records, ghosts, the season (hub, briefings, medals, unlocks, promotions), the Grand Prix (standings between
// races) and the ending with the credits; the story runner (E.Dialog pages with live portraits and gibberish voices)
(() => {
const E = My3D2dge, SN = globalThis.SN, px = E.px;
const T = (g, s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
const MEDALS = ['gold', 'silver', 'bronze'], MC = { gold: '#ffd23f', silver: '#d8e0f0', bronze: '#d8884a' };
const better = (a, b) => !b || MEDALS.indexOf(a) < MEDALS.indexOf(b);

/* ---- saves: one record (season, records, ghosts, last choices), autosaved through game.saves ---- */
const fresh = () => ({ v: 1, started: false, medals: {}, gp: { round: 0, points: {}, active: false, done: false, results: [] }, unlocked: { classes: ['spark'], champion: false }, seen: {}, records: {}, ghosts: {}, team: 'kestrel', pilot: 'ingrid', lastTrack: 'solenne', lastCls: 'spark', livery: 'team', academy: { passed: 0, retries: 0 } });
SN.save = { data: fresh() };
const Save = SN.Save = {
  init() {
    const S = SN.game.saves; if (!S) return;
    S.write = () => ({ data: SN.save.data, place: 'SEASON 2161', level: SN.Season.tierName() });
    S.read = save => { const d = save && save.data; if (d && d.v === 1) SN.save.data = Object.assign(fresh(), d, { unlocked: Object.assign(fresh().unlocked, d.unlocked), gp: Object.assign(fresh().gp, d.gp) }); };
    try { const l = S.latest && S.latest(); if (l) S.load(l.slot ?? 'auto'); } catch (e) { SN.game.fail('load save', e); }
  },
  write() { try { SN.game.saves && SN.game.saves.autosave(); } catch (e) { /* storage blocked */ } },
  reset() { SN.save.data = fresh(); this.write(); },
  /** after any race: records, ghosts, season medals and unlocks */
  afterRace(R, res, sc) {
    const d = SN.save.data, me = R.humans[0], key = R.track.id + '/' + R.cls + '/' + (R.mode === 'hotlap' ? 'hotlap' : R.mode === 'timetrial' ? 'timetrial' : 'race');
    res.records = []; res.unlocks = [];
    if (R.mode === 'race' || R.mode === 'timetrial') { if (me.finished && !me.dnf && !me.estimated) { const ms = Math.round(me.finishTime * 1000), r = d.records[key]; if (!r || ms < r.ms) { d.records[key] = { ms, pilot: me.name }; res.records.push('RACE'); } } }
    if (me.bestLap < 1e9) { const lk = R.track.id + '/' + R.cls + '/lap', ms = Math.round(me.bestLap * 1000), r = d.records[lk]; if (!r || ms < r.ms) { d.records[lk] = { ms, pilot: me.name }; res.records.push('LAP'); } }
    if (R.mode === 'hotlap') { const ms = Math.round(me.bestLap * 1000), r = d.records[key]; if (me.bestLap < 1e9 && (!r || ms <= r.ms)) d.records[key] = { ms, pilot: me.name }; }
    if (R.mode === 'overclock') { const zk = R.track.id + '/zone', r = d.records[zk]; if (!r || R.zone > r.zone) { d.records[zk] = { zone: R.zone, ms: 0, pilot: me.name }; res.records.push('ZONE'); } }
    if (sc && sc.ghostRec && (R.mode === 'timetrial' || R.mode === 'hotlap') && res.records.length && sc.ghostRec.samples.length) d.ghosts[R.track.id + '/' + R.cls + '/' + R.mode] = SN.Ghost.encode(sc.ghostRec);
    if (res.records.length) SN.Audio && SN.Audio.announce('NEW LAP RECORD');
    res.drills = R.academyPassed || 0;
    const S = res.setup;
    if (S.event) SN.Season.medal(S.event, res);
    else if (R.mode === 'race' && !R.humans[1]) res.medal = me.dnf ? null : MEDALS[me.place - 1] || null;
    if (S.gp) SN.Season.gpRace(res);
    this.write();
  }
};

/* ---- the story runner: pages of dialogue with portraits and voices ---- */
const ORACLE = (g, x, y, s) => { px.rect(g, x, y, s, s, '#05060c'); const c = Math.floor((SN.game.real || 0) * 2) % 2 ? '#29c8e8' : '#ffffff', cx = x + s / 2, cy = y + s / 2, P = []; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6; P.push([cx + Math.cos(a) * s * .42, cy + Math.sin(a) * s * .42]); } px.poly(g, P, c); px.poly(g, P.map(p => [cx + (p[0] - cx) * .82, cy + (p[1] - cy) * .82]), '#05060c'); px.poly(g, [[cx, cy - s * .22], [cx - s * .22, cy + s * .16], [cx + s * .22, cy + s * .16]], c); px.disc(g, cx, cy + 2, s * .07, '#05060c'); };
const GLITCH = (g, x, y, s) => { px.rect(g, x, y, s, s, '#0b0b0e'); const t = Math.floor((SN.game.real || 0) * 10); for (let k = 0; k < 14; k++) px.rect(g, x + Math.floor(E.hash2(k, t) * s * .8), y + Math.floor(E.hash2(k + 30, t) * s), Math.floor(4 + E.hash2(k, 9) * 10), 2, k % 3 ? '#6aff3a' : '#ff2a8a'); px.rect(g, x + s * .3, y + s * .4, s * .4, 3, '#ffffff'); };
const Story = SN.Story = {
  talk: null, queue: [], onDone: null,
  vars() {
    const d = SN.save.data, team = SN.TEAM[d.team], rival = SN.PILOT[SN.rivalOf(d.team)];
    return Object.assign({ team: team.name, pilot: SN.PILOT[d.pilot].name, rival: rival.name, rivalTeam: SN.TEAM[rival.team].name }, this.extra || {});
  },
  speaker(who) {
    const d = SN.save.data;
    if (who === 'oracle') return { name: 'ORACLE • RACE CONTROL', portrait: ORACLE, voice: SN.VOICES.oracle };
    if (who === 'principal') { const pr = SN.PRINCIPALS[d.team]; return { name: pr.name, portrait: pr.glitch ? GLITCH : SN.rigFor(d.team === 'nullset' ? 'hex' : d.team === 'kestrel' ? 'tomas' : SN.pilotsOf(d.team)[1].id), principal: pr, voice: { f0: pr.f0, speed: .9, crush: pr.crush, vol: .45 } }; }
    if (who === 'rival') { const p = SN.PILOT[SN.rivalOf(d.team)]; return { name: p.name, portrait: SN.rigFor(p.id), voice: { f0: p.f0, speed: 1.1, crush: p.crush, vol: .45 } }; }
    const p = SN.PILOT[d.pilot]; return { name: p.name, portrait: SN.rigFor(p.id), voice: { f0: p.f0, speed: 1.1, vol: .45 } };
  },
  /** play a list of lines (or a story id); onDone after the last */
  play(lines, onDone, extra) {
    if (typeof lines === 'string') { const id = lines; lines = SN.STORY[id] || []; if (SN.save) SN.save.data.seen[id] = true; }
    this.queue = lines.slice(); this.onDone = onDone; this.extra = extra || null;
    if (!this.talk) this.talk = new E.Dialog(SN.game, { voice: null, lines: 3, bg: '#0a0c16', border: '#29c8e8', nameColor: '#29c8e8' });
    this.next();
  },
  next() {
    const l = this.queue.shift();
    if (!l) { this.talk.open = false; const f = this.onDone; this.onDone = null; if (f) f(); return; }
    const sp = this.speaker(l.who), text = l.text.replace(/\{\$(\w+)\}/g, (m, k) => this.vars()[k] ?? m);
    this.talk.say(text, { name: sp.name, portrait: sp.portrait, portraitSize: 44, onDone: () => this.next() });
    SN.Voice.say(text, sp.voice);
  },
  get open() { return !!(this.talk && this.talk.open); },
  /** true while a dialog holds the screen */
  update(dt) {
    if (!this.open) return false;
    const I = SN.game.input;
    if (I.pressed('skip')) { this.queue.length = 0; this.talk.open = false; I.consumeAll(); const f = this.onDone; this.onDone = null; if (f) f(); return true; }
    this.talk.update(dt); return true;
  },
  draw(r) {
    if (!this.open) return; this.talk.draw(r);
    r.overlay(g => { const I = SN.game.input, it = [['confirm', 'NEXT'], ['skip', 'SKIP ALL']], w = SN.glyph.rowWidth(I, it); SN.glyph.row(g, I, it, r.W - w - 8, r.H - 90); });
  }
};

/* ---- the season ---- */
const Season = SN.Season = {
  tierOpen(t) {
    const d = SN.save.data, n = t.need; if (!n) return true;
    if (n.tier) { const T0 = SN.SEASON.tiers.find(x => x.id === n.tier); return T0.events.filter(e => d.medals[e]).length >= n.medals; }
    return n.events.every(e => d.medals[e]);
  },
  tierName() { const open = SN.SEASON.tiers.filter(t => this.tierOpen(t)); return open[open.length - 1].name; },
  summary() { const d = SN.save.data; return Object.keys(d.medals).length + ' MEDALS • ' + this.tierName(); },
  open() {
    const d = SN.save.data;
    const go = () => SN.UI.push(SN.screens.season());
    if (!d.started) { d.started = true; Save.write(); SN.UI.push(SN.screens.seasonTeam()); return; }
    go();
  },
  /** start an event (briefing first time) */
  start(id) {
    const ev = SN.SEASON.events[id], d = SN.save.data, bid = ev.brief;
    const run = () => {
      if (ev.mode === 'gp') return this.gpStart();
      const setup = { mode: ev.mode, track: ev.track, cls: ev.cls, laps: ev.laps, team: d.team, pilot: d.pilot, target: ev.target, event: id, intro: true };
      if (ev.mode === 'academy') Object.assign(setup, SN.Academy.setup(), { event: id });
      SN.go('loading', { setup });
    };
    if (bid && !d.seen[bid]) Story.play(bid, run); else run();
  },
  /** an event's medal from a result; unlocks and promotions */
  medal(id, res) {
    const ev = SN.SEASON.events[id], d = SN.save.data, p = res.player; let m = null;
    if (ev.rule === 'PLACE') m = p.dnf ? null : MEDALS[p.place - 1] || null;
    else if (ev.rule === 'ZONE') { const z = res.zone; m = z >= 30 ? 'gold' : z >= 20 ? 'silver' : z >= 10 ? 'bronze' : null; }
    else if (ev.rule === 'TIME') { const tg = SN.medalTimes(ev.track, ev.cls).tt; m = p.dnf || !(p.time > 0) ? null : p.time <= tg[0] ? 'gold' : p.time <= tg[1] ? 'silver' : p.time <= tg[2] ? 'bronze' : null; }
    else if (ev.rule === 'LAP') { const tg = SN.medalTimes(ev.track, ev.cls).lap; m = !(p.best < 1e9) ? null : p.best <= tg[0] ? 'gold' : p.best <= tg[1] ? 'silver' : p.best <= tg[2] ? 'bronze' : null; }
    else if (ev.rule === 'ALL DRILLS') { const r = res.academyRetries ?? 99; m = res.drills >= 11 ? (r === 0 ? 'gold' : r <= 3 ? 'silver' : 'bronze') : null; }
    res.medal = m;
    const before = SN.SEASON.tiers.map(t => this.tierOpen(t));
    if (m && better(m, d.medals[id])) d.medals[id] = m;
    const after = SN.SEASON.tiers.map(t => this.tierOpen(t));
    res.promos = [];
    if (!before[1] && after[1]) { this.unlock('flare', res); res.promos.push('promo_t2'); }
    if (!before[2] && after[2]) { this.unlock('storm', res); res.promos.push('promo_t3'); }
    if (!before[3] && after[3]) res.promos.push('gp_unlock');
    if (m) SN.Audio && SN.Audio.stingNamed('medal');
  },
  unlock(cls, res) { const u = SN.save.data.unlocked; if (!u.classes.includes(cls)) { u.classes.push(cls); if (res) res.unlocks.push(SN.CLASS[cls].name + ' CLASS'); SN.Audio && SN.Audio.stingNamed('unlock'); } },
  /** the results' CONTINUE in the season: debrief, promotions, then the hub (or the next GP race) */
  afterResults(res) {
    const S = res.setup;
    if (S.gp) return this.gpAfter(res);
    const ev = SN.SEASON.events[S.event], dm = ev.debrief || {}, m = res.medal, place = res.player && res.player.place;
    const key = dm.any || (m === 'gold' && dm.gold) || (m && dm.podium) || (place <= 3 && dm.podium) || dm.other || dm.gold;
    const lines = [].concat(key ? SN.STORY[key] : [], ...(res.promos || []).map(p => SN.STORY[p]));
    SN.go('menu', { screen: 'season', story: lines, extra: { zone: res.zone } });
  },
  /* ---- the Grand Prix ---- */
  gpStart() {
    const d = SN.save.data; d.gp = { round: 0, points: {}, active: true, done: false, results: [] }; Save.write();
    this.gpRun();
  },
  gpRun() {
    const d = SN.save.data, ev = SN.SEASON.events.gp, tr = ev.tracks[d.gp.round];
    SN.go('loading', { setup: { mode: 'race', track: tr, cls: ev.cls, laps: ev.laps, team: d.team, pilot: d.pilot, gp: true, intro: true, seed: 2161 + d.gp.round } });
  },
  gpRace(res) {
    const gp = SN.save.data.gp; if (!gp.active) return;
    res.results.forEach(r => { gp.points[r.pilot] = (gp.points[r.pilot] || 0) + (r.dnf ? 0 : SN.SEASON.gpPoints[r.place - 1] || 0); gp.best = gp.best || {}; gp.best[r.pilot] = Math.min(gp.best[r.pilot] || 9, r.dnf ? 9 : r.place); });
    gp.results.push(res.results.map(r => ({ pilot: r.pilot, place: r.place, dnf: r.dnf })));
    gp.round++;
  },
  standings() { const gp = SN.save.data.gp; return Object.keys(gp.points).sort((a, b) => gp.points[b] - gp.points[a] || (gp.best[a] || 9) - (gp.best[b] || 9)).map((p, k) => ({ pilot: p, points: gp.points[p], place: k + 1 })); },
  gpAfter(res) { SN.go('menu', { screen: 'gp' }); },
  leaveGP() {},
  gpFinish() {
    const d = SN.save.data, st = this.standings(), me = st.find(s => s.pilot === d.pilot), m = me ? MEDALS[me.place - 1] || null : null;
    d.gp.active = false; d.gp.done = true;
    if (m && better(m, d.medals.gp)) d.medals.gp = m;
    const res = { unlocks: [] };
    if (m) { this.unlock('singularity', res); if (m === 'gold') d.unlocked.champion = true; }
    Save.write();
    return m;
  }
};
/** medal targets for time trial (3 laps) and hot lap (1 lap): measured by tools/medals.mjs (SN.MEDAL_TIMES), else from the line */
SN.medalTimes = (track, cls) => {
  const m = SN.MEDAL_TIMES && SN.MEDAL_TIMES[track] && SN.MEDAL_TIMES[track][cls]; if (m) return m;
  const Tk = SN.getTrack(track); let t = 0; for (let i = 0; i < Tk.n; i++) t += Tk.ds / Tk.profiles[cls][i];
  const lap = t * 1.08, f = [1.04, 1.10, 1.20]; return { lap: f.map(k => Math.round(lap * k * 10) / 10), tt: f.map(k => Math.round(lap * 3 * k * 10) / 10 + 3) };
};

/* ---- screens: choose a team, the season hub, the GP standings, the ending ---- */
const S = SN.screens;
S.seasonTeam = () => S.setupTeam({ who: 'SEASON', then: a => { const d = SN.save.data; d.team = a.team; d.pilot = a.pilot; Save.write(); SN.UI.pop(); SN.UI.push(S.season()); Story.play('prologue', () => {}); } });
S.season = (dd) => {
  const tiers = SN.SEASON.tiers, cells = [];
  tiers.forEach((t, c) => t.events.forEach((e, r) => cells.push({ c, r, e, t })));
  let col = 0;
  return { id: 'season', title: 'SEASON 2161', sub: () => SN.PILOT[SN.save.data.pilot].name + ' • ' + SN.TEAM[SN.save.data.team].short + ' • ' + Season.summary(), layout: 'custom', navCustom: true, selfDraw: true,
    enter() { if (dd && dd.story && dd.story.length) Story.play(dd.story, () => Save.write(), dd.extra); },
    prompts: [['confirm', 'RACE'], ['camera', 'BRIEFING']],
    items: () => cells.map(cl => { const ev = SN.SEASON.events[cl.e], open = Season.tierOpen(cl.t); return { id: cl.e, label: ev.name, cell: cl, disabled: !open, lock: !open && cl.t.rule, pick: () => Season.start(cl.e) }; }),
    update(dt) {
      const I = SN.game.input, its = this.items(), it = its[SN.UI.focus], cl = it && it.cell;
      if (cl) { const mv = (dc, dr) => { let best = -1, bd = 1e9; its.forEach((o, k) => { const q = o.cell, d = (q.c - cl.c - dc) ** 2 * 4 + (q.r - cl.r - dr) ** 2 * (dc ? .2 : 4); if (k !== SN.UI.focus && (dc ? Math.sign(q.c - cl.c) === dc : q.c === cl.c && Math.sign(q.r - cl.r) === dr) && d < bd) { bd = d; best = k; } }); if (best >= 0) { SN.UI.focus = best; SN.sfx('ui_move'); } };
        if (I.repeat('left')) mv(-1, 0); if (I.repeat('right')) mv(1, 0); if (I.repeat('up')) mv(0, -1); if (I.repeat('down')) mv(0, 1);
        if (I.pressed('camera')) { const ev = SN.SEASON.events[cl.e]; if (ev.brief) Story.play(ev.brief, () => {}); } }
    },
    draw(g, r, ui) {
      const Wd = r.W, H = r.H, cw = Math.min(100, Math.floor((Wd - 30) / 4)), x0 = Math.round((Wd - cw * 4 - 18) / 2), y0 = 62, d = SN.save.data, its = ui.items();
      tiers.forEach((t, c) => { const open = Season.tierOpen(t), x = x0 + c * (cw + 6); E.px.blend(g, .8, 'normal', () => px.rect(g, x, y0, cw, H - y0 - 24, open ? '#101828' : '#0a0a10')); T(g, t.name, x + cw / 2, y0 + 4, open ? '#29c8e8' : '#4a5470', { align: 'center', font: 'tiny' }); T(g, SN.CLASS[t.cls].name, x + cw / 2, y0 + 12, open ? '#ffffff' : '#4a5470', { align: 'center', font: 'tiny' }); if (!open) E.font.text(g, t.rule, x + cw / 2, y0 + 19, '#ff8a8a', { align: 'center', font: 'tiny', wrap: cw - 4, outline: false }); });
      its.forEach((it, k) => {
        const cl = it.cell, ev = SN.SEASON.events[cl.e], x = x0 + cl.c * (cw + 6) + 3, y = y0 + 34 + cl.r * 28, w = cw - 6, h = 25, on = k === ui.focus;
        it.rect = [x, y, w, h];
        px.rect(g, x, y, w, h, on ? '#ffffff' : it.disabled ? '#22242c' : '#3a4664'); px.rect(g, x + 1, y + 1, w - 2, h - 2, on ? '#1a5a78' : it.disabled ? '#101016' : '#16203a');
        T(g, ev.name, x + 4, y + 3, it.disabled ? '#4a5470' : '#ffffff', { font: 'tiny' });
        T(g, (SN.MODE_NAMES[ev.mode] || '') + (ev.track ? ' • ' + SN.TRACKS[ev.track].name.split(' ')[0] : ''), x + 4, y + 12, it.disabled ? '#3a4054' : '#9aa6c0', { font: 'tiny' });
        const m = d.medals[cl.e]; if (m) { px.disc(g, x + w - 7, y + 17, 4, MC[m]); px.disc(g, x + w - 7, y + 17, 2, SN.shade(MC[m], -.3)); }
        else if (!it.disabled) T(g, '-', x + w - 7, y + 15, '#4a5470', { align: 'center', font: 'tiny' });
        if (on) { px.rect(g, x - 2, y - 2, w + 4, 1, '#29c8e8'); px.rect(g, x - 2, y + h + 1, w + 4, 1, '#29c8e8'); }
      });
      const it = its[ui.focus]; if (it) { const ev = SN.SEASON.events[it.cell.e]; T(g, ev.rule === 'PLACE' ? 'GOLD 1ST • SILVER 2ND • BRONZE 3RD' : ev.rule === 'ZONE' ? 'GOLD ZONE 30 • SILVER 20 • BRONZE 10' : ev.rule === 'TIME' || ev.rule === 'LAP' ? 'GOLD ' + SN.medalTimes(ev.track, ev.cls)[ev.rule === 'TIME' ? 'tt' : 'lap'].map(t => SN.fmtTime(t)).join(' • ') : ev.rule === 'ALL DRILLS' ? 'GOLD: EVERY DRILL FIRST TRY • SILVER: 3 RETRIES OR FEWER' : 'POINTS 10-8-6-5-4-3-2-1 OVER FOUR RACES', Wd / 2, H - 27, '#ffd23f', { align: 'center', font: 'tiny' }); }
    } };
};
S.gp = () => {
  const d = SN.save.data, done = d.gp.round >= 4;
  let medal = null;
  return { id: 'gp', title: done ? 'GRAND PRIX FINAL' : 'GRAND PRIX • ROUND ' + (d.gp.round + 1) + '/4', sub: done ? 'FINAL STANDINGS' : 'NEXT: ' + SN.TRACKS[SN.SEASON.events.gp.tracks[d.gp.round]].name, layout: 'custom', back: false,
    enter() {
      const st = Season.standings(), me = st.find(s => s.pilot === d.pilot), lead = st[0];
      const situation = me.place === 1 ? 'gp_leading' : me.points >= lead.points - 6 ? 'gp_chasing' : 'gp_behind', pick = SN.STORY[situation][d.gp.round % 2];
      if (done) { medal = Season.gpFinish(); }
      Story.play(SN.STORY.gp_stand.concat(done ? [] : pick), () => {}, { leader: SN.PILOT[lead.pilot].name, gap: me.place === 1 ? (st[1] ? lead.points - st[1].points : 0) : lead.points - me.points });
    },
    items: () => [{ id: 'next', label: done ? 'CONTINUE' : 'NEXT RACE', rect: null, pick: () => { if (!done) Season.gpRun(); else { const m = medal; SN.UI.replace(S.ending(m)); } } }, !done && { id: 'quit', label: 'RETIRE', rect: null, pick: () => { d.gp.active = false; Save.write(); SN.UI.reset(S.main()); SN.UI.push(S.season()); } }].filter(Boolean),
    draw(g, r, ui) {
      const st = Season.standings(), Wd = r.W, H = r.H, w = Math.min(320, Wd - 20), x = Math.round((Wd - w) / 2), y = 60, rh = 13, lead = st[0] ? st[0].points : 0;
      E.ui.box(g, x, y, w, st.length * rh + 8, { bg: ['#141a2ee8', '#05060ce8'], border: '#ffd23f' });
      st.forEach((s, k) => { const yy = y + 5 + k * rh, me = s.pilot === d.pilot, p = SN.PILOT[s.pilot]; if (me) px.rect(g, x + 2, yy - 1, w - 4, rh - 1, '#1a5a78'); T(g, String(k + 1), x + 14, yy + 1, '#ffffff', { align: 'right' }); px.rect(g, x + 20, yy + 1, 5, rh - 4, SN.TEAM[p.team].colors[1]); T(g, p.name, x + 30, yy + 1, '#ffffff'); T(g, s.points + ' PTS', x + w - 60, yy + 1, '#ffd23f', { align: 'right' }); T(g, k ? '-' + (lead - s.points) : '', x + w - 8, yy + 1, '#9aa6c0', { align: 'right' }); });
      ui.items().forEach((it, k, a) => { it.rect = [Math.round(Wd / 2 - a.length * 77 + k * 154), H - 46, 146, 20]; });
      if (done && medal) T(g, 'GRAND PRIX ' + medal.toUpperCase() + ' MEDAL', Wd / 2, H - 64, MC[medal], { align: 'center', scale: 1 });
    } };
};
S.ending = (medal) => {
  const d = SN.save.data; let rolled = false;
  return { id: 'ending', title: medal ? 'CHAMPIONSHIP' : 'SEASON OVER', layout: 'custom', back: false, noShade: true,
    enter() {
      if (SN.hangar) SN.hangar.podium(Season.standings().slice(0, 3).map(s => s.pilot));
      SN.Audio && SN.Audio.stingNamed(medal ? 'win' : 'eliminated');
      Story.play(medal === 'gold' ? 'end_champion' : medal ? 'end_podium' : 'gp_none', () => { rolled = true; SN.UI.replace(S.about({ credits: true })); });
    },
    items: () => [], draw(g, r) { if (medal) E.font.title(g, medal === 'gold' ? 'CHAMPION' : 'PODIUM', r.W / 2, 16, { scale: 4, align: 'center', colors: ['#ffffff', '#ffe08a', '#ffb000'] }); }
  };
};
// the menu scene's season screens (opened by name from other scenes)
SN.screens.seasonFromResults = S.season;
})();
