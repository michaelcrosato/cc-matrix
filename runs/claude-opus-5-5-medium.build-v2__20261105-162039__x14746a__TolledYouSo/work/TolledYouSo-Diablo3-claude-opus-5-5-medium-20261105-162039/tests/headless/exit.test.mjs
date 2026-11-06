// The exit interview: exact shape, answers filled, parses, and agrees with the title.
import { existsSync, readFileSync } from 'node:fs';
import { ok, eq, guarded } from '../lib.mjs';
import { TITLE } from '../../src/data/meta.js';
await guarded(async () => {
  const p = '../exit-interview.json'; if (!ok(existsSync(p), 'exit-interview.json exists beside the HTML')) return;
  const o = JSON.parse(readFileSync(p, 'utf8'));
  eq(Object.keys(o).sort().join(), 'aiHub,engineFeedback,promptFeedback,sourceInformation,testingFeedback', 'top keys');
  eq(Object.keys(o.sourceInformation).join(), 'date,source,plan,genre,perspective,tech,artDirection,animation,audio,online,testing,research,environment,model,usage', 'source information keys');
  for (const [k, v] of Object.entries(o.sourceInformation)) ok(typeof v === 'string' && v.length > 0, `sourceInformation.${k} filled`);
  eq(o.sourceInformation.usage, 'added on import', 'usage'); eq(o.sourceInformation.source, 'Diablo 3', 'source');
  eq(o.testingFeedback.length, 4, 'testing answers'); eq(o.engineFeedback.length, 6, 'engine answers'); eq(o.promptFeedback.length, 4, 'prompt answers');
  for (const a of [...o.testingFeedback, ...o.engineFeedback, ...o.promptFeedback]) ok(typeof a === 'string' && a.length > 0, 'answer filled');
  eq(Object.keys(o.aiHub).join(), 'name,tagline,description,type,genre,source,series,players,controls,tags', 'aiHub keys');
  eq(o.aiHub.name, TITLE, 'aiHub.name equals TITLE');
  ok(o.aiHub.tags.length >= 3 && o.aiHub.tags.length <= 6 && o.aiHub.tags.every((t) => t === t.toLowerCase()), '3 to 6 lowercase tags');
  for (const [k, v] of Object.entries(o.aiHub)) if (k !== 'series') ok(v && v.length, `aiHub.${k} filled`);
});
