// Scenes are single objects reused on every visit. For each one: enter it, note its own simple state, play it with random
// input for a while, leave, enter it again, and require the same state as the first fresh entry (nothing left over).
import { load } from '../lib/load.mjs';
const VISITS = [
  ['title', null], ['menu', null], ['exhibition', null], ['howto', { from: 'menu' }], ['about', { from: 'menu' }], ['invitation', null], ['charselect', null],
  ['map', null], ['location', { loc: 'beach' }], ['location', { loc: 'pool' }], ['location', { loc: 'promenade' }], ['location', { loc: 'villa' }], ['location', { loc: 'casino' }],
  ['shop', { shop: 'coral', from: 'promenade' }], ['wardrobe', { from: 'villa' }], ['journal', { from: 'villa' }], ['album', { from: 'menu' }],
  ['casino', { station: 'slots' }], ['casino', { station: 'blackjack' }], ['casino', { station: 'roulette' }], ['casino', { station: 'cashier' }], ['poolhop', { from: 'pool' }],
  ['credits', null], ['vresults', null], ['cutscene', { id: 'arrival' }], ['cutscene', { id: 'tutorialDone', won: true }], ['cutscene', { id: 'party' }]
];
const RANDOM = new Set(['msg', 'quip', '_qs', 'fwT']);   // greetings and firework timing picked at random, on purpose
const simple = sc => { const o = {}; for (const k of Object.keys(sc)) { const v = sc[k]; if (RANDOM.has(k)) continue; if (v === null || ['number', 'boolean', 'string'].includes(typeof v)) o[k] = v; } return o; };
export default function (t) {
  const { game, G } = load({});
  game.advance(.3); const T = G.debugTools, I = game.input, keys = ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'alt', 'extra', 'tabL', 'tabR', 'play', 'shot', 'dive', 'interact', 'bag', 'hopA', 'hopB', 'reel1', 'hit', 'stand'];
  let r = 0; const rnd = () => (r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const fresh = (name, data) => { G.state = null; G.ensureState('tess'); G.state.slot = name === 'location' && data.loc === 'casino' || name === 'casino' ? 2 : 1; G.slotStart(); for (const o of G.overlay.list.slice()) if (o.id !== 'toasts') G.overlay.remove(o); game.timeScale = 1; game.go(name, data, { fade: 0 }); game.advance(.05); return simple(game.scene); };
  for (const [name, data] of VISITS) {
    const label = name + (data ? ' ' + JSON.stringify(data) : '');
    const a = fresh(name, data);
    for (let i = 0; i < 36; i++) { const k = keys[Math.floor(rnd() * keys.length)]; if (I.map[k]) I.tap(k); if (G.talk && G.talk.open) I.tap('confirm'); game.advance(.1); }
    game.go('title', null, { fade: 0 }); game.advance(.05);
    const b = fresh(name, data), diff = Object.keys(Object.assign({}, a, b)).filter(k => a[k] !== b[k] && !(typeof a[k] === 'number' && typeof b[k] === 'number' && Math.abs(a[k] - b[k]) < 1e-6));
    t.ok('revisit resets ' + label, !diff.length, diff.map(k => k + ': ' + a[k] + ' then ' + b[k]).join(', '));
  }
  t.ok('no errors', !game.errors.length, game.errors.slice(0, 3).map(e => (e.where || '') + ' ' + e.message).join(' | '));
}
