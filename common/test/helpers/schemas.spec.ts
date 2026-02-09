import {expectTypeOf} from 'bun:test'
import type z from 'zod'
import type {getLaunchConfigTxMetadataSchema} from '../../src/helpers/schemas'
import type {LaunchConfig} from '../../src/launch-configs/launch-config'

expectTypeOf<
  z.infer<ReturnType<typeof getLaunchConfigTxMetadataSchema>>
>().toEqualTypeOf<LaunchConfig>()
