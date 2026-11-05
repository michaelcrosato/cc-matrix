// feel (browser, the real bundle in Chromium): sound is really produced (an analyser on the master bus measures the music,
// a voice line and a hit), a simulated DualSense (navigator.getGamepads) plays techniques with the right stick and the face
// buttons and shows PlayStation glyphs, real keyboard events play a two-key chord, and the frame rate holds
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, basename } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), file = pathToFileURL(join(root, '..', basename(root) + '.html')).href;
const PAD = () => { const pad = { index: 0, id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) }; window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null]; };
export default async t => {
  const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
  try {
    // ---- sound: RMS on the master bus ----
    { const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.goto(file + '#title'); await p.waitForTimeout(1500); await p.keyboard.press('KeyA'); await p.waitForTimeout(400);
      const rms = await p.evaluate(async () => {
        const A = KC.game.audio; A._init(); const c = A.ctx; if (c.state !== 'running') await c.resume();
        const an = c.createAnalyser(); an.fftSize = 2048; A._master.connect(an); const buf = new Float32Array(an.fftSize);
        const meter = ms => new Promise(res => { let peak = 0; const t0 = performance.now(); const tick = () => { an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; peak = Math.max(peak, Math.sqrt(s / buf.length)); if (performance.now() - t0 < ms) requestAnimationFrame(tick); else res(peak); }; tick(); });
        const music = await meter(800); A.music(null); await meter(300); const silence = await meter(300);
        KC.Voice.speak('I WILL BE CHAMP!', 'taro'); const voice = await meter(900);
        KC.Voice.call('begin', 'BEGIN!'); const call = await meter(700);
        KC.sfx('thwackFull'); const hit = await meter(400);
        return { state: c.state, music, silence, voice, call, hit, voiceBus: !!KC.Voice.bus };
      });
      t.check('audio: the context runs after a key press', rms.state === 'running', rms.state);
      t.check('audio: the title music is audible', rms.music > .005, rms.music.toFixed(4));
      t.check('audio: stopping the music goes quiet', rms.silence < rms.music / 3, rms.silence.toFixed(4));
      t.check('audio: a gibberish voice line sounds (on its own voice bus)', rms.voice > .003 && rms.voiceBus, rms.voice.toFixed(4));
      t.check('audio: the referee\'s call sounds', rms.call > .003, rms.call.toFixed(4));
      t.check('audio: a full-point hit sounds', rms.hit > .005, rms.hit.toFixed(4));
      const errs = await p.evaluate(() => KC.game.errors.length); t.check('audio: no errors', errs === 0); await p.close(); }
    // ---- a DualSense: the right stick and the face buttons play techniques; prompts show PlayStation glyphs ----
    { const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.addInitScript(PAD); await p.goto(file + '#fight/dojo/kamaboko');
      await p.waitForFunction(() => window.KC && KC.scene && KC.scene.bout && KC.scene.bout.phase === 'fight', null, { timeout: 15000 });
      await p.evaluate(() => { KC.DEV.freezeCpu = true; const f = KC.scene.fighters; f[0].x = 150; f[1].x = 260; });
      const play = async (set, clear, wait = 60) => { await p.evaluate(set); await p.waitForTimeout(wait); await p.evaluate(clear); await p.waitForTimeout(20); return p.evaluate(() => { const f = KC.scene.fighters[0]; return { tech: f.tech, st: f.st, dev: KC.game.input.lastDevice }; }); };
      const settle = () => p.waitForFunction(() => KC.scene.fighters[0].free && KC.scene.bout.phase === 'fight', null, { timeout: 8000 }).catch(() => {});
      let r = await play(() => { __pad.axes[3] = -.9; }, () => { __pad.axes[3] = 0; });
      t.check('pad: the right stick up is a round kick', r.tech === 'roundKick', JSON.stringify(r)); t.check('pad: the last device is the gamepad', r.dev === 'gamepad', r.dev); await settle();
      r = await play(() => { __pad.buttons[0].pressed = true; __pad.buttons[0].value = 1; }, () => { __pad.buttons[0].pressed = false; __pad.buttons[0].value = 0; });
      t.check('pad: the cross is technique down (a low kick)', r.tech === 'lowKick', JSON.stringify(r)); await settle();
      await p.evaluate(() => { const f = KC.scene.fighters; f[0].x = 150; f[1].x = 260; });
      r = await play(() => { __pad.axes[0] = .9; __pad.axes[2] = .9; }, () => { __pad.axes[0] = 0; __pad.axes[2] = 0; });
      t.check('pad: left stick toward + right stick toward is the middle lunge punch', r.tech === 'midLunge', JSON.stringify(r)); await settle();
      const g = await p.evaluate(() => ({ confirm: KC.actionIcon('confirm').kind, b: KC.actionIcon('confirm').b, stick: KC.promptFor('upLunge').map(x => typeof x === 'string' ? x : x.kind + (x.side || '')).join() }));
      t.check('pad: prompts show the PlayStation cross and the two sticks', g.confirm === 'ps' && g.b === 0 && g.stick === 'stickL,+,stickR', JSON.stringify(g));
      await p.evaluate(() => { KC.game.settings.set('glyphs', 'xbox'); }); const xb = await p.evaluate(() => KC.actionIcon('confirm').kind); t.check('pad: the Xbox option shows A', xb === 'xb', xb);
      const errs = await p.evaluate(() => KC.game.errors.length); t.check('pad: no errors', errs === 0); await p.close(); }
    // ---- real keyboard events: D + I together is the upper lunge punch; WASD walks; the frame rate holds ----
    { const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.goto(file + '#fight/harbor/ebi');
      await p.waitForFunction(() => window.KC && KC.scene && KC.scene.bout && KC.scene.bout.phase === 'fight', null, { timeout: 15000 });
      await p.evaluate(() => { KC.DEV.freezeCpu = true; const f = KC.scene.fighters; f[0].x = 120; f[1].x = 280; });
      const x0 = await p.evaluate(() => KC.scene.fighters[0].x); await p.keyboard.down('KeyD'); await p.waitForTimeout(400); await p.keyboard.up('KeyD'); const x1 = await p.evaluate(() => KC.scene.fighters[0].x);
      t.check('keys: holding D walks toward the foe', x1 > x0 + 15, x0.toFixed(0) + ' -> ' + x1.toFixed(0));
      await p.keyboard.down('KeyD'); await p.keyboard.down('KeyI'); await p.waitForTimeout(50); await p.keyboard.up('KeyI'); await p.keyboard.up('KeyD'); await p.waitForTimeout(30);
      const tech = await p.evaluate(() => KC.scene.fighters[0].tech); t.check('keys: D + I is the upper lunge punch', tech === 'upLunge', tech);
      const fps = await p.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res(n / 1.5); }; f(); }));
      t.check('the browser keeps drawing (30 frames a second or more headless)', fps >= 30, fps.toFixed(0));
      const errs = await p.evaluate(() => KC.game.errors.length); t.check('keys: no errors', errs === 0); await p.close(); }
  } finally { await b.close(); }
};
