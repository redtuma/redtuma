import { describe, expect, it } from 'vitest'
import { MDocument } from '../src/index'

describe('character chunking', () => {
  it('respects size and overlap', () => {
    const text = 'abcdefghijklmnopqrstuvwxyz'
    const chunks = MDocument.fromText(text).chunk({ strategy: 'character', size: 10, overlap: 2 })

    // step = size - overlap = 8 → windows at 0, 8, 16 (16+10 reaches the end)
    expect(chunks.map((c) => c.text)).toEqual([
      'abcdefghij',
      'ijklmnopqr',
      'qrstuvwxyz',
    ])
    // every chunk is at most `size` characters
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(10)
    // adjacent chunks overlap by `overlap` characters
    expect(chunks[0]!.text.slice(-2)).toBe(chunks[1]!.text.slice(0, 2))
  })

  it('returns a single chunk when text is shorter than size', () => {
    const chunks = MDocument.fromText('short').chunk({ strategy: 'character', size: 100 })
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.text).toBe('short')
  })

  it('attaches incrementing chunkIndex and document metadata', () => {
    const chunks = MDocument.fromText('abcdefghij', { source: 'doc-a' }).chunk({
      strategy: 'character',
      size: 4,
      overlap: 0,
    })
    expect(chunks.map((c) => c.metadata.chunkIndex)).toEqual([0, 1, 2])
    expect(chunks.every((c) => c.metadata.source === 'doc-a')).toBe(true)
  })

  it('rejects invalid size/overlap', () => {
    expect(() => MDocument.fromText('x').chunk({ size: 0 })).toThrow()
    expect(() => MDocument.fromText('x').chunk({ size: 10, overlap: 10 })).toThrow()
  })
})

describe('recursive chunking', () => {
  const paragraphs = [
    'The quick brown fox jumps over the lazy dog.',
    'Pack my box with five dozen liquor jugs.',
    'How vexingly quick daft zebras jump!',
  ].join('\n\n')

  it('splits on boundaries and keeps every chunk within size', () => {
    const chunks = MDocument.fromText(paragraphs).chunk({
      strategy: 'recursive',
      size: 50,
      overlap: 10,
    })
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(50)
    // recombining chunk text should still contain the original sentences
    const joined = chunks.map((c) => c.text).join(' ')
    expect(joined).toContain('quick brown fox')
    expect(joined).toContain('five dozen liquor')
  })

  it('keeps a small document as one chunk', () => {
    const chunks = MDocument.fromText('Just one short line.').chunk({
      strategy: 'recursive',
      size: 100,
    })
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.text).toBe('Just one short line.')
  })
})

describe('token chunking', () => {
  it('approximates tokens as ~4 characters', () => {
    const text = 'a'.repeat(80)
    // size 10 tokens ≈ 40 chars, overlap 0
    const chunks = MDocument.fromText(text).chunk({ strategy: 'token', size: 10, overlap: 0 })
    expect(chunks).toHaveLength(2)
    expect(chunks[0]!.text.length).toBe(40)
  })
})

describe('markdown construction', () => {
  it('tags metadata as markdown', () => {
    const doc = MDocument.fromMarkdown('# Title\n\nBody text here.')
    expect(doc.metadata.format).toBe('markdown')
  })
})
