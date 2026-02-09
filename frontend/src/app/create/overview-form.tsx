import {
  INIT_LAUNCH_AGENT_LOVELACE,
  LAUNCH_COLLATERAL,
  LOVELACE_UNIT,
} from '@wingriders/multi-dex-launchpad-common'
import Image from 'next/image'
import {useState} from 'react'
import {useShallow} from 'zustand/shallow'
import {AssetQuantity} from '@/components/asset-quantity'
import {ErrorAlert} from '@/components/error-alert'
import {Button} from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {Slider} from '@/components/ui/slider'
import {UnitDisplay} from '@/components/unit-display'
import {formatDateTime} from '@/helpers/format'
import {ipfsToHttps} from '@/helpers/url'
import {ADA_METADATA} from '@/metadata/constants'
import {useConnectedWalletStore} from '@/store/connected-wallet'
import {useWalletBalanceQuery} from '@/wallet/queries'
import {CreateLaunchDialog} from './create-launch-dialog'
import {getLaunchStartTimeForce, isLaunchDraftStageAfter} from './helpers'
import {LiquidityPreview} from './liquidity-preview'
import {MIN_RAISED_TOKENS_POOL_PART_PERCENTAGE} from './schemas'
import {Stepper, useStepper} from './stepper'
import {useCreateLaunchStore} from './store'
import {LaunchDraftStage} from './types'

const ESTIMATE_INIT_TRANSACTION_FEE_LOVELACE = 1_000_000n

export const OverviewForm = () => {
  const {draft: storeDraft} = useCreateLaunchStore(
    useShallow(({draft}) => ({draft})),
  )

  const stepper = useStepper()

  const {connectedWallet} = useConnectedWalletStore(
    useShallow(({connectedWallet}) => ({connectedWallet})),
  )

  const {
    data: walletBalance,
    isLoading: isLoadingWalletBalance,
    error: walletBalanceError,
  } = useWalletBalanceQuery()

  const [isCreateLaunchDialogOpen, setIsCreateLaunchDialogOpen] =
    useState(false)

  const draft =
    storeDraft &&
    isLaunchDraftStageAfter(storeDraft, LaunchDraftStage.USER_ACCESS)
      ? storeDraft
      : null

  if (!draft || !connectedWallet) {
    // this shouldn't happen
    return null
  }

  const {projectInformation, tokenInformation, specification, userAccess} =
    draft

  const requiredProjectTokens =
    tokenInformation.projectTokenToSale.quantity +
    specification.projectTokensToPool

  const hasEnoughAda = walletBalance
    ? (walletBalance[LOVELACE_UNIT] ?? 0n) >=
      LAUNCH_COLLATERAL +
        INIT_LAUNCH_AGENT_LOVELACE +
        ESTIMATE_INIT_TRANSACTION_FEE_LOVELACE
    : undefined

  const hasEnoughProjectTokens = walletBalance
    ? (walletBalance[tokenInformation.projectTokenToSale.unit] ?? 0n) >=
      requiredProjectTokens
    : undefined

  return (
    <>
      <div>
        <div className="space-y-8">
          {/* Project Information Section */}
          <div className="space-y-4">
            <h2 className="font-semibold text-2xl text-foreground">
              Project Information
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <FieldGroup>
                <Field>
                  <FieldContent>
                    <FieldLabel>Launch title</FieldLabel>
                  </FieldContent>
                  <p className="text-foreground">{projectInformation.title}</p>
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel>Description</FieldLabel>
                  </FieldContent>
                  <p className="whitespace-pre-wrap text-foreground">
                    {projectInformation.description}
                  </p>
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel>
                      Link to detailed information about project and its product
                    </FieldLabel>
                  </FieldContent>
                  <a
                    href={projectInformation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {projectInformation.url}
                  </a>
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel>Tokenomics link</FieldLabel>
                  </FieldContent>
                  <a
                    href={projectInformation.tokenomicsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {projectInformation.tokenomicsUrl}
                  </a>
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel>Whitepaper link</FieldLabel>
                  </FieldContent>
                  {projectInformation.whitepaperUrl ? (
                    <a
                      href={projectInformation.whitepaperUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {projectInformation.whitepaperUrl}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">Not set</p>
                  )}
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel>Terms and Conditions link</FieldLabel>
                  </FieldContent>
                  {projectInformation.termsAndConditionsUrl ? (
                    <a
                      href={projectInformation.termsAndConditionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {projectInformation.termsAndConditionsUrl}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">Not set</p>
                  )}
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel>
                      Link to other important information or credentials
                    </FieldLabel>
                  </FieldContent>
                  {projectInformation.additionalUrl ? (
                    <a
                      href={projectInformation.additionalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {projectInformation.additionalUrl}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">Not set</p>
                  )}
                </Field>
              </FieldGroup>

              <div className="overflow-hidden rounded-lg">
                <Image
                  src={ipfsToHttps(projectInformation.logoUrl)}
                  alt={projectInformation.title}
                  width={800}
                  height={400}
                  className="h-auto w-full object-cover"
                  loading="eager"
                />
              </div>
            </div>
          </div>

          {/* Token Information Section */}
          <div className="space-y-4">
            <h2 className="font-semibold text-2xl text-foreground">
              Token Information
            </h2>
            <FieldGroup>
              <Field>
                <FieldContent>
                  <FieldLabel>Project token and quantity for sale</FieldLabel>
                </FieldContent>
                <p className="text-foreground">
                  <AssetQuantity
                    unit={tokenInformation.projectTokenToSale.unit}
                    quantity={tokenInformation.projectTokenToSale.quantity}
                  />
                </p>
              </Field>
            </FieldGroup>
          </div>

          {/* Specification Section */}
          <div className="space-y-4">
            <h2 className="font-semibold text-2xl text-foreground">
              Specification
            </h2>
            <FieldGroup>
              <Field>
                <FieldContent>
                  <FieldLabel>Token to be raised</FieldLabel>
                </FieldContent>
                <UnitDisplay unit={specification.raisingTokenUnit} />
              </Field>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Field>
                  <FieldContent>
                    <FieldLabel>Minimum tokens to raise</FieldLabel>
                  </FieldContent>
                  <p className="text-foreground">
                    <AssetQuantity
                      unit={specification.raisingTokenUnit}
                      quantity={specification.projectMinCommitment}
                    />
                  </p>
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel>Maximum tokens to raise</FieldLabel>
                  </FieldContent>
                  {specification.projectMaxCommitment ? (
                    <p className="text-foreground">
                      <AssetQuantity
                        unit={specification.raisingTokenUnit}
                        quantity={specification.projectMaxCommitment}
                      />
                    </p>
                  ) : (
                    <p className="text-muted-foreground">Not set</p>
                  )}
                </Field>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground text-xl">
                  Liquidity pools configuration
                </h3>
                <div className="space-y-10">
                  <Field>
                    <FieldContent>
                      <FieldLabel>
                        How many of the raised tokens will be used to open
                        liquidity pool(s)
                      </FieldLabel>
                    </FieldContent>
                    <Slider
                      value={[specification.raisedTokensPoolPartPercentage]}
                      min={MIN_RAISED_TOKENS_POOL_PART_PERCENTAGE}
                      max={100}
                      step={1}
                      disabled
                      className="mt-4"
                    />
                    <div className="mt-4 flex flex-row justify-between">
                      <p className="text-muted-foreground text-sm">
                        <strong>For pool(s):</strong>{' '}
                        {specification.raisedTokensPoolPartPercentage}%
                      </p>
                      <p className="text-muted-foreground text-sm">
                        <strong>For launch creator:</strong>{' '}
                        {100 - specification.raisedTokensPoolPartPercentage}%
                      </p>
                    </div>
                  </Field>

                  <Field>
                    <FieldContent>
                      <FieldLabel>
                        Additional project tokens committed to liquidity pool(s)
                      </FieldLabel>
                    </FieldContent>
                    <p className="text-foreground">
                      <AssetQuantity
                        unit={tokenInformation.projectTokenToSale.unit}
                        quantity={specification.projectTokensToPool}
                      />
                    </p>
                  </Field>

                  <Field>
                    <FieldContent>
                      <FieldLabel>
                        Total project tokens used for launch
                      </FieldLabel>
                      <FieldDescription>
                        For sale + additional project tokens committed to
                        liquidity pool(s)
                      </FieldDescription>
                    </FieldContent>
                    <p className="text-foreground">
                      <AssetQuantity
                        unit={tokenInformation.projectTokenToSale.unit}
                        quantity={
                          tokenInformation.projectTokenToSale.quantity +
                          specification.projectTokensToPool
                        }
                      />
                    </p>
                  </Field>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground text-xl">
                    Liquidity preview
                  </h3>
                  <LiquidityPreview
                    projectTokenUnit={tokenInformation.projectTokenToSale.unit}
                    raisingTokenUnit={specification.raisingTokenUnit}
                    projectTokensForSale={
                      tokenInformation.projectTokenToSale.quantity
                    }
                    projectMinCommitment={specification.projectMinCommitment}
                    projectMaxCommitment={specification.projectMaxCommitment}
                    raisedTokensPoolPartPercentage={BigInt(
                      specification.raisedTokensPoolPartPercentage,
                    )}
                    projectTokensToPool={specification.projectTokensToPool}
                    splitBps={specification.splitBps}
                  />
                </div>
              </div>
            </FieldGroup>
          </div>

          {/* User Access Section */}
          <div className="space-y-4">
            <h2 className="font-semibold text-2xl text-foreground">
              User Access
            </h2>
            <FieldGroup>
              <div className="space-y-4 rounded-xl border border-border/50 p-4">
                <h3 className="font-medium text-xl">Public tier</h3>
                <p className="text-muted-foreground text-sm">
                  The public tier is the default tier for the token launch. It
                  is available to all users.
                </p>
                {userAccess.defaultTier ? (
                  <div className="grid grid-cols-3 gap-4">
                    <Field>
                      <FieldContent>
                        <FieldLabel>Start time</FieldLabel>
                      </FieldContent>
                      <p className="text-foreground">
                        {formatDateTime(userAccess.defaultTier.startTime)}
                      </p>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>
                          Minimum contribution from one user
                        </FieldLabel>
                      </FieldContent>
                      <p className="text-foreground">
                        <AssetQuantity
                          unit={specification.raisingTokenUnit}
                          quantity={userAccess.defaultTier.minCommitment}
                        />
                      </p>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>
                          Maximum contribution from one user
                        </FieldLabel>
                      </FieldContent>
                      {userAccess.defaultTier.maxCommitment ? (
                        <p className="text-foreground">
                          <AssetQuantity
                            unit={specification.raisingTokenUnit}
                            quantity={userAccess.defaultTier.maxCommitment}
                          />
                        </p>
                      ) : (
                        <p className="text-muted-foreground">Not set</p>
                      )}
                    </Field>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Not set</p>
                )}
              </div>

              <div className="space-y-4 rounded-xl border border-border/50 p-4">
                <h3 className="font-medium text-xl">Presale tier</h3>
                <p className="text-muted-foreground text-sm">
                  The presale tier is a tier that is available to users who hold
                  the specified NFT.
                </p>
                {userAccess.presaleTier ? (
                  <div className="grid grid-cols-3 gap-4">
                    <Field>
                      <FieldContent>
                        <FieldLabel>Start time</FieldLabel>
                      </FieldContent>
                      <p className="text-foreground">
                        {formatDateTime(userAccess.presaleTier.startTime)}
                      </p>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>
                          Minimum contribution from one user
                        </FieldLabel>
                      </FieldContent>
                      <p className="text-foreground">
                        <AssetQuantity
                          unit={specification.raisingTokenUnit}
                          quantity={userAccess.presaleTier.minCommitment}
                        />
                      </p>
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>
                          Maximum contribution from one user
                        </FieldLabel>
                      </FieldContent>
                      {userAccess.presaleTier.maxCommitment ? (
                        <p className="text-foreground">
                          <AssetQuantity
                            unit={specification.raisingTokenUnit}
                            quantity={userAccess.presaleTier.maxCommitment}
                          />
                        </p>
                      ) : (
                        <p className="text-muted-foreground">Not set</p>
                      )}
                    </Field>

                    <Field>
                      <FieldContent>
                        <FieldLabel>NFT policy ID</FieldLabel>
                      </FieldContent>
                      <p className="font-mono text-foreground text-sm">
                        {userAccess.presaleTier.nftPolicyId}
                      </p>
                    </Field>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Not set</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Field>
                  <FieldContent>
                    <FieldLabel>Launch start time</FieldLabel>
                    <FieldDescription>
                      The start time of the launch. It's the earliest start time
                      of all tiers.
                    </FieldDescription>
                  </FieldContent>
                  <p className="text-foreground">
                    {formatDateTime(getLaunchStartTimeForce(userAccess))}
                  </p>
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel>Launch end time</FieldLabel>
                    <FieldDescription>
                      The end time of the token launch. Applies to all
                      configured tiers.
                    </FieldDescription>
                  </FieldContent>
                  <p className="text-foreground">
                    {formatDateTime(userAccess.endTime)}
                  </p>
                </Field>
              </div>
            </FieldGroup>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {walletBalanceError && (
            <ErrorAlert
              title="Error while fetching wallet balance"
              description={walletBalanceError.message}
            />
          )}
          {hasEnoughAda === false && (
            <ErrorAlert
              title={`Insufficient ${ADA_METADATA.ticker} balance`}
              description={
                <>
                  You need:
                  <ul className="ml-4 flex list-disc flex-col gap-1">
                    <li>
                      <AssetQuantity
                        unit={LOVELACE_UNIT}
                        quantity={LAUNCH_COLLATERAL}
                      />{' '}
                      as a collateral, it will be returned to you after the
                      launch.
                    </li>
                    <li>
                      <AssetQuantity
                        unit={LOVELACE_UNIT}
                        quantity={INIT_LAUNCH_AGENT_LOVELACE}
                      />{' '}
                      to deploy the launch smart contracts. Part of this will be
                      returned to you after the launch.
                    </li>
                    <li>
                      ~
                      <AssetQuantity
                        unit={LOVELACE_UNIT}
                        quantity={ESTIMATE_INIT_TRANSACTION_FEE_LOVELACE}
                      />{' '}
                      to pay for the transaction fee.
                    </li>
                  </ul>
                </>
              }
            />
          )}
          {hasEnoughProjectTokens === false && (
            <ErrorAlert
              title="Insufficient project tokens"
              description={
                <>
                  Based on your configuration, you need to have at least{' '}
                  <AssetQuantity
                    unit={tokenInformation.projectTokenToSale.unit}
                    quantity={requiredProjectTokens}
                  />{' '}
                  in your wallet to create this token launch.
                </>
              }
            />
          )}
        </div>

        <Stepper.Controls className="mt-8">
          <Button
            variant="secondary"
            onClick={stepper.prev}
            disabled={stepper.isFirst}
          >
            Previous
          </Button>
          <Button
            onClick={() => setIsCreateLaunchDialogOpen(true)}
            disabled={
              isLoadingWalletBalance ||
              !walletBalance ||
              !hasEnoughAda ||
              !hasEnoughProjectTokens
            }
            loading={isLoadingWalletBalance}
          >
            Create token launch
          </Button>
        </Stepper.Controls>
      </div>

      <CreateLaunchDialog
        open={isCreateLaunchDialogOpen}
        onOpenChange={setIsCreateLaunchDialogOpen}
        draft={draft}
        wallet={connectedWallet}
      />
    </>
  )
}
