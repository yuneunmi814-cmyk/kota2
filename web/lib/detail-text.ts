/** Format source prose without attempting to infer which facts belong to another section. */
export type DetailTextBlock =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'list'; items: string[] }

export function detailTextBlocks(raw: string | null | undefined): DetailTextBlock[] {
  if (!raw) return []
  const blocks: DetailTextBlock[] = []
  let current: DetailTextBlock | null = null
  const flush = () => {
    if (current) blocks.push(current)
    current = null
  }

  // Source text occasionally contains HTML line breaks, not semantic HTML. Preserve
  // everything else verbatim: the same sentence may contain dates, prices and caveats.
  const lines = raw.replace(/<br\s*\/?>/gi, '\n').replace(/\r\n?/g, '\n').split('\n')
  for (const sourceLine of lines) {
    const line = sourceLine.trim()
    if (!line) {
      flush()
      continue
    }
    const bullet = /^(?:[-*•·])\s+(.+)$/.exec(line)
    if (bullet) {
      if (current?.kind !== 'list') {
        flush()
        current = { kind: 'list', items: [] }
      }
      current.items.push(bullet[1])
    } else {
      if (current?.kind !== 'paragraph') {
        flush()
        current = { kind: 'paragraph', lines: [] }
      }
      current.lines.push(line)
    }
  }
  flush()
  return blocks
}
