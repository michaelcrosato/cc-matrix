import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.dirname(project), name = path.basename(project);
const read = f => readFileSync(path.join(project, f), 'utf8');
const report = JSON.parse(read('src/report.json'));
const questions = {
  testingFeedback: ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'],
  engineFeedback: ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'If you could change one thing about the engine, what would it be?'],
  promptFeedback: ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?']
};
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const hub = read('vendor/hub/session.js');
if (/<\/script/i.test(hub)) throw new Error('Pristine Hub client contains a closing script sequence; use a byte-preserving external embedding strategy.');
const scripts = ['content', 'sim', 'bot', 'session', 'assets', 'view', 'audio', 'app'];
const reportCode = 'globalThis.ABJ.REPORT=' + JSON.stringify(report) + ';globalThis.ABJ.REPORT_QUESTIONS=' + JSON.stringify(questions) + ';';
const own = scripts.map(s => read('src/' + s + '.js') + (s === 'content' ? '\n' + reportCode : '')).join('\n');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><script>
${hub}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#10283b">
<meta name="description" content="Cut a lane. Patch the planet. A complete original planetary-defense arcade cartridge.">
<meta name="hub:session" content="1"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-players" content="1-2">
<meta name="hub:session-minutes" content="12">
<meta name="hub:session-goal" content="Defend three locations, clear six formations, then break both flagship emitters and its exposed core. The team shares deployments.">
<meta name="hub:session-howto" content="Move: A/D, arrows, mouse, stick or D-pad. Hold Space, left click, R2 or Cross to fire. Q, right click, L1 or Square repairs with salvage. Touch: drag below; second finger cuts cover. Options/Esc opens local settings.">
<title>Astro Battle Jam — Cut a lane. Patch the planet.</title>
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#091526;color:#eff5dc;overscroll-behavior:none}body{position:fixed;inset:0}canvas{display:block;width:100%;height:100%;image-rendering:pixelated;touch-action:none;outline:none}noscript{display:block;padding:2rem;font:24px monospace}</style>
</head><body><canvas id="screen" tabindex="0" aria-label="Astro Battle Jam, a planetary defense arcade game"></canvas><noscript>This game needs JavaScript to defend the planet.</noscript>
<!-- Engine MIT license: ${safe(read('vendor/engine/LICENSE')).replace(/--/g, '—')} -->
<script>${safe(read('vendor/engine/my-3d2dge.js'))}</script>
<script>${safe(own)}</script>
</body></html>`;
writeFileSync(path.join(root, name + '.html'), html);
writeFileSync(path.join(project, 'index.html'), html);
writeFileSync(path.join(root, 'exit-interview.json'), JSON.stringify(report, null, 2) + '\n');
console.log('Built ' + name + '.html (' + Buffer.byteLength(html) + ' bytes)');
