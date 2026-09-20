"""Browser regression: scrolled list search remains reachable below the site header.
Run against a local server: python tests/browser/sticky-search.py http://127.0.0.1:3114
Requires Python Playwright and system Chrome; no production writes are made.
"""
import os, sys
from playwright.sync_api import sync_playwright, expect

base = sys.argv[1].rstrip('/')
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    try:
        for width, lang in ((320, 'ko'), (390, 'ko'), (768, 'en'), (1280, 'ko'), (390, 'ja'), (390, 'th')):
            context = browser.new_context(viewport={'width': width, 'height': 844})
            context.route('**/*', lambda r: r.abort() if r.request.method not in ('GET', 'HEAD', 'OPTIONS') else r.continue_())
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            try:
                page.goto(base + f'/{lang}/festivals/', wait_until='networkidle', timeout=90000)
                search = page.locator('main input[placeholder]').first
                expect(search).to_be_visible()
                page.evaluate('window.scrollTo(0, 1600)')
                page.wait_for_function('scrollY >= 1500')
                box = search.bounding_box()
                header = page.locator('header').bounding_box()
                assert box and header and box['y'] >= header['y'] + header['height'] - 1 and box['y'] < 180, (width, box, header)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
                if os.environ.get('QA_SCREENSHOTS'):
                    page.screenshot(path=os.path.join(os.environ['QA_SCREENSHOTS'], f'sticky-{lang}-{width}.png'))
                if lang == 'ko':
                    search.fill('풍기인삼')
                    expect(page.get_by_text('축제 1곳', exact=True)).to_be_visible(timeout=15000)
                    expect(search).to_have_value('풍기인삼')
                    page.wait_for_function("new URLSearchParams(location.search).get('q') === '풍기인삼'")
                assert not errors, errors
                print(f'PASS {lang} {width}px: search stays below header; no horizontal overflow', flush=True)
            finally:
                context.close()
    finally:
        browser.close()
