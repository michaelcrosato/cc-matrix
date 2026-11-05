// the AI Hub host and replica in one Node process: a host Session steps the world; its snapshots and event batches
// rebuild a replica; snapshots stay under the budget; finish() reports valid standings; commands round-trip
import { run } from './lib.mjs';
export default async t => {
  const { TC, step, game } = t.load(); step(1.2); const Net = TC.Net;
  const sent = [], fake = { time: () => 1000, send: (d, o) => { sent.push({ d, o }); return true; }, finish: f => { fake.finished = f; }, rng: () => () => .5, answer() {}, ready() {} };
  Net.hub = fake; Net.game = game; Net.players = [0, 1, 2].map(i => ({ id: i, name: 'P' + i, color: '#e8443a', agent: TC.AGENTS[i] })); Net.host = true; Net.server = false; Net.myIdx = 0; Net.me = 0; Net.stage = 1; Net.state = 'play'; Net.finished = false;
  Net.build(game); const host = Net.session.sim;
  let maxBytes = 0, snaps = 0;
  for (let k = 0; k < 120 * 40; k++) { Net.update(1 / 120); if (Net.sendT === 0 && k > 0) snaps++; }
  for (const m of sent) if (m.d.t === 's') maxBytes = Math.max(maxBytes, JSON.stringify(m.d).length);
  t.check('the host sends snapshots about 10 a second', sent.filter(m => m.d.t === 's').length >= 300, sent.filter(m => m.d.t === 's').length);
  t.check('every snapshot is at most 1,100 bytes', maxBytes <= 1100, maxBytes);
  t.check('snapshots are unreliable, events reliable', sent.every(m => m.d.t === 's' ? m.o.reliable === false : m.o.reliable !== false));
  const perSec = sent.length / 40; t.check('at most 20 messages a second', perSec <= 20, perSec);
  // a replica from the latest snapshot
  const rep = new TC.Sim({ mode: 'replica', stages: [1], stage: 1, players: Net.players, skipCuts: true, seed: 1 });
  const last = sent.filter(m => m.d.t === 's').pop().d; Net.apply(rep, last);
  t.check('the replica follows the scene and phase', rep.sceneIdx === host.sceneIdx && rep.phase === host.phase, rep.sceneId + ' ' + host.sceneId);
  t.check('the replica has the enemies', rep.enemies.length === Math.min(12, host.enemies.filter(e => !e.dead || e.deadT < 2.6).length), rep.enemies.length);
  t.check('scores replicate', rep.players.every((p, i) => p.score === host.players[i].score));
  // remote commands: a press and the latest input
  Net.onMessage({ t: 'in', a: [100, -200], c: 1, f: 0 }, 1); Net.onMessage({ t: 'pr', k: ['fire', 'next'] }, 1);
  const cmd = Net.remoteCmd(1); t.check('client input reaches the host', cmd.cover && cmd.fireP && cmd.next && Math.abs(cmd.aim[0] - .1) < 1e-9);
  // leaving and finishing
  Net.onLeave({ id: 2 }); t.check('a player who leaves drops out', host.players[2].left);
  Net.onTimeUp(); const f = fake.finished; t.check('time-up finishes the round', !!f);
  t.check('standings list players best first', f && f.standings.flat().length >= 2 && f.standings.every(g => Array.isArray(g)));
  t.check('stats and awards per player', f && Object.keys(f.stats).length >= 2 && f.awards.length === 3);
  Net.onEnd({ reason: 'finished' }); t.check('end stops the round', Net.state === 'over');
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
};
