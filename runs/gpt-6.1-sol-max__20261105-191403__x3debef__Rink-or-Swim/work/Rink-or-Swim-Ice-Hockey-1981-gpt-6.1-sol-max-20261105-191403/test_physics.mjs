import { Hockey, initPhysics } from './simulation.js';
await initPhysics();
const checks=[];
const check=(name,pass,detail='')=>checks.push({name,pass:!!pass,detail});
const events={};
const g=new Hockey(e=>{events[e.type]=(events[e.type]||0)+1});
g.reset({attract:true,difficulty:.8});
for(let i=0;i<10800;i++)g.step(1/60);
check('AI exhibition scores real goals',g.score[0]+g.score[1]>0,g.score);
check('AI exhibition demonstrates shots, passes, checks, banks and saves',['shot','pass','hit','bank','save'].every(x=>events[x]>0),events);
check('three-minute physics run remains finite and in bounds',g.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<18.1&&Math.abs(p.z)<10.1));
g.reset();g.phase='play';const angles=new Set();
for(let i=0;i<100;i++){g.givePuck(0);const a=-1.24+i/99*2.48;g.shoot(g.players[0],{manual:true,ax:Math.cos(a),az:Math.sin(a)});const v=g.puck.linvel();angles.add(Math.atan2(v.z,v.x).toFixed(4));}
check('shooting exposes exactly 32 classic forward angles',angles.size===32,angles.size);
g.reset();g.phase='play';g.place(g.players[0],13.4,0);g.place(g.players[3],15,0);g.givePuck(3);g.check(g.players[0]);
check('goalkeeper cannot be knocked down in front of the net',g.players[3].stun===0);
g.reset();g.phase='play';for(const p of g.players)g.place(p,p.team===0?-13:13,-6);g.possession=-1;g.pickupDelay=3;g.puck.setTranslation({x:0,y:.22,z:8.5},true);g.puck.setLinvel({x:7,y:0,z:18},true);let bounced=false;const still={0:{x:0,z:0},1:{x:0,z:0},2:{x:0,z:0},3:{x:0,z:0}};
for(let i=0;i<50;i++){g.step(1/60,still);if(g.puck.linvel().z<-5)bounced=true;}
check('Rapier board collision rebounds the puck',bounced);
g.reset();g.phase='play';g.place(g.players[1],3,0);for(let i=0;i<180;i++)g.step(1/60,{...still,1:{x:1,z:0}});
check('goalkeeper respects its half-rink movement restriction',g.players[1].x<=4.3,g.players[1].x);
g.reset({mode:'cup',duration:.01});g.phase='play';g.step(1/60,still);
check('tied Cup period enters sudden death',g.overtime&&g.phase==='play');g.goal(0);
check('overtime goal ends the match',g.phase==='over'&&g.score[0]===1);
console.log(JSON.stringify(checks));
