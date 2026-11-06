/* ward: a set of my-3D2dge's asset store (written by tools/asset-*.mjs; entries may be edited by hand).
 * Kenney Furniture Kit, CC0, kenney.nl
 * 3 shapes, 4 materials, 0 sprites. docs/ASSETS.md is the format; docs/ASSET-IMPORT.md how it was made.
 * "sources" records each download (its url, date, sha256 and license); an entry's src names its download, orig the file in
 * it, and fit how close it is: a shape's silhouette IoU at game scale (mean and worst view) and color dE.
 * Load it with E.addAssets(window.ASSETS['ward']): its ids become 'ward:id'. */
(window.ASSETS = window.ASSETS || {})['ward'] = { set: 'ward', format: 1, credit: 'Kenney Furniture Kit, CC0, kenney.nl',
sources: {'kenney-furniture':{label:'Kenney Furniture Kit',origin:'Kenney (kenney.nl), furniture-kit',license:'CC0 1.0',url:'https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip',page:'https://kenney.nl/assets/furniture-kit',fetched:'2026-10-14',sha256:'e67652d0932cee41683f74711c03d3e192a2af9979ef8e6b237711f5482d46b0',licenseHash:'bc0de1a0742cb490',dir:'furniture-kit',scale:2,factors:'srgb'}},
materials: {
clay: '#f15e57 cloth',
granite: '#5e7777 none',
birch: '#e39863 planks bw=3',
snow: '#f8ffff none'},
shapes: {
'chair-desk': {about:'office chair, pink seat and back, grey wheeled base',tags:'furniture office house modern',mats:{a:'clay',b:'granite'},parts:[['prism','a',[0,0,0],[[-4.5,8],[-5,19.5],[-3.6,19.5],[-2.9,11],[-3.4,8]],8.5,{axis:'x'}],['box','a',[0,0.7,6],[8.5,8.5,1.4]],['mirror','x',['box','b',[2.5,-3,0],[1,4,1]]],['mirror','x',['box','b',[3.5,-3,0],[1,2,1]]],['mirror','x',['box','b',[1.5,-1,0],[1,6,1]]],['box','b',[0,1,0],[2,8,1]],['mirror','x',['box','b',[3.5,1,0],[3,2,1]]],['mirror','x',['box','b',[4,2.5,0],[2,1,1]]],['box','b',[0,0,1],[4,4,6]],['prism','b',[-5,0,0],[[-4,7],[-4.5,10],[-3,11.5],[1.9,11],[2.7,10.5],[3.6,9],[3.3,7]],1,{axis:'x'}],['prism','b',[5,0,0],[[-4,7],[-4.5,10],[-3,11.5],[1.9,11],[2.7,10.5],[3.6,9],[3.3,7]],1,{axis:'x'}]],src:'kenney-furniture',orig:'Models/GLTF format/chairDesk.glb',fit:{iou:0.85,worst:0.8,dE:0}},
'bathroom-cabinet-drawer': {about:'light wood vanity, white drawers, countertop and tap',tags:'furniture bathroom house',mats:{a:'birch',b:'snow'},parts:[['box','a',[0,-0.3,0],[14,9.5,10.5]],['box','b',[0,0.8,0.9],[12,8.5,4]],['box','b',[0,0.8,5.5],[12,8.5,4]],['box','b',[0,-0.5,10],[14,11,3]],['box','b',[0,-4,13],[4,2,2]],['box','b',[0,-1.5,14],[4,3,1]],['box','b',[0,-2,15],[2,4,1]]],src:'kenney-furniture',orig:'Models/GLTF format/bathroomCabinetDrawer.glb',fit:{iou:0.94,worst:0.91,dE:0}},
'cabinet-bed-drawer': {about:'small light wood nightstand with a drawer, short feet',tags:'furniture bedroom house',mats:{a:'birch'},parts:[['prism','a',[0,0,0],[[-3.9,0],[-4.5,8.5],[4.5,8.5],[4.5,7.5],[4,7.5],[4,0],[3,0],[3,0.9],[-3,0.9],[-3,0]],7,{axis:'y'}]],src:'kenney-furniture',orig:'Models/GLTF format/cabinetBedDrawer.glb',fit:{iou:0.91,worst:0.84,dE:0}}},
sprites: {
}};
