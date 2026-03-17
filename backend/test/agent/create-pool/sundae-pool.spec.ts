import {describe, expect, it} from 'bun:test'
import {getSundaePoolIdentifier} from '../../../src/agent/create-pool/sundae-pool'

describe('sundae pool identifier', () => {
  // https://preprod.cardanoscan.io/transaction/e5b1f63b9dd6a9f4cf14ade674442ae296b24e7d555bcd0343dcd6262a289979?tab=utxo
  it('should calculate', () => {
    const identifier = getSundaePoolIdentifier({
      txHash:
        'bbe22c95fbbb554997d7a5ae36873f75c32e87bdb93888761f37e60b34a2041e',
      outputIndex: 1,
    })
    expect(identifier).toBe(
      '891f20625f06d0d27fe479fe0ac150c2ff1ecf7bb12b9dc9c101ae3f',
    )
  })
})
