import { h } from '../dom.js';
import { confirmDialog } from './confirm.js';

/** Four pages. Sliders move with left and right, drag with mouse. */
export function openSettings(game, onClose = null) {
  const set = game.save.settings;
  const save = () => { game.save.write(); game.applySettings(); };
  let scr = null;
  const close = () => { game.ui.close(scr); save(); if (onClose) onClose(); };
  scr = game.ui.open({
    name: 'settings', className: 'dim',
    prompts: [['use', 'Choose'], ['page', 'Pages'], ['back', 'Back']],
    back: close,
    build(s) {
      s.el.append(h('div.h2', { style: 'margin-top:3rem' }, 'Settings'));
      const title = h('div.sign', { style: 'margin-bottom:2rem' });
      const col = h('div.col');
      s.el.append(title, col);
      const P = [
        ['Sound', () => {
          col.append(game.ui.slider(s, 'Music', () => set.music, (v) => { set.music = v; save(); }));
          col.append(game.ui.slider(s, 'Sound', () => set.sound, (v) => { set.sound = v; save(); }));
          col.append(game.ui.slider(s, 'Voice', () => set.voice, (v) => { set.voice = v; save(); }));
        }],
        ['Controls', () => {
          col.append(game.ui.choice(s, 'Button glyphs', [['ps', 'PlayStation'], ['xbox', 'Xbox']], () => set.glyphs, (v) => { set.glyphs = v; save(); }));
          col.append(game.ui.choice(s, 'Rumble', [[true, 'On'], [false, 'Off']], () => set.rumble, (v) => { set.rumble = v; save(); }));
          col.append(game.ui.choice(s, 'Auto-breathe', [[false, 'Off'], [true, 'On']], () => set.autoBreathe, (v) => { set.autoBreathe = v; save(); }));
          col.append(game.ui.slider(s, 'Rhythm offset', () => set.rhythmOffset, (v) => { set.rhythmOffset = v; save(); }, { min: -200, max: 200, step: 10, format: (v) => `${v} ms` }));
        }],
        ['Display', () => {
          col.append(game.ui.slider(s, 'UI scale', () => set.uiScale, (v) => { set.uiScale = v; save(); }, { min: 100, max: 130, step: 5, format: (v) => `${v}%` }));
          col.append(game.ui.slider(s, 'Ink strength', () => set.ink, (v) => { set.ink = v; save(); }, { min: 0, max: 150, step: 10, format: (v) => `${v}%` }));
          col.append(game.ui.choice(s, 'Reduce shake', [[false, 'Off'], [true, 'On']], () => set.reduceShake, (v) => { set.reduceShake = v; save(); }));
          col.append(s.item(h('div', 'Fullscreen'), { use: () => {
            const de = document.documentElement;
            if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); } else if (de.requestFullscreen) { const p = de.requestFullscreen(); if (p && p.catch) p.catch(() => {}); }
          } }));
        }],
        ['Game', () => {
          col.append(game.ui.choice(s, 'Difficulty', [['gentle', 'Gentle'], ['standard', 'Standard'], ['honest', 'Honest']], () => set.difficulty, (v) => { set.difficulty = v; save(); }));
          col.append(s.item(h('div', 'Reset save'), { use: () => confirmDialog(game, 'Forget everything? Trudy will pretend she never met you.', 'Forget it all', () => { game.save.reset(); game.programme.syncIsland(); game.applySettings(); game.ui.toast('Done. Who are you, again?'); if (game.flow && game.modeName !== 'title' && game.modeName !== 'menu') { game.paused = false; game.flow.toTitle(); } else if (game.modeName === 'menu') game.flow.toMenu(); }) }));
        }],
      ];
      const render = (pg) => {
        col.innerHTML = '';
        s.clearItems();
        title.textContent = P[pg][0];
        P[pg][1]();
        s.setFocus(0, true);
      };
      s.pager(P.length, render);
      render(0);
    },
  });
  return scr;
}
