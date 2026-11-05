// 41-hud.js — the HUD for one viewport: TIME, SCORE, LIFE, weapon panel, reticle, threat rings, banners, radio, boss bars.
// Everything anchors to the viewport rect and uses input.label() for prompts. Reads sim.*, Pres.*.
const HUD = { banners: [], radio: [], radioCur: null, prompts: {}, seen: {}, hitMark: [0, 0], comboT: 0, shown: {} };
function banner(text, col, o = {}) { HUD.banners.push(Object.assign({ text, col: col || '#ffffff', t: 0, dur: 1.2, scale: 3, y: .38 }, o)); }
const txt = (g, s, x, y, col, o) => E.font.text(g, String(s).replace(/–/g, '-'), Math.round(x), Math.round(y), col, Object.assign({ shadow: '#000000', outline: false }, o));
function glyph(inp, action) { return inp && inp.label ? inp.label(action) : action; }
function promptFor(id, inp) {
  const f = a => '[' + glyph(inp, a) + ']';
  switch (id) {
    case 'cover': return 'HOLD ' + f('cover') + ' TO TAKE COVER — YOU RELOAD IN COVER';
    case 'reload': return 'DUCK TO RELOAD — HOLD ' + f('cover');
    case 'torpedo': return 'SHOOT THE TORPEDO!';
    case 'shield': return 'KNOCK THE SHIELD ASIDE WITH THE SHOTGUN OR GRENADE LAUNCHER';
    case 'laser': return 'THE RED LASER MEANS A SNIPER — DUCK WHEN IT CONVERGES';
    case 'final': return 'FINAL SHOT — HIT THE LEVER!';
    case 'switch': return f('next') + ' / ' + f('prev') + ' — OR FIRE WHILE IN COVER — TO SWITCH WEAPONS';
    default: return null;
  }
}
function pushPrompt(id, inp) { if (HUD.shown[id]) return; HUD.shown[id] = 1; const s = promptFor(id, inp); if (s) HUD.prompt = { t: 0, text: s, dur: id === 'torpedo' ? 2 : 4.5, big: id === 'torpedo' || id === 'final' }; }
function hudEvents(sim, inp, local) {
  for (const ev of sim.events) {
    const mine = ev.p == null || local.includes(ev.p);
    switch (ev.type) {
      case 'action': banner('ACTION!', '#ffd36a', { scale: 4, dur: 1.0, y: .34, slide: 1 }); break;
      case 'clear': banner('AREA CLEAR', '#ffffff', { dur: 1.6, y: .4 }); if (ev.bonus) HUD.bonus = { t: 0, v: ev.bonus }; break;
      case 'stageclear': banner('STAGE CLEAR', '#9fe3ff', { scale: 4, dur: 2.5 }); break;
      case 'timeup': banner('TIDE\'S IN!', '#ff5a5a', { scale: 4, dur: 1.5 }); break;
      case 'extend': banner('TIME EXTEND +' + ev.s, '#9fe3ff', { scale: 2, dur: 1, y: .2 }); break;
      case 'oneup': if (mine) banner('1UP!', '#7cff8a', { scale: 3, dur: 1.2 }); break;
      case 'pickup': if (mine) { banner(WEAPONS[ev.w].name + ' +' + ev.n, '#ffb347', { scale: 2, dur: 1.4, y: .24 }); if (ev.first) HUD.newWeapon = { t: 0, w: ev.w }; } break;
      case 'headshot': if (mine) HUD.hitMark = [1, 0]; break;
      case 'hit': if (mine) { HUD.hitMark = [ev.head ? 1 : .6, 0]; } break;
      case 'quick': if (mine) banner('QUICK KILL +500', '#ffe48a', { scale: 1, dur: .8, y: .62 }); break;
      case 'boss': if (!ev.mini) HUD.bossCard = { t: 0, name: ev.name, title: ev.title }; break;
      case 'bossdown': banner('TARGET DOWN', '#ffd36a', { scale: 3, dur: 2 }); break;
      case 'say': HUD.radio.push({ who: ev.who, text: ev.text }); break;
      case 'prompt': if (ev.p == null || mine) pushPrompt(ev.id, inp); break;
      case 'civhit': if (mine) banner('CIVILIAN HIT!', '#ff5a5a', { scale: 3, dur: 1.4 }); break;
      case 'lockjam': banner('LOCK JAMMED ' + ev.n + '/4', '#ffd36a', { scale: 2, dur: 1.4 }); break;
      case 'intel': banner('INTEL FOUND', '#8aff8a', { scale: 2, dur: 1.3, y: .24 }); if (typeof ev.id === 'string') { const f = E.store.get('tc3.intel', {}); f[ev.id] = 1; E.store.set('tc3.intel', f); } break;
      case 'tiderise': banner('TIDE RISING!', '#ff5a5a', { scale: 4, dur: 1.5 }); break;
      case 'shotdown': if (mine) banner('SHOT DOWN +1000', '#ffe48a', { scale: 1, dur: .9, y: .62 }); break;
      case 'down': if (mine) banner('OUT OF LIVES', '#ff5a5a', { scale: 3, dur: 1.5 }); break;
      case 'stagger': banner('STAGGERED!', '#ffe48a', { scale: 3, dur: 1 }); break;
      case 'shieldbreak': banner('SHIELD BROKEN', '#ffe48a', { scale: 3, dur: 1.2 }); break;
      case 'topple': banner('IT\'S DOWN — COCKPIT OPEN!', '#ffe48a', { scale: 2, dur: 1.8 }); break;
      case 'finalshot': banner('FINAL SHOT!', '#ff5a5a', { scale: 4, dur: 2 }); break;
    }
  }
}
function stepHud(dt) {
  for (const b of HUD.banners) b.t += dt; HUD.banners = HUD.banners.filter(b => b.t < b.dur);
  if (HUD.prompt) { HUD.prompt.t += dt; if (HUD.prompt.t > HUD.prompt.dur) HUD.prompt = null; }
  HUD.hitMark[1] += dt; if (HUD.bossCard) { HUD.bossCard.t += dt; if (HUD.bossCard.t > 2.6) HUD.bossCard = null; }
  if (HUD.bonus) { HUD.bonus.t += dt; if (HUD.bonus.t > 1.6) HUD.bonus = null; }
  if (HUD.newWeapon) { HUD.newWeapon.t += dt; if (HUD.newWeapon.t > 2) HUD.newWeapon = null; }
  // radio
  if (!HUD.radioCur && HUD.radio.length) { const r = HUD.radio.shift(); HUD.radioCur = { who: r.who, text: r.text, t: 0, dur: Math.max(2.4, Math.min(4.5, r.text.length * .06)) }; if (typeof Voice !== 'undefined') Voice.say(r.text, r.who); }
  if (HUD.radioCur) { HUD.radioCur.t += dt; if (HUD.radioCur.t > HUD.radioCur.dur) HUD.radioCur = null; }
}
function resetHud() { HUD.banners.length = 0; HUD.radio.length = 0; HUD.radioCur = null; HUD.prompt = null; HUD.bossCard = null; HUD.bonus = null; HUD.newWeapon = null; }
// threat ring at a muzzle's screen point, plus an edge arrow when off screen
function drawThreats(g, sim, pid, W, H, large) {
  for (const th of sim.threats) {
    const mine = th.tgt === pid, sp = th.sp; if (!sp) continue; const rg = Pres.rings.find(r => r.id === th.id); const total = rg ? rg.tel : th.tel, left = Math.max(0, th.at - sim.t), u = clamp(1 - left / Math.max(.05, total), 0, 1);
    const q = R3.proj(sp[0], sp[1], sp[2]);
    const rad = (large ? 2 : 1) * lerp(26, 6, u), pulse = Math.floor(sim.t * 14) % 2;
    if (q && q[0] > 4 && q[0] < W - 4 && q[1] > 4 && q[1] < H - 4) {
      if (!mine) { px.blend(g, .6, 'normal', () => ring(g, q[0], q[1], rad * .6, '#ff8a8a')); continue; }
      const col = pulse ? '#ff3b30' : '#ff8a80'; ring(g, q[0], q[1], rad, col); ring(g, q[0], q[1], rad - 1, '#ffffff'); px.blend(g, .7, 'add', () => px.disc(g, q[0], q[1], Math.max(2, rad * .35), '#ffffff'));
      txt(g, '!', q[0], q[1] - 3 - (large ? 3 : 0), '#ffffff', { align: 'center', scale: large ? 2 : 1 });
    } else if (mine) {
      const a = q ? Math.atan2(q[1] - H / 2, q[0] - W / 2) : (sp[1] > sim.pose(pid).y ? 0 : Math.PI); const ex = clamp(W / 2 + Math.cos(a) * W, 10, W - 10), ey = clamp(H / 2 + Math.sin(a) * H, 18, H - 24);
      px.poly(g, [[ex + Math.cos(a) * 7, ey + Math.sin(a) * 7], [ex + Math.cos(a + 2.4) * 7, ey + Math.sin(a + 2.4) * 7], [ex + Math.cos(a - 2.4) * 7, ey + Math.sin(a - 2.4) * 7]], pulse ? '#ff3b30' : '#ffffff');
    }
  }
}
function ring(g, cx, cy, r, col) { const n = Math.max(10, Math.round(r * 1.6)); let px0, py0; for (let i = 0; i <= n; i++) { const a = i / n * TAU, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (i) px.line(g, px0 | 0, py0 | 0, x | 0, y | 0, col, 1); px0 = x; py0 = y; } }
const WICON = ['P9', 'MG', 'SG', 'GL'];
function drawReticle(g, x, y, style, size, col, c) {
  const s = size === 'S' ? 5 : size === 'L' ? 9 : 7; if (c > .3) return;
  if (style === 'ring') { ring(g, x, y, s, '#000000'); ring(g, x, y, s - 1, col); px.dot(g, x, y, '#ffffff'); }
  else if (style === 'dot') { px.disc(g, x, y, 2, '#000000'); px.disc(g, x, y, 1, col); }
  else { for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { px.rect(g, x + dx * (s + 1) - (dx ? 0 : 1) - (dx < 0 ? 3 : 0), y + dy * (s + 1) - (dy ? 0 : 1) - (dy < 0 ? 3 : 0), dx ? 4 : 3, dy ? 4 : 3, '#000000'); px.rect(g, x + dx * (s) - (dx ? 0 : 0) - (dx < 0 ? 3 : 0) + (dx ? 0 : 0), y + dy * s - (dy < 0 ? 3 : 0), dx ? 3 : 1, dy ? 3 : 1, col); } px.dot(g, x, y, col); }
}
function drawHud(g, sim, pid, R, ctx) {
  const { x: X, y: Y, w: W, h: H } = R, p = sim.players[pid]; if (!p || tune.view.hideHud) return; const inp = ctx.inputs[pid] || ctx.inputs[0], small = W < 300;
  const corner = ctx.corner;
  g.save(); g.beginPath(); g.rect(X, Y, W, H); g.clip(); g.translate(X, Y); E.px.reset(g);
  const set = ctx.settings || {};
  // cover vignette
  if (p.c > .2) { px.blend(g, clamp(p.c, 0, 1) * .5, 'normal', () => { px.rect(g, 0, 0, W, 10, '#000000'); px.rect(g, 0, H - 10, W, 10, '#000000'); px.rect(g, 0, 0, 8, H, '#000000'); px.rect(g, W - 8, 0, 8, H, '#000000'); }); if (p.c > .35) px.blend(g, clamp(p.c, 0, 1) * .22, 'normal', () => { for (let x = 6; x < W; x += 34) px.rect(g, x, Math.round(H * .46), 1, Math.round(H * .54), '#000000'); px.rect(g, 0, Math.round(H * .68), W, 1, '#000000'); px.rect(g, 0, Math.round(H * .46), W, 2, '#ffffff'); });
   }
  drawThreats(g, sim, pid, W, H, set.threatSize === 'large');
  // hit flash on damage
  if (p.hurt > 0) px.blend(g, clamp(p.hurt * 1.2, 0, .5), 'normal', () => { px.rect(g, 0, 0, W, 6, '#ff2020'); px.rect(g, 0, H - 6, W, 6, '#ff2020'); px.rect(g, 0, 0, 6, H, '#ff2020'); px.rect(g, W - 6, 0, 6, H, '#ff2020'); });
  // score popups
  for (const q of Pres.popups) { const sp = R3.proj(q.pos[0], q.pos[1], q.pos[2] + q.t * 22); if (sp && sp[0] > 0 && sp[0] < W) px.blend(g, clamp(1.2 - q.t, 0, 1), 'normal', () => txt(g, q.text, sp[0], sp[1], q.col, { align: 'center', scale: 1 })); }
  // reticle
  const rx = W / 2 + p.aim[0] * H / 2, ry = H / 2 - p.aim[1] * H / 2;
  if (ctx.reticleOn(pid) && !p.down && sim.phase !== 'travel') { drawReticle(g, Math.round(rx), Math.round(ry), set.reticle || 'cross', set.reticleSize || 'M', p.color, p.c); const hm = HUD.hitMark; if (hm[1] < .18 && ctx.local.includes(pid)) { const c = hm[0] >= 1 ? '#ffd36a' : '#ffffff'; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) px.line(g, rx + dx * 3, ry + dy * 3, rx + dx * 6, ry + dy * 6, c, 1); } }
  if (p.weapon === 0 && p.mag <= 0 && p.c < .5 && !p.down) txt(g, 'RELOAD!', rx, ry + 14, Math.floor(sim.t * 6) % 2 ? '#ff5a5a' : '#ffffff', { align: 'center', scale: 1 });
  // first-person weapon model: a distinct shape and recoil per weapon type, lowered when ducking, swapped with a dip
  if (!p.down && p.c < .95 && !small) { const k = p.recoil, dip = p.switchT > 0 ? p.switchT * 40 : 0, bx0 = Math.round(rx * .2 + W * .52 + k * 3 * (p.weapon === 2 ? 2 : 1)), by0 = Math.round(H - 34 + dip + p.c * 40 + k * (p.weapon === 3 ? 9 : p.weapon === 2 ? 12 : p.weapon === 1 ? 3 : 6)), O = '#0a0a12';
    const box = (x, y, w, h, c) => { px.rect(g, x - 1, y - 1, w + 2, h + 2, O); px.rect(g, x, y, w, h, c); };
    if (p.weapon === 0) { box(bx0, by0, 12, 34, '#5a626e'); box(bx0 + 2, by0 - 6, 8, 8, '#8a94a4'); box(bx0 + 3, by0 + 24, 6, 14, '#2a2f3a'); }
    else if (p.weapon === 1) { box(bx0 - 4, by0 - 4, 20, 40, '#3a4250'); box(bx0 + 2, by0 - 14, 8, 12, '#7a8494'); box(bx0 + 14, by0 + 14, 6, 18, '#23272f'); }
    else if (p.weapon === 2) { box(bx0 - 6, by0 - 2, 24, 40, '#6a4a2e'); box(bx0, by0 - 12, 5, 14, '#9aa4b4'); box(bx0 + 8, by0 - 12, 5, 14, '#9aa4b4'); }
    else { box(bx0 - 8, by0 - 6, 28, 42, '#4a5a3a'); box(bx0 - 2, by0 - 18, 16, 14, '#2a2f22'); box(bx0 + 4, by0 - 22, 4, 6, '#ffb347'); }
    if (k > .6) px.blend(g, .8, 'add', () => px.disc(g, bx0 + 6, by0 - (p.weapon === 3 ? 22 : 10), 4 + k * 3, '#ffe9a8')); }
  // TIME
  if (!small || pid === 0) {
    const tm = Math.max(0, sim.timer), low = tm < 10, cx = W / 2 + (small ? 14 : 0); const bw = small ? 66 : 90;
    E.ui.box(g, cx - bw / 2, 2 + (corner ? 0 : 0), bw, 27, { bg: ['#10244a', '#081428'], border: low ? '#ff3b30' : '#3aa0e8', alpha: .85 });
    const fill = clamp(tm / Math.max(1, sim.timeMax), 0, 1); px.rect(g, cx - bw / 2 + 2, 26, Math.round((bw - 4) * fill), 2, low ? '#ff3b30' : '#3aa0e8');
    txt(g, 'TIME', cx, 4, '#9fe3ff', { align: 'center', scale: 1 });
    const tcol = low ? (tm < 5 && Math.floor(sim.t * 4) % 2 ? '#ffffff' : '#ff5a5a') : '#ffffff'; txt(g, tm.toFixed(2).padStart(5, '0'), cx, 11, sim.phase === 'travel' ? '#9fb0c8' : tcol, { align: 'center', scale: small ? 1 : 2 });
  }
  // SCORE
  txt(g, String(p.score).padStart(7, '0'), 6, small ? 6 : 5, '#ffffff', { scale: small ? 1 : 2 }); if (p.mark) txt(g, '*'.repeat(Math.min(5, p.mark)), 6, 21, '#ff8a3a', { scale: 1 });
  if (p.chain >= 5) txt(g, '×' + Math.min(2, 1 + Math.floor(p.chain / 5) * .1).toFixed(1), 6, 22 + (p.mark ? 8 : 0), '#ffd36a', { scale: 1 });
  txt(g, p.name, 6, small ? 22 + (p.mark ? 8 : 0) + (p.chain >= 5 ? 8 : 0) : H - 38, p.color, { scale: 1 });
  // LIFE
  for (let i = 0; i < Math.min(p.lives, 9); i++) { const bx = 6 + i * 10, by = H - 28; px.poly(g, [[bx, by], [bx + 8, by], [bx + 8, by + 6], [bx + 4, by + 10], [bx, by + 6]], '#000000'); px.poly(g, [[bx + 1, by + 1], [bx + 7, by + 1], [bx + 7, by + 5], [bx + 4, by + 8], [bx + 1, by + 5]], p.inv > 0 && Math.floor(sim.t * 10) % 2 ? '#ffffff' : p.color); }
  if (p.lives > 9) txt(g, '+' + (p.lives - 9), 98, H - 28, '#ffffff', { scale: 1 });
  // weapon panel
  const w = WEAPONS[p.weapon], bx = W - 96, by = H - 36; E.ui.box(g, bx, by, 90, 32, { bg: ['#10244a', '#081428'], border: p.color, alpha: .85 });
  txt(g, w.name, bx + 4, by + 3, '#ffd36a', { scale: 1 });
  if (p.weapon === 0) { for (let i = 0; i < 9; i++) px.rect(g, bx + 4 + i * 9, by + 14, 6, 9, i < p.mag ? '#ffe9a8' : '#2a3350'); if (p.reloadT > 0 || p.mag < 9 && p.c > .6) { px.rect(g, bx + 4, by + 26, 82, 2, '#2a3350'); px.rect(g, bx + 4, by + 26, Math.round(82 * (p.mag >= 9 ? 1 : clamp(p.reloadT / tune.player.reload, 0, 1))), 2, '#9fe3ff'); } }
  else { txt(g, String(p.ammo[p.weapon]), bx + 4, by + 13, '#ffffff', { scale: 2 }); px.rect(g, bx + 40, by + 20, 46, 4, '#2a3350'); px.rect(g, bx + 40, by + 20, Math.round(46 * clamp(p.ammo[p.weapon] / WEAPONS[p.weapon].pool, 0, 1)), 4, '#ffb347'); }
  // weapon strip after switch
  if (p.switchT > 0 || HUD.strip && HUD.strip[pid] > 0) { for (let i = 0; i < 4; i++) { const sx = bx + i * 22, ok = i === 0 || p.ammo[i] > 0; px.rect(g, sx, by - 14, 20, 12, i === p.weapon ? '#3aa0e8' : '#10244a'); txt(g, WICON[i], sx + 10, by - 12, ok ? '#ffffff' : '#555e70', { align: 'center', scale: 1 }); } }
  // continue countdown
  if (p.down && p.contT > 0) { px.rect(g, 0, 0, W, H, '#000000c0'); txt(g, 'CONTINUE?', W / 2, H / 2 - 24, '#ffffff', { align: 'center', scale: 2 }); txt(g, String(Math.ceil(p.contT)), W / 2, H / 2 - 6, '#ffd36a', { align: 'center', scale: 4 }); txt(g, 'PRESS ' + glyph(inp, 'start') + ' OR CLICK', W / 2, H / 2 + 24, '#9fe3ff', { align: 'center', scale: 1 }); }
  else if (p.down) { txt(g, 'GAME OVER', W / 2, H / 2 - 6, '#ff5a5a', { align: 'center', scale: 2 }); }
  // phase labels
  if (sim.phase === 'travel' && sim.pt > .3) txt(g, 'WAIT', W / 2, H * .3, Math.floor(sim.t * 3) % 2 ? '#ffffff' : '#9fb0c8', { align: 'center', scale: 3 });
  // banners
  if (pid === ctx.local[0] || ctx.local.length === 1 || true) for (const b of HUD.banners) { const u = b.t / b.dur, a = u > .75 ? (1 - u) * 4 : 1, sl = b.slide ? Math.max(0, 1 - b.t * 6) * 40 : 0; px.blend(g, clamp(a, 0, 1), 'normal', () => txt(g, b.text, W / 2 + sl * (b.slide ? 1 : 0), H * b.y, b.col, { align: 'center', scale: small ? Math.min(b.scale, 2) : b.scale, outline: '#000000' })); }
  if (HUD.bonus) txt(g, 'TIME BONUS +' + HUD.bonus.v, W / 2, H * .56, '#9fe3ff', { align: 'center', scale: small ? 1 : 2 });
  if (HUD.newWeapon) txt(g, 'NEW WEAPON: ' + WEAPONS[HUD.newWeapon.w].name, W / 2, H * .14, '#ffb347', { align: 'center', scale: small ? 1 : 2 });
  // prompt bar
  if (HUD.prompt && pid === ctx.local[0]) { const pr = HUD.prompt, tw = E.font.width(pr.text, { scale: pr.big ? 2 : 1 }); const bw2 = Math.min(W - 8, tw + 14); E.ui.box(g, W / 2 - bw2 / 2, H - (pr.big ? 70 : 52), bw2, pr.big ? 20 : 14, { bg: ['#10244a', '#081428'], border: '#ffd36a', alpha: .85 }); txt(g, pr.text, W / 2, H - (pr.big ? 66 : 49), '#ffffff', { align: 'center', scale: pr.big ? 2 : 1 }); }
  // boss bars
  if (sim.boss && !sim.boss.dead && !sim.boss.intro && ctx.local[0] === pid) { let by2 = 33; for (const bar of sim.boss.bars) { if (bar.late && sim.boss.phase < 2) continue; let h = 0, m = 0; for (const k of bar.parts) { const pt = sim.boss.parts[k]; if (pt) { h += Math.max(0, pt.hp); m += pt.max; } } const bw = Math.min(W - 40, 160); const bx2 = W / 2 - bw / 2; px.rect(g, bx2 - 1, by2 - 1, bw + 2, 8, '#000000'); px.rect(g, bx2, by2, bw, 6, '#3a1018'); px.rect(g, bx2, by2, Math.round(bw * clamp(h / Math.max(1, m), 0, 1)), 6, sim.boss.id === 'krake' ? '#d4af37' : '#ff3b30'); txt(g, bar.label, W / 2, by2 - 1, '#ffffff', { align: 'center', scale: 1 }); by2 += 11; } }
  // boss card
  if (HUD.bossCard && ctx.local[0] === pid) { const c = HUD.bossCard, a = clamp(Math.min(c.t * 4, (2.6 - c.t) * 3), 0, 1); px.blend(g, a, 'normal', () => { px.rect(g, 0, H * .36, W, 40, '#000000b0'); txt(g, c.name, W / 2, H * .38, '#ff5a5a', { align: 'center', scale: 3, outline: '#000' }); txt(g, '— ' + c.title.toUpperCase() + ' —', W / 2, H * .38 + 28, '#ffffff', { align: 'center', scale: 1 }); }); }
  // radio
  if (HUD.radioCur && ctx.local[0] === pid && !tune.view.hideHud) { const rc = HUD.radioCur, sp = reg('speaker', rc.who); if (sp) { const bw = Math.min(W - 40, 230), bx2 = W / 2 - bw / 2, by2 = 33 + (sim.boss && !sim.boss.dead && !sim.boss.intro ? 24 : 0); E.ui.box(g, bx2, by2, bw, 34, { bg: ['#10244a', '#081428'], border: sp.color, alpha: .9 }); const rig = speakerRig(rc.who); if (rig) rig.drawPortrait(g, bx2 + 4, by2 + 4, 24); txt(g, sp.name, bx2 + 38, by2 + 4, sp.color, { scale: 1 }); if (set.subtitles !== false) { const lines = E.font.wrap(rc.text, bw - 46, { scale: 1 }); for (let i = 0; i < Math.min(2, lines.length); i++) txt(g, lines[i], bx2 + 38, by2 + 14 + i * 9, '#ffffff', { scale: 1 }); } } }
  if (tune.view.perf && pid === 0) txt(g, 'PERF ' + (ctx.perf || ''), 4, 40, '#00ff80', { scale: 1 });
  g.restore(); E.px.reset(g);
}
const _srig = {};
function speakerRig(id) { if (_srig[id]) return _srig[id]; const sp = reg('speaker', id); if (!sp || !sp.rig) return null; return _srig[id] = new E.Humanoid(sp.rig); }
