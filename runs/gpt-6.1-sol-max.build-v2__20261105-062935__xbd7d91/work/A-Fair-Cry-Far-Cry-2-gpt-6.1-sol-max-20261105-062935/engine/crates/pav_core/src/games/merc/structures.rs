//! Compound solids mirror the authored open-front assets, so bullets and movement agree.
use crate::Sim;
use glam::Vec3;
use super::{Merc,terrain};
pub fn build(sim:&mut Sim,g:&Merc){for p in &g.data.world.place{let h=terrain::height(&g.data,p.x,p.z);let x=p.x-13.;let z=p.z-5.;let scale=if p.kind==9{2.8}else{1.};let w=if matches!(p.kind,2|5|9){10.}else{7.}*scale;let depth=if p.kind==9{8.5}else{6.}*scale;
 let mut wall=|cx:f32,cy:f32,cz:f32,sx:f32,sy:f32,sz:f32|{sim.state.physics.insert_static(rapier::prelude::ColliderBuilder::cuboid(sx*0.5,sy*0.5,sz*0.5).translation(Vec3::new(cx,cy,cz)));};
 for (cx,cz,sx,sz) in [(x,z-depth*0.5,w,0.25),(x-w*0.5,z,0.25,depth),(x+w*0.5,z,0.25,depth),(x-w*0.35,z+depth*0.5,w*0.3,0.25),(x+w*0.35,z+depth*0.5,w*0.3,0.25)]{wall(cx,h+1.6*scale,cz,sx,3.2*scale,sz);}
 wall(x,h+3.35*scale,z,w+1.,0.2,depth+0.8);
 if p.id=="bridge"{wall(40.,3.5,40.,12.,1.,210.);}
}}
