import {QueryClient} from '@tanstack/react-query'
import {createTRPCClient, httpBatchStreamLink} from '@trpc/client'
import {createTRPCOptionsProxy} from '@trpc/tanstack-react-query'
import type {ServerAppRouter} from '@wingriders/multi-dex-launchpad-backend/src/app-router'
import superjson from 'superjson'

export const getContext = (apiServerUrl: string) => {
  const trpcClient = createTRPCClient<ServerAppRouter>({
    links: [
      httpBatchStreamLink({
        transformer: superjson,
        url: apiServerUrl,
      }),
    ],
  })

  const queryClient = new QueryClient({
    defaultOptions: {
      dehydrate: {serializeData: superjson.serialize},
      hydrate: {deserializeData: superjson.deserialize},
    },
  })

  const serverHelpers = createTRPCOptionsProxy({
    client: trpcClient,
    queryClient: queryClient,
  })
  return {
    queryClient,
    trpc: serverHelpers,
  }
}
