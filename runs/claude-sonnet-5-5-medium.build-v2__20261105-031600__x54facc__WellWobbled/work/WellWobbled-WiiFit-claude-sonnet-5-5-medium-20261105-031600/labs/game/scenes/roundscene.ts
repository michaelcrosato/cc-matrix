/**
 * @file The scene `game:round`, the hub session's small scene: just the pavilion, four mats and Plumb, so it boots inside the hub's
 * 20 s deadline. The local guest takes mat 0 and plays the dealt Round (round.ts) on its own seeded copy; the other
 * players are `ghost` actors on the neighbouring mats, posed from the messages the page feeds through the custom intent
 * `game:ghosts` (flat groups of slot, cobx, coby, class, alive) and tinted in their seat colour (bodies ghost0-3). On
 * `round.go` the round starts. Sim-side.
 * @example
 * // ?scene=game:round&seed=7
 */
import { addBox, createCharacter, defineScene, physicsOf, spawnActor, type Intents } from '../../../engine/sim-api';
import { setPose, spawnCast, spawnGuest, spawnPerson } from './cast';
import { ACT, CAST, FLOW, GHOST, ISLAND, MARK, ROUND, type Comps } from './components';
import { STATIONS, groundAt } from './data/world';
import { activitySystem, botStep } from './events/runner';
import { matOf, startRound } from './round';
import { BUILD_IDS } from '../cast/builds';
import { stand } from './spawn';
import { paramsOf, readSeatFrom, stepSeatsOf } from './seatio';
import { SEAT, WOBBLE } from './wobble';
import '../cast/props';
import '../cast/builds';
import './settings';

void [ACT, CAST, FLOW, GHOST, ISLAND, MARK, ROUND, SEAT, WOBBLE, addBox, spawnActor, createCharacter, spawnCast];
export const roundScene = defineScene<Comps>('game:round', {
  description: 'The hub ghost round: the pavilion, four mats, Plumb; the local guest plays, the others are ghosts.',
  physics: true,
  setup(w) {
    const p = STATIONS.pavilion;
    const y = p.y;
    physicsOf(w).addBody({
      type: 'fixed',
      group: 'world',
      position: [p.at[0], y - 0.5, p.at[1]],
      colliders: [{ shape: { type: 'box', size: [80, 1, 80] } }],
    } as never);
    w.spawn({ flow: { mode: 'roam', day: 5 }, island: {}, round: {} });
    stand(w, 'prop:pavilionRoof', p.at[0], p.at[1], 0, y + 3.2);
    for (const [dx, dz] of [
      [-7, -7],
      [7, -7],
      [-7, 7],
      [7, 7],
    ])
      stand(w, 'prop:pavilionPillar', p.at[0] + dx, p.at[1] + dz, 0, y);
    for (let i = 0; i < 4; i++) stand(w, 'prop:mat', matOf(i)[0], matOf(i)[2], 0, y);
    spawnPerson(w, 'plumb', 'body:plumb', BUILD_IDS.plumb, p.at[0], p.at[1] + 6, 1.5, Math.PI);
    spawnGuest(w, 0, 0, false);
    for (let i = 1; i < 4; i++) {
      const m = matOf(i);
      const id = spawnPerson(w, `ghost${i}`, `body:ghost${i}`, BUILD_IDS.guest[i % 3], m[0], m[2], 1, 0);
      void id;
      w.spawn({ ghost: { x: m[0], y: m[1], z: m[2], slot: i, alive: 0 } });
    }
    w.systems.add('game.wobble', (ww) => stepSeatsOf(ww as never), { phase: 'ai' });
    w.systems.add('game.activity', (ww) => activitySystem(ww as never), { phase: 'rules' });
    w.systems.add('game.ghosts', (ww, it: Intents) => ghosts(ww as never, it), { phase: 'anim' });
    void groundAt;
    void paramsOf;
  },
  step(w, it) {
    readSeatFrom(w as never, it);
    botStep(w as never);
  },
  actions: {
    'round.go': (w) => startRound(w, 1, false),
    'game.bot': (w, args) => {
      w.query('flow')[0].flow.bot = String((args as { kind?: string }).kind ?? '');
    },
  },
});
/** Poses the ghost actors from the page's messages. */
function ghosts(w: Parameters<typeof setPose>[0], it: Intents): void {
  const raw = (it as unknown as Record<string, unknown>)['game:ghosts'];
  const a = Array.isArray(raw) ? (raw as number[]) : [];
  const by = new Map<number, number[]>();
  for (let i = 0; i + 4 < a.length; i += 5) by.set(a[i], a.slice(i, i + 5));
  for (const e of w.query('cast')) {
    const m = /^ghost(\d)$/.exec(e.cast.who);
    if (!m) continue;
    const slot = Number(m[1]);
    const g = by.get(slot);
    if (g) setPose(w, e.id, '', 0, g[1], g[2]);
  }
}
export default roundScene;
