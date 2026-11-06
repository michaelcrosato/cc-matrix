import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const project = path.dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
let checks = 0;
let failures = 0;
function check(name, valid, detail = '') {
  checks++;
  if (!valid) { failures++; console.log(`FAIL ${name}: ${detail}`); }
}
async function run(name, command, commandArgs) {
  await new Promise(resolve => {
    const child = spawn(command, commandArgs, { cwd: project, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', buffer = '', failedLines = 0, finished = false;
    const flush = line => {
      if (/^(?:FAIL|ERROR|Error:|AssertionError)/.test(line)) { failedLines++; console.log(line); }
    };
    child.stdout.on('data', chunk => {
      output += chunk;
      buffer += chunk;
      const lines = buffer.split('\n'); buffer = lines.pop(); lines.forEach(flush);
    });
    child.stderr.on('data', chunk => { output += chunk; });
    const timer = setTimeout(() => child.kill('SIGTERM'), 420000);
    child.once('error', error => { output += error.message; });
    child.once('close', code => {
      if (finished) return; finished = true; clearTimeout(timer);
      if (buffer) flush(buffer);
      const count = [...output.matchAll(/(\d+)\s+(?:simulation\s+|browser\s+|network\s+)?(?:checks|tests)/gi)].at(-1);
      checks += count ? Number(count[1]) : 1;
      if (code !== 0) {
        failures += Math.max(1, failedLines);
        if (!failedLines) console.log(`FAIL ${name}: ${output.trim().slice(-3500) || `exit ${code}`}`);
      }
      resolve();
    });
  });
}

if (!args.has('--browser-only')) {
  const html = path.join(project, '..', `${path.basename(project)}.html`);
  check('single HTML deliverable exists', existsSync(html), html);
  if (existsSync(html)) {
    const source = readFileSync(html, 'utf8');
    check('AI Hub metadata declares shared world', /name="hub:session-mode"\s+content="shared-world"/.test(source));
    check('AI Hub client is embedded before game code', source.includes('aihub-session 1.4.0') && source.indexOf('aihub-session 1.4.0') < source.indexOf('<script type="module"'));
    check('bundled game does not import local JavaScript files', !/<script[^>]+src=["']\.?\.?\//.test(source));
  }
  const interview = path.join(project, '..', 'exit-interview.json');
  check('exit interview exists beside HTML', existsSync(interview), interview);
  if (existsSync(interview)) {
    try {
      const data = JSON.parse(readFileSync(interview, 'utf8'));
      check('exit interview has required root keys', ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub'].every(key => key in data));
      check('source information fields are filled', ['date','source','plan','genre','perspective','tech','artDirection','animation','audio','online','testing','research','environment','model','usage'].every(key => typeof data.sourceInformation[key] === 'string' && data.sourceInformation[key].trim().length > 0));
      check('usage is left for the importer', data.sourceInformation.usage === 'added on import');
      check('exit interview feedback has required answer counts', data.testingFeedback.length === 4 && data.engineFeedback.length === 6 && data.promptFeedback.length === 4);
    } catch (error) { check('exit interview parses', false, error.message); }
  }
  if (!args.has('--static-only')) {
    await run('simulation tests', process.execPath, ['simulation-tests.mjs']);
    await run('visual tests', process.execPath, ['visual-tests.mjs']);
    await run('network transport tests', process.execPath, ['network-tests.mjs']);
  }
}
if (!args.has('--simulation-only') && !args.has('--static-only')) {
  const python = '/home/micha/.local/share/pipx/venvs/playwright/bin/python';
  const browserArgs = ['browser-tests.py'];
  if (args.has('--skip-hub')) browserArgs.push('--skip-hub');
  if (args.has('--only-hub')) browserArgs.push('--only-hub');
  await run('browser tests', python, browserArgs);
}
console.log(`${checks} checks, ${failures} failed`);
process.exitCode = failures ? 1 : 0;
