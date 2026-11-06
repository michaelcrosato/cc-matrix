/**
 * @file The few props a hub session needs: mats, the Pavilion, the sea and the lawn. The engine draws a batch for every
 * registered prop, so a session's scene registers only these and boots inside the hub's deadline.
 *
 * Game code, sim-side data.
 *
 * @example
 * // spawnProp(w, { prop: 'prop:mat.red', at: [0, 8, 0], yaw: 0 });
 */
import { defineProp } from '../../../engine/sim-api';
import { box, cyl, rbox, ring } from './kit';

/** Defines a prop with no body. */
const free = (id: string, description: string, parts: object[]) => defineProp(id, { description, parts } as never);

for (const name of ['plain', 'red', 'blue', 'green', 'gold']) {
  free(`prop:mat.${name}`, `An exercise mat, ${name}.`, [rbox('mat', 1.1, 0.04, 2, 0.02, `material:mat.${name}`)]);
}

/** The Pavilion's pillars. */
const pavilionPillars = [-11, -5.5, 0, 5.5, 11].flatMap((x, i) => [
  cyl(`pillarN${i}`, 0.22, 0.2, 4.6, 'material:clinical', [x, 0, -8]),
  cyl(`pillarS${i}`, 0.22, 0.2, 4.6, 'material:clinical', [x, 0, 8]),
]);

free('prop:pavilion', 'The Pose Pavilion: white floor, slim pillars, a frustum roof, pale curtains, open sides.', [
  box('floor', 25, 0.1, 18, 'material:floorWhite'),
  ...pavilionPillars,
  box('beam', 25, 0.3, 17.4, 'material:clinical', [0, 4.6, 0]),
  cyl('roof', 16, 2, 2.6, 'material:mint', [0, 4.9, 0], [0, Math.PI / 4, 0], '#ffffff', false),
  box('curtainW', 0.06, 4.2, 15, 'material:curtain', [-12.2, 0.3, 0]),
  box('curtainE', 0.06, 4.2, 15, 'material:curtain', [12.2, 0.3, 0]),
  box('curtainN', 24, 4.2, 0.06, 'material:curtain', [0, 0.3, -8.4]),
]);

free(
  'prop:skirt',
  'A ring of haze at the end of the world: past the fog, so it is the fog, and the horizon has no edge.',
  [ring('haze', 960, 961, 400, 'material:skirt', [0, -150, 0])],
);
free('prop:sea', 'The sea: one huge flat prop that drifts, so the baked ripples live.', [
  box('water', 16000, 0.1, 16000, 'material:seawater'),
]);

free('prop:stepBlock', 'A step platform.', [
  rbox('block', 1.5, 0.22, 1.2, 0.04, 'material:clinical'),
  box('top', 1.3, 0.02, 1, 'material:mint', [0, 0.22, 0]),
]);
