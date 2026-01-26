import {
  type Asset,
  applyCborEncoding,
  deserializeAddress,
  type MeshTxBuilder,
  type TxOutput,
} from '@meshsdk/core'
import {
  createUnit,
  ensure,
  type GeneratedContracts,
  type LaunchpadConfig,
  type LaunchTxMetadata,
  LOVELACE_UNIT,
  makeBech32Address,
  type NodeDatum,
  nodeDatumToMeshData,
  type ProjectInfo,
  type TokensHolderFirstDatum,
  tokensHolderFirstDatumToMeshData,
} from '..'

export const INIT_LAUNCH_TX_METADATA_LABEL = 0

// TODO: get a better estimate
// 500 ADA
export const INIT_LAUNCH_AGENT_ADA = '500000000'

// The init launch transaction:
// * spends the starter utxo
// * creates the first project tokens holder
// * creates the head node
// * sets the correct metadata with the project configuration and info
export const addInitLaunch = (
  b: MeshTxBuilder,
  config: LaunchpadConfig,
  projectInfo: ProjectInfo,
  contracts: GeneratedContracts,
  agentBech32Address: string,
  starter: TxOutput,
  lowerTimeLimit: number,
  upperTimeLimit: number,
) => {
  const network = b.meshTxBuilderBody.network
  ensure(
    network === 'preprod' || network === 'mainnet',
    {builder: b},
    'The network must be a supported one',
  )

  // Set the time limits
  b.invalidBefore(lowerTimeLimit)
  b.invalidHereafter(upperTimeLimit)

  // Head node
  const createdTime = upperTimeLimit
  const committed = 0
  const headNode: NodeDatum = {key: null, next: null, createdTime, committed}
  const nodeToken: Asset = {
    unit: createUnit(contracts.nodePolicy.hash, contracts.nodeValidator.hash),
    quantity: '1',
  }
  const nodeAda: Asset = {unit: LOVELACE_UNIT, quantity: config.nodeAda}
  b.txOut(makeBech32Address(network, contracts.nodeValidator.hash), [
    nodeToken,
    nodeAda,
  ]).txOutInlineDatumValue(nodeDatumToMeshData(headNode))

  // Mint head node token
  b.mintPlutusScript(contracts.nodePolicy.version)
    .mint('1', contracts.nodePolicy.hash, contracts.nodeValidator.hash)
    // NOTE: we provide the scripts inline
    //       they were just generated prior to this transaction
    //       and aren't deployed to ref script carriers
    .mintingScript(applyCborEncoding(contracts.nodePolicy.hex))
    // node policy redeemer is ignored
    .mintRedeemerValue([])

  // First project tokens holder
  const tokensHolderDatum: TokensHolderFirstDatum = {
    nodeValidatorHash: contracts.nodeValidator.hash,
  }
  const holderToken: Asset = {
    unit: createUnit(
      contracts.tokensHolderPolicy.hash,
      contracts.tokensHolderFirstValidator.hash,
    ),
    quantity: '1',
  }
  const projectTokens: Asset = {
    unit: config.projectToken,
    quantity: config.totalTokens,
  }
  const collateral: Asset = {
    unit: LOVELACE_UNIT,
    quantity: config.collateral,
  }
  b.txOut(
    makeBech32Address(network, contracts.tokensHolderFirstValidator.hash),
    [holderToken, projectTokens, collateral],
  ).txOutInlineDatumValue(tokensHolderFirstDatumToMeshData(tokensHolderDatum))

  // Mint first project tokens holder token
  b.mintPlutusScript(contracts.tokensHolderPolicy.version)
    .mint(
      '1',
      contracts.tokensHolderPolicy.hash,
      contracts.tokensHolderFirstValidator.hash,
    ) // NOTE: we provide the scripts inline
    //       they were just generated prior to this transaction
    //       and aren't deployed to ref script carriers
    .mintingScript(applyCborEncoding(contracts.tokensHolderPolicy.hex))
    // tokens holder policy redeemer is ignored
    .mintRedeemerValue([])

  // Send funds to the agent so it can deploy all utxos
  b.txOut(agentBech32Address, [
    {unit: LOVELACE_UNIT, quantity: INIT_LAUNCH_AGENT_ADA},
  ])

  // Spend the starter
  b.txIn(
    config.starter.txHash,
    config.starter.outputIndex,
    starter.amount,
    starter.address,
    starter.scriptRef ? starter.scriptRef.length / 2 : 0,
  )

  // The launch owner must sign the transaction
  b.requiredSignerHash(deserializeAddress(config.ownerBech32Address).pubKeyHash)

  const launchMetadata: LaunchTxMetadata = {config, projectInfo}
  b.metadataValue(INIT_LAUNCH_TX_METADATA_LABEL, launchMetadata)

  return b
}
