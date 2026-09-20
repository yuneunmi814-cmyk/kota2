export const BACK_TO_TOP_THRESHOLD = 600

export function shouldShowBackToTop(scrollY: number): boolean {
  return scrollY >= BACK_TO_TOP_THRESHOLD
}

type TopScroller = Pick<Window, 'matchMedia' | 'scrollTo'>

/** Moves to the start without forcing motion on visitors who have disabled it. */
export function scrollToTop(browser: TopScroller): void {
  browser.scrollTo({
    top: 0,
    behavior: browser.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
}
