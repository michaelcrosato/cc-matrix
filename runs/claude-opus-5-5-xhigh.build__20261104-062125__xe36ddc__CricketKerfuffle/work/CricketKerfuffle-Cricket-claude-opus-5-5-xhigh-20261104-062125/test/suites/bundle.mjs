import { readFileSync, existsSync, readdirSync } from 'node:fs';
export async function run(check) {
  const root = new URL('../../', import.meta.url), name = 'CricketKerfuffle-Cricket-claude-opus-5-5-xhigh-20261104-062125';
  const file = new URL('../' + name + '.html', root);
  check('the single-file game exists beside TASK.md with its exact name', existsSync(file));
  if (!existsSync(file)) return;
  const html = readFileSync(file, 'utf8'), client = readFileSync(new URL('vendor/aihub/session.js', root), 'utf8');
  check('the AI Hub client is the first script, right after <meta charset>', /^<!doctype html><html lang="en"><head><meta charset="utf-8">\n<script>/.test(html));
  const first = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
  check('the client is pasted unmodified', first === client, [first.length, client.length]);
  for (const t of ['hub:session" content="1"', 'hub:session-players" content="1-4"', 'hub:session-mode" content="parallel"', 'hub:session-goal"', 'hub:session-howto"', 'hub:session-minutes" content="2"', 'hub:type" content="Game"', 'hub:players" content="1-4"']) check('tag ' + t.split('"')[0], html.includes('<meta name="' + t));
  check('the title tag', html.includes('<title>Cricket Kerfuffle</title>'));
  check('no external scripts or styles', !/<(script|link)[^>]+(src|href)=["']https?:/i.test(html));
  const game = readFileSync(new URL('dist/game.js', root), 'utf8');
  check('the game makes no network requests (no fetch, XHR, WebSocket)', !/\bfetch\(|XMLHttpRequest|new WebSocket|RTCPeerConnection/.test(game));
  check('no alert, confirm, prompt or window.open', !/\b(alert|window\.open)\(|\bconfirm\(['"]|\bprompt\(['"]/.test(game));
  const srcs = readdirSync(new URL('src/', root)).filter(f => f.endsWith('.js')), bad = [];
  for (const f of srcs) { const s = readFileSync(new URL('src/' + f, root), 'utf8'); if (/\bTODO\b|\bFIXME\b|placeholder|lorem ipsum|not implemented|stub(bed)?\b/i.test(s)) bad.push(f); }
  check('no TODO, FIXME, placeholder or stub in src/', !bad.length, bad);
  const ex = new URL('../exit-interview.json', root);
  if (existsSync(ex)) {
    let j = null; try { j = JSON.parse(readFileSync(ex, 'utf8')); } catch (e) { check('exit-interview.json parses', false, e.message); }
    if (j) {
      check('exit-interview.json parses', true);
      const si = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
      check('sourceInformation has every field, filled', si.every(k => typeof j.sourceInformation[k] === 'string' && j.sourceInformation[k].trim()), si.filter(k => !(j.sourceInformation[k] || '').trim()));
      check('testingFeedback answers 4 questions', Array.isArray(j.testingFeedback) && j.testingFeedback.length === 4 && j.testingFeedback.every(s => s && s.trim()));
      check('engineFeedback answers 6 questions', Array.isArray(j.engineFeedback) && j.engineFeedback.length === 6 && j.engineFeedback.every(s => s && s.trim()));
      check('promptFeedback answers 4 questions', Array.isArray(j.promptFeedback) && j.promptFeedback.length === 4 && j.promptFeedback.every(s => s && s.trim()));
      const ah = j.aiHub || {}; check('aiHub has every field', ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags'].every(k => k in ah) && ['name', 'tagline', 'description', 'type', 'genre', 'source', 'players', 'controls'].every(k => String(ah[k]).trim()) && Array.isArray(ah.tags) && ah.tags.length >= 3 && ah.tags.length <= 6, ah);
    }
  }
}
