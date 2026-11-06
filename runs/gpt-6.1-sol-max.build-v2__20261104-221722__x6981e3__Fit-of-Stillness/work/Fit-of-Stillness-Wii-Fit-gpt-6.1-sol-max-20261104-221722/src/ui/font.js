// Mixed case pixel font.
const H = {
a:'00 00 0e 01 0f 11 0f 00 00', b:'10 10 1e 11 11 11 1e 00 00', c:'00 00 0e 11 10 11 0e 00 00', d:'01 01 0f 11 11 11 0f 00 00',
e:'00 00 0e 11 1f 10 0e 00 00', f:'06 09 08 1c 08 08 08 00 00', g:'00 00 0f 11 11 11 0f 01 0e', h:'10 10 1e 11 11 11 11 00 00',
i:'04 00 0c 04 04 04 0e 00 00', j:'02 00 06 02 02 02 02 12 0c', k:'10 10 12 14 18 14 12 00 00', l:'0c 04 04 04 04 04 0e 00 00',
m:'00 00 1a 15 15 15 15 00 00', n:'00 00 1e 11 11 11 11 00 00', o:'00 00 0e 11 11 11 0e 00 00', p:'00 00 1e 11 11 11 1e 10 10',
q:'00 00 0f 11 11 11 0f 01 01', r:'00 00 16 19 10 10 10 00 00', s:'00 00 0f 10 0e 01 1e 00 00', t:'08 08 1c 08 08 09 06 00 00',
u:'00 00 11 11 11 13 0d 00 00', v:'00 00 11 11 11 0a 04 00 00', w:'00 00 11 11 15 15 0a 00 00', x:'00 00 11 0a 04 0a 11 00 00',
y:'00 00 11 11 11 11 0f 01 0e', z:'00 00 1f 02 04 08 1f 00 00' };
export const GLYPHS = Object.fromEntries(Object.entries(H).map(([k, v]) => [k, v.split(' ').map((h) => parseInt(h, 16).toString(2).padStart(5, '0').replace(/0/g, '.').replace(/1/g, 'o'))]));
export function say(hud, x, y, text, { color = 'white', shadow = 'ink', scale = 1 } = {}) {
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (g) hud.sprite(x, y, g, { o: color }, { scale, shadow });
    else if (ch !== ' ') hud.text(x, y, ch, { color, shadow, scale });
    x += 6 * scale;
  }
  return x;
}

export const clean = s => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[…]/g,'...').replace(/[–—]/g,'-').replace(/[^a-zA-Z0-9 .,!?;:'"()\[\]{}+\-=*/%<>#@&_\n]/g,'?');
export function measure(s,scale=1){return clean(s).length*6*scale;}
export function wrap(s,width,scale=1){const out=[],limit=Math.max(1,Math.floor(width/(6*scale)));for(const paragraph of clean(s).split('\n')){let line='';for(let word of paragraph.split(' ')){if(word.length>limit){if(line){out.push(line);line='';}while(word.length>limit){out.push(word.slice(0,limit));word=word.slice(limit);}}if((line?line.length+1:0)+word.length>limit&&line){out.push(line);line=word;}else line+=(line?' ':'')+word;}out.push(line);}return out;}

Object.assign(GLYPHS, {'<':['...o.','..o..','.o...','o....','.o...','..o..','...o.'],'>':['.o...','..o..','...o.','....o','...o.','..o..','.o...'],'%':['oo..o','oo.o.','..o..','.o...','o.oo.','..oo.','.....'],'&':['.oo..','o..o.','.oo..','.oo.o','o..o.','o..o.','.oo.o'],'_':['.....','.....','.....','.....','.....','.....','ooooo']});
