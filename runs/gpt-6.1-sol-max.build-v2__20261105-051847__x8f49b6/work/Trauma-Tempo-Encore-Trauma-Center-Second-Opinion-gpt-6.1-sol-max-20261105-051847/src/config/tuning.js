export const groups = {
  Hands: [['tipSpeed',1.9,.8,3.5],['stickCurve',1.7,1,3],['aimAssist',.35,0,1],['steadyFactor',.4,.2,.8]],
  Tools: [['scalpelTol',.055,.02,.12],['pullTol',1.6,.6,3],['suctionRate',1,.3,3],['gelRadius',.16,.08,.3],['stitchGateR',.07,.03,.15],['laserDps',30,10,80],['laserBurn',2,0,6],['scannerRadius',.3,.15,.5],['clampWindow',.18,.06,.4],['defibWindow',.30,.1,.6]],
  Patient: [['drainMult',1,0,3],['timerMult',1,.5,2],['tempoPressure',60,0,120],['stabilizerHeal',15,5,30],['stabilizerCooldown',3,.5,8],['missLimit',8,3,20]],
  Strains: [['strainHpMult',1,.3,3],['strainSpeedMult',1,.3,2.5],['spawnRateMult',1,.3,2.5]],
  Gifts: [['composureGain',1,.2,3],['hushDuration',7,2,15],['hushTimeScale',.25,.05,.7],['sforzandoStun',3,1,6],['sforzandoDamage',.25,.05,.6],['sforzandoToolMult',2,1.2,4],['sforzandoDuration',6,2,12]]
};
export const defaults = Object.fromEntries(Object.values(groups).flat().map(([id,value])=>[id,value]));
export const difficulty = {
 easy: {label:'Intern',drain:.6,time:1.4,tolerance:1.4,misses:12,hp:.85},
 normal:{label:'Resident',drain:1,time:1,tolerance:1,misses:8,hp:1},
 hard:{label:'Attending',drain:1.35,time:.85,tolerance:.8,misses:5,hp:1.2}
};
export const tools = ['scalpel','forceps','suction','gel','suture','laser','scanner','clamp'];
export const toolLabels = ['Scalpel','Forceps','Suction','Gel','Suture','Laser','Scanner','Clamp'];
export const toolHints = {
 scalpel:'Hold {use} at the first dot. Trace the gold guide slowly.',
 forceps:'Hold {use} to grip. Pull along the arrow, then release over the tray.',
 suction:'Hold {use} over crimson pools until the field is clear.',
 gel:'Hold {use} and paint the dotted area mint green.',
 suture:'Hold {use}. Follow the numbered gates, then {alt} to tie.',
 laser:'Hold {use} on the violet target. Lift off healthy tissue.',
 scanner:'Hold {use} and sweep. Stay on a hidden target until it pings.',
 clamp:'Press {use} on a bleeder as the ring closes. {alt} removes it.',
 syringe:'Hold {syringe} to restore vitals. Unlimited doses; a short cooldown.',
 defib:'Hold {charge} to charge. Release both in the gold band.',
 hush:'Press {special}. Slow the world. Keep your hands moving.',
 sforzando:'Press {special}. Stun every strain and double your tool power.'
};
