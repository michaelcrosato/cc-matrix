/** @file Source information and every exit-interview answer, read from the one canonical report. */
import { REPORT, CREDITS } from '../about-data';
import type { ScreenApp } from '../context';
import { safe } from '../glyphs';
export function about(a: ScreenApp, page: number): void {
  const fields = Object.entries(REPORT.sourceInformation);
  const titles = [
    'Source Information',
    'Source Information',
    'Testing Feedback',
    'Engine Feedback',
    'Prompt Feedback',
    'Credits',
  ];
  let html = '';
  if (page < 2)
    html = `<div class="about-grid">${fields
      .slice(page * 8, page * 8 + 8)
      .map(
        ([key, value]) =>
          `<div class="info-line"><b>${safe(key.charAt(0).toUpperCase() + key.slice(1))}</b>${safe(value)}</div>`,
      )
      .join('')}</div>`;
  else
    html = (
      page === 2
        ? REPORT.testingFeedback
        : page === 3
          ? REPORT.engineFeedback
          : page === 4
            ? REPORT.promptFeedback
            : CREDITS
    )
      .map((line, i) => `<p><b>${String(i + 1).padStart(2, '0')}</b> &nbsp; ${safe(line)}</p>`)
      .join('');
  a.ui.menu(
    'about',
    `ABOUT THE RETREAT · ${page + 1} / 6`,
    titles[page],
    '',
    [
      { id: 'next', label: 'Next page', action: () => a.show('about', (page + 1) % 6) },
      { id: 'back', label: 'Back', action: () => a.show(a.flow?.mode === 'front' || !a.flow ? 'title' : 'pause') },
    ],
    { extra: `<div class="about-copy" tabindex="0">${html}</div>` },
  );
  a.ui.back = () => a.show(a.flow?.mode === 'front' || !a.flow ? 'title' : 'pause');
}
