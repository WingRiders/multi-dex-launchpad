/*
  Warnings:

  - Added the required column `deadline` to the `RefScriptCarrier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerPubKeyHash` to the `RefScriptCarrier` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RefScriptCarrier" ADD COLUMN     "deadline" BIGINT NOT NULL,
ADD COLUMN     "ownerPubKeyHash" TEXT NOT NULL;
