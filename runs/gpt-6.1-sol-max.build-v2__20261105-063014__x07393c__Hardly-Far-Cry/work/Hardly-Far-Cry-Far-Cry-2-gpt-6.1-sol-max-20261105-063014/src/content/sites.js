export const SITES=[
 {id:'mile-forty',name:'MILE FORTY',at:[0,40],kind:'town',r:48,tag:'truce'},
 {id:'pump-shed',name:'PUMP SHED',at:[-120,150],kind:'safehouse',r:21},
 {id:'ranger-post',name:'RANGER POST',at:[40,-170],kind:'post',r:25,faction:'concord',guards:8,safehouse:true},
 {id:'water-tower',name:'WATER TOWER',at:[470,-180],kind:'tower',r:22,faction:'harvest',guards:6,safehouse:true},
 {id:'fort-clement',name:'FORT CLEMENT',at:[-430,-180],kind:'fort',r:38,faction:'concord',guards:8},
 {id:'long-field',name:'THE LONG FIELD',at:[-260,-300],kind:'field',r:30,faction:'concord',guards:8},
 {id:'granary',name:'THE GRANARY',at:[400,280],kind:'granary',r:38,faction:'harvest',guards:8},
 {id:'east-siding',name:'EAST SIDING',at:[430,-60],kind:'fuel',r:30,faction:'harvest',guards:7},
 {id:'three-wells',name:'THREE WELLS',at:[-260,240],kind:'village',r:35},
 {id:'pump-station',name:'PUMP STATION',at:[-330,395],kind:'pump',r:22,faction:'harvest',guards:6},
 {id:'salt-pan',name:'SALT PAN',at:[200,470],kind:'salt',r:25,faction:'concord',guards:6},
 {id:'cut',name:'THE CUT',at:[150,-300],kind:'mine',r:18,faction:'concord',guards:10},
 {id:'observatory',name:'OBSERVATORY',at:[-130,-520],kind:'observatory',r:27,faction:'concord',guards:7},
 {id:'pass',name:'THE PASS',at:[-590,-430],kind:'pass',r:24,faction:'harvest',guards:8},
 ...[[90,-80],[-200,30],[170,90],[-320,-90],[280,-210],[300,390]].map((at,i)=>({id:'p'+(i+1),name:'CHECKPOINT '+(i+1),at,kind:'checkpoint',r:16,faction:i%2?'concord':'harvest',guards:4+i%3}))
];
export const SITE_BY_ID=Object.fromEntries(SITES.map(s=>[s.id,s]));
export const CASES=[[-161,117],[39,-205],[463,-128],[-480,-157],[-210,-348],[344,265],[-285,289],[230,431],[108,-255],[-175,-493],[-537,-405],[272,132]].map((at,i)=>({id:'case-'+i,at,value:2+i%5}));
export const TRIGS=[[-186,4],[389,-278],[-468,-397],[-17,-388],[318,474],[-129,-488]].map((at,i)=>({id:'trig-'+i,at}));
export const HALTS=[{id:'west-cutting',name:'WEST CUTTING',at:[-405,97]},{id:'mile-forty',name:'MILE FORTY',at:[0,70]},{id:'east-siding',name:'EAST SIDING',at:[430,-60]},{id:'cut-spur',name:'CUT SPUR',at:[190,-242]}];
