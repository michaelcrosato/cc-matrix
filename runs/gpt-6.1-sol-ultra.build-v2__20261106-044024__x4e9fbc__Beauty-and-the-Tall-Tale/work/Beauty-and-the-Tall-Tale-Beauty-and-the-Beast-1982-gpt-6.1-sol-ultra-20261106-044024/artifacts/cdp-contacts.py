from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);c=b.new_context(**p.devices['iPhone 13']);q=c.new_page();q.set_content('<body style="touch-action:none"><script>window.events=[];for(const t of ["pointerdown","pointermove","pointerup","pointercancel"])window.addEventListener(t,e=>events.push([e.type,e.pointerId,e.clientX]));</script>');s=c.new_cdp_session(q)
 def t(kind,pts):s.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'id':i,'x':x,'y':200,'radiusX':6,'radiusY':6,'force':1} for i,x in pts]})
 t('touchStart',[(0,70)]);t('touchMove',[(0,110)]);t('touchStart',[(0,110),(1,330)]);print('start',q.evaluate('events'));t('touchEnd',[(1,330)]);print('endright',q.evaluate('events'));t('touchEnd',[]);print('end',q.evaluate('events'));b.close()
