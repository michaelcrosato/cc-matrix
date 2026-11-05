/* ---- THE HUB'S ROUND (plan §15.2): the connect, our own card (the court at night, the crews lined up, the ready marks,
 * the countdown, how to win, this device's controls in its glyphs), the start on the hub's clock, the session overlay (no
 * pause: sound and voice volume and the button symbols), the end and the host-left void. ---- */
const hubConnect = async () => {
  if (!HUB) return null;
  const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
  if (!info) return null;
  S.net.seat = info.me; S.net.info = info;
  S.net.role = info.server ? 'host' : (info.isHost ? 'host' : 'client');
  S.net.isServer = !!info.server;
  hubBuild(info);
  S.hubCard = { left: null, ready: [], asking: 0, asked: false, starting: false, paused: false };
  AIHub.ready();
  return info;
};
/** the hub's events: the card, the start, the leave, the time-up and the end; a copy's input and snapshots come in messages */
if (typeof AIHub !== 'undefined' && AIHub) {
  AIHub.on && AIHub.on('card', c => { S.hubCard = Object.assign(S.hubCard || {}, { left: c.left, ready: c.ready || [], asking: c.asking || 0, asked: !!c.asked, starting: !!c.starting, paused: !!c.paused }); });
  AIHub.on && AIHub.on('start', () => { S.net.started = true; if (game.sceneName === 'hubcard') game.go('court', { hub: true }, { fade: 0 }); });
  AIHub.on && AIHub.on('message', (d, from) => hubMessage(d, from));
  AIHub.on && AIHub.on('leave', m => { const slot = S.net.slotOf[m.id]; if (slot !== undefined && S.players[slot]) { const p = S.players[slot]; p.human = false; p.brain = newBrain(p, 0); } });
  AIHub.on && AIHub.on('time-up', () => { if (S.net.role === 'host') hubFinish(); });
  AIHub.on && AIHub.on('end', m => { S.net.endReason = m.reason; S.net.ended = true; if (m.reason === 'host-left' || m.reason === 'void') S.net.hostLeft = true; if (S.match) { S.match.over = true; S.match.phase = 'over'; } S.net.stopAt = game.time; });
}
/** the hub card: a scene of the game (its own card, §15.2) */
scenes.hubcard = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'hubcard'; playSong('title'); },
  update() {
    const k = S.hubCard || {};
    if (game.players.some(I => I && I.pressed('confirm')) && AIHub && AIHub.answer) AIHub.answer('ready');   // Enter, cross, a tap: ready
    if (game.players.some(I => I && I.pressed('card')) && AIHub && AIHub.answer) AIHub.answer('more');   // T or triangle: more time
  },
  draw(r) {
    const k = S.hubCard || {}, info = S.net.info || { players: [] }, cs = COURTS[S.court] || COURTS.skybox;
    r.sky(cs.sky);
    r.overlay(g => {
      screenTitle(g, 'HUB SHOWDOWN', 'SHARED WORLD · TWO HALVES OF 1:30 · NO CHEATS', r.W);
      E.font.text(g, (S.teams[0] ? S.teams[0].name : '') + '   VS   ' + (S.teams[1] ? S.teams[1].name : ''), r.W / 2, r.H * .3, C.ink, { align: 'center', scale: 2, outline: false, shadow: '#000' });
      E.font.text(g, 'HOW TO WIN: ' + ((S.hubGoal) || 'OUTSCORE THE OTHER CREW OVER TWO HALVES'), r.W / 2, r.H * .4, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' });
      info.players.forEach((pl, i) => { const col = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] || C.ink; const ready = (k.ready || []).includes(i); E.font.text(g, (ready ? 'READY ' : '      ') + pl.name, r.W * .2 + (i % 2) * r.W * .3, r.H * .55 + Math.floor(i / 2) * 36, col, { scale: 2, outline: false, shadow: '#000' }); });
      if (k.left !== null && k.left !== undefined) E.font.text(g, k.paused ? 'PAUSED: SOMEONE WANTS MORE TIME' : 'STARTS IN ' + Math.ceil(k.left / 1000) + ' S', r.W / 2, r.H * .8, C.cyan, { align: 'center', scale: 2, outline: false, shadow: '#000' });
    });
    promptBar(r, [['{confirm}', 'READY'], ['{card}', 'MORE TIME']]);
  }
};
/** the session's countdown (3-2-1 from the hub's clock), drawn over the court until the time reaches zero */
const hubCountdown = r => {
  if (!HUB || !S.net.role) return;
  const t = AIHub.time ? AIHub.time() : 0;
  if (t < 0 && t > -3.5) { const n = Math.ceil(-t); r.overlay(g => E.font.title(g, String(n), r.W / 2, r.H * .4, { align: 'center', scale: 6, colors: ['#fffbe8', '#ffe08a'], depth: 4 })); }
};

/* the session overlay (§15.2): Esc or Options opens a small box over a round that does not stop the simulation: the sound
 * and voice volume, the button symbols and a close. No quit, restart or title. */
S.sessionOverlay = { open: false, list: null };
const sessionOverlayStep = () => {
  if (!HUB || !S.match) return;
  const o = S.sessionOverlay;
  if (!o.open && (game.input.pressed('pause') || game.input.pressed('cancel')) && !(game.input.down('card'))) { o.open = true; o.list = new FocusList([], { x: 0, y: 0, gap: 30, w: 360, onBack: () => { o.open = false; } }); return; }
  if (!o.open) return;
  const vol = () => Math.round((A.sfxVolume || 1) * 100);
  o.list.setItems([
    { label: 'SOUND ' + vol() + '%', on: () => { A.sfxVolume = ((A.sfxVolume || 1) * 100 - 25 + 0) / 100 < 0 ? 1 : ((A.sfxVolume || 1) * 100 + 25 > 100 ? 0 : (A.sfxVolume || 1) + .25); A.applyVolume && A.applyVolume(); } },
    { label: 'VOICE ' + Math.round((setting('voiceVol') ?? 1) * 100) + '%', on: () => { const v = Math.round(((setting('voiceVol') ?? 1) * 10 + 2.5) % 11) / 10; game.settings.set('voiceVol', v); } },
    { label: 'BUTTONS ' + padStyle().toUpperCase(), on: () => game.settings.set('buttons', setting('buttons') === 'Xbox' ? 'PlayStation' : 'Xbox') },
    { label: 'CLOSE', on: () => { o.open = false; } }
  ]);
  o.list.nav(0);
};
const sessionOverlayDraw = r => {
  const o = S.sessionOverlay; if (!HUB || !o.open || !o.list) return;
  r.overlay(g => { panel(g, r.W * .3, r.H * .3, r.W * .4, r.H * .32, { border: C.gold, alpha: .95 }); E.font.text(g, 'SESSION OPTIONS · THE ROUND GOES ON', r.W / 2, r.H * .33, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' }); });
  o.list.draw(r, { x: r.W * .34, y: r.H * .39, gap: 36, w: r.W * .32, scale: 2 });
};
