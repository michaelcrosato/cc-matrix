// The race HUD (§3.8, pixel art at game resolution, anchored to r.W x r.H) and the presenter that turns race events into
// sound, particles, shakes, rumble, HUD callouts, the announcer and the race radio
(() => {
const E = My3D2dge, SN = globalThis.SN, px = E.px, V = SN.V;
const T = (g, s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));

/* ---- weapon icons: 24 x 24 pixel drawings on a dark rounded tile ---- */
const ICON = {
  swarm: (g, x, y, c) => { for (const [dx, dy, a] of [[4, 14, -.5], [9, 9, 0], [14, 14, .5]]) { px.rect(g, x + dx, y + dy - 6, 3, 9, c); px.rect(g, x + dx, y + dy - 8, 3, 2, '#ffffff'); px.rect(g, x + dx - 1, y + dy + 2, 5, 2, '#ffb0a0'); } },
  seeker: (g, x, y, c) => { px.disc(g, x + 12, y + 12, 9, c); px.disc(g, x + 12, y + 12, 7, '#1a1420'); px.rect(g, x + 7, y + 11, 11, 3, c); px.rect(g, x + 17, y + 10, 2, 5, '#ffffff'); px.rect(g, x + 2, y + 12, 4, 1, c); },
  mine: (g, x, y, c) => { px.disc(g, x + 12, y + 12, 6, c); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; px.rect(g, Math.round(x + 12 + Math.cos(a) * 8), Math.round(y + 12 + Math.sin(a) * 8), 2, 2, c); } px.rect(g, x + 11, y + 11, 2, 2, '#ffffff'); },
  cannon: (g, x, y, c) => { for (let k = 0; k < 3; k++) { px.rect(g, x + 3 + k * 6, y + 6 + k * 5, 6, 2, c); px.rect(g, x + 9 + k * 6, y + 6 + k * 5, 2, 2, '#ffffff'); } },
  rail: (g, x, y, c) => { px.disc(g, x + 7, y + 12, 5, c); px.disc(g, x + 7, y + 12, 3, '#1a1420'); px.rect(g, x + 1, y + 12, 12, 1, c); px.rect(g, x + 7, y + 6, 1, 12, c); px.rect(g, x + 12, y + 11, 11, 3, '#ffffff'); },
  tremor: (g, x, y, c) => { for (let k = 0; k < 20; k++) px.rect(g, x + 2 + k, Math.round(y + 11 + Math.sin(k * .7) * 4), 1, 2, c); px.rect(g, x + 2, y + 19, 20, 2, '#8a8a9a'); },
  bulwark: (g, x, y, c) => { const P = []; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6; P.push([x + 12 + Math.cos(a) * 9, y + 12 + Math.sin(a) * 9]); } px.poly(g, P, c); px.poly(g, P.map(p => [x + 12 + (p[0] - x - 12) * .6, y + 12 + (p[1] - y - 12) * .6]), '#1a1420'); },
  auto: (g, x, y, c) => { px.rect(g, x + 4, y + 8, 16, 3, c); px.rect(g, x + 4, y + 8, 3, 9, c); px.rect(g, x + 17, y + 8, 3, 9, c); px.rect(g, x + 10, y + 11, 4, 8, c); E.font.text(g, 'A', x + 12, y + 1, '#ffffff', { font: 'tiny', align: 'center', outline: false }); },
  nitro: (g, x, y, c) => { for (const o of [0, 7]) { px.poly(g, [[x + 4 + o, y + 4], [x + 11 + o, y + 12], [x + 4 + o, y + 20], [x + 7 + o, y + 12]], o ? c : '#ffffff'); } },
  siphon: (g, x, y, c) => { px.line(g, x + 2, y + 6, x + 7, y + 11, c, 2); px.line(g, x + 7, y + 11, x + 4, y + 14, c, 2); px.line(g, x + 4, y + 14, x + 11, y + 18, c, 2); px.disc(g, x + 17, y + 15, 4, c); px.poly(g, [[x + 17, y + 6], [x + 13, y + 14], [x + 21, y + 14]], c); }
};
SN.drawWeaponIcon = (g, id, x, y, scale = 1) => {
  const w = SN.WEAPON[id]; px.rect(g, x + 1, y, 22, 24, '#0a0a12'); px.rect(g, x, y + 1, 24, 22, '#0a0a12'); px.rect(g, x + 2, y + 1, 20, 22, '#1a1420'); px.rect(g, x + 1, y + 2, 22, 20, '#1a1420');
  if (w) ICON[id](g, x, y, w.color);
};

/* ---- the presenter: race events -> sound, particles, callouts ---- */
const Present = SN.Present = {
  radioT: 0,
  events(R, sc) {
    const view = sc.vw, g = SN.game, H = SN.HUD, A = SN.Audio, humans = R.humans;
    const isMe = sh => sh && sh.control === 'human', near = sh => { const me = view.cams[0].ship; return me && sh && V.dist(me.P, sh.P) < 2400; };
    const P = g.particles;
    for (const e of R.events) {
      const sh = e.ship, me = isMe(sh), pi = me ? sh.player : -1;
      switch (e.t) {
        case 'count': A && A.sfx('count_beep'); A && A.announce(['', 'ONE', 'TWO', 'THREE'][e.n] || ''); break;
        case 'go': A && A.sfx('count_go'); A && A.announce('GO'); H.callout('GO!', -1, '#5aff9a'); A && A.go(); break;
        case 'perfect': H.callout('PERFECT START', pi, '#5aff9a'); A && A.announce('PERFECT START'); A && A.sfx('roll_boost'); break;
        case 'stall': H.callout('STALL', pi, '#ff5a6e'); A && A.sfx('botch'); break;
        case 'pickup': if (me) { H.spin(pi, e.weapon); A && A.sfx('pickup_roll'); A && A.announce(SN.WEAPON[e.weapon].name, .6); } else if (near(sh)) A && A.sfx('weapon_pad', { vol: .3 }); break;
        case 'fire': if (me || near(sh)) A && A.sfx({ swarm: 'swarm_fire', seeker: 'seeker_fire', mine: 'mine_drop', cannon: 'cannon_fire', rail: 'rail_fire', tremor: 'tremor', bulwark: 'bulwark_on', auto: 'autopilot_on', nitro: 'nitro', siphon: 'siphon' }[e.weapon], { vol: me ? 1 : .4 });
          if (e.weapon === 'rail') { view.flashAt(sh.P[0], sh.P[1], sh.P[2], '#bff8ff'); if (me) g.flash('#bff8ff', .06, .3); sc.vw.cams[0].forceCut = true; }
          if (e.weapon === 'auto' && me) H.callout('AUTOPILOT', pi, '#3ae8d0'); if (e.weapon === 'bulwark' && me) H.callout('BULWARK', pi, '#4a8aff'); if (e.weapon === 'nitro' && me) H.callout('NITRO', pi, '#ffb000');
          break;
        case 'railCharge': if (me) A && A.sfx('rail_charge'); break;
        case 'bolt': if (me && Math.random() < .5) A && A.sfx('cannon_fire', { vol: .5 }); break;
        case 'mineDrop': if (me) A && A.sfx('mine_drop', { vol: .5 }); break;
        case 'lock': if (isMe(e.target)) { A && A.sfx('seeker_lock'); H.warn(e.target.player); } if (me) { A && A.sfx('seeker_lock'); H.callout('LOCKED', pi, '#ff9a2a'); } break;
        case 'hit': {
          const tg = sh, hm = isMe(tg), by = isMe(e.by);
          if (hm || by || near(tg)) { P.sparks(tg.P[0], tg.P[1], tg.P[2] + 8, e.weapon === 'cannon' ? 3 : 10, 0); if (e.dmg > 15) P.explosion(tg.P[0], tg.P[1], tg.P[2] + 8, .5, { shake: 0, freeze: false }); A && A.sfx(e.dmg > 15 ? 'hit_heavy' : 'hit_light', { vol: hm || by ? 1 : .4 }); }
          if (hm) { g.shake(e.dmg > 15 ? 6 : 2); H.hurt(tg.player); const I = g.players[tg.player] || g.input; I.rumble && I.rumble(e.dmg > 15 ? .9 : .4, .25); }
          if (by && e.weapon !== 'cannon') H.callout('HIT ' + tg.name.split(' ')[0], e.by.player, '#ffd23f');
          if (hm && e.dmg > 10) Present.radio(R, e.by, 'hitYou');
          break;
        }
        case 'blocked': if (isMe(sh)) H.callout('BLOCKED', sh.player, '#4a8aff'); break;
        case 'dodge': if (me) H.callout('DODGED', pi, '#5aff6a'); break;
        case 'boom': { const p = R.track.point(e.s, e.u, 14); if (V.dist(p, view.cams[0].ship.P) < 3000) { P.explosion(p[0], p[1], p[2], .35, { shake: 0, freeze: false, debris: false }); } break; }
        case 'wall': if (me || near(sh)) { const f = R.track.frameAt(sh.s), side = e.side; P.sparks(sh.P[0] + f.R[0] * side * 24, sh.P[1] + f.R[1] * side * 24, sh.P[2] + 4, Math.min(14, 3 + e.impact / 60), Math.atan2(-sh.F[1], -sh.F[0])); A && A.sfx('wall_hit', { vol: me ? Math.min(1, e.impact / 600) : .3, pitch: .8 + Math.min(.6, e.impact / 1500) }); }
          if (me) { g.shake(Math.min(5, e.impact / 200)); const I = g.players[pi] || g.input; I.rumble && I.rumble(Math.min(1, e.impact / 800), .15); } break;
        case 'scrape': if ((me || near(sh)) && R.steps % 3 === 0) { const f = R.track.frameAt(sh.s), side = e.side || 0; P.sparks(sh.P[0] + f.R[0] * side * 24, sh.P[1] + f.R[1] * side * 24, sh.P[2] + 2, 1, Math.atan2(-sh.F[1], -sh.F[0])); if (me) A && A.scrape(); } break;
        case 'bump': if (isMe(sh) || isMe(e.other)) { A && A.sfx('bump'); g.shake(2); } break;
        case 'pad': if (me) { A && A.sfx('boost_pad'); H.boostFlash(pi); } break;
        case 'shift': if (me) A && A.sfx('sideshift'); break;
        case 'rollstart': if (me) A && A.sfx('roll'); break;
        case 'roll': if (me) { if (e.ok) { H.callout(e.n > 1 ? 'BARREL ROLL x' + e.n : 'BARREL ROLL', pi, '#5aff9a'); A && A.announce('BARREL ROLL'); A && A.sfx('roll_boost'); } else { H.callout('BOTCHED', pi, '#ff5a6e'); A && A.sfx('botch'); } } break;
        case 'launch': if (me) A && A.sfx('whoosh_up'); break;
        case 'land': if (me || near(sh)) { const z = R.track.groundBelow(sh.P[0], sh.P[1], sh.P[2] + 4); P.dust(sh.P[0], sh.P[1], isFinite(z) ? z : sh.P[2], e.hard ? 10 : 4); } if (me) { A && A.sfx(e.hard ? 'land_hard' : 'land_soft'); if (e.hard) g.shake(5); } break;
        case 'lap': if (me) { H.lap(pi, e.time, e.best, sh); A && A.sfx('lap'); if (e.best && sh.lap > 1 && R.mode === 'hotlap') A && A.announce('NEW LAP RECORD'); } break;
        case 'finalLap': if (me) { H.callout('FINAL LAP', pi, '#ffd23f'); A && A.announce('FINAL LAP'); A && A.finalLap(); Present.radio(R, null, 'final'); } break;
        case 'finish': if (me) { H.callout(R.mode === 'race' ? SN.ord(e.place) + ' PLACE' : 'FINISH', pi, e.place === 1 ? '#ffd23f' : '#ffffff'); A && A.sfx('finish'); A && A.announce(e.place === 1 && R.mode === 'race' ? 'WINNER' : 'RACE OVER'); A && A.raceOver(); } break;
        case 'raceOver': break;
        case 'elim': { P.explosion(sh.P[0], sh.P[1], sh.P[2] + 8, 1.4, { shake: me ? 8 : near(sh) ? 3 : 0 }); view.flashAt(sh.P[0], sh.P[1], sh.P[2]); if (me || near(sh)) A && A.sfx('explode'); if (me) { H.callout('ELIMINATED', pi, '#ff5a6e'); A && A.announce('ELIMINATED'); A && A.sfx('eliminated'); } if (isMe(e.by)) { H.callout('ELIMINATED ' + sh.name.split(' ')[0], e.by.player, '#ffd23f'); } view.cams.forEach(c => c.forceCut = true); if (!me) Present.radio(R, sh, 'elim'); break; }
        case 'sniped': if (isMe(e.by) || isMe(sh)) { H.callout('SNIPED!', isMe(e.by) ? e.by.player : sh.player, '#bff8ff'); A && A.announce('SNIPED'); } break;
        case 'respawn': if (me) { A && A.sfx('respawn'); H.callout('RESPAWN', pi, '#bff8ff'); } break;
        case 'rescue': if (me) { A && A.sfx('rescue'); H.callout('RESCUE', pi, '#ffd23f'); } break;
        case 'wrongway': if (me) { H.callout('WRONG WAY', pi, '#ff5a6e'); A && A.announce('WRONG WAY'); A && A.sfx('wrongway'); } break;
        case 'pos': if (me && R.state === 'racing') { A && A.sfx(e.to < e.from ? 'pos_up' : 'pos_down', { vol: .5 }); if (e.to > e.from) { const passer = R.order[e.to - 2]; if (passer && passer.control === 'ai') Present.radio(R, passer, 'pass'); } } break;
        case 'zone': H.callout('ZONE ' + e.n, -1, '#ff3ab4'); A && A.announce('ZONE ' + e.n); A && A.zone(e.n); break;
        case 'absorb': if (me) { A && A.sfx('absorb'); H.callout('+' + Math.round(e.amount) + ' SHIELD', pi, '#5aff9a'); } break;
        case 'autoOff': if (me) A && A.sfx('autopilot_off'); break;
        case 'snipeoutEnd': A && A.announce('RACE OVER'); break;
        case 'drill': break;
      }
    }
    // the low-shield warning and loops
    for (const h of humans) { if (h.energy < 25 && !h.elim && h.lowT > 0 && Math.floor(h.lowT / .8) !== Math.floor((h.lowT - SN.DT) / .8)) A && A.sfx('low_shield'); }
    Present.radioT -= SN.DT;
  },
  /** race radio: a pilot's line in the radio box, rate-limited to one per 12 s */
  radio(R, who, why) {
    if (Present.radioT > 0 || R.attract || !R.humans.length) return;
    let p = who && SN.PILOT[who.pilot]; const me = R.humans[0];
    if (why === 'final' || !p) { const mate = R.ships.find(s => s.control === 'ai' && s.team === me.team); p = mate && SN.PILOT[mate.pilot]; if (!p) return; }
    const rival = SN.rivalOf(me.team), isRival = p.id === rival;
    const lines = why === 'pass' ? (isRival ? ['Behind you. Still.', 'Too slow, rookie.', p.line] : [p.line, ...p.more, 'Make room.']) : why === 'hitYou' ? [isRival ? 'Smile for the wreck report.' : 'Nothing personal.', 'That one stung. For you.', p.more[0]] : why === 'elim' ? ['Lost one.', 'Shield gone. I\'m out.', 'Wreck report incoming.'] : why === 'final' ? ['Final lap. Bring it home.', 'Shield\'s holding. Go.', 'Pit lane, now, if you need it.'] : [p.line];
    const text = lines[Math.floor(R.rng('radio')() * lines.length)];
    SN.HUD.radio(p, text); SN.Audio && SN.Audio.voice(text, { f0: p.f0, speed: 1.15, crush: p.crush }); Present.radioT = 12;
  }
};

/* ---- the HUD ---- */
const HUD = SN.HUD = {
  reset(R, sc) { this.R = R; this.sc = sc; this.p = [0, 1].map(() => ({ callouts: [], spin: 0, spinW: null, lapShow: 0, lapTime: 0, lapDelta: null, hurt: 0, warn: 0, note: null, noteT: 0, boost: 0 })); this.radioBox = null; this.subs = []; this.toast = null; },
  callout(text, pi, color = '#ffffff') { const list = pi < 0 ? this.p : [this.p[pi] || this.p[0]]; for (const p of list) { p.callouts.unshift({ text, color, t: 0 }); if (p.callouts.length > 2) p.callouts.length = 2; } },
  spin(pi, w) { const p = this.p[pi] || this.p[0]; p.spin = .5; p.spinW = w; },
  warn(pi) { const p = this.p[pi] || this.p[0]; p.warn = 1.5; },
  hurt(pi) { const p = this.p[pi] || this.p[0]; p.hurt = .4; },
  boostFlash(pi) { const p = this.p[pi] || this.p[0]; p.boost = .4; },
  lap(pi, time, best, sh) { const p = this.p[pi] || this.p[0]; p.lapShow = 3; p.lapTime = time; p.lapDelta = sh.lapTimes.length > 1 ? time - Math.min(...sh.lapTimes.slice(0, -1)) : null; },
  note(text, pi) { const p = this.p[pi] || this.p[0]; p.note = text; p.noteT = 1.5; },
  radio(pilot, text) { this.radioBox = { pilot, text, t: 4 }; },
  subtitle(text) { if (!SN.game.settings.subtitles || !this.subs) return; this.subs.unshift({ text, t: 2.2 }); if (this.subs.length > 2) this.subs.length = 2; },
  /** a viewport's HUD (the whole screen when not split) */
  draw(r, sc, vi) {
    const R = sc.race, me = R.humans[vi], ps = this.p && this.p[vi]; if (!ps) return;
    const g0 = SN.game, dt = 1 / 60, vp = r.viewport || { x: 0, y: 0, w: r.W, h: r.H }, split = g0.viewports.length > 1, big = g0.settings.hudSize === 'large' ? 1 : 0;
    for (const c of ps.callouts) c.t += dt; ps.callouts = ps.callouts.filter(c => c.t < 1.2);
    ps.spin = Math.max(0, ps.spin - dt); ps.lapShow = Math.max(0, ps.lapShow - dt); ps.hurt = Math.max(0, ps.hurt - dt); ps.warn = Math.max(0, ps.warn - dt); ps.noteT = Math.max(0, ps.noteT - dt); ps.boost = Math.max(0, ps.boost - dt);
    if (sc.replaying) return this.replayHud(r, sc);
    if (R.attract) return SN.Attract && SN.Attract.hud(r, R);
    if (!me || (SN.Dev && SN.Dev.hudOff)) return;
    r.overlay(g => {
      const X = vp.x, Y = vp.y, Wd = vp.w, H = vp.h, s1 = 1 + big, s2 = 2 + big;
      if (g0.settings.speedLines !== false && !g0.reduceMotion) this.speedLines(g, me, X, Y, Wd, H);
      const ox = this.sc.vw.world && R.state !== 'intro' ? 0 : 0;
      if (R.state === 'intro') { this.trackCard(g, R, X, Y, Wd, H); return; }
      // name tags over nearby craft
      const w3 = sc.vw.world; if (w3 && !split) for (const sh of R.ships) { if (sh === me || sh.elim) continue; const d = V.dist(sh.P, me.P); if (d > 2500) continue; const p = w3.project(sh.P[0], sh.P[1], sh.P[2] + 34); if (!p) continue; const a = Math.max(.25, 1 - d / 2500); E.px.blend(g, a, 'normal', () => { T(g, (R.mode === 'snipeout' ? sh.points + ' • ' : sh.place + ' ') + sh.name.split(' ').pop(), Math.round(p[0]), Math.round(p[1]) - 8, sh.ghost ? '#bff8ff' : '#ffffff', { align: 'center', font: 'tiny' }); }); }
      // top left: position / points / zone
      if (R.mode === 'overclock') { E.font.title(g, 'ZONE ' + R.zone, X + 8, Y + 6, { scale: 3 + big, colors: ['#ffffff', '#ff8ad8', '#ff3ab4'] }); const k = R.zoneT / R.rules.zoneT; px.rect(g, X + 8, Y + 34 + big * 8, 100, 4, '#2a1030'); px.rect(g, X + 8, Y + 34 + big * 8, Math.round(100 * k), 4, '#ff3ab4'); }
      else if (R.mode === 'snipeout') { const top = R.order.slice(0, 4); T(g, 'FIRST TO ' + R.target, X + 8, Y + 6, '#ff9a6a'); top.forEach((sh, k) => { const mine = sh === me; T(g, (k + 1) + ' ' + sh.name.split(' ').pop(), X + 8, Y + 18 + k * (10 + big * 3), mine ? '#ffd23f' : '#ffffff', { scale: s1 > 1 && !split ? 1 : 1 }); T(g, String(sh.points), X + 100, Y + 18 + k * (10 + big * 3), mine ? '#ffd23f' : '#ffffff', { align: 'right' }); }); if (!top.includes(me)) T(g, me.place + ' YOU ' + me.points, X + 8, Y + 60, '#ffd23f'); T(g, SN.fmtTime(Math.max(0, R.timeLimit - Math.max(0, R.t)), false), X + 8, Y + 74, '#bff8ff'); }
      else if (R.mode !== 'timetrial' && R.mode !== 'hotlap' && R.mode !== 'academy') {
        E.font.title(g, String(me.place), X + 8, Y + 4, { scale: split ? 3 : 4 + big, colors: ['#ffffff', '#bff8ff', '#29c8e8'] });
        T(g, '/' + R.ships.length, X + 8 + E.font.width(String(me.place), { scale: split ? 3 : 4 + big }) + 2, Y + (split ? 14 : 20 + big * 4), '#bff8ff');
      }
      if (R.mode !== 'overclock' && R.mode !== 'snipeout' && R.mode !== 'academy') T(g, R.mode === 'hotlap' ? 'LAP ' + (me.lap + 1) : 'LAP ' + Math.min(R.laps, me.lap + 1) + '/' + R.laps, X + 8, Y + (split ? 28 : 38 + big * 8), '#ffffff', { scale: s1 });
      // radio box
      if (this.radioBox && !split) { const rb = this.radioBox; rb.t -= dt; if (rb.t <= 0) this.radioBox = null; else { const y = Y + 56 + big * 10; E.ui.box(g, X + 6, y, 170, 30, { bg: ['#141a2e', '#05060c'], border: SN.TEAM[rb.pilot.team].colors[1], alpha: .85 }); SN.rigFor(rb.pilot.id, true).drawPortrait(g, X + 9, y + 2, 26, { bg: '#0a0c16' }); T(g, rb.pilot.name, X + 38, y + 4, SN.TEAM[rb.pilot.team].colors[1] === '#16161c' ? '#ff5a6e' : SN.TEAM[rb.pilot.team].colors[1], { font: 'tiny' }); if (g0.settings.subtitles) E.font.text(g, rb.text, X + 38, y + 13, '#ffffff', { wrap: 134, font: 'tiny', outline: false }); } }
      // top centre: time, lap time, delta
      if (R.mode !== 'overclock' || true) { const t = R.going ? R.t : 0; T(g, SN.fmtTime(Math.max(0, me.finished ? me.finishTime : t)), X + Wd / 2, Y + 6, '#ffffff', { align: 'center', scale: s2 }); }
      if (ps.lapShow > 0) { T(g, 'LAP ' + SN.fmtTime(ps.lapTime), X + Wd / 2, Y + 24 + big * 6, '#bff8ff', { align: 'center' }); if (ps.lapDelta !== null) T(g, (ps.lapDelta < 0 ? '-' : '+') + Math.abs(ps.lapDelta).toFixed(2), X + Wd / 2, Y + 34 + big * 6, ps.lapDelta < 0 ? '#5aff9a' : '#ff5a6e', { align: 'center' }); }
      if (R.mode === 'hotlap' || R.mode === 'timetrial') { const rec = SN.save && SN.save.data.records[R.track.id + '/' + R.cls + '/' + R.mode]; T(g, 'BEST ' + (me.bestLap < 1e9 ? SN.fmtTime(me.bestLap) : '--') + (rec ? '  REC ' + SN.fmtTime(rec.ms / 1000) : ''), X + Wd / 2, Y + 46 + big * 6, '#ffd23f', { align: 'center', font: 'tiny' }); }
      // top right: the minimap
      if (!split || Wd > 300) this.minimap(g, R, me, X + Wd - (split ? 52 : 80), Y + 6, split ? 46 : 72);
      // bottom left: the weapon
      const wy = Y + H - 44 - big * 6;
      if (R.rules.weapons !== false) {
        px.rect(g, X + 6, wy, 30, 30, '#05060c'); px.rect(g, X + 7, wy + 1, 28, 28, ps.spin > 0 ? '#3a2a10' : '#141a2e');
        const wid = ps.spin > 0 ? SN.WEAPONS[Math.floor(ps.spin * 30) % 10].id : me.weapon;
        if (wid) SN.drawWeaponIcon(g, wid, X + 9, wy + 3);
        if (me.weapon && ps.spin <= 0) {
          T(g, SN.WEAPON[me.weapon].name, X + 40, wy + 2, SN.WEAPON[me.weapon].color, { scale: s1 });
          const I = g0.players[vi] || g0.input; SN.glyph.row(g, I, [['fire', me.weapon === 'rail' ? 'HOLD' : 'FIRE'], ['absorb', 'ABSORB']], X + 40, wy + 15 + big * 3, { color: '#c8d0e0' });
          if (me.weapon === 'rail' && me.charge > 0) { const k = me.charge / .8; for (let a = 0; a < 24; a++) if (a / 24 < k) px.rect(g, Math.round(X + 21 + Math.cos(a / 24 * 6.28 - 1.57) * 17), Math.round(wy + 15 + Math.sin(a / 24 * 6.28 - 1.57) * 17), 2, 2, k >= 1 ? '#ff3a3a' : '#bff8ff'); }
          if (me.weapon === 'seeker' && me.lockOn && w3) { const p = w3.project(me.lockOn.P[0], me.lockOn.P[1], me.lockOn.P[2] + 10); if (p) { const lk = me.lockT >= .6, rad = lk ? 10 : 16 - me.lockT * 10, rot = SN.game.real * 4, c = lk ? '#ff3a3a' : '#ff9a2a'; for (let q = 0; q < 4; q++) { const a = rot + q * Math.PI / 2, cx = p[0] + Math.cos(a) * rad, cy = p[1] + Math.sin(a) * rad; px.rect(g, Math.round(cx) - 2, Math.round(cy) - 2, 4, 4, c); } if (lk) T(g, 'LOCK', p[0], p[1] + 14, '#ff3a3a', { align: 'center', font: 'tiny' }); } }
        }
        if (me.autoT > 0) T(g, 'AUTOPILOT ' + me.autoT.toFixed(1), X + 40, wy - 10, '#3ae8d0');
        if (me.shieldT > 0) T(g, 'BULWARK ' + me.shieldT.toFixed(1), X + 40, wy - 10, '#4a8aff');
      }
      // bottom right: speed and energy
      const v = Math.max(0, SN.Ship.fwdSpeed(me)), top = me.st.top * SN.Tune.T.topSpeedMul, bx = X + Wd - 112 - big * 10, by = Y + H - 40 - big * 8, boost = me.boostT > 0 || me.nitroT > 0;
      T(g, SN.speedText(v), X + Wd - 8, by - 14 - big * 4, boost ? '#ff8ad8' : '#ffffff', { align: 'right', scale: s2 });
      for (let k = 0; k < 24; k++) { const on = k / 24 < v / (top * 1.35); px.rect(g, bx + k * 4, by + 2 - Math.floor(k / 6), 3, 6 + Math.floor(k / 6), on ? (boost ? (k > 17 ? '#ff3ab4' : '#ffffff') : k > 17 ? '#ffffff' : '#29c8e8') : '#1a2030'); }
      const en = me.energy / 100, ec = en > .5 ? '#5aff9a' : en > .25 ? '#ffd23f' : '#ff3a3a', blink = en <= .25 && Math.floor(SN.game.real * 6) % 2, shk = ps.hurt > 0 ? Math.round(Math.sin(SN.game.real * 80) * 2) : 0;
      T(g, 'SHIELD', bx + shk, by + 13, '#c8d0e0', { font: 'tiny' });
      for (let k = 0; k < 20; k++) px.rect(g, bx + 24 + k * 4 + shk, by + 13, 3, 6, k / 20 < en && !blink ? ec : '#2a1a20');
      if (en < .3 && R.track.pit && R.mode !== 'overclock') T(g, 'PIT', bx + 24, by + 22, Math.floor(SN.game.real * 3) % 2 ? '#5aff9a' : '#1f5a3a', { font: 'tiny' });
      if (me.inPit) T(g, 'RECHARGING', bx + 44, by + 22, '#5aff9a', { font: 'tiny' });
      if (ps.boost > 0 || boost) T(g, 'BOOST', bx, by - 8, '#ff8ad8', { font: 'tiny' });
      // centre: countdown, rev bar, callouts, incoming lock, notes, ghost gap
      if (R.state === 'countdown' || R.state === 'grid') {
        const n = R.state === 'grid' ? 3 : Math.ceil(-R.t); if (n > 0 && n <= 3) { const f = R.state === 'grid' ? 0 : 1 - ((-R.t) % 1); E.font.title(g, String(n), X + Wd / 2, Y + H * .17, { scale: Math.round(5 + f * 2), align: 'center', colors: ['#ffffff', '#ffd23f', '#ff5a2a'] }); }
        const rw = 100, rx = X + Wd / 2 - rw / 2, ry = Y + H * .17 + 62; px.rect(g, rx - 1, ry - 1, rw + 2, 8, '#000'); px.rect(g, rx + rw * .72, ry, rw * .16, 6, '#1f5a3a'); px.rect(g, rx, ry, Math.round(rw * me.revs), 6, me.revs > .95 ? '#ff3a3a' : me.revs >= .72 && me.revs <= .88 ? '#5aff9a' : '#ffd23f');
        const I = g0.players[vi] || g0.input, it = [['thrust', 'HOLD TO REV']]; SN.glyph.row(g, I, it, X + Wd / 2 - SN.glyph.rowWidth(I, it) / 2, ry + 10);
      }
      ps.callouts.forEach((c, k) => { const a = c.t < .15 ? c.t / .15 : c.t > .9 ? (1.2 - c.t) / .3 : 1, sc2 = c.t < .15 ? 3 + big : 2 + big; E.px.blend(g, Math.max(0, a), 'normal', () => E.font.title(g, c.text, X + Wd / 2, Y + H * .26 + k * 22, { scale: split ? 2 : sc2, align: 'center', colors: ['#ffffff', c.color] })); });
      if (ps.warn > 0 || R.weapons.lockedOn(me)) { if (Math.floor(SN.game.real * 8) % 2) { px.poly(g, [[X + Wd / 2, Y + H - 30], [X + Wd / 2 - 8, Y + H - 42], [X + Wd / 2 + 8, Y + H - 42]], '#ff3a3a'); T(g, 'LOCK', X + Wd / 2, Y + H - 28, '#ff3a3a', { align: 'center', font: 'tiny' }); } }
      for (const o of R.ships) if (o.weapon === 'rail' && o.charge > .2 && o !== me && R.weapons.railTarget(o, 48) === me) T(g, '! RAILSHOT', X + Wd / 2, Y + H - 56, '#ff3a3a', { align: 'center' });
      if (ps.noteT > 0) T(g, ps.note, X + Wd / 2, Y + 50, '#bff8ff', { align: 'center' });
      if (me.wrongWay) T(g, 'WRONG WAY', X + Wd / 2, Y + H / 2, Math.floor(SN.game.real * 4) % 2 ? '#ff3a3a' : '#ffffff', { align: 'center', scale: s2 });
      if (me.rescueT > 0) T(g, 'RESCUE DRONE', X + Wd / 2, Y + H / 2 + 20, '#ffd23f', { align: 'center' });
      if (me.elim && me.respawnT > 0) T(g, 'RESPAWN IN ' + Math.ceil(me.respawnT), X + Wd / 2, Y + H / 2 + 20, '#ffffff', { align: 'center', scale: s1 });
      if (sc.ghost && R.going) { const gl = sc.vw.ghostList && sc.vw.ghostList[0]; if (gl && gl.pose) { const d = SN.wrapDiff(me.s, gl.pose.s, R.track.L) / 16; T(g, 'GHOST ' + (d > 0 ? '+' : '') + d.toFixed(0) + ' M', X + Wd / 2, Y + 58, '#bff8ff', { align: 'center', font: 'tiny' }); } }
      if (SN.hubSession && SN.hubSession.active) SN.hubSession.hud(g, X, Y, Wd, H);
      if (SN.Academy && R.mode === 'academy') SN.Academy.hud(g, r, X, Y, Wd, H);
      // subtitles
      if (!split) this.subs.forEach((s, k) => { s.t -= dt / 2; if (s.t > 0) T(g, s.text, X + Wd / 2, Y + H - 14 - k * 10, '#ffffff', { align: 'center' }); });
      this.subs = this.subs.filter(s => s.t > 0);
    });
  },
  /** the whole screen over a split screen: the countdown and the race's end */
  overlay(r, sc) {
    const R = sc.race; if (SN.game.viewports.length < 2) return;
    r.overlay(g => { px.rect(g, 0, Math.round(r.H / 2) - 1, r.W, 2, '#000'); if (R.state === 'finished') T(g, 'RACE OVER', r.W / 2, r.H / 2 - 4, '#ffd23f', { align: 'center', scale: 2 }); });
  },
  trackCard(g, R, X, Y, Wd, H) {
    const tr = R.track.def, th = SN.THEMES[tr.theme], I = SN.game.input;
    E.px.blend(g, .7, 'normal', () => px.rect(g, X, Y + H - 86, Wd, 62, '#05060c')); px.rect(g, X, Y + H - 86, Wd, 2, th.neon);
    E.font.title(g, tr.name, X + 14, Y + H - 80, { scale: 3, colors: ['#ffffff', '#c8f0ff', th.neon] });
    T(g, tr.place + '  •  ' + tr.lengthKm.toFixed(2) + ' KM  •  ' + (R.mode === 'race' ? R.laps + ' LAPS  •  ' : '') + SN.CLASS[R.cls].name + '  •  ' + SN.MODE_NAMES[R.mode], X + 16, Y + H - 52, '#c8d0e0');
    const it = [['confirm', 'SKIP']]; SN.glyph.row(g, I, it, X + Wd - SN.glyph.rowWidth(I, it) - 10, Y + H - 40);
  },
  minimap(g, R, me, x, y, S) {
    const Tk = R.track; E.px.blend(g, .5, 'normal', () => px.rect(g, x - 2, y - 2, S + 4, S + 4, '#05060c'));
    const P = SN.drawOutline(g, Tk, x, y, S, S, '#8a96b0', { upper: i => Tk.overpasses.some(o => Math.abs(i * 10 - o.upper) < 40) });
    for (const sh of R.ships) { if (sh.elim) continue; const p = P([sh.P[0], sh.P[1]]); if (sh === me) { if (Math.floor(SN.game.real * 4) % 2) continue; px.rect(g, p[0] - 2, p[1] - 2, 5, 5, '#ffffff'); } px.rect(g, p[0] - 1, p[1] - 1, 3, 3, SN.TEAM[sh.team].colors[1] === '#16161c' ? '#e0213a' : SN.TEAM[sh.team].colors[1]); }
    const gl = this.sc.vw.ghostList; if (gl) for (const q of gl) if (q.pose) { const pp = R.track.point(q.pose.s, q.pose.u), p = P(pp); px.rect(g, p[0] - 2, p[1] - 2, 5, 1, '#bff8ff'); px.rect(g, p[0] - 2, p[1] + 2, 5, 1, '#bff8ff'); px.rect(g, p[0] - 2, p[1] - 2, 1, 5, '#bff8ff'); px.rect(g, p[0] + 2, p[1] - 2, 1, 5, '#bff8ff'); }
  },
  speedLines(g, me, X, Y, Wd, H) {
    const v = Math.max(0, SN.Ship.fwdSpeed(me)) / me.st.top, boost = me.boostT > 0 || me.nitroT > 0, n = Math.floor(Math.max(0, v - .55) * 40 + (boost ? 18 : 0)); if (n <= 0) return;
    const t = SN.game.real, cx = X + Wd / 2, cy = Y + H / 2;
    E.px.blend(g, .35, 'add', () => { for (let k = 0; k < n; k++) { const a = E.hash2(k, 7) * 6.28, ph = (t * (2 + E.hash2(k, 3) * 2) + E.hash2(k, 9)) % 1, r0 = 60 + ph * Wd * .6, r1 = r0 + 10 + v * 20; px.line(g, Math.round(cx + Math.cos(a) * r0), Math.round(cy + Math.sin(a) * r0 * .6), Math.round(cx + Math.cos(a) * r1), Math.round(cy + Math.sin(a) * r1 * .6), boost ? '#ffb0e8' : '#bff8ff', 1); } });
  },
  replayHud(r, sc) {
    const R = sc.race, I = SN.game.input;
    r.overlay(g => {
      E.px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, 18, '#05060c'));
      T(g, 'REPLAY', 8, 5, '#ff3ab4', { scale: 1 }); T(g, SN.fmtTime(Math.max(0, R.t)), r.W / 2, 5, '#ffffff', { align: 'center' });
      const follow = sc.follow || R.humans[0]; T(g, 'FOLLOWING ' + (follow ? follow.name : ''), r.W - 8, 5, '#bff8ff', { align: 'right' });
      const items = [['confirm', SN.game.timeScale ? 'PAUSE' : 'PLAY'], ['tabR', 'x' + sc.speed], ['camera', 'CAMERA'], ['cancel', 'EXIT']];
      E.px.blend(g, .6, 'normal', () => px.rect(g, 0, r.H - 18, r.W, 18, '#05060c'));
      SN.glyph.row(g, I, items, 8, r.H - 14); T(g, 'CLICK A CRAFT TO FOLLOW IT', r.W - 8, r.H - 12, '#7a86a0', { align: 'right', font: 'tiny' });
      if (sc.replayDone) T(g, sc.replayHashOk ? 'END OF REPLAY' : 'REPLAY DESYNC', r.W / 2, r.H / 2, sc.replayHashOk ? '#ffffff' : '#ff3a3a', { align: 'center', scale: 2 });
      for (const sh of R.ships) { if (sh.elim || !sc.vw.world) continue; const p = sc.vw.world.project(sh.P[0], sh.P[1], sh.P[2] + 30); if (p) T(g, sh.place + ' ' + sh.name.split(' ').pop(), p[0], p[1], sh === follow ? '#ffd23f' : '#ffffff', { align: 'center', font: 'tiny' }); }
    });
  }
};
})();
