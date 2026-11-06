from pathlib import Path
import json, html
p=Path(__file__).parent
root=p.parent
info=json.loads((root/'exit-interview.json').read_text()) if (root/'exit-interview.json').exists() else {'sourceInformation':json.loads((p/'credits.json').read_text()),'testingFeedback':['Testing in progress.'],'engineFeedback':['Testing in progress.'],'promptFeedback':['Testing in progress.']}
qtests=['Issues caught','Critical issues','Most helpful test','Least helpful test']
qengine=['What worked well','Where we got stuck','Built for this game','Hardest engine work','Engine changes','One engine improvement']
qprompt=['What worked well','What was confusing','Hardest requirement','Suggested change']
credits='<section><h3>Source Information</h3><dl>'+''.join('<dt>'+html.escape(k[0].upper()+k[1:])+':</dt><dd>'+html.escape(str(v))+'</dd>' for k,v in info['sourceInformation'].items())+'</dl></section>'
credits+='<section>'+''.join('<h3>'+title+'</h3>'+''.join('<p class="qa"><strong>'+html.escape(q)+':</strong>'+html.escape(a)+'</p>' for q,a in zip(qs,info[key])) for title,key,qs in [('Testing Feedback','testingFeedback',qtests),('Engine Feedback','engineFeedback',qengine),('Prompt Feedback','promptFeedback',qprompt)])+'</section>'
module='\n'.join((p/f).read_text().replace('export class ','class ') for f in ['audio.js','net.js','scene.js','main.js'])
import re
module=re.sub(r"^import .*?from ['\"]\./.*?['\"];\n",'',module,flags=re.M)
# Scope each module's helpers to avoid accidental name collisions.
parts=[]
for name,cls in [('audio.js','Sound'),('net.js','Network'),('scene.js','Coast')]:
 s=(p/name).read_text();s=re.sub(r"^import .*?;\n",'',s,flags=re.M);s=s.replace('export class ','class ')
 parts.append('const '+cls+' = (()=>{\n'+s+'\nreturn '+cls+';})();')
main=(p/'main.js').read_text();main=re.sub(r"^import .*?;\n",'',main,flags=re.M)
module="import * as THREE from 'three/webgpu';\nimport {color,normalWorld,vec3} from 'three/tsl';\nimport RAPIER from 'rapier';\n"+'\n'.join(parts)+'\n'+main
imports={'imports':{'three':'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js','three/webgpu':'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js','three/tsl':'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.tsl.js','rapier':'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs'}}
base=(p/'template.html').read_text().replace('__HUB__',(p/'hub-session.js').read_text()).replace('__CREDITS__',credits).replace('__MODULE__',module)
output=root/(p.name+'.html');output.write_text(base.replace('__IMPORTMAP__',json.dumps(imports)))
local={'imports':{k:'./vendor/'+('rapier.js' if k=='rapier' else 'three.tsl.js' if k=='three/tsl' else 'three.webgpu.js') for k in imports['imports']}}
(p/'dev.html').write_text(base.replace('__IMPORTMAP__',json.dumps(local)))
print(output.name)
