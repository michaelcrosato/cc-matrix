import { boot } from '../tests/harness.mjs';
const h = boot(); const { O } = h; const C = O.CURL, T = O.tune.get('curling');
const sim = (w, aim = 0, spin = 0, others = []) => { const v0 = T.v0Base + T.v0Range * w, dy = C.TEE - 2, d = Math.hypot(aim, dy); const st = others.map(o => Object.assign({ vx: 0, vy: 0, v: 0, team: 1, out: false }, o)); st.push({ x: 0, y: 2, vx: v0 * aim / d, vy: v0 * dy / d, v: 1, spin, team: 0, out: false }); let t = 0; while (st.some(s => !s.out && s.v) && t < 60) { C.physStep(st, 1 / 60, T); t += 1 / 60; } return { st, t }; };
for (const w of [.4, .45, .52, .59, .66, .8]) { const { st, t } = sim(w); const s = st[st.length - 1]; console.log('w', w, 'stops y', s.y.toFixed(2), 'x', s.x.toFixed(2), 'out', s.out, 't', t.toFixed(1)); }
const c1 = sim(.59, 0, 1), c2 = sim(.59, 0, -1); console.log('curl +1 x', c1.st[0].x.toFixed(2), ' curl -1 x', c2.st[0].x.toFixed(2));
const tk = sim(.85, 0, 0, [{ x: 0, y: 27 }]); console.log('takeout: target out', tk.st[0].out, 'y', tk.st[0].y.toFixed(1));
