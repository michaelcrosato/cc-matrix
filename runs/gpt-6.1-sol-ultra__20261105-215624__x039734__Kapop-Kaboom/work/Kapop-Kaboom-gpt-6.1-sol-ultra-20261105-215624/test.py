"""One command: npm test --silent. Only failures and one final check count."""
from pathlib import Path
import subprocess,sys,re
folder=Path(__file__).resolve().parent
python=sys.executable
commands=[['node','sim.test.mjs'],['node','network.test.mjs'],[python,'browser-test.py'],[python,'hub-integration-test.py']]
failures=[];checks=0
for command in commands:
 try:
  result=subprocess.run(command,cwd=folder,capture_output=True,text=True,timeout=1000)
  output=result.stdout+'\n'+result.stderr
  for line in output.splitlines():
   if line.startswith('FAIL'):failures.append(line)
   match=re.match(r'(\d+) (?:simulation |browser |AI Hub |network |multiplayer integration )?checks',line)
   if match:checks+=int(match.group(1))
  if result.returncode and not any(line.startswith('FAIL') for line in output.splitlines()):
   failures.append('FAIL '+str(command)+': '+output[-2200:].strip())
 except Exception as error:failures.append('FAIL '+str(command)+': '+str(error))
for failure in failures:print(failure)
print(f'{checks} checks, {len(failures)} failures')
sys.exit(1 if failures else 0)
