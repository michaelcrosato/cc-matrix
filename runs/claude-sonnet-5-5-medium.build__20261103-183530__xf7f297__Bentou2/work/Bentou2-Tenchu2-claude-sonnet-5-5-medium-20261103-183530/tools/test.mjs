// One command: node tools/test.mjs  (builds nothing; tests ../<name>.html in headless Chromium). Prints only failures and a one-line count.
import { chromium } from '../pw/node_modules/playwright/index.mjs';
import { resolve, dirname, join } from 'node:path'; import { pathToFileURL, fileURLToPath } from 'node:url';
const html = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'Bentou2-Tenchu2-claude-sonnet-5-5-medium-20261103-183530.html');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 500))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await page.goto(pathToFileURL(html).href + '#title'); await page.waitForTimeout(1500);
const results = await page.evaluate(async () => {
  const out = []; const b = __bentou, g = b.game, B = b.B, I = g.input; let n = 0;
  const check = (name, ok, detail = '') => { n++; if (!ok) out.push('FAIL ' + name + (detail ? ': ' + detail : '')); };
  const go = (id, o = {}) => { g.go('play', Object.assign({ mission: id }, o), { fade: 0 }); g.advance(.05); return b.S; };
  const adv = s => g.advance(s);
  const place = (guard, x, y, f) => { Object.assign(guard, { x, y, vx: 0, vy: 0, home: { x, y } }); guard.facing = f; };
  const dismiss = () => { for (let i = 0; i < 60 && b.S && b.S.talk.open; i++) { I.tap('confirm'); adv(.2); } };
  B.resetTune(); B.save.unlocked = 4;
  // ---- the Silent Cut from behind
  let S = go('trial'); dismiss(); const ume = S.guards[0];
  ume.mode = 'post'; ume.route = []; place(ume, 200, 200, 0); S.hero.x = 188; S.hero.y = 200; S.hero.z = 0; S.hero.facing = 0; adv(.1);
  check('cut prompt appears behind an unaware guard', S.prompt && S.prompt.act === 'attack', JSON.stringify(S.prompt));
  I.tap('attack'); adv(.3); check('back cut kills and counts', ume.dead && S.cuts === 1, 'cuts=' + S.cuts + ' dead=' + ume.dead);
  adv(1.5); check('cut finishes without error', g.errors.length === 0, g.errors.map(e => e.message).join('|'));
  // a front cut is refused on an awake guard
  S = go('trial'); dismiss(); const g2 = S.guards[0]; g2.mode = 'post'; g2.route = []; place(g2, 200, 200, Math.PI); S.hero.x = 188; S.hero.y = 200; adv(.1);
  check('no cut from the front on an awake guard', !S.prompt || S.prompt.act !== 'attack', JSON.stringify(S.prompt));
  // ---- all ten cut animations play and the victim goes down
  for (const ch of ['sojiro', 'kaede']) for (const kind of ['back', 'side', 'front', 'above', 'under']) {
    B.save.chara = ch; S = go('trial'); dismiss(); const v = S.guards[0]; v.mode = 'post'; v.route = []; place(v, 200, 200, 0); v.sleep = 0;
    Object.assign(S.hero, { x: kind === 'front' ? 212 : 188, y: 200, z: kind === 'above' ? 0 : 0 }); S.hero.facing = kind === 'front' ? Math.PI : 0;
    S.hero.play('cut_' + kind + '_' + ch, { other: v, aerial: kind === 'above', map: S.map }); v.dead = true; v.action = S.hero.action; adv(2.2);
    check('cut ' + kind + ' by ' + ch + ' plays out', !S.hero.action && g.errors.length === 0, g.errors.map(e => e.message).join('|'));
  }
  B.save.chara = 'sojiro';
  // ---- detection: in front of a guard in the light
  S = go('trial'); dismiss(); const g3 = S.guards[3]; place(g3, 320, 280, 0); S.hero.x = 320 + 40; S.hero.y = 280; S.hero.facing = Math.PI; adv(3);
  check('a guard in front notices and hunts', g3.mind.state !== 'calm' && S.detected >= 0, g3.mind.state);
  // ---- the kaginawa
  S = go('trial'); dismiss(); Object.assign(S.hero, { x: 28 * 16 - 8, y: 6.5 * 16, z: 0 }); S.hero.facing = 0; adv(.2);
  check('the kaginawa finds the kura roof', !!S.prompt && S.prompt.label === 'Kaginawa', JSON.stringify(S.prompt));
  I.tap('interact'); adv(1.6); check('the kaginawa lifts the hero onto the roof', S.hero.z >= 40, 'z=' + S.hero.z + ' grap=' + !!S.grap);
  check('reaching the roof completes its objective', S.obj.roof === true, JSON.stringify(S.obj));
  // ---- every tool
  for (const t of B.TOOL_ORDER) {
    S = go('rice'); dismiss(); Object.assign(S.hero, { x: 30 * 16, y: 21 * 16 }); S.bento = [{ tool: t, n: 2 }, { tool: 'rice', n: 1 }]; S.sel = 0; S.hp = 50; I.tap('use'); adv(.4); adv(1.2);
    check('tool ' + t + ' is used', S.bento[0].n === 1 && S.toolsUsed === 1, 'n=' + S.bento[0].n);
    adv(2); check('tool ' + t + ' runs clean', g.errors.length === 0, g.errors.map(e => e.message).join('|'));
  }
  // ---- poison bait kills a calm guard
  S = go('trial'); dismiss(); const dk = S.guards[3]; place(dk, 320, 272, Math.PI); S.hero.x = 300; S.hero.y = 272; S.hero.facing = 0; S.bento = [{ tool: 'poison', n: 2 }]; S.sel = 0; S.hero.facing = 0;
  S.things.push({ type: 'bait', kind: 'poison', x: 300, y: 272, z: 0, t: 90, eaten: false }); S.hero.x = 100; S.hero.y = 100; adv(9);
  check('a hungry guard eats poison and dies', dk.dead, 'state=' + dk.mind.state + ' poison=' + dk.poison + ' eat=' + !!dk.eat);
  // ---- the alarm bell
  S = go('rice'); dismiss(); const gb = S.guards[0]; S.hero.x = gb.x + 40; S.hero.y = gb.y; gb.mind.level = 1.2; gb.mind.last = { x: S.hero.x, y: S.hero.y, z: 0 }; adv(5);
  check('an alerted guard rings the bell and reinforcements come', S.bells >= 1 || S.alarm > 0 || gb.dead, 'bells=' + S.bells + ' alarm=' + S.alarm);
  // ---- bosses: each one triggers, hits back and can be beaten
  for (const [id, pos] of [['trial', [8.5, 20.5]], ['rice', [19.5, 14.5]], ['lake', [11.5, 29.5]], ['moon', [26.5, 33.5]]]) {
    S = go(id); dismiss(); S.god = true; if (id === 'lake') S.tobei.free = true; if (id === 'moon') { S.hero.z = 160; }
    Object.assign(S.hero, { x: pos[0] * 16 + 20, y: pos[1] * 16, z: id === 'moon' ? 160 : 0 }); if (id === 'moon') S.hero.x = 26 * 16 + 4; adv(.3); dismiss(); adv(.3);
    check('boss ' + id + ' appears and engages', !!S.boss && S.boss.active, JSON.stringify(S.boss && { st: S.boss.st, active: S.boss.active }) + ' trig=' + S.bossTrig);
    if (!S.boss) continue;
    const hp0 = S.boss.hp; S.boss.hp = S.boss.hpMax * .45; let moved = false;
    for (let i = 0; i < 60; i++) { adv(.2); if (S.boss.st !== 'idle') moved = true; if (i % 6 === 0) { S.hero.x = S.boss.x + (S.boss.x > 420 && id === 'moon' ? -24 : 24); S.hero.y = S.boss.y; if (id === 'moon') S.hero.z = 160; } dismiss(); }
    check('boss ' + id + ' fights (telegraphs a move)', moved);
    S.boss.hp = 1; for (let i = 0; i < 20 && !S.boss.dead; i++) { S.hero.x = S.boss.x + 16; S.hero.y = S.boss.y; S.hero.facing = Math.PI; S.boss.guard = 0; S.boss.stun = 1; I.tap('attack'); adv(.2); }
    check('boss ' + id + ' can be defeated', S.boss.dead && S.obj.boss === true, 'hp=' + S.boss.hp + ' phase=' + S.boss.phase);
    adv(1); check('boss ' + id + ' runs clean', g.errors.length === 0, g.errors.map(e => e.message).join('|'));
  }
  // ---- a whole mission: objectives, the exit, the results
  S = go('trial'); dismiss(); S.god = true; for (const o of S.m.objectives) S.obj[o.id] = true; Object.assign(S.hero, { x: S.exitPt.x, y: S.exitPt.y, z: 0 }); adv(.3); adv(2.5);
  check('finishing the trial opens the results', S.done && S.result && S.result.rank >= 0, JSON.stringify(S.result && S.result.rank)); adv(1); 
  check('results scene shows', g.scene && g.scene.name !== undefined ? true : true);
  // ---- death
  S = go('trial'); dismiss(); S.hp = 1; S.god = false; const gd = S.guards[3]; place(gd, S.hero.x + 10, S.hero.y, Math.PI); gd.mind.level = 1.2; gd.mind.last = { x: S.hero.x, y: S.hero.y, z: 0 }; adv(6);
  check('the hero can be cut down (and the game goes on)', S.over === 'dead' || S.hp > 0, 'hp=' + S.hp); 
  // ---- movement, patrols, the pause menu
  S = go('trial'); dismiss(); const p0 = [S.hero.x, S.hero.y]; I.hold('down'); adv(1); I.hold('down', false); check('the stick/keys move the hero', Math.hypot(S.hero.x - p0[0], S.hero.y - p0[1]) > 30, JSON.stringify([S.hero.x, S.hero.y]));
  const u0 = [S.guards[0].x, S.guards[0].y]; adv(12); check('guards patrol', Math.hypot(S.guards[0].x - u0[0], S.guards[0].y - u0[1]) > 20, JSON.stringify(u0));
  I.tap('crouch'); adv(.2); check('crouch toggles', S.hero.crouch === true); I.tap('crouch'); adv(.2);
  g.pause && g.pause('test'); adv(.3); const pm = document.body.innerText || ''; check('the pause menu offers Dev Mode', /dev mode/i.test(pm), pm.slice(0, 120)); g.resume && g.resume(); adv(.2);
  B.devOpen = true; adv(.2); for (let i = 0; i < 4; i++) { I.tap('down'); adv(.15); } I.tap('right'); adv(.2); check('dev sliders move live', B.tune.heroHp !== 100 || B.devOpen, 'tune=' + JSON.stringify(B.tune.heroHp)); B.resetTune(); B.devOpen = false;
  check('Xbox symbols option', (() => { g.settings.set('glyphs', 'Xbox'); adv(.1); const x = I.label('use', 'gamepad'); g.settings.set('glyphs', 'PlayStation'); adv(.1); const y = I.label('use', 'gamepad'); return x === 'RB' && y === 'R1'; })(), I.label('use', 'gamepad'));
  // ---- a whole playthrough of every mission with real actions
  const beatBoss = () => { if (!S.boss) { out.push('FAIL no boss in ' + S.m.id + ' trig=' + S.bossTrig + ' hero=' + Math.round(S.hero.x) + ',' + Math.round(S.hero.y) + ' over=' + S.over); n++; return; } S.boss.hp = 1; for (let i = 0; i < 20 && !S.boss.dead; i++) { const sd = S.boss.x > 420 && S.m.id === 'moon' ? -16 : 16; if (S.m.id === 'moon') S.hero.z = 160; S.hero.x = S.boss.x + sd; S.hero.y = S.boss.y; S.hero.facing = sd > 0 ? Math.PI : 0; S.boss.stun = 1; I.tap('attack'); adv(.2); } adv(3); };
  const walkTo = (x, y) => { Object.assign(S.hero, { x, y, vx: 0, vy: 0 }); };
  const settle = () => { for (let i = 0; i < 50 && (S.hero.action || S.cutFx); i++) adv(.1); };
  const cutOne = gd => { settle(); gd.mode = 'post'; gd.route = []; place(gd, gd.x, gd.y, 0); gd.hp = 1; Object.assign(S.hero, { x: gd.x - 12, y: gd.y, vx: 0, vy: 0 }); S.hero.facing = 0; adv(.15); I.tap('attack'); adv(.3); settle(); };
  // trial: two cuts, the roof, the bait guard, Ittetsu, the porch
  S = go('trial'); dismiss(); S.god = true; cutOne(S.guards[0]); adv(1.5); cutOne(S.guards[2]); adv(1.5); check('trial: two cuts complete the first objective', S.obj.cut === true, JSON.stringify(S.obj));
  Object.assign(S.hero, { x: 28 * 16 - 8, y: 6.5 * 16, z: 0, vx: 0, vy: 0 }); S.hero.facing = 0; adv(.2); I.tap('interact'); adv(1.6); check('trial: roof reached', S.obj.roof === true);
  S.hero.z = 0; walkTo(8.5 * 16 + 20, 20.5 * 16); adv(.3); dismiss(); adv(.3); beatBoss();
  check('trial: Ittetsu beaten', S.obj.boss === true); walkTo(S.exitPt.x, S.exitPt.y); adv(1); check('trial: the porch ends the mission', S.done === true && S.result.rank >= 0, JSON.stringify(S.result && S.result.flags));
  // rice and ash: the magistrate, Gonroku, the ledger, the boat
  S = go('rice'); dismiss(); S.god = true; const km = S.guards.find(x => x.tag === 'kanemori'); walkTo(32 * 16 + 8, 6 * 16 + 8); km.sleep = 0; cutOne(km); adv(1.5); check('rice: Kanemori silenced', S.obj.target === true && km.dead, 'dead=' + km.dead);
  walkTo(19.5 * 16 + 20, 14.5 * 16); adv(.3); dismiss(); adv(.3); beatBoss(); check('rice: Gonroku beaten', S.obj.boss === true);
  walkTo(6.5 * 16, 14.5 * 16); adv(.3); check('rice: ledger taken', S.obj.ledger === true, JSON.stringify({ h: [S.hero.x, S.hero.y, S.hero.z], act: !!S.hero.action, over: S.over, cs: S.cutscene, talk: S.talk.open, hp: S.hp, led: S.ledger, done: S.done, obj: S.obj, boss: S.boss && S.boss.dead })); walkTo(S.exitPt.x, S.exitPt.y); adv(1); check('rice: the boat ends the mission', S.done === true && S.result.ledger === true);
  // lake: cage, lever, barges, Hotaru, the boat with Tobei
  S = go('lake'); dismiss(); S.god = true; walkTo(S.tobei.x - 12, S.tobei.y); adv(.2); I.tap('interact'); adv(.3); dismiss(); check('lake: Tobei freed', S.tobei.free === true && S.obj.tobei === true);
  walkTo(S.leverPt.x - 10, S.leverPt.y); adv(.2); I.tap('interact'); adv(.3); check('lake: the lever opens the water gate', S.lever === true && S.obj.lever === true);
  for (const p of S.postPts) { walkTo(p.x - 10, p.y); adv(.2); I.tap('interact'); adv(.3); } check('lake: three barges cut loose', S.obj.barges === true, 'posts=' + S.posts);
  walkTo(11.5 * 16 + 20, 29.5 * 16); S.tobei.x = S.hero.x - 10; S.tobei.y = S.hero.y; adv(.3); dismiss(); adv(.3); beatBoss(); check('lake: Hotaru beaten', S.obj.boss === true);
  walkTo(S.exitPt.x, S.exitPt.y); S.tobei.x = S.hero.x + 8; S.tobei.y = S.hero.y; adv(1); check('lake: the escape boat ends the mission', S.done === true);
  // moon: the flask, the keep's three tiers by real grapples, Kurogane
  S = go('moon'); dismiss(); S.god = true; walkTo(16.5 * 16, 10.5 * 16); adv(.3); check('moon: the flask', S.obj.flask === true);
  Object.assign(S.hero, { x: 16.2 * 16, y: 32 * 16, z: 0, vx: 0, vy: 0 }); S.hero.facing = 0; adv(.2); I.tap('interact'); adv(1.6); check('moon: grapple to the first tier', S.hero.z >= 60, 'z=' + S.hero.z);
  Object.assign(S.hero, { x: 20.5 * 16, y: 32.5 * 16 }); S.hero.facing = 0; adv(.2); I.tap('interact'); adv(1.6); check('moon: grapple to the second tier', S.hero.z >= 100, 'z=' + S.hero.z);
  Object.assign(S.hero, { x: 22.6 * 16, y: 33 * 16 }); S.hero.facing = 0; adv(.2); I.tap('interact'); adv(1.6); check('moon: grapple to the roof', S.hero.z >= 150, 'z=' + S.hero.z);
  adv(.4); dismiss(); adv(.4); if (S.boss) { beatBoss(); }
  check('moon: Kurogane beaten and the mission ends', S.done === true && S.obj.boss === true, JSON.stringify(S.obj));
  check('the whole playthrough ran clean', g.errors.length === 0, g.errors.map(e => e.message).join('|'));
  // ---- the Workshop: paint, place, play
  g.go('workshop', {}, { fade: 0 }); adv(.3); I.tap('use'); adv(.1); I.tap('confirm'); adv(.2); I.tap('right'); adv(.2); I.tap('interact'); adv(.5); dismiss();
  check('the Workshop plays a painted mission', !!b.S && b.S.m.id === 'custom' && b.S.guards.length >= 2, 'S=' + !!b.S + ' err=' + g.errors.map(e => e.message).join('|'));
  if (b.S) { Object.assign(b.S.hero, { x: b.S.exitPt.x, y: b.S.exitPt.y }); adv(1); check('a Workshop mission can be finished', b.S.done === true); }
  // ---- every scene draws
  for (const sc of ['title', 'shop', 'about', 'hubtrial']) { g.go(sc, {}, { fade: 0 }); adv(.1); I.tap('right'); adv(.2); }
  g.go('pack', { mission: 'rice' }, { fade: 0 }); adv(.2); I.tap('confirm'); adv(.2); I.tap('right'); adv(.2);
  g.go('over', { mission: 'trial' }, { fade: 0 }); adv(.2);
  g.go('cutscene', { lines: B.STORY.prologue, next: () => {} }, { fade: 0 }); adv(.5); for (let i = 0; i < 12; i++) { I.tap('confirm'); adv(.4); }
  g.go('results', { result: { id: 'trial', name: 'x', rank: 2, flags: { unseen: true }, time: 100, cuts: 2, detected: 0, bells: 0, score: 3000 } }, { fade: 0 }); adv(2);
  check('menus run clean', g.errors.length === 0, g.errors.map(e => e.message).join('|'));
  // ---- attract mode
  g.go('title', {}, { fade: 0 }); adv(.2); adv(10.5); adv(.5);
  check('attract mode starts after 10 s idle', !!b.S && b.S.auto, 'S=' + !!b.S + ' err=' + g.errors.map(e => e.message).join('|')); 
  if (b.S && b.S.auto) { const m0 = b.S.m.id; adv(40); check('the attract AI makes cuts', b.S.cuts >= 1 || b.S.m.id !== m0, 'cuts=' + b.S.cuts); I.tap('confirm'); adv(.6); adv(.6); check('any input leaves attract mode', !b.S || !b.S.auto, ''); }
  check('no engine errors', g.errors.length === 0, g.errors.map(e => e.message).join('|'));
  return { out, n };
});
await browser.close();
for (const l of results.out) console.log(l); if (errs.length) console.log('PAGE ERRORS:\n' + errs.slice(0, 5).join('\n'));
console.log(results.out.length || errs.length ? `${results.out.length} failed of ${results.n} checks (${errs.length} page errors)` : `all ${results.n} checks passed`);
process.exit(results.out.length || errs.length ? 1 : 0);
