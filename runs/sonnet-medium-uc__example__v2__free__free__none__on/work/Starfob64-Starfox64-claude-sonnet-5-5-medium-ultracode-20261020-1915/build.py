#!/usr/bin/env python3
"""Bundle src/*.js + template.html + about.txt into one self-contained .html in the parent folder."""
import glob, json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
name = os.path.basename(here)
tpl = open(os.path.join(here, 'template.html'), encoding='utf-8').read()
about = open(os.path.join(here, 'about.txt'), encoding='utf-8').read().strip()
files = sorted(glob.glob(os.path.join(here, 'src', '*.js')))
parts = []
for f in files:
    parts.append('// ---- ' + os.path.basename(f) + '\n' + open(f, encoding='utf-8').read())
    if os.path.basename(f).startswith('00_'):
        parts.append('const ABOUT_TEXT = ' + json.dumps(about) + ';\n')
bundle = '\n'.join(parts).replace('</script', '<\\/script')
comment = '\n'.join(l.replace('--', '-–') for l in about.splitlines())
out = tpl.replace('<!--__COMMENT__-->', '<!--\n' + comment + '\n-->').replace('/*__BUNDLE__*/', bundle)
dest = os.path.join(os.path.dirname(here), name + '.html')
open(dest, 'w', encoding='utf-8').write(out)
print('wrote', dest, len(out), 'bytes')
