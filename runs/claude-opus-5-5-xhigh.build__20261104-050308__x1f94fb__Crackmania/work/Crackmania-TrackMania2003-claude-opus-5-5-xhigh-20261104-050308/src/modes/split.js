// CRACKMANIA Split Screen (PLAN §5.6): 2-4 players at once (a pad each, or the keyboard's halves), cars are ghosts to
// each other (no collisions, TrackMania style), each viewport its own HUD; the race ends when all finish or 30 s after
// the first; best of 1 or 3
import { ctx, E } from '../ctx.js';
import { ENVS } from '../env/envs.js';
import { startRace } from '../scenes/race.js';
import { card } from '../scenes/card.js';
import { fmt } from '../race/run.js';
import { T1, T2, title, panel } from '../ui/kit.js';
import { DEFAULT_PAINT } from '../car/draw.js';
import { fx } from '../ui/fx.js';
export const SPLIT_COLORS = ['#3ab0f0', '#e8402a', '#3ac850', '#ffc21a'];
export class Split {
  /** o: { inputs: [input...], track, bestOf: 1 | 3, bots: n (attract/demo: bot players) } */
  constructor(o) { this.o = o; this.races = 0; this.wins = []; this.track = o.track; this.bestOf = o.bestOf || 1; }
  start() { this.wins = this.players().map(() => 0); this.race(); }
  players() { return this.o.inputs.length ? this.o.inputs : Array.from({ length: this.o.bots || 2 }, () => null); }
  race() {
    const track = this.track, model = ENVS[track.env].car, self = this, ins = this.players();
    const sess = startRace({ kind: 'split', track, label: 'SPLIT SCREEN · RACE ' + (this.races + 1) + ' OF ' + this.bestOf, canRestart: false, noSlowmo: true, orbit: false, intro: !this.o.bots, stay: this.o.stay,
      players: ins.map((I, i) => ({ input: I, bot: I ? null : { skill: .92 + i * .03, cheat: true, seed: 11 + i }, name: 'P' + (i + 1), color: SPLIT_COLORS[i], model, paint: Object.assign({}, DEFAULT_PAINT[model], { body: SPLIT_COLORS[i], number: i + 1 }), listen: i === 0 })),
      update(dt) { const s = ctx.session, done = s.players.filter(P => P.run.finished); if (done.length && !s.firstT) s.firstT = s.t; if (!s.ended && (done.length === s.players.length || (s.firstT && s.t - s.firstT > 30))) { s.ended = true; s.after = () => self.end(); s.afterTime = 0; } },
      onFinish(s, P) { const n = s.players.filter(q => q.run.finished).length; fx.note(P, ['1ST', '2ND', '3RD', '4TH'][n - 1] + ' PLACE', P.color, 3); }
    });
    sess.afterTime = 1.5;
    return sess;
  }
  end() {
    const s = ctx.session, L = s.players.slice().sort((a, b) => (a.run.finished ? a.run.finishSteps : 1e12) - (b.run.finished ? b.run.finishSteps : 1e12));
    this.races++; if (L[0].run.finished) this.wins[L[0].i]++;
    const self = this, need = Math.ceil(this.bestOf / 2), champ = this.wins.findIndex(w => w >= need), over = champ >= 0 || this.races >= this.bestOf;
    if (this.o.bots) { this.race(); return; }
    s.noHud = true; ctx.game.splitScreen(0);
    card({ min: .8, prompts: [['confirm', over ? 'MENU' : 'NEXT RACE'], over && ['secondary', 'REMATCH']].filter(Boolean),
      draw(g, r) { const x = r.W / 2; title(g, over ? (champ >= 0 ? 'P' + (champ + 1) + ' WINS!' : 'RACE OVER') : 'RACE ' + self.races + ' OF ' + self.bestOf, x, r.H * .15, 3); L.forEach((P, i) => { const y = r.H * .15 + 40 + i * 24; panel(g, x - 140, y, 280, 22, { border: P.color }); T2(g, (i + 1) + '. ' + P.name, x - 132, y + 4, P.color); T2(g, P.run.finished ? fmt(P.run.finishSteps) : 'DNF', x + 70, y + 4, '#ffffff', 'right'); T2(g, '★'.repeat(self.wins[P.i]), x + 132, y + 4, '#ffd060', 'right'); }); },
      onConfirm() { if (over) ctx.game.go('menu', { page: 'multi' }); else self.race(); }, onSecondary() { self.races = 0; self.start(); } });
  }
}
export function startSplit(o) { const S = new Split(o); ctx.split = S; S.start(); return S; }
