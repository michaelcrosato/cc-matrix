// builds the single deliverable html from index.html's script list (engine + hub client + game, all inlined)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outName = process.argv[2] || path.join(root, '..', path.basename(root) + '.html');
let html = readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  const code = readFileSync(path.join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return '<script>\n' + code + '\n</script>';
});
html = html.replace('<!--HUB-SESSION-->', '');
writeFileSync(outName, html);
console.log('wrote', outName, (html.length / 1024 / 1024).toFixed(2) + ' MB');
