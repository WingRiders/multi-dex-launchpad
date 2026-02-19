import {initTRPC} from '@trpc/server'
import type {RouterRecord} from '@trpc/server/unstable-core-do-not-import'
import {launchTimeStatuses} from '@wingriders/multi-dex-launchpad-common'
import superjson from 'superjson'
import {z} from 'zod'
import {
  getAgentHealthcheck,
  getAllModesHealthcheck,
  getServerHealthcheck,
} from './agent/endpoints/healthcheck'
import {findNodeToSpend} from './db/helpers'
import {
  getFailProofInput,
  getFirstProjectTokensHolderUTxO,
  getLaunch,
  getLaunches,
  getLaunchesOwnedBy,
  getPoolProofInput,
  getUserRewardsHolders,
} from './endpoints/launch'
import {getPreviousNodeUTxO, getUserNodes} from './endpoints/node'
import {
  getFirstProjectTokensHolderValidatorRefScriptUtxo,
  getNodePolicyRefScriptUtxo,
  getNodeValidatorRefScriptUtxo,
  getProjectTokensHolderPolicyRefScriptUtxo,
} from './endpoints/ref-scripts'
import {getTokenMetadata, getTokensMetadata} from './endpoints/token-metadata'
import {getUTxO, getUtxos} from './endpoints/utxo'

export const t = initTRPC.create({
  transformer: superjson,
})
export const publicProcedure = t.procedure
export const mergeRouters = t.mergeRouters

export const createServerRouter = () =>
  t.router({
    healthcheck: publicProcedure.query(getServerHealthcheck),
    // using mutation instead of query because the input can be too large for a GET request
    tokensMetadata: publicProcedure
      .input(z.array(z.string()))
      .mutation(({input}) => getTokensMetadata(input)),
    tokenMetadata: publicProcedure
      .input(z.string())
      .query(({input}) => getTokenMetadata(input)),
    launches: publicProcedure
      .input(
        z
          .object({
            timeStatus: z.enum(launchTimeStatuses).optional(),
          })
          .optional(),
      )
      .query(async ({input}) => getLaunches(input?.timeStatus)),
    launch: publicProcedure
      .input(
        z.object({
          txHash: z.string(),
        }),
      )
      .query(({input}) => getLaunch(input.txHash)),
    launchesOwnedBy: publicProcedure
      .input(z.object({ownerBech32Address: z.string()}))
      .query(({input}) => getLaunchesOwnedBy(input.ownerBech32Address)),
    nodeToSpend: publicProcedure
      .input(
        z.object({
          launchTxHash: z.string(),
          ownerPubKeyHash: z.string(),
        }),
      )
      .query(({input}) => findNodeToSpend(input)),
    userNodes: publicProcedure
      .input(z.object({launchTxHash: z.string(), ownerPubKeyHash: z.string()}))
      .query(({input: {launchTxHash, ownerPubKeyHash}}) =>
        getUserNodes(launchTxHash, ownerPubKeyHash),
      ),
    previousNodeUTxO: publicProcedure
      .input(
        z.object({
          launchTxHash: z.string(),
          keyHash: z.string(),
          keyIndex: z.number(),
        }),
      )
      .query(({input: {launchTxHash, keyHash, keyIndex}}) =>
        getPreviousNodeUTxO(launchTxHash, keyHash, keyIndex),
      ),
    userRewardsHolders: publicProcedure
      .input(z.object({launchTxHash: z.string(), ownerPubKeyHash: z.string()}))
      .query(({input: {launchTxHash, ownerPubKeyHash}}) =>
        getUserRewardsHolders(launchTxHash, ownerPubKeyHash),
      ),
    utxo: publicProcedure
      .input(z.object({txHash: z.string(), outputIndex: z.number()}))
      .query(({input: {txHash, outputIndex}}) => getUTxO(txHash, outputIndex)),
    utxos: publicProcedure
      .input(z.array(z.object({txHash: z.string(), outputIndex: z.number()})))
      .query(({input}) => getUtxos(input)),
    nodeValidatorRef: publicProcedure
      .input(z.object({launchTxHash: z.string()}))
      .query(({input: {launchTxHash}}) =>
        getNodeValidatorRefScriptUtxo(launchTxHash),
      ),
    nodePolicyRef: publicProcedure
      .input(z.object({launchTxHash: z.string()}))
      .query(({input: {launchTxHash}}) =>
        getNodePolicyRefScriptUtxo(launchTxHash),
      ),
    firstProjectTokensHolderValidatorRef: publicProcedure
      .input(z.object({launchTxHash: z.string()}))
      .query(({input: {launchTxHash}}) =>
        getFirstProjectTokensHolderValidatorRefScriptUtxo(launchTxHash),
      ),
    projectTokensHolderPolicyRef: publicProcedure
      .input(z.object({launchTxHash: z.string()}))
      .query(({input: {launchTxHash}}) =>
        getProjectTokensHolderPolicyRefScriptUtxo(launchTxHash),
      ),
    firstProjectTokensHolderUTxO: publicProcedure
      .input(z.object({launchTxHash: z.string()}))
      .query(({input: {launchTxHash}}) =>
        getFirstProjectTokensHolderUTxO(launchTxHash),
      ),
    poolProofInput: publicProcedure
      .input(z.object({launchTxHash: z.string()}))
      .query(({input: {launchTxHash}}) => getPoolProofInput(launchTxHash)),
    failProofInput: publicProcedure
      .input(z.object({launchTxHash: z.string()}))
      .query(({input: {launchTxHash}}) => getFailProofInput(launchTxHash)),
  })

export const createAgentRouter = () =>
  t.router({
    healthcheck: publicProcedure.query(getAgentHealthcheck),
  })

const omitHealthcheck = <T extends RouterRecord>(
  procedures: T,
): Omit<T, 'healthcheck'> =>
  Object.fromEntries(
    Object.entries(procedures).filter(([key]) => key !== 'healthcheck'),
  ) as Omit<T, 'healthcheck'>

export const createAllModesRouter = () =>
  mergeRouters(
    t.router(omitHealthcheck(createServerRouter()._def.procedures)),
    t.router(omitHealthcheck(createAgentRouter()._def.procedures)),
    t.router({
      healthcheck: publicProcedure.query(getAllModesHealthcheck),
    }),
  )

// export type definition of API
export type ServerAppRouter = ReturnType<typeof createServerRouter>
