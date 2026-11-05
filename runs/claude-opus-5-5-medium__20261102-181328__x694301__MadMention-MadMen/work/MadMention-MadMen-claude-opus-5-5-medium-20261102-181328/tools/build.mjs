// node tools/build.mjs [--dev]: index.html (scripts by src, for development) and the single bundled file in the parent folder
import fs from 'fs'; import path from 'path'; import url from 'url';
const here = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const name = path.basename(here);
const tpl = fs.readFileSync(path.join(here, 'template.html'), 'utf8');
const SESSION = 'vendor/hub/session.js', ENGINE = 'vendor/engine/dist/handoff/my-3d2dge.js', SRC = ['src/data.js', 'src/art.js', 'src/about.js', 'src/game.js'];
const tag = f => `<script src="${f}"></script>`;
const dev = tpl.replace('<!--SESSION-->', tag(SESSION)).replace('<!--SCRIPTS-->', [ENGINE, ...SRC].map(tag).join('\n'));
fs.writeFileSync(path.join(here, 'index.html'), dev);
const inl = f => { const s = fs.readFileSync(path.join(here, f), 'utf8'); if (/<\/script/i.test(s)) throw new Error(f + ' contains </script'); return '<script>\n' + s + '\n</script>'; };
const one = tpl.replace('<!--SESSION-->', () => inl(SESSION)).replace('<!--SCRIPTS-->', () => [ENGINE, ...SRC].map(inl).join('\n'));
const out = path.join(here, '..', name + '.html');
fs.writeFileSync(out, one);
console.log('wrote', out, (one.length / 1024 | 0) + ' KB');
