/**
 * @file The page's session client is the unmodified file, and it is the first script. The About data matches the
 * exit interview on disk.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createCampaign } from './campaign';
import { aboutCards, INTERVIEW } from '../data/interview';
import { renderShell, type ShellExtra } from '../ui/shell';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
// The client is not named .js: the linter would rewrite a file that has to stay byte for byte.
const session = readFileSync(new URL('../vendor/session.txt', import.meta.url), 'utf8');

describe('page sources', () => {
  it('pastes session.js first and unchanged', () => {
    const head = html.slice(html.indexOf('<meta charset="utf-8" />'));
    const start = head.indexOf('<script>');
    const end = head.indexOf('</script>');
    expect(start).toBeGreaterThan(0);
    expect(head.slice(0, start)).not.toContain('<script');
    expect(head.slice(start + '<script>'.length, end)).toBe(session);
    expect(html).toContain('<script type="module" crossorigin src="./main.ts">');
    expect(html).not.toContain('touch.css');
  });

  it('matches the exit interview on disk', () => {
    const disk = JSON.parse(
      readFileSync(new URL('../../../../exit-interview.json', import.meta.url), 'utf8'),
    ) as unknown;
    expect(disk).toEqual(INTERVIEW);
  });

  it('shows the interview on About and Credits, with usage marked', () => {
    const extra: ShellExtra = { prompt: '', hash: '', cursor: '', sliders: [], touch: false, card: null };
    const campaign = createCampaign();
    const root = { innerHTML: '' } as HTMLElement;
    const cards = aboutCards();
    const pages: string[] = [];
    for (let page = 0; page < cards.length; page++) {
      const last = page === cards.length - 1;
      campaign.screen = last ? 'credits' : 'about';
      campaign.page = page;
      renderShell(root, campaign, extra);
      pages.push(root.innerHTML);
      const marked = root.innerHTML.includes('data-about="usage"');
      expect(marked).toBe(true);
      expect(root.innerHTML).toContain('added on import');
    }
    const joined = pages.join('\n');
    for (const value of Object.values(INTERVIEW.sourceInformation)) expect(joined).toContain(value);
    for (const line of INTERVIEW.testingFeedback) expect(joined).toContain(line);
    for (const line of INTERVIEW.engineFeedback) expect(joined).toContain(line);
    for (const line of INTERVIEW.promptFeedback) expect(joined).toContain(line);
    campaign.screen = 'about';
    campaign.page = cards.findIndex((card) => card.usage);
    renderShell(root, campaign, extra);
    expect(root.innerHTML).toContain('<p data-about="usage">added on import</p>');
    expect(root.innerHTML).toContain('Source Information');
    expect(pages.at(-1)).toContain('Credits');
    expect(pages.at(-1)).toContain('Trauma Compass');
  });
});
