function synthVoice(ctx,destination,kind,freq,at,dur=.3,vol=.2,seed=19) {
  const gain=ctx.createGain();gain.connect(destination);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(vol,at+Math.min(.08,dur*.15));gain.gain.exponentialRampToValueAtTime(.0001,at+dur);
  const nodes=[],rng=E.rng(seed);
  const osc=(f,type='sine',amount=1,detune=0)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,at);o.detune.value=detune;g.gain.value=amount;o.connect(g);g.connect(gain);o.start(at);o.stop(at+dur+.05);nodes.push(o);return o;};
  if(kind==='bell')for(const [ratio,amp] of [[1,1],[2.76,.45],[4.07,.25],[5.43,.13],[8.21,.06]])osc(freq*ratio,'sine',amp);
  else if(kind==='organ'){for(const [mul,amp] of [[1,.7],[2,.35],[3,.15],[4,.1]])osc(freq*mul,'sine',amp);}
  else if(kind==='choir'||kind==='voice'){
    for(const detune of [-6,6]){const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=freq;o.detune.value=detune;
      for(const [ff,amp] of [[kind==='voice'?650:480,.38],[kind==='voice'?1550:1120,.2],[2450,.08]]){const filter=ctx.createBiquadFilter(),g=ctx.createGain();filter.type='bandpass';filter.frequency.value=ff*(.88+rng()*.2);filter.Q.value=4;g.gain.value=amp;o.connect(filter);filter.connect(g);g.connect(gain);}o.start(at);o.stop(at+dur+.05);nodes.push(o);}
  }else if(kind==='strings'){const o=osc(freq,'sawtooth',.28,-5);osc(freq,'sawtooth',.25,5);const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=600;gain.disconnect();gain.connect(filter);filter.connect(destination);}
  else if(kind==='drum'){const o=osc(freq,'sine',1);o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*.28),at+dur);}
  else if(kind==='lute'){
    const rate=ctx.sampleRate,period=Math.max(4,Math.floor(rate/freq)),len=Math.floor(rate*dur),buf=ctx.createBuffer(1,len,rate),data=buf.getChannelData(0);
    for(let i=0;i<period&&i<len;i++)data[i]=(rng()*2-1)*.6;
    for(let i=period;i<len;i++)data[i]=(data[i-period]+data[Math.max(0,i-period+1)])*.497;
    const s=ctx.createBufferSource();s.buffer=buf;s.connect(gain);s.start(at);nodes.push(s);
  }else if(kind==='noise'||kind==='wind'){
    const buf=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*dur),ctx.sampleRate),data=buf.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(rng()*2-1);
    const s=ctx.createBufferSource(),filter=ctx.createBiquadFilter();s.buffer=buf;filter.type=kind==='wind'?'lowpass':'bandpass';filter.frequency.value=freq;filter.Q.value=.7;s.connect(filter);filter.connect(gain);s.start(at);nodes.push(s);
  }else osc(freq,'triangle',.5);
  return {gain,nodes,stop(){for(const n of nodes)try{n.stop();}catch{}try{gain.disconnect();}catch{}}};
}
const VOICES={
 'Mother Quillon':{pitch:104,pace:.058},'Beadle Crake':{pitch:76,pace:.105},'Regent Sallow':{pitch:214,pace:.083},'The Angelus':{pitch:47,pace:.13},
 'Bram Tolliver':{pitch:112,pace:.06},'Brother Iven':{pitch:180,pace:.075},'Wren Ashby':{pitch:226,pace:.047},'Maud Harrow':{pitch:143,pace:.07},
 'Ysolde Tarrow':{pitch:174,pace:.065},'Old Penny':{pitch:169,pace:.047},'Sister Agnes':{pitch:195,pace:.08},'Narrator':{pitch:91,pace:.09}
};
const SCORES={
 title:[0,3,7,2,0,-5,3,2],town:[0,7,3,10,7,5,3,2],acre:[0,0,3,-2,0,7,3,-5],nave:[0,-5,3,2,0,-2,-5,-7],crypt:[0,1,-5,0,3,2,-5,-2],
 salt:[0,2,7,5,2,-2,0,-5],works:[0,0,-2,3,0,-5,-2,2],regent:[0,3,7,8,7,3,1,-2],heaven:[0,7,10,12,7,5,3,2],angelus:[0,-5,1,7,0,3,-2,-7],
 vigil:[0,3,0,7,-2,3,5,2],ending:[0,4,7,12,11,7,4,2],fields:[0,4,7,9,7,4,2,4]
};
const audio={
 ctx:null,buses:{},voices:[],cue:'title',stepN:0,next:0,hush:false,stopped:false,
 setup(){
   if(this.ctx||!game?.audio.ready)return !!this.ctx;this.ctx=game.audio.ctx;const c=this.ctx;
   const impulse=c.createBuffer(2,Math.floor(c.sampleRate*3.5),c.sampleRate),r=E.rng(1441);
   for(let ch=0;ch<2;ch++){const d=impulse.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(r()*2-1)*Math.pow(1-i/d.length,3)*.32;}
   for(const name of ['music','sfx','voice']){const input=c.createGain(),filter=c.createBiquadFilter(),gain=c.createGain(),rev=c.createConvolver(),wet=c.createGain();filter.type='lowpass';filter.frequency.value=18000;gain.gain.value=1;rev.buffer=impulse;wet.gain.value=name==='voice'?.16:.1;input.connect(filter);filter.connect(gain);gain.connect(game.audio.bus(name));filter.connect(rev);rev.connect(wet);wet.connect(game.audio.bus(name));this.buses[name]={input,filter,gain,wet};}
   this.next=c.currentTime+.1;return true;
 },
 tone(kind,freq,dur=.3,vol=.2,bus='sfx',at=null,seed=19){if(this.stopped||!this.setup())return;const v=synthVoice(this.ctx,this.buses[bus].input,kind,freq,at??this.ctx.currentTime,dur,vol,seed);this.voices.push({v,end:(at??this.ctx.currentTime)+dur+.2});return v;},
 bell(freq=180,vol=.16){this.tone('bell',freq,1.3,vol);},
 sound(kind,power=1){
   if(kind==='hit'){this.tone('noise',1100,.07,.12*power);this.tone('drum',100,.1,.18*power);this.tone('bell',310+power*30,.25,.055);}
   else if(kind==='swing'){this.tone('noise',800,.11,.05);}
   else if(kind==='break'){this.tone('noise',2200,.2,.13);this.tone('drum',75,.17,.1);}
   else if(kind==='penny')this.tone('bell',700,.15,.025);
   else if(kind==='relic'){this.tone('bell',130,3,.3);this.tone('choir',220,2,.15);this.tone('bell',330,2,.13);}
   else if(kind==='level'){[0,4,7,12].forEach((n,i)=>this.tone('bell',220*Math.pow(2,n/12),1,.12,'sfx',this.ctx?this.ctx.currentTime+i*.11:null));}
   else if(kind==='heal'){this.tone('choir',330,.6,.08);this.tone('bell',660,.6,.08);}
   else if(kind==='evade')this.tone('wind',1700,.16,.08);
   else if(kind==='portal'){this.tone('bell',145,2,.18);this.tone('choir',147,1.5,.09);}
   else if(kind==='death'){this.tone('bell',73,3,.16);}
   else if(kind==='select')this.tone('bell',440,.09,.03);
 },
 speak(name,text){
   if(!this.setup()||this.stopped)return;
   const p=VOICES[name]||{pitch:120+hash(name)%130,pace:.067},r=E.rng(hash(name+text));let at=this.ctx.currentTime+.03;
   for(let i=0;i<Math.min(110,text.length);i+=2){const ch=text[i];if(/[.,!?]/.test(ch)){at+=.13;continue;}if(ch===' '){at+=.02;continue;}const vowel=(text.charCodeAt(i)%5),pitch=p.pitch*Math.pow(2,(vowel-2)/12)*(1+(r()-.5)*.08);this.tone('voice',pitch,p.pace*1.25,.07,'voice',at,hash(ch));if(name==='The Angelus')this.tone('bell',pitch*.5,.4,.035,'voice',at);at+=p.pace;}
 },
 setCue(cue){if(cue!==this.cue){this.cue=cue;this.stepN=0;this.next=this.ctx?this.ctx.currentTime+.1:0;}},
 update(){
   if(this.stopped||!this.setup())return;const c=this.ctx,hush=!!(W&&(W.hush>0||getMain()?.silenced||!getMain()?.alive));
   for(const b of Object.values(this.buses)){b.filter.frequency.setTargetAtTime(hush?650:18000,c.currentTime,.12);b.gain.gain.setTargetAtTime(hush?.17:1,c.currentTime,.1);b.wet.gain.setTargetAtTime(W&&['nave','crypt','chamber'].includes(W.zone)?.23:.1,c.currentTime,.3);}
   if(hush&&!this.hush)this.tone('bell',2250,.6,.018);this.hush=hush;
   const cue=this.cue,notes=SCORES[cue]||SCORES.acre,combat=W&&W.heroes.some(h=>h.combat>0),bpm=['works','vigil'].includes(cue)?80:cue==='town'?72:64,step=60/bpm;
   if(this.next<c.currentTime-.3)this.next=c.currentTime+.03;
   while(this.next<c.currentTime+.18){const n=this.stepN++,f=110*Math.pow(2,notes[n%notes.length]/12),at=this.next;
     this.tone(cue==='town'?'lute':cue==='salt'?'organ':'strings',f,step*2,.12,'music',at,n+8);
     if(n%4===0){this.tone('bell',f*2,step*3,.15,'music',at);this.tone('choir',f*2,step*3.7,.1,'music',at);this.tone('organ',55,step*4,.09,'music',at);}
     if(combat||['works','vigil','regent','angelus'].includes(cue))this.tone('drum',n%2?90:60,.35,.14,'music',at);
     if(W&&['salt','acre','title'].includes(cue)&&n%4===0)this.tone('wind',cue==='salt'?280:950,step*4,.035,'music',at,n);
     this.next+=step;
   }
   this.voices=this.voices.filter(e=>e.end>c.currentTime);
 },
 stop(){this.stopped=true;for(const e of this.voices)e.v.stop();this.voices=[];for(const b of Object.values(this.buses))b.gain.gain.value=0;},
 resume(){this.stopped=false;for(const b of Object.values(this.buses))b.gain.gain.value=1;this.next=this.ctx?this.ctx.currentTime+.05:0;}
};
