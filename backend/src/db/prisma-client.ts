import {PrismaPg} from '@prisma/adapter-pg'
import {Prisma, PrismaClient} from '../../prisma/generated/client'
import {config} from '../config'

export const prisma: PrismaClient = new PrismaClient({
  adapter: new PrismaPg(
    {connectionString: config.DATABASE_URL},
    {schema: config.DB_SCHEMA},
  ),
})

// Prisma by default handles array of Uint8Arrays as jsonb[], so this workaround is needed
export const toByteaArray = (buffers: Uint8Array[]) =>
  Prisma.sql`array[${Prisma.join(buffers)}]::bytea[]`
