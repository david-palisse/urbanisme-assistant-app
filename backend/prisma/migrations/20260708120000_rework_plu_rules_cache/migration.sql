-- Rework the PLU cache: the old plu_zone_cache table was shared by two
-- writers (extracted rules and zone metadata) that clobbered each other, and
-- was never read back. Replaced by plu_rules_cache (rules only, with real
-- metadata columns) plus plu_document_files (OpenAI file reuse). Cache data
-- is disposable, so the old table is dropped without data migration.

-- DropTable
DROP TABLE "plu_zone_cache";

-- AlterTable
ALTER TABLE "analysis_results" ADD COLUMN "metrics" JSONB;

-- CreateTable
CREATE TABLE "plu_rules_cache" (
    "id" TEXT NOT NULL,
    "zoneCode" TEXT NOT NULL,
    "inseeCode" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "sourceUrl" TEXT,
    "documentId" TEXT,
    "documentName" TEXT,
    "documentType" TEXT,
    "documentDate" TEXT,
    "extractionModel" TEXT,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plu_rules_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plu_document_files" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "openaiFileId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plu_document_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plu_rules_cache_documentId_zoneCode_idx" ON "plu_rules_cache"("documentId", "zoneCode");

-- CreateIndex
CREATE UNIQUE INDEX "plu_rules_cache_zoneCode_inseeCode_key" ON "plu_rules_cache"("zoneCode", "inseeCode");

-- CreateIndex
CREATE UNIQUE INDEX "plu_document_files_documentId_key" ON "plu_document_files"("documentId");
