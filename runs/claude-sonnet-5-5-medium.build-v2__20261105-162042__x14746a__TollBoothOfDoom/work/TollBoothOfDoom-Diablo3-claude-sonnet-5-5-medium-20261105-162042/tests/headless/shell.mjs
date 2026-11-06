// Tier 2: screens, dev mode, attract, About, audio defaults, exit interview shape.
import { readFileSync } from 'node:fs';
import { boot, newHeroByKeys, press, hero } from './driver.mjs';
import { ABOUT } from '../../src/data/about.generated.js';
import { aboutPages } from '../../src/ui/screens_about.js';
import { TUNING_DEFS, defaultTuning } from '../../src/data/tuning.js';
import { TITLE } from '../../src/data/meta.js';
export const name = 'shell';
const text = (game) => game.ui.drawnText.map((d) => d.text).join('\n');
export async function run(t) {
  // ---- screens by keys
  const g = await boot(); const { game, engine } = g;
  engine.step(30); t.ok(game.mode === 'title', 'starts on the title: ' + game.mode); t.ok(text(game).includes(TITLE.toUpperCase()), 'title text');
  t.ok(game.ctx.audio.volume.music === 0.1, 'music is 10% on first run: ' + game.ctx.audio.volume.music);
  press(engine, 'Enter'); engine.step(4); t.ok(game.mode === 'menu', 'menu after Enter');
  engine.step(3); t.ok(text(game).includes('NEW HERO') && text(game).includes('SETTINGS') && text(game).includes('ABOUT'), 'menu items');
  // settings: reset restores music to 10%
  game.ctx.audio.setVolume('music', 0.8); game.mode = 'settingsMenu'; engine.step(3); game.ctx.audio.resetVolumes(); t.ok(game.ctx.audio.volume.music === 0.1, 'Reset puts music back to 10%'); game.mode = 'menu';
  // About: every label and every question and answer reaches the screen
  game.mode = 'about'; const pages = aboutPages(); const seen = new Set();
  for (let p = 0; p < pages.length; p++) { game.aboutPage = p; game.aboutScroll = 0; for (let k = 0; k < 40; k++) { engine.step(2); for (const d of game.ui.drawnText) seen.add(d.text); press(engine, 'ArrowDown', 1); } }
  const all = [...seen].join(' ');
  for (const [k, l] of [['date', 'DATE'], ['source', 'SOURCE'], ['plan', 'PLAN'], ['tech', 'TECH'], ['usage', 'USAGE'], ['model', 'MODEL']]) t.ok(all.includes(l + ':'), 'About label ' + l);
  t.ok(all.includes('ADDED ON IMPORT'), 'Usage reads added on import');
  for (const q of [...ABOUT.questions.testing, ...ABOUT.questions.engine, ...ABOUT.questions.prompt]) t.ok(all.includes(q.toUpperCase().split(' ').slice(0, 4).join(' ')), 'About question: ' + q);
  for (const a of [...ABOUT.testingFeedback, ...ABOUT.engineFeedback, ...ABOUT.promptFeedback]) t.ok(all.includes(a.toUpperCase().split(' ').slice(0, 3).join(' ')), 'About answer: ' + a.slice(0, 30));
  // exit interview file
  const ei = JSON.parse(readFileSync(new URL('../../../exit-interview.json', import.meta.url), 'utf8'));
  t.ok(JSON.stringify(Object.keys(ei)) === JSON.stringify(['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub']), 'exit interview keys');
  t.ok(ei.testingFeedback.length === 4 && ei.engineFeedback.length === 6 && ei.promptFeedback.length === 4, 'feedback counts');
  t.ok(ei.aiHub.name === TITLE, 'aiHub.name equals TITLE'); t.ok(ei.aiHub.tags.length >= 3 && ei.aiHub.tags.length <= 6 && ei.aiHub.tags.every((x) => x === x.toLowerCase()), 'tags');
  for (const [k, v] of Object.entries({ ...ei.sourceInformation, ...ei.aiHub })) if (k !== 'series') t.ok(v !== '' && v != null, 'empty value: ' + k);
  t.ok(ei.sourceInformation.usage === 'added on import', 'usage string');
  t.ok(ei.sourceInformation.date === ABOUT.sourceInformation.date, 'about generated from exit interview');
  // ---- play: every overlay opens, navigates and closes
  game.mode = 'menu'; await newHeroByKeys(g, 1);
  const h = hero(game); engine.step(30);
  for (const key of ['KeyI', 'KeyK', 'KeyL', 'KeyM']) { press(engine, key); engine.step(4); t.ok(game.overlay, 'overlay opens on ' + key); for (const d of ['ArrowRight', 'ArrowDown', 'Enter']) { press(engine, d, 1); engine.step(2); } game.closeAll(); engine.step(2); }
  press(engine, 'Escape'); engine.step(4); t.ok(game.overlay && game.overlay.type === 'pause', 'pause opens'); t.ok(text(game).includes('DEV MODE'), 'pause lists Dev Mode');
  for (const type of ['settings', 'howto', 'party', 'about', 'dev', 'map', 'hero', 'stash', 'writs', 'knellsetup']) { game.closeAll(); if (type === 'about') game.aboutPage = 0; game.pushOverlay(type, { tab: 0 }); engine.step(6); t.ok(game.ui.drawnText.length > 2, 'screen draws text: ' + type); for (const d of ['ArrowDown', 'ArrowRight', 'ArrowDown']) { press(engine, d, 1); engine.step(2); } press(engine, 'Escape'); engine.step(3); }
  game.closeAll(); engine.step(4);
  // ---- dev mode: every tool and slider has an effect, and Reset restores
  const w = game.world; const T0 = defaultTuning();
  for (const d of TUNING_DEFS) { w.tuning[d.key] = d.max; } for (const d of TUNING_DEFS) t.ok(w.tuning[d.key] === d.max, 'slider live ' + d.key);
  game.pushOverlay('dev', { cat: 7 }); engine.step(4); const rb = game.ui.rects.find((r) => r.id && String(r.id).startsWith('m'));
  Object.assign(w.tuning, defaultTuning()); for (const d of TUNING_DEFS) t.ok(w.tuning[d.key] === T0[d.key], 'reset ' + d.key); game.closeAll();
  const before = w.heroes.length; game.createGuest('sexton', 1, 5, true); game.seats.push({ seat: 1, kind: 'bot' }); t.ok(w.heroes.length === before + 1, 'dev party adds a bot'); engine.step(120); game.leaveSeat(1);
  // dev overlays draw without errors
  game.devOverlays = { nav: true, circles: true, ai: true, spawns: true, flow: true, stats: true }; engine.step(10); game.devOverlays = null;
  t.ok(engine.errors.length === 0, 'engine errors in shell: ' + engine.errors.join('|'));
  // ---- attract: idle 600 frames on title and on menu, loops twice, any key exits, saves untouched
  for (const start of ['title', 'menu']) {
    const a = await boot({ fast: false, seed: 5 }); const ge = a.game, en = a.engine; ge.noTransitions = true; en.step(20); if (start === 'menu') { press(en, 'Enter'); en.step(5); }
    const slotsBefore = JSON.stringify(ge.save.data.slots); ge.fast = false;
    for (let i = 0; i < 700 && ge.mode !== 'attract'; i++) en.step(1); t.ok(ge.mode === 'attract', 'attract starts after 10 s idle on ' + start);
    if (start === 'title') { const seen = new Set(); let frames = 0; while (ge.attract.loops < 2 && frames < 60 * 60 * 6) { en.step(30); frames += 30; seen.add(ge.attract.i); if (en.errors.length) break; } t.ok(ge.attract.loops >= 2, 'attract loops twice (' + ge.attract.loops + ')'); t.ok(seen.size === 7, 'attract covers each stop: ' + [...seen]); t.ok(en.errors.length === 0, 'attract errors: ' + en.errors.join('|')); }
    ge.attract.age = 1; press(en, 'KeyA', 3); en.step(5); t.ok(ge.mode === 'title', 'any key exits attract: ' + ge.mode); t.ok(JSON.stringify(ge.save.data.slots) === slotsBefore, 'attract leaves saves untouched');
  }
}
