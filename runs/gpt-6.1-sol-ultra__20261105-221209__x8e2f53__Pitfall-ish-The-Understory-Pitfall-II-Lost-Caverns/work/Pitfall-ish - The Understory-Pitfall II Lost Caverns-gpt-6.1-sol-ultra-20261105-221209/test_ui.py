from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parent
html=root/'ui-test.html'
html.write_text('<!doctype html><meta charset="utf-8"><style>'+root.joinpath('style.css').read_text()+'</style><script type="module">'+root.joinpath('ui.js').read_text()+'''\nwindow.actions=[];window.ui=new GameUI({onAction:(a,v)=>actions.push([a,v])},{sourceInformation:{source:'Pitfall II: Lost Caverns (1984)',usage:'added on import'},testingFeedback:['Testing complete','0','Playthrough','none'],engineFeedback:['Three.js animation','no','World','WebGPU','none','Diagnostics'],promptFeedback:['Clear source','none','Testing','none']});ui.setLoading(1);ui.show('title');window.ready=true;</script>''')
failures=[]
checks=0
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1920,'height':1080})
    page.goto(html.as_uri())
    page.wait_for_function('window.ready')
    def check(name,expression):
        global checks
        checks+=1
        try:
            assert page.evaluate(expression),name
        except Exception as error:
            failures.append(name+': '+str(error))
    check('Title has four actions',"document.querySelectorAll('.title-actions button').length===4")
    page.locator('[data-action=start]').click()
    check('Start callback',"actions.at(-1)[0]==='start'")
    page.evaluate("ui.show('settings')")
    page.locator('[data-setting=music]').evaluate("e=>{e.value=.35;e.dispatchEvent(new Event('input',{bubbles:true}))}")
    check('Music slider callback',"actions.at(-1)[0]==='music'&&actions.at(-1)[1]===.35&&ui.settings.music===.35")
    page.locator('[data-setting=assist]').check()
    check('Assist toggle callback',"actions.at(-1)[0]==='assist'&&actions.at(-1)[1]===true")
    page.locator('[data-setting=glyphs]').select_option('xbox')
    check('Glyph setting callback',"actions.at(-1)[0]==='glyphs'&&actions.at(-1)[1]==='xbox'")
    page.evaluate("ui.show('game');ui.updateHUD({area:'Fern Gallery',hearts:2,gold:24,rescued:1,oxygen:.5,objective:'Find friends',prompt:'E • Light lantern'})")
    check('HUD hearts, rescue, area and oxygen',"document.querySelectorAll('.courage .filled').length===2&&document.querySelector('.hud-identity').textContent.includes('Fern Gallery')&&document.querySelector('.oxygen-meter i').style.width==='50%'&&document.querySelector('.hud-goals').textContent.includes('1 / 3')")
    page.evaluate("ui.setInput('touch');ui.updateHUD({touchAction:'Ride balloon'})")
    page.locator('[data-touch-action]').click()
    check('Contextual touch action callback',"actions.at(-1)[0]==='interact'")
    page.evaluate("ui.setInput('keyboard');ui.show('about');ui.aboutPage='credits';ui.render()")
    check('Credits metadata displayed',"document.querySelector('.credits-grid').textContent.includes('Pitfall II: Lost Caverns (1984)')&&document.querySelector('.credits-grid').textContent.includes('added on import')")
    page.evaluate("ui.aboutPage='feedback';ui.render()")
    check('All interview questions displayed',"document.querySelectorAll('.feedback-block article').length===14")
    page.evaluate("ui.handlePad({axes:[0,0,0,1],buttons:Array.from({length:17},()=>({pressed:false,value:0}))},1)")
    check('Controller scrolls interview notes',"document.querySelector('.about-content').scrollTop>0")
    page.evaluate("ui.show('dev',{teleports:[{id:'fern',label:'Fern Gallery'}]})")
    page.locator('[data-action="dev:teleport"]').click()
    check('Developer destination callback',"actions.at(-1)[0]==='dev:teleport'&&actions.at(-1)[1]==='fern'")
    page.locator('[data-setting=speed]').evaluate("e=>{e.value=8;e.dispatchEvent(new Event('input',{bubbles:true}))}")
    check('Developer live slider callback',"actions.at(-1)[0]==='dev:speed'&&actions.at(-1)[1]===8")
    page.evaluate("ui.show('coop')")
    page.locator('#networkCode').fill('actual connection code')
    page.locator('[data-action="coop:connect"]').click()
    check('Connection code callback',"actions.at(-1)[0]==='coop:connect'&&actions.at(-1)[1]==='actual connection code'")
    page.evaluate("ui.setNetwork({code:'answer code',status:'Connected'})")
    check('Network response displayed',"document.querySelector('#networkCode').value==='answer code'&&document.querySelector('.coop-status').textContent==='Connected'")
    page.evaluate("ui.show('title')")
    page.wait_for_timeout(40)
    page.keyboard.press('ArrowDown')
    check('Keyboard moves focus',"document.activeElement.dataset.action==='coop'")
    page.keyboard.press('Escape')
    check('Escape emits back',"actions.at(-1)[0]==='back'")
    page.evaluate("ui.show('settings');ui.focus(0);window.pad={axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};pad.axes[0]=1;ui.padCooldown=0;ui.handlePad(pad,.2)")
    check('Gamepad changes range',"ui.settings.music>.35")
    browser.close()
html.unlink()
for failure in failures:
    print('FAIL '+failure)
print(f'{checks} UI checks, {len(failures)} failures')
raise SystemExit(bool(failures))
