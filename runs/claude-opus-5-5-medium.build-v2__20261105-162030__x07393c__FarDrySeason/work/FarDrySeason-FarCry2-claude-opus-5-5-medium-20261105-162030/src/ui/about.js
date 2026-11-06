// About and Credits, pages built from content/about.js.
import { ABOUT } from '../content/about.js';
import { GAME_TITLE } from '../content/title.js';
import { wrap } from './pixfont.js';
export function pagesFromRows(rows, perPage = 15, cols = 72) {
  // A question and its answer stay on one page.
  const pages = []; let cur = [];
  for (const [k, v] of rows) {
    const entry = [{ big: k }, ...(v ? wrap(v, cols) : [])];
    if (cur.length && cur.length + entry.length > perPage) { pages.push(cur); cur = []; }
    cur.push(...entry);
  }
  if (cur.length) pages.push(cur);
  return pages;
}
export function aboutScreen(g) {
  const pages = [
    ...pagesFromRows(ABOUT.source), ...pagesFromRows(ABOUT.testing, 15), ...pagesFromRows(ABOUT.engine, 15), ...pagesFromRows(ABOUT.prompt, 15),
    [...ABOUT.credits, '', `${GAME_TITLE.toUpperCase()}`],
  ];
  return { id: 'about', title: 'ABOUT AND CREDITS', titleY: 14, cover: 'ink', paged: true, pages, page: 0, pageY: 40 };
}
