import {PlutusLanguageVersion} from '@meshsdk/core-cst'

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
  PlutusLanguageVersion
> = {
  [PlutusScriptVersion.PlutusScriptV1]: PlutusLanguageVersion.V1,
  [PlutusScriptVersion.PlutusScriptV2]: PlutusLanguageVersion.V2,
  [PlutusScriptVersion.PlutusScriptV3]: PlutusLanguageVersion.V3,
}
