// the deliverables against TASK.md, read from disk (with --bundle): the single .html in the root with its TASK.md name,
// the AI Hub client first and unmodified, the hub tags, the title, nothing loaded from outside and no audio files, every
// source file inlined as it is now (the bundle is current), no TODO / placeholder / stub words in the game's code, and
// exit-interview.json in exactly TASK.md's shape, the same words as the in-game About screen.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { SCRIPTS } from '../tools/gen-index.mjs';
import { load } from './lib.mjs';
const here = new URL('../', import.meta.url), P = f => decodeURIComponent(new URL(f, here).pathname), read = f => readFileSync(P(f), 'utf8');
const NAME = 'DenshaDeHalo-DenshaDeGo-claude-opus-5-5-xhigh-20261104-050232';
export async function bundleChecks() {
  let passed = 0, failed = 0; const check = (w, ok, d) => { if (ok) passed++; else { failed++; console.log('FAIL bundle: ' + w + (d !== undefined ? ' (' + String(d).slice(0, 200) + ')' : '')); } };
  const file = P('../' + NAME + '.html');
  check('the single .html is in the root under its TASK.md name', existsSync(file));
  check('the dev files are in the subfolder of the same name', decodeURIComponent(here.pathname).replace(/\/$/, '').endsWith('/' + NAME));
  const out = readFileSync(file, 'utf8'), session = read('vendor/aihub/session.js'), i = out.indexOf('<script>');
  check('<meta charset> comes before any script', out.indexOf('<meta charset') > 0 && out.indexOf('<meta charset') < i);
  check('the AI Hub client is the first script, byte for byte', out.slice(i + 9, out.indexOf('</script>', i) - 1) === session);
  const tags = Object.fromEntries([...out.matchAll(/<meta name="(hub:[^"]+)" content="([^"]*)">/g)].map(m => [m[1], m[2]]));
  check('the hub tags: a Game, a ghost session for 2-4, minutes, goal and how-to', tags['hub:type'] === 'Game' && tags['hub:session'] === '1' && tags['hub:session-mode'] === 'ghost' && tags['hub:session-players'] === '2-4' && +tags['hub:session-minutes'] > 0 && !!tags['hub:session-goal'] && !!tags['hub:session-howto'], JSON.stringify(tags));
  check('the page title is the game\'s title', /<title>Densha de Halo!<\/title>/.test(out));
  check('nothing is loaded from outside (no script src, no stylesheet or module URLs)', !/<script[^>]+src=/i.test(out) && !/<link[^>]+href=/i.test(out) && !/@import\s+url/i.test(out) && !/import\s*\(\s*['"]https?:/.test(out));
  check('no audio files: every sound is made in code', !/new Audio\(|<audio\b|\.(mp3|ogg|wav|m4a|flac)\b|data:audio/i.test(out), (out.match(/.{30}(new Audio\(|<audio\b|\.(mp3|ogg|wav|m4a|flac)\b|data:audio).{30}/i) || [''])[0]);
  check('no image files: every picture is drawn in code', !/\.(png|jpe?g|gif|webp)\b["')]/i.test(out) && !/data:image\/(png|jpe?g|gif|webp);base64/i.test(out), (out.match(/.{30}(\.(png|jpe?g|gif|webp)\b["')]|data:image).{30}/i) || [''])[0]);
  const safe = js => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  const stale = SCRIPTS.filter(f => !out.includes(safe(read(f))));
  check('every script is inlined as it is now (the bundle is current: ' + SCRIPTS.length + ' scripts)', !stale.length, stale.join(', '));
  const words = /\bTODO\b|\bFIXME\b|\bXXX\b|\bTBD\b|\bHACK\b|lorem ipsum|\bstub(bed|s)?\b|\bplaceholder\b|not (yet )?implemented|coming soon/i;
  const own = readdirSync(P('src')).filter(f => f.endsWith('.js')).map(f => 'src/' + f).concat(['engine/modules/rail.js']);
  const hits = own.flatMap(f => read(f).split('\n').map((l, n) => words.test(l) ? f + ':' + (n + 1) : null).filter(Boolean));
  check('no TODO, placeholder or stub in the game\'s code', !hits.length, hits.join(' '));
  const ehits = out.split('\n').filter(l => words.test(l)).length;
  check('none in the whole bundle either (the engine included)', !ehits, ehits + ' lines');
  // exit-interview.json: TASK.md's exact shape, every value filled in, the About screen's words
  let J = null; try { J = JSON.parse(readFileSync(P('../exit-interview.json'), 'utf8')); } catch (e) { }
  check('exit-interview.json parses as JSON', !!J);
  if (J) {
    const SI = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
    check('its keys are TASK.md\'s, in order', Object.keys(J).join() === 'sourceInformation,testingFeedback,engineFeedback,promptFeedback,aiHub' && Object.keys(J.sourceInformation).join() === SI.join(), Object.keys(J.sourceInformation).join());
    check('every Source Information value is filled in', SI.every(k => typeof J.sourceInformation[k] === 'string' && J.sourceInformation[k].trim().length > 0));
    const s = J.sourceInformation;
    check('date, environment and model are TASK.md\'s words', s.date === '2026-11-04 05:02:32' && s.environment === 'Claude Code CLI (headless); Linux; browser unknown' && s.model === 'Anthropic, claude-opus-5-5, reasoning effort xhigh', JSON.stringify([s.date, s.environment, s.model]));
    check('4 testing, 6 engine and 4 prompt answers', [J.testingFeedback, J.engineFeedback, J.promptFeedback].map(a => Array.isArray(a) && a.every(t => typeof t === 'string' && t.length > 20) ? a.length : -1).join() === '4,6,4');
    const H = J.aiHub, GENRES = ['Action', 'Adventure', 'Fighting', 'Flight', 'Horror', 'Kids & Learning', 'Life Sim', 'Platformer', 'Puzzle', 'Racing', 'RPG', 'Shooter', 'Simulation', 'Sports', 'Stealth', 'Strategy'];
    check('the aiHub block: its keys, a listed type, genre and player count, 3-6 lowercase tags', Object.keys(H).join() === 'name,tagline,description,type,genre,source,series,players,controls,tags' && ['Game', 'Tech demo', 'Tool'].includes(H.type) && GENRES.includes(H.genre) && ['1', '1–2', '1–4'].includes(H.players) && Array.isArray(H.tags) && H.tags.length >= 3 && H.tags.length <= 6 && H.tags.every(t => t === t.toLowerCase()) && ['name', 'tagline', 'description', 'source', 'controls'].every(k => H[k].trim()), JSON.stringify(H).slice(0, 200));
    const { DH } = load({ errors: [] });
    check('the About screen says exactly what the file says', JSON.stringify(DH.ABOUT) === JSON.stringify(J));
    const pages = DH.ABOUT_PAGES(), heads = p => p.body.filter(b => b[0] === 'h').map(b => b[1]);
    check('the About screen: Credits, the 15 Source Information labels, then 4, 6 and 4 questions', pages.map(p => p.tab).join() === 'CREDITS,SOURCE INFO,TESTING,ENGINE,PROMPT' && heads(pages[1]).join() === DH.SOURCE_LABELS.map(l => l.toUpperCase()).join() && heads(pages[1]).length === 15 && [2, 3, 4].map(k => heads(pages[k]).filter(h => h.endsWith('?')).length).join() === '4,6,4');
    check('the aiHub name is the title screen\'s', H.name === 'Densha de Halo!' && out.includes("'DENSHA DE HALO!'"));
  }
  return { passed, failed };
}
