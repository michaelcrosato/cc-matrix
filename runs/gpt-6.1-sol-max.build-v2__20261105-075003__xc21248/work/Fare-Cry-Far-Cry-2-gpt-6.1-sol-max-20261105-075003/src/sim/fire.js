import {fuelAt,heightAt} from './terrain.js';
import {hash} from '../core/rng.js';
export class Fire {
 constructor(tunables,seed=14,uniformFuel=false){this.t=tunables;this.seed=seed;this.fuel=new Uint8Array(512*512);this.state=new Uint8Array(512*512);this.age=new Float32Array(512*512);this.burnedAt=new Float32Array(512*512);this.active=new Set;this.burnt=new Set;this.changes=[];this.elapsed=0;this.uniformFuel=uniformFuel;this.initialized=false;}
 init(){if(this.initialized)return;for(let z=0;z<512;z++)for(let x=0;x<512;x++)this.fuel[z*512+x]=this.uniformFuel?1:fuelAt(x*4-1022,z*4-1022);this.initialized=true;}
 index(x,z){return Math.floor((z+1024)/4)*512+Math.floor((x+1024)/4);}
 pos(i){return {x:(i%512)*4-1022,z:Math.floor(i/512)*4-1022};}
 ignite(x,z,r=2){this.init();const c=this.index(x,z),cx=c%512,cz=Math.floor(c/512);let count=0;for(let dz=-Math.ceil(r/4);dz<=Math.ceil(r/4);dz++)for(let dx=-Math.ceil(r/4);dx<=Math.ceil(r/4);dx++){if(Math.hypot(dx,dz)*4>r+2)continue;const ix=cx+dx,iz=cz+dz;if(ix<0||ix>511||iz<0||iz>511)continue;const i=iz*512+ix;if(this.fuel[i]&&this.state[i]===0){this.state[i]=1;this.age[i]=0;this.active.add(i);this.changes.push([i,1]);count++;}}return count;}
 tick(dt,wind,day=0){this.elapsed+=dt;const add=[];let embers=0;for(const i of this.active){this.age[i]+=dt;const age=this.age[i],x=i%512,z=(i/512)|0;const duration=(this.fuel[i]===3?40:this.fuel[i]===2?14:9)*this.t.burnTime;
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const nx=x+dx,nz=z+dz;if(nx<0||nx>511||nz<0||nz>511)continue;const n=nz*512+nx;if(this.state[n]||!this.fuel[n])continue;const len=Math.hypot(dx,dz),dot=(dx*Math.cos(wind.angle)+dz*Math.sin(wind.angle))/len;const speed=wind.speed<.2?.58:dot<-.05?this.t.upwind:.58+Math.max(0,dot)*wind.speed*.48*this.t.windK;const jitter=.9+(hash(i+':'+n+':'+this.seed)%100)/500;const threshold=4*len/(Math.max(.001,speed)*this.t.spread)*jitter;if(age>=threshold&&age-dt<threshold)add.push(n);}
  if(this.fuel[i]===3&&wind.speed>5&&Math.floor((age+6)/8)>Math.floor((age-dt+6)/8)&&(hash(i+':'+Math.floor(age))%100)/100<this.t.embers){const p=this.pos(i);const d=12+hash(i+age)%18;embers+=this.ignite(p.x+Math.cos(wind.angle)*d,p.z+Math.sin(wind.angle)*d,2);}
  if(age>=duration){this.state[i]=2;this.burnedAt[i]=day;this.active.delete(i);this.burnt.add(i);this.changes.push([i,2]);}}
  for(const i of add)if(this.state[i]===0){this.state[i]=1;this.active.add(i);this.changes.push([i,1]);}
  return {spread:add.length,embers};
 }
 regrow(day){let count=0;for(const i of this.burnt)if(day-this.burnedAt[i]>=this.t.regrowDays){this.state[i]=0;this.age[i]=0;this.burnt.delete(i);this.changes.push([i,0]);count++;}return count;}
 extinguish(){for(const i of this.active){this.state[i]=2;this.burnt.add(i);this.changes.push([i,2]);}this.active.clear();}
 clear(){for(const i of [...this.active,...this.burnt]){this.state[i]=0;this.age[i]=0;this.changes.push([i,0]);}this.active.clear();this.burnt.clear();}
 near(x,z,r=5){let n=0;for(const i of this.active){const p=this.pos(i);if(Math.hypot(x-p.x,z-p.z)<r)n++;}return n;}
 save(){const runs=[];let last=-2;for(const i of [...this.burnt].sort((a,b)=>a-b)){if(i===last+1)runs[runs.length-1][1]++;else runs.push([i,1,this.burnedAt[i]]);last=i;}return {runs,active:[...this.active].map(i=>[i,this.age[i]])};}
 load(s){this.init();this.clear();for(const [start,n,day] of s.runs||[])for(let j=0;j<n;j++){const i=start+j;this.state[i]=2;this.burnedAt[i]=day;this.burnt.add(i);}for(const [i,age] of s.active||[]){this.state[i]=1;this.age[i]=age;this.active.add(i);} }
}
