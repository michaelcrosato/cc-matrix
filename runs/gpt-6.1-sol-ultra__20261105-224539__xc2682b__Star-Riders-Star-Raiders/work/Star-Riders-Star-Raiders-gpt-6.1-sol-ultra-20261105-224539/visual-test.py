"""Optional aesthetic inspection captures; functional checks live in tests.py."""
from pathlib import Path
from playwright.sync_api import sync_playwright

DEV=Path(__file__).resolve().parent
URL=(DEV.parent/(DEV.name+'.html')).as_uri()+'?webgl=1'
count=0
failures=[]

def frames(page,n=3):
    page.evaluate('''n=>new Promise(resolve=>{const tick=()=>--n<=0?resolve():requestAnimationFrame(tick);requestAnimationFrame(tick);})''',n)

def shot(page,name):
    global count
    count+=1
    try:
        frames(page,3)
        page.screenshot(path=str(DEV/('visual-'+name+'.png')))
    except Exception as e:
        failures.append(name)
        print('FAIL '+name+': '+str(e).splitlines()[0])

def init(page):
    page.goto(URL,wait_until='domcontentloaded',timeout=90000)
    page.wait_for_function('window.__STAR_RIDERS__?.state.ready',timeout=90000)
    page.evaluate('window.__STAR_RIDERS__.state.idle=0')
    frames(page,5)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--enable-webgl','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage'])
    context=browser.new_context(viewport={'width':1920,'height':1080},device_scale_factor=1)
    page=context.new_page()
    init(page)
    shot(page,'desktop-title')
    page.evaluate('''()=>{const g=__STAR_RIDERS__;g.start();g.state.paused=true;g.step(0);}''')
    shot(page,'desktop-cockpit')
    page.evaluate('__STAR_RIDERS__.action("map")')
    shot(page,'desktop-chart')
    page.evaluate('''()=>{const g=__STAR_RIDERS__;g.action('back');g.enterSector(0);g.state.paused=true;g.step(0);}''')
    shot(page,'desktop-station')
    page.evaluate('''()=>{const g=__STAR_RIDERS__;g.dock();g.state.paused=false;for(let i=0;i<120;i++)g.step(1/60);g.state.paused=true;}''')
    shot(page,'desktop-docking')
    page.evaluate('''()=>{const g=__STAR_RIDERS__;g.state.dock=0;g.state.finale=true;g.sectors[11].cleared=false;g.enterSector(11);g.state.paused=true;g.step(0);}''')
    shot(page,'desktop-flagship')
    context.close()
    for name,w,h in [('portrait',390,844),('landscape',852,393)]:
        context=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=True,has_touch=True)
        page=context.new_page();init(page);shot(page,'phone-'+name+'-title')
        page.evaluate('''()=>{const g=__STAR_RIDERS__;g.start();g.state.paused=true;g.step(0);}''');shot(page,'phone-'+name+'-flight')
        page.evaluate('__STAR_RIDERS__.action("map")');shot(page,'phone-'+name+'-chart')
        context.close()
    browser.close()
print(f'{count} visual captures, {len(failures)} failures')
raise SystemExit(bool(failures))
