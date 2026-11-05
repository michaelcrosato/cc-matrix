// CRACKMANIA Hot Seat (PLAN §5.6), TrackMania 2003's local mode: 2-8 players take turns on one controller or keyboard,
// 1-3 attempts a turn, a cup of 1-5 tracks; the leader's best run drives as a ghost; 10-8-6-5-4-3-2-1 points a track;
// standings after each track, a podium at the end with each player's car in their colour
import { ctx, E } from '../ctx.js';
import { ENVS } from '../env/envs.js';
import { startRace } from '../scenes/race.js';
import { card } from '../scenes/card.js';
import { Ghost } from '../race/ghost.js';
import { fmt } from '../race/run.js';
import { T1, T2, title, panel } from '../ui/kit.js';
import { carSide } from '../ui/icons.js';
import { DEFAULT_PAINT } from '../car/draw.js';
export const HS_COLORS = ['#e8402a', '#2a6ae8', '#3ac850', '#ffc21a', '#b84ae0', '#2ad0c0', '#ff7a1a', '#f4f4f4'];
export const POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
export class HotSeat {
  /** o: { names: [...], attempts: 1..3, tracks: [Track] } */
  constructor(o) {
    this.players = o.names.map((n, i) => ({ name: n, color: HS_COLORS[i], points: 0, best: {} }));
    this.attempts = o.attempts || 1; this.tracks = o.tracks; this.ti = 0; this.order = []; this.turn = 0; this.attempt = 0; this.finished = false;
  }
  start() { this.ti = 0; this.beginTrack(); }
  beginTrack() { const n = this.players.length; this.order = Array.from({ length: n }, (_, k) => (k + this.ti) % n); this.turn = 0; this.attempt = 0; this.pass(); }
  get who() { return this.players[this.order[this.turn]]; }
  get track() { return this.tracks[this.ti]; }
  /** "pass the controller to ..." */
  pass() {
    const self = this, P = this.who;
    card({ min: .6, music: 'paint', prompts: [['confirm', 'READY']], enter() { ctx.talk.scene([['coco', 'No peeking at the other times.']], { modal: false, auto: 2.2, place: 'top' }); },
      draw(g, r, t) { const x = r.W / 2; T2(g, 'TRACK ' + (self.ti + 1) + ' OF ' + self.tracks.length + ' · ' + self.track.name.toUpperCase(), x, r.H * .22, '#c8d8ff', 'center'); title(g, 'PASS THE CONTROLLER TO', x, r.H * .34, 2, ['#ffffff', '#e0e0ff', '#a0a0d0']); title(g, P.name, x, r.H * .34 + 24, 4, ['#ffffff', P.color, P.color]); T2(g, 'ATTEMPT ' + (self.attempt + 1) + ' OF ' + self.attempts, x, r.H * .34 + 64, '#ffd060', 'center'); },
      onConfirm() { self.drive(); } });
  }
  drive() {
    const P = this.who, track = this.track, model = ENVS[track.env].car, self = this;
    // the leader's best run on this track, as a ghost
    const leader = this.players.filter(q => q.best[this.ti] && q !== P).sort((a, b) => a.best[this.ti].steps - b.best[this.ti].steps)[0];
    const paint = Object.assign({}, DEFAULT_PAINT[model], { body: P.color, number: this.players.indexOf(P) + 1 });
    startRace({ kind: 'hotseat', track, label: P.name + ' · ATTEMPT ' + (this.attempt + 1) + '/' + this.attempts, canRestart: false,
      players: [{ input: ctx.game.input, name: P.name, color: P.color, model, paint, best: P.best[this.ti] ? { steps: P.best[this.ti].steps, splits: P.best[this.ti].splits } : null }],
      ghosts: leader ? [{ ghost: Ghost.decode(leader.best[this.ti].ghost), model, paint: Object.assign({}, paint, { body: leader.color }), name: leader.name, color: leader.color, always: true }] : [],
      onFinish(s, Q) { const r = Q.results; if (!P.best[self.ti] || r.steps < P.best[self.ti].steps) P.best[self.ti] = { steps: r.steps, ghost: r.ghost, splits: r.splits }; s.after = () => self.afterTurn(); }
    });
  }
  afterTurn() {
    this.attempt++;
    if (this.attempt < this.attempts) { this.pass(); return; }
    this.attempt = 0; this.turn++;
    if (this.turn < this.players.length) { this.pass(); return; }
    // the track's points
    const ranked = this.players.filter(q => q.best[this.ti]).sort((a, b) => a.best[this.ti].steps - b.best[this.ti].steps);
    ranked.forEach((q, i) => { q.points += POINTS[i] || 0; q.last = POINTS[i] || 0; });
    for (const q of this.players) if (!q.best[this.ti]) q.last = 0;
    this.standings();
  }
  standings() {
    const self = this, last = this.ti === this.tracks.length - 1, L = this.players.slice().sort((a, b) => b.points - a.points);
    if (ctx.session) ctx.session.noHud = true;
    card({ min: .8, prompts: [['confirm', last ? 'PODIUM' : 'NEXT TRACK'], ['cancel', 'QUIT']],
      draw(g, r) { const x = r.W / 2; title(g, last ? 'FINAL STANDINGS' : 'CUP STANDINGS', x, r.H * .12, 3); L.forEach((q, i) => { const y = r.H * .12 + 38 + i * 22; panel(g, x - 160, y, 320, 20, { border: q.color }); T2(g, (i + 1) + '. ' + q.name, x - 154, y + 3, q.color); T1(g, q.best[self.ti] ? fmt(q.best[self.ti].steps) : 'NO TIME', x + 40, y + 6, '#c8c8e0'); T2(g, q.points + ' (+' + (q.last || 0) + ')', x + 154, y + 3, '#ffffff', 'right'); }); },
      onConfirm() { if (last) self.podium(); else { self.ti++; self.beginTrack(); } }, onBack() { ctx.game.go('menu', { page: 'multi' }); } });
  }
  podium() {
    const L = this.players.slice().sort((a, b) => b.points - a.points);
    ctx.sound.sfx('finish');
    card({ min: 1, music: 'victory', prompts: [['confirm', 'MENU']],
      draw(g, r, t) {
        const x = r.W / 2, base = r.H * .72; title(g, L[0].name + ' WINS!', x, r.H * .12, 3, ['#ffffff', '#ffe08a', '#ffb020']);
        const spots = [[0, 0, 60], [-1, 1, 40], [1, 2, 26]];
        for (const [dx, i, h] of spots) { const q = L[i]; if (!q) continue; const px = x + dx * 110; E.px.rect(g, px - 50, base - h, 100, h, ['#e8b020', '#b8c0d0', '#c8783a'][i]); T2(g, String(i + 1), px, base - h + 4, '#1a1420', 'center'); carSide(g, ENVS[ctx.session ? ctx.session.env : 'dustbowl'].car, px, base - h - 4 - Math.abs(Math.sin(t * 3 + i)) * 4, 1.4, q.color); T2(g, q.name, px, base - h - 44, q.color, 'center'); T1(g, q.points + ' PTS', px, base + 6, '#ffffff', 'center'); }
      },
      onConfirm() { ctx.game.go('menu', { page: 'multi' }); } });
  }
}
export function startHotSeat(o) { const H = new HotSeat(o); ctx.hotseat = H; H.start(); return H; }
