import { boot } from '../tests/lib/boot.mjs';
const { OB, game } = boot(); game.advance(10.6);
OB.bus.on('*', (e, n) => { if (/fork|stage:enter|attract|checkpoint|run:|goal|req:/.test(n)) console.log(game.real.toFixed(1), OB.Attract.phase, n, JSON.stringify(e).slice(0, 80)); });
for (let i = 0; i < 50; i++) { game.advance(1); const r = OB.Race.current; if (i % 5 === 0 && r) console.log('  ', game.real.toFixed(0), game.sceneName, OB.Attract.phase, r.p1.stage, Math.round(r.p1.car.z / 200), 'jA', r.p1.road.junctionAt / 200, 'v', Math.round(r.p1.car.v)); }
