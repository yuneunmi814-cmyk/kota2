import assert from 'node:assert/strict'
import test from 'node:test'

const backToTop = await import('../lib/back-to-top.ts').catch(() => ({}))

test('back-to-top stays hidden until the visitor has scrolled 600 pixels', () => {
  assert.equal(typeof backToTop.shouldShowBackToTop, 'function')
  assert.equal(backToTop.shouldShowBackToTop(0), false)
  assert.equal(backToTop.shouldShowBackToTop(599), false)
  assert.equal(backToTop.shouldShowBackToTop(600), true)
})

test('back-to-top returns the visitor to the document start with motion when allowed', () => {
  const calls = []
  backToTop.scrollToTop({
    matchMedia: () => ({ matches: false }),
    scrollTo: (options) => calls.push(options),
  })
  assert.deepEqual(calls, [{ top: 0, behavior: 'smooth' }])
})

test('back-to-top returns to the document start without animation for reduced motion', () => {
  const calls = []
  backToTop.scrollToTop({
    matchMedia: () => ({ matches: true }),
    scrollTo: (options) => calls.push(options),
  })
  assert.deepEqual(calls, [{ top: 0, behavior: 'auto' }])
})
