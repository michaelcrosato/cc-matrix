// Every note, tool and syllable is synthesized; there are no recorded sounds.
class Soundscape {
  constructor(settings) { this.settings=settings;this.ctx=null;this.step=0;this.clock=0;this.lastBeat=-1;this.lastTool=0;this.stopped=false;this.lastCase=-1; }
  async unlock() {
    if(!this.ctx) {
      const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
      this.ctx=new A();this.master=this.ctx.createGain();this.master.gain.value=.62;
      this.compressor=this.ctx.createDynamicsCompressor();this.compressor.threshold.value=-9;this.compressor.ratio.value=4;
      this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=1024;
      this.master.connect(this.compressor);this.compressor.connect(this.analyser);this.analyser.connect(this.ctx.destination);
      this.buses={};for(const key of ['music','effects','voices']){let n=this.ctx.createGain();n.connect(this.master);this.buses[key]=n;}
      this.apply();
    }
    if(this.ctx.state==='suspended')try{await this.ctx.resume();}catch{}
  }
  apply(){if(!this.ctx)return;for(const k of ['music','effects','voices'])this.buses[k].gain.setTargetAtTime(this.settings[k],this.ctx.currentTime,.03);}
  tone(hz,duration=.12,volume=.12,bus='effects',type='sine',delay=0,cutoff=4000){
    if(!this.ctx||this.ctx.state!=='running'||this.stopped)return;
    const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),v=c.createGain(),f=c.createBiquadFilter();
    o.type=type;o.frequency.value=Math.max(25,hz);f.type='lowpass';f.frequency.value=cutoff;
    v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(volume,t+.009);v.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(f);f.connect(v);v.connect(this.buses[bus]);o.start(t);o.stop(t+duration+.03);
  }
  noise(duration=.08,volume=.1,cutoff=1500){
    if(!this.ctx||this.stopped)return;const c=this.ctx,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);
    let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*.2-.1)*.92;data[i]=last;}
    const n=c.createBufferSource(),f=c.createBiquadFilter(),v=c.createGain();n.buffer=buffer;f.type='bandpass';f.frequency.value=cutoff;f.Q.value=.8;
    v.gain.setValueAtTime(volume,c.currentTime);v.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);n.connect(f);f.connect(v);v.connect(this.buses.effects);n.start();
  }
  note(n,d=.5,v=.2,delay=0,type='triangle'){const hz=440*2**((n-69)/12);this.tone(hz,d,v,'music',type,delay,1800);this.tone(hz*2,d*.7,v*.12,'music','sine',delay,3000);}
  voice(letter,who,index){
    if(!this.ctx||!/[a-z]/i.test(letter)||index%2)return;
    const pitch={Mara:290,Pet:145,Bashir:185,Teddy:245,Voss:210,Vane:230}[who]||200;
    const vowels={a:[750,1200],e:[500,1900],i:[320,2300],o:[500,900],u:[350,800]};
    const form=vowels[letter.toLowerCase()]||vowels[['a','e','i','o','u'][index%5]];
    const c=this.ctx,t=c.currentTime,o=c.createOscillator(),v=c.createGain(),f1=c.createBiquadFilter(),f2=c.createBiquadFilter();
    o.type=who==='Voss'?'sawtooth':'triangle';o.frequency.setValueAtTime(pitch*2**(((index*7)%9-4)/12),t);o.frequency.exponentialRampToValueAtTime(pitch*.84,t+.07);
    f1.type=f2.type='bandpass';f1.frequency.value=form[0];f2.frequency.value=form[1];f1.Q.value=2;f2.Q.value=1.5;
    v.gain.setValueAtTime(.0,t);v.gain.linearRampToValueAtTime(.23,t+.012);v.gain.exponentialRampToValueAtTime(.0001,t+.075);
    o.connect(f1);o.connect(f2);f1.connect(v);f2.connect(v);v.connect(this.buses.voices);o.start(t);o.stop(t+.08);
  }
  cue(kind,tool=0){
    const k={nav:[620,.05,.05],select:[980,.09,.12],back:[260,.09,.1],mistake:[110,.22,.17],rating:[880,.14,.15],phase:[196,.5,.16],complete:[392,.8,.18],gift:[523,1.2,.17],shock:[65,.6,.4],code:[880,.5,.16],flatline:[920,2,.15]}[kind];
    if(k){this.tone(...k);if(['rating','complete','gift'].includes(kind))this.tone(k[0]*1.5,k[1],k[2]*.65,'effects','sine',.07);}
    if(kind==='tool'){this.tone(900+tool*115,.035,.06,'effects','triangle');this.noise(.04,.12,2500);}
    if(kind==='burst'){this.noise(.3,.8,650);this.tone(90,.35,.18);}
  }
  beat(state){
    if(state.code>0){this.tone(700,.09,.10);return;}
    this.tone(65,.12,.38);this.tone(48,.14,.24,'effects','sine',.12);this.tone(1180,.035,.045);
    if(this.settings.rumble&&state.vitals<40){for(const pad of navigator.getGamepads?.()||[])try{pad?.vibrationActuator?.playEffect?.('dual-rumble',{duration:90,weakMagnitude:.12,strongMagnitude:.23});}catch{}}
  }
  update(dt,screen,state){
    if(!this.ctx||this.stopped)return;
    const operation=['operation','attract','dev'].includes(screen),hush=state.gift_left>0&&state.gift_kind!=='Echo';
    if(operation&&state.beats!==this.lastBeat){this.lastBeat=state.beats;this.beat(state);this.music(state,hush);}
    if(!operation){this.clock+=dt;const interval=screen==='story'?.65:.82;if(this.clock>interval){this.clock-=interval;this.music(state,false,screen);}}
    this.lastTool+=dt;
    const s=state.surgeons?.[0];if(operation&&s&&(s.held&1)&&this.lastTool>.2){this.lastTool=0;const t=s.tool;
      if([3,5].includes(t))this.noise(.19,t===3?.25:.14,t===3?450:1200);
      else if([4,6].includes(t))this.tone(t===4?180+550*s.charge:890,.23,.055,'effects','sine');
      else if(t===2)this.noise(.04,.13,3100);else if(t===0)this.noise(.06,.14,2200);else if(t===7)this.noise(.14,.15,3600);
    }
  }
  music(s,hush,screen='operation'){
    const melodies={title:[62,65,69,68,65,62,60,57,58,62,65,64,60,57,53,57],story:[57,60,64,65,64,60,57,53,55,58,62,60],operation:[50,57,62,65,64,62,57,60,53,60,65,69,68,65,60,57],crisis:[50,51,57,56,53,50,49,45]};
    const title=['title','casefiles','settings','about','difficulty','controls','pause'].includes(screen),story=screen==='story';
    const seq=title?melodies.title:story?melodies.story:s.vitals<30?melodies.crisis:melodies.operation;
    const i=this.step++%seq.length;const duration=hush?2.2:story?1.5:.72;
    this.note(seq[i],duration,hush?.16:.2);
    if(i%4===0){this.note(seq[i]-12,1.8,.17);this.note(seq[i]+7,1.5,.055,.12);}
    if(!title&&!story&&s.case>=3){const meter=s.case===3?3:s.case===4?6:s.case===6?5:s.case===7?[3,3,6,7,4,7,5,4][s.phase]||7:4;if(i%meter===0)this.note(seq[i]+12,.3,.07,.03,'sine');}
  }
  peak(){if(!this.analyser)return 0;let a=new Float32Array(this.analyser.fftSize);this.analyser.getFloatTimeDomainData(a);return Math.max(...a.map(Math.abs));}
  stop(){this.stopped=true;if(this.master)this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.05);}
}
