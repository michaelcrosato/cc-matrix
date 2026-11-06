import pathlib,subprocess,sys,re,json
root=pathlib.Path(__file__).resolve().parents[1];part=sys.argv[1] if len(sys.argv)>1 else'all';passed=0;failed=0
jobs=[]
if part in('all','core'):jobs.append(('core',['cargo','test','--locked','-q','-p','pav_core','--test','fit','--','--test-threads=1'],root/'engine'));jobs.append(('audio-ui',['cargo','test','--locked','-q','-p','pav_audio','-p','pav_ui','--','--test-threads=1'],root/'engine'))
if part in('all','browser'):jobs.append(('browser',['python3','tests/browser.py'],root))
if part in('all','hub'):jobs.append(('hub',['python3','tests/hub.py'],root))
for name,cmd,cwd in jobs:
 result=subprocess.run(cmd,cwd=cwd,text=True,capture_output=True,env={**__import__('os').environ,'CARGO_BUILD_JOBS':'4','PLAYWRIGHT_HOST_PLATFORM_OVERRIDE':'ubuntu24.04-x64'})
 (root/'notes'/f'test-{name}.log').write_text(result.stdout+result.stderr)
 counts=re.findall(r'(\d+) passed[,;] (\d+) failed',result.stdout)
 if counts:
  for a,b in counts:passed+=int(a);failed+=int(b)
 elif result.returncode==0:
  counts=re.findall(r'test result: ok\. (\d+) passed',result.stdout);passed+=sum(map(int,counts))or 1
 if result.returncode and not any(int(b)for a,b in counts):failed+=1
 if result.returncode:print(f'FAIL {name}:\n{result.stdout}\n{result.stderr}')
print(f'{passed} passed, {failed} failed');sys.exit(1 if failed else 0)
