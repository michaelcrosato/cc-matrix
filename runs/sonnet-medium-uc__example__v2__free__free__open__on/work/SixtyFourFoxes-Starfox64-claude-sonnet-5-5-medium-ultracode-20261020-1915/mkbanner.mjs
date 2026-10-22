import fs from 'fs';
const src=fs.readFileSync('src/about.js','utf8').replace(/export /g,'');
const f=new Function(src+'; return aboutText();');
fs.writeFileSync('src/banner.txt','<!--\n'+f().replace(/--/g,'- -')+'-->');
