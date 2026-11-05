// helpers for the suites: a fresh game, stepping, a fighter pair outside any scene
import { load } from './load.mjs';
export { load };
export const fresh = (o = {}) => { const L = load(o); L.game.fadeTime = 0; L.game.advance(.2); return L; };
export const steps = (game, n) => { for (let i = 0; i < n; i++) game.advance(1 / 120); };
/** two fighters on the mat (no scene, no bout): white at x0, red at x1 */
export const pair = (KC, x0 = 150, x1 = 250, a = 'taro', b = 'negi') => { const A = new KC.Karateka({ fid: a, side: 0, x: x0 }), B = new KC.Karateka({ fid: b, side: 1, x: x1 }); A.x = x0; B.x = x1; A.release(B); B.release(A); return [A, B]; };
export const tick = (KC, A, B, n = 1) => { for (let i = 0; i < n; i++) { A.update(1 / 120, B); B.update(1 / 120, A); KC.Bout.push(A, B); } };
export const hash = s => { s = JSON.stringify(s); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
