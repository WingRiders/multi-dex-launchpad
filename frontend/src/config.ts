import {networks} from '@wingriders/multi-dex-launchpad-common'
import {env as runtimeEnv} from 'next-runtime-env'
import {z} from 'zod'

const envSchemas = {
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  NEXT_PUBLIC_NETWORK: z.enum(networks),
  NEXT_PUBLIC_SERVER_URL: z.string(),
  SERVER_URL: z.string(),
  NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  NEXT_PUBLIC_AGENT_ADDRESS: z.string(),
}

type Env = {
  [key in keyof typeof envSchemas]: z.infer<(typeof envSchemas)[key]>
}

export const env = <TKey extends keyof Env>(key: TKey): Env[TKey] => {
  const rawValue = runtimeEnv(key)
  try {
    return envSchemas[key].parse(rawValue) as Env[TKey]
  } catch (error) {
    throw new Error(
      `Error while parsing environment variable ${key}: ${rawValue}`,
      {cause: error},
    )
  }
}
