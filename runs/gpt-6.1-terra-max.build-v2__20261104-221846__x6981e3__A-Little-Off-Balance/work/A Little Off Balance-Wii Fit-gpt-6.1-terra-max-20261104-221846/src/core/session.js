import { Dot, DEFAULT_TUNABLES } from './dot.js';

const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
export function makeProfile(name='PLAYER') {return {name,day:1,drips:0,stars:0,history:[],played:{},goal:'FIND YOUR BALANCE',revealed:false,completedDays:[]};}
export function wobbleAge(profile) {
  const scores=profile.history.slice(-3);
  const average=scores.length?scores.reduce((sum,value)=>sum+value,0)/scores.length:.5;
  return clamp(Math.round(20+60*(1-average)-Math.min(20,profile.stars*.5)),18,95)+(profile.revealed?0:7);
}
export class ActivitySession {
  constructor(activity,options={}) {
    this.activity=activity; this.hard=!!options.hard; this.duration=options.duration??activity.duration;
    this.dot=new Dot(options.random); this.elapsed=0; this.points=0; this.samples=0; this.breathSync=.5;
    this.rep=.0; this.hoopLift=.65; this.lastAngle=null; this.angleSpeed=0; this.goodSteps=0; this.lastStep=-2; this.hits=0;
    this.tuning={...DEFAULT_TUNABLES,...options.tuning}; this.finished=false; this.distance=0; this.lastDirection=0;
    this.eventCount=0; this.lastBeat=-1; this.notes=[];
  }
  update(dt,input={}) {
    if(this.finished)return;
    dt=clamp(dt*(this.tuning.timeScale??1),0,.1); this.elapsed+=dt;
    const {x=0,y=0,breath=false,left=false,right=false}=input;
    const family=this.activity.family, t=this.elapsed;
    const breathIn=this.activity.breath?Math.sin(t*Math.PI*2/this.activity.breath)>0:false;
    if(this.activity.breath) this.breathSync+=(Number(breath===breathIn)-this.breathSync)*Math.min(1,dt*2);
    const modifiers={noise:this.activity.breath?1.25-.55*this.breathSync:1};
    if(this.activity.id==='heron')modifiers.bx=.12*Math.sin(t*.7);
    if(this.activity.id==='tax')modifiers.bx=.18*Math.sin(t*.9);
    if(this.activity.id==='chair')modifiers.noise*=1+.5*t/this.duration;
    if(this.activity.id==='plank')modifiers.inst=1.2;
    this.dot.step(dt,x,y,this.tuning,modifiers);
    const distance=Math.hypot(this.dot.x,this.dot.y);
    let quality=0;
    if(family==='still'||family==='tray'||family==='slack'||family==='jump'){
      const ring=(this.activity.ring??(family==='slack'?.32:.48))*(this.hard?.8:1);
      quality=distance<ring?1:0;
      if(this.activity.breath)quality=.8*quality+.2*this.breathSync;
      if(family==='slack'){
        if((left||right)&&t-this.lastStep>.14){this.lastStep=t;this.goodSteps++;this.distance+=distance<.75?1:.15;}
        quality*=.45+.55*clamp(this.goodSteps/(t*1.5),0,1);
      }
      if(family==='jump'&&breath&&t-this.lastStep>2){this.lastStep=t;this.goodSteps++;this.distance+=distance<.6?1:0;}
      if(family==='jump') quality*=.5+.5*clamp(this.goodSteps/Math.max(1,t/5),0,1);
    } else if(family==='reps'){
      const phase=(t/3.2)%1;
      const target=phase<.4?phase/.4:phase<.55?1:phase<.9?1-(phase-.55)/.35:0;
      const requested=this.activity.id==='lunges'?Math.abs(x):this.activity.id==='mortgage'?Math.max(0,y):Math.max(0,-y);
      this.rep+=(requested-this.rep)*Math.min(1,dt/((this.activity.id==='mortgage'?.15:.10)));
      quality=clamp(1-1.6*Math.abs(this.rep-target),0,1);
    } else if(family==='hoop'){
      const magnitude=Math.hypot(x,y);
      if(magnitude>.5){const angle=Math.atan2(y,x);if(this.lastAngle!==null){let delta=angle-this.lastAngle;while(delta>Math.PI)delta-=Math.PI*2;while(delta< -Math.PI)delta+=Math.PI*2;this.angleSpeed+=(Math.abs(delta)/Math.max(dt,.001)-this.angleSpeed)*Math.min(1,dt/.25);}this.lastAngle=angle;}else{this.angleSpeed*=Math.max(0,1-dt*3);this.lastAngle=null;}
      const inBand=this.angleSpeed>4.5&&this.angleSpeed<18;
      this.hoopLift=clamp(this.hoopLift+(inBand?.35:-.15)*dt,0,1);quality=this.hoopLift;
    } else if(family==='step'||family==='jog'){
      const beat=Math.floor(t/.7);
      if(beat!==this.lastBeat){this.lastBeat=beat;this.eventCount++;}
      if((left||right)&&t-this.lastStep>.12){const side=left?-1:1;const phase=Math.abs((t/.7)-Math.round(t/.7));if(family==='jog'?side!==this.lastDirection:phase<.23){this.goodSteps++;}this.lastDirection=side;this.lastStep=t;}
      quality=clamp(this.goodSteps/Math.max(1,this.eventCount-1),0,1);
    } else if(family==='header'){
      const beat=Math.floor((t-1.2)/2.4);
      if(beat>=0&&beat!==this.lastBeat){this.lastBeat=beat;this.eventCount++;const target=beat%2===0?-1:1;if(Math.sign(x)===target)this.hits++;}
      quality=this.hits/Math.max(1,this.eventCount);
    }
    this.points+=quality*dt;this.samples+=dt;
    if(this.elapsed>=this.duration)this.finished=true;
  }
  result(){const score=Math.round(100*this.points/Math.max(.001,this.samples));const thresholds=this.activity.family==='reps'?[55,75,90]:[45,70,90];const stars=thresholds.filter(value=>score>=value).length;return {score,stars,drips:2+stars*3+Math.floor(this.duration/30),seconds:this.duration};}
}
