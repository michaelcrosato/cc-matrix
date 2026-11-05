// CRACKMANIA credits roll (PLAN §5.12): the About pages scrolling up over the showcase, with Victory Lap; the ending
// after fifteen golds, and from ABOUT
import { ctx, E } from '../ctx.js';
import { MENU_INPUT } from '../input.js';
import { ABOUT } from '../data/about.js';
import { showcase, stepShowcase, drawShowcase } from './showcase.js';
import { T1, T2, title, UI } from '../ui/kit.js';
import { promptBar } from '../ui/glyphs.js';
import { logo } from './title.js';
const F = () => E.font;
const st = { y: 0, t: 0, lines: [], ending: false };
export const creditsScene = {
  input: MENU_INPUT, touch: [], camera: { zoom: false },
  enter(d = {}) {
    st.y = 0; st.t = 0; st.ending = !!d.ending;
    if (!ctx.session || ctx.session.kind !== 'demo') showcase(st.ending ? 'D5' : 'D3', { music: false });
    ctx.music.play('victory');
    st.lines = []; if (st.ending) st.lines.push(['#', 'FIFTEEN GOLDS'], ['', 'The clock is crying in a corner.'], ['', '']);
    for (const [head, lines] of ABOUT.pages) { st.lines.push(['T', head]); for (const l of lines) { if (l.startsWith('# ')) st.lines.push(['#', l.slice(2)]); else for (const w of F().wrap(l, 300)) st.lines.push(['', w]); } st.lines.push(['', '']); }
    st.lines.push(['T', 'THANKS FOR PLAYING'], ['', 'Now build your own. Coco is watching. With a stopwatch.']);
  },
  update(dt) { const I = ctx.game.input; st.t += dt; stepShowcase(dt); st.y += dt * (I.down('down') || I.down('confirm') ? 90 : 22); if (I.pressed('cancel') || st.y > st.lines.length * 13 + 400) ctx.game.go('menu', { page: st.ending ? 'main' : 'about' }); },
  draw(r) {
    drawShowcase(r);
    r.overlay(g => {
      E.px.blend(g, .55, 'normal', () => E.px.rect(g, 0, 0, r.W, r.H, '#05040a'));
      let y = r.H - st.y + 60; logo(g, r.W / 2, y - 50, 3, st.t);
      for (const [k, s] of st.lines) { if (y > -20 && y < r.H) { if (k === 'T') title(g, s, r.W / 2, y, 2); else if (k === '#') T1(g, s, r.W / 2, y, '#ffd060', 'center'); else T1(g, s, r.W / 2, y, '#ffffff', 'center'); } y += k === 'T' ? 24 : 13; }
      promptBar(g, r, [['down', 'FASTER'], ['cancel', 'SKIP']]);
    });
  }
};
