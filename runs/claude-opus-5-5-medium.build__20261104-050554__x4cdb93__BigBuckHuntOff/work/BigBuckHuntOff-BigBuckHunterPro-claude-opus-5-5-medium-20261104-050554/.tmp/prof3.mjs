import { load } from '../tests/lib/load.mjs';
const { B } = load({ only: ['src/00-core.js', 'src/10-terrain.js', 'src/11-render.js', 'src/12-quadruped.js', 'src/13-props.js', 'src/20-hunts.js'] });
const w = B.loadWorld(process.argv[2]); const v = w.vantages[process.argv[3]];
console.log('vantage', v.x, v.y, 'gz', v.gz.toFixed(1), 'z', v.z.toFixed(1), 'yaw', (v.yaw / B.DEG).toFixed(0));
for (const b of [-30, 0, 30]) console.log('b', b, [5, 10, 20, 40, 60, 80, 100, 130, 160, 200].map(d => { const [x, y] = B.rel(v, b, d); return d + ':' + w.groundAt(x, y).toFixed(1) + '/' + w.topAt(x, y).toFixed(1) + '/' + w.typeAt(x,y); }).join(' '));
