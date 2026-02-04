/*
  Warnings:

  - You are about to drop the column `scriptHash` on the `TxOutput` table. All the data in the column will be lost.
  - You are about to drop the column `scriptSize` on the `TxOutput` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TxOutput" DROP COLUMN "scriptHash",
DROP COLUMN "scriptSize",
ADD COLUMN     "scriptCbor" TEXT,
ADD COLUMN     "scriptLanguage" TEXT;
