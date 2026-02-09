-- Drop the db
DELETE FROM "Block";

/*
  Warnings:

  - You are about to drop the column `commitFoldOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `commitFoldPolicyRefScriptCarrierOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `commitFoldPolicyRefScriptCarrierTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `commitFoldTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `commitFoldValidatorRefScriptCarrierOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `commitFoldValidatorRefScriptCarrierTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `failProofOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `failProofTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `finalProjectTokensHolderOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `finalProjectTokensHolderTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `finalProjectTokensHolderValidatorRefScriptCarrierOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `finalProjectTokensHolderValidatorRefScriptCarrierTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `firstProjectTokensHolderOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `firstProjectTokensHolderTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `firstProjectTokensHolderValidatorRefScriptCarrierOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `firstProjectTokensHolderValidatorRefScriptCarrierTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `nodePolicyRefScriptCarrierOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `nodePolicyRefScriptCarrierTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `nodeValidatorRefScriptCarrierOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `nodeValidatorRefScriptCarrierTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `projectTokensHolderPolicyRefScriptCarrierOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `projectTokensHolderPolicyRefScriptCarrierTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `rewardsFoldOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `rewardsFoldPolicyRefScriptCarrierOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `rewardsFoldPolicyRefScriptCarrierTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `rewardsFoldTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `rewardsFoldValidatorRefScriptCarrierOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `rewardsFoldValidatorRefScriptCarrierTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `sundaePoolOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `sundaePoolProofOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `sundaePoolProofTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `sundaePoolTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `wrPoolOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `wrPoolProofOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `wrPoolProofTxHash` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `wrPoolTxHash` on the `Launch` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PoolProofType" AS ENUM ('SUNDAE', 'WR');

-- CreateEnum
CREATE TYPE "RefScriptCarrierType" AS ENUM ('NODE_VALIDATOR', 'NODE_POLICY', 'FIRST_PROJECT_TOKENS_HOLDER_VALIDATOR', 'PROJECT_TOKENS_HOLDER_POLICY', 'FINAL_PROJECT_TOKENS_HOLDER_VALIDATOR', 'COMMIT_FOLD_VALIDATOR', 'COMMIT_FOLD_POLICY', 'REWARDS_FOLD_VALIDATOR', 'REWARDS_FOLD_POLICY');

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_commitFoldPolicyRefScriptCarrierTxHash_commitFoldPo_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_commitFoldTxHash_commitFoldOutputIndex_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_commitFoldValidatorRefScriptCarrierTxHash_commitFol_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_failProofTxHash_failProofOutputIndex_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_finalProjectTokensHolderTxHash_finalProjectTokensHo_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_finalProjectTokensHolderValidatorRefScriptCarrierTx_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_firstProjectTokensHolderTxHash_firstProjectTokensHo_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_firstProjectTokensHolderValidatorRefScriptCarrierTx_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_nodePolicyRefScriptCarrierTxHash_nodePolicyRefScrip_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_nodeValidatorRefScriptCarrierTxHash_nodeValidatorRe_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_projectTokensHolderPolicyRefScriptCarrierTxHash_pro_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_rewardsFoldPolicyRefScriptCarrierTxHash_rewardsFold_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_rewardsFoldTxHash_rewardsFoldOutputIndex_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_rewardsFoldValidatorRefScriptCarrierTxHash_rewardsF_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_sundaePoolProofTxHash_sundaePoolProofOutputIndex_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_sundaePoolTxHash_sundaePoolOutputIndex_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_wrPoolProofTxHash_wrPoolProofOutputIndex_fkey";

-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_wrPoolTxHash_wrPoolOutputIndex_fkey";

-- DropIndex
DROP INDEX "Launch_commitFoldPolicyRefScriptCarrierTxHash_commitFoldPol_key";

-- DropIndex
DROP INDEX "Launch_commitFoldTxHash_commitFoldOutputIndex_key";

-- DropIndex
DROP INDEX "Launch_commitFoldValidatorRefScriptCarrierTxHash_commitFold_key";

-- DropIndex
DROP INDEX "Launch_failProofTxHash_failProofOutputIndex_key";

-- DropIndex
DROP INDEX "Launch_finalProjectTokensHolderTxHash_finalProjectTokensHol_key";

-- DropIndex
DROP INDEX "Launch_finalProjectTokensHolderValidatorRefScriptCarrierTxH_key";

-- DropIndex
DROP INDEX "Launch_firstProjectTokensHolderTxHash_firstProjectTokensHol_key";

-- DropIndex
DROP INDEX "Launch_firstProjectTokensHolderValidatorRefScriptCarrierTxH_key";

-- DropIndex
DROP INDEX "Launch_nodePolicyRefScriptCarrierTxHash_nodePolicyRefScript_key";

-- DropIndex
DROP INDEX "Launch_nodeValidatorRefScriptCarrierTxHash_nodeValidatorRef_key";

-- DropIndex
DROP INDEX "Launch_projectTokensHolderPolicyRefScriptCarrierTxHash_proj_key";

-- DropIndex
DROP INDEX "Launch_rewardsFoldPolicyRefScriptCarrierTxHash_rewardsFoldP_key";

-- DropIndex
DROP INDEX "Launch_rewardsFoldTxHash_rewardsFoldOutputIndex_key";

-- DropIndex
DROP INDEX "Launch_rewardsFoldValidatorRefScriptCarrierTxHash_rewardsFo_key";

-- DropIndex
DROP INDEX "Launch_sundaePoolProofTxHash_sundaePoolProofOutputIndex_key";

-- DropIndex
DROP INDEX "Launch_sundaePoolTxHash_sundaePoolOutputIndex_key";

-- DropIndex
DROP INDEX "Launch_wrPoolProofTxHash_wrPoolProofOutputIndex_key";

-- DropIndex
DROP INDEX "Launch_wrPoolTxHash_wrPoolOutputIndex_key";

-- AlterTable
ALTER TABLE "Launch" DROP COLUMN "commitFoldOutputIndex",
DROP COLUMN "commitFoldPolicyRefScriptCarrierOutputIndex",
DROP COLUMN "commitFoldPolicyRefScriptCarrierTxHash",
DROP COLUMN "commitFoldTxHash",
DROP COLUMN "commitFoldValidatorRefScriptCarrierOutputIndex",
DROP COLUMN "commitFoldValidatorRefScriptCarrierTxHash",
DROP COLUMN "failProofOutputIndex",
DROP COLUMN "failProofTxHash",
DROP COLUMN "finalProjectTokensHolderOutputIndex",
DROP COLUMN "finalProjectTokensHolderTxHash",
DROP COLUMN "finalProjectTokensHolderValidatorRefScriptCarrierOutputIndex",
DROP COLUMN "finalProjectTokensHolderValidatorRefScriptCarrierTxHash",
DROP COLUMN "firstProjectTokensHolderOutputIndex",
DROP COLUMN "firstProjectTokensHolderTxHash",
DROP COLUMN "firstProjectTokensHolderValidatorRefScriptCarrierOutputIndex",
DROP COLUMN "firstProjectTokensHolderValidatorRefScriptCarrierTxHash",
DROP COLUMN "nodePolicyRefScriptCarrierOutputIndex",
DROP COLUMN "nodePolicyRefScriptCarrierTxHash",
DROP COLUMN "nodeValidatorRefScriptCarrierOutputIndex",
DROP COLUMN "nodeValidatorRefScriptCarrierTxHash",
DROP COLUMN "projectTokensHolderPolicyRefScriptCarrierOutputIndex",
DROP COLUMN "projectTokensHolderPolicyRefScriptCarrierTxHash",
DROP COLUMN "rewardsFoldOutputIndex",
DROP COLUMN "rewardsFoldPolicyRefScriptCarrierOutputIndex",
DROP COLUMN "rewardsFoldPolicyRefScriptCarrierTxHash",
DROP COLUMN "rewardsFoldTxHash",
DROP COLUMN "rewardsFoldValidatorRefScriptCarrierOutputIndex",
DROP COLUMN "rewardsFoldValidatorRefScriptCarrierTxHash",
DROP COLUMN "sundaePoolOutputIndex",
DROP COLUMN "sundaePoolProofOutputIndex",
DROP COLUMN "sundaePoolProofTxHash",
DROP COLUMN "sundaePoolTxHash",
DROP COLUMN "wrPoolOutputIndex",
DROP COLUMN "wrPoolProofOutputIndex",
DROP COLUMN "wrPoolProofTxHash",
DROP COLUMN "wrPoolTxHash";

-- CreateTable
CREATE TABLE "FailProof" (
    "txHash" TEXT NOT NULL,
    "outputIndex" INTEGER NOT NULL,
    "launchTxHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "FirstProjectTokensHolder" (
    "txHash" TEXT NOT NULL,
    "outputIndex" INTEGER NOT NULL,
    "launchTxHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "FinalProjectTokensHolder" (
    "txHash" TEXT NOT NULL,
    "outputIndex" INTEGER NOT NULL,
    "launchTxHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CommitFold" (
    "txHash" TEXT NOT NULL,
    "outputIndex" INTEGER NOT NULL,
    "launchTxHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RewardsFold" (
    "txHash" TEXT NOT NULL,
    "outputIndex" INTEGER NOT NULL,
    "launchTxHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PoolProof" (
    "txHash" TEXT NOT NULL,
    "outputIndex" INTEGER NOT NULL,
    "launchTxHash" TEXT NOT NULL,
    "type" "PoolProofType" NOT NULL
);

-- CreateTable
CREATE TABLE "WrPool" (
    "txHash" TEXT NOT NULL,
    "outputIndex" INTEGER NOT NULL,
    "launchTxHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SundaePool" (
    "txHash" TEXT NOT NULL,
    "outputIndex" INTEGER NOT NULL,
    "launchTxHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RefScriptCarrier" (
    "txHash" TEXT NOT NULL,
    "outputIndex" INTEGER NOT NULL,
    "launchTxHash" TEXT NOT NULL,
    "type" "RefScriptCarrierType" NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "FailProof_txHash_outputIndex_launchTxHash_key" ON "FailProof"("txHash", "outputIndex", "launchTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "FirstProjectTokensHolder_txHash_outputIndex_launchTxHash_key" ON "FirstProjectTokensHolder"("txHash", "outputIndex", "launchTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "FinalProjectTokensHolder_txHash_outputIndex_launchTxHash_key" ON "FinalProjectTokensHolder"("txHash", "outputIndex", "launchTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "CommitFold_txHash_outputIndex_launchTxHash_key" ON "CommitFold"("txHash", "outputIndex", "launchTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "RewardsFold_txHash_outputIndex_launchTxHash_key" ON "RewardsFold"("txHash", "outputIndex", "launchTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "PoolProof_txHash_outputIndex_launchTxHash_key" ON "PoolProof"("txHash", "outputIndex", "launchTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "WrPool_txHash_outputIndex_launchTxHash_key" ON "WrPool"("txHash", "outputIndex", "launchTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "SundaePool_txHash_outputIndex_launchTxHash_key" ON "SundaePool"("txHash", "outputIndex", "launchTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "RefScriptCarrier_txHash_outputIndex_launchTxHash_key" ON "RefScriptCarrier"("txHash", "outputIndex", "launchTxHash");

-- AddForeignKey
ALTER TABLE "FailProof" ADD CONSTRAINT "FailProof_txHash_outputIndex_fkey" FOREIGN KEY ("txHash", "outputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FailProof" ADD CONSTRAINT "FailProof_launchTxHash_fkey" FOREIGN KEY ("launchTxHash") REFERENCES "Launch"("txHash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstProjectTokensHolder" ADD CONSTRAINT "FirstProjectTokensHolder_txHash_outputIndex_fkey" FOREIGN KEY ("txHash", "outputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstProjectTokensHolder" ADD CONSTRAINT "FirstProjectTokensHolder_launchTxHash_fkey" FOREIGN KEY ("launchTxHash") REFERENCES "Launch"("txHash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalProjectTokensHolder" ADD CONSTRAINT "FinalProjectTokensHolder_txHash_outputIndex_fkey" FOREIGN KEY ("txHash", "outputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalProjectTokensHolder" ADD CONSTRAINT "FinalProjectTokensHolder_launchTxHash_fkey" FOREIGN KEY ("launchTxHash") REFERENCES "Launch"("txHash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitFold" ADD CONSTRAINT "CommitFold_txHash_outputIndex_fkey" FOREIGN KEY ("txHash", "outputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitFold" ADD CONSTRAINT "CommitFold_launchTxHash_fkey" FOREIGN KEY ("launchTxHash") REFERENCES "Launch"("txHash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardsFold" ADD CONSTRAINT "RewardsFold_txHash_outputIndex_fkey" FOREIGN KEY ("txHash", "outputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardsFold" ADD CONSTRAINT "RewardsFold_launchTxHash_fkey" FOREIGN KEY ("launchTxHash") REFERENCES "Launch"("txHash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolProof" ADD CONSTRAINT "PoolProof_txHash_outputIndex_fkey" FOREIGN KEY ("txHash", "outputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolProof" ADD CONSTRAINT "PoolProof_launchTxHash_fkey" FOREIGN KEY ("launchTxHash") REFERENCES "Launch"("txHash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrPool" ADD CONSTRAINT "WrPool_txHash_outputIndex_fkey" FOREIGN KEY ("txHash", "outputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrPool" ADD CONSTRAINT "WrPool_launchTxHash_fkey" FOREIGN KEY ("launchTxHash") REFERENCES "Launch"("txHash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SundaePool" ADD CONSTRAINT "SundaePool_txHash_outputIndex_fkey" FOREIGN KEY ("txHash", "outputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SundaePool" ADD CONSTRAINT "SundaePool_launchTxHash_fkey" FOREIGN KEY ("launchTxHash") REFERENCES "Launch"("txHash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefScriptCarrier" ADD CONSTRAINT "RefScriptCarrier_txHash_outputIndex_fkey" FOREIGN KEY ("txHash", "outputIndex") REFERENCES "TxOutput"("txHash", "outputIndex") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefScriptCarrier" ADD CONSTRAINT "RefScriptCarrier_launchTxHash_fkey" FOREIGN KEY ("launchTxHash") REFERENCES "Launch"("txHash") ON DELETE CASCADE ON UPDATE CASCADE;
