// Turns the about content into pages: one idea per screen, paged, never a table.
import { SOURCE_INFO, TESTING_FEEDBACK, ENGINE_FEEDBACK, PROMPT_FEEDBACK, CREDITS_LINES } from '../content/about.js';
import { GAME_TITLE } from '../content/title.js';
import { ISSUE_COUNTS } from '../content/issue-counts.js';
const up = (s) => String(s).replace('%ISSUES%', ISSUE_COUNTS.all).replace('%CRITICAL%', ISSUE_COUNTS.critical).toUpperCase();
export class About {
  pages() {
    const out = [];
    const si = [];
    for (let i = 0; i < SOURCE_INFO.length; i += 3) {
      const page = [{ text: 'SOURCE INFORMATION', color: 'orange' }];
      for (const [k, v] of SOURCE_INFO.slice(i, i + 3)) { page.push({ text: k, color: 'sand' }); page.push({ text: up(v), color: 'white' }); }
      out.push(page);
    }
    const qa = (title, list) => {
      for (let i = 0; i < list.length; i += 2) {
        const page = [{ text: title, color: 'orange' }];
        for (const [q, a] of list.slice(i, i + 2)) { page.push({ text: q, color: 'sand' }); page.push({ text: up(a), color: 'white' }); }
        out.push(page);
      }
    };
    qa('TESTING FEEDBACK', TESTING_FEEDBACK);
    qa('ENGINE FEEDBACK', ENGINE_FEEDBACK);
    qa('PROMPT FEEDBACK', PROMPT_FEEDBACK);
    out.push(...this.creditPages());
    return out;
  }
  creditPages() {
    return [[{ text: up(GAME_TITLE), color: 'orange', scale: 2 }, ...CREDITS_LINES.map((t) => ({ text: up(t), color: 'white' }))]];
  }
}
