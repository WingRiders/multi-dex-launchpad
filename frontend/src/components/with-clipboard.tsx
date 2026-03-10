import {type UseClipboardOptions, useClipboard} from '../helpers/clipboard'

export type WithClipboardProps = {
  text: string
  children?: (clipboard: ReturnType<typeof useClipboard>) => React.ReactNode
} & Pick<UseClipboardOptions, 'isCopiedTime'>

export const WithClipboard = ({
  text,
  children,
  ...clipboardOptions
}: WithClipboardProps) => {
  const clipboard = useClipboard(text, clipboardOptions)

  return children?.(clipboard)
}
