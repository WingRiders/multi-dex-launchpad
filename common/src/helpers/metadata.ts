import {toAddress} from '@meshsdk/core-cst'
import type {LaunchpadConfig, LaunchTxMetadata, ProjectInfoTxMetadata} from '..'

const METADATA_MAX_STR_LENGTH = 64

export function splitMetadatumString(str: string): string | string[] {
  if (str.length < METADATA_MAX_STR_LENGTH) {
    return str
  }
  const chunks: string[] = []
  let remainingStr = str
  while (remainingStr.length > METADATA_MAX_STR_LENGTH) {
    chunks.push(remainingStr.slice(0, METADATA_MAX_STR_LENGTH))
    remainingStr = remainingStr.slice(METADATA_MAX_STR_LENGTH)
  }
  if (remainingStr.length > 0) {
    chunks.push(remainingStr)
  }
  return chunks
}

// Mesh assumes strings in metadata are non-hex strings.
// We need to convert hex strings into Buffers and handle number strings.
export const encodingLaunchTxMetadata = ({
  config,
  projectInfo,
}: LaunchTxMetadata) => ({
  config: encodeLaunchpadConfigMetadata(config),
  projectInfo: encodeProjectInfoMetadata(projectInfo),
})

const encodeBech32Address = (address: string): Buffer =>
  Buffer.from(toAddress(address).toBytes(), 'hex')

// Mesh supports encoding object (not Map) to metadata (@see metadataObjToMap)
// But strings need to be pre-processed.
const encodeLaunchpadConfigMetadata = (config: LaunchpadConfig) => ({
  ...config,

  // Addresses
  ownerBech32Address: encodeBech32Address(config.ownerBech32Address),
  daoFeeReceiverBech32Address: encodeBech32Address(
    config.daoFeeReceiverBech32Address,
  ),

  // Hex strings
  wrPoolValidatorHash: Buffer.from(config.wrPoolValidatorHash, 'hex'),
  wrFactoryValidatorHash: Buffer.from(config.wrFactoryValidatorHash, 'hex'),
  wrPoolCurrencySymbol: Buffer.from(config.wrPoolCurrencySymbol, 'hex'),
  sundaePoolScriptHash: Buffer.from(config.sundaePoolScriptHash, 'hex'),
  sundaeSettingsCurrencySymbol: Buffer.from(
    config.sundaeSettingsCurrencySymbol,
    'hex',
  ),
  projectToken: Buffer.from(config.projectToken, 'hex'),
  raisingToken: Buffer.from(config.raisingToken, 'hex'),
  daoAdminPubKeyHash: Buffer.from(config.daoAdminPubKeyHash, 'hex'),
  vestingValidatorHash: Buffer.from(config.vestingValidatorHash, 'hex'),
  presaleTierCs: Buffer.from(config.presaleTierCs, 'hex'),
})

const encodeProjectInfoMetadata = (projectInfo: ProjectInfoTxMetadata) => ({
  title: splitMetadatumString(projectInfo.title),
  description: splitMetadatumString(projectInfo.description),
  url: splitMetadatumString(projectInfo.url),
  logoUrl: splitMetadatumString(projectInfo.logoUrl),
  tokenomicsUrl: splitMetadatumString(projectInfo.tokenomicsUrl),
  ...(projectInfo.whitepaperUrl
    ? {whitepaperUrl: splitMetadatumString(projectInfo.whitepaperUrl)}
    : {}),
  ...(projectInfo.termsAndConditionsUrl
    ? {
        termsAndConditionsUrl: splitMetadatumString(
          projectInfo.termsAndConditionsUrl,
        ),
      }
    : {}),
  ...(projectInfo.additionalUrl
    ? {additionalUrl: splitMetadatumString(projectInfo.additionalUrl)}
    : {}),
})
