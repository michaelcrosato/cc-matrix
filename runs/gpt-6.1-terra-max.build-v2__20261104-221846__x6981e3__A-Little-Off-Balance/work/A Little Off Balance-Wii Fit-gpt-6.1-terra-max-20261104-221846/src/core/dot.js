export const DEFAULT_TUNABLES = Object.freeze({dotLag:.08,dotInstability:.6,dotAuthority:3,dotDamping:3.4,dotNoise:.8,timeScale:1});
export class Dot {
  constructor(random = Math.random) {
    this.x=0; this.y=0; this.vx=0; this.vy=0; this.ux=0; this.uy=0; this.t=0;
    this.ph=Array.from({length:4},()=>random()*Math.PI*2);
  }
  step(dt,inX,inY,tuning=DEFAULT_TUNABLES,modifiers={}) {
    this.t+=dt;
    const lag=Math.min(1,dt/Math.max(.01,tuning.dotLag));
    this.ux+=(inX-this.ux)*lag; this.uy+=(inY-this.uy)*lag;
    const noise=tuning.dotNoise*(modifiers.noise??1), instability=tuning.dotInstability*(modifiers.inst??1), authority=tuning.dotAuthority*(modifiers.auth??1);
    const noiseX=noise*(Math.sin(1.7*this.t+this.ph[0])+.6*Math.sin(3.1*this.t+this.ph[1]));
    const noiseY=noise*(Math.sin(1.3*this.t+this.ph[2])+.6*Math.sin(2.7*this.t+this.ph[3]));
    this.vx+=(instability*this.x+authority*this.ux-tuning.dotDamping*this.vx+noiseX+(modifiers.bx??0))*dt;
    this.vy+=(instability*this.y+authority*this.uy-tuning.dotDamping*this.vy+noiseY+(modifiers.by??0))*dt;
    this.x+=this.vx*dt; this.y+=this.vy*dt;
    const distance=Math.hypot(this.x,this.y);
    if(distance>1.2){const scale=1.2/distance;this.x*=scale;this.y*=scale;this.vx*=.3;this.vy*=.3;}
  }
}
