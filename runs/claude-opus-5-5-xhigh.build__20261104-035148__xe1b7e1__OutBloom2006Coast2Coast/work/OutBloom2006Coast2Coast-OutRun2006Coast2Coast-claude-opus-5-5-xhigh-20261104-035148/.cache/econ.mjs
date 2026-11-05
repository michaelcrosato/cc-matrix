import { boot } from '../tests/lib/boot.mjs';
const { OB } = boot(); const P = OB.Profile; P.reset(); for (const m of OB.MISSIONS) P.missionResult(m.id, { cleared: true, rank: 'A' }); console.log('after missions', P.data.seeds);
for (let i = 0; i < 6; i++) P.grant(190, 'run'); console.log('after runs', P.data.seeds);
for (const b of OB.BEDS) { const st = P.bedState(b), ok = P.buy(b.id); if (!ok) console.log('FAILED', b.id, st, b.cost, 'seeds', P.data.seeds); }
