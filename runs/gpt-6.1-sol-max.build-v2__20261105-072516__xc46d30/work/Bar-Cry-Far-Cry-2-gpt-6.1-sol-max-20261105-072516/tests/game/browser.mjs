/** @file Shared browser settings and file URLs for the game's verification drivers. */
import { globSync } from 'node:fs';
import { basename, resolve } from 'node:path';
export const executablePath =
  process.env.CHROMIUM_PATH ??
  globSync(
    '/home/micha/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell',
  )[0];
export const args = [
  '--enable-unsafe-webgpu',
  '--enable-features=Vulkan',
  '--use-vulkan=swiftshader',
  '--use-angle=swiftshader',
];
export const url = `file://${resolve(`../${basename(process.cwd())}.html`)}`;
export async function ready(page, query = '?game.attract=off') {
  await page.goto(url + query, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__engine?.ready === true, undefined, { timeout: 120000 });
}
export const virtualPad = () => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  window.__pad = {
    id: 'Generic Standard Controller',
    index: 0,
    connected: true,
    mapping: 'standard',
    axes: [0, 0, 0, 0],
    buttons,
    timestamp: 0,
  };
  Object.defineProperty(navigator, 'getGamepads', { value: () => [window.__pad] });
};
export async function pad(page, index, ms = 120) {
  await page.evaluate((index) => {
    const b = window.__pad.buttons[index];
    b.pressed = true;
    b.touched = true;
    b.value = 1;
    window.__pad.timestamp++;
  }, index);
  await page.waitForTimeout(ms);
  await page.evaluate((index) => {
    const b = window.__pad.buttons[index];
    b.pressed = false;
    b.touched = false;
    b.value = 0;
    window.__pad.timestamp++;
  }, index);
  await page.waitForTimeout(100);
}
