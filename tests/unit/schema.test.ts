/* eslint-disable @typescript-eslint/no-floating-promises */
import { it } from 'node:test'
import assert from 'node:assert'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { schema } from '../../lib/schema.js'

it('updates schema version correctly', async () => {
  const pkgJsonText = await readFile(join(import.meta.dirname, '..', '..', 'package.json'), 'utf8')
  const pkgJson = JSON.parse(pkgJsonText)
  assert.strictEqual(schema.version, pkgJson.version)
})
