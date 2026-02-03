/*
  Warnings:

  - You are about to drop the column `rewardsHolderValidatorRefScriptCarrierOutputIndex` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `rewardsHolderValidatorRefScriptCarrierTxHash` on the `Launch` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Launch" DROP CONSTRAINT "Launch_rewardsHolderValidatorRefScriptCarrierTxHash_reward_fkey";

-- DropIndex
DROP INDEX "Launch_rewardsHolderValidatorRefScriptCarrierTxHash_rewards_key";

-- AlterTable
ALTER TABLE "Launch" DROP COLUMN "rewardsHolderValidatorRefScriptCarrierOutputIndex",
DROP COLUMN "rewardsHolderValidatorRefScriptCarrierTxHash";
