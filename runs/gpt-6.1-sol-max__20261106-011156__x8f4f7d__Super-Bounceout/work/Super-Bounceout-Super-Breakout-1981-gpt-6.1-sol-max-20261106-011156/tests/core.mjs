import RAPIER from '../vendor/rapier.mjs';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
await RAPIER.init();
const code=['config.js','physics.js'].map(f=>readFileSync(new URL('../'+f,import.meta.url),'utf8')).join('\n');
const context=vm.createContext({RAPIER,console,Math,localStorage:{getItem(){return null;}}});
vm.runInContext(code+'\nglobalThis.Game=BreakoutGame;globalThis.defaults=DEFAULTS;',context);
const Game=context.Game;let count=0;const failures=[];
function check(name,fn){count++;try{fn();}catch(e){failures.push(name+': '+e.message);}}
function assert(condition,detail='assertion failed'){if(!condition)throw new Error(detail);}
function run(g,seconds,input){for(let i=0;i<seconds*120;i++){g.tick(1/120,typeof input==='function'?input(g):input);g.events=[];}}
const g=new Game();
check('classic field and five serves',()=>{assert(g.bricks.length===64);assert(g.lives===5);assert(g.status==='serve');});
check('real Rapier CCD balls and motion',()=>{g.serve();const y=g.snapshot().balls[0].y;run(g,.2,{});assert(g.snapshot().balls[0].y>y);assert(g.balls[0].body.isCcdEnabled());});
check('brick collisions remove bricks and score',()=>{const b=g.bricks.find(b=>b.row===7&&b.x>0);g.balls[0].body.setTranslation({x:b.x,y:b.y-.7},true);g.balls[0].body.setLinvel({x:0,y:10},true);run(g,.2,{});assert(!b.alive);assert(g.score>0);});
check('centre paddle return points up',()=>{const b=g.balls[0];b.body.setTranslation({x:0,y:-9.5},true);b.body.setLinvel({x:0,y:-10},true);run(g,.1,{targets:[0]});assert(b.body.linvel().y>0);assert(Math.abs(b.body.linvel().x)<.1);});
check('edge paddle return changes angle',()=>{const b=g.balls[0];b.lastPaddle=-100;b.body.setTranslation({x:1.4,y:-9.5},true);b.body.setLinvel({x:0,y:-10},true);run(g,.1,{targets:[0]});assert(b.body.linvel().x>4);});
check('timed POP powers ball and cools down',()=>{const b=g.balls[0];b.lastPaddle=-100;b.body.setTranslation({x:0,y:-9.5},true);b.body.setLinvel({x:0,y:-10},true);g.armPop();run(g,.1,{targets:[0]});assert(b.power>2);assert(g.popCooldown>2.8);assert(g.metrics.pops===1);});
check('roof halves paddle',()=>{const b=g.balls[0];b.body.setTranslation({x:9.3,y:11.9},true);b.body.setLinvel({x:0,y:10},true);run(g,.1,{});assert(g.small);assert(g.width===g.config.paddleWidth*.5);});
check('only final dropped ball costs serve',()=>{const life=g.lives;g.addBall(0,0,2,5);g.removeBall(g.balls.find(b=>b.alive));run(g,.02,{});assert(g.lives===life);for(const b of g.balls)if(b.alive)g.removeBall(b);run(g,.02,{});assert(g.lives===life-1);assert(g.status==='serve');assert(!g.small);});
g.dispose();
const c=new Game({stage:1});
check('cavity field has two trapped balls and twin paddles',()=>{assert(c.bricks.length===56);assert(c.captives.length===2);assert(c.paddles.length===2);});
check('two seals release each captive',()=>{c.serve();for(const captive of c.captives)for(const id of captive.sealIds)c.destroyBrick(c.bricks.find(b=>b.id===id));assert(c.metrics.freed===2);assert(c.balls.filter(b=>b.alive).length===3);});
check('multiball multiplies score',()=>{const b=c.bricks.find(b=>b.alive&&!b.seal),before=c.score;c.destroyBrick(b);assert(c.score-before===b.points*30);});c.dispose();
const d=new Game({stage:2});
check('double serves two balls',()=>{d.serve();assert(d.balls.length===2);assert(d.paddles.length===2);});d.dispose();
const p=new Game({stage:3});p.serve();
check('progressive rows advance and new bands enter',()=>{const y=p.bricks[0].y;for(let i=0;i<5;i++)p.advance();assert(p.bricks[0].y<y);assert(p.bricks.length>64);assert(p.metrics.advances===5);});p.dispose();
const cruise=new Game({relaxed:true});cruise.serve();
check('Cruise is slower and wider',()=>{assert(cruise.width>context.defaults.paddleWidth);assert(cruise.balls[0].speed<context.defaults.ballSpeed);});cruise.dispose();
const coop=new Game({coop:true});
check('two co-op paddles move independently',()=>{coop.tick(1/60,{axes:[1,-1]});assert(coop.paddles[0].x>-3);assert(coop.paddles[1].x<3);});coop.dispose();
const dead=new Game();dead.lives=1;dead.serve();for(const b of dead.balls)dead.removeBall(b);dead.tick(1/60,{});
check('final serve ends the run',()=>assert(dead.status==='lost'));dead.dispose();
const campaign=new Game();campaign.autopilot=true;campaign.invincible=true;
let ticks=0;let limit=120*1800;
while(ticks++<limit&&campaign.status!=='won'){
  campaign.tick(1/120,{});campaign.events=[];
  if(campaign.status==='stage-clear')campaign.nextStage();
}
check('autopilot plays the whole four-sector campaign',()=>{assert(campaign.status==='won',`stalled in sector ${campaign.stage+1}: ${campaign.destroyed}/${campaign.target} after ${ticks/120}s`);assert(campaign.metrics.stages.length===4);assert(campaign.metrics.freed===2);assert(campaign.metrics.pops>0);});
check('campaign state remains finite',()=>{const s=campaign.snapshot();assert(Number.isFinite(s.score));assert(s.balls.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.y)));});
campaign.dispose();
process.stdout.write(JSON.stringify({count,failures})+'\n');
