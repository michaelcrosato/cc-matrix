import { makeStub } from './headless.mjs';
import { GrandHold } from '../src/events/grandHold.js';
const game = await makeStub();
const ev = new GrandHold(game, { tier: 0, seed: 4, lanes: [{ kind: 'bot', skill: 'sharp' }] }); ev.begin(); for (let i = 0; i < 600; i++) ev.fixed(1 / 120); const l = ev.lanes[0]; ev.fallLane(l); for (let i = 0; i < 250; i++) ev.fixed(1 / 120);
const step = (n) => { try { for (let k = 0; k < n; k++) ev.pw.step(); return 'ok'; } catch (e) { return 'PANIC'; } };
console.log('fallT', l.fallT); try { l.rag.end(); console.log('rag.end ok'); } catch (e) { console.log('rag.end panic'); }
console.log('step after end', step(2)); try { l.bal.recover(l.x, 0); console.log('recover ok'); } catch (e) { console.log('recover panic'); } console.log('step after recover', step(3));
try { ev.onRecover(l); console.log('onRecover ok'); } catch (e) { console.log('onRecover panic', String(e).slice(0, 40)); } console.log('step', step(3));
const b = l.bal; console.log('body', JSON.stringify(b.body.translation()), JSON.stringify(b.body.rotation()), 'foot', JSON.stringify(b.foot.translation()), 'fx', b.fx, b.fz, 'footBase', JSON.stringify(b.footBase), 'enabled', b.body.isEnabled());
console.log('bodies', ev.pw.world.bodies.len(), 'joints', ev.pw.world.impulseJoints.len(), 'colliders', ev.pw.world.colliders.len());
