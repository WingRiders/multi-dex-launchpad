import {prisma} from './db/prisma-client'
import {logger} from './logger'
import {startServer} from './server'

logger.info({blockCount: await prisma.block.count()}, 'Hello World!')

startServer()
