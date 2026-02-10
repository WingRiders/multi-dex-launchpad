import {describe, expect, it} from 'bun:test'
import {
  type Cutoff,
  calculateCutoff,
  getOverCommittedQuantity,
} from '../../src/agent/cutoff'

describe('calculateCutoff', () => {
  it('returns null when total commitment is below project max', () => {
    const result = calculateCutoff({
      projectMaxCommitment: 100n,
      usersNodes: [
        {keyHash: 'cafe', keyIndex: 0, createdTime: 1n, committed: 30n},
        {keyHash: 'dead', keyIndex: 0, createdTime: 2n, committed: 40n},
      ],
    })

    expect(result).toBeNull()
  })

  it('returns null when total commitment equals project max exactly', () => {
    const result = calculateCutoff({
      projectMaxCommitment: 70n,
      usersNodes: [
        {keyHash: 'cafe', keyIndex: 0, createdTime: 1n, committed: 30n},
        {keyHash: 'dead', keyIndex: 0, createdTime: 2n, committed: 40n},
      ],
    })

    expect(result).toBeNull()
  })

  it('returns cutoff when total commitment exceeds project max', () => {
    const result = calculateCutoff({
      projectMaxCommitment: 50n,
      usersNodes: [
        {keyHash: 'cafe', keyIndex: 0, createdTime: 1n, committed: 30n},
        {keyHash: 'dead', keyIndex: 0, createdTime: 2n, committed: 40n},
      ],
    })

    expect(result).toEqual({
      cutoffKey: {hash: 'dead', index: 0},
      createdTime: 2,
      overcommitted: 20n,
    })
  })

  it('sorts by createdTime first', () => {
    const result = calculateCutoff({
      projectMaxCommitment: 60n,
      usersNodes: [
        {keyHash: 'dead', keyIndex: 0, createdTime: 2n, committed: 40n},
        {keyHash: 'cafe', keyIndex: 0, createdTime: 1n, committed: 30n},
      ],
    })

    expect(result?.cutoffKey).toEqual({hash: 'dead', index: 0})
  })

  it('sorts by hash when createdTime is equal', () => {
    const result = calculateCutoff({
      projectMaxCommitment: 50n,
      usersNodes: [
        {keyHash: 'dead', keyIndex: 0, createdTime: 1n, committed: 30n},
        {keyHash: 'cafe', keyIndex: 0, createdTime: 1n, committed: 30n},
      ],
    })

    expect(result).toEqual({
      cutoffKey: {hash: 'dead', index: 0},
      createdTime: 1,
      overcommitted: 10n,
    })
  })

  it('sorts by index when createdTime and hash are equal', () => {
    const result = calculateCutoff({
      projectMaxCommitment: 40n,
      usersNodes: [
        {keyHash: 'cafe', keyIndex: 1, createdTime: 1n, committed: 30n},
        {keyHash: 'cafe', keyIndex: 0, createdTime: 1n, committed: 20n},
      ],
    })

    expect(result).toEqual({
      cutoffKey: {hash: 'cafe', index: 1},
      createdTime: 1,
      overcommitted: 10n,
    })
  })
})

describe('getOverCommittedQuantity', () => {
  const cutoff: Cutoff = {
    cutoffKey: {hash: 'cafe', index: 1},
    createdTime: 10,
    overcommitted: 15n,
  }

  it('returns 0n when node is before cutoff createdTime', () => {
    const result = getOverCommittedQuantity(cutoff, {
      nodeKey: {hash: 'dead', index: 0},
      createdTime: 9,
      committed: 100n,
    })

    expect(result).toBe(0n)
  })

  it('returns 0n when createdTime is equal and hash is before cutoff hash', () => {
    const result = getOverCommittedQuantity(cutoff, {
      nodeKey: {hash: 'babe', index: 0},
      createdTime: cutoff.createdTime,
      committed: 100n,
    })

    expect(result).toBe(0n)
  })

  it('returns 0n when createdTime and hash are equal and index is before cutoff index', () => {
    const result = getOverCommittedQuantity(cutoff, {
      nodeKey: {hash: 'cafe', index: 0},
      createdTime: cutoff.createdTime,
      committed: 100n,
    })

    expect(result).toBe(0n)
  })

  it('returns cutoff overcommitted amount for the cutoff node itself', () => {
    const result = getOverCommittedQuantity(cutoff, {
      nodeKey: cutoff.cutoffKey,
      createdTime: cutoff.createdTime,
      committed: 100n,
    })

    expect(result).toBe(15n)
  })

  it('returns full committed amount when createdTime is after cutoff', () => {
    const result = getOverCommittedQuantity(cutoff, {
      nodeKey: {hash: 'aaaa', index: 0},
      createdTime: 11,
      committed: 42n,
    })

    expect(result).toBe(42n)
  })

  it('returns full committed amount when createdTime is equal but hash is after cutoff hash', () => {
    const result = getOverCommittedQuantity(cutoff, {
      nodeKey: {hash: 'ffff', index: 0},
      createdTime: cutoff.createdTime,
      committed: 50n,
    })

    expect(result).toBe(50n)
  })

  it('returns full committed amount when createdTime and hash are equal but index is after cutoff index', () => {
    const result = getOverCommittedQuantity(cutoff, {
      nodeKey: {hash: 'cafe', index: 2},
      createdTime: cutoff.createdTime,
      committed: 60n,
    })

    expect(result).toBe(60n)
  })
})
