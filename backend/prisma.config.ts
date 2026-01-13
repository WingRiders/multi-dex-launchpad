import {defineConfig, env} from 'prisma/config'

// We regenerate the client on the CI
// but it doesn't have (and doesn't need) the DB connection
let url: string | undefined
try {
  url = env('DATABASE_URL')
} catch (_e) {}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {url},
})
