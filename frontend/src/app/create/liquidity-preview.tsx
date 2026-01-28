import type {Unit} from '@meshsdk/core'
import {type Dex, SPLIT_BPS_BASE} from '@wingriders/multi-dex-launchpad-common'
import {BigNumber} from 'bignumber.js'
import {ExchangeRate} from '@/components/exchange-rate'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {SUPPORTED_DEXES_INFO} from '../constants'

type LiquidityPreviewProps = {
  projectTokenUnit: Unit
  raisingTokenUnit: Unit
  projectTokensForSale: bigint
  projectMinCommitment: bigint
  projectMaxCommitment: bigint | null
  raisedTokensPoolPartPercentage: bigint
  projectTokensToPool: bigint
  splitBps: number
}

export const LiquidityPreview = ({
  projectTokenUnit,
  raisingTokenUnit,
  projectTokensForSale,
  projectMinCommitment,
  projectMaxCommitment,
  raisedTokensPoolPartPercentage,
  projectTokensToPool,
  splitBps,
}: LiquidityPreviewProps) => {
  const minRaisedTokensToPools =
    (projectMinCommitment * raisedTokensPoolPartPercentage) / 100n
  const maxRaisedTokensToPools =
    projectMaxCommitment != null
      ? (projectMaxCommitment * raisedTokensPoolPartPercentage) / 100n
      : null

  const getDexValues = (ratio: BigNumber) => ({
    projectTokensToPool: BigInt(
      ratio.times(projectTokensToPool).integerValue().toString(),
    ),
    minRaisedTokensToPool: BigInt(
      ratio.times(minRaisedTokensToPools).integerValue().toString(),
    ),
    maxRaisedTokensToPool:
      maxRaisedTokensToPools != null
        ? BigInt(ratio.times(maxRaisedTokensToPools).integerValue().toString())
        : null,
  })

  const wrDexValues =
    splitBps === 0
      ? null
      : getDexValues(BigNumber(splitBps).div(SPLIT_BPS_BASE))

  const sundaeDexValues =
    splitBps === SPLIT_BPS_BASE
      ? null
      : getDexValues(BigNumber(SPLIT_BPS_BASE - splitBps).div(SPLIT_BPS_BASE))

  const renderDexValues = (
    dex: Dex,
    dexValue: ReturnType<typeof getDexValues>,
  ) => {
    return (
      <TableRow>
        <TableCell className="font-medium">
          DEX: {SUPPORTED_DEXES_INFO[dex].name}
        </TableCell>
        <TableCell>
          <ExchangeRate
            quantityA={dexValue.minRaisedTokensToPool}
            quantityB={dexValue.projectTokensToPool}
            unitA={raisingTokenUnit}
            unitB={projectTokenUnit}
          />
        </TableCell>
        {dexValue.maxRaisedTokensToPool != null && (
          <TableCell>
            <ExchangeRate
              quantityA={dexValue.maxRaisedTokensToPool}
              quantityB={dexValue.projectTokensToPool}
              unitA={raisingTokenUnit}
              unitB={projectTokenUnit}
            />
          </TableCell>
        )}
      </TableRow>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Destination</TableHead>
          <TableHead>Price if the minimum tokens are raised</TableHead>
          {projectMaxCommitment != null && (
            <TableHead>Price if the maximum tokens are raised</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">Launch contributors</TableCell>
          <TableCell>
            <ExchangeRate
              quantityA={projectMinCommitment}
              quantityB={projectTokensForSale}
              unitA={raisingTokenUnit}
              unitB={projectTokenUnit}
            />
          </TableCell>
          {projectMaxCommitment != null && (
            <TableCell>
              <ExchangeRate
                quantityA={projectMaxCommitment}
                quantityB={projectTokensForSale}
                unitA={raisingTokenUnit}
                unitB={projectTokenUnit}
              />
            </TableCell>
          )}
        </TableRow>

        {wrDexValues && renderDexValues('WingRidersV2', wrDexValues)}
        {sundaeDexValues && renderDexValues('SundaeSwapV3', sundaeDexValues)}
      </TableBody>
    </Table>
  )
}
