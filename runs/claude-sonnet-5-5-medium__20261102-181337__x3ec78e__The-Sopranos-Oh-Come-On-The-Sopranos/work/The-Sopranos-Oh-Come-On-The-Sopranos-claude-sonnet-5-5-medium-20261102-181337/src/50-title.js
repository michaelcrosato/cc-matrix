/* ---- 50-title: the hub (AI Hub session), the title with its attract mode, the About / credits ---- */
const AH = typeof window !== 'undefined' && window.AIHub ? window.AIHub : null;
const hub = { active: false, info: null, started: false, sent: false, ended: false, lastSend: 0, lastProg: 0, timeUp: false, names: {} };
function hubGo() { return hub.active && !hub.ended && AH.time() >= 0; }
function hubCountdown() { const t = AH.time(); return t === -Infinity ? -1 : t < 0 ? -t / 1000 : 0; }
function hubTimeLeft() { return hub.info && hub.info.limitMs ? (hub.info.limitMs - Math.max(0, AH.time())) / 1000 : 0; }
function hubTick(dt) {
  if (!hub.active || hub.ended || !hubGo()) return;
  const now = game.real;
  if (now - hub.lastSend > .12) { hub.lastSend = now; AH.send(Object.assign({ k: 'p' }, PLAY.mySnap()), { reliable: false }); }
  if (now - hub.lastProg > 1) { hub.lastProg = now; AH.progress({ score: score(), label: money(S.cash) + ' · ' + S.kills + ' KO' }); }
}
function hubDone(won) {
  if (!hub.active || hub.sent) return; hub.sent = true;
  const st = PLAY.state().st;
  AH.result({ score: score() + (won ? 2000 : 0), stats: { cash: S.cash, kills: S.kills, envelopes: st.envelopes, chain: st.maxChain, time: Math.round(st.time) }, awards: [won ? { title: 'MADE MAN', detail: 'cleared Tuesday Collections' } : { title: 'WHACKED', detail: 'did not finish the street' }].concat(st.envelopes >= 3 ? [{ title: 'COLLECTOR', detail: 'all three envelopes' }] : []) });
}
function hubInit() {
  if (!AH || !AH.active) return Promise.resolve(false);
  return AH.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
    if (!info) return false;
    hub.active = true; hub.info = info; for (const p of info.players || []) hub.names[p.id] = p;
    AH.on('message', (d, from) => { if (d && d.k === 'p' && from !== info.me) { const p = hub.names[from] || {}; PLAY.ghost(from, { x: d.x, y: d.y, z: d.z, f: d.f, name: p.name || 'P' + (from + 1), color: p.color || '#3b82f6' }); } });
    AH.on('time-up', () => { hub.timeUp = true; hubDone(false); });
    AH.on('end', () => { hub.ended = true; game.audio.musicVolume = 0; game.audio.sfxVolume = 0; try { game.audio.applyVolume(); music(null); } catch (e) { /* nothing */ } });
    AH.on('leave', () => {});
    return true;
  }).catch(() => false);
}

/* ---- THE TITLE: the cast on a ledge under a New Jersey night, the ducks leaving ---- */
const MID = 480, stage = new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 }, types: { 1: { style: 'stone', side: '#4a3a52', moss: '#3a5a3a' } }, edges: 'open' });
const titleBg = new E.Backdrop({ sky: ['#06060e', '#0e1020', '#1c1a38', '#3a2646', '#6a3a5a'], stars: 40, starsY: .5, moon: { x: .22, y: .22, r: 14, color: '#e8e0d0' },
  layers: [{ kind: 'city', color: '#241a38', y: .62, height: .3, parallax: .04, windows: '#ffc070' }, { kind: 'city', color: '#150f24', y: .7, height: .25, parallax: .1, windows: '#ffe08a', seed: 4 }, { kind: 'fog', color: '#4a3a62', y: .92, height: .1, parallax: 0, drift: 4 }] });
const LINEUP = [['connie', 0, 2.0], ['doc', 0, 2.0], ['vic', 0, 2.3], ['sal', Math.PI, 2.2], ['chris', Math.PI, 2.1], ['dino', Math.PI, 2.7]].map(([id, face], i) => ({ id, face, rig: rig(id), x: MID + 62 + (i - 2.5) * 30 }));
const DUCKS = Array.from({ length: 5 }, (_, i) => ({ x: MID + 190 + i * 14, i }));
let titleMenu = null, tIdle = 0, touchMode = false, loopDemo = 0;
const hasSave = () => { try { return !!game.saves.latest(); } catch (e) { return false; } };
function buildTitleMenu() {
  const items = touchMode ? ['SETTINGS'] : [{ label: 'NEW GAME' }, { label: 'CONTINUE', disabled: !hasSave() }, { label: 'SETTINGS' }, { label: 'CONTROLS' }, { label: 'ABOUT AND CREDITS' }];
  titleMenu = new E.Menu(game, items, { y: 82, onPick: i => { const label = items[i].label || items[i];
    if (label === 'NEW GAME') { sfx('confirm'); beginRun(false); } else if (label === 'CONTINUE') { sfx('confirm'); const l = game.saves.latest(); l && game.saves.load(l.slot === undefined ? 'auto' : l.slot); }
    else if (label === 'SETTINGS') game.menu('settings'); else if (label === 'CONTROLS') game.menu('controls'); else game.go('credits', { after: 'title' }); } });
}
const ABOUTS = ['A BEAT-EM-UP WITH SIT-DOWNS', 'COLLECT THE ENVELOPES. KEEP A LID ON IT.', 'SEE THE THERAPIST. FEED THE DUCKS.', 'IT IS A STORY ABOUT A GUY WHO CAN NOT QUIT'];
scenes.title = {
  view: 'side', views: ['side', 'brawler'], input: INPUT, res: 'ps1',
  enter() { music('title'); game.resetCamera(); game.follow(null); game.cam.room = null; game.cam.bounds = null; L.enabled = false; game.weather = null; touchMode = touchOnly(); buildTitleMenu(); act.at = game.real; if (loopDemo) { act.at = game.real - 8; loopDemo = 0; } demoRun = false; S = blank(); },
  update(dt) {
    common();
    if (!titleMenu.update(dt)) { const P = game.players; if (P.some(I => I.pressed('start'))) { P.forEach(I => I.consumeAll()); titleMenu.onPick(titleMenu.i, titleMenu.items[titleMenu.i]); } }
    if (game.real - act.at > 10 && !game.paused) return startDemo();
    game.focus(MID, 0, 32 + (game.H / 2 - 42) / -game.view.bz);
    const t = game.time;
    LINEUP.forEach((h, i) => { const u = (t * .45 + i * .37) % 3, swing = u < .5 ? { spec: { a0: 1.4, a1: -1.6, z0: 12, z1: 8, reach: 7.5 }, phase: u < .15 ? 'wind' : 'active', u: u < .15 ? u / .15 : (u - .15) / .35 } : null;
      h.rig.update(dt, { x: h.x, y: 0, z: 32, facing: h.face, vx: 0, vy: 0, attack: i === 2 || i === 5 ? swing : null, pose: i === 0 ? 'hips' : i === 3 ? 'cast' : null }); });
    for (const d of DUCKS) d.x += dt * 5;
    if (DUCKS[0].x > MID + 420) DUCKS.forEach((d, i) => { d.x = MID + 190 + i * 14; });
  },
  draw(r) {
    const top = r.W / 2 + 132 > r.W - 170 ? 40 : 0; titleMenu.y = 86 + top; titleMenu.x = touchMode ? 'center' : 18;
    titleBg.draw(r); stage.draw(r);
    for (const x of [MID - 100, MID + 100]) r.prop('streetlamp', x, 0, 32, { size: 1.2, light: false });
    r.prop('hydrant', MID - 156, -4, 32, { size: 1.3 }); r.prop('trashcan', MID + 140, -4, 32, { size: 1.3 }); r.prop('barrel', MID - 210, -4, 32, { size: 1.2 });
    for (const h of LINEUP) { r.shadow(h.x, 0, 10, .4, undefined, 32); r.actor(h.x, 0, 32, (g, ox, oy) => h.rig.draw(g, ox, oy, r.view)); }
    for (const d of DUCKS) { const [sx, sy] = r.w(d.x, 6, 32); r.queue(d.x, 6, 32, g => px.sprite(g, DUCK, Math.round(sx) - 12, Math.round(sy) - 16 + Math.round(Math.sin(game.time * 6 + d.i) * 1), false)); }
    r.overlay(g => {
      E.font.title(g, 'THE SOPRANOS', r.W / 2, 8 + top / 3, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 });
      E.font.title(g, 'OH, COME ON', r.W / 2, 34 + top / 3, { align: 'center', scale: 2, colors: ['#ffffff', '#ffd0d0', '#ff7a6a', '#c8202a'], depth: 2 });
      E.font.text(g, titleMenu.items.length > 1 ? ABOUTS[Math.floor(game.real / 4) % ABOUTS.length] : '', r.W / 2, r.H - 14, '#ffe7a8', TXC);
      if (touchMode) { E.ui.box(g, r.W / 2 - 130, r.H / 2 - 16, 260, 38, WIN); E.font.text(g, 'Controller or keyboard required', r.W / 2, r.H / 2 - 8, '#ffffff', TXC); E.font.text(g, 'Attract mode starts in a moment.', r.W / 2, r.H / 2 + 8, '#b8b0d8', TXC); }
    });
    titleMenu.draw(r);
    const dev = game.input.lastDevice, how = dev === 'gamepad' ? 'D-pad / stick + ' + game.input.label('confirm') + '    ' + game.input.label('start') + ' menu' : 'Arrows or WASD + Enter, or click';
    if (!touchMode) r.text(how, r.W / 2, r.H - 26, '#b8b0d8', { align: 'center', shadow: '#000', outline: false });
  }
};
/* attract mode: after 10 s of nothing. A bot plays a cheating game of every chapter in a row; any input ends it */
function startDemo() {
  demoRun = true; loopDemo = 1; demoAt = game.real; S = blank(); S.step = 1; S.cash = 450; S.up.hp = 1;
  game.input.consumeAll(); game.go('play', { level: 'street', demo: true });
}

/* ---- ABOUT AND CREDITS: the Source Information and the three feedback sections, paged ---- */
scenes.credits = (() => {
  let page = 0, scroll = 0, after = 'title', pages;
  const mk = () => [
    { h: 'THE SOPRANOS OH, COME ON', body: ['A spiritual successor to The Sopranos (1999-2007).', 'You are Vic Marinara, a boss with a bad chest, a worse kitchen and a therapist. Collect the Tuesday envelopes, keep the stress down, feed the ducks, and do not look up when the bell on the door rings.', '', 'Keys: WASD / arrows move, J or left click punch, K or right click kick, Space jump, L rage, E talk / collect / feed, V camera view. Pad: stick or d-pad, Square punch, Circle kick, Cross jump, R1 rage, Triangle talk, R3 view.', '', 'Online: AI Hub sessions (ghost mode, 1-4 players), each in their own copy of Tuesday Collections.', '', 'Build ' + BUILD + '. Engine: my-3D2dge ' + E.version + '.'] },
    { h: 'SOURCE INFORMATION', body: Object.entries(ABOUT.sourceInformation).map(([k, v]) => k.replace(/([A-Z])/g, ' $1').toUpperCase() + ': ' + v) },
    { h: 'TESTING FEEDBACK', body: ABOUT.testingQ.map((q, i) => q + '\n  ' + ABOUT.testingFeedback[i]) },
    { h: 'ENGINE FEEDBACK', body: ABOUT.engineQ.map((q, i) => q + '\n  ' + ABOUT.engineFeedback[i]) },
    { h: 'PROMPT FEEDBACK', body: ABOUT.promptQ.map((q, i) => q + '\n  ' + ABOUT.promptFeedback[i]) },
    { h: 'THE END, SORT OF', body: ['Written, coded, tuned and tested by Claude (claude-sonnet-5-5, medium effort) on my-3D2dge.', 'Music, effects and the gibberish voices are all made in code at run time. No samples were harmed; no ducks were harmed.', '', 'Any resemblance to persons living, dead, or on a pork store payroll is a coincidence. Thanks for playing.'] }];
  const lines = (W) => { const out = []; for (const p of pages) { const L = []; for (const para of p.body) for (const l of String(para).split('\n')) L.push(...(l === '' ? [''] : E.font.wrap(l, W - 24, { font: 'normal' }))); out.push(L); } return out; };
  let wrapped = null;
  return { view: 'side', input: INPUT, res: 'ps1',
    enter(d) { after = (d && d.after) || 'title'; page = 0; scroll = 0; pages = mk(); wrapped = null; music('home'); game.follow(null); game.focus(0, 0, 0); L.enabled = false; game.weather = null; game.cam.bounds = null; },
    update(dt) { common(); const I = game.input;
      if (I.pressed('right') || I.pressed('confirm')) { if (page < pages.length - 1) { page++; scroll = 0; sfx('select'); } else game.go(after); }
      if (I.pressed('left') && page > 0) { page--; scroll = 0; sfx('select'); }
      if (I.pressed('cancel')) game.go(after);
      if (I.down('down')) scroll += 120 * dt; if (I.down('up')) scroll -= 120 * dt; scroll = Math.max(0, scroll);
      const c = I.clicked(); if (c) { if (page < pages.length - 1) page++; else game.go(after); scroll = 0; } },
    draw(r) { r.sky(['#0a0814', '#1c1430', '#2a1c3c']); const W = r.W, H = r.H; if (!wrapped || wrapped.w !== W) wrapped = { w: W, l: lines(W) };
      r.overlay(g => { px.rect(g, 0, 0, W, H, '#0e0a18'); E.font.title(g, pages[page].h, W / 2, 8, { align: 'center', scale: 2, colors: ['#fff6d0', '#ffd060', '#e8782a'] });
        const L = wrapped.l[page], top = 34, vis = Math.floor((H - top - 22) / 10), maxS = Math.max(0, L.length - vis); scroll = Math.min(scroll, maxS * 10);
        const s0 = Math.floor(scroll / 10); for (let i = 0; i < vis; i++) { const l = L[s0 + i]; if (l !== undefined) E.font.text(g, l, 12, top + i * 10, l.startsWith('  ') ? '#c8c0e8' : '#ffe7c8', TXT); }
        if (maxS > 0) E.font.text(g, '↑ ↓  SCROLL', W - 10, H - 12, '#ffe7a8', TXR);
        E.font.text(g, (page + 1) + ' / ' + pages.length + '    ← →  PAGE    ' + game.input.label('cancel') + ' BACK', W / 2, H - 12, '#8a8ab0', TXC); }); } };
})();
