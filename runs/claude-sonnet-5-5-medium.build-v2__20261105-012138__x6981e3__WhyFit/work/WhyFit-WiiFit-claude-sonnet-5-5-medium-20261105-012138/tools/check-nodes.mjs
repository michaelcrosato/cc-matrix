import { parseSong } from '../pixel-engine.js';
import { SONGS, songLevel } from '../src/audio/songs.js';
for (const [k, s] of Object.entries(SONGS)) { const p = parseSong(s); console.log(k, p.notes?.length ?? Object.keys(p), songLevel(s).toFixed(3)); }
