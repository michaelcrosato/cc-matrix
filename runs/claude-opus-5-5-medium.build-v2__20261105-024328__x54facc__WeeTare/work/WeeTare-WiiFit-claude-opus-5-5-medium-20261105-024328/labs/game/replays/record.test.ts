/**
 * @file Records the golden replays when asked: `WT_RECORD=1 npx vitest run labs/game/replays`, then
 * `node x replay labs/game/replays --browser sim --update` writes their hashes. One short replay per activity and one whole day,
 * played by the bot through the same scene actions a menu sends, so a replay holds every pick. Without WT_RECORD it only checks
 * that a replay exists for each.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createHeadless, type Headless } from '../../../engine';
import { island } from '../scenes/island';
import { round } from '../scenes/round';

const ACTIVITIES = [
  'check',
  'poseA',
  'poseB',
  'poseC',
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
];
const here = 'labs/game/replays';

type Runner = Headless & { actions: { run(name: string, args?: unknown): void }; input: { record(): unknown } };
const text = (engine: Runner) => {
  const out = engine.input.record();
  return typeof out === 'string' ? out : JSON.stringify(out, null, 1);
};
const flowOf = (e: Headless) => (e.state('flow').entities[0] as unknown as { flow: { day: number } }).flow;

describe.runIf(process.env.WT_RECORD)('recording', () => {
  for (const id of ACTIVITIES) {
    it(
      id,
      async () => {
        const engine = (await createHeadless({ scene: island, seed: 11 })) as Runner;
        engine.actions.run('game.begin', {});
        engine.actions.run('game.bot', { skill: 'human' });
        engine.actions.run('game.start', { id });
        engine.step(600);
        writeFileSync(`${here}/${id}.replay.json`, text(engine));
      },
      120000,
    );
  }
  it('a whole day', async () => {
    const engine = (await createHeadless({ scene: island, seed: 12 })) as Runner;
    engine.actions.run('game.begin', {});
    engine.actions.run('game.drive', { skill: 'perfect' });
    while (flowOf(engine).day === 1) engine.step(60);
    writeFileSync(`${here}/day1.replay.json`, text(engine));
  }, 300000);
  it('a round', async () => {
    const engine = (await createHeadless({ scene: round, seed: 13 })) as Runner;
    engine.actions.run('round.seat', { me: 0, players: [0, 1] });
    engine.step(5);
    engine.actions.run('game.bot', { skill: 'human' });
    engine.actions.run('round.go');
    engine.step(900);
    writeFileSync(`${here}/round.replay.json`, text(engine));
  }, 120000);
});

describe('the goldens', () => {
  it('has a replay for every activity, a day and a round', () => {
    for (const id of [...ACTIVITIES, 'day1', 'round']) expect(existsSync(`${here}/${id}.replay.json`), id).toBe(true);
  });
});
