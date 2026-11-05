/* =============================================================================
 * 04-shapes: ballpark objects as engine shape data (E.SHAPES): drawn in every
 * view and facing with the house shading. Units: 16 = one tile; written facing
 * south (+y). Checked with node tools/asset-sheet.mjs.
 * ========================================================================== */
BZ.SHAPE_DEFS = {
  bz_base: { about: 'canvas base pillow', tags: 'baseball', mats: { b: '#f4f4f0 cloth' }, parts: [['box','b',[0,0,0],[9,9,2.5]]] },
  bz_rubber: { about: 'pitching rubber', tags: 'baseball', mats: { w: '#f4f4f0' }, parts: [['box','w',[0,0,0],[10,2.5,1.2]]] },
  bz_foulpole: { about: 'foul pole with a screen', tags: 'baseball', mats: { y: '#f2d23a metal' }, parts: [['cyl','y',[0,0,0],1.6,150], ['box','y',[2.5,0,60],[4,.6,86]]] },
  bz_bench: { about: 'dugout bench', tags: 'baseball', mats: { w: 'planks', m: 'iron' }, parts: [['box','w',[0,0,6],[40,7,2]], ['row',4,[12,0,0],['box','m',[0,0,0],[1.5,6,6]]]] },
  bz_batrack: { about: 'bat rack with bats', tags: 'baseball', mats: { w: 'oak', b: '#c89a5a' }, parts: [['box','w',[0,0,0],[18,4,14]], ['row',6,[2.6,0,0],['cyl','b',[0,-1,8],.8,12]]] },
  bz_helmetrack: { about: 'helmet rack', tags: 'baseball', mats: { w: 'oak', h: '#1e2a5a glaze' }, parts: [['box','w',[0,0,0],[16,5,12]], ['row',3,[5,0,0],['ball','h',[0,-1,14],2.6,{sz:.8}]]] },
  bz_cooler: { about: 'orange water cooler', tags: 'baseball', mats: { o: '#f08a1a glaze', w: '#f4f4f4' }, parts: [['cyl','o',[0,0,0],4.5,10], ['cyl','w',[0,0,10],4.6,1.5], ['box','w',[0,4.6,3],[1.4,1.4,1.4]]] },
  bz_rosin: { about: 'rosin bag', tags: 'baseball', mats: { c: '#e8e0d0 cloth' }, parts: [['ball','c',[0,0,1],1.6,{sz:.6}]] },
  bz_lighttower: { about: 'stadium light tower', tags: 'baseball light', mats: { m: 'steel', l: '#fffbe0 none glow=1' }, lights: [[0,0,190,'#fff4d8',260]],
    parts: [['cyl','m',[0,0,0],3,170,{r2:2}], ['box','m',[0,0,168],[34,4,26]], ['row',4,[8,0,0],['row',3,[0,0,8],['box','l',[0,2.3,172],[6,1,5]]]]] },
  bz_scoreboard: { about: 'scoreboard on legs', tags: 'baseball', mats: { b: '#1a2a1a', f: '#3a3a3a', m: 'iron' }, parts: [['mirror','x',['box','m',[20,0,0],[3,3,40]]], ['box','f',[0,0,40],[64,6,34]], ['box','b',[0,3.2,44],[58,.5,26]]] },
  bz_jumbotron: { about: 'video board on a frame', tags: 'baseball', mats: { b: '#101828', f: '#2a2a3a', m: 'steel' }, parts: [['mirror','x',['box','m',[30,0,0],[4,4,50]]], ['box','f',[0,0,50],[96,8,56]], ['box','b',[0,4.2,54],[88,.5,46]]] },
  bz_lscreen: { about: 'batting practice L-screen', tags: 'baseball', mats: { m: 'iron', n: '#3a3a3a' }, parts: [['box','m',[0,0,0],[24,1.2,24]], ['box','n',[-6,.8,12],[11,.4,22]]] },
  bz_cage: { about: 'batting cage net', tags: 'baseball', mats: { n: '#2a2a2a', m: 'iron' }, parts: [['mirror','x',['box','n',[18,0,0],[1,60,30]]], ['box','n',[0,-30,0],[36,1,30]], ['box','m',[0,0,30],[38,62,1]]] },
  bz_pitchomatic: { about: 'the Pitch-O-Matic 3000 pitching machine', tags: 'baseball robot', mats: { r: '#d83a2a metal', m: 'steel', w: '#2a2a2a', g: '#ffd040 none glow=1' },
    parts: [['box','m',[0,0,0],[16,14,6]], ['cyl','r',[0,0,6],5,10], ['ball','r',[0,0,18],6], ['cyl','w',[0,4,18],2.6,7,{sq:1}], ['box','g',[0,6,22],[6,1,2]], ['mirror','x',['cyl','w',[7,5,0],2.5,3]]] },
  bz_dugout: { about: 'dugout roof and back wall', tags: 'baseball', mats: { r: '#2a3a5a metal', w: 'brick', b: 'planks' }, parts: [['box','w',[0,-10,0],[120,4,22]], ['box','r',[0,-4,22],[124,16,2]], ['box','b',[0,-5,0],[110,6,7]]] },
  // Kernel Field
  bz_cornstalk: { about: 'tall corn stalk', tags: 'farm', mats: { s: '#7a9a2a foliage', c: '#f2d23a' }, parts: [['cyl','s',[0,0,0],1,26,{r2:.5}], ['ball','s',[2,0,14],3,{sz:.4}], ['ball','s',[-2,0,20],3,{sz:.4}], ['cyl','c',[1.5,0,16],1,5,{r2:.6}]] },
  bz_silo: { about: 'red farm silo with a dome', tags: 'farm', mats: { r: '#b83a2a planks', d: '#c8c8d0 metal' }, parts: [['cyl','r',[0,0,0],30,150], ['ball','d',[0,0,150],30,{sz:.6}]] },
  bz_haybale: { about: 'round hay bale', tags: 'farm', mats: { h: 'straw' }, parts: [['cyl','h',[0,0,0],9,10]] },
  bz_barnboard: { about: 'red barn scoreboard', tags: 'farm baseball', mats: { r: '#a83a2a planks', w: '#f4f0e8', b: '#1a2a1a', s: 'shingle' }, parts: [['box','r',[0,0,0],[120,20,70]], ['prism','s',[0,0,70],[[-64,0],[64,0],[0,30]],24,{axis:'y'}], ['box','b',[0,10.5,20],[96,.6,38]], ['box','w',[0,10.6,60],[100,.4,4]]] },
  bz_windmill: { about: 'farm windmill', tags: 'farm', mats: { m: 'iron', b: '#d8d8d8 metal', t: '#b83a2a' }, parts: [['cyl','m',[0,0,0],8,90,{r2:2,seg:4}], ['ring',8,9,['box','b',[0,2,96],[3,1,16],{rot:[0,0,0]}]], ['box','t',[0,-8,96],[1,14,6]]] },
  bz_windsock: { about: 'windsock on a pole', tags: 'baseball', mats: { m: 'iron', s: '#ff7a1a cloth' }, parts: [['cyl','m',[0,0,0],1,50], ['cyl','s',[0,6,50],2.4,1,{r2:1.2}], ['box','s',[0,7,50],[3,12,3]]] },
  // Barnacle Bay
  bz_lighthouse: { about: 'striped lighthouse', tags: 'coast', mats: { w: '#f4f4f4', r: '#d83a2a', g: '#fff4a0 none glow=1', m: 'iron' }, lights: [[0,0,170,'#fff4a0',200]],
    parts: [['cyl','w',[0,0,0],22,160,{r2:14}], ['cyl','r',[0,0,30],20.8,16,{r2:20.1}], ['cyl','r',[0,0,78],18.4,16,{r2:17.7}], ['cyl','r',[0,0,126],16,16,{r2:15.3}], ['cyl','g',[0,0,160],10,14], ['cyl','m',[0,0,174],13,8,{r2:0}]] },
  bz_boat: { about: 'small fishing boat', tags: 'coast', mats: { h: '#f4f4f0 planks', r: '#d83a2a', m: 'oak', s: '#f0e8d0 cloth' }, parts: [['prism','h',[0,0,0],[[-6,0],[6,0],[9,7],[-9,7]],34,{axis:'y'}], ['box','r',[0,0,6],[18,36,1.5]], ['cyl','m',[0,0,7],1,34], ['prism','s',[0,0,12],[[0,0],[0,26],[14,0]],1,{axis:'y'}]] },
  bz_buoy: { about: 'red and white buoy', tags: 'coast', mats: { r: '#d83a2a', w: '#f4f4f4' }, parts: [['cyl','r',[0,0,0],4,6,{r2:3}], ['cyl','w',[0,0,6],3,4,{r2:2}], ['ball','r',[0,0,11],2]] },
  bz_piling: { about: 'pier piling', tags: 'coast', mats: { w: 'walnut' }, parts: [['cyl','w',[0,0,0],3,22]] },
  bz_trap: { about: 'lobster trap', tags: 'coast', mats: { w: 'crate' }, parts: [['box','w',[0,0,0],[14,10,8]]] },
  // Caldera
  bz_basalt: { about: 'basalt column cluster', tags: 'volcano', mats: { b: '#2a2a30 stones size=4' }, parts: [['cyl','b',[0,0,0],7,40,{seg:6}], ['cyl','b',[9,4,0],6,28,{seg:6}], ['cyl','b',[-8,5,0],6,22,{seg:6}]] },
  bz_vent: { about: 'lava vent cone', tags: 'volcano', mats: { r: '#3a2a24 rock', l: '#ff7a1a none glow=1' }, lights: [[0,0,20,'#ff7a1a',120]], parts: [['cyl','r',[0,0,0],24,16,{r2:8}], ['cyl','l',[0,0,15.5],7,1]] },
  bz_warnsign: { about: 'warning sign', tags: 'volcano', mats: { m: 'iron', y: '#f2d23a' }, parts: [['cyl','m',[0,0,0],1,24], ['prism','y',[0,0,22],[[-8,0],[8,0],[0,13]],1,{axis:'y'}]] },
  bz_volcano: { about: 'smoking volcano', tags: 'volcano', mats: { r: '#3a1e18 rock', l: '#ff5a0a none glow=1' }, lights: [[0,0,240,'#ff5a0a',300]], parts: [['cyl','r',[0,0,0],180,220,{r2:40}], ['cyl','l',[0,0,219],34,2]] },
  // Tranquility
  bz_habitat: { about: 'moon habitat module', tags: 'space', mats: { w: '#e0e4ec metal', g: '#8ac8ff none glow=1' }, parts: [['cyl','w',[0,0,0],30,40,{sq:.7}], ['ball','w',[0,0,40],30,{sz:.5}], ['row',3,[16,0,0],['box','g',[0,21,24],[6,1,6]]]] },
  bz_antenna: { about: 'radio antenna mast', tags: 'space', mats: { m: 'steel', r: '#ff3a3a none glow=1' }, lights: [[0,0,82,'#ff3a3a',40]], parts: [['cyl','m',[0,0,0],2,80,{r2:.6,seg:4}], ['ball','r',[0,0,82],1.8]] },
  bz_dish: { about: 'satellite dish', tags: 'space', mats: { m: 'steel', d: '#f0f0f4 metal' }, parts: [['cyl','m',[0,0,0],3,30], ['lathe','d',[0,0,26],[[0,0],[10,4],[22,14],[21,15],[0,2]]]] },
  bz_rover: { about: 'moon rover', tags: 'space', mats: { b: '#d8d8e0 metal', w: '#2a2a30', g: '#ffd040' }, parts: [['box','b',[0,0,6],[22,14,6]], ['mirror','xy',['cyl','w',[10,7,0],4,3,{sq:1}]], ['cyl','b',[-6,0,12],1,10], ['box','g',[-6,0,22],[6,1,4]]] },
  bz_crater: { about: 'small crater rim', tags: 'space', mats: { r: '#8a8a94 rock' }, parts: [['lathe','r',[0,0,0],[[22,0],[18,4],[14,1],[0,1]]]] },
  // Boneyard
  bz_tomb1: { about: 'rounded tombstone', tags: 'graveyard', mats: { s: '#8a8a92 stones size=3' }, parts: [['box','s',[0,0,0],[12,4,14]], ['cyl','s',[0,0,14],6,4,{sq:.33}]] },
  bz_tomb2: { about: 'cross tombstone', tags: 'graveyard', mats: { s: '#9a9aa2 stone' }, parts: [['box','s',[0,0,0],[4,4,22]], ['box','s',[0,0,13],[14,4,4]]] },
  bz_tomb3: { about: 'leaning slab tombstone', tags: 'graveyard', mats: { s: '#6a6a74 stone' }, parts: [['box','s',[0,0,0],[10,3,16],{rot:[0,8,0]}]] },
  bz_crypt: { about: 'stone crypt with a peaked roof', tags: 'graveyard', mats: { s: 'granite', r: 'slate', d: '#1a1a20' }, parts: [['box','s',[0,0,0],[44,40,34]], ['prism','r',[0,0,34],[[-26,0],[26,0],[0,16]],44,{axis:'y'}], ['box','d',[0,20.2,0],[12,.5,22]]] },
  bz_deadtree: { about: 'dead twisted tree', tags: 'graveyard', mats: { b: '#3a3028 bark' }, parts: [['cyl','b',[0,0,0],4,46,{r2:1.5}], ['box','b',[6,0,32],[14,2,2],{rot:[0,-30,0]}], ['box','b',[-6,0,38],[12,2,2],{rot:[0,30,0]}]] },
  bz_pumpkin: { about: 'jack-o-lantern', tags: 'graveyard', mats: { o: '#f07a1a', g: '#ffd040 none glow=1', s: '#3a6a2a' }, lights: [[0,0,6,'#ffa040',50]], parts: [['ball','o',[0,0,5],5.5,{sz:.8}], ['box','g',[0,5,5],[5,.5,2]], ['cyl','s',[0,0,9],.8,2.5]] },
  // MegaDome
  bz_holoboard: { about: 'neon holo-billboard', tags: 'city', mats: { m: 'steel', c: '#2de2e6 none glow=1', p: '#ff3ab8 none glow=1' }, parts: [['mirror','x',['box','m',[30,0,0],[3,3,70]]], ['box','m',[0,0,70],[80,4,40]], ['box','c',[0,2.2,74],[72,.5,3]], ['box','p',[0,2.2,104],[72,.5,3]]] },
  bz_luxurybox: { about: 'luxury box with tinted glass', tags: 'city', mats: { w: '#3a3a4a metal', g: '#ffd880 none glow=1', r: '#e01e3c' }, lights: [[0,0,90,'#ffd880',90]], parts: [['box','w',[0,0,0],[90,30,70]], ['box','w',[0,0,70],[96,34,26]], ['box','g',[0,17.2,74],[84,.5,16]], ['box','r',[0,17.4,92],[90,.5,3]]] },
  bz_megatron: { about: 'the MEGA-TRON video board', tags: 'city', mats: { m: 'steel', f: '#1a1a24', r: '#e01e3c metal', c: '#2de2e6 none glow=1' }, lights: [[0,0,140,'#2de2e6',200]],
    parts: [['mirror','x',['box','m',[60,0,0],[8,8,90]]], ['box','f',[0,0,90],[180,12,100]], ['box','r',[0,0,190],[186,14,8]], ['box','c',[0,6.4,92],[176,.5,3]]] },
  bz_drone: { about: 'security drone', tags: 'city robot', mats: { b: '#c8d0dc metal', r: '#e01e3c none glow=1', m: 'steel' }, parts: [['ball','b',[0,0,4],5,{sz:.6}], ['mirror','xy',['cyl','m',[7,7,5],3,.6]], ['ball','r',[0,4,4],1.5]] }
};
BZ.installShapes = () => { if (!E.SHAPES) return; for (const k in BZ.SHAPE_DEFS) E.SHAPES[k] = BZ.SHAPE_DEFS[k]; };
