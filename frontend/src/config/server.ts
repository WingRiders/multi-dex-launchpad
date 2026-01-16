import {createServerOnlyFn} from '@tanstack/react-start'
import {z} from 'zod'

const serverConfigSchema = z.object({
  API_SERVER_PUBLIC_URL: z.string(),
  API_SERVER_URL: z.string(),
})

let serverConfig: z.infer<typeof serverConfigSchema>

export const getServerConfig = createServerOnlyFn(() => {
  if (serverConfig) return serverConfig

  const parsedEnv = serverConfigSchema.safeParse(process.env)

  if (!parsedEnv.success) {
    console.error(
      'Environment variables validation failed',
      z.treeifyError(parsedEnv.error),
    )
    process.exit(1)
  }

  serverConfig = parsedEnv.data
  return serverConfig
})
