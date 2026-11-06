import { chromium, webkit } from 'playwright';
import { FILE } from '../src/data/config.js';
export const GAME = new URL(`../../${FILE}.html`, import.meta.url).pathname;
export const RENDER = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--use-vulkan=swiftshader', '--use-angle=swiftshader'];
export async function launch({ render = false, webkitB = false } = {}) {
  if (webkitB) return webkit.launch();
  return chromium.launch({ args: render ? RENDER : ['--disable-gpu'] });
}
export const url = (qs = '') => 'file://' + GAME + (qs ? '?' + qs : '');
