import { chromium } from 'playwright';
const F = 'file://' + process.argv[2];
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); await p.goto(F + '#soundlab'); await p.waitForTimeout(2500); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(200);
// the engine change audio.bus(): the voices connect into the engine's own sfx bus
console.log('audio.bus', await p.evaluate(() => { const A = My3D2dge.current.audio, bus = A.bus('sfx'); let hits = 0; const orig = AudioNode.prototype.connect; AudioNode.prototype.connect = function (n, ...r) { if (n === bus) hits++; return orig.call(this, n, ...r); }; BB.babble('dub', 'Hang it on the wall, kid.'); AudioNode.prototype.connect = orig; return JSON.stringify({ bus: bus === A._sfxBus, music: A.bus('music') === A._musBus, voiceBlipsIntoSfxBus: hits }); }));
// glyph default changed in the engine
console.log('glyph default', await p.evaluate(() => My3D2dge.current.settings.glyphs));
const p2 = await b.newPage(); await p2.goto(F + '#animallab'); await p2.waitForTimeout(2500); const pp = p2;
const labels = []; for (let a = 0; a < 9; a++) { const row = []; for (let g = 0; g < 7; g++) { row.push(await pp.evaluate(() => BB.animalLabScene.gname)); await pp.keyboard.press('ArrowRight'); await pp.waitForTimeout(60); } labels.push(await pp.evaluate(() => BB.animalLabScene.label) + ': ' + row.join(' ')); await pp.keyboard.press('ArrowDown'); await pp.waitForTimeout(80); }
console.log('animal lab\n  ' + labels.join('\n  '));
console.log('engine errors', await pp.evaluate(() => My3D2dge.current.errors.length));
await b.close();
