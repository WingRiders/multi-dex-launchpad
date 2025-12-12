import {createPrismaClient} from '@wingriders/multi-dex-launchpad-backend-common'
import {
  Prisma,
  type PrismaClient,
} from '@wingriders/multi-dex-launchpad-backend-common/prisma'
import {config} from '../config'

export const prisma: PrismaClient = createPrismaClient(config.DATABASE_URL)

// Prisma by default handles array of Uint8Arrays as jsonb[], so this workaround is needed
export const toByteaArray = (buffers: Uint8Array[]) =>
  Prisma.sql`array[${Prisma.join(buffers)}]::bytea[]`
