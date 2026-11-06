/**
 * @file Nothing written and never used: every clip is played, every effect is heard, every prop is spawned and every
 * material is worn. Scores and softlock runs cannot see a feature that is written but not wired up, and the plan says
 * no stubs (PLAN.md section 18). It reads the source, and comments do not count.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = 'labs/game';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Source text without its comments. */
const code = (path: string): string =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const FILES = walk(ROOT).filter(
  (f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.includes('/tools/') && !f.includes('clipdata'),
);
/** All the game's source but the files matching `not`. */
const sourceBut = (not: string): string =>
  FILES.filter((f) => !f.includes(not))
    .map(code)
    .join('\n');
const unique = (found: IterableIterator<RegExpMatchArray>): string[] => [...new Set([...found].map((m) => m[1]))];

describe('what is written is used', () => {
  it('plays every clip', () => {
    const names = unique(code(`${ROOT}/cast/clips.ts`).matchAll(/^\s{2}(\w+):\s*(?:strip\(|\{ src)/gm));
    const rest = sourceBut('cast/clips.ts');
    expect(names.length).toBeGreaterThan(30);
    expect(names.filter((n) => !new RegExp(`['"\`/~]${n}['"\`]`).test(rest))).toEqual([]);
  });

  it('plays every effect', () => {
    const names = unique(code(`${ROOT}/sounds/effects.ts`).matchAll(/\bfx\(\s*'(\w+)'/g));
    const rest = sourceBut('sounds/effects.ts');
    expect(names.length).toBeGreaterThan(20);
    expect(names.filter((n) => !rest.includes(`sfx:${n}`))).toEqual([]);
  });

  it('spawns every prop', () => {
    const texts = FILES.filter((f) => f.includes('/props/')).map(code);
    const names = unique(texts.join('\n').matchAll(/\bfree\(\s*'prop:(\w+)'/g));
    const rest = sourceBut('/props/');
    expect(names.length).toBeGreaterThan(30);
    expect(names.filter((n) => !rest.includes(`prop:${n}`))).toEqual([]);
  });

  it('wears every material', () => {
    const names = unique(code(`${ROOT}/materials/retreat.ts`).matchAll(/'material:(\w+)'/g));
    const rest = sourceBut('materials/retreat.ts');
    expect(names.length).toBeGreaterThan(20);
    expect(names.filter((n) => !rest.includes(`material:${n}`))).toEqual([]);
  });

  it('keeps "Nice weather for it." the longest thing Gerald will ever say', () => {
    const lines = readFileSync(`${ROOT}/ui/lines/people.ts`, 'utf8');
    const said = [...lines.matchAll(/'talk\.gerald\.\d': \[(.*)\],/g)].flatMap((m) =>
      [...m[1].matchAll(/'([^']+)'/g)].map((l) => l[1]),
    );
    expect(said.length).toBeGreaterThan(6);
    const longest = 'Nice weather for it.'.length;
    expect(said.filter((line) => line.length > longest)).toEqual([]);
  });
});
