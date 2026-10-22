#!/usr/bin/env python3
"""Bundle src/*.js + shell.html + info.json into the single deliverable HTML in the parent folder."""
import json, html, pathlib

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / (HERE.name + '.html')

info = json.loads((HERE / 'info.json').read_text())

def comment_block():
    lines = ['', 'STARK FOX — an original spiritual successor to Star Fox 64 (N64)', '', 'SOURCE INFORMATION']
    lines += ['- ' + l for l in info['source']]
    lines += ['', 'ENGINE FEEDBACK']
    for q, a in info['engine']:
        lines += ['- ' + q, '  ' + a]
    lines += ['', 'PROMPT FEEDBACK']
    for q, a in info['prompt']:
        lines += ['- ' + q, '  ' + a]
    lines.append('')
    txt = '\n'.join(lines).replace('--', '—')
    return '<!--' + txt + '-->'

def to_html(title, rows, qa=False):
    out = [f'<h2>{html.escape(title)}</h2><ul>']
    if qa:
        for q, a in rows:
            out.append(f'<li><b>{html.escape(q)}</b><br>{html.escape(a)}</li>')
    else:
        for l in rows:
            k, _, v = l.partition(':')
            out.append(f'<li><b>{html.escape(k)}:</b>{html.escape(v)}</li>' if v else f'<li>{html.escape(l)}</li>')
    out.append('</ul>')
    return ''.join(out)

info_js = (
    '// ===== generated from info.json =====\n'
    f'const SOURCE_INFO_HTML = {json.dumps(to_html("Source Information", info["source"]))};\n'
    f'const ENGINE_FEEDBACK_HTML = {json.dumps(to_html("Engine Feedback", info["engine"], True))};\n'
    f'const PROMPT_FEEDBACK_HTML = {json.dumps(to_html("Prompt Feedback", info["prompt"], True))};\n'
)

js_parts = []
for f in sorted((HERE / 'src').glob('*.js')):
    js_parts.append(f.read_text())
js = js_parts[0] + '\n' + info_js + '\n' + '\n'.join(js_parts[1:])
if '</script' in js:
    raise SystemExit('JS contains </script')

shell = (HERE / 'shell.html').read_text()
out = shell.replace('<!--__INFO_COMMENT__-->', comment_block()).replace('/*__JS__*/', js)
OUT.write_text(out)
print(f'wrote {OUT} ({len(out)/1024:.0f} KB)')
