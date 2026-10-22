#!/usr/bin/env python3
"""Bundle src/*.js + css + three.js + about text into ONE html file in the parent folder."""
import json, glob, os, sys
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
name = os.path.basename(here)
out = os.path.join(root, name + '.html')
rd = lambda p: open(os.path.join(here, p), encoding='utf-8').read()
about = rd('src/about.txt')
assert 'TODO' not in about and 'PLACEHOLDER' not in about
scripts = '\n'.join(rd(f) for f in sorted(os.path.relpath(p, here) for p in glob.glob(os.path.join(here, 'src', '[0-9]*.js'))))
html = rd('src/index.template.html')
html = html.replace('{{ABOUT_COMMENT}}', about.replace('--', '- -')).replace('{{CSS}}', rd('src/style.css')).replace('{{THREE}}', rd('vendor/three.min.js').replace('</script', '<\\/script')).replace('{{ABOUT_JSON}}', json.dumps(about).replace('</', '<\\/')).replace('{{SCRIPTS}}', scripts.replace('</script', '<\\/script'))
open(out, 'w', encoding='utf-8').write(html)
print('wrote', out, len(html) // 1024, 'KB')
