export class Sound {
  constructor(settings) { this.settings=settings; this.context=null; this.beat=0; this.next=0; }
  unlock() {
    if (!this.context) {
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if (!AudioContext) return;
      this.context=new AudioContext();
    }
    if (this.context.state==='suspended') this.context.resume().catch(()=>{});
  }
  tone(frequency,duration=.12,volume=.12,type='sine',delay=0) {
    const context=this.context;
    if (!context||context.state!=='running') return;
    const start=context.currentTime+delay;
    const oscillator=context.createOscillator(), gain=context.createGain();
    oscillator.type=type; oscillator.frequency.setValueAtTime(frequency,start);
    gain.gain.setValueAtTime(.0001,start); gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(gain).connect(context.destination); oscillator.start(start); oscillator.stop(start+duration+.02);
  }
  effect(kind='select') {
    const volume=(this.settings.effects??.7)*.14;
    if(kind==='select') this.tone(520,.09,volume,'triangle');
    if(kind==='back') this.tone(270,.12,volume,'sine');
    if(kind==='good'){this.tone(523,.15,volume,'triangle');this.tone(784,.23,volume,'triangle',.09);}
    if(kind==='voice'){for(let syllable=0;syllable<3;syllable++)this.tone(350+Math.random()*150,.075,volume*.45,'triangle',syllable*.075);}
  }
  update(dt) {
    if(!this.context||this.context.state!=='running'||!this.settings.music)return;
    this.next-=dt;
    if(this.next>0)return;
    this.next+=.34;
    const notes=[392,494,587,494,440,523,659,523,392,494,587,659,698,587,523,440];
    this.tone(notes[this.beat%notes.length],.27,(this.settings.music??.1)*.18,'sine');
    if(this.beat%4===0)this.tone([196,220,174.6,196][Math.floor(this.beat/4)%4],.48,(this.settings.music??.1)*.12,'triangle');
    this.beat++;
  }
}
