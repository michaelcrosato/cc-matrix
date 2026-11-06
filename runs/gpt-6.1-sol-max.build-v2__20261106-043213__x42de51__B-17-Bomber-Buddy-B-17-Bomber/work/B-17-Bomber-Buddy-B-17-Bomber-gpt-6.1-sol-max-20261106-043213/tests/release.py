from pathlib import Path
import json
import hashlib
import re
import shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(name,fn):
    try:
        detail=fn();checks.append({'name':name,'pass':True,'detail':detail})
    except Exception as e:
        checks.append({'name':name,'pass':False,'error':str(e)});print('FAIL '+name+': '+str(e))
def require(value,message):
    if not value:raise AssertionError(message)
identity=json.loads((ROOT/'content'/'identity.json').read_text())
artifact=ROOT.parent/(identity['base']+'.html')
metadata=json.loads((ROOT.parent/'exit-interview.json').read_text())
def schema():
    require(set(metadata)=={'sourceInformation','testingFeedback','engineFeedback','promptFeedback','aiHub'},'Top-level schema')
    require(set(metadata['sourceInformation'])==set('date source plan genre perspective tech artDirection animation audio online testing research environment model usage'.split()),'Source schema')
    require(all(isinstance(v,str) and v for v in metadata['sourceInformation'].values()),'All source values filled')
    require([len(metadata[k]) for k in ['testingFeedback','engineFeedback','promptFeedback']]==[4,6,4],'Question counts')
    require(metadata['sourceInformation']['usage']=='added on import','Usage')
    require(set(metadata['aiHub'])==set('name tagline description type genre source series players controls tags'.split()),'Catalogue schema')
    require(3<=len(metadata['aiHub']['tags'])<=6,'Tags')
check('Exact exit-interview schema, question order/count and filled values',schema)
def package():
    html=artifact.read_text();hub=(ROOT/'vendor/hub-repo/lib/hub/session.js').read_text()
    require(re.search(r'<meta charset="utf-8"><script>([\s\S]*?)</script>',html)[1]==hub,'Hub client remains verbatim')
    require('Apache License' in html,'License text embedded')
    return {'file':artifact.name,'bytes':artifact.stat().st_size,'sha256':hashlib.sha256(artifact.read_bytes()).hexdigest()}
check('Final named HTML and its preserved client/licenses',package)
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    context=browser.new_context(viewport={'width':1920,'height':1080},offline=True)
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    relocated=ROOT/'tests'/'portable'/'final-delivery.html';relocated.parent.mkdir(exist_ok=True);shutil.copyfile(artifact,relocated)
    page.goto(relocated.as_uri()+'?backend=webgl');page.wait_for_function('window.Bomber?.ready',timeout=60000);page.evaluate('__game.stop()')
    def credits():
        require(page.evaluate('RELEASE_INFO')==metadata,'Embedded feedback differs from JSON')
        page.get_by_role('button',name='About / Credits',exact=True).click()
        text=page.locator('.esh-mod').inner_text()
        require(all(section.upper() in text.upper() for section in ['Source Information','Testing Feedback','Engine Feedback','Prompt Feedback']),'Missing required credits section')
        require(metadata['sourceInformation']['model'] in text and 'added on import' in text,'Source values absent')
        page.get_by_role('button',name='License texts',exact=True).click()
        require('Apache License' in page.locator('.esh-mod').inner_text(),'License menu')
        page.locator('.esh-btns').get_by_role('button',name='Back',exact=True).click()
        page.locator('.esh-btns').get_by_role('button',name='Back',exact=True).click()
    check('Final About/Credits matches the sole metadata source',credits)
    def forecasts():
        values=page.evaluate('''()=>{const rows=[];for(let difficulty=0;difficulty<3;difficulty++)for(let loadout=0;loadout<3;loadout++){Bomber.setup={difficulty,loadout,route:'direct'};const direct=Bomber.forecast();Bomber.setup.route='dogleg';rows.push({difficulty,loadout,direct,dogleg:Bomber.forecast()});}Bomber.setup={route:'direct',loadout:1,difficulty:1};return rows;}''')
        require(all(20<=r['dogleg']<=r['direct']<100 for r in values),'Forecast viability/order')
        require(next(r['direct'] for r in values if r['difficulty']==1 and r['loadout']==1)==46,'Authored 42-km route reserve')
        return values
    check('Planning reserve derives from authored routes and viable loads',forecasts)
    def actual_file():
        page.get_by_role('button',name='Play',exact=True).click();page.get_by_role('button',name='Launch sortie',exact=True).click()
        page.keyboard.down('e');page.evaluate('__game.advance(35)');page.keyboard.up('e');page.evaluate('__game.advance(.1,{draw:true})')
        require(page.evaluate('Bomber.sim.aircraft.airborne&&Bomber.sim.aircraft.z>100*16'),'Final release takeoff')
        require(not errors and not page.evaluate('__game.errors.length'),'Console/native errors: '+str(errors))
        page.screenshot(path=str(ROOT/'docs'/'release-cockpit.png'))
    check('Actual final artifact runs offline after relocation and takes off',actual_file)
    def abort():
        page.keyboard.press('Escape');page.evaluate('__game.advance(.1)');page.get_by_role('button',name='Abort to debrief',exact=True).click();page.evaluate('__game.advance(.1)')
        result=page.evaluate('Bomber.sim.result')
        require(result['title']=='SORTIE ABORTED' and not result['returned'] and result['survival']==0,'Abort claimed safe recovery')
        require(page.evaluate('Bomber.sound.inspect().sources')==0,'End sound cleanup')
        return result['title']
    check('Immediate abort is distinct from a recovered crew',abort)
    browser.close()
failed=sum(not c['pass'] for c in checks)
(ROOT/'docs'/'final-package-verification.json').write_text(json.dumps({'count':len(checks),'failed':failed,'checks':checks},indent=2))
print(f'{len(checks)-failed}/{len(checks)} final-package checks passed; {failed} failures')
raise SystemExit(bool(failed))
