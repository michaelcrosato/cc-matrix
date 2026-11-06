use std::{collections::BTreeMap, sync::{Arc, OnceLock}};
use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};
use crate::params::{ParamVisitor, Tunable};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WeaponDef { pub id:String, pub slot:usize, pub name:String, pub mag:i32, pub reserve:i32, pub rpm:f32, pub damage:f32, pub range:f32, pub wear:f32, pub noise:f32, pub igniter:u8 }
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Place { pub id:String, pub name:String, pub x:f32, pub z:f32, pub kind:u8 }
impl Place {pub fn pos(&self)->Vec3 {Vec3::new(self.x,0.,self.z)} }
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GoalDef {pub kind:String,pub place:String,pub value:f32}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Contract {pub id:String,pub name:String,pub giver:String,pub brief:String,pub pay:i32,pub index:usize,pub goal:Vec<GoalDef>}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Tape {pub place:String,pub name:String,pub lines:Vec<String>}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Segment {pub name:String,pub seconds:f32,pub place:String,pub hour:f32,pub action:String}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct World {pub size:f32,pub river:Vec<[f32;2]>,pub roads:Vec<[usize;2]>,pub place:Vec<Place>}
#[derive(Clone, Debug, Serialize, Deserialize)] pub struct AboutPage {pub title:String,pub lines:Vec<String>}
#[derive(Clone, Debug)]
pub struct Data {pub strings:BTreeMap<String,String>,pub weapons:Vec<WeaponDef>,pub world:World,pub contracts:Vec<Contract>,pub tapes:Vec<Tape>,pub attract:Vec<Segment>,pub about:Vec<AboutPage>}
macro_rules! read {($name:literal)=>{{let baked=include_str!(concat!("../../../../../game/merc/",$name));#[cfg(not(target_arch="wasm32"))] let text=std::fs::read_to_string(concat!("game/merc/",$name)).unwrap_or_else(|_|baked.into());#[cfg(target_arch="wasm32")] let text=baked.to_string();text}};}
pub fn data()->Arc<Data>{static D:OnceLock<Arc<Data>>=OnceLock::new();D.get_or_init(||{
 #[derive(Deserialize)]struct W{weapon:Vec<WeaponDef>}
 #[derive(Deserialize)]struct C{contract:Vec<Contract>}
 #[derive(Deserialize)]struct T{tape:Vec<Tape>}
 #[derive(Deserialize)]struct P{page:Vec<AboutPage>}
 #[derive(Deserialize)]struct A{segment:Vec<Segment>}
 Arc::new(Data{strings:toml::from_str(&read!("strings.toml")).expect("strings"),weapons:toml::from_str::<W>(&read!("weapons.toml")).expect("weapons").weapon,world:toml::from_str(&read!("world.toml")).expect("world"),contracts:toml::from_str::<C>(&read!("contracts.toml")).expect("contracts").contract,tapes:toml::from_str::<T>(&read!("tapes.toml")).expect("tapes").tape,attract:toml::from_str::<A>(&read!("attract.toml")).expect("attract").segment,about:toml::from_str::<P>(&read!("about.toml")).expect("about").page})}).clone()}
impl Data {pub fn s<'a>(&'a self,k:&'a str)->&'a str{self.strings.get(k).map(String::as_str).unwrap_or(k)} pub fn place(&self,k:&str)->&Place{self.world.place.iter().find(|p|p.id==k).expect("known place")}}

#[derive(Clone,Debug,PartialEq,Serialize,Deserialize)]
#[serde(default)]
pub struct Tuning {pub enemy_accuracy:f32,pub enemy_damage:f32,pub player_damage:f32,pub detection:f32,pub enemy_count:f32,pub wear:f32,pub jam:f32,pub break_threshold:f32,pub spread_rate:f32,pub burn_time:f32,pub wind_strength:f32,pub burn_damage:f32,pub fever_interval:f32,pub fever_severity:f32,pub syrette_heal:f32,pub rescue_window:f32,pub vehicle_speed:f32,pub vehicle_toughness:f32,pub contract_pay:f32,pub reman_hours:f32,pub player_speed:f32,pub clock_speed:f32,pub time_scale:f32}
impl Default for Tuning {fn default()->Self{Self{enemy_accuracy:0.28,enemy_damage:1.,player_damage:1.,detection:1.,enemy_count:1.,wear:1.,jam:1.,break_threshold:8.,spread_rate:0.16,burn_time:8.,wind_strength:1.,burn_damage:20.,fever_interval:900.,fever_severity:1.,syrette_heal:60.,rescue_window:45.,vehicle_speed:1.,vehicle_toughness:1.,contract_pay:1.,reman_hours:24.,player_speed:1.,clock_speed:1.,time_scale:1.}}}
impl Tunable for Tuning {fn visit(&mut self,v:&mut dyn ParamVisitor){
 macro_rules! f {($n:ident,$min:expr,$max:expr,$h:literal)=>{v.float(stringify!($n),&mut self.$n,$min,$max,$h);};}
 f!(enemy_accuracy,0.,1.,"Enemy accuracy");f!(enemy_damage,0.,4.,"Enemy damage");f!(player_damage,0.1,5.,"Player damage");f!(detection,0.05,5.,"Detection rate");f!(enemy_count,0.5,2.,"Enemy count");f!(wear,0.,5.,"Weapon wear");f!(jam,0.,5.,"Jam chance");f!(break_threshold,0.,25.,"Weapon break threshold");f!(spread_rate,0.,2.,"Fire spread rate");f!(burn_time,2.,40.,"Grass burn seconds");f!(wind_strength,0.,3.,"Wind strength");f!(burn_damage,0.,60.,"Burn damage per second");f!(fever_interval,60.,1800.,"Fever interval");f!(fever_severity,0.,2.,"Fever severity");f!(syrette_heal,20.,100.,"Syrette healing");f!(rescue_window,10.,120.,"Companion rescue window");f!(vehicle_speed,0.25,3.,"Vehicle speed");f!(vehicle_toughness,0.25,4.,"Vehicle toughness");f!(contract_pay,0.25,3.,"Contract pay");f!(reman_hours,1.,72.,"Post re-man hours");f!(player_speed,0.5,3.,"Player speed");f!(clock_speed,0.1,10.,"Game hours per minute");f!(time_scale,0.1,8.,"Time scale");}}
pub fn flat(p:Vec3)->Vec2{Vec2::new(p.x,p.z)}
pub fn distance(a:Vec3,b:Vec3)->f32{flat(a-b).length()}
pub fn toward(a:Vec3,b:Vec3)->Vec2{flat(b-a).normalize_or_zero()}
