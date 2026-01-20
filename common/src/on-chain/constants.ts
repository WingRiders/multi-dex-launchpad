import exportInfo from './artifacts/export-info.json'

type LaunchpadConstants = {
  /**
   * Number of milliseconds that should pass after the end of the launchpad
   * for it to be considered failed and to allow emergency withdrawals.
   */
  emergencyWithdrawalPeriod: number
  /** Maximum allowed index in the node key */
  maxNodeIndex: number
  /** Minimum allowed index in the node key */
  minNodeIndex: number
  /** Number of milliseconds that should pass after user creates a node for it to be able to be removed */
  nodesInactivityPeriod: number
  /** Length of the separator key in bytes */
  separatorNodeKeyLength: number
}

export const launchpadConstants: LaunchpadConstants = {
  emergencyWithdrawalPeriod:
    exportInfo.launchpadConstants.emergencyWithdrawalPeriod,
  maxNodeIndex: exportInfo.launchpadConstants.maxNodeIndex,
  minNodeIndex: exportInfo.launchpadConstants.minNodeIndex,
  nodesInactivityPeriod: exportInfo.launchpadConstants.nodesInactivityPeriod,
  separatorNodeKeyLength: exportInfo.launchpadConstants.separatorNodeKeyLength,
}

export const WR_POOL_VALIDATOR_HASH = {
  mainnet: 'af97793b8702f381976cec83e303e9ce17781458c73c4bb16fe02b83',
  preprod: '4cffc25c184b6b452b9de831da55a2b9677dc7a9b2c06b362e5ba3d8',
}

export const WR_POOL_SYMBOL = {
  mainnet: 'c0ee29a85b13209423b10447d3c2e6a50641a15c57770e27cb9d5073',
  preprod: '8e97ba723d217adabf5f4d02b037b083ac9d3d8deb7576a061ffcd73',
}

export const SUNDAE_POOL_SCRIPT_HASH = {
  mainnet: 'e0302560ced2fdcbfcb2602697df970cd0d6a38f94b32703f51c312b',
  // TODO: I couldn't find the preprod one
  preprod: 'e0302560ced2fdcbfcb2602697df970cd0d6a38f94b32703f51c312b',
}
