// CRACKMANIA interlude cards over the world (standings, "pass the controller", podiums, Survival's rounds): a drawing,
// a prompt bar, confirm and back; the world behind keeps its last picture (or the session's camera keeps moving)
import { ctx, E } from '../ctx.js';
import { MENU_INPUT } from '../input.js';
import { update as raceUpdate, draw as raceDraw, rememberSteps } from './race.js';
import { promptBar } from '../ui/glyphs.js';
import { drawToasts } from '../ui/kit.js';
let C = null;
/** show a card: { draw(g, r, t), prompts: [[action, word]], onConfirm, onBack, onSecondary, live: true (the race keeps running behind), music, min: seconds before a press counts } */
export function card(o) { C = Object.assign({ t: 0, prompts: [['confirm', 'CONTINUE']], min: .4 }, o); ctx.game.go('card', null, { fade: o.fade ?? .2 }); }
export const cardScene = {
  input: MENU_INPUT, touch: [], camera: { zoom: false },
  enter() { ctx.game.input.consumeAll(); if (C && C.music) ctx.music.play(C.music); if (C && C.enter) C.enter(); },
  update(dt) {
    if (!C) return; C.t += dt; const I = ctx.game.input;
    if (C.live && ctx.session && ctx.session.course === ctx.worlds.course) { rememberSteps(); raceUpdate(dt); }
    if (ctx.talk.update(dt)) return;
    if (C.update) C.update(dt);
    if (C.t < C.min) return;
    const ck = I.clicked && I.clicked();
    if ((I.pressed('confirm') || I.pressed('start') || (ck && !C.noClick)) && C.onConfirm) { I.consumeAll(); ctx.sound.sfx('confirm'); C.onConfirm(); }
    else if (I.pressed('cancel') && C.onBack) { I.consumeAll(); ctx.sound.sfx('back'); C.onBack(); }
    else if (I.pressed('secondary') && C.onSecondary) { I.consumeAll(); C.onSecondary(); }
  },
  draw(r) {
    if (ctx.session && ctx.session.course === ctx.worlds.course) raceDraw(r); else ctx.worlds.draw(r);
    r.overlay(g => { E.px.blend(g, C && C.dim !== undefined ? C.dim : .55, 'normal', () => E.px.rect(g, 0, 0, r.W, r.H, '#05040a')); if (C && C.draw) C.draw(g, r, C.t); if (C && C.prompts) promptBar(g, r, C.prompts); drawToasts(g, r, 1 / 60); });
    ctx.talk.draw(r);
  }
};
