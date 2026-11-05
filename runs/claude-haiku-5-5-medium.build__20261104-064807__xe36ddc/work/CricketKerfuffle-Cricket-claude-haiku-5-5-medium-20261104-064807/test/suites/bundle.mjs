// bundle: the single file is the deliverable. Its name, the hub client first and byte for byte, the hub and catalogue
// tags, no outside requests, no TODO, FIXME or placeholder text in the source, and the exit interview's shape.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const NAME = 'CricketKerfuffle-Cricket-claude-haiku-5-5-medium-20261104-064807';
export async function run({ check }) {
  const parent = path.resolve(root, '..');
  const htmlPath = path.join(parent, NAME + '.html');
  let html = '';
  try { html = readFileSync(htmlPath, 'utf8'); } catch (e) { check('the single file exists in the root folder', false, htmlPath); return; }
  check('the single file is named as the deliverable', true);
  const client = readFileSync(path.join(root, 'vendor', 'aihub', 'session.js'), 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  const charsetAt = head.indexOf('<meta charset="utf-8">');
  const firstScript = head.indexOf('<script>');
  check('the hub client is the first script, right after the charset', charsetAt >= 0 && firstScript > charsetAt && head.slice(charsetAt, firstScript).replace(/<meta charset="utf-8">/, '').trim() === '', 'order');
  check('the hub client is identical to vendor/aihub/session.js', html.includes('<script>' + client.replace(/<\/script/gi, '<\\/script') + '</script>'), 'client differs');
  const tag = name => (head.match(new RegExp('<meta name="' + name.replace(/:/g, '\\:') + '" content="([^"]*)">')) || [])[1];
  check('hub:session is 1', tag('hub:session') === '1', tag('hub:session'));
  check('hub:session-players is 1-4', tag('hub:session-players') === '1-4', tag('hub:session-players'));
  check('hub:session-mode is parallel', tag('hub:session-mode') === 'parallel', tag('hub:session-mode'));
  check('the goal is at most 60 characters', (tag('hub:session-goal') || '').length > 0 && tag('hub:session-goal').length <= 60, tag('hub:session-goal'));
  check('the howto is at most 80 characters', (tag('hub:session-howto') || '').length > 0 && tag('hub:session-howto').length <= 80, tag('hub:session-howto'));
  check('the catalogue type is Game', tag('hub:type') === 'Game', tag('hub:type'));
  check('the title is Cricket Kerfuffle', html.includes('<title>Cricket Kerfuffle</title>'));
  // no outside requests: no src or href to a web address, no fetch, no XHR, no WebSocket
  const external = [...html.matchAll(/(?:src|href)\s*=\s*["'](https?:|\/\/)/gi)].length + (html.match(/\bfetch\s*\(|new WebSocket|XMLHttpRequest/g) || []).length;
  check('the page makes no outside requests', external === 0, 'found ' + external);
  // the source has no unfinished work: no TODO, FIXME or placeholder
  const srcDir = path.join(root, 'src');
  const bad = [];
  for (const f of readdirSync(srcDir)) {
    const text = readFileSync(path.join(srcDir, f), 'utf8');
    for (const word of ['TODO', 'FIXME', 'placeholder', 'stub', 'XXX']) if (new RegExp('\\b' + word + '\\b', 'i').test(text)) bad.push(f + ':' + word);
  }
  check('no TODO, FIXME, placeholder or stub in the source', bad.length === 0, bad.join(', '));
  // the exit interview beside the file: the exact shape, every value filled
  const ePath = path.join(parent, 'exit-interview.json');
  let ei = null;
  try { ei = JSON.parse(readFileSync(ePath, 'utf8')); } catch (e) { check('exit-interview.json exists and parses', false, e.message); return; }
  check('exit-interview.json parses', !!ei);
  const sKeys = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
  check('sourceInformation answers every field', sKeys.every(k => typeof ei.sourceInformation[k] === 'string' && ei.sourceInformation[k].trim() !== ''), sKeys.filter(k => !ei.sourceInformation[k]).join(','));
  check('testingFeedback has entries', Array.isArray(ei.testingFeedback) && ei.testingFeedback.length >= 4 && ei.testingFeedback.every(s => String(s).trim()), JSON.stringify(ei.testingFeedback).slice(0, 80));
  check('engineFeedback has entries', Array.isArray(ei.engineFeedback) && ei.engineFeedback.length >= 6 && ei.engineFeedback.every(s => String(s).trim()));
  check('promptFeedback has entries', Array.isArray(ei.promptFeedback) && ei.promptFeedback.length >= 4 && ei.promptFeedback.every(s => String(s).trim()));
  const aKeys = ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags'];
  check('aiHub has every field', aKeys.every(k => k in ei.aiHub), aKeys.filter(k => !(k in ei.aiHub)).join(','));
  check('aiHub genre is one of the list', ['Action', 'Adventure', 'Fighting', 'Flight', 'Horror', 'Kids & Learning', 'Life Sim', 'Platformer', 'Puzzle', 'Racing', 'RPG', 'Shooter', 'Simulation', 'Sports', 'Stealth', 'Strategy'].includes(ei.aiHub.genre), ei.aiHub.genre);
  check('aiHub tags are 3 to 6 lowercase tags', Array.isArray(ei.aiHub.tags) && ei.aiHub.tags.length >= 3 && ei.aiHub.tags.length <= 6 && ei.aiHub.tags.every(t => t === t.toLowerCase()));
}
