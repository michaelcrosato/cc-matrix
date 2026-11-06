/** @file Prints the terrain's heights at the stations, and checks that the stations are above the sea. */
import { expect, it } from 'vitest';
import { groundAt, STATIONS } from './world';
it('stations stand on dry ground', () => {
  const out: string[] = [];
  for (const [id, s] of Object.entries(STATIONS)) out.push(`${id}:${groundAt(s.at[0], s.at[1]).toFixed(1)}`);
  console.log(
    'H',
    out.join(' '),
    'r90',
    groundAt(90, 0).toFixed(1),
    'r70',
    groundAt(0, 70).toFixed(1),
    'r105',
    groundAt(0, 105).toFixed(1),
  );
  for (const id of ['plaza', 'pavilion', 'annex', 'terrace', 'huts', 'stone'] as const)
    expect(groundAt(STATIONS[id].at[0], STATIONS[id].at[1])).toBeGreaterThan(3);
});
