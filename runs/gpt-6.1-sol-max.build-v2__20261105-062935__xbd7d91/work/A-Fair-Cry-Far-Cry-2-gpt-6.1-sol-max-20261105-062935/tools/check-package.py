from pathlib import Path
import sys,re
page=Path(sys.argv[1]);s=page.read_text();client=Path('hub/session.js').read_text()
first=re.search(r'<script[^>]*>(.*?)</script>',s,re.S)
assert first and first.group(1)==client,'Session client changed or is not first'
assert s.index('<meta charset')<first.start()
assert 'hub:session-mode' in s and 'shared-world' in s
assert 'wasm' in s and len(s)>1000000
print(f'Packed {page.name}: {page.stat().st_size:,} bytes; session client verified.')
