// Node, no browser: rules, tables, greps, the built file.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'; import { join } from 'node:path';
const walk = (d) => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
export default async function ({ T, HTML, EXIT, here }) {
  const P = await import(`file://${here}/src/game/programme.js`), Tn = await import(`file://${here}/src/data/tuning.js`), Ch = await import(`file://${here}/src/data/charts.js`), Dg = await import(`file://${here}/src/data/dialogue.js`), Pr = await import(`file://${here}/src/data/programme.js`), Un = await import(`file://${here}/src/data/unlocks.js`), Ps = await import(`file://${here}/src/data/poses.js`), Pa = await import(`file://${here}/src/data/palettes.js`);
  for (let i = 0; i < 5; i++) for (const m of [0, .3, .6, 1]) { const a = P.wobbleAge(m, i); T.ok(a >= 18 && a <= 99, `wobble age bounds ${a}`); }
  T.eq(P.wobbleAge(1, 4), 18, 'wobble floor'); T.eq(P.wobbleAge(0, 0), 99, 'wobble ceiling');
  T.ok(P.wobbleAge(.6, 0) > P.wobbleAge(.6, 4), 'handicap shrinks'); T.ok(P.wobbleAge(1, 9) === 18, 'handicap past the table');
  T.eq(P.marblesFor(1, 90, true), 2 + 3 + 2, 'marbles: minute, medal, first'); T.eq(P.marblesFor(.2, 10, false), 2, 'marbles minimum');
  T.eq(P.medalFor(97).id, 'suspicious', 'medal'); T.eq(P.medalFor(85).id, 'exemplary', 'medal'); T.eq(P.medalFor(65).id, 'pleasant', 'medal'); T.eq(P.medalFor(40).id, 'adequate', 'medal'); T.eq(P.medalFor(39).id, 'attended', 'medal');
  T.ok(P.tierOpen(undefined, 0), 'tier 0'); T.ok(!P.tierOpen([64], 1), 'tier 1 shut'); T.ok(P.tierOpen([65], 1), 'tier 1 open'); T.ok(!P.tierOpen([90, 84], 2), 'tier 2 shut'); T.ok(P.tierOpen([90, 85], 2), 'tier 2 open');
  const fake = { poses: 1, fruitHat: 1, logReps: 1, stepClass: 1, cairn: 1, roomService: 1, plates: 1, plank: 1, springboard: 1, stillWater: 1, islandLoop: 1, raft: 1, tug: 1, grandHold: 1 };
  T.eq(P.totalSteps(fake), 19, 'total steps'); const cut = { ...fake }; delete cut.islandLoop; delete cut.tug; T.eq(P.totalSteps(cut), 17, 'a removed event leaves a working programme'); T.ok(P.liveDays(cut)[3].classes.every(c => cut[c]), 'days skip cut events');
  T.eq(P.restTilt(0, 19), 9, 'tilt start'); T.eq(P.restTilt(19, 19), 0, 'tilt end');
  for (const d of Pr.DAYS) for (const c of d.classes) T.ok(fake[c], `day ${d.day} has unknown class ${c}`);
  for (const d of Pr.DAYS) if (Array.isArray(d.tests)) for (const t of d.tests) T.ok(Pr.ALL_TESTS.includes(t), `unknown test ${t}`);
  for (const k in Tn.TUNING) { const t = Tn.TUNING[k]; T.ok(t.default >= t.min && t.default <= t.max, `tuning ${k} default outside range`); }
  for (const k in Ch.CHARTS) { const c = Ch.CHARTS[k]; for (const bar of c.bars) T.ok(bar.length === 8 && /^[LRB<>^v.]+$/.test(bar), `chart ${k} bad bar ${bar}`); }
  const n1 = Ch.chartNotes(Ch.CHARTS.tier1); T.ok(n1.notes.length > 60, 'tier1 notes'); const sess = Ch.chartNotes(Ch.CHARTS.session); T.ok(sess.length <= 50.1, `session chart fits its slot, ${sess.length}`);
  T.eq(Ps.POSES.length, 8, 'eight poses'); T.ok(Object.keys(Pa.PALETTES).length === 4, 'palettes');
  const counts = Dg.linesCount(); T.ok(counts.trudy >= 200, `Trudy lines ${counts.trudy}`); T.ok(counts.stillwater >= 60, `Stillwater lines ${counts.stillwater}`); T.ok(counts.bolster >= 60, `Bolster lines ${counts.bolster}`); T.ok(counts.guests >= 60, `guest lines ${counts.guests}`);
  T.ok(Dg.QUESTIONS.every(q => q.yes && q.no && q.a && q.b), 'every question replies both ways');
  const us = Un.UNLOCKS.map(u => u.at); T.ok(JSON.stringify(us) === JSON.stringify([6, 14, 24, 36, 50, 60]), 'unlock thresholds');
  // Save handling
  const Sv = readFileSync(join(here, 'src/core/save.js'), 'utf8'); T.ok(/JSON\.parse/.test(Sv) && /try/.test(Sv), 'save reads inside try');
  const sv = await import(`file://${here}/src/core/save.js`).catch(() => null); if (sv) { T.eq(sv.parseSave('{broken').current, -1, 'corrupt save handled'); T.eq(sv.parseSave('{"v":1,"profiles":[]}').profiles.length, 4, 'old version handled'); }
  const R = await import(`file://${here}/src/core/rng.js`); const a = R.mulberry32(5), b = R.mulberry32(5); T.ok(a() === b() && a() === b(), 'rng repeatable');
  // Source greps
  const files = walk(join(here, 'src')).filter(f => /\.(js|css)$/.test(f));
  for (const f of files) {
    const s = readFileSync(f, 'utf8'), rel = f.slice(here.length + 1);
    if (!rel.endsWith('core/rng.js')) T.ok(!/Math\.random/.test(s), `${rel}: Math.random`);
    const bad = /\b(TODO|FIXME)\b|placeholder|\bstub/i.exec(s); T.ok(!bad, `${rel}: ${bad && bad[0]}`);
    const dlg = /\balert\(|\bconfirm\(|\bprompt\(|window\.open|WebSocket|RTCPeerConnection/.exec(s); T.ok(!dlg, `${rel}: ${dlg && dlg[0]}`);
    const aud = /\.(mp3|ogg|wav|m4a|flac)\b|decodeAudioData/.exec(s); T.ok(!aud, `${rel}: audio file ${aud && aud[0]}`);
    if (!/data\/(config|about)\.js$|game\/ending\.js$/.test(rel)) { const nm = /wii|mii\b|balance board/i.exec(s); T.ok(!nm, `${rel}: source name ${nm && nm[0]}`); }
    const comp = /computeAsync|\bcompute\(|instancedArray|storage\(/.exec(s); T.ok(!comp, `${rel}: compute ${comp && comp[0]}`);
    const tone = /\b(bmi|calorie|fat|overweight|skinny|diet)\b/i.exec(s); if (rel.includes('dialogue')) T.ok(!tone, `${rel}: tone guard ${tone && tone[0]}`);
  }
  // Every animation clip the rigs define is played somewhere.
  const allSrc = files.map(f => readFileSync(f, 'utf8')); const clipFiles = ['src/anim/clips.js', 'src/art/trudy.js', 'src/art/heron.js', 'src/art/walrus.js', 'src/art/gull.js'];
  for (const cf of clipFiles) { const text = readFileSync(join(here, cf), 'utf8'); const names = new Set([...text.matchAll(/(?:poseClip|hold|loopKeys)\('([A-Za-z_]+)'/g)].map(m => m[1])); for (const n of names) { if (n === 'name') continue; const used = allSrc.some((src, i) => { const stripped = files[i].endsWith(cf) ? src.replace(/(?:poseClip|hold|loopKeys)\('[A-Za-z_]+'/g, '') : src; return stripped.includes(`'${n}'`); }) || (n.startsWith('pose_') && readFileSync(join(here, 'src/data/poses.js'), 'utf8').includes(`'${n}'`)); T.ok(used, `${cf}: clip ${n} never plays`); } }
  // Every sound effect the table defines is triggered somewhere.
  const sfxText = readFileSync(join(here, 'src/audio/sfx.js'), 'utf8'); for (const m of sfxText.matchAll(/^  ([a-zA-Z]+)\(c, o, t/gm)) { const n = m[1]; if (['move', 'ok', 'back'].includes(n)) continue; T.ok(allSrc.some((src, i) => !files[i].endsWith('audio/sfx.js') && src.includes(`'${n}'`)), `sfx ${n} never plays`); }
  // Built file
  const html = readFileSync(HTML, 'utf8'); const i1 = html.indexOf('<meta charset="utf-8">'), i2 = html.indexOf('<script>'); T.ok(i1 >= 0 && i2 === i1 + '<meta charset="utf-8">'.length, 'client directly after meta charset'); T.ok(html.includes('/*! aihub-session 1.4.0'), 'hub client inlined');
  for (const [n, c] of [['hub:session', '1'], ['hub:session-players', '1-4'], ['hub:session-mode', 'ghost'], ['hub:session-minutes', '3']]) T.ok(html.includes(`<meta name="${n}" content="${c}">`), `meta ${n}`);
  T.ok(!/hub:webgpu/.test(html.slice(0, 40000)), 'no hub:webgpu required'); const scripts = html.split('<script>'); for (const part of scripts.slice(1)) { const body = part.split('</script>'); T.ok(body.length === 2, 'no </script inside a script'); }
  T.ok(!/<script[^>]+src=/.test(html) && !/<link[^>]+href=/.test(html), 'no external scripts or links');
  const cfg = readFileSync(join(here, 'src/data/config.js'), 'utf8'); const title = /TITLE = '([^']+)'/.exec(cfg)[1]; T.ok(html.includes(`<title>${title}</title>`), 'title constant'); T.ok(!/wii/i.test(title), 'title is not the source name');
  // Exit interview
  if (!T.ok(existsSync(EXIT), 'exit-interview.json exists')) return;
  const E = JSON.parse(readFileSync(EXIT, 'utf8')); const keys = (o) => Object.keys(o).sort().join();
  T.eq(keys(E), 'aiHub,engineFeedback,promptFeedback,sourceInformation,testingFeedback', 'exit keys');
  T.eq(keys(E.sourceInformation), ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'].sort().join(), 'source keys');
  T.eq(E.testingFeedback.length, 4, 'testing answers'); T.eq(E.engineFeedback.length, 6, 'engine answers'); T.eq(E.promptFeedback.length, 4, 'prompt answers');
  T.eq(keys(E.aiHub), ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags'].sort().join(), 'aiHub keys');
  for (const k in E.sourceInformation) T.ok(E.sourceInformation[k], `empty ${k}`); for (const k in E.aiHub) if (k !== 'series') T.ok(E.aiHub[k] && E.aiHub[k].length !== 0, `empty aiHub.${k}`);
  T.eq(E.sourceInformation.usage, 'added on import', 'usage'); T.eq(E.aiHub.name, title, 'aiHub name'); T.ok(E.aiHub.tags.length >= 3 && E.aiHub.tags.length <= 6 && E.aiHub.tags.every(t => t === t.toLowerCase()), 'tags');
  T.ok(['Action', 'Adventure', 'Fighting', 'Flight', 'Horror', 'Kids & Learning', 'Life Sim', 'Platformer', 'Puzzle', 'Racing', 'RPG', 'Shooter', 'Simulation', 'Sports', 'Stealth', 'Strategy'].includes(E.aiHub.genre), 'genre');
  T.eq(E.sourceInformation.source, 'Wii Fit', 'source'); T.eq(E.sourceInformation.plan, 'PLAN.md', 'plan');
}
