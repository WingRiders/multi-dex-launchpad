import {type MConStr, mConStr, mConStr0} from '@meshsdk/common'
import {ensure} from '../ensure'
import {bech32AddressToMeshData, maybeToMeshData, parseUnit} from '../helpers'
import type {
  CommitFoldDatum,
  FailProofDatum,
  MultisigScript,
  NodeDatum,
  NodeKey,
  PoolProofDatum,
  RefScriptCarrierDatum,
  RewardsFoldDatum,
  RewardsHolderDatum,
  SundaePoolDatum,
  TokensHolderFirstDatum,
  VestingDatum,
  WrFactoryDatum,
  WrPoolDatum,
} from './types'

export const refScriptCarrierDatumToMeshData = (datum: RefScriptCarrierDatum) =>
  mConStr0([datum.ownerPubKeyHash, datum.deadline])

const nodeKeyToMeshData = (key: NodeKey) => mConStr0([key.hash, key.index])

// Maybe<pair<pubkeyhash, integer>>
export const maybeNodeKeyToMeshData = (maybeKey: NodeKey | null) =>
  maybeToMeshData(maybeKey, nodeKeyToMeshData)

export const nodeDatumToMeshData = (datum: NodeDatum) =>
  mConStr0([
    maybeNodeKeyToMeshData(datum.key),
    maybeNodeKeyToMeshData(datum.next),
    datum.createdTime,
    datum.committed,
  ])

export const tokensHolderFirstDatumToMeshData = (
  datum: TokensHolderFirstDatum,
) => datum.nodeValidatorHash

export const commitFoldDatumToMeshData = (datum: CommitFoldDatum) =>
  mConStr0([
    datum.nodeScriptHash,
    maybeNodeKeyToMeshData(datum.next),
    datum.committed,
    maybeNodeKeyToMeshData(datum.cutoffKey),
    maybeToMeshData(datum.cutoffTime, (t) => t),
    datum.overcommitted,
    datum.nodeCount,
    bech32AddressToMeshData(datum.owner),
  ])

export const rewardsFoldDatumToMeshData = (datum: RewardsFoldDatum) =>
  mConStr0([
    datum.nodeScriptHash,
    maybeNodeKeyToMeshData(datum.next),
    maybeNodeKeyToMeshData(datum.cutoffKey),
    maybeToMeshData(datum.cutoffTime, (t) => t),
    datum.committed,
    datum.overcommitted,
    bech32AddressToMeshData(datum.commitFoldOwner),
  ])

export const rewardsHolderDatumToMeshData = (datum: RewardsHolderDatum) =>
  mConStr0([
    nodeKeyToMeshData(datum.owner),
    datum.projectSymbol,
    datum.projectToken,
    datum.raisingSymbol,
    datum.raisingToken,
    datum.usesWr ? 1 : 0,
    datum.usesSundae ? 1 : 0,
    datum.endTime,
  ])

export const poolProofDatumToMeshData = (datum: PoolProofDatum) =>
  mConStr0([
    datum.projectSymbol,
    datum.projectToken,
    datum.raisingSymbol,
    datum.raisingToken,
    datum.dex === 'WingRidersV2' ? 0 : 1,
  ])

export const failProofDatumToMeshData = (datum: FailProofDatum) =>
  datum.scriptHash

export const vestingDatumToMeshData = (datum: VestingDatum) =>
  mConStr0([
    bech32AddressToMeshData(datum.beneficiary),
    datum.vestingSymbol,
    datum.vestingToken,
    datum.totalVestingQty,
    datum.vestingPeriodStart,
    datum.vestingPeriodEnd,
    datum.firstUnlockPossibleAfter,
    datum.totalInstallments,
    datum.vestingMemo,
  ])

export const wrFactoryDatumToMeshData = (datum: WrFactoryDatum) =>
  mConStr0([datum.poolRangeFrom, datum.poolRangeTo])

// CP-only
export const wrPoolDatumToMeshDate = (datum: WrPoolDatum) =>
  mConStr0([
    datum.requestValidatorHash,
    datum.assetASymbol,
    datum.assetAToken,
    datum.assetBSymbol,
    datum.assetBToken,
    datum.swapFeeInBasis,
    datum.protocolFeeInBasis,
    datum.projectFeeInBasis,
    datum.reserveFeeInBasis,
    datum.feeBasis,
    datum.agentFeeAda,
    datum.lastInteraction,
    datum.treasuryA,
    datum.treasuryB,
    datum.projectTreasuryA,
    datum.projectTreasuryB,
    datum.reserveTreasuryA,
    datum.reserveTreasuryB,
    maybeToMeshData(datum.projectBeneficiary, (b) => b),
    maybeToMeshData(datum.reserveBeneficiary, (b) => b),
    mConStr0([]), // Assumes CP
  ])

export const multisigScriptToMeshData = (
  multisigScript: MultisigScript,
): MConStr<0 | 1 | 2 | 3 | 4 | 5 | 6> => {
  switch (multisigScript.type) {
    case 'MultisigSignature':
      return mConStr(0, [multisigScript.keyHash])
    // TODO: Are that one and the following correct?
    //       are they really (1, [{list: ...}]) and not (1, [...])
    case 'MultisigAllOf':
      return mConStr(1, [multisigScript.scripts.map(multisigScriptToMeshData)])
    case 'MultisigAnyOf':
      return mConStr(2, [multisigScript.scripts.map(multisigScriptToMeshData)])
    case 'MultisigAtLeast':
      return mConStr(3, [
        multisigScript.required,
        multisigScript.scripts.map(multisigScriptToMeshData),
      ])
    case 'MultisigBefore':
      return mConStr(4, [multisigScript.time])
    case 'MultisigAfter':
      return mConStr(5, [multisigScript.time])
    case 'MultisigScript':
      return mConStr(6, [multisigScript.scriptHash])
    default: {
      const _: never = multisigScript
      ensure(
        false,
        {multisigScript},
        'Unknown multisig script, should never happen',
      )
    }
  }
}

export const sundaePoolDatumToMeshData = (datum: SundaePoolDatum) =>
  mConStr0([
    // identifier
    datum.identifier,
    // assets
    [parseUnit(datum.assetA), parseUnit(datum.assetB)],
    // circulatingLp
    datum.circulatingLp,
    // bidFeesPer10Thousand
    datum.bidFeesPer10Thousand,
    // askFeesPer10Thousand
    datum.askFeesPer10Thousand,
    // feeManager
    maybeToMeshData(datum.feeManager, multisigScriptToMeshData),
    // marketOpen
    datum.marketOpen,
    // protocolFees
    datum.protocolFees,
  ])
