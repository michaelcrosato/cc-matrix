export const DEFAULTS = Object.freeze({
  drainMultiplier:1, bleedDrain:.35, mistakePenalty:6, maxMistakes:5, timeMultiplier:1,
  cursorSpeed:10, steadyFactor:.4, aimAssist:.6, tolerance:1, drainRate:1.4,
  laserTime:.7, syringeDose:18, composureGain:7, quietSlow:.25, quietDrain:18,
  lookCost:60, lookSeconds:4, strainSpeed:1, strainHP:1, heartBPM:72,
  blueWidth:.22, coopScale:.25,
});
export const SLIDERS = [
 ['drainMultiplier','VITALS DRAIN',0,3,.1],['bleedDrain','BLEED DRAIN',0,1,.05],
 ['mistakePenalty','MISTAKE DAMAGE',0,15,1],['maxMistakes','MISTAKE LIMIT (0 = OFF)',0,20,1],
 ['timeMultiplier','CLOCK MULTIPLIER',.5,3,.1],['cursorSpeed','CURSOR SPEED',3,20,.5],
 ['steadyFactor','STEADY FACTOR',.1,.8,.05],['aimAssist','AIM ASSIST',0,1,.1],
 ['tolerance','TOOL TOLERANCE',.5,2,.1],['drainRate','DRAIN RATE',.3,4,.1],
 ['laserTime','LASER HEAT TIME',.2,2,.1],['syringeDose','SYRINGE DOSE',5,40,1],
 ['composureGain','COMPOSURE PER CLEAN',0,20,1],['quietSlow','QUIET TIME SCALE',.05,.8,.05],
 ['quietDrain','QUIET COST / SECOND',2,30,1],['lookCost','SECOND LOOK COST',10,100,5],
 ['lookSeconds','SECOND LOOK SECONDS',1,6,.5],['strainSpeed','STRAIN SPEED',.3,2,.1],
 ['strainHP','STRAIN HEALTH',.5,2,.25],['heartBPM','HEART BASE BPM',48,108,6],
 ['blueWidth','SHOCK SAFE ZONE',.1,.5,.02],['coopScale','CO-OP PRESSURE',0,.5,.05],
];
export const DIFFICULTY = { Intern:{time:1.4,drain:.6,blue:2},Resident:{time:1,drain:1,blue:1},Attending:{time:.8,drain:1.3,blue:1} };
export function resetConfig(config){Object.assign(config,DEFAULTS);return config;}
export function setConfig(config,key,value){const d=SLIDERS.find(x=>x[0]===key);if(d)config[key]=Math.max(d[2],Math.min(d[3],value));}
