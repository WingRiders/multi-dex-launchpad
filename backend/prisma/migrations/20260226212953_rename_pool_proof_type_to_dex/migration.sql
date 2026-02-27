/*
  Warnings:

  - You are about to drop the column `type` on the `PoolProof` table. All the data in the column will be lost.
  - Added the required column `dex` to the `PoolProof` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Dex" AS ENUM ('SUNDAE', 'WR');

-- AlterTable
ALTER TABLE "PoolProof" DROP COLUMN "type",
ADD COLUMN     "dex" "Dex" NOT NULL;

-- DropEnum
DROP TYPE "PoolProofType";
