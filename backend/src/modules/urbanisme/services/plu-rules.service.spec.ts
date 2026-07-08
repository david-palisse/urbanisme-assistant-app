import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { PluRulesService, PLU_RULES_SCHEMA_VERSION } from './plu-rules.service';
import { PluZoneService } from './plu-zone.service';

describe('PluRulesService (cache behavior)', () => {
  let service: PluRulesService;
  let prisma: {
    pluRulesCache: { findUnique: jest.Mock; upsert: jest.Mock };
    pluDocumentFile: { findUnique: jest.Mock; upsert: jest.Mock; delete: jest.Mock };
  };
  let pluZoneService: { getAllPluZonesByCoordinates: jest.Mock };

  const freshCacheRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'row-1',
    zoneCode: 'UMe',
    inseeCode: '44109',
    rules: { rules: { height: { max: '9m' } } },
    sourceUrl: 'https://example.org/reglement.pdf',
    documentId: 'doc-1',
    documentName: 'PLUm',
    documentType: 'PLUi',
    documentDate: '2024-01-01',
    extractionModel: 'gpt-4o',
    schemaVersion: PLU_RULES_SCHEMA_VERSION,
    extractedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      pluRulesCache: { findUnique: jest.fn(), upsert: jest.fn() },
      pluDocumentFile: { findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
    };
    pluZoneService = { getAllPluZonesByCoordinates: jest.fn().mockResolvedValue([]) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PluRulesService,
        { provide: HttpService, useValue: { get: jest.fn() } },
        { provide: PrismaService, useValue: prisma },
        // No API key: the service keeps this.openai null and extraction
        // short-circuits, which is what these cache tests want.
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
        { provide: PluZoneService, useValue: pluZoneService },
      ],
    }).compile();

    service = moduleRef.get(PluRulesService);
  });

  it('returns the cached rules without resolving the zone or extracting', async () => {
    prisma.pluRulesCache.findUnique.mockResolvedValue(freshCacheRow());

    const rules = await service.getPluRuleset('44109', 'UMe', 'PLUm', 47.2, -1.55);

    expect(rules).toMatchObject({
      rules: { height: { max: '9m' } },
      _meta: { sourceUrl: 'https://example.org/reglement.pdf', documentId: 'doc-1' },
    });
    expect(prisma.pluRulesCache.findUnique).toHaveBeenCalledWith({
      where: { zoneCode_inseeCode: { zoneCode: 'UMe', inseeCode: '44109' } },
    });
    expect(pluZoneService.getAllPluZonesByCoordinates).not.toHaveBeenCalled();
  });

  it('looks up the cache with the exact (zoneCode, inseeCode) key — no cross-commune leak', async () => {
    // Regression for the old getCachedZone bug that returned the first
    // non-expired row of the whole table regardless of commune.
    prisma.pluRulesCache.findUnique.mockResolvedValue(null);

    await service.getPluRuleset('35238', 'UMe', null, 48.11, -1.68);

    expect(prisma.pluRulesCache.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.pluRulesCache.findUnique).toHaveBeenCalledWith({
      where: { zoneCode_inseeCode: { zoneCode: 'UMe', inseeCode: '35238' } },
    });
  });

  it('ignores an expired cache entry', async () => {
    prisma.pluRulesCache.findUnique.mockResolvedValue(
      freshCacheRow({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await service.getPluRuleset('44109', 'UMe', 'PLUm', 47.2, -1.55);

    expect(pluZoneService.getAllPluZonesByCoordinates).toHaveBeenCalled();
  });

  it('ignores a cache entry produced by an older extraction schema', async () => {
    prisma.pluRulesCache.findUnique.mockResolvedValue(
      freshCacheRow({ schemaVersion: PLU_RULES_SCHEMA_VERSION - 1 }),
    );

    await service.getPluRuleset('44109', 'UMe', 'PLUm', 47.2, -1.55);

    expect(pluZoneService.getAllPluZonesByCoordinates).toHaveBeenCalled();
  });

  it('ignores an empty cached ruleset', async () => {
    prisma.pluRulesCache.findUnique.mockResolvedValue(freshCacheRow({ rules: {} }));

    await service.getPluRuleset('44109', 'UMe', 'PLUm', 47.2, -1.55);

    expect(pluZoneService.getAllPluZonesByCoordinates).toHaveBeenCalled();
  });

  it('returns null without touching the network when the identifiers are missing', async () => {
    expect(await service.getPluRuleset(null, 'UMe', null)).toBeNull();
    expect(await service.getPluRuleset('44109', null, null)).toBeNull();
    expect(prisma.pluRulesCache.findUnique).not.toHaveBeenCalled();
  });

  it('coalesces concurrent extractions for the same zone (single-flight)', async () => {
    prisma.pluRulesCache.findUnique.mockResolvedValue(null);

    let resolveZones!: (zones: unknown[]) => void;
    pluZoneService.getAllPluZonesByCoordinates.mockReturnValue(
      new Promise((resolve) => {
        resolveZones = resolve;
      }),
    );

    const first = service.getPluRuleset('44109', 'UMe', 'PLUm', 47.2, -1.55);
    const second = service.getPluRuleset('44109', 'UMe', 'PLUm', 47.2, -1.55);
    resolveZones([]);

    expect(await Promise.all([first, second])).toEqual([null, null]);
    expect(pluZoneService.getAllPluZonesByCoordinates).toHaveBeenCalledTimes(1);
  });

  it('does not coalesce different zones or communes', async () => {
    prisma.pluRulesCache.findUnique.mockResolvedValue(null);

    await Promise.all([
      service.getPluRuleset('44109', 'UMe', 'PLUm', 47.2, -1.55),
      service.getPluRuleset('44143', 'UMe', 'PLUm', 47.18, -1.55),
      service.getPluRuleset('44109', 'UMd', 'PLUm', 47.21, -1.56),
    ]);

    expect(pluZoneService.getAllPluZonesByCoordinates).toHaveBeenCalledTimes(3);
  });

  it('does not cache a failed extraction', async () => {
    prisma.pluRulesCache.findUnique.mockResolvedValue(null);
    pluZoneService.getAllPluZonesByCoordinates.mockResolvedValue([
      { zoneCode: 'UMe', zoneLabel: 'Zone urbaine mixte', documentId: null },
    ]);
    // No OpenAI key -> extraction returns null.

    const rules = await service.getPluRuleset('44109', 'UMe', 'PLUm', 47.2, -1.55);

    expect(rules).toBeNull();
    expect(prisma.pluRulesCache.upsert).not.toHaveBeenCalled();
  });
});
