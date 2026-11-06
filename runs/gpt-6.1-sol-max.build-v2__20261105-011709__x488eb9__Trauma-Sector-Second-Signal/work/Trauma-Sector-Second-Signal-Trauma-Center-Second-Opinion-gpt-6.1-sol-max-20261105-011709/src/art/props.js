(() => {
const E=My3D2dge;
E.addAssets(window.ASSETS['ward-furniture']);
Object.assign(E.MATERIALS,{hospitalMetal:{color:'#90b8bd',pattern:'metal'},hospitalSheet:{color:'#b2d6c0',pattern:'cloth'},hospitalScreen:{color:'#4cbaad',pattern:'none',glow:.65}});
Object.assign(E.SHAPES,{
 hospitalBed:{about:'hospital bed with raised pillow and steel rails',mats:{m:'hospitalMetal',s:'hospitalSheet',p:'linen'},parts:[['box','m',[0,0,8],[22,35,3]],['box','s',[0,0,11],[20,32,5]],['box','p',[0,-10,16],[17,8,3]],['mirror','xy',['box','m',[10,16,1],[2,2,10]]],['mirror','x',['box','m',[12,0,13],[1,24,6]]],['box','m',[0,-17,10],[23,1,12]]]},
 ivStand:{about:'IV stand with hanging bag',mats:{m:'hospitalMetal',s:'hospitalSheet'},parts:[['box','m',[0,0,0],[15,2,2]],['box','m',[0,0,0],[2,15,2]],['cyl','m',[0,0,0],.8,42],['box','m',[0,0,41],[13,1,1]],['box','s',[5,0,28],[5,3,10]],['box','m',[5,0,14],[.5,.5,14]]]},
 vitalsMonitor:{about:'vitals monitor on a wheeled cart',mats:{m:'hospitalMetal',s:'hospitalScreen'},lights:[[0,0,27,'#73d9be',40]],parts:[['box','m',[0,0,0],[15,11,2]],['cyl','m',[0,0,2],1,17],['box','m',[0,0,19],[17,11,13]],['box','s',[0,6,22],[13,1,7]]]},
 crashCart:{about:'crash cart with drawers and defibrillator',mats:{m:'hospitalMetal',r:'rusted',s:'hospitalScreen'},parts:[['box','m',[0,0,1],[20,14,20]],['row',3,[0,0,5],['box','r',[0,7.2,6],[16,1,3]]],['box','m',[0,0,21],[22,16,2]],['box','s',[4,0,23],[9,9,7]]]},
 privacyCurtain:{about:'a hanging hospital privacy curtain',mats:{m:'hospitalMetal',s:'hospitalSheet'},parts:[['mirror','x',['cyl','m',[17,0,0],.7,44]],['box','m',[0,0,43],[36,1,1]],['box','s',[0,0,6],[34,1,36]]]},
 lightbox:{about:'illuminated radiology lightbox',mats:{m:'hospitalMetal',s:'hospitalScreen'},lights:[[0,0,24,'#afdcca',55]],parts:[['box','m',[0,0,0],[24,5,35]],['box','s',[0,3,8],[20,1,23]]]},
 vendingMachine:{about:'hospital vending machine with lit display',mats:{m:'steel',s:'hospitalScreen',w:'walnut'},parts:[['box','m',[0,0,0],[23,16,43]],['box','s',[-3,9,14],[13,1,24]],['row',4,[0,0,6],['box','w',[-3,10,16],[10,1,3]]],['box','m',[8,9,27],[3,2,6]],['box','w',[0,9,3],[15,1,6]]]}
});
})();
