// Live tuning: TUNING holds the defaults (metres / seconds / factors); CFG is live. Dev Mode sliders write CFG.
export const TUNING = {
  topSpeed: 1, accel: 1, grip: 1, steer: 1, brake: 1, gravity: 30, boostPower: .45, boostTime: .9, medalSlack: 1,
  rivalSkill: .93, respawnPenalty: 0, ghostAlpha: .45, camDist: 1, fov: 70
};
export const CFG = Object.assign({}, TUNING);
export const reset = () => Object.assign(CFG, TUNING);
// slider specs shown in Dev Mode: key, label, min, max, step
export const SLIDERS = [
  ['topSpeed', 'Top speed', .5, 1.6, .05], ['accel', 'Acceleration', .4, 2, .05], ['grip', 'Tyre grip', .4, 2, .05], ['steer', 'Steering', .5, 1.6, .05],
  ['brake', 'Brakes', .4, 2, .05], ['gravity', 'Gravity m/s2', 10, 60, 1], ['boostPower', 'Boost power', 0, 1.2, .05], ['boostTime', 'Boost seconds', .2, 3, .1],
  ['medalSlack', 'Medal strictness', .8, 1.5, .01], ['rivalSkill', 'Rival skill', .6, 1.1, .01], ['respawnPenalty', 'Respawn penalty s', 0, 5, .5],
  ['ghostAlpha', 'Ghost strength', .1, 1, .05], ['camDist', 'Camera distance', .6, 1.6, .05], ['fov', 'Field of view', 50, 100, 1]
];
