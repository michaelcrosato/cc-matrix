#!/usr/bin/env python3
"""One command; only failures and a final count are printed. Subsets: --rust --web --hub."""
import sys,subprocess,re,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
args=set(sys.argv[1:]);all_parts=not args
passed=failed=0
if all_parts or '--rust' in args:
 r=subprocess.run(['cargo','test','--locked','-p','pav_core','--test','surgery','--test','games'],cwd=ROOT/'engine',capture_output=True,text=True)
 text=r.stdout+r.stderr
 matches=re.findall(r'test result: .*?(\d+) passed; (\d+) failed',text)
 if matches:
  for a,b in matches:passed+=int(a);failed+=int(b)
 else:failed+=1
 if r.returncode:print('FAIL Rust simulation checks\n'+text[-12000:])
for part,script in [('--web','browser_checks.py'),('--hub','hub_checks.py')]:
 if not(all_parts or part in args):continue
 r=subprocess.run([sys.executable,str(ROOT/'tests'/script)],cwd=ROOT,capture_output=True,text=True)
 lines=r.stdout.splitlines();found=False
 for line in lines:
  if line.startswith('FAIL '):print(line)
  if line.startswith('{'):
   try:
    counts=json.loads(line);passed+=counts['passed'];failed+=counts['failed'];found=True
   except (ValueError,KeyError):pass
 if r.returncode or not found:failed+=1;print('FAIL '+script+'\n'+r.stderr[-9000:]+'\n'+r.stdout[-2000:])
print(f'{passed} passed, {failed} failed')
sys.exit(bool(failed))
