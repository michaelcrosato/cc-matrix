import pathlib
import asyncio
from playwright.async_api import async_playwright

ROOT=pathlib.Path(__file__).resolve().parent
SOURCE=(ROOT/'network.js').read_text().replace('export function createNetwork','function createNetwork')

async def main():
    count=0
    errors=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        context=await browser.new_context()
        pages=[await context.new_page(), await context.new_page()]
        for page in pages:
            await page.goto('file://' + str(ROOT/'network-test.html'))
            await page.evaluate(SOURCE + '\nwindow.net = createNetwork({onInput:(id,input)=>window.receivedInput={id,input},onState:state=>window.receivedState=state});')
        host,guest=pages
        try:
            offer=await host.evaluate('net.createOffer()')
            answer=await guest.evaluate('(code)=>net.acceptOffer(code)',offer)
            await host.evaluate('(code)=>net.acceptAnswer(code)',answer)
            await host.wait_for_function('net.info.connected',timeout=15000)
            await guest.wait_for_function('net.info.connected',timeout=15000)
            count+=1
        except Exception as e:
            errors.append('WebRTC manual offer/answer: '+str(e).splitlines()[0])
        try:
            await guest.evaluate('net.sendInput({x:.7,interact:true})')
            await host.wait_for_function('window.receivedInput?.input?.interact',timeout=2000)
            await host.evaluate('net.broadcast({phase:"forest",bond:80},true)')
            await guest.wait_for_function('window.receivedState?.phase==="forest"',timeout=2000)
            count+=1
        except Exception as e:
            errors.append('WebRTC bidirectional gameplay: '+str(e).splitlines()[0])
        for page in pages: await page.evaluate('net.destroy()')
        await browser.close()
    for error in errors: print('FAIL '+error)
    print(f'{count}/{count+len(errors)} browser network checks passed')
    if errors: raise SystemExit(1)

asyncio.run(main())
