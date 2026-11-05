import { load } from '../tests/lib/vm.mjs';
const { SN, game } = load({ quiet: true }); await game.booted;
const U = 16, K = SN.getTrack('karakum'), J = K.jumps[0];
for (const ms of [60, 75, 90]) {
const R = new SN.Race({ track: K, mode: 'race', cls: 'STORM', laps: 9, seed: 1, entrants: [{ pilot: 'vale', team: 'kestrel', control: 'human', pi: 0 }], intro: false, flyingStart: true, rules: { weapons: false }, record: false });
const s = R.player; s.putOn(K, J.s0 - 12 * U, K.line(J.s0 - 12 * U), ms * U);
const log = [];
for (let k = 0; k < 240; k++) { R.setControls(0, SN.Controls.blank()); R.step(1/120); const ev = R.events.map(e => e.t).filter(t => t !== 'scrape'); if (k % 12 === 0 || ev.length) log.push([k, Math.round(K.dS(J.s0, s.s)/U), Math.round(s.h), s.grounded ? 'G' : 'A', s.belowDeck ? 'BD' : '', Math.round(s.speed/U), ev.join(',')].join(' ')); }
console.log(ms, 'gap m', Math.round(K.dS(J.s0, J.s1)/U), 'z0', J.z0/U, 'z1', J.z1/U); console.log(log.slice(0, 22).join('\n'));
}
