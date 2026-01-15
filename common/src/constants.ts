import type {LanguageVersion} from '@meshsdk/common'

export const SCRIPT_HASH_LENGTH = 28

export enum PlutusScriptVersion {
  PlutusScriptV1 = 'PlutusScriptV1',
  PlutusScriptV2 = 'PlutusScriptV2',
  PlutusScriptV3 = 'PlutusScriptV3',
}

export const PLUTUS_SCRIPT_VERSION_PREFIX = {
  [PlutusScriptVersion.PlutusScriptV1]: '01',
  [PlutusScriptVersion.PlutusScriptV2]: '02',
  [PlutusScriptVersion.PlutusScriptV3]: '03',
}

export const PLUTUS_SCRIPT_VERSION_TO_LANGUAGE: Record<
  PlutusScriptVersion,
  LanguageVersion
> = {
  [PlutusScriptVersion.PlutusScriptV1]: 'V1',
  [PlutusScriptVersion.PlutusScriptV2]: 'V2',
  [PlutusScriptVersion.PlutusScriptV3]: 'V3',
}
