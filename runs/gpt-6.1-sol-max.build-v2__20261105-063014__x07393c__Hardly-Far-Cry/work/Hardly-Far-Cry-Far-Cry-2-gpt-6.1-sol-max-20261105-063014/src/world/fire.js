import {clamp,polyDistance,rle,unrle} from '../core/math.js';
import {SCARS} from '../content/roads.js';
export class FireGrid {
 constructor(rng,tuning,height=()=>40,fuelAt=()=>1){this.n=256;this.cell=5;this.rng=rng;this.tuning=tuning;this.height=height;this.fuel=new Uint8Array(65536);this.state=new Uint8Array(65536);this.burnEnd=new Float32Array(65536);this.burntAt=new Float32Array(65536);this.active=new Set();this.scorched=new Set();this.time=0;this.totalBurnt=0;this.clock=0;this.onChange=null;for(let i=0;i<65536;i++){const [x,z]=this.coords(i);this.fuel[i]=fuelAt(x,z);}}
 index(x,z){const ix=Math.floor((x+640)/5),iz=Math.floor((z+640)/5);return ix<0||iz<0||ix>=256||iz>=256?-1:ix+iz*256;}
 coords(i){return [-637.5+(i%256)*5,-637.5+Math.floor(i/256)*5];}
 lightIndex(i){if(i<0||i>=65536||!this.fuel[i]||this.state[i]!==0)return false;this.state[i]=1;this.burnEnd[i]=this.time+this.rng.range(9,14)+(this.fuel[i]>1?6:0);this.active.add(i);this.onChange?.(i,1);return true;}
 ignite(x,z,radius=3){let n=0;for(let zz=z-radius;zz<=z+radius;zz+=2.5)for(let xx=x-radius;xx<=x+radius;xx+=2.5)if(Math.hypot(xx-x,zz-z)<=radius)n+=this.lightIndex(this.index(xx,zz))?1:0;return n;}
 markBurnt(i){if(i<0||this.state[i]===2)return;this.active.delete(i);this.state[i]=2;this.scorched.add(i);this.burntAt[i]=this.time;this.totalBurnt++;this.onChange?.(i,2);}
 tick(dt,wind={x:1,z:0,speed:5},rain=false,gameHours=0){this.time+=dt;this.clock+=dt;if(this.clock<.25)return;this.clock-=.25;const newly=[];for(const i of this.active){if(this.time>=this.burnEnd[i]){this.markBurnt(i);continue;}const [x,z]=this.coords(i),ix=i%256,iz=(i/256)|0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz||ix+dx<0||ix+dx>255||iz+dz<0||iz+dz>255)continue;const j=i+dx+dz*256;if(this.state[j]||!this.fuel[j])continue;const len=Math.hypot(dx,dz),w=clamp(1+this.tuning.windEffect*wind.speed/5*1.6*(dx*wind.x+dz*wind.z)/len,.15,3.5),s=this.height(x+dx*5,z+dz*5)>this.height(x,z)+.1?1.4:.7;const p=.02*[0,1,.8,.6,.4][this.fuel[j]]*w*s*(rain?.15:1)*this.tuning.fireSpread/len;if(this.rng.chance(p))newly.push(j);}if(wind.speed>6&&this.rng.chance(.012*this.tuning.fireSpread)){const jump=this.rng.int(2,3);newly.push(this.index(x+wind.x*jump*5,z+wind.z*jump*5));}}
 for(const i of newly)this.lightIndex(i);if(this.time%3<.25)for(const i of this.scorched){if(this.state[i]===2&&(this.time-this.burntAt[i])*24/(this.tuning.dayMinutes*60)>=this.tuning.regrowHours){this.state[i]=3;this.onChange?.(i,3);}}}
 burnStrip(id,width=20){for(let i=0;i<65536;i++){const [x,z]=this.coords(i);if(this.fuel[i]&&polyDistance(x,z,SCARS[id]).d<width/2)this.markBurnt(i);}}
 extinguish(){for(const i of this.active)this.markBurnt(i);}
 regrow(){for(const i of this.scorched){this.state[i]=3;this.onChange?.(i,3);}}
 reset(){this.active.clear();this.scorched.clear();this.state.fill(0);this.burnEnd.fill(0);this.burntAt.fill(0);this.totalBurnt=0;this.time=0;this.clock=0;this.onChange?.(-1,0);}
 save(){return {state:rle(this.state),time:this.time,active:[...this.active].map(i=>[i,this.burnEnd[i]]),scorched:[...this.scorched].map(i=>[i,this.burntAt[i]]),total:this.totalBurnt,rng:this.rng.state};}
 load(s){unrle(s.state,this.state);this.time=s.time;this.totalBurnt=s.total;this.active=new Set();this.scorched=new Set();for(const [i,t] of s.active){this.active.add(i);this.burnEnd[i]=t;}for(const [i,t] of s.scorched){this.scorched.add(i);this.burntAt[i]=t;}this.rng.state=s.rng;this.onChange?.(-1,0);}
 counts(){return {burning:this.active.size,burnt:this.totalBurnt,regrowing:[...this.scorched].filter(i=>this.state[i]===3).length};}
}
