'use client'

import {useSuspenseQuery} from '@tanstack/react-query'
import Image from 'next/image'
import {CancelledLaunchedBadge} from '@/components/cancelled-launched-badge'
import {LaunchTimeStatusBadge} from '@/components/launch-time-status-badge'
import {OnlyWithWallet} from '@/components/only-with-wallet'
import {UnitDisplay} from '@/components/unit-display'
import {ipfsToHttps} from '@/helpers/url'
import {useTRPC} from '@/trpc/client'
import {Allocation} from './allocation'
import {CancelLaunch} from './cancel-launch'
import {Contributing} from './contributing'
import {LaunchLink} from './launch-link'
import {LaunchTimeline} from './launch-timeline'
import {Progress} from './progress'
import {ProjectTokenInfo} from './project-token-info'
import {UserNodes} from './user-nodes'

type LaunchDetailsProps = {
  launchTxHash: string
}

export const LaunchDetails = ({launchTxHash}: LaunchDetailsProps) => {
  const trpc = useTRPC()
  const {data} = useSuspenseQuery(
    trpc.launch.queryOptions({txHash: launchTxHash}),
  )

  const {projectInfo, config, totalCommitted, isCancelled} = data

  return (
    <div className="space-y-8">
      <div className="flex flex-row items-center justify-between space-x-4">
        <div>
          <div className="flex flex-row items-center gap-4">
            <h1 className="font-bold text-4xl"> {projectInfo.title}</h1>
            {isCancelled ? (
              <CancelledLaunchedBadge className="text-sm" />
            ) : (
              <LaunchTimeStatusBadge
                startTime={config.startTime}
                defaultStartTime={config.defaultStartTime}
                endTime={config.endTime}
              />
            )}
          </div>
          <p className="mt-2 text-muted-foreground">
            {projectInfo.description}
          </p>
        </div>

        <UnitDisplay unit={config.projectToken} size="extra-large" />
      </div>

      <div className="flex gap-2">
        <LaunchLink label="Website" href={projectInfo.url} />
        <LaunchLink label="Tokenomics" href={projectInfo.tokenomicsUrl} />
        <LaunchLink label="Whitepaper" href={projectInfo.whitepaperUrl} />
        <LaunchLink
          label="Terms and Conditions"
          href={projectInfo.termsAndConditionsUrl}
        />
        <LaunchLink label="Additional" href={projectInfo.additionalUrl} />
      </div>

      <LaunchTimeline config={config} isCancelled={isCancelled} />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
        <div className="relative h-[300px] w-full md:col-span-3 md:h-[450px]">
          <Image
            src={ipfsToHttps(projectInfo.logoUrl)}
            alt={projectInfo.title}
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover"
            loading="eager"
          />
        </div>
        <div className="md:col-span-2">
          <Contributing
            launchTxHash={launchTxHash}
            config={config}
            totalCommitted={totalCommitted}
            isCancelled={isCancelled}
          />
        </div>
      </div>

      <OnlyWithWallet>
        {(connectedWallet) => (
          <UserNodes
            launchTxHash={launchTxHash}
            config={config}
            connectedWallet={connectedWallet}
          />
        )}
      </OnlyWithWallet>

      <Progress config={config} totalCommitted={totalCommitted} />

      <Allocation config={config} />

      <ProjectTokenInfo projectToken={config.projectToken} />

      {!isCancelled && (
        <OnlyWithWallet address={config.ownerBech32Address}>
          {(connectedWallet) => (
            <CancelLaunch
              launchTxHash={launchTxHash}
              config={config}
              connectedWallet={connectedWallet}
            />
          )}
        </OnlyWithWallet>
      )}
    </div>
  )
}
