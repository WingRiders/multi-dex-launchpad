import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'
import {defineConfig, env} from 'prisma/config'

dotenvExpand.expand(dotenv.config())

export default defineConfig({
  schema: '../common/prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
})
