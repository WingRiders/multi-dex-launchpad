import {resolveFingerprint, type Unit} from '@meshsdk/core'
import {parseUnit} from '@wingriders/multi-dex-launchpad-common'
import {CheckIcon, CopyIcon} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Skeleton} from '@/components/ui/skeleton'
import {WithClipboard} from '@/components/with-clipboard'
import {shortLabel} from '@/helpers/short-label'
import {cn} from '@/lib/utils'
import {useTokenMetadata} from '@/metadata/queries'

type ProjectTokenInfoProps = {
  projectToken: Unit
}

export const ProjectTokenInfo = ({projectToken}: ProjectTokenInfoProps) => {
  const {metadata, isLoading} = useTokenMetadata(projectToken)

  const [policyId, assetName] = parseUnit(projectToken)

  return (
    <section className="space-y-4">
      <h2 className="font-bold text-2xl tracking-tight">Token information</h2>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <div className="grid gap-2 md:grid-cols-3">
          <InfoItem
            label="Asset fingerprint"
            value={resolveFingerprint(policyId, assetName)}
            showCopy
            short
          />
          <InfoItem label="Policy ID" value={policyId} showCopy short />
          <InfoItem label="Asset name (HEX)" value={assetName} showCopy short />

          <InfoItem label="Full name" value={metadata?.name} />
          <InfoItem label="Ticker" value={metadata?.ticker} />
          <InfoItem label="Decimals" value={metadata?.decimals} />

          <InfoItem
            label="About"
            value={metadata?.description}
            className="col-span-full"
          />
        </div>
      )}
    </section>
  )
}

type InfoItemProps = {
  label: string
  value: string | number | undefined
  showCopy?: boolean
  short?: boolean
  className?: string
}

const InfoItem = ({
  label,
  value,
  showCopy,
  short,
  className,
}: InfoItemProps) => {
  const displayValue =
    value != null
      ? short
        ? shortLabel(value.toString(), 10, 10)
        : value.toString()
      : null

  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <div className="text-muted-foreground">
        <span className="font-medium text-sm">{label}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {displayValue != null ? (
          <>
            <p className="font-medium font-mono text-sm">{displayValue}</p>
            {showCopy && (
              <WithClipboard text={value!.toString()}>
                {({copy, isCopied}) => (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={copy}
                  >
                    {isCopied ? (
                      <CheckIcon className="size-4 text-success" />
                    ) : (
                      <CopyIcon className="size-4" />
                    )}
                  </Button>
                )}
              </WithClipboard>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm italic">—</p>
        )}
      </div>
    </div>
  )
}
