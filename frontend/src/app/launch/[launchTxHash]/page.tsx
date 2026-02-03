import {dehydrate, HydrationBoundary} from '@tanstack/react-query'
import {ArrowLeftIcon} from 'lucide-react'
import Link from 'next/link'
import {Suspense, use} from 'react'
import {PageContainer} from '@/components/page-container'
import {Button} from '@/components/ui/button'
import {makeQueryClient} from '@/trpc/query-client'
import {getServerTrpc} from '@/trpc/server'
import {LaunchDetails} from './launch-details'
import {LaunchDetailsErrorBoundary} from './launch-details-error-boundary'
import {LoadingSkeleton} from './loading-skeleton'

const LaunchPage = ({
  params: paramsPromise,
}: PageProps<'/launch/[launchTxHash]'>) => {
  const trpc = getServerTrpc()
  const queryClient = makeQueryClient()

  const params = use(paramsPromise)

  queryClient.prefetchQuery(
    trpc.launch.queryOptions({txHash: params.launchTxHash}),
  )

  return (
    <PageContainer>
      <Button variant="outline" size="sm" asChild>
        <Link href="/">
          <ArrowLeftIcon />
          Back
        </Link>
      </Button>

      <div className="mt-5">
        <LaunchDetailsErrorBoundary>
          <Suspense fallback={<LoadingSkeleton />}>
            <HydrationBoundary state={dehydrate(queryClient)}>
              <LaunchDetails launchTxHash={params.launchTxHash} />
            </HydrationBoundary>
          </Suspense>
        </LaunchDetailsErrorBoundary>
      </div>
    </PageContainer>
  )
}

export default LaunchPage
