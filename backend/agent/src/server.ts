import {createServer} from 'node:http'
import {createHTTPHandler} from '@trpc/server/adapters/standalone'
import {getCorsOptions} from '@wingriders/multi-dex-launchpad-backend-common'
import cors from 'cors'
import {createRouter} from './app-router'
import {config, isProd} from './config'
import {logger} from './logger'

export const startServer = () => {
  const router = createRouter()

  const trpcHandler = createHTTPHandler({
    router,
    middleware: config.CORS_ENABLED_FOR
      ? cors(getCorsOptions(config.CORS_ENABLED_FOR, isProd))
      : undefined,
  })

  // HTTP server
  const server = createServer((req, res) => {
    trpcHandler(req, res)
  })

  server.listen(config.SERVER_PORT)

  logger.info(`Server is running on port ${config.SERVER_PORT}`)
}
