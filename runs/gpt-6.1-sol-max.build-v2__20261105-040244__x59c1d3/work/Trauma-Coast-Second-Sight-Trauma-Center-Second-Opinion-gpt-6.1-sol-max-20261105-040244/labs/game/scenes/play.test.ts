/** @file The full game is won by real bot inputs; engine capture/restore and all replay goldens must agree. */
import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { createHeadless } from '../../../engine';
import { main } from './main';
import { allCases, CASES } from '../data/cases';
import { botHands, botHand } from '../bot';
import { createOperation, defaultRules, scoreTotal } from './op/state';
import { stepOperation } from './op/step';
import { readOperation } from '../net/session';
import { BASE_SCORES } from '../data/cases/calibration';
import { Director } from '../app/director';
import type { Difficulty } from '../data/types';
function play(id: string, seed: number, seats = 1, difficulty: Difficulty = 'Resident', limited = false) {
  const rules = defaultRules();
  rules.difficulty = difficulty;
  const s = createOperation(id, seed, seats, 0, rules);
  for (let k = 0; k < 60000 && s.status === 'playing'; k++) {
    const hands = botHands(s, rules);
    if (limited && s.seats.length > 1) hands[1] = botHand(s, 1, rules, true);
    stepOperation(s, hands, rules);
  }
  return s;
}
describe('a complete playable shift', () => {
  for (const c of allCases)
    it(`the bot completes ${c.title} on ${process.env.BOT_SEEDS ?? 3} seeds`, () => {
      for (let seed = 1; seed <= Number(process.env.BOT_SEEDS ?? 3); seed++) {
        const s = play(c.id, seed);
        expect({
          seed,
          status: s.status,
          phase: s.phase,
          reason: s.reason,
          live: s.targets.filter((t) => !t.done && t.required).map((t) => t.kind),
        }).toMatchObject({ status: 'won' });
      }
    });
  for (const difficulty of ['Intern', 'Attending'] as Difficulty[])
    for (const id of ['first-cut', 'mercy'])
      it(`completes ${id} on ${difficulty}`, () => {
        expect(play(id, 3, 1, difficulty).status).toBe('won');
      });
  for (const seats of [2, 4])
    for (const id of ['first-cut', 'gala-shift', 'mercy'])
      it(`${seats} surgeons complete ${id}`, () => {
        expect(play(id, 5, seats).status).toBe('won');
      });
  for (const id of ['struck-off', 'reverie', 'gala-night', 'mercy'])
    it(`${id} is winnable with the limited AI colleague`, () => {
      const s = play(id, 7, 1, 'Resident', true);
      expect({ status: s.status, phase: s.phase, reason: s.reason }).toMatchObject({ status: 'won' });
    });
  it('walks title, all story scenes, briefings, surgery, results and postcards to credits', () => {
    const d = new Director();
    d.newShift();
    for (const c of CASES) {
      expect(d.screen).toBe('story');
      while (d.screen === 'story') d.advanceStory();
      expect(d.screen).toBe('briefing');
      d.start();
      const s = play(c.id, 1);
      expect(s.status).toBe('won');
      d.finish(s);
      expect(d.screen).toBe('debrief');
      d.continueResult();
      expect(d.screen).toBe('postcard');
      d.continueResult();
      while (String(d.screen) === 'story' && d.part === 'after') d.advanceStory();
    }
    expect(d.screen).toBe('credits');
    expect(d.progress.ended).toBe(true);
    expect(Object.keys(d.progress.postcards)).toHaveLength(8);
    expect(d.progress.unlocked).toBe(8);
  });
  it('the engine continues exactly after capture and restore', async () => {
    const e = await createHeadless({ scene: main, seed: 3, settings: { 'game.run': 'op:first-cut' } });
    for (let i = 0; i < 120; i++) e.step(1, { 'game:hands': botHands(readOperation(e)!) });
    const capture = e.capture();
    for (let i = 0; i < 120; i++) e.step(1, { 'game:hands': botHands(readOperation(e)!) });
    const hash = e.hash();
    e.restore(capture);
    for (let i = 0; i < 120; i++) e.step(1, { 'game:hands': botHands(readOperation(e)!) });
    expect(e.hash()).toBe(hash);
  });
  it('the engine is won by the same bot', async () => {
    const e = await createHeadless({ scene: main, seed: 2, settings: { 'game.run': 'op:first-cut' } });
    for (let i = 0; i < 4000 && readOperation(e)?.status === 'playing'; i++)
      e.step(1, { 'game:hands': botHands(readOperation(e)!) });
    expect(readOperation(e)?.status).toBe('won');
  });
  for (const c of CASES)
    it(`replays ${c.title} to its recorded engine hashes`, async () => {
      const file = new URL(`../replays/${c.id}.replay.json`, import.meta.url);
      expect(existsSync(file)).toBe(true);
      if (!existsSync(file)) return;
      const replay = readFileSync(file, 'utf8'),
        e = await createHeadless({ scene: main });
      const result = await (e.replay as (text: string) => Promise<{ hashes: Record<string, string> }>)(replay);
      const goldens = JSON.parse(replay).hashes[`${process.platform}-${process.arch}`];
      expect(result.hashes).toEqual(goldens);
    });
});

it('keeps every rank threshold calibrated to the current Resident bot', () => {
  for (const c of allCases) {
    const s = play(c.id, 1, 1, 'Resident', c.ai);
    expect(scoreTotal(s)).toBe(BASE_SCORES[c.id]);
    expect(c.ranks).toEqual([0.45, 0.6, 0.75, 0.9].map((f) => Math.round(scoreTotal(s) * f)));
  }
});
