export const WEAPONS={
 cane:{name:'CANE KNIFE',slot:'melee',mag:1,reserve:0,rate:1.6,damage:55,range:2.6,wear:0,cost:0,noise:7},
 m38:{name:'SERVICE REVOLVER',slot:'sidearm',mag:6,reserve:36,rate:3,damage:34,range:65,wear:.5,cost:0,noise:90},
 flare:{name:'FLARE PISTOL',slot:'sidearm',mag:1,reserve:8,rate:.6,damage:12,range:85,wear:0,cost:0,noise:60,projectile:true},
 tractor:{name:'TRACTOR RIFLE',slot:'main',mag:30,reserve:150,rate:9,damage:24,range:150,wear:.35,cost:6,noise:120,automatic:true},
 mule:{name:'MULE PUMP GUN',slot:'main',mag:6,reserve:36,rate:1.1,damage:90,range:28,wear:.8,cost:8,noise:120},
 empire:{name:'OLD EMPIRE',slot:'main',mag:5,reserve:30,rate:.8,damage:95,range:360,wear:1,cost:14,noise:150},
 weed:{name:'WEED BURNER',slot:'special',mag:120,reserve:240,rate:12,damage:2.4,range:16,wear:.12,cost:18,noise:55,automatic:true},
 tube:{name:'LONG TUBE',slot:'special',mag:1,reserve:5,rate:.4,damage:180,range:180,wear:2,cost:20,noise:180,projectile:true},
 mg:{name:'MOUNTED MG',slot:'mounted',mag:999,reserve:999,rate:10,damage:20,range:200,wear:0,cost:0,noise:200,automatic:true}
};
export const UPGRADES=[{id:'cleaning',name:'CLEANING KIT',cost:6,description:'SLOWER WEAR. THE RUST STILL WINS.'},{id:'pouch',name:'SYRETTE POUCH',cost:5,description:'FIVE SYRETTES. FIVE SMALL ARGUMENTS.'},{id:'belt',name:'AMMO BELT',cost:5,description:'HALF AS MUCH AMMUNITION AGAIN.'},{id:'vehicle',name:'VEHICLE KIT',cost:6,description:'HALVE THE TIME UNDER THE BONNET.'}];
export const makeWeapon=(id,cond=100)=>({id,cond,jammed:false,racks:0,mag:WEAPONS[id].mag,reserve:WEAPONS[id].reserve,shots:0});
