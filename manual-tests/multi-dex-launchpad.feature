Feature: MultiDexLaunchpad

  Scenario: Launch creation
    Given Wallet is connected
    * User has enough funds (at least 1501 ADA)
    When User clicks "Create a new launch"
    * Fills out required details (Launch title, Description, Link to detailed information, Tokenomics link, Marketing image)
    * Adds additional details if available
    * Clicks "Next"
    * Selects asset
    * Sets quantity
    * Clicks "Next"
    * Chooses token to be raised + min and max to raise
    * Chooses percentage for liquidity pool raise with slider
    * Chooses number of tokens for tokens committed to liquidity pool
    * Chooses liquidity distribution or disables one of the DEX pools
    * Clicks "Next"
    * Adds Min contribution and date
    * Adds presale tiers if desired
    * Chooses Contribution end date
    * Clicks "Next"
    * Checks Overview details
    * Clicks "Create token launch"
    * Modal with details is shown
    * Clicks "Create" Launchpad initialization
    * Signs transaction in wallet 
    * Transaction submitted modal pops up
    Then User is redirected to overview of the project
    * Details are correct
    * Cancel button is visible on the bottom of the launchpad overview
    * Project is visible in Upcoming Launches directory
    * Project is visible in My Launches

  Scenario: Launch cancel
    Given Wallet is connected
    * Launch is created and visible
    * Launch has not started yet
    * Cancel launch button is visible on the bottom of the launchpad overview
    When User clicks on Cancel launch button
    * Cancel launch window pops up
    * Clicks "Cancel launch"
    * Transaction in wallet pops up
    * Signs transaction
    Then Launch cancellation submitted window pops up
    * "Cancelled" label is shown near the launchpad title (in both launchpad list and launchpad detail page)  
    * Cancel button is not visible 

  Scenario: Launch contribution
    Given Wallet is connected
    * Launch is created and visible
    * Launch has started
    When User makes a contribution
    * Signs transaction in the wallet
    Then transaction submitted window pops up
    * User can view transaction on explorer
    * Contribution is shown in your contributions details

  Scenario: Launch contribution withdrawal
    Given Wallet is connected
    * User has contributed to the launch
    When User chooses to withdraw contribution
    * Signs transaction in the wallet
    Then transaction submitted window pops up
    * User can view transaction on explorer
    * Contribution is shown as claimed in your contributions details

  Scenario: Reclaim failed launch contributions
    Given Wallet is connected
    * User has contributed to the launch
    * Launch has failed to meet the minimum value to raise
    When User chooses to reclaim contribution
    * Signs transaction in the wallet
    Then transaction submitted window pops up
    * User can view transaction on explorer
    * Contribution is shown as reclaimed in your contributions details

  Scenario: Claim successful launch rewards
    Given Wallet is connected
    * User has contributed to the launch
    * Launch met the minimum value to raise
    When User chooses to claim rewards
    * Signs transaction in the wallet
    Then transaction submitted window pops up
    * User can view transaction on explorer
    * Contribution is shown as claimed in your contributions details

  Scenario: Contributing to a launch during presale
    Given Wallet is connected
    * Launch is created with presale option
    * Presale has started
    * User has presale token in his wallet
    When User makes a contribution
    * Signs transaction in the wallet
    Then transaction submitted window pops up
    * User can view transaction on explorer
    * Contribution is shown in your contributions details