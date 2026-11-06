import { parseSong } from '../src/engine.js';
import { allSongs, MOTIFS } from '../src/audio/composer.js';
let n=0,bad=0; for (const [k,s] of Object.entries(allSongs())){ n++; try{ parseSong(s);}catch(e){bad++;console.log(k,e.message);} } console.log(n,'songs',bad,'bad',MOTIFS.length,'motifs');
