/**
 * @file Browser checks against the one-file page. One Chromium at a time, then Firefox and WebKit for the WebGPU line.
 * Each check prints one JSON line: { name, ok, detail }.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { chromium, devices } from 'playwright';

const FILE = new URL(
  '../../../../Trauma-Compass-Trauma-Center-Second-Opinion-grok-4.7-xhigh-20261104-224731.html',
  import.meta.url,
);
const html = readFileSync(FILE, 'utf8');
const pageUrl = FILE.href;
const args = [
  '--enable-unsafe-webgpu',
  '--enable-features=Vulkan',
  '--use-vulkan=swiftshader',
  '--use-angle=swiftshader',
  '--use-webgpu-adapter=swiftshader',
];
let failed = 0;

/** One result the verify command counts. */
function report(name, ok, detail = '') {
  if (!ok) failed += 1;
  console.log(JSON.stringify({ name, ok, detail: String(detail).slice(0, 400) }));
}

/** Keys whose stored text changed. Empty when the two snapshots match. */
function storageDelta(before, after) {
  if (before === after) return '';
  let left;
  let right;
  try {
    left = JSON.parse(before);
    right = JSON.parse(after);
  } catch {
    return 'unparsed';
  }
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const changed = [];
  for (const key of keys) if (left[key] !== right[key]) changed.push(key);
  return changed.join(',') || 'order';
}

/** Run one page. A timeout is a failed check, and the later checks still run. */
async function block(name, fn) {
  try {
    await fn();
  } catch (error) {
    report(name, false, error instanceof Error ? error.message : String(error));
  }
}

/** Launch flags for the software WebGPU adapter. */
function launch() {
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args });
}

/** Console and page errors collected for one page. */
function watch(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/** A standard pad the page can read. `down` is button indexes that are pressed. */
function pad(index, axes, down) {
  const buttons = Array.from({ length: 16 }, (_, i) => ({
    pressed: down.includes(i),
    value: down.includes(i) ? 1 : 0,
  }));
  return { index, connected: true, mapping: 'standard', axes, buttons, id: `stub-${index}` };
}

const PAD_SCRIPT = `
  window.__pads = [null, null, null, null];
  navigator.getGamepads = () => window.__pads;
`;

report('no audio element', !html.includes('<audio') && !html.includes('data:audio'), '');
report('session client is first', html.indexOf('<script>') < html.indexOf('<script type="module">'), '');

const browser = await launch();

await block('boot', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    const errors = watch(page);
    await page.goto(pageUrl);
    await page.waitForFunction(() => window.__engine && window.__engine.ready, null, { timeout: 40000 });
    const state = await page.evaluate(() => ({
      screen: window.__compass?.screen ?? '',
      title: document.querySelector('[data-game="title"]')?.textContent ?? '',
      usage: document.querySelector('[data-about="usage"]')?.textContent ?? '',
      engineErrors: (window.__engine?.errors ?? []).map((item) => item.code).join(','),
    }));
    report(
      'boots from file',
      state.screen === 'title' && state.title === 'Trauma Compass' && errors.length === 0,
      errors.join(' | ') || state.engineErrors,
    );
    report('usage on the page', state.usage === 'added on import', state.usage);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('[data-game="screen"]')?.dataset.screen === 'story');
    const story = await page.evaluate(() => ({
      who: document.querySelector('[data-game="who"]')?.textContent ?? '',
      line: document.querySelector('[data-game="line"]')?.textContent ?? '',
    }));
    report('story is readable', story.who.length > 0 && story.line.length > 0, `${story.who}: ${story.line}`);
  } finally {
    await page.close();
  }
});

await block('attract', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    watch(page);
    await page.goto(pageUrl);
    await page.waitForFunction(() => window.__engine?.ready && window.__compass?.screen === 'title');
    const before = await page.evaluate(() => JSON.stringify(localStorage));
    await page.waitForFunction(() => window.__compass?.screen === 'attract', null, { timeout: 20000 });
    const demo = await page.locator('[data-game="demo"]').count();
    await page.mouse.move(120, 80);
    await page.mouse.move(400, 300);
    await page.waitForFunction(() => window.__compass?.screen === 'title');
    const after = await page.evaluate(() => JSON.stringify(localStorage));
    const delta = storageDelta(before, after);
    report(
      'attract exits on a mouse move and saves nothing',
      demo > 0 && delta === '',
      delta ? `${delta} demo ${demo}` : `demo ${demo}`,
    );
    await page.waitForFunction(() => window.__compass?.screen === 'attract', null, { timeout: 15000 });
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForFunction(() => window.__compass?.screen === 'title');
    report('attract exits on a click', true, '');
    await page.waitForFunction(() => window.__compass?.screen === 'attract', null, { timeout: 15000 });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__compass?.screen === 'title');
    report('attract exits on a key', true, '');
    await page.waitForFunction(() => window.__compass?.screen === 'attract', null, { timeout: 15000 });
    await page.evaluate(() => {
      window.__pads = [null, null, null, null];
      navigator.getGamepads = () => window.__pads;
      const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
      buttons[0] = { pressed: true, value: 1 };
      window.__pads[0] = {
        index: 0,
        connected: true,
        mapping: 'standard',
        axes: [0, 0, 0, 0],
        buttons,
        id: 'stub-0',
      };
    });
    await page.waitForFunction(() => window.__compass?.screen === 'title');
    report('attract exits on a pad button', true, '');
    await page.evaluate(() => {
      window.__pads = [null, null, null, null];
    });
    await page.waitForFunction(() => window.__compass?.screen === 'attract', null, { timeout: 15000 });
    await page.evaluate(() => {
      const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
      window.__pads[0] = {
        index: 0,
        connected: true,
        mapping: 'standard',
        axes: [0.95, 0, 0, 0],
        buttons,
        id: 'stub-0',
      };
    });
    await page.waitForFunction(() => window.__compass?.screen === 'title');
    report('attract exits on a stick', true, '');
  } finally {
    await page.close();
  }
});

await block('mouse and dev', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    watch(page);
    await page.goto(pageUrl);
    await page.waitForFunction(() => window.__engine?.ready && document.querySelector('button.row'), null, {
      timeout: 40000,
    });
    await page.hover('button.row >> nth=1');
    const hovered = await page.locator('button.row.is-on').innerText();
    await page.click('button.row.is-on');
    await page.waitForFunction(() => window.__compass?.screen === 'board');
    const screen = await page.evaluate(() => window.__compass?.screen);
    report('mouse hover and click', hovered.includes('Board') && screen === 'board', `${hovered} ${screen}`);
    await page.click('text=Back');
    await page.waitForFunction(() => window.__compass?.screen === 'title');
    await page.click('text=New Shift');
    await page.waitForFunction(() => window.__compass?.screen === 'story');
    // A focused button is destroyed when the shell redraws, and Enter then lands on the detached node.
    await page.evaluate(() => document.activeElement?.blur?.());
    let place = 'story';
    for (let i = 0; i < 24 && place !== 'op'; i++) {
      const before = await page.evaluate(() => {
        const c = window.__compass?.campaign;
        return `${window.__compass?.screen}:${c?.storyId ?? ''}:${c?.box ?? ''}`;
      });
      await page.evaluate(() => document.activeElement?.blur?.());
      await page.keyboard.press('Enter');
      const moved = await page
        .waitForFunction(
          (prev) => {
            const c = window.__compass?.campaign;
            return `${window.__compass?.screen}:${c?.storyId ?? ''}:${c?.box ?? ''}` !== prev;
          },
          before,
          { timeout: 4000 },
        )
        .then(() => true)
        .catch(() => false);
      place = await page.evaluate(() => window.__compass?.screen ?? '');
      if (!moved && place !== 'op') break;
    }
    if (place !== 'op') {
      const stuck = await page.evaluate(() => {
        const c = window.__compass?.campaign;
        return `${window.__compass?.screen} ${c?.storyId ?? ''} box ${c?.box ?? ''}`;
      });
      report('dev slider and reset', false, stuck);
    } else {
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => window.__compass?.screen === 'pause');
      await page.click('text=Dev Mode');
      await page.keyboard.press('ArrowRight');
      await page.waitForSelector('[data-set="game.vitalsDrain"]');
      await page.locator('[data-set="game.vitalsDrain"]').fill('2');
      await page.locator('[data-set="game.vitalsDrain"]').dispatchEvent('input');
      const shown = await page.locator('label.slider').first().innerText();
      await page.click('text=Reset sliders');
      await page.waitForFunction(() => document.querySelector('[data-set="game.vitalsDrain"]')?.value === '1');
      const reset = await page.locator('[data-set="game.vitalsDrain"]').inputValue();
      report('dev slider and reset', shown.includes('2') && Number(reset) === 1, `${shown} reset ${reset}`);
    }
  } finally {
    await page.close();
  }
});

await block('pad', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    await page.addInitScript(PAD_SCRIPT);
    watch(page);
    await page.goto(pageUrl);
    await page.waitForFunction(() => window.__engine?.ready && window.__compass?.screen === 'title', null, {
      timeout: 40000,
    });
    await page.evaluate(() => {
      window.__pads = [null, null, null, null];
      navigator.getGamepads = () => window.__pads;
    });
    const focus = await page.evaluate(() => window.__compass.campaign.focus);
    await page.evaluate(
      (body) => {
        window.__pads[0] = body;
      },
      pad(0, [0, 0, 0, 0], [13]),
    );
    await page.waitForFunction((was) => window.__compass.campaign.focus !== was, focus, { timeout: 4000 });
    await page.evaluate(
      (body) => {
        window.__pads[0] = body;
      },
      pad(0, [0, 0, 0, 0], []),
    );
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate(
      (body) => {
        window.__pads[0] = body;
      },
      pad(0, [0, 0, 0, 0], [0]),
    );
    await page.waitForFunction(() => window.__compass?.screen !== 'title', null, { timeout: 4000 });
    const screen = await page.evaluate(() => window.__compass?.screen);
    report('pad accepts the highlighted row', screen !== 'title', screen);
  } finally {
    await page.close();
  }
});

await block('scrub', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    await page.addInitScript(PAD_SCRIPT);
    watch(page);
    await page.goto(pageUrl);
    await page.waitForFunction(() => window.__engine?.ready && window.__compass?.screen === 'title', null, {
      timeout: 40000,
    });
    await page.click('text=Scrub In');
    await page.waitForFunction(() => window.__compass?.screen === 'scrub');
    await page.evaluate(() => {
      window.__pads = [null, null, null, null];
      navigator.getGamepads = () => window.__pads;
    });
    await page.evaluate(
      (bodies) => {
        window.__pads[0] = bodies[0];
        window.__pads[1] = bodies[1];
      },
      [pad(0, [0.9, 0, 0, 0], []), pad(1, [-0.9, 0, 0, 0], [0])],
    );
    await page.waitForFunction(
      () => {
        const text = document.querySelector('[data-game="scrub"]')?.textContent ?? '';
        const gloves = window.__compass.gloves();
        return (
          text.includes('Seat 2 claimed') &&
          Math.abs(gloves[0].x) > 0.2 &&
          Math.abs(gloves[1].x) > 0.2 &&
          gloves[0].x !== gloves[1].x
        );
      },
      null,
      { timeout: 5000 },
    );
    const seats = await page.evaluate(() => ({
      text: document.querySelector('[data-game="scrub"]')?.textContent ?? '',
      gloves: window.__compass.gloves(),
    }));
    const claimed = seats.text.includes('Seat 1 claimed') && seats.text.includes('Seat 2 claimed');
    const moved =
      Math.abs(seats.gloves[0].x) > 0.2 && Math.abs(seats.gloves[1].x) > 0.2 && seats.gloves[0].x !== seats.gloves[1].x;
    report('two pads claim seats and move', claimed && moved, JSON.stringify(seats));
  } finally {
    await page.close();
  }
});

await block('audio', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    watch(page);
    await page.goto(pageUrl);
    await page.waitForFunction(() => window.__engine?.ready);
    await page.mouse.click(30, 680);
    const heard = await page.evaluate(async () => {
      const audio = window.__compass.audio;
      const music = audio.volume('music');
      const ctx = audio.context;
      if (ctx?.state === 'suspended') await ctx.resume();
      const analyser = ctx.createAnalyser();
      const osc = ctx.createOscillator();
      osc.frequency.value = 440;
      osc.connect(analyser);
      analyser.connect(ctx.destination);
      osc.start();
      await new Promise((resolve) => setTimeout(resolve, 60));
      const data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      osc.stop();
      const offline = new OfflineAudioContext(1, 4000, 44100);
      const tone = offline.createOscillator();
      tone.connect(offline.destination);
      tone.start();
      const rendered = await offline.startRendering();
      let sum = 0;
      for (const sample of rendered.getChannelData(0)) sum += Math.abs(sample);
      audio.play('sfx:compass-beep');
      return { music, state: ctx.state, peak: Math.max(...data), offline: sum > 0 };
    });
    report(
      'music bus is quiet and a tone is audible',
      heard.music === 0.1 && heard.state === 'running' && heard.peak > 128 && heard.offline,
      JSON.stringify(heard),
    );
  } finally {
    await page.close();
  }
});

await block('touch', async () => {
  const phone = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await phone.newPage();
  try {
    watch(page);
    await page.goto(pageUrl);
    await page.waitForFunction(
      () =>
        window.__engine?.ready &&
        document.querySelector('[data-game="touch"]')?.textContent?.includes('Controller or keyboard required'),
      null,
      { timeout: 40000 },
    );
    await page.waitForFunction(() => window.__compass?.screen === 'attract', null, { timeout: 15000 });
    const text = await page.locator('[data-game="touch"]').innerText();
    await page.locator('[data-game="touch"] [data-act="settings"]').tap();
    await page.waitForFunction(() => window.__compass?.screen === 'settings', null, { timeout: 10000 });
    report('touch asks for a controller', text.includes('Controller or keyboard required'), text);
  } finally {
    await phone.close();
  }
});

await block('tablet', async () => {
  const tablet = await browser.newContext({ ...devices['iPad Pro 11'] });
  const page = await tablet.newPage();
  try {
    watch(page);
    await page.goto(pageUrl);
    await page.waitForFunction(
      () =>
        window.__engine?.ready &&
        document.querySelector('[data-game="touch"]')?.textContent?.includes('Controller or keyboard required'),
      null,
      { timeout: 60000 },
    );
    await page.waitForFunction(() => window.__compass?.screen === 'attract', null, { timeout: 20000 });
    const text = await page.locator('[data-game="touch"]').innerText();
    await page.locator('[data-game="touch"] [data-act="settings"]').tap();
    await page.waitForFunction(() => window.__compass?.screen === 'settings', null, { timeout: 10000 });
    report('tablet asks for a controller', text.includes('Controller or keyboard required'), text);
  } finally {
    await tablet.close();
  }
});

await block('glyphs', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    watch(page);
    await page.goto(pageUrl);
    await page.waitForFunction(() => window.__engine?.ready && window.__compass?.screen === 'title', null, {
      timeout: 40000,
    });
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => document.querySelector('.prompt')?.innerHTML.includes('Enter'));
    const keys = await page.locator('.prompt').innerHTML();
    await page.mouse.click(30, 680);
    await page.waitForFunction(() => document.querySelector('.prompt')?.innerHTML.includes('M18 16'));
    const mouse = await page.locator('.prompt').innerHTML();
    await page.click('text=Settings');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.body.innerText.includes('Glyphs'));
    await page.click('text=Glyphs');
    await page.waitForFunction(() => document.body.innerText.includes('Xbox'));
    const xbox = await page.locator('[data-game="menu"]').innerText();
    report(
      'prompts follow the last device',
      keys.includes('Enter') && mouse.includes('M18 16'),
      `${keys.includes('Enter')} ${mouse.includes('M18 16')}`,
    );
    report('Xbox glyphs are a setting', xbox.includes('Xbox'), xbox);
  } finally {
    await page.close();
  }
});

await block('campaign', async () => {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  try {
    watch(page);
    await page.goto(`${pageUrl}?game.autoplay=1`);
    let detail = '';
    let ok = false;
    try {
      await page.waitForFunction(() => window.__compass && window.__compass.screen === 'credits', null, {
        timeout: 660000,
      });
      ok = true;
    } catch {
      detail = await page.evaluate(() => {
        const op = window.__compass?.live?.();
        return JSON.stringify({
          screen: window.__compass?.screen,
          caseId: window.__compass?.campaign?.caseId,
          status: op?.status,
          tick: op?.tick,
          score: op?.score,
          fail: op?.fail,
        });
      });
    }
    report('campaign reaches the credits', ok, detail);
  } finally {
    await page.close();
  }
});

await browser.close();

const py = `
from playwright.sync_api import sync_playwright
url = ${JSON.stringify(pageUrl)}
with sync_playwright() as p:
    for name, browser_type, kwargs in (
        ('firefox', p.firefox, {}),
        ('webkit', p.webkit, {'device_scale_factor': 3, 'viewport': {'width': 390, 'height': 844}, 'is_mobile': True, 'has_touch': True, 'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'}),
    ):
        browser = browser_type.launch(headless=True)
        page = browser.new_page(**kwargs) if name == 'webkit' else browser.new_page()
        page.goto(url, wait_until='load', timeout=90000)
        try:
            page.wait_for_function("() => (document.querySelector('#msg')?.innerText || '').includes('WebGPU')", timeout=20000)
        except Exception:
            pass
        msg = page.locator('#msg').inner_text()
        print(name + '|' + msg.replace('\\n', ' '))
        browser.close()
`;
const python = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
const lines = `${python.stdout}\n${python.stderr}`;
for (const name of ['firefox', 'webkit']) {
  const row = lines.split('\n').find((line) => line.startsWith(`${name}|`)) ?? '';
  report(`${name} WebGPU message`, row.includes('This game needs a browser with WebGPU.'), row || lines.slice(0, 300));
}

process.exit(failed ? 1 : 0);
