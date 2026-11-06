/** @file Small synthesized soundscape without external assets. */
export class Soundscape {
 private context:AudioContext|null=null;
 private musicTimer:number|null=null;
 private melodyStep=0;
 enabled=true;
 play(kind:'click'|'hit'|'finish'|'miss'):void {
  if(!this.enabled)return;
  try{
   this.context??=new AudioContext();
   const context=this.context;
   if(context.state==='suspended')void context.resume();
   if(this.musicTimer===null)this.musicTimer=window.setInterval(()=>this.playMusic(),600);
   const notes=kind==='finish'?[440,554,659]:[kind==='miss'?180:kind==='hit'?660:420];
   notes.forEach((frequency,index)=>{
    const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+index*.11;
    oscillator.type='sine'; oscillator.frequency.setValueAtTime(frequency,start);
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.045,start+.02);gain.gain.exponentialRampToValueAtTime(.0001,start+.18);
    oscillator.connect(gain).connect(context.destination);oscillator.start(start);oscillator.stop(start+.2);
   });
  }catch{return;}
 }
 private playMusic():void {
  const context=this.context;
  if(!this.enabled||!context||context.state!=='running')return;
  const notes=[261.63,329.63,392,493.88,440,392,329.63,293.66];
  const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime;
  oscillator.type='sine';oscillator.frequency.value=notes[this.melodyStep++%notes.length];
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.012,start+.08);gain.gain.exponentialRampToValueAtTime(.0001,start+.58);
  oscillator.connect(gain).connect(context.destination);oscillator.start(start);oscillator.stop(start+.6);
 }
}
