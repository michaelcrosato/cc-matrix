export const SPEAKERS = { Ounce:[340,13,1.25],Coach:[165,7.5,.9],Marguerite:[230,9,1],Dennis:[120,11,.95],June:[300,10,1.15],Kevin:[500,5,1.5] };
const FORMANTS = { a:[800,1200],e:[500,1900],i:[300,2300],o:[500,900],u:[350,800] };
const hash = s => [...s.toLowerCase()].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
export function syllabify(text,speaker='Ounce') {
  const [pitch,rate,shift]=SPEAKERS[speaker]||SPEAKERS.Ounce,out=[];let t=0;const words=[...text.matchAll(/[a-zA-Z']+|[.,!?]/g)];
  for(const match of words){const word=match[0],index=match.index;if(/^[.,!?]$/.test(word)){t+=word==='.'?.14:.1;continue;}const h=hash(word),count=Math.max(1,Math.min(4,(word.match(/[aeiouy]+/gi)||['a']).length));for(let k=0;k<count;k++){const charIndex=index+Math.floor(word.length*k/count),decl=speaker==='June'||speaker==='Coach'?1:1-.15*charIndex/Math.max(1,text.length);out.push({t,dur:.75/rate,f0:pitch*decl*(.96+((h>>k)&7)*.012),vowel:'aeiou'[(h+k)%5],cons:(h+k)%3,charIndex,shift});t+=1/rate;} }
  if(text.trim().endsWith('?'))out.slice(-2).forEach((s,i)=>s.f0*=1.25+i*.08);if(text.trim().endsWith('!'))out.forEach(s=>s.f0*=1.15);return out;
}
export function renderVoice(ctx,destination,syllables,when=ctx?.currentTime||0) {
  if(!ctx||!destination)return [];
  const nodes=[];for(const s of syllables){const start=when+s.t,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sawtooth';osc.frequency.setValueAtTime(s.f0,start);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.6,start+.006);gain.gain.setValueAtTime(.6,start+Math.max(.007,s.dur-.03));gain.gain.linearRampToValueAtTime(0,start+s.dur);for(const f of FORMANTS[s.vowel]){const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=f*s.shift;filter.Q.value=3;osc.connect(filter);filter.connect(gain);}gain.connect(destination);osc.start(start);osc.stop(start+s.dur+.01);nodes.push(osc);if(s.cons){const len=Math.ceil(ctx.sampleRate*(s.cons===1?.008:.04)),buffer=ctx.createBuffer(1,len,ctx.sampleRate),data=buffer.getChannelData(0);let a=hash(s.vowel+String(s.charIndex));for(let i=0;i<len;i++){a=Math.imul(a,1664525)+1013904223;data[i]=((a>>>0)/4294967296*2-1)*.12*(1-i/len);}const n=ctx.createBufferSource();n.buffer=buffer;n.connect(destination);n.start(start);nodes.push(n);}}return nodes;
}
export class Voice {
  syllabify(text,speaker){return syllabify(text,speaker);}
  render(ctx,destination,syllables,when){return renderVoice(ctx,destination,syllables,when);}
  constructor(app){this.app=app;this.nodes=[];this.gain=null;this.context=null;}
  stop(){for(const n of this.nodes)try{n.stop();}catch{}this.nodes=[];}
  say(ctx,text,speaker='Ounce'){this.stop();const syllables=syllabify(text,speaker);if(!ctx?.audio?.context)return syllables;if(this.context!==ctx.audio.context){this.context=ctx.audio.context;this.gain=this.context.createGain();this.gain.connect(ctx.audio.buses?.sfx||this.context.destination);}this.gain.gain.value=this.app.settings.voice;this.nodes=renderVoice(this.context,this.gain,syllables);return syllables;}
}
