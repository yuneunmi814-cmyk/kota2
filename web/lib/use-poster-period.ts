'use client'
import { useSyncExternalStore } from 'react'
import { posterPeriod, untilNextPosterPeriod, type PosterPeriod } from './poster-period'

// One boundary timer for all visible fallback cards, not one timer per festival.
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined

function refresh() {
  clearTimeout(timer)
  for (const notify of listeners) notify()
  if (listeners.size) timer = setTimeout(refresh, untilNextPosterPeriod(Date.now()))
}

function onVisible() {
  if (document.visibilityState === 'visible') refresh()
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  if (listeners.size === 1) {
    timer = setTimeout(refresh, untilNextPosterPeriod(Date.now()))
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
  }
  return () => {
    listeners.delete(notify)
    if (!listeners.size) {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
    }
  }
}

const snapshot = () => posterPeriod(Date.now())
// ISR HTML can be hours old: never bake its clock into the client's first render.
const serverSnapshot = (): PosterPeriod | null => null

export function usePosterPeriod() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
