import contextlib
import functools
import http.server
import json
import os
import pathlib
import threading
import traceback
import urllib.parse

from playwright.sync_api import sync_playwright


ROOT = pathlib.Path(__file__).resolve().parents[2]
FILENAME = 'A Little Off Balance-Wii Fit-gpt-6.1-terra-max-20261104-221846.html'
passed = 0
failures = []


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def check(name, operation):
    global passed
    try:
        operation()
        passed += 1
    except Exception:
        failures.append(name + ': ' + traceback.format_exc())


def state(page):
    return page.evaluate('window.__GAME__.state()')


def screen(page, expected):
    page.wait_for_function('(expected) => window.__GAME__.state().screen === expected', arg=expected, timeout=5000)


def click(page, action, extra=''):
    page.locator(f'[data-action="{action}"]{extra}').first.click(timeout=5000)


def start_profile(page):
    click(page, 'slots')
    click(page, 'slot', '[data-index="0"]')
    screen(page, 'island')


def finish(page):
    page.evaluate('window.__GAME__.finishActivity()')


def smoke(engine, url):
    browser = engine.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(url, wait_until='load')
        screen(page, 'title')
        assert page.title() == 'A Little Off Balance'
        assert page.locator('text=Failed to start: WebGPU unavailable').count() == 0
        start_profile(page)
        click(page, 'intro', '[data-id="tree"]')
        click(page, 'start')
        screen(page, 'game')
        page.wait_for_timeout(100)
        assert page.locator('#live-cue').inner_text()
        page.keyboard.press('Escape')
        screen(page, 'pause')
        click(page, 'resume')
        screen(page, 'game')
        finish(page)
        screen(page, 'results')
        click(page, 'continue')
        screen(page, 'island')
        click(page, 'day-report')
        click(page, 'next-day')
        assert state(page)['day'] == 2
        page.reload(wait_until='load')
        start_profile(page)
        assert state(page)['day'] == 2
        assert not errors, errors
    finally:
        context.close()
        browser.close()


def about_pages(engine, url):
    browser = engine.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(url, wait_until='load')
        click(page, 'about')
        assert page.get_by_text('This is not medical advice. Ounce is a scale.').is_visible()
        for title in ('Source Information', 'Source Information', 'Source Information', 'Testing Feedback', 'Engine Feedback', 'Prompt Feedback', 'Credits', 'Full kit credits'):
            page.keyboard.press('ArrowRight')
            assert page.locator('h1').inner_text() == title
        credits = page.locator('.credits-full')
        assert credits.evaluate('(element) => element.scrollHeight > element.clientHeight')
        page.keyboard.press('ArrowDown')
        page.wait_for_function("document.querySelector('.credits-full').scrollTop > 0")
        page.keyboard.press('ArrowLeft')
        assert page.locator('h1').inner_text() == 'Credits'
        click(page, 'title')
        screen(page, 'title')
        assert not errors, errors
    finally:
        browser.close()


def complete_week(engine, url):
    browser = engine.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(url, wait_until='load')
        start_profile(page)
        click(page, 'weigh')
        for _ in range(3):
            screen(page, 'game')
            page.wait_for_timeout(25)
            finish(page)
        screen(page, 'weigh-result')
        assert len(state(page)['profiles'][0]['history']) == 3
        click(page, 'island')
        for activity in ['tree', 'heron', 'squats', 'hoop', 'header', 'lunges', 'warrior', 'step', 'slackline', 'chair', 'tray', 'mortgage', 'tax', 'jog', 'pier', 'plank']:
            page.evaluate('(id) => window.__GAME__.go("game", {id})', activity)
            screen(page, 'game')
            page.wait_for_timeout(35)
            assert page.locator('#live-cue').inner_text(), activity
            finish(page)
            screen(page, 'results')
            click(page, 'continue')
        for day in range(2, 8):
            click(page, 'day-report')
            click(page, 'next-day')
            assert state(page)['day'] == day
        click(page, 'finale')
        click(page, 'start')
        finish(page)
        screen(page, 'reveal')
        assert state(page)['profiles'][0]['revealed'] is True
        assert not errors, errors
    finally:
        context.close()
        browser.close()


def family(engine, url):
    browser = engine.launch(headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(url, wait_until='load')
        click(page, 'family')
        click(page, 'family-join')
        click(page, 'family-bot')
        assert state(page)['family']['players'] == 2
        click(page, 'family-start')
        for event in range(3):
            screen(page, 'game')
            assert state(page)['family']['event'] == event
            assert page.locator('.family-lane').count() == 2
            page.wait_for_timeout(25)
            finish(page)
            if event < 2:
                assert state(page)['family']['phase'] == 'break'
                page.evaluate('window.__GAME__.finishBreak()')
        screen(page, 'medley-board')
        assert page.get_by_text('PLAYER 1', exact=True).count() == 1
        assert page.get_by_text('BOT 2', exact=True).count() == 1
        assert not errors, errors
    finally:
        browser.close()


def family_gamepads(engine, url):
    browser = engine.launch(headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(url, wait_until='load')
        page.evaluate('''() => {
            window.fakePads = Array.from({length: 4}, (_, index) => ({
                index, axes: [0, 0], connected: true,
                buttons: Array.from({length: 16}, () => ({pressed: false, value: 0}))
            }));
            Object.defineProperty(navigator, 'getGamepads', {configurable: true, value: () => window.fakePads});
        }''')
        click(page, 'family')
        for index in range(4):
            page.evaluate('(index) => window.fakePads[index].buttons[0].pressed = true', index)
            page.wait_for_timeout(80)
            page.evaluate('(index) => window.fakePads[index].buttons[0].pressed = false', index)
            page.wait_for_timeout(80)
        assert state(page)['family']['players'] == 4
        click(page, 'family-start')
        page.evaluate('window.fakePads[0].axes[0] = 1; window.fakePads[1].axes[0] = -1')
        page.wait_for_timeout(350)
        dots = state(page)['family']['dots']
        assert len(dots) == 4 and abs(dots[0]['x'] - dots[1]['x']) > .02, dots
        assert page.locator('.family-lane').count() == 4
        assert not errors, errors
    finally:
        browser.close()


def mobile(playwright, url):
    browser = playwright.webkit.launch(headless=True)
    context = browser.new_context(**playwright.devices['iPhone 17 Pro'])
    page = context.new_page()
    try:
        page.goto(url, wait_until='load')
        assert page.get_by_text('Controller or keyboard required').is_visible()
        assert page.locator('[data-action="slots"]').count() == 0
        click(page, 'settings')
        assert page.locator('#music').input_value() == '0.1'
    finally:
        context.close()
        browser.close()


def attract(engine, url):
    browser = engine.launch(headless=True)
    page = browser.new_page()
    try:
        page.goto(url, wait_until='load')
        page.wait_for_function('window.__GAME__.state().attract', timeout=13000)
        page.keyboard.press('Enter')
        screen(page, 'title')
    finally:
        browser.close()


def webgpu(playwright, url):
    browser = playwright.chromium.launch(headless=True, args=['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader'])
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(url, wait_until='load')
        page.wait_for_selector('#world canvas', timeout=12000)
        assert not errors, errors
    finally:
        browser.close()


handler = functools.partial(QuietHandler, directory=str(ROOT))
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/' + urllib.parse.quote(FILENAME)
try:
    with sync_playwright() as playwright:
        for name in ('chromium', 'firefox', 'webkit'):
            check(name + ' profile, activity, persistence', lambda name=name: smoke(getattr(playwright, name), url))
        for name in ('chromium', 'webkit'):
            check(name + ' paged credits', lambda name=name: about_pages(getattr(playwright, name), url))
        check('seven-day playthrough and all activities', lambda: complete_week(playwright.chromium, url))
        check('family medley', lambda: family(playwright.chromium, url))
        check('four simultaneous gamepad lanes', lambda: family_gamepads(playwright.chromium, url))
        check('touch-only notice', lambda: mobile(playwright, url))
        check('idle attract and wake', lambda: attract(playwright.chromium, url))
        check('WebGPU island', lambda: webgpu(playwright, url))
finally:
    server.shutdown()
print(json.dumps({'passed': passed, 'failures': failures}))
