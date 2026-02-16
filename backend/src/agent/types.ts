import type {Cutoff} from './cutoff'

export type EligibilityWithCutoff = {
  eligibleNodeKeys: Set<string> // "${keyOwner}#${keyIndex}"
  cutoff?: Cutoff
}
