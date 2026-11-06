import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {TITLE,TAGLINE,STEM,SOURCE} from '../src/core/meta.js';
const root=fileURLToPath(new URL('..',import.meta.url));process.chdir(root);mkdirSync('dist',{recursive:true});
const original=execFileSync('unzip',['-p','engine-kit.zip','pixel-engine/pixel-engine.js'],{maxBuffer:10*1024*1024});
const hash=b=>createHash('sha256').update(b).digest('hex');if(hash(original)!==hash(readFileSync('pixel-engine.js')))throw Error('Engine has changed');
execFileSync('esbuild',['game.js','--bundle','--format=esm','--platform=browser','--target=es2022','--outfile=dist/bundle.js'],{stdio:['ignore','ignore','pipe']});
const js=readFileSync('dist/bundle.js','utf8').replace(/<\/script/gi,'<\\/script');
const session=readFileSync('vendor/session.js','utf8'),pack=readFileSync('packs/kenney-furniture.json').toString('base64');
const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const icon='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#10212e"/><path d="M4 17h6l3-10 5 18 3-8h7" fill="none" stroke="#81d5c2" stroke-width="3"/></svg>');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>\n${session}\n</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE} - ${TAGLINE}</title><meta name="description" content="A surgical drama in Port Verity. Ten operations, eight instruments and a second pair of hands.">
<meta name="theme-color" content="#101d2c"><link rel="icon" href="${icon}">
<meta name="hub:type" content="Game"><meta name="hub:source" content="${SOURCE}">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="4"><meta name="hub:webgpu" content="required">
<meta name="hub:session-goal" content="Keep the patient alive and top the team score">
<meta name="hub:session-howto" content="Stick/mouse: move tool. R2/click: use. Right stick/1-8: pick tool.">
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#101d2c;color:#f3e7c7;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}*{box-sizing:border-box}#app{width:100%;height:100%;position:relative}button{font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #e9bb6c;outline-offset:4px}[hidden]{display:none!important}.controller-gate{position:fixed;inset:0;display:grid;place-items:center;z-index:30;pointer-events:none;background:linear-gradient(transparent,#101d2c55)}.controller-gate>div{width:min(88vw,560px);padding:28px;background:#10212eee;border:1px solid #76d7c3;text-align:center;box-shadow:0 8px 0 #0c1526}.gate-cross{display:block;font-size:44px;color:#76d7c3;line-height:1.3}.controller-gate strong{font-size:clamp(18px,4.5vw,26px);font-weight:600;display:block}.controller-gate p{font-size:14px;line-height:1.65;color:#a6bcb8}.fallback-art{position:absolute;width:100%;height:100%;object-fit:cover;image-rendering:pixelated;opacity:.48}.fallback-card{position:absolute;left:8%;top:16%;width:min(560px,84%);padding:28px;background:#10212edb;border-left:3px solid #76d7c3}.fallback-card .eyebrow{font-size:12px;letter-spacing:.15em;color:#76d7c3}.fallback-card h1{font-size:clamp(28px,6vw,52px);line-height:1.05;margin:24px 0 8px}.fallback-card h2{font-size:clamp(17px,4vw,27px);color:#e9bb6c;margin:0 0 34px}.fallback-card strong{font-size:clamp(17px,3.7vw,23px)}.fallback-card p{font-size:14px;line-height:1.7;color:#afc1bb}.fallback-settings{position:absolute;right:16px;top:16px;border:1px solid #76d7c3;background:#10212e;color:#e9bb6c;font-size:28px;padding:4px 11px}.fallback-details{position:absolute;inset:4%;overflow:auto;padding:24px;background:#10212ef5;border:1px solid #76d7c3;z-index:50;max-width:96vw}.fallback-details button{float:right;background:#28525a;color:#f3e7c7;border:0;padding:10px}.fallback-details pre{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65;font-size:14px}.fallback-details p{line-height:1.6} @media(max-width:500px){.fallback-card{top:13%;left:6%;width:88%;padding:22px}.fallback-card h2{margin-bottom:26px}}
</style></head><body><div id="app"></div><noscript>This game needs JavaScript and a WebGPU browser.</noscript>
<template id="engine-licenses"><pre>${escape(readFileSync('CREDITS.md','utf8'))}</pre></template>
<script>window.__PIXEL_ASSETS__={'packs/kenney-furniture.json':'data:application/json;base64,${pack}'};</script>
<script type="module">\n${js}\n</script></body></html>`;
writeFileSync('dist/game.html',html);writeFileSync('../'+STEM+'.html',html);writeFileSync('index.html',html);
for(const file of ['harness.html','bridge.js','round.js'])copyFileSync('vendor/'+file,'dist/'+file);
writeFileSync('dist/build.json',JSON.stringify({title:TITLE,engine:'0.46.0',engineSHA256:hash(original),sessionSHA256:hash(Buffer.from(session)),htmlBytes:Buffer.byteLength(html)},null,2));
console.log(`Built ${STEM}.html (${(Buffer.byteLength(html)/1048576).toFixed(2)} MB)`);
