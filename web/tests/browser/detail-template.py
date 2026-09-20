"""Read-only 390px detail-page smoke check against a running local dev server.

Run from web/: py tests/browser/detail-template.py --base http://127.0.0.1:3111
The local server needs public Supabase browser settings; run_local.py supplies them
in memory. This script never submits reviews or writes to the database.
"""

import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright


parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:3111')
parser.add_argument('--output', default='output/playwright/detail')
args = parser.parse_args()
output = Path(args.output)
output.mkdir(parents=True, exist_ok=True)

core = ['about', 'program', 'schedule', 'admission', 'notes', 'location', 'contact']
fixtures = {
    'rich': 'tourapi-589386',  # summary, poster, gallery and food booths
    'sparse': 'stdfest-구름산예술제-2026-09-19',  # no poster/program in current public data
}

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel='chrome', headless=True)
    context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
    context.route('**/*', lambda route: route.abort() if route.request.method not in ('GET', 'HEAD', 'OPTIONS') else route.continue_())
    page = context.new_page()
    for fixture, slug in fixtures.items():
        for lang in ('ko', 'en', 'ja', 'th'):
            response = page.goto(f'{args.base}/{lang}/festivals/{slug}/', wait_until='domcontentloaded', timeout=60000)
            assert response and response.status == 200, f'{fixture}/{lang}: HTTP {response.status if response else "none"}'
            page.locator('main h1').wait_for(timeout=30000)
            facts = page.locator('main dl').first
            assert facts.locator('dt').count() == 4, f'{fixture}/{lang}: missing first-view facts'
            data = page.evaluate('''(ids) => {
              const sections = ids.map(id => document.getElementById(id));
              const allIds = [...document.querySelectorAll('[id]')].map(el => el.id);
              return {
                positions: sections.map(el => el?.getBoundingClientRect().top + scrollY),
                firstFactsBottom: document.querySelector('main dl').getBoundingClientRect().bottom,
                overflow: document.documentElement.scrollWidth - innerWidth,
                duplicateIds: allIds.filter((id, i) => allIds.indexOf(id) !== i),
              };
            }''', core)
            assert all(position is not None for position in data['positions']), f'{fixture}/{lang}: core section missing'
            assert data['positions'] == sorted(data['positions']), f'{fixture}/{lang}: wrong section order'
            assert data['firstFactsBottom'] <= 844, f'{fixture}/{lang}: key facts below first fold'
            assert data['overflow'] <= 1, f'{fixture}/{lang}: horizontal overflow {data["overflow"]}'
            assert not data['duplicateIds'], f'{fixture}/{lang}: duplicate ids {data["duplicateIds"]}'
            page.screenshot(path=str(output / f'detail-{fixture}-{lang}-390.png'))

            page.locator('nav a[href="#admission"]').click()
            page.wait_for_timeout(450)
            jump = page.evaluate('''() => ({
              target: document.querySelector('#admission').getBoundingClientRect().top,
              nav: document.querySelector('nav[aria-label] a[href="#admission"]').closest('nav').getBoundingClientRect().bottom,
            })''')
            assert jump['target'] >= jump['nav'] - 2, f'{fixture}/{lang}: heading covered by sticky nav {jump}'
            print(f'PASS {fixture}/{lang}: first facts {data["firstFactsBottom"]:.0f}px; jump {jump["target"]:.0f}px', flush=True)
    context.close()
    browser.close()
