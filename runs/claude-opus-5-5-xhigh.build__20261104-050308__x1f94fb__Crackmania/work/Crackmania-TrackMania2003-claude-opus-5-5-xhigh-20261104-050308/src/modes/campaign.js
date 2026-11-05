// CRACKMANIA campaign (PLAN §5.1, §5.2): unlock rules, the race session (your best ghost, Coco's ghost, the next medal),
// medals and coppers once per tier, records, the story beats that follow results
import { ctx, E } from '../ctx.js';
import { ENV_TRACKS, PUZZLES } from '../data/tracks.js';
import { ENVS, ENV_IDS } from '../env/envs.js';
import { thresholds, medalFor, nextTarget, authorGhost } from '../race/medals.js';
import { Ghost } from '../race/ghost.js';
import { startRace } from '../scenes/race.js';
import { fx } from '../ui/fx.js';
export const ENV_ORDER = ENV_IDS;
const P = () => ctx.profile;
export const all = () => !!P().p.allUnlocked;
export function medalCount(env, min = 1) { return ENV_TRACKS[env].filter(id => P().medal(id) >= min).length; }
export function envOpen(env) { if (all()) return true; if (env === 'dustbowl') return true; if (env === 'hedgerow') return medalCount('dustbowl') >= 3; return medalCount('hedgerow') >= 3; }
export function envNeed(env) { return env === 'hedgerow' ? 'MEDALS ON 3 DUSTBOWL TRACKS' : env === 'frostpeak' ? 'MEDALS ON 3 HEDGEROW TRACKS' : ''; }
export function trackOpen(id) {
  if (all()) return true; const env = Object.keys(ENV_TRACKS).find(e => ENV_TRACKS[e].includes(id)), L = ENV_TRACKS[env], i = L.indexOf(id);
  if (!envOpen(env)) return false; if (env === 'dustbowl' && i < 2) return true; if (i === 0) return true;
  return P().medal(L[i - 1]) >= 1;
}
export function puzzlesOpen(env) { return all() || P().medal(ENV_TRACKS[env][1]) >= 1; }
export function survivalOpen(env) { return all() || P().medal(ENV_TRACKS[env][2]) >= 1; }
export function puzzleOpen(id) { const p = PUZZLES.find(q => q.id === id); return p && puzzlesOpen(p.env); }
export function envOfTrack(id) { return Object.keys(ENV_TRACKS).find(e => ENV_TRACKS[e].includes(id)); }
export function nextTrack(id) { const env = envOfTrack(id), L = ENV_TRACKS[env], i = L.indexOf(id); return i >= 0 && i < L.length - 1 ? L[i + 1] : null; }
/** what is open now (to see what a result just opened) */
export function openState() {
  const s = {}; for (const e of ENV_IDS) { s['env:' + e] = envOpen(e); s['pz:' + e] = puzzlesOpen(e); s['sv:' + e] = survivalOpen(e); for (const id of ENV_TRACKS[e]) s[id] = trackOpen(id); }
  s.golds = ENV_IDS.reduce((a, e) => a + medalCount(e, 3), 0); s.anyMedal = ENV_IDS.some(e => medalCount(e) > 0) || PUZZLES.some(p => P().medal(p.id) > 0); return s;
}
/** the story that a change in what's open calls for, in order */
export function beatsFor(before, after) {
  const b = [];
  if (!before.anyMedal && after.anyMedal) b.push(['firstMedal']);
  for (const e of ENV_IDS) {
    if (!before['env:' + e] && after['env:' + e] && e !== 'dustbowl') b.push([e]);
    if (!before['pz:' + e] && after['pz:' + e] && !ctx.profile.seen('puzzles')) b.push(['puzzles']);
    if (!before['sv:' + e] && after['sv:' + e] && !ctx.profile.seen('survival')) b.push(['survival']);
    const cracked = ENV_TRACKS[e].every(id => P().medal(id) >= 3); if (cracked && !ctx.profile.seen('cracked:' + e)) b.push(['cracked', e]);
  }
  if (after.golds >= 15 && !P().p.ended) b.push(['ending']);
  return b;
}
/** the session's ghosts: your best (setting My ghost), Coco's (setting, or the track select's toggle) */
export function ghostsFor(track, o = {}) {
  const out = [], rec = P().record(track.id), s = ctx.game.settings;
  if (rec && rec.ghost && s.myGhost !== false && !o.noBest) out.push({ ghost: Ghost.decode(rec.ghost), model: rec.ghost.model, paint: rec.ghost.paint, name: 'BEST', color: '#c8d8ff' });
  if (s.cocoGhost || o.coco) { const a = authorGhost(track); if (a) out.push({ ghost: Ghost.decode(a.ghost), model: a.ghost.model, paint: { body: '#ffd030', accent: '#ff7a1a', pattern: 1, patternColor: '#ff7a1a', number: 1, rims: 2, helmet: '#ff7a1a' }, name: 'COCO', color: '#ffd060' }); }
  return out;
}
/** a campaign race */
export function raceCampaign(id, o = {}) {
  const track = ctx.tracks[id], env = track.env, model = ENVS[env].car, rec = P().record(id), T = ctx.medals[id];
  const before = openState();
  const sess = startRace({
    kind: 'campaign', track, label: track.def ? track.def.teaches : '', countdown: o.quick ? 1.5 : 3, intro: !o.quick,
    players: [{ input: ctx.game.input, name: P().p.name, model, paint: P().paint(model), best: rec ? { steps: rec.bestSteps, splits: rec.bestSplits } : null }],
    ghosts: ghostsFor(track, { coco: o.coco }),
    targets: Pl => { const r2 = P().record(id), m = r2 ? r2.medal : 0; const nt = nextTarget(m, T); return nt ? Object.assign(nt, { best: r2 ? r2.bestSteps : null }) : null; },
    onFinish(s, Pl) {
      const steps = Pl.results.steps, medal = medalFor(steps, T), res = P().finish(id, 'race', steps, medal, Pl.results.ghost, Pl.results.splits, env);
      s.result = Object.assign({ steps, medal, T, id, ghost: Pl.results.ghost, respawns: Pl.results.respawns }, res);
      if (res.better && res.prevBest !== null) fx.note(Pl, 'NEW RECORD!', '#5ab4ff', 2.5);
      s.after = () => ctx.game.go('results', { kind: 'campaign', id, track, result: s.result, before, retry: () => raceCampaign(id, { quick: true, coco: o.coco }), next: nextTrack(id) && trackOpen(nextTrack(id)) ? () => raceCampaign(nextTrack(id), { coco: o.coco }) : null });
    },
    onRestart() {},
    onEvent: (Pl, ev) => tips(track, Pl, ev, s => s),
    update: () => { const Pl = ctx.session.players[0]; if (id === 'D1' && Pl.run.racing && Pl.run.steps === 25 * 120) tips(track, Pl, { type: 'respawn' }); },
    canRestart: true
  });
  sess.tipState = {};
  return sess;
}
/** the first-time tips on D1, D2, D3 (not modal: the race goes on) */
function tips(track, Pl, ev) {
  if (!ctx.game.settings.hints) return; const T = { D1: 1, D2: 1, D3: 1 }[track.id]; if (!T) return;
  const sess = ctx.session, st = sess.tipState || (sess.tipState = {}), seen = k => ctx.profile.seen('tip:' + track.id + ':' + k), say = (k, text) => { if (seen(k) || st[k]) return; st[k] = 1; ctx.profile.mark('tip:' + track.id + ':' + k); ctx.talk.scene([['coco', text]], { modal: false, auto: 3, place: 'top' }); };
  if (track.id === 'D1') { if (ev.type === 'go') say('start', 'Hold {gas} to go. Steer with {steer}.'); if (ev.type === 'cp') say('cp', 'Checkpoints remember you. {respawn} puts you back there.'); if (ev.type === 'respawn') say('late', '{restart} starts again. Nobody is watching. Except the clock.'); }
  if (track.id === 'D2' && ev.type === 'go') say('kicker', 'Jumps need speed. The canyon does not negotiate.');
  if (track.id === 'D3' && ev.type === 'go') say('loop', 'Loops love speed. Keep your foot down.');
}
