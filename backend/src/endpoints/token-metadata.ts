import type {TokenMetadata} from '@wingriders/multi-dex-launchpad-common'
import {omit} from 'es-toolkit'
import {
  getTokenMetadataFromCache,
  getTokensMetadataFromCache,
} from '../token-registry'

const prepareTokenMetadataForOutput = (
  tokenMetadata: TokenMetadata,
): Omit<TokenMetadata, 'logo'> => omit(tokenMetadata, ['logo'])

export const getTokensMetadata = (subjects: string[]) =>
  Object.fromEntries(
    getTokensMetadataFromCache(subjects)
      .filter((metadata) => metadata != null)
      .map((metadata) => [
        metadata.subject,
        prepareTokenMetadataForOutput(metadata),
      ]),
  )

export const getTokenMetadata = (subject: string) => {
  const tokenMetadata = getTokenMetadataFromCache(subject)
  if (!tokenMetadata) return null
  return prepareTokenMetadataForOutput(tokenMetadata)
}
