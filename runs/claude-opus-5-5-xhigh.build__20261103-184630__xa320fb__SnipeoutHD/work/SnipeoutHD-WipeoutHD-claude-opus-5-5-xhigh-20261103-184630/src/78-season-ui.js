// SNIPEOUT HD: the season. Saves (game.saves: the autosave after every event and Grand Prix race), unlocks (FLARE, STORM,
// SINGULARITY, the champion livery), the season hub (four tiers of event tiles with medals), briefings and debriefs
// (dialog pages with live portraits and gibberish voices), the results (a podium cutaway, one row per craft, medals and
// records), the Grand Prix standings between rounds, and the ending with the credits.
(() => {
const E = My3D2dge, SN = globalThis.SN, px = E.px;
const T = (g, s, x, y, c, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: '#05040c' }, o));
const TW = (s, o = {}) => E.font.width(s, o);
const G = () => E.current, UI = SN.UI;

/* ---- the save ---- */
const fresh = () => ({ v: 1, started: false, medals: {}, gp: { round: 0, points: {}, done: false, medal: null }, unlocked: { classes: ['SPARK'], champion: false, ending: false }, seen: {}, records: {}, ghosts: {}, team: 'kestrel', pilot: 'vale', academy: null });
const SAVE = SN.save = {
  data: fresh(),
  init(game) {
    game.saves.write = () => ({ data: SAVE.data, place: 'SEASON 2161', level: SAVE.tierName() });
    game.saves.read = s => { SAVE.data = Object.assign(fresh(), s.data || {}); };
    try { const L = game.saves.latest(); if (L) game.saves.load(L.slot); } catch (e) { game.fail('saves', e); }
  },
  write() { try { G().saves.autosave(); } catch (e) { G().fail('autosave', e); } },
  reset() { SAVE.data = Object.assign(fresh(), { team: SAVE.data.team, pilot: SAVE.data.pilot, records: SAVE.data.records, ghosts: SAVE.data.ghosts }); SAVE.write(); },
  hasSeason() { return !!SAVE.data.started; },
  classUnlocked(c) { return SAVE.data.unlocked.classes.includes(c) || (SN.devUnlock === true); },
  tierOpen(t) {
    const T0 = SN.SEASON.tiers.find(x => x.id === t), n = T0.need; if (!n || SN.devUnlock) return true;
    if (n.tier) return SAVE.tierMedals(n.tier) >= n.medals;
    return n.events.every(e => !!SAVE.data.medals[e]);
  },
  tierMedals(t) { return SN.SEASON.tiers.find(x => x.id === t).events.filter(e => SAVE.data.medals[e]).length; },
  tierName() { let n = 'ROOKIE LICENCE'; for (const t of SN.SEASON.tiers) if (SAVE.tierOpen(t.id)) n = t.name; return n; },
  /** record an event's medal (the best kept); returns the unlocks it triggered */
  medal(eventId, m) {
    const D = SAVE.data, had = D.medals[eventId];
    if (m && SN.medalRank(m) > SN.medalRank(had)) D.medals[eventId] = m;
    return SAVE.checkUnlocks();
  },
  checkUnlocks() {
    const D = SAVE.data, out = [];
    const add = c => { if (!D.unlocked.classes.includes(c)) { D.unlocked.classes.push(c); out.push(c); } };
    if (SAVE.tierOpen('t2')) add('FLARE');
    if (SAVE.tierOpen('t3')) add('STORM');
    if (D.gp.medal) add('SINGULARITY');
    if (D.gp.medal === 'gold' && !D.unlocked.champion) { D.unlocked.champion = true; out.push('CHAMPION LIVERY'); }
    return out;
  },
  vars() {
    const D = SAVE.data, rival = SN.rivalFor(D.team), r = SN.PILOTS[rival];
    return { team: SN.TEAMS[D.team].name, pilot: SN.PILOTS[D.pilot].name, rival: r.name, rivalTeam: SN.TEAMS[r.team].name };
  }
};

/* ---- dialog pages with portraits and voices ---- */
const STORY = SN.story = {
  talk: null, queue: [], done: null, active: false,
  speakerOf(who) { const D = SAVE.data; return who === 'ORACLE' ? { name: 'ORACLE · RACE CONTROL', id: 'oracle' } : who === 'PRINCIPAL' ? { name: SN.PRINCIPALS[SN.TEAMS[D.team].principal].name, id: SN.TEAMS[D.team].principal } : who === 'RIVAL' ? { name: SN.PILOTS[SN.rivalFor(D.team)].name, id: SN.rivalFor(D.team) } : { name: SN.PILOTS[D.pilot].name, id: D.pilot }; },
  /** play lines [[speaker, text], ...] with vars, then done() */
  play(lines, vars, done) {
    if (!STORY.talk) STORY.talk = new E.Dialog(G(), { voice: null, speed: 70 });
    STORY.queue = lines.slice(); STORY.vars = Object.assign(SAVE.vars(), vars || {}); STORY.done = done || null; STORY.active = true; STORY.next();
  },
  next() {
    const L = STORY.queue.shift();
    if (!L) { STORY.active = false; const d = STORY.done; STORY.done = null; if (d) d(); return; }
    const sp = STORY.speakerOf(L[0]), text = L[1].replace(/\{\$(\w+)\}/g, (m, k) => STORY.vars[k] !== undefined ? STORY.vars[k] : m);
    SN.Voice.say(text, L[0] === 'ORACLE' ? SN.ORACLE : SN.Voice.of(sp.id));
    STORY.talk.say([text], { name: sp.name, portrait: (g, x, y, size) => SN.portrait(sp.id, g, x, y, size), portraitSize: 40, onDone: () => STORY.next(), place: 'bottom' });
  },
  /** a step: true while a dialog holds the screen (△ skips everything) */
  update(dt, I) {
    if (!STORY.active) return false;
    if (I.pressed('more')) { STORY.queue.length = 0; STORY.talk.close(); STORY.next(); return true; }
    STORY.talk.update(dt); return true;
  },
  draw(r) { if (STORY.active && STORY.talk) { STORY.talk.draw(r); r.overlay(g => { SN.UI.panel(g, r.W - 120, r.H - 96, 112, 15, '#05040c', .75, '#29c8e8'); SN.glyph.bar(g, [['confirm', 'NEXT'], ['more', 'SKIP ALL']], r.W - 12, r.H - 94, { right: true }); }); } }
};

/* ---- the season hub ---- */
const MED = { gold: '#ffd23f', silver: '#d8e0ec', bronze: '#d8884a' };
SN.drawMedal = (g, m, x, y, r = 5) => { if (!m) { px.disc(g, x, y, r, '#1a1a2a'); return; } px.disc(g, x, y, r + 1, '#05040c'); px.disc(g, x, y, r, MED[m]); px.disc(g, x - 1, y - 1, Math.max(1, r - 3), '#ffffff'); };
SN.screens.season = () => {
  const tiers = SN.SEASON.tiers, items = [];
  for (let row = 0; row < 4; row++) for (let c = 0; c < 4; c++) {
    const t = tiers[c], id = t.events[row];
    if (!id) { items.push({ skip: true }); continue; }
    const ev = SN.SEASON.events[id], open = SAVE.tierOpen(t.id);
    items.push({ ev, tier: t, disabled: !open, hint: 'LOCKED: ' + t.rule, onActivate: () => SN.flow.seasonEvent(id),
      draw(g, x, y, w, h, f) {
        const m = SAVE.data.medals[id] || (id === 'gp' ? SAVE.data.gp.medal : null);
        UI.panel(g, x, y, w, h, f ? '#163a5a' : open ? '#0c1020' : '#08080e', .9, f ? '#ffffff' : open ? '#29c8e8' : '#2a2a3a');
        T(g, ev.name, x + 4, y + 4, open ? '#ffffff' : '#4a4e60', { font: ev.name.length > 13 ? 'tiny' : undefined });
        T(g, SN.MODES[ev.mode].label, x + 4, y + 15, open ? '#7af0ff' : '#3a3e50', { font: 'tiny' });
        T(g, ev.track ? SN.TRACKS[ev.track].name : '4 CIRCUITS', x + 4, y + 23, open ? '#b8c4dc' : '#3a3e50', { font: 'tiny' });
        SN.drawMedal(g, m, x + w - 9, y + 9, 5);
        if (id === 'gp' && SAVE.data.gp.round > 0 && !SAVE.data.gp.done) T(g, 'ROUND ' + (SAVE.data.gp.round + 1) + '/4', x + 4, y + h - 9, '#ffd36a', { font: 'tiny' });
      } });
  }
  return {
    id: 'season', title: 'SEASON 2161', kicker: SN.TEAMS[SAVE.data.team].name + ' · ' + SN.PILOTS[SAVE.data.pilot].name, layout: 'grid', cols: 4, items, dim: .3,
    box: r => { const w = Math.min(96, (r.W - 40) / 4 - 6); return { x: (r.W - (w + 6) * 4 + 6) / 2, y: 68, w, h: 30, gap: 4 }; },
    draw(g, r) {
      const w = Math.min(96, (r.W - 40) / 4 - 6), x0 = (r.W - (w + 6) * 4 + 6) / 2;
      tiers.forEach((t, c) => { const open = SAVE.tierOpen(t.id), x = x0 + c * (w + 4); T(g, t.name, x, 50, open ? '#ffd36a' : '#5a5e70', { font: 'tiny' }); T(g, (open ? '' : 'LOCKED · ') + t.cls, x, 58, open ? SN.CLASSES[t.cls].color : '#4a4e60', { font: 'tiny' }); });
      const it = this.items[this.focus || 0]; if (it && it.ev) { const txt = it.disabled ? 'LOCKED: NEEDS ' + it.tier.rule : 'TARGET: ' + (it.ev.targetText || it.ev.target); UI.panel(g, 64, r.H - 40, r.W - 70, 14, '#05040c', .6, it.disabled ? '#ff6b6b' : '#29c8e8'); T(g, txt, r.W / 2, r.H - 37, it.disabled ? '#ff9a9a' : '#e8ecff', { align: 'center' }); }
    },
    update(dt, I) { if (I.pressed('more')) { const it = this.items[this.focus || 0]; if (it && it.ev && !it.disabled) { STORY.play(SN.STORY.brief[it.ev.id] || []); I.consumeAll(); return true; } } },
    prompts: [['confirm', 'RACE'], ['more', 'BRIEFING'], ['cancel', 'BACK']],
    resume() { UI.replace(SN.screens.season()); }
  };
};
SN.flow = SN.flow || {};
SN.flow.season = () => {
  const D = SAVE.data;
  const open = () => UI.push(SN.screens.season());
  if (!D.started) {
    // a new season: pick the team and pilot first, then the prologue
    SN.flow.setup({ mode: 'race' }); UI.stack.pop();
    const s = SN.screens.team(); s.kicker = 'SEASON 2161 ▸ SIGN WITH A TEAM';
    SN.setupState.onTeam = () => { D.started = true; D.team = SN.setupState.team; D.pilot = SN.setupState.pilot; SAVE.write(); UI.pop(); STORY.play(SN.STORY.prologue, null, () => { D.seen.prologue = true; SAVE.write(); open(); }); };
    UI.push(s); return;
  }
  open();
};
SN.flow.seasonEvent = id => {
  const D = SAVE.data, ev = SN.SEASON.events[id];
  const go = () => {
    D.seen[id] = true; SAVE.write();
    if (id === 'gp') { if (D.gp.done || D.gp.round >= 4) D.gp = { round: 0, points: {}, done: false, medal: D.gp.medal }; return SN.flow.gpRound(); }
    SN.flow.start({ mode: ev.mode, track: ev.track, cls: ev.cls, laps: ev.laps || 3, team: D.team, pilot: D.pilot, season: id, target: typeof ev.target === 'number' ? ev.target : undefined, champion: D.unlocked.champion && SN.setupState.champion });
  };
  if (!D.seen[id] && SN.STORY.brief[id]) STORY.play(SN.STORY.brief[id], null, go); else go();
};
SN.flow.gpRound = () => {
  const D = SAVE.data, ev = SN.SEASON.events.gp, k = D.gp.round;
  SN.flow.start({ mode: 'gp', track: ev.tracks[k], cls: ev.cls, laps: 3, team: D.team, pilot: D.pilot, season: 'gp', gpRound: k });
};

/* ---- after a race: medals, records, the season's progress; the summary the results screen shows ---- */
SN.flow.outcome = race => {
  const D = SAVE.data, pl = race.player, res = race.results(), mine = res.find(r => r.ship === pl) || res[0], cfg = race.cfg || {};
  const out = { res, mine, medal: null, records: [], unlocks: [], debrief: null, gp: null, mode: race.mode, cfg };
  if (!pl) return out;
  const mode = race.mode, recMode = mode === 'season' || mode === 'gp' || mode === 'versus' ? 'race' : mode;
  // records (not in the academy)
  if (mode !== 'academy' && mode !== 'hub') {
    const r = SN.Records.offer(D, race.track.id, race.cls, recMode, mode === 'overclock' ? { score: race.zone, pilot: pl.name } : { race: pl.dnf || !pl.finished || pl.estimated || mode === 'hotlap' || race.rules.target ? null : pl.finishT, lap: pl.bestLap, pilot: pl.name });
    if (r.race) out.records.push(mode === 'overclock' ? 'NEW BEST ZONE' : 'NEW RACE RECORD'); if (r.lap) out.records.push('NEW LAP RECORD');
    if (out.records.length) SN.audio.announce(SN.STORY.announce.record);
  }
  // the ghost: kept on a new best
  if ((mode === 'timetrial' || mode === 'hotlap') && race.ghostRec && out.records.length) D.ghosts[race.track.id + '/' + race.cls + '/' + mode] = SN.Ghost.encode(race.ghostRec.data);
  const mres = { place: mine.place, zone: race.zone, time: pl.finishT, bestLap: pl.bestLap, academyMedal: race.academy && race.academy.state === 'done' ? SN.Academy.medal(race.academy) : null };
  if (pl.dnf) mres.place = 99;
  out.medal = SN.medalFor(mode === 'season' ? 'race' : mode, mres, { track: race.track.id, cls: race.cls });
  if (cfg.season && cfg.season !== 'gp') {
    const had = D.medals[cfg.season];
    out.unlocks = SAVE.medal(cfg.season, out.medal);
    const db = SN.STORY.debrief[cfg.season];
    if (db) out.debrief = (mres.place === 1 && db.win) || (out.medal && (db.podium || db.medal)) || db.none || null;
    out.zone = race.zone;
    if (!had && out.medal) out.firstMedal = true;
  }
  if (cfg.season === 'gp') {
    const pts = SN.SEASON.gpPoints, G0 = D.gp;
    res.forEach((r, k) => { G0.points[r.pilot] = (G0.points[r.pilot] || 0) + (r.dnf ? 0 : pts[k] || 0); });
    G0.round = (cfg.gpRound || 0) + 1; G0.best = G0.best || {}; res.forEach((r, k) => { G0.best[r.pilot] = Math.min(G0.best[r.pilot] || 99, r.dnf ? 99 : k + 1); });
    const table = Object.keys(G0.points).map(p => ({ pilot: p, pts: G0.points[p], best: G0.best[p] || 99 })).sort((a, b) => b.pts - a.pts || a.best - b.best);
    out.gp = { table, round: G0.round };
    if (G0.round >= 4) {
      G0.done = true; const place = table.findIndex(r => r.pilot === pl.pilot) + 1;
      const m = place === 1 ? 'gold' : place === 2 ? 'silver' : place === 3 ? 'bronze' : null;
      if (SN.medalRank(m) > SN.medalRank(G0.medal)) G0.medal = m;
      out.gpMedal = m; out.unlocks = SAVE.checkUnlocks(); out.gp.final = true; out.gp.place = place;
    }
  }
  SAVE.write();
  return out;
};

/* ---- the results screen (one row per craft, medals, records, the actions) ---- */
SN.screens.results = (race, O) => {
  const humans = race.humans, rows = O.res.slice(0, 8), seasonish = !!(O.cfg.season);
  const acts = [
    { label: seasonish ? 'CONTINUE' : 'MENU', onActivate: () => SN.flow.afterResults(race, O) },
    O.cfg.season === 'gp' ? null : { label: 'RETRY', onActivate: () => SN.flow.start(Object.assign({}, O.cfg)) },
    race.recording && race.mode !== 'academy' ? { label: 'REPLAY', onActivate: () => SN.flow.replay(race) } : null,
    seasonish ? { label: 'MENU', onActivate: () => SN.flow.toMenu() } : null
  ].filter(Boolean);
  return {
    id: 'results', title: race.mode === 'overclock' ? 'ZONE ' + race.zone : race.mode === 'academy' ? 'ACADEMY' : 'RESULTS', kicker: SN.MODES[race.mode].label + ' · ' + SN.TRACKS[race.track.id].name + ' · ' + race.cls, layout: 'row', items: acts, noBack: true, dim: .45,
    box: r => ({ x: r.W - 4 - acts.length * 82, y: r.H - 44, w: 76, h: 18, gap: 6 }),
    draw(g, r) {
      const x = 14, y0 = 48, rh = race.rules.solo ? 0 : 15;
      if (!race.rules.solo) rows.forEach((R0, k) => {
        const y = y0 + k * rh, me = R0.human, team = SN.TEAMS[R0.team];
        if (me) UI.panel(g, x - 4, y - 2, r.W * .62, rh - 1, '#163a5a', .85, '#7af0ff');
        T(g, String(R0.place), x, y, me ? '#ffd36a' : '#ffffff', { scale: 1 }); px.rect(g, x + 14, y, 4, 9, team.colors.secondary); px.rect(g, x + 18, y, 2, 9, team.colors.glow);
        T(g, (R0.pi !== undefined && humans.length > 1 ? 'P' + (R0.pi + 1) + ' ' : '') + R0.name, x + 24, y, me ? '#ffffff' : '#c8d4ec');
        const tx = r.W * .42;
        if (race.rules.target) T(g, R0.points + ' PTS  ' + R0.kills + ' ELIM', tx, y, '#ffd36a');
        else T(g, R0.dnf ? 'ELIMINATED' : k === 0 ? SN.fmtTime(R0.time) : '+' + SN.fmtTime(R0.gap, { noMin: true }) + (R0.estimated ? '*' : ''), tx, y, R0.dnf ? '#ff6b6b' : '#ffffff');
        if (isFinite(R0.bestLap) && race.ships.every(s => s.bestLap >= R0.bestLap || s === R0.ship)) T(g, '★', x + r.W * .58, y, '#ffd36a');
      });
      // the player's summary: medal, records, unlocks
      const sx = r.W * .66, sy = 48, pl = race.player;
      UI.panel(g, sx, sy, r.W - sx - 8, 108, '#0a0c18', .88, O.medal ? MED[O.medal] : '#29c8e8');
      if (race.mode === 'overclock') { T(g, 'ZONE REACHED', sx + 8, sy + 8, '#7af0ff'); E.font.title(g, String(race.zone), sx + 8, sy + 18, { scale: 4, colors: [SN.hsl(race.zone * 37 % 360, 100, 75), SN.hsl(race.zone * 37 % 360, 100, 45)] }); }
      else if (race.mode === 'academy') { const A = race.academy; T(g, 'DRILLS PASSED ' + (A ? A.passed.length : 0) + '/11', sx + 8, sy + 8, '#ffffff'); T(g, 'FIRST TRY ' + (A ? A.firstTry.length : 0) + '  RETRIES ' + (A ? A.retries : 0), sx + 8, sy + 20, '#b8c4dc'); }
      else if (pl) { T(g, pl.dnf ? 'ELIMINATED' : race.mode === 'hotlap' ? 'BEST LAP' : SN.ordinal(O.mine.place) + ' PLACE', sx + 8, sy + 8, '#ffffff', { scale: 2 }); T(g, race.mode === 'hotlap' ? SN.fmtTime(pl.bestLap) : pl.dnf ? '' : SN.fmtTime(pl.finishT), sx + 8, sy + 26, '#ffd36a', { scale: 2 }); if (isFinite(pl.bestLap) && race.mode !== 'hotlap') T(g, 'BEST LAP ' + SN.fmtTime(pl.bestLap), sx + 8, sy + 44, '#b8c4dc'); }
      if (O.medal) { SN.drawMedal(g, O.medal, sx + 18, sy + 66, 9); T(g, O.medal.toUpperCase() + ' MEDAL', sx + 32, sy + 62, MED[O.medal], { scale: 1 }); }
      O.records.forEach((t, k) => { if (Math.floor(UI.t * 3) % 2 || k) T(g, t, sx + 8, sy + 80 + k * 10, '#ffd36a'); });
      O.unlocks.forEach((u, k) => T(g, 'UNLOCKED: ' + u, sx + 8, sy + 112 + k * 10, '#3aff6a'));
      if (O.gp) T(g, 'GRAND PRIX · AFTER ROUND ' + O.gp.round + ' OF 4', 14, r.H - 60, '#ffd36a');
      if (rows.some(R0 => R0.estimated)) T(g, '* ESTIMATED FROM PACE', 14, r.H - 50, '#5a6a8a', { font: 'tiny' });
    },
    prompts: [['confirm', 'SELECT']]
  };
};
SN.flow.afterResults = (race, O) => {
  const D = SAVE.data, chain = [];
  if (O.debrief) chain.push(O.debrief.map(([w, t]) => [w, t.replace('{$zone}', String(O.zone || race.zone))]));
  // promotions and unlocks
  for (const u of O.unlocks) { if (u === 'FLARE') chain.push(SN.STORY.promote.t2); if (u === 'STORM') chain.push(SN.STORY.promote.t3); }
  if (O.cfg.season && O.cfg.season !== 'gp' && SAVE.tierOpen('t4') && !D.seen.t4promo) { D.seen.t4promo = true; chain.push(SN.STORY.promote.t4); }
  const run = (k, done) => { if (k >= chain.length) return done(); STORY.play(chain[k], { zone: String(race.zone) }, () => run(k + 1, done)); };
  if (O.cfg.season === 'gp') {
    if (O.gp && O.gp.final) return run(0, () => SN.flow.gpStandings(O, () => O.gpMedal ? SN.flow.ending(O.gpMedal) : SN.flow.toSeason()));
    return run(0, () => SN.flow.gpStandings(O, () => SN.flow.gpRound()));
  }
  if (O.cfg.season) return run(0, () => SN.flow.toSeason());
  SN.flow.toMenu();
};
SN.flow.gpStandings = (O, next) => {
  const t = O.gp.table, pl = SAVE.data.pilot, me = t.findIndex(r => r.pilot === pl), lead = t[0];
  const situation = me === 0 ? 'leading' : me <= 2 ? 'chasing' : 'behind', line = SN.STORY.gpBetween[situation][O.gp.round % 2];
  SN.flow.toFront(() => {
    UI.reset(SN.screens.gpStandings(O, next));
    STORY.play([SN.STORY.gpBetween.standings[0], line], { leader: SN.PILOTS[lead.pilot].name, gap: String(me === 0 ? lead.pts - (t[1] ? t[1].pts : 0) : lead.pts - t[me].pts) });
  });
};
SN.screens.gpStandings = (O, next) => ({
  id: 'gp', title: O.gp.final ? 'FINAL STANDINGS' : 'GRAND PRIX', kicker: 'AFTER ROUND ' + O.gp.round + ' OF 4', noBack: true, layout: 'row', dim: .4,
  items: [{ label: O.gp.final ? 'CONTINUE' : 'NEXT RACE: ' + (O.gp.final ? '' : SN.TRACKS[SN.SEASON.events.gp.tracks[O.gp.round]].name), onActivate: next }],
  box: r => ({ x: r.W - 230, y: r.H - 44, w: 220, h: 18 }),
  draw(g, r) {
    const lead = O.gp.table[0]; O.gp.table.slice(0, 8).forEach((R0, k) => {
      const y = 50 + k * 16, P = SN.PILOTS[R0.pilot], me = R0.pilot === SAVE.data.pilot, team = SN.TEAMS[P.team];
      if (me) UI.panel(g, 10, y - 2, r.W * .7, 15, '#163a5a', .85, '#7af0ff');
      T(g, String(k + 1), 14, y, me ? '#ffd36a' : '#ffffff', { scale: 1 }); px.rect(g, 28, y, 4, 9, team.colors.secondary);
      T(g, P.name, 36, y, me ? '#ffffff' : '#c8d4ec'); T(g, R0.pts + ' PTS', r.W * .45, y, '#ffd36a'); if (k) T(g, '-' + (lead.pts - R0.pts), r.W * .58, y, '#b8c4dc');
    });
    if (O.gp.final && O.gpMedal) { SN.drawMedal(g, O.gpMedal, r.W - 40, 70, 12); T(g, O.gpMedal === 'gold' ? 'CHAMPION' : SN.ordinal(O.gp.place) + ' OVERALL', r.W - 40, 88, MED[O.gpMedal], { align: 'center' }); }
  },
  prompts: [['confirm', 'CONTINUE']]
});
/* ---- the ending: the lines, then the credits over the hangar podium ---- */
SN.flow.ending = medal => {
  SAVE.data.unlocked.ending = true; SAVE.write();
  SN.flow.toFront(() => {
    UI.reset(SN.screens.credits());
    SN.render.podiumPilots && SN.render.podiumPilots([SAVE.data.pilot, SN.rivalFor(SAVE.data.team), SN.TEAMS[SAVE.data.team].pilots.find(p => p !== SAVE.data.pilot)], medal === 'gold' ? 0 : medal === 'silver' ? 1 : 2);
    STORY.play(medal === 'gold' ? SN.STORY.ending.champion : SN.STORY.ending.podium, null, () => { SN.audio.sting('win'); });
  });
};
SN.screens.credits = () => ({
  id: 'credits', title: 'SEASON 2161', kicker: 'THE HOVERLINE CHAMPIONSHIP', noBack: true, dim: .25, items: [], scroll: 0,
  update(dt, I) { if (STORY.active) return true; this.scroll += dt * 14; if (I.pressed('confirm') || I.pressed('cancel') || I.clicked() || this.scroll > this.len + 40) { I.consumeAll(); SN.flow.toSeason(); } return true; },
  draw(g, r) {
    if (STORY.active) return;
    const lines = SN.ABOUT.credits.concat(['', 'SINGULARITY CLASS: UNLOCKED', SAVE.data.unlocked.champion ? 'CHAMPION LIVERY: UNLOCKED' : '', '', 'THANK YOU FOR RACING.']);
    let y = r.H - this.scroll; this.len = 0;
    for (const l of lines) for (const q of E.font.wrap(l, r.W - 80)) { if (y > 30 && y < r.H - 24) T(g, q, r.W / 2, y, '#ffffff', { align: 'center' }); y += 11; this.len += 11; }
  },
  prompts: [['confirm', 'SKIP']]
});
})();
