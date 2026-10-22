#!/usr/bin/env python3
"""Bundle src/*.js + css + about text into the single deliverable HTML in the parent folder."""
import json, re, sys, html
from pathlib import Path
root = Path(__file__).resolve().parent
src = root / 'src'
name = root.name + '.html'
out = root.parent / name
js_files = sorted(p for p in src.glob('[0-9][0-9]_*.js'))
js = '\n'.join(p.read_text() for p in js_files)
md = (root / 'about.md').read_text()
usage = (root / 'usage.txt').read_text().strip() if (root / 'usage.txt').exists() else 'unknown'
md = md.replace('__USAGE__', usage)
def render(md):
    out, inl = [], False
    for line in md.splitlines():
        if line.startswith('## '):
            if inl: out.append('</ul>'); inl = False
            out.append('<h3>' + html.escape(line[3:]) + '</h3>')
        elif line.startswith('- '):
            if not inl: out.append('<ul>'); inl = True
            body = html.escape(line[2:]); m = re.match(r'([^:?]+[:?])(.*)', body)
            out.append('<li><b>' + m.group(1) + '</b>' + m.group(2) + '</li>' if m else '<li>' + body + '</li>')
        elif line.strip():
            out.append('<p>' + html.escape(line) + '</p>')
    if inl: out.append('</ul>')
    return '\n'.join(out)
about = render(md)
comment = md.replace('--', '- -')
js = js.replace('__ABOUT_JSON__', json.dumps(about))
tpl = (src / 'index.tpl.html').read_text()
page = tpl.replace('__SOURCE_COMMENT__', comment).replace('__CSS__', (src / 'style.css').read_text()).replace('__JS__', js.replace('</script', '<\\/script'))
out.write_text(page)
print('wrote', out, len(page) // 1024, 'KB from', len(js_files), 'modules')
