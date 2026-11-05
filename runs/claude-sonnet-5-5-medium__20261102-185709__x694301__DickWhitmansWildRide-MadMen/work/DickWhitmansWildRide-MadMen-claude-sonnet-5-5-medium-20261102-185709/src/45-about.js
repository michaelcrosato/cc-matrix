/* DICK WHITMAN'S WILD RIDE: the About / Credits text (also in the chat reply and exit-interview.json). */
(() => {
'use strict';
const game = window.__game, M = game.MAD, E = M.E;
M.ABOUT = ABOUT_JSON_PLACEHOLDER;
M.aboutLines = width => {
  const out = [], A = M.ABOUT;
  const push = (t, c, i) => out.push({ t, c, i });
  const para = (t, c, i = 0) => E.font.wrap(t, width - i).forEach(l => push(l, c, i));
  push(M.TITLE.toUpperCase(), '#ffd36a'); push(M.TAGLINE, '#ffb070'); push('');
  para('A spiritual successor to Mad Men (2007-2015): one Thursday on Madison Avenue, in 1963. An original work of fiction. Names, firms and events are invented.', '#d8d0e8'); push('');
  push('SOURCE INFORMATION', '#ff9a6a');
  for (const [k, v] of A.source) { push(k.toUpperCase(), '#ffd36a'); para(v, '#fdf6e6', 8); }
  push('');
  for (const [h, list] of [['TESTING FEEDBACK', A.testing], ['ENGINE FEEDBACK', A.engine], ['PROMPT FEEDBACK', A.prompt]]) {
    push(h, '#ff9a6a');
    list.forEach(([q, a]) => { push(q, '#ffd36a'); para(a, '#fdf6e6', 8); });
    push('');
  }
  push('CREDITS', '#ff9a6a');
  ['Design, code, writing, music and sound: Claude (Anthropic), claude-sonnet-5-5.', 'Engine: my-3D2dge 0.85.1. Online: AI Hub Session Protocol v1.', 'Every sound, voice and note is made by code at run time. No samples.'].forEach(t => para(t, '#fdf6e6'));
  push(''); push('THE END OF THE LINE.', '#8f86a8');
  return out;
};
})();
