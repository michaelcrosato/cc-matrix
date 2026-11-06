export const SIZE=2048;
const place=(id,name,x,z,kind,side='neutral')=>({id,name,x,z,kind,side});
export const PLACES=[
place('kiln','KILN',-60,110,'town'),place('landing','THE LANDING',-55,212,'jetty'),place('yard',"THE WIDOW’S YARD",40,70,'shop'),place('bridge_road','KILN BRIDGE',130,60,'bridge'),
place('s1','PUMP HOUSE',-240,-40,'safehouse'),place('s2','SALT SHED',420,300,'safehouse','commons'),place('s3','SIGNAL BOX',120,-395,'safehouse','stewards'),
place('gp1','JUNCTION',40,-120,'post','commons'),place('gp2','GRASS ROAD',300,180,'post','commons'),place('gp3','RAIL CROSSING',120,-300,'post','stewards'),place('gp4','DEPOT ROAD',-420,-300,'post','stewards'),place('gp5','WORKINGS GATE',570,-370,'post','stewards'),place('gp6','SWITCHBACK FOOT',-300,-540,'post','deserters'),place('gp7','LOW FORD',-500,390,'post','commons'),place('gp8','NORTH ROAD',380,-60,'post','stewards'),
place('dump','THE FUEL DUMP',560,520,'dump','commons'),place('railbridge','BAD BRIDGE',470,-380,'railbridge','stewards'),place('depot','WEST DEPOT',-780,-380,'depot','stewards'),place('workings','THE WORKINGS',760,-430,'pit','stewards'),place('mission','THE MISSION',-420,-820,'mission'),place('camp','SECOND WATER',-600,500,'camp'),place('waterhole','THE WATERHOLE',700,120,'waterhole')];
export const POI=Object.fromEntries(PLACES.map(p=>[p.id,p]));
export const RIVER=[[900,-1024],[760,-740],[540,-560],[470,-380],[400,-220],[200,-60],[60,180],[-120,290],[-420,360],[-760,470],[-1024,720]];
export const ROADS=[['kiln','gp1','gp3','gp4','gp6','mission'],['kiln','yard','bridge_road','gp2','s2','dump'],['bridge_road','gp8','gp5','workings'],['kiln','s1','gp7','camp'],['gp4','depot'],['gp3','s3'],['gp6','mission']].map(a=>a.map(id=>[POI[id].x,POI[id].z]));
export const RAIL=[[-850,-380],[120,-380],[470,-380],[650,-400],[760,-430]];
export const MERCS=[
{id:'ines',name:'INES CALLOWAY',role:'Struck-off field medic',perk:'Syringes 25% faster',skin:0x996440,glove:0x333c34},
{id:'tomasz',name:'TOMASZ WREN',role:'Sapper. Bad ear. Worse jokes.',perk:'Repairs 25% faster',skin:0xc99874,glove:0x655342},
{id:'dao',name:'DAO RENARD',role:'Courier. Pilot. Outstanding debts.',perk:'Locator range +50%',skin:0xb28758,glove:0x34352d},
{id:'sefton',name:'SEFTON BRAY',role:'Thirty years of leaving this place',perk:'Guns wear 25% slower',skin:0x624839,glove:0x394450}];
export const CASES=[[-220,-29],[315,176],[468,-390],[730,-392],[-360,-510],[681,139],[-545,492],[400,309],[25,44],[-788,-368],[-114,286],[-395,-804]].map(([x,z],i)=>({id:'diamond'+i,x,z,value:i%3===0?2:1}));
export const CAST=[{id:'widow',name:'THE WIDOW',x:38,z:67,poi:'yard'},{id:'comptroller',name:'THE COMPTROLLER',x:-34,z:99,poi:'kiln'},{id:'foreman',name:'THE FOREMAN',x:-94,z:111,poi:'kiln'},{id:'doctor',name:'THE DOCTOR',x:-62,z:139,poi:'kiln'},{id:'clerk',name:'THE CLERK',x:-602,z:496,poi:'camp'},{id:'notary',name:'THE NOTARY',x:-420,z:-820,poi:'mission'},{id:'ferryman',name:'THE FERRYMAN',x:-55,z:209,poi:'landing'}];
export const PREFABS=['shack','container','sandbag','barrel','crate','acacia','rock','tent','sign','tank','pickup','technical','skiff'];
