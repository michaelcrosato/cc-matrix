import {syllable,wavURL} from './voice.js';
import {SFX,SONGS} from '../content/audio.js';
import {CAST} from '../content/story.js';
export class AudioDirector{
 constructor(audio,settings){this.audio=audio;this.settings=settings;this.line=null;this.age=0;this.lastBeat=-1;this.current='';this.loopVoice=null;this.loopName='';this.nextVoice=0;}
 async init(){
  for(const[k,v]of Object.entries(SFX))this.audio.register(k,v);
  for(let t=0;t<3;t++)for(let v=0;v<5;v++)for(let c=0;c<3;c++)await this.audio.load(`syl-${t}-${v}-${c}`,wavURL(syllable(t,v,c)));
  this.audio.setVolume('music',this.settings.music);this.audio.setVolume('sfx',this.settings.sound);
 }
 say(who,text){this.line={who:CAST[who]?who:'reyes',text,i:0,t:0};this.nextVoice=0;}
 music(name,bpm=null){if(this.current===name+(bpm||''))return;this.current=name+(bpm||'');this.audio.playMusic(name?{...SONGS[name],...(bpm?{bpm}:{})}:null,name);}
 update(dt,mode,s=null){
  this.age+=dt;const l=this.line;if(l){l.t+=dt;this.nextVoice-=dt;const c=CAST[l.who];
   if(this.nextVoice<=0&&l.i<l.text.length){const char=l.text[l.i++],n=char.charCodeAt(0);this.nextVoice=(char==='.'?.13:char===' '?.035:.065)/c.speed;
    if(/[a-z]/i.test(char))this.audio.play(`syl-${c.voice}-${n%5}-${Math.floor(n/5)%3}`,{pitch:c.pitch+Math.sin(l.i*2.3)*1.8,volume:this.settings.voices*.45,pan:l.who==='ilya'?-.12:.12});
   }if(l.i>=l.text.length)this.line=null;
  }
  if(mode==='operation'&&s){
   const vitals=Math.min(...s.vitals),beat=Math.floor(s.elapsed*(vitals<30?2:1));if(beat!==this.lastBeat){this.lastBeat=beat;this.audio.play(s.blue?'flatline':'beep',{pitch:vitals<30?3:0});}
   const seat=s.seats[0],tool=seat?.using&&!s.blue?seat.tool:'';
   const loop=['drain','laser','gel','scanner'].includes(tool)?tool:s.quiet?'quiet':'';
   if(loop!==this.loopName){this.loopVoice?.stop();this.loopVoice=loop?this.audio.loop(loop,{volume:.8,pan:seat.x/12}):null;this.loopName=loop;}
   const boss=s.entities.find(e=>!e.done&&(e.k==='strain'||e.k==='eye'||e.k==='plate'));
   const desired=s.id==='op10'?'gentle':s.id==='op9'?(s.stage===0?'':s.stage>1?'miserere':'tense'):s.blue?'critical':boss?.k==='plate'?'wrath':boss?.k==='eye'?'lacrimosa':boss?'introit':vitals<30?'critical':vitals<55?'tense':'calm';
   if(!this.current||Math.floor(this.age/2.72)!==Math.floor((this.age-dt)/2.72))this.music(desired,desired==='wrath'?s.bpm:null);
  }else{
   if(this.loopVoice){this.loopVoice.stop();this.loopVoice=null;this.loopName='';}
   this.music(mode==='story'?'ward':mode==='results'?'results':mode==='briefing'?'calm':'title');
  }
 }
 event(e){
  const a=this.audio;
  if(e.type==='rating')a.play(e.quality==='CLEAN'?'clean':'suture',{pitch:Math.min(12,e.points/20-5)});
  if(e.type==='complete')a.play(['hook','prop','magnet','organ','nerve'].includes(e.kind)?'tink':e.kind==='incision'?'scalpel':'suture');
  if(e.type==='stitch')a.play('suture',{pitch:(e.n%8)*2});
  const map={mistake:'error',wrong:'move',blue:'alarm',shock:'shock',revived:'inject',knock:'knock',rewind:'rewind',inject:'inject',draw:'draw',scan:'scanner',grab:'forceps',tether:'tink',lance:'scalpel',massage:'quiet',saved:'stamp',lost:'flatline'};
  if(map[e.type])a.play(map[e.type]);
 }
 stop(){this.line=null;this.audio.playMusic(null);this.audio.stopLoops();this.loopVoice=null;this.loopName='';this.current='';}
}
