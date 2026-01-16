import {createRouter} from '@tanstack/react-router'
import {setupRouterSsrQueryIntegration} from '@tanstack/react-router-ssr-query'
import {createIsomorphicFn} from '@tanstack/react-start'
import {type ClientConfig, getClientConfig} from './config/client'
import {getServerConfig} from './config/server'
import * as TanstackQuery from './integrations/tanstack-query/root-provider'
import {routeTree} from './routeTree.gen'

const getApiServerUrl = createIsomorphicFn()
  .client(
    (clientConfig: Pick<ClientConfig, 'API_SERVER_PUBLIC_URL'>) =>
      clientConfig.API_SERVER_PUBLIC_URL,
  )
  .server(() => getServerConfig().API_SERVER_URL)

export const getRouter = async () => {
  const clientConfig = await getClientConfig()
  const apiServerUrl = getApiServerUrl(clientConfig)
  const rqContext = TanstackQuery.getContext(apiServerUrl)

  const router = createRouter({
    routeTree,
    context: {
      ...rqContext,
      clientConfig,
    },

    defaultPreload: 'intent',
  })

  setupRouterSsrQueryIntegration({router, queryClient: rqContext.queryClient})

  return router
}
