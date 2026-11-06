/** @file Live balance, reproducible play actions, view diagnostics, path authoring and replay export. */
import { BALANCE } from '../data/balance';
import { CASES, SESSION } from '../data/cases';
import { KINDS } from '../data/tools';
import type { UIContext } from './context';
import { page } from './pages';
import { button, esc } from './icons';
export const DEV_TABS = ['Play', 'Balance', 'View', 'Author', 'Data'];
export interface DevView {
  tab: number;
  page: number;
  caseIndex: number;
  phase: number;
  spawn: number;
  seed: number;
  hideHud: boolean;
  shapes: boolean;
  assist: boolean;
  freeCamera: boolean;
  author: boolean;
  path: number[][];
  look: number;
}
export const newDevView = (): DevView => ({
  tab: 0,
  page: 0,
  caseIndex: 0,
  phase: 0,
  spawn: 0,
  seed: 1,
  hideHud: false,
  shapes: false,
  assist: false,
  freeCamera: false,
  author: false,
  path: [],
  look: 0,
});
export function devPage(c: UIContext, d: DevView): string {
  const cs = [...CASES, SESSION][d.caseIndex],
    state = c.state();
  let body = '';
  const row = (label: string, control: string): string =>
    `<div class="setting-row"><label>${label}</label>${control}</div>`;
  if (d.tab === 0) {
    const groups = [
      row('Case', button('dev-case-prev', '←') + button('dev-case-next', esc(cs.title))) +
        row(
          'Phase',
          button('dev-phase-prev', '←') +
            button('dev-phase-next', `${d.phase + 1} · ${esc(cs.phases[d.phase]?.title ?? 'Opening')}`),
        ) +
        row('Jump in', button('dev-jump', 'Begin at checkpoint')),
      row('Operation', button('dev-act:phase', 'Win phase') + button('dev-act:fail', 'Fail')) +
        row(
          'Vitals',
          button('dev-act:heal', 'Restore to 100') +
            button('dev-toggle:freezeVitals', c.get('game.freezeVitals') ? 'Unfreeze' : 'Freeze'),
        ) +
        row('Clock', button('dev-toggle:freezeClock', c.get('game.freezeClock') ? 'Unfreeze' : 'Freeze')) +
        row(
          'Gift',
          button('dev-toggle:infiniteGift', c.get('game.infiniteGift') ? 'Finite' : 'Infinite') +
            button('dev-act:gift', 'Grant'),
        ),
      row(
        'Surgeons',
        button('dev-act:bot', 'Add bot') +
          button('dev-toggle:autoplay', c.get('game.autoplay') ? 'Stop autoplay' : 'Autoplay'),
      ) +
        row('Parasites', button('dev-toggle:oneHit', c.get('game.oneHit') ? 'Normal HP' : 'One-hit')) +
        row(
          'Time scale',
          '<input data-focus type="range" data-timescale min=".25" max="4" step=".25" value="1"><output>1×</output>',
        ) +
        row('One tick', button('dev-step', 'Frame step')),
      row(
        'Spawn target',
        button('dev-spawn-prev', '←') +
          button('dev-spawn-next', KINDS[d.spawn]) +
          button('dev-spawn', 'Spawn at cursor'),
      ) +
        row('Seed', button('dev-seed', 'Next seed: ' + d.seed)) +
        row('Case files', button('dev-unlock', 'Unlock all')),
    ];
    body = groups[d.page % groups.length];
  } else if (d.tab === 1) {
    body = Object.entries(BALANCE)
      .slice(d.page * 4, d.page * 4 + 4)
      .map(([key, [value, min, max, label]]) =>
        row(
          label,
          `<input data-focus data-balance="${key}" type="range" min="${min}" max="${max}" step="${max > 20 ? 1 : 0.05}" value="${c.get(`game.${key}`) ?? value}"><output>${Number(c.get(`game.${key}`) ?? value).toFixed(2)}</output>${button(`balance-reset:${key}`, '↺', `aria-label="Reset ${label}"`)}`,
        ),
      )
      .join('');
  } else if (d.tab === 2)
    body =
      row('HUD', button('dev-view:hideHud', d.hideHud ? 'Hidden' : 'Visible')) +
      row('Target shapes', button('dev-view:shapes', d.shapes ? 'On' : 'Off')) +
      row('Cursor assistance', button('dev-view:assist', d.assist ? 'Shown' : 'Hidden')) +
      row(
        'Camera / look',
        button('dev-view:freeCamera', d.freeCamera ? 'Free' : 'Surgical') +
          button('dev-look', d.look ? 'Harbor' : 'Field'),
      );
  else if (d.tab === 3)
    body = `<p class="small">Draw a surgical guide directly on the field. Hold the tool trigger or click and move. Escape returns here. The polyline is ready to paste into a case file.</p>${row('Path', button('dev-author', 'Draw on the field') + button('dev-copy-path', 'Copy polyline'))}<pre class="dev-output" data-game="author-path">${esc(JSON.stringify(d.path))}</pre>`;
  else
    body = `<pre class="dev-output" data-game="dev-data">State hash: ${esc(c.engine()?.inspector?.hash() ?? 'unknown')}\nCounters: ${esc(JSON.stringify((c.engine()?.inspector?.stats as (() => unknown) | undefined)?.() ?? {}).slice(0, 500))}\n${esc(
      state?.events
        .slice(-6)
        .map((e) => `${e.n} ${e.type}: ${e.text}`)
        .join('\n') ?? 'No operation is running.',
    )}</pre>${row('Replay', button('dev-copy-replay', 'Copy recorded inputs'))}`;
  return page(
    'Developer theatre',
    'LIVE / RECORDED CHANGES · SCORES DISABLED',
    `<div class="settings-rows"><nav class="tabs">${DEV_TABS.map((name, i) => button(`dev-tab:${i}`, name, `class="${i === d.tab ? 'selected' : ''}"`)).join('')}</nav>${body}</div>`,
    `${button('back', 'Back')}${d.tab <= 1 ? button('dev-prev', '← Previous') : ''}${d.tab === 1 ? button('balance-reset-all', 'Reset all defaults') : ''}<span class="about-index">${d.tab <= 1 ? `PAGE ${d.page + 1}` : ''}</span>${d.tab <= 1 ? button('dev-next', 'Next →') : ''}`,
  );
}
