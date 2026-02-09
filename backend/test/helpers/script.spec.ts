import {describe, expect, it} from 'bun:test'
import {SCRIPT_HASH_LENGTH} from '@wingriders/multi-dex-launchpad-common'
import {encodeOgmiosScript} from '../../src/helpers/script'

describe('encodeOgmiosScript', () => {
  const cbor = '4e4d01000033222220051200120011'

  it('encodes plutus:v1 script correctly', () => {
    const {scriptRef, scriptHash} = encodeOgmiosScript('plutus:v1', cbor)

    expect(scriptRef).toStartWith('8201')
    expect(scriptRef).toContain(cbor)
    expect(scriptHash.length).toBe(SCRIPT_HASH_LENGTH * 2)
  })

  it('encodes plutus:v2 script correctly', () => {
    const {scriptRef, scriptHash} = encodeOgmiosScript('plutus:v2', cbor)

    expect(scriptRef).toStartWith('8202')
    expect(scriptRef).toContain(cbor)
    expect(scriptHash.length).toBe(SCRIPT_HASH_LENGTH * 2)
  })

  it('encodes plutus:v3 script correctly', () => {
    const {scriptRef, scriptHash} = encodeOgmiosScript('plutus:v3', cbor)

    expect(scriptRef).toStartWith('8203')
    expect(scriptRef).toContain(cbor)
    expect(scriptHash.length).toBe(SCRIPT_HASH_LENGTH * 2)
  })
})
