// About/Credits pages. Fed by the exit-interview file: one source of truth.
import { EXIT, SOURCE } from '../data/about.js';
import { TITLE } from '../data/config.js';
const Q = {
  testing: ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'],
  engine: ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why? (none if nothing)', 'If you could change one thing about the engine, what would it be?'],
  prompt: ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'],
};
const unk = 'unknown';
/** Long answers split across pages rather than shrink. */
function paged(title, rows, maxChars = 900) { const out = []; let cur = [], n = 0; for (const r of rows) { const l = r[0].length + r[1].length + 40; if (cur.length && n + l > maxChars) { out.push({ title, rows: cur }); cur = []; n = 0; } cur.push(r); n += l; } if (cur.length) out.push({ title, rows: cur }); return out; }
export function aboutPages() {
  const E = EXIT || { sourceInformation: {}, testingFeedback: [], engineFeedback: [], promptFeedback: [] }, S = E.sourceInformation, v = (k) => S[k] ?? unk;
  const qa = (qs, ans) => qs.map((q, i) => [q, ans[i] ?? unk]);
  return [
    ...paged('Source Information', [['Date', v('date')], ['Source', v('source') === unk ? SOURCE : v('source')], ['Plan', v('plan')], ['Genre', v('genre')], ['Perspective', v('perspective')]]),
    ...paged('Source Information', [['Tech', v('tech')], ['Art Direction', v('artDirection')], ['Animation', v('animation')]]),
    ...paged('Source Information', [['Audio', v('audio')], ['Online', v('online')], ['Testing', v('testing')]]),
    ...paged('Source Information', [['Research', v('research')], ['Environment', v('environment')], ['Model', v('model')], ['Usage', v('usage')]]),
    ...paged('Testing Feedback', qa(Q.testing, E.testingFeedback)),
    ...paged('Engine Feedback', qa(Q.engine, E.engineFeedback)),
    ...paged('Prompt Feedback', qa(Q.prompt, E.promptFeedback)),
    { title: 'Credits', rows: [['Title', TITLE], ['Font', 'Fredoka, SIL Open Font License 1.1'], ['Engine', 'Three.js r180, MIT licence'], ['Physics', 'Rapier 0.19.3 by Dimforge, Apache 2.0'], ['Everything else', 'All art, music, sound, voices and words were made in code for this game']] },
  ];
}
