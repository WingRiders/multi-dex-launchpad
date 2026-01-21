/*
  Warnings:

  - You are about to drop the column `contributionEndTime` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `withdrawalEndTime` on the `Launch` table. All the data in the column will be lost.
  - Added the required column `endTime` to the `Launch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Launch" DROP COLUMN "contributionEndTime",
DROP COLUMN "withdrawalEndTime",
ADD COLUMN     "endTime" BIGINT NOT NULL;
