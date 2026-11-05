import { boot } from '../tests/lib/boot.mjs';
const H = { active: true, h: {}, t: -Infinity, results: [], sent: [], connect() { return Promise.resolve({ me: 0, players: [{ id: 0, name: 'A', color: '#e8443a' }], seed: 7 }); }, ready() {}, answer() {}, on(e, f) { (this.h[e] = this.h[e] || []).push(f); }, emit(e, ...a) { for (const f of this.h[e] || []) f(...a); }, time() { return this.t; }, send(d) { this.sent.push(d); }, progress() {}, result(r) { this.results.push(r); }, rng() { return () => .5; } };
const { OB, game } = boot({ aihub: H }); game.advance(.2); await new Promise(r => setTimeout(r, 0)); H.t = 0; H.emit('start', {}); game.advance(4);
const r = OB.Race.current, d = r.p1; console.log('phase', r.phase, 'scene', game.sceneName, 'hubphase', OB.Hub.phase);
r.place(d, 'S5', OB.World.stage('S5').sprintZ - 600, 0); d.routeIdx = 2; d.car.v = 200; d.input = null; d.brain = new OB.Brain({});
for (let i = 0; i < 240; i++) { H.t += 8; game.advance(1 / 120); }
console.log('finished', d.finished, 'z', d.car.z, 'fz', r.finishZ(d), 'isLast', r.isLastStage(d), 'results', JSON.stringify(H.results), 'phase', r.phase, game.sceneName, game.errors.map(e => e.message));
