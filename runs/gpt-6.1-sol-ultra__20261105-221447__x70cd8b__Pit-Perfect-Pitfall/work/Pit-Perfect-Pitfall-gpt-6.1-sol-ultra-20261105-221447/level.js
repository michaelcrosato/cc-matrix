export const defaults={speed:6.8,jump:11.4,gravity:25,vineSpeed:1.25,hazardSpeed:1,clock:480,invincible:false,assist:false};
export const level={
 length:272,
 sections:[
  {start:0,end:34,name:'The green invitation',biome:'jungle',hint:'A little courage. A well-timed jump.'},
  {start:34,end:68,name:'Hang in there',biome:'canopy',hint:'Jump toward a vine. Jump again to let go.'},
  {start:68,end:102,name:'Smile for the crocodiles',biome:'swamp',hint:'Closed jaws make fine stepping stones. Open jaws do not.'},
  {start:102,end:136,name:'A sinking feeling',biome:'ruins',hint:'Quicksand opens and closes. Watch its rhythm.'},
  {start:136,end:170,name:'The other way under',biome:'cave',hint:'Down below, the journey is shorter. The stings are not.'},
  {start:170,end:204,name:'Warm reception',biome:'ember',hint:'Leap the fires. Mind the rattlers.'},
  {start:204,end:238,name:'Nothing ventured',biome:'jungle',hint:'A final treasure trail, with a sting in its tail.'},
  {start:238,end:272,name:'Everything gained',biome:'temple',hint:'Twelve treasures. One very good story.'}
 ],
 gaps:[{a:30,b:40,type:'water'},{a:72,b:82,type:'crocodile'},{a:103,b:108,type:'quicksand'},{a:132,b:142,type:'tar'},{a:232,b:244,type:'water'}],
 ladders:[54,88,122,164,198,258],
 vines:[{x:35,y:8,length:7,phase:-1},{x:137,y:8,length:7,phase:0.3},{x:238,y:9,length:8,phase:1.2}],
 checkpoints:[3,46,69,111,148,173,210,250],
 treasures:[{x:11,y:0.9,type:'bag'},{x:25,y:0.9,type:'silver'},{x:48,y:0.9,type:'gold'},{x:64,y:-6.1,type:'ring'},{x:77,y:1.1,type:'gold'},{x:97,y:0.9,type:'bag'},{x:116,y:0.9,type:'ring'},{x:148,y:0.9,type:'silver'},{x:156,y:-6.1,type:'gold'},{x:178,y:0.9,type:'bag'},{x:220,y:0.9,type:'ring'},{x:251,y:0.9,type:'silver'}],
 hazards:[{x:18,y:0,type:'log'},{x:27,y:0,type:'snake'},{x:59,y:-7,type:'scorpion'},{x:74,y:0,type:'crocodile'},{x:77,y:0,type:'crocodile'},{x:80,y:0,type:'crocodile'},{x:94,y:0,type:'log'},{x:113,y:0,type:'snake'},{x:150,y:-7,type:'scorpion'},{x:160,y:-7,type:'scorpion'},{x:183,y:0,type:'fire'},{x:191,y:0,type:'snake'},{x:202,y:0,type:'fire'},{x:215,y:0,type:'log'},{x:225,y:0,type:'snake'},{x:254,y:0,type:'fire'}],
 walls:[106,206]
};
export const values={bag:2000,silver:3000,gold:4000,ring:5000};
