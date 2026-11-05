// The modes' flows: campaign races and their results, puzzles, Survival gauntlets, hot seat cups, split screen,
// replays, the story's beats and the coppers they pay.
import { TRACKS, PUZZLES, ENV_ORDER, ENV_INFO, RIVALS, RANKS } from './data.js';
import { medalFor, medalTimes, makeCast } from './app.js';
import { botRun, fmt } from './run.js';
import { Recorder } from './ghost.js';
import { defaultPaint } from './view.js';
import { CFG } from './config.js';
import { STINGS } from './audio.js';
import { strHash, rng } from './v3.js';
import { Focus, text, tw, big, promptBar, COL } from './ui.js';

const E = globalThis.My3D2dge;
const QUIPS = ['The clock wins this round. Again?', 'Bronze. The colour of honest effort.', 'Silver! Almost shiny enough.', 'Gold. Coco approves.', 'You beat my own time. Rude. Magnificent.'];
const PLAYER_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700', '#c85ae8', '#2ad8c8', '#ff8ad8', '#f4f4f4'];

export class Modes {
  constructor(app) { this.app = app; this.cocoGhosts = {}; }
  get game() { return this.app.game; }
  get P() { return this.app.profile; }
  paint(carId) { return this.P.data.paint[carId] || defaultPaint(carId); }
  say(lines, o) { this.app.dialog.say(lines, o); }
  beat(key, lines, o) { if (this.P.seen(key)) { if (o && o.onDone) o.onDone(); return false; } this.P.see(key); this.say(lines, o); return true; }
  toMenu(page = 'main', data) { this.game.go('front', { page, data }); }
  firstBoot() {
    this.app.front.go('main');
    this.beat('welcome', [['coco', 'Bonjour! I am Coco Asphalte. I build tracks.', 'wave'], ['coco', 'You drive them. Fast. Then faster.'], ['coco', 'Beat my clock and I pay you in coppers. Allez!', 'cheer']]);
  }
  /** Coco's ghost: the author run recorded (made on demand, kept) */
  cocoGhost(id) {
    if (this.cocoGhosts[id]) return this.cocoGhosts[id];
    const t = this.app.track(id), P = this.app.prepare(t, id), r = botRun(P.course, ENV_INFO[t.env].car, { skill: 1, record: () => new Recorder() });
    return (this.cocoGhosts[id] = r.ghost ? r.ghost.toGhost({ steps: r.steps }) : null);
  }
  // ---- campaign ----
  campaign(id) {
    const app = this.app, t = app.track(id), env = t.env, car = ENV_INFO[env].car, rec = this.P.rec(id), M = app.medals(id);
    const ghosts = [];
    if (this.game.settings.myGhost !== false && rec.ghost) ghosts.push({ ghost: rec.ghost, carId: car, paint: this.paint(car), tint: '#d8e8ff', name: 'BEST' });
    if (this.game.settings.cocoGhost) { const cg = this.cocoGhost(id); if (cg) ghosts.push({ ghost: cg, carId: car, paint: defaultPaint(car), tint: '#ffd890', name: 'COCO' }); }
    const prog = app.trackProg(id);
    this.game.go('race', {
      mode: 'campaign', track: t, prepared: app.prepare(t, id), medals: M, subtitle: ENV_INFO[env].name + ' • ' + prog.teaches.toUpperCase(), ghosts,
      players: [{ name: this.P.data.name, carId: car, paint: this.paint(car), best: rec.best, bestSplits: rec.splits }],
      onEnter: S => this.tips(id, S), onCp: (Pl, e) => this.tipCp(id, Pl),
      onFinish: (Pl, R) => { Pl.newBest = rec.best === null || R.finishSteps < rec.best; },
      onDone: S => this.campaignDone(id, S)
    });
  }
  tips(id, S) {
    if (this.game.settings.hints === false) return;
    const I = this.game.input, L = a => I.label(a) || a;
    if (id === 'D1' && !this.P.seen('tipD1')) { this.P.see('tipD1'); this.say([['coco', 'Hold ' + L('gas') + ' to go. Steer with ' + (I.lastDevice === 'gamepad' ? 'the left stick' : L('left') + '/' + L('right')) + '.']], { modal: false, auto: 4 }); }
    if (id === 'D2' && !this.P.seen('tipD2')) { this.P.see('tipD2'); this.say([['coco', 'Jumps need speed. The canyon does not negotiate.']], { modal: false, auto: 4 }); }
    if (id === 'D3' && !this.P.seen('tipD3')) { this.P.see('tipD3'); this.say([['coco', 'Loops love speed. Keep your foot down.']], { modal: false, auto: 4 }); }
  }
  tipCp(id, Pl) {
    if (id === 'D1' && !this.P.seen('tipCp') && this.game.settings.hints !== false) { this.P.see('tipCp'); const I = this.game.input; this.say([['coco', 'Checkpoints remember you. ' + (I.label('respawn') || 'Respawn') + ' puts you back there.'], ['coco', (I.label('restart') || 'Restart') + ' starts again. Nobody is watching. Except the clock.']], { modal: false, auto: 3.5 }); }
  }
  campaignDone(id, S) {
    const app = this.app, Pl = S.players[0], R = Pl.run, M = app.medals(id), t = S.prep.track, env = t.env;
    const steps = R.finishSteps, medal = medalFor(steps, M), before = { envs: ENV_ORDER.map(e => this.P.envOpen(e)), puzz: ENV_ORDER.map(e => this.P.puzzlesOpen(e)), surv: ENV_ORDER.map(e => this.P.survivalOpen(e)), golds: this.P.totalGolds(), cracked: ENV_ORDER.map(e => this.P.goldsIn(e) === 5) };
    const rec = this.P.rec(id), prevBest = rec.best;
    const ghost = Pl.rec.toGhost({ steps });
    const res = this.P.finish(id, steps, medal, R.splits, ghost.data && ghost, 'race', env);
    if (medal) this.game.audio.sting(STINGS[['', 'bronze', 'silver', 'gold', 'author'][medal]], { at: 'now' });
    const list = TRACKS.filter(x => x.env === env), idx = list.findIndex(x => x.id === id), nextT = list[idx + 1];
    const cur = Math.max(medal, res.medal), nm = Math.min(4, cur + 1);
    const replayData = { trackId: id, trackName: t.name, car: Pl.carId, paint: Pl.paint, steps, splits: R.splits.slice(), ghost: ghost.data, date: new Date().toISOString().slice(0, 10) };
    this.lastReplay = replayData;
    const data = {
      title: t.name, steps, best: res.newBest ? steps : prevBest, delta: prevBest == null ? null : steps - prevBest, medal, paid: res.paid,
      nextTarget: cur < 4 ? 'NEXT: ' + ['', 'BRONZE', 'SILVER', 'GOLD', "COCO'S TIME"][nm] + ' ' + fmt([0, M.bronze, M.silver, M.gold, M.author][nm]) : 'EVERY MEDAL WON',
      quip: QUIPS[medal], retry: () => this.campaign(id), next: nextT && this.P.trackOpen(nextT.id) ? () => this.campaign(nextT.id) : null,
      replay: () => this.replay(replayData, () => this.toMenu('results', data)), saveReplay: () => this.saveReplay(replayData), menu: () => this.toMenu('tracks', { env })
    };
    this.toMenu('results', data);
    this.app.front.reset('results', data); this.app.front.F.focus(data.next ? 'next' : 'retry');
    // story beats
    const beats = [];
    if (medal && !this.P.seen('firstMedal')) { this.P.see('firstMedal'); beats.push(['coco', 'A medal! I knew you were not just a passenger.', 'cheer']); }
    ENV_ORDER.forEach((e, i) => {
      if (!before.envs[i] && this.P.envOpen(e)) beats.push(...(e === 'hedgerow' ? [['coco', 'A farmer called. He wants a race track in his cabbage field.'], ['coco', 'I said yes before he finished.', 'hips']] : [['coco', 'Next: the mountain. The asphalt is frozen.'], ['coco', 'So am I. Allez!', 'cheer']]));
      if (!before.puzz[i] && this.P.puzzlesOpen(e)) beats.push(['coco', 'I built a track and lost some pieces. ' + ENV_INFO[e].name + ' PUZZLES are open.']);
      if (!before.surv[i] && this.P.survivalOpen(e)) { if (!this.P.seen('survIntro')) { this.P.see('survIntro'); beats.push(['tex', 'Three ghosts. One road.'], ['grav', 'Finish last, go home.'], ['bobo', 'Hrrm. Bobo is hungry.']); } else beats.push(['coco', ENV_INFO[e].name + ' GAUNTLET is open.']); }
      if (!before.cracked[i] && this.P.goldsIn(e) === 5) beats.push(['coco', 'You cracked ' + ENV_INFO[e].name + '. I will need more asphalt.', 'cheer']);
    });
    const ending = before.golds < 15 && this.P.totalGolds() === 15;
    if (ending) beats.push(['coco', 'Fifteen tracks. Fifteen golds. The clock is crying in a corner.', 'cheer'], ['coco', 'Now build your own. I will be watching. With a stopwatch.']);
    if (beats.length) { if (beats.some(b => /open|cabbage|mountain/.test(b[1]))) this.game.audio.sting(STINGS.unlock, { at: 'bar' }); this.say(beats, { onDone: ending ? () => { this.P.data.ended = true; this.P.save(); this.toMenu('credits'); this.app.front.reset('credits'); this.app.music('victory'); } : null }); }
  }
  saveReplay(r) { const L = this.P.data.replays; L.unshift(r); if (L.length > 10) L.length = 10; this.P.save(); }
  quitRace() {
    const R = this.app.race; if (!R) return this.toMenu();
    if (R.spec.onQuit) return R.spec.onQuit(R);
    const t = R.prep.track;
    if (R.spec.mode === 'campaign') this.toMenu('tracks', { env: t.env }); else this.toMenu('main');
  }
  // ---- replays ----
  replay(r, onExit) { this.game.go('replay', { replay: r, onExit: onExit || (() => this.toMenu('replays')) }); }
  garage() { this.game.go('garage'); }
  editor(o) { this.game.go('editor', o); }
  // ---- puzzles ----
  puzzle(id) {
    if (!this.P.seen('puzzleTip') && this.game.settings.hints !== false) this.P.see('puzzleTip');
    this.game.go('editor', { puzzle: id });
  }
  puzzleValidate(id, track, back) {
    const app = this.app, z = PUZZLES.find(p => p.id === id), car = ENV_INFO[z.env].car, M = app.medals(id), prev = this.P.data.puzzles[id];
    this.game.go('race', {
      mode: 'validate', track, medals: M, subtitle: 'PUZZLE • VALIDATE YOUR ROUTE', quitLabel: 'Back to the editor', onQuit: back,
      players: [{ name: this.P.data.name, carId: car, paint: this.paint(car), best: prev ? prev.best : null }],
      onDone: S => {
        const R = S.players[0].run, steps = R.finishSteps, medal = medalFor(steps, M), res = this.P.finish(id, steps, medal, R.splits, null, 'puzzle', z.env);
        if (medal) this.game.audio.sting(STINGS[['', 'bronze', 'silver', 'gold', 'author'][medal]], { at: 'now' });
        const data = { title: z.name, steps, best: res.newBest ? steps : prev && prev.best, delta: prev && prev.best != null ? steps - prev.best : null, medal, paid: res.paid, quip: medal >= 3 ? 'Voila. A road where there was none.' : 'It works. Can you find a faster way?', nextTarget: medal < 4 ? 'NEXT: ' + fmt([0, M.bronze, M.silver, M.gold, M.author][Math.min(4, medal + 1)]) : 'EVERY MEDAL WON',
          retry: () => this.puzzleValidate(id, track, back), next: back, menu: () => this.toMenu('puzzles', { env: z.env }) };
        this.toMenu('results', data); this.app.front.reset('results', data);
      }
    });
  }
  // ---- survival ----
  survival(env) { this.gauntlet = { env, round: 0, rank: 0, list: TRACKS.filter(t => t.env === env).map(t => t.id) }; this.survivalRound(); }
  rivalRuns(id, round, env) {
    const P = this.app.prepare(this.app.track(id), id), car = ENV_INFO[env].car;
    return RIVALS.map((rv, k) => {
      const skill = Math.min(.99, rv.base + CFG.rivalBase + CFG.rivalStep * round + .02 * k), r = botRun(P.course, car, { skill, seed: rv.seed + round * 101 + strHash(id) % 1000, late: k === 2 ? 3 : 0, record: () => new Recorder() });
      return { ...rv, steps: r.finished ? r.steps : null, ghost: r.ghost.toGhost({ steps: r.steps }) };
    });
  }
  survivalRound() {
    const G = this.gauntlet, id = G.list[G.round], t = this.app.track(id), car = ENV_INFO[G.env].car;
    const rivals = this.rivalRuns(id, G.round, G.env); G.rivals = rivals;
    const lastRival = Math.max(...rivals.map(r => r.steps || 0));
    this.game.go('race', {
      mode: 'survival', track: t, prepared: this.app.prepare(t, id), subtitle: 'ROUND ' + (G.round + 1) + ' OF 5 • ' + RANKS[G.rank], music: 'survival',
      ghosts: rivals.map(r => ({ ghost: r.ghost, carId: car, paint: Object.assign(defaultPaint(car), { body: r.color, accent: '#202024' }), tint: r.color, name: r.name })),
      players: [{ name: this.P.data.name, carId: car, paint: this.paint(car) }], noRestart: true,
      hooks: {
        after: S => { const R = S.players[0].run; if (!R.finished && R.steps > lastRival + 15 * 120) { S.players[0].out = true; } },
        hudExtra: (S, Pl, g, W, H) => {   // live places: the rivals' progress at this moment against yours
          const R = Pl.run, list = rivals.map(r => ({ name: r.name, color: r.color, done: r.steps !== null && r.steps <= R.steps, steps: r.steps })), y0 = 56;
          const ahead = list.filter(r => r.done).length + (R.finished ? 0 : 0);
          E.font.text(g, 'ROUND ' + (G.round + 1) + '/5', 10, y0 - 8, '#ffd23a', { outline: '#10101a' });
          list.forEach((r, i) => E.font.text(g, (r.done ? fmt(r.steps) + ' ' : '-:--.-- ') + r.name, 10, y0 + 6 + i * 11, r.color, { outline: '#10101a' }));
        }
      },
      onQuit: () => this.survivalEnd(true),
      onDone: S => this.survivalDone(S)
    });
    this.app.music('survival');
  }
  survivalDone(S) {
    const G = this.gauntlet, Pl = S.players[0], mine = Pl.run.finished ? Pl.run.finishSteps : 1e9;
    const rows = G.rivals.map(r => ({ name: r.name, steps: r.steps ?? 1e9 - 1, color: r.color, id: r.id })).concat([{ name: this.P.data.name, steps: mine, color: '#ffd23a', me: true }]).sort((a, b) => a.steps - b.steps);
    const place = rows.findIndex(r => r.me) + 1;
    const prevRank = G.rank; let out = false;
    if (place === 1) G.rank = Math.min(RANKS.length - 1, G.rank + 2); else if (place === 2) G.rank = Math.min(RANKS.length - 1, G.rank + 1); else if (place === 4) out = true;
    G.round++;
    const rec = this.P.data.survival[G.env] || (this.P.data.survival[G.env] = { round: 0, rank: 0, cleared: false });
    let paid = 0;
    const survived = out ? G.round - 1 : G.round;
    if (survived > rec.round) { paid += 50 * (survived - rec.round) * CFG.copperMult; rec.round = survived; }
    rec.rank = Math.max(rec.rank, G.rank);
    const cleared = !out && G.round >= 5;
    if (cleared && !rec.cleared) { rec.cleared = true; paid += 300 * CFG.copperMult; }
    this.P.data.coppers += Math.round(paid); this.P.save();
    this.game.audio.sting(STINGS[out ? 'out' : G.rank > prevRank ? 'rankup' : 'cp'], { at: 'now' });
    const quip = out ? ['tex', 'Go home, rookie. Take the scenic route.'] : cleared ? ['grav', '...We will haunt you next season.'] : place <= 2 ? (place === 1 ? ['bobo', 'Bobo likes you. Bobo still wins.'] : ['grav', 'Not bad. For a living person.']) : ['tex', 'Third. Lucky.'];
    const data = {
      title: out ? 'OUT IN ROUND ' + G.round : cleared ? 'GAUNTLET CLEARED!' : 'ROUND ' + G.round + ' • ' + ['', '1ST', '2ND', '3RD', '4TH'][place],
      rows: rows.map((r, i) => [(i + 1) + '. ' + r.name, r.steps >= 1e8 ? 'DNF' : fmt(r.steps), undefined, r.color]).concat([['RANK', RANKS[G.rank], paid ? '+' + Math.round(paid) + 'c' : undefined, '#ffd23a']]),
      portrait: quip[0], quip: quip[1], button: out || cleared ? 'MENU' : 'NEXT ROUND',
      on: () => out || cleared ? this.toMenu('gauntlet', { env: G.env }) : this.survivalRound()
    };
    this.toMenu('standings', data); this.app.front.reset('standings', data);
  }
  survivalEnd() { this.toMenu('gauntlet', { env: this.gauntlet.env }); }
  // ---- hot seat ----
  hotseat(names, attempts, nTracks) {
    const pool = TRACKS.filter(t => this.P.trackOpen(t.id)).map(t => t.id), R = rng(Date.now() >>> 0), cup = [];
    const list = pool.length ? pool : ['D1', 'D2'];
    while (cup.length < nTracks) cup.push(list[Math.floor(R() * list.length)]);
    this.hs = { names, attempts, cup, ti: 0, order: names.map((_, i) => i), turn: 0, attempt: 0, best: {}, points: names.map(() => 0), ghosts: {} };
    this.hotseatCard();
  }
  hotseatCard() {
    const H = this.hs, p = H.order[H.turn], name = H.names[p], t = this.app.trackProg(H.cup[H.ti]);
    const data = { title: 'PASS THE CONTROLLER TO', name, color: PLAYER_COLORS[p], sub: t.name + ' • TRACK ' + (H.ti + 1) + '/' + H.cup.length + ' • ATTEMPT ' + (H.attempt + 1) + '/' + H.attempts, on: () => this.hotseatRace() };
    this.toMenu('card', data); this.app.front.reset('card', data);
    if (H.ti === 0 && H.turn === 0 && H.attempt === 0) this.say([['coco', 'No peeking at the other times.']], { modal: false, auto: 3 });
  }
  hotseatRace() {
    const H = this.hs, p = H.order[H.turn], id = H.cup[H.ti], t = this.app.track(id), car = ENV_INFO[t.env].car;
    // the leader's best run drives as a ghost
    let lead = null; for (const k in H.best[id] || {}) { const b = H.best[id][k]; if (!lead || b.steps < lead.steps) lead = b; }
    this.game.go('race', {
      mode: 'hotseat', track: t, prepared: this.app.prepare(t, id), subtitle: H.names[p], medals: this.app.medals(id), noRestart: true,
      ghosts: lead ? [{ ghost: lead.ghost, carId: car, paint: Object.assign(defaultPaint(car), { body: PLAYER_COLORS[lead.p] }), tint: PLAYER_COLORS[lead.p], name: H.names[lead.p] }] : [],
      players: [{ name: H.names[p], carId: car, paint: Object.assign(this.paint(car), { body: PLAYER_COLORS[p] }), color: PLAYER_COLORS[p], best: H.best[id] && H.best[id][p] ? H.best[id][p].steps : null }],
      onQuit: () => this.hotseatNext(null), quitLabel: 'Give up this attempt',
      onDone: S => { const Pl = S.players[0]; this.hotseatNext(Pl.run.finishSteps, Pl.rec.toGhost({ steps: Pl.run.finishSteps })); }
    });
  }
  hotseatNext(steps, ghost) {
    const H = this.hs, p = H.order[H.turn], id = H.cup[H.ti]; H.best[id] = H.best[id] || {};
    if (steps != null && (!H.best[id][p] || steps < H.best[id][p].steps)) H.best[id][p] = { steps, ghost: ghost.data ? ghost : null, p };
    H.attempt++;
    if (H.attempt < H.attempts) return this.hotseatCard();
    H.attempt = 0; H.turn++;
    if (H.turn < H.names.length) return this.hotseatCard();
    // the track's points: 10-8-6-5-4-3-2-1 by best time
    const PTS = [10, 8, 6, 5, 4, 3, 2, 1], rank = H.names.map((n, i) => ({ i, s: H.best[id][i] ? H.best[id][i].steps : 1e9 })).sort((a, b) => a.s - b.s);
    rank.forEach((r, k) => { if (r.s < 1e9) H.points[r.i] += PTS[k] || 0; });
    H.ti++; H.turn = 0; H.order.push(H.order.shift());   // turn order rotates per track
    const done = H.ti >= H.cup.length, table = H.names.map((n, i) => ({ n, i, pts: H.points[i] })).sort((a, b) => b.pts - a.pts);
    const data = { title: done ? 'CUP RESULTS' : 'STANDINGS AFTER ' + this.app.trackProg(id).name, rows: table.map((r, k) => [(k + 1) + '. ' + r.n, H.best[id][r.i] ? fmt(H.best[id][r.i].steps) : 'DNF', r.pts + ' PTS', PLAYER_COLORS[r.i]]), portrait: 'coco', quip: done ? table[0].n + ' takes the cup. Allez!' : 'Next track. Same rules. More pressure.', button: done ? 'MENU' : 'NEXT TRACK', on: () => done ? this.toMenu('multi') : this.hotseatCard() };
    if (done) this.game.audio.sting(STINGS.gold, { at: 'now' });
    this.toMenu('standings', data); this.app.front.reset('standings', data);
  }
  // ---- split screen ----
  splitJoin() {
    const app = this.app, game = this.game, front = app.front;
    const page = {
      items: () => [{ id: 'go', label: 'START', sub: game.players.length + ' PLAYERS', disabled: game.players.length < 2, x: game.W / 2 - 80, y: game.H - 70, w: 160, h: 36, on: () => this.splitRace(this.splitTrack()) }],
      draw: g => {
        big(g, 'SPLIT SCREEN', game.W / 2, 14, '#ffffff', 2);
        const n = game.players.length;
        for (let i = 0; i < 4; i++) { const x = game.W / 2 - 200 + i * 100, joined = i < n, I = game.players[i]; E.ui.box(g, x + 4, 50, 92, 90, { bg: joined ? [PLAYER_COLORS[i], '#202030'] : ['#202030', '#101018'], border: '#ffffff' }); text(g, 'P' + (i + 1), x + 38, 60, '#ffffff'); E.font.text(g, joined ? (I.device === 'gamepad' || I.pad !== null && I.pad !== undefined ? 'PAD' : I.keys === 'right' ? 'ARROWS' : 'KEYS / PAD') : 'PRESS START', x + 50, 100, '#ffffff', { align: 'center', outline: '#10101a' }); }
        E.font.text(g, 'PADS: PRESS OPTIONS TO JOIN • KEYBOARD: PRESS 2 (RIGHT HALF: ARROWS, . / ,)', game.W / 2, 150, COL.dim, { align: 'center', outline: '#10101a' });
        E.font.text(g, 'TRACK: ' + this.app.trackProg(this.splitTrack()).name, game.W / 2, 166, '#ffd23a', { align: 'center', outline: '#10101a' });
        promptBar(g, game, [['confirm', 'START'], ['left', 'TRACK'], ['cancel', 'BACK']]);
      },
      lr: k => { const pool = TRACKS.filter(t => this.P.trackOpen(t.id)).map(t => t.id); this.splitI = ((this.splitI || 0) + k + pool.length) % pool.length; },
      back: () => { game.allowJoin(false); for (const p of game.players.slice(1)) game.removePlayer(p); front.back(); }
    };
    front.pages.join = page;
    game.allowJoin({ max: 4 });
    front.go('join');
  }
  splitTrack() { const pool = TRACKS.filter(t => this.P.trackOpen(t.id)).map(t => t.id); return pool[(this.splitI || 0) % pool.length] || 'D1'; }
  splitRace(id) {
    const game = this.game, t = this.app.track(id), car = ENV_INFO[t.env].car;
    game.allowJoin(false);
    const players = game.players.map((I, i) => ({ name: 'P' + (i + 1), carId: car, paint: Object.assign(this.paint(car), { body: PLAYER_COLORS[i] }), color: PLAYER_COLORS[i], input: I }));
    let firstT = null; const order = [];
    game.go('race', {
      mode: 'split', track: t, prepared: this.app.prepare(t, id), subtitle: players.length + ' PLAYERS', players, intro: true,
      onFinish: (Pl, R) => { order.push(Pl); Pl.place = order.length; if (firstT === null) firstT = R.steps; },
      hooks: { after: S => { if (firstT !== null) { const R0 = S.players.find(p => p.run.finished); if (R0 && S.players.some(p => !p.run.finished) && S.players.every(p => p.run.finished || p.run.steps > firstT + 30 * 120)) for (const p of S.players) if (!p.run.finished) p.out = true; } } },
      onQuit: () => this.splitEnd(), quitLabel: 'Quit to menu',
      onDone: S => {
        const rows = S.players.slice().sort((a, b) => (a.run.finishSteps ?? 1e9) - (b.run.finishSteps ?? 1e9)).map((p, k) => [(k + 1) + '. ' + p.name, p.run.finished ? fmt(p.run.finishSteps) : 'DNF', undefined, p.color]);
        const data = { title: t.name, rows, portrait: 'drapeau', quip: rows[0][0].slice(3) + ' wins! Encore?', button: 'NEXT RACE', on: () => { this.splitI = (this.splitI || 0) + 1; this.splitRace(this.splitTrack()); } };
        this.toMenu('standings', data); this.app.front.reset('standings', data); this.app.front.st && 0;
        this.splitStanding = true;
      }
    });
  }
  splitEnd() { const game = this.game; for (const p of game.players.slice(1)) game.removePlayer(p); this.toMenu('multi'); }
}
