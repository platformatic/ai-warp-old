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
      aiProvider: {
        model: 'openai-gpt-3.5-turbo',
        apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      }
    }
    return Object.assign({}, defaultBaseConfig, defaultConfig)
  }

  getConfigFieldsDefinitions (): BaseGenerator.ConfigFieldDefinition[] {
    const serviceConfigFieldsDefs = super.getConfigFieldsDefinitions()
    return [
      ...serviceConfigFieldsDefs,
      {
        // TODO: is it possible to show a list of all of the models supported here?
        var: 'PLT_AI_MODEL',
        label: 'What AI model would you like to use?',
        default: 'openai-gpt-3.5-turbo',
        type: 'string'
      },
      {
        var: 'PLT_AI_API_KEY',
        label: 'What is your API key for that model?',
        default: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'string'
      }
    ]
  }

  async _getConfigFileContents (): Promise<BaseGenerator.JSONValue> {
    const baseConfig = await super._getConfigFileContents()
    const packageJson = await this.getStackablePackageJson()
    const config = {
      $schema: './stackable.schema.json',
      module: packageJson.name,
      aiProvider: {
        model: this.config.aiProvider.model,
        apiKey: `{${this.getEnvVarName('PLT_AI_API_KEY')}}`
      },
      promptDecorators: {
        prefix: 'You are an AI for Acme Corp. here to answer questions anyone has.\nThe question for you to answer is: ',
        suffix: 'Please respond as consisely as possible.'
      }
    }
    return Object.assign({}, baseConfig, config)
  }

  async _beforePrepare () {
    super._beforePrepare()

    this.addEnvVars({
      PLT_AI_MODEL: this.config.aiProvider.model ?? 'openai-gpt-3.5-turbo',
      PLT_AI_API_KEY: this.config.aiProvider.openAi ?? 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
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
