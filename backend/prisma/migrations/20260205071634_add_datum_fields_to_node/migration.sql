/*
  Warnings:

  - Added the required column `committed` to the `Node` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdTime` to the `Node` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "committed" BIGINT NOT NULL,
ADD COLUMN     "createdTime" BIGINT NOT NULL,
ADD COLUMN     "keyHash" TEXT,
ADD COLUMN     "keyIndex" INTEGER,
ADD COLUMN     "nextHash" TEXT,
ADD COLUMN     "nextIndex" INTEGER;
