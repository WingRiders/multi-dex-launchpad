import {Prisma, type PrismaClient} from '../../prisma/generated/client'
import {config} from '../config'
import {createPrismaClient} from '../db'

export const prisma: PrismaClient = createPrismaClient(config.DATABASE_URL)

// Prisma by default handles array of Uint8Arrays as jsonb[], so this workaround is needed
export const toByteaArray = (buffers: Uint8Array[]) =>
  Prisma.sql`array[${Prisma.join(buffers)}]::bytea[]`
