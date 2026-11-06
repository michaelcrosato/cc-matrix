import { h } from '../dom.js';

/** In-game confirm: the page never uses a dialog. */
export function confirmDialog(game, text, yes, fn) {
  let scr = null;
  const close = () => game.ui.close(scr);
  scr = game.ui.open({
    name: 'confirm', className: 'dim', prompts: [['use', 'Choose'], ['back', 'Back']], back: close, focus: 1,
    build(s) {
      s.el.append(h('div.tag', { style: 'margin-top:26rem;font-size:4.4rem;max-width:120rem;text-align:center' }, text));
      const row = h('div.row', { style: 'margin-top:3rem' });
      s.el.append(row);
      row.append(s.item(h('div', yes), { use: () => { close(); fn(); } }));
      row.append(s.item(h('div', 'Never mind'), { use: close }));
    },
  });
}
