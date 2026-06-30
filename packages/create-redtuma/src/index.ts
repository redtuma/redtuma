import { mkdir, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, basename, resolve } from 'node:path'
import { templateFiles, isTemplateName, type TemplateName } from './templates'

export { templateFiles, TEMPLATES, isTemplateName, type TemplateName } from './templates'

export interface ScaffoldResult {
  dir: string
  files: string[]
  template: TemplateName
}

export interface ScaffoldOptions {
  name?: string
  template?: TemplateName
}

/** Write a starter Redtuma project into `targetDir`. Throws if it is non-empty. */
export async function scaffold(targetDir: string, options: ScaffoldOptions = {}): Promise<ScaffoldResult> {
  if (existsSync(targetDir)) {
    const entries = await readdir(targetDir)
    if (entries.length > 0) throw new Error(`Target directory "${targetDir}" is not empty.`)
  }
  const projectName = options.name ?? basename(targetDir)
  const template = options.template ?? 'default'
  const files = templateFiles(projectName, template)
  const written: string[] = []
  for (const [rel, content] of Object.entries(files)) {
    const full = join(targetDir, rel)
    await mkdir(dirname(full), { recursive: true })
    await writeFile(full, content, 'utf8')
    written.push(rel)
  }
  return { dir: targetDir, files: written.sort(), template }
}

/** Parse the target directory from `npm create redtuma <dir>` style argv. */
export function parseTarget(argv: string[]): string {
  const args = argv.slice(2).filter((a) => !a.startsWith('-'))
  return args[0] ?? 'my-redtuma-app'
}

/** Parse `--template <name>` / `--template=<name>` / `-t <name>`; defaults to 'default'. */
export function parseTemplate(argv: string[]): TemplateName {
  const args = argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    let value: string | undefined
    if (arg === '--template' || arg === '-t') value = args[i + 1]
    else if (arg.startsWith('--template=')) value = arg.slice('--template='.length)
    if (value !== undefined) {
      if (!isTemplateName(value)) {
        throw new Error(`Unknown template "${value}". Available: default, cloudflare.`)
      }
      return value
    }
  }
  return 'default'
}

/** Entry point invoked by bin/create-redtuma.mjs. */
export async function run(argv: string[] = process.argv): Promise<void> {
  const target = parseTarget(argv)
  const dir = resolve(target)
  try {
    const template = parseTemplate(argv)
    const result = await scaffold(dir, { template })
    console.log(`\n  Created a new Redtuma project (${result.template}) in ${result.dir}\n`)
    for (const f of result.files) console.log(`    + ${f}`)
    console.log('\n  Next steps:\n')
    console.log(`    cd ${target}`)
    console.log('    npm install')
    if (template === 'cloudflare') {
      console.log('    npx wrangler secret put ANTHROPIC_API_KEY   # for deploy')
      console.log('    cp .dev.vars.example .dev.vars              # for local dev')
      console.log('    npm run dev      # or: npm run deploy\n')
    } else {
      console.log('    cp .env.example .env   # add your ANTHROPIC_API_KEY')
      console.log('    npm run dev\n')
    }
  } catch (err) {
    console.error(`\n  Error: ${(err as Error).message}\n`)
    process.exitCode = 1
  }
}
