//! A deterministic first-person survival game. World rules stay independent of the shell.
pub mod data;
pub mod terrain;
pub mod fire;
pub mod weapons;
pub mod ai;
pub mod campaign;
pub mod actions;
pub mod menus;
pub mod net;
pub mod bot;
pub mod structures;
use std::{collections::{BTreeMap,BTreeSet},sync::Arc};
use glam::{Vec2,Vec3};
use serde::{Serialize,Deserialize};
use serde_json::json;
use crate::{Sim,InputFrame,SimEvent,entity::EntityId,games::{Game,GameBox,Outcome},input::buttons as b};
use data::{Data,Tuning,data,distance,flat};
use weapons::Gun;

pub mod act {pub const UP:u32=1;pub const DOWN:u32=2;pub const LEFT:u32=3;pub const RIGHT:u32=4;pub const CONFIRM:u32=5;pub const BACK:u32=6;pub const PREV:u32=7;pub const NEXT:u32=8;pub const PAUSE:u32=9;pub const ACTIVITY:u32=10;pub const START:u32=11;pub const INTERACT:u32=12;pub const PILL:u32=13;pub const HEAL:u32=14;pub const RELOAD:u32=15;pub const MAP:u32=16;pub const MONOCULAR:u32=17;pub const TRACKER:u32=18;pub const NEXT_GUN:u32=19;pub const THROW:u32=20;pub const MELEE:u32=21;pub const CROUCH:u32=22;pub const PRONE:u32=23;pub const CARD:u32=24;pub const SEAT:u32=25;pub const CAMERA:u32=26;pub const PATCH:u32=27;pub const OVERDOSE:u32=28;pub const WAYPOINT:u32=29;pub const BURN:u32=30;pub const READ:u32=31;pub const CHAIR:u32=32;pub const SELECT:u32=1000;pub const WAYPLACE:u32=2000;pub const BUY:u32=3000;pub const GIVE:u32=4000;pub const TELEPORT:u32=5000;pub const STORY:u32=6000;pub const SLIDER:u32=0x10000000;}
#[derive(Clone,Debug,Serialize,Deserialize)]#[serde(default)]pub struct Settings{pub master:f32,pub music:f32,pub sfx:f32,pub voices:f32,pub xbox:bool,pub invert:bool,pub stick:f32,pub mouse:f32,pub aim_assist:bool,pub toggle_crouch:bool,pub fov:f32,pub brightness:f32,pub bob:f32,pub subtitles:f32,pub motion:f32,pub markers:bool,pub standard:bool,pub fullscreen:bool}
impl Default for Settings{fn default()->Self{Self{master:0.8,music:0.10,sfx:1.,voices:1.,xbox:false,invert:false,stick:140.,mouse:0.12,aim_assist:true,toggle_crouch:true,fov:75.,brightness:1.,bob:0.4,subtitles:1.,motion:0.35,markers:true,standard:false,fullscreen:false}}}
#[derive(Clone,Debug,Default,Serialize,Deserialize)]pub struct Cheats{pub god:bool,pub ammo:bool,pub jams:bool,pub fever:bool,pub noclip:bool,pub invisible:bool,pub ai:bool,pub fire:bool,pub nav:bool,pub stats:bool}
#[derive(Clone,Debug,Serialize,Deserialize)]pub struct Soldier{pub pos:Vec3,pub home:Vec3,pub yaw:f32,pub hp:f32,pub role:u8,pub faction:u8,pub group:usize,pub detection:f32,pub state:u8,pub timer:f32,pub cooldown:f32,pub gun:Gun,pub entity:Option<EntityId>,pub tagged:bool,pub poison:f32,pub burning:f32,pub target:bool}
#[derive(Clone,Debug,Serialize,Deserialize)]pub struct Object{pub pos:Vec3,pub kind:u8,pub hp:f32,pub fuse:f32,pub exploded:bool,pub place:String}
#[derive(Clone,Debug,Serialize,Deserialize)]pub struct Vehicle{pub pos:Vec3,pub yaw:f32,pub pitch:f32,pub roll:f32,pub speed:f32,pub steer:f32,pub hp:f32,pub kind:u8,pub fuse:f32,pub exploded:bool,pub npc:bool,pub path:usize}
#[derive(Clone,Debug,Serialize,Deserialize)]pub struct Companion{pub merc:usize,pub alive:bool,pub recruited:bool,pub trust:i32,pub rescue:bool,pub down:f32,pub pos:Vec3,pub mortal:bool}
#[derive(Clone,Debug,Serialize,Deserialize)]pub struct Post{pub place:String,pub cleared:bool,pub cleared_at:f32,pub safe:bool,pub claimed:bool}
#[derive(Clone,Debug,Serialize,Deserialize)]pub struct Cache{pub pos:Vec3,pub found:bool,pub value:i32}
#[derive(Clone,Debug,Serialize,Deserialize)]pub struct Wildlife{pub pos:Vec3,pub yaw:f32,pub fleeing:f32,pub kind:u8}
#[derive(Clone,Debug,Serialize,Deserialize)]pub struct Action{pub kind:String,pub left:f32,pub duration:f32,pub param:i32}
#[derive(Clone,Debug,Serialize,Deserialize)]pub struct Trace{pub a:Vec3,pub z:Vec3,pub life:f32,pub hit:bool}
#[derive(Clone,Debug,Serialize,Deserialize)]pub struct Peer{pub id:u8,pub pos:Vec3,pub yaw:f32,pub pitch:f32,pub hp:f32,pub down:f32,pub seat:i32,pub present:bool,pub kills:i32,pub rescues:i32,pub jams:i32}
#[derive(Clone,Debug,Serialize,Deserialize)]pub struct Merc{
 #[serde(skip,default="data")]pub data:Arc<Data>,
 pub tuning:Tuning,pub settings:Settings,pub cheats:Cheats,
 pub screen:String,pub parent:String,pub page:usize,pub focus:usize,pub device:u8,pub touch_only:bool,pub difficulty:u8,pub merc:usize,
 pub pos:Vec3,pub yaw:f32,pub pitch:f32,pub stance:u8,pub eye:f32,pub health:f32,pub stamina:f32,pub speed:f32,pub aiming:bool,pub recoil:f32,pub flash:f32,pub hit_time:f32,pub damage_time:f32,pub view_time:f32,pub ammo_time:f32,pub action:Option<Action>,
 pub guns:Vec<Gun>,pub active:usize,pub owned:BTreeSet<usize>,pub reliability:BTreeSet<usize>,pub accuracy:BTreeSet<usize>,pub upgrades:BTreeSet<usize>,pub syrettes:i32,pub pills:i32,pub molotov:i32,pub grenades:i32,pub throw_frag:bool,pub diamonds:i32,
 pub map_up:bool,pub monocular:bool,pub tracker:bool,pub waypoint:Option<Vec3>,pub map_cursor:Vec2,pub map_zoom:f32,pub tag_timer:f32,pub tag_target:Option<usize>,
 pub hour:f32,pub world_hours:f32,pub wind:Vec2,pub wind_speed:f32,pub weather:u8,pub weather_time:f32,pub wind_timer:f32,pub fire:fire::Fire,
 pub fever_timer:f32,pub fever_state:u8,pub fever_attacks:u32,pub wound:u8,pub burning:f32,pub rescue_time:f32,pub death:bool,
 pub soldiers:Vec<Soldier>,pub objects:Vec<Object>,pub vehicles:Vec<Vehicle>,pub riding:Option<usize>,pub seat:u8,pub chase:bool,pub companions:Vec<Companion>,pub posts:Vec<Post>,pub caches:Vec<Cache>,pub animals:Vec<Wildlife>,
 pub contract:usize,pub goal:usize,pub contract_active:bool,pub complete:BTreeSet<usize>,pub goal_time:f32,pub goal_flag:bool,pub better_way:bool,pub trouble_count:u8,pub infamy:i32,pub ceasefire:bool,pub town_burned:bool,pub saved_person:u8,pub ending:u8,pub ending_time:f32,pub income:[i32;2],pub kills:u32,
 pub tapes:BTreeSet<usize>,pub playing_tape:Option<usize>,pub tape_line:usize,pub tape_timer:f32,pub subtitle:String,pub speaker:String,pub subtitle_time:f32,pub voice_serial:u32,pub sound_serial:u32,pub sound_kind:u8,pub save_serial:u32,pub save_slot:i32,pub load_slot:i32,pub toast:String,pub toast_time:f32,
 pub time:f32,pub idle:f32,pub attracting:bool,pub attract_time:f32,pub attract_segment:usize,pub attract_loops:u32,pub coverage:BTreeSet<String>,pub outcome:Outcome,pub seed:u64,
 pub traces:Vec<Trace>,pub net_actions:Vec<net::Shot>,pub net_ui:i32,pub session:bool,pub host:bool,pub local_id:u8,pub peers:Vec<Peer>,pub round_started:bool,pub round_time:f32,pub team_lives:i32,pub ledger_carrier:i32,pub team_score:i32,pub finished:bool,pub won:bool,
 #[serde(skip)]pub streamed:Option<(i32,i32)>,
 #[serde(skip)]pub attract_backup:Option<Box<Merc>>,
}
impl Merc{
 pub fn new(seed:u64)->Self{let d=data();let pos=Vec3::new(-120.,terrain::height(&d,-120.,900.)+0.1,900.);let mut owned=BTreeSet::new();owned.extend([0,4,11]);let mut g=Self{data:d.clone(),tuning:Tuning::default(),settings:Settings::default(),cheats:Cheats::default(),screen:"title".into(),parent:"title".into(),page:0,focus:0,device:0,touch_only:false,difficulty:1,merc:0,pos,yaw:0.,pitch:0.,stance:0,eye:1.58,health:100.,stamina:12.,speed:0.,aiming:false,recoil:0.,flash:0.,hit_time:0.,damage_time:0.,view_time:0.,ammo_time:0.,action:None,guns:vec![Gun::new(0,&d.weapons[0],85.),Gun::new(4,&d.weapons[4],52.),Gun::new(11,&d.weapons[11],90.)],active:1,owned,reliability:BTreeSet::new(),accuracy:BTreeSet::new(),upgrades:BTreeSet::new(),syrettes:3,pills:3,molotov:4,grenades:4,throw_frag:false,diamonds:6,map_up:false,monocular:false,tracker:false,waypoint:None,map_cursor:Vec2::new(0.,380.),map_zoom:1.,tag_timer:0.,tag_target:None,hour:17.2,world_hours:17.2,wind:Vec2::new(0.82,0.57).normalize(),wind_speed:8.,weather:0,weather_time:240.,wind_timer:200.,fire:fire::Fire::default(),fever_timer:150.,fever_state:0,fever_attacks:0,wound:0,burning:0.,rescue_time:0.,death:false,soldiers:Vec::new(),objects:Vec::new(),vehicles:Vec::new(),riding:None,seat:0,chase:false,companions:(1..4).map(|i|Companion{merc:i,alive:true,recruited:false,trust:0,rescue:false,down:0.,pos:Vec3::ZERO,mortal:false}).collect(),posts:Vec::new(),caches:Vec::new(),animals:Vec::new(),contract:0,goal:0,contract_active:true,complete:BTreeSet::new(),goal_time:0.,goal_flag:false,better_way:false,trouble_count:0,infamy:0,ceasefire:true,town_burned:false,saved_person:0,ending:0,ending_time:0.,income:[0,0],kills:0,tapes:BTreeSet::new(),playing_tape:None,tape_line:0,tape_timer:0.,subtitle:String::new(),speaker:String::new(),subtitle_time:0.,voice_serial:0,sound_serial:0,sound_kind:0,save_serial:0,save_slot:-1,load_slot:-1,toast:String::new(),toast_time:0.,time:0.,idle:0.,attracting:false,attract_time:0.,attract_segment:usize::MAX,attract_loops:0,coverage:BTreeSet::new(),outcome:Outcome::Playing,seed,traces:Vec::new(),net_actions:Vec::new(),net_ui:0,session:false,host:true,local_id:0,peers:Vec::new(),round_started:false,round_time:0.,team_lives:6,ledger_carrier:-1,team_score:0,finished:false,won:false,streamed:None,attract_backup:None};g.populate();g}
 pub fn s<'a>(&'a self,k:&'a str)->&'a str{self.data.s(k)}
 pub fn flag(&mut self,k:&str){self.coverage.insert(k.into());}
 pub fn say(&mut self,speaker:&str,line:impl Into<String>){self.speaker=speaker.into();self.subtitle=line.into();self.subtitle_time=6.;self.voice_serial+=1;}
 pub fn note(&mut self,line:impl Into<String>){self.toast=line.into();self.toast_time=4.;}
 pub fn sound(&mut self,k:u8){self.sound_kind=k;self.sound_serial+=1;}
 pub fn forward(&self)->Vec3{Vec3::new(self.yaw.sin()*self.pitch.cos(),self.pitch.sin(),-self.yaw.cos()*self.pitch.cos())}
 pub fn eye_pos(&self)->Vec3{self.pos+Vec3::Y*self.eye}
 pub fn safe_town(&self)->bool{self.ceasefire&&distance(self.pos,self.data.place("town").pos())<76.}
 pub fn open(&mut self,s:&str){self.screen=s.into();self.focus=0;self.page=0;self.idle=0.;}
 pub fn start(&mut self,merc:usize){self.merc=merc;self.companions=(0..4).filter(|i|*i!=merc).map(|i|Companion{merc:i,alive:true,recruited:false,trust:0,rescue:false,down:0.,pos:self.pos,mortal:false}).collect();self.companions[0].recruited=true;self.screen="playing".into();self.hour=21.;self.world_hours=21.;self.say("Bakker",self.s("prologue").to_string());self.save_serial+=1;}
 fn populate(&mut self){let d=self.data.clone();for (pi,p) in d.world.place.iter().enumerate(){if p.kind==1||p.kind==3||p.kind==6||p.kind==7||p.kind==9||p.kind==10{self.posts.push(Post{place:p.id.clone(),cleared:false,cleared_at:0.,safe:p.kind==3,claimed:false});let n=if p.kind==3{3}else if p.kind>=7{7}else{5};for i in 0..n {let a=i as f32*2.399;let r=9.+(i%3) as f32*5.;let x=p.x+a.cos()*r;let z=p.z+a.sin()*r;let pos=Vec3::new(x,terrain::height(&d,x,z)+0.05,z);self.soldiers.push(Soldier{pos,home:pos,yaw:a,hp:80.,role:(i%5) as u8,faction:(pi%2) as u8,group:pi,detection:0.,state:0,timer:0.,cooldown:1.+i as f32*0.2,gun:Gun::new(4,&d.weapons[4],25.+terrain::hash(i,pi as i32,self.seed)*35.),entity:None,tagged:false,poison:0.,burning:0.,target:p.kind==9&&i==0});}for i in 0..3{let x=p.x-12.+i as f32*12.;let z=p.z-9.;self.objects.push(Object{pos:Vec3::new(x,terrain::height(&d,x,z),z),kind:if p.kind==7{1}else{0},hp:if p.kind==7{150.}else{45.},fuse:-1.,exploded:false,place:p.id.clone()});}}
 if [0,1,2,3,7,9,11,12,14,17].contains(&pi){let x=p.x+14.;let z=p.z+23.;self.vehicles.push(Vehicle{pos:Vec3::new(x,terrain::height(&d,x,z),z),yaw:0.,pitch:0.,roll:0.,speed:0.,steer:0.,hp:100.,kind:if pi==0{2}else if pi%3==0{1}else{0},fuse:-1.,exploded:false,npc:false,path:0});}}
 for i in 0..2{let x=640.+i as f32*160.;let z=terrain::river_z(&d,x);self.vehicles.push(Vehicle{pos:Vec3::new(x,0.2,z),yaw:1.57,pitch:0.,roll:0.,speed:0.,steer:0.,hp:100.,kind:3,fuse:-1.,exploded:false,npc:false,path:0});}
 for i in 0..12 {let p=&d.world.place[(i*7+3)%d.world.place.len()];let x=p.x+22.+(i%3) as f32*8.;let z=p.z+32.;self.caches.push(Cache{pos:Vec3::new(x,terrain::height(&d,x,z),z),found:false,value:1+(i%3) as i32});}
 for i in 0..18{let x=-300.+i as f32*28.;let z=710.-(i%4) as f32*80.;self.animals.push(Wildlife{pos:Vec3::new(x,terrain::height(&d,x,z),z),yaw:i as f32,fleeing:0.,kind:(i%3==0) as u8});}}
 pub fn stream(&mut self,sim:&mut Sim){let c=((self.pos.x/32.).floor() as i32,(self.pos.z/32.).floor() as i32);if self.streamed==Some(c){return;}let keys:Vec<_>=sim.state.statics.chunks.keys().copied().collect();for k in keys{if let crate::statics::RegionKey::Chunk(x,z)=k{if (x-c.0).abs()>3||(z-c.1).abs()>3{sim.state.statics.remove_region(&mut sim.state.physics,k);}}}for dz in -3..=3{for dx in -3..=3{let key=crate::statics::RegionKey::Chunk(c.0+dx,c.1+dz);if !sim.state.statics.chunks.contains_key(&key){let patch=Arc::new(terrain::patch(&self.data,c.0+dx,c.1+dz,1));sim.state.statics.set_terrain(&mut sim.state.physics,key,patch);
 for ix in 0..4 {let x=(c.0+dx) as f32*32.+ix as f32*8.;let rz=terrain::river_z(&self.data,x+4.);let z0=(c.1+dz) as f32*32.;let z1=z0+32.;let lo=(rz-13.).max(z0);let hi=(rz+13.).min(z1);if hi>lo&& !((x-40.).abs()<10.) {let zone:crate::zones::Zone=serde_json::from_value(serde_json::json!({"min":[x,-9.,lo],"max":[x+8.,0.2,hi],"kind":"water","color":crate::color::Color::hex("#3d6a6a")})).unwrap();sim.state.statics.add_zone_to(key,zone);}}
}}}self.streamed=Some(c);}
 pub fn sync_player(&self,sim:&mut Sim){if let Some(id)=sim.state.player{sim.set_position(id,self.pos);}}
}
pub fn build(sim:&mut Sim,rest:Option<&str>)->anyhow::Result<()>{sim.config.history_seconds=0.;sim.config.movement.model=crate::character::MovementModel::Momentum;sim.config.movement.max_speed=4.6;sim.config.movement.gravity=18.;sim.config.movement.jump_height=1.;sim.config.movement.ledge_grab=true;sim.config.movement.crouch_mult=0.55;sim.config.movement.crawl_mult=0.28;let mut g=Merc::new(sim.state.seed);if rest==Some("play"){g.start(0);}if rest==Some("session"){g.session=true;g.screen="card".into();g.pos=g.data.place("depot").pos()+Vec3::new(-65.,0.,70.);g.pos.y=terrain::height(&g.data,g.pos.x,g.pos.z);g.hour=18.;}g.stream(sim);structures::build(sim,&g);sim.state.spawn=g.pos;sim.spawn_player();sim.state.focus=g.pos;sim.state.play=Some(GameBox::new(g));Ok(())}
impl Game for Merc{
 const KEY:&'static str="merc";
 fn pre(&mut self,sim:&mut Sim,input:&InputFrame,dt:f32,events:&mut Vec<SimEvent>)->BTreeMap<EntityId,InputFrame>{self.tuning=sim.config.merc.clone();let mut out=BTreeMap::new();let mut i=*input;self.flash=(self.flash-dt).max(0.);self.recoil*=(-dt*14.).exp();self.hit_time=(self.hit_time-dt).max(0.);self.damage_time=(self.damage_time-dt).max(0.);self.ammo_time=(self.ammo_time-dt).max(0.);self.toast_time=(self.toast_time-dt).max(0.);self.subtitle_time=(self.subtitle_time-dt).max(0.);self.view_time+=dt;for t in &mut self.traces{t.life-=dt;}self.traces.retain(|t|t.life>0.);
 let activity=input.act!=0||input.move_dir.length_squared()>0.01||input.look.length_squared()>0.000001||input.pressed!=0;
 if activity{self.idle=0.;if self.attracting{let requested=input.act;if let Some(backup)=self.attract_backup.take(){let settings=self.settings.clone();*self=*backup;self.settings=settings;}self.attracting=false;self.attract_segment=usize::MAX;self.open("title");self.pos=Vec3::new(-120.,terrain::height(&self.data,-120.,900.),900.);self.sync_player(sim);if requested==act::SELECT+3{self.parent="title".into();self.open("settings");}i=InputFrame::default();}else{self.command(sim,input.act,events);}}
 if self.screen!="playing"&&self.screen!="ending_defend"&&self.screen!="card"&&!self.session {self.idle+=dt;if self.idle>=10.||(self.touch_only&&self.screen=="title"){if !self.attracting{self.attract_backup=Some(Box::new(self.clone()));}self.attracting=true;self.attract(sim,dt,events);}if let Some(id)=sim.state.player{out.insert(id,InputFrame::default());}return out;}
 if self.session&&(!self.round_started||self.finished){if let Some(id)=sim.state.player{out.insert(id,InputFrame::default());}return out;}
 let dt=dt*self.tuning.time_scale;self.time+=dt;self.yaw=(self.yaw+i.look.x).rem_euclid(std::f32::consts::TAU);self.pitch=(self.pitch-i.look.y).clamp(-1.48,1.48);self.aiming=i.down(b::SECONDARY)&&!self.map_up;let h=match self.stance{1=>1.02,2=>0.42,_=>1.58};self.eye+=(h-self.eye)*(dt*12.).min(1.);
 if input.just(b::CROUCH){self.stance=if self.stance==1{0}else{1};}if input.just(b::CRAWL){self.stance=if self.stance==2{0}else{2};}
 for (bit,a) in [(b::RELOAD,act::RELOAD),(b::INTERACT,act::INTERACT),(b::NEXT_GUN,act::NEXT_GUN),(b::THROW,act::THROW),(b::MELEE,act::MELEE),(b::MAP,act::MAP),(b::MONOCULAR,act::MONOCULAR),(b::HEAL,act::HEAL),(b::PILLS,act::PILL),(b::TRACKER,act::TRACKER),(b::SEAT,act::SEAT),(b::CAMERA,act::CAMERA)]{if input.just(bit){self.command(sim,a,events);}}
 if self.stance==1{i.held|=b::CROUCH;}if self.stance==2{i.held|=b::CRAWL;}i.held&=!(b::USE|b::PRIMARY|b::INTERACT|b::SECONDARY);i.pressed&=b::JUMP;
 let sprint=input.down(b::SPRINT)&&self.stamina>0.&&self.ledger_carrier!=self.local_id as i32;if sprint&&input.move_dir.length()>0.1{self.stamina=(self.stamina-dt).max(0.);}else{self.stamina=(self.stamina+dt*0.7).min(12.);}let slow=if self.fever_state==2{0.75}else{1.};sim.config.movement.max_speed=(if sprint{7.}else if self.aiming{3.}else{4.6})*self.tuning.player_speed*slow;
 if self.riding.is_some(){self.drive(sim,input,dt,events);i.move_dir=Vec2::ZERO;}else if self.rescue_time>0.||self.death{ i.move_dir=Vec2::ZERO;}else if self.cheats.noclip{self.pos+=Vec3::new(i.move_dir.x,input.vertical,i.move_dir.y)*dt*12.;self.sync_player(sim);i.move_dir=Vec2::ZERO;}
 for gun in &mut self.guns{gun.cooldown=(gun.cooldown-dt).max(0.);}
 self.action_tick(sim,dt,events);
 let swimming=sim.player().and_then(|p|p.character.as_ref()).is_some_and(|c|c.swimming);
 if input.down(b::PRIMARY)&&!swimming&&self.action.is_none()&&!self.safe_town()&&!self.map_up&&!self.monocular&&!self.tracker&&!self.death&&self.rescue_time<=0. {self.shoot(sim,events);}
 if self.monocular{self.tag(dt);}
 if let Some(id)=sim.state.player{out.insert(id,i);}
 if !self.session||self.host{self.ai(sim,dt,events,&mut out);}self.survival(sim,dt,events);self.world_tick(sim,dt,events);self.contract_tick(sim,dt,events);self.tape_tick(dt);
 out}
 fn post(&mut self,sim:&mut Sim,dt:f32,events:&mut Vec<SimEvent>){if !self.attracting&&(self.screen=="playing"||self.screen=="ending_defend"||self.session&&self.round_started)&&self.riding.is_none()&&!self.cheats.noclip{if let Some(pos)=sim.state.player.and_then(|id|sim.feet(id)){self.speed=distance(pos,self.pos)/dt;self.pos=pos;}}
 if self.pos.x.abs()>1010.||self.pos.z.abs()>1010.{self.pos.x=self.pos.x.clamp(-1000.,1000.);self.pos.z=self.pos.z.clamp(-1000.,1000.);self.note(self.s("border").to_string());self.sync_player(sim);}
 if self.pos.y<terrain::height(&self.data,self.pos.x,self.pos.z)-3.{self.pos.y=terrain::height(&self.data,self.pos.x,self.pos.z)+0.1;self.sync_player(sim);}
 for n in &mut self.soldiers{if let Some(id)=n.entity{if let Some(p)=sim.feet(id){n.pos=p;let ground=terrain::height(&self.data,p.x,p.z);if n.pos.y<ground-0.5{n.pos.y=ground+0.05;sim.set_position(id,n.pos);}}}}
 if self.screen=="playing" {for e in events.iter(){if let SimEvent::Land{speed,..}=e{if *speed>6.{self.damage((speed-6.)*4.,3);}}}}
 self.stream(sim);sim.state.focus=self.pos;
 }
 fn hud(&self,_sim:&Sim)->Vec<String>{Vec::new()}
 fn status(&self,_sim:&Sim)->serde_json::Value{json!({"title":self.s("title"),"screen":self.screen,"focus":self.focus,"page":self.page,"pos":self.pos,"yaw":self.yaw,"pitch":self.pitch,"health":self.health,"stamina":self.stamina,"stance":self.stance,"eye":self.eye,"time":self.time,"hour":self.hour,"wind":[self.wind.x,self.wind.y,self.wind_speed],"fire":{"burning":self.fire.burning(),"total":self.fire.total,"version":self.fire.version},"contract":self.contract,"goal":self.goal,"goalData":self.current_goal(),"complete":self.complete,"ceasefire":self.ceasefire,"ending":self.ending,"outcome":self.outcome,"fever":self.fever_state,"feverTimer":self.fever_timer,"pills":self.pills,"syrettes":self.syrettes,"diamonds":self.diamonds,"gun":self.guns[self.active],"guns":self.guns,"map":self.map_up,"waypoint":self.waypoint,"monocular":self.monocular,"tracker":self.tracker,"riding":self.riding,"seat":self.seat,"companions":self.companions,"coverage":self.coverage,"audio":{"master":self.settings.master,"music":self.settings.music,"sfx":self.settings.sfx,"voices":self.settings.voices},"settings":self.settings,"tuning":self.tuning,"cheats":self.cheats,"attract":self.attracting,"attractSegment":self.attract_segment,"attractLoops":self.attract_loops,"saveSerial":self.save_serial,"session":self.session,"host":self.host,"started":self.round_started,"finished":self.finished,"won":self.won,"score":self.team_score,"ledger":self.ledger_carrier,"roundTime":self.round_time,"peers":self.peers,"enemiesAlive":self.soldiers.iter().filter(|n|n.hp>0.).count(),"voiceSerial":self.voice_serial,"subtitle":self.subtitle,"soundSerial":self.sound_serial})}
 fn outcome(&self)->Outcome{self.outcome}
 fn bot(&self,sim:&Sim)->InputFrame{self.bot_input(sim)}
}
