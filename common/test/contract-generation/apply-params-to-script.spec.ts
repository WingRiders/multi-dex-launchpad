import {describe, expect, it} from 'bun:test'

import type {Data} from '@meshsdk/core'
import {PlutusScriptVersion} from '../../src/constants'
import {applyParamsToScript} from '../../src/contract-generation/apply-params-to-script'

const SCRIPT_CBOR_HEX = '4e4d01000033222220051200120011'

describe('applyParamsToScript (Mesh / CSL)', () => {
  const cases: {
    name: string
    params: Data[]
    expectedHash: string
    expectedHex: string
  }[] = [
    {
      name: 'string',
      params: ['68656c6c6f'], // Mesh Data supports only hex strings, so this is "hello" in hex
      expectedHash: '3f674f01f39e49aa9aeb4b23950c83caa86c1ad2f4cfeaa5663f6b88',
      expectedHex: '581a5818010000333222220051200120014c01064568656c6c6f0001',
    },
    {
      name: 'empty string',
      params: [''],
      expectedHash: '00dfe1f06d3aa747593175c9b6a78f3f008a724295c697a2afc8ed90',
      expectedHex: '5453010000333222220051200120014c0101400001',
    },
    {
      name: 'number',
      params: [42],
      expectedHash: '6475cf0f7faad200ebeabad6a70049e82eb888a1464240dfe539fe4c',
      expectedHex: '5554010000333222220051200120014c0102182a0001',
    },
    {
      name: 'bigint',
      params: [BigInt('12345678901234567890')],
      // Expected values differ from cab, because cab uses non-canonical encoding because of incorrect MAX_INT64
      expectedHash: 'e13ac41d7d9ca921245a16d86cc9f3465e8c1d1fe04f8c71584ba72b',
      expectedHex:
        '581d581b010000333222220051200120014c01091bab54a98ceb1f0ad20001',
    },
    {
      name: 'bytes',
      params: ['deadbeef'],
      expectedHash: '7d1f5a021727d390f7267db8bbd55cf23b2e9fee7dc68fc4e44dff36',
      expectedHex: '581857010000333222220051200120014c010544deadbeef0001',
    },
    {
      name: 'array',
      params: [[1, '61', 2]], // 2nd item is "a" in hex
      expectedHash: 'e6210301e7ff977944239ed0ea8925ea5f4fde695fb4c187ce62a8b0',
      expectedHex: '581a5818010000333222220051200120014c01069f01416102ff0001',
    },
    {
      name: 'map',
      params: [
        new Map<Data, Data>([
          [2, '62'],
          ['61', 1], // The order is switched from the test case in cab, because entries are being sorted there
        ]),
      ],
      expectedHash: '967b25a3585379641b5f42157efe78d31c15cf3534f17da5ea8d5d3a',
      expectedHex: '581b5819010000333222220051200120014c0107a20241624161010001',
    },
    {
      name: 'constr',
      params: [
        {
          alternative: 0,
          fields: [1, 2],
        },
      ],
      expectedHash: 'ed636781a2422757fb88d1d9ab6da4e7356c033f36ce264fff6003c0',
      expectedHex: '581a5818010000333222220051200120014c0106d8799f0102ff0001',
    },
  ]

  for (const {name, params, expectedHash, expectedHex} of cases) {
    it(`should apply params (${name}) and return correct V2 script hash`, async () => {
      const {hex, hash} = await applyParamsToScript(
        {cborHex: SCRIPT_CBOR_HEX, version: PlutusScriptVersion.PlutusScriptV2},
        params,
      )

      expect(hex).toBe(expectedHex)
      expect(hash).toBe(expectedHash)
    })
  }
})
