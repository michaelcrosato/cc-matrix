use std::collections::BTreeMap;
use glam::Vec2;
use serde::{Serialize,Deserialize};
use crate::rng::Rng;
use super::{data::{Data,Tuning},terrain};
#[derive(Clone,Debug,Serialize,Deserialize)]pub struct Cell{pub state:u8,pub time:f32}
#[derive(Clone,Debug,Default,Serialize,Deserialize)]pub struct Fire {#[serde(with="cells_json")]pub cells:BTreeMap<(i32,i32),Cell>,pub accum:f32,pub total:u32,pub version:u32,#[serde(with="cuts_json")]pub cut:BTreeMap<(i32,i32),f32>}
impl Fire {
 pub fn key(p:Vec2)->(i32,i32){((p.x/2.).floor() as i32,(p.y/2.).floor() as i32)}
 pub fn at(&self,p:Vec2)->u8{self.cells.get(&Self::key(p)).map_or(0,|c|c.state)}
 pub fn ignite(&mut self,d:&Data,p:Vec2,r:f32){let (x,z)=Self::key(p);let n=(r/2.).ceil() as i32;for dz in -n..=n{for dx in -n..=n{if (dx*dx+dz*dz) as f32>(r/2.).powi(2)+0.5{continue;}self.light(d,(x+dx,z+dz));}}}
 fn light(&mut self,d:&Data,k:(i32,i32)){if terrain::fuel(d,k.0,k.1)>0.&& !self.cells.contains_key(&k)&& !self.cut.contains_key(&k){self.cells.insert(k,Cell{state:1,time:0.});self.total+=1;self.version+=1;}}
 pub fn step(&mut self,d:&Data,rng:&mut Rng,t:&Tuning,wind:Vec2,speed:f32,rain:bool,dt:f32){self.accum+=dt;if self.accum<0.25{return;}let dt=self.accum;self.accum=0.;if rain{for c in self.cells.values_mut(){if c.state==1{c.state=2;c.time=0.;}}self.version+=1;return;}let mut ignite=Vec::new();let mut expired=Vec::new();for (&(x,z),c) in &mut self.cells{c.time+=dt;if c.state==2{if c.time>2880.{expired.push((x,z));}continue;}if c.time>t.burn_time*(0.8+terrain::hash(x,z,3)*0.4){c.state=2;c.time=0.;self.version+=1;continue;}for dz in -1..=1{for dx in -1..=1{if dx==0&&dz==0{continue;}let dir=Vec2::new(dx as f32,dz as f32).normalize();let factor=(0.24*dir.dot(wind)*speed*t.wind_strength).exp();let slope=(terrain::height(d,(x+dx) as f32*2.,(z+dz) as f32*2.)-terrain::height(d,x as f32*2.,z as f32*2.)).clamp(-2.,2.);let chance=t.spread_rate*factor*(1.+slope*0.12)*dt/(dx*dx+dz*dz) as f32;if rng.f32()<chance{ignite.push((x+dx,z+dz));}}}if speed>8.&&rng.f32()<0.015{let n=rng.range(3.,7.);ignite.push((x+(wind.x*n).round() as i32,z+(wind.y*n).round() as i32));}}for k in expired{self.cells.remove(&k);self.version+=1;}for k in ignite{self.light(d,k);}self.cut.retain(|_,time|{*time+=dt;*time<2880.});}
 pub fn burning(&self)->usize{self.cells.values().filter(|c|c.state==1).count()}
 pub fn smoke(&self,a:Vec2,b:Vec2)->bool{let dist=a.distance(b);let n=(dist/3.).ceil().max(1.) as usize;(0..=n).filter(|i|self.at(a.lerp(b,*i as f32/n as f32))==1).count()>3}
}

mod cells_json{use super::*;pub fn serialize<S:serde::Serializer>(v:&BTreeMap<(i32,i32),Cell>,s:S)->Result<S::Ok,S::Error>{v.iter().collect::<Vec<_>>().serialize(s)}pub fn deserialize<'de,D:serde::Deserializer<'de>>(d:D)->Result<BTreeMap<(i32,i32),Cell>,D::Error>{Ok(Vec::<((i32,i32),Cell)>::deserialize(d)?.into_iter().collect())}}
mod cuts_json{use super::*;pub fn serialize<S:serde::Serializer>(v:&BTreeMap<(i32,i32),f32>,s:S)->Result<S::Ok,S::Error>{v.iter().collect::<Vec<_>>().serialize(s)}pub fn deserialize<'de,D:serde::Deserializer<'de>>(d:D)->Result<BTreeMap<(i32,i32),f32>,D::Error>{Ok(Vec::<((i32,i32),f32)>::deserialize(d)?.into_iter().collect())}}
