import { h } from '../dom.js';
import { setPauseOpener } from '../../game/director.js';
import { openSettings } from './settings.js';
import { promptHTML } from '../../input/glyphs.js';
import { EVENTS } from '../../data/events.js';
import { openDev } from '../../game/devmode.js';

export function installPause() { setPauseOpener((g, note) => openPause(g, note), (g) => resume(g)); }

export function resume(game) {
  const p = game.ui.top;
  while (game.ui.top && game.ui.top.pauseLayer) game.ui.close(game.ui.top);
  game.paused = false;
  if (game.audio.seq) game.audio.seq.resume();
  if (game.mode && game.mode.onResume) game.mode.onResume();
  return p;
}

/** Stops the sim. Resume, Restart, How to Play, Settings, Dev Mode, Leave Class. */
export function openPause(game, note) {
  if (game.paused) return;
  game.paused = true;
  if (game.audio.seq) game.audio.seq.pause();
  game.speech.clear();
  const m = game.mode;
  const canRestart = !!(m && m.restart);
  const scr = game.ui.open({
    name: 'pause', className: 'dim',
    prompts: [['use', 'Choose'], ['back', 'Resume']],
    back: () => resume(game),
    build(s) {
      s.pauseLayer = true;
      s.el.append(h('div.h1', { style: 'margin-top:3rem' }, 'Paused'));
      if (note) s.el.append(h('div.tag', { style: 'margin-bottom:1.6rem;font-size:3.4rem' }, note));
      const col = h('div.col');
      s.el.append(col);
      const add = (t, use) => col.append(s.item(h('div', t), { use }));
      add('Resume', () => resume(game));
      if (canRestart) add('Restart', () => { resume(game); game.go(() => m.restart()); });
      add('How to Play', () => openHowTo(game));
      add('Settings', () => { const st = openSettings(game); st.pauseLayer = true; });
      add('Dev Mode', () => openDev(game));
      add(m && m.ev ? 'Leave Class' : 'Leave', () => { game.paused = false; while (game.ui.top && game.ui.top.pauseLayer) game.ui.close(game.ui.top); if (game.audio.seq) game.audio.seq.resume(); game.flow.leaveClass(); });
    },
  });
  return scr;
}

function openHowTo(game) {
  const m = game.mode;
  const d = m && m.ev ? m.ev.data : null;
  const verbs = d ? d.verbs : [['move', 'Walk'], ['interact', 'Use'], ['ask', 'Ask Trudy'], ['look', 'Look'], ['hop', 'Hop']];
  let scr = null;
  const close = () => game.ui.close(scr);
  scr = game.ui.open({
    name: 'howto', className: 'dim', back: close, prompts: [['back', 'Back']],
    build(s) {
      s.pauseLayer = true;
      s.el.append(h('div.h2', { style: 'margin-top:3rem' }, d ? d.title : 'The Island'));
      const box = h('div.tag', { style: 'max-width:150rem;font-size:3.8rem;margin-top:1rem' });
      if (d) { box.append(h('p', d.line), h('p', d.can), h('p', { style: 'color:#A0362E' }, d.cant)); }
      else { box.append(h('p', 'Walk to a class, or pick one from Today\'s Plan. Everything leans when you lean. Everything rolls when it leans.'), h('p', 'You can talk to anyone. They will say something.'), h('p', { style: 'color:#A0362E' }, "You can't fall off. There is a fence. It is a low fence.")); }
      s.el.append(box);
      const row = h('div.row', { style: 'margin-top:2rem' });
      s.el.append(row);
      const render = () => { row.innerHTML = verbs.map(([v, t]) => promptHTML(v, t, game.input.lastDevice, game.save.settings.glyphs)).join(''); };
      render();
      s.updateFn = () => { if (s.dev !== game.input.lastDevice) { s.dev = game.input.lastDevice; render(); } };
      s.el.append(s.item(h('div', { style: 'margin-top:2rem' }, 'Back'), { use: close }));
    },
  });
  return { EVENTS };
}
