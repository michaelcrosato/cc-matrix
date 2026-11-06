/**
 * @file Writes the game's replays as readable change-points (PLAN.md section 16): one short per activity, played by the
 * human-like bot, and one for a whole day. Then record their goldens with `node x replay labs/game/replays --browser sim
 * --update`, and say why when you do it again.
 * Usage, from the dev folder: node labs/game/tools/make-replays.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'labs/game/replays';
mkdirSync(DIR, { recursive: true });

/** One replay's text. */
function replay(description, steps, inputs, settings = {}) {
  return {
    format: 'my3dge-replay/1',
    description,
    scene: 'game:island',
    settings: { 'game.skill': 'human', ...settings },
    seed: 7,
    hz: 60,
    steps,
    inputs,
    hashes: {},
  };
}

for (const id of [
  'morning',
  'poseA',
  'pond',
  'reps',
  'step',
  'line',
  'paddle',
  'garden',
  'plunge',
  'hoop',
  'jog',
  'group',
  'tilt',
]) {
  const inputs = [
    [0, { dev: 'game.begin', args: {} }],
    [1, { dev: 'game.start', args: { event: id } }],
    [1, { set: { 'game.botSeat': true } }],
  ];
  writeFileSync(
    `${DIR}/${id}.replay.json`,
    `${JSON.stringify(replay(`${id}: the first 15 seconds, as the human-like bot plays it.`, 900, inputs))}\n`,
  );
}
const day = [
  [0, { dev: 'game.begin', args: {} }],
  [1, { set: { 'game.auto': true } }],
];
writeFileSync(
  `${DIR}/day1.replay.json`,
  `${JSON.stringify(replay('Day 1, the whole of it, as the director and the human-like bot play it.', 20000, day))}\n`,
);
