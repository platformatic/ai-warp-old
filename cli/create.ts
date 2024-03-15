#!/usr/bin/env node
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { Generator } from '../lib/generator'

async function execute (): Promise<void> {
  const args = parseArgs({
    args: process.argv.slice(2),
    options: {
      dir: {
        type: 'string',
        default: join(process.cwd(), 'ai-warp-app')
      },
      port: { type: 'string', default: '3042' },
      hostname: { type: 'string', default: '0.0.0.0' },
      plugins: { type: 'boolean', default: true },
      tests: { type: 'boolean', default: true },
      typescript: { type: 'boolean', default: false },
      git: { type: 'boolean', default: false },
      install: { type: 'boolean', default: true }
    }
  })

  const generator = new Generator()

  generator.setConfig({
    port: parseInt(args.values.port as string),
    hostname: args.values.hostname,
    plugins: args.values.plugins,
    tests: args.values.tests,
    typescript: args.values.typescript,
    initGitRepository: args.values.git,
    targetDirectory: args.values.dir
  })

  await generator.run()

  console.log('Application created successfully! Run `npm run start` to start an application.')
}

execute().catch(err => {
  throw err
})
