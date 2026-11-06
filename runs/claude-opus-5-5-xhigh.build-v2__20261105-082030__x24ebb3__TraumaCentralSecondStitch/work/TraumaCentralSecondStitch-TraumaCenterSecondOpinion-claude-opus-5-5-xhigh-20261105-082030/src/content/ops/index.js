import op1 from './op1.js';
import op2 from './op2.js';
import op3 from './op3.js';
import op4 from './op4.js';
import op5 from './op5.js';
import op6 from './op6.js';
import op7 from './op7.js';
import op8 from './op8.js';
import op9 from './op9.js';
import op10 from './op10.js';
import pileup from './pileup.js';
import { sessionDiesIrae, sessionIntroit, sessionLacrimosa } from './session.js';
import { PARS } from './pars.js';

export const CAMPAIGN_OPS = [op1, op2, op3, op4, op5, op6, op7, op8, op9, op10];
export const SESSION_OPS = [pileup, sessionIntroit, sessionLacrimosa, sessionDiesIrae];
export const OPS = Object.fromEntries([...CAMPAIGN_OPS, ...SESSION_OPS].map((o) => [o.id, o]));
for (const o of Object.values(OPS)) o.par = PARS[o.id] ?? o.par ?? 4000;
