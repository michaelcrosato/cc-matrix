// Data: the block registry. Every block is a 16-unit fabric patch. Texture patterns are named here and painted by the
// voxel renderer (11). tier = the least tool tier that breaks it (99: never). drop: an item id, [id, n], or
// { id: chance } (several rolls). Designers: add a block by adding a line.
(() => {
const DQ = globalThis.DQ;
const BLOCKS = DQ.BLOCKS = [];
const KEY = DQ.BLOCK_KEY = {};
function B(id, key, name, o) {
  const b = Object.assign({ id, key, name, hp: 6, tier: 1, drop: key, placeable: true, solid: true, opaque: true, liquid: false, light: 0, shape: 'cube', seam: true, thread: '#f1e6c8', step: 'soft' }, o);
  BLOCKS[id] = b; KEY[key] = id; return b;
}
B(1, 'backing', 'Backing Cloth', { hp: 1e9, tier: 99, drop: null, placeable: false, top: ['grid', '#2a2860'], side: ['grid', '#1e1c48'], thread: '#5a58a0', desc: 'The very bottom of the world. It holds everything up.' });
B(2, 'earth', 'Corduroy Earth', { hp: 6, top: ['cord', '#8a5a3a'], side: ['cord', '#7e5234'], desc: 'Soft brown corduroy, the stuff of fields.' });
B(3, 'grass', 'Gingham Turf', { hp: 6, drop: 'earth', placeable: false, top: ['gingham', '#6cb84a'], side: ['fringe', '#7e5234', '#5aa83e'], desc: 'Green checks, neatly hemmed.' });
B(4, 'sand', 'Calico Sand', { hp: 4, top: ['calico', '#e8d08a'], side: ['calico', '#dcc27c'], step: 'sand', desc: 'Pale calico, sprinkled with tiny flowers.' });
B(5, 'gravel', 'Button Gravel', { hp: 8, drop: ['pebble', 2], placeable: false, top: ['bumps', '#9a96a0'], side: ['bumps', '#8e8a96'], step: 'stone', desc: 'A heap of old shirt buttons. Click, clack.' });
B(6, 'stone', 'Tweed Stone', { hp: 20, tier: 2, top: ['tweed', '#8c8c9a'], side: ['tweed', '#80808e'], step: 'stone', desc: 'Grey herringbone tweed, hard as a granny\'s glare.' });
B(7, 'copperOre', 'Copper Sequin Seam', { hp: 30, tier: 2, drop: 'copperOre', placeable: false, top: ['sequins', '#8c8c9a', '#d07a3a'], side: ['sequins', '#80808e', '#d07a3a'], step: 'stone', desc: 'Tweed with copper sequins sewn in.' });
B(8, 'coal', 'Charcloth Seam', { hp: 24, tier: 2, drop: 'coal', placeable: false, top: ['lumps', '#8c8c9a', '#2a2630'], side: ['lumps', '#80808e', '#2a2630'], step: 'stone', desc: 'Tweed with lumps of black felt. It burns nicely.' });
B(9, 'log', 'Plaid Log', { hp: 12, top: ['rings', '#c89a62'], side: ['plaid', '#7a5032'], step: 'wood', desc: 'A tartan tree trunk. Very Highland.' });
B(10, 'leaves', 'Pompom Leaves', { hp: 2, drop: { branch: .35 }, placeable: false, seam: false, top: ['bobbles', '#4a9a4a'], side: ['bobbles', '#3e8a42'], desc: 'Green pompoms, bobbing in the breeze.' });
B(11, 'frayed', 'Frayed Cloth', { hp: 24, tier: 2, drop: 'frayedScrap', placeable: false, top: ['torn', '#5a3a5a'], side: ['torn', '#4e3250'], thread: '#c8b890', desc: 'Cloth the Unraveller has picked at. Sad and loose.' });
B(12, 'knot', 'Black Knot', { hp: 60, tier: 3, drop: 'blackYarn', placeable: false, seam: false, top: ['loops', '#2a1a3a'], side: ['loops', '#24163a'], desc: 'A knot so tight only a Seam Ripper can undo it.' });
B(13, 'water', 'Satin Water', { hp: 1e9, tier: 99, drop: null, placeable: false, solid: false, opaque: false, liquid: true, seam: false, top: ['satin', '#4a8ad0'], side: ['satin', '#3e7ac0'], step: 'water', desc: 'Shimmering blue satin. You cannot swim in it.' });
B(20, 'cobble', 'Cobble Patch', { hp: 22, tier: 2, top: ['quiltstone', '#9a9aa8'], side: ['quiltstone', '#8e8e9c'], step: 'stone', desc: 'Quilted stones. Sturdy enough for walls.' });
B(21, 'planks', 'Plank Patch', { hp: 10, top: ['boards', '#c8955a'], side: ['boards', '#bc8a52'], step: 'wood', desc: 'Tan boards, stitched straight.' });
B(22, 'thatch', 'Straw Thatch', { hp: 4, top: ['straw', '#e0b850'], side: ['straw', '#d4ac48'], desc: 'Golden straw. It keeps the rain off. Mostly.' });
B(23, 'feltRed', 'Red Felt Patch', { hp: 6, top: ['felt', '#d04a4a'], side: ['felt', '#c4423f'], desc: 'Cheerful red felt.' });
B(24, 'feltBlue', 'Blue Felt Patch', { hp: 6, top: ['felt', '#4a6ad0'], side: ['felt', '#4262c4'], desc: 'Bluebell-blue felt. Like a piece of sky.' });
B(25, 'feltYellow', 'Yellow Felt Patch', { hp: 6, top: ['felt', '#e8c040'], side: ['felt', '#dcb43a'], desc: 'Buttercup-yellow felt.' });
B(26, 'glow', 'Glow Patch', { hp: 6, light: 48, top: ['star', '#fff0b0'], side: ['star', '#f4e4a0'], thread: '#c8a040', desc: 'Pale gold felt with a stitched star. It glows!' });
B(27, 'stairsPlank', 'Plank Stairs', { hp: 10, shape: 'stair', opaque: false, top: ['boards', '#c8955a'], side: ['boards', '#bc8a52'], step: 'wood', desc: 'Steps of plank. Up you go!' });
B(28, 'stairsCobble', 'Cobble Stairs', { hp: 22, tier: 2, shape: 'stair', opaque: false, top: ['quiltstone', '#9a9aa8'], side: ['quiltstone', '#8e8e9c'], step: 'stone', desc: 'Stone steps, quilted.' });
B(29, 'tangle', 'Tangle', { hp: 12, drop: null, placeable: false, seam: false, top: ['loops', '#3a2a50'], side: ['loops', '#32244a'], desc: 'A wad of knotted yarn. It will fall apart on its own.' });
B(30, 'gildedFelt', 'Gilded Felt', { hp: 6, top: ['gild', '#e8b830'], side: ['gild', '#dcac2c'], desc: 'Gold felt that sparkles. Fit for a queen.' });
B(31, 'ruin', 'Old Cobble', { hp: 22, tier: 2, drop: 'cobble', placeable: false, top: ['quiltstone', '#6e6a78'], side: ['quiltstone', '#625e6e'], step: 'stone', desc: 'The scorched stones of old Thimbleton.' });
B(32, 'frayedTurf', 'Frayed Turf', { hp: 6, drop: 'earth', placeable: false, top: ['torn', '#6a5a7a'], side: ['fringe', '#5e4a4a', '#6a5a7a'], thread: '#c8b890', desc: 'Grass that has lost its colour.' });
B(33, 'darkStone', 'Charred Tweed', { hp: 20, tier: 2, drop: 'stone', placeable: false, top: ['tweed', '#5a5466'], side: ['tweed', '#504a5c'], step: 'stone', desc: 'Tweed gone dark in the Fraying.' });
B(34, 'knotWall', 'Knotted Wall', { hp: 1e9, tier: 99, drop: null, placeable: false, seam: false, top: ['loops', '#1e1230'], side: ['loops', '#1a1030'], desc: 'The Knot Wall. Only the Gate can be unpicked.' });
DQ.blockId = k => KEY[k] || 0;
DQ.block = id => BLOCKS[id] || null;
DQ.AIR = 0; DQ.WATER = 13; DQ.BACKING = 1;
// fast property tables, by id
DQ.SOLID = new Uint8Array(256); DQ.OPAQUE = new Uint8Array(256); DQ.LIQUID = new Uint8Array(256); DQ.STAIR = new Uint8Array(256);
for (const b of BLOCKS) if (b) { DQ.SOLID[b.id] = b.solid ? 1 : 0; DQ.OPAQUE[b.id] = b.opaque ? 1 : 0; DQ.LIQUID[b.id] = b.liquid ? 1 : 0; DQ.STAIR[b.id] = b.shape === 'stair' ? 1 : 0; }
})();
