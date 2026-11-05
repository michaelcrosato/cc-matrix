// TASK.md, clause by clause: each check exercises the built game (or the delivered files), not just a name
import { readFileSync, existsSync } from 'node:fs';
import { load } from '../lib/load.mjs';
import { NAME, build } from '../../tools/build.mjs';
const root = new URL('../../../', import.meta.url);
export default async t => {
  build();
  // Package: one html with the required name in the folder's root
  const htmlPath = new URL(NAME + '.html', root); t('Package: ' + NAME + '.html in the root', existsSync(htmlPath));
  const html = readFileSync(htmlPath, 'utf8');
  t('Package: self-contained (no external script or link)', !/<script[^>]+src=|<link[^>]+href=/i.test(html));
  t('Title: the riff on the source\'s name is the page and logo title', /<title>Ahead or Alive: Xtreme Beach Volleyball<\/title>/.test(html));
  t('Audio: no audio files at all', !/\.(mp3|wav|ogg|m4a|flac)\b|data:audio/i.test(html));
  t('Online: the hub client is the first script after meta charset', /^<!doctype html><html lang="en"><head><meta charset="utf-8">\n<script>\/\*! aihub-session/.test(html));
  t('Online: the hub session tags', ['hub:session', 'hub:session-players', 'hub:session-mode', 'hub:session-goal', 'hub:session-howto'].every(m => html.includes('name="' + m + '"')));
  t('Tech stack: built on the my-3D2dge handoff engine', html.includes('my-3D2dge') && html.includes('AOA:'));
  t('Working environment: a dev folder with the sources', existsSync(new URL('src/99-main.js', import.meta.url.replace('test/suites/17-task.test.mjs', ''))));
  // Exit interview: exactly the shape, every value filled
  const ex = JSON.parse(readFileSync(new URL('exit-interview.json', root), 'utf8'));
  const SI = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
  t('Exit interview: every sourceInformation field', SI.every(k => typeof ex.sourceInformation[k] === 'string' && ex.sourceInformation[k].trim()));
  t('Exit interview: 4 testing, 6 engine, 4 prompt answers', ex.testingFeedback.length === 4 && ex.engineFeedback.length === 6 && ex.promptFeedback.length === 4 && [...ex.testingFeedback, ...ex.engineFeedback, ...ex.promptFeedback].every(s => s.trim()));
  t('Exit interview: every aiHub field', ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls'].every(k => typeof ex.aiHub[k] === 'string') && ex.aiHub.tags.length >= 3 && ex.aiHub.tags.length <= 6 && ex.aiHub.tags.every(s => s === s.toLowerCase()));
  t('Source Information: date, environment and model as TASK.md gives them', ex.sourceInformation.date === '2026-11-03 23:11:45' && ex.sourceInformation.environment === 'Claude Code CLI (headless); Linux; browser unknown' && ex.sourceInformation.model === 'Anthropic, claude-opus-5-5, reasoning effort medium');

  const { G, game, ctx } = load(); game.advance(1); const I = game.input;
  // About/Credits screen: the four sections, with the same text as the exit interview
  const pages = G.ABOUT.map(([title, rows]) => [title, rows()]);
  t('About: Source Information, Testing, Engine and Prompt Feedback pages', ['Source Information', 'Testing Feedback', 'Engine Feedback', 'Prompt Feedback'].every(n => pages.some(([tt]) => tt === n)));
  const si = pages.find(p => p[0] === 'Source Information')[1].map(r => r[0]);
  t('About: Source Information lists TASK.md\'s fields in order', JSON.stringify(si) === JSON.stringify(['Date', 'Source', 'Plan', 'Genre and Perspective', 'Tech', 'Art Direction', 'Animation', 'Audio', 'Online', 'Testing', 'Research', 'Environment', 'Model', 'Usage']), si.join(','));
  t('About: its feedback is the exit interview\'s', pages.find(p => p[0] === 'Testing Feedback')[1].every((r, k) => r[1] === ex.testingFeedback[k]) && pages.find(p => p[0] === 'Engine Feedback')[1].every((r, k) => r[1] === ex.engineFeedback[k]));
  G.go('about', null, { fade: 0 }); game.advance(.2); I.tap('tabR'); game.advance(.1); t('About: reachable and paged', game.sceneName === 'about' && G.SCENES.about.page === 1);
  // Dev mode: from the pause menu in every gameplay scene, live sliders, reset to defaults
  const pausable = Object.keys(G.SCENES).filter(k => G.SCENES[k].pausable);
  t('Dev mode: every gameplay scene can pause', ['match', 'location', 'map', 'poolhop', 'casino', 'shop'].every(k => pausable.includes(k)), pausable.join(','));
  t('Dev mode: the pause menu offers it', G.pauseItems().filter(Boolean).map(a => a[0]).includes('Dev Mode'));
  t('Dev mode: every important variable is a slider', G.TUNING.length >= 30 && ['ballGravity', 'perfectWin', 'runSpeed', 'aiSkillMul', 'prizeMul', 'affinityGainMul', 'poolBpm', 'slotsPayMul'].every(k => G.TUNE[k]));
  game.debug.tools.newVacation('rin', 3); G.go('location', { loc: 'beach' }, { fade: 0 }); game.advance(.3);
  G.pauseItems().filter(Boolean).find(a => a[0] === 'Dev Mode')[1](); game.advance(.1);
  G.dev.tab = 5; G.dev.focus.i = 2; game.advance(.02); const key = G.dev.focus.cur.key, v0 = G.T[key]; I.tap('right'); game.advance(.05);
  const changed = G.T[key] !== v0; I.tap('extra'); game.advance(.05);
  t('Dev mode: a slider changes the value live, and resets to its default', changed && G.T[key] === v0, key);
  I.tap('cancel'); game.advance(.1);
  // Attract mode: 10 s idle on the title or the menu, any input exits
  for (const sc of ['title', 'menu']) { G.state = null; G.go(sc, null, { fade: 0 }); game.advance(.5); G.attract.reset(); game.advance(10.2); const on = G.attract.active; game.advance(3); I.tap('cancel'); game.advance(.6); t('Attract: 10 s idle on the ' + sc + ' starts it, a press ends it', on && !G.attract.active && game.sceneName === 'title'); }
  // Multiplayer on its own: a second player on the keyboard's other half controls her own fighter
  const p2 = game.addPlayer({ keys: 'right' });
  G.startMatch({ mode: 'exhibition', pointsToWin: 7, teams: [[{ id: 'rin', suit: 'seigaiha', acc: [], input: I }, { id: 'lola', suit: 'estrella', acc: [] }], [{ id: 'tess', suit: 'reefbreak', acc: [], input: p2 }, { id: 'mei', suit: 'peony', acc: [] }]] }, { fade: 0 }); game.advance(4);
  const f2 = G.M.players.find(p => p.input === p2), x0 = f2.y; p2.hold('down'); game.advance(.6); p2.hold('down', false);
  t('Multiplayer: player 2 on the keyboard\'s right half drives her own fighter', G.M.players.filter(p => p.isHuman).length === 2 && Math.abs(f2.y - x0) > 10, x0 + ' -> ' + f2.y);
  t('Multiplayer: the split keyboard gives P2 the arrows and . / , L', p2.map.play.includes('Period') && p2.map.dive.includes('Slash') && p2.map.up.includes('ArrowUp'));
  game.removePlayer(p2); G.go('title', null, { fade: 0 }); game.advance(.3);
  // Controller-first UI: DualSense standard mapping, PC keys, the mouse, glyphs that follow the last device
  const M = G.INPUT.MATCH; t('Pad: ✕ hit, ○ dive, □ shot, △ call, Options pauses', M.play.includes('Pad0') && M.dive.includes('Pad1') && M.shot.includes('Pad2') && M.call.includes('Pad3') && M.pause.includes('Pad9'));
  t('Keyboard: WASD and arrows move, Space hits, Shift dives, E shot, Esc pauses', M.up.includes('KeyW') && M.up.includes('ArrowUp') && M.play.includes('Space') && M.dive.includes('ShiftLeft') && M.shot.includes('KeyE') && M.pause.includes('Escape'));
  t('Mouse: left click hits, right click shoots, middle calls', M.play.includes('Mouse0') && M.shot.includes('Mouse2') && M.call.includes('Mouse1'));
  I.use(G.INPUT.MATCH); I.lastDevice = 'gamepad'; game.settings.set('glyphs', 'playstation');
  const ps = ['play', 'dive', 'shot', 'call'].map(a => G.btn(a)).join(''); game.settings.set('glyphs', 'xbox'); const xb = ['play', 'dive', 'shot', 'call'].map(a => G.btn(a)).join('');
  I.lastDevice = 'keyboard'; const kb = G.btn('play'); I.lastDevice = 'mouse'; const ms = G.btn('play'); game.settings.set('glyphs', 'playstation');
  t('Prompts: PlayStation glyphs by default, Xbox A B X Y in Settings, keys and mouse buttons for keyboard and mouse', ps === '✕○□△' && xb === 'ABXY' && kb === 'Space' && /click/i.test(ms), ps + ' ' + xb + ' ' + kb + ' ' + ms);
  t('Settings: Button symbols is a setting, PlayStation by default', game.settings.spec('glyphs').value === 'playstation' && game.settings.spec('glyphs').options.length === 2);
  // hover moves the focus on every menu screen (they share one focus); not dense: at most 8 focusables a screen
  const S = game.debug.tools.newVacation('mei', 9); S.money = 999999;
  G.go('location', { loc: 'pool' }, { fade: 0 }); game.advance(.4); G.photo.open(); game.advance(.05); I.tap('confirm'); game.advance(.05); I.tap('cancel'); game.advance(.1);   // a postcard, so the album has one
  const screens = { menu: () => G.SCENES.menu.layout(), exhibition: () => G.SCENES.exhibition.optItems(), charselect: () => G.SCENES.charselect.layout(), journal: () => G.SCENES.journal.items(), howto: () => G.SCENES.howto.h.items(), about: () => G.SCENES.about.items(),
    shop: () => G.SCENES.shop.ui.layout(), wardrobe: () => G.SCENES.wardrobe.layout(), casino: () => G.SCENES.casino.cashierItems(), album: () => G.SCENES.album.layout() };
  for (const [sc, lay] of Object.entries(screens)) {
    G.go(sc, sc === 'shop' ? { shop: 'coral' } : sc === 'casino' ? { game: 'cashier' } : sc === 'howto' ? { from: 'menu' } : {}, { fade: 0 }); game.advance(.3);
    const L = lay(), sceneObj = G.SCENES[sc], F = sc === 'shop' ? sceneObj.ui.focus : sc === 'howto' ? sceneObj.h.focus : sceneObj.focus;
    t('Not dense: ' + sc + ' has 1-8 focusable items', L.length >= 1 && L.length <= 8, L.length);
    if (L.length > 1 && F) { const it = L[L.length - 1]; I.feed('move', it.x + 3, it.y + 3); game.advance(.05); t('Mouse: hover moves the focus on ' + sc, F.i === L.length - 1, F.i); I.feed('move', 1, 1); game.advance(.02); }
  }
  // Touch-only devices: no touch controls, the notice and the Settings button, and the attract still runs
  const T2 = load({ seed: 3 }); T2.ctx.matchMedia = q => ({ matches: /coarse/.test(q) && !/fine/.test(q) }); T2.game.advance(1);
  t('Touch-only: detected (coarse pointer only, no key or pad yet)', T2.G.touchOnly());
  let opened = null; T2.game.menu = n => { opened = n; return true; }; const W = T2.game.W, H = T2.game.H, by = Math.round(H * .58) + 46;
  T2.game.input.feed('down', W / 2, by + 8, { touch: true }); T2.game.advance(1 / 120); T2.game.input.feed('up', W / 2, by + 8, { touch: true }); T2.game.advance(.2);
  t('Touch-only: the Settings button opens Settings, and taps do not start play', opened === 'settings' && T2.game.sceneName === 'title', opened + ' ' + T2.game.sceneName);
  T2.G.attract.reset(); T2.game.advance(10.5); t('Touch-only: the attract mode runs', T2.G.attract.active);
  t('Touch-only: no touch buttons are ever requested', !Object.values(T2.G.SCENES).some(s => s.touch));
  // Narrative tone: Sonny in ALL-CAPS bursts, Pepper never exclaims
  const sonny = Object.values(G.SONNY.commentary).flat().concat(G.SONNY.pa); t('Tone: Sonny speaks in ALL-CAPS bursts', sonny.every(l => /[A-Z]{3,}/.test(l)));
  const pepper = Object.values(G.PEPPER.tips).concat(G.PEPPER.quips, ...Object.values(G.LETTERS).filter(l => l.from === 'pepper').map(l => l.text));
  t('Tone: Pepper never uses an exclamation mark', pepper.every(l => !l.includes('!')), pepper.filter(l => l.includes('!')).join(' | '));
  t('Tone: each fighter has her own voice in every line kind', G.FIGHTERS.every(id => G.LINES[id].greet.length === 3 && G.LINES[id].chat.length === 6));
  // Art and animation: new assets and new animations on the engine's native systems
  t('Art: new resort objects as engine shapes', ['umbrella', 'lounger', 'bleacher', 'djbooth', 'tikibar', 'slotmachine', 'roulettetable', 'shopfront', 'seaplane', 'lighthouse', 'poolfloat', 'flamingo'].every(k => ctx.My3D2dge.SHAPES[k]));
  t('Art: every fighter in her own swimsuit and look', new Set(G.FIGHTERS.map(id => G.CAST[id].suit)).size === 6 && G.FIGHTERS.every(id => G.makeRig(id).o.swim));
  t('Animation: new moves on the rigs and motion clips through the engine', Object.keys(G.MOVES).length >= 30 && G.clipLib() && G.clipLib().names.length >= 19);
  // Audio: music, effects and voices in code
  t('Audio: songs, effects and per-character voices in code', Object.keys(G.SONGS).length === 9 && Object.keys(G.SFX).length >= 45 && Object.values(G.CAST).every(c => c.voice));
  // Done: no TODOs, placeholders or stubs in the shipped code
  const shipped = html.slice(html.indexOf("const E = My3D2dge, G = {}"));
  t('Done: no TODO, TBD, FIXME, placeholder or stub in the shipped game code', !/\bTODO\b|\bTBD\b|FIXME|placeholder|not implemented|coming soon|\bstub\b/i.test(shipped));
  t('no errors', game.errors.length === 0 && T2.game.errors.length === 0, game.errors.concat(T2.game.errors).map(e => e.message + ' ' + (e.stack || '').split('\n')[1]).join(' | '));
};
