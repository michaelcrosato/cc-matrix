import {MISSIONS,MISSION_BY_ID} from '../content/missions.js';
import {DIALOGUE} from '../content/dialogue.js';
import {SITE_BY_ID} from '../content/sites.js';
export class MissionRunner {
 constructor(g){this.g=g;this.current=null;this.index=0;this.done=[];this.flags={};this.elapsed=0;this.progress=0;this.alt=false;this.altDone=false;this.dialogClock=0;this.lineIndex=0;this.choicesShown=false;this.killStart=0;this.events=[];}
 available(giver){if(this.current)return [];return MISSIONS.filter(m=>m.id!=='m0'&&m.id!=='m1'&&!this.done.includes(m.id)&&m.requires.every(r=>this.done.includes(r))&&(!giver||m.giver===giver||giver==='board'));}
 objective(){return this.current?.steps[this.index]?.text||'FIND WORK AT MILE FORTY / E AT THE NOTICE BOARD';}
 step(){return this.current?.steps[this.index];}
 start(id){const m=MISSION_BY_ID[id];if(!m)return false;const g=this.g;this.current=m;this.events=[];this.index=0;this.elapsed=0;this.progress=0;this.flags={};this.alt=false;this.altDone=false;this.choicesShown=false;this.dialogClock=0;this.lineIndex=0;if(g.buddies.some(b=>b.id==='dov'&&b.met&&!b.dead))g.charges+=2;g.pass=['concord','harvest'][m.giver==='ansa'?1:0];if(!['vance','ansa'].includes(m.giver))g.pass=null;if(m.hour!==undefined)g.hour=m.hour;if(m.weather)g.weather=m.weather;if(m.wind)Object.assign(g.wind,m.wind);this.killStart=g.ledger.kills;
 if(id==='m0'){g.teleport(-120,77);g.ridingTrain=true;g.vehicles.train.t=520;g.vehicles.train.speed=4;g.tablets=0;}
 if(id==='m1'){g.ridingTrain=false;g.vehicles.train.speed=0;g.teleport(-13,49);g.tablets=3;g.hp=65;g.body.attackFever();g.weapon.cond=45;}
 if(id==='m3'){g.unlock('flare');g.equip('flare');}
 if(id==='m4'){g.metBuddy('dov');g.trackerUnlocked=true;}
 if(id==='m5')g.metBuddy('mags');
 if(id==='m6'){const b=g.buddies.filter(b=>b.met&&!b.dead).sort((a,b)=>b.trust-a.trust)[0]||g.buddies.find(b=>b.id==='pell');b.met=true;g.buddyActive=b.id;g.spawnBuddy(b.id);}
 if(id==='m7'){g.truce=false;g.act=3;g.world.fire.ignite(180,-280,12);}
 if(id==='m9'){g.world.fire.extinguish();g.mapUp=true;}
 g.toast(m.title,7);g.say(...DIALOGUE[id][0]);this.lineIndex=1;this.waypoint();g.emit('mission-start',id);return true;}
 waypoint(){const s=this.step();if(!s)return;const site=SITE_BY_ID[s.site];const o=this.g.world.object(s.tag||s.to);const v=this.g.vehicles.list.find(v=>v.id===s.tag);if(site)this.g.waypoint={x:site.at[0],z:site.at[1],name:site.name};else if(o)this.g.waypoint={x:o.x,z:o.z,name:o.name};else if(v){const p=this.g.vehicles.position(v);this.g.waypoint={x:p.x,z:p.z,name:v.id.toUpperCase()};}}
 emit(type,tag,value=1){this.events.push({type,tag,value});if(this.current?.alt&&tag===this.current.alt.tag)this.altDone=true;}
 advance(){if(!this.current)return;this.index++;if(this.current.id==='m1'&&this.index>=6)this.flags.returning=true;if(this.current.id==='m1'&&this.index===8)this.g.hp=Math.min(this.g.hp,60);this.elapsed=0;this.progress=0;this.choicesShown=false;this.events=[];if(this.index>=this.current.steps.length)this.complete();else{this.g.toast(this.objective(),6);this.waypoint();}}
 choose(id){const s=this.step();if(s?.do!=='choice'||!s.choices.some(c=>c.id===id))return false;this.flags[id]=true;if(id==='column'||id==='walk'){this.g.endingChoice=id;this.g.columnHasSheet=id==='column';}if(id==='kill-harrow'){this.g.ledger.harrowKilled=true;this.g.hands.shoot();this.g.sound.play('m38');}this.g.ui.close();this.advance();return true;}
 complete(){const g=this.g,m=this.current;const validAlt=this.alt&&this.altDone&&(m.id!=='m5'||this.flags.bypass);const pay=Math.round((m.pay+(validAlt?(m.alt?.bonus||0):0))*g.tuning.stonesReward);g.stones+=pay;g.ledger.earned+=pay;if(!this.done.includes(m.id))this.done.push(m.id);if(m.scar)g.world.fire.burnStrip(m.scar,24);if(validAlt){const b=g.buddies.find(b=>b.id===m.alt.buddy);if(b)b.trust++;}g.toast('CONTRACT CONCLUDED / '+pay+' STONES',7);g.sound.play('ui-confirm');g.pass=null;
 if(m.id==='m0'){this.current=null;this.start('m1');return;}
 if(m.id==='m1'){g.tablets+=3;g.metBuddy('mags');g.world.siteById('pump-shed').cleared=true;}
 if(m.id==='m2'){g.metBuddy('ines');g.world.siteById('ranger-post').cleared=true;g.act=2;}
 if(m.id==='m5'&&!this.flags.bypass){for(const a of g.actors.list.filter(a=>a.kind==='civilian'&&a.site==='three-wells'))g.actors.flee(a);g.clinicDebt=true;}
 if(m.id==='m7')g.truce=false;
 if(m.id==='m8'){const x=g.pos.x,z=g.pos.z;g.ridingTrain=false;g.vehicles.train.speed=0;g.teleport(x,z);g.equip(g.loadout.main||'tractor');g.formColumn();}
 if(m.id==='m9'){this.current=null;g.mapUp=false;this.start('end');g.save();return;}
 if(m.id==='end'){this.current=null;g.endCampaign();return;}
 this.current=null;g.buddyActive=null;g.save();}
 acceptAlt(){const a=this.current?.alt;if(!a)return;this.alt=true;this.g.buddyActive=a.buddy;this.g.spawnBuddy(a.buddy);this.g.say(a.buddy,a.text);}
 tick(dt){if(!this.current)return;const g=this.g,s=this.step();this.dialogClock+=dt;if(this.dialogClock>13&&this.lineIndex<DIALOGUE[this.current.id].length){this.dialogClock=0;let [who,line]=DIALOGUE[this.current.id][this.lineIndex++];if(g.buddies.some(b=>b.id===who&&b.dead))return;if(this.current.id==='m6'&&who==='ines')who=g.buddyActive||'pell';g.say(who,line);}this.elapsed+=dt;if(this.current.alt&&!this.flags.altAsked&&!this.alt&&this.elapsed>5&&!g.screen){this.flags.altAsked=true;const b=g.buddies.find(b=>b.id===this.current.alt.buddy);if(b&&b.met&&!b.dead){g.sound.play('radio');g.say(b.id,this.current.alt.text);g.ui.open('alt');}}const site=SITE_BY_ID[s.site],d=site?Math.hypot(g.pos.x-site.at[0],g.pos.z-site.at[1]):Infinity;const event=this.events.find(e=>e.tag===s.tag||e.type===s.tag||(s.do==='report'&&e.tag===s.to));let done=false;
 if(s.do==='goto')done=d<(s.r||35);if(s.do==='leave')done=d>s.r;if(['use','deliver','collect','steal','report','talk'].includes(s.do))done=!!event||(['use','collect','deliver'].includes(s.do)&&!!g.world.object(s.tag)&&!g.world.object(s.tag).active);
 if(s.do==='kill'){const dead=g.actors.list.filter(a=>a.site===s.site&&a.kind==='soldier'&&a.dead).length;done=dead>=(s.n||1);this.progress=dead/(s.n||1);}
 if(s.do==='destroy'){const objs=g.world.objects.filter(o=>o.tag===s.tag);const veh=g.vehicles.list.filter(v=>v.id===s.tag);const n=objs.filter(o=>!o.active).length+veh.filter(v=>v.dead).length;done=n>=s.n;this.progress=n/s.n;}
 if(s.do==='burn'){let n=0;for(const i of [...g.world.fire.scorched,...g.world.fire.active]){const [x,z]=g.world.fire.coords(i);if(Math.hypot(x-site.at[0],z-site.at[1])<(s.site==='pass'?75:105))n++;}this.progress=n/s.n;done=n>=s.n;}
 if(s.do==='hold'){if(d<(s.r||60))this.progress+=dt/(this.current.id==='end'&&g.endingChoice==='walk'?50:s.time);done=this.progress>=1;}
 if(s.do==='ride')done=this.elapsed>s.time||this.events.some(e=>e.type==='skip');
 if(s.do==='script'){if(s.script==='arrival'){g.ridingTrain=false;g.body.attackFever();g.teleport(-13,49);done=true;}if(s.script==='buddy-down'){g.wind.x=-g.wind.x;g.wind.z=-g.wind.z;g.downBuddy(g.buddyActive);done=true;}}
 if(s.do==='choice'&&!this.choicesShown){this.choicesShown=true;g.mapUp=false;g.ui.open('choice');}
 this.events=[];if(done)this.advance();}
 save(){return {id:this.current?.id,index:this.index,done:this.done,flags:this.flags,elapsed:this.elapsed,progress:this.progress,alt:this.alt,altDone:this.altDone,lineIndex:this.lineIndex};}
 load(s){this.current=MISSION_BY_ID[s.id]||null;this.events=[];Object.assign(this,{index:s.index,done:s.done,flags:s.flags,elapsed:s.elapsed,progress:s.progress,alt:s.alt,altDone:s.altDone,lineIndex:s.lineIndex,choicesShown:false});this.waypoint();}
}
