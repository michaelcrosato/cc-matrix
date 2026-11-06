/* tb-props: a set of my-3D2dge's asset store (written by tools/asset-*.mjs; entries may be edited by hand).
 * Cut from kenney-furniture, kaykit-furniture-bits: Kenney Furniture Kit (kenney.nl), CC0 1.0; KayKit Furniture Bits (kaylousberg.com), CC0 1.0
 * 4 shapes, 6 materials, 0 sprites. docs/ASSETS.md is the format; docs/ASSET-IMPORT.md how it was made.
 * "sources" records each download (its url, date, sha256 and license); an entry's src names its download, orig the file in
 * it, and fit how close it is: a shape's silhouette IoU at game scale (mean and worst view) and color dE.
 * Load it with E.addAssets(window.ASSETS['tb-props']): its ids become 'tb-props:id'. */
(window.ASSETS = window.ASSETS || {})['tb-props'] = { set: 'tb-props', format: 1, credit: 'Cut from kenney-furniture, kaykit-furniture-bits: Kenney Furniture Kit (kenney.nl), CC0 1.0; KayKit Furniture Bits (kaylousberg.com), CC0 1.0',
sources: {'kenney-furniture':{label:'Kenney Furniture Kit',origin:'Kenney (kenney.nl), furniture-kit',license:'CC0 1.0',url:'https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip',page:'https://kenney.nl/assets/furniture-kit',fetched:'2026-10-14',sha256:'e67652d0932cee41683f74711c03d3e192a2af9979ef8e6b237711f5482d46b0',licenseHash:'bc0de1a0742cb490',dir:'furniture-kit',scale:2,factors:'srgb'},'kaykit-furniture-bits':{label:'KayKit Furniture Bits',origin:'Kay Lousberg (kaylousberg.com), KayKit-Furniture-Bits-1.0',license:'CC0 1.0',url:'https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0',commit:'96d5930a8dbdb363409bbc2d3341718b00e17c9c',fetched:'2026-10-14',licenseHash:'cd675f2adc31eb5f',dir:'KayKit-Furniture-Bits-1.0',scale:0.75}},
materials: {
clay: '#f15e57 cloth',
granite: '#5e7777 none',
birch: '#e39863 planks bw=3',
oak: '#965540 planks bw=3',
sandstone: '#d6a776 planks bw=3',
'oak-b': '#a16048 planks bw=3'},
shapes: {
'chair-desk': {about:'office chair, pink seat and back, grey wheeled base',tags:'furniture office house modern',mats:{a:'clay',b:'granite'},parts:[['prism','a',[0,0,0],[[-4.5,8],[-5,19.5],[-3.6,19.5],[-2.9,11],[-3.4,8]],8.5,{axis:'x'}],['box','a',[0,0.7,6],[8.5,8.5,1.4]],['mirror','x',['box','b',[2.5,-3,0],[1,4,1]]],['mirror','x',['box','b',[3.5,-3,0],[1,2,1]]],['mirror','x',['box','b',[1.5,-1,0],[1,6,1]]],['box','b',[0,1,0],[2,8,1]],['mirror','x',['box','b',[3.5,1,0],[3,2,1]]],['mirror','x',['box','b',[4,2.5,0],[2,1,1]]],['box','b',[0,0,1],[4,4,6]],['prism','b',[-5,0,0],[[-4,7],[-4.5,10],[-3,11.5],[1.9,11],[2.7,10.5],[3.6,9],[3.3,7]],1,{axis:'x'}],['prism','b',[5,0,0],[[-4,7],[-4.5,10],[-3,11.5],[1.9,11],[2.7,10.5],[3.6,9],[3.3,7]],1,{axis:'x'}]],src:'kenney-furniture',orig:'Models/GLTF format/chairDesk.glb',fit:{iou:0.85,worst:0.8,dE:0}},
'desk-corner': {about:'L-shaped light wood corner desk',tags:'furniture office house',mats:{a:'birch'},parts:[['prism','a',[0,0,0],[[-15,-15.5],[-15.5,-3],[3,-3],[3,16],[16,15.5],[16,-15.5]],12.5]],src:'kenney-furniture',orig:'Models/GLTF format/deskCorner.glb',fit:{iou:0.86,worst:0.74,dE:0}},
'cabinet-small': {about:'small brown wooden nightstand, two pale drawers',tags:'furniture bedroom house',mats:{a:'oak',b:'sandstone'},parts:[['prism','a',[0,0,2.4],[[-4.5,-5],[-5,5],[5,5],[5,-5]],7],['prism','a',[0,0,0],[[-6,9.5],[-6,12],[6,12],[6,9.5]],12,{axis:'x'}],['box','b',[0,5,7],[7,1.2,2.4]],['box','b',[0,5,4],[7,1.2,2.4]],['mirror','x',['box','a',[3,-3,0],[2.4,2.4,2.4]]],['mirror','x',['box','a',[3,3,0],[2.4,2.4,2.4]]]],src:'kaykit-furniture-bits',orig:'addons/kaykit_furniture_bits/Assets/gltf/cabinet_small.gltf',fit:{iou:0.94,worst:0.92,dE:4}},
'cabinet-medium': {about:'low wide brown wooden cabinet on short feet',tags:'furniture bedroom house',mats:{a:'oak-b'},parts:[['prism','a',[0,0,0],[[-10,0],[-12,12.5],[12.5,12],[12.5,9.5],[11,9.5],[10.5,0],[7.5,0],[7.5,2.3],[-7.5,2.3],[-7.5,0]],12,{axis:'y'}]],src:'kaykit-furniture-bits',orig:'addons/kaykit_furniture_bits/Assets/gltf/cabinet_medium.gltf',fit:{iou:0.87,worst:0.82,dE:4}}},
sprites: {
}};
