import {describe, expect, it} from 'bun:test'
import {calculateEligibilityWithCutoff} from '../../../src/agent/commit-fold/calculate-eligibility-with-cutoff'

describe('calculateEligibilityWithCutoff', () => {
  it('returns undefined cutoff when total committed exactly matches projectMaxCommitment', () => {
    const result = calculateEligibilityWithCutoff(70n, [
      {keyHash: 'a', keyIndex: 0, committed: 30n, createdTime: 1n},
      {keyHash: 'b', keyIndex: 0, committed: 40n, createdTime: 2n},
    ])

    expect(result).toEqual({
      eligibleNodeKeys: new Set(['a#0', 'b#0']),
      cutoff: undefined,
    })
  })

  it('returns only eligible nodes with no cutoff when projectMaxCommitment is not reached', () => {
    const result = calculateEligibilityWithCutoff(100n, [
      {keyHash: 'a', keyIndex: 0, committed: 30n, createdTime: 1n},
      {keyHash: 'b', keyIndex: 0, committed: 40n, createdTime: 2n},
    ])

    expect(result).toEqual({
      eligibleNodeKeys: new Set(['a#0', 'b#0']),
      cutoff: undefined,
    })
  })

  it('returns cutoff when total committed exceeds projectMaxCommitment', () => {
    const result = calculateEligibilityWithCutoff(50n, [
      {keyHash: 'a', keyIndex: 0, committed: 30n, createdTime: 1n},
      {keyHash: 'b', keyIndex: 0, committed: 40n, createdTime: 2n},
      {keyHash: 'c', keyIndex: 0, committed: 20n, createdTime: 3n},
    ])

    expect(result).toEqual({
      eligibleNodeKeys: new Set(['a#0', 'b#0']),
      cutoff: {
        cutoffKey: {hash: 'b', index: 0},
        overcommitted: 20n, // 30 + 40 - 50
        createdTime: 2,
      },
    })
  })
})
