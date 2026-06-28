import { mkdir, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { templateFiles } from './templates'

export interface ScaffoldResult {
  dir: string
  files: string[]
}

/** Write a starter Chituma project into `targetDir`. Throws if it is non-empty. */
export async function scaffold(targetDir: string, name?: string): Promise<ScaffoldResult> {
  if (existsSync(targetDir)) {
    const entries = await readdir(targetDir)
    if (entries.length > 0) {
      throw new Error(`Target directory "${targetDir}" is not empty.`)
    }
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
