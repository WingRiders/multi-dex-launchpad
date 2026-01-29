import {InfoIcon} from 'lucide-react'
import type {ReactNode} from 'react'
import {Tooltip, TooltipContent, TooltipTrigger} from './ui/tooltip'

type InfoTooltipProps = {
  content: ReactNode
}

export const InfoTooltip = ({content}: InfoTooltipProps) => {
  return (
    <Tooltip>
      <TooltipTrigger>
        <InfoIcon className="size-4" />
      </TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  )
}
