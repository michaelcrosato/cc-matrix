// SNIPEOUT HD: the race HUD, pixel art at the game's resolution, anchored to r.W x r.H. Position and lap (or the
// SNIPEOUT points, or the OVERCLOCK zone), the race time and lap deltas, the minimap, the weapon slot (its pickup spin,
// the railshot's charge, the autopilot and bulwark countdowns), segmented speed and energy bars, the countdown and the
// launch revs, callouts, the lock reticle and the incoming-lock arrow, name tags, the radio box, speed lines, the
// academy's cards, and a compact HUD per viewport in split screen.
(() => {
const E = My3D2dge, SN = globalThis.SN, px = E.px, V = SN.v;
const T = (g, s, x, y, c, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: '#05040c' }, o));
const TW = (s, o = {}) => E.font.width(s, o);

/* ---- weapon icons: 24 x 24 pixel drawings on a dark rounded tile ---- */
const ICONS = {
  swarm(g, x, y, c) { for (const [dx, dy, a] of [[4, 14, -.5], [9, 9, -.25], [15, 6, 0]]) { px.line(g, x + dx, y + dy + 4, x + dx + 6, y + dy - 2, c, 2); px.rect(g, x + dx + 5, y + dy - 3, 2, 2, '#ffffff'); px.dot(g, x + dx - 1, y + dy + 5, '#ffb347'); } },
  seeker(g, x, y, c) { for (let a = 0; a < 32; a++) { const t = a / 32 * Math.PI * 2; px.dot(g, Math.round(x + 12 + Math.cos(t) * 9), Math.round(y + 12 + Math.sin(t) * 9), c); } px.line(g, x + 6, y + 17, x + 17, y + 7, '#ffffff', 2); px.rect(g, x + 16, y + 6, 3, 3, c); px.rect(g, x + 11, y + 2, 2, 4, c); px.rect(g, x + 11, y + 18, 2, 4, c); },
  mine(g, x, y, c) { px.disc(g, x + 12, y + 12, 6, c); px.disc(g, x + 12, y + 12, 3, '#3a1030'); for (let k = 0; k < 8; k++) { const t = k / 8 * Math.PI * 2; px.line(g, x + 12 + Math.cos(t) * 6, y + 12 + Math.sin(t) * 6, x + 12 + Math.cos(t) * 10, y + 12 + Math.sin(t) * 10, c); } px.dot(g, x + 12, y + 12, '#ff2020'); },
  cannon(g, x, y, c) { for (let k = 0; k < 3; k++) { px.rect(g, x + 3 + k * 2, y + 6 + k * 5, 10, 2, c); px.rect(g, x + 13 + k * 2, y + 6 + k * 5, 4, 2, '#ffffff'); } },
  rail(g, x, y, c) { px.rect(g, x + 2, y + 11, 20, 2, '#ffffff'); px.rect(g, x + 7, y + 6, 1, 12, c); px.rect(g, x + 2, y + 12, 9, 1, c); for (let a = 0; a < 20; a++) { const t = a / 20 * Math.PI * 2; px.dot(g, Math.round(x + 7 + Math.cos(t) * 5), Math.round(y + 12 + Math.sin(t) * 5), c); } },
  tremor(g, x, y, c) { for (let i = 0; i < 20; i++) px.rect(g, x + 2 + i, y + 11 + Math.round(Math.sin(i * .6) * 4), 1, 2, c); px.rect(g, x + 2, y + 19, 20, 2, '#8a8a9a'); },
  bulwark(g, x, y, c) { const P = []; for (let k = 0; k < 6; k++) { const t = k / 6 * Math.PI * 2 - Math.PI / 2; P.push([x + 12 + Math.cos(t) * 9, y + 12 + Math.sin(t) * 9]); } px.poly(g, P, c); const Q = P.map(([a, b]) => [x + 12 + (a - x - 12) * .55, y + 12 + (b - y - 12) * .55]); px.poly(g, Q, '#0a1a3a'); px.rect(g, x + 11, y + 8, 2, 8, '#ffffff'); },
  autopilot(g, x, y, c) { for (let a = 0; a < 28; a++) { const t = a / 28 * Math.PI * 2; px.dot(g, Math.round(x + 12 + Math.cos(t) * 9), Math.round(y + 12 + Math.sin(t) * 9), c); } px.rect(g, x + 3, y + 11, 18, 2, c); px.rect(g, x + 11, y + 12, 2, 9, c); T(g, 'A', x + 10, y + 3, '#ffffff', { outline: false }); },
  nitro(g, x, y, c) { for (const dx of [3, 11]) { px.poly(g, [[x + dx, y + 4], [x + dx + 8, y + 12], [x + dx, y + 20], [x + dx + 3, y + 12]], c); } px.poly(g, [[x + 14, y + 8], [x + 19, y + 12], [x + 14, y + 16]], '#ffffff'); },
  siphon(g, x, y, c) { let lx = x + 2, ly = y + 6; for (let k = 1; k <= 5; k++) { const nx = x + 2 + k * 3, ny = y + (k % 2 ? 12 : 6); px.line(g, lx, ly, nx, ny, c); lx = nx; ly = ny; } px.disc(g, x + 18, y + 14, 4, c); px.rect(g, x + 17, y + 8, 2, 4, c); px.dot(g, x + 17, y + 13, '#ffffff'); }
};
SN.weaponIcon = (g, id, x, y, o = {}) => {
  const W = SN.WEAPONS[id], c = o.dim ? '#4a4a5a' : W.color;
  px.rect(g, x + 1, y, 22, 24, '#0a0a14'); px.rect(g, x, y + 1, 24, 22, '#0a0a14'); px.rect(g, x + 1, y + 1, 22, 22, o.dim ? '#141420' : '#1a1a2a');
  px.rect(g, x + 1, y + 1, 22, 1, SN.mix(c, '#000000', .4));
  ICONS[id](g, x, y, c);
};

/* ---- per-player HUD state: callouts, the pickup spin, lap flashes ---- */
const H = SN.hud = {
  views: [],
  view(i) { return H.views[i] || (H.views[i] = { callouts: [], spin: 0, spinW: null, lapFlash: null, lastPlace: 0, shake: 0, lockT: 0, energyWas: 100, banner: null }); },
  reset() { H.views = []; SN.audio.subtitle = null; },
  callout(i, text, color = '#ffffff', o = {}) { const v = H.view(i); v.callouts.unshift({ text, color, t: 0, dur: o.dur || 1.3, big: o.big }); v.callouts.length = Math.min(2, v.callouts.length); },
  /** turn the race's events into callouts and HUD state */
  events(race) {
    for (const e of race.events) {
      const s = e.ship, i = s && s.control === 'human' ? race.humans.indexOf(s) : -1;
      if (e.t === 'go') for (let k = 0; k < race.humans.length; k++) H.callout(k, 'GO', '#3aff6a', { big: true, dur: .9 });
      if (e.t === 'count') for (let k = 0; k < race.humans.length; k++) H.view(k).count = { n: e.n, t: 0 };
      if (i >= 0) {
        const v = H.view(i);
        switch (e.t) {
          case 'pickup': v.spin = .5; v.spinW = e.weapon; break;
          case 'lap': if (!race.rules.endRun || race.mode === 'hotlap') v.lapFlash = { time: e.time, best: e.best, delta: isFinite(s.prevBest) ? e.time - s.prevBest : null, t: 0 }; s.prevBest = Math.min(s.prevBest ?? Infinity, e.time); break;
          case 'finallap': v.banner = { text: 'FINAL LAP', t: 0, color: '#ffd36a' }; break;
          case 'perfectstart': H.callout(i, 'PERFECT START', '#ffd36a'); break;
          case 'stall': H.callout(i, 'STALL', '#ff6b6b'); break;
          case 'roll': H.callout(i, e.ok ? 'BARREL ROLL' : 'BOTCHED', e.ok ? '#7af0ff' : '#ff6b6b'); break;
          case 'wrongway': H.callout(i, 'WRONG WAY', '#ff3a3a', { dur: 2 }); break;
          case 'elim': H.callout(i, 'ELIMINATED', '#ff3a3a', { dur: 2.2, big: true }); break;
          case 'respawn': H.callout(i, 'RESPAWN', '#7af0ff'); break;
          case 'absorb': H.callout(i, '+' + Math.round(e.gain) + ' SHIELD', '#7affb0'); break;
          case 'rescue': H.callout(i, 'RESCUE', '#ffd36a', { dur: 2 }); break;
          case 'finish': H.callout(i, e.place === 1 ? 'WINNER' : SN.ordinal(e.place) + ' PLACE', e.place <= 3 ? '#ffd36a' : '#ffffff', { dur: 3, big: true }); break;
          case 'hit': v.shake = .35; break;
          case 'lowshield': break;
        }
      }
      if (e.t === 'elim' && e.by && e.by.control === 'human') { const k = race.humans.indexOf(e.by); H.callout(k, e.sniped ? 'SNIPED!' : 'ELIMINATION', e.sniped ? '#bff8ff' : '#ff9a2a', { dur: 1.8, big: e.sniped }); }
      if (e.t === 'points' && e.ship.control === 'human') H.callout(race.humans.indexOf(e.ship), '+' + e.n, '#ffd36a');
      if (e.t === 'zone') for (let k = 0; k < race.humans.length; k++) H.callout(k, 'ZONE ' + e.n, SN.hsl((e.n * 37) % 360, 100, 65), { big: true, dur: 1.2 });
      if (e.t === 'drill' && e.ok !== undefined) H.callout(0, e.ok ? 'DRILL CLEAR' : 'TRY AGAIN', e.ok ? '#3aff6a' : '#ff6b6b', { big: true, dur: 2 });
      if (e.t === 'record' && e.ship && e.ship.control === 'human') H.callout(race.humans.indexOf(e.ship), 'NEW RECORD', '#ffd36a', { dur: 2.4 });
    }
  },
  step(dt) {
    for (const v of H.views) {
      for (const c of v.callouts) c.t += dt; v.callouts = v.callouts.filter(c => c.t < c.dur);
      v.spin = Math.max(0, v.spin - dt); v.shake = Math.max(0, v.shake - dt); if (v.lapFlash) { v.lapFlash.t += dt; if (v.lapFlash.t > 3) v.lapFlash = null; }
      if (v.banner) { v.banner.t += dt; if (v.banner.t > 2.5) v.banner = null; } if (v.count) { v.count.t += dt; if (v.count.t > 1) v.count = null; }
    }
    SN.audio.tickSubtitle(dt);
  }
};

const seg = (g, x, y, n, w, h, k, cOn, cOff) => { for (let i = 0; i < n; i++) px.rect(g, x + i * (w + 1), y, w, h, i < k ? (typeof cOn === 'function' ? cOn(i) : cOn) : cOff); };
const panel = (g, x, y, w, h, a = .55) => { g.save(); g.globalAlpha = a; g.fillStyle = '#05040c'; g.fillRect(x, y, w, h); g.restore(); g._c = null; };

/** the full HUD for one human (or a compact one in a viewport) */
H.draw = (r, race, ship, vp = null, o = {}) => {
  if (!SN.flags.hud || !ship) return;
  const big = E.current.settings.hudSize === 'large', K = big ? 2 : 1;
  r.overlay(g => {
    const x0 = vp ? vp.x : 0, y0 = vp ? vp.y : 0, W = vp ? vp.w : r.W, Hh = vp ? vp.h : r.H, compact = !!vp, i = Math.max(0, race.humans.indexOf(ship)), v = H.view(i);
    const I = E.current.players[i] || E.current.input, units = E.current.settings.units === 'mph' ? 'mph' : 'kmh';
    const sh = v.shake > 0 ? Math.round(Math.sin(race.clock * 60) * 2) : 0;
    if (!compact && E.current.settings.speedLines !== false) H.speedLines(g, race, ship, W, Hh);
    if (o.cockpit) H.dash(g, race, ship, x0, y0, W, Hh);
    // top left: position and lap (snipeout: the points table; overclock: the zone)
    if (race.mode === 'overclock') {
      T(g, 'ZONE', x0 + 6, y0 + 5, '#ffffff', { scale: K });
      E.font.title(g, String(race.zone), x0 + 6, y0 + 14 * K + 1, { scale: 3 + K, colors: [SN.hsl((race.zone * 37) % 360, 100, 80), SN.hsl((race.zone * 37) % 360, 100, 50)] });
      const zt = race.zoneT / (race.rules.zoneTime || 12); px.rect(g, x0 + 6, y0 + 46 * K, 60 * K, 4, '#1a1a2a'); px.rect(g, x0 + 6, y0 + 46 * K, Math.round(60 * K * zt), 4, SN.hsl((race.zone * 37) % 360, 100, 60));
    } else if (race.rules.target) {
      T(g, 'SNIPEOUT · FIRST TO ' + race.rules.target, x0 + 6, y0 + 5, '#ffd36a', { scale: compact ? 1 : K });
      const top = race.order.slice(0, compact ? 3 : 4);
      top.forEach((s, k) => { const y = y0 + 16 + k * (9 * K + 2), me = s === ship; px.rect(g, x0 + 6, y, 3, 7 * K, SN.TEAMS[s.team].colors.secondary); T(g, (me ? '▸' : '') + SN.PILOTS[s.pilot].name.split(' ').slice(-1)[0], x0 + 12, y, me ? '#ffffff' : '#b8bcd0', { scale: K }); T(g, String(s.points), x0 + 92 * K, y, '#ffd36a', { scale: K, align: 'right' }); });
      if (!top.includes(ship)) { const y = y0 + 16 + top.length * (9 * K + 2); T(g, '▸ YOU ' + SN.ordinal(ship.place), x0 + 12, y, '#ffffff', { scale: K }); T(g, String(ship.points), x0 + 92 * K, y, '#ffd36a', { scale: K, align: 'right' }); }
      const left = Math.max(0, race.rules.timeLimit - race.t); T(g, SN.fmtTime(left).replace(/\.\d\d$/, ''), x0 + 6, y0 + 16 + 5 * (9 * K + 2), '#e8ecff', { scale: K });
    } else if (!race.rules.solo) {
      E.font.title(g, String(ship.place), x0 + 6, y0 + 4, { scale: compact ? 3 : 3 + K, colors: ['#ffffff', '#9ff4ff', '#29c8e8'] });
      const pw = TW(String(ship.place), { scale: compact ? 3 : 3 + K });
      T(g, '/' + race.order.length, x0 + 10 + pw, y0 + 6, '#b8bcd0', { scale: K });
      T(g, 'LAP ' + Math.max(1, Math.min(race.laps, ship.lap)) + '/' + race.laps, x0 + 6, y0 + (compact ? 28 : 34 * K / (big ? 1.6 : 1) + 2), '#ffffff', { scale: K });
    } else {
      T(g, race.mode === 'hotlap' ? 'HOT LAP' : race.mode === 'academy' ? 'ACADEMY' : 'LAP ' + Math.max(1, Math.min(race.laps, ship.lap)) + '/' + race.laps, x0 + 6, y0 + 5, '#ffffff', { scale: 2 });
      if (race.mode === 'hotlap' && isFinite(ship.bestLap)) T(g, 'BEST ' + SN.fmtTime(ship.bestLap), x0 + 6, y0 + 22, '#ffd36a', { scale: K });
    }
    // top centre: the time, a lap's time and delta, the final lap banner
    if (!compact) {
      const tm = race.state === 'racing' || race.state === 'finished' || race.state === 'results' ? (ship.finished && !race.rules.endRun ? ship.finishT : race.t) : 0;
      T(g, SN.fmtTime(tm), x0 + W / 2, y0 + 4, '#ffffff', { scale: 2, align: 'center' });
      if (race.rules.flying && ship.started) T(g, 'LAP ' + SN.fmtTime(race.t - ship.lapT0), x0 + W / 2, y0 + 20, '#b8bcd0', { align: 'center', scale: K });
      if (v.lapFlash) { const L = v.lapFlash; T(g, 'LAP ' + SN.fmtTime(L.time), x0 + W / 2, y0 + 20 + (race.rules.flying ? 10 : 0), '#ffffff', { align: 'center', scale: K }); if (L.delta !== null) T(g, (L.delta < 0 ? '-' : '+') + Math.abs(L.delta).toFixed(2), x0 + W / 2, y0 + 30 + (race.rules.flying ? 10 : 0) + (K - 1) * 8, L.delta < 0 ? '#3aff6a' : '#ff6b6b', { align: 'center', scale: K }); }
      if (v.banner) { const b = v.banner, a = b.t < .2 ? b.t / .2 : b.t > 2 ? (2.5 - b.t) / .5 : 1; if (a > .1) { panel(g, x0, y0 + Hh * .3, W, 18, .5 * a); T(g, b.text, x0 + W / 2, y0 + Hh * .3 + 2, b.color, { scale: 2, align: 'center' }); } }
    }
    // top right: the minimap (clear of the corner's buttons)
    if (!compact || W > 200) H.minimap(g, race, ship, x0 + W - (compact ? 50 : 76) - 4, y0 + (compact ? 4 : 8), compact ? 50 : 72);
    // bottom left: the weapon slot
    const wy = y0 + Hh - (compact ? 30 : 38);
    if (race.rules.weapons) {
      const wid = v.spin > 0 ? SN.WEAPON_ORDER[Math.floor(race.clock * 18) % 10] : ship.weapon;
      if (wid) {
        SN.weaponIcon(g, wid, x0 + 6, wy, { dim: v.spin > 0 && Math.floor(race.clock * 18) % 2 });
        if (v.spin <= 0) {
          T(g, SN.WEAPONS[wid].name + (wid === 'cannon' ? ' ×' + ship.ammo : ''), x0 + 34, wy + 1, SN.WEAPONS[wid].color, { scale: compact ? 1 : K });
          if (!compact) SN.glyph.bar(g, [['fire', 'FIRE'], ['absorb', 'ABSORB']], x0 + 34, wy + 13, { input: I });
          if (wid === 'rail' && ship.charge > 0) { const k = ship.charge / .8; for (let a = 0; a < 40 * k; a++) { const t = a / 40 * Math.PI * 2 - Math.PI / 2; px.dot(g, Math.round(x0 + 18 + Math.cos(t) * 15), Math.round(wy + 12 + Math.sin(t) * 15), k >= 1 ? '#ffffff' : '#bff8ff'); } }
          if (wid === 'seeker' && ship.lockT > 0) T(g, ship.lockT >= .6 ? 'LOCKED' : 'LOCKING', x0 + 34, wy - 9, ship.lockT >= .6 ? '#ff3a3a' : '#ffb347');
        }
      } else { px.rect(g, x0 + 6, wy, 24, 24, '#0a0a14'); px.rect(g, x0 + 7, wy + 1, 22, 22, '#141420'); }
      if (ship.autoT > 0) T(g, 'AUTOPILOT ' + ship.autoT.toFixed(1), x0 + 6, wy - 10, '#2ae8c8', { scale: K });
      if (ship.shieldT > 0) T(g, 'BULWARK ' + ship.shieldT.toFixed(1), x0 + 6, wy - 20, '#4a9aff', { scale: K });
      if (ship.siphon && ship.siphon.target) T(g, 'SIPHON ▸ ' + SN.PILOTS[ship.siphon.target.pilot].name.split(' ').slice(-1)[0], x0 + 6, wy - 30, '#b8ff3a');
    }
    // bottom right: speed and energy
    const sp = ship.speed, top = ship.st.top * ship.topK, bx = x0 + W - (compact ? 110 : 150 * (big ? 1.15 : 1)), by = y0 + Hh - (compact ? 24 : 36);
    const nS = 24, kS = Math.round(Math.min(1.35, sp / top) / 1.35 * nS), sw = compact ? 3 : 4 * (big ? 1.15 : 1) | 0;
    seg(g, bx, by + 1 + sh, nS, sw, compact ? 5 : 7, kS, i2 => ship.boostT > 0 ? (i2 > nS * .7 ? '#ff3ab4' : '#ffffff') : i2 > nS * .74 ? '#ffffff' : '#29c8e8', '#14182a');
    const sv = units === 'mph' ? Math.round(sp * SN.MPH) : Math.round(sp * SN.KMH);
    T(g, String(sv), bx + nS * (sw + 1), by - (compact ? 10 : 16) + sh, ship.boostT > 0 ? '#ff7ad8' : '#ffffff', { scale: compact ? 1 : 2, align: 'right' });
    T(g, units === 'mph' ? 'MPH' : 'KM/H', bx + nS * (sw + 1) + 3, by - (compact ? 10 : 9) + sh, '#b8bcd0');
    const en = Math.max(0, ship.energy), nE = 20, kE = Math.ceil(en / 100 * nE), ecol = en > 50 ? '#3aff6a' : en > 25 ? '#ffd23f' : '#ff3a3a', blink = en <= 25 && Math.floor(race.clock * 5) % 2;
    const ew = Math.round((nS * (sw + 1)) / nE) - 1, eshake = v.shake > 0 ? Math.round(Math.sin(race.clock * 80) * 2) : 0;
    seg(g, bx + eshake, by + (compact ? 9 : 12), nE, ew, compact ? 4 : 6, blink ? 0 : kE, ecol, '#1a1420');
    T(g, 'SHIELD ' + Math.round(en), bx, by + (compact ? 15 : 20), en > 25 ? '#b8bcd0' : '#ff6b6b', { font: compact ? 'tiny' : undefined });
    if (en < 30 && race.track.pit && !compact) T(g, 'PIT ▸', bx + 70, by + 20, '#3aff8a');
    if (ship.pitting) T(g, '+ RECHARGING', bx + 70, by + 20, '#3aff8a');
    // centre: the countdown, the launch revs, callouts, the reticle, the incoming-lock arrow, wrong way
    const cx = x0 + W / 2, cy = y0 + Hh / 2;
    if (race.state === 'countdown' && !race.o.clock) {
      const n = 3 - Math.floor(race.stateT); if (n >= 1) { const k = 1 - (race.stateT % 1); E.font.title(g, String(n), cx, cy - 34, { scale: Math.round(5 + k * 2), colors: ['#ffffff', '#ff6b6b', '#c8202a'], align: 'center' }); }
      const rv = ship.revs, rw = 90; px.rect(g, cx - rw / 2 - 1, cy + 24, rw + 2, 8, '#05040c'); px.rect(g, cx - rw / 2 + rw * .72, cy + 25, rw * .16, 6, '#1a5a2a'); px.rect(g, cx - rw / 2, cy + 25, Math.round(rw * rv), 6, rv > .95 ? '#ff3a3a' : rv >= .72 && rv <= .88 ? '#3aff6a' : '#ffd23f');
      T(g, 'REVS', cx - rw / 2, cy + 34, '#b8bcd0'); SN.glyph.draw(g, 'thrust', cx + rw / 2 - 12, cy + 33, { input: I });
    } else if (race.state === 'countdown' && race.o.clock) { const ms = race.o.clock(); if (isFinite(ms)) { const n = Math.ceil(-ms / 1000); if (n >= 1 && n <= 3) E.font.title(g, String(n), cx, cy - 34, { scale: 6, colors: ['#ffffff', '#ff6b6b', '#c8202a'], align: 'center' }); } }
    v.callouts.forEach((c, k) => { const t = c.t / c.dur, pop = c.t < .12 ? c.t / .12 : 1, sc = c.big ? (compact ? 2 : 4) : (compact ? 1 : 2); if (t < .85 || Math.floor(c.t * 12) % 2) T(g, c.text, cx, cy - (compact ? 28 : 52) - k * (sc * 8 + 4), c.color, { scale: Math.max(1, Math.round(sc * (.7 + .3 * pop))), align: 'center' }); });
    if (ship.wrong && Math.floor(race.clock * 4) % 2) T(g, 'WRONG WAY', cx, cy + 10, '#ff3a3a', { scale: compact ? 2 : 3, align: 'center' });
    // the lock reticle on the target, the incoming lock, the railshot aimed at you
    const W3 = SN.render.tw && SN.render.tw.world;
    if (W3 && ship.weapon === 'seeker' && ship.lockTarget && !ship.lockTarget.hidden) { const q = W3.project(ship.lockTarget.P[0], ship.lockTarget.P[1], ship.lockTarget.P[2] + 10); if (q) H.reticle(g, q[0], q[1], ship.lockT >= .6, race.clock); }
    if (ship.lockedBy && race.clock - ship.lockedBy.t < .12) { const f = ship.lockedBy.full; if (Math.floor(race.clock * (f ? 10 : 5)) % 2) { T(g, f ? '▲ LOCK ▲' : 'LOCKING', cx, y0 + Hh - (compact ? 40 : 52), '#ff3a3a', { scale: compact ? 1 : 2, align: 'center' }); } }
    if (ship.railWarn && race.clock - ship.railWarn < .1) px.rect(g, cx - 40, y0 + Hh - (compact ? 32 : 42), 80, 1, '#ff3a3a');
    // name tags over craft within 2500 u
    const tags = []; if (W3 && !compact) { for (const s of race.ships) { if (s === ship || s.hidden || s.elim || s.drone) continue; const d = V.dist(s.P, ship.P); if (d > 2500 || d < 160) continue; tags.push([d, s]); } tags.sort((a, b) => a[0] - b[0]); tags.length = Math.min(tags.length, 4); }
    const placed = [];
    for (const [, s] of tags) {
      const d = V.dist(s.P, ship.P);
      const q = W3.project(s.P[0], s.P[1], s.P[2] + 34); if (!q || q[0] < x0 || q[0] > x0 + W || q[1] < y0 || q[1] > y0 + Hh) continue;
      const nm0 = (race.rules.target ? s.points + ' ' : SN.ordinal(s.place) + ' ') + (s.label || SN.PILOTS[s.pilot].name.split(' ').slice(-1)[0]), w0 = TW(nm0) + 4;
      if (placed.some(p => Math.abs(p[0] - q[0]) < (p[2] + w0) / 2 && Math.abs(p[1] - q[1]) < 10)) continue; placed.push([q[0], q[1], w0]);
      if (d > 1800 && Math.floor(race.clock * 2) % 2) continue;
      const nm = s.label || SN.PILOTS[s.pilot].name.split(' ').slice(-1)[0], col = s.ghost ? (s.seatColor || '#7af0ff') : SN.TEAMS[s.team].colors.glow;
      T(g, (race.rules.target ? s.points + ' ' : SN.ordinal(s.place) + ' ') + nm, Math.round(q[0]), Math.round(q[1]), col, { align: 'center', font: d > 1200 ? 'tiny' : undefined });
    }
    // the radio box: a portrait and a subtitle
    const sub = SN.audio.subtitle; if (sub && !compact) H.radioBox(g, sub, x0 + 6, y0 + (race.rules.target ? 92 : 58));
    if (race.academy) H.academyCard(g, race, x0, y0, W, Hh, I);
    if (race.mode === 'hub' && SN.hub && SN.hub.standingsHUD && !compact) SN.hub.standingsHUD(g, race, x0 + 6, y0 + 60);
  });
};
/** the cockpit's canopy rim: two struts in the lower corners, lit in the team's glow, swaying with the craft */
H.dash = (g, race, ship, x0, y0, W, Hh) => {
  const c = SN.TEAMS[ship.team].colors, sway = Math.round((ship.vis.bank + ship.rollAng * 0) * 18), bob = Math.round(Math.sin(race.clock * 9) * (ship.speed / 2000));
  for (const side of [-1, 1]) {
    const bx = side < 0 ? x0 : x0 + W, P = [[bx, y0 + Hh * .55 + side * sway + bob], [bx + side * -W * .2, y0 + Hh + 2], [bx, y0 + Hh + 2]];
    px.poly(g, P, '#0a0c14'); px.line(g, P[0][0], P[0][1], P[1][0], P[1][1], c.glow, 2);
  }
  px.rect(g, x0 + W * .2, y0 + Hh - 3 + bob, W * .6, 3, '#0a0c14'); px.rect(g, x0 + W * .2, y0 + Hh - 4 + bob, W * .6, 1, c.glow);
};
H.reticle = (g, x, y, locked, t) => {
  const c = locked ? '#ff3a3a' : '#ffb347', r = locked ? 9 : 13 - (t * 20 % 4), a = t * 3;
  for (let k = 0; k < 4; k++) { const b = a + k * Math.PI / 2, ex = x + Math.cos(b) * r, ey = y + Math.sin(b) * r; px.line(g, ex, ey, ex + Math.cos(b + 2.3) * 5, ey + Math.sin(b + 2.3) * 5, c); px.line(g, ex, ey, ex + Math.cos(b - 2.3) * 5, ey + Math.sin(b - 2.3) * 5, c); }
  if (locked) T(g, 'LOCKED', x, y + 14, c, { align: 'center' });
};
H.minimap = (g, race, ship, x, y, size) => {
  const T0 = race.track, M = T0.map;
  panel(g, x - 3, y - 3, size + 6, size + 6, .45);
  let last = null;
  M.pts.forEach((p, k) => { const q = T0.mapXY(p[0], p[1], size, size); const up = M.upper.has(k); if (last) px.line(g, x + last[0], y + last[1], x + q[0], y + q[1], up ? '#ffffff' : '#7a8aa8'); last = q; });
  const q0 = T0.mapXY(M.pts[0][0], M.pts[0][1], size, size); px.line(g, x + q0[0], y + q0[1], x + last[0], y + last[1], '#7a8aa8');
  for (const s of race.ships) {
    if (s.hidden || s.drone || (s.elim && !race.rules.respawn)) continue;
    const q = T0.mapXY(s.P[0], s.P[1], size, size), me = s === ship, c = s.ghost ? (s.seatColor || '#7af0ff') : SN.TEAMS[s.team].colors.glow;
    if (me && Math.floor(race.clock * 4) % 2) continue;
    if (s.ghost) { px.rect(g, Math.round(x + q[0] - 1), Math.round(y + q[1] - 1), 3, 1, c); px.rect(g, Math.round(x + q[0] - 1), Math.round(y + q[1] + 1), 3, 1, c); }
    else px.rect(g, Math.round(x + q[0] - (me ? 2 : 1)), Math.round(y + q[1] - (me ? 2 : 1)), me ? 4 : 3, me ? 4 : 3, me ? '#ffffff' : c);
  }
};
H.speedLines = (g, race, ship, W, Hh) => {
  const k = Math.min(1.5, ship.speed / (ship.st.top * ship.topK)), n = Math.floor(((k * k) * 10 + (ship.boostT > 0 ? 14 : 0)) * (E.current.reduceMotion ? 0 : 1)); if (n <= 0) return;
  const t = race.clock, cx = W / 2, cy = Hh * .55;
  for (let i = 0; i < n; i++) { const a = (i * 2.399 + Math.floor(t * 9 + i) * .7) % (Math.PI * 2), r0 = 80 + ((t * 700 + i * 37) % 160), r1 = r0 + 14 + k * 12; px.line(g, cx + Math.cos(a) * r0 * 1.6, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1 * 1.6, cy + Math.sin(a) * r1, ship.boostT > 0 ? '#ffd0f0' : '#d8f0ff'); }
};
H.radioBox = (g, sub, x, y) => {
  const w = Math.min(230, TW(sub.text) + 46), lines = E.font.wrap ? E.font.wrap(sub.text, w - 40) : [sub.text];
  const h = Math.max(32, 12 + lines.length * 9);
  panel(g, x, y, w, h, .6); px.rect(g, x, y, 2, h, '#29c8e8');
  SN.portrait(sub.portrait, g, x + 4, y + 2, 28);
  T(g, sub.who, x + 36, y + 3, '#7af0ff', { font: 'tiny' });
  lines.forEach((l, k) => T(g, l, x + 36, y + 11 + k * 9, '#ffffff'));
};
H.academyCard = (g, race, x0, y0, W, Hh, I) => {
  const A = race.academy, d = SN.DRILLS[Math.min(A.i, SN.DRILLS.length - 1)]; if (A.state === 'done') return;
  const w = Math.min(W - 180, 300), x = x0 + 8 + Math.max(0, (W - 180 - w) / 2) + 34, lines = SN.glyph.richLines(d.text, w - 12, I), h = 18 + lines.length * 12, y = y0 + Hh - 48 - h;
  panel(g, x, y, w, h, .7); px.rect(g, x, y, w, 2, '#ffb347');
  T(g, 'DRILL ' + (A.i + 1) + '/11 · ' + d.name, x + 6, y + 5, '#ffb347');
  lines.forEach((l, k) => SN.glyph.rich(g, l, x + 6, y + 17 + k * 12, '#ffffff', { input: I }));
  if (A.state === 'fail' && A.msg) T(g, A.msg, x0 + W / 2, y - 12, '#ff6b6b', { align: 'center', scale: 2 });
  if (A.gates && d.id === 'steer') for (let k = 0; k < 3; k++) px.rect(g, x + w - 40 + k * 12, y + 5, 8, 8, k < A.data.gates ? '#3aff6a' : '#2a2a3a');
};

/* ---- portraits: pilots' and principals' live faces, ORACLE's emblem, THE ADMIN's glitch mask ---- */
const RIGS = {};
SN.rigFor = (id, helmet = false) => {
  const key = id + (helmet ? ':h' : ''); if (RIGS[key]) return RIGS[key];
  const P = SN.PILOTS[id] || SN.PRINCIPALS[id]; if (!P || P.glitch) return null;
  const team = SN.TEAMS[P.team], c = team.colors;
  const rig = new E.Humanoid({ size: 1.3, build: 'heroic', weapon: null, outfit: 'coat', hair: P.hair === 'bald' ? 'bald' : P.hair || 'short', hood: !!P.hood,
    hat: helmet ? { style: 'helmet', color: c.secondary } : undefined, colors: { skin: P.skin || '#e8c8a8', hair: P.hairC || '#202020', cloth: c.primary, coat: c.secondary, pants: c.accent, trim: c.secondary, glove: c.accent, boot: '#1a1a20' } });
  return (RIGS[key] = rig);
};
SN.portrait = (id, g, x, y, size = 28) => {
  if (!id || id === 'oracle' || id === 'ORACLE') {   // a triangle eye in a hexagon, cycling white and cyan
    const t = E.current ? E.current.real : 0, c = Math.floor(t * 2) % 2 ? '#ffffff' : '#7af0ff', cx = x + size / 2, cy = y + size / 2, r = size / 2 - 1;
    px.rect(g, x, y, size, size, '#0a0a14'); const P = []; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 - Math.PI / 2; P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } px.poly(g, P, '#16263a');
    px.poly(g, [[cx, cy - r * .6], [cx + r * .6, cy + r * .4], [cx - r * .6, cy + r * .4]], c); px.disc(g, cx, cy + r * .05, r * .2, '#0a0a14'); px.dot(g, cx, cy, c); return;
  }
  const P = SN.PRINCIPALS[id];
  if (P && P.glitch) { const t = E.current ? E.current.real : 0; px.rect(g, x, y, size, size, '#0b0b0e'); for (let k = 0; k < 10; k++) { const yy = y + ((k * 7 + Math.floor(t * 20) * 3) % size), w = 4 + (k * 13 + Math.floor(t * 9)) % (size - 4); px.rect(g, x + (k * 5) % (size - w + 1), yy, w, 2, k % 3 ? '#6aff3a' : '#ff2a8a'); } return; }
  const rig = SN.rigFor(id); if (!rig) { px.rect(g, x, y, size, size, '#202030'); return; }
  try { rig.drawPortrait(g, x, y, size, { bg: '#101624', frame: '#29c8e8' }); } catch (e) { px.rect(g, x, y, size, size, '#202030'); }
};
})();
