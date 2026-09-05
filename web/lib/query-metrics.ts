export interface QueryMetric { ok: boolean; durationMs: number }

/** Only status and elapsed time: never log request URLs, headers, bodies or upstream errors. */
export function measuredFetch(next: typeof fetch, report: (metric: QueryMetric) => void): typeof fetch {
  return async (input, init) => {
    const start = performance.now()
    let ok = false
    try {
      const response = await next(input, init)
      ok = response.ok
      return response
    } finally {
      report({ ok, durationMs: Math.round(performance.now() - start) })
    }
  }
}
