from pathlib import Path
import json,re
p=Path(__file__).resolve().parent
credits=json.loads((p.parent/'exit-interview.json').read_text())
parts=[]
imports=["import * as THREE from 'three';", "import RAPIER from '@rapier';"]
modules={'art.js':['createMall','createCharacter','createHazard','createPickup'],'audio.js':['AudioDirector','audioSelfTest'],'hub.js':['HubBridge'],'simulation.js':['DEFAULTS','CASES','ChaseGame']}
for filename,names in modules.items():
    s=(p/filename).read_text()
    for line in re.findall(r'^import .*?;\s*$',s,re.M):
        if "'three'" not in line and '"three"' not in line:imports.append(line.strip())
    s=re.sub(r'^import .*?;\s*$', '',s,flags=re.M)
    s=re.sub(r'\bexport\s+(?=(?:async\s+)?(?:class|function|const|let|var)\b)','',s)
    parts.append('const {'+','.join(names)+'}=(()=>{\n'+s+'\nreturn {'+','.join(names)+'};\n})();')
app=(p/'app.js').read_text()
app=re.sub(r'^import .*?;\s*$','',app,flags=re.M).replace('__CREDITS__',json.dumps(credits,ensure_ascii=False))
js='\n'.join(imports+parts+[app])
html=(p/'template.html').read_text().replace('<!--SESSION_CLIENT-->','<script>\n'+(p/'session-client.js').read_text()+'\n</script>').replace('<!--GAME_SCRIPT-->','<script type="module">\n'+js+'\n</script>')
html=html.replace('name="ai-hub-session','name="hub:session').replace('name="ai-hub-goal"','name="hub:session-goal"').replace('name="ai-hub-howto"','name="hub:session-howto"')
out=p.parent/(p.name+'.html');out.write_text(html)
(p/'bundle-check.mjs').write_text(js)
print(out.name)
