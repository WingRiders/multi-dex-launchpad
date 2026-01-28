import {getScriptFromExport} from '..'
import * as artifacts from './artifacts'
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

// TODO: revisit all the constants
export const DAO_FEE_NUMERATOR = 5
export const DAO_FEE_DENOMINATOR = 1000

export const DAO_FEE_RECEIVER_BECH32_ADDRESS = {
  mainnet: 'todo',
  preprod:
    'addr_test1qzuz2e6p4z54thrj0u5nnpg5523jkmnvqjtu78p6873daddnq89ztzv3zmk7lyr9krkt4dpdaw37x5v3daf5muspw0rqwhnlz5',
}

// TODO: that should be the agent
export const DAO_ADMIN_PUB_KEY_HASH = {
  mainnet: 'todo',
  preprod: 'b8256741a8a955dc727f29398514a2a32b6e6c0497cf1c3a3fa2deb5',
}

export const NODE_ADA = '2000000'
export const COMMIT_FOLD_FEE_ADA = '2000000'
export const OIL_ADA = '6000000'

// 1000 ADA
export const LAUNCH_COLLATERAL = '1000000000'

export const VESTING_PERIOD_DURATION = 1
export const VESTING_PERIOD_DURATION_TO_FIRST_UNLOCK = 1
export const VESTING_PERIOD_INSTALLMENTS = 1

export const VESTING_VALIDATOR_HASH = getScriptFromExport(
  artifacts.vestingValidator,
).hash

export const WR_FACTORY_VALIDATOR_HASH = {
  mainnet: 'c57b588ebda735d49008d47afde48198ec37062d6ceb758803515013',
  preprod: 'a1640449d34fdfefc56868f0262eda2bebf91b33d1cda381dbfe3e2d',
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

export const SUNDAE_SETTINGS_SYMBOL = {
  mainnet: '6d9d7acac59a4469ec52bb207106167c5cbfa689008ffa6ee92acc50',
  // TODO: I couldn't find the preprod one
  preprod: '6d9d7acac59a4469ec52bb207106167c5cbfa689008ffa6ee92acc50',
}
