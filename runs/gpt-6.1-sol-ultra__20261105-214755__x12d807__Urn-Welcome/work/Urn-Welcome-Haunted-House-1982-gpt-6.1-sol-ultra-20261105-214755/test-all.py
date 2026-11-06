"""One command: npm test. Use --suite co-op/hub/game/network for affected suites."""
from pathlib import Path
import argparse,json,re,subprocess,sys
root=Path(__file__).resolve().parent
names={'game':'test-game.py','co-op':'test-coop.py','network':'test-network.py','hub':'test-hub.py'}
parser=argparse.ArgumentParser()
parser.add_argument('--suite',choices=names,action='append')
parser.add_argument('--report-only',action='store_true')
args=parser.parse_args()
report={}
if (args.suite or args.report_only) and (root/'test-results.json').exists():
    report=json.loads((root/'test-results.json').read_text()).get('suites',{})
selected=[] if args.report_only else [names[n] for n in args.suite] if args.suite else list(names.values())
for name in selected:
    (root/'test-progress.json').write_text(json.dumps({'running':name,'completed':report}))
    result=subprocess.run([sys.executable,str(root/name)],cwd=root,text=True,capture_output=True)
    report[name]={'returncode':result.returncode,'output':result.stdout,'errors':result.stderr}
    (root/'test-progress.json').write_text(json.dumps({'running':None,'completed':report},indent=2))
count=0
failures=[]
for name in names.values():
    if name not in report:
        failures.append(name+': no result; run npm test')
        continue
    result=report[name]
    lines=result['output'].splitlines()
    for line in lines:
        match=re.match(r'(\d+) (?:[\w -]+ )?checks, (\d+) failures',line)
        if match:count+=int(match[1])
        elif re.match(r'\d+/(\d+) checks passed;',line):count+=int(re.match(r'\d+/(\d+) checks passed;',line)[1])
        elif line.startswith('FAIL'):failures.append(name+': '+line[5:])
    if result['returncode'] and not any(line.startswith('FAIL') for line in lines):
        failures.append(name+': '+(result['errors'].strip().splitlines()[-1] if result['errors'].strip() else 'process failed'))
try:
    data=json.loads((root.parent/'exit-interview.json').read_text())
    assert set(data)=={'sourceInformation','testingFeedback','engineFeedback','promptFeedback','aiHub'}
    assert all(data['sourceInformation'].values())
    assert [len(data[k]) for k in ['testingFeedback','engineFeedback','promptFeedback']]==[4,6,4]
    count+=1
except Exception as error:failures.append('exit interview JSON: '+str(error))
(root/'test-results.json').write_text(json.dumps({'checks':count,'failures':failures,'suites':report},indent=2))
(root/'test-progress.json').write_text(json.dumps({'running':None,'completed':report},indent=2))
for failure in failures:print('FAIL '+failure)
print(f'{count} checks, {len(failures)} failures')
sys.exit(bool(failures))
