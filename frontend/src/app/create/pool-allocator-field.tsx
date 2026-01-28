import {
  type Dex,
  dexes,
  SPLIT_BPS_BASE,
} from '@wingriders/multi-dex-launchpad-common'
import {round} from 'es-toolkit'
import {AlertCircleIcon, TrendingUpIcon} from 'lucide-react'
import Image from 'next/image'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import {Slider} from '@/components/ui/slider'
import {Switch} from '@/components/ui/switch'
import {cn} from '@/lib/utils'
import {SUPPORTED_DEXES_INFO} from '../constants'

const MIN_PERCENTAGE = 1
const MAX_PERCENTAGE = 99
const PERCENTAGE_STEP = 1

type PoolAllocatorFieldProps = {
  splitBps: number
  onSplitBpsChange: (splitBps: number) => void
  errors?: React.ComponentProps<typeof FieldError>['errors']
  isInvalid?: boolean
}

export const PoolAllocatorField = ({
  splitBps,
  onSplitBpsChange,
  errors,
  isInvalid,
}: PoolAllocatorFieldProps) => {
  const isWrDexEnabled = splitBps > 0
  const isSundaeDexEnabled = splitBps < SPLIT_BPS_BASE

  const wrAllocationPercentage = (splitBps / SPLIT_BPS_BASE) * 100
  const sundaeAllocationPercentage =
    ((SPLIT_BPS_BASE - splitBps) / SPLIT_BPS_BASE) * 100

  const handleToggleDex = (dex: Dex, enabled: boolean) => {
    if (dex === 'WingRidersV2')
      onSplitBpsChange(enabled ? SPLIT_BPS_BASE / 2 : 0)
    else onSplitBpsChange(enabled ? SPLIT_BPS_BASE / 2 : SPLIT_BPS_BASE)
  }

  const handleAllocationChange = (
    dex: Dex,
    newAllocationPercentage: number,
  ) => {
    const newAllocationBps = round(
      (newAllocationPercentage / 100) * SPLIT_BPS_BASE,
    )
    if (dex === 'WingRidersV2') onSplitBpsChange(newAllocationBps)
    else onSplitBpsChange(SPLIT_BPS_BASE - newAllocationBps)
  }

  return (
    <Field data-invalid={isInvalid}>
      <FieldContent>
        <FieldLabel htmlFor="split-bps">Liquidity Distribution</FieldLabel>
        <FieldDescription>
          Select which DEX pools will receive liquidity and how the raised funds
          will be distributed.
        </FieldDescription>
      </FieldContent>

      <div id="split-bps" className="grid gap-4" aria-invalid={isInvalid}>
        {dexes.map((dex) => {
          const isDexEnabled =
            dex === 'WingRidersV2' ? isWrDexEnabled : isSundaeDexEnabled
          const isOtherDexEnabled =
            dex === 'WingRidersV2' ? isSundaeDexEnabled : isWrDexEnabled
          const dexInfo = SUPPORTED_DEXES_INFO[dex]

          const allocationPercentage =
            dex === 'WingRidersV2'
              ? wrAllocationPercentage
              : sundaeAllocationPercentage

          return (
            <div
              key={dex}
              className={cn(
                'relative rounded-xl border p-5 transition-all duration-200',
                isDexEnabled
                  ? 'border-primary/30 bg-card shadow-lg shadow-primary/5'
                  : 'border-border bg-card/50 opacity-70',
              )}
            >
              {isDexEnabled && (
                <div
                  className={cn(
                    'absolute top-0 left-6 h-1 w-12 rounded-b-full',
                  )}
                  style={{
                    backgroundColor: dexInfo.color,
                  }}
                />
              )}

              <div className="flex items-start justify-between gap-4">
                <Image
                  src={dexInfo.icon}
                  alt={dexInfo.name}
                  width={200}
                  height={50}
                />

                <div className="flex flex-col items-end gap-1">
                  <Switch
                    checked={isDexEnabled}
                    onCheckedChange={(checked) => handleToggleDex(dex, checked)}
                    disabled={isDexEnabled && !isOtherDexEnabled}
                  />
                  <span className="text-muted-foreground text-xs">
                    {isDexEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              {isDexEnabled && isOtherDexEnabled && (
                <div className="mt-5 space-y-4 border-border/50 border-t pt-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <TrendingUpIcon className="size-4" />
                      <span>Fund Allocation</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-2xl text-foreground">
                        {round(allocationPercentage)}
                      </span>
                      <span className="text-muted-foreground text-sm">%</span>
                    </div>
                  </div>

                  <Slider
                    value={[allocationPercentage]}
                    onValueChange={([value]) =>
                      handleAllocationChange(dex, value)
                    }
                    min={MIN_PERCENTAGE}
                    max={MAX_PERCENTAGE}
                    step={PERCENTAGE_STEP}
                    className="w-full"
                  />

                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>{MIN_PERCENTAGE}%</span>
                    <span>50%</span>
                    <span>{MAX_PERCENTAGE}%</span>
                  </div>
                </div>
              )}

              {isDexEnabled && !isOtherDexEnabled && (
                <div className="mt-5 border-border/50 border-t pt-5">
                  <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-3 text-muted-foreground text-sm">
                    <AlertCircleIcon className="size-4 shrink-0" />
                    <span>
                      100% of funds will go to this pool. Enable another pool to
                      split the allocation.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isInvalid && <FieldError errors={errors} />}
    </Field>
  )
}
