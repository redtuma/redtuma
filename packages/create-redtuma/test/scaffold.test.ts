import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scaffold, parseTarget, parseTemplate } from '../src/index'

const created: string[] = []
async function tmp() {
  const d = await mkdtemp(join(tmpdir(), 'create-redtuma-'))
  created.push(d)
  return d
}
afterEach(async () => {
  while (created.length) await rm(created.pop()!, { recursive: true, force: true })
})

describe('parseTarget', () => {
  it('reads the directory argument', () => {
    expect(parseTarget(['node', 'create-redtuma', 'my-app'])).toBe('my-app')
  })
  it('ignores flags and falls back to a default', () => {
    expect(parseTarget(['node', 'create-redtuma', '--yes'])).toBe('my-redtuma-app')
  })
})

describe('parseTemplate', () => {
  it('defaults to the default template', () => {
    expect(parseTemplate(['node', 'create-redtuma', 'app'])).toBe('default')
  })
  it('reads --template, --template=, and -t forms', () => {
    expect(parseTemplate(['node', 'x', 'app', '--template', 'cloudflare'])).toBe('cloudflare')
    expect(parseTemplate(['node', 'x', 'app', '--template=cloudflare'])).toBe('cloudflare')
    expect(parseTemplate(['node', 'x', 'app', '-t', 'cloudflare'])).toBe('cloudflare')
  })
  it('rejects an unknown template', () => {
    expect(() => parseTemplate(['node', 'x', 'app', '--template', 'aws'])).toThrow(/Unknown template/)
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
    expect(pkg.dependencies.redtuma).toBeDefined()
    expect(await readFile(join(target, 'src/index.ts'), 'utf8')).toContain('export const redtuma')
  })

  it('scaffolds the cloudflare template with a Durable Object', async () => {
    const dir = await tmp()
    const target = join(dir, 'edge-app')
    const res = await scaffold(target, { template: 'cloudflare' })
    expect(res.template).toBe('cloudflare')
    expect(res.files).toEqual(
      expect.arrayContaining(['wrangler.toml', 'src/worker.ts', 'src/memory.ts', 'package.json']),
    )

    const pkg = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'))
    expect(pkg.dependencies['@redtuma/store-do']).toBeDefined()
    expect(pkg.scripts.deploy).toBe('wrangler deploy')

    const wrangler = await readFile(join(target, 'wrangler.toml'), 'utf8')
    expect(wrangler).toContain('class_name = "Memory"')

    const memory = await readFile(join(target, 'src/memory.ts'), 'utf8')
    expect(memory).toContain('extends RedtumaMemoryObject')

    const worker = await readFile(join(target, 'src/worker.ts'), 'utf8')
    expect(worker).toContain('durableObjectStoreClient')
    expect(worker).toContain("export { Memory }")
  })

  it('refuses a non-empty directory', async () => {
    const dir = await tmp()
    const target = join(dir, 'occupied')
    await mkdir(target, { recursive: true })
    await writeFile(join(target, 'x.txt'), 'hi')
    await expect(scaffold(target)).rejects.toThrow(/not empty/)
  })
})
