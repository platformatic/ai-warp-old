#!/usr/bin/env node
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { Generator } from '../lib/generator.js'

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
      plugin: { type: 'boolean' },
      tests: { type: 'boolean' },
      typescript: { type: 'boolean' },
      git: { type: 'boolean' },
      localSchema: { type: 'boolean' }
    }
  })

  const generator = new Generator()

  const config = {
    port: parseInt(args.values.port),
    hostname: args.values.hostname,
    plugin: args.values.plugin,
    tests: args.values.tests,
    typescript: args.values.typescript,
    initGitRepository: args.values.git,
    targetDirectory: args.values.dir
  }

  generator.setConfig(config)

  await generator.run()

  console.log('Application created successfully! Run `npm run start` to start an application.')
}

execute().catch(err => {
  throw err
})
