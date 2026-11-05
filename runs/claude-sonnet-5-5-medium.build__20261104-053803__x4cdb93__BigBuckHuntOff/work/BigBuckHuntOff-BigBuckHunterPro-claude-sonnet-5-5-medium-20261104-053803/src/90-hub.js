/* AI Hub integration (ghost mode): the game's own card, a 3-minute timed Hunt-Off, ghost reticles, progress and result. */
(() => {
const BB = globalThis.BB, E = BB.E, px = E.px, clamp = BB.clamp, txt = BB.txt;
const HUB = BB.hub = { active: false, info: null, card: { left: null, ready: [], asking: 0, asked: false, starting: false }, started: false, ghosts: {}, names: {}, total: 0, siteIdx: 0, reported: false, ended: false, sentT: 0, progT: 0, order: [], limitMs: 180000, siteScore: 0 };
const A = () => (typeof AIHub !== 'undefined' ? AIHub : null);
BB.hubAvailable = () => { const a = A(); return !!(a && a.active); };

/* called at boot: resolves true when a hub round is in progress */
BB.hubConnect = async () => {
  const a = A(); if (!a || !a.active) return false;
  let info = null;
  try { info = await a.connect({ mode: 'ghost', seats: [1, 4], card: true }); } catch (e) { info = null; }
  if (!info) return false;
  HUB.active = true; HUB.info = info; HUB.limitMs = Math.min(180000, info.limitMs > 0 ? info.limitMs : 180000);
  for (const p of info.players || []) HUB.names[p.id] = p;
  a.on('card', c => { HUB.card = Object.assign(HUB.card, c); });
  a.on('start', () => { HUB.started = true; });
  a.on('message', (d, from) => { if (d && d.t === 'g') HUB.ghosts[from] = { x: d.x, y: d.y, s: d.s, site: d.i, at: BB.game ? BB.game.time : 0 }; });
  a.on('leave', ({ id }) => { delete HUB.ghosts[id]; });
  a.on('time-up', () => hubReport());
  a.on('end', () => { HUB.ended = true; BB.muteSfx = true; BB.muteMusic = true; try { BB.game.audio.music(null); BB.game.audio.mute(); } catch (e) { /* ignore */ } });
  return true;
};
function hubReport() {
  const a = A(); if (!a || HUB.reported) return; HUB.reported = true;
  const me = BB.players[0]; const total = Math.round(HUB.total + (me ? me.siteScore : 0));
  try { a.result({ score: total, stats: { kills: me ? me.kills : 0 } }); } catch (e) { /* ignore */ }
}
BB.hubReportNow = hubReport;
const SITE_POOL = () => BB.SITE_ORDER.filter(id => { const d = BB.SITES[id]; return !d.trophy && !d.bonus && !d.range; });
/* ---------- the card scene ---------- */
BB.buildHubCard = (game) => ({
  view: 'overhead', pausable: false,
  enter() { BB.bg = BB.makeBackdrop('hollow1'); BB.music('title'); HUB.cardT = 0; const a = A(); if (a) { try { a.ready(); } catch (e) { /* ignore */ } } },
  update(dt) {
    HUB.cardT += dt; BB.updateBackdrop(BB.bg, dt); const I = game.input, a = A();
    if (I.pressed('confirm') || (I.clicked && I.clicked())) { try { a.answer('ready'); } catch (e) { /* ignore */ } }
    if (I.pressed('call') || I.pressed('cancel')) { try { a.answer('more'); } catch (e) { /* ignore */ } }
    if (HUB.started) { BB.startRun('hub', {}); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, Hh = r.H; BB.renderMain(g, BB.bg, BB.bg.sceneTime); px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, Hh, '#0c0e1a'));
      E.font.title(g, 'BIG BUCK HUNT-OFF', W / 2, 12, { scale: 3, colors: ['#ffe27a', '#d9822a'], outline: '#2a1608', align: 'center' });
      txt(g, 'MOST POINTS IN 3 MINUTES WINS. BUCKS ONLY, NEVER DOES!', W / 2 - BB.tw('MOST POINTS IN 3 MINUTES WINS. BUCKS ONLY, NEVER DOES!') / 2, 46, '#fff3c8');
      const pl = (HUB.info && HUB.info.players) || []; pl.forEach((p, i) => { const y = 66 + i * 20, ready = HUB.card.ready && HUB.card.ready.includes(p.id); E.ui.box(g, 100, y, W - 200, 17, { bg: ['#1b2240', '#10152a'], border: p.color || BB.COLORS[i], alpha: .95 }); px.rect(g, 106, y + 5, 7, 7, p.color || BB.COLORS[i]); txt(g, String(p.name || 'HUNTER').slice(0, 18), 120, y + 5, '#fff'); txt(g, ready ? 'READY' : '...', W - 100 - 50, y + 5, ready ? '#9fe08a' : '#8a90b0'); });
      const left = HUB.card.left; const tl = left == null ? (HUB.card.starting ? 'GET READY' : 'WAITING') : Math.ceil(left / 1000) + 's';
      txt(g, tl, W / 2 - BB.tw(tl) / 2, Hh - 70, '#ffd36a');
      const h2 = 'AIM: MOUSE OR LEFT STICK • SHOOT: CLICK OR R2 • PUMP: R OR SQUARE'; txt(g, h2, W / 2 - BB.tw(h2) / 2, Hh - 54, '#c8c8dc');
      BB.prompts(g, [['confirm', 'READY'], ['call', 'MORE TIME']], W / 2, Hh - 30, 'center');
    });
  }
});
/* ---------- the round ---------- */
BB.hubBegin = () => {
  const H = BB.H, a = A(); const rng = a ? a.rng('hunt') : BB.rng(4141);
  const pool = SITE_POOL().slice(); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  HUB.order = pool; HUB.siteIdx = 0; HUB.total = 0; HUB.reported = false; HUB.over = false;
  hubSite(0); BB.music('hollow');
};
function hubSite(i) {
  const H = BB.H, id = HUB.order[i % HUB.order.length]; const me = BB.players[0];
  me.huntScore = 0; BB.RNG.reseed(HUB.info ? HUB.info.seed + i : 900 + i);
  const ctx = H.ctx = BB.curSite = BB.createSite(id, BB.players, { seed: 900 + i, mode: 'hub' }); ctx.state = 'play'; ctx.timeLimit = Math.min(ctx.timeLimit, 48);
  me.rx = ctx.view.W / 2; me.ry = ctx.view.H * .55; H.phase = 'play'; H.hubI = i; BB.music(ctx.def.hunt);
  BB.banner(ctx.def.name.toUpperCase(), ctx.hunt.hudColor);
}
BB.hubUpdate = (dt) => {
  const H = BB.H, a = A(), ctx = H.ctx; if (!ctx) return;
  const t = a ? a.time() : H.hubT || 0; if (!a) H.hubT = (H.hubT || 0) + dt * 1000;
  if (HUB.ended || HUB.over) return;
  if (t < 0) { ctx.sceneTime += dt; BB.updateView(ctx.view); return; }
  BB.updateSite(ctx, dt);
  if (ctx.state === 'ended') {
    HUB.total += ctx.results ? ctx.results[0].total : 0; HUB.siteIdx++; hubSite(HUB.siteIdx);
  }
  const me = BB.players[0];
  HUB.sentT -= dt; if (HUB.sentT <= 0 && a) { HUB.sentT = .12; try { a.send({ t: 'g', x: Math.round(me.rx / ctx.view.W * 1000) / 1000, y: Math.round(me.ry / ctx.view.H * 1000) / 1000, s: Math.round(HUB.total + me.siteScore), i: HUB.siteIdx }, { reliable: false }); } catch (e) { /* ignore */ } }
  HUB.progT -= dt; if (HUB.progT <= 0 && a) { HUB.progT = 1; try { a.progress({ score: Math.round(HUB.total + me.siteScore), label: ctx.def.name }); } catch (e) { /* ignore */ } }
  if (t >= HUB.limitMs && !HUB.over) { HUB.over = true; hubReport(); }
};
BB.hubDraw = (g, W, Hh) => {
  const H = BB.H, ctx = H.ctx, a = A(); if (!ctx) return;
  ctx.view.W = W; ctx.view.H = Hh; BB.updateView(ctx.view);
  BB.drawSiteFrame(g, ctx, ctx.sceneTime, {});
  const t = a ? a.time() : H.hubT || 0;
  /* ghosts */
  for (const id in HUB.ghosts) { const gh = HUB.ghosts[id], pl = HUB.names[id]; if (!pl || +id === (HUB.info && HUB.info.me)) continue; if (HUB.info && gh.site !== HUB.siteIdx) continue; const x = gh.x * W, y = gh.y * Hh, c = pl.color || '#fff'; px.blend(g, .7, 'normal', () => { px.line(g, x - 5, y, x + 5, y, c, 1); px.line(g, x, y - 5, x, y + 5, c, 1); for (let k = 0; k < 12; k++) { const an = k / 12 * 6.283; px.dot(g, x + Math.cos(an) * 5, y + Math.sin(an) * 5, c); } }); txt(g, String(pl.name || '').slice(0, 8), x + 7, y - 4, c); }
  /* standings */
  const rows = []; const me = BB.players[0]; rows.push({ name: 'YOU', s: Math.round(HUB.total + me.siteScore), c: me.color }); for (const id in HUB.ghosts) { const pl = HUB.names[id]; if (pl && !(HUB.info && +id === HUB.info.me)) rows.push({ name: String(pl.name || 'P').slice(0, 8), s: HUB.ghosts[id].s || 0, c: pl.color }); }
  rows.sort((x, y) => y.s - x.s); rows.slice(0, 4).forEach((r, i) => { txt(g, r.name + ' ' + BB.fmt(r.s), W - 8 - BB.tw(r.name + ' ' + BB.fmt(r.s)), 24 + i * 10, r.c); });
  if (t < 0) { const n = Math.ceil(-t / 1000); E.font.title(g, n > 0 ? String(n) : 'GO', W / 2, Hh / 2 - 20, { scale: 5, colors: ['#ffe27a', '#d9822a'], outline: '#2a1608', align: 'center' }); }
  const left = Math.max(0, HUB.limitMs - Math.max(0, t)); const s = Math.ceil(left / 1000); const lab = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); txt(g, lab, 6, 40, '#fff');
  if (HUB.over) { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, Hh, '#0a0c16')); E.font.title(g, 'TIME!', W / 2, Hh / 2 - 20, { scale: 4, colors: ['#ffe27a', '#d9822a'], outline: '#2a1608', align: 'center' }); const m = 'FINAL SCORE ' + BB.fmt(HUB.total + me.siteScore); txt(g, m, W / 2 - BB.tw(m) / 2, Hh / 2 + 20, '#fff'); }
};
})();
