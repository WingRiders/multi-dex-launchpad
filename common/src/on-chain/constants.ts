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
