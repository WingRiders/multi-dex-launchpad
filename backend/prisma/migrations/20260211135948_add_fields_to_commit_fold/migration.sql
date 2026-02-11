/*
  Warnings:

  - Added the required column `committed` to the `CommitFold` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nodeCount` to the `CommitFold` table without a default value. This is not possible if the table is not empty.
  - Added the required column `overcommitted` to the `CommitFold` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerAddress` to the `CommitFold` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CommitFold" ADD COLUMN     "committed" BIGINT NOT NULL,
ADD COLUMN     "cutoffKeyHash" TEXT,
ADD COLUMN     "cutoffKeyIndex" INTEGER,
ADD COLUMN     "cutoffTime" BIGINT,
ADD COLUMN     "nextKeyHash" TEXT,
ADD COLUMN     "nextKeyIndex" INTEGER,
ADD COLUMN     "nodeCount" INTEGER NOT NULL,
ADD COLUMN     "overcommitted" BIGINT NOT NULL,
ADD COLUMN     "ownerAddress" TEXT NOT NULL;
