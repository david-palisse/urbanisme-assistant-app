import { of, throwError } from 'rxjs';
import { AnalysisInput } from '../analysis.types';
import {
  collectRuleEntries,
  formatJudgments,
  TypeSafeJudgeService,
} from './typesafe-judge.service';

const input = (overrides: Partial<AnalysisInput> = {}): AnalysisInput => ({
  projectType: 'OTHER',
  projectName: 'Réhabilitation grange',
  questionnaireResponses: { description_projet: 'Transformer une grange en logement' },
  pluZone: 'A',
  pluZoneLabel: 'Agricole',
  pluDocumentName: 'PLUm',
  address: null,
  floodZone: null,
  abfProtection: null,
  naturalRisks: null,
  noiseExposure: null,
  pluExtractedRules: {
    exceptions: [{ appliesTo: 'piscine', rule: 'recul 3 m' }],
    landUse: {
      entries: [
        {
          appliesTo: 'réhabilitation du bâti existant',
          status: 'sous conditions',
          conditions: 'secteur patrimonial',
        },
      ],
    },
  },
  ...overrides,
});

const build = (apiKey: string | undefined, post: jest.Mock) =>
  new TypeSafeJudgeService(
    { post } as never,
    { get: () => apiKey } as never,
  );

describe('collectRuleEntries', () => {
  it('reprend les exceptions et les entrées landUse', () => {
    const entries = collectRuleEntries(input().pluExtractedRules);
    expect(entries.map((entry) => entry.id)).toEqual([
      'rule_exception_0',
      'rule_landuse_0',
    ]);
    expect(entries[1].description).toContain('secteur patrimonial');
  });

  it('renvoie une liste vide sans règles', () => {
    expect(collectRuleEntries(null)).toEqual([]);
  });
});

describe('formatJudgments', () => {
  it('sépare les règles probablement applicables des non applicables', () => {
    const entries = collectRuleEntries(input().pluExtractedRules);
    const text = formatJudgments(
      { worksOnExistingBuilding: 0.97 },
      [
        { entry: entries[0], probability: 0.03 },
        { entry: entries[1], probability: 0.91 },
      ],
    );
    expect(text).toContain('97 %');
    expect(text).toMatch(/APPLICABLES[\s\S]*réhabilitation du bâti existant/);
    expect(text).toMatch(/NON applicables[\s\S]*piscine/);
  });
});

describe('TypeSafeJudgeService', () => {
  it('est inactif sans clé API et ne fait aucun appel', async () => {
    const post = jest.fn();
    const service = build(undefined, post);
    expect(service.isEnabled()).toBe(false);
    expect(await service.judgeProject(input())).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  it('appelle /v1/systemone en Bearer et formate les réponses', async () => {
    const post = jest.fn().mockReturnValue(
      of({
        data: {
          answers: {
            worksOnExistingBuilding: { type: 'noul', noul: 0.95 },
            rule_landuse_0: { type: 'noul', noul: 0.88 },
          },
          usage: { input_tokens: 500 },
        },
      }),
    );
    const result = await build('key', post).judgeProject(input());

    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe('https://api.typesafe.ai/v1/systemone');
    expect(body.model).toBe('jev-latest');
    expect(body.questions.rule_landuse_0.type).toBe('noul');
    expect(config.headers.Authorization).toBe('Bearer key');
    expect(result?.projectProbabilities.worksOnExistingBuilding).toBe(0.95);
    expect(result?.promptSection).toContain('réhabilitation du bâti existant');
  });

  it("ne fait jamais échouer l'analyse en cas d'erreur API", async () => {
    const post = jest.fn().mockReturnValue(throwError(() => new Error('429')));
    expect(await build('key', post).judgeProject(input())).toBeNull();
  });
});
