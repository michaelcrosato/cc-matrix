// Prints API.md sections by name: node tools/apidoc.mjs Engine NavGrid ...
import { readFileSync } from 'node:fs';
const text = readFileSync(new URL('../kit-docs/API.md', import.meta.url), 'utf8').split('\n');
const want = process.argv.slice(2);
let on = false;
for (const line of text) {
  if (line.startsWith('### ') || line.startsWith('## ')) {
    const name = line.replace(/^#+ /, '').replace(/^(class|interface|type) /, '').replace(/\(\)$/, '').trim();
    on = want.includes(name);
  }
  if (on) console.log(line);
}
