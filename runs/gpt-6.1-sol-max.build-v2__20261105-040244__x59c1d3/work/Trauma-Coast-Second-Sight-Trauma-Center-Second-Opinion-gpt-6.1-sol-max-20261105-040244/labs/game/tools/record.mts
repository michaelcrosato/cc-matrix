/** @file Record native-engine golden checkpoints for each authored case. */
import { writeFileSync, rmSync } from 'node:fs';
import { createHeadless } from '../../../engine';
import { main } from '../scenes/main';
import { CASES } from '../data/cases';
rmSync('labs/game/replays/bot.replay.json', { force: true });
for (const c of CASES) {
  const settings = { 'game.run': `op:${c.id}`, 'game.autoplay': true };
  const e = await createHeadless({ scene: main, seed: 1, settings });
  const marks: Record<string, string> = { '0': e.hash() };
  for (let i = 0; i < 5; i++) {
    e.step(120);
    marks[String((i + 1) * 120)] = e.hash();
  }
  const replay = {
    format: 'my3dge-replay/1',
    description: `${c.title}: native surgical bot inputs, seed 1.`,
    scene: 'game:main',
    settings,
    seed: 1,
    hz: 60,
    steps: 600,
    inputs: [],
    hashes: { [`${process.platform}-${process.arch}`]: marks },
  };
  writeFileSync(`labs/game/replays/${c.id}.replay.json`, JSON.stringify(replay, null, 2) + '\n');
  console.log(c.id);
}
