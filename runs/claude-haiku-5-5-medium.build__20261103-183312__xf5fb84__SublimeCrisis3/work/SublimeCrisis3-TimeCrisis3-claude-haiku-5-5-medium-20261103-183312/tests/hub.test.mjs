// The AI Hub shared-world suite (plan 4.19): the host's snapshot fits the 1,100-byte budget with four players and a full
// area, and a replica applies it to the same world. Headless: the host and the replica are two Sims, with the play's
// shape that the hub code reads.
import { load } from './lib.mjs';

export function run(check) {
  const { TC, E, ctx } = load();
  // The hub's client is not in Node: a stub with the calls the game makes (sent messages and the finish are recorded).
  const stub = { sent: [], finished: null, send(m) { this.sent.push(m); return true; }, finish(o) { this.finished = o; }, time: () => 0, on() {}, active: true };
  ctx.AIHub = stub;
  const hostSim = new TC.Sim({ stage: 1, seed: 11, difficulty: 'Normal', players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }] });
  const repSim = new TC.Sim({ stage: 1, seed: 11, difficulty: 'Normal', players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }] });
  const host = { sim: hostSim, seats: hostSim.players.map(() => ({})), aims: hostSim.players.map(() => [0.1, -0.2]) };
  const rep = { sim: repSim, seats: repSim.players.map(() => ({})), aims: repSim.players.map(() => [0, 0]) };
  TC.Hub.me = 1;

  // Let the host's area fill up with enemies, then encode it.
  for (let i = 0; i < 120 * 6; i++) hostSim.step(TC.DT, []);
  for (let k = 0; k < 40; k++) { const e = hostSim.spawn('deckhand', hostSim.scene.nests[k % hostSim.scene.nests.length].id); e.state = 'aim'; e.exposed = true; }
  const snap = TC.Hub.snapshot(host);
  const bytes = JSON.stringify(snap).length;
  check('the snapshot fits the 1,100-byte budget with four players and 40 enemies', bytes <= 1100, `${bytes} bytes`);
  check('the snapshot keeps all four players', snap.p.length === 4, '');

  // The replica takes the snapshot: lives, score, cover and the enemies (by id, each with its rig).
  hostSim.players[0].lives = 2; hostSim.players[0].score = 4321;
  const snap2 = TC.Hub.snapshot(host);
  TC.Hub.applySnap(rep, snap2);
  check('the replica takes the host\'s lives and score', rep.sim.players[0].lives === 2 && rep.sim.players[0].score === 4321, '');
  check('the replica has the enemies, each with a rig', rep.sim.enemies.length > 0 && rep.sim.enemies.every(e => !!e.rig), `${rep.sim.enemies.length}`);
  check('the replica keeps its own reticle', rep.sim.players[1].aim[0] === 0 && rep.sim.players[1].aim[1] === 0, JSON.stringify(rep.sim.players[1].aim));
  check('the replica takes the scene and the phase', rep.sim.scene.id === hostSim.scene.id && rep.sim.phase === hostSim.phase, '');

  // A remote seat's command from the network: the latest aim and the presses, consumed once.
  TC.Hub.inputs[2] = { aim: [0.3, 0.1], fire: true, cover: false };
  TC.Hub.presses[2] = ['fire', 'reload'];
  const c1 = TC.Hub.netCommand(host, 2);
  const c2 = TC.Hub.netCommand(host, 2);
  check('a remote seat\'s presses are consumed once', c1.firePressed && c1.reload && !c2.firePressed && !c2.reload, JSON.stringify(c2));
  check('a remote seat\'s aim and fire come from its latest input', c1.fire && c1.aim[0] === 0.3, JSON.stringify(c1));

  // The round's standings: equal scores tie; the awards go to the best.
  hostSim.players[1].score = 4321;
  TC.Hub.finishRound(hostSim, true);
  const sent = stub.finished;
  check('the standings group equal scores', sent && sent.standings.some(g => g.length > 1), JSON.stringify(sent && sent.standings));
  check('the finish carries awards and stats', sent && sent.awards.length >= 2 && sent.stats && sent.won === true, '');
  void E;
}
