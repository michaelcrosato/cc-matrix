// Screenshots for review (§14.6): they never fail on their own. node tests/browser/look.mjs [name,...]
import { launch, boot } from '../lib/browser.mjs';
const only = (process.argv[2] || '').split(',').filter(Boolean);
const { browser, page, errors } = await launch();
const shot = async (name, fn, wait = 900) => { if (only.length && !only.includes(name)) return; try { await page.evaluate(fn); await page.waitForTimeout(wait); await page.screenshot({ path: 'tests/out/look/' + name + '.png' }); } catch (e) { console.log('look', name, e.message); } };
const setup = (area, node, persona, extra) => `(() => { S7.UI.closeAll(); S7.newGame({ seed: 5 }); for (const id of S7.ORDER) S7.G.roster[id].unlocked = true; S7.G.persona = '${persona}'; S7.TESTING = true; S7.enterArea('${area}', '${node}', { noAutosave: true, silent: true }); if (window.__game.game.sceneName !== 'play') window.__game.game.go('play', null, { fade: 0 }); ${extra || ''} })()`;
try {
  await boot(page);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'tests/out/look/title.png' });
  await shot('room7', setup('room7', 'door', 'ignaz'), 1500);
  await shot('lobby', setup('00A', 'j1', 'ignaz'), 1500);
  await shot('aim', setup('00A', 'j2', 'ignaz', "S7.spawnEnemy('giggler', 30*16, 12*16, undefined, { revealed: 30 }); S7.G.aim.on = true; S7.G.aim.k = 1; S7.G.aim.yaw = Math.atan2(-2.5, 5.5); S7.G.aim.pitch = 0;"), 1200);
  await shot('ring', setup('00A', 'j2', 'ignaz', "S7.G.mode = 'ring'; S7.G.ringSel = 'rurik';"), 900);
  await shot('thirdfloor', setup('00B', 'c1', 'dagny'), 1500);
  await shot('shaft', setup('00C', 'n1', 'ignaz', "S7.startBoss('grau');"), 2500);
  await shot('village', setup('01A', 'mk', 'rurik'), 1800);
  await shot('palais', setup('01B', 'at', 'kasimir'), 1500);
  await shot('band', setup('01B', 'br', 'dagny', "S7.startBoss('band');"), 2000);
  await shot('blackrun', setup('01C', 'st', 'dagny'), 2500);
  await shot('gondola', setup('01D', 'gs', 'ignaz', "S7.takeEdge(S7.W.rails.byId['gs-gl']); S7.G.walker.s = 5000;"), 2500);
  await shot('archive', setup('01E', 'ig', 'mireille'), 1500);
  await shot('summit', setup('01F', 'a3', 'ignaz', "S7.startBoss('hansi', 1);"), 2500);
  await shot('waxbench', setup('room7', 'bench', 'ignaz', "S7.G.rime = 20; S7.UI.open('waxbench');"), 900);
  await shot('map', setup('00A', 'j2', 'ignaz', "S7.G.visited['00A'] = true; S7.UI.open('map');"), 900);
  await shot('dialog', setup('00A', 's1', 'ignaz', "S7.interact(S7.W.spots.find(s => s.id === 'murmel')); S7.TALK.shown = 99;"), 900);
  await shot('about', setup('00A', 'j1', 'ignaz', "S7.UI.open('about');"), 900);
  await shot('dev', setup('00A', 'j1', 'ignaz', "S7.UI.open('dev');"), 900);
} catch (e) { console.log('ERR', e.message); }
console.log(errors.slice(0, 10).join('\n') || 'no page errors');
await browser.close();
