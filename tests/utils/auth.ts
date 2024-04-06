import { createSigner } from 'fast-jwt'
import { AiWarpConfig } from '../../config'

export const authConfig: AiWarpConfig['auth'] = {
  required: true,
  jwt: {
    secret: 'secret'
  }
}

export function createToken (payload: string | Buffer | { [key: string]: any }, opts = {}): string {
  const signSync = createSigner({
    key: 'secret',
    expiresIn: '1h',
    ...opts
  })

  return signSync(payload)
}
