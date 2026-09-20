"""Read-only fallback-art regression. Requires Python Playwright + Chrome.
Run with a local server: python tests/browser/poster-background.py --base http://127.0.0.1:3117
"""
import argparse
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:3117')
parser.add_argument('--output', default='output/playwright/poster-background')
args = parser.parse_args()
output = Path(args.output)
output.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    context = browser.new_context(viewport={'width':390, 'height':844}, timezone_id='America/New_York')
    context.route('**/*', lambda r: r.abort() if r.request.method not in ('GET','HEAD','OPTIONS') else r.continue_())
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    try:
        start = datetime(2026,9,19,20,59,59,tzinfo=timezone.utc) # 05:59:59 KST
        page.clock.install(time=start)
        page.clock.pause_at(start)
        page.goto(args.base+'/ko/festivals/?q=구름산예술제', wait_until='networkidle', timeout=90000)
        image = page.locator('main img[src*="fallback"]').first
        expect(image).to_be_visible(timeout=20000)
        def verify(period):
            expect(image).to_have_attribute('src', re.compile(period+r'\.png'))
            image.scroll_into_view_if_needed()
            page.wait_for_function('(p)=>[...document.querySelectorAll("main img")].some(i=>i.src.includes(p+".png")&&i.complete&&i.naturalWidth>0)',arg=period)
            parent=image.locator('..')
            expect(parent.locator('span.relative')).to_have_text('구름산예술제')
            assert image.get_attribute('alt') == ''
            assert image.get_attribute('aria-hidden') == 'true'
            shade = parent.locator('span.absolute').evaluate('e=>getComputedStyle(e).backgroundColor')
            assert shade in ('rgba(0, 0, 0, 0.3)', 'oklab(0 0 0 / 0.3)'), shade
            assert parent.locator('.sr-only').count() == 1
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(output/f'{period}-390.png'))
            print('PASS',period,'KST image, name, 30% shade, loaded asset; NY browser timezone',flush=True)
        verify('night')
        for delta,period in [(2000,'morning'),(21600000,'day'),(21600000,'evening'),(21600000,'night')]:
            page.clock.fast_forward(delta)
            verify(period)
        # An inactive tab/device waking much later should immediately catch up on focus.
        page.clock.set_system_time(datetime(2026,9,20,3,0,0,tzinfo=timezone.utc))
        page.evaluate('window.dispatchEvent(new Event("focus"))')
        verify('day')
        page.goto(args.base+'/ko/festivals/?q=부천국제만화축제',wait_until='networkidle',timeout=90000)
        healthy=page.locator('main img[alt="부천국제만화축제"]').first
        expect(healthy).to_be_visible()
        assert page.locator('main img[src*="fallback"]').count()==0
        original=healthy.get_attribute('src')
        page.route(original,lambda r:r.abort())
        page.reload(wait_until='networkidle')
        expect(page.locator('main img[src*="fallback"]').first).to_be_visible()
        expect(page.locator('main img[src*="fallback"]').first.locator('..').locator('span.relative')).to_have_text('부천국제만화축제')
        print('PASS real poster preserved; failed poster replaced without losing title',flush=True)
        page.clock.resume()
        page.set_viewport_size({'width':1280,'height':900})
        for lang in ('ko','en','ja','th'):
            page.goto(args.base+f'/{lang}/festivals/stdfest-구름산예술제-2026-09-19/',wait_until='domcontentloaded',timeout=90000)
            expect(page.locator('main h1')).to_be_visible(timeout=20000)
            localized_name = page.locator('main h1').inner_text()
            page.goto(args.base+f'/{lang}/festivals/?q='+quote(localized_name),wait_until='domcontentloaded',timeout=90000)
            fallback=page.locator('main img[src*="fallback"]').first
            expect(fallback).to_be_visible(timeout=20000)
            expect(fallback.locator('..').locator('span.relative')).to_have_text(localized_name)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            print('PASS localized festival name:',lang,flush=True)
        assert not errors, errors
        print('PASS four languages, desktop no overflow, no runtime/hydration errors',flush=True)
    finally:
        context.close()
        browser.close()
