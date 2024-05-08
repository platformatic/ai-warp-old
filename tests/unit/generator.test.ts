/* eslint-disable @typescript-eslint/no-floating-promises */
import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert'
import { existsSync } from 'node:fs'
import { mkdir, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import AiWarpGenerator from '../../lib/generator.js'
import { generateGlobalTypesFile } from '../../lib/templates/types.js'
import { generatePluginWithTypesSupport } from '@platformatic/generators/lib/create-plugin.js'
import { mockAllProviders } from '../utils/mocks/index.js'
mockAllProviders()

const tempDirBase = join(import.meta.dirname, 'tmp')

let counter = 0
export async function getTempDir (baseDir: string): Promise<string> {
  if (baseDir === undefined) {
    baseDir = import.meta.dirname
  }
  const dir = join(baseDir, `platformatic-generators-${process.pid}-${Date.now()}-${counter++}`)
  try {
    await mkdir(dir, { recursive: true })
  } catch (err) {
    // do nothing
  }
  return dir
}

describe('AiWarpGenerator', () => {
  afterEach(async () => {
    try {
      await rm(tempDirBase, { recursive: true })
    } catch (err) {
      // do nothing
    }
  })

  it('generates global.d.ts correctly', async () => {
    const dir = await getTempDir(tempDirBase)

    const generator = new AiWarpGenerator()
    generator.setConfig({
      targetDirectory: dir,
      aiWarpPackageJsonPath: join(import.meta.dirname, '..', '..', 'package.json'),
      aiProvider: 'openai',
      aiModel: 'gpt-3.5-turbo'
    })
    await generator.run()

    const globalTypes = await readFile(join(dir, 'global.d.ts'), 'utf8')
    assert.strictEqual(globalTypes, generateGlobalTypesFile('@platformatic/ai-warp'))
  })

  it('adds env variables to .env', async () => {
    const dir = await getTempDir(tempDirBase)

    const generator = new AiWarpGenerator()
    generator.setConfig({
      targetDirectory: dir,
      aiWarpPackageJsonPath: join(import.meta.dirname, '..', '..', 'package.json'),
      aiProvider: 'openai',
      aiModel: 'gpt-3.5-turbo'
    })
    await generator.run()

    // Env file has the api key fields for all providers
    const envFile = await readFile(join(dir, '.env'), 'utf8')
    assert.ok(envFile.includes('PLT_OPENAI_API_KEY'))
    assert.ok(envFile.includes('PLT_MISTRAL_API_KEY'))

    const sampleEnvFile = await readFile(join(dir, '.env.sample'), 'utf8')
    assert.ok(sampleEnvFile.includes('PLT_OPENAI_API_KEY'))
    assert.ok(sampleEnvFile.includes('PLT_MISTRAL_API_KEY'))
  })

  it('generates platformatic.json correctly', async () => {
    const dir = await getTempDir(tempDirBase)

    const generator = new AiWarpGenerator()
    generator.setConfig({
      targetDirectory: dir,
      aiWarpPackageJsonPath: join(import.meta.dirname, '..', '..', 'package.json'),
      aiProvider: 'openai',
      aiModel: 'gpt-3.5-turbo'
    })
    await generator.run()

    let configFile = JSON.parse(await readFile(join(dir, 'platformatic.json'), 'utf8'))
    assert.deepStrictEqual(configFile.aiProvider, {
      openai: {
        model: 'gpt-3.5-turbo',
        apiKey: '{PLT_OPENAI_API_KEY}'
      }
    })

    generator.setConfig({
      aiProvider: 'mistral',
      aiModel: 'open-mistral-7b'
    })
    await generator.run()

    configFile = JSON.parse(await readFile(join(dir, 'platformatic.json'), 'utf8'))
    assert.deepStrictEqual(configFile.aiProvider, {
      mistral: {
        model: 'open-mistral-7b',
        apiKey: '{PLT_MISTRAL_API_KEY}'
      }
    })
  })

  it('doesn\'t generate a plugin when not wanted', async () => {
    const dir = await getTempDir(tempDirBase)

    const generator = new AiWarpGenerator()
    generator.setConfig({
      targetDirectory: dir,
      aiWarpPackageJsonPath: join(import.meta.dirname, '..', '..', 'package.json'),
      aiProvider: 'openai',
      aiModel: 'gpt-3.5-turbo'
    })
    await generator.run()

    const pluginsDirectory = join(dir, 'plugins')
    assert.strictEqual(existsSync(pluginsDirectory), false)
  })

  it('generates expected js example plugin', async () => {
    const dir = await getTempDir(tempDirBase)

    const generator = new AiWarpGenerator()
    generator.setConfig({
      targetDirectory: dir,
      aiWarpPackageJsonPath: join(import.meta.dirname, '..', '..', 'package.json'),
      aiProvider: 'openai',
      aiModel: 'gpt-3.5-turbo',
      plugin: true
    })
    await generator.run()

    const pluginsDirectory = join(dir, 'plugins')
    assert.strictEqual(existsSync(pluginsDirectory), true)

    const exampleJsPlugin = await readFile(join(pluginsDirectory, 'example.js'), 'utf8')
    assert.strictEqual(exampleJsPlugin, generatePluginWithTypesSupport(false).contents)
  })

  it('generates expected ts example plugin', async () => {
    const dir = await getTempDir(tempDirBase)

    const generator = new AiWarpGenerator()
    generator.setConfig({
      targetDirectory: dir,
      aiWarpPackageJsonPath: join(import.meta.dirname, '..', '..', 'package.json'),
      aiProvider: 'openai',
      aiModel: 'gpt-3.5-turbo',
      plugin: true,
      typescript: true
    })
    await generator.run()

    const pluginsDirectory = join(dir, 'plugins')
    assert.strictEqual(existsSync(pluginsDirectory), true)

    const exampleTsPlugin = await readFile(join(pluginsDirectory, 'example.ts'), 'utf8')
    assert.strictEqual(exampleTsPlugin, generatePluginWithTypesSupport(true).contents)
  })
})
