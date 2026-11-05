// CRACKMANIA Survival (PLAN §5.5): per environment a gauntlet of 5 rounds (its tracks 1 to 5) against the Ghost Guild,
// Tex Mirage, Mlle Gravillon and Bobo Yeti, as ghost cars. Their runs are bot runs made at the round's start
// (deterministic per gauntlet and round). Place by finish time: 1st +2 ranks, 2nd +1, 3rd stays, 4th is out
import { ctx, E } from '../ctx.js';
import { ENV_TRACKS } from '../data/tracks.js';
import { ENVS } from '../env/envs.js';
import { CFG } from '../config.js';
import { botRun } from '../race/medals.js';
import { Ghost } from '../race/ghost.js';
import { startRace } from '../scenes/race.js';
import { card } from '../scenes/card.js';
import { T1, T2, title, panel, UI } from '../ui/kit.js';
import { fmt } from '../race/run.js';
import { portrait, RIVAL_QUIPS, CAST } from '../story/story.js';
import { fx } from '../ui/fx.js';
export const RANKS = ['ROOKIE', 'DRIVER', 'RACER', 'PILOT', 'ACE', 'MANIAC', 'CRACKMANIAC'];
export const RIVALS = [
  { id: 'tex', name: 'TEX MIRAGE', base: .78, seed: 101, color: '#ff8a2a', paint: { body: '#ff8a2a', accent: '#5a3a1a', pattern: 4, patternColor: '#ffd060', number: 66, rims: 2, helmet: '#c8a070' }, bot: { lateBrake: 1.2 } },
  { id: 'gravillon', name: 'MLLE GRAVILLON', base: .86, seed: 202, color: '#a86ae8', paint: { body: '#7a4ae8', accent: '#ffffff', pattern: 1, patternColor: '#ffffff', number: 9, rims: 5, helmet: '#3a3a48' }, bot: { lateBrake: .4 } },
  { id: 'bobo', name: 'BOBO YETI', base: .93, seed: 303, color: '#e8f0ff', paint: { body: '#f4f8ff', accent: '#8ab0e8', pattern: 3, patternColor: '#8ab0e8', number: 1, rims: 1, helmet: '#c8d0e0' }, bot: { lateBrake: 2.5 } }
];
/** the rivals' runs for a round: deterministic per gauntlet, round and rank */
export function rivalRuns(env, round, rank) {
  const id = ENV_TRACKS[env][round], track = ctx.tracks[id];
  return RIVALS.map((R, k) => {
    const skill = Math.max(.5, Math.min(.97, R.base + CFG.rivalBase + CFG.rivalStep * round + .02 * rank)), model = ENVS[env].car;   // (never past Coco's own driving: a near-perfect run beats them)
    const run = botRun(track, { skill, seed: R.seed + round * 7 + env.length, bot: R.bot, model });
    return { R, skill, steps: run ? run.steps : null, ghost: run ? run.ghost : null, model };
  });
}
/** places: the player's steps (null: DNF) against the rivals' -> [{ who, steps }] best first */
export function places(mySteps, rivals) {
  const L = rivals.map(v => ({ who: v.R.id, name: v.R.name, steps: v.steps })).concat([{ who: 'you', name: ctx.profile.p.name, steps: mySteps }]);
  return L.sort((a, b) => (a.steps ?? 1e12) - (b.steps ?? 1e12) || (a.who === 'you' ? 1 : -1));
}
export function rankChange(place) { return place === 1 ? 2 : place === 2 ? 1 : place === 3 ? 0 : null; }
export class Gauntlet {
  constructor(env) { this.env = env; this.round = 0; this.rank = 0; this.alive = true; this.log = []; }
  start() { this.round = 0; this.rank = 0; this.alive = true; this.nextRound(); }
  nextRound() {
    const self = this;
    card({ min: 1, prompts: [], draw(g, r, t) { title(g, 'WARMING UP THE GHOSTS', r.W / 2, r.H * .4, 2, ['#ffffff', '#c8d8ff', '#8a92ff']); T2(g, ENVS[self.env].name + ' GAUNTLET · ROUND ' + (self.round + 1) + ' OF 5', r.W / 2, r.H * .4 + 26, '#ffd060', 'center'); },
      update() { if (!self._made) { self._made = true; self.rivals = rivalRuns(self.env, self.round, self.rank); } if (this.t > 1 && self._made) { self._made = false; self.race(); } } });
  }
  race() {
    const id = ENV_TRACKS[this.env][this.round], track = ctx.tracks[id], model = ENVS[this.env].car, self = this;
    const lastRival = Math.max(...this.rivals.map(v => v.steps || 0));
    startRace({ kind: 'survival', track, label: 'ROUND ' + (this.round + 1) + ' · RANK ' + RANKS[this.rank], canRestart: false,
      players: [{ input: ctx.game.input, name: ctx.profile.p.name, model, paint: ctx.profile.paint(model) }],
      ghosts: this.rivals.filter(v => v.ghost).map(v => ({ ghost: Ghost.decode(v.ghost), model: v.model, paint: v.R.paint, name: v.R.name, color: v.R.color, always: true })),
      update() { const P = ctx.session.players[0]; if (!P.run.finished && P.run.racing && P.run.steps > lastRival + 15 * 120 && !ctx.session.dnf) { ctx.session.dnf = true; self.end(null); } },
      extraHud(g, r, P, vp) { const L = places(P.run.finished ? P.run.finishSteps : null, self.rivals.map(v => ({ ...v, steps: v.steps !== null && v.steps <= P.run.steps ? v.steps : null }))); let y = vp.y + vp.h * .3; for (const [i, q] of L.entries()) { T1(g, (i + 1) + '. ' + q.name, vp.x + 8, y, q.who === 'you' ? '#ffd060' : (RIVALS.find(R => R.id === q.who) || {}).color || '#fff'); y += 11; } },
      onFinish(s, P) { s.after = () => self.end(P.results.steps); }
    });
  }
  end(mySteps) {
    const L = places(mySteps, this.rivals), place = L.findIndex(q => q.who === 'you') + 1, ch = rankChange(place), self = this, before = this.rank;
    if (ctx.session) ctx.session.noHud = true;
    if (ch === null) this.alive = false; else this.rank = Math.min(RANKS.length - 1, this.rank + ch);
    this.log.push({ round: this.round, place, mySteps });
    const rec = ctx.profile.p.survival[this.env] || (ctx.profile.p.survival[this.env] = { bestRank: 0, bestRound: 0, cleared: false });
    const survived = this.alive ? this.round + 1 : this.round;
    let paid = 0; if (survived > rec.bestRound) { paid += (survived - rec.bestRound) * 50 * CFG.copperMul; rec.bestRound = survived; }
    const cleared = this.alive && this.round === 4; if (cleared && !rec.cleared) { rec.cleared = true; paid += 300 * CFG.copperMul; }
    rec.bestRank = Math.max(rec.bestRank, this.rank); ctx.profile.p.coppers += Math.round(paid); ctx.profile.save();
    ctx.sound.sfx(ch === null ? 'out' : ch > 0 ? 'rankup' : 'confirm');
    const quip = ch === null ? RIVAL_QUIPS.out[0] : ch > 0 ? RIVAL_QUIPS.rankup[(this.round + place) % RIVAL_QUIPS.rankup.length] : RIVAL_QUIPS.stay[this.round % RIVAL_QUIPS.stay.length];
    card({ live: true, min: .8, prompts: [['confirm', cleared ? 'CELEBRATE' : this.alive ? 'NEXT ROUND' : 'MENU']],
      enter() { ctx.talk.scene([quip], { modal: false, auto: 2.6, place: 'top' }); },
      draw(g, r, t) {
        const x = r.W / 2, y = r.H * .18;
        title(g, cleared ? 'GAUNTLET CLEARED' : self.alive ? 'ROUND ' + (self.round + 1) + ' DONE' : 'ELIMINATED', x, y, 3, cleared ? ['#ffffff', '#ffe08a', '#ffb020'] : self.alive ? ['#ffffff', '#c8ffd8', '#3ad070'] : ['#ffe0e0', '#ff7a6a', '#c8202a']);
        L.forEach((q, i) => {
          const yy = y + 40 + i * 30, R = RIVALS.find(v => v.id === q.who), col = R ? R.color : '#ffd060';
          panel(g, x - 150, yy, 300, 26, { border: q.who === 'you' ? '#ffd060' : '#3a3658' });
          if (R) portrait(R.id).drawPortrait(g, x - 146, yy + 1, 24, { bg: '#1a1630' }); else { E.px.rect(g, x - 146, yy + 1, 24, 24, '#2a2448'); T2(g, 'YOU', x - 134, yy + 6, '#ffd060', 'center'); }
          T2(g, (i + 1) + '. ' + q.name, x - 116, yy + 6, col); T2(g, q.steps !== null ? fmt(q.steps) : 'DNF', x + 142, yy + 6, '#ffffff', 'right');
        });
        const yy = y + 40 + 4 * 30 + 6;
        T2(g, 'RANK ' + RANKS[before] + (self.rank !== before ? ' → ' + RANKS[self.rank] : ''), x, yy, self.rank > before ? '#5ad06a' : '#ffffff', 'center');
        if (paid) T2(g, '+' + Math.round(paid) + ' ¢', x, yy + 20, '#e8904a', 'center');
      },
      onConfirm() {
        if (cleared) { ctx.talk.beat('gauntletCleared'); ctx.game.go('menu', { page: 'survival' }); return; }
        if (!self.alive) { ctx.game.go('menu', { page: 'survival' }); return; }
        self.round++; self.nextRound();
      } });
  }
}
export function startSurvival(env) { const G = new Gauntlet(env); ctx.gauntlet = G; G.start(); return G; }
