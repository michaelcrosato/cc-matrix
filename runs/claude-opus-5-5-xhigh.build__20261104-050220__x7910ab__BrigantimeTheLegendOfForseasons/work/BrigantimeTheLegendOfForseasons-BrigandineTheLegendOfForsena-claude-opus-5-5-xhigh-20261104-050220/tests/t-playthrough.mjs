// playthrough: for each realm, a Normal campaign through the real scenes on autoplay (aiPlayerBoost 1): Muster and
// March by the realm AI, battles Delegated through the resolve card except the tutorial and one a year, which the
// battle scene plays; it must reach meridian_falls, win the Sanctum, and play the ending and the credits with no
// errors. A fifth run lets the candle burn out. Also: about (Source Information and feedback on the About pages,
// exit-interview.json), and the browser suites (bundle, hub).
import { suite, boot, ok, eq, DEV } from './lib.mjs';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

export async function campaign(realm, seed, o = {}) {
  const h = await boot('#title'), { G, game, I } = h;
  G.setTune('aiPlayerBoost', o.boost === undefined ? 1 : o.boost); game.settings.set('battleAnim', 'Minimal'); G.tune.animSpeed = 4; G.autoplayOn = true;
  G.startCampaign(G.CampaignSim.create({ seed, humans: [realm], difficulty: 'normal' })); h.step(.6);
  const seen = new Set(), C = G.Camp; let commandedYear = 0, sanctumWon = false, steps = 0, scenes = new Set();
  while (steps++ < 60000) {
    const sc = game.sceneName; scenes.add(sc);
    if (sc === 'title' && scenes.has('credits') || sc === 'title' && scenes.has('ending')) break;
    if (sc === 'event') { const ev = G.SCENES.event && game.scene; if (G.Talk.cur) seen.add(G.Talk.o && G.Talk.o.realm ? 'talk' : 'talk'); I.tap('confirm'); game.advance(.08); continue; }
    if (sc === 'battle') { const B = G.Battle; if (B.sim.s.mode === 'sanctum') seen.add('sanctumBattle'); B.delegated.all = true; if (G.Talk.open || G.UI.modal) I.tap('confirm'); game.advance(.4); if (B.sim.s.over && B.sim.s.mode === 'sanctum' && B.sim.s.over.winner === 0) sanctumWon = true; continue; }
    if (sc === 'campaign') {
      const sim = C.sim; for (const e of sim.s.eventLog) seen.add(e.id);
      const p = sim.s.pending;
      if (C.panel && p && (p.kind === 'battle' || p.kind === 'sanctum') && !G.Talk.open && !G.UI.modal) {
        if (p.kind === 'battle' && commandedYear >= sim.year) { I.tap('right'); game.advance(.05); } else if (p.kind === 'battle') commandedYear = sim.year;
      }
      I.tap('confirm'); game.advance(.1); continue;
    }
    I.tap('confirm'); game.advance(.1);
  }
  const sim = C.sim; for (const e of sim.s.eventLog) seen.add(e.id);
  return { h, sim, seen, scenes, sanctumWon, errors: h.errors() };
}
const RUNS = [['verdance', 2], ['solmark', 1], ['amberlyn', 4], ['hoarfast', 4]];
suite('playthrough', async t => {
  for (const [realm, seed] of RUNS) {
    await t(realm + ' (seed ' + seed + ') takes Meridian, wins the Sanctum and sees the ending and credits', async () => {
      const r = await campaign(realm, seed);
      ok(r.seen.has('meridian_falls'), 'meridian_falls (' + [...r.seen].join(',').slice(0, 200) + ')');
      ok(r.scenes.has('battle') && r.seen.has('sanctumBattle'), 'the Sanctum battle');
      ok(r.sim.s.result && r.sim.s.result.kind === 'win', 'won: ' + JSON.stringify(r.sim.s.result));
      ok(r.scenes.has('ending') && r.scenes.has('credits'), 'ending and credits: ' + [...r.scenes].join(','));
      eq(r.errors.length, 0, r.errors.slice(0, 3).join(' | '));
    });
  }
  await t('a campaign where the candle burns out ends in silence', async () => {
    const r = await campaign('verdance', 2, { boost: 0 });
    ok(r.sim.s.result && r.sim.s.result.ending === 'ending_candle' || r.sim.s.result && r.sim.s.result.kind === 'lose', JSON.stringify(r.sim.s.result));
    ok(r.scenes.has('ending'), 'the ending card'); eq(r.errors.length, 0, r.errors.slice(0, 3).join(' | '));
  });
});

suite('about', async t => {
  const { G } = await boot('#title');
  await t('the About pages carry every Source Information field and the three feedback lists', () => {
    const want = ['Date', 'Source', 'Plan', 'Genre', 'Perspective', 'Tech', 'Art Direction', 'Animation', 'Audio', 'Online', 'Testing', 'Research', 'Environment', 'Model', 'Usage'];
    for (const w of want) ok(G.ABOUT.source.some(([k, v]) => k === w && v), w);
    eq(G.ABOUT.testing.length, 4, 'testing'); eq(G.ABOUT.engine.length, 6, 'engine'); eq(G.ABOUT.prompt.length, 4, 'prompt');
  });
  await t('exit-interview.json parses and every key has a value', () => {
    const p = join(DEV, '..', 'exit-interview.json'); ok(existsSync(p), 'exists');
    const j = JSON.parse(readFileSync(p, 'utf8'));
    const si = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
    for (const k of si) ok(typeof j.sourceInformation[k] === 'string' && j.sourceInformation[k].length, 'sourceInformation.' + k);
    eq(j.testingFeedback.length, 4); eq(j.engineFeedback.length, 6); eq(j.promptFeedback.length, 4);
    for (const k of ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls']) ok(typeof j.aiHub[k] === 'string', 'aiHub.' + k);
    ok(Array.isArray(j.aiHub.tags) && j.aiHub.tags.length >= 3 && j.aiHub.tags.length <= 6, 'tags');
  });
});

suite('browser:bundle', async t => {
  const file = readdirSync(join(DEV, '..')).find(f => f.endsWith('.html') && f.startsWith('BrigantimeTheLegendOfForseasons'));
  const html = readFileSync(join(DEV, '..', file), 'utf8');
  await t('the single file is named as asked and has no external URLs', () => { eq(file, 'BrigantimeTheLegendOfForseasons-BrigandineTheLegendOfForsena-claude-opus-5-5-xhigh-20261104-050220.html'); ok(!/<script[^>]+src=|<link[^>]+href=["']https?:/i.test(html), 'external'); });
  await t('the first script after the charset is the unmodified session client; the hub tags are present', () => {
    const m = html.match(/^<!doctype html><html lang="en"><head><meta charset="utf-8">\s*<script>\n([\s\S]*?)\n<\/script>/); ok(m, 'first script');
    eq(m[1].trim(), readFileSync(join(DEV, 'vendor/hub/session.js'), 'utf8').trim(), 'unmodified');
    for (const tag of ['hub:session" content="1', 'hub:session-players" content="2-4', 'hub:session-mode" content="shared-world', 'hub:session-goal', 'hub:session-howto']) ok(html.includes(tag), tag);
  });
  await t('it opens from file:// with no errors, boots to the title, and attract starts after 10 s', () => {
    const out = execFileSync('node', [join(DEV, 'tools/shot.mjs'), 'bundle=title;wait:11500;js:void 0', '--page', join(DEV, '..', file)], { encoding: 'utf8', env: Object.assign({}, process.env, { TMPDIR: join(DEV, '.tmp') }) });
    ok(/bundle: ok/.test(out), out.slice(0, 300)); ok(/"attract":\{"on":true,"beat":"wheel"/.test(out) || /"scene":"attract"/.test(out), 'attract: ' + out.slice(0, 300));
  });
});
// the shot tool in a real browser: its check:<expr> steps print 'name: check <json>'
const shot = (job, ...flags) => { const file = readdirSync(join(DEV, '..')).find(f => f.endsWith('.html') && f.startsWith('BrigantimeTheLegendOfForseasons'));
  const out = execFileSync('node', [join(DEV, 'tools/shot.mjs'), job, '--page', join(DEV, '..', file), ...flags], { encoding: 'utf8', env: Object.assign({}, process.env, { TMPDIR: join(DEV, '.tmp') }) });
  return { out, checks: out.split('\n').filter(l => / check /.test(l)).map(l => JSON.parse(l.slice(l.indexOf(' check ') + 7))) }; };
suite('browser:input', async t => {
  await t('the mouse: a real move focuses the item under it and the prompts show mouse buttons; a click picks that item', () => {
    const at = "(()=>{const T=BRIG.TitleState,i=T.rows.findIndex(r=>r.label==='How to Play'),it=T.items[i];window.__i=i;return [it.x+it.w/2,it.y+it.h/2]})()";
    const r = shot('mouse=title;;wait:1500;;check:[BRIG.TitleState.st.f,My3D2dge.current.input.lastDevice];;mouse:' + at + ';;check:[BRIG.TitleState.st.f,window.__i,My3D2dge.current.input.lastDevice,BRIG.keyLabel(\'confirm\',\'mouse\').mouse];;click:' + at + ';;wait:800;;check:My3D2dge.current.sceneName');
    ok(/mouse: ok/.test(r.out), r.out.slice(0, 300)); const [c0, c1, c2] = r.checks;
    eq(c0[0], 0, 'focus starts on the first item'); ok(c1[1] > 0 && c1[0] === c1[1], 'hover focused ' + JSON.stringify(c1)); eq(c1[2], 'mouse', 'device'); eq(c1[3], 'L', 'the left-button glyph');
    eq(c2, 'help', 'the click opened How to Play, the item under the pointer');
  });
  await t('a touch-only phone: "Controller or keyboard required", a Settings button that opens the settings, no prompts, and attract still runs', () => {
    const btn = "(()=>{const b=BRIG.TitleState.setBtn;return [b.x+b.w/2,b.y+b.h/2]})()";
    const r = shot('touch=title;;wait:2000;;check:[BRIG.In.touchOnly,!!BRIG.TitleState.setBtn,My3D2dge.current.debug.snapshot().prompts];;tap:' + btn + ';;wait:600;;check:(My3D2dge.current.shell._stack||[]).map(x=>x.name)', '--touch');
    ok(/touch: ok/.test(r.out), r.out.slice(0, 300)); const [c0, c1] = r.checks;
    eq(c0[0], true, 'detected as touch only'); eq(c0[1], true, 'the Settings button'); eq(c0[2].length, 0, 'no prompts'); ok(c1.includes('settings'), 'settings opened: ' + JSON.stringify(c1));
    const a = shot('touchidle=title;;wait:12000;;check:[BRIG.In.touchOnly,My3D2dge.current.sceneName]', '--touch');
    eq(JSON.stringify(a.checks[0]), JSON.stringify([true, 'attract']), 'attract after 10 s on a phone');
  });
});
suite('browser:hub', async t => {
  await t('the AI Hub harness passes every scenario', () => {
    let out = ''; try { out = execFileSync('node', [join(DEV, 'tools/hub-check.mjs')], { encoding: 'utf8', env: Object.assign({}, process.env, { TMPDIR: join(DEV, '.tmp') }), timeout: 1500000 }); } catch (e) { out = String(e.stdout || e); }
    ok(/two: PASS/.test(out) && /four-lossy: PASS/.test(out) && /host-leave: PASS/.test(out) && /server: PASS/.test(out), out.slice(0, 600));
  });
});
