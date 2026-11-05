import { load } from '../test/lib/load.mjs';
const { G } = load({});
console.log('sfx', Object.keys(G.SFX).length, 'songs', Object.keys(G.SONGS).length, 'jingles', Object.keys(G.JINGLES).length, 'clips', (G.Anim.init(), G.Anim.lib ? G.Anim.lib.names.length : 0));
console.log('suits', G.SUIT_IDS.length, 'accs', G.ACC_IDS.length, 'gifts', G.GIFT_IDS.length, 'tuning sliders', G.TUNING.length, 'lines', Object.values(G.LINES).reduce((s, o) => s + Object.values(o).flat().length, 0));
