-- CreateTable
CREATE TABLE "TxOutput" (
    "txHash" TEXT NOT NULL,
    "outputIndex" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "datum" TEXT,
    "datumHash" TEXT,
    "value" JSONB NOT NULL,
    "slot" INTEGER NOT NULL,
    "spentTxHash" TEXT,
    "spentSlot" INTEGER,

    CONSTRAINT "TxOutput_pkey" PRIMARY KEY ("txHash","outputIndex")
);

-- CreateTable
CREATE TABLE "Node" (
    "txHash" TEXT NOT NULL,
    "outputIndex" INTEGER NOT NULL,
    "launchTxHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RewardsHolder" (
    "txHash" TEXT NOT NULL,
    "outputIndex" INTEGER NOT NULL,
    "launchTxHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Launch" (
    "txHash" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "projectDescription" TEXT NOT NULL,
    "projectUrl" TEXT NOT NULL,
    "projectLogoUrl" TEXT NOT NULL,
    "projectTierInfoUrl" TEXT,
    "projectTokenomicsUrl" TEXT NOT NULL,
    "projectWhitepaperUrl" TEXT,
    "projectTermsAndConditionsUrl" TEXT,
    "projectAdditionalUrl" TEXT,
    "projectSocialLinks" TEXT[],
    "projectPresaleTierName" TEXT,
    "nodeValidatorRefScriptCarrierTxHash" TEXT,
    "nodeValidatorRefScriptCarrierOutputIndex" INTEGER,
    "nodePolicyRefScriptCarrierTxHash" TEXT,
    "nodePolicyRefScriptCarrierOutputIndex" INTEGER,
    "firstProjectTokensHolderValidatorRefScriptCarrierTxHash" TEXT,
    "firstProjectTokensHolderValidatorRefScriptCarrierOutputIndex" INTEGER,
    "projectTokensHolderPolicyRefScriptCarrierTxHash" TEXT,
    "projectTokensHolderPolicyRefScriptCarrierOutputIndex" INTEGER,
    "finalProjectTokensHolderValidatorRefScriptCarrierTxHash" TEXT,
    "finalProjectTokensHolderValidatorRefScriptCarrierOutputIndex" INTEGER,
    "commitFoldValidatorRefScriptCarrierTxHash" TEXT,
    "commitFoldValidatorRefScriptCarrierOutputIndex" INTEGER,
    "commitFoldPolicyRefScriptCarrierTxHash" TEXT,
    "commitFoldPolicyRefScriptCarrierOutputIndex" INTEGER,
    "rewardsFoldValidatorRefScriptCarrierTxHash" TEXT,
    "rewardsFoldValidatorRefScriptCarrierOutputIndex" INTEGER,
    "rewardsFoldPolicyRefScriptCarrierTxHash" TEXT,
    "rewardsFoldPolicyRefScriptCarrierOutputIndex" INTEGER,
    "rewardsHolderValidatorRefScriptCarrierTxHash" TEXT,
    "rewardsHolderValidatorRefScriptCarrierOutputIndex" INTEGER,
    "failProofTxHash" TEXT,
    "failProofOutputIndex" INTEGER,
    "firstProjectTokensHolderTxHash" TEXT,
    "firstProjectTokensHolderOutputIndex" INTEGER,
    "finalProjectTokensHolderTxHash" TEXT,
    "finalProjectTokensHolderOutputIndex" INTEGER,
    "commitFoldTxHash" TEXT,
    "commitFoldOutputIndex" INTEGER,
    "rewardsFoldTxHash" TEXT,
    "rewardsFoldOutputIndex" INTEGER,
    "wrPoolTxHash" TEXT,
    "wrPoolOutputIndex" INTEGER,
    "wrPoolProofTxHash" TEXT,
    "wrPoolProofOutputIndex" INTEGER,
    "sundaePoolTxHash" TEXT,
    "sundaePoolOutputIndex" INTEGER,
    "sundaePoolProofTxHash" TEXT,
    "sundaePoolProofOutputIndex" INTEGER,
    "ownerBech32Address" TEXT NOT NULL,
    "splitBps" INTEGER NOT NULL,
    "wrPoolValidatorHash" TEXT NOT NULL,
    "wrFactoryValidatorHash" TEXT NOT NULL,
    "wrPoolCurrencySymbol" TEXT NOT NULL,
    "sundaePoolScriptHash" TEXT NOT NULL,
    "sundaeFeeTolerance" BIGINT NOT NULL,
    "sundaeSettingsCurrencySymbol" TEXT NOT NULL,
    "startTime" BIGINT NOT NULL,
    "contributionEndTime" BIGINT NOT NULL,
    "withdrawalEndTime" BIGINT NOT NULL,
    "projectTokenPolicyId" TEXT NOT NULL,
    "projectTokenAssetName" TEXT NOT NULL,
    "raisingTokenPolicyId" TEXT NOT NULL,
    "raisingTokenAssetName" TEXT NOT NULL,
    "projectMinCommitment" BIGINT NOT NULL,
    "projectMaxCommitment" BIGINT NOT NULL,
    "totalTokens" BIGINT NOT NULL,
    "tokensToDistribute" BIGINT NOT NULL,
    "raisedTokensPoolPartPercentage" INTEGER NOT NULL,
    "daoFeeNumerator" INTEGER NOT NULL,
    "daoFeeDenominator" INTEGER NOT NULL,
    "daoFeeReceiverBech32Address" TEXT NOT NULL,
    "daoAdminPubKeyHash" TEXT NOT NULL,
    "collateral" INTEGER NOT NULL,
    "starterTxHash" TEXT NOT NULL,
    "starterOutputIndex" BIGINT NOT NULL,
    "vestingPeriodDuration" BIGINT NOT NULL,
    "vestingPeriodDurationToFirstUnlock" BIGINT NOT NULL,
    "vestingPeriodInstallments" INTEGER NOT NULL,
    "vestingPeriodStart" BIGINT NOT NULL,
    "vestingValidatorHash" TEXT NOT NULL,
    "presaleTierCs" TEXT NOT NULL,
    "presaleTierStartTime" BIGINT NOT NULL,
    "defaultStartTime" BIGINT NOT NULL,
    "presaleTierMinCommitment" BIGINT NOT NULL,
    "defaultTierMinCommitment" BIGINT NOT NULL,
    "presaleTierMaxCommitment" BIGINT NOT NULL,
    "defaultTierMaxCommitment" BIGINT NOT NULL,
    "nodeAda" BIGINT NOT NULL,
    "commitFoldFeeAda" BIGINT NOT NULL,
    "oilAda" BIGINT NOT NULL,

    CONSTRAINT "Launch_pkey" PRIMARY KEY ("txHash")
);

-- CreateIndex
CREATE UNIQUE INDEX "Node_txHash_outputIndex_launchTxHash_key" ON "Node"("txHash", "outputIndex", "launchTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "RewardsHolder_txHash_outputIndex_launchTxHash_key" ON "RewardsHolder"("txHash", "outputIndex", "launchTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_nodeValidatorRefScriptCarrierTxHash_nodeValidatorRef_key" ON "Launch"("nodeValidatorRefScriptCarrierTxHash", "nodeValidatorRefScriptCarrierOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_nodePolicyRefScriptCarrierTxHash_nodePolicyRefScript_key" ON "Launch"("nodePolicyRefScriptCarrierTxHash", "nodePolicyRefScriptCarrierOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_firstProjectTokensHolderValidatorRefScriptCarrierTxH_key" ON "Launch"("firstProjectTokensHolderValidatorRefScriptCarrierTxHash", "firstProjectTokensHolderValidatorRefScriptCarrierOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_projectTokensHolderPolicyRefScriptCarrierTxHash_proj_key" ON "Launch"("projectTokensHolderPolicyRefScriptCarrierTxHash", "projectTokensHolderPolicyRefScriptCarrierOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_finalProjectTokensHolderValidatorRefScriptCarrierTxH_key" ON "Launch"("finalProjectTokensHolderValidatorRefScriptCarrierTxHash", "finalProjectTokensHolderValidatorRefScriptCarrierOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_commitFoldValidatorRefScriptCarrierTxHash_commitFold_key" ON "Launch"("commitFoldValidatorRefScriptCarrierTxHash", "commitFoldValidatorRefScriptCarrierOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_commitFoldPolicyRefScriptCarrierTxHash_commitFoldPol_key" ON "Launch"("commitFoldPolicyRefScriptCarrierTxHash", "commitFoldPolicyRefScriptCarrierOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_rewardsFoldValidatorRefScriptCarrierTxHash_rewardsFo_key" ON "Launch"("rewardsFoldValidatorRefScriptCarrierTxHash", "rewardsFoldValidatorRefScriptCarrierOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_rewardsFoldPolicyRefScriptCarrierTxHash_rewardsFoldP_key" ON "Launch"("rewardsFoldPolicyRefScriptCarrierTxHash", "rewardsFoldPolicyRefScriptCarrierOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_rewardsHolderValidatorRefScriptCarrierTxHash_rewards_key" ON "Launch"("rewardsHolderValidatorRefScriptCarrierTxHash", "rewardsHolderValidatorRefScriptCarrierOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_failProofTxHash_failProofOutputIndex_key" ON "Launch"("failProofTxHash", "failProofOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_firstProjectTokensHolderTxHash_firstProjectTokensHol_key" ON "Launch"("firstProjectTokensHolderTxHash", "firstProjectTokensHolderOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_finalProjectTokensHolderTxHash_finalProjectTokensHol_key" ON "Launch"("finalProjectTokensHolderTxHash", "finalProjectTokensHolderOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_commitFoldTxHash_commitFoldOutputIndex_key" ON "Launch"("commitFoldTxHash", "commitFoldOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_rewardsFoldTxHash_rewardsFoldOutputIndex_key" ON "Launch"("rewardsFoldTxHash", "rewardsFoldOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_wrPoolTxHash_wrPoolOutputIndex_key" ON "Launch"("wrPoolTxHash", "wrPoolOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_wrPoolProofTxHash_wrPoolProofOutputIndex_key" ON "Launch"("wrPoolProofTxHash", "wrPoolProofOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_sundaePoolTxHash_sundaePoolOutputIndex_key" ON "Launch"("sundaePoolTxHash", "sundaePoolOutputIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Launch_sundaePoolProofTxHash_sundaePoolProofOutputIndex_key" ON "Launch"("sundaePoolProofTxHash", "sundaePoolProofOutputIndex");

-- AddForeignKey
ALTER TABLE "TxOutput" ADD CONSTRAINT "TxOutput_slot_fkey" FOREIGN KEY ("slot") REFERENCES "Block"("slot") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TxOutput" ADD CONSTRAINT "TxOutput_spentSlot_fkey" FOREIGN KEY ("spentSlot") REFERENCES "Block"("slot") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_txHash_outputIndex_fkey" FOREIGN KEY ("txHash", "outputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_launchTxHash_fkey" FOREIGN KEY ("launchTxHash") REFERENCES "Launch"("txHash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardsHolder" ADD CONSTRAINT "RewardsHolder_txHash_outputIndex_fkey" FOREIGN KEY ("txHash", "outputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardsHolder" ADD CONSTRAINT "RewardsHolder_launchTxHash_fkey" FOREIGN KEY ("launchTxHash") REFERENCES "Launch"("txHash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_slot_fkey" FOREIGN KEY ("slot") REFERENCES "Block"("slot") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_nodeValidatorRefScriptCarrierTxHash_nodeValidatorRe_fkey" FOREIGN KEY ("nodeValidatorRefScriptCarrierTxHash", "nodeValidatorRefScriptCarrierOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_nodePolicyRefScriptCarrierTxHash_nodePolicyRefScrip_fkey" FOREIGN KEY ("nodePolicyRefScriptCarrierTxHash", "nodePolicyRefScriptCarrierOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_firstProjectTokensHolderValidatorRefScriptCarrierTx_fkey" FOREIGN KEY ("firstProjectTokensHolderValidatorRefScriptCarrierTxHash", "firstProjectTokensHolderValidatorRefScriptCarrierOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_projectTokensHolderPolicyRefScriptCarrierTxHash_pro_fkey" FOREIGN KEY ("projectTokensHolderPolicyRefScriptCarrierTxHash", "projectTokensHolderPolicyRefScriptCarrierOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_finalProjectTokensHolderValidatorRefScriptCarrierTx_fkey" FOREIGN KEY ("finalProjectTokensHolderValidatorRefScriptCarrierTxHash", "finalProjectTokensHolderValidatorRefScriptCarrierOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_commitFoldValidatorRefScriptCarrierTxHash_commitFol_fkey" FOREIGN KEY ("commitFoldValidatorRefScriptCarrierTxHash", "commitFoldValidatorRefScriptCarrierOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_commitFoldPolicyRefScriptCarrierTxHash_commitFoldPo_fkey" FOREIGN KEY ("commitFoldPolicyRefScriptCarrierTxHash", "commitFoldPolicyRefScriptCarrierOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_rewardsFoldValidatorRefScriptCarrierTxHash_rewardsF_fkey" FOREIGN KEY ("rewardsFoldValidatorRefScriptCarrierTxHash", "rewardsFoldValidatorRefScriptCarrierOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_rewardsFoldPolicyRefScriptCarrierTxHash_rewardsFold_fkey" FOREIGN KEY ("rewardsFoldPolicyRefScriptCarrierTxHash", "rewardsFoldPolicyRefScriptCarrierOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_rewardsHolderValidatorRefScriptCarrierTxHash_reward_fkey" FOREIGN KEY ("rewardsHolderValidatorRefScriptCarrierTxHash", "rewardsHolderValidatorRefScriptCarrierOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_failProofTxHash_failProofOutputIndex_fkey" FOREIGN KEY ("failProofTxHash", "failProofOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_firstProjectTokensHolderTxHash_firstProjectTokensHo_fkey" FOREIGN KEY ("firstProjectTokensHolderTxHash", "firstProjectTokensHolderOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_finalProjectTokensHolderTxHash_finalProjectTokensHo_fkey" FOREIGN KEY ("finalProjectTokensHolderTxHash", "finalProjectTokensHolderOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_commitFoldTxHash_commitFoldOutputIndex_fkey" FOREIGN KEY ("commitFoldTxHash", "commitFoldOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_rewardsFoldTxHash_rewardsFoldOutputIndex_fkey" FOREIGN KEY ("rewardsFoldTxHash", "rewardsFoldOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_wrPoolTxHash_wrPoolOutputIndex_fkey" FOREIGN KEY ("wrPoolTxHash", "wrPoolOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_wrPoolProofTxHash_wrPoolProofOutputIndex_fkey" FOREIGN KEY ("wrPoolProofTxHash", "wrPoolProofOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_sundaePoolTxHash_sundaePoolOutputIndex_fkey" FOREIGN KEY ("sundaePoolTxHash", "sundaePoolOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_sundaePoolProofTxHash_sundaePoolProofOutputIndex_fkey" FOREIGN KEY ("sundaePoolProofTxHash", "sundaePoolProofOutputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE SET NULL ON UPDATE CASCADE;


-- For TxOutput:
-- Clear out the spentTxHash if the spentSlot is set to null
-- That's not tracked by Prisma
-- We need that to make sure the rollbacks are always handled correctly
CREATE OR REPLACE FUNCTION txoutput__clear_spenttxhash_when_spentslot_null()
RETURNS trigger AS $$
BEGIN
  IF NEW."spentSlot" IS NULL THEN
    NEW."spentTxHash" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER txoutput__trigger_clear_spenttxhash_when_spentslot_null
BEFORE UPDATE OF "spentSlot"
ON "TxOutput"
FOR EACH ROW
EXECUTE FUNCTION txoutput__clear_spenttxhash_when_spentslot_null();
