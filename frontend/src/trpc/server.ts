import 'server-only'

import {createTRPCClient, httpLink} from '@trpc/client'
import {
  createTRPCOptionsProxy,
  type TRPCQueryOptions,
} from '@trpc/tanstack-react-query'
import type {ServerAppRouter} from '@wingriders/multi-dex-launchpad-backend/src/app-router'
import SuperJSON from 'superjson'
import {env} from '@/config'
import type {TRPC} from './client'
import {makeQueryClient} from './query-client'

let serverTrpc: TRPC | undefined

export const getServerTrpc = () => {
  if (!serverTrpc)
    serverTrpc = createTRPCOptionsProxy({
      client: createTRPCClient<ServerAppRouter>({
        links: [
          httpLink({
            url: env('SERVER_URL'),
            transformer: SuperJSON,
          }),
        ],
      }),
      queryClient: makeQueryClient,
    })
  return serverTrpc
}

export const prefetchQuery = async <
  T extends ReturnType<TRPCQueryOptions<any>>,
>(
  queryOptions: T,
) => {
  const queryClient = makeQueryClient()
  if (queryOptions.queryKey[1]?.type === 'infinite') {
    await queryClient.prefetchInfiniteQuery(queryOptions as any)
  } else {
    await queryClient.prefetchQuery(queryOptions)
  }
}
