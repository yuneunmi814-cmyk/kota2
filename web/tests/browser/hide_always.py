"""Read-only browser regression for the optional year-round festival filter.

Run against an already-running local web server:
  python tests/browser/hide_always.py --base-url http://127.0.0.1:3113

All non-GET/HEAD requests are intercepted and aborted. No database writes are made.
"""

import argparse
import re

from playwright.sync_api import expect, sync_playwright


LABELS = {
    "ko": "상시 축제 가리기",
    "en": "Hide year-round festivals",
    "ja": "通年開催の祭りを非表示",
    "th": "ซ่อนเทศกาลที่จัดตลอดปี",
}


def total(page):
    text = page.locator("main p").filter(has_text=re.compile(r"^축제 \d+곳$")).first.inner_text()
    return int(re.search(r"\d+", text).group())


def chip_counts(page, row_index):
    counts = {}
    for button in page.locator("[data-chip-row]").nth(row_index).locator("button").all():
        text = button.inner_text().strip()
        match = re.search(r"\d+$", text)
        if match:
            counts[text[:match.start()].strip()] = int(match.group())
    return counts


def open_list(page, base_url, lang="ko", query=""):
    page.goto(f"{base_url}/{lang}/festivals/{query}", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle", timeout=60000)
    expect(page.get_by_role("checkbox", name=LABELS[lang])).to_be_visible(timeout=60000)


def check_layout(page, base_url):
    for width in (390, 1280):
        page.set_viewport_size({"width": width, "height": 900})
        for lang, label in LABELS.items():
            open_list(page, base_url, lang, "?hideAlways=1")
            checkbox = page.get_by_role("checkbox", name=label)
            expect(checkbox).to_be_checked()
            target = page.locator("label").filter(has=checkbox)
            box = target.bounding_box()
            assert box and box["height"] >= 44, (lang, width, box)
            overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            assert overflow <= 1, (lang, width, overflow)
            print(f"layout {lang} {width}px: checkbox label visible, {box['height']:.0f}px target, no page overflow")


def check_behavior(page, base_url):
    page.set_viewport_size({"width": 1280, "height": 900})
    open_list(page, base_url)
    checkbox = page.get_by_role("checkbox", name=LABELS["ko"])
    expect(checkbox).not_to_be_checked()
    before = total(page)
    region_before = chip_counts(page, 1)
    theme_before = chip_counts(page, 2)
    checkbox.check()
    expect(checkbox).to_be_checked()
    expect(page).to_have_url(re.compile(r"[?&]hideAlways=1(?:&|$)"))
    after = total(page)
    assert 0 < after < before, (before, after)
    region_after = chip_counts(page, 1)
    theme_after = chip_counts(page, 2)
    assert theme_after["전체"] == after, (after, theme_after)
    assert any(region_after.get(key, 0) < count for key, count in region_before.items())
    assert all(region_after.get(key, 0) <= count for key, count in region_before.items())
    assert all(theme_after.get(key, 0) <= count for key, count in theme_before.items())

    page.reload(wait_until="domcontentloaded")
    checkbox = page.get_by_role("checkbox", name=LABELS["ko"])
    expect(checkbox).to_be_checked()
    assert total(page) == after
    checkbox.uncheck()
    expect(checkbox).not_to_be_checked()
    expect(page).not_to_have_url(re.compile(r"[?&]hideAlways="))
    assert total(page) == before
    assert chip_counts(page, 1) == region_before
    assert chip_counts(page, 2) == theme_before
    print(f"toggle/reload: total {before} -> {after} -> {before}")

    open_list(page, base_url, query="?hideAlways=1&page=3")
    expect(page).to_have_url(re.compile(r"[?&]page=3(?:&|$)"))
    page.get_by_role("checkbox", name=LABELS["ko"]).uncheck()
    expect(page).not_to_have_url(re.compile(r"[?&]page="))
    print("changing checkbox resets page=3")

    open_list(page, base_url, query="?hideAlways=1")
    page.get_by_role("button", name="조건 초기화").click()
    expect(page.get_by_role("checkbox", name=LABELS["ko"])).not_to_be_checked()
    expect(page).not_to_have_url(re.compile(r"[?&]hideAlways="))
    print("reset filters clears checkbox and URL flag")

    open_list(page, base_url, query="?from=2026-09-11&to=2026-09-15&hideAlways=1")
    expect(page.get_by_role("checkbox", name=LABELS["ko"])).to_be_checked()
    expect(page.get_by_text("이 날짜·시기 조건에서는 상시 축제가 이미 제외됩니다.")).to_be_visible()
    page.locator("header button[aria-haspopup='true']").click()
    page.locator("header a[hreflang='en']").click()
    expect(page).to_have_url(re.compile(r"/en/festivals/\?"))
    assert page.url.endswith("from=2026-09-11&to=2026-09-15&hideAlways=1"), page.url
    expect(page.get_by_role("checkbox", name=LABELS["en"])).to_be_checked()
    assert page.get_by_label("Start date").input_value() == "2026-09-11"
    assert page.get_by_label("End date").input_value() == "2026-09-15"
    print("language switch preserves dates and hideAlways=1")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:3113")
    args = parser.parse_args()
    blocked = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})

        def readonly(route):
            if route.request.method.upper() not in ("GET", "HEAD"):
                blocked.append((route.request.method, route.request.url))
                route.abort()
            else:
                route.continue_()

        context.route("**/*", readonly)
        page = context.new_page()
        try:
            check_behavior(page, args.base_url)
            check_layout(page, args.base_url)
            print(f"PASS: blocked {len(blocked)} non-read-only requests")
        finally:
            context.close()
            browser.close()


if __name__ == "__main__":
    main()
