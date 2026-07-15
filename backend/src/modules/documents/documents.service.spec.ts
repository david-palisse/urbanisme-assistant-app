import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AuthorizationType, ProjectType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from './documents.service';
import { EntitlementService } from '../billing/entitlement.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: { project: { findUnique: jest.Mock } };
  let entitlement: { isProjectUnlocked: jest.Mock };
  let httpService: { get: jest.Mock };

  beforeEach(async () => {
    prisma = { project: { findUnique: jest.fn() } };
    // Documents are gated behind a paid pack; the tests exercise the
    // checklist logic, so the project is unlocked by default here
    entitlement = { isProjectUnlocked: jest.fn().mockResolvedValue(true) };
    // Annuaire de l'administration: empty by default
    httpService = { get: jest.fn().mockReturnValue(of({ data: { results: [] } })) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EntitlementService, useValue: entitlement },
        { provide: HttpService, useValue: httpService },
      ],
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

  describe('getProjectDocuments (retrofit of already-analyzed projects)', () => {
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

  describe('getMairieContact', () => {
    const annuaireRecord = (overrides: Partial<Record<string, unknown>> = {}) => ({
      nom: 'Mairie - Le Bignon',
      adresse: JSON.stringify([
        {
          type_adresse: 'Adresse',
          complement1: '',
          complement2: '',
          numero_voie: '11 rue du Moulin',
          service_distribution: '',
          code_postal: '44140',
          nom_commune: 'Le Bignon',
        },
      ]),
      telephone: JSON.stringify([{ valeur: '02 40 78 12 12', description: '' }]),
      site_internet: JSON.stringify([{ libelle: '', valeur: 'https://www.mairielebignon.fr' }]),
      adresse_courriel: 'accueil@mairielebignon.fr',
      url_service_public:
        'https://lannuaire.service-public.gouv.fr/pays-de-la-loire/loire-atlantique/0204c0d5',
      ...overrides,
    });

    it('parses the annuaire record into a contact', async () => {
      httpService.get.mockReturnValue(
        of({ data: { results: [annuaireRecord()] } }),
      );

      const contact = await service.getMairieContact('44014');

      expect(contact).toEqual({
        name: 'Mairie - Le Bignon',
        addressLines: ['11 rue du Moulin'],
        postalCode: '44140',
        city: 'Le Bignon',
        phone: '02 40 78 12 12',
        email: 'accueil@mairielebignon.fr',
        website: 'https://www.mairielebignon.fr',
        annuaireUrl:
          'https://lannuaire.service-public.gouv.fr/pays-de-la-loire/loire-atlantique/0204c0d5',
      });
    });

    it('prefers the main town hall over a mairie déléguée', async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            results: [
              annuaireRecord({ nom: 'Mairie déléguée de Saint-Machin' }),
              annuaireRecord({ nom: 'Mairie - Grande Ville' }),
            ],
          },
        }),
      );

      const contact = await service.getMairieContact('44000');

      expect(contact?.name).toBe('Mairie - Grande Ville');
    });

    it('returns null when the commune is not found', async () => {
      expect(await service.getMairieContact('99999')).toBeNull();
    });

    it('returns null when the annuaire API fails', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('network error')),
      );

      expect(await service.getMairieContact('44014')).toBeNull();
    });

    it('is included in getProjectDocuments when the address has an INSEE code', async () => {
      prisma.project.findUnique.mockResolvedValue(
        project({
          address: {
            inseeCode: '44014',
            seismicZone: null,
            clayRisk: null,
            floodZone: null,
            floodZoneLevel: null,
            floodZoneSource: null,
          },
        }),
      );
      httpService.get.mockReturnValue(
        of({ data: { results: [annuaireRecord()] } }),
      );

      const response = await service.getProjectDocuments('user-1', 'project-1');

      expect(response.mairieContact?.name).toBe('Mairie - Le Bignon');
    });

    it('stays null in getProjectDocuments when the address has no INSEE code', async () => {
      prisma.project.findUnique.mockResolvedValue(project());

      const response = await service.getProjectDocuments('user-1', 'project-1');

      expect(response.mairieContact).toBeNull();
      expect(httpService.get).not.toHaveBeenCalled();
    });
  });
});
