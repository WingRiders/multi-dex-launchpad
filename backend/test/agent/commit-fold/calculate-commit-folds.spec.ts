import {describe, expect, it} from 'bun:test'
import {calculateCommitFoldDatums} from '../../../src/agent/commit-fold/calculate-commit-folds'

describe('calculateCommitFoldDatums', () => {
  const AGENT_ADDRESS =
    'addr_test1qzuz2e6p4z54thrj0u5nnpg5523jkmnvqjtu78p6873daddnq89ztzv3zmk7lyr9krkt4dpdaw37x5v3daf5muspw0rqwhnlz5'

  const baseParams = {
    nodeScriptHash: 'script_hash',
    agentAddress: AGENT_ADDRESS,
  }

  it('handles head node and eligible accumulation', () => {
    const result = calculateCommitFoldDatums({
      ...baseParams,
      eligibleNodeKeys: new Set(['a#0']),
      nodes: [
        {
          keyHash: null,
          keyIndex: null,
          committed: 0n,
          nextHash: 'a',
          nextIndex: 0,
        },
        {
          keyHash: 'a',
          keyIndex: 0,
          committed: 10n,
          nextHash: null,
          nextIndex: null,
        },
      ],
    })

    expect(result.map((r) => r.commitFoldDatum.committed)).toEqual([0n, 10n])
  })

  it('handles eligible, ineligible and cutoff nodes correctly', () => {
    const cutoff = {
      cutoffKey: {hash: 'b', index: 0},
      createdTime: 123,
      overcommitted: 5n,
    }

    const result = calculateCommitFoldDatums({
      ...baseParams,
      eligibleNodeKeys: new Set(['a#0', 'b#0']),
      cutoff,
      nodes: [
        // head (never eligible)
        {
          keyHash: null,
          keyIndex: null,
          committed: 999n,
          nextHash: 'a',
          nextIndex: 0,
        },
        // eligible, non-cutoff
        {
          keyHash: 'a',
          keyIndex: 0,
          committed: 20n,
          nextHash: 'b',
          nextIndex: 0,
        },
        // eligible, cutoff node
        {
          keyHash: 'b',
          keyIndex: 0,
          committed: 30n,
          nextHash: 'c',
          nextIndex: 0,
        },
        // ineligible tail
        {
          keyHash: 'c',
          keyIndex: 0,
          committed: 40n,
          nextHash: null,
          nextIndex: null,
        },
      ],
    })

    expect(result.map((r) => r.commitFoldDatum)).toEqual([
      {
        nodeScriptHash: 'script_hash',
        next: {hash: 'a', index: 0},
        committed: 0n,
        cutoffKey: {hash: 'b', index: 0},
        cutoffTime: 123,
        overcommitted: 5n,
        nodeCount: 1,
        owner: AGENT_ADDRESS,
      },
      {
        nodeScriptHash: 'script_hash',
        next: {hash: 'b', index: 0},
        committed: 20n,
        cutoffKey: {hash: 'b', index: 0},
        cutoffTime: 123,
        overcommitted: 5n,
        nodeCount: 2,
        owner: AGENT_ADDRESS,
      },
      {
        nodeScriptHash: 'script_hash',
        next: {hash: 'c', index: 0},
        committed: 45n,
        cutoffKey: {hash: 'b', index: 0},
        cutoffTime: 123,
        overcommitted: 5n,
        nodeCount: 3,
        owner: AGENT_ADDRESS,
      },
      {
        nodeScriptHash: 'script_hash',
        next: null,
        committed: 45n,
        cutoffKey: {hash: 'b', index: 0},
        cutoffTime: 123,
        overcommitted: 5n,
        nodeCount: 4,
        owner: AGENT_ADDRESS,
      },
    ])
  })
})
