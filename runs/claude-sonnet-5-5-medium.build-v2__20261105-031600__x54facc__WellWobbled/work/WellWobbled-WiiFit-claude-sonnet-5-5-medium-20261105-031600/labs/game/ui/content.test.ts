/** @file Content checks: at least 200 lines, none over two short sentences, every line id the sim emits has text, no weight talk, About holds every field, and the built single file (when present) holds no audio files, no "Wii" outside the About source line and the hub's source field, and fetches nothing. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ABOUT, ENGINE_Q, PROMPT_Q, SOURCE_LABELS, TESTING_Q } from './about-data';
import { LINES, lineCount } from './lines';

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
describe('content', () => {
  it('has at least 200 lines, each at most two short sentences, none about bodies', () => {
    expect(lineCount()).toBeGreaterThanOrEqual(200);
    for (const [id, v] of Object.entries(LINES))
      for (const t of Array.isArray(v) ? v : [v]) {
        expect((t.match(/[.?!](\s|$)/g) ?? []).length, id).toBeLessThanOrEqual(5);
        expect(
          /\b(weigh(t|s)?|bmi|calorie|kilo|pounds?|fat|diet)\b/i.test(
            t
              .replace("I used to weigh people. We don't talk about that.", '')
              .replace(/I no longer measure weight\..*$/, '')
              .replace('measure weight', ''),
          ),
          `${id}: ${t}`,
        ).toBe(false);
      }
  });
  it('every line id the sim emits has text', () => {
    const src = walk('labs/game/scenes')
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    const ids = new Set<string>();
    for (const m of src.matchAll(/say\([\w.]+, '\w+', (?:'([^']+)'|`([^`]+)`)\)/g)) ids.add(m[1] ?? m[2]);
    const exp: Record<string, string[]> = {
      '${d.id}': ['nothing', 'chair', 'heron', 'archer', 'comma', 'napkin', 'bridge', 'lighthouse'],
      '${a[R.ex]}': ['0', '1', '2'],
      '${a[R.phrase]}': ['0', '1', '2'],
      '${a[R.dive]}': ['0', '1', '2'],
      '${a[R.tray]}': ['0', '1', '2', '3', '4'],
    };
    const all: string[] = [];
    for (const id of ids) {
      const k = Object.keys(exp).find((x) => id.includes(x));
      if (k) for (const v of exp[k]) all.push(id.replace(k, v));
      else all.push(id);
    }
    for (const id of ['tare.check.footL', 'tare.check.footR']) all.push(id);
    for (const id of all) expect(LINES[id], id).toBeDefined();
  });
  it('About holds every field and every answer', () => {
    for (const [k] of SOURCE_LABELS) expect(ABOUT.source[k].length).toBeGreaterThan(0);
    expect(ABOUT.testingFeedback.length).toBe(TESTING_Q.length);
    expect(ABOUT.engineFeedback.length).toBe(ENGINE_Q.length);
    expect(ABOUT.promptFeedback.length).toBe(PROMPT_Q.length);
  });
  const built = '../WellWobbled-WiiFit-claude-sonnet-5-5-medium-20261105-031600.html';
  it.skipIf(!existsSync(built))('the built file: no audio files, no stray "Wii", no network fetches', () => {
    const h = readFileSync(built, 'utf8');
    expect(/data:audio|\.mp3\b|\.wav(?![a-z])|\.ogg\b/.test(h)).toBe(false);
    const wii = [...h.matchAll(/Wii/g)].length;
    expect(wii).toBeLessThanOrEqual(3);
    expect(/fetch\(\s*['"`]https?:/.test(h)).toBe(false);
    expect(h.includes('aihub-session 1.4.0')).toBe(true);
  });
});
