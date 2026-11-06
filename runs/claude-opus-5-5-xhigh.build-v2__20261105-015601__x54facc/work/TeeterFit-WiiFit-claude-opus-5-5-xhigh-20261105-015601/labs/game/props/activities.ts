/**
 * @file Props the activities bring on: buoys and the board, the slackline, the sand tray, marbles, hoops, step platforms
 * and floor tiles, the diving lip and score cards, counterweight carts and rails, Tare's little boat, the turtle.
 *
 * Game code, sim-side data.
 *
 * @example
 * // propFor(c, { prop: 'prop:buoy', position: [x, 2, z] });
 */
import { defineProp } from '../../../engine/sim-api';
import { box, cyl, limb, rbox, ring } from './kit';

/** Defines a prop with no body. */
const free = (id: string, description: string, parts: object[]) => defineProp(id, { description, parts } as never);

free('prop:buoy', 'A gate buoy: coral and white.', [
  cyl('float', 0.45, 0.28, 0.8, 'material:buoy', [0, -0.2, 0]),
  cyl('stripe', 0.3, 0.26, 0.2, 'material:buoyWhite', [0, 0.25, 0]),
  cyl('top', 0.05, 0.05, 1.1, 'material:slate', [0, 0.45, 0]),
  box('flag', 0.55, 0.34, 0.02, 'material:coral', [0.28, 1.15, 0]),
]);
free('prop:buoyNext', 'The next gate: lit.', [
  cyl('float', 0.45, 0.28, 0.8, 'material:ringGlow', [0, -0.2, 0]),
  cyl('top', 0.05, 0.05, 1.1, 'material:slate', [0, 0.45, 0]),
  box('flag', 0.55, 0.34, 0.02, 'material:ringGlow', [0.28, 1.15, 0]),
  ring('halo', 3.4, 3.7, 0, 'material:ringGlow', [0, 0.14, 0]),
]);
free('prop:paddleboard', 'A paddleboard: long, flat and optimistic.', [
  rbox('board', 0.75, 0.1, 3.2, 0.05, 'material:board'),
  box('pad', 0.56, 0.02, 1.1, 'material:mint', [0, 0.1, -0.1]),
  box('stripe', 0.1, 0.02, 3, 'material:coral', [0, 0.1, 0]),
]);
free('prop:slackPost', 'A slackline post on its rock.', [
  rbox('rock', 3.2, 2.2, 3.2, 0.7, 'material:rock', [0, -2.2, 0]),
  cyl('post', 0.13, 0.11, 2.2, 'material:palmTrunk'),
]);
free('prop:slackLine', 'Forty metres of slackline, along +Z, starting at its origin.', [
  box('line', 0.05, 0.03, 40, 'material:rope', [0, 0, 20]),
]);
free('prop:lineFlag', 'A flag at a slackline station.', [
  cyl('pole', 0.03, 0.03, 1.5, 'material:slate'),
  box('flag', 0.6, 0.36, 0.02, 'material:coral', [0.3, 1.1, 0]),
]);
free('prop:boat', "Tare's little boat: a white tub with a flag that reads the wind.", [
  rbox('hull', 1.3, 0.6, 2.6, 0.26, 'material:clinical', [0, -0.26, 0]),
  cyl('mast', 0.03, 0.03, 1.5, 'material:slate', [0, 0.2, -0.5]),
  box('flag', 0.6, 0.34, 0.02, 'material:coral', [0.3, 1.32, -0.5]),
]);
free('prop:turtle', 'A turtle, crossing, on its own schedule.', [
  rbox('shell', 1, 0.3, 1.2, 0.14, 'material:palmLeaf', [0, -0.05, 0]),
  rbox('head', 0.26, 0.18, 0.26, 0.08, 'material:mintDeep', [0, 0, 0.7]),
]);
free('prop:wake', 'The ferry wake: a long low swell.', [rbox('swell', 14, 0.3, 1.2, 0.14, 'material:wet')]);

// The tray and what lies on it: all relative to the tray's centre, its top at y 0.04. Half width 1.2 m.
free('prop:trayStand', 'The sand tray stand.', [
  cyl('stem', 0.18, 0.28, 0.85, 'material:clinical'),
  cyl('foot', 0.7, 0.7, 0.06, 'material:clinical'),
]);
free('prop:tray', 'A raked sand tray, seen from above.', [
  box('sand', 2.4, 0.04, 2.4, 'material:rakedSand'),
  box('rimN', 2.56, 0.1, 0.08, 'material:tray', [0, 0, -1.24]),
  box('rimS', 2.56, 0.1, 0.08, 'material:tray', [0, 0, 1.24]),
  box('rimW', 0.08, 0.1, 2.56, 'material:tray', [-1.24, 0, 0]),
  box('rimE', 0.08, 0.1, 2.56, 'material:tray', [1.24, 0, 0]),
  ...[-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9].map((z, i) =>
    box(`rake${i}`, 2.3, 0.006, 0.02, 'material:ridge', [0, 0.04, z]),
  ),
]);
free('prop:ridge', 'A sand ridge one metre long along +X, scaled by repeats.', [
  rbox('ridge', 1, 0.09, 0.07, 0.03, 'material:ridge'),
]);
free('prop:rake', 'A moving rake.', [rbox('bar', 0.8, 0.1, 0.07, 0.03, 'material:coral')]);
free('prop:holeMark', 'A hole in the sand: dark, with a thin ring.', [
  cyl('dark', 0.11, 0.11, 0.008, 'material:hole'),
  ring('lip', 0.11, 0.14, 0, 'material:brass', [0, 0.01, 0]),
]);
free('prop:marble', 'A marble.', [rbox('marble', 0.11, 0.11, 0.11, 0.055, 'material:marble')]);
free('prop:marbleRed', 'A coral marble.', [rbox('marble', 0.11, 0.11, 0.11, 0.055, 'material:marbleRed')]);
free('prop:marbleBlue', 'A blue marble.', [rbox('marble', 0.11, 0.11, 0.11, 0.055, 'material:marbleBlue')]);

free('prop:diveLip', 'The diving lip: a plank over the cliff.', [
  box('plank', 1.4, 0.14, 5, 'material:deck', [0, 0, 1.6]),
  box('support', 1.2, 0.8, 1.2, 'material:rock', [0, -0.8, -0.3]),
]);
free('prop:scoreCard', 'A judge’s score card.', [
  box('card', 0.6, 0.7, 0.04, 'material:card'),
  cyl('stick', 0.02, 0.02, 0.5, 'material:slate', [0, -0.5, 0]),
]);

free('prop:rail', 'A counterweight rail, along X.', [
  box('railN', 24, 0.1, 0.1, 'material:cart', [0, 0, -0.6]),
  box('railS', 24, 0.1, 0.1, 'material:cart', [0, 0, 0.6]),
  ...[-10, -5, 0, 5, 10].map((x, i) => box(`sleeper${i}`, 0.3, 0.06, 1.6, 'material:palmTrunk', [x, -0.04, 0])),
]);
free('prop:cart', 'A pebble cart on rails, with a crank.', [
  rbox('tub', 2, 0.9, 1.5, 0.12, 'material:cart', [0, 0.2, 0]),
  cyl('wheelA', 0.2, 0.2, 0.1, 'material:slate', [-0.7, 0, -0.75], [Math.PI / 2, 0, 0]),
  cyl('wheelB', 0.2, 0.2, 0.1, 'material:slate', [0.7, 0, -0.75], [Math.PI / 2, 0, 0]),
  cyl('wheelC', 0.2, 0.2, 0.1, 'material:slate', [-0.7, 0, 0.85], [Math.PI / 2, 0, 0]),
  cyl('wheelD', 0.2, 0.2, 0.1, 'material:slate', [0.7, 0, 0.85], [Math.PI / 2, 0, 0]),
  limb('crank', 1, 0.03, 0.03, 'material:brass', [1, 0.8, 0], [0, 0, -0.7]),
  ...[0, 1, 2, 3, 4].map((i) =>
    rbox(`load${i}`, 0.42, 0.22, 0.36, 0.09, `material:stone${i}`, [-0.6 + i * 0.3, 1.04, -0.3 + (i % 2) * 0.5]),
  ),
]);
free('prop:beam', 'The lighthouse beam: a long pale cone, drawn unlit.', [cyl('beam', 0.4, 7, 72, 'material:beam')]);
free('prop:terraceMark', 'The East Terrace marker: a rail and a pale ring.', [
  ring('line', 7.5, 7.9, 0, 'material:ringGlow', [0, 0.05, 0]),
  box('sign', 1.6, 0.8, 0.06, 'material:white', [0, 1.2, -7.8]),
  cyl('post', 0.05, 0.05, 1.2, 'material:slate', [0, 0, -7.8]),
]);
