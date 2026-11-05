// Browser checks (sections 11.7, 11.8): tools/check.mjs on the deliverable at three sizes and the deep links; the
// bundle's head, its hub metas, no external URLs; exit-interview.json's shape.
import { execFile } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
const NAME = 'EurophoriaFootball-EuropeanFootball-claude-opus-5-5-xhigh-20261104-071739';
const sh = (args) => new Promise(res => execFile('node', args, { cwd: new URL('../../', import.meta.url).pathname, timeout: 240000, maxBuffer: 1 << 24 }, (err, out, errOut) => res({ code: err ? (err.code || 1) : 0, out: String(out) + String(errOut) })));
export async function run({ check }) {
  const S = 'browser', root = new URL('../../../', import.meta.url).pathname, file = root + NAME + '.html', dev = new URL('../../', import.meta.url).pathname;
  check(S, 'the deliverable exists', existsSync(file));
  const html = readFileSync(file, 'utf8'), session = readFileSync(dev + 'vendor/session.js', 'utf8');
  check(S, 'head starts with charset, then session.js unmodified', html.startsWith('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<script>' + session + '</script>'));
  const meta = n => { const m = new RegExp('<meta name="' + n + '" content="([^"]*)">').exec(html); return m ? m[1] : null; };
  check(S, 'hub metas', meta('hub:session') === '1' && meta('hub:session-players') === '2-4' && meta('hub:session-mode') === 'shared-world' && !!meta('hub:session-goal') && meta('hub:session-minutes') === '4');
  check(S, 'howto at most 80 characters', meta('hub:session-howto') && [...meta('hub:session-howto')].length <= 80);
  check(S, 'no external script, link or image URLs', !/<(script|link|img)[^>]+(src|href)="https?:/i.test(html));
  check(S, 'title is Europhoria Football', /<title>Europhoria Football<\/title>/.test(html));
  // the exit interview
  const ei = root + 'exit-interview.json';
  if (existsSync(ei)) {
    let j = null; try { j = JSON.parse(readFileSync(ei, 'utf8')); } catch (e) { j = null; }
    check(S, 'exit-interview.json parses', !!j);
    if (j) {
      const si = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
      check(S, 'every Source Information field filled', si.every(k => typeof j.sourceInformation[k] === 'string' && j.sourceInformation[k].trim()), si.filter(k => !j.sourceInformation[k]).join(','));
      check(S, 'feedback answers 4/6/4', j.testingFeedback.length === 4 && j.engineFeedback.length === 6 && j.promptFeedback.length === 4 && [...j.testingFeedback, ...j.engineFeedback, ...j.promptFeedback].every(s => typeof s === 'string' && s.trim()));
      const A = j.aiHub, genres = ['Action', 'Adventure', 'Fighting', 'Flight', 'Horror', 'Kids & Learning', 'Life Sim', 'Platformer', 'Puzzle', 'Racing', 'RPG', 'Shooter', 'Simulation', 'Sports', 'Stealth', 'Strategy'];
      check(S, 'aiHub fields', A && ['name', 'tagline', 'description', 'type', 'genre', 'source', 'players', 'controls'].every(k => typeof A[k] === 'string' && A[k].trim()) && typeof A.series === 'string' && genres.includes(A.genre) && ['Game', 'Tech demo', 'Tool'].includes(A.type));
      check(S, '3-6 lowercase tags', Array.isArray(A.tags) && A.tags.length >= 3 && A.tags.length <= 6 && A.tags.every(t => t === t.toLowerCase()));
      const about = /const EF_ABOUT = (\{.*?\});\n/.exec(html); check(S, 'the About pages carry the exit interview', about && JSON.parse(about[1]).sourceInformation.usage === j.sourceInformation.usage);
    }
  } else check(S, 'exit-interview.json exists', false);
  // the checker on the deliverable
  const runs = [['#title', '1280x720'], ['#match', '1920x1080'], ['#match/euphorium', '1280x720'], ['#match/stahlpresse', '1280x720'], ['#cup/r1', '1280x720'], ['#ending', '1280x720'], ['#album', '1280x720'], ['#about', '1280x720'], ['#attract', '1280x720'], ['#touchonly', '390x844@3']];
  for (const [hash, size] of runs) {
    const r = await sh(['tools/check.mjs', root + NAME + '.html' + hash, '--seconds', hash === '#attract' ? '40' : '3', '--size', size, '--out', 'shots/check' + hash.replace(/[^a-z0-9]/gi, '_')]);
    check(S, 'check.mjs ' + hash + ' ' + size, r.code === 0 && /no errors/.test(r.out), r.out.split('\n').filter(l => /error|Error|FAIL/.test(l)).slice(0, 3).join(' | '));
    check(S, 'no files loaded from the internet ' + hash, !/not self-contained/.test(r.out));
  }
}
