// node build.mjs: src/*.js (name order) -> build/game.js (one IIFE) -> ../ThugbyTurbo-Rugby-...html (one self-contained page)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
export const NAME = 'ThugbyTurbo-Rugby-claude-opus-5-5-medium-20261104-065619';
export function build({ quiet } = {}) {
  const files = readdirSync(join(here, 'src')).filter(f => f.endsWith('.js')).sort();
  let js = "(() => {\n'use strict';\nconst E = My3D2dge;\n";
  const about = aboutPages();
  for (const f of files) js += `/* ==== ${f} ==== */\n` + readFileSync(join(here, 'src', f), 'utf8').replace('TT.ABOUT = [];', () => 'TT.ABOUT = ' + JSON.stringify(about) + ';') + '\n';
  js += '})();\n';
  mkdirSync(join(here, 'build'), { recursive: true });
  writeFileSync(join(here, 'build', 'game.js'), js);
  const esc = s => s.replace(/<\/script/gi, '<\\/script');
  const session = readFileSync(join(here, 'vendor', 'aihub-session.js'), 'utf8');
  const engine = readFileSync(join(here, 'engine', 'my-3d2dge.js'), 'utf8');
  let page = readFileSync(join(here, 'page.html'), 'utf8');
  page = page.replace('<!--SESSION-->', () => '<script>' + esc(session) + '</script>')
    .replace('<!--ENGINE-->', () => '<script>' + esc(engine) + '</script>')
    .replace('<!--GAME-->', () => '<script>' + esc(js) + '</script>');
  const out = join(here, '..', NAME + '.html');
  writeFileSync(out, page);
  if (!quiet) console.log('built', out, (page.length / 1024 / 1024).toFixed(2) + ' MB');
  return { out, js };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) build();

/** the About & Credits pages, from exit-interview.json (the same answers as the chat reply) */
export function aboutPages() {
  let x = null; try { x = JSON.parse(readFileSync(join(here, '..', 'exit-interview.json'), 'utf8')); } catch (e) { x = null; }
  const asc = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u2026/g, '...').replace(/[^\x20-\x7e\u2715\u25cb\u25a1\u25b3]/g, '');
  const pages = [{ title: 'THUGBY TURBO', lines: ['An original game inspired by rugby: over-the-top arcade rugby sevens. Every team, person and place is made up.', 'Made with the my-3D2dge engine v0.85.2 and the AI Hub session client 1.4.0.', 'Built by claude-opus-5-5 (Anthropic) at reasoning effort medium, from PLAN.md (written by claude-opus-5-5 at max effort).', 'The title was picked from 50 brainstormed riffs on "rugby" by a real random number generator: Python secrets.randbelow(50) gave entry 17, "Thugby Turbo".'] }];
  if (!x) return pages;
  const si = x.sourceInformation, L = (k, v) => k.toUpperCase() + ': ' + asc(v);
  pages.push({ title: 'SOURCE INFORMATION', lines: [L('Date', si.date), L('Source', si.source), L('Plan', si.plan), L('Genre', si.genre), L('Perspective', si.perspective), L('Tech', si.tech), L('Art direction', si.artDirection), L('Animation', si.animation), L('Audio', si.audio), L('Online', si.online), L('Testing', si.testing), L('Research', si.research), L('Environment', si.environment), L('Model', si.model), L('Usage', si.usage)] });
  const q = { testing: ['How many issues did testing catch?', 'How many were critical / game breaking?', 'The most helpful test', 'The least helpful test'], engine: ['What I liked most', 'Stuck or guessed wrong?', 'The most important thing I built', 'The hardest part', 'What I changed in the engine, and why', 'One thing I would change'], prompt: ['What I liked most', 'What was confusing', 'The hardest thing', 'What I would change'] };
  pages.push({ title: 'TESTING FEEDBACK', lines: x.testingFeedback.map((a, i) => asc(q.testing[i] + ': ' + a)) });
  pages.push({ title: 'ENGINE FEEDBACK', lines: x.engineFeedback.map((a, i) => asc(q.engine[i] + ': ' + a)) });
  pages.push({ title: 'PROMPT FEEDBACK', lines: x.promptFeedback.map((a, i) => asc(q.prompt[i] + ': ' + a)) });
  return pages;
}
