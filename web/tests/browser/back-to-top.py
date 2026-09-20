"""Read-only browser regression coverage for the layout-level back-to-top control.

Run against the local public-config server started by ../run_local.py.
"""
import argparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:3112')
args = parser.parse_args()

BASE = args.base.rstrip('/')
LIST = f'{BASE}/ko/festivals/'
DETAIL = f'{BASE}/ko/festivals/tourapi-589386/'
TOP_NAME = '맨 위로'
SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')


def readonly_context(browser, **options):
    context = browser.new_context(**options)
    context.route('**/*', lambda route: route.continue_() if route.request.method in SAFE_METHODS else route.abort())
    return context


def wait_for_page(page, url):
    page.goto(url, wait_until='networkidle')
    page.locator('body').wait_for(state='visible')


def reveal_top(page):
    for _ in range(5):
        page.evaluate('window.scrollTo({ top: 1300 })')
        if page.get_by_role('button', name=TOP_NAME).count():
            return
        page.wait_for_timeout(250)
    page.get_by_role('button', name=TOP_NAME).wait_for(state='visible')


with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    try:
        for width in (390, 1280):
            context = readonly_context(browser, viewport={'width': width, 'height': 844})
            page = context.new_page()
            wait_for_page(page, LIST)
            assert page.get_by_role('button', name=TOP_NAME).count() == 0
            reveal_top(page)
            assert page.get_by_role('button', name=TOP_NAME).count() == 1
            if width == 390:
                bottom = page.get_by_role('button', name='맨 아래로').bounding_box()
                top = page.get_by_role('button', name=TOP_NAME).bounding_box()
                assert bottom and top and bottom['y'] + bottom['height'] <= top['y']
                print(f'mobile boxes: bottom y={bottom["y"]:.0f} h={bottom["height"]:.0f}; top y={top["y"]:.0f} h={top["height"]:.0f}')
            page.get_by_role('button', name=TOP_NAME).click()
            page.wait_for_function('window.scrollY === 0')
            page.wait_for_function("document.activeElement?.id === 'page-start'")
            print(f'list {width}px: one top control, no mobile overlap, top focus restored')
            context.close()

        context = readonly_context(browser, viewport={'width': 390, 'height': 844})
        page = context.new_page()
        wait_for_page(page, DETAIL)
        reveal_top(page)
        assert page.get_by_role('button', name=TOP_NAME).count() == 1
        print('detail 390px: one top control')
        context.close()

        reduced = readonly_context(browser, reduced_motion='reduce', viewport={'width': 390, 'height': 844})
        page = reduced.new_page()
        wait_for_page(page, LIST)
        page.evaluate("""window.__scrollCalls = [];
          const originalScrollTo = window.scrollTo.bind(window);
          window.scrollTo = (...args) => {
            window.__scrollCalls.push(args[0]);
            originalScrollTo(...args)
          }""")
        reveal_top(page)
        page.get_by_role('button', name=TOP_NAME).click()
        assert page.evaluate('window.__scrollCalls.at(-1).behavior') == 'auto'
        print('reduced motion: uses instant return')
        reduced.close()
    finally:
        browser.close()
