/*
  Warnings:

  - You are about to drop the column `projectPresaleTierName` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `projectSocialLinks` on the `Launch` table. All the data in the column will be lost.
  - You are about to drop the column `projectTierInfoUrl` on the `Launch` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Launch" DROP COLUMN "projectPresaleTierName",
DROP COLUMN "projectSocialLinks",
DROP COLUMN "projectTierInfoUrl";
