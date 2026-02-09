import {describe, expect, it} from 'bun:test'
import type {MetadatumDetailedSchema, Utxo} from '@cardano-ogmios/schema'
import {createUnit, LOVELACE_UNIT} from '@wingriders/multi-dex-launchpad-common'
import {
  ogmiosUtxoToMeshUtxo,
  ogmiosValueToMeshAssets,
  parseOgmiosMetadatum,
} from '../../../src/agent/ogmios/helpers'

describe('ogmiosValueToMeshAssets', () => {
  it('excludes ADA by default', () => {
    const value = {
      ada: {lovelace: 1_000_000n},
    }

    const result = ogmiosValueToMeshAssets(value)

    expect(result).toEqual([])
  })

  it('includes ADA when includeAda is true', () => {
    const value = {
      ada: {lovelace: 1_000_000n},
    }

    const result = ogmiosValueToMeshAssets(value, {includeAda: true})

    expect(result).toEqual([
      {
        unit: LOVELACE_UNIT,
        quantity: '1000000',
      },
    ])
  })

  it('excludes zero-quantity assets by default', () => {
    const value = {
      ada: {lovelace: 0n},
      policy1: {
        tokenA: 0n,
      },
    }

    const result = ogmiosValueToMeshAssets(value)

    expect(result).toEqual([])
  })

  it('includes zero-quantity assets when includeZero is true', () => {
    const value = {
      ada: {lovelace: 0n},
      policy1: {
        tokenA: 0n,
      },
    }

    const result = ogmiosValueToMeshAssets(value, {includeZero: true})

    expect(result).toEqual([
      {
        unit: createUnit('policy1', 'tokenA'),
        quantity: '0',
      },
    ])
  })

  it('converts non-ADA assets correctly', () => {
    const value = {
      ada: {lovelace: 0n},
      policy1: {
        tokenA: 42n,
      },
    }

    const result = ogmiosValueToMeshAssets(value)

    expect(result).toEqual([
      {
        unit: createUnit('policy1', 'tokenA'),
        quantity: '42',
      },
    ])
  })

  it('handles mixed ADA and assets with flags', () => {
    const value = {
      ada: {lovelace: 2_000_000n},
      policy1: {
        tokenA: 5n,
        tokenB: 0n,
      },
    }

    const result = ogmiosValueToMeshAssets(value, {
      includeAda: true,
      includeZero: false,
    })

    expect(result).toEqual([
      {
        unit: LOVELACE_UNIT,
        quantity: '2000000',
      },
      {
        unit: createUnit('policy1', 'tokenA'),
        quantity: '5',
      },
    ])
  })
})

describe('parseOgmiosMetadatum', () => {
  it('parses int metadatum', () => {
    const metadatum: MetadatumDetailedSchema = {int: 42n}

    const result = parseOgmiosMetadatum(metadatum)

    expect(result).toBe(42n)
  })

  it('parses string metadatum', () => {
    const metadatum: MetadatumDetailedSchema = {string: 'hello'}

    const result = parseOgmiosMetadatum(metadatum)

    expect(result).toBe('hello')
  })

  it('parses bytes metadatum', () => {
    const metadatum: MetadatumDetailedSchema = {bytes: 'deadbeef'}

    const result = parseOgmiosMetadatum(metadatum)

    expect(result).toBe('deadbeef')
  })

  it('parses list metadatum recursively', () => {
    const metadatum: MetadatumDetailedSchema = {
      list: [{int: 1n}, {string: 'a'}, {bytes: 'ff'}],
    }

    const result = parseOgmiosMetadatum(metadatum)

    expect(result).toEqual([1n, 'a', 'ff'])
  })

  it('parses map metadatum recursively', () => {
    const metadatum: MetadatumDetailedSchema = {
      map: [
        {k: {string: 'a'}, v: {int: 1n}},
        {k: {string: 'b'}, v: {string: 'two'}},
      ],
    }

    const result = parseOgmiosMetadatum(metadatum)

    expect(result).toEqual({
      a: 1n,
      b: 'two',
    })
  })

  it('parses nested list and map structures', () => {
    const metadatum: MetadatumDetailedSchema = {
      list: [
        {
          map: [
            {
              k: {string: 'nested'},
              v: {list: [{int: 7n}, {string: 'x'}]},
            },
          ],
        },
      ],
    }

    const result = parseOgmiosMetadatum(metadatum)

    expect(result).toEqual([
      {
        nested: [7n, 'x'],
      },
    ])
  })
})

describe('ogmiosUtxoToMeshUtxo', () => {
  it('maps basic UTxO fields and includes ADA', () => {
    const utxo: Utxo[number] = {
      transaction: {
        id: '6a4fc7abb9c978ad24b7c048ecba92a68780d4b3fa96f0e867e807f7028cc93a',
      },
      index: 0,
      address:
        'addr_test1wz83a7lfrrlnvskmtj4zeevs8clkk7sqym82ccgxuh6777cclg72l',
      value: {
        ada: {lovelace: 1_500_000n},
      },
      datumHash:
        '7cc661caaccc055409a5b2225f7d0d2efa20f1aba575d1a3e5c851b2bd82e395',
      datum:
        'd8799f581c9916b846579fc7109f6ab82fd94c7d9b47af8694ea8697a167b1bb0800ff',
    }

    const result = ogmiosUtxoToMeshUtxo(utxo)

    expect(result).toEqual({
      input: {
        txHash:
          '6a4fc7abb9c978ad24b7c048ecba92a68780d4b3fa96f0e867e807f7028cc93a',
        outputIndex: 0,
      },
      output: {
        address:
          'addr_test1wz83a7lfrrlnvskmtj4zeevs8clkk7sqym82ccgxuh6777cclg72l',
        amount: [
          {
            unit: LOVELACE_UNIT,
            quantity: '1500000',
          },
        ],
        dataHash:
          '7cc661caaccc055409a5b2225f7d0d2efa20f1aba575d1a3e5c851b2bd82e395',
        plutusData:
          'd8799f581c9916b846579fc7109f6ab82fd94c7d9b47af8694ea8697a167b1bb0800ff',
        scriptRef: undefined,
        scriptHash: undefined,
      },
    })
  })

  it('ignores native scripts', () => {
    const utxo: Utxo[number] = {
      transaction: {id: 'tx'},
      index: 1,
      address:
        'addr_test1wz83a7lfrrlnvskmtj4zeevs8clkk7sqym82ccgxuh6777cclg72l',
      value: {
        ada: {lovelace: 1_500_000n},
      },
      script: {
        language: 'native',
        json: {clause: 'after', slot: 0},
      },
    }

    const result = ogmiosUtxoToMeshUtxo(utxo)

    expect(result.output.scriptRef).toBeUndefined()
    expect(result.output.scriptHash).toBeUndefined()
  })

  it('encodes plutus scripts and attaches scriptRef and scriptHash', () => {
    const cbor = '4e4d01000033222220051200120011'

    const utxo: Utxo[number] = {
      transaction: {id: 'tx'},
      index: 3,
      address:
        'addr_test1wz83a7lfrrlnvskmtj4zeevs8clkk7sqym82ccgxuh6777cclg72l',
      value: {
        ada: {lovelace: 1_500_000n},
      },
      script: {
        language: 'plutus:v2',
        cbor,
      },
    }

    const result = ogmiosUtxoToMeshUtxo(utxo)

    expect(result.output.scriptRef).toBe(`82024f${cbor}`)
    expect(result.output.scriptHash).toBe(
      '83a2d61669af82b7eb7d4ad30337951316e8a2729574fc37dfd50aa2',
    )
  })
})
