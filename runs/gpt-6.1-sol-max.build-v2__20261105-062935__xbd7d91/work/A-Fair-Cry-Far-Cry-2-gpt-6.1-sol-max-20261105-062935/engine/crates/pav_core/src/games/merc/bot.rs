use glam::{Vec2,Vec3};
use crate::{InputFrame,Sim,input::buttons as b};
use super::{*,act,data::{distance,toward}};
fn angle_diff(a:f32,b:f32)->f32{(a-b+std::f32::consts::PI).rem_euclid(std::f32::consts::TAU)-std::f32::consts::PI}
impl Merc{
 pub fn bot_input(&self,sim:&Sim)->InputFrame{let mut i=InputFrame::default();if self.screen=="title"{i.act=act::START;return i;}if self.screen=="ending_choice"{i.act=act::BURN+(self.seed%3) as u32;return i;}if self.screen=="contract"{i.act=act::CONFIRM;return i;}if self.screen=="death"{return i;}if self.screen=="shop"{i.act=act::BUY+2;return i;}if self.screen=="safehouse"&&self.current_goal().is_some_and(|g|g.kind=="night"){i.act=act::SELECT;return i;}if self.screen=="sleep"{i.act=act::SELECT+3;return i;}if self.screen=="companion"{i.act=if self.seed%3==0{act::PATCH}else{act::OVERDOSE};return i;}if self.screen=="evacuate"{i.act=act::CONFIRM;return i;}if self.screen!="playing"&&self.screen!="ending_defend"{i.act=act::BACK;return i;}
 if self.action.is_some(){return i;}if self.health<55.&&self.rescue_time<=0.{i.act=act::HEAL;return i;}if self.fever_state>0&&self.pills>0 {i.act=act::PILL;return i;}if self.rescue_time>0.{return i;}
 if self.guns[self.active].jammed||self.guns[self.active].ammo==0&&self.guns[self.active].reserve>0{i.act=act::RELOAD;return i;}
 if self.guns[self.active].broken||self.guns[self.active].ammo==0&&self.guns[self.active].reserve==0{i.act=act::NEXT_GUN;return i;}
 let enemy=self.soldiers.iter().enumerate().filter(|(_,n)|n.hp>0.&&distance(n.pos,self.pos)<75.).filter(|(_,n)|!crate::projectile::static_blocked(&sim.state.physics,self.eye_pos(),(n.pos+Vec3::Y*1.56-self.eye_pos()).normalize_or_zero(),(n.pos+Vec3::Y*1.56-self.eye_pos()).length(),None)).min_by(|a,b|distance(a.1.pos,self.pos).total_cmp(&distance(b.1.pos,self.pos)));
 if let Some((_,n))=enemy{if self.contract>0&&!self.safe_town(){if self.riding.is_some(){i.act=act::INTERACT;return i;}if self.map_up{i.act=act::MAP;return i;}let d=(n.pos+Vec3::Y*1.55-self.eye_pos()).normalize();i.look=Vec2::new(angle_diff(d.x.atan2(-d.z),self.yaw),self.pitch-d.y.asin());i.held=b::SECONDARY|b::PRIMARY;i.move_dir=Vec2::new((self.time*1.8).sin(),(self.time*1.8).cos())*0.28;if self.monocular{i.act=act::MONOCULAR;}if self.guns[self.active].def==11||self.guns[self.active].def==12{ i.act=act::NEXT_GUN;}return i;}}
 let goal=self.current_goal();if self.ending==2 {i.move_dir=Vec2::new((self.time*0.8).sin(),(self.time*0.8).cos())*0.4;return i;}if self.ending>0{return i;}let Some(goal)=goal else{return i;};let mut target=self.data.place(&goal.place).pos();let dist=distance(target,self.pos);
 if ["clear","claim","convoy"].contains(&goal.kind.as_str()){let group=self.data.world.place.iter().position(|p|p.id==goal.place).unwrap();if let Some(n)=self.soldiers.iter().filter(|n|n.group==group&&n.hp>0.).min_by(|a,b|distance(a.pos,self.pos).total_cmp(&distance(b.pos,self.pos))){target=n.pos;}}

 if goal.kind=="pills"{if !self.coverage.contains("map_raised"){i.act=act::MAP;return i;}i.act=act::PILL;return i;}
 if goal.kind=="claim"&&dist<26.{i.act=act::INTERACT;return i;}
 if goal.kind=="shop"&&dist<70.{i.act=act::BUY+2;return i;}
 if goal.kind=="night"{if dist<25.{i.act=act::INTERACT;return i;}}
 if goal.kind=="tag"{if let Some(n)=self.soldiers.iter().find(|n|n.target&&n.hp>0.){if distance(n.pos,self.pos)<180.{let d=(n.pos+Vec3::Y*1.4-self.eye_pos()).normalize();i.look=Vec2::new(angle_diff(d.x.atan2(-d.z),self.yaw),self.pitch-d.y.asin());if !self.monocular{i.act=act::MONOCULAR;}return i;}}}
 if goal.kind=="tanks" {if let Some(o)=self.objects.iter().find(|o|o.place==goal.place&&o.kind==1&&!o.exploded){target=o.pos;if distance(target,self.pos)<60.{if self.riding.is_some(){i.act=act::INTERACT;return i;}if self.map_up{i.act=act::MAP;return i;}let d=(target+Vec3::Y*1.5-self.eye_pos()).normalize();i.look=Vec2::new(angle_diff(d.x.atan2(-d.z),self.yaw),self.pitch-d.y.asin());i.held=b::PRIMARY|b::SECONDARY;if self.active!=2{i.act=act::NEXT_GUN;}return i;}}}
 if goal.kind=="companion"{if let Some(c)=self.companions.iter().find(|c|c.alive&&c.down>0.){target=c.pos;if distance(target,self.pos)<5.{i.act=if self.seed%3==0{act::PATCH}else{act::OVERDOSE};return i;}}}
 if ["sabotage","cargo","deliver","convoy","manifest","evacuate","ledger"].contains(&goal.kind.as_str())&&dist<25.{if self.riding.is_some(){i.act=act::INTERACT;return i;}i.act=act::INTERACT;return i;}
 if self.screen=="safehouse"&&goal.kind=="night"{i.act=act::SELECT;return i;}
 let rz=terrain::river_z(&self.data,self.pos.x);let target_rz=terrain::river_z(&self.data,target.x);if (self.pos.z-rz).signum()!=(target.z-target_rz).signum() {let before=Vec3::new(40.,0.,if self.pos.z>rz{145.}else{-45.});let after=Vec3::new(40.,0.,if self.pos.z>rz{-45.}else{145.});if distance(self.pos,before)>12.&&(self.pos.x-40.).abs()>6.{target=before;}else{target=after;}}
 let dir=toward(self.pos,target);if let Some(vi)=self.riding {let v=&self.vehicles[vi];let err=angle_diff(dir.x.atan2(-dir.y),v.yaw);i.move_dir=Vec2::new((err*2.).clamp(-1.,1.),0.);i.axes=Vec2::new(if err.abs()>1.{0.25}else{1.},0.);if distance(self.pos,target)<18.{i.act=act::INTERACT;}return i;}
 i.move_dir=dir;i.held=b::SPRINT;let desired=dir.x.atan2(-dir.y);i.look=Vec2::new(angle_diff(desired,self.yaw),self.pitch);if self.map_up&&self.coverage.contains("map_raised"){i.act=act::MAP;}if self.time<2.&&!self.map_up{i.act=act::MAP;}i
 }
}
