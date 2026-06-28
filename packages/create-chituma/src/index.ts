import { mkdir, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, basename, resolve } from 'node:path'
import { templateFiles } from './templates'

export { templateFiles } from './templates'

export interface ScaffoldResult {
  dir: string
  files: string[]
}

/** Write a starter Chituma project into `targetDir`. Throws if it is non-empty. */
export async function scaffold(targetDir: string, name?: string): Promise<ScaffoldResult> {
  if (existsSync(targetDir)) {
    const entries = await readdir(targetDir)
    if (entries.length > 0) throw new Error(`Target directory "${targetDir}" is not empty.`)
  }
  const projectName = name ?? basename(targetDir)
  const files = templateFiles(projectName)
  const written: string[] = []
  for (const [rel, content] of Object.entries(files)) {
    const full = join(targetDir, rel)
    await mkdir(dirname(full), { recursive: true })
    await writeFile(full, content, 'utf8')
    written.push(rel)
  }
  return { dir: targetDir, files: written.sort() }
}

/** Parse the target directory from `npm create chituma <dir>` style argv. */
export function parseTarget(argv: string[]): string {
  const args = argv.slice(2).filter((a) => !a.startsWith('-'))
  return args[0] ?? 'my-chituma-app'
}

/** Entry point invoked by bin/create-chituma.mjs. */
export async function run(argv: string[] = process.argv): Promise<void> {
  const target = parseTarget(argv)
  const dir = resolve(target)
  try {
    const result = await scaffold(dir)
    console.log(`\n  Created a new Chituma project in ${result.dir}\n`)
    for (const f of result.files) console.log(`    + ${f}`)
    console.log('\n  Next steps:\n')
    console.log(`    cd ${target}`)
    console.log('    npm install')
    console.log('    cp .env.example .env   # add your ANTHROPIC_API_KEY')
    console.log('    npm run dev\n')
  } catch (err) {
    console.error(`\n  Error: ${(err as Error).message}\n`)
    process.exitCode = 1
  }
}
