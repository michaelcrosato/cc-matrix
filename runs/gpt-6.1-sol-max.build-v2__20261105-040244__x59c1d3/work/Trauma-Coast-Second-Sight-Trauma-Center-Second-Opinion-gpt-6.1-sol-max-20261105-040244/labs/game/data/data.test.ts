/** @file Designer data, settings, interview shape, native actions and complete tool/refusal coverage. */
import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { actionCheck, Animator } from '../../../engine';
import { allCases, validateCase } from './cases';
import { storyFor, validateStory } from './story';
import { BALANCE, defaults } from './balance';
import { interview } from './about';
import { ACTIONS } from '../cast/actions';
for (const c of allCases) it(`validates every phase of ${c.title}`, () => expect(validateCase(c)).toEqual([]));
for (let i = 0; i < 8; i++)
  for (const part of ['before', 'after'] as const)
    it(`validates story ${i + 1} ${part}`, () => expect(validateStory(storyFor(i, part))).toEqual([]));
for (const [key, [value, min, max]] of Object.entries(BALANCE))
  it(`${key} has a valid, resettable default`, () => {
    expect(value).toBeGreaterThanOrEqual(min);
    expect(value).toBeLessThanOrEqual(max);
    const state = defaults();
    state[key] = max;
    expect(defaults()[key]).toBe(value);
  });
it('has the exact exit-interview shape and identical About data', () => {
  const value = JSON.parse(readFileSync(new URL('../../../../exit-interview.json', import.meta.url), 'utf8'));
  expect(value).toEqual(interview);
  expect(Object.keys(value)).toEqual([
    'sourceInformation',
    'testingFeedback',
    'engineFeedback',
    'promptFeedback',
    'aiHub',
  ]);
  expect(Object.keys(value.sourceInformation)).toHaveLength(15);
  expect(value.testingFeedback).toHaveLength(4);
  expect(value.engineFeedback).toHaveLength(6);
  expect(value.promptFeedback).toHaveLength(4);
  expect(value.sourceInformation.usage).toBe('added on import');
});
for (const a of ACTIONS)
  it(`checks native animation ${a.id}`, () => {
    const report = actionCheck(a),
      animator = new Animator({ build: 'build:adult' }),
      script = report.script!(animator, 0);
    for (let i = 0; i < Math.ceil(report.seconds * 60); i++) animator.step(script(1 / 60));
    expect(report.seconds).toBeGreaterThan(0.2);
  });

it('registers the complete visual assets without unresolved references', async () => {
  await import('../view/assets');
  await import('../view/bodies');
  await import('../view/camera');
});
