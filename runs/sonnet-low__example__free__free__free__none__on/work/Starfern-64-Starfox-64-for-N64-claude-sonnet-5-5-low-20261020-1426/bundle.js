const fs=require('fs'),path=require('path');
const dir=__dirname, name=path.basename(dir), out=path.join(dir,'..',name+'.html');
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
const about=read('about.js');
const lines=eval(about.replace("'use strict';","").replace('const ABOUT','var ABOUT')+';ABOUT');
const comment=lines.map(l=>l.startsWith('#')?'\n== '+l.slice(1)+' ==':l).join('\n').replace(/--/g,'—');
const js=['engine','data','game','about','ui'].map(f=>read(f+'.js')).join('\n');
const html=`<!--\nSTARFERN 64\n${comment}\n-->\n<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><title>Starfern 64</title>\n<style>html,body{margin:0;height:100%;background:#020a05;overflow:hidden;touch-action:none}canvas{display:block;width:100vw;height:100vh;cursor:default}</style></head>\n<body><canvas id="c"></canvas>\n<script>\n${js.replace(/<\/script>/g,'<\\/script>')}\n</script></body></html>\n`;
fs.writeFileSync(out,html);console.log(out,html.length);
