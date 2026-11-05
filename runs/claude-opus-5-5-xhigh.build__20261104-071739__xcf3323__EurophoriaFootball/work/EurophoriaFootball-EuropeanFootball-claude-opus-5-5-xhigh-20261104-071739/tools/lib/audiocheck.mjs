// Audio and the pause menu in a real browser: every kind of sound reaches the engine's master output (an analyser on it
// reads its level), the Voices and Crowd sliders silence their buses, and the pause menu's Dev mode button opens dev mode.
import { chromium } from 'playwright';
const NAME = 'EurophoriaFootball-EuropeanFootball-claude-opus-5-5-xhigh-20261104-071739';
export async function run({ check }) {
  const S = 'audio', file = new URL('../../../' + NAME + '.html', import.meta.url).pathname;
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }), p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + file); await p.waitForTimeout(1500); await p.mouse.click(400, 300); await p.keyboard.press('KeyZ'); await p.waitForTimeout(300);
  const levels = await p.evaluate(async () => {
    const g = My3D2dge.current, A = g.audio; EF.go('#dev/anim/pass'); await new Promise(r => setTimeout(r, 900)); A._init(); if (A.ctx.state !== 'running') await A.ctx.resume();   // (a scene with no idle watcher: the attract mode must not start mid-test)
    const an = A.ctx.createAnalyser(); an.fftSize = 2048; A._master.connect(an); const buf = new Float32Array(an.fftSize);
    const quiet = async () => { EF.music(null); EF.crowdAudio.stop(); await new Promise(r => setTimeout(r, 700)); };
    const peak = async ms => { let pk = 0; const end = performance.now() + ms; while (performance.now() < end) { an.getFloatTimeDomainData(buf); for (const v of buf) pk = Math.max(pk, Math.abs(v)); await new Promise(r => setTimeout(r, 15)); } return +pk.toFixed(4); };
    const say = (id, line) => { const v = EF.babble.voiceFor(id); for (let i = 0; i < line.length; i++) setTimeout(() => v(line[i], i, line), i * 30); };
    const out = {};
    const test = async (name, fn, ms = 600) => { await quiet(); fn(); out[name] = await peak(ms); };
    out.silence = await (async () => { await quiet(); return peak(300); })();
    await test('sfx kick', () => EF.sfx('kick')); await test('sfx woodwork', () => EF.sfx('doink')); await test('sfx whistle', () => EF.sfx('whistleLong'));
    await test('music anthem', () => EF.music('anthem'), 1200); await test('music europhoria layers', () => { EF.music('matchbed'); for (const t of ['eudrums', 'eubass', 'eubrass']) EF.layer(t, 1, .05); }, 1500);
    await test('crowd bed', () => { EF.crowdAudio.start(1400); EF.crowdAudio.set(1, 1); EF.crowdAudio.set(1, 1); }, 800);
    for (const k of ['roar', 'ooh', 'boo', 'clap']) await test('crowd ' + k, () => EF.crowdAudio.react(k) || (EF.crowdAudio.start(1400), EF.crowdAudio.react(k)), 900);
    await test('chant kipperton', () => { EF.crowdAudio.start(1400); EF.crowdAudio.chant('kipperton'); }, 1500);
    await test('voice barry', () => say('barry', 'What a goal! Absolutely magnificent.'), 1200);
    await test('voice mags', () => say('mags', 'Right, you lot. Listen.'), 1000);
    await test('voice pa (echo)', () => say('pa', 'Good evening and welcome.'), 1200);
    g.settings.set('voices', 0); await test('voice barry, voices slider at 0', () => say('barry', 'What a goal! Absolutely magnificent.'), 1200); g.settings.set('voices', .8);
    g.settings.set('crowd', 0); await test('crowd roar, crowd slider at 0', () => { EF.crowdAudio.start(1400); EF.crowdAudio.react('roar'); }, 900); g.settings.set('crowd', .8);
    await quiet(); return out;
  });
  for (const [k, v] of Object.entries(levels)) {
    if (k === 'silence') check(S, 'silence is silent', v < .002, v);
    else if (/slider at 0/.test(k)) check(S, k + ' is silent', v < .002, v);
    else check(S, k + ' reaches the output', v > .01, 'peak ' + v);
  }
  if (process.argv.includes('--report')) console.log('audio peaks', JSON.stringify(levels));
  // the pause menu (the engine's HTML screen): Dev mode opens the panel and the match goes on
  await p.evaluate(() => EF.go('#match')); await p.waitForTimeout(2500); await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  const paused = await p.evaluate(() => My3D2dge.current.paused);
  const btn = p.getByText('Dev mode', { exact: true }); const n = await btn.count();
  check(S, 'Escape pauses the match and the pause menu shows Dev mode', paused && n > 0, 'paused ' + paused + ', buttons ' + n);
  if (n) { await btn.first().click(); await p.waitForTimeout(500); const st = await p.evaluate(() => ({ open: EF.Dev.isOpen, paused: My3D2dge.current.paused })); check(S, 'clicking Dev mode opens the panel over the running match', st.open && !st.paused, JSON.stringify(st)); }
  // the mouse in play: moving it over the pitch turns on mouse aim (a reticle on the ground), a left click passes toward
  // the cursor, the right button held charges and releases a shot
  await p.evaluate(() => { EF.Dev.close(); EF.test.giveBall(0, 4, EF.P.CX - 60, EF.P.CY); EF.cur.m.cheats.freezeClock = true; window.__ev = []; EF.bus.on('pass', e => window.__ev.push('pass:' + Math.round(e.match.ball.vx))); EF.bus.on('shot', () => window.__ev.push('shot')); });
  await p.waitForTimeout(300); await p.mouse.move(700, 360); await p.waitForTimeout(80); await p.mouse.move(980, 380); await p.waitForTimeout(250);
  const aim = await p.evaluate(() => { const c = EF.cur.m.humans[0].ctl; return { on: c.mouse, pt: c.raw && c.raw.aimPoint }; });
  check(S, 'moving the mouse over the pitch turns on mouse aim', aim.on && !!aim.pt, JSON.stringify(aim));
  await p.mouse.down(); await p.waitForTimeout(60); await p.mouse.up(); await p.waitForTimeout(300);
  let ev = await p.evaluate(() => window.__ev.slice());
  check(S, 'a left click passes toward the cursor', ev.some(e => e.startsWith('pass:') && +e.slice(5) > 0), ev.join(','));
  await p.evaluate(() => { EF.test.giveBall(0, 4, EF.P.X1 - 150, EF.P.CY); window.__ev = []; }); await p.mouse.move(1000, 360); await p.waitForTimeout(120);
  await p.mouse.down({ button: 'right' }); await p.waitForTimeout(450); await p.mouse.up({ button: 'right' }); await p.waitForTimeout(300);
  ev = await p.evaluate(() => window.__ev.slice()); check(S, 'the right button held and released shoots', ev.includes('shot'), ev.join(','));
  check(S, 'no page errors', !errs.length, errs.join(' | '));
  await b.close();
}
