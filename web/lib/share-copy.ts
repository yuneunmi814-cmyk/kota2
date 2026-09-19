export interface ClipboardWriter {
  writeText: (value: string) => Promise<void>
}

/** Permission denial, insecure context and unsupported APIs all leave a manual-copy path. */
export async function tryCopyLink(url: string, clipboard?: ClipboardWriter | null): Promise<boolean> {
  if (typeof clipboard?.writeText !== 'function') return false
  try {
    await clipboard.writeText(url)
    return true
  } catch {
    return false
  }
}
