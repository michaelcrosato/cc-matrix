import pathlib,re,json
folder=pathlib.Path(__file__).parent
slug=folder.name
sources=[]
for name in ['visuals.js','audio.js','network.js','physics.js','metadata.js','game.js']:
 text=(folder/name).read_text()
 text=re.sub(r'^import\s+.*?from\s+[\'\"]\./[^\n]+\n','',text,flags=re.M)
 text=re.sub(r'^export\s+','',text,flags=re.M)
 sources.append(text)
session=(folder/'hub/session.js').read_text()
html=(folder/'template.html').read_text().replace('<!-- HUB_SESSION -->','<script>\n'+session.replace('</script','<\\/script')+'\n</script>')
html=html.replace('// GAME_CODE','\n\n'.join(sources).replace('</script','<\\/script'))
output=folder.parent/(slug+'.html');output.write_text(html)
# Keep the deliverable metadata machine readable and ensure exact JSON syntax.
json.loads((folder.parent/'exit-interview.json').read_text())
print(output.name+' • '+str(output.stat().st_size)+' bytes')
