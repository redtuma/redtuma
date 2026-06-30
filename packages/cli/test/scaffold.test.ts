import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scaffold } from '../src/scaffold'
import { buildCli } from '../src/index'

const created: string[] = []
async function tmp() {
  const d = await mkdtemp(join(tmpdir(), 'redtuma-cli-'))
  created.push(d)
  return d
}

afterEach(async () => {
  while (created.length) await rm(created.pop()!, { recursive: true, force: true })
})

describe('scaffold', () => {
  it('writes a complete starter project', async () => {
    const dir = await tmp()
    const target = join(dir, 'my-agent')
    const res = await scaffold(target)
    expect(res.files).toContain('package.json')
    expect(res.files).toContain('src/index.ts')
    expect(res.files).toContain('.env.example')

    const pkg = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'))
    expect(pkg.name).toBe('my-agent')
    expect(pkg.dependencies.redtuma).toBeDefined()

    const entry = await readFile(join(target, 'src/index.ts'), 'utf8')
    expect(entry).toContain('export const redtuma')
  })

  it('honours an explicit project name', async () => {
    const dir = await tmp()
    const target = join(dir, 'folder')
    await scaffold(target, 'custom-name')
    const pkg = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'))
    expect(pkg.name).toBe('custom-name')
  })

  it('refuses to write into a non-empty directory', async () => {
    const dir = await tmp()
    const target = join(dir, 'occupied')
    await mkdir(target, { recursive: true })
    await writeFile(join(target, 'existing.txt'), 'hi')
    await expect(scaffold(target)).rejects.toThrow(/not empty/)
  })
})

describe('cli', () => {
  it('builds with the expected commands', () => {
    const cli = buildCli()
    const names = cli.commands.map((c) => c.name)
    expect(names).toContain('create')
    expect(names).toContain('dev')
    expect(names).toContain('build')
  })
})
