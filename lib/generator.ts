import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { Generator as ServiceGenerator } from '@platformatic/service'
import { BaseGenerator } from '@platformatic/generators'
import { schema } from './schema'
import { generateGlobalTypesFile } from './templates/types'

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
      aiModel: 'gpt-3.5-turbo'
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
      default:
        config.aiProvider = {
          openai: {
            model: this.config.aiModel,
            apiKey: `{${this.getEnvVarName('PLT_OPENAI_API_KEY')}}`
          }
        }
    }

    return Object.assign({}, baseConfig, config)
  }

  async _beforePrepare () {
    super._beforePrepare()

    this.addEnvVars({
      PLT_OPENAI_API_KEY: this.config.openAiApiKey ?? 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      PLT_MISTRAL_API_KEY: this.config.mistralApiKey ?? 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }, { overwrite: false })

    const packageJson = await this.getStackablePackageJson()

    this.config.dependencies = {
      [packageJson.name]: `^${packageJson.version}`
    }
  }

  async _afterPrepare () {
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
  }

  async getStackablePackageJson (): Promise<PackageJson> {
    if (this._packageJson == null) {
      const packageJsonPath = join(__dirname, '..', '..', 'package.json')
      const packageJsonFile = await readFile(packageJsonPath, 'utf8')
      const packageJson = JSON.parse(packageJsonFile)

      if (!packageJson.name) {
        throw new Error('Missing package name in package.json')
      }

      if (!packageJson.version) {
        throw new Error('Missing package version in package.json')
      }

      this._packageJson = packageJson
      return packageJson
    }
    return this._packageJson
  }
}

export default AiWarpGenerator
export { AiWarpGenerator as Generator }
