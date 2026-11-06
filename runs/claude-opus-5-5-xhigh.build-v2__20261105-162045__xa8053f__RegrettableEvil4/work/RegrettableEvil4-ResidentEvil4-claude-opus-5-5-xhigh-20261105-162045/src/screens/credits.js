// The end: credits over black, with the on-hold jingle.
import { app } from '../core/app.js';
import { TITLE, TAGLINE } from '../config.js';
import { CREDITS } from '../data/about.js';
import { SONGS } from '../audio/songs.js';
import { clearSave } from '../core/save.js';

const LINES = [
  [TITLE, 3, 'sand'], ['', 1], [TAGLINE, 1, 'mist'], ['', 1], ['', 1],
  ['MAX RANSOM', 2, 'white'], ['FIELD ADJUSTER, OSTRANDER MUTUAL', 1, 'mist'], ['', 1],
  ['DAME OTTOLINE VANE', 2, 'white'], ['POLICYHOLDER, PATRON, CRITIC', 1, 'mist'], ['', 1],
  ['COMMODORE ANSELM THOLE', 2, 'white'], ['RADIO, FINALLY OFF THE AIR', 1, 'mist'], ['', 1],
  ['MR. FATHOM', 2, 'white'], ['NO REFUNDS', 1, 'mist'], ['', 1],
  ['MR. PYM', 2, 'white'], ['PLEASE HOLD', 1, 'mist'], ['', 1], ['', 1],
  ...CREDITS.map((c) => [c, 1, 'mist']),
  ['', 1], ['', 1], ['YOUR CALL IS IMPORTANT TO OSTRANDER MUTUAL.', 1, 'sand'], ['', 1], ['PLEASE HOLD.', 2, 'sand'],
];

export function openCredits(area) {
  let y = 0;
  app.mix.play(SONGS.onhold, 'onhold', 0.2);
  const screen = {
    frozen: true,
    name: 'credits',
    finish() { app.closeAll(); clearSave(); app.scenes.title(); },
    update(ctx, ui) {
      const { hud, W, H } = ui;
      ctx.hud.clear();
      hud.rect(0, 0, W, H, 'ink');
      y += ui.dt * 22 * (ui.held.down > 0 || ctx.input.isDown('PadCross', 'Space') ? 4 : 1);
      if (ui.nav.wheel) y += ui.nav.wheel * 24;
      let cy = H - y;
      for (const [text, scale, color] of LINES) {
        const lines = text.length > 74 ? text.match(/.{1,70}(\s|$)/g) : [text];
        for (const l of lines) {
          if (cy > -20 && cy < H) ui.centerText(Math.round(cy), l.trim(), { scale, color: color ?? 'white', shadow: false });
          cy += 9 * scale + 2;
        }
      }
      if (cy < -10 || ui.nav.back) screen.finish();
      ui.promptBar([['back', 'FINISH']]);
    },
  };
  app.open(screen);
  return screen;
}
