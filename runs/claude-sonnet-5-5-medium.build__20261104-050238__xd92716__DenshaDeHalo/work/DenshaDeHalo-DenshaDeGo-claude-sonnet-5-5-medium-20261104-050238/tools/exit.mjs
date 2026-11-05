// writes ../exit-interview.json from src/65-about.js (the same data the in-game About screen shows) and checks it parses
import vm from 'node:vm';
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url).pathname;
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(readFileSync(root + 'src/65-about.js', 'utf8').replace('const DH = window.DH;', 'const DH = window.DH = {};'), ctx);
const A = ctx.window.DH.ABOUT, out = { sourceInformation: A.info, testingFeedback: A.testing, engineFeedback: A.engine, promptFeedback: A.prompt, aiHub: A.aiHub };
const json = JSON.stringify(out, null, 2); JSON.parse(json);
const missing = []; (function walk(o, p) { for (const k in o) { const v = o[k]; if (v === '' && !(p === 'aiHub' && k === 'series')) missing.push(p + '.' + k); else if (v && typeof v === 'object') walk(v, p + '.' + k); } })(out, '');
if (missing.length) { console.log('EMPTY', missing); process.exit(1); }
writeFileSync(root + '../exit-interview.json', json + '\n'); console.log('wrote exit-interview.json', json.length, 'bytes');
