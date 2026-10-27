#!/usr/bin/env python3
"""Bundle src/*.js (concatenated in name order, one shared module scope) + css + template into one html file."""
import glob, os, sys
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, 'src')
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', 'StarPaw64-Starfox64-claude-sonnet-5-5-medium-20261026-1350.html')
tpl = open(os.path.join(src, 'index.html')).read()
css = open(os.path.join(src, 'style.css')).read()
js = '\n'.join('// ==== %s ====\n%s' % (os.path.basename(f), open(f).read()) for f in sorted(glob.glob(os.path.join(src, '*.js'))))
info = open(os.path.join(here, 'info.txt')).read() if os.path.exists(os.path.join(here, 'info.txt')) else 'unknown'
import json
js = js.replace('__ABOUT_JSON__', json.dumps(info))
html = tpl.replace('/*CSS*/', css).replace('/*JS*/', js.replace('</script>', '<\\/script>'))
html = '<!--\n' + info.replace('--', '- -') + '\n-->\n' + html
open(out, 'w').write(html)
print('wrote', os.path.abspath(out), len(html)//1024, 'KB')
