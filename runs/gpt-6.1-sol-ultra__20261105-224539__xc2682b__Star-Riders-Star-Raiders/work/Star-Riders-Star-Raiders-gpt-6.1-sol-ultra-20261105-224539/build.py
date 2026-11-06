"""Bundle first-party modules and UI into the single shareable HTML."""
import json
from pathlib import Path

folder = Path(__file__).resolve().parent
info_path = folder.parent / 'exit-interview.json'
info = json.loads(info_path.read_text()) if info_path.exists() else None
client = (folder / 'vendor/session.js').read_text()
style = (folder / 'ui.css').read_text()
ui = (folder / 'ui.html').read_text()
audio = (folder / 'audio.js').read_text().replace('export class AudioEngine', 'class AudioEngine')
network = (folder / 'network.js').read_text().replace('export class Network', 'class Network')
game = (folder / 'game.js').read_text()
game = game.replace("import { AudioEngine } from './audio.js';", '').replace("import { Network } from './network.js';", '')
credits = ''
if info:
    credits = '\nconst record = ' + json.dumps(info).replace('<', '\\u003c') + ';\n' + '''
const credits = document.getElementById('credits-content');
const section = (title, entries) => { const h=document.createElement('h3');h.textContent=title;credits.append(h); const dl=document.createElement('dl'); for(const [key,value] of entries){const dt=document.createElement('dt');dt.textContent=key;const dd=document.createElement('dd');dd.textContent=value;dl.append(dt,dd);}credits.append(dl);};
section('Source Information', Object.entries(record.sourceInformation));
section('Testing Feedback', record.testingFeedback.map((v,i)=>[['Issues caught','Critical issues','Most helpful test','Least helpful test'][i],v]));
section('Engine Feedback', record.engineFeedback.map((v,i)=>[['Liked most','Wrong turns','Built ourselves','Hardest part','Engine changes','One wish'][i],v]));
section('Prompt Feedback', record.promptFeedback.map((v,i)=>[['Liked most','Confusing','Hardest task','Suggested change'][i],v]));
const p=document.createElement('p');p.textContent='Research: Atari 2600 and Atari 5200 Star Raiders manuals (1982), preserved by AtariAge. Source versions differ; this original demo combines their sector tactics and cockpit combat. All geometry, writing, music and voice are original procedural work.';credits.append(p);
'''
out = f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<script>{client}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Clear the enemy patrols, protect both starbases, and destroy the command ship. Highest mission score wins.">
<meta name="hub:session-howto" content="Left stick fly, right stick aim, R2 fire, L2 track, R1 boost, Triangle chart, Square dock, Options pause. Keyboard: WASD, mouse, Space, E, Shift, M, Enter, Esc.">
<meta name="hub:session-minutes" content="8">
<meta name="description" content="Star Riders: an ink-and-cel space combat sortie. Patrol the frontier, defend your stations and bring everyone home.">
<title>Star Riders — Frontier Command</title>
<script type="importmap">{{"imports":{{"three/webgpu":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js","three":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js"}}}}</script>
<style>{style}
#reticle.locked>i{{background:var(--yellow)}}#reticle.locked{{transform:translate(-50%,-50%) rotate(45deg)}}#reticle.locked #lock-label{{transform:translateX(-50%) rotate(-45deg)}}
.load-error{{max-width:38rem;line-height:1.6;padding:2rem}}.load-error strong{{font-size:2rem;color:var(--orange)}}.load-error p{{margin:1rem 0}}#result-stats strong{{font-family:var(--display);font-size:2.6rem;color:var(--paper)}}
body{{touch-action:none}}#map-detail #map-sector-stats{{color:var(--yellow);line-height:1.7}}
</style></head><body>
{ui}
<script type="module">{audio}\n{network}\n{game}\n{credits}</script>
</body></html>'''
path = folder.parent / (folder.name + '.html')
path.write_text(out)
print(f'Built {path.name} ({len(out):,} bytes)')
