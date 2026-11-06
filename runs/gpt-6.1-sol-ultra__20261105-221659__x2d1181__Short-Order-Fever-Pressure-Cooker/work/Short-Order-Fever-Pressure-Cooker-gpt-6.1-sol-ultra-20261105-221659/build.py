from pathlib import Path
import json
p=Path(__file__).resolve().parent
meta=json.loads((p/'title.json').read_text())
html=(p/'shell.html').read_text().replace('<!--HUB_CLIENT-->','<script>'+(p/'session.js').read_text()+'</script>')
html=html.replace('/*STYLE*/',(p/'style.css').read_text())
modules=[]
for name in ['scene.js','audio.js','network.js','game.js']:
    code=(p/name).read_text().replace('export async function ','async function ').replace('export function ','function ').replace('export class ','class ')
    modules.append(code)
interview=json.loads((p.parent/'exit-interview.json').read_text()) if (p.parent/'exit-interview.json').exists() else {'sourceInformation':{},'testingFeedback':[],'engineFeedback':[],'promptFeedback':[]}
credits="const CREDITS="+json.dumps(interview)+";document.getElementById('source-info').innerHTML=Object.entries(CREDITS.sourceInformation).map(([k,v])=>'<dt>'+k[0].toUpperCase()+k.slice(1)+'</dt><dd>'+v+'</dd>').join('');for(const [key,id] of [['testingFeedback','testing-feedback'],['engineFeedback','engine-feedback'],['promptFeedback','prompt-feedback']])document.getElementById(id).innerHTML=CREDITS[key].map(v=>'<li>'+v+'</li>').join('');"
html=html.replace('/*MODULES*/','\n'.join(modules)+'\n'+credits)
(p.parent/(meta['slug']+'.html')).write_text(html)
print(meta['slug']+'.html')
