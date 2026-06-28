import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scaffold, parseTarget } from '../src/index'

const created: string[] = []
async function tmp() {
  const d = await mkdtemp(join(tmpdir(), 'create-chituma-'))
  created.push(d)
  return d
}
afterEach(async () => {
  while (created.length) await rm(created.pop()!, { recursive: true, force: true })
})

describe('parseTarget', () => {
  it('reads the directory argument', () => {
    expect(parseTarget(['node', 'create-chituma', 'my-app'])).toBe('my-app')
  })
  it('ignores flags and falls back to a default', () => {
    expect(parseTarget(['node', 'create-chituma', '--yes'])).toBe('my-chituma-app')
  })
})

describe('scaffold', () => {
  it('writes a complete project', async () => {
    const dir = await tmp()
    const target = join(dir, 'app')
    const res = await scaffold(target)
    expect(res.files).toEqual(
      expect.arrayContaining(['package.json', 'src/index.ts', '.env.example', 'tsconfig.json', 'README.md']),
    )
    const pkg = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'))
    expect(pkg.dependencies.chituma).toBeDefined()
    expect(await readFile(join(target, 'src/index.ts'), 'utf8')).toContain('export const chituma')
  })

  it('refuses a non-empty directory', async () => {
    const dir = await tmp()
    const target = join(dir, 'occupied')
    await mkdir(target, { recursive: true })
    await writeFile(join(target, 'x.txt'), 'hi')
    await expect(scaffold(target)).rejects.toThrow(/not empty/)
  })
})
