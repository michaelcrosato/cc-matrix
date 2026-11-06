// The wind, and the missions that pin it.
export class WindPart {
  pinWind(w) {
    if (w) { const l = Math.hypot(w.dir[0], w.dir[1]) || 1; this.windPin = { x: w.dir[0] / l, z: w.dir[1] / l, speed: w.speed }; this.wind.x = this.windPin.x; this.wind.z = this.windPin.z; this.wind.speed = w.speed; } else this.windPin = null;
    this.fire.wind = this.wind;
  }
}
