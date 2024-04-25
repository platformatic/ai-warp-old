import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { Generator as ServiceGenerator } from '@platformatic/service'
import { BaseGenerator } from '@platformatic/generators'
import { schema } from './schema.js'
import { generateGlobalTypesFile } from './templates/types.js'
import { generatePlugins } from '@platformatic/generators/lib/create-plugin.js'

interface PackageJson {
  name: string
  version: string
}

class AiWarpGenerator extends ServiceGenerator {
  private _packageJson: PackageJson | null = null

  getDefaultConfig (): BaseGenerator.JSONValue {
    const defaultBaseConfig = super.getDefaultConfig()
    const defaultConfig = {
      aiProvider: 'openai',
      aiModel: 'gpt-3.5-turbo',
      // TODO: temporary fix, when running the typescript files directly
      //  (in tests) this goes a directory above the actual project. Exposing
      //  temporarily until I come up with something better
      aiWarpPackageJsonPath: join(import.meta.dirname, '..', '..', 'package.json')
    }
    return Object.assign({}, defaultBaseConfig, defaultConfig)
  }

  getConfigFieldsDefinitions (): BaseGenerator.ConfigFieldDefinition[] {
    const serviceConfigFieldsDefs = super.getConfigFieldsDefinitions()
    return [
      ...serviceConfigFieldsDefs,
      {
        var: 'PLT_AI_PROVIDER',
        label: 'What AI provider would you like to use? (e.g. openai, mistral)',
        default: 'openai',
        type: 'string',
        configValue: 'aiProvider'
      },
      {
        // TODO: is it possible to show a list of all of the models supported here?
        var: 'PLT_AI_MODEL',
        label: 'What AI model would you like to use?',
        default: 'gpt-3.5-turbo',
        type: 'string',
        configValue: 'aiModel'
      }
    ]
  }

  async _getConfigFileContents (): Promise<BaseGenerator.JSONValue> {
    const baseConfig = await super._getConfigFileContents()
    const packageJson = await this.getStackablePackageJson()
    const config = {
      $schema: './stackable.schema.json',
      module: packageJson.name,
      aiProvider: {},
      promptDecorators: {
        prefix: 'You are an AI for Acme Corp. here to answer questions anyone has.\nThe question for you to answer is: ',
        suffix: 'Please respond as consisely as possible.'
      }
    }
    switch (this.config.aiProvider) {
      case 'mistral':
        config.aiProvider = {
          mistral: {
            model: this.config.aiModel,
            apiKey: `{${this.getEnvVarName('PLT_MISTRAL_API_KEY')}}`
          }
        }
        break
      case 'openai':
        config.aiProvider = {
          openai: {
            model: this.config.aiModel,
            apiKey: `{${this.getEnvVarName('PLT_OPENAI_API_KEY')}}`
          }
        }
        break
      case 'ollama':
        config.aiProvider = {
          ollama: {
            host: 'http://127.0.0.1:11434',
            model: this.config.aiModel
          }
        }
        break
      case 'azure':
        config.aiProvider = {
          azure: {
            endpoint: 'https://myaccount.openai.azure.com/',
            apiKey: `{${this.getEnvVarName('PLT_AZURE_API_KEY')}}`,
            deploymentName: this.config.aiModel
          }
        }
        break
      default:
        config.aiProvider = {
          openai: {
            model: this.config.aiModel,
            apiKey: `{${this.getEnvVarName('PLT_OPENAI_API_KEY')}}`
          }
        }
    }

    if (this.config.plugin !== undefined && this.config.plugin) {
      Object.assign(config, {
        plugins: {
          paths: [
            { path: './plugins', encapsulate: false }
          ]
        }
      })
    }

    return Object.assign({}, baseConfig, config)
  }

  async _beforePrepare (): Promise<void> {
    await super._beforePrepare()

    this.addEnvVars({
      PLT_OPENAI_API_KEY: this.config.openAiApiKey ?? 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      PLT_MISTRAL_API_KEY: this.config.mistralApiKey ?? 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }, { overwrite: false })

    const packageJson = await this.getStackablePackageJson()

    this.config.dependencies = {
      [packageJson.name]: `^${packageJson.version}`
    }
  }

  async _afterPrepare (): Promise<void> {
    const packageJson = await this.getStackablePackageJson()
    this.addFile({
      path: '',
      file: 'global.d.ts',
      contents: generateGlobalTypesFile(packageJson.name)
    })

    this.addFile({
      path: '',
      file: 'stackable.schema.json',
      contents: JSON.stringify(schema, null, 2)
    })

    if (this.config.plugin !== undefined && this.config.plugin) {
      const plugins = generatePlugins(this.config.typescript ?? false)
      for (const plugin of plugins) {
        this.addFile(plugin)
      }
    }
  }

  async getStackablePackageJson (): Promise<PackageJson> {
    if (this._packageJson == null) {
      const packageJsonPath = this.config.aiWarpPackageJsonPath
      const packageJsonFile = await readFile(packageJsonPath, 'utf8')
      const packageJson: Partial<PackageJson> = JSON.parse(packageJsonFile)

      if (packageJson.name === undefined || packageJson.name === null) {
        throw new Error('Missing package name in package.json')
      }

      if (packageJson.version === undefined || packageJson.version === null) {
        throw new Error('Missing package version in package.json')
      }

      this._packageJson = packageJson as PackageJson
      return packageJson as PackageJson
    }
    return this._packageJson
  }
}

export default AiWarpGenerator
export { AiWarpGenerator as Generator }
