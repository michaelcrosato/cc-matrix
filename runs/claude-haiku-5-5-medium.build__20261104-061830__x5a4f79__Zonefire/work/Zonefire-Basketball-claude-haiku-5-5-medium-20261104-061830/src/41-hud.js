/* ---- THE MATCH HUD (plan §11.5): the score bug (team panels with two player plates each), the period, the game clock and
 * the shot clock, the announcer's caption in the lower third, banners at the top third (one at a time, by priority), a
 * P tag over each human's player, and the release meter. Screen pixels; anchored to r.W and r.H. ---- */
const BANNER_PRIO = { SHATTERED: 10, SUPERNOVA: 9, POSTERIZED: 8, DUNK: 7, ALLEYOOP: 6, REJECTED: 5, JACKPOT: 4, THREE: 3, PICKPOCKET: 2, ANKLES: 1 };
const BANNER_COLOR = { SHATTERED: '#9adfff', SUPERNOVA: '#e8b0ff', POSTERIZED: '#ff5ad0', DUNK: '#ffd23a', ALLEYOOP: '#ffd23a', REJECTED: '#ff5a3a', JACKPOT: '#ffd23a', THREE: '#2de2ff', PICKPOCKET: '#7af0a0', ANKLES: '#ffb347' };
/** a banner: its text, its class (for the priority and the colour), its life; the one showing is the top priority */
const banner = (text, cls) => {
  const b = { text, cls, t: 0, life: 1.4, prio: BANNER_PRIO[cls] || 0 };
  const cur = S.banner;
  if (!cur || cur.t >= cur.life || b.prio >= cur.prio) S.banner = b;
};
/** the announcer's caption: a line, the portrait's name, the time it stays. Two per possession at most (§10.7). */
const caption = (bank, names, who) => {
  if (COMMENTARY_LEVEL() === 0) return;
  const text = lineFor(bank, names); if (!text) return;
  if (COMMENTARY_LEVEL() === 1 && !(bank === 'dunkPower' || bank === 'dunkSpin' || bank === 'basket' || bank === 'shatter' || bank === 'novaOn' || bank === 'block' || bank === 'steal' || bank === 'alleyoop' || bank === 'three' || bank === 'goaltend' || bank === 'boss' || bank === 'final' || bank === 'quake')) return;
  S.caption = { text, t: 0, life: 3.2, who: who || 'VINNIE', bank };
  voiceSay(text, (who || 'VINNIE') === 'DEE DEE' ? 'deedee' : 'vinnie', { volume: .18 });
  S.captionsThisPoss = (S.captionsThisPoss || 0) + 1;
  if (S.match) S.match.lastCaption = S.match.t;
};

/* the HUD's pieces: the score bug, the caption, the banner, the tags */
const hudScore = (r) => {
  const m = S.match, W = r.W, H = r.H, pw = clamp((W - 84) / 2 - 8, 116, 170);
  r.overlay(g => {
    for (const side of [0, 1]) {
      const t = S.teams[side], x = side ? W - pw - 8 : 8, y = 4;
      E.ui.box(g, x, y, pw, 36, { bg: [t.colors.jersey, '#120a1c'], gradient: true, alpha: .85, border: t.colors.trim });
      E.font.text(g, t.short, x + 6, y + 4, C.ink, { scale: 1, outline: false, shadow: '#000' });
      E.font.text(g, String(m.score[side]), side ? x + pw - 8 : x + pw - 8, y + 12, C.ink, { scale: 2, align: side ? 'left' : 'right', outline: false, shadow: '#000' });
      const plates = S.players.filter(p => p.side === side && p.onCourt);
      plates.forEach((p, i) => {
        const px0 = x + 6 + i * ((pw - 12) / 2), py = y + 40;
        E.font.text(g, p.name, px0, py, p.human ? C.gold : '#d8cfee', { scale: 1, outline: false, shadow: '#000' });
        E.ui.bar(g, px0, py + 10, (pw - 24) / 2 - 4, 3, clamp(p.turbo, 0, 1), C.cyan);
        for (let k = 0; k < 3; k++) px.rect(g, px0 + k * 8, py + 16, 6, 3, p.heat > k || p.nova ? C.gold : '#2a2040');
        if (p.pu) { E.font.text(g, p.pu.icon || '*', px0 + 46, py + 15, p.pu.color || C.gold, { scale: 1, outline: false }); }
      });
    }
    // the centre: the period, the game clock, the shot clock
    const per = m.quarter > 4 ? (m.ot > 0 ? 'OT' + (m.ot > 1 ? '' : '') : 'Q4') : 'Q' + m.quarter;
    const label = m.sudden ? 'SUDDEN BLAM' : per;
    E.font.text(g, label, W / 2, 6, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' });
    const mm = Math.floor(m.clock / 60), ss = Math.floor(m.clock % 60);
    E.font.text(g, mm + ':' + String(ss).padStart(2, '0'), W / 2, 18, C.ink, { align: 'center', scale: 2, outline: false, shadow: '#000' });
    const sc = Math.ceil(m.shotClock), red = m.shotClock < 5, boxY = 40;
    if (m.poss !== null) E.ui.box(g, W / 2 - 16, boxY, 32, 14, { bg: red ? ['#8a1a1a', '#4a0a0a'] : ['#2a2040', '#140c26'], gradient: false, alpha: .9 });
    if (m.poss !== null) E.font.text(g, String(Math.max(0, sc)), W / 2, boxY + 3, red ? C.danger : C.ink, { align: 'center', scale: 1, outline: false });
  });
};
const hudCaption = (r) => {
  const c = S.caption; if (!c || c.t > c.life) return;
  const a = c.t < .15 ? c.t / .15 : c.t > c.life - .4 ? (c.life - c.t) / .4 : 1;
  r.overlay(g => {
    const w = Math.min(r.W * .62, 620), x = r.W / 2 - w / 2, y = r.H - 58;
    E.ui.box(g, x, y, w, 40, { bg: ['#1a1030', '#0c0618'], alpha: .92 * a, border: C.accent });
    E.font.text(g, c.who, x + 8, y + 5, C.gold, { scale: 1, outline: false, shadow: '#000' });
    E.font.text(g, c.text, x + 8, y + 18, C.ink, { scale: 1, outline: false, shadow: '#000' });
  });
};
const hudBanner = (r) => {
  const b = S.banner; if (!b || b.t > b.life) return;
  const u = Math.min(1, b.t / .25), sc = u < 1 ? E.ease.outBack(u) * 3.4 : 3.2;
  const alpha = b.t > b.life - .2 ? (b.life - b.t) / .2 : 1;
  r.overlay(g => {
    E.font.title(g, b.text, r.W / 2, r.H * .3, { align: 'center', scale: Math.max(1, Math.round(sc)), colors: [BANNER_COLOR[b.cls] || '#ffffff', '#ffffff'], depth: 3, depthColor: '#120818' });
  });
};
/** the tag over each human's player (P1–P4) and the release meter by the shooter */
const hudWorld = (r) => {
  for (const p of S.players) {
    if (!p.onCourt) continue;
    if (p.human) { const q = r.w(p.body.x, p.body.y, p.body.z + 64); r.overlay(g => { E.ui.box(g, q[0] - 10, q[1] - 12, 22, 9, { bg: [p.slot % 2 ? C.cyan : C.accent, '#140c26'], gradient: false, alpha: .95 }); E.font.text(g, 'P' + (p.humanNo || (p.slot + 1)), q[0] + 1, q[1] - 10, C.ink, { font: 'tiny', align: 'center', outline: false, scale: 1 }); }); }
    if (p.shot && p.shot.phase === 'jump' && p.shot.jt !== undefined && !p.shot.dunk && p.hasBall && tune('shotMeter') && setting('shotMeter') !== 'Off') {
      const q = r.w(p.body.x, p.body.y, p.body.z + 70), u = clamp(p.shot.jt / Math.max(.05, p.shot.apexT * 2), 0, 1);
      r.overlay(g => { E.ui.bar(g, q[0] - 18, q[1] - 2, 36, 3, u, u > .9 ? C.gold : C.cyan); });
    }
  }
};
/** the break card and the halftime report (in the match scene, over the court): score, leaders, a gag, the subs */
const hudBreak = (r) => {
  const m = S.match; if (!m || m.phase !== 'break') return;
  r.overlay(g => {
    panel(g, r.W * .2, r.H * .18, r.W * .6, r.H * .5, { border: C.gold });
    E.font.title(g, m.breakKind === 'half' ? 'HALFTIME REPORT' : m.breakKind === 'ot' ? 'OVERTIME' : 'BREAK', r.W / 2, r.H * .22, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a'], depth: 2 });
    E.font.text(g, S.teams[0].short + '  ' + m.score[0] + ' - ' + m.score[1] + '  ' + S.teams[1].short, r.W / 2, r.H * .36, C.ink, { align: 'center', scale: 3, outline: false, shadow: '#000' });
    if (m.breakKind === 'half') E.font.text(g, HALFTIME_GAGS[(S.gagI || 0) % HALFTIME_GAGS.length], r.W / 2, r.H * .48, C.cyan, { align: 'center', scale: 1, outline: false, shadow: '#000', wrap: r.W * .5 });
    Object.entries(m.subUI || {}).forEach(([side, u], i) => {
      const { on, bench } = subOptions(+side), off = on[u.offI % on.length], inn = bench[u.benchI % bench.length];
      if (!off || !inn) return;
      E.font.text(g, S.teams[side].short + ' SUB:  ' + off.name + ' OFF  ·  ' + inn.name + ' ON', r.W / 2, r.H * .62 + i * 22, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' });
      E.font.text(g, 'UP/DOWN WHO COMES OFF · LEFT/RIGHT WHO COMES ON · CONFIRM SUBS · CANCEL KEEPS', r.W / 2, r.H * .62 + i * 22 + 11, C.muted, { align: 'center', scale: 1, outline: false, shadow: '#000' });
    });
    E.font.text(g, 'NEXT IN ' + Math.ceil(Math.max(0, (m.breakKind === 'half' ? HALF_SECS : BREAK_SECS) - m.breakT)) + 'S', r.W / 2, r.H * .6, C.muted, { align: 'center', scale: 1, outline: false });
  });
};
const HALFTIME_GAGS = ['THIS HALFTIME IS BROUGHT TO YOU BY GLOBO-BLAM SNEAKER GLUE. STICK THE LANDING. FOREVER.', 'OUR STATS DEPARTMENT IS ONE GUY WITH A CALCULATOR, AND HE IS SWEATING.', 'REMEMBER, KIDS: STAY IN SCHOOL. AND IN THE PAINT.', 'GLOBO-BLAM COLA: NOW WITH 30% MORE FIZZ AND 0% EXPLANATION.', 'IF YOU\'RE JUST JOINING US: YES, THAT WAS A REAL DUNK. NO, WE DON\'T KNOW HOW EITHER.', 'WE ASKED THE ROBOTS FOR A HALFTIME COMMENT. THEY SENT US A RECEIPT.'];

/** the whole HUD of a match, in the order the screen reads: the score bug, the caption, the banner, the tags, the break */
const hudSponsor = r => {
  const m = S.match; if (!m || !m.sponsorOn) return;
  const i = Math.floor(m.deadT || 0) % SPONSOR_LINES.length;
  r.overlay(g => { panel(g, r.W * .1, r.H * .36, r.W * .8, r.H * .2, { border: C.cyan, alpha: .96 }); E.font.text(g, SPONSOR_LINES[i], r.W / 2, r.H * .42, C.ink, { align: 'center', scale: 2, outline: false, shadow: '#000', wrap: r.W * .74 }); E.font.text(g, 'WE\'LL BE RIGHT BACK', r.W / 2, r.H * .5, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' }); });
};
const SPONSOR_LINES = BEATS.sponsor;
const hudDraw = (r) => { hudScore(r); hudWorld(r); hudCaption(r); hudBanner(r); hudBreak(r); hudSponsor(r); };
/** the HUD's own clocks (captions and banners fade in game time) */
const hudStep = dt => { if (S.caption) S.caption.t += dt; if (S.banner) S.banner.t += dt; };
