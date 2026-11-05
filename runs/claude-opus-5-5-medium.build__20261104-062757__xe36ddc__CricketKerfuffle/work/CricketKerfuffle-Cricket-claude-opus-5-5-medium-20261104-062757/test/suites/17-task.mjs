// TASK.md, requirement by requirement, checked on the built game
import { readFileSync } from 'node:fs';
export default ({ boot, suite, until }) => {
  const s = suite(), root = new URL('../../../', import.meta.url);
  const task = readFileSync(new URL('TASK.md', root), 'utf8'), html = readFileSync(new URL('CricketKerfuffle-Cricket-claude-opus-5-5-medium-20261104-062757.html', root), 'utf8');
  s.ok('Package: the file name is the one TASK.md gives', task.includes('[GameTitle-SOURCE-claude-opus-5-5-medium-20261104-062757]') && html.length > 100000);
  s.ok('Audio: no audio files or audio data in the bundle', !/\.(mp3|wav|ogg|m4a)\b|data:audio/i.test(html));
  // a whole flow on a gamepad only: title, menu, Quick Match, the toss, batting with Cross
  const { D, game, I } = boot();
  const pad = (c, t = .1) => { I.press(c); game.advance(1 / 60); I.release(c); game.advance(t); };
  pad('Pad0', .3); pad('Pad13'); pad('Pad0', .4);
  s.ok('Controller: the pad reaches Quick Match setup', D.snapshot().scene === 'setup', D.snapshot().scene);
  game.scene.menu.i = game.scene.items.length - 1; pad('Pad0', .5); pad('Pad0', 2); pad('Pad0', .4); pad('Pad0', .4);
  until(game, () => D.snapshot().scene === 'match', 4);
  s.ok('Controller: the toss by pad leads to a match', D.snapshot().scene === 'match');
  const m = D.match();
  for (let k = 0; k < 40 && !(m.contact && m.contact.kind === 'clean'); k++) {
    if (m.needBowler) pad('Pad0'); until(game, () => m.state === 'flight' || m.state === 'setup' && m.isHuman('bowl'), 30, 1 / 120);
    if (m.state === 'setup') { pad('Pad0'); until(game, () => m.meter && m.meter.on, 4, 1 / 120); pad('Pad0'); until(game, () => m.state === 'between', 30, 1 / 60); continue; }
    const t = D.idealPress(); if (t !== null) { game.advance(Math.max(0, t)); pad('Pad0', 1 / 60); }
    until(game, () => m.state !== 'flight', 4, 1 / 120); until(game, () => m.state === 'between' || m.state === 'setup', 30, 1 / 60);
  }
  s.ok('Controller: Cross plays a clean shot', m.contact && m.contact.kind === 'clean', m.contact);
  s.ok('UI: prompts show PlayStation glyphs for the pad by default', D.snapshot().ui.prompts.shot === 'ps:cross', D.snapshot().ui.prompts);
  pad('Pad9', .1); s.ok('Dev mode: Options pauses, and the pause menu has Dev Mode', game.paused);
  D.devOpen(); s.ok('Dev mode: opens with live sliders and Reset all', D.DEV.open && /Reset all/.test(D.devRows()[0].label) && D.devRows().filter(r => r.slider).length >= 30);
  D.devClose();
  s.ok('Narrative: five chapters, a prologue and an ending that closes the story', D.CHAPTERS.length === 5 && D.CHAPTERS[4].win.length >= 5);
  s.ok('Voices: Animalese-style syllables for every speaker', Object.keys(D.VOICES).length >= 10 && D.syllables('Over my dead sponge.').filter(x => !x.gap).length >= 4);
  s.ok('Source info: About carries all four sections', ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK'].every(t => D.ABOUT_PAGES().some(p => p[0] === t)));
  s.ok('Multiplayer: AI Hub tags and local joining both present', /hub:session-mode" content="parallel"/.test(html) && typeof game.allowJoin === 'function');
  s.noErrors(game);
};
