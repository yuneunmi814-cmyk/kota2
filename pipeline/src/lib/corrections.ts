/** Official corrections are shared by ingestion and the final web live overlay. */
export interface FestivalCorrection {
  match?: string
  externalId?: string
  year?: number
  name?: string
  startDate?: string
  endDate?: string
  address?: string
  sido?: string
  sigungu?: string
  lat?: number | null
  lng?: number | null
}

interface CorrectableFestival {
  externalId: string
  sourceIds?: string[]
  name: string
  startDate: string
  endDate: string
  address?: string | null
  sido?: string | null
  sigungu?: string | null
  lat?: number | null
  lng?: number | null
}

const fields = ['name', 'startDate', 'endDate', 'address', 'sido', 'sigungu', 'lat', 'lng'] as const
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s
const regionToken = (s: string) => s.replace(/특별자치도|특별자치시|특별시|광역시|도$/g, '').replace('충청남', '충남').replace('충청북', '충북').replace('전라남', '전남').replace('전라북', '전북').replace('경상남', '경남').replace('경상북', '경북')

/** Nonmutating; ambiguous targets and conflicting edits are reported, never first-match wins. */
export function applyCorrections<T extends CorrectableFestival>(
  items: T[], corrections: readonly FestivalCorrection[], warn: (message: string) => void = console.warn,
): T[] {
  const edits = new Map<number, FestivalCorrection[]>()
  for (const c of corrections) {
    const year = c.year ?? Number((c.startDate ?? c.endDate ?? c.name?.match(/20\d{2}/)?.[0] ?? '').slice(0, 4))
    const candidates = items.flatMap((f, i) => {
      if (year && Number(f.startDate.slice(0, 4)) !== year) return []
      const match = c.externalId
        ? f.externalId === c.externalId || f.sourceIds?.includes(c.externalId)
        : Boolean(c.match && f.name.includes(c.match))
      return match ? [i] : []
    })
    if (candidates.length !== 1) {
      if (candidates.length > 1) warn(`[corrections] ambiguous: ${c.externalId ?? c.match}`)
      continue
    }
    const i = candidates[0]!
    edits.set(i, [...(edits.get(i) ?? []), c])
  }
  return items.map((f, i) => {
    const corrections = edits.get(i)
    if (!corrections) return f
    const patch: FestivalCorrection = {}
    for (const c of corrections) for (const field of fields) {
      if (c[field] === undefined) continue
      if (patch[field] !== undefined && patch[field] !== c[field]) {
        warn(`[corrections] conflicting field ${field}: ${f.externalId}`)
        return f
      }
      Object.assign(patch, { [field]: c[field] })
    }
    const next = { ...f, ...patch }
    const coordsChanged = patch.lat !== undefined || patch.lng !== undefined
    const badCoords = coordsChanged && !(
      (patch.lat === null && patch.lng === null) ||
      (typeof patch.lat === 'number' && typeof patch.lng === 'number' && Number.isFinite(patch.lat) && Number.isFinite(patch.lng) && patch.lat >= 33 && patch.lat <= 39 && patch.lng >= 124 && patch.lng <= 132)
    )
    const locationChanged = patch.address !== undefined || patch.sido !== undefined || patch.sigungu !== undefined
    const badAddress = locationChanged && (!next.address?.trim() || !next.sido ||
      !regionToken(next.address).startsWith(regionToken(next.sido)) ||
      (next.sigungu && !next.address.includes(next.sigungu)))
    if (!validDate(next.startDate) || !validDate(next.endDate) || next.startDate > next.endDate || badCoords || badAddress) {
      warn(`[corrections] invalid fields: ${f.externalId}`)
      return f
    }
    // A changed place with no freshly verified coordinate pair must not retain the old map pin.
    if (locationChanged && !coordsChanged && (next.address !== f.address || next.sido !== f.sido || next.sigungu !== f.sigungu)) {
      next.lat = null; next.lng = null
    }
    return next
  })
}
