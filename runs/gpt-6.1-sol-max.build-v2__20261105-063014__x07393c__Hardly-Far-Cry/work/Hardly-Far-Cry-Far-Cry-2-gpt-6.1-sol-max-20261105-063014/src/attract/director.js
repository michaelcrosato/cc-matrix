export const BEATS=['THE ROAD / THE MAP','A GUN WITH AN OPINION','READ THE WIND','THE LONG FIELD','THE FEVER','FIELD REPAIRS','A LONG VIEW','A FRIEND FOR HIRE','ROUGH STONES','THE GOODS LINE','EVERYTHING HAS BEEN RETURNED','YOU HAVE BEEN DRAWING FOR ME'];
export class Attract {
 constructor(g){this.g=g;this.age=0;this.beat=-1;}
 start(){const g=this.g;this.returnScreen=g.screen;g.saveStore.disabled=true;g.world.reset();g.actors.reset();g.mode='attract';g.screen='';g.cheats.god=true;g.cheats.ammo=true;g.cheats.noFever=true;this.age=0;this.beat=-1;this.tick(0);}
 exit(){const g=this.g;g.world.reset();g.actors.reset();g.vehicles.reset();g.mapUp=false;g.trackerUp=false;g.monocular=false;g.vehicle=null;g.body.fever.active=false;g.body.busy=null;g.body.rescueTime=0;g.player.body.setEnabled(true);g.cheats.god=false;g.cheats.ammo=false;g.cheats.noFever=false;g.saveStore.disabled=false;g.mode='title';g.ui.open(this.returnScreen||'title');g.cam.override=g.titleView();g.idle=0;g.subtitleAge=0;}
 tick(dt){const g=this.g;this.age+=dt;const beat=Math.floor(this.age/12)%BEATS.length,t=this.age%12;if(beat!==this.beat){if(beat===0&&this.beat>=0){g.world.reset();g.actors.reset();g.vehicles.reset();}this.beat=beat;g.mapUp=false;g.trackerUp=false;g.monocular=false;g.body.busy=null;g.body.fever.active=false;g.vehicle=null;g.cam.override=null;g.equip('tractor',45);g.toast(BEATS[beat],12);g.ctx.engine.screen.flash('ink',{duration:.6});
 if(beat===0){g.hour=16.5;g.weather='clear';const v=g.vehicles.list[0];g.vehicles.enter(v);g.mapUp=true;}
 if(beat===1){g.teleport(-205,51);g.weapon.jammed=true;g.weapon.racks=3;g.hands.animate('Unjam');}
 if(beat===2){g.teleport(408,-30);g.equip('flare');g.world.fire.ignite(414,-50,15);}
 if(beat===3){g.hour=22;g.teleport(-270,-240);g.world.fire.ignite(-270,-285,28);}
 if(beat===4){g.teleport(-125,156);g.body.fever.active=true;g.body.fever.age=10;g.hands.animate('Tablet');}
 if(beat===5){g.teleport(-170,10);g.hp=12;g.hands.animate('Pliers');}
 if(beat===6){g.hour=12;g.teleport(-101,-490);g.equip('empire');g.aim=true;}
 if(beat===7){g.hp=40;g.teleport(-270,-260);g.spawnBuddy('ines');g.hands.animate('Syrette');g.say('ines','You owe me a truck. You owe me several trucks.');}
 if(beat===8){g.teleport(-163,122);g.trackerUp=true;g.world.fire.ignite(-172,117,5);}
 if(beat===9){g.teleport(0,70);g.equip('mg');g.vehicles.train.speed=7;}
 if(beat===10){g.teleport(13,40);g.say('tibor','Everything on this rack has been returned at least once.');}
 if(beat===11){g.teleport(-130,-506);for(const id of ['A','B','C'])g.world.fire.burnStrip(id,24);g.mapUp=true;g.say('harrow','You have been drawing for me. Look at it.');}}
 if(beat===0){const x=-90+t*3,z=91;g.cam.override={position:[x,g.world.heightAt(x,z)+2,z],target:[x+20,g.world.heightAt(x+20,z)+1,z-6]};}else if(beat===3){g.cam.override={position:[-270+t*3,g.world.heightAt(-270,-240)+4,-240],target:[-260,g.world.heightAt(-260,-300)+1,-300]};}else if(beat===9){const p=g.vehicles.railPoint(g.vehicles.train.t-11);g.cam.override={position:[p.x,g.world.heightAt(p.x,p.z)+3,p.z],target:[p.x+30,g.world.heightAt(p.x+30,p.z)+2,p.z-10]};}else{g.cam.override={position:[g.pos.x,g.pos.y+1.55,g.pos.z],target:[g.pos.x+Math.sin(t*.08)*9,g.pos.y+1,g.pos.z-25]};}if(beat===1&&t>3&&t<3.1)g.hands.animate('Unjam');if(beat===6&&t>5&&t<5.1)g.fire();}
}
