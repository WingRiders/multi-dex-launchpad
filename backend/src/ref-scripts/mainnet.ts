import type {RefScriptUtxo} from '@wingriders/multi-dex-launchpad-common'

export const mainnetPoolContracts = {
  wrFactoryValidator: {
    input: {
      txHash:
        '5ec56338104fcbfe32288c649d9633f0d9060abce8b8608b156294f0a81d29e2',
      outputIndex: 0,
    },
    output: {
      address: 'addr1w9gexmeunzsykesf42d4eqet5yvzeap6trjnflxqtkcf66g5740fw',
      amount: [{unit: 'lovelace', quantity: '23368820'}],
      scriptRef: '', // TODO
      scriptHash: 'c57b588ebda735d49008d47afde48198ec37062d6ceb758803515013',
    },
    scriptSize: 0, // TODO
  },
  wrPoolTokensPolicy: {
    // pool, factory and LP tokens share the same policy
    input: {
      txHash:
        '5ec56338104fcbfe32288c649d9633f0d9060abce8b8608b156294f0a81d29e2',
      outputIndex: 4,
    },
    output: {
      address: 'addr1w9gexmeunzsykesf42d4eqet5yvzeap6trjnflxqtkcf66g5740fw',
      amount: [{unit: 'lovelace', quantity: '3448000'}],
      scriptRef: '', // TODO
      scriptHash: '6fdc63a1d71dc2c65502b79baae7fb543185702b12c3c5fb639ed737',
    },
    scriptSize: 0, // TODO
  },
} satisfies Record<string, RefScriptUtxo>
