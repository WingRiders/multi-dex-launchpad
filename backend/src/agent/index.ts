import {config, isAgentMode} from '../config'
import {prisma} from '../db/prisma-client'
import {ensure} from '../ensure'
import {logger} from '../logger'

export const startAgent = async () => {
  ensure(isAgentMode, {mode: config.MODE}, 'Unsupported MODE')
  logger.info({blockCount: await prisma.block.count()}, 'Hello World!')
}
