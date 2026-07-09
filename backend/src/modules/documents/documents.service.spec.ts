import { Test } from '@nestjs/testing';
import { AuthorizationType, ProjectType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: { project: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = { project: { findUnique: jest.fn() } };

    const moduleRef = await Test.createTestingModule({
      providers: [DocumentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(DocumentsService);
  });

  describe('getCerfaForProject', () => {
    it('returns null when no authorization is required', () => {
      expect(service.getCerfaForProject('NONE', 'POOL')).toBeNull();
    });

    it('returns CERFA 16702 for any DP (13703 is abrogé since 2025)', () => {
      for (const projectType of Object.values(ProjectType)) {
        const cerfa = service.getCerfaForProject('DP', projectType);
        expect(cerfa?.code).toBe('CERFA 16702');
        expect(cerfa?.downloadUrl).toBe(
          'https://www.service-public.gouv.fr/particuliers/vosdroits/R2028',
        );
      }
    });

    it('mentions CERFA 16703 (aménagements/divisions) for a DP on an OTHER project', () => {
      expect(service.getCerfaForProject('DP', 'OTHER')?.description).toContain('16703');
      expect(service.getCerfaForProject('DP', 'POOL')?.description).not.toContain('16703');
    });

    it.each(['POOL', 'EXTENSION', 'SHED', 'FENCE', 'NEW_CONSTRUCTION'] as ProjectType[])(
      'returns CERFA 13406*16 (maison individuelle) for a PC on a %s project',
      (projectType) => {
        const cerfa = service.getCerfaForProject('PC', projectType);
        expect(cerfa?.code).toBe('CERFA 13406*16');
        expect(cerfa?.downloadUrl).toBe(
          'https://www.service-public.gouv.fr/particuliers/vosdroits/R11637',
        );
      },
    );

    it('returns CERFA 13409*16 for a PC on an OTHER project', () => {
      const cerfa = service.getCerfaForProject('PC', 'OTHER');
      expect(cerfa?.code).toBe('CERFA 13409*16');
      expect(cerfa?.downloadUrl).toBe(
        'https://www.service-public.gouv.fr/particuliers/vosdroits/R21378',
      );
    });

    it('returns CERFA 13409*16 for a PA', () => {
      expect(service.getCerfaForProject('PA', 'OTHER')?.code).toBe('CERFA 13409*16');
    });

    it('only uses service-public.gouv.fr download URLs', () => {
      for (const authType of Object.values(AuthorizationType)) {
        for (const projectType of Object.values(ProjectType)) {
          const cerfa = service.getCerfaForProject(authType, projectType);
          if (cerfa) {
            expect(cerfa.downloadUrl).toMatch(/^https:\/\/www\.service-public\.gouv\.fr\//);
          }
        }
      }
    });
  });

  describe('getDefaultDocuments', () => {
    it('only marks DP1 obligatoire in the DP fallback (bordereau CERFA 16702)', () => {
      const docs = service.getDefaultDocuments('DP');
      const mandatory = docs.filter((d) => d.requirement === 'obligatoire');

      expect(mandatory.map((d) => d.code)).toEqual(['DP1']);
      expect(docs.find((d) => d.code === 'DP6')?.requirement).toBe('conditionnel');
      expect(docs.find((d) => d.code === 'DP11')?.requirement).toBe('conditionnel');
    });

    it('marks PCMI1 to PCMI8 obligatoire and the attestations conditionnel in the PC fallback', () => {
      const docs = service.getDefaultDocuments('PC');
      const mandatoryCodes = docs
        .filter((d) => d.requirement === 'obligatoire')
        .map((d) => d.code);

      expect(mandatoryCodes).toEqual([
        'PCMI1',
        'PCMI2',
        'PCMI3',
        'PCMI4',
        'PCMI5',
        'PCMI6',
        'PCMI7',
        'PCMI8',
      ]);
      expect(docs.find((d) => d.code === 'PCMI13')?.requirement).toBe('conditionnel');
      expect(docs.find((d) => d.code === 'PCMI14-1')?.requirement).toBe('conditionnel');
    });

    it('keeps required in sync with requirement', () => {
      for (const authType of Object.values(AuthorizationType)) {
        for (const doc of service.getDefaultDocuments(authType)) {
          expect(doc.required).toBe(doc.requirement === 'obligatoire');
        }
      }
    });
  });

  describe('getProjectDocuments (retrofit of already-analyzed projects)', () => {
    const project = (overrides: Partial<Record<string, unknown>> = {}) => ({
      id: 'project-1',
      userId: 'user-1',
      projectType: 'NEW_CONSTRUCTION',
      analysisResult: {
        authorizationType: 'PC',
        requiredDocuments: [
          {
            code: 'PCMI1',
            name: 'Plan de situation du terrain',
            description: 'Plan',
            required: true,
          },
        ],
      },
      address: {
        seismicZone: '3',
        clayRisk: null,
        floodZone: null,
        floodZoneLevel: null,
        floodZoneSource: null,
      },
      ...overrides,
    });

    it('adds the missing attestations to a result persisted before the rules existed', async () => {
      prisma.project.findUnique.mockResolvedValue(project());

      const response = await service.getProjectDocuments('user-1', 'project-1');

      const codes = response.documents!.map((d) => d.code);
      expect(codes).toContain('PCMI13');
      expect(codes).toContain('PCMI14-1');
      // Legacy document without requirement gets normalized
      const legacy = response.documents!.find((d) => d.code === 'PCMI1');
      expect(legacy?.requirement).toBe('obligatoire');
    });

    it('does not duplicate attestations already present in the stored result', async () => {
      prisma.project.findUnique.mockResolvedValue(
        project({
          analysisResult: {
            authorizationType: 'PC',
            requiredDocuments: [
              {
                code: 'PCMI13',
                name: 'Attestation parasismique',
                description: '',
                required: true,
                requirement: 'obligatoire',
              },
            ],
          },
        }),
      );

      const response = await service.getProjectDocuments('user-1', 'project-1');

      expect(response.documents!.filter((d) => d.code === 'PCMI13')).toHaveLength(1);
    });

    it('returns the correct CERFA for the project type', async () => {
      prisma.project.findUnique.mockResolvedValue(project());

      const response = await service.getProjectDocuments('user-1', 'project-1');

      expect(response.cerfa?.code).toBe('CERFA 13406*16');
    });
  });
});
