import { op1, op2, op3, op4, op5 } from './ops1.js';
import { op6, op7, op8, op9, op10, pileup, sIntroit, sLacrimosa, sWrath } from './ops2.js';
export const OPS = [op1, op2, op3, op4, op5, op6, op7, op8, op9, op10];
export const BY_ID = Object.fromEntries([...OPS, pileup, sIntroit, sLacrimosa, sWrath].map((o) => [o.id, o]));
export const SESSION_ROUNDS = [pileup, sIntroit, sLacrimosa, sWrath];
export { pileup };
