-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "loyaltyRedemptions" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "loyaltyThreshold" INTEGER NOT NULL DEFAULT 10;
