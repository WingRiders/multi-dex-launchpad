import {resolveFingerprint, type Unit} from '@meshsdk/core'
import {parseUnit} from '@wingriders/multi-dex-launchpad-common'
import {CheckIcon, CopyIcon} from 'lucide-react'
import {GridItem} from '@/components/grid-item'
import {Button} from '@/components/ui/button'
import {Skeleton} from '@/components/ui/skeleton'
import {WithClipboard} from '@/components/with-clipboard'
import {shortLabel} from '@/helpers/short-label'
import {useTokenMetadata} from '@/metadata/queries'

type ProjectTokenInfoProps = {
  projectToken: Unit
}

export const ProjectTokenInfo = ({projectToken}: ProjectTokenInfoProps) => {
  const {metadata, isLoading} = useTokenMetadata(projectToken)

  const [policyId, assetName] = parseUnit(projectToken)

  return (
    <div className="space-y-2">
      <h2 className="font-bold text-2xl">Token information</h2>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <Item
            label="Asset fingerprint"
            value={resolveFingerprint(policyId, assetName)}
            showCopyButton
            short
          />
          <Item label="Policy ID" value={policyId} showCopyButton short />
          <Item
            label="Asset name (HEX)"
            value={assetName}
            isLoading={isLoading}
            showCopyButton
            short
          />
          <Item
            label="Full name"
            value={metadata?.name}
            isLoading={isLoading}
          />
          <Item label="Ticker" value={metadata?.ticker} isLoading={isLoading} />
          <Item
            label="Decimals"
            value={metadata?.decimals}
            isLoading={isLoading}
          />
          <Item
            label="About"
            value={metadata?.description}
            isLoading={isLoading}
            className="md:col-span-3"
          />
        </div>
      )}
    </div>
  )
}

type ItemProps = {
  label: string
  value: string | number | undefined
  isLoading?: boolean
  className?: string
  showCopyButton?: boolean
  short?: boolean
}

const Item = ({
  label,
  value,
  isLoading,
  className,
  showCopyButton,
  short,
}: ItemProps) => {
  const valueToDisplay =
    short && value != null ? shortLabel(value.toString(), 10, 10) : value

  return (
    <GridItem
      label={label}
      value={
        value != null ? (
          showCopyButton ? (
            <div className="flex flex-row items-center gap-2">
              <WithClipboard text={value.toString()}>
                {({copy, isCopied}) => (
                  <>
                    <p className="text-sm">{valueToDisplay}</p>
                    <Button variant="ghost" size="sm" onClick={copy}>
                      {isCopied ? (
                        <CheckIcon className="size-4" />
                      ) : (
                        <CopyIcon className="size-4" />
                      )}
                    </Button>
                  </>
                )}
              </WithClipboard>
            </div>
          ) : (
            <p className="text-sm">{valueToDisplay}</p>
          )
        ) : (
          <p className="text-sm">-</p>
        )
      }
      isLoading={isLoading}
      className={className}
    />
  )
}
