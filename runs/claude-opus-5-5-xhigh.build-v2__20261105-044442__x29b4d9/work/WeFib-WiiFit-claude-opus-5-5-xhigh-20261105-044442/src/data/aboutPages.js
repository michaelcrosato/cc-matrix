// Questions and page layout for the About screen. The answers come from the exit interview.
export const TESTING_Q = ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'];
export const ENGINE_Q = ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why? (none if nothing)', 'If you could change one thing about the engine, what would it be?'];
export const PROMPT_Q = ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'];
export const ABOUT_PAGES = [
  { title: 'Source Information', keys: ['date', 'source', 'plan', 'genre', 'perspective'] },
  { title: 'Source Information', keys: ['tech', 'artDirection', 'animation'] },
  { title: 'Source Information', keys: ['audio', 'online', 'testing'] },
  { title: 'Source Information', keys: ['research', 'environment', 'model', 'usage'] },
];
const MAX_CHARS = 880;
/** Split rows so no page needs small print or a scroll. */
export function splitPages(rows) {
  const pages = [[]];
  let n = 0;
  for (const row of rows) {
    const len = (row[0] || '').length + String(row[1]).length;
    if (n + len > MAX_CHARS && pages[pages.length - 1].length) { pages.push([]); n = 0; }
    if (len > MAX_CHARS) {
      // A single very long answer: cut at a sentence.
      let text = String(row[1]);
      let first = true;
      while (text.length) {
        let cut = text.length;
        if (cut > MAX_CHARS - (first ? (row[0] || '').length : 0)) {
          const lim = MAX_CHARS - (first ? (row[0] || '').length : 0);
          cut = text.lastIndexOf('. ', lim);
          if (cut < lim * 0.4) cut = text.lastIndexOf(' ', lim);
          cut += 1;
        }
        pages[pages.length - 1].push([first ? row[0] : '', text.slice(0, cut).trim()]);
        text = text.slice(cut).trim();
        first = false;
        n = 0;
        if (text.length) pages.push([]);
      }
      n = MAX_CHARS;
    } else {
      pages[pages.length - 1].push(row);
      n += len;
    }
  }
  return pages;
}
