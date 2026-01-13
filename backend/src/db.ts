import {PrismaPg} from '@prisma/adapter-pg'
import {PrismaClient} from '../prisma/generated/client'

// https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7#driver-adapters-and-client-instantiation
export const createPrismaClient = (connectionString: string) => {
  const adapter = new PrismaPg({connectionString})
  return new PrismaClient({adapter})
}
