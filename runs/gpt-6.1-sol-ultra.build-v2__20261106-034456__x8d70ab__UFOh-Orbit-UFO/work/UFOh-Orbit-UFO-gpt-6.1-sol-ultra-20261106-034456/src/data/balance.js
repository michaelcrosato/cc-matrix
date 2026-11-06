export const ARENA = Object.freeze({x:0,y:0,w:960,h:540});
export const BALANCE_VERSION = 'orbit-1.0';
export const DEFAULT_BALANCE = Object.freeze({
  moveSpeed:232,acceleration:11,aimSpeed:6.283185307179586,shotInterval:.25,
  shieldRecharge:1.6,recoverySpeed:.5,damageImmunity:1.1,contactGrace:.12,
  bulletSpeed:610,bulletLife:1.65,drifterSpeed:22,hunterSpeed:82,hunterTurn:2.4,
  fusionRadius:40,fusionTime:1.4,hunterArm:1.15,gunshipSpeed:112,
  gunshipWarning:1.5,gunshipVolley:2.7,hostileSpeed:172,chainRadius:73,
  blastDuration:.38,chainMultiplier:8,bossHealth:90,bossAttackInterval:6.4,
  hull:3,ramDamage:3,environmentOwner:-1,sectorRepair:1
});
export const BALANCE_SPECS = [
  ['moveSpeed','Flight speed',120,380,4,'Flight'],['acceleration','Response',3,24,1,'Flight'],
  ['aimSpeed','Cannon orbit',1,15,.25,'Flight'],['shotInterval','Shot interval',.12,.8,.02,'Flight'],
  ['shieldRecharge','Shield recharge',.5,3,.1,'Shield'],['recoverySpeed','Exposed speed',.25,1,.05,'Shield'],
  ['damageImmunity','Damage immunity',.3,3,.1,'Shield'],['drifterSpeed','Drifter speed',0,60,2,'Threats'],
  ['hunterSpeed','Hunter speed',30,160,4,'Threats'],['hunterTurn','Hunter turn',.5,6,.1,'Threats'],
  ['fusionRadius','Fusion radius',20,90,2,'Threats'],['gunshipWarning','Lane warning',.5,3,.1,'Threats'],
  ['gunshipVolley','Volley interval',1,5,.1,'Threats'],['chainRadius','Chain radius',30,125,2,'Command'],
  ['bossHealth','Command hull',18,180,3,'Command'],['bossAttackInterval','Command interval',3.5,10,.25,'Command']
].map(([key,label,min,max,step,group])=>({key,label,min,max,step,group,value:DEFAULT_BALANCE[key]}));
export function sanitizeBalance(input={}) {
  const result={...DEFAULT_BALANCE};
  for(const spec of BALANCE_SPECS)if(Number.isFinite(input[spec.key]))result[spec.key]=Math.max(spec.min,Math.min(spec.max,input[spec.key]));
  return result;
}
