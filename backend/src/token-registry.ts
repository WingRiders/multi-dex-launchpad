import type {TokenMetadata} from '@wingriders/multi-dex-launchpad-common'
import {chunk, keyBy} from 'es-toolkit'
import {z} from 'zod'
import {config} from './config'
import {logger} from './logger'

const MAX_SUBJECTS_TO_FETCH = 200
const LOOP_INTERVAL = 15 * 60 * 1000 // 15 minutes

const {GITHUB_TOKEN_REGISTRY_URL, SUBJECTS_PATH, TOKEN_REGISTRY_URL} = {
  mainnet: {
    GITHUB_TOKEN_REGISTRY_URL:
      'https://api.github.com/repos/cardano-foundation/cardano-token-registry',
    SUBJECTS_PATH: 'mappings',
    TOKEN_REGISTRY_URL: 'https://tokens.cardano.org/metadata/query',
  },
  preprod: {
    GITHUB_TOKEN_REGISTRY_URL:
      'https://api.github.com/repos/input-output-hk/metadata-registry-testnet',
    SUBJECTS_PATH: 'registry',
    TOKEN_REGISTRY_URL: 'https://metadata.world.dev.cardano.org/metadata/query',
  },
}[config.NETWORK]

let tokenMetadataCache: {[subject: string]: TokenMetadata} = {}

export const getTokensMetadataFromCache = (subjects: string[]) =>
  subjects.map((subject) => tokenMetadataCache[subject])
export const getTokenMetadataFromCache = (subject: string) =>
  tokenMetadataCache[subject]

// assuming there is always at least one subject in the registry
export const isTokenMetadataFetched = () =>
  Object.keys(tokenMetadataCache).length > 0

const githubTokenMetadataFieldSchema = <T extends z.ZodSchema>(
  valueSchema: T,
) =>
  z.object({
    value: valueSchema,
  })

const githubTokenMetadataSchema = z
  .object({
    subject: z.string(),
    name: githubTokenMetadataFieldSchema(z.string()),
    description: githubTokenMetadataFieldSchema(z.string()),
    policy: z.string().optional(),
    ticker: githubTokenMetadataFieldSchema(z.string()).optional(),
    url: githubTokenMetadataFieldSchema(z.string()).optional(),
    logo: githubTokenMetadataFieldSchema(z.string()).optional(),
    decimals: githubTokenMetadataFieldSchema(z.number()).optional(),
  })
  .transform(({subject, name, description, ticker, url, logo, decimals}) => ({
    subject,
    name: name.value,
    description: description.value,
    ticker: ticker?.value,
    url: url?.value,
    logo: logo?.value,
    decimals: decimals?.value,
  }))

const githubCommitsResponseSchema = z.array(
  z.object({
    commit: z.object({tree: z.object({sha: z.string()})}),
  }),
)

const githubTreeResponseSchema = z.object({
  sha: z.string(),
  url: z.string(),
  tree: z.array(
    z.object({
      path: z.string(),
      sha: z.string(),
      url: z.string(),
      type: z.string(),
    }),
  ),
})

const getLastCommitTree = async (): Promise<string> => {
  const response = await fetch(`${GITHUB_TOKEN_REGISTRY_URL}/commits`)
  const json = await response.json()
  return githubCommitsResponseSchema.parse(json)[0]!.commit.tree.sha
}

const getMetadataFolderTree = async (commitTree: string): Promise<string> => {
  // https://docs.github.com/en/rest/git/trees
  const response = await fetch(
    `${GITHUB_TOKEN_REGISTRY_URL}/git/trees/${commitTree}`,
  )
  const json = await response.json()
  return githubTreeResponseSchema
    .parse(json)
    .tree.find(({path}) => path === SUBJECTS_PATH)!.sha
}

const getSubjects = async (registryTree: string): Promise<string[]> => {
  const response = await fetch(
    `${GITHUB_TOKEN_REGISTRY_URL}/git/trees/${registryTree}`,
  )
  const json = await response.json()
  const subjectFiles = githubTreeResponseSchema
    .parse(json)
    .tree.map(({path}: {path: string}) => path)
    .filter((path: string) => path.endsWith('.json'))
  // format is subject.json
  // example: 00000002df633853f6a47465c9496721d2d5b1291b8398016c0e87ae6e7574636f696e.json
  return subjectFiles.map((path: string) => path.split('.')[0]!)
}

const fetchMetadataForSubjects = async (
  subjects: string[],
): Promise<TokenMetadata[]> => {
  const response = await fetch(`${TOKEN_REGISTRY_URL}`, {
    method: 'post',
    body: JSON.stringify({subjects}),
    headers: {'Content-Type': 'application/json'},
  })
  const subjectsResponseSchema = z.object({
    subjects: z.array(githubTokenMetadataSchema),
  })
  const json = await response.json()
  return subjectsResponseSchema.parse(json).subjects
}

/**
 * Tries to fetch subjects in a chunks of size chunkSize - this may fail because some tokens have big metadata and
 * cardano.org changes the api limits, so it's impossible to set a chunk size that would work for all cases.
 * Therefore, we recursively try to downsize the chunks and fetch smaller ones.
 * @param subjects
 * @param chunkSize
 * @param metadataResponses mutable array in which to append the token metadata
 */
const chunkedSubjectsFetcher = async (
  subjects: string[],
  chunkSize: number,
  metadataResponses: TokenMetadata[],
) => {
  const subjectsChunks = chunk(subjects, chunkSize)
  logger.info(
    `Requesting metadata for ${subjects.length} subjects, with max ${chunkSize} subjects in 1 request (${subjectsChunks.length} requests total)`,
  )
  for (let i = 0; i < subjectsChunks.length; i++) {
    const subjectsChunk = subjectsChunks[i]!
    const chunkNumber = i + 1

    logger.info(
      `Chunk[${chunkSize}] ${chunkNumber}: requesting metadata for ${subjectsChunk.length} subjects`,
    )
    try {
      const response = await fetchMetadataForSubjects(subjectsChunk)
      metadataResponses.push(...response)
      logger.info(
        `Chunk[${chunkSize}] ${chunkNumber}: successfully fetched metadata for ${response.length} subjects, metadataResponses has ${metadataResponses.length} rows`,
      )
      await Bun.sleep(1000)
    } catch (e) {
      logger.warn(
        `Chunk[${chunkSize}] ${chunkNumber}: failing, trying smaller chunks`,
      )
      if (chunkSize > 1) {
        await chunkedSubjectsFetcher(
          subjectsChunk,
          chunkSize / 2,
          metadataResponses,
        )
      } else {
        logger.warn(`Couldn't fetch metadata for ${subjectsChunk}`)
        throw e
      }
    }
  }
}

const fetchTokenMetadata = async (): Promise<TokenMetadata[]> => {
  const lastCommitTree = await getLastCommitTree()
  const registryTree = await getMetadataFolderTree(lastCommitTree)
  const subjects = await getSubjects(registryTree)

  const tokenMetadata: TokenMetadata[] = []
  await chunkedSubjectsFetcher(subjects, MAX_SUBJECTS_TO_FETCH, tokenMetadata)
  logger.info(
    {subjectCount: subjects.length, metadataCount: tokenMetadata.length},
    'Successfully fetched token metadata',
  )
  return tokenMetadata
}

export const tokensMetadataLoop = async () => {
  while (true) {
    logger.info('Fetching new metadata')
    try {
      const newTokenMetadata = await fetchTokenMetadata()
      if (newTokenMetadata.length > 0) {
        tokenMetadataCache = keyBy(newTokenMetadata, (i) => i.subject)
      } else {
        logger.warn('Empty token metadata response')
      }
    } catch (error: any) {
      logger.warn(`Error fetching token metadata: ${error.message}`)
    }

    await Bun.sleep(LOOP_INTERVAL)
  }
}
