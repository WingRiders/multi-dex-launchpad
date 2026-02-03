import type {Unit} from '@meshsdk/core'
import {cn} from '@/lib/utils'
import {useTokenMetadata} from '../metadata/queries'
import {UnitImage} from './unit-image'

type UnitDisplayProps = {
  unit: Unit
  size?: 'medium' | 'extra-large'
}

export const UnitDisplay = ({unit, size = 'medium'}: UnitDisplayProps) => {
  const {metadata, hasRemoteMetadata} = useTokenMetadata(unit)

  const {imageSize, parentClass, textClass} = {
    medium: {imageSize: 32, parentClass: 'gap-2', textClass: 'text-md'},
    'extra-large': {imageSize: 48, parentClass: 'gap-4', textClass: 'text-2xl'},
  }[size]

  return (
    <div className={cn('flex items-center', parentClass)}>
      <UnitImage
        unit={unit}
        metadata={metadata}
        hasRemoteMetadata={hasRemoteMetadata}
        size={imageSize}
      />
      <p className={textClass}>{metadata?.ticker}</p>
    </div>
  )
}
