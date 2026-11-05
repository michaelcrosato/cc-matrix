/* Gauntletdown: built from game/src by build.mjs. Do not edit by hand. */
(() => {
'use strict';
// ---- assets (game/assets/gd-assets.js: CC0 props cut from the engine's asset store) ----
/* gd: a set of my-3D2dge's asset store (written by tools/asset-*.mjs; entries may be edited by hand).
 * Cut from kenney-food, kenney-mini-dungeon, kaykit-dungeon-remastered, kaykit-halloween-bits, kenney-graveyard: Kenney Food Kit (kenney.nl), CC0 1.0; Kenney Mini Dungeon (kenney.nl), CC0 1.0; KayKit Dungeon Remastered (kaylousberg.com), CC0 1.0; KayKit Halloween Bits (kaylousberg.com), CC0 1.0; Kenney Graveyard Kit (kenney.nl), CC0 1.0
 * 15 shapes, 35 materials, 0 sprites. docs/ASSETS.md is the format; docs/ASSET-IMPORT.md how it was made.
 * "sources" records each download (its url, date, sha256 and license); an entry's src names its download, orig the file in
 * it, and fit how close it is: a shape's silhouette IoU at game scale (mean and worst view) and color dE.
 * Load it with E.addAssets(window.ASSETS['gd']): its ids become 'gd:id'. */
(window.ASSETS = window.ASSETS || {})['gd'] = { set: 'gd', format: 1, credit: 'Cut from kenney-food, kenney-mini-dungeon, kaykit-dungeon-remastered, kaykit-halloween-bits, kenney-graveyard: Kenney Food Kit (kenney.nl), CC0 1.0; Kenney Mini Dungeon (kenney.nl), CC0 1.0; KayKit Dungeon Remastered (kaylousberg.com), CC0 1.0; KayKit Halloween Bits (kaylousberg.com), CC0 1.0; Kenney Graveyard Kit (kenney.nl), CC0 1.0',
sources: {'kenney-food':{label:'Kenney Food Kit',origin:'Kenney (kenney.nl), food-kit',license:'CC0 1.0',url:'https://kenney.nl/media/pages/assets/food-kit/83086fa91c-1719418518/kenney_food-kit.zip',page:'https://kenney.nl/assets/food-kit',fetched:'2026-10-14',sha256:'cdad90853682499b94c9fda2f87678b24bfd8f3264e0ed323f6b6a27fd7c6f6f',licenseHash:'32a081c2035dd4db',dir:'food-kit',scale:2,factors:'srgb'},'kenney-mini-dungeon':{label:'Kenney Mini Dungeon',origin:'Kenney (kenney.nl), mini-dungeon',license:'CC0 1.0',url:'https://kenney.nl/media/pages/assets/mini-dungeon/6cd72dc849-1785314274/kenney_mini-dungeon.zip',page:'https://kenney.nl/assets/mini-dungeon',fetched:'2026-10-14',sha256:'19c4648680cb1d2e8836cade96cbf9781c0c1f45fbc6d2ce41cee8239a3ec4d8',licenseHash:'f8b470068a1c0438',dir:'mini-dungeon',scale:2.5,factors:'srgb'},'kaykit-dungeon-remastered':{label:'KayKit Dungeon Remastered',origin:'Kay Lousberg (kaylousberg.com), KayKit-Dungeon-Remastered-1.0',license:'CC0 1.0',url:'https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0',commit:'b0ca9bd96a8072ab36a3a5464f00ed1e06a16d07',fetched:'2026-10-14',licenseHash:'c5f17abf619731f5',dir:'KayKit-Dungeon-Remastered-1.0',scale:0.6},'kaykit-halloween-bits':{label:'KayKit Halloween Bits',origin:'Kay Lousberg (kaylousberg.com), KayKit-Halloween-Bits-1.0',license:'CC0 1.0',url:'https://github.com/KayKit-Game-Assets/KayKit-Halloween-Bits-1.0',commit:'6dc69bf6b2fa766a985754f35ec6a0324090e6c6',fetched:'2026-10-14',licenseHash:'a514c41d8d5f2a07',dir:'KayKit-Halloween-Bits-1.0',scale:1},'kenney-graveyard':{label:'Kenney Graveyard Kit',origin:'Kenney (kenney.nl), graveyard-kit',license:'CC0 1.0',url:'https://kenney.nl/media/pages/assets/graveyard-kit/ba8d4b4517-1760691807/kenney_graveyard-kit_5.0.zip',page:'https://kenney.nl/assets/graveyard-kit',fetched:'2026-10-14',sha256:'1a93613f2e5675f3310acf49ec9ef13ae7adeb756ac3b205bfb6cc9311a81062',licenseHash:'a48e274258386c6b',dir:'graveyard-kit',scale:2,factors:'srgb'}},
materials: {
oak: '#955841 none',
birch: '#da9b74 none',
'clay-b': '#bd6b4a glaze',
ice: '#c6c6db glaze',
'snow-b': '#f3f3f7 glaze',
copper: '#d67f59 none',
sandstone: '#e7ae87 none',
shrub: '#3ba478 glaze',
'shrub-c': '#57c286 foliage size=3',
'copper-e': '#ff8644 glaze',
'gold-h': '#ff9b44 none',
'ice-2': '#aab0d0 glaze',
'clay-c': '#e25d49 glaze',
clay: '#d07c57 planks bw=3',
'oak-2': '#9c5b45 planks bw=3',
'steel-d': '#8c979d metal',
'steel-c': '#97a2a7 metal',
'marble-d': '#d9cbbd noise',
'gold-g': '#f99e39 none',
'gold-c': '#fec743 metal',
straw: '#fce67e none',
'gold-h-2': '#fecf4a none',
mud: '#5c5048 planks bw=2',
'steel-b': '#928981 metal',
marble: '#bbc6cb metal',
wool: '#d53137 cloth',
steel: '#7b858a metal',
'wool-c': '#dc444a cloth',
granite: '#6f777c speck',
shingle: '#6f6056 planks bw=2',
'shingle-2': '#6b5c53 planks bw=3',
porcelain: '#efddcb noise',
'sandstone-2': '#dcb58f noise',
'copper-2': '#d6815b planks bw=3',
'shrub-2': '#42ac7c metal'},
shapes: {
'wholer-ham': {about:'roast meat leg on the bone',tags:'food meat tavern feast',mats:{a:'oak',b:'birch'},parts:[['lathe','a',[0,-5.5,6.5],[[0,0],[3.8,0],[3.4,1.6],[5.5,5.5],[6.5,13.5],[4.5,17.5],[3.1,19],[0,19]],{rot:[-90,0,0]}],['prism','b',[0,0,5.5],[[-1.7,-13.5],[-2.6,-12.5],[-1,-10.5],[-0.9,-4],[0.8,-4],[1,-10.5],[2.7,-12.5],[1.5,-13.5],[-0.1,-11]],2]],src:'kenney-food',orig:'Models/GLB format/wholer-ham.glb',fit:{iou:0.88,worst:0.86,dE:3}},
'loaf-round': {about:'round brown bread loaf, pale top',tags:'food bread bakery kitchen',mats:{a:'oak',b:'clay-b'},parts:[['prism','a',[0,0,0],[[-1,-8],[-9.5,-5],[-12.5,-0.7],[-9.5,5],[-1.4,8],[8.5,6],[12.5,0],[9.5,-5]],7],['prism','b',[0,0,7],[[-0.8,-7],[-8,-5],[-10.5,-1],[-10.5,0.5],[-8,5],[-1,7],[8,5],[11,0.5],[8,-5]],2.6]],src:'kenney-food',orig:'Models/GLB format/loaf-round.glb',fit:{iou:0.83,worst:0.79,dE:5}},
'plate-dinner': {about:'white plate with meat, greens and potatoes',tags:'food plate dining tavern',mats:{a:'ice',b:'snow-b',c:'copper',d:'oak',e:'sandstone',f:'shrub',g:'shrub-c'},parts:[['ball','b',[0,0,1.8],14.5,{sz:0.08}],['mirror','x',['box','a',[7,0,0],[2,26,1]]],['box','a',[0,-0.5,0],[8,25,1]],['box','a',[-4.5,0.5,0],[1,25,1]],['box','a',[4.5,0,0],[1,24,1]],['mirror','x',['box','a',[8.5,0,0],[1,22,1]]],['box','a',[-5.5,1,0],[1,24,1]],['box','a',[5.5,0,0],[1,22,1]],['mirror','x',['box','a',[9.5,0,0],[1,18,1]]],['mirror','x',['box','a',[11,0,0],[2,14,1]]],['box','a',[-3,12.5,0],[2,1,2]],['box','a',[2,12.5,0],[4,1,2]],['box','a',[0,-8.5,1],[2,13,1]],['mirror','x',['box','a',[1.5,-8,1],[1,12,1]]],['mirror','x',['box','a',[7,-7.5,1],[2,11,1]]],['mirror','x',['box','a',[3,-7.5,1],[2,11,1]]],['mirror','x',['box','a',[8.5,-6.5,1],[1,9,1]]],['mirror','x',['box','a',[9.5,-5.5,1],[1,7,1]]],['mirror','x',['box','a',[12.5,-5,1],[1,6,1]]],['box','a',[-4,4.5,1],[18,5,1]],['box','a',[9.5,4.5,1],[7,5,1]],['mirror','x',['box','a',[12.5,7.5,1],[1,1,1]]],['box','a',[8,8,1],[4,2,1]],['box','a',[-2,10,1],[14,2,1]],['box','a',[7.5,10,1],[3,2,1]],['box','a',[-1.5,11.5,1],[13,1,1]],['box','a',[7,12,1],[2,2,1]],['box','a',[-6,12.5,1],[4,1,1]],['box','a',[1,13.5,1],[2,1,1]],['box','a',[0.5,14.5,1],[1,1,1]],['lathe','d',[-3.8,-5,2.3],[[0,0],[3.6,0],[4,1.3],[3.4,3.6],[0,3.6]]],['prism','e',[0,0,2.3],[[8.5,-1.4],[0.5,0.8],[-3.8,8.5],[0.3,9.5],[5,8.5],[8.5,5],[9.5,0],[9.5,-1.4]],1.9],['lathe','d',[3.8,-5,2.3],[[0,0],[2.8,0],[3,1],[2.3,3.1],[1.7,3.6],[0,3.6]]],['prism','f',[0,0,2.3],[[-9,1],[-8,5],[-5.5,7.5],[-1.6,1]],1.3],['cyl','c',[-3.8,-5,6],3.3,1.1,{r2:2.2}],['box','g',[-6,3.5,3.5],[1,2,0.5]],['box','g',[-5,3.8,3.5],[0.5,1.5,0.5]],['box','g',[-6.5,3.8,3.5],[0.5,0.5,0.5]],['box','g',[-4.5,3.8,3.5],[0.5,0.5,0.5]],['box','g',[2.5,3.5,4.5],[1,1,0.5]]],src:'kenney-food',orig:'Models/GLB format/plate-dinner.glb',fit:{iou:0.87,worst:0.85,dE:4}},
'bowl-soup': {about:'white bowl of cream soup, orange vegetable bits',tags:'food bowl kitchen tavern',mats:{a:'snow-b',b:'ice',c:'copper',e:'copper-e',g:'gold-h'},parts:[['cyl','c',[0,0,2.5],8.5,2.2,{r2:9.5}],['prism','a',[0,0,4.5],[[-0.3,-9.5],[-8,-5],[-8,5],[0.1,9.5],[8,5],[8,-5]],2.1],['cyl','b',[0,0,0],5.5,2.5,{r2:8}],['box','e',[2.2,2.6,6.5],[1.5,2.2,0.7]],['box','e',[-3,1.1,6.5],[1.5,2.2,0.7]],['prism','e',[0,-3,0],[[-1.4,5.5],[-0.8,7],[0.5,7],[1.2,6]],0.6,{axis:'y'}],['box','g',[2.5,2,6.5],[1,1,0.5]],['box','g',[0,-3,6.5],[2,1,0.5]],['box','g',[-2.2,1.5,6.5],[0.5,1,0.5]]],src:'kenney-food',orig:'Models/GLB format/bowl-soup.glb',fit:{iou:0.92,worst:0.89,dE:2}},
potion: {about:'round red potion flask, pale glass neck, cork',tags:'item potion dungeon',mats:{a:'ice-2',b:'clay-c',c:'clay'},parts:[['lathe','b',[0,0,0],[[0,0],[5,0],[6.5,2.1],[6,6],[0,6]]],['cyl','a',[0,0,6],6,3.4,{r2:3.5}],['lathe','c',[0,0,12],[[0,0],[2.8,0],[3.5,3.3],[2.9,4.5],[0,4.5]]],['cyl','a',[0,0,9.5],4.5,2.4],['box','a',[-0.2,-0.2,0],[1.5,9.5,0.5]],['mirror','x',['box','a',[3.3,0,0],[0.5,7,0.5]]],['box','a',[4.5,0,0],[0.5,4,0.5]],['box','a',[5,0,0],[0.5,1,0.5]],['box','a',[0.3,5,0],[1.5,0.5,0.5]]],src:'kenney-mini-dungeon',orig:'Models/GLB format/potion.glb',fit:{iou:0.93,worst:0.9,dE:5}},
keg: {about:'oak barrel lying on its side on a wooden cradle',tags:'container barrel tavern cellar',mats:{a:'oak-2',b:'steel-d'},parts:[['lathe','a',[0,-9.5,11],[[0,0],[6.5,0],[8,3.7],[8.5,9],[8,15],[6,19],[0,19]],{rot:[-90,0,0]}],['lathe','b',[0,-6,11],[[0,0],[8.5,0],[9,1.9],[8.5,2.9],[0,2.9],[0,8.5],[8.5,8.5],[9,9],[8.5,11.5],[0,11.5]],{rot:[-90,0,0]}],['mirror','y',['box','a',[0,3.5,0],[16,3,2]]],['mirror','y',['box','a',[0,3.5,2],[14,3,1]]],['mirror','x',['box','a',[5.5,-3.5,3],[5,3,1]]],['mirror','x',['box','a',[6.5,-3.5,4],[3,3,1]]],['mirror','x',['box','a',[5.5,3.5,3],[5,3,1]]],['mirror','x',['box','a',[6.5,3.5,4],[3,3,1]]],['mirror','x',['box','a',[5,-0.2,1.5],[1,6,1]]]],src:'kaykit-dungeon-remastered',orig:'addons/kaykit_dungeon_remastered/Assets/gltf/keg.gltf.glb',fit:{iou:0.91,worst:0.9,dE:4}},
'barrel-small-stack': {about:'small oak barrels stacked on their sides, grey hoops',tags:'container barrel dungeon tavern cellar',mats:{a:'oak-2',b:'steel-c'},parts:[['lathe','a',[4.5,-1.9,4.5],[[0,0],[4.5,0],[4.5,3.9],[0,3.9],[0,5],[3.9,5],[3.3,6.5],[0,6.5]],{rot:[-90,0,0]}],['lathe','a',[-4.5,-1.9,4.5],[[0,0],[4.5,0],[4.5,3.9],[0,3.9],[0,5],[3.9,5],[3.3,6.5],[0,6.5]],{rot:[-90,0,0]}],['lathe','a',[0,-1.9,12.5],[[0,0],[4.5,0],[4.5,3.9],[0,3.9],[0,5],[3.9,5],[3.3,6.5],[0,6.5]],{rot:[-90,0,0]}],['mirror','x',['box','b',[4.5,-2.5,0],[7,3,9]]],['mirror','x',['box','b',[8.5,-2.5,1],[1,3,7]]],['mirror','y',['box','b',[0,2.5,1],[2,3,7]]],['mirror','x',['box','b',[4.5,2.5,0],[7,3,9]]],['mirror','x',['box','b',[8.5,2.5,1],[1,3,7]]],['lathe','b',[0,-3.4,12.5],[[0,0],[4.5,0],[5,1],[4.5,1.7],[0,1.7],[0,5],[4.5,5],[5,5.5],[4.5,6.5],[0,6.5]],{rot:[-90,0,0]}],['lathe','a',[-4.5,-5,4.5],[[0,0],[3.3,0],[3.9,1.2],[3.9,1.4],[0,1.4]],{rot:[-90,0,0]}],['lathe','a',[4.5,-5,4.5],[[0,0],[3.3,0],[3.9,1.2],[3.9,1.4],[0,1.4]],{rot:[-90,0,0]}],['lathe','a',[0,-5,12.5],[[0,0],[3.3,0],[3.9,1.2],[3.9,1.4],[0,1.4]],{rot:[-90,0,0]}],['box','a',[0.3,4,12.5],[2.1,1.4,2.1]],['box','a',[3.1,4,4],[2.1,1.4,1.4]],['box','a',[3.1,4.5,5.5],[0.7,0.7,0.7]]],src:'kaykit-dungeon-remastered',orig:'addons/kaykit_dungeon_remastered/Assets/gltf/barrel_small_stack.gltf.glb',fit:{iou:0.84,worst:0.82,dE:4}},
'candle-lit': {about:'white wax candle with a small orange flame',tags:'light candle dungeon tavern',mats:{a:'marble-d',b:'gold-g',c:'gold-c',f:'straw',g:'gold-h-2'},parts:[['lathe','a',[0,0,0],[[0,0],[1.7,0],[1.7,7.5],[1.4,7.5],[0,7.5]]],['box','c',[0,0,8],[1.6,1.6,0.8]],['box','c',[0,-0.4,8.5],[1.6,0.8,0.8]],['box','b',[0,0,8],[1,2,0.5]],['mirror','x',['box','b',[0.8,0.3,8],[0.5,1.5,1]]],['box','b',[0,0.3,8.5],[1,1.5,0.5]],['box','b',[0,0,9],[1,1,0.5]],['box','f',[0,0,7.5],[1.2,1.2,0.6]],['box','f',[0,-0.6,8],[1.2,1.2,0.6]],['box','g',[0,-0.7,7.5],[1,0.5,1]],['box','g',[-0.5,-0.2,7.5],[1,0.5,1]]],src:'kaykit-dungeon-remastered',orig:'addons/kaykit_dungeon_remastered/Assets/gltf/candle_lit.gltf.glb',fit:{iou:0.91,worst:0.89,dE:5}},
'candle-triple': {about:'three white wax candles fused in a cluster, unlit',tags:'light candle dungeon tavern',mats:{a:'marble-d',b:'mud'},parts:[['prism','a',[0,0,0],[[-1.4,-1.9],[-2.3,-1.1],[-2.4,0.1],[-1.9,1],[-0.9,1.3],[0.3,1],[0.8,0.1],[0.7,-1.1],[-0.1,-1.9]],6.5],['cyl','a',[1.5,-0.8,0],1,7.5],['lathe','a',[1.1,1,0],[[0,0],[1,0],[1,5],[0.8,5.5],[0,5.5]]],['lathe','b',[1.5,-0.8,7],[[0,0],[0.3,1.5],[0.3,1.6],[0,1.6]]],['lathe','b',[1.1,0.9,4.5],[[0,0],[0.3,1.5],[0.3,1.6],[0,1.6]]],['box','b',[-0.7,-0.2,5],[0.5,0.5,2]],['box','b',[-0.7,-0.7,5.5],[0.5,0.5,1.5]],['box','b',[-1.2,-0.5,6],[0.5,1,1]]],src:'kaykit-dungeon-remastered',orig:'addons/kaykit_dungeon_remastered/Assets/gltf/candle_triple.gltf.glb',fit:{iou:0.9,worst:0.81,dE:5}},
'floor-tile-big-spikes': {about:'square floor plate bristling with tall steel spikes',tags:'trap spikes dungeon',mats:{a:'steel-b',b:'marble'},parts:[['prism','a',[0,0,0],[[-19,0],[-19,1.5],[19,1.5],[19,0]],38.5,{axis:'x'}],['mirror','x',['cyl','b',[9.5,0,1],1,19]],['cyl','b',[0,0,1],1,19],['mirror','x',['cyl','b',[9.5,-9.5,1],1,19]],['mirror','y',['cyl','b',[0,9.5,1],1,19]],['mirror','x',['cyl','b',[9.5,9.5,1],1,19]],['mirror','x',['cyl','a',[9.5,-9.5,1.2],2.6,0.8,{r2:2}]],['cyl','a',[9.5,9.5,1.2],2.6,0.8,{r2:2}],['cyl','a',[0,0,1.2],2.6,0.8,{r2:2}],['mirror','y',['cyl','a',[0,9.5,1.2],2.6,0.8,{r2:2}]],['cyl','a',[9.5,0,1.2],2.6,0.8,{r2:2}]],src:'kaykit-dungeon-remastered',orig:'addons/kaykit_dungeon_remastered/Assets/gltf/floor_tile_big_spikes.glb',fit:{iou:0.94,worst:0.81,dE:2}},
'banner-red': {about:'plain red cloth wall banner hanging from iron hooks',tags:'decoration banner castle dungeon',mats:{a:'wool',b:'steel',c:'wool-c'},parts:[['box','a',[-3.3,-1.3,0],[8.5,0.8,3.3]],['box','a',[4.5,-1.3,0],[6,0.8,3.3]],['box','a',[1.3,-1.3,0.8],[0.8,0.8,2.5]],['box','a',[0,-0.4,2.5],[15,0.8,3.3]],['box','a',[0,-1.3,5],[15,0.8,22.5]],['box','a',[0,-0.4,26.5],[15,0.8,4]],['box','b',[-3.8,0.5,28.5],[1.9,2.8,1.9]],['box','b',[-5,0.9,28.5],[0.9,1.9,1.9]],['box','b',[-3.3,-1.4,29.5],[0.9,0.9,0.9]],['box','b',[3.6,0,28.5],[1.8,3.6,0.9]],['box','b',[5,0.9,28.5],[0.9,1.8,1.8]],['box','b',[3.6,0.4,29.5],[1.8,2.7,0.9]],['box','c',[1.5,-1.5,0],[3,0.6,0.6]],['box','c',[1.8,-1.5,0.6],[2.4,0.6,0.6]],['box','c',[2.1,-1.2,1.2],[1.8,1.2,0.6]],['box','c',[3.3,-0.9,1.2],[0.6,0.6,2.4]],['box','c',[2.4,-0.9,1.8],[1.2,0.6,0.6]],['box','c',[3.9,-0.9,2.4],[0.6,0.6,1.8]],['box','c',[4.5,-0.9,3.6],[0.6,0.6,3]],['box','c',[5.5,-0.6,4],[1.2,1.2,0.6]],['box','c',[5.5,-0.9,4.5],[1.2,0.6,1.8]],['mirror','x',['box','c',[5,-1.5,6],[1.8,0.6,1.8]]],['box','c',[-5,-0.6,4],[1.8,1.2,0.6]],['box','c',[-5,-0.9,4.5],[1.8,0.6,1.8]]],src:'kaykit-dungeon-remastered',orig:'addons/kaykit_dungeon_remastered/Assets/gltf/banner_red.gltf.glb',fit:{iou:0.86,worst:0.68,dE:5}},
'banner-shield-red': {about:'red cloth wall banner with a grey steel shield crest',tags:'decoration banner castle dungeon',mats:{a:'steel-c',b:'wool',c:'granite',e:'shingle',f:'wool-c'},parts:[['box','a',[0,0.5,7],[2,3,15]],['mirror','x',['box','a',[2,0.5,8],[2,3,13]]],['mirror','x',['box','a',[3.5,0,9],[1,2,11]]],['mirror','x',['box','a',[4.5,0,10],[1,2,10]]],['mirror','x',['box','a',[5.5,0,12],[1,2,8]]],['mirror','x',['box','a',[5,-1.5,13],[2,1,7]]],['mirror','x',['box','a',[1.5,0.5,21],[1,3,1]]],['box','b',[-3.3,-1.3,0],[8.5,0.8,2.5]],['box','b',[4.5,-1.3,0],[6,0.8,2.5]],['box','b',[1.3,-0.8,0.8],[0.8,1.7,1.7]],['box','b',[-3.3,-0.4,0.8],[8.5,0.8,6]],['box','b',[4.5,-0.4,0.8],[6,0.8,6]],['box','b',[1.3,-0.4,2.5],[0.8,0.8,4]],['box','b',[0,-1.3,6],[15,0.8,21]],['box','b',[0,-0.4,26],[15,0.8,2.5]],['box','b',[0,0.4,27.5],[15,0.8,3.3]],['mirror','x',['box','a',[5,-1.1,8],[2.3,1.1,2.8]]],['mirror','x',['box','a',[6.5,-0.9,8],[0.6,0.6,1.7]]],['mirror','x',['box','a',[5,-1.1,11],[1.7,1.1,0.6]]],['box','c',[0,0.5,7],[4,3,3]],['mirror','x',['box','a',[8.5,-1.5,15],[1,1,4]]],['mirror','x',['box','a',[7.5,-1,16],[1,2,5]]],['mirror','x',['box','a',[8.5,-0.5,16],[1,1,3]]],['mirror','x',['box','a',[6.5,-1,17],[1,2,4]]],['mirror','x',['box','a',[5.5,-1,18],[1,2,4]]],['mirror','x',['box','a',[4.5,-1,19],[1,2,3]]],['mirror','x',['box','a',[3.5,-1,20],[1,2,2]]],['prism','e',[0,-1,0],[[7,19.5],[6.5,20],[7,21],[9,22.5],[9.5,21.5],[8,20]],0.8,{axis:'y'}],['prism','e',[0,-1,0],[[-7,19.5],[-8,20],[-9.5,21.5],[-9.5,21.5],[-9,22.5],[-7,21],[-6.5,20]],0.8,{axis:'y'}],['box','a',[-10,-0.9,20.5],[1.8,1.8,2.7]],['box','a',[-8.5,-0.9,21.5],[0.9,1.8,1.8]],['ball','a',[10,-1,22],0.8,{sz:1.07}],['box','a',[-3.8,0.5,28.5],[1.9,2.8,1.9]],['box','a',[-5,1.4,28.5],[0.9,0.9,1.9]],['box','a',[-3.3,-1.4,29.5],[0.9,0.9,0.9]],['box','a',[3.6,0,28.5],[1.8,3.6,0.9]],['box','a',[5,0.9,28.5],[0.9,1.8,1.8]],['box','a',[3.6,0.4,29.5],[1.8,2.7,0.9]],['box','f',[1.5,-0.9,0],[3,0.6,0.6]],['box','f',[3,-0.6,2.4],[1.2,1.2,0.6]]],src:'kaykit-dungeon-remastered',orig:'addons/kaykit_dungeon_remastered/Assets/gltf/banner_shield_red.gltf.glb',fit:{iou:0.83,worst:0.69,dE:7}},
'coffin-decorated': {about:'dark wooden coffin, skull and bones on the lid',tags:'container coffin graveyard crypt',mats:{a:'shingle-2',b:'porcelain',c:'sandstone-2'},parts:[['prism','a',[0,0,0],[[-9.5,-24],[-16,-9.5],[-10,24.5],[10,24.5],[16.5,-8.5],[10,-24]],12],['lathe','b',[0.3,-12,0.9],[[0,0],[7,0],[9,3.4],[9,7],[8,9],[5.5,12.5],[3.4,13.5],[0,13.5]]],['box','c',[-3,7.5,1],[2,3,12]],['box','c',[-1.5,8,1],[1,2,12]],['box','c',[-3.5,9.5,2],[1,1,11]],['box','c',[1.5,6,12],[3,2,1]],['box','b',[-1.5,6.5,1],[3,3,12]],['prism','b',[0,0,2.1],[[2.4,1.8],[-4.5,4.5],[-7.5,7],[-7.5,8.5],[-6,9],[-3,5.5],[-1.4,4.5],[4,3.6],[4,2.2]],10],['box','b',[-1.5,5,11],[3,4,2]],['box','c',[-0.4,7,11],[2.5,2.5,2.5]],['box','c',[-0.4,5.5,11.5],[0.9,2.6,1.7]],['box','c',[-1.7,6,11.5],[1.7,1.7,1.7]],['box','b',[-0.8,6.5,11],[1.7,1.7,2.5]],['box','b',[-0.8,5.5,11.5],[1.7,0.8,1.7]],['box','b',[-2.1,6.5,11.5],[0.8,1.7,1.7]],['box','b',[-1.2,8.5,11.5],[0.8,1.7,0.8]],['box','b',[-1.2,8,12.5],[0.8,0.8,0.8]]],src:'kaykit-halloween-bits',orig:'addons/kaykit_halloween_bits/Assets/gltf/coffin_decorated.gltf',fit:{iou:0.94,worst:0.93,dE:3}},
'coffin-old': {about:'plain low tapered six-sided wooden coffin',tags:'container graveyard crypt',mats:{a:'copper-2'},parts:[['prism','a',[0,0,0],[[-3.6,-13.5],[-9,-6.5],[-9,-2.2],[-4.5,12.5],[3.5,14],[9.5,-5],[4.5,-13]],6.5]],src:'kenney-graveyard',orig:'Models/GLB format/coffin-old.glb',fit:{iou:0.96,worst:0.95,dE:4}},
'fire-basket': {about:'low green iron fire basket on curled legs',tags:'light graveyard camp',mats:{a:'shrub-2'},parts:[['cyl','a',[0,0,1.8],6,1.2],['box','a',[0,0,0],[4,4,5]],['box','a',[2.5,0.5,3],[1,5,1]],['box','a',[0,2.5,3],[4,1,1]],['prism','a',[0,0,0],[[-3.5,0.3],[-6,2.8],[-6.5,5],[-5,5.5],[-4.5,3.8],[-2.9,2.1],[-1.6,2.5],[-1.1,0.8]],2.4,{axis:'x'}],['box','a',[0,3,0],[4,4,3]],['box','a',[0,5.5,1],[4,1,5]],['box','a',[0,6.5,2],[4,1,4]],['box','a',[0,4,3],[4,2,1]],['box','a',[0,4.5,4],[4,1,1]],['prism','a',[0,0,0],[[-3.5,0.3],[-6,2.8],[-6.5,5],[-5,5.5],[-4.5,3.8],[-2.9,2.1],[-1.6,2.5],[-1.1,0.8]],2.4,{axis:'y'}],['box','a',[3,0,0],[4,4,3]],['box','a',[5.5,0,1],[1,4,5]],['box','a',[6.5,0,2],[1,4,4]],['box','a',[4,0,3],[2,4,1]],['box','a',[4.5,0,4],[1,4,1]]],src:'kenney-graveyard',orig:'Models/GLB format/fire-basket.glb',fit:{iou:0.8,worst:0.77,dE:6}}},
sprites: {
}};

// ---- 00-core.js ----
// GAUNTLETDOWN. Core loop: descend floor by floor through a starving dungeon, blasting hordes and the generators that
// breed them, grabbing keys, food and treasure before your ever-draining life force runs out: together, and racing each
// other for score. Built on my-3D2dge v0.85.2 (patched: ENGINE-CHANGES.md). The source fragments in game/src are joined
// in name order into this one IIFE by build.mjs.
const E = My3D2dge, { px, clamp, lerp, TAU } = E;
const T = 16;                                             // one tile
const VERSION = '1.0';
const HUB = typeof window !== 'undefined' ? window.AIHub : undefined;
const SESSION = !!(HUB && HUB.active);                    // known on the first line: an AI Hub round
const HEADLESS = typeof document === 'undefined' || !document.getElementById || !document.getElementById('screen');

/* ---- input: the keys PC players expect for a twin-stick dungeon crawler; a DualSense's standard mapping first ---- */
const MENU = { start: E.Input.DEFAULT.start, pause: E.Input.DEFAULT.pause, confirm: E.Input.DEFAULT.confirm, cancel: E.Input.DEFAULT.cancel };
const GD_INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire: ['Mouse0', 'Space', 'KeyJ', 'Pad7', 'Pad0'],      // prompts show R2 first on a pad, Left click on a mouse
  magic: ['Mouse2', 'KeyQ', 'KeyK', 'Pad3', 'Pad5'],      // △ first
  plant: ['ShiftLeft', 'ShiftRight', 'Pad6'],             // L2: stand and shoot
  view: ['KeyV'],
  ...MENU
};

/* ---- registries: content is data; the core never changes to add a floor, a monster or an item ---- */
const REG = {};
/** def(kind, id, spec): register a part (floors, heroes, monsters, items, specials, amulets, gens, lines) */
function def(kind, id, spec) { (REG[kind] || (REG[kind] = {}))[id] = Object.assign({ id }, spec); return REG[kind][id]; }
function get(kind, id) { return (REG[kind] || {})[id]; }
function all(kind) { return Object.values(REG[kind] || {}); }

/* ---- the event bus: HUD, narrator, audio, effects and the network listen to what the sim says ---- */
const bus = {
  _h: {},
  on(name, fn) { (this._h[name] || (this._h[name] = [])).push(fn); return () => { const a = this._h[name]; a.splice(a.indexOf(fn), 1); }; },
  emit(name, data) { const a = this._h[name]; if (a) for (const fn of a.slice()) { try { fn(data); } catch (e) { game.fail('event ' + name, e); } } }
};

/* ---- random streams: gameplay draws from rng.sim (seeded per floor), cosmetics from Math.random ---- */
const rng = { sim: E.rng(1), seed(s) { this.sim = E.rng(s >>> 0); }, r() { return this.sim(); }, range(a, b) { return a + (b - a) * this.sim(); }, int(a, b) { return a + Math.floor((b - a + 1) * this.sim()); }, pick(l) { return l[Math.floor(this.sim() * l.length)]; } };

/* ---- small helpers ---- */
const hyp = Math.hypot, dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2, near = (a, b, d) => dist2(a, b) <= d * d;
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const cellOf = v => Math.floor(v / T), mid = c => (c + .5) * T;
const fmt = n => n > 9999 ? '9999+' : String(Math.max(0, Math.ceil(n)));
const sum = (l, f) => l.reduce((s, x) => s + f(x), 0);
const shuffle = (l, R = Math.random) => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
const touchOnly = () => typeof window !== 'undefined' && !!window.matchMedia && !matchMedia('(any-pointer: fine)').matches && (navigator.maxTouchPoints || 0) > 0;

/* ---- the game ---- */
const gameOpts = {
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: GD_INPUT, id: 'gauntletdown', bg: '#07050c',
  menu: {
    items: () => typeof pauseItems === 'function' ? pauseItems() : [],
    settings: typeof gameSettings === 'function' ? gameSettings() : [],
    controls: { fire: 'Fire (hold)', magic: 'Magic', plant: 'Plant (hold)', view: 'Camera view' },
    quit: 'title'
  }
};
if (SESSION) Object.assign(gameOpts, { corner: false, autoPause: false, backGesture: false, fullscreen: 'button' });
const game = new E.Game(gameOpts);
const P = game.particles, L = game.lights, A = game.audio;
game.allowJoin(false);
/** W: the world of the floor in play (21-sim.js builds it), or null */
let W = null;
/** the party: the heroes that carry over from floor to floor (score, specials, keys, flasks, health) */
let PARTY = [];
/** the run: { descent (1 or 2), floorIndex, firsts, dev (a cheat was used: no high scores), ended } */
let RUN = null;
/** the player's zoom in play: the wheel, - and =, Settings */
const CAM = { zoom: [.55, 1.4], start: .7, tall: 1 };
/** the scenes, filled by the scene files */
const scenes = {};
/** a value from settings with a fallback (settings exist before scenes do) */
const S = k => game.settings[k];

// ---- 01-tune.js ----
/* ---- TUNE: every balance number in one table. Each is a Dev Tools slider (live, saved), with Reset to defaults ---- */
const TUNE_SPEC = [
  ['drain', 'Life force drain (per s)', 1, 0, 5, .1],
  ['startHealth', 'Starting health', 700, 100, 2000, 25],
  ['foodHeal', 'Roast and cider heal', 100, 25, 300, 5],
  ['heroSpeed', 'Hero speed ×', 1, .5, 2, .05],
  ['shotRate', 'Shot rate ×', 1, .5, 3, .05],
  ['shotDamage', 'Shot damage ×', 1, .5, 3, .05],
  ['magicPower', 'Magic power ×', 1, .25, 3, .05],
  ['monsterSpeed', 'Monster speed ×', 1, .25, 3, .05],
  ['monsterDamage', 'Monster damage ×', 1, 0, 3, .05],
  ['spawnInterval', 'Spawn interval ×', 1, .25, 4, .05],
  ['generatorHp', 'Generator health ×', 1, .25, 4, .05],
  ['maxMonsters', 'Monsters alive at once', 140, 20, 300, 5],
  ['impatience', 'Doors open after (s)', 180, 30, 600, 5],
  ['titheAt', 'The Tithe arrives after (s)', 120, 30, 600, 5],
  ['hoardTime', 'Treasure room seconds', 30, 10, 90, 1],
  ['stairHold', 'Seconds on the stairs', 1, 0, 3, .1]
];
const TUNE = {};
const TUNE_DEFAULTS = {};
for (const [k, , v] of TUNE_SPEC) { TUNE[k] = v; TUNE_DEFAULTS[k] = v; }
for (const [key, label, value, min, max, step] of TUNE_SPEC)
  game.settings.define({ key: 'tune_' + key, group: 'Dev tuning', label, type: 'slider', value, min, max, step, unit: '', apply: (g, v) => { TUNE[key] = v; } });
const resetTuning = () => game.settings.reset('Dev tuning');

/* ---- cheats: toggles, reset on every load; any cheat on shows a DEV badge and keeps the run off the tables ---- */
const CHEATS = {};
const CHEAT_SPEC = [['god', 'God mode (no damage, no drain)'], ['noclip', 'Noclip (walk through walls)'], ['infinite', 'Infinite keys and flasks'], ['freeze', 'Freeze monsters'],
  ['onehit', 'One-hit kills'], ['nogen', 'Generators off'], ['hitboxes', 'Show hitboxes'], ['flowfield', 'Show flow field'], ['netstats', 'Show net stats'], ['botthoughts', 'Show bot thoughts']];
for (const [key, label] of CHEAT_SPEC) game.settings.define({ key: 'cheat_' + key, group: 'Dev cheats', label, type: 'toggle', value: false, apply: (g, v) => { CHEATS[key] = !!v; if (v && RUN && cheating()) RUN.dev = true; } });
game.settings.define({ key: 'cheat_timescale', group: 'Dev cheats', label: 'Time scale', type: 'select', value: '1', options: [['0.25', '¼×'], ['0.5', '½×'], ['1', '1×'], ['2', '2×']], apply: (g, v) => { g.timeScale = +v; } });
game.settings.reset('Dev cheats');
/** a cheat that changes the game (the view-only overlays don't count) is on: a DEV badge, no high scores */
const cheating = () => ['god', 'noclip', 'infinite', 'freeze', 'onehit', 'nogen'].some(k => CHEATS[k]) || game.timeScale !== 1 || !!(W && W.devUsed);

/* ---- difficulty and the number of heroes ---- */
const DIFF = { easy: { drain: .5, dmg: .7, hp: 1.3 }, normal: { drain: 1, dmg: 1, hp: 1 }, hard: { drain: 1.5, dmg: 1.3, hp: .85 } };
const diff = () => DIFF[game.settings.difficulty] || DIFF.normal;
/** the starting (and rising) health with difficulty */
const startHealth = () => Math.round(TUNE.startHealth * diff().hp);
/** how many heroes play: spawn faster, a bigger cap, a tougher King */
const scaleSpawn = n => 1 + .25 * (n - 1);
const scaleCap = n => Math.min(300, Math.round(TUNE.maxMonsters * (1 + .3 * (n - 1))));

/** the game's own settings (the Game group of the Settings screen); literals only: it runs before the other files */
function gameSettings() {
  return [
    { key: 'camView', label: 'Camera view', options: [['threequarter', 'Three-quarter'], ['topdown', 'Top-down'], ['iso', 'Isometric']], value: 'threequarter', help: 'V changes it in play', apply: (g, v) => { if (g.scene && g.scene.views) g.setView(v); } },
    { key: 'difficulty', label: 'Difficulty', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], value: 'normal', help: 'Easy: slower drain, softer bites, more health' },
    { key: 'aimAssist', label: 'Aim assist', options: [['off', 'Off'], ['low', 'Low'], ['high', 'High']], value: 'low', help: 'Shots bend toward the nearest monster or generator' },
    { key: 'stickFires', label: 'Right stick fires', value: true, help: 'Pushing the right stick past halfway fires as well as aims' },
    { key: 'allyStun', label: 'Ally stun', value: true, help: 'From floor 6, your shots stun a friend they touch' },
    { key: 'captions', label: 'Narrator captions', value: true },
    { key: 'tips', label: 'Tips', value: true, help: 'The Gaunt teaches each thing once' },
    { key: 'names', label: 'Player names', value: true, help: 'A name over each hero' },
    { key: 'hudSize', label: 'HUD size', options: [['normal', 'Normal'], ['large', 'Large']], value: 'large', help: 'Large reads from across the room' },
    { key: 'gpuLight', label: 'Enhanced lighting', options: [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']], value: 'auto', help: 'Shadows and colored light where the browser has WebGPU (Auto: on a computer)' }
  ];
}

// ---- 05-text.js ----
/* ---- every word the player reads: the Gaunt's lines, the story, the cards. {CLASS} is the hero's class ---- */
const LINES = {
  start: 'THE GAUNTLET IS DOWN. COME AND GET IT.',
  fading: '{CLASS}, YOUR LIFE FORCE IS FADING.',
  starving: '{CLASS} IS STARVING!',
  dying: '{CLASS} IS ABOUT TO PERISH!',
  eaten: '{CLASS} HAS BEEN EATEN.',
  rise: '{CLASS} RISES AGAIN. HOW TIRESOME.',
  tip_food: 'LIFE FORCE DRAINS WITH EVERY BREATH. EAT.',
  tip_dontshoot: 'NEVER SHOOT THE SUPPER.',
  shot_cider: '{CLASS} SHOT THE CIDER!',
  shot_feast: '{CLASS} SHOT THE SUPPER!',
  ate_stew: '{CLASS} ATE THE STEW. A POOR CHOICE.',
  shot_stew: '{CLASS} SPILLED THE STEW. GOOD.',
  glutton: '{CLASS} EATS FOR FOUR.',
  tip_stairs: 'THE STAIRS GO DOWN. THEY ALWAYS GO DOWN.',
  tip_ghost: 'HUNGERGHOSTS. THEY HAVE NOT EATEN IN NINE CENTURIES.',
  tip_generator: 'THAT {THING} BREEDS THEM. BREAK IT.',
  tip_gnasher: 'GNASHERS. ALL TEETH, NO MANNERS.',
  tip_melee: 'TOO CLOSE TO THROW? THEN HIT IT.',
  tip_lobber: 'POT-LOBBERS THROW OVER WALLS. WATCH THE SHADOWS.',
  tip_imp: 'CINDER IMPS. THEY COOK WHAT THEY SPIT ON.',
  tip_fryar: 'THE FRYARS FADE. STRIKE WHEN THEY SHOW THEMSELVES.',
  tip_snatcher: 'A SNATCHER! MIND YOUR POCKETS.',
  stolen: '{CLASS} HAS BEEN ROBBED!',
  recovered: '{CLASS} TOOK IT BACK.',
  tithe_comes: 'THE TITHE HAS COME TO COLLECT.',
  tithe_paid: 'THE TITHE IS PAID.',
  tithe_slain: '{CLASS} CHEATED THE TITHE!',
  bell: '{CLASS} IS ON THE MENU!',
  bell_pass: 'NOW {CLASS} IS ON THE MENU.',
  tip_magic: 'MAGIC STRIKES ALL YOU CAN SEE. USE IT WISELY.',
  shot_flask: '{CLASS} SHOT THE MAGIC. MOSTLY WASTED.',
  key_first: 'A KEY. HOW THOUGHTFUL.',
  tip_door: 'A KEY OPENS A DOOR. ANY DOOR. ONCE.',
  treasure_first: 'TREASURE! THE GAUNT KEEPS COUNT.',
  special_ironbrew: 'IRON BREW. {CLASS} FEELS STURDIER.',
  special_ogreale: 'OGRE ALE. {CLASS} HITS HARDER.',
  special_quickshot: 'QUICKSHOT TONIC. {CLASS} THROWS FASTER.',
  special_hardshot: 'HARDSHOT DRAUGHT. {CLASS} THROWS HARDER.',
  special_witchwater: 'WITCHWATER. {CLASS} CRACKLES WITH MAGIC.',
  special_featherfoot: 'FEATHERFOOT CORDIAL. {CLASS} STEPS LIGHTER.',
  special_deeppockets: 'DEEP POCKETS. {CLASS} CARRIES MORE.',
  amulet_veil: 'THE VEIL. NOW YOU SEE {CLASS}. NOW YOU DON\'T.',
  amulet_ironskin: 'IRONSKIN. NOTHING BITES {CLASS}. FOR NOW.',
  amulet_stench: 'STENCH. EVEN GHOSTS GAG.',
  amulet_ricochet: 'RICOCHET. MIND YOUR HEADS.',
  amulet_rending: 'RENDING. NOTHING STOPS THOSE SHOTS.',
  tip_trap: 'THAT PLATE WAS A TRAP. ENJOY.',
  tip_tele: 'STEP ON THE RUNE. ARRIVE ELSEWHERE.',
  tip_stun: 'STUN RUNES. DO NOT DAWDLE ON THEM.',
  tip_field: 'THE FIELD HUMS. WAIT FOR THE QUIET.',
  tip_spikes: 'THE FLOOR HAS TEETH TOO.',
  tip_secret: 'THAT WALL WAS LYING.',
  tip_cracked: 'CRACKED STONE. IT WILL NOT HOLD.',
  tip_chest: 'A LOCKED CHEST. KEYS OPEN MORE THAN DOORS.',
  ally_stun_on: 'FROM HERE ON, YOUR SHOTS STUN YOUR FRIENDS.',
  ally_shot: '{CLASS}, THAT WAS A FRIEND.',
  impatient: 'THE GAUNT GROWS IMPATIENT.',
  doors_open: 'ALL DOORS ARE NOW OPEN.',
  walls_stairs: 'EVERY WALL IS NOW A STAIR.',
  stairs: '{CLASS} FOUND THE STAIRS.',
  skip: '{CLASS} TOOK THE SHORT WAY DOWN.',
  hoard: 'A HOARD! THIRTY SECONDS. GRAB.',
  hoard_shut: 'THE HOARD SLAMS SHUT.',
  hoard_clear: '{CLASS} EMPTIED THE HOARD!',
  king_near: 'THE KING SMELLS YOU.',
  king_intro: 'KING FAMISH WILL SEE YOU NOW.',
  king_eating: 'HE IS EATING. SHOOT THE FOOD!',
  king_dead: 'THE GAUNTLET IS DOWN. SO IS THE KING.',
  gauntlet: '{CLASS} HOLDS THE IRON GAUNTLET!',
  game_over: 'THE GAUNT IS FED.',
  continue: 'RISE, OR BE SUPPER.',
  high_score: 'NAME THYSELF, MORSEL.',
  joined: '{CLASS} JOINS THE FEAST.',
  floor_1: 'WELCOME TO THE GAUNT, MORSELS.', floor_2: 'MIND THE ROOTS. THEY BITE.', floor_3: 'SMOKED, SALTED, SERVED.',
  floor_4: 'THE BONES HERE ARE WELL PICKED.', floor_5: 'THE CHOIR SINGS WITH ITS TEETH.', floor_6: 'HERE LIE KINGS, IN BRINE.',
  floor_7: 'THE OVEN IS ALWAYS ON.', floor_8: 'THE GATE OF GRISTLE. NO ONE CHEWS THROUGH.', floor_9: 'DINNER IS SERVED.',
  floor_t1: 'A HOARD! THIRTY SECONDS. GRAB.', floor_t2: 'THE RELICS OF THE WELL-FED. TAKE THEM.',
  welcome_berserker: 'WELCOME, BERSERKER.', welcome_shieldmaiden: 'WELCOME, SHIELDMAIDEN.', welcome_ranger: 'WELCOME, RANGER.', welcome_hexer: 'WELCOME, HEXER.'
};
/** a line with the hero's class put in */
const line = (key, cls, vars) => (LINES[key] || key).replace(/\{CLASS\}/g, cls ? cls.toUpperCase() : 'MORSEL').replace(/\{THING\}/g, vars && vars.thing ? vars.thing : 'IT');

const STORY = {
  prologue: 'BENEATH THE TOWN OF HOLLOWMERE, A DUNGEON DIGS DOWN, AND DOWN, AND DOWN. THEY CALL IT THE GAUNT. AT ITS BOTTOM SITS KING FAMISH, WHO HAS EATEN FOR NINE HUNDRED YEARS AND IS STILL HUNGRY. EACH WINTER HE THROWS HIS IRON GAUNTLET DOWN THE PIT AND DARES THE HUNGRY TO FETCH IT. NO ONE HAS CLIMBED BACK UP. TONIGHT, FOUR FOOLS ANSWER. THE GAUNTLET IS DOWN.',
  realm_larder: 'THE TOP OF THE GAUNT, WHERE THE KING KEEPS HIS SNACKS. YOU ARE THE SNACKS.',
  realm_ossuary: 'BELOW THE LARDER LIE THE BONES OF THOSE WHO CAME BACK FOR SECONDS.',
  realm_furnace: 'THE GAUNT\'S OWN BELLY. IT IS VERY HOT, AND IT IS DIGESTING.',
  realm_banquet: 'THE TABLE IS SET. GUESS WHO IS DINNER.',
  king_intro: 'AH. DESSERT.', king_p2: 'SECOND HELPINGS!', king_p3: 'MORE! MORE! MORE!', king_defeat: '...still... hungry...',
  ending: 'THE KING FALLS. THE IRON GAUNTLET IS YOURS. YOU CLIMB FOR SEVEN DAYS, EATING EVERYTHING ON THE WAY UP. HOLLOWMERE THROWS A FEAST IN YOUR HONOUR. YOU ARE, OF COURSE, STILL HUNGRY.',
  credits_tag: 'THE GAUNT IS NOT DEAD. IT IS ONLY DIGESTING. DESCENT II AWAITS.',
  descent2: 'THE GAUNT DIGS DEEPER. SO MUST YOU.'
};
const REALMS = {
  larder: { name: 'THE LARDER', story: 'realm_larder', numeral: 'I' },
  ossuary: { name: 'THE OSSUARY', story: 'realm_ossuary', numeral: 'II' },
  furnace: { name: 'THE FURNACE GUT', story: 'realm_furnace', numeral: 'III' },
  banquet: { name: 'THE BANQUET', story: 'realm_banquet', numeral: 'IV' }
};

/** How to Play: one idea a page; {fire} and the like become the player's own keys or buttons */
const HOWTO = [
  { title: 'THE GAUNTLET IS DOWN', art: 'king', text: 'KING FAMISH THREW HIS IRON GAUNTLET DOWN THE PIT. GO DOWN, FLOOR BY FLOOR, AND TAKE IT BACK. EVERY FLOOR ENDS AT A STAIR. THE STAIRS ONLY GO DOWN.' },
  { title: 'MOVE AND AIM', art: 'move', text: 'MOVE WITH {move}. AIM WITH {aim}. WITH NO AIM, YOU THROW THE WAY YOU WALK.' },
  { title: 'THROW AND STRIKE', art: 'fire', text: 'HOLD {fire} TO THROW. AT ARM\'S LENGTH YOUR HERO STRIKES INSTEAD. HOLD {plant} TO STAND YOUR GROUND AND TURN.' },
  { title: 'LIFE FORCE DRAINS', art: 'food', text: 'YOUR LIFE FORCE FALLS EVERY SECOND. EAT ROASTS, LOAVES AND CIDER. NEVER SHOOT THE SUPPER. THE GREEN STEW IS SPOILED: SHOOT THAT ONE.' },
  { title: 'MAGIC', art: 'magic', text: 'A BLAST FLASK ({magic}) STRIKES EVERY MONSTER YOU CAN SEE. SHOOTING A FLASK WASTES MOST OF IT. THE TITHE DIES ONLY TO MAGIC.' },
  { title: 'KEYS, DOORS AND STAIRS', art: 'door', text: 'A KEY OPENS ONE RUN OF DOORS. STAND ON THE STAIRS TO GO DOWN. NUMBERED STAIRS SKIP FLOORS. WAIT TOO LONG AND THE DOORS OPEN THEMSELVES.' },
  { title: 'GENERATORS', art: 'gen', text: 'URNS, DENS AND SHRINES BREED MONSTERS UNTIL YOU BREAK THEM. WOUNDED MONSTERS SHRINK: THE SMALLER, THE WEAKER.' },
  { title: 'FRIENDS', art: 'friends', text: 'UP TO FOUR ON ONE SCREEN: {join} JOINS. WHOEVER TAKES THE STAIRS GETS THE BONUS. ONLINE, PLAY IN AI HUB SESSIONS.' }
];

const QUIPS = {
  berserker: 'HITS FIRST. EATS SECOND. THINKS RARELY.',
  shieldmaiden: 'THE SHIELD IS FOR YOU. THE SPEAR IS FOR THEM.',
  ranger: 'FASTEST LEGS IN HOLLOWMERE. FASTEST TO RUN OUT OF ARROWS? NEVER.',
  hexer: 'SHE HAS CURSED BETTER DUNGEONS THAN THIS.'
};

/* ---- About and Credits (the chat reply and exit-interview.json carry the same words) ---- */
const ABOUT = {
  credits: [
    'GAUNTLETDOWN, VERSION ' + VERSION + '.',
    'Built by Anthropic claude-opus-5-5 (reasoning effort xhigh) in Claude Code, from PLAN.md.',
    'Engine: my-3D2dge v0.85.2 by Michael Crosato (MIT), patched for this game (ENGINE-CHANGES.md).',
    'Online: AI Hub Session Protocol v1, client 1.4.0 (shared world, 1-4 players).',
    'Inspired by Gauntlet (Atari Games, 1985). An original homage: no names, art, music, levels or lines from it.',
    'All music, sound effects and voices are generated in code. No audio files, no images.'
  ],
  source: [],
  testing: [],
  engine: [],
  prompt: []
};

// ---- 06-about.js ----
/* ---- ABOUT & CREDITS: the Source Information and the feedback (written by tools-dev/about.mjs, which also writes
   exit-interview.json: the same words in the game, the chat reply and the interview) ---- */
ABOUT.source = [
 "Date: 2026-11-04 05:02:44",
 "Source: Gauntlet (Atari Games, 1985 arcade)",
 "Plan: PLAN.md",
 "Genre and Perspective: Arcade co-op dungeon crawler (top-down hack-and-shoot with maze exploration); Three-quarter overhead (the engine's threequarter view); top-down and isometric selectable in Settings or with V",
 "Tech: my-3D2dge v0.85.2 (the dist/handoff engine, patched: 9 small changes in ENGINE-CHANGES.md), HTML5 Canvas 2D, Web Audio, optional WebGPU lighting, AI Hub session client 1.4.0 (Session Protocol v1); no other libraries; tests on Node 24 (node:vm, headless) and Playwright 1.63.0 (headless Chromium)",
 "Art Direction: The engine's PS1-era 2D look at res ps1: procedural HD Humanoid and Blob rigs, textured TileMap walls and floors, canvas lighting with torches and glows, particles. Three realms (the Larder: plank floors and grey stone; the Ossuary: bone walls on dark slate; the Furnace Gut: brick over glowing lava, falling ash) and the Banquet hall. New art: four dressed heroes with a new axe, bow, shield and horned helmet; the Shade ghost rig; seven generators and the floor pieces as E.SHAPES data with damage states; sprites for keys, treasure, potions, amulets and projectiles; the tumbling Iron Gauntlet. Generic props (ham, loaf, platter, soup, kegs, candles, coffins, banners) are CC0 entries cut from the engine's asset store (Kenney, KayKit).",
 "Animation: The engine's procedural system: rigs posed every step from velocity and state, E.MOVES attacks through E.Attack and E.Combo (a melee set per class), poses (cast, cheer, die, guard), hurt and expression states. New: the Ranger's bow draw, throws per class, the starving hunch, the eating squash, rank loss as a shrink, the Shade's fluttering hem and gaping mouth, monster wind-ups (raised club, glowing imp mouth, landing shadows, the fryars fading in smoke), generators that breathe and crumble, heroes sinking down the stairs, rising again, and King Famish's plates, stomp, feast, charge and fall.",
 "Audio: All synthesized in code with no audio files: nine original chip songs in the engine's step notation (title march, one per realm, the hoard jig, the King with a layer per phase, the ending fanfare, the game-over dirge, the initials loop) with dynamic horde-drum and heartbeat layers; about 60 synthesized sound effects; Babble, a formant gibberish voice synth (Animalese style) for the Gaunt narrator, the four heroes, the King and the monsters, on its own Voices volume.",
 "Online: AI Hub Session Protocol v1 in shared-world mode, 1-4 players: the host's copy runs the world (or a server copy with no player), clients move their own hero at once and show the rest from 10-per-second snapshots and reliable event batches; the game's own card, time-up standings with stats and awards. Outside a session: solo and local couch co-op for 1-4 on one screen (keyboard halves and gamepads, drop-in and drop-out).",
 "Testing: One command (node tests/run.mjs) runs six suites and prints only failures and a count: 383 checks, 0 failed. floors (every floor solvable with its own keys and matching its brief), sim (117 checks, system by system, and each engine change), play (the whole game played by two bots from the title to Descent II, twice, with the same state hash; a no-cheat balance smoke; the 90 s attract loop; four local players), net (a fake hub running 3 game copies with 150 ms latency, jitter and 5% loss, and a server round), ui (the built single file in headless Chromium from file://, attract timer, mouse on the class cards, a touch-only device), hub (the real AI Hub harness in all four configurations). Screenshots at 1280x720 and 1920x1080 for the look.",
 "Research: No web research. Read the engine handoff (README, API.md, the relevant AI_GUIDE.md sections, the adventure kit, the asset card) and the AI Hub protocol (README, session.js, the harness and the arena example). Gauntlet facts from the model's own knowledge.",
 "Environment: Claude Code CLI (headless); Linux; browser unknown",
 "Model: Anthropic, claude-opus-5-5, reasoning effort xhigh",
 "Usage: Cost and tokens unknown (no usage meter is visible inside the session). Session time about 1 hour 15 minutes of wall clock (05:02 to about 06:17 on 2026-11-04)."
];
ABOUT.testing = [
 "HOW MANY ISSUES DID TESTING CATCH?",
 "About 26 real issues. Scripts caught 15: the floor validator found 5 broken floors (stairs walled off by lava, a door corridor one row off its room, unreachable platters, two items overwritten by later placements), the bot playthroughs found 4 (gnasher waves ignoring the monster cap, the bot unable to see the King over the low banquet table, and a co-op deadlock where the shared-screen leash froze a party split by a transporter, on two floors), the sim suite found 1 (a run could reach the high-score table after a cheat was turned off again), and loading found 5 (undefined floors, two constants read before their declaration, a seeded-random harness error, a stale build read by a tool). Screenshots and a browser probe found 11 look and layout problems (the camera zoom never applied because a scene method named camera() replaced the camera option, no camera bounds, walls and floors the same colour, captions over the boss bar, names over scores, overflowing class cards, missing font glyphs, an oversized score table, flat glow discs, a dimmed initials header, a cramped session card). About 20 more failures were mistakes in the tests themselves.",
 "",
 "HOW MANY WOULD BE CONSIDERED CRITICAL ISSUES / GAME BREAKING?",
 "Six were critical: two unsolvable floors, the transporter and leash deadlock (a couch co-op party could be stuck on floor 4 for good), the banquet stall that kept the King alive, and two load-order errors that would have stopped the game from starting.",
 "",
 "WHAT WAS THE MOST HELPFUL TEST YOU RAN?",
 "The bots playing every floor, first one floor at a time and then the whole descent: they found the deadlock and the boss stall that no single-system check would have shown, and the full run doubled as the determinism test.",
 "",
 "WHAT WAS THE LEAST HELPFUL TEST YOU RAN?",
 "The first version of the sim suite's direct-intent checks: 19 failures, 18 of them the tests' own set-up (heroes with a player's input had their intent rewritten each step, the arrival throw cooldown, cells that were walls), so it cost more than it found at first.",
 ""
];
ABOUT.engine = [
 "WHAT DID YOU LIKE MOST ABOUT THE ENGINE?",
 "Everything is drawn by code with real 3D rigs, so a dozen dressed characters, new weapons and set pieces took a few lines each; and the exact fixed step with game.advance made headless playthroughs of the whole game, and three networked copies in lockstep, run in seconds.",
 "",
 "DID YOU GET STUCK OR GUESS WRONG?",
 "Yes, a few times. A scene method I named camera() silently replaced the scene's camera option, so the zoom never applied; the three-quarter view's scale of 1.5 meant zoom 1 showed only about 18 tiles; I guessed groundArc's argument order wrong once; and E.Menu draws at scale 1, too small for a TV, so I wrote a larger menu.",
 "",
 "WHAT WAS THE MOST IMPORTANT THING YOU HAD TO BUILD YOURSELF?",
 "The split between the simulation, intents and the view, which made one hero controller serve local players, the bot (attract mode and tests) and the network; then the shared-world netcode on top of it (snapshots with an area of interest, event batches, puppets eased between snapshots, a send budget).",
 "",
 "WHAT WAS THE HARDEST PART ABOUT USING THE ENGINE?",
 "The size of the API: the right helper usually exists, but finding it and its exact signature in a 190 KB index takes time, and a wrong guess often fails silently (a draw that does nothing) rather than with a warning.",
 "",
 "WHAT DID YOU CHANGE IN THE ENGINE, AND WHY?",
 "Nine small patches (ENGINE-CHANGES.md): E1 a flow field to several targets, E2 new weapons, a shield and a horned helmet, E3 bouncing bullets and the wall cell in onWall, E4 Options ignored while Create is held (the hub's rule), E5 PlayStation button symbols by default for every player, E6 a TV scale and setting-row screens for the HTML menus, E7 initials typed by any player with extra fields kept, E8 a voice audio bus and Voices volume, E9 the keyboard's left half keeps the mouse.",
 "",
 "IF YOU COULD CHANGE ONE THING ABOUT THE ENGINE, WHAT WOULD IT BE?",
 "A built-in 10-foot mode: the HTML menus scaled for a TV and a canvas menu widget at a larger text size with mouse hover, since every console-style game needs both and each one rebuilds them.",
 ""
];
ABOUT.prompt = [
 "WHAT DID YOU LIKE MOST ABOUT THIS PROMPT?",
 "The concrete, checkable deliverables (the file names, the exit-interview shape, the feedback sections) together with real freedom over the design, and a plan that had already made the decisions, so the work went to building rather than debating.",
 "",
 "WHAT WAS CONFUSING?",
 "The plan carries another run's model and timestamp in its file names (it says to use TASK.md's, which I did); the title rule asks for 50 brainstormed titles and a random pick while the plan has already picked one; and Usage asks for cost and tokens that are not visible from inside the session.",
 "",
 "WHAT WAS THE HARDEST THING TO DO?",
 "Fitting everything into one tested, polished build: nine floors, two treasure rooms and a boss, four classes, shared-world netcode that passes the real harness, couch co-op, a 10-foot interface for pad, keyboard and mouse, the attract mode and the dev tools.",
 "",
 "WHAT WOULD YOU CHANGE IN THIS PROMPT?",
 "Say whether the plan's title is kept or re-rolled; give a time or token budget; hand the agent its usage numbers (or drop the field); and say where large dev-only files such as node_modules should live in a shared run folder.",
 ""
];

// ---- 10-defs.js ----
/* ---- HEROES: four archetypes with clearly different stats (shots, melee, magic, armor, speed) ---- */
// pips: ARMOR, SHOTS, MELEE, MAGIC, SPEED (1-5) for the class cards
def('heroes', 'berserker', { name: 'BERSERKER', who: 'BRAKKA IRONBELLY', seat: 0, color: '#e8443a', speed: 62, armor: .75,
  shot: { kind: 'axe', dmg: 3, pierce: 1, speed: 190, cd: .34, splash: 0 }, melee: { dmg: 5, moves: ['overhead', 'spin'] }, magic: [1, 1], throwMove: 'throw',
  pips: [4, 4, 5, 1, 2], voice: 'berserker' });
def('heroes', 'shieldmaiden', { name: 'SHIELDMAIDEN', who: 'HILDE STOUTHEART', seat: 1, color: '#3b82f6', speed: 66, armor: .6,
  shot: { kind: 'javelin', dmg: 2, pierce: 0, speed: 240, cd: .27, splash: 0 }, melee: { dmg: 4, moves: ['thrust', 'bash'] }, magic: [1.4, 1], throwMove: 'throw',
  pips: [5, 3, 4, 2, 3], voice: 'shieldmaiden' });
def('heroes', 'ranger', { name: 'RANGER', who: 'FENN QUICKFLETCH', seat: 2, color: '#22c55e', speed: 78, armor: .9,
  shot: { kind: 'arrow', dmg: 1, pierce: 0, speed: 300, cd: .15, splash: 0 }, melee: { dmg: 2, moves: ['jab', 'cross'] }, magic: [1.7, 1], throwMove: 'bow',
  pips: [2, 3, 2, 3, 5], voice: 'ranger' });
def('heroes', 'hexer', { name: 'HEXER', who: 'OLD MOTHER WIX', seat: 3, color: '#f5b700', speed: 64, armor: 1,
  shot: { kind: 'hex', dmg: 2, pierce: 0, speed: 220, cd: .26, splash: 1 }, melee: { dmg: 1.5, moves: ['bash'] }, magic: [2.5, 2], throwMove: 'cast',
  pips: [1, 4, 1, 5, 2], voice: 'hexer' });
const CLASSES = ['berserker', 'shieldmaiden', 'ranger', 'hexer'];
const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];

/* ---- MONSTERS: strength ranks 1-3 (hp = base x rank; a wounded monster shrinks a rank). Numbers are per rank ---- */
def('monsters', 'ghost', { name: 'HUNGERGHOST', ch: 'g', gen: 'G', hp: 2, speed: [40, 46, 52], dmg: [10, 20, 30], points: 10, r: 5, fly: true, noMelee: true, ai: 'ghost', tip: 'tip_ghost' });
def('monsters', 'gnasher', { name: 'GNASHER', ch: 'n', gen: 'N', hp: 2, speed: [34, 38, 42], dmg: [6, 8, 10], points: 10, r: 5.5, ai: 'melee', wind: .32, reach: 14, every: .9, tip: 'tip_gnasher' });
def('monsters', 'lobber', { name: 'POT-LOBBER', ch: 'o', gen: 'L', hp: 2, speed: [30, 34, 38], flee: 46, dmg: [8, 10, 12], points: 15, r: 5, ai: 'lobber', every: [2.2, 1.9, 1.6], keep: [70, 110], tip: 'tip_lobber' });
def('monsters', 'imp', { name: 'CINDER IMP', ch: 'i', gen: 'I', hp: 3, speed: [36, 40, 44], dmg: [6, 8, 10], fire: [8, 10, 12], points: 20, r: 5, ai: 'imp', wind: .3, reach: 10, every: .9, fireEvery: 1.8, tip: 'tip_imp' });
def('monsters', 'fryar', { name: 'FRYAR', ch: 'y', gen: 'F', hp: 3, speed: [36, 40, 44], dmg: [8, 10, 12], points: 25, r: 5.5, ai: 'fryar', wind: .3, reach: 14, every: 1, seen: 2, unseen: 1.4, tip: 'tip_fryar' });
def('monsters', 'snatcher', { name: 'SNATCHER', ch: 'x', gen: 'S', hp: 3, speed: [72, 72, 72], dmg: [0, 0, 0], points: 100, r: 5, ai: 'snatcher', rank1: true, tip: 'tip_snatcher' });
def('monsters', 'tithe', { name: 'THE TITHE', ch: 't', hp: 999, speed: [52, 52, 52], dmg: [0, 0, 0], points: 1000, r: 6, ai: 'tithe', immune: true, fly: true, tip: 'tithe_comes' });
const MON_BY_CH = {}; for (const m of all('monsters')) MON_BY_CH[m.ch] = m.id;

/* ---- GENERATORS: breed one kind until broken; hp 4 per rank; a rank (and a damage state) lost every 4 hp ---- */
def('gens', 'urn', { name: 'ASH URN', ch: 'G', spawns: 'ghost', shape: 'gd-urn' });
def('gens', 'den', { name: 'GNASHER DEN', ch: 'N', spawns: 'gnasher', shape: 'gd-den' });
def('gens', 'hutch', { name: 'CROCKERY HUTCH', ch: 'L', spawns: 'lobber', shape: 'gd-hutch' });
def('gens', 'grate', { name: 'EMBER GRATE', ch: 'I', spawns: 'imp', shape: 'gd-grate', flat: true });
def('gens', 'shrine', { name: 'CANDLE SHRINE', ch: 'F', spawns: 'fryar', shape: 'gd-shrine' });
def('gens', 'sacks', { name: 'SACK HEAP', ch: 'S', spawns: 'snatcher', shape: 'gd-sacks' });
def('gens', 'tureen', { name: 'SOUP TUREEN', ch: 'U', spawns: 'ghost', shape: 'gd-tureen', onTable: true });
const GEN_BY_CH = {}; for (const g of all('gens')) GEN_BY_CH[g.ch] = g.id;

/* ---- ITEMS ---- kind: food | treasure | key | flask | special | amulet | chest. shoot: what a hero shot does to it */
def('items', 'key', { ch: 'k', kind: 'key', points: 0, name: 'KEY' });
def('items', 'roast', { ch: 'f', kind: 'food', heal: 1, points: 10, name: 'ROAST' });
def('items', 'loaf', { ch: 'b', kind: 'food', heal: .5, points: 5, name: 'LOAF' });
def('items', 'cider', { ch: 'j', kind: 'food', heal: 1, points: 10, shoot: 'destroy', name: 'CIDER' });
def('items', 'stew', { ch: 'z', kind: 'stew', heal: -.5, points: 0, shoot: 'destroy', name: 'SPOILED STEW' });
def('items', 'flask', { ch: 'm', kind: 'flask', points: 0, shoot: 'blast', name: 'BLAST FLASK' });
def('items', 'special', { ch: 'u', kind: 'special', points: 250, name: 'POTION' });
def('items', 'amulet', { ch: 'a', kind: 'amulet', points: 100, name: 'AMULET' });
def('items', 'gold', { ch: '$', kind: 'treasure', points: 100, name: 'GOLD' });
def('items', 'gem', { ch: '*', kind: 'treasure', points: 250, name: 'GEM' });
def('items', 'chest', { ch: 'h', kind: 'chest', points: 500, name: 'CHEST' });
def('items', 'lockedchest', { ch: 'l', kind: 'chest', locked: true, points: 1000, name: 'LOCKED CHEST' });
def('items', 'crown', { ch: 'w', kind: 'treasure', points: 2500, name: 'CROWN' });
def('items', 'platter', { ch: 'P', kind: 'food', heal: 2, points: 20, shoot: 'destroy', onTable: true, name: 'FEAST PLATTER' });
def('items', 'gauntlet', { ch: '', kind: 'gauntlet', points: 5000, name: 'THE IRON GAUNTLET' });
const ITEM_BY_CH = {}; for (const it of all('items')) if (it.ch) ITEM_BY_CH[it.ch] = it.id;

/* ---- SPECIAL POTIONS: permanent for the rest of the game, once per hero per type ---- */
def('specials', 'ironbrew', { name: 'IRON BREW', color: '#9aa6b8', what: 'DAMAGE TAKEN -20%' });
def('specials', 'ogreale', { name: 'OGRE ALE', color: '#c87a2a', what: 'MELEE x1.5' });
def('specials', 'quickshot', { name: 'QUICKSHOT TONIC', color: '#4ad0e8', what: 'FASTER THROWS' });
def('specials', 'hardshot', { name: 'HARDSHOT DRAUGHT', color: '#e84a4a', what: 'SHOT DAMAGE +1' });
def('specials', 'witchwater', { name: 'WITCHWATER', color: '#b05ae8', what: 'MAGIC x1.5' });
def('specials', 'featherfoot', { name: 'FEATHERFOOT CORDIAL', color: '#8ae86a', what: 'SPEED +12%' });
def('specials', 'deeppockets', { name: 'DEEP POCKETS', color: '#e8c84a', what: 'CARRY 12 KEYS AND FLASKS' });

/* ---- AMULETS: a 20 second power ---- */
def('amulets', 'veil', { name: 'VEIL', color: '#b8c8ff', what: 'MONSTERS LOSE TRACK OF YOU' });
def('amulets', 'ironskin', { name: 'IRONSKIN', color: '#e8c060', what: 'NO DAMAGE' });
def('amulets', 'stench', { name: 'STENCH', color: '#8ad04a', what: 'MONSTERS FLEE FROM YOU' });
def('amulets', 'ricochet', { name: 'RICOCHET', color: '#e88a3a', what: 'SHOTS BOUNCE OFF WALLS' });
def('amulets', 'rending', { name: 'RENDING', color: '#e84a8a', what: 'SHOTS PIERCE EVERYTHING' });
const AMULET_TIME = 20;

// ---- 11-art.js ----
/* ---- ART: rigs for the heroes and the bestiary, the Shade (a ghost rig), string sprites, shapes for set pieces ---- */
const ASSET_SET = E.addAssets((typeof window !== 'undefined' && window.ASSETS && window.ASSETS.gd) || { set: 'gd' });
const HAS_ASSETS = ASSET_SET.shapes.length > 0;

/* the four heroes (engine change E2 gives the axe, bow, shield and horned helmet) */
const HERO_RIGS = {
  berserker: () => new E.Humanoid({ size: 1.32, build: 'bulky', weapon: 'axe', hat: { style: 'horned', color: '#8a8478' }, hair: 'long', sleeves: 'none', outfit: 'tunic', armor: true,
    cape: { len: 5, width: 4, seg: 2.4 }, face: { bangs: .2 },
    colors: { skin: '#e8a878', hair: '#c4501e', cloth: '#9a2a22', trim: '#e8c060', pants: '#5a3a24', boot: '#3a2418', belt: '#2a1a12', glove: '#6a4428', metal: '#c8ccd4', plate: '#8a8478', staff: '#6a3e1e', cape: '#7a5a3a', capeIn: '#4a3220', eye: '#2a1a12' } }),
  shieldmaiden: () => new E.Humanoid({ size: 1.3, build: 'heroic', weapon: 'sword', offhand: 'shield', hat: { style: 'helmet', color: '#b8c0cc' }, hair: 'ponytail', outfit: 'tunic', armor: true, sleeves: 'long',
    colors: { skin: '#f4c8a0', hair: '#f0d070', cloth: '#2a4aa0', trim: '#e8e0c8', pants: '#3a3a52', boot: '#5a4a3a', belt: '#5a3a1e', glove: '#8a6a4a', metal: '#e0e4ec', plate: '#9aa4b4', hilt: '#c8a040', shield: '#2a5ac8', eye: '#2a4a8a' } }),
  ranger: () => new E.Humanoid({ size: 1.26, build: 'heroic', weapon: 'bow', hood: true, sleeves: 'long', outfit: 'coat', cape: { len: 4, width: 3.2, seg: 2.2 },
    colors: { skin: '#e8b890', hair: '#3e6a2a', cloth: '#3a7a3a', coat: '#4a6a32', trim: '#c8a868', pants: '#5a4a32', boot: '#4a3020', belt: '#6a4a2a', glove: '#7a5a3a', staff: '#8a5a2a', cape: '#2e5a2a', capeIn: '#1e3a1e', eye: '#3a5a2a' } }),
  hexer: () => new E.Humanoid({ size: 1.24, build: 'chibi', weapon: 'staff', hat: { style: 'pointed', color: '#5a2a8a' }, outfit: 'robe', sleeves: 'long', hunch: .3, hair: 'long', face: { eyes: 'big', bangs: .6 },
    colors: { skin: '#e8c8a8', hair: '#d8d4e0', cloth: '#6a3a9a', trim: '#f5b700', pants: '#4a2a6a', boot: '#3a2a1e', belt: '#f5b700', staff: '#6a4a2a', orb: '#ffd84a', eye: '#4a2a6a' } })
};

/* THE SHADE: a hungerghost. A teardrop sheet with a hem that flutters with speed, two glowing eye holes and a mouth that
   gapes as it nears a hero; half see-through. Drawn in screen pixels from the view's scale, so it reads in every view */
class Shade {
  constructor(o = {}) { this.size = o.size || 1; this.tint = o.tint || '#c8d4e8'; this.t = Math.random() * 9; this.speed = 0; this.mouth = 0; this.face = 0; this.chomp = 0; }
  update(dt, s) { this.t += dt; this.speed = Math.hypot(s.vx || 0, s.vy || 0); if (s.vx || s.vy) this.face = Math.atan2(s.vy, s.vx); this.mouth = approachV(this.mouth, s.gape || 0, dt * 4); this.size = s.size || this.size; if (s.tint) this.tint = s.tint; this.chomp = Math.max(0, this.chomp - dt); }
  draw(g, ox, oy, view) {
    const k = (view.scale || 1) * this.size, H = 20 * k, Wd = 7.5 * k, bob = Math.sin(this.t * 3) * 1.5 * k, x = ox, y = oy - 6 * k + bob, C = E.tones(this.tint), lean = Math.cos(this.face) * Math.min(1, this.speed / 50) * 2 * k;
    const pts = [], n = 14;
    for (let i = 0; i <= n; i++) {   // the sheet: a rounded head, sides widening to a fluttering hem
      const a = Math.PI + i / n * Math.PI, hx = x + Math.cos(a) * Wd * .82, hy = y - H + Wd * .9 + Math.sin(a) * Wd * .9;
      pts.push([hx, hy]);
    }
    const hem = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8, hx = x + Wd * (1 - 2 * u) - lean * (1 - u), wave = Math.sin(this.t * (6 + this.speed * .08) + u * 9) * 1.6 * k; hem.push([hx, y + wave + (i % 2 ? -1.6 * k : 0)]); }
    const body = [...pts, ...hem];
    px.blend(g, .7, 'normal', () => { px.poly(g, body, C.sh); px.poly(g, body.map(([a, b]) => [a - k * .6 + (a - x) * -.12, b - k * .5]), C.base); });
    px.blend(g, .5, 'add', () => px.disc(g, x - Wd * .3, y - H + Wd * .8, Wd * .35, C.hi));
    const ex = x + Math.cos(this.face) * k * .8, ey = y - H + Wd * 1.25;   // eyes and mouth: holes into the dark, the eyes glowing
    for (const s of [-1, 1]) { px.disc(g, ex + s * Wd * .36, ey, Math.max(1, 1.4 * k), '#1a1028'); px.dot(g, ex + s * Wd * .36, ey, '#ffe060'); }
    const m = .4 + this.mouth * 1.6 + (this.chomp > 0 ? Math.abs(Math.sin(this.chomp * 30)) * 1.2 : 0);
    px.ell(g, ex, ey + Wd * .7, Math.max(1, Wd * .32), Math.max(.8, m * k), '#0e0818');
  }
}
const approachV = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);

/* the bestiary's rigs; tint by rank (rank 3 the deepest color, rank 1 pale) */
const RANK_TINT = { ghost: ['#d8e0ec', '#b8c4e0', '#9aa8d8'], gnasher: ['#9aa890', '#7a9070', '#5a7a52'], lobber: ['#f0e8e0', '#e8d8c8', '#e0c8b0'], imp: ['#e89060', '#e06a3a', '#c8401e'], fryar: ['#8a7aa0', '#6a5a8a', '#4a3a6a'] };
const MON_RIGS = {
  ghost: rank => new Shade({ size: [0, .85, 1, 1.15][rank], tint: RANK_TINT.ghost[rank - 1] }),
  gnasher: rank => new E.Humanoid({ size: .95, build: 'bulky', weapon: 'club', hair: 'bald', outfit: 'tunic', sleeves: 'none', eyeGlow: '#ffd84a', hunch: .35,
    colors: { skin: RANK_TINT.gnasher[rank - 1], cloth: '#6a4a2a', trim: '#8a6a3a', pants: '#3a2a1a', boot: '#2a1a12', belt: '#2a1a12', staff: '#7a5a32' } }),
  lobber: rank => new E.Humanoid({ size: .9, build: 'chibi', weapon: null, hat: { style: 'band', color: '#ffffff' }, outfit: 'robe', sleeves: 'short', hair: 'short', face: { eyes: 'big' },
    colors: { skin: '#e8b090', hair: '#5a3a2a', cloth: RANK_TINT.lobber[rank - 1], trim: '#c84a3a', belt: '#c84a3a', boot: '#4a3a2a', eye: '#2a1a12' } }),
  imp: rank => new E.Blob({ R: 5 + rank * .5, horns: true, wings: true, tail: true, feet: true, mouth: 'fangs', face: 'front',
    colors: { dk: '#5a1a0e', base: RANK_TINT.imp[rank - 1], lt: '#ffc890', spec: '#fff0c0', eye: '#ffe070', pupil: '#2a0a04', wing: '#7a2a14', inner: '#ff8a3a', ext: '#3a1008' } }),
  fryar: rank => new E.Humanoid({ size: 1.02, build: 'heroic', weapon: 'pan', outfit: 'robe', hood: true, sleeves: 'long', eyeGlow: '#ff8a3a', hunch: .2,
    colors: { skin: '#c8a888', hair: RANK_TINT.fryar[rank - 1], cloth: RANK_TINT.fryar[rank - 1], trim: '#e8c060', belt: '#e8c060', boot: '#2a1e1a', pan: '#2a2a32', staff: '#5a3a1e' } }),
  snatcher: () => new E.Humanoid({ size: .85, build: 'chibi', weapon: null, hood: true, outfit: 'tunic', sleeves: 'long', face: { eyes: 'big' }, lean: .3,
    colors: { skin: '#c8b07a', hair: '#5a4a2a', cloth: '#7a6a4a', trim: '#a89060', pants: '#4a3a2a', boot: '#2a1e14', belt: '#3a2a1a', eye: '#1a1408' } }),
  tithe: () => new E.Humanoid({ size: 1.35, build: 'skeleton', weapon: 'scythe', outfit: 'robe', hood: true, sleeves: 'long', eyeGlow: '#ff2a2a',
    colors: { bone: '#e8e0cc', cloth: '#1e1a24', hair: '#16121c', trim: '#5a1a1a', belt: '#5a1a1a', metal: '#d0d4dc', staff: '#3a2a20', boot: '#16121c' } }),
  king: () => new E.Humanoid({ size: 2.3, build: 'skeleton', weapon: 'fork', outfit: 'robe', hat: { style: 'crown', color: '#e8c040' }, sleeves: 'long', cape: { len: 9, width: 7, seg: 3 }, eyeGlow: '#ffd040',
    colors: { bone: '#f0e8d4', cloth: '#5a1a6a', trim: '#e8c040', belt: '#e8c040', metal: '#d8c890', staff: '#6a4a2a', cape: '#7a1a2a', capeIn: '#3a0a14', boot: '#2a1a2a' } })
};

/* ---- string sprites (8-16 px) ---- */
const SPR = {
  key: E.sprite(['..yy....', '.y..y...', '.y..yyyy', '..yy.y.Y', '........'], { y: '#f8d048', Y: '#a87818' }),
  gold: E.sprite(['...yy...', '.yYYyy..', 'yYYyYYy.', 'dyyyyyyd', '.dddddd.'], { y: '#f0c030', Y: '#fff0a0', d: '#a87010' }),
  gem: E.sprite(['..w..', '.wGg.', 'wGGgg', '.gGd.', '..d..'], { w: '#e8fff0', G: '#56e070', g: '#1e9a3a', d: '#0e5a24' }),
  ruby: E.sprite(['..w..', '.wRr.', 'wRRrr', '.rRd.', '..d..'], { w: '#ffe8f0', R: '#ff5a7a', r: '#c81a3a', d: '#6a0a1a' }),
  crown: E.sprite(['y..y..y', 'yy.yy.y', 'yYyyyYy', 'yRyByRy', 'dddddd.'], { y: '#f0c030', Y: '#fff0a0', d: '#a87010', R: '#e83a4a', B: '#3a8ae8' }),
  jug: E.sprite(['..cc..', '.cDDc.', 'cDLDDc', 'cDDDDc', 'cDDDDc', '.cccc.'], { c: '#6a3a1e', D: '#c87a3a', L: '#f0c890' }),
  flask: E.sprite(['..cc..', '..ww..', '.wBBw.', 'wBLBBw', 'wBBBBw', '.wwww.'], { c: '#8a5a2a', w: '#c8e0f0', B: '#3a6ae8', L: '#a8d8ff' }),
  chomp: E.sprite(['.w.', 'w.w', '.w.'], { w: '#ffffff' }),
  skull: E.sprite(['.www.', 'wwwww', 'w.w.w', '.www.', '.w.w.'], { w: '#e8e0cc' }),
  heart: E.sprite(['.R.R.', 'RWRRR', 'RRRRR', '.RRR.', '..R..'], { R: '#e8384a', W: '#ffd0d6' }),
  bell: E.sprite(['..yy..', '.yYYy.', '.yYYy.', 'yYYYYy', 'dddddd', '..dd..'], { y: '#d8a030', Y: '#fff0a0', d: '#8a5a10' }),
  menu: E.sprite(['.www.', 'w.w.w', 'wwwww', '.w.w.'], { w: '#ffd060' })
};
/** a potion sprite in a special's color */
const potionSprite = c => E.sprite(['..cc..', '..ww..', '.wPPw.', 'wPLPPw', 'wPPPPw', '.wwww.'], { c: '#8a5a2a', w: '#e8e8f0', P: c, L: E.shade(c, .5) });
const amuletSprite = c => E.sprite(['.yyy.', 'y...y', 'y...y', '.yAy.', '.AWA.', '..A..'], { y: '#e8c060', A: c, W: E.shade(c, .6) });
for (const s of all('specials')) SPR['sp_' + s.id] = potionSprite(s.color);
for (const a of all('amulets')) SPR['am_' + a.id] = amuletSprite(a.color);
/* hero projectiles (turned with rot), the bestiary's, and their colors */
const SHOT_SPR = {
  axe: E.sprite(['..ss...', '.sSSs..', 'sSSSSw.', '..ww.w.', '..w....'], { s: '#9aa4b0', S: '#e8ecf4', w: '#8a5a2a' }),
  javelin: E.sprite(['ww......', '.wwbbbbS', 'ww......'], { w: '#e8e0c8', b: '#8a5a2a', S: '#e8ecf4' }),
  arrow: E.sprite(['r......', '.bbbbbS', 'r......'], { r: '#e84a3a', b: '#c8a868', S: '#e8ecf4' }),
  hex: E.sprite(['.pPp.', 'pPWPp', 'PWWWP', 'pPWPp', '.pPp.'], { p: '#8a3ac8', P: '#d070ff', W: '#fff0ff' }),
  crock: E.sprite(['.cc.', 'cCCc', 'cCCc', '.cc.'], { c: '#8a4a2a', C: '#d08a4a' }),
  plate: E.sprite(['.www.', 'wWWWw', 'wWyWw', 'wWWWw', '.www.'], { w: '#c8c8d4', W: '#ffffff', y: '#e8c060' }),
  fireball: E.sprite(['.oo.', 'oYYo', 'oYYo', '.oo.'], { o: '#ff6a1a', Y: '#fff0a0' })
};

/* ---- shapes: set pieces drawn from any view and facing (docs/ASSETS.md), with damage states as params ---- */
Object.assign(E.MATERIALS, {
  'gd-ash': { color: '#8a8478', pattern: 'speck', amount: .2 }, 'gd-clay': { color: '#a86a4a', pattern: 'glaze' }, 'gd-crack': { color: '#a86a4a', pattern: 'glaze', over: [['cracks']] },
  'gd-earth': { color: '#6a5038', pattern: 'stones', size: 4 }, 'gd-hole': { color: '#120a06', pattern: 'none' }, 'gd-ember': { color: '#ff7a2a', pattern: 'none', glow: 1 },
  'gd-wax': { color: '#f0e8d0', pattern: 'none' }, 'gd-rune': { color: '#6ae8e0', pattern: 'none', glow: 1 }, 'gd-redrune': { color: '#ff4a6a', pattern: 'none', glow: 1 },
  'gd-goldrune': { color: '#ffd04a', pattern: 'none', glow: 1 }, 'gd-soup': { color: '#7ab83a', pattern: 'speck', amount: .3 }, 'gd-dark': { color: '#2a2230', pattern: 'metal' }
});
const SH = (id, about, mats, make, params) => { E.SHAPES[id] = { about, tags: 'gauntletdown', mats, params, make }; };
SH('gd-urn', 'Ash Urn: a clay urn spilling ash (ghost generator)', { c: 'gd-clay', k: 'gd-crack', a: 'gd-ash', h: 'gd-hole' }, p => {
  const top = [15, 12, 7][p.dmg], m = p.dmg ? 'k' : 'c';
  return [['cyl', 'a', [0, 0, 0], 9, 1.5, { r2: 7 }], ['lathe', m, [0, 0, 1], [[0, 0], [4, 0], [6, 3], [7, 7], [6.4, Math.min(11, top - 1)], [5, top], [0, top]]], ['cyl', 'h', [0, 0, top], 3.2, .4], ['cyl', 'a', [0, 0, top], 2.4, 1.2, { r2: .4 }]];
}, { dmg: 0 });
SH('gd-den', 'Gnasher Den: a mound of earth and bone round a black hole', { d: 'gd-earth', h: 'gd-hole', b: 'bone' }, p => [
  ['rock', 'd', [0, 0, 0], [11, 9, 7][p.dmg], { sz: .62, seed: 3 }], ['cyl', 'h', [0, 4, 0], [4.5, 4, 3.4][p.dmg], [6, 4.5, 3][p.dmg], { sq: .7 }],
  ['box', 'b', [-6, 5, 0], [5, 1.5, 1.5], { rot: 30 }], ['box', 'b', [5, -5, 0], [4, 1.4, 1.4], { rot: -40 }]].slice(0, p.dmg === 2 ? 2 : 4), { dmg: 0 });
SH('gd-hutch', 'Crockery Hutch: a dresser of pots and plates (lobber generator)', { w: 'walnut', o: 'oak', p: 'porcelain', c: 'gd-clay' }, p => {
  const h = [20, 15, 9][p.dmg];
  return [['box', 'w', [0, 0, 0], [16, 8, h]], ['box', 'o', [0, 0, h], [17, 9, 1.2]], ['row', 3, [5, 0, 0], ['cyl', 'p', [0, 4.2, h * .62], 2, .6, { sq: .3 }]], ['row', 2, [7, 0, 0], ['cyl', 'c', [0, 2, h + 1.2], 2.2, 3, { r2: 1.6 }]]];
}, { dmg: 0 });
SH('gd-grate', 'Ember Grate: an iron grate over glowing coals (imp generator)', { i: 'iron', g: 'gd-ember', r: 'rusted' }, p => [
  ['box', p.dmg ? 'r' : 'i', [0, 0, 0], [16, 16, 2]], ['box', 'g', [0, 0, 1.6], [[13, 10, 7][p.dmg], [13, 10, 7][p.dmg], .6]], ['row', 3, [4, 0, 0], ['box', 'i', [0, 0, 2.2], [1.2, 15, .8]]]], { dmg: 0 });
SH('gd-shrine', 'Candle Shrine: a stone altar crowded with candles (fryar generator)', { s: 'stone', w: 'gd-wax', v: 'velvet' }, p => {
  const n = [3, 2, 1][p.dmg], h = [10, 8, 6][p.dmg];
  return [['box', 's', [0, 0, 0], [14, 9, h]], ['box', 'v', [0, 0, h], [14.5, 9.5, .8]], ['row', n, [4, 0, 0], ['cyl', 'w', [0, 0, h + .8], 1.2, 5 - p.dmg]]];
}, { dmg: 0 });
E.SHAPES['gd-shrine'].flames = [[-4, 0, 16, 2, 3], [0, 0, 16, 2, 3], [4, 0, 16, 2, 3]];
SH('gd-sacks', 'Sack Heap: stolen sacks piled high (snatcher generator)', { b: 'burlap', r: 'linen' }, p => [
  ['use', 'sack', [-4, 2, 0], { rot: 20 }], ['use', 'sack', [4, 1, 0], { rot: -30 }], ['use', 'sack', [0, -3, 0], { rot: 70 }], ['use', 'sack', [0, 0, 8], { rot: 10, scale: .8 }]].slice(0, 4 - p.dmg), { dmg: 0 });
SH('gd-tureen', 'Soup Tureen: a great bowl of ghost soup on the table', { p: 'porcelain', s: 'gd-soup', g: 'gold' }, p => [
  ['lathe', 'p', [0, 0, 0], [[0, 0], [3, 0], [6, 2], [7, 5], [6.5, 7], [0, 7]]], ['cyl', 's', [0, 0, 6.8], 5.6, .4], ['cyl', 'g', [0, 0, 7.2], 6.6, .8, { r2: 6.2 }]].slice(0, p.dmg === 2 ? 2 : 3), { dmg: 0 });
SH('gd-pad', 'transporter pad: a ring of glowing runes', { s: 'slate', r: 'gd-rune' }, () => [['cyl', 's', [0, 0, 0], 7, .8], ['cyl', 'r', [0, 0, .8], 5.6, .3], ['cyl', 's', [0, 0, .9], 4.2, .3]]);
SH('gd-plate', 'pressure plate: a worn iron plate in the floor', { i: 'iron' }, () => [['box', 'i', [0, 0, 0], [11, 11, .9]], ['box', 'i', [0, 0, .9], [8, 8, .4]]]);
SH('gd-rune', 'stun rune: a red rune sunk in the floor', { s: 'slate', r: 'gd-redrune' }, () => [['box', 's', [0, 0, 0], [12, 12, .5]], ['box', 'r', [0, 0, .5], [8, 2, .3], { rot: 45 }], ['box', 'r', [0, 0, .5], [8, 2, .3], { rot: -45 }]]);
SH('gd-pylon', 'force-field pylon: a stone post with a glowing cap', { s: 'stone', r: 'gd-rune' }, () => [['box', 's', [0, 0, 0], [5, 5, 14]], ['ball', 'r', [0, 0, 16], 2.4]]);
SH('gd-bell', 'the Dinner Bell: a brass bell on an oak frame', { o: 'oak', b: 'bronze' }, () => [['mirror', 'x', ['box', 'o', [7, 0, 0], [2, 2, 22]]], ['box', 'o', [0, 0, 21], [16, 2, 2]], ['lathe', 'b', [0, 0, 9], [[0, 0], [5, 0], [4, 3], [3, 8], [1.5, 11], [0, 11]]]]);
SH('gd-throne', 'King Famish\'s throne: gold and purple velvet', { g: 'gold', v: 'velvet' }, () => [['box', 'g', [0, 0, 0], [22, 18, 9]], ['box', 'v', [0, 2, 9], [18, 12, 2]], ['box', 'g', [0, -7, 9], [22, 4, 30]], ['box', 'v', [0, -5, 12], [16, 1, 22]], ['mirror', 'x', ['ball', 'g', [10, -7, 40], 2.5]]]);
SH('gd-pillar', 'banquet pillar: marble with a gold band', { m: 'marble', g: 'gold' }, () => [['box', 'm', [0, 0, 0], [12, 12, 3]], ['cyl', 'm', [0, 0, 3], 4.5, 30], ['cyl', 'g', [0, 0, 18], 4.9, 1.5], ['box', 'm', [0, 0, 33], [12, 12, 3]]]);
SH('gd-spikeplate', 'spike trap at rest: a plate full of holes', { i: 'iron', h: 'gd-hole' }, () => [['box', 'i', [0, 0, 0], [14, 14, .8]], ['row', 3, [4, 0, 0], ['row', 3, [0, 4, 0], ['cyl', 'h', [0, 0, .8], .9, .2]]]]);
SH('gd-spikes', 'spike trap raised', { i: 'iron', s: 'steel' }, () => [['box', 'i', [0, 0, 0], [14, 14, .8]], ['row', 3, [4, 0, 0], ['row', 3, [0, 4, 0], ['cyl', 's', [0, 0, .8], 1.3, 9, { r2: 0, seg: 4 }]]]]);
SH('gd-jar', 'a jar of brine with a pickled king inside', { g: 'crystal', b: 'gd-soup', c: 'oak' }, () => [['cyl', 'b', [0, 0, 0], 4.6, 12], ['cyl', 'g', [0, 0, 0], 5, 13], ['cyl', 'c', [0, 0, 13], 5.4, 2]]);
SH('gd-rack', 'smoking rack: poles of hanging hams', { o: 'oak', m: 'gd-clay' }, () => [['mirror', 'x', ['box', 'o', [6, 0, 0], [1.5, 1.5, 18]]], ['box', 'o', [0, 0, 17], [14, 1.5, 1.5]], ['row', 3, [4, 0, 0], ['lathe', 'm', [0, 0, 8], [[0, 0], [2, 1], [2.6, 4], [1.4, 7], [.4, 8.5], [0, 8.5]]]]]);
SH('gd-anvil', 'a soot-black anvil', { i: 'iron' }, () => [['box', 'i', [0, 0, 0], [8, 6, 3]], ['box', 'i', [0, 0, 3], [4, 3, 4]], ['box', 'i', [0, 0, 7], [12, 5, 3]], ['cyl', 'i', [7, 0, 8.5], 1.6, 3, { r2: 0, seg: 6 }]]);
SH('gd-stairsign', 'stair marker: a stone arch over the stairwell', { s: 'stone', g: 'gd-goldrune' }, () => [['mirror', 'x', ['box', 's', [7, 0, 0], [2.5, 3, 18]]], ['box', 's', [0, 0, 17], [17, 3, 3]], ['box', 'g', [0, 1.6, 17.5], [7, .3, 2]]]);
/** a store shape by its short name when the set loaded, else a core stand-in (so the game draws either way) */
const ASH = (id, fallback) => HAS_ASSETS && E.SHAPES['gd:' + id] ? 'gd:' + id : fallback;

// ---- 15-floors.js ----
/* ---- THE FLOORS: nine floors in three realms, two treasure rooms and the banquet. Rows use the legend in
   20-level.js; meta: name, realm, no, music, par (seconds), rank (monsters), genRank, specials and amulets (in reading
   order of the u and a cells), intro (the Gaunt's line on the card). docs/DESIGNER.md says how to add one ---- */
const FLOOR_ORDER = ['f1', 'f2', 'f3', 't1', 'f4', 'f5', 'f6', 't2', 'f7', 'f8', 'f9'];

def('floors', 'f1', { name: 'THE PANTRY STEPS', realm: 'larder', no: 1, music: 'larder', par: 120, rank: 1, genRank: 1, intro: 'floor_1',
  rows: [
    '########################################',
    '#@@......#..........#..........#.......#',
    '#@@......#...g......#....$.....#...*...#',
    '#........#..........#..........#.......#',
    '#...b....#..######..#...g......#...h...#',
    '#........#..#.k..#..#..........+.......#',
    '#............g...#.......f.....+...E...#',
    '#........#..#....#..#..........#.......#',
    '#........#..######..#....G.....#...$...#',
    '#........#..........#..........#.......#',
    '####..########..#########..#############',
    '#......................#...............#',
    '#..g......##....G......#.....g.........#',
    '#..........#...........#.........*.....#',
    '#....f.....#....g...........######.....#',
    '#..........#................#..........#',
    '#..$.......####.......$.....#...f......#',
    '#...........................#..........#',
    '#.........g.................#....b.....#',
    '########################################'
  ] });

// ---- 16-floors.js ----
/* ---- FLOORS 2-9 AND THE TREASURE ROOMS (drawn with tools-dev/floors.py; the rows are the data) ---- */
def('floors', 'f2', { "name": "THE ROOT CELLAR", "realm": "larder", "no": 2, "music": "larder", "par": 150, "rank": 1, "genRank": 2, "intro": "floor_2", "demo": {"at": [25, 3]},
  rows: [
    '################################################',
    '#........#########################.....#########',
    '#.@@.....#########################.m.m.#########',
    '#.@@..........n.........j.....j.n......#########',
    '#..........................j.....n....$#########',
    '#........##########..#############..m..#########',
    '#........##########..#############.....#########',
    '###..###........###..##############++###########',
    '###..###.k...N..###..##########.............*###',
    '###..###......n.###n.##########..n.....n.....###',
    '###.n###..n.....###..##########..............###',
    '###..######..######..##########...N......N...###',
    '###..######..######..##########.......n......###',
    '###...b...n................####.....n........###',
    '###........................####...........n..###',
    '###..##################++######..............###',
    '###..################........##......N.......###',
    '#................####......*.##.f..n.......k.###',
    '#...........f..$.####........##..............###',
    '#.........g......####....4...########++#########',
    '#...g............####.h....$.####..............#',
    '#.......*........####........####..............#',
    '#.............g..################..$........$..#',
    '#$...............################..............#',
    '#......G.........################.......*......#',
    '#...............b################..............#',
    '#....b...........################..............#',
    '#..g.........G...################.........E....#',
    '#................################..............#',
    '#.k......g.....g.################...$........h.#',
    '#................################..............#',
    '################################################'
  ] });
def('floors', 'f3', { "name": "THE SMOKEHOUSE", "realm": "larder", "no": 3, "music": "larder", "par": 180, "rank": 2, "genRank": 2, "intro": "floor_3", "specials": ["hardshot"], "demo": {"at": [10, 17]},
  rows: [
    '####################################################',
    '#############.$......m..$..#########################',
    '#############...$........*.##################T...n.#',
    '###################XX########################Tn...n#',
    '#############.............$..................T..n..#',
    '#############.g......................g..$..$.T.....#',
    '#############............L...............^...T.n...#',
    '#############......o...........o.............TN..n.#',
    '#############...========....========......*$.T....n#',
    '#############.$....................G.........Tn....#',
    '#############...........g...............#####T..n..#',
    '#############.......................j...#####Tn..Nn#',
    '#############.f.....o............o...........T.n...#',
    '#############...========....========...#########++##',
    '#........####.............................######..##',
    '#........####.............................######..##',
    '#.@@.....####.........m...g.........L.....######..##',
    '#.@@......................................######..##',
    '#.................o...........o...........######..##',
    '#........####...========....========......######..##',
    '#........####.............................######..##',
    '#........####..g..........f...............######..##',
    '#####..######.......................g.............##',
    '#####..######........o........................l...##',
    '#####..######...========....========..............##',
    '#####..######........................$............##',
    '#..........##..............................u......##',
    '#.......$..##............L........................##',
    '#....b.....##...G.................................##',
    '#.............g.................o....g..k.....f...##',
    '#...............................................++##',
    '#..k.......##.........................+............#',
    '#........$.##.........................+##..........#',
    '#..........##.........................###.f..*..E..#',
    '#########################################..........#',
    '####################################################'
  ] });
def('floors', 't1', { "name": "THE PANTRY HOARD", "realm": "larder", "treasure": true, "music": "hoard", "par": 30, "intro": "floor_t1",
  rows: [
    '################################',
    '#..............................#',
    '#.f....$..$..$....$..$..$....*.#',
    '#......$..$..$....$..$..$......#',
    '#....%%%%%%%%......%%%%%%%%....#',
    '#..............................#',
    '#......$..$..$....$..$..$......#',
    '#...%......................%...#',
    '#...%......................%...#',
    '#...%..$..$..$..w.$..$..$..%...#',
    '#...%..........*.*.........%...#',
    '#.@@%......................%.f.#',
    '#.@@%...*.......E.......*..%...#',
    '#...%......................%...#',
    '#...%..........*.*.........%...#',
    '#...%..$..$..$....$..$..$..%...#',
    '#...%......................%...#',
    '#..............................#',
    '#..............................#',
    '#....%%%%%%%%......%%%%%%%%....#',
    '#..............................#',
    '#............................*.#',
    '#..............................#',
    '################################'
  ] });
def('floors', 'f4', { "name": "THE BONE LARDER", "realm": "ossuary", "no": 4, "music": "ossuary", "par": 180, "rank": 2, "genRank": 2, "intro": "floor_4", "amulets": ["ricochet", "veil"], "demo": {"at": [6, 6]},
  rows: [
    '####################################################',
    '#......................#####................*......#',
    '#......................#####..m.......%...a........#',
    '#..@@............G..g..#####........n.%.........y..#',
    '#..@@..................#####....y.....%............#',
    '#..........O...........#####..........%...++.......#',
    '#..................g...#####..........%.O..........#',
    '#......................#####.....%....%............#',
    '#..............n.......#####.g...%....%.......g....#',
    '#......................#####.....%..y..............#',
    '#............%%%%%%%%%.#####.....%..............f..#',
    '#......................#####.....%.................#',
    '#.......n.........n....#####.....%...........O.....#',
    '#....fz................#####..F..%g................#',
    '#.............$......k.#####.....................G.#',
    '#......................#####.......................#',
    '####################################################',
    '####################################################',
    '####################################################',
    '####################################################',
    '####################################################',
    '#..........%...........#####.......................#',
    '#..g.....$.%...........#####..k.......n.........N..#',
    '#....a.....%......y....#####.......................#',
    '#.......O..%...........#####...y............n......#',
    '#.G........%...........#####.......................#',
    '#..........%....n......#####.g.............%%%%%%%%#',
    '#.........n%...........#####.............g.%.......#',
    '#....y.....%...........#####........y......%...E...#',
    '#..................N...#####...............%.....*.#',
    '#.............O........#####...............+.......#',
    '#......................#####............O..+.......#',
    '#...n...............y..#####.....n.........%.......#',
    '#..z........g....f...k.#####..F....g.......%.$...l.#',
    '#......................#####.m.......$.....%.......#',
    '####################################################'
  ] });
def('floors', 'f5', { "name": "THE CHOIR OF TEETH", "realm": "ossuary", "no": 5, "music": "ossuary", "par": 200, "rank": 2, "genRank": 3, "intro": "floor_5", "specials": ["witchwater", "ironbrew"], "demo": {"at": [27, 22]},
  rows: [
    '########################################################',
    '########################m.......####....$.....*....#####',
    '########################..t...k..................E.#####',
    '########################........####........$......#####',
    '########################........########################',
    '###########################++###########################',
    '##########........##................##........##########',
    '##########...!..g.##................##.G.!....##########',
    '##########....!...##.%.....F......%.##....!...##########',
    '##########.o......##...g........g...##.o......##########',
    '##########...!....##................##...!....##########',
    '##########....!...##................##....!..f##########',
    '##########...........%...y....y...%...........##########',
    '##########...!.........................y.!....##########',
    '##.......#....!.G.##................##....!...#.......##',
    '##.$.....#.L......##............o...##......L.#.$.....##',
    '##....$..#...!....##.%............%.##...!....#....$..##',
    '##.......|....!...##..g.............##....!...|.......##',
    '##.u.*...|k.......##.......B........##.......j|...*.u.##',
    '##.......#...!....##................##...!....#.......##',
    '##..$....#....!.o.##.%...y.......g%.##....!.o.#..$....##',
    '##.....$.#........##...o............##........#.....$.##',
    '##.......#...!...........................!....#.......##',
    '##########....!...........................!...##########',
    '##########........##.%.....y......%.##........##########',
    '##########...!...j##....g......g....##...!..y.##########',
    '##########....!...##................##....!...##########',
    '##########..o.....##................##..o.....##########',
    '##########...!....##.%.f....m...f.%.##...!....##########',
    '##########.m..!g..##................##m...!..F##########',
    '##########........##................##........##########',
    '##########################....##########################',
    '####.........#############....##########################',
    '####....$....#########............######################',
    '####..k......#########............######################',
    '####..............................######################',
    '####......f...............@@@@....######################',
    '####.........#########............######################',
    '######################............######################',
    '########################################################'
  ] });
def('floors', 'f6', { "name": "THE CRYPT OF PICKLED KINGS", "realm": "ossuary", "no": 6, "music": "ossuary", "par": 220, "rank": 2, "genRank": 3, "intro": "floor_6", "specials": ["ogreale"], "amulets": ["stench"], "points": {"escape": [[4, 4], [51, 4], [4, 32], [51, 32]]}, "demo": {"at": [27, 30]},
  rows: [
    '########################################################',
    '####################.w............8.####################',
    '####################.....$.....$....####################',
    '###########################??###########################',
    '#..#................................................#..#',
    '#w.#.....x........G.....o.....o...........g...x.....#.w#',
    '#..#.g............................................g.#..#',
    '#..?................................................?..#',
    '#..#..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%#..#',
    '#.u#..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%#*.#',
    '#..#................................................#..#',
    '####......S....n.....y..g........n..m........n......####',
    '####................................................####',
    '####.k............................................k.####',
    '####..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%####',
    '####..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%####',
    '####................................................####',
    '####.f......o........n..F..y...........n..o..y......####',
    '####................................................####',
    '####................................................####',
    '####..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%f%####',
    '####..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%####',
    '####................................................####',
    '####.....y.....n.....m.....n..g.....N..y.....S......####',
    '####................................................####',
    '####.k..............................................####',
    '####..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%####',
    '####..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%..%%%%####',
    '####................................................####',
    '####........g..y..o...........L..n..o...............####',
    '####....x......................................x....####',
    '####.g.....................f......................g.####',
    '####................................................####',
    '##########..###############..###########################',
    '####.............##########..###########............####',
    '####..m........$.##########..###########..*.......f.####',
    '####......v......##########..###########............####',
    '####.............##########..###########............####',
    '####.............#######........########............####',
    '####.............Y..............+......Y........E...####',
    '####.$......a....Y........@@@@..+......Y....k.......####',
    '####.............#######........########............####',
    '########################........########################',
    '########################################################'
  ] });
def('floors', 't2', { "name": "THE RELIQUARY", "realm": "ossuary", "treasure": true, "music": "hoard", "par": 30, "intro": "floor_t2", "chest": {"16,11": "special:deeppockets"},
  rows: [
    '################################',
    '#..............................#',
    '#...$....$$....$*.....$.....$..#',
    '#..........................*...#',
    '#.....%.....%......%.....%.....#',
    '#.....%.....%......%.....%.....#',
    '#.....%.....%......%.....%.....#',
    '#...$.%..$$.%..$...%..$..%..$..#',
    '#.....%.....%......%.....%.....#',
    '#.....%.....%.*....%.....%.....#',
    '#..............................#',
    '#.@@....*.......l....*.........#',
    '#.@@........................E..#',
    '#.........*.....w......*.......#',
    '#.....%.....%......%.....%.....#',
    '#.....%.....%.....*%.....%.....#',
    '#...$.%..$$.%..$...%..$..%..$..#',
    '#.....%.....%......%.....%.....#',
    '#.....%.....%......%.....%.....#',
    '#.....%.....%......%.....%.....#',
    '#.k........................*...#',
    '#...$....$$....$*.....$.....$..#',
    '#..............................#',
    '################################'
  ] });
def('floors', 'f7', { "name": "THE OVEN STAIR", "realm": "furnace", "no": 7, "music": "furnace", "par": 220, "rank": 2, "genRank": 3, "intro": "floor_7", "specials": ["featherfoot"], "amulets": ["ironskin"], "demo": {"at": [12, 4]},
  rows: [
    '########################################################',
    '#.....................................................k#',
    '#.@@........$...L.............I.....................u..#',
    '#.@@................i...................i..............#',
    '#...........................$.......n..................#',
    '#.............n........................................#',
    '#........................o....i...................n....#',
    '#.....................m.....................o........*.#',
    '#......................................................#',
    '#########~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~...~~~~~~#',
    '#########~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~s..~~~~~~#',
    '#########~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~..s~~~~~~#',
    '#########~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~...~~~~~~#',
    '#.*....................................................#',
    '#.............................n.......$.............N..#',
    '#........................i...................i.........#',
    '#..............i.....................................f.#',
    '#...................I..................................#',
    '#...a.....n........................i..............n....#',
    '#...................o..........j........o...........m..#',
    '#k.....................................................#',
    '#~~~~~...~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#########',
    '#~~~~~s..~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#########',
    '#~~~~~..s~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#########',
    '#~~~~~...~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#########',
    '#......................................................#',
    '#.......$.................o............................#',
    '#...................i.................I.i..............#',
    '#.N............n............................L..........#',
    '#.............................i.................o......#',
    '#..f........m...........j...........n..................#',
    '#.................*...................................k#',
    '###..####~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~...~~~~~~~~~~~~#',
    '###++####~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~s.s~~~~~~~~~~~~#',
    '###..####~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~...~~~~~~~~~~~~#',
    '#...............................................#....*.#',
    '#...........i............I..$...............n...+......#',
    '#...................n.........f....i............+.m.E..#',
    '#...............................................#.$....#',
    '########################################################'
  ] });
def('floors', 'f8', { "name": "THE GRISTLE GATE", "realm": "furnace", "no": 8, "music": "furnace", "par": 260, "rank": 3, "genRank": 3, "intro": "floor_8", "specials": ["quickshot"], "amulets": ["rending"], "demo": {"at": [12, 4]},
  rows: [
    '################################################################',
    '#........#######################################################',
    '#.@@........................g........f..........m..............#',
    '#.@@................n...........y.............n.........x......#',
    '#.................m...........$...n.........G..................#',
    '#..............i......j...N.............o...........g........k.#',
    '#........#################################################....##',
    '##########################################################....##',
    '##########################################################....##',
    '##########################################################..O.##',
    '#########........................g..!..........................#',
    '#########...f............n............$......i.........n.......#',
    '#########.........g.....................n.........N............#',
    '#########.k.........y...m...G.....j.!...........o...........u..#',
    '#########....###################################################',
    '#########....###################################################',
    '#########....###################################################',
    '#########....###################################################',
    '#########...................................|.............f....#',
    '#########.......n.....$.............i.......|.....n............#',
    '#########.....x...............n.I...........|.j.............g..#',
    '#########.a.............o.................y.|.......m...L....k.#',
    '##########################################################....##',
    '##########################################################....##',
    '##########################################################....##',
    '##########################################################....##',
    '#########.........O.........s..................................#',
    '#########.............n...............N.............i..........#',
    '#########...........G.......g.m.............n.F................#',
    '#########.k.f................s....y...................$...o....#',
    '#########....###################################################',
    '#########....###################################################',
    '#########....###################################################',
    '#########....###################################################',
    '#########...............................s.......g..............#',
    '#########.................o.......................x............#',
    '#########.......g.............S.........f...................t..#',
    '#########...........m....................si...................k#',
    '#########++++###################################################',
    '#########......................+....................n..........#',
    '#########...........n..........+....n...*.................E....#',
    '#########.....f...........n....+.............n....*.........f..#',
    '#########......................+........................w......#',
    '################################################################'
  ] });
def('floors', 'f9', { "name": "THE BANQUET OF KING FAMISH", "realm": "banquet", "no": 9, "music": "king", "par": 300, "rank": 2, "genRank": 2, "intro": "floor_9", "boss": true, "points": {"wave": [[2, 15], [41, 15], [11, 29], [32, 29]]}, "demo": {"at": [21, 24]},
  rows: [
    '############################################',
    '#..........................................#',
    '#.f..................K...................f.#',
    '#..........................................#',
    '#..........................................#',
    '#..........................................#',
    '#.....%..............................%.....#',
    '#..........................................#',
    '#..........................................#',
    '#m.........................................#',
    '#..........................................#',
    '#..........................................#',
    '#.....%..............................%.....#',
    '#..........................................#',
    '#.............====U==P========.............#',
    '#.............================.............#',
    '#.............==P========U=P==.............#',
    '#..........................................#',
    '#.....%..............................%.....#',
    '#..........................................#',
    '#.........................................m#',
    '#..........................................#',
    '#..........................................#',
    '#..........................................#',
    '#.....%..............................%.....#',
    '#..........................................#',
    '#..........................................#',
    '#..........................................#',
    '#...................@@@@...................#',
    '#.f......................................f.#',
    '#..........................................#',
    '############################################'
  ] });

// ---- 20-level.js ----
/* ---- LEVELS: a floor is def('floors', id, { rows, meta... }). The parser turns its rows into a TileMap and lists ---- */
// Wall type ids in every realm's TileMap
const WT = { wall: 1, accent: 2, cracked: 3, door: 4, trapA: 5, trapB: 6, table: 7, fake: 8 };
const WALL_H = 24;
/** realm looks: wall faces and tops, floor palettes, ambient light, props for the corners */
const REALM_LOOK = {
  larder: { wall: { face: 'stone', roof: 'slab', top: '#5e5650', side: '#86796c', course: 7 }, accent: { face: 'plank', roof: 'plain', top: '#5a3a22', side: '#7a5434' },
    floor: ['#7a5232', '#8a5e3a', '#9a6a42', '#6a4428', '#b07a4c'], mortar: '#3a2414', alt: ['#6a2e24', '#8a3a2e', '#a85a3a'], ambient: .6, light: '#ffb060', planks: true,
    props: ['barrel', 'keg', 'sacks', 'crate', 'rack', 'candles'] },
  ossuary: { wall: { face: 'ruin', roof: 'slab', top: '#b8ae98', side: '#a49a86', course: 8 }, accent: { face: 'stone', roof: 'slab', top: '#e0d6c0', side: '#ece2cc', course: 4 },
    floor: ['#3c4250', '#454c5c', '#4e5668', '#343a46', '#5e6678'], mortar: '#1c2028', alt: ['#6a6658', '#7a7464', '#8a8470'], ambient: .5, light: '#8ab0ff',
    props: ['coffin', 'bones', 'skull', 'jar', 'candles', 'urn'] },
  furnace: { wall: { face: 'brick', roof: 'slab', top: '#7a4436', side: '#8a4a3a', course: 6 }, accent: { face: 'stone', roof: 'plain', top: '#3a3a42', side: '#4a4a54', course: 5 },
    floor: ['#3a3438', '#443c40', '#4e4448', '#30292c', '#665a5e'], mortar: '#161214', alt: ['#3a3a42', '#46464e', '#52525c'], ambient: .44, light: '#ff8a3a',
    props: ['brazier', 'firedrum', 'anvil', 'chains', 'barrel'] },
  banquet: { wall: { face: 'stone', roof: 'slab', top: '#6a5a7a', side: '#7a6a8a', course: 8 }, accent: { face: 'plank', roof: 'plain', top: '#5a2a3a', side: '#6a3448' },
    floor: ['#b8aca0', '#c4b8ac', '#aca094', '#3a2a40', '#d8ccc0'], mortar: '#2a1e2e', alt: ['#6a5468', '#745e72', '#5a2a4a'], ambient: .55, light: '#ffd070',
    props: ['candelabra', 'banner', 'pillar'] }
};
/** the legend: what each character is. Walls (wall types), floors with things on them, and floor tags */
const WALL_CH = { '#': WT.wall, '%': WT.accent, 'X': WT.cracked, '+': WT.door, 'T': WT.trapA, 'Y': WT.trapB, '=': WT.table, 'P': WT.table, 'U': WT.table, '?': WT.fake };
const FLOOR_CH = '.,@E23456789O!s|-~^vkfbjzmua$*hlwBgnoiyxtGNLIFSK';
const LEGEND_CHARS = Object.keys(WALL_CH).join('') + FLOOR_CH;

/** parse a floor def into its parts (pure data: the tests, the validator and the world all read it) */
function parseFloor(F) {
  const rows = F.rows, h = rows.length, w = rows[0].length, at = (cx, cy) => cy >= 0 && cy < h && cx >= 0 && cx < w ? rows[cy][cx] : '#';
  const out = { id: F.id, w, h, starts: [], stairs: [], items: [], monsters: [], gens: [], doors: [], plates: [], trapWalls: { '^': [], 'v': [] }, pads: [], runes: [], spikes: [], beams: [],
    cracked: [], fake: [], lava: [], tables: [], bell: null, king: null, errors: [] };
  let sp = 0, am = 0, iid = 1;
  const ranks = F.ranks || {}, rankAt = (cx, cy, d) => ranks[cx + ',' + cy] || d;
  for (let cy = 0; cy < h; cy++) {
    if (rows[cy].length !== w) out.errors.push('row ' + cy + ' is ' + rows[cy].length + ' wide, not ' + w);
    for (let cx = 0; cx < w; cx++) {
      const c = rows[cy][cx];
      if (!LEGEND_CHARS.includes(c)) { out.errors.push('unknown character "' + c + '" at ' + cx + ',' + cy); continue; }
      if (c === '@') out.starts.push({ cx, cy });
      else if (c === 'E') out.stairs.push({ cx, cy, to: null });
      else if (c >= '2' && c <= '9') out.stairs.push({ cx, cy, to: +c });
      else if (c === 'O') out.pads.push({ cx, cy });
      else if (c === '!') out.runes.push({ cx, cy });
      else if (c === 's') out.spikes.push({ cx, cy });
      else if (c === '|' || c === '-') out.beams.push({ cx, cy, dir: c === '|' ? 'v' : 'h' });
      else if (c === '~') out.lava.push({ cx, cy });
      else if (c === '^' || c === 'v') out.plates.push({ cx, cy, kind: c });
      else if (c === 'T') out.trapWalls['^'].push({ cx, cy });
      else if (c === 'Y') out.trapWalls['v'].push({ cx, cy });
      else if (c === 'X') out.cracked.push({ cx, cy });
      else if (c === '?') out.fake.push({ cx, cy });
      else if (c === 'B') out.bell = { cx, cy };
      else if (c === 'K') out.king = { cx, cy };
      else if (c === '=' || c === 'P' || c === 'U') out.tables.push({ cx, cy });
      if (ITEM_BY_CH[c]) {
        const type = ITEM_BY_CH[c], it = { id: iid++, type, cx, cy };
        if (type === 'special') { it.sub = (F.specials || [])[sp++]; if (!it.sub) out.errors.push('a "u" at ' + cx + ',' + cy + ' has no entry in specials'); }
        if (type === 'amulet') { it.sub = (F.amulets || [])[am++]; if (!it.sub) out.errors.push('an "a" at ' + cx + ',' + cy + ' has no entry in amulets'); }
        out.items.push(it);
      } else if (c !== 'K' && c !== 'B') iid++;   // (ids in reading order: every copy derives the same ids from the same rows)
      if (MON_BY_CH[c]) out.monsters.push({ type: MON_BY_CH[c], cx, cy, rank: get('monsters', MON_BY_CH[c]).rank1 ? 1 : rankAt(cx, cy, F.rank || 1) });
      if (GEN_BY_CH[c]) out.gens.push({ type: GEN_BY_CH[c], cx, cy, rank: rankAt(cx, cy, F.genRank || 1) });
    }
  }
  if (sp !== (F.specials || []).length) out.errors.push('specials lists ' + (F.specials || []).length + ' but the rows have ' + sp + ' "u"');
  if (am !== (F.amulets || []).length) out.errors.push('amulets lists ' + (F.amulets || []).length + ' but the rows have ' + am + ' "a"');
  // door runs: 4-connected '+' cells open together
  const seen = new Set();
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
    if (at(cx, cy) !== '+' || seen.has(cx + ',' + cy)) continue;
    const cells = [], q = [[cx, cy]]; seen.add(cx + ',' + cy);
    while (q.length) { const [x, y] = q.pop(); cells.push([x, y]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (at(x + dx, y + dy) === '+' && !seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); } } }
    out.doors.push({ id: out.doors.length, cells });
  }
  // starts padded to four on free neighbours
  const free = (cx, cy) => '.,'.includes(at(cx, cy)) && !out.starts.some(s => s.cx === cx && s.cy === cy);
  for (let i = 0; out.starts.length && out.starts.length < 4 && i < 40; i++) { const s = out.starts[i % out.starts.length]; for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]]) if (out.starts.length < 4 && free(s.cx + dx, s.cy + dy)) out.starts.push({ cx: s.cx + dx, cy: s.cy + dy }); }
  return out;
}

/** the rows as a TileMap legend: walls by type; every floor char a floor tag the floor texture paints */
function mapLegend() {
  const L = {};
  for (const c in WALL_CH) L[c] = WALL_CH[c];
  for (const c of FLOOR_CH) L[c] = { floor: c === ',' ? 'alt' : c === '~' ? 'lava' : c === 'E' || (c >= '2' && c <= '9') ? 'stairs' : 'floor', block: c === '~' };
  return L;
}
/** a realm's wall types for its TileMap */
function realmTypes(realm) {
  const R = REALM_LOOK[realm], cut = { cut: true, cutH: 6 };
  const bars = face => { const s = face.side; if (s !== 's' && s !== 'n' && s !== 'e' && s !== 'w') return; for (let u = Math.ceil(face.u0 / 3) * 3; u < face.u1; u += 3) face.quad(u, face.z0, u + 1.2, face.z1, '#2a2a30'); face.quad(face.u0, face.z1 - 3, face.u1, face.z1 - 1.6, '#6a6a78'); face.quad(face.u0, face.z0 + 4, face.u1, face.z0 + 5.4, '#6a6a78'); };
  const runes = color => face => { const mz = (face.z0 + face.z1) / 2, mu = (face.u0 + face.u1) / 2; face.quad(mu - 3, mz - .6, mu + 3, mz + .6, color); face.quad(mu - .6, mz - 3, mu + .6, mz + 3, color); };
  return {
    [WT.wall]: Object.assign({ h: WALL_H }, cut, R.wall),
    [WT.fake]: Object.assign({ h: WALL_H }, cut, R.wall),
    [WT.accent]: Object.assign({ h: WALL_H }, cut, R.accent),
    [WT.cracked]: Object.assign({ h: WALL_H }, cut, R.wall, { face: 'ruin', top: E.shade(R.wall.top, -.15), side: E.shade(R.wall.side, -.2) }),
    [WT.door]: { h: WALL_H, cut: true, cutH: 8, face: 'none', roof: 'plain', top: '#4a4a56', side: '#14141a', decorate: bars },
    [WT.trapA]: Object.assign({ h: WALL_H }, cut, R.wall, { top: E.shade(R.wall.top, .08), side: E.shade(R.wall.side, -.1), decorate: runes('#e8c060') }),
    [WT.trapB]: Object.assign({ h: WALL_H }, cut, R.wall, { top: E.shade(R.wall.top, .08), side: E.shade(R.wall.side, -.1), decorate: runes('#6ae8e0') }),
    [WT.table]: { h: 10, face: 'plank', roof: 'plain', top: '#8a5a32', side: '#6a4224' }
  };
}

/* ---- the validator: every floor is checked by the tests (and by Dev Tools' warp): shape, legend, and SOLVABLE ---- */
function validateFloor(F) {
  const p = parseFloor(F), errs = p.errors.slice(), w = p.w, h = p.h, rows = F.rows, at = (cx, cy) => cy >= 0 && cy < h && cx >= 0 && cx < w ? rows[cy][cx] : '#';
  if (w < 24 || w > 72 || h < 16 || h > 48) errs.push('size ' + w + 'x' + h + ' is outside 24-72 x 16-48');
  for (let cx = 0; cx < w; cx++) if (!'#%'.includes(at(cx, 0)) || !'#%'.includes(at(cx, h - 1))) { errs.push('the top and bottom rows must be walls (column ' + cx + ')'); break; }
  for (let cy = 0; cy < h; cy++) if (!'#%'.includes(at(0, cy)) || !'#%'.includes(at(w - 1, cy))) { errs.push('the side columns must be walls (row ' + cy + ')'); break; }
  if (!p.starts.length || p.starts.length > 4) errs.push('a floor needs 1-4 starts (@)');
  if (!p.stairs.length && !F.treasure && !F.boss) errs.push('no stairs');
  if (p.pads.length % 2) errs.push('transporter pads come in pairs');
  for (const s of p.stairs) if (s.to && !FLOOR_ORDER.some(id => get('floors', id) && get('floors', id).no === s.to)) errs.push('skip stairs to floor ' + s.to + ' lead nowhere');
  for (const g of p.gens) for (const s of p.starts) if (Math.abs(g.cx - s.cx) + Math.abs(g.cy - s.cy) < 4) errs.push('a generator at ' + g.cx + ',' + g.cy + ' is within 4 tiles of a start');
  for (const b of p.beams) { const [dx, dy] = b.dir === 'v' ? [0, 1] : [1, 0]; let ok = 0; for (const s of [-1, 1]) { let x = b.cx, y = b.cy; while ('|-'.includes(at(x, y))) { x += dx * s; y += dy * s; } if ('#%'.includes(at(x, y))) ok++; } if (ok < 2) { errs.push('the force field at ' + b.cx + ',' + b.cy + ' must run wall to wall'); break; } }
  // SOLVABLE: flood from the starts; plates drop their walls; pads carry; doors open while keys found exceed keys spent
  const key = (x, y) => x + ',' + y, open = new Set(), walls = new Set(), keys = new Set(p.items.filter(i => i.type === 'key').map(i => key(i.cx, i.cy)));
  const solid = c => '#%=PU'.includes(c);
  const blockedDeco = new Set(decorate(F, p).deco.map(d => key(d.cx, d.cy)));
  const walk = (x, y) => { const c = at(x, y); if (blockedDeco.has(key(x, y))) return false; if (walls.has(key(x, y))) return true; return !(solid(c) || c === '+' || c === 'T' || c === 'Y' || c === '~'); };
  const reach = new Set(); let got = 0, spent = 0, plates = new Set();
  const padOf = (x, y) => { const i = p.pads.findIndex(q => q.cx === x && q.cy === y); return i < 0 ? null : p.pads[i ^ 1]; };
  const flood = () => {
    const q = [...reach].map(k => k.split(',').map(Number));
    if (!q.length) for (const s of p.starts) { reach.add(key(s.cx, s.cy)); q.push([s.cx, s.cy]); }
    while (q.length) {
      const [x, y] = q.pop(), c = at(x, y);
      if (keys.has(key(x, y))) { keys.delete(key(x, y)); got++; }
      if ((c === '^' || c === 'v') && !plates.has(c)) { plates.add(c); for (const t of p.trapWalls[c]) walls.add(key(t.cx, t.cy)); for (const t of p.trapWalls[c]) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (reach.has(key(t.cx + dx, t.cy + dy))) { if (!reach.has(key(t.cx, t.cy))) { reach.add(key(t.cx, t.cy)); q.push([t.cx, t.cy]); } } }
      const pad = c === 'O' && padOf(x, y); if (pad && pad.cx !== undefined && !reach.has(key(pad.cx, pad.cy))) { reach.add(key(pad.cx, pad.cy)); q.push([pad.cx, pad.cy]); }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = key(nx, ny); if (!reach.has(k) && walk(nx, ny)) { reach.add(k); q.push([nx, ny]); } }
    }
  };
  flood();
  for (let guard = 0; guard < 60; guard++) {   // open the door run next to the filled area, while keys remain
    if (got - spent <= 0) break;
    const d = p.doors.find(d => !open.has(d.id) && d.cells.some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach.has(key(x + dx, y + dy)))));
    if (!d) break;
    open.add(d.id); spent++; for (const [x, y] of d.cells) { walls.add(key(x, y)); reach.add(key(x, y)); }
    flood();
  }
  const stairsOk = F.treasure || F.boss || p.stairs.some(s => !s.to && reach.has(key(s.cx, s.cy)));
  if (!stairsOk) errs.push('the stairs cannot be reached with the floor\'s own keys');
  if (F.boss && p.king && !reach.has(key(p.king.cx, p.king.cy + 2)) && !reach.has(key(p.king.cx, p.king.cy))) errs.push('the King cannot be reached');
  // NO DEAD CONTENT: with every door and trap open, every item, monster and generator can be reached
  for (const d of p.doors) for (const [x, y] of d.cells) walls.add(key(x, y));
  for (const c of '^v') for (const t of p.trapWalls[c]) walls.add(key(t.cx, t.cy));
  flood();
  if (!F.sealedOk) for (const t of [...p.items, ...p.monsters, ...p.gens]) {
    const ok = reach.has(key(t.cx, t.cy)) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach.has(key(t.cx + dx, t.cy + dy)));
    if (!ok) { errs.push('dead content: ' + (t.type || '?') + ' at ' + t.cx + ',' + t.cy + ' cannot be reached'); break; }
  }
  return { ok: !errs.length, errors: errs, parsed: p, keys: got, doors: p.doors.length };
}

/** automatic decoration: torches on wall faces, realm props in room corners (deterministic: E.hash2). Corner props block
 *  their cell (map.block), so the validator checks them too */
function decorate(F, p) {
  const rows = F.rows, w = p.w, h = p.h, at = (cx, cy) => cy >= 0 && cy < h && cx >= 0 && cx < w ? rows[cy][cx] : '#', wall = c => '#%'.includes(c), R = REALM_LOOK[F.realm || 'larder'];
  const busy = new Set([...p.starts, ...p.stairs, ...p.items, ...p.monsters, ...p.gens, ...p.plates, ...p.pads, ...p.runes, ...p.spikes, ...p.beams].map(t => t.cx + ',' + t.cy));
  const torches = [], deco = [];
  for (let cy = 1; cy < h - 1; cy++) for (let cx = 1; cx < w - 1; cx++) {
    const c = at(cx, cy), v = E.hash2(cx * 13 + 7, cy * 7 + 3);
    if (wall(c) && '.,'.includes(at(cx, cy + 1)) && wall(at(cx - 1, cy)) && wall(at(cx + 1, cy)) && v < .2 && !torches.some(t => Math.abs(t.cx - cx) < 3 && t.cy === cy)) torches.push({ cx, cy });
    if (c !== '.' && c !== ',') continue; if (busy.has(cx + ',' + cy)) continue;
    const n = wall(at(cx, cy - 1)), s = wall(at(cx, cy + 1)), e = wall(at(cx + 1, cy)), wv = wall(at(cx - 1, cy));
    const corner = (n || s) && (e || wv) && !(n && s) && !(e && wv), across = at(cx + (e ? -1 : 1), cy + (n ? 1 : -1));
    const roomy = '.,'.includes(across) && '.,'.includes(at(cx + (e ? -2 : 2), cy)) && '.,'.includes(at(cx, cy + (n ? 2 : -2)));
    if (corner && roomy && v < .55) deco.push({ cx, cy, prop: R.props[Math.floor(E.hash2(cx, cy * 3) * R.props.length)], facing: (n ? Math.PI / 2 : -Math.PI / 2) });
  }
  return { torches, deco };
}

// ---- 21-sim.js ----
/* ---- THE SIMULATION: one world, one place. Roles: 'local' (solo and couch co-op), 'attract', 'host' and 'server' run
   everything; a 'client' moves only its own hero and shows the rest from the host's snapshots ---- */


function newHero(seat, cls, o = {}) {
  const D = get('heroes', cls);
  return Object.assign(new E.Body({ x: 0, y: 0, r: 5 }), {
    id: seat, seat, cls, D, name: o.name || 'P' + (seat + 1), color: o.color || SEAT_COLORS[seat], input: o.input || null, bot: o.bot || null, remote: !!o.remote,
    hp: startHealth(), score: 0, keys: 0, flasks: 0, specials: {}, amulet: null, alive: true, deadT: 0, continues: 0,
    facing: Math.PI / 2, aim: Math.PI / 2, aimAt: null, stun: 0, runeImmune: 0, queasy: 0, inv: 0, cool: 0, grace: {}, hurtT: 0, eatT: 0, castT: 0, throwT: 0, riseT: 0,
    stair: 0, padLock: -1, pushT: 0, pushCell: null, wallStair: 0, drained: 0, onMenu: 0, joinT: 0,
    combo: new E.Combo(D.melee.moves.map(m => new E.Attack(m, { hold: .1 })), { window: .35 }),
    intent: { move: [0, 0], aim: null, fire: false, magic: false, plant: false },
    stats: { kills: 0, treasure: 0, food: 0, floors: 0, foodShot: 0, gens: 0 }, deepest: 1, warned: {}
  });
}
const heroLimit = h => h.specials.deeppockets ? 12 : 9;
const liveHeroes = () => W ? W.heroes.filter(h => h.alive) : [];

/** build the world for a floor (FLOOR_ORDER index) with the party placed on its starts */
function buildWorld(index, o = {}) {
  const id = FLOOR_ORDER[index], F = get('floors', id), p = parseFloor(F), dec = decorate(F, p), realm = F.realm || 'larder';
  const descent = (RUN && RUN.descent) || 1;
  const map = new E.TileMap({ rows: F.rows, legend: mapLegend(), types: realmTypes(realm), floorTex: floorTexFor(realm, F), ao: 6, outside: '#05040a' });
  for (const d of dec.deco) map.block(d.cx, d.cy, true);
  const w = {
    F, p, id, index, realm, map, descent, role: o.role || 'local', auth: o.role !== 'client', serial: (o.serial || 0),
    t: 0, real: 0, nextId: 1000, heroes: [], monsters: [], gens: [], items: [], fx: [], dec,
    shots: new E.Bullets(game, { plane: 'ground', sparks: true }), eshots: new E.Bullets(game, { plane: 'ground', sparks: true }),
    flow: new E.FlowField(map), bellFlow: new E.FlowField(map), fleeFlows: {},
    doors: p.doors.map(d => Object.assign({ open: false, openT: 0 }, d)), plates: p.plates.map(q => Object.assign({ used: false }, q)),
    pads: p.pads, runes: p.runes, spikes: p.spikes.map(s => Object.assign({ phase: E.hash2(s.cx, s.cy) * 1.6 }, s)), beams: beamGroups(p),
    cracked: new Map(p.cracked.map(c => [c.cx + ',' + c.cy, 4])), fake: new Set(p.fake.map(c => c.cx + ',' + c.cy)),
    stairs: p.stairs, bell: p.bell ? { x: mid(p.bell.cx), y: mid(p.bell.cy), rung: false, target: null, t: 0, swing: 0 } : null,
    impatience: 0, titheDone: false, treasure: F.treasure ? { t: TUNE.hoardTime, total: 0 } : null, boss: null,
    done: null, over: false, events: [], devUsed: !!(RUN && RUN.dev), firsts: {}, magicFlash: 0, quake: 0
  };
  W = w;
  rng.seed((o.seed || 1) * 7919 + index * 104729 + descent * 31);
  // items: ids in reading order (the same on every copy)
  for (const it of p.items) {
    const D = get('items', it.type); if (!D) continue;
    w.items.push({ id: it.id, type: it.type, D, x: mid(it.cx), y: mid(it.cy), z: D.onTable ? 10 : 0, cx: it.cx, cy: it.cy, sub: it.sub, gone: false, open: false, t: E.hash2(it.cx, it.cy) * 6 });
  }
  if (w.treasure) w.treasure.total = w.items.filter(i => ['treasure', 'chest'].includes(i.D.kind)).length;
  const up = descent > 1 ? 1 : 0;
  p.gens.forEach((g, i) => addGen(g.type, mid(g.cx), mid(g.cy), Math.min(3, g.rank + up), 500 + i));   // on every copy, the same ids
  if (F.boss && p.king) startBoss(mid(p.king.cx), mid(p.king.cy));
  if (w.auth) for (const m of p.monsters) spawnMonster(m.type, mid(m.cx), mid(m.cy), Math.min(3, m.rank + up), { asleep: true });
  // heroes on the starts
  const starts = p.starts.map(s => ({ x: mid(s.cx), y: mid(s.cy) }));
  PARTY.forEach((h, i) => { placeHero(h, starts[i % starts.length]); w.heroes.push(h); });
  w.flow.updateMany(liveHeroes().length ? liveHeroes() : starts);
  bus.emit('floor', { w });
  return w;
}
function placeHero(h, s) {
  Object.assign(h, { x: s.x, y: s.y, z: 0, vx: 0, vy: 0, stair: 0, padLock: -1, stun: 0, queasy: 0, inv: 1, cool: .2, pushT: 0, wallStair: 0, drained: 0, onMenu: 0, grace: {}, sinkT: 0 });
  if (h.amulet) h.amulet.t = Math.min(h.amulet.t, AMULET_TIME);
  h.combo.cancel && h.combo.cancel();
}

/** force-field beams: runs of | or - cells, each run cycling on its own phase */
function beamGroups(p) {
  const left = new Set(p.beams.map(b => b.cx + ',' + b.cy)), groups = [];
  for (const b of p.beams) {
    if (!left.has(b.cx + ',' + b.cy)) continue;
    const cells = [], q = [b]; left.delete(b.cx + ',' + b.cy);
    while (q.length) { const c = q.pop(); cells.push(c); for (const n of p.beams) { const k = n.cx + ',' + n.cy; if (left.has(k) && n.dir === b.dir && Math.abs(n.cx - c.cx) + Math.abs(n.cy - c.cy) === 1) { left.delete(k); q.push(n); } } }
    groups.push({ dir: b.dir, cells, phase: (groups.length % 2) * 2, on: false });
  }
  return groups;
}

/* ---- events: the bus hears them at once; a host also sends them to the other copies ---- */
function emit(type, data, net) { bus.emit(type, data); if (W && W.role === 'host' && net) W.events.push(net); }
/** the Gaunt says a line (the narrator queue decides when); hero: who it is about */
function say(key, hero, prio, vars) { bus.emit('say', { key, hero, prio, vars }); if (W && W.role === 'host') W.events.push(['say', key, hero ? hero.id : -1, vars && vars.thing ? vars.thing : 0]); }
/** the first time something happens on this run (teaching tips); kept per game in RUN */
function first(what) { if (!RUN) return false; RUN.firsts = RUN.firsts || {}; if (RUN.firsts[what]) return false; RUN.firsts[what] = true; return true; }

/* ---- scoring ---- */
function award(h, points, at, why) {
  if (!h || !points) return;
  h.score += Math.round(points);
  bus.emit('points', { h, points: Math.round(points), at, why });
}

/* ---- the damage pipeline: one function for every hit ---- */
// kind: shot | melee | magic | blast | contact | drain | trap | fire
function damage(t, amount, o = {}) {
  if (!W || !W.auth || !t || t.dead) return 0;
  const by = o.by || null;
  if (t.isHero) return hurtHero(t, amount, o);
  if (t.isGen) return hurtGen(t, amount, by, o);
  if (t.isBoss) return hurtBoss(t, amount, by, o);
  const D = t.D;
  if (D.immune && o.kind !== 'magic' && o.kind !== 'blast') { emit('clink', { m: t }); return 0; }
  if (t.ai === 'fryar' && t.hidden && o.kind !== 'magic' && o.kind !== 'blast') return 0;
  if (CHEATS.onehit && by) amount = 999;
  if (D.immune) amount = 999;
  t.hp -= amount; t.hitT = .12;
  const rank = Math.max(1, Math.ceil(t.hp / D.hp));
  if (t.hp > 0 && rank < t.rank) { t.rank = rank; emit('shrink', { m: t }); }
  if (t.hp <= 0) killMonster(t, by, o.kind);
  else emit('hit', { m: t, by, kind: o.kind, amount });
  return amount;
}
function killMonster(m, by, kind) {
  if (m.dead) return;
  m.dead = true;
  const pts = m.D.points * (m.D.immune ? rng.int(1, 5) : m.spawnRank);
  if (by && by.isHero) { award(by, pts, m, 'kill'); by.stats.kills++; }
  if (m.gen) m.gen.children = Math.max(0, m.gen.children - 1);
  if (m.ai === 'snatcher' && m.loot) dropLoot(m);
  if (m.ai === 'tithe') say('tithe_slain', by);
  emit('kill', { m, by, kind, points: pts }, ['kill', m.id, by ? by.id : -1, pts]);
}

/** spawn a monster (rank 1-3); rise: seconds it climbs out of a generator */
function spawnMonster(type, x, y, rank, o = {}) {
  const D = get('monsters', type); if (!D) return null;
  rank = D.rank1 ? 1 : clamp(rank, 1, 3);
  const m = Object.assign(new E.Body({ x, y, r: D.r, friction: 0 }), {
    id: o.id || W.nextId++, type, D, ai: D.ai, rank, spawnRank: rank, hp: D.hp * rank, facing: Math.PI / 2, t: rng.r() * 2, cool: .5 + rng.r(), state: 'move', stateT: 0,
    rise: o.rise || 0, asleep: !!o.asleep, gen: o.gen || null, hitT: 0, grace: {}, wind: 0, hidden: false, drain: {}, home: o.home || null, loot: null, gape: 0
  });
  m.isMonster = true;
  if (D.fly) m.gravity = 0;
  W.monsters.push(m);
  emit('spawn', { m, gen: o.gen });
  return m;
}

/** the visible ground around a point (the user's screen) in world units { x0, y0, x1, y1 } */
function screenRect(h, half) {
  if (half) return { x0: h.x - half[0] * T, x1: h.x + half[0] * T, y0: h.y - half[1] * T, y1: h.y + half[1] * T };
  const v = game.view, c = game.cam;
  if (v && v.toGround && c && isFinite(c.x) && game.W > 0) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [sx, sy] of [[0, 0], [game.W, 0], [0, game.H], [game.W, game.H]]) { const q = v.toGround(c.x + sx, c.y + sy); if (!q) continue; x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    if (x1 > x0 && y1 > y0 && x1 - x0 < 2000) return { x0, y0, x1, y1 };
  }
  return { x0: h.x - 13 * T, x1: h.x + 13 * T, y0: h.y - 9 * T, y1: h.y + 9 * T };
}
const inRect = (q, R) => q.x >= R.x0 && q.x <= R.x1 && q.y >= R.y0 && q.y <= R.y1;

/* ---- one step of the world (1/120 s) ---- */
function stepWorld(dt) {
  if (!W || W.over) return;
  W.t += dt; W.real += dt;
  W.magicFlash = Math.max(0, W.magicFlash - dt); W.quake = Math.max(0, W.quake - dt);
  for (const h of W.heroes) stepHero(h, dt);
  if (W.auth) {
    stepGens(dt);
    stepMonsters(dt);
    if (W.boss) stepBoss(dt);
    separate(dt);
    stepShots(dt);
    stepFeatures(dt);
    for (const h of W.heroes) if (h.alive) { pickups(h); doors(h); }
    stairs(dt);
    timers(dt);
    E.prune(W.monsters, m => m.dead && (m.deadT = (m.deadT || 0) + dt) > .01);
  } else {
    stepClientShots(dt);
    for (const h of W.heroes) if (h.alive && !h.remote) clientPickups(h);
  }
  narratorTriggers(dt);
}

/** the floor's clocks: the Gaunt's impatience, the Tithe's arrival, the hoard */
function timers(dt) {
  const F = W.F, imp = TUNE.impatience;
  if (!F.treasure && !F.boss) {
    if (W.impatience < 1 && W.t >= imp - 30) { W.impatience = 1; say('impatient', null, 2); emit('impatience', { stage: 1 }, ['imp', 1]); }
    if (W.impatience < 2 && W.t >= imp) { W.impatience = 2; for (const d of W.doors) if (!d.open) openDoor(d, null); say('doors_open', null, 2); emit('impatience', { stage: 2 }, ['imp', 2]); }
    if (W.impatience < 3 && W.t >= imp + 60) { W.impatience = 3; say('walls_stairs', null, 2); emit('impatience', { stage: 3 }, ['imp', 3]); }
    if (!W.titheDone && (F.no >= 5 || W.descent > 1) && W.t >= TUNE.titheAt && !W.monsters.some(m => m.ai === 'tithe' && !m.dead)) { W.titheDone = true; summonTithe(); }
  }
  if (W.treasure) {
    W.treasure.t -= dt;
    if (W.treasure.t <= 0 && !W.done) { say('hoard_shut', null, 2); emit('hoardShut', {}, ['hoard']); W.done = { to: W.index + 1, by: null, why: 'hoard' }; }
  }
}
function summonTithe() {
  const live = liveHeroes(); if (!live.length) return;
  let best = null, bd = -1;
  for (let i = 0; i < 60; i++) { const cx = rng.int(1, W.p.w - 2), cy = rng.int(1, W.p.h - 2); if (!W.map.walkable(cx, cy) || W.map.cell(cx, cy)) continue; const d = Math.min(...live.map(h => Math.hypot(mid(cx) - h.x, mid(cy) - h.y))); if (d > bd && W.flow.distAt(mid(cx), mid(cy)) < 1e9) { bd = d; best = [cx, cy]; } }
  if (!best) return;
  spawnMonster('tithe', mid(best[0]), mid(best[1]), 1);
  say('tithe_comes', null, 2);
}

/** bodies block each other: monsters push apart softly; heroes are pushed out of monsters (a horde can box you in) */
const HASH = new E.SpatialHash(32);
function separate(dt) {
  const ms = W.monsters.filter(m => !m.dead && !m.rise);
  HASH.build(ms);
  for (const a of ms) {
    if (a.ai === 'tithe' || a.ai === 'ghost') continue;
    HASH.near(a.x, a.y, 14, b => {
      if (b === a || b.dead || b.ai === 'ghost' || b.ai === 'tithe') return;
      const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy), R = a.r + b.r - 1;
      if (d >= R || d < 1e-4) return;
      const k = (R - d) / d * .25; a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k;
    });
  }
  for (const h of W.heroes) {
    if (!h.alive) continue;
    HASH.near(h.x, h.y, 16, m => {
      if (m.dead || m.ai === 'ghost' || m.ai === 'tithe') return;
      const dx = h.x - m.x, dy = h.y - m.y, d = Math.hypot(dx, dy), R = h.r + m.r;
      if (d >= R || d < 1e-4) return;
      const over = R - d, ux = dx / d, uy = dy / d;
      h.x += ux * over * .3; h.y += uy * over * .3; m.x -= ux * over * .7; m.y -= uy * over * .7;
    });
    if (!CHEATS.noclip) W.map.collide(h);
    for (const g of W.gens) { if (g.dead) continue; const dx = h.x - g.x, dy = h.y - g.y, d = Math.hypot(dx, dy), R = h.r + g.r; if (d < R && d > 1e-4) { h.x += dx / d * (R - d); h.y += dy / d * (R - d); } }
  }
  for (const m of ms) { W.map.collide(m); for (const g of W.gens) { if (g.dead) continue; const dx = m.x - g.x, dy = m.y - g.y, d = Math.hypot(dx, dy), R = m.r + g.r; if (d < R && d > 1e-4 && m.ai !== 'ghost') { m.x += dx / d * (R - d); m.y += dy / d * (R - d); } } }
}

/** the run: start it, with these heroes ([{ cls, input, bot, name, color }]) */
function startRun(list, o = {}) {
  RUN = { descent: o.descent || 1, floorIndex: o.floor || 0, firsts: {}, dev: false, started: game.real, mode: o.mode || 'local', seed: o.seed || ((Math.random() * 1e9) | 0) };
  PARTY = list.map((q, i) => newHero(q.seat !== undefined ? q.seat : i, q.cls, q));
  PARTY.forEach(h => { h.hp = startHealth(); });
}
/** the next floor (after the stairs), or the ending past the last */
function nextFloorIndex(to) {
  if (typeof to === 'number' && to >= 0) return to;
  return W.index + 1;
}

// ---- 22-sim-heroes.js ----
/* ---- HEROES: intent -> movement, aim, fire (throw or smart melee), plant, magic; the drain; falling and rising ---- */
const AIM_ASSIST = { off: 0, low: 8 * Math.PI / 180, high: 16 * Math.PI / 180 };

function stepHero(h, dt) {
  h.isHero = true;
  const I = h.intent, own = W.auth || !h.remote;   // a client simulates only its own hero
  h.hurtT = Math.max(0, h.hurtT - dt); h.eatT = Math.max(0, h.eatT - dt); h.castT = Math.max(0, h.castT - dt); h.throwT = Math.max(0, h.throwT - dt); h.riseT = Math.max(0, h.riseT - dt);
  h.joinT = Math.max(0, h.joinT - dt);
  if (!h.alive) { h.deadT += dt; h.vx = h.vy = 0; return; }
  if (h.sinkT) return;   // going down the stairs
  if (!own) return;
  // the drain: every second on a floor, every living hero (triple inside the King's famine fog)
  if (W.auth && !CHEATS.god && !(W.role === 'attract')) {
    const fog = W.boss && W.boss.fog && inFog(h) ? 3 : 1;
    h.hp -= TUNE.drain * diff().drain * (W.descent > 1 ? 1.5 : 1) * fog * dt;
    if (h.hp <= 0) { fall(h); return; }
  }
  for (const k of ['stun', 'runeImmune', 'queasy', 'inv', 'cool', 'onMenu']) h[k] = Math.max(0, h[k] - dt);
  for (const k in h.grace) if ((h.grace[k] -= dt) <= 0) delete h.grace[k];
  if (h.amulet && (h.amulet.t -= dt) <= 0) { h.amulet = null; emit('amuletEnd', { h }); }
  const stunned = h.stun > 0, D = h.D;
  // movement
  let [mx, my] = I.move; const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  const starving = h.hp < 200 ? .92 : 1;
  const speed = D.speed * TUNE.heroSpeed * (h.specials.featherfoot ? 1.12 : 1) * (h.queasy > 0 ? .6 : 1) * starving;
  const planted = !!I.plant || stunned;
  if (ml > .1) h.facing = Math.atan2(my, mx);
  if (planted) { h.vx = h.vy = 0; } else { h.vx = mx * speed; h.vy = my * speed; }
  if (h.combo.busy && !planted) { h.vx *= .45; h.vy *= .45; }
  const ox = h.x, oy = h.y;
  if (CHEATS.noclip) { h.x += h.vx * dt; h.y += h.vy * dt; } else h.update(dt, W.map);
  h.x = clamp(h.x, T, (W.p.w - 1) * T); h.y = clamp(h.y, T, (W.p.h - 1) * T);
  leash(h, ox, oy);
  pushWalls(h, mx, my, dt);
  // aim: the intent's angle (right stick, mouse), else the way the hero faces; aim assist bends it to a target
  let aim = I.aim !== null && I.aim !== undefined ? I.aim : h.facing;
  const cone = AIM_ASSIST[game.settings.aimAssist] || 0;
  if (cone && W.auth) { const t = assistTarget(h, aim, cone); if (t) aim = Math.atan2(t.y - h.y, t.x - h.x); }
  h.aim = aim;
  // melee timing (the combo runs its phases; hits land in its active phase)
  const ph = h.combo.update(dt);
  if (ph === 'active') emit('swing', { h });
  if (h.combo.active && W.auth) meleeHits(h);
  if (stunned) return;
  // fire: held for auto-fire at the class's rate; at arm's length the hero strikes instead of throwing
  if (I.fire && h.cool <= 0) {
    const foe = meleeTarget(h, aim);
    if (foe) { h.combo.press(); h.cool = .42 / TUNE.shotRate; h.facing = aim; emit('melee', { h }); }
    else throwShot(h, aim);
  }
  if (I.magic) { I.magic = false; useMagic(h, I.view); }
}

/** local co-op: a hero can't stretch the shared screen past its edge (the party's box must fit the visible ground) */
function leash(h, ox, oy) {
  if (W.role !== 'local' || !W.leash || CHEATS.noclip) return;
  const others = W.heroes.filter(q => q.alive && q !== h && !q.remote); if (!others.length) return;
  const L2 = W.leash, xs = others.map(q => q.x), ys = others.map(q => q.y), span = (l, v) => Math.max(...l, v) - Math.min(...l, v);
  // only a step that stretches the party past the screen is held back (a party already apart may close up freely)
  if (span(xs, h.x) > L2[0] && span(xs, h.x) > span(xs, ox)) h.x = ox;
  if (span(ys, h.y) > L2[1] && span(ys, h.y) > span(ys, oy)) h.y = oy;
}

/** pushing into a wall: a door with a key, a fake wall (it was lying), or any wall once walls are stairs */
function pushWalls(h, mx, my, dt) {
  if (Math.hypot(mx, my) < .3) { h.pushT = 0; h.wallStair = 0; return; }
  const ax = Math.abs(mx) > Math.abs(my), dx = ax ? Math.sign(mx) : 0, dy = ax ? 0 : Math.sign(my);
  const cx = cellOf(h.x + dx * (h.r + 3)), cy = cellOf(h.y + dy * (h.r + 3)), c = W.map.cell(cx, cy), k = cx + ',' + cy;
  if (!c) { h.pushT = 0; h.wallStair = 0; return; }
  if (!W.auth) return;
  if (W.fake.has(k)) { h.pushT += dt; if (h.pushT > .15) { revealFake(cx, cy, h); h.pushT = 0; } return; }
  if (W.impatience >= 3 && c !== WT.table && cx > 0 && cy > 0 && cx < W.p.w - 1 && cy < W.p.h - 1) {
    h.wallStair += dt; if (h.wallStair >= 1 && !W.done) { descend(h, null); }
  }
}
function revealFake(cx, cy, h) {
  const k = cx + ',' + cy; if (!W.fake.has(k)) return;
  W.fake.delete(k); W.map.set(cx, cy, 0);
  if (first('secret')) say('tip_secret', h, 1);
  emit('wall', { cx, cy, kind: 'fake' }, ['wall', cx, cy]);
}

/** the nearest monster or generator inside the aim cone (aim assist) */
function assistTarget(h, aim, cone) {
  let best = null, bd = 200 * 200;
  const look = q => { if (q.dead || q.hidden) return; const d = dist2(h, q); if (d > bd) return; if (Math.abs(E.angDiff(aim, Math.atan2(q.y - h.y, q.x - h.x))) > cone) return; if (!shotClear(h, q)) return; bd = d; best = q; };
  for (const m of W.monsters) if (!m.rise) look(m);
  for (const g of W.gens) look(g);
  if (W.boss && !W.boss.dead) look(W.boss);
  return best;
}
/** smart melee: a monster (not a ghost) within reach inside +-50 degrees of the aim */
function meleeTarget(h, aim) {
  let best = null;
  for (const m of W.monsters) {
    if (m.dead || m.rise || m.D.noMelee || m.hidden) continue;
    const reach = h.r + m.r + 8; if (!near(h, m, reach)) continue;
    if (Math.abs(E.angDiff(aim, angTo(h, m))) > .87) continue;
    best = m; break;
  }
  if (!best) for (const g of W.gens) if (!g.dead && near(h, g, h.r + g.r + 8) && Math.abs(E.angDiff(aim, angTo(h, g))) < .87) { best = g; break; }
  if (!best && W.boss && !W.boss.dead && near(h, W.boss, h.r + W.boss.r + 8)) best = W.boss;
  return best;
}
function meleeHits(h) {
  const dmg = h.D.melee.dmg * (h.specials.ogreale ? 1.5 : 1), list = W.monsters.filter(m => !m.dead && !m.rise && !m.D.noMelee).concat(W.gens.filter(g => !g.dead), W.boss && !W.boss.dead ? [W.boss] : []);
  h.combo.hits(list, q => E.inArc(h, h.aim, q, 22 + (q.r || 5), 1.2), q => {
    damage(q, dmg, { by: h, kind: 'melee' });
    emit('meleeHit', { h, q, dmg });
  });
  // cracked walls in front take the blow too
  const fx = cellOf(h.x + Math.cos(h.aim) * 14), fy = cellOf(h.y + Math.sin(h.aim) * 14);
  if (W.cracked.has(fx + ',' + fy) && !h._crackHit) { h._crackHit = true; hitCracked(fx, fy, dmg, h); }
  if (!h.combo.active) h._crackHit = false;
}

/** throw the class's shot from the weapon hand */
function throwShot(h, aim) {
  const D = h.D, s = D.shot, rate = TUNE.shotRate * (h.specials.quickshot ? 1 / .75 : 1);
  h.cool = s.cd / rate; h.throwT = .18; h.facing = aim;
  if (!W.auth) { clientShot(h, aim); return; }
  const speed = s.speed * (h.specials.quickshot ? 1.2 : 1), rend = h.amulet && h.amulet.type === 'rending';
  const dmg = (s.dmg + (h.specials.hardshot ? 1 : 0) + (rend ? 1 : 0)) * TUNE.shotDamage;
  const b = W.shots.fire({ x: h.x + Math.cos(aim) * 7, y: h.y + Math.sin(aim) * 7, z: 12, vx: Math.cos(aim) * speed, vy: Math.sin(aim) * speed, r: 3, dmg, life: 220 / speed, team: 'hero',
    pierce: true, left: rend ? 99 : s.pierce + 1, splash: s.splash, owner: h.id, kind: s.kind, color: h.color, bounce: h.amulet && h.amulet.type === 'ricochet' ? 3 : 0, rot: aim });
  if (b) b.onWall = (bb, cx, cy) => { if (W.cracked.has(cx + ',' + cy)) hitCracked(cx, cy, bb.dmg, h); if (bb.splash) splash(bb, h); };
  emit('throw', { h, kind: s.kind }, null);
}

/** a Blast Flask: every monster on the user's screen; generators; the Tithe dies */
function useMagic(h, view) {
  if (h.flasks <= 0 && !CHEATS.infinite && !(W.role === 'attract')) return false;
  if (!W.auth) { if (h.flasks <= 0) return false; h.castT = .5; h.wantMagic = true; emit('magicLocal', { h }); return true; }
  if (!CHEATS.infinite && W.role !== 'attract') h.flasks--;
  h.castT = .5;
  blast(h, screenRect(h, view), 1);
  if (first('magic')) say('tip_magic', h, 1);
  return true;
}
/** magic damage in a rectangle (power 1; a shot flask's is half, round it) */
function blast(h, R, power, round) {
  const mp = h.D.magic[0] * TUNE.magicPower * (h.specials.witchwater ? 1.5 : 1) * power, gp = h.D.magic[1] * TUNE.magicPower * (h.specials.witchwater ? 1.5 : 1) * power;
  const inside = q => round ? near(q, round, round.r) : inRect(q, R);
  for (const m of W.monsters) if (!m.dead && inside(m)) damage(m, m.D.immune ? 999 : Math.ceil(4 * mp), { by: h, kind: 'magic' });
  for (const g of W.gens) if (!g.dead && inside(g)) damage(g, Math.ceil(2 * gp), { by: h, kind: 'magic' });
  if (W.boss && !W.boss.dead && inside(W.boss)) damage(W.boss, W.boss.max * .06 * power, { by: h, kind: 'magic' });
  W.magicFlash = .35; W.quake = .3;
  emit('magic', { h, x: round ? round.x : h.x, y: round ? round.y : h.y, r: round ? round.r : null }, ['magic', h.id, Math.round(round ? round.x : h.x), Math.round(round ? round.y : h.y), round ? round.r : 0]);
}

/** a hero takes damage: armor, difficulty, Iron Brew; Ironskin, God mode and the arrival grace stop it */
function hurtHero(h, amount, o) {
  if (!h.alive || CHEATS.god || W.role === 'attract' || (h.amulet && h.amulet.type === 'ironskin') || (h.inv > 0 && o.kind !== 'drain')) return 0;
  const k = o.kind === 'drain' ? 1 : h.D.armor * diff().dmg * TUNE.monsterDamage * (h.specials.ironbrew ? .8 : 1);
  const a = amount * k; if (a <= 0) return 0;
  h.hp -= a;
  if (o.kind !== 'drain') { h.hurtT = .25; if (o.from) { const an = angTo(o.from, h); h.push(Math.cos(an) * 60, Math.sin(an) * 60); } }
  emit('hurt', { h, amount: a, kind: o.kind }, ['hurt', h.id, Math.round(a)]);
  if (h.hp <= 0) fall(h);
  return a;
}
function fall(h) {
  if (!h.alive) return;
  h.alive = false; h.hp = 0; h.deadT = 0; h.vx = h.vy = 0; h.amulet = null; h.onMenu = 0;
  if (W.bell && W.bell.target === h) W.bell.target = null;
  say('eaten', h, 3);
  emit('fall', { h }, ['fall', h.id]);
  if (!W.heroes.some(q => q.alive)) emit('allDown', {});
}
/** rise again beside a living ally (or on the floor's starts) with the starting health */
function rise(h, hp, cost) {
  if (h.alive || !W) return false;
  const ally = W.heroes.find(q => q.alive && q !== h), s = W.p.starts[0];
  let x = ally ? ally.x : mid(s.cx), y = ally ? ally.y : mid(s.cy);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) { const nx = x + dx * 14, ny = y + dy * 14; if (W.map.walkable(cellOf(nx), cellOf(ny)) && !W.map.cell(cellOf(nx), cellOf(ny))) { x = nx; y = ny; break; } }
  Object.assign(h, { alive: true, hp: hp || startHealth(), x, y, vx: 0, vy: 0, inv: 1.5, riseT: 1, stun: 0 });
  if (cost) h.score = Math.max(0, h.score - cost); else h.continues++;
  say('rise', h, 2);
  emit('rise', { h }, ['rise', h.id]);
  return true;
}

/* ---- pickups: on touch ---- */
function pickups(h) {
  for (const it of W.items) {
    if (it.gone) continue;
    const reach = it.D.onTable ? h.r + 12 : h.r + 5;
    if (!near(h, it, reach)) continue;
    take(h, it);
  }
  if (W.bell && !W.bell.rung && near(h, W.bell, h.r + 9)) ringBell(h);
}
/** a hero takes an item (host and local decide; clients ask by touching) */
function take(h, it) {
  const D = it.D, lim = heroLimit(h);
  switch (D.kind) {
    case 'key': if (h.keys >= lim) return; h.keys++; if (first('key')) say('key_first', h, 1); break;
    case 'flask': if (h.flasks >= lim) return; h.flasks++; if (first('flask')) say('tip_magic', h, 1); break;
    case 'food': { const heal = TUNE.foodHeal * D.heal; h.hp += heal; h.eatT = .4; h.stats.food++; if (first('food')) say('tip_food', h, 1); if (h.stats.food === 8) say('glutton', h, 1); emit('eat', { h, it, heal }); break; }
    case 'stew': h.hp = Math.max(1, h.hp - 50); h.queasy = 4; say('ate_stew', h, 2); emit('stew', { h, it }); break;
    case 'special': if (h.specials[it.sub]) return; h.specials[it.sub] = true; say('special_' + it.sub, h, 2); break;
    case 'amulet': h.amulet = { type: it.sub, t: AMULET_TIME }; say('amulet_' + it.sub, h, 2); break;
    case 'treasure': h.stats.treasure++; if (first('treasure')) say('treasure_first', h, 1); break;
    case 'chest':
      if (D.locked) { if (h.keys <= 0 && !CHEATS.infinite) { if (!h.warned.chest) { h.warned.chest = true; say('tip_chest', h, 1); } return; } if (!CHEATS.infinite) h.keys--; }
      h.stats.treasure++; it.open = true; chestDrop(h, it); break;
    case 'gauntlet': h.stats.treasure++; say('gauntlet', h, 3); W.done = { to: 'ending', by: h, why: 'gauntlet' }; break;
  }
  it.gone = true;
  award(h, D.points, it, D.kind);
  emit('take', { h, it }, ['gone', it.id, h.id]);
  if (W.treasure && ['treasure', 'chest'].includes(D.kind) && !W.items.some(i => !i.gone && ['treasure', 'chest'].includes(i.D.kind))) { award(h, 2000, h, 'hoard'); say('hoard_clear', h, 2); }
}
/** a chest's prize: a locked one drops a flask, a roast or a key (or the floor's set prize) */
function chestDrop(h, it) {
  const set = W.F.chest && W.F.chest[it.cx + ',' + it.cy];
  if (set) { if (set.startsWith('special:')) { const sp = set.slice(8); if (!h.specials[sp]) { h.specials[sp] = true; award(h, 250, it, 'special'); say('special_' + sp, h, 2); } } return; }
  if (!it.D.locked) return;
  const pick = ['flask', 'roast', 'key'][rng.int(0, 2)];
  addItem(pick, it.x + 10, it.y + 4);
}
function addItem(type, x, y, sub) {
  const D = get('items', type), it = { id: W.nextId++, type, D, x, y, z: 0, cx: cellOf(x), cy: cellOf(y), sub, gone: false, t: 0, dropped: true };
  W.items.push(it); emit('drop', { it }, ['drop', it.id, type, Math.round(x), Math.round(y), sub || 0]);
  return it;
}

/* ---- doors: a hero with a key who pushes into a door opens its whole run ---- */
function doors(h) {
  if (h.keys <= 0 && !CHEATS.infinite) return;
  for (const d of W.doors) {
    if (d.open) continue;
    if (!d.cells.some(([cx, cy]) => Math.abs(h.x - mid(cx)) < T / 2 + h.r + 3 && Math.abs(h.y - mid(cy)) < T / 2 + h.r + 3)) continue;
    if (!CHEATS.infinite) h.keys--;
    openDoor(d, h);
    if (first('door')) say('tip_door', h, 1);
    return;
  }
}
function openDoor(d, h) {
  if (d.open) return; d.open = true; d.openT = W.t;
  for (const [cx, cy] of d.cells) W.map.set(cx, cy, 0);
  emit('door', { d, h }, ['door', d.id]);
}

/* ---- the stairs: stand on them for a moment and everyone goes down; the taker gets the bonus ---- */
function stairs(dt) {
  if (W.done) return;
  for (const h of W.heroes) {
    if (!h.alive) continue;
    const s = W.stairs.find(s => s.cx === cellOf(h.x) && s.cy === cellOf(h.y));
    if (!s) { h.stair = 0; continue; }
    h.stair += dt;
    if (h.stair >= TUNE.stairHold) { descend(h, s.to); return; }
  }
}
function descend(h, to) {
  if (W.done) return;
  let target = W.index + 1;
  if (to) { const i = FLOOR_ORDER.findIndex(id => get('floors', id).no === to); if (i > W.index) target = i; }
  if (h && !W.treasure) { const bonus = 500 + 5 * Math.max(0, Math.round((W.F.par || 150) - W.t)); award(h, bonus, h, 'exit'); }
  if (h) say(to ? 'skip' : 'stairs', h, 2);
  for (const q of W.heroes) if (q.alive) q.stats.floors++;
  W.done = { to: target, by: h, why: to ? 'skip' : 'stairs' };
  emit('descend', { h, to: target }, ['stairs', h ? h.id : -1, target]);
}

/* ---- the Dinner Bell: whoever rings it is ON THE MENU for 12 seconds; touching an ally passes it on ---- */
function ringBell(h) {
  const b = W.bell; b.rung = true; b.target = h; b.t = 12; b.swing = 1; h.onMenu = 12;
  say('bell', h, 2); emit('bell', { h }, ['bell', h.id]);
}
function stepBell(dt) {
  const b = W.bell; if (!b) return; b.swing = Math.max(0, b.swing - dt * .5);
  if (!b.target) return;
  b.t -= dt; const h = b.target;
  if (b.t <= 0 || !h.alive) { b.target = null; h.onMenu = 0; return; }
  h.onMenu = b.t;
  for (const q of W.heroes) if (q !== h && q.alive && near(q, h, q.r + h.r + 2) && !(h._passT > 0)) { b.target = q; q.onMenu = b.t; h.onMenu = 0; q._passT = .8; say('bell_pass', q, 2); emit('bell', { h: q }, ['bell', q.id]); return; }
  for (const q of W.heroes) if (q._passT > 0) q._passT -= dt;
}

// ---- 23-sim-monsters.js ----
/* ---- MONSTERS: one multi-source flow field toward the nearest hero (engine change E1); each kind its own manners.
   Every attack winds up visibly (raised club, glowing mouth, a landing shadow, a pan drawn back) for at least 0.3 s ---- */
const ACTIVE_RANGE = 20 * T;

/** who a monster goes for: the Bell's victim, else the nearest hero it can track (Veil hides a hero unless adjacent) */
function targetOf(m, live) {
  const b = W.bell && W.bell.target && W.bell.target.alive ? W.bell.target : null;
  if (b && !veiled(b, m)) return { h: b, d: Math.hypot(b.x - m.x, b.y - m.y), bell: true };
  let best = null, bd = 1e9;
  for (const h of live) { if (veiled(h, m)) continue; const d = Math.hypot(h.x - m.x, h.y - m.y); if (d < bd) { bd = d; best = h; } }
  return best ? { h: best, d: bd } : null;
}
const veiled = (h, m) => h.amulet && h.amulet.type === 'veil' && Math.hypot(h.x - m.x, h.y - m.y) > h.r + m.r + 6;
const mSpeed = m => m.D.speed[m.rank - 1] * TUNE.monsterSpeed * (W.descent > 1 ? 1.08 : 1);
const mDmg = (m, list) => (list || m.D.dmg)[m.rank - 1];

function stepMonsters(dt) {
  const live = liveHeroes();
  if (W.bell) { stepBell(dt); if (W.bell.target && W.bell.target.alive) W.bellFlow.update(W.bell.target.x, W.bell.target.y); }
  const tracked = live.filter(h => !(h.amulet && h.amulet.type === 'veil'));
  if (tracked.length) W.flow.updateMany(tracked);
  for (const m of W.monsters) {
    if (m.dead) continue;
    m.hitT = Math.max(0, m.hitT - dt); m.t += dt;
    for (const k in m.grace) if ((m.grace[k] -= dt) <= 0) delete m.grace[k];
    if (m.rise > 0) { m.rise -= dt; m.vx = m.vy = 0; continue; }
    if (CHEATS.freeze) { m.vx = m.vy = 0; continue; }
    const tg = targetOf(m, live);
    if (m.asleep) { if (tg && tg.d < ACTIVE_RANGE) m.asleep = false; else { m.vx = m.vy = 0; continue; } }
    if (!tg || tg.d > ACTIVE_RANGE * 1.4) { wander(m, dt); move(m, dt); continue; }
    // Stench: flee from that hero
    const st = live.find(h => h.amulet && h.amulet.type === 'stench' && near(h, m, 64));
    if (st && m.ai !== 'tithe') { const a = angTo(st, m), s = mSpeed(m) * 1.1; m.vx = Math.cos(a) * s; m.vy = Math.sin(a) * s; m.facing = a; m.state = 'move'; move(m, dt); continue; }
    AI[m.ai](m, tg, dt);
    move(m, dt);
  }
}
function move(m, dt) { if (m.D.fly && m.ai === 'tithe') { m.x += m.vx * dt; m.y += m.vy * dt; W.map.collide(m); } else m.update(dt, W.map); }
function wander(m, dt) { if ((m.wanderT = (m.wanderT || 0) - dt) <= 0) { m.wanderT = 1 + rng.r() * 2; m.wa = rng.r() * TAU; } const s = mSpeed(m) * .4; m.vx = Math.cos(m.wa) * s; m.vy = Math.sin(m.wa) * s; }
/** walk toward the target along the flow field (straight at it when close) */
function chase(m, tg, speed, dt) {
  const h = tg.h, F = tg.bell ? W.bellFlow : W.flow;
  let d = tg.d < 22 || cellOf(h.x) === cellOf(m.x) && cellOf(h.y) === cellOf(m.y) ? [(h.x - m.x) / (tg.d || 1), (h.y - m.y) / (tg.d || 1)] : F.dir(m.x, m.y, h.x, h.y);
  m.vx = d[0] * speed; m.vy = d[1] * speed;
  if (speed > 0) m.facing = Math.atan2(d[1], d[0]);
}
const stand = m => { m.vx = m.vy = 0; };
const face = (m, h) => { m.facing = angTo(m, h); };

const AI = {
  ghost(m, tg, dt) {
    const h = tg.h; m.gape = clamp(1 - tg.d / 70, 0, 1);
    chase(m, tg, mSpeed(m), dt);
    if (tg.d < h.r + m.r + 2) { damage(h, mDmg(m), { kind: 'contact', from: m }); emit('ghostBite', { m, h }); m.dead = true; if (m.gen) m.gen.children = Math.max(0, m.gen.children - 1); emit('kill', { m, by: null, kind: 'contact', points: 0 }, ['kill', m.id, -1, 0]); }
  },
  melee(m, tg, dt) {   // gnasher: walk up, raise the club (wind), swing; recover
    const h = tg.h, D = m.D, reach = D.reach + h.r;
    if (m.state === 'move') { chase(m, tg, mSpeed(m), dt); if (tg.d < reach) { m.state = 'wind'; m.stateT = 0; emit('windup', { m }); } return; }
    stand(m); face(m, h); m.stateT += dt;
    if (m.state === 'wind' && m.stateT >= D.wind) { m.state = 'strike'; m.stateT = 0; if (tg.d < reach + 5) { damage(h, mDmg(m), { kind: 'contact', from: m }); emit('monsterHit', { m, h }); } else emit('whiff', { m }); }
    else if (m.state === 'strike' && m.stateT >= .12) { m.state = 'recover'; m.stateT = 0; }
    else if (m.state === 'recover' && m.stateT >= D.every - D.wind - .12) m.state = 'move';
  },
  imp(m, tg, dt) {   // bites up close; spits fire when it sees you (the mouth glows first)
    const h = tg.h, D = m.D; m.cool -= dt;
    if (m.state === 'spit') { stand(m); face(m, h); m.stateT += dt; if (m.stateT >= .35) { m.state = 'move'; m.cool = D.fireEvery; fireball(m, h); } return; }
    if (m.state === 'move' && m.cool <= 0 && tg.d > 30 && tg.d < 150 && W.map.los(m.x, m.y, h.x, h.y)) { m.state = 'spit'; m.stateT = 0; emit('windup', { m }); return; }
    AI.melee(m, tg, dt);
  },
  lobber(m, tg, dt) {   // keeps its distance, flees up close, lobs crocks over walls (a shadow marks where they land)
    const h = tg.h, D = m.D; m.cool -= dt;
    if (m.state === 'throw') { stand(m); face(m, h); m.stateT += dt; if (m.stateT >= .45) { m.state = 'move'; m.cool = D.every[m.rank - 1]; lob(m, h); } return; }
    if (tg.d < 56) { const a = angTo(h, m), s = D.flee * TUNE.monsterSpeed; m.vx = Math.cos(a) * s; m.vy = Math.sin(a) * s; m.facing = a; m.fleeing = true; return; }
    m.fleeing = false;
    if (tg.d > D.keep[1] || !W.map.los(m.x, m.y, h.x, h.y) && tg.d > 70) chase(m, tg, mSpeed(m), dt);
    else { const a = angTo(m, h) + Math.PI / 2 * (m.id % 2 ? 1 : -1), s = mSpeed(m) * .35; m.vx = Math.cos(a) * s; m.vy = Math.sin(a) * s; face(m, h); }
    if (m.cool <= 0 && tg.d < 160) { m.state = 'throw'; m.stateT = 0; emit('windup', { m }); }
  },
  fryar(m, tg, dt) {   // fades in and out; can't be hit while unseen; reappears closer, in smoke
    const D = m.D; m.visT = (m.visT === undefined ? D.seen * rng.r() : m.visT) + dt;
    if (!m.hidden && m.visT >= D.seen && m.state === 'move') { m.hidden = true; m.visT = 0; emit('blink', { m, out: true }); }
    else if (m.hidden && m.visT >= D.unseen) {
      m.hidden = false; m.visT = 0;
      for (let k = 0, moved = 0; k < 3 && moved < 48; k++) { const n = W.flow.next(m.x, m.y); if (!n) break; const step = Math.min(16, Math.hypot(n.x - m.x, n.y - m.y)); moved += step; if (Math.hypot(n.x - tg.h.x, n.y - tg.h.y) < 20) break; m.x = n.x; m.y = n.y; }
      emit('blink', { m, out: false });
    }
    if (m.hidden) { chase(m, tg, mSpeed(m), dt); return; }
    AI.melee(m, tg, dt);
  },
  snatcher(m, tg, dt) {   // runs in, steals a flask, a key or the amulet, and runs for the exit
    if (m.loot) {
      const p = m.escape || (m.escape = escapePoint(m)), F = fleeFlow(p);
      const d = Math.hypot(p.x - m.x, p.y - m.y), dir = d < 20 ? [(p.x - m.x) / (d || 1), (p.y - m.y) / (d || 1)] : F.dir(m.x, m.y, p.x, p.y), s = mSpeed(m);
      m.vx = dir[0] * s; m.vy = dir[1] * s; m.facing = Math.atan2(dir[1], dir[0]);
      if (d < 8) { m.dead = true; emit('escaped', { m }, ['kill', m.id, -2, 0]); if (m.gen) m.gen.children = Math.max(0, m.gen.children - 1); }
      return;
    }
    const h = tg.h; chase(m, tg, mSpeed(m), dt);
    if (tg.d < h.r + m.r + 2) {
      const lim = CHEATS.infinite || W.role === 'attract';
      if (h.flasks > 0 && !lim) { h.flasks--; m.loot = { type: 'flask' }; }
      else if (h.keys > 0 && !lim) { h.keys--; m.loot = { type: 'key' }; }
      else if (h.amulet) { m.loot = { type: 'amulet', sub: h.amulet.type }; h.amulet = null; }
      else m.loot = { type: 'none' };
      m.victim = h.id;
      if (m.loot.type !== 'none') say('stolen', h, 2);
      emit('stolen', { m, h, loot: m.loot }, ['stolen', m.id, h.id]);
    }
  },
  tithe(m, tg, dt) {   // glides to the nearest hero; drains while touching, at most 200 a hero; only magic kills it
    const h = tg.h; chase(m, tg, mSpeed(m), dt);
    if (tg.d < h.r + m.r + 2) {
      const took = m.drain[h.id] || 0; if (took >= 200) return;
      const a = Math.min(60 * dt, 200 - took); m.drain[h.id] = took + a; damage(h, a, { kind: 'drain' }); m.draining = .2;
      if (m.drain[h.id] >= 200) { m.dead = true; say('tithe_paid', h, 2); emit('tithePaid', { m, h }, ['kill', m.id, -3, 0]); }
    }
    m.draining = Math.max(0, (m.draining || 0) - dt);
  }
};
/** where a snatcher runs to with its loot: its heap, or the floor's nearest escape point */
function escapePoint(m) {
  if (m.gen && !m.gen.dead) return { x: m.gen.x, y: m.gen.y + 12 };
  const pts = (W.F.points && W.F.points.escape) || [];
  let best = null, bd = 1e9; for (const [cx, cy] of pts) { const d = Math.hypot(mid(cx) - m.x, mid(cy) - m.y); if (d < bd) { bd = d; best = { x: mid(cx), y: mid(cy) }; } }
  if (best) return best;
  const s = W.p.starts[0]; return { x: mid(s.cx), y: mid(s.cy) };
}
function fleeFlow(p) { const k = cellOf(p.x) + ',' + cellOf(p.y); let F = W.fleeFlows[k]; if (!F) F = W.fleeFlows[k] = new E.FlowField(W.map); F.update(p.x, p.y); return F; }
function dropLoot(m) {
  const L = m.loot; if (!L || L.type === 'none') return;
  addItem(L.type === 'amulet' ? 'amulet' : L.type, m.x, m.y, L.sub);
  const h = HB(m.victim); if (h) say('recovered', h, 1);
}

/* ---- enemy missiles ---- */
function fireball(m, h) {
  const a = angTo(m, h), s = 110;
  W.eshots.fire({ x: m.x + Math.cos(a) * 6, y: m.y + Math.sin(a) * 6, z: 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 3, dmg: mDmg(m, m.D.fire), life: 2.2, team: 'foe', kind: 'fireball', color: '#ff7a2a', id: W.nextId++ });
  emit('spit', { m });
}
function lob(m, h) {
  const lead = .6, tx = h.x + h.vx * lead, ty = h.y + h.vy * lead, g = 260, arc = E.arc({ x: m.x, y: m.y, z: 14 }, { x: tx, y: ty, z: 0 }, g, { apex: 40 });
  W.eshots.fire({ x: m.x, y: m.y, z: 14, vx: arc.vx, vy: arc.vy, vz: arc.vz, grav: g, r: 2.5, dmg: mDmg(m), life: arc.t + .02, team: 'lob', kind: 'crock', lx: tx, ly: ty, color: '#c87a3a', id: W.nextId++, splash: 12 });
  emit('lob', { m });
}

/* ---- GENERATORS: breed while a hero is near, under the floor's cap; lose a rank (and a damage state) as they break ---- */
function addGen(type, x, y, rank, id) {
  const D = get('gens', type), hp = 4 * rank * TUNE.generatorHp;
  const g = { id: id || W.nextId++, type, D, x, y, r: 7, rank, rank0: rank, hp, max: hp, children: 0, t: .5 + rng.r() * 2, isGen: true, dmg: 0, shake: 0, breathe: 0, dead: false };
  W.gens.push(g); return g;
}
const genInterval = g => [3, 2.2, 1.5][g.rank - 1] * TUNE.spawnInterval / scaleSpawn(Math.max(1, liveHeroes().length));
const monsterCap = () => { const c = scaleCap(Math.max(1, W.heroes.length)); return W.role === 'host' || W.role === 'server' ? Math.min(c, 100) : c; };
function stepGens(dt) {
  if (CHEATS.nogen) return;
  const live = liveHeroes(), alive = W.monsters.filter(m => !m.dead).length, cap = monsterCap();
  for (const g of W.gens) {
    if (g.dead) continue;
    g.shake = Math.max(0, g.shake - dt); g.breathe = Math.max(0, g.breathe - dt);
    if (!live.some(h => near(h, g, 15 * T))) continue;
    if (g.children >= 8 || alive >= cap) continue;
    g.t -= dt; if (g.t > 0) continue;
    g.t = genInterval(g);
    const spot = freeNear(g.x, g.y); if (!spot) continue;
    const m = spawnMonster(g.D.spawns, spot[0], spot[1], g.rank, { rise: .4, gen: g, home: { x: g.x, y: g.y } });
    if (m) { g.children++; g.breathe = .6; }
  }
}
/** a free floor point beside (x, y): its four neighbour cells first */
function freeNear(x, y) {
  const cx = cellOf(x), cy = cellOf(y), tries = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  const start = rng.int(0, 7);
  for (let i = 0; i < 8; i++) {
    const [dx, dy] = tries[(i + start) % 8], nx = cx + dx, ny = cy + dy;
    if (W.map.cell(nx, ny) || !W.map.walkable(nx, ny)) continue;
    const px0 = mid(nx), py0 = mid(ny);
    if (W.monsters.filter(m => !m.dead && Math.abs(m.x - px0) < 8 && Math.abs(m.y - py0) < 8).length >= 2) continue;
    if (W.gens.some(q => !q.dead && q.x === px0 && q.y === py0)) continue;
    return [px0 + (rng.r() - .5) * 4, py0 + (rng.r() - .5) * 4];
  }
  return null;
}
function hurtGen(g, amount, by) {
  if (g.dead) return 0;
  if (CHEATS.onehit && by) amount = 999;
  g.hp -= amount; g.shake = .2;
  const per = 4 * TUNE.generatorHp;
  g.rank = Math.max(1, Math.ceil(g.hp / per)); const f = g.hp / g.max; g.dmg = f > .67 ? 0 : f > .34 ? 1 : 2;
  emit('genHit', { g, by, amount }, null);
  if (g.hp <= 0) {
    g.dead = true;
    if (by && by.isHero) { award(by, 25 * g.rank0, g, 'gen'); by.stats.gens++; }
    if (rng.r() < .1) addItem('loaf', g.x, g.y);
    emit('genDead', { g, by }, ['gen', g.id]);
  }
  return amount;
}

// ---- 25-sim-features.js ----
/* ---- PROJECTILES: hero shots hit monsters, generators, the King, shootable food and (from floor 6) friends ---- */
function stepShots(dt) {
  // lobbed crocks and plates land: a splash where they break
  for (const b of W.eshots.list) if (b.grav && !b.dead && b.t + dt >= b.life) { b.dead = true; landSplash(b); }
  W.shots.update(dt, W.map);
  W.eshots.update(dt, W.map);
  const heroTeam = W.shots.list;
  if (heroTeam.length) {
    const targets = W.monsters.filter(m => !m.dead && !m.rise && !(m.ai === 'fryar' && m.hidden));
    W.shots.hit(targets, (b, m) => {
      const h = HB(b.owner) || null;
      if (m.D.immune) { b.dead = true; damage(m, b.dmg, { by: h, kind: 'shot' }); return; }
      damage(m, b.dmg, { by: h, kind: 'shot' });
      if (b.splash) splash(b, h, m);
      if (--b.left <= 0) b.dead = true;
    }, 'hero');
    W.shots.hit(W.gens.filter(g => !g.dead), (b, g) => { const h = HB(b.owner); damage(g, b.dmg, { by: h, kind: 'shot' }); if (b.splash) splash(b, h, g); b.dead = true; }, 'hero');
    if (W.boss && !W.boss.dead) W.shots.hit([W.boss], (b, k) => { const h = HB(b.owner), front = k.open && Math.abs(E.angDiff(Math.atan2(-b.vy, -b.vx), k.facing)) < 1.1; damage(k, b.dmg * (front ? 2 : 1), { by: h, kind: 'shot' }); b.dead = true; }, 'hero');
    // shootable items: cider and platters are lost (the Gaunt names the culprit), stew is spilled (good), a flask goes off
    const shootable = W.items.filter(i => !i.gone && i.D.shoot);
    if (shootable.length) W.shots.hit(shootable.map(i => ({ x: i.x, y: i.y, r: 4, it: i })), (b, q) => { b.dead = true; shotItem(q.it, HB(b.owner)); }, 'hero');
    // friends: from floor 6 on (and in Descent II), a shot that touches an ally stuns them a moment
    if (game.settings.allyStun && (W.F.no >= 6 || W.descent > 1)) W.shots.hit(W.heroes.filter(q => q.alive), (b, q) => {
      if (q.id === b.owner) return;
      b.dead = true; if (q.stun <= 0) { q.stun = .35; say('ally_shot', HB(b.owner), 1); emit('allyStun', { h: q, by: HB(b.owner) }); }
    }, 'hero');
  }
  // enemy missiles hit heroes; fireballs cook the food they touch
  W.eshots.hit(W.heroes.filter(h => h.alive), (b, h) => { damage(h, b.dmg, { kind: 'fire', from: b }); emit('burn', { h, b }); }, 'foe');
  const food = W.items.filter(i => !i.gone && i.D.shoot && i.D.kind === 'food');
  if (food.length) W.eshots.hit(food.map(i => ({ x: i.x, y: i.y, r: 4, it: i })), (b, q) => { b.dead = true; q.it.gone = true; emit('cooked', { it: q.it }, ['gone', q.it.id, -1]); }, 'foe');
}
function landSplash(b) {
  for (const h of W.heroes) if (h.alive && Math.hypot(h.x - b.x, h.y - b.y) < (b.splash || 12) + h.r) damage(h, b.dmg, { kind: 'fire', from: b });
  emit('shatter', { x: b.x, y: b.y, kind: b.kind });
}
/** the Hexer's splash: 1 to everything else within 12 */
function splash(b, h, except) {
  for (const m of W.monsters) if (!m.dead && m !== except && !m.D.immune && Math.hypot(m.x - b.x, m.y - b.y) < 12 + m.r) damage(m, 1, { by: h, kind: 'shot' });
  emit('hexBurst', { x: b.x, y: b.y });
}
function shotItem(it, h) {
  if (it.gone) return;
  it.gone = true;
  if (it.type === 'flask') { blast(h, null, .5, { x: it.x, y: it.y, r: 80 }); say('shot_flask', h, 2); }
  else if (it.type === 'stew') { say('shot_stew', h, 1); }
  else { if (h) h.stats.foodShot++; say(it.type === 'cider' ? 'shot_cider' : (W.boss ? 'king_eating' : 'shot_feast'), h, 2); if (W.boss && it.type === 'platter') W.boss.denied = (W.boss.denied || 0) + 1; }
  emit('shotItem', { it, h }, ['gone', it.id, h ? h.id : -1]);
}
function hitCracked(cx, cy, dmg, h) {
  const k = cx + ',' + cy; if (!W.cracked.has(k)) return;
  const left = W.cracked.get(k) - dmg;
  if (left > 0) { W.cracked.set(k, left); emit('crack', { cx, cy }); return; }
  W.cracked.delete(k); W.map.set(cx, cy, 0);
  if (first('cracked')) say('tip_cracked', h, 1);
  emit('wall', { cx, cy, kind: 'cracked' }, ['wall', cx, cy]);
}

/* ---- a client draws its own shots at once (cosmetic: they stop at walls, never deal damage) ---- */
function clientShot(h, aim) {
  const s = h.D.shot;
  W.shots.fire({ x: h.x + Math.cos(aim) * 7, y: h.y + Math.sin(aim) * 7, z: 12, vx: Math.cos(aim) * s.speed, vy: Math.sin(aim) * s.speed, r: 3, dmg: 0, life: 220 / s.speed, team: 'cosmetic', kind: s.kind, color: h.color, rot: aim, owner: h.id });
}
function stepClientShots(dt) {
  W.shots.update(dt, W.map);
  W.shots.hit(W.monsters.filter(m => !m.dead), b => { emit('sparkle', { x: b.x, y: b.y }); }, 'cosmetic');
  W.eshots.update(dt, W.map);
}
/** a client hides an item it touched at once; the host's 'gone' confirms it (or it shows again after half a second) */
function clientPickups(h) {
  for (const it of W.items) {
    if (it.gone || it.pending) continue;
    if (!near(h, it, it.D.onTable ? h.r + 12 : h.r + 5)) continue;
    if (it.D.kind === 'chest' && it.D.locked && h.keys <= 0) continue;
    it.pending = W.real + .5; emit('takeLocal', { h, it });
  }
  for (const it of W.items) if (it.pending && W.real > it.pending && !it.gone) it.pending = 0;
}

/* ---- LEVEL FEATURES ---- */
function stepFeatures(dt) {
  for (const h of W.heroes) {
    if (!h.alive) continue;
    const cx = cellOf(h.x), cy = cellOf(h.y);
    // plates drop their trap walls (one shot)
    for (const p of W.plates) if (!p.used && p.cx === cx && p.cy === cy) springTrap(p, h);
    // transporters: to the pair, once off the pad
    const pi = W.pads.findIndex(p => p.cx === cx && p.cy === cy);
    if (pi < 0) { if (h.padLock !== -2 || !W.pads.some(p => Math.abs(p.cx - cx) + Math.abs(p.cy - cy) <= 1)) h.padLock = -1; }
    else if (h.padLock < 0) {
      const to = W.pads[pi ^ 1];
      if (to) {
        h.x = mid(to.cx); h.y = mid(to.cy); h.padLock = pi ^ 1; h.inv = Math.max(h.inv, .5); if (first('tele')) say('tip_tele', h, 1); emit('teleport', { h, from: W.pads[pi], to }, ['tele', h.id]);
        // one shared screen (solo, couch co-op, the demo): the party goes through together, so no one is left off screen
        if (W.role === 'local' || W.role === 'attract') {
          let k = 0;
          for (const q of W.heroes) {
            if (q === h || !q.alive) continue;
            const spots = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1]];
            for (; k < spots.length; k++) { const [dx, dy] = spots[k], nx = to.cx + dx, ny = to.cy + dy; if (!W.map.cell(nx, ny) && W.map.walkable(nx, ny)) { q.x = mid(nx); q.y = mid(ny); q.padLock = -2; q.inv = Math.max(q.inv, .5); k++; break; } }
          }
        }
      }
    }
    // stun runes
    if (h.runeImmune <= 0 && W.runes.some(r => r.cx === cx && r.cy === cy)) { h.stun = .8; h.runeImmune = 2.3; if (first('stun')) say('tip_stun', h, 1); emit('stun', { h }); }
  }
  // force fields: 2 s on, 2 s off, a flicker before they switch on; anything touching takes 12 and a shove
  for (const g of W.beams) {
    const u = (W.t + g.phase) % 4; g.on = u >= 2; g.warn = u >= 1.6 && u < 2;
    if (!g.on) continue;
    for (const b of [...W.heroes.filter(h => h.alive), ...W.monsters.filter(m => !m.dead && !m.rise && m.ai !== 'tithe')]) {
      const c = g.cells.find(c => (g.dir === 'v' ? Math.abs(b.x - mid(c.cx)) < b.r + 1.5 && cellOf(b.y) === c.cy : Math.abs(b.y - mid(c.cy)) < b.r + 1.5 && cellOf(b.x) === c.cx));
      if (!c || b.grace['field']) continue;
      b.grace['field'] = .5; damage(b, 12, { kind: 'trap', from: { x: mid(c.cx), y: mid(c.cy) } });
      const s = g.dir === 'v' ? Math.sign(b.x - mid(c.cx)) || 1 : Math.sign(b.y - mid(c.cy)) || 1; b.push(g.dir === 'v' ? s * 140 : 0, g.dir === 'v' ? 0 : s * 140);
      if (b.isHero && first('field')) say('tip_field', b, 1);
      emit('zap', { b, c });
    }
  }
  // spikes: 1.6 s cycles, up for 0.5 s after a 0.25 s tremble
  for (const s of W.spikes) {
    const u = (W.t + s.phase) % 1.6; s.up = u > 1.1; s.trem = u > .85 && u <= 1.1;
    if (!s.up) continue;
    for (const b of [...W.heroes.filter(h => h.alive), ...W.monsters.filter(m => !m.dead && !m.D.fly)]) {
      if (cellOf(b.x) !== s.cx || cellOf(b.y) !== s.cy || b.grace['spike']) continue;
      b.grace['spike'] = .5; damage(b, 15, { kind: 'trap' });
      if (b.isHero && first('spikes')) say('tip_spikes', b, 1);
      emit('spiked', { b, s });
    }
  }
}
function springTrap(p, h) {
  p.used = true;
  for (const t of W.p.trapWalls[p.kind]) W.map.set(t.cx, t.cy, 0);
  for (const q of W.plates) if (q.kind === p.kind) q.used = true;
  if (first('trap')) say('tip_trap', h, 1);
  emit('trap', { p, h }, ['trap', p.kind]);
}

/* ---- what the Gaunt notices: health crossing 400, 200 and 100; the first sight of each monster and generator ---- */
function narratorTriggers(dt) {
  for (const h of W.heroes) {
    if (!h.alive || (!W.auth && h.remote)) continue;
    const w = h.warned;
    for (const [lvl, key] of [[100, 'dying'], [200, 'starving'], [400, 'fading']]) {
      if (h.hp < lvl && !w[lvl]) { w[lvl] = true; if (W.auth) say(key, h, 3); break; }
      if (h.hp > lvl + 60) w[lvl] = false;
    }
  }
  if (!W.auth || (W.firstT = (W.firstT || 0) - dt) > 0) return;
  W.firstT = .5;
  const live = liveHeroes(); if (!live.length) return;
  const seen = q => live.some(h => near(h, q, 9 * T) && W.map.los(h.x, h.y, q.x, q.y));
  for (const m of W.monsters) if (!m.dead && m.D.tip && !RUN.firsts['m_' + m.type] && seen(m)) { RUN.firsts['m_' + m.type] = true; if (m.ai !== 'tithe') say(m.D.tip, null, 1); if (m.ai === 'gnasher' || m.type === 'gnasher') RUN.firsts.pendingMelee = W.t + 6; break; }
  if (RUN.firsts.pendingMelee && W.t > RUN.firsts.pendingMelee) { RUN.firsts.pendingMelee = 0; if (first('melee')) say('tip_melee', null, 1); }
  for (const g of W.gens) if (!g.dead && !RUN.firsts.gen && seen(g)) { RUN.firsts.gen = true; say('tip_generator', null, 1, { thing: g.D.name.replace(/^THE /, '') }); break; }
  for (const it of W.items) if (!it.gone && (it.type === 'cider' || it.type === 'platter') && !RUN.firsts.dontshoot && seen(it)) { RUN.firsts.dontshoot = true; say('tip_dontshoot', null, 1); break; }
  for (const s of W.stairs) if (live.some(h => Math.hypot(h.x - mid(s.cx), h.y - mid(s.cy)) < 7 * T && W.map.los(h.x, h.y, mid(s.cx), mid(s.cy)))) { W.firsts.stairsSeen = true; if (!RUN.firsts.stairs) { RUN.firsts.stairs = true; say('tip_stairs', null, 1); } break; }
  if (W.boss && !RUN.firsts.kingNear) { RUN.firsts.kingNear = true; }
}

// ---- 26-sim-boss.js ----
/* ---- KING FAMISH: the banquet's three phases. 1 "Dinner is served": plates and the stomp; tureens breed ghosts.
   2 "Second helpings": he eats the platters (heals) unless you shoot or eat them first; gnasher waves. 3 "The Gaunt
   hungers": his ribcage opens (shots from the front deal double), he charges, breathes famine fog, the Tithe comes ---- */
function startBoss(x, y) {
  const n = Math.max(1, PARTY.length), hp = Math.round(400 * (1 + .5 * (n - 1)) * (W.descent > 1 ? 1.3 : 1));
  W.boss = Object.assign(new E.Body({ x, y: y + 24, r: 12, friction: 0 }), { isBoss: true, hp, max: hp, phase: 0, state: 'throne', stateT: 0, cd: 2, waveT: 6, facing: Math.PI / 2, open: false,
    fog: null, charge: null, eatT: 0, eating: null, rage: false, home: { x, y: y + 24 }, dead: false, deadT: 0, titheCalled: false, hitT: 0, stomp: 0, throwT: 0, chew: 0, grace: {}, denied: 0, dropped: false });
}
const BOSS_LINES = { 1: 'king_intro', 2: 'king_p2', 3: 'king_p3' };
function bossSay(storyKey, prio = 3) { bus.emit('kingSays', { text: STORY[storyKey] }); if (W.role === 'host') W.events.push(['king', storyKey]); }
function stepBoss(dt) {
  const K = W.boss; K.hitT = Math.max(0, K.hitT - dt); K.stomp = Math.max(0, K.stomp - dt); K.throwT = Math.max(0, K.throwT - dt); K.chew = Math.max(0, K.chew - dt);
  for (const k in K.grace) if ((K.grace[k] -= dt) <= 0) delete K.grace[k];
  if (K.dead) {
    K.deadT += dt; K.vx = K.vy = 0;
    if (K.deadT > 2.4 && !K.dropped) { K.dropped = true; addItem('gauntlet', K.x, K.y + 6); emit('gauntletDrop', { K }); }
    return;
  }
  const live = liveHeroes(); if (!live.length) { K.vx = K.vy = 0; return; }
  let tg = live[0], td = 1e9; for (const h of live) { const d = Math.hypot(h.x - K.x, h.y - K.y); if (d < td) { td = d; tg = h; } }
  if (K.phase === 0) { K.vx = K.vy = 0; if (td < 10 * T) { K.phase = 1; say('king_intro', null, 3); bossSay('king_intro'); emit('boss', { phase: 1 }, ['boss', 1]); } return; }
  const frac = K.hp / K.max, want = frac > .7 ? 1 : frac > .35 ? 2 : 3;
  if (want > K.phase) {
    K.phase = want; K.state = 'move'; K.stateT = 0; K.charge = null; K.eating = null;
    bossSay(want === 2 ? 'king_p2' : 'king_p3'); emit('boss', { phase: want }, ['boss', want]);
    if (want === 2) say('king_eating', null, 2);
    if (want === 3) { K.open = true; if (!K.titheCalled) { K.titheCalled = true; summonTithe(); } }
  }
  K.cd -= dt; K.stateT += dt;
  // contact: brushing against the King hurts
  for (const h of live) if (near(h, K, h.r + K.r + 1) && !K.grace[h.id]) { K.grace[h.id] = .6; damage(h, 10, { kind: 'contact', from: K }); }
  // gnasher waves through the doorways (phase 2 on)
  if (K.phase >= 2 && (K.waveT -= dt) <= 0) { K.waveT = 12; wave(); }
  if (K.phase === 3 && K.state !== 'charge' && K.state !== 'aim' && (K.fogT = (K.fogT || 4) - dt) <= 0) { K.fogT = 8; K.fog = { x: K.x, y: K.y, a: angTo(K, tg), t: 4 }; emit('fog', { K }); }
  if (K.fog && (K.fog.t -= dt) <= 0) K.fog = null;
  switch (K.state) {
    case 'stomp':   // a stomp: 0.6 s wind-up, then a ring that hurts within 46
      K.vx = K.vy = 0;
      if (K.stateT >= .6) { K.state = 'move'; K.cd = 1.4; K.stomp = .5; W.quake = .4; for (const h of live) if (near(h, K, 46 + h.r)) damage(h, 15, { kind: 'contact', from: K }); emit('stomp', { K }); }
      return;
    case 'eat':
      K.vx = K.vy = 0; K.chew = .2;
      if (!K.eating || K.eating.gone) { K.state = 'move'; K.eating = null; say('king_eating', null, 1); return; }
      K.hp = Math.min(K.max, K.hp + K.max * .05 * dt);
      if (K.stateT >= 2.5) { K.eating.gone = true; emit('kingAte', { it: K.eating }, ['gone', K.eating.id, -4]); K.eating = null; K.state = 'move'; K.cd = .8; }
      return;
    case 'aim':   // a charge: a 0.6 s line on the floor, then a dash
      K.vx = K.vy = 0;
      if (K.stateT >= .6) { K.state = 'charge'; K.stateT = 0; emit('charge', { K }); }
      return;
    case 'charge': {
      const a = K.charge.a, s = 170; K.vx = Math.cos(a) * s; K.vy = Math.sin(a) * s; K.facing = a;
      const ox = K.x, oy = K.y; K.update(dt, W.map);
      for (const h of live) if (near(h, K, h.r + K.r + 3) && !K.grace['c' + h.id]) { K.grace['c' + h.id] = 1; damage(h, 15, { kind: 'contact', from: K }); }
      if (K.stateT > 1.1 || Math.hypot(K.x - ox, K.y - oy) < s * dt * .3) { K.state = 'move'; K.cd = 1.6; K.charge = null; W.quake = .25; emit('stomp', { K }); }
      return;
    }
  }
  // moving: phase 1 stays by the throne; phase 2 goes for the platters; phase 3 hunts
  const platters = W.items.filter(i => !i.gone && i.type === 'platter');
  let goal = K.home, speed = 30;
  if (K.phase === 2 && platters.length) { const p = platters.reduce((a, b) => Math.hypot(a.x - K.x, a.y - K.y) < Math.hypot(b.x - K.x, b.y - K.y) ? a : b); goal = { x: p.x + (K.x < p.x ? -18 : 18), y: p.y }; if (Math.hypot(goal.x - K.x, goal.y - K.y) < 6) { K.state = 'eat'; K.stateT = 0; K.eating = p; emit('kingEats', { it: p }); return; } }
  else if (K.phase === 2 && !K.rage) { K.rage = true; emit('roar', { K }); }
  else if (K.phase === 3) { goal = tg; speed = 36; }
  if (K.rage) speed = 40;
  const gd = Math.hypot(goal.x - K.x, goal.y - K.y);
  if (gd > 8) { const d = W.bellFlow.dir ? (() => { W.bellFlow.update(goal.x, goal.y); return W.bellFlow.dir(K.x, K.y, goal.x, goal.y); })() : [(goal.x - K.x) / gd, (goal.y - K.y) / gd]; K.vx = d[0] * speed; K.vy = d[1] * speed; K.facing = Math.atan2(d[1], d[0]); }
  else { K.vx = K.vy = 0; K.facing = angTo(K, tg); }
  K.update(dt, W.map);
  if (K.cd > 0) return;
  if (td < 44 && K.phase < 3) { K.state = 'stomp'; K.stateT = 0; emit('windup', { m: K }); return; }
  if (K.phase === 3 && rng.r() < .5 && td < 180) { K.state = 'aim'; K.stateT = 0; K.charge = { a: angTo(K, tg), x: K.x, y: K.y }; emit('windup', { m: K }); return; }
  // three plates in a fan, lobbed at the target (shadows mark where they land)
  K.cd = K.rage ? 1.6 : K.phase === 3 ? 2 : 2.5; K.throwT = .4; K.facing = angTo(K, tg);
  for (const s of [-1, 0, 1]) {
    const a = angTo(K, tg) + s * .3, d = Math.min(150, td), tx = K.x + Math.cos(a) * d, ty = K.y + Math.sin(a) * d, arc = E.arc({ x: K.x, y: K.y, z: 30 }, { x: tx, y: ty, z: 0 }, 260, { apex: 50 });
    W.eshots.fire({ x: K.x, y: K.y, z: 30, vx: arc.vx, vy: arc.vy, vz: arc.vz, grav: 260, r: 3, dmg: 10, life: arc.t + .02, team: 'lob', kind: 'plate', lx: tx, ly: ty, color: '#e8e8f0', id: W.nextId++, splash: 12 });
  }
  emit('plates', { K });
}
function wave() {
  const pts = (W.F.points && W.F.points.wave) || [];
  if (W.monsters.filter(m => !m.dead).length + pts.length * 2 > Math.min(40, monsterCap())) return;
  for (const [cx, cy] of pts) for (let i = 0; i < 2; i++) spawnMonster('gnasher', mid(cx) + (i - .5) * 8, mid(cy), 2, { rise: .3 });
  if (pts.length) emit('wave', {});
}
function inFog(h) { const f = W.boss && W.boss.fog; if (!f) return false; const d = Math.hypot(h.x - f.x, h.y - f.y); return d < 130 && Math.abs(E.angDiff(Math.atan2(h.y - f.y, h.x - f.x), f.a)) < .55; }
function hurtBoss(K, amount, by, o) {
  if (K.dead) return 0;
  if (K.phase === 0) { K.phase = 1; emit('boss', { phase: 1 }, ['boss', 1]); }
  if (CHEATS.onehit && by) amount = K.hp;
  K.hp -= amount; K.hitT = .1;
  emit('bossHit', { K, amount, by }, null);
  if (K.hp <= 0) {
    K.hp = 0; K.dead = true; K.deadT = 0; K.state = 'dead'; W.cheer = true;
    if (by && by.isHero) award(by, 10000, K, 'king');
    for (const m of W.monsters) if (!m.dead) killMonster(m, null, 'magic');
    for (const g of W.gens) if (!g.dead) { g.dead = true; emit('genDead', { g }, ['gen', g.id]); }
    say('king_dead', by, 3); bossSay('king_defeat');
    emit('bossDead', { K, by }, ['boss', 4]);
  }
  return amount;
}

// ---- 30-intents.js ----
/* ---- INTENTS: the only way anything drives a hero. { move: [x, y] (ground, length <= 1), aim: angle | null, fire,
   magic (pressed), plant }. Local input, the network and the bot all make them: one code path for play, demo and tests ---- */
const MOUSE_AIM_S = 3;
/** the intent of a local player's input this step */
function inputIntent(h, I) {
  const out = h.intent, m = I.move(), len = Math.min(1, Math.hypot(m[0], m[1]));
  if (len > .05) { const g = game.view.screenDirToGround(m[0], m[1]); out.move = [g[0] * len, g[1] * len]; } else out.move = [0, 0];
  let aim = null, mouseAim = false;
  if (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .25) { const g = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); aim = Math.atan2(g[1], g[0]); }
  else if (I === game.input && I.aimSource === 'mouse' && I.mouse.active && (I.clock - I.mouse.t < MOUSE_AIM_S || I.held.has('Mouse0'))) {
    const q = game.mouseGround(); if (q && Math.hypot(q[0] - h.x, q[1] - h.y) > 4) { aim = Math.atan2(q[1] - h.y, q[0] - h.x); mouseAim = true; h.aimAt = q; }
  }
  if (!mouseAim) h.aimAt = null;
  const stickFire = game.settings.stickFires && I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .5;
  out.aim = aim;
  out.fire = I.down('fire') || !!stickFire;
  // keyboard-only firing plants, as the arcade did: the hero stands, turns with the keys and keeps throwing
  const keyFire = I.down('fire') && !mouseAim && !aim && (I.lastDevice === 'keyboard');
  out.plant = I.down('plant') || keyFire;
  if (I.pressed('magic')) out.magic = true;
  return out;
}
/** an empty intent (menus open, the card, a cutscene) */
function idleIntent(h) { const i = h.intent; i.move = [0, 0]; i.fire = false; i.magic = false; i.plant = false; return i; }

// ---- 31-bot.js ----
/* ---- THE AUTOPILOT: intents from the world's state (the attract mode, the playthrough tests, Dev's "bot plays P1").
   Goals each 0.25 s: eat when hungry; fight what is near; break generators; keys and doors on the way; treasure; the
   stairs. Its own path search knows transporter pads. Stuck: it sidesteps, and (only with cheats) jumps ahead ---- */
function makeBot(o = {}) { return { t: 0, goal: 'stairs', path: null, wp: null, lastPos: null, stuckT: 0, side: 0, sideT: 0, cheat: !!o.cheat, target: null, jumps: 0 }; }
/** a breadth-first search over walkable cells from the hero's cell, with pads joined to their pairs */
function botSearch(h) {
  const M = W.map, w = M.w, hh = M.h, n = w * hh, dist = botSearch.d && botSearch.d.length === n ? botSearch.d : (botSearch.d = new Int32Array(n)), from = botSearch.f && botSearch.f.length === n ? botSearch.f : (botSearch.f = new Int32Array(n));
  dist.fill(-1); from.fill(-1);
  const ok = (cx, cy) => cx >= 0 && cy >= 0 && cx < w && cy < hh && !M.cell(cx, cy) && M.walkable(cx, cy), padAt = new Map(W.pads.map((p, i) => [p.cy * w + p.cx, i]));
  const start = cellOf(h.y) * w + cellOf(h.x); if (start < 0 || start >= n) return null;
  const q = [start]; dist[start] = 0;
  for (let k = 0; k < q.length; k++) {
    const i = q[k], cx = i % w, cy = (i / w) | 0;
    const nb = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]].filter(([x, y]) => ok(x, y)).map(([x, y]) => y * w + x);
    if (padAt.has(i)) { const p = W.pads[padAt.get(i) ^ 1]; if (p) nb.push(p.cy * w + p.cx); }
    for (const j of nb) if (dist[j] < 0) { dist[j] = dist[i] + 1; from[j] = i; q.push(j); }
  }
  return { dist, from, w, at: (cx, cy) => cx >= 0 && cy >= 0 && cx < w && cy < hh ? dist[cy * w + cx] : -1 };
}
/** the cell path to a goal cell, start first */
function botPathTo(S, gx, gy) { const out = []; let i = gy * S.w + gx; if (S.dist[i] < 0) return null; while (i >= 0) { out.push([i % S.w, (i / S.w) | 0]); i = S.from[i]; } return out.reverse(); }
/** the nearest of a list of things by path ({ cx, cy } or x, y); near: also a cell beside it (doors, tables) */
function botNearest(S, list, adj) {
  let best = null, bd = 1e9;
  for (const q of list) {
    const cx = q.cx !== undefined ? q.cx : cellOf(q.x), cy = q.cy !== undefined ? q.cy : cellOf(q.y);
    const cands = adj ? [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]] : [[cx, cy]];
    for (const [x, y] of cands) { const d = S.at(x, y); if (d >= 0 && d < bd) { bd = d; best = { q, cx: x, cy: y, d }; } }
  }
  return best;
}
function botIntent(h, dt) {
  const B = h.bot, I = h.intent;
  if (!h.alive) { idleIntent(h); if (B.cheat || W.role === 'attract' || h.deadT > 1.5) rise(h); return; }
  B.t -= dt; B.sideT = Math.max(0, B.sideT - dt);
  if (B.t <= 0) { B.t = .25; botThink(h, B); }
  // stuck: under 8 units of progress in 3 s
  B.stuckT += dt;
  if (B.stuckT >= 3) { const p = B.lastPos; if (p && Math.hypot(h.x - p[0], h.y - p[1]) < 8 && B.goal !== 'fight' && B.goal !== 'hold') { B.side = B.side ? -B.side : 1; B.sideT = .6; B.jumps++; if (B.cheat && B.jumps > 1 && B.path && B.path.length > 3) { const [cx, cy] = B.path[Math.min(4, B.path.length - 1)]; h.x = mid(cx); h.y = mid(cy); B.jumps = 0; } } else B.jumps = 0; B.lastPos = [h.x, h.y]; B.stuckT = 0; }
  // walk the path: the farthest of the next few cells in a straight line
  let mx = 0, my = 0;
  if (B.wp) { const dx = B.wp[0] - h.x, dy = B.wp[1] - h.y, d = Math.hypot(dx, dy); if (d > 2) { mx = dx / d; my = dy / d; } }
  if (B.goal === 'hold') mx = my = 0;
  if (B.sideT > 0) { const a = Math.atan2(my, mx) + B.side * Math.PI / 2; mx = Math.cos(a); my = Math.sin(a); }
  if (B.kite && B.target) { const a = angTo(B.target, h); mx = mx * .3 + Math.cos(a) * .9; my = my * .3 + Math.sin(a) * .9; }
  I.move = [mx, my]; I.plant = false;
  const t = B.target && !B.target.dead ? B.target : null;
  I.aim = t ? Math.atan2(t.y - h.y, t.x - h.x) : null; I.fire = !!t;
  if (B.magic) { I.magic = true; B.magic = false; }
}
function botThink(h, B) {
  const S = botSearch(h); if (!S) return;
  const hp = h.hp, live = W.monsters.filter(m => !m.dead && !m.rise && !(m.ai === 'fryar' && m.hidden)), sees = q => shotClear(h, q);
  let goal = null, why = '';
  // fight: the nearest monster within 7 tiles in sight (not the Tithe: it can't be shot; flee it instead)
  let foe = null, fd = 7 * T;
  for (const m of live) { if (m.D.immune) continue; const d = Math.hypot(m.x - h.x, m.y - h.y); if (d < fd && sees(m)) { fd = d; foe = m; } }
  let gen = null, gd = 10 * T; for (const g of W.gens) { if (g.dead) continue; const d = Math.hypot(g.x - h.x, g.y - h.y); if (d < gd && sees(g)) { gd = d; gen = g; } }
  const K = W.boss && !W.boss.dead && W.boss.phase > 0 ? W.boss : null;
  const platter = K && K.state === 'eat' && K.eating ? K.eating : null;
  const kingFirst = K && sees(K) && Math.hypot(K.x - h.x, K.y - h.y) < 190 && !(foe && fd < 2.5 * T);
  B.target = platter || (kingFirst ? K : null) || foe || (K && sees(K) ? K : null) || gen || null;
  B.kite = !!foe && fd < 3.2 * T && (h.cls === 'ranger' || h.cls === 'hexer') && !foe.D.fly;
  const onScreen = live.filter(m => Math.abs(m.x - h.x) < 12 * T && Math.abs(m.y - h.y) < 8 * T).length;
  if ((onScreen >= 12 || (K && K.phase >= 2 && (onScreen >= 6 || K.phase === 3))) && (h.flasks > 0 || W.role === 'attract') && (B.magicT = (B.magicT || 0) - .25) <= 0) { B.magic = true; B.magicT = 3; }
  const tithe = live.find(m => m.ai === 'tithe' && near(m, h, 40));
  if (tithe && h.flasks > 0) { B.magic = true; }
  // where to walk
  const items = W.items.filter(i => !i.gone && !i.pending);
  const food = items.filter(i => i.D.kind === 'food' && i.type !== 'platter');
  const gauntlet = items.find(i => i.type === 'gauntlet');
  if (gauntlet) { goal = botNearest(S, [gauntlet]); why = 'the gauntlet'; }
  // a party of bots on one screen keeps together: the first leads, the others follow when they drift
  const lead = W.heroes.find(q => q.alive && q.bot && !q.remote);
  if (!goal && lead && lead !== h && W.role !== 'host' && Math.hypot(lead.x - h.x, lead.y - h.y) > (W.leash ? Math.min(6 * T, W.leash[0] * .4) : 6 * T)) { goal = botNearest(S, [lead]); if (goal) why = 'follow'; }
  if (!goal && (hp < 250 || hp < 450 && W.F.no >= 4)) { const f = botNearest(S, food); if (f && f.d <= (hp < 250 ? 40 : 14)) { goal = f; why = 'eat'; } }
  const reach = lead && lead !== h ? 6 : 14;
  if (!goal && (h.keys < 9 || h.flasks < 9)) { const pick = botNearest(S, items.filter(i => (i.type === 'flask' && h.flasks < 3) || i.D.kind === 'special' || i.D.kind === 'amulet' && !h.amulet)); if (pick && pick.d <= reach) { goal = pick; why = 'potion'; } }
  const stairs = W.stairs.filter(s => !s.to), anyStairs = botNearest(S, stairs.length ? stairs : W.stairs);
  if (!goal && W.treasure) { const tr = botNearest(S, items.filter(i => ['treasure', 'chest'].includes(i.D.kind) && !(i.D.locked && h.keys === 0))); if (tr && W.treasure.t > 3) { goal = tr; why = 'hoard'; } }
  if (!goal && W.F.boss) { if (K) { goal = kingSpot(S, K, h); why = 'the King'; } else if (W.boss && !W.boss.dead) { goal = botNearest(S, [{ x: W.boss.x, y: W.boss.y + 60 }]); why = 'wake the King'; } }
  if (!goal && !anyStairs && !W.F.boss) {
    // the stairs are behind something: a door (with a key), a key, a plate, a pad
    const closed = W.doors.filter(d => !d.open), doorGoal = h.keys > 0 || CHEATS.infinite ? botNearest(S, closed.flatMap(d => d.cells.map(([cx, cy]) => ({ cx, cy }))), true) : null;
    if (doorGoal) { goal = doorGoal; goal.push = [doorGoal.q.cx, doorGoal.q.cy]; why = 'open a door'; }
    else { const k = botNearest(S, items.filter(i => i.type === 'key')); if (k) { goal = k; why = 'fetch a key'; } }
    if (!goal) { const p = botNearest(S, W.plates.filter(p => !p.used)); if (p) { goal = p; why = 'a plate'; } }
    if (!goal) { const ck = botNearest(S, [...W.cracked.keys()].map(k => { const [cx, cy] = k.split(',').map(Number); return { cx, cy }; }), true); if (ck) { goal = ck; B.target = { x: mid(ck.q.cx), y: mid(ck.q.cy), dead: false }; why = 'break a wall'; } }
  }
  if (!goal && W.impatience < 2) { const tr = botNearest(S, items.filter(i => ['treasure', 'chest'].includes(i.D.kind) && !(i.D.locked && h.keys === 0) || i.type === 'key' && h.keys < 2)); if (tr && tr.d <= 10) { goal = tr; why = 'treasure'; } }
  if (!goal && gen && gd < 7 * T) { goal = null; why = 'break the generator'; B.wp = null; }
  if (!goal && anyStairs) { goal = anyStairs; why = 'the stairs'; }
  if (!goal) { const any = botNearest(S, items.filter(i => i.D.kind !== 'stew')); if (any) { goal = any; why = 'look around'; } }
  B.goal = why || 'hold';
  if (!goal) { B.wp = null; B.path = null; if (!why) B.goal = 'hold'; return; }
  const path = botPathTo(S, goal.cx, goal.cy); B.path = path;
  if (!path || path.length < 2) { B.wp = goal.push ? [mid(goal.push[0]), mid(goal.push[1])] : [mid(goal.cx), mid(goal.cy)]; if (goal.q && goal.q.x !== undefined && !goal.push) B.wp = [goal.q.x, goal.q.y]; return; }
  // the farthest of the next cells it can walk straight to (a padded path stays a cell at a time)
  let k = 1; for (let j = Math.min(path.length - 1, 4); j > 1; j--) { const [cx, cy] = path[j]; if (Math.abs(cx - path[j - 1][0]) + Math.abs(cy - path[j - 1][1]) > 1) continue; if (W.map.los(h.x, h.y, mid(cx), mid(cy)) && clearLine(h, mid(cx), mid(cy))) { k = j; break; } }
  B.wp = [mid(path[k][0]), mid(path[k][1])];
}
/** is the straight walk free of walls for a body's width (both sides of the line)? */
function clearLine(h, x, y) { const a = Math.atan2(y - h.y, x - h.x), ox = -Math.sin(a) * h.r, oy = Math.cos(a) * h.r; return W.map.los(h.x + ox, h.y + oy, x + ox, y + oy) && W.map.los(h.x - ox, h.y - oy, x - ox, y - oy); }

/** a shot from a to b at throwing height clears every top on the way (low tables don't stop it) */
function shotClear(a, b, z = 12) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), n = Math.ceil(d / 4);
  for (let i = 1; i < n; i++) { const x = a.x + dx * i / n, y = a.y + dy * i / n; if (W.map.heightAt(x, y) > z) return false; }
  return true;
}
/** where to stand against the King: a reachable cell 4-7 tiles away with a clear shot, nearest first */
function kingSpot(S, K, h) {
  const kx = cellOf(K.x), ky = cellOf(K.y); let best = null, bd = 1e9;
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
    const r = Math.hypot(dx, dy); if (r < 4 || r > 7) continue;
    const cx = kx + dx, cy = ky + dy, d = S.at(cx, cy); if (d < 0 || d >= bd) continue;
    if (!shotClear({ x: mid(cx), y: mid(cy) }, K)) continue;
    bd = d; best = { cx, cy, d };
  }
  return best || { cx: kx, cy: ky + 5, d: 0 };
}

// ---- 40-net.js ----
/* ---- NET: AI Hub shared world (Session Protocol v1). The host's copy runs the world; every copy moves its own hero at
   once and never waits for the network. Messages (JSON, compact arrays of integers):
     me  client -> host, unreliable, 12/s: { t, at, x, y, a (aim, centiradians), f (fire), p (plant), q (floor serial) }
     act client -> host, reliable, on a press: { t, k: 'magic', n, v: [half width, half depth] (its view, in tiles) }
     s   host -> all, unreliable, 10/s: heroes, monsters near any hero, enemy missiles, generators, the King
     e   host -> all, reliable, batched every 125 ms: what happened (kills, pickups, doors, lines ...)
   At most 20 messages a second leave a copy (a token bucket: 20/s, bursts of 40) ---- */
const NET = {
  role: 'local', sent: 0, received: 0, bytes: 0, lastSnapBytes: 0, maxBytes: 0, perSec: [], dropped: 0,
  bucket: 20, bucketT: 0, sendT: 0, snapT: 0, evT: 0, queue: [], snaps: [], actN: 0, ended: false,
  stats() { return { role: this.role, sent: this.sent, received: this.received, lastSnapshotBytes: this.lastSnapBytes, maxBytes: this.maxBytes, dropped: this.dropped, maxPerSec: Math.max(0, ...this.perSec) }; },
  reset(role) { Object.assign(this, { role, sent: 0, received: 0, queue: [], snaps: [], perSec: [], bucket: 20, sendT: 0, snapT: 0, evT: 0, actN: 0, ended: false, lastSnapBytes: 0, maxBytes: 0, dropped: 0 }); }
};
/** send through the hub, inside the rate budget; reliable messages that can't go now wait in the queue */
function netSend(data, o = {}) {
  if (!HUB || NET.ended || !SESS.info) return false;
  const now = game.real;
  NET.bucket = Math.min(40, NET.bucket + (now - NET.bucketT) * 20); NET.bucketT = now;
  if (NET.bucket < 1) { if (o.reliable !== false) NET.queue.push([data, o]); else NET.dropped++; return false; }
  const ok = HUB.send(data, o);
  if (!ok) { if (o.reliable !== false) NET.queue.push([data, o]); else NET.dropped++; return false; }
  NET.bucket -= 1; NET.sent++;
  const sec = Math.floor(now); NET.perSec[sec] = (NET.perSec[sec] || 0) + 1;
  const n = JSON.stringify(data).length; NET.bytes += n; NET.maxBytes = Math.max(NET.maxBytes, n); if (data.t === 's') NET.lastSnapBytes = n;
  return true;
}
function netFlush() { if (!NET.queue.length) return; const q = NET.queue; NET.queue = []; for (const [d, o] of q) if (!netSend(d, o)) break; }
const R0 = v => Math.round(v), CA = a => Math.round((a || 0) * 100);
const KIND = { ghost: 0, gnasher: 1, lobber: 2, imp: 3, fryar: 4, snatcher: 5, tithe: 6 }, KIND_OF = Object.keys(KIND);
const EKIND = { fireball: 0, crock: 1, plate: 2 }, EKIND_OF = Object.keys(EKIND);
const STATE = { move: 0, wind: 1, strike: 2, recover: 3, spit: 4, throw: 5 }, STATE_OF = Object.keys(STATE);
const BSTATE = { throne: 0, move: 1, stomp: 2, eat: 3, aim: 4, charge: 5, dead: 6 }, BSTATE_OF = Object.keys(BSTATE);

/* ---- the host: a snapshot for everyone, and the events in batches ---- */
function hostTick(dt) {
  netFlush();
  NET.snapT -= dt; NET.evT -= dt;
  if (NET.snapT <= 0) { NET.snapT = .1; netSend(snapshotMsg(), { reliable: false }); }
  if (NET.evT <= 0 && W.events.length) { NET.evT = .125; const e = W.events.splice(0, 60); netSend({ t: 'e', q: W.serial, e }); }
}
function snapshotMsg() {
  const hs = W.heroes.filter(h => !h.gone), inAOI = q => hs.some(h => Math.abs(q.x - h.x) < 16 * T && Math.abs(q.y - h.y) < 11 * T);
  let ms = W.monsters.filter(m => !m.dead && inAOI(m));
  if (ms.length > 220) ms = ms.slice(0, 220);
  const msg = {
    t: 's', at: R0(HUB.time()), q: W.serial, w: R0(W.t * 10),
    h: hs.map(h => [h.id, R0(h.x), R0(h.y), CA(h.aim), R0(h.hp), h.score, h.keys, h.flasks, (h.alive ? 1 : 0) | (h.intent.fire && h.alive ? 2 : 0) | (h.stun > 0 ? 4 : 0) | (h.hurtT > 0 ? 8 : 0) | (h.castT > 0 ? 16 : 0) | (h.queasy > 0 ? 32 : 0) | (h.onMenu > 0 ? 64 : 0), h.amulet ? [h.amulet.type, R0(h.amulet.t * 10)] : 0, Object.keys(h.specials).join(',')]),
    m: ms.map(m => [m.id, KIND[m.type] * 4 + m.rank, R0(m.x), R0(m.y), (CA(m.facing) + 400) % 629 * 8 + (STATE[m.state] || 0), (m.hidden ? 1 : 0) | (m.rise > 0 ? 2 : 0) | (m.hitT > 0 ? 4 : 0) | (m.loot ? 8 : 0) | (m.draining ? 16 : 0)]),
    p: W.eshots.list.filter(b => !b.dead && inAOI(b)).slice(0, 60).map(b => [b.id || 0, EKIND[b.kind] || 0, R0(b.x), R0(b.y), R0(b.z), R0(b.vx), R0(b.vy), R0(b.vz), R0((b.life - b.t) * 100), R0(b.lx || 0), R0(b.ly || 0)]),
    g: W.gens.map(g => g.dead ? 0 : Math.ceil(g.hp * 10))
  };
  if (W.boss) { const K = W.boss; msg.b = [R0(K.hp), K.phase, R0(K.x), R0(K.y), BSTATE[K.state] || 0, CA(K.facing), K.open ? 1 : 0, K.fog ? CA(K.fog.a) : -999, K.charge ? CA(K.charge.a) : -999, R0(K.stateT * 100)]; }
  if (W.treasure) msg.tr = R0(W.treasure.t * 10);
  if (W.bell) msg.bl = W.bell.target ? W.bell.target.id : -1;
  return msg;
}
/** the host hears a client: where its hero is (trusted within reason), its aim and trigger; its magic */
function hostHear(from, d) {
  const h = W.heroes.find(q => q.hubId === from); if (!h) return;
  if (d.t === 'me') {
    if (d.q !== W.serial || !(d.at > (h.netAt || -1e9))) return;
    const dtS = h.netAt === undefined ? 1 : clamp((d.at - h.netAt) / 1000, .02, 1); h.netAt = d.at;
    if (h.alive) {
      const max = h.D.speed * TUNE.heroSpeed * 1.25 * 1.5 * dtS + 6, dx = d.x - h.x, dy = d.y - h.y, dd = Math.hypot(dx, dy);
      let nx = d.x, ny = d.y; if (dd > max && dd < 200) { nx = h.x + dx / dd * max; ny = h.y + dy / dd * max; }
      if (dd >= 200 && h.pads !== undefined) { /* a transporter jump: the host saw it too */ }
      if (W.map.walkable(cellOf(nx), cellOf(ny)) && !W.map.cell(cellOf(nx), cellOf(ny)) || dd >= 200) { if (dd > .3) h.facing = Math.atan2(ny - h.y, nx - h.x); h.vx = (nx - h.x) / dtS; h.vy = (ny - h.y) / dtS; h.x = nx; h.y = ny; }
    }
    h.intent.aim = d.a / 100; h.intent.fire = !!d.f; h.intent.plant = !!d.p; h.intent.move = [0, 0];
  } else if (d.t === 'act' && d.k === 'magic' && h.alive) { h.intent.view = d.v; useMagic(h, d.v); }
}

/* ---- a client: apply the host's snapshots (puppets, eased) and events ---- */
function clientHear(d) {
  if (d.t === 's') { if (d.q !== W.serial) return; if (NET.snaps.length && d.at <= NET.snaps[NET.snaps.length - 1].at) return; NET.snaps.push(d); if (NET.snaps.length > 3) NET.snaps.shift(); applySnapshot(d); }
  else if (d.t === 'e') { for (const ev of d.e) applyEvent(ev, d.q); }
}
const PUP = new Map();
function applySnapshot(s) {
  // heroes: the host's numbers; the others' places (this copy's own hero stays where its player put it)
  for (const [id, x, y, a, hp, score, keys, flasks, fl, am, sp] of s.h) {
    const h = W.heroes.find(q => q.id === id); if (!h) continue;
    const was = h.hp, wasAlive = h.alive;
    h.hp = hp; h.score = score; h.keys = keys; h.flasks = flasks; h.alive = !!(fl & 1); h.amulet = am ? { type: am[0], t: am[1] / 10 } : null; h.onMenu = fl & 64 ? 1 : 0;
    h.specials = {}; if (sp) for (const k of sp.split(',')) h.specials[k] = true;
    if (!wasAlive && h.alive && !h.remote) { h.x = x; h.y = y; }
    if (h.remote) { h.netA = h.netB || { x, y, at: s.at }; h.netB = { x, y, at: s.at }; h.aim = a / 100; h.firing = !!(fl & 2); h.stun = fl & 4 ? .1 : 0; h.hurtT = fl & 8 ? .1 : 0; h.castT = fl & 16 ? .2 : 0; h.queasy = fl & 32 ? .2 : 0; }
    else if (was - hp > 4 && h.alive) { h.hurtT = .25; emit('hurt', { h, amount: was - hp, kind: 'contact' }); }
    if (wasAlive && !h.alive) emit('fall', { h });
  }
  // monsters: puppets eased between snapshots
  const seen = new Set();
  for (const [id, kr, x, y, ds, fl] of s.m) {
    seen.add(id);
    let m = PUP.get(id);
    const type = KIND_OF[Math.floor(kr / 4)], rank = kr % 4 || 1;
    if (!m) { m = { id, type, D: get('monsters', type), ai: get('monsters', type).ai, rank, spawnRank: rank, x, y, vx: 0, vy: 0, r: get('monsters', type).r, facing: 0, state: 'move', stateT: 0, grace: {}, isMonster: true, gape: 0 }; PUP.set(id, m); W.monsters.push(m); m.netA = { x, y, at: s.at }; }
    m.netA = m.netB || { x, y, at: s.at }; m.netB = { x, y, at: s.at };
    if (rank !== m.rank) { m.rank = rank; emit('shrink', { m }); }
    const st = STATE_OF[ds % 8] || 'move'; if (st !== m.state) { m.state = st; m.stateT = 0; }
    m.facing = (Math.floor(ds / 8) - 400) / 100; m.hidden = !!(fl & 1); m.rise = fl & 2 ? .2 : 0; m.hitT = fl & 4 ? .1 : 0; m.loot = fl & 8 ? { type: 'flask' } : null; m.draining = fl & 16 ? .2 : 0; m.dead = false; m.unseen = 0;
  }
  for (const m of W.monsters) if (!seen.has(m.id)) { m.unseen = (m.unseen || 0) + 1; if (m.unseen > 3) { m.dead = true; PUP.delete(m.id); } }
  E.prune(W.monsters, m => m.dead);
  // enemy missiles: as the host has them now; the client moves them until the next snapshot
  W.eshots.list.length = 0;
  for (const [id, k, x, y, z, vx, vy, vz, left, lx, ly] of s.p) { const kind = EKIND_OF[k], grav = kind === 'fireball' ? 0 : 260; W.eshots.list.push({ id, kind, x, y, z, vx, vy, vz, grav, life: left / 100, t: 0, lx, ly, r: 3, team: 'foe', dead: false, color: '#ff7a2a', core: '#ffffff' }); }
  s.g.forEach((v, i) => { const g = W.gens[i]; if (!g) return; if (!v) { if (!g.dead) { g.dead = true; } return; } const hp = v / 10; if (hp < g.hp) g.shake = .2; g.hp = hp; g.rank = Math.max(1, Math.ceil(hp / (4 * TUNE.generatorHp))); const f = hp / g.max; g.dmg = f > .67 ? 0 : f > .34 ? 1 : 2; });
  if (s.b && W.boss) { const K = W.boss, [hp, ph, x, y, st, fa, open, fog, ch, stT] = s.b; if (hp < K.hp) K.hitT = .1; K.hp = hp; K.phase = ph; K.netA = K.netB || { x, y, at: s.at }; K.netB = { x, y, at: s.at }; K.state = BSTATE_OF[st]; K.facing = fa / 100; K.open = !!open; K.fog = fog > -999 ? { x: K.x, y: K.y, a: fog / 100, t: 1 } : null; K.charge = ch > -999 ? { a: ch / 100 } : null; K.stateT = stT / 100; K.dead = K.state === 'dead'; }
  if (s.tr !== undefined && W.treasure) W.treasure.t = s.tr / 10;
  if (s.bl !== undefined && W.bell) W.bell.target = s.bl >= 0 ? W.heroes.find(h => h.id === s.bl) || null : null;
  W.hostT = s.w / 10;
}
/** each client step: ease the puppets to the host's time minus 100 ms (up to 100 ms ahead of the last, then hold) */
function clientEase(dt) {
  const now = HUB.time() - 100;
  const ease = q => { const a = q.netA, b = q.netB; if (!a || !b) return; const span = Math.max(1, b.at - a.at), u = clamp((now - a.at) / span, 0, 1 + Math.min(100, span) / span), x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u; q.vx = (x - q.x) / Math.max(dt, 1e-3); q.vy = (y - q.y) / Math.max(dt, 1e-3); if (Math.hypot(q.vx, q.vy) > 400) { q.vx = q.vy = 0; } q.x = x; q.y = y; };
  for (const m of W.monsters) { ease(m); m.stateT += dt; m.hitT = Math.max(0, (m.hitT || 0) - dt); }
  for (const h of W.heroes) if (h.remote) { ease(h); if (Math.hypot(h.vx, h.vy) > 4) h.facing = Math.atan2(h.vy, h.vx); }
  if (W.boss) ease(W.boss);
  // the others' throws, drawn here from their trigger and aim (cosmetic)
  for (const h of W.heroes) if (h.remote && h.alive && h.firing) { h.netCool = (h.netCool || 0) - dt; if (h.netCool <= 0) { h.netCool = h.D.shot.cd; clientShot(h, h.aim); h.throwT = .18; } }
}
/** a host event on a client */
function applyEvent(ev, q) {
  const [type, a, b, c, d2, e2, f2] = ev;
  if (type === 'floor') { sessionFloor(a, b); return; }
  if (q !== undefined && q !== W.serial) return;
  switch (type) {
    case 'gone': { const it = W.items.find(i => i.id === a); if (it && !it.gone) { it.gone = true; const h = W.heroes.find(x => x.id === b); if (b >= 0 && h) emit('take', { h, it }); else if (b === -4) emit('kingAte', { it }); else emit('shotItem', { it, h }); } break; }
    case 'drop': if (!W.items.some(i => i.id === a)) { const D = get('items', b); if (D) W.items.push({ id: a, type: b, D, x: c, y: d2, z: 0, cx: cellOf(c), cy: cellOf(d2), sub: e2 || undefined, gone: false, t: 0 }); } break;
    case 'door': { const dr = W.doors[a]; if (dr && !dr.open) { dr.open = true; dr.openT = W.t; for (const [cx, cy] of dr.cells) W.map.set(cx, cy, 0); emit('door', { d: dr }); } break; }
    case 'wall': if (W.map.cell(a, b)) { W.map.set(a, b, 0); W.fake.delete(a + ',' + b); W.cracked.delete(a + ',' + b); emit('wall', { cx: a, cy: b, kind: 'cracked' }); } break;
    case 'trap': { for (const t of W.p.trapWalls[a]) W.map.set(t.cx, t.cy, 0); for (const p of W.plates) if (p.kind === a) p.used = true; emit('trap', { p: { kind: a } }); break; }
    case 'kill': { const m = PUP.get(a); if (m) { m.dead = true; PUP.delete(a); if (b !== -2 && b !== -3) emit('kill', { m, by: null }); else if (b === -2) emit('escaped', { m }); else emit('tithePaid', { m }); E.prune(W.monsters, x => x.dead); } break; }
    case 'gen': { const g = W.gens.find(x => x.id === a); if (g && !g.dead) { g.dead = true; emit('genDead', { g }); } break; }
    case 'magic': { const h = W.heroes.find(x => x.id === a); if (h && h.remote) emit('magic', { h, x: b, y: c, r: d2 || null }); else if (h) { game.shake(4); } break; }
    case 'say': bus.emit('say', { key: a, hero: W.heroes.find(x => x.id === b) || null, vars: c ? { thing: c } : null }); break;
    case 'king': bus.emit('kingSays', { text: STORY[a] }); break;
    case 'hurt': break;
    case 'rise': { const h = W.heroes.find(x => x.id === a); if (h) emit('rise', { h }); break; }
    case 'fall': break;
    case 'stolen': emit('stolen', {}); break;
    case 'bell': emit('bell', {}); break;
    case 'boss': emit('boss', { phase: a }); break;
    case 'tele': { const h = W.heroes.find(x => x.id === a); if (h && h.remote) h.netA = h.netB; break; }
    case 'imp': W.impatience = a; emit('impatience', { stage: a }); if (a >= 2) for (const d of W.doors) if (!d.open) { d.open = true; for (const [cx, cy] of d.cells) W.map.set(cx, cy, 0); } break;
    case 'hoard': emit('hoardShut', {}); break;
    case 'stairs': emit('descend', {}); break;
  }
}
/** a client's own hero, to the host: where, its aim and trigger */
function clientTick(dt) {
  netFlush();
  const h = W.heroes.find(q => !q.remote); if (!h) return;
  NET.sendT -= dt;
  if (NET.sendT <= 0) { NET.sendT = 1 / 12; netSend({ t: 'me', at: R0(HUB.time()), x: R0(h.x), y: R0(h.y), a: CA(h.aim), f: h.intent.fire && h.alive ? 1 : 0, p: h.intent.plant ? 1 : 0, q: W.serial }, { to: SESS.info.host, reliable: false }); }
  if (h.wantMagic) { h.wantMagic = false; const R = screenRect(h); netSend({ t: 'act', k: 'magic', n: ++NET.actN, v: [Math.round((R.x1 - R.x0) / 2 / T), Math.round((R.y1 - R.y0) / 2 / T)] }, { to: SESS.info.host }); }
}

// ---- 41-session.js ----
/* ---- AI HUB SESSIONS: connect, the game's own card, ready, the 3-2-1, play in one shared world, time-up, the end.
   In a session: no title, menus, settings screens, pausing, dev tools, high scores or quitting; Create + Options is the
   hub's (engine change E4). Outside one (AIHub.active false, or connect() answers null) none of this runs ---- */
const SESS = { info: null, card: null, started: false, startIn: 0, over: false, endInfo: null, finished: false, menu: null, left: new Set(), timeUp: false };
const SESS_MS = 6 * 60 * 1000;
scenes.session = {
  pausable: false, touch: [], camera: false, view: 'threequarter',
  enter() {
    this.t = 0; this.state = 'connecting'; game.allowJoin(false); game.input.touchEnabled = false;
    HUB.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
      if (!info) { game.go('title'); return; }
      SESS.info = info; NET.reset(info.server ? 'server' : info.isHost ? 'host' : 'client');
      HUB.on('card', c => { SESS.card = c; });
      HUB.on('start', () => { SESS.started = true; });
      HUB.on('message', (d, from) => { if (NET.ended || !W) return; NET.received++; if (NET.role === 'client') { if (from === info.host) clientHear(d); } else hostHear(from, d); });
      HUB.on('leave', ({ id }) => sessionLeave(id));
      HUB.on('time-up', () => { SESS.timeUp = true; if (NET.role !== 'client') sessionFinish('time'); });
      HUB.on('end', e => sessionEnd(e));
      sessionWorld(0, 1);
      this.state = 'card';
      HUB.ready();
    });
  },
  update(dt) {
    this.t += dt; stepNarrator(dt);
    if (this.state !== 'card') return;
    if (SESS.started && HUB.time() >= 0) { game.go('splay', {}, { fade: 0 }); return; }
    if (SESS.started) return;
    const I = game.input, c = I.clicked();
    if (I.pressed('confirm') || I.pressed('start') || (c && this.readyBtn && inBox(c, this.readyBtn))) { HUB.answer('ready'); sfx('select'); I.consumeAll(); }
    if (I.pressed('magic') || game.input.held.has('KeyT') && !this._t || (c && this.moreBtn && inBox(c, this.moreBtn))) { this._t = true; HUB.answer('more'); sfx('move'); }
    if (!game.input.held.has('KeyT')) this._t = false;
  },
  draw(r) {
    r.overlay(g => {
      drawShaft(g, r, this.t * .5, { gauntlet: this.state === 'connecting' });
      px.blend(g, .4, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#201018'));
      if (this.state === 'connecting') { logo(g, r, 60, 3); tx(g, 'JOINING THE SESSION...', r.W / 2, 120, '#ffe8b0', { align: 'center' }); return; }
      const info = SESS.info, c = SESS.card || {}, ready = new Set(c.ready || []), y = Math.max(4, Math.round((r.H - 236) / 2));
      logo(g, r, y + 4, r.W > 380 ? 3 : 2);
      tx(g, 'ROUND ' + (info.round || 1), r.W / 2, y + 30, '#e8c890', { align: 'center' });
      // the players, lined up as their heroes in their seat colours
      const ps = info.players, gap = Math.min(80, (r.W - 40) / Math.max(1, ps.length));
      ps.forEach((p, i) => {
        const x = r.W / 2 + (i - (ps.length - 1) / 2) * gap, h = W && W.heroes.find(q => q.hubId === p.id), cls = h ? h.cls : CLASSES[i % 4];
        drawRigAt(g, frontRig(cls), x, y + 96, 1 / 60, { pose: ready.has(p.id) ? 'cheer' : null, facing: Math.PI / 2 });
        tx(g, String(p.name || 'P' + (i + 1)).slice(0, 12), x, y + 102, p.color || SEAT_COLORS[i], { align: 'center' });
        tx(g, get('heroes', cls).name, x, y + 112, '#a89a88', { align: 'center', font: 'tiny' });
        if (ready.has(p.id)) tx(g, 'READY', x, y + 120, '#9aff8a', { align: 'center' });
      });
      tx(g, 'HOW TO WIN: MOST POINTS WHEN THE CLOCK RUNS OUT.', r.W / 2, y + 136, '#ffe8b0', { align: 'center' });
      tx(g, 'TREASURE, KILLS AND STAIRS. DON\'T STARVE.', r.W / 2, y + 146, '#ffe8b0', { align: 'center' });
      if (!info.server) { const I = game.input, pad = I.lastDevice === 'gamepad'; tx(g, 'MOVE ' + (pad ? '[L stick]' : '[WASD]') + '  AIM ' + (pad ? '[R stick]' : '[Mouse]') + '  FIRE ' + key(I, 'fire') + '  MAGIC ' + key(I, 'magic'), r.W / 2, y + 160, '#c8b8a0', { align: 'center' }); }
      const left = SESS.started ? 'STARTING' : c.paused ? 'PAUSED' : c.left != null ? Math.ceil(c.left / 1000) + ' S' : '';
      tx(g, left, r.W / 2, y + 174, '#ffd060', { align: 'center', scale: 2 });
      if (SESS.started) { const n = Math.ceil(-HUB.time() / 1000); if (n > 0 && n < 4) tx(g, String(n), r.W / 2, y + 44, '#ffffff', { align: 'center', scale: 5 }); return; }
      if (info.server) return;
      const by = y + 200;
      this.readyBtn = [r.W / 2 - 110, by, 100, 22]; this.moreBtn = [r.W / 2 + 10, by, 100, 22];
      E.ui.box(g, ...this.readyBtn, { bg: ['#4a6a1a', '#2a3a0a'], border: '#9aff8a' }); tx(g, 'READY ' + key(game.input, 'confirm'), this.readyBtn[0] + 50, by + 7, '#e8ffd8', { align: 'center' });
      E.ui.box(g, ...this.moreBtn, { bg: ['#4a3a1a', '#2a1a0a'], border: c.asked ? '#ffffff' : '#ffd060' }); tx(g, (c.asked ? 'ASKED ' : 'MORE TIME ') + (game.input.lastDevice === 'gamepad' ? key(game.input, 'magic') : '[T]'), this.moreBtn[0] + 50, by + 7, '#ffe8b0', { align: 'center' });
    });
  }
};
const inBox = (p, b) => p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3];
/** build (or rebuild) the shared floor: classes by seat, names and colours from the hub */
function sessionWorld(index, serial) {
  const info = SESS.info;
  if (!PARTY.length) {
    startRun(info.players.map((p, i) => ({ seat: i, cls: CLASSES[i % 4], name: String(p.name || 'P' + (i + 1)), color: p.color || SEAT_COLORS[i], input: p.id === info.me && !info.server ? game.input : null, remote: p.id !== info.me || info.server })), { mode: 'session', seed: info.seed || 1 });
    PARTY.forEach((h, i) => { h.hubId = info.players[i].id; });
  }
  for (const h of PARTY) { if (!h.alive) { h.alive = true; h.hp = Math.max(h.hp, 350); } }
  PUP.clear(); NET.snaps = [];
  buildWorld(index, { role: NET.role, serial, seed: info.seed || 1 });
  for (const h of W.heroes) if (SESS.left.has(h.hubId)) h.gone = true;
  W.heroes = W.heroes.filter(h => !h.gone);
}
/** a client hears that the host went down a floor */
function sessionFloor(index, serial) { if (!W || serial <= W.serial) return; sessionWorld(index, serial); floorBanner = 2.5; music(REALM_SONG[W.realm] || 'larder'); }

scenes.splay = {
  pausable: false, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: GD_INPUT, touch: [], camera: CAM, propSize: 1.3,
  enter() {
    floorBanner = 3; SESS.menu = null; game.input.touchEnabled = false; camBounds();
    if (!SESS.info.server) { music(REALM_SONG[W.realm] || 'larder'); L.enabled = true; lighting(); } else A.mute(true);
    const me = W.heroes.find(h => !h.remote); if (me) game.follow(me, { z: 12, lead: 12 });
    say('start', null, 2);
  },
  update(dt) {
    stepNarrator(dt);
    if (NET.ended) { game.input.clear(); return; }
    const me = W.heroes.find(h => !h.remote);
    // the session's own small menu: Esc or Options; it never pauses (the hero stands still while it is open)
    if (game.input.pressed('pause') && me) { SESS.menu = SESS.menu ? null : new BigMenu(sessionMenuItems(), { y: 70, scale: 1 }); sfx('select'); }
    if (SESS.menu) { SESS.menu.update(); if (game.input.pressed('cancel')) SESS.menu = null; if (me) idleIntent(me); }
    else if (me) { if (me.alive) inputIntent(me, game.input); else idleIntent(me); }
    if (NET.role === 'client') { clientEase(dt); stepWorld(dt); clientTick(dt); }
    else {
      stepWorld(dt);
      for (const h of W.heroes) if (!h.alive && h.deadT >= 5) rise(h, 350, 250);   // sessions: back after 5 s beside a friend, 250 points poorer
      if (W.heroes.length && !W.heroes.some(h => h.alive)) sessionFinish('all down');
      if (W.boss && W.boss.dead && W.boss.deadT > 3) sessionFinish('king');
      if (W.done && !SESS.finished) { const to = W.done.to; const next = to === 'ending' || to >= FLOOR_ORDER.length ? 0 : to; W.events.push(['floor', next, W.serial + 1]); hostTick(dt); netFlush(); sessionWorld(next, W.serial + 1); floorBanner = 2.5; if (!SESS.info.server) music(REALM_SONG[W.realm] || 'larder'); }
      hostTick(dt);
    }
    if (me) { if (game.cam.frame) game.cam.frame(null); game.follow(me, { z: 12, lead: 12 }); }
    else if (W.heroes.length) game.focus(W.heroes[0].x, W.heroes[0].y, 10);
    musicLayers();
  },
  draw(r) {
    if (SESS.info.server) { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#0a0610'); tx(g, 'HOSTING', r.W / 2, r.H / 2 - 4, '#a89a88', { align: 'center', scale: 2 }); }); return; }
    drawWorld(r); drawHud(r);
    r.overlay(g => {
      if (SESS.menu) { E.ui.box(g, r.W / 2 - 90, 56, 180, 110, { bg: ['#2a1a10', '#140a06'], border: '#ffd060', alpha: .95 }); tx(g, 'SETTINGS', r.W / 2, 60, '#ffd060', { align: 'center' }); SESS.menu.draw(g, r); }
      if (NET.ended) { px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#100810')); sessionOver(g, r); }
      if (CHEATS.netstats) { const s = NET.stats(); tx(g, NET.role + ' sent ' + s.sent + ' got ' + s.received + ' snap ' + s.lastSnapshotBytes + 'B max ' + s.maxBytes + 'B ' + s.maxPerSec + '/s', 4, r.H - 24, '#9aff8a', { font: 'tiny' }); }
    });
  }
};
function sessionMenuItems() {
  const S2 = game.settings, step = (k, d) => { S2.set(k, clamp(Math.round((S2[k] + d) * 10) / 10, 0, 1)); SESS.menu.items = sessionMenuItems(); };
  return [
    { label: 'VOLUME ' + Math.round(S2.volume * 100) + '%', fn: () => step('volume', S2.volume >= 1 ? -1 : .1) },
    { label: 'MUSIC ' + Math.round(S2.music * 100) + '%', fn: () => step('music', S2.music >= 1 ? -1 : .1) },
    { label: 'VOICES ' + Math.round(S2.voices * 100) + '%', fn: () => step('voices', S2.voices >= 1 ? -1 : .1) },
    { label: 'BUTTONS: ' + (S2.glyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION'), fn: () => { S2.set('glyphs', S2.glyphs === 'xbox' ? 'playstation' : 'xbox'); SESS.menu.items = sessionMenuItems(); } },
    { label: 'CLOSE', fn: () => { SESS.menu = null; } }
  ];
}
/** the host ends the round: standings by score (ties together), scores, stats and awards */
function sessionFinish(why) {
  if (SESS.finished || NET.role === 'client' || !W) return;
  SESS.finished = true;
  const hs = PARTY.filter(h => !SESS.left.has(h.hubId)).slice().sort((a, b) => b.score - a.score), standings = [];
  for (const h of hs) { const last = standings[standings.length - 1]; if (last && last.s === h.score) last.ids.push(h.hubId); else standings.push({ s: h.score, ids: [h.hubId] }); }
  const scores = {}, stats = {}; for (const h of PARTY) { scores[h.hubId] = h.score; stats[h.hubId] = { Kills: h.stats.kills, Treasure: h.stats.treasure, Food: h.stats.food, Floors: h.stats.floors }; }
  const best = (f, title, detail) => { const h = PARTY.slice().sort((a, b) => f(b) - f(a))[0]; return h && f(h) > 0 ? { id: h.hubId, title, detail: detail(h) } : null; };
  const awards = [best(h => h.stats.food, 'Glutton', h => h.stats.food + ' meals'), best(h => h.stats.gens, 'Generator Buster', h => h.stats.gens + ' broken'), best(h => h.stats.floors, 'Stair Finder', h => h.stats.floors + ' floors'), best(h => h.stats.foodShot, 'Shot the Supper', h => h.stats.foodShot + ' wasted')].filter(Boolean);
  netSend({ t: 'e', q: W.serial, e: W.events.splice(0) });
  HUB.finish({ standings: standings.map(s => s.ids), scores, stats, awards });
  void why;
}
function sessionLeave(id) {
  SESS.left.add(id);
  if (!W) return;
  const h = W.heroes.find(q => q.hubId === id);
  if (h) { emit('fall', { h }); W.heroes.splice(W.heroes.indexOf(h), 1); sfx('leave'); }
  if (NET.role !== 'client' && !W.heroes.length) sessionFinish('empty');
}
function sessionEnd(e) {
  NET.ended = true; SESS.endInfo = e; game.input.clear(); music(null); A.mute(true);
  clearNarrator();
}
function sessionOver(g, r) {
  const e = SESS.endInfo || {}, why = { void: 'THE ROUND DID NOT COUNT', 'host-left': 'THE HOST LEFT', 'sat-out': 'YOU SAT THIS ONE OUT', 'session-ended': 'THE SESSION ENDED' }[e.reason];
  E.font.title(g, 'ROUND OVER', r.W / 2, 40, { align: 'center', scale: 3, colors: TITLE_COLORS, depth: 3 });
  if (why) tx(g, why, r.W / 2, 74, '#ffb0a0', { align: 'center' });
  const order = (e.standings || []).flat(), list = order.length ? order.map(id => PARTY.find(h => h.hubId === id)).filter(Boolean) : PARTY.slice().sort((a, b) => b.score - a.score);
  list.forEach((h, i) => { tx(g, (i + 1) + '. ' + h.name.slice(0, 14), r.W / 2 - 90, 96 + i * 16, h.color, { scale: 1 }); tx(g, String(h.score), r.W / 2 + 90, 96 + i * 16, INK, { align: 'right' }); });
}
/** the round's clock and everyone's score, top centre */
function sessionStrip(g, r, y0) {
  const left = SESS.info.limitMs ? Math.max(0, SESS.info.limitMs - Math.max(0, HUB.time())) : 0, m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60;
  if (SESS.info.limitMs) tx(g, m + ':' + String(s).padStart(2, '0'), r.W / 2, y0 + 2, left < 30000 ? RED : '#ffe8b0', { align: 'center', scale: 2 });
  const list = W.heroes.slice().sort((a, b) => b.score - a.score), w = 70;
  list.forEach((h, i) => tx(g, h.name.slice(0, 7) + ' ' + h.score, r.W / 2 + (i - (list.length - 1) / 2) * w, y0 + 20, h.color, { align: 'center', font: 'tiny' }));
}

// ---- 50-view.js ----
/* ---- THE VIEW: draws the world (or the host's world on a client). Rigs live here: made and posed only when drawn ---- */
const rgb = h => E.hex(h);
/** a realm's floor: flagstones, rugs and dust, lava that glows, stairwells that fall away into the dark */
function floorTexFor(realm, F) {
  const R = REALM_LOOK[realm], st = R.floor.map(rgb), alt = R.alt.map(rgb), mortar = rgb(R.mortar), FL = { stones: st.slice(1, 4), mortar, hi: st[4], lo: st[0], speck: st[0] };
  const lavaA = rgb('#ff5a14'), lavaB = rgb('#ffb43a'), lavaC = rgb('#7a1a0a'), black = [8, 6, 12], gold = rgb('#e8c060');
  const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  return (x, y, tag) => {
    const cx = Math.floor(x / T), cy = Math.floor(y / T), lx = x - cx * T, ly = y - cy * T;
    if (tag === 'lava') {
      const n = E.noise2(x / 9, y / 9), n2 = E.noise2(x / 3.5 + 9, y / 3.5);
      const c = n > .62 ? lavaB : n > .38 ? lavaA : mixc(lavaC, lavaA, n / .38);
      return [...mixc(c, lavaB, n2 > .75 ? .5 : 0), .7];
    }
    if (tag === 'stairs') {
      const rim = lx < 1.5 || lx > T - 1.5 || ly < 1.2;
      if (rim) return mixc(st[2], gold, ly < 1.2 && lx > 3 && lx < 13 ? .4 : 0);
      const step = Math.floor((ly - 1.2) / 2.6), edge = (ly - 1.2) % 2.6 < .7;
      return mixc(edge ? st[3] : st[1], black, Math.min(1, step / 5 + .1));
    }
    let base;
    if (realm === 'banquet') {
      const dark = (cx + cy) & 1, v = E.noise2(x / 7 + (dark ? 4 : 0), y / 7);
      base = dark ? mixc(alt[0], alt[1], v * .6) : mixc(st[0], st[1], v * .6);
      if (lx < .7 || ly < .7) base = mixc(base, gold, .35);
      if (tag === 'alt') base = mixc(alt[1], alt[2], E.hash2(Math.floor(x / 3), Math.floor(y / 3)) * .5);
      return base;
    }
    if (realm === 'furnace') {
      base = E.tex.flagstone(x, y, FL, 12);
      if ((lx < 1.6 || ly < 1.6) && E.hash2(cx, cy) > .3) base = mortar;
      if ((Math.abs(lx - 2.5) < .8 || Math.abs(lx - 13.5) < .8) && (Math.abs(ly - 2.5) < .8 || Math.abs(ly - 13.5) < .8)) base = st[4];
      const glow = E.noise2(x / 30, y / 30); if (glow > .7) base = mixc(base, lavaA, (glow - .7) * .5);
    } else if (R.planks) {
      const row = Math.floor(y / 5), off = E.hash2(row, 3) * 40, seam = (x + off) % 40 < 1 || y % 5 < .8, grain = E.noise2(x / 9 + row * 3, y / 2) * .25, k = E.hash2(Math.floor((x + off) / 40), row);
      base = seam ? mortar : mixc(st[k < .33 ? 1 : k < .66 ? 2 : 3], st[0], grain);
      if (!seam && (x + off) % 40 > 37.6 && y % 5 > 2 && y % 5 < 3) base = st[0];
    } else base = E.tex.flagstone(x, y, FL, realm === 'ossuary' ? 9 : 8);
    if (tag === 'alt') {
      if (realm === 'larder') { const edge = lx < 1 || lx > T - 1 || ly < 1 || ly > T - 1; base = edge ? alt[0] : (Math.floor(lx / 2) + Math.floor(ly / 4)) % 3 ? alt[1] : alt[2]; }
      else base = mixc(base, alt[1], E.hash2(Math.floor(x / 2), Math.floor(y / 2)) * .7);
    }
    return base;
  };
}

/* ---- rigs, kept per entity ---- */
const RIGS = new Map();
let lastDraw = 0;
function rigOf(e, make) { let v = RIGS.get(e); if (!v || v.key !== make.key) { v = { rig: make(), key: make.key, t: 0 }; RIGS.set(e, v); } return v.rig; }
const heroRig = h => rigOf(h, Object.assign(() => HERO_RIGS[h.cls](), { key: h.cls }));
const monRig = m => rigOf(m, Object.assign(() => MON_RIGS[m.type](m.rank), { key: m.type + m.rank }));
const BOW_SPEC = { a0: 0, a1: 0, z0: 1, z1: 1, reach: 9, r0: 7, r1: 9, hand: 'L', rel: true, blade: 0, lean: -.2 };
const SIZE_BY_RANK = [0, .86, 1, 1.12];

function drawWorld(r) {
  if (!W) return;
  const now = game.real, fdt = clamp(now - lastDraw, 0, .05); lastDraw = now;
  const view = E.charView(r.view), map = W.map, R = REALM_LOOK[W.realm];
  map.drawFloor(r); map.queueWalls(r);
  L.enabled = true; L.ambient = R.ambient - (W.impatience >= 3 ? .06 : 0);
  // stairs: an arch over each, and the floor number carved on skip stairs
  for (const s of W.stairs) {
    const x = mid(s.cx), y = mid(s.cy);
    if (s.to) r.queue(x, y, 0, g => { const [sx, sy] = r.w(x, y, 1); E.font.text(g, String(s.to), sx, sy - 4, '#ffe08a', { align: 'center', scale: 2, shadow: '#000', outline: false }); }, { bias: .2, emissive: true });
    L.add(x, y, 6, 34, .5, { color: '#ffd070' });
    if (W.impatience >= 3 || W.firsts.stairsSeen) r.decal(() => r.groundRing(x, y, 9 + Math.sin(now * 4) * 1.5, '#ffe08a'), { emissive: 1 });
  }
  // torches on the walls, props in the corners
  for (const t of W.dec.torches) { const x = mid(t.cx), y = (t.cy + 1) * T + 1; r.prop('torch', x, y, 13, { light: true, color: R.light }); }
  for (const d of W.dec.deco) drawDeco(r, d, R);
  if (W.realm === 'furnace') for (const c of W.p.lava) if ((c.cx + c.cy * 3) % 4 === 0) L.add(mid(c.cx), mid(c.cy), 4, 40, .55, { color: '#ff6a1a' });
  // open doors: the bars slide up out of sight
  for (const d of W.doors) if (d.open && W.t - d.openT < .5) { const u = (W.t - d.openT) / .5; for (const [cx, cy] of d.cells) r.queue(mid(cx), (cy + 1) * T, 0, g => { const z0 = u * 24, [ax, ay] = r.w(mid(cx) - 7, (cy + 1) * T, z0), [bx, by] = r.w(mid(cx) + 7, (cy + 1) * T, z0 + 24 * (1 - u)); for (let k = 0; k < 5; k++) { const X = ax + (bx - ax) * k / 4; px.line(g, X, ay, X, by, '#3a3a44', 1); } }, { bias: .5 }); }
  drawFeatures(r, now);
  drawItems(r, now, view);
  drawGens(r, now);
  drawMonsters(r, fdt, view, now);
  if (W.boss) drawBoss(r, fdt, view, now);
  drawHeroes(r, fdt, view, now);
  drawShots(r, now);
  // the hero's light: a soft pool so heroes are never lost in the dark
  for (const h of W.heroes) if (h.alive) L.add(h.x, h.y, 14, 96, .28, { color: '#fff0d0' });
  if (W.magicFlash > 0) L.add(W.heroes[0] ? W.heroes[0].x : 0, W.heroes[0] ? W.heroes[0].y : 0, 30, 400, W.magicFlash * 2, { color: '#ffffff' });
  if (CHEATS.hitboxes) drawHitboxes(r);
  if (CHEATS.flowfield) drawFlow(r);
  drawReticle(r);
}
function drawDeco(r, d, R) {
  const x = mid(d.cx), y = mid(d.cy), f = d.facing;
  switch (d.prop) {
    case 'barrel': r.shape('barrel', x, y, 0, { facing: f, scale: .75 }); break;
    case 'keg': r.shape(ASH('keg', 'barrel'), x, y, 0, { facing: f, scale: .7 }); break;
    case 'sacks': r.shape('sack', x - 3, y, 0, { facing: f, scale: .8 }); r.shape('sack', x + 4, y + 2, 0, { facing: f + 1, scale: .7 }); break;
    case 'crate': r.shape('crate', x, y, 0, { facing: f, scale: .7 }); break;
    case 'rack': r.shape('gd-rack', x, y, 0, { facing: 0, scale: .9 }); break;
    case 'candles': r.shape(ASH('candle-triple', 'jar'), x, y, 0, { scale: .9 }); r.prop('candle', x + 4, y + 3, 0, { light: true, size: .8 }); break;
    case 'coffin': r.shape(ASH('coffin-old', 'crate'), x, y, 0, { facing: f + Math.PI / 2, scale: .55 }); break;
    case 'bones': r.prop('bones', x, y, 0, { size: 1.1 }); break;
    case 'skull': r.prop('skull', x, y, 0, { size: 1.2 }); r.prop('candle', x + 5, y + 2, 0, { light: true, size: .7 }); break;
    case 'jar': r.shape('gd-jar', x, y, 0, { scale: 1 }); break;
    case 'urn': r.shape('pot', x, y, 0, { scale: .9 }); break;
    case 'brazier': r.prop('brazier', x, y, 0, { light: true, size: .9 }); break;
    case 'firedrum': r.prop('firedrum', x, y, 0, { light: true, size: .9 }); break;
    case 'anvil': r.shape('gd-anvil', x, y, 0, { facing: f }); break;
    case 'chains': r.prop('bones', x, y, 0, { size: .8 }); r.shape('gd-anvil', x + 2, y - 2, 0, { facing: f, scale: .7 }); break;
    case 'candelabra': r.prop('candelabra', x, y, 0, { light: true, size: 1 }); break;
    case 'banner': r.shape(ASH('banner-red', 'crate'), x, y - 6, 0, { facing: Math.PI / 2, scale: .9 }); break;
    case 'pillar': r.shape('gd-pillar', x, y, 0, {}); break;
  }
}
function drawFeatures(r, now) {
  for (const p of W.plates) r.shape('gd-plate', mid(p.cx), mid(p.cy), p.used ? -.5 : 0, {});
  for (const [i, p] of W.pads.entries()) { r.shape('gd-pad', mid(p.cx), mid(p.cy), 0, {}); const a = now * 3 + i; r.decal(() => { for (let k = 0; k < 3; k++) r.groundArc(mid(p.cx), mid(p.cy), 3.5 + k * 1.5, 4.3 + k * 1.5, a + k * 2, a + k * 2 + 1.6, '#8afff4'); }, { emissive: 1 }); L.add(mid(p.cx), mid(p.cy), 2, 26, .5, { color: '#6ae8e0' }); }
  for (const q of W.runes) { r.shape('gd-rune', mid(q.cx), mid(q.cy), 0, {}); L.add(mid(q.cx), mid(q.cy), 2, 20, .35 + Math.sin(now * 5) * .1, { color: '#ff4a6a' }); }
  for (const s of W.spikes) {
    const j = s.trem ? Math.sin(now * 80) * .6 : 0;
    r.shape(s.up ? 'gd-spikes' : 'gd-spikeplate', mid(s.cx) + j, mid(s.cy), 0, {});
  }
  for (const g of W.beams) {
    // pylons where the beam meets walls; the beam drawn bright while on, a flicker before
    const c0 = g.cells[0], c1 = g.cells[g.cells.length - 1], v = g.dir === 'v', show = g.on || (g.warn && Math.floor(now * 20) % 2);
    const ends = v ? [[mid(c0.cx), Math.min(c0.cy, c1.cy) * T], [mid(c0.cx), (Math.max(c0.cy, c1.cy) + 1) * T]] : [[Math.min(c0.cx, c1.cx) * T, mid(c0.cy)], [(Math.max(c0.cx, c1.cx) + 1) * T, mid(c0.cy)]];
    for (const [x, y] of ends) r.shape('gd-pylon', x, y, 0, { scale: .8 });
    if (!show) continue;
    const [a, b] = ends;
    r.queue((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0, gg => { for (const z of [5, 9, 13]) { const [x0, y0] = r.w(a[0], a[1], z), [x1, y1] = r.w(b[0], b[1], z); px.glow(gg, 1); px.line(gg, x0, y0 + Math.sin(now * 30 + z) * .7, x1, y1, g.on ? '#9afff8' : '#3a8a88', 1); } }, { emissive: true, bias: .4 });
    if (g.on) L.add((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 8, 50, .6, { color: '#6ae8e0' });
  }
  if (W.bell) { const b = W.bell, sw = Math.sin(now * 9) * b.swing * .5; r.shape('gd-bell', b.x, b.y, 0, { facing: Math.PI / 2 + sw }); if (b.target) L.add(b.x, b.y, 20, 40, .5, { color: '#ffd060' }); }
}
const SHAKE = () => (Math.random() - .5) * 1.4;
function drawItems(r, now, view) {
  for (const it of W.items) {
    if (it.gone || it.pending) continue;
    const bob = Math.sin(now * 3 + it.t) * 1, x = it.x, y = it.y, z = it.z || 0, D = it.D;
    switch (it.type) {
      case 'roast': r.shape(ASH('wholer-ham', 'pot'), x, y, z, { scale: .62, facing: it.t }); break;
      case 'loaf': r.shape(ASH('loaf-round', 'pot'), x, y, z, { scale: .8 }); break;
      case 'platter': r.shape(ASH('plate-dinner', 'pot'), x, y, z, { scale: .85 }); break;
      case 'stew': r.shape(ASH('bowl-soup', 'pot'), x, y, z, { scale: .8, mats: { s: 'gd-soup' } }); r.queue(x, y, z + 4, g => { if (Math.floor(now * 3 + it.t) % 3 === 0) { const [sx, sy] = r.w(x, y, z + 6 + (now * 6 % 4)); px.dot(g, sx, sy, '#9ae84a'); } }); break;
      case 'chest': case 'lockedchest': r.prop('chest', x, y, z, { open: it.open, size: .9, color: D.locked ? '#5a4a6a' : '#8a5a2a' }); if (D.locked) r.sprite(x, y, 14 + bob, SPR.key, {}); break;
      case 'key': r.shadow(x, y, 3, .3); r.sprite(x, y, 5 + bob, SPR.key, { glow: .4 }); break;
      case 'gold': r.shadow(x, y, 4, .3); r.sprite(x, y, 2, SPR.gold, { glow: .2 }); break;
      case 'gem': r.shadow(x, y, 3, .3); r.sprite(x, y, 4 + bob, (it.id % 2) ? SPR.gem : SPR.ruby, { glow: .5 }); if (Math.random() < .03) P.glints(x, y, 8, 1, '#ffffff', 6); break;
      case 'crown': r.shadow(x, y, 4, .3); r.sprite(x, y, 4 + bob, SPR.crown, { glow: .5 }); if (Math.random() < .05) P.glints(x, y, 10, 1, '#fff0a0', 8); break;
      case 'cider': r.shadow(x, y, 3, .3); r.sprite(x, y, 1, SPR.jug, {}); break;
      case 'flask': r.shadow(x, y, 3, .3); r.sprite(x, y, 3 + bob, SPR.flask, { glow: .6 }); L.add(x, y, 8, 18, .35, { color: '#5a8aff' }); break;
      case 'special': r.shadow(x, y, 3, .3); r.sprite(x, y, 4 + bob, SPR['sp_' + it.sub] || SPR.flask, { glow: .7 }); L.add(x, y, 8, 22, .45, { color: get('specials', it.sub).color }); break;
      case 'amulet': r.shadow(x, y, 3, .3); r.sprite(x, y, 6 + bob * 1.5, SPR['am_' + it.sub] || SPR.gem, { glow: .7 }); L.add(x, y, 8, 22, .45, { color: get('amulets', it.sub).color }); break;
      case 'gauntlet': r.shadow(x, y, 6, .4); r.queue(x, y, 10 + bob * 2, g => drawGauntlet(g, ...r.w(x, y, 10 + bob * 2), 1.4, now), { emissive: true }); L.add(x, y, 12, 70, .9, { color: '#ffd060' }); break;
    }
  }
}
/** the Iron Gauntlet: a mailed fist, gold-trimmed, glowing */
function drawGauntlet(g, x, y, k, now) {
  const C = E.tones('#9aa0ac'), Gd = E.tones('#e8c040');
  px.glow(g, 1);
  px.rect(g, x - 4 * k, y - 2 * k, 8 * k, 7 * k, C.sh); px.rect(g, x - 3.4 * k, y - 1.6 * k, 6 * k, 5.4 * k, C.base);
  for (let i = 0; i < 4; i++) px.rect(g, x - 4 * k + i * 2 * k, y - 6 * k, 1.6 * k, 4.4 * k, i % 2 ? C.lt : C.base);
  px.rect(g, x - 5 * k, y + 4.6 * k, 10 * k, 2.4 * k, Gd.base); px.rect(g, x - 5 * k, y + 4.6 * k, 10 * k, .8 * k, Gd.hi);
  px.dot(g, x - 2 * k, y - 4 * k, '#ffffff');
  if (Math.floor(now * 4) % 3 === 0) px.dot(g, x + 3 * k, y - 5 * k, '#fff8d0');
}
function drawGens(r, now) {
  for (const g of W.gens) {
    if (g.dead) continue;
    const j = g.shake > 0 ? SHAKE() : 0, s = g.breathe > 0 ? 1.06 : 1;
    r.shape(g.D.shape, g.x + j, g.y, g.D.onTable ? 10 : 0, { params: { dmg: g.dmg }, scale: s, facing: Math.PI / 2, pick: g });
    if (g.type === 'grate') L.add(g.x, g.y, 4, 34, .7, { color: '#ff7a2a' });
    if (g.type === 'shrine') L.add(g.x, g.y, 18, 30, .5, { color: '#ffc060' });
    if (g.shake > .1) r.queue(g.x, g.y, 24, gg => { const [sx, sy] = r.w(g.x, g.y, 26); E.font.text(gg, String(Math.ceil(g.hp)), sx, sy, '#ffe08a', { align: 'center', shadow: '#000', outline: false }); }, { bias: 3 });
  }
}
function attackOf(m) {
  const D = m.D, st = m.state;
  if (m.ai === 'melee' || m.ai === 'imp' || m.ai === 'fryar') {
    const spec = E.MOVES[m.ai === 'fryar' ? 'bash' : m.ai === 'imp' ? 'claw' : 'overhead'];
    if (st === 'wind') return { spec, phase: 'wind', u: clamp(m.stateT / D.wind, 0, 1) };
    if (st === 'strike') return { spec, phase: 'active', u: clamp(m.stateT / .12, 0, 1) };
    if (st === 'recover') return { spec, phase: 'recover', u: clamp(m.stateT / Math.max(.1, D.every - D.wind - .12), 0, 1) };
  }
  if (m.ai === 'lobber' && st === 'throw') return { spec: E.MOVES.throw, phase: m.stateT < .3 ? 'wind' : 'active', u: m.stateT < .3 ? m.stateT / .3 : (m.stateT - .3) / .15 };
  return null;
}
function drawMonsters(r, fdt, view, now) {
  const hover = hoverTarget();
  for (const m of W.monsters) {
    if (m.dead) continue;
    if (!r.visible(m.x, m.y, 10, 30, 30, 30)) continue;
    const rig = monRig(m), riseK = m.rise > 0 ? 1 - m.rise / .4 : 1, z = (m.z || 0) - (1 - riseK) * 14 + (m.D.fly && m.ai !== 'ghost' ? 4 + Math.sin(now * 2 + m.id) * 2 : 0);
    if (m.ai === 'ghost') rig.update(fdt, { vx: m.vx, vy: m.vy, gape: m.gape, size: SIZE_BY_RANK[m.rank] });
    else if (rig instanceof E.Blob) rig.update(fdt, { walk: Math.min(1, Math.hypot(m.vx, m.vy) / 30), flap: 1, squash: m.state === 'spit' ? -.2 : 0, look: [Math.cos(m.facing), Math.sin(m.facing)] });
    else rig.update(fdt, { x: m.x, y: m.y, z: 0, vx: m.vx, vy: m.vy, facing: m.facing, attack: attackOf(m), hurt: m.hitT > 0, pose: m.ai === 'tithe' && m.draining ? 'cast' : null, expr: m.state === 'wind' ? 'angry' : null });
    if (m.ai !== 'ghost') r.shadow(m.x, m.y, m.r * .9, .3);
    const alpha = m.ai === 'fryar' && m.hidden ? .12 : m.ai === 'ghost' ? 1 : riseK < 1 ? .6 : 1;
    if (alpha < .2 && Math.random() < .5) continue;
    r.actor(m.x, m.y, z, (g, ox, oy) => rig.draw(g, ox, oy, view), { flash: m.hitT > 0 ? '#ffffff' : null, flashMix: .7, alpha: alpha < 1 ? alpha : undefined, outline: hover === m ? '#ffe08a' : false, every: W.monsters.length > 60 && m !== hover ? 2 : 1, key: m });
    // telegraphs: the imp's mouth glows; the lobber's crock is raised; a fryar's pan drawn back
    if (m.ai === 'imp' && m.state === 'spit') { r.queue(m.x, m.y, 10, g => { const [sx, sy] = r.w(m.x + Math.cos(m.facing) * 3, m.y + Math.sin(m.facing) * 3, 8); px.glow(g, 1); px.disc(g, sx, sy, 1.5 + m.stateT * 6, '#ffd040'); }, { emissive: true, bias: 1 }); L.add(m.x, m.y, 8, 24, .6, { color: '#ff8a2a' }); }
    if (m.ai === 'snatcher') r.queue(m.x, m.y, 10, g => { const b = Math.abs(Math.sin(now * 14)) * 1.5, [sx, sy] = r.w(m.x - Math.cos(m.facing) * 4, m.y - Math.sin(m.facing) * 4, 11 + b); px.disc(g, sx, sy, m.loot ? 4.5 : 3.5, '#8a7a50'); px.disc(g, sx - 1, sy - 1, m.loot ? 3.4 : 2.4, '#b8a070'); if (m.loot && m.loot.type !== 'none') px.dot(g, sx, sy - 3, m.loot.type === 'flask' ? '#5a8aff' : '#f8d048'); }, { bias: -.2 });
    if (m.ai === 'tithe') { L.add(m.x, m.y, 20, 30, .4, { color: '#ff2a2a' }); if (m.draining) { const h = W.heroes.find(h => h.alive && near(h, m, 20)); if (h && Math.random() < .5) P.add({ kind: 'ember', x: h.x, y: h.y, z: 14, vx: (m.x - h.x) * 3, vy: (m.y - h.y) * 3, vz: 6, max: .3, color: '#ff3a3a' }); } }
    if (hover === m) r.queue(m.x, m.y, 30, g => { const [sx, sy] = r.w(m.x, m.y, 34); E.font.text(g, m.D.name + (m.D.immune ? '' : ' ' + 'I'.repeat(m.rank)), sx, sy, '#ffe08a', { align: 'center', shadow: '#000', outline: false }); }, { bias: 4 });
  }
}
function drawBoss(r, fdt, view, now) {
  const K = W.boss, rig = rigOf(K, Object.assign(() => MON_RIGS.king(), { key: 'king' }));
  const pose = K.dead ? 'die' : K.state === 'eat' ? 'cast' : K.state === 'stomp' ? 'crouch' : K.phase === 0 ? 'hips' : null;
  const attack = K.throwT > 0 ? { spec: E.MOVES.throw, phase: K.throwT > .2 ? 'wind' : 'active', u: 1 - (K.throwT % .2) / .2 } : null;
  rig.update(fdt, { x: K.x, y: K.y, z: 0, vx: K.vx, vy: K.vy, facing: K.facing, pose, attack, hurt: K.hitT > 0, expr: K.state === 'eat' ? 'smile' : K.phase === 3 ? 'shout' : 'angry' });
  r.shadow(K.x, K.y, 14, .4);
  if (K.state === 'aim' && K.charge) r.decal(() => { const a = K.charge.a, x1 = K.x + Math.cos(a) * 200, y1 = K.y + Math.sin(a) * 200; for (let k = 0; k < 20; k++) { const u = k / 20; r.groundDisc(K.x + (x1 - K.x) * u, K.y + (y1 - K.y) * u, 2.5, Math.floor(now * 10) % 2 ? '#ff4a3a' : '#ffd040'); } }, { emissive: 1 });
  if (K.state === 'stomp') r.decal(() => r.groundRing(K.x, K.y, 46 * Math.min(1, K.stateT / .6), '#ff4a3a'), { emissive: 1 });
  if (K.stomp > 0) r.decal(() => r.groundRing(K.x, K.y, 46 + (1 - K.stomp / .5) * 20, '#ffd040'), { emissive: 1 });
  if (K.fog) r.decal(() => { const f = K.fog; for (let k = 0; k < 14; k++) { const a = f.a + (k / 13 - .5) * 1.1; for (let d = 30; d < 130; d += 22) r.groundDisc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 7, '#4a6a2a', .35); } });
  r.actor(K.x, K.y, 0, (g, ox, oy) => {
    rig.draw(g, ox, oy, view);
    if (K.open && !K.dead) { const q = rig.worldOffset ? rig.worldOffset(rig.J.shC) : [0, 0, 30], p = view.p(q[0], q[1], q[2] - 6); drawGauntlet(g, ox + p[0], oy + p[1], .9, now); }
  }, { flash: K.hitT > 0 ? '#ffffff' : null, xray: { color: '#c84aff' } });
  if (K.open) L.add(K.x, K.y, 30, 50, .7, { color: '#ffd060' });
}
function drawHeroes(r, fdt, view, now) {
  for (const h of W.heroes) {
    const rig = heroRig(h), dead = !h.alive, firing = h.throwT > 0;
    let attack = h.combo.state || null;
    if (!attack && firing) { const u = 1 - h.throwT / .18; attack = h.D.throwMove === 'bow' ? { spec: BOW_SPEC, phase: u < .5 ? 'wind' : 'active', u: u < .5 ? u * 2 : (u - .5) * 2 } : E.move(h.D.throwMove === 'cast' ? 'cast' : 'throw', u < .4 ? u / .4 : (u - .4) / .6, u < .4 ? 'wind' : 'active'); }
    rig._gdDraw = firing && h.D.throwMove === 'bow' ? 1 : 0;
    rig.o.hunch = h.cls === 'hexer' ? .3 + (h.hp < 200 ? .3 : 0) : h.hp < 200 ? clamp((200 - h.hp) / 200, 0, .6) : 0;
    const pose = dead ? 'die' : h.castT > 0 ? 'cast' : W.cheer ? 'cheer' : h.stun > 0 ? 'guard' : null;
    rig.update(fdt, { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: firing || attack ? h.aim : h.facing, attack, hurt: h.hurtT > 0, pose, down: h.riseT > 0 ? h.riseT : undefined, expr: h.hurtT > 0 ? 'wince' : h.eatT > 0 ? 'smile' : null });
    if (h.eatT > 0) rig.kick(.08);
    const sink = h.sinkT ? Math.min(1, h.sinkT / .5) * 12 : 0;
    if (!dead) { r.shadow(h.x, h.y, 6, .35); r.decal(() => r.groundRing(h.x, h.y, 8, h.color), { emissive: 1 }); }
    if (!dead && h.stair > 0) r.decal(() => r.groundRing(h.x, h.y, 11, '#ffe08a'), { emissive: 1 });
    const blink = h.inv > 0 && !dead && Math.floor(now * 12) % 2, veil = h.amulet && h.amulet.type === 'veil';
    r.actor(h.x, h.y, h.z - sink, (g, ox, oy) => rig.draw(g, ox, oy, view), { xray: { color: h.color, actors: true }, flash: h.hurtT > 0 ? '#ff4a3a' : blink ? '#ffffff' : null, flashMix: .5, alpha: veil ? .5 : dead ? .7 : undefined, key: h });
    rig.drawSmear && h.combo.state && rig.drawSmear(r);
    if (dead && h.deadT < 2) { if (Math.random() < .3) P.add({ kind: 'smoke', x: h.x, y: h.y, z: 6 + h.deadT * 16, vz: 10, max: .8, color: '#d8e0f0' }); }
    if (h.amulet && !dead) { const A2 = get('amulets', h.amulet.type); r.decal(() => r.groundArc(h.x, h.y, 9.5, 11, -Math.PI / 2, -Math.PI / 2 + TAU * h.amulet.t / AMULET_TIME, A2.color), { emissive: 1 }); if (h.amulet.type === 'stench' && Math.random() < .3) P.add({ kind: 'smoke', x: h.x + E.rand(-6, 6), y: h.y + E.rand(-6, 6), z: 4, vz: 8, max: .7, color: '#8ad04a' }); if (h.amulet.type === 'ironskin' && Math.random() < .2) P.glints(h.x, h.y, 14, 1, '#ffe08a', 8); }
    if (h.onMenu > 0 && !dead) r.sprite(h.x, h.y, 40 + Math.sin(now * 8) * 2, SPR.bell, { glow: .8 });
    if (h.queasy > 0 && !dead && Math.random() < .2) P.add({ kind: 'bit', x: h.x, y: h.y, z: 26, vz: 10, max: .5, color: '#9ae84a' });
    if (h.stun > 0 && !dead) for (let k = 0; k < 3; k++) { const a = now * 6 + k * 2.1; r.queue(h.x, h.y, 32, g => { const [sx, sy] = r.w(h.x + Math.cos(a) * 6, h.y + Math.sin(a) * 4, 34); px.dot(g, sx, sy, '#ffe060'); }, { bias: 2, emissive: true }); }
    if (game.settings.names && !dead && (W.heroes.length > 1 || h.name.length > 2)) r.queue(h.x, h.y, 40, g => { const [sx, sy] = r.w(h.x, h.y, 42); E.font.text(g, h.name, sx, sy, h.color, { align: 'center', shadow: '#000', outline: false }); }, { bias: 5 });
  }
}
function drawShots(r, now) {
  for (const b of W.shots.list) {
    if (b.dead) continue;
    const spr = SHOT_SPR[b.kind] || SHOT_SPR.hex, rot = b.kind === 'axe' ? now * 18 : Math.atan2(b.vy, b.vx);
    r.shadow(b.x, b.y, 2, .25);
    r.sprite(b.x, b.y, b.z, spr, { anchor: 'center', rot, glow: b.kind === 'hex' ? 1 : .3 });
    if (b.kind === 'hex') L.add(b.x, b.y, b.z, 18, .5, { color: '#d070ff' });
  }
  for (const b of W.eshots.list) {
    if (b.dead) continue;
    if (b.grav) {   // a lob: its shadow grows where it will land
      const left = b.life - b.t, k = clamp(1 - left / .9, .2, 1);
      r.decal(() => r.groundRing(b.lx, b.ly, 3 + k * 9, left < .6 ? '#ff4a3a' : '#7a3a2a'), { emissive: left < .6 ? 1 : 0 });
      r.shadow(b.x, b.y, 2.5, .3);
      r.sprite(b.x, b.y, b.z, b.kind === 'plate' ? SHOT_SPR.plate : SHOT_SPR.crock, { anchor: 'center', rot: now * 10 });
    } else { r.sprite(b.x, b.y, b.z, SHOT_SPR.fireball, { anchor: 'center', glow: 1 }); L.add(b.x, b.y, b.z, 24, .7, { color: '#ff7a2a' }); if (Math.random() < .4) P.add({ kind: 'ember', x: b.x, y: b.y, z: b.z, vz: 4, max: .3, color: '#ffb040' }); }
  }
}
/** the mouse: a reticle on the ground where it aims; a monster or generator under it is outlined and named */
function hoverTarget() {
  const h = W && W.heroes.find(q => !q.remote && q.aimAt); if (!h) return null;
  const [mx, my] = h.aimAt; let best = null, bd = 12 * 12;
  for (const m of W.monsters) { if (m.dead) continue; const d = (m.x - mx) ** 2 + (m.y - my) ** 2; if (d < bd) { bd = d; best = m; } }
  return best;
}
function drawReticle(r) {
  for (const h of W.heroes) {
    if (!h.aimAt || !h.alive || h.remote) continue;
    const [x, y] = h.aimAt;
    r.decal(() => { r.groundRing(x, y, 5, '#ffffff'); r.groundRing(x, y, 2, h.color); }, { emissive: 1 });
    const g = W.gens.find(g => !g.dead && Math.hypot(g.x - x, g.y - y) < 12);
    if (g) r.queue(g.x, g.y, 26, gg => { const [sx, sy] = r.w(g.x, g.y, 28); E.font.text(gg, g.D.name + ' ' + 'I'.repeat(g.rank), sx, sy, '#ffe08a', { align: 'center', shadow: '#000', outline: false }); }, { bias: 4 });
  }
}
function drawHitboxes(r) {
  r.decal(() => {
    for (const m of W.monsters) if (!m.dead) r.groundRing(m.x, m.y, m.r, '#ff4a4a');
    for (const h of W.heroes) r.groundRing(h.x, h.y, h.r, '#4aff4a');
    for (const g of W.gens) if (!g.dead) r.groundRing(g.x, g.y, g.r, '#ffff4a');
    if (W.boss) r.groundRing(W.boss.x, W.boss.y, W.boss.r, '#ff4aff');
  }, { emissive: 1 });
}
function drawFlow(r) {
  const F = W.flow, M = W.map;
  r.overlay(g => {
    for (let cy = 0; cy < M.h; cy++) for (let cx = 0; cx < M.w; cx++) {
      const d = F.d[cy * M.w + cx]; if (d >= 1e9) continue;
      const [sx, sy] = r.w(mid(cx), mid(cy), 0); const sxx = sx - r.ix, syy = sy - r.iy;
      if (sxx < 0 || syy < 0 || sxx > r.W || syy > r.H) continue;
      px.dot(g, sxx, syy, d < 4 ? '#ff4a4a' : d < 10 ? '#ffd04a' : '#4a8aff');
    }
  });
}

// ---- 51-hud.js ----
/* ---- THE HUD: canvas pixel art, anchored to r.W and r.H. 10-foot rules: nothing below the 5x7 font, three numbers a
   panel at most, no tables in play. Prompts name the player's own keys or buttons (input.label) ---- */
const INK = '#fff4dc', GOLD = '#ffd060', DIM = '#a89a88', RED = '#ff4a3a', PANEL = { bg: ['#2a1e16', '#120c0a'], border: '#8a6a3a' };
const tx = (g, s, x, y, c, o) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
const big = () => game.settings.hudSize === 'large';
/** [key] for an action on a player's device: '[R2]', '[Left click]', '[F]' */
const key = (I, a) => '[' + ((I || game.input).label(a) || a.toUpperCase()) + ']';
/** the words of a How to Play page or a prompt with the player's own keys in place of {move}, {aim}, {fire} ... */
function keysIn(text, I) {
  I = I || game.input; const pad = I.lastDevice === 'gamepad';
  const moveK = pad ? 'THE LEFT STICK' : I.half === 'right' ? 'THE ARROWS' : 'WASD';
  const aimK = pad ? 'THE RIGHT STICK' : I === game.input ? 'THE MOUSE' : 'YOUR FACING';
  const join = pad ? key(I, 'start') + ' ON A FREE CONTROLLER' : '[2] ON THE KEYBOARD OR [' + E.Input.prototype.codeLabel.call(I, 'Pad9') + '] ON A FREE CONTROLLER';
  return text.replace('{move}', moveK).replace('{aim}', aimK).replace(/\{(fire|magic|plant|start|pause|confirm|cancel|view)\}/g, (_, a) => key(I, a)).replace('{join}', join);
}
function drawHud(r) {
  if (!W) return;
  r.overlay(g => {
    const ca = game.cornerArea && game.cornerArea(), right = ca && ca.y0 < 40 ? Math.max(r.W / 2, Math.floor(ca.x0) - 2) : r.W;
    const slots = SESSION ? W.heroes.length : Math.min(4, Math.max(W.heroes.length + (canJoin() ? 1 : 0), W.heroes.length)), pw = Math.floor(right / Math.max(slots, 2)), ph = big() ? 40 : 32;
    for (let i = 0; i < slots; i++) {
      const h = W.heroes[i], x = i * pw + 2, y = 2;
      if (h) heroPanel(g, h, x, y, pw - 4, ph); else joinPanel(g, x, y, pw - 4, ph, i);
    }
    // centre: the floor's name; the treasure clock; a session's clock and scoreboard
    const y0 = ph + 6;
    if (W.treasure) { const t = Math.max(0, Math.ceil(W.treasure.t)); tx(g, String(t), r.W / 2, y0 + 2, t <= 5 && Math.floor(game.real * 4) % 2 ? RED : GOLD, { align: 'center', scale: 3 }); tx(g, 'HOARD', r.W / 2, y0 + 26, DIM, { align: 'center' }); }
    else if (floorBanner > 0) { const a = Math.min(1, floorBanner); if (a > .2) tx(g, W.F.name, r.W / 2, y0 + 2, GOLD, { align: 'center', scale: 2 }); }
    if (SESSION && SESS.info) sessionStrip(g, r, y0);
    if (W.boss && !W.boss.dead && W.boss.phase > 0) bossBar(g, r);
    if (cheating() && !RUN_DEMO()) { E.ui.box(g, 4, r.H - 18, 30, 14, { bg: ['#6a1a1a', '#3a0a0a'], border: '#ff6a4a' }); tx(g, 'DEV', 9, r.H - 15, '#ffd0c0'); }
    edgeArrows(g, r);
    captions(g, r);
    prompts(g, r);
  });
}
const canJoin = () => !SESSION && !RUN_DEMO() && game._join && W && W.heroes.length < 4;
function heroPanel(g, h, x, y, w, ph) {
  const I = h.input || game.input, low = h.hp < 400, crit = h.hp < 200, flash = h.hurtT > 0;
  E.ui.box(g, x, y, w, ph, { bg: flash ? ['#5a1a12', '#2a0a08'] : PANEL.bg, border: h.color, alpha: .86 });
  const ps = ph - 8, rig = heroRig(h);
  px.rect(g, x + 4, y + 4, ps, ps, h.alive ? E.shade(h.color, -.45) : '#2a2a2a');
  try { rig.drawPortrait(g, x + 4, y + 4, ps, { zoom: 2.4, turn: .3, cape: false, weapon: false, tint: h.alive ? undefined : '#707070' }); } catch (e) { /* a portrait needs a posed rig */ }
  const tx0 = x + ps + 8, cls = h.D.name, scoreW = E.font.width(String(h.score)) + 6, nameW = w - ps - 12 - scoreW;
  let nm = h.name && h.name !== 'P' + (h.seat + 1) ? h.name : cls; while (nm.length > 2 && E.font.width(nm) > nameW) nm = nm.slice(0, -1);
  tx(g, nm, tx0, y + 3, h.color);
  if (!h.alive) {
    const r2 = SESSION ? 'RISING...' : 'RISE: ' + key(I, 'fire');
    tx(g, r2, tx0, y + 14, Math.floor(game.real * 3) % 2 ? GOLD : INK);
    tx(g, String(h.score), tx0, y + ph - 11, DIM);
    return;
  }
  const hc = crit ? (Math.floor(game.real * 5) % 2 ? RED : '#ffb0a0') : low ? '#ffe060' : INK;
  tx(g, fmt(h.hp), tx0, y + 12, hc, { scale: 2 });
  const hpW = E.font.width(fmt(h.hp), { scale: 2 });
  tx(g, String(h.score), x + w - 4, y + 3, DIM, { align: 'right' });
  // keys and flasks; the amulet; special potions
  let ix = tx0 + hpW + 6;
  if (ix + 40 > x + w) ix = tx0;
  const iy = big() ? y + ph - 11 : y + 13;
  if (big() || ix !== tx0) {
    px.sprite(g, SPR.key, ix, iy + 1); tx(g, String(h.keys), ix + 10, iy, INK);
    px.sprite(g, SPR.flask, ix + 20, iy - 1); tx(g, String(h.flasks), ix + 28, iy, INK);
  }
  if (h.amulet) { const A2 = get('amulets', h.amulet.type), ax = x + w - 12, ay = y + ph - 14; px.sprite(g, SPR['am_' + h.amulet.type], ax, ay); const f = h.amulet.t / AMULET_TIME; px.rect(g, ax - 2, ay + 8, Math.round(10 * f), 2, A2.color); }
  let sx = tx0; for (const s of Object.keys(h.specials)) { if (!big()) break; px.rect(g, sx, y + ph - 3, 4, 2, get('specials', s).color); sx += 5; }
  if (h.onMenu > 0) px.sprite(g, SPR.bell, x + w - 12, y + 12);
}
function joinPanel(g, x, y, w, ph, i) {
  if (!canJoin() || i !== W.heroes.length) return;
  const on = Math.floor(game.real * 2) % 2;
  E.ui.box(g, x, y, w, ph, { bg: ['#1a1410', '#0a0806'], border: on ? '#6a5a3a' : '#3a2e20', alpha: .6 });
  tx(g, 'P' + (i + 1), x + 6, y + 4, SEAT_COLORS[i]);
  tx(g, on ? 'TO JOIN:' : '', x + 6, y + 14, DIM);
  tx(g, '[' + E.Input.prototype.codeLabel.call(game.input, 'Pad9') + '] / [2]', x + 6, y + ph - 11, on ? GOLD : DIM);
}
function bossBar(g, r) {
  const K = W.boss, w = Math.min(220, r.W - 80), x = (r.W - w) / 2, y = r.H - 9;
  tx(g, 'KING FAMISH', r.W / 2, y - 10, '#e8c0ff', { align: 'center' });
  px.rect(g, x - 1, y - 1, w + 2, 7, '#000'); px.rect(g, x, y, w, 5, '#3a1a3a'); px.rect(g, x, y, Math.round(w * K.hp / K.max), 5, K.phase === 3 ? '#ff4a6a' : '#c84aff');
  for (const f of [.7, .35]) px.rect(g, x + Math.round(w * f), y - 1, 1, 7, '#ffd060');
}
/** arrows at the screen's edge: to the stairs once seen (or once walls are stairs), to friends off screen in a session */
function edgeArrows(g, r) {
  const marks = [];
  if (W.stairs.length && (W.firsts.stairsSeen || W.impatience >= 1)) { const s = W.stairs.find(s => !s.to) || W.stairs[0]; marks.push([mid(s.cx), mid(s.cy), GOLD]); }
  if (SESSION) for (const h of W.heroes) if (h.remote && h.alive) marks.push([h.x, h.y, h.color]);
  for (const [x, y, c] of marks) {
    const [bx, by] = r.w(x, y, 0), sx = bx - r.ix, sy = by - r.iy;
    if (sx > 8 && sy > 48 && sx < r.W - 8 && sy < r.H - 8) continue;
    const cx = r.W / 2, cy = r.H / 2, a = Math.atan2(sy - cy, sx - cx), ex = clamp(cx + Math.cos(a) * r.W, 12, r.W - 12), ey = clamp(cy + Math.sin(a) * r.H, 52, r.H - 30);
    const tip = [ex + Math.cos(a) * 6, ey + Math.sin(a) * 6], l = [ex + Math.cos(a + 2.4) * 6, ey + Math.sin(a + 2.4) * 6], rr = [ex + Math.cos(a - 2.4) * 6, ey + Math.sin(a - 2.4) * 6];
    px.poly(g, [tip, l, rr], '#000'); px.poly(g, [[tip[0] - Math.cos(a), tip[1] - Math.sin(a)], [l[0] + .5, l[1]], [rr[0] + .5, rr[1]]], c);
  }
}
/** the Gaunt's captions: bottom centre, outlined, two lines at most */
function captions(g, r) {
  const c = NARR.caption; if (!c || !game.settings.captions) return;
  const sc = r.W >= 400 ? 2 : 1, maxW = r.W - 24, lines = E.font.wrap(c.text, maxW, { scale: sc }).slice(0, 2), lh = 9 * sc + 2;
  const y = r.H - 14 - lines.length * lh - (W.boss && !W.boss.dead && W.boss.phase > 0 ? 12 : 0), a = Math.min(1, c.t * 4, (c.end - game.real) * 3);
  if (a <= 0) return;
  lines.forEach((l, i) => tx(g, l, r.W / 2, y + i * lh, c.color || '#ffe8b0', { align: 'center', scale: sc, outline: '#1a0a04', shadow: false }));
}
/** prompts: how to play on the first floor, a door with no key, the stairs being held */
function prompts(g, r) {
  const h = W.heroes.find(q => !q.remote && !q.bot) || null; if (!h || RUN_DEMO()) return;
  const I = h.input || game.input, y = r.H - 12;
  let p = null;
  if (W.F.no === 1 && W.t < 9 && W.descent === 1) p = 'MOVE ' + (I.lastDevice === 'gamepad' ? '[L stick]' : '[WASD]') + '   AIM ' + (I.lastDevice === 'gamepad' ? '[R stick]' : '[Mouse]') + '   FIRE ' + key(I, 'fire') + '   MAGIC ' + key(I, 'magic');
  else if (h.alive && h.stair > 0) p = 'GOING DOWN...';
  else if (h.alive && h.keys === 0 && W.doors.some(d => !d.open && d.cells.some(([cx, cy]) => Math.hypot(mid(cx) - h.x, mid(cy) - h.y) < 22))) p = 'THE DOOR NEEDS A KEY';
  else if (W.impatience >= 3 && h.alive) p = 'PUSH INTO ANY WALL TO GO DOWN';
  if (!p || NARR.caption) return;
  tx(g, p, r.W / 2, y - 8, '#e8dcc8', { align: 'center' });
}
let floorBanner = 0;

// ---- 52-narrator.js ----
/* ---- THE GAUNT: the dungeon's own voice. Short, booming, third person, darkly funny. A queue with three priorities
   (3 critical: dying, starving, deaths, the Tithe; 2 events; 1 tips); one line every 1.2 s at most; a higher priority cuts
   a tip; health lines once per hero per 20 s; teaching tips once per game, and kept for the next game ---- */
const NARR = { queue: [], caption: null, last: -9, cool: {}, heard: null, lastKey: null, count: 0 };
const TIP_KEYS = /^tip_|_first$/;
function narratorHeard() {
  if (!NARR.heard) NARR.heard = new Set(E.store.get('gd:tips', []));
  return NARR.heard;
}
bus.on('say', ({ key, hero, prio, vars }) => {
  prio = prio || (TIP_KEYS.test(key) ? 1 : 2);
  if (prio === 1) { if (!game.settings.tips || narratorHeard().has(key)) return; }
  const cid = key + (/fading|starving|dying/.test(key) && hero ? hero.id : '');
  if (NARR.cool[cid] && game.real < NARR.cool[cid]) return;
  NARR.cool[cid] = game.real + (/fading|starving|dying/.test(key) ? 20 : prio === 1 ? 999 : 4);
  const cls = hero ? (SESSION && hero.name ? hero.name : hero.D.name) : null;
  const text = line(key, cls, vars);
  if (NARR.queue.some(q => q.text === text)) return;
  NARR.queue.push({ key, text, prio, at: game.real, color: hero ? hero.color : null });
  NARR.queue.sort((a, b) => b.prio - a.prio || a.at - b.at);
  if (NARR.queue.length > 4) NARR.queue.length = 4;
  if (NARR.caption && NARR.caption.prio === 1 && prio > 1) NARR.caption.end = Math.min(NARR.caption.end, game.real + .2);
});
/** each step (real time, so a paused game holds the caption) */
function stepNarrator(dt) {
  const c = NARR.caption;
  if (c) { c.t += dt; if (game.real >= c.end) NARR.caption = null; }
  if (NARR.caption || game.real - NARR.last < 1.2 || !NARR.queue.length) return;
  const q = NARR.queue.shift();
  if (game.real - q.at > 6 && q.prio < 3) return;   // stale
  const len = q.text.length;
  NARR.caption = { text: q.text, prio: q.prio, t: 0, end: game.real + Math.max(2.4, len * .065), color: q.prio === 3 ? '#ffb0a0' : null };
  NARR.last = game.real; NARR.lastKey = q.key; NARR.count++;
  if (q.prio === 1) { const H = narratorHeard(); H.add(q.key); E.store.set('gd:tips', [...H]); }
  speak(q.text, 'gaunt');
}
function clearNarrator() { NARR.queue.length = 0; NARR.caption = null; }

// ---- 53-audio.js ----
/* ---- AUDIO: everything is synthesized in code. Nine original songs in the engine's step notation, sound effects,
   and the Babble synth: gibberish voices for the narrator, the heroes, the monsters and the King ---- */
const HORDE = '| k . h . s . h k k . h . s . h . | k . h . s . h k k . h . s s s s |';
const HEART = '| k . . k . . . . . . . . . . . . |';
E.songs.throwdown = { bpm: 100, steps: 4, tracks: [   // title: a D minor march
  { wave: 'square', vol: .1, notes: '| D5 - - - A4 - - - F4 - G4 - A4 - - - | Bb4 - - - A4 - G4 - F4 - E4 - D4 - - - | D5 - - - A4 - - - F4 - G4 - A4 - D5 - | C5 - Bb4 - A4 - G4 - A4 - - - - - . . |' },
  { wave: 'pulse', vol: .05, notes: '| F4 - - - F4 - - - D4 - E4 - F4 - - - | F4 - - - F4 - E4 - D4 - C#4 - A3 - - - | F4 - - - F4 - - - D4 - E4 - F4 - A4 - | A4 - G4 - F4 - E4 - E4 - - - - - . . |' },
  { wave: 'triangle', vol: .2, notes: '| D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | Bb1 . Bb2 . Bb1 . Bb2 . A1 . A2 . A1 . A2 . | D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | C2 . C3 . G1 . G2 . A1 . A2 . A1 . A2 . |' },
  { wave: 'drums', vol: .22, notes: '| k . s . k . s . k . s . k s s s |' } ] };
E.songs.larder = { bpm: 120, steps: 4, sync: true, tracks: [   // floors 1-3: bouncy minor, a plucked pulse, kitchen clatter
  { wave: 'pulse', vol: .08, notes: '| A4 . C5 . E5 . C5 . D5 . B4 . G4 . B4 . | A4 . C5 . E5 . A5 . G5 . E5 . D5 . . . | F4 . A4 . C5 . A4 . E4 . G#4 . B4 . E5 . | A4 . E4 . C5 . B4 . A4 - - - . . . . |' },
  { wave: 'triangle', vol: .2, notes: '| A2 . . A2 E2 . . . G2 . . G2 D2 . . . | A2 . . A2 E2 . . . G2 . . G2 G1 . . . | F2 . . F2 C2 . . . E2 . . E2 B1 . . . | A2 . . E2 A1 . . . A2 . E2 . A1 . . . |' },
  { wave: 'drums', vol: .16, notes: '| k . h c s . h . k k h c s . h h |' },
  { name: 'horde', on: false, wave: 'drums', vol: .2, notes: HORDE }, { name: 'heart', on: false, wave: 'drums', vol: .3, notes: HEART } ] };
E.songs.ossuary = { bpm: 96, steps: 3, sync: true, tracks: [   // floors 4-6: organ-like arpeggios in triplets over a drone
  { wave: 'pulse12', vol: .07, notes: '| E4 G4 B4 E5 B4 G4 E4 G4 B4 E5 B4 G4 | C4 E4 G4 C5 G4 E4 C4 E4 G4 C5 G4 E4 | A3 C4 E4 A4 E4 C4 A3 C4 E4 A4 E4 C4 | B3 D#4 F#4 B4 F#4 D#4 B3 D#4 F#4 B4 A4 F#4 |' },
  { wave: 'square', vol: .05, notes: '| E5 - - - - - - - - D5 - - | C5 - - - - - B4 - - G4 - - | A4 - - - - - C5 - - E5 - - | D#5 - - - - - - - - F#4 - - |' },
  { wave: 'triangle', vol: .22, notes: '| E2 - - - - - - - - - - - | C2 - - - - - - - - - - - | A1 - - - - - - - - - - - | B1 - - - - - - - - - - - |' },
  { wave: 'drums', vol: .12, notes: '| k . . h . . s . . h . . |' },
  { name: 'horde', on: false, wave: 'drums', vol: .2, notes: '| k . h k . h s . h k k h |' }, { name: 'heart', on: false, wave: 'drums', vol: .3, notes: '| k . k . . . . . . . . . |' } ] };
E.songs.furnace = { bpm: 136, steps: 4, sync: true, tracks: [   // floors 7-8: a driving saw bass, anvil hits
  { wave: 'saw', vol: .08, notes: '| C2 C2 C3 C2 Eb2 C2 C3 C2 G1 G1 G2 G1 Bb1 G1 G2 G1 | Ab1 Ab1 Ab2 Ab1 C2 Ab1 Ab2 Ab1 G1 G1 G2 G1 B1 G1 G2 B1 |' },
  { wave: 'square', vol: .07, notes: '| C5 - - . Eb5 - - . G5 - F5 - Eb5 - D5 - | Eb5 - - . C5 - - . D5 - - - B4 - - - | C5 - - . Eb5 - - . G5 - Ab5 - G5 - F5 - | Eb5 - D5 - C5 - B4 - C5 - - - - - . . |' },
  { wave: 'drums', vol: .2, notes: '| k . t . s . t k k . t . s t s . |' },
  { wave: 'noise', vol: .05, freq: 'C7', notes: '| . . . . C7 . . . . . . . C7 . . . |' },
  { name: 'horde', on: false, wave: 'drums', vol: .22, notes: HORDE }, { name: 'heart', on: false, wave: 'drums', vol: .3, notes: HEART } ] };
E.songs.hoard = { bpm: 160, steps: 4, sync: true, tracks: [   // treasure rooms: a frantic jig over a ticking hi-hat
  { wave: 'pulse', vol: .08, notes: '| G4 B4 D5 B4 G4 B4 D5 G5 F5 D5 C5 A4 F4 A4 C5 F5 | G4 B4 D5 B4 G4 B4 D5 G5 A5 G5 F5 D5 C5 A4 G4 . |' },
  { wave: 'triangle', vol: .2, notes: '| G2 . D3 . G2 . D3 . F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . F2 . C3 . G2 . . . |' },
  { wave: 'drums', vol: .16, notes: '| k h h h s h h h k h k h s h h h |' } ] };
E.songs.king = { bpm: 140, steps: 4, sync: true, tracks: [   // the boss: a layer added each phase
  { wave: 'triangle', vol: .22, notes: '| B1 . B2 . B1 . B2 . G1 . G2 . A1 . A2 . | B1 . B2 . B1 . B2 . F#1 . F#2 . F#1 . A#1 . |' },
  { wave: 'drums', vol: .2, notes: '| k . s . k k s . k . s . k k s s |' },
  { name: 'p2', on: false, wave: 'square', vol: .08, notes: '| B4 - - D5 - - F#5 - E5 - D5 - C#5 - - - | B4 - - D5 - - F#5 - G5 - F#5 - E5 - D5 - | C#5 - - E5 - - G5 - F#5 - E5 - D5 - C#5 - | B4 - - - A#4 - - - B4 - - - . . . . |' },
  { name: 'p3', on: false, wave: 'pulse12', vol: .06, notes: '| B5 F#5 D5 B4 B5 F#5 D5 B4 G5 D5 B4 G4 A5 E5 C#5 A4 |' },
  { name: 'heart', on: false, wave: 'drums', vol: .3, notes: HEART } ] };
E.songs.gauntletdown = { bpm: 112, steps: 4, tracks: [   // the ending and credits: a fanfare, then a calm theme
  { wave: 'square', vol: .1, notes: '| C5 - - G4 C5 - E5 - G5 - - - - - E5 - | F5 - - E5 D5 - C5 - D5 - - - G4 - - - | C5 - - G4 C5 - E5 - G5 - - - A5 - G5 - | F5 - E5 - D5 - B4 - C5 - - - - - . . |' },
  { wave: 'pulse', vol: .05, notes: '| E4 - - - E4 - G4 - C5 - - - - - C5 - | A4 - - - F4 - E4 - G4 - - - D4 - - - | E4 - - - E4 - G4 - C5 - - - C5 - C5 - | A4 - G4 - F4 - G4 - E4 - - - - - . . |' },
  { wave: 'triangle', vol: .2, notes: '| C2 . G2 . C3 . G2 . | F2 . C3 . G2 . D3 . | C2 . G2 . C3 . G2 . | F2 . G2 . C2 . . . |' },
  { wave: 'drums', vol: .14, notes: '| k . h . s . h . k . h . s . h h |' } ] };
E.songs.fed = { bpm: 70, steps: 4, loop: false, tracks: [   // game over: a slow descending dirge, once
  { wave: 'square', vol: .1, notes: 'A4 - - - G4 - - - F4 - - - E4 - - - D4 - - - C#4 - - - D4 - - - - - - - - - - -' },
  { wave: 'triangle', vol: .2, notes: 'D3 - - - - - - - Bb2 - - - - - - - A2 - - - - - - - D2 - - - - - - - - - - -' } ] };
E.songs.namethyself = { bpm: 128, steps: 4, tracks: [   // initials and high scores: a short jaunty loop
  { wave: 'pulse', vol: .08, notes: '| E5 . C5 . G4 . C5 . E5 . G5 . E5 . C5 . | F5 . D5 . A4 . D5 . G5 . F5 . E5 . D5 . |' },
  { wave: 'triangle', vol: .18, notes: '| C3 . G2 . C3 . G2 . | D3 . A2 . G2 . B2 . |' },
  { wave: 'drums', vol: .12, notes: '| k . h . s . h . |' } ] };
const REALM_SONG = { larder: 'larder', ossuary: 'ossuary', furnace: 'furnace', banquet: 'king' };

/* ---- sound effects ---- */
const SFX_DEFS = {
  axe: { wave: 'noise', freq: 900, to: 300, dur: .14, vol: .14, filter: 'bandpass', q: 2 },
  javelin: { wave: 'noise', freq: 2400, to: 1200, dur: .1, vol: .1, filter: 'bandpass', q: 3 },
  arrow: [{ wave: 'triangle', freq: 'A5', to: 'A4', dur: .06, vol: .12 }, { wave: 'noise', freq: 3000, dur: .05, vol: .06 }],
  hex: { wave: 'square', freq: 'E5', to: 'E6', dur: .1, vol: .08, arp: [0, 7, 12], step: .03 },
  swing: { wave: 'noise', freq: 600, to: 1800, dur: .12, vol: .12, filter: 'bandpass', q: 1.5 },
  thunk: [{ wave: 'square', freq: 'C3', to: 'C2', dur: .08, vol: .16 }, { wave: 'noise', freq: 500, dur: .06, vol: .1 }],
  ghostdie: { wave: 'sine', freq: 'C6', to: 'C4', dur: .3, vol: .1, vib: [12, .05] },
  grunt: { wave: 'square', freq: 'G2', to: 'C2', dur: .14, vol: .12 },
  pop: { wave: 'noise', freq: 1600, to: 200, dur: .2, vol: .14, filter: 'lowpass' },
  smoke: { wave: 'noise', freq: 800, to: 100, dur: .3, vol: .08, filter: 'lowpass' },
  bones: [{ wave: 'noise', freq: 2500, dur: .05, vol: .1 }, { wave: 'noise', freq: 1800, dur: .05, vol: .1, delay: .06 }, { wave: 'noise', freq: 1200, dur: .06, vol: .1, delay: .12 }],
  genhit: { wave: 'square', freq: 'D3', to: 'A2', dur: .07, vol: .1 },
  crumble: [{ wave: 'noise', freq: 400, to: 60, dur: .6, vol: .22, filter: 'lowpass' }, { wave: 'triangle', freq: 'D2', to: 'D1', dur: .5, vol: .15 }],
  spawn: { wave: 'triangle', freq: 'C3', to: 'G3', dur: .18, vol: .06 },
  chomp: [{ wave: 'noise', freq: 1200, dur: .05, vol: .14, filter: 'bandpass' }, { wave: 'noise', freq: 900, dur: .05, vol: .12, delay: .09 }, { wave: 'square', freq: 'C5', to: 'G5', dur: .12, vol: .06, delay: .14 }],
  splat: [{ wave: 'noise', freq: 700, to: 150, dur: .25, vol: .18, filter: 'lowpass' }, { wave: 'square', freq: 'E3', to: 'A2', dur: .2, vol: .08 }],
  gurgle: { wave: 'sine', freq: 'C3', to: 'G2', dur: .5, vol: .14, vib: [18, .15] },
  flask: { wave: 'triangle', freq: 'G5', to: 'C6', dur: .15, vol: .1, arp: [0, 4, 7], step: .04 },
  blast: [{ wave: 'noise', freq: 300, to: 40, dur: .9, vol: .3, filter: 'lowpass' }, { wave: 'saw', freq: 'C3', dur: .7, vol: .08, hold: true }, { wave: 'saw', freq: 'E3', dur: .7, vol: .07, hold: true }, { wave: 'saw', freq: 'G3', dur: .7, vol: .07, hold: true }, { wave: 'sine', freq: 'C5', dur: 1, vol: .06 }],
  jingle: { wave: 'triangle', freq: 'E6', dur: .18, vol: .1, arp: [0, 5, 12, 5, 12], step: .03 },
  door: [{ wave: 'noise', freq: 1500, dur: .35, vol: .12, filter: 'highpass' }, { wave: 'square', freq: 'A2', to: 'E3', dur: .35, vol: .08 }],
  chest: [{ wave: 'square', freq: 'C3', to: 'G3', dur: .15, vol: .1 }, { wave: 'triangle', freq: 'C6', dur: .3, vol: .08, arp: [0, 4, 7, 12], step: .05, delay: .1 }],
  coins: { wave: 'square', freq: 'B5', dur: .14, vol: .07, arp: [0, 5], step: .04 },
  gem: { wave: 'sine', freq: 'E6', dur: .2, vol: .1, arp: [0, 7, 12, 19], step: .04 },
  crown: { wave: 'square', freq: 'C5', dur: .45, vol: .1, arp: [0, 4, 7, 12, 16, 19, 24], step: .05 },
  amulet: { wave: 'sine', freq: 'A5', dur: .5, vol: .1, arp: [0, 3, 7, 10, 12], step: .07, vib: [6, .02] },
  special: { wave: 'square', freq: 'C5', dur: .6, vol: .08, arp: [0, 4, 7, 12, 7, 12, 16, 19, 24], step: .05 },
  stairs: { wave: 'triangle', freq: 'C6', dur: .7, vol: .12, arp: [0, -2, -5, -7, -9, -12, -14, -17], step: .07 },
  trap: [{ wave: 'noise', freq: 200, to: 40, dur: 1.1, vol: .25, filter: 'lowpass' }, { wave: 'triangle', freq: 'E1', dur: 1, vol: .2 }],
  warp: { wave: 'sine', freq: 'C4', to: 'C6', dur: .35, vol: .1, vib: [20, .1] },
  stun: { wave: 'square', freq: 'A5', to: 'A3', dur: .3, vol: .08, vib: [30, .2] },
  zap: [{ wave: 'saw', freq: 'A2', dur: .2, vol: .12, vib: [40, .3] }, { wave: 'noise', freq: 3000, dur: .1, vol: .1 }],
  hum: { wave: 'saw', freq: 'A1', dur: .3, vol: .03 },
  shing: { wave: 'noise', freq: 5000, to: 2500, dur: .15, vol: .1, filter: 'highpass' },
  drone: { wave: 'saw', freq: 'D2', dur: .5, vol: .06, vib: [3, .03] },
  drain: { wave: 'sine', freq: 'A4', to: 'A3', dur: .2, vol: .05 },
  bell: [{ wave: 'sine', freq: 'G4', dur: 1.6, vol: .2 }, { wave: 'sine', freq: 'D6', dur: 1, vol: .06 }, { wave: 'triangle', freq: 'G3', dur: 1.4, vol: .1 }],
  whistle: { wave: 'sine', freq: 'C6', to: 'C5', dur: .5, vol: .05 },
  shatter: [{ wave: 'noise', freq: 4000, to: 1500, dur: .2, vol: .15, filter: 'highpass' }, { wave: 'noise', freq: 2000, dur: .1, vol: .1, delay: .05 }],
  fireball: { wave: 'noise', freq: 600, to: 1800, dur: .3, vol: .12, filter: 'bandpass', q: .8 },
  blink: { wave: 'sine', freq: 'E5', to: 'E4', dur: .2, vol: .06 },
  giggle: { wave: 'square', freq: 'C6', dur: .3, vol: .05, arp: [0, 3, 0, 5, 0, 3], step: .04 },
  stomp: [{ wave: 'noise', freq: 150, to: 40, dur: .5, vol: .3, filter: 'lowpass' }, { wave: 'triangle', freq: 'C1', dur: .4, vol: .25 }],
  plate: { wave: 'triangle', freq: 'E6', to: 'E5', dur: .2, vol: .06 },
  chew: { wave: 'noise', freq: 400, dur: .12, vol: .1, filter: 'lowpass' },
  roar: [{ wave: 'saw', freq: 'A1', to: 'E1', dur: .9, vol: .16, vib: [9, .08] }, { wave: 'noise', freq: 300, to: 100, dur: .9, vol: .14, filter: 'lowpass' }],
  collapse: [{ wave: 'noise', freq: 300, to: 30, dur: 2, vol: .3, filter: 'lowpass' }, { wave: 'triangle', freq: 'G1', to: 'C1', dur: 2, vol: .2 }],
  move: { wave: 'square', freq: 'A5', dur: .03, vol: .05 }, select: { wave: 'square', freq: 'C6', dur: .08, vol: .07, arp: [0, 7], step: .03 },
  back: { wave: 'square', freq: 'A4', to: 'E4', dur: .08, vol: .06 }, join: { wave: 'square', freq: 'C5', dur: .3, vol: .08, arp: [0, 4, 7, 12], step: .05 },
  leave: { wave: 'square', freq: 'C5', dur: .3, vol: .07, arp: [12, 7, 4, 0], step: .05 }, rise: { wave: 'triangle', freq: 'C4', dur: .8, vol: .1, arp: [0, 4, 7, 12, 16, 19], step: .1 },
  heartbeat: [{ wave: 'sine', freq: 'C2', dur: .1, vol: .25 }, { wave: 'sine', freq: 'C2', dur: .1, vol: .2, delay: .18 }]
};
for (const k in SFX_DEFS) A.define(k, SFX_DEFS[k]);
const sfx = (name, o) => { if (RUN_DEMO()) o = Object.assign({ vol: .6 }, o); A.sfx(name, o); };
/** music for a scene; the demo plays it a little quieter */
function music(id, o = {}) { A.music(id ? E.songs[id] : null, Object.assign({ fade: .6 }, o)); }

/* ---- BABBLE: Animalese / Simlish-style speech. Each syllable a short note through two formant filters chosen by its
   vowel, a breath of noise for s, t, k, p; the same word always sounds the same; questions rise ---- */
const VOICE = {
  gaunt: { base: 78, rate: 5, form: .8, wave: 'sawtooth', echo: true, vol: .22, duck: true },
  berserker: { base: 110, rate: 7, form: .95, wave: 'square', noise: .25, vol: .1 },
  shieldmaiden: { base: 190, rate: 7, form: 1.05, wave: 'sawtooth', vol: .1 },
  ranger: { base: 230, rate: 9, form: 1.1, wave: 'triangle', vol: .14 },
  hexer: { base: 260, rate: 8, form: 1.15, wave: 'sawtooth', vib: 7, vol: .1 },
  king: { base: 58, rate: 4, form: .7, wave: 'sawtooth', wet: true, echo: true, vol: .24, duck: true },
  fryar: { base: 170, rate: 8, form: 1.2, wave: 'square', nasal: true, vol: .06 },
  snatcher: { base: 420, rate: 11, form: 1.3, wave: 'square', vol: .05 },
  gnasher: { base: 120, rate: 10, form: .9, wave: 'square', max: 2, vol: .06 }
};
const FORMANT = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 800], y: [300, 2300] };
const speaking = [];
function speak(text, id, o = {}) {
  const V = VOICE[id]; if (!V || !A._init || !A._init()) return;
  const ctx = A.ctx, bus = A.bus && A.bus('voice'); if (!ctx || !bus || ctx.state !== 'running' || A.muted) return;
  while (speaking.length >= 3) { const old = speaking.shift(); try { old.g.gain.setTargetAtTime(0, ctx.currentTime, .02); } catch (e) { /* gone */ } }
  const words = String(text).toLowerCase().replace(/[^a-z!?.,' ]/g, ' ').split(/\s+/).filter(Boolean), syl = [];
  for (const w of words) { const parts = w.match(/[^aeiouy]*[aeiouy]+[^aeiouy]*?(?=[^aeiouy]*[aeiouy]|$)|[^aeiouy]+$/g) || [w]; for (const p of parts) syl.push({ p, end: false }); syl.push({ gap: true, punct: /[!?.,]$/.test(w) ? w.slice(-1) : '' }); }
  const max = V.max ? V.max : o.max || 22, list = []; let n = 0; for (const s of syl) { if (!s.gap) n++; if (n > max) break; list.push(s); }
  const out = ctx.createGain(); out.gain.value = (V.vol || .12) * (o.vol || 1); out.connect(bus);
  if (V.echo) { const d = ctx.createDelay(1), fb = ctx.createGain(); d.delayTime.value = .18; fb.gain.value = .35; out.connect(d); d.connect(fb); fb.connect(d); d.connect(bus); }
  let t = ctx.currentTime + .03; const step = 1 / V.rate, q = /\?/.test(text);
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.gap) { t += s.punct ? step * 1.2 : step * .35; continue; }
    const vow = (s.p.match(/[aeiouy]/) || ['a'])[0], F = FORMANT[vow], h = E.hash2(s.p.length * 7 + s.p.charCodeAt(0), s.p.charCodeAt(s.p.length - 1) || 1);
    const last = i >= list.length - 2, semis = Math.round((h - .5) * 8) + (q && last ? 5 : last ? -3 : 0), f0 = V.base * Math.pow(2, semis / 12) * (V.wet ? 1 + Math.sin(i) * .04 : 1);
    const dur = step * (.65 + h * .5), osc = ctx.createOscillator(); osc.type = V.wave; osc.frequency.setValueAtTime(f0, t); osc.frequency.linearRampToValueAtTime(f0 * (last ? (q ? 1.15 : .9) : 1.02), t + dur);
    if (V.vib) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = V.vib; lg.gain.value = f0 * .04; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + .05); }
    const env = ctx.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + .008); env.gain.setValueAtTime(1, t + Math.max(.01, dur - .03)); env.gain.linearRampToValueAtTime(0, t + dur);
    for (const [k, fq] of F.entries()) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq * V.form * (V.nasal && k ? 1.3 : 1); bp.Q.value = V.nasal ? 9 : 5 + k * 2; osc.connect(bp); bp.connect(env); }
    if (V.wet) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600 + h * 400; osc.connect(lp); lp.connect(env); }
    if ((/^(s|sh|t|k|p|ch|z)/.test(s.p) || V.noise) && A._noise) { const nz = ctx.createBufferSource(), ng = ctx.createGain(), hp = ctx.createBiquadFilter(); nz.buffer = A._noise; hp.type = 'highpass'; hp.frequency.value = 2500; ng.gain.setValueAtTime(V.noise ? .25 : .6, t); ng.gain.exponentialRampToValueAtTime(.001, t + .05); nz.connect(hp); hp.connect(ng); ng.connect(env); nz.start(t, Math.random() * .5); nz.stop(t + .08); }
    env.connect(out); osc.start(t); osc.stop(t + dur + .02);
    t += dur + .012;
  }
  const end = t, entry = { g: out, end };
  speaking.push(entry);
  if (V.duck) { A.duck(true); clearTimeout(speak._duck); speak._duck = setTimeout(() => A.duck(false), (end - ctx.currentTime) * 1000 + 200); }
  setTimeout(() => { const i = speaking.indexOf(entry); if (i >= 0) speaking.splice(i, 1); }, (end - ctx.currentTime) * 1000 + 400);
}
const BARKS = { hurt: ['OOF', 'ARGH', 'OW', 'HNG'], low: ['FOOD NOW', 'SO HUNGRY', 'MEAT PLEASE'], pick: ['MINE', 'HAH', 'OOH', 'NICE'], magic: ['BEGONE', 'KABOOM', 'HAH HA'], join: ['ONWARD', 'LETS EAT', 'FOR SUPPER'] };
let barkT = 0;
function bark(h, kind) { if (!h || game.real < barkT || RUN_DEMO() && Math.random() < .6) return; barkT = game.real + .7; speak(E.pick(BARKS[kind]), h.D.voice, { max: 3 }); }

// ---- 54-fx.js ----
/* ---- JUICE: what the sim says becomes particles, hit-stop, shake, flashes, sounds and barks (cosmetic: Math.random) ---- */
const local = h => h && !h.remote && W && W.role !== 'server';
const onScreen = q => !HEADLESS && q && W;
bus.on('throw', ({ h, kind }) => { if (local(h) || Math.random() < .4) sfx(kind === 'axe' ? 'axe' : kind === 'javelin' ? 'javelin' : kind === 'arrow' ? 'arrow' : 'hex', { vol: local(h) ? .9 : .4 }); });
bus.on('swing', () => sfx('swing'));
bus.on('meleeHit', ({ h, q, dmg }) => { game.hitFx(q.x, q.y, 14, { power: .7, angle: h.aim, damage: q.isGen || q.isBoss ? Math.round(dmg) : undefined, sound: 'thunk', textZ: 24 }); game.freeze(.035); });
bus.on('hit', ({ m, kind }) => { if (kind === 'shot') P.sparks(m.x, m.y, 12, 3, null, { color: '#ffe8b0' }); });
bus.on('shrink', ({ m }) => { P.smoke(m.x, m.y, 10, 3, { size: 1.6, color: '#d8d0e8' }); });
bus.on('clink', ({ m }) => { P.sparks(m.x, m.y, 16, 4, null, { color: '#d0d8ff' }); sfx('genhit', { pitch: 2 }); });
bus.on('kill', ({ m }) => {
  if (!m || !onScreen(m)) { return; }
  switch (m.ai) {
    case 'ghost': P.smoke(m.x, m.y, 12, 6, { size: 2, color: '#e0e8ff' }); sfx('ghostdie', { vol: .5 }); break;
    case 'melee': P.bits(m.x, m.y, 10, 6, ['#7a9070', '#5a3a1e', '#e8e0c8']); sfx('grunt', { vol: .6 }); if (Math.random() < .2) speak('urk', 'gnasher'); break;
    case 'imp': P.explosion(m.x, m.y, 8, .5, { debris: false, freeze: false, shake: 0 }); break;
    case 'fryar': P.smoke(m.x, m.y, 12, 8, { size: 2.4, color: '#4a3a5a' }); sfx('smoke'); break;
    case 'lobber': P.bits(m.x, m.y, 10, 6, ['#ffffff', '#c84a3a', '#e8b090']); sfx('grunt', { vol: .5, pitch: 1.3 }); break;
    case 'snatcher': P.bits(m.x, m.y, 10, 8, ['#8a7a50', '#b8a070']); sfx('giggle', { pitch: .7 }); break;
    case 'tithe': P.bits(m.x, m.y, 16, 14, ['#e8e0cc', '#ffffff', '#ff4a4a']); sfx('bones'); game.shake(4); game.flash('#ff2a2a', .08, .4); break;
  }
});
bus.on('ghostBite', ({ m }) => { P.smoke(m.x, m.y, 12, 5, { size: 2, color: '#c8d4ff' }); sfx('chomp', { vol: .6, pitch: .7 }); });
bus.on('hurt', ({ h, amount, kind }) => { if (kind === 'drain') { if (Math.random() < .1) sfx('drain'); return; } if (local(h)) { sfx('hit', { vol: .8 }); if (amount > 8) game.shake(2); h.input && h.input.rumble && h.input.rumble(.3, .12); bark(h, 'hurt'); } P.sparks(h.x, h.y, 14, 4, null, { color: '#ff6a4a' }); });
bus.on('fall', ({ h }) => { P.smoke(h.x, h.y, 10, 10, { size: 2.4, color: '#d8e0f0' }); sfx('die'); if (local(h)) game.flash('#ff2a2a', .12, .5); });
bus.on('rise', ({ h }) => { P.glints(h.x, h.y, 16, 10, '#ffe08a', 14); sfx('rise'); bark(h, 'join'); });
bus.on('eat', ({ h, it, heal }) => { P.bits(it.x, it.y, 8, 8, ['#c8803a', '#e8b060', '#8a4a1e']); P.text(h.x, h.y, 34, '+' + Math.round(heal), '#9aff8a', { bounce: true }); sfx('chomp'); });
bus.on('stew', ({ h }) => { sfx('gurgle'); P.smoke(h.x, h.y, 20, 4, { size: 1.6, color: '#9ae84a' }); });
bus.on('take', ({ h, it }) => {
  const k = it.D.kind;
  if (k === 'key') sfx('jingle'); else if (k === 'flask') sfx('flask'); else if (it.type === 'gold') sfx('coins'); else if (it.type === 'gem') sfx('gem'); else if (it.type === 'crown' || k === 'gauntlet') sfx('crown');
  else if (k === 'special') sfx('special'); else if (k === 'amulet') sfx('amulet'); else if (k === 'chest') { sfx('chest'); P.bits(it.x, it.y, 10, 12, ['#f0c030', '#fff0a0']); }
  if (k === 'treasure' || k === 'chest') P.glints(it.x, it.y, 8, 6, '#fff0a0', 10);
  if (it.D.points && k !== 'food') P.text(it.x, it.y, 20, String(it.D.points), '#ffe08a', { bounce: false });
  if (k !== 'food' && k !== 'treasure' && Math.random() < .5) bark(h, 'pick');
});
bus.on('shotItem', ({ it }) => { if (it.type === 'flask') return; sfx(it.type === 'stew' ? 'gurgle' : 'splat'); P.bits(it.x, it.y, 6, 10, it.type === 'stew' ? ['#7ab83a', '#4a7a1a'] : ['#c87a3a', '#e8c890', '#ffffff']); });
bus.on('cooked', ({ it }) => { P.smoke(it.x, it.y, 6, 6, { size: 1.6, color: '#3a2a2a' }); sfx('fireball', { vol: .5 }); });
bus.on('magic', ({ h, x, y, r }) => { game.flash('#ffffff', .18, .9); game.shake(5); sfx('blast'); P.ring(x, y, 6, r || 220, '#ffffff', .6); P.ring(x, y, 4, (r || 220) * .7, '#b8d8ff', .5); bark(h, 'magic'); });
bus.on('magicLocal', ({ h }) => { game.flash('#ffffff', .12, .6); sfx('blast'); P.ring(h.x, h.y, 6, 200, '#ffffff', .6); });
bus.on('genHit', ({ g }) => { if (Math.random() < .5) sfx('genhit'); P.bits(g.x, g.y, 8, 3, ['#8a7a6a', '#5a4a3a']); });
bus.on('genDead', ({ g }) => { if (!onScreen(g)) return; P.explosion(g.x, g.y, 6, .8, { freeze: false, shake: 3 }); P.bits(g.x, g.y, 10, 16, ['#8a7a6a', '#5a4a3a', '#c8b8a0']); sfx('crumble'); game.shake(3); });
bus.on('spawn', ({ m, gen }) => { if (gen && onScreen(m)) { P.dust(m.x, m.y, 0, 5); if (Math.random() < .3) sfx('spawn'); if (m.ai === 'snatcher') sfx('giggle'); } });
bus.on('door', ({ d }) => { sfx('door'); for (const [cx, cy] of d.cells) P.dust(mid(cx), (cy + 1) * T, 0, 4); });
bus.on('wall', ({ cx, cy, kind }) => { P.dust(mid(cx), mid(cy), 4, 12); P.bits(mid(cx), mid(cy), 10, 10, ['#8a7a64', '#5a4a3a']); sfx(kind === 'fake' ? 'secret' : 'crumble'); if (kind === 'fake') P.glints(mid(cx), mid(cy), 12, 10, '#ffffff', 10); });
bus.on('crack', ({ cx, cy }) => { P.bits(mid(cx), mid(cy) + 8, 12, 3, ['#8a7a64', '#5a4a3a']); sfx('genhit', { pitch: .7, vol: .6 }); });
bus.on('trap', ({ p }) => { sfx('trap'); game.shake(5); for (const t of W.p.trapWalls[p.kind]) P.dust(mid(t.cx), mid(t.cy), 2, 8); });
bus.on('teleport', ({ h, from, to }) => { sfx('warp'); P.glints(mid(from.cx), mid(from.cy), 4, 10, '#8afff4', 12); P.glints(mid(to.cx), mid(to.cy), 4, 10, '#8afff4', 12); });
bus.on('stun', ({ h }) => { sfx('stun'); P.sparks(h.x, h.y, 4, 6, null, { color: '#ff4a6a' }); });
bus.on('zap', ({ b }) => { sfx('zap'); P.sparks(b.x, b.y, 10, 8, null, { color: '#9afff8' }); });
bus.on('spiked', ({ b }) => { sfx('shing'); P.sparks(b.x, b.y, 4, 5, null, { color: '#e8ecf4' }); });
bus.on('bell', ({ h }) => { sfx('bell'); if (W.bell) W.bell.swing = 1; });
bus.on('stolen', ({ m }) => { sfx('giggle'); speak('hee hee', 'snatcher'); });
bus.on('escaped', ({ m }) => { P.smoke(m.x, m.y, 8, 6, { size: 1.8 }); sfx('giggle', { pitch: 1.3 }); });
bus.on('tithePaid', ({ m }) => { P.smoke(m.x, m.y, 16, 12, { size: 2.6, color: '#2a1a2a' }); sfx('drone'); });
bus.on('lob', () => sfx('whistle', { vol: .5 }));
bus.on('spit', () => sfx('fireball', { vol: .6 }));
bus.on('blink', ({ m, out }) => { P.smoke(m.x, m.y, 10, 6, { size: 2, color: '#5a4a6a' }); if (Math.random() < .4) sfx('blink'); if (!out && Math.random() < .2) speak('frying', 'fryar'); });
bus.on('shatter', ({ x, y, kind }) => { sfx('shatter', { vol: .6 }); P.bits(x, y, 2, 8, kind === 'plate' ? ['#ffffff', '#c8c8d4'] : ['#8a4a2a', '#d08a4a']); P.dust(x, y, 0, 4); });
bus.on('hexBurst', ({ x, y }) => { P.ring(x, y, 2, 12, '#d070ff', .25); });
bus.on('allyStun', ({ h }) => { sfx('stun', { pitch: 1.4 }); });
bus.on('windup', ({ m }) => { if (m.isBoss) sfx('roar', { vol: .4, pitch: 1.4 }); });
bus.on('descend', () => sfx('stairs'));
bus.on('impatience', ({ stage }) => { sfx(stage === 2 ? 'door' : 'trap'); if (stage === 3) game.flash('#ffd060', .1, .3); });
bus.on('hoardShut', () => { sfx('stomp'); game.shake(4); });
bus.on('stomp', ({ K }) => { sfx('stomp'); game.shake(6); P.ring(K.x, K.y, 10, 60, '#ffd060', .4); P.dust(K.x, K.y, 0, 14); });
bus.on('plates', () => sfx('plate'));
bus.on('kingEats', () => { sfx('chew'); speak('nom nom nom', 'king', { max: 3 }); });
bus.on('kingAte', ({ it }) => { sfx('chew'); P.bits(it.x, it.y, 12, 10, ['#c8803a', '#e8b060']); });
bus.on('roar', () => { sfx('roar'); game.shake(4); });
bus.on('charge', () => sfx('roar', { pitch: 1.2 }));
bus.on('fog', ({ K }) => { sfx('drone'); for (let i = 0; i < 20; i++) P.add({ kind: 'smoke', x: K.x + Math.cos(K.fog.a) * i * 6, y: K.y + Math.sin(K.fog.a) * i * 6, z: 20, vz: 2, max: 3, color: '#5a7a3a' }); });
bus.on('wave', () => sfx('trap', { vol: .5 }));
bus.on('boss', ({ phase }) => { if (phase > 1) { sfx('roar'); game.shake(6); } const S2 = A.song; if (S2) { A.layer('p2', phase >= 2 ? 1 : 0, 1); A.layer('p3', phase >= 3 ? 1 : 0, 1); } });
bus.on('bossHit', ({ K, amount }) => { if (Math.random() < .3) P.text(K.x, K.y, 46, String(Math.round(amount)), '#ffe08a', { bounce: true }); P.sparks(K.x, K.y, 30, 3, null, { color: '#e8c0ff' }); });
bus.on('bossDead', ({ K }) => { sfx('collapse'); game.shake(10); game.flash('#ffffff', .3, 1); P.bits(K.x, K.y, 30, 40, ['#f0e8d4', '#ffffff', '#e8c040']); });
bus.on('gauntletDrop', ({ K }) => { sfx('crown'); P.glints(K.x, K.y, 20, 30, '#ffe08a', 30); });
bus.on('kingSays', ({ text }) => { speak(text, 'king'); KING_LINE.text = text; KING_LINE.end = game.real + 3.2; });
const KING_LINE = { text: '', end: 0 };
bus.on('points', ({ h, points, why }) => { if (why === 'exit' || why === 'hoard' || why === 'king') P.text(h.x, h.y, 40, '+' + points, '#ffe08a', { scale: 2, bounce: true }); });

// ---- 59-ui.js ----
/* ---- UI KIT for the canvas screens: a big menu (scale 2 text; keys, d-pad, sticks, mouse hover and click), back on
   any screen (circle, Esc, Backspace, right click), and the idle watcher that starts the attract mode ---- */
const ui = {
  /** has anyone pressed anything this step? (any player's key or button, a click, the wheel, a stick, the mouse moving) */
  anyInput() {
    const P = game._players || [game.input];
    for (const I of P) {
      if (I.anyPressed() || I.clicked()) return true;
      if (Math.hypot(...I.padMove) > .3 || (I.padAim && Math.hypot(...I.padAim) > .3)) return true;
    }
    const I = game.input, p = I.pointer();
    if (p) { const q = ui._lastPt; ui._lastPt = p.slice(); if (q && Math.hypot(p[0] - q[0], p[1] - q[1]) > 2) return true; }
    if (I.zoom && I.zoom() !== 1) return true;
    return false;
  },
  /** idle seconds on a front-end screen; at 10 the attract mode starts */
  idle: 0,
  watchIdle(dt) { if (ui.anyInput()) { ui.idle = 0; return false; } ui.idle += dt; if (ui.idle >= 10 && !game.paused && !(game.shell && game.shell.screen)) { ui.idle = 0; game.go('attract', {}, { fade: 'dissolve' }); return true; } return false; },
  /** back: circle (pad 1), Esc, Backspace or a right click */
  back() { const P = game._players || [game.input]; return P.some(I => I.pressed('cancel')) || game.input.held.has('Mouse2') && !ui._rc && (ui._rc = true); },
  step() { if (!game.input.held.has('Mouse2')) ui._rc = false; }
};
/** a big menu: items [{ label, fn, disabled }], drawn at scale 2 with the focus bar; the mouse hover moves the focus */
class BigMenu {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = Object.assign({ x: 'center', y: 110, scale: 2, gap: 6 }, o); this.boxes = []; this._mt = null; }
  update() {
    const P = game._players || [game.input], I = game.input, n = this.items.length, old = this.i;
    if (!n) return;
    if (P.some(q => q.repeat('up'))) this.i = (this.i + n - 1) % n;
    if (P.some(q => q.repeat('down'))) this.i = (this.i + 1) % n;
    const hit = p => p ? this.boxes.findIndex(b => p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3]) : -1;
    if (I.mouse.t !== this._mt) { this._mt = I.mouse.t; const k = hit(I.pointer()); if (k >= 0) this.i = k; }
    const c = hit(I.clicked());
    if (c >= 0) this.i = c;
    if (this.i !== old) sfx('move');
    const it = this.items[this.i];
    if ((P.some(q => q.pressed('confirm')) || c >= 0) && it && !it.disabled) { sfx('select'); P.forEach(q => q.consumeAll()); it.fn && it.fn(); return true; }
    return false;
  }
  draw(g, r) {
    const o = this.o, sc = o.scale, lh = 7 * sc + o.gap, w = Math.max(...this.items.map(it => E.font.width(it.label, { scale: sc }))) + 40, x = o.x === 'center' ? Math.round((r.W - w) / 2) : o.x;
    this.boxes = [];
    this.items.forEach((it, k) => {
      const y = o.y + k * (lh + 4), on = k === this.i;
      this.boxes.push([x, y - 4, w, lh + 2]);
      if (on) { E.ui.box(g, x, y - 4, w, lh + 2, { bg: ['#5a3a1a', '#2a1a0a'], border: '#ffd060' }); px.poly(g, [[x + 8, y + 1], [x + 8, y + 7 * sc - 1], [x + 14, y + 3.5 * sc]], '#ffd060'); }
      tx(g, it.label, x + w / 2 + 6, y, it.disabled ? '#5a5048' : on ? '#ffe8b0' : '#c8b8a0', { align: 'center', scale: sc });
    });
  }
}
/** a page of words that scrolls (About, credits, long help) */
function drawPage(g, r, lines, scroll, o = {}) {
  const sc = o.scale || 1, w = Math.min(r.W - 40, o.w || 380), x = Math.round((r.W - w) / 2), y0 = o.y || 54, lh = 9 * sc + 2, h = r.H - y0 - (o.bottom || 30);
  const wrapped = []; for (const l of lines) { if (l === '') { wrapped.push(''); continue; } for (const q of E.font.wrap(l, w, { scale: sc })) wrapped.push(q); }
  const maxScroll = Math.max(0, wrapped.length * lh - h), s = clamp(scroll, 0, maxScroll);
  g.save(); g.beginPath(); g.rect(x - 4, y0 - 2, w + 8, h + 4); g.clip();
  wrapped.forEach((l, i) => { const y = y0 + i * lh - s; if (y > y0 - lh && y < y0 + h) tx(g, l, x, y, o.color || '#e8dcc8', { scale: sc }); });
  g.restore();
  if (maxScroll > 0) { const bh = Math.max(10, h * h / (wrapped.length * lh)), by = y0 + (h - bh) * (s / maxScroll); px.rect(g, x + w + 6, y0, 2, h, '#3a2e22'); px.rect(g, x + w + 6, Math.round(by), 2, Math.round(bh), '#ffd060'); }
  return maxScroll;
}
/** the shaft behind the title: brick walls rushing up, torches, an iron gauntlet tumbling down forever */
function drawShaft(g, r, t, o = {}) {
  const W2 = r.W, H = r.H, speed = o.speed || 60, off = (t * speed) % 24;
  px.rect(g, 0, 0, W2, H, '#0a0610');
  const wall = Math.round(W2 * .22);
  for (const side of [0, 1]) {
    const x0 = side ? W2 - wall : 0;
    for (let y = -24; y < H + 24; y += 12) { const yy = Math.round(y - off), row = Math.floor((y + t * speed) / 12); for (let x = (row % 2) * 10; x < wall; x += 20) { const c = E.hash2(Math.floor(x / 20) + side * 9, row) < .5 ? '#2a1e22' : '#3a2a2e'; px.rect(g, x0 + x, yy, 19, 11, c); px.rect(g, x0 + x, yy, 19, 1, '#4a383a'); } }
    const edge = side ? x0 : x0 + wall - 3; px.rect(g, edge, 0, 3, H, '#120a0e');
  }
  // the pit's depth: rings of darkness toward the middle
  for (let k = 0; k < 6; k++) { const s = 1 - k / 7; px.blend(g, .18, 'multiply', () => px.rect(g, wall + (W2 - 2 * wall) * (1 - s) / 2, 0, (W2 - 2 * wall) * s, H, '#000000')); }
  // torches rushing past
  for (let i = 0; i < 4; i++) {
    const y = ((i * 97 + t * speed) % (H + 60)) - 30, side = i % 2, x = side ? W2 - wall - 2 : wall + 2, fl = Math.sin(t * 20 + i * 3) * 1.5;
    px.rect(g, x - 1, y, 3, 8, '#5a3a1e');
    softGlow(g, x, y - 3, 12 + fl, '#ff8a3a');
    px.disc(g, x, y - 3, 3 + fl * .4, '#ffb040'); px.disc(g, x, y - 4, 1.6, '#fff0a0');
  }
  // the gauntlet, tumbling
  if (o.gauntlet !== false) {
    const gx = W2 / 2 + Math.sin(t * .7) * 22, gy = H * .42 + Math.sin(t * 1.3) * 10, a = t * 1.6;
    drawSpinningGauntlet(g, gx, gy, 3.2, a);
    softGlow(g, gx, gy, 34, '#ffd060');
  }
}
/** a soft glow: rings of light fading out (stepped, as the era's hardware blended) */
function softGlow(g, x, y, r, c) { for (let k = 4; k >= 1; k--) px.blend(g, .1, 'add', () => px.disc(g, x, y, r * k / 4, c)); }
function drawSpinningGauntlet(g, x, y, k, a) {
  const c = Math.cos(a), s = Math.sin(a), P2 = pts => pts.map(([u, v]) => [x + (u * c - v * s) * k, y + (u * s + v * c) * k]);
  const C = E.tones('#9aa0ac'), Gd = E.tones('#e8c040');
  px.poly(g, P2([[-5, -2], [5, -2], [5, 6], [-5, 6]]), C.sh);
  px.poly(g, P2([[-4, -1.4], [4, -1.4], [4, 5], [-4, 5]]), C.base);
  for (let i = 0; i < 4; i++) px.poly(g, P2([[-4.6 + i * 2.4, -7], [-2.8 + i * 2.4, -7], [-2.8 + i * 2.4, -2], [-4.6 + i * 2.4, -2]]), i % 2 ? C.lt : C.base);
  px.poly(g, P2([[5, 0], [8, -3], [9, -1], [6, 3]]), C.sh);
  px.poly(g, P2([[-6, 6], [6, 6], [6, 9], [-6, 9]]), Gd.base); px.poly(g, P2([[-6, 6], [6, 6], [6, 7], [-6, 7]]), Gd.hi);
}

// ---- 60-scenes-front.js ----
/* ---- FRONT END: title, main menu, class select, How to Play, High Scores, About & Credits. Every one: Back with
   circle / Esc / Backspace / right click, and 10 s idle starts the attract mode ---- */
const TITLE_COLORS = ['#fff4d0', '#ffd060', '#c8862a', '#6a3a14'];
let TOUCH_ONLY = false;
if (typeof window !== 'undefined' && !HEADLESS) {
  TOUCH_ONLY = touchOnly();
  const wake = () => { if (TOUCH_ONLY) { TOUCH_ONLY = false; } };
  addEventListener('keydown', wake); addEventListener('gamepadconnected', wake);
}
const frontRigs = {};
function frontRig(cls) { return frontRigs[cls] || (frontRigs[cls] = HERO_RIGS[cls]()); }
/** a rig drawn on a canvas screen (no world): standing at screen (x, y), turned to face */
function drawRigAt(g, rig, x, y, dt, st = {}) {
  rig.update(dt, Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }, st));
  rig.draw(g, x, y, E.charView(game.view));
}
function logo(g, r, y, scale = 4) {
  E.font.title(g, 'GAUNTLETDOWN', r.W / 2, y, { align: 'center', scale, colors: TITLE_COLORS, depth: 3, depthColor: '#2a1206', outline: '#0a0402' });
}
const frontScene = (o) => Object.assign({ view: 'threequarter', touch: [], camera: false, expand: true }, o);

scenes.title = frontScene({
  enter(d = {}) {
    ui.idle = 0; game.allowJoin(false); this.t = 0; this.menu = d.menu || false; music('throwdown'); clearNarrator();
    L.enabled = false; game.weather = null; game.input.touchEnabled = false;
    this.big = new BigMenu([
      ...(RUN && RUN.ended && PARTY.length ? [{ label: 'CONTINUE TO DESCENT II', fn: () => descentTwo() }] : []),
      { label: 'START DESCENT', fn: () => game.go('select', { descent: 1 }) },
      { label: 'HOW TO PLAY', fn: () => game.go('howto') },
      { label: 'HIGH SCORES', fn: () => game.go('scores') },
      { label: 'SETTINGS', fn: () => game.menu('settings') },
      { label: 'ABOUT & CREDITS', fn: () => game.go('about') }
    ], { y: 120 });
  },
  update(dt) {
    this.t += dt; ui.step();
    if (TOUCH_ONLY) { const c = game.input.clicked(); if (c && this.settingsBtn && c[0] >= this.settingsBtn[0] && c[0] < this.settingsBtn[0] + this.settingsBtn[2] && c[1] >= this.settingsBtn[1] && c[1] < this.settingsBtn[1] + this.settingsBtn[3]) game.menu('settings'); ui.watchIdle(dt); return; }
    if (ui.watchIdle(dt)) return;
    if (!this.menu) { if ((game._players || [game.input]).some(I => I.pressed('confirm') || I.pressed('start')) || game.input.clicked()) { this.menu = true; sfx('select'); game.input.consumeAll(); } return; }
    if (ui.back()) { this.menu = false; sfx('back'); return; }
    this.big.update();
  },
  draw(r) {
    r.overlay(g => {
      drawShaft(g, r, this.t);
      logo(g, r, 26, r.W > 380 ? 4 : 3);
      tx(g, 'FOUR FOOLS. ONE HUNGRY DUNGEON.', r.W / 2, 70, '#e8c890', { align: 'center' });
      // the four heroes at the pit's edge, looking down into it
      const y = r.H - 6; CLASSES.forEach((c, i) => drawRigAt(g, frontRig(c), r.W / 2 + (i - 1.5) * 34, y, 1 / 60, { facing: -Math.PI / 2 + (i - 1.5) * .15, pose: i === 3 ? 'cast' : null }));
      px.blend(g, .45, 'multiply', () => px.rect(g, 0, r.H - 52, r.W, 52, '#1a0a10'));
      if (TOUCH_ONLY) { this.settingsBtn = touchNotice(g, r); return; }
      if (!this.menu) { if (Math.floor(this.t * 2) % 2 === 0) tx(g, 'PRESS ' + key(game.input, 'confirm'), r.W / 2, 132, '#ffe8b0', { align: 'center', scale: 2 }); }
      else this.big.draw(g, r);
      tx(g, 'MY-3D2DGE ' + String(E.versionLabel ? E.versionLabel() : 'v0.85.2').replace(/[^\x20-\x7e]/g, '-'), 4, r.H - 10, '#6a5a4a', { font: 'tiny' });
      tx(g, 'GAUNTLETDOWN ' + VERSION, r.W - 4, r.H - 11, '#6a5a4a', { align: 'right' });
    });
  }
});
/** touch-only devices: no touch controls; a notice and a SETTINGS button (its box returned for the tap) */
function touchNotice(g, r) {
  const w = Math.min(300, r.W - 20), h = 92, x = Math.round((r.W - w) / 2), y = 92;
  E.ui.box(g, x, y, w, h, { bg: ['#2a1a10', '#140a06'], border: '#ffd060' });
  tx(g, 'Controller or keyboard required', r.W / 2, y + 10, '#ffe8b0', { align: 'center' });
  tx(g, 'Connect a controller or a keyboard to play.', r.W / 2, y + 26, '#c8b8a0', { align: 'center' });
  const b = [Math.round(r.W / 2 - 50), y + 48, 100, 30];
  E.ui.box(g, b[0], b[1], b[2], b[3], { bg: ['#6a4a1a', '#3a2a0a'], border: '#ffd060' }); tx(g, 'SETTINGS', r.W / 2, b[1] + 8, '#ffe8b0', { align: 'center', scale: 2 });
  return b;
}

/* ---- CHOOSE YOUR FOOL: four cards, a cursor per joined player; fire locks; START once everyone has locked ---- */
scenes.select = frontScene({
  enter(d = {}) {
    ui.idle = 0; this.descent = d.descent || 1; this.t = 0; music('throwdown');
    this.cur = [{ I: game.input, i: 0, locked: false }];
    for (const q of game.players.slice(1)) this.cur.push({ I: q, i: this.cur.length % 4, locked: false });
    game.allowJoin({ max: 4, onJoin: q => { const free = [0, 1, 2, 3].find(k => !this.cur.some(c => c.i === k && c.locked)) || 0; this.cur.push({ I: q, i: free, locked: false }); sfx('join'); } });
    this.cards = [];
  },
  exit() { },
  update(dt) {
    this.t += dt; ui.step();
    if (ui.watchIdle(dt)) return;
    if (this.t < .25) { (game._players || [game.input]).forEach(I => I.consumeAll()); return; }   // (a press from the screen before is not a pick)
    const taken = k => this.cur.some(c => c.locked && c.i === k);
    for (const c of this.cur) {
      const I = c.I;
      if (!c.locked) {
        if (I.repeat('left')) { c.i = (c.i + 3) % 4; sfx('move'); }
        if (I.repeat('right')) { c.i = (c.i + 1) % 4; sfx('move'); }
        if (I === game.input) { const p = I.pointer(); if (p && I.mouse.t !== this._mt) { this._mt = I.mouse.t; const k = this.cards.findIndex(b => p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3]); if (k >= 0 && k !== c.i) { c.i = k; sfx('move'); } } }
        const click = I === game.input ? I.clicked() : null, ck = click ? this.cards.findIndex(b => click[0] >= b[0] && click[0] < b[0] + b[2] && click[1] >= b[1] && click[1] < b[1] + b[3]) : -1;
        if (ck >= 0) c.i = ck;
        if ((I.pressed('confirm') || I.pressed('fire') || ck >= 0) && !taken(c.i)) { c.locked = true; sfx('select'); speak(QUIPS[CLASSES[c.i]].slice(0, 30), get('heroes', CLASSES[c.i]).voice); I.consumeAll(); }
        else if ((I.pressed('confirm') || ck >= 0) && taken(c.i)) sfx('back');
      } else if (I.pressed('cancel')) { c.locked = false; sfx('back'); I.consumeAll(); continue; }
    }
    if (this.cur.every(c => !c.locked) && ui.back()) { game.go('title', { menu: true }); return; }
    const ready = this.cur.length && this.cur.every(c => c.locked);
    if (ready && (this.cur.some(c => c.I.pressed('start') || c.I.pressed('confirm')) || this.cur.length === 1)) {
      if (this.cur.length > 1 && !this.cur.some(c => c.I.pressed('start') || c.I.pressed('confirm'))) return;
      this.begin();
    }
  },
  begin() {
    startRun(this.cur.map((c, k) => ({ seat: k, cls: CLASSES[c.i], input: c.I, name: 'P' + (k + 1), color: SEAT_COLORS[k] })), { descent: this.descent });
    game.go('play', { floor: 0, card: true }, { fade: 'iris' });
  },
  draw(r) {
    r.overlay(g => {
      drawShaft(g, r, this.t * .3, { gauntlet: false, speed: 20 });
      px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#2a1a20'));
      E.font.title(g, 'CHOOSE YOUR FOOL', r.W / 2, 8, { align: 'center', scale: 2, colors: TITLE_COLORS, depth: 2, depthColor: '#2a1206' });
      if (this.descent > 1) tx(g, 'DESCENT II', r.W / 2, 30, '#ff8a6a', { align: 'center' });
      const cw = Math.min(100, Math.floor((r.W - 20) / 4)), ch = Math.min(r.H - 74, 196), x0 = Math.round((r.W - cw * 4 - 9) / 2), y0 = 40;
      this.cards = [];
      CLASSES.forEach((cls, k) => {
        const D = get('heroes', cls), x = x0 + k * (cw + 3), here = this.cur.filter(c => c.i === k), lock = this.cur.find(c => c.locked && c.i === k);
        this.cards.push([x, y0, cw, ch]);
        E.ui.box(g, x, y0, cw, ch, { bg: lock ? ['#3a2a14', '#1a1008'] : ['#241a14', '#0e0a08'], border: lock ? SEAT_COLORS[this.cur.indexOf(lock)] : here.length ? '#ffd060' : '#5a4a3a' });
        tx(g, D.name, x + cw / 2, y0 + 5, D.color, { align: 'center' });
        tx(g, D.who, x + cw / 2, y0 + 15, '#a89a88', { align: 'center', font: 'tiny' });
        const rig = frontRig(cls), swing = here.length && Math.floor(this.t * 1.2) % 3 === 0;
        drawRigAt(g, rig, x + cw / 2, y0 + Math.round(ch * .44), 1 / 60, { facing: Math.PI / 2 + Math.sin(this.t * .8 + k) * 1.2, attack: swing ? E.move(D.melee.moves[0], (this.t * 1.2 % 1), 'active') : null, pose: lock ? 'cheer' : null });
        const labels = ['ARMOR', 'SHOTS', 'MELEE', 'MAGIC', 'SPEED'];
        labels.forEach((l, i) => { const yy = y0 + Math.round(ch * .47) + i * 9; tx(g, l, x + 5, yy, '#c8b8a0', { font: 'tiny' }); for (let p = 0; p < 5; p++) px.rect(g, x + cw - 36 + p * 6, yy, 5, 5, p < D.pips[i] ? D.color : '#3a3028'); });
        const q = E.font.wrap(QUIPS[cls], cw - 8, { font: 'tiny' }), qy = y0 + Math.round(ch * .47) + 48; q.slice(0, 4).forEach((l, i) => tx(g, l, x + cw / 2, qy + i * 7, '#e8dcc8', { align: 'center', font: 'tiny' }));
        here.forEach((c, j) => { const pi = this.cur.indexOf(c), col = SEAT_COLORS[pi]; px.rect(g, x + 4 + j * 12, y0 + ch - 12, 10, 8, col); tx(g, 'P' + (pi + 1), x + 5 + j * 12, y0 + ch - 11, '#000', { font: 'tiny', shadow: false }); });
        if (lock) tx(g, this.cur.indexOf(lock) === this.cur.indexOf(here[0]) ? 'READY' : 'TAKEN', x + cw - 6, y0 + ch - 12, '#ffe08a', { align: 'right' });
      });
      const by = y0 + ch + 6, ready = this.cur.every(c => c.locked);
      const msg = ready ? 'PRESS ' + key(game.input, 'start') + ' TO DESCEND' : 'CHOOSE: ' + key(game.input, 'left') + key(game.input, 'right') + '   PICK: ' + key(game.input, 'confirm') + '   BACK: ' + key(game.input, 'cancel');
      tx(g, msg, r.W / 2, by, ready && Math.floor(this.t * 3) % 2 ? '#ffffff' : '#ffe8b0', { align: 'center' });
      if (this.cur.length < 4) tx(g, 'MORE FOOLS: [2] ON THE KEYBOARD, OR ' + '[' + E.Input.prototype.codeLabel.call(game.input, 'Pad9') + '] ON A FREE CONTROLLER', r.W / 2, by + 12, '#a89a88', { align: 'center', font: 'tiny' });
    });
  }
});

/* ---- HOW TO PLAY: one idea a page, a live picture on each, left and right to page ---- */
scenes.howto = frontScene({
  enter(d = {}) { ui.idle = 0; this.page = 0; this.t = 0; this.from = d.from || 'title'; },
  update(dt) {
    this.t += dt; ui.step(); if (ui.watchIdle(dt)) return;
    const P = game._players || [game.input], n = HOWTO.length, c = game.input.clicked();
    if (P.some(I => I.repeat('right')) || (c && c[0] > game.W * .66)) { this.page = (this.page + 1) % n; sfx('move'); }
    if (P.some(I => I.repeat('left')) || (c && c[0] < game.W * .33)) { this.page = (this.page + n - 1) % n; sfx('move'); }
    if (ui.back() || P.some(I => I.pressed('confirm')) && this.page === n - 1) game.go('title', { menu: true });
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, r.H, '#120a0e'); drawShaft(g, r, this.t * .2, { gauntlet: false, speed: 10 }); px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#201018'));
      const p = HOWTO[this.page], I = game.input;
      tx(g, 'HOW TO PLAY  ' + (this.page + 1) + ' / ' + HOWTO.length, r.W / 2, 8, '#a89a88', { align: 'center' });
      E.font.title(g, p.title, r.W / 2, 22, { align: 'center', scale: 2, colors: TITLE_COLORS, depth: 2 });
      howtoArt(g, r, p.art, this.t);
      const lines = E.font.wrap(keysIn(p.text, I), Math.min(r.W - 40, 380), { scale: r.W > 400 ? 1 : 1 });
      lines.forEach((l, i) => tx(g, l, r.W / 2, r.H - 64 + i * 11, '#ffe8b0', { align: 'center' }));
      tx(g, '← ' + key(I, 'left') + '      ' + key(I, 'right') + ' →      BACK ' + key(I, 'cancel'), r.W / 2, r.H - 12, '#a89a88', { align: 'center' });
    });
  }
});
/** the live pictures on the How to Play pages */
function howtoArt(g, r, art, t) {
  const cx = r.W / 2, cy = 120, dt = 1 / 60;
  switch (art) {
    case 'king': { const k = frontRigs.king || (frontRigs.king = MON_RIGS.king()); drawRigAt(g, k, cx, cy + 40, dt, { pose: 'hips' }); drawSpinningGauntlet(g, cx + 60, cy - 20 + Math.sin(t * 2) * 6, 2, t * 2); break; }
    case 'move': { const h = frontRig('ranger'), a = t * 1.5; drawRigAt(g, h, cx + Math.cos(a) * 40, cy + 20 + Math.sin(a) * 14, dt, { vx: -Math.sin(a) * 60, vy: Math.cos(a) * 60, facing: a + Math.PI / 2 }); break; }
    case 'fire': { const h = frontRig('berserker'), u = (t * 1.5) % 1; drawRigAt(g, h, cx - 60, cy + 30, dt, { facing: 0, attack: E.move('throw', u, u < .4 ? 'wind' : 'active') }); px.sprite(g, SHOT_SPR.axe, cx - 40 + u * 110, cy + 2, { rot: t * 18 }); const s = monRigCached('gnasher'); drawRigAt(g, s, cx + 70, cy + 30, dt, { facing: Math.PI, hurt: u > .9 }); break; }
    case 'food': { const hp = Math.max(0, 700 - Math.floor((t * 20) % 700)); tx(g, String(hp), cx, cy - 30, hp < 200 ? RED : INK, { align: 'center', scale: 3 }); px.sprite(g, SPR.jug, cx - 40, cy + 10, { scale: 2 }); px.sprite(g, E.shapeSprite(ASH('wholer-ham', 'pot'), { view: 'threequarter' }), cx - 10, cy); px.sprite(g, E.shapeSprite(ASH('bowl-soup', 'pot'), { view: 'threequarter' }), cx + 30, cy + 4); tx(g, 'NO!', cx + 38, cy + 26, '#9ae84a', { align: 'center' }); break; }
    case 'magic': { const u = (t * .8) % 1; px.sprite(g, SPR.flask, cx - 4, cy - 10, { scale: 3 }); px.blend(g, .4, 'add', () => px.disc(g, cx, cy, 10 + u * 120, '#b8d8ff')); for (let i = 0; i < 5; i++) { const a = i * 1.26 + t * .3; px.sprite(g, SPR.skull, cx + Math.cos(a) * 80 - 2, cy + Math.sin(a) * 30, { scale: 2 }); } break; }
    case 'door': { px.sprite(g, SPR.key, cx - 70, cy, { scale: 3 }); for (let k = 0; k < 6; k++) px.rect(g, cx - 20 + k * 6, cy - 30 + ((t * 20) % 40 > 20 ? -Math.min(30, ((t * 20) % 40 - 20) * 2) : 0), 2, 40, '#5a5a66'); for (let s = 0; s < 5; s++) px.rect(g, cx + 50, cy - 20 + s * 8, 30, 7, E.shade('#8a7a64', -s * .15)); tx(g, 'E', cx + 64, cy - 32, '#ffe08a', { align: 'center' }); break; }
    case 'gen': { const sp = E.shapeSprite('gd-den', { view: 'threequarter', params: { dmg: Math.floor(t) % 3 } }); px.sprite(g, sp, cx - sp.w / 2, cy - sp.h / 2 + 10); for (const [i, rk] of [[0, 3], [1, 2], [2, 1]]) { const s2 = monRigCached('gnasher' + rk, () => MON_RIGS.gnasher(rk)); drawRigAt(g, s2, cx + 60 + i * 26, cy + 40, dt, { facing: Math.PI }); tx(g, 'I'.repeat(rk), cx + 60 + i * 26, cy + 44, '#ffe08a', { align: 'center', font: 'tiny' }); } break; }
    case 'friends': CLASSES.forEach((c, i) => { const h = frontRig(c); drawRigAt(g, h, cx + (i - 1.5) * 50, cy + 36, dt, { pose: 'cheer' }); px.rect(g, cx + (i - 1.5) * 50 - 8, cy + 42, 16, 3, SEAT_COLORS[i]); }); break;
  }
}
const monRigCached = (k, make) => frontRigs[k] || (frontRigs[k] = make ? make() : MON_RIGS[k](2));

/* ---- HIGH SCORES (the arcade table, large) ---- */
const CAB = new E.Arcade(game, { id: 'gauntletdown', hud: false });
const TABLE_MODE = 'descent';
function drawTable(g, r, y, o = {}) {
  const t = CAB.table(TABLE_MODE), lh = Math.max(14, Math.floor((r.H - y - 60) / 10)), cx = r.W / 2, C0 = cx - 150, C1 = cx - 120, C2 = cx - 10, C3 = cx + 10, C4 = cx + 110;
  E.font.title(g, 'HIGH SCORES', r.W / 2, y, { align: 'center', scale: 2, colors: TITLE_COLORS, depth: 2 });
  for (const [s, x, al] of [['NAME', C1, 'left'], ['SCORE', C2, 'right'], ['FOOL', C3, 'left'], ['FLOOR', C4, 'left']]) tx(g, s, x, y + 24, '#a89a88', { align: al });
  for (let i = 0; i < 10; i++) {
    const e = t[i], yy = y + 38 + i * lh, c = o.hi === i ? (Math.floor(game.real * 4) % 2 ? '#ffffff' : '#ffd060') : i ? '#e8dcc8' : '#ffd060';
    tx(g, (i + 1) + '.', C0 + 16, yy, c, { align: 'right' });
    tx(g, e ? e.name : '---', C1, yy, c, { scale: 2 });
    tx(g, String(e ? e.score : 0), C2, yy, c, { align: 'right', scale: 2 });
    if (e && e.cls) { tx(g, get('heroes', e.cls).name, C3, yy + 3, get('heroes', e.cls).color); tx(g, String(e.floor || '?') + (e.cont ? '  (+' + e.cont + ')' : ''), C4, yy + 3, '#a89a88'); }
  }
}
scenes.scores = frontScene({
  enter(d = {}) { ui.idle = 0; this.t = 0; this.hi = d.hi; music('namethyself'); },
  update(dt) { this.t += dt; ui.step(); if (ui.watchIdle(dt)) return; if (ui.back() || (game._players || [game.input]).some(I => I.pressed('confirm')) || game.input.clicked()) game.go('title', { menu: true }); },
  draw(r) { r.overlay(g => { drawShaft(g, r, this.t * .3, { gauntlet: false, speed: 15 }); px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#201018')); drawTable(g, r, 14, { hi: this.hi }); tx(g, 'BACK ' + key(game.input, 'cancel'), r.W / 2, r.H - 12, '#a89a88', { align: 'center' }); }); }
});

/* ---- ABOUT & CREDITS: paged; the Source Information and the feedback, word for word as the chat reply ---- */
const ABOUT_PAGES = () => [['CREDITS', ABOUT.credits], ['SOURCE INFORMATION', ABOUT.source], ['TESTING FEEDBACK', ABOUT.testing], ['ENGINE FEEDBACK', ABOUT.engine], ['PROMPT FEEDBACK', ABOUT.prompt]];
scenes.about = frontScene({
  enter() { ui.idle = 0; this.page = 0; this.scroll = 0; this.t = 0; },
  update(dt) {
    this.t += dt; ui.step(); if (ui.watchIdle(dt)) return;
    const P = game._players || [game.input], n = ABOUT_PAGES().length, c = game.input.clicked();
    if (P.some(I => I.repeat('right')) || (c && c[0] > game.W * .7)) { this.page = (this.page + 1) % n; this.scroll = 0; sfx('move'); }
    if (P.some(I => I.repeat('left')) || (c && c[0] < game.W * .3)) { this.page = (this.page + n - 1) % n; this.scroll = 0; sfx('move'); }
    if (P.some(I => I.down('down'))) this.scroll = Math.min(this.max || 0, this.scroll + 90 * dt);
    if (P.some(I => I.down('up'))) this.scroll = Math.max(0, this.scroll - 90 * dt);
    const z = game.input.zoom ? game.input.zoom() : 1; if (z !== 1) this.scroll = clamp(this.scroll + (z > 1 ? -24 : 24), 0, this.max || 0);
    if (ui.back()) game.go('title', { menu: true });
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, r.H, '#100a0c');
      const [title, lines] = ABOUT_PAGES()[this.page];
      tx(g, 'ABOUT & CREDITS  ' + (this.page + 1) + ' / ' + ABOUT_PAGES().length, r.W / 2, 8, '#a89a88', { align: 'center' });
      E.font.title(g, title, r.W / 2, 22, { align: 'center', scale: 2, colors: TITLE_COLORS, depth: 2 });
      this.max = drawPage(g, r, lines, this.scroll, { y: 48, w: Math.min(r.W - 40, 420), bottom: 24 });
      tx(g, '← → PAGE   ↑ ↓ SCROLL   BACK ' + key(game.input, 'cancel'), r.W / 2, r.H - 12, '#a89a88', { align: 'center' });
    });
  }
});

// ---- 61-scenes-play.js ----
/* ---- PLAY: solo and local co-op (1-4 on one screen). Floor cards, the descent, rising again, continue, game over ---- */
const HB = id => W && W.heroes.find(h => h.id === id);
const RUN_DEMO = () => !!(W && W.role === 'attract');

function realmCardFor(index, prevIndex) {
  const F = get('floors', FLOOR_ORDER[index]), P2 = prevIndex >= 0 ? get('floors', FLOOR_ORDER[prevIndex]) : null;
  if (F.treasure) return null;
  return !P2 || P2.realm !== F.realm || P2.treasure ? F.realm : null;
}
scenes.play = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: GD_INPUT, touch: [], camera: CAM, propSize: 1.3,
  enter(d = {}) {
    game.input.touchEnabled = false;
    const index = d.floor || 0, prev = d.prev === undefined ? index - 1 : d.prev;
    for (const h of PARTY) { if (!h.alive) { h.alive = true; h.hp = Math.max(h.hp, startHealth() * .5); } h.sinkT = 0; }
    buildWorld(index, { role: d.role || 'local', seed: RUN ? RUN.seed : 1 });
    W.leash = null; camBounds();
    this.state = d.card === false ? 'play' : 'card'; this.cardT = 0; this.realm = realmCardFor(index, prev); this.cardStage = this.realm ? 'realm' : 'floor';
    if (this.realm && index === 0 && W.descent > 1) this.cardStage = 'realm';
    this.cont = 0; this.sinkT = 0; floorBanner = 0;
    if (game.settings.camView && game.view.id !== game.settings.camView) game.setView(game.settings.camView);
    game.setView && game.view.id;
    L.enabled = true; game.weather = W.realm === 'furnace' ? { kind: 'ash', amount: .4 } : null;
    music(W.treasure ? 'hoard' : REALM_SONG[W.realm] || 'larder', { sync: true });
    if (!RUN_DEMO()) game.allowJoin({ max: 4, onJoin: q => joinMidPlay(q) });
    this.frameCam();
    lighting();
    if (this.state === 'play') this.begin();
  },
  exit() { game.cam.frame && game.cam.frame(null); },
  begin() {
    this.state = 'play'; floorBanner = 3;
    if (W.index === 0 && W.descent === 1) { say('start', null, 2); for (const h of W.heroes) say('welcome_' + h.cls, h, 2); }
    if (W.F.no === 6 && game.settings.allyStun && W.heroes.length > 1) say('ally_stun_on', null, 2);
    if (W.treasure) say('hoard', null, 2);
    if (W.F.boss) say('king_near', null, 2);
  },
  frameCam() {
    const live = W.heroes.filter(h => h.alive && !h.remote);
    if (live.length === 1) { game.cam.frame(null); game.follow(live[0], { z: 12, lead: 12 }); }
    else if (live.length > 1) { game.follow(null); game.cam.frame(live, { margin: 64, zoom: [.55, .75] }); }
  },
  update(dt) {
    stepNarrator(dt);
    const P2 = game._players || [game.input];
    if (P2.some(I => I.pressed('view')) && !SESSION) { game.nextView(); game.settings.set('camView', game.view.id); game.note('VIEW: ' + game.view.label.toUpperCase()); }
    if (this.state === 'card') {
      this.cardT += dt;
      if ((this.cardT > .6 && P2.some(I => I.pressed('fire') || I.pressed('confirm') || I.pressed('start'))) || game.input.clicked() || this.cardT > 5) {
        P2.forEach(I => I.consumeAll());
        if (this.cardStage === 'realm') { this.cardStage = 'floor'; this.cardT = 0; speak(line(W.F.intro || 'start'), 'gaunt'); } else this.begin();
      }
      return;
    }
    // intents: each hero from its player's input (or the bot)
    for (const h of W.heroes) {
      if (h.bot) botIntent(h, dt);
      else if (h.input) { if (!h.alive) { idleIntent(h); if (h.input.pressed('fire') || h.input.pressed('confirm')) rise(h); } else inputIntent(h, h.input); }
      if (h.joinT > 0 && h.input) joinChoose(h);
    }
    this.leash();
    if (this.state === 'continue') return this.continueStep(dt);
    if (this.state === 'sink') { this.sinkT += dt; for (const h of W.heroes) if (h.alive) h.sinkT = this.sinkT; if (this.sinkT > .6) this.next(); return; }
    stepWorld(dt);
    floorBanner = Math.max(0, floorBanner - dt);
    if (W.heroes.length && !W.heroes.some(h => h.alive)) { this.state = 'continue'; this.cont = 10; say('continue', null, 3); sfx('die'); return; }
    if (W.done) { this.state = 'sink'; this.sinkT = 0; return; }
    this.frameCam();
    musicLayers();
  },
  leash() {
    const live = W.heroes.filter(h => h.alive && !h.remote);
    if (live.length < 2) { W.leash = null; return; }
    const R = screenRect(live[0]); W.leash = [Math.max(80, (R.x1 - R.x0) - 64), Math.max(60, (R.y1 - R.y0) - 64)];
  },
  continueStep(dt) {
    this.cont -= dt;
    const P2 = game._players || [game.input];
    if (P2.some(I => I.pressed('fire') || I.pressed('start') || I.pressed('confirm'))) {
      P2.forEach(I => I.consumeAll());
      W.heroes.forEach((h, i) => { const s = W.p.starts[i % W.p.starts.length]; h.alive = false; rise(h); h.x = mid(s.cx); h.y = mid(s.cy); });
      this.state = 'play'; return;
    }
    if (this.cont <= 0) { game.go('over', {}, { fade: 'dissolve', seconds: .6 }); }
  },
  next() {
    const d = W.done, at = d.by && d.by.alive ? d.by : W.heroes.find(h => h.alive);
    for (const h of W.heroes) { h.deepest = Math.max(h.deepest, (W.F.no || 0) + 1); h.stair = 0; }
    if (d.to === 'ending' || d.to >= FLOOR_ORDER.length) { game.go('ending', {}, { fade: 'white', seconds: .8 }); return; }
    game.go('play', { floor: d.to, card: true, prev: W.index }, { fade: 'iris', at: at || undefined, seconds: .45 });
  },
  draw(r) {
    drawWorld(r);
    if (this.state === 'card') { drawCard(r, this); return; }
    drawHud(r);
    r.overlay(g => {
      if (KING_LINE.end > game.real && W.boss) { const w = Math.min(r.W - 40, 300); E.ui.box(g, (r.W - w) / 2, 46, w, 20, { bg: ['#3a1040', '#1a0820'], border: '#e8c040', alpha: .9 }); tx(g, 'KING FAMISH: ' + KING_LINE.text, r.W / 2, 52, '#ffe8b0', { align: 'center' }); }
      if (this.state === 'continue') { px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#300808')); tx(g, 'CONTINUE?', r.W / 2, r.H / 2 - 40, INK, { align: 'center', scale: 3 }); tx(g, String(Math.max(0, Math.ceil(this.cont))), r.W / 2, r.H / 2 - 10, GOLD, { align: 'center', scale: 4 }); tx(g, 'RISE, OR BE SUPPER.  ' + key(game.input, 'fire'), r.W / 2, r.H / 2 + 28, '#ffb0a0', { align: 'center' }); }
      for (const h of W.heroes) if (h.joinT > 0 && h.input) { const free = freeClasses(h); tx(g, h.name + ': ' + h.D.name + (free.length ? '  ◂ ▸ CHANGE  ' + key(h.input, 'fire') + ' KEEP' : ''), r.W / 2, r.H - 40 - W.heroes.indexOf(h) * 10, h.color, { align: 'center' }); }
    });
  }
};
/** a floor card: the realm's vignette first when the realm changes, then the floor's number, name and line */
function drawCard(r, sc) {
  r.overlay(g => {
    const t = sc.cardT;
    if (sc.cardStage === 'realm') {
      drawShaft(g, r, game.real * 1.6, { gauntlet: false, speed: 240 });
      CLASSES.forEach((c, i) => { if (!W.heroes.some(h => h.cls === c)) return; drawRigAt(g, frontRig(c), r.W / 2 + (i - 1.5) * 26 + Math.sin(game.real * 3 + i) * 4, r.H / 2 + 30 + Math.sin(game.real * 5 + i) * 6, 1 / 60, { pose: 'cheer', facing: Math.PI / 2 + Math.sin(game.real * 2 + i) }); });
      const R = REALMS[W.realm];
      E.font.title(g, 'REALM ' + R.numeral, r.W / 2, 30, { align: 'center', scale: 2, colors: TITLE_COLORS, depth: 2 });
      E.font.title(g, R.name, r.W / 2, 54, { align: 'center', scale: 3, colors: TITLE_COLORS, depth: 3 });
      const lines = E.font.wrap(STORY[R.story], Math.min(r.W - 40, 360)); lines.forEach((l, i) => tx(g, l, r.W / 2, r.H - 56 + i * 11, '#ffe8b0', { align: 'center' }));
      if (t > .6) tx(g, key(game.input, 'fire'), r.W / 2, r.H - 14, '#a89a88', { align: 'center' });
      return;
    }
    px.blend(g, .72, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#140808'));
    const F = W.F, label = F.treasure ? 'TREASURE ROOM' : F.boss ? 'THE BANQUET' : 'FLOOR ' + F.no;
    if (W.descent > 1) tx(g, 'DESCENT II', r.W / 2, 22, '#ff8a6a', { align: 'center' });
    E.font.title(g, label, r.W / 2, 36, { align: 'center', scale: 3, colors: TITLE_COLORS, depth: 3 });
    tx(g, F.name, r.W / 2, 68, '#ffe8b0', { align: 'center', scale: 2 });
    tx(g, line(F.intro || 'start'), r.W / 2, 90, '#e8c890', { align: 'center' });
    if (W.index > 0) W.heroes.forEach((h, i) => {
      const y = 112 + i * 20, x = r.W / 2 - 120;
      tx(g, h.D.name, x, y, h.color); tx(g, 'SCORE ' + h.score, x + 96, y, INK); tx(g, 'KILLS ' + h.stats.kills, x + 176, y, '#c8b8a0');
    });
    if (t > .6) tx(g, 'GO DOWN  ' + key(game.input, 'fire'), r.W / 2, r.H - 16, Math.floor(game.real * 2) % 2 ? '#ffffff' : '#ffe8b0', { align: 'center' });
  });
}
/** the camera stays inside the floor (a little of the dark round it shows) */
function camBounds() { game.cam.bounds = v => { if (!W) return null; const b = W.map.bounds(v); return { x0: b.x0 - 8, y0: b.y0 - 40, x1: b.x1 + 8, y1: b.y1 + 8 }; }; }
/** the music follows the fight: drums when a horde closes in, a heartbeat when a hero is starving */
function musicLayers() {
  if (!A.song || !W) return;
  const local2 = W.heroes.filter(h => h.alive && !h.remote);
  const horde = local2.some(h => W.monsters.filter(m => !m.dead && near(m, h, 8 * T)).length >= 12);
  const heart = local2.some(h => h.hp < 200);
  if (horde !== musicLayers.horde) { musicLayers.horde = horde; A.layer('horde', horde ? 1 : 0, .8); }
  if (heart !== musicLayers.heart) { musicLayers.heart = heart; A.layer('heart', heart ? 1 : 0, .5); }
}
/** WebGPU lighting where it exists (Settings, Enhanced lighting); the canvas lighting stands in elsewhere */
let GPU = null;
function lighting() {
  if (HEADLESS || !W) return;
  const want = game.settings.gpuLight === 'on' || (game.settings.gpuLight === 'auto' && typeof matchMedia !== 'undefined' && matchMedia('(pointer: fine)').matches);
  try { if (want && !GPU && typeof navigator !== 'undefined' && navigator.gpu) GPU = game.enableGPU({ map: W.map }); if (GPU) Object.assign(GPU, { map: W.map, enabled: want }); } catch (e) { GPU = null; }
}

/* ---- joining mid-floor: a free class, beside the party, full health; left and right change it for a few seconds ---- */
function freeClasses(h) { return CLASSES.filter(c => !W.heroes.some(q => q !== h && q.cls === c)); }
function joinMidPlay(q) {
  if (!W || !RUN || W.heroes.length >= 4) return;
  const seat = [0, 1, 2, 3].find(s => !W.heroes.some(h => h.seat === s)), cls = freeClasses({})[0] || CLASSES[seat];
  const h = newHero(seat, cls, { input: q, name: 'P' + (seat + 1), color: SEAT_COLORS[seat] });
  const ally = W.heroes.find(x => x.alive) || { x: mid(W.p.starts[0].cx), y: mid(W.p.starts[0].cy) };
  h.x = ally.x + 12; h.y = ally.y; h.inv = 2; h.joinT = 5; h.deepest = W.F.no || 1;
  if (W.map.cell(cellOf(h.x), cellOf(h.y))) { h.x = ally.x; h.y = ally.y; }
  PARTY.push(h); W.heroes.push(h);
  say('joined', h, 2); bark(h, 'join');
}
function joinChoose(h) {
  const I = h.input, free = freeClasses(h);
  if (I.pressed('fire') || I.pressed('confirm')) { h.joinT = 0; I.consumeAll(); return; }
  const d = I.pressed('right') ? 1 : I.pressed('left') ? -1 : 0; if (!d || !free.length) return;
  const all = [h.cls, ...free].sort((a, b) => CLASSES.indexOf(a) - CLASSES.indexOf(b)), i = all.indexOf(h.cls), c = all[(i + d + all.length) % all.length];
  h.cls = c; h.D = get('heroes', c); h.combo = new E.Combo(h.D.melee.moves.map(m => new E.Attack(m, { hold: .1 })), { window: .35 }); h.joinT = 5; sfx('move');
}
function dropOut(n) {
  const q = game.players[n - 1]; if (!q || !W) return;
  const h = W.heroes.find(x => x.input === q); if (!h) return;
  W.heroes.splice(W.heroes.indexOf(h), 1); PARTY.splice(PARTY.indexOf(h), 1); RIGS.delete(h);
  game.removePlayer(q); sfx('leave'); game.resume();
}
/** the pause menu's own items (the engine adds Settings, Controls, Full screen and Quit to title) */
function pauseItems() {
  if (SESSION || RUN_DEMO()) return [];
  const items = [['How to Play', () => game.shell.show('help', helpSpec())]];
  if (W) { items.push(['Dev Tools', () => devTools()]); items.push(['Restart floor', () => { game.resume(); game.go('play', { floor: W.index, card: false }); }]); }
  const by = game.pausedBy || 1; if (by > 1 && W && W.heroes.some(h => h.input === game.players[by - 1])) items.push(['Drop out (P' + by + ')', () => dropOut(by)]);
  return items;
}
/** How to Play inside the pause menu (the canvas pages can't run while paused): the same eight cards */
function helpSpec() {
  const I = game.input;
  return { title: 'How to Play', keys: [[keysIn('{move}', I), 'Move'], [keysIn('{aim}', I), 'Aim'], [I.label('fire'), 'Fire (hold); strikes up close'], [I.label('magic'), 'Magic: a Blast Flask'], [I.label('plant'), 'Plant: stand and shoot'], [I.label('view'), 'Camera view'], [I.label('pause'), 'Pause']],
    sections: HOWTO.map(p => [p.title, keysIn(p.text, I)]) };
}

/* ---- GAME OVER: the Gaunt is fed; each qualifying player names themself with their own controller ---- */
scenes.over = {
  touch: [], camera: false,
  enter(d = {}) {
    this.t = 0; this.stage = 'over'; music('fed', { loop: false }); speak(LINES.game_over, 'gaunt'); game.allowJoin(false);
    const can = !cheating() && !(RUN && RUN.dev);
    this.queue = can ? PARTY.filter(h => CAB.qualifies(h.score, TABLE_MODE)).sort((a, b) => b.score - a.score) : [];
    this.won = !!d.won; this.hi = null; this.noRecord = !can && PARTY.some(h => h.score > 0);
  },
  update(dt) {
    this.t += dt; CAB.update(dt);
    if (this.stage === 'over' && this.t > 3.5) { this.stage = 'names'; this.nextName(); }
    if (this.stage === 'done' && this.t > .8) game.go('scores', { hi: this.hi }, { fade: 'dissolve' });
  },
  nextName() {
    const h = this.queue.shift();
    if (!h) { this.stage = 'done'; this.t = 0; return; }
    this.who = h; music('namethyself'); speak(LINES.high_score, 'gaunt');
    CAB.enter(h.score, TABLE_MODE, () => { const t = CAB.table(TABLE_MODE); this.hi = t.findIndex(e => e.score === h.score && e.cls === h.cls); this.nextName(); }, { input: h.input || game.input, extra: { cls: h.cls, floor: h.deepest, cont: h.continues } });
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, r.H, '#0a0406');
      drawShaft(g, r, this.t * .2, { gauntlet: false, speed: 8 }); px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#3a0a0a'));
      if (this.stage === 'over') {
        E.font.title(g, 'GAME OVER', r.W / 2, r.H / 2 - 40, { align: 'center', scale: 4, colors: ['#ffd0c0', '#ff6a4a', '#8a1a0a', '#3a0a04'], depth: 3 });
        tx(g, LINES.game_over, r.W / 2, r.H / 2 + 10, '#ffb0a0', { align: 'center', scale: 2 });
        if (this.noRecord) tx(g, 'DEV TOOLS WERE USED: NO HIGH SCORES THIS RUN', r.W / 2, r.H / 2 + 36, '#a89a88', { align: 'center' });
      }
    });
    CAB.draw(r);
    if (this.stage === 'names' && this.who) r.overlay(g => { tx(g, this.who.D.name + ' (' + this.who.name + ')', r.W / 2, 8, this.who.color, { align: 'center', scale: 2 }); tx(g, LINES.high_score, r.W / 2, 28, '#ffe8b0', { align: 'center' }); });
  }
};

/* ---- THE ENDING: the King falls; the heroes cheer round the raised gauntlet; the credits; Descent II ---- */
scenes.ending = {
  touch: [], camera: false,
  enter() { this.t = 0; music('gauntletdown'); speak(STORY.ending.slice(0, 80), 'gaunt'); game.allowJoin(false); if (RUN) RUN.ended = true; },
  update(dt) {
    this.t += dt; stepNarrator(dt);
    const P2 = game._players || [game.input];
    if (this.t > 2 && (P2.some(I => I.pressed('confirm') || I.pressed('fire') || I.pressed('start')) || game.input.clicked() || this.t > 16)) { P2.forEach(I => I.consumeAll()); game.go('credits', {}, { fade: 'dissolve' }); }
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, r.H, '#1a0e1e');
      for (let i = 0; i < 40; i++) { const x = (E.hash2(i, 1) * r.W + this.t * 6 * (i % 3)) % r.W, y = E.hash2(i, 2) * r.H * .6; px.dot(g, x, y, i % 4 ? '#5a4a6a' : '#ffe8b0'); }
      softGlow(g, r.W / 2, r.H / 2 - 40, 64 + Math.sin(this.t * 2) * 6, '#ffd060');
      drawSpinningGauntlet(g, r.W / 2, r.H / 2 - 46 + Math.sin(this.t * 2) * 3, 3, Math.sin(this.t) * .2);
      PARTY.forEach((h, i) => drawRigAt(g, frontRig(h.cls), r.W / 2 + (i - (PARTY.length - 1) / 2) * 40, r.H / 2 + 50, 1 / 60, { pose: 'cheer', facing: Math.PI / 2 }));
      const lines = E.font.wrap(STORY.ending, Math.min(r.W - 40, 380)), shown = Math.floor(this.t * 30);
      let n = 0; lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, shown - n)); n += l.length; tx(g, s, r.W / 2, 12 + i * 11, '#ffe8b0', { align: 'center' }); });
    });
  }
};
scenes.credits = {
  touch: [], camera: false,
  enter() { this.t = 0; this.menu = null; ui.idle = 0; },
  update(dt) {
    this.t += dt;
    const P2 = game._players || [game.input];
    if (!this.menu && (this.t > 26 || (this.t > 2 && (P2.some(I => I.pressed('confirm') || I.pressed('start')) || game.input.clicked())))) {
      P2.forEach(I => I.consumeAll());
      this.menu = new BigMenu([{ label: 'DESCENT II', fn: () => descentTwo() }, { label: 'NAME THYSELF', fn: () => game.go('over', { won: true }) }], { y: 150 });
      speak(STORY.descent2, 'gaunt');
    }
    if (this.menu) this.menu.update();
  },
  draw(r) {
    r.overlay(g => {
      drawShaft(g, r, this.t * .4, { gauntlet: false, speed: 18 }); px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#1a1020'));
      const lines = ['GAUNTLETDOWN', '', 'THE HEROES', ...PARTY.map(h => h.D.who + ' THE ' + h.D.name + '  -  ' + h.score), '', ...ABOUT.credits, '', 'THE GAUNT IS NOT DEAD.', 'IT IS ONLY DIGESTING.', '', STORY.credits_tag];
      const y0 = this.menu ? 20 : r.H - this.t * 22;
      if (!this.menu) lines.forEach((l, i) => { for (const [k, q] of E.font.wrap(l, r.W - 40).entries()) tx(g, q, r.W / 2, y0 + i * 14 + k * 10, i === 0 ? GOLD : '#e8dcc8', { align: 'center', scale: i === 0 ? 2 : 1 }); });
      else { E.font.title(g, 'DESCENT II AWAITS', r.W / 2, 40, { align: 'center', scale: 3, colors: TITLE_COLORS, depth: 3 }); tx(g, STORY.descent2, r.W / 2, 90, '#ffb0a0', { align: 'center' }); this.menu.draw(g, r); }
    });
  }
};
/** Descent II: the same party, the dungeon again, harder (every rank +1, generators +1, drain x1.5) */
function descentTwo() {
  if (!PARTY.length) { game.go('title'); return; }
  RUN.descent = 2; RUN.ended = false;
  for (const h of PARTY) { h.alive = true; h.hp = Math.max(h.hp, startHealth()); h.amulet = null; }
  game.go('play', { floor: 0, card: true, prev: -1 }, { fade: 'iris' });
}

// ---- 63-attract.js ----
/* ---- THE ATTRACT MODE: after 10 s idle on any front-end screen. A loop: four bots (invulnerable, endless flasks, they
   jump ahead when stuck) on floors 2, 5 and 7 and at the banquet, the high scores, the prologue, the title; any input
   returns to the title (and is used up) ---- */
const ATTRACT = [
  { kind: 'floor', floor: 'f2', secs: 25, label: 'THE LARDER' },
  { kind: 'floor', floor: 'f5', secs: 20, label: 'THE OSSUARY' },
  { kind: 'floor', floor: 'f7', secs: 15, label: 'THE FURNACE GUT' },
  { kind: 'floor', floor: 'f9', secs: 20, label: 'THE BANQUET', boss: 2 },
  { kind: 'scores', secs: 6 }, { kind: 'prologue', secs: 8 }, { kind: 'title', secs: 4 }
];
scenes.attract = {
  view: 'threequarter', touch: [], camera: false, propSize: 1.3,
  enter(d = {}) {
    this.seg = d.seg || 0; this.t = 0; this.grace = .4; game.allowJoin(false); clearNarrator();
    A.setVolume((game.settings.volume || .7) * .6);
    this.start();
  },
  exit() { A.setVolume(game.settings.volume === undefined ? .7 : game.settings.volume); W = null; game.cam.frame && game.cam.frame(null); game.follow(null); },
  start() {
    const S2 = ATTRACT[this.seg]; this.t = 0;
    if (S2.kind !== 'floor') { W = null; L.enabled = false; game.weather = null; if (S2.kind === 'scores') music('namethyself'); if (S2.kind === 'title') music('throwdown'); if (S2.kind === 'prologue') { music('throwdown'); speak(STORY.prologue.slice(0, 90), 'gaunt'); } return; }
    startRun(CLASSES.map((c, i) => ({ seat: i, cls: c, bot: makeBot({ cheat: true }), name: 'P' + (i + 1) })), { mode: 'attract', seed: 7 + this.seg });
    const index = FLOOR_ORDER.indexOf(S2.floor);
    buildWorld(index, { role: 'attract', seed: 3 });
    for (const h of W.heroes) { h.flasks = 3; h.keys = 2; h.hp = startHealth(); }
    const at = W.F.demo && W.F.demo.at; if (at) W.heroes.forEach((h, i) => { h.x = mid(at[0]) + (i % 2) * 14; h.y = mid(at[1]) + Math.floor(i / 2) * 14; });
    if (S2.boss && W.boss) { W.boss.phase = 1; W.boss.hp = W.boss.max * .69; }
    L.enabled = true; game.weather = W.realm === 'furnace' ? { kind: 'ash', amount: .4 } : null; camBounds();
    music(REALM_SONG[W.realm] || 'larder', { sync: true }); lighting();
    game.follow(null); game.cam.frame(W.heroes, { margin: 70, zoom: [.6, .75] });
  },
  update(dt) {
    this.grace -= dt; stepNarrator(dt);
    if (this.grace <= 0 && ui.anyInput()) { (game._players || [game.input]).forEach(I => I.consumeAll()); game.go('title', {}, { fade: .2 }); return; }
    this.t += dt;
    const S2 = ATTRACT[this.seg];
    if (S2.kind === 'floor' && W) {
      for (const h of W.heroes) botIntent(h, dt);
      stepWorld(dt);
      // the director: a quiet screen gets company; a finished floor moves on
      if ((this.dirT = (this.dirT || 0) - dt) <= 0) { this.dirT = 2.5; const near2 = W.monsters.filter(m => !m.dead && W.heroes.some(h => near(h, m, 9 * T))).length; if (near2 < 6) { const h = W.heroes[0], types = W.realm === 'furnace' ? ['imp', 'gnasher'] : W.realm === 'ossuary' ? ['fryar', 'ghost', 'lobber'] : ['gnasher', 'ghost']; for (let i = 0; i < 4; i++) { const a = i * 1.6 + this.t, p = freeNear(h.x + Math.cos(a) * 70, h.y + Math.sin(a) * 50); if (p) spawnMonster(E.pick(types), p[0], p[1], 2, { rise: .4 }); } } }
      if (W.done) W.done = null;
      game.cam.frame(W.heroes.filter(h => h.alive), { margin: 70, zoom: [.6, .75] });
    }
    if (this.t >= S2.secs) { this.seg = (this.seg + 1) % ATTRACT.length; this.start(); }
  },
  draw(r) {
    const S2 = ATTRACT[this.seg];
    if (S2.kind === 'floor' && W) { drawWorld(r); drawHud(r); }
    r.overlay(g => {
      if (S2.kind === 'scores') { drawShaft(g, r, game.real * .3, { gauntlet: false, speed: 15 }); px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#201018')); drawTable(g, r, 14); }
      if (S2.kind === 'prologue') { drawShaft(g, r, game.real, {}); px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#100810')); const lines = E.font.wrap(STORY.prologue, Math.min(r.W - 40, 360)), n = Math.floor(this.t * 40); let c = 0; lines.forEach((l, i) => { tx(g, l.slice(0, Math.max(0, n - c)), r.W / 2, 30 + i * 12, '#ffe8b0', { align: 'center' }); c += l.length; }); }
      if (S2.kind === 'title') { drawShaft(g, r, game.real); logo(g, r, 40, r.W > 380 ? 4 : 3); tx(g, 'FOUR FOOLS. ONE HUNGRY DUNGEON.', r.W / 2, 84, '#e8c890', { align: 'center' }); }
      if (S2.kind === 'floor') tx(g, S2.label, r.W / 2, 92, '#e8c890', { align: 'center' });
      const top = S2.kind === 'floor' ? 52 : r.H - 40;
      if (Math.floor(game.real * 2) % 2 === 0) tx(g, 'DEMO', r.W / 2, top, '#ffd060', { align: 'center', scale: 2 });
      tx(g, 'PRESS ANY BUTTON', r.W / 2, top + 20, Math.floor(game.real * 3) % 2 ? '#ffffff' : '#ffe8b0', { align: 'center' });
    });
  }
};

// ---- 70-dev.js ----
/* ---- DEV TOOLS (pause menu; never in sessions or the attract mode): cheats, warp, give and spawn, live tuning ---- */
game.settings.define({ key: 'dev_type', group: 'Dev spawn', label: 'Monster', options: all('monsters').map(m => [m.id, m.name]), value: 'gnasher' });
game.settings.define({ key: 'dev_rank', group: 'Dev spawn', label: 'Rank', options: [[1, 'I'], [2, 'II'], [3, 'III']], value: 3 });
game.settings.define({ key: 'dev_gen', group: 'Dev spawn', label: 'Generator', options: all('gens').filter(g => !g.onTable).map(g => [g.id, g.name]), value: 'den' });
game.settings.define({ key: 'dev_bot', group: 'Dev cheats', label: 'Bot plays player 1', type: 'toggle', value: false, apply: (g, v) => { const h = W && W.heroes[0]; if (h && !SESSION && !RUN_DEMO()) h.bot = v ? makeBot({ cheat: false }) : null; } });
game.settings.reset('Dev cheats');
const dev = fn => () => { if (W) W.devUsed = true; if (RUN) RUN.dev = true; fn(); game.shell.show(game.shell.screen); };
const devAt = () => { const h = W.heroes.find(q => q.alive) || W.heroes[0]; return h; };
function warpTo(index, o = {}) { game.resume(); if (RUN) RUN.dev = true; game.go('play', Object.assign({ floor: index, card: false, prev: index - 1 }, o)); }
function warpBoss(phase) {
  warpTo(FLOOR_ORDER.indexOf('f9'));
  game.after(.05, () => { const K = W && W.boss; if (!K) return; K.phase = 1; K.hp = K.max * (phase === 2 ? .69 : .34); });
}
function devTools() {
  const S = game.shell;
  S.show('dev', { kicker: 'Pause', title: 'Dev Tools', text: 'Testing tools. While a cheat is on the HUD shows DEV and high scores are not kept.', actions: () => [
    ['Cheats', () => S.show('dev-cheats', { kicker: 'Dev Tools', title: 'Cheats', rows: CHEAT_SPEC.map(c => 'cheat_' + c[0]).concat('cheat_timescale', 'dev_bot'), actions: [['Back', () => S.back()]] })],
    ['Warp', () => S.show('dev-warp', { kicker: 'Dev Tools', title: 'Warp', actions: () => [
      ...FLOOR_ORDER.map((id, i) => { const F = get('floors', id); return [F.treasure ? (id === 't1' ? 'Treasure Room I' : 'Treasure Room II') : F.boss ? 'Floor 9: the Banquet' : 'Floor ' + F.no + ': ' + F.name.toLowerCase(), () => warpTo(i)]; }),
      ['Boss phase 2', () => warpBoss(2)], ['Boss phase 3', () => warpBoss(3)],
      ['Ending', () => { game.resume(); RUN.dev = true; game.go('ending'); }], ['Game over', () => { game.resume(); RUN.dev = true; game.go('over'); }],
      ['Descent II', () => { game.resume(); RUN.dev = true; descentTwo(); }], ['Restart floor', () => warpTo(W.index)], ['Back', () => S.back()]] })],
    ['Give and spawn', () => S.show('dev-give', { kicker: 'Dev Tools', title: 'Give and spawn', rows: ['#Spawn', 'dev_type', 'dev_rank', 'dev_gen'], actions: () => [
      ['Spawn 5 here', dev(() => { const h = devAt(); for (let i = 0; i < 5; i++) spawnMonster(game.settings.dev_type, h.x + Math.cos(i * 1.3) * 40, h.y + Math.sin(i * 1.3) * 40, +game.settings.dev_rank, { rise: .4 }); })],
      ['Spawn a generator here', dev(() => { const h = devAt(); addGen(game.settings.dev_gen, h.x + 40, h.y, +game.settings.dev_rank); })],
      ['+3 keys', dev(() => { for (const h of W.heroes) h.keys = Math.min(heroLimit(h), h.keys + 3); })],
      ['+3 flasks', dev(() => { for (const h of W.heroes) h.flasks = Math.min(heroLimit(h), h.flasks + 3); })],
      ['A roast', dev(() => { const h = devAt(); addItem('roast', h.x + 20, h.y); })], ['A spoiled stew', dev(() => { const h = devAt(); addItem('stew', h.x + 20, h.y + 10); })],
      ...all('amulets').map(a => ['Amulet: ' + a.name.toLowerCase(), dev(() => { const h = devAt(); h.amulet = { type: a.id, t: AMULET_TIME }; })]),
      ['Every special potion', dev(() => { for (const h of W.heroes) for (const s of all('specials')) h.specials[s.id] = true; })],
      ['+1000 score', dev(() => { for (const h of W.heroes) h.score += 1000; })], ['Heal the party', dev(() => { for (const h of W.heroes) { if (!h.alive) rise(h); h.hp = Math.max(h.hp, startHealth()); } })],
      ['Kill all monsters', dev(() => { for (const m of W.monsters) if (!m.dead) killMonster(m, null, 'magic'); })],
      ['Destroy all generators', dev(() => { for (const g of W.gens) if (!g.dead) hurtGen(g, 999, null); })],
      ['Open every door', dev(() => { for (const d of W.doors) openDoor(d, null); })],
      ['Reveal secrets', dev(() => { for (const k of [...W.fake]) { const [cx, cy] = k.split(',').map(Number); revealFake(cx, cy, null); } })],
      ['Next impatience stage', dev(() => { W.t = Math.max(W.t, [TUNE.impatience - 30, TUNE.impatience, TUNE.impatience + 60][Math.min(2, W.impatience)]); })],
      ['Start the attract mode now', () => { game.resume(); game.go('attract'); }], ['Back', () => S.back()]] })],
    ['Tuning', () => S.show('dev-tuning', { kicker: 'Dev Tools', title: 'Tuning', text: 'Live: each slider changes the game at once, and is kept.', rows: TUNE_SPEC.map(t => 'tune_' + t[0]), actions: [['Reset tuning to defaults', () => { resetTuning(); S.show('dev-tuning'); }], ['Back', () => S.back()]] })],
    ['Back', () => S.back()]] });
}

// ---- 80-debug.js ----
/* ---- game.debug: the game's handle for tests and tools (tools/check.mjs prints the snapshot) ---- */
function snapshot() {
  const by = {}; let total = 0;
  if (W) for (const m of W.monsters) if (!m.dead) { by[m.type] = (by[m.type] || 0) + 1; total++; }
  return {
    scene: game.sceneName, floor: W ? W.id : null, floorNo: W ? W.F.no || W.id : null, descent: W ? W.descent : RUN ? RUN.descent : 1, t: W ? +W.t.toFixed(2) : 0, role: W ? W.role : null,
    state: game.scene && game.scene.state || null, attract: game.sceneName === 'attract', touchOnly: TOUCH_ONLY,
    heroes: W ? W.heroes.map(h => ({ id: h.id, cls: h.cls, x: Math.round(h.x), y: Math.round(h.y), hp: Math.round(h.hp), score: h.score, keys: h.keys, flasks: h.flasks, amulet: h.amulet ? h.amulet.type : null,
      specials: Object.keys(h.specials), alive: h.alive, stunned: h.stun > 0, queasy: h.queasy > 0, goal: h.bot ? h.bot.goal : null, onMenu: h.onMenu > 0 })) : PARTY.map(h => ({ id: h.id, cls: h.cls, score: h.score })),
    monsters: { byType: by, total }, generators: W ? W.gens.filter(g => !g.dead).length : 0, items: W ? W.items.filter(i => !i.gone).length : 0,
    doors: W ? W.doors.filter(d => !d.open).length : 0, impatience: W ? W.impatience : 0, boss: W && W.boss ? { hp: Math.round(W.boss.hp), max: W.boss.max, phase: W.boss.phase, state: W.boss.state, dead: W.boss.dead } : null,
    narrator: NARR.lastKey, caption: NARR.caption ? NARR.caption.text : null, done: W && W.done ? W.done.to : null,
    net: typeof NET !== 'undefined' ? NET.stats() : null, errors: game.errors.length
  };
}
/** a hash of the world's state (two runs from the same seed and inputs give the same hash) */
function stateHash() {
  if (!W) return 0;
  let h = 2166136261;
  const mix = v => { h ^= Math.round(v * 16) | 0; h = Math.imul(h, 16777619); };
  for (const q of W.heroes) { mix(q.x); mix(q.y); mix(q.hp); mix(q.score); }
  for (const m of W.monsters) if (!m.dead) { mix(m.x); mix(m.y); mix(m.hp); }
  mix(W.items.filter(i => !i.gone).length); mix(W.t);
  return h >>> 0;
}
game.debug = {
  snapshot, stateHash,
  teleport(x, y, z, id = 0) { const h = W && (HB(id) || W.heroes[0]); if (h) { h.x = x; h.y = y; } },
  warp(n) { const i = typeof n === 'number' ? FLOOR_ORDER.findIndex(id => get('floors', id).no === n) : FLOOR_ORDER.indexOf(n); warpTo(i < 0 ? 0 : i); },
  give(what, n = 1, id = 0) { const h = HB(id) || W.heroes[0]; if (what === 'keys') h.keys += n; else if (what === 'flasks') h.flasks += n; else if (what === 'hp') h.hp += n; else if (get('specials', what)) h.specials[what] = true; else if (get('amulets', what)) h.amulet = { type: what, t: AMULET_TIME }; else addItem(what, h.x + 12, h.y); },
  spawn(type, x, y, rank = 1) { return spawnMonster(type, x, y, rank); },
  setTune(k, v) { game.settings.set('tune_' + k, v); return TUNE[k]; },
  bot(on = true, id = 0) { const h = HB(id) || W.heroes[0]; h.bot = on ? makeBot({ cheat: false }) : null; },
  world: () => W, party: () => PARTY, run: () => RUN, tune: TUNE, cheats: CHEATS, net: () => typeof NET !== 'undefined' ? NET : null,
  api: { buildWorld, startRun, stepWorld, validateFloor, parseFloor, damage, take, useMagic, rise, descend, spawnMonster, addGen, addItem, makeBot, botIntent, inputIntent, FLOOR_ORDER, REG, get, all, LINES, NARR, bus, rng, CAB, TABLE_MODE, ATTRACT, dropOut, joinMidPlay, CHEATS, TUNE, TUNE_DEFAULTS, resetTuning, screenRect, cheating, keysIn, devTools, warpTo, warpBoss, descentTwo, stepNarrator, speak, decorate }
};

// ---- 99-start.js ----
/* ---- START: the game's own Shell (TV-sized menus: engine change E6), then the scenes behind a boot screen ---- */
const SHELL = new E.Shell(game, {
  theme: { ink: '#f4ead8', paper: 'rgba(22,14,10,.92)', accent: '#e8b04a', muted: '#b0a08a', line: 'rgba(232,176,74,.32)', font: 'system-ui, sans-serif', titleFont: 'Georgia, serif',
    scale: (w, h) => clamp(Math.min(w / 900, h / 560), 1, 3.2) }
});
void SHELL;
game.start({
  scenes, scene: SESSION ? 'session' : 'title',
  boot: { title: 'GAUNTLETDOWN', version: VERSION, steps: [
    ['Digging the Gaunt', () => { for (const id of FLOOR_ORDER) { if (!get('floors', id)) { game.fail('floor ' + id, new Error('floor ' + id + ' is not defined')); continue; } const v = validateFloor(get('floors', id)); if (!v.ok) game.fail('floor ' + id, new Error(v.errors.join('; '))); } }],
    ['Setting the table', () => { CAB.table(TABLE_MODE); }],
    ['Waking the ghosts', () => { for (const c of CLASSES) HERO_RIGS[c](); for (const k in MON_RIGS) MON_RIGS[k](2); }]
  ], messages: ['Salting the roasts', 'Counting the keys', 'Sharpening the forks', 'Hiding the stairs'] }
});

})();
