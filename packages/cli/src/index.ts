import { cac } from 'cac'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import { scaffold } from './scaffold'

export { scaffold } from './scaffold'
export { templateFiles } from './templates'

const VERSION = '0.0.1'

/** Resolve and import a project entry that exports a `chituma` instance. */
async function loadChituma(entry: string): Promise<unknown> {
  const candidates = [entry, `${entry}.ts`, `${entry}.js`, `${entry}/index.ts`, `${entry}/index.js`]
  const found = candidates.map((c) => resolve(c)).find((p) => existsSync(p))
  if (!found) throw new Error(`Could not find entry file. Tried: ${candidates.join(', ')}`)
  const mod = (await import(pathToFileURL(found).href)) as Record<string, unknown>
  const instance = mod.chituma ?? mod.default
  if (!instance) {
    throw new Error(`Entry "${found}" must export a \`chituma\` instance (or default export).`)
  }
  return instance
}

export function buildCli() {
  const cli = cac('chituma')

  cli
    .command('create <dir>', 'Scaffold a new Chituma project')
    .option('--name <name>', 'Project name (defaults to the directory name)')
    .action(async (dir: string, options: { name?: string }) => {
      const result = await scaffold(resolve(dir), options.name)
      console.log(`\nCreated Chituma project in ${result.dir}`)
      for (const f of result.files) console.log(`  + ${f}`)
      console.log('\nNext steps:')
      console.log(`  cd ${dir}`)
      console.log('  npm install')
      console.log('  cp .env.example .env   # add your ANTHROPIC_API_KEY')
      console.log('  npm run dev\n')
    })

  cli
    .command('dev [entry]', 'Serve your agents and workflows over HTTP')
    .option('--port <port>', 'Port to listen on', { default: 3000 })
    .action(async (entry = 'src/index.ts', options: { port: number }) => {
      const [{ serve }, { createHonoServer }] = await Promise.all([
        import('@hono/node-server'),
        import('@chituma/deployer'),
      ])
      const chituma = await loadChituma(entry)
      // createHonoServer is typed against the Chituma class; the loaded instance is one.
      const app = createHonoServer(chituma as never)
      const port = Number(options.port)
      serve({ fetch: app.fetch, port })
      console.log(`Chituma dev server listening on http://localhost:${port}`)
    })

  cli
    .command('build', 'Type-check and build the project')
    .action(() => {
      console.log('Run your bundler/tsc here. Chituma packages are plain ESM and need no special build step.')
    })

  cli.help()
  cli.version(VERSION)
  return cli
}

/** Entry point invoked by bin/chituma.mjs. */
export function run(argv: string[] = process.argv): void {
  const cli = buildCli()
  cli.parse(argv)
}
