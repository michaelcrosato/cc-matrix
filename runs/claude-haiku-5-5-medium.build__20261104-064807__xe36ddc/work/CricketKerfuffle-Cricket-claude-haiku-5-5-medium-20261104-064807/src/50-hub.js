/* ---- AI HUB: a parallel Super Over (AI Hub Session Protocol v1). The copies share one seed: the six deliveries and the
 * batters' balls come from AIHub.rng('over') and AIHub.rng('deliveries'), so every copy faces the same balls whatever
 * the player does. The round sends a progress after each ball and one result. The card is the game's own. ---- */
G.HUB = { active: !!(globalThis.AIHub && globalThis.AIHub.active), info: null, card: null, cfg: null, started: false, resulted: false, ended: null, error: null, progressAt: 0, unsub: [] };
G.hubStart = () => {
  if (!G.HUB.active) return;
  const A = globalThis.AIHub;
  G.hubItemsOff();
  G.HUB.unsub.push(A.on('card', c => { G.HUB.card = c; }));
  G.HUB.unsub.push(A.on('start', () => { G.HUB.startAt = true; }));
  G.HUB.unsub.push(A.on('time-up', () => G.hubReportNow()));
  G.HUB.unsub.push(A.on('end', e => G.hubEnd(e)));
  A.connect({ mode: 'parallel', seats: [1, 4], card: true }).then(info => {
    if (!info) { G.HUB.active = false; G.hubItemsOn(); G.game.go('title'); return; }
    G.HUB.info = info;
    const over = A.rng('over'), del = A.rng('deliveries');
    const pool = ['express', 'outswing', 'inswing', 'legbreak', 'googly', 'bouncer', 'yorker', 'dobber', 'cutter', 'offbreak'];
    const machine = [];
    for (let i = 0; i < 6; i++) machine.push(pool[Math.floor(over() * pool.length)]);
    G.HUB.cfg = { teams: [0, 3], ground: 'green', overs: 1, wickets: 2, kerf: true, batFirst: 0, seed: Math.floor(info.seed % 100000) + 1,
      humanSides: [0], machine, deliveryRng: del, mode: 'hub', singleInnings: true };
    A.ready();
  }).catch(e => { G.HUB.error = String(e && e.message || e); });
};
G.hubItemsOff = () => { const mi = G.game.o && G.game.o.menu && G.game.o.menu.items; if (mi) mi.length = 0; };
G.hubItemsOn = () => { const mi = G.game.o && G.game.o.menu && G.game.o.menu.items; if (mi && !mi.length) mi.push(...G.pauseItems()); };
// the progress of the round, and its one result
G.hubProgress = m => {
  const I = m.I, s = I.runs;
  globalThis.AIHub.progress({ score: s, label: s + '/' + I.wkts + ' (' + I.legal + ' balls)' });
};
G.hubReportNow = () => {
  if (!G.HUB.active || G.HUB.resulted || !G.match) return;
  const m = G.match, I = m.innings[0];
  G.HUB.resulted = true;
  globalThis.AIHub.result({ score: I.runs, stats: { boundaries: m.stats.fours + m.stats.sixes, sixes: m.stats.sixes, wickets: I.wkts } });
};
G.hubRoundEnded = m => { G.hubReportNow(); G.game.go('hubwait'); };
G.hubEnd = e => {
  G.HUB.ended = e && e.reason || 'finished';
  G.hubFrozen = true;
  G.game.input.clear && G.game.input.clear();
  G.game.audio.stopMusic && G.game.audio.stopMusic(0.1);
  G.game.audio.mute && G.game.audio.mute(true);
  G.HUB.unsub.forEach(f => { try { f && f(); } catch (err) { /* the hub's remover is optional */ } });
};
// the card: the game's own, with its controls, the players and the time left
G.scenes.hubcard = {
  enter() { G.game.audio.music(G.SONG_TITLE); G.game.lights.enabled = false; },
  update(dt) {
    const I = G.game.input, A = globalThis.AIHub;
    if (G.hubFrozen) return;
    if (G.HUB.cfg && A) {
      if (A.time && A.time() >= 0 && !G.HUB.started) return G.hubBegin();
    }
    if (I.pressed('shot') || I.pressed('confirm')) { I.consumeAll(); A.answer('ready'); G.HUB.answered = 'ready'; }
    if (I.pressed('special')) { I.consumeAll(); A.answer('more'); }
    const click = I.clicked && I.clicked();
    if (click) {
      const [x, y] = click;
      if (x > G.game.W / 2 - 70 && x < G.game.W / 2 + 70 && y > G.game.H - 52 && y < G.game.H - 30) A.answer('ready');
      if (x > G.game.W / 2 - 70 && x < G.game.W / 2 + 70 && y > G.game.H - 28 && y < G.game.H - 14) A.answer('more');
    }
  },
  draw(r) {
    const c = G.HUB.card || {}, info = G.HUB.info;
    r.sky(['#2a2052', '#4a3a72']);
    r.overlay(g => {
      E.font.title(g, 'CRICKET KERFUFFLE', r.W / 2, 12, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, 'MOST RUNS FROM ONE OVER WINS', r.W / 2, 44, '#ffe08a', { align: 'center', outline: '#0b0814' });
      E.font.text(g, 'Six balls, two wickets, the same six balls for everyone.', r.W / 2, 58, '#e8e0f0', { align: 'center', font: 'tiny', outline: '#0b0814' });
      if (!info) E.font.text(g, G.HUB.error ? 'CONNECTION ERROR' : 'CONNECTING TO THE HUB...', r.W / 2, 90, '#ffffff', { align: 'center', outline: '#0b0814' });
      const colors = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
      (info ? info.players : []).forEach((p, k) => {
        const ready = c.ready && c.ready.indexOf(p.id) >= 0;
        E.font.text(g, (ready ? '* ' : '- ') + p.name, 20 + (k % 2) * 150, 80 + Math.floor(k / 2) * 14, colors[k % 4], { outline: '#0b0814' });
      });
      if (c.left !== undefined && c.left !== null) E.font.text(g, 'TIME LEFT ' + Math.ceil(c.left / 1000) + 'S', r.W / 2, 116, '#ffffff', { align: 'center', font: 'tiny', outline: '#0b0814' });
      if (c.paused) E.font.text(g, 'PAUSED: MOST PLAYERS WANT MORE TIME', r.W / 2, 128, '#ffd23a', { align: 'center', font: 'tiny', outline: '#0b0814' });
      if (c.starting) E.font.text(g, 'STARTING...', r.W / 2, 128, '#5fd38a', { align: 'center', outline: '#0b0814' });
      E.font.text(g, 'YOUR CONTROLS: ' + G.hubControls(), r.W / 2, r.H - 66, '#e8e0f0', { align: 'center', font: 'tiny', outline: '#0b0814' });
      px.rect(g, r.W / 2 - 70, r.H - 52, 140, 22, '#2f6b3a'); E.font.text(g, 'READY', r.W / 2, r.H - 46, '#ffffff', { align: 'center', outline: '#0b0814' });
      px.rect(g, r.W / 2 - 70, r.H - 28, 140, 14, '#2a2634'); E.font.text(g, 'MORE TIME', r.W / 2, r.H - 25, '#e8e0f0', { align: 'center', font: 'tiny', outline: '#0b0814' });
      G.promptRow(g, [['shot', 'READY'], ['special', 'MORE TIME']], 10, r.H - 10);
    });
  }
};
G.hubControls = () => [G.game.input.label('shot'), G.game.input.label('loft'), G.game.input.label('run')].join(' ') + ' - stick aims';
G.hubBegin = () => {
  G.HUB.started = true;
  G.startMatch(G.HUB.cfg, { hub: true, onUpdate: dt => {
    if (!G.match || G.hubFrozen) return;
    if (G.match.log.length !== G.HUB.lastLog) { G.HUB.lastLog = G.match.log.length; G.hubProgress(G.match); }
  } });
};
G.scenes.hubwait = {
  enter() { G.game.lights.enabled = false; },
  draw(r) {
    r.sky(['#2a2052', '#4a3a72']);
    r.overlay(g => {
      const endTxt = G.hubFrozen ? (G.HUB.ended === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'ROUND OVER') : 'WAITING FOR THE OTHERS...';
      E.font.title(g, endTxt, r.W / 2, r.H / 2 - 30, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      const m = G.match;
      if (m && m.innings[0]) E.font.text(g, 'Your score: ' + m.innings[0].runs + ' from one over', r.W / 2, r.H / 2 + 10, '#ffffff', { align: 'center', outline: '#0b0814' });
    });
  }
};
