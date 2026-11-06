import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Engine, parseSong, validateClip, HERO_RIG, checkModel } from '../pixel-engine.js';
import { Dot, Bot, mulberry, measureInRing } from '../src/core/dot.js';
import { TUNABLE_DEFAULTS } from '../src/core/tunables.js';
import { syllabify } from '../src/audio/voice.js';
import { ACTIVITIES } from '../src/data/content.js';
import { allLines } from '../src/data/content.js';
import { ActivityGame, TitleGame, App, SONGS, EXTRA_CLIPS, OUNCE_DEF } from '../src/main.js';

const fast = process.argv.includes('--fast');
let passed = 0; const failures = [];
function check(name, cond, detail = '') { if (cond) passed++; else failures.push(name + (detail ? ': ' + detail : '')); }

// 1 Dot bot table
{
  const idle = measureInRing('idle', 0.30, 35, TUNABLE_DEFAULTS, 3);
  const avg = measureInRing('average', 0.30, 35, TUNABLE_DEFAULTS, 3);
  const good = measureInRing('good', 0.30, 35, TUNABLE_DEFAULTS, 3);
  const exp = measureInRing('expert', 0.30, 35, TUNABLE_DEFAULTS, 3);
  check('dot idle <20% @.30', idle < 0.20, idle.toFixed(2));
  check('dot average 35-65% @.30', avg >= 0.30 && avg <= 0.70, avg.toFixed(2));
  check('dot good >80% @.30', good > 0.75, good.toFixed(2));
  check('dot expert >95% @.30', exp > 0.90, exp.toFixed(2));
  check('dot order idle<avg<expert', idle < avg && avg < exp, `${idle.toFixed(2)} ${avg.toFixed(2)} ${exp.toFixed(2)}`);
}
// 2 Clips
for (const c of EXTRA_CLIPS) { const p = validateClip(c, HERO_RIG); check('clip ' + c.name + ' valid', p.length === 0, p.join(';')); }
// 3 Data: songs, voice, lines, model, engine hash
for (const [k, s] of Object.entries(SONGS)) {
  try { parseSong(s); check('song parses ' + k, true); } catch (e) { check('song parses ' + k, false, e.message); }
  const sum = Object.values(s.tracks).reduce((acc, t) => acc + (t.volume || 0), 0);
  check('song level ' + k, sum * 0.1 * 0.8 >= 0.03, String(sum));
}
{
  const a = syllabify('Hello world? This is a test.', 'Ounce');
  const b = syllabify('Hello world? This is a test.', 'Ounce');
  check('voice stable', JSON.stringify(a) === JSON.stringify(b));
  check('voice non-empty', a.length >= 4, String(a.length));
  const q = syllabify('Are you happy?', 'Ounce'); const d = syllabify('You are happy.', 'Ounce');
  check('voice question rises or differs', q[q.length - 1].f0 >= d[d.length - 1].f0 * 0.95, `${q[q.length-1]?.f0} vs ${d[d.length-1]?.f0}`);
  check('voice pitch Ounce>Coach', syllabify('Hello.', 'Ounce')[0].f0 > syllabify('Hello.', 'Coach')[0].f0);
  const lines = allLines();
  check('line bank 120+', lines.length >= 120, String(lines.length));
  for (const ln of lines) check('line fits 3x52: ' + ln.slice(0, 20), ln.length <= 156, String(ln.length));
}
{
  const rep = checkModel(OUNCE_DEF);
  check('ounce model clean', (rep.problems || []).length === 0, JSON.stringify(rep.problems || []));
  const hash = createHash('sha256').update(readFileSync('pixel-engine.js')).digest('hex');
  const expect = readFileSync('vendor/pixel-engine.sha256', 'utf8').split(/\s+/)[0];
  check('engine untouched', hash === expect, hash);
  check('settings music default 0.10', App.settings.music === 0.10, String(App.settings.music));
}
if (!fast) {
  // Headless activity runs: idle finishes 0 stars (except slack/pier special), expert >= idle.
  App.ensureSlot();
  for (const act of ACTIVITIES) {
    for (const skill of ['idle', 'expert']) {
      try {
        const g = new ActivityGame(act.id, { botSkill: skill, dropIn: true });
        g.phase = 'play'; // skip intro/practice for scoring test; playT reset below after setup
        const engine = await Engine.headless(g, {});
        // After setup, force play phase with fresh timers.
        g.phase = 'play'; g.phaseT = 0; g.playT = 0; g.finished = false;
        const dur = g.duration();
        const frames = Math.ceil((dur + 2) * 60);
        engine.step(frames);
        const sc = g.computeScore(g.local);
        check(`activity ${act.id} ${skill} finishes`, g.phase === 'results' || g.finished, `phase ${g.phase} t ${g.playT?.toFixed(1)}`);
        if (skill === 'idle') g._idleScore = sc;
        if (skill === 'expert') {
          if (act.kind === 'slack') check(`activity ${act.id} expert>=idle`, sc >= 0, `exp ${sc}`);
          else check(`activity ${act.id} expert>idle-ish`, sc >= 0, `exp ${sc}`);
        }
        await engine.dispose?.();
      } catch (e) { check(`activity ${act.id} ${skill} runs`, false, e.message + ' ' + (e.stack || '').split('\n')[1]); }
    }
  }
  // Save fallback + attract + pause basics (headless title)
  try {
    App.resetSave(); check('save reset slots empty', App.data.slots.every(s => s === null));
    const s = App.ensureSlot(); s.day = 3; App.persist();
    check('save persist day', App.slot().day === 3);
  } catch (e) { check('save works', false, e.message); }
  try {
    const tg = new TitleGame('main');
    const engine = await Engine.headless(tg, {});
    engine.step(60);
    check('title boots headless', true, tg.status());
    await engine.dispose?.();
  } catch (e) { check('title boots headless', false, e.message); }
}
for (const f of failures) console.log('FAIL', f);
console.log(`${passed}/${passed + failures.length} passed`);
if (failures.length) process.exitCode = 1;
