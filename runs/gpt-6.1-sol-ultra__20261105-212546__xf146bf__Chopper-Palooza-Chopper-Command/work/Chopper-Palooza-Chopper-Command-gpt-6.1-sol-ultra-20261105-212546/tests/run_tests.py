"""Single quiet entry point for all game, audio, controller and network checks."""
import os,re,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];os.chdir(root)
total=passed=0
for script in ['tests/core-check.py','hub-reference/test-online.py','tests/hub-check.py','tests/visual-check.py']:
 p=subprocess.run([sys.executable,script],capture_output=True,text=True)
 output=p.stdout+p.stderr
 match=re.search(r'(\d+)\s*/\s*(\d+)[^\n]*(?:passed|checks)',output,re.I)
 if match: passed+=int(match[1]);total+=int(match[2])
 else:
  # The adapter runner emits "13/13 online checks passed"; other forms are a failure.
  total+=1
 if p.returncode:
  lines=[l for l in output.splitlines() if l.startswith('FAIL')]
  print('\n'.join(lines) if lines else f'FAIL {script}: {output[-2500:]}')
print(f'{passed}/{total} checks passed')
sys.exit(passed!=total)
