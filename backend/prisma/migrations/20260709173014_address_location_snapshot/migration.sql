-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "fullLocationInfo" JSONB,
ADD COLUMN     "locationInfoFetchedAt" TIMESTAMP(3),
ADD COLUMN     "parcelInfo" JSONB;
