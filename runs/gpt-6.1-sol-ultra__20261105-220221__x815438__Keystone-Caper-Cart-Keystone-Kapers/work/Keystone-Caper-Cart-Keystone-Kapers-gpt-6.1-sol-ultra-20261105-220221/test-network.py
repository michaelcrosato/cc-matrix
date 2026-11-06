import sys
from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:44031/Keystone-Caper-Cart-Keystone-Kapers-gpt-6.1-sol-ultra-20261105-220221/net-test.html'
failures=[]
checks=0

def check(condition, message):
    global checks
    checks+=1
    if not condition: failures.append(message)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context()
    page=context.new_page()
    page.goto(url)
    page.wait_for_function('window.ready === true')
    check(page.title()=='Keystone network integration tests','Wrong page loaded')
    page.evaluate('create(); nets[0].host()')
    code=page.evaluate('nets[0].code')
    check(len(code)==6,'Room code not six characters')
    for _ in range(3):
        page.evaluate('(code)=>{ const i=create(); return nets[i].join(code); }',code)
    page.wait_for_function('nets[0].players.length===4')
    check(page.evaluate('nets.map(n=>n.me).join(",")')=='0,1,2,3','Four officers received unique stable seats')
    check(page.evaluate('nets.every(n=>n.players.length===4)'),'Roster not synchronized to four officers')
    page.evaluate('nets[0].start({count:4})')
    page.wait_for_function('nets.every(n=>n.started)')
    check(page.evaluate('events.every(es=>es.some(e=>e.name==="onStart"))'),'Start was not received by each copy')
    page.evaluate('nets[1].sendInput({x:99,jump:true}); nets[2].sendInput({x:-99,duck:true}); nets[3].sendInput({x:0,action:true}); nets[0].sendState({round:2,score:123})')
    page.wait_for_function('events[0].filter(e=>e.name==="onInput").length===3')
    check(page.evaluate('events[0].filter(e=>e.name==="onInput").map(e=>e.args[1]).sort().join(",")')=='1,2,3','Inputs did not map to each seat')
    check(page.evaluate('events[0].filter(e=>e.name==="onInput").every(e=>Math.abs(e.args[0].x)<=1)'),'Input axis not clamped')
    page.wait_for_function('events.slice(1).every(es=>es.some(e=>e.name==="onState"&&e.args[0].round===2))')
    check(True,'State broadcast')
    page.evaluate('nets[0].finish(456,true)')
    page.wait_for_function('events.slice(1).every(es=>es.some(e=>e.name==="onFinish"&&e.args[0].score===456))')
    check(True,'Co-op finish broadcast')
    page.evaluate('nets.forEach(n=>n.leave())')
    check(page.evaluate('nets.every(n=>n.role==="offline")'),'Room teardown did not restore offline state')
    context.close()
    browser.close()
for failure in failures: print('FAIL: '+failure)
print(f'{checks-len(failures)}/{checks} network checks passed; {len(failures)} failures')
sys.exit(bool(failures))
