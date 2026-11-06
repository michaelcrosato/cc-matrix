from pathlib import Path
import json
root=Path(__file__).parent
selection=json.loads((root/'selection.json').read_text())
shell=(root/'shell.html').read_text()
session=(root/'hub-session.js').read_text()
html=shell.replace('<!--HUB_SESSION-->','<script>\n'+session+'\n</script>').replace('/*GAME_BUNDLE*/',(root/'bundle.js').read_text().replace('</script','<\\/script'))
out=root.parent/(selection['slug']+'.html')
out.write_text(html)
(root/'index.html').write_text(html)
print(f'Built {out.name} ({len(html):,} bytes)')
