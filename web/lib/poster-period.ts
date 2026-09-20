const HOUR = 60 * 60 * 1000
const PERIOD = 6 * HOUR
const KST_OFFSET = 9 * HOUR
const PERIODS = ['night', 'morning', 'day', 'evening'] as const
export type PosterPeriod = (typeof PERIODS)[number]

/** Korea stays UTC+9; do not use the visitor's local getHours(). */
export function posterPeriod(now: number): PosterPeriod {
  return PERIODS[Math.floor(new Date(now + KST_OFFSET).getUTCHours() / 6)]
}

export function untilNextPosterPeriod(now: number): number {
  return PERIOD - ((now + KST_OFFSET) % PERIOD + PERIOD) % PERIOD
}
