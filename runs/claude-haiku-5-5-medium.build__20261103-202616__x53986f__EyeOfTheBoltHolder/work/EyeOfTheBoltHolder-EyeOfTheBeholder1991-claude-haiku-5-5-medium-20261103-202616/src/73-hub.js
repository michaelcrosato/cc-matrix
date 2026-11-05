/* ===== 73 hub · the AI Hub ghost race (PLAN §10.1): the Rat Run, 1 to 4 players in one session =====
 * The page's head connects (ghost mode, seats 1-4, the game's own card). In a session the game opens on its card, plays
 * the Rat Run from the hub's seed, sends its own player's position at 10 Hz (unreliable), reports progress about once a
 * second, reports a result once (a time, a finish or a wipe, or a score on time-up), and stops at `end`. No saves, no
 * Dev Mode, no dialogs; names come from the hub and are drawn as text, never as HTML. */
const HUB = { info: null, card: null, started: false, ended: false, sent: false, ghosts: new Map(), sendT: 0, progT: 0, cardT: 0 };
/** a session: the hub opened the page and connect() gave us our info */
const hubOn = () => !!(HUB.info && window.AIHub && AIHub.active);
/** the hub's events, once the connect has answered */
function hubInit(info) {
  HUB.info = info;
  AIHub.on('card', c => { HUB.card = c; });
  AIHub.on('start', () => { HUB.started = true; });
  AIHub.on('message', (d, from) => { if (d && d.t === 'g') HUB.ghosts.set(from, Object.assign({}, d, { at: Date.now() })); });
  AIHub.on('leave', ({ id }) => { HUB.ghosts.delete(id); });
  AIHub.on('time-up', () => hubReport('time-up'));
  AIHub.on('end', () => { HUB.ended = true; });
  HUB.route = true;   // the title's first frame sends us to the card (the boot may still be running)
}
/** the result, once: a time for a finish, a score for a wipe or time-up */
function hubReport(why) {
  if (!hubOn() || HUB.sent) return; HUB.sent = true;
  const R = B.sim.S.race;
  if (why === 'finished') AIHub.result({ time: Math.round(AIHub.time()), stats: { Kills: R.kills, Crowns: R.crowns } });
  else AIHub.result({ score: R.score });
}
/** per step in the race: the own position at 10 Hz, progress about once a second */
function hubRaceTick(dt) {
  if (!hubOn() || HUB.ended) return;
  const p = B.sim.S.party, R = B.sim.S.race;
  HUB.sendT -= dt; HUB.progT -= dt;
  if (HUB.sendT <= 0) { HUB.sendT = .1; AIHub.send({ t: 'g', area: 'race', cx: p.cx, cy: p.cy, dir: p.dir, cp: R.label, hp: partyList().filter(([m]) => m.state === 'ok').length }, { reliable: false }); }
  if (HUB.progT <= 0) { HUB.progT = 1; AIHub.progress({ score: R.score, label: R.label }); }
}
/** the card's scene: the title, the players in their seats and whether they are ready, the goal, the controls */
SC.scenes.hubcard = {
  view: 'iso', input: INPUT,
  enter() { if (!HUB.readySent) { HUB.readySent = true; AIHub.ready(); } musicTo('title'); },
  update(dt) {
    if (HUB.started) { game.go('race'); return; }
    if (game.input.pressed('confirm') || game.input.pressed('use') || game.input.pressed('start')) { game.input.consumeAll(); AIHub.answer('ready'); }
    if (game.input.pressed('party')) { game.input.consume('party'); AIHub.answer('more'); }
  },
  draw(r) {
    if (SC.stage) SC.stage.world.draw(r);
    r.overlay(g => {
      E.ui.box(g, 0, 0, r.W, r.H, { bg: ['#05030c', '#05030c'], alpha: .55 });
      E.font.title(g, 'THE RAT RUN', r.W / 2, 20, { align: 'center', scale: 2, colors: ['#fff6d8', '#ffd36a', '#c8923a'], depthColor: '#2a1a08' });
      TXT(g, 'Fastest party out of the Rat Run wins', r.W / 2, 46, '#f0e6d0', { align: 'center' });
      const c = HUB.card || {}, ready = c.ready || [];
      (HUB.info.players || []).forEach((pl, i) => { const on = ready.includes(pl.id); E.font.text(g, (on ? '✓ ' : '  ') + pl.name, r.W / 2, 70 + i * 12, pl.color || '#ffffff', { align: 'center', outline: false }); });
      TXT(g, c.left != null ? 'Starts in ' + Math.ceil(c.left / 1000) + 's' : (c.starting ? 'Starting…' : 'Waiting for the others'), r.W / 2, 130, '#ffe7a8', { align: 'center' });
      TXT(g, LBL('use') + ' Ready     ' + LBL('party') + ' More time', r.W / 2, r.H - 40, '#c8c0b0', { align: 'center' });
      TXT(g, 'Controls: W/S step, Q/E turn, F use, Space strike. Keys or pad.', r.W / 2, r.H - 26, '#8a8070', { align: 'center', font: 'tiny' });
    });
  }
};
/** the ghosts: the other players' cloaked characters, drawn at their reported cell while in the same area (never blocking) */
function hubDrawGhosts(g, r) {
  const w = VIEW.world; if (!w || !hubOn()) return;
  const now = Date.now();
  for (const [id, gh] of HUB.ghosts) {
    if (now - gh.at > 5000 || gh.area !== 'race') continue;
    const pl = (HUB.info.players || []).find(p => p.id === id); if (!pl) continue;
    const q = w.project(MID(gh.cx), MID(gh.cy), 26);
    if (q) TXT(g, pl.name.slice(0, 10), q[0], q[1], pl.color || '#ffffff', { align: 'center', font: 'tiny' });
  }
}
