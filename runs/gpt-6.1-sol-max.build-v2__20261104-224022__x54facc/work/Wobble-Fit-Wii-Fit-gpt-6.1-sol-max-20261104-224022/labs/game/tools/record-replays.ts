/** @file Records initial goldens for the finished original activity rules and one entire day. */
import { writeFileSync } from 'node:fs';
import { createHeadless } from '../../../engine';
import { island } from '../scenes/island';
import { ACTIVITIES } from '../scenes/data/days';
import type { GameInspector } from '../ui/context';
type Recorder = GameInspector & { input: { record: () => Record<string, unknown> } };
for (const event of ACTIVITIES) {
  const h = (await createHeadless({ scene: island, seed: 11, settings: { 'game.auto': true } })) as Recorder;
  const zero = h.hash();
  if (event.id === 'tilt') h.actions.run('game.finale', { tick: 140 * 60 });
  else h.actions.run('game.start', { event: event.id });
  h.step(300);
  const replay = {
    ...h.input.record(),
    description: `Original ${event.title} rules, 5 seconds of the same balance pilot.`,
    hashes: { 'linux-x64': { '0': zero, '300': h.hash() } },
  };
  writeFileSync(`labs/game/replays/${event.id}.replay.json`, JSON.stringify(replay, null, 2) + '\n');
}
const h = (await createHeadless({
  scene: island,
  seed: 23,
  settings: { 'game.auto': true, 'game.pace': 8 },
})) as Recorder;
const hashes: Record<string, string> = { '0': h.hash() };
h.actions.run('game.begin');
h.step(1200);
hashes['1200'] = h.hash();
h.step(1400);
hashes['2600'] = h.hash();
writeFileSync(
  'labs/game/replays/day.replay.json',
  JSON.stringify(
    {
      ...h.input.record(),
      description:
        'Day one: the check, every pose, Still Pond, sleep, and the next morning. Accelerated pilot; initial original-content golden.',
      hashes: { 'linux-x64': hashes },
    },
    null,
    2,
  ) + '\n',
);
console.log('Recorded 14 original-content replays.');
