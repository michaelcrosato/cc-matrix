import { renderSound, parseSong } from '../pixel-engine.js';
import { SFX, LOOPS } from '../src/audio/sfx.js';
import { SONGS } from '../src/audio/music.js';
let bad = 0, n = 0;
for (const [k, d] of Object.entries({ ...SFX, ...LOOPS })) { try { const s = renderSound(d); n++; let peak = 0; for (const v of s) peak = Math.max(peak, Math.abs(v)); if (peak < 0.01) { console.log('SILENT', k); bad++; } } catch (e) { console.log('ERR', k, e.message); bad++; } }
for (const [k, s] of Object.entries(SONGS)) { try { parseSong(s); } catch (e) { console.log('SONG ERR', k, String(e.message).slice(0, 150)); bad++; } }
console.log(n, 'sounds', bad, 'bad');
