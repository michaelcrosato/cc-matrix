import {rng,dist} from '../core/rng.js';
import {PLACES} from './world.js';
import {heightAt,roadDistance,riverDistance} from '../sim/terrain.js';
let cache;
export function scatter(){if(cache)return cache;const random=rng(1414),trees=[],rocks=[];for(let i=0;i<1500;i++){const x=random()*2020-1010,z=random()*2020-1010;if(riverDistance(x,z)<33||roadDistance(x,z)<10||PLACES.some(p=>dist(p,{x,z})<(p.kind==='town'?65:22))||Math.hypot(x-760,z+430)<170)continue;trees.push({x,z,s:1+random()*1.1,yaw:random()*6.28});}for(let i=0;i<800;i++){const x=random()*2048-1024,z=random()*2048-1024;if(riverDistance(x,z)>28&&roadDistance(x,z)>7)rocks.push({x,z,s:.7+random()*2.2,yaw:random()*6.28});}cache={trees,rocks};return cache;}
