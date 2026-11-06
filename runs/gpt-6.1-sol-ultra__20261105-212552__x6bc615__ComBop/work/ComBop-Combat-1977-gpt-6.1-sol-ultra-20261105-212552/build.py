#!/usr/bin/env python3
"""Bundle local development modules into the single shareable game."""
import json
import pathlib
import re

folder = pathlib.Path(__file__).resolve().parent
root = folder.parent
slug = folder.name
credits = json.loads((root / 'exit-interview.json').read_text())
html = (folder / 'index.html').read_text()
html = html.replace('<!-- HUB_CLIENT -->', '<script>\n' + (folder / 'session.js').read_text() + '\n</script>\n' + '''<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-2">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Score three wrecks. Bank shots around cover and burst past incoming shells.">
<meta name="hub:session-howto" content="Move: left stick / WASD. Aim: right stick / mouse. Fire: R2 / click. Burst: Circle or L2 / Space.">
<meta name="hub:session-minutes" content="3">''')
html = html.replace('/* STYLES */', (folder / 'styles.css').read_text())
imports = "import * as THREE from 'three/webgpu';\nimport RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/+esm';\n"
modules = []
for name in ['audio.js', 'hub.js', 'sim.js', 'view.js', 'app.js']:
    text = (folder / name).read_text()
    text = re.sub(r'^import .*?;\n', '', text, flags=re.M)
    text = re.sub(r'^export ', '', text, flags=re.M)
    text = text.replace('// CREDITS_DATA', 'const CREDITS = ' + json.dumps(credits, ensure_ascii=False).replace('</', '<\\/') + ';')
    modules.append(text)
script = imports + '\n'.join(modules)
html = html.replace('/* APP_MODULE */', script.replace('</script', '<\\/script'))
(root / f'{slug}.html').write_text(html)
(folder / 'bundled-module.js').write_text(script)
print(f'Built {slug}.html ({len(html.encode()):,} bytes)')
