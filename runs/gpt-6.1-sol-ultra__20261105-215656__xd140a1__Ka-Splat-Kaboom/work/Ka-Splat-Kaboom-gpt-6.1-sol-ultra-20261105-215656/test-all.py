"""One entry point; successful suites are cached until their covered code changes."""
import hashlib
import json
import re
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parent
PYTHON='/home/micha/.local/share/pipx/venvs/playwright/bin/python'
cache_file=ROOT/'test-cache.json'
try:
 cache=json.loads(cache_file.read_text())
except (OSError,ValueError):
 cache={}
html=ROOT.parent/(ROOT.name+'.html')
suites=[
 ('model',['node','test-model.mjs'],['model.js','test-model.mjs']),
 ('audio',[PYTHON,'audio-test.py'],['audio.js','audio-test.py']),
 ('network',[PYTHON,'test-network.py'],['online.js','test-network.py','hub/session.js']),
 ('ui',[PYTHON,'test-ui.py'],['test-ui.py',str(html)]),
 ('hub',[PYTHON,'test-game-online.py'],['test-game-online.py',str(html)]),
 ('peers',[PYTHON,'test-game-peer.py'],['test-game-peer.py',str(html)]),
]
failed=0
total=0
for name,cmd,paths in suites:
 h=hashlib.sha256()
 for path in paths:
  h.update((ROOT/path).read_bytes())
 digest=h.hexdigest()
 item=cache.get(name)
 if not item or item.get('hash')!=digest or not item.get('passed'):
  result=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True)
  output=result.stdout+result.stderr
  match=re.search(r'(\d+)/(\d+) .*checks passed',output)
  model_match=re.search(r'(\d+) model checks: (\d+) passed, (\d+) failed',output)
  count=int(match.group(2)) if match else int(model_match.group(1)) if model_match else 1
  passed=result.returncode==0
  item={'hash':digest,'checks':count,'passed':passed}
  cache[name]=item
  if not passed:
   print(f'FAIL: {name} suite')
   print(output.strip())
   failed+=1
 total+=item['checks']
cache_file.write_text(json.dumps(cache,indent=2))
print(f'{total} checks across {len(suites)} suites; {failed} failing suites')
raise SystemExit(bool(failed))
