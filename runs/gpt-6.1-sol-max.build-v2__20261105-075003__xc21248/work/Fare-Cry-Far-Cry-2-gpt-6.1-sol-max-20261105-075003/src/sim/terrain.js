import {PLACES,ROADS,RIVER} from '../data/world.js';
import {clamp,smooth,lerp} from '../core/rng.js';
export function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
export function pathDistance(x,z,path){let d=1e9;for(let i=1;i<path.length;i++)d=Math.min(d,segmentDistance(x,z,path[i-1],path[i]));return d;}
export const riverDistance=(x,z)=>pathDistance(x,z,RIVER);
export const roadDistance=(x,z)=>Math.min(...ROADS.map(r=>pathDistance(x,z,r)));
const rolling=(x,z)=>Math.sin(x*.009)*3+Math.cos(z*.013)*2.4+Math.sin(x*.021+z*.017)*1.8;
function land(x,z){const esc=1-smooth(-60,90,z+700+(x+300)*.315);let h=rolling(x,z)+esc*80;const r=Math.hypot(x-760,z+430);if(r<185)h-=Math.floor((1-r/185)*5)*8;return h;}
export function heightAt(x,z){let h=land(x,z);for(const p of PLACES){const r=Math.hypot(x-p.x,z-p.z);const radius=p.kind==='town'?42:p.kind==='pit'?0:15;if(r<radius+16&&radius)h=lerp(land(p.x,p.z),h,smooth(radius,radius+16,r));}const rd=roadDistance(x,z);if(rd<10)h=lerp(Math.round(h*.5)*2,h,smooth(3.5,10,rd));const d=riverDistance(x,z);if(d<43)h=lerp(-5.5,h,smooth(13,43,d));return h;}
export function bakeHeights(n=1024){const heights=new Float32Array((n+1)**2);for(let c=0;c<=n;c++)for(let r=0;r<=n;r++)heights[c*(n+1)+r]=heightAt(c/n*2048-1024,r/n*2048-1024);return heights;}
export function surfaceHeight(x,z){const dx=x-130,dz=z-60,u=dx*.864+dz*.504,v=-dx*.504+dz*.864;if(Math.abs(u)<64&&Math.abs(v)<5){const deck=4.3;return lerp(deck,heightAt(x,z),smooth(49,64,Math.abs(u)));}return heightAt(x,z);}
export function fuelAt(x,z){if(riverDistance(x,z)<22||roadDistance(x,z)<4||heightAt(x,z)>60)return 0;const d=Math.hypot(x-760,z+430);if(d<165)return 0;if(Math.sin(x*.083+z*.037)>.985)return 3;return x>130&&z>80?1:Math.sin(x*.1+z*.03)>.5?2:1;}
