/* MAD MEN OUT — the Pitch Gauntlet (solo, and the AI Hub's parallel round) and the Pitch-Off (two players on one
 * machine: Jack against Ruth, the same clients and the same hands, the client picks the better pitch).
 * AI Hub Session Protocol v1, parallel mode: every copy deals the same three clients and hands from AIHub.rng('deal'),
 * reports its billings with progress() after each pitch, result() once at the end (or at time-up), and stops on end. */
const GA = { mode: null, clients: [], hands: [], i: 0, total: [0, 0], results: [], turn: 0, rng: null, done: false, inter: [0, 0] };
const hubState = { info: null, started: false, ended: false, reported: false, ready: false, waitT: 0 };
const POOL_CLIENTS = ['gA', 'gB', 'gC', 'gD', 'gE', 'gF'], POOL_CARDS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12'];
function deal(rng) {
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clients = shuffle(POOL_CLIENTS).slice(0, 3);
  const hands = clients.map(() => shuffle(POOL_CARDS).slice(0, 5));
  return { clients, hands };
}
function startGauntlet(o) {
  GA.mode = o.mode; GA.rng = o.rng || E.rng(Math.floor(Math.random() * 1e9));
  const d = deal(GA.rng); GA.clients = d.clients; GA.hands = d.hands; GA.i = 0; GA.total = [0, 0]; GA.results = []; GA.turn = 0; GA.done = false; GA.inter = [0, 0];
  GA.players = o.players || [game.input];
  gaNext();
}
function gaCtx() {
  const p = GA.mode === 'versus' ? GA.turn : 0, I = GA.players[p] || game.input;
  return { mode: GA.mode === 'versus' ? 'versus' : 'gauntlet', client: GA.clients[GA.i], hand: GA.hands[GA.i], seconds: 25, composure: 70, haze: 0, input: I, rng: GA.rng,
    presenter: p === 1 ? 'ruth' : 'jack', rival: p === 1 ? 'jack' : 'ruth', label: GA.mode === 'versus' ? (p ? 'P2 RUTH' : 'P1 JACK') + '  ·  ACCOUNT ' + (GA.i + 1) + '/3' : 'ACCOUNT ' + (GA.i + 1) + '/3  ·  ' + money(GA.total[0]),
    color: p ? '#ff6a6a' : '#6aa0ff', onDone: gaDone };
}
function gaNext() {
  if (GA.i >= GA.clients.length) { gaFinish(); return; }
  const C = CLIENTS[GA.clients[GA.i]];
  const pl = GA.mode === 'versus' ? (GA.turn ? 'Player 2 (Ruth): ' : 'Player 1 (Jack): ') : '';
  playVignette({ sky: 'office', ambient: .8, music: 'pitch', actors: [], props: [], card: ['ACCOUNT ' + (GA.i + 1) + ' OF 3', pl + C.company, C.product], script: () => openBrainstorm(true, gaCtx()) });
}
function gaDone(v) {
  const p = GA.mode === 'versus' ? GA.turn : 0;
  GA.inter[p] = v.interest;
  if (GA.mode === 'versus' && GA.turn === 0) { GA.turn = 1; gaNext(); return; }
  if (GA.mode === 'versus') {   // the client takes the better pitch, if either reached the line
    const C = CLIENTS[GA.clients[GA.i]], a = GA.inter[0], b = GA.inter[1], best = a === b ? -1 : a > b ? 0 : 1;
    const winner = best >= 0 && GA.inter[best] >= C.need ? best : -1;
    if (winner >= 0) GA.total[winner] += Math.round(C.value * clamp(GA.inter[winner] / 100, .6, 1.25) / 1000) * 1000;
    GA.results.push({ company: C.company, a, b, winner });
    GA.turn = 0;
  } else {
    GA.total[0] += v.billings; GA.results.push({ company: CLIENTS[GA.clients[GA.i]].company, won: v.won, interest: v.interest, billings: v.billings });
    if (HUB && hubState.info && !hubState.ended) HUB.progress({ score: GA.total[0], label: money(GA.total[0]) + ' · ' + (GA.i + 1) + '/3' });
  }
  GA.i++; gaNext();
}
function gaFinish() {
  GA.done = true;
  if (HUB && hubState.info) hubReport();
  game.go('gaEnd', null, { fade: 'dissolve', seconds: .6 });
}
function hubReport() {
  if (!HUB || !hubState.info || hubState.reported) return;
  hubState.reported = true;
  HUB.result({ score: GA.total[0], stats: { Accounts: GA.results.filter(r => r.won).length + '/3', Billings: money(GA.total[0]) },
    awards: GA.results.filter(r => r.won && r.interest >= 100).map(r => ({ title: 'Standing ovation', detail: r.company })) });
}
const gaEndScene = {
  view: 'side', input: KEYS, res: 'ps1', touch: [],
  enter() { this.t = 0; music('evening'); game.follow(null); L.enabled = false; if (GA.mode === 'versus') game.allowJoin(false); },
  update(dt) {
    this.t += dt; vgFocus();
    if (HUB) return;   // in a session the hub shows the results and ends the round
    if (this.t > 1.5 && (game.input.pressed('confirm') || game.input.pressed('start') || game.input.clicked())) { game.input.consumeAll(); game.go('title'); }
  },
  draw(r) {
    SKY.manhattan.draw(r);
    r.overlay(g => {
      px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0806'));
      if (GA.mode === 'versus') {
        const w = GA.total[0] === GA.total[1] ? 'A DRAW' : GA.total[0] > GA.total[1] ? 'JACK WINS' : 'RUTH WINS';
        E.font.title(g, w, r.W / 2, 24, { align: 'center', scale: 3, colors: ['#fff6d8', '#e8c36a', '#8a5a20'], depth: 2 });
        txt(g, 'P1 Jack ' + money(GA.total[0]) + '     P2 Ruth ' + money(GA.total[1]), r.W / 2, 60, COL.ink, { align: 'center' });
        GA.results.forEach((x, i) => txt(g, x.company + ':  Jack ' + x.a + '  ·  Ruth ' + x.b + '  →  ' + (x.winner < 0 ? 'nobody' : x.winner ? 'Ruth' : 'Jack'), r.W / 2, 84 + i * 14, COL.dim, { align: 'center' }));
      } else {
        E.font.title(g, 'GAUNTLET OVER', r.W / 2, 24, { align: 'center', scale: 3, colors: ['#fff6d8', '#e8c36a', '#8a5a20'], depth: 2 });
        txt(g, 'Total billings ' + money(GA.total[0]), r.W / 2, 60, COL.gold, { align: 'center', scale: 1 });
        GA.results.forEach((x, i) => txt(g, x.company + ':  ' + (x.won ? 'won ' + money(x.billings) : 'lost') + '  (interest ' + x.interest + ')', r.W / 2, 84 + i * 14, x.won ? '#a8e0a8' : '#e0a8a0', { align: 'center' }));
      }
      if (!HUB && this.t > 1.5) txt(g, key('confirm') + ' back to the title', r.W / 2, r.H - 18, COL.ink, { align: 'center' });
      if (HUB) txt(g, 'Waiting for the other players...', r.W / 2, r.H - 18, COL.dim, { align: 'center' });
    });
  }
};

/* ---- PITCH-OFF: two players. A second controller's Start, or 2 on the keyboard (its right half), joins player 2;
 * with one controller the two take turns with it ---- */
const VS = { t: 0, joined: null };
function startVersus() { VS.t = 0; VS.joined = game.players[1] || null; game.go('vsJoin'); }
const vsJoinScene = {
  view: 'side', input: KEYS, res: 'ps1', touch: [],
  enter() { music('lounge'); game.follow(null); game.allowJoin({ max: 2, onJoin: (inp) => { VS.joined = inp; A.sfx('powerup'); } }); },
  update(dt) {
    VS.t += dt; vgFocus(); const I = game.input;
    if (VS.joined && VS.t > .5 && (I.pressed('confirm') || VS.joined.pressed('confirm'))) { I.consumeAll(); VS.joined.consumeAll(); startGauntlet({ mode: 'versus', players: [game.input, VS.joined] }); }
    else if (!VS.joined && I.pressed('pivot')) { I.consumeAll(); startGauntlet({ mode: 'versus', players: [game.input, game.input] }); }
    else if (I.pressed('cancel')) { game.allowJoin(false); game.go('title'); }
  },
  back() { game.allowJoin(false); game.go('title'); return true; },
  draw(r) {
    SKY.office.draw(r); stage.draw(r);
    r.actor(STAGE_MID - 40, 0, 32, (g, ox, oy) => rigOf('jack').draw(g, ox, oy, r.view)); r.actor(STAGE_MID + 40, 0, 32, (g, ox, oy) => rigOf('ruth').draw(g, ox, oy, r.view));
    rigOf('jack').update(1 / 60, { x: STAGE_MID - 40, y: 0, z: 32, facing: 0, pose: 'hips' }); rigOf('ruth').update(1 / 60, { x: STAGE_MID + 40, y: 0, z: 32, facing: Math.PI, pose: VS.joined ? 'cheer' : null });
    r.overlay(g => {
      E.font.title(g, 'PITCH-OFF', r.W / 2, 14, { align: 'center', scale: 3, colors: ['#fff6d8', '#e8c36a', '#8a5a20'], depth: 2 });
      txt(g, 'Jack against Ruth. Three clients, the same cards. The client signs the better pitch.', r.W / 2, 46, COL.ink, { align: 'center', wrap: r.W - 30 });
      panel(g, r.W / 2 - 150, 66, 300, 52, { alpha: .9 });
      txt(g, 'P1 JACK: ready', r.W / 2 - 140, 72, '#8ab8ff');
      txt(g, VS.joined ? 'P2 RUTH: joined (' + (VS.joined.device || VS.joined.lastDevice || 'ready') + ')' : 'P2 RUTH: press Start on a second controller, or 2 on the keyboard', r.W / 2 - 140, 84, VS.joined ? '#ff8a8a' : COL.dim, { wrap: 280 });
      txt(g, VS.joined ? key('confirm') + ' begin' : key('pivot') + ' share one controller and take turns', r.W / 2 - 140, 106, COL.gold);
      txt(g, key('cancel') + ' back', r.W / 2, r.H - 14, COL.dim, { align: 'center', font: 'tiny' });
    });
  }
};

/* ---- AI HUB: in a session the game opens straight into the round: connect, deal, ready(), play at time 0 ---- */
const hubWaitScene = {
  view: 'side', input: KEYS, res: 'ps1', touch: [],
  enter() { game.follow(null); L.enabled = false; },
  update(dt) {
    vgFocus(); hubState.waitT += dt;
    if (hubState.ended || !hubState.info) return;
    if (!hubState.started && HUB.time() >= 0) { hubState.started = true; startGauntlet({ mode: 'gauntlet', rng: HUB.rng('deal') }); }
  },
  draw(r) {
    SKY.manhattan.draw(r);
    r.overlay(g => {
      E.font.title(g, 'MAD MEN OUT', r.W / 2, 40, { align: 'center', scale: 3, colors: ['#fff8e8', '#e8c36a', '#a8742a'], depth: 2 });
      txt(g, 'THE PITCH GAUNTLET: three clients, three pitches. Most billings wins.', r.W / 2, 80, COL.ink, { align: 'center', wrap: r.W - 30 });
      const t = HUB && hubState.info ? HUB.time() : -Infinity;
      txt(g, !hubState.info ? 'Connecting to AI Hub...' : t === -Infinity ? 'Waiting for the round to start...' : t < 0 ? 'Starting in ' + Math.ceil(-t / 1000) + '...' : '', r.W / 2, 110, COL.gold, { align: 'center', scale: 2 });
    });
  }
};
function hubBoot() {
  HUB.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
    if (!info) { game.go('title'); return; }   // no hub after all: the game runs as it does on its own
    hubState.info = info;
    HUB.on('time-up', () => { if (!hubState.reported) hubReport(); });
    HUB.on('end', () => { hubState.ended = true; A.music(null); A.mute(true); game.input.clear(); talk.close(); });
    HUB.on('leave', () => {});
    hubState.ready = true; HUB.ready();
  }).catch(e => { game.fail('AI Hub connect', e); game.go('title'); });
}
