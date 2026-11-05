/* The race HUD (PLAN §7.18), per viewport, anchored to its corners so the road's centre stays clear: the daylight
 * clock (top centre), score and the Bloom chain (top left), stage and the route mini-map (top right), speed, tach and
 * gear (bottom right), the passenger and her request (bottom left), banners (queued, never two at once), the speech
 * bubble, hints with glyphs, and the mission's own panel. */
(() => {
'use strict';
const OB = window.OB, E = OB.E, { px } = E, T = (...a) => OB.T(...a), C = OB.COL;
/* ---- icons for the request types and beds (shape and colour, never colour alone) ---- */
const ICON = {
  car: (g, x, y) => { px.rect(g, x + 1, y + 5, 10, 4, '#e8402a'); px.rect(g, x + 3, y + 2, 6, 3, '#a8d8f0'); px.rect(g, x + 2, y + 9, 2, 2, '#1a1a20'); px.rect(g, x + 8, y + 9, 2, 2, '#1a1a20'); },
  drift: (g, x, y) => { px.poly(g, [[x + 2, y + 9], [x + 8, y + 2], [x + 11, y + 5], [x + 5, y + 11]], '#ff8a2a'); px.disc(g, x + 2, y + 2, 2, '#d8d8e0'); px.disc(g, x + 1, y + 6, 1.5, '#d8d8e0'); },
  ribbon: (g, x, y) => { px.rect(g, x, y + 5, 12, 2, '#ff6aa0'); px.disc(g, x + 6, y + 6, 2, '#ff3a8a'); px.poly(g, [[x + 6, y + 6], [x + 3, y + 11], [x + 5, y + 11]], '#ff3a8a'); },
  balloon: (g, x, y) => { px.disc(g, x + 4, y + 4, 3, '#ff4a7a'); px.disc(g, x + 8, y + 4, 3, '#ff4a7a'); px.poly(g, [[x + 1, y + 5], [x + 11, y + 5], [x + 6, y + 10]], '#ff4a7a'); px.line(g, x + 6, y + 10, x + 6, y + 12, '#ffffff'); },
  gnome: (g, x, y) => { px.poly(g, [[x + 3, y + 5], [x + 9, y + 5], [x + 6, y]], '#e83a3a'); px.disc(g, x + 6, y + 6, 2, '#f0c8a0'); px.rect(g, x + 3, y + 8, 6, 4, '#3a6ad0'); },
  bee: (g, x, y) => { px.disc(g, x + 6, y + 7, 3.5, '#ffd020'); px.rect(g, x + 5, y + 4, 1, 7, '#1a1a1a'); px.rect(g, x + 7, y + 4, 1, 7, '#1a1a1a'); px.disc(g, x + 4, y + 3, 2, '#e8f4ff'); px.disc(g, x + 8, y + 3, 2, '#e8f4ff'); },
  cone: (g, x, y) => { px.poly(g, [[x + 3, y + 11], [x + 9, y + 11], [x + 6, y + 1]], '#ff7a2a'); px.rect(g, x + 4, y + 6, 4, 2, '#ffffff'); },
  arch: (g, x, y) => { for (let i = 0; i < 7; i++) { const a = Math.PI * i / 6; px.disc(g, x + 6 - Math.cos(a) * 5, y + 7 - Math.sin(a) * 5, 1.5, i % 2 ? '#ffd040' : '#ff6aa0'); } px.rect(g, x + 1, y + 7, 1, 5, '#5a9a4a'); px.rect(g, x + 10, y + 7, 1, 5, '#5a9a4a'); },
  speed: (g, x, y) => { px.disc(g, x + 6, y + 7, 5, '#ffffff'); px.disc(g, x + 6, y + 7, 4, '#2a2040'); px.line(g, x + 6, y + 7, x + 9, y + 4, '#ff4a4a'); },
  shield: (g, x, y) => { px.poly(g, [[x + 2, y + 2], [x + 10, y + 2], [x + 10, y + 6], [x + 6, y + 11], [x + 2, y + 6]], '#5ae0a0'); px.rect(g, x + 5, y + 4, 2, 4, '#ffffff'); },
  wind: (g, x, y) => { for (let i = 0; i < 3; i++) px.rect(g, x + i, y + 3 + i * 3, 10 - i * 2, 1, '#c8e8ff'); },
  zap: (g, x, y) => px.poly(g, [[x + 7, y], [x + 2, y + 7], [x + 6, y + 7], [x + 4, y + 12], [x + 10, y + 5], [x + 6, y + 5]], '#ffe040'),
  bouquet: (g, x, y) => { px.poly(g, [[x + 4, y + 12], [x + 8, y + 12], [x + 6, y + 6]], '#3a9a4a'); px.disc(g, x + 4, y + 4, 2, '#ff4a7a'); px.disc(g, x + 8, y + 4, 2, '#ffd040'); px.disc(g, x + 6, y + 2, 2, '#ffffff'); },
  camera: (g, x, y) => { px.rect(g, x + 1, y + 3, 10, 7, '#3a3a48'); px.disc(g, x + 6, y + 6, 2.5, '#a8d8f0'); px.rect(g, x + 7, y + 1, 3, 2, '#3a3a48'); },
  note: (g, x, y) => { px.rect(g, x + 7, y + 1, 1, 8, '#ffffff'); px.disc(g, x + 5, y + 9, 2, '#ffffff'); px.rect(g, x + 7, y + 1, 3, 2, '#ffffff'); },
  paint: (g, x, y) => { px.rect(g, x + 2, y + 1, 8, 5, '#ff6aa0'); px.rect(g, x + 5, y + 6, 2, 6, '#8a5a3a'); },
  dress: (g, x, y) => { px.poly(g, [[x + 4, y + 1], [x + 8, y + 1], [x + 11, y + 11], [x + 1, y + 11]], '#c060ff'); },
  mirror: (g, x, y) => { px.rect(g, x + 5, y, 2, 12, '#ffffff'); px.poly(g, [[x + 4, y + 3], [x, y + 6], [x + 4, y + 9]], '#5ac8e0'); px.poly(g, [[x + 8, y + 3], [x + 12, y + 6], [x + 8, y + 9]], '#5ac8e0'); },
  flower: (g, x, y, c = '#ff6aa0') => { for (let i = 0; i < 5; i++) { const a = i * 1.257; px.disc(g, x + 6 + Math.cos(a) * 3, y + 6 + Math.sin(a) * 3, 2, c); } px.disc(g, x + 6, y + 6, 1.5, '#ffd040'); },
  lock: (g, x, y) => { px.rect(g, x + 2, y + 5, 8, 7, '#c8a040'); px.rect(g, x + 4, y + 1, 1, 5, '#a8a8b0'); px.rect(g, x + 7, y + 1, 1, 5, '#a8a8b0'); px.rect(g, x + 4, y + 1, 4, 1, '#a8a8b0'); px.rect(g, x + 5, y + 8, 2, 2, '#5a4020'); },
  seed: (g, x, y) => { px.ell(g, x + 6, y + 7, 3, 4, '#c88a3a'); px.line(g, x + 6, y + 3, x + 8, y, '#5ab04a'); px.rect(g, x + 8, y, 3, 2, '#5ab04a'); }
};
OB.ICON = ICON;
OB.icon = (g, name, x, y, s = 1, c) => { const f = ICON[name] || ICON.flower; if (s === 1) return f(g, Math.round(x), Math.round(y), c); g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(s, s); f(g, 0, 0, c); g.restore(); };

OB.HUD = {
  banner(P, text, color = C.sun, t = 2.2, sub) { const q = P.banners || (P.banners = []); if (q.length && q[q.length - 1].text === text) return; q.push({ text, color, t, max: t, sub }); if (q.length > 4) q.shift(); },
  step(P, dt) { const q = P.banners; if (q && q.length) { q[0].t -= dt; if (q[0].t <= 0) q.shift(); } if (P.hint) { P.hint.t -= dt; if (P.hint.t <= 0) P.hint = null; } if (P.plus) { P.plus.t -= dt; if (P.plus.t <= 0) P.plus = null; } },
  hint(P, action, text) { if (!OB.game.settings.hints || OB.env.hub) return; if (!OB.Profile.hint('hint:' + action + text)) return; P.hint = { action, text, t: 5 }; },
  /** a viewport's HUD: r.viewport, race, P */
  draw(g, vp, race, P, o = {}) {
    if (race.cheats.hideHud && !o.force) return;
    const x0 = vp.x, y0 = vp.y, W = vp.w, H = vp.h, c = P.car, small = H < 200, big = (OB.game.settings.hudSize === 'xl' && !small) ? 1.25 : 1, s1 = small ? 1 : 1;
    const t = race.t;
    // clock: top centre
    const cx = x0 + W / 2, clock = race.clock, low = !race.clockUp && clock < 10;
    T(g, race.clockUp ? 'TIME' : 'DAYLIGHT', cx, y0 + 4, C.sun, { align: 'center' });
    const ct = race.clockUp ? OB.fmtTime(clock) : String(Math.ceil(clock)), cs = race.clockUp ? (small ? 2 : 2) : (small ? 3 : 4);
    T(g, ct, cx, y0 + 13, low && Math.floor(t * 4) % 2 ? C.bad : '#ffffff', { align: 'center', scale: Math.round(cs * big) });
    if (!race.clockUp) { const sx = cx - TW(ct, { scale: cs }) / 2 - 14; px.disc(g, sx, y0 + 22, 5, '#ffcf4a'); for (let i = 0; i < 8; i++) { const a = i * .785 + t; px.rect(g, sx + Math.cos(a) * 7, y0 + 22 + Math.sin(a) * 7, 1, 1, '#ffcf4a'); } }
    if (P.plus) T(g, '+' + P.plus.n, cx + 40, y0 + 18 - (1 - P.plus.t / 2) * 10, C.good, { align: 'left', scale: 2 });
    // score and the Bloom chain: top left
    if (race.mode !== 'trial') {
      T(g, 'SCORE', x0 + 8, y0 + 5, C.dim);
      T(g, String(Math.round(P.score)).padStart(7, ' '), x0 + 8, y0 + 13, '#ffffff', { scale: small ? 1 : 2 });
      const by = y0 + (small ? 24 : 32);
      for (let i = 0; i < 5; i++) { const on = i < P.bloom.lvl, part = i === P.bloom.lvl - 1 ? 1 : 0; OB.icon(g, 'flower', x0 + 6 + i * 13, by, 1, on ? ['#ffb0d0', '#ff8ac0', '#ff5fa2', '#ff3a8a', '#ffcf4a'][i] : '#4a3a6a'); }
      T(g, '×' + P.bloom.lvl, x0 + 74, by + 3, P.bloom.lvl >= 5 ? C.sun : '#ffffff');
      const L = OB.Race.LEVELS, next = L[Math.min(4, P.bloom.lvl)], prev = L[P.bloom.lvl - 1] || 0, f = P.bloom.lvl >= 5 ? 1 : (P.bloom.pts - prev) / Math.max(1, next - prev);
      E.ui.bar(g, x0 + 6, by + 14, 64, 3, E.clamp(f, 0, 1), C.pink);
    }
    // stage and the mini-map: top right
    const st = OB.STAGES[c.stage];
    T(g, st.name.toUpperCase(), x0 + W - 8, y0 + 5, '#ffffff', { align: 'right' });
    T(g, (race.mode === 'trial' ? 'STAGE ' : 'LAP ') + OB.fmtTime(P.stageT), x0 + W - 8, y0 + 14, C.dim, { align: 'right' });
    if (!small) this.minimap(g, x0 + W - 74, y0 + 26, P, race);
    // speed, tach and gear: bottom right
    const sp = OB.speedText(c.v), bx = x0 + W - 10, byy = y0 + H - (small ? 22 : 34);
    T(g, String(sp), bx - 30, byy, '#ffffff', { align: 'right', scale: small ? 2 : 3 });
    T(g, OB.speedUnit(), bx - 30, byy + (small ? 15 : 22), C.dim, { align: 'right' });
    const acx = bx - 12, acy = byy + 10, R = small ? 10 : 14, fr = E.clamp((c.rpm - 1000) / 7200, 0, 1);
    for (let i = 0; i <= 20; i++) { const a = Math.PI * .8 + i / 20 * Math.PI * 1.4, col = i > 17 ? '#ff4a4a' : (i >= 14 && i <= 16) ? C.good : i / 20 <= fr ? '#ffffff' : '#4a3a6a'; px.rect(g, acx + Math.cos(a) * R, acy + Math.sin(a) * R, 2, 2, col); }
    T(g, (c.manual ? 'M' : 'A') + c.gear, acx, acy - 3, C.sun, { align: 'center' });
    if (c.slip > .5) T(g, 'SLIPSTREAM', bx - 30, byy - 12, C.sea, { align: 'right' });
    // the passenger panel and her request: bottom left (Love in Bloom and the Finale)
    if (race.requests && P === race.p1) this.love(g, x0, y0, W, H, race, P, small);
    else if (!small && P.passenger) { OB.Cast.portrait(g, P.passenger, x0 + 8, y0 + H - 44, 36, { outfit: P.outfit, expr: OB.Passenger.face(P) === 'happy' ? 'smile' : OB.Passenger.face(P) === 'pouty' ? 'angry' : undefined }); }
    // a mission's panel
    if (race.rules && race.rules.hud && P === race.p1) this.mission(g, x0, y0, W, H, race.rules.hud(), small);
    if (race.rivals.length && P === race.p1) this.rivals(g, x0, y0, W, H, race, P);
    if (race.players.length > 1) T(g, ['1ST', '2ND', '3RD', '4TH'][P.place - 1] || '', x0 + 8, y0 + H - 16, P.place === 1 ? C.sun : '#ffffff', { scale: 2 });
    if (o.standings) this.standings(g, x0, y0, W, H, o.standings);
    // banners, centre, one at a time
    const q = P.banners && P.banners[0];
    if (q) { const u = 1 - q.t / q.max, pop = u < .1 ? u / .1 : 1, y = y0 + H * .27; let sc = small ? 2 : 3; while (sc > 1 && TW(q.text, { scale: sc }) > W * .86) sc--; if (pop > .3) { T(g, q.text, cx, y, q.color, { align: 'center', scale: sc, outline: '#140a28' }); if (q.sub) T(g, q.sub, cx, y + sc * 9 + 2, '#ffffff', { align: 'center', scale: small ? 1 : 2 }); } }
    // the hint
    if (P.hint && !small) { const w = OB.UI.glyphW(P.hint.action, { input: P.input }) + TW(P.hint.text) + 26; OB.UI.panel(g, cx - w / 2, y0 + H - 34, w, 20, { alpha: .85 }); OB.UI.prompt(g, cx - w / 2 + 8, y0 + H - 29, P.hint.action, P.hint.text, { input: P.input }); }
  },
  minimap(g, x, y, P, race) {
    const dot = (id, on, cur) => { const s = OB.STAGES[id], dx = x + 34 + (s.col - (s.row + 1) / 2) * 13, dy = y + (s.row - 1) * 9; px.disc(g, dx, dy, cur ? 3 : 2, cur ? (Math.floor(race.t * 4) % 2 ? '#ffffff' : C.sun) : on ? C.pink : '#4a3a6a'); return [dx, dy]; };
    const route = race.route ? race.route.stages : null;
    for (const id in OB.STAGES) { if (route && !route.includes(id)) continue; const f = OB.forkOf(id); if (f && (!route || route.includes(f[0]))) { const a = dot(id), b = dot(f[0]); px.line(g, a[0], a[1], b[0], b[1], '#3a2a5a'); } if (f && (!route || route.includes(f[1]))) { const a = dot(id), b = dot(f[1]); px.line(g, a[0], a[1], b[0], b[1], '#3a2a5a'); } }
    for (const id in OB.STAGES) { if (route && !route.includes(id)) continue; dot(id, P.stages.includes(id), id === P.car.stage); }
    const S = OB.World.get(P.car.stage);
    if (S.juncStart >= 0 && P.car.z > (S.juncStart - 130) * OB.SEG && !P.car.side && Math.floor(race.t * 3) % 2) for (const id of OB.forkOf(P.car.stage)) { const s = OB.STAGES[id]; px.disc(g, x + 34 + (s.col - (s.row + 1) / 2) * 13, y + (s.row - 1) * 9, 3, '#ffffff'); }
  },
  love(g, x0, y0, W, H, race, P, small) {
    const R = race.requests, q = R.cur, face = OB.Passenger.face(P);
    const px0 = x0 + 8, py0 = y0 + H - 50;
    OB.Cast.portrait(g, P.passenger, px0, py0, 40, { outfit: P.outfit, expr: face === 'happy' ? 'smile' : face === 'pouty' ? 'angry' : undefined });
    // the petal ring fills around her
    const f = P.petalMax ? P.petals / P.petalMax : 0;
    for (let i = 0; i < 24; i++) { const a = -Math.PI / 2 + i / 24 * Math.PI * 2; px.rect(g, px0 + 20 + Math.cos(a) * 24, py0 + 20 + Math.sin(a) * 24, 2, 2, i / 24 < f ? '#ff6aa0' : '#3a2a5a'); }
    T(g, '♥ ' + P.petals, px0 + 50, py0 + 22, '#ff8ac0', { scale: 2 });
    T(g, ({ happy: ':)', neutral: ':|', pouty: ':(' })[face], px0 + 50, py0 + 8, face === 'happy' ? C.good : face === 'pouty' ? C.bad : '#ffffff');
    if (q && q.phase !== 'gone') {
      const def = q.def, w = small ? 150 : 176, h = 40, x = px0, y = py0 - h - 8;
      OB.UI.panel(g, x, y, w, h, { alpha: .9 });
      OB.icon(g, def.icon, x + 6, y + 6, 2);
      const call = def.callout.replace('{n}', q.n).replace('{v}', OB.speedText(q.v));
      T(g, call, x + 36, y + 6, C.sun);
      if (q.phase === 'rated') T(g, OB.RATINGS[q.rating] + '  +' + q.petals + ' ♥', x + 36, y + 20, q.rating < 2 ? C.good : q.rating === 3 ? C.bad : '#ffffff', { scale: 1 });
      else {
        const m = def.measure, prog = m === 'hits' ? 'HITS ' + q.hits : m === 'share' ? Math.round(q.above / q.win * 100) + '%' : m === 'seconds' ? q.got.toFixed(1) + ' / ' + q.n.toFixed(0) + ' s' : m === 'photo' ? (q.box && q.box.inside ? 'STOP!' : 'IN THE BOX') : Math.round(q.got) + ' / ' + Math.round(q.n);
        T(g, prog, x + 36, y + 18, '#ffffff');
        const win = q.phase === 'intro' ? 1 : 1 - Math.min(1, q.t / (q.objs.length ? q.win * 2.2 : q.win));
        E.ui.bar(g, x + 36, y + 31, w - 44, 3, win, C.sea);
      }
    }
    if (R.pref && !P.car.side) { const L = R.pref === 'L'; T(g, (L ? '← ' : '') + 'SHE WANTS ' + (L ? 'LEFT' : 'RIGHT') + (L ? '' : ' →'), x0 + W / 2, y0 + H * .4, '#ff8ac0', { align: 'center', scale: small ? 1 : 2 }); }
  },
  mission(g, x0, y0, W, H, h, small) {
    if (!h) return; const w = 150, x = x0 + W / 2 - w / 2, y = y0 + (small ? 30 : 46);
    OB.UI.panel(g, x, y, w, h.bars ? 34 : 24, { alpha: .85 });
    T(g, h.label, x + w / 2, y + 4, C.sun, { align: 'center' });
    if (h.value !== undefined) T(g, h.value, x + w / 2, y + 13, '#ffffff', { align: 'center' });
    if (h.bars) { const mx = h.max || Math.max(1, ...h.bars.map(b => b[1])); h.bars.forEach(([n, v], i) => { T(g, n, x + 6, y + 13 + i * 9, i ? '#c8b8e0' : '#ffffff'); E.ui.bar(g, x + 54, y + 15 + i * 9, w - 90, 4, E.clamp(v / mx, 0, 1), i ? C.bad : C.good); T(g, String(Math.round(v)), x + w - 6, y + 13 + i * 9, '#ffffff', { align: 'right' }); }); }
  },
  rivals(g, x0, y0, W, H, race, P) {
    let y = y0 + 60; const x = x0 + 8;
    for (const R of race.rivals) { const gap = (race.progress(R) - race.progress(P)) / (Math.max(60, P.car.v) * OB.KMH); OB.Cast.portrait(g, R.who, x, y, 18, {}); T(g, R.out ? 'WILTED' : (gap > 0 ? '+' : '') + gap.toFixed(1) + 's', x + 22, y + 6, R.out ? '#7a7090' : gap > 0 ? C.bad : C.good); y += 21; }
  },
  standings(g, x0, y0, W, H, list) {
    const y = y0 + H - 14; let x = x0 + 8;
    for (const s of list) { px.rect(g, x, y, 6, 6, s.color); T(g, s.name.slice(0, 10) + ' ' + s.label, x + 9, y - 1, '#ffffff'); x += TW(s.name.slice(0, 10) + ' ' + s.label) + 20; }
  },
  bubble(g, sx, sy, P, W) {
    const sp = P.speech; if (!sp) return;
    const n = Math.min(sp.text.length, Math.floor(sp.text.length * Math.min(1, sp.t / Math.max(.3, sp.dur - .9)) + 1));
    const lines = E.font.wrap(sp.text.slice(0, n), 160), w = Math.max(...lines.map(l => TW(l))) + 12, h = lines.length * 9 + 8;
    const x = E.clamp(sx - w / 2, 4, W - w - 4), y = sy - h - 8;
    E.ui.box(g, Math.round(x), Math.round(y), w, h, { bg: '#fff8f0', border: '#5a1e4a', gradient: false });
    px.poly(g, [[sx - 4, y + h], [sx + 4, y + h], [sx, y + h + 6]], '#fff8f0');
    lines.forEach((l, i) => E.font.text(g, l, Math.round(x + 6), Math.round(y + 4 + i * 9), '#3a1a4a', { outline: false }));
    T(g, (OB.CAST[sp.who] || {}).name || '', x + 4, y - 9, (OB.CAST[sp.who] || {}).color || '#ffffff');
  },
  debug(g, race, P, x, y) {
    const c = P.car, inf = c.info || {}, q = race.requests ? race.requests.snap() : {};
    const rows = [['stage', c.stage + ' seg ' + Math.floor(c.z / OB.SEG)], ['z / x', Math.round(c.z) + ' / ' + c.x.toFixed(2)], ['v rpm gear', Math.round(c.v) + ' ' + Math.round(c.rpm) + ' ' + c.gear], ['curve', (inf.curve || 0).toFixed(2)], ['drift a/score', c.drift.a.toFixed(2) + ' / ' + Math.round(c.drift.score)], ['slip', c.slip.toFixed(2)], ['bloom', P.bloom.lvl + ' (' + Math.round(P.bloom.pts) + ')'], ['request', (q.type || '-') + ' ' + (q.state || '')], ['traffic', race.traffic.list.length], ['fps', OB.game.fps !== undefined ? Math.round(OB.game.fps) : '-']];
    OB.UI.panel(g, x, y, 150, rows.length * 9 + 8, { alpha: .8 });
    rows.forEach(([k, v], i) => { T(g, k, x + 6, y + 4 + i * 9, C.dim); T(g, String(v), x + 144, y + 4 + i * 9, '#ffffff', { align: 'right' }); });
  }
};
const TW = (s, o) => OB.TW(s, o);
})();
