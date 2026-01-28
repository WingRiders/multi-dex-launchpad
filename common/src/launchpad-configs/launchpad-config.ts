import type {TxInput, Unit} from '@meshsdk/core'

/**
 * One aggregate config type that covers all the options of individual config
 * types for generated scripts. It can be cast to individual config types by
 * `fromLaunchpadConfig` method that each config exposes, some require also
 * additional params - hashes of previously generated scripts.
 * The LaunchpadConfig is used to generate all the scripts (generateLaunchpadContracts),
 * and also when these parameters are shared in tx metadata we can verify
 * the deployment of a launchpad on the backend.
 *
 * This doesn't apply to constant scripts:
 * * poolProof validator and minting policy
 * * rewardsHolder validator
 */
export type LaunchpadConfig = {
  // The owner of the launch, supplies the project tokens
  ownerBech32Address: string

  // A value between 0 and 10_000, specifies a split of liquidity between Sundae and Wr pools
  // 0 means everything goes to Sundae
  // 10_000 means everything goes to Wr
  splitBps: number

  // The script hash of the Wr V2 Constant Product pool
  wrPoolValidatorHash: string

  // The script hash of the Wr V2 factory
  wrFactoryValidatorHash: string

  // The currency symbol of the Wr V2 pool policy
  wrPoolCurrencySymbol: string

  // The script hash of the Sundae V3 pool
  sundaePoolScriptHash: string

  // The max amount of ada it is tolerable to pay to create a Sundae pool
  // Note that the actual amount is hopefully less and is controlled by the Sundae settings utxo.
  // In case the settings specify a value above the tolerance, no Sundae pool is created.
  sundaeFeeTolerance: bigint

  // The currency symbol of the Sundae settings NFT.
  sundaeSettingsCurrencySymbol: string

  // The start time must be set to the lowest of the tiers start times.
  startTime: number // POSIXTime

  // The time after which users no longer can contribute to nor withdraw from the launch.
  endTime: number // POSIXTime

  // The asset that is being launched
  projectToken: Unit

  // The assets that is being raised
  raisingToken: Unit

  // The min possible amount of tokens the launchpad can raise.
  // In case less raised tokens are collected, the launch is considered failed and tokens are returned back.
  projectMinCommitment: bigint

  // The maximum amount of tokens the launchpad can raise.
  // Can be set to max int64 value to essentially remove the cap.
  projectMaxCommitment: bigint

  // The total number of the project tokens committed to the launchpad.
  totalTokens: bigint

  // The number of the project tokens to distribute among the launchpad users.
  tokensToDistribute: bigint

  // The percentage of the raised tokens to place into the pool.
  raisedTokensPoolPartPercentage: number

  // Controls the dao fee collected in raised tokens
  daoFeeNumerator: number

  // Controls the dao fee collected in raised tokens
  daoFeeDenominator: number

  // Controls the address where the dao fee is sent
  daoFeeReceiverBech32Address: string

  // Controls the pub key hash of a dao admin.
  // This signer can add separator nodes (the launch owner can do that as well).
  daoAdminPubKeyHash: string

  // How much collateral (in Lovelace) is locked into the launch
  // Must be at least 2 ada per used DEX plus 2 ada for the dao fee utxo
  // The rest is returned if the launch is successful.
  // If the launch is failed, the collateral is split between the commit fold owner and the dao fee receiver
  collateral: bigint

  // The tx out ref of the utxo that has to be spent to uniquely identify a launch
  starter: TxInput

  // Configures the duration period of the vesting utxo which holds the owner's shares
  vestingPeriodDuration: number // POSIXTime

  // Configures the duration period to first unlock of the vesting utxo which holds the owner's shares
  vestingPeriodDurationToFirstUnlock: number // POSIXTime

  // Configures the number of installments of the vesting utxo which holds the owner's shares
  vestingPeriodInstallments: number

  // Configures the start of the vesting utxo which holds the owner's shares
  vestingPeriodStart: number // POSIXTime

  // Configures the validator hash of the vesting utxo which holds the owner's shares
  vestingValidatorHash: string

  // Policy ID of the presale tier token
  // Note that the token name is not checked.
  // That allows using NFTs on the same policy as presale tokens.
  presaleTierCs: string

  // The commitment start time of the presale tier
  presaleTierStartTime: number // POSIXTime

  // The commitment start time of the default tier
  defaultStartTime: number // POSIXTime

  // The min user commitment of the presale tier
  presaleTierMinCommitment: bigint

  // The min user commitment of the default tier
  defaultTierMinCommitment: bigint

  // The max user commitment of the presale tier
  presaleTierMaxCommitment: bigint

  // The max user commitment of the  tier
  defaultTierMaxCommitment: bigint

  // The amount of ada a commitment node must hold.
  // This ada is used up to compensate the folds and to create a user rewards holder.
  nodeAda: bigint

  // The amount of ada the commit fold gets per each folded node.
  commitFoldFeeAda: bigint

  // The min amount of ada various utxos are expected to held.
  // This includes the rewards holder, dao fee, and final project tokens holder.
  oilAda: bigint
}
