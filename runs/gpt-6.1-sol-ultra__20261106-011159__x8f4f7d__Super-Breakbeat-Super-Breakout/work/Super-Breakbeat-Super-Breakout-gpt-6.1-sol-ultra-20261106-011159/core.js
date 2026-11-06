import RAPIER from '@dimforge/rapier2d-compat';
export const DEFAULTS={ballSpeed:7.8,paddleWidth:2.15,paddleSpeed:18,acceleration:0.035,descent:0.14,assist:0};
export const STAGES=[
 {name:'FIRST CONTACT',mode:'classic',subtitle:'Find a gap. Break on through.',brief:'A silent wall. A single signal. Send it back.',rows:6},
 {name:'DOUBLE EXPOSURE',mode:'double',subtitle:'Two paddles. Two signals. Double trouble.',brief:'Your echo has company. Keep both signals alive.',rows:6},
 {name:'LOST SIGNALS',mode:'cavity',subtitle:'Break the cages. Free the echoes.',brief:'Two signals are trapped inside. Open their way home.',rows:8},
 {name:'THE ENCORE',mode:'progressive',subtitle:'The wall is coming to you.',brief:'The field is advancing. Clear the final transmission.',rows:8}
];
let ready;
export async function initPhysics(){if(!ready)ready=RAPIER.init();return ready;}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class GameCore{
 constructor(){this.tuning={...DEFAULTS};this.events=[];this.stats={};this.stage=0;this.state='idle';this.paddles=[0,0];this.targets=[0,0];this.coop=false;this.autoplay=false;this.infinite=false;this.time=0;this.accumulator=0;this.score=0;this.lives=5;this.charge=0;this.combo=0;this.bestCombo=0;this.world=null;this.bricks=[];this.balls=[];this.serial=0;this.hitMap=new Map();}
 emit(type,data={}){this.events.push({type,...data});} drain(){return this.events.splice(0);}
 start({coop=false,stage=0,endless=false}={}){this.coop=coop;this.endless=endless;this.score=0;this.lives=5;this.charge=0;this.combo=0;this.bestCombo=0;this.stats={bricks:0,returns:0,rescues:0,pulses:0,lost:0,roof:0,completed:0};this.loadStage(stage);}
 loadStage(index){if(this.world)this.world.free();this.queue?.free();this.stage=index;this.state='serve';this.stageTime=0;this.paddles=[0,0];this.targets=[0,0];this.shrunk=false;this.beatTime=0;this.combo=0;this.hits=0;this.descended=0;this.bricks=[];this.balls=[];this.hitMap.clear();this.world=new RAPIER.World({x:0,y:0});this.queue=new RAPIER.EventQueue(true);this.world.timestep=1/120;
 const wall=(x,y,hx,hy,tag)=>{const c=this.world.createCollider(RAPIER.ColliderDesc.cuboid(hx,hy).setTranslation(x,y).setRestitution(1).setFriction(0));this.hitMap.set(c.handle,{type:tag});};wall(-6.17,0,.18,7.2,'wall');wall(6.17,0,.18,7.2,'wall');wall(0,7.12,6.35,.18,'roof');
 this.paddleBodies=[];this.paddleColliders=[];for(let p=0;p<2;p++){const b=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,this.paddleY(p)));const c=this.world.createCollider(RAPIER.ColliderDesc.cuboid(this.width()/2,.135).setRestitution(1).setFriction(0),b);this.hitMap.set(c.handle,{type:'paddle',p});this.paddleBodies.push(b);this.paddleColliders.push(c);}this.updatePaddleShape();
 const info=STAGES[index%4];for(let r=0;r<info.rows;r++)for(let c=0;c<10;c++){
 if(info.mode==='cavity'&&(r===2||r===3)&&([1,2,7,8].includes(c)))continue;
 const y=5.8-r*.62-(info.mode==='progressive'&&r>=4?1.05:0);this.addBrick(c,r,y);
 }
 if(info.mode==='cavity'){this.spawnBall(-3.48,4.22,3.8,4.1,true);this.spawnBall(3.48,4.22,-3.8,-4.1,true);}
 this.emit('stage',{stage:index,info});
 }
 addBrick(col,row,y){const brick={id:++this.serial,x:(col-4.5)*1.15,y,row,col,value:[7,7,5,5,3,3,1,1][row%8],alive:true};const c=this.world.createCollider(RAPIER.ColliderDesc.cuboid(.535,.25).setTranslation(brick.x,y).setRestitution(1).setFriction(0));brick.collider=c;this.hitMap.set(c.handle,{type:'brick',brick});this.bricks.push(brick);return brick;}
 width(){return this.tuning.paddleWidth*(this.shrunk?.6:1)*(this.beatTime>0?1.65:1);}
 paddleY(p){return p===0?-5.7:-4.7;}
 hasUpper(){return this.coop||['double','cavity'].includes(STAGES[this.stage%4].mode);}
 updatePaddleShape(){this.paddleColliders.forEach((c,i)=>{c.setShape(new RAPIER.Cuboid(this.width()/2,.135));const enabled=i===0||this.hasUpper();c.setEnabled(enabled);c.setCollisionGroups(enabled?0xffffffff:0);});}
 spawnBall(x,y,vx,vy,captive=false){const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y).setLinvel(vx,vy).setCcdEnabled(true).setLinearDamping(0).setCanSleep(false));const collider=this.world.createCollider(RAPIER.ColliderDesc.ball(.155).setRestitution(1).setFriction(0).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),body);const ball={id:++this.serial,body,collider,captive,age:0,lastPaddle:-2};this.hitMap.set(collider.handle,{type:'ball',ball});this.balls.push(ball);return ball;}
 launch(){if(this.state!=='serve')return false;this.state='playing';const speed=this.tuning.ballSpeed;this.spawnBall(this.paddles[0],-5.28,speed*.36,speed*.933);if(STAGES[this.stage%4].mode==='double')this.spawnBall(this.paddles[1],-4.25,-speed*.43,speed*.903);this.emit('launch');return true;}
 pulse(){if(this.state!=='playing'||this.charge<.999)return false;this.charge=0;this.beatTime=2.2;this.stats.pulses++;this.updatePaddleShape();for(const ball of this.balls){if(ball.captive)continue;const v=ball.body.linvel();if(v.y<0)ball.body.setLinvel({x:v.x,y:Math.abs(v.y)},true);}this.emit('pulse');return true;}
 killBrick(brick){if(!brick.alive)return;brick.alive=false;this.hitMap.delete(brick.collider.handle);this.world.removeCollider(brick.collider,true);this.combo++;this.bestCombo=Math.max(this.combo,this.bestCombo);this.stats.bricks++;const mult=Math.max(1,this.balls.filter(b=>!b.captive).length);const points=brick.value*10*mult+Math.min(10,this.combo)*2;this.score+=points;this.charge=Math.min(1,this.charge+.034);this.emit('brick',{id:brick.id,x:brick.x,y:brick.y,row:brick.row,points,combo:this.combo});}
 advance(){this.stats.completed++;if(this.stage===3&&!this.endless){this.state='won';this.emit('won');}else{this.loadStage((this.stage+1)%4);}}
 update(dt,input={}){if(!this.world||!['serve','playing'].includes(this.state))return;this.accumulator+=Math.min(dt,.08);let n=0;while(this.accumulator>=1/120&&n++<10){this.step(1/120,input);this.accumulator-=1/120;}}
 step(dt,input){this.time+=dt;this.stageTime+=dt;if(this.beatTime>0){this.beatTime-=dt;if(this.beatTime<=0)this.updatePaddleShape();}const ai=this.autoplay||input.ai;
 for(let p=0;p<2;p++){let desired=input[p===0?'x':'x2'];if(p===1&&!this.coop)desired=input.x;
 if(ai||this.tuning.assist>0){const target=this.balls.filter(b=>!b.captive).sort((a,b)=>a.body.translation().y-b.body.translation().y)[0];if(target){const pos=target.body.translation(),v=target.body.linvel();let tx=pos.x;if(v.y<0){tx+=v.x*(this.paddleY(p)+.3-pos.y)/v.y;while(tx>5.8||tx< -5.8){if(tx>5.8)tx=11.6-tx;if(tx< -5.8)tx=-11.6-tx;}}desired=ai?tx+this.width()*.31*Math.sin(this.hits*1.71+p*.8+this.stageTime*.29):(Number.isFinite(desired)?desired:this.targets[p])*(1-this.tuning.assist)+tx*this.tuning.assist;}}
 if(Number.isFinite(desired))this.targets[p]=clamp(desired,-6+this.width()/2,6-this.width()/2);this.paddles[p]+=clamp(this.targets[p]-this.paddles[p],-this.tuning.paddleSpeed*dt,this.tuning.paddleSpeed*dt);this.paddleBodies[p].setNextKinematicTranslation({x:this.paddles[p],y:this.paddleY(p)});}
 if(this.state==='serve'){if(ai&&this.stageTime>.8)this.launch();}
 this.world.step(this.queue);const hits=[];this.queue.drainCollisionEvents((a,b,started)=>{if(started)hits.push([a,b]);});const remove=new Set();
 for(const [a,b] of hits){const ta=this.hitMap.get(a),tb=this.hitMap.get(b);if(!ta||!tb)continue;const ball=ta.type==='ball'?ta.ball:tb.type==='ball'?tb.ball:null;const other=ta.type==='ball'?tb:ta;if(!ball)continue;
 if(other.type==='brick'&&other.brick.alive&&!ball.captive){remove.add(other.brick);if(other.brick.row<3)this.hits+=2;}
 else if(other.type==='paddle'&&this.time-ball.lastPaddle>.09){ball.lastPaddle=this.time;const pos=ball.body.translation();const offset=clamp((pos.x-this.paddles[other.p])/(this.width()/2),-.95,.95);const angle=offset*1.03;const speed=this.speed();ball.body.setLinvel({x:Math.sin(angle)*speed,y:Math.cos(angle)*speed},true);ball.body.setTranslation({x:pos.x,y:this.paddleY(other.p)+.31},true);this.stats.returns++;this.hits++;this.combo=0;this.charge=Math.min(1,this.charge+.06);this.emit('paddle',{p:other.p,x:pos.x});}
 else if(other.type==='roof'&&!ball.captive){if(!this.shrunk){this.shrunk=true;this.stats.roof++;this.updatePaddleShape();this.emit('roof');}this.emit('wall');}
 else if(other.type==='wall')this.emit('wall');}
 for(const brick of remove)this.killBrick(brick);
 for(const ball of [...this.balls]){ball.age+=dt;const pos=ball.body.translation();if(ball.captive&&(pos.y<3.05||pos.y>5.5||Math.abs(pos.x)<1.3)){ball.captive=false;this.stats.rescues++;this.emit('rescue',{x:pos.x,y:pos.y});}
 if(pos.y< -7.5){this.removeBall(ball);continue;}if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y)){this.removeBall(ball);continue;}
 if(!ball.captive){const v=ball.body.linvel(),len=Math.hypot(v.x,v.y),speed=this.speed();if(len>.1){let vy=v.y;if(Math.abs(vy)<speed*.24)vy=(vy<0?-1:1)*speed*.24;const l=Math.hypot(v.x,vy);ball.body.setLinvel({x:v.x/l*speed,y:vy/l*speed},true);}}
 }
 if(this.state==='playing'&&!this.balls.some(b=>!b.captive)){this.lives-=this.infinite?0:1;this.stats.lost++;this.combo=0;this.shrunk=false;this.updatePaddleShape();this.emit('loss');if(this.lives<=0){this.state='lost';this.emit('lost');}else this.state='serve';}
 if(this.state==='playing'&&STAGES[this.stage%4].mode==='progressive'){const amount=this.tuning.descent*dt;this.descended+=amount;for(const brick of this.bricks){if(!brick.alive)continue;brick.y-=amount;brick.collider.setTranslation({x:brick.x,y:brick.y});if(brick.y< -3.85){if(this.infinite||ai){this.killBrick(brick);}else{this.state='lost';this.emit('lost',{reason:'The wall reached your signal.'});break;}}}}
 if(this.bricks.length&&this.bricks.every(b=>!b.alive)&&this.state==='playing'){this.state='cleared';this.emit('clear');}
 }
 speed(){return this.tuning.ballSpeed*(1+Math.min(.65,this.hits*this.tuning.acceleration*.13));}
 removeBall(ball){this.hitMap.delete(ball.collider.handle);this.world.removeRigidBody(ball.body);this.balls=this.balls.filter(b=>b!==ball);}
 snapshot(){return {state:this.state,stage:this.stage,score:this.score,lives:this.lives,charge:this.charge,combo:this.combo,bestCombo:this.bestCombo,paddles:[...this.paddles],width:this.width(),upper:this.hasUpper(),shrunk:this.shrunk,beatTime:this.beatTime,time:this.time,stats:{...this.stats},bricks:this.bricks.filter(b=>b.alive).map(({id,x,y,row,col})=>({id,x,y,row,col})),balls:this.balls.map(b=>({id:b.id,...b.body.translation(),captive:b.captive}))};}
 dispose(){this.world?.free();this.queue?.free();}
}
