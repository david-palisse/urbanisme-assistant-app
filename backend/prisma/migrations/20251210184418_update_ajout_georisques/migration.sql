-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "abfMonumentName" TEXT,
ADD COLUMN     "abfPerimeter" TEXT,
ADD COLUMN     "abfType" TEXT,
ADD COLUMN     "clayRisk" TEXT,
ADD COLUMN     "floodZone" TEXT,
ADD COLUMN     "floodZoneLevel" TEXT,
ADD COLUMN     "floodZoneSource" TEXT,
ADD COLUMN     "isAbfProtected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pluZoneLabel" TEXT,
ADD COLUMN     "seismicZone" TEXT;
