// the deliverable: the single file, the client first, the tags, no network, no TODOs, the exit interview
import { readFileSync, existsSync, readdirSync } from 'node:fs';
export default ({ suite }) => {
  const s = suite(), root = new URL('../../../', import.meta.url), dev = new URL('../../', import.meta.url);
  const NAME = 'CricketKerfuffle-Cricket-claude-opus-5-5-medium-20261104-062757';
  const f = new URL(NAME + '.html', root);
  s.ok('the single-file game is in the root, named as TASK.md asks', existsSync(f));
  const html = readFileSync(f, 'utf8'), client = readFileSync(new URL('vendor/aihub/session.js', dev), 'utf8');
  const first = html.indexOf('<script>'), charset = html.indexOf('<meta charset="utf-8">');
  s.ok('the AI Hub client is the first script, right after the charset', charset >= 0 && first > charset && html.slice(charset, first).replace(/\s/g, '') === '<metacharset="utf-8">');
  s.ok('the client is byte-for-byte the vendor copy', html.slice(first + 8, first + 8 + client.length) === client.replace(/<\/script/gi, '<\\/script'));
  const tag = n => (html.match(new RegExp('<meta name="' + n + '" content="([^"]*)">')) || [])[1];
  s.ok('the hub tags are present', tag('hub:session') === '1' && tag('hub:session-players') === '1-4' && tag('hub:session-mode') === 'parallel' && !!tag('hub:session-goal') && !!tag('hub:session-howto'));
  s.ok('the goal fits in 60 characters and the howto in 80', tag('hub:session-goal').length <= 60 && tag('hub:session-howto').length <= 80, [tag('hub:session-goal').length, tag('hub:session-howto').length]);
  s.ok('the title tag names the game', /<title>Cricket Kerfuffle<\/title>/.test(html));
  s.ok('no external script sources or fetches', !/<script[^>]+src=/i.test(html) && !/\bfetch\(/.test(readFileSync(new URL('dist/game.js', dev), 'utf8')));
  const src = readdirSync(new URL('src/', dev)).map(n => readFileSync(new URL('src/' + n, dev), 'utf8')).join('\n');
  s.ok('no TODO, FIXME or placeholder in the game source', !/\bTODO\b|\bFIXME\b|placeholder/i.test(src));
  const ei = new URL('exit-interview.json', root);
  if (existsSync(ei)) {
    let j = null; try { j = JSON.parse(readFileSync(ei, 'utf8')); } catch (e) { /* reported below */ }
    s.ok('exit-interview.json parses', !!j);
    if (j) {
      const si = j.sourceInformation || {}, keys = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
      s.ok('every sourceInformation field is filled', keys.every(k => typeof si[k] === 'string' && si[k].trim()), keys.filter(k => !si[k]));
      s.ok('the feedback lists answer every question', (j.testingFeedback || []).length === 4 && (j.engineFeedback || []).length === 6 && (j.promptFeedback || []).length === 4);
      const a = j.aiHub || {}; s.ok('the aiHub block is complete', ['name', 'tagline', 'description', 'type', 'genre', 'source', 'players', 'controls'].every(k => typeof a[k] === 'string' && a[k]) && typeof a.series === 'string' && Array.isArray(a.tags) && a.tags.length >= 3 && a.tags.length <= 6);
    }
  }
};
