import {
  COMMIT_FOLD_FEE_ADA,
  DAO_ADMIN_PUB_KEY_HASH,
  DAO_FEE_DENOMINATOR,
  DAO_FEE_NUMERATOR,
  DAO_FEE_RECEIVER_BECH32_ADDRESS,
  LAUNCH_COLLATERAL,
  type LaunchpadConfig,
  LOVELACE_UNIT,
  NODE_ADA,
  OIL_ADA,
  type ProjectInfoTxMetadata,
  SUNDAE_POOL_SCRIPT_HASH,
  SUNDAE_SETTINGS_SYMBOL,
  VESTING_PERIOD_DURATION,
  VESTING_PERIOD_DURATION_TO_FIRST_UNLOCK,
  VESTING_PERIOD_INSTALLMENTS,
  VESTING_VALIDATOR_HASH,
  WR_FACTORY_VALIDATOR_HASH,
  WR_POOL_SYMBOL,
  WR_POOL_VALIDATOR_HASH,
} from '@wingriders/multi-dex-launchpad-common'

const NETWORK = 'preprod' as const

export const mockedLaunches: {
  txHash: string
  title: string
  description: string
  logoIpfsUrl: string
  startTime: Date
  endTime: Date
}[] = [
  {
    txHash: '1',
    title: 'Orcfax launch',
    description:
      'Orcfax is a project that allows you to create and manage your own Orc tokens.',
    logoIpfsUrl: 'ipfs://QmYtszrLruMtRZ3bML6cA1LP5PHgEd4WzGNYA5xYQ1ZYC9',
    startTime: new Date('2026-01-01'),
    endTime: new Date('2026-02-01'),
  },
  {
    txHash: '2',
    title: 'Nebula Nexus launch',
    description:
      'Nebula Nexus powers on-chain analytics with real-time indexers.',
    logoIpfsUrl: 'ipfs://QmYtszrLruMtRZ3bML6cA1LP5PHgEd4WzGNYA5xYQ1ZYC9',
    startTime: new Date('2026-02-10'),
    endTime: new Date('2026-03-10'),
  },
  {
    txHash: '3',
    title: 'Stellar Forge launch',
    description:
      'Stellar Forge builds tokenized infrastructure for open science.',
    logoIpfsUrl: 'ipfs://QmYtszrLruMtRZ3bML6cA1LP5PHgEd4WzGNYA5xYQ1ZYC9',
    startTime: new Date('2026-03-15'),
    endTime: new Date('2026-04-12'),
  },
  {
    txHash: '4',
    title: 'Aurora Mesh launch',
    description: 'Aurora Mesh connects L2 liquidity for seamless swaps.',
    logoIpfsUrl: 'ipfs://QmYtszrLruMtRZ3bML6cA1LP5PHgEd4WzGNYA5xYQ1ZYC9',
    startTime: new Date('2026-04-20'),
    endTime: new Date('2026-05-18'),
  },
  {
    txHash: '5',
    title: 'Cobalt Harbor launch',
    description: 'Cobalt Harbor offers audited smart contract escrow.',
    logoIpfsUrl: 'ipfs://QmYtszrLruMtRZ3bML6cA1LP5PHgEd4WzGNYA5xYQ1ZYC9',
    startTime: new Date('2026-05-25'),
    endTime: new Date('2026-06-22'),
  },
  {
    txHash: '6',
    title: 'Helios Arc launch',
    description: 'Helios Arc provides programmable yield strategies.',
    logoIpfsUrl: 'ipfs://QmYtszrLruMtRZ3bML6cA1LP5PHgEd4WzGNYA5xYQ1ZYC9',
    startTime: new Date('2026-06-30'),
    endTime: new Date('2026-07-28'),
  },
  {
    txHash: '7',
    title: 'Verdant Vault launch',
    description: 'Verdant Vault enables tokenized carbon credits trading.',
    logoIpfsUrl: 'ipfs://QmYtszrLruMtRZ3bML6cA1LP5PHgEd4WzGNYA5xYQ1ZYC9',
    startTime: new Date('2026-08-05'),
    endTime: new Date('2026-09-02'),
  },
  {
    txHash: '8',
    title: 'Nimbus Gate launch',
    description: 'Nimbus Gate streamlines DAO treasury automation.',
    logoIpfsUrl: 'ipfs://QmYtszrLruMtRZ3bML6cA1LP5PHgEd4WzGNYA5xYQ1ZYC9',
    startTime: new Date('2026-09-12'),
    endTime: new Date('2026-10-10'),
  },
  {
    txHash: '9',
    title: 'Solstice Bay launch',
    description: 'Solstice Bay funds marine conservation NFTs.',
    logoIpfsUrl: 'ipfs://QmYtszrLruMtRZ3bML6cA1LP5PHgEd4WzGNYA5xYQ1ZYC9',
    startTime: new Date('2026-10-18'),
    endTime: new Date('2026-11-15'),
  },
  {
    txHash: '10',
    title: 'Quartz Orbit launch',
    description: 'Quartz Orbit launches modular wallet tooling.',
    logoIpfsUrl: 'ipfs://QmYtszrLruMtRZ3bML6cA1LP5PHgEd4WzGNYA5xYQ1ZYC9',
    startTime: new Date('2026-11-22'),
    endTime: new Date('2026-12-20'),
  },
]

const MOCK_START_TIME = Math.floor(new Date('2026-02-01').getTime())
const MOCK_END_TIME = Math.floor(new Date('2026-03-01').getTime())

export const mockedLaunch: {
  projectInfo: ProjectInfoTxMetadata
  config: LaunchpadConfig
  totalCommitted: bigint
} = {
  projectInfo: {
    title: 'Orcfax launch',
    description:
      'Orcfax is a project that allows you to create and manage your own Orc tokens.',
    url: 'https://orcfax.io',
    logoUrl: 'ipfs://QmYtszrLruMtRZ3bML6cA1LP5PHgEd4WzGNYA5xYQ1ZYC9',
    tokenomicsUrl: 'https://orcfax.io/tokenomics',
    whitepaperUrl: 'https://orcfax.io/whitepaper',
  },
  config: {
    ownerBech32Address:
      'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3j0wc3y6vdk4xxnxur2paq2s4x0',
    splitBps: 5000,
    wrPoolValidatorHash: WR_POOL_VALIDATOR_HASH[NETWORK],
    wrFactoryValidatorHash: WR_FACTORY_VALIDATOR_HASH[NETWORK],
    wrPoolCurrencySymbol: WR_POOL_SYMBOL[NETWORK],
    sundaePoolScriptHash: SUNDAE_POOL_SCRIPT_HASH[NETWORK],
    sundaeFeeTolerance: 5_000_000n,
    sundaeSettingsCurrencySymbol: SUNDAE_SETTINGS_SYMBOL[NETWORK],
    startTime: MOCK_START_TIME,
    endTime: MOCK_END_TIME,
    projectToken:
      '659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a757696e67526964657273',
    raisingToken: LOVELACE_UNIT,
    projectMinCommitment: 10_000_000_000n,
    projectMaxCommitment: 100_000_000_000_000n,
    totalTokens: 1_000_000_000_000n,
    tokensToDistribute: 800_000_000_000n,
    raisedTokensPoolPartPercentage: 80,
    daoFeeNumerator: DAO_FEE_NUMERATOR,
    daoFeeDenominator: DAO_FEE_DENOMINATOR,
    daoFeeReceiverBech32Address: DAO_FEE_RECEIVER_BECH32_ADDRESS[NETWORK],
    daoAdminPubKeyHash: DAO_ADMIN_PUB_KEY_HASH[NETWORK],
    collateral: LAUNCH_COLLATERAL,
    starter: {
      txHash:
        'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd',
      outputIndex: 0,
    },
    vestingPeriodDuration: VESTING_PERIOD_DURATION,
    vestingPeriodDurationToFirstUnlock: VESTING_PERIOD_DURATION_TO_FIRST_UNLOCK,
    vestingPeriodInstallments: VESTING_PERIOD_INSTALLMENTS,
    vestingPeriodStart: MOCK_END_TIME,
    vestingValidatorHash: VESTING_VALIDATOR_HASH,
    presaleTierCs: 'a076d5d1ae3abd9e8e027400dd8b0040e6598687c94b51688d14d52e',
    presaleTierStartTime: MOCK_START_TIME,
    defaultStartTime: MOCK_START_TIME + 86400,
    presaleTierMinCommitment: 10_000_000n,
    defaultTierMinCommitment: 50_000_000n,
    presaleTierMaxCommitment: 500_000_000n,
    defaultTierMaxCommitment: 1_000_000_000n,
    nodeAda: NODE_ADA,
    commitFoldFeeAda: COMMIT_FOLD_FEE_ADA,
    oilAda: OIL_ADA,
  },
  totalCommitted: 100_000_000_000n,
}
