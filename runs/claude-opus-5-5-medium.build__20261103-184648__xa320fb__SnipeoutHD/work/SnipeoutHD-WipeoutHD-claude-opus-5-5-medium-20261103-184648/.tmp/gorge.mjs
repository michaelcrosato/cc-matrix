import { load } from '../tests/lib/vm.mjs';
const ctx = load(), SN = ctx.SN;
const T = SN.getTrack('karakum'), j = T.jumps[0];
const R = new SN.Race({ track: 'karakum', mode: 'timetrial', cls: 'storm', laps: 3, seed: 1, entrants: [{ pilot: 'ingrid', team: 'kestrel', control: 'human', player: 0 }], intro: false }); R.state = 'racing'; R.t = 0;
const sh = R.humans[0]; SN.Ship.place(sh, R, SN.wrap(j.a - 60 * 16, T.L), 0, 52 * 16); sh.st.top = 3000; R.getHuman = () => ({ thrust: 1, analog: true });
console.log('lip', j.a.toFixed(0), 'far', j.b.toFixed(0), 'zLip', (j.zLip/16).toFixed(1), 'z1', (j.z1/16).toFixed(1));
for (let i = 0; i < 120 * 3; i++) { R.step(1 / 120); if (i % 12 === 0) console.log(i, 's', sh.s.toFixed(0), 'h', sh.h.toFixed(0), 'z', (sh.P[2]/16).toFixed(1), 'v', (SN.Ship.speed(sh)/16).toFixed(1), 'gr', sh.grounded, 'kind', T.kind[T.idx(sh.s)], 'resc', sh.rescueT.toFixed(1)); }
