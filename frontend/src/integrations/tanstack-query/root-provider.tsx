import {QueryClient} from '@tanstack/react-query'
import {createTRPCClient, httpBatchStreamLink} from '@trpc/client'
import {createTRPCOptionsProxy} from '@trpc/tanstack-react-query'
import type {ServerAppRouter} from '@wingriders/multi-dex-launchpad-backend/src/app-router'
import superjson from 'superjson'

import {TRPCProvider} from '@/integrations/trpc/react'

const getUrl = () => {
  // TODO: get this from environment variables, different for browser and server
  if (typeof window !== 'undefined') return 'http://127.0.0.1:3350'
  return 'http://127.0.0.1:3350'
}

export const trpcClient = createTRPCClient<ServerAppRouter>({
  links: [
    httpBatchStreamLink({
      transformer: superjson,
      url: getUrl(),
    }),
  ],
})

export const getContext = () => {
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

export const Provider = ({
  children,
  queryClient,
}: {
  children: React.ReactNode
  queryClient: QueryClient
}) => {
  return (
    <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
      {children}
    </TRPCProvider>
  )
}
