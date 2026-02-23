import type {Node} from '../../prisma/generated/client'

export const serializeNodeKey = (hash: string, index: number) =>
  `${hash}#${index}`

// keyIndex may be any number
// committed === 0 is checked by contracts
export const isSeparator = ({keyHash}: Pick<Node, 'keyHash'>) =>
  keyHash?.length === 2
