import { chromium } from 'playwright';
import { inflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.resolve(root, '..', 'Level Best-Wii Fit-grok-4.7-xhigh-20261104-231317.html');
const scratch = '/home/micha/dev/cc-matrix/runs/grok-xhigh.build-v2__20261104-231317__x29b4d9/tmp/grok-goal-cfc5772a1498/implementer';
const RENDER = [
  '--enable-unsafe-webgpu',
  '--enable-features=Vulkan',
  '--use-webgpu-adapter=swiftshader',
  '--use-vulkan=swiftshader',
  '--use-angle=swiftshader',
  '--no-sandbox',
  '--disable-dev-shm-usage',
];

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePng(buf) {
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  const parts = [];
  while (offset + 8 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    offset += 4;
    const type = buf.toString('ascii', offset, offset + 4);
    offset += 4;
    const data = buf.subarray(offset, offset + len);
    offset += len + 4;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') parts.push(data);
    else if (type === 'IEND') break;
  }
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (bitDepth !== 8 || !bpp) throw new Error(`unsupported png ${colorType}/${bitDepth}`);
  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * 4);
  let cursor = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[cursor];
    cursor += 1;
    const row = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const left = i >= bpp ? row[i - bpp] : 0;
      const up = prev[i];
      const ul = i >= bpp ? prev[i - bpp] : 0;
      const v = raw[cursor + i];
      if (filter === 0) row[i] = v;
      else if (filter === 1) row[i] = (v + left) & 255;
      else if (filter === 2) row[i] = (v + up) & 255;
      else if (filter === 3) row[i] = (v + ((left + up) >> 1)) & 255;
      else if (filter === 4) row[i] = (v + paeth(left, up, ul)) & 255;
      else throw new Error(`png filter ${filter}`);
    }
    cursor += stride;
    prev = row;
    for (let x = 0; x < width; x++) {
      const s = x * bpp;
      const d = (y * width + x) * 4;
      out[d] = row[s];
      out[d + 1] = row[s + 1];
      out[d + 2] = row[s + 2];
      out[d + 3] = bpp === 4 ? row[s + 3] : 255;
    }
  }
  return { width, height, data: out };
}

export function paintReport(img) {
  const { width, height, data } = img;
  let ink = 0;
  let sky = 0;
  let painted = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  const kinds = new Set();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      kinds.add(`${r >> 4},${g >> 4},${b >> 4}`);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max > 24) {
        painted += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      if (r < 48 && g < 42 && b < 60 && r + g + b > 20) ink += 1;
      if (b > 130 && g > 90 && b > r) sky += 1;
    }
  }
  return {
    width, height, kinds: kinds.size, ink, sky, painted,
    cover: painted / (width * height),
    bboxW: Math.max(0, maxX - minX),
    bboxH: Math.max(0, maxY - minY),
  };
}

async function oneLaunch(browser, index) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  const url = `file://${htmlPath}`;
  await page.goto(url);
  await page.waitForFunction(() => {
    const render = window.__RENDER__;
    const title = document.querySelector('h1');
    return render && render.frames > 0 && !render.lost && render.backend === 'webgpu'
      && render.width === window.innerWidth && render.height === window.innerHeight
      && title && title.textContent === 'Level Best';
  }, null, { timeout: 90000 });
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => ({ ...window.__RENDER__, screen: document.body.dataset.screen, title: document.querySelector('h1') && document.querySelector('h1').textContent }));
  if (before.lost) throw new Error(`device lost: ${before.lost}`);
  const shot = await page.locator('#view').screenshot({ type: 'png' });
  const report = paintReport(decodePng(shot));
  const painted = report.kinds >= 6 && report.ink > 40 && report.sky > 40 && report.cover > 0.45
    && report.bboxW > report.width * 0.6 && report.bboxH > report.height * 0.6;
  if (!painted) throw new Error(`blank or flat readback ${JSON.stringify(report)}`);
  const file = path.join(scratch, `launch-${index}.png`);
  writeFileSync(file, shot);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const screen = document.body.dataset.screen;
    return screen && screen !== 'title' && screen !== 'boot' && screen !== 'attract';
  }, null, { timeout: 8000 });
  const after = await page.evaluate(() => document.body.dataset.screen);
  await page.close();
  return { index, before, after, report, errors, file };
}

export async function launchTwice() {
  mkdirSync(scratch, { recursive: true });
  const lines = [];
  const browser = await chromium.launch({ headless: true, args: RENDER });
  try {
    for (const index of [1, 2]) {
      const result = await oneLaunch(browser, index);
      lines.push(JSON.stringify(result));
      if (result.errors.some((line) => /device lost/i.test(line))) throw new Error(result.errors.join('\n'));
    }
  } finally {
    await browser.close();
  }
  const log = lines.join('\n') + '\n';
  writeFileSync(path.join(scratch, 'launch.log'), log);
  return log;
}

if (process.argv[1] && process.argv[1].endsWith('launch.mjs')) {
  launchTwice().then((log) => {
    console.log(log);
  }).catch((err) => {
    const text = String(err && err.stack || err);
    try {
      mkdirSync(scratch, { recursive: true });
      writeFileSync(path.join(scratch, 'launch-env.txt'), text);
    } catch { /* the scratch directory is the record */ }
    console.error(text);
    process.exit(1);
  });
}
