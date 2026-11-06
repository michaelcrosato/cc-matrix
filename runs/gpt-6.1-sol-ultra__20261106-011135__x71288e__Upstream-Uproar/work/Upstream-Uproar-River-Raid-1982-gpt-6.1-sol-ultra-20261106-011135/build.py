"""Build the shareable HTML; runtime engine versions stay in the import map."""
import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent
credits = json.loads((root.parent / 'exit-interview.json').read_text())
(root / 'credits.js').write_text('export const CREDITS = ' + json.dumps(credits, ensure_ascii=False) + ';\n')
result = subprocess.run(
    ['bun', 'build', 'main.js', '--target', 'browser', '--format', 'esm',
     '--external', 'three/webgpu', '--external', 'rapier', '--outfile', 'game.bundle.js'],
    cwd=root, capture_output=True, text=True,
)
if result.returncode:
    raise SystemExit(result.stderr)
code = (root / 'game.bundle.js').read_text().replace('</script', '<\\/script')
html = (root / 'shell.html').read_text().replace(
    '<!-- HUB_CLIENT -->', '<script>\n' + (root / 'hub-session.js').read_text() + '\n</script>'
).replace('// GAME_CODE', code)
path = root.parent / (root.name + '.html')
path.write_text(html)
print(path.name + ' · ' + str(path.stat().st_size) + ' bytes')
