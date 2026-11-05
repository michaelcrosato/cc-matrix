// writes exit-interview.json (beside the deliverable html) from the in-game About data, so the two can never disagree
import { load, root } from '../tests/lib.mjs';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const O = load().OLY, a = O.ABOUT;
const out = { sourceInformation: Object.assign({}, a.src), testingFeedback: a.test, engineFeedback: a.eng, promptFeedback: a.prompt, aiHub: a.aiHub };
const f = path.join(root, '..', 'exit-interview.json');
writeFileSync(f, JSON.stringify(out, null, 2) + '\n');
console.log('wrote', f);
