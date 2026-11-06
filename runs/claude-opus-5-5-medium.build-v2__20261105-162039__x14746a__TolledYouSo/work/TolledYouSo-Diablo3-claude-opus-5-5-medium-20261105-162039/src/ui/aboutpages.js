// The About screen, built from the generated exit-interview data.
import { ABOUT } from '../data/about.generated.js';
const SI_LABELS = [['Date', 'date'], ['Source', 'source'], ['Plan', 'plan'], ['Genre and Perspective', null], ['Tech', 'tech'], ['Art Direction', 'artDirection'], ['Animation', 'animation'], ['Audio', 'audio'], ['Online', 'online'], ['Testing', 'testing'], ['Research', 'research'], ['Environment', 'environment'], ['Model', 'model'], ['Usage', 'usage']];
const TF = ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'];
const EF = ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why? (none if nothing)', 'If you could change one thing about the engine, what would it be?'];
const PF = ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'];
const qa = (qs, ans) => qs.flatMap((q, i) => [{ text: q, color: 'sand' }, { text: ans[i] ?? 'unknown', color: 'white' }, { text: ' ' }]);
const si = ABOUT.sourceInformation ?? {};
export const ABOUT_PAGES = [
  { tab: 'SOURCE', lines: SI_LABELS.flatMap(([l, k]) => [{ text: `${l}:`, color: 'sand' }, { text: k ? si[k] ?? 'unknown' : `${si.genre ?? 'unknown'}; ${si.perspective ?? 'unknown'}` }]) },
  { tab: 'TESTING', lines: qa(TF, ABOUT.testingFeedback ?? []) },
  { tab: 'ENGINE', lines: qa(EF, ABOUT.engineFeedback ?? []) },
  { tab: 'PROMPT', lines: qa(PF, ABOUT.promptFeedback ?? []) },
  { tab: 'CREDITS', lines: [{ text: ABOUT.gameCredit ?? '', color: 'sand' }, { text: ' ' }, ...(ABOUT.credits ?? []).map((t) => ({ text: t }))] },
];
export const ABOUT_QUESTIONS = { TF, EF, PF, SI_LABELS };
