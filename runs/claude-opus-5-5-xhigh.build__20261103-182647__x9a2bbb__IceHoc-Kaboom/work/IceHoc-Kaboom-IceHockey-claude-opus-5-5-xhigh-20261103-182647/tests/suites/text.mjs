// Text (18.4): every pool meets its minimum, every {token} resolves, no line wider than its box; no TODO / placeholder /
// stub / lorem strings ship in the built game
import { readFileSync } from 'node:fs';
import { load } from '../lib.mjs';
import { check, guard } from '../t.mjs';
guard('text', async () => {
  const { game, G, ctx } = load(); game.advance(.2);
  const TEXT = ctx.eval ? null : null; void TEXT;
  const src = readFileSync(new URL('../../build/game.js', import.meta.url), 'utf8');
  for (const w of ['TODO', 'FIXME', 'placeholder', 'Placeholder', 'stub(', 'lorem', 'Lorem', 'XXX']) check('no "' + w + '" in the game', !src.includes(w));
  const html = readFileSync(new URL('../../../IceHoc-Kaboom-IceHockey-claude-opus-5-5-xhigh-20261103-182647.html', import.meta.url), 'utf8');
  check('the single HTML has the session client first', /<meta charset="utf-8">\s*<script>/.test(html) && html.indexOf('AIHub') < html.indexOf('My3D2dge'));
  check('the single HTML has the hub tags', ['hub:session"', 'hub:session-players', 'hub:session-mode', 'hub:session-goal', 'hub:session-howto'].every(t => html.includes(t)));
  check('the single HTML loads nothing from the network', !/<script[^>]+src=|<link[^>]+href=["']http/.test(html));
  check('the title is Ice Hoc-Kaboom', html.includes('<title>Ice Hoc-Kaboom</title>'));
  const T2 = vmText(ctx);
  const talkTypes = Object.keys(T2.talk), talkLines = talkTypes.reduce((a, k) => a + T2.talk[k].length, 0);
  check('commentary: 18+ event types', talkTypes.length >= 18, talkTypes.length); check('commentary: 110+ lines', talkLines >= 110, talkLines);
  check('Moose filler: 20+', T2.filler.length >= 20); check('chirps: 30+', T2.chirps.length >= 30, T2.chirps.length); check('tips: 14+', Object.keys(T2.tips).length >= 14);
  check('three-stars lines: 12', T2.stars.length >= 12); check('pep talks: 5', T2.pep.length >= 5);
  const allowed = new Set(['name', 'team', 'victim', 'goalie', 'score', 'arena', 'period', 'a', 'b', 'home', 'away', 'hs', 'as', 'item', 'g', 's']);
  const bad = []; for (const k of talkTypes) for (const [, l] of T2.talk[k]) for (const m of l.matchAll(/\{(\w+)\}/g)) if (!allowed.has(m[1])) bad.push(m[1]);
  check('every commentary token resolves', !bad.length, bad.join(','));
  const tipBad = []; for (const k in T2.tips) for (const m of T2.tips[k].matchAll(/\{(\w+)\}/g)) if (!game.input.map[m[1]]) tipBad.push(m[1]); check('every tip chip names an action', !tipBad.length, tipBad.join(','));
  // widths: chirps wrap to the bubble (96 px, 4 lines at most); booth lines fit two lines of the subtitle box
  const E = ctx.My3D2dge; const wide = T2.chirps.filter(c => E.font.wrap(c, 96).length > 4); check('every chirp fits its bubble', !wide.length, wide.join(' | '));
  const long = []; for (const k of talkTypes) for (const [, l] of T2.talk[k]) if (E.font.wrap(l.replace(/\{\w+\}/g, 'SNIPES'), 260).length > 2) long.push(l); check('every booth line fits two lines', !long.length, long.slice(0, 3).join(' | '));
  for (const id in G.STORY.cutscenes) for (const st of G.STORY.cutscenes[id].steps) if (st.say) { const n = E.font.wrap(st.text.replace(/\{[^}]+\}/g, ''), 250).length; if (n > 6) check('cutscene line fits: ' + st.text.slice(0, 30), false, n); }
  check('the story validates', G.Story.validate());
  check('About has every section', ['CREDITS', 'SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'ENGINE CHANGES'].every(k => vmAbout(ctx).includes(k)));
});
function vmText(ctx) { return ctx.__ihkText || (ctx.__ihkText = ctx.eval ? ctx.eval('TEXT') : null) || ctx.__game.TEXT; }
function vmAbout(ctx) { return ctx.__game.ABOUT.map(a => a[0]); }
