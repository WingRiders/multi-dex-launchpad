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
      expectedHash: '32686db2f6428333dbf577fffb3fa72e99ced909dcd512a1734e4d4c',
      expectedHex: '5818010000333222220051200120014c01064568656c6c6f0001',
    },
    {
      name: 'empty string',
      params: [''],
      expectedHash: '0e3880580e0f5b84b090387cd09e155a593ce17e378eb4aa4793d523',
      expectedHex: '53010000333222220051200120014c0101400001',
    },
    {
      name: 'number',
      params: [42],
      expectedHash: 'd7d26007a5cd865c55d0e3efa2d64c82a4b5f0880b880272e95f0264',
      expectedHex: '54010000333222220051200120014c0102182a0001',
    },
    {
      name: 'bigint',
      params: [BigInt('12345678901234567890')],
      // Expected values differ from cab, because cab uses non-canonical encoding because of incorrect MAX_INT64
      expectedHash: '9eb21bacacf3c01e584f4fd15ffe0574811bf0d353a84c9bd65ef733',
      expectedHex: '581b010000333222220051200120014c01091bab54a98ceb1f0ad20001',
    },
    {
      name: 'bytes',
      params: ['deadbeef'],
      expectedHash: '03b389d44f05f20428ba07c8646eea0ebc47e46baf94fed1e8414f99',
      expectedHex: '57010000333222220051200120014c010544deadbeef0001',
    },
    {
      name: 'array',
      params: [[1, '61', 2]], // 2nd item is "a" in hex
      expectedHash: '5b5abb4533dc79a929118724ce92240110c33d63dfd631097d640033',
      expectedHex: '5818010000333222220051200120014c01069f01416102ff0001',
    },
    {
      name: 'map',
      params: [
        new Map<Data, Data>([
          [2, '62'],
          ['61', 1], // The order is switched from the test case in cab, because entries are being sorted there
        ]),
      ],
      expectedHash: 'eeaeeb17340b10434b740413b7e9ee567c32711c9df88c7abb26b714',
      expectedHex: '5819010000333222220051200120014c0107a20241624161010001',
    },
    {
      name: 'constr',
      params: [
        {
          alternative: 0,
          fields: [1, 2],
        },
      ],
      expectedHash: '73f10a3fee96bfebb57996779ab7ce06f05f60874a0a1439a89dba2a',
      expectedHex: '5818010000333222220051200120014c0106d8799f0102ff0001',
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
