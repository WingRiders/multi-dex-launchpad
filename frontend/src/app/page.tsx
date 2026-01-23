import {Loader2Icon} from 'lucide-react'
import {Suspense} from 'react'
import {LaunchesSection} from '@/app/launches-section'
import {PageContainer} from '@/components/page-container'

const Dashboard = async () => {
  return (
    <PageContainer>
      <h1 className="font-bold text-4xl">Multi DEX Launchpad</h1>
      <p className="mt-4 text-muted-foreground">
        A fully on-chain, permissionless, and trustless launchpad platform that
        is completely open-source. Multiple liquidity pools are automatically
        created across multiple decentralized exchanges, including WingRiders
        and SundaeSwap, at the end of each token launch.
      </p>
      <Suspense
        fallback={
          <div className="mt-40 flex items-center justify-center">
            <Loader2Icon className="size-8 animate-spin" />
          </div>
        }
      >
        <div className="mt-8 flex flex-col gap-4">
          <LaunchesSection
            title="Active Launches"
            timeStatus="active"
            displayType="hide-if-empty"
          />
          <LaunchesSection
            title="Upcoming Launches"
            timeStatus="upcoming"
            displayType="show-loading"
          />
          <LaunchesSection
            title="Past Launches"
            timeStatus="past"
            displayType="show-loading"
          />
        </div>
      </Suspense>
    </PageContainer>
  )
}

export default Dashboard
