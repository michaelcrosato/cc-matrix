from pathlib import Path
import json
p=Path(__file__).resolve().parent
name=p.name
html=(p/'template.html').read_text().replace('/* HUB_CLIENT */',(p/'hub-session.js').read_text()).replace('/* STYLE */',(p/'style.css').read_text()).replace('// GAME_MODULE',(p/'game.js').read_text()).replace('/* CREDITS_JSON */',json.dumps(json.loads((p.parent/'exit-interview.json').read_text()) if (p.parent/'exit-interview.json').exists() else {},ensure_ascii=False))
(p.parent/(name+'.html')).write_text(html)
