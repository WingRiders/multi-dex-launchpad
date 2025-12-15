import {prisma} from './db/prisma-client'
import {logger} from './logger'

import {startServer} from './server'

export const name = 'multi-dex-launchpad-aggregator'

logger.info({blockCount: await prisma.block.count()}, 'Hello World!')

startServer()
