'use client'

import {ArrowLeftIcon, Loader2Icon} from 'lucide-react'
import Link from 'next/link'
import {useShallow} from 'zustand/shallow'
import {ClientOnly} from '@/components/client-only'
import {PageContainer} from '@/components/page-container'
import {Alert, AlertTitle} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import {useConnectedWalletStore} from '@/store/connected-wallet'
import {isLaunchDraftStageAtLeast} from './helpers'
import {OverviewForm} from './overview-form'
import {ProjectInformationForm} from './project-information-form'
import {SpecificationForm} from './specification-form'
import {Stepper} from './stepper'
import {useCreateLaunchStore} from './store'
import {TokenInformationForm} from './token-information-form'
import {
  LaunchDraftStage,
  launchDraftStageStringToEnum,
  launchDraftStageToString,
} from './types'
import {UserAccessForm} from './user-access-form'

const CreatePage = () => {
  return (
    <PageContainer>
      <div className="flex flex-row flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <ArrowLeftIcon />
            Back
          </Link>
        </Button>
        <h1 className="font-bold text-4xl">Create a new token launch</h1>
      </div>
      <ClientOnly>
        <CreatePageContent />
      </ClientOnly>
    </PageContainer>
  )
}

const CreatePageContent = () => {
  const {draft} = useCreateLaunchStore(
    useShallow(({draft}) => ({
      draft,
    })),
  )

  const {isWalletConnected, isWalletConnecting} = useConnectedWalletStore(
    useShallow(({connectedWallet, isWalletConnecting}) => ({
      isWalletConnected: connectedWallet != null,
      isWalletConnecting,
    })),
  )

  if (!isWalletConnected) {
    return isWalletConnecting ? (
      <div className="flex h-60 items-center justify-center">
        <Loader2Icon className="size-8 animate-spin" />
      </div>
    ) : (
      <Alert variant="destructive" className="mt-8">
        <AlertTitle>Connect your wallet to continue</AlertTitle>
      </Alert>
    )
  }

  return (
    <Stepper.Provider
      initialStep={
        launchDraftStageToString[
          draft?.stage ?? LaunchDraftStage.PROJECT_INFORMATION
        ]
      }
      variant="horizontal"
    >
      {({methods}) => (
        <div className="mt-8">
          <Stepper.Navigation>
            {methods.all.map((step) => {
              const isAtLeastAtThisStage =
                (draft &&
                  isLaunchDraftStageAtLeast(
                    draft,
                    launchDraftStageStringToEnum[step.id],
                  )) ||
                (!draft &&
                  step.id ===
                    launchDraftStageToString[
                      LaunchDraftStage.PROJECT_INFORMATION
                    ])

              return (
                <Stepper.Step
                  key={step.id}
                  of={step.id}
                  onClick={() => methods.goTo(step.id)}
                  disabled={!isAtLeastAtThisStage}
                >
                  <Stepper.Title>{step.title}</Stepper.Title>
                </Stepper.Step>
              )
            })}
          </Stepper.Navigation>

          <div className="mt-8">
            {methods.switch({
              'project-information': () => (
                <Stepper.Panel>
                  <ProjectInformationForm />
                </Stepper.Panel>
              ),
              'token-information': () => (
                <Stepper.Panel>
                  <TokenInformationForm />
                </Stepper.Panel>
              ),
              specification: () => (
                <Stepper.Panel>
                  <SpecificationForm />
                </Stepper.Panel>
              ),
              'user-access': () => (
                <Stepper.Panel>
                  <UserAccessForm />
                </Stepper.Panel>
              ),
              overview: () => (
                <Stepper.Panel>
                  <OverviewForm />
                </Stepper.Panel>
              ),
            })}
          </div>
        </div>
      )}
    </Stepper.Provider>
  )
}

export default CreatePage
