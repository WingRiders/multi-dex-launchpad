import {defaultShouldDehydrateQuery, QueryClient} from '@tanstack/react-query'
import {TRPCClientError} from '@trpc/client'
import SuperJSON from 'superjson'

export const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: false,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
        shouldRedactErrors: (error) => {
          // don't redact TRPC error so that we propagate the errors from the server to the client
          return !(error instanceof TRPCClientError)
        },
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  })
