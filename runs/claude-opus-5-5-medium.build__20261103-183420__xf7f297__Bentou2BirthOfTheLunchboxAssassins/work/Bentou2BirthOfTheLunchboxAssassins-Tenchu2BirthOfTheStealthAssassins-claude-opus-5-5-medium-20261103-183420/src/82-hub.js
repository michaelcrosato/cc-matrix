/* 82-hub: AI Hub ghost mode (1-4 players, each in their own copy of "Night Delivery"; the others appear as shadow
 * ninja in their seat colors) with the game's own card, progress every second, one result, time-up and end; and its
 * standalone twin, the Shadow Trial, where your best run's ghost (a 10 Hz track) races you, with a local top-5 board. */
const SEAT = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
B.hub = { info: null, card: null, ended: false, sentResult: false, standings: null, names: [] };
B.trialScore = M => {
  const s = M.stats, tgt = !!Object.keys(M.flags).find(k => k.startsWith('target_')), esc = M.result === 'win';
  let sc = (tgt ? 2000 : 0) + (esc ? 1000 : 0) + 250 * s.silentCuts + 50 * Math.max(0, s.kills - s.silentCuts) - 500 * s.civiliansHarmed;
  sc += s.detections === 0 ? (esc ? 600 : 0) : -150 * s.detections;
  if (esc) sc += Math.min(1200, Math.max(0, Math.round(4 * (300 - M.t))));
  return Math.max(0, Math.round(sc));
};
const stateCode = h => h.dead ? 6 : h.action && h.action.name === 'silentCut' ? 5 : h.combo.busy ? 4 : h.dive ? 3 : h.swim ? 2 : h.crouch ? 1 : 0;
B.hubMissionStart = (M, d) => {
  M.ghosts = []; M.track = []; M.trackT = 0; M.sendT = 0; M.progT = 0; M.hubClock = 0;
  if (M.mode === 'trial') { const bd = B.trialBoard(); if (bd.ghost && bd.ghost.track && bd.ghost.track.length) M.ghosts.push({ id: 'best', track: bd.ghost.track, x: 0, y: 0, z: 0, f: 0, vis: true, color: '#f4f4f4', rig: B.RIGS.ghost('#f4f4f4'), replay: true }); }
  if (M.mode === 'hub') { B.hub.M = M; for (const gh of B.hub.pending || []) B.hubGhostMsg(gh[0], gh[1]); B.hub.pending = []; }
};
B.hubPlaying = M => { if (M.mode !== 'hub') return true; const AH = typeof window !== 'undefined' && window.AIHub; if (!AH || !AH.active) return true; return AH.time() >= 0 && !B.hub.ended; };
B.hubWait = (M, dt) => { const h = M.hero; if (h) h.rig.update(dt, h.rigState({})); B.game.focus(h.x, h.y, h.z + 18); for (const gh of M.ghosts) gh.rig.update(dt, { x: gh.x, y: gh.y, z: gh.z, vx: 0, vy: 0, facing: gh.f }); };
B.hubDrawWait = (r, M) => r.overlay(g => {
  const t = window.AIHub ? window.AIHub.time() : -Infinity, n = t === -Infinity ? null : Math.ceil(-t / 1000);
  if (B.hub.ended) return; px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000'));
  if (n !== null && n > 0) E.font.title(g, String(n), r.W / 2, Math.round(r.H * .35), { align: 'center', scale: 6, colors: ['#fff4d8', '#e8b04a', '#d8402a'], depth: 3 });
  else E.font.text(g, 'Waiting for the round...', r.W / 2, Math.round(r.H * .4), '#f4ead5', { align: 'center', outline: false, shadow: '#000' });
});
B.hubTick = (M, dt) => {
  const h = M.hero, AH = window.AIHub;
  if (M.mode === 'hub' && AH) M.hubClock = Math.max(0, AH.time() / 1000);
  // the ghost track (10 Hz): sent in a hub round, recorded in the trial
  M.sendT += dt; if (M.sendT >= .1) { M.sendT = 0; const msg = { t: 'g', a: 'delivery', x: Math.round(h.x), y: Math.round(h.y), z: Math.round(h.z), f: Math.round(h.facing * 100) / 100, s: stateCode(h), k: M.stats.kills };
    if (M.mode === 'hub' && AH && !B.hub.ended) AH.send(msg, { reliable: false }); else M.track.push([msg.x, msg.y, msg.z, msg.f, msg.s]); }
  if (M.mode === 'hub' && AH && !B.hub.ended && !B.hub.sentResult) { M.progT += dt; if (M.progT >= 1) { M.progT = 0; AH.progress({ score: B.trialScore(M), label: B.hubLabel(M) }); } }
  // ghosts: interpolate toward their latest sample, or replay the recorded track
  for (const gh of M.ghosts) {
    if (gh.replay) { const i = Math.min(gh.track.length - 1, Math.floor(M.t * 10)), p = gh.track[i]; if (p) { gh.tx = p[0]; gh.ty = p[1]; gh.tz = p[2]; gh.f = p[3]; gh.s = p[4]; } }
    const k = 1 - Math.pow(.002, dt); gh.x += ((gh.tx || gh.x) - gh.x) * k; gh.y += ((gh.ty || gh.y) - gh.y) * k; gh.z += ((gh.tz || gh.z) - gh.z) * k;
    gh.rig.update(dt, { x: gh.x, y: gh.y, z: gh.z, vx: ((gh.tx || gh.x) - gh.x) * 8, vy: ((gh.ty || gh.y) - gh.y) * 8, facing: gh.f || 0, crouch: gh.s === 1, down: gh.s === 6 ? 1 : gh.s === 2 || gh.s === 3 ? .6 : 0, attack: gh.s === 4 || gh.s === 5 ? E.move('slash', (M.t * 3) % 1) : null });
  }
};
B.hubLabel = M => { const s = M.stats; if (M.result === 'win') return 'Escaped ' + B.fmtTime(M.t); if (Object.keys(M.flags).some(k => k.startsWith('target_'))) return 'Target down'; return 'Cuts ' + s.silentCuts + (s.detections ? ' · Seen ' + s.detections : ' · Unseen'); };
B.hubAwards = M => { const s = M.stats, out = []; if (s.detections === 0) out.push({ title: 'Ghost of the Moon', detail: 'Never detected' }); if (s.silentCuts >= 5) out.push({ title: 'Silent Blade', detail: s.silentCuts + ' Silent Cuts' }); if (s.kills <= 1 && M.result === 'win') out.push({ title: 'Fed by All', detail: 'No kills but the target' }); return out.slice(0, 3); };
B.hubResult = M => {
  const AH = window.AIHub; if (!AH || B.hub.sentResult) return; B.hub.sentResult = true;
  const sc = B.trialScore(M), rank = B.rankOf(sc * .9);
  AH.result({ score: sc, stats: { 'Silent cuts': M.stats.silentCuts, Detected: M.stats.detections, Time: B.fmtTime(M.t), Rank: rank }, awards: B.hubAwards(M) });
  AH.send({ t: 'done', score: sc }, { reliable: true });
};
B.hubFinish = M => {
  if (M.mode === 'hub') { B.hubResult(M); return; }
  // the Shadow Trial: the board and the best ghost
  const sc = B.trialScore(M), bd = B.trialBoard(), entry = { score: sc, rank: B.rankOf(sc * .9), character: get('character', M.charId).name || 'Sojiro', date: new Date().toISOString().slice(0, 10), escaped: M.result === 'win' };
  bd.top.push(entry); bd.top.sort((a, b) => b.score - a.score); bd.top = bd.top.slice(0, 5);
  if (M.result === 'win' && (!bd.ghost || sc > bd.ghost.score)) bd.ghost = { score: sc, track: M.track.slice(0, 3600) };
  E.store.set('bentou:trial', bd); B.game.go('trialBoard', { entry, M, d: M.scene.d });
};
B.hubGhostMsg = (data, from) => {
  const M = B.hub.M; if (!M || !data) return;
  let gh = M.ghosts.find(q => q.id === from);
  if (data.t === 'g') {
    if (!gh) { const info = B.hub.info, p = info && info.players.find(q => q.id === from), col = p ? p.color || SEAT[from % 4] : SEAT[from % 4]; gh = { id: from, x: data.x, y: data.y, z: data.z, f: data.f, vis: true, color: col, rig: B.RIGS.ghost(col), name: p ? p.name : 'P' + (from + 1) }; M.ghosts.push(gh); }
    gh.tx = data.x; gh.ty = data.y; gh.tz = data.z; gh.f = data.f; gh.s = data.s; gh.vis = data.a === 'delivery';
  } else if (data.t === 'done' && gh) gh.done = data.score;
};
B.hubDraw = (r, M) => {
  r.overlay(g => {
    if (B.hub.ended) { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000')); E.font.title(g, 'ROUND OVER', r.W / 2, Math.round(r.H * .2), { align: 'center', scale: 3, colors: ['#fff4d8', '#e8b04a'], depth: 2 }); }
    else if (M.mode === 'trial' && M.ghosts.length) E.font.text(g, 'Your best run races you (white)', r.W / 2, r.H - 8, '#c8c8c8', { align: 'center', outline: false, font: 'tiny' });
  });
  B.hubNames(r, M);
};
/* names over the ghosts, and the standings at the end, in DOM (textContent only) */
B.hubNames = (r, M) => {
  if (HEADLESS || M.mode !== 'hub') return; const root = B.hub.dom || (B.hub.dom = (() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:15;font:600 13px system-ui;color:#fff;text-shadow:0 1px 2px #000'; document.body.appendChild(d); return d; })());
  const want = B.hub.ended ? [] : M.ghosts.filter(gh => gh.vis && gh.name);
  while (root.children.length < want.length + 1) root.appendChild(document.createElement('div'));
  [...root.children].forEach((el, i) => { const gh = want[i]; if (i === root.children.length - 1 && B.hub.ended && B.hub.standings) { el.style.cssText = 'position:absolute;left:50%;top:38%;transform:translateX(-50%);font:600 20px system-ui;text-align:center;white-space:pre'; el.textContent = B.hub.standings; return; } if (!gh) { el.textContent = ''; return; } const s = r.w(gh.x, gh.y, gh.z + 50); el.style.cssText = 'position:absolute;transform:translate(-50%,-100%);color:' + gh.color + ';left:' + (s[0] / r.W * 100) + 'vw;top:' + (s[1] / r.H * 100) + 'vh'; el.textContent = gh.name; });
};
/* ---- the hub's card: the rooftop at night, the players lined up in seat colors, ready ticks, the goal, the controls ---- */
const cardRigs = [0, 1, 2, 3].map(i => B.RIGS.ghost(SEAT[i]));
B.scenes.hubCard = Object.assign({}, MENU_SCENE, {
  enter() { this.t = 0; B.game.follow(null); B.game.lights.enabled = false; B.game.weather = null; B.music.play('title'); this.dom = null; },
  exit() { if (this.dom) { this.dom.remove(); this.dom = null; } },
  update(dt) {
    const G = B.game, I = G.input, AH = window.AIHub; this.t += dt;
    if (AH && B.hub.info) { if (I.pressed('start') || I.pressed('jump') || I.pressed('confirm')) AH.answer('ready'); if (I.pressed('interact') || I.pressed('objectives')) AH.answer('more'); }
    const n = B.hub.info ? B.hub.info.players.length : 1;
    for (let i = 0; i < n; i++) cardRigs[i].update(dt, { x: MIDX - (n - 1) * 18 + i * 36, y: 0, z: 32, vx: 0, vy: 0, facing: i % 2 ? Math.PI : 0, stance: (this.card() || {}).ready && this.card().ready.includes(i) ? 'ready' : null });
    G.focus(MIDX, 0, 32 + (G.H / 2 - 46) / -G.view.bz);
  },
  card() { return B.hub.card; },
  draw(r) {
    titleBg.draw(r); ridge.draw(r); const info = B.hub.info, n = info ? info.players.length : 1;
    for (let i = 0; i < n; i++) r.actor(cardRigs[i].x, 0, 32, (g, ox, oy) => cardRigs[i].draw(g, ox, oy, r.view));
    const c = this.card() || {};
    r.overlay(g => {
      E.font.title(g, 'BENTOU 2', r.W / 2, 10, { align: 'center', scale: 3, colors: ['#fff4d8', '#e8b04a', '#d8402a'], depth: 2 });
      E.font.text(g, 'NIGHT DELIVERY  -  ghost race, 1 to 4 ninja', r.W / 2, 38, '#f4ead5', { align: 'center', outline: false, shadow: '#000' });
      E.font.text(g, 'Silence Broker Sakubei, escape by the canal gate.', r.W / 2, 50, '#e8b04a', { align: 'center', outline: false, shadow: '#000' });
      E.font.text(g, 'Silent Cuts, unseen and fast score most.', r.W / 2, 60, '#c8b8a0', { align: 'center', outline: false, shadow: '#000' });
      B.rich(g, '{a:jump} jump  {a:crouch} crouch  {a:attack} strike / cut  {a:grapple} hook  {a:useTool} tool  {a:block} block', r.W / 2, 74, '#f4ead5', { align: 'center' });
      const left = c.left === null || c.left === undefined ? (c.paused ? 'Paused: more time asked' : c.starting ? 'Starting...' : '') : Math.ceil(c.left / 1000) + ' s';
      E.font.text(g, left, r.W / 2, 90, '#f4ead5', { align: 'center', outline: false, shadow: '#000', scale: 2 });
      B.rich(g, '{a:confirm} Ready      {a:interact} or M: more time' + (c.asked ? ' (asked)' : ''), r.W / 2, r.H - 16, '#b8a890', { align: 'center' });
    });
    if (!HEADLESS && info) {
      if (!this.dom) { this.dom = document.createElement('div'); this.dom.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:15;font:600 16px system-ui;text-shadow:0 1px 2px #000'; document.body.appendChild(this.dom); }
      while (this.dom.children.length < n) this.dom.appendChild(document.createElement('div'));
      [...this.dom.children].forEach((el, i) => { const p = info.players[i]; if (!p) { el.textContent = ''; return; } const s = r.w(cardRigs[i].x, 0, 32 - 6); el.style.cssText = 'position:absolute;transform:translate(-50%,0);color:' + (p.color || SEAT[i]) + ';left:' + (s[0] / r.W * 100) + 'vw;top:' + (s[1] / r.H * 100) + 'vh'; el.textContent = p.name + ((c.ready || []).includes(p.id) ? ' ✓' : ''); });
    }
  }
});
B.hubBoot = () => {
  const AH = window.AIHub, G = B.game;
  AH.on('card', c => { B.hub.card = c; });
  AH.on('start', () => { const info = B.hub.info, me = info ? info.me : 0; G.go('mission', { mode: 'hub', missionId: 'delivery', levelId: 'delivery', character: me % 2 ? 'kaede' : 'sojiro', loadout: get('mission', 'delivery').loadoutHint }, { fade: 0 }); });
  AH.on('message', (data, from) => { if (B.hub.M && G.sceneName === 'mission') B.hubGhostMsg(data, from); else (B.hub.pending = B.hub.pending || []).push([data, from]); });
  AH.on('leave', ({ id }) => { const M = B.hub.M; if (M) M.ghosts = M.ghosts.filter(q => q.id !== id); });
  AH.on('time-up', () => { const M = B.hub.M; if (M) B.hubResult(M); else { B.hub.sentResult = true; AH.result({ score: 0 }); } });
  AH.on('end', e => { B.hub.ended = true; A.music(null); A.mute(true); G.input.clear(); const info = B.hub.info; if (e && e.standings && info) B.hub.standings = 'Round over\n' + e.standings.map((grp, i) => (i + 1) + '. ' + grp.map(id => (info.players.find(p => p.id === id) || { name: 'P' + (id + 1) }).name).join(', ')).join('\n'); else B.hub.standings = 'Round over'; });
  G.go('hubCard', {}, { fade: 0 });
  AH.connect({ mode: 'ghost', seats: [1, 4], card: true }).then(info => {
    if (!info) { B.HUB = false; G.o.menu.quit = 'title'; G.go('title'); return; }
    B.hub.info = info; AH.ready();
  }).catch(e => { try { AH.fail('The game could not start: ' + (e && e.message || e)); } catch (err) { G.fail('hub', err); } });
};
/* ---- the Shadow Trial's board ---- */
B.scenes.trialBoard = Object.assign({}, MENU_SCENE, {
  enter(d) { this.d = d; this.t = 0; B.music.play('results'); this.menu = new E.Menu(B.game, ['Run again', 'Title'], { y: 0, onPick: i => i ? B.game.go('title') : B.game.go('mission', this.d.d) }); },
  update(dt) { this.t += dt; if (this.t > 1) this.menu.update(dt); },
  draw(r) {
    r.sky(['#05060f', '#141838', '#2a2450']);
    r.overlay(g => {
      E.font.title(g, 'SHADOW TRIAL', r.W / 2, 10, { align: 'center', scale: 2, colors: ['#fff4d8', '#e8b04a'], depth: 1 });
      const e = this.d.entry; E.font.text(g, (e.escaped ? 'Escaped' : 'Fallen') + '   score ' + e.score + '   ' + e.rank, r.W / 2, 34, '#f4ead5', { align: 'center', outline: false });
      const bd = B.trialBoard(); bd.top.forEach((q, i) => { const y = 56 + i * 14, me = q === e || (q.score === e.score && q.date === e.date); E.font.text(g, (i + 1) + '.  ' + q.score + '   ' + q.rank + '   ' + q.character + '   ' + q.date, r.W / 2, y, me ? '#e8b04a' : '#c8b8a0', { align: 'center', outline: false }); });
    });
    this.menu.y = r.H - 40; if (this.t > 1) this.menu.draw(r);
  }
});
