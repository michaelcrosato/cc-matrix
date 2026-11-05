// CRACKMANIA results (PLAN §5.2): over the finish's orbit: the time big, best and delta, the medal dropping in with its
// sting, the next medal's target, coppers counting up; RETRY is one button and takes under half a second; NEXT, REPLAY,
// SAVE REPLAY, MENU. Then the story beats the result opened
import { ctx, E } from '../ctx.js';
import { MENU_INPUT } from '../input.js';
import { update as raceUpdate, draw as raceDraw, rememberSteps } from './race.js';
import { Focus, tile, panel, T1, T2, title, UI, toast, drawToasts } from '../ui/kit.js';
import { promptBar } from '../ui/glyphs.js';
import { medal, coin, MEDAL_NAME } from '../ui/icons.js';
import { bigText } from '../ui/hud.js';
import { fmt } from '../race/run.js';
import { nextTarget } from '../race/medals.js';
import { QUIPS } from '../story/story.js';
import * as C from '../modes/campaign.js';
const RES_INPUT = Object.assign({}, MENU_INPUT, { retry: ['KeyR', 'Pad3'], replay: ['KeyV', 'Pad2'] });
const st = { d: null, t: 0, focus: new Focus(), shown: 0, beats: null, saved: false };
export const resultsState = st;
export const resultsScene = {
  input: RES_INPUT, touch: [], camera: { zoom: false },
  enter(d) {
    st.d = d; st.t = 0; st.shown = 0; st.saved = false; st.focus.reset(d.next ? 0 : 1);
    if (ctx.session) ctx.session.noHud = true;
    const R = d.result, after = C.openState(); st.beats = d.before ? C.beatsFor(d.before, after) : [];
    const k = R.medal; ctx.music.sting(R.better && R.prevBest !== null ? 'record' : ['none', 'bronze', 'silver', 'gold', 'author'][k]);
    const pool = QUIPS[k] || QUIPS[0]; st.quip = pool[Math.floor(E.rng(R.steps)() * pool.length)];
    ctx.game.input.consumeAll();
    ctx.game.after(.9, () => { if (st.d === d) ctx.talk.scene([['coco', st.quip]], { modal: false, auto: 2.4, place: 'top' }); });
  },
  update(dt) {
    const I = ctx.game.input, d = st.d; st.t += dt;
    if (ctx.session && ctx.session.course === ctx.worlds.course) { rememberSteps(); raceUpdate(dt); }
    if (ctx.talk.update(dt)) return;
    // the coppers count up with ticks
    const R = d.result; if (R.coppers && st.t > 1.2 && st.shown < R.coppers) { const s0 = st.shown; st.shown = Math.min(R.coppers, st.shown + Math.max(1, R.coppers * dt * 1.5)); if (Math.floor(s0 / 10) !== Math.floor(st.shown / 10)) ctx.sound.sfx('coin'); }
    if (st.t < .35) return;
    if (I.pressed('retry')) return act('retry');
    if (I.pressed('replay')) return act('replay');
    if (I.pressed('cancel')) return act('menu');
    st.focus.set(buttons({ W: ctx.game.W || 427, H: ctx.game.H || 240 })); st.focus.update(dt, I);
  },
  draw(r) {
    if (ctx.session && ctx.session.course === ctx.worlds.course) raceDraw(r); else ctx.worlds.draw(r);
    const d = st.d, R = d.result, t = st.t;
    r.overlay(g => {
      E.px.blend(g, .5, 'normal', () => E.px.rect(g, 0, 0, r.W, r.H, '#05040a'));
      const x = r.W / 2;
      T2(g, d.track.name.toUpperCase(), x, 14, '#c8d8ff', 'center');
      bigText(g, fmt(R.steps), x, 34, 4, ['#ffffff', '#fff2c0', '#ffd060']);
      if (R.prevBest !== null && R.prevBest !== undefined) { const dl = R.steps - R.prevBest; T2(g, 'BEST ' + fmt(Math.min(R.prevBest, R.steps)), x - 8, 76, '#ffffff', 'right'); T2(g, fmt(dl, true), x + 8, 76, dl < 0 ? '#5ab4ff' : dl > 0 ? '#ff5a4a' : '#ffffff', 'left'); }
      else T2(g, 'FIRST FINISH', x, 76, '#ffffff', 'center');
      if (R.respawns) T1(g, R.respawns + ' RESPAWN' + (R.respawns > 1 ? 'S' : ''), x, 94, UI.dim, 'center');
      // the medal drops in (outBack) and shines
      const k = Math.min(1, Math.max(0, (t - .3) / .5)), e = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2), my = 128 - (1 - e) * 60;
      if (R.medal) { medal(g, x, my, R.medal, 14, Math.max(0, Math.sin(t * 3))); T2(g, MEDAL_NAME[R.medal] + (R.newMedal ? '!' : ''), x, my + 22, '#ffd060', 'center'); }
      else T2(g, 'NO MEDAL', x, my, UI.dim, 'center');
      const nt = nextTarget(Math.max(R.medal, R.wasMedal || 0), R.T); if (nt && Math.max(R.medal, R.wasMedal || 0) < 4) { medal(g, x - 46, 172, nt.medal, 5); T1(g, 'NEXT: ' + MEDAL_NAME[nt.medal] + ' ' + fmt(nt.steps), x - 36, 168, '#ffffff'); }
      if (R.coppers) { coin(g, x - 20, 190); T2(g, '+' + Math.floor(st.shown) + ' ¢', x - 10, 184, '#ffb070'); }
      st.focus.set(buttons(r)); st.focus.draw(g);
      promptBar(g, r, [['confirm', 'SELECT'], ['retry', 'RETRY'], ['replay', 'REPLAY'], ['cancel', 'MENU']]);
      drawToasts(g, r, 1 / 60);
    });
    ctx.talk.draw(r);
  }
};
function buttons(r) {
  const d = st.d, x = r.W / 2, B = [d.next && ['next', 'NEXT TRACK'], ['retry', 'RETRY'], ['replay', 'REPLAY'], ['save', st.saved ? 'SAVED' : 'SAVE REPLAY'], ['menu', 'MENU']].filter(Boolean);
  const bw = Math.min(100, (r.W - 24 - (B.length - 1) * 6) / B.length), x0 = x - (B.length * bw + (B.length - 1) * 6) / 2, by = r.H - 62;
  return B.map(([id, label], i) => ({ id, label, x: Math.round(x0 + i * (bw + 6)), y: by, w: Math.round(bw), h: 30, disabled: id === 'save' && st.saved, onPick: () => act(id), draw: (g2, q, foc, kk, tt) => tile(g2, q, foc, kk, tt, { labelY: 8 }) }));
}
function act(id) {
  const d = st.d, R = d.result, beats = st.beats || [];
  ctx.sound.sfx('confirm'); ctx.game.input.consumeAll();
  const withBeats = f => { if (beats.length) { st.beats = []; ctx.game.go('menu', { page: 'tracks', env: d.track.env, beats }); } else f(); };
  if (id === 'retry') withBeats(d.retry);
  else if (id === 'next') withBeats(d.next);
  else if (id === 'menu') ctx.game.go('menu', { page: d.kind === 'campaign' ? 'tracks' : 'main', env: d.track.env, beats });
  else if (id === 'replay') ctx.game.go('replay', { replay: replayOf(d), back: 'results', backData: d });
  else if (id === 'save' && !st.saved) { ctx.profile.addReplay(replayOf(d)); st.saved = true; toast('REPLAY SAVED'); }
}
export function replayOf(d) {
  const R = d.result, tr = d.track;
  return Object.assign({}, R.ghost, { track: tr.id, trackName: tr.name, env: tr.env, steps: R.steps, car: R.ghost.model, date: Date.now(), custom: d.custom ? tr.toJSON() : null });
}
