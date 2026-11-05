// CRACKMANIA UI art (PLAN §7.6): medal discs with letters (B S G A), the copper coin, flags, locks, the three
// environments' emblems, car silhouettes, block icons; drawn in pixels (px.*) at any size
import { E } from '../ctx.js';
const P = () => E.px;
export const MEDAL = [null, ['#c8783a', '#f0b078', 'B'], ['#b8c0d0', '#f4f8ff', 'S'], ['#e8b020', '#fff0a0', 'G'], ['#3ac0a8', '#b8fff0', 'A']];
export const MEDAL_NAME = ['NONE', 'BRONZE', 'SILVER', 'GOLD', "COCO'S TIME"];
export function medal(g, x, y, m, r = 7, shine = 0) {
  const px = P(), M = MEDAL[m];
  if (!M) { px.disc(g, x, y, r, '#2a2838'); px.disc(g, x, y, r - 1.5, '#3a384c'); return; }
  px.rect(g, x - r * .6, y - r * 1.9, r * .45, r * 1.1, '#2a6ae8'); px.rect(g, x + r * .15, y - r * 1.9, r * .45, r * 1.1, '#e8402a');
  px.disc(g, x, y, r + 1, '#1a1420'); px.disc(g, x, y, r, M[0]); px.disc(g, x - r * .2, y - r * .2, r * .62, M[1]); px.disc(g, x, y, r * .62, M[0]);
  E.font.text(g, M[2], x + 1, y - 3, '#1a1420', { align: 'center', outline: false });
  if (shine > 0) E.px.blend(g, .7 * shine, 'add', () => px.disc(g, x - r * .35, y - r * .35, r * .3, '#ffffff'));
}
export function coin(g, x, y, r = 5) { const px = P(); px.disc(g, x, y, r + 1, '#3a1a0a'); px.disc(g, x, y, r, '#c8682a'); px.disc(g, x, y, r - 1.5, '#e8904a'); E.font.text(g, 'c', x + 1, y - 4, '#5a2a10', { align: 'center', outline: false }); }
export function flag(g, x, y, s = 1, col = '#ffffff') { const px = P(); px.rect(g, x, y, 1, 10 * s, '#c8c8d0'); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) px.rect(g, x + 1 + i * 3 * s, y + j * 3 * s, 3 * s, 3 * s, (i + j) & 1 ? '#1a1a22' : col); }
export function lock(g, x, y, s = 1) { const px = P(); px.rect(g, x - 4 * s, y - 1 * s, 8 * s, 7 * s, '#c8a030'); px.rect(g, x - 3 * s, y - 5 * s, 1 * s + 1, 4 * s, '#c8c8d0'); px.rect(g, x + 2 * s - 1, y - 5 * s, 1 * s + 1, 4 * s, '#c8c8d0'); px.rect(g, x - 3 * s, y - 6 * s, 6 * s, 1 * s + 1, '#c8c8d0'); px.rect(g, x - 1, y + 1 * s, 2, 3 * s, '#5a4010'); }
export function emblem(g, env, x, y, s = 1) {
  const px = P();
  if (env === 'dustbowl') { px.disc(g, x, y, 9 * s, '#ff9a2a'); px.disc(g, x, y, 7 * s, '#ffd060'); px.rect(g, x - 1.5 * s, y - 7 * s, 3 * s, 13 * s, '#2a7a2a'); px.rect(g, x - 5 * s, y - 2 * s, 2 * s, 5 * s, '#2a7a2a'); px.rect(g, x - 5 * s, y + 2 * s, 4 * s, 2 * s, '#2a7a2a'); px.rect(g, x + 3 * s, y - 4 * s, 2 * s, 4 * s, '#2a7a2a'); px.rect(g, x + 1 * s, y, 4 * s, 2 * s, '#2a7a2a'); }
  else if (env === 'hedgerow') { px.disc(g, x, y, 9 * s, '#6ad04a'); px.disc(g, x, y + 1 * s, 6 * s, '#9ae070'); px.disc(g, x - 2 * s, y - 1 * s, 3.5 * s, '#c8f0a0'); px.disc(g, x + 2.5 * s, y + 1.5 * s, 3 * s, '#5ab040'); px.rect(g, x - .5, y - 7 * s, 1, 4 * s, '#3a7a2a'); }
  else { px.disc(g, x, y, 9 * s, '#6ad8ff'); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; px.line(g, x - Math.cos(a) * 7 * s, y - Math.sin(a) * 7 * s, x + Math.cos(a) * 7 * s, y + Math.sin(a) * 7 * s, '#ffffff', Math.max(1, Math.round(1.5 * s))); } px.disc(g, x, y, 2 * s, '#ffffff'); }
}
/** a car's side view (the garage's locked cars show it dark) */
export function carSide(g, model, x, y, s = 1, col = '#e8402a', dark = false) {
  const px = P(), c = dark ? '#1a1a24' : col, gl = dark ? '#101018' : '#2a3a4a', t = dark ? '#0a0a10' : '#1c1c20';
  if (model === 'coyote') { px.rect(g, x - 20 * s, y - 6 * s, 40 * s, 6 * s, c); px.poly(g, [[x - 8 * s, y - 6 * s], [x + 2 * s, y - 11 * s], [x + 9 * s, y - 11 * s], [x + 15 * s, y - 6 * s]], c); px.poly(g, [[x - 5 * s, y - 6 * s], [x + 3 * s, y - 10 * s], [x + 8 * s, y - 10 * s], [x + 12 * s, y - 6 * s]], gl); }
  else if (model === 'pebble') { px.rect(g, x - 17 * s, y - 7 * s, 34 * s, 7 * s, c); px.poly(g, [[x - 14 * s, y - 7 * s], [x - 12 * s, y - 13 * s], [x + 6 * s, y - 13 * s], [x + 12 * s, y - 7 * s]], c); px.poly(g, [[x - 11 * s, y - 7 * s], [x - 10 * s, y - 12 * s], [x + 5 * s, y - 12 * s], [x + 9 * s, y - 7 * s]], gl); px.rect(g, x - 18 * s, y - 14 * s, 6 * s, 2 * s, c); }
  else { px.rect(g, x - 19 * s, y - 8 * s, 38 * s, 8 * s, c); px.rect(g, x - 14 * s, y - 15 * s, 22 * s, 7 * s, c); px.rect(g, x - 12 * s, y - 14 * s, 18 * s, 5 * s, gl); px.rect(g, x - 16 * s, y - 17 * s, 26 * s, 1 * s + 1, '#2a2a30'); }
  for (const wx of model === 'pebble' ? [-11, 11] : [-12, 12]) { px.disc(g, x + wx * s, y, (model === 'moose' ? 5.5 : 4.5) * s, t); px.disc(g, x + wx * s, y, 2 * s, dark ? '#202028' : '#c8c8d0'); }
}
