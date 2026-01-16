import {createServerFn} from '@tanstack/react-start'
import {getServerConfig} from './server'

/**
 * Config that is needed in the browser app, DO NOT expose server-only config here (e.g. secrets)
 */
export const getClientConfig = createServerFn({method: 'GET'}).handler(() => {
  const serverConfig = getServerConfig()

  return {
    API_SERVER_PUBLIC_URL: serverConfig.API_SERVER_PUBLIC_URL,
  }
})

export type ClientConfig = Awaited<ReturnType<typeof getClientConfig>>
