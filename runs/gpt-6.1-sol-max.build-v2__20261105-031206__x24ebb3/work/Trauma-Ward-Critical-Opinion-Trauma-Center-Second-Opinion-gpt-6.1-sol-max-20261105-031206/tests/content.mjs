import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {ALL_OPS,TOOLS} from '../src/content/ops.js';
import {SCENES,CAST} from '../src/content/story.js';
import {SFX,SONGS} from '../src/content/audio.js';
import {INTERVIEW} from '../src/content/about.js';
import {syllable,wavBytes} from '../src/audio/voice.js';
import {parseSong,renderSound,checkModel,Hud} from '../pixel-engine.js';
import {BUSTS,FIGURES,HAND,TOOL_MODELS} from '../src/content/models.js';
import {aboutPages} from '../src/ui/screens.js';
import {wrap,labelize} from '../src/ui/draw.js';
export async function run(test){
 await test('all stages have complete content and valid tools',()=>{assert.equal(ALL_OPS.length,11);assert.equal(SCENES.length,11);const used=new Set();for(const op of ALL_OPS){assert.ok(op.patient.followUp.S&&op.patient.followUp.C);assert.ok(op.stages.length>=5);for(const st of op.stages){assert.ok(st.title&&st.say);if(st.hint&&st.hint!=='gift'){assert.ok(TOOLS.includes(st.hint));used.add(st.hint);}}}assert.equal(used.size,8);});
 await test('all dialogue speakers, scenes and font characters valid',()=>{for(const sc of SCENES){assert.ok(sc.beats.length>=8&&sc.beats.length<=16);for(const b of sc.beats){assert.ok(CAST[b.who]);assert.ok(b.say.length<105);assert.ok(/^[A-Z0-9 .,:;!?\-+%/()[\]'"#&*=<>]+$/.test(b.say),b.say);}}});
 await test('production content has no unfinished text',()=>{const s=JSON.stringify({ALL_OPS,SCENES,CAST});assert.ok(!/\bTODO\b|placeholder|coming soon|not implemented/i.test(s));});
 await test('engine source identical to shipping archive',()=>{const original=execFileSync('unzip',['-p','engine-kit.zip','pixel-engine/pixel-engine.js'],{maxBuffer:10*1024*1024});assert.ok(original.equals(readFileSync('pixel-engine.js')));});
 await test('all original models satisfy engine data checks',()=>{for(const def of [...Object.values(BUSTS),...Object.values(FIGURES),HAND,...Object.values(TOOL_MODELS)]){const r=checkModel(def);assert.equal(r.problems.length,0,def.id+': '+r.problems.join(', '));}});
 for(const[name,s]of Object.entries(SFX))await test('sound '+name+' renders finite audible PCM',()=>{const pcm=renderSound(s);assert.ok(pcm.length>0);let energy=0;for(const n of pcm){assert.ok(Number.isFinite(n));energy+=n*n;}assert.ok(energy>.0001);});
 for(const[name,song]of Object.entries(SONGS))await test('music '+name+' parses as original song data',()=>{assert.ok(parseSong(song).notes.length>12);});
 await test('all 45 gibberish syllables are finite and non-silent WAV',()=>{for(let t=0;t<3;t++)for(let v=0;v<5;v++)for(let c=0;c<3;c++){const pcm=syllable(t,v,c);assert.ok(pcm.every(Number.isFinite));assert.ok(pcm.reduce((a,b)=>a+b*b,0)>.1);const bytes=wavBytes(pcm);assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert.equal(bytes.length,44+pcm.length*2);}});
 await test('interview exact schema and in-game metadata match',()=>{const d=JSON.parse(readFileSync('../exit-interview.json','utf8'));assert.deepEqual(d,INTERVIEW);assert.deepEqual(Object.keys(d),['sourceInformation','testingFeedback','engineFeedback','promptFeedback','aiHub']);assert.equal(d.sourceInformation.usage,'added on import');assert.equal(d.testingFeedback.length,4);assert.equal(d.engineFeedback.length,6);assert.equal(d.promptFeedback.length,4);for(const v of Object.values(d.sourceInformation))assert.ok(v);});
 await test('all About labels and answers fit without truncation at tablet, laptop and TV size',()=>{const hud=new Hud(null);for(const[width,height]of [[342,256],[427,240],[480,270]])for(const page of aboutPages()){let y=72;const w=Math.min(402,width-24)-27;for(const item of page.items){assert.ok(hud.measure(labelize(item.label)).width<=w,`${page.title}: ${item.label} too wide`);const lines=wrap(hud,item.answer,w);assert.ok(lines.length<=6,`${page.title}: ${item.label} exceeds six lines`);y+=13;assert.ok(y+(lines.length-1)*11+7<=height-23,`${width}x${height} ${page.title}: ${item.label} clipped`);y+=lines.length*11+12;}}});
 await test('single HTML has unmodified session client first and embedded assets/licences',()=>{const html=readFileSync('dist/game.html','utf8'),client=readFileSync('vendor/session.js','utf8');assert.ok(html.includes('<script>\n'+client+'\n</script>'));assert.ok(html.indexOf(client)<html.indexOf('type="module"'));assert.ok(html.includes('hub:session-mode'));assert.ok(html.includes('engine-licenses'));assert.ok(html.includes('data:application/json;base64,'));assert.ok(!/<script[^>]+src=/.test(html));});
}
