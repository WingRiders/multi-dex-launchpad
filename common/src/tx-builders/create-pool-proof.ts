import type {MeshTxBuilder, TxInput} from '@meshsdk/core'
import {scriptHashToBech32} from '@meshsdk/core-cst'
import {poolProofDatumToMeshData} from '../datums'
import {ensure} from '../ensure'
import {createUnit, networkToNetworkId, parseUnit} from '../helpers'
import type {LaunchConfig} from '../launch-configs'
import type {ConstantContracts} from '../on-chain'
import {type Dex, dexToMeshData, type RefScriptUtxo} from '../types'

export const addCreatePoolProof = (
  b: MeshTxBuilder,
  launchConfig: LaunchConfig,
  constantContracts: ConstantContracts,
  poolProofPolicyRef: RefScriptUtxo,
  poolInput: TxInput,
  dex: Dex,
) => {
  const network = b.meshTxBuilderBody.network
  ensure(
    network === 'preprod' || network === 'mainnet',
    {builder: b},
    'The network must be a supported one',
  )

  const [projectSymbol, projectToken] = parseUnit(launchConfig.projectToken)
  const [raisingSymbol, raisingToken] = parseUnit(launchConfig.raisingToken)

  b.readOnlyTxInReference(poolInput.txHash, poolInput.outputIndex)

  b.txOut(
    scriptHashToBech32(
      constantContracts.poolProofValidator.hash,
      undefined,
      networkToNetworkId[network],
    ),
    [
      {
        unit: createUnit(
          constantContracts.poolProofPolicy.hash,
          constantContracts.poolProofValidator.hash,
        ),
        quantity: '1',
      },
    ],
  ).txOutInlineDatumValue(
    poolProofDatumToMeshData({
      dex,
      projectSymbol,
      projectToken,
      raisingSymbol,
      raisingToken,
    }),
  )

  b.mintPlutusScriptV2()
    .mint(
      '1',
      constantContracts.poolProofPolicy.hash,
      constantContracts.poolProofValidator.hash,
    )
    .mintTxInReference(
      poolProofPolicyRef.input.txHash,
      poolProofPolicyRef.input.outputIndex,
      poolProofPolicyRef.scriptSize.toString(),
      poolProofPolicyRef.output.scriptHash,
    )
    .mintRedeemerValue(dexToMeshData(dex))

  return b
}
