import {z} from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  MODE: z.enum(['agent', 'aggregator', 'server', 'all']).default('all'),
  SERVER_PORT: z.coerce.number().positive(),
  NETWORK: z.enum(['preprod']).default('preprod'), // TODO: add mainnet once bootstrap is done
  DATABASE_URL: z.string(),
  DB_SCHEMA: z.string(),
  OGMIOS_HOST: z.string(),
  OGMIOS_PORT: z.coerce.number().positive(),
  CORS_ENABLED_FOR: z.string().optional(),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  // Using console because pino logger depends on the config
  console.error(
    'Environment variables validation failed',
    z.treeifyError(parsedEnv.error),
  )
  process.exit(1)
}

export const config = parsedEnv.data

export const isProd = config.NODE_ENV === 'production'

export const isAggregatorMode = ['aggregator', 'all'].includes(config.MODE)
export const isOnlyAggregatorMode = config.MODE === 'aggregator'

export const isServerMode = ['server', 'all'].includes(config.MODE)
export const isOnlyServerMode = config.MODE === 'server'

export const isAgentMode = ['agent', 'all'].includes(config.MODE)
export const isOnlyAgentMode = config.MODE === 'agent'
