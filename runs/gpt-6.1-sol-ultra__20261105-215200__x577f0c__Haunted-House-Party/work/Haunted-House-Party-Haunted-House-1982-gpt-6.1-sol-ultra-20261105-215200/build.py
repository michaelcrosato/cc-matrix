from pathlib import Path
import json,re
folder=Path(__file__).resolve().parent
project=json.loads((folder/'project.json').read_text())
credits=folder/'credits.json'
metadata=json.loads(credits.read_text()) if credits.exists() else {'sourceInformation':{'date':'2026-11-05 21:52:00','source':'Haunted House (Atari, 1982)','plan':'none','genre':'Survival horror, puzzle adventure','perspective':'Isometric third-person','tech':'Three.js r180 WebGPURenderer; WebGPU with WebGL 2 fallback; Rapier 0.19.3; Gamepad API; Web Audio; AI Hub Session 1.4.0; PeerJS 1.5.5','artDirection':'Procedural cel-shaded / ink-outlined 3D mansion','animation':'Three.js AnimationMixer, AnimationClip and keyframe tracks','audio':'Procedural Web Audio music (10% default), effects, gibberish voices; no audio files','online':'AI Hub shared-world 1–4; standalone WebRTC and local co-op 1–2','testing':'Headless scripted state/playthrough, keyboard/gamepad/touch, procedural audio, WebGPU, WebGL visual checks and official AI Hub harness','research':'Atari official source page, original 1982 instruction manual, AI Hub documentation','environment':'Codex CLI (headless); Linux','model':'OpenAI, gpt-6.1-sol, reasoning effort ultra','usage':'added on import'},'testingFeedback':['unknown'],'engineFeedback':['unknown'],'promptFeedback':['unknown']}
parts=[]
for name in ['scene.js','audio.js','network.js','main.js']:
    text=(folder/name).read_text()
    text=re.sub(r'^export (?=(async )?function|const |class )','',text,flags=re.M)
    parts.append(text)
js='\n'.join(parts)
js='window.GAME_CREDITS='+json.dumps(metadata).replace('</','<\\/')+';\n'+js
session=(folder/'session.js').read_text()
html='<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>'+session+'</script>\n'
html+='''<script>if(window.AIHub&&AIHub.active)window.__hubEarlyConnect=AIHub.connect({mode:'shared-world',seats:[1,4]});</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0a171f"><title>Haunted House Party</title>
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-goal" content="Join three pieces of the family urn and escape with your party."><meta name="hub:session-howto" content="Left stick / WASD to move; Cross / E interact; Square / Space light; Circle / Shift dodge; Triangle / Q drop; L1 / Tab journal."><meta name="hub:session-minutes" content="8">
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js","three/webgpu":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js","three/tsl":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.tsl.js"}}</script>
'''
html+='<style>\n'+(folder/'style.css').read_text()+'\n</style></head><body>\n'+(folder/'body.html').read_text()+'\n<script type="module">\n'+js.replace('</script','<\\/script')+'\n</script></body></html>'
output=folder.parent/project['html']
output.write_text(html)
print('Built '+output.name+' ('+str(len(html.encode()))+' bytes)')
