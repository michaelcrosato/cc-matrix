use serde::{Serialize,Deserialize};
use super::data::WeaponDef;
#[derive(Clone,Debug,Serialize,Deserialize)]pub struct Gun{pub def:usize,pub ammo:i32,pub reserve:i32,pub condition:f32,pub jammed:bool,pub broken:bool,pub cooldown:f32}
impl Gun{pub fn new(i:usize,d:&WeaponDef,c:f32)->Self{Self{def:i,ammo:d.mag,reserve:d.reserve,condition:c,jammed:false,broken:false,cooldown:0.}}pub fn word(&self)->&'static str{match self.condition as i32{71..=100=>"New",51..=70=>"Used",31..=50=>"Worn",9..=30=>"Rusted",_=>"Dying"}}}
pub fn jam_chance(c:f32)->f32 {if c>=70.{0.}else{0.22*((70.-c)/70.).powi(2)}}
pub fn zone(mult:f32,damage:f32)->f32{damage*mult}
