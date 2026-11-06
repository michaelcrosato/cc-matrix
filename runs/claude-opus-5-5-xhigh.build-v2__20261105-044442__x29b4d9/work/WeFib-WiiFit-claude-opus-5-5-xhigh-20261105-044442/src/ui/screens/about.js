import { h } from '../dom.js';
import { ABOUT, SOURCE_LABELS } from '../../data/about.js';
import { TITLE, RESORT } from '../../data/config.js';
import { TESTING_Q, ENGINE_Q, PROMPT_Q, ABOUT_PAGES, splitPages } from '../../data/aboutPages.js';

/** Large type, one page at a time, moved with left and right or clicks. Long answers take more pages. */
export function openAbout(game) {
  const pages = buildPages();
  let scr = null;
  const close = () => { game.ui.close(scr); };
  scr = game.ui.open({
    name: 'about', className: 'dim',
    prompts: [['page', 'Pages'], ['back', 'Back']],
    back: close,
    build(s) {
      s.el.append(h('div.h2', { style: 'margin-top:1rem;font-size:4.6rem' }, 'About / Credits'));
      const box = h('div.about.tag');
      s.el.append(box);
      const render = (pg) => {
        box.innerHTML = '';
        const p = pages[pg];
        box.append(h('h3', p.title));
        for (const [k, v] of p.rows) { const para = h('p'); if (k) para.append(h('b', `${k}: `)); para.append(document.createTextNode(v)); box.append(para); }
      };
      s.pager(pages.length, render);
      render(0);
    },
  });
  return scr;
}

function buildPages() {
  const si = ABOUT.sourceInformation || {};
  const out = [];
  for (const def of ABOUT_PAGES) {
    const rows = def.keys.map((k) => [SOURCE_LABELS[k], si[k] ?? 'unknown']);
    splitPages(rows).forEach((r, i, all) => out.push({ title: `${def.title}${all.length > 1 ? ` (${i + 1})` : ''}`, rows: r }));
  }
  const fb = (title, qs, answers) => {
    const rows = qs.map((q, i) => [q, (answers && answers[i]) ?? 'unknown']);
    splitPages(rows).forEach((r, i, all) => out.push({ title: `${title}${all.length > 1 ? ` (${i + 1})` : ''}`, rows: r }));
  };
  fb('Testing Feedback', TESTING_Q, ABOUT.testingFeedback);
  fb('Engine Feedback', ENGINE_Q, ABOUT.engineFeedback);
  fb('Prompt Feedback', PROMPT_Q, ABOUT.promptFeedback);
  out.push({ title: 'Credits', rows: [
    ['', `${TITLE} · ${RESORT}`],
    ['Font', 'Fredoka, The Fredoka Project Authors, SIL Open Font License 1.1'],
    ['Engine', 'Three.js (MIT), the three.js authors'],
    ['Physics', 'Rapier (Apache 2.0), Dimforge'],
    ['Everything else', 'All art, music, sound and voices were made in code for this game.'],
  ] });
  return out;
}
