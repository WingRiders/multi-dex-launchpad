import {describe, expect, it} from 'bun:test'
import {
  decodeDatum,
  sundaePoolDatumCborSchema,
  wrPoolDatumCborSchema,
} from '@/index'

describe('decodeWrPoolDatum', () => {
  it('works with on-chain data', () => {
    const cbor =
      'd8799f581cc134d839a64a5dfb9b155869ef3f34280751a622f69958baa8ffd29c4040581cc0ee29a85b13209423b10447d3c2e6a50641a15c57770e27cb9d50734a57696e67526964657273181e0500001927101a001e84801b0000019c03ae7d881a002d814d1a02bf1b1600000000d87a80d87a80d87980ff'
    expect(decodeDatum(wrPoolDatumCborSchema, cbor)).toEqual({
      requestValidatorHash:
        'c134d839a64a5dfb9b155869ef3f34280751a622f69958baa8ffd29c',
      assetASymbol: '',
      assetAToken: '',
      assetBSymbol: 'c0ee29a85b13209423b10447d3c2e6a50641a15c57770e27cb9d5073',
      assetBToken: '57696e67526964657273',
      swapFeeInBasis: 30,
      protocolFeeInBasis: 5,
      projectFeeInBasis: 0,
      reserveFeeInBasis: 0,
      feeBasis: 10000,
      agentFeeAda: 2000000,
      lastInteraction: 1769588293000,
      treasuryA: 2982221,
      treasuryB: 46078742,
      projectTreasuryA: 0,
      projectTreasuryB: 0,
      reserveTreasuryA: 0,
      reserveTreasuryB: 0,
      projectBeneficiary: null,
      reserveBeneficiary: null,
    })
  })
})

describe('decodeSundaePoolDatum', () => {
  it('works with on-chain data', () => {
    const cbor =
      'd8799f581c3e259cc410c7932ff0f579085cb47e882498f1af51f1d8db90bc14fc9f9f4040ff9f581ce5a42a1a1d3d1da71b0449663c32798725888d2eb0843c4dabeca05a51576f726c644d6f62696c65546f6b656e58ffff1b000000af7cf28a0f181e181ed87a80001ac6866340ff'

    expect(decodeDatum(sundaePoolDatumCborSchema, cbor)).toEqual({
      identifier: '3e259cc410c7932ff0f579085cb47e882498f1af51f1d8db90bc14fc',
      assetA: 'lovelace',
      assetB:
        'e5a42a1a1d3d1da71b0449663c32798725888d2eb0843c4dabeca05a576f726c644d6f62696c65546f6b656e58',
      circulatingLp: 753715546639,
      bidFeesPer10Thousand: 30,
      askFeesPer10Thousand: 30,
      feeManager: null,
      marketOpen: 0,
      protocolFees: 3330696000,
    })
  })
})
