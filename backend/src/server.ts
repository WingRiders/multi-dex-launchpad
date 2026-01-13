import {createServer} from 'node:http'
import {createHTTPHandler} from '@trpc/server/adapters/standalone'
import {applyWSSHandler} from '@trpc/server/adapters/ws'
import cors from 'cors'
import {WebSocketServer} from 'ws'
import {
  createAgentRouter,
  createAggregatorRouter,
  createAllModesRouter,
  createServerRouter,
} from './app-router'
import {config, isProd, isServerMode} from './config'
import {getCorsOptions} from './helpers/cors'
import {logger} from './logger'

export const startServer = () => {
  const router = {
    aggregator: createAggregatorRouter(),
    server: createServerRouter(),
    agent: createAgentRouter(),
    all: createAllModesRouter(),
  }[config.MODE]

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

  if (isServerMode) {
    // WebSocket server
    const wss = new WebSocketServer({server})
    applyWSSHandler({
      wss,
      router,
    })
  }

  server.listen(config.SERVER_PORT)

  logger.info(`Server is running on port ${config.SERVER_PORT}`)
}
