import { runBot } from './harness.mjs';
const [id, skill = '1', ...rest] = process.argv.slice(2);
const r = runBot(id, { skill: +skill, log: rest.includes('log') });
const s = r.sim;
console.log(id, 'over', s.over, s.why, 't', s.t.toFixed(1), 'stage', s.stage, 'vit', s.tables.map(t => t.vitals.toFixed(0)), 'mist', s.score.mistakes, 'pts', s.score.pts, r.res && r.res.rank, r.res && r.res.pct.toFixed(2));
if (!s.over) console.log('stuck ents', s.ents.filter(e=>e.tb===0).map(e => `${e.k}:${e.id}${e.hid?'(h)':''}`).join(' '));
