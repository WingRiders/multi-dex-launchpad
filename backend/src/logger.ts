import pino from 'pino'
import {config, isProd} from './config'

export const logger: pino.Logger = pino({
  name: `multi-dex-launchpad-${config.MODE}`,
  level: config.LOG_LEVEL,
  ...(!isProd
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      }
    : {}),
})
