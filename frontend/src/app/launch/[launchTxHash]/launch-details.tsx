'use client'

import {useSuspenseQuery} from '@tanstack/react-query'
import Image from 'next/image'
import {UnitDisplay} from '@/components/unit-display'
import {ipfsToHttps} from '@/helpers/url'
import {useTRPC} from '@/trpc/client'
import {Allocation} from './allocation'
import {LaunchLink} from './launch-link'
import {LaunchTimeline} from './launch-timeline'
import {Progress} from './progress'
import {ProjectTokenInfo} from './project-token-info'

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

      <div className="grid grid-cols-5 gap-8">
        <div className="relative col-span-3 h-[450px] w-full">
          <Image
            src={ipfsToHttps(projectInfo.logoUrl)}
            alt={projectInfo.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="col-span-2 border p-5">Contributing</div>
      </div>

      <Allocation config={config} />

      <Progress config={config} totalCommitted={totalCommitted} />

      <ProjectTokenInfo projectToken={config.projectToken} />
    </div>
  )
}
