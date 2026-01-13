import {config} from '../config'
import {logger} from '../logger'

// creates new database if absent and applies all migrations to the existing database.
export const migrateDb = async () => {
  // Currently we don't have any direct method to invoke prisma migration programmatically.
  // As a workaround, we spawn migration script as a child process and wait for its completion.
  // Please also refer to the following GitHub issue: https://github.com/prisma/prisma/issues/4703
  const proc = Bun.spawn(['bun', 'prisma:deploy'])
  const exitCode = await proc.exited
  logger.info(
    {
      stdout: proc.stdout,
      stderr: proc.stderr,
      exitCode,
      signalCode: proc.signalCode,
    },
    'bun prisma:deploy exited',
  )
  if (exitCode !== 0)
    throw new Error(`DB migration failed with exit code ${exitCode}`)
}

export const ensureDBMigrated = async () => {
  logger.info('Migrating DB if necessary')

  if (config.NODE_ENV !== 'production') {
    logger.info(`Skipping DB migration because NODE_ENV=${config.NODE_ENV}`)
    return
  }

  logger.info('Starting migration...')
  try {
    await migrateDb()
  } catch (e) {
    logger.error(e, 'Unable to run migrations')
  }
}
