from pathlib import Path
import re
p=Path(__file__).resolve().parent
name=p.name
html=(p/'template.html').read_text().replace('<!--HUB-->','<script>'+(p/'session.js').read_text()+'</script>').replace('/*STYLE*/',(p/'style.css').read_text())
js=''
for file,symbol in [('art.js','createArt'),('audio.js','AudioSystem'),('network.js','FestivalNetwork')]:
 code=re.sub(r'^import \* as THREE from [\'"]three[\'"];?\s*','',(p/file).read_text(),flags=re.M)
 code=code.replace('export default AudioSystem;','').replace('export class ','class ').replace('export function ','function ')
 js+=f'const {{ {symbol} }} = (()=>{{\n'+code+f'\nreturn {{ {symbol} }};\n}})();\n'
main=re.sub(r'^import \{.*?\} from [\'"]\./(?:art|audio|network)\.js[\'"];?\s*','',(p/'main.js').read_text(),flags=re.M)
html=html.replace('/*GAME*/',js+'\n'+main)
credits=p.parent/'exit-interview.json'
if credits.exists():html=html.replace('<!--CREDITS-->','<script>window.GAME_CREDITS='+credits.read_text().replace('</','<\\/')+'</script>')
(p.parent/(name+'.html')).write_text(html)
print(name+'.html')
