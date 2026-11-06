import fs from 'node:fs';
import vm from 'node:vm';
export function load(full = false) {
  const logs = [];
  const ctx = vm.createContext({
    console: {
      log() {},
      warn(...a) {
        logs.push(a.join(' '));
      },
      error(...a) {
        logs.push(a.join(' '));
      },
    },
    setTimeout,
    clearTimeout,
  });
  for (const f of [
    'vendor/my-3d2dge.js',
    'src/content.js',
    'src/sim.js',
    ...(full
      ? ['src/platform.js', 'src/audio.js', 'src/art.js', 'src/main.js']
      : ['src/platform.js']),
  ])
    vm.runInContext(
      fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'),
      ctx,
      { filename: f },
    );
  return { ...ctx, logs };
}
