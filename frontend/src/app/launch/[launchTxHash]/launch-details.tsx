'use client'

import {useSuspenseQuery} from '@tanstack/react-query'
import Image from 'next/image'
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

  const {projectInfo, config, totalCommitted} = data

  return (
    <div className="space-y-8">
      <div className="flex flex-row items-center justify-between space-x-4">
        <div>
          <h1 className="font-bold text-4xl"> {projectInfo.title}</h1>
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

      <LaunchTimeline config={config} />

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
          <Contributing launchTxHash={launchTxHash} config={config} />
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

      <Allocation config={config} />

      <Progress config={config} totalCommitted={totalCommitted} />

      <ProjectTokenInfo projectToken={config.projectToken} />

      <OnlyWithWallet address={config.ownerBech32Address}>
        {(connectedWallet) => (
          <CancelLaunch
            launchTxHash={launchTxHash}
            config={config}
            connectedWallet={connectedWallet}
          />
        )}
      </OnlyWithWallet>
    </div>
  )
}
