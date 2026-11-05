/* ---- INTENTS: the only way anything drives a hero. { move: [x, y] (ground, length <= 1), aim: angle | null, fire,
   magic (pressed), plant }. Local input, the network and the bot all make them: one code path for play, demo and tests ---- */
const MOUSE_AIM_S = 3;
/** the intent of a local player's input this step */
function inputIntent(h, I) {
  const out = h.intent, m = I.move(), len = Math.min(1, Math.hypot(m[0], m[1]));
  if (len > .05) { const g = game.view.screenDirToGround(m[0], m[1]); out.move = [g[0] * len, g[1] * len]; } else out.move = [0, 0];
  let aim = null, mouseAim = false;
  if (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .25) { const g = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); aim = Math.atan2(g[1], g[0]); }
  else if (I === game.input && I.aimSource === 'mouse' && I.mouse.active && (I.clock - I.mouse.t < MOUSE_AIM_S || I.held.has('Mouse0'))) {
    const q = game.mouseGround(); if (q && Math.hypot(q[0] - h.x, q[1] - h.y) > 4) { aim = Math.atan2(q[1] - h.y, q[0] - h.x); mouseAim = true; h.aimAt = q; }
  }
  if (!mouseAim) h.aimAt = null;
  const stickFire = game.settings.stickFires && I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .5;
  out.aim = aim;
  out.fire = I.down('fire') || !!stickFire;
  // keyboard-only firing plants, as the arcade did: the hero stands, turns with the keys and keeps throwing
  const keyFire = I.down('fire') && !mouseAim && !aim && (I.lastDevice === 'keyboard');
  out.plant = I.down('plant') || keyFire;
  if (I.pressed('magic')) out.magic = true;
  return out;
}
/** an empty intent (menus open, the card, a cutscene) */
function idleIntent(h) { const i = h.intent; i.move = [0, 0]; i.fire = false; i.magic = false; i.plant = false; return i; }
