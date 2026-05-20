// Incremental sentinel parser for Claude note streaming.
// Dispatches each section only once (when the next sentinel arrives) rather than
// re-scanning the full buffer on every chunk, avoiding O(N²) re-dispatch.

export interface SectionUpdate {
  key: string
  content: string
}

// Regex that matches a complete section — one that is followed by another sentinel
const COMPLETE_SECTION_RE = /\[SECTION:(\w+)\]([\s\S]*?)(?=\[SECTION:)/g

export function parseCompleteSections(buffer: string, offset: number): {
  updates: SectionUpdate[]
  newOffset: number
} {
  const slice = buffer.slice(offset)
  const updates: SectionUpdate[] = []
  let newOffset = offset

  COMPLETE_SECTION_RE.lastIndex = 0
  let match
  while ((match = COMPLETE_SECTION_RE.exec(slice)) !== null) {
    updates.push({ key: match[1], content: match[2].trim() })
    newOffset = offset + match.index + match[0].length
  }

  return { updates, newOffset }
}

export function parseFinalSection(buffer: string): SectionUpdate | null {
  // locate the last sentinel to avoid greedy matching across all sections
  const lastIdx = buffer.lastIndexOf('[SECTION:')
  if (lastIdx === -1) return null
  const slice = buffer.slice(lastIdx)
  const match = /^\[SECTION:(\w+)\]([\s\S]*)$/.exec(slice)
  if (!match) return null
  return { key: match[1], content: match[2].trim() }
}
