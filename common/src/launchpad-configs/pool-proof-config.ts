import type {Data} from '@meshsdk/core'

export type PoolProofConfig = {
  poolProofSymbol: string
}

export const poolProofConfigToMeshData = (config: PoolProofConfig): Data =>
  config.poolProofSymbol
