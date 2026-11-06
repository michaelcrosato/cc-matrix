// About / Credits: Source Information, Testing, Engine and Prompt Feedback, credits. Paged for the TV. Plan section 15.
import { SCREENS } from '../nav.js';
import { App } from '../../app.js';
import { TITLE, SOURCE, MAKER } from '../../data/meta.js';
import { EXIT, KIT_CREDITS } from '../../data/about_data.js';
const TQ = ['HOW MANY ISSUES DID TESTING CATCH?', 'HOW MANY WERE CRITICAL OR GAME BREAKING?', 'WHAT WAS THE MOST HELPFUL TEST?', 'WHAT WAS THE LEAST HELPFUL TEST?'];
const EQ = ['WHAT DID YOU LIKE MOST ABOUT THE ENGINE?', 'DID YOU GET STUCK OR GUESS WRONG?', 'WHAT WAS THE MOST IMPORTANT THING YOU HAD TO BUILD YOURSELF?', 'WHAT WAS THE HARDEST PART ABOUT USING THE ENGINE?', 'WHAT DID YOU CHANGE IN THE ENGINE, AND WHY?', 'IF YOU COULD CHANGE ONE THING ABOUT THE ENGINE, WHAT WOULD IT BE?'];
const PQ = ['WHAT DID YOU LIKE MOST ABOUT THIS PROMPT?', 'WHAT WAS CONFUSING?', 'WHAT WAS THE HARDEST THING TO DO?', 'WHAT WOULD YOU CHANGE IN THIS PROMPT?'];
const SI = [['DATE', 'date'], ['SOURCE', 'source'], ['PLAN', 'plan'], ['GENRE', 'genre'], ['PERSPECTIVE', 'perspective'], ['TECH', 'tech'], ['ART DIRECTION', 'artDirection'], ['ANIMATION', 'animation'], ['AUDIO', 'audio'], ['ONLINE', 'online'], ['TESTING', 'testing'], ['RESEARCH', 'research'], ['ENVIRONMENT', 'environment'], ['MODEL', 'model'], ['USAGE', 'usage']];
function wrap(s, n) { const out = []; let line = ''; for (const w of String(s || 'unknown').toUpperCase().split(/\s+/)) { if ((line + ' ' + w).trim().length > n) { if (line) out.push(line); line = w; } else line = (line + ' ' + w).trim(); } if (line) out.push(line); return out; }
function build() {
  const pages = [], si = EXIT.sourceInformation; // Source Information: 3 items per page
  for (let i = 0; i < SI.length; i += 3) { const lines = []; for (const [label, key] of SI.slice(i, i + 3)) { lines.push({ h: label }); lines.push(...wrap(si[key], 62).map((t) => ({ t }))); } pages.push({ title: 'SOURCE INFORMATION', lines }); }
  const qa = (title, qs, ans) => qs.forEach((q, i) => { const lines = [{ h: q }, ...wrap(ans[i], 62).map((t) => ({ t }))]; const chunks = []; for (let k = 0; k < lines.length; k += 13) chunks.push(lines.slice(k, k + 13)); chunks.forEach((c, k) => pages.push({ title, lines: k ? [{ h: q + ' (CONTINUED)' }, ...c] : c })); });
  qa('TESTING FEEDBACK', TQ, EXIT.testingFeedback); qa('ENGINE FEEDBACK', EQ, EXIT.engineFeedback); qa('PROMPT FEEDBACK', PQ, EXIT.promptFeedback);
  pages.push({ title: 'CREDITS', lines: [{ h: TITLE }, { t: MAKER }, { t: '' }, { h: 'INSPIRED BY' }, { t: SOURCE }, { t: '' }, { t: 'AN ORIGINAL GAME. NO CARS, CIRCUITS, NAMES, MUSIC OR SOUNDS' }, { t: 'FROM THE SOURCE ARE USED.' }, { t: '' }, { h: 'MADE WITH' }, { t: 'PIXEL ENGINE ' + (EXIT.sourceInformation.tech.match(/Pixel Engine ([\d.]+)/)?.[1] ?? '0.46.0') }, { t: 'THREE.JS R186 (MIT). RAPIER (APACHE-2.0).' }, { t: 'SWEETIE 16 PALETTE BY GRAFXKID.' }] });
  const kc = KIT_CREDITS.split('\n').filter((l) => !l.startsWith('```')).flatMap((l) => (l.trim() ? wrap(l.replace(/[*`#]/g, ''), 62) : [''])); for (let i = 0; i < kc.length; i += 13) pages.push({ title: 'KIT CREDITS', lines: kc.slice(i, i + 13).map((t) => ({ t })) });
  return pages;
}
let PAGES = null;
SCREENS.about = (nav, t, ctx, ui, sc) => {
  PAGES ??= build(); const st = t.s; st.p ??= 0; const n = PAGES.length, A = ui.A; if (A.tabL || A.moveX < 0) st.p = (st.p + n - 1) % n; if (A.tabR || A.moveX > 0) st.p = (st.p + 1) % n; if (A.moveY) st.p = Math.max(0, Math.min(n - 1, st.p + A.moveY * 3));
  ui.hud.rect(0, 0, ui.W, ui.H, 'ink'); const pg = PAGES[st.p]; ui.title('ABOUT  ' + pg.title, `${st.p + 1}/${n}`); pg.lines.forEach((l, i) => { if (l.h) ui.text(16, 34 + i * 11, l.h, { color: 'sand' }); else ui.text(16, 34 + i * 11, l.t, { color: 'white' }); });
  ui.item('ab', 0, 0, 1, 1); ui.prompts([['move', 'PAGE'], ['back', 'BACK']]); if (A.back) nav.pop();
};
export const aboutPages = () => (PAGES ??= build());
