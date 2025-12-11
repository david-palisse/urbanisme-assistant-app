-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "isInNoiseZone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "noiseAirportCode" TEXT,
ADD COLUMN     "noiseAirportName" TEXT,
ADD COLUMN     "noiseRestrictions" TEXT,
ADD COLUMN     "noiseZone" TEXT;
