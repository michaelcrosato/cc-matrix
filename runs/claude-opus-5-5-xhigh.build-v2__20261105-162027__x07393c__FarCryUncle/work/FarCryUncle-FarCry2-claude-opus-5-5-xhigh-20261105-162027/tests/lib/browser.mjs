// One Chromium, with the flags check.mjs uses for WebGPU on this machine.
import { chromium } from 'playwright';
export const GPU_FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
export const launch = (opts = {}) => chromium.launch({ headless: true, args: GPU_FLAGS, ...opts });
