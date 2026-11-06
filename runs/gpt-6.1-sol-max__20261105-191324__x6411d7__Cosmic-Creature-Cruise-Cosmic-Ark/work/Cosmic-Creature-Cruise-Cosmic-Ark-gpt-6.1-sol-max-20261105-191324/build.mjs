import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir=path.dirname(fileURLToPath(import.meta.url));
const selection=JSON.parse(await readFile(path.join(dir,'selection.json'),'utf8'));
const output=await build({entryPoints:[path.join(dir,'app.js')],bundle:true,minify:true,write:false,format:'iife',target:['es2022'],legalComments:'inline'});
const code=output.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const client=await readFile(path.join(dir,'hub-session.js'),'utf8');
const notices=await Promise.all(['three','peerjs'].map(async name=>`${name}\n${await readFile(path.join(dir,'node_modules',name,'LICENSE'),'utf8')}`));
const credits=JSON.parse(await readFile(path.join(dir,'..','exit-interview.json'),'utf8'));
let html=await readFile(path.join(dir,'shell.html'),'utf8');
html=html.replace('<!-- HUB_CLIENT -->',()=>`<script>\n${client}\n</script>`).replace('CREDITS_JSON',()=>JSON.stringify(credits).replace(/</g,'\\u003c')).replace('<!-- GAME_SCRIPT -->',()=>`<!-- Bundled dependency notices\n${notices.join('\n\n')}\nRapier 0.19.3: Apache-2.0, https://www.apache.org/licenses/LICENSE-2.0\n-->\n<script>\n${code}\n</script>`);
const filename=path.join(dir,'..',selection.base+'.html');await writeFile(filename,html);
console.log(`Built ${path.basename(filename)} (${(Buffer.byteLength(html)/1048576).toFixed(2)} MiB)`);
