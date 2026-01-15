import {createTRPCContext} from '@trpc/tanstack-react-query'
import type {ServerAppRouter} from '@wingriders/multi-dex-launchpad-backend/src/app-router'

export const {TRPCProvider, useTRPC} = createTRPCContext<ServerAppRouter>()
