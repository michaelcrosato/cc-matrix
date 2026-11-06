import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
const stem='Californiroll-Games-California-Games-gpt-6.1-sol-ultra-20261105-212543';
const result=await build({entryPoints:['main.js'],bundle:true,format:'esm',write:false,target:'es2022',minify:true,legalComments:'none'});
const credits=fs.existsSync('../exit-interview.json')?JSON.parse(fs.readFileSync('../exit-interview.json','utf8')):{};
let html=fs.readFileSync('template.html','utf8').replace('<!--HUB_SESSION-->',()=>`<script>${fs.readFileSync('hub/session.js','utf8').replaceAll('</script','<\\/script')}</script>`).replace('/*CREDITS*/',()=>`window.CREDITS=${JSON.stringify(credits).replaceAll('<','\\u003c')};`).replace('/*BUNDLE*/',()=>result.outputFiles[0].text.replaceAll('</script','<\\/script'));
html=html.replace('</head>',()=>`<!-- Third-party notices\n${fs.readFileSync('THREE-LICENSE.txt','utf8')}\nRapier 0.19.3, Dimforge, Apache License 2.0:\n${fs.readFileSync('RAPIER-LICENSE.txt','utf8')}\n--></head>`);
fs.writeFileSync('index.html',html);fs.writeFileSync(path.join('..',stem+'.html'),html);console.log(`Built ${stem}.html (${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MB)`);
