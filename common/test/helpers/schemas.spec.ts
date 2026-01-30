import {expectTypeOf} from 'bun:test'
import type z from 'zod'
import type {getLaunchpadConfigTxMetadataSchema} from '../../src/helpers/schemas'
import type {LaunchpadConfig} from '../../src/launchpad-configs/launchpad-config'

expectTypeOf<
  z.infer<ReturnType<typeof getLaunchpadConfigTxMetadataSchema>>
>().toEqualTypeOf<LaunchpadConfig>()
