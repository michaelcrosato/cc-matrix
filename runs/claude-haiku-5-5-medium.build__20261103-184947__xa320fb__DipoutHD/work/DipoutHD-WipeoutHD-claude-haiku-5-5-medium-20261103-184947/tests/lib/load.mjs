// Loads the Node-safe sim (src/00-10, 20, 30) into a vm context, so tests drive the same code the browser runs.
import { readFileSync, readdirSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SIM_FILES = ['00-core.js', '10-data.js', '11-about.js', '20-track.js', '30-sim.js'];

export function loadSim() {
  const ctx = createContext({ console, Math, Float32Array, Float64Array, Uint32Array, Int32Array });
  ctx.globalThis = ctx;
  for (const f of SIM_FILES) runInContext(readFileSync(join(ROOT, 'src', f), 'utf8'), ctx, { filename: f });
  return ctx.SN;
}
export const ROOT_DIR = ROOT;
