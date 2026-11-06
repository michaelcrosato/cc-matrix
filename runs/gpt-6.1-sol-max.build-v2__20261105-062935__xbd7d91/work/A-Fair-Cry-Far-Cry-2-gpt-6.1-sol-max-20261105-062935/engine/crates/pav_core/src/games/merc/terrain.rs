use glam::{Vec2,Vec3};
use crate::{color::Color,terrain::TerrainPatch};
use super::data::{Data,flat};
pub fn hash(x:i32,z:i32,seed:u64)->f32 {let mut h=(x as u64).wrapping_mul(374761393)^(z as u64).wrapping_mul(668265263)^seed;h=(h^(h>>13)).wrapping_mul(1274126177);((h^(h>>16))&65535) as f32/65535.}
pub fn segment(p:Vec2,a:Vec2,b:Vec2)->f32{let d=b-a;(p-a-d*((p-a).dot(d)/d.length_squared().max(0.001)).clamp(0.,1.)).length()}
pub fn river_z(d:&Data,x:f32)->f32{let r=&d.world.river;for w in r.windows(2){if x>=w[0][0]&&x<=w[1][0]{let t=(x-w[0][0])/(w[1][0]-w[0][0]);return w[0][1]+(w[1][1]-w[0][1])*t;}}180.}
pub fn water(d:&Data,p:Vec2)->bool{(p.y-river_z(d,p.x)).abs()<14.&& !((p.x-40.).abs()<7.&&(p.y-40.).abs()<130.)}
pub fn road(d:&Data,p:Vec2)->f32{d.world.roads.iter().map(|r|segment(p,flat(d.world.place[r[0]].pos()),flat(d.world.place[r[1]].pos()))).fold(f32::MAX,f32::min)}
fn base(x:f32,z:f32)->f32{3.+(x*0.008).sin()*3.+(z*0.011).cos()*2.+((x+z)*0.019).sin()*1.2+32.*(-((x-600.).powi(2)+(z+620.).powi(2))/180000.).exp()}
pub fn height(d:&Data,x:f32,z:f32)->f32{let p=Vec2::new(x,z);let mut h=base(x,z);let rz=river_z(d,x);let rd=(z-rz).abs();if rd<28.{h=h.min(-2.+(rd/28.).powi(2)*8.);}if (x-40.).abs()<7.&&(z-40.).abs()<130.{h=4.;}for q in &d.world.place{let dist=p.distance(Vec2::new(q.x,q.z));if dist<45.{let t=((dist-24.)/21.).clamp(0.,1.);h=base(q.x,q.z)+(h-base(q.x,q.z))*t;}}h}
pub fn fuel(d:&Data,x:i32,z:i32)->f32{let p=Vec2::new(x as f32*2.+1.,z as f32*2.+1.);if water(d,p)||road(d,p)<3.3||p.abs().max_element()>1020.{0.}else{1.+hash(x,z,4)*0.4}}
pub fn grass(d:&Data,p:Vec2)->f32{if road(d,p)<4.||water(d,p){0.}else{0.55+0.45*(p.x*0.07+p.y*0.03).sin().abs()}}
pub fn color(d:&Data,x:f32,z:f32)->Color{let p=Vec2::new(x,z);if road(d,p)<3.8{Color::hex("#a4552f")}else if (z-river_z(d,x)).abs()<35.{Color::hex("#6e7840")}else {let c=Color::hex("#b99b58");let b=0.84+hash(x as i32/3,z as i32/3,17)*0.3;Color([c.0[0]*b,c.0[1]*b,c.0[2]*b])}}
pub fn patch(d:&Data,cx:i32,cz:i32,step:usize)->TerrainPatch{let mut m=TerrainPatch::default();m.cx=cx;m.cz=cz;m.min=Vec3::new(cx as f32*32.,-10.,cz as f32*32.);m.max=m.min+Vec3::new(32.,80.,32.);let n=32/step;for z in 0..=n{for x in 0..=n{let wx=cx as f32*32.+(x*step) as f32;let wz=cz as f32*32.+(z*step) as f32;let h=height(d,wx,wz);m.positions.push([wx,h,wz]);let normal=Vec3::new(height(d,wx-0.5,wz)-height(d,wx+0.5,wz),1.,height(d,wx,wz-0.5)-height(d,wx,wz+0.5)).normalize();m.normals.push(normal.to_array());m.colors.push(color(d,wx,wz).0);}}for z in 0..n{for x in 0..n{let i=(z*(n+1)+x) as u32;let row=(n+1) as u32;m.indices.extend([i,i+row,i+1,i+1,i+row,i+row+1]);}}m}
