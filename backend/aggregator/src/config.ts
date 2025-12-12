import {z} from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  DATABASE_URL: z.string(),
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
