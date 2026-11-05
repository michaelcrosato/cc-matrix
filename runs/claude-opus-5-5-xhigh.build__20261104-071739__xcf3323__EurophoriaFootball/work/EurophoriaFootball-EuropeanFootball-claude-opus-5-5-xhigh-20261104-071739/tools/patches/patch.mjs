// applies engine patches: node tools/patches/patch.mjs <file> <patch.json-ish module>; each [find, replace] must match exactly once
import { readFileSync, writeFileSync } from 'node:fs';
const [, , file, mod] = process.argv;
const { patches } = await import(new URL(mod, 'file://' + process.cwd() + '/').href);
let s = readFileSync(file, 'utf8');
for (const [name, find, rep] of patches) {
  if (s.includes(rep) && !s.includes(find)) { console.log('already applied: ' + name); continue; }
  const n = s.split(find).length - 1;
  if (n !== 1) { console.error('FAIL ' + name + ': found ' + n + ' times'); process.exit(1); }
  s = s.replace(find, () => rep); console.log('applied: ' + name);
}
writeFileSync(file, s);
