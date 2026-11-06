import { h } from '../dom.js';

/** In a session, Options opens volumes only, and it doesn't pause. */
export function openSessionOptions(game, onClose) {
  const set = game.save.settings;
  const save = () => { game.save.write(); game.applySettings(); };
  let scr = null;
  const close = () => { game.ui.close(scr); onClose(); };
  scr = game.ui.open({
    name: 'sessionOptions', prompts: [['back', 'Back']], back: close,
    build: (s) => {
      s.el.append(h('div.h2', { style: 'margin-top:10rem' }, 'Volumes'));
      const col = h('div.col');
      s.el.append(col);
      col.append(game.ui.slider(s, 'Music', () => set.music, (v) => { set.music = v; save(); }));
      col.append(game.ui.slider(s, 'Sound', () => set.sound, (v) => { set.sound = v; save(); }));
      col.append(game.ui.slider(s, 'Voice', () => set.voice, (v) => { set.voice = v; save(); }));
    },
  });
}
