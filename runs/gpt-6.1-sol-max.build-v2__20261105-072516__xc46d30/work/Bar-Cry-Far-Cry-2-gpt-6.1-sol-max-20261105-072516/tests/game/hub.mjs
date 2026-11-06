/** @file tests/game/hub.mjs: plays the hub's harness over the deliverable in the four configurations the hub's own test uses, on a port the OS picks. */
import { copyFileSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { basename, extname, join } from 'node:path';
import { chromium } from '@playwright/test';

const RUNS = [
  'players=2',
  'players=4&latency=150&jitter=50&loss=5',
  'players=4&latency=150&jitter=50&loss=5&scenario=host-leave',
  'players=2&scenario=server',
];
const ARGS = [
  '--enable-unsafe-webgpu',
  '--enable-features=Vulkan',
  '--use-vulkan=swiftshader',
  '--use-angle=swiftshader',
  '--use-webgpu-adapter=swiftshader',
];
copyFileSync(`../${basename(process.cwd())}.html`, '.cache/hub/game.html');
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer((request, response) => {
  const file = join('.cache/hub', new URL(request.url, 'http://x').pathname);
  if (!existsSync(file)) return response.writeHead(404).end();
  response.writeHead(200, { 'content-type': types[extname(file)] ?? 'text/plain' }).end(readFileSync(file));
});
await new Promise((listening) => server.listen(0, '127.0.0.1', listening));
const origin = `http://127.0.0.1:${server.address().port}`;
let [passed, failed] = [0, 0];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ARGS });
const mine = await (await fetch(`${origin}/game.html`)).text();
if (!mine.includes('name="hub:session"')) throw new Error('the page served is not this game');
mkdirSync('out/hub', { recursive: true });
try {
  for (const run of RUNS.filter((run) => !process.env.HUB_RUN || run === process.env.HUB_RUN)) {
    writeFileSync('out/hub/current.json', JSON.stringify({ run, phase: 'running' }));
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    let busy=false;const monitor=setInterval(async()=>{if(busy)return;busy=true;try{const state=await page.evaluate(()=>({text:document.body.innerText.slice(-2500),frames:[...document.querySelectorAll('iframe')].map(f=>{try{const w=f.contentWindow,e=w.__engine;let stats=null;try{stats=e?.stats?.();}catch{}return {step:typeof e?.step,ready:e?.ready,info:e?.info?.(),stats,errors:e?.errors,text:f.contentDocument?.body.innerText.slice(-600)};}catch(error){return {error:String(error)};}})}));writeFileSync('out/hub/live.json',JSON.stringify(state,null,2));}catch{}finally{busy=false;}},1000);
    try {
      await page.goto(`${origin}/harness.html?game=game.html&${run}&auto=1`, { waitUntil: 'domcontentloaded' });
      await page
        .waitForFunction(() => document.body.dataset.complete === 'true', undefined, { timeout: 170000 })
        .catch(() => {});
      const report = await page.evaluate(() => window.__hubCheck ?? { checks: [] });
      writeFileSync(`out/hub/${RUNS.indexOf(run)}.json`, JSON.stringify(report, null, 2));
      if (!report.pass) {
        const frames = [];
        for (const frame of page.frames().slice(1)) {
          try {
            frames.push(
              await frame.evaluate(() => ({
                text: document.body.innerText.slice(-3000),
                ready: window.__engine?.ready,
                errors: window.__engine?.errors,
                game: !!window.__game,
                hub: window.AIHub?.active,
              })),
            );
          } catch (error) {
            frames.push({ error: String(error) });
          }
        }
        writeFileSync(`out/hub/${RUNS.indexOf(run)}-frames.json`, JSON.stringify(frames, null, 2));
      }
      for (const check of report.checks) {
        if (check.pass) passed += 1;
        else {
          failed += 1;
          console.log(`FAIL ${run}: ${check.name}: ${String(check.detail).slice(0, 200)}`);
        }
      }
      if (!report.pass && !report.checks.some((check) => !check.pass)) {
        failed += 1;
        console.log(`FAIL ${run}: the harness never finished`);
      }
    } catch (error) {
      failed++;
      console.log(`FAIL ${run}: ${error.message.slice(0, 200)}`);
    }
    clearInterval(monitor);await page.close().catch(() => {});
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`COUNT ${passed} ${failed}`);
