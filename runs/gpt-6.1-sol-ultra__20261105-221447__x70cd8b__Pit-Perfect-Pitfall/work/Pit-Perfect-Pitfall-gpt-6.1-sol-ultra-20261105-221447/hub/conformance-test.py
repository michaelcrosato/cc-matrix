"""Run the official AI Hub harness against the bundled game. Prints failures + count."""
from playwright.sync_api import sync_playwright
from urllib.parse import urlencode
import os
import sys

base=(sys.argv[1] if len(sys.argv)>1 else os.environ.get('PIT_TEST_BASE_URL',os.environ.get('PIT_PERFECT_TEST_URL','http://127.0.0.1:44619'))).rstrip('/')
folder='Pit-Perfect-Pitfall-gpt-6.1-sol-ultra-20261105-221447'
name=folder+'.html'
failures=[]
count=0
runs=[('standard',{}),('impaired',{'latency':150,'jitter':50,'loss':5}),('host-leave',{'scenario':'host-leave'})]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--no-sandbox'])
    context=browser.new_context(viewport={'width':1200,'height':800})
    page=context.new_page()
    for label,extra in runs:
        params={'game':'../../'+name+'?webgl=1','players':2,'auto':1,'play':6000,**extra}
        page.goto(f'{base}/{folder}/hub/harness.html?'+urlencode(params),wait_until='domcontentloaded')
        page.evaluate('''window.__sawPlaying={};window.__watch=setInterval(()=>{document.querySelectorAll('iframe').forEach((frame,i)=>{try{const state=frame.contentWindow.__game?.state;if(state?.mode==='playing')window.__sawPlaying[i]=true;}catch{}})},100)''')
        try:
            page.wait_for_function('document.body.dataset.complete==="true"',timeout=85000)
        except Exception:
            failures.append(f'{label}: harness timed out')
            count+=1
            continue
        report=page.evaluate('window.__hubCheck')
        for check in report.get('checks',[]):
            count+=1
            if not check['pass']:
                failures.append(f'{label}: {check["name"]}: {check.get("detail","")}')
        count+=1
        saw=page.evaluate('Object.keys(window.__sawPlaying).length')
        if saw!=2:
            states=page.evaluate('Array.from(document.querySelectorAll("iframe"),f=>{try{return f.contentWindow.__game?.state?.mode || f.contentWindow.__gameError || "loading"}catch{return "unreachable"}})')
            failures.append(f'{label}: expected both games to enter play; saw {saw}, final states {states}')
        count+=1
        ended=page.evaluate('''Array.from(document.querySelectorAll('iframe')).filter(f=>f.contentWindow?.AIHub?.active).every(f=>{const w=f.contentWindow;return !w.__game || (w.__game.network.ended&&w.__game.state.mode==='hub-ended'&&!w.__game.audio.enabled)})''')
        if not ended:
            failures.append(f'{label}: game did not stop input/audio at round end')
        page.evaluate('clearInterval(window.__watch)')
    browser.close()
for failure in failures:
    print('FAIL: '+failure)
print(f'{count-len(failures)}/{count} AI Hub checks passed')
raise SystemExit(bool(failures))
